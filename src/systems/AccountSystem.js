import { supabase, isConfigured } from '../lib/supabase.js';
import { getState, adoptCloudAccount, setAccountEmail } from './SaveSystem.js';
import { recordNewCode, getHistory } from './BackupCodeStore.js';

/**
 * Backup-code account recovery.
 *
 * Setup flow:   user enters email → server generates a 12-char code →
 *               we show it once → user saves it.
 * Restore flow: user enters email + code → server returns cloud_id + state,
 *               we overwrite local save.
 * Rotate flow:  user is already locally on a cloud_id with a backup → server
 *               regenerates the code; old one stops working.
 */

export async function setupBackup(rawEmail) {
  if (!isConfigured()) throw new Error('Cloud is not configured');
  const email = String(rawEmail || '').trim();
  if (!email) throw new Error('Email is required');

  const localCloudId = getState().cloudId;
  const { data, error } = await supabase.rpc('setup_account', {
    p_local_cloud_id: localCloudId,
    p_email: email,
  });
  if (error) throw mapError(error);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.plain_code) throw new Error('Server returned no code');

  setAccountEmail(email);
  recordNewCode(localCloudId, row.plain_code, email);
  return { email, code: row.plain_code };
}

export async function rotateBackupCode() {
  if (!isConfigured()) throw new Error('Cloud is not configured');
  const localCloudId = getState().cloudId;
  const { data, error } = await supabase.rpc('rotate_recovery_code', {
    p_local_cloud_id: localCloudId,
  });
  if (error) throw mapError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.plain_code) throw new Error('Server returned no code');
  recordNewCode(localCloudId, row.plain_code, currentAccountEmail());
  return { code: row.plain_code };
}

export function getLocalCodeHistory() {
  const cloudId = getState()?.cloudId;
  return getHistory(cloudId);
}

export async function restoreAccount(rawEmail, rawCode) {
  if (!isConfigured()) throw new Error('Cloud is not configured');
  const email = String(rawEmail || '').trim();
  const code = String(rawCode || '').trim().toUpperCase();
  if (!email || !code) throw new Error('Email and code are both required');

  const { data, error } = await supabase.rpc('restore_account', {
    p_email: email,
    p_code: code,
  });
  if (error) throw mapError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.cloud_id) throw new Error('No account matched');

  adoptCloudAccount({
    cloudId: row.cloud_id,
    email,
    remoteState: row.state,
  });
  window.dispatchEvent(new CustomEvent('save:reloaded'));
  return { email, cloudId: row.cloud_id };
}

export function signOutLocal() {
  setAccountEmail(null);
  window.dispatchEvent(new CustomEvent('account:changed'));
}

export function currentAccountEmail() {
  return getState()?.email || null;
}

function mapError(error) {
  const msg = String(error?.message || error || 'Request failed');
  if (msg.includes('EMAIL_REQUIRED')) return new Error('Please enter your email.');
  if (msg.includes('EMAIL_INVALID')) return new Error('That email looks invalid.');
  if (msg.includes('EMAIL_TAKEN'))   return new Error('That email is already linked to another save. Use "Restore" instead.');
  if (msg.includes('NO_BACKUP_YET')) return new Error('No backup set up yet — create one first.');
  if (msg.includes('NO_BACKUP_FOR_EMAIL')) return new Error('That email has no backup code yet.');
  if (msg.includes('BAD_CREDENTIALS')) return new Error('Email or backup code is wrong.');
  return new Error(msg);
}

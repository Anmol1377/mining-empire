import { supabase, isConfigured } from '../lib/supabase.js';
import { getState, setState, saveNow } from './SaveSystem.js';

const SYNC_GRACE_MS = 3000;

let lastUploaded = null;
let status = 'offline';
let lastSyncAt = 0;
let pendingFlipTimer = null;
const listeners = new Set();

export function getCloudStatus() { return status; }

export function onStatusChange(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

function setStatus(next) {
  if (status === next) return;
  status = next;
  for (const fn of listeners) fn(next);
}

function parseTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * On boot: fetch the cloud row keyed by state.cloudId. Keep whichever side has
 * the later meta.lastSavedAt. No auto-upload after this — the player drives
 * sync with "Save to cloud" (and the HoF Join/Boost flows).
 */
export async function bootstrapCloud() {
  if (!isConfigured()) {
    setStatus('disabled');
    return { mode: 'local', reason: 'not configured' };
  }
  setStatus('connecting');

  const local = getState();
  if (!local?.cloudId) {
    setStatus('error');
    return { mode: 'local', error: 'No cloud ID in state' };
  }

  try {
    const { data, error } = await supabase.rpc('get_state', {
      p_cloud_id: local.cloudId,
    });
    if (error) throw error;

    const row = Array.isArray(data) && data.length ? data[0] : null;

    if (row && row.state) {
      const localTime  = parseTime(local?.meta?.lastSavedAt);
      const serverTime = parseTime(row.state?.meta?.lastSavedAt);

      if (serverTime > localTime) {
        setState(row.state);
        lastUploaded = JSON.stringify(getState());
        lastSyncAt = Date.now();
        setStatus('synced');
        return { mode: 'cloud', source: 'server' };
      }

      const serializedLocal = JSON.stringify(local);
      const serializedServer = JSON.stringify(row.state);
      if (serializedLocal === serializedServer) {
        lastUploaded = serializedLocal;
        lastSyncAt = Date.now();
        setStatus('synced');
      } else {
        lastUploaded = serializedServer;
        setStatus('local-newer');
      }
      return { mode: 'cloud', source: 'local-newer' };
    }

    // No cloud row yet — push current local to claim it.
    saveNow();
    const fresh = getState();
    const { error: upsertError } = await supabase.rpc('upsert_state', {
      p_cloud_id: fresh.cloudId,
      p_state: fresh,
    });
    if (upsertError) throw upsertError;

    lastUploaded = JSON.stringify(fresh);
    lastSyncAt = Date.now();
    setStatus('synced');
    return { mode: 'cloud', source: 'local-init' };
  } catch (err) {
    console.warn('Cloud bootstrap failed:', err.message);
    setStatus('error');
    return { mode: 'local', error: err.message };
  }
}

export function startCloudSync() {
  if (!isConfigured()) return;
  window.addEventListener('save:changed', onLocalChanged);
}

function onLocalChanged() {
  if (status !== 'synced') return;
  const elapsed = Date.now() - lastSyncAt;
  if (elapsed >= SYNC_GRACE_MS) {
    setStatus('local-newer');
    return;
  }
  if (pendingFlipTimer) clearTimeout(pendingFlipTimer);
  pendingFlipTimer = setTimeout(() => {
    pendingFlipTimer = null;
    if (status === 'synced') setStatus('local-newer');
  }, SYNC_GRACE_MS - elapsed + 50);
}

export async function syncNow() {
  if (!isConfigured()) throw new Error('Cloud is not configured');
  saveNow();
  const state = getState();
  if (!state?.cloudId) throw new Error('No cloud ID in state');

  const serialized = JSON.stringify(state);
  setStatus('syncing');
  try {
    const { error } = await supabase.rpc('upsert_state', {
      p_cloud_id: state.cloudId,
      p_state: state,
    });
    if (error) throw error;
    lastUploaded = serialized;
    lastSyncAt = Date.now();
    if (pendingFlipTimer) { clearTimeout(pendingFlipTimer); pendingFlipTimer = null; }
    setStatus('synced');
    return true;
  } catch (err) {
    console.warn('Cloud sync failed:', err.message);
    setStatus('error');
    throw err;
  }
}

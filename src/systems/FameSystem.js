import { supabase, isConfigured } from '../lib/supabase.js';
import { getState } from './SaveSystem.js';

export const ENTRY_COST = 5000;
export const BOOST_BASE = 10000;
export const BOOST_MAX = 1_000_000_000;
export const TOP_LIMIT = 10;

/**
 * Exponential boost cost.
 *   Join the Hall          = 5,000  (ENTRY_COST)
 *   1st boost (count = 0)  = 10,000
 *   2nd boost (count = 1)  = 20,000
 *   3rd boost (count = 2)  = 40,000
 *   ...                    = 10000 * 2^count
 */
export function getNextBoostCost(boostCount = 0) {
  const n = Math.max(0, Math.floor(boostCount));
  // Cap exponent so JS doesn't go to Infinity, then clamp to BOOST_MAX
  const safeN = Math.min(n, 30);
  return Math.min(BOOST_BASE * Math.pow(2, safeN), BOOST_MAX);
}

function requireClient() {
  if (!isConfigured()) {
    throw new Error('Hall of Fame is not configured');
  }
}

function myCloudId() {
  return getState()?.cloudId || null;
}

export async function fetchTop() {
  requireClient();
  const { data, error } = await supabase
    .from('fame_entries')
    .select('id, cloud_id, name, url, avatar_seed, contributions, boost_count, created_at')
    .order('contributions', { ascending: false })
    .limit(TOP_LIMIT);
  if (error) throw error;
  return data || [];
}

export async function fetchMyEntry() {
  requireClient();
  const cid = myCloudId();
  if (!cid) return null;
  const { data, error } = await supabase
    .from('fame_entries')
    .select('id, cloud_id, name, url, avatar_seed, contributions, boost_count, created_at')
    .eq('cloud_id', cid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyRank() {
  requireClient();
  const entry = await fetchMyEntry();
  if (!entry) return null;
  const { count, error } = await supabase
    .from('fame_entries')
    .select('id', { count: 'exact', head: true })
    .gt('contributions', entry.contributions);
  if (error) throw error;
  return { entry, rank: (count || 0) + 1 };
}

export async function isNameTaken(name) {
  requireClient();
  const trimmed = String(name || '').trim();
  if (!trimmed) return false;
  const { data, error } = await supabase
    .from('fame_entries')
    .select('id', { head: false })
    .ilike('name', trimmed)
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export async function createEntry({ name, url, avatarSeed }) {
  requireClient();
  const cid = myCloudId();
  if (!cid) throw new Error('No cloud ID');
  const { data, error } = await supabase.rpc('join_fame', {
    p_cloud_id: cid,
    p_name: name.trim().slice(0, 30),
    p_url: url.trim().slice(0, 200),
    p_avatar_seed: String(avatarSeed).slice(0, 64),
    p_initial_contribution: ENTRY_COST,
  });
  if (error) throw mapJoinError(error);
  return data;
}

export async function bumpMyEntry(amount) {
  requireClient();
  const cid = myCloudId();
  if (!cid) throw new Error('No cloud ID');
  const { data, error } = await supabase.rpc('bump_fame', {
    p_cloud_id: cid,
    p_amount: amount,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

function mapJoinError(error) {
  const msg = String(error?.message || error || 'Failed to join');
  if (msg.includes('NAME_TAKEN')) {
    return new Error('That display name is already taken — try another.');
  }
  return new Error(msg);
}

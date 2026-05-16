import { supabase, isConfigured } from '../lib/supabase.js';
import { getState } from './SaveSystem.js';

export const ENTRY_COST = 5000;
export const BOOST_COST = 5000;
export const TOP_LIMIT = 10;

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
    .select('id, cloud_id, name, url, avatar_seed, contributions, created_at')
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
    .select('id, cloud_id, name, url, avatar_seed, contributions, created_at')
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
  if (error) throw error;
  return data;
}

export async function bumpMyEntry(amount = BOOST_COST) {
  requireClient();
  const cid = myCloudId();
  if (!cid) throw new Error('No cloud ID');
  const { data, error } = await supabase.rpc('bump_fame', {
    p_cloud_id: cid,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

import { createInitialState, SAVE_VERSION } from '../data/initialState.js';

const STORAGE_KEY = 'mining-empire:save:v1';

let state = null;
let autosaveTimer = null;

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state = createInitialState();
      persist();
      return state;
    }
    const parsed = JSON.parse(raw);
    state = migrate(parsed);
    return state;
  } catch (err) {
    console.warn('Failed to load save, starting fresh:', err);
    state = createInitialState();
    return state;
  }
}

export function getState() {
  if (!state) loadSave();
  return state;
}

export function setState(next) {
  if (!next || typeof next !== 'object') return;
  state = migrate(next);
  persist();
}

export function saveNow() {
  if (!state) return;
  state.meta.lastSavedAt = new Date().toISOString();
  persist();
}

export function startAutosave(intervalMs = 5000) {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(saveNow, intervalMs);
  window.addEventListener('beforeunload', saveNow);
  window.addEventListener('pagehide', saveNow);
}

export function exportSave() {
  saveNow();
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mining-empire-save-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importSave(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (parsed === null || typeof parsed !== 'object' || typeof parsed.version !== 'number') {
    throw new Error('Not a valid Mining Empire save file');
  }
  state = migrate(parsed);
  persist();
  return state;
}

export function resetSave() {
  state = createInitialState();
  persist();
  return state;
}

/**
 * Replace local save with a server-supplied account: switches cloudId and
 * (if the server has a saved state) overwrites local progress. Used by
 * account recovery — "I signed in on a new device, give me my data."
 */
export function adoptCloudAccount({ cloudId, email, remoteState }) {
  if (!cloudId) throw new Error('adoptCloudAccount requires cloudId');
  const base = createInitialState();
  base.cloudId = cloudId;
  base.email = email ?? null;
  if (remoteState && typeof remoteState === 'object' && Object.keys(remoteState).length > 0) {
    state = migrate({ ...remoteState, cloudId, email: email ?? remoteState.email ?? null });
  } else {
    // No server save yet — keep current progress but under the new cloudId.
    const current = getState();
    state = { ...current, cloudId, email: email ?? null };
  }
  persist();
  return state;
}

export function setAccountEmail(email) {
  const s = getState();
  s.email = email ?? null;
  persist();
  return s;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to persist save:', err);
  }
}

function migrate(loaded) {
  if (loaded.version > SAVE_VERSION) {
    console.warn(`Save is from a newer version (${loaded.version} > ${SAVE_VERSION}). Loading anyway.`);
  }
  return deepMerge(createInitialState(), loaded);
}

function deepMerge(base, overlay) {
  if (overlay === null || typeof overlay !== 'object') return base;
  if (Array.isArray(overlay)) return overlay;
  const out = { ...base };
  for (const key of Object.keys(overlay)) {
    const bv = base?.[key];
    const ov = overlay[key];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      out[key] = deepMerge(bv, ov);
    } else {
      out[key] = ov;
    }
  }
  return out;
}

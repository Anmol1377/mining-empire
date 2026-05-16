/**
 * Local-only store of backup codes per cloudId. The server only has hashes,
 * so this is where the plain text lives — on the device that generated them.
 *
 * Shape:
 *   {
 *     [cloudId]: {
 *       current: { code, email, createdAt },
 *       past:    [{ code, email, createdAt, rotatedAt }, ...]
 *     }
 *   }
 *
 * Per-device. If the user restores their account on another device, this
 * device's history stays on this device; the new device starts empty until
 * they rotate (or look at their own previously generated code).
 */

const STORAGE_KEY = 'mining-empire:backup-codes:v1';
const PAST_LIMIT = 10;

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to persist backup codes:', err);
  }
}

export function recordNewCode(cloudId, code, email) {
  if (!cloudId || !code) return;
  const all = readAll();
  const now = new Date().toISOString();
  const slot = all[cloudId] || { current: null, past: [] };

  if (slot.current) {
    slot.past.unshift({
      ...slot.current,
      rotatedAt: now,
    });
    if (slot.past.length > PAST_LIMIT) slot.past.length = PAST_LIMIT;
  }
  slot.current = { code, email: email || slot.current?.email || null, createdAt: now };
  all[cloudId] = slot;
  writeAll(all);
}

export function getHistory(cloudId) {
  if (!cloudId) return { current: null, past: [] };
  const all = readAll();
  return all[cloudId] || { current: null, past: [] };
}

export function clearHistory(cloudId) {
  if (!cloudId) return;
  const all = readAll();
  delete all[cloudId];
  writeAll(all);
}

/**
 * Tiny wrapper around Phaser's sound manager. Persists mute + volume in
 * localStorage. Plays gracefully if a sound key isn't loaded (no throw).
 */

const STORAGE_KEY = 'mining-empire:audio:v1';
const DEFAULTS = { muted: false, volume: 0.55 };

let settings = loadSettings();
let scene = null;
const listeners = new Set();

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      muted: !!parsed.muted,
      volume: typeof parsed.volume === 'number' ? clamp01(parsed.volume) : DEFAULTS.volume,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function emit() {
  for (const fn of listeners) fn(settings);
}

export function attachScene(s) {
  scene = s;
  applyMute();
}

export function play(key, opts = {}) {
  if (settings.muted) return;
  if (!scene || !scene.sound) return;
  // Skip silently if the asset isn't loaded — keeps the game working
  // even before sound files have been dropped into /public/sounds/.
  if (!scene.cache?.audio?.exists(key)) return;
  try {
    scene.sound.play(key, { volume: settings.volume, ...opts });
  } catch {
    // some browsers throw before user gesture — ignore
  }
}

export function isMuted() { return settings.muted; }
export function getVolume() { return settings.volume; }

export function toggleMute() {
  settings.muted = !settings.muted;
  saveSettings();
  applyMute();
  emit();
  return settings.muted;
}

export function setMuted(muted) {
  settings.muted = !!muted;
  saveSettings();
  applyMute();
  emit();
}

export function setVolume(v) {
  settings.volume = clamp01(v);
  saveSettings();
  applyMute();
  emit();
}

export function onChange(fn) {
  listeners.add(fn);
  fn(settings);
  return () => listeners.delete(fn);
}

function applyMute() {
  if (!scene || !scene.sound) return;
  scene.sound.mute = settings.muted;
  scene.sound.volume = settings.volume;
}

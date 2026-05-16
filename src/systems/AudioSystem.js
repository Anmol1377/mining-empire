/**
 * Sound system using zzfx — sounds are synthesized at play time from
 * numeric parameter arrays. No audio files needed.
 *
 * Public API:
 *   play(key)         — fire a sound (no-op if muted or unknown key)
 *   toggleMute()      — flip master mute, persisted in localStorage
 *   setMuted(bool)
 *   setVolume(0..1)
 *   isMuted() / getVolume()
 *   onChange(fn)      — observe settings changes (for the mute button)
 *   attachScene(s)    — kept for backwards-compat; unused now
 */

import { zzfx, ZZFX } from 'zzfx';

const STORAGE_KEY = 'mining-empire:audio:v1';
const DEFAULTS = { muted: false, volume: 0.55 };

let settings = loadSettings();
const listeners = new Set();

// ZzFX parameter cheat sheet:
//   [volume, randomness, frequency, attack, sustain, release, shape,
//    shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime,
//    repeatTime, noise, modulation, bitCrush, delay, sustainVolume,
//    decay, tremolo]
// shape: 0=sine 1=triangle 2=saw 3=tan 4=noise
const SOUNDS = {
  // Short low thunk — block hit
  hit:     [1.2, , 140, .005, .02, .04, 1, 1.5, 0, 0, 0, 0, 0, .8],
  // Rising sharp bleep — crit
  crit:    [1.8, , 420, .01, .1,  .15, 2, 1,   180, 0, 0, 0, 0, 0, .2],
  // Noise burst — rock breaks
  break:   [1.6, .1, 220, .02, .08, .25, 4, 1, 0, 0, 0, 0, 0, 1.8],
  // Two-note rising chime — coin pickup
  coin:    [1.3, , 880, .01, .06, .15, 0, , 0, 0, 440, .04, 0, 0, .1],
  // Three-step positive ding — upgrade purchase
  upgrade: [1.5, , 523, .01, .08, .2,  1, , 0, 0, 200, .06, 0, 0, .05, , , , .1],
  // Tiny tick — UI click (reserved)
  click:   [.8,  , 1400, .005, , .015, 1],
};

// ---- settings persistence ----

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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function emit() { for (const fn of listeners) fn(settings); }

function applyVolume() {
  // ZZFX.volume is its global multiplier — muting = 0, otherwise our slider.
  ZZFX.volume = settings.muted ? 0 : settings.volume;
}

// Set initial master gain.
applyVolume();

// ---- public API ----

export function play(key) {
  if (settings.muted) return;
  const params = SOUNDS[key];
  if (!params) return;
  try {
    // Web Audio may be suspended until first user gesture; zzfx handles it,
    // but resume defensively in case.
    const ac = ZZFX.audioContext;
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    zzfx(...params);
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
}

// Kept so older imports don't break — no longer needed.
export function attachScene(_scene) { /* noop */ }

export function isMuted() { return settings.muted; }
export function getVolume() { return settings.volume; }

export function toggleMute() {
  settings.muted = !settings.muted;
  saveSettings();
  applyVolume();
  emit();
  return settings.muted;
}

export function setMuted(muted) {
  settings.muted = !!muted;
  saveSettings();
  applyVolume();
  emit();
}

export function setVolume(v) {
  settings.volume = clamp01(v);
  saveSettings();
  applyVolume();
  emit();
}

export function onChange(fn) {
  listeners.add(fn);
  fn(settings);
  return () => listeners.delete(fn);
}

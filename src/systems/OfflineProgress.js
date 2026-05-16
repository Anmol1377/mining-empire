import { ORES } from '../data/ores.js';
import { getLevel, getAutoDrillDamage, getCoinMultiplier } from './UpgradeSystem.js';

const MAX_OFFLINE_HOURS = 8;
const MAX_OFFLINE_MS = MAX_OFFLINE_HOURS * 3600 * 1000;
const MIN_OFFLINE_MS = 5000;

const TOTAL_ORE_WEIGHT = Object.values(ORES).reduce((s, o) => s + o.weight, 0);

// Per unit of damage applied to a random block, expected coins (ignoring multipliers):
// each unit of damage progresses ore T by 1/h_T of a break, contributing v_T/h_T coins.
const EXPECTED_COINS_PER_DAMAGE = Object.values(ORES).reduce(
  (sum, ore) => sum + (ore.weight / TOTAL_ORE_WEIGHT) * (ore.value / ore.hp),
  0,
);

export function computeOfflineGains(state, now = Date.now()) {
  const autoDrills = getLevel(state, 'autoDrill');
  if (autoDrills <= 0) return null;

  const lastSavedAt = new Date(state.meta?.lastSavedAt || now).getTime();
  if (!Number.isFinite(lastSavedAt)) return null;

  const rawElapsedMs = now - lastSavedAt;
  if (rawElapsedMs < MIN_OFFLINE_MS) return null;

  const elapsedMs = Math.min(rawElapsedMs, MAX_OFFLINE_MS);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const damagePerTick = getAutoDrillDamage(state);
  const multiplier = getCoinMultiplier(state);

  const totalDamage = autoDrills * elapsedSec * damagePerTick;
  const baseCoins = totalDamage * EXPECTED_COINS_PER_DAMAGE;
  const coins = Math.floor(baseCoins * multiplier);
  if (coins <= 0) return null;

  const breaks = {};
  let totalBreaks = 0;
  for (const [id, ore] of Object.entries(ORES)) {
    const expected = Math.floor((totalDamage * (ore.weight / TOTAL_ORE_WEIGHT)) / ore.hp);
    breaks[id] = expected;
    totalBreaks += expected;
  }

  return {
    elapsedMs,
    cappedAtMax: rawElapsedMs > MAX_OFFLINE_MS,
    autoDrills,
    damagePerTick,
    multiplier,
    coins,
    breaks,
    totalBreaks,
  };
}

export function applyOfflineGains(state, gains) {
  state.resources.coins += gains.coins;
  state.stats.blocksMined += gains.totalBreaks;
  if (!state.stats.byOre) state.stats.byOre = {};
  for (const [id, count] of Object.entries(gains.breaks)) {
    if (count > 0) {
      state.stats.byOre[id] = (state.stats.byOre[id] || 0) + count;
    }
  }
}

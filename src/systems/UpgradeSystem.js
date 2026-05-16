import { UPGRADES } from '../data/upgrades.js';

export const CRIT_MULTIPLIER = 5;

export function getLevel(state, upgradeId) {
  return state.progress?.upgrades?.[upgradeId] || 0;
}

export function getCost(state, upgradeId) {
  const def = UPGRADES[upgradeId];
  if (!def) return Infinity;
  const level = getLevel(state, upgradeId);
  if (def.maxLevel != null && level >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, level));
}

export function isMaxed(state, upgradeId) {
  const def = UPGRADES[upgradeId];
  if (!def || def.maxLevel == null) return false;
  return getLevel(state, upgradeId) >= def.maxLevel;
}

export function canAfford(state, upgradeId) {
  if (isMaxed(state, upgradeId)) return false;
  return state.resources.coins >= getCost(state, upgradeId);
}

export function purchase(state, upgradeId) {
  if (!UPGRADES[upgradeId]) return false;
  if (isMaxed(state, upgradeId)) return false;
  const cost = getCost(state, upgradeId);
  if (state.resources.coins < cost) return false;
  state.resources.coins -= cost;
  if (!state.progress.upgrades) state.progress.upgrades = {};
  state.progress.upgrades[upgradeId] = getLevel(state, upgradeId) + 1;
  return true;
}

export function getDrillPower(state) {
  return 1 + getLevel(state, 'drillPower');
}

export function getCritChance(state) {
  return Math.min(0.5, getLevel(state, 'critChance') * 0.02);
}

export function getAutoDrillDamage(state) {
  return 1 + getLevel(state, 'autoDrillPower');
}

export function getCoinMultiplier(state) {
  return 1 + getLevel(state, 'coinMultiplier') * 0.1;
}

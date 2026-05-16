export const SAVE_VERSION = 1;

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers — not cryptographically strong, fine here
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createInitialState() {
  const now = new Date().toISOString();
  return {
    version: SAVE_VERSION,
    cloudId: randomId(),
    meta: {
      createdAt: now,
      lastSavedAt: now,
      lastPlayedAt: now,
    },
    resources: {
      coins: 0,
    },
    progress: {
      upgrades: {
        drillPower: 0,
        critChance: 0,
        autoDrill: 0,
        autoDrillPower: 0,
        coinMultiplier: 0,
      },
    },
    stats: {
      blocksMined: 0,
      byOre: {},
    },
  };
}

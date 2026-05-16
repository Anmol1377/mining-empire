export const ORES = {
  coal: {
    name: 'Coal',
    color: 0x2c2c34,
    accent: 0x6e6e7e,
    hp: 3,
    value: 1,
    weight: 60,
  },
  iron: {
    name: 'Iron',
    color: 0x7a8190,
    accent: 0xc8cfdc,
    hp: 8,
    value: 4,
    weight: 25,
  },
  gold: {
    name: 'Gold',
    color: 0xc9a227,
    accent: 0xffe066,
    hp: 18,
    value: 18,
    weight: 10,
  },
  diamond: {
    name: 'Diamond',
    color: 0x4fb8d6,
    accent: 0xc8f0ff,
    hp: 40,
    value: 75,
    weight: 4,
  },
  alien: {
    name: 'Alien Crystal',
    color: 0x8b4cff,
    accent: 0xe0b3ff,
    hp: 90,
    value: 300,
    weight: 1,
  },
};

const TOTAL_WEIGHT = Object.values(ORES).reduce((s, o) => s + o.weight, 0);

export function pickRandomOre() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const [id, ore] of Object.entries(ORES)) {
    r -= ore.weight;
    if (r <= 0) return { id, ...ore };
  }
  return { id: 'coal', ...ORES.coal };
}

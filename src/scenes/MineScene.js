import Phaser from 'phaser';
import { getState } from '../systems/SaveSystem.js';
import {
  getDrillPower,
  getCritChance,
  getAutoDrillDamage,
  getCoinMultiplier,
  getLevel,
  CRIT_MULTIPLIER,
} from '../systems/UpgradeSystem.js';
import { formatNumber } from '../utils/format.js';
import Block from '../entities/Block.js';

const COLS = 6;
const ROWS = 4;
const GAP = 8;
const HEADER_Y = 130;
const PADDING = 32;
const AUTO_DRILL_TICK_MS = 1000;
const TEXT_RES = Math.max(2, Math.ceil(window.devicePixelRatio || 1));

export default class MineScene extends Phaser.Scene {
  constructor() {
    super('MineScene');
  }

  create() {
    this.coinText = this.add.text(20, 14, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffd66b',
      resolution: TEXT_RES,
    });
    this.statsText = this.add.text(20, 48, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8aa0c0',
      resolution: TEXT_RES,
    });
    this.clickStatsText = this.add.text(20, 66, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8aa0c0',
      resolution: TEXT_RES,
    });
    this.autoStatsText = this.add.text(20, 84, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8aa0c0',
      resolution: TEXT_RES,
    });
    this.multText = this.add.text(20, 102, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8aa0c0',
      resolution: TEXT_RES,
    });

    this.blocks = [];
    this.buildGrid();
    this.scale.on('resize', () => this.layoutGrid());

    this.time.addEvent({
      delay: AUTO_DRILL_TICK_MS,
      loop: true,
      callback: () => this.tickAutoDrill(),
    });

    this.handleReload = () => this.refreshUi();
    this.handleChange = () => this.refreshUi();
    window.addEventListener('save:reloaded', this.handleReload);
    window.addEventListener('save:changed', this.handleChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('save:reloaded', this.handleReload);
      window.removeEventListener('save:changed', this.handleChange);
    });

    this.refreshUi();
  }

  computeGridLayout() {
    const availW = this.scale.width - PADDING * 2;
    const availH = this.scale.height - HEADER_Y - PADDING;
    const sizeByW = (availW - GAP * (COLS - 1)) / COLS;
    const sizeByH = (availH - GAP * (ROWS - 1)) / ROWS;
    const size = Math.max(36, Math.min(120, Math.min(sizeByW, sizeByH)));
    const gridW = COLS * size + (COLS - 1) * GAP;
    const gridH = ROWS * size + (ROWS - 1) * GAP;
    const originX = (this.scale.width - gridW) / 2;
    const originY = HEADER_Y + (availH - gridH) / 2;
    return { size, originX, originY };
  }

  buildGrid() {
    const { size, originX, originY } = this.computeGridLayout();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = originX + col * (size + GAP) + size / 2;
        const y = originY + row * (size + GAP) + size / 2;
        this.blocks.push(new Block(this, x, y, size));
      }
    }
  }

  layoutGrid() {
    const { size, originX, originY } = this.computeGridLayout();
    let i = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const block = this.blocks[i++];
        if (!block) continue;
        const x = originX + col * (size + GAP) + size / 2;
        const y = originY + row * (size + GAP) + size / 2;
        block.relocate(x, y, size);
      }
    }
  }

  handleBlockClick(block, pointer) {
    if (!block.alive) return;
    const state = getState();
    let damage = getDrillPower(state);
    const isCrit = Math.random() < getCritChance(state);
    if (isCrit) damage *= CRIT_MULTIPLIER;

    block.playPunch();

    const oreBroken = block.hit(damage);
    if (!oreBroken) {
      if (isCrit) {
        this.spawnFloater(pointer.x, pointer.y, `CRIT! -${formatNumber(damage)}`, '#ff9966', 18);
        this.cameras.main.shake(60, 0.005);
      } else {
        this.spawnFloater(pointer.x, pointer.y, `-${damage}`, '#dfe6f5', 14);
      }
    } else {
      this.awardBreak(state, block, oreBroken, /* heavyShake */ true, isCrit);
    }

    this.refreshUi();
    window.dispatchEvent(new CustomEvent('save:changed'));
  }

  tickAutoDrill() {
    const state = getState();
    const count = getLevel(state, 'autoDrill');
    if (count === 0) return;

    const damage = getAutoDrillDamage(state);
    let anyHit = false;
    for (let i = 0; i < count; i++) {
      const alive = this.blocks.filter((b) => b.alive);
      if (alive.length === 0) break;
      const block = Phaser.Utils.Array.GetRandom(alive);
      this.autoHit(state, block, damage);
      anyHit = true;
    }

    if (anyHit) {
      this.refreshUi();
      window.dispatchEvent(new CustomEvent('save:changed'));
    }
  }

  autoHit(state, block, damage) {
    const oreBroken = block.hit(damage);

    const spark = this.add.text(block.x, block.y - block.size / 2 - 4, '✦', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#9aa3c4',
      resolution: TEXT_RES,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: spark,
      y: spark.y - 14,
      alpha: { from: 1, to: 0 },
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => spark.destroy(),
    });

    if (oreBroken) {
      this.awardBreak(state, block, oreBroken, /* heavyShake */ false, /* isCrit */ false);
    }
  }

  awardBreak(state, block, oreBroken, heavyShake, isCrit) {
    const multiplier = getCoinMultiplier(state);
    const coins = Math.floor(oreBroken.value * multiplier);

    state.resources.coins += coins;
    state.stats.blocksMined += 1;
    if (!state.stats.byOre) state.stats.byOre = {};
    state.stats.byOre[oreBroken.id] = (state.stats.byOre[oreBroken.id] || 0) + 1;

    const label = isCrit
      ? `CRIT! +${formatNumber(coins)}  ${oreBroken.name}`
      : `+${formatNumber(coins)}  ${oreBroken.name}`;
    const color = isCrit ? '#ff9966' : '#ffd66b';
    const size = isCrit ? 22 : 18;
    this.spawnFloater(block.x, block.y, label, color, size);
    this.spawnBreakBurst(block.x, block.y, oreBroken.accent, isCrit ? 32 : 18);

    if (isCrit) {
      this.cameras.main.shake(140, 0.01);
    } else if (heavyShake) {
      this.cameras.main.shake(oreBroken.value > 50 ? 140 : 80, oreBroken.value > 50 ? 0.008 : 0.004);
    } else if (oreBroken.value > 50) {
      this.cameras.main.shake(80, 0.004);
    }

    block.playBreak();
    this.time.delayedCall(block.respawnDelay, () => block.spawn());
  }

  spawnFloater(x, y, text, color, size = 16) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      resolution: TEXT_RES,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 56,
      alpha: { from: 1, to: 0 },
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  spawnBreakBurst(x, y, tint, count = 18) {
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: 90, max: 260 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 350, max: 600 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      tint,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.explode(count);
    this.time.delayedCall(700, () => emitter.destroy());
  }

  refreshUi() {
    const state = getState();
    const dp = getDrillPower(state);
    const cc = Math.round(getCritChance(state) * 100);
    const ad = getLevel(state, 'autoDrill');
    const adp = getAutoDrillDamage(state);
    const mult = getCoinMultiplier(state);

    this.coinText.setText(`Coins: ${formatNumber(state.resources.coins)}`);
    this.statsText.setText(`Blocks mined: ${formatNumber(state.stats.blocksMined)}`);
    this.clickStatsText.setText(`Click: ${dp} dmg${cc > 0 ? `  ·  ${cc}% crit` : ''}`);
    this.autoStatsText.setText(`Auto: ${ad} × ${adp} dmg/sec`);
    this.multText.setText(`Reward: ×${mult.toFixed(1)} coins`);
  }
}

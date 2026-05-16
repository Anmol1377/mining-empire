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
import { attachScene as attachAudio, play as playSound } from '../systems/AudioSystem.js';

// Grid count adapts to viewport at boot: phones get fewer, bigger blocks.
function computeGridDims() {
  const w = window.innerWidth;
  if (w <= 480) return { cols: 4, rows: 5 };
  if (w <= 760) return { cols: 5, rows: 4 };
  return { cols: 6, rows: 4 };
}
const { cols: COLS, rows: ROWS } = computeGridDims();
const GAP = 10;
const PADDING = 20;
// Blocks are slightly wider than tall to utilize horizontal space.
const CELL_ASPECT = 1.25; // width / height
const MIN_W = 48;
const MIN_H = 36;
const MAX_W = 200;
const MAX_H = 160;
const AUTO_DRILL_TICK_MS = 1000;
const TEXT_RES = Math.max(2, Math.ceil(window.devicePixelRatio || 1));

// HUD font sizes scale with viewport — larger and brighter on phones so
// the stats line is actually readable next to a 400-pixel-wide screen.
function hudSizes() {
  const w = window.innerWidth;
  if (w <= 480) return { coin: '30px', stat: '15px', hudColor: '#cdd9f5', headerY: 150 };
  if (w <= 760) return { coin: '28px', stat: '14px', hudColor: '#bccae8', headerY: 140 };
  return { coin: '24px', stat: '12px', hudColor: '#8aa0c0', headerY: 130 };
}
const HUD = hudSizes();
const HEADER_Y = HUD.headerY;

export default class MineScene extends Phaser.Scene {
  constructor() {
    super('MineScene');
  }

  create() {
    const statLineH = parseInt(HUD.stat) + 6;
    let y = 14;
    this.coinText = this.add.text(20, y, '', {
      fontFamily: 'monospace',
      fontSize: HUD.coin,
      color: '#ffd66b',
      fontStyle: 'bold',
      resolution: TEXT_RES,
    });
    y += parseInt(HUD.coin) + 8;
    this.statsText = this.add.text(20, y, '', {
      fontFamily: 'monospace',
      fontSize: HUD.stat,
      color: HUD.hudColor,
      resolution: TEXT_RES,
    });
    y += statLineH;
    this.clickStatsText = this.add.text(20, y, '', {
      fontFamily: 'monospace',
      fontSize: HUD.stat,
      color: HUD.hudColor,
      resolution: TEXT_RES,
    });
    y += statLineH;
    this.autoStatsText = this.add.text(20, y, '', {
      fontFamily: 'monospace',
      fontSize: HUD.stat,
      color: HUD.hudColor,
      resolution: TEXT_RES,
    });
    y += statLineH;
    this.multText = this.add.text(20, y, '', {
      fontFamily: 'monospace',
      fontSize: HUD.stat,
      color: HUD.hudColor,
      resolution: TEXT_RES,
    });

    this.blocks = [];
    this.buildGrid();
    this.scale.on('resize', () => this.layoutGrid());

    this.setupHammerCursor();
    attachAudio(this);

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

  setupHammerCursor() {
    if (!this.textures.exists('cursor-hammer')) return;

    this.input.setDefaultCursor('none');

    this.hammerCursor = this.add.container(-100, -100).setDepth(1000).setVisible(false);
    this.hammerSprite = this.add.image(0, 0, 'cursor-hammer')
      .setOrigin(0.5, 0.95);
    this.hammerCursor.add(this.hammerSprite);

    this.applyHammerScale();

    this.input.on('pointermove', (pointer) => {
      if (!this.hammerCursor) return;
      this.hammerCursor.setVisible(true);
      this.hammerCursor.setPosition(pointer.x, pointer.y);
    });

    // On touch, pointermove doesn't fire before pointerdown — make sure the
    // hammer snaps to the exact touch point before slamming.
    this.input.on('pointerdown', (pointer) => {
      if (this.hammerCursor) {
        this.hammerCursor.setVisible(true);
        this.hammerCursor.setPosition(pointer.x, pointer.y);
      }
      this.animateHammerSlam();
    });

    this.input.on('gameout', () => {
      if (this.hammerCursor) this.hammerCursor.setVisible(false);
    });

    this.scale.on('resize', () => this.applyHammerScale());
  }

  applyHammerScale() {
    if (!this.hammerSprite) return;
    const src = this.textures.get('cursor-hammer').getSourceImage();
    // Smaller hammer on narrow screens so it doesn't cover multiple blocks.
    const w = this.scale.width;
    let targetHeight;
    if (w <= 480) targetHeight = 52;
    else if (w <= 760) targetHeight = 68;
    else targetHeight = 96;
    const baseScale = src && src.height ? targetHeight / src.height : 0.1;
    this.hammerSprite.setScale(baseScale);
    this.hammerBaseScale = baseScale;
  }

  animateHammerSlam() {
    if (!this.hammerSprite) return;
    this.tweens.killTweensOf(this.hammerSprite);
    this.hammerSprite.setAngle(0);
    this.hammerSprite.setScale(this.hammerBaseScale);
    // Straight vertical piston: lift up, drive down, repeat.
    this.hammerSprite.setPosition(0, -14);
    this.tweens.add({
      targets: this.hammerSprite,
      y: 14,
      duration: 75,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.hammerSprite) this.hammerSprite.setPosition(0, 0);
      },
    });
  }

  computeGridLayout() {
    const availW = this.scale.width - PADDING * 2;
    const availH = this.scale.height - HEADER_Y - PADDING;
    const cellW_byW = (availW - GAP * (COLS - 1)) / COLS;
    const cellH_byH = (availH - GAP * (ROWS - 1)) / ROWS;

    // Prefer width-first with target aspect 1.25:1. If height becomes the
    // bottleneck, scale both down so blocks still fit vertically.
    let width = cellW_byW;
    let height = width / CELL_ASPECT;
    if (height > cellH_byH) {
      height = cellH_byH;
      width = Math.min(cellW_byW, height * CELL_ASPECT);
    }

    width = Math.max(MIN_W, Math.min(MAX_W, width));
    height = Math.max(MIN_H, Math.min(MAX_H, height));

    const gridW = COLS * width + (COLS - 1) * GAP;
    const gridH = ROWS * height + (ROWS - 1) * GAP;
    const originX = (this.scale.width - gridW) / 2;
    const originY = HEADER_Y + Math.max(0, (availH - gridH) / 2);
    return { width, height, originX, originY };
  }

  buildGrid() {
    const { width, height, originX, originY } = this.computeGridLayout();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = originX + col * (width + GAP) + width / 2;
        const y = originY + row * (height + GAP) + height / 2;
        this.blocks.push(new Block(this, x, y, width, height));
      }
    }
  }

  layoutGrid() {
    const { width, height, originX, originY } = this.computeGridLayout();
    let i = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const block = this.blocks[i++];
        if (!block) continue;
        const x = originX + col * (width + GAP) + width / 2;
        const y = originY + row * (height + GAP) + height / 2;
        block.relocate(x, y, width, height);
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
        playSound('crit');
      } else {
        this.spawnFloater(pointer.x, pointer.y, `-${damage}`, '#dfe6f5', 14);
        playSound('hit', { volume: 0.4 });
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

    const spark = this.add.text(block.x, block.y - block.height / 2 - 4, '✦', {
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
    if (isCrit) {
      playSound('crit');
    } else {
      playSound('break');
    }
    if (oreBroken.value >= 50) {
      // Big payoff — layer a coin chime on top.
      playSound('coin', { volume: 0.5 });
    }
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

import { pickRandomOre } from '../data/ores.js';

const REF = 100;
const TEXT_RES = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
// Block labels live inside a container scaled by (blockWidth/REF). Since
// blocks on phones are roughly 60-80px (scale ~0.6-0.8), the source font
// has to be sized UP so the on-screen rendering is readable. Watch out
// for label overflow — long names like "ALIEN CRYSTAL" must wrap, not
// bleed into neighboring blocks.
const LABEL_FONT_SIZE = (function() {
  const w = window.innerWidth;
  if (w <= 480) return '18px';
  if (w <= 760) return '15px';
  return '13px';
})();
// Word-wrap width in source units (block container is REF=100 wide pre-scale)
const LABEL_WRAP_WIDTH = 86;

export default class Block {
  constructor(scene, x, y, width, height) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height ?? width;
    this.respawnDelay = 550;

    this.bg = scene.add.rectangle(0, 0, REF, REF, 0xffffff).setStrokeStyle(3, 0xffffff);
    this.shimmer = scene.add.rectangle(0, 0, REF - 14, REF - 14, 0xffffff, 0.35);
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: LABEL_FONT_SIZE,
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
      resolution: TEXT_RES,
      wordWrap: { width: LABEL_WRAP_WIDTH, useAdvancedWrap: true },
    }).setOrigin(0.5);

    this.hpBg = scene.add.rectangle(0, REF / 2 - 8, REF - 14, 4, 0x000000, 0.5);
    this.hpFill = scene.add.rectangle(-(REF - 14) / 2, REF / 2 - 8, REF - 14, 4, 0x7ee787).setOrigin(0, 0.5);

    this.container = scene.add.container(x, y, [this.bg, this.shimmer, this.label, this.hpBg, this.hpFill]);
    this.applyScale();

    this.bg.setInteractive();
    this.bg.on('pointerdown', (pointer) => scene.handleBlockClick(this, pointer));

    this.spawn();
  }

  // Backwards-compatibility: callers that pass a single size still get a square block.
  get size() {
    return Math.min(this.width, this.height);
  }

  applyScale() {
    this.container.setScale(this.width / REF, this.height / REF);
  }

  relocate(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height ?? width;
    this.container.setPosition(x, y);
    this.applyScale();
  }

  spawn() {
    const ore = pickRandomOre();
    this.ore = ore;
    this.hp = ore.hp;
    this.maxHp = ore.hp;
    this.alive = true;

    this.bg.setFillStyle(ore.color).setStrokeStyle(3, ore.accent);
    this.shimmer.setFillStyle(ore.accent, 0.35);
    this.label.setText(ore.name.toUpperCase());
    this.updateHpBar();

    this.container.setAlpha(1);
    const targetSx = this.width / REF;
    const targetSy = this.height / REF;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: targetSx * 0.6, to: targetSx },
      scaleY: { from: targetSy * 0.6, to: targetSy },
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  hit(damage) {
    if (!this.alive) return null;
    this.hp -= damage;
    this.updateHpBar();
    if (this.hp <= 0) {
      this.alive = false;
      return this.ore;
    }
    return null;
  }

  updateHpBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpFill.width = (REF - 14) * pct;
    if (pct < 0.34) this.hpFill.fillColor = 0xff7a7a;
    else if (pct < 0.67) this.hpFill.fillColor = 0xffd66b;
    else this.hpFill.fillColor = 0x7ee787;
  }

  playPunch() {
    const baseX = this.width / REF;
    const baseY = this.height / REF;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: baseX * 0.9, to: baseX },
      scaleY: { from: baseY * 0.9, to: baseY },
      duration: 90,
      ease: 'Quad.easeOut',
    });
  }

  playBreak() {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: (this.width / REF) * 1.25,
      scaleY: (this.height / REF) * 1.25,
      duration: 220,
      ease: 'Back.easeIn',
    });
  }
}

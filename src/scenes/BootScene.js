import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.svg('cursor-hammer', 'jack-hammer.svg', { width: 256, height: 256 });
  }

  create() {
    // Generate a tiny white particle texture so we don't need an asset file.
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();

    this.scene.start('MineScene');
  }
}

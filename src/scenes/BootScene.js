import Phaser from 'phaser';

// Sound keys → file paths (under /public/sounds/). Files are optional —
// if a file is missing, Phaser logs a 404 once and the game plays silently
// for that key. Drop matching .mp3 files into public/sounds/ to enable.
const SOUND_FILES = {
  hit:     'sounds/hit.mp3',
  break:   'sounds/break.mp3',
  crit:    'sounds/crit.mp3',
  coin:    'sounds/coin.mp3',
  upgrade: 'sounds/upgrade.mp3',
  click:   'sounds/click.mp3',
};

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.svg('cursor-hammer', 'jack-hammer.svg', { width: 256, height: 256 });

    // Don't let a missing sound file abort the boot.
    this.load.on('loaderror', (file) => {
      if (file?.type === 'audio') {
        console.info(`Sound "${file.key}" not loaded (file missing or 404). Game continues silently.`);
      }
    });

    for (const [key, path] of Object.entries(SOUND_FILES)) {
      this.load.audio(key, path);
    }
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

import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MineScene from './scenes/MineScene.js';
import { loadSave, startAutosave, saveNow, getState } from './systems/SaveSystem.js';
import { bootstrapCloud, startCloudSync } from './systems/CloudSync.js';
import { computeOfflineGains, applyOfflineGains } from './systems/OfflineProgress.js';
import { mountSaveButtons } from './ui/saveButtons.js';
import { mountUpgradePanel } from './ui/upgradePanel.js';
import { showOfflineBanner } from './ui/offlineBanner.js';
import { initFameRouter } from './ui/fameView.js';
import { mountCloudStatus } from './ui/cloudStatus.js';
import { mountDeveloperModal } from './ui/developerModal.js';
import { mountDocsModal } from './ui/docsModal.js';
import { mountSigninModal } from './ui/signinModal.js';
import { mountMuteButton } from './ui/muteButton.js';
import { mountMobileLayout } from './ui/mobileLayout.js';

start();

async function start() {
  setLoadingText('Loading save…');
  loadSave();

  mountCloudStatus();

  setLoadingText('Connecting to cloud…');
  const cloud = await bootstrapCloud();
  if (cloud.mode === 'cloud') {
    startCloudSync();
  }

  const offlineGains = computeOfflineGains(getState());
  if (offlineGains) {
    showOfflineBanner(offlineGains, () => {
      applyOfflineGains(getState(), offlineGains);
      saveNow();
      window.dispatchEvent(new CustomEvent('save:changed'));
    });
  }

  startAutosave();
  mountSaveButtons();
  mountUpgradePanel();
  mountDeveloperModal();
  mountDocsModal();
  mountSigninModal();
  mountMuteButton();
  mountMobileLayout();
  initFameRouter();

  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0b1020',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    input: {
      keyboard: true,
      windowEvents: false,
    },
    scene: [BootScene, MineScene],
  };

  new Phaser.Game(config);

  hideLoadingScreen();
}

function setLoadingText(text) {
  const el = document.getElementById('loading-status');
  if (el) el.textContent = text;
}

function hideLoadingScreen() {
  const el = document.getElementById('loading-screen');
  if (el) el.classList.add('hidden');
}

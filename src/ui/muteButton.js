import { isMuted, toggleMute, onChange } from '../systems/AudioSystem.js';

export function mountMuteButton() {
  const btn = document.getElementById('btn-mute');
  if (!btn) return;

  function render() {
    const muted = isMuted();
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = muted ? 'Sounds muted — click to unmute' : 'Mute sounds';
    btn.setAttribute('aria-label', muted ? 'Unmute sounds' : 'Mute sounds');
  }

  btn.addEventListener('click', () => {
    toggleMute();
  });

  onChange(render);
  render();
}

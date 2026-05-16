import { formatNumber, formatDuration } from '../utils/format.js';

export function showOfflineBanner(gains, onCollect) {
  const banner = document.getElementById('offline-banner');
  const summary = document.getElementById('offline-summary');
  const dismiss = document.getElementById('offline-dismiss');
  if (!banner || !summary || !dismiss) {
    onCollect();
    return;
  }

  const timeLabel = formatDuration(gains.elapsedMs);
  const capNote = gains.cappedAtMax ? ' (capped at 8h)' : '';
  summary.innerHTML = `
    You were away for <strong>${timeLabel}</strong>${capNote}.<br>
    Your <strong>${gains.autoDrills}</strong> auto-drill${gains.autoDrills === 1 ? '' : 's'}
    mined <strong>${formatNumber(gains.totalBreaks)}</strong> blocks
    for <strong>${formatNumber(gains.coins)}</strong> coins.
  `;

  banner.hidden = false;

  const collect = () => {
    dismiss.removeEventListener('click', collect);
    banner.hidden = true;
    onCollect();
  };
  dismiss.addEventListener('click', collect);
}

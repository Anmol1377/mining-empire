const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs < 1000) return Math.floor(n).toString();

  let tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(abs) / 3));
  let scaled = n / Math.pow(1000, tier);

  // Roll up when scaled would round to 1000 (e.g. 999500 → 1.00M, not 1000k).
  if (Math.abs(scaled) >= 999.5 && tier < SUFFIXES.length - 1) {
    tier++;
    scaled = n / Math.pow(1000, tier);
  }

  const absScaled = Math.abs(scaled);
  const digits = absScaled < 10 ? 2 : absScaled < 100 ? 1 : 0;
  return `${scaled.toFixed(digits)}${SUFFIXES[tier]}`;
}

export function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = totalMin / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
}

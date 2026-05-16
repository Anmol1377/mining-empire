import { onStatusChange } from '../systems/CloudSync.js';

const LABEL = {
  disabled:      { text: 'Local only',  cls: 'cloud-muted' },
  connecting:    { text: 'Connecting…', cls: 'cloud-muted' },
  syncing:       { text: 'Syncing…',    cls: 'cloud-muted' },
  synced:        { text: 'Cloud ✓',     cls: 'cloud-ok' },
  'local-newer': { text: 'Unsaved',     cls: 'cloud-warn' },
  offline:       { text: 'Offline',     cls: 'cloud-err' },
  error:         { text: 'Sync error',  cls: 'cloud-err' },
};

export function mountCloudStatus() {
  const el = document.getElementById('cloud-status');
  if (!el) return;
  onStatusChange((status) => {
    const { text, cls } = LABEL[status] || { text: status, cls: 'cloud-muted' };
    el.textContent = text;
    el.className = `cloud-status ${cls}`;
  });
}

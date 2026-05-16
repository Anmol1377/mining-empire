import { exportSave, importSave, resetSave } from '../systems/SaveSystem.js';
import { syncNow } from '../systems/CloudSync.js';
import { isConfigured } from '../lib/supabase.js';

export function mountSaveButtons() {
  const bar = document.getElementById('save-bar');
  if (!bar) return;

  const cloudBtn = bar.querySelector('#btn-cloud-sync');
  const exportBtn = bar.querySelector('#btn-export');
  const importBtn = bar.querySelector('#btn-import');
  const resetBtn = bar.querySelector('#btn-reset');
  const fileInput = bar.querySelector('#file-input');
  const status = bar.querySelector('#save-status');

  if (cloudBtn) {
    if (!isConfigured()) {
      cloudBtn.disabled = true;
      cloudBtn.title = 'Cloud is not configured';
    }
    cloudBtn.addEventListener('click', async () => {
      cloudBtn.disabled = true;
      try {
        await syncNow();
        flash(status, 'Saved to cloud.');
      } catch (err) {
        flash(status, `Sync failed: ${err.message}`, true);
      } finally {
        cloudBtn.disabled = !isConfigured();
      }
    });
  }

  exportBtn.addEventListener('click', () => {
    try {
      exportSave();
      flash(status, 'Exported.');
    } catch (err) {
      flash(status, `Export failed: ${err.message}`, true);
    }
  });

  importBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      await importSave(file);
      window.dispatchEvent(new CustomEvent('save:reloaded'));
      flash(status, 'Imported (remember to ☁ Save to cloud).');
    } catch (err) {
      flash(status, `Import failed: ${err.message}`, true);
    } finally {
      fileInput.value = '';
    }
  });

  resetBtn.addEventListener('click', () => {
    const ok = window.confirm('Reset local save? Cloud is untouched until you click ☁ Save to cloud. Export first if you want a backup.');
    if (!ok) return;
    resetSave();
    window.dispatchEvent(new CustomEvent('save:reloaded'));
    flash(status, 'Reset (cloud unchanged).');
  });
}

function flash(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--err)' : 'var(--ok)';
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    el.textContent = '';
    el.style.color = 'var(--muted)';
  }, 2500);
}

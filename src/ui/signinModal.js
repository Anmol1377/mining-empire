import {
  setupBackup, restoreAccount, rotateBackupCode,
  signOutLocal, currentAccountEmail, getLocalCodeHistory,
} from '../systems/AccountSystem.js';
import { syncNow } from '../systems/CloudSync.js';

export function mountSigninModal() {
  const btn = document.getElementById('btn-signin');
  const modal = document.getElementById('signin-modal');
  const closeBtn = document.getElementById('signin-close');
  if (!btn || !modal) return;

  const tabs = modal.querySelectorAll('.signin-tab');
  const panes = modal.querySelectorAll('.signin-pane');
  const msg = document.getElementById('signin-msg');

  // Backup-tab elements
  const backupIntro = document.getElementById('signin-backup-intro');
  const backupForm = document.getElementById('signin-backup-form');
  const backupSubmit = document.getElementById('signin-backup-submit');
  const backupResult = document.getElementById('signin-backup-result');
  const codeDisplay = document.getElementById('signin-code-display');
  const copyBtn = document.getElementById('signin-copy-code');
  const backedEmail = document.getElementById('signin-backed-email');
  const doneBtn = document.getElementById('signin-done');
  const rotateSep = document.getElementById('signin-rotate-sep');
  const rotateBox = document.getElementById('signin-rotate');
  const currentEmailEl = document.getElementById('signin-current-email');
  const rotateBtn = document.getElementById('signin-rotate-btn');
  const signOutBtn = document.getElementById('signin-out-btn');
  const currentCodeBox = document.getElementById('signin-current-code-box');
  const currentCodeText = document.getElementById('signin-current-code-text');
  const currentCopyBtn = document.getElementById('signin-current-copy');
  const noCodeNote = document.getElementById('signin-no-code-note');
  const pastDetails = document.getElementById('signin-past-details');
  const pastList = document.getElementById('signin-past-list');

  // Restore-tab elements
  const restoreForm = document.getElementById('signin-restore-form');
  const restoreSubmit = document.getElementById('signin-restore-submit');

  function setMsg(text, isError) {
    msg.textContent = text;
    msg.style.color = isError ? 'var(--err)' : 'var(--ok)';
  }

  function activateTab(name) {
    tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false'));
    panes.forEach((p) => { p.hidden = p.dataset.pane !== name; });
  }

  function refreshHeader() {
    const email = currentAccountEmail();
    btn.textContent = email ? `👤 ${shorten(email)}` : '👤 Sign in';
    btn.title = email ? `Backed up as ${email} — manage account` : 'Sign in / Restore save';
  }

  function refreshBackupPane() {
    const email = currentAccountEmail();
    if (email) {
      rotateSep.hidden = false;
      rotateBox.hidden = false;
      currentEmailEl.textContent = email;
      const input = backupForm?.elements.email;
      if (input) input.value = email;
      renderCodeHistory();
    } else {
      rotateSep.hidden = true;
      rotateBox.hidden = true;
    }
    // Reset the one-time code reveal each time the modal opens.
    backupResult.hidden = true;
    backupIntro.hidden = false;
    codeDisplay.textContent = '';
  }

  function renderCodeHistory() {
    const { current, past } = getLocalCodeHistory();
    if (current?.code) {
      currentCodeText.textContent = current.code;
      currentCodeBox.hidden = false;
      noCodeNote.hidden = true;
    } else {
      currentCodeBox.hidden = true;
      // Only show the empty-state warning if user is actually backed up but
      // we have nothing recorded locally (i.e. they set up before this
      // feature existed, or cleared localStorage).
      noCodeNote.hidden = !currentAccountEmail();
    }

    if (past && past.length > 0) {
      pastDetails.hidden = false;
      pastList.innerHTML = past.map((entry, i) => `
        <li class="signin-past-item">
          <code>${escapeHtml(entry.code)}</code>
          <time title="Rotated ${escapeHtml(formatDate(entry.rotatedAt))}">${escapeHtml(formatRelative(entry.rotatedAt))}</time>
          <button type="button" data-copy="${i}" title="Copy">Copy</button>
        </li>
      `).join('');
      pastList.querySelectorAll('button[data-copy]').forEach((b) => {
        b.addEventListener('click', async () => {
          const idx = Number(b.dataset.copy);
          const code = past[idx]?.code;
          if (!code) return;
          try {
            await navigator.clipboard.writeText(code);
            b.textContent = 'Copied!';
            setTimeout(() => { b.textContent = 'Copy'; }, 1200);
          } catch {}
        });
      });
    } else {
      pastDetails.hidden = true;
      pastList.innerHTML = '';
    }
  }

  currentCopyBtn.addEventListener('click', async () => {
    const code = currentCodeText.textContent;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      currentCopyBtn.textContent = 'Copied!';
      setTimeout(() => { currentCopyBtn.textContent = 'Copy'; }, 1500);
    } catch {}
  });

  function open() {
    activateTab('backup');
    refreshBackupPane();
    setMsg('', false);
    modal.hidden = false;
    setTimeout(() => backupForm?.elements.email?.focus(), 30);
  }
  function close() { modal.hidden = true; }

  btn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      activateTab(t.dataset.tab);
      setMsg('', false);
    });
  });

  // ---- Backup setup ----
  backupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = backupForm.elements.email.value.trim();
    if (!email) return;
    backupSubmit.disabled = true;
    setMsg('Generating code…', false);
    try {
      const { code } = await setupBackup(email);
      codeDisplay.textContent = code;
      backedEmail.textContent = email;
      backupIntro.hidden = true;
      backupResult.hidden = false;
      setMsg('Backup created. Save this code — it won\'t be shown again.', false);
      refreshHeader();
      syncNow().catch(() => {});
    } catch (err) {
      setMsg(err.message, true);
    } finally {
      backupSubmit.disabled = false;
    }
  });

  copyBtn.addEventListener('click', async () => {
    const code = codeDisplay.textContent;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    } catch {
      // Fallback: select the code text
      const range = document.createRange();
      range.selectNodeContents(codeDisplay);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  });

  doneBtn.addEventListener('click', () => {
    refreshBackupPane();
    close();
  });

  // ---- Rotate ----
  rotateBtn.addEventListener('click', async () => {
    if (!confirm('Generate a new backup code? The old one will stop working immediately.')) return;
    rotateBtn.disabled = true;
    setMsg('Rotating…', false);
    try {
      const { code } = await rotateBackupCode();
      codeDisplay.textContent = code;
      backedEmail.textContent = currentAccountEmail() || '';
      backupIntro.hidden = true;
      backupResult.hidden = false;
      rotateSep.hidden = true;
      rotateBox.hidden = true;
      setMsg('New code generated. Old code no longer works.', false);
      renderCodeHistory();
    } catch (err) {
      setMsg(err.message, true);
    } finally {
      rotateBtn.disabled = false;
    }
  });

  signOutBtn.addEventListener('click', () => {
    signOutLocal();
    refreshHeader();
    refreshBackupPane();
    setMsg('Signed out on this device. The server still has your backup — restore anytime.', false);
  });

  // ---- Restore ----
  restoreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = restoreForm.elements.email.value.trim();
    const code = restoreForm.elements.code.value.trim();
    if (!email || !code) return;
    restoreSubmit.disabled = true;
    setMsg('Restoring…', false);
    try {
      await restoreAccount(email, code);
      setMsg('Save restored from cloud!', false);
      refreshHeader();
      refreshBackupPane();
      activateTab('backup');
      setTimeout(() => { if (!modal.hidden) close(); }, 1100);
    } catch (err) {
      setMsg(err.message, true);
    } finally {
      restoreSubmit.disabled = false;
    }
  });

  window.addEventListener('save:reloaded', refreshHeader);
  window.addEventListener('account:changed', refreshHeader);

  refreshHeader();
}

function shorten(email) {
  if (email.length <= 16) return email;
  const [user, domain] = email.split('@');
  if (!domain) return email.slice(0, 14) + '…';
  const u = user.length > 8 ? user.slice(0, 7) + '…' : user;
  return `${u}@${domain}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, (ch) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'just now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

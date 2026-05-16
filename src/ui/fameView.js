import { isConfigured } from '../lib/supabase.js';
import {
  fetchTop, fetchMyRank, createEntry, bumpMyEntry,
  ENTRY_COST, BOOST_COST,
} from '../systems/FameSystem.js';
import { getState, saveNow } from '../systems/SaveSystem.js';
import { syncNow } from '../systems/CloudSync.js';
import { formatNumber } from '../utils/format.js';

const ROOT_ID = 'fame-view';

export function initFameRouter() {
  document.getElementById('btn-fame')?.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = '#fame';
  });
  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('save:changed', updateAffordability);
  applyRoute();
}

function applyRoute() {
  const isFame = location.hash === '#fame';
  document.body.classList.toggle('view-fame', isFame);
  if (isFame) render();
}

function updateAffordability() {
  if (location.hash !== '#fame') return;
  const coins = getState().resources.coins;

  const coinSpan = document.getElementById('fame-current-coins');
  if (coinSpan) coinSpan.textContent = formatNumber(coins);

  const joinBtn = document.querySelector('#fame-join-form button[type="submit"]');
  if (joinBtn) joinBtn.disabled = coins < ENTRY_COST;

  const boostBtn = document.getElementById('btn-boost');
  if (boostBtn) boostBtn.disabled = coins < BOOST_COST;
}

async function render() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;

  if (!isConfigured()) {
    root.innerHTML = wrap(`
      <div class="fame-card fame-empty-card">
        <h2>Hall of Fame</h2>
        <p>Hall of Fame isn't configured for this build.<br>
        See <code>SUPABASE_SETUP.md</code> in the repo to enable it.</p>
      </div>
    `);
    wireBack();
    return;
  }

  if (!root.innerHTML) {
    root.innerHTML = wrap('<div class="fame-loading">Loading Hall of Fame…</div>');
    wireBack();
  }

  let top, mine;
  try {
    [top, mine] = await Promise.all([
      fetchTop(),
      fetchMyRank().catch(() => null),
    ]);
  } catch (err) {
    root.innerHTML = wrap(`
      <div class="fame-card fame-empty-card">
        <h2>Hall of Fame</h2>
        <p class="fame-error">Failed to load: ${escapeHtml(err.message)}</p>
      </div>
    `);
    wireBack();
    return;
  }

  root.innerHTML = wrap(buildBody(top, mine));
  wireBack();
  wireForms(mine);
}

function wrap(inner) {
  return `
    <div class="fame-page">
      <header class="fame-header">
        <h1>⛏ Hall of Fame</h1>
        <button id="btn-back-to-game" type="button">← Back to game</button>
      </header>
      ${inner}
    </div>
  `;
}

function buildBody(top, mine) {
  const state = getState();
  const coins = state.resources.coins;

  let actionHtml;
  if (mine) {
    const canBoost = coins >= BOOST_COST;
    actionHtml = `
      <div class="fame-card">
        <div class="fame-row fame-row-mine fame-row-self">
          <span class="fame-rank">#${mine.rank}</span>
          <img class="fame-avatar" src="${avatarUrl(mine.entry.avatar_seed)}" alt="" loading="lazy" />
          <div class="fame-info">
            <strong class="fame-name">${escapeHtml(mine.entry.name)}</strong>
            <span class="fame-sub">${formatNumber(mine.entry.contributions)} contributed</span>
          </div>
        </div>
        <button id="btn-boost" type="button" ${canBoost ? '' : 'disabled'}>
          Boost · ${formatNumber(BOOST_COST)} coins
        </button>
        <p class="fame-msg" id="fame-boost-msg"></p>
      </div>
    `;
  } else {
    const canJoin = coins >= ENTRY_COST;
    actionHtml = `
      <div class="fame-card">
        <h3>Join the Hall</h3>
        <p class="fame-sub">Cost: ${formatNumber(ENTRY_COST)} coins · you have <span id="fame-current-coins">${formatNumber(coins)}</span></p>
        <form id="fame-join-form" autocomplete="off">
          <label>Display name
            <input type="text" name="name" maxlength="30" required
                   pattern="[A-Za-z0-9 _.\\-]{1,30}"
                   placeholder="Miner_42" />
          </label>
          <label>One link (Instagram / X / LinkedIn / site)
            <input type="url" name="url" maxlength="200" required
                   placeholder="https://instagram.com/you" />
          </label>
          <button type="submit" ${canJoin ? '' : 'disabled'}>
            Join · ${formatNumber(ENTRY_COST)} coins
          </button>
        </form>
        <p class="fame-msg" id="fame-form-msg"></p>
      </div>
    `;
  }

  let listHtml;
  if (top.length === 0) {
    listHtml = `<div class="fame-card fame-empty-card"><p>Hall is empty — be the first.</p></div>`;
  } else {
    listHtml = `<ol class="fame-list">${top.map((entry, i) => rowHtml(entry, i + 1, mine?.entry?.id === entry.id)).join('')}</ol>`;
    if (mine && mine.rank > top.length) {
      listHtml += `<p class="fame-note">You're ranked <strong>#${mine.rank}</strong> — keep boosting to break into the top ${top.length}.</p>`;
    }
  }

  return actionHtml + listHtml;
}

function rowHtml(entry, rank, isMine) {
  const url = sanitizeUrl(entry.url);
  const linkLabel = url ? prettyDomain(url) : '';
  return `
    <li class="fame-row ${isMine ? 'fame-row-mine' : ''}">
      <span class="fame-rank">#${rank}</span>
      <img class="fame-avatar" src="${avatarUrl(entry.avatar_seed)}" alt="" loading="lazy" />
      <div class="fame-info">
        <strong class="fame-name">${escapeHtml(entry.name)}</strong>
        ${url ? `<a class="fame-link" href="${url}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(linkLabel)}</a>` : ''}
      </div>
      <span class="fame-score">${formatNumber(entry.contributions)}</span>
    </li>
  `;
}

function wireBack() {
  document.getElementById('btn-back-to-game')?.addEventListener('click', () => {
    location.hash = '';
  });
}

function wireForms(mine) {
  const boostBtn = document.getElementById('btn-boost');
  if (boostBtn && mine) {
    boostBtn.addEventListener('click', () => handleBoost());
  }
  const joinForm = document.getElementById('fame-join-form');
  joinForm?.addEventListener('submit', handleJoin);
}

async function handleBoost() {
  const state = getState();
  if (state.resources.coins < BOOST_COST) return;

  state.resources.coins -= BOOST_COST;
  saveNow();
  window.dispatchEvent(new CustomEvent('save:changed'));
  setMsg('fame-boost-msg', 'Boosting…', false);

  try {
    await bumpMyEntry(BOOST_COST);
    syncNow();
    setMsg('fame-boost-msg', 'Boosted!', false);
    await render();
  } catch (err) {
    state.resources.coins += BOOST_COST;
    saveNow();
    window.dispatchEvent(new CustomEvent('save:changed'));
    setMsg('fame-boost-msg', `Failed: ${err.message}`, true);
  }
}

async function handleJoin(event) {
  event.preventDefault();
  const state = getState();
  if (state.resources.coins < ENTRY_COST) return;

  const form = event.target;
  const name = form.elements.name.value.trim();
  const url = form.elements.url.value.trim();

  if (!name) {
    setMsg('fame-form-msg', 'Please enter a name.', true);
    return;
  }
  if (!sanitizeUrl(url)) {
    setMsg('fame-form-msg', 'Please enter a valid http(s) URL.', true);
    return;
  }

  state.resources.coins -= ENTRY_COST;
  saveNow();
  window.dispatchEvent(new CustomEvent('save:changed'));
  setMsg('fame-form-msg', 'Joining the Hall…', false);

  try {
    const avatarSeed = `${name}-${Math.random().toString(36).slice(2, 10)}`;
    await createEntry({ name, url, avatarSeed });
    syncNow();
    await render();
  } catch (err) {
    state.resources.coins += ENTRY_COST;
    saveNow();
    window.dispatchEvent(new CustomEvent('save:changed'));
    setMsg('fame-form-msg', `Failed: ${err.message}`, true);
  }
}

function avatarUrl(seed) {
  const safe = encodeURIComponent(seed || 'miner');
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${safe}&backgroundColor=1d2542,2a335a`;
}

function sanitizeUrl(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function prettyDomain(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function setMsg(id, text, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? 'var(--err)' : 'var(--ok)';
}

function escapeHtml(s) {
  return String(s).replace(/[<>&"']/g, (ch) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

import { UPGRADES } from '../data/upgrades.js';
import { getCost, getLevel, purchase, canAfford, isMaxed } from '../systems/UpgradeSystem.js';
import { getState, saveNow } from '../systems/SaveSystem.js';
import { formatNumber } from '../utils/format.js';

export function mountUpgradePanel() {
  const list = document.getElementById('upgrade-list');
  if (!list) return;

  const cards = {};
  for (const [id, def] of Object.entries(UPGRADES)) {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="upgrade-name">${def.name}</div>
      <div class="upgrade-desc">${def.description}</div>
      <div class="upgrade-row">
        <span class="upgrade-level"></span>
        <button class="upgrade-buy" data-id="${id}" type="button"></button>
      </div>
    `;
    list.appendChild(card);
    cards[id] = card;
  }

  list.addEventListener('click', (event) => {
    const btn = event.target.closest('.upgrade-buy');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id;
    const state = getState();
    if (purchase(state, id)) {
      saveNow();
      flashBuy(btn);
      window.dispatchEvent(new CustomEvent('save:changed'));
    }
  });

  const refresh = () => {
    const state = getState();
    for (const [id, def] of Object.entries(UPGRADES)) {
      const card = cards[id];
      const level = getLevel(state, id);
      const effect = def.effectFromLevel(level);
      card.querySelector('.upgrade-level').textContent = def.effectFormat(effect);
      const btn = card.querySelector('.upgrade-buy');
      if (isMaxed(state, id)) {
        btn.textContent = 'MAX';
        btn.disabled = true;
      } else {
        const cost = getCost(state, id);
        btn.textContent = `Buy · ${formatNumber(cost)}`;
        btn.disabled = !canAfford(state, id);
      }
    }
  };

  refresh();
  window.addEventListener('save:changed', refresh);
  window.addEventListener('save:reloaded', refresh);
}

function flashBuy(btn) {
  btn.classList.remove('flash');
  void btn.offsetWidth;
  btn.classList.add('flash');
}

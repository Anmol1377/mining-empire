// Mobile-only: two drawers — left for Upgrades, right for the utility Menu.
// On desktop (> 760px) the sidebar is visible and the menu drawer is hidden.

export function mountMobileLayout() {
  mountUpgradesDrawer();
  mountUtilityMenu();
}

function mountUpgradesDrawer() {
  const toggle = document.getElementById('btn-upgrades-toggle');
  const backdrop = document.getElementById('upgrades-backdrop');
  if (!toggle || !backdrop) return;

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('show-upgrades');
    document.body.classList.remove('show-menu');
  });

  backdrop.addEventListener('click', () => {
    document.body.classList.remove('show-upgrades');
  });

  document.getElementById('upgrade-list')?.addEventListener('click', (e) => {
    if (!e.target.closest('.upgrade-buy')) return;
    if (window.matchMedia('(max-width: 760px)').matches) {
      setTimeout(() => document.body.classList.remove('show-upgrades'), 250);
    }
  });
}

function mountUtilityMenu() {
  const toggle = document.getElementById('btn-menu');
  const backdrop = document.getElementById('menu-backdrop');
  const panel = document.getElementById('menu-panel');
  if (!toggle || !backdrop || !panel) return;

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('show-menu');
    document.body.classList.remove('show-upgrades');
  });

  backdrop.addEventListener('click', () => {
    document.body.classList.remove('show-menu');
  });

  // Proxy clicks: each menu-item forwards to its real button by id.
  panel.querySelectorAll('.menu-item[data-proxy]').forEach((item) => {
    item.addEventListener('click', () => {
      const target = document.getElementById(item.dataset.proxy);
      if (target) target.click();
      // Close the drawer after activating so the user sees the result.
      document.body.classList.remove('show-menu');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.body.classList.remove('show-upgrades');
      document.body.classList.remove('show-menu');
    }
  });
}

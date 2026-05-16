// Mobile-only: hamburger button toggles the Upgrades drawer.
// On desktop (> 760px) the sidebar is permanently visible and this is a no-op.

export function mountMobileLayout() {
  const toggle = document.getElementById('btn-upgrades-toggle');
  const backdrop = document.getElementById('upgrades-backdrop');
  if (!toggle || !backdrop) return;

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('show-upgrades');
  });

  backdrop.addEventListener('click', () => {
    document.body.classList.remove('show-upgrades');
  });

  // Close after buying — so the drawer doesn't linger covering the grid.
  document.getElementById('upgrade-list')?.addEventListener('click', (e) => {
    if (!e.target.closest('.upgrade-buy')) return;
    if (window.matchMedia('(max-width: 760px)').matches) {
      // Brief delay so the user sees the flash animation before it closes.
      setTimeout(() => document.body.classList.remove('show-upgrades'), 250);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.body.classList.remove('show-upgrades');
  });
}

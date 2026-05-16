export function mountDocsModal() {
  const btn = document.getElementById('btn-docs');
  const modal = document.getElementById('docs-modal');
  const closeBtn = document.getElementById('docs-close');
  if (!btn || !modal) return;

  const open = () => {
    modal.hidden = false;
    modal.scrollTop = 0;
    const card = modal.querySelector('.docs-card');
    if (card) card.scrollTop = 0;
  };
  const close = () => { modal.hidden = true; };

  btn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
}

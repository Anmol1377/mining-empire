const DEV = {
  name: 'Anmol',
  role: 'Developer',
  github: 'https://github.com/Anmol1377',
  linkedin: 'https://www.linkedin.com/in/anmol18/',
  avatarSeed: 'anmol-dev-1377',
};

export function mountDeveloperModal() {
  const btn = document.getElementById('btn-developer');
  const modal = document.getElementById('developer-modal');
  const closeBtn = document.getElementById('developer-close');
  if (!btn || !modal) return;

  const avatarImg = document.getElementById('developer-avatar');
  const nameEl = document.getElementById('developer-name');
  const roleEl = document.getElementById('developer-role');
  const githubEl = document.getElementById('developer-github');
  const linkedinEl = document.getElementById('developer-linkedin');

  if (avatarImg) {
    avatarImg.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(DEV.avatarSeed)}&backgroundColor=1d2542,2a335a`;
  }
  if (nameEl) nameEl.textContent = DEV.name;
  if (roleEl) roleEl.textContent = DEV.role;
  if (githubEl) githubEl.href = DEV.github;
  if (linkedinEl) linkedinEl.href = DEV.linkedin;

  btn.addEventListener('click', () => { modal.hidden = false; });
  closeBtn?.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) modal.hidden = true;
  });
}

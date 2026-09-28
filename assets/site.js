const root = document.documentElement;
const themeButton = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('rts-theme');

if (savedTheme) root.dataset.theme = savedTheme;
function updateThemeLabel() {
  if (themeButton) themeButton.textContent = root.dataset.theme === 'light' ? 'Dark mode' : 'Light mode';
}

updateThemeLabel();
themeButton?.addEventListener('click', () => {
  const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = theme;
  localStorage.setItem('rts-theme', theme);
  updateThemeLabel();
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.rts-auth__login')) {
    window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
  }
}, true);
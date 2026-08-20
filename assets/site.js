const root = document.documentElement;
const fontPicker = document.getElementById('fontPair');
const themeButton = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('rts-theme');
const savedFont = localStorage.getItem('rts-font');

if (savedTheme) root.dataset.theme = savedTheme;
root.dataset.font = savedFont || 'roam';

if (fontPicker) {
  fontPicker.value = root.dataset.font;
  fontPicker.addEventListener('change', () => {
    root.dataset.font = fontPicker.value;
    localStorage.setItem('rts-font', fontPicker.value);
  });
}

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

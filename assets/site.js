(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('themeToggle');
  const fontPicker = document.getElementById('fontPair');
  const savedTheme = localStorage.getItem('rts-theme');
  const savedFont = localStorage.getItem('rts-font');
  if (savedTheme) root.dataset.theme = savedTheme;
  if (savedFont) root.dataset.font = savedFont;
  else root.dataset.font = 'roam';
  if (fontPicker) fontPicker.value = root.dataset.font;
  function updateThemeLabel() {
    if (themeButton) themeButton.textContent = root.dataset.theme === 'light' ? 'Dark mode' : 'Light mode';
  }
  updateThemeLabel();
  if (themeButton) themeButton.addEventListener('click', () => {
    const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = theme;
    localStorage.setItem('rts-theme', theme);
    updateThemeLabel();
  });
  if (fontPicker) fontPicker.addEventListener('change', () => {
    root.dataset.font = fontPicker.value;
    localStorage.setItem('rts-font', fontPicker.value);
  });
})();

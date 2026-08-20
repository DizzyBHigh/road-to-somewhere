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

/* Extension product-page layout */
document.addEventListener('DOMContentLoaded', () => {
  const quickCard = document.querySelector('.quick-access-card');
  const quickContent = quickCard?.querySelector('.quick-access-content');
  const downloadStack = quickCard?.querySelector('.download-stack');
  const dependency = quickCard?.querySelector('.dependency');
  const importSection = document.querySelector('#import');
  const importBox = importSection?.querySelector('.import-box');

  if (quickCard && quickContent && downloadStack && importBox) {
    /* Move the live import box into Quick Access, on the right. */
    quickContent.appendChild(importBox);
    importBox.classList.add('quick-import-box');

    /* Move Required Component below the two-column Quick Access row. */
    if (dependency) quickCard.appendChild(dependency);

    /* The old import section is now empty and can disappear. */
    if (importSection) importSection.remove();

    const style = document.createElement('style');
    style.textContent = `
      .quick-access-content{grid-template-columns:minmax(190px,.65fr) minmax(0,1.35fr);align-items:start}
      .quick-import-box{margin-top:0;min-width:0}
      .quick-import-box .import-code{height:${Math.max(downloadStack.offsetHeight,120)}px;max-height:none}
      .quick-access-card>.dependency{margin-top:22px;width:100%}
      @media(max-width:760px){
        .quick-access-content{grid-template-columns:1fr}
        .quick-import-box{margin-top:0}
        .quick-import-box .import-code{height:180px}
      }
    `;
    document.head.appendChild(style);
  }

  /* Collapsible Setup Guide and Settings UI cards. */
  document.querySelectorAll('#install, #settings').forEach(section => {
    const card = section.querySelector('.extension-card');
    const kicker = card?.querySelector('.section-kicker');
    if (!card || !kicker || card.querySelector('.collapse-toggle')) return;

    const content = document.createElement('div');
    content.className = 'collapsible-content';
    while (kicker.nextSibling) content.appendChild(kicker.nextSibling);

    const heading = document.createElement('div');
    heading.className = 'collapsible-heading';
    heading.appendChild(kicker);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'collapse-toggle';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = 'Collapse −';
    heading.appendChild(toggle);

    card.appendChild(heading);
    card.appendChild(content);

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      content.hidden = expanded;
      toggle.textContent = expanded ? 'Expand +' : 'Collapse −';
    });
  });

  if (document.querySelector('.collapsible-heading')) {
    const style = document.createElement('style');
    style.textContent = `
      .collapsible-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:12px}
      .collapsible-heading .section-kicker{margin:0}
      .collapse-toggle{appearance:none;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--muted);padding:7px 10px;font:600 8px var(--mono);text-transform:uppercase;cursor:pointer;white-space:nowrap}
      .collapse-toggle:hover{border-color:var(--accent);color:var(--accent)}
      .collapsible-content[hidden]{display:none}
    `;
    document.head.appendChild(style);
  }
});

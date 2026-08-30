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

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  if (!document.execCommand('copy')) { input.remove(); return Promise.reject(new Error('Copy failed')); }
  input.remove();
  return Promise.resolve();
}

function setCopyState(button, label) {
  button.textContent = 'Copied';
  button.classList.add('copied');
  window.setTimeout(() => { button.textContent = `${label} ⧉`; button.classList.remove('copied'); }, 1600);
}

function siteRootPath() {
  const stylesheet = document.querySelector('link[href*="/assets/site.css"]');
  if (!stylesheet) return '';
  return new URL(stylesheet.href, window.location.href).pathname.replace(/\/assets\/site\.css$/, '');
}

function findMatchingToken(source, start) {
  let depth = 1;
  for (let i = start; i < source.length - 1; i++) {
    if (source[i] === '[' && source[i + 1] === '[') { depth++; i++; }
    else if (source[i] === ']' && source[i + 1] === ']') { depth--; if (depth === 0) return i; i++; }
  }
  return -1;
}

function makeCopyButton(label, kind) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rts-copy-token';
  button.dataset.copyKind = kind;
  appendFormattedText(button, label);
  button.appendChild(document.createTextNode(' ⧉'));
  return button;
}

function appendFormattedText(parent, text) {
  const source = String(text ?? '');
  let i = 0;
  while (i < source.length) {
    if (source[i] === '[' && source[i + 1] === '[') {
      const end = findMatchingToken(source, i + 2);
      if (end !== -1) {
        const token = source.slice(i + 2, end);
        const colon = token.indexOf(':');
        if (colon !== -1) {
          const tag = token.slice(0, colon).toLowerCase();
          const value = token.slice(colon + 1);
          if (tag === 'blue' || tag === 'yellow' || tag === 'muted') {
            const span = document.createElement('span');
            span.className = `rts-text-${tag}`;
            appendFormattedText(span, value);
            parent.appendChild(span);
          } else if (tag === 'code' || tag === 'overlay') {
            parent.appendChild(makeCopyButton(value, tag));
          } else if (tag === 'dll') {
            const link = document.createElement('a');
            link.className = 'rts-content-link';
            link.href = `${siteRootPath()}/dll/`;
            appendFormattedText(link, value);
            parent.appendChild(link);
          } else if (tag === 'link') {
            const separator = value.indexOf('|');
            const url = separator >= 0 ? value.slice(0, separator).trim() : '';
            const label = separator >= 0 ? value.slice(separator + 1) : value;
            const link = document.createElement('a');
            link.className = 'rts-content-link';
            link.href = /^(https?:\/\/|\/)/i.test(url) ? url : '#';
            appendFormattedText(link, label);
            parent.appendChild(link);
          } else if (/^[a-z0-9-]+$/i.test(tag)) {
            const link = document.createElement('a');
            link.className = 'rts-content-link';
            link.href = `${siteRootPath()}/extensions/${tag}/`;
            appendFormattedText(link, value);
            parent.appendChild(link);
          } else {
            parent.appendChild(document.createTextNode(source.slice(i, end + 2)));
          }
          i = end + 2;
          continue;
        }
      }
    }
    if (source[i] === '*' && source[i + 1] === '*') {
      const end = source.indexOf('**', i + 2);
      if (end !== -1) {
        const strong = document.createElement('strong');
        appendFormattedText(strong, source.slice(i + 2, end));
        parent.appendChild(strong);
        i = end + 2;
        continue;
      }
    }
    if (source[i] === '\n') { parent.appendChild(document.createElement('br')); i++; continue; }
    if (source[i] === '\\' && source[i + 1] === 'n') { parent.appendChild(document.createElement('br')); i += 2; continue; }
    parent.appendChild(document.createTextNode(source[i]));
    i++;
  }
}

function formatRtsContent() {
  document.querySelectorAll('.rts-format').forEach(element => {
    if (element.dataset.rtsFormatted === 'true') return;
    const source = element.textContent || '';
    element.textContent = '';
    appendFormattedText(element, source);
    element.dataset.rtsFormatted = 'true';
  });
}

function initFormattedCopyButtons() {
  document.querySelectorAll('.rts-copy-token').forEach(button => {
    if (button.dataset.rtsBound === 'true') return;
    button.dataset.rtsBound = 'true';
    const label = button.textContent.replace(/\s*⧉\s*$/, '');
    button.addEventListener('click', async () => {
      try {
        const importRoot = document.querySelector('[data-import-url]');
        const importUrl = importRoot?.dataset.importUrl;
        const text = button.dataset.copyKind === 'overlay'
          ? new URL('overlay/', window.location.href).href
          : await fetch(importUrl).then(response => { if (!response.ok) throw new Error('Import file unavailable'); return response.text(); });
        await copyText(text.trim());
        setCopyState(button, label);
      } catch {
        button.textContent = 'Copy failed';
        window.setTimeout(() => { button.textContent = `${label} ⧉`; }, 1600);
      }
    });
  });
}

function initExtensionCopyButtons() {
  const rootElement = document.querySelector('[data-import-url]');
  if (!rootElement) return;
  const importUrl = rootElement.dataset.importUrl;
  const copyImport = document.getElementById('copyImport');
  const copyOverlay = document.getElementById('copyOverlayUrl');

  if (copyImport && copyImport.dataset.rtsBound !== 'true') {
    copyImport.dataset.rtsBound = 'true';
    const label = copyImport.textContent.replace(/\s*⧉\s*$/, '').trim();
    const code = document.getElementById('importCode');
    if (code && importUrl) {
      fetch(importUrl)
        .then(response => { if (!response.ok) throw new Error('Import file unavailable'); return response.text(); })
        .then(text => { code.textContent = text; })
        .catch(() => { code.textContent = 'Unable to load the current import code. Use the versioned download link below.'; });
    }
    copyImport.addEventListener('click', async () => {
      try {
        const text = code?.textContent || await fetch(importUrl).then(response => response.text());
        await copyText(text.trim());
        setCopyState(copyImport, label);
      } catch {
        copyImport.textContent = 'Copy failed';
        window.setTimeout(() => { copyImport.textContent = `${label} ⧉`; }, 1600);
      }
    });
  }

  if (copyOverlay && copyOverlay.dataset.rtsBound !== 'true') {
    copyOverlay.dataset.rtsBound = 'true';
    const label = copyOverlay.textContent.replace(/\s*⧉\s*$/, '').trim();
    copyOverlay.addEventListener('click', async () => {
      try {
        await copyText(new URL('overlay/', window.location.href).href);
        setCopyState(copyOverlay, label);
      } catch {
        copyOverlay.textContent = 'Copy failed';
        window.setTimeout(() => { copyOverlay.textContent = `${label} ⧉`; }, 1600);
      }
    });
  }
}

function initCollapseToggles() {
  document.querySelectorAll('.collapse-toggle[data-toggle]').forEach(toggle => {
    if (toggle.dataset.collapseBound === 'true') return;
    const target = document.getElementById(toggle.dataset.toggle);
    if (!target) return;
    toggle.dataset.collapseBound = 'true';
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      target.hidden = expanded;
      toggle.textContent = expanded ? 'Expand +' : 'Collapse −';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  formatRtsContent();
  initFormattedCopyButtons();
  initExtensionCopyButtons();
  initCollapseToggles();
});

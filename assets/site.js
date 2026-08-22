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

function appendInlineMarkup(parent, text) {
  const source = String(text).replace(/\r\n/g, '\n');
  let i = 0;
  while (i < source.length) {
    if (source[i] === '\n') {
      parent.appendChild(document.createElement('br'));
      i++;
      continue;
    }
    if (source[i] === '\\' && source[i + 1] === 'n') {
      parent.appendChild(document.createElement('br'));
      i += 2;
      continue;
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
    parent.appendChild(document.createTextNode(source[i]));
    i++;
  }
}

function siteRootPath() {
  const stylesheet = document.querySelector('link[href*="/assets/site.css"]');
  if (!stylesheet) return '';
  return new URL(stylesheet.href, window.location.href).pathname.replace(/\/assets\/site\.css$/, '');
}

function makeCopyButton(label, kind) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rts-copy-token';
  button.dataset.copyKind = kind;
  appendFormattedText(button, label);
  const marker = document.createTextNode(' ⧉');
  button.appendChild(marker);
  return button;
}

function findMatchingToken(source, start) {
  let depth = 1;
  for (let i = start; i < source.length - 1; i++) {
    if (source[i] === '[' && source[i + 1] === '[') { depth++; i++; }
    else if (source[i] === ']' && source[i + 1] === ']') { depth--; if (depth === 0) return i; i++; }
  }
  return -1;
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
    if (source[i] === '\n') {
      parent.appendChild(document.createElement('br'));
      i++;
      continue;
    }
    if (source[i] === '\\' && source[i + 1] === 'n') {
      parent.appendChild(document.createElement('br')); i += 2; continue;
    }
    parent.appendChild(document.createTextNode(source[i]));
    i++;
  }
}

function formatRtsContent() {
  const formatted = document.querySelectorAll('.rts-format');
  if (!formatted.length) return;
  formatted.forEach(element => {
    if (element.dataset.rtsFormatted === 'true') return;
    const source = element.textContent || '';
    element.textContent = '';
    appendFormattedText(element, source);
    element.dataset.rtsFormatted = 'true';
  });
  document.querySelectorAll('.rts-copy-token').forEach(button => {
    if (button.dataset.rtsBound === 'true') return;
    button.dataset.rtsBound = 'true';
    const label = button.textContent.replace(/\s*⧉\s*$/, '');
    button.addEventListener('click', async () => {
      try {
        let text;
        if (button.dataset.copyKind === 'overlay') text = new URL('overlay/', window.location.href).href;
        else {
          const importUrl = document.body.dataset.importUrl;
          if (!importUrl) throw new Error('Import URL unavailable');
          if (!window.rtsImportCodePromise) window.rtsImportCodePromise = fetch(importUrl).then(r => { if (!r.ok) throw new Error('Import file unavailable'); return r.text(); });
          text = await window.rtsImportCodePromise;
        }
        await copyText(text.trim());
        setCopyState(button, label);
      } catch {
        button.textContent = 'Copy failed';
        window.setTimeout(() => { button.textContent = `${label} ⧉`; }, 1600);
      }
    });
  });
}

/* Extension product-page layout */
document.addEventListener('DOMContentLoaded', () => {
  formatRtsContent();
  const quickCard = document.querySelector('.quick-access-card');
  const quickContent = quickCard?.querySelector('.quick-access-content');
  const downloadStack = quickCard?.querySelector('.download-stack');
  const dependency = quickCard?.querySelector('.dependency');
  const importSection = document.querySelector('#import');
  const importBox = importSection?.querySelector('.import-box');
  if (quickCard && quickContent && downloadStack && importBox) {
    quickContent.appendChild(importBox); importBox.classList.add('quick-import-box'); importBox.querySelector('.section-kicker:not(.import-title-kicker)')?.remove();
    if (dependency) quickCard.appendChild(dependency);
    if (importSection) importSection.remove();
    const overlayButton = downloadStack.querySelector('a[href="overlay/"]');
    if (overlayButton) {
      const label = overlayButton.firstChild; if (label) label.textContent = 'Open Overlay in Browser ';
      const copyOverlayButton = document.createElement('button'); copyOverlayButton.type = 'button'; copyOverlayButton.className = 'copy-button'; copyOverlayButton.innerHTML = 'Copy Overlay URL';
      copyOverlayButton.addEventListener('click', async () => { const overlayUrl = new URL(overlayButton.href, window.location.href).href; try { await copyText(overlayUrl); copyOverlayButton.textContent = 'Overlay URL Copied'; copyOverlayButton.classList.add('copied'); setTimeout(() => { copyOverlayButton.textContent = 'Copy Overlay URL'; copyOverlayButton.classList.remove('copied'); }, 1600); } catch { copyOverlayButton.textContent = 'Copy Failed'; } });
      overlayButton.insertAdjacentElement('afterend', copyOverlayButton);
    }
    const importDownload = downloadStack.querySelector('a[href*="Import Code"]');
    if (importDownload) { const label = importDownload.firstChild; if (label) label.textContent = 'Download Overlay files for local use '; }
    const style = document.createElement('style'); style.textContent = `.quick-access-content{grid-template-columns:minmax(190px,.65fr) minmax(0,1.35fr);align-items:start}.quick-import-box{margin-top:0;min-width:0}.quick-import-box .import-code{height:${Math.max(downloadStack.offsetHeight,120)}px;max-height:none}.quick-access-card>.dependency{margin-top:22px;width:100%}.quick-access-card .download-stack .secondary-button{width:100%;box-sizing:border-box}.quick-access-card .download-stack .copy-button{width:100%;box-sizing:border-box}@media(max-width:760px){.quick-access-content{grid-template-columns:1fr}.quick-import-box{margin-top:0}.quick-import-box .import-code{height:180px}}`; document.head.appendChild(style);
  }
  document.querySelectorAll('#install, #settings').forEach(section => {
    const card = section.querySelector('.extension-card'); const kicker = card?.querySelector('.section-kicker');
    if (!card || !kicker || card.querySelector('.collapse-toggle')) return;
    const content = document.createElement('div'); content.className = 'collapsible-content'; while (kicker.nextSibling) content.appendChild(kicker.nextSibling);
    const heading = document.createElement('div'); heading.className = 'collapsible-heading'; heading.appendChild(kicker);
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'collapse-toggle'; toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = 'Collapse −'; heading.appendChild(toggle);
    card.appendChild(heading); card.appendChild(content);
    toggle.addEventListener('click', () => { const expanded = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!expanded)); content.hidden = expanded; toggle.textContent = expanded ? 'Expand +' : 'Collapse −'; });
  });
  if (document.querySelector('.collapsible-heading')) {
    const style = document.createElement('style'); style.textContent = `.collapsible-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:12px}.collapsible-heading .section-kicker{margin:0}.collapse-toggle{appearance:none;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--muted);padding:7px 10px;font:600 8px var(--mono);text-transform:uppercase;cursor:pointer;white-space:nowrap}.collapse-toggle:hover{border-color:var(--accent);color:var(--accent)}.collapsible-content[hidden]{display:none}.rts-copy-token{appearance:none;border:0;border-radius:0;background:transparent;color:#0384cb;padding:0;margin:0;font:inherit;font-weight:600;line-height:inherit;cursor:pointer;vertical-align:baseline}.rts-copy-token:hover{color:#0384cb;text-decoration:underline;text-underline-offset:2px}.rts-copy-token.copied{background:transparent;border:0;color:#2f9e68}.rts-content-link{color:var(--accent);font-weight:600;text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--accent) 45%,transparent);text-underline-offset:2px}.rts-content-link:hover{color:var(--text)}.rts-text-blue{color:#0384cb;font-weight:600}.rts-text-yellow{color:var(--accent);font-weight:600}.rts-text-muted{color:var(--muted)}`; document.head.appendChild(style);
  }
});

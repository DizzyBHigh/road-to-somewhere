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
  window.setTimeout(() => {
    button.textContent = `${label} ⧉`;
    button.classList.remove('copied');
  }, 1600);
}

function bindCopyButton(button, getText) {
  if (!button || button.dataset.rtsBound === 'true') return;
  button.dataset.rtsBound = 'true';
  const label = button.textContent.replace(/\s*⧉\s*$/, '').trim();
  button.addEventListener('click', async () => {
    try {
      await copyText((await getText()).trim());
      setCopyState(button, label);
    } catch {
      button.textContent = 'Copy failed';
      window.setTimeout(() => { button.textContent = `${label} ⧉`; }, 1600);
    }
  });
}

function initFormattedCopyButtons() {
  document.querySelectorAll('.rts-copy-token').forEach(button => {
    bindCopyButton(button, async () => {
      if (button.dataset.copyKind === 'overlay') return new URL('overlay/', window.location.href).href;
      const importUrl = document.querySelector('[data-import-url]')?.dataset.importUrl;
      const response = await fetch(importUrl);
      if (!response.ok) throw new Error('Import file unavailable');
      return response.text();
    });
  });
}

function initExtensionCopyButtons() {
  const root = document.querySelector('[data-import-url]');
  if (!root) return;
  const importUrl = root.dataset.importUrl;
  const code = document.getElementById('importCode');
  if (code && importUrl) {
    fetch(importUrl)
      .then(response => { if (!response.ok) throw new Error(); return response.text(); })
      .then(text => { code.textContent = text; })
      .catch(() => { code.textContent = 'Unable to load the current import code. Use the versioned download link below.'; });
  }
  bindCopyButton(document.getElementById('copyImport'), async () => {
    if (code?.textContent) return code.textContent;
    const response = await fetch(importUrl);
    if (!response.ok) throw new Error('Import file unavailable');
    return response.text();
  });
  bindCopyButton(document.getElementById('copyOverlayUrl'), () => Promise.resolve(new URL('overlay/', window.location.href).href));
}

document.addEventListener('DOMContentLoaded', () => {
  initFormattedCopyButtons();
  initExtensionCopyButtons();
});
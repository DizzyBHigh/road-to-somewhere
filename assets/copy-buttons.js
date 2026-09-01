document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-import-url], [data-overlay-url]');
  if (!page) return;

  const copyText = async (button, text) => {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      if (!document.execCommand('copy')) throw new Error('Copy failed');
      input.remove();
    }

    const label = button.querySelector('.copy-button-label') || button.querySelector('.rts-format');
    const originalLabel = label ? label.textContent : button.textContent.replace('⧉', '').trim();
    if (label) label.textContent = 'Copied';
    button.classList.add('copied');

    window.setTimeout(() => {
      if (label) label.textContent = originalLabel;
      button.classList.remove('copied');
    }, 1600);
  };

  const bind = (button, getText) => {
    if (!button || button.dataset.rtsBound === 'true') return;
    button.dataset.rtsBound = 'true';
    button.addEventListener('click', async () => {
      try {
        await copyText(button, await getText());
      } catch (error) {
        console.error('Could not copy:', error);
      }
    });
  };

  const importButton = document.getElementById('copyImport');
  const importCode = document.getElementById('importCode');
  if (importButton && page.dataset.importUrl) {
    const getImport = async () => {
      const response = await fetch(page.dataset.importUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    };
    getImport()
      .then(text => { if (importCode) importCode.textContent = text; })
      .catch(error => console.error('Could not load import code:', error));
    bind(importButton, getImport);
  }

  const overlayButton = document.getElementById('copyOverlayUrl');
  if (overlayButton && page.dataset.overlayUrl) {
    bind(overlayButton, () => new URL(page.dataset.overlayUrl, window.location.origin).href);
  }

  document.querySelectorAll('.rts-copy-token').forEach(button => {
    bind(button, async () => {
      if (button.dataset.copyKind === 'overlay') return new URL('overlay/', window.location.href).href;
      const response = await fetch(page.dataset.importUrl);
      if (!response.ok) throw new Error('Import file unavailable');
      return response.text();
    });
  });
});

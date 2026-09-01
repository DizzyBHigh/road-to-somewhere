document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-import-url], [data-overlay-url]');
  if (!page) return;

  const copyText = async (button, text) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    const original = button.innerHTML;
    button.textContent = 'Copied ✓';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = original;
      button.classList.remove('copied');
    }, 1500);
  };

  const importButton = document.getElementById('copyImport');
  const importCode = document.getElementById('importCode');
  if (importButton && page.dataset.importUrl) {
    fetch(page.dataset.importUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => { if (importCode) importCode.textContent = text; })
      .catch(error => console.error('Could not load import code:', error));

    importButton.addEventListener('click', async () => {
      try {
        const response = await fetch(page.dataset.importUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await copyText(importButton, await response.text());
      } catch (error) {
        console.error('Could not copy import code:', error);
      }
    });
  }

  const overlayButton = document.getElementById('copyOverlayUrl');
  if (overlayButton && page.dataset.overlayUrl) {
    overlayButton.addEventListener('click', async () => {
      try {
        await copyText(overlayButton, new URL(page.dataset.overlayUrl, window.location.origin).href);
      } catch (error) {
        console.error('Could not copy overlay URL:', error);
      }
    });
  }
});

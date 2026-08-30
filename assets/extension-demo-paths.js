// Resolve extension-relative demo media paths against the published extension page.
// Shared site assets (/assets/...) and fully-qualified URLs are left unchanged.
(function resolveExtensionDemoPaths() {
  document.querySelectorAll('[data-demo-items]').forEach(card => {
    const raw = card.dataset.demoItems;
    if (!raw) return;

    try {
      const items = JSON.parse(raw);
      const resolved = items.map(item => {
        if (!item || typeof item.src !== 'string') return item;

        const src = item.src.trim();
        if (!src || src.startsWith('/') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
          return item;
        }

        return {
          ...item,
          src: new URL(src, window.location.href).href
        };
      });

      card.dataset.demoItems = JSON.stringify(resolved);
    } catch {
      // Leave malformed demo data untouched; the normal player will handle it.
    }
  });
})();

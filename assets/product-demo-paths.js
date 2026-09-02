// Resolve generated product demo media against the site's base URL.
(function resolveProductDemoPaths() {
  const stylesheet = document.querySelector('link[href*="/assets/site.css"]');
  const siteRoot = stylesheet
    ? new URL(stylesheet.href, window.location.href).pathname.replace(/\/assets\/site\.css$/, '')
    : '';

  document.querySelectorAll('[data-demo-items]').forEach(card => {
    const raw = card.dataset.demoItems;
    if (!raw) return;

    try {
      const items = JSON.parse(raw);
      const resolved = items.map(item => {
        if (!item || typeof item.src !== 'string') return item;

        const src = item.src.trim();
        if (!src || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/assets\/)/i.test(src)) return item;

        return {
          ...item,
          src: `${siteRoot}/${src.replace(/^\/+/, '')}`
        };
      });

      card.dataset.demoItems = JSON.stringify(resolved);
    } catch {
      // Leave malformed demo data untouched; the normal player will handle it.
    }
  });
})();

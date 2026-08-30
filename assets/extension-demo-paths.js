// Resolve extension-owned demo media using the same published asset paths as
// the rest of the generated extension page.
(function resolveExtensionDemoPaths() {
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
        if (!src || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) return item;

        // Shared RTS assets are already site-rooted.
        if (src.startsWith('/assets/')) return item;

        // Extension-owned assets are published by the importer as:
        // extensions/<extension-slug>/assets/...
        // Resolve that published path against the site's base URL.
        if (src.startsWith('extensions/')) {
          return {
            ...item,
            src: `${siteRoot}/${src}`
          };
        }

        // Backwards compatibility for manifests generated before the importer
        // switched to base-URL-safe extension paths.
        if (src.startsWith('/extensions/')) {
          return {
            ...item,
            src: `${siteRoot}${src}`
          };
        }

        // Do not treat bare "assets/..." as a third asset convention here.
        // Extension-owned assets should have been rewritten by the importer;
        // shared assets should use /assets/....
        return item;
      });

      card.dataset.demoItems = JSON.stringify(resolved);
    } catch {
      // Leave malformed demo data untouched; the normal player will handle it.
    }
  });
})();

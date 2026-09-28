(() => {
  const root = document.documentElement;
  const endpoint = root.dataset.rtsAnalyticsEndpoint;
  if (!endpoint) return;

  window.RTSAnalytics = {
    track(event, product = null, metadata = null) {
      const payload = { event };
      if (product) payload.product = product;
      if (metadata) payload.metadata = metadata;

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    },
  };
  document.addEventListener('click', event => {
    const discord = event.target.closest('.discord-link');
    if (!discord) return;

    const page = document.querySelector('.product-page');
    const product = page?.dataset.productSlug || null;

    window.RTSAnalytics.track('discord_click', product, {
      page_path: window.location.pathname,
      page_title: document.title,
    });
  });
})();

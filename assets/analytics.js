(() => {
  const root = document.documentElement;
  const endpoint = root.dataset.rtsAnalyticsEndpoint;
  if (!endpoint) return;

  window.RTSAnalytics = {
    track(event, product = null) {
      const payload = { event };
      if (product) payload.product = product;

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    },
  };
})();

if (window.__rtsAnalyticsDashboardLoaded) {
  // Prevent duplicate initialization if the dashboard script is included more than once.
} else {
window.__rtsAnalyticsDashboardLoaded = true;
document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.analytics-page');
  if (!page) return;

  const status = document.getElementById('analyticsStatus');
  const app = document.getElementById('analyticsApp');
  const product = document.getElementById('analyticsProduct');
  const refresh = document.getElementById('analyticsRefresh');
  const cards = document.getElementById('analyticsCards');
  const empty = document.getElementById('analyticsEmpty');
  const endpoint = document.documentElement.dataset.rtsAnalyticsEndpoint;
  let loadInProgress = false;
  const labels = {
    extension_view: 'Extension Views',
    import_copy: 'Import Code Copies',
    overlay_url_copy: 'Overlay URL Copies',
    overlay_download: 'Overlay Downloads',
    discord_click: 'Discord Clicks',
    github_click: 'GitHub Clicks',
    kofi_click: 'Ko-fi Clicks',
    demo_play: 'Demo Plays'
  };

  const showStatus = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('analytics-status--error', error);
  };

  const fetchProduct = async (token, slug) => {
    const response = await fetch(
      endpoint.replace('/track-site-event', '/product-analytics') +
        '?product=' + encodeURIComponent(slug),
      { headers: { Authorization: 'Bearer ' + token } }
    );

    if (response.status === 403) {
      throw new Error('Your account is not registered as an RTS administrator.');
    }
    if (response.status === 401) {
      throw new Error('Your RTS session has expired. Sign in again.');
    }
    if (!response.ok) {
      throw new Error('Analytics service returned HTTP ' + response.status + '.');
    }

    return response.json();
  };

  const renderEvents = (slug, name, events, daily) => {
    const group = document.createElement('section');
    group.className = 'analytics-product';
    group.innerHTML = '<h4>' + name + '</h4>';

    const summary = document.createElement('div');
    summary.className = 'analytics-summary';

    const counts = new Map(events.map(event => [event.event_type, Number(event.event_count)]));
    for (const [eventType, label] of Object.entries(labels)) {
      const item = document.createElement('div');
      item.className = 'analytics-summary__item';
      item.innerHTML =
        '<span class="analytics-summary__count">' + (counts.get(eventType) || 0).toLocaleString() +
        '</span><span class="analytics-summary__label">' + label + '</span>';
      summary.appendChild(item);
    }

    const trend = document.createElement('details');
    trend.className = 'analytics-trend';
    trend.innerHTML = '<summary>Activity by date</summary><div class="analytics-trend__chart"></div>';

    group.appendChild(summary);
    group.appendChild(trend);
    const chart = trend.querySelector('.analytics-trend__chart');
    trend.addEventListener('toggle', () => {
      if (trend.open) window.RTSAnalyticsChart.render(chart, daily);
    }, { once: true });
    cards.appendChild(group);


  };

  const load = async (force = false) => {
    if (loadInProgress && !force) return;
    loadInProgress = true;

    const token = window.rtsAuthSession?.access_token;
    if (!token) {
      loadInProgress = false;
      showStatus('Sign in with Discord to access RTS analytics.', true);
      app.hidden = true;
      return;
    }

    showStatus('Loading analytics...');
    try {
      cards.replaceChildren();

      if (product.value === '__all__') {
        const products = Array.from(product.options)
          .filter(option => option.value !== '__all__')
          .map(option => ({ slug: option.value, name: option.textContent }));

        const results = await Promise.all(
          products.map(async item => ({
            ...item,
            data: await fetchProduct(token, item.slug)
          }))
        );

        cards.replaceChildren();
        for (const item of results) {
          renderEvents(item.slug, item.name, item.data.events || [], item.data.daily || []);
        }

        empty.hidden = true;
        app.hidden = false;
        showStatus('All products loaded.');
        return;
      }

      const result = await fetchProduct(token, product.value);
      cards.replaceChildren();
      renderEvents(
        product.value,
        product.options[product.selectedIndex].textContent,
        result.events || [],
        result.daily || []
      );

      empty.hidden = true;
      app.hidden = false;
      showStatus('Analytics loaded.');
    } catch (error) {
      app.hidden = true;
      showStatus(error.message || 'Unable to load analytics.', true);
    } finally {
      loadInProgress = false;
    }
  };

  product.addEventListener('change', () => load(true));
  refresh.addEventListener('click', () => load(true));
  window.addEventListener('rts-auth-state', load);
  if (window.rtsAuthSession) load();
});
}

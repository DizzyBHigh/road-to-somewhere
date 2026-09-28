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

  const load = async () => {
    const token = window.rtsAuthSession?.access_token;
    if (!token) {
      showStatus('Sign in with Discord to access RTS analytics.', true);
      app.hidden = true;
      return;
    }

    showStatus('Loading analytics...');
    try {
      const response = await fetch(
        endpoint.replace('/track-site-event', '/product-analytics') +
          '?product=' + encodeURIComponent(product.value),
        { headers: { Authorization: 'Bearer ' + token } }
      );

      if (response.status === 403) {
        throw new Error('Your account is not registered as an RTS administrator.');
      }
      if (response.status === 401) {
        throw new Error('Your RTS session has expired. Sign in again.');
      }
      if (!response.ok) throw new Error('Analytics service returned HTTP ' + response.status + '.');

      const result = await response.json();
      cards.replaceChildren();
      const events = result.events || [];

      for (const event of events) {
        const card = document.createElement('article');
        card.className = 'analytics-card';
        card.innerHTML =
          '<span class="analytics-card__count">' + Number(event.event_count).toLocaleString() +
          '</span><span class="analytics-card__label">' +
          (labels[event.event_type] || event.event_type) + '</span>';
        cards.appendChild(card);
      }

      empty.hidden = events.length !== 0;
      app.hidden = false;
      showStatus('Analytics loaded.');
    } catch (error) {
      app.hidden = true;
      showStatus(error.message || 'Unable to load analytics.', true);
    }
  };

  product.addEventListener('change', load);
  refresh.addEventListener('click', load);
  window.addEventListener('rts-auth-state', load);
  if (window.rtsAuthSession) load();
});

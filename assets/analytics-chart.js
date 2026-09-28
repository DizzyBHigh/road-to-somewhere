window.RTSAnalyticsChart = {
  render(container, daily) {
    container.replaceChildren();
    if (!daily.length) {
      container.textContent = 'No activity recorded yet.';
      return;
    }

    const width = 900;
    const height = 220;
    const pad = 28;
    const max = Math.max(...daily.map(item => Number(item.event_count)), 1);
    const points = daily.map((item, index) => {
      const x = pad + (index / Math.max(daily.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - (Number(item.event_count) / max) * (height - pad * 2);
      return x + ',' + y;
    }).join(' ');

    const start = daily[0].event_date;
    const end = daily[daily.length - 1].event_date;
    container.innerHTML =
      '<div class="analytics-chart__meta"><span>' + start +
      '</span><span>' + end + '</span></div>' +
      '<svg class="analytics-chart" viewBox="0 0 ' + width + ' ' + height +
      '" role="img" aria-label="Daily analytics activity from ' + start + ' to ' + end + '">' +
      '<polyline points="' + points +
      '" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/>' +
      '</svg>';
  }
};

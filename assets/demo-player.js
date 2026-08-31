function initDemoPlayers() {
  document.querySelectorAll('[data-demo-player]').forEach(player => {
    const card = player.closest('.demo-card');
    const mediaHost = player.querySelector('[data-demo-media]');
    const caption = player.querySelector('[data-demo-caption]');
    const dots = card?.querySelector('[data-demo-dots]');
    const counter = card?.querySelector('[data-demo-counter]');
    const previous = player.querySelector('[data-demo-prev]');
    const next = player.querySelector('[data-demo-next]');
    if (!mediaHost || !card) return;
    let items = [];
    try { items = card.dataset.demoItems ? JSON.parse(card.dataset.demoItems) : []; } catch { items = []; }
    if (!items.length) return;

    let index = 0;
    let timer = null;
    const autoplay = card.dataset.demoAutoplay === 'true';
    const interval = Math.max(1000, Number(card.dataset.demoInterval) || 5000);

    function stopTimer() {
      if (timer) window.clearTimeout(timer);
      timer = null;
    }

    function scheduleNext() {
      stopTimer();
      if (!autoplay || items.length < 2 || items[index].type === 'video') return;
      timer = window.setTimeout(() => show(index + 1), interval);
    }

    function updateNavigation() {
      if (dots) {
        dots.replaceChildren();
        items.forEach((_, dotIndex) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'demo-dot';
          dot.setAttribute('aria-label', `Show demo item ${dotIndex + 1}`);
          dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
          dot.addEventListener('click', () => show(dotIndex));
          dots.appendChild(dot);
        });
      }
      if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      const multiple = items.length > 1;
      if (previous) previous.hidden = !multiple;
      if (next) next.hidden = !multiple;
    }

    function updateCaption(item) {
      if (!caption) return;
      caption.replaceChildren();
      if (item.title) {
        const title = document.createElement('strong');
        title.textContent = item.title;
        caption.appendChild(title);
      }
      if (item.caption) {
        const text = document.createElement('span');
        text.textContent = item.caption;
        caption.appendChild(text);
      }
    }

    function show(nextIndex) {
      stopTimer();
      index = (nextIndex + items.length) % items.length;
      const item = items[index];
      mediaHost.replaceChildren();
      let media;
      if (item.type === 'video') {
        media = document.createElement('video');
        media.controls = item.controls !== false;
        media.playsInline = true;
        media.preload = 'metadata';
        media.src = item.src;
        media.addEventListener('ended', () => { if (autoplay) show(index + 1); }, { once: true });
        if (autoplay || item.autoplay === true) {
          media.muted = item.muted !== false;
          media.autoplay = true;
          media.play().catch(() => {});
        }
      } else {
        media = document.createElement('img');
        media.loading = 'lazy';
        media.decoding = 'async';
        media.src = item.src;
        media.alt = item.alt || item.title || '';
      }
      mediaHost.appendChild(media);
      updateCaption(item);
      updateNavigation();
      scheduleNext();
    }

    previous?.addEventListener('click', () => show(index - 1));
    next?.addEventListener('click', () => show(index + 1));
    player.addEventListener('mouseenter', stopTimer);
    player.addEventListener('mouseleave', scheduleNext);
    player.addEventListener('focusin', stopTimer);
    player.addEventListener('focusout', event => { if (!player.contains(event.relatedTarget)) scheduleNext(); });
    show(0);
  });
}

document.addEventListener('DOMContentLoaded', initDemoPlayers);
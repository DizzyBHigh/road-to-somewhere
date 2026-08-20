(() => {
  const stage = document.getElementById("stage");
  if (!stage) return;

  const REVEAL_MS = 4300;
  const DEPART_MS = 4300;
  const FADE_MS = 1200;
  const ARRIVAL_TRUCK_DISTANCE = 1220;
  const ARRIVAL_REAR_DISTANCE = 520;
  const DEPART_TRUCK_DISTANCE_EXTRA = 700;
  const WS_URL = "ws://127.0.0.1:8080/";
  let pendingArrivalStyle = false;
  let pendingScrollSpeed = "Medium";

  function animationMs(element, fallback) {
    const value = getComputedStyle(element).animationDuration.split(",")[0].trim();
    const ms = value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
    return Number.isFinite(ms) && ms > 0 ? ms : fallback;
  }

  function scrollPixelsPerSecond(scene) {
    const speed = String(scene.dataset.banMessageScrollSpeed || "Medium").toLowerCase();
    if (speed === "slow") return 25;
    if (speed === "fast") return 70;
    return 40;
  }

  function prepareScene(scene) {
    if (scene.dataset.messageLifecycle === "1") return;
    scene.dataset.messageLifecycle = "1";
    if (pendingArrivalStyle) {
      scene.classList.add("arrival-message-style");
      pendingArrivalStyle = false;
    }
    scene.dataset.banMessageScrollSpeed = pendingScrollSpeed;

    const trail = scene.querySelector(".ban-trail");
    const sourceReason = trail?.querySelector(".ban-reason span");
    const truck = scene.querySelector(".truck");
    if (!trail || !sourceReason || !truck) return;

    const layer = document.createElement("div");
    layer.className = "ban-message-layer";
    layer.innerHTML = '<div class="ban-message-label">BANNED:</div><div class="ban-message-viewport"><div class="ban-message-text"></div></div>';
    scene.appendChild(layer);
    const viewport = layer.querySelector(".ban-message-viewport");
    const text = layer.querySelector(".ban-message-text");
    const skids = [...trail.querySelectorAll(".skid")];

    let scrollMs = 0;
    let revealStartedAt = 0;
    let revealStarted = false;
    let scrollStarted = false;
    let fadeStarted = false;
    let arrivalActive = false;
    let departureStarted = false;
    let departureFinished = false;
    let messageFinished = false;
    let arrivalSkidAnimations = [];
    let removeTimer = null;

    const syncReason = () => {
      text.textContent = sourceReason.textContent || "BANNED";
      requestAnimationFrame(measureReason);
    };

    const measureReason = () => {
      if (!layer.isConnected) return;
      const overflow = Math.max(0, text.scrollWidth - viewport.clientWidth);
      if (overflow > 0) {
        const pixelsPerSecond = scrollPixelsPerSecond(scene);
        scrollMs = Math.max(1000, Math.ceil((overflow / pixelsPerSecond) * 1000));
        layer.style.setProperty("--ban-message-scroll-distance", `${-overflow}px`);
        layer.style.setProperty("--ban-message-scroll-time", `${scrollMs}ms`);
      } else {
        scrollMs = 0;
        layer.style.removeProperty("--ban-message-scroll-distance");
        layer.style.removeProperty("--ban-message-scroll-time");
      }
    };

    const startFade = () => {
      if (fadeStarted || !layer.isConnected) return;
      if (arrivalActive && (!departureFinished || !messageFinished)) return;
      fadeStarted = true;
      trail.classList.add("message-complete");
      layer.classList.add("fading");
      setTimeout(() => { if (scene.isConnected) originalRemove(); }, FADE_MS);
    };

    const finishMessage = () => {
      messageFinished = true;
      startFade();
    };

    const startScroll = (immediate = false) => {
      if (scrollStarted || !layer.isConnected) return;
      scrollStarted = true;
      const begin = () => {
        if (!layer.isConnected) return;
        measureReason();
        requestAnimationFrame(() => {
          if (!layer.isConnected) return;
          if (scrollMs > 0) {
            layer.classList.add("scrolling");
            setTimeout(finishMessage, scrollMs);
          } else {
            finishMessage();
          }
        });
      };
      if (immediate) begin(); else setTimeout(begin, REVEAL_MS);
    };

    const stopArrivalSkids = () => {
      arrivalSkidAnimations.forEach((a) => { try { a.cancel(); } catch {} });
      arrivalSkidAnimations = [];
    };

    const startArrivalSkids = () => {
      const truckDuration = animationMs(truck, REVEAL_MS);
      const duration = truckDuration * (ARRIVAL_REAR_DISTANCE / ARRIVAL_TRUCK_DISTANCE);
      const stopWidth = ARRIVAL_REAR_DISTANCE;
      stopArrivalSkids();
      skids.forEach((skid) => {
        skid.style.animation = "none";
        skid.style.width = "0px";
        const animation = skid.animate(
          [{ width: "0px" }, { width: `${stopWidth}px` }],
          { duration, easing: "linear", fill: "forwards" }
        );
        arrivalSkidAnimations.push(animation);
        animation.finished.then(() => {
          if (!departureStarted && skid.isConnected) skid.style.width = `${stopWidth}px`;
        }).catch(() => {});
      });
    };

    const startDepartureSkids = () => {
      const startWidth = ARRIVAL_REAR_DISTANCE;
      const visibleDistance = Math.max(1, window.innerWidth - startWidth);
      const truckDistance = Math.max(1, window.innerWidth + DEPART_TRUCK_DISTANCE_EXTRA);
      const truckDuration = animationMs(truck, DEPART_MS);
      const duration = truckDuration * (visibleDistance / truckDistance);
      const endWidth = startWidth + visibleDistance;
      stopArrivalSkids();
      skids.forEach((skid) => {
        skid.style.animation = "none";
        skid.style.width = `${startWidth}px`;
        skid.animate(
          [{ width: `${startWidth}px` }, { width: `${endWidth}px` }],
          { duration, easing: "linear", fill: "forwards" }
        ).finished.then(() => {
          if (skid.isConnected) skid.style.width = `${endWidth}px`;
        }).catch(() => {});
      });
    };

    const beginArrivalStyle = () => {
      if (arrivalActive) return;
      arrivalActive = true;
      revealStarted = true;
      revealStartedAt = performance.now();
      layer.classList.add("arrival-style", "revealing");
      syncReason();
      startArrivalSkids();
      startScroll(true);
    };

    const originalRemove = scene.remove.bind(scene);
    scene.remove = () => {
      if (arrivalActive) {
        if (fadeStarted) originalRemove();
        else {
          if (removeTimer) clearTimeout(removeTimer);
          removeTimer = setTimeout(() => { if (scene.isConnected) scene.remove(); }, 100);
        }
        return;
      }
      if (!revealStarted) {
        originalRemove();
        return;
      }
      const elapsed = performance.now() - revealStartedAt;
      const remaining = Math.max(0, REVEAL_MS + scrollMs + FADE_MS - elapsed);
      if (remaining <= 0) originalRemove();
      else {
        if (removeTimer) clearTimeout(removeTimer);
        removeTimer = setTimeout(() => { if (scene.isConnected) originalRemove(); }, remaining);
      }
    };

    const textObserver = new MutationObserver(syncReason);
    textObserver.observe(sourceReason, { childList: true, characterData: true, subtree: true });

    const classObserver = new MutationObserver(() => {
      if (!arrivalActive && scene.classList.contains("arrival-message-style")) beginArrivalStyle();

      if (arrivalActive && !departureStarted && truck.classList.contains("driving-off")) {
        departureStarted = true;
        startDepartureSkids();
        setTimeout(() => {
          departureFinished = true;
          startFade();
        }, animationMs(truck, DEPART_MS));
      }

      if (!arrivalActive && !revealStarted && trail.classList.contains("revealing")) {
        revealStarted = true;
        revealStartedAt = performance.now();
        layer.classList.add("revealing");
        syncReason();
        startScroll();
      }

      if (trail.classList.contains("fading") && !fadeStarted) trail.classList.remove("fading");
    });
    classObserver.observe(scene, { attributes: true, attributeFilter: ["class"] });
    classObserver.observe(trail, { attributes: true, attributeFilter: ["class"] });
    classObserver.observe(truck, { attributes: true, attributeFilter: ["class"] });

    if (scene.classList.contains("arrival-message-style")) beginArrivalStyle();
    syncReason();
  }

  const sceneObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.classList.contains("ban-scene")) prepareScene(node);
      });
    });
  });
  sceneObserver.observe(stage, { childList: true });

  function connectStyleListener() {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ request: "Subscribe", id: "ban-widget-message-style", events: { Custom: ["Event"] } }));
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (String(message.event?.source || "").toLowerCase() !== "custom") return;
        if (String(message.event?.type || "").toLowerCase() !== "event") return;
        let data = message.data || {};
        if (typeof data === "string") data = JSON.parse(data);
        if (data?.data && typeof data.data === "string") data = { ...data, ...JSON.parse(data.data) };
        if (data?.args && typeof data.args === "object") data = { ...data, ...data.args };
        if (data?.payload && typeof data.payload === "object") data = { ...data, ...data.payload };
        const eventName = String(data.eventName || data.triggerCustomEventName || "").toLowerCase();
        if (eventName && eventName !== "banwidget") return;
        const action = String(data.banWidgetAction || data.action || "").toLowerCase();
        if (action !== "ban") return;

        const enabled = data.banWidgetBanMessageArrivalStyle === true || String(data.banWidgetBanMessageArrivalStyle || "").toLowerCase() === "true";
        const speed = String(data.banWidgetBanMessageScrollSpeed || "Medium");
        pendingScrollSpeed = ["Slow", "Medium", "Fast"].find(x => x.toLowerCase() === speed.toLowerCase()) || "Medium";

        const scenes = [...stage.querySelectorAll(".ban-scene")];
        const scene = scenes[scenes.length - 1];
        if (scene) {
          scene.dataset.banMessageScrollSpeed = pendingScrollSpeed;
          if (enabled) scene.classList.add("arrival-message-style");
        } else {
          pendingArrivalStyle = enabled;
        }
      } catch (err) { console.warn("Ban message style listener error", err); }
    };
    ws.onclose = () => setTimeout(connectStyleListener, 3000);
    ws.onerror = () => ws.close();
  }

  connectStyleListener();
})();

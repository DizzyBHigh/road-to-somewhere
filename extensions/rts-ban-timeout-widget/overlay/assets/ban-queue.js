(() => {
  const NativeWebSocket = window.WebSocket;
  const stage = document.getElementById("stage");
  const connections = new Set();
  const banQueue = [];
  let banActive = false;
  let mainConnectionSeen = false;

  function parseMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const source = String(message.event?.source || "").toLowerCase();
      const type = String(message.event?.type || "").toLowerCase();
      if (source !== "custom" || type !== "event") return null;

      let data = message.data || {};
      if (typeof data === "string") data = JSON.parse(data);
      if (data?.data && typeof data.data === "string") data = { ...data, ...JSON.parse(data.data) };
      if (data?.args && typeof data.args === "object") data = { ...data, ...data.args };
      if (data?.payload && typeof data.payload === "object") data = { ...data, ...data.payload };

      const eventName = String(data.eventName || data.triggerCustomEventName || "").toLowerCase();
      const action = String(data.banWidgetAction || data.action || "").toLowerCase();
      if (eventName && eventName !== "banwidget") return null;
      if (action !== "ban") return null;

      return { message, data };
    } catch {
      return null;
    }
  }

  function isBanEvent(event) {
    return !!parseMessage(event);
  }

  function deliverBan(item) {
    banActive = true;

    // Deliver the exact same BanWidget event to every listener only when the
    // ban reaches the front of the queue. This keeps message/style settings
    // attached to the ban that is actually starting.
    connections.forEach((connection) => {
      if (typeof connection.handler === "function") {
        try { connection.handler.call(connection.ws, item.event); } catch (err) { console.warn("Ban queue handler error", err); }
      }
    });

    requestAnimationFrame(() => applyQueuedBanSettings(item.data));
  }

  function drain() {
    if (banActive || !banQueue.length) return;
    deliverBan(banQueue.shift());
  }

  function applyQueuedBanSettings(data) {
    const scenes = stage ? [...stage.querySelectorAll(".ban-scene")] : [];
    const scene = scenes[scenes.length - 1];
    if (!scene) return;

    const arrival = data.banWidgetBanMessageArrivalStyle === true || String(data.banWidgetBanMessageArrivalStyle || "").toLowerCase() === "true";
    const speed = String(data.banWidgetBanMessageScrollSpeed || "Medium");
    const normalizedSpeed = ["Slow", "Medium", "Fast"].find(x => x.toLowerCase() === speed.toLowerCase()) || "Medium";

    scene.dataset.banMessageScrollSpeed = normalizedSpeed;
    if (arrival) scene.classList.add("arrival-message-style");
  }

  const queuedWebSocket = function(url, protocols) {
    const ws = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
    const connection = { ws, handler: null, subscriptionId: "" };
    connections.add(connection);

    const originalSend = ws.send.bind(ws);
    ws.send = (payload) => {
      try {
        const request = typeof payload === "string" ? JSON.parse(payload) : null;
        connection.subscriptionId = String(request?.id || "");
        if (connection.subscriptionId === "ban-widget-v4") mainConnectionSeen = true;
      } catch {}
      return originalSend(payload);
    };

    Object.defineProperty(ws, "onmessage", {
      configurable: true,
      enumerable: true,
      get: () => connection.handler,
      set: (handler) => { connection.handler = handler; },
    });

    ws.addEventListener("message", (event) => {
      const banEvent = isBanEvent(event);

      if (banEvent) {
        // Ban events are owned by the main BanWidget websocket. All BanWidget
        // listeners are suppressed until the queued ban reaches the front.
        if (connection.subscriptionId === "ban-widget-v4" && mainConnectionSeen) {
          const parsed = parseMessage(event);
          banQueue.push({ event, data: parsed.data });
          drain();
        }
        return;
      }

      if (typeof connection.handler === "function") {
        try { connection.handler.call(ws, event); } catch (err) { console.warn("Ban queue websocket handler error", err); }
      }
    });

    ws.addEventListener("close", () => connections.delete(connection));
    return ws;
  };

  queuedWebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket = queuedWebSocket;

  if (stage) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement && node.classList.contains("ban-scene")) {
            banActive = false;
            drain();
            return;
          }
        }
      }
    });
    observer.observe(stage, { childList: true });
  }
})();

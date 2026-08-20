(() => {
  const state = {
    alwaysShowStack: true,
    durationSeconds: 10,
    showWhenItemLeaves: true,
  };

  let hideTimer = null;

  function setStackVisible(visible) {
    const stage = document.getElementById("stage");
    if (!stage) return;
    stage.classList.toggle("ban-stack-hidden", !visible);
  }

  function hideStack() {
    if (state.alwaysShowStack) return;
    setStackVisible(false);
  }

  function temporarilyShowStack(durationSeconds = state.durationSeconds) {
    if (state.alwaysShowStack) {
      setStackVisible(true);
      return;
    }

    setStackVisible(true);
    if (hideTimer) clearTimeout(hideTimer);

    const seconds = Math.max(1, Math.min(60, Number(durationSeconds) || 10));
    hideTimer = setTimeout(() => {
      hideTimer = null;
      hideStack();
    }, seconds * 1000);
  }

  function flatten(data) {
    if (!data || typeof data !== "object") return data;
    let x = { ...data };
    if (x.data && typeof x.data === "object") x = { ...x, ...x.data };
    if (x.args && typeof x.args === "object") x = { ...x, ...x.args };
    if (x.payload && typeof x.payload === "object") x = { ...x, ...x.payload };
    return x;
  }

  function inspectMessage(raw) {
    try {
      const message = JSON.parse(raw);
      if (String(message?.event?.source || "").toLowerCase() !== "custom") return;
      if (String(message?.event?.type || "").toLowerCase() !== "event") return;

      const data = flatten(message.data || {});
      const eventName = String(
        data.eventName || data.triggerCustomEventName || "",
      ).toLowerCase();

      if (eventName === "banwidget") {
        if (typeof data.banWidgetAlwaysShowStack === "boolean") {
          state.alwaysShowStack = data.banWidgetAlwaysShowStack;
          if (state.alwaysShowStack) setStackVisible(true);
          else hideStack();
        }

        const duration = Number(data.banWidgetStackVisibilityDuration);
        if (Number.isFinite(duration)) {
          state.durationSeconds = Math.max(1, Math.min(60, duration));
        }

        if (typeof data.banWidgetShowStackWhenItemLeaves === "boolean") {
          state.showWhenItemLeaves = data.banWidgetShowStackWhenItemLeaves;
        }
      } else if (eventName === "banwidgetshowstack") {
        const duration = Number(data.banWidgetStackVisibilityDuration);
        temporarilyShowStack(
          Number.isFinite(duration) ? duration : state.durationSeconds,
        );
      }
    } catch {
      // Ignore malformed websocket messages; the main overlay handler owns them.
    }
  }

  const NativeWebSocket = window.WebSocket;
  if (NativeWebSocket) {
    class BanWidgetWebSocket extends NativeWebSocket {
      set onmessage(handler) {
        if (typeof handler !== "function") {
          super.onmessage = handler;
          return;
        }

        super.onmessage = (event) => {
          inspectMessage(event.data);
          handler(event);
        };
      }
    }

    BanWidgetWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    BanWidgetWebSocket.OPEN = NativeWebSocket.OPEN;
    BanWidgetWebSocket.CLOSING = NativeWebSocket.CLOSING;
    BanWidgetWebSocket.CLOSED = NativeWebSocket.CLOSED;
    window.WebSocket = BanWidgetWebSocket;
  }

  const stageObserver = new MutationObserver((mutations) => {
    if (state.alwaysShowStack || !state.showWhenItemLeaves) return;

    for (const mutation of mutations) {
      if (mutation.type !== "attributes" || mutation.attributeName !== "class") continue;
      const element = mutation.target;
      if (
        element instanceof HTMLElement &&
        element.classList.contains("cell") &&
        element.classList.contains("docked") &&
        element.classList.contains("releasing")
      ) {
        temporarilyShowStack();
        break;
      }
    }
  });

  function startObserver() {
    const stage = document.getElementById("stage");
    if (!stage) {
      requestAnimationFrame(startObserver);
      return;
    }

    stageObserver.observe(stage, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    if (state.alwaysShowStack) setStackVisible(true);
  }

  startObserver();
})();

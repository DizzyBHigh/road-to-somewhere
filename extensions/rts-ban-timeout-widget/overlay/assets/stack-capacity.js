(() => {
  // Max Docked is a visibility limit, not a lifetime limit.
  // Cards beyond the configured capacity stay alive and keep their timers,
  // but remain hidden until an existing docked card expires.
  let maxDocked = 4;

  function flatten(data) {
    if (!data || typeof data !== "object") return data;
    let x = { ...data };
    if (x.data && typeof x.data === "object") x = { ...x, ...x.data };
    if (x.args && typeof x.args === "object") x = { ...x, ...x.args };
    if (x.payload && typeof x.payload === "object") x = { ...x, ...x.payload };
    return x;
  }

  function readMaxDocked(data) {
    const d = flatten(data);
    const value = Number(d?.banWidgetMaxDocked);
    if (Number.isFinite(value)) {
      maxDocked = Math.max(1, Math.min(25, Math.round(value)));
      restackCapacity();
    }
  }

  // The main overlay previously enforced Max Docked by immediately removing
  // the oldest card. We deliberately let the main overlay believe its hard
  // capacity is 25, while this layer enforces the user's configured limit by
  // hiding excess cards. This preserves every card and its original timer.
  const NativeWebSocket = window.WebSocket;
  if (NativeWebSocket) {
    class CapacityWebSocket extends NativeWebSocket {
      set onmessage(handler) {
        if (typeof handler !== "function") {
          super.onmessage = handler;
          return;
        }

        super.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const source = String(message?.event?.source || "").toLowerCase();
            const type = String(message?.event?.type || "").toLowerCase();
            if (source === "custom" && type === "event") {
              readMaxDocked(message.data || {});

              // Prevent the main script from evicting cards. It will still
              // receive every other setting unchanged.
              const rewritten = rewriteMaxDocked(message, 25);
              if (rewritten) {
                Object.defineProperty(event, "data", {
                  configurable: true,
                  value: JSON.stringify(rewritten),
                });
              }
            }
          } catch {
            // Ignore non-JSON websocket messages.
          }
          handler(event);
        };
      }
    }

    CapacityWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    CapacityWebSocket.OPEN = NativeWebSocket.OPEN;
    CapacityWebSocket.CLOSING = NativeWebSocket.CLOSING;
    CapacityWebSocket.CLOSED = NativeWebSocket.CLOSED;
    window.WebSocket = CapacityWebSocket;
  }

  function rewriteMaxDocked(message, value) {
    if (!message || typeof message !== "object") return null;
    const copy = JSON.parse(JSON.stringify(message));
    let found = false;

    function visit(obj) {
      if (!obj || typeof obj !== "object") return;
      for (const key of Object.keys(obj)) {
        const current = obj[key];
        if (key === "banWidgetMaxDocked" && Number.isFinite(Number(current))) {
          obj[key] = value;
          found = true;
        } else if (current && typeof current === "object") {
          visit(current);
        }
      }
    }

    visit(copy);
    return found ? copy : null;
  }

  function restackCapacity() {
    const stage = document.getElementById("stage");
    if (!stage) return;

    const cards = [...stage.querySelectorAll(".cell.docked")];
    cards.forEach((card, index) => {
      card.style.setProperty(
        "--dock-bottom",
        `calc(var(--edge) + ${index} * (var(--stack-h) + var(--stack-gap)))`,
      );

      // The first maxDocked cards are visible. Additional cards remain in
      // the DOM and keep their timers running, but wait invisibly for space.
      card.style.visibility = index < maxDocked ? "visible" : "hidden";
    });
  }

  function start() {
    const stage = document.getElementById("stage");
    if (!stage) {
      requestAnimationFrame(start);
      return;
    }

    const stageObserver = new MutationObserver(() => {
      restackCapacity();
    });

    stageObserver.observe(stage, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    const rootObserver = new MutationObserver(restackCapacity);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    restackCapacity();
  }

  start();
})();

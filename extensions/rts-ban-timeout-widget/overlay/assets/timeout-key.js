(() => {
  // Consume the canonical BanWidget payload produced by script.js.
  const initiators = new Map();
  let showKeyAnimation = true;

  function flatten(value) {
    if (typeof value === "string") {
      try { value = JSON.parse(value); } catch { return value; }
    }
    if (!value || typeof value !== "object") return value;
    let x = { ...value };
    for (const key of ["data", "args", "payload"]) {
      if (typeof x[key] === "string") {
        try { x[key] = JSON.parse(x[key]); } catch {}
      }
      if (x[key] && typeof x[key] === "object") x = { ...x, ...x[key] };
    }
    return x;
  }

  function applySettings(data) {
    const d = flatten(data);
    if (!d || typeof d !== "object") return;
    if (d.banWidgetShowKeyAnimation !== undefined) {
      showKeyAnimation = d.banWidgetShowKeyAnimation === true || String(d.banWidgetShowKeyAnimation).toLowerCase() === "true";
    }
  }

  function remember(data) {
    const d = flatten(data);
    if (!d || typeof d !== "object") return;
    applySettings(d);
    if (String(d.banWidgetAction || "").toLowerCase() !== "timeout") return;

    const id = String(d.banWidgetTargetId || "");
    const login = String(d.banWidgetTargetUsername || "").toLowerCase();
    const display = String(d.banWidgetTargetName || "").toLowerCase();
    const initiatorName = d.banWidgetInitiatorName || d.timeoutInitiatorName || d.createdByDisplayName || "";
    const initiatorAvatar = d.banWidgetInitiatorAvatar || d.timeoutInitiatorAvatar || "";
    const initiatorId = d.banWidgetInitiatorId || d.timeoutInitiatorId || d.createdById || "";
    const initiatorUsername = d.banWidgetInitiatorUsername || d.timeoutInitiatorUsername || d.createdByUsername || "";
    if (!initiatorName && !initiatorAvatar) return;

    const info = {
      name: String(initiatorName || initiatorUsername),
      username: String(initiatorUsername || ""),
      id: String(initiatorId || ""),
      avatar: String(initiatorAvatar || ""),
      expires: Date.now() + 15000,
    };

    if (id) initiators.set(`id:${id}`, info);
    if (login) initiators.set(`name:${login}`, info);
    if (display) initiators.set(`name:${display}`, info);
    addPendingKeys();
  }

  // Keep the normal CustomEvent listener, but also expose a direct hook for
  // script.js and wrap dispatchEvent so the handoff is robust during startup.
  window.__banWidgetTimeoutKey = remember;
  window.addEventListener("BanWidget", event => remember(event.detail));

  const originalDispatchEvent = window.dispatchEvent.bind(window);
  window.dispatchEvent = function (event) {
    if (event && event.type === "BanWidget") {
      try { remember(event.detail); } catch (err) { console.warn("BanWidget key handoff error", err); }
    }
    return originalDispatchEvent(event);
  };

  function findInitiator(cell) {
    const id = String(cell.dataset.userId || "");
    const name = String(cell.querySelector(".nameplate span")?.textContent || "").toLowerCase();
    return (id && initiators.get(`id:${id}`)) || (name && initiators.get(`name:${name}`)) || null;
  }

  function addKey(cell) {
    if (!showKeyAnimation) return false;
    if (!cell || !cell.classList.contains("cell") || cell.querySelector(".timeout-key")) return true;
    const initiator = findInitiator(cell);
    if (!initiator) return false;

    const key = document.createElement("div");
    key.className = "timeout-key";
    key.innerHTML = '<div class="timeout-key-head"><img alt=""></div><div class="timeout-key-shaft"></div><div class="timeout-key-tooth"></div><div class="timeout-key-label"></div>';
    const image = key.querySelector("img");
    const label = key.querySelector(".timeout-key-label");
    image.src = initiator.avatar || "";
    image.alt = initiator.name ? `Timeout by ${initiator.name}` : "Timeout initiator";
    image.onerror = () => (image.style.opacity = "0.15");
    label.textContent = initiator.name || "";
    if (!initiator.name) label.hidden = true;
    cell.appendChild(key);
    cell.dataset.timeoutInitiatorName = initiator.name;
    cell.dataset.timeoutInitiatorId = initiator.id;
    cell.dataset.timeoutKeyAdded = "1";
    return true;
  }

  function addPendingKeys() {
    if (!showKeyAnimation) return;
    const stage = document.getElementById("stage");
    if (!stage) return;
    stage.querySelectorAll(".cell:not([data-timeout-key-added])").forEach(addKey);
  }

  function observe() {
    const stage = document.getElementById("stage");
    if (!stage) return requestAnimationFrame(observe);
    new MutationObserver(addPendingKeys).observe(stage, { childList: true, subtree: true });
    addPendingKeys();
    setInterval(addPendingKeys, 100);
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of initiators) if (value.expires < now) initiators.delete(key);
    }, 5000);
  }

  observe();
})();

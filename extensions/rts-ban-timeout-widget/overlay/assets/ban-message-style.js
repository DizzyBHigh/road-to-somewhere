(() => {
  const stage = document.getElementById("stage");
  if (!stage) return;

  let arrivalStyle = false;
  const root = document.documentElement;
  const vanScales = {
    "Large": "1",
    "Medium": "0.85",
    "Small": "0.70",
    "Extra Small": "0.60",
  };

  root.style.setProperty("--ban-van-scale", "1");

  // script.js exposes applyOverlaySettings as a global function. Wrap it so
  // the persisted Streamer.bot settings are available to this visual layer
  // without duplicating the websocket connection.
  const originalApplySettings = window.applyOverlaySettings;
  if (typeof originalApplySettings === "function") {
    window.applyOverlaySettings = (d) => {
      originalApplySettings(d);
      if (!d || typeof d !== "object") return;

      if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessageArrivalStyle")) {
        const value = d.banWidgetBanMessageArrivalStyle;
        arrivalStyle = value === true || String(value).toLowerCase() === "true";
      }

      if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanVanSize")) {
        root.style.setProperty("--ban-van-scale", vanScales[d.banWidgetBanVanSize] || "1");
      }
    };
  }

  function apply(scene) {
    if (!arrivalStyle || !scene || scene.dataset.banMessageStyleApplied === "1") return;
    scene.dataset.banMessageStyleApplied = "1";
    scene.classList.add("arrival-message-style");

    // Start the existing calibrated trail reveal immediately, in parallel
    // with the truck's calibrated arrival animation.
    const trail = scene.querySelector(".ban-trail");
    if (trail) trail.classList.add("revealing");
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.classList.contains("ban-scene")) apply(node);
        node.querySelectorAll?.(".ban-scene").forEach(apply);
      }
    }
  });

  observer.observe(stage, { childList: true, subtree: true });
})();

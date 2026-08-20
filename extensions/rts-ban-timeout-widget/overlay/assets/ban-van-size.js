(() => {
  const root = document.documentElement;
  const originalApplySettings = window.applyOverlaySettings;
  const vanScales = { "Large": 1, "Medium": 0.85, "Small": 0.70, "Extra Small": 0.60 };
  const messageScales = { "Large": 1, "Medium": 0.85, "Small": 0.70, "Extra Small": 0.60 };

  function applyVanSize(value) {
    const size = Object.prototype.hasOwnProperty.call(vanScales, value) ? value : "Large";
    root.dataset.banVanSize = size;
    root.style.setProperty("--ban-van-scale", String(vanScales[size]));
    updateVerticalPositions();
  }

  function applyMessageSize(value) {
    const size = Object.prototype.hasOwnProperty.call(messageScales, value) ? value : "Large";
    root.dataset.banMessageSize = size;
    root.style.setProperty("--ban-message-scale", String(messageScales[size]));
    updateVerticalPositions();
  }

  function clampPercent(value) {
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
  }

  function updateVerticalPositions() {
    const vanPosition = clampPercent(Number(root.dataset.banVanPosition ?? 50));
    const messagePosition = clampPercent(Number(root.dataset.banMessagePosition ?? 50));
    const vanScale = Number(root.style.getPropertyValue("--ban-van-scale")) || 1;
    const messageScale = Number(root.style.getPropertyValue("--ban-message-scale")) || 1;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    // Position the van's transformed visual box from top (0) to bottom (100).
    const vanHeight = 320 * vanScale;
    const vanTop = (viewportHeight - vanHeight) * (vanPosition / 100);

    // The skid trail is anchored to the van's untransformed bottom edge.
    // The truck uses transform-origin: left bottom, so its CSS bottom is
    // vanTop + 320px regardless of scale. The calibrated skid lines sit
    // 279px below the truck's CSS top and therefore stay aligned at every size.
    const trailTop = vanTop + 279;

    // Position the message's own lane from top (0) to bottom (100).
    const messageHeight = 32 * messageScale;
    const messageTop = (viewportHeight - messageHeight) * (messagePosition / 100);

    root.style.setProperty("--ban-van-top", `${Math.round(vanTop)}px`);
    root.style.setProperty("--ban-trail-top", `${Math.round(trailTop)}px`);
    root.style.setProperty("--ban-message-top", `${Math.round(messageTop)}px`);
  }

  function applySettings(d) {
    if (!d || typeof d !== "object") return;
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanVanSize")) applyVanSize(String(d.banWidgetBanVanSize));
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanVanVerticalPosition")) {
      root.dataset.banVanPosition = clampPercent(Number(d.banWidgetBanVanVerticalPosition));
      updateVerticalPositions();
    }
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessageVisibility")) {
      root.dataset.banMessageVisibility = String(d.banWidgetBanMessageVisibility).toLowerCase() === "hidden" ? "Hidden" : "Visible";
    }
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessageSize")) applyMessageSize(String(d.banWidgetBanMessageSize));
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessageVerticalPosition")) {
      root.dataset.banMessagePosition = clampPercent(Number(d.banWidgetBanMessageVerticalPosition));
      updateVerticalPositions();
    }
  }

  if (typeof originalApplySettings === "function") {
    window.applyOverlaySettings = (d) => { originalApplySettings(d); applySettings(d); };
  }

  applyVanSize("Large");
  applyMessageSize("Large");
  root.dataset.banVanPosition = "50";
  root.dataset.banMessagePosition = "50";
  root.dataset.banMessageVisibility = "Visible";
  updateVerticalPositions();
  window.addEventListener("resize", updateVerticalPositions);
})();

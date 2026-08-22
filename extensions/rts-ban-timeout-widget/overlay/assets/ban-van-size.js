(() => {
  const root = document.documentElement;
  const banStage = document.getElementById("ban-stage");
  const originalApplySettings = window.applyOverlaySettings;
  const DESIGN_HEIGHT = 1080;
  const DESIGN_VAN_HEIGHT = 320;
  const TRAIL_HEIGHT = 92;
  const SKID_BOTTOM_OFFSET = 44;
  const MESSAGE_GAP = 0;
  const vanScales = { "Large": 1, "Medium": 0.85, "Small": 0.70, "Extra Small": 0.60 };
  const messageScales = { "Large": 1, "Medium": 0.85, "Small": 0.70, "Extra Small": 0.60 };
  const messagePositionModes = new Set(["Below Van", "Above Van", "Manual"]);

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

  function applyMessagePositionMode(value) {
    const mode = messagePositionModes.has(value) ? value : "Below Van";
    root.dataset.banMessagePositionMode = mode;
    updateVerticalPositions();
  }

  function clampPercent(value) {
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
  }

  function getMessageScale() {
    return Number(root.style.getPropertyValue("--ban-message-scale")) || 1;
  }

  function positionMessageLayer(scene) {
    if (!scene?.isConnected) return;
    const layer = scene.querySelector(".ban-message-layer");
    if (!layer) return;

    const mode = root.dataset.banMessagePositionMode || "Below Van";
    const vanPosition = clampPercent(Number(root.dataset.banVanPosition ?? 50));
    const vanScale = Number(root.style.getPropertyValue("--ban-van-scale")) || 1;
    const messageScale = getMessageScale();
    const messageHeight = 32 * messageScale;
    const vanHeight = DESIGN_VAN_HEIGHT * vanScale;
    const vanTop = (DESIGN_HEIGHT - vanHeight) * (vanPosition / 100);
    const trailTop = vanTop + 279;

    let messageTop;

    if (mode === "Above Van") {
      // The truck is scaled around its bottom edge. With the transparent
      // padding trimmed from the truck artwork, the scaled image bounds now
      // represent the visible truck bounds directly.
      const visualTruckTop = vanTop + DESIGN_VAN_HEIGHT - vanHeight;
      messageTop = visualTruckTop - messageHeight - MESSAGE_GAP;
    } else if (mode === "Manual") {
      messageTop = (DESIGN_HEIGHT - messageHeight) * (clampPercent(Number(root.dataset.banMessagePosition ?? 50)) / 100);
    } else {
      // The two skid marks occupy the upper 44px of the 92px trail container:
      // first mark at 22px, second at 40px. Align the TOP of the message
      // directly with the BOTTOM of the lower skid mark (44px).
      messageTop = trailTop + SKID_BOTTOM_OFFSET + MESSAGE_GAP;
    }

    const top = Math.round(messageTop);
    layer.style.setProperty("--ban-message-top", `${top}px`);
    layer.style.top = `${top}px`;
  }

  function updateVerticalPositions() {
    const vanPosition = clampPercent(Number(root.dataset.banVanPosition ?? 50));
    const vanScale = Number(root.style.getPropertyValue("--ban-van-scale")) || 1;
    const vanHeight = DESIGN_VAN_HEIGHT * vanScale;
    const vanTop = (DESIGN_HEIGHT - vanHeight) * (vanPosition / 100);
    const trailTop = vanTop + 279;

    root.style.setProperty("--ban-van-top", `${Math.round(vanTop)}px`);
    root.style.setProperty("--ban-trail-top", `${Math.round(trailTop)}px`);

    if (banStage) {
      banStage.querySelectorAll(".ban-scene").forEach(positionMessageLayer);
      requestAnimationFrame(() => banStage.querySelectorAll(".ban-scene").forEach(positionMessageLayer));
      requestAnimationFrame(() => requestAnimationFrame(() => banStage.querySelectorAll(".ban-scene").forEach(positionMessageLayer)));
    }
  }

  function applySettings(d) {
    if (!d || typeof d !== "object") return;
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanVanSize")) applyVanSize(String(d.banWidgetBanVanSize));
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanVerticalPosition")) {
      root.dataset.banVanPosition = clampPercent(Number(d.banWidgetBanVerticalPosition));
      updateVerticalPositions();
    }
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanVanVerticalPosition")) {
      root.dataset.banVanPosition = clampPercent(Number(d.banWidgetBanVanVerticalPosition));
      updateVerticalPositions();
    }
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessageVisibility")) {
      root.dataset.banMessageVisibility = String(d.banWidgetBanMessageVisibility).toLowerCase() === "hidden" ? "Hidden" : "Visible";
    }
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessageSize")) applyMessageSize(String(d.banWidgetBanMessageSize));
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessagePositionMode")) {
      applyMessagePositionMode(String(d.banWidgetBanMessagePositionMode));
    }
    if (Object.prototype.hasOwnProperty.call(d, "banWidgetBanMessageVerticalPosition")) {
      root.dataset.banMessagePosition = clampPercent(Number(d.banWidgetBanMessageVerticalPosition));
      updateVerticalPositions();
    }
  }

  if (typeof originalApplySettings === "function") {
    window.applyOverlaySettings = (d) => { originalApplySettings(d); applySettings(d); };
  }

  if (banStage) {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.classList.contains("ban-scene")) {
            requestAnimationFrame(() => positionMessageLayer(node));
            requestAnimationFrame(() => requestAnimationFrame(() => positionMessageLayer(node)));
          }
          node.querySelectorAll?.(".ban-scene").forEach(scene => {
            requestAnimationFrame(() => positionMessageLayer(scene));
            requestAnimationFrame(() => requestAnimationFrame(() => positionMessageLayer(scene)));
          });
          if (node.classList.contains("ban-message-layer")) {
            const scene = node.closest(".ban-scene");
            if (scene) requestAnimationFrame(() => positionMessageLayer(scene));
          }
        }
      }
    });
    observer.observe(banStage, { childList: true, subtree: true });
    window.addEventListener("resize", () => {
      requestAnimationFrame(() => banStage.querySelectorAll(".ban-scene").forEach(positionMessageLayer));
    }, { passive: true });
  }

  applyVanSize("Large");
  applyMessageSize("Large");
  root.dataset.banVanPosition = "50";
  root.dataset.banMessagePosition = "50";
  root.dataset.banMessagePositionMode = "Below Van";
  root.dataset.banMessageVisibility = "Visible";
  updateVerticalPositions();
})();

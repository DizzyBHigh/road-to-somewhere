// Play the same sound used when the Ban truck drives away when the truck arrives.
// Keep this separate from the Ban event logic so the working WebSocket/event flow is untouched.
(() => {
  const banStage = document.getElementById("ban-stage");
  if (!banStage) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (!node.classList.contains("ban-scene")) continue;
        if (typeof window.siren === "function") window.siren();
        return;
      }
    }
  });

  observer.observe(banStage, { childList: true });
})();

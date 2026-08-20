// Play the same sound used when the Ban truck drives away when the truck arrives.
// Keep this separate from the Ban event logic so the working WebSocket/event flow is untouched.
(() => {
  const stage = document.getElementById("stage");
  if (!stage) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (!node.classList.contains("ban-scene")) continue;

        // `siren()` is the existing departure sound. Play that same sound
        // when the truck's arrival animation begins.
        if (typeof window.siren === "function") window.siren();
        return;
      }
    }
  });

  observer.observe(stage, { childList: true });
})();

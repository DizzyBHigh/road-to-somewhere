(() => {
  const stage = document.getElementById("ban-stage");
  if (!stage) return;

  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;

  function update() {
    const width = window.innerWidth || DESIGN_WIDTH;
    const height = window.innerHeight || DESIGN_HEIGHT;
    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  update();
  window.addEventListener("resize", update, { passive: true });
})();

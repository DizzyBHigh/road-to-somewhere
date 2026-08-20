/* Ban truck engine audio. Uses Web Audio so no extra binary asset is required. */
(function () {
  let ctx = null;
  let master = null;
  let running = false;
  let stopTimer = null;

  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.055;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function startEngine(scene) {
    if (running || !scene.isConnected) return;
    const c = getContext();
    if (!c) return;

    running = true;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    const gain = c.createGain();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.exponentialRampToValueAtTime(88, now + 2.7);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(29, now);
    osc2.frequency.exponentialRampToValueAtTime(44, now + 2.7);

    lfo.type = "sine";
    lfo.frequency.value = 8;
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain).connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.9, now + 0.18);
    gain.gain.setValueAtTime(0.9, now + 2.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc2.start(now);
    lfo.start(now);
    osc.stop(now + 3.05);
    osc2.stop(now + 3.05);
    lfo.stop(now + 3.05);

    stopTimer = setTimeout(() => {
      running = false;
      stopTimer = null;
    }, 3200);
  }

  function scan() {
    document.querySelectorAll(".ban-scene.driving-off").forEach((scene) => {
      if (scene.dataset.engineSoundPlayed === "1") return;
      scene.dataset.engineSoundPlayed = "1";
      startEngine(scene);
    });
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
    childList: true,
  });
  scan();
})();

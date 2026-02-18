/**
 * Procedural audio engine for Tetris.
 * Uses the Web Audio API — no external sound files needed.
 */
const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;

  /* Drone state */
  let droneNodes = null;
  let droneGen = 0;

  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                     */
  /* ------------------------------------------------------------------ */
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    const saved = localStorage.getItem("tetrisMuted");
    muted = saved === "true";
    masterGain.gain.value = muted ? 0 : 1;
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function toggle() {
    muted = !muted;
    localStorage.setItem("tetrisMuted", String(muted));
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.05);
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */
  function playTone(freq, duration, type, volume, startTime) {
    if (!ctx) return;
    const t = startTime || ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  function playSweep(startFreq, endFreq, duration, type, volume) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(volume || 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, volume, filterFreq, filterType, filterQ) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType || "bandpass";
    filter.frequency.value = filterFreq || 1000;
    filter.Q.value = filterQ || 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
  }

  /* ------------------------------------------------------------------ */
  /*  Sound effects                                                      */
  /* ------------------------------------------------------------------ */

  /** Subtle click on left/right movement */
  function move() {
    if (!ctx) return;
    playTone(600, 0.015, "sine", 0.04);
  }

  /** Crisp tick on rotation */
  function rotate() {
    if (!ctx) return;
    playTone(900, 0.03, "triangle", 0.06);
    playNoise(0.01, 0.03, 4000, "highpass", 1);
  }

  /** Quick click per row during soft drop */
  function softDrop() {
    if (!ctx) return;
    playTone(400, 0.012, "sine", 0.04);
  }

  /** Punchy impact on hard drop */
  function hardDrop() {
    if (!ctx) return;
    playSweep(300, 60, 0.12, "sine", 0.2);
    playNoise(0.08, 0.15, 200, "bandpass", 2);
    if (navigator.vibrate) navigator.vibrate([60, 30, 100]);
  }

  /** Solid click when piece locks */
  function lock() {
    if (!ctx) return;
    playTone(250, 0.06, "sine", 0.1);
    playTone(500, 0.06, "sine", 0.06);
    playNoise(0.04, 0.05, 1000, "bandpass", 1);
    if (navigator.vibrate) navigator.vibrate(30);
  }

  /** Rising chime on line clear — intensity scales with count */
  function lineClear(count) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const n = Math.min(count, 4);
    const spacing = n === 4 ? 0.07 : n === 3 ? 0.08 : 0.1;
    for (let i = 0; i < n; i++) {
      playTone(notes[i], 0.25, "triangle", 0.15, now + i * spacing);
    }
    if (n === 4) {
      // Tetris shimmer
      playTone(2093, 0.4, "sine", 0.06, now + 0.28);
    }
    const patterns = [
      [50],
      [40, 20, 60],
      [40, 15, 40, 15, 80],
      [60, 20, 60, 20, 60, 20, 150],
    ];
    if (navigator.vibrate) navigator.vibrate(patterns[n - 1]);
  }

  /** Ascending ping for combos */
  function combo(count) {
    if (!ctx) return;
    const freq = Math.min(440 + count * 80, 1240);
    playTone(freq, 0.1, "triangle", 0.08);
  }

  /** Descending doom on game over */
  function gameOver() {
    if (!ctx) return;
    playSweep(500, 60, 1.2, "sawtooth", 0.16);
    playSweep(200, 30, 1.0, "sine", 0.13);
    if (navigator.vibrate) navigator.vibrate([200, 50, 200, 50, 300]);
  }

  /** Whoosh on hold swap */
  function hold() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  /** Level up celebration */
  function levelUp() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      playTone(freq, 0.3, "sine", 0.1, now + i * 0.08);
    });
    if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 120]);
  }

  /* ------------------------------------------------------------------ */
  /*  Ambient drone                                                      */
  /* ------------------------------------------------------------------ */
  function startDrone() {
    if (!ctx) return;
    stopDrone();
    const gen = ++droneGen;
    const now = ctx.currentTime;

    const pad1 = ctx.createOscillator();
    pad1.type = "sine";
    pad1.frequency.value = 110; // A2
    const pad1Gain = ctx.createGain();
    pad1Gain.gain.setValueAtTime(0.001, now);
    pad1Gain.gain.linearRampToValueAtTime(0.03, now + 2);
    pad1.connect(pad1Gain);
    pad1Gain.connect(masterGain);
    pad1.start(now);

    const pad2 = ctx.createOscillator();
    pad2.type = "sine";
    pad2.frequency.value = 165; // E3
    const pad2Gain = ctx.createGain();
    pad2Gain.gain.setValueAtTime(0.001, now);
    pad2Gain.gain.linearRampToValueAtTime(0.015, now + 3);
    pad2.connect(pad2Gain);
    pad2Gain.connect(masterGain);
    pad2.start(now);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(pad1Gain.gain);
    lfo.start(now);

    droneNodes = { gen, pads: [pad1, pad2], gains: [pad1Gain, pad2Gain], lfo, lfoGain };
  }

  function stopDrone() {
    if (!droneNodes || !ctx) return;
    const gen = droneNodes.gen;
    const fadeTime = 1.0;
    const now = ctx.currentTime;
    droneNodes.gains.forEach((g) => {
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.001, now + fadeTime);
    });
    const nodes = droneNodes;
    droneNodes = null;
    setTimeout(() => {
      if (droneGen !== gen) return;
      try {
        nodes.pads.forEach((p) => p.stop());
        nodes.lfo.stop();
      } catch (_) {}
    }, (fadeTime + 0.2) * 1000);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */
  return {
    init,
    resume,
    toggle,
    isMuted,
    move,
    rotate,
    softDrop,
    hardDrop,
    lock,
    lineClear,
    combo,
    gameOver,
    hold,
    levelUp,
    startDrone,
    stopDrone,
  };
})();

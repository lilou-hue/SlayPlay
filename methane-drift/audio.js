/* ================================================================
   Methane Drift — Procedural Audio Engine (Web Audio API)
   ================================================================ */

const Audio = (() => {
  let ctx = null;
  let muted = false;
  let masterGain = null;
  let droneOsc = null;
  let droneFilter = null;
  let droneGain = null;
  let noiseOsc = null;
  let noiseGain = null;
  let droneStopId = 0; /* generation counter to prevent stale timeout races */

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      muted = localStorage.getItem('methaneDriftMuted') === 'true';
      masterGain.gain.value = muted ? 0 : 1;
    } catch (e) { /* Web Audio not available */ }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function toggle() {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
    try { localStorage.setItem('methaneDriftMuted', String(muted)); } catch (e) { /* */ }
    return muted;
  }

  function isMuted() { return muted; }

  function haptic(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) { /* haptic not available */ }
  }

  function playTone(freq, duration, type, volume) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  function playNoise(duration, volume, filterFreq) {
    if (!ctx || muted) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 400;
    source.connect(filter);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
  }

  /* --- Sound Effects --- */

  function pulse() {
    playTone(380, 0.08, 'sine', 0.10);
    setTimeout(() => playTone(480, 0.06, 'sine', 0.07), 20);
    haptic(15);
  }

  function score() {
    playTone(660, 0.10, 'sine', 0.12);
    setTimeout(() => playTone(880, 0.12, 'sine', 0.09), 60);
    haptic(10);
  }

  function crash() {
    playNoise(0.35, 0.25, 350);
    playTone(80, 0.4, 'sawtooth', 0.12);
    haptic([40, 30, 80]);
  }

  function atmosphereShift(label) {
    if (!ctx || muted) return;
    if (label === 'Buoyant') {
      playTone(330, 0.25, 'sine', 0.08);
      setTimeout(() => playTone(440, 0.2, 'sine', 0.06), 100);
      haptic(20);
    } else if (label === 'Dense') {
      playTone(180, 0.3, 'sine', 0.10);
      haptic([20, 10, 20]);
    } else {
      playTone(90, 0.4, 'sawtooth', 0.12);
      setTimeout(() => playTone(65, 0.35, 'sine', 0.08), 50);
      haptic([30, 15, 50]);
    }
  }

  function symbiosisActivate() {
    if (!ctx || muted) return;
    playNoise(0.15, 0.06, 2000);
    playTone(520, 0.3, 'sine', 0.08);
    setTimeout(() => playTone(660, 0.25, 'sine', 0.06), 80);
    setTimeout(() => playTone(780, 0.2, 'sine', 0.05), 160);
    haptic([15, 10, 15, 10, 25]);
  }

  function symbiosisEnd() {
    playNoise(0.2, 0.05, 800);
    haptic(12);
  }

  function nearMiss() {
    playTone(1200, 0.04, 'square', 0.05);
    haptic([8, 5, 8]);
  }

  function newHighScore() {
    if (!ctx || muted) return;
    playTone(523, 0.15, 'sine', 0.10);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.10), 120);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.10), 240);
    setTimeout(() => playTone(1047, 0.25, 'sine', 0.12), 360);
    haptic([20, 15, 20, 15, 40]);
  }

  function zoneChange() {
    if (!ctx || muted) return;
    playTone(220, 0.3, 'triangle', 0.08);
    setTimeout(() => playTone(330, 0.25, 'triangle', 0.07), 100);
    setTimeout(() => playTone(440, 0.3, 'triangle', 0.09), 200);
    haptic([15, 10, 15, 10, 30]);
  }

  /* --- Ambient Drone --- */

  function startDrone() {
    if (!ctx) return;
    /* Increment generation so any pending stopDrone timeout becomes stale */
    droneStopId++;
    /* Clean up any existing drone nodes before creating new ones */
    try {
      if (droneOsc) { droneOsc.stop(); droneOsc = null; }
      if (noiseOsc) { noiseOsc.stop(); noiseOsc = null; }
    } catch (e) { /* already stopped */ }
    droneGain = null;
    noiseGain = null;
    droneFilter = null;
    try {
      droneOsc = ctx.createOscillator();
      droneOsc.type = 'sawtooth';
      droneOsc.frequency.value = 55;
      droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 180;
      droneFilter.Q.value = 2;
      droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0, ctx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(masterGain);
      droneOsc.start();

      /* Wind noise layer */
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) {
        windData[i] = (Math.random() * 2 - 1) * 0.5;
      }
      noiseOsc = ctx.createBufferSource();
      noiseOsc.buffer = windBuf;
      noiseOsc.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 300;
      nf.Q.value = 0.5;
      noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 3);
      noiseOsc.connect(nf);
      nf.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseOsc.start();
    } catch (e) { /* failed to start drone */ }
  }

  function updateDrone(density) {
    if (!droneOsc || !ctx) return;
    const now = ctx.currentTime;
    const targetFreq = Math.max(30, 40 + (1.2 - density) * 40);
    droneOsc.frequency.setValueAtTime(droneOsc.frequency.value, now);
    droneOsc.frequency.linearRampToValueAtTime(targetFreq, now + 0.5);
    if (droneFilter) {
      const targetFilter = 120 + (1.2 - density) * 80;
      droneFilter.frequency.setValueAtTime(droneFilter.frequency.value, now);
      droneFilter.frequency.linearRampToValueAtTime(targetFilter, now + 0.5);
    }
  }

  function stopDrone() {
    try {
      if (droneGain && ctx) {
        droneGain.gain.setValueAtTime(droneGain.gain.value, ctx.currentTime);
        droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
      if (noiseGain && ctx) {
        noiseGain.gain.setValueAtTime(noiseGain.gain.value, ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
      /* Capture the current generation; only clean up if no new drone was started */
      const myId = droneStopId;
      const oldDrone = droneOsc;
      const oldNoise = noiseOsc;
      const oldDroneGain = droneGain;
      const oldNoiseGain = noiseGain;
      const oldFilter = droneFilter;
      setTimeout(() => {
        /* If startDrone was called in the meantime, myId !== droneStopId, so skip */
        if (myId !== droneStopId) return;
        try {
          if (oldDrone) { oldDrone.stop(); }
          if (oldNoise) { oldNoise.stop(); }
        } catch (e) { /* already stopped */ }
        if (droneOsc === oldDrone) droneOsc = null;
        if (noiseOsc === oldNoise) noiseOsc = null;
        if (droneGain === oldDroneGain) droneGain = null;
        if (noiseGain === oldNoiseGain) noiseGain = null;
        if (droneFilter === oldFilter) droneFilter = null;
      }, 600);
    } catch (e) { /* */ }
  }

  return {
    init, resume, toggle, isMuted,
    pulse, score, crash, atmosphereShift,
    symbiosisActivate, symbiosisEnd, nearMiss,
    newHighScore, zoneChange,
    startDrone, updateDrone, stopDrone,
  };
})();

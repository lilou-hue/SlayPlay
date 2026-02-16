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

  /* --- Music System State --- */
  let musicPlaying = false;
  let musicBassGain = null;
  let musicPadGain = null;
  let musicMelodyGain = null;
  let musicPercGain = null;
  let musicBassOscs = [];
  let musicPadOscs = [];
  let musicMelodyTimeouts = [];
  let musicPercInterval = null;
  let musicBpm = 100;
  let musicCurrentZone = 1;
  let musicCurrentDensity = 'Buoyant';
  let musicCurrentCombo = 0;
  let musicCurrentScrollSpeed = 195;
  let musicBassIndex = 0;
  let musicBassInterval = null;
  let musicMelodyInterval = null;
  let musicMelodyBar = 0;

  /* --- Chord / Scale Definitions --- */
  /* Bass notes by zone group (frequencies in Hz) */
  /* Zones 1-2: C major (C2, E2, G2) */
  /* Zone 3: A minor (A1, C2, E2) */
  /* Zones 4-5: Diminished (B1, D2, F2) */
  const bassChords = {
    major:      [65.41, 82.41, 98.00],       /* C2, E2, G2 */
    minor:      [55.00, 65.41, 82.41],        /* A1, C2, E2 */
    diminished: [61.74, 73.42, 87.31],        /* B1, D2, F2 */
  };

  /* Pad chord tones (one octave higher for warmth) */
  const padChords = {
    major7th:    [261.63, 329.63, 392.00, 493.88],  /* Cmaj7: C4, E4, G4, B4 */
    minor:       [220.00, 261.63, 329.63],           /* Am: A3, C4, E4 */
    diminished:  [246.94, 293.66, 349.23],           /* Bdim: B3, D4, F4 */
  };

  /* Pentatonic scale for melody (C pentatonic: C5, D5, E5, G5, A5, C6, D6, E6) */
  const pentatonicScale = [523.25, 587.33, 659.26, 783.99, 880.00, 1046.50, 1174.66, 1318.51];

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

  /* ================================================================
     Adaptive Procedural Music System
     ================================================================ */

  function getChordForZone(zone) {
    if (zone <= 2) return 'major';
    if (zone === 3) return 'minor';
    return 'diminished';
  }

  function getDensityLabel(density) {
    /* density param from updateMusic can be a string label or numeric */
    if (typeof density === 'string') return density;
    if (density <= 0.6) return 'Buoyant';
    if (density <= 0.9) return 'Dense';
    return 'Crushing';
  }

  function bpmFromScrollSpeed(scrollSpeed) {
    /* scrollSpeed 195→340 maps to bpm 100→140 */
    const clamped = Math.max(195, Math.min(340, scrollSpeed));
    return 100 + ((clamped - 195) / (340 - 195)) * 40;
  }

  function beatDuration(bpm) {
    return 60 / bpm;
  }

  /* --- Bass Layer --- */

  function musicStartBass() {
    if (!ctx || !musicPlaying) return;
    try {
      musicBassGain = ctx.createGain();
      musicBassGain.gain.setValueAtTime(0, ctx.currentTime);
      musicBassGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1);
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 200;
      bassFilter.Q.value = 1;
      musicBassGain.connect(bassFilter);
      bassFilter.connect(masterGain);
      musicBassIndex = 0;
      musicBassStep();
    } catch (e) { /* failed to start bass layer */ }
  }

  function musicBassStep() {
    if (!ctx || !musicPlaying || !musicBassGain) return;
    try {
      const chordKey = getChordForZone(musicCurrentZone);
      const notes = bassChords[chordKey];
      const noteFreq = notes[musicBassIndex % notes.length];
      musicBassIndex++;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = noteFreq;
      const noteGain = ctx.createGain();
      const dur = beatDuration(musicBpm);
      noteGain.gain.setValueAtTime(0.05, ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur * 0.9);
      osc.connect(noteGain);
      noteGain.connect(musicBassGain);
      osc.start();
      osc.stop(ctx.currentTime + dur);

      musicBassInterval = setTimeout(() => musicBassStep(), dur * 1000);
    } catch (e) { /* bass step error */ }
  }

  function musicStopBass() {
    if (musicBassInterval) { clearTimeout(musicBassInterval); musicBassInterval = null; }
    if (musicBassGain && ctx) {
      try {
        musicBassGain.gain.setValueAtTime(musicBassGain.gain.value, ctx.currentTime);
        musicBassGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      } catch (e) { /* */ }
    }
    setTimeout(() => {
      try { musicBassGain.disconnect(); } catch (e) { /* */ }
      musicBassGain = null;
    }, 1200);
    musicBassOscs = [];
  }

  /* --- Pad Layer --- */

  function musicStartPad() {
    if (!ctx || !musicPlaying) return;
    try {
      musicPadGain = ctx.createGain();
      musicPadGain.gain.setValueAtTime(0, ctx.currentTime);
      musicPadGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 1);
      musicPadGain.connect(masterGain);
      musicBuildPadChord(getDensityLabel(musicCurrentDensity));
    } catch (e) { /* failed to start pad layer */ }
  }

  function musicBuildPadChord(densityLabel) {
    if (!ctx || !musicPadGain) return;
    /* Fade out old pad oscillators */
    musicPadOscs.forEach(function(osc) {
      try {
        osc.g.gain.setValueAtTime(osc.g.gain.value, ctx.currentTime);
        osc.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        osc.o.stop(ctx.currentTime + 1.1);
      } catch (e) { /* */ }
    });
    musicPadOscs = [];

    /* Determine chord tones */
    let chordTones;
    let detune = 0;
    if (densityLabel === 'Buoyant') {
      chordTones = padChords.major7th;
    } else if (densityLabel === 'Dense') {
      chordTones = padChords.minor;
    } else {
      chordTones = padChords.diminished;
      detune = 12; /* slight detune for dissonance */
    }

    /* Create new pad oscillators with slow attack */
    chordTones.forEach(function(freq) {
      try {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 1);
        osc.connect(g);
        g.connect(musicPadGain);
        osc.start();
        musicPadOscs.push({ o: osc, g: g });
      } catch (e) { /* */ }
    });

    /* For extra dissonance in Crushing, add a detuned copy */
    if (densityLabel === 'Crushing') {
      chordTones.forEach(function(freq) {
        try {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.detune.value = -15;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 1);
          osc.connect(g);
          g.connect(musicPadGain);
          osc.start();
          musicPadOscs.push({ o: osc, g: g });
        } catch (e) { /* */ }
      });
    }
  }

  function musicStopPad() {
    musicPadOscs.forEach(function(osc) {
      try {
        osc.g.gain.setValueAtTime(osc.g.gain.value, ctx.currentTime);
        osc.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        osc.o.stop(ctx.currentTime + 1.1);
      } catch (e) { /* */ }
    });
    musicPadOscs = [];
    if (musicPadGain && ctx) {
      try {
        musicPadGain.gain.setValueAtTime(musicPadGain.gain.value, ctx.currentTime);
        musicPadGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      } catch (e) { /* */ }
    }
    setTimeout(() => {
      try { musicPadGain.disconnect(); } catch (e) { /* */ }
      musicPadGain = null;
    }, 1200);
  }

  /* --- Melody Layer --- */

  function musicStartMelody() {
    if (!ctx || !musicPlaying) return;
    try {
      musicMelodyGain = ctx.createGain();
      musicMelodyGain.gain.setValueAtTime(0, ctx.currentTime);
      musicMelodyGain.connect(masterGain);
      musicMelodyBar = 0;
      musicMelodySchedule();
    } catch (e) { /* failed to start melody layer */ }
  }

  function musicGetPhraseLength(combo) {
    if (combo >= 10) return 8;
    if (combo >= 5) return 5;
    return 3;
  }

  function musicMelodySchedule() {
    if (!ctx || !musicPlaying || !musicMelodyGain) return;

    /* Melody only sounds when combo >= 3 */
    if (musicCurrentCombo < 3) {
      /* Silence the melody layer, check again in one beat */
      if (musicMelodyGain) {
        try {
          musicMelodyGain.gain.setValueAtTime(musicMelodyGain.gain.value, ctx.currentTime);
          musicMelodyGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        } catch (e) { /* */ }
      }
      musicMelodyInterval = setTimeout(() => musicMelodySchedule(), beatDuration(musicBpm) * 1000);
      return;
    }

    /* Set melody volume */
    try {
      musicMelodyGain.gain.setValueAtTime(musicMelodyGain.gain.value, ctx.currentTime);
      musicMelodyGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.2);
    } catch (e) { /* */ }

    /* Build a phrase of N notes spread across 2 bars (8 beats) */
    const phraseLen = musicGetPhraseLength(musicCurrentCombo);
    const totalBeats = 8;
    const dur = beatDuration(musicBpm);
    const stepMs = (dur * totalBeats / phraseLen) * 1000;

    /* Clear any pending melody note timeouts */
    musicMelodyTimeouts.forEach(function(t) { clearTimeout(t); });
    musicMelodyTimeouts = [];

    for (let i = 0; i < phraseLen; i++) {
      const tid = setTimeout(function() {
        if (!ctx || !musicPlaying || !musicMelodyGain) return;
        try {
          const noteIdx = (musicMelodyBar * 3 + i) % pentatonicScale.length;
          const freq = pentatonicScale[noteIdx];
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const g = ctx.createGain();
          const noteDur = dur * 0.8;
          g.gain.setValueAtTime(0.04, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noteDur);
          osc.connect(g);
          g.connect(musicMelodyGain);
          osc.start();
          osc.stop(ctx.currentTime + noteDur + 0.05);
        } catch (e) { /* melody note error */ }
      }, i * stepMs);
      musicMelodyTimeouts.push(tid);
    }

    musicMelodyBar++;
    /* Schedule next 2-bar phrase */
    musicMelodyInterval = setTimeout(() => musicMelodySchedule(), dur * totalBeats * 1000);
  }

  function musicStopMelody() {
    if (musicMelodyInterval) { clearTimeout(musicMelodyInterval); musicMelodyInterval = null; }
    musicMelodyTimeouts.forEach(function(t) { clearTimeout(t); });
    musicMelodyTimeouts = [];
    if (musicMelodyGain && ctx) {
      try {
        musicMelodyGain.gain.setValueAtTime(musicMelodyGain.gain.value, ctx.currentTime);
        musicMelodyGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      } catch (e) { /* */ }
    }
    setTimeout(() => {
      try { musicMelodyGain.disconnect(); } catch (e) { /* */ }
      musicMelodyGain = null;
    }, 1200);
  }

  /* --- Percussion Layer --- */

  function musicStartPerc() {
    if (!ctx || !musicPlaying) return;
    try {
      musicPercGain = ctx.createGain();
      musicPercGain.gain.setValueAtTime(0, ctx.currentTime);
      musicPercGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1);
      musicPercGain.connect(masterGain);
      musicPercStep();
    } catch (e) { /* failed to start perc layer */ }
  }

  function musicPercHit() {
    if (!ctx || !musicPercGain) return;
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800 + Math.random() * 400;
      filter.Q.value = 2;
      source.connect(filter);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.02, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      filter.connect(g);
      g.connect(musicPercGain);
      source.start();
    } catch (e) { /* perc hit error */ }
  }

  function musicPercStep() {
    if (!ctx || !musicPlaying || !musicPercGain) return;
    try {
      /* Scale perc volume with scroll speed intensity */
      const intensity = Math.max(0, Math.min(1, (musicCurrentScrollSpeed - 195) / (340 - 195)));
      musicPercGain.gain.setValueAtTime(musicPercGain.gain.value, ctx.currentTime);
      musicPercGain.gain.linearRampToValueAtTime(0.01 + intensity * 0.02, ctx.currentTime + 0.1);

      /* On-beat hit */
      musicPercHit();

      /* Off-beat hit when combo >= 5 */
      if (musicCurrentCombo >= 5) {
        const halfBeat = (beatDuration(musicBpm) * 1000) / 2;
        setTimeout(function() {
          if (musicPlaying) musicPercHit();
        }, halfBeat);
      }
    } catch (e) { /* */ }

    const dur = beatDuration(musicBpm);
    musicPercInterval = setTimeout(() => musicPercStep(), dur * 1000);
  }

  function musicStopPerc() {
    if (musicPercInterval) { clearTimeout(musicPercInterval); musicPercInterval = null; }
    if (musicPercGain && ctx) {
      try {
        musicPercGain.gain.setValueAtTime(musicPercGain.gain.value, ctx.currentTime);
        musicPercGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      } catch (e) { /* */ }
    }
    setTimeout(() => {
      try { musicPercGain.disconnect(); } catch (e) { /* */ }
      musicPercGain = null;
    }, 1200);
  }

  /* --- Music Public API --- */

  function startMusic() {
    if (!ctx || musicPlaying) return;
    try {
      musicPlaying = true;
      musicCurrentZone = 1;
      musicCurrentDensity = 'Buoyant';
      musicCurrentCombo = 0;
      musicCurrentScrollSpeed = 195;
      musicBpm = 100;
      musicBassIndex = 0;
      musicMelodyBar = 0;
      musicStartBass();
      musicStartPad();
      musicStartMelody();
      musicStartPerc();
    } catch (e) { /* failed to start music */ }
  }

  function stopMusic() {
    if (!musicPlaying) return;
    musicPlaying = false;
    try {
      musicStopBass();
      musicStopPad();
      musicStopMelody();
      musicStopPerc();
    } catch (e) { /* failed to stop music */ }
  }

  function updateMusic(zone, density, combo, scrollSpeed) {
    if (!ctx || !musicPlaying) return;
    try {
      /* Update BPM from scroll speed */
      musicCurrentScrollSpeed = scrollSpeed || 195;
      musicBpm = bpmFromScrollSpeed(musicCurrentScrollSpeed);
      musicCurrentCombo = combo || 0;

      /* Detect zone change — trigger chord crossfade */
      const newZone = zone || 1;
      if (newZone !== musicCurrentZone) {
        musicCurrentZone = newZone;
        /* Bass layer picks up new chord on next step automatically */
        /* Pad needs a crossfade rebuild */
        const densityLabel = getDensityLabel(density);
        musicBuildPadChord(densityLabel);
      }

      /* Detect density change — rebuild pad chord */
      const newDensity = getDensityLabel(density);
      if (newDensity !== musicCurrentDensity) {
        musicCurrentDensity = newDensity;
        musicBuildPadChord(musicCurrentDensity);
      }
    } catch (e) { /* updateMusic error */ }
  }

  /* ================================================================
     New Sound Effects
     ================================================================ */

  function comboMilestone(level) {
    if (!ctx || muted) return;
    try {
      /* Ascending arpeggio — pitch and duration scale with level */
      const baseFreqs = {
        3:  [440, 554, 659],
        5:  [523, 659, 784, 880],
        10: [523, 659, 784, 880, 1047],
      };
      const freqs = baseFreqs[level] || baseFreqs[3];
      const noteSpacing = level >= 10 ? 70 : (level >= 5 ? 90 : 110);
      const noteDur = level >= 10 ? 0.18 : (level >= 5 ? 0.15 : 0.12);
      const vol = Math.min(0.12, 0.07 + level * 0.005);
      freqs.forEach(function(freq, i) {
        setTimeout(function() {
          playTone(freq, noteDur, 'sine', vol);
        }, i * noteSpacing);
      });
      haptic([10, 8, 10, 8, 20]);
    } catch (e) { /* comboMilestone error */ }
  }

  function densitySurf() {
    if (!ctx || muted) return;
    try {
      /* Whoosh noise + rising tone */
      playNoise(0.25, 0.10, 1200);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      haptic([12, 8, 15]);
    } catch (e) { /* densitySurf error */ }
  }

  function bossAppear() {
    if (!ctx || muted) return;
    try {
      /* Deep rumbling bass sweep 40→80Hz */
      const bassOsc = ctx.createOscillator();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(40, ctx.currentTime);
      bassOsc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.5);
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 120;
      bassFilter.Q.value = 3;
      const bassG = ctx.createGain();
      bassG.gain.setValueAtTime(0.12, ctx.currentTime);
      bassG.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.8);
      bassG.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassG);
      bassG.connect(masterGain);
      bassOsc.start();
      bassOsc.stop(ctx.currentTime + 2);

      /* Dramatic chord (Cm: C3, Eb3, G3) */
      const chordFreqs = [130.81, 155.56, 196.00];
      chordFreqs.forEach(function(freq) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.5);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
        o.connect(f);
        f.connect(g);
        g.connect(masterGain);
        o.start(ctx.currentTime + 0.3);
        o.stop(ctx.currentTime + 2.2);
      });

      /* Sub-bass rumble noise */
      playNoise(1.5, 0.08, 100);
      haptic([50, 30, 80, 30, 50]);
    } catch (e) { /* bossAppear error */ }
  }

  function bossDefeat() {
    if (!ctx || muted) return;
    try {
      /* Triumphant ascending fanfare — 4 notes, major key (C5, E5, G5, C6) */
      const fanfare = [523.25, 659.26, 783.99, 1046.50];
      fanfare.forEach(function(freq, i) {
        setTimeout(function() {
          if (!ctx) return;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const g = ctx.createGain();
          const dur = i === 3 ? 0.4 : 0.18;
          g.gain.setValueAtTime(0.12, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + dur + 0.05);
          /* Add octave shimmer on last note */
          if (i === 3) {
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 2;
            const g2 = ctx.createGain();
            g2.gain.setValueAtTime(0.06, ctx.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc2.connect(g2);
            g2.connect(masterGain);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.55);
          }
        }, i * 150);
      });
      haptic([15, 10, 15, 10, 15, 10, 40]);
    } catch (e) { /* bossDefeat error */ }
  }

  let stormPullOsc = null;
  let stormPullGain = null;

  function stormPull() {
    if (!ctx || muted) return;
    try {
      /* If already playing, just make sure it stays audible */
      if (stormPullOsc) {
        if (stormPullGain) {
          stormPullGain.gain.setValueAtTime(stormPullGain.gain.value, ctx.currentTime);
          stormPullGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
        }
        return;
      }
      /* Low rumbling continuous tone */
      stormPullOsc = ctx.createOscillator();
      stormPullOsc.type = 'sawtooth';
      stormPullOsc.frequency.value = 50;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 100;
      filter.Q.value = 4;
      stormPullGain = ctx.createGain();
      stormPullGain.gain.setValueAtTime(0, ctx.currentTime);
      stormPullGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.5);
      stormPullOsc.connect(filter);
      filter.connect(stormPullGain);
      stormPullGain.connect(masterGain);
      stormPullOsc.start();

      /* Add subtle LFO wobble */
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 10;
      lfo.connect(lfoGain);
      lfoGain.connect(stormPullOsc.frequency);
      lfo.start();

      /* Store lfo ref for cleanup */
      stormPullOsc._lfo = lfo;
    } catch (e) { /* stormPull error */ }
  }

  /* Call stormPullStop() when the storm ends (not exposed separately — just call stormPull
     with no storm active and the tone will fade). We provide a way to stop it: */
  function stormPullStop() {
    if (!stormPullOsc || !ctx) return;
    try {
      if (stormPullGain) {
        stormPullGain.gain.setValueAtTime(stormPullGain.gain.value, ctx.currentTime);
        stormPullGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
      const oldOsc = stormPullOsc;
      const oldLfo = stormPullOsc._lfo;
      stormPullOsc = null;
      stormPullGain = null;
      setTimeout(function() {
        try { oldOsc.stop(); } catch (e) { /* */ }
        try { if (oldLfo) oldLfo.stop(); } catch (e) { /* */ }
      }, 600);
    } catch (e) { /* stormPullStop error */ }
  }

  function geyserWarn() {
    if (!ctx || muted) return;
    try {
      /* Rising pitch warning tone */
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 1);

      /* Add a second oscillator slightly detuned for urgency */
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(205, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1220, ctx.currentTime + 0.8);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.04, ctx.currentTime);
      g2.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.5);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.start();
      osc2.stop(ctx.currentTime + 1);

      haptic([10, 5, 10, 5, 20, 5, 30]);
    } catch (e) { /* geyserWarn error */ }
  }

  function comboBreak() {
    if (!ctx || muted) return;
    try {
      /* Descending tone */
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.10, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);

      /* Subtle glass shatter — high-frequency noise burst */
      const bufferSize = Math.floor(ctx.sampleRate * 0.15);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      filter.Q.value = 1;
      source.connect(filter);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.06, ctx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      filter.connect(ng);
      ng.connect(masterGain);
      source.start();

      haptic([20, 10, 30]);
    } catch (e) { /* comboBreak error */ }
  }

  return {
    init, resume, toggle, isMuted,
    pulse, score, crash, atmosphereShift,
    symbiosisActivate, symbiosisEnd, nearMiss,
    newHighScore, zoneChange,
    startDrone, updateDrone, stopDrone,
    startMusic, stopMusic, updateMusic,
    comboMilestone, densitySurf,
    bossAppear, bossDefeat,
    stormPull, stormPullStop,
    geyserWarn, comboBreak,
  };
})();

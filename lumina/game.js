/* ============================================================
   LUMINA — Deep Radiance
   A graphics-focused vertical-descent arcade game.
   Control a luminous crystal entity descending through a dark
   procedurally-generated cavern. Only your light reveals the world.
   ============================================================ */

(() => {
  "use strict";

  // roundRect polyfill for older browsers
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === "number") r = [r, r, r, r];
      this.moveTo(x + r[0], y);
      this.arcTo(x + w, y, x + w, y + h, r[1]);
      this.arcTo(x + w, y + h, x, y + h, r[2]);
      this.arcTo(x, y + h, x, y, r[3]);
      this.arcTo(x, y, x + w, y, r[0]);
    };
  }

  // ── Configuration ─────────────────────────────────────────
  const CFG = {
    W: 480,
    H: 720,

    // Player
    PLAYER_SPEED: 220,
    GRAVITY: 55,
    PULSE_FORCE: -130,
    PULSE_COOLDOWN: 1.0,
    PLAYER_R: 13,

    // Descent
    BASE_DESCENT: 80,
    MAX_DESCENT: 310,
    DESCENT_SCALE: 0.85,

    // Lighting
    LIGHT_MAX: 175,
    LIGHT_MIN: 48,
    LIGHT_DRAIN: 3.2,
    LIGHT_DRAIN_SCALE: 0.018,
    LIGHT_RESTORE: 25,

    // Cave
    CAVE_BASE_W: 360,
    CAVE_MIN_W: 175,
    CAVE_NARROW: 0.5,

    // Spawning
    SHARD_INTERVAL: 120,
    SHARD_SPREAD_SCALE: 0.4,
    SPIKE_INTERVAL: 170,
    SPIKE_TIGHTEN_SCALE: 0.6,
    SHADOW_INTERVAL: 380,
    SHADOW_TIGHTEN_SCALE: 1.2,
    STALACTITE_INTERVAL: 450,
    STALACTITE_START_SCORE: 8,

    // Zones
    ZONE_LEN: 40,
    ZONE_LERP: 10,
  };

  // ── Depth Zone Palettes ───────────────────────────────────
  const ZONES = [
    { name: "Sapphire Grotto",  i18nKey: "luSapphireGrotto",  crystal: [77,201,246],  ambient: [26,58,92],   wall: [42,74,106],  bg: [6,12,30]    },
    { name: "Amethyst Depths",  i18nKey: "luAmethystDepths",  crystal: [180,77,255],  ambient: [58,26,92],   wall: [74,42,106],  bg: [14,6,30]    },
    { name: "Emerald Abyss",    i18nKey: "luEmeraldAbyss",    crystal: [77,255,136],  ambient: [26,92,58],   wall: [42,106,74],  bg: [6,30,14]    },
    { name: "Molten Core",      i18nKey: "luMoltenCore",      crystal: [255,136,68],  ambient: [92,58,26],   wall: [106,74,42],  bg: [30,14,6]    },
    { name: "Void Heart",       i18nKey: "luVoidHeart",       crystal: [255,77,106],  ambient: [92,26,42],   wall: [106,42,58],  bg: [30,6,12]    },
  ];

  // ── State Enum ────────────────────────────────────────────
  const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, DYING: 3, GAMEOVER: 4 };

  // ── DOM Elements ──────────────────────────────────────────
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("bestScore");
  const muteBtn = document.getElementById("muteButton");
  const restartBtn = document.getElementById("restartButton");

  /* --- i18n setup --- */
  I18N.createSelector(document.querySelector('.game__header'));
  I18N.applyDOM();
  window.addEventListener('langchange', () => {
    I18N.applyDOM();
  });

  // ── Offscreen Canvases ────────────────────────────────────
  const sceneCanvas = document.createElement("canvas");
  sceneCanvas.width = CFG.W;
  sceneCanvas.height = CFG.H;
  const sctx = sceneCanvas.getContext("2d");

  const lightCanvas = document.createElement("canvas");
  lightCanvas.width = CFG.W;
  lightCanvas.height = CFG.H;
  const lctx = lightCanvas.getContext("2d");

  // ── Audio Context ─────────────────────────────────────────
  let audioCtx = null;
  let masterGain = null;
  let muted = false;
  let ambientOsc = null;
  let ambientGain = null;

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.35;
      masterGain.connect(audioCtx.destination);
    } catch (e) { /* no audio */ }
  }

  function resumeAudio() {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playTone(freq, dur, type, vol, sweep) {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(masterGain);
    o.start(t);
    o.stop(t + dur);
  }

  function playNoise(dur, vol) {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g).connect(masterGain);
    src.start(t);
  }

  function sfxPulse() {
    playTone(300, 0.22, "sine", 0.12, 800);
    playTone(600, 0.15, "triangle", 0.06, 1200);
  }

  function sfxCollect() {
    const base = 500 + zoneIndex() * 80;
    playTone(base, 0.1, "sine", 0.1);
    setTimeout(() => playTone(base * 1.25, 0.1, "sine", 0.08), 70);
    setTimeout(() => playTone(base * 1.5, 0.15, "sine", 0.06), 140);
  }

  function sfxHit() {
    playNoise(0.12, 0.18);
    playTone(400, 0.35, "sawtooth", 0.1, 80);
  }

  function sfxStalactite() {
    playTone(200, 0.15, "square", 0.08, 100);
    playNoise(0.08, 0.06);
  }

  function sfxZone() {
    const base = 400;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playTone(base * Math.pow(1.122, i), 0.18, "sine", 0.07), i * 120);
    }
  }

  function startAmbient() {
    if (!audioCtx || ambientOsc) return;
    ambientOsc = audioCtx.createOscillator();
    ambientGain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    ambientOsc.type = "sine";
    ambientOsc.frequency.value = 55;
    lfo.type = "sine";
    lfo.frequency.value = 0.4;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(ambientGain.gain);
    ambientGain.gain.value = 0.05;
    ambientOsc.connect(ambientGain).connect(masterGain);
    ambientOsc.start();
    lfo.start();
  }

  function haptic(pattern) {
    try { navigator.vibrate(pattern); } catch (e) { /* noop */ }
  }

  // ── Utility Functions ─────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }

  function lerpColor(c1, c2, t) {
    return [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t)),
    ];
  }

  function rgb(c, a) {
    if (a !== undefined) return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Cave Noise Function ───────────────────────────────────
  // Simple value noise with smooth interpolation for cave walls
  const NOISE_SIZE = 512;
  const noiseTable = new Float32Array(NOISE_SIZE);
  function seedNoise() {
    for (let i = 0; i < NOISE_SIZE; i++) noiseTable[i] = Math.random();
  }

  function noise1D(x) {
    const i = Math.floor(x) & (NOISE_SIZE - 1);
    const f = x - Math.floor(x);
    const t = f * f * (3 - 2 * f); // smoothstep
    return lerp(noiseTable[i], noiseTable[(i + 1) & (NOISE_SIZE - 1)], t);
  }

  function caveNoise(y) {
    // Base winding increases with depth — paths snake harder over time
    const windFactor = 1 + Math.min(score * 0.012, 0.8); // up to 1.8x amplitude
    return (noise1D(y * 0.012) * 0.5
         + noise1D(y * 0.028 + 100) * 0.3
         + noise1D(y * 0.06 + 200) * 0.2) * windFactor;
  }

  // Bottleneck choke points — periodic narrow pinch sections
  function isBottleneck(worldY) {
    // Every ~400 units of depth, create a 60-unit-tall choke
    const cycle = 400 - Math.min(score * 1.5, 150); // gets more frequent
    const phase = ((worldY % cycle) + cycle) % cycle;
    return phase < 60;
  }

  function bottleneckSqueeze(worldY) {
    const cycle = 400 - Math.min(score * 1.5, 150);
    const phase = ((worldY % cycle) + cycle) % cycle;
    if (phase >= 60) return 0;
    // Smooth pinch: sine curve peaks at center of bottleneck
    return Math.sin((phase / 60) * Math.PI) * (40 + Math.min(score * 0.6, 40));
  }

  // Dark zones — areas that drain light much faster
  function isDarkZone(worldY) {
    // Starts appearing after score 10, every ~500 units, 80 units tall
    if (score < 10) return false;
    const cycle = 500 - Math.min(score * 2, 200);
    const offset = 200; // offset from bottlenecks
    const phase = (((worldY + offset) % cycle) + cycle) % cycle;
    return phase < 80;
  }

  // ── Game State ────────────────────────────────────────────
  let state, score, bestScore, depth;
  let player, lightRadius, pulseCooldown, pulseAnim;
  let descentSpeed, cameraY;
  let caveSeed;
  let shards, spikes, shadows, stalactites;
  let particles;
  let shakeX, shakeY, shakeTimer;
  let dyingTimer, chromAb;
  let lastTime;
  let keys;
  let menuTime;
  let zoneAnnounceTmr, zoneAnnounceName;
  let prevZone;
  let timeDilation;
  let waterDrops, waterDropTimer;

  // ── Touch / Mobile State ───────────────────────────────────
  let touchMoveDir = 0;       // -1 left, 0 none, 1 right
  let touchActive = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isMobile = false;

  // Parallax layers
  let bgCrystals;

  // Detect mobile/touch devices
  function detectMobile() {
    isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 768;
  }
  detectMobile();
  window.addEventListener("resize", detectMobile);

  function loadBest() {
    try { return parseInt(localStorage.getItem("luminaBest")) || 0; } catch { return 0; }
  }

  function saveBest(v) {
    try { localStorage.setItem("luminaBest", v); } catch { /* noop */ }
  }

  function loadMute() {
    try { return localStorage.getItem("luminaMuted") === "1"; } catch { return false; }
  }

  function saveMute(v) {
    try { localStorage.setItem("luminaMuted", v ? "1" : "0"); } catch { /* noop */ }
  }

  function zoneIndex() {
    return Math.min(Math.floor(score / CFG.ZONE_LEN), ZONES.length - 1);
  }

  function zoneFrac() {
    const zi = zoneIndex();
    const progress = score - zi * CFG.ZONE_LEN;
    if (progress >= CFG.ZONE_LEN - CFG.ZONE_LERP && zi < ZONES.length - 1) {
      return (progress - (CFG.ZONE_LEN - CFG.ZONE_LERP)) / CFG.ZONE_LERP;
    }
    return 0;
  }

  function currentPalette() {
    const zi = zoneIndex();
    const frac = zoneFrac();
    if (frac > 0 && zi < ZONES.length - 1) {
      const a = ZONES[zi], b = ZONES[zi + 1];
      return {
        crystal: lerpColor(a.crystal, b.crystal, frac),
        ambient: lerpColor(a.ambient, b.ambient, frac),
        wall: lerpColor(a.wall, b.wall, frac),
        bg: lerpColor(a.bg, b.bg, frac),
        name: b.name,
      };
    }
    return ZONES[zi];
  }

  // ── Particle Pool ─────────────────────────────────────────
  const MAX_PARTICLES = 250;

  function createParticle(type, x, y, vx, vy, life, size, color, alpha) {
    return { type, x, y, vx, vy, life, maxLife: life, size, color, alpha: alpha || 1, active: true };
  }

  function spawnParticle(type, x, y, vx, vy, life, size, color, alpha) {
    if (particles.length >= MAX_PARTICLES) {
      // Recycle oldest
      const oldest = particles.findIndex(p => !p.active);
      if (oldest >= 0) {
        const p = particles[oldest];
        p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life; p.size = size; p.color = color;
        p.alpha = alpha || 1; p.active = true;
        return p;
      }
      // Replace first one
      const p = particles[0];
      p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.size = size; p.color = color;
      p.alpha = alpha || 1; p.active = true;
      return p;
    }
    const p = createParticle(type, x, y, vx, vy, life, size, color, alpha);
    particles.push(p);
    return p;
  }

  // ── Init / Reset ──────────────────────────────────────────
  function init() {
    bestScore = loadBest();
    muted = loadMute();
    muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
    bestEl.textContent = bestScore;
    resetGame();
    state = STATE.MENU;
    menuTime = 0;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function resetGame() {
    score = 0;
    depth = 0;
    player = { x: CFG.W / 2, y: CFG.H * 0.35, vx: 0, vy: 0 };
    lightRadius = CFG.LIGHT_MAX;
    pulseCooldown = 0;
    pulseAnim = 0;
    descentSpeed = CFG.BASE_DESCENT;
    cameraY = 0;
    shards = [];
    spikes = [];
    shadows = [];
    stalactites = [];
    particles = [];
    lastShardY = 0;
    lastSpikeY = 0;
    lastShadowY = 0;
    lastStalactiteY = 0;
    shakeX = 0; shakeY = 0; shakeTimer = 0;
    dyingTimer = 0;
    chromAb = 0;
    zoneAnnounceTmr = 0;
    zoneAnnounceName = "";
    prevZone = 0;
    timeDilation = 1;
    waterDrops = [];
    waterDropTimer = 0;
    seedNoise();
    generateBgCrystals();
    scoreEl.textContent = "0";

    // Pre-populate some objects ahead
    generateAhead(CFG.H * 2);
  }

  function generateBgCrystals() {
    bgCrystals = [];
    for (let i = 0; i < 30; i++) {
      bgCrystals.push({
        x: rand(0, CFG.W),
        yOff: rand(0, CFG.H * 3),
        size: rand(8, 30),
        angle: rand(-0.5, 0.5),
        layer: randInt(0, 2), // 0=far, 1=mid, 2=near
        alpha: rand(0.05, 0.2),
      });
    }
  }

  // ── Procedural Generation ─────────────────────────────────
  let lastShardY = 0, lastSpikeY = 0, lastShadowY = 0, lastStalactiteY = 0;

  function caveWalls(worldY) {
    const baseCaveWidth = Math.max(CFG.CAVE_MIN_W, CFG.CAVE_BASE_W - score * CFG.CAVE_NARROW);
    // Apply bottleneck squeeze
    const squeeze = bottleneckSqueeze(worldY);
    const caveWidth = Math.max(CFG.CAVE_MIN_W * 0.65, baseCaveWidth - squeeze);
    const centerX = CFG.W / 2;
    const offset = (caveNoise(worldY) - 0.5) * (CFG.W - caveWidth) * 0.6;
    const half = caveWidth / 2;
    return {
      left: centerX + offset - half,
      right: centerX + offset + half,
    };
  }

  function generateAhead(generateToY) {
    const worldBottom = cameraY + generateToY;
    const difficultyMult = Math.min(score / 80, 1); // 0-1 over 80 score

    // Shards (spread further apart at higher scores)
    while (lastShardY < worldBottom) {
      const shardSpacing = CFG.SHARD_INTERVAL + score * CFG.SHARD_SPREAD_SCALE;
      lastShardY += shardSpacing + rand(-20, 20);
      const walls = caveWalls(lastShardY);
      const sx = rand(walls.left + 30, walls.right - 30);
      shards.push({ x: sx, y: lastShardY, collected: false, bobPhase: rand(0, Math.PI * 2), rot: 0 });
    }

    // Spikes (spawn closer together, some oscillate at higher scores)
    while (lastSpikeY < worldBottom) {
      const spikeSpacing = Math.max(80, CFG.SPIKE_INTERVAL - score * CFG.SPIKE_TIGHTEN_SCALE);
      lastSpikeY += spikeSpacing + rand(-30, 30);
      const walls = caveWalls(lastSpikeY);
      const caveWidth = walls.right - walls.left;

      // Spike gate: paired spikes from both walls with a gap (after score 8)
      const isGate = difficultyMult > 0.1 && Math.random() < 0.15 + difficultyMult * 0.2;

      if (isGate) {
        // Gap is 35-55% of cave width, positioned randomly
        const gapFrac = rand(0.30, 0.50) - difficultyMult * 0.08;
        const gapWidth = caveWidth * gapFrac;
        const gapCenter = rand(walls.left + gapWidth * 0.6, walls.right - gapWidth * 0.6);

        // Left spike reaching toward gap
        const leftLen = (gapCenter - gapWidth / 2) - walls.left;
        if (leftLen > 15) {
          const leftAng = rand(-0.15, 0.15);
          const oscillates = difficultyMult > 0.5 && Math.random() < 0.3;
          spikes.push({
            x: walls.left, y: lastSpikeY, length: leftLen, angle: leftAng, side: "left",
            tipX: walls.left + Math.cos(leftAng) * leftLen,
            tipY: lastSpikeY + Math.sin(leftAng) * leftLen,
            oscillates, oscPhase: rand(0, Math.PI * 2),
            oscSpeed: rand(1.5, 2.5), oscAmp: rand(0.15, 0.35), baseAngle: leftAng,
          });
        }

        // Right spike reaching toward gap
        const rightLen = walls.right - (gapCenter + gapWidth / 2);
        if (rightLen > 15) {
          const rightAng = Math.PI + rand(-0.15, 0.15);
          const oscillates = difficultyMult > 0.5 && Math.random() < 0.3;
          spikes.push({
            x: walls.right, y: lastSpikeY, length: rightLen, angle: rightAng, side: "right",
            tipX: walls.right + Math.cos(rightAng) * rightLen,
            tipY: lastSpikeY + Math.sin(rightAng) * rightLen,
            oscillates, oscPhase: rand(0, Math.PI * 2),
            oscSpeed: rand(1.5, 2.5), oscAmp: rand(0.15, 0.35), baseAngle: rightAng,
          });
        }
      } else {
        // Normal single spike
        const side = Math.random() < 0.5 ? "left" : "right";
        const baseX = side === "left" ? walls.left : walls.right;
        const len = rand(25, 55 + difficultyMult * 20);
        const ang = side === "left" ? rand(-0.3, 0.5) : rand(Math.PI - 0.5, Math.PI + 0.3);
        const oscillates = difficultyMult > 0.3 && Math.random() < difficultyMult * 0.4;
        spikes.push({
          x: baseX, y: lastSpikeY, length: len, angle: ang, side,
          tipX: baseX + Math.cos(ang) * len,
          tipY: lastSpikeY + Math.sin(ang) * len,
          oscillates, oscPhase: rand(0, Math.PI * 2),
          oscSpeed: rand(1.5, 3.0), oscAmp: rand(0.3, 0.6), baseAngle: ang,
        });
      }
    }

    // Shadow creatures (spawn more frequently, faster at higher scores)
    while (lastShadowY < worldBottom) {
      const shadowSpacing = Math.max(200, CFG.SHADOW_INTERVAL - score * CFG.SHADOW_TIGHTEN_SCALE);
      lastShadowY += shadowSpacing + rand(-60, 60);
      const walls = caveWalls(lastShadowY);
      const speedBonus = difficultyMult * 40;
      shadows.push({
        x: rand(walls.left + 40, walls.right - 40),
        y: lastShadowY,
        vx: rand(20 + speedBonus, 50 + speedBonus) * (Math.random() < 0.5 ? -1 : 1),
        r: rand(16, 24 + difficultyMult * 6),
        eyePhase: rand(0, Math.PI * 2),
      });
    }

    // Stalactites (falling rocks, start after score threshold)
    if (score >= CFG.STALACTITE_START_SCORE) {
      while (lastStalactiteY < worldBottom) {
        const stalSpacing = Math.max(300, CFG.STALACTITE_INTERVAL - score * 2);
        lastStalactiteY += stalSpacing + rand(-80, 80);
        const walls = caveWalls(lastStalactiteY);
        stalactites.push({
          x: rand(walls.left + 30, walls.right - 30),
          y: lastStalactiteY,
          vy: 0,
          falling: false,
          shaking: false,
          shakeTimer: 0,
          size: rand(12, 22),
          fallen: false,
        });
      }
    }
  }

  function cullBehind() {
    const cullY = cameraY - 100;
    shards = shards.filter(s => s.y > cullY);
    spikes = spikes.filter(s => s.y > cullY);
    shadows = shadows.filter(s => s.y > cullY);
    stalactites = stalactites.filter(s => s.y > cullY && !s.fallen);
  }

  // ── Input Handling ────────────────────────────────────────
  keys = {};

  document.addEventListener("keydown", (e) => {
    keys[e.code] = true;

    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" ||
        e.code === "ArrowLeft" || e.code === "ArrowRight") {
      e.preventDefault();
    }

    if (e.code === "Space") handleAction();
    if (e.code === "Escape") handlePause();
  });

  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  // ── Mobile Touch Controls ──────────────────────────────────
  // Touch left third = move left, right third = move right, center = pulse
  // Hold for movement, quick tap for pulse

  function getTouchZone(clientX) {
    const rect = canvas.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    if (relX < 0.33) return "left";
    if (relX > 0.67) return "right";
    return "center";
  }

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    initAudio();
    resumeAudio();

    if (state === STATE.MENU || state === STATE.GAMEOVER) {
      handleAction();
      return;
    }

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = performance.now();
    touchActive = true;

    const zone = getTouchZone(touch.clientX);
    if (zone === "left") {
      touchMoveDir = -1;
    } else if (zone === "right") {
      touchMoveDir = 1;
    } else {
      touchMoveDir = 0;
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!touchActive || state !== STATE.PLAYING) return;

    const touch = e.touches[0];
    const zone = getTouchZone(touch.clientX);
    if (zone === "left") {
      touchMoveDir = -1;
    } else if (zone === "right") {
      touchMoveDir = 1;
    } else {
      touchMoveDir = 0;
    }
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const elapsed = performance.now() - touchStartTime;

    // Quick tap in center zone = pulse
    if (elapsed < 250 && state === STATE.PLAYING) {
      const zone = getTouchZone(touchStartX);
      if (zone === "center") {
        doPulse();
      }
    }

    touchMoveDir = 0;
    touchActive = false;

    // If there are remaining touches, update direction
    if (e.touches.length > 0) {
      touchActive = true;
      const touch = e.touches[0];
      const zone = getTouchZone(touch.clientX);
      if (zone === "left") touchMoveDir = -1;
      else if (zone === "right") touchMoveDir = 1;
      else touchMoveDir = 0;
    }
  }, { passive: false });

  // Non-touch pointer for desktop
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return; // Handled by touch events
    e.preventDefault();
    initAudio();
    resumeAudio();
    handleAction();
  });

  restartBtn.addEventListener("click", () => {
    initAudio();
    resumeAudio();
    resetGame();
    state = STATE.PLAYING;
    startAmbient();
  });

  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.35;
    saveMute(muted);
  });

  function handleAction() {
    initAudio();
    resumeAudio();

    if (state === STATE.MENU) {
      resetGame();
      state = STATE.PLAYING;
      startAmbient();
      return;
    }
    if (state === STATE.GAMEOVER) {
      resetGame();
      state = STATE.PLAYING;
      startAmbient();
      return;
    }
    if (state === STATE.PLAYING) {
      doPulse();
    }
  }

  function handlePause() {
    if (state === STATE.PLAYING) { state = STATE.PAUSED; return; }
    if (state === STATE.PAUSED) { state = STATE.PLAYING; lastTime = performance.now(); }
  }

  function doPulse() {
    if (pulseCooldown > 0) return;
    if (lightRadius < CFG.LIGHT_MIN + 10) return; // Not enough light

    player.vy += CFG.PULSE_FORCE;
    pulseCooldown = CFG.PULSE_COOLDOWN;
    pulseAnim = 1.0;
    lightRadius = Math.min(CFG.LIGHT_MAX, lightRadius + 15);
    timeDilation = 0.3;

    // Pulse nova particles
    const pal = currentPalette();
    for (let i = 0; i < 35; i++) {
      const a = (Math.PI * 2 * i) / 35 + rand(-0.15, 0.15);
      const spd = rand(80, 220);
      spawnParticle("nova", player.x, player.y,
        Math.cos(a) * spd, Math.sin(a) * spd,
        rand(0.3, 0.6), rand(2, 5),
        [255, 255, Math.round(rand(180, 255))], 0.9);
    }

    sfxPulse();
    haptic([50, 30, 80]);
  }

  // ── Update ────────────────────────────────────────────────
  function update(dt) {
    if (state === STATE.MENU) {
      menuTime += dt;
      // Ambient particles for menu
      if (Math.random() < dt * 5) {
        spawnParticle("dust", rand(0, CFG.W), rand(0, CFG.H),
          rand(-8, 8), rand(-15, -5), rand(3, 6), rand(1, 3),
          [120, 160, 255], rand(0.1, 0.3));
      }
      updateParticles(dt);
      return;
    }

    if (state === STATE.PAUSED) return;

    if (state === STATE.DYING) {
      dyingTimer -= dt;
      chromAb = Math.max(0, chromAb - dt * 8);
      shakeTimer = dyingTimer;
      updateParticles(dt * 0.3);
      if (dyingTimer <= 0) {
        state = STATE.GAMEOVER;
        if (score > bestScore) {
          bestScore = score;
          saveBest(bestScore);
          bestEl.textContent = bestScore;
        }
      }
      return;
    }

    if (state === STATE.GAMEOVER) return;

    // ─ Time dilation recovery ─
    timeDilation = Math.min(1, timeDilation + dt * 3);
    const adt = dt * timeDilation;

    // ─ Player movement ─
    let moveX = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) moveX = -1;
    if (keys["ArrowRight"] || keys["KeyD"]) moveX = 1;
    // Touch overrides keyboard if active
    if (touchActive && touchMoveDir !== 0) moveX = touchMoveDir;

    player.vx = moveX * CFG.PLAYER_SPEED;
    player.vy += CFG.GRAVITY * adt;
    player.vy = clamp(player.vy, -300, 300);

    player.x += player.vx * adt;
    player.y += player.vy * adt;

    // ─ Descent ─
    descentSpeed = Math.min(CFG.MAX_DESCENT, CFG.BASE_DESCENT + score * CFG.DESCENT_SCALE);
    cameraY += descentSpeed * adt;
    depth += descentSpeed * adt;

    // Keep player on screen vertically
    const screenY = player.y - cameraY;
    if (screenY < CFG.H * 0.15) {
      player.y = cameraY + CFG.H * 0.15;
      player.vy = Math.max(player.vy, 0);
    }
    if (screenY > CFG.H * 0.85) {
      player.y = cameraY + CFG.H * 0.85;
      player.vy = Math.min(player.vy, 0);
    }

    // ─ Cave wall collision ─
    const walls = caveWalls(player.y);
    let wallContact = false;
    if (player.x - CFG.PLAYER_R < walls.left) {
      player.x = walls.left + CFG.PLAYER_R;
      player.vx = 0;
      wallContact = true;
    }
    if (player.x + CFG.PLAYER_R > walls.right) {
      player.x = walls.right - CFG.PLAYER_R;
      player.vx = 0;
      wallContact = true;
    }
    // Scraping walls drains light (more in bottlenecks)
    if (wallContact) {
      const scrapeDrain = isBottleneck(player.y) ? 12 : 4;
      lightRadius = Math.max(CFG.LIGHT_MIN, lightRadius - scrapeDrain * adt);
    }

    // ─ Cooldowns ─
    pulseCooldown = Math.max(0, pulseCooldown - dt);
    pulseAnim = Math.max(0, pulseAnim - dt * 4);

    // ─ Light drain ─
    const baseDrain = CFG.LIGHT_DRAIN + score * CFG.LIGHT_DRAIN_SCALE;
    const darkMult = isDarkZone(player.y) ? 3.0 : 1.0;
    const drainRate = baseDrain * darkMult;
    lightRadius = Math.max(CFG.LIGHT_MIN, lightRadius - drainRate * adt);

    // ─ Zone check ─
    const zi = zoneIndex();
    if (zi !== prevZone && prevZone < zi) {
      zoneAnnounceTmr = 2.5;
      zoneAnnounceName = ZONES[zi].i18nKey;
      sfxZone();
      haptic([30, 20, 30, 20, 30, 20, 30]);
      prevZone = zi;
    }
    if (zoneAnnounceTmr > 0) zoneAnnounceTmr -= dt;

    // ─ Shard collection ─
    for (const s of shards) {
      if (s.collected) continue;
      const screenSY = s.y - cameraY;
      if (screenSY < -50 || screenSY > CFG.H + 50) continue;
      if (dist(player.x, player.y, s.x, s.y) < CFG.PLAYER_R + 10) {
        s.collected = true;
        score++;
        scoreEl.textContent = score;
        lightRadius = Math.min(CFG.LIGHT_MAX, lightRadius + CFG.LIGHT_RESTORE);

        // Collection burst particles
        const pal = currentPalette();
        for (let i = 0; i < 18; i++) {
          const a = (Math.PI * 2 * i) / 18;
          const spd = rand(40, 130);
          const hueShift = [
            clamp(pal.crystal[0] + randInt(-30, 30), 0, 255),
            clamp(pal.crystal[1] + randInt(-30, 30), 0, 255),
            clamp(pal.crystal[2] + randInt(-30, 30), 0, 255),
          ];
          spawnParticle("burst", s.x, s.y,
            Math.cos(a) * spd, Math.sin(a) * spd,
            rand(0.4, 0.8), rand(2, 5), hueShift, 1);
        }

        sfxCollect();
        haptic(25);
      }
    }

    // ─ Spike collision ─
    for (const sp of spikes) {
      const screenSY = sp.y - cameraY;
      if (screenSY < -80 || screenSY > CFG.H + 80) continue;
      // Check distance to spike line segment
      const d = distToSegment(player.x, player.y, sp.x, sp.y, sp.tipX, sp.tipY);
      if (d < CFG.PLAYER_R + 4) {
        startDeath();
        return;
      }
    }

    // ─ Shadow creature update & collision ─
    const aggroBoost = Math.min(score / 60, 1); // 0-1 over 60 score
    for (const sh of shadows) {
      const screenSY = sh.y - cameraY;
      if (screenSY < -100 || screenSY > CFG.H + 100) continue;

      const dToPlayer = dist(player.x, player.y, sh.x, sh.y);

      // AI: flee from strong light, approach in dim light (more aggressive over time)
      const fleeThreshold = 110 - aggroBoost * 25;    // harder to scare
      const chaseThreshold = 80 + aggroBoost * 20;     // chases earlier
      const chaseSpeed = 60 + aggroBoost * 50;
      const fleeSpeed = 80 - aggroBoost * 15;

      if (lightRadius > fleeThreshold && dToPlayer < lightRadius * 1.2) {
        const flee = (player.x < sh.x) ? 1 : -1;
        sh.vx = lerp(sh.vx, flee * fleeSpeed, adt * 2);
      } else if (lightRadius < chaseThreshold) {
        const chase = (player.x < sh.x) ? -1 : 1;
        sh.vx = lerp(sh.vx, chase * chaseSpeed, adt * (1.5 + aggroBoost));
      }

      // Vertical chase at high difficulty
      if (aggroBoost > 0.4 && lightRadius < chaseThreshold && dToPlayer < 200) {
        const chaseY = (player.y < sh.y) ? -1 : 1;
        sh.y += chaseY * chaseSpeed * 0.3 * adt;
      }

      sh.x += sh.vx * adt;
      sh.eyePhase += dt * 3;

      // Keep within cave
      const w = caveWalls(sh.y);
      if (sh.x < w.left + sh.r) { sh.x = w.left + sh.r; sh.vx = Math.abs(sh.vx); }
      if (sh.x > w.right - sh.r) { sh.x = w.right - sh.r; sh.vx = -Math.abs(sh.vx); }

      // Shadow wisp particles
      if (Math.random() < dt * 3) {
        spawnParticle("wisp", sh.x + rand(-sh.r, sh.r), sh.y + rand(-sh.r, sh.r),
          rand(-15, 15), rand(-20, -5), rand(0.6, 1.2), rand(3, 7),
          [40, 10, 50], 0.4);
      }

      // Collision
      if (dToPlayer < CFG.PLAYER_R + sh.r) {
        startDeath();
        return;
      }
    }

    // ─ Update oscillating spikes ─
    for (const sp of spikes) {
      if (!sp.oscillates) continue;
      sp.oscPhase += sp.oscSpeed * adt;
      const newAngle = sp.baseAngle + Math.sin(sp.oscPhase) * sp.oscAmp;
      sp.angle = newAngle;
      sp.tipX = sp.x + Math.cos(newAngle) * sp.length;
      sp.tipY = sp.y + Math.sin(newAngle) * sp.length;
    }

    // ─ Stalactite update & collision ─
    for (const st of stalactites) {
      const screenSY = st.y - cameraY;
      if (screenSY < -100 || screenSY > CFG.H + 150) continue;

      const dToPlayer = dist(player.x, player.y, st.x, st.y);

      // Start shaking when player is close horizontally
      if (!st.falling && !st.shaking && Math.abs(player.x - st.x) < 50 && player.y > st.y - 100 && player.y < st.y + 200) {
        st.shaking = true;
        st.shakeTimer = 0.6;
        sfxStalactite();
      }

      // Shake countdown then fall
      if (st.shaking && !st.falling) {
        st.shakeTimer -= dt;
        if (st.shakeTimer <= 0) {
          st.falling = true;
          st.shaking = false;
          st.vy = 0;
        }
      }

      // Falling physics
      if (st.falling) {
        st.vy += 350 * dt;
        st.y += st.vy * dt;
        if (st.y > cameraY + CFG.H + 100) {
          st.fallen = true;
          continue;
        }
      }

      // Collision
      if (dToPlayer < CFG.PLAYER_R + st.size * 0.5) {
        startDeath();
        return;
      }
    }

    // ─ Water drip system ─
    waterDropTimer += dt;
    if (waterDropTimer >= 2.0 && waterDrops.length < 8) {
      waterDropTimer = 0;
      // Spawn a drop at a random point along the visible cave ceiling
      const spawnWorldY = cameraY + rand(0, 30);
      const walls = caveWalls(spawnWorldY);
      const dropX = rand(walls.left + 15, walls.right - 15);
      waterDrops.push({ x: dropX, y: spawnWorldY, vy: 0 });
    }
    for (let i = waterDrops.length - 1; i >= 0; i--) {
      const drop = waterDrops[i];
      drop.vy += 200 * dt;
      drop.y += drop.vy * dt;
      const screenDY = drop.y - cameraY;
      // Check if drop hit bottom of screen or a cave wall
      const walls = caveWalls(drop.y);
      const hitWall = drop.x <= walls.left + 2 || drop.x >= walls.right - 2;
      if (screenDY >= CFG.H || hitWall) {
        // Spawn 2-3 tiny splash particles
        const splashCount = 2 + Math.floor(Math.random() * 2);
        const pal = currentPalette();
        for (let si = 0; si < splashCount; si++) {
          spawnParticle("burst", drop.x, drop.y,
            rand(-20, 20), rand(-30, -10),
            rand(0.2, 0.4), rand(1, 2),
            pal.crystal, 0.3);
        }
        waterDrops.splice(i, 1);
      }
    }

    // ─ Generate ahead & cull ─
    generateAhead(cameraY + CFG.H * 2.5);
    cullBehind();

    // ─ Ambient particles ─
    if (Math.random() < dt * 8) {
      const pal = currentPalette();
      spawnParticle("dust",
        rand(0, CFG.W), cameraY + rand(0, CFG.H),
        rand(-6, 6), rand(-12, 5),
        rand(3, 7), rand(1, 2.5),
        [pal.crystal[0], pal.crystal[1], pal.crystal[2]], rand(0.1, 0.25));
    }

    // ─ Player trail particles ─
    if (Math.random() < dt * 25) {
      const pal = currentPalette();
      spawnParticle("trail", player.x + rand(-5, 5), player.y + rand(3, 10),
        rand(-10, 10), rand(10, 30),
        rand(0.3, 0.7), rand(2, 5),
        pal.crystal, 0.6);
    }

    // ─ Crystal sparkle particles near shards ─
    for (const s of shards) {
      if (s.collected) continue;
      const sy = s.y - cameraY;
      if (sy < -20 || sy > CFG.H + 20) continue;
      if (Math.random() < dt * 2) {
        const pal = currentPalette();
        spawnParticle("sparkle", s.x + rand(-8, 8), s.y + rand(-8, 8),
          rand(-5, 5), rand(-5, 5),
          rand(0.4, 0.8), rand(1, 3),
          [255, 255, 255], rand(0.4, 0.9));
      }
    }

    // ─ Shake decay ─
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      const intensity = shakeTimer * 8;
      shakeX = rand(-intensity, intensity);
      shakeY = rand(-intensity, intensity);
    } else {
      shakeX = 0; shakeY = 0;
    }

    // ─ Update particles ─
    updateParticles(adt);
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        particles.splice(i, 1);
      }
    }
  }

  function startDeath() {
    state = STATE.DYING;
    dyingTimer = 0.5;
    chromAb = 4;
    shakeTimer = 0.5;

    // Shatter particles
    const pal = currentPalette();
    for (let i = 0; i < 50; i++) {
      const a = rand(0, Math.PI * 2);
      const spd = rand(50, 250);
      spawnParticle("shatter", player.x, player.y,
        Math.cos(a) * spd, Math.sin(a) * spd,
        rand(0.4, 1.0), rand(2, 7),
        [255, Math.round(rand(200, 255)), Math.round(rand(150, 255))], 1);
    }

    sfxHit();
    haptic([150, 50, 150, 50, 200]);
  }

  // Distance from point to line segment
  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return dist(px, py, ax, ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = clamp(t, 0, 1);
    return dist(px, py, ax + t * dx, ay + t * dy);
  }

  // ── Rendering ─────────────────────────────────────────────

  function draw() {
    const pal = currentPalette();

    // ─ Clear scene canvas ─
    sctx.fillStyle = rgb(pal.bg);
    sctx.fillRect(0, 0, CFG.W, CFG.H);

    // ─ Parallax background ─
    drawParallaxBg(sctx, pal);

    // ─ Cave walls ─
    drawCaveWalls(sctx, pal);

    // ─ Water drops ─
    drawWaterDrops(sctx, pal);

    // ─ Atmospheric fog bands ─
    drawFogBands(sctx, pal);

    // ─ Dark zones & bottleneck indicators ─
    drawCaveHazards(sctx, pal);

    // ─ Spikes ─
    drawSpikes(sctx, pal);

    // ─ Shards ─
    drawShards(sctx, pal);

    // ─ Shadow creatures ─
    drawShadows(sctx, pal);

    // ─ Stalactites ─
    drawStalactites(sctx, pal);

    // ─ Player ─
    if (state !== STATE.DYING || dyingTimer > 0.2) {
      drawPlayer(sctx, pal);
    }

    // ─ Particles ─
    drawParticles(sctx, pal);

    // ─ Build light map ─
    lctx.fillStyle = "#000";
    lctx.fillRect(0, 0, CFG.W, CFG.H);

    if (state === STATE.PLAYING || state === STATE.DYING || state === STATE.PAUSED) {
      // Player light
      const plScreenY = player.y - cameraY;
      const pulseExtra = pulseAnim * 80;
      const r = lightRadius + pulseExtra;

      const grad = lctx.createRadialGradient(
        player.x, plScreenY, 0,
        player.x, plScreenY, r
      );
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.3, "rgba(255,255,255,0.8)");
      grad.addColorStop(0.7, "rgba(255,255,255,0.3)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = grad;
      lctx.fillRect(player.x - r, plScreenY - r, r * 2, r * 2);

      // Shard lights
      for (const s of shards) {
        if (s.collected) continue;
        const sy = s.y - cameraY;
        if (sy < -50 || sy > CFG.H + 50) continue;
        const sr = 35;
        const sg = lctx.createRadialGradient(s.x, sy, 0, s.x, sy, sr);
        sg.addColorStop(0, "rgba(255,255,255,0.6)");
        sg.addColorStop(1, "rgba(255,255,255,0)");
        lctx.fillStyle = sg;
        lctx.fillRect(s.x - sr, sy - sr, sr * 2, sr * 2);
      }
    } else if (state === STATE.MENU) {
      // Full visibility for menu
      lctx.fillStyle = "rgba(255,255,255,0.6)";
      lctx.fillRect(0, 0, CFG.W, CFG.H);

      // Central glow
      const mg = lctx.createRadialGradient(CFG.W / 2, CFG.H * 0.4, 0, CFG.W / 2, CFG.H * 0.4, 200);
      mg.addColorStop(0, "rgba(255,255,255,1)");
      mg.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = mg;
      lctx.fillRect(0, 0, CFG.W, CFG.H);
    } else {
      // Game over: dim light
      lctx.fillStyle = "rgba(255,255,255,0.25)";
      lctx.fillRect(0, 0, CFG.W, CFG.H);

      const cg = lctx.createRadialGradient(CFG.W / 2, CFG.H * 0.4, 0, CFG.W / 2, CFG.H * 0.4, 150);
      cg.addColorStop(0, "rgba(255,255,255,0.6)");
      cg.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = cg;
      lctx.fillRect(0, 0, CFG.W, CFG.H);
    }

    // ─ Composite: scene masked by light ─
    ctx.clearRect(0, 0, CFG.W, CFG.H);
    ctx.save();

    // Apply screen shake
    if (shakeTimer > 0) {
      ctx.translate(shakeX, shakeY);
    }

    // Draw scene
    ctx.drawImage(sceneCanvas, 0, 0);

    // Mask with light map
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(lightCanvas, 0, 0);

    // ─ Bloom pass (additive) ─
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.12;
    ctx.drawImage(lightCanvas, 0, 0);
    ctx.globalAlpha = 0.06;
    ctx.drawImage(lightCanvas, -3, -3, CFG.W + 6, CFG.H + 6);
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = "source-over";

    // ─ Vignette ─
    drawVignette(ctx);

    // ─ Chromatic aberration (on death) ─
    if (chromAb > 0.1) {
      drawChromaticAberration(ctx);
    }

    ctx.restore();

    // ─ HUD overlays (drawn on top, not affected by lighting) ─
    if (state === STATE.MENU) drawMenu(ctx, pal);
    if (state === STATE.PAUSED) drawPaused(ctx);
    if (state === STATE.GAMEOVER) drawGameOver(ctx, pal);
    if (state === STATE.PLAYING && zoneAnnounceTmr > 0) drawZoneAnnounce(ctx, pal);
    if (state === STATE.PLAYING) drawLightMeter(ctx, pal);
    if (state === STATE.PLAYING && isMobile) drawTouchGuide(ctx, pal);
  }

  // ── Sub-Renderers ─────────────────────────────────────────

  function drawParallaxBg(c, pal) {
    const speeds = [0.15, 0.4, 0.7];
    for (const bc of bgCrystals) {
      const speed = speeds[bc.layer];
      const y = ((bc.yOff - cameraY * speed) % (CFG.H * 3) + CFG.H * 3) % (CFG.H * 3) - CFG.H * 0.5;
      const col = lerpColor(pal.bg, pal.wall, 0.3 + bc.layer * 0.2);
      c.save();
      c.translate(bc.x, y);
      c.rotate(bc.angle);
      c.globalAlpha = bc.alpha;
      drawCrystalShape(c, 0, 0, bc.size, col);
      c.globalAlpha = 1;
      c.restore();
    }
  }

  function drawCaveWalls(c, pal) {
    const step = 4;
    const topY = cameraY;

    // Left wall
    c.beginPath();
    c.moveTo(0, 0);
    for (let sy = 0; sy <= CFG.H; sy += step) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);
      c.lineTo(walls.left, sy);
    }
    c.lineTo(0, CFG.H);
    c.closePath();

    let wallGrad = c.createLinearGradient(0, 0, 80, 0);
    wallGrad.addColorStop(0, rgb(pal.wall));
    wallGrad.addColorStop(1, rgb(pal.wall, 0.4));
    c.fillStyle = wallGrad;
    c.fill();

    // Wall edge highlight
    c.beginPath();
    for (let sy = 0; sy <= CFG.H; sy += step) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);
      if (sy === 0) c.moveTo(walls.left, sy);
      else c.lineTo(walls.left, sy);
    }
    c.strokeStyle = rgb(pal.crystal, 0.15);
    c.lineWidth = 2;
    c.stroke();

    // Right wall
    c.beginPath();
    c.moveTo(CFG.W, 0);
    for (let sy = 0; sy <= CFG.H; sy += step) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);
      c.lineTo(walls.right, sy);
    }
    c.lineTo(CFG.W, CFG.H);
    c.closePath();

    wallGrad = c.createLinearGradient(CFG.W, 0, CFG.W - 80, 0);
    wallGrad.addColorStop(0, rgb(pal.wall));
    wallGrad.addColorStop(1, rgb(pal.wall, 0.4));
    c.fillStyle = wallGrad;
    c.fill();

    // Right edge highlight
    c.beginPath();
    for (let sy = 0; sy <= CFG.H; sy += step) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);
      if (sy === 0) c.moveTo(walls.right, sy);
      else c.lineTo(walls.right, sy);
    }
    c.strokeStyle = rgb(pal.crystal, 0.15);
    c.lineWidth = 2;
    c.stroke();

    // Mineral vein lines along walls
    c.strokeStyle = rgb(pal.crystal, 0.15);
    c.lineWidth = 1;
    for (let sy = 0; sy < CFG.H; sy += 30) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);
      const veinSeed = (Math.floor(worldY / 30) * 13) % 100;
      // Left wall veins
      if (veinSeed < 50) {
        c.beginPath();
        const vx = walls.left + 2 + (veinSeed % 12);
        c.moveTo(vx, sy);
        for (let v = 1; v <= 3; v++) {
          const wy = sy + v * 8;
          const wx = vx + Math.sin(worldY * 0.1 + v * 1.7) * 4;
          c.lineTo(wx, wy);
        }
        c.stroke();
      }
      // Right wall veins
      if (veinSeed > 40) {
        c.beginPath();
        const vx = walls.right - 2 - (veinSeed % 10);
        c.moveTo(vx, sy);
        for (let v = 1; v <= 3; v++) {
          const wy = sy + v * 8;
          const wx = vx + Math.sin(worldY * 0.13 + v * 2.1) * 4;
          c.lineTo(wx, wy);
        }
        c.stroke();
      }
    }

    // Wall texture bumps
    drawWallBumps(c, pal);
  }

  function drawWallBumps(c, pal) {
    const topY = cameraY;
    c.fillStyle = rgb(pal.wall, 0.5);
    for (let sy = 0; sy < CFG.H; sy += 25) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);
      // Left bump
      const bumpSeed = (Math.floor(worldY / 25) * 7) % 100;
      if (bumpSeed < 40) {
        const bh = 4 + (bumpSeed % 6);
        const bw = 6 + (bumpSeed % 8);
        c.beginPath();
        c.moveTo(walls.left, sy - bh);
        c.lineTo(walls.left + bw, sy);
        c.lineTo(walls.left, sy + bh);
        c.fill();
      }
      // Right bump
      if (bumpSeed > 50) {
        const bh = 4 + (bumpSeed % 5);
        const bw = 6 + (bumpSeed % 7);
        c.beginPath();
        c.moveTo(walls.right, sy - bh);
        c.lineTo(walls.right - bw, sy);
        c.lineTo(walls.right, sy + bh);
        c.fill();
      }
    }

    // Embedded crystal clusters at ~150px intervals along wall edges
    for (let sy = 0; sy < CFG.H; sy += 150) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);
      const clusterSeed = (Math.floor(worldY / 150) * 11) % 100;

      // Left wall cluster
      if (clusterSeed < 60) {
        const clusterCount = 2 + (clusterSeed % 2); // 2-3 crystals
        for (let ci = 0; ci < clusterCount; ci++) {
          const cSize = 4 + (clusterSeed + ci * 3) % 5; // size 4-8
          const cx = walls.left + 2 + ci * 5;
          const cy = sy + (ci - 1) * 6;
          c.save();
          c.globalAlpha = 0.5;
          c.rotate((clusterSeed + ci) * 0.3 - 0.5);
          drawCrystalShape(c, cx, cy, cSize, pal.crystal);
          c.restore();
        }
      }

      // Right wall cluster
      if (clusterSeed > 35) {
        const clusterCount = 2 + ((clusterSeed + 5) % 2);
        for (let ci = 0; ci < clusterCount; ci++) {
          const cSize = 4 + (clusterSeed + ci * 7) % 5;
          const cx = walls.right - 2 - ci * 5;
          const cy = sy + (ci - 1) * 6;
          c.save();
          c.globalAlpha = 0.5;
          c.rotate(-(clusterSeed + ci) * 0.3 + 0.5);
          drawCrystalShape(c, cx, cy, cSize, pal.crystal);
          c.restore();
        }
      }
    }
  }

  function drawWaterDrops(c, pal) {
    if (!waterDrops || waterDrops.length === 0) return;
    c.save();
    for (const drop of waterDrops) {
      const sy = drop.y - cameraY;
      if (sy < -10 || sy > CFG.H + 10) continue;
      c.fillStyle = rgb(pal.crystal, 0.3);
      c.beginPath();
      c.ellipse(drop.x, sy, 2, 4, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawFogBands(c, pal) {
    const t = performance.now() / 1000;
    c.save();
    for (let i = 0; i < 4; i++) {
      const alpha = 0.03 + i * 0.01; // 0.03, 0.04, 0.05, 0.06
      const speed = 0.3 + i * 0.15;  // different drift speed per band
      const xOffset = Math.sin(t * speed + i * 1.8) * 40;
      const bandY = (CFG.H * (0.15 + i * 0.22)) + Math.sin(t * 0.2 + i) * 15;
      c.fillStyle = rgb(pal.ambient, alpha);
      c.fillRect(xOffset - 20, bandY - 20, CFG.W + 40, 40);
    }
    c.restore();
  }

  function drawCaveHazards(c, pal) {
    const topY = cameraY;
    const step = 8;

    for (let sy = 0; sy <= CFG.H; sy += step) {
      const worldY = topY + sy;
      const walls = caveWalls(worldY);

      // Dark zone overlay — ominous purple/red tint
      if (isDarkZone(worldY)) {
        const cycle = 500 - Math.min(score * 2, 200);
        const offset = 200;
        const phase = (((worldY + offset) % cycle) + cycle) % cycle;
        const intensity = Math.sin((phase / 80) * Math.PI) * 0.12;
        c.fillStyle = `rgba(120, 20, 60, ${intensity})`;
        c.fillRect(walls.left, sy, walls.right - walls.left, step);
      }

      // Bottleneck warning — subtle pulsing edge glow
      if (isBottleneck(worldY)) {
        const squeeze = bottleneckSqueeze(worldY);
        if (squeeze > 5) {
          const glow = (squeeze / 80) * 0.2;
          c.fillStyle = `rgba(255, 140, 40, ${glow})`;
          c.fillRect(walls.left, sy, 8, step);
          c.fillRect(walls.right - 8, sy, 8, step);
        }
      }
    }
  }

  function drawCrystalShape(c, x, y, size, col) {
    c.beginPath();
    c.moveTo(x, y - size);
    c.lineTo(x + size * 0.5, y - size * 0.2);
    c.lineTo(x + size * 0.35, y + size * 0.6);
    c.lineTo(x - size * 0.35, y + size * 0.6);
    c.lineTo(x - size * 0.5, y - size * 0.2);
    c.closePath();

    const g = c.createLinearGradient(x - size * 0.5, y - size, x + size * 0.5, y + size * 0.6);
    g.addColorStop(0, rgb(col, 0.7));
    g.addColorStop(0.5, rgb(col, 0.4));
    g.addColorStop(1, rgb(col, 0.15));
    c.fillStyle = g;
    c.fill();

    // Edge highlight
    c.strokeStyle = rgb([255, 255, 255], 0.15);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y - size);
    c.lineTo(x - size * 0.5, y - size * 0.2);
    c.stroke();
  }

  function drawSpikes(c, pal) {
    const topY = cameraY;
    for (const sp of spikes) {
      const sy = sp.y - topY;
      const tipSY = sp.tipY - topY;
      if (sy < -80 || sy > CFG.H + 80) continue;

      const perpX = -Math.sin(sp.angle) * 6;
      const perpY = Math.cos(sp.angle) * 6;

      c.beginPath();
      c.moveTo(sp.x + perpX, sy + perpY);
      c.lineTo(sp.tipX, tipSY);
      c.lineTo(sp.x - perpX, sy - perpY);
      c.closePath();

      const sg = c.createLinearGradient(sp.x, sy, sp.tipX, tipSY);
      sg.addColorStop(0, rgb(pal.wall, 0.9));
      sg.addColorStop(0.6, rgb(pal.crystal, 0.6));
      sg.addColorStop(1, rgb([255, 255, 255], 0.8));
      c.fillStyle = sg;
      c.fill();

      // Highlight edge
      c.strokeStyle = rgb(pal.crystal, 0.3);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(sp.x + perpX, sy + perpY);
      c.lineTo(sp.tipX, tipSY);
      c.stroke();

      // Tip glow
      c.beginPath();
      c.arc(sp.tipX, tipSY, 3, 0, Math.PI * 2);
      c.fillStyle = rgb(pal.crystal, 0.5);
      c.fill();
    }
  }

  function drawShards(c, pal) {
    const topY = cameraY;
    const t = performance.now() / 1000;

    for (const s of shards) {
      if (s.collected) continue;
      const sy = s.y - topY + Math.sin(t * 3 + s.bobPhase) * 4;
      if (sy < -30 || sy > CFG.H + 30) continue;

      const rot = t * 2 + s.bobPhase;

      c.save();
      c.translate(s.x, sy);
      c.rotate(rot);

      // Outer glow
      const glow = c.createRadialGradient(0, 0, 0, 0, 0, 18);
      glow.addColorStop(0, rgb(pal.crystal, 0.4));
      glow.addColorStop(1, rgb(pal.crystal, 0));
      c.fillStyle = glow;
      c.fillRect(-18, -18, 36, 36);

      // Diamond shape
      c.beginPath();
      c.moveTo(0, -9);
      c.lineTo(6, 0);
      c.lineTo(0, 9);
      c.lineTo(-6, 0);
      c.closePath();

      const dg = c.createLinearGradient(-6, -9, 6, 9);
      dg.addColorStop(0, rgb([255, 255, 255], 0.9));
      dg.addColorStop(0.5, rgb(pal.crystal, 0.9));
      dg.addColorStop(1, rgb(pal.crystal, 0.5));
      c.fillStyle = dg;
      c.fill();

      c.strokeStyle = rgb([255, 255, 255], 0.6);
      c.lineWidth = 1;
      c.stroke();

      // Facet lines inside the diamond (crossing lines like player crystal)
      c.strokeStyle = rgb([255, 255, 255], 0.25);
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(0, -9); c.lineTo(0, 9);   // vertical facet
      c.moveTo(-6, 0); c.lineTo(6, 0);    // horizontal facet
      c.stroke();

      // Prismatic rainbow edge highlight
      const hue = (t * 60) % 360;
      c.beginPath();
      c.moveTo(0, -9);
      c.lineTo(6, 0);
      c.lineTo(0, 9);
      c.lineTo(-6, 0);
      c.closePath();
      c.strokeStyle = `hsl(${hue}, 80%, 70%)`;
      c.lineWidth = 1.5;
      c.stroke();

      c.restore();
    }
  }

  function drawShadows(c, pal) {
    const topY = cameraY;
    const t = performance.now() / 1000;
    const plScreenY = player.y - cameraY;

    for (const sh of shadows) {
      const sy = sh.y - topY;
      if (sy < -60 || sy > CFG.H + 60) continue;

      // Tendrils extending from the body
      c.save();
      c.strokeStyle = "rgba(15,3,30,0.6)";
      c.lineWidth = 2;
      const tendrilAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      for (let ti = 0; ti < tendrilAngles.length; ti++) {
        const baseAngle = tendrilAngles[ti] + Math.sin(t * 1.5 + ti * 1.3) * 0.4;
        c.beginPath();
        const startX = sh.x + Math.cos(baseAngle) * sh.r * 0.5;
        const startY = sy + Math.sin(baseAngle) * sh.r * 0.5;
        c.moveTo(startX, startY);
        const segments = 5;
        const tendrilLen = sh.r * 1.2;
        for (let s = 1; s <= segments; s++) {
          const frac = s / segments;
          const waveOff = Math.sin(t * 3 + ti * 2.0 + s * 0.8) * 6 * frac;
          const tx = sh.x + Math.cos(baseAngle) * (sh.r * 0.5 + tendrilLen * frac) + Math.cos(baseAngle + Math.PI * 0.5) * waveOff;
          const ty = sy + Math.sin(baseAngle) * (sh.r * 0.5 + tendrilLen * frac) + Math.sin(baseAngle + Math.PI * 0.5) * waveOff;
          c.lineTo(tx, ty);
        }
        c.stroke();
      }
      c.restore();

      // Dark body
      const bg = c.createRadialGradient(sh.x, sy, 0, sh.x, sy, sh.r);
      bg.addColorStop(0, "rgba(10,0,20,0.9)");
      bg.addColorStop(0.6, "rgba(20,5,35,0.5)");
      bg.addColorStop(1, "rgba(30,10,50,0)");
      c.fillStyle = bg;
      c.beginPath();
      c.arc(sh.x, sy, sh.r, 0, Math.PI * 2);
      c.fill();

      // Second dark layer
      const bg2 = c.createRadialGradient(sh.x, sy, 0, sh.x, sy, sh.r * 0.7);
      bg2.addColorStop(0, "rgba(5,0,10,0.8)");
      bg2.addColorStop(1, "rgba(15,3,25,0)");
      c.fillStyle = bg2;
      c.beginPath();
      c.arc(sh.x, sy, sh.r * 0.7, 0, Math.PI * 2);
      c.fill();

      // Eyes - pupils track player position
      const eyeSpread = 5;
      const eyeY = sy - 2 + Math.sin(sh.eyePhase) * 1.5;
      const eyeColor = zoneIndex() >= 3 ? [255, 120, 60] : [255, 50, 50];

      // Calculate direction to player for pupil offset
      const dxToPlayer = player.x - sh.x;
      const dyToPlayer = plScreenY - sy;
      const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer) || 1;
      const pupilOffX = (dxToPlayer / distToPlayer) * 1.5;
      const pupilOffY = (dyToPlayer / distToPlayer) * 1.5;

      for (const ex of [-eyeSpread, eyeSpread]) {
        // Eye glow
        const eg = c.createRadialGradient(sh.x + ex, eyeY, 0, sh.x + ex, eyeY, 6);
        eg.addColorStop(0, rgb(eyeColor, 0.9));
        eg.addColorStop(0.5, rgb(eyeColor, 0.3));
        eg.addColorStop(1, rgb(eyeColor, 0));
        c.fillStyle = eg;
        c.fillRect(sh.x + ex - 6, eyeY - 6, 12, 12);

        // Eye core (pupil tracks player)
        c.beginPath();
        c.arc(sh.x + ex + pupilOffX, eyeY + pupilOffY, 2, 0, Math.PI * 2);
        c.fillStyle = rgb(eyeColor);
        c.fill();
      }
    }
  }

  function drawStalactites(c, pal) {
    const topY = cameraY;
    for (const st of stalactites) {
      const sy = st.y - topY;
      if (sy < -60 || sy > CFG.H + 60) continue;

      const shakeOff = st.shaking ? rand(-2, 2) : 0;
      const sz = st.size;

      c.save();
      c.translate(st.x + shakeOff, sy);

      // Stalactite body (inverted triangle)
      c.beginPath();
      c.moveTo(-sz * 0.5, -sz * 0.3);
      c.lineTo(0, sz);
      c.lineTo(sz * 0.5, -sz * 0.3);
      c.closePath();

      const sg = c.createLinearGradient(0, -sz * 0.3, 0, sz);
      sg.addColorStop(0, rgb(pal.wall, 0.9));
      sg.addColorStop(0.7, rgb(pal.crystal, 0.5));
      sg.addColorStop(1, rgb([255, 255, 255], 0.7));
      c.fillStyle = sg;
      c.fill();

      c.strokeStyle = rgb(pal.crystal, 0.3);
      c.lineWidth = 1;
      c.stroke();

      // Warning glow when shaking
      if (st.shaking) {
        const wg = c.createRadialGradient(0, sz * 0.3, 0, 0, sz * 0.3, sz * 1.5);
        wg.addColorStop(0, "rgba(255,100,50,0.3)");
        wg.addColorStop(1, "rgba(255,100,50,0)");
        c.fillStyle = wg;
        c.fillRect(-sz * 1.5, -sz, sz * 3, sz * 3);
      }

      c.restore();
    }
  }

  function drawPlayer(c, pal) {
    const screenY = player.y - cameraY;
    const t = performance.now() / 1000;
    const rot = Math.sin(t * 2) * 0.12;
    const pulseScale = 1 + pulseAnim * 0.8;

    c.save();
    c.translate(player.x, screenY);
    c.rotate(rot);
    c.scale(pulseScale, pulseScale);

    // Outer glow
    const og = c.createRadialGradient(0, 0, 0, 0, 0, 30);
    og.addColorStop(0, rgb(pal.crystal, 0.35));
    og.addColorStop(0.6, rgb(pal.crystal, 0.1));
    og.addColorStop(1, rgb(pal.crystal, 0));
    c.fillStyle = og;
    c.fillRect(-30, -30, 60, 60);

    // Mid glow
    const mg = c.createRadialGradient(0, 0, 0, 0, 0, 18);
    mg.addColorStop(0, rgb(pal.crystal, 0.6));
    mg.addColorStop(1, rgb(pal.crystal, 0));
    c.fillStyle = mg;
    c.fillRect(-18, -18, 36, 36);

    // Crystal body (4-point star)
    c.beginPath();
    c.moveTo(0, -14);
    c.lineTo(5, -3);
    c.lineTo(12, 0);
    c.lineTo(5, 3);
    c.lineTo(0, 14);
    c.lineTo(-5, 3);
    c.lineTo(-12, 0);
    c.lineTo(-5, -3);
    c.closePath();

    const pg = c.createLinearGradient(-12, -14, 12, 14);
    pg.addColorStop(0, rgb([255, 255, 255], 0.95));
    pg.addColorStop(0.4, rgb(pal.crystal, 0.85));
    pg.addColorStop(1, rgb(pal.crystal, 0.5));
    c.fillStyle = pg;
    c.fill();

    c.strokeStyle = rgb([255, 255, 255], 0.5);
    c.lineWidth = 1;
    c.stroke();

    // Facet lines
    c.strokeStyle = rgb([255, 255, 255], 0.25);
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(0, -14); c.lineTo(0, 14);
    c.moveTo(-12, 0); c.lineTo(12, 0);
    c.stroke();

    // Core bright point
    const cg = c.createRadialGradient(0, 0, 0, 0, 0, 5);
    cg.addColorStop(0, "rgba(255,255,255,0.95)");
    cg.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = cg;
    c.fillRect(-5, -5, 10, 10);

    c.restore();
  }

  function drawParticles(c) {
    for (const p of particles) {
      if (!p.active) continue;
      const sy = p.type === "dust" || p.type === "wisp" || p.type === "sparkle"
        ? p.y - cameraY : p.y - cameraY;

      // For menu particles, y is screen space
      const drawY = (state === STATE.MENU && p.type === "dust") ? p.y : p.y - cameraY;

      const lifeRatio = p.life / p.maxLife;
      const alpha = p.alpha * lifeRatio;

      if (alpha < 0.01) continue;

      c.globalAlpha = alpha;

      if (p.type === "nova" || p.type === "burst" || p.type === "shatter") {
        // Bright additive-like particles
        const g = c.createRadialGradient(p.x, drawY, 0, p.x, drawY, p.size);
        g.addColorStop(0, rgb(p.color, 1));
        g.addColorStop(1, rgb(p.color, 0));
        c.fillStyle = g;
        c.fillRect(p.x - p.size, drawY - p.size, p.size * 2, p.size * 2);
      } else if (p.type === "wisp") {
        c.fillStyle = rgb(p.color, 0.6);
        c.beginPath();
        c.arc(p.x, drawY, p.size * lifeRatio, 0, Math.PI * 2);
        c.fill();
      } else {
        // Dust, trail, sparkle
        c.fillStyle = rgb(p.color);
        c.beginPath();
        c.arc(p.x, drawY, p.size * (0.5 + lifeRatio * 0.5), 0, Math.PI * 2);
        c.fill();
      }

      c.globalAlpha = 1;
    }
  }

  function drawVignette(c) {
    const g = c.createRadialGradient(
      CFG.W / 2, CFG.H / 2, CFG.H * 0.3,
      CFG.W / 2, CFG.H / 2, CFG.H * 0.75
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = g;
    c.fillRect(0, 0, CFG.W, CFG.H);
  }

  function drawChromaticAberration(c) {
    // Quick chromatic aberration: slight color-tinted offsets
    const offset = chromAb;
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = 0.06;

    // Red channel offset
    c.drawImage(canvas, offset, 0);
    // Blue channel offset
    c.drawImage(canvas, -offset, 0);

    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
  }

  function drawLightMeter(c, pal) {
    // Small light energy bar at top of screen
    const barW = 100;
    const barH = 6;
    const barX = (CFG.W - barW) / 2;
    const barY = 14;
    const fill = (lightRadius - CFG.LIGHT_MIN) / (CFG.LIGHT_MAX - CFG.LIGHT_MIN);

    c.fillStyle = "rgba(0,0,0,0.4)";
    c.beginPath();
    c.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 4);
    c.fill();

    const bGrad = c.createLinearGradient(barX, barY, barX + barW * fill, barY);
    const fillColor = fill > 0.3 ? pal.crystal : [255, 80, 80];
    bGrad.addColorStop(0, rgb(fillColor, 0.9));
    bGrad.addColorStop(1, rgb(fillColor, 0.5));
    c.fillStyle = bGrad;
    c.beginPath();
    c.roundRect(barX, barY, barW * fill, barH, 3);
    c.fill();

    // Glow on bar
    if (fill > 0.1) {
      c.shadowColor = rgb(fillColor, 0.6);
      c.shadowBlur = 8;
      c.beginPath();
      c.roundRect(barX, barY, barW * fill, barH, 3);
      c.fill();
      c.shadowBlur = 0;
    }
  }

  // ── Overlay Screens ───────────────────────────────────────

  function drawMenu(c, pal) {
    const t = menuTime;

    // Title "LUMINA"
    c.save();
    c.textAlign = "center";
    c.textBaseline = "middle";

    // Title glow
    c.shadowColor = rgb(pal.crystal, 0.7);
    c.shadowBlur = 30;
    c.font = "bold 52px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb([255, 255, 255], 0.95);
    c.fillText(I18N.t('luTitle'), CFG.W / 2, CFG.H * 0.32);
    c.shadowBlur = 0;

    // Subtitle
    c.font = "16px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb(pal.crystal, 0.7);
    c.fillText(I18N.t('luSubtitle'), CFG.W / 2, CFG.H * 0.39);

    // Prompt (pulsing)
    const promptAlpha = 0.4 + Math.sin(t * 3) * 0.3;
    c.font = "15px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb([200, 210, 250], promptAlpha);
    c.fillText(isMobile ? I18N.t('luTapToBegin') : I18N.t('luSpaceToBegin'), CFG.W / 2, CFG.H * 0.55);

    // Controls info
    c.font = "13px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb([160, 170, 210], 0.5);
    if (isMobile) {
      c.fillText(I18N.t('luMobileControls'), CFG.W / 2, CFG.H * 0.65);
    } else {
      c.fillText(I18N.t('luDesktopControls'), CFG.W / 2, CFG.H * 0.65);
    }

    // Animated player preview
    const previewY = CFG.H * 0.46;
    const bobY = Math.sin(t * 1.5) * 8;
    c.save();
    c.translate(CFG.W / 2, previewY + bobY);
    c.rotate(Math.sin(t * 2) * 0.1);
    const previewScale = 1.5 + Math.sin(t * 2) * 0.1;
    c.scale(previewScale, previewScale);

    // Glow
    const pg = c.createRadialGradient(0, 0, 0, 0, 0, 25);
    pg.addColorStop(0, rgb(pal.crystal, 0.4));
    pg.addColorStop(1, rgb(pal.crystal, 0));
    c.fillStyle = pg;
    c.fillRect(-25, -25, 50, 50);

    // Body
    c.beginPath();
    c.moveTo(0, -14);
    c.lineTo(5, -3);
    c.lineTo(12, 0);
    c.lineTo(5, 3);
    c.lineTo(0, 14);
    c.lineTo(-5, 3);
    c.lineTo(-12, 0);
    c.lineTo(-5, -3);
    c.closePath();
    const bodyG = c.createLinearGradient(-12, -14, 12, 14);
    bodyG.addColorStop(0, rgb([255, 255, 255], 0.9));
    bodyG.addColorStop(0.5, rgb(pal.crystal, 0.8));
    bodyG.addColorStop(1, rgb(pal.crystal, 0.4));
    c.fillStyle = bodyG;
    c.fill();
    c.strokeStyle = rgb([255, 255, 255], 0.4);
    c.lineWidth = 1;
    c.stroke();

    c.restore();
    c.restore();
  }

  function drawPaused(c) {
    c.fillStyle = "rgba(0,0,0,0.6)";
    c.fillRect(0, 0, CFG.W, CFG.H);

    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 36px 'Trebuchet MS', sans-serif";
    c.fillStyle = "rgba(200,210,250,0.9)";
    c.fillText(I18N.t('paused'), CFG.W / 2, CFG.H * 0.45);

    c.font = "14px 'Trebuchet MS', sans-serif";
    c.fillStyle = "rgba(200,210,250,0.5)";
    c.fillText(I18N.t('pressEscResume'), CFG.W / 2, CFG.H * 0.53);
  }

  function drawGameOver(c, pal) {
    c.fillStyle = "rgba(0,0,0,0.5)";
    c.fillRect(0, 0, CFG.W, CFG.H);

    c.textAlign = "center";
    c.textBaseline = "middle";

    // Score with glow
    c.shadowColor = rgb(pal.crystal, 0.6);
    c.shadowBlur = 20;
    c.font = "bold 42px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb([255, 255, 255], 0.9);
    c.fillText(score, CFG.W / 2, CFG.H * 0.35);
    c.shadowBlur = 0;

    c.font = "15px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb(pal.crystal, 0.7);
    c.fillText(I18N.t('luDepthReached'), CFG.W / 2, CFG.H * 0.42);

    // Best
    c.font = "14px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb([200, 210, 250], 0.5);
    c.fillText(I18N.t('luBestPrefix') + bestScore, CFG.W / 2, CFG.H * 0.48);

    // Zone reached
    const zi = Math.min(Math.floor(score / CFG.ZONE_LEN), ZONES.length - 1);
    c.fillStyle = rgb(ZONES[zi].crystal, 0.6);
    c.fillText(I18N.t(ZONES[zi].i18nKey), CFG.W / 2, CFG.H * 0.53);

    // Restart prompt
    const t = performance.now() / 1000;
    const promptAlpha = 0.35 + Math.sin(t * 3) * 0.25;
    c.font = "14px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb([200, 210, 250], promptAlpha);
    c.fillText(isMobile ? I18N.t('luTapToRestart') : I18N.t('luSpaceToRestart'), CFG.W / 2, CFG.H * 0.63);
  }

  function drawZoneAnnounce(c, pal) {
    const alpha = Math.min(1, zoneAnnounceTmr * 0.8);
    c.save();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.globalAlpha = alpha;

    c.shadowColor = rgb(pal.crystal, 0.6);
    c.shadowBlur = 15;
    c.font = "bold 22px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb(pal.crystal, 0.9);
    c.fillText(I18N.t(zoneAnnounceName), CFG.W / 2, CFG.H * 0.15);
    c.shadowBlur = 0;

    c.globalAlpha = 1;
    c.restore();
  }

  function drawTouchGuide(c, pal) {
    // Subtle touch zone hints at bottom of screen
    const guideAlpha = touchActive ? 0.15 : 0.06;
    const y = CFG.H - 60;

    c.save();
    c.globalAlpha = guideAlpha;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "22px 'Trebuchet MS', sans-serif";
    c.fillStyle = rgb([200, 210, 250], 1);

    // Left arrow
    c.fillText("\u25C0", CFG.W * 0.15, y);
    // Right arrow
    c.fillText("\u25B6", CFG.W * 0.85, y);
    // Center pulse icon
    c.font = "14px 'Trebuchet MS', sans-serif";
    c.fillText(I18N.t('luPulse'), CFG.W * 0.5, y);

    // Active zone highlight
    if (touchActive && touchMoveDir !== 0) {
      c.globalAlpha = 0.06;
      c.fillStyle = rgb(pal.crystal, 1);
      if (touchMoveDir === -1) {
        c.fillRect(0, 0, CFG.W * 0.33, CFG.H);
      } else {
        c.fillRect(CFG.W * 0.67, 0, CFG.W * 0.33, CFG.H);
      }
    }

    c.globalAlpha = 1;
    c.restore();
  }

  // ── Game Loop ─────────────────────────────────────────────
  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // ── Visibility handling ───────────────────────────────────
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === STATE.PLAYING) {
      state = STATE.PAUSED;
    }
    if (!document.hidden) {
      lastTime = performance.now();
    }
  });

  // ── Start ─────────────────────────────────────────────────
  init();
})();

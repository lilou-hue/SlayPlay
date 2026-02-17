// ── Phantom Road ─────────────────────────────────────────
// Top-down night driving: headlights, winding road,
// traffic, collectibles, near-miss combos, nitro boost.
// ─────────────────────────────────────────────────────────

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;   // 480
const H = canvas.height;  // 720

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("bestScore");
const muteBtn = document.getElementById("muteButton");
const restartBtn = document.getElementById("restartButton");

// ── Detect mobile ────────────────────────────────────────
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ("ontouchstart" in window);

// ── Haptic feedback ──────────────────────────────────────
const haptic = (pattern) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
};

// ── Audio ────────────────────────────────────────────────
const audio = (() => {
  let actx = null;
  let muted = false;
  const getCtx = () => {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
  };

  const play = (fn) => {
    if (muted) return;
    try { fn(getCtx()); } catch (_) {}
  };

  let engineOsc = null;
  let engineGain = null;

  const startEngine = () => {
    if (muted || engineOsc) return;
    const ac = getCtx();
    engineOsc = ac.createOscillator();
    engineGain = ac.createGain();
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 300;
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0.07;
    engineOsc.connect(lp).connect(engineGain).connect(ac.destination);
    engineOsc.start();
  };

  const updateEngine = (speed) => {
    if (!engineOsc) return;
    engineOsc.frequency.value = 50 + speed * 0.4;
    engineGain.gain.value = Math.min(0.12, 0.05 + speed * 0.00025);
  };

  const stopEngine = () => {
    if (engineOsc) {
      try { engineOsc.stop(); } catch (_) {}
      engineOsc = null;
      engineGain = null;
    }
  };

  const nearMiss = () => play((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(600, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.18);
  });

  const coinSound = () => play((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1047, ac.currentTime);
    o.frequency.setValueAtTime(1319, ac.currentTime + 0.06);
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.15);
  });

  const nitroSound = () => play((ac) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(110, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, ac.currentTime + 0.15);
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.25);
  });

  const crash = () => play((ac) => {
    const bufSize = ac.sampleRate * 0.4;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(0.35, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
    src.connect(g).connect(ac.destination);
    src.start();
  });

  const milestone = () => play((ac) => {
    [0, 0.08, 0.16].forEach((t, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = [523, 659, 784][i];
      g.gain.setValueAtTime(0.1, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.15);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + t);
      o.stop(ac.currentTime + t + 0.15);
    });
  });

  const toggleMute = () => {
    muted = !muted;
    if (muted) stopEngine();
    muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
  };

  return { startEngine, updateEngine, stopEngine, nearMiss, coinSound, nitroSound, crash, milestone, toggleMute, isMuted: () => muted };
})();

// ── Constants ────────────────────────────────────────────
const ROAD_WIDTH = 210;
const CAR_W = 36;
const CAR_H = 62;
const LANE_COUNT = 3;

const zones = [
  { name: "Suburbs",   roadColor: "#2e2e38", lineColor: "#ff8c32", fogColor: "#0a0a18", dist: 0 },
  { name: "Highway",   roadColor: "#2a2a3a", lineColor: "#ffcc44", fogColor: "#08081a", dist: 400 },
  { name: "Mountains", roadColor: "#252535", lineColor: "#44ddff", fogColor: "#060820", dist: 1200 },
  { name: "Desert",    roadColor: "#302820", lineColor: "#ff5544", fogColor: "#100808", dist: 2500 },
  { name: "Void",      roadColor: "#181828", lineColor: "#cc44ff", fogColor: "#040410", dist: 4000 },
];

// ── State ────────────────────────────────────────────────
let state;

function initState() {
  state = {
    phase: "start",
    lastTime: 0,

    // Car
    carX: W / 2,
    carY: H * 0.72,
    steerInput: 0,
    steerAngle: 0,
    carVelX: 0,

    // Road
    roadCenterX: W / 2,
    roadTargetX: W / 2,
    segTimer: 0,
    currentRoadWidth: ROAD_WIDTH,

    // Scrolling
    scrollSpeed: 180,
    baseSpeed: 180,
    distance: 0,

    // Traffic
    traffic: [],
    trafficTimer: 0,

    // Collectibles
    coins: [],
    coinTimer: 0,

    // Road hazards
    hazards: [],
    hazardTimer: 3,

    // Roadside posts (speed sensation)
    posts: [],
    postTimer: 0,

    // Near-miss
    nearMissCombo: 0,
    nearMissDisplay: 0,
    nearMissText: "",

    // Nitro
    nitro: 0.3,
    nitroActive: false,
    nitroCooldown: 0,

    // Particles
    particles: [],

    // Speed lines
    speedLines: [],

    // Road markings
    markingOffset: 0,

    // Shake
    shakeTime: 0,
    shakeIntensity: 0,

    // Score
    score: 0,
    bestScore: parseInt(localStorage.getItem("phantomRoadBest") || "0", 10),
    lastMilestone: 0,
    milestoneText: "",
    milestoneTimer: 0,

    // Zone
    zoneIndex: 0,
    zoneTextTimer: 0,

    // Crash
    crashX: 0,
    crashY: 0,

    // Mobile touch
    touchL: false,
    touchR: false,
    touchNitro: false,

    // Rain particles
    rain: [],

    // Road reflector posts
    reflectorOffset: 0,
  };

  // Initialize rain drops
  for (let i = 0; i < 80; i++) {
    state.rain.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 600 + Math.random() * 400,
      len: 6 + Math.random() * 10,
      alpha: 0.1 + Math.random() * 0.2,
    });
  }

  bestEl.textContent = state.bestScore;
}

initState();

// ── Input ────────────────────────────────────────────────
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown" ||
      e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();

  if (state.phase === "start") startGame();
  else if (state.phase === "gameover" && (e.key === " " || e.key === "Enter")) restartGame();
});
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// ── Mobile touch: left/right halves + nitro button ──────
const activeTouches = {};

function classifyTouch(clientX, clientY) {
  // Convert client coords to canvas-relative
  const rect = canvas.getBoundingClientRect();
  const cx = (clientX - rect.left) / rect.width * W;
  const cy = (clientY - rect.top) / rect.height * H;

  // Nitro button zone: bottom-center circle (generous hit area)
  const nitroBtnX = W / 2;
  const nitroBtnY = H - 50;
  const nitroBtnR = 50;
  const dx = cx - nitroBtnX;
  const dy = cy - nitroBtnY;
  if (dx * dx + dy * dy < nitroBtnR * nitroBtnR) return "nitro";

  // Left half / right half
  return cx < W / 2 ? "left" : "right";
}

function recalcTouchState() {
  state.touchL = false;
  state.touchR = false;
  state.touchNitro = false;
  for (const id in activeTouches) {
    const zone = activeTouches[id];
    if (zone === "left") state.touchL = true;
    if (zone === "right") state.touchR = true;
    if (zone === "nitro") state.touchNitro = true;
  }
}

// Grace period after start/restart so the initiating tap doesn't steer
let inputGrace = 0;

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (state.phase === "start") {
    // Check fullscreen button hit
    if (state._fsBtn && isMobile) {
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width * W;
      const cy = (e.clientY - rect.top) / rect.height * H;
      const b = state._fsBtn;
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        toggleFullscreen();
        return;
      }
    }
    startGame(); inputGrace = 0.25; return;
  }
  if (state.phase === "gameover") { restartGame(); inputGrace = 0.25; return; }
  // Capture pointer so moves/up track even if finger leaves canvas bounds
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  activeTouches[e.pointerId] = classifyTouch(e.clientX, e.clientY);
  recalcTouchState();
});

canvas.addEventListener("pointermove", (e) => {
  if (activeTouches[e.pointerId] !== undefined) {
    activeTouches[e.pointerId] = classifyTouch(e.clientX, e.clientY);
    recalcTouchState();
  }
});

const handlePointerEnd = (e) => {
  delete activeTouches[e.pointerId];
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  recalcTouchState();
};
canvas.addEventListener("pointerup", handlePointerEnd);
canvas.addEventListener("pointercancel", handlePointerEnd);

// Clean up stuck touches when page loses focus
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    for (const id in activeTouches) delete activeTouches[id];
    recalcTouchState();
    for (const k in keys) keys[k] = false;
  }
});

restartBtn.addEventListener("click", restartGame);
muteBtn.addEventListener("click", () => audio.toggleMute());

// ── Fullscreen (mobile) ─────────────────────────────────
function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || (() => {})).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || (() => {})).call(document);
  }
}
function canFullscreen() {
  return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
}

// ── Game lifecycle ───────────────────────────────────────
function startGame() {
  initState();
  state.phase = "playing";
  audio.startEngine();
  // Seed initial roadside posts
  for (let y = 0; y < H; y += 80) {
    state.posts.push({ y, side: -1 });
    state.posts.push({ y, side: 1 });
  }
}

function restartGame() {
  audio.stopEngine();
  startGame();
}

function gameOver() {
  state.phase = "gameover";
  state.crashX = state.carX;
  state.crashY = state.carY;
  audio.crash();
  audio.stopEngine();
  haptic([50, 30, 100]);
  state.shakeTime = 0.5;
  state.shakeIntensity = 14;

  // Crash explosion particles
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 200;
    spawnParticle(
      state.carX, state.carY,
      Math.cos(angle) * speed, Math.sin(angle) * speed,
      0.4 + Math.random() * 0.5,
      `hsl(${Math.random() * 40 + 10}, 100%, ${40 + Math.random() * 40}%)`,
      2 + Math.random() * 4
    );
  }

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("phantomRoadBest", state.bestScore);
    bestEl.textContent = state.bestScore;
  }
}

// ── Zone helpers ─────────────────────────────────────────
function getZone() {
  for (let i = zones.length - 1; i >= 0; i--) {
    if (state.distance >= zones[i].dist) { state.zoneIndex = i; return zones[i]; }
  }
  state.zoneIndex = 0;
  return zones[0];
}

function lerpColor(a, b, t) {
  const parse = (c) => {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const ca = parse(a), cb = parse(b);
  return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)},${Math.round(ca[1] + (cb[1] - ca[1]) * t)},${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`;
}

function getZoneBlend() {
  const d = state.distance;
  const zi = state.zoneIndex;
  const cur = zones[zi];
  const next = zones[Math.min(zi + 1, zones.length - 1)];
  if (zi >= zones.length - 1) return { roadColor: cur.roadColor, lineColor: cur.lineColor, fogColor: cur.fogColor };
  const t = Math.min(1, (d - cur.dist) / (next.dist - cur.dist));
  return {
    roadColor: lerpColor(cur.roadColor, next.roadColor, t),
    lineColor: lerpColor(cur.lineColor, next.lineColor, t),
    fogColor: lerpColor(cur.fogColor, next.fogColor, t),
  };
}

// ── Spawners ─────────────────────────────────────────────
function spawnTraffic() {
  const rw = state.currentRoadWidth;
  const laneW = rw / LANE_COUNT;
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const laneX = (state.roadCenterX - rw / 2) + laneW * lane + laneW / 2;

  // Variety: trucks are wider/slower, bikes are narrow/fast
  const r = Math.random();
  let w, h, speed, color;
  const baseColors = ["#dd3333", "#3388dd", "#ddaa22", "#33cc55", "#dd55aa", "#8855dd", "#dddddd"];
  color = baseColors[Math.floor(Math.random() * baseColors.length)];

  if (r < 0.15) {
    // Truck
    w = 32; h = 60;
    speed = state.scrollSpeed * 0.35 + Math.random() * 30;
  } else if (r < 0.3) {
    // Bike / small
    w = 16; h = 32;
    speed = state.scrollSpeed * 0.8 + Math.random() * 80;
  } else {
    // Regular car
    w = 24; h = 46;
    speed = state.scrollSpeed * 0.5 + Math.random() * 50;
  }

  state.traffic.push({ x: laneX, y: -70, w, h, speed, color, passed: false, nearMissChecked: false });
}

function spawnCoin() {
  const rw = state.currentRoadWidth;
  const margin = 20;
  const cx = state.roadCenterX - rw / 2 + margin + Math.random() * (rw - margin * 2);
  state.coins.push({ x: cx, y: -20, collected: false, sparkle: 0 });
}

function spawnHazard() {
  const rw = state.currentRoadWidth;
  const margin = 30;
  const cx = state.roadCenterX - rw / 2 + margin + Math.random() * (rw - margin * 2);
  const types = ["cone", "pothole", "oil"];
  state.hazards.push({
    x: cx, y: -30,
    type: types[Math.floor(Math.random() * types.length)],
    w: 18, h: 18,
  });
}

function spawnParticle(x, y, vx, vy, life, color, size) {
  if (state.particles.length > 150) return;
  state.particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

// ── Update ───────────────────────────────────────────────
function update(dt) {
  if (state.phase !== "playing") {
    // Still update particles in gameover for crash effect
    if (state.phase === "gameover") {
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt; // gravity on crash particles
        p.life -= dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }
      if (state.shakeTime > 0) state.shakeTime -= dt;
    }
    return;
  }

  // ── Zone ──
  const prevZone = state.zoneIndex;
  getZone();
  if (state.zoneIndex !== prevZone) {
    state.zoneTextTimer = 2.5;
  }
  if (state.distance < 3) state.zoneTextTimer = 2.5;
  if (state.zoneTextTimer > 0) state.zoneTextTimer -= dt;

  // ── Speed ramp (faster progression) ──
  state.baseSpeed = 180 + state.distance * 0.08;
  state.scrollSpeed = state.baseSpeed;

  // ── Nitro ──
  if (state.nitroCooldown > 0) state.nitroCooldown -= dt;
  const nitroPressed = keys[" "] || keys["ArrowUp"] || state.touchNitro;
  if (nitroPressed && state.nitro >= 0.25 && state.nitroCooldown <= 0 && !state.nitroActive) {
    state.nitroActive = true;
    audio.nitroSound();
  }
  if (state.nitroActive) {
    state.scrollSpeed = state.baseSpeed * 1.7;
    state.nitro -= dt * 0.6;
    if (state.nitro <= 0) {
      state.nitro = 0;
      state.nitroActive = false;
      state.nitroCooldown = 0.3;
    }
    // Nitro flame particles
    for (let i = 0; i < 3; i++) {
      spawnParticle(
        state.carX - 8 + Math.random() * 16,
        state.carY + CAR_H / 2 + 2,
        (Math.random() - 0.5) * 50,
        100 + Math.random() * 80,
        0.2 + Math.random() * 0.2,
        `hsl(${15 + Math.random() * 35}, 100%, ${45 + Math.random() * 35}%)`,
        3 + Math.random() * 4
      );
    }
  } else if (!nitroPressed) {
    state.nitroActive = false;
  }

  // ── Road width narrows ──
  state.currentRoadWidth = Math.max(130, ROAD_WIDTH - state.distance * 0.007);
  const rw = state.currentRoadWidth;

  // ── Road curving (more aggressive) ──
  state.segTimer -= dt;
  if (state.segTimer <= 0) {
    state.segTimer = 1.0 + Math.random() * 1.5;
    const maxDrift = 70 + Math.min(state.distance * 0.02, 100);
    state.roadTargetX = W / 2 + (Math.random() * 2 - 1) * maxDrift;
    // Keep road on screen
    state.roadTargetX = Math.max(rw / 2 + 20, Math.min(W - rw / 2 - 20, state.roadTargetX));
  }
  const curveLerp = 1.8 * dt;
  state.roadCenterX += (state.roadTargetX - state.roadCenterX) * curveLerp;

  // ── Input grace period (prevent start-tap from steering) ──
  if (inputGrace > 0) inputGrace -= dt;

  // ── Steering ──
  state.steerInput = 0;
  if (keys["ArrowLeft"] || keys["a"]) state.steerInput = -1;
  if (keys["ArrowRight"] || keys["d"]) state.steerInput = 1;
  // Mobile touch: left/right halves (skip during grace period)
  if (inputGrace <= 0) {
    if (state.touchL) state.steerInput = -1;
    if (state.touchR) state.steerInput = 1;
    if (state.touchL && state.touchR) state.steerInput = 0; // both = straight
  }

  // ── Car physics with momentum ──
  const steerAccel = 600;
  const friction = 5;
  state.carVelX += state.steerInput * steerAccel * dt;
  state.carVelX *= (1 - friction * dt);
  state.carX += state.carVelX * dt;
  state.carX = Math.max(CAR_W / 2 + 4, Math.min(W - CAR_W / 2 - 4, state.carX));
  state.steerAngle += (state.steerInput * 0.25 - state.steerAngle) * 8 * dt;

  // ── On-road check ──
  const roadLeft = state.roadCenterX - rw / 2;
  const roadRight = state.roadCenterX + rw / 2;
  const onRoad = state.carX > roadLeft + CAR_W / 2 - 2 && state.carX < roadRight - CAR_W / 2 + 2;

  // Edge drifting charges nitro
  if (onRoad) {
    const edgeDist = Math.min(state.carX - roadLeft, roadRight - state.carX);
    if (edgeDist < 35 && !state.nitroActive) {
      state.nitro = Math.min(1, state.nitro + dt * 0.4);
      // Edge sparks
      if (Math.random() < 0.4) {
        const side = (state.carX - roadLeft < roadRight - state.carX) ? -1 : 1;
        spawnParticle(
          state.carX + side * CAR_W / 2, state.carY + Math.random() * CAR_H - CAR_H / 2,
          side * (30 + Math.random() * 50), -20 + Math.random() * 40,
          0.15 + Math.random() * 0.1,
          "#ffcc44", 2
        );
      }
    }
  }

  if (!onRoad) { gameOver(); return; }

  // ── Distance / score ──
  state.distance += state.scrollSpeed * dt * 0.12;
  state.score = Math.floor(state.distance);
  scoreEl.textContent = state.score;

  // ── Milestones every 200m ──
  const currentMilestone = Math.floor(state.distance / 200) * 200;
  if (currentMilestone > state.lastMilestone && currentMilestone > 0) {
    state.lastMilestone = currentMilestone;
    state.milestoneText = `${currentMilestone}m`;
    state.milestoneTimer = 1.5;
    audio.milestone();
    state.nitro = Math.min(1, state.nitro + 0.15); // bonus nitro
  }
  if (state.milestoneTimer > 0) state.milestoneTimer -= dt;

  // ── Road markings scroll ──
  state.markingOffset = (state.markingOffset + state.scrollSpeed * dt) % 60;

  // ── Roadside posts (speed markers) ──
  state.postTimer -= dt;
  if (state.postTimer <= 0) {
    state.postTimer = 50 / state.scrollSpeed; // distance-based
    state.posts.push({ y: -10, side: -1 });
    state.posts.push({ y: -10, side: 1 });
  }
  for (let i = state.posts.length - 1; i >= 0; i--) {
    state.posts[i].y += state.scrollSpeed * dt;
    if (state.posts[i].y > H + 20) state.posts.splice(i, 1);
  }

  // ── Spawn traffic ──
  const spawnRate = Math.max(0.25, 1.2 - state.distance * 0.0004);
  state.trafficTimer -= dt;
  if (state.trafficTimer <= 0) {
    state.trafficTimer = spawnRate * (0.4 + Math.random() * 0.6);
    spawnTraffic();
    // Sometimes spawn pairs
    if (Math.random() < 0.25 && state.distance > 200) {
      setTimeout(() => { if (state.phase === "playing") spawnTraffic(); }, 200);
    }
  }

  // ── Spawn coins ──
  state.coinTimer -= dt;
  if (state.coinTimer <= 0) {
    state.coinTimer = 1.5 + Math.random() * 2;
    // Spawn a small line of coins
    const count = 2 + Math.floor(Math.random() * 3);
    const baseX = state.roadCenterX - rw / 2 + 25 + Math.random() * (rw - 50);
    for (let i = 0; i < count; i++) {
      state.coins.push({ x: baseX, y: -20 - i * 35, collected: false, sparkle: Math.random() * Math.PI * 2 });
    }
  }

  // ── Spawn hazards ──
  state.hazardTimer -= dt;
  if (state.hazardTimer <= 0) {
    state.hazardTimer = 2.5 + Math.random() * 3 - Math.min(state.distance * 0.0005, 1.5);
    spawnHazard();
  }

  // ── Update traffic ──
  for (let i = state.traffic.length - 1; i >= 0; i--) {
    const t = state.traffic[i];
    t.y += (t.speed + state.scrollSpeed) * dt;

    // Collision + near-miss detection
    if (!t.nearMissChecked && t.y + t.h / 2 > state.carY - CAR_H / 2 && t.y - t.h / 2 < state.carY + CAR_H / 2) {
      const dist = Math.abs(t.x - state.carX);
      const hitDist = (CAR_W + t.w) / 2;
      if (dist < hitDist) {
        gameOver();
        return;
      }
      // Near-miss: generous window
      if (dist < hitDist + 28) {
        t.nearMissChecked = true;
        t.passed = true;
        state.nearMissCombo++;
        const bonus = 3 + state.nearMissCombo * 4;
        state.score += bonus;
        state.distance += bonus;
        state.nearMissDisplay = 1.2;
        state.nearMissText = state.nearMissCombo > 1
          ? `CLOSE! x${state.nearMissCombo}  +${bonus}`
          : `CLOSE!  +${bonus}`;
        audio.nearMiss();
        haptic(15);
        // Spark particles between cars
        for (let j = 0; j < 6; j++) {
          spawnParticle(
            (state.carX + t.x) / 2, state.carY,
            (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 80,
            0.15 + Math.random() * 0.1,
            "#ffee66", 2 + Math.random() * 2
          );
        }
      }
    }

    // Reset combo if car passed without near miss
    if (!t.passed && t.y - t.h / 2 > state.carY + CAR_H) {
      t.passed = true;
      state.nearMissCombo = 0;
    }

    if (t.y > H + 100) state.traffic.splice(i, 1);
  }

  // ── Update coins ──
  for (let i = state.coins.length - 1; i >= 0; i--) {
    const c = state.coins[i];
    c.y += state.scrollSpeed * dt;
    c.sparkle += dt * 4;
    if (!c.collected) {
      const dx = c.x - state.carX;
      const dy = c.y - state.carY;
      if (dx * dx + dy * dy < 600) { // ~24px radius
        c.collected = true;
        state.score += 3;
        state.distance += 3;
        audio.coinSound();
        for (let j = 0; j < 5; j++) {
          spawnParticle(c.x, c.y,
            (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80,
            0.2 + Math.random() * 0.15, "#ffdd44", 2 + Math.random() * 2);
        }
      }
    }
    if (c.y > H + 30 || c.collected) state.coins.splice(i, 1);
  }

  // ── Update hazards ──
  for (let i = state.hazards.length - 1; i >= 0; i--) {
    const hz = state.hazards[i];
    hz.y += state.scrollSpeed * dt;
    // Collision
    const dx = Math.abs(hz.x - state.carX);
    const dy = Math.abs(hz.y - state.carY);
    if (dx < (CAR_W + hz.w) / 2 - 4 && dy < (CAR_H + hz.h) / 2 - 4) {
      if (hz.type === "oil") {
        // Oil = lose control briefly (push sideways)
        state.carVelX += (Math.random() - 0.5) * 400;
        state.shakeTime = 0.15;
        state.shakeIntensity = 5;
        haptic(25);
      } else {
        // Cone/pothole = crash
        gameOver();
        return;
      }
    }
    if (hz.y > H + 40) state.hazards.splice(i, 1);
  }

  // ── Near-miss display ──
  if (state.nearMissDisplay > 0) state.nearMissDisplay -= dt * 1.2;

  // ── Particles ──
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // ── Tail light trail ──
  if (Math.random() < 0.5) {
    spawnParticle(
      state.carX - 12 + Math.random() * 24,
      state.carY + CAR_H / 2 + 4,
      (Math.random() - 0.5) * 18,
      50 + Math.random() * 40,
      0.3, "rgba(255,80,30,0.6)", 2.5
    );
  }

  // ── Speed lines (at higher speeds) ──
  if (state.scrollSpeed > 220 && Math.random() < (state.scrollSpeed - 220) * 0.003) {
    state.speedLines.push({
      x: Math.random() * W,
      y: -10,
      len: 20 + Math.random() * 40,
      speed: state.scrollSpeed * (1.5 + Math.random()),
      alpha: 0.15 + Math.random() * 0.15,
    });
  }
  for (let i = state.speedLines.length - 1; i >= 0; i--) {
    state.speedLines[i].y += state.speedLines[i].speed * dt;
    if (state.speedLines[i].y > H + 60) state.speedLines.splice(i, 1);
  }

  // ── Shake ──
  if (state.shakeTime > 0) state.shakeTime -= dt;

  // Rain update
  for (const drop of state.rain) {
    drop.y += drop.speed * dt;
    if (drop.y > H + drop.len) {
      drop.y = -drop.len;
      drop.x = Math.random() * W;
    }
  }

  // Reflector post offset
  state.reflectorOffset = (state.reflectorOffset + state.scrollSpeed * dt) % 120;

  // ── Engine audio ──
  audio.updateEngine(state.scrollSpeed);
}

// ── Draw ─────────────────────────────────────────────────
function draw() {
  const zoneBlend = state.phase === "start" ? {
    roadColor: zones[0].roadColor,
    lineColor: zones[0].lineColor,
    fogColor: zones[0].fogColor,
  } : getZoneBlend();

  ctx.save();

  // Shake
  if (state.shakeTime > 0) {
    const s = state.shakeIntensity * (state.shakeTime / 0.5);
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  // Background
  ctx.fillStyle = zoneBlend.fogColor;
  ctx.fillRect(0, 0, W, H);

  const rw = state.currentRoadWidth;
  const rcx = state.roadCenterX;

  // ── Roadside grass/dirt texture (subtle stripes) ──
  const grassAlpha = 0.04;
  ctx.fillStyle = `rgba(40,60,30,${grassAlpha})`;
  for (let y = -state.markingOffset; y < H; y += 30) {
    ctx.fillRect(0, y, rcx - rw / 2, 15);
    ctx.fillRect(rcx + rw / 2, y, W - rcx - rw / 2, 15);
  }

  // ── Road surface ──
  ctx.fillStyle = zoneBlend.roadColor;
  ctx.fillRect(rcx - rw / 2, 0, rw, H);

  // ── Road shoulder rumble strips ──
  const shoulderW = 6;
  ctx.fillStyle = zoneBlend.lineColor;
  ctx.globalAlpha = 0.15;
  for (let y = -state.markingOffset; y < H; y += 20) {
    ctx.fillRect(rcx - rw / 2, y, shoulderW, 10);
    ctx.fillRect(rcx + rw / 2 - shoulderW, y, shoulderW, 10);
  }
  ctx.globalAlpha = 1;

  // ── Road edges (glow) ──
  ctx.strokeStyle = zoneBlend.lineColor;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = zoneBlend.lineColor;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(rcx - rw / 2, 0); ctx.lineTo(rcx - rw / 2, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rcx + rw / 2, 0); ctx.lineTo(rcx + rw / 2, H);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Road surface texture (horizontal grooves)
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let y = -(state.markingOffset % 8); y < H; y += 8) {
    ctx.beginPath();
    ctx.moveTo(rcx - rw / 2 + 2, y);
    ctx.lineTo(rcx + rw / 2 - 2, y);
    ctx.stroke();
  }

  // Reflector posts along road edges
  const postSpacing = 120;
  for (let y = -state.reflectorOffset; y < H; y += postSpacing) {
    // Left reflector
    const lx = rcx - rw / 2 - 8;
    ctx.fillStyle = zoneBlend.lineColor;
    ctx.shadowColor = zoneBlend.lineColor;
    ctx.shadowBlur = 6;
    ctx.fillRect(lx - 1.5, y - 3, 3, 6);
    // Right reflector
    const rx = rcx + rw / 2 + 5;
    ctx.fillRect(rx - 1.5, y - 3, 3, 6);
  }
  ctx.shadowBlur = 0;

  // ── Lane markings ──
  ctx.setLineDash([18, 36]);
  ctx.strokeStyle = zoneBlend.lineColor;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const lx = rcx - rw / 2 + (rw / LANE_COUNT) * lane;
    ctx.beginPath();
    ctx.moveTo(lx, -state.markingOffset);
    ctx.lineTo(lx, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);

  // ── Roadside posts ──
  for (const post of state.posts) {
    const px = post.side === -1 ? rcx - rw / 2 - 12 : rcx + rw / 2 + 12;
    // Post body
    ctx.fillStyle = "#555";
    ctx.fillRect(px - 2, post.y - 8, 4, 16);
    // Reflector
    ctx.fillStyle = zoneBlend.lineColor;
    ctx.shadowColor = zoneBlend.lineColor;
    ctx.shadowBlur = 6;
    ctx.fillRect(px - 3, post.y - 4, 6, 5);
    ctx.shadowBlur = 0;
  }

  // ── Speed lines ──
  for (const sl of state.speedLines) {
    ctx.strokeStyle = `rgba(255,255,255,${sl.alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sl.x, sl.y);
    ctx.lineTo(sl.x, sl.y - sl.len);
    ctx.stroke();
  }

  // ── Hazards ──
  for (const hz of state.hazards) {
    if (hz.type === "cone") {
      ctx.fillStyle = "#ff6622";
      ctx.beginPath();
      ctx.moveTo(hz.x, hz.y - 10);
      ctx.lineTo(hz.x - 7, hz.y + 8);
      ctx.lineTo(hz.x + 7, hz.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(hz.x - 5, hz.y - 2, 10, 3);
    } else if (hz.type === "pothole") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(hz.x, hz.y, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(80,80,80,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (hz.type === "oil") {
      ctx.fillStyle = "rgba(40,20,60,0.5)";
      ctx.beginPath();
      ctx.ellipse(hz.x, hz.y, 16, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Rainbow sheen
      const oilGrad = ctx.createLinearGradient(hz.x - 12, hz.y, hz.x + 12, hz.y);
      oilGrad.addColorStop(0, "rgba(100,0,200,0.15)");
      oilGrad.addColorStop(0.5, "rgba(0,200,100,0.15)");
      oilGrad.addColorStop(1, "rgba(200,100,0,0.15)");
      ctx.fillStyle = oilGrad;
      ctx.fill();
    }
  }

  // ── Coins ──
  for (const c of state.coins) {
    if (c.collected) continue;
    const pulse = 0.8 + Math.sin(c.sparkle) * 0.2;
    const r = 8 * pulse;
    ctx.fillStyle = "#ffdd22";
    ctx.shadowColor = "#ffdd22";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Inner shine
    ctx.fillStyle = "#fff8cc";
    ctx.beginPath();
    ctx.arc(c.x - 2, c.y - 2, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Traffic ──
  for (const t of state.traffic) {
    drawTrafficCar(t);
  }

  // ── Particles (under darkness) ──
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Headlight effect ──
  if (state.phase !== "gameover") {
    drawHeadlights();
  } else {
    // Full darkness on crash (just a dim vignette)
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, W, H);
  }

  // ── Player car (drawn ON TOP of darkness so it's always visible) ──
  if (state.phase !== "gameover") {
    drawPlayerCar();
  }

  // ── Rain ──
  ctx.lineWidth = 1;
  for (const drop of state.rain) {
    ctx.strokeStyle = `rgba(180,200,255,${drop.alpha})`;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 0.5, drop.y + drop.len);
    ctx.stroke();
  }

  // ── HUD elements on canvas ──
  drawNitroBar();

  // ── Near-miss text ──
  if (state.nearMissDisplay > 0) {
    ctx.save();
    const t = state.nearMissDisplay;
    ctx.globalAlpha = Math.min(1, t);
    const scale = 1 + (1 - Math.min(1, t * 3)) * 0.3;
    ctx.font = `bold ${Math.round(20 * scale)}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffee33";
    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 18;
    ctx.fillText(state.nearMissText, W / 2, state.carY - 55 - (1 - t) * 15);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Milestone text ──
  if (state.milestoneTimer > 0) {
    ctx.save();
    const t = state.milestoneTimer;
    ctx.globalAlpha = Math.min(1, t);
    ctx.font = "bold 32px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = zoneBlend.lineColor;
    ctx.shadowBlur = 20;
    ctx.fillText(state.milestoneText, W / 2, 140 - (1.5 - t) * 10);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Zone announcement ──
  if (state.zoneTextTimer > 0 && state.phase === "playing") {
    ctx.save();
    const alpha = state.zoneTextTimer > 2 ? (2.5 - state.zoneTextTimer) * 2 : state.zoneTextTimer / 2;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = "bold 26px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = zoneBlend.lineColor;
    ctx.shadowColor = zoneBlend.lineColor;
    ctx.shadowBlur = 20;
    ctx.fillText(zones[state.zoneIndex].name.toUpperCase(), W / 2, 70);
    ctx.font = "14px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.shadowBlur = 0;
    ctx.fillText(`Zone ${state.zoneIndex + 1}`, W / 2, 92);
    ctx.restore();
  }

  // ── Speed indicator ──
  if (state.phase === "playing") {
    ctx.save();
    ctx.font = "bold 14px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = state.nitroActive ? "rgba(255,150,50,0.7)" : "rgba(255,255,255,0.35)";
    ctx.fillText(`${Math.floor(state.scrollSpeed * 0.8)} km/h`, W - 16, H - 16);
    ctx.restore();
  }

  // ── Mobile steering indicators ──
  if (isMobile && state.phase === "playing") {
    drawMobileTouchUI();
  }

  // ── Overlays ──
  if (state.phase === "start") {
    drawStartScreen(zoneBlend.lineColor);
  }
  if (state.phase === "gameover") {
    drawGameOverScreen();
  }

  ctx.restore();
}

function drawPlayerCar() {
  ctx.save();
  ctx.translate(state.carX, state.carY);
  ctx.rotate(state.steerAngle);

  // Ambient glow underneath car (makes it pop against dark road)
  ctx.fillStyle = "rgba(255,140,60,0.12)";
  ctx.shadowColor = "rgba(255,120,40,0.4)";
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.ellipse(0, 0, CAR_W / 2 + 12, CAR_H / 2 + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(3, 7, CAR_W / 2 + 2, CAR_H / 2 - 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Car body (brighter, more saturated)
  const bodyGrad = ctx.createLinearGradient(0, -CAR_H / 2, 0, CAR_H / 2);
  bodyGrad.addColorStop(0, "#ff8855");
  bodyGrad.addColorStop(0.4, "#ff5533");
  bodyGrad.addColorStop(1, "#dd2211");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H, [10, 10, 5, 5]);
  ctx.fill();

  // Bright edge highlight (left side)
  ctx.fillStyle = "rgba(255,200,150,0.2)";
  ctx.fillRect(-CAR_W / 2, -CAR_H / 2 + 4, 3, CAR_H - 8);

  // Body side stripe (racing stripe)
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(-CAR_W / 2 + 4, -CAR_H / 2 + 2, 3, CAR_H - 4);
  ctx.fillRect(CAR_W / 2 - 7, -CAR_H / 2 + 2, 3, CAR_H - 4);

  // Roof
  ctx.fillStyle = "rgba(255,120,70,0.25)";
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 6, -10, CAR_W - 12, 24, 4);
  ctx.fill();

  // Racing stripe (center)
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(-2, -CAR_H / 2, 4, CAR_H);

  // Side panel lines
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-CAR_W / 2 + 1, -CAR_H / 2 + 18);
  ctx.lineTo(CAR_W / 2 - 1, -CAR_H / 2 + 18);
  ctx.stroke();

  // Roof panel (darker rectangle)
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 5, -CAR_H / 2 + 19, CAR_W - 10, 12, 2);
  ctx.fill();

  // Windshield
  ctx.fillStyle = "rgba(130,200,255,0.5)";
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 5, -CAR_H / 2 + 7, CAR_W - 10, 15, 3);
  ctx.fill();
  // Windshield reflection
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(-CAR_W / 2 + 7, -CAR_H / 2 + 8, CAR_W / 2 - 4, 6);

  // Side mirrors
  ctx.fillStyle = "#dd3311";
  ctx.fillRect(-CAR_W / 2 - 4, -CAR_H / 2 + 10, 4, 5);
  ctx.fillRect(CAR_W / 2, -CAR_H / 2 + 10, 4, 5);

  // Rear window
  ctx.fillStyle = "rgba(100,160,220,0.3)";
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 6, CAR_H / 2 - 19, CAR_W - 12, 10, 2);
  ctx.fill();

  // Rear lights (big bright glowing)
  ctx.fillStyle = "#ff3300";
  ctx.shadowColor = "#ff2200";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 1, CAR_H / 2 - 7, 9, 5, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(CAR_W / 2 - 10, CAR_H / 2 - 7, 9, 5, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Headlights (bright white-yellow, very visible)
  ctx.fillStyle = "#fff4cc";
  ctx.shadowColor = "#ffe080";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 2, -CAR_H / 2 - 1, 9, 7, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(CAR_W / 2 - 11, -CAR_H / 2 - 1, 9, 7, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Nitro glow on exhaust
  if (state.nitroActive) {
    ctx.fillStyle = "rgba(255,100,10,0.5)";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.roundRect(-CAR_W / 2 - 3, CAR_H / 2 - 5, CAR_W + 6, 10, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawTrafficCar(t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(Math.PI); // oncoming = facing up (rotated 180)

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 4, t.w / 2 + 1, t.h / 2 - 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.roundRect(-t.w / 2, -t.h / 2, t.w, t.h, 4);
  ctx.fill();

  // Darker top half
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h / 2);

  // Windshield
  ctx.fillStyle = "rgba(80,160,220,0.3)";
  ctx.fillRect(-t.w / 2 + 3, -t.h / 2 + 4, t.w - 6, 9);

  // Headlights (face player since rotated)
  ctx.fillStyle = "#ffe8a0";
  ctx.shadowColor = "#ffe8a0";
  ctx.shadowBlur = 10;
  ctx.fillRect(-t.w / 2 + 2, t.h / 2 - 5, 5, 4);
  ctx.fillRect(t.w / 2 - 7, t.h / 2 - 5, 5, 4);
  ctx.shadowBlur = 0;

  // Headlight glow beams toward player
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffe8a0";
  ctx.beginPath();
  ctx.moveTo(-t.w / 2 + 4, t.h / 2);
  ctx.lineTo(-t.w / 2 - 20, t.h / 2 + 120);
  ctx.lineTo(-t.w / 2 + 28, t.h / 2 + 120);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(t.w / 2 - 4, t.h / 2);
  ctx.lineTo(t.w / 2 - 28, t.h / 2 + 120);
  ctx.lineTo(t.w / 2 + 20, t.h / 2 + 120);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawHeadlights() {
  ctx.save();

  // Darkness layer
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, W, H);

  // Cut out headlight cone
  ctx.globalCompositeOperation = "destination-out";

  // Cone follows steering slightly
  const coneOffsetX = state.steerAngle * 40;

  // Main headlight cone
  const coneGrad = ctx.createRadialGradient(
    state.carX + coneOffsetX * 0.3, state.carY - 60,
    15,
    state.carX + coneOffsetX, state.carY - 220,
    240
  );
  coneGrad.addColorStop(0, "rgba(255,255,255,0.98)");
  coneGrad.addColorStop(0.35, "rgba(255,255,255,0.75)");
  coneGrad.addColorStop(0.65, "rgba(255,255,255,0.35)");
  coneGrad.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(state.carX - 16, state.carY - CAR_H / 2);
  ctx.lineTo(state.carX - 160 + coneOffsetX, -30);
  ctx.lineTo(state.carX + 160 + coneOffsetX, -30);
  ctx.lineTo(state.carX + 16, state.carY - CAR_H / 2);
  ctx.fill();

  // Glow around car position (so the road near car is visible)
  const carGlow = ctx.createRadialGradient(
    state.carX, state.carY, 20,
    state.carX, state.carY, 110
  );
  carGlow.addColorStop(0, "rgba(255,255,255,0.9)");
  carGlow.addColorStop(0.35, "rgba(255,255,255,0.5)");
  carGlow.addColorStop(0.7, "rgba(255,255,255,0.15)");
  carGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = carGlow;
  ctx.fillRect(state.carX - 110, state.carY - 110, 220, 220);

  // Rear tail-light glow (see behind a little)
  const rearGlow = ctx.createRadialGradient(
    state.carX, state.carY + 60, 8,
    state.carX, state.carY + 90, 80
  );
  rearGlow.addColorStop(0, "rgba(255,255,255,0.35)");
  rearGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rearGlow;
  ctx.fillRect(state.carX - 80, state.carY + 10, 160, 160);

  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  // Warm headlight color wash
  ctx.save();
  ctx.globalAlpha = 0.06;
  const warmGrad = ctx.createRadialGradient(
    state.carX + coneOffsetX * 0.5, state.carY - 140,
    30,
    state.carX + coneOffsetX, state.carY - 250,
    260
  );
  warmGrad.addColorStop(0, "#ffe8a0");
  warmGrad.addColorStop(1, "transparent");
  ctx.fillStyle = warmGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawNitroBar() {
  if (state.phase !== "playing") return;

  const barW = 90;
  const barH = 10;
  const bx = 16;
  const by = H - 28;

  // Background
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.roundRect(bx, by, barW, barH, 5);
  ctx.fill();

  // Fill
  if (state.nitro > 0) {
    const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    grad.addColorStop(0, "#ff8c32");
    grad.addColorStop(1, state.nitroActive ? "#ff2200" : "#ffcc22");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW * state.nitro, barH, 5);
    ctx.fill();

    // Pulsing glow when full
    if (state.nitro >= 0.25) {
      ctx.shadowColor = "#ff8c32";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(255,140,50,0.15)";
      ctx.fillRect(bx, by, barW * state.nitro, barH);
      ctx.shadowBlur = 0;
    }
  }

  ctx.font = "bold 10px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.textAlign = "left";
  const label = isMobile ? "NITRO" : "NITRO [SPACE]";
  ctx.fillText(label, bx, by - 5);
}

function drawMobileTouchUI() {
  ctx.save();

  // Left steering zone indicator
  ctx.globalAlpha = state.touchL ? 0.15 : 0.04;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.25);
  ctx.lineTo(55, H * 0.5);
  ctx.lineTo(0, H * 0.75);
  ctx.fill();

  // Right steering zone indicator
  ctx.globalAlpha = state.touchR ? 0.15 : 0.04;
  ctx.beginPath();
  ctx.moveTo(W, H * 0.25);
  ctx.lineTo(W - 55, H * 0.5);
  ctx.lineTo(W, H * 0.75);
  ctx.fill();

  ctx.globalAlpha = 1;

  // Nitro button (bigger for fat fingers)
  const btnX = W / 2;
  const btnY = H - 50;
  const btnR = 38;
  const active = state.touchNitro;
  const canUse = state.nitro >= 0.25 && state.nitroCooldown <= 0;

  // Outer ring
  ctx.globalAlpha = canUse ? 0.2 : 0.06;
  ctx.fillStyle = canUse ? "#ff8c32" : "#555";
  ctx.beginPath();
  ctx.arc(btnX, btnY, btnR + 6, 0, Math.PI * 2);
  ctx.fill();

  // Button fill
  ctx.globalAlpha = canUse ? (active ? 0.55 : 0.3) : 0.08;
  ctx.fillStyle = canUse ? "#ff8c32" : "#666";
  ctx.beginPath();
  ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
  ctx.fill();

  if (canUse) {
    ctx.strokeStyle = "#ff8c32";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#ff8c32";
    ctx.shadowBlur = active ? 18 : 8;
    ctx.beginPath();
    ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = canUse ? 0.9 : 0.3;
  ctx.font = "bold 14px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText("NOS", btnX, btnY);
  ctx.textBaseline = "alphabetic";

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawStartScreen(color) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.textAlign = "center";
  ctx.font = "bold 44px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.fillText("PHANTOM", W / 2, H / 2 - 50);
  ctx.fillText("ROAD", W / 2, H / 2 - 2);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = "16px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(isMobile ? "Tap to drive" : "Press any key to drive", W / 2, H / 2 + 40);

  // Controls hint
  ctx.font = "13px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  if (isMobile) {
    ctx.fillText("Left / right side to steer", W / 2, H / 2 + 70);
    ctx.fillText("NOS button for nitro boost", W / 2, H / 2 + 88);

    // Fullscreen button (drawn on canvas)
    if (canFullscreen() && !document.fullscreenElement) {
      const fbY = H / 2 + 125;
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 60, fbY - 16, 120, 32, 8);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText("FULLSCREEN", W / 2, fbY + 4);
      ctx.globalAlpha = 1;
      // Store the button bounds for hit detection
      state._fsBtn = { x: W / 2 - 60, y: fbY - 16, w: 120, h: 32 };
    }
  } else {
    ctx.fillText("Arrow keys to steer  |  Space for nitro", W / 2, H / 2 + 70);
    ctx.fillText("Hug the edge to charge  |  Buzz traffic for bonus", W / 2, H / 2 + 88);
  }

  ctx.restore();
}

function drawGameOverScreen() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  // Title
  ctx.font = "bold 48px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "#ff3322";
  ctx.shadowColor = "#ff3322";
  ctx.shadowBlur = 30;
  ctx.fillText("WRECKED", W / 2, H / 2 - 40);
  ctx.shadowBlur = 0;

  // Score
  ctx.font = "bold 28px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(`${state.score}m`, W / 2, H / 2 + 10);

  // Best indicator
  if (state.score >= state.bestScore && state.score > 0) {
    ctx.font = "bold 16px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#ffcc22";
    ctx.fillText("NEW BEST!", W / 2, H / 2 + 35);
  }

  // Retry
  ctx.font = "15px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(isMobile ? "Tap to retry" : "Space or Enter to retry", W / 2, H / 2 + 70);

  ctx.restore();
}

// ── Game loop ────────────────────────────────────────────
function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

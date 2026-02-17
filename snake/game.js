/* ============================================================
   Snake — game.js
   Procedural audio · Haptic feedback · Neon visuals
   ============================================================ */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");
const muteButton = document.getElementById("muteButton");

const CELL = 20;
const COLS = canvas.width / CELL;   // 24
const ROWS = canvas.height / CELL;  // 24

/* ── State ─────────────────────────────────────────────────── */

const state = {
  phase: "idle",          // idle | playing | dead
  score: 0,
  best: 0,
  lastTime: 0,
  tickAccumulator: 0,
  tickInterval: 150,
  baseTickInterval: 150,
  minTickInterval: 60,
  arenaMin: 0,
  arenaMax: 23,
  arenaFlash: 0,
  lastShrinkScore: 0,
  scorePop: 0,
  scorePopValue: "",
  shakeTimer: 0,
  shakeIntensity: 0,
  eatFlash: 0,
  eatFlashColor: "255,255,255",
  particles: [],
  muted: false,
  speedBoostEnd: 0,       // timestamp when speed boost expires
  slowMoEnd: 0,           // timestamp when slow-mo expires
  savedTickInterval: 0,
  // Visual enhancement state
  dustMotes: [],           // ambient floating dust particles
  tongueVisible: true,     // tongue flicker toggle
  tongueTimer: 0,          // tongue flicker timer (ms)
  tongueWobble: 0,         // random wobble offset for tongue
  undulationTime: 0,       // continuous time for body undulation
  headEnlargeTimer: 0,     // timer for head enlarge on eat
  deathTime: 0,            // timestamp when death occurred
  deathPos: null,           // {x,y} pixel position of death (head)
  deathRingRadius: 0,      // expanding flash ring radius
  deathRingAlpha: 0,        // expanding flash ring alpha
  crackleParticles: [],    // electric crackle particles along wall edges
};

const snake = {
  segments: [],
  direction: { x: 1, y: 0 },
  directionQueue: [],
  growPending: 0,
  prevPositions: [],       // previous tick positions for interpolation
};

const food = {
  x: 0,
  y: 0,
  type: "normal",
  pulsePhase: 0,
  spawnAnim: 0,
};

/* ── Helpers ───────────────────────────────────────────────── */

function lerp(a, b, t) { return a + (b - a) * t; }

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function lerpColor(r1, g1, b1, r2, g2, b2, t) {
  return [
    Math.round(lerp(r1, r2, t)),
    Math.round(lerp(g1, g2, t)),
    Math.round(lerp(b1, b2, t)),
  ];
}

/* ── Haptics ───────────────────────────────────────────────── */

function vibrate(pattern) {
  if (navigator && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

const haptics = {
  eat:        () => vibrate(35),
  eatGolden:  () => vibrate([40, 25, 70, 25, 120]),
  eatSpeed:   () => vibrate([60, 30, 60]),
  death:      () => vibrate([200, 50, 200, 50, 200]),
  wallShrink: () => vibrate([30, 20, 30, 20, 30, 20, 30]),
  turn:       () => vibrate(15),
};

/* ── Audio Engine ──────────────────────────────────────────── */

let audioCtx = null;
let masterGain = null;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function getMaster() {
  getAudio();
  return masterGain;
}

function playSound(fn) {
  if (state.muted) return;
  fn(getAudio(), getMaster());
}

/* --- Eat: pop-crunch --- */
function soundEat(ctx, dest) {
  const t = ctx.currentTime;
  const startFreq = 580 + Math.random() * 40;

  // Tonal pop
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + 0.1);

  // Noise crunch
  const bufLen = Math.floor(ctx.sampleRate * 0.06);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  const ng = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  noise.buffer = buf;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(3000, t);
  filter.Q.setValueAtTime(1.5, t);
  ng.gain.setValueAtTime(0.12, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.connect(filter);
  filter.connect(ng);
  ng.connect(dest);
  noise.start(t);
  noise.stop(t + 0.06);
}

/* --- Golden eat: sparkle chime --- */
function soundGoldenEat(ctx, dest) {
  soundEat(ctx, dest);
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + i * 0.1);
    g.gain.setValueAtTime(0, t);
    g.gain.setValueAtTime(0.18, t + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
    osc.connect(g);
    g.connect(dest);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.25);
  });
}

/* --- Speed eat: urgent buzz --- */
function soundSpeedEat(ctx, dest) {
  soundEat(ctx, dest);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t);
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(30, t);
  lfoG.gain.setValueAtTime(40, t);
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  lfo.connect(lfoG);
  lfoG.connect(osc.frequency);
  osc.connect(g);
  g.connect(dest);
  lfo.start(t);
  osc.start(t);
  lfo.stop(t + 0.2);
  osc.stop(t + 0.2);
}

/* --- Move tick --- */
function soundTick(ctx, dest) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, t);
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + 0.025);
}

/* --- Death --- */
function soundDeath(ctx, dest) {
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(400, t);
  osc1.frequency.exponentialRampToValueAtTime(80, t + 0.8);
  g1.gain.setValueAtTime(0.2, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  osc1.connect(g1);
  g1.connect(dest);
  osc1.start(t);
  osc1.stop(t + 0.9);

  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(150, t);
  osc2.frequency.exponentialRampToValueAtTime(40, t + 0.8);
  g2.gain.setValueAtTime(0.18, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
  osc2.connect(g2);
  g2.connect(dest);
  osc2.start(t);
  osc2.stop(t + 1.0);
}

/* --- Wall warning --- */
function soundWallWarning(ctx, dest) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, t);
  lfo.type = "square";
  lfo.frequency.setValueAtTime(10, t);
  lfoG.gain.setValueAtTime(0.12, t);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  lfo.connect(lfoG);
  lfoG.connect(g.gain);
  osc.connect(g);
  g.connect(dest);
  lfo.start(t);
  osc.start(t);
  lfo.stop(t + 0.35);
  osc.stop(t + 0.35);
}

/* --- Ambient hum --- */
let ambientNodes = null;

function startAmbientHum() {
  if (state.muted || ambientNodes) return;
  const ctx = getAudio();
  const dest = getMaster();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(55, t);
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(0.3, t);
  lfoG.gain.setValueAtTime(0.015, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.04, t + 0.5);
  lfo.connect(lfoG);
  lfoG.connect(g.gain);
  osc.connect(g);
  g.connect(dest);
  lfo.start(t);
  osc.start(t);
  ambientNodes = { osc, g, lfo, lfoG };
}

function stopAmbientHum() {
  if (!ambientNodes) return;
  try {
    const ctx = getAudio();
    const t = ctx.currentTime;
    ambientNodes.g.gain.cancelScheduledValues(t);
    ambientNodes.g.gain.setValueAtTime(ambientNodes.g.gain.value, t);
    ambientNodes.g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    ambientNodes.osc.stop(t + 0.6);
    ambientNodes.lfo.stop(t + 0.6);
  } catch (_) { /* ignore */ }
  ambientNodes = null;
}

/* ── Mute ──────────────────────────────────────────────────── */

function loadMute() {
  state.muted = localStorage.getItem("snakeMuted") === "1";
  muteButton.textContent = state.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
  if (masterGain) {
    masterGain.gain.setValueAtTime(state.muted ? 0 : 1, audioCtx.currentTime);
  }
}

function toggleMute() {
  state.muted = !state.muted;
  localStorage.setItem("snakeMuted", state.muted ? "1" : "0");
  muteButton.textContent = state.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
  if (masterGain && audioCtx) {
    const t = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(state.muted ? 0 : 1, t + 0.05);
  }
  if (state.muted) {
    stopAmbientHum();
  } else if (state.phase === "playing") {
    startAmbientHum();
  }
}

/* ── Particles ─────────────────────────────────────────────── */

function spawnParticles(cx, cy, count, color, sizeMin, sizeMax, lifeMin, lifeMax, speedMin, speedMax) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const life = lifeMin + Math.random() * (lifeMax - lifeMin);
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
    });
  }
  if (state.particles.length > 200) {
    state.particles.splice(0, state.particles.length - 200);
  }
}

/* ── Dust Motes ────────────────────────────────────────────── */

function initDustMotes() {
  state.dustMotes = [];
  for (let i = 0; i < 8; i++) {
    state.dustMotes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      size: 1 + Math.random() * 1.5,
      alpha: 0.15 + Math.random() * 0.15,
    });
  }
}

function updateDustMotes(dt) {
  for (const m of state.dustMotes) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    // Wrap around canvas edges
    if (m.x < 0) m.x += canvas.width;
    if (m.x > canvas.width) m.x -= canvas.width;
    if (m.y < 0) m.y += canvas.height;
    if (m.y > canvas.height) m.y -= canvas.height;
  }
}

/* ── Food Spawning ─────────────────────────────────────────── */

function spawnFood() {
  const occupied = new Set();
  for (const seg of snake.segments) occupied.add(seg.x + "," + seg.y);

  const empty = [];
  for (let x = state.arenaMin; x <= state.arenaMax; x++) {
    for (let y = state.arenaMin; y <= state.arenaMax; y++) {
      if (!occupied.has(x + "," + y)) empty.push({ x, y });
    }
  }
  if (empty.length === 0) return;

  const spot = empty[Math.floor(Math.random() * empty.length)];
  food.x = spot.x;
  food.y = spot.y;
  food.spawnAnim = 0;
  food.pulsePhase = 0;

  const roll = Math.random();
  if (roll < 0.10) food.type = "speed";
  else if (roll < 0.25) food.type = "golden";
  else food.type = "normal";
}

/* ── Game Logic ────────────────────────────────────────────── */

function resetGame() {
  snake.segments = [{ x: 12, y: 12 }];
  snake.direction = { x: 1, y: 0 };
  snake.directionQueue = [];
  snake.growPending = 0;
  snake.prevPositions = [{ x: 12, y: 12 }];

  state.phase = "idle";
  state.score = 0;
  state.tickAccumulator = 0;
  state.tickInterval = state.baseTickInterval;
  state.arenaMin = 0;
  state.arenaMax = 23;
  state.arenaFlash = 0;
  state.lastShrinkScore = 0;
  state.scorePop = 0;
  state.shakeTimer = 0;
  state.shakeIntensity = 0;
  state.eatFlash = 0;
  state.particles = [];
  state.speedBoostEnd = 0;
  state.slowMoEnd = 0;
  state.savedTickInterval = 0;
  state.deathTime = 0;
  state.deathPos = null;
  state.deathRingRadius = 0;
  state.deathRingAlpha = 0;
  state.crackleParticles = [];
  state.tongueVisible = true;
  state.tongueTimer = 0;
  state.tongueWobble = 0;
  state.undulationTime = 0;
  state.headEnlargeTimer = 0;

  initDustMotes();

  scoreLabel.textContent = "0";
  spawnFood();
  stopAmbientHum();
}

function queueDirection(dir) {
  if (state.phase === "idle") {
    state.phase = "playing";
    state.lastTime = 0;
    startAmbientHum();
  }
  if (state.phase !== "playing") return;

  const queue = snake.directionQueue;
  const lastDir = queue.length > 0 ? queue[queue.length - 1] : snake.direction;

  if (dir.x === -lastDir.x && dir.y === -lastDir.y) return;
  if (dir.x === lastDir.x && dir.y === lastDir.y) return;

  if (queue.length < 2) {
    queue.push({ x: dir.x, y: dir.y });
    haptics.turn();
    spawnParticles(
      (snake.segments[0].x + 0.5) * CELL,
      (snake.segments[0].y + 0.5) * CELL,
      3, "rgba(57,255,20,0.4)", 1, 2, 0.15, 0.2, 30, 60
    );
  }
}

function getTickInterval() {
  return Math.max(state.minTickInterval, state.baseTickInterval - (state.score * 2.5));
}

function tick(now) {
  // Apply queued direction
  if (snake.directionQueue.length > 0) {
    snake.direction = snake.directionQueue.shift();
  }

  // Store previous positions for interpolation
  snake.prevPositions = snake.segments.map(s => ({ x: s.x, y: s.y }));

  // New head
  const head = snake.segments[0];
  const newHead = { x: head.x + snake.direction.x, y: head.y + snake.direction.y };

  // Wall collision
  if (newHead.x < state.arenaMin || newHead.x > state.arenaMax ||
      newHead.y < state.arenaMin || newHead.y > state.arenaMax) {
    die();
    return;
  }

  // Self collision
  const checkLen = snake.growPending > 0 ? snake.segments.length : snake.segments.length - 1;
  for (let i = 0; i < checkLen; i++) {
    if (snake.segments[i].x === newHead.x && snake.segments[i].y === newHead.y) {
      die();
      return;
    }
  }

  // Check food
  if (newHead.x === food.x && newHead.y === food.y) {
    eatFood(now);
  }

  // Move
  snake.segments.unshift(newHead);
  if (snake.growPending > 0) {
    snake.growPending--;
  } else {
    snake.segments.pop();
  }

  // Update speed based on score + power-ups
  let interval = getTickInterval();
  if (now < state.speedBoostEnd) {
    interval = Math.max(40, interval - 30);
  } else if (now < state.slowMoEnd) {
    interval = interval + 40;
  }
  state.tickInterval = interval;

  // Move tick sound
  playSound(soundTick);
}

function eatFood(now) {
  const px = (food.x + 0.5) * CELL;
  const py = (food.y + 0.5) * CELL;

  if (food.type === "normal") {
    state.score += 1;
    snake.growPending += 1;
    playSound(soundEat);
    haptics.eat();
    state.eatFlash = 0.15;
    state.eatFlashColor = "255,190,11";
    state.scorePopValue = "+1";
    spawnParticles(px, py, 12, "#ffbe0b", 2, 4, 0.3, 0.6, 60, 150);
  } else if (food.type === "golden") {
    state.score += 3;
    snake.growPending += 3;
    playSound(soundGoldenEat);
    haptics.eatGolden();
    state.eatFlash = 0.25;
    state.eatFlashColor = "255,215,0";
    state.scorePopValue = "+3";
    state.slowMoEnd = now + 3000;
    state.speedBoostEnd = 0;
    spawnParticles(px, py, 18, "#ffd700", 2, 5, 0.4, 0.7, 80, 180);
  } else {
    state.score += 1;
    snake.growPending += 1;
    playSound(soundSpeedEat);
    haptics.eatSpeed();
    state.eatFlash = 0.2;
    state.eatFlashColor = "255,0,110";
    state.scorePopValue = "+1";
    state.speedBoostEnd = now + 5000;
    state.slowMoEnd = 0;
    spawnParticles(px, py, 12, "#ff006e", 2, 4, 0.3, 0.6, 60, 150);
  }

  state.scorePop = 1.0;
  state.headEnlargeTimer = 0.2; // 200ms head enlarge on eat
  scoreLabel.textContent = state.score;

  // Arena shrink check
  if (state.score > 0 && state.score % 15 === 0 && state.score !== state.lastShrinkScore) {
    if (state.arenaMin < 6) {
      state.arenaMin += 1;
      state.arenaMax -= 1;
      state.arenaFlash = 1.0;
      state.lastShrinkScore = state.score;
      spawnCrackleParticles();
      playSound(soundWallWarning);
      haptics.wallShrink();

      // Clamp snake segments into new arena bounds
      for (const seg of snake.segments) {
        if (seg.x < state.arenaMin) seg.x = state.arenaMin;
        if (seg.x > state.arenaMax) seg.x = state.arenaMax;
        if (seg.y < state.arenaMin) seg.y = state.arenaMin;
        if (seg.y > state.arenaMax) seg.y = state.arenaMax;
      }
    }
  }

  spawnFood();
}

function die() {
  state.phase = "dead";
  playSound(soundDeath);
  haptics.death();
  state.shakeTimer = 15;
  state.shakeIntensity = 8;
  stopAmbientHum();

  // Death animation state: record death position and time
  const head = snake.segments[0];
  state.deathPos = { x: (head.x + 0.5) * CELL, y: (head.y + 0.5) * CELL };
  state.deathTime = performance.now();
  state.deathRingRadius = 0;
  state.deathRingAlpha = 1.0;

  // Death particles from each segment
  for (let i = 0; i < snake.segments.length; i++) {
    const seg = snake.segments[i];
    const t = i / Math.max(1, snake.segments.length - 1);
    const [r, g, b] = lerpColor(57, 255, 20, 0, 184, 148, t);
    spawnParticles(
      (seg.x + 0.5) * CELL, (seg.y + 0.5) * CELL,
      3, `rgb(${r},${g},${b})`, 3, 5, 0.5, 1.0, 40, 120
    );
  }

  // Save best
  if (state.score > state.best) {
    state.best = state.score;
    bestScoreLabel.textContent = state.best;
    localStorage.setItem("snakeBest", String(state.best));
  }
}

/* ── Drawing ───────────────────────────────────────────────── */

function drawBackground() {
  ctx.fillStyle = "#0a0f0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dark radial vignette toward corners
  const vignetteGrad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.25,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.75
  );
  vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
  vignetteGrad.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer wall area (darker)
  if (state.arenaMin > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    const amin = state.arenaMin * CELL;
    const amax = (state.arenaMax + 1) * CELL;
    ctx.fillRect(0, 0, canvas.width, amin);                   // top
    ctx.fillRect(0, amax, canvas.width, canvas.height - amax); // bottom
    ctx.fillRect(0, amin, amin, amax - amin);                  // left
    ctx.fillRect(amax, amin, canvas.width - amax, amax - amin); // right
  }

  // Grid lines inside arena
  ctx.strokeStyle = "rgba(0, 255, 100, 0.04)";
  ctx.lineWidth = 1;
  const minPx = state.arenaMin * CELL;
  const maxPx = (state.arenaMax + 1) * CELL;
  for (let i = state.arenaMin; i <= state.arenaMax + 1; i++) {
    const p = i * CELL;
    ctx.beginPath();
    ctx.moveTo(p, minPx);
    ctx.lineTo(p, maxPx);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(minPx, p);
    ctx.lineTo(maxPx, p);
    ctx.stroke();
  }

  // Ambient floating dust motes
  for (const m of state.dustMotes) {
    ctx.save();
    ctx.globalAlpha = m.alpha;
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(57,255,20,0.3)";
    ctx.fillStyle = "rgba(57,255,20,0.5)";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawArenaWalls() {
  const amin = state.arenaMin * CELL;
  const amax = (state.arenaMax + 1) * CELL;
  const size = amax - amin;

  // Wall color — flash red on shrink
  let r = 57, g = 255, b = 20, a = 0.3;
  if (state.arenaFlash > 0) {
    r = Math.round(lerp(57, 255, state.arenaFlash));
    g = Math.round(lerp(255, 68, state.arenaFlash));
    b = Math.round(lerp(20, 68, state.arenaFlash));
    a = lerp(0.3, 0.8, state.arenaFlash);
  }

  ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(amin, amin, size, size);

  // Danger glow when small
  if (state.arenaMin >= 4) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(255,68,68,0.3)`;
    ctx.strokeStyle = "rgba(255,68,68,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(amin, amin, size, size);
    ctx.restore();
  }

  // Electric crackle particles along wall edge during arena flash
  if (state.arenaFlash > 0) {
    drawCrackleParticles();
  }
}

function spawnCrackleParticles() {
  // Spawn electric crackle particles along the new wall edges
  const amin = state.arenaMin * CELL;
  const amax = (state.arenaMax + 1) * CELL;
  const count = 20;
  state.crackleParticles = [];
  for (let i = 0; i < count; i++) {
    // Pick a random edge: 0=top, 1=bottom, 2=left, 3=right
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = amin + Math.random() * (amax - amin); y = amin; }
    else if (edge === 1) { x = amin + Math.random() * (amax - amin); y = amax; }
    else if (edge === 2) { x = amin; y = amin + Math.random() * (amax - amin); }
    else { x = amax; y = amin + Math.random() * (amax - amin); }
    const life = 0.6 + Math.random() * 0.5;
    state.crackleParticles.push({
      x, y,
      ox: x + (Math.random() - 0.5) * 6,
      oy: y + (Math.random() - 0.5) * 6,
      life,
      maxLife: life,
      size: 1.5 + Math.random() * 2,
    });
  }
}

function updateCrackleParticles(dt) {
  for (let i = state.crackleParticles.length - 1; i >= 0; i--) {
    const p = state.crackleParticles[i];
    p.life -= dt;
    // Snap to a new random offset along the edge each frame for electric effect
    p.ox = p.x + (Math.random() - 0.5) * 8;
    p.oy = p.y + (Math.random() - 0.5) * 8;
    if (p.life <= 0) {
      state.crackleParticles.splice(i, 1);
    }
  }
}

function drawCrackleParticles() {
  for (const p of state.crackleParticles) {
    const frac = p.life / p.maxLife;
    const alpha = frac;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(150,255,255,0.8)";
    // Alternate between white and cyan for electric look
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#88ffff";
    ctx.beginPath();
    ctx.arc(p.ox, p.oy, p.size * frac, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSnake(movePhase) {
  const segs = snake.segments;
  const prev = snake.prevPositions;
  const isDead = state.phase === "dead";
  const deathElapsed = isDead && state.deathTime > 0 ? (performance.now() - state.deathTime) / 1000 : 0;

  // Precompute interpolated positions for all segments
  const positions = [];
  for (let i = 0; i < segs.length; i++) {
    const cur = segs[i];
    const prv = prev[i] || cur;
    let rx = lerp(prv.x, cur.x, movePhase);
    let ry = lerp(prv.y, cur.y, movePhase);
    let cx = (rx + 0.5) * CELL;
    let cy = (ry + 0.5) * CELL;

    // Body undulation: sine-wave offset perpendicular to travel direction
    if (i > 0 && !isDead) {
      const dir = snake.direction;
      const undulationAmp = 2.0;
      const undulationFreq = 1.2;
      const wave = Math.sin(state.undulationTime + i * undulationFreq) * undulationAmp;
      // Offset perpendicular to direction of travel
      cx += -dir.y * wave;
      cy += dir.x * wave;
    }

    // Death scatter: segments fly apart from center
    if (isDead && deathElapsed > 0 && state.deathPos) {
      const dx = cx - state.deathPos.x;
      const dy = cy - state.deathPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const scatterForce = deathElapsed * 120 * (1 + i * 0.3);
      cx += (dx / dist) * scatterForce;
      cy += (dy / dist) * scatterForce;
    }

    positions.push({ cx, cy });
  }

  // Draw connecting arcs between adjacent body segments (back to front)
  for (let i = segs.length - 1; i >= 1; i--) {
    const p1 = positions[i];
    const p2 = positions[i - 1];
    const t = segs.length > 1 ? i / (segs.length - 1) : 0;
    const [cr, cg, cb] = lerpColor(57, 255, 20, 0, 184, 148, t);
    const alpha = Math.max(0.3, 1 - t * 0.7);

    // Joint circle between adjacent segments
    const jx = (p1.cx + p2.cx) / 2;
    const jy = (p1.cy + p2.cy) / 2;
    ctx.save();
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.7})`;
    ctx.beginPath();
    ctx.arc(jx, jy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = segs.length - 1; i >= 0; i--) {
    const { cx, cy } = positions[i];
    const t = segs.length > 1 ? i / (segs.length - 1) : 0;

    // Skip rendering if scattered too far off screen during death
    if (isDead && (cx < -50 || cx > canvas.width + 50 || cy < -50 || cy > canvas.height + 50)) continue;

    if (i === 0) {
      // Head — briefly enlarges on eat
      const enlargeScale = state.headEnlargeTimer > 0 ? 1 + state.headEnlargeTimer * 2.5 : 1;
      const headSize = Math.round(18 * enlargeScale);
      const half = headSize / 2;

      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(57, 255, 20, 0.6)";

      const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, half);
      grad.addColorStop(0, "#39ff14");
      grad.addColorStop(1, "#00cc44");
      ctx.fillStyle = grad;

      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, headSize, headSize, 5);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, headSize, headSize);
      }
      ctx.restore();

      // Eyes
      const dir = snake.direction;
      let e1x, e1y, e2x, e2y;
      if (dir.x === 1) { e1x = 4; e1y = -4; e2x = 4; e2y = 4; }
      else if (dir.x === -1) { e1x = -4; e1y = -4; e2x = -4; e2y = 4; }
      else if (dir.y === -1) { e1x = -4; e1y = -4; e2x = 4; e2y = -4; }
      else { e1x = -4; e1y = 4; e2x = 4; e2y = 4; }

      // Eye whites
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx + e1x, cy + e1y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + e2x, cy + e2y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = "#0a0f0a";
      ctx.beginPath();
      ctx.arc(cx + e1x + dir.x * 0.8, cy + e1y + dir.y * 0.8, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + e2x + dir.x * 0.8, cy + e2y + dir.y * 0.8, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Flickering forked tongue
      if (state.tongueVisible && !isDead) {
        const tongueLen = 8 + Math.random() * 2;
        const forkLen = 4;
        const forkAngle = 0.35;
        const wobble = state.tongueWobble;

        // Tongue base point (front of head)
        const baseTx = cx + dir.x * half;
        const baseTy = cy + dir.y * half;

        // Tongue direction angle
        const tongueAngle = Math.atan2(dir.y, dir.x) + wobble;

        // Tongue tip
        const tipX = baseTx + Math.cos(tongueAngle) * tongueLen;
        const tipY = baseTy + Math.sin(tongueAngle) * tongueLen;

        // Fork prongs
        const fork1X = tipX + Math.cos(tongueAngle + forkAngle) * forkLen;
        const fork1Y = tipY + Math.sin(tongueAngle + forkAngle) * forkLen;
        const fork2X = tipX + Math.cos(tongueAngle - forkAngle) * forkLen;
        const fork2Y = tipY + Math.sin(tongueAngle - forkAngle) * forkLen;

        ctx.save();
        ctx.strokeStyle = "#ff2244";
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        // Main tongue line
        ctx.beginPath();
        ctx.moveTo(baseTx, baseTy);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        // Fork prong 1
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(fork1X, fork1Y);
        ctx.stroke();
        // Fork prong 2
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(fork2X, fork2Y);
        ctx.stroke();
        ctx.restore();
      }

    } else {
      // Body
      const bodySize = 16;
      const half = bodySize / 2;
      const alpha = Math.max(0.3, 1 - t * 0.7);
      const [cr, cg, cb] = lerpColor(57, 255, 20, 0, 184, 148, t);

      ctx.save();
      const glowAmt = Math.max(0, 8 * (1 - t));
      if (glowAmt > 0) {
        ctx.shadowBlur = glowAmt;
        ctx.shadowColor = `rgba(${cr},${cg},${cb},0.4)`;
      }

      // Radial gradient: lighter center, darker outer edge
      const segGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, half + 1);
      const lightenAmt = 40;
      const lightR = Math.min(255, cr + lightenAmt);
      const lightG = Math.min(255, cg + lightenAmt);
      const lightB = Math.min(255, cb + lightenAmt);
      const darkR = Math.max(0, cr - 30);
      const darkG = Math.max(0, cg - 30);
      const darkB = Math.max(0, cb - 30);
      segGrad.addColorStop(0, `rgba(${lightR},${lightG},${lightB},${alpha})`);
      segGrad.addColorStop(1, `rgba(${darkR},${darkG},${darkB},${alpha})`);
      ctx.fillStyle = segGrad;

      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, bodySize, bodySize, 4);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, bodySize, bodySize);
      }

      ctx.restore();
    }
  }
}

function drawFood(dt) {
  food.pulsePhase += dt * 4;
  food.spawnAnim = Math.min(1, food.spawnAnim + dt * 5);
  const ease = 1 - Math.pow(1 - food.spawnAnim, 3); // ease-out cubic

  const cx = (food.x + 0.5) * CELL;
  const cy = (food.y + 0.5) * CELL;

  ctx.save();

  if (food.type === "normal") {
    const pulse = 8 + Math.sin(food.pulsePhase) * 4;
    const r = 7 * ease;

    // Gentle spin/rotation: rotate canvas around food center
    ctx.translate(cx, cy);
    ctx.rotate(food.pulsePhase * 0.5);
    ctx.translate(-cx, -cy);

    ctx.shadowBlur = pulse;
    ctx.shadowColor = "rgba(255,190,11,0.5)";
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, "#ffbe0b");
    grad.addColorStop(1, "#ff9500");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner sparkle highlight: small white dot that orbits inside
    const sparkleAngle = food.pulsePhase * 2.5;
    const sparkleR = r * 0.4;
    const sparkleX = cx + Math.cos(sparkleAngle) * sparkleR;
    const sparkleY = cy + Math.sin(sparkleAngle) * sparkleR;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (food.type === "golden") {
    const pulse = 12 + Math.sin(food.pulsePhase) * 6;
    const r = 8 * ease;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = "rgba(255,215,0,0.7)";
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner sparkle highlight
    const sparkleAngle = food.pulsePhase * 3;
    const sparkleR = r * 0.35;
    const sparkleX = cx + Math.cos(sparkleAngle) * sparkleR;
    const sparkleY = cy + Math.sin(sparkleAngle) * sparkleR;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
    ctx.fill();

    // 5 orbiting mini-particles (slightly larger gold dots)
    for (let i = 0; i < 5; i++) {
      const angle = food.pulsePhase * 1.5 + (i * Math.PI * 2 / 5);
      const sx = cx + Math.cos(angle) * 13;
      const sy = cy + Math.sin(angle) * 13;
      ctx.fillStyle = "rgba(255,230,100,0.7)";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(255,215,0,0.5)";
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    const pulse = 8 + Math.sin(food.pulsePhase * 8) * 5;
    const scaleOsc = 0.85 + Math.sin(food.pulsePhase * 8) * 0.15;
    const r = 7 * ease * scaleOsc;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = "rgba(255,0,110,0.5)";
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, "#ff006e");
    grad.addColorStop(1, "#cc0058");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Motion-blur streaks behind the speed food (2-3 streaks radiating backward)
    ctx.strokeStyle = "rgba(255,0,110,0.35)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const streakAngle = Math.PI + (i - 1) * 0.4 + food.pulsePhase * 3;
      const startX = cx + Math.cos(streakAngle) * (r + 1);
      const startY = cy + Math.sin(streakAngle) * (r + 1);
      const endX = cx + Math.cos(streakAngle) * (r + 8 + Math.sin(food.pulsePhase * 6 + i) * 3);
      const endY = cy + Math.sin(streakAngle) * (r + 8 + Math.sin(food.pulsePhase * 6 + i) * 3);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    const frac = p.life / p.maxLife;
    const r = p.size * frac;
    ctx.save();
    ctx.globalAlpha = frac;
    ctx.shadowBlur = r * 2;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawScorePop() {
  if (state.scorePop <= 0) return;
  const scale = 1 + state.scorePop * 0.5;
  const alpha = state.scorePop;
  const yOff = (1 - state.scorePop) * -20;
  ctx.save();
  ctx.translate(canvas.width / 2, 50 + yOff);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.font = "bold 24px 'Trebuchet MS'";
  ctx.textAlign = "center";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(57,255,20,0.6)";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(state.scorePopValue, 0, 0);
  ctx.restore();
  state.scorePop *= 0.90;
  if (state.scorePop < 0.02) state.scorePop = 0;
}

function drawDeathRing() {
  if (state.deathRingAlpha <= 0 || !state.deathPos) return;
  ctx.save();
  ctx.globalAlpha = state.deathRingAlpha;
  ctx.strokeStyle = "#39ff14";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "rgba(57,255,20,0.8)";
  ctx.lineWidth = 3 * state.deathRingAlpha;
  ctx.beginPath();
  ctx.arc(state.deathPos.x, state.deathPos.y, state.deathRingRadius, 0, Math.PI * 2);
  ctx.stroke();
  // Inner white ring
  ctx.globalAlpha = state.deathRingAlpha * 0.5;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * state.deathRingAlpha;
  ctx.beginPath();
  ctx.arc(state.deathPos.x, state.deathPos.y, state.deathRingRadius * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEatFlash() {
  if (state.eatFlash <= 0) return;
  ctx.fillStyle = `rgba(${state.eatFlashColor},${state.eatFlash})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  state.eatFlash *= 0.85;
  if (state.eatFlash < 0.01) state.eatFlash = 0;
}

function drawOverlay(title, subtitle, extra) {
  const vg = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.1,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.7
  );
  vg.addColorStop(0, "rgba(0,0,0,0.25)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.font = "bold 34px 'Trebuchet MS'";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2 + 1, canvas.height / 2 - 15);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 16);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "16px 'Trebuchet MS'";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 18);

  if (extra) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px 'Trebuchet MS'";
    ctx.fillText(extra, canvas.width / 2, canvas.height / 2 + 48);
  }
}

/* ── Main Loop ─────────────────────────────────────────────── */

function gameLoop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const rawDelta = timestamp - state.lastTime;
  state.lastTime = timestamp;
  const dt = Math.min(rawDelta, 33) / 1000; // seconds, capped

  // Decay arena flash
  if (state.arenaFlash > 0) {
    state.arenaFlash *= 0.94;
    if (state.arenaFlash < 0.01) state.arenaFlash = 0;
  }

  // Decay screen shake
  if (state.shakeTimer > 0) {
    state.shakeTimer--;
    state.shakeIntensity *= 0.82;
  }

  // Update dust motes
  updateDustMotes(dt);

  // Update undulation time + head enlarge
  state.undulationTime += rawDelta * 0.004; // smooth continuous timer
  if (state.headEnlargeTimer > 0) {
    state.headEnlargeTimer = Math.max(0, state.headEnlargeTimer - dt);
  }

  // Update tongue flicker (~300ms toggle)
  state.tongueTimer += rawDelta;
  if (state.tongueTimer >= 300) {
    state.tongueTimer -= 300;
    state.tongueVisible = !state.tongueVisible;
    state.tongueWobble = (Math.random() - 0.5) * 0.3;
  }

  // Update crackle particles
  if (state.crackleParticles.length > 0) {
    updateCrackleParticles(dt);
  }

  // Update death flash ring
  if (state.deathRingAlpha > 0 && state.deathPos) {
    state.deathRingRadius += dt * 200;
    state.deathRingAlpha -= dt * 1.5;
    if (state.deathRingAlpha < 0) state.deathRingAlpha = 0;
  }

  // Logic ticks
  if (state.phase === "playing") {
    state.tickAccumulator += rawDelta;
    while (state.tickAccumulator >= state.tickInterval) {
      state.tickAccumulator -= state.tickInterval;
      tick(timestamp);
      if (state.phase !== "playing") break;
    }
  }

  // Move phase for interpolation
  const movePhase = state.phase === "playing"
    ? Math.min(1, state.tickAccumulator / state.tickInterval)
    : 1;

  // Draw
  ctx.save();
  if (state.shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * state.shakeIntensity;
    const sy = (Math.random() - 0.5) * state.shakeIntensity;
    ctx.translate(sx, sy);
  }

  drawBackground();
  drawArenaWalls();
  drawFood(dt);
  drawSnake(movePhase);
  drawParticles(dt);
  drawDeathRing();
  drawScorePop();
  drawEatFlash();

  if (state.phase === "idle") {
    drawOverlay("Snake", "Arrow keys or swipe to start");
  } else if (state.phase === "dead") {
    const extra = state.score === state.best && state.score > 0 ? "New Best!" : null;
    drawOverlay("Game Over", `Score: ${state.score}`, extra);
  }

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

/* ── Input ─────────────────────────────────────────────────── */

const keyMap = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y: 1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW:       { x: 0, y: -1 },
  KeyS:       { x: 0, y: 1 },
  KeyA:       { x: -1, y: 0 },
  KeyD:       { x: 1, y: 0 },
};

window.addEventListener("keydown", (e) => {
  // Init audio context on first interaction
  getAudio();

  const dir = keyMap[e.code];
  if (dir) {
    e.preventDefault();
    if (state.phase === "dead") {
      resetGame();
    }
    queueDirection(dir);
  }
  if (e.code === "Space") {
    e.preventDefault();
    if (state.phase === "dead") resetGame();
  }
});

/* Touch / Swipe */
let touchStart = null;

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  getAudio();
  touchStart = { x: e.clientX, y: e.clientY };
  if (state.phase === "dead") resetGame();
});

canvas.addEventListener("pointermove", (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  const threshold = 20;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    queueDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
  } else {
    queueDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }
  touchStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("pointerup", () => { touchStart = null; });
canvas.addEventListener("pointercancel", () => { touchStart = null; });

/* Buttons */
restartButton.addEventListener("click", () => { resetGame(); });
muteButton.addEventListener("click", () => { toggleMute(); });

/* ── Init ──────────────────────────────────────────────────── */

function loadBestScore() {
  const stored = Number(localStorage.getItem("snakeBest"));
  if (!Number.isNaN(stored) && stored > 0) {
    state.best = stored;
    bestScoreLabel.textContent = state.best;
  }
}

loadBestScore();
loadMute();
resetGame();
requestAnimationFrame(gameLoop);

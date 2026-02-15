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
  scoreLabel.textContent = state.score;

  // Arena shrink check
  if (state.score > 0 && state.score % 15 === 0 && state.score !== state.lastShrinkScore) {
    if (state.arenaMin < 6) {
      state.arenaMin += 1;
      state.arenaMax -= 1;
      state.arenaFlash = 1.0;
      state.lastShrinkScore = state.score;
      playSound(soundWallWarning);
      haptics.wallShrink();

      // Check if snake is now inside wall
      for (const seg of snake.segments) {
        if (seg.x < state.arenaMin || seg.x > state.arenaMax ||
            seg.y < state.arenaMin || seg.y > state.arenaMax) {
          die();
          return;
        }
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
}

function drawSnake(movePhase) {
  const segs = snake.segments;
  const prev = snake.prevPositions;

  for (let i = segs.length - 1; i >= 0; i--) {
    const cur = segs[i];
    const prv = prev[i] || cur;

    const rx = lerp(prv.x, cur.x, movePhase);
    const ry = lerp(prv.y, cur.y, movePhase);
    const cx = (rx + 0.5) * CELL;
    const cy = (ry + 0.5) * CELL;

    const t = segs.length > 1 ? i / (segs.length - 1) : 0;

    if (i === 0) {
      // Head
      const headSize = 18;
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

      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, bodySize, bodySize, 4);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, bodySize, bodySize);
      }

      // Inner highlight
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(cx - half + 1, cy - half + 1, bodySize / 2 - 1, bodySize / 2 - 1);

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
    ctx.shadowBlur = pulse;
    ctx.shadowColor = "rgba(255,190,11,0.5)";
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, "#ffbe0b");
    grad.addColorStop(1, "#ff9500");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
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

    // Orbiting sparkles
    for (let i = 0; i < 3; i++) {
      const angle = food.pulsePhase * 1.5 + (i * Math.PI * 2 / 3);
      const sx = cx + Math.cos(angle) * 12;
      const sy = cy + Math.sin(angle) * 12;
      ctx.fillStyle = "rgba(255,255,200,0.6)";
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
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

// ── Phantom Road ─────────────────────────────────────────
// Top-down night driving game with headlight visibility,
// procedural winding road, oncoming traffic, near-miss
// scoring, and nitro boost.
// ─────────────────────────────────────────────────────────

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;   // 480
const H = canvas.height;  // 720

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("bestScore");
const muteBtn = document.getElementById("muteButton");
const restartBtn = document.getElementById("restartButton");

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

  // Continuous engine drone
  let engineOsc = null;
  let engineGain = null;

  const startEngine = () => {
    if (muted || engineOsc) return;
    const ac = getCtx();
    engineOsc = ac.createOscillator();
    engineGain = ac.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0.06;
    engineOsc.connect(engineGain).connect(ac.destination);
    engineOsc.start();
  };

  const updateEngine = (speed) => {
    if (!engineOsc) return;
    engineOsc.frequency.value = 55 + speed * 0.35;
    engineGain.gain.value = Math.min(0.1, 0.04 + speed * 0.0002);
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
    o.type = "sine";
    o.frequency.value = 880;
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
    o.frequency.setValueAtTime(220, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.12);
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.2);
  });

  const crash = () => play((ac) => {
    const bufSize = ac.sampleRate * 0.3;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(0.3, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    src.connect(g).connect(ac.destination);
    src.start();
  });

  const toggleMute = () => {
    muted = !muted;
    if (muted) stopEngine();
    muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
  };

  return { play, startEngine, updateEngine, stopEngine, nearMiss, nitroSound, crash, toggleMute, isMuted: () => muted };
})();

// ── State ────────────────────────────────────────────────
const ROAD_WIDTH = 200;
const CAR_W = 28;
const CAR_H = 48;
const LANE_COUNT = 3;

const zones = [
  { name: "Suburbs",    roadColor: "#333",  lineColor: "#ff8c32", fogColor: "#0a0a18", dist: 0 },
  { name: "Highway",    roadColor: "#2a2a3a", lineColor: "#ffcc44", fogColor: "#08081a", dist: 500 },
  { name: "Mountains",  roadColor: "#252535", lineColor: "#44ddff", fogColor: "#060820", dist: 1500 },
  { name: "Desert",     roadColor: "#302820", lineColor: "#ff5544", fogColor: "#100808", dist: 3000 },
  { name: "Void",       roadColor: "#181828", lineColor: "#cc44ff", fogColor: "#040410", dist: 5000 },
];

let state;

function initState() {
  state = {
    phase: "start", // start | playing | gameover
    lastTime: 0,

    // Car
    carX: W / 2,
    carY: H * 0.75,
    carSpeed: 0,
    steerInput: 0,       // -1 left, +1 right
    steerAngle: 0,

    // Road
    roadCenterX: W / 2,
    roadTargetX: W / 2,
    roadCurve: 0,
    roadSegments: [],    // pre-generated road segments
    segTimer: 0,

    // Scrolling
    scrollSpeed: 120,    // px/s
    baseSpeed: 120,
    distance: 0,

    // Traffic
    traffic: [],
    trafficTimer: 0,

    // Near-miss
    nearMissCombo: 0,
    nearMissDisplay: 0,
    nearMissText: "",

    // Nitro
    nitro: 0,            // 0-1
    nitroActive: false,
    nitroCooldown: 0,

    // Particles
    particles: [],

    // Road markings
    markingOffset: 0,

    // Shake
    shakeTime: 0,
    shakeIntensity: 0,

    // Score
    score: 0,
    bestScore: parseInt(localStorage.getItem("phantomRoadBest") || "0", 10),

    // Zone
    zoneIndex: 0,
    zoneText: "",
    zoneTextTimer: 0,

    // Road width narrows slightly over time
    currentRoadWidth: ROAD_WIDTH,
  };
  bestEl.textContent = state.bestScore;
}

initState();

// ── Input ────────────────────────────────────────────────
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();

  if (state.phase === "start") startGame();
  else if (state.phase === "gameover" && e.key === " ") restartGame();
});
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// Touch controls
let touchStartX = null;
let touchCurrentX = null;
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (state.phase === "start") { startGame(); return; }
  if (state.phase === "gameover") { restartGame(); return; }
  touchStartX = e.clientX;
  touchCurrentX = e.clientX;
});
canvas.addEventListener("pointermove", (e) => {
  if (touchStartX !== null) touchCurrentX = e.clientX;
});
canvas.addEventListener("pointerup", () => { touchStartX = null; touchCurrentX = null; });
canvas.addEventListener("pointercancel", () => { touchStartX = null; touchCurrentX = null; });

restartBtn.addEventListener("click", restartGame);
muteBtn.addEventListener("click", () => audio.toggleMute());

// ── Game lifecycle ───────────────────────────────────────
function startGame() {
  initState();
  state.phase = "playing";
  audio.startEngine();
}

function restartGame() {
  audio.stopEngine();
  startGame();
}

function gameOver() {
  state.phase = "gameover";
  audio.crash();
  audio.stopEngine();
  state.shakeTime = 0.4;
  state.shakeIntensity = 12;

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("phantomRoadBest", state.bestScore);
    bestEl.textContent = state.bestScore;
  }
}

// ── Zone helpers ─────────────────────────────────────────
function getZone() {
  let z = zones[0];
  for (let i = zones.length - 1; i >= 0; i--) {
    if (state.distance >= zones[i].dist) { z = zones[i]; state.zoneIndex = i; break; }
  }
  return z;
}

function lerpColor(a, b, t) {
  const parse = (c) => {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const ca = parse(a), cb = parse(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
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

// ── Traffic generation ───────────────────────────────────
function spawnTraffic() {
  const rw = state.currentRoadWidth;
  const laneW = rw / LANE_COUNT;
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const laneX = (state.roadCenterX - rw / 2) + laneW * lane + laneW / 2;

  // Oncoming traffic (comes from top)
  const colors = ["#ff4444", "#44aaff", "#ffcc22", "#66ff66", "#ff66cc"];
  state.traffic.push({
    x: laneX,
    y: -60,
    w: 24,
    h: 44,
    speed: state.scrollSpeed * 0.6 + Math.random() * 60,
    color: colors[Math.floor(Math.random() * colors.length)],
    passed: false,
  });
}

// ── Particles ────────────────────────────────────────────
function spawnParticle(x, y, vx, vy, life, color, size) {
  state.particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

// ── Update ───────────────────────────────────────────────
function update(dt) {
  if (state.phase !== "playing") return;

  const zone = getZone();

  // Show zone name
  const prevZone = state.zoneIndex;
  getZone();
  if (state.zoneIndex !== prevZone || (state.distance < 5)) {
    state.zoneText = zones[state.zoneIndex].name;
    state.zoneTextTimer = 2.0;
  }
  if (state.zoneTextTimer > 0) state.zoneTextTimer -= dt;

  // Increase speed over time
  state.baseSpeed = 120 + state.distance * 0.04;
  state.scrollSpeed = state.baseSpeed;

  // Nitro
  if (state.nitroCooldown > 0) state.nitroCooldown -= dt;
  if (keys[" "] && state.nitro >= 0.3 && state.nitroCooldown <= 0) {
    state.nitroActive = true;
  }
  if (state.nitroActive) {
    state.scrollSpeed = state.baseSpeed * 1.6;
    state.nitro -= dt * 0.5;
    if (state.nitro <= 0) {
      state.nitro = 0;
      state.nitroActive = false;
      state.nitroCooldown = 0.5;
    }
    // Nitro particles
    if (Math.random() < 0.7) {
      spawnParticle(
        state.carX - 6 + Math.random() * 12,
        state.carY + CAR_H / 2,
        (Math.random() - 0.5) * 40,
        80 + Math.random() * 60,
        0.3 + Math.random() * 0.2,
        `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`,
        3 + Math.random() * 3
      );
    }
  } else if (!keys[" "]) {
    state.nitroActive = false;
  }

  // Road width narrows slightly
  state.currentRoadWidth = Math.max(120, ROAD_WIDTH - state.distance * 0.008);

  // Road curving
  state.segTimer -= dt;
  if (state.segTimer <= 0) {
    state.segTimer = 1.5 + Math.random() * 2;
    const maxDrift = 60 + Math.min(state.distance * 0.015, 80);
    state.roadTargetX = W / 2 + (Math.random() * 2 - 1) * maxDrift;
  }
  const curveLerp = 1.2 * dt;
  state.roadCenterX += (state.roadTargetX - state.roadCenterX) * curveLerp;

  // Steering input
  state.steerInput = 0;
  if (keys["ArrowLeft"] || keys["a"]) state.steerInput = -1;
  if (keys["ArrowRight"] || keys["d"]) state.steerInput = 1;

  // Touch steering
  if (touchStartX !== null && touchCurrentX !== null) {
    const dx = touchCurrentX - touchStartX;
    if (Math.abs(dx) > 8) {
      state.steerInput = Math.max(-1, Math.min(1, dx / 60));
    }
  }

  // Car physics
  const steerSpeed = 280;
  state.steerAngle += (state.steerInput * 0.3 - state.steerAngle) * 6 * dt;
  state.carX += state.steerInput * steerSpeed * dt;
  state.carX = Math.max(CAR_W / 2 + 4, Math.min(W - CAR_W / 2 - 4, state.carX));

  // Check if car is on road
  const rw = state.currentRoadWidth;
  const roadLeft = state.roadCenterX - rw / 2;
  const roadRight = state.roadCenterX + rw / 2;
  const onRoad = state.carX > roadLeft + CAR_W / 2 && state.carX < roadRight - CAR_W / 2;

  // Edge drifting charges nitro
  if (onRoad) {
    const edgeDist = Math.min(state.carX - roadLeft, roadRight - state.carX);
    if (edgeDist < 30 && !state.nitroActive) {
      state.nitro = Math.min(1, state.nitro + dt * 0.35);
    }
  }

  // Off-road = crash
  if (!onRoad) {
    gameOver();
    return;
  }

  // Distance / score
  state.distance += state.scrollSpeed * dt * 0.1;
  state.score = Math.floor(state.distance);
  scoreEl.textContent = state.score;

  // Road markings scroll
  state.markingOffset = (state.markingOffset + state.scrollSpeed * dt) % 60;

  // Traffic spawning
  const spawnRate = Math.max(0.4, 1.8 - state.distance * 0.0003);
  state.trafficTimer -= dt;
  if (state.trafficTimer <= 0) {
    state.trafficTimer = spawnRate * (0.5 + Math.random() * 0.5);
    spawnTraffic();
  }

  // Update traffic
  for (let i = state.traffic.length - 1; i >= 0; i--) {
    const t = state.traffic[i];
    t.y += (t.speed + state.scrollSpeed) * dt;

    // Near-miss detection
    if (!t.passed && t.y > state.carY - CAR_H && t.y < state.carY + CAR_H) {
      const dist = Math.abs(t.x - state.carX);
      if (dist < (CAR_W + t.w) / 2 + 2) {
        // Collision
        gameOver();
        return;
      }
      if (dist < (CAR_W + t.w) / 2 + 22) {
        // Near miss!
        t.passed = true;
        state.nearMissCombo++;
        const bonus = state.nearMissCombo * 5;
        state.score += bonus;
        state.distance += bonus;
        state.nearMissDisplay = 1.0;
        state.nearMissText = state.nearMissCombo > 1
          ? `NEAR MISS x${state.nearMissCombo}! +${bonus}`
          : `NEAR MISS! +${bonus}`;
        audio.nearMiss();
      }
    }

    if (t.y - CAR_H > state.carY + CAR_H * 2 && !t.passed) {
      t.passed = true;
      state.nearMissCombo = 0; // reset combo if car passed without near miss
    }

    // Remove off-screen
    if (t.y > H + 80) {
      state.traffic.splice(i, 1);
    }
  }

  // Near-miss display timer
  if (state.nearMissDisplay > 0) state.nearMissDisplay -= dt * 1.5;

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Headlight trail particles (subtle)
  if (Math.random() < 0.3) {
    spawnParticle(
      state.carX + (Math.random() - 0.5) * 6,
      state.carY + CAR_H / 2 + 4,
      (Math.random() - 0.5) * 10,
      30 + Math.random() * 20,
      0.3,
      "rgba(255,200,150,0.3)",
      2
    );
  }

  // Shake
  if (state.shakeTime > 0) state.shakeTime -= dt;

  // Engine audio
  audio.updateEngine(state.scrollSpeed);
}

// ── Draw ─────────────────────────────────────────────────
function draw() {
  const zoneBlend = state.phase === "start" ? {
    roadColor: zones[0].roadColor,
    lineColor: zones[0].lineColor,
    fogColor: zones[0].fogColor,
  } : getZoneBlend();

  // Shake
  ctx.save();
  if (state.shakeTime > 0) {
    const s = state.shakeIntensity * (state.shakeTime / 0.4);
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  // Clear with fog color
  ctx.fillStyle = zoneBlend.fogColor;
  ctx.fillRect(0, 0, W, H);

  const rw = state.currentRoadWidth;
  const rcx = state.roadCenterX;

  // ── Road surface ──
  ctx.fillStyle = zoneBlend.roadColor;
  ctx.fillRect(rcx - rw / 2, 0, rw, H);

  // Road edges (glow lines)
  ctx.strokeStyle = zoneBlend.lineColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = zoneBlend.lineColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(rcx - rw / 2, 0);
  ctx.lineTo(rcx - rw / 2, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rcx + rw / 2, 0);
  ctx.lineTo(rcx + rw / 2, H);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Lane markings (dashed center lines)
  ctx.setLineDash([20, 40]);
  ctx.strokeStyle = zoneBlend.lineColor;
  ctx.globalAlpha = 0.3;
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

  // ── Traffic ──
  for (const t of state.traffic) {
    drawCar(t.x, t.y, t.w, t.h, t.color, true);
  }

  // ── Player car ──
  drawPlayerCar();

  // ── Headlight effect ──
  drawHeadlights();

  // ── Particles ──
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Nitro bar ──
  drawNitroBar();

  // ── Near-miss text ──
  if (state.nearMissDisplay > 0) {
    ctx.save();
    ctx.globalAlpha = state.nearMissDisplay;
    ctx.font = "bold 22px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffcc22";
    ctx.shadowColor = "#ffcc22";
    ctx.shadowBlur = 15;
    ctx.fillText(state.nearMissText, W / 2, state.carY - 50 - (1 - state.nearMissDisplay) * 20);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Zone announcement ──
  if (state.zoneTextTimer > 0 && state.phase === "playing") {
    ctx.save();
    const alpha = state.zoneTextTimer > 1.5 ? (2.0 - state.zoneTextTimer) * 2 : state.zoneTextTimer / 1.5;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = "bold 28px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = zoneBlend.lineColor;
    ctx.shadowColor = zoneBlend.lineColor;
    ctx.shadowBlur = 20;
    ctx.fillText(zones[state.zoneIndex].name.toUpperCase(), W / 2, 80);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── HUD on canvas ──
  // Speed indicator
  if (state.phase === "playing") {
    ctx.save();
    ctx.font = "bold 14px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    const speedKmh = Math.floor(state.scrollSpeed * 0.8);
    ctx.fillText(`${speedKmh} km/h`, W - 16, H - 16);
    ctx.restore();
  }

  // ── Start screen ──
  if (state.phase === "start") {
    drawOverlay("PHANTOM ROAD", "Tap or press any key to drive", zoneBlend.lineColor);
  }

  // ── Game over screen ──
  if (state.phase === "gameover") {
    drawOverlay("WRECKED", `Distance: ${state.score}m — Tap or Space to retry`, "#ff4422");
  }

  ctx.restore();
}

function drawPlayerCar() {
  const cx = state.carX;
  const cy = state.carY;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.steerAngle);

  // Car body
  const bodyGrad = ctx.createLinearGradient(-CAR_W / 2, -CAR_H / 2, CAR_W / 2, CAR_H / 2);
  bodyGrad.addColorStop(0, "#ff6633");
  bodyGrad.addColorStop(1, "#cc3311");
  ctx.fillStyle = bodyGrad;

  // Main body shape
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H, 6);
  ctx.fill();

  // Windshield
  ctx.fillStyle = "rgba(100,180,255,0.4)";
  ctx.fillRect(-CAR_W / 2 + 4, -CAR_H / 2 + 6, CAR_W - 8, 12);

  // Rear lights
  ctx.fillStyle = "#ff2200";
  ctx.shadowColor = "#ff2200";
  ctx.shadowBlur = 8;
  ctx.fillRect(-CAR_W / 2 + 2, CAR_H / 2 - 6, 6, 4);
  ctx.fillRect(CAR_W / 2 - 8, CAR_H / 2 - 6, 6, 4);
  ctx.shadowBlur = 0;

  // Headlights (front of car)
  ctx.fillStyle = "#ffe8a0";
  ctx.shadowColor = "#ffe8a0";
  ctx.shadowBlur = 10;
  ctx.fillRect(-CAR_W / 2 + 2, -CAR_H / 2 + 1, 6, 4);
  ctx.fillRect(CAR_W / 2 - 8, -CAR_H / 2 + 1, 6, 4);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawCar(x, y, w, h, color, isOncoming) {
  ctx.save();
  ctx.translate(x, y);
  if (isOncoming) ctx.rotate(Math.PI);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 5);
  ctx.fill();

  // Windshield
  ctx.fillStyle = "rgba(100,180,255,0.3)";
  ctx.fillRect(-w / 2 + 3, -h / 2 + 5, w - 6, 10);

  // Headlights
  if (isOncoming) {
    ctx.fillStyle = "#ffe8a0";
    ctx.shadowColor = "#ffe8a0";
    ctx.shadowBlur = 8;
    ctx.fillRect(-w / 2 + 2, h / 2 - 5, 5, 3);
    ctx.fillRect(w / 2 - 7, h / 2 - 5, 5, 3);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawHeadlights() {
  // Darkness overlay with headlight cone cutout
  ctx.save();

  // Create a full-canvas darkness layer
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, W, H);

  // Cut out headlight cone using destination-out compositing
  ctx.globalCompositeOperation = "destination-out";

  // Main headlight cone
  const coneGrad = ctx.createRadialGradient(
    state.carX, state.carY - 30,
    10,
    state.carX, state.carY - 180,
    200
  );
  coneGrad.addColorStop(0, "rgba(255,255,255,0.95)");
  coneGrad.addColorStop(0.4, "rgba(255,255,255,0.7)");
  coneGrad.addColorStop(0.7, "rgba(255,255,255,0.3)");
  coneGrad.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(state.carX - 14, state.carY - CAR_H / 2);
  ctx.lineTo(state.carX - 140, -20);
  ctx.lineTo(state.carX + 140, -20);
  ctx.lineTo(state.carX + 14, state.carY - CAR_H / 2);
  ctx.fill();

  // Small glow around the car
  const carGlow = ctx.createRadialGradient(
    state.carX, state.carY, 10,
    state.carX, state.carY, 80
  );
  carGlow.addColorStop(0, "rgba(255,255,255,0.9)");
  carGlow.addColorStop(0.5, "rgba(255,255,255,0.4)");
  carGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = carGlow;
  ctx.fillRect(state.carX - 80, state.carY - 80, 160, 160);

  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  // Headlight glow (additive feel)
  ctx.save();
  ctx.globalAlpha = 0.08;
  const glowGrad = ctx.createRadialGradient(
    state.carX, state.carY - 100,
    20,
    state.carX, state.carY - 200,
    220
  );
  glowGrad.addColorStop(0, "#ffe8a0");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawNitroBar() {
  if (state.phase !== "playing") return;

  const barW = 100;
  const barH = 8;
  const bx = 16;
  const by = H - 24;

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(bx, by, barW, barH);

  if (state.nitro > 0) {
    const grad = ctx.createLinearGradient(bx, 0, bx + barW * state.nitro, 0);
    grad.addColorStop(0, "#ff8c32");
    grad.addColorStop(1, state.nitroActive ? "#ff2200" : "#ffcc22");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, barW * state.nitro, barH);
  }

  ctx.font = "bold 10px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("NITRO [SPACE]", bx, by - 4);
}

function drawOverlay(title, subtitle, color) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.font = "bold 42px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;
  ctx.fillText(title, W / 2, H / 2 - 20);
  ctx.shadowBlur = 0;

  ctx.font = "16px 'Trebuchet MS', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(subtitle, W / 2, H / 2 + 20);

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

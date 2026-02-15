/* ================================================================
   Methane Drift — Atmospheric Glider Game
   ================================================================ */

/* --- Configuration (all physics in per-second units) --- */
const CONFIG = {
  gravity: 504,
  pulseForce: -280,
  scrollSpeed: 195,
  dampingPerSecond: 0.488,
  atmosphereCycle: 6.0,
  symbiosisDuration: 2.33,
  baseSpawnRate: 1.35,
  maxDt: 0.033,
  width: 960,
  height: 540,
  difficulty: {
    scrollSpeed:     { start: 195, cap: 340, scaleScore: 100 },
    spawnRate:       { start: 1.35, cap: 2.4, scaleScore: 100 },
    obstacleDrift:   { start: 22, cap: 70, scaleScore: 100 },
    atmosphereCycle: { start: 6.0, cap: 2.8, scaleScore: 100 },
  },
  zoneColors: [
    { bg1: '#1a2248', bg2: '#111540', bg3: '#0a0d2e', bg4: '#030410', hue: 220, name: 'Upper Atmosphere' },
    { bg1: '#0a3038', bg2: '#0a2828', bg3: '#082020', bg4: '#031210', hue: 170, name: 'Mid Turbulence' },
    { bg1: '#2a1040', bg2: '#201038', bg3: '#180828', bg4: '#0a0310', hue: 280, name: 'Pressure Layer' },
    { bg1: '#3a1818', bg2: '#2a1010', bg3: '#200808', bg4: '#100404', hue: 15, name: 'Core Proximity' },
    { bg1: '#1a2248', bg2: '#111540', bg3: '#0a0d2e', bg4: '#030410', hue: 220, name: 'Unstable Core' },
  ],
};

const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', CRASHING: 'crashing', GAMEOVER: 'gameover' };

const ACHIEVEMENTS = [
  { id: 'first_drift', name: 'First Drift', desc: 'Score 1 point', check: (s) => s.bestScore >= 1 },
  { id: 'deep_diver', name: 'Deep Diver', desc: 'Score 25 points', check: (s) => s.bestScore >= 25 },
  { id: 'pressure_veteran', name: 'Pressure Veteran', desc: 'Score 50 points', check: (s) => s.bestScore >= 50 },
  { id: 'core_runner', name: 'Core Runner', desc: 'Score 100 points', check: (s) => s.bestScore >= 100 },
  { id: 'symbiont', name: 'Symbiont', desc: 'Use symbiosis 10 times total', check: (s) => s.totalSymbiosis >= 10 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Score 20 without symbiosis', check: (s) => s.noSymbiosisRecord >= 20 },
  { id: 'density_master', name: 'Density Master', desc: 'Survive 5 Crushing phases in one run', check: (s) => s.crushingPhasesThisRun >= 5 },
  { id: 'near_miss_expert', name: 'Near-Miss Expert', desc: '10 near-misses in one run', check: (s) => s.nearMissesThisRun >= 10 },
];

/* --- DOM --- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreNode = document.getElementById('score');
const densityNode = document.getElementById('density');
const symbiosisNode = document.getElementById('symbiosis');
const restartBtn = document.getElementById('restartBtn');
const bestNode = document.getElementById('best');
const muteBtn = document.getElementById('muteBtn');
const comboNode = document.getElementById('combo');

/* --- Accessibility: reduced motion --- */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Particle Pool --- */
const PARTICLE_POOL_SIZE = 300;
const particlePool = [];
for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
  particlePool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, hue: 0, size: 0, active: false });
}

function spawnParticle(x, y, vx, vy, life, hue, size) {
  if (reducedMotion) return;
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) {
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.hue = hue; p.size = size; p.active = true;
      return;
    }
  }
}

/* --- Persistent Progress --- */
const defaultProgress = {
  bestScore: 0,
  totalDistance: 0,
  totalObstaclesDodged: 0,
  totalSymbiosis: 0,
  totalTimePlayed: 0,
  totalRuns: 0,
  longestStreak: 0,
  achievements: [],
  selectedSkin: 'default',
  selectedTrailColor: null,
};

let progress = { ...defaultProgress };

function loadProgress() {
  try {
    const raw = localStorage.getItem('methaneDriftProgress');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        progress = { ...defaultProgress, ...parsed };
        if (!Array.isArray(progress.achievements)) progress.achievements = [];
      }
    }
  } catch (e) { /* corrupted data — use defaults */ }
}

function saveProgress() {
  try {
    localStorage.setItem('methaneDriftProgress', JSON.stringify(progress));
  } catch (e) { /* localStorage unavailable */ }
}

/* --- World State --- */
const world = {
  width: CONFIG.width,
  height: CONFIG.height,
  state: STATE.MENU,
  score: 0,
  best: 0,
  atmosphereTimer: 0,
  density: 0.72,
  densityLabel: 'Buoyant',
  obstacles: [],
  ambientFlash: 0,
  motes: [],
  nebulae: [],
  shakeTimer: 0,
  shakeIntensity: 0,
  timeScale: 1.0,
  timeScaleTarget: 1.0,
  timeScaleLerpSpeed: 5.0,
  crashDelay: 0,
  scorePop: 0,
  flashWhite: 0,
  zone: 1,
  prevZone: 1,
  zoneTransition: 0,
  atmosphereAnnounce: null,
  zoneAnnounce: null,
  newAchievements: [],
  achievementToast: null,
  combo: 0,
  comboTimer: 0,
  starsFar: [],
  starsMid: [],
  starsNear: [],
  runStats: {
    obstaclesDodged: 0,
    symbiosisUses: 0,
    nearMisses: 0,
    crushingPhases: 0,
    timeAlive: 0,
    usedSymbiosis: false,
  },
};

const glider = {
  x: 210,
  y: CONFIG.height * 0.45,
  vy: 0,
  radius: 16,
  trail: [],
  flicker: 0,
  crashed: false,
  symbiosisCharge: 1,
  symbiosisTimer: 0,
  pulsePop: 0,
};

const hazardTypes = ['spire', 'school', 'geyser', 'storm'];

let lastTime = 0;
let tutorialDone = false;
let tutorialStep = 0;
let isFullscreen = false;

/* --- Fullscreen --- */
function enterFullscreen() {
  if (isFullscreen) return;
  const el = canvas;
  try {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch (e) { /* fullscreen not supported */ }
}

function exitFullscreen() {
  try {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch (e) { /* */ }
}

document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

function onFullscreenChange() {
  const wasFullscreen = isFullscreen;
  isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (wasFullscreen && !isFullscreen && world.state === STATE.PLAYING) {
    world.state = STATE.PAUSED;
    lastTime = 0;
    Audio.stopDrone();
  }
  /* Update button label */
  const fsBtn = document.getElementById('fullscreenBtn');
  if (fsBtn) fsBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
  /* Invalidate cached gradient since canvas size may change */
  cachedBgZone = -1;
}

/* --- Difficulty Helper --- */
function getDifficulty(param) {
  const d = CONFIG.difficulty[param];
  const t = Math.min(1, world.score / d.scaleScore);
  return d.start + (d.cap - d.start) * t;
}

/* --- Ambient Motes --- */
function initMotes() {
  world.motes = [];
  for (let i = 0; i < 45; i++) {
    world.motes.push({
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      vx: -9 - Math.random() * 21,
      vy: (Math.random() - 0.5) * 15,
      size: 1 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      hue: 180 + Math.random() * 60,
    });
  }
}

/* --- Nebula Fog --- */
function initNebulae() {
  world.nebulae = [];
  for (let i = 0; i < 5; i++) {
    world.nebulae.push({
      x: Math.random() * world.width,
      y: 60 + Math.random() * (world.height - 120),
      rx: 120 + Math.random() * 180,
      ry: 40 + Math.random() * 70,
      speed: 0.12 + Math.random() * 0.25,
      hue: 200 + Math.random() * 60,
      alpha: 0.025 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

/* --- Parallax Stars --- */
function initStars() {
  world.starsFar = [];
  world.starsMid = [];
  world.starsNear = [];
  for (let i = 0; i < 40; i++) world.starsFar.push({ x: Math.random() * world.width, y: Math.random() * world.height, size: 0.8 + Math.random() * 0.8, hue: 190 + Math.random() * 30 });
  for (let i = 0; i < 25; i++) world.starsMid.push({ x: Math.random() * world.width, y: Math.random() * world.height, size: 1.2 + Math.random() * 1.0, hue: 200 + Math.random() * 40 });
  for (let i = 0; i < 15; i++) world.starsNear.push({ x: Math.random() * world.width, y: Math.random() * world.height, size: 1.5 + Math.random() * 1.5, hue: 180 + Math.random() * 50 });
}

/* --- High Score --- */
function loadBestScore() {
  try {
    const stored = Number(localStorage.getItem('methaneDriftBest'));
    if (!Number.isNaN(stored) && stored > 0) {
      world.best = stored;
      if (bestNode) bestNode.textContent = String(world.best);
    }
  } catch (e) { /* */ }
}

function saveBestScore() {
  let isNew = false;
  if (world.score > world.best) {
    world.best = world.score;
    isNew = true;
    try { localStorage.setItem('methaneDriftBest', String(world.best)); } catch (e) { /* */ }
    if (bestNode) bestNode.textContent = String(world.best);
    Audio.newHighScore();
  }
  return isNew;
}

/* --- Reset --- */
function resetGame() {
  world.score = 0;
  world.state = STATE.MENU;
  world.atmosphereTimer = 0;
  world.density = 0.72;
  world.densityLabel = 'Buoyant';
  world.obstacles = [];
  world.ambientFlash = 0;
  world.shakeTimer = 0;
  world.shakeIntensity = 0;
  world.timeScale = 1.0;
  world.timeScaleTarget = 1.0;
  world.crashDelay = 0;
  world.scorePop = 0;
  world.flashWhite = 0;
  world.zone = 1;
  world.prevZone = 1;
  world.zoneTransition = 0;
  world.atmosphereAnnounce = null;
  world.zoneAnnounce = null;
  world.newAchievements = [];
  world.achievementToast = null;
  world.combo = 0;
  world.comboTimer = 0;
  world.runStats = { obstaclesDodged: 0, symbiosisUses: 0, nearMisses: 0, crushingPhases: 0, timeAlive: 0, usedSymbiosis: false };

  glider.y = CONFIG.height * 0.45;
  glider.vy = 0;
  glider.trail = [];
  glider.flicker = 0;
  glider.crashed = false;
  glider.symbiosisCharge = 1;
  glider.symbiosisTimer = 0;
  glider.pulsePop = 0;

  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) particlePool[i].active = false;

  restartBtn.hidden = true;
  initMotes();
  initNebulae();
  initStars();
}

/* --- Input Actions --- */
function pulse() {
  Audio.resume();
  if (world.state === STATE.GAMEOVER) {
    resetGame();
    world.state = STATE.PLAYING;
    enterFullscreen();
    Audio.startDrone();
    return;
  }
  if (world.state === STATE.MENU) {
    if (!tutorialDone) {
      tutorialStep++;
      if (tutorialStep >= 3) {
        tutorialDone = true;
        try { localStorage.setItem('methaneDriftTutorialDone', 'true'); } catch (e) { /* */ }
      } else {
        return;
      }
    }
    world.state = STATE.PLAYING;
    enterFullscreen();
    Audio.startDrone();
    return;
  }
  if (world.state === STATE.PAUSED || world.state === STATE.CRASHING) return;
  glider.vy += CONFIG.pulseForce * world.density;
  glider.pulsePop = 1.0;
  spawnPulseParticles();
  Audio.pulse();
}

function activateSymbiosis() {
  if (world.state !== STATE.PLAYING) return;
  if (glider.symbiosisCharge < 1 || glider.symbiosisTimer > 0) return;
  glider.symbiosisTimer = CONFIG.symbiosisDuration;
  glider.symbiosisCharge = 0;
  world.timeScale = 0.7;
  world.timeScaleTarget = 1.0;
  world.runStats.symbiosisUses++;
  world.runStats.usedSymbiosis = true;
  spawnSymbiosisParticles();
  Audio.symbiosisActivate();
}

/* --- Particle Spawners --- */
function spawnPulseParticles() {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 12) * i + (Math.random() - 0.5) * 0.5;
    spawnParticle(
      glider.x - 10, glider.y,
      -60 - Math.random() * 96, Math.sin(angle) * 84,
      0.7 + Math.random() * 0.4, 190 + Math.random() * 50, 1.5 + Math.random() * 2
    );
  }
}

function spawnCrashParticles() {
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    spawnParticle(
      glider.x, glider.y,
      Math.cos(angle) * speed, Math.sin(angle) * speed,
      0.8 + Math.random() * 0.6, 10 + Math.random() * 30, 2 + Math.random() * 3
    );
  }
}

function spawnNearMissParticles() {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.random() - 0.5) * 1.2 - Math.PI / 2;
    spawnParticle(
      glider.x, glider.y,
      Math.cos(angle) * (40 + Math.random() * 80), Math.sin(angle) * (40 + Math.random() * 80),
      0.4 + Math.random() * 0.3, 180 + Math.random() * 20, 1.5 + Math.random() * 1.5
    );
  }
}

function spawnSymbiosisParticles() {
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 / 24) * i;
    spawnParticle(
      glider.x, glider.y,
      Math.cos(angle) * 100, Math.sin(angle) * 100,
      0.6, 160 + Math.random() * 40, 2
    );
  }
}

/* --- Obstacle Spawning --- */
function spawnObstacle() {
  const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
  const gapY = 80 + Math.random() * (world.height - 160);
  const maxDrift = getDifficulty('obstacleDrift');
  const drift = (Math.random() - 0.5) * maxDrift * 2;
  const oscillate = type === 'geyser' && world.score >= 50 && Math.random() < 0.4;

  world.obstacles.push({
    type, x: world.width + 120, y: gapY, drift, age: 0, scored: false,
    pulse: Math.random() * Math.PI * 2, oscillate, oscPhase: Math.random() * Math.PI * 2,
  });
}

function spawnCorridor() {
  const gapCenter = 100 + Math.random() * (world.height - 200);
  const gapSize = 120;
  world.obstacles.push({
    type: 'spire', x: world.width + 120, y: gapCenter - gapSize / 2 - 80,
    drift: 0, age: 0, scored: false, pulse: Math.random() * Math.PI * 2, oscillate: false, oscPhase: 0,
  });
  world.obstacles.push({
    type: 'spire', x: world.width + 120, y: gapCenter + gapSize / 2 + 80,
    drift: 0, age: 0, scored: true, pulse: Math.random() * Math.PI * 2, oscillate: false, oscPhase: 0,
  });
}

/* --- Collision --- */
/* effectiveY accounts for the visual wobble so hitbox matches what the player sees */
function obstacleVisualY(obstacle) {
  return obstacle.y + Math.sin(obstacle.pulse) * 4;
}

function checkCollision(obstacle) {
  const gx = glider.x;
  const gy = glider.y;
  const oy = obstacleVisualY(obstacle);
  const dx = Math.abs(gx - obstacle.x);
  const dy = Math.abs(gy - oy);
  if (obstacle.type === 'spire') {
    /* Crystal narrows toward the tip — use tapered hitbox */
    const t = (gy - (oy - 130)) / 260; /* 0=top, 1=bottom */
    const halfW = 4 + Math.max(0, Math.min(1, t)) * 18; /* 4px at tip, 22px at base */
    return dx < halfW + 12 && dy < 120;
  }
  if (obstacle.type === 'school') return dx < 30 && dy < 28;
  if (obstacle.type === 'geyser') return dx < 18 && gy > oy - 115 && gy < oy + 115;
  /* Storm: circle collision */
  const stormR = 52 + Math.sin(obstacle.pulse) * 8;
  return dx * dx + dy * dy < (stormR + 8) * (stormR + 8);
}

function nearMissDistance(obstacle) {
  const gx = glider.x;
  const gy = glider.y;
  const oy = obstacleVisualY(obstacle);
  const dx = Math.abs(gx - obstacle.x);
  const dy = Math.abs(gy - oy);
  if (obstacle.type === 'spire') return dx < 60 ? Math.max(0, 120 - dy) : 0;
  if (obstacle.type === 'school') return Math.max(0, 38 - dy);
  if (obstacle.type === 'geyser') return dx < 35 && gy > oy - 130 && gy < oy + 130 ? Math.max(0, 35 - dx) : 0;
  const stormR = 52 + Math.sin(obstacle.pulse) * 8;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, (stormR + 20) - dist);
}

/* --- Crash --- */
function crash() {
  if (world.state === STATE.CRASHING || world.state === STATE.GAMEOVER) return;
  world.state = STATE.CRASHING;
  glider.crashed = true;
  world.crashDelay = 0.4;
  if (!reducedMotion) {
    world.timeScale = 0.3;
    world.timeScaleTarget = 0;
    world.shakeTimer = 0.3;
    world.shakeIntensity = 8;
    world.flashWhite = 0.4;
  }
  spawnCrashParticles();
  Audio.crash();
  Audio.stopDrone();
}

function finishCrash() {
  world.state = STATE.GAMEOVER;
  world.timeScale = 1;
  world.timeScaleTarget = 1;
  restartBtn.hidden = false;
  const isNew = saveBestScore();

  /* Merge run stats into progress */
  progress.totalDistance += world.score;
  progress.totalObstaclesDodged += world.runStats.obstaclesDodged;
  progress.totalSymbiosis += world.runStats.symbiosisUses;
  progress.totalTimePlayed += world.runStats.timeAlive;
  progress.totalRuns++;
  if (world.score > progress.bestScore) progress.bestScore = world.score;
  if (!world.runStats.usedSymbiosis && world.score > (progress.noSymbiosisRecord || 0)) {
    progress.noSymbiosisRecord = world.score;
  }
  if (world.combo > (progress.longestStreak || 0)) progress.longestStreak = world.combo;
  progress.crushingPhasesThisRun = world.runStats.crushingPhases;
  progress.nearMissesThisRun = world.runStats.nearMisses;

  checkAchievements();
  saveProgress();
}

/* --- Achievements --- */
function checkAchievements() {
  const unlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (!progress.achievements.includes(ach.id) && ach.check(progress)) {
      progress.achievements.push(ach.id);
      unlocked.push(ach);
    }
  }
  if (unlocked.length > 0) {
    world.newAchievements = unlocked;
    world.achievementToast = { items: unlocked, timer: 3.0 };
  }
}

/* --- Atmosphere --- */
function updateAtmosphere(dt) {
  world.atmosphereTimer += dt;
  const cycle = getDifficulty('atmosphereCycle');
  if (world.atmosphereTimer >= cycle) {
    world.atmosphereTimer = 0;
    const prevLabel = world.densityLabel;
    const roll = Math.random();
    if (roll < 0.34) {
      world.density = 0.72;
      world.densityLabel = 'Buoyant';
    } else if (roll < 0.68) {
      world.density = 0.92;
      world.densityLabel = 'Dense';
    } else {
      world.density = 1.08;
      world.densityLabel = 'Crushing';
      world.runStats.crushingPhases++;
    }
    if (prevLabel !== world.densityLabel) {
      world.ambientFlash = 0.25;
      world.atmosphereAnnounce = { text: world.densityLabel.toUpperCase(), timer: 1.5 };
      Audio.atmosphereShift(world.densityLabel);
      Audio.updateDrone(world.density);
    }
  }
}

/* --- Motes --- */
function updateMotes(dt) {
  const t = performance.now() * 0.001;
  for (const mote of world.motes) {
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt + Math.sin(t + mote.phase) * 0.08 * dt * 60;
    if (mote.x < -10) { mote.x = world.width + 10; mote.y = Math.random() * world.height; }
    if (mote.y < -10) mote.y = world.height + 10;
    if (mote.y > world.height + 10) mote.y = -10;
  }
}

/* --- Stars --- */
function updateStars(dt) {
  const baseScroll = getDifficulty('scrollSpeed') * dt;
  for (const s of world.starsFar)  { s.x -= baseScroll * 0.05; if (s.x < -5) s.x = world.width + 5; }
  for (const s of world.starsMid)  { s.x -= baseScroll * 0.12; if (s.x < -5) s.x = world.width + 5; }
  for (const s of world.starsNear) { s.x -= baseScroll * 0.2; if (s.x < -5) s.x = world.width + 5; }
}

/* --- Zone System --- */
function updateZone() {
  const newZone = Math.min(5, Math.floor(world.score / 25) + 1);
  if (newZone !== world.zone) {
    world.prevZone = world.zone;
    world.zone = newZone;
    world.zoneTransition = 1.0;
    world.zoneAnnounce = { text: `Zone ${newZone}: ${CONFIG.zoneColors[newZone - 1].name}`, timer: 2.5 };
    Audio.zoneChange();
  }
}

/* --- Main Update --- */
function update(dt, rawDt) {
  /* Crashing state: drain delay with real time */
  if (world.state === STATE.CRASHING) {
    world.crashDelay -= rawDt;
    glider.flicker += 2.4 * dt;
    updateParticles(dt);
    updateMotes(dt);
    if (world.crashDelay <= 0) finishCrash();
    return;
  }

  if (world.state === STATE.GAMEOVER) {
    glider.flicker += 2.4 * dt;
    updateMotes(dt);
    return;
  }

  if (world.state !== STATE.PLAYING) {
    updateMotes(dt);
    return;
  }

  world.runStats.timeAlive += rawDt;
  updateAtmosphere(dt);
  updateStars(dt);
  updateZone();

  /* Obstacle spawning with difficulty ramp */
  if (Math.random() < getDifficulty('spawnRate') * dt) {
    spawnObstacle();
    /* Pair spawn after score 15 */
    if (world.score >= 15 && Math.random() < 0.3) {
      const paired = world.obstacles[world.obstacles.length - 1];
      spawnObstacle();
      world.obstacles[world.obstacles.length - 1].x = paired.x + 80;
    }
  }
  /* Corridor after score 30 */
  if (world.score >= 30 && Math.random() < 0.002 * dt * 60) {
    spawnCorridor();
  }

  /* Glider physics */
  glider.vy += CONFIG.gravity * world.density * dt;
  glider.vy *= Math.pow(CONFIG.dampingPerSecond, dt);
  glider.y += glider.vy * dt;

  /* Trail */
  glider.trail.push({ x: glider.x - 16, y: glider.y, life: 0.87 });
  if (glider.trail.length > 90) glider.trail.shift();

  /* Symbiosis timer — use real time so slow-mo doesn't extend duration */
  if (glider.symbiosisTimer > 0) {
    glider.symbiosisTimer -= rawDt;
    if (glider.symbiosisTimer <= 0) {
      glider.symbiosisTimer = 0;
      glider.symbiosisCharge = Math.min(1, glider.symbiosisCharge + 1);
      Audio.symbiosisEnd();
    }
  }

  /* Bounds check */
  if (glider.y < -40 || glider.y > world.height + 40) crash();

  /* Pulse pop decay */
  if (glider.pulsePop > 0) {
    glider.pulsePop *= Math.pow(0.001, dt);
    if (glider.pulsePop < 0.01) glider.pulsePop = 0;
  }

  /* Score pop decay */
  if (world.scorePop > 0) {
    world.scorePop *= Math.pow(0.01, dt);
    if (world.scorePop < 0.02) world.scorePop = 0;
  }

  /* Combo timer */
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) { world.combo = 0; if (comboNode) comboNode.textContent = '0'; }
  }

  /* Obstacles */
  const scrollSpeed = getDifficulty('scrollSpeed');
  world.obstacles.forEach((obstacle) => {
    obstacle.x -= (scrollSpeed + (1 - world.density) * 72) * dt;
    obstacle.y += obstacle.drift * dt;
    obstacle.age += dt;
    obstacle.pulse += 1.8 * dt;

    if (obstacle.oscillate) {
      obstacle.y += Math.sin(obstacle.oscPhase + obstacle.age * 2) * 40 * dt;
    }

    /* Clamp vertical position so obstacles stay on screen */
    if (obstacle.y < 40) { obstacle.y = 40; obstacle.drift = Math.abs(obstacle.drift); }
    if (obstacle.y > world.height - 40) { obstacle.y = world.height - 40; obstacle.drift = -Math.abs(obstacle.drift); }

    if (!obstacle.scored && obstacle.x + 40 < glider.x && world.state === STATE.PLAYING) {
      obstacle.scored = true;
      world.score += 1;
      world.scorePop = 1.0;
      world.runStats.obstaclesDodged++;
      Audio.score();

      /* Near-miss check */
      const dist = nearMissDistance(obstacle);
      if (dist > 0 && dist < 30) {
        if (!reducedMotion) {
          world.shakeTimer = 0.1;
          world.shakeIntensity = 3;
        }
        world.combo++;
        world.comboTimer = 3.0;
        world.runStats.nearMisses++;
        if (comboNode) comboNode.textContent = String(world.combo);
        spawnNearMissParticles();
        Audio.nearMiss();
      }

      if (world.score % 8 === 0) glider.symbiosisCharge = 1;
    }

    if (checkCollision(obstacle) && glider.symbiosisTimer <= 0) crash();
  });

  world.obstacles = world.obstacles.filter((o) => o.x > -220);

  /* Particles */
  updateParticles(dt);
  updateMotes(dt);

  /* Shake decay */
  if (world.shakeTimer > 0) {
    world.shakeTimer -= dt;
    world.shakeIntensity *= Math.pow(0.01, dt);
  }

  /* HUD */
  scoreNode.textContent = String(world.score);
  densityNode.textContent = world.densityLabel;
  symbiosisNode.textContent = glider.symbiosisTimer > 0 ? 'Phasing' : glider.symbiosisCharge >= 1 ? 'Ready' : 'Charging';
}

function updateParticles(dt) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.16, dt);
    p.vy *= Math.pow(0.30, dt);
    p.life -= dt;
    if (p.life <= 0) p.active = false;
  }
}

/* ========== DRAWING ========== */

let cachedBgGrad = null;
let cachedBgZone = -1;

function drawBackground() {
  const zIdx = world.zone - 1;
  const colors = CONFIG.zoneColors[zIdx];

  if (cachedBgZone !== world.zone || !cachedBgGrad) {
    cachedBgGrad = ctx.createLinearGradient(0, 0, 0, world.height);
    cachedBgGrad.addColorStop(0, colors.bg1);
    cachedBgGrad.addColorStop(0.35, colors.bg2);
    cachedBgGrad.addColorStop(0.7, colors.bg3);
    cachedBgGrad.addColorStop(1, colors.bg4);
    cachedBgZone = world.zone;
  }

  /* Zone transition blend */
  if (world.zoneTransition > 0) {
    const prevColors = CONFIG.zoneColors[world.prevZone - 1];
    const tg = ctx.createLinearGradient(0, 0, 0, world.height);
    tg.addColorStop(0, prevColors.bg1);
    tg.addColorStop(0.35, prevColors.bg2);
    tg.addColorStop(0.7, prevColors.bg3);
    tg.addColorStop(1, prevColors.bg4);
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.globalAlpha = 1 - world.zoneTransition;
  }

  ctx.fillStyle = cachedBgGrad;
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.globalAlpha = 1;

  /* Parallax stars */
  const t = performance.now();
  const layers = [world.starsFar, world.starsMid, world.starsNear];
  const alphas = [0.06, 0.10, 0.16];
  for (let li = 0; li < 3; li++) {
    for (const star of layers[li]) {
      const twinkle = Math.sin(star.x * 1.3 + t * 0.0015);
      const alpha = alphas[li] + (twinkle + 1) * 0.04;
      ctx.fillStyle = `hsla(${star.hue}, 60%, 82%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size + twinkle * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Nebula fog */
  for (const neb of world.nebulae) {
    const nx = (neb.x - t * 0.005 * neb.speed) % (world.width + neb.rx * 2);
    const breathe = Math.sin(t * 0.0005 + neb.phase) * 0.008;
    const a = neb.alpha + breathe;
    const g = ctx.createRadialGradient(nx, neb.y, 0, nx, neb.y, neb.rx);
    g.addColorStop(0, `hsla(${neb.hue}, 50%, 60%, ${a})`);
    g.addColorStop(0.5, `hsla(${neb.hue}, 40%, 40%, ${a * 0.5})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(nx, neb.y, neb.rx, neb.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Ambient flash */
  if (world.ambientFlash > 0) {
    const fg = ctx.createRadialGradient(
      world.width / 2, world.height / 2, 0,
      world.width / 2, world.height / 2, world.width * 0.6
    );
    fg.addColorStop(0, `rgba(140, 190, 255, ${world.ambientFlash * 0.6})`);
    fg.addColorStop(1, `rgba(80, 120, 200, ${world.ambientFlash * 0.15})`);
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, world.width, world.height);
    /* ambientFlash decay is handled in decayAmbientFlash() */
  }
}

function drawMotes() {
  const t = performance.now() * 0.001;
  for (const mote of world.motes) {
    const p = Math.sin(t * 1.5 + mote.phase);
    const alpha = 0.12 + p * 0.08;
    ctx.fillStyle = `hsla(${mote.hue}, 55%, 75%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.size + p * 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (mote.size > 2) {
      ctx.fillStyle = `hsla(${mote.hue}, 50%, 70%, ${alpha * 0.2})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawObstacles() {
  const now = performance.now();
  for (const obstacle of world.obstacles) {
    const wobble = Math.sin(obstacle.pulse) * 4;
    const x = obstacle.x;
    const y = obstacle.y + wobble;

    if (obstacle.type === 'spire') {
      /* Outer ambient glow */
      const sg = ctx.createRadialGradient(x, y, 0, x, y, 100);
      sg.addColorStop(0, 'rgba(168, 246, 255, 0.08)');
      sg.addColorStop(0.5, 'rgba(100, 200, 255, 0.03)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(x - 100, y - 140, 200, 280);

      /* Main crystal body - multi-faceted */
      const spireGrad = ctx.createLinearGradient(x - 10, y - 130, x + 10, y + 130);
      spireGrad.addColorStop(0, 'rgba(220, 255, 255, 0.9)');
      spireGrad.addColorStop(0.3, 'rgba(160, 240, 255, 0.75)');
      spireGrad.addColorStop(0.6, 'rgba(120, 210, 240, 0.55)');
      spireGrad.addColorStop(1, 'rgba(80, 160, 210, 0.25)');

      /* Left facet (darker) */
      ctx.fillStyle = spireGrad;
      ctx.beginPath();
      ctx.moveTo(x, y - 130);
      ctx.lineTo(x - 6, y - 40);
      ctx.lineTo(x - 20, y + 130);
      ctx.lineTo(x - 2, y + 80);
      ctx.lineTo(x, y - 20);
      ctx.closePath();
      ctx.fill();

      /* Right facet (brighter) */
      const rightGrad = ctx.createLinearGradient(x, y - 130, x + 15, y + 130);
      rightGrad.addColorStop(0, 'rgba(240, 255, 255, 0.95)');
      rightGrad.addColorStop(0.4, 'rgba(180, 245, 255, 0.7)');
      rightGrad.addColorStop(1, 'rgba(100, 190, 230, 0.3)');
      ctx.fillStyle = rightGrad;
      ctx.beginPath();
      ctx.moveTo(x, y - 130);
      ctx.lineTo(x + 7, y - 30);
      ctx.lineTo(x + 20, y + 130);
      ctx.lineTo(x + 2, y + 60);
      ctx.lineTo(x, y - 20);
      ctx.closePath();
      ctx.fill();

      /* Center facet highlight */
      ctx.fillStyle = 'rgba(200, 250, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x, y - 130);
      ctx.lineTo(x + 3, y - 20);
      ctx.lineTo(x + 2, y + 60);
      ctx.lineTo(x - 2, y + 80);
      ctx.lineTo(x, y - 20);
      ctx.closePath();
      ctx.fill();

      /* Crystal edge lines */
      ctx.strokeStyle = 'rgba(220, 255, 255, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y - 130);
      ctx.lineTo(x, y - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      ctx.lineTo(x - 20, y + 130);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      ctx.lineTo(x + 20, y + 130);
      ctx.stroke();

      /* Internal refraction lines */
      const refrPhase = Math.sin(obstacle.pulse * 0.7);
      ctx.strokeStyle = `rgba(200, 255, 255, ${0.08 + refrPhase * 0.04})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 60);
      ctx.lineTo(x + 8, y + 20);
      ctx.lineTo(x - 5, y + 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 80);
      ctx.lineTo(x - 6, y - 10);
      ctx.lineTo(x + 10, y + 60);
      ctx.stroke();

      /* Glowing nodes at facet intersections */
      const nodePulse = 0.3 + Math.sin(obstacle.pulse * 1.5) * 0.2;
      ctx.fillStyle = `rgba(200, 255, 255, ${nodePulse})`;
      ctx.beginPath(); ctx.arc(x, y - 130, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(180, 240, 255, ${nodePulse * 0.7})`;
      ctx.beginPath(); ctx.arc(x, y - 20, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 6, y - 40, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 7, y - 30, 1.5, 0, Math.PI * 2); ctx.fill();

      /* Floating crystal shards */
      const shardT = now * 0.002;
      for (let s = 0; s < 3; s++) {
        const sx = x + Math.sin(shardT + s * 2.1) * 25;
        const sy = y - 60 + s * 50 + Math.cos(shardT * 0.7 + s) * 10;
        const sAngle = shardT * 0.5 + s * 1.4;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sAngle);
        ctx.fillStyle = `rgba(190, 245, 255, ${0.15 + Math.sin(shardT + s) * 0.08})`;
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(2, 0); ctx.lineTo(0, 4); ctx.lineTo(-2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

    } else if (obstacle.type === 'school') {
      /* Group ambient glow */
      const groupGlow = ctx.createRadialGradient(x - 16, y, 0, x - 16, y, 50);
      groupGlow.addColorStop(0, 'rgba(100, 255, 200, 0.06)');
      groupGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = groupGlow;
      ctx.beginPath();
      ctx.arc(x - 16, y, 50, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 5; i++) {
        const sa = 0.35 + i * 0.06;
        const fx = x - i * 10 + Math.sin(obstacle.pulse * 0.8 + i * 0.5) * 3;
        const fy = y + Math.sin(obstacle.pulse + i) * 12;
        const fishScale = 1 - i * 0.06;
        const fishAngle = Math.sin(obstacle.pulse * 1.2 + i * 0.8) * 0.15;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(fishAngle);

        /* Fish body glow halo */
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22 * fishScale);
        glow.addColorStop(0, `rgba(143, 255, 213, ${sa * 0.5})`);
        glow.addColorStop(0.5, `rgba(100, 220, 190, ${sa * 0.15})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 22 * fishScale, 0, Math.PI * 2);
        ctx.fill();

        /* Fish body - streamlined shape */
        const bodyGrad = ctx.createLinearGradient(-10 * fishScale, -6 * fishScale, 10 * fishScale, 4 * fishScale);
        bodyGrad.addColorStop(0, `rgba(80, 200, 170, ${sa * 0.7})`);
        bodyGrad.addColorStop(0.5, `rgba(143, 255, 213, ${sa * 0.85})`);
        bodyGrad.addColorStop(1, `rgba(100, 230, 190, ${sa * 0.6})`);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(14 * fishScale, 0);
        ctx.quadraticCurveTo(10 * fishScale, -5 * fishScale, 2 * fishScale, -6 * fishScale);
        ctx.quadraticCurveTo(-6 * fishScale, -5 * fishScale, -10 * fishScale, -2 * fishScale);
        ctx.quadraticCurveTo(-12 * fishScale, 0, -10 * fishScale, 2 * fishScale);
        ctx.quadraticCurveTo(-6 * fishScale, 5 * fishScale, 2 * fishScale, 5 * fishScale);
        ctx.quadraticCurveTo(10 * fishScale, 4 * fishScale, 14 * fishScale, 0);
        ctx.closePath();
        ctx.fill();

        /* Dorsal fin */
        ctx.fillStyle = `rgba(120, 240, 200, ${sa * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(2 * fishScale, -6 * fishScale);
        ctx.quadraticCurveTo(0, -11 * fishScale, -4 * fishScale, -6 * fishScale);
        ctx.closePath();
        ctx.fill();

        /* Tail fin - forked */
        const tailFlick = Math.sin(obstacle.pulse * 2.5 + i * 0.7) * 2;
        ctx.fillStyle = `rgba(110, 235, 195, ${sa * 0.55})`;
        ctx.beginPath();
        ctx.moveTo(-10 * fishScale, 0);
        ctx.quadraticCurveTo(-14 * fishScale, -4 * fishScale + tailFlick, -18 * fishScale, -6 * fishScale + tailFlick);
        ctx.quadraticCurveTo(-13 * fishScale, 0, -18 * fishScale, 6 * fishScale - tailFlick);
        ctx.quadraticCurveTo(-14 * fishScale, 4 * fishScale - tailFlick, -10 * fishScale, 0);
        ctx.closePath();
        ctx.fill();

        /* Eye */
        ctx.fillStyle = `rgba(220, 255, 245, ${sa * 0.9})`;
        ctx.beginPath();
        ctx.arc(8 * fishScale, -2 * fishScale, 1.8 * fishScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(20, 60, 50, ${sa * 0.8})`;
        ctx.beginPath();
        ctx.arc(8.5 * fishScale, -2 * fishScale, 0.8 * fishScale, 0, Math.PI * 2);
        ctx.fill();

        /* Bioluminescent stripe */
        ctx.strokeStyle = `rgba(180, 255, 230, ${sa * (0.3 + Math.sin(obstacle.pulse + i * 0.5) * 0.15)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(10 * fishScale, -1 * fishScale);
        ctx.quadraticCurveTo(0, 0, -8 * fishScale, -1 * fishScale);
        ctx.stroke();

        ctx.restore();
      }

    } else if (obstacle.type === 'geyser') {
      /* Base vent glow */
      const baseGlow = ctx.createRadialGradient(x, y + 120, 0, x, y + 120, 40);
      baseGlow.addColorStop(0, 'rgba(100, 180, 255, 0.15)');
      baseGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = baseGlow;
      ctx.beginPath();
      ctx.arc(x, y + 120, 40, 0, Math.PI * 2);
      ctx.fill();

      /* Main column - wider with turbulent edges */
      const colWidth = 7;
      const turbT = now * 0.004;
      ctx.beginPath();
      ctx.moveTo(x - colWidth - 3, y + 120);
      for (let cy = y + 120; cy >= y - 120; cy -= 8) {
        const turbulence = Math.sin(turbT + cy * 0.05) * 3 + Math.sin(turbT * 1.7 + cy * 0.08) * 1.5;
        const narrowing = 1 - Math.abs(cy - y) / 240 * 0.3;
        ctx.lineTo(x - colWidth * narrowing + turbulence, cy);
      }
      for (let cy = y - 120; cy <= y + 120; cy += 8) {
        const turbulence = Math.sin(turbT + cy * 0.05 + 2) * 3 + Math.sin(turbT * 1.3 + cy * 0.07) * 1.5;
        const narrowing = 1 - Math.abs(cy - y) / 240 * 0.3;
        ctx.lineTo(x + colWidth * narrowing + turbulence, cy);
      }
      ctx.closePath();
      const gg = ctx.createLinearGradient(x, y - 120, x, y + 120);
      gg.addColorStop(0, 'rgba(200, 240, 255, 0.75)');
      gg.addColorStop(0.3, 'rgba(140, 210, 255, 0.55)');
      gg.addColorStop(0.7, 'rgba(100, 180, 240, 0.35)');
      gg.addColorStop(1, 'rgba(70, 140, 210, 0.15)');
      ctx.fillStyle = gg;
      ctx.fill();

      /* Inner hot core line */
      ctx.strokeStyle = 'rgba(220, 250, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 110);
      for (let cy = y + 110; cy >= y - 110; cy -= 6) {
        const wave = Math.sin(turbT * 2 + cy * 0.06) * 2;
        ctx.lineTo(x + wave, cy);
      }
      ctx.stroke();

      /* Top eruption head */
      const headR = 24 + Math.sin(obstacle.pulse * 1.5) * 4;
      const hg = ctx.createRadialGradient(x, y - 120, 0, x, y - 120, headR + 10);
      hg.addColorStop(0, 'rgba(240, 255, 255, 0.85)');
      hg.addColorStop(0.4, 'rgba(180, 240, 255, 0.45)');
      hg.addColorStop(0.7, 'rgba(120, 200, 255, 0.15)');
      hg.addColorStop(1, 'transparent');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(x, y - 120, headR + 10, 0, Math.PI * 2);
      ctx.fill();

      /* Spray droplets from top */
      for (let d = 0; d < 6; d++) {
        const dropAngle = -Math.PI / 2 + (d / 5 - 0.5) * 1.2;
        const dropDist = 20 + Math.sin(turbT * 3 + d * 1.3) * 12;
        const dx = x + Math.cos(dropAngle) * dropDist;
        const dy = y - 120 + Math.sin(dropAngle) * dropDist;
        const dropA = 0.3 + Math.sin(turbT * 2 + d) * 0.15;
        ctx.fillStyle = `rgba(200, 245, 255, ${dropA})`;
        ctx.beginPath();
        ctx.arc(dx, dy, 2 + Math.sin(turbT + d * 0.8) * 1, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Rising bubbles along the column */
      const bt = now * 0.003;
      for (let b = 0; b < 6; b++) {
        const bubbleLife = (bt * 0.5 + b * 0.167) % 1;
        const by = y + 100 - bubbleLife * 220;
        const bx = x + Math.sin(bt * 2 + b * 1.1) * 5;
        const bSize = 2 + Math.sin(bt + b * 0.7) * 1 + bubbleLife * 1.5;
        const bAlpha = (0.25 + Math.sin(bt + b) * 0.1) * (1 - bubbleLife * 0.5);
        ctx.fillStyle = `rgba(200, 240, 255, ${bAlpha})`;
        ctx.beginPath();
        ctx.arc(bx, by, bSize, 0, Math.PI * 2);
        ctx.fill();
        /* Bubble highlight */
        ctx.fillStyle = `rgba(240, 255, 255, ${bAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(bx - bSize * 0.3, by - bSize * 0.3, bSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Base vent cracks */
      ctx.strokeStyle = 'rgba(140, 200, 255, 0.2)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - 15, y + 118); ctx.lineTo(x - 8, y + 110); ctx.lineTo(x - 12, y + 100);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 116); ctx.lineTo(x + 6, y + 108); ctx.lineTo(x + 14, y + 96);
      ctx.stroke();

    } else {
      /* STORM */
      const stormR = 52 + Math.sin(obstacle.pulse) * 8;
      const rAngle = obstacle.pulse * 0.5;

      /* Multi-layer outer halo */
      const shg = ctx.createRadialGradient(x, y, stormR * 0.3, x, y, stormR * 1.6);
      shg.addColorStop(0, 'rgba(160, 200, 255, 0.06)');
      shg.addColorStop(0.5, 'rgba(140, 180, 255, 0.04)');
      shg.addColorStop(0.8, 'rgba(120, 160, 240, 0.02)');
      shg.addColorStop(1, 'transparent');
      ctx.fillStyle = shg;
      ctx.beginPath();
      ctx.arc(x, y, stormR * 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rAngle);

      /* Spiral arms */
      for (let arm = 0; arm < 4; arm++) {
        const armAngle = (Math.PI * 2 / 4) * arm;
        ctx.strokeStyle = `rgba(170, 210, 255, ${0.12 + Math.sin(obstacle.pulse + arm) * 0.05})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let t = 0; t < 1; t += 0.02) {
          const spiralR = stormR * 0.15 + t * stormR * 0.8;
          const spiralA = armAngle + t * 2.5;
          const px = Math.cos(spiralA) * spiralR;
          const py = Math.sin(spiralA) * spiralR;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      /* Inner vortex rings */
      for (let ring = 0; ring < 3; ring++) {
        const ringR = stormR * (0.25 + ring * 0.2);
        const ringAlpha = 0.15 - ring * 0.04 + Math.sin(obstacle.pulse * 1.5 + ring) * 0.05;
        ctx.strokeStyle = `rgba(190, 220, 255, ${ringAlpha})`;
        ctx.lineWidth = 1 - ring * 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      /* Central eye */
      const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, stormR * 0.2);
      eyeGrad.addColorStop(0, 'rgba(220, 240, 255, 0.15)');
      eyeGrad.addColorStop(0.5, 'rgba(180, 210, 255, 0.08)');
      eyeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, stormR * 0.2, 0, Math.PI * 2);
      ctx.fill();

      /* Outer boundary ring — pulsing */
      ctx.strokeStyle = `rgba(185, 220, 255, ${0.35 + Math.sin(obstacle.pulse * 2) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, stormR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      /* Electric discharge arcs */
      const arcChance = Math.sin(obstacle.pulse * 3);
      if (arcChance > 0.85) {
        const arcAngle = obstacle.pulse * 2.3;
        ctx.strokeStyle = `rgba(200, 240, 255, ${0.3 + arcChance * 0.3})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const startR = stormR * 0.3;
        const endR = stormR * 0.9;
        ctx.moveTo(Math.cos(arcAngle) * startR, Math.sin(arcAngle) * startR);
        const midA = arcAngle + 0.3;
        ctx.lineTo(Math.cos(midA) * (startR + endR) * 0.4, Math.sin(midA) * (startR + endR) * 0.4);
        const mid2A = arcAngle + 0.1;
        ctx.lineTo(Math.cos(mid2A) * (startR + endR) * 0.6, Math.sin(mid2A) * (startR + endR) * 0.6);
        ctx.lineTo(Math.cos(arcAngle - 0.15) * endR, Math.sin(arcAngle - 0.15) * endR);
        ctx.stroke();
      }

      /* Lightning flash */
      if (Math.random() < 0.015) {
        ctx.strokeStyle = 'rgba(240, 250, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -stormR * 0.4);
        ctx.lineTo(6, -stormR * 0.1);
        ctx.lineTo(-2, stormR * 0.05);
        ctx.lineTo(8, stormR * 0.3);
        ctx.stroke();
        /* Lightning glow */
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.2)';
        ctx.lineWidth = 6;
        ctx.stroke();
        world.ambientFlash = 0.14;
      }

      /* Debris particles orbiting */
      for (let d = 0; d < 5; d++) {
        const debrisAngle = obstacle.pulse * (0.8 + d * 0.12) + d * 1.26;
        const debrisR = stormR * (0.5 + d * 0.1);
        const dx = Math.cos(debrisAngle) * debrisR;
        const dy = Math.sin(debrisAngle) * debrisR;
        ctx.fillStyle = `rgba(180, 215, 255, ${0.2 + Math.sin(obstacle.pulse + d) * 0.1})`;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

function drawGlider() {
  /* Trail */
  for (let i = glider.trail.length - 1; i >= 0; i--) {
    const trail = glider.trail[i];
    const ratio = Math.max(0, trail.life / 0.87);
    const alpha = ratio * 0.25;
    const size = 10 * ratio;
    if (size > 1) {
      const tg = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, size * 1.8);
      tg.addColorStop(0, `rgba(160, 255, 245, ${alpha})`);
      tg.addColorStop(0.4, `rgba(120, 220, 230, ${alpha * 0.5})`);
      tg.addColorStop(1, 'transparent');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, size * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  glider.trail = glider.trail.filter((t) => t.life > 0);

  const phase = glider.symbiosisTimer > 0;
  const pop = 1 + glider.pulsePop * 0.15;
  const tilt = glider.vy * 0.002;
  const now = performance.now();
  const breathe = Math.sin(now * 0.004);
  const wingFlap = Math.sin(now * 0.008 + glider.pulsePop * 4) * 0.3;

  /* Outer glow */
  const glowPulse = breathe * 0.03;
  const outerAlpha = phase ? 0.12 + glowPulse : 0.06 + glowPulse;
  const outerR = (phase ? 48 : 36) * pop;
  const og = ctx.createRadialGradient(glider.x, glider.y, 0, glider.x, glider.y, outerR);
  og.addColorStop(0, `rgba(130, 255, 240, ${outerAlpha})`);
  og.addColorStop(0.5, `rgba(100, 200, 230, ${outerAlpha * 0.4})`);
  og.addColorStop(1, 'transparent');
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.arc(glider.x, glider.y, outerR, 0, Math.PI * 2);
  ctx.fill();

  const bodyAlpha = phase ? 0.42 + Math.sin(now * 0.015) * 0.14 : 0.88;

  ctx.save();
  ctx.translate(glider.x, glider.y);
  ctx.rotate(tilt);

  /* --- Tail fin (behind body) --- */
  const tailSpread = 1 + breathe * 0.15;
  ctx.fillStyle = `rgba(80, 220, 210, ${bodyAlpha * 0.45})`;
  ctx.beginPath();
  ctx.moveTo(-16 * pop, 0);
  ctx.quadraticCurveTo(-26 * pop, -10 * pop * tailSpread, -32 * pop, -6 * pop * tailSpread);
  ctx.quadraticCurveTo(-24 * pop, 0, -32 * pop, 6 * pop * tailSpread);
  ctx.quadraticCurveTo(-26 * pop, 10 * pop * tailSpread, -16 * pop, 0);
  ctx.closePath();
  ctx.fill();
  /* Tail fin edge highlight */
  ctx.strokeStyle = `rgba(160, 255, 240, ${bodyAlpha * 0.25})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  /* --- Membrane wings --- */
  const wingAngleTop = -0.35 - wingFlap;
  const wingAngleBot = 0.35 + wingFlap;
  const wingLen = 26 * pop;
  const wingW = 14 * pop;

  /* Top wing */
  ctx.fillStyle = `rgba(100, 240, 230, ${bodyAlpha * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(-4, -5 * pop);
  ctx.quadraticCurveTo(
    Math.cos(wingAngleTop) * wingLen * 0.5, -5 * pop + Math.sin(wingAngleTop) * wingLen * 0.5 - wingW * 0.6,
    Math.cos(wingAngleTop) * wingLen, -5 * pop + Math.sin(wingAngleTop) * wingLen
  );
  ctx.quadraticCurveTo(
    Math.cos(wingAngleTop) * wingLen * 0.6 + 4, -5 * pop + Math.sin(wingAngleTop) * wingLen * 0.3,
    2, -4 * pop
  );
  ctx.closePath();
  ctx.fill();
  /* Wing membrane veins */
  ctx.strokeStyle = `rgba(160, 255, 245, ${bodyAlpha * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-1, -6 * pop);
  ctx.quadraticCurveTo(
    Math.cos(wingAngleTop) * wingLen * 0.4, -5 * pop + Math.sin(wingAngleTop) * wingLen * 0.4 - 3,
    Math.cos(wingAngleTop) * wingLen * 0.8, -5 * pop + Math.sin(wingAngleTop) * wingLen * 0.8
  );
  ctx.stroke();

  /* Bottom wing */
  ctx.fillStyle = `rgba(100, 240, 230, ${bodyAlpha * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(-4, 5 * pop);
  ctx.quadraticCurveTo(
    Math.cos(wingAngleBot) * wingLen * 0.5, 5 * pop + Math.sin(wingAngleBot) * wingLen * 0.5 + wingW * 0.6,
    Math.cos(wingAngleBot) * wingLen, 5 * pop + Math.sin(wingAngleBot) * wingLen
  );
  ctx.quadraticCurveTo(
    Math.cos(wingAngleBot) * wingLen * 0.6 + 4, 5 * pop + Math.sin(wingAngleBot) * wingLen * 0.3,
    2, 4 * pop
  );
  ctx.closePath();
  ctx.fill();
  /* Wing vein */
  ctx.strokeStyle = `rgba(160, 255, 245, ${bodyAlpha * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-1, 6 * pop);
  ctx.quadraticCurveTo(
    Math.cos(wingAngleBot) * wingLen * 0.4, 5 * pop + Math.sin(wingAngleBot) * wingLen * 0.4 + 3,
    Math.cos(wingAngleBot) * wingLen * 0.8, 5 * pop + Math.sin(wingAngleBot) * wingLen * 0.8
  );
  ctx.stroke();

  /* --- Main body (segmented, tapered) --- */
  const bodyGrad = ctx.createLinearGradient(-18 * pop, 0, 14 * pop, 0);
  bodyGrad.addColorStop(0, `rgba(60, 190, 200, ${bodyAlpha * 0.5})`);
  bodyGrad.addColorStop(0.3, `rgba(112, 255, 233, ${bodyAlpha * 0.85})`);
  bodyGrad.addColorStop(0.7, `rgba(180, 255, 248, ${bodyAlpha})`);
  bodyGrad.addColorStop(1, `rgba(200, 255, 250, ${bodyAlpha * 0.9})`);
  ctx.fillStyle = bodyGrad;

  /* Tapered body shape - pointed nose, wider mid, tapered tail */
  ctx.beginPath();
  ctx.moveTo(16 * pop, 0);                                    /* nose tip */
  ctx.quadraticCurveTo(12 * pop, -6 * pop, 4 * pop, -8 * pop); /* forehead curve */
  ctx.quadraticCurveTo(-6 * pop, -9 * pop, -14 * pop, -5 * pop); /* upper back */
  ctx.quadraticCurveTo(-18 * pop, -2 * pop, -18 * pop, 0);     /* tail top */
  ctx.quadraticCurveTo(-18 * pop, 2 * pop, -14 * pop, 5 * pop); /* tail bottom */
  ctx.quadraticCurveTo(-6 * pop, 9 * pop, 4 * pop, 8 * pop);   /* lower back */
  ctx.quadraticCurveTo(12 * pop, 6 * pop, 16 * pop, 0);        /* chin curve */
  ctx.closePath();
  ctx.fill();

  /* Body segment lines */
  ctx.strokeStyle = `rgba(160, 255, 245, ${bodyAlpha * 0.15})`;
  ctx.lineWidth = 0.6;
  for (let seg = 0; seg < 3; seg++) {
    const sx = -4 * pop + seg * -4 * pop;
    const segH = (8 - seg * 1.2) * pop;
    ctx.beginPath();
    ctx.moveTo(sx, -segH);
    ctx.quadraticCurveTo(sx - 1, 0, sx, segH);
    ctx.stroke();
  }

  /* Dorsal ridge */
  ctx.strokeStyle = `rgba(200, 255, 250, ${bodyAlpha * 0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12 * pop, -2 * pop);
  ctx.quadraticCurveTo(0, -9.5 * pop, -14 * pop, -5 * pop);
  ctx.stroke();

  /* Bioluminescent spots along body */
  const spotAlpha = bodyAlpha * (0.3 + breathe * 0.15);
  ctx.fillStyle = `rgba(180, 255, 255, ${spotAlpha})`;
  for (let i = 0; i < 4; i++) {
    const spotX = 6 * pop - i * 6 * pop;
    const spotY = -3 * pop + Math.sin(i * 1.2) * 1.5 * pop;
    const spotR = (1.2 - i * 0.15) * pop;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
    ctx.fill();
  }
  /* Ventral bioluminescence */
  ctx.fillStyle = `rgba(130, 255, 220, ${spotAlpha * 0.6})`;
  for (let i = 0; i < 3; i++) {
    const spotX = 2 * pop - i * 5 * pop;
    ctx.beginPath();
    ctx.arc(spotX, 4 * pop, 0.8 * pop, 0, Math.PI * 2);
    ctx.fill();
  }

  /* --- Head detail --- */
  /* Snout highlight */
  const snoutGrad = ctx.createRadialGradient(12 * pop, -1, 1, 12 * pop, -1, 6 * pop);
  snoutGrad.addColorStop(0, `rgba(220, 255, 255, ${bodyAlpha * 0.5})`);
  snoutGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = snoutGrad;
  ctx.beginPath();
  ctx.arc(12 * pop, -1, 6 * pop, 0, Math.PI * 2);
  ctx.fill();

  /* Eye - larger, with pupil and specular highlight */
  /* Eye socket */
  ctx.fillStyle = `rgba(20, 60, 80, ${bodyAlpha * 0.6})`;
  ctx.beginPath();
  ctx.ellipse(9 * pop, -3 * pop, 3.5 * pop, 2.8 * pop, -0.15, 0, Math.PI * 2);
  ctx.fill();
  /* Iris */
  const irisGrad = ctx.createRadialGradient(9 * pop, -3 * pop, 0, 9 * pop, -3 * pop, 3 * pop);
  irisGrad.addColorStop(0, `rgba(100, 255, 230, ${bodyAlpha})`);
  irisGrad.addColorStop(0.6, `rgba(50, 200, 180, ${bodyAlpha * 0.9})`);
  irisGrad.addColorStop(1, `rgba(30, 120, 130, ${bodyAlpha * 0.7})`);
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.ellipse(9 * pop, -3 * pop, 3 * pop, 2.4 * pop, -0.15, 0, Math.PI * 2);
  ctx.fill();
  /* Pupil */
  ctx.fillStyle = `rgba(5, 20, 30, ${bodyAlpha * 0.9})`;
  ctx.beginPath();
  ctx.ellipse(9.5 * pop, -3 * pop, 1.2 * pop, 1.8 * pop, 0, 0, Math.PI * 2);
  ctx.fill();
  /* Specular highlight */
  ctx.fillStyle = `rgba(240, 255, 255, ${bodyAlpha * 0.95})`;
  ctx.beginPath();
  ctx.arc(10.5 * pop, -4 * pop, 1 * pop, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(200, 255, 250, ${bodyAlpha * 0.5})`;
  ctx.beginPath();
  ctx.arc(8 * pop, -2.2 * pop, 0.6 * pop, 0, Math.PI * 2);
  ctx.fill();

  /* --- Antennae --- */
  const antennaWave = Math.sin(now * 0.006) * 3;
  ctx.strokeStyle = `rgba(140, 255, 240, ${bodyAlpha * 0.5})`;
  ctx.lineWidth = 0.8;
  /* Top antenna */
  ctx.beginPath();
  ctx.moveTo(11 * pop, -6 * pop);
  ctx.quadraticCurveTo(16 * pop, -14 * pop + antennaWave, 20 * pop, -12 * pop + antennaWave * 0.8);
  ctx.stroke();
  /* Antenna tip glow */
  ctx.fillStyle = `rgba(180, 255, 255, ${bodyAlpha * (0.5 + breathe * 0.2)})`;
  ctx.beginPath();
  ctx.arc(20 * pop, -12 * pop + antennaWave * 0.8, 1.5 * pop, 0, Math.PI * 2);
  ctx.fill();
  /* Bottom antenna (shorter) */
  ctx.strokeStyle = `rgba(140, 255, 240, ${bodyAlpha * 0.4})`;
  ctx.beginPath();
  ctx.moveTo(12 * pop, -4.5 * pop);
  ctx.quadraticCurveTo(18 * pop, -8 * pop - antennaWave * 0.5, 21 * pop, -6 * pop - antennaWave * 0.4);
  ctx.stroke();
  ctx.fillStyle = `rgba(180, 255, 255, ${bodyAlpha * (0.4 + breathe * 0.15)})`;
  ctx.beginPath();
  ctx.arc(21 * pop, -6 * pop - antennaWave * 0.4, 1 * pop, 0, Math.PI * 2);
  ctx.fill();

  /* --- Pectoral fins (small, near head) --- */
  ctx.fillStyle = `rgba(120, 245, 235, ${bodyAlpha * 0.35})`;
  /* Upper pectoral */
  ctx.beginPath();
  ctx.moveTo(4 * pop, -7 * pop);
  ctx.quadraticCurveTo(8 * pop, -13 * pop + wingFlap * 4, 2 * pop, -12 * pop + wingFlap * 3);
  ctx.quadraticCurveTo(0, -9 * pop, 4 * pop, -7 * pop);
  ctx.fill();
  /* Lower pectoral */
  ctx.beginPath();
  ctx.moveTo(4 * pop, 7 * pop);
  ctx.quadraticCurveTo(8 * pop, 13 * pop - wingFlap * 4, 2 * pop, 12 * pop - wingFlap * 3);
  ctx.quadraticCurveTo(0, 9 * pop, 4 * pop, 7 * pop);
  ctx.fill();

  ctx.restore();

  /* Crash dissipation rings */
  if (glider.crashed) {
    const fade = 0.3 + Math.sin(glider.flicker) * 0.15;
    for (let r = 0; r < 3; r++) {
      const ringR = 18 + r * 14 + glider.flicker * 3;
      const ringA = fade * (1 - r * 0.3) * Math.max(0, 1 - glider.flicker * 0.05);
      ctx.strokeStyle = `rgba(160, 230, 255, ${ringA})`;
      ctx.lineWidth = 1.5 - r * 0.3;
      ctx.beginPath();
      ctx.arc(glider.x, glider.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawParticles() {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    const ratio = p.life / p.maxLife;
    const alpha = ratio * 0.7;
    const size = (p.size || 2.2) * (0.5 + ratio * 0.5);
    const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
    pg.addColorStop(0, `hsla(${p.hue}, 80%, 78%, ${alpha})`);
    pg.addColorStop(0.5, `hsla(${p.hue}, 60%, 60%, ${alpha * 0.3})`);
    pg.addColorStop(1, 'transparent');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawScorePop() {
  if (world.scorePop > 0) {
    const scale = 1 + world.scorePop * 0.5;
    const alpha = world.scorePop;
    ctx.save();
    ctx.translate(world.width / 2, 60);
    ctx.scale(scale, scale);
    ctx.fillStyle = `rgba(200, 255, 245, ${alpha})`;
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+1', 0, 0);
    ctx.restore();
  }
}

function drawVignette() {
  const vg = ctx.createRadialGradient(
    world.width / 2, world.height / 2, world.height * 0.15,
    world.width / 2, world.height / 2, world.width * 0.7
  );
  vg.addColorStop(0, 'rgba(8, 12, 30, 0.35)');
  vg.addColorStop(1, 'rgba(4, 6, 16, 0.65)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawAnnouncements(dt) {
  /* Atmosphere announcement */
  if (world.atmosphereAnnounce && world.atmosphereAnnounce.timer > 0) {
    const a = world.atmosphereAnnounce;
    const alpha = Math.min(1, a.timer) * 0.7;
    const densityColor = world.densityLabel === 'Buoyant' ? '130, 230, 200' :
                         world.densityLabel === 'Dense' ? '180, 180, 255' : '255, 140, 140';
    ctx.fillStyle = `rgba(${densityColor}, ${alpha})`;
    ctx.font = '600 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.text, world.width / 2, world.height * 0.28);
    a.timer -= dt;
  }

  /* Zone announcement */
  if (world.zoneAnnounce && world.zoneAnnounce.timer > 0) {
    const z = world.zoneAnnounce;
    const alpha = Math.min(1, z.timer / 0.5) * 0.8;
    ctx.fillStyle = `rgba(220, 240, 255, ${alpha})`;
    ctx.font = '600 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.text, world.width / 2, world.height * 0.20);
    z.timer -= dt;
  }

  /* Achievement toast */
  if (world.achievementToast && world.achievementToast.timer > 0) {
    const toast = world.achievementToast;
    const alpha = Math.min(1, toast.timer) * 0.9;
    let yOff = world.height * 0.85;
    for (const ach of toast.items) {
      ctx.fillStyle = `rgba(10, 20, 40, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.roundRect(world.width / 2 - 140, yOff - 16, 280, 32, 8);
      ctx.fill();
      ctx.fillStyle = `rgba(180, 255, 230, ${alpha})`;
      ctx.font = '500 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Achievement: ${ach.name}`, world.width / 2, yOff + 4);
      yOff += 38;
    }
    toast.timer -= dt;
  }
}

function drawText(dt) {
  if (world.state === STATE.MENU) {
    drawVignette();
    const t = performance.now() * 0.001;
    const float = Math.sin(t * 1.5) * 4;

    ctx.fillStyle = '#d8eaff';
    ctx.textAlign = 'center';

    if (!tutorialDone) {
      /* Tutorial panels */
      ctx.font = '600 30px Inter, sans-serif';
      const msgs = [
        ['Pulse Upward', 'Tap Space or Click to pulse the glider upward'],
        ['Avoid Hazards', 'Navigate through spires, schools, geysers, and storms'],
        ['Symbiosis', 'Press Shift when charged to phase through obstacles'],
      ];
      const step = Math.min(tutorialStep, 2);
      ctx.fillText(msgs[step][0], world.width / 2, world.height / 2 - 20 + float);
      ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
      ctx.font = '500 17px Inter, sans-serif';
      ctx.fillText(msgs[step][1], world.width / 2, world.height / 2 + 16 + float);
      ctx.font = '400 14px Inter, sans-serif';
      ctx.fillStyle = 'rgba(160, 200, 240, 0.5)';
      ctx.fillText(`(${step + 1}/3) Tap to continue`, world.width / 2, world.height / 2 + 48 + float);
    } else {
      ctx.font = '600 42px Inter, sans-serif';
      ctx.fillText('METHANE DRIFT', world.width / 2, world.height / 2 - 24 + float);
      ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
      ctx.font = '500 18px Inter, sans-serif';
      ctx.fillText('Space / Click to Begin', world.width / 2, world.height / 2 + 14 + float);
      if (world.best > 0) {
        ctx.font = '500 15px Inter, sans-serif';
        ctx.fillStyle = 'rgba(160, 200, 240, 0.5)';
        ctx.fillText(`Best: ${world.best}`, world.width / 2, world.height / 2 + 42 + float);
      }
    }
  }

  if (world.state === STATE.PAUSED) {
    drawVignette();
    ctx.fillStyle = '#d8eaff';
    ctx.textAlign = 'center';
    ctx.font = '600 34px Inter, sans-serif';
    ctx.fillText('Paused', world.width / 2, world.height / 2 - 10);
    ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
    ctx.font = '500 17px Inter, sans-serif';
    ctx.fillText('Press Escape or tap X to resume', world.width / 2, world.height / 2 + 24);

    /* X close button — top right */
    const xBtnX = world.width - 56;
    const xBtnY = 16;
    const xBtnSize = 40;
    ctx.beginPath();
    ctx.roundRect(xBtnX, xBtnY, xBtnSize, xBtnSize, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const cx = xBtnX + xBtnSize / 2;
    const cy = xBtnY + xBtnSize / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8);
    ctx.lineTo(cx + 8, cy + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 8);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.stroke();
  }

  if (world.state === STATE.GAMEOVER) {
    drawVignette();
    ctx.fillStyle = '#d8eaff';
    ctx.textAlign = 'center';
    ctx.font = '600 38px Inter, sans-serif';
    ctx.fillText('Signal Lost', world.width / 2, world.height / 2 - 40);

    ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText(`Distance: ${world.score}`, world.width / 2, world.height / 2);

    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText(`Best: ${world.best}`, world.width / 2, world.height / 2 + 28);

    if (world.score === world.best && world.score > 0) {
      ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
      ctx.font = '700 16px Inter, sans-serif';
      ctx.fillText('NEW RECORD', world.width / 2, world.height / 2 + 52);
    }

    /* Quick stats */
    ctx.fillStyle = 'rgba(160, 200, 240, 0.5)';
    ctx.font = '400 13px Inter, sans-serif';
    const statsY = world.height / 2 + 76;
    ctx.fillText(
      `Dodged: ${world.runStats.obstaclesDodged}  |  Near-misses: ${world.runStats.nearMisses}  |  Time: ${world.runStats.timeAlive.toFixed(1)}s`,
      world.width / 2, statsY
    );

    ctx.fillStyle = 'rgba(150, 190, 230, 0.45)';
    ctx.font = '400 14px Inter, sans-serif';
    ctx.fillText('Tap or press Space to restart', world.width / 2, statsY + 28);
  }
}

function drawCanvasHUD() {
  if (world.state !== STATE.PLAYING && world.state !== STATE.CRASHING) return;
  ctx.save();
  ctx.textAlign = 'left';

  /* Score */
  ctx.font = '600 28px Inter, sans-serif';
  ctx.fillStyle = 'rgba(220, 240, 255, 0.85)';
  ctx.fillText(String(world.score), 20, 36);

  /* Atmosphere label */
  const densityColor = world.densityLabel === 'Buoyant' ? 'rgba(130, 230, 200, 0.7)' :
                       world.densityLabel === 'Dense' ? 'rgba(180, 180, 255, 0.7)' : 'rgba(255, 140, 140, 0.7)';
  ctx.font = '500 14px Inter, sans-serif';
  ctx.fillStyle = densityColor;
  ctx.fillText(world.densityLabel, 20, 56);

  /* Symbiosis button — bottom left */
  const btnX = 20;
  const btnY = world.height - 58;
  const btnW = 110;
  const btnH = 38;
  const ready = glider.symbiosisCharge >= 1 && glider.symbiosisTimer <= 0;
  const phasing = glider.symbiosisTimer > 0;

  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  if (phasing) {
    ctx.fillStyle = 'rgba(130, 255, 240, 0.25)';
  } else if (ready) {
    ctx.fillStyle = 'rgba(130, 255, 200, 0.2)';
  } else {
    ctx.fillStyle = 'rgba(80, 100, 140, 0.15)';
  }
  ctx.fill();
  ctx.strokeStyle = ready ? 'rgba(130, 255, 200, 0.5)' : phasing ? 'rgba(130, 255, 240, 0.4)' : 'rgba(120, 150, 200, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillStyle = phasing ? 'rgba(130, 255, 240, 0.9)' : ready ? 'rgba(130, 255, 200, 0.85)' : 'rgba(160, 180, 210, 0.4)';
  ctx.fillText(phasing ? 'Phasing' : ready ? 'Symbiosis' : 'Charging', btnX + btnW / 2, btnY + btnH / 2 + 5);

  /* Symbiosis status — top right */
  ctx.textAlign = 'right';
  const symLabel = glider.symbiosisTimer > 0 ? 'Phasing' : glider.symbiosisCharge >= 1 ? 'Symbiosis Ready' : 'Charging';
  const symColor = glider.symbiosisTimer > 0 ? 'rgba(130, 255, 240, 0.8)' :
                   glider.symbiosisCharge >= 1 ? 'rgba(130, 255, 200, 0.7)' : 'rgba(180, 200, 230, 0.4)';
  ctx.fillStyle = symColor;
  ctx.fillText(symLabel, world.width - 20, 36);

  /* Combo */
  if (world.combo > 0) {
    ctx.fillStyle = 'rgba(180, 255, 230, 0.8)';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(`Combo x${world.combo}`, world.width - 20, 56);
  }

  ctx.restore();
}

function drawWhiteFlash() {
  if (world.flashWhite > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.5, world.flashWhite)})`;
    ctx.fillRect(0, 0, world.width, world.height);
  }
}

/* --- Trail life decay (called during draw) --- */
function decayTrails(dt) {
  for (const trail of glider.trail) trail.life -= dt;
}

/* --- Zone transition decay --- */
function decayZoneTransition(dt) {
  if (world.zoneTransition > 0) {
    world.zoneTransition -= dt * 2;
    if (world.zoneTransition < 0) world.zoneTransition = 0;
  }
}

/* --- Ambient flash decay (frame-rate independent) --- */
function decayAmbientFlash(dt) {
  if (world.ambientFlash > 0) {
    world.ambientFlash *= Math.pow(0.002, dt);
    if (world.ambientFlash < 0.001) world.ambientFlash = 0;
  }
}

/* --- White flash decay --- */
function decayWhiteFlash(dt) {
  if (world.flashWhite > 0) {
    world.flashWhite -= dt * 3;
    if (world.flashWhite < 0) world.flashWhite = 0;
  }
}

/* ========== GAME LOOP ========== */

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const rawDt = Math.min((timestamp - lastTime) / 1000, CONFIG.maxDt);
  lastTime = timestamp;

  /* Lerp timeScale toward target */
  if (!reducedMotion) {
    world.timeScale += (world.timeScaleTarget - world.timeScale) * Math.min(1, world.timeScaleLerpSpeed * rawDt);
  }
  const dt = rawDt * world.timeScale;

  update(dt, rawDt);
  decayTrails(dt);
  decayZoneTransition(dt);
  decayAmbientFlash(rawDt);
  decayWhiteFlash(rawDt);

  /* Draw with screen shake */
  ctx.save();
  if (world.shakeTimer > 0 && !reducedMotion) {
    const sx = (Math.random() - 0.5) * world.shakeIntensity;
    const sy = (Math.random() - 0.5) * world.shakeIntensity;
    ctx.translate(sx, sy);
  }

  drawBackground();
  drawMotes();
  drawObstacles();
  drawParticles();
  drawGlider();
  drawScorePop();
  drawCanvasHUD();
  drawWhiteFlash();
  drawAnnouncements(dt);
  drawText(dt);

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

/* ========== INPUT ========== */

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    pulse();
  }
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    activateSymbiosis();
  }
  if (event.code === 'Escape') {
    if (world.state === STATE.PLAYING) {
      world.state = STATE.PAUSED;
      lastTime = 0;
      Audio.stopDrone();
    } else if (world.state === STATE.PAUSED) {
      world.state = STATE.PLAYING;
      lastTime = 0;
      Audio.startDrone();
    }
  }
});

/* Convert pointer event to canvas game coordinates */
function canvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width * world.width,
    y: (event.clientY - rect.top) / rect.height * world.height,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  const pos = canvasCoords(event);

  /* Pause X button hit test */
  if (world.state === STATE.PAUSED) {
    const xBtnX = world.width - 56;
    const xBtnY = 16;
    const xBtnSize = 40;
    if (pos.x >= xBtnX && pos.x <= xBtnX + xBtnSize && pos.y >= xBtnY && pos.y <= xBtnY + xBtnSize) {
      world.state = STATE.PLAYING;
      lastTime = 0;
      Audio.startDrone();
      return;
    }
  }

  /* Symbiosis button hit test during gameplay */
  if (world.state === STATE.PLAYING) {
    const btnX = 20;
    const btnY = world.height - 58;
    const btnW = 110;
    const btnH = 38;
    if (pos.x >= btnX && pos.x <= btnX + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
      activateSymbiosis();
      return;
    }
  }

  pulse();
});

restartBtn.addEventListener('click', resetGame);

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    const muted = Audio.toggle();
    muteBtn.textContent = muted ? 'Sound: OFF' : 'Sound: ON';
  });
}

/* Fullscreen toggle button */
const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  });
}

/* Pause on visibility change */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.state === STATE.PLAYING) {
    world.state = STATE.PAUSED;
    lastTime = 0;
    Audio.stopDrone();
  }
});

/* Mobile symbiosis button */
const symbiosisBtn = document.getElementById('symbiosisBtn');
if (symbiosisBtn) {
  if ('ontouchstart' in window) {
    symbiosisBtn.hidden = false;
    symbiosisBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      activateSymbiosis();
    });
  }
}

/* ========== INIT ========== */

Audio.init();
loadProgress();
loadBestScore();
try {
  tutorialDone = localStorage.getItem('methaneDriftTutorialDone') === 'true';
} catch (e) { /* */ }
resetGame();
requestAnimationFrame(gameLoop);

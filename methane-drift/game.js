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
  symbiosisCooldown: 6.0,
  baseSpawnRate: 1.35,
  maxDt: 0.033,
  width: 960,
  height: 540,
  densitySurfWindow: 0.4,
  densitySurfBoostDuration: 1.0,
  densitySurfBoostMultiplier: 2.0,
  stormPullStrength: 80,
  stormPullRadius: 120,
  geyserEruptCycle: 2.5,
  geyserEruptPause: 1.0,
  schoolScatterRadius: 100,
  schoolScatterDuration: 1.5,
  difficulty: {
    scrollSpeed:     { start: 195, cap: 340, scaleScore: 100 },
    spawnRate:       { start: 1.35, cap: 2.4, scaleScore: 100 },
    obstacleDrift:   { start: 22, cap: 70, scaleScore: 100 },
    atmosphereCycle: { start: 6.0, cap: 2.8, scaleScore: 100 },
  },
  comboThresholds: [
    { at: 3, multiplier: 1.5, label: 'x1.5' },
    { at: 5, multiplier: 2.0, label: 'x2' },
    { at: 10, multiplier: 3.0, label: 'x3' },
    { at: 20, multiplier: 5.0, label: 'x5' },
  ],
  loreMessages: [
    { score: 5, text: 'Signal detected: biological origin...' },
    { score: 12, text: 'Atmospheric composition: 94% methane, trace organics' },
    { score: 20, text: 'Warning: symbiont bond strengthening' },
    { score: 35, text: 'Deep current detected — navigating pressure gradient' },
    { score: 50, text: 'Core pressure readings: anomalous' },
    { score: 65, text: 'Bioluminescent signatures intensifying' },
    { score: 80, text: 'Warning: entity signatures detected ahead' },
    { score: 100, text: 'You have reached the unstable core. There is no return.' },
  ],
  zoneColors: [
    { bg1: '#1a2248', bg2: '#111540', bg3: '#0a0d2e', bg4: '#030410', hue: 220, name: 'Upper Atmosphere' },
    { bg1: '#0a3038', bg2: '#0a2828', bg3: '#082020', bg4: '#031210', hue: 170, name: 'Mid Turbulence' },
    { bg1: '#2a1040', bg2: '#201038', bg3: '#180828', bg4: '#0a0310', hue: 280, name: 'Pressure Layer' },
    { bg1: '#3a1818', bg2: '#2a1010', bg3: '#200808', bg4: '#100404', hue: 15, name: 'Core Proximity' },
    { bg1: '#1a2248', bg2: '#111540', bg3: '#0a0d2e', bg4: '#030410', hue: 220, name: 'Unstable Core' },
  ],
  skins: {
    default:  { name: 'Drifter',       glowHue: 170, bodyHue: 160, trailHue: 170 },
    ember:    { name: 'Ember',          glowHue: 15,  bodyHue: 10,  trailHue: 20  },
    void:     { name: 'Void Walker',    glowHue: 270, bodyHue: 260, trailHue: 280 },
    solar:    { name: 'Solar Wind',     glowHue: 45,  bodyHue: 40,  trailHue: 50  },
    deep:     { name: 'Deep Current',   glowHue: 200, bodyHue: 210, trailHue: 195 },
    spectral: { name: 'Spectral',       glowHue: 300, bodyHue: 310, trailHue: 290 },
  },
  skinUnlocks: {
    default:  { type: 'default' },
    ember:    { type: 'score', value: 50, desc: 'Score 50+' },
    void:     { type: 'achievement', value: 'untouchable', desc: 'Untouchable achievement' },
    solar:    { type: 'runs', value: 25, desc: 'Complete 25 runs' },
    deep:     { type: 'score', value: 100, desc: 'Score 100+' },
    spectral: { type: 'achievement', value: 'near_miss_expert', desc: 'Near-Miss Expert achievement' },
  },
};

const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', CRASHING: 'crashing', GAMEOVER: 'gameover' };

const ACHIEVEMENTS = [
  { id: 'first_drift', name: 'First Drift', desc: 'Score 1 point', check: (s) => s.bestScore >= 1 },
  { id: 'deep_diver', name: 'Deep Diver', desc: 'Score 25 points', check: (s) => s.bestScore >= 25 },
  { id: 'pressure_veteran', name: 'Pressure Veteran', desc: 'Score 50 points', check: (s) => s.bestScore >= 50 },
  { id: 'core_runner', name: 'Core Runner', desc: 'Score 100 points', check: (s) => s.bestScore >= 100 },
  { id: 'symbiont', name: 'Shield Expert', desc: 'Use your shield 10 times total', check: (s) => s.totalSymbiosis >= 10 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Score 20 without using your shield', check: (s) => s.noSymbiosisRecord >= 20 },
  { id: 'density_master', name: 'Density Master', desc: 'Survive 5 Heavy air phases in one run', check: (s) => s.crushingPhasesThisRun >= 5 },
  { id: 'near_miss_expert', name: 'Close Call Expert', desc: '10 close calls in one run', check: (s) => s.nearMissesThisRun >= 10 },
  { id: 'combo_adept', name: 'Combo Adept', desc: 'Reach a 5x combo', check: (s) => s.longestStreak >= 5 },
  { id: 'combo_master', name: 'Combo Master', desc: 'Reach a 10x combo', check: (s) => s.longestStreak >= 10 },
  { id: 'density_surfer', name: 'Wave Rider', desc: 'Ride the air change 5 times in one run', check: (s) => s.densitySurfsThisRun >= 5 },
  { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat 3 bosses in one run', check: (s) => s.bossesDefeatedThisRun >= 3 },
  { id: 'marathon', name: 'Marathon Runner', desc: 'Stay alive for 2 minutes in one run', check: (s) => s.longestTimeAlive >= 120 },
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

/* --- i18n setup --- */
const _t = (key) => I18N.t(key);
I18N.createSelector(document.querySelector('.hud-panel'));
I18N.applyDOM();

/* Density key → i18n key mapping */
const DENSITY_I18N = { Buoyant: 'buoyant', Dense: 'dense', Crushing: 'crushing' };

/* Zone name i18n keys */
const ZONE_I18N = ['upperAtmosphere', 'midTurbulence', 'pressureLayer', 'coreProximity', 'unstableCore'];

/* Achievement i18n key mapping */
const ACH_I18N = {
  first_drift: { name: 'achFirstDrift', desc: 'achFirstDriftDesc' },
  deep_diver: { name: 'achDeepDiver', desc: 'achDeepDiverDesc' },
  pressure_veteran: { name: 'achPressureVet', desc: 'achPressureVetDesc' },
  core_runner: { name: 'achCoreRunner', desc: 'achCoreRunnerDesc' },
  symbiont: { name: 'achSymbiont', desc: 'achSymbiontDesc' },
  untouchable: { name: 'achUntouchable', desc: 'achUntouchableDesc' },
  density_master: { name: 'achDensityMaster', desc: 'achDensityMasterDesc' },
  near_miss_expert: { name: 'achNearMissExpert', desc: 'achNearMissExpertDesc' },
};

window.addEventListener('langchange', () => {
  I18N.applyDOM();
  /* Re-translate mute button based on current state */
  if (muteBtn) {
    const isMuted = muteBtn.textContent.includes('OFF') || muteBtn.textContent.includes('꺼') || muteBtn.textContent.includes('オフ') || muteBtn.textContent.includes('关') || muteBtn.textContent.includes('AV') || muteBtn.textContent.includes('KAPALI');
    muteBtn.textContent = isMuted ? _t('soundOff') : _t('soundOn');
  }
  /* Re-translate density label in sidebar */
  if (densityNode) densityNode.textContent = _t(DENSITY_I18N[world.densityLabel] || 'buoyant');
  /* Re-translate symbiosis status in sidebar */
  if (symbiosisNode) {
    symbiosisNode.textContent = glider.symbiosisTimer > 0 ? _t('phasing') : glider.symbiosisCharge >= 1 ? _t('ready') : _t('charging');
  }
});

/* --- Accessibility: reduced motion --- */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Particle Pool --- */
const PARTICLE_POOL_SIZE = 500;
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
  longestTimeAlive: 0,
  achievements: [],
  selectedSkin: 'default',
  selectedTrailColor: null,
  unlockedSkins: ['default'],
  bestGhostTrail: [],
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
  displayScore: 0,
  atmosphereTimer: 0,
  density: 0.72,
  densityLabel: 'Light',
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
  scorePopAmount: 0,
  flashWhite: 0,
  zone: 1,
  prevZone: 1,
  zoneTransition: 0,
  atmosphereAnnounce: null,
  zoneAnnounce: null,
  loreAnnounce: null,
  newAchievements: [],
  achievementToast: null,
  combo: 0,
  comboTimer: 0,
  comboMultiplier: 1,
  comboPop: 0,
  comboBreakPop: 0,
  starsFar: [],
  starsMid: [],
  starsNear: [],
  densitySurfTimer: 0,
  densitySurfBoost: 0,
  densityShiftJustHappened: 0,
  densityForecast: null,
  densityForecastTimer: 0,
  pressureAdaptation: 0,
  crushingWithoutSymbiosis: 0,
  boss: null,
  bossesDefeated: 0,
  edgeWarnings: [],
  ghostTrail: [],
  bestGhostTrail: [],
  ghostTrailTimer: 0,
  runStats: {
    obstaclesDodged: 0,
    symbiosisUses: 0,
    nearMisses: 0,
    crushingPhases: 0,
    timeAlive: 0,
    usedSymbiosis: false,
    densitySurfs: 0,
    bossesDefeated: 0,
    maxCombo: 0,
    totalScoreWithMultiplier: 0,
    closestNearMiss: 999,
    longestComboStreak: 0,
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
  symbiosisCooldown: 0,
  pulsePop: 0,
  glowIntensity: 1.0,
  comboGlow: 0,
};

const hazardTypes = ['spire', 'school', 'geyser', 'storm'];

let lastTime = 0;
let tutorialDone = false;
let tutorialStep = 0;
let isFullscreen = false;

/* --- First-encounter tips (shown once per session) --- */
const firstEncounterTips = {
  nearMiss: { shown: false, text: 'Nice! Fly close to obstacles for bonus points', timer: 0 },
  combo: { shown: false, text: 'Keep flying close to build your combo!', timer: 0 },
  densityShift: { shown: false, text: 'The air just changed \u2014 this affects your movement', timer: 0 },
  shield: { shown: false, text: 'Shield ready! Press Shift to become invincible', timer: 0 },
  boss: { shown: false, text: 'Boss ahead! Use your Shield to fly through and damage it', timer: 0 },
  geyser: { shown: false, text: 'Geyser! Wait for it to stop erupting, then fly past', timer: 0 },
  storm: { shown: false, text: 'Storm! It pulls you in \u2014 steer clear or use your Shield', timer: 0 },
};
let activeTip = null;

function showTip(key) {
  const tip = firstEncounterTips[key];
  if (!tip || tip.shown) return;
  tip.shown = true;
  tip.timer = 3.0;
  activeTip = tip;
}

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
  world.displayScore = 0;
  world.state = STATE.MENU;
  world.atmosphereTimer = 0;
  world.density = 0.72;
  world.densityLabel = 'Light';
  world.obstacles = [];
  world.ambientFlash = 0;
  world.shakeTimer = 0;
  world.shakeIntensity = 0;
  world.timeScale = 1.0;
  world.timeScaleTarget = 1.0;
  world.crashDelay = 0;
  world.scorePop = 0;
  world.scorePopAmount = 0;
  world.flashWhite = 0;
  world.zone = 1;
  world.prevZone = 1;
  world.zoneTransition = 0;
  world.atmosphereAnnounce = null;
  world.zoneAnnounce = null;
  world.loreAnnounce = null;
  world.newAchievements = [];
  world.achievementToast = null;
  world.combo = 0;
  world.comboTimer = 0;
  world.comboMultiplier = 1;
  world.comboPop = 0;
  world.comboBreakPop = 0;
  world.densitySurfTimer = 0;
  world.densitySurfBoost = 0;
  world.densityShiftJustHappened = 0;
  world.densityForecast = null;
  world.densityForecastTimer = 0;
  world.pressureAdaptation = 0;
  world.crushingWithoutSymbiosis = 0;
  world.boss = null;
  world.bossesDefeated = 0;
  world.edgeWarnings = [];
  world.ghostTrail = [];
  world.ghostTrailTimer = 0;
  world.runStats = {
    obstaclesDodged: 0, symbiosisUses: 0, nearMisses: 0, crushingPhases: 0,
    timeAlive: 0, usedSymbiosis: false, densitySurfs: 0, bossesDefeated: 0,
    maxCombo: 0, totalScoreWithMultiplier: 0, closestNearMiss: 999, longestComboStreak: 0,
  };

  /* Load ghost trail from best run */
  if (progress.bestGhostTrail && progress.bestGhostTrail.length > 0) {
    world.bestGhostTrail = progress.bestGhostTrail.slice();
  } else {
    world.bestGhostTrail = [];
  }

  glider.y = CONFIG.height * 0.45;
  glider.vy = 0;
  glider.trail = [];
  glider.flicker = 0;
  glider.crashed = false;
  glider.symbiosisCharge = 1;
  glider.symbiosisTimer = 0;
  glider.symbiosisCooldown = 0;
  glider.pulsePop = 0;
  glider.glowIntensity = 1.0;
  glider.comboGlow = 0;

  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) particlePool[i].active = false;

  restartBtn.hidden = true;
  initMotes();
  initNebulae();
  initStars();
}

/* --- Combo Helpers --- */
function getComboMultiplier() {
  let mult = 1;
  for (const t of CONFIG.comboThresholds) {
    if (world.combo >= t.at) mult = t.multiplier;
  }
  return mult;
}

function getComboLabel() {
  for (let i = CONFIG.comboThresholds.length - 1; i >= 0; i--) {
    if (world.combo >= CONFIG.comboThresholds[i].at) return CONFIG.comboThresholds[i].label;
  }
  return '';
}

/* --- Skin Helper --- */
function getActiveSkin() {
  return CONFIG.skins[progress.selectedSkin] || CONFIG.skins.default;
}

function isSkinUnlocked(skinId) {
  if (skinId === 'default') return true;
  if (progress.unlockedSkins && progress.unlockedSkins.includes(skinId)) return true;
  const req = CONFIG.skinUnlocks[skinId];
  if (!req) return false;
  if (req.type === 'score') return progress.bestScore >= req.value;
  if (req.type === 'runs') return progress.totalRuns >= req.value;
  if (req.type === 'achievement') return progress.achievements && progress.achievements.includes(req.value);
  return false;
}

function checkSkinUnlocks() {
  if (!progress.unlockedSkins) progress.unlockedSkins = ['default'];
  let unlocked = false;
  for (const id of Object.keys(CONFIG.skins)) {
    if (!progress.unlockedSkins.includes(id) && isSkinUnlocked(id)) {
      progress.unlockedSkins.push(id);
      unlocked = true;
    }
  }
  return unlocked;
}

/* --- Input Actions --- */
function pulse() {
  Audio.resume();
  if (world.state === STATE.GAMEOVER) {
    resetGame();
    world.state = STATE.PLAYING;
    enterFullscreen();
    Audio.startDrone();
    if (Audio.startMusic) Audio.startMusic();
    return;
  }
  if (world.state === STATE.MENU) {
    if (!tutorialDone) {
      tutorialStep++;
      if (tutorialStep >= 7) {
        tutorialDone = true;
        try { localStorage.setItem('methaneDriftTutorialDone', 'true'); } catch (e) { /* */ }
      } else {
        return;
      }
    }
    world.state = STATE.PLAYING;
    enterFullscreen();
    Audio.startDrone();
    if (Audio.startMusic) Audio.startMusic();
    return;
  }
  if (world.state === STATE.PAUSED || world.state === STATE.CRASHING) return;
  const densityMod = world.pressureAdaptation > 0 && world.densityLabel === 'Heavy' ? 0.9 : world.density;
  const surfBoost = world.densitySurfBoost > 0 ? CONFIG.densitySurfBoostMultiplier : 1;
  glider.vy += CONFIG.pulseForce * densityMod * surfBoost;
  glider.pulsePop = 1.0;
  spawnPulseParticles();
  Audio.pulse();
  checkDensitySurf();
}

function activateSymbiosis() {
  if (world.state !== STATE.PLAYING) return;
  if (glider.symbiosisCharge < 1 || glider.symbiosisTimer > 0 || glider.symbiosisCooldown > 0) return;
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

/* Hitbox radii per type — used for spacing checks */
const OBSTACLE_RADIUS = { spire: 130, school: 30, geyser: 120, storm: 65 };

/* Minimum vertical gap the glider needs to pass through */
const MIN_PASSABLE_GAP = 70;

/* Minimum horizontal spacing between obstacles to prevent walls */
const MIN_HORIZONTAL_SPACING = 100;

/* Check if a new obstacle at (x, y) would create an impossible wall with existing nearby obstacles */
function isPassable(newX, newY, newType, exclude) {
  const newR = OBSTACLE_RADIUS[newType] || 60;
  /* Gather nearby obstacles within horizontal range */
  const nearby = [];
  for (const obs of world.obstacles) {
    if (obs === exclude) continue;
    if (Math.abs(obs.x - newX) < MIN_HORIZONTAL_SPACING + 60) {
      nearby.push(obs);
    }
  }
  if (nearby.length === 0) return true;

  /* Build a list of blocked vertical ranges at this x position */
  const blocked = [];
  blocked.push({ lo: newY - newR, hi: newY + newR });
  for (const obs of nearby) {
    const r = OBSTACLE_RADIUS[obs.type] || 60;
    blocked.push({ lo: obs.y - r, hi: obs.y + r });
  }
  blocked.sort((a, b) => a.lo - b.lo);

  /* Merge overlapping ranges and check for passable gaps */
  const merged = [blocked[0]];
  for (let i = 1; i < blocked.length; i++) {
    const top = merged[merged.length - 1];
    if (blocked[i].lo <= top.hi + MIN_PASSABLE_GAP) {
      top.hi = Math.max(top.hi, blocked[i].hi);
    } else {
      merged.push(blocked[i]);
    }
  }

  /* Check if there's a passable gap: above all obstacles, below all, or between merged ranges */
  const topGap = merged[0].lo - 0;
  const bottomGap = world.height - merged[merged.length - 1].hi;
  if (topGap >= MIN_PASSABLE_GAP || bottomGap >= MIN_PASSABLE_GAP) return true;
  for (let i = 1; i < merged.length; i++) {
    if (merged[i].lo - merged[i - 1].hi >= MIN_PASSABLE_GAP) return true;
  }
  return false;
}

function spawnObstacle() {
  const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
  const maxDrift = getDifficulty('obstacleDrift');

  /* Try up to 8 positions to find one that keeps the stage passable */
  let gapY, drift;
  let passable = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    gapY = 80 + Math.random() * (world.height - 160);
    drift = (Math.random() - 0.5) * maxDrift * 2;
    if (isPassable(world.width + 120, gapY, type, null)) {
      passable = true;
      break;
    }
  }
  /* If no passable position found, place in the most open area */
  if (!passable) {
    gapY = findMostOpenY(world.width + 120);
    drift = (Math.random() - 0.5) * maxDrift;
  }

  const oscillate = type === 'geyser' && world.score >= 50 && Math.random() < 0.4;
  /* Geyser eruption cycle: on/off phases */
  const eruptPhase = type === 'geyser' ? Math.random() * CONFIG.geyserEruptCycle : 0;
  /* School scatter state */
  const scatterTimer = 0;

  world.obstacles.push({
    type, x: world.width + 120, y: gapY, drift, age: 0, scored: false,
    pulse: Math.random() * Math.PI * 2, oscillate, oscPhase: Math.random() * Math.PI * 2,
    eruptPhase, erupting: true, scatterTimer, scattered: false,
  });
  if (type === 'geyser') showTip('geyser');
  if (type === 'storm') showTip('storm');
}

/* Find the y position with the most open space among nearby obstacles */
function findMostOpenY(atX) {
  const nearby = world.obstacles.filter(o => Math.abs(o.x - atX) < MIN_HORIZONTAL_SPACING + 60);
  if (nearby.length === 0) return world.height * 0.5;

  /* Collect blocked center positions and find the largest gap */
  const positions = nearby.map(o => o.y).sort((a, b) => a - b);
  let bestY = world.height * 0.5;
  let bestGap = 0;

  /* Check gap above topmost obstacle */
  const topGap = positions[0];
  if (topGap > bestGap) { bestGap = topGap; bestY = topGap / 2; }

  /* Check gaps between obstacles */
  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1];
    if (gap > bestGap) { bestGap = gap; bestY = (positions[i] + positions[i - 1]) / 2; }
  }

  /* Check gap below bottommost obstacle */
  const bottomGap = world.height - positions[positions.length - 1];
  if (bottomGap > bestGap) { bestY = (positions[positions.length - 1] + world.height) / 2; }

  /* Clamp to safe area */
  return Math.max(80, Math.min(world.height - 80, bestY));
}

function spawnCorridor() {
  /* Ensure corridor gap is wide enough and doesn't overlap existing obstacles */
  const gapSize = 130;
  let gapCenter = 100 + Math.random() * (world.height - 200);

  /* Verify the corridor is navigable with nearby obstacles */
  for (let attempt = 0; attempt < 5; attempt++) {
    const topSpire = gapCenter - gapSize / 2 - 80;
    const botSpire = gapCenter + gapSize / 2 + 80;
    if (isPassable(world.width + 120, topSpire, 'spire', null) ||
        isPassable(world.width + 120, botSpire, 'spire', null)) {
      break;
    }
    gapCenter = 100 + Math.random() * (world.height - 200);
  }

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

/* --- Boss System --- */
function spawnBoss(zone) {
  const bossTypes = {
    2: { name: 'Storm Leviathan', radius: 140, health: 3, pattern: 'spiral', hue: 170 },
    3: { name: 'Geyser Titan', radius: 120, health: 4, pattern: 'eruption', hue: 280 },
    4: { name: 'Crystal Colossus', radius: 160, health: 5, pattern: 'maze', hue: 15 },
    5: { name: 'Core Entity', radius: 180, health: 6, pattern: 'chaos', hue: 300 },
  };
  const def = bossTypes[zone] || bossTypes[2];
  world.boss = {
    ...def,
    x: world.width + 200,
    y: world.height / 2,
    age: 0,
    phase: 0,
    active: true,
    defeated: false,
    hitTimer: 0,
    enterTimer: 2.0,
  };
  world.atmosphereAnnounce = { text: `BOSS: ${def.name}`, timer: 3.0 };
  if (Audio.bossAppear) Audio.bossAppear();
  showTip('boss');
}

function updateBoss(dt) {
  if (!world.boss || !world.boss.active) return;
  const boss = world.boss;
  boss.age += dt;
  boss.phase += dt;

  /* Enter animation */
  if (boss.enterTimer > 0) {
    boss.enterTimer -= dt;
    boss.x = world.width * 0.65 + boss.enterTimer * 200;
    return;
  }
  boss.x = world.width * 0.65;

  /* Boss movement patterns */
  if (boss.pattern === 'spiral') {
    boss.y = world.height / 2 + Math.sin(boss.age * 1.2) * 150;
  } else if (boss.pattern === 'eruption') {
    boss.y = world.height / 2 + Math.sin(boss.age * 0.8) * 120 + Math.sin(boss.age * 2.5) * 40;
  } else if (boss.pattern === 'maze') {
    boss.y = world.height / 2 + Math.sin(boss.age * 0.6) * 180;
  } else {
    boss.y = world.height / 2 + Math.sin(boss.age * 1.5) * 160 + Math.cos(boss.age * 0.7) * 60;
  }

  /* Boss collision — damages boss during symbiosis, damages player otherwise */
  const bdx = glider.x - boss.x;
  const bdy = glider.y - boss.y;
  const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
  if (bDist < boss.radius + glider.radius) {
    if (glider.symbiosisTimer > 0 && boss.hitTimer <= 0) {
      /* Phase through boss damages it */
      boss.health--;
      boss.hitTimer = 0.5;
      if (!reducedMotion) { world.shakeTimer = 0.2; world.shakeIntensity = 6; }
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        spawnParticle(boss.x, boss.y, Math.cos(angle) * 150, Math.sin(angle) * 150, 0.6, boss.hue, 3);
      }
      if (boss.health <= 0) {
        defeatBoss();
      }
    } else if (glider.symbiosisTimer <= 0) {
      crash();
    }
  }
  if (boss.hitTimer > 0) boss.hitTimer -= dt;

  /* Boss auto-exit if too old (45s) */
  if (boss.age > 45 && boss.active) {
    boss.active = false;
    world.boss = null;
  }
}

function defeatBoss() {
  if (!world.boss) return;
  world.boss.active = false;
  world.boss.defeated = true;
  world.bossesDefeated++;
  world.runStats.bossesDefeated++;
  /* Rewards */
  const bonus = 10 * world.zone;
  world.score += bonus;
  world.displayScore = world.score;
  world.scorePop = 1.0;
  world.scorePopAmount = bonus;
  glider.symbiosisCharge = 1;
  glider.symbiosisCooldown = 0;
  world.atmosphereAnnounce = { text: `BOSS DEFEATED! +${bonus}`, timer: 2.5 };
  if (!reducedMotion) { world.shakeTimer = 0.4; world.shakeIntensity = 10; world.flashWhite = 0.5; }
  /* Victory particles */
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 200;
    spawnParticle(world.boss.x, world.boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 1.0, world.boss.hue + Math.random() * 60, 3);
  }
  if (Audio.bossDefeat) Audio.bossDefeat();
  setTimeout(() => { world.boss = null; }, 2000);
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

  /* Stop music */
  if (Audio.stopMusic) Audio.stopMusic();

  /* Merge run stats into progress */
  progress.totalDistance += world.score;
  progress.totalObstaclesDodged += world.runStats.obstaclesDodged;
  progress.totalSymbiosis += world.runStats.symbiosisUses;
  progress.totalTimePlayed += world.runStats.timeAlive;
  progress.totalRuns++;
  if (world.score > progress.bestScore) {
    progress.bestScore = world.score;
    /* Save ghost trail for new best */
    progress.bestGhostTrail = world.ghostTrail.slice();
  }
  if (world.runStats.timeAlive > (progress.longestTimeAlive || 0)) {
    progress.longestTimeAlive = world.runStats.timeAlive;
  }
  if (!world.runStats.usedSymbiosis && world.score > (progress.noSymbiosisRecord || 0)) {
    progress.noSymbiosisRecord = world.score;
  }
  const maxCombo = Math.max(world.runStats.maxCombo, world.combo);
  if (maxCombo > (progress.longestStreak || 0)) progress.longestStreak = maxCombo;
  progress.crushingPhasesThisRun = world.runStats.crushingPhases;
  progress.nearMissesThisRun = world.runStats.nearMisses;
  progress.densitySurfsThisRun = world.runStats.densitySurfs;
  progress.bossesDefeatedThisRun = world.runStats.bossesDefeated;

  checkSkinUnlocks();
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

  /* Density forecast — show indicator 2s before shift */
  if (world.atmosphereTimer >= cycle - 2.0 && !world.densityForecast) {
    world.densityForecast = true;
    world.densityForecastTimer = 2.0;
  }
  if (world.densityForecastTimer > 0) {
    world.densityForecastTimer -= dt;
  }

  /* Density surf window decay */
  if (world.densityShiftJustHappened > 0) {
    world.densityShiftJustHappened -= dt;
  }

  /* Density surf boost decay */
  if (world.densitySurfBoost > 0) {
    world.densitySurfBoost -= dt;
    if (world.densitySurfBoost <= 0) world.densitySurfBoost = 0;
  }

  if (world.atmosphereTimer >= cycle) {
    world.atmosphereTimer = 0;
    world.densityForecast = null;
    world.densityForecastTimer = 0;
    const prevLabel = world.densityLabel;
    const roll = Math.random();
    if (roll < 0.34) {
      world.density = 0.72;
      world.densityLabel = 'Light';
    } else if (roll < 0.68) {
      world.density = 0.92;
      world.densityLabel = 'Normal';
    } else {
      world.density = 1.08;
      world.densityLabel = 'Heavy';
      world.runStats.crushingPhases++;
      /* Track crushing without symbiosis for pressure adaptation */
      if (glider.symbiosisTimer <= 0) {
        world.crushingWithoutSymbiosis++;
        if (world.crushingWithoutSymbiosis >= 3 && world.pressureAdaptation === 0) {
          world.pressureAdaptation = 1;
          world.atmosphereAnnounce = { text: 'ADAPTED TO HEAVY AIR', timer: 2.0 };
        }
      }
    }
    if (prevLabel !== world.densityLabel) {
      world.ambientFlash = 0.25;
      if (!world.pressureAdaptation || world.densityLabel !== 'Heavy') {
        world.atmosphereAnnounce = { text: world.densityLabel.toUpperCase(), timer: 1.5 };
      }
      Audio.atmosphereShift(world.densityLabel);
      Audio.updateDrone(world.density);
      /* Open density surf window */
      world.densityShiftJustHappened = CONFIG.densitySurfWindow;
      showTip('densityShift');
    }
  }
}

/* --- Density Surf check (called when player pulses) --- */
function checkDensitySurf() {
  if (world.densityShiftJustHappened > 0 && world.densitySurfBoost <= 0) {
    world.densitySurfBoost = CONFIG.densitySurfBoostDuration;
    world.densityShiftJustHappened = 0;
    world.runStats.densitySurfs++;
    world.atmosphereAnnounce = { text: 'WAVE RIDE!', timer: 1.2 };
    if (!reducedMotion) {
      world.shakeTimer = 0.15;
      world.shakeIntensity = 4;
    }
    /* Spawn special surf particles */
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 / 20) * i;
      spawnParticle(glider.x, glider.y, Math.cos(angle) * 150, Math.sin(angle) * 150, 0.8, 50 + Math.random() * 30, 2.5);
    }
    if (Audio.densitySurf) Audio.densitySurf();
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
    world.zoneAnnounce = { zoneNum: newZone, timer: 2.5 };
    Audio.zoneChange();
    /* Spawn boss at zone transitions (zone 2+) */
    if (newZone >= 2 && !world.boss) {
      setTimeout(() => { if (world.state === STATE.PLAYING && !world.boss) spawnBoss(newZone); }, 3000);
    }
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
      const pairX = paired.x + 100;
      /* Only spawn pair if it won't create an impassable wall */
      const testY = 80 + Math.random() * (world.height - 160);
      const pairType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
      if (isPassable(pairX, testY, pairType, null)) {
        spawnObstacle();
        world.obstacles[world.obstacles.length - 1].x = pairX;
      }
    }
  }
  /* Corridor after score 30 — skip if too many nearby obstacles */
  if (world.score >= 30 && Math.random() < 0.002 * dt * 60) {
    const nearbyCount = world.obstacles.filter(o => o.x > world.width - 60).length;
    if (nearbyCount < 2) {
      spawnCorridor();
    }
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
      glider.symbiosisCooldown = CONFIG.symbiosisCooldown;
      Audio.symbiosisEnd();
    }
  }

  /* Symbiosis cooldown */
  if (glider.symbiosisCooldown > 0) {
    glider.symbiosisCooldown -= rawDt;
    if (glider.symbiosisCooldown <= 0) {
      glider.symbiosisCooldown = 0;
      glider.symbiosisCharge = Math.min(1, glider.symbiosisCharge + 1);
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
    if (world.comboTimer <= 0) {
      if (world.combo >= 3) {
        /* Combo break visual */
        world.comboBreakPop = 1.0;
        if (Audio.comboBreak) Audio.comboBreak();
      }
      world.runStats.longestComboStreak = Math.max(world.runStats.longestComboStreak, world.combo);
      world.combo = 0;
      world.comboMultiplier = 1;
      glider.comboGlow = 0;
      if (comboNode) comboNode.textContent = '0';
    }
  }

  /* Combo break pop decay */
  if (world.comboBreakPop > 0) {
    world.comboBreakPop -= dt * 2;
    if (world.comboBreakPop < 0) world.comboBreakPop = 0;
  }
  /* Combo pop decay */
  if (world.comboPop > 0) {
    world.comboPop -= dt * 2;
    if (world.comboPop < 0) world.comboPop = 0;
  }

  /* Obstacles */
  const scrollSpeed = getDifficulty('scrollSpeed');
  world.edgeWarnings = [];
  world.obstacles.forEach((obstacle) => {
    obstacle.x -= (scrollSpeed + (1 - world.density) * 72) * dt;
    obstacle.y += obstacle.drift * dt;
    obstacle.age += dt;
    obstacle.pulse += 1.8 * dt;

    if (obstacle.oscillate) {
      obstacle.y += Math.sin(obstacle.oscPhase + obstacle.age * 2) * 40 * dt;
    }

    /* Geyser eruption cycle */
    if (obstacle.type === 'geyser') {
      obstacle.eruptPhase = (obstacle.eruptPhase || 0) + dt;
      const totalCycle = CONFIG.geyserEruptCycle + CONFIG.geyserEruptPause;
      const phase = obstacle.eruptPhase % totalCycle;
      obstacle.erupting = phase < CONFIG.geyserEruptCycle;
      /* Warning tone 0.5s before re-eruption */
      if (!obstacle.erupting && phase > totalCycle - 0.5 && phase - dt <= totalCycle - 0.5) {
        if (Audio.geyserWarn && Math.abs(obstacle.x - glider.x) < 300) Audio.geyserWarn();
      }
    }

    /* School scatter when symbiosis is active nearby */
    if (obstacle.type === 'school') {
      const distToGlider = Math.sqrt((obstacle.x - glider.x) ** 2 + (obstacle.y - glider.y) ** 2);
      if (glider.symbiosisTimer > 0 && distToGlider < CONFIG.schoolScatterRadius && !obstacle.scattered) {
        obstacle.scattered = true;
        obstacle.scatterTimer = CONFIG.schoolScatterDuration;
      }
      if (obstacle.scatterTimer > 0) {
        obstacle.scatterTimer -= dt;
        if (obstacle.scatterTimer <= 0) { obstacle.scattered = false; obstacle.scatterTimer = 0; }
      }
    }

    /* Storm gravity well — pull glider toward center */
    if (obstacle.type === 'storm' && glider.symbiosisTimer <= 0) {
      const sdx = obstacle.x - glider.x;
      const sdy = obstacle.y - glider.y;
      const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
      if (sDist < CONFIG.stormPullRadius && sDist > 10) {
        const pullForce = CONFIG.stormPullStrength * (1 - sDist / CONFIG.stormPullRadius) * dt;
        glider.vy += (sdy / sDist) * pullForce;
        if (Audio.stormPull && sDist < CONFIG.stormPullRadius * 0.7) {
          /* Visual indicator of pull */
          if (Math.random() < 0.3) {
            spawnParticle(glider.x, glider.y, sdx * 0.5, sdy * 0.5, 0.3, 220, 1.5);
          }
        }
      }
    }

    /* Screen-edge warnings for incoming obstacles */
    if (obstacle.x > world.width - 40 && obstacle.x < world.width + 100) {
      const typeColor = obstacle.type === 'spire' ? 180 : obstacle.type === 'school' ? 140 : obstacle.type === 'geyser' ? 200 : 240;
      world.edgeWarnings.push({ y: obstacle.y, hue: typeColor, type: obstacle.type });
    }

    /* Clamp vertical position so obstacles stay on screen */
    if (obstacle.y < 40) { obstacle.y = 40; obstacle.drift = Math.abs(obstacle.drift); }
    if (obstacle.y > world.height - 40) { obstacle.y = world.height - 40; obstacle.drift = -Math.abs(obstacle.drift); }

    if (!obstacle.scored && obstacle.x + 40 < glider.x && world.state === STATE.PLAYING) {
      obstacle.scored = true;
      /* Combo multiplier scoring */
      const basePoints = 1;
      world.comboMultiplier = getComboMultiplier();
      const points = Math.floor(basePoints * world.comboMultiplier);
      world.score += points;
      world.displayScore = world.score;
      world.scorePop = 1.0;
      world.scorePopAmount = points;
      world.runStats.obstaclesDodged++;
      world.runStats.totalScoreWithMultiplier += points;
      Audio.score();
      if (world.score === 1 && glider.symbiosisCharge >= 1) showTip('shield');

      /* Near-miss check */
      const dist = nearMissDistance(obstacle);
      if (dist > 0 && dist < 30) {
        if (!reducedMotion) {
          world.shakeTimer = 0.1;
          world.shakeIntensity = 3;
        }
        const prevCombo = world.combo;
        world.combo++;
        world.comboTimer = 3.5;
        world.runStats.nearMisses++;
        if (dist < world.runStats.closestNearMiss) world.runStats.closestNearMiss = dist;
        if (world.combo > world.runStats.maxCombo) world.runStats.maxCombo = world.combo;
        if (comboNode) comboNode.textContent = String(world.combo);
        spawnNearMissParticles();
        Audio.nearMiss();
        if (world.combo === 1) showTip('nearMiss');
        if (world.combo === 3) showTip('combo');

        /* Combo milestones */
        for (const t of CONFIG.comboThresholds) {
          if (world.combo >= t.at && prevCombo < t.at) {
            world.comboPop = 1.5;
            if (Audio.comboMilestone) Audio.comboMilestone(t.at);
            /* Bonus score burst */
            const bonus = t.at;
            world.score += bonus;
            world.displayScore = world.score;
            world.scorePopAmount = bonus;
            world.scorePop = 1.0;
            /* Milestone particles */
            for (let p = 0; p < t.at * 2; p++) {
              const angle = Math.random() * Math.PI * 2;
              spawnParticle(glider.x, glider.y, Math.cos(angle) * 120, Math.sin(angle) * 120, 0.7, 60 + Math.random() * 60, 2);
            }
          }
        }

        /* Glider glow scales with combo */
        glider.comboGlow = Math.min(1, world.combo / 10);
      }

      if (world.score % 8 === 0) { glider.symbiosisCharge = 1; glider.symbiosisCooldown = 0; }

      /* Lore messages */
      for (const lore of CONFIG.loreMessages) {
        if (world.score === lore.score) {
          world.loreAnnounce = { text: lore.text, timer: 3.5 };
        }
      }
    }

    /* Collision (geysers don't hit during pause phase, scattered schools don't hit) */
    if (glider.symbiosisTimer <= 0) {
      if (obstacle.type === 'geyser' && !obstacle.erupting) {
        /* Geyser is paused — no collision */
      } else if (obstacle.type === 'school' && obstacle.scattered) {
        /* School is scattered — no collision */
      } else if (checkCollision(obstacle)) {
        crash();
      }
    }
  });

  world.obstacles = world.obstacles.filter((o) => o.x > -220);

  /* Ghost trail recording (sample every 0.1s) */
  world.ghostTrailTimer += rawDt;
  if (world.ghostTrailTimer >= 0.1) {
    world.ghostTrailTimer = 0;
    world.ghostTrail.push({ y: glider.y, score: world.score });
  }

  /* Boss encounter at zone boundaries */
  updateBoss(dt);

  /* Update adaptive music */
  if (Audio.updateMusic) {
    Audio.updateMusic(world.zone, world.density, world.combo, scrollSpeed);
  }

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
  symbiosisNode.textContent = glider.symbiosisTimer > 0
    ? `Active ${glider.symbiosisTimer.toFixed(1)}s`
    : glider.symbiosisCooldown > 0
    ? `Recharging ${glider.symbiosisCooldown.toFixed(1)}s`
    : glider.symbiosisCharge >= 1 ? 'Ready' : 'Recharging';

  /* Update HTML symbiosis button label */
  const symBtn = document.getElementById('symbiosisBtn');
  if (symBtn) {
    if (glider.symbiosisTimer > 0) {
      symBtn.textContent = `Shield Active ${glider.symbiosisTimer.toFixed(1)}s`;
      symBtn.disabled = true;
    } else if (glider.symbiosisCooldown > 0) {
      symBtn.textContent = `Recharging ${Math.ceil(glider.symbiosisCooldown)}s`;
      symBtn.disabled = true;
    } else if (glider.symbiosisCharge >= 1) {
      symBtn.textContent = 'Shield';
      symBtn.disabled = false;
    } else {
      symBtn.textContent = 'Recharging...';
      symBtn.disabled = true;
    }
  }
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
      const sg = ctx.createRadialGradient(x, y, 0, x, y, 110);
      sg.addColorStop(0, 'rgba(168, 246, 255, 0.10)');
      sg.addColorStop(0.4, 'rgba(100, 200, 255, 0.05)');
      sg.addColorStop(0.8, 'rgba(80, 170, 240, 0.02)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(x - 110, y - 150, 220, 300);

      /* --- Multi-faceted hexagonal crystal polygon --- */
      /* Define hexagonal cross-section vertices at several heights */
      const crystalW = 18; /* half-width at widest point */
      const tipY = y - 130;
      const shoulderY = y - 70;
      const midY = y - 10;
      const waistY = y + 50;
      const baseY = y + 130;

      /* Hexagon vertices at shoulder (widest) - 6 points */
      const hexPts = [];
      for (let h = 0; h < 6; h++) {
        const ha = (Math.PI * 2 / 6) * h - Math.PI / 2;
        hexPts.push({ hx: Math.cos(ha) * crystalW, hy: Math.sin(ha) * crystalW * 0.35 });
      }

      /* Draw 6 crystal facets from tip to base */
      for (let f = 0; f < 6; f++) {
        const f2 = (f + 1) % 6;
        const hue = 190 + f * 8;
        const lightness = 75 + (f % 2 === 0 ? 10 : -5);
        const facetAlpha = 0.55 + (f % 3) * 0.12 + Math.sin(obstacle.pulse * 0.8 + f) * 0.06;

        /* Upper facet (tip to shoulder) */
        const upperGrad = ctx.createLinearGradient(x + hexPts[f].hx, shoulderY, x, tipY);
        upperGrad.addColorStop(0, `hsla(${hue}, 70%, ${lightness}%, ${facetAlpha * 0.8})`);
        upperGrad.addColorStop(1, `hsla(${hue + 10}, 80%, 90%, ${facetAlpha})`);
        ctx.fillStyle = upperGrad;
        ctx.beginPath();
        ctx.moveTo(x, tipY);
        ctx.lineTo(x + hexPts[f].hx, shoulderY + hexPts[f].hy);
        ctx.lineTo(x + hexPts[f2].hx, shoulderY + hexPts[f2].hy);
        ctx.closePath();
        ctx.fill();

        /* Mid facet (shoulder to waist) */
        const midScale = 0.85;
        const midGrad = ctx.createLinearGradient(x - crystalW, shoulderY, x + crystalW, waistY);
        midGrad.addColorStop(0, `hsla(${hue}, 65%, ${lightness - 5}%, ${facetAlpha * 0.7})`);
        midGrad.addColorStop(0.5, `hsla(${hue + 5}, 55%, ${lightness - 10}%, ${facetAlpha * 0.5})`);
        midGrad.addColorStop(1, `hsla(${hue}, 50%, ${lightness - 15}%, ${facetAlpha * 0.35})`);
        ctx.fillStyle = midGrad;
        ctx.beginPath();
        ctx.moveTo(x + hexPts[f].hx, shoulderY + hexPts[f].hy);
        ctx.lineTo(x + hexPts[f2].hx, shoulderY + hexPts[f2].hy);
        ctx.lineTo(x + hexPts[f2].hx * midScale, waistY + hexPts[f2].hy * midScale);
        ctx.lineTo(x + hexPts[f].hx * midScale, waistY + hexPts[f].hy * midScale);
        ctx.closePath();
        ctx.fill();

        /* Lower facet (waist to base point) */
        const baseScale = 0.4;
        ctx.fillStyle = `hsla(${hue}, 45%, ${lightness - 20}%, ${facetAlpha * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(x + hexPts[f].hx * midScale, waistY + hexPts[f].hy * midScale);
        ctx.lineTo(x + hexPts[f2].hx * midScale, waistY + hexPts[f2].hy * midScale);
        ctx.lineTo(x + hexPts[f2].hx * baseScale, baseY);
        ctx.lineTo(x + hexPts[f].hx * baseScale, baseY);
        ctx.closePath();
        ctx.fill();
      }

      /* Crystal edge lines along hexagonal ridges */
      ctx.strokeStyle = 'rgba(220, 255, 255, 0.35)';
      ctx.lineWidth = 0.8;
      for (let e = 0; e < 6; e++) {
        ctx.beginPath();
        ctx.moveTo(x, tipY);
        ctx.lineTo(x + hexPts[e].hx, shoulderY + hexPts[e].hy);
        ctx.lineTo(x + hexPts[e].hx * 0.85, waistY + hexPts[e].hy * 0.85);
        ctx.lineTo(x + hexPts[e].hx * 0.4, baseY);
        ctx.stroke();
      }

      /* Internal refraction lines - thin white angled lines inside crystal */
      const refrPhase = Math.sin(obstacle.pulse * 0.7);
      const refrAlpha = 0.12 + refrPhase * 0.06;
      ctx.strokeStyle = `rgba(220, 255, 255, ${refrAlpha})`;
      ctx.lineWidth = 0.5;
      /* Refraction line 1 - diagonal across upper */
      ctx.beginPath();
      ctx.moveTo(x - 8, tipY + 25);
      ctx.lineTo(x + 12, shoulderY + 15);
      ctx.lineTo(x - 4, midY + 10);
      ctx.stroke();
      /* Refraction line 2 - crossing zigzag */
      ctx.beginPath();
      ctx.moveTo(x + 6, tipY + 40);
      ctx.lineTo(x - 10, shoulderY + 5);
      ctx.lineTo(x + 8, waistY - 10);
      ctx.stroke();
      /* Refraction line 3 - lower diagonal */
      ctx.strokeStyle = `rgba(200, 250, 255, ${refrAlpha * 0.7})`;
      ctx.beginPath();
      ctx.moveTo(x - 5, midY + 5);
      ctx.lineTo(x + 10, waistY + 20);
      ctx.lineTo(x - 8, baseY - 20);
      ctx.stroke();
      /* Refraction line 4 - short horizontal glint */
      ctx.strokeStyle = `rgba(240, 255, 255, ${refrAlpha * 0.5 + Math.sin(obstacle.pulse * 1.3) * 0.04})`;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x - 10, shoulderY + 10);
      ctx.lineTo(x + 10, shoulderY + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 7, waistY - 5);
      ctx.lineTo(x + 9, waistY + 2);
      ctx.stroke();

      /* Glowing nodes at facet intersections */
      const nodePulse = 0.3 + Math.sin(obstacle.pulse * 1.5) * 0.2;
      ctx.fillStyle = `rgba(200, 255, 255, ${nodePulse * 0.7})`;
      ctx.beginPath(); ctx.arc(x, midY, 2.5, 0, Math.PI * 2); ctx.fill();
      for (let n = 0; n < 6; n++) {
        ctx.fillStyle = `rgba(180, 240, 255, ${nodePulse * 0.5})`;
        ctx.beginPath(); ctx.arc(x + hexPts[n].hx * 0.5, shoulderY + hexPts[n].hy * 0.5, 1.5, 0, Math.PI * 2); ctx.fill();
      }

      /* --- Tip glow pulse effect --- */
      const tipPulse = 0.4 + Math.sin(obstacle.pulse * 2.0) * 0.3;
      const tipGlowR = 12 + Math.sin(obstacle.pulse * 2.0) * 5;
      const tipGlow = ctx.createRadialGradient(x, tipY, 0, x, tipY, tipGlowR);
      tipGlow.addColorStop(0, `rgba(240, 255, 255, ${tipPulse})`);
      tipGlow.addColorStop(0.3, `rgba(200, 250, 255, ${tipPulse * 0.5})`);
      tipGlow.addColorStop(0.6, `rgba(160, 240, 255, ${tipPulse * 0.2})`);
      tipGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = tipGlow;
      ctx.beginPath();
      ctx.arc(x, tipY, tipGlowR, 0, Math.PI * 2);
      ctx.fill();
      /* Bright tip core */
      ctx.fillStyle = `rgba(255, 255, 255, ${tipPulse * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, tipY, 2.5 + Math.sin(obstacle.pulse * 2.0) * 1, 0, Math.PI * 2);
      ctx.fill();
      /* Tip light rays (subtle) */
      ctx.strokeStyle = `rgba(220, 255, 255, ${tipPulse * 0.15})`;
      ctx.lineWidth = 0.6;
      for (let ray = 0; ray < 4; ray++) {
        const rayAngle = obstacle.pulse * 0.3 + ray * (Math.PI / 2);
        const rayLen = 8 + Math.sin(obstacle.pulse * 1.5 + ray) * 4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(rayAngle) * 4, tipY + Math.sin(rayAngle) * 4);
        ctx.lineTo(x + Math.cos(rayAngle) * rayLen, tipY + Math.sin(rayAngle) * rayLen);
        ctx.stroke();
      }

      /* Floating crystal shards */
      const shardT = now * 0.002;
      for (let s = 0; s < 4; s++) {
        const sx = x + Math.sin(shardT + s * 1.7) * 28;
        const sy = y - 70 + s * 45 + Math.cos(shardT * 0.7 + s) * 12;
        const sAngle = shardT * 0.5 + s * 1.4;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sAngle);
        ctx.fillStyle = `rgba(190, 245, 255, ${0.15 + Math.sin(shardT + s) * 0.08})`;
        ctx.beginPath();
        /* Mini hexagonal shard */
        ctx.moveTo(0, -5); ctx.lineTo(3, -2.5); ctx.lineTo(3, 2.5);
        ctx.lineTo(0, 5); ctx.lineTo(-3, 2.5); ctx.lineTo(-3, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(220, 255, 255, ${0.1 + Math.sin(shardT + s) * 0.05})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
        ctx.restore();
      }

    } else if (obstacle.type === 'school') {
      /* Group ambient glow */
      const groupGlow = ctx.createRadialGradient(x - 16, y, 0, x - 16, y, 60);
      groupGlow.addColorStop(0, 'rgba(100, 255, 200, 0.08)');
      groupGlow.addColorStop(0.5, 'rgba(80, 220, 180, 0.03)');
      groupGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = groupGlow;
      ctx.beginPath();
      ctx.arc(x - 16, y, 60, 0, Math.PI * 2);
      ctx.fill();

      /* Per-fish size variation seeds (deterministic per obstacle) */
      const fishSizes = [1.15, 0.85, 1.0, 0.75, 1.1, 0.9, 0.8];
      const fishCount = 7;

      for (let i = 0; i < fishCount; i++) {
        const sa = 0.35 + i * 0.04;
        /* Sine wave formation offsets for organic shifting */
        const formationPhase = obstacle.pulse * 0.6;
        const rowOffset = Math.floor(i / 3); /* stagger rows */
        const colOffset = i % 3;
        const sineOffX = Math.sin(formationPhase + i * 0.9) * 6 + Math.sin(formationPhase * 1.7 + i * 1.3) * 3;
        const sineOffY = Math.sin(formationPhase * 0.8 + i * 1.1 + 0.5) * 10 + Math.cos(formationPhase * 1.3 + i * 0.7) * 5;
        const fx = x - colOffset * 14 + rowOffset * 5 + sineOffX;
        const fy = y + (i - fishCount / 2) * 11 + sineOffY;
        const sizeVar = fishSizes[i % fishSizes.length];
        const fishScale = (1 - i * 0.03) * sizeVar;
        const fishAngle = Math.sin(obstacle.pulse * 1.2 + i * 0.8) * 0.18 + Math.sin(formationPhase * 0.5 + i) * 0.08;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(fishAngle);

        /* Fish body glow halo */
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22 * fishScale);
        glow.addColorStop(0, `rgba(143, 255, 213, ${sa * 0.5})`);
        glow.addColorStop(0.5, `rgba(100, 220, 190, ${sa * 0.12})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 22 * fishScale, 0, Math.PI * 2);
        ctx.fill();

        /* Fish body - oval silhouette */
        const bodyGrad = ctx.createLinearGradient(-10 * fishScale, -6 * fishScale, 10 * fishScale, 4 * fishScale);
        bodyGrad.addColorStop(0, `rgba(80, 200, 170, ${sa * 0.7})`);
        bodyGrad.addColorStop(0.5, `rgba(143, 255, 213, ${sa * 0.85})`);
        bodyGrad.addColorStop(1, `rgba(100, 230, 190, ${sa * 0.6})`);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(14 * fishScale, 0);
        ctx.quadraticCurveTo(10 * fishScale, -5.5 * fishScale, 2 * fishScale, -6.5 * fishScale);
        ctx.quadraticCurveTo(-6 * fishScale, -5.5 * fishScale, -10 * fishScale, -2 * fishScale);
        ctx.quadraticCurveTo(-12 * fishScale, 0, -10 * fishScale, 2 * fishScale);
        ctx.quadraticCurveTo(-6 * fishScale, 5.5 * fishScale, 2 * fishScale, 5.5 * fishScale);
        ctx.quadraticCurveTo(10 * fishScale, 4.5 * fishScale, 14 * fishScale, 0);
        ctx.closePath();
        ctx.fill();
        /* Belly highlight */
        ctx.fillStyle = `rgba(180, 255, 235, ${sa * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(2 * fishScale, 2 * fishScale, 7 * fishScale, 2.5 * fishScale, 0, 0, Math.PI * 2);
        ctx.fill();

        /* Dorsal fin - on top of body */
        ctx.fillStyle = `rgba(120, 240, 200, ${sa * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(3 * fishScale, -6 * fishScale);
        ctx.quadraticCurveTo(1 * fishScale, -12 * fishScale, -3 * fishScale, -10 * fishScale);
        ctx.quadraticCurveTo(-5 * fishScale, -7 * fishScale, -4 * fishScale, -5.5 * fishScale);
        ctx.closePath();
        ctx.fill();
        /* Dorsal fin edge */
        ctx.strokeStyle = `rgba(160, 255, 220, ${sa * 0.3})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();

        /* V-shaped tail fin */
        const tailFlick = Math.sin(obstacle.pulse * 2.5 + i * 0.7) * 2.5 * sizeVar;
        ctx.fillStyle = `rgba(110, 235, 195, ${sa * 0.55})`;
        ctx.beginPath();
        ctx.moveTo(-10 * fishScale, 0);
        /* Upper V arm */
        ctx.lineTo(-14 * fishScale, -2 * fishScale + tailFlick * 0.5);
        ctx.lineTo(-19 * fishScale, -7 * fishScale + tailFlick);
        /* V notch */
        ctx.lineTo(-14 * fishScale, -1 * fishScale);
        /* Lower V arm */
        ctx.lineTo(-19 * fishScale, 7 * fishScale - tailFlick);
        ctx.lineTo(-14 * fishScale, 2 * fishScale - tailFlick * 0.5);
        ctx.lineTo(-10 * fishScale, 0);
        ctx.closePath();
        ctx.fill();
        /* Tail fin edge */
        ctx.strokeStyle = `rgba(160, 255, 220, ${sa * 0.25})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();

        /* Anal fin (small, under body near tail) */
        ctx.fillStyle = `rgba(110, 230, 200, ${sa * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(-6 * fishScale, 4.5 * fishScale);
        ctx.quadraticCurveTo(-7 * fishScale, 8 * fishScale, -10 * fishScale, 5 * fishScale);
        ctx.closePath();
        ctx.fill();

        /* Eye - white with dark pupil */
        ctx.fillStyle = `rgba(220, 255, 245, ${sa * 0.9})`;
        ctx.beginPath();
        ctx.arc(8 * fishScale, -2 * fishScale, 2.0 * fishScale, 0, Math.PI * 2);
        ctx.fill();
        /* Iris ring */
        ctx.fillStyle = `rgba(60, 150, 130, ${sa * 0.6})`;
        ctx.beginPath();
        ctx.arc(8 * fishScale, -2 * fishScale, 1.3 * fishScale, 0, Math.PI * 2);
        ctx.fill();
        /* Pupil dot */
        ctx.fillStyle = `rgba(15, 40, 35, ${sa * 0.85})`;
        ctx.beginPath();
        ctx.arc(8.4 * fishScale, -2 * fishScale, 0.7 * fishScale, 0, Math.PI * 2);
        ctx.fill();
        /* Eye specular */
        ctx.fillStyle = `rgba(240, 255, 255, ${sa * 0.7})`;
        ctx.beginPath();
        ctx.arc(8.8 * fishScale, -2.5 * fishScale, 0.4 * fishScale, 0, Math.PI * 2);
        ctx.fill();

        /* Bioluminescent stripe */
        ctx.strokeStyle = `rgba(180, 255, 230, ${sa * (0.3 + Math.sin(obstacle.pulse + i * 0.5) * 0.15)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(10 * fishScale, -1 * fishScale);
        ctx.quadraticCurveTo(0, 0, -8 * fishScale, -1 * fishScale);
        ctx.stroke();

        /* Pectoral fin (small side fin) */
        ctx.fillStyle = `rgba(130, 245, 210, ${sa * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(4 * fishScale, 3 * fishScale);
        ctx.quadraticCurveTo(6 * fishScale, 7 * fishScale, 1 * fishScale, 6 * fishScale);
        ctx.quadraticCurveTo(2 * fishScale, 4 * fishScale, 4 * fishScale, 3 * fishScale);
        ctx.fill();

        ctx.restore();
      }

    } else if (obstacle.type === 'geyser') {
      const turbT = now * 0.004;

      /* --- Rock-textured vent base (triangular) --- */
      /* Outer rock base shape - dark triangular mount */
      const ventBaseGrad = ctx.createLinearGradient(x, y + 95, x, y + 140);
      ventBaseGrad.addColorStop(0, 'rgba(60, 90, 120, 0.65)');
      ventBaseGrad.addColorStop(0.4, 'rgba(45, 65, 90, 0.8)');
      ventBaseGrad.addColorStop(1, 'rgba(30, 45, 65, 0.9)');
      ctx.fillStyle = ventBaseGrad;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 95);  /* top-left of vent opening */
      ctx.lineTo(x - 28, y + 138);  /* bottom-left base */
      ctx.lineTo(x - 10, y + 140);  /* bottom notch left */
      ctx.lineTo(x, y + 135);       /* bottom center */
      ctx.lineTo(x + 10, y + 140);  /* bottom notch right */
      ctx.lineTo(x + 28, y + 138);  /* bottom-right base */
      ctx.lineTo(x + 5, y + 95);    /* top-right of vent opening */
      ctx.closePath();
      ctx.fill();
      /* Rock texture lines */
      ctx.strokeStyle = 'rgba(35, 55, 80, 0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 125); ctx.lineTo(x - 5, y + 110); ctx.lineTo(x - 15, y + 100);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 15, y + 130); ctx.lineTo(x + 8, y + 115); ctx.lineTo(x + 18, y + 105);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 132); ctx.lineTo(x + 2, y + 120); ctx.lineTo(x - 2, y + 108);
      ctx.stroke();
      /* Rock surface highlights */
      ctx.strokeStyle = 'rgba(90, 130, 170, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 20, y + 130); ctx.lineTo(x - 12, y + 122);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 135); ctx.lineTo(x + 20, y + 128);
      ctx.stroke();
      /* Inner vent opening glow */
      const ventGlow = ctx.createRadialGradient(x, y + 98, 2, x, y + 98, 12);
      ventGlow.addColorStop(0, 'rgba(140, 210, 255, 0.5)');
      ventGlow.addColorStop(0.5, 'rgba(100, 170, 240, 0.2)');
      ventGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = ventGlow;
      ctx.beginPath();
      ctx.arc(x, y + 98, 12, 0, Math.PI * 2);
      ctx.fill();

      /* Base vent glow (behind rock) */
      const baseGlow = ctx.createRadialGradient(x, y + 120, 0, x, y + 120, 45);
      baseGlow.addColorStop(0, 'rgba(100, 180, 255, 0.15)');
      baseGlow.addColorStop(0.5, 'rgba(80, 150, 230, 0.06)');
      baseGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = baseGlow;
      ctx.beginPath();
      ctx.arc(x, y + 120, 45, 0, Math.PI * 2);
      ctx.fill();

      /* Main column - wider with turbulent edges */
      const colWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x - colWidth - 3, y + 95);
      for (let cy = y + 95; cy >= y - 120; cy -= 8) {
        const turbulence = Math.sin(turbT + cy * 0.05) * 3 + Math.sin(turbT * 1.7 + cy * 0.08) * 1.5;
        const narrowing = 1 - Math.abs(cy - y) / 240 * 0.3;
        ctx.lineTo(x - colWidth * narrowing + turbulence, cy);
      }
      for (let cy = y - 120; cy <= y + 95; cy += 8) {
        const turbulence = Math.sin(turbT + cy * 0.05 + 2) * 3 + Math.sin(turbT * 1.3 + cy * 0.07) * 1.5;
        const narrowing = 1 - Math.abs(cy - y) / 240 * 0.3;
        ctx.lineTo(x + colWidth * narrowing + turbulence, cy);
      }
      ctx.closePath();
      const gg = ctx.createLinearGradient(x, y - 120, x, y + 95);
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
      ctx.moveTo(x, y + 90);
      for (let cy = y + 90; cy >= y - 110; cy -= 6) {
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

      /* --- Turbulent eruption particles (varied sizes and speeds) --- */
      for (let d = 0; d < 10; d++) {
        const particleSpeed = 2.5 + (d % 4) * 0.8;
        const particlePhase = (turbT * particleSpeed + d * 0.314) % (Math.PI * 2);
        const dropAngle = -Math.PI / 2 + Math.sin(particlePhase + d * 0.7) * 0.8;
        const dropDist = 15 + Math.abs(Math.sin(particlePhase)) * 25 + (d % 3) * 5;
        const dx = x + Math.cos(dropAngle) * dropDist;
        const dy = y - 120 + Math.sin(dropAngle) * dropDist * 0.7;
        const dropSize = 1.2 + (d % 4) * 0.8 + Math.sin(turbT * 2 + d) * 0.6;
        const dropA = (0.35 + Math.sin(turbT * 2.5 + d) * 0.15) * (1 - (d % 3) * 0.1);
        ctx.fillStyle = `rgba(200, 245, 255, ${dropA})`;
        ctx.beginPath();
        ctx.arc(dx, dy, dropSize, 0, Math.PI * 2);
        ctx.fill();
        /* Particle hot center for larger ones */
        if (dropSize > 2) {
          ctx.fillStyle = `rgba(240, 255, 255, ${dropA * 0.6})`;
          ctx.beginPath();
          ctx.arc(dx, dy, dropSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* Rising bubbles along the column */
      const bt = now * 0.003;
      for (let b = 0; b < 8; b++) {
        const bubbleLife = (bt * 0.5 + b * 0.125) % 1;
        const by = y + 80 - bubbleLife * 200;
        const bx = x + Math.sin(bt * 2 + b * 1.1) * 6;
        const bSize = 1.5 + (b % 3) * 0.8 + Math.sin(bt + b * 0.7) * 1 + bubbleLife * 1.5;
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

      /* --- Steam wisps drifting sideways after eruption --- */
      for (let sw = 0; sw < 6; sw++) {
        const wispLife = (now * 0.0008 + sw * 0.167) % 1;
        const wispBaseY = y - 110 - sw * 8;
        /* Drift sideways as they rise and age */
        const wispDriftX = (sw % 2 === 0 ? 1 : -1) * wispLife * 35 + Math.sin(now * 0.002 + sw * 1.4) * 8;
        const wispDriftY = -wispLife * 20;
        const wispX = x + wispDriftX;
        const wispY = wispBaseY + wispDriftY;
        const wispSize = 4 + wispLife * 10 + Math.sin(now * 0.003 + sw) * 2;
        const wispAlpha = (0.12 - wispLife * 0.1) * (1 + Math.sin(now * 0.005 + sw * 0.8) * 0.2);
        if (wispAlpha > 0.01) {
          const wispGrad = ctx.createRadialGradient(wispX, wispY, 0, wispX, wispY, wispSize);
          wispGrad.addColorStop(0, `rgba(200, 240, 255, ${wispAlpha})`);
          wispGrad.addColorStop(0.5, `rgba(180, 225, 250, ${wispAlpha * 0.5})`);
          wispGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = wispGrad;
          ctx.beginPath();
          ctx.arc(wispX, wispY, wispSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* Base vent cracks on rock */
      ctx.strokeStyle = 'rgba(80, 130, 180, 0.25)';
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
      const shg = ctx.createRadialGradient(x, y, stormR * 0.3, x, y, stormR * 1.8);
      shg.addColorStop(0, 'rgba(160, 200, 255, 0.08)');
      shg.addColorStop(0.3, 'rgba(140, 180, 255, 0.05)');
      shg.addColorStop(0.6, 'rgba(120, 160, 240, 0.03)');
      shg.addColorStop(1, 'transparent');
      ctx.fillStyle = shg;
      ctx.beginPath();
      ctx.arc(x, y, stormR * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rAngle);

      /* --- Logarithmic spiral arm pattern (3 arms) --- */
      const spiralGrowth = 0.18; /* controls tightness of logarithmic spiral */
      for (let arm = 0; arm < 3; arm++) {
        const armBaseAngle = (Math.PI * 2 / 3) * arm;
        const armAlpha = 0.15 + Math.sin(obstacle.pulse * 0.8 + arm * 1.2) * 0.06;
        /* Main spiral line */
        ctx.strokeStyle = `rgba(170, 210, 255, ${armAlpha})`;
        ctx.lineWidth = 1.8 - arm * 0.15;
        ctx.beginPath();
        let firstPt = true;
        for (let t = 0; t < 4.0; t += 0.04) {
          /* Logarithmic spiral: r = a * e^(b*theta) */
          const logR = stormR * 0.08 * Math.exp(spiralGrowth * t);
          if (logR > stormR * 1.05) break;
          const spiralA = armBaseAngle + t;
          const px = Math.cos(spiralA) * logR;
          const py = Math.sin(spiralA) * logR;
          if (firstPt) { ctx.moveTo(px, py); firstPt = false; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        /* Secondary thinner spiral (offset) for depth */
        ctx.strokeStyle = `rgba(150, 195, 245, ${armAlpha * 0.5})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        firstPt = true;
        for (let t = 0.3; t < 3.5; t += 0.05) {
          const logR = stormR * 0.1 * Math.exp(spiralGrowth * t);
          if (logR > stormR * 0.95) break;
          const spiralA = armBaseAngle + t + 0.15;
          const px = Math.cos(spiralA) * logR;
          const py = Math.sin(spiralA) * logR;
          if (firstPt) { ctx.moveTo(px, py); firstPt = false; }
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
      const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, stormR * 0.22);
      eyeGrad.addColorStop(0, 'rgba(230, 245, 255, 0.18)');
      eyeGrad.addColorStop(0.4, 'rgba(180, 210, 255, 0.1)');
      eyeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, stormR * 0.22, 0, Math.PI * 2);
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

      /* --- Inner lightning bolt flashes (multiple, jagged, fading) --- */
      /* Use obstacle.pulse to create pseudo-random but time-varying flashes */
      const lightningSeeds = [1.7, 3.1, 5.3]; /* multiple independent bolt timings */
      for (let lb = 0; lb < lightningSeeds.length; lb++) {
        const lbPhase = obstacle.pulse * lightningSeeds[lb];
        const lbFlash = Math.sin(lbPhase);
        /* Flash appears briefly when sine crosses a threshold */
        if (lbFlash > 0.92) {
          const lbFade = (lbFlash - 0.92) / 0.08; /* 0..1 intensity */
          const lbBaseAngle = lbPhase * 0.7 + lb * 2.1;
          const lbStartR = stormR * (0.1 + lb * 0.1);
          const lbEndR = stormR * (0.5 + lb * 0.15);
          const segments = 3 + lb;
          /* Jagged bolt line */
          ctx.strokeStyle = `rgba(240, 250, 255, ${0.5 * lbFade})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          let bx = Math.cos(lbBaseAngle) * lbStartR;
          let by = Math.sin(lbBaseAngle) * lbStartR;
          ctx.moveTo(bx, by);
          for (let seg = 1; seg <= segments; seg++) {
            const segT = seg / segments;
            const segR = lbStartR + (lbEndR - lbStartR) * segT;
            const segA = lbBaseAngle + (seg % 2 === 0 ? 0.25 : -0.2) * (1 - segT * 0.3);
            bx = Math.cos(segA) * segR + (seg % 2 === 0 ? 4 : -3);
            by = Math.sin(segA) * segR + (seg % 2 === 0 ? -3 : 5);
            ctx.lineTo(bx, by);
          }
          ctx.stroke();
          /* Bolt glow */
          ctx.strokeStyle = `rgba(200, 235, 255, ${0.15 * lbFade})`;
          ctx.lineWidth = 5;
          ctx.stroke();
          /* Brief flash on the vortex */
          if (lbFade > 0.5) world.ambientFlash = Math.max(world.ambientFlash || 0, 0.06 * lbFade);
        }
      }

      /* Main lightning flash (original, less frequent) */
      if (Math.random() < 0.012) {
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

      /* --- Debris particle dots orbiting the vortex center --- */
      for (let d = 0; d < 10; d++) {
        const debrisSpeed = 0.6 + d * 0.08 + (d % 3) * 0.05;
        const debrisAngle = obstacle.pulse * debrisSpeed + d * 0.628;
        const debrisBand = stormR * (0.3 + (d / 10) * 0.6);
        const debrisWobble = Math.sin(obstacle.pulse * 1.5 + d * 0.9) * stormR * 0.05;
        const dR = debrisBand + debrisWobble;
        const dx = Math.cos(debrisAngle) * dR;
        const dy = Math.sin(debrisAngle) * dR;
        const debrisSize = 1.0 + (d % 3) * 0.6 + Math.sin(obstacle.pulse * 0.8 + d) * 0.4;
        const debrisAlpha = 0.2 + Math.sin(obstacle.pulse + d * 0.7) * 0.1;
        ctx.fillStyle = `rgba(180, 215, 255, ${debrisAlpha})`;
        ctx.beginPath();
        ctx.arc(dx, dy, debrisSize, 0, Math.PI * 2);
        ctx.fill();
        /* Debris trailing streak */
        if (d < 5) {
          const trailAngle = debrisAngle - 0.15;
          const trailX = Math.cos(trailAngle) * dR;
          const trailY = Math.sin(trailAngle) * dR;
          ctx.strokeStyle = `rgba(170, 210, 250, ${debrisAlpha * 0.4})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(trailX, trailY);
          ctx.stroke();
        }
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

  /* --- Swept-back tail fins (animate with velocity) --- */
  const tailSpread = 1 + breathe * 0.15;
  const vyDeflect = Math.max(-1, Math.min(1, glider.vy * 0.003)); /* fin deflection from velocity */
  const finTipRotTop = vyDeflect * 0.35;  /* upper fin tip rotation */
  const finTipRotBot = -vyDeflect * 0.35; /* lower fin tip rotation */

  /* Upper swept-back fin */
  ctx.fillStyle = `rgba(80, 220, 210, ${bodyAlpha * 0.45})`;
  ctx.beginPath();
  ctx.moveTo(-14 * pop, -2 * pop);
  ctx.quadraticCurveTo(-20 * pop, -6 * pop * tailSpread, -28 * pop, -4 * pop * tailSpread + finTipRotTop * 8);
  ctx.lineTo(-34 * pop, -8 * pop * tailSpread + finTipRotTop * 12); /* swept tip */
  ctx.quadraticCurveTo(-30 * pop, -2 * pop + finTipRotTop * 4, -22 * pop, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(160, 255, 240, ${bodyAlpha * 0.3})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  /* Upper fin edge accent */
  ctx.strokeStyle = `rgba(200, 255, 250, ${bodyAlpha * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-14 * pop, -2 * pop);
  ctx.lineTo(-34 * pop, -8 * pop * tailSpread + finTipRotTop * 12);
  ctx.stroke();

  /* Lower swept-back fin */
  ctx.fillStyle = `rgba(80, 220, 210, ${bodyAlpha * 0.45})`;
  ctx.beginPath();
  ctx.moveTo(-14 * pop, 2 * pop);
  ctx.quadraticCurveTo(-20 * pop, 6 * pop * tailSpread, -28 * pop, 4 * pop * tailSpread + finTipRotBot * 8);
  ctx.lineTo(-34 * pop, 8 * pop * tailSpread + finTipRotBot * 12); /* swept tip */
  ctx.quadraticCurveTo(-30 * pop, 2 * pop + finTipRotBot * 4, -22 * pop, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(160, 255, 240, ${bodyAlpha * 0.3})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  /* Lower fin edge accent */
  ctx.strokeStyle = `rgba(200, 255, 250, ${bodyAlpha * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-14 * pop, 2 * pop);
  ctx.lineTo(-34 * pop, 8 * pop * tailSpread + finTipRotBot * 12);
  ctx.stroke();

  /* Central tail keel between fins */
  ctx.fillStyle = `rgba(70, 200, 195, ${bodyAlpha * 0.35})`;
  ctx.beginPath();
  ctx.moveTo(-16 * pop, 0);
  ctx.lineTo(-30 * pop, -1 * pop);
  ctx.lineTo(-32 * pop, 0);
  ctx.lineTo(-30 * pop, 1 * pop);
  ctx.closePath();
  ctx.fill();

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

  /* --- Exhaust/thrust particles from rear when pulsing --- */
  if (glider.pulsePop > 0.05) {
    const exhaustIntensity = glider.pulsePop;
    for (let ep = 0; ep < 8; ep++) {
      const epLife = (now * 0.005 + ep * 0.125) % 1;
      const epDist = epLife * 28 * pop * exhaustIntensity;
      const epSpread = (Math.sin(now * 0.02 + ep * 1.7) * 6 + (ep % 2 === 0 ? 3 : -3)) * epLife;
      const epX = -18 * pop - epDist;
      const epY = epSpread;
      const epAlpha = (1 - epLife) * exhaustIntensity * 0.6;
      const epSize = (2 + Math.sin(ep * 2.3) * 1.2) * (1 - epLife * 0.5) * pop;
      const epGlow = ctx.createRadialGradient(epX, epY, 0, epX, epY, epSize * 2.5);
      epGlow.addColorStop(0, `rgba(180, 255, 250, ${epAlpha})`);
      epGlow.addColorStop(0.4, `rgba(100, 230, 240, ${epAlpha * 0.5})`);
      epGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = epGlow;
      ctx.beginPath();
      ctx.arc(epX, epY, epSize * 2.5, 0, Math.PI * 2);
      ctx.fill();
      /* Hot core of each exhaust particle */
      ctx.fillStyle = `rgba(220, 255, 255, ${epAlpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(epX, epY, epSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Exhaust cone glow */
    const coneAlpha = exhaustIntensity * 0.15;
    ctx.fillStyle = `rgba(140, 255, 245, ${coneAlpha})`;
    ctx.beginPath();
    ctx.moveTo(-18 * pop, -2 * pop);
    ctx.lineTo(-38 * pop, -8 * pop * exhaustIntensity);
    ctx.lineTo(-38 * pop, 8 * pop * exhaustIntensity);
    ctx.lineTo(-18 * pop, 2 * pop);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  /* --- Shield bubble when symbiosis is active --- */
  if (phase) {
    const shieldR = 32 * pop;
    const shimmerPhase = now * 0.003;
    /* Main shield bubble - semi-transparent */
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(shimmerPhase) * 0.08;
    const shieldGrad = ctx.createRadialGradient(glider.x, glider.y, shieldR * 0.6, glider.x, glider.y, shieldR);
    shieldGrad.addColorStop(0, 'rgba(130, 255, 240, 0.02)');
    shieldGrad.addColorStop(0.7, 'rgba(100, 230, 255, 0.08)');
    shieldGrad.addColorStop(0.9, 'rgba(160, 255, 250, 0.2)');
    shieldGrad.addColorStop(1, 'rgba(200, 255, 255, 0.05)');
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.arc(glider.x, glider.y, shieldR, 0, Math.PI * 2);
    ctx.fill();
    /* Shield edge ring */
    ctx.strokeStyle = `rgba(180, 255, 250, ${0.35 + Math.sin(shimmerPhase * 1.5) * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(glider.x, glider.y, shieldR, 0, Math.PI * 2);
    ctx.stroke();
    /* Shimmer highlights - rotating sparkle points on the bubble surface */
    for (let sh = 0; sh < 6; sh++) {
      const shAngle = shimmerPhase * 0.8 + sh * (Math.PI * 2 / 6);
      const shX = glider.x + Math.cos(shAngle) * shieldR;
      const shY = glider.y + Math.sin(shAngle) * shieldR;
      const shAlpha = 0.3 + Math.sin(shimmerPhase * 2 + sh * 1.2) * 0.25;
      ctx.fillStyle = `rgba(220, 255, 255, ${shAlpha})`;
      ctx.beginPath();
      ctx.arc(shX, shY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Inner shimmer wave */
    ctx.strokeStyle = `rgba(160, 255, 245, ${0.1 + Math.sin(shimmerPhase * 2.5) * 0.06})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(glider.x, glider.y, shieldR * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

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
    const amount = world.scorePopAmount || 1;
    const isMultiplied = world.comboMultiplier > 1;
    ctx.fillStyle = isMultiplied ? `rgba(255, 230, 140, ${alpha})` : `rgba(200, 255, 245, ${alpha})`;
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${amount}`, 0, 0);
    if (isMultiplied) {
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.8})`;
      ctx.fillText(getComboLabel(), 0, 20);
    }
    ctx.restore();
  }

  /* Combo milestone pop */
  if (world.comboPop > 0) {
    const scale = 1 + world.comboPop * 0.3;
    const alpha = Math.min(1, world.comboPop);
    ctx.save();
    ctx.translate(world.width / 2, 90);
    ctx.scale(scale, scale);
    ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`COMBO ${getComboLabel()}!`, 0, 0);
    ctx.restore();
  }

  /* Combo break indicator */
  if (world.comboBreakPop > 0) {
    const alpha = world.comboBreakPop * 0.6;
    ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
    ctx.font = '600 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Combo Lost', world.width / 2, 110);
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
    const densityColor = world.densityLabel === 'Light' ? '130, 230, 200' :
                         world.densityLabel === 'Normal' ? '180, 180, 255' : '255, 140, 140';
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
    const zoneName = _t(ZONE_I18N[z.zoneNum - 1] || 'upperAtmosphere');
    ctx.fillText(`${_t('zone')} ${z.zoneNum}: ${zoneName}`, world.width / 2, world.height * 0.20);
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
      const achI18n = ACH_I18N[ach.id];
      const achName = achI18n ? _t(achI18n.name) : ach.name;
      ctx.fillText(`${_t('achievement')}: ${achName}`, world.width / 2, yOff + 4);
      yOff += 38;
    }
    toast.timer -= dt;
  }
}

/* --- Edge Warnings --- */
function drawEdgeWarnings() {
  for (const warn of world.edgeWarnings) {
    const alpha = 0.4 + Math.sin(performance.now() * 0.01) * 0.15;
    ctx.fillStyle = `hsla(${warn.hue}, 70%, 70%, ${alpha})`;
    ctx.beginPath();
    /* Triangle pointing left on right edge */
    const wx = world.width - 8;
    ctx.moveTo(wx, warn.y - 8);
    ctx.lineTo(wx + 6, warn.y);
    ctx.lineTo(wx, warn.y + 8);
    ctx.closePath();
    ctx.fill();
    /* Glow line */
    ctx.strokeStyle = `hsla(${warn.hue}, 60%, 60%, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, warn.y - 12);
    ctx.lineTo(wx, warn.y + 12);
    ctx.stroke();
  }
}

/* --- Density Forecast Indicator --- */
function drawDensityForecast() {
  if (!world.densityForecast || world.densityForecastTimer <= 0) return;
  const alpha = Math.min(1, world.densityForecastTimer) * 0.6;
  const pulse = Math.sin(performance.now() * 0.01) * 0.2;

  /* Background pill for visibility */
  ctx.fillStyle = `rgba(40, 30, 10, ${alpha * 0.5})`;
  ctx.beginPath();
  ctx.roundRect(14, 62, 120, 28, 6);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 220, 130, ${alpha * (0.6 + pulse)})`;
  ctx.font = '600 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('AIR CHANGING...', 22, 76);

  /* Countdown bar */
  const barW = 104;
  const barH = 4;
  const frac = 1 - world.densityForecastTimer / 2.0;
  ctx.fillStyle = `rgba(255, 200, 80, ${alpha * 0.25})`;
  ctx.beginPath();
  ctx.roundRect(22, 80, barW, barH, 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 200, 80, ${alpha * 0.8})`;
  ctx.beginPath();
  ctx.roundRect(22, 80, barW * frac, barH, 2);
  ctx.fill();

  /* Surf hint — appears when bar is mostly full */
  if (frac > 0.6) {
    const hintAlpha = alpha * Math.min(1, (frac - 0.6) * 2.5);
    ctx.fillStyle = `rgba(255, 240, 160, ${hintAlpha * 0.7})`;
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillText('Press Space now for boost!', 22, 98);
  }
}

/* --- Ghost Trail --- */
function drawGhostTrail() {
  if (world.bestGhostTrail.length === 0 || world.state !== STATE.PLAYING) return;
  /* Find ghost position matching current score */
  const idx = world.ghostTrail.length;
  if (idx >= world.bestGhostTrail.length) return;
  const ghost = world.bestGhostTrail[idx];
  if (!ghost) return;
  const alpha = 0.12;
  ctx.fillStyle = `rgba(160, 200, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(glider.x, ghost.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(160, 200, 255, ${alpha * 0.5})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/* --- Boss Drawing --- */
function drawBoss() {
  if (!world.boss || !world.boss.active) return;
  const boss = world.boss;
  const x = boss.x;
  const y = boss.y;
  const r = boss.radius;
  const now = performance.now();

  /* Outer menacing glow */
  const glowAlpha = 0.15 + Math.sin(now * 0.003) * 0.05;
  const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.8);
  glow.addColorStop(0, `hsla(${boss.hue}, 70%, 50%, ${glowAlpha})`);
  glow.addColorStop(0.5, `hsla(${boss.hue}, 60%, 40%, ${glowAlpha * 0.5})`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  /* Core body */
  const bodyGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  bodyGrad.addColorStop(0, `hsla(${boss.hue}, 80%, 70%, 0.4)`);
  bodyGrad.addColorStop(0.5, `hsla(${boss.hue}, 70%, 50%, 0.25)`);
  bodyGrad.addColorStop(0.8, `hsla(${boss.hue}, 60%, 40%, 0.15)`);
  bodyGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  /* Rotating rings */
  for (let i = 0; i < 3; i++) {
    const ringR = r * (0.4 + i * 0.2);
    const ringA = now * 0.002 * (1 + i * 0.3);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ringA + i * 1.2);
    ctx.strokeStyle = `hsla(${boss.hue + i * 30}, 60%, 60%, ${0.2 + Math.sin(now * 0.004 + i) * 0.1})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* Health bar */
  const maxHealth = { 2: 3, 3: 4, 4: 5, 5: 6 }[world.zone] || 3;
  const hpFrac = boss.health / maxHealth;
  const barW = r * 1.2;
  const barH = 6;
  const barX = x - barW / 2;
  const barY = y - r - 20;
  ctx.fillStyle = 'rgba(40, 20, 30, 0.5)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 3);
  ctx.fill();
  const hpColor = hpFrac > 0.5 ? `hsla(${boss.hue}, 70%, 60%, 0.8)` : 'rgba(255, 100, 80, 0.8)';
  ctx.fillStyle = hpColor;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * hpFrac, barH, 3);
  ctx.fill();

  /* Hit flash */
  if (boss.hitTimer > 0.3) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(boss.hitTimer - 0.3) * 2})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Name label */
  ctx.fillStyle = `hsla(${boss.hue}, 50%, 80%, 0.6)`;
  ctx.font = '600 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(boss.name, x, barY - 6);
}

/* --- Lore / Environmental Storytelling --- */
function drawLore(dt) {
  if (!world.loreAnnounce || world.loreAnnounce.timer <= 0) return;
  const lore = world.loreAnnounce;
  lore.timer -= dt;
  const alpha = Math.min(1, lore.timer / 0.8) * 0.65;
  ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
  ctx.font = 'italic 500 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(lore.text, world.width / 2, world.height - 30);
}

/* --- First-Encounter Tips --- */
function drawTips(dt) {
  if (!activeTip || activeTip.timer <= 0) { activeTip = null; return; }
  activeTip.timer -= dt;
  const alpha = Math.min(1, activeTip.timer / 0.5) * 0.9;
  const tipY = world.height - 24;

  /* Background pill */
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '500 13px Inter, sans-serif';
  const tw = ctx.measureText(activeTip.text).width + 28;
  ctx.fillStyle = `rgba(10, 20, 40, ${alpha * 0.7})`;
  ctx.beginPath();
  ctx.roundRect(world.width / 2 - tw / 2, tipY - 14, tw, 24, 12);
  ctx.fill();
  ctx.strokeStyle = `rgba(130, 220, 255, ${alpha * 0.3})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = `rgba(200, 235, 255, ${alpha})`;
  ctx.fillText(activeTip.text, world.width / 2, tipY + 2);
  ctx.restore();
}

function drawText(dt) {
  if (world.state === STATE.MENU) {
    drawVignette();
    const t = performance.now() * 0.001;
    const float = Math.sin(t * 1.5) * 4;

    ctx.fillStyle = '#d8eaff';
    ctx.textAlign = 'center';

    if (!tutorialDone) {
      /* Tutorial panels — plain language with visual cues */
      ctx.font = '600 28px Inter, sans-serif';
      const msgs = [
        { title: 'Go Up', desc: 'Press SPACE or TAP the screen to fly upward', icon: '\u2191', hint: 'SPACE / TAP' },
        { title: 'Dodge Obstacles', desc: 'Crystals, fish, geysers, and storms will block your path', icon: '\u26A0', hint: 'Steer around them' },
        { title: 'Shield (Symbiosis)', desc: 'Press SHIFT to become invincible for a short time', icon: '\u25C9', hint: 'SHIFT / on-screen button' },
        { title: 'Close Calls = Points', desc: 'Fly NEAR obstacles without touching them to build combos', icon: '\u2605', hint: 'The closer, the better!' },
        { title: 'Ride the Wave', desc: 'Press SPACE right when the air changes for a speed boost', icon: '\u2248', hint: 'Watch for "SHIFT INCOMING"' },
        { title: 'Beat the Bosses', desc: 'Use your shield to fly THROUGH bosses and hurt them', icon: '\u2694', hint: 'Shield + fly into boss' },
        { title: 'You\'re Ready!', desc: 'The air changes between light, normal, and heavy — adapt!', icon: '\u2713', hint: 'Good luck out there' },
      ];
      const step = Math.min(tutorialStep, msgs.length - 1);
      const m = msgs[step];

      /* Icon circle */
      ctx.fillStyle = 'rgba(130, 220, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(world.width / 2, world.height / 2 - 54 + float, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '400 28px Inter, sans-serif';
      ctx.fillStyle = 'rgba(180, 240, 255, 0.9)';
      ctx.fillText(m.icon, world.width / 2, world.height / 2 - 44 + float);

      /* Title */
      ctx.font = '600 28px Inter, sans-serif';
      ctx.fillStyle = '#d8eaff';
      ctx.fillText(m.title, world.width / 2, world.height / 2 - 8 + float);

      /* Description */
      ctx.fillStyle = 'rgba(180, 210, 255, 0.75)';
      ctx.font = '500 16px Inter, sans-serif';
      ctx.fillText(m.desc, world.width / 2, world.height / 2 + 20 + float);

      /* Input hint pill */
      ctx.fillStyle = 'rgba(130, 200, 255, 0.15)';
      const hintW = ctx.measureText(m.hint).width + 24;
      ctx.beginPath();
      ctx.roundRect(world.width / 2 - hintW / 2, world.height / 2 + 32 + float, hintW, 26, 13);
      ctx.fill();
      ctx.fillStyle = 'rgba(180, 230, 255, 0.8)';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText(m.hint, world.width / 2, world.height / 2 + 49 + float);

      /* Progress dots + tap prompt */
      const dotY = world.height / 2 + 76 + float;
      for (let i = 0; i < msgs.length; i++) {
        ctx.fillStyle = i === step ? 'rgba(130, 220, 255, 0.9)' : i < step ? 'rgba(130, 220, 255, 0.4)' : 'rgba(130, 220, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(world.width / 2 + (i - 3) * 16, dotY, i === step ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '400 13px Inter, sans-serif';
      ctx.fillStyle = 'rgba(160, 200, 240, 0.45)';
      ctx.fillText('Tap or press Space to continue', world.width / 2, dotY + 22);
    } else {
      ctx.font = '600 42px Inter, sans-serif';
      ctx.fillText(_t('methaneDriftLogo'), world.width / 2, world.height / 2 - 24 + float);
      ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
      ctx.font = '500 18px Inter, sans-serif';
      ctx.fillText(_t('spaceClickBegin'), world.width / 2, world.height / 2 + 14 + float);
      if (world.best > 0) {
        ctx.font = '500 15px Inter, sans-serif';
        ctx.fillStyle = 'rgba(160, 200, 240, 0.5)';
        ctx.fillText(`${_t('best')}: ${world.best}`, world.width / 2, world.height / 2 + 42 + float);
      }
    }
  }

  if (world.state === STATE.PAUSED) {
    drawVignette();
    const pcx = world.width / 2;
    ctx.fillStyle = '#d8eaff';
    ctx.textAlign = 'center';
    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillText('Paused', pcx, 60);
    ctx.fillStyle = 'rgba(180, 210, 255, 0.6)';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('Press Escape or tap X to resume', pcx, 82);

    /* Controls reference card */
    const cardX = pcx - 180;
    const cardY = 105;
    const cardW = 360;
    const cardH = world.height - 130;
    ctx.fillStyle = 'rgba(8, 14, 30, 0.6)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(130, 200, 240, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    const lx = cardX + 20;
    const rx = cardX + cardW - 20;
    let ry = cardY + 28;

    ctx.fillStyle = 'rgba(130, 220, 255, 0.8)';
    ctx.font = '600 15px Inter, sans-serif';
    ctx.fillText('Controls', lx, ry);
    ry += 24;

    const controls = [
      ['Space / Tap', 'Fly upward'],
      ['Shift / Button', 'Activate shield'],
      ['Escape', 'Pause / Resume'],
    ];
    ctx.font = '500 13px Inter, sans-serif';
    for (const [key, desc] of controls) {
      ctx.fillStyle = 'rgba(200, 230, 255, 0.8)';
      ctx.fillText(key, lx, ry);
      ctx.fillStyle = 'rgba(160, 190, 220, 0.6)';
      ctx.textAlign = 'right';
      ctx.fillText(desc, rx, ry);
      ctx.textAlign = 'left';
      ry += 20;
    }

    ry += 10;
    ctx.fillStyle = 'rgba(130, 220, 255, 0.8)';
    ctx.font = '600 15px Inter, sans-serif';
    ctx.fillText('How to Play', lx, ry);
    ry += 22;

    const tips = [
      'Fly through the sky and dodge obstacles to score.',
      'Fly CLOSE to obstacles for near-miss bonus points.',
      'Chain near-misses to build combos (x1.5 to x5 score).',
      'Use your Shield (Shift) to become invincible briefly.',
      'The air changes between Light, Normal, and Heavy.',
      'Press Space RIGHT when air changes for a speed boost.',
      'Bosses appear every 25 points \u2014 shield through them!',
      'Geysers turn off briefly \u2014 wait for the pause.',
      'Storms pull you in \u2014 steer away or use Shield.',
    ];
    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(180, 210, 240, 0.65)';
    for (const tip of tips) {
      ctx.fillText('\u2022 ' + tip, lx, ry);
      ry += 17;
    }

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
    const cx = world.width / 2;
    let yPos = world.height / 2 - 90;

    ctx.fillStyle = '#d8eaff';
    ctx.textAlign = 'center';
    ctx.font = '600 32px Inter, sans-serif';
    ctx.fillText('Game Over', cx, yPos);
    yPos += 34;

    /* Score */
    ctx.fillStyle = 'rgba(180, 210, 255, 0.8)';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText(`Score: ${world.score}`, cx, yPos);
    yPos += 24;

    ctx.font = '500 15px Inter, sans-serif';
    ctx.fillText(`Your Best: ${world.best}`, cx, yPos);
    yPos += 22;

    if (world.score === world.best && world.score > 0) {
      ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
      ctx.font = '700 15px Inter, sans-serif';
      ctx.fillText('NEW BEST SCORE!', cx, yPos);
      yPos += 20;
    }

    /* Run summary — friendly labels */
    yPos += 6;
    ctx.fillStyle = 'rgba(140, 180, 220, 0.6)';
    ctx.font = '400 12px Inter, sans-serif';
    const rs = world.runStats;
    const summaryLines = [
      `Obstacles dodged: ${rs.obstaclesDodged}  \u00B7  Close calls: ${rs.nearMisses}  \u00B7  Time alive: ${rs.timeAlive.toFixed(1)}s`,
      `Best combo: ${Math.max(rs.maxCombo, world.combo)}  \u00B7  Wave rides: ${rs.densitySurfs}  \u00B7  Bosses beaten: ${rs.bossesDefeated}`,
    ];
    if (rs.closestNearMiss < 999) {
      summaryLines.push(`Closest call: ${rs.closestNearMiss.toFixed(1)}px  \u00B7  Shield uses: ${rs.symbiosisUses}`);
    }
    for (const line of summaryLines) {
      ctx.fillText(line, cx, yPos);
      yPos += 17;
    }

    /* Highlight moment */
    yPos += 4;
    if (rs.maxCombo >= 5) {
      ctx.fillStyle = 'rgba(255, 220, 140, 0.6)';
      ctx.fillText(`Best moment: ${rs.maxCombo}x combo streak!`, cx, yPos);
      yPos += 17;
    } else if (rs.densitySurfs > 0) {
      ctx.fillStyle = 'rgba(255, 220, 140, 0.6)';
      ctx.fillText(`Best moment: ${rs.densitySurfs} wave ride${rs.densitySurfs > 1 ? 's' : ''}!`, cx, yPos);
      yPos += 17;
    }

    /* Tip for improvement */
    yPos += 4;
    ctx.fillStyle = 'rgba(160, 200, 240, 0.45)';
    ctx.font = 'italic 400 11px Inter, sans-serif';
    if (rs.nearMisses === 0) {
      ctx.fillText('Tip: Fly close to obstacles for near-miss bonus points!', cx, yPos);
    } else if (rs.symbiosisUses === 0) {
      ctx.fillText('Tip: Press Shift to use your Shield when things get tough!', cx, yPos);
    } else if (rs.densitySurfs === 0 && world.score >= 5) {
      ctx.fillText('Tip: Press Space right when the air changes for a speed boost!', cx, yPos);
    }
    yPos += 20;

    ctx.fillStyle = 'rgba(150, 190, 230, 0.5)';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('Tap or press Space to try again', world.width / 2, yPos + 10);
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
  const densityColor = world.densityLabel === 'Light' ? 'rgba(130, 230, 200, 0.7)' :
                       world.densityLabel === 'Normal' ? 'rgba(180, 180, 255, 0.7)' : 'rgba(255, 140, 140, 0.7)';
  ctx.font = '500 14px Inter, sans-serif';
  ctx.fillStyle = densityColor;
  ctx.fillText(_t(DENSITY_I18N[world.densityLabel] || 'buoyant'), 20, 56);

  /* Symbiosis button — bottom left (enlarged for easier clicking) */
  const btnX = 16;
  const btnY = world.height - 78;
  const btnW = 160;
  const btnH = 58;
  const ready = glider.symbiosisCharge >= 1 && glider.symbiosisTimer <= 0 && glider.symbiosisCooldown <= 0;
  const phasing = glider.symbiosisTimer > 0;
  const cooling = glider.symbiosisCooldown > 0;

  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 14);
  if (phasing) {
    ctx.fillStyle = 'rgba(130, 255, 240, 0.28)';
  } else if (ready) {
    ctx.fillStyle = 'rgba(130, 255, 200, 0.22)';
  } else {
    ctx.fillStyle = 'rgba(80, 100, 140, 0.18)';
  }
  ctx.fill();
  ctx.strokeStyle = ready ? 'rgba(130, 255, 200, 0.6)' : phasing ? 'rgba(130, 255, 240, 0.5)' : 'rgba(120, 150, 200, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Cooldown progress bar inside button */
  if (cooling) {
    const coolFrac = glider.symbiosisCooldown / CONFIG.symbiosisCooldown;
    const barPad = 6;
    const barH = 4;
    const barY = btnY + btnH - barPad - barH;
    const barW = btnW - barPad * 2;
    ctx.fillStyle = 'rgba(80, 120, 180, 0.25)';
    ctx.beginPath();
    ctx.roundRect(btnX + barPad, barY, barW, barH, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(130, 200, 255, 0.6)';
    ctx.beginPath();
    ctx.roundRect(btnX + barPad, barY, barW * (1 - coolFrac), barH, 2);
    ctx.fill();
  }

  /* Phasing duration bar inside button */
  if (phasing) {
    const phaseFrac = glider.symbiosisTimer / CONFIG.symbiosisDuration;
    const barPad = 6;
    const barH = 4;
    const barY = btnY + btnH - barPad - barH;
    const barW = btnW - barPad * 2;
    ctx.fillStyle = 'rgba(80, 180, 160, 0.25)';
    ctx.beginPath();
    ctx.roundRect(btnX + barPad, barY, barW, barH, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(130, 255, 240, 0.7)';
    ctx.beginPath();
    ctx.roundRect(btnX + barPad, barY, barW * phaseFrac, barH, 2);
    ctx.fill();
  }

  /* Button label */
  ctx.textAlign = 'center';
  ctx.font = '700 17px Inter, sans-serif';
  const labelY = (phasing || cooling) ? btnY + btnH / 2 + 1 : btnY + btnH / 2 + 6;
  if (phasing) {
    ctx.fillStyle = 'rgba(130, 255, 240, 0.95)';
    ctx.fillText(`Shield ON ${glider.symbiosisTimer.toFixed(1)}s`, btnX + btnW / 2, labelY);
  } else if (cooling) {
    ctx.fillStyle = 'rgba(160, 200, 230, 0.6)';
    ctx.fillText(`Recharging ${Math.ceil(glider.symbiosisCooldown)}s`, btnX + btnW / 2, labelY);
  } else if (ready) {
    ctx.fillStyle = 'rgba(130, 255, 200, 0.9)';
    ctx.fillText('Shield [Shift]', btnX + btnW / 2, labelY);
  } else {
    ctx.fillStyle = 'rgba(160, 180, 210, 0.4)';
    ctx.fillText('Recharging', btnX + btnW / 2, labelY);
  }

  /* Shield status — top right */
  ctx.textAlign = 'right';
  ctx.font = '600 14px Inter, sans-serif';
  const symLabel = phasing ? `Shield ON ${glider.symbiosisTimer.toFixed(1)}s`
    : cooling ? `Recharging ${Math.ceil(glider.symbiosisCooldown)}s`
    : glider.symbiosisCharge >= 1 ? 'Shield Ready' : 'Recharging';
  const symColor = phasing ? 'rgba(130, 255, 240, 0.8)' :
                   cooling ? 'rgba(160, 200, 230, 0.5)' :
                   glider.symbiosisCharge >= 1 ? 'rgba(130, 255, 200, 0.7)' : 'rgba(180, 200, 230, 0.4)';
  ctx.fillStyle = symColor;
  ctx.fillText(symLabel, world.width - 20, 36);

  /* Combo with multiplier + timer bar */
  if (world.combo > 0) {
    const comboAlpha = 0.8 + glider.comboGlow * 0.2;
    const comboColor = world.comboMultiplier >= 3 ? `rgba(255, 220, 100, ${comboAlpha})` :
                       world.comboMultiplier >= 2 ? `rgba(255, 240, 170, ${comboAlpha})` :
                       world.comboMultiplier >= 1.5 ? `rgba(200, 255, 200, ${comboAlpha})` :
                       `rgba(180, 255, 230, ${comboAlpha})`;
    ctx.fillStyle = comboColor;
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(`Combo x${world.combo}`, world.width - 20, 56);

    /* Combo countdown bar — shows how long before combo resets */
    const comboFrac = Math.max(0, world.comboTimer / 3.5);
    const cBarW = 80;
    const cBarH = 3;
    const cBarX = world.width - 20 - cBarW;
    const cBarY = 62;
    ctx.fillStyle = `rgba(180, 200, 230, ${comboAlpha * 0.15})`;
    ctx.beginPath();
    ctx.roundRect(cBarX, cBarY, cBarW, cBarH, 1.5);
    ctx.fill();
    const urgentColor = comboFrac < 0.3 ? `rgba(255, 120, 80, ${comboAlpha * 0.8})` : comboColor;
    ctx.fillStyle = urgentColor;
    ctx.beginPath();
    ctx.roundRect(cBarX, cBarY, cBarW * comboFrac, cBarH, 1.5);
    ctx.fill();

    if (world.comboMultiplier > 1) {
      ctx.font = '500 13px Inter, sans-serif';
      ctx.fillStyle = `rgba(255, 220, 140, ${comboAlpha * 0.7})`;
      ctx.fillText(`Score ${getComboLabel()}`, world.width - 20, 78);
    }
  }

  /* Density surf boost indicator */
  if (world.densitySurfBoost > 0) {
    const surfAlpha = Math.min(1, world.densitySurfBoost * 2);
    ctx.fillStyle = `rgba(255, 220, 80, ${surfAlpha * 0.8})`;
    ctx.font = '700 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SPEED BOOST!', 20, 92);
    ctx.textAlign = 'right';
  }

  /* Pressure adaptation indicator */
  if (world.pressureAdaptation > 0) {
    ctx.fillStyle = 'rgba(255, 180, 120, 0.5)';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText('Heavy Air Adapted', world.width - 20, 88);
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
  drawGhostTrail();
  drawObstacles();
  drawBoss();
  drawParticles();
  drawGlider();
  drawScorePop();
  drawEdgeWarnings();
  drawDensityForecast();
  drawCanvasHUD();
  drawWhiteFlash();
  drawAnnouncements(dt);
  drawLore(dt);
  drawTips(dt);
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

  /* Symbiosis button hit test during gameplay (enlarged touch target) */
  if (world.state === STATE.PLAYING) {
    const btnX = 16;
    const btnY = world.height - 78;
    const btnW = 160;
    const btnH = 58;
    /* Extra touch padding for easier tapping */
    const pad = 10;
    if (pos.x >= btnX - pad && pos.x <= btnX + btnW + pad && pos.y >= btnY - pad && pos.y <= btnY + btnH + pad) {
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
    muteBtn.textContent = muted ? _t('soundOff') : _t('soundOn');
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

/* Symbiosis button — always visible during gameplay for easier access */
const symbiosisBtn = document.getElementById('symbiosisBtn');
if (symbiosisBtn) {
  symbiosisBtn.hidden = false;
  symbiosisBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    activateSymbiosis();
  });
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

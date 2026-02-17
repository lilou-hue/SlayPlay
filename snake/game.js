/* ============================================================
   Snake — game.js
   Procedural audio · Haptic feedback · Neon visuals
   Themes · Skins · Achievements · Tutorial · New food types
   ============================================================ */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");
const muteButton = document.getElementById("muteButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const themeSelect = document.getElementById("themeSelect");
const skinSelect = document.getElementById("skinSelect");

const CELL = 20;
const COLS = canvas.width / CELL;   // 24
const ROWS = canvas.height / CELL;  // 24

/* ── Colour Themes ────────────────────────────────────────── */

const THEMES = {
  neon: {
    bg: "#0a0f0a",
    gridColor: "rgba(0,255,100,0.04)",
    wallColor: [57, 255, 20],
    wallGlow: "rgba(57,255,20,0.3)",
    vignetteColor: "rgba(0,0,0,0.45)",
    headGrad: ["#39ff14", "#00cc44"],
    headGlow: "rgba(57,255,20,0.6)",
    bodyStart: [57, 255, 20],
    bodyEnd: [0, 184, 148],
    foodNormal: { inner: "#ffbe0b", outer: "#ff9500", glow: "rgba(255,190,11,0.5)" },
    foodGolden: { color: "#ffd700", glow: "rgba(255,215,0,0.7)" },
    foodSpeed: { inner: "#ff006e", outer: "#cc0058", glow: "rgba(255,0,110,0.5)" },
    foodPoison: { inner: "#8b00ff", outer: "#5c00a3", glow: "rgba(139,0,255,0.5)" },
    foodMagnet: { inner: "#00e5ff", outer: "#0097a7", glow: "rgba(0,229,255,0.5)" },
    foodGhost: { inner: "#e0e0e0", outer: "#9e9e9e", glow: "rgba(224,224,224,0.4)" },
    foodFreeze: { inner: "#80d8ff", outer: "#4fc3f7", glow: "rgba(128,216,255,0.5)" },
    particleEat: "#ffbe0b",
    dustColor: "rgba(57,255,20,0.5)",
    dustGlow: "rgba(57,255,20,0.3)",
    eyeColor: "#ffffff",
    pupilColor: "#0a0f0a",
    tongueColor: "#ff2244",
    textColor: "#ffffff",
    scoreColor: "#ffffff",
    dangerGlow: "rgba(255,68,68,0.3)",
  },
  cyber: {
    bg: "#0a0510",
    gridColor: "rgba(138,43,226,0.04)",
    wallColor: [138, 43, 226],
    wallGlow: "rgba(138,43,226,0.3)",
    vignetteColor: "rgba(0,0,0,0.45)",
    headGrad: ["#bf00ff", "#8000cc"],
    headGlow: "rgba(191,0,255,0.6)",
    bodyStart: [191, 0, 255],
    bodyEnd: [75, 0, 130],
    foodNormal: { inner: "#ff6ec7", outer: "#ff2d95", glow: "rgba(255,110,199,0.5)" },
    foodGolden: { color: "#ffd700", glow: "rgba(255,215,0,0.7)" },
    foodSpeed: { inner: "#00ffff", outer: "#00b3b3", glow: "rgba(0,255,255,0.5)" },
    foodPoison: { inner: "#ff1744", outer: "#b71c1c", glow: "rgba(255,23,68,0.5)" },
    foodMagnet: { inner: "#e040fb", outer: "#aa00ff", glow: "rgba(224,64,251,0.5)" },
    foodGhost: { inner: "#b0bec5", outer: "#78909c", glow: "rgba(176,190,197,0.4)" },
    foodFreeze: { inner: "#82b1ff", outer: "#448aff", glow: "rgba(130,177,255,0.5)" },
    particleEat: "#ff6ec7",
    dustColor: "rgba(138,43,226,0.5)",
    dustGlow: "rgba(138,43,226,0.3)",
    eyeColor: "#ffffff",
    pupilColor: "#0a0510",
    tongueColor: "#ff2d95",
    textColor: "#ffffff",
    scoreColor: "#ffffff",
    dangerGlow: "rgba(255,68,68,0.3)",
  },
  ocean: {
    bg: "#040a14",
    gridColor: "rgba(0,150,255,0.04)",
    wallColor: [0, 150, 255],
    wallGlow: "rgba(0,150,255,0.3)",
    vignetteColor: "rgba(0,0,0,0.45)",
    headGrad: ["#00b4d8", "#0077b6"],
    headGlow: "rgba(0,180,216,0.6)",
    bodyStart: [0, 180, 216],
    bodyEnd: [0, 100, 150],
    foodNormal: { inner: "#ffd166", outer: "#ef9c00", glow: "rgba(255,209,102,0.5)" },
    foodGolden: { color: "#ffd700", glow: "rgba(255,215,0,0.7)" },
    foodSpeed: { inner: "#ff6b6b", outer: "#cc4444", glow: "rgba(255,107,107,0.5)" },
    foodPoison: { inner: "#6c5ce7", outer: "#4834d4", glow: "rgba(108,92,231,0.5)" },
    foodMagnet: { inner: "#00cec9", outer: "#009688", glow: "rgba(0,206,201,0.5)" },
    foodGhost: { inner: "#dfe6e9", outer: "#b2bec3", glow: "rgba(223,230,233,0.4)" },
    foodFreeze: { inner: "#74b9ff", outer: "#0984e3", glow: "rgba(116,185,255,0.5)" },
    particleEat: "#ffd166",
    dustColor: "rgba(0,150,255,0.4)",
    dustGlow: "rgba(0,150,255,0.3)",
    eyeColor: "#ffffff",
    pupilColor: "#040a14",
    tongueColor: "#ff6b6b",
    textColor: "#ffffff",
    scoreColor: "#ffffff",
    dangerGlow: "rgba(255,68,68,0.3)",
  },
  sunset: {
    bg: "#140808",
    gridColor: "rgba(255,100,50,0.04)",
    wallColor: [255, 100, 50],
    wallGlow: "rgba(255,100,50,0.3)",
    vignetteColor: "rgba(0,0,0,0.45)",
    headGrad: ["#ff6b35", "#e63946"],
    headGlow: "rgba(255,107,53,0.6)",
    bodyStart: [255, 107, 53],
    bodyEnd: [230, 57, 70],
    foodNormal: { inner: "#ffbe0b", outer: "#ff9500", glow: "rgba(255,190,11,0.5)" },
    foodGolden: { color: "#ffd700", glow: "rgba(255,215,0,0.7)" },
    foodSpeed: { inner: "#a8dadc", outer: "#457b9d", glow: "rgba(168,218,220,0.5)" },
    foodPoison: { inner: "#7209b7", outer: "#560bad", glow: "rgba(114,9,183,0.5)" },
    foodMagnet: { inner: "#f72585", outer: "#b5179e", glow: "rgba(247,37,133,0.5)" },
    foodGhost: { inner: "#f8f9fa", outer: "#ced4da", glow: "rgba(248,249,250,0.4)" },
    foodFreeze: { inner: "#48cae4", outer: "#0096c7", glow: "rgba(72,202,228,0.5)" },
    particleEat: "#ffbe0b",
    dustColor: "rgba(255,100,50,0.4)",
    dustGlow: "rgba(255,100,50,0.3)",
    eyeColor: "#ffffff",
    pupilColor: "#140808",
    tongueColor: "#ff006e",
    textColor: "#ffffff",
    scoreColor: "#ffffff",
    dangerGlow: "rgba(255,68,68,0.3)",
  },
  retro: {
    bg: "#000000",
    gridColor: "rgba(0,255,0,0.06)",
    wallColor: [0, 255, 0],
    wallGlow: "rgba(0,255,0,0.3)",
    vignetteColor: "rgba(0,0,0,0.3)",
    headGrad: ["#00ff00", "#00cc00"],
    headGlow: "rgba(0,255,0,0.6)",
    bodyStart: [0, 255, 0],
    bodyEnd: [0, 180, 0],
    foodNormal: { inner: "#ff0000", outer: "#cc0000", glow: "rgba(255,0,0,0.5)" },
    foodGolden: { color: "#ffff00", glow: "rgba(255,255,0,0.7)" },
    foodSpeed: { inner: "#ff00ff", outer: "#cc00cc", glow: "rgba(255,0,255,0.5)" },
    foodPoison: { inner: "#8800ff", outer: "#6600cc", glow: "rgba(136,0,255,0.5)" },
    foodMagnet: { inner: "#00ffff", outer: "#00cccc", glow: "rgba(0,255,255,0.5)" },
    foodGhost: { inner: "#ffffff", outer: "#cccccc", glow: "rgba(255,255,255,0.4)" },
    foodFreeze: { inner: "#0088ff", outer: "#0066cc", glow: "rgba(0,136,255,0.5)" },
    particleEat: "#ff0000",
    dustColor: "rgba(0,255,0,0.3)",
    dustGlow: "rgba(0,255,0,0.2)",
    eyeColor: "#ffffff",
    pupilColor: "#000000",
    tongueColor: "#ff0000",
    textColor: "#00ff00",
    scoreColor: "#00ff00",
    dangerGlow: "rgba(255,0,0,0.3)",
  },
};

let currentTheme = THEMES.neon;

/* ── Snake Skins ──────────────────────────────────────────── */

const SKINS = {
  classic: {
    name: "Classic",
    drawHead(cx, cy, half, headSize, dir) {
      const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, half);
      grad.addColorStop(0, currentTheme.headGrad[0]);
      grad.addColorStop(1, currentTheme.headGrad[1]);
      ctx.fillStyle = grad;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, headSize, headSize, 5);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, headSize, headSize);
      }
    },
    drawBody(cx, cy, half, bodySize, cr, cg, cb, alpha) {
      const segGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, half + 1);
      segGrad.addColorStop(0, `rgba(${Math.min(255,cr+40)},${Math.min(255,cg+40)},${Math.min(255,cb+40)},${alpha})`);
      segGrad.addColorStop(1, `rgba(${Math.max(0,cr-30)},${Math.max(0,cg-30)},${Math.max(0,cb-30)},${alpha})`);
      ctx.fillStyle = segGrad;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, bodySize, bodySize, 4);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, bodySize, bodySize);
      }
    },
  },
  fire: {
    name: "Fire",
    drawHead(cx, cy, half, headSize, dir) {
      const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, half);
      grad.addColorStop(0, "#ffff00");
      grad.addColorStop(0.5, "#ff6600");
      grad.addColorStop(1, "#cc0000");
      ctx.fillStyle = grad;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(255,100,0,0.7)";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, headSize, headSize, 5);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, headSize, headSize);
      }
    },
    drawBody(cx, cy, half, bodySize, cr, cg, cb, alpha, t) {
      const r = Math.round(lerp(255, 180, t));
      const g = Math.round(lerp(160, 30, t));
      const b = Math.round(lerp(0, 0, t));
      const segGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, half + 1);
      segGrad.addColorStop(0, `rgba(${r+30},${g+30},${b},${alpha})`);
      segGrad.addColorStop(1, `rgba(${r-40},${Math.max(0,g-40)},${b},${alpha})`);
      ctx.fillStyle = segGrad;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `rgba(255,${g},0,0.3)`;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, bodySize, bodySize, 4);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, bodySize, bodySize);
      }
    },
  },
  ice: {
    name: "Ice",
    drawHead(cx, cy, half, headSize, dir) {
      const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, half);
      grad.addColorStop(0, "#e0f7fa");
      grad.addColorStop(1, "#0097a7");
      ctx.fillStyle = grad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(0,200,255,0.6)";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, headSize, headSize, 5);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, headSize, headSize);
      }
    },
    drawBody(cx, cy, half, bodySize, cr, cg, cb, alpha, t) {
      const r = Math.round(lerp(180, 100, t));
      const g = Math.round(lerp(230, 180, t));
      const b = Math.round(lerp(255, 220, t));
      const segGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, half + 1);
      segGrad.addColorStop(0, `rgba(${r+20},${g+10},${b},${alpha})`);
      segGrad.addColorStop(1, `rgba(${r-40},${g-40},${b-30},${alpha})`);
      ctx.fillStyle = segGrad;
      ctx.shadowBlur = 4;
      ctx.shadowColor = `rgba(100,200,255,0.2)`;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, bodySize, bodySize, 4);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, bodySize, bodySize);
      }
    },
  },
  rainbow: {
    name: "Rainbow",
    drawHead(cx, cy, half, headSize, dir) {
      const hue = (performance.now() / 10) % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 14;
      ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.6)`;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, headSize, headSize, 5);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, headSize, headSize);
      }
    },
    drawBody(cx, cy, half, bodySize, cr, cg, cb, alpha, t, i) {
      const hue = ((performance.now() / 10) + i * 25) % 360;
      ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${alpha})`;
      ctx.shadowBlur = 5;
      ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.3)`;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - half, cy - half, bodySize, bodySize, 4);
        ctx.fill();
      } else {
        ctx.fillRect(cx - half, cy - half, bodySize, bodySize);
      }
    },
  },
  pixel: {
    name: "Pixel",
    drawHead(cx, cy, half, headSize, dir) {
      ctx.fillStyle = currentTheme.headGrad[0];
      ctx.shadowBlur = 0;
      ctx.fillRect(cx - half, cy - half, headSize, headSize);
      // Pixel border
      ctx.strokeStyle = currentTheme.headGrad[1];
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - half, cy - half, headSize, headSize);
    },
    drawBody(cx, cy, half, bodySize, cr, cg, cb, alpha) {
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.shadowBlur = 0;
      ctx.fillRect(cx - half, cy - half, bodySize, bodySize);
      ctx.strokeStyle = `rgba(${Math.max(0,cr-50)},${Math.max(0,cg-50)},${Math.max(0,cb-50)},${alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - half, cy - half, bodySize, bodySize);
    },
  },
};

let currentSkin = SKINS.classic;

/* ── Achievements ─────────────────────────────────────────── */

const ACHIEVEMENTS = [
  { id: "first_bite",     icon: "\uD83C\uDF4E", title: "First Bite",       desc: "Eat your first food",          check: (s) => s.totalEaten >= 1 },
  { id: "hungry",         icon: "\uD83D\uDD25", title: "Hungry Snake",     desc: "Eat 10 food in one game",      check: (s) => s.eatenThisGame >= 10 },
  { id: "glutton",        icon: "\uD83C\uDF54", title: "Glutton",          desc: "Eat 25 food in one game",      check: (s) => s.eatenThisGame >= 25 },
  { id: "score_10",       icon: "\uD83C\uDFC5", title: "Double Digits",    desc: "Score 10 points",              check: (s) => s.score >= 10 },
  { id: "score_30",       icon: "\uD83C\uDFC6", title: "Thirty Club",      desc: "Score 30 points",              check: (s) => s.score >= 30 },
  { id: "score_50",       icon: "\uD83D\uDC8E", title: "Half Century",     desc: "Score 50 points",              check: (s) => s.score >= 50 },
  { id: "speed_demon",    icon: "\u26A1",       title: "Speed Demon",      desc: "Eat 3 speed foods in one game", check: (s) => s.speedEaten >= 3 },
  { id: "golden_touch",   icon: "\u2B50",       title: "Golden Touch",     desc: "Eat 3 golden foods in one game", check: (s) => s.goldenEaten >= 3 },
  { id: "survivor",       icon: "\uD83D\uDEE1\uFE0F",  title: "Survivor",        desc: "Survive a wall shrink",         check: (s) => s.wallShrinks >= 1 },
  { id: "claustrophobe",  icon: "\uD83E\uDDF1", title: "Claustrophobe",    desc: "Survive 3 wall shrinks",        check: (s) => s.wallShrinks >= 3 },
  { id: "poisoned",       icon: "\u2620\uFE0F",  title: "Toxic Taste",      desc: "Eat a poison food",            check: (s) => s.poisonEaten >= 1 },
  { id: "magnet_lover",   icon: "\uD83E\uDDF2", title: "Magnetic",         desc: "Eat a magnet food",            check: (s) => s.magnetEaten >= 1 },
  { id: "ghost_hunter",   icon: "\uD83D\uDC7B", title: "Ghost Hunter",     desc: "Eat a ghost food",             check: (s) => s.ghostEaten >= 1 },
  { id: "frozen",         icon: "\u2744\uFE0F",  title: "Brain Freeze",     desc: "Eat a freeze food",            check: (s) => s.freezeEaten >= 1 },
  { id: "long_snake",     icon: "\uD83D\uDC0D", title: "Looong Snake",     desc: "Reach 20 segments",            check: (s) => s.maxLength >= 20 },
  { id: "games_10",       icon: "\uD83C\uDFAE", title: "Dedicated Player", desc: "Play 10 games",                check: (s) => s.gamesPlayed >= 10 },
];

let achievementStats = {
  totalEaten: 0,
  eatenThisGame: 0,
  score: 0,
  speedEaten: 0,
  goldenEaten: 0,
  wallShrinks: 0,
  poisonEaten: 0,
  magnetEaten: 0,
  ghostEaten: 0,
  freezeEaten: 0,
  maxLength: 1,
  gamesPlayed: 0,
};

let unlockedAchievements = new Set();
let achievementPopupQueue = [];
let achievementPopupTimer = 0;

function loadAchievements() {
  try {
    const saved = JSON.parse(localStorage.getItem("snakeAchievements") || "{}");
    if (saved.unlocked) unlockedAchievements = new Set(saved.unlocked);
    if (saved.stats) Object.assign(achievementStats, saved.stats);
  } catch (_) { /* ignore */ }
}

function saveAchievements() {
  localStorage.setItem("snakeAchievements", JSON.stringify({
    unlocked: [...unlockedAchievements],
    stats: achievementStats,
  }));
}

function checkAchievements() {
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedAchievements.has(ach.id) && ach.check(achievementStats)) {
      unlockedAchievements.add(ach.id);
      achievementPopupQueue.push(ach);
      saveAchievements();
    }
  }
}

function showAchievementPopup() {
  if (achievementPopupTimer > 0 || achievementPopupQueue.length === 0) return;
  const ach = achievementPopupQueue.shift();
  const popup = document.getElementById("achievementPopup");
  document.getElementById("achievementPopupIcon").textContent = ach.icon;
  document.getElementById("achievementPopupTitle").textContent = ach.title;
  document.getElementById("achievementPopupDesc").textContent = ach.desc;
  popup.classList.add("show");
  achievementPopupTimer = 3;
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => { achievementPopupTimer = 0; }, 500);
  }, 3000);
}

function renderAchievementsList() {
  const list = document.getElementById("achievementsList");
  list.innerHTML = "";
  for (const ach of ACHIEVEMENTS) {
    const item = document.createElement("div");
    item.className = "achievement-item" + (unlockedAchievements.has(ach.id) ? " unlocked" : "");
    item.innerHTML = `<span class="achievement-item__icon">${ach.icon}</span><span>${ach.title}</span>`;
    list.appendChild(item);
  }
}

document.getElementById("achievementsToggle").addEventListener("click", () => {
  const list = document.getElementById("achievementsList");
  list.classList.toggle("open");
  renderAchievementsList();
});

/* ── Tutorial ─────────────────────────────────────────────── */

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Snake!",
    text: "Guide your snake to eat food and grow longer. Don't hit the walls or yourself!",
    visual: "\uD83D\uDC0D",
  },
  {
    title: "Controls",
    text: "Use arrow keys (or WASD) on desktop, swipe or use the D-pad on mobile.",
    visual: "\u2B06\uFE0F\u2B07\uFE0F\u2B05\uFE0F\u27A1\uFE0F",
  },
  {
    title: "Food Types",
    text: "Orange = normal (+1). Gold = bonus (+3, slow-mo). Pink = speed boost. Purple = poison (-1). Cyan = magnet (attracts food). White = ghost (pass through walls). Blue = freeze (slows time).",
    visual: "\uD83C\uDF4E\u2B50\u26A1\u2620\uFE0F\uD83E\uDDF2\uD83D\uDC7B\u2744\uFE0F",
  },
  {
    title: "Closing Walls",
    text: "Every 15 points, the arena shrinks! The walls close in, making it harder to survive.",
    visual: "\uD83E\uDDF1",
  },
  {
    title: "Customise",
    text: "Change colour themes and snake skins using the dropdowns. Earn achievements as you play!",
    visual: "\uD83C\uDFA8",
  },
];

let tutorialStep = 0;
const tutorialOverlay = document.getElementById("tutorialOverlay");

function showTutorial() {
  if (localStorage.getItem("snakeTutorialDone") === "1") return;
  tutorialStep = 0;
  tutorialOverlay.classList.add("active");
  renderTutorialStep();
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutorialStep];
  document.getElementById("tutorialTitle").textContent = step.title;
  document.getElementById("tutorialText").textContent = step.text;
  document.getElementById("tutorialVisual").textContent = step.visual;
  document.getElementById("tutorialBtn").textContent =
    tutorialStep === TUTORIAL_STEPS.length - 1 ? "Start Playing!" : "Next";

  // Dots
  const dotsEl = document.getElementById("tutorialDots");
  dotsEl.innerHTML = "";
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const dot = document.createElement("span");
    dot.className = "tutorial-dot" + (i === tutorialStep ? " active" : "");
    dotsEl.appendChild(dot);
  }
}

document.getElementById("tutorialBtn").addEventListener("click", () => {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    closeTutorial();
  } else {
    renderTutorialStep();
  }
});

document.getElementById("tutorialSkip").addEventListener("click", closeTutorial);

function closeTutorial() {
  tutorialOverlay.classList.remove("active");
  localStorage.setItem("snakeTutorialDone", "1");
}

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
  speedBoostEnd: 0,
  slowMoEnd: 0,
  savedTickInterval: 0,
  dustMotes: [],
  tongueVisible: true,
  tongueTimer: 0,
  tongueWobble: 0,
  undulationTime: 0,
  headEnlargeTimer: 0,
  deathTime: 0,
  deathPos: null,
  deathRingRadius: 0,
  deathRingAlpha: 0,
  crackleParticles: [],
  // New power-up states
  ghostModeEnd: 0,       // timestamp when ghost mode expires
  magnetModeEnd: 0,      // timestamp when magnet mode expires
  freezeModeEnd: 0,      // timestamp when freeze mode expires
  poisonFlash: 0,        // visual flash for poison
};

const snake = {
  segments: [],
  direction: { x: 1, y: 0 },
  directionQueue: [],
  growPending: 0,
  prevPositions: [],
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
  poison:     () => vibrate([80, 40, 80]),
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
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.1);

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
  noise.connect(filter); filter.connect(ng); ng.connect(dest);
  noise.start(t); noise.stop(t + 0.06);
}

function soundGoldenEat(ctx, dest) {
  soundEat(ctx, dest);
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + i * 0.1);
    g.gain.setValueAtTime(0, t);
    g.gain.setValueAtTime(0.18, t + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
    osc.connect(g); g.connect(dest);
    osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.25);
  });
}

function soundSpeedEat(ctx, dest) {
  soundEat(ctx, dest);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t);
  lfo.type = "sine"; lfo.frequency.setValueAtTime(30, t);
  lfoG.gain.setValueAtTime(40, t);
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  lfo.connect(lfoG); lfoG.connect(osc.frequency);
  osc.connect(g); g.connect(dest);
  lfo.start(t); osc.start(t);
  lfo.stop(t + 0.2); osc.stop(t + 0.2);
}

function soundPoison(ctx, dest) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.3);
}

function soundMagnet(ctx, dest) {
  soundEat(ctx, dest);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.35);
}

function soundGhost(ctx, dest) {
  soundEat(ctx, dest);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1000, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.4);
  g.gain.setValueAtTime(0.1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.5);
}

function soundFreeze(ctx, dest) {
  soundEat(ctx, dest);
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(2000, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.3);
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.4);
}

function soundTick(ctx, dest) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, t);
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.025);
}

function soundDeath(ctx, dest) {
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(400, t);
  osc1.frequency.exponentialRampToValueAtTime(80, t + 0.8);
  g1.gain.setValueAtTime(0.2, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  osc1.connect(g1); g1.connect(dest);
  osc1.start(t); osc1.stop(t + 0.9);
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(150, t);
  osc2.frequency.exponentialRampToValueAtTime(40, t + 0.8);
  g2.gain.setValueAtTime(0.18, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
  osc2.connect(g2); g2.connect(dest);
  osc2.start(t); osc2.stop(t + 1.0);
}

function soundWallWarning(ctx, dest) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, t);
  lfo.type = "square"; lfo.frequency.setValueAtTime(10, t);
  lfoG.gain.setValueAtTime(0.12, t);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  lfo.connect(lfoG); lfoG.connect(g.gain);
  osc.connect(g); g.connect(dest);
  lfo.start(t); osc.start(t);
  lfo.stop(t + 0.35); osc.stop(t + 0.35);
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
  osc.type = "sine"; osc.frequency.setValueAtTime(55, t);
  lfo.type = "sine"; lfo.frequency.setValueAtTime(0.3, t);
  lfoG.gain.setValueAtTime(0.015, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.04, t + 0.5);
  lfo.connect(lfoG); lfoG.connect(g.gain);
  osc.connect(g); g.connect(dest);
  lfo.start(t); osc.start(t);
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
  if (state.muted) stopAmbientHum();
  else if (state.phase === "playing") startAmbientHum();
}

/* ── Fullscreen ────────────────────────────────────────────── */

function toggleFullscreen() {
  const el = document.getElementById("gameContainer");
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
  }
}

fullscreenButton.addEventListener("click", toggleFullscreen);

/* ── Theme & Skin Switching ───────────────────────────────── */

function applyTheme(name) {
  currentTheme = THEMES[name] || THEMES.neon;
  document.body.className = name === "neon" ? "" : `theme-${name}`;
  localStorage.setItem("snakeTheme", name);
}

function applySkin(name) {
  currentSkin = SKINS[name] || SKINS.classic;
  localStorage.setItem("snakeSkin", name);
}

themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
skinSelect.addEventListener("change", () => applySkin(skinSelect.value));

function loadPreferences() {
  const theme = localStorage.getItem("snakeTheme") || "neon";
  const skin = localStorage.getItem("snakeSkin") || "classic";
  themeSelect.value = theme;
  skinSelect.value = skin;
  applyTheme(theme);
  applySkin(skin);
}

/* ── Particles ─────────────────────────────────────────────── */

function spawnParticles(cx, cy, count, color, sizeMin, sizeMax, lifeMin, lifeMax, speedMin, speedMax) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const life = lifeMin + Math.random() * (lifeMax - lifeMin);
    state.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life, maxLife: life, color,
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

  // Food type distribution
  const roll = Math.random();
  if (roll < 0.04) food.type = "ghost";
  else if (roll < 0.08) food.type = "freeze";
  else if (roll < 0.13) food.type = "magnet";
  else if (roll < 0.20) food.type = "poison";
  else if (roll < 0.28) food.type = "speed";
  else if (roll < 0.40) food.type = "golden";
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
  state.ghostModeEnd = 0;
  state.magnetModeEnd = 0;
  state.freezeModeEnd = 0;
  state.poisonFlash = 0;

  // Reset per-game achievement stats
  achievementStats.eatenThisGame = 0;
  achievementStats.speedEaten = 0;
  achievementStats.goldenEaten = 0;
  achievementStats.wallShrinks = 0;
  achievementStats.poisonEaten = 0;
  achievementStats.magnetEaten = 0;
  achievementStats.ghostEaten = 0;
  achievementStats.freezeEaten = 0;

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
    achievementStats.gamesPlayed++;
    saveAchievements();
  }
  if (state.phase !== "playing") return;

  const queue = snake.directionQueue;
  const lastDir = queue.length > 0 ? queue[queue.length - 1] : snake.direction;

  if (dir.x === -lastDir.x && dir.y === -lastDir.y) return;
  if (dir.x === lastDir.x && dir.y === lastDir.y) return;

  if (queue.length < 2) {
    queue.push({ x: dir.x, y: dir.y });
    haptics.turn();
    const [bs, be] = [currentTheme.bodyStart, currentTheme.bodyEnd];
    spawnParticles(
      (snake.segments[0].x + 0.5) * CELL,
      (snake.segments[0].y + 0.5) * CELL,
      3, `rgba(${bs[0]},${bs[1]},${bs[2]},0.4)`, 1, 2, 0.15, 0.2, 30, 60
    );
  }
}

function getTickInterval() {
  return Math.max(state.minTickInterval, state.baseTickInterval - (state.score * 2.5));
}

function tick(now) {
  if (snake.directionQueue.length > 0) {
    snake.direction = snake.directionQueue.shift();
  }

  snake.prevPositions = snake.segments.map(s => ({ x: s.x, y: s.y }));

  const head = snake.segments[0];
  let newHead = { x: head.x + snake.direction.x, y: head.y + snake.direction.y };

  // Magnet: attract food toward snake head
  if (now < state.magnetModeEnd) {
    const dx = head.x - food.x;
    const dy = head.y - food.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist > 0 && dist <= 5) {
      food.x += Math.sign(dx);
      food.y += Math.sign(dy);
      // Clamp food to arena
      food.x = Math.max(state.arenaMin, Math.min(state.arenaMax, food.x));
      food.y = Math.max(state.arenaMin, Math.min(state.arenaMax, food.y));
    }
  }

  // Ghost mode: wrap around walls
  const isGhost = now < state.ghostModeEnd;
  if (isGhost) {
    const aSize = state.arenaMax - state.arenaMin + 1;
    if (newHead.x < state.arenaMin) newHead.x = state.arenaMax;
    else if (newHead.x > state.arenaMax) newHead.x = state.arenaMin;
    if (newHead.y < state.arenaMin) newHead.y = state.arenaMax;
    else if (newHead.y > state.arenaMax) newHead.y = state.arenaMin;
  } else {
    // Wall collision
    if (newHead.x < state.arenaMin || newHead.x > state.arenaMax ||
        newHead.y < state.arenaMin || newHead.y > state.arenaMax) {
      die();
      return;
    }
  }

  // Self collision (ghost mode skips this)
  if (!isGhost) {
    const checkLen = snake.growPending > 0 ? snake.segments.length : snake.segments.length - 1;
    for (let i = 0; i < checkLen; i++) {
      if (snake.segments[i].x === newHead.x && snake.segments[i].y === newHead.y) {
        die();
        return;
      }
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

  // Track max length
  if (snake.segments.length > achievementStats.maxLength) {
    achievementStats.maxLength = snake.segments.length;
  }

  // Update speed based on score + power-ups
  let interval = getTickInterval();
  if (now < state.speedBoostEnd) {
    interval = Math.max(40, interval - 30);
  } else if (now < state.slowMoEnd || now < state.freezeModeEnd) {
    interval = interval + 40;
  }
  state.tickInterval = interval;

  playSound(soundTick);
  checkAchievements();
  showAchievementPopup();
}

function eatFood(now) {
  const px = (food.x + 0.5) * CELL;
  const py = (food.y + 0.5) * CELL;

  achievementStats.totalEaten++;
  achievementStats.eatenThisGame++;

  if (food.type === "normal") {
    state.score += 1;
    snake.growPending += 1;
    playSound(soundEat);
    haptics.eat();
    state.eatFlash = 0.15;
    state.eatFlashColor = "255,190,11";
    state.scorePopValue = "+1";
    spawnParticles(px, py, 12, currentTheme.foodNormal.inner, 2, 4, 0.3, 0.6, 60, 150);

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
    achievementStats.goldenEaten++;
    spawnParticles(px, py, 18, "#ffd700", 2, 5, 0.4, 0.7, 80, 180);

  } else if (food.type === "speed") {
    state.score += 1;
    snake.growPending += 1;
    playSound(soundSpeedEat);
    haptics.eatSpeed();
    state.eatFlash = 0.2;
    state.eatFlashColor = "255,0,110";
    state.scorePopValue = "+1 SPEED!";
    state.speedBoostEnd = now + 5000;
    state.slowMoEnd = 0;
    achievementStats.speedEaten++;
    spawnParticles(px, py, 12, currentTheme.foodSpeed.inner, 2, 4, 0.3, 0.6, 60, 150);

  } else if (food.type === "poison") {
    state.score = Math.max(0, state.score - 1);
    playSound(soundPoison);
    haptics.poison();
    state.eatFlash = 0.2;
    state.eatFlashColor = "139,0,255";
    state.scorePopValue = "-1 POISON!";
    state.poisonFlash = 0.5;
    achievementStats.poisonEaten++;
    // Shrink snake if possible
    if (snake.segments.length > 2) {
      snake.segments.pop();
    }
    spawnParticles(px, py, 15, currentTheme.foodPoison.inner, 2, 5, 0.3, 0.7, 50, 130);

  } else if (food.type === "magnet") {
    state.score += 2;
    snake.growPending += 1;
    playSound(soundMagnet);
    haptics.eat();
    state.eatFlash = 0.2;
    state.eatFlashColor = "0,229,255";
    state.scorePopValue = "+2 MAGNET!";
    state.magnetModeEnd = now + 8000;
    achievementStats.magnetEaten++;
    spawnParticles(px, py, 14, currentTheme.foodMagnet.inner, 2, 4, 0.3, 0.6, 60, 150);

  } else if (food.type === "ghost") {
    state.score += 2;
    snake.growPending += 1;
    playSound(soundGhost);
    haptics.eat();
    state.eatFlash = 0.2;
    state.eatFlashColor = "224,224,224";
    state.scorePopValue = "+2 GHOST!";
    state.ghostModeEnd = now + 6000;
    achievementStats.ghostEaten++;
    spawnParticles(px, py, 14, currentTheme.foodGhost.inner, 2, 4, 0.4, 0.7, 50, 130);

  } else if (food.type === "freeze") {
    state.score += 1;
    snake.growPending += 1;
    playSound(soundFreeze);
    haptics.eat();
    state.eatFlash = 0.2;
    state.eatFlashColor = "128,216,255";
    state.scorePopValue = "+1 FREEZE!";
    state.freezeModeEnd = now + 5000;
    achievementStats.freezeEaten++;
    spawnParticles(px, py, 16, currentTheme.foodFreeze.inner, 2, 5, 0.4, 0.7, 40, 120);
  }

  state.scorePop = 1.0;
  state.headEnlargeTimer = 0.2;
  scoreLabel.textContent = state.score;
  achievementStats.score = Math.max(achievementStats.score, state.score);

  // Arena shrink check
  if (state.score > 0 && state.score % 15 === 0 && state.score !== state.lastShrinkScore) {
    if (state.arenaMin < 6) {
      state.arenaMin += 1;
      state.arenaMax -= 1;
      state.arenaFlash = 1.0;
      state.lastShrinkScore = state.score;
      achievementStats.wallShrinks++;
      spawnCrackleParticles();
      playSound(soundWallWarning);
      haptics.wallShrink();

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

  const head = snake.segments[0];
  state.deathPos = { x: (head.x + 0.5) * CELL, y: (head.y + 0.5) * CELL };
  state.deathTime = performance.now();
  state.deathRingRadius = 0;
  state.deathRingAlpha = 1.0;

  const [bs, be] = [currentTheme.bodyStart, currentTheme.bodyEnd];
  for (let i = 0; i < snake.segments.length; i++) {
    const seg = snake.segments[i];
    const t = i / Math.max(1, snake.segments.length - 1);
    const [r, g, b] = lerpColor(bs[0], bs[1], bs[2], be[0], be[1], be[2], t);
    spawnParticles(
      (seg.x + 0.5) * CELL, (seg.y + 0.5) * CELL,
      3, `rgb(${r},${g},${b})`, 3, 5, 0.5, 1.0, 40, 120
    );
  }

  if (state.score > state.best) {
    state.best = state.score;
    bestScoreLabel.textContent = state.best;
    localStorage.setItem("snakeBest", String(state.best));
  }

  checkAchievements();
  showAchievementPopup();
  saveAchievements();
}

/* ── Drawing ───────────────────────────────────────────────── */

function drawBackground() {
  ctx.fillStyle = currentTheme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const vignetteGrad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.25,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.75
  );
  vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
  vignetteGrad.addColorStop(1, currentTheme.vignetteColor);
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.arenaMin > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    const amin = state.arenaMin * CELL;
    const amax = (state.arenaMax + 1) * CELL;
    ctx.fillRect(0, 0, canvas.width, amin);
    ctx.fillRect(0, amax, canvas.width, canvas.height - amax);
    ctx.fillRect(0, amin, amin, amax - amin);
    ctx.fillRect(amax, amin, canvas.width - amax, amax - amin);
  }

  ctx.strokeStyle = currentTheme.gridColor;
  ctx.lineWidth = 1;
  const minPx = state.arenaMin * CELL;
  const maxPx = (state.arenaMax + 1) * CELL;
  for (let i = state.arenaMin; i <= state.arenaMax + 1; i++) {
    const p = i * CELL;
    ctx.beginPath(); ctx.moveTo(p, minPx); ctx.lineTo(p, maxPx); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(minPx, p); ctx.lineTo(maxPx, p); ctx.stroke();
  }

  for (const m of state.dustMotes) {
    ctx.save();
    ctx.globalAlpha = m.alpha;
    ctx.shadowBlur = 4;
    ctx.shadowColor = currentTheme.dustGlow;
    ctx.fillStyle = currentTheme.dustColor;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ghost mode: subtle screen tint
  if (performance.now() < state.ghostModeEnd) {
    ctx.fillStyle = "rgba(200,200,255,0.03)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Poison flash
  if (state.poisonFlash > 0) {
    ctx.fillStyle = `rgba(139,0,255,${state.poisonFlash * 0.15})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawArenaWalls() {
  const amin = state.arenaMin * CELL;
  const amax = (state.arenaMax + 1) * CELL;
  const size = amax - amin;

  const wc = currentTheme.wallColor;
  let r = wc[0], g = wc[1], b = wc[2], a = 0.3;
  if (state.arenaFlash > 0) {
    r = Math.round(lerp(wc[0], 255, state.arenaFlash));
    g = Math.round(lerp(wc[1], 68, state.arenaFlash));
    b = Math.round(lerp(wc[2], 68, state.arenaFlash));
    a = lerp(0.3, 0.8, state.arenaFlash);
  }

  ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(amin, amin, size, size);

  if (state.arenaMin >= 4) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = currentTheme.dangerGlow;
    ctx.strokeStyle = "rgba(255,68,68,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(amin, amin, size, size);
    ctx.restore();
  }

  if (state.arenaFlash > 0) drawCrackleParticles();
}

function spawnCrackleParticles() {
  const amin = state.arenaMin * CELL;
  const amax = (state.arenaMax + 1) * CELL;
  state.crackleParticles = [];
  for (let i = 0; i < 20; i++) {
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
      life, maxLife: life,
      size: 1.5 + Math.random() * 2,
    });
  }
}

function updateCrackleParticles(dt) {
  for (let i = state.crackleParticles.length - 1; i >= 0; i--) {
    const p = state.crackleParticles[i];
    p.life -= dt;
    p.ox = p.x + (Math.random() - 0.5) * 8;
    p.oy = p.y + (Math.random() - 0.5) * 8;
    if (p.life <= 0) state.crackleParticles.splice(i, 1);
  }
}

function drawCrackleParticles() {
  for (const p of state.crackleParticles) {
    const frac = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = frac;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(150,255,255,0.8)";
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
  const isGhost = performance.now() < state.ghostModeEnd;

  const positions = [];
  for (let i = 0; i < segs.length; i++) {
    const cur = segs[i];
    const prv = prev[i] || cur;
    let rx = lerp(prv.x, cur.x, movePhase);
    let ry = lerp(prv.y, cur.y, movePhase);
    let cx = (rx + 0.5) * CELL;
    let cy = (ry + 0.5) * CELL;

    if (i > 0 && !isDead) {
      const dir = snake.direction;
      const wave = Math.sin(state.undulationTime + i * 1.2) * 2.0;
      cx += -dir.y * wave;
      cy += dir.x * wave;
    }

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

  // Ghost mode transparency
  if (isGhost) {
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 200) * 0.15;
  }

  const [bs, be] = [currentTheme.bodyStart, currentTheme.bodyEnd];

  // Connecting joints
  for (let i = segs.length - 1; i >= 1; i--) {
    const p1 = positions[i];
    const p2 = positions[i - 1];
    const t = segs.length > 1 ? i / (segs.length - 1) : 0;
    const [cr, cg, cb] = lerpColor(bs[0], bs[1], bs[2], be[0], be[1], be[2], t);
    const alpha = Math.max(0.3, 1 - t * 0.7);
    ctx.save();
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.7})`;
    ctx.beginPath();
    ctx.arc((p1.cx + p2.cx) / 2, (p1.cy + p2.cy) / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Segments
  for (let i = segs.length - 1; i >= 0; i--) {
    const { cx, cy } = positions[i];
    const t = segs.length > 1 ? i / (segs.length - 1) : 0;

    if (isDead && (cx < -50 || cx > canvas.width + 50 || cy < -50 || cy > canvas.height + 50)) continue;

    if (i === 0) {
      const enlargeScale = state.headEnlargeTimer > 0 ? 1 + state.headEnlargeTimer * 2.5 : 1;
      const headSize = Math.round(18 * enlargeScale);
      const half = headSize / 2;

      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = currentTheme.headGlow;

      currentSkin.drawHead(cx, cy, half, headSize, snake.direction);
      ctx.restore();

      // Eyes
      const dir = snake.direction;
      let e1x, e1y, e2x, e2y;
      if (dir.x === 1) { e1x = 4; e1y = -4; e2x = 4; e2y = 4; }
      else if (dir.x === -1) { e1x = -4; e1y = -4; e2x = -4; e2y = 4; }
      else if (dir.y === -1) { e1x = -4; e1y = -4; e2x = 4; e2y = -4; }
      else { e1x = -4; e1y = 4; e2x = 4; e2y = 4; }

      ctx.fillStyle = currentTheme.eyeColor;
      ctx.beginPath(); ctx.arc(cx + e1x, cy + e1y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + e2x, cy + e2y, 2.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = currentTheme.pupilColor;
      ctx.beginPath(); ctx.arc(cx + e1x + dir.x * 0.8, cy + e1y + dir.y * 0.8, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + e2x + dir.x * 0.8, cy + e2y + dir.y * 0.8, 1.5, 0, Math.PI * 2); ctx.fill();

      // Tongue
      if (state.tongueVisible && !isDead) {
        const tongueLen = 8 + Math.random() * 2;
        const forkLen = 4;
        const forkAngle = 0.35;
        const baseTx = cx + dir.x * half;
        const baseTy = cy + dir.y * half;
        const tongueAngle = Math.atan2(dir.y, dir.x) + state.tongueWobble;
        const tipX = baseTx + Math.cos(tongueAngle) * tongueLen;
        const tipY = baseTy + Math.sin(tongueAngle) * tongueLen;

        ctx.save();
        ctx.strokeStyle = currentTheme.tongueColor;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(baseTx, baseTy); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + Math.cos(tongueAngle + forkAngle) * forkLen, tipY + Math.sin(tongueAngle + forkAngle) * forkLen);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + Math.cos(tongueAngle - forkAngle) * forkLen, tipY + Math.sin(tongueAngle - forkAngle) * forkLen);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      const bodySize = 16;
      const half = bodySize / 2;
      const alpha = Math.max(0.3, 1 - t * 0.7);
      const [cr, cg, cb] = lerpColor(bs[0], bs[1], bs[2], be[0], be[1], be[2], t);

      ctx.save();
      const glowAmt = Math.max(0, 8 * (1 - t));
      if (glowAmt > 0) {
        ctx.shadowBlur = glowAmt;
        ctx.shadowColor = `rgba(${cr},${cg},${cb},0.4)`;
      }

      currentSkin.drawBody(cx, cy, half, bodySize, cr, cg, cb, alpha, t, i);
      ctx.restore();
    }
  }

  if (isGhost) ctx.restore();
}

function drawFood(dt) {
  food.pulsePhase += dt * 4;
  food.spawnAnim = Math.min(1, food.spawnAnim + dt * 5);
  const ease = 1 - Math.pow(1 - food.spawnAnim, 3);

  const cx = (food.x + 0.5) * CELL;
  const cy = (food.y + 0.5) * CELL;

  ctx.save();

  const type = food.type;
  const themeFood = currentTheme["food" + type.charAt(0).toUpperCase() + type.slice(1)] || currentTheme.foodNormal;

  if (type === "normal") {
    const pulse = 8 + Math.sin(food.pulsePhase) * 4;
    const r = 7 * ease;
    ctx.translate(cx, cy); ctx.rotate(food.pulsePhase * 0.5); ctx.translate(-cx, -cy);
    ctx.shadowBlur = pulse;
    ctx.shadowColor = themeFood.glow;
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, themeFood.inner); grad.addColorStop(1, themeFood.outer);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Sparkle
    const sa = food.pulsePhase * 2.5;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath(); ctx.arc(cx + Math.cos(sa) * r * 0.4, cy + Math.sin(sa) * r * 0.4, 1.5, 0, Math.PI * 2); ctx.fill();

  } else if (type === "golden") {
    const pulse = 12 + Math.sin(food.pulsePhase) * 6;
    const r = 8 * ease;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = themeFood.glow;
    ctx.fillStyle = themeFood.color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const angle = food.pulsePhase * 1.5 + (i * Math.PI * 2 / 5);
      ctx.fillStyle = "rgba(255,230,100,0.7)";
      ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * 13, cy + Math.sin(angle) * 13, 2.2, 0, Math.PI * 2); ctx.fill();
    }

  } else if (type === "speed") {
    const pulse = 8 + Math.sin(food.pulsePhase * 8) * 5;
    const scaleOsc = 0.85 + Math.sin(food.pulsePhase * 8) * 0.15;
    const r = 7 * ease * scaleOsc;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = themeFood.glow;
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, themeFood.inner); grad.addColorStop(1, themeFood.outer);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Motion streaks
    ctx.strokeStyle = themeFood.inner.replace(")", ",0.35)").replace("rgb(", "rgba(") || "rgba(255,0,110,0.35)";
    ctx.lineWidth = 1.5; ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const a = Math.PI + (i - 1) * 0.4 + food.pulsePhase * 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1));
      ctx.lineTo(cx + Math.cos(a) * (r + 8 + Math.sin(food.pulsePhase * 6 + i) * 3),
                 cy + Math.sin(a) * (r + 8 + Math.sin(food.pulsePhase * 6 + i) * 3));
      ctx.stroke();
    }

  } else if (type === "poison") {
    const pulse = 10 + Math.sin(food.pulsePhase * 3) * 5;
    const r = 7 * ease;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = themeFood.glow;
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, themeFood.inner); grad.addColorStop(1, themeFood.outer);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Skull crossbones hint
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `${Math.round(r * 1.2)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("\u2620", cx, cy);

  } else if (type === "magnet") {
    const pulse = 10 + Math.sin(food.pulsePhase * 4) * 5;
    const r = 7 * ease;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = themeFood.glow;
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, themeFood.inner); grad.addColorStop(1, themeFood.outer);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Magnetic field lines
    ctx.strokeStyle = `${themeFood.inner}80`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = food.pulsePhase * 2 + i * Math.PI / 2;
      const outerR = 12 + Math.sin(food.pulsePhase * 3 + i) * 3;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2, outerR, a - 0.5, a + 0.5);
      ctx.stroke();
    }

  } else if (type === "ghost") {
    const pulse = 8 + Math.sin(food.pulsePhase * 2) * 4;
    const r = 7 * ease;
    const ghostAlpha = 0.5 + Math.sin(food.pulsePhase * 2) * 0.3;
    ctx.globalAlpha = ghostAlpha;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = themeFood.glow;
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, themeFood.inner); grad.addColorStop(1, themeFood.outer);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = ghostAlpha * 0.8;
    ctx.fillStyle = "rgba(100,100,150,0.5)";
    ctx.font = `${Math.round(r * 1.2)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("\uD83D\uDC7B", cx, cy);

  } else if (type === "freeze") {
    const pulse = 10 + Math.sin(food.pulsePhase * 3) * 5;
    const r = 7 * ease;
    ctx.shadowBlur = pulse;
    ctx.shadowColor = themeFood.glow;
    const grad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, r);
    grad.addColorStop(0, themeFood.inner); grad.addColorStop(1, themeFood.outer);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Snowflake hint
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `${Math.round(r * 1.1)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("\u2744", cx, cy);
  }

  ctx.restore();
}

function drawParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    const frac = p.life / p.maxLife;
    const r = p.size * frac;
    ctx.save();
    ctx.globalAlpha = frac;
    ctx.shadowBlur = r * 2;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
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
  const wc = currentTheme.wallColor;
  ctx.shadowColor = `rgba(${wc[0]},${wc[1]},${wc[2]},0.6)`;
  ctx.fillStyle = currentTheme.scoreColor;
  ctx.fillText(state.scorePopValue, 0, 0);
  ctx.restore();
  state.scorePop *= 0.90;
  if (state.scorePop < 0.02) state.scorePop = 0;
}

function drawDeathRing() {
  if (state.deathRingAlpha <= 0 || !state.deathPos) return;
  const wc = currentTheme.wallColor;
  ctx.save();
  ctx.globalAlpha = state.deathRingAlpha;
  ctx.strokeStyle = `rgb(${wc[0]},${wc[1]},${wc[2]})`;
  ctx.shadowBlur = 15;
  ctx.shadowColor = `rgba(${wc[0]},${wc[1]},${wc[2]},0.8)`;
  ctx.lineWidth = 3 * state.deathRingAlpha;
  ctx.beginPath(); ctx.arc(state.deathPos.x, state.deathPos.y, state.deathRingRadius, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = state.deathRingAlpha * 0.5;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * state.deathRingAlpha;
  ctx.beginPath(); ctx.arc(state.deathPos.x, state.deathPos.y, state.deathRingRadius * 0.7, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawEatFlash() {
  if (state.eatFlash <= 0) return;
  ctx.fillStyle = `rgba(${state.eatFlashColor},${state.eatFlash})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  state.eatFlash *= 0.85;
  if (state.eatFlash < 0.01) state.eatFlash = 0;
}

function drawPowerUpIndicators() {
  const now = performance.now();
  const indicators = [];
  if (now < state.speedBoostEnd) indicators.push({ label: "SPEED", color: currentTheme.foodSpeed.inner, remaining: (state.speedBoostEnd - now) / 5000 });
  if (now < state.slowMoEnd) indicators.push({ label: "SLOW-MO", color: currentTheme.foodGolden.color, remaining: (state.slowMoEnd - now) / 3000 });
  if (now < state.ghostModeEnd) indicators.push({ label: "GHOST", color: currentTheme.foodGhost.inner, remaining: (state.ghostModeEnd - now) / 6000 });
  if (now < state.magnetModeEnd) indicators.push({ label: "MAGNET", color: currentTheme.foodMagnet.inner, remaining: (state.magnetModeEnd - now) / 8000 });
  if (now < state.freezeModeEnd) indicators.push({ label: "FREEZE", color: currentTheme.foodFreeze.inner, remaining: (state.freezeModeEnd - now) / 5000 });

  for (let i = 0; i < indicators.length; i++) {
    const ind = indicators[i];
    const y = 14 + i * 16;
    // Bar background
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(4, y - 5, 70, 12);
    // Bar fill
    ctx.fillStyle = ind.color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(4, y - 5, 70 * Math.max(0, ind.remaining), 12);
    ctx.globalAlpha = 1;
    // Label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px 'Trebuchet MS'";
    ctx.textAlign = "left";
    ctx.fillText(ind.label, 7, y + 3);
  }
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
  ctx.fillStyle = currentTheme.textColor;
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
  const dt = Math.min(rawDelta, 33) / 1000;

  if (state.arenaFlash > 0) {
    state.arenaFlash *= 0.94;
    if (state.arenaFlash < 0.01) state.arenaFlash = 0;
  }

  if (state.shakeTimer > 0) {
    state.shakeTimer--;
    state.shakeIntensity *= 0.82;
  }

  if (state.poisonFlash > 0) {
    state.poisonFlash -= dt * 2;
    if (state.poisonFlash < 0) state.poisonFlash = 0;
  }

  updateDustMotes(dt);
  state.undulationTime += rawDelta * 0.004;
  if (state.headEnlargeTimer > 0) state.headEnlargeTimer = Math.max(0, state.headEnlargeTimer - dt);

  state.tongueTimer += rawDelta;
  if (state.tongueTimer >= 300) {
    state.tongueTimer -= 300;
    state.tongueVisible = !state.tongueVisible;
    state.tongueWobble = (Math.random() - 0.5) * 0.3;
  }

  if (state.crackleParticles.length > 0) updateCrackleParticles(dt);

  if (state.deathRingAlpha > 0 && state.deathPos) {
    state.deathRingRadius += dt * 200;
    state.deathRingAlpha -= dt * 1.5;
    if (state.deathRingAlpha < 0) state.deathRingAlpha = 0;
  }

  if (state.phase === "playing") {
    state.tickAccumulator += rawDelta;
    while (state.tickAccumulator >= state.tickInterval) {
      state.tickAccumulator -= state.tickInterval;
      tick(timestamp);
      if (state.phase !== "playing") break;
    }
  }

  const movePhase = state.phase === "playing"
    ? Math.min(1, state.tickAccumulator / state.tickInterval)
    : 1;

  ctx.save();
  if (state.shakeTimer > 0) {
    ctx.translate((Math.random() - 0.5) * state.shakeIntensity, (Math.random() - 0.5) * state.shakeIntensity);
  }

  drawBackground();
  drawArenaWalls();
  drawFood(dt);
  drawSnake(movePhase);
  drawParticles(dt);
  drawDeathRing();
  drawScorePop();
  drawEatFlash();
  drawPowerUpIndicators();

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
  getAudio();
  const dir = keyMap[e.code];
  if (dir) {
    e.preventDefault();
    if (state.phase === "dead") resetGame();
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

/* D-Pad Buttons */
const dpadDirMap = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

document.querySelectorAll(".dpad__btn[data-dir]").forEach(btn => {
  function handleDpad(e) {
    e.preventDefault();
    getAudio();
    const dir = dpadDirMap[btn.dataset.dir];
    if (!dir) return;
    if (state.phase === "dead") resetGame();
    queueDirection(dir);
  }
  btn.addEventListener("pointerdown", handleDpad);
  // Allow holding and sliding to another button
  btn.addEventListener("pointerenter", (e) => {
    if (e.buttons > 0) handleDpad(e);
  });
});

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
loadPreferences();
loadAchievements();
renderAchievementsList();
resetGame();
requestAnimationFrame(gameLoop);

// Show tutorial on first visit
showTutorial();

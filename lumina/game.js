/* ============================================================
   LUMINA — Deep Radiance
   Themes · Skins · Achievements · Tutorial · New Pickups
   ============================================================ */

(() => {
  "use strict";

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
    W: 480, H: 720,
    PLAYER_SPEED: 220, GRAVITY: 55, PULSE_FORCE: -130, PULSE_COOLDOWN: 1.0, PLAYER_R: 13,
    BASE_DESCENT: 80, MAX_DESCENT: 310, DESCENT_SCALE: 0.85,
    LIGHT_MAX: 175, LIGHT_MIN: 48, LIGHT_DRAIN: 3.2, LIGHT_DRAIN_SCALE: 0.018, LIGHT_RESTORE: 25,
    CAVE_BASE_W: 360, CAVE_MIN_W: 175, CAVE_NARROW: 0.5,
    SHARD_INTERVAL: 120, SHARD_SPREAD_SCALE: 0.4,
    SPIKE_INTERVAL: 170, SPIKE_TIGHTEN_SCALE: 0.6,
    SHADOW_INTERVAL: 380, SHADOW_TIGHTEN_SCALE: 1.2,
    STALACTITE_INTERVAL: 450, STALACTITE_START_SCORE: 8,
    ZONE_LEN: 40, ZONE_LERP: 10,
  };

  // ── Depth Zone Palettes ───────────────────────────────────
  const ZONE_SETS = {
    default: [
      { name: "Sapphire Grotto",  crystal: [77,201,246],  ambient: [26,58,92],   wall: [42,74,106],  bg: [6,12,30] },
      { name: "Amethyst Depths",  crystal: [180,77,255],  ambient: [58,26,92],   wall: [74,42,106],  bg: [14,6,30] },
      { name: "Emerald Abyss",    crystal: [77,255,136],  ambient: [26,92,58],   wall: [42,106,74],  bg: [6,30,14] },
      { name: "Molten Core",      crystal: [255,136,68],  ambient: [92,58,26],   wall: [106,74,42],  bg: [30,14,6] },
      { name: "Void Heart",       crystal: [255,77,106],  ambient: [92,26,42],   wall: [106,42,58],  bg: [30,6,12] },
    ],
    inferno: [
      { name: "Ember Cavern",     crystal: [255,120,40],  ambient: [80,30,10],   wall: [100,50,20],  bg: [25,8,4] },
      { name: "Lava Flow",        crystal: [255,80,20],   ambient: [90,25,5],    wall: [110,40,15],  bg: [30,10,4] },
      { name: "Magma Chamber",    crystal: [255,50,30],   ambient: [100,20,10],  wall: [120,35,20],  bg: [35,8,6] },
      { name: "Core Furnace",     crystal: [255,180,40],  ambient: [85,50,10],   wall: [95,60,20],   bg: [28,15,5] },
      { name: "Solar Heart",      crystal: [255,220,80],  ambient: [90,70,15],   wall: [100,80,25],  bg: [30,20,5] },
    ],
    arctic: [
      { name: "Frost Tunnel",     crystal: [150,220,255], ambient: [30,50,80],   wall: [50,70,100],  bg: [6,10,20] },
      { name: "Ice Cavern",       crystal: [100,200,255], ambient: [25,45,85],   wall: [45,65,105],  bg: [5,8,22] },
      { name: "Glacier Deep",     crystal: [80,180,240],  ambient: [20,40,90],   wall: [40,60,110],  bg: [4,6,25] },
      { name: "Frozen Abyss",     crystal: [120,230,255], ambient: [35,55,95],   wall: [55,75,115],  bg: [8,12,28] },
      { name: "Absolute Zero",    crystal: [200,240,255], ambient: [50,70,100],  wall: [70,90,120],  bg: [10,15,30] },
    ],
    toxic: [
      { name: "Spore Hollow",     crystal: [120,255,60],  ambient: [30,80,20],   wall: [50,100,30],  bg: [8,25,6] },
      { name: "Acid Pools",       crystal: [180,255,30],  ambient: [50,90,10],   wall: [70,110,20],  bg: [12,30,4] },
      { name: "Blight Depths",    crystal: [80,220,80],   ambient: [25,70,25],   wall: [40,90,40],   bg: [6,22,6] },
      { name: "Fungal Core",      crystal: [160,255,100], ambient: [45,85,30],   wall: [65,105,45],  bg: [10,28,8] },
      { name: "Mutation Heart",   crystal: [200,255,50],  ambient: [60,95,15],   wall: [80,115,30],  bg: [15,32,5] },
    ],
    void: [
      { name: "Shadow Gate",      crystal: [180,120,255], ambient: [40,20,70],   wall: [60,30,90],   bg: [10,4,22] },
      { name: "Dark Rift",        crystal: [140,80,220],  ambient: [30,15,60],   wall: [50,25,80],   bg: [8,3,18] },
      { name: "Null Space",       crystal: [200,150,255], ambient: [50,30,80],   wall: [70,40,100],  bg: [12,6,25] },
      { name: "Entropy Wells",    crystal: [160,100,240], ambient: [35,20,65],   wall: [55,30,85],   bg: [9,4,20] },
      { name: "Oblivion Core",    crystal: [220,180,255], ambient: [60,40,90],   wall: [80,50,110],  bg: [14,8,28] },
    ],
  };

  let ZONES = ZONE_SETS.default;
  let currentThemeName = "default";

  // ── Player Skins ──────────────────────────────────────────
  const PLAYER_SKINS = {
    classic: {
      name: "Classic",
      draw(c, pal, pulseScale) {
        const og = c.createRadialGradient(0, 0, 0, 0, 0, 30);
        og.addColorStop(0, rgb(pal.crystal, 0.35));
        og.addColorStop(0.6, rgb(pal.crystal, 0.1));
        og.addColorStop(1, rgb(pal.crystal, 0));
        c.fillStyle = og; c.fillRect(-30, -30, 60, 60);
        const mg = c.createRadialGradient(0, 0, 0, 0, 0, 18);
        mg.addColorStop(0, rgb(pal.crystal, 0.6));
        mg.addColorStop(1, rgb(pal.crystal, 0));
        c.fillStyle = mg; c.fillRect(-18, -18, 36, 36);
        c.beginPath();
        c.moveTo(0, -14); c.lineTo(5, -3); c.lineTo(12, 0); c.lineTo(5, 3);
        c.lineTo(0, 14); c.lineTo(-5, 3); c.lineTo(-12, 0); c.lineTo(-5, -3);
        c.closePath();
        const pg = c.createLinearGradient(-12, -14, 12, 14);
        pg.addColorStop(0, rgb([255,255,255], 0.95));
        pg.addColorStop(0.4, rgb(pal.crystal, 0.85));
        pg.addColorStop(1, rgb(pal.crystal, 0.5));
        c.fillStyle = pg; c.fill();
        c.strokeStyle = rgb([255,255,255], 0.5); c.lineWidth = 1; c.stroke();
        c.strokeStyle = rgb([255,255,255], 0.25); c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 14); c.moveTo(-12, 0); c.lineTo(12, 0); c.stroke();
        const cg = c.createRadialGradient(0, 0, 0, 0, 0, 5);
        cg.addColorStop(0, "rgba(255,255,255,0.95)"); cg.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = cg; c.fillRect(-5, -5, 10, 10);
      }
    },
    flame: {
      name: "Flame",
      draw(c, pal, pulseScale) {
        const t = performance.now() / 1000;
        const og = c.createRadialGradient(0, 0, 0, 0, 0, 30);
        og.addColorStop(0, "rgba(255,100,20,0.4)"); og.addColorStop(1, "rgba(255,50,0,0)");
        c.fillStyle = og; c.fillRect(-30, -30, 60, 60);
        // Flame shape - teardrop
        c.beginPath();
        c.moveTo(0, -16); c.bezierCurveTo(10, -8, 14, 2, 8, 12);
        c.bezierCurveTo(4, 18, -4, 18, -8, 12);
        c.bezierCurveTo(-14, 2, -10, -8, 0, -16);
        c.closePath();
        const fg = c.createLinearGradient(0, -16, 0, 18);
        fg.addColorStop(0, "#fff8e0"); fg.addColorStop(0.3, "#ffaa20");
        fg.addColorStop(0.7, "#ff4400"); fg.addColorStop(1, "#aa0000");
        c.fillStyle = fg; c.fill();
        c.shadowBlur = 15; c.shadowColor = "rgba(255,100,0,0.7)";
        c.fill(); c.shadowBlur = 0;
        // Flickering inner flame
        const flicker = Math.sin(t * 12) * 2;
        c.beginPath();
        c.moveTo(0, -10 + flicker); c.bezierCurveTo(4, -4, 6, 2, 3, 8);
        c.bezierCurveTo(1, 12, -1, 12, -3, 8);
        c.bezierCurveTo(-6, 2, -4, -4, 0, -10 + flicker);
        c.closePath();
        c.fillStyle = "rgba(255,255,200,0.7)"; c.fill();
      }
    },
    frost: {
      name: "Frost",
      draw(c, pal, pulseScale) {
        const og = c.createRadialGradient(0, 0, 0, 0, 0, 28);
        og.addColorStop(0, "rgba(150,220,255,0.4)"); og.addColorStop(1, "rgba(100,200,255,0)");
        c.fillStyle = og; c.fillRect(-28, -28, 56, 56);
        // Hexagonal snowflake shape
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const outerR = 14, innerR = 7;
          const ax = Math.cos(a) * outerR, ay = Math.sin(a) * outerR;
          const midA = a + Math.PI / 6;
          const mx = Math.cos(midA) * innerR, my = Math.sin(midA) * innerR;
          if (i === 0) c.moveTo(ax, ay); else c.lineTo(ax, ay);
          c.lineTo(mx, my);
        }
        c.closePath();
        const fg = c.createLinearGradient(-14, -14, 14, 14);
        fg.addColorStop(0, "rgba(220,240,255,0.95)"); fg.addColorStop(1, "rgba(100,180,255,0.7)");
        c.fillStyle = fg; c.fill();
        c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 1; c.stroke();
        c.shadowBlur = 10; c.shadowColor = "rgba(100,200,255,0.5)"; c.fill(); c.shadowBlur = 0;
        // Center sparkle
        c.fillStyle = "rgba(255,255,255,0.9)";
        c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
      }
    },
    prism: {
      name: "Prism",
      draw(c, pal, pulseScale) {
        const t = performance.now() / 1000;
        const hue = (t * 60) % 360;
        const og = c.createRadialGradient(0, 0, 0, 0, 0, 28);
        og.addColorStop(0, `hsla(${hue},100%,70%,0.4)`); og.addColorStop(1, `hsla(${hue},100%,50%,0)`);
        c.fillStyle = og; c.fillRect(-28, -28, 56, 56);
        // Triangle prism
        c.beginPath();
        c.moveTo(0, -15); c.lineTo(13, 10); c.lineTo(-13, 10); c.closePath();
        const pg = c.createLinearGradient(-13, -15, 13, 10);
        pg.addColorStop(0, `hsla(${hue},100%,80%,0.9)`);
        pg.addColorStop(0.5, `hsla(${(hue+120)%360},100%,60%,0.8)`);
        pg.addColorStop(1, `hsla(${(hue+240)%360},100%,50%,0.7)`);
        c.fillStyle = pg; c.fill();
        c.strokeStyle = `hsla(${hue},100%,90%,0.6)`; c.lineWidth = 1.5; c.stroke();
        // Inner refraction lines
        c.strokeStyle = "rgba(255,255,255,0.3)"; c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(0, -15); c.lineTo(0, 10); c.stroke();
        c.beginPath(); c.moveTo(-8, 2); c.lineTo(8, 2); c.stroke();
      }
    },
    shadow: {
      name: "Shadow",
      draw(c, pal, pulseScale) {
        const t = performance.now() / 1000;
        const og = c.createRadialGradient(0, 0, 0, 0, 0, 30);
        og.addColorStop(0, "rgba(80,0,120,0.5)"); og.addColorStop(1, "rgba(30,0,60,0)");
        c.fillStyle = og; c.fillRect(-30, -30, 60, 60);
        // Smoky amorphous shape
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          const wobble = Math.sin(t * 3 + i * 1.5) * 3;
          const r = 12 + wobble;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
        const sg = c.createRadialGradient(0, 0, 0, 0, 0, 15);
        sg.addColorStop(0, "rgba(180,100,255,0.8)"); sg.addColorStop(0.5, "rgba(80,0,150,0.6)");
        sg.addColorStop(1, "rgba(20,0,40,0.3)");
        c.fillStyle = sg; c.fill();
        // Eyes
        c.fillStyle = "rgba(255,100,255,0.9)";
        c.beginPath(); c.arc(-4, -2, 2, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(4, -2, 2, 0, Math.PI * 2); c.fill();
      }
    },
  };

  let currentSkinName = "classic";
  let currentSkin = PLAYER_SKINS.classic;

  // ── Achievements ──────────────────────────────────────────
  const ACHIEVEMENTS = [
    { id: "first_shard",    icon: "\uD83D\uDC8E", title: "First Light",       desc: "Collect your first shard",         check: s => s.totalShards >= 1 },
    { id: "shards_25",      icon: "\u2728",       title: "Shard Collector",   desc: "Collect 25 shards in one game",    check: s => s.shardsThisGame >= 25 },
    { id: "shards_50",      icon: "\uD83C\uDF1F", title: "Crystal Hoarder",   desc: "Collect 50 shards in one game",    check: s => s.shardsThisGame >= 50 },
    { id: "depth_10",       icon: "\uD83C\uDFC5", title: "Deep Diver",        desc: "Reach depth 10",                   check: s => s.bestScore >= 10 },
    { id: "depth_30",       icon: "\uD83C\uDFC6", title: "Abyssal Explorer",  desc: "Reach depth 30",                   check: s => s.bestScore >= 30 },
    { id: "depth_60",       icon: "\uD83D\uDC51", title: "Depth Master",      desc: "Reach depth 60",                   check: s => s.bestScore >= 60 },
    { id: "zone_2",         icon: "\uD83D\uDD2E", title: "Zone Traveller",    desc: "Reach zone 2",                     check: s => s.maxZone >= 1 },
    { id: "zone_4",         icon: "\uD83C\uDF0C", title: "Deep Zone",         desc: "Reach zone 4",                     check: s => s.maxZone >= 3 },
    { id: "zone_5",         icon: "\u2B50",       title: "Final Zone",        desc: "Reach the last zone",              check: s => s.maxZone >= 4 },
    { id: "pulse_50",       icon: "\uD83D\uDCA5", title: "Pulse Master",      desc: "Use 50 pulses total",              check: s => s.totalPulses >= 50 },
    { id: "shield_grab",    icon: "\uD83D\uDEE1\uFE0F",  title: "Protected",         desc: "Collect a shield shard",           check: s => s.shieldsGrabbed >= 1 },
    { id: "teleport_grab",  icon: "\uD83C\uDF00", title: "Warped",            desc: "Use a teleport shard",             check: s => s.teleportsUsed >= 1 },
    { id: "lightbomb_grab", icon: "\u2600\uFE0F",  title: "Supernova",         desc: "Collect a light bomb",             check: s => s.lightBombsUsed >= 1 },
    { id: "dark_grab",      icon: "\uD83C\uDF11", title: "Embrace Darkness",  desc: "Touch a dark shard",               check: s => s.darkShardsHit >= 1 },
    { id: "survivor",       icon: "\uD83D\uDCAA", title: "Survivor",          desc: "Survive with light below 20%",     check: s => s.survivedLowLight },
    { id: "games_10",       icon: "\uD83C\uDFAE", title: "Dedicated",         desc: "Play 10 games",                    check: s => s.gamesPlayed >= 10 },
  ];

  let achStats = {
    totalShards: 0, shardsThisGame: 0, bestScore: 0, maxZone: 0,
    totalPulses: 0, shieldsGrabbed: 0, teleportsUsed: 0,
    lightBombsUsed: 0, darkShardsHit: 0, survivedLowLight: false,
    gamesPlayed: 0,
  };
  let unlockedAch = new Set();
  let achPopupQueue = [];
  let achPopupTimer = 0;

  function loadAch() {
    try {
      const s = JSON.parse(localStorage.getItem("luminaAch") || "{}");
      if (s.unlocked) unlockedAch = new Set(s.unlocked);
      if (s.stats) Object.assign(achStats, s.stats);
    } catch (_) {}
  }
  function saveAch() {
    localStorage.setItem("luminaAch", JSON.stringify({ unlocked: [...unlockedAch], stats: achStats }));
  }
  function checkAch() {
    for (const a of ACHIEVEMENTS) {
      if (!unlockedAch.has(a.id) && a.check(achStats)) {
        unlockedAch.add(a.id);
        achPopupQueue.push(a);
        saveAch();
      }
    }
  }
  function showAchPopup() {
    if (achPopupTimer > 0 || achPopupQueue.length === 0) return;
    const a = achPopupQueue.shift();
    const popup = document.getElementById("achievementPopup");
    document.getElementById("achievementPopupIcon").textContent = a.icon;
    document.getElementById("achievementPopupTitle").textContent = a.title;
    document.getElementById("achievementPopupDesc").textContent = a.desc;
    popup.classList.add("show");
    achPopupTimer = 3;
    setTimeout(() => { popup.classList.remove("show"); setTimeout(() => { achPopupTimer = 0; }, 500); }, 3000);
  }
  function renderAchList() {
    const list = document.getElementById("achievementsList");
    list.innerHTML = "";
    for (const a of ACHIEVEMENTS) {
      const el = document.createElement("div");
      el.className = "achievement-item" + (unlockedAch.has(a.id) ? " unlocked" : "");
      el.innerHTML = `<span class="achievement-item__icon">${a.icon}</span><span>${a.title}</span>`;
      list.appendChild(el);
    }
  }
  document.getElementById("achievementsToggle").addEventListener("click", () => {
    document.getElementById("achievementsList").classList.toggle("open");
    renderAchList();
  });

  // ── Tutorial ──────────────────────────────────────────────
  const TUTORIAL_STEPS = [
    { title: "Welcome to Lumina!", text: "You are a luminous crystal descending through a dark cavern. Your light is your life.", visual: "\uD83D\uDD2E" },
    { title: "Controls", text: "Use arrow keys (or A/D) to move left and right. Press Space to pulse your light upward. On mobile, use the on-screen buttons.", visual: "\u2B05\uFE0F\u27A1\uFE0F\uD83D\uDCA5" },
    { title: "Shards & Light", text: "Collect crystal shards to restore your light and score points. Your light drains constantly - keep collecting!", visual: "\uD83D\uDC8E\u2728" },
    { title: "Special Pickups", text: "Shield (blue ring) = block one hit. Teleport (spiral) = warp forward. Light Bomb (sun) = full light. Dark Shard (black) = drains light!", visual: "\uD83D\uDEE1\uFE0F\uD83C\uDF00\u2600\uFE0F\uD83C\uDF11" },
    { title: "Hazards & Zones", text: "Avoid spikes, shadow creatures, and falling stalactites. As you go deeper, you'll enter new zones with unique colours.", visual: "\u26A0\uFE0F\uD83D\uDC7E" },
    { title: "Customise", text: "Change colour themes and crystal skins from the dropdowns. Earn achievements as you play!", visual: "\uD83C\uDFA8" },
  ];
  let tutorialStep = 0;
  const tutorialOverlay = document.getElementById("tutorialOverlay");

  function showTutorial() {
    if (localStorage.getItem("luminaTutorialDone") === "1") return;
    tutorialStep = 0;
    tutorialOverlay.classList.add("active");
    renderTutorialStep();
  }
  function renderTutorialStep() {
    const step = TUTORIAL_STEPS[tutorialStep];
    document.getElementById("tutorialTitle").textContent = step.title;
    document.getElementById("tutorialText").textContent = step.text;
    document.getElementById("tutorialVisual").textContent = step.visual;
    document.getElementById("tutorialBtn").textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? "Start Playing!" : "Next";
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
    if (tutorialStep >= TUTORIAL_STEPS.length) closeTutorial(); else renderTutorialStep();
  });
  document.getElementById("tutorialSkip").addEventListener("click", closeTutorial);
  function closeTutorial() {
    tutorialOverlay.classList.remove("active");
    localStorage.setItem("luminaTutorialDone", "1");
  }

  // ── State Enum ────────────────────────────────────────────
  const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, DYING: 3, GAMEOVER: 4 };

  // ── DOM Elements ──────────────────────────────────────────
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("bestScore");
  const muteBtn = document.getElementById("muteButton");
  const restartBtn = document.getElementById("restartButton");
  const fullscreenBtn = document.getElementById("fullscreenButton");
  const themeSelect = document.getElementById("themeSelect");
  const skinSelect = document.getElementById("skinSelect");

  // ── Offscreen Canvases ────────────────────────────────────
  const sceneCanvas = document.createElement("canvas");
  sceneCanvas.width = CFG.W; sceneCanvas.height = CFG.H;
  const sctx = sceneCanvas.getContext("2d");
  const lightCanvas = document.createElement("canvas");
  lightCanvas.width = CFG.W; lightCanvas.height = CFG.H;
  const lctx = lightCanvas.getContext("2d");

  // ── Audio Context ─────────────────────────────────────────
  let audioCtx = null, masterGain = null, muted = false, ambientOsc = null, ambientGain = null;

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.35;
      masterGain.connect(audioCtx.destination);
    } catch (e) {}
  }
  function resumeAudio() { if (audioCtx && audioCtx.state === "suspended") audioCtx.resume(); }

  function playTone(freq, dur, type, vol, sweep) {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(masterGain); o.start(t); o.stop(t + dur);
  }
  function playNoise(dur, vol) {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g).connect(masterGain); src.start(t);
  }
  function sfxPulse() { playTone(300, 0.22, "sine", 0.12, 800); playTone(600, 0.15, "triangle", 0.06, 1200); }
  function sfxCollect() {
    const base = 500 + zoneIndex() * 80;
    playTone(base, 0.1, "sine", 0.1);
    setTimeout(() => playTone(base * 1.25, 0.1, "sine", 0.08), 70);
    setTimeout(() => playTone(base * 1.5, 0.15, "sine", 0.06), 140);
  }
  function sfxHit() { playNoise(0.12, 0.18); playTone(400, 0.35, "sawtooth", 0.1, 80); }
  function sfxStalactite() { playTone(200, 0.15, "square", 0.08, 100); playNoise(0.08, 0.06); }
  function sfxZone() { for (let i = 0; i < 5; i++) setTimeout(() => playTone(400 * Math.pow(1.122, i), 0.18, "sine", 0.07), i * 120); }
  function sfxShield() { playTone(700, 0.2, "triangle", 0.1, 1200); }
  function sfxTeleport() { playTone(200, 0.3, "sine", 0.1, 1500); playNoise(0.15, 0.05); }
  function sfxLightBomb() { playTone(400, 0.4, "sine", 0.15, 1600); playTone(800, 0.3, "triangle", 0.08, 1800); }
  function sfxDarkShard() { playTone(300, 0.3, "sawtooth", 0.12, 60); playNoise(0.15, 0.1); }

  function startAmbient() {
    if (!audioCtx || ambientOsc) return;
    ambientOsc = audioCtx.createOscillator(); ambientGain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator(), lfoGain = audioCtx.createGain();
    ambientOsc.type = "sine"; ambientOsc.frequency.value = 55;
    lfo.type = "sine"; lfo.frequency.value = 0.4; lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(ambientGain.gain);
    ambientGain.gain.value = 0.05;
    ambientOsc.connect(ambientGain).connect(masterGain);
    ambientOsc.start(); lfo.start();
  }

  function haptic(pattern) { try { navigator.vibrate(pattern); } catch (e) {} }

  // ── Utility Functions ─────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }
  function lerpColor(c1, c2, t) { return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))]; }
  function rgb(c, a) { if (a !== undefined) return `rgba(${c[0]},${c[1]},${c[2]},${a})`; return `rgb(${c[0]},${c[1]},${c[2]})`; }
  function dist(x1, y1, x2, y2) { const dx = x2-x1, dy = y2-y1; return Math.sqrt(dx*dx+dy*dy); }

  // ── Cave Noise ────────────────────────────────────────────
  const NOISE_SIZE = 512;
  const noiseTable = new Float32Array(NOISE_SIZE);
  function seedNoise() { for (let i = 0; i < NOISE_SIZE; i++) noiseTable[i] = Math.random(); }
  function noise1D(x) {
    const i = Math.floor(x) & (NOISE_SIZE - 1), f = x - Math.floor(x), t = f*f*(3-2*f);
    return lerp(noiseTable[i], noiseTable[(i+1) & (NOISE_SIZE-1)], t);
  }
  function caveNoise(y) {
    const wf = 1 + Math.min(score * 0.012, 0.8);
    return (noise1D(y*0.012)*0.5 + noise1D(y*0.028+100)*0.3 + noise1D(y*0.06+200)*0.2) * wf;
  }
  function isBottleneck(worldY) { const c = 400-Math.min(score*1.5,150); return (((worldY%c)+c)%c) < 60; }
  function bottleneckSqueeze(worldY) {
    const c = 400-Math.min(score*1.5,150), p = (((worldY%c)+c)%c);
    if (p >= 60) return 0;
    return Math.sin((p/60)*Math.PI) * (40+Math.min(score*0.6,40));
  }
  function isDarkZone(worldY) {
    if (score < 10) return false;
    const c = 500-Math.min(score*2,200);
    return ((((worldY+200)%c)+c)%c) < 80;
  }

  // ── Game State ────────────────────────────────────────────
  let state, score, bestScore, depth;
  let player, lightRadius, pulseCooldown, pulseAnim;
  let descentSpeed, cameraY, caveSeed;
  let shards, spikes, shadows, stalactites, specialPickups;
  let particles;
  let shakeX, shakeY, shakeTimer;
  let dyingTimer, chromAb;
  let lastTime, keys, menuTime;
  let zoneAnnounceTmr, zoneAnnounceName, prevZone;
  let timeDilation;
  let waterDrops, waterDropTimer;
  let shieldActive, shieldTimer;

  let touchMoveDir = 0, touchActive = false, touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  let isMobile = false;
  let bgCrystals;

  function detectMobile() { isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 768; }
  detectMobile(); window.addEventListener("resize", detectMobile);

  function loadBest() { try { return parseInt(localStorage.getItem("luminaBest")) || 0; } catch { return 0; } }
  function saveBest(v) { try { localStorage.setItem("luminaBest", v); } catch {} }
  function loadMute() { try { return localStorage.getItem("luminaMuted") === "1"; } catch { return false; } }
  function saveMute(v) { try { localStorage.setItem("luminaMuted", v ? "1" : "0"); } catch {} }

  function zoneIndex() { return Math.min(Math.floor(score / CFG.ZONE_LEN), ZONES.length - 1); }
  function zoneFrac() {
    const zi = zoneIndex(), progress = score - zi * CFG.ZONE_LEN;
    if (progress >= CFG.ZONE_LEN - CFG.ZONE_LERP && zi < ZONES.length - 1) return (progress - (CFG.ZONE_LEN - CFG.ZONE_LERP)) / CFG.ZONE_LERP;
    return 0;
  }
  function currentPalette() {
    const zi = zoneIndex(), frac = zoneFrac();
    if (frac > 0 && zi < ZONES.length - 1) {
      const a = ZONES[zi], b = ZONES[zi + 1];
      return { crystal: lerpColor(a.crystal, b.crystal, frac), ambient: lerpColor(a.ambient, b.ambient, frac), wall: lerpColor(a.wall, b.wall, frac), bg: lerpColor(a.bg, b.bg, frac), name: b.name };
    }
    return ZONES[zi];
  }

  // ── Particle Pool ─────────────────────────────────────────
  const MAX_PARTICLES = 250;
  function spawnParticle(type, x, y, vx, vy, life, size, color, alpha) {
    if (particles.length >= MAX_PARTICLES) {
      const oldest = particles.findIndex(p => !p.active);
      if (oldest >= 0) { const p = particles[oldest]; p.type=type;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=life;p.maxLife=life;p.size=size;p.color=color;p.alpha=alpha||1;p.active=true; return p; }
      const p = particles[0]; p.type=type;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=life;p.maxLife=life;p.size=size;p.color=color;p.alpha=alpha||1;p.active=true; return p;
    }
    const p = { type,x,y,vx,vy,life,maxLife:life,size,color,alpha:alpha||1,active:true };
    particles.push(p); return p;
  }

  // ── Init / Reset ──────────────────────────────────────────
  function init() {
    bestScore = loadBest(); muted = loadMute();
    muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
    bestEl.textContent = bestScore;
    loadPreferences(); loadAch(); renderAchList();
    resetGame(); state = STATE.MENU; menuTime = 0;
    lastTime = performance.now();
    requestAnimationFrame(loop);
    showTutorial();
  }

  function resetGame() {
    score = 0; depth = 0;
    player = { x: CFG.W / 2, y: CFG.H * 0.35, vx: 0, vy: 0 };
    lightRadius = CFG.LIGHT_MAX; pulseCooldown = 0; pulseAnim = 0;
    descentSpeed = CFG.BASE_DESCENT; cameraY = 0;
    shards = []; spikes = []; shadows = []; stalactites = []; specialPickups = [];
    particles = [];
    lastShardY = 0; lastSpikeY = 0; lastShadowY = 0; lastStalactiteY = 0; lastSpecialY = 0;
    shakeX = 0; shakeY = 0; shakeTimer = 0;
    dyingTimer = 0; chromAb = 0;
    zoneAnnounceTmr = 0; zoneAnnounceName = ""; prevZone = 0;
    timeDilation = 1;
    waterDrops = []; waterDropTimer = 0;
    shieldActive = false; shieldTimer = 0;
    achStats.shardsThisGame = 0;
    seedNoise(); generateBgCrystals();
    scoreEl.textContent = "0";
    generateAhead(CFG.H * 2);
  }

  function generateBgCrystals() {
    bgCrystals = [];
    for (let i = 0; i < 30; i++) {
      bgCrystals.push({ x: rand(0, CFG.W), yOff: rand(0, CFG.H * 3), size: rand(8, 30), angle: rand(-0.5, 0.5), layer: randInt(0, 2), alpha: rand(0.05, 0.2) });
    }
  }

  // ── Procedural Generation ─────────────────────────────────
  let lastShardY = 0, lastSpikeY = 0, lastShadowY = 0, lastStalactiteY = 0, lastSpecialY = 0;

  function caveWalls(worldY) {
    const baseCaveWidth = Math.max(CFG.CAVE_MIN_W, CFG.CAVE_BASE_W - score * CFG.CAVE_NARROW);
    const squeeze = bottleneckSqueeze(worldY);
    const caveWidth = Math.max(CFG.CAVE_MIN_W * 0.65, baseCaveWidth - squeeze);
    const offset = (caveNoise(worldY) - 0.5) * (CFG.W - caveWidth) * 0.6;
    const half = caveWidth / 2;
    return { left: CFG.W / 2 + offset - half, right: CFG.W / 2 + offset + half };
  }

  function generateAhead(generateToY) {
    const worldBottom = cameraY + generateToY;
    const difficultyMult = Math.min(score / 80, 1);

    // Shards
    while (lastShardY < worldBottom) {
      lastShardY += CFG.SHARD_INTERVAL + score * CFG.SHARD_SPREAD_SCALE + rand(-20, 20);
      const walls = caveWalls(lastShardY);
      shards.push({ x: rand(walls.left + 30, walls.right - 30), y: lastShardY, collected: false, bobPhase: rand(0, Math.PI * 2), rot: 0 });
    }

    // Spikes
    while (lastSpikeY < worldBottom) {
      lastSpikeY += Math.max(80, CFG.SPIKE_INTERVAL - score * CFG.SPIKE_TIGHTEN_SCALE) + rand(-30, 30);
      const walls = caveWalls(lastSpikeY);
      const caveWidth = walls.right - walls.left;
      const isGate = difficultyMult > 0.1 && Math.random() < 0.15 + difficultyMult * 0.2;
      if (isGate) {
        const gapFrac = rand(0.30, 0.50) - difficultyMult * 0.08;
        const gapWidth = caveWidth * gapFrac;
        const gapCenter = rand(walls.left + gapWidth * 0.6, walls.right - gapWidth * 0.6);
        const leftLen = (gapCenter - gapWidth / 2) - walls.left;
        if (leftLen > 15) { const a = rand(-0.15, 0.15); const osc = difficultyMult>0.5&&Math.random()<0.3; spikes.push({ x: walls.left, y: lastSpikeY, length: leftLen, angle: a, side: "left", tipX: walls.left+Math.cos(a)*leftLen, tipY: lastSpikeY+Math.sin(a)*leftLen, oscillates: osc, oscPhase: rand(0,Math.PI*2), oscSpeed: rand(1.5,2.5), oscAmp: rand(0.15,0.35), baseAngle: a }); }
        const rightLen = walls.right - (gapCenter + gapWidth / 2);
        if (rightLen > 15) { const a = Math.PI+rand(-0.15,0.15); const osc = difficultyMult>0.5&&Math.random()<0.3; spikes.push({ x: walls.right, y: lastSpikeY, length: rightLen, angle: a, side: "right", tipX: walls.right+Math.cos(a)*rightLen, tipY: lastSpikeY+Math.sin(a)*rightLen, oscillates: osc, oscPhase: rand(0,Math.PI*2), oscSpeed: rand(1.5,2.5), oscAmp: rand(0.15,0.35), baseAngle: a }); }
      } else {
        const side = Math.random() < 0.5 ? "left" : "right";
        const baseX = side === "left" ? walls.left : walls.right;
        const len = rand(25, 55 + difficultyMult * 20);
        const ang = side === "left" ? rand(-0.3, 0.5) : rand(Math.PI - 0.5, Math.PI + 0.3);
        const osc = difficultyMult > 0.3 && Math.random() < difficultyMult * 0.4;
        spikes.push({ x: baseX, y: lastSpikeY, length: len, angle: ang, side, tipX: baseX+Math.cos(ang)*len, tipY: lastSpikeY+Math.sin(ang)*len, oscillates: osc, oscPhase: rand(0,Math.PI*2), oscSpeed: rand(1.5,3), oscAmp: rand(0.3,0.6), baseAngle: ang });
      }
    }

    // Shadows
    while (lastShadowY < worldBottom) {
      lastShadowY += Math.max(200, CFG.SHADOW_INTERVAL - score * CFG.SHADOW_TIGHTEN_SCALE) + rand(-60, 60);
      const walls = caveWalls(lastShadowY);
      const speedBonus = difficultyMult * 40;
      shadows.push({ x: rand(walls.left+40, walls.right-40), y: lastShadowY, vx: rand(20+speedBonus,50+speedBonus)*(Math.random()<0.5?-1:1), r: rand(16,24+difficultyMult*6), eyePhase: rand(0,Math.PI*2) });
    }

    // Stalactites
    if (score >= CFG.STALACTITE_START_SCORE) {
      while (lastStalactiteY < worldBottom) {
        lastStalactiteY += Math.max(300, CFG.STALACTITE_INTERVAL - score * 2) + rand(-80, 80);
        const walls = caveWalls(lastStalactiteY);
        stalactites.push({ x: rand(walls.left+30,walls.right-30), y: lastStalactiteY, vy: 0, falling: false, shaking: false, shakeTimer: 0, size: rand(12,22), fallen: false });
      }
    }

    // Special pickups
    while (lastSpecialY < worldBottom) {
      lastSpecialY += 300 + rand(-50, 50);
      const walls = caveWalls(lastSpecialY);
      const roll = Math.random();
      let type;
      if (roll < 0.25) type = "shield";
      else if (roll < 0.50) type = "teleport";
      else if (roll < 0.75) type = "lightbomb";
      else type = "dark";
      specialPickups.push({ x: rand(walls.left+30, walls.right-30), y: lastSpecialY, type, collected: false, bobPhase: rand(0, Math.PI*2) });
    }
  }

  function cullBehind() {
    const cullY = cameraY - 100;
    shards = shards.filter(s => s.y > cullY);
    spikes = spikes.filter(s => s.y > cullY);
    shadows = shadows.filter(s => s.y > cullY);
    stalactites = stalactites.filter(s => s.y > cullY && !s.fallen);
    specialPickups = specialPickups.filter(s => s.y > cullY);
  }

  // ── Input Handling ────────────────────────────────────────
  keys = {};
  document.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "Space") handleAction();
    if (e.code === "Escape") handlePause();
  });
  document.addEventListener("keyup", (e) => { keys[e.code] = false; });

  function getTouchZone(clientX) {
    const rect = canvas.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    if (relX < 0.33) return "left"; if (relX > 0.67) return "right"; return "center";
  }

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); initAudio(); resumeAudio();
    if (state === STATE.MENU || state === STATE.GAMEOVER) { handleAction(); return; }
    const touch = e.touches[0]; touchStartX = touch.clientX; touchStartY = touch.clientY; touchStartTime = performance.now(); touchActive = true;
    const zone = getTouchZone(touch.clientX);
    touchMoveDir = zone === "left" ? -1 : zone === "right" ? 1 : 0;
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault(); if (!touchActive || state !== STATE.PLAYING) return;
    const zone = getTouchZone(e.touches[0].clientX);
    touchMoveDir = zone === "left" ? -1 : zone === "right" ? 1 : 0;
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (performance.now() - touchStartTime < 250 && state === STATE.PLAYING && getTouchZone(touchStartX) === "center") doPulse();
    touchMoveDir = 0; touchActive = false;
    if (e.touches.length > 0) { touchActive = true; const z = getTouchZone(e.touches[0].clientX); touchMoveDir = z === "left" ? -1 : z === "right" ? 1 : 0; }
  }, { passive: false });

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    e.preventDefault(); initAudio(); resumeAudio(); handleAction();
  });

  // Mobile button controls
  const ctrlLeft = document.getElementById("ctrlLeft");
  const ctrlRight = document.getElementById("ctrlRight");
  const ctrlPulse = document.getElementById("ctrlPulse");
  let btnLeftDown = false, btnRightDown = false;

  ctrlLeft.addEventListener("pointerdown", (e) => { e.preventDefault(); initAudio(); resumeAudio(); btnLeftDown = true; if (state===STATE.MENU||state===STATE.GAMEOVER) handleAction(); });
  ctrlLeft.addEventListener("pointerup", () => { btnLeftDown = false; });
  ctrlLeft.addEventListener("pointerleave", () => { btnLeftDown = false; });
  ctrlRight.addEventListener("pointerdown", (e) => { e.preventDefault(); initAudio(); resumeAudio(); btnRightDown = true; if (state===STATE.MENU||state===STATE.GAMEOVER) handleAction(); });
  ctrlRight.addEventListener("pointerup", () => { btnRightDown = false; });
  ctrlRight.addEventListener("pointerleave", () => { btnRightDown = false; });
  ctrlPulse.addEventListener("pointerdown", (e) => { e.preventDefault(); initAudio(); resumeAudio(); if (state===STATE.MENU||state===STATE.GAMEOVER) handleAction(); else if (state===STATE.PLAYING) doPulse(); });

  restartBtn.addEventListener("click", () => { initAudio(); resumeAudio(); resetGame(); state = STATE.PLAYING; startAmbient(); });
  muteBtn.addEventListener("click", () => { muted = !muted; muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}"; if (masterGain) masterGain.gain.value = muted ? 0 : 0.35; saveMute(muted); });

  // Fullscreen
  fullscreenBtn.addEventListener("click", () => {
    const el = document.getElementById("gameContainer");
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
    else (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
  });

  // Theme & Skin
  function applyTheme(name) {
    ZONES = ZONE_SETS[name] || ZONE_SETS.default;
    currentThemeName = name;
    document.body.className = name === "default" ? "" : `theme-${name}`;
    localStorage.setItem("luminaTheme", name);
  }
  function applySkin(name) {
    currentSkin = PLAYER_SKINS[name] || PLAYER_SKINS.classic;
    currentSkinName = name;
    localStorage.setItem("luminaSkin", name);
  }
  themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
  skinSelect.addEventListener("change", () => applySkin(skinSelect.value));
  function loadPreferences() {
    const t = localStorage.getItem("luminaTheme") || "default";
    const s = localStorage.getItem("luminaSkin") || "classic";
    themeSelect.value = t; skinSelect.value = s;
    applyTheme(t); applySkin(s);
  }

  function handleAction() {
    initAudio(); resumeAudio();
    if (state === STATE.MENU || state === STATE.GAMEOVER) { resetGame(); state = STATE.PLAYING; startAmbient(); achStats.gamesPlayed++; saveAch(); return; }
    if (state === STATE.PLAYING) doPulse();
  }
  function handlePause() {
    if (state === STATE.PLAYING) { state = STATE.PAUSED; return; }
    if (state === STATE.PAUSED) { state = STATE.PLAYING; lastTime = performance.now(); }
  }

  function doPulse() {
    if (pulseCooldown > 0 || lightRadius < CFG.LIGHT_MIN + 10) return;
    player.vy += CFG.PULSE_FORCE; pulseCooldown = CFG.PULSE_COOLDOWN; pulseAnim = 1.0;
    lightRadius = Math.min(CFG.LIGHT_MAX, lightRadius + 15); timeDilation = 0.3;
    achStats.totalPulses++; saveAch();
    const pal = currentPalette();
    for (let i = 0; i < 35; i++) {
      const a = (Math.PI*2*i)/35+rand(-0.15,0.15), spd = rand(80,220);
      spawnParticle("nova", player.x, player.y, Math.cos(a)*spd, Math.sin(a)*spd, rand(0.3,0.6), rand(2,5), [255,255,Math.round(rand(180,255))], 0.9);
    }
    sfxPulse(); haptic([50, 30, 80]);
  }

  // ── Distance to segment ───────────────────────────────────
  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx-ax, dy = by-ay, lenSq = dx*dx+dy*dy;
    if (lenSq === 0) return dist(px, py, ax, ay);
    let t = ((px-ax)*dx+(py-ay)*dy)/lenSq;
    t = clamp(t, 0, 1);
    return dist(px, py, ax+t*dx, ay+t*dy);
  }

  // ── Update ────────────────────────────────────────────────
  function update(dt) {
    if (state === STATE.MENU) {
      menuTime += dt;
      if (Math.random() < dt * 5) spawnParticle("dust", rand(0,CFG.W), rand(0,CFG.H), rand(-8,8), rand(-15,-5), rand(3,6), rand(1,3), [120,160,255], rand(0.1,0.3));
      updateParticles(dt); return;
    }
    if (state === STATE.PAUSED) return;
    if (state === STATE.DYING) {
      dyingTimer -= dt; chromAb = Math.max(0, chromAb - dt * 8); shakeTimer = dyingTimer;
      updateParticles(dt * 0.3);
      if (dyingTimer <= 0) {
        state = STATE.GAMEOVER;
        if (score > bestScore) { bestScore = score; saveBest(bestScore); bestEl.textContent = bestScore; }
        achStats.bestScore = Math.max(achStats.bestScore, score);
        achStats.maxZone = Math.max(achStats.maxZone, zoneIndex());
        checkAch(); showAchPopup(); saveAch();
      }
      return;
    }
    if (state === STATE.GAMEOVER) return;

    timeDilation = Math.min(1, timeDilation + dt * 3);
    const adt = dt * timeDilation;

    // Player movement
    let moveX = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) moveX = -1;
    if (keys["ArrowRight"] || keys["KeyD"]) moveX = 1;
    if (touchActive && touchMoveDir !== 0) moveX = touchMoveDir;
    if (btnLeftDown) moveX = -1;
    if (btnRightDown) moveX = 1;

    player.vx = moveX * CFG.PLAYER_SPEED;
    player.vy += CFG.GRAVITY * adt;
    player.vy = clamp(player.vy, -300, 300);
    player.x += player.vx * adt;
    player.y += player.vy * adt;

    descentSpeed = Math.min(CFG.MAX_DESCENT, CFG.BASE_DESCENT + score * CFG.DESCENT_SCALE);
    cameraY += descentSpeed * adt;
    depth += descentSpeed * adt;

    const screenY = player.y - cameraY;
    if (screenY < CFG.H * 0.15) { player.y = cameraY + CFG.H * 0.15; player.vy = Math.max(player.vy, 0); }
    if (screenY > CFG.H * 0.85) { player.y = cameraY + CFG.H * 0.85; player.vy = Math.min(player.vy, 0); }

    // Cave wall collision
    const walls = caveWalls(player.y);
    let wallContact = false;
    if (player.x - CFG.PLAYER_R < walls.left) { player.x = walls.left + CFG.PLAYER_R; player.vx = 0; wallContact = true; }
    if (player.x + CFG.PLAYER_R > walls.right) { player.x = walls.right - CFG.PLAYER_R; player.vx = 0; wallContact = true; }
    if (wallContact) { lightRadius = Math.max(CFG.LIGHT_MIN, lightRadius - (isBottleneck(player.y) ? 12 : 4) * adt); }

    pulseCooldown = Math.max(0, pulseCooldown - dt);
    pulseAnim = Math.max(0, pulseAnim - dt * 4);

    // Light drain
    const darkMult = isDarkZone(player.y) ? 3.0 : 1.0;
    lightRadius = Math.max(CFG.LIGHT_MIN, lightRadius - (CFG.LIGHT_DRAIN + score * CFG.LIGHT_DRAIN_SCALE) * darkMult * adt);

    // Track low light survival
    if (lightRadius < CFG.LIGHT_MIN + (CFG.LIGHT_MAX - CFG.LIGHT_MIN) * 0.2) achStats.survivedLowLight = true;

    // Shield timer
    if (shieldActive) { shieldTimer -= dt; if (shieldTimer <= 0) shieldActive = false; }

    // Zone check
    const zi = zoneIndex();
    if (zi !== prevZone && prevZone < zi) { zoneAnnounceTmr = 2.5; zoneAnnounceName = ZONES[zi].name; sfxZone(); haptic([30,20,30,20,30,20,30]); prevZone = zi; }
    if (zoneAnnounceTmr > 0) zoneAnnounceTmr -= dt;

    // Shard collection
    for (const s of shards) {
      if (s.collected) continue;
      if (Math.abs(s.y - cameraY - CFG.H/2) > CFG.H) continue;
      if (dist(player.x, player.y, s.x, s.y) < CFG.PLAYER_R + 10) {
        s.collected = true; score++; scoreEl.textContent = score;
        lightRadius = Math.min(CFG.LIGHT_MAX, lightRadius + CFG.LIGHT_RESTORE);
        achStats.totalShards++; achStats.shardsThisGame++;
        const pal = currentPalette();
        for (let i = 0; i < 18; i++) { const a = (Math.PI*2*i)/18, spd = rand(40,130); spawnParticle("burst", s.x, s.y, Math.cos(a)*spd, Math.sin(a)*spd, rand(0.4,0.8), rand(2,5), [clamp(pal.crystal[0]+randInt(-30,30),0,255), clamp(pal.crystal[1]+randInt(-30,30),0,255), clamp(pal.crystal[2]+randInt(-30,30),0,255)], 1); }
        sfxCollect(); haptic(25);
      }
    }

    // Special pickup collection
    for (const sp of specialPickups) {
      if (sp.collected) continue;
      if (Math.abs(sp.y - cameraY - CFG.H/2) > CFG.H) continue;
      if (dist(player.x, player.y, sp.x, sp.y) < CFG.PLAYER_R + 12) {
        sp.collected = true;
        if (sp.type === "shield") { shieldActive = true; shieldTimer = 8; achStats.shieldsGrabbed++; sfxShield(); haptic([40,20,40]); for(let i=0;i<12;i++){const a=(Math.PI*2*i)/12;spawnParticle("burst",sp.x,sp.y,Math.cos(a)*80,Math.sin(a)*80,0.5,3,[100,180,255],0.8);} }
        else if (sp.type === "teleport") { player.y += 150; cameraY += 100; achStats.teleportsUsed++; sfxTeleport(); haptic([60,30,60]); for(let i=0;i<20;i++){spawnParticle("nova",player.x,player.y,rand(-100,100),rand(-100,100),rand(0.3,0.6),rand(2,4),[200,150,255],0.7);} }
        else if (sp.type === "lightbomb") { lightRadius = CFG.LIGHT_MAX; achStats.lightBombsUsed++; sfxLightBomb(); haptic([30,15,30,15,80]); for(let i=0;i<30;i++){const a=(Math.PI*2*i)/30;spawnParticle("nova",player.x,player.y,Math.cos(a)*150,Math.sin(a)*150,rand(0.4,0.8),rand(3,6),[255,255,180],1);} }
        else if (sp.type === "dark") { lightRadius = Math.max(CFG.LIGHT_MIN, lightRadius - 50); achStats.darkShardsHit++; sfxDarkShard(); haptic([100,50,100]); shakeTimer = 0.3; for(let i=0;i<15;i++){spawnParticle("wisp",sp.x+rand(-10,10),sp.y+rand(-10,10),rand(-30,30),rand(-30,30),rand(0.5,1),rand(3,7),[30,0,50],0.6);} }
        checkAch(); showAchPopup();
      }
    }

    // Spike collision
    for (const sp of spikes) {
      if (Math.abs(sp.y - cameraY - CFG.H/2) > CFG.H) continue;
      if (distToSegment(player.x, player.y, sp.x, sp.y, sp.tipX, sp.tipY) < CFG.PLAYER_R + 4) {
        if (shieldActive) { shieldActive = false; shieldTimer = 0; shakeTimer = 0.15; haptic(50); } else { startDeath(); return; }
      }
    }

    // Shadow creature update & collision
    const aggroBoost = Math.min(score / 60, 1);
    for (const sh of shadows) {
      if (Math.abs(sh.y - cameraY - CFG.H/2) > CFG.H + 100) continue;
      const dToPlayer = dist(player.x, player.y, sh.x, sh.y);
      const fleeThreshold = 110 - aggroBoost * 25, chaseThreshold = 80 + aggroBoost * 20;
      const chaseSpeed = 60 + aggroBoost * 50, fleeSpeed = 80 - aggroBoost * 15;
      if (lightRadius > fleeThreshold && dToPlayer < lightRadius * 1.2) sh.vx = lerp(sh.vx, (player.x < sh.x ? 1 : -1) * fleeSpeed, adt * 2);
      else if (lightRadius < chaseThreshold) sh.vx = lerp(sh.vx, (player.x < sh.x ? -1 : 1) * chaseSpeed, adt * (1.5 + aggroBoost));
      if (aggroBoost > 0.4 && lightRadius < chaseThreshold && dToPlayer < 200) sh.y += (player.y < sh.y ? -1 : 1) * chaseSpeed * 0.3 * adt;
      sh.x += sh.vx * adt; sh.eyePhase += dt * 3;
      const w = caveWalls(sh.y);
      if (sh.x < w.left + sh.r) { sh.x = w.left + sh.r; sh.vx = Math.abs(sh.vx); }
      if (sh.x > w.right - sh.r) { sh.x = w.right - sh.r; sh.vx = -Math.abs(sh.vx); }
      if (Math.random() < dt * 3) spawnParticle("wisp", sh.x+rand(-sh.r,sh.r), sh.y+rand(-sh.r,sh.r), rand(-15,15), rand(-20,-5), rand(0.6,1.2), rand(3,7), [40,10,50], 0.4);
      if (dToPlayer < CFG.PLAYER_R + sh.r) {
        if (shieldActive) { shieldActive = false; shieldTimer = 0; shakeTimer = 0.2; haptic(60); } else { startDeath(); return; }
      }
    }

    // Oscillating spikes
    for (const sp of spikes) { if (!sp.oscillates) continue; sp.oscPhase += sp.oscSpeed * adt; const na = sp.baseAngle + Math.sin(sp.oscPhase) * sp.oscAmp; sp.angle = na; sp.tipX = sp.x + Math.cos(na) * sp.length; sp.tipY = sp.y + Math.sin(na) * sp.length; }

    // Stalactites
    for (const st of stalactites) {
      if (Math.abs(st.y - cameraY - CFG.H/2) > CFG.H + 100) continue;
      if (!st.falling && !st.shaking && Math.abs(player.x - st.x) < 50 && player.y > st.y - 100 && player.y < st.y + 200) { st.shaking = true; st.shakeTimer = 0.6; sfxStalactite(); }
      if (st.shaking && !st.falling) { st.shakeTimer -= dt; if (st.shakeTimer <= 0) { st.falling = true; st.shaking = false; st.vy = 0; } }
      if (st.falling) { st.vy += 350 * dt; st.y += st.vy * dt; if (st.y > cameraY + CFG.H + 100) { st.fallen = true; continue; } }
      if (dist(player.x, player.y, st.x, st.y) < CFG.PLAYER_R + st.size * 0.5) {
        if (shieldActive) { shieldActive = false; shieldTimer = 0; st.fallen = true; shakeTimer = 0.2; haptic(60); } else { startDeath(); return; }
      }
    }

    // Water drips
    waterDropTimer += dt;
    if (waterDropTimer >= 2.0 && waterDrops.length < 8) { waterDropTimer = 0; const wy = cameraY + rand(0,30); const w = caveWalls(wy); waterDrops.push({x:rand(w.left+15,w.right-15),y:wy,vy:0}); }
    for (let i = waterDrops.length-1; i >= 0; i--) {
      const d = waterDrops[i]; d.vy += 200*dt; d.y += d.vy*dt;
      const w = caveWalls(d.y);
      if (d.y - cameraY >= CFG.H || d.x <= w.left+2 || d.x >= w.right-2) { const pal = currentPalette(); for(let j=0;j<3;j++) spawnParticle("burst",d.x,d.y,rand(-20,20),rand(-30,-10),rand(0.2,0.4),rand(1,2),pal.crystal,0.3); waterDrops.splice(i,1); }
    }

    generateAhead(cameraY + CFG.H * 2.5); cullBehind();

    // Ambient particles
    if (Math.random() < dt * 8) { const pal = currentPalette(); spawnParticle("dust", rand(0,CFG.W), cameraY+rand(0,CFG.H), rand(-6,6), rand(-12,5), rand(3,7), rand(1,2.5), pal.crystal, rand(0.1,0.25)); }
    if (Math.random() < dt * 25) { const pal = currentPalette(); spawnParticle("trail", player.x+rand(-5,5), player.y+rand(3,10), rand(-10,10), rand(10,30), rand(0.3,0.7), rand(2,5), pal.crystal, 0.6); }
    for (const s of shards) { if (s.collected) continue; const sy=s.y-cameraY; if(sy<-20||sy>CFG.H+20) continue; if(Math.random()<dt*2) spawnParticle("sparkle",s.x+rand(-8,8),s.y+rand(-8,8),rand(-5,5),rand(-5,5),rand(0.4,0.8),rand(1,3),[255,255,255],rand(0.4,0.9)); }

    if (shakeTimer > 0) { shakeTimer -= dt; shakeX = rand(-shakeTimer*8, shakeTimer*8); shakeY = rand(-shakeTimer*8, shakeTimer*8); } else { shakeX = 0; shakeY = 0; }

    updateParticles(adt);
    checkAch(); showAchPopup();
  }

  function updateParticles(dt) {
    for (let i = particles.length-1; i >= 0; i--) {
      const p = particles[i]; if (!p.active) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { p.active = false; particles.splice(i, 1); }
    }
  }

  function startDeath() {
    state = STATE.DYING; dyingTimer = 0.5; chromAb = 4; shakeTimer = 0.5;
    const pal = currentPalette();
    for (let i = 0; i < 50; i++) { const a = rand(0,Math.PI*2), spd = rand(50,250); spawnParticle("shatter", player.x, player.y, Math.cos(a)*spd, Math.sin(a)*spd, rand(0.4,1), rand(2,7), [255,Math.round(rand(200,255)),Math.round(rand(150,255))], 1); }
    sfxHit(); haptic([150, 50, 150, 50, 200]);
  }

  // ── Rendering ─────────────────────────────────────────────
  function draw() {
    const pal = currentPalette();
    sctx.fillStyle = rgb(pal.bg); sctx.fillRect(0, 0, CFG.W, CFG.H);
    drawParallaxBg(sctx, pal);
    drawCaveWalls(sctx, pal);
    drawWaterDrops(sctx, pal);
    drawFogBands(sctx, pal);
    drawCaveHazards(sctx, pal);
    drawSpikes(sctx, pal);
    drawShards(sctx, pal);
    drawSpecialPickups(sctx, pal);
    drawShadows(sctx, pal);
    drawStalactites(sctx, pal);
    if (state !== STATE.DYING || dyingTimer > 0.2) drawPlayer(sctx, pal);
    drawParticlesOnScene(sctx, pal);

    // Light map
    lctx.fillStyle = "#000"; lctx.fillRect(0, 0, CFG.W, CFG.H);
    if (state === STATE.PLAYING || state === STATE.DYING || state === STATE.PAUSED) {
      const plSY = player.y - cameraY, r = lightRadius + pulseAnim * 80;
      const grad = lctx.createRadialGradient(player.x, plSY, 0, player.x, plSY, r);
      grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.3, "rgba(255,255,255,0.8)");
      grad.addColorStop(0.7, "rgba(255,255,255,0.3)"); grad.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = grad; lctx.fillRect(player.x-r, plSY-r, r*2, r*2);
      for (const s of shards) { if(s.collected) continue; const sy=s.y-cameraY; if(sy<-50||sy>CFG.H+50) continue; const sg=lctx.createRadialGradient(s.x,sy,0,s.x,sy,35); sg.addColorStop(0,"rgba(255,255,255,0.6)"); sg.addColorStop(1,"rgba(255,255,255,0)"); lctx.fillStyle=sg; lctx.fillRect(s.x-35,sy-35,70,70); }
      for (const sp of specialPickups) { if(sp.collected) continue; const sy=sp.y-cameraY; if(sy<-50||sy>CFG.H+50) continue; const sg=lctx.createRadialGradient(sp.x,sy,0,sp.x,sy,30); sg.addColorStop(0,"rgba(255,255,255,0.5)"); sg.addColorStop(1,"rgba(255,255,255,0)"); lctx.fillStyle=sg; lctx.fillRect(sp.x-30,sy-30,60,60); }
    } else if (state === STATE.MENU) {
      lctx.fillStyle = "rgba(255,255,255,0.6)"; lctx.fillRect(0,0,CFG.W,CFG.H);
      const mg = lctx.createRadialGradient(CFG.W/2,CFG.H*0.4,0,CFG.W/2,CFG.H*0.4,200);
      mg.addColorStop(0,"rgba(255,255,255,1)"); mg.addColorStop(1,"rgba(255,255,255,0)");
      lctx.fillStyle = mg; lctx.fillRect(0,0,CFG.W,CFG.H);
    } else {
      lctx.fillStyle = "rgba(255,255,255,0.25)"; lctx.fillRect(0,0,CFG.W,CFG.H);
      const cg = lctx.createRadialGradient(CFG.W/2,CFG.H*0.4,0,CFG.W/2,CFG.H*0.4,150);
      cg.addColorStop(0,"rgba(255,255,255,0.6)"); cg.addColorStop(1,"rgba(255,255,255,0)");
      lctx.fillStyle = cg; lctx.fillRect(0,0,CFG.W,CFG.H);
    }

    ctx.clearRect(0, 0, CFG.W, CFG.H);
    ctx.save();
    if (shakeTimer > 0) ctx.translate(shakeX, shakeY);
    ctx.drawImage(sceneCanvas, 0, 0);
    ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(lightCanvas, 0, 0);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12; ctx.drawImage(lightCanvas, 0, 0);
    ctx.globalAlpha = 0.06; ctx.drawImage(lightCanvas, -3, -3, CFG.W+6, CFG.H+6);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    drawVignette(ctx);
    if (chromAb > 0.1) drawChromaticAberration(ctx);
    ctx.restore();

    if (state === STATE.MENU) drawMenu(ctx, pal);
    if (state === STATE.PAUSED) drawPaused(ctx);
    if (state === STATE.GAMEOVER) drawGameOver(ctx, pal);
    if (state === STATE.PLAYING && zoneAnnounceTmr > 0) drawZoneAnnounce(ctx, pal);
    if (state === STATE.PLAYING) drawLightMeter(ctx, pal);
    if (state === STATE.PLAYING) drawPowerUpIndicators(ctx, pal);
    if (state === STATE.PLAYING && isMobile) drawTouchGuide(ctx, pal);
  }

  // ── Sub-Renderers ─────────────────────────────────────────
  function drawParallaxBg(c, pal) {
    const speeds = [0.15, 0.4, 0.7];
    for (const bc of bgCrystals) {
      const y = ((bc.yOff - cameraY * speeds[bc.layer]) % (CFG.H*3) + CFG.H*3) % (CFG.H*3) - CFG.H*0.5;
      c.save(); c.translate(bc.x, y); c.rotate(bc.angle); c.globalAlpha = bc.alpha;
      drawCrystalShape(c, 0, 0, bc.size, lerpColor(pal.bg, pal.wall, 0.3+bc.layer*0.2));
      c.globalAlpha = 1; c.restore();
    }
  }

  function drawCaveWalls(c, pal) {
    const step = 4, topY = cameraY;
    c.beginPath(); c.moveTo(0, 0);
    for (let sy = 0; sy <= CFG.H; sy += step) { c.lineTo(caveWalls(topY+sy).left, sy); }
    c.lineTo(0, CFG.H); c.closePath();
    let wg = c.createLinearGradient(0,0,80,0); wg.addColorStop(0,rgb(pal.wall)); wg.addColorStop(1,rgb(pal.wall,0.4)); c.fillStyle = wg; c.fill();
    c.beginPath();
    for (let sy = 0; sy <= CFG.H; sy += step) { const w = caveWalls(topY+sy); if(sy===0) c.moveTo(w.left,sy); else c.lineTo(w.left,sy); }
    c.strokeStyle = rgb(pal.crystal, 0.15); c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(CFG.W, 0);
    for (let sy = 0; sy <= CFG.H; sy += step) { c.lineTo(caveWalls(topY+sy).right, sy); }
    c.lineTo(CFG.W, CFG.H); c.closePath();
    wg = c.createLinearGradient(CFG.W,0,CFG.W-80,0); wg.addColorStop(0,rgb(pal.wall)); wg.addColorStop(1,rgb(pal.wall,0.4)); c.fillStyle = wg; c.fill();
    c.beginPath();
    for (let sy = 0; sy <= CFG.H; sy += step) { const w = caveWalls(topY+sy); if(sy===0) c.moveTo(w.right,sy); else c.lineTo(w.right,sy); }
    c.strokeStyle = rgb(pal.crystal, 0.15); c.lineWidth = 2; c.stroke();
    // Mineral veins
    c.strokeStyle = rgb(pal.crystal, 0.15); c.lineWidth = 1;
    for (let sy = 0; sy < CFG.H; sy += 30) {
      const wy = topY+sy, w = caveWalls(wy), vs = (Math.floor(wy/30)*13)%100;
      if (vs < 50) { c.beginPath(); const vx=w.left+2+(vs%12); c.moveTo(vx,sy); for(let v=1;v<=3;v++) c.lineTo(vx+Math.sin(wy*0.1+v*1.7)*4,sy+v*8); c.stroke(); }
      if (vs > 40) { c.beginPath(); const vx=w.right-2-(vs%10); c.moveTo(vx,sy); for(let v=1;v<=3;v++) c.lineTo(vx+Math.sin(wy*0.13+v*2.1)*4,sy+v*8); c.stroke(); }
    }
    // Bumps
    c.fillStyle = rgb(pal.wall, 0.5);
    for (let sy = 0; sy < CFG.H; sy += 25) {
      const wy = topY+sy, w = caveWalls(wy), bs = (Math.floor(wy/25)*7)%100;
      if (bs < 40) { c.beginPath(); c.moveTo(w.left,sy-(4+bs%6)); c.lineTo(w.left+(6+bs%8),sy); c.lineTo(w.left,sy+(4+bs%6)); c.fill(); }
      if (bs > 50) { c.beginPath(); c.moveTo(w.right,sy-(4+bs%5)); c.lineTo(w.right-(6+bs%7),sy); c.lineTo(w.right,sy+(4+bs%5)); c.fill(); }
    }
    // Crystal clusters
    for (let sy = 0; sy < CFG.H; sy += 150) {
      const wy = topY+sy, w = caveWalls(wy), cs = (Math.floor(wy/150)*11)%100;
      if (cs < 60) { for(let ci=0;ci<2+(cs%2);ci++){c.save();c.globalAlpha=0.5;c.rotate((cs+ci)*0.3-0.5);drawCrystalShape(c,w.left+2+ci*5,sy+(ci-1)*6,4+(cs+ci*3)%5,pal.crystal);c.restore();} }
      if (cs > 35) { for(let ci=0;ci<2+((cs+5)%2);ci++){c.save();c.globalAlpha=0.5;c.rotate(-(cs+ci)*0.3+0.5);drawCrystalShape(c,w.right-2-ci*5,sy+(ci-1)*6,4+(cs+ci*7)%5,pal.crystal);c.restore();} }
    }
  }

  function drawWaterDrops(c, pal) {
    for (const d of waterDrops) { const sy=d.y-cameraY; if(sy<-10||sy>CFG.H+10) continue; c.fillStyle=rgb(pal.crystal,0.3); c.beginPath(); c.ellipse(d.x,sy,2,4,0,0,Math.PI*2); c.fill(); }
  }

  function drawFogBands(c, pal) {
    const t = performance.now()/1000;
    c.save();
    for (let i = 0; i < 4; i++) { c.fillStyle = rgb(pal.ambient, 0.03+i*0.01); c.fillRect(Math.sin(t*(0.3+i*0.15)+i*1.8)*40-20, CFG.H*(0.15+i*0.22)+Math.sin(t*0.2+i)*15-20, CFG.W+40, 40); }
    c.restore();
  }

  function drawCaveHazards(c, pal) {
    const topY = cameraY;
    for (let sy = 0; sy <= CFG.H; sy += 8) {
      const wy = topY+sy, w = caveWalls(wy);
      if (isDarkZone(wy)) { const cyc=500-Math.min(score*2,200), ph=((((wy+200)%cyc)+cyc)%cyc); c.fillStyle=`rgba(120,20,60,${Math.sin((ph/80)*Math.PI)*0.12})`; c.fillRect(w.left,sy,w.right-w.left,8); }
      if (isBottleneck(wy)) { const sq=bottleneckSqueeze(wy); if(sq>5){const g=(sq/80)*0.2; c.fillStyle=`rgba(255,140,40,${g})`; c.fillRect(w.left,sy,8,8); c.fillRect(w.right-8,sy,8,8);} }
    }
  }

  function drawCrystalShape(c, x, y, size, col) {
    c.beginPath(); c.moveTo(x, y-size); c.lineTo(x+size*0.5, y-size*0.2); c.lineTo(x+size*0.35, y+size*0.6); c.lineTo(x-size*0.35, y+size*0.6); c.lineTo(x-size*0.5, y-size*0.2); c.closePath();
    const g = c.createLinearGradient(x-size*0.5, y-size, x+size*0.5, y+size*0.6);
    g.addColorStop(0, rgb(col, 0.7)); g.addColorStop(0.5, rgb(col, 0.4)); g.addColorStop(1, rgb(col, 0.15));
    c.fillStyle = g; c.fill();
    c.strokeStyle = rgb([255,255,255], 0.15); c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y-size); c.lineTo(x-size*0.5, y-size*0.2); c.stroke();
  }

  function drawSpikes(c, pal) {
    for (const sp of spikes) {
      const sy = sp.y-cameraY, tipSY = sp.tipY-cameraY;
      if (sy < -80 || sy > CFG.H+80) continue;
      const px = -Math.sin(sp.angle)*6, py = Math.cos(sp.angle)*6;
      c.beginPath(); c.moveTo(sp.x+px,sy+py); c.lineTo(sp.tipX,tipSY); c.lineTo(sp.x-px,sy-py); c.closePath();
      const sg = c.createLinearGradient(sp.x,sy,sp.tipX,tipSY);
      sg.addColorStop(0,rgb(pal.wall,0.9)); sg.addColorStop(0.6,rgb(pal.crystal,0.6)); sg.addColorStop(1,rgb([255,255,255],0.8));
      c.fillStyle = sg; c.fill();
      c.strokeStyle = rgb(pal.crystal, 0.3); c.lineWidth = 1; c.beginPath(); c.moveTo(sp.x+px,sy+py); c.lineTo(sp.tipX,tipSY); c.stroke();
      c.beginPath(); c.arc(sp.tipX,tipSY,3,0,Math.PI*2); c.fillStyle = rgb(pal.crystal,0.5); c.fill();
    }
  }

  function drawShards(c, pal) {
    const t = performance.now()/1000;
    for (const s of shards) {
      if (s.collected) continue;
      const sy = s.y-cameraY+Math.sin(t*3+s.bobPhase)*4;
      if (sy < -30 || sy > CFG.H+30) continue;
      c.save(); c.translate(s.x, sy); c.rotate(t*2+s.bobPhase);
      const glow = c.createRadialGradient(0,0,0,0,0,18); glow.addColorStop(0,rgb(pal.crystal,0.4)); glow.addColorStop(1,rgb(pal.crystal,0));
      c.fillStyle = glow; c.fillRect(-18,-18,36,36);
      c.beginPath(); c.moveTo(0,-9); c.lineTo(6,0); c.lineTo(0,9); c.lineTo(-6,0); c.closePath();
      const dg = c.createLinearGradient(-6,-9,6,9); dg.addColorStop(0,rgb([255,255,255],0.9)); dg.addColorStop(0.5,rgb(pal.crystal,0.9)); dg.addColorStop(1,rgb(pal.crystal,0.5));
      c.fillStyle = dg; c.fill(); c.strokeStyle = rgb([255,255,255],0.6); c.lineWidth = 1; c.stroke();
      c.strokeStyle = rgb([255,255,255],0.25); c.lineWidth = 0.5; c.beginPath(); c.moveTo(0,-9); c.lineTo(0,9); c.moveTo(-6,0); c.lineTo(6,0); c.stroke();
      c.strokeStyle = `hsl(${(t*60)%360},80%,70%)`; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0,-9); c.lineTo(6,0); c.lineTo(0,9); c.lineTo(-6,0); c.closePath(); c.stroke();
      c.restore();
    }
  }

  function drawSpecialPickups(c, pal) {
    const t = performance.now()/1000;
    for (const sp of specialPickups) {
      if (sp.collected) continue;
      const sy = sp.y - cameraY + Math.sin(t*2+sp.bobPhase)*5;
      if (sy < -30 || sy > CFG.H+30) continue;
      const pulse = 8 + Math.sin(t*3+sp.bobPhase)*4;
      c.save();
      if (sp.type === "shield") {
        c.shadowBlur = pulse; c.shadowColor = "rgba(100,180,255,0.6)";
        c.strokeStyle = "rgba(100,180,255,0.8)"; c.lineWidth = 2.5;
        c.beginPath(); c.arc(sp.x, sy, 10, 0, Math.PI*2); c.stroke();
        c.strokeStyle = "rgba(200,230,255,0.4)"; c.lineWidth = 1;
        c.beginPath(); c.arc(sp.x, sy, 14, 0, Math.PI*2); c.stroke();
        c.fillStyle = "rgba(100,180,255,0.3)"; c.beginPath(); c.arc(sp.x,sy,8,0,Math.PI*2); c.fill();
      } else if (sp.type === "teleport") {
        c.shadowBlur = pulse; c.shadowColor = "rgba(200,150,255,0.6)";
        c.strokeStyle = "rgba(200,150,255,0.8)"; c.lineWidth = 2;
        const spiral = t * 3 + sp.bobPhase;
        for (let i = 0; i < 3; i++) { const a = spiral+i*Math.PI*2/3; c.beginPath(); c.arc(sp.x+Math.cos(a)*5,sy+Math.sin(a)*5,3,0,Math.PI*2); c.stroke(); }
        c.fillStyle = "rgba(200,150,255,0.5)"; c.beginPath(); c.arc(sp.x,sy,4,0,Math.PI*2); c.fill();
      } else if (sp.type === "lightbomb") {
        c.shadowBlur = pulse+4; c.shadowColor = "rgba(255,255,100,0.7)";
        const lg = c.createRadialGradient(sp.x,sy,0,sp.x,sy,12);
        lg.addColorStop(0,"rgba(255,255,220,0.9)"); lg.addColorStop(0.5,"rgba(255,200,50,0.6)"); lg.addColorStop(1,"rgba(255,150,0,0)");
        c.fillStyle = lg; c.beginPath(); c.arc(sp.x,sy,12,0,Math.PI*2); c.fill();
        // Sun rays
        c.strokeStyle = "rgba(255,220,100,0.5)"; c.lineWidth = 1;
        for (let i = 0; i < 8; i++) { const a = t*2+i*Math.PI/4; c.beginPath(); c.moveTo(sp.x+Math.cos(a)*8,sy+Math.sin(a)*8); c.lineTo(sp.x+Math.cos(a)*15,sy+Math.sin(a)*15); c.stroke(); }
      } else if (sp.type === "dark") {
        const da = 0.5 + Math.sin(t*2)*0.3;
        c.globalAlpha = da;
        c.shadowBlur = pulse; c.shadowColor = "rgba(50,0,80,0.6)";
        const dg = c.createRadialGradient(sp.x,sy,0,sp.x,sy,10);
        dg.addColorStop(0,"rgba(20,0,30,0.9)"); dg.addColorStop(1,"rgba(60,0,100,0)");
        c.fillStyle = dg; c.beginPath(); c.arc(sp.x,sy,10,0,Math.PI*2); c.fill();
        c.fillStyle = "rgba(0,0,0,0.8)"; c.beginPath(); c.arc(sp.x,sy,5,0,Math.PI*2); c.fill();
        c.globalAlpha = 1;
      }
      c.shadowBlur = 0;
      c.restore();
    }
  }

  function drawShadows(c, pal) {
    const topY = cameraY, t = performance.now()/1000, plSY = player.y-cameraY;
    for (const sh of shadows) {
      const sy = sh.y-topY; if (sy < -60 || sy > CFG.H+60) continue;
      c.save(); c.strokeStyle = "rgba(15,3,30,0.6)"; c.lineWidth = 2;
      for (let ti = 0; ti < 4; ti++) {
        const ba = [0,Math.PI*0.5,Math.PI,Math.PI*1.5][ti]+Math.sin(t*1.5+ti*1.3)*0.4;
        c.beginPath(); c.moveTo(sh.x+Math.cos(ba)*sh.r*0.5, sy+Math.sin(ba)*sh.r*0.5);
        for (let s = 1; s <= 5; s++) { const f=s/5, wo=Math.sin(t*3+ti*2+s*0.8)*6*f; c.lineTo(sh.x+Math.cos(ba)*(sh.r*0.5+sh.r*1.2*f)+Math.cos(ba+Math.PI*0.5)*wo, sy+Math.sin(ba)*(sh.r*0.5+sh.r*1.2*f)+Math.sin(ba+Math.PI*0.5)*wo); }
        c.stroke();
      }
      c.restore();
      const bg = c.createRadialGradient(sh.x,sy,0,sh.x,sy,sh.r);
      bg.addColorStop(0,"rgba(10,0,20,0.9)"); bg.addColorStop(0.6,"rgba(20,5,35,0.5)"); bg.addColorStop(1,"rgba(30,10,50,0)");
      c.fillStyle = bg; c.beginPath(); c.arc(sh.x,sy,sh.r,0,Math.PI*2); c.fill();
      const eyeY = sy-2+Math.sin(sh.eyePhase)*1.5, eyeCol = zoneIndex()>=3?[255,120,60]:[255,50,50];
      const dxP=player.x-sh.x, dyP=plSY-sy, dP=Math.sqrt(dxP*dxP+dyP*dyP)||1;
      for (const ex of [-5, 5]) {
        const eg = c.createRadialGradient(sh.x+ex,eyeY,0,sh.x+ex,eyeY,6);
        eg.addColorStop(0,rgb(eyeCol,0.9)); eg.addColorStop(0.5,rgb(eyeCol,0.3)); eg.addColorStop(1,rgb(eyeCol,0));
        c.fillStyle = eg; c.fillRect(sh.x+ex-6,eyeY-6,12,12);
        c.beginPath(); c.arc(sh.x+ex+(dxP/dP)*1.5,eyeY+(dyP/dP)*1.5,2,0,Math.PI*2); c.fillStyle=rgb(eyeCol); c.fill();
      }
    }
  }

  function drawStalactites(c, pal) {
    for (const st of stalactites) {
      const sy = st.y-cameraY; if (sy < -60 || sy > CFG.H+60) continue;
      const shake = st.shaking ? rand(-2,2) : 0;
      c.save(); c.translate(st.x+shake, sy);
      c.beginPath(); c.moveTo(-st.size*0.5,-st.size*0.3); c.lineTo(0,st.size); c.lineTo(st.size*0.5,-st.size*0.3); c.closePath();
      const sg = c.createLinearGradient(0,-st.size*0.3,0,st.size);
      sg.addColorStop(0,rgb(pal.wall,0.9)); sg.addColorStop(0.7,rgb(pal.crystal,0.5)); sg.addColorStop(1,rgb([255,255,255],0.7));
      c.fillStyle = sg; c.fill(); c.strokeStyle = rgb(pal.crystal,0.3); c.lineWidth = 1; c.stroke();
      if (st.shaking) { const wg=c.createRadialGradient(0,st.size*0.3,0,0,st.size*0.3,st.size*1.5); wg.addColorStop(0,"rgba(255,100,50,0.3)"); wg.addColorStop(1,"rgba(255,100,50,0)"); c.fillStyle=wg; c.fillRect(-st.size*1.5,-st.size,st.size*3,st.size*3); }
      c.restore();
    }
  }

  function drawPlayer(c, pal) {
    const screenY = player.y - cameraY, t = performance.now()/1000;
    const rot = Math.sin(t*2)*0.12, pulseScale = 1+pulseAnim*0.8;
    c.save(); c.translate(player.x, screenY); c.rotate(rot); c.scale(pulseScale, pulseScale);
    currentSkin.draw(c, pal, pulseScale);
    c.restore();
    // Shield ring
    if (shieldActive) {
      c.save(); c.strokeStyle = `rgba(100,180,255,${0.4+Math.sin(t*5)*0.2})`; c.lineWidth = 2;
      c.shadowBlur = 8; c.shadowColor = "rgba(100,180,255,0.5)";
      c.beginPath(); c.arc(player.x, screenY, CFG.PLAYER_R+6, 0, Math.PI*2); c.stroke();
      c.shadowBlur = 0; c.restore();
    }
  }

  function drawParticlesOnScene(c) {
    for (const p of particles) {
      if (!p.active) continue;
      const drawY = (state === STATE.MENU && p.type === "dust") ? p.y : p.y - cameraY;
      const lifeRatio = p.life / p.maxLife, alpha = p.alpha * lifeRatio;
      if (alpha < 0.01) continue;
      c.globalAlpha = alpha;
      if (p.type === "nova" || p.type === "burst" || p.type === "shatter") {
        const g = c.createRadialGradient(p.x,drawY,0,p.x,drawY,p.size);
        g.addColorStop(0,rgb(p.color,1)); g.addColorStop(1,rgb(p.color,0));
        c.fillStyle = g; c.fillRect(p.x-p.size,drawY-p.size,p.size*2,p.size*2);
      } else if (p.type === "wisp") {
        c.fillStyle = rgb(p.color,0.6); c.beginPath(); c.arc(p.x,drawY,p.size*lifeRatio,0,Math.PI*2); c.fill();
      } else {
        c.fillStyle = rgb(p.color); c.beginPath(); c.arc(p.x,drawY,p.size*(0.5+lifeRatio*0.5),0,Math.PI*2); c.fill();
      }
      c.globalAlpha = 1;
    }
  }

  function drawVignette(c) {
    const g = c.createRadialGradient(CFG.W/2,CFG.H/2,CFG.H*0.3,CFG.W/2,CFG.H/2,CFG.H*0.75);
    g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,0.55)");
    c.fillStyle = g; c.fillRect(0,0,CFG.W,CFG.H);
  }

  function drawChromaticAberration(c) {
    c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.06;
    c.drawImage(canvas, chromAb, 0); c.drawImage(canvas, -chromAb, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  }

  function drawLightMeter(c, pal) {
    const barW=100,barH=6,barX=(CFG.W-barW)/2,barY=14;
    const fill = (lightRadius-CFG.LIGHT_MIN)/(CFG.LIGHT_MAX-CFG.LIGHT_MIN);
    c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.roundRect(barX-1,barY-1,barW+2,barH+2,4); c.fill();
    const fc = fill > 0.3 ? pal.crystal : [255,80,80];
    const bg = c.createLinearGradient(barX,barY,barX+barW*fill,barY);
    bg.addColorStop(0,rgb(fc,0.9)); bg.addColorStop(1,rgb(fc,0.5));
    c.fillStyle = bg; c.beginPath(); c.roundRect(barX,barY,barW*fill,barH,3); c.fill();
    if (fill > 0.1) { c.shadowColor=rgb(fc,0.6); c.shadowBlur=8; c.beginPath(); c.roundRect(barX,barY,barW*fill,barH,3); c.fill(); c.shadowBlur=0; }
  }

  function drawPowerUpIndicators(c, pal) {
    if (!shieldActive) return;
    const remaining = shieldTimer / 8;
    c.fillStyle = "rgba(0,0,0,0.4)"; c.fillRect(4, 26, 70, 12);
    c.fillStyle = "rgba(100,180,255,0.7)"; c.fillRect(4, 26, 70*Math.max(0,remaining), 12);
    c.fillStyle = "#fff"; c.font = "bold 8px 'Trebuchet MS'"; c.textAlign = "left"; c.fillText("SHIELD", 7, 35);
  }

  function drawMenu(c, pal) {
    const t = menuTime;
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = rgb(pal.crystal, 0.7); c.shadowBlur = 30;
    c.font = "bold 52px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb([255,255,255], 0.95);
    c.fillText("LUMINA", CFG.W/2, CFG.H*0.32); c.shadowBlur = 0;
    c.font = "16px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb(pal.crystal, 0.7);
    c.fillText("D E E P   R A D I A N C E", CFG.W/2, CFG.H*0.39);
    c.font = "15px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb([200,210,250], 0.4+Math.sin(t*3)*0.3);
    c.fillText(isMobile ? "Tap to Begin" : "Press Space or Tap to Begin", CFG.W/2, CFG.H*0.55);
    c.font = "13px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb([160,170,210], 0.5);
    c.fillText(isMobile ? "Touch Left/Right to Move \u2022 Tap Center to Pulse" : "\u2190 \u2192  Move     Space  Pulse Light", CFG.W/2, CFG.H*0.65);
    // Preview player
    const bobY = Math.sin(t*1.5)*8;
    c.save(); c.translate(CFG.W/2, CFG.H*0.46+bobY); c.rotate(Math.sin(t*2)*0.1);
    const ps = 1.5+Math.sin(t*2)*0.1; c.scale(ps, ps);
    currentSkin.draw(c, pal, ps);
    c.restore(); c.restore();
  }

  function drawPaused(c) {
    c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0,0,CFG.W,CFG.H);
    c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "bold 36px 'Trebuchet MS', sans-serif"; c.fillStyle = "rgba(200,210,250,0.9)"; c.fillText("PAUSED", CFG.W/2, CFG.H*0.45);
    c.font = "14px 'Trebuchet MS', sans-serif"; c.fillStyle = "rgba(200,210,250,0.5)"; c.fillText("Press Escape to Resume", CFG.W/2, CFG.H*0.53);
  }

  function drawGameOver(c, pal) {
    c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(0,0,CFG.W,CFG.H);
    c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = rgb(pal.crystal, 0.6); c.shadowBlur = 20;
    c.font = "bold 42px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb([255,255,255], 0.9); c.fillText(score, CFG.W/2, CFG.H*0.35); c.shadowBlur = 0;
    c.font = "15px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb(pal.crystal, 0.7); c.fillText("D E P T H   R E A C H E D", CFG.W/2, CFG.H*0.42);
    c.font = "14px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb([200,210,250], 0.5); c.fillText("Best: "+bestScore, CFG.W/2, CFG.H*0.48);
    const zi = Math.min(Math.floor(score/CFG.ZONE_LEN), ZONES.length-1);
    c.fillStyle = rgb(ZONES[zi].crystal, 0.6); c.fillText(ZONES[zi].name, CFG.W/2, CFG.H*0.53);
    c.font = "14px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb([200,210,250], 0.35+Math.sin(performance.now()/1000*3)*0.25);
    c.fillText(isMobile ? "Tap to Restart" : "Press Space or Tap to Restart", CFG.W/2, CFG.H*0.63);
  }

  function drawZoneAnnounce(c, pal) {
    c.save(); c.textAlign = "center"; c.textBaseline = "middle"; c.globalAlpha = Math.min(1, zoneAnnounceTmr*0.8);
    c.shadowColor = rgb(pal.crystal, 0.6); c.shadowBlur = 15;
    c.font = "bold 22px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb(pal.crystal, 0.9);
    c.fillText(zoneAnnounceName, CFG.W/2, CFG.H*0.15); c.shadowBlur = 0; c.globalAlpha = 1; c.restore();
  }

  function drawTouchGuide(c, pal) {
    const guideAlpha = touchActive ? 0.15 : 0.06;
    c.save(); c.globalAlpha = guideAlpha; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "22px 'Trebuchet MS', sans-serif"; c.fillStyle = rgb([200,210,250], 1);
    c.fillText("\u25C0", CFG.W*0.15, CFG.H-60); c.fillText("\u25B6", CFG.W*0.85, CFG.H-60);
    c.font = "14px 'Trebuchet MS', sans-serif"; c.fillText("PULSE", CFG.W*0.5, CFG.H-60);
    if (touchActive && touchMoveDir !== 0) { c.globalAlpha = 0.06; c.fillStyle = rgb(pal.crystal, 1); if (touchMoveDir===-1) c.fillRect(0,0,CFG.W*0.33,CFG.H); else c.fillRect(CFG.W*0.67,0,CFG.W*0.33,CFG.H); }
    c.globalAlpha = 1; c.restore();
  }

  // ── Game Loop ─────────────────────────────────────────────
  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === STATE.PLAYING) state = STATE.PAUSED;
    if (!document.hidden) lastTime = performance.now();
  });

  init();
})();

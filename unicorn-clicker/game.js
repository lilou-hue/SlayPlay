/* ── Unicorn Fart Clicker — Game ── */
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 480, H = 640;
  canvas.width = W;
  canvas.height = H;

  /* ────────────────── Skins ────────────────── */
  const SKINS = [
    { key: 'unicorn',      name: 'Unicorn',       cost: 0,      fartDx: -40, fartDy: 10 },
    { key: 'tuna',          name: 'Tuna',           cost: 1000,   fartDx: -50, fartDy: 5 },
    { key: 'volleyball',    name: 'Volleyball',     cost: 5000,   fartDx: 0,   fartDy: 35 },
    { key: 'spidermonkey',  name: 'Spidermonkey',   cost: 25000,  fartDx: -35, fartDy: 20 },
    { key: 'chewbacca',     name: 'Chewbacca',      cost: 100000, fartDx: -35, fartDy: 15 },
  ];

  /* ────────────────── State ────────────────── */
  const SAVE_KEY = 'unicornClickerSave';
  const defaultState = () => ({
    sp: 0,
    lifetimeSP: 0,
    tapPower: 1,
    tapMultiplier: 1,
    spPerSec: 0,
    evolution: 0,
    skin: 'unicorn',
    unlockedSkins: ['unicorn'],
    upgrades: {
      beefyBeans: 0, glitterGut: 0, autoFairy: 0, rainbowTurbo: 0, goldenHay: 0,
      cloudCompressor: false, enchantedBurrito: 0, quantumGas: 0,
      megaMultiplier: false, criticalFart: false,
    },
    totalClicks: 0,
    lastSave: Date.now(),
  });
  let state = defaultState();

  /* ────────────────── Upgrades ────────────────── */
  const UPGRADES = [
    { key: 'beefyBeans',      name: 'Beefy Beans',       desc: '+1 SP per tap',       baseCost: 10 },
    { key: 'glitterGut',      name: 'Glitter Gut',        desc: '+1x tap multiplier',  baseCost: 100 },
    { key: 'autoFairy',       name: 'Auto-Poot Fairy',    desc: '+1 SP/sec',           baseCost: 50 },
    { key: 'rainbowTurbo',    name: 'Rainbow Turbo',      desc: '+5 SP/sec',           baseCost: 500 },
    { key: 'goldenHay',       name: 'Golden Hay',         desc: '+20 SP/sec',          baseCost: 2500 },
    { key: 'cloudCompressor', name: 'Cloud Compressor',   desc: 'All taps x2 (once)',  baseCost: 10000,  oneTime: true },
    { key: 'enchantedBurrito',name: 'Enchanted Burrito',  desc: '+50 SP/sec',          baseCost: 15000 },
    { key: 'quantumGas',      name: 'Quantum Gas',        desc: '+100 SP/sec',         baseCost: 75000 },
    { key: 'megaMultiplier',  name: 'Mega Multiplier',    desc: 'All taps x3 (once)',  baseCost: 250000, oneTime: true },
    { key: 'criticalFart',    name: 'Critical Fart',      desc: '10% chance 10x tap',  baseCost: 500000, oneTime: true },
  ];

  function upgradeCost(u) {
    if (u.oneTime) return u.baseCost;
    return Math.floor(u.baseCost * Math.pow(1.15, state.upgrades[u.key]));
  }

  function recalcPassive() {
    state.spPerSec =
      state.upgrades.autoFairy * 1 + state.upgrades.rainbowTurbo * 5 +
      state.upgrades.goldenHay * 20 + state.upgrades.enchantedBurrito * 50 +
      state.upgrades.quantumGas * 100;
  }

  function applyUpgrade(key) {
    if (key === 'beefyBeans') state.tapPower = 1 + state.upgrades.beefyBeans;
    else if (key === 'glitterGut') state.tapMultiplier = 1 + state.upgrades.glitterGut;
    else recalcPassive();
  }

  function effectiveTap() {
    let v = state.tapPower * state.tapMultiplier;
    if (state.upgrades.cloudCompressor) v *= 2;
    if (state.upgrades.megaMultiplier) v *= 3;
    return Math.floor(v);
  }

  /* ────────────────── Evolutions ────────────────── */
  const EVOLUTIONS = [
    { name: 'Baby Form',          threshold: 0,           cost: 500 },
    { name: 'Sparkle Form',       threshold: 500,         cost: 5000 },
    { name: 'Majestic Form',      threshold: 5000,        cost: 50000 },
    { name: 'Cosmic Form',        threshold: 50000,       cost: 500000 },
    { name: 'Fart God',           threshold: 500000,      cost: 5000000 },
    { name: 'Nebula Beast',       threshold: 5000000,     cost: 50000000 },
    { name: 'Dimension Ripper',   threshold: 50000000,    cost: 500000000 },
    { name: 'The Omnifarter',     threshold: 500000000,   cost: Infinity },
  ];
  const MAX_EVO = EVOLUTIONS.length - 1;

  function canEvolve() {
    if (state.evolution >= MAX_EVO) return false;
    const next = EVOLUTIONS[state.evolution + 1];
    return state.lifetimeSP >= next.threshold && state.sp >= EVOLUTIONS[state.evolution].cost;
  }

  /* ────────────────── Particles ────────────────── */
  let particles = [];
  let floatingTexts = [];

  function spawnFartParticles(x, y, count) {
    const shapes = ['ellipse', 'cloud', 'star', 'sparkle'];
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y: y + Math.random() * 10 - 5,
        vx: -1.5 - Math.random() * 2.5,
        vy: -0.5 - Math.random() * 2,
        size: 8 + Math.random() * 12 + state.evolution * 2,
        hue: Math.random() * 360,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 2 + Math.random() * 3,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        spin: (Math.random() - 0.5) * 4,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, life: 1, vy: -1.5, color: color || '#ffd700' });
  }

  /* ────────────────── Animation state ────────────────── */
  let shakeAmount = 0;
  let sparkleTimer = 0;
  let shopOpen = false;
  let skinsOpen = false;
  let shopScroll = 0;

  /* ────────────────── Restart confirm state ────────────────── */
  let confirmRestart = false;

  /* ────────────────── Unicorn animation ────────────────── */
  let squash = 0; // 0 = idle, positive = squashing
  const UNICORN_X = W * 0.48;
  const UNICORN_Y = H * 0.47;
  const UNICORN_RADIUS = 70 + 10; // hitbox
  const CHAR_X = UNICORN_X;
  const CHAR_Y = UNICORN_Y;
  const CHAR_RADIUS = UNICORN_RADIUS;

  /* ────────────────── Background stars ────────────────── */
  const stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.65,
    size: 0.5 + Math.random() * 1.5,
    twinkle: Math.random() * Math.PI * 2,
    isBright: Math.random() < 0.15, // some stars have cross-shaped sparkle
  }));

  /* ────────────────── Shooting stars ────────────────── */
  let shootingStars = [];
  let shootStarTimer = 0;

  /* ────────────────── Flowers ────────────────── */
  const flowers = Array.from({ length: 14 }, () => ({
    x: 20 + Math.random() * (W - 40),
    y: H * 0.78 + Math.random() * (H * 0.10),
    size: 4 + Math.random() * 4,
    hue: Math.random() * 360,
    phase: Math.random() * Math.PI * 2,
    petals: 5 + Math.floor(Math.random() * 3), // 5-7 petals
    stemH: 8 + Math.random() * 10,
  }));

  /* ────────────────── Grass blades ────────────────── */
  const grassBlades = Array.from({ length: 50 }, () => ({
    x: Math.random() * W,
    baseY: H * 0.76 + Math.random() * 6 - 3,
    h: 6 + Math.random() * 10,
    lean: (Math.random() - 0.5) * 0.4,
    phase: Math.random() * Math.PI * 2,
    shade: Math.random() * 0.3,
  }));

  /* ────────────────── Mushrooms ────────────────── */
  const mushrooms = Array.from({ length: 4 }, () => ({
    x: 30 + Math.random() * (W - 60),
    y: H * 0.80 + Math.random() * (H * 0.08),
    size: 4 + Math.random() * 3,
    hue: Math.random() < 0.5 ? 0 : 280, // red or purple
    spots: Math.floor(2 + Math.random() * 3),
  }));

  let lastTime = performance.now();
  let gameTime = 0;
  let saveTimer = 0;

  /* ────────────────── Save / Load ────────────────── */
  function save() {
    state.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      const def = defaultState();
      for (const k in def) {
        if (k === 'upgrades') state.upgrades = { ...def.upgrades, ...s.upgrades };
        else if (k === 'unlockedSkins') state.unlockedSkins = s.unlockedSkins || ['unicorn'];
        else if (s[k] !== undefined) state[k] = s[k];
      }
      recalcPassive();
      if (s.lastSave) {
        const elapsed = Math.min((Date.now() - s.lastSave) / 1000, 8 * 3600);
        if (elapsed > 1 && state.spPerSec > 0) {
          const earned = Math.floor(state.spPerSec * elapsed);
          state.sp += earned;
          state.lifetimeSP += earned;
          spawnFloatingText(W / 2, H / 2, '+' + formatNum(earned) + ' offline!');
        }
      }
    } catch(e) {}
  }

  function resetGame() {
    state = defaultState();
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
    particles = [];
    floatingTexts = [];
    shootingStars = [];
    squash = 0;
    shakeAmount = 0;
    shopOpen = false;
    skinsOpen = false;
    shopScroll = 0;
    confirmRestart = false;
    sparkleTimer = 0;
    spawnFloatingText(W / 2, H * 0.4, 'Fresh start!');
  }

  /* ────────────────── Number formatting ────────────────── */
  function formatNum(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
  }

  function currentSkin() { return SKINS.find(s => s.key === state.skin) || SKINS[0]; }

  /* ════════════════════════════════════════════════════
     DRAWING
     ════════════════════════════════════════════════════ */

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2d1b69'); grad.addColorStop(0.5, '#1a0f40'); grad.addColorStop(1, '#0f0a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Nebula clouds (soft, subtle colored blobs)
    ctx.globalAlpha = 0.06;
    const nebulae = [
      { x: W * 0.2, y: H * 0.15, r: 90, color: '#ff69b4' },
      { x: W * 0.75, y: H * 0.3, r: 70, color: '#8b5cf6' },
      { x: W * 0.5, y: H * 0.08, r: 110, color: '#4f46e5' },
      { x: W * 0.85, y: H * 0.1, r: 60, color: '#c084fc' },
    ];
    for (const n of nebulae) {
      const drift = Math.sin(gameTime * 0.3 + n.x) * 5;
      const ng = ctx.createRadialGradient(n.x + drift, n.y, 0, n.x + drift, n.y, n.r);
      ng.addColorStop(0, n.color);
      ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng;
      ctx.fillRect(n.x - n.r + drift, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.globalAlpha = 1;

    // Aurora shimmer (horizontal waves near top)
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 3; i++) {
      const ay = 60 + i * 40;
      const hue = (gameTime * 15 + i * 40) % 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, 65%)`;
      ctx.lineWidth = 12 + i * 4;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = ay + Math.sin(x * 0.015 + gameTime * 0.4 + i * 1.5) * 20
                     + Math.sin(x * 0.008 + gameTime * 0.2) * 10;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Moon
    const moonX = W * 0.85, moonY = H * 0.1, moonR = 22;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 3);
    moonGlow.addColorStop(0, 'rgba(255,250,230,0.08)');
    moonGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
    ctx.fill();
    // Moon body
    const mg = ctx.createRadialGradient(moonX - 4, moonY - 4, 2, moonX, moonY, moonR);
    mg.addColorStop(0, '#fff8e7');
    mg.addColorStop(0.7, '#f0e6d0');
    mg.addColorStop(1, '#d4c4a8');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    // Moon craters
    ctx.fillStyle = 'rgba(180,165,140,0.25)';
    ctx.beginPath(); ctx.arc(moonX - 6, moonY - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(moonX + 7, moonY + 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(moonX + 2, moonY - 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(moonX - 3, moonY + 7, 2, 0, Math.PI * 2); ctx.fill();

    // Stars (with cross sparkle on bright ones)
    for (const s of stars) {
      const a = 0.3 + Math.sin(gameTime * 2 + s.twinkle) * 0.25;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      // Bright stars get a cross sparkle
      if (s.isBright) {
        const sparkA = a * 0.6;
        ctx.strokeStyle = `rgba(255,255,255,${sparkA})`;
        ctx.lineWidth = 0.5;
        const len = s.size * 3 + Math.sin(gameTime * 3 + s.twinkle) * 2;
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
        ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
        ctx.stroke();
      }
    }

    // Shooting stars
    for (const ss of shootingStars) {
      const trail = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 8, ss.y - ss.vy * 8);
      trail.addColorStop(0, `rgba(255,255,255,${ss.life})`);
      trail.addColorStop(1, 'transparent');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 8, ss.y - ss.vy * 8);
      ctx.stroke();
      // Bright head
      ctx.fillStyle = `rgba(255,255,255,${ss.life})`;
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGround() {
    const groundY = H * 0.76;
    const gg = ctx.createLinearGradient(0, groundY, 0, H);
    gg.addColorStop(0, '#2ecc71'); gg.addColorStop(0.3, '#27ae60'); gg.addColorStop(1, '#1a7a42');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      ctx.lineTo(x, groundY + Math.sin(x * 0.03 + gameTime * 0.5) * 4 + Math.sin(x * 0.07) * 2);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Ground texture (subtle dark patches)
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 8; i++) {
      const px = (i * 67 + 20) % W;
      const py = groundY + 20 + (i * 31) % (H - groundY - 30);
      ctx.fillStyle = '#0a3a1a';
      ctx.beginPath();
      ctx.ellipse(px, py, 20 + i * 3, 6, i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Grass blades (individual tufts along the top edge)
    for (const g of grassBlades) {
      const sway = Math.sin(gameTime * 1.8 + g.phase) * 3 * (g.h / 16);
      const shade = 0.45 + g.shade;
      ctx.strokeStyle = `hsl(130, 55%, ${35 + g.shade * 30}%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.x, g.baseY);
      ctx.quadraticCurveTo(
        g.x + g.lean * g.h + sway,
        g.baseY - g.h * 0.6,
        g.x + g.lean * g.h * 1.5 + sway * 1.3,
        g.baseY - g.h
      );
      ctx.stroke();
    }

    // Mushrooms
    for (const m of mushrooms) {
      const bob = Math.sin(gameTime * 1.2 + m.x) * 0.8;
      // Stem
      ctx.fillStyle = '#f5e6d3';
      ctx.fillRect(m.x - m.size * 0.25, m.y + bob - m.size * 0.3, m.size * 0.5, m.size * 0.8);
      // Cap
      const capGrad = ctx.createRadialGradient(m.x, m.y + bob - m.size * 0.5, 0, m.x, m.y + bob - m.size * 0.3, m.size);
      capGrad.addColorStop(0, `hsl(${m.hue}, 70%, 55%)`);
      capGrad.addColorStop(1, `hsl(${m.hue}, 60%, 35%)`);
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + bob - m.size * 0.4, m.size, m.size * 0.6, 0, Math.PI, 0);
      ctx.fill();
      // White spots
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let s = 0; s < m.spots; s++) {
        const sa = (s / m.spots) * Math.PI + 0.3;
        const sr = m.size * 0.5;
        ctx.beginPath();
        ctx.arc(
          m.x + Math.cos(sa) * sr * 0.7,
          m.y + bob - m.size * 0.5 - Math.sin(sa) * sr * 0.4,
          1.5, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Flowers with petals and stems
    for (const f of flowers) {
      const bob = Math.sin(gameTime * 1.5 + f.phase) * 2;
      const fy = f.y + bob;
      // Stem
      ctx.strokeStyle = '#2a8a4a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(f.x, fy + f.size);
      ctx.quadraticCurveTo(f.x + Math.sin(gameTime + f.phase) * 2, fy + f.size + f.stemH * 0.5, f.x, fy + f.size + f.stemH);
      ctx.stroke();
      // Leaf on stem
      ctx.fillStyle = '#38a85c';
      ctx.beginPath();
      ctx.ellipse(f.x + 3, fy + f.size + f.stemH * 0.4, 4, 2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Petals
      ctx.save();
      ctx.translate(f.x, fy);
      for (let p = 0; p < f.petals; p++) {
        const angle = (p / f.petals) * Math.PI * 2 + gameTime * 0.3;
        ctx.fillStyle = `hsl(${f.hue + p * 8}, 75%, 68%)`;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * f.size * 0.6,
          Math.sin(angle) * f.size * 0.6,
          f.size * 0.55, f.size * 0.3,
          angle, 0, Math.PI * 2
        );
        ctx.fill();
      }
      // Center
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, 0, f.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(-f.size * 0.1, -f.size * 0.1, f.size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ────────────────── Drawing helpers ────────────────── */
  // Draw a filled + outlined ellipse
  function chibiEllipse(x, y, rx, ry, fill, outline, lw) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = lw || 2.5;
      ctx.stroke();
    }
  }

  // 4-point star helper for sparkles
  function drawStar4(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = i % 2 === 0 ? r : r * 0.3;
      if (i === 0) ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      else ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ────────────────── Evolution pre-effects (aura, throne) ────────────────── */
  function drawEvoPreEffects(evo, bs) {
    const S = 1 + evo * 0.1;
    // Aura (evo 3+)
    if (evo >= 3) {
      const ag = ctx.createRadialGradient(0, -10 * S, 5, 0, -10 * S, 90 * S);
      ag.addColorStop(0, evo >= 4 ? 'rgba(255,215,0,0.15)' : 'rgba(200,160,255,0.15)');
      ag.addColorStop(0.6, evo >= 4 ? 'rgba(255,215,0,0.05)' : 'rgba(180,100,255,0.05)');
      ag.addColorStop(1, 'transparent');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(0, -10 * S, 90 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fart God cloud throne (evo 4+)
    if (evo >= 4) {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + gameTime * 0.3;
        const r = 65 + Math.sin(gameTime + i) * 10;
        const ccx = Math.cos(angle) * r;
        const ccy = Math.sin(angle) * r * 0.4 + 25;
        const hue = (gameTime * 40 + i * 72) % 360;
        ctx.fillStyle = `hsla(${hue}, 75%, 80%, 0.2)`;
        ctx.beginPath(); ctx.arc(ccx, ccy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ccx - 9, ccy + 3, 11, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ccx + 9, ccy + 3, 11, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawEvoPostEffects(evo, bs) {
    // Wings (evo 2+)
    if (evo >= 2) {
      const wf = Math.sin(gameTime * 4) * 15;
      const wc = evo >= 3 ? 'rgba(180,150,255,' : 'rgba(255,220,240,';
      ctx.save(); ctx.translate(-10 * bs, -20 * bs);
      ctx.rotate((-30 + wf) * Math.PI / 180);
      ctx.fillStyle = wc + '0.5)';
      ctx.beginPath(); ctx.ellipse(0, -15, 14 * bs, 32 * bs, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(10 * bs, -20 * bs);
      ctx.rotate((30 - wf) * Math.PI / 180);
      ctx.fillStyle = wc + '0.4)';
      ctx.beginPath(); ctx.ellipse(0, -15, 11 * bs, 28 * bs, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Orbiting sparkles (evo 1+)
    if (evo >= 1) {
      const count = 4 + evo * 2;
      for (let i = 0; i < count; i++) {
        const a = gameTime * 2 + (i / count) * Math.PI * 2;
        const d = 40 * bs + Math.sin(gameTime + i) * 12;
        const sz = 1.5 + Math.sin(gameTime * 4 + i * 2);
        ctx.fillStyle = `hsla(${(i * 50 + gameTime * 30) % 360}, 90%, 75%, ${0.5 + Math.sin(gameTime * 3 + i) * 0.3})`;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.6, sz, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Omnifarter rainbow ring (evo 7)
    if (evo >= 7) {
      ctx.lineWidth = 3;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const r = 85 * bs;
        ctx.strokeStyle = `hsla(${(i * 10 + gameTime * 60) % 360}, 100%, 65%, 0.5)`;
        ctx.beginPath();
        ctx.arc(0, 0, r, a, a + Math.PI / 18 + 0.02);
        ctx.stroke();
      }
    }
  }

  /* ── Skin: Unicorn (Chibi) ── */
  function drawSkinUnicorn(bs, evo) {
    const S = 1 + evo * 0.1;

    // ── Tail (chunky flowing sections matching mane style) ──
    const tailX = -24 * S, tailY = 6 * S;
    const tailSections = [
      { off: 0, h: 300, s: 65, l: 78 },  // lavender-pink
      { off: 1, h: 340, s: 60, l: 80 },  // pink
      { off: 2, h: 30,  s: 70, l: 78 },  // peach
      { off: 3, h: 180, s: 50, l: 76 },  // mint
    ];
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 0; i < tailSections.length; i++) {
      const ts = tailSections[i];
      const wave = Math.sin(gameTime * 2 + ts.off * 0.8) * 5;
      const tx = tailX - i * 6 * S + wave;
      const ty = tailY - 4 * S + i * 3 * S + wave * 0.4;
      const tw = 7 * S;
      const tl = (22 - i * 2) * S;

      ctx.beginPath();
      ctx.moveTo(tailX, tailY + i * 2 * S);
      ctx.bezierCurveTo(
        tx - tw, ty - tl * 0.1 + wave * 0.3,
        tx - tw * 0.8, ty + tl * 0.4 + wave,
        tx - tw * 0.1, ty + tl * 0.5 + wave
      );
      ctx.bezierCurveTo(
        tx + tw * 0.6, ty + tl * 0.35 - wave * 0.3,
        tx + tw * 0.4, ty - tl * 0.2,
        tailX, tailY + i * 2 * S
      );
      ctx.closePath();

      const tGrad = ctx.createLinearGradient(tailX, tailY, tx, ty + tl * 0.5);
      tGrad.addColorStop(0, `hsl(${ts.h}, ${ts.s}%, ${ts.l}%)`);
      tGrad.addColorStop(1, `hsl(${(ts.h + 25) % 360}, ${ts.s + 5}%, ${ts.l - 5}%)`);
      ctx.fillStyle = tGrad;
      ctx.fill();
      ctx.strokeStyle = `hsl(${ts.h}, ${ts.s - 10}%, ${ts.l - 25}%)`;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Highlight
      ctx.fillStyle = `hsla(${ts.h}, ${ts.s + 15}%, ${ts.l + 14}%, 0.4)`;
      ctx.beginPath();
      ctx.ellipse(tx - tw * 0.2, ty + tl * 0.1, tw * 0.25, tl * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';

    // ── Back legs (stubby chibi) ──
    const legCol = evo >= 3 ? '#c8b8f8' : '#f5c8d8';
    const legShade = evo >= 3 ? '#a890d8' : '#e0a8c0';
    const legOL = evo >= 3 ? '#8068b0' : '#c090b0';
    const legW = 10 * S, legH = 16 * S;
    // Back-left
    chibiEllipse(-15 * S, 26 * S, legW / 2, legH / 2, legShade, legOL, 2);
    // Back-right
    chibiEllipse(10 * S, 26 * S, legW / 2, legH / 2, legShade, legOL, 2);

    // ── Body (small round chibi body) ──
    const bodyW = 28 * S, bodyH = 22 * S;
    const bodyY = 12 * S;
    if (evo >= 3) {
      const bg = ctx.createRadialGradient(-3 * S, bodyY - 4 * S, 3, 0, bodyY, bodyW);
      bg.addColorStop(0, '#2a1060');
      bg.addColorStop(0.6, '#1a0840');
      bg.addColorStop(1, '#0f0528');
      ctx.fillStyle = bg;
    } else {
      const bg = ctx.createRadialGradient(-4 * S, bodyY - 5 * S, 3, 0, bodyY, bodyW);
      bg.addColorStop(0, '#fff5f9');
      bg.addColorStop(0.5, '#ffd8e8');
      bg.addColorStop(1, '#f0a8c0');
      ctx.fillStyle = bg;
    }
    ctx.beginPath();
    ctx.ellipse(0, bodyY, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body outline (soft)
    ctx.strokeStyle = evo >= 3 ? '#6848b0' : '#c090b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, bodyY, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Body shading highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(-bodyW * 0.2, bodyY - bodyH * 0.35, bodyW * 0.5, bodyH * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Body bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.ellipse(0, bodyY + bodyH * 0.5, bodyW * 0.7, bodyH * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body stars (cosmic evo)
    if (evo >= 3) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + gameTime * 0.5;
        const r = 6 + (i % 3) * 6;
        const sx = Math.cos(a) * r;
        const sy = bodyY + Math.sin(a) * r * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(gameTime * 3 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Front legs (stubby chibi, drawn on top of body) ──
    // Front-left
    chibiEllipse(-10 * S, 28 * S, legW / 2, legH / 2, legCol, legOL, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(-10 * S - 1, 26 * S, legW * 0.25, legH * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // Front-right
    chibiEllipse(15 * S, 28 * S, legW / 2, legH / 2, legCol, legOL, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(15 * S - 1, 26 * S, legW * 0.25, legH * 0.25, 0, 0, Math.PI * 2); ctx.fill();

    // ── Wings (evo 2+) — cute angel wings ──
    if (evo >= 2) {
      const wingFlap = Math.sin(gameTime * 3.5) * 20;
      const wc = evo >= 3 ? [190, 170, 255] : [255, 220, 240];

      // Left wing
      ctx.save();
      ctx.translate(-18 * S, -8 * S);
      ctx.rotate((-40 + wingFlap) * Math.PI / 180);
      // Feathers (3 layered ellipses)
      for (let f = 0; f < 3; f++) {
        ctx.fillStyle = `rgba(${wc[0]},${wc[1]},${wc[2]},${0.7 - f * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(-6 * S - f * 5, -12 * S + f * 4, 8 * S, 18 * S - f * 3, -0.5 + f * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${wc[0] - 40},${wc[1] - 40},${wc[2] - 20},0.3)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // Wing highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.ellipse(-8 * S, -16 * S, 5 * S, 8 * S, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Right wing
      ctx.save();
      ctx.translate(18 * S, -8 * S);
      ctx.rotate((40 - wingFlap) * Math.PI / 180);
      for (let f = 0; f < 3; f++) {
        ctx.fillStyle = `rgba(${wc[0]},${wc[1]},${wc[2]},${0.6 - f * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(6 * S + f * 5, -12 * S + f * 4, 8 * S, 18 * S - f * 3, 0.5 - f * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${wc[0] - 40},${wc[1] - 40},${wc[2] - 20},0.3)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.ellipse(8 * S, -16 * S, 5 * S, 8 * S, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ── Head (big chibi head — proportionate) ──
    const headR = 30 * S;
    const headY = -18 * S;
    // Head shadow on body
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse(0, bodyY - bodyH * 0.2, headR * 0.8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (evo >= 3) {
      const hg = ctx.createRadialGradient(-5 * S, headY - 6 * S, 5, 0, headY, headR);
      hg.addColorStop(0, '#2a1268');
      hg.addColorStop(0.6, '#1a0a48');
      hg.addColorStop(1, '#10062a');
      ctx.fillStyle = hg;
    } else {
      const hg = ctx.createRadialGradient(-5 * S, headY - 8 * S, 5, 0, headY, headR);
      hg.addColorStop(0, '#fff8fa');
      hg.addColorStop(0.4, '#ffe8f0');
      hg.addColorStop(1, '#f0b0c8');
      ctx.fillStyle = hg;
    }
    ctx.beginPath();
    ctx.ellipse(0, headY, headR, headR * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head outline (soft)
    ctx.strokeStyle = evo >= 3 ? '#6040b0' : '#c090b0';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, headY, headR, headR * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Head highlight (top-left soft glow)
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(-headR * 0.25, headY - headR * 0.35, headR * 0.45, headR * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Head lower shadow
    ctx.fillStyle = evo >= 3 ? 'rgba(20,0,60,0.08)' : 'rgba(200,120,160,0.08)';
    ctx.beginPath();
    ctx.ellipse(0, headY + headR * 0.5, headR * 0.7, headR * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head stars (cosmic)
    if (evo >= 3) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + gameTime * 0.6;
        const r = 12 + (i % 2) * 10;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(gameTime * 3 + i) * 0.25})`;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, headY + Math.sin(a) * r * 0.7, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Ear ──
    const earX = -14 * S, earY = headY - 26 * S;
    ctx.fillStyle = evo >= 3 ? '#1a0a48' : '#f5c0d5';
    ctx.beginPath();
    ctx.moveTo(earX + 8 * S, headY - 20 * S);
    ctx.quadraticCurveTo(earX - 2 * S, earY - 10 * S, earX + 4 * S, earY);
    ctx.quadraticCurveTo(earX + 14 * S, earY - 6 * S, earX + 12 * S, headY - 16 * S);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = evo >= 3 ? '#6040b0' : '#c090b0';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Inner ear
    ctx.fillStyle = evo >= 3 ? '#3820a0' : '#ffc0d8';
    ctx.beginPath();
    ctx.moveTo(earX + 9 * S, headY - 20 * S);
    ctx.quadraticCurveTo(earX + 2 * S, earY - 4 * S, earX + 6 * S, earY + 4 * S);
    ctx.quadraticCurveTo(earX + 12 * S, earY, earX + 11 * S, headY - 17 * S);
    ctx.closePath();
    ctx.fill();

    // ── Mane (chunky chibi hair — naomilord style) ──
    const headVR = headR * 0.92; // vertical radius of head ellipse
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Hair uses the same chunky leaf/teardrop shapes as the flowing mane
    // but tiled across the entire top of the head like thick voluminous hair.
    // Each "hair clump" is anchored on the head edge and points outward/upward,
    // overlapping to fully cover the scalp with no bald spots.

    // Palette matching the flowing mane
    const hairPalette = [
      { h: 300, s: 65, l: 78 }, // lavender-pink
      { h: 340, s: 60, l: 80 }, // pink
      { h: 30,  s: 70, l: 78 }, // peach
      { h: 180, s: 50, l: 76 }, // mint
      { h: 260, s: 55, l: 80 }, // periwinkle
    ];

    // Back hair layer — large leaf shapes radiating outward from the back/top
    // These are drawn FIRST so they sit behind the head-top clumps
    const backHair = [
      // angle around head (rad), outward length, width, palette index
      { a: Math.PI * 0.80, len: 22, w: 20, pi: 0 },
      { a: Math.PI * 0.65, len: 24, w: 19, pi: 1 },
      { a: Math.PI * 0.50, len: 26, w: 20, pi: 2 },
      { a: Math.PI * 0.35, len: 24, w: 19, pi: 3 },
      { a: Math.PI * 0.20, len: 20, w: 18, pi: 4 },
    ];

    for (const bh of backHair) {
      const col = hairPalette[bh.pi];
      const ancX = Math.cos(bh.a) * headR * 0.95;
      const ancY = headY + Math.sin(bh.a) * headVR * 0.95 * -1; // flip: PI=left, 0=right, top is positive
      // Tip points outward from head center
      const dirX = Math.cos(bh.a);
      const dirY = -Math.sin(bh.a);
      const tipX = ancX + dirX * bh.len * S;
      const tipY = ancY - dirY * bh.len * S; // canvas Y is inverted
      const hw = bh.w * S * 0.5;
      // Perpendicular direction for width
      const perpX = -dirY;
      const perpY = dirX;

      ctx.beginPath();
      ctx.moveTo(ancX, ancY);
      ctx.bezierCurveTo(
        ancX + perpX * hw * 1.2, ancY + perpY * hw * 1.2,
        tipX + perpX * hw * 0.6, tipY + perpY * hw * 0.6,
        tipX, tipY
      );
      ctx.bezierCurveTo(
        tipX - perpX * hw * 0.6, tipY - perpY * hw * 0.6,
        ancX - perpX * hw * 1.2, ancY - perpY * hw * 1.2,
        ancX, ancY
      );
      ctx.closePath();
      const g = ctx.createLinearGradient(ancX, ancY, tipX, tipY);
      g.addColorStop(0, `hsl(${col.h}, ${col.s}%, ${col.l}%)`);
      g.addColorStop(1, `hsl(${(col.h + 25) % 360}, ${col.s + 5}%, ${col.l - 5}%)`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = `hsl(${col.h}, ${col.s - 10}%, ${col.l - 25}%)`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Middle layer — fat overlapping clumps covering the entire scalp
    // These sit ON TOP of the head fill and overlap each other
    const topHair = [
      // Each clump: angle on head, how far it puffs out, width, palette index
      { a: Math.PI * 0.85, len: 16, w: 22, pi: 0 },
      { a: Math.PI * 0.72, len: 18, w: 21, pi: 1 },
      { a: Math.PI * 0.58, len: 20, w: 22, pi: 2 },
      { a: Math.PI * 0.45, len: 20, w: 22, pi: 3 },
      { a: Math.PI * 0.32, len: 18, w: 21, pi: 4 },
      { a: Math.PI * 0.18, len: 16, w: 20, pi: 0 },
    ];

    for (const th of topHair) {
      const col = hairPalette[th.pi];
      const ancX = Math.cos(th.a) * headR * 0.85;
      const ancY = headY - Math.sin(th.a) * headVR * 0.85;
      const dirX = Math.cos(th.a);
      const dirY = -Math.sin(th.a);
      const tipX = ancX + dirX * th.len * S;
      const tipY = ancY + dirY * th.len * S;
      const hw = th.w * S * 0.5;
      const perpX = dirY;
      const perpY = -dirX;

      ctx.beginPath();
      ctx.moveTo(ancX + perpX * hw * 0.4, ancY + perpY * hw * 0.4);
      ctx.bezierCurveTo(
        ancX + perpX * hw * 1.3, ancY + perpY * hw * 1.3,
        tipX + perpX * hw * 0.5, tipY + perpY * hw * 0.5,
        tipX, tipY
      );
      ctx.bezierCurveTo(
        tipX - perpX * hw * 0.5, tipY - perpY * hw * 0.5,
        ancX - perpX * hw * 1.3, ancY - perpY * hw * 1.3,
        ancX - perpX * hw * 0.4, ancY - perpY * hw * 0.4
      );
      ctx.closePath();
      const g = ctx.createLinearGradient(ancX, ancY, tipX, tipY);
      g.addColorStop(0, `hsl(${col.h}, ${col.s}%, ${col.l}%)`);
      g.addColorStop(1, `hsl(${(col.h + 20) % 360}, ${col.s}%, ${col.l + 3}%)`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = `hsl(${col.h}, ${col.s - 10}%, ${col.l - 25}%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Front bangs — short leaf-shaped sections just below the hairline
    const bangY = headY - headVR * 0.35; // start well above the eyes
    const bangs = [
      { x: -headR * 0.68, len: 8,  w: 16, pi: 0 },
      { x: -headR * 0.35, len: 10, w: 17, pi: 1 },
      { x:  headR * 0.0,  len: 9,  w: 16, pi: 2 },
      { x:  headR * 0.35, len: 8,  w: 16, pi: 3 },
      { x:  headR * 0.62, len: 6,  w: 14, pi: 4 },
    ];

    for (const b of bangs) {
      const col = hairPalette[b.pi];
      const hw = b.w * S * 0.5;
      const tipY = bangY + b.len * S;
      ctx.beginPath();
      ctx.moveTo(b.x - hw, bangY);
      ctx.bezierCurveTo(
        b.x - hw * 1.1, bangY + b.len * S * 0.4,
        b.x - hw * 0.3, tipY - b.len * S * 0.15,
        b.x, tipY
      );
      ctx.bezierCurveTo(
        b.x + hw * 0.3, tipY - b.len * S * 0.15,
        b.x + hw * 1.1, bangY + b.len * S * 0.4,
        b.x + hw, bangY
      );
      ctx.closePath();
      const g = ctx.createLinearGradient(b.x, bangY, b.x, tipY);
      g.addColorStop(0, `hsl(${col.h}, ${col.s}%, ${col.l}%)`);
      g.addColorStop(1, `hsl(${(col.h + 25) % 360}, ${col.s + 5}%, ${col.l - 5}%)`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = `hsl(${col.h}, ${col.s - 10}%, ${col.l - 25}%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Flowing mane sections (off the left/back of head)
    const maneSections = [
      // {startAngle on head, length, width, hue, sway offset}
      { ax: -0.85, ay: -0.3, len: 38, w: 18, h: 300, s: 65, l: 78, sOff: 0 },    // back — lavender-pink
      { ax: -0.7,  ay: -0.55, len: 34, w: 17, h: 340, s: 60, l: 80, sOff: 0.7 },  // pink
      { ax: -0.45, ay: -0.75, len: 30, w: 16, h: 30,  s: 70, l: 78, sOff: 1.4 },  // peach
      { ax: -0.15, ay: -0.85, len: 26, w: 15, h: 180, s: 50, l: 76, sOff: 2.1 },  // mint
      { ax: 0.1,   ay: -0.82, len: 22, w: 14, h: 260, s: 55, l: 80, sOff: 2.8 },  // periwinkle
    ];

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < maneSections.length; i++) {
      const sec = maneSections[i];
      const wave = Math.sin(gameTime * 1.8 + sec.sOff) * 4;

      // Anchor point on head edge
      const ancX = sec.ax * headR;
      const ancY = headY + sec.ay * headR * 0.92;

      // Tip of the section (flows downward-left with wave)
      const tipX = ancX - sec.len * 0.4 * S + wave;
      const tipY = ancY + sec.len * S * 0.9 + wave * 0.5;

      const hw = sec.w * S * 0.5; // half-width at widest point

      // Draw chunky leaf shape using bezier curves
      ctx.beginPath();
      // Start at anchor
      ctx.moveTo(ancX, ancY);
      // Left edge — curves out then tapers to tip
      ctx.bezierCurveTo(
        ancX - hw * 1.3, ancY + sec.len * S * 0.25 + wave * 0.3,
        tipX - hw * 0.9, tipY - sec.len * S * 0.3 + wave * 0.5,
        tipX, tipY
      );
      // Right edge — curves back to anchor (mirror)
      ctx.bezierCurveTo(
        tipX + hw * 1.0, tipY - sec.len * S * 0.3 - wave * 0.3,
        ancX + hw * 1.2, ancY + sec.len * S * 0.2 - wave * 0.2,
        ancX, ancY
      );
      ctx.closePath();

      // Fill with soft pastel gradient
      const grad = ctx.createLinearGradient(ancX, ancY, tipX, tipY);
      grad.addColorStop(0, `hsl(${sec.h}, ${sec.s}%, ${sec.l}%)`);
      grad.addColorStop(1, `hsl(${(sec.h + 25) % 360}, ${sec.s + 5}%, ${sec.l - 5}%)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bold soft outline (naomilord style)
      ctx.strokeStyle = `hsl(${sec.h}, ${sec.s - 10}%, ${sec.l - 25}%)`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Highlight — soft ellipse near top of section
      const hlX = ancX - hw * 0.15;
      const hlY = ancY + sec.len * S * 0.2;
      ctx.fillStyle = `hsla(${sec.h}, ${sec.s + 15}%, ${sec.l + 14}%, 0.45)`;
      ctx.beginPath();
      ctx.ellipse(hlX, hlY, hw * 0.35, sec.len * S * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';

    // ── Horn (ornate with spiral) ──
    const hornX = 6 * S, hornY = headY - headR * 0.85;
    const hornLen = 28 * S;
    const hornW = 7 * S;
    // Horn shape
    const hGrad = ctx.createLinearGradient(hornX, hornY, hornX, hornY - hornLen);
    hGrad.addColorStop(0, '#ffd700');
    hGrad.addColorStop(0.4, evo >= 3 ? '#ffaa44' : '#ffe680');
    hGrad.addColorStop(1, evo >= 3 ? '#ff88cc' : '#fffae0');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.moveTo(hornX - hornW / 2, hornY);
    ctx.quadraticCurveTo(hornX - hornW / 4, hornY - hornLen * 0.5, hornX, hornY - hornLen);
    ctx.quadraticCurveTo(hornX + hornW / 4, hornY - hornLen * 0.5, hornX + hornW / 2, hornY);
    ctx.closePath();
    ctx.fill();
    // Horn outline
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Spiral grooves
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 5; g++) {
      const t = (g + 0.5) / 6;
      const gy = hornY - hornLen * t;
      const gw = (hornW / 2) * (1 - t) + 1;
      ctx.beginPath();
      ctx.moveTo(hornX - gw, gy);
      ctx.quadraticCurveTo(hornX, gy - 3, hornX + gw, gy);
      ctx.stroke();
    }
    // Horn sparkle
    const spkR = 3 + Math.sin(gameTime * 5) * 1.5;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    drawStar4(hornX, hornY - hornLen + 2, spkR, gameTime * 3);
    ctx.shadowBlur = 0;

    // Glow ring (evo 3+)
    if (evo >= 3) {
      const ringR = 12 + Math.sin(gameTime * 3) * 3;
      ctx.strokeStyle = `rgba(255,215,0,${0.2 + Math.sin(gameTime * 4) * 0.1})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hornX, hornY - hornLen + 2, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── Eyes (round chibi eyes) ──
    const eyeSpacing = 12 * S;
    const eyeY = headY + 2 * S;
    const eyeRx = 9 * S, eyeRy = 10 * S;
    const blinkCycle = gameTime % 4;
    const isBlinking = blinkCycle > 3.85 && blinkCycle < 3.95;
    const eyeOpen = isBlinking ? 0.08 : 1;

    for (let side = -1; side <= 1; side += 2) {
      const ex = side * eyeSpacing;

      // Sclera (white)
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy * eyeOpen, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eye outline (soft)
      ctx.strokeStyle = '#c09ab0';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy * eyeOpen, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (!isBlinking) {
        // Iris (gradient — warm & bright)
        const irisR = 6.5 * S;
        const irisY = eyeY + 1 * S;
        const irisGrad = ctx.createRadialGradient(ex, irisY - irisR * 0.3, 1, ex, irisY, irisR);
        if (evo >= 3) {
          irisGrad.addColorStop(0, '#d8aaff');
          irisGrad.addColorStop(0.5, '#a06ee0');
          irisGrad.addColorStop(1, '#7040b8');
        } else {
          irisGrad.addColorStop(0, '#c8a0f0');
          irisGrad.addColorStop(0.5, '#9070d0');
          irisGrad.addColorStop(1, '#6848a8');
        }
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ex, irisY, irisR, 0, Math.PI * 2);
        ctx.fill();

        // Pupil (small & soft)
        ctx.fillStyle = '#1a0830';
        ctx.beginPath();
        ctx.arc(ex, irisY + 0.5, irisR * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Main highlight (large, top-right)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(ex + 3 * S * side * 0.5, irisY - 3.5 * S, 3.5 * S, 4 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Secondary highlight (small, bottom-left)
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(ex - 2 * S * side * 0.5, irisY + 3 * S, 2 * S, 0, Math.PI * 2);
        ctx.fill();
        // Tiny sparkle highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex + 1.5 * S, irisY - 5 * S, 1.2 * S, 0, Math.PI * 2);
        ctx.fill();

        // Upper eyelid (gentle curved line, no spikes)
        ctx.strokeStyle = '#b888b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeRx, Math.PI + 0.4, Math.PI * 2 - 0.4);
        ctx.stroke();
      }
    }

    // ── Blush (soft pink ovals on cheeks) ──
    chibiEllipse(-eyeSpacing - 4 * S, eyeY + 8 * S, 7 * S, 4 * S, 'rgba(255,160,190,0.35)', null);
    chibiEllipse(eyeSpacing + 4 * S, eyeY + 8 * S, 7 * S, 4 * S, 'rgba(255,160,190,0.35)', null);

    // ── Mouth (simple smile arc) ──
    const mouthY = eyeY + 12 * S;
    ctx.strokeStyle = evo >= 3 ? '#8868c0' : '#d08098';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, mouthY - 2 * S, 3.5 * S, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Nose (tiny soft dot) ──
    ctx.fillStyle = evo >= 3 ? 'rgba(160,120,220,0.3)' : 'rgba(220,160,180,0.4)';
    ctx.beginPath();
    ctx.arc(0, mouthY - 5 * S, 1.2 * S, 0, Math.PI * 2);
    ctx.fill();

    // ── Sparkle Pony+ glitter (orbiting 4-point stars) ──
    if (evo >= 1) {
      const count = 4 + evo * 2;
      for (let i = 0; i < count; i++) {
        const angle = gameTime * 1.8 + (i / count) * Math.PI * 2;
        const dist = 50 * S + Math.sin(gameTime + i) * 10;
        const sx = Math.cos(angle) * dist;
        const sy = headY + Math.sin(angle) * dist * 0.5;
        const ss = 3 + Math.sin(gameTime * 4 + i * 2) * 1.5;
        const hue = (i * 60 + gameTime * 30) % 360;
        const alpha = 0.6 + Math.sin(gameTime * 3 + i) * 0.3;
        ctx.fillStyle = `hsla(${hue}, 90%, 75%, ${alpha})`;
        drawStar4(sx, sy, ss, gameTime * 2 + i);
      }
    }
  }

  /* ── Skin: Tuna ── */
  function drawSkinTuna(bs, evo) {
    // Placeholder — tuna skin not yet implemented, fall back to unicorn
    drawSkinUnicorn(bs, evo);
  }

  /* ── Skin: Volleyball ── */
  function drawSkinVolleyball(bs, evo) {
    // Ball body
    const ballGrad = ctx.createRadialGradient(-5*bs, -8*bs, 2, 0, 0, 28*bs);
    ballGrad.addColorStop(0, '#fff');
    ballGrad.addColorStop(1, '#e8e0d0');
    ctx.fillStyle = ballGrad;
    ctx.beginPath(); ctx.arc(0, 0, 26*bs, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
    ctx.stroke();
    // Face (cute eyes on the ball)
    const ey = -4*bs;
    ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(-8*bs,ey,3.5*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8*bs,ey,3.5*bs,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-6.5*bs,ey-1.5*bs,1.5*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(9.5*bs,ey-1.5*bs,1.5*bs,0,Math.PI*2); ctx.fill();
    // Smile
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 2*bs, 8*bs, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
  }

  /* ── Skin: Spidermonkey ── */
  function drawSkinSpidermonkey(bs, evo) {
    const furColor = evo >= 3 ? '#2d1b69' : '#8B6914';
    const furLight = evo >= 3 ? '#4c3a90' : '#c4a035';
    const bellyColor = evo >= 3 ? '#1a0f40' : '#f5deb3';
    // Tail (long, curly)
    ctx.strokeStyle = furColor; ctx.lineWidth = 4*bs;
    ctx.beginPath(); ctx.moveTo(-20*bs, 10*bs);
    ctx.bezierCurveTo(-40*bs, 0, -55*bs, -25*bs+Math.sin(gameTime*2)*8, -50*bs, -40*bs+Math.sin(gameTime*2.5)*6);
    ctx.bezierCurveTo(-45*bs, -50*bs, -35*bs, -48*bs, -30*bs, -42*bs+Math.sin(gameTime*3)*4);
    ctx.stroke();
    // Legs
    ctx.strokeStyle = furColor; ctx.lineWidth = 5*bs;
    ctx.beginPath(); ctx.moveTo(-12*bs,18*bs); ctx.lineTo(-18*bs,40*bs); ctx.lineTo(-22*bs,45*bs); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8*bs,18*bs); ctx.lineTo(14*bs,40*bs); ctx.lineTo(18*bs,45*bs); ctx.stroke();
    // Arms
    ctx.lineWidth = 4*bs;
    ctx.beginPath(); ctx.moveTo(-20*bs,0); ctx.lineTo(-35*bs,15*bs+Math.sin(gameTime*3)*4); ctx.lineTo(-38*bs,22*bs); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16*bs,-2*bs); ctx.lineTo(30*bs,12*bs+Math.cos(gameTime*3)*4); ctx.lineTo(34*bs,18*bs); ctx.stroke();
    // Body
    const bg = ctx.createRadialGradient(-3,-3,3,0,0,25*bs);
    bg.addColorStop(0,furLight); bg.addColorStop(1,furColor);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0,5*bs,22*bs,20*bs,0,0,Math.PI*2); ctx.fill();
    // Belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath(); ctx.ellipse(2*bs,8*bs,12*bs,12*bs,0,0,Math.PI*2); ctx.fill();
    // Head
    const hx = 8*bs, hy = -22*bs;
    ctx.fillStyle = furColor;
    ctx.beginPath(); ctx.arc(hx,hy,16*bs,0,Math.PI*2); ctx.fill();
    // Face area
    ctx.fillStyle = bellyColor;
    ctx.beginPath(); ctx.ellipse(hx+4*bs,hy+2*bs,11*bs,10*bs,0,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(hx,hy-2*bs,5*bs,5.5*bs,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx+10*bs,hy-2*bs,5*bs,5.5*bs,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = evo >= 3 ? '#c4b5fd' : '#3a2510';
    ctx.beginPath(); ctx.arc(hx+1.5*bs,hy-1*bs,3*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+11*bs,hy-1*bs,3*bs,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(hx+2.5*bs,hy-3*bs,1.2*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+12*bs,hy-3*bs,1.2*bs,0,Math.PI*2); ctx.fill();
    // Nose
    ctx.fillStyle = evo >= 3 ? '#6d5aad' : '#5a3a1a';
    ctx.beginPath(); ctx.ellipse(hx+5*bs,hy+4*bs,3*bs,2*bs,0,0,Math.PI*2); ctx.fill();
    // Ears
    ctx.fillStyle = furColor;
    ctx.beginPath(); ctx.arc(hx-12*bs,hy-8*bs,6*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+18*bs,hy-8*bs,6*bs,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = bellyColor;
    ctx.beginPath(); ctx.arc(hx-12*bs,hy-8*bs,3.5*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+18*bs,hy-8*bs,3.5*bs,0,Math.PI*2); ctx.fill();
    // Mouth
    ctx.strokeStyle = evo >= 3 ? '#4c3a90' : '#5a3a1a';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(hx+5*bs,hy+6*bs,5*bs,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  }

  /* ── Skin: Chewbacca ── */
  function drawSkinChewbacca(bs, evo) {
    const furColor = evo >= 3 ? '#1a0f40' : '#6B4226';
    const furLight = evo >= 3 ? '#2d1b69' : '#8B6340';
    const furDark = evo >= 3 ? '#0f0a2a' : '#4a2a12';
    // Legs
    ctx.fillStyle = furColor;
    ctx.fillRect(-18*bs,22*bs,12*bs,30*bs); ctx.fillRect(8*bs,22*bs,12*bs,30*bs);
    ctx.fillStyle = furDark;
    ctx.fillRect(-18*bs,48*bs,12*bs,6*bs); ctx.fillRect(8*bs,48*bs,12*bs,6*bs);
    // Body
    const bg = ctx.createRadialGradient(-3,-5,5,0,0,35*bs);
    bg.addColorStop(0,furLight); bg.addColorStop(1,furColor);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0,5*bs,30*bs,28*bs,0,0,Math.PI*2); ctx.fill();
    // Fur texture
    ctx.strokeStyle = furDark; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const fx = -20*bs+i*4*bs, fy = -10*bs+Math.sin(i)*15*bs;
      ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(fx+1,fy+6*bs); ctx.stroke();
    }
    // Bandolier
    ctx.strokeStyle = evo >= 3 ? '#a78bfa' : '#8B7355'; ctx.lineWidth = 5*bs;
    ctx.beginPath(); ctx.moveTo(-20*bs,-15*bs); ctx.lineTo(20*bs,20*bs); ctx.stroke();
    ctx.strokeStyle = evo >= 3 ? '#c4b5fd' : '#a08060'; ctx.lineWidth = 3*bs;
    ctx.beginPath(); ctx.moveTo(-20*bs,-15*bs); ctx.lineTo(20*bs,20*bs); ctx.stroke();
    // Ammo pouches on bandolier
    for (let i = 0; i < 3; i++) {
      const px = -12*bs+i*12*bs, py = -8*bs+i*11*bs;
      ctx.fillStyle = evo >= 3 ? '#6d28d9' : '#705030';
      ctx.fillRect(px-3*bs, py-2*bs, 6*bs, 5*bs);
    }
    // Arms
    ctx.fillStyle = furColor;
    ctx.fillRect(-30*bs,-2*bs,12*bs,28*bs); ctx.fillRect(20*bs,-2*bs,12*bs,28*bs);
    // Hands
    ctx.fillStyle = furDark;
    ctx.beginPath(); ctx.arc(-24*bs,28*bs,6*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(26*bs,28*bs,6*bs,0,Math.PI*2); ctx.fill();
    // Head
    const hx = 0, hy = -30*bs;
    ctx.fillStyle = furColor;
    ctx.beginPath(); ctx.ellipse(hx,hy,20*bs,18*bs,0,0,Math.PI*2); ctx.fill();
    // Face area (darker fur around eyes)
    ctx.fillStyle = furDark;
    ctx.beginPath(); ctx.ellipse(hx,hy+2*bs,14*bs,10*bs,0,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(hx-7*bs,hy,4*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+7*bs,hy,4*bs,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = evo >= 3 ? '#a78bfa' : '#4a2a12';
    ctx.beginPath(); ctx.arc(hx-7*bs,hy,2.5*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+7*bs,hy,2.5*bs,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(hx-5.5*bs,hy-1.5*bs,1*bs,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+8.5*bs,hy-1.5*bs,1*bs,0,Math.PI*2); ctx.fill();
    // Nose
    ctx.fillStyle = evo >= 3 ? '#4c1d95' : '#2a1508';
    ctx.beginPath(); ctx.ellipse(hx,hy+6*bs,5*bs,3*bs,0,0,Math.PI*2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(hx,hy+8*bs,6*bs,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  }

  /* ── Skin draw dispatcher ── */
  const skinDrawFns = {
    unicorn: drawSkinUnicorn,
    tuna: drawSkinTuna,
    volleyball: drawSkinVolleyball,
    spidermonkey: drawSkinSpidermonkey,
    chewbacca: drawSkinChewbacca,
  };

  function drawCharacter() {
    const evo = state.evolution;
    const cx = CHAR_X;
    const cy = CHAR_Y + Math.sin(gameTime * 2) * 6;
    const sq = squash > 0 ? squash : 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 + sq * 0.15, 1 - sq * 0.12);

    const bs = 1 + evo * 0.08;

    drawEvoPreEffects(evo, bs);
    (skinDrawFns[state.skin] || skinDrawFns.unicorn)(bs, evo);
    drawEvoPostEffects(evo, bs);

    ctx.restore();
  }

  /* ── Particles & floating text drawing ── */
  function drawParticles() {
    for (const p of particles) {
      const alpha = p.life * 0.6;
      const s = p.size * p.life;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha})`;

      if (p.shape === 'cloud') {
        // Fluffy cloud puff (3 overlapping circles)
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x - s * 0.4, p.y + s * 0.15, s * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + s * 0.4, p.y + s * 0.15, s * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        // 4-point star
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = i % 2 === 0 ? s * 0.7 : s * 0.25;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.shape === 'sparkle') {
        // Diamond / rhombus sparkle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.8);
        ctx.lineTo(s * 0.3, 0);
        ctx.lineTo(0, s * 0.8);
        ctx.lineTo(-s * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Default ellipse
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s, s * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawFloatingTexts() {
    for (const ft of floatingTexts) {
      ctx.globalAlpha = ft.life;
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      // Glow behind text
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffd700';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
      // Brighter center pass
      ctx.fillStyle = '#fff8dc';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    }
  }

  /* ── UI ── */
  function drawUI() {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatNum(state.sp) + ' SP', W/2, 40);

    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffb6c1';
    ctx.fillText('+' + formatNum(effectiveTap()) + ' per tap', W/2, 64);
    if (state.spPerSec > 0) {
      ctx.fillStyle = '#98fb98';
      ctx.fillText('+' + formatNum(state.spPerSec) + '/sec', W/2, 84);
    }

    // Evolution name + skin name
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#c4b5fd';
    const skinLabel = currentSkin().name;
    ctx.fillText(EVOLUTIONS[state.evolution].name + ' ' + skinLabel, W/2, H*0.18);

    // Restart button (top-right corner, small)
    const rstX = W - 38, rstY = 12, rstS = 24;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rstX + rstS / 2, rstY + rstS / 2, 8, -0.5, Math.PI * 1.6);
    ctx.stroke();
    // Arrow tip
    const tipAngle = Math.PI * 1.6 - 0.5;
    const tipX = rstX + rstS / 2 + Math.cos(tipAngle) * 8;
    const tipY = rstY + rstS / 2 + Math.sin(tipAngle) * 8;
    ctx.beginPath();
    ctx.moveTo(tipX + 4, tipY - 1);
    ctx.lineTo(tipX, tipY + 4);
    ctx.lineTo(tipX - 3, tipY - 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Bottom Buttons ──
    const btnY = H - 55, btnH = 40, btnR = 12, btnW = 110;

    // Shop button
    const shopX = W*0.18 - btnW/2;
    drawButton(shopX, btnY, btnW, btnH, btnR, 'Shop', '#ff69b4', shopOpen);

    // Skins button
    const skinsX = W*0.5 - btnW/2;
    drawButton(skinsX, btnY, btnW, btnH, btnR, 'Skins', '#c084fc', skinsOpen);

    // Evolve button
    if (canEvolve()) {
      const evoX = W*0.82 - btnW/2;
      const pulse = 0.7 + Math.sin(gameTime*4)*0.3;
      ctx.fillStyle = `rgba(255,215,0,${0.2+pulse*0.15})`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(evoX, btnY, btnW, btnH, btnR);
      else ctx.rect(evoX, btnY, btnW, btnH);
      ctx.fill();
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Evolve!', evoX + btnW/2, btnY + 26);
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#c4b5fd';
      ctx.fillText(formatNum(EVOLUTIONS[state.evolution].cost) + ' SP', evoX + btnW/2, btnY - 5);
    }
  }

  function drawButton(x, y, w, h, r, label, color, active) {
    ctx.fillStyle = active ? color : hexToRGBA(color, 0.25);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = active ? '#fff' : color;
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + 26);
  }

  function hexToRGBA(hex, a) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ── Shop panel ── */
  const SHOP_PANEL = { x: 20, y: 40, w: W-40, get h() { return H-110; } };

  function drawShop() {
    if (!shopOpen) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
    const p = SHOP_PANEL;
    ctx.fillStyle = 'rgba(20,10,50,0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(p.x,p.y,p.w,p.h,16); else ctx.rect(p.x,p.y,p.w,p.h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,105,180,0.4)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('Shop', W/2, p.y+32);
    ctx.fillStyle = '#ff69b4'; ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.fillText('X', p.x+p.w-16, p.y+28);

    const startY = p.y + 48;
    const rowH = 46;
    const maxVisible = Math.floor((p.h - 56) / rowH);
    const maxScroll = Math.max(0, UPGRADES.length - maxVisible);
    shopScroll = Math.max(0, Math.min(shopScroll, maxScroll));

    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, startY - 2, p.w, p.h - 56); ctx.clip();

    ctx.textAlign = 'left';
    for (let i = 0; i < UPGRADES.length; i++) {
      const u = UPGRADES[i];
      const ry = startY + (i - shopScroll) * rowH;
      if (ry + rowH < startY || ry > p.y + p.h) continue;

      const cost = upgradeCost(u);
      const canAfford = state.sp >= cost;
      const owned = u.oneTime && state.upgrades[u.key];

      ctx.fillStyle = canAfford && !owned ? 'rgba(255,105,180,0.1)' : 'rgba(255,255,255,0.03)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(p.x+8,ry,p.w-16,rowH-4,6); else ctx.rect(p.x+8,ry,p.w-16,rowH-4);
      ctx.fill();

      ctx.fillStyle = owned ? '#888' : (canAfford ? '#fff' : '#888');
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      const level = u.oneTime ? '' : ' (Lv ' + state.upgrades[u.key] + ')';
      ctx.fillText(u.name + level, p.x+16, ry+18);

      ctx.fillStyle = '#aaa'; ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(u.desc, p.x+16, ry+34);

      ctx.textAlign = 'right';
      ctx.fillStyle = owned ? '#4a4' : (canAfford ? '#ffd700' : '#666');
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(owned ? 'OWNED' : formatNum(cost) + ' SP', p.x+p.w-16, ry+26);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Scroll indicators
    if (shopScroll > 0) {
      ctx.fillStyle = '#ffd700'; ctx.font = '14px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('^ scroll up ^', W/2, startY + 8);
    }
    if (shopScroll < maxScroll) {
      ctx.fillStyle = '#ffd700'; ctx.font = '14px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('v scroll down v', W/2, p.y + p.h - 6);
    }
  }

  /* ── Skins panel ── */
  function drawSkinsPanel() {
    if (!skinsOpen) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
    const p = SHOP_PANEL;
    ctx.fillStyle = 'rgba(20,10,50,0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(p.x,p.y,p.w,p.h,16); else ctx.rect(p.x,p.y,p.w,p.h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(192,132,252,0.4)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = '#c084fc'; ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('Skins', W/2, p.y+32);
    ctx.fillStyle = '#c084fc'; ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.fillText('X', p.x+p.w-16, p.y+28);

    const startY = p.y + 50;
    const rowH = 80;

    for (let i = 0; i < SKINS.length; i++) {
      const s = SKINS[i];
      const ry = startY + i * rowH;
      if (ry + rowH > p.y + p.h) break;

      const unlocked = state.unlockedSkins.includes(s.key);
      const selected = state.skin === s.key;
      const canAfford = state.sp >= s.cost;

      // Row bg
      ctx.fillStyle = selected ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.03)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(p.x+8,ry,p.w-16,rowH-6,8); else ctx.rect(p.x+8,ry,p.w-16,rowH-6);
      ctx.fill();
      if (selected) { ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 1.5; ctx.stroke(); }

      // Mini icon
      const iconX = p.x + 44, iconY = ry + (rowH-6)/2;
      ctx.save(); ctx.translate(iconX, iconY);
      drawSkinIcon(s.key, 0.45);
      ctx.restore();

      // Name
      ctx.textAlign = 'left';
      ctx.fillStyle = unlocked ? '#fff' : (canAfford ? '#ddd' : '#888');
      ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(s.name, p.x + 80, ry + 28);

      // Status
      ctx.textAlign = 'right';
      if (selected) {
        ctx.fillStyle = '#c084fc'; ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('EQUIPPED', p.x+p.w-18, ry+30);
      } else if (unlocked) {
        ctx.fillStyle = '#98fb98'; ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('SELECT', p.x+p.w-18, ry+30);
      } else {
        ctx.fillStyle = canAfford ? '#ffd700' : '#666';
        ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(formatNum(s.cost) + ' SP', p.x+p.w-18, ry+24);
        ctx.fillStyle = '#aaa'; ctx.font = '11px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('tap to unlock', p.x+p.w-18, ry+40);
      }
      ctx.textAlign = 'left';
    }
  }

  function drawSkinIcon(key, scale) {
    ctx.save(); ctx.scale(scale, scale);
    switch (key) {
      case 'unicorn':
        ctx.fillStyle='#f8b4c8'; ctx.beginPath(); ctx.ellipse(0,2,22,14,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#f0b0c8'; ctx.beginPath(); ctx.ellipse(16,-10,10,9,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.moveTo(19,-18); ctx.lineTo(22,-30); ctx.lineTo(25,-18); ctx.closePath(); ctx.fill();
        break;
      case 'tuna':
        ctx.fillStyle='#6b8fad'; ctx.beginPath(); ctx.ellipse(0,0,30,14,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#4682b4'; ctx.beginPath(); ctx.moveTo(-28,0); ctx.lineTo(-38,-12); ctx.lineTo(-32,0); ctx.lineTo(-38,12); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(18,-3,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#1a3a4a'; ctx.beginPath(); ctx.arc(19,-3,2,0,Math.PI*2); ctx.fill();
        break;
      case 'volleyball':
        ctx.fillStyle='#fffef5'; ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(180,160,120,0.6)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(-22,0); ctx.bezierCurveTo(-11,-7,11,-7,22,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-22,0); ctx.bezierCurveTo(-11,7,11,7,22,0); ctx.stroke();
        ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(-6,-4,2.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(6,-4,2.5,0,Math.PI*2); ctx.fill();
        break;
      case 'spidermonkey':
        ctx.fillStyle='#8B6914'; ctx.beginPath(); ctx.ellipse(0,3,16,14,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5,-14,12,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#f5deb3'; ctx.beginPath(); ctx.ellipse(7,-12,8,7,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#3a2510'; ctx.beginPath(); ctx.arc(3,-14,2.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10,-14,2.5,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#8B6914'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-16,8); ctx.bezierCurveTo(-30,-5,-28,-25,-20,-28); ctx.stroke();
        break;
      case 'chewbacca':
        ctx.fillStyle='#6B4226'; ctx.beginPath(); ctx.ellipse(0,4,20,22,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0,-22,15,14,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#4a2a12'; ctx.beginPath(); ctx.ellipse(0,-20,10,8,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-5,-22,3,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5,-22,3,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#8B7355'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-15,-12); ctx.lineTo(15,16); ctx.stroke();
        break;
    }
    ctx.restore();
  }

  /* ────────────────── Drawing: Restart confirm dialog ────────────────── */
  function drawConfirmRestart() {
    if (!confirmRestart) return;

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    // Dialog box
    const dw = 300, dh = 180;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.fillStyle = 'rgba(20,10,50,0.97)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(dx, dy, dw, dh, 16);
    else ctx.rect(dx, dy, dw, dh);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,80,80,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Restart Game?', W / 2, dy + 40);

    // Warning text
    ctx.fillStyle = '#ccc';
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('All progress will be lost!', W / 2, dy + 70);

    // Yes button
    const yBtnX = dx + 30, yBtnY = dy + dh - 60, yBtnW = 110, yBtnH = 38;
    ctx.fillStyle = 'rgba(255,80,80,0.25)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(yBtnX, yBtnY, yBtnW, yBtnH, 10);
    else ctx.rect(yBtnX, yBtnY, yBtnW, yBtnH);
    ctx.fill();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Yes, restart', yBtnX + yBtnW / 2, yBtnY + 25);

    // No button
    const nBtnX = dx + dw - 140, nBtnY = yBtnY, nBtnW = 110, nBtnH = 38;
    ctx.fillStyle = 'rgba(100,200,100,0.25)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(nBtnX, nBtnY, nBtnW, nBtnH, 10);
    else ctx.rect(nBtnX, nBtnY, nBtnW, nBtnH);
    ctx.fill();
    ctx.strokeStyle = '#6bd66b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#6bd66b';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Cancel', nBtnX + nBtnW / 2, nBtnY + 25);
  }

  /* ────────────────── Update ────────────────── */
  function update(dt) {
    gameTime += dt;
    saveTimer += dt;
    if (saveTimer > 30) { save(); saveTimer = 0; }

    if (state.spPerSec > 0) {
      const earned = state.spPerSec * dt;
      state.sp += earned;
      state.lifetimeSP += earned;
    }

    if (state.spPerSec > 0) {
      sparkleTimer += dt;
      if (sparkleTimer > 2 + Math.random()) { SFX.sparkle(); sparkleTimer = 0; }
    }

    if (squash > 0) { squash -= dt * 6; if (squash < 0) squash = 0; }
    if (shakeAmount > 0) { shakeAmount -= dt * 15; if (shakeAmount < 0) shakeAmount = 0; }

    // Shooting stars
    shootStarTimer += dt;
    if (shootStarTimer > 3 + Math.random() * 5) {
      shootStarTimer = 0;
      shootingStars.push({
        x: Math.random() * W * 0.6 + W * 0.2,
        y: Math.random() * H * 0.2,
        vx: 3 + Math.random() * 2,
        vy: 1.5 + Math.random(),
        life: 1,
      });
    }
    for (const ss of shootingStars) {
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= dt * 1.5;
    }
    shootingStars = shootingStars.filter(ss => ss.life > 0 && ss.x < W + 20);

    // Update particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(gameTime * p.wobbleSpeed + p.wobblePhase) * 0.5;
      p.life -= p.decay;
      if (p.spin) p.angle += p.spin * dt;
    }
    particles = particles.filter(p => p.life > 0);

    for (const ft of floatingTexts) { ft.y += ft.vy; ft.life -= dt * 1.2; }
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
  }

  /* ────────────────── Main loop ────────────────── */
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    update(dt);

    ctx.save();
    if (shakeAmount > 0) {
      ctx.translate((Math.random()-0.5)*shakeAmount*4, (Math.random()-0.5)*shakeAmount*4);
    }
    drawBackground();
    drawGround();
    drawParticles();
    drawCharacter();
    drawFloatingTexts();
    drawUI();
    ctx.restore();
    drawShop();
    drawSkinsPanel();
    drawConfirmRestart();

    requestAnimationFrame(loop);
  }

  /* ────────────────── Input ────────────────── */
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  }

  function handleTap(e) {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const p = SHOP_PANEL;

    // Confirm restart dialog — handle first (blocks all other input)
    if (confirmRestart) {
      const dw = 300, dh = 180;
      const dx = (W - dw) / 2, dy = (H - dh) / 2;
      const yBtnX = dx + 30, yBtnY = dy + dh - 60, yBtnW = 110, yBtnH = 38;
      const nBtnX = dx + dw - 140, nBtnY = yBtnY, nBtnW = 110, nBtnH = 38;

      if (pos.x >= yBtnX && pos.x <= yBtnX + yBtnW && pos.y >= yBtnY && pos.y <= yBtnY + yBtnH) {
        resetGame();
        return;
      }
      if (pos.x >= nBtnX && pos.x <= nBtnX + nBtnW && pos.y >= nBtnY && pos.y <= nBtnY + nBtnH) {
        confirmRestart = false;
        return;
      }
      // Click outside dialog also cancels
      if (pos.x < dx || pos.x > dx + dw || pos.y < dy || pos.y > dy + dh) {
        confirmRestart = false;
      }
      return;
    }

    // Skins panel — handle clicks
    if (skinsOpen) {
      // Close X button
      if (pos.x > p.x+p.w-40 && pos.y > p.y && pos.y < p.y+40) { skinsOpen = false; return; }
      // Click outside panel
      if (pos.x < p.x || pos.x > p.x+p.w || pos.y < p.y || pos.y > p.y+p.h) { skinsOpen = false; return; }
      // Skin rows
      const startY = p.y + 50, rowH = 80;
      for (let i = 0; i < SKINS.length; i++) {
        const ry = startY + i * rowH;
        if (ry + rowH > p.y + p.h) break;
        if (pos.y >= ry && pos.y < ry + rowH - 6) {
          const s = SKINS[i];
          const unlocked = state.unlockedSkins.includes(s.key);
          if (unlocked) {
            state.skin = s.key;
          } else if (state.sp >= s.cost) {
            state.sp -= s.cost;
            state.unlockedSkins.push(s.key);
            state.skin = s.key;
            SFX.purchase();
          }
          return;
        }
      }
      return;
    }

    // Shop open — handle shop clicks
    if (shopOpen) {
      if (pos.x > p.x+p.w-40 && pos.y > p.y && pos.y < p.y+40) { shopOpen = false; return; }
      if (pos.x < p.x || pos.x > p.x+p.w || pos.y < p.y || pos.y > p.y+p.h) { shopOpen = false; return; }
      // Scroll arrows
      const startY = p.y + 48, rowH = 46;
      const maxVisible = Math.floor((p.h - 56) / rowH);
      const maxScroll = Math.max(0, UPGRADES.length - maxVisible);
      if (pos.y < startY + 15 && shopScroll > 0) { shopScroll--; return; }
      if (pos.y > p.y + p.h - 20 && shopScroll < maxScroll) { shopScroll++; return; }
      // Upgrade rows
      for (let i = 0; i < UPGRADES.length; i++) {
        const ry = startY + (i - shopScroll) * rowH;
        if (pos.y >= ry && pos.y < ry + rowH - 4 && ry >= startY - 2 && ry + rowH < p.y + p.h) {
          const u = UPGRADES[i];
          const cost = upgradeCost(u);
          if (u.oneTime && state.upgrades[u.key]) return;
          if (state.sp >= cost) {
            state.sp -= cost;
            if (u.oneTime) state.upgrades[u.key] = true;
            else state.upgrades[u.key]++;
            applyUpgrade(u.key);
            SFX.purchase();
          }
          return;
        }
      }
      return;
    }

    // Restart button (top-right corner)
    const rstX = W - 38, rstY = 12, rstS = 24;
    if (pos.x >= rstX && pos.x <= rstX + rstS && pos.y >= rstY && pos.y <= rstY + rstS) {
      confirmRestart = true;
      return;
    }

    // ── Bottom buttons ──
    const btnY = H - 55, btnH = 40, btnW = 110;
    const shopX = W*0.18 - btnW/2;
    const skinsX = W*0.5 - btnW/2;
    const evoX = W*0.82 - btnW/2;

    if (pos.y >= btnY && pos.y <= btnY + btnH) {
      if (pos.x >= shopX && pos.x <= shopX + btnW) { shopOpen = true; return; }
      if (pos.x >= skinsX && pos.x <= skinsX + btnW) { skinsOpen = true; return; }
      if (canEvolve() && pos.x >= evoX && pos.x <= evoX + btnW) {
        state.sp -= EVOLUTIONS[state.evolution].cost;
        state.evolution++;
        SFX.evolve();
        spawnFartParticles(CHAR_X, CHAR_Y, 30);
        shakeAmount = 1.5;
        spawnFloatingText(W/2, H*0.3, EVOLUTIONS[state.evolution].name + '!', '#ffd700');
        return;
      }
    }

    // ── Character tap ──
    const dx = pos.x - CHAR_X, dy = pos.y - CHAR_Y;
    if (dx*dx + dy*dy < CHAR_RADIUS * CHAR_RADIUS) {
      let earned = effectiveTap();
      let color = '#ffd700';
      // Critical fart check
      if (state.upgrades.criticalFart && Math.random() < 0.1) {
        earned *= 10;
        color = '#ff4500';
        shakeAmount = 1.2;
      }
      state.sp += earned;
      state.lifetimeSP += earned;
      state.totalClicks++;
      squash = 1;
      shakeAmount = Math.max(shakeAmount, 0.5);
      SFX.fart(state.evolution);
      const sk = currentSkin();
      const count = 5 + Math.floor(Math.random() * 6) + state.evolution * 2;
      spawnFartParticles(CHAR_X + sk.fartDx, CHAR_Y + sk.fartDy, count);
      spawnFloatingText(pos.x + (Math.random()-0.5)*30, pos.y - 20, '+' + formatNum(earned), color);
    }
  }

  // Scroll support for shop
  canvas.addEventListener('wheel', (e) => {
    if (!shopOpen) return;
    e.preventDefault();
    const rowH = 46;
    const maxVisible = Math.floor((SHOP_PANEL.h - 56) / rowH);
    const maxScroll = Math.max(0, UPGRADES.length - maxVisible);
    shopScroll = Math.max(0, Math.min(maxScroll, shopScroll + (e.deltaY > 0 ? 1 : -1)));
  }, { passive: false });

  canvas.addEventListener('mousedown', handleTap);
  canvas.addEventListener('touchstart', handleTap, { passive: false });

  /* ────────────────── Init ────────────────── */
  load();
  window.addEventListener('beforeunload', save);
  requestAnimationFrame(loop);
})();

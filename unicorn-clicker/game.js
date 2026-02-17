/* ── Unicorn Fart Clicker — Game ── */
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 480, H = 640;
  canvas.width = W;
  canvas.height = H;

  /* ────────────────── State ────────────────── */
  const SAVE_KEY = 'unicornClickerSave';
  const defaultState = () => ({
    sp: 0,
    lifetimeSP: 0,
    tapPower: 1,
    tapMultiplier: 1,
    spPerSec: 0,
    evolution: 0,
    upgrades: { beefyBeans: 0, glitterGut: 0, autoFairy: 0, rainbowTurbo: 0, goldenHay: 0, cloudCompressor: false },
    totalClicks: 0,
    lastSave: Date.now(),
  });
  let state = defaultState();

  /* ────────────────── Upgrades definition ────────────────── */
  const UPGRADES = [
    { key: 'beefyBeans',   name: 'Beefy Beans',      desc: '+1 SP per tap',     baseCost: 10,   apply: () => { state.tapPower = 1 + state.upgrades.beefyBeans; }},
    { key: 'glitterGut',   name: 'Glitter Gut',       desc: '+1x tap multiplier',baseCost: 100,  apply: () => { state.tapMultiplier = 1 + state.upgrades.glitterGut; }},
    { key: 'autoFairy',    name: 'Auto-Poot Fairy',   desc: '+1 SP/sec',         baseCost: 50,   apply: () => { recalcPassive(); }},
    { key: 'rainbowTurbo', name: 'Rainbow Turbo',     desc: '+5 SP/sec',         baseCost: 500,  apply: () => { recalcPassive(); }},
    { key: 'goldenHay',    name: 'Golden Hay',        desc: '+20 SP/sec',        baseCost: 2500, apply: () => { recalcPassive(); }},
    { key: 'cloudCompressor', name: 'Cloud Compressor', desc: 'All taps x2 (one-time)', baseCost: 10000, oneTime: true, apply: () => {} },
  ];

  function upgradeCost(u) {
    if (u.oneTime) return u.baseCost;
    return Math.floor(u.baseCost * Math.pow(1.15, state.upgrades[u.key]));
  }

  function recalcPassive() {
    state.spPerSec = state.upgrades.autoFairy * 1 + state.upgrades.rainbowTurbo * 5 + state.upgrades.goldenHay * 20;
  }

  function effectiveTap() {
    let v = state.tapPower * state.tapMultiplier;
    if (state.upgrades.cloudCompressor) v *= 2;
    return Math.floor(v);
  }

  /* ────────────────── Evolution ────────────────── */
  const EVOLUTIONS = [
    { name: 'Baby Unicorn',     threshold: 0,       cost: 500 },
    { name: 'Sparkle Pony',     threshold: 500,     cost: 5000 },
    { name: 'Majestic Stallion',threshold: 5000,    cost: 50000 },
    { name: 'Cosmic Unicorn',   threshold: 50000,   cost: 500000 },
    { name: 'Fart God',         threshold: 500000,  cost: Infinity },
  ];

  function canEvolve() {
    if (state.evolution >= 4) return false;
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
        size: 8 + Math.random() * 12 + state.evolution * 3,
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

  function spawnFloatingText(x, y, text) {
    floatingTexts.push({ x, y, text, life: 1, vy: -1.5 });
  }

  /* ────────────────── Shake ────────────────── */
  let shakeAmount = 0;

  /* ────────────────── Sparkle timer ────────────────── */
  let sparkleTimer = 0;

  /* ────────────────── Shop state ────────────────── */
  let shopOpen = false;

  /* ────────────────── Restart confirm state ────────────────── */
  let confirmRestart = false;

  /* ────────────────── Unicorn animation ────────────────── */
  let squash = 0; // 0 = idle, positive = squashing
  const UNICORN_X = W * 0.48;
  const UNICORN_Y = H * 0.47;
  const UNICORN_RADIUS = 70 + 10; // hitbox

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

  /* ────────────────── Time tracking ────────────────── */
  let lastTime = performance.now();
  let gameTime = 0;

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
      // Merge with defaults to handle missing keys
      const def = defaultState();
      for (const k in def) {
        if (k === 'upgrades') {
          state.upgrades = { ...def.upgrades, ...s.upgrades };
        } else if (s[k] !== undefined) {
          state[k] = s[k];
        }
      }
      // Recalc derived values
      recalcPassive();
      // Offline progress
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

  let saveTimer = 0;

  function resetGame() {
    state = defaultState();
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
    particles = [];
    floatingTexts = [];
    shootingStars = [];
    squash = 0;
    shakeAmount = 0;
    shopOpen = false;
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

  /* ────────────────── Drawing: Background ────────────────── */
  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2d1b69');
    grad.addColorStop(0.5, '#1a0f40');
    grad.addColorStop(1, '#0f0a2a');
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

  /* ────────────────── Drawing: Ground ────────────────── */
  function drawGround() {
    const groundY = H * 0.76;
    // Grass gradient
    const gg = ctx.createLinearGradient(0, groundY, 0, H);
    gg.addColorStop(0, '#2ecc71');
    gg.addColorStop(0.3, '#27ae60');
    gg.addColorStop(1, '#1a7a42');
    ctx.fillStyle = gg;
    // Wavy top edge
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const y = groundY + Math.sin(x * 0.03 + gameTime * 0.5) * 4 + Math.sin(x * 0.07) * 2;
      ctx.lineTo(x, y);
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

  /* ────────────────── Drawing: Unicorn (Chibi) ────────────────── */
  function drawUnicorn() {
    const evo = state.evolution;
    const cx = UNICORN_X;
    const cy = UNICORN_Y + Math.sin(gameTime * 2) * 6;
    const OL = '#9e70a8'; // soft outline color

    const sq = squash > 0 ? squash : 0;
    const scaleX = 1 + sq * 0.15;
    const scaleY = 1 - sq * 0.12;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleY);

    const S = 1 + evo * 0.1; // overall scale per evolution

    // ── Aura (evo 3+) ──
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

    // ── Fart God cloud throne ──
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

    // STEP 1: Solid hair cap — ellipse arc that fully covers the top of the head
    // Slightly larger than head so it puffs out (chibi volume)
    const capRx = headR + 4 * S;
    const capRy = headVR + 4 * S;
    const capGrad = ctx.createLinearGradient(-capRx, headY - capRy, capRx, headY);
    capGrad.addColorStop(0, 'hsl(300, 60%, 76%)');
    capGrad.addColorStop(0.5, 'hsl(340, 55%, 80%)');
    capGrad.addColorStop(1, 'hsl(270, 50%, 80%)');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    // Draw a large arc from right side over top to left side
    // Angles: from ~30deg below horizontal-right to ~30deg below horizontal-left
    // (in canvas angles: from -0.5 rad to PI+0.5 rad, going counter-clockwise covers the top)
    ctx.ellipse(0, headY, capRx, capRy, 0, Math.PI + 0.45, -0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'hsl(310, 45%, 55%)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // STEP 2: Bangs — 5 chunky pointed sections hanging over the forehead
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const bangY = headY + headVR * 0.15; // where bangs start (hair line)
    const bangSections = [
      { x: -headR * 0.72, tipLen: 16, w: 14, h: 300, s: 65, l: 76 },
      { x: -headR * 0.38, tipLen: 18, w: 15, h: 340, s: 60, l: 78 },
      { x: -headR * 0.02, tipLen: 17, w: 14, h: 30,  s: 70, l: 78 },
      { x:  headR * 0.32, tipLen: 15, w: 14, h: 180, s: 50, l: 78 },
      { x:  headR * 0.62, tipLen: 12, w: 12, h: 260, s: 55, l: 80 },
    ];

    for (const b of bangSections) {
      const bw = b.w * S * 0.5;
      const tipY = bangY + b.tipLen * S;
      ctx.beginPath();
      ctx.moveTo(b.x - bw, bangY);
      ctx.quadraticCurveTo(b.x - bw * 0.2, bangY + b.tipLen * S * 0.6, b.x, tipY);
      ctx.quadraticCurveTo(b.x + bw * 0.2, bangY + b.tipLen * S * 0.6, b.x + bw, bangY);
      ctx.closePath();
      ctx.fillStyle = `hsl(${b.h}, ${b.s}%, ${b.l}%)`;
      ctx.fill();
      ctx.strokeStyle = `hsl(${b.h}, ${b.s - 10}%, ${b.l - 25}%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // STEP 3: Flowing mane sections (off the left/back of head)
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

    ctx.restore();
  }

  /* ────────────────── Drawing: Particles ────────────────── */
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

  /* ────────────────── Drawing: Floating texts ────────────────── */
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

  /* ────────────────── Drawing: UI ────────────────── */
  function drawUI() {
    // Score
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatNum(state.sp) + ' SP', W / 2, 40);

    // Rates
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffb6c1';
    ctx.fillText('+' + formatNum(effectiveTap()) + ' per tap', W / 2, 64);
    if (state.spPerSec > 0) {
      ctx.fillStyle = '#98fb98';
      ctx.fillText('+' + formatNum(state.spPerSec) + '/sec', W / 2, 84);
    }

    // Evolution name
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText(EVOLUTIONS[state.evolution].name, W / 2, H * 0.18);

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
    const btnY = H - 55;
    const btnH = 40;
    const btnR = 12;

    // Shop button
    const shopBtnX = W * 0.25 - 60;
    const shopBtnW = 120;
    ctx.fillStyle = shopOpen ? '#ff69b4' : 'rgba(255,105,180,0.25)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(shopBtnX, btnY, shopBtnW, btnH, btnR);
    else { ctx.rect(shopBtnX, btnY, shopBtnW, btnH); }
    ctx.fill();
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = shopOpen ? '#fff' : '#ff69b4';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Shop', shopBtnX + shopBtnW / 2, btnY + 26);

    // Evolve button
    if (canEvolve()) {
      const evoBtnX = W * 0.75 - 60;
      const evoBtnW = 120;
      const pulse = 0.7 + Math.sin(gameTime * 4) * 0.3;
      ctx.fillStyle = `rgba(255,215,0,${0.2 + pulse * 0.15})`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(evoBtnX, btnY, evoBtnW, btnH, btnR);
      else { ctx.rect(evoBtnX, btnY, evoBtnW, btnH); }
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('Evolve!', evoBtnX + evoBtnW / 2, btnY + 26);

      // Cost label
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#c4b5fd';
      ctx.fillText(formatNum(EVOLUTIONS[state.evolution].cost) + ' SP', evoBtnX + evoBtnW / 2, btnY - 6);
    }
  }

  /* ────────────────── Drawing: Shop panel ────────────────── */
  function drawShop() {
    if (!shopOpen) return;

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    // Panel
    const panelX = 30, panelY = 100, panelW = W - 60, panelH = H - 200;
    ctx.fillStyle = 'rgba(20,10,50,0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    else ctx.rect(panelX, panelY, panelW, panelH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,105,180,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Shop', W / 2, panelY + 36);

    // Close button
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('X', panelX + panelW - 16, panelY + 30);

    // Upgrades list
    const startY = panelY + 60;
    const rowH = 62;
    ctx.textAlign = 'left';

    for (let i = 0; i < UPGRADES.length; i++) {
      const u = UPGRADES[i];
      const ry = startY + i * rowH;
      if (ry + rowH > panelY + panelH - 10) break;

      const cost = upgradeCost(u);
      const canAfford = state.sp >= cost;
      const owned = u.oneTime && state.upgrades[u.key];

      // Row bg
      ctx.fillStyle = canAfford && !owned ? 'rgba(255,105,180,0.1)' : 'rgba(255,255,255,0.03)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(panelX + 10, ry, panelW - 20, rowH - 6, 8);
      else ctx.rect(panelX + 10, ry, panelW - 20, rowH - 6);
      ctx.fill();

      // Name + level
      ctx.fillStyle = owned ? '#888' : (canAfford ? '#fff' : '#888');
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      const level = u.oneTime ? '' : ' (Lv ' + state.upgrades[u.key] + ')';
      ctx.fillText(u.name + level, panelX + 20, ry + 20);

      // Description
      ctx.fillStyle = '#aaa';
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(u.desc, panelX + 20, ry + 38);

      // Cost
      ctx.textAlign = 'right';
      ctx.fillStyle = owned ? '#4a4' : (canAfford ? '#ffd700' : '#666');
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(owned ? 'OWNED' : formatNum(cost) + ' SP', panelX + panelW - 20, ry + 28);
      ctx.textAlign = 'left';
    }
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

    // Passive income
    if (state.spPerSec > 0) {
      const earned = state.spPerSec * dt;
      state.sp += earned;
      state.lifetimeSP += earned;
    }

    // Sparkle sounds for passive income
    if (state.spPerSec > 0) {
      sparkleTimer += dt;
      if (sparkleTimer > 2 + Math.random()) {
        Audio.sparkle();
        sparkleTimer = 0;
      }
    }

    // Squash animation decay
    if (squash > 0) {
      squash -= dt * 6;
      if (squash < 0) squash = 0;
    }

    // Shake decay
    if (shakeAmount > 0) {
      shakeAmount -= dt * 15;
      if (shakeAmount < 0) shakeAmount = 0;
    }

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

    // Update floating texts
    for (const ft of floatingTexts) {
      ft.y += ft.vy;
      ft.life -= dt * 1.2;
    }
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
  }

  /* ────────────────── Main loop ────────────────── */
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    update(dt);

    ctx.save();
    // Screen shake
    if (shakeAmount > 0) {
      ctx.translate(
        (Math.random() - 0.5) * shakeAmount * 4,
        (Math.random() - 0.5) * shakeAmount * 4
      );
    }

    drawBackground();
    drawGround();
    drawParticles();
    drawUnicorn();
    drawFloatingTexts();
    drawUI();
    ctx.restore();
    drawShop();
    drawConfirmRestart();

    requestAnimationFrame(loop);
  }

  /* ────────────────── Input handling ────────────────── */
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function handleTap(e) {
    e.preventDefault();
    const pos = getCanvasPos(e);

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

    // Shop open — handle shop clicks
    if (shopOpen) {
      const panelX = 30, panelY = 100, panelW = W - 60, panelH = H - 200;

      // Close button
      if (pos.x > panelX + panelW - 40 && pos.y > panelY && pos.y < panelY + 40) {
        shopOpen = false;
        return;
      }

      // Click outside panel
      if (pos.x < panelX || pos.x > panelX + panelW || pos.y < panelY || pos.y > panelY + panelH) {
        shopOpen = false;
        return;
      }

      // Upgrade rows
      const startY = panelY + 60;
      const rowH = 62;
      for (let i = 0; i < UPGRADES.length; i++) {
        const ry = startY + i * rowH;
        if (pos.y >= ry && pos.y < ry + rowH - 6) {
          const u = UPGRADES[i];
          const cost = upgradeCost(u);
          if (u.oneTime && state.upgrades[u.key]) return;
          if (state.sp >= cost) {
            state.sp -= cost;
            if (u.oneTime) {
              state.upgrades[u.key] = true;
            } else {
              state.upgrades[u.key]++;
            }
            u.apply();
            Audio.purchase();
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

    // Shop button
    const btnY = H - 55;
    const shopBtnX = W * 0.25 - 60, shopBtnW = 120, btnH = 40;
    if (pos.x >= shopBtnX && pos.x <= shopBtnX + shopBtnW && pos.y >= btnY && pos.y <= btnY + btnH) {
      shopOpen = true;
      return;
    }

    // Evolve button
    if (canEvolve()) {
      const evoBtnX = W * 0.75 - 60, evoBtnW = 120;
      if (pos.x >= evoBtnX && pos.x <= evoBtnX + evoBtnW && pos.y >= btnY && pos.y <= btnY + btnH) {
        state.sp -= EVOLUTIONS[state.evolution].cost;
        state.evolution++;
        Audio.evolve();
        spawnFartParticles(UNICORN_X, UNICORN_Y, 30);
        shakeAmount = 1.5;
        spawnFloatingText(W / 2, H * 0.3, EVOLUTIONS[state.evolution].name + '!');
        return;
      }
    }

    // Unicorn tap
    const dx = pos.x - UNICORN_X;
    const dy = pos.y - UNICORN_Y;
    if (dx * dx + dy * dy < UNICORN_RADIUS * UNICORN_RADIUS) {
      const earned = effectiveTap();
      state.sp += earned;
      state.lifetimeSP += earned;
      state.totalClicks++;
      squash = 1;
      shakeAmount = 0.5;
      Audio.fart(state.evolution);
      const count = 5 + Math.floor(Math.random() * 6) + state.evolution * 2;
      spawnFartParticles(UNICORN_X - 40, UNICORN_Y + 10, count);
      spawnFloatingText(pos.x + (Math.random() - 0.5) * 30, pos.y - 20, '+' + formatNum(earned));
    }
  }

  canvas.addEventListener('mousedown', handleTap);
  canvas.addEventListener('touchstart', handleTap, { passive: false });

  /* ────────────────── Init ────────────────── */
  load();
  window.addEventListener('beforeunload', save);
  requestAnimationFrame(loop);
})();

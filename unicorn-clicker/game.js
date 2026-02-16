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

  /* ────────────────── Unicorn animation ────────────────── */
  let squash = 0; // 0 = idle, positive = squashing
  const UNICORN_X = W * 0.48;
  const UNICORN_Y = H * 0.47;
  const UNICORN_RADIUS = 70 + 10; // hitbox

  /* ────────────────── Background stars ────────────────── */
  const stars = Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.65,
    size: 0.5 + Math.random() * 1.5,
    twinkle: Math.random() * Math.PI * 2,
  }));

  /* ────────────────── Flowers ────────────────── */
  const flowers = Array.from({ length: 18 }, () => ({
    x: Math.random() * W,
    y: H * 0.78 + Math.random() * (H * 0.12),
    size: 3 + Math.random() * 4,
    hue: Math.random() * 360,
    phase: Math.random() * Math.PI * 2,
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

    // Stars
    for (const s of stars) {
      const a = 0.3 + Math.sin(gameTime * 2 + s.twinkle) * 0.25;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
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

    // Flowers
    for (const f of flowers) {
      const bob = Math.sin(gameTime * 1.5 + f.phase) * 2;
      ctx.fillStyle = `hsl(${f.hue}, 80%, 65%)`;
      ctx.beginPath();
      ctx.arc(f.x, f.y + bob, f.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(f.x, f.y + bob, f.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ────────────────── Drawing: Unicorn ────────────────── */
  function drawUnicorn() {
    const evo = state.evolution;
    const cx = UNICORN_X;
    const cy = UNICORN_Y + Math.sin(gameTime * 2) * 6; // idle bob

    // Squash-and-stretch
    const sq = squash > 0 ? squash : 0;
    const scaleX = 1 + sq * 0.15;
    const scaleY = 1 - sq * 0.12;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleY);

    const bodyScale = 1 + evo * 0.12;

    // Aura for high evolutions
    if (evo >= 3) {
      const ag = ctx.createRadialGradient(0, 0, 10, 0, 0, 80 * bodyScale);
      ag.addColorStop(0, 'rgba(255,200,255,0.15)');
      ag.addColorStop(0.5, `rgba(${evo >= 4 ? '255,215,0' : '180,100,255'},0.07)`);
      ag.addColorStop(1, 'rgba(255,200,255,0)');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(0, 0, 80 * bodyScale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fart God cloud throne
    if (evo >= 4) {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + gameTime * 0.3;
        const r = 60 + Math.sin(gameTime + i) * 10;
        ctx.fillStyle = `hsla(${(gameTime * 40 + i * 72) % 360}, 80%, 75%, 0.2)`;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angle) * r, Math.sin(angle) * r * 0.5 + 30, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Legs
    const legColor = evo >= 3 ? '#c4b5fd' : '#f0c0d0';
    ctx.fillStyle = legColor;
    const legW = 8 * bodyScale, legH = 30 * bodyScale;
    const legY = 22 * bodyScale;
    ctx.fillRect(-25 * bodyScale, legY, legW, legH);
    ctx.fillRect(-12 * bodyScale, legY, legW, legH);
    ctx.fillRect(8 * bodyScale, legY, legW, legH);
    ctx.fillRect(20 * bodyScale, legY, legW, legH);
    // Hooves
    ctx.fillStyle = evo >= 3 ? '#a78bfa' : '#d4a0b0';
    ctx.fillRect(-25 * bodyScale, legY + legH - 5, legW, 5);
    ctx.fillRect(-12 * bodyScale, legY + legH - 5, legW, 5);
    ctx.fillRect(8 * bodyScale, legY + legH - 5, legW, 5);
    ctx.fillRect(20 * bodyScale, legY + legH - 5, legW, 5);

    // Body
    const bodyW = 45 * bodyScale, bodyH = 30 * bodyScale;
    if (evo >= 3) {
      // Cosmic body — starfield fill
      const bg = ctx.createRadialGradient(-5, -5, 5, 0, 0, bodyW);
      bg.addColorStop(0, '#1a0533');
      bg.addColorStop(0.5, '#2d1b69');
      bg.addColorStop(1, '#0f0a2a');
      ctx.fillStyle = bg;
    } else {
      const bg = ctx.createRadialGradient(-5, -5, 5, 0, 0, bodyW);
      bg.addColorStop(0, '#fff0f5');
      bg.addColorStop(1, '#f8b4c8');
      ctx.fillStyle = bg;
    }
    ctx.beginPath();
    ctx.ellipse(0, 5, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body stars for cosmic+
    if (evo >= 3) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + gameTime * 0.5;
        const r = 10 + (i % 3) * 10;
        const sx = Math.cos(a) * r;
        const sy = Math.sin(a) * r * 0.6 + 5;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(gameTime * 3 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Wings (evolution 2+)
    if (evo >= 2) {
      const wingFlap = Math.sin(gameTime * 4) * 15;
      ctx.save();
      ctx.translate(-10, -20 * bodyScale);
      ctx.rotate((-30 + wingFlap) * Math.PI / 180);
      ctx.fillStyle = evo >= 3 ? 'rgba(180,150,255,0.5)' : 'rgba(255,220,240,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, -15, 15 * bodyScale, 35 * bodyScale, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(10, -20 * bodyScale);
      ctx.rotate((30 - wingFlap) * Math.PI / 180);
      ctx.fillStyle = evo >= 3 ? 'rgba(180,150,255,0.4)' : 'rgba(255,220,240,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, -15, 12 * bodyScale, 30 * bodyScale, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Tail (rainbow)
    const tailBaseX = -bodyW + 5;
    const tailBaseY = 5;
    for (let i = 0; i < 5; i++) {
      const hue = (i * 60 + gameTime * 60) % 360;
      ctx.strokeStyle = `hsl(${hue}, 85%, 60%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tailBaseX, tailBaseY + i * 3 - 6);
      ctx.bezierCurveTo(
        tailBaseX - 20 - i * 3, tailBaseY - 20 + Math.sin(gameTime * 3 + i) * 8,
        tailBaseX - 35 - i * 2, tailBaseY + 10 + Math.cos(gameTime * 2 + i) * 10,
        tailBaseX - 40 - i * 4, tailBaseY - 5 + Math.sin(gameTime * 2.5 + i * 0.5) * 15
      );
      ctx.stroke();
    }

    // Head
    const headX = 30 * bodyScale, headY = -18 * bodyScale;
    if (evo >= 3) {
      ctx.fillStyle = '#1a0533';
    } else {
      const hg = ctx.createRadialGradient(headX - 3, headY - 3, 3, headX, headY, 18 * bodyScale);
      hg.addColorStop(0, '#fff5f8');
      hg.addColorStop(1, '#f0b0c8');
      ctx.fillStyle = hg;
    }
    ctx.beginPath();
    ctx.ellipse(headX, headY, 18 * bodyScale, 16 * bodyScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mane (rainbow)
    for (let i = 0; i < 6; i++) {
      const hue = (i * 50 + gameTime * 50) % 360;
      ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
      ctx.lineWidth = 3.5;
      const mx = headX - 10 + i * 2;
      const my = headY - 14 * bodyScale;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.bezierCurveTo(
        mx - 8, my - 15 - Math.sin(gameTime * 3 + i * 0.8) * 8,
        mx - 15 + i * 2, my - 5 + Math.cos(gameTime * 2.5 + i) * 6,
        mx - 20 + i * 3, my + 5 + Math.sin(gameTime * 2 + i * 0.5) * 10
      );
      ctx.stroke();
    }

    // Horn
    const hornX = headX + 8 * bodyScale, hornY = headY - 14 * bodyScale;
    const hornLen = 22 * bodyScale;
    const hg2 = ctx.createLinearGradient(hornX, hornY, hornX, hornY - hornLen);
    hg2.addColorStop(0, '#ffd700');
    hg2.addColorStop(1, evo >= 3 ? '#ff69b4' : '#fff8dc');
    ctx.fillStyle = hg2;
    ctx.beginPath();
    ctx.moveTo(hornX - 5, hornY);
    ctx.lineTo(hornX + 1, hornY - hornLen);
    ctx.lineTo(hornX + 5, hornY);
    ctx.closePath();
    ctx.fill();
    // Horn sparkle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hornX + 1, hornY - hornLen + 4, 2 + Math.sin(gameTime * 5) * 1, 0, Math.PI * 2);
    ctx.fill();

    // Glow on horn for evo 3+
    if (evo >= 3) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = 'rgba(255,215,0,0.4)';
      ctx.beginPath();
      ctx.arc(hornX + 1, hornY - hornLen + 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Eye
    const eyeX = headX + 8 * bodyScale, eyeY = headY - 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d1b69';
    ctx.beginPath();
    ctx.arc(eyeX + 1.5, eyeY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX + 3, eyeY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(255,150,180,0.35)';
    ctx.beginPath();
    ctx.ellipse(headX + 14 * bodyScale, headY + 6, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle Pony+ glitter
    if (evo >= 1) {
      for (let i = 0; i < 4 + evo * 2; i++) {
        const angle = gameTime * 2 + (i / (4 + evo * 2)) * Math.PI * 2;
        const dist = 40 + Math.sin(gameTime + i) * 15;
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist * 0.6;
        const sparkleSize = 1.5 + Math.sin(gameTime * 4 + i * 2) * 1;
        ctx.fillStyle = `hsla(${(i * 60 + gameTime * 30) % 360}, 90%, 75%, ${0.5 + Math.sin(gameTime * 3 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /* ────────────────── Drawing: Particles ────────────────── */
  function drawParticles() {
    for (const p of particles) {
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.life * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * p.life, p.size * p.life * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ────────────────── Drawing: Floating texts ────────────────── */
  function drawFloatingTexts() {
    for (const ft of floatingTexts) {
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
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

    // Update particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(gameTime * p.wobbleSpeed + p.wobblePhase) * 0.5;
      p.life -= p.decay;
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

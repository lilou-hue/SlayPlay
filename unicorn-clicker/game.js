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
  let squash = 0;
  let shopScroll = 0;
  const CHAR_X = W * 0.48;
  const CHAR_Y = H * 0.47;
  const CHAR_RADIUS = 80;

  /* ────────────────── Background data ────────────────── */
  const stars = Array.from({ length: 60 }, () => ({
    x: Math.random() * W, y: Math.random() * H * 0.65,
    size: 0.5 + Math.random() * 1.5, twinkle: Math.random() * Math.PI * 2,
  }));
  const flowers = Array.from({ length: 18 }, () => ({
    x: Math.random() * W, y: H * 0.78 + Math.random() * (H * 0.12),
    size: 3 + Math.random() * 4, hue: Math.random() * 360, phase: Math.random() * Math.PI * 2,
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
    for (const s of stars) {
      const a = 0.3 + Math.sin(gameTime * 2 + s.twinkle) * 0.25;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
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
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (const f of flowers) {
      const bob = Math.sin(gameTime * 1.5 + f.phase) * 2;
      ctx.fillStyle = `hsl(${f.hue}, 80%, 65%)`;
      ctx.beginPath(); ctx.arc(f.x, f.y + bob, f.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(f.x, f.y + bob, f.size * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ── Universal evolution effects (drawn around any skin) ── */
  function drawEvoPreEffects(evo, bs) {
    // Dimensional rift (evo 6+)
    if (evo >= 6) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + gameTime * 0.8;
        const r = 70 * bs + Math.sin(gameTime * 2 + i) * 15;
        ctx.strokeStyle = `hsla(${(gameTime * 80 + i * 60) % 360}, 90%, 60%, ${0.3 + Math.sin(gameTime * 3 + i) * 0.15})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }
    }
    // Nebula swirl (evo 5+)
    if (evo >= 5) {
      for (let i = 0; i < 8; i++) {
        const a = gameTime * 0.4 + (i / 8) * Math.PI * 2;
        const r = 55 * bs + Math.sin(gameTime + i * 0.7) * 12;
        ctx.fillStyle = `hsla(${(gameTime * 20 + i * 45) % 360}, 70%, 50%, 0.12)`;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r * 0.6, 18, 10, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Aura (evo 3+)
    if (evo >= 3) {
      const ag = ctx.createRadialGradient(0, 0, 10, 0, 0, 80 * bs);
      ag.addColorStop(0, 'rgba(255,200,255,0.15)');
      ag.addColorStop(0.5, `rgba(${evo >= 4 ? '255,215,0' : '180,100,255'},0.07)`);
      ag.addColorStop(1, 'rgba(255,200,255,0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(0, 0, 80 * bs, 0, Math.PI * 2); ctx.fill();
    }
    // Cloud throne (evo 4+)
    if (evo >= 4) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + gameTime * 0.3;
        const r = 55 + Math.sin(gameTime + i) * 10;
        ctx.fillStyle = `hsla(${(gameTime * 40 + i * 72) % 360}, 80%, 75%, 0.18)`;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r * 0.4 + 30, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
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

  /* ── Skin: Unicorn ── */
  function drawSkinUnicorn(bs, evo) {
    // Legs
    const lc = evo >= 3 ? '#c4b5fd' : '#f0c0d0';
    ctx.fillStyle = lc;
    const lw = 8 * bs, lh = 30 * bs, ly = 22 * bs;
    ctx.fillRect(-25 * bs, ly, lw, lh); ctx.fillRect(-12 * bs, ly, lw, lh);
    ctx.fillRect(8 * bs, ly, lw, lh);   ctx.fillRect(20 * bs, ly, lw, lh);
    ctx.fillStyle = evo >= 3 ? '#a78bfa' : '#d4a0b0';
    ctx.fillRect(-25*bs,ly+lh-5,lw,5); ctx.fillRect(-12*bs,ly+lh-5,lw,5);
    ctx.fillRect(8*bs,ly+lh-5,lw,5);   ctx.fillRect(20*bs,ly+lh-5,lw,5);
    // Body
    const bw = 45 * bs, bh = 30 * bs;
    const bg = ctx.createRadialGradient(-5,-5,5,0,0,bw);
    if (evo >= 3) { bg.addColorStop(0,'#1a0533'); bg.addColorStop(0.5,'#2d1b69'); bg.addColorStop(1,'#0f0a2a'); }
    else { bg.addColorStop(0,'#fff0f5'); bg.addColorStop(1,'#f8b4c8'); }
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0,5,bw,bh,0,0,Math.PI*2); ctx.fill();
    if (evo >= 3) {
      for (let i = 0; i < 12; i++) {
        const a = (i/12)*Math.PI*2+gameTime*0.5, r = 10+(i%3)*10;
        ctx.fillStyle = `rgba(255,255,255,${0.4+Math.sin(gameTime*3+i)*0.3})`;
        ctx.beginPath(); ctx.arc(Math.cos(a)*r, Math.sin(a)*r*0.6+5, 1.2, 0, Math.PI*2); ctx.fill();
      }
    }
    // Tail
    const tx = -bw+5, ty = 5;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `hsl(${(i*60+gameTime*60)%360},85%,60%)`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, ty+i*3-6);
      ctx.bezierCurveTo(tx-20-i*3,ty-20+Math.sin(gameTime*3+i)*8, tx-35-i*2,ty+10+Math.cos(gameTime*2+i)*10, tx-40-i*4,ty-5+Math.sin(gameTime*2.5+i*0.5)*15);
      ctx.stroke();
    }
    // Head
    const hx = 30*bs, hy = -18*bs;
    if (evo >= 3) ctx.fillStyle = '#1a0533';
    else { const hg=ctx.createRadialGradient(hx-3,hy-3,3,hx,hy,18*bs); hg.addColorStop(0,'#fff5f8'); hg.addColorStop(1,'#f0b0c8'); ctx.fillStyle=hg; }
    ctx.beginPath(); ctx.ellipse(hx,hy,18*bs,16*bs,0,0,Math.PI*2); ctx.fill();
    // Mane
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `hsl(${(i*50+gameTime*50)%360},80%,55%)`; ctx.lineWidth = 3.5;
      const mx=hx-10+i*2, my=hy-14*bs;
      ctx.beginPath(); ctx.moveTo(mx,my);
      ctx.bezierCurveTo(mx-8,my-15-Math.sin(gameTime*3+i*0.8)*8, mx-15+i*2,my-5+Math.cos(gameTime*2.5+i)*6, mx-20+i*3,my+5+Math.sin(gameTime*2+i*0.5)*10);
      ctx.stroke();
    }
    // Horn
    const hnx=hx+8*bs, hny=hy-14*bs, hl=22*bs;
    const hg2=ctx.createLinearGradient(hnx,hny,hnx,hny-hl);
    hg2.addColorStop(0,'#ffd700'); hg2.addColorStop(1,evo>=3?'#ff69b4':'#fff8dc');
    ctx.fillStyle=hg2; ctx.beginPath(); ctx.moveTo(hnx-5,hny); ctx.lineTo(hnx+1,hny-hl); ctx.lineTo(hnx+5,hny); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(hnx+1,hny-hl+4,2+Math.sin(gameTime*5),0,Math.PI*2); ctx.fill();
    if (evo>=3) { ctx.save(); ctx.shadowBlur=15; ctx.shadowColor='#ffd700'; ctx.fillStyle='rgba(255,215,0,0.4)'; ctx.beginPath(); ctx.arc(hnx+1,hny-hl+4,6,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // Eye
    const ex=hx+8*bs, ey=hy-2;
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(ex,ey,6,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2d1b69'; ctx.beginPath(); ctx.arc(ex+1.5,ey,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ex+3,ey-2,1.5,0,Math.PI*2); ctx.fill();
    // Blush
    ctx.fillStyle='rgba(255,150,180,0.35)'; ctx.beginPath(); ctx.ellipse(hx+14*bs,hy+6,7,4,0,0,Math.PI*2); ctx.fill();
  }

  /* ── Skin: Tuna ── */
  function drawSkinTuna(bs, evo) {
    const bodyW = 50*bs, bodyH = 22*bs;
    // Tail fin
    ctx.fillStyle = evo >= 3 ? '#6366f1' : '#4682b4';
    ctx.beginPath();
    ctx.moveTo(-bodyW+5, 0);
    ctx.lineTo(-bodyW-18*bs, -18*bs + Math.sin(gameTime*4)*4);
    ctx.lineTo(-bodyW-10*bs, 0);
    ctx.lineTo(-bodyW-18*bs, 18*bs + Math.sin(gameTime*4+1)*4);
    ctx.closePath(); ctx.fill();
    // Body
    const bg = ctx.createRadialGradient(-5,-3,5,0,0,bodyW);
    if (evo >= 3) { bg.addColorStop(0,'#1e1b4b'); bg.addColorStop(0.5,'#312e81'); bg.addColorStop(1,'#1e1b4b'); }
    else { bg.addColorStop(0,'#e8e8e8'); bg.addColorStop(0.4,'#b0c4de'); bg.addColorStop(1,'#6b8fad'); }
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI*2); ctx.fill();
    // Scales shimmer
    for (let i = 0; i < 8; i++) {
      const sx = -30*bs + i*8*bs, sy = Math.sin(i*0.8)*bodyH*0.5;
      ctx.fillStyle = evo >= 3
        ? `rgba(165,180,252,${0.15+Math.sin(gameTime*3+i)*0.1})`
        : `rgba(200,220,240,${0.2+Math.sin(gameTime*3+i)*0.15})`;
      ctx.beginPath(); ctx.ellipse(sx,sy,4*bs,3*bs,0.3,0,Math.PI*2); ctx.fill();
    }
    // Dorsal fin
    ctx.fillStyle = evo >= 3 ? '#818cf8' : '#5b8ea6';
    ctx.beginPath();
    ctx.moveTo(-10*bs, -bodyH+2);
    ctx.bezierCurveTo(-5*bs,-bodyH-15*bs, 10*bs,-bodyH-12*bs, 15*bs,-bodyH+2);
    ctx.closePath(); ctx.fill();
    // Pectoral fin
    ctx.fillStyle = evo >= 3 ? '#a5b4fc' : '#7ba7c2';
    ctx.beginPath();
    ctx.moveTo(5*bs, bodyH*0.5);
    ctx.bezierCurveTo(10*bs,bodyH*0.5+12*bs, 0,bodyH*0.5+15*bs, -5*bs,bodyH*0.5+3);
    ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(30*bs,-4*bs,7*bs,8*bs,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = evo >= 3 ? '#312e81' : '#1a3a4a';
    ctx.beginPath(); ctx.arc(32*bs,-4*bs,4*bs,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(34*bs,-6*bs,1.5*bs,0,Math.PI*2); ctx.fill();
    // Mouth
    ctx.strokeStyle = evo >= 3 ? '#818cf8' : '#4a6a80';
    ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(bodyW-5, 3*bs); ctx.quadraticCurveTo(bodyW+2, 5*bs, bodyW-8, 6*bs);
    ctx.stroke();
  }

  /* ── Skin: Volleyball ── */
  function drawSkinVolleyball(bs, evo) {
    const r = 32 * bs;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, r+10, r*0.7, 6, 0, 0, Math.PI*2); ctx.fill();
    // Ball body
    const bg = ctx.createRadialGradient(-8*bs,-8*bs,4,0,0,r);
    if (evo >= 3) { bg.addColorStop(0,'#2d1b69'); bg.addColorStop(1,'#0f0a2a'); }
    else { bg.addColorStop(0,'#fffef5'); bg.addColorStop(1,'#e8e4d4'); }
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    // Panel lines (volleyball seams)
    ctx.strokeStyle = evo >= 3 ? 'rgba(165,180,252,0.5)' : 'rgba(180,160,120,0.6)';
    ctx.lineWidth = 2;
    // Horizontal seam
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r*0.5, -r*0.3, r*0.5, -r*0.3, r, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r*0.5, r*0.3, r*0.5, r*0.3, r, 0);
    ctx.stroke();
    // Vertical seams
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(-r*0.35, -r*0.5, -r*0.35, r*0.5, 0, r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r*0.35, -r*0.5, r*0.35, r*0.5, 0, r);
    ctx.stroke();
    if (evo >= 3) {
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2+gameTime*0.5, d = r*0.6;
        ctx.fillStyle = `rgba(255,255,255,${0.3+Math.sin(gameTime*3+i)*0.2})`;
        ctx.beginPath(); ctx.arc(Math.cos(a)*d, Math.sin(a)*d, 1.5, 0, Math.PI*2); ctx.fill();
      }
    }
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
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.life * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size*p.life, p.size*p.life*0.7, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawFloatingTexts() {
    for (const ft of floatingTexts) {
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
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
    ctx.fillStyle = active ? color : color.replace(')', ',0.25)').replace('rgb', 'rgba');
    if (!active) ctx.fillStyle = hexToRGBA(color, 0.25);
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
      if (sparkleTimer > 2 + Math.random()) { Audio.sparkle(); sparkleTimer = 0; }
    }

    if (squash > 0) { squash -= dt * 6; if (squash < 0) squash = 0; }
    if (shakeAmount > 0) { shakeAmount -= dt * 15; if (shakeAmount < 0) shakeAmount = 0; }

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(gameTime * p.wobbleSpeed + p.wobblePhase) * 0.5;
      p.life -= p.decay;
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

    // ── Shop panel open ──
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
            Audio.purchase();
          }
          return;
        }
      }
      return;
    }

    // ── Skins panel open ──
    if (skinsOpen) {
      if (pos.x > p.x+p.w-40 && pos.y > p.y && pos.y < p.y+40) { skinsOpen = false; return; }
      if (pos.x < p.x || pos.x > p.x+p.w || pos.y < p.y || pos.y > p.y+p.h) { skinsOpen = false; return; }
      const startY = p.y + 50, rowH = 80;
      for (let i = 0; i < SKINS.length; i++) {
        const ry = startY + i * rowH;
        if (pos.y >= ry && pos.y < ry + rowH - 6) {
          const s = SKINS[i];
          const unlocked = state.unlockedSkins.includes(s.key);
          if (unlocked) {
            state.skin = s.key;
            Audio.purchase();
          } else if (state.sp >= s.cost) {
            state.sp -= s.cost;
            state.unlockedSkins.push(s.key);
            state.skin = s.key;
            Audio.evolve();
            spawnFloatingText(W/2, H*0.35, s.name + ' unlocked!', '#c084fc');
          }
          return;
        }
      }
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
        Audio.evolve();
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
      Audio.fart(state.evolution);
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

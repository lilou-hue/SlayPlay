const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreNode = document.getElementById('score');
const densityNode = document.getElementById('density');
const symbiosisNode = document.getElementById('symbiosis');
const restartBtn = document.getElementById('restartBtn');

const world = {
  width: canvas.width,
  height: canvas.height,
  scrollSpeed: 2.5,
  score: 0,
  over: false,
  atmosphereTimer: 0,
  density: 0.85,
  densityLabel: 'Buoyant',
  obstacles: [],
  particles: [],
  ambientFlash: 0,
  motes: [],
  nebulae: [],
  terrain: [],
  floaters: [],
  spawnCooldown: 0,
  lastSpawnY: 270,
};

const glider = {
  x: 210,
  y: canvas.height * 0.45,
  vy: 0,
  gravity: 0.14,
  pulseForce: -4.2,
  radius: 16,
  trail: [],
  flicker: 0,
  crashed: false,
  symbiosisCharge: 1,
  symbiosisTimer: 0,
};

const hazardTypes = ['spire', 'school', 'geyser', 'storm'];

/* ========== INITIALISATION ========== */

function initMotes() {
  world.motes = [];
  for (let i = 0; i < 45; i += 1) {
    world.motes.push({
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      vx: -0.15 - Math.random() * 0.35,
      vy: (Math.random() - 0.5) * 0.25,
      size: 1 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      hue: 180 + Math.random() * 60,
    });
  }
}

function initNebulae() {
  world.nebulae = [];
  for (let i = 0; i < 5; i += 1) {
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

function initTerrain() {
  world.terrain = [];
  const segments = 32;
  for (let i = 0; i <= segments; i += 1) {
    const baseH = 40 + Math.sin(i * 0.6) * 18 + Math.sin(i * 1.7) * 10;
    world.terrain.push({
      height: baseH,
      peak: Math.random() < 0.2,
      peakExtra: 10 + Math.random() * 20,
    });
  }
}

function initFloaters() {
  world.floaters = [];
  for (let i = 0; i < 6; i += 1) {
    world.floaters.push({
      x: 100 + Math.random() * (world.width - 200),
      y: 60 + Math.random() * (world.height * 0.45),
      size: 4 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      hue: 200 + Math.random() * 40,
    });
  }
}

function resetGame() {
  world.score = 0;
  world.over = false;
  world.atmosphereTimer = 0;
  world.density = 0.85;
  world.densityLabel = 'Buoyant';
  world.obstacles = [];
  world.particles = [];
  world.ambientFlash = 0;
  world.spawnCooldown = 80;
  world.lastSpawnY = 270;

  glider.y = canvas.height * 0.45;
  glider.vy = 0;
  glider.trail = [];
  glider.flicker = 0;
  glider.crashed = false;
  glider.symbiosisCharge = 1;
  glider.symbiosisTimer = 0;

  restartBtn.hidden = true;
  initMotes();
  initNebulae();
  initTerrain();
  initFloaters();
}

/* ========== INPUT ========== */

function pulse() {
  if (world.over) return;
  glider.vy += glider.pulseForce * world.density;
  spawnPulseParticles();
}

function activateSymbiosis() {
  if (world.over) return;
  if (glider.symbiosisCharge < 1 || glider.symbiosisTimer > 0) return;
  glider.symbiosisTimer = 140;
  glider.symbiosisCharge = 0;
}

function spawnPulseParticles() {
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI / 12) * i + (Math.random() - 0.5) * 0.5;
    world.particles.push({
      x: glider.x - 10,
      y: glider.y,
      vx: -1.0 - Math.random() * 1.6,
      vy: Math.sin(angle) * 1.4,
      life: 55 + Math.random() * 35,
      maxLife: 90,
      hue: 190 + Math.random() * 50,
      size: 1.5 + Math.random() * 2,
    });
  }
}

/* ========== CONTROLLED OBSTACLE SPAWNING ========== */

function spawnObstacle() {
  /* Pick type with weighted distribution so they feel intentional */
  const roll = Math.random();
  let type;
  if (roll < 0.3) type = 'spire';
  else if (roll < 0.55) type = 'school';
  else if (roll < 0.78) type = 'geyser';
  else type = 'storm';

  /* Constrain vertical placement relative to last spawn to prevent wild jumps */
  const minY = 90;
  const maxY = world.height - 90;
  const drift = (Math.random() - 0.5) * 0.4;

  let targetY = world.lastSpawnY + (Math.random() - 0.5) * 200;
  targetY = Math.max(minY, Math.min(maxY, targetY));

  /* Give geysers a bottom bias, storms a mid bias */
  if (type === 'geyser') targetY = Math.max(world.height * 0.45, targetY);
  if (type === 'storm') targetY = minY + (maxY - minY) * (0.25 + Math.random() * 0.5);

  world.lastSpawnY = targetY;

  /* Seed sub-details per obstacle for consistent rendering */
  const details = {
    seed: Math.random() * 1000,
    variant: Math.floor(Math.random() * 3),
  };

  /* Spire: generate crystal facet offsets */
  if (type === 'spire') {
    details.facets = [];
    const numFacets = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numFacets; i += 1) {
      details.facets.push({
        yOff: -100 + Math.random() * 200,
        side: Math.random() < 0.5 ? -1 : 1,
        len: 6 + Math.random() * 12,
        alpha: 0.15 + Math.random() * 0.25,
      });
    }
    details.veinCount = 2 + Math.floor(Math.random() * 3);
    details.baseRubble = 2 + Math.floor(Math.random() * 3);
  }

  /* School: generate individual fish */
  if (type === 'school') {
    details.fish = [];
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i += 1) {
      details.fish.push({
        ox: (Math.random() - 0.5) * 50,
        oy: (Math.random() - 0.5) * 40,
        size: 6 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        hue: 150 + Math.random() * 40,
        speed: 0.8 + Math.random() * 0.6,
      });
    }
  }

  /* Geyser: generate steam puff positions */
  if (type === 'geyser') {
    details.puffs = [];
    for (let i = 0; i < 5; i += 1) {
      details.puffs.push({
        yOff: -140 - Math.random() * 40,
        xOff: (Math.random() - 0.5) * 24,
        size: 8 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
      });
    }
    details.ventWidth = 10 + Math.random() * 6;
  }

  /* Storm: generate lightning bolt segments */
  if (type === 'storm') {
    details.bolts = [];
    const boltCount = 2 + Math.floor(Math.random() * 2);
    for (let b = 0; b < boltCount; b += 1) {
      const angle = (Math.PI * 2 / boltCount) * b + Math.random() * 0.5;
      const segments = [];
      let bx = 0, by = 0;
      const segCount = 3 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segCount; s += 1) {
        const len = 10 + Math.random() * 14;
        bx += Math.cos(angle + (Math.random() - 0.5) * 0.8) * len;
        by += Math.sin(angle + (Math.random() - 0.5) * 0.8) * len;
        segments.push({ x: bx, y: by });
      }
      details.bolts.push({ segments, flickerPhase: Math.random() * Math.PI * 2 });
    }
    details.swirlCount = 3 + Math.floor(Math.random() * 3);
  }

  world.obstacles.push({
    type,
    x: world.width + 120,
    y: targetY,
    drift,
    age: 0,
    scored: false,
    pulse: Math.random() * Math.PI * 2,
    details,
  });
}

/* ========== ATMOSPHERE ========== */

function updateAtmosphere() {
  world.atmosphereTimer += 1;
  if (world.atmosphereTimer % 420 === 0) {
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
    }
  }
}

/* ========== UPDATE ========== */

function update() {
  if (world.over) {
    glider.flicker += 0.04;
    updateMotes();
    return;
  }

  updateAtmosphere();

  /* Controlled spawning with cooldown */
  world.spawnCooldown -= 1;
  if (world.spawnCooldown <= 0) {
    spawnObstacle();
    /* Variable gap: 110-170 frames between obstacles */
    world.spawnCooldown = 110 + Math.floor(Math.random() * 60);
  }

  glider.vy += glider.gravity * world.density;
  glider.vy *= 0.988;
  glider.y += glider.vy;

  glider.trail.push({ x: glider.x - 16, y: glider.y, life: 52 });
  if (glider.trail.length > 90) glider.trail.shift();

  if (glider.symbiosisTimer > 0) {
    glider.symbiosisTimer -= 1;
    if (glider.symbiosisTimer === 0) {
      glider.symbiosisCharge = Math.min(1, glider.symbiosisCharge + 1);
    }
  }

  if (glider.y < -40 || glider.y > world.height + 40) {
    crash();
  }

  world.obstacles.forEach((obstacle) => {
    obstacle.x -= world.scrollSpeed + (1 - world.density) * 1.2;
    obstacle.y += obstacle.drift;
    obstacle.age += 1;
    obstacle.pulse += 0.03;

    if (!obstacle.scored && obstacle.x + 40 < glider.x) {
      obstacle.scored = true;
      world.score += 1;
      if (world.score % 8 === 0) {
        glider.symbiosisCharge = 1;
      }
    }

    if (checkCollision(obstacle) && glider.symbiosisTimer <= 0) {
      crash();
    }
  });

  world.obstacles = world.obstacles.filter((o) => o.x > -220);

  world.particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.97;
    particle.vy *= 0.98;
    particle.life -= 1;
  });
  world.particles = world.particles.filter((p) => p.life > 0);

  updateMotes();

  scoreNode.textContent = String(world.score);
  densityNode.textContent = world.densityLabel;
  symbiosisNode.textContent = glider.symbiosisTimer > 0 ? 'Phasing' : glider.symbiosisCharge >= 1 ? 'Ready' : 'Charging';
}

function updateMotes() {
  const t = performance.now() * 0.001;
  for (const mote of world.motes) {
    mote.x += mote.vx;
    mote.y += mote.vy + Math.sin(t + mote.phase) * 0.08;
    if (mote.x < -10) {
      mote.x = world.width + 10;
      mote.y = Math.random() * world.height;
    }
    if (mote.y < -10) mote.y = world.height + 10;
    if (mote.y > world.height + 10) mote.y = -10;
  }
}

function crash() {
  world.over = true;
  glider.crashed = true;
  restartBtn.hidden = false;
}

function checkCollision(obstacle) {
  const gx = glider.x;
  const gy = glider.y;
  if (obstacle.type === 'spire') {
    return Math.abs(gx - obstacle.x) < 34 && Math.abs(gy - obstacle.y) < 110;
  }
  if (obstacle.type === 'school') {
    return Math.abs(gx - obstacle.x) < 44 && Math.abs(gy - obstacle.y) < 42;
  }
  if (obstacle.type === 'geyser') {
    return Math.abs(gx - obstacle.x) < 28 && gy > obstacle.y - 120;
  }
  return Math.abs(gx - obstacle.x) < 48 && Math.abs(gy - obstacle.y) < 72;
}

/* ========== DRAWING: BACKGROUND ========== */

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, world.height);
  grad.addColorStop(0, '#1a2248');
  grad.addColorStop(0.30, '#111540');
  grad.addColorStop(0.65, '#0a0d2e');
  grad.addColorStop(1, '#030410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.width, world.height);

  const t = performance.now();

  /* Stars: varied sizes and brightness classes */
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 193 + t * 0.008) % world.width;
    const y = (i * 97 + Math.sin(i * 0.7) * 20) % world.height;
    const twinkle = Math.sin(i * 1.3 + t * 0.0015);
    const bright = i % 12 === 0;
    const alpha = bright ? 0.15 + twinkle * 0.1 : 0.04 + (twinkle + 1) * 0.05;
    const radius = bright ? 2 + twinkle * 0.6 : 1.2 + twinkle * 0.3;
    const hue = 190 + (i % 7) * 12;
    ctx.fillStyle = `hsla(${hue}, ${bright ? 40 : 60}%, ${bright ? 90 : 82}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    /* Cross-flare on bright stars */
    if (bright && twinkle > 0.3) {
      ctx.strokeStyle = `hsla(${hue}, 40%, 90%, ${alpha * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    }
  }

  /* Nebula fog layers */
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

  /* Atmospheric haze bands */
  for (let b = 0; b < 3; b += 1) {
    const bandY = world.height * (0.3 + b * 0.2);
    const bandAlpha = 0.02 + Math.sin(t * 0.0003 + b) * 0.008;
    ctx.fillStyle = `rgba(80, 120, 180, ${bandAlpha})`;
    ctx.fillRect(0, bandY - 15, world.width, 30);
  }

  /* Distant floating rock structures */
  const ft = t * 0.001;
  for (const fl of world.floaters) {
    const fx = (fl.x - t * 0.012 * fl.speed) % (world.width + 60) + 30;
    const fy = fl.y + Math.sin(ft * 0.5 + fl.phase) * 6;
    const s = fl.size;

    ctx.fillStyle = `hsla(${fl.hue}, 30%, 25%, 0.35)`;
    ctx.beginPath();
    ctx.moveTo(fx - s, fy + s * 0.4);
    ctx.lineTo(fx - s * 0.3, fy - s);
    ctx.lineTo(fx + s * 0.5, fy - s * 0.7);
    ctx.lineTo(fx + s, fy + s * 0.2);
    ctx.closePath();
    ctx.fill();

    /* Highlight edge */
    ctx.strokeStyle = `hsla(${fl.hue}, 40%, 55%, 0.15)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(fx - s * 0.3, fy - s);
    ctx.lineTo(fx + s * 0.5, fy - s * 0.7);
    ctx.stroke();
  }

  /* Terrain silhouette along the bottom */
  const segW = world.width / (world.terrain.length - 1);
  const terrainScroll = (t * 0.015) % segW;

  ctx.beginPath();
  ctx.moveTo(0, world.height);
  for (let i = 0; i < world.terrain.length; i += 1) {
    const tx = i * segW - terrainScroll;
    let th = world.terrain[i].height;
    if (world.terrain[i].peak) th += world.terrain[i].peakExtra;
    ctx.lineTo(tx, world.height - th);
  }
  ctx.lineTo(world.width + 20, world.height);
  ctx.closePath();

  const terrGrad = ctx.createLinearGradient(0, world.height - 80, 0, world.height);
  terrGrad.addColorStop(0, 'rgba(15, 20, 45, 0.7)');
  terrGrad.addColorStop(0.5, 'rgba(10, 14, 35, 0.85)');
  terrGrad.addColorStop(1, 'rgba(5, 8, 20, 0.95)');
  ctx.fillStyle = terrGrad;
  ctx.fill();

  /* Terrain top edge glow */
  ctx.beginPath();
  for (let i = 0; i < world.terrain.length; i += 1) {
    const tx = i * segW - terrainScroll;
    let th = world.terrain[i].height;
    if (world.terrain[i].peak) th += world.terrain[i].peakExtra;
    if (i === 0) ctx.moveTo(tx, world.height - th);
    else ctx.lineTo(tx, world.height - th);
  }
  ctx.strokeStyle = 'rgba(100, 160, 220, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

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
    world.ambientFlash *= 0.90;
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

/* ========== DRAWING: DETAILED OBSTACLES ========== */

function drawObstacles() {
  const t = performance.now();

  for (const obstacle of world.obstacles) {
    const wobble = Math.sin(obstacle.pulse) * 3;
    const x = obstacle.x;
    const y = obstacle.y + wobble;
    const d = obstacle.details;

    if (obstacle.type === 'spire') {
      drawSpire(x, y, obstacle.pulse, d);
    } else if (obstacle.type === 'school') {
      drawSchool(x, y, obstacle.pulse, d, t);
    } else if (obstacle.type === 'geyser') {
      drawGeyser(x, y, obstacle.pulse, d, t);
    } else {
      drawStorm(x, y, obstacle.pulse, d, t);
    }
  }
}

function drawSpire(x, y, pulse, d) {
  /* Outer glow halo */
  const sg = ctx.createRadialGradient(x, y, 0, x, y, 90);
  sg.addColorStop(0, 'rgba(168, 246, 255, 0.05)');
  sg.addColorStop(1, 'transparent');
  ctx.fillStyle = sg;
  ctx.fillRect(x - 90, y - 140, 180, 280);

  /* Main crystal body */
  const spireGrad = ctx.createLinearGradient(x, y - 130, x, y + 130);
  spireGrad.addColorStop(0, 'rgba(210, 255, 255, 0.9)');
  spireGrad.addColorStop(0.3, 'rgba(160, 240, 255, 0.7)');
  spireGrad.addColorStop(0.7, 'rgba(120, 210, 240, 0.5)');
  spireGrad.addColorStop(1, 'rgba(80, 160, 200, 0.25)');
  ctx.fillStyle = spireGrad;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 130);
  ctx.lineTo(x + 16, y + 130);
  ctx.lineTo(x + 6, y - 20);
  ctx.lineTo(x, y - 130);
  ctx.lineTo(x - 6, y - 20);
  ctx.closePath();
  ctx.fill();

  /* Crystal edge highlight (left facet) */
  ctx.fillStyle = 'rgba(220, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 130);
  ctx.lineTo(x - 6, y - 20);
  ctx.lineTo(x, y - 130);
  ctx.lineTo(x, y + 130);
  ctx.closePath();
  ctx.fill();

  /* Crystal facet branches */
  if (d.facets) {
    for (const facet of d.facets) {
      const fy = y + facet.yOff;
      const edgeX = facet.side > 0
        ? x + 8 + (130 - Math.abs(facet.yOff)) * 0.08
        : x - 8 - (130 - Math.abs(facet.yOff)) * 0.08;
      ctx.fillStyle = `rgba(180, 250, 255, ${facet.alpha})`;
      ctx.beginPath();
      ctx.moveTo(edgeX, fy);
      ctx.lineTo(edgeX + facet.side * facet.len, fy - 4);
      ctx.lineTo(edgeX + facet.side * facet.len * 0.6, fy + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* Internal veins */
  if (d.veinCount) {
    ctx.strokeStyle = 'rgba(200, 255, 255, 0.12)';
    ctx.lineWidth = 0.6;
    for (let v = 0; v < d.veinCount; v += 1) {
      const vx = x + (v - d.veinCount / 2) * 4;
      ctx.beginPath();
      ctx.moveTo(vx, y + 100);
      ctx.quadraticCurveTo(vx + Math.sin(v * 2.1) * 6, y, vx + Math.sin(v * 1.3) * 3, y - 100);
      ctx.stroke();
    }
  }

  /* Base rubble */
  if (d.baseRubble) {
    for (let r = 0; r < d.baseRubble; r += 1) {
      const rx = x - 20 + r * 14 + Math.sin(d.seed + r) * 5;
      const ry = y + 128 + Math.sin(d.seed + r * 2) * 3;
      const rs = 3 + Math.sin(d.seed + r * 3) * 2;
      ctx.fillStyle = 'rgba(140, 220, 240, 0.3)';
      ctx.beginPath();
      ctx.moveTo(rx - rs, ry + rs * 0.5);
      ctx.lineTo(rx, ry - rs);
      ctx.lineTo(rx + rs, ry + rs * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* Tip glow */
  const tipGlow = ctx.createRadialGradient(x, y - 130, 0, x, y - 130, 14);
  tipGlow.addColorStop(0, `rgba(220, 255, 255, ${0.4 + Math.sin(pulse * 2) * 0.15})`);
  tipGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = tipGlow;
  ctx.beginPath();
  ctx.arc(x, y - 130, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawSchool(x, y, pulse, d, t) {
  if (!d.fish) return;

  /* Group glow */
  const gg = ctx.createRadialGradient(x, y, 0, x, y, 55);
  gg.addColorStop(0, 'rgba(130, 255, 210, 0.04)');
  gg.addColorStop(1, 'transparent');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(x, y, 55, 0, Math.PI * 2);
  ctx.fill();

  for (const fish of d.fish) {
    const swim = Math.sin(pulse * fish.speed + fish.phase);
    const fx = x + fish.ox + swim * 5;
    const fy = y + fish.oy + Math.cos(pulse * fish.speed * 0.7 + fish.phase) * 4;
    const s = fish.size;
    const angle = swim * 0.15;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle);

    /* Fish body */
    const bodyGrad = ctx.createRadialGradient(-s * 0.2, 0, s * 0.2, 0, 0, s);
    bodyGrad.addColorStop(0, `hsla(${fish.hue}, 80%, 80%, 0.7)`);
    bodyGrad.addColorStop(0.6, `hsla(${fish.hue}, 70%, 60%, 0.45)`);
    bodyGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Tail fin */
    ctx.fillStyle = `hsla(${fish.hue}, 65%, 65%, 0.4)`;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(-s * 1.3, -s * 0.4 + swim * 2);
    ctx.lineTo(-s * 1.3, s * 0.4 + swim * 2);
    ctx.closePath();
    ctx.fill();

    /* Dorsal fin */
    ctx.fillStyle = `hsla(${fish.hue}, 60%, 70%, 0.3)`;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.35);
    ctx.lineTo(s * 0.2, -s * 0.75);
    ctx.lineTo(s * 0.5, -s * 0.3);
    ctx.closePath();
    ctx.fill();

    /* Eye */
    ctx.fillStyle = `hsla(${fish.hue}, 30%, 95%, 0.8)`;
    ctx.beginPath();
    ctx.arc(s * 0.5, -s * 0.08, s * 0.12, 0, Math.PI * 2);
    ctx.fill();

    /* Bioluminescent spots */
    const spotAlpha = 0.3 + Math.sin(t * 0.003 + fish.phase) * 0.15;
    ctx.fillStyle = `hsla(${fish.hue + 30}, 90%, 80%, ${spotAlpha})`;
    ctx.beginPath();
    ctx.arc(s * 0.1, s * 0.1, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-s * 0.25, -s * 0.05, s * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawGeyser(x, y, pulse, d, t) {
  const vw = d.ventWidth || 14;

  /* Vent base structure */
  ctx.fillStyle = 'rgba(60, 90, 130, 0.5)';
  ctx.beginPath();
  ctx.moveTo(x - vw * 1.5, y + 10);
  ctx.lineTo(x - vw * 0.6, y - 20);
  ctx.lineTo(x + vw * 0.6, y - 20);
  ctx.lineTo(x + vw * 1.5, y + 10);
  ctx.closePath();
  ctx.fill();

  /* Vent rim highlight */
  ctx.strokeStyle = 'rgba(150, 220, 255, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - vw * 0.6, y - 20);
  ctx.lineTo(x + vw * 0.6, y - 20);
  ctx.stroke();

  /* Vent opening glow */
  const ventGlow = ctx.createRadialGradient(x, y - 15, 0, x, y - 15, vw);
  ventGlow.addColorStop(0, 'rgba(180, 240, 255, 0.5)');
  ventGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = ventGlow;
  ctx.beginPath();
  ctx.arc(x, y - 15, vw, 0, Math.PI * 2);
  ctx.fill();

  /* Main geyser column with taper */
  const colGrad = ctx.createLinearGradient(x, y - 160, x, y - 20);
  colGrad.addColorStop(0, 'rgba(200, 245, 255, 0.15)');
  colGrad.addColorStop(0.3, 'rgba(150, 220, 255, 0.55)');
  colGrad.addColorStop(0.7, 'rgba(120, 200, 255, 0.65)');
  colGrad.addColorStop(1, 'rgba(160, 235, 255, 0.75)');
  ctx.fillStyle = colGrad;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 160);
  ctx.quadraticCurveTo(x - 6 + Math.sin(pulse * 3) * 2, y - 90, x - vw * 0.4, y - 20);
  ctx.lineTo(x + vw * 0.4, y - 20);
  ctx.quadraticCurveTo(x + 6 + Math.sin(pulse * 3 + 1) * 2, y - 90, x + 3, y - 160);
  ctx.closePath();
  ctx.fill();

  /* Column edge shimmer */
  ctx.strokeStyle = 'rgba(200, 250, 255, 0.2)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 160);
  ctx.quadraticCurveTo(x - 6 + Math.sin(pulse * 3) * 2, y - 90, x - vw * 0.4, y - 20);
  ctx.stroke();

  /* Steam puffs at the top */
  if (d.puffs) {
    for (const puff of d.puffs) {
      const px = x + puff.xOff + Math.sin(t * 0.002 + puff.phase) * 5;
      const py = y + puff.yOff + Math.sin(t * 0.0015 + puff.phase * 1.3) * 4;
      const pSize = puff.size + Math.sin(t * 0.003 + puff.phase) * 3;
      const pAlpha = 0.12 + Math.sin(t * 0.002 + puff.phase) * 0.05;

      const pg = ctx.createRadialGradient(px, py, 0, px, py, pSize);
      pg.addColorStop(0, `rgba(200, 245, 255, ${pAlpha})`);
      pg.addColorStop(0.6, `rgba(150, 220, 250, ${pAlpha * 0.4})`);
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Droplets rising from the column */
  for (let i = 0; i < 4; i += 1) {
    const dy = y - 30 - ((t * 0.04 + i * 35 + d.seed * 10) % 130);
    const dx = x + Math.sin(dy * 0.08 + d.seed) * 8;
    const da = Math.max(0, 0.4 - (y - 30 - dy) * 0.004);
    ctx.fillStyle = `rgba(200, 250, 255, ${da})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStorm(x, y, pulse, d, t) {
  const stormR = 52 + Math.sin(pulse) * 6;

  /* Outer atmospheric halo */
  const outerHalo = ctx.createRadialGradient(x, y, stormR * 0.5, x, y, stormR * 1.8);
  outerHalo.addColorStop(0, 'rgba(140, 170, 230, 0.03)');
  outerHalo.addColorStop(0.6, 'rgba(120, 150, 220, 0.05)');
  outerHalo.addColorStop(1, 'transparent');
  ctx.fillStyle = outerHalo;
  ctx.beginPath();
  ctx.arc(x, y, stormR * 1.8, 0, Math.PI * 2);
  ctx.fill();

  /* Swirl arcs */
  if (d.swirlCount) {
    for (let s = 0; s < d.swirlCount; s += 1) {
      const sAngle = (Math.PI * 2 / d.swirlCount) * s + pulse * 0.5;
      const sR = stormR * (0.5 + s * 0.12);
      const sAlpha = 0.08 + Math.sin(pulse + s) * 0.03;
      ctx.strokeStyle = `rgba(170, 210, 255, ${sAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, sR, sAngle, sAngle + Math.PI * 0.6);
      ctx.stroke();
    }
  }

  /* Main ring */
  const ringAlpha = 0.35 + Math.sin(pulse * 2) * 0.12;
  ctx.strokeStyle = `rgba(185, 220, 255, ${ringAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, stormR, 0, Math.PI * 2);
  ctx.stroke();

  /* Inner ring */
  ctx.strokeStyle = 'rgba(200, 235, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, stormR * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  /* Core glow */
  const coreG = ctx.createRadialGradient(x, y, 0, x, y, stormR * 0.35);
  coreG.addColorStop(0, `rgba(200, 230, 255, ${0.08 + Math.sin(pulse * 3) * 0.04})`);
  coreG.addColorStop(1, 'transparent');
  ctx.fillStyle = coreG;
  ctx.beginPath();
  ctx.arc(x, y, stormR * 0.35, 0, Math.PI * 2);
  ctx.fill();

  /* Lightning bolts */
  if (d.bolts) {
    for (const bolt of d.bolts) {
      const flicker = Math.sin(t * 0.008 + bolt.flickerPhase);
      if (flicker < 0.1) continue;

      const bAlpha = 0.15 + flicker * 0.3;
      ctx.strokeStyle = `rgba(200, 230, 255, ${bAlpha})`;
      ctx.lineWidth = 1 + flicker * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (const seg of bolt.segments) {
        ctx.lineTo(x + seg.x, y + seg.y);
      }
      ctx.stroke();

      /* Bolt glow */
      if (flicker > 0.5) {
        const lastSeg = bolt.segments[bolt.segments.length - 1];
        const bGlow = ctx.createRadialGradient(
          x + lastSeg.x, y + lastSeg.y, 0,
          x + lastSeg.x, y + lastSeg.y, 8
        );
        bGlow.addColorStop(0, `rgba(220, 240, 255, ${flicker * 0.3})`);
        bGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(x + lastSeg.x, y + lastSeg.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (Math.random() < 0.012) world.ambientFlash = 0.12;
}

/* ========== DRAWING: DETAILED GLIDER ========== */

function drawGlider() {
  /* Trail */
  for (const trail of glider.trail) {
    trail.life -= 1;
    const ratio = Math.max(0, trail.life / 52);
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
  glider.trail = glider.trail.filter((tr) => tr.life > 0);

  const phase = glider.symbiosisTimer > 0;
  const t = performance.now();
  const tiltAngle = glider.vy * 0.04;

  ctx.save();
  ctx.translate(glider.x, glider.y);
  ctx.rotate(tiltAngle);

  /* Outer ethereal glow */
  const glowPulse = Math.sin(t * 0.003) * 0.03;
  const outerAlpha = phase ? 0.14 + glowPulse : 0.06 + glowPulse;
  const outerR = phase ? 50 : 38;
  const og = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
  og.addColorStop(0, `rgba(130, 255, 240, ${outerAlpha})`);
  og.addColorStop(0.5, `rgba(100, 200, 230, ${outerAlpha * 0.4})`);
  og.addColorStop(1, 'transparent');
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fill();

  /* Wing membranes (translucent, behind body) */
  const wingFlutter = Math.sin(t * 0.008) * 0.12;
  const bodyAlpha = phase ? 0.42 + Math.sin(t * 0.015) * 0.14 : 0.88;

  /* Left wing */
  ctx.fillStyle = `rgba(100, 240, 220, ${bodyAlpha * 0.25})`;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.quadraticCurveTo(-22, -16 + wingFlutter * 30, -30, -8 + wingFlutter * 20);
  ctx.quadraticCurveTo(-20, 2, -6, 3);
  ctx.closePath();
  ctx.fill();
  /* Wing vein */
  ctx.strokeStyle = `rgba(160, 255, 240, ${bodyAlpha * 0.2})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-18, -8 + wingFlutter * 15, -28, -6 + wingFlutter * 18);
  ctx.stroke();

  /* Right wing */
  ctx.fillStyle = `rgba(100, 240, 220, ${bodyAlpha * 0.25})`;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.quadraticCurveTo(-22, 16 - wingFlutter * 25, -30, 10 - wingFlutter * 18);
  ctx.quadraticCurveTo(-20, 0, -6, -1);
  ctx.closePath();
  ctx.fill();
  /* Wing vein */
  ctx.strokeStyle = `rgba(160, 255, 240, ${bodyAlpha * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(-6, 1);
  ctx.quadraticCurveTo(-18, 10 - wingFlutter * 12, -28, 8 - wingFlutter * 16);
  ctx.stroke();

  /* Body ridges (segments) */
  for (let seg = 0; seg < 3; seg += 1) {
    const sx = -4 + seg * 5;
    const segAlpha = bodyAlpha * (0.12 - seg * 0.02);
    ctx.strokeStyle = `rgba(180, 255, 250, ${segAlpha})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(sx, 0, 2, 10 - seg * 1.5, 0, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
  }

  /* Main body */
  const bodyGrad = ctx.createRadialGradient(-4, -3, 2, 0, 0, 20);
  bodyGrad.addColorStop(0, `rgba(200, 255, 250, ${bodyAlpha})`);
  bodyGrad.addColorStop(0.5, `rgba(112, 255, 233, ${bodyAlpha * 0.8})`);
  bodyGrad.addColorStop(1, `rgba(60, 200, 210, ${bodyAlpha * 0.3})`);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Body outline shimmer */
  ctx.strokeStyle = `rgba(180, 255, 248, ${bodyAlpha * 0.25})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
  ctx.stroke();

  /* Underbelly lighter patch */
  ctx.fillStyle = `rgba(180, 255, 250, ${bodyAlpha * 0.15})`;
  ctx.beginPath();
  ctx.ellipse(2, 4, 12, 5, 0.1, 0, Math.PI * 2);
  ctx.fill();

  /* Antennae / feelers */
  const antennaWave = Math.sin(t * 0.006) * 4;
  ctx.strokeStyle = `rgba(170, 255, 245, ${bodyAlpha * 0.5})`;
  ctx.lineWidth = 0.8;
  /* Top antenna */
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.quadraticCurveTo(20, -14 + antennaWave, 24, -18 + antennaWave);
  ctx.stroke();
  /* Antenna tip glow */
  ctx.fillStyle = `rgba(200, 255, 250, ${0.4 + Math.sin(t * 0.005) * 0.2})`;
  ctx.beginPath();
  ctx.arc(24, -18 + antennaWave, 1.8, 0, Math.PI * 2);
  ctx.fill();

  /* Bottom antenna */
  ctx.strokeStyle = `rgba(170, 255, 245, ${bodyAlpha * 0.4})`;
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.quadraticCurveTo(19, 10 - antennaWave * 0.7, 22, 12 - antennaWave * 0.7);
  ctx.stroke();
  ctx.fillStyle = `rgba(200, 255, 250, ${0.3 + Math.sin(t * 0.005 + 1) * 0.15})`;
  ctx.beginPath();
  ctx.arc(22, 12 - antennaWave * 0.7, 1.4, 0, Math.PI * 2);
  ctx.fill();

  /* Eye - larger with detail */
  ctx.fillStyle = `rgba(230, 255, 255, ${bodyAlpha * 0.9})`;
  ctx.beginPath();
  ctx.arc(9, -3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  /* Pupil */
  ctx.fillStyle = `rgba(40, 100, 110, ${bodyAlpha})`;
  ctx.beginPath();
  ctx.arc(10, -3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  /* Eye highlight */
  ctx.fillStyle = `rgba(255, 255, 255, ${bodyAlpha * 0.7})`;
  ctx.beginPath();
  ctx.arc(8, -4.5, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  /* Crash effect: ethereal dissipation rings */
  if (glider.crashed) {
    const fade = 0.3 + Math.sin(glider.flicker) * 0.15;
    for (let r = 0; r < 3; r += 1) {
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

/* ========== DRAWING: PARTICLES & TEXT ========== */

function drawParticles() {
  for (const particle of world.particles) {
    const ratio = particle.life / (particle.maxLife || 65);
    const alpha = ratio * 0.7;
    const size = (particle.size || 2.2) * (0.5 + ratio * 0.5);

    const pg = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size * 3);
    pg.addColorStop(0, `hsla(${particle.hue}, 80%, 78%, ${alpha})`);
    pg.addColorStop(0.5, `hsla(${particle.hue}, 60%, 60%, ${alpha * 0.3})`);
    pg.addColorStop(1, 'transparent');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawText() {
  if (!world.over) return;

  const vg = ctx.createRadialGradient(
    world.width / 2, world.height / 2, world.height * 0.15,
    world.width / 2, world.height / 2, world.width * 0.7
  );
  vg.addColorStop(0, 'rgba(8, 12, 30, 0.35)');
  vg.addColorStop(1, 'rgba(4, 6, 16, 0.65)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#d8eaff';
  ctx.textAlign = 'center';
  ctx.font = '600 38px Inter, sans-serif';
  ctx.fillText('Signal Lost', world.width / 2, world.height / 2 - 10);

  ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
  ctx.font = '500 20px Inter, sans-serif';
  ctx.fillText(`Distance: ${world.score}`, world.width / 2, world.height / 2 + 28);
}

/* ========== GAME LOOP ========== */

function gameLoop() {
  update();
  drawBackground();
  drawMotes();
  drawObstacles();
  drawParticles();
  drawGlider();
  drawText();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    pulse();
  }
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    activateSymbiosis();
  }
});

canvas.addEventListener('pointerdown', pulse);
restartBtn.addEventListener('click', resetGame);

resetGame();
gameLoop();

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

/* --- Ambient motes: drifting ethereal spores --- */
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

/* --- Nebula fog layers --- */
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

function resetGame() {
  world.score = 0;
  world.over = false;
  world.atmosphereTimer = 0;
  world.density = 0.85;
  world.densityLabel = 'Buoyant';
  world.obstacles = [];
  world.particles = [];
  world.ambientFlash = 0;

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
}

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

function spawnObstacle() {
  const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
  const gapY = 80 + Math.random() * (world.height - 160);
  const drift = (Math.random() - 0.5) * 0.6;

  world.obstacles.push({
    type,
    x: world.width + 120,
    y: gapY,
    drift,
    age: 0,
    scored: false,
    pulse: Math.random() * Math.PI * 2,
  });
}

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

function update() {
  if (world.over) {
    glider.flicker += 0.04;
    updateMotes();
    return;
  }

  updateAtmosphere();

  if (Math.random() < 0.018) {
    spawnObstacle();
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

/* ========== DRAWING ========== */

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, world.height);
  grad.addColorStop(0, '#1a2248');
  grad.addColorStop(0.35, '#111540');
  grad.addColorStop(0.7, '#0a0d2e');
  grad.addColorStop(1, '#030410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.width, world.height);

  /* Twinkling stars with softer palette */
  const t = performance.now();
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 193 + t * 0.008) % world.width;
    const y = (i * 97 + Math.sin(i * 0.7) * 20) % world.height;
    const twinkle = Math.sin(i * 1.3 + t * 0.0015);
    const alpha = 0.04 + (twinkle + 1) * 0.06;
    const hue = 190 + (i % 5) * 15;
    ctx.fillStyle = `hsla(${hue}, 60%, 82%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + twinkle * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Drifting nebula fog layers */
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

  /* Ambient flash (softer, more diffused) */
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
    const pulse = Math.sin(t * 1.5 + mote.phase);
    const alpha = 0.12 + pulse * 0.08;
    ctx.fillStyle = `hsla(${mote.hue}, 55%, 75%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.size + pulse * 0.5, 0, Math.PI * 2);
    ctx.fill();

    /* Soft glow around larger motes */
    if (mote.size > 2) {
      ctx.fillStyle = `hsla(${mote.hue}, 50%, 70%, ${alpha * 0.2})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawObstacles() {
  for (const obstacle of world.obstacles) {
    const wobble = Math.sin(obstacle.pulse) * 4;
    const x = obstacle.x;
    const y = obstacle.y + wobble;

    if (obstacle.type === 'spire') {
      /* Ethereal glow halo */
      const sg = ctx.createRadialGradient(x, y, 0, x, y, 80);
      sg.addColorStop(0, 'rgba(168, 246, 255, 0.06)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(x - 80, y - 130, 160, 260);

      /* Spire body with gradient */
      const spireGrad = ctx.createLinearGradient(x, y - 130, x, y + 130);
      spireGrad.addColorStop(0, 'rgba(200, 255, 255, 0.85)');
      spireGrad.addColorStop(0.5, 'rgba(140, 230, 250, 0.6)');
      spireGrad.addColorStop(1, 'rgba(100, 180, 220, 0.3)');
      ctx.fillStyle = spireGrad;
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 130);
      ctx.lineTo(x + 18, y + 130);
      ctx.lineTo(x, y - 130);
      ctx.closePath();
      ctx.fill();
    } else if (obstacle.type === 'school') {
      for (let i = 0; i < 5; i += 1) {
        const sa = 0.3 + i * 0.07;
        const glow = ctx.createRadialGradient(
          x - i * 8, y + Math.sin(obstacle.pulse + i) * 12, 0,
          x - i * 8, y + Math.sin(obstacle.pulse + i) * 12, 28 - i * 2
        );
        glow.addColorStop(0, `rgba(143, 255, 213, ${sa})`);
        glow.addColorStop(0.6, `rgba(100, 220, 190, ${sa * 0.4})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(x - i * 8, y + Math.sin(obstacle.pulse + i) * 12, 24 - i * 2, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obstacle.type === 'geyser') {
      /* Geyser glow column */
      const gg = ctx.createLinearGradient(x, y - 140, x, y + 120);
      gg.addColorStop(0, 'rgba(180, 230, 255, 0.7)');
      gg.addColorStop(0.4, 'rgba(117, 198, 255, 0.5)');
      gg.addColorStop(1, 'rgba(80, 150, 220, 0.15)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - 7, y - 120, 14, 240);

      /* Geyser head with soft bloom */
      const hg = ctx.createRadialGradient(x, y - 120, 0, x, y - 120, 35);
      hg.addColorStop(0, 'rgba(220, 250, 255, 0.8)');
      hg.addColorStop(0.5, 'rgba(160, 230, 255, 0.3)');
      hg.addColorStop(1, 'transparent');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(x, y - 120, 28, 0, Math.PI * 2);
      ctx.fill();
    } else {
      /* Storm: ethereal pulsing ring with halo */
      const stormR = 52 + Math.sin(obstacle.pulse) * 8;
      const shg = ctx.createRadialGradient(x, y, stormR * 0.6, x, y, stormR * 1.4);
      shg.addColorStop(0, 'rgba(160, 200, 255, 0.04)');
      shg.addColorStop(0.7, 'rgba(140, 180, 255, 0.06)');
      shg.addColorStop(1, 'transparent');
      ctx.fillStyle = shg;
      ctx.beginPath();
      ctx.arc(x, y, stormR * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(185, 220, 255, ${0.4 + Math.sin(obstacle.pulse * 2) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, stormR, 0, Math.PI * 2);
      ctx.stroke();

      /* Inner ring */
      ctx.strokeStyle = 'rgba(200, 235, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, stormR * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      if (Math.random() < 0.015) world.ambientFlash = 0.14;
    }
  }
}

function drawGlider() {
  /* Ethereal trail: wispy, fading, with gradient glow */
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
  glider.trail = glider.trail.filter((t) => t.life > 0);

  const phase = glider.symbiosisTimer > 0;

  /* Outer ethereal glow around glider */
  const glowPulse = Math.sin(performance.now() * 0.003) * 0.03;
  const outerAlpha = phase ? 0.12 + glowPulse : 0.06 + glowPulse;
  const outerR = phase ? 48 : 36;
  const og = ctx.createRadialGradient(glider.x, glider.y, 0, glider.x, glider.y, outerR);
  og.addColorStop(0, `rgba(130, 255, 240, ${outerAlpha})`);
  og.addColorStop(0.5, `rgba(100, 200, 230, ${outerAlpha * 0.4})`);
  og.addColorStop(1, 'transparent');
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.arc(glider.x, glider.y, outerR, 0, Math.PI * 2);
  ctx.fill();

  /* Glider body */
  const bodyAlpha = phase ? 0.42 + Math.sin(performance.now() * 0.015) * 0.14 : 0.88;
  const bodyGrad = ctx.createRadialGradient(glider.x - 4, glider.y - 3, 2, glider.x, glider.y, 20);
  bodyGrad.addColorStop(0, `rgba(200, 255, 250, ${bodyAlpha})`);
  bodyGrad.addColorStop(0.6, `rgba(112, 255, 233, ${bodyAlpha * 0.8})`);
  bodyGrad.addColorStop(1, `rgba(60, 200, 210, ${bodyAlpha * 0.3})`);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(glider.x, glider.y, 19, 12, glider.vy * 0.04, 0, Math.PI * 2);
  ctx.fill();

  /* Eye highlight */
  ctx.fillStyle = `rgba(230, 255, 255, ${bodyAlpha * 0.9})`;
  ctx.beginPath();
  ctx.arc(glider.x + 8, glider.y - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();

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

function drawParticles() {
  for (const particle of world.particles) {
    const ratio = particle.life / (particle.maxLife || 65);
    const alpha = ratio * 0.7;
    const size = (particle.size || 2.2) * (0.5 + ratio * 0.5);

    /* Soft glow particle */
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

  /* Ethereal vignette overlay */
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

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
};

const glider = {
  x: 210,
  y: canvas.height * 0.45,
  vy: 0,
  gravity: 0.18,
  pulseForce: -4.6,
  radius: 16,
  trail: [],
  flicker: 0,
  crashed: false,
  symbiosisCharge: 1,
  symbiosisTimer: 0,
};

const hazardTypes = ['spire', 'school', 'geyser', 'storm'];

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
  for (let i = 0; i < 8; i += 1) {
    world.particles.push({
      x: glider.x - 10,
      y: glider.y,
      vx: -1.2 - Math.random() * 2,
      vy: (Math.random() - 0.5) * 1.8,
      life: 40 + Math.random() * 25,
      hue: 175 + Math.random() * 70,
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
    return;
  }

  updateAtmosphere();

  if (Math.random() < 0.018) {
    spawnObstacle();
  }

  glider.vy += glider.gravity * world.density;
  glider.vy *= 0.992;
  glider.y += glider.vy;

  glider.trail.push({ x: glider.x - 16, y: glider.y, life: 42 });
  if (glider.trail.length > 75) glider.trail.shift();

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
    particle.life -= 1;
  });
  world.particles = world.particles.filter((p) => p.life > 0);

  scoreNode.textContent = String(world.score);
  densityNode.textContent = world.densityLabel;
  symbiosisNode.textContent = glider.symbiosisTimer > 0 ? 'Phasing' : glider.symbiosisCharge >= 1 ? 'Ready' : 'Charging';
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

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, world.height);
  grad.addColorStop(0, '#182550');
  grad.addColorStop(0.45, '#11153d');
  grad.addColorStop(1, '#040612');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.width, world.height);

  for (let i = 0; i < 60; i += 1) {
    const x = (i * 193 + performance.now() * 0.01) % world.width;
    const y = (i * 97) % world.height;
    const alpha = 0.08 + (Math.sin((i + performance.now() * 0.002)) + 1) * 0.04;
    ctx.fillStyle = `rgba(139, 219, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (world.ambientFlash > 0) {
    ctx.fillStyle = `rgba(120, 180, 255, ${world.ambientFlash})`;
    ctx.fillRect(0, 0, world.width, world.height);
    world.ambientFlash *= 0.88;
  }
}

function drawObstacles() {
  for (const obstacle of world.obstacles) {
    const wobble = Math.sin(obstacle.pulse) * 5;
    const x = obstacle.x;
    const y = obstacle.y + wobble;

    if (obstacle.type === 'spire') {
      ctx.fillStyle = 'rgba(168, 246, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(x - 20, y + 130);
      ctx.lineTo(x + 20, y + 130);
      ctx.lineTo(x, y - 130);
      ctx.closePath();
      ctx.fill();
    } else if (obstacle.type === 'school') {
      for (let i = 0; i < 5; i += 1) {
        ctx.fillStyle = `rgba(143, 255, 213, ${0.45 + i * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(x - i * 8, y + Math.sin(obstacle.pulse + i) * 12, 20 - i * 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obstacle.type === 'geyser') {
      ctx.fillStyle = 'rgba(117, 198, 255, 0.75)';
      ctx.fillRect(x - 8, y - 120, 16, 240);
      ctx.fillStyle = 'rgba(195, 242, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y - 120, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(185, 220, 255, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 54 + Math.sin(obstacle.pulse) * 8, 0, Math.PI * 2);
      ctx.stroke();
      if (Math.random() < 0.015) world.ambientFlash = 0.16;
    }
  }
}

function drawGlider() {
  for (const trail of glider.trail) {
    trail.life -= 1;
    const alpha = Math.max(0, trail.life / 42) * 0.32;
    ctx.fillStyle = `rgba(141, 249, 245, ${alpha})`;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, 11 * (trail.life / 42), 0, Math.PI * 2);
    ctx.fill();
  }
  glider.trail = glider.trail.filter((t) => t.life > 0);

  const phase = glider.symbiosisTimer > 0;
  const bodyAlpha = phase ? 0.42 + Math.sin(performance.now() * 0.02) * 0.12 : 0.92;
  ctx.fillStyle = `rgba(112, 255, 233, ${bodyAlpha})`;
  ctx.beginPath();
  ctx.ellipse(glider.x, glider.y, 19, 12, glider.vy * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(214, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(glider.x + 8, glider.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  if (glider.crashed) {
    const fade = 0.45 + Math.sin(glider.flicker) * 0.2;
    ctx.fillStyle = `rgba(140, 220, 255, ${fade})`;
    ctx.beginPath();
    ctx.arc(glider.x, glider.y + 25, 24, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const particle of world.particles) {
    const alpha = particle.life / 65;
    ctx.fillStyle = `hsla(${particle.hue}, 100%, 72%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawText() {
  if (!world.over) return;
  ctx.fillStyle = 'rgba(11, 16, 35, 0.52)';
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = '#dbecff';
  ctx.textAlign = 'center';
  ctx.font = '600 40px Inter, sans-serif';
  ctx.fillText('Signal Lost', world.width / 2, world.height / 2 - 10);
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillText(`Distance: ${world.score}`, world.width / 2, world.height / 2 + 28);
}

function gameLoop() {
  update();
  drawBackground();
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

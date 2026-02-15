const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hpEl = document.getElementById('hp');
const scoreEl = document.getElementById('score');
const powerEl = document.getElementById('powerup');
const restartBtn = document.getElementById('restart');

const gravity = 0.38;
const flapForce = -6.9;
const pipeWidth = 70;
const pipeGap = 170;
const basePipeSpeed = 2.35;
const maxHp = 3;

const player = {
  x: 90,
  y: canvas.height / 2,
  radius: 15,
  velocity: 0,
  hp: 3,
  invulnUntil: 0,
  powerup: null,
  powerupUntil: 0
};

let pipes = [];
let pickups = [];
let score = 0;
let gameOver = false;
let started = false;
let pipeSpawnTick = 0;
let frame = 0;

function now() {
  return performance.now();
}

function reset() {
  player.y = canvas.height / 2;
  player.velocity = 0;
  player.hp = maxHp;
  player.invulnUntil = 0;
  player.powerup = null;
  player.powerupUntil = 0;

  pipes = [];
  pickups = [];
  score = 0;
  gameOver = false;
  started = false;
  pipeSpawnTick = 0;
  frame = 0;

  restartBtn.hidden = true;
  renderHud();
}

function activePowerLabel() {
  if (!player.powerup || now() > player.powerupUntil) return 'None';
  return player.powerup;
}

function renderHud() {
  hpEl.textContent = player.hp;
  scoreEl.textContent = Math.floor(score);
  powerEl.textContent = activePowerLabel();
}

function flap() {
  if (gameOver) return;
  started = true;
  player.velocity = flapForce;
}

function spawnPickup(type, x, y) {
  pickups.push({
    x,
    y,
    type,
    size: 12,
    collected: false
  });
}

function spawnPipe() {
  const topHeight = 70 + Math.random() * (canvas.height - pipeGap - 180);
  pipes.push({
    x: canvas.width + 20,
    topHeight,
    passed: false,
    hitAt: 0
  });

  // Dynamic pickup chance: healing appears more often when player is hurt.
  const hpMissing = maxHp - player.hp;
  const healChance = Math.min(0.35, 0.08 + hpMissing * 0.1);
  const powerChance = 0.14;
  const roll = Math.random();

  if (roll < healChance) {
    spawnPickup(
      'heal',
      canvas.width + 55,
      120 + Math.random() * (canvas.height - 260)
    );
  } else if (roll < healChance + powerChance) {
    spawnPickup(
      'power',
      canvas.width + 55,
      120 + Math.random() * (canvas.height - 260)
    );
  }
}

function activatePowerup() {
  const powers = ['Shield', 'Slow Time'];
  const selected = powers[Math.floor(Math.random() * powers.length)];
  player.powerup = selected;
  player.powerupUntil = now() + 7000;

  if (selected === 'Shield') {
    player.invulnUntil = Math.max(player.invulnUntil, now() + 7000);
  }
}

function hasActivePowerup(name) {
  return player.powerup === name && now() < player.powerupUntil;
}

function activePipeSpeed() {
  return hasActivePowerup('Slow Time') ? basePipeSpeed * 0.62 : basePipeSpeed;
}

function activeGravity() {
  return gravity;
}

function circleVsRect(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function maybeDropEmergencyHeart() {
  // Chance to recover after taking damage, matching "chance for healing lost hp".
  if (player.hp <= 0 || player.hp >= maxHp) return;
  if (Math.random() < 0.45) {
    spawnPickup('heal', player.x + 120, Math.max(40, Math.min(canvas.height - 60, player.y)));
  }
}

function damagePlayer() {
  if (now() < player.invulnUntil) return;

  player.hp -= 1;
  player.invulnUntil = now() + 1200;
  maybeDropEmergencyHeart();

  if (player.hp <= 0) {
    gameOver = true;
    restartBtn.hidden = false;
  }
}

function update() {
  frame += 1;
  if (!started || gameOver) return;

  if (player.powerup && now() > player.powerupUntil) {
    player.powerup = null;
  }

  player.velocity += activeGravity();
  player.y += player.velocity;

  if (player.y + player.radius > canvas.height - 6) {
    player.y = canvas.height - 6 - player.radius;
    damagePlayer();
    player.velocity = -4.2;
  }

  if (player.y - player.radius < 0) {
    player.y = player.radius;
    damagePlayer();
    player.velocity = 0;
  }

  pipeSpawnTick += 1;
  if (pipeSpawnTick > 96) {
    spawnPipe();
    pipeSpawnTick = 0;
  }

  const speed = activePipeSpeed();

  pipes.forEach((pipe) => {
    pipe.x -= speed;

    const topRect = { x: pipe.x, y: 0, w: pipeWidth, h: pipe.topHeight };
    const bottomRect = {
      x: pipe.x,
      y: pipe.topHeight + pipeGap,
      w: pipeWidth,
      h: canvas.height - (pipe.topHeight + pipeGap)
    };

    if (circleVsRect(player, topRect) || circleVsRect(player, bottomRect)) {
      damagePlayer();
      player.velocity = -4.8;
      pipe.hitAt = now();
    }

    if (!pipe.passed && pipe.x + pipeWidth < player.x) {
      pipe.passed = true;
      score += 1;
    }
  });

  pipes = pipes.filter((p) => p.x + pipeWidth > -10);

  pickups.forEach((pickup) => {
    pickup.x -= speed;
    const dx = player.x - pickup.x;
    const dy = player.y - pickup.y;
    const collected = dx * dx + dy * dy < (player.radius + pickup.size) ** 2;
    if (!collected) return;

    if (pickup.type === 'heal') {
      player.hp = Math.min(maxHp, player.hp + 1);
    } else {
      activatePowerup();
    }
    pickup.collected = true;
  });

  pickups = pickups.filter((p) => !p.collected && p.x > -30);

  renderHud();
}

function drawPlayer() {
  const isInvulnerable = now() < player.invulnUntil;
  const blink = isInvulnerable && frame % 12 < 6;
  if (blink) return;

  ctx.beginPath();
  ctx.fillStyle = '#f59e0b';
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = '#111827';
  ctx.arc(player.x + 5, player.y - 4, 3, 0, Math.PI * 2);
  ctx.fill();

  if (hasActivePowerup('Shield')) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(125,211,252,0.9)';
    ctx.lineWidth = 3;
    ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPipes() {
  pipes.forEach((pipe) => {
    ctx.fillStyle = now() - pipe.hitAt < 150 ? '#f43f5e' : '#166534';
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    ctx.fillRect(pipe.x, pipe.topHeight + pipeGap, pipeWidth, canvas.height - (pipe.topHeight + pipeGap));
  });
}

function drawPickups() {
  pickups.forEach((pickup) => {
    if (pickup.type === 'heal') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(pickup.x - 4, pickup.y - 1, 6, 0, Math.PI * 2);
      ctx.arc(pickup.x + 4, pickup.y - 1, 6, 0, Math.PI * 2);
      ctx.fillRect(pickup.x - 10, pickup.y - 1, 20, 11);
      ctx.beginPath();
      ctx.moveTo(pickup.x - 10, pickup.y + 10);
      ctx.lineTo(pickup.x + 10, pickup.y + 10);
      ctx.lineTo(pickup.x, pickup.y + 21);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI / 5) * i;
        const r = i % 2 === 0 ? 12 : 5;
        const x = pickup.x + Math.cos(angle - Math.PI / 2) * r;
        const y = pickup.y + Math.sin(angle - Math.PI / 2) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawPipes();
  drawPickups();
  drawPlayer();

  if (!started) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(45, 230, 330, 145);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '18px sans-serif';
    ctx.fillText('Click or press Space to start', 90, 273);
    ctx.font = '14px sans-serif';
    ctx.fillText('You now have HP, healing chance, and powerups.', 74, 305);
    ctx.fillText('Only die when HP reaches 0.', 140, 330);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
    ctx.fillRect(70, 240, 280, 130);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '22px sans-serif';
    ctx.fillText('Game Over', 155, 286);
    ctx.font = '17px sans-serif';
    ctx.fillText(`Final Score: ${Math.floor(score)}`, 145, 320);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    flap();
  }
});

canvas.addEventListener('mousedown', flap);
restartBtn.addEventListener('click', reset);

reset();
loop();

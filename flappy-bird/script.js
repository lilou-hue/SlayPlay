const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");

/* --- i18n setup --- */
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();

window.addEventListener('langchange', () => {
  I18N.applyDOM();
  draw();
});

const gameState = {
  gravity: 1800,
  lift: -520,
  speed: 190,
  gap: 150,
  pipeWidth: 62,
  pipeInterval: 1400,
  spawnTimer: 0,
  score: 0,
  best: 0,
  isRunning: false,
  isGameOver: false,
  lastTime: 0,
  shakeTimer: 0,
  shakeIntensity: 0,
  scorePop: 0,
  lastScore: 0,
};

const bird = {
  x: 80,
  y: canvas.height / 2,
  radius: 14,
  velocity: 0,
  trail: [],
  wingAngle: 0,
};

let pipes = [];
let clouds = [];
let windParticles = [];

/* --- Parallax clouds --- */
function initClouds() {
  clouds = [];
  for (let i = 0; i < 8; i += 1) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 30 + Math.random() * (canvas.height * 0.5),
      width: 40 + Math.random() * 60,
      height: 16 + Math.random() * 20,
      speed: 0.15 + Math.random() * 0.35,
      alpha: 0.15 + Math.random() * 0.2,
    });
  }
}

const loadBestScore = () => {
  const storedBest = Number(window.localStorage.getItem("flappyBest"));
  if (!Number.isNaN(storedBest)) {
    gameState.best = storedBest;
    bestScoreLabel.textContent = gameState.best;
  }
};

const saveBestScore = () => {
  if (gameState.score > gameState.best) {
    gameState.best = gameState.score;
    bestScoreLabel.textContent = gameState.best;
    window.localStorage.setItem("flappyBest", String(gameState.best));
  }
};

const resetGame = () => {
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.trail = [];
  bird.wingAngle = 0;
  pipes = [];
  windParticles = [];
  gameState.spawnTimer = 0;
  gameState.score = 0;
  gameState.isGameOver = false;
  gameState.isRunning = false;
  gameState.shakeTimer = 0;
  gameState.shakeIntensity = 0;
  gameState.scorePop = 0;
  gameState.lastScore = 0;
  scoreLabel.textContent = gameState.score;
  initClouds();
  draw();
};

const spawnPipe = () => {
  const minHeight = 60;
  const maxHeight = canvas.height - gameState.gap - 160;
  const topHeight = Math.floor(
    Math.random() * (maxHeight - minHeight + 1) + minHeight
  );
  pipes.push({
    x: canvas.width + gameState.pipeWidth,
    top: topHeight,
    passed: false,
  });
};

/* --- Wind particles for speed feel --- */
const spawnWindParticle = () => {
  windParticles.push({
    x: canvas.width + 5,
    y: Math.random() * canvas.height,
    length: 8 + Math.random() * 18,
    speed: 280 + Math.random() * 180,
    alpha: 0.08 + Math.random() * 0.12,
  });
};

const drawBackground = () => {
  /* Sky gradient */
  const skyGrad = context.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, "#5cb8ff");
  skyGrad.addColorStop(0.55, "#a8e0ff");
  skyGrad.addColorStop(0.85, "#d4f0d4");
  skyGrad.addColorStop(1, "#7be495");
  context.fillStyle = skyGrad;
  context.fillRect(0, 0, canvas.width, canvas.height);

  /* Parallax clouds */
  for (const cloud of clouds) {
    context.fillStyle = `rgba(255, 255, 255, ${cloud.alpha})`;
    context.beginPath();
    context.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(cloud.x - cloud.width * 0.25, cloud.y + 4, cloud.width * 0.35, cloud.height * 0.4, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(cloud.x + cloud.width * 0.25, cloud.y + 3, cloud.width * 0.3, cloud.height * 0.35, 0, 0, Math.PI * 2);
    context.fill();
  }

  /* Ground layers */
  context.fillStyle = "rgba(123, 228, 149, 0.5)";
  context.fillRect(0, canvas.height - 90, canvas.width, 90);

  const groundGrad = context.createLinearGradient(0, canvas.height - 35, 0, canvas.height);
  groundGrad.addColorStop(0, "#6cd47e");
  groundGrad.addColorStop(1, "#4fb866");
  context.fillStyle = groundGrad;
  context.fillRect(0, canvas.height - 35, canvas.width, 35);
};

/* --- Wind streaks for speed --- */
const drawWind = () => {
  for (const w of windParticles) {
    context.strokeStyle = `rgba(255, 255, 255, ${w.alpha})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(w.x, w.y);
    context.lineTo(w.x + w.length, w.y);
    context.stroke();
  }
};

const drawBird = () => {
  context.save();
  context.translate(bird.x, bird.y);

  /* Tilt based on velocity: nose up when flapping, nose down when falling */
  const tilt = Math.max(-0.5, Math.min(0.65, bird.velocity * 0.0012));
  context.rotate(tilt);

  /* Speed trail behind the bird */
  for (let i = 0; i < bird.trail.length; i += 1) {
    const t = bird.trail[i];
    const age = 1 - i / bird.trail.length;
    const alpha = age * 0.2;
    const r = bird.radius * age * 0.7;
    context.fillStyle = `rgba(255, 210, 80, ${alpha})`;
    context.beginPath();
    context.arc(t.x - bird.x, t.y - bird.y, r, 0, Math.PI * 2);
    context.fill();
  }

  /* Body shadow */
  context.fillStyle = "rgba(200, 140, 0, 0.25)";
  context.beginPath();
  context.arc(1, 2, bird.radius + 1, 0, Math.PI * 2);
  context.fill();

  /* Body */
  const bodyGrad = context.createRadialGradient(-3, -3, 2, 0, 0, bird.radius);
  bodyGrad.addColorStop(0, "#ffe066");
  bodyGrad.addColorStop(0.7, "#ffcc4d");
  bodyGrad.addColorStop(1, "#f0a030");
  context.fillStyle = bodyGrad;
  context.beginPath();
  context.arc(0, 0, bird.radius, 0, Math.PI * 2);
  context.fill();

  /* Wing with flap animation */
  bird.wingAngle += (bird.velocity < -100 ? 0.35 : -0.15);
  bird.wingAngle = Math.max(-0.4, Math.min(0.5, bird.wingAngle));
  const wingY = Math.sin(bird.wingAngle * 4) * 5;
  context.fillStyle = "#f0a030";
  context.beginPath();
  context.ellipse(-6, wingY + 2, 8, 4, -0.3 + bird.wingAngle * 0.5, 0, Math.PI * 2);
  context.fill();

  /* Beak */
  context.fillStyle = "#ff7b54";
  context.beginPath();
  context.moveTo(bird.radius - 2, -3);
  context.lineTo(bird.radius + 8, 0);
  context.lineTo(bird.radius - 2, 3);
  context.closePath();
  context.fill();

  /* Eye */
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(-2, -5, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1b2a36";
  context.beginPath();
  context.arc(-1, -5, 2.2, 0, Math.PI * 2);
  context.fill();

  /* Eye highlight */
  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  context.beginPath();
  context.arc(-3, -6.5, 1.2, 0, Math.PI * 2);
  context.fill();

  context.restore();
};

const drawPipes = () => {
  pipes.forEach((pipe) => {
    /* Pipe cap dimensions */
    const capW = gameState.pipeWidth + 10;
    const capH = 18;
    const capX = pipe.x - 5;

    /* Top pipe body */
    const topGrad = context.createLinearGradient(pipe.x, 0, pipe.x + gameState.pipeWidth, 0);
    topGrad.addColorStop(0, "#2d8a5e");
    topGrad.addColorStop(0.3, "#3da870");
    topGrad.addColorStop(0.7, "#35966a");
    topGrad.addColorStop(1, "#28774e");
    context.fillStyle = topGrad;
    context.fillRect(pipe.x, 0, gameState.pipeWidth, pipe.top - capH);

    /* Top cap */
    const capGrad = context.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, "#2d8a5e");
    capGrad.addColorStop(0.3, "#45b87a");
    capGrad.addColorStop(0.7, "#3da870");
    capGrad.addColorStop(1, "#28774e");
    context.fillStyle = capGrad;
    context.beginPath();
    context.roundRect(capX, pipe.top - capH, capW, capH, [4, 4, 0, 0]);
    context.fill();

    /* Highlight stripe on top pipe */
    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.fillRect(pipe.x + 8, 0, 6, pipe.top - capH);

    const bottomY = pipe.top + gameState.gap;

    /* Bottom pipe body */
    context.fillStyle = topGrad;
    context.fillRect(pipe.x, bottomY + capH, gameState.pipeWidth, canvas.height - bottomY - capH);

    /* Bottom cap */
    context.fillStyle = capGrad;
    context.beginPath();
    context.roundRect(capX, bottomY, capW, capH, [0, 0, 4, 4]);
    context.fill();

    /* Highlight stripe on bottom pipe */
    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.fillRect(pipe.x + 8, bottomY + capH, 6, canvas.height - bottomY - capH);

    /* Pipe shadow (inner edge) */
    context.fillStyle = "rgba(0, 0, 0, 0.1)";
    context.fillRect(pipe.x + gameState.pipeWidth - 8, 0, 8, pipe.top - capH);
    context.fillRect(pipe.x + gameState.pipeWidth - 8, bottomY + capH, 8, canvas.height - bottomY - capH);
  });
};

/* --- Score pop animation --- */
const drawScorePop = () => {
  if (gameState.scorePop > 0) {
    const scale = 1 + gameState.scorePop * 0.6;
    const alpha = gameState.scorePop;
    context.save();
    context.translate(canvas.width / 2, canvas.height * 0.15);
    context.scale(scale, scale);
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.font = "bold 28px 'Trebuchet MS'";
    context.textAlign = "center";
    context.fillText(`+1`, 0, 0);
    context.restore();
    gameState.scorePop *= 0.88;
    if (gameState.scorePop < 0.02) gameState.scorePop = 0;
  }
};

const drawOverlay = (title, subtitle) => {
  /* Soft vignette instead of flat overlay */
  const vg = context.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.1,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.7
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = vg;
  context.fillRect(0, 0, canvas.width, canvas.height);

  /* Title with subtle shadow */
  context.fillStyle = "rgba(0, 0, 0, 0.3)";
  context.font = "bold 34px 'Trebuchet MS'";
  context.textAlign = "center";
  context.fillText(title, canvas.width / 2 + 1, canvas.height / 2 - 15);

  context.fillStyle = "#ffffff";
  context.fillText(title, canvas.width / 2, canvas.height / 2 - 16);

  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  context.font = "16px 'Trebuchet MS'";
  context.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 18);
};

const detectCollision = (pipe) => {
  const withinPipeX =
    bird.x + bird.radius > pipe.x &&
    bird.x - bird.radius < pipe.x + gameState.pipeWidth;
  if (!withinPipeX) {
    return false;
  }

  const hitTop = bird.y - bird.radius < pipe.top;
  const hitBottom = bird.y + bird.radius > pipe.top + gameState.gap;
  return hitTop || hitBottom;
};

const updateScore = () => {
  pipes.forEach((pipe) => {
    if (!pipe.passed && pipe.x + gameState.pipeWidth < bird.x) {
      pipe.passed = true;
      gameState.score += 1;
      scoreLabel.textContent = gameState.score;
      gameState.scorePop = 1;
    }
  });
};

const update = (deltaSeconds) => {
  if (!gameState.isRunning || gameState.isGameOver) {
    return;
  }

  gameState.spawnTimer += deltaSeconds * 1000;
  if (gameState.spawnTimer >= gameState.pipeInterval) {
    gameState.spawnTimer = 0;
    spawnPipe();
  }

  /* Spawn wind particles periodically */
  if (Math.random() < 0.3) {
    spawnWindParticle();
  }

  bird.velocity += gameState.gravity * deltaSeconds;
  bird.y += bird.velocity * deltaSeconds;

  /* Record trail positions */
  bird.trail.push({ x: bird.x, y: bird.y });
  if (bird.trail.length > 8) bird.trail.shift();

  if (bird.y + bird.radius >= canvas.height || bird.y - bird.radius <= 0) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
  }

  pipes.forEach((pipe) => {
    pipe.x -= gameState.speed * deltaSeconds;
  });

  pipes = pipes.filter((pipe) => pipe.x + gameState.pipeWidth > -10);

  if (pipes.some(detectCollision)) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
  }

  if (gameState.isGameOver) {
    saveBestScore();
  }

  updateScore();

  /* Update clouds */
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * deltaSeconds * 60;
    if (cloud.x < -cloud.width) {
      cloud.x = canvas.width + cloud.width;
      cloud.y = 30 + Math.random() * (canvas.height * 0.5);
    }
  }

  /* Update wind particles */
  windParticles.forEach((w) => {
    w.x -= w.speed * deltaSeconds;
  });
  windParticles = windParticles.filter((w) => w.x + w.length > 0);

  /* Decay screen shake */
  if (gameState.shakeTimer > 0) {
    gameState.shakeTimer -= 1;
    gameState.shakeIntensity *= 0.82;
  }
};

const draw = () => {
  context.save();

  /* Apply screen shake */
  if (gameState.shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * gameState.shakeIntensity;
    const sy = (Math.random() - 0.5) * gameState.shakeIntensity;
    context.translate(sx, sy);
  }

  context.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);
  drawBackground();
  drawWind();
  drawPipes();
  drawBird();
  drawScorePop();

  if (!gameState.isRunning && !gameState.isGameOver) {
    drawOverlay(I18N.t("tapToStart"), I18N.t("keepBirdInGaps"));
  }

  if (gameState.isGameOver) {
    drawOverlay(I18N.t("gameOver"), I18N.t("tapOrSpaceTryAgain"));
  }

  context.restore();
};

const loop = (timestamp) => {
  if (!gameState.lastTime) {
    gameState.lastTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - gameState.lastTime) / 1000, 0.033);
  gameState.lastTime = timestamp;

  update(deltaSeconds);
  draw();
  requestAnimationFrame(loop);
};

const startGame = () => {
  if (!gameState.isRunning) {
    gameState.isRunning = true;
  }
};

const flap = () => {
  if (gameState.isGameOver) {
    resetGame();
    startGame();
  } else if (!gameState.isRunning) {
    startGame();
  }

  bird.velocity = gameState.lift;
};

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  flap();
});

canvas.addEventListener("dblclick", (event) => {
  event.preventDefault();
});

restartButton.addEventListener("click", () => {
  resetGame();
});

loadBestScore();
resetGame();
requestAnimationFrame(loop);

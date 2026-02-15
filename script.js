const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");

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
};

const bird = {
  x: 80,
  y: canvas.height / 2,
  radius: 14,
  velocity: 0,
};

let pipes = [];

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
  pipes = [];
  gameState.spawnTimer = 0;
  gameState.score = 0;
  gameState.isGameOver = false;
  gameState.isRunning = false;
  scoreLabel.textContent = gameState.score;
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

const drawBackground = () => {
  context.fillStyle = "rgba(255, 255, 255, 0.2)";
  context.fillRect(0, canvas.height - 90, canvas.width, 90);

  const cloudOffset = gameState.isRunning
    ? (gameState.lastTime * 0.02) % canvas.width
    : 0;
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  for (let index = -1; index < 3; index += 1) {
    const cloudX = index * 170 + 80 - cloudOffset;
    const cloudY = 70 + (index % 2 === 0 ? 20 : 0);
    context.beginPath();
    context.arc(cloudX, cloudY, 18, 0, Math.PI * 2);
    context.arc(cloudX + 20, cloudY - 8, 14, 0, Math.PI * 2);
    context.arc(cloudX + 38, cloudY, 17, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#84b8d6";
  context.beginPath();
  context.moveTo(0, canvas.height - 90);
  context.lineTo(65, canvas.height - 150);
  context.lineTo(125, canvas.height - 90);
  context.lineTo(190, canvas.height - 145);
  context.lineTo(250, canvas.height - 90);
  context.lineTo(canvas.width, canvas.height - 90);
  context.closePath();
  context.fill();

  context.fillStyle = "#fefefe";
  context.fillRect(0, canvas.height - 35, canvas.width, 35);

  context.fillStyle = "#76cc7e";
  for (let bladeX = 0; bladeX < canvas.width; bladeX += 16) {
    context.beginPath();
    context.moveTo(bladeX, canvas.height - 35);
    context.lineTo(bladeX + 4, canvas.height - 43);
    context.lineTo(bladeX + 8, canvas.height - 35);
    context.fill();
  }
};

const drawBird = () => {
  context.fillStyle = "#ffcc4d";
  context.beginPath();
  context.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ff7b54";
  context.beginPath();
  context.arc(bird.x + 8, bird.y, bird.radius / 3, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#1b2a36";
  context.beginPath();
  context.arc(bird.x - 5, bird.y - 4, 2.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#fff4d6";
  context.beginPath();
  context.ellipse(
    bird.x - 4,
    bird.y + 2,
    bird.radius / 2.8,
    bird.radius / 2,
    Math.PI / 8,
    0,
    Math.PI * 2
  );
  context.fill();

  context.fillStyle = "#e8a81c";
  context.beginPath();
  context.ellipse(
    bird.x - 1,
    bird.y + 3,
    bird.radius / 2.2,
    bird.radius / 3,
    -Math.PI / 6,
    0,
    Math.PI * 2
  );
  context.fill();
};

const drawPipes = () => {
  pipes.forEach((pipe) => {
    context.fillStyle = "#3d9970";
    context.fillRect(pipe.x, 0, gameState.pipeWidth, pipe.top);

    const bottomY = pipe.top + gameState.gap;
    context.fillRect(
      pipe.x,
      bottomY,
      gameState.pipeWidth,
      canvas.height - bottomY
    );

    context.fillStyle = "rgba(0, 0, 0, 0.15)";
    context.fillRect(pipe.x + 6, 0, 10, pipe.top);
    context.fillRect(pipe.x + 6, bottomY, 10, canvas.height - bottomY);

    context.fillStyle = "#48b880";
    context.fillRect(pipe.x - 4, pipe.top - 16, gameState.pipeWidth + 8, 16);
    context.fillRect(pipe.x - 4, bottomY, gameState.pipeWidth + 8, 16);

    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    context.fillRect(pipe.x + 20, 0, 6, pipe.top);
    context.fillRect(pipe.x + 20, bottomY, 6, canvas.height - bottomY);
  });
};

const drawOverlay = (title, subtitle) => {
  context.fillStyle = "rgba(0, 0, 0, 0.4)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#ffffff";
  context.font = "bold 32px 'Trebuchet MS'";
  context.textAlign = "center";
  context.fillText(title, canvas.width / 2, canvas.height / 2 - 16);

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

  bird.velocity += gameState.gravity * deltaSeconds;
  bird.y += bird.velocity * deltaSeconds;

  if (bird.y + bird.radius >= canvas.height || bird.y - bird.radius <= 0) {
    gameState.isGameOver = true;
  }

  pipes.forEach((pipe) => {
    pipe.x -= gameState.speed * deltaSeconds;
  });

  pipes = pipes.filter((pipe) => pipe.x + gameState.pipeWidth > -10);

  if (pipes.some(detectCollision)) {
    gameState.isGameOver = true;
  }

  if (gameState.isGameOver) {
    saveBestScore();
  }

  updateScore();
};

const draw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPipes();
  drawBird();

  if (!gameState.isRunning && !gameState.isGameOver) {
    drawOverlay("Tap to start", "Keep the bird in the gaps.");
  }

  if (gameState.isGameOver) {
    drawOverlay("Game Over", "Tap or press space to try again.");
  }
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

canvas.addEventListener("pointerdown", () => {
  flap();
});

restartButton.addEventListener("click", () => {
  resetGame();
});

loadBestScore();
resetGame();
requestAnimationFrame(loop);

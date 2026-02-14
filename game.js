const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const restartButton = document.getElementById("restart");

const BASE_WIDTH = 360;
const BASE_HEIGHT = 640;

const state = {
  started: false,
  gameOver: false,
  score: 0,
  bestScore: Number(localStorage.getItem("bestScore") || 0),
  bird: {
    x: 90,
    y: BASE_HEIGHT / 2,
    velocity: 0,
    radius: 14,
  },
  gravity: 0.38,
  flapStrength: -7.2,
  pipes: [],
  pipeGap: 155,
  pipeSpeed: 2.4,
  pipeWidth: 62,
  spawnTimer: 0,
  spawnEvery: 115,
  scale: 1,
  rafId: 0,
  paused: false,
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  state.scale = canvas.width / BASE_WIDTH;
  ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0);
}

function resetGame() {
  state.started = false;
  state.gameOver = false;
  state.score = 0;
  state.spawnTimer = 0;
  state.pipes = [];
  state.bird.y = BASE_HEIGHT / 2;
  state.bird.velocity = 0;
  restartButton.hidden = true;
}

function spawnPipe() {
  const margin = 90;
  const available = BASE_HEIGHT - margin * 2 - state.pipeGap;
  const topHeight = margin + Math.random() * available;

  state.pipes.push({
    x: BASE_WIDTH + 20,
    topHeight,
    passed: false,
  });
}

function flap() {
  if (state.gameOver) return;
  if (!state.started) state.started = true;
  state.bird.velocity = state.flapStrength;
}

function endGame() {
  state.gameOver = true;
  state.started = false;
  state.bestScore = Math.max(state.bestScore, state.score);
  localStorage.setItem("bestScore", state.bestScore);
  restartButton.hidden = false;
}

function update() {
  if (!state.started || state.gameOver || state.paused) return;

  state.bird.velocity += state.gravity;
  state.bird.y += state.bird.velocity;
  state.spawnTimer += 1;

  if (state.spawnTimer >= state.spawnEvery) {
    spawnPipe();
    state.spawnTimer = 0;
  }

  for (const pipe of state.pipes) {
    pipe.x -= state.pipeSpeed;

    if (!pipe.passed && pipe.x + state.pipeWidth < state.bird.x) {
      pipe.passed = true;
      state.score += 1;
    }

    const overlapsX =
      state.bird.x + state.bird.radius > pipe.x &&
      state.bird.x - state.bird.radius < pipe.x + state.pipeWidth;

    const hitsTop = state.bird.y - state.bird.radius < pipe.topHeight;
    const hitsBottom = state.bird.y + state.bird.radius > pipe.topHeight + state.pipeGap;

    if (overlapsX && (hitsTop || hitsBottom)) {
      endGame();
    }
  }

  state.pipes = state.pipes.filter((pipe) => pipe.x + state.pipeWidth > -20);

  if (state.bird.y + state.bird.radius > BASE_HEIGHT || state.bird.y - state.bird.radius < 0) {
    endGame();
  }
}

function drawBackground() {
  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.fillStyle = "#7dd87d";
  ctx.fillRect(0, BASE_HEIGHT - 48, BASE_WIDTH, 48);
}

function drawPipes() {
  ctx.fillStyle = "#1eaa59";
  ctx.strokeStyle = "#137a3d";
  ctx.lineWidth = 3;

  for (const pipe of state.pipes) {
    const bottomY = pipe.topHeight + state.pipeGap;

    ctx.fillRect(pipe.x, 0, state.pipeWidth, pipe.topHeight);
    ctx.strokeRect(pipe.x, 0, state.pipeWidth, pipe.topHeight);

    ctx.fillRect(pipe.x, bottomY, state.pipeWidth, BASE_HEIGHT - bottomY);
    ctx.strokeRect(pipe.x, bottomY, state.pipeWidth, BASE_HEIGHT - bottomY);
  }
}

function drawBird() {
  ctx.beginPath();
  ctx.arc(state.bird.x, state.bird.y, state.bird.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f9d423";
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(state.bird.x + 4, state.bird.y - 4, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.closePath();
}

function drawHud() {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 4;
  ctx.font = "bold 34px Arial";
  ctx.textAlign = "center";

  const scoreText = String(state.score);
  ctx.strokeText(scoreText, BASE_WIDTH / 2, 74);
  ctx.fillText(scoreText, BASE_WIDTH / 2, 74);

  ctx.font = "18px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#16213e";
  ctx.fillText(`Best: ${state.bestScore}`, 16, 34);

  if (!state.started && !state.gameOver) {
    ctx.textAlign = "center";
    ctx.font = "20px Arial";
    ctx.fillText("Tap to start", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 60);
  }

  if (state.gameOver) {
    ctx.fillStyle = "rgb(0 0 0 / 0.55)";
    ctx.fillRect(24, BASE_HEIGHT / 2 - 100, BASE_WIDTH - 48, 150);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 44);
    ctx.font = "18px Arial";
    ctx.fillText("Tap Restart to play again", BASE_WIDTH / 2, BASE_HEIGHT / 2 - 6);
  }

  if (state.paused && !state.gameOver) {
    ctx.fillStyle = "rgb(0 0 0 / 0.4)";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Paused", BASE_WIDTH / 2, BASE_HEIGHT / 2);
  }
}

function render() {
  drawBackground();
  drawPipes();
  drawBird();
  drawHud();
}

function gameLoop() {
  update();
  render();
  state.rafId = window.requestAnimationFrame(gameLoop);
}

function handleGameTap(event) {
  event.preventDefault();

  if (state.gameOver) {
    resetGame();
    return;
  }

  flap();
}

function setPaused(paused) {
  state.paused = paused;
}

window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("pointerdown", handleGameTap, { passive: false });
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();

    if (state.gameOver) {
      resetGame();
      return;
    }

    flap();
  }
});

document.addEventListener("visibilitychange", () => {
  setPaused(document.hidden);
});

window.addEventListener("blur", () => setPaused(true));
window.addEventListener("focus", () => setPaused(false));

restartButton.addEventListener("click", resetGame);

resizeCanvas();
resetGame();
cancelAnimationFrame(state.rafId);
gameLoop();

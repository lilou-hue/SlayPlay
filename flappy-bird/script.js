const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");
const muteButton = document.getElementById("muteButton");

/* --- Sound system (Web Audio API) --- */
const sound = (() => {
  let ctx = null;
  let muted = false;

  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  const play = (fn) => {
    if (muted) return;
    try { fn(getCtx()); } catch (_) { /* silent fail */ }
  };

  return {
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      muteButton.textContent = muted ? "🔇" : "🔊";
    },

    flap() {
      play((ac) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
        osc.connect(gain).connect(ac.destination);
        osc.start(ac.currentTime);
        osc.stop(ac.currentTime + 0.12);
      });
    },

    score() {
      play((ac) => {
        const t = ac.currentTime;
        [520, 680, 830].forEach((freq, i) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, t + i * 0.07);
          gain.gain.linearRampToValueAtTime(0.15, t + i * 0.07 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.15);
          osc.connect(gain).connect(ac.destination);
          osc.start(t + i * 0.07);
          osc.stop(t + i * 0.07 + 0.15);
        });
      });
    },

    hit() {
      play((ac) => {
        const t = ac.currentTime;
        /* Thud */
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.25);
        /* Noise burst */
        const bufLen = ac.sampleRate * 0.12;
        const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        const noise = ac.createBufferSource();
        const ng = ac.createGain();
        noise.buffer = buf;
        ng.gain.setValueAtTime(0.18, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        noise.connect(ng).connect(ac.destination);
        noise.start(t);
      });
    },

    swoosh() {
      play((ac) => {
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.18);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    },
  };
})();

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
let leafParticles = [];
let featherParticles = [];
let hills = [];
let trees = [];
let grassBlades = [];
let feathersSpawned = false;

/* --- Drip state for top-pipe water drops --- */
let dripState = {
  y: 0,
  alpha: 0.6,
  falling: false,
  timer: 0,
};

/* --- Generate rolling hills (distant silhouette) --- */
function initHills() {
  hills = [];
  const segments = 20;
  const segW = canvas.width / segments;
  for (let i = 0; i <= segments; i++) {
    hills.push({
      x: i * segW,
      y: canvas.height - 90 - 20 - Math.sin(i * 0.7) * 18 - Math.sin(i * 1.3) * 10,
    });
  }
}

/* --- Generate tree silhouettes along ground edge --- */
function initTrees() {
  trees = [];
  const count = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    trees.push({
      x: Math.random() * canvas.width,
      height: 14 + Math.random() * 20,
      width: 8 + Math.random() * 10,
    });
  }
}

/* --- Generate grass blade tufts along ground top edge --- */
function initGrass() {
  grassBlades = [];
  const groundTop = canvas.height - 90;
  for (let x = 0; x < canvas.width; x += 3 + Math.random() * 5) {
    grassBlades.push({
      x: x,
      height: 4 + Math.random() * 8,
      lean: (Math.random() - 0.5) * 3,
    });
  }
}

/* --- Init leaf particles --- */
function initLeaves() {
  leafParticles = [];
  for (let i = 0; i < 4; i++) {
    leafParticles.push({
      x: Math.random() * canvas.width,
      y: 60 + Math.random() * (canvas.height - 160),
      size: 3 + Math.random() * 3,
      speedX: 10 + Math.random() * 20,
      speedY: 5 + Math.random() * 15,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: 1 + Math.random() * 2,
      alpha: 0.35 + Math.random() * 0.25,
    });
  }
}

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
  featherParticles = [];
  feathersSpawned = false;
  dripState = { y: 0, alpha: 0.6, falling: false, timer: 0 };
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
  initHills();
  initTrees();
  initGrass();
  initLeaves();
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
    /* Randomized vine/crack data per pipe */
    vines: [
      { xOff: 8 + Math.random() * 20, amp: 2 + Math.random() * 3, freq: 0.04 + Math.random() * 0.02 },
      { xOff: 30 + Math.random() * 15, amp: 1.5 + Math.random() * 2, freq: 0.05 + Math.random() * 0.03 },
    ],
    cracks: [
      { xOff: 10 + Math.random() * 30, yStart: Math.random() * 0.3, len: 15 + Math.random() * 25, angle: -0.3 + Math.random() * 0.6 },
      { xOff: 5 + Math.random() * 40, yStart: 0.4 + Math.random() * 0.3, len: 10 + Math.random() * 20, angle: -0.4 + Math.random() * 0.8 },
    ],
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

/* --- Spawn feather death particles --- */
const spawnFeatherParticles = () => {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.5;
    featherParticles.push({
      x: bird.x,
      y: bird.y,
      vx: Math.cos(angle) * (40 + Math.random() * 60),
      vy: Math.sin(angle) * (30 + Math.random() * 50) - 30,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
      size: 3 + Math.random() * 4,
      alpha: 0.9,
      color: Math.random() > 0.5 ? "#ffcc4d" : "#f0a030",
      gravity: 120 + Math.random() * 80,
    });
  }
};

/* --- Helper: interpolate color --- */
function lerpColor(a, b, t) {
  const ah = parseInt(a.replace("#", ""), 16);
  const bh = parseInt(b.replace("#", ""), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr}, ${rg}, ${rb})`;
}

const drawBackground = () => {
  /* Sky color shifts with score: bright blue -> golden warm */
  const scoreProgress = Math.min(gameState.score / 30, 1); /* fully warm by score 30 */

  const skyTop = lerpColor("#5cb8ff", "#ff9944", scoreProgress);
  const skyMid = lerpColor("#a8e0ff", "#ffc577", scoreProgress);
  const skyLow = lerpColor("#d4f0d4", "#ffe0a0", scoreProgress);
  const skyBot = lerpColor("#7be495", "#7be495", scoreProgress * 0.3);

  /* Sky gradient */
  const skyGrad = context.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(0.55, skyMid);
  skyGrad.addColorStop(0.85, skyLow);
  skyGrad.addColorStop(1, skyBot);
  context.fillStyle = skyGrad;
  context.fillRect(0, 0, canvas.width, canvas.height);

  /* Sun glow in top-left */
  const sunX = 60;
  const sunY = 50;
  const haloGrad = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 70);
  const haloAlpha = 0.12 + scoreProgress * 0.1;
  haloGrad.addColorStop(0, `rgba(255, 240, 180, ${0.6 + scoreProgress * 0.3})`);
  haloGrad.addColorStop(0.3, `rgba(255, 220, 120, ${haloAlpha})`);
  haloGrad.addColorStop(1, "rgba(255, 220, 120, 0)");
  context.fillStyle = haloGrad;
  context.fillRect(0, 0, 160, 140);

  /* Sun circle */
  context.fillStyle = `rgba(255, 240, 200, ${0.7 + scoreProgress * 0.2})`;
  context.beginPath();
  context.arc(sunX, sunY, 16, 0, Math.PI * 2);
  context.fill();

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

  /* Distant rolling hills layer */
  const groundTop = canvas.height - 90;
  if (hills.length > 1) {
    context.fillStyle = "rgba(80, 160, 100, 0.25)";
    context.beginPath();
    context.moveTo(0, groundTop);
    for (const h of hills) {
      context.lineTo(h.x, h.y);
    }
    context.lineTo(canvas.width, groundTop);
    context.closePath();
    context.fill();

    /* Second, slightly different hill layer for depth */
    context.fillStyle = "rgba(60, 140, 80, 0.15)";
    context.beginPath();
    context.moveTo(0, groundTop);
    for (let i = 0; i < hills.length; i++) {
      context.lineTo(hills[i].x, hills[i].y + 8 + Math.sin(i * 1.1) * 6);
    }
    context.lineTo(canvas.width, groundTop);
    context.closePath();
    context.fill();
  }

  /* Tree silhouettes along ground edge */
  for (const tree of trees) {
    context.fillStyle = "rgba(40, 100, 50, 0.3)";
    /* Trunk */
    context.fillRect(tree.x - 1.5, groundTop - tree.height * 0.4, 3, tree.height * 0.4);
    /* Canopy - triangle */
    context.beginPath();
    context.moveTo(tree.x, groundTop - tree.height);
    context.lineTo(tree.x - tree.width / 2, groundTop - tree.height * 0.3);
    context.lineTo(tree.x + tree.width / 2, groundTop - tree.height * 0.3);
    context.closePath();
    context.fill();
  }

  /* Floating leaf particles */
  for (const leaf of leafParticles) {
    context.save();
    context.translate(leaf.x, leaf.y);
    context.rotate(leaf.rot);
    context.globalAlpha = leaf.alpha;
    context.fillStyle = "#5eaa5e";
    context.beginPath();
    /* Simple leaf shape: two arcs */
    context.moveTo(0, -leaf.size);
    context.quadraticCurveTo(leaf.size, 0, 0, leaf.size);
    context.quadraticCurveTo(-leaf.size, 0, 0, -leaf.size);
    context.fill();
    context.globalAlpha = 1;
    context.restore();
  }

  /* Ground layers */
  context.fillStyle = "rgba(123, 228, 149, 0.5)";
  context.fillRect(0, groundTop, canvas.width, 90);

  const groundGrad = context.createLinearGradient(0, canvas.height - 35, 0, canvas.height);
  groundGrad.addColorStop(0, "#6cd47e");
  groundGrad.addColorStop(1, "#4fb866");
  context.fillStyle = groundGrad;
  context.fillRect(0, canvas.height - 35, canvas.width, 35);

  /* Grass blade tufts along ground top edge */
  context.strokeStyle = "#3aad55";
  context.lineWidth = 1.2;
  for (const g of grassBlades) {
    context.beginPath();
    context.moveTo(g.x, groundTop);
    context.lineTo(g.x + g.lean, groundTop - g.height);
    context.stroke();
  }
  /* Second layer of grass (slightly different color, offset) */
  context.strokeStyle = "#5cc86e";
  context.lineWidth = 1;
  for (let i = 0; i < grassBlades.length; i += 2) {
    const g = grassBlades[i];
    context.beginPath();
    context.moveTo(g.x + 1.5, groundTop);
    context.lineTo(g.x + g.lean + 2, groundTop - g.height * 0.7);
    context.stroke();
  }
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

  /* Feather texture lines on body */
  context.strokeStyle = "rgba(210, 160, 40, 0.35)";
  context.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const yOff = -5 + i * 5;
    context.beginPath();
    context.arc(2, yOff, 8, -0.4, 0.8);
    context.stroke();
  }

  /* Tail feathers (2-3 lines at the back) */
  context.strokeStyle = "#d48a20";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-bird.radius + 2, -2);
  context.lineTo(-bird.radius - 7, -5);
  context.stroke();
  context.beginPath();
  context.moveTo(-bird.radius + 2, 0);
  context.lineTo(-bird.radius - 8, 0);
  context.stroke();
  context.beginPath();
  context.moveTo(-bird.radius + 2, 2);
  context.lineTo(-bird.radius - 7, 4);
  context.stroke();

  /* Multi-segment wing with 3 feather tips */
  bird.wingAngle += (bird.velocity < -100 ? 0.35 : -0.15);
  bird.wingAngle = Math.max(-0.4, Math.min(0.5, bird.wingAngle));
  const wingY = Math.sin(bird.wingAngle * 4) * 5;
  const fanSpread = bird.wingAngle * 0.4;

  /* Base wing shape */
  context.fillStyle = "#f0a030";
  context.beginPath();
  context.ellipse(-6, wingY + 2, 8, 4, -0.3 + bird.wingAngle * 0.5, 0, Math.PI * 2);
  context.fill();

  /* Three feather tips fanning during flap */
  context.strokeStyle = "#d48a20";
  context.lineWidth = 1.8;
  for (let f = -1; f <= 1; f++) {
    const tipAngle = (-0.3 + bird.wingAngle * 0.5) + f * fanSpread;
    const tipLen = 7 + Math.abs(bird.wingAngle) * 4;
    const baseX = -6 + Math.cos(-0.3 + bird.wingAngle * 0.5) * 5;
    const baseY = wingY + 2 + Math.sin(-0.3 + bird.wingAngle * 0.5) * 3;
    context.beginPath();
    context.moveTo(baseX, baseY);
    context.lineTo(
      baseX + Math.cos(tipAngle + Math.PI * 0.7) * tipLen,
      baseY + Math.sin(tipAngle + Math.PI * 0.7) * tipLen
    );
    context.stroke();
  }

  /* Cheek blush */
  context.fillStyle = "rgba(255, 140, 120, 0.35)";
  context.beginPath();
  context.arc(5, 2, 4, 0, Math.PI * 2);
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

  /* Eyebrow that tilts with velocity */
  const browTilt = Math.max(-0.3, Math.min(0.4, bird.velocity * 0.0008));
  context.strokeStyle = "#5a3a10";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(-1, -9, 5, Math.PI + 0.4 + browTilt, Math.PI + 1.2 + browTilt);
  context.stroke();

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

    /* Crack/texture lines on top pipe surface */
    context.strokeStyle = "rgba(20, 60, 30, 0.15)";
    context.lineWidth = 0.8;
    for (const crack of pipe.cracks) {
      const crackY = crack.yStart * (pipe.top - capH);
      context.beginPath();
      context.moveTo(pipe.x + crack.xOff, crackY);
      context.lineTo(
        pipe.x + crack.xOff + Math.cos(crack.angle) * crack.len,
        crackY + Math.sin(crack.angle + 0.8) * crack.len
      );
      context.stroke();
    }

    /* Vine/moss lines climbing up top pipe */
    context.strokeStyle = "rgba(30, 120, 50, 0.25)";
    context.lineWidth = 1.2;
    for (const vine of pipe.vines) {
      context.beginPath();
      for (let vy = 0; vy < pipe.top - capH; vy += 4) {
        const vx = pipe.x + vine.xOff + Math.sin(vy * vine.freq) * vine.amp;
        if (vy === 0) context.moveTo(vx, vy);
        else context.lineTo(vx, vy);
      }
      context.stroke();
    }

    /* Water drip at bottom of top pipe cap */
    if (dripState.falling) {
      const dripX = pipe.x + gameState.pipeWidth * 0.4;
      const dripY = pipe.top + dripState.y;
      context.fillStyle = `rgba(150, 210, 255, ${dripState.alpha})`;
      context.beginPath();
      context.arc(dripX, dripY, 1.8, 0, Math.PI * 2);
      context.fill();
    }

    const bottomY = pipe.top + gameState.gap;

    /* Ambient shadow/glow at pipe gap openings */
    const gapShadowH = 14;
    /* Shadow at bottom of top pipe (inside gap) */
    const topGapShadow = context.createLinearGradient(0, pipe.top - 2, 0, pipe.top + gapShadowH);
    topGapShadow.addColorStop(0, "rgba(0, 0, 0, 0.18)");
    topGapShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = topGapShadow;
    context.fillRect(pipe.x - 5, pipe.top - 2, capW, gapShadowH);

    /* Shadow at top of bottom pipe (inside gap) */
    const botGapShadow = context.createLinearGradient(0, bottomY + 2, 0, bottomY - gapShadowH);
    botGapShadow.addColorStop(0, "rgba(0, 0, 0, 0.18)");
    botGapShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = botGapShadow;
    context.fillRect(pipe.x - 5, bottomY - gapShadowH + 2, capW, gapShadowH);

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

    /* Crack/texture lines on bottom pipe */
    context.strokeStyle = "rgba(20, 60, 30, 0.15)";
    context.lineWidth = 0.8;
    for (const crack of pipe.cracks) {
      const bpHeight = canvas.height - bottomY - capH;
      const crackY = bottomY + capH + crack.yStart * bpHeight;
      context.beginPath();
      context.moveTo(pipe.x + crack.xOff, crackY);
      context.lineTo(
        pipe.x + crack.xOff + Math.cos(crack.angle) * crack.len,
        crackY + Math.sin(crack.angle + 0.8) * crack.len
      );
      context.stroke();
    }

    /* Vine/moss lines climbing up bottom pipe */
    context.strokeStyle = "rgba(30, 120, 50, 0.25)";
    context.lineWidth = 1.2;
    for (const vine of pipe.vines) {
      context.beginPath();
      for (let vy = bottomY + capH; vy < canvas.height; vy += 4) {
        const vx = pipe.x + vine.xOff + Math.sin(vy * vine.freq) * vine.amp;
        if (vy === bottomY + capH) context.moveTo(vx, vy);
        else context.lineTo(vx, vy);
      }
      context.stroke();
    }

    /* Pipe shadow (inner edge) */
    context.fillStyle = "rgba(0, 0, 0, 0.1)";
    context.fillRect(pipe.x + gameState.pipeWidth - 8, 0, 8, pipe.top - capH);
    context.fillRect(pipe.x + gameState.pipeWidth - 8, bottomY + capH, 8, canvas.height - bottomY - capH);
  });
};

/* --- Draw feather death particles --- */
const drawFeatherParticles = () => {
  for (const fp of featherParticles) {
    context.save();
    context.translate(fp.x, fp.y);
    context.rotate(fp.rot);
    context.globalAlpha = fp.alpha;
    context.fillStyle = fp.color;
    /* Feather shape: elongated ellipse */
    context.beginPath();
    context.ellipse(0, 0, fp.size * 0.4, fp.size, 0, 0, Math.PI * 2);
    context.fill();
    /* Feather center line */
    context.strokeStyle = "rgba(180, 120, 0, 0.4)";
    context.lineWidth = 0.5;
    context.beginPath();
    context.moveTo(0, -fp.size);
    context.lineTo(0, fp.size);
    context.stroke();
    context.globalAlpha = 1;
    context.restore();
  }
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
      sound.score();
    }
  });
};

const update = (deltaSeconds) => {
  if (!gameState.isRunning || gameState.isGameOver) {
    /* Still update feather particles even when game over so they animate */
    if (gameState.isGameOver) {
      for (const fp of featherParticles) {
        fp.x += fp.vx * deltaSeconds;
        fp.vy += fp.gravity * deltaSeconds;
        fp.y += fp.vy * deltaSeconds;
        fp.rot += fp.rotSpeed * deltaSeconds;
        fp.alpha *= 0.985;
        if (fp.alpha < 0.01) fp.alpha = 0;
      }
      featherParticles = featherParticles.filter((fp) => fp.alpha > 0);
    }
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
    sound.hit();
  }

  pipes.forEach((pipe) => {
    pipe.x -= gameState.speed * deltaSeconds;
  });

  pipes = pipes.filter((pipe) => pipe.x + gameState.pipeWidth > -10);

  if (pipes.some(detectCollision)) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
    sound.hit();
  }

  if (gameState.isGameOver) {
    saveBestScore();
    if (!feathersSpawned) {
      spawnFeatherParticles();
      feathersSpawned = true;
    }
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

  /* Update leaf particles */
  for (const leaf of leafParticles) {
    leaf.x -= leaf.speedX * deltaSeconds;
    leaf.y += Math.sin(leaf.phase) * leaf.speedY * deltaSeconds;
    leaf.phase += deltaSeconds * 2;
    leaf.rot += leaf.rotSpeed * deltaSeconds;
    if (leaf.x < -10) {
      leaf.x = canvas.width + 10;
      leaf.y = 60 + Math.random() * (canvas.height - 160);
    }
  }

  /* Update drip animation */
  dripState.timer += deltaSeconds;
  if (dripState.timer > 2.5) {
    dripState.falling = true;
    dripState.y += 60 * deltaSeconds;
    dripState.alpha -= 0.4 * deltaSeconds;
    if (dripState.alpha <= 0 || dripState.y > 30) {
      dripState = { y: 0, alpha: 0.6, falling: false, timer: 0 };
    }
  } else {
    dripState.falling = false;
  }

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
  drawFeatherParticles();
  drawScorePop();

  if (!gameState.isRunning && !gameState.isGameOver) {
    drawOverlay("Tap to start", "Keep the bird in the gaps.");
  }

  if (gameState.isGameOver) {
    drawOverlay("Game Over", "Tap or press space to try again.");
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
    sound.swoosh();
  } else if (!gameState.isRunning) {
    startGame();
    sound.swoosh();
  }

  bird.velocity = gameState.lift;
  sound.flap();
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

muteButton.addEventListener("click", () => {
  sound.toggleMute();
});

loadBestScore();
resetGame();
requestAnimationFrame(loop);

/**
 * Tetris — full game logic, rendering, and input handling.
 * Canvas 2D, no dependencies except audio.js (Audio global).
 */
(function () {
  "use strict";

  /* ================================================================== */
  /*  Constants                                                          */
  /* ================================================================== */
  const COLS = 10;
  const ROWS = 24; // rows 0-3 hidden
  const VISIBLE_ROWS = 20;
  const CELL = 28;

  // Canvas layout
  const CW = 480;
  const CH = 640;
  const FIELD_X = 100;
  const FIELD_Y = 20;
  const FIELD_W = COLS * CELL; // 280
  const FIELD_H = VISIBLE_ROWS * CELL; // 560

  /* ================================================================== */
  /*  Piece definitions (SRS)                                            */
  /* ================================================================== */
  const PIECES = {
    I: {
      cells: [
        [[1,0],[1,1],[1,2],[1,3]],
        [[0,2],[1,2],[2,2],[3,2]],
        [[2,0],[2,1],[2,2],[2,3]],
        [[0,1],[1,1],[2,1],[3,1]],
      ],
      color: "#00d4ff",
      glow: "rgba(0,212,255,0.5)",
      size: 4,
    },
    O: {
      cells: [
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
      ],
      color: "#ffdd00",
      glow: "rgba(255,221,0,0.5)",
      size: 2,
    },
    T: {
      cells: [
        [[0,1],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[1,2],[2,1]],
        [[0,1],[1,0],[1,1],[2,1]],
      ],
      color: "#b44dff",
      glow: "rgba(180,77,255,0.5)",
      size: 3,
    },
    S: {
      cells: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,0],[1,0],[1,1],[2,1]],
        [[1,1],[1,2],[2,0],[2,1]],
        [[0,0],[1,0],[1,1],[2,1]],
      ],
      color: "#44ff44",
      glow: "rgba(68,255,68,0.5)",
      size: 3,
    },
    Z: {
      cells: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,2],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[2,1],[2,2]],
        [[0,1],[1,0],[1,1],[2,0]],
      ],
      color: "#ff4444",
      glow: "rgba(255,68,68,0.5)",
      size: 3,
    },
    J: {
      cells: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[2,1]],
        [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,0],[2,1]],
      ],
      color: "#4488ff",
      glow: "rgba(68,136,255,0.5)",
      size: 3,
    },
    L: {
      cells: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]],
        [[1,0],[1,1],[1,2],[2,0]],
        [[0,0],[0,1],[1,1],[2,1]],
      ],
      color: "#ff8833",
      glow: "rgba(255,136,51,0.5)",
      size: 3,
    },
  };

  /* ================================================================== */
  /*  SRS Wall Kick data                                                 */
  /* ================================================================== */
  const KICKS = {
    "0>1": [[ 0, 0],[-1, 0],[-1, 1],[ 0,-2],[-1,-2]],
    "1>2": [[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
    "2>3": [[ 0, 0],[ 1, 0],[ 1, 1],[ 0,-2],[ 1,-2]],
    "3>0": [[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]],
    "0>3": [[ 0, 0],[ 1, 0],[ 1, 1],[ 0,-2],[ 1,-2]],
    "3>2": [[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]],
    "2>1": [[ 0, 0],[-1, 0],[-1, 1],[ 0,-2],[-1,-2]],
    "1>0": [[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
  };

  const I_KICKS = {
    "0>1": [[ 0, 0],[-2, 0],[ 1, 0],[-2,-1],[ 1, 2]],
    "1>2": [[ 0, 0],[ 2, 0],[-1, 0],[ 2, 1],[-1,-2]],
    "2>3": [[ 0, 0],[-1, 0],[ 2, 0],[-1, 2],[ 2,-1]],
    "3>0": [[ 0, 0],[ 1, 0],[-2, 0],[ 1,-2],[-2, 1]],
    "0>3": [[ 0, 0],[-1, 0],[ 2, 0],[-1, 2],[ 2,-1]],
    "3>2": [[ 0, 0],[-2, 0],[ 1, 0],[-2,-1],[ 1, 2]],
    "2>1": [[ 0, 0],[ 1, 0],[-2, 0],[ 1,-2],[-2, 1]],
    "1>0": [[ 0, 0],[ 2, 0],[-1, 0],[ 2, 1],[-1,-2]],
  };

  /* ================================================================== */
  /*  Game state                                                         */
  /* ================================================================== */
  const state = {
    phase: "idle",
    board: [],
    current: null,
    nextQueue: [],
    holdPiece: null,
    holdUsed: false,
    bag: [],
    lastTime: 0,
    dropAccumulator: 0,
    dropInterval: 1000,
    lockTimer: 0,
    lockResets: 0,
    isLanding: false,
    score: 0,
    displayScore: 0,
    best: 0,
    level: 1,
    lines: 0,
    combo: -1,
    backToBack: false,
    lineClearRows: [],
    lineClearTimer: 0,
    scorePop: 0,
    scorePopValue: "",
    scorePopX: 0,
    scorePopY: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    particles: [],
    lockFlash: 0,
    lockFlashCells: [],
    levelUpFlash: 0,
    gameOverAnim: 0,
    gameOverRow: 0,
    muted: false,
  };

  // DAS state
  const das = {
    direction: 0,
    timer: 0,
    charged: false,
    repeatTimer: 0,
    delay: 167,
    rate: 33,
  };

  const keysHeld = new Set();

  /* ================================================================== */
  /*  DOM refs                                                           */
  /* ================================================================== */
  const canvas = document.getElementById("gameCanvas");
  const ctx2d = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("bestScore");
  const muteBtn = document.getElementById("muteButton");
  const restartBtn = document.getElementById("restartButton");

  /* ================================================================== */
  /*  Board helpers                                                      */
  /* ================================================================== */
  function createBoard() {
    const b = [];
    for (let r = 0; r < ROWS; r++) {
      b.push(new Array(COLS).fill(null));
    }
    return b;
  }

  function getCells(type, rotation, row, col) {
    return PIECES[type].cells[rotation].map(([dr, dc]) => [row + dr, col + dc]);
  }

  function isValid(type, rotation, row, col) {
    const cells = PIECES[type].cells[rotation];
    for (const [dr, dc] of cells) {
      const r = row + dr;
      const c = col + dc;
      if (c < 0 || c >= COLS || r >= ROWS) return false;
      if (r >= 0 && state.board[r][c] !== null) return false;
    }
    return true;
  }

  /* ================================================================== */
  /*  7-bag randomizer                                                   */
  /* ================================================================== */
  function fillBag() {
    const pieces = ["I", "O", "T", "S", "Z", "J", "L"];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    state.bag = pieces;
  }

  function nextFromBag() {
    if (state.bag.length === 0) fillBag();
    return state.bag.pop();
  }

  /* ================================================================== */
  /*  Gravity speed                                                      */
  /* ================================================================== */
  function getDropInterval(level) {
    return Math.max(6, Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000);
  }

  /* ================================================================== */
  /*  Piece spawning                                                     */
  /* ================================================================== */
  function spawnPiece() {
    const type = state.nextQueue.shift();
    state.nextQueue.push(nextFromBag());
    const spawnCol = type === "O" ? 4 : type === "I" ? 3 : 3;
    const spawnRow = type === "I" ? 0 : 0;

    state.current = { type, rotation: 0, row: spawnRow, col: spawnCol };
    state.holdUsed = false;
    state.lockTimer = 0;
    state.lockResets = 0;
    state.isLanding = false;
    state.dropAccumulator = 0;

    // Top-out check
    if (!isValid(type, 0, spawnRow, spawnCol)) {
      triggerGameOver();
    }
  }

  /* ================================================================== */
  /*  Movement                                                           */
  /* ================================================================== */
  function moveHorizontal(dir) {
    if (!state.current || state.phase !== "playing") return false;
    const { type, rotation, row, col } = state.current;
    if (isValid(type, rotation, row, col + dir)) {
      state.current.col += dir;
      if (state.isLanding) resetLockDelay();
      Audio.move();
      return true;
    }
    return false;
  }

  function moveDown() {
    if (!state.current || state.phase !== "playing") return false;
    const { type, rotation, row, col } = state.current;
    if (isValid(type, rotation, row + 1, col)) {
      state.current.row += 1;
      state.isLanding = false;
      state.lockTimer = 0;
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (!state.current || state.phase !== "playing") return;
    let rows = 0;
    const { type, rotation, col } = state.current;
    let row = state.current.row;
    while (isValid(type, rotation, row + 1, col)) {
      row++;
      rows++;
    }
    state.current.row = row;
    state.score += rows * 2;
    Audio.hardDrop();
    state.shakeTimer = 8;
    state.shakeIntensity = 4;
    // Spawn particles at landing
    spawnHardDropParticles();
    lockPiece();
  }

  function tryRotate(direction) {
    if (!state.current || state.phase !== "playing") return false;
    const { type, rotation, row, col } = state.current;
    const newRot = (rotation + direction + 4) % 4;
    const kickKey = `${rotation}>${newRot}`;
    const kicks = type === "I" ? I_KICKS[kickKey] : KICKS[kickKey];
    if (!kicks) return false;

    for (const [dc, dr] of kicks) {
      if (isValid(type, newRot, row - dr, col + dc)) {
        state.current.rotation = newRot;
        state.current.row -= dr;
        state.current.col += dc;
        if (state.isLanding) resetLockDelay();
        Audio.rotate();
        return true;
      }
    }
    return false;
  }

  function resetLockDelay() {
    if (state.lockResets < 15) {
      state.lockTimer = 0;
      state.lockResets++;
    }
  }

  /* ================================================================== */
  /*  Ghost piece                                                        */
  /* ================================================================== */
  function getGhostRow() {
    if (!state.current) return 0;
    const { type, rotation, col } = state.current;
    let row = state.current.row;
    while (isValid(type, rotation, row + 1, col)) row++;
    return row;
  }

  /* ================================================================== */
  /*  Lock piece                                                         */
  /* ================================================================== */
  function lockPiece() {
    if (!state.current) return;
    const { type, rotation, row, col } = state.current;
    const cells = getCells(type, rotation, row, col);
    const color = PIECES[type].color;

    state.lockFlashCells = [];
    let anyAbove = false;
    for (const [r, c] of cells) {
      if (r < 0) continue;
      if (r < 4) anyAbove = true;
      state.board[r][c] = color;
      state.lockFlashCells.push([r, c]);
    }
    state.lockFlash = 0.3;
    Audio.lock();

    if (anyAbove) {
      triggerGameOver();
      return;
    }

    // Check lines
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (state.board[r].every((cell) => cell !== null)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length > 0) {
      state.lineClearRows = fullRows;
      state.lineClearTimer = 0.3;
      state.current = null;

      // Scoring
      const pts = [0, 100, 300, 500, 800];
      let base = pts[fullRows.length] * state.level;
      const isDifficult = fullRows.length === 4;
      if (isDifficult && state.backToBack) {
        base = Math.floor(base * 1.5);
      }
      state.backToBack = isDifficult;

      state.combo++;
      if (state.combo > 0) {
        base += 50 * state.combo * state.level;
        Audio.combo(state.combo);
      }
      state.score += base;
      Audio.lineClear(fullRows.length);

      // Score pop
      state.scorePop = 1.0;
      const labels = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS!"];
      state.scorePopValue = labels[fullRows.length] + " +" + base;
      state.scorePopX = FIELD_X + FIELD_W / 2;
      state.scorePopY = FIELD_Y + (fullRows[0] - 4) * CELL + CELL / 2;

      // Screen shake
      const shakes = [0, 2, 4, 6, 10];
      state.shakeTimer = 10;
      state.shakeIntensity = shakes[fullRows.length];

      // Particles
      for (const row of fullRows) {
        for (let c = 0; c < COLS; c++) {
          const color2 = state.board[row][c];
          spawnLineClearParticles(
            FIELD_X + c * CELL + CELL / 2,
            FIELD_Y + (row - 4) * CELL + CELL / 2,
            color2
          );
        }
      }

      // Lines & level
      const prevLevel = state.level;
      state.lines += fullRows.length;
      state.level = Math.min(29, Math.floor(state.lines / 10) + 1);
      state.dropInterval = getDropInterval(state.level);
      if (state.level > prevLevel) {
        state.levelUpFlash = 0.4;
        Audio.levelUp();
      }
    } else {
      state.combo = -1;
      state.current = null;
      spawnPiece();
    }
  }

  /* ================================================================== */
  /*  Line clear resolution                                              */
  /* ================================================================== */
  function resolveLineClear() {
    // Remove full rows and add empty rows at top
    for (const row of state.lineClearRows.sort((a, b) => b - a)) {
      state.board.splice(row, 1);
      state.board.unshift(new Array(COLS).fill(null));
    }
    state.lineClearRows = [];
    spawnPiece();
  }

  /* ================================================================== */
  /*  Hold                                                               */
  /* ================================================================== */
  function holdPiece() {
    if (!state.current || state.holdUsed || state.phase !== "playing") return;
    Audio.hold();
    const type = state.current.type;
    if (state.holdPiece === null) {
      state.holdPiece = type;
      spawnPiece();
    } else {
      const swap = state.holdPiece;
      state.holdPiece = type;
      const spawnCol = swap === "O" ? 4 : 3;
      state.current = { type: swap, rotation: 0, row: 0, col: spawnCol };
      state.lockTimer = 0;
      state.lockResets = 0;
      state.isLanding = false;
      state.dropAccumulator = 0;
    }
    state.holdUsed = true;
  }

  /* ================================================================== */
  /*  Game over                                                          */
  /* ================================================================== */
  function triggerGameOver() {
    state.phase = "gameover";
    state.current = null;
    state.gameOverAnim = 0;
    state.gameOverRow = ROWS - 1;
    Audio.gameOver();
    Audio.stopDrone();
    state.shakeTimer = 15;
    state.shakeIntensity = 8;
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("tetrisBest", String(state.best));
    }
  }

  /* ================================================================== */
  /*  Particles                                                          */
  /* ================================================================== */
  function spawnLineClearParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        color: color || "#fff",
        size: 2 + Math.random() * 2,
      });
    }
  }

  function spawnHardDropParticles() {
    if (!state.current) return;
    const { type, rotation, row, col } = state.current;
    const cells = getCells(type, rotation, row, col);
    for (const [r, c] of cells) {
      const px = FIELD_X + c * CELL + CELL / 2;
      const py = FIELD_Y + (r - 4) * CELL + CELL;
      for (let i = 0; i < 3; i++) {
        state.particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 80,
          vy: 20 + Math.random() * 60,
          life: 0.2 + Math.random() * 0.2,
          maxLife: 0.4,
          color: "#fff",
          size: 1 + Math.random() * 2,
        });
      }
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    if (state.particles.length > 300) {
      state.particles.splice(0, state.particles.length - 300);
    }
  }

  /* ================================================================== */
  /*  Init / Reset                                                       */
  /* ================================================================== */
  function resetGame() {
    state.board = createBoard();
    state.bag = [];
    fillBag();
    state.nextQueue = [];
    for (let i = 0; i < 5; i++) state.nextQueue.push(nextFromBag());
    state.current = null;
    state.holdPiece = null;
    state.holdUsed = false;
    state.score = 0;
    state.displayScore = 0;
    state.level = 1;
    state.lines = 0;
    state.combo = -1;
    state.backToBack = false;
    state.dropInterval = 1000;
    state.dropAccumulator = 0;
    state.lockTimer = 0;
    state.lockResets = 0;
    state.isLanding = false;
    state.lineClearRows = [];
    state.lineClearTimer = 0;
    state.scorePop = 0;
    state.shakeTimer = 0;
    state.shakeIntensity = 0;
    state.particles = [];
    state.lockFlash = 0;
    state.lockFlashCells = [];
    state.levelUpFlash = 0;
    state.gameOverAnim = 0;
    state.phase = "idle";
    das.direction = 0;
    das.timer = 0;
    das.charged = false;
    das.repeatTimer = 0;
    keysHeld.clear();
  }

  function startPlaying() {
    if (state.phase !== "idle") return;
    state.phase = "playing";
    spawnPiece();
    Audio.init();
    Audio.resume();
    Audio.startDrone();
  }

  /* ================================================================== */
  /*  Input                                                              */
  /* ================================================================== */
  window.addEventListener("keydown", (e) => {
    if (e.repeat && (e.code === "Space" || e.code === "ShiftLeft" || e.code === "KeyC")) return;

    // Audio resume on any input
    Audio.init();
    Audio.resume();

    if (state.phase === "idle") {
      startPlaying();
      // If it's a directional key, also handle it
    }

    if (state.phase === "gameover") {
      if (e.code === "Space" || e.code === "Enter") {
        resetGame();
        return;
      }
    }

    if (state.phase !== "playing") return;

    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        e.preventDefault();
        if (!keysHeld.has("left")) {
          keysHeld.add("left");
          moveHorizontal(-1);
          das.direction = -1;
          das.timer = 0;
          das.charged = false;
          das.repeatTimer = 0;
        }
        break;
      case "ArrowRight":
      case "KeyD":
        e.preventDefault();
        if (!keysHeld.has("right")) {
          keysHeld.add("right");
          moveHorizontal(1);
          das.direction = 1;
          das.timer = 0;
          das.charged = false;
          das.repeatTimer = 0;
        }
        break;
      case "ArrowDown":
      case "KeyS":
        e.preventDefault();
        keysHeld.add("down");
        break;
      case "ArrowUp":
      case "KeyX":
        e.preventDefault();
        tryRotate(1);
        break;
      case "KeyZ":
      case "ControlLeft":
      case "ControlRight":
        e.preventDefault();
        tryRotate(-1);
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
      case "ShiftLeft":
      case "ShiftRight":
      case "KeyC":
        e.preventDefault();
        holdPiece();
        break;
      case "Escape":
      case "KeyP":
        e.preventDefault();
        if (state.phase === "playing") {
          state.phase = "paused";
          Audio.stopDrone();
        } else if (state.phase === "paused") {
          state.phase = "playing";
          Audio.startDrone();
        }
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        keysHeld.delete("left");
        if (das.direction === -1) {
          das.direction = 0;
          // Switch to right if still held
          if (keysHeld.has("right")) {
            das.direction = 1;
            das.timer = 0;
            das.charged = false;
            das.repeatTimer = 0;
          }
        }
        break;
      case "ArrowRight":
      case "KeyD":
        keysHeld.delete("right");
        if (das.direction === 1) {
          das.direction = 0;
          if (keysHeld.has("left")) {
            das.direction = -1;
            das.timer = 0;
            das.charged = false;
            das.repeatTimer = 0;
          }
        }
        break;
      case "ArrowDown":
      case "KeyS":
        keysHeld.delete("down");
        break;
    }
  });

  /* Touch controls */
  let touchStart = null;
  let touchMoved = false;

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    Audio.init();
    Audio.resume();
    touchStart = { x: e.clientX, y: e.clientY, time: Date.now() };
    touchMoved = false;

    if (state.phase === "idle") {
      startPlaying();
      return;
    }
    if (state.phase === "gameover") {
      resetGame();
      return;
    }
    if (state.phase === "paused") {
      state.phase = "playing";
      Audio.startDrone();
      return;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!touchStart || state.phase !== "playing") return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    const threshold = 25;

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
      moveHorizontal(dx > 0 ? 1 : -1);
      touchStart.x = e.clientX;
      touchStart.y = e.clientY;
      touchMoved = true;
    } else if (dy > threshold && Math.abs(dy) > Math.abs(dx)) {
      // Swipe down — soft drop rows
      if (moveDown()) {
        state.score += 1;
        Audio.softDrop();
      }
      touchStart.x = e.clientX;
      touchStart.y = e.clientY;
      touchMoved = true;
    } else if (dy < -threshold * 2 && Math.abs(dy) > Math.abs(dx)) {
      // Swipe up — hard drop
      hardDrop();
      touchStart = null;
      touchMoved = true;
    }
  });

  canvas.addEventListener("pointerup", (e) => {
    if (!touchStart || state.phase !== "playing") {
      touchStart = null;
      return;
    }
    const elapsed = Date.now() - touchStart.time;
    if (!touchMoved && elapsed < 300) {
      // Tap = rotate
      const rect = canvas.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      if (tapX < rect.width * 0.3) {
        holdPiece();
      } else {
        tryRotate(1);
      }
    }
    touchStart = null;
  });

  canvas.addEventListener("pointercancel", () => { touchStart = null; });

  /* Mute & restart buttons */
  muteBtn.addEventListener("click", () => {
    Audio.init();
    const m = Audio.toggle();
    muteBtn.textContent = m ? "\u{1F507}" : "\u{1F50A}";
    state.muted = m;
  });

  restartBtn.addEventListener("click", () => {
    Audio.init();
    Audio.resume();
    resetGame();
  });

  /* ================================================================== */
  /*  Game loop                                                          */
  /* ================================================================== */
  function update(dt) {
    if (state.phase === "playing" && state.lineClearTimer > 0) {
      state.lineClearTimer -= dt;
      if (state.lineClearTimer <= 0) {
        state.lineClearTimer = 0;
        resolveLineClear();
      }
      return; // Freeze movement during line clear animation
    }

    if (state.phase !== "playing" || !state.current) return;

    // DAS
    if (das.direction !== 0) {
      das.timer += dt * 1000;
      if (!das.charged && das.timer >= das.delay) {
        das.charged = true;
        das.repeatTimer = 0;
      }
      if (das.charged) {
        das.repeatTimer += dt * 1000;
        while (das.repeatTimer >= das.rate) {
          das.repeatTimer -= das.rate;
          moveHorizontal(das.direction);
        }
      }
    }

    // Soft drop
    const softDropping = keysHeld.has("down");
    const effectiveInterval = softDropping
      ? Math.max(state.dropInterval / 20, 5)
      : state.dropInterval;

    state.dropAccumulator += dt * 1000;
    while (state.dropAccumulator >= effectiveInterval) {
      state.dropAccumulator -= effectiveInterval;
      if (!moveDown()) {
        // Piece has landed
        state.isLanding = true;
      } else if (softDropping) {
        state.score += 1;
        Audio.softDrop();
      }
    }

    // Lock delay
    if (state.isLanding) {
      // Verify still landing
      const { type, rotation, row, col } = state.current;
      if (isValid(type, rotation, row + 1, col)) {
        state.isLanding = false;
        state.lockTimer = 0;
      } else {
        state.lockTimer += dt * 1000;
        if (state.lockTimer >= 500) {
          lockPiece();
        }
      }
    }
  }

  /* ================================================================== */
  /*  Rendering                                                          */
  /* ================================================================== */
  function drawBlock(x, y, color, glow, dimmed) {
    const margin = 1;
    const bx = x + margin;
    const by = y + margin;
    const bs = CELL - margin * 2;
    const r = 3;

    ctx2d.save();
    if (glow && !dimmed) {
      ctx2d.shadowBlur = 6;
      ctx2d.shadowColor = glow;
    } else if (glow && dimmed) {
      ctx2d.shadowBlur = 3;
      ctx2d.shadowColor = glow;
    }

    ctx2d.fillStyle = color;
    ctx2d.beginPath();
    if (ctx2d.roundRect) {
      ctx2d.roundRect(bx, by, bs, bs, r);
    } else {
      ctx2d.rect(bx, by, bs, bs);
    }
    ctx2d.fill();
    ctx2d.shadowBlur = 0;

    // Inner highlight (top-left)
    ctx2d.fillStyle = "rgba(255,255,255,0.12)";
    ctx2d.fillRect(bx + 1, by + 1, bs - 2, 2);
    ctx2d.fillRect(bx + 1, by + 1, 2, bs - 2);

    // Inner shadow (bottom-right)
    ctx2d.fillStyle = "rgba(0,0,0,0.18)";
    ctx2d.fillRect(bx + 1, by + bs - 3, bs - 2, 2);
    ctx2d.fillRect(bx + bs - 3, by + 1, 2, bs - 2);

    ctx2d.restore();
  }

  function drawMiniBlock(x, y, size, color) {
    const margin = 1;
    ctx2d.fillStyle = color;
    ctx2d.beginPath();
    if (ctx2d.roundRect) {
      ctx2d.roundRect(x + margin, y + margin, size - margin * 2, size - margin * 2, 2);
    } else {
      ctx2d.rect(x + margin, y + margin, size - margin * 2, size - margin * 2);
    }
    ctx2d.fill();
  }

  function drawPieceMini(type, x, y, cellSize, alpha) {
    const piece = PIECES[type];
    const cells = piece.cells[0];
    // Center the piece in its bounding box
    const size = piece.size;
    const offsetX = x + (4 * cellSize - size * cellSize) / 2;
    const offsetY = y + (4 * cellSize - size * cellSize) / 2;

    ctx2d.save();
    ctx2d.globalAlpha = alpha !== undefined ? alpha : 1;
    for (const [dr, dc] of cells) {
      drawMiniBlock(offsetX + dc * cellSize, offsetY + dr * cellSize, cellSize, piece.color);
    }
    ctx2d.restore();
  }

  function render() {
    ctx2d.save();

    // Screen shake
    if (state.shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * state.shakeIntensity;
      const sy = (Math.random() - 0.5) * state.shakeIntensity;
      ctx2d.translate(sx, sy);
    }

    // Background
    ctx2d.fillStyle = "#08091a";
    ctx2d.fillRect(0, 0, CW, CH);

    // Draw playfield background
    ctx2d.fillStyle = "#060816";
    ctx2d.fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);

    // Grid lines
    ctx2d.strokeStyle = "rgba(0,210,255,0.06)";
    ctx2d.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      const x = FIELD_X + c * CELL;
      ctx2d.beginPath();
      ctx2d.moveTo(x, FIELD_Y);
      ctx2d.lineTo(x, FIELD_Y + FIELD_H);
      ctx2d.stroke();
    }
    for (let r = 0; r <= VISIBLE_ROWS; r++) {
      const y = FIELD_Y + r * CELL;
      ctx2d.beginPath();
      ctx2d.moveTo(FIELD_X, y);
      ctx2d.lineTo(FIELD_X + FIELD_W, y);
      ctx2d.stroke();
    }

    // Playfield border
    ctx2d.strokeStyle = "rgba(0,210,255,0.35)";
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(FIELD_X - 1, FIELD_Y - 1, FIELD_W + 2, FIELD_H + 2);

    // Locked blocks
    if (state.phase !== "paused") {
      for (let r = 4; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const color = state.board[r][c];
          if (color) {
            const bx = FIELD_X + c * CELL;
            const by = FIELD_Y + (r - 4) * CELL;

            // Game over greying
            if (state.phase === "gameover" && r > state.gameOverRow) {
              drawBlock(bx, by, "#333340", null, true);
            } else {
              drawBlock(bx, by, color, null, true);
            }
          }
        }
      }
    }

    // Line clear flash
    if (state.lineClearTimer > 0 && state.lineClearRows.length > 0) {
      const progress = 1 - state.lineClearTimer / 0.3;
      for (const row of state.lineClearRows) {
        const y = FIELD_Y + (row - 4) * CELL;
        ctx2d.fillStyle = `rgba(255,255,255,${0.8 * (1 - progress)})`;
        ctx2d.fillRect(FIELD_X, y, FIELD_W, CELL);
      }
    }

    // Lock flash
    if (state.lockFlash > 0 && state.phase !== "paused") {
      ctx2d.fillStyle = `rgba(255,255,255,${state.lockFlash})`;
      for (const [r, c] of state.lockFlashCells) {
        if (r >= 4) {
          ctx2d.fillRect(FIELD_X + c * CELL, FIELD_Y + (r - 4) * CELL, CELL, CELL);
        }
      }
    }

    if (state.phase !== "paused") {
      // Ghost piece
      if (state.current) {
        const ghostRow = getGhostRow();
        if (ghostRow !== state.current.row) {
          const cells = getCells(state.current.type, state.current.rotation, ghostRow, state.current.col);
          ctx2d.save();
          ctx2d.strokeStyle = "rgba(255,255,255,0.2)";
          ctx2d.lineWidth = 1.5;
          ctx2d.setLineDash([3, 3]);
          for (const [r, c] of cells) {
            if (r >= 4) {
              const bx = FIELD_X + c * CELL + 2;
              const by = FIELD_Y + (r - 4) * CELL + 2;
              ctx2d.strokeRect(bx, by, CELL - 4, CELL - 4);
            }
          }
          ctx2d.setLineDash([]);
          ctx2d.restore();
        }
      }

      // Current piece
      if (state.current) {
        const piece = PIECES[state.current.type];
        const cells = getCells(state.current.type, state.current.rotation, state.current.row, state.current.col);
        for (const [r, c] of cells) {
          if (r >= 4) {
            const bx = FIELD_X + c * CELL;
            const by = FIELD_Y + (r - 4) * CELL;
            drawBlock(bx, by, piece.color, piece.glow, false);
          }
        }
      }
    }

    // Level up flash
    if (state.levelUpFlash > 0) {
      ctx2d.fillStyle = `rgba(0,210,255,${state.levelUpFlash * 0.3})`;
      ctx2d.fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
    }

    // ---- Side panels ----

    // Hold box
    ctx2d.fillStyle = "rgba(0,210,255,0.08)";
    ctx2d.strokeStyle = "rgba(0,210,255,0.2)";
    ctx2d.lineWidth = 1;
    const holdBoxX = 8;
    const holdBoxY = FIELD_Y;
    const holdBoxW = 82;
    const holdBoxH = 80;
    ctx2d.fillRect(holdBoxX, holdBoxY, holdBoxW, holdBoxH);
    ctx2d.strokeRect(holdBoxX, holdBoxY, holdBoxW, holdBoxH);
    ctx2d.fillStyle = "#c0d8ff";
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.textAlign = "center";
    ctx2d.fillText("HOLD", holdBoxX + holdBoxW / 2, holdBoxY + 14);

    if (state.holdPiece) {
      drawPieceMini(
        state.holdPiece,
        holdBoxX + (holdBoxW - 56) / 2,
        holdBoxY + 20,
        14,
        state.holdUsed ? 0.35 : 1
      );
    }

    // Score, Level, Lines on left panel
    const infoY = holdBoxY + holdBoxH + 20;
    ctx2d.textAlign = "left";
    ctx2d.fillStyle = "rgba(192,216,255,0.5)";
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("SCORE", holdBoxX + 4, infoY);
    ctx2d.fillStyle = "#c0d8ff";
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(Math.floor(state.displayScore).toLocaleString(), holdBoxX + 4, infoY + 18);

    ctx2d.fillStyle = "rgba(192,216,255,0.5)";
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("LEVEL", holdBoxX + 4, infoY + 44);
    ctx2d.fillStyle = "#c0d8ff";
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(String(state.level), holdBoxX + 4, infoY + 62);

    ctx2d.fillStyle = "rgba(192,216,255,0.5)";
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("LINES", holdBoxX + 4, infoY + 88);
    ctx2d.fillStyle = "#c0d8ff";
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(String(state.lines), holdBoxX + 4, infoY + 106);

    // Next queue
    const nextBoxX = FIELD_X + FIELD_W + 10;
    const nextBoxY = FIELD_Y;
    const nextBoxW = 82;
    const nextBoxH = 340;
    ctx2d.fillStyle = "rgba(0,210,255,0.08)";
    ctx2d.strokeStyle = "rgba(0,210,255,0.2)";
    ctx2d.lineWidth = 1;
    ctx2d.fillRect(nextBoxX, nextBoxY, nextBoxW, nextBoxH);
    ctx2d.strokeRect(nextBoxX, nextBoxY, nextBoxW, nextBoxH);
    ctx2d.fillStyle = "#c0d8ff";
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.textAlign = "center";
    ctx2d.fillText("NEXT", nextBoxX + nextBoxW / 2, nextBoxY + 14);

    for (let i = 0; i < Math.min(5, state.nextQueue.length); i++) {
      drawPieceMini(
        state.nextQueue[i],
        nextBoxX + (nextBoxW - 56) / 2,
        nextBoxY + 20 + i * 64,
        14,
        i === 0 ? 1 : 0.6
      );
    }

    // Best score on right panel
    const bestY = nextBoxY + nextBoxH + 20;
    ctx2d.textAlign = "left";
    ctx2d.fillStyle = "rgba(192,216,255,0.5)";
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("BEST", nextBoxX + 4, bestY);
    ctx2d.fillStyle = "#c0d8ff";
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(state.best.toLocaleString(), nextBoxX + 4, bestY + 18);

    // Combo indicator
    if (state.combo > 0 && state.phase === "playing") {
      ctx2d.fillStyle = "rgba(192,216,255,0.4)";
      ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("COMBO x" + state.combo, nextBoxX + 4, bestY + 44);
    }

    // Particles
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      const size = p.size * alpha;
      ctx2d.save();
      ctx2d.globalAlpha = alpha;
      ctx2d.shadowBlur = 4;
      ctx2d.shadowColor = p.color;
      ctx2d.fillStyle = p.color;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
    }

    // Score pop
    if (state.scorePop > 0) {
      ctx2d.save();
      ctx2d.textAlign = "center";
      ctx2d.font = '700 18px "Trebuchet MS", system-ui, sans-serif';
      const popAlpha = Math.min(state.scorePop, 1);
      ctx2d.fillStyle = `rgba(255,255,255,${popAlpha})`;
      ctx2d.shadowBlur = 8;
      ctx2d.shadowColor = "rgba(0,210,255,0.5)";
      const floatY = (1 - state.scorePop) * -30;
      ctx2d.fillText(
        state.scorePopValue,
        state.scorePopX,
        Math.max(FIELD_Y + 20, state.scorePopY + floatY)
      );
      ctx2d.restore();
    }

    // ---- Overlays ----

    if (state.phase === "idle") {
      // Vignette
      const vg = ctx2d.createRadialGradient(CW / 2, CH / 2, CH * 0.2, CW / 2, CH / 2, CH * 0.7);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx2d.fillStyle = vg;
      ctx2d.fillRect(0, 0, CW, CH);

      ctx2d.textAlign = "center";
      ctx2d.save();
      ctx2d.shadowBlur = 20;
      ctx2d.shadowColor = "rgba(0,210,255,0.6)";
      ctx2d.fillStyle = "#fff";
      ctx2d.font = '700 36px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("TETRIS", CW / 2, CH / 2 - 20);
      ctx2d.restore();

      ctx2d.fillStyle = `rgba(192,216,255,${0.5 + Math.sin(Date.now() / 500) * 0.3})`;
      ctx2d.font = '400 14px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Press any key to start", CW / 2, CH / 2 + 20);
    }

    if (state.phase === "paused") {
      ctx2d.fillStyle = "rgba(0,0,0,0.7)";
      ctx2d.fillRect(0, 0, CW, CH);
      ctx2d.textAlign = "center";
      ctx2d.fillStyle = "#fff";
      ctx2d.font = '700 32px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("PAUSED", CW / 2, CH / 2);
      ctx2d.fillStyle = "rgba(192,216,255,0.6)";
      ctx2d.font = '400 14px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Press Esc to resume", CW / 2, CH / 2 + 30);
    }

    if (state.phase === "gameover") {
      const vg = ctx2d.createRadialGradient(CW / 2, CH / 2, CH * 0.15, CW / 2, CH / 2, CH * 0.7);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx2d.fillStyle = vg;
      ctx2d.fillRect(0, 0, CW, CH);

      ctx2d.textAlign = "center";
      ctx2d.save();
      ctx2d.shadowBlur = 15;
      ctx2d.shadowColor = "rgba(255,68,68,0.5)";
      ctx2d.fillStyle = "#fff";
      ctx2d.font = '700 34px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("GAME OVER", CW / 2, CH / 2 - 40);
      ctx2d.restore();

      ctx2d.fillStyle = "rgba(192,216,255,0.7)";
      ctx2d.font = '400 16px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Score: " + state.score.toLocaleString(), CW / 2, CH / 2);
      ctx2d.fillText(
        "Level " + state.level + "  •  " + state.lines + " lines",
        CW / 2,
        CH / 2 + 24
      );

      if (state.score === state.best && state.score > 0) {
        ctx2d.fillStyle = "#ffd700";
        ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
        ctx2d.fillText("New Best!", CW / 2, CH / 2 + 52);
      }

      ctx2d.fillStyle = `rgba(192,216,255,${0.4 + Math.sin(Date.now() / 500) * 0.3})`;
      ctx2d.font = '400 13px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Press Space to restart", CW / 2, CH / 2 + 80);
    }

    ctx2d.restore();
  }

  /* ================================================================== */
  /*  Main loop                                                          */
  /* ================================================================== */
  function loop(timestamp) {
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
    state.lastTime = timestamp;

    update(dt);
    updateParticles(dt);

    // Decay effects
    if (state.shakeTimer > 0) {
      state.shakeTimer--;
      state.shakeIntensity *= 0.85;
      if (state.shakeIntensity < 0.3) state.shakeIntensity = 0;
    }
    if (state.scorePop > 0) state.scorePop *= 0.9;
    if (state.scorePop < 0.02) state.scorePop = 0;
    if (state.lockFlash > 0) state.lockFlash *= 0.88;
    if (state.lockFlash < 0.01) state.lockFlash = 0;
    if (state.levelUpFlash > 0) state.levelUpFlash *= 0.92;
    if (state.levelUpFlash < 0.01) state.levelUpFlash = 0;

    // Smooth score display
    if (state.displayScore < state.score) {
      state.displayScore += Math.ceil((state.score - state.displayScore) * 0.15);
      if (state.displayScore > state.score) state.displayScore = state.score;
    }

    // Game over animation (grey-out rows from bottom)
    if (state.phase === "gameover" && state.gameOverRow >= 4) {
      state.gameOverAnim += dt * 60;
      if (state.gameOverAnim >= 1) {
        state.gameOverAnim = 0;
        state.gameOverRow--;
      }
    }

    // Update HUD
    scoreEl.textContent = Math.floor(state.displayScore).toLocaleString();
    bestEl.textContent = state.best.toLocaleString();

    render();
    requestAnimationFrame(loop);
  }

  /* ================================================================== */
  /*  Boot                                                               */
  /* ================================================================== */
  state.best = Number(localStorage.getItem("tetrisBest")) || 0;
  const savedMute = localStorage.getItem("tetrisMuted");
  if (savedMute === "true") {
    state.muted = true;
    muteBtn.textContent = "\u{1F507}";
  }
  resetGame();
  requestAnimationFrame(loop);
})();

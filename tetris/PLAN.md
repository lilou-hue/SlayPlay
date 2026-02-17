# Tetris — Detailed Implementation Plan

## Vision

A modern, polished Tetris game with a **retro-neon aesthetic**. Crisp procedural
visuals, satisfying procedural audio, and tight responsive controls. The game
honours classic Tetris rules (SRS rotation, hold piece, next queue, soft/hard
drop, wall kicks) while adding a visual punch through glow effects, particles,
and screen-shake feedback. The player should feel each line clear in their
bones — through sound, haptics, and visual impact.

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [HTML Layout](#2-html-layout)
3. [Visual Design System](#3-visual-design-system)
4. [Core Game Mechanics](#4-core-game-mechanics)
5. [Sound Design — Procedural Audio Engine](#5-sound-design--procedural-audio-engine)
6. [Haptic Feedback System](#6-haptic-feedback-system)
7. [Visual Effects & Rendering](#7-visual-effects--rendering)
8. [Input Handling](#8-input-handling)
9. [Score, Persistence & HUD](#9-score-persistence--hud)
10. [Arcade Integration](#10-arcade-integration)
11. [Performance & Compatibility](#11-performance--compatibility)

---

## 1. File Structure

```
tetris/
├── index.html      Game page (canvas + HUD + mute toggle)
├── game.js         All game logic, rendering, audio, haptics
├── audio.js        Procedural audio engine (Web Audio API)
└── styles.css      Page styling (dark neon theme)
```

No external dependencies. No audio files. No image assets. All sounds generated
procedurally via the Web Audio API. All graphics drawn procedurally on Canvas 2D.

---

## 2. HTML Layout

Follow the established arcade pattern (portrait-oriented, single-column, centered):

```
<main class="game">
  <header class="game__header">
    ← Back to Games          (link to /)
    Tetris                    (h1)
    Arrow keys / touch...     (instruction text)
  </header>

  <section class="game__panel">
    <canvas id="gameCanvas" width="480" height="640">
    <div class="game__hud">
      Score: 0  |  Level: 1  |  Lines: 0  |  Best: 0  |  🔊 (mute)
    </div>
  </section>

  <footer class="game__footer">
    Tip: Hold a piece with Shift or C. Hard drop with Space.
  </footer>
</main>
```

### Key HTML Details
- Canvas is **480x640** (portrait, 3:4 ratio, accommodates 10-wide playfield + side panels)
- `aria-label="Tetris game"` on the canvas for accessibility
- Mute toggle in HUD (🔊 / 🔇), stored in `localStorage` key `tetrisMuted`
- `touch-action: manipulation` on canvas to prevent browser gestures
- Back link to `/` in header, styled consistently with other games

---

## 3. Visual Design System

### Color Palette

| Role                    | Color                              | Hex / Value             |
|-------------------------|------------------------------------|-------------------------|
| Background              | Deep dark blue                     | `#08091a`               |
| Grid lines              | Faint cyan                         | `rgba(0, 210, 255, 0.06)` |
| Playfield border        | Bright cyan                        | `rgba(0, 210, 255, 0.35)` |
| I-piece                 | Cyan                               | `#00d4ff`               |
| O-piece                 | Yellow                             | `#ffdd00`               |
| T-piece                 | Purple                             | `#b44dff`               |
| S-piece                 | Green                              | `#44ff44`               |
| Z-piece                 | Red                                | `#ff4444`               |
| J-piece                 | Blue                               | `#4488ff`               |
| L-piece                 | Orange                             | `#ff8833`               |
| Ghost piece             | White, low alpha                   | `rgba(255, 255, 255, 0.12)` |
| Locked blocks           | Same as piece but slightly dimmed  | 85% brightness          |
| Line clear flash        | White                              | `rgba(255, 255, 255, 0.9)` |
| Side panel text          | Soft blue-white                    | `#c0d8ff`               |
| Panel background        | Glass dark blue                    | `rgba(8, 12, 30, 0.85)` |
| Page background         | Dark gradient                      | `#04050f` → `#0a0e24` → `#060818` |

### Piece Colors — Neon Glow Mapping

Each piece type has a primary color and a glow color used for `shadowColor`:

| Piece | Fill          | Glow (shadowColor)            |
|-------|---------------|-------------------------------|
| I     | `#00d4ff`     | `rgba(0, 212, 255, 0.5)`     |
| O     | `#ffdd00`     | `rgba(255, 221, 0, 0.5)`     |
| T     | `#b44dff`     | `rgba(180, 77, 255, 0.5)`    |
| S     | `#44ff44`     | `rgba(68, 255, 68, 0.5)`     |
| Z     | `#ff4444`     | `rgba(255, 68, 68, 0.5)`     |
| J     | `#4488ff`     | `rgba(68, 136, 255, 0.5)`    |
| L     | `#ff8833`     | `rgba(255, 136, 51, 0.5)`    |

### Typography
- Font family: `"Trebuchet MS", "Segoe UI", system-ui, sans-serif` (matching arcade)
- Score/level: `font-variant-numeric: tabular-nums` for stable width
- Page title: gradient text (`#00d4ff` → `#b44dff`)

### CSS Architecture
- `.game`, `.game__header`, `.game__panel`, `.game__hud`, `.game__footer` BEM pattern
- Dark `color-scheme: dark`
- Page background: layered radial gradients (deep blue, subtle purple hints)
- Canvas border: `2px solid rgba(0, 210, 255, 0.25)` with `box-shadow: 0 0 30px rgba(0, 210, 255, 0.06)`
- Panel: glassmorphism `backdrop-filter: blur(8px)`, dark blue tint
- Responsive: max-width 540px container, canvas `width: min(100%, 480px)` with `aspect-ratio: 3/4`

---

## 4. Core Game Mechanics

### 4a. Playfield Grid

- **Playfield**: 10 columns x 20 visible rows (+ 4 hidden rows above for spawning)
- **Cell size**: 28px x 28px
- **Playfield pixel size**: 280px x 560px (centered in the 480x640 canvas)
- **Side panels**: Left panel (Hold piece, ~90px wide), Right panel (Next queue, score, ~90px wide)
- **Layout on canvas**:
  - Left panel: x=10 to x=90
  - Playfield: x=100 to x=380
  - Right panel: x=390 to x=470
  - Vertical: playfield top at y=40, bottom at y=600

### 4b. Tetromino Definitions

Standard 7-piece set with **Super Rotation System (SRS)** data.

Each piece defined by 4 rotation states (0, R, 2, L) as arrays of [row, col]
offsets from a center point:

```javascript
const PIECES = {
  I: {
    cells: [
      [[0,0],[0,1],[0,2],[0,3]],   // State 0
      [[0,2],[1,2],[2,2],[3,2]],   // State R
      [[2,0],[2,1],[2,2],[2,3]],   // State 2
      [[0,1],[1,1],[2,1],[3,1]],   // State L
    ],
    color: '#00d4ff',
    spawnCol: 3,  // leftmost column of bounding box at spawn
  },
  O: {
    cells: [
      [[0,0],[0,1],[1,0],[1,1]],   // all 4 states identical
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
    ],
    color: '#ffdd00',
    spawnCol: 4,
  },
  T: {
    cells: [
      [[0,1],[1,0],[1,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,1]],
      [[1,0],[1,1],[1,2],[2,1]],
      [[0,1],[1,0],[1,1],[2,1]],
    ],
    color: '#b44dff',
    spawnCol: 3,
  },
  S: {
    cells: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[1,1],[1,2],[2,0],[2,1]],
      [[0,0],[1,0],[1,1],[2,1]],
    ],
    color: '#44ff44',
    spawnCol: 3,
  },
  Z: {
    cells: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,2],[1,1],[1,2],[2,1]],
      [[1,0],[1,1],[2,1],[2,2]],
      [[0,1],[1,0],[1,1],[2,0]],
    ],
    color: '#ff4444',
    spawnCol: 3,
  },
  J: {
    cells: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,0],[2,1]],
    ],
    color: '#4488ff',
    spawnCol: 3,
  },
  L: {
    cells: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[1,2],[2,0]],
      [[0,0],[0,1],[1,1],[2,1]],
    ],
    color: '#ff8833',
    spawnCol: 3,
  },
};
```

### 4c. SRS Wall Kick Data

Standard SRS wall kick offsets. When a rotation fails, try up to 4 alternative
positions before rejecting the rotation:

```javascript
// For J, L, S, T, Z pieces:
const WALL_KICKS = {
  '0>R': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  'R>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>L': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  'L>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>L': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  'L>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>R': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  'R>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
};

// For I piece (different offsets):
const I_WALL_KICKS = {
  '0>R': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  'R>2': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '2>L': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  'L>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>L': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  'L>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '2>R': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  'R>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
};
```

### 4d. Game State Object

```javascript
const state = {
  // Game flow
  phase: 'idle',              // 'idle' | 'playing' | 'paused' | 'gameover'

  // Board: 24 rows x 10 cols (rows 0-3 hidden, 4-23 visible)
  board: [],                  // 2D array: null = empty, string = piece color

  // Current falling piece
  current: {
    type: 'T',               // piece key
    rotation: 0,             // 0, 1(R), 2, 3(L)
    row: 0,                  // top-left row of bounding box
    col: 3,                  // top-left col of bounding box
  },

  // Next queue (5 pieces shown)
  nextQueue: [],             // array of piece type strings

  // Hold piece
  holdPiece: null,           // piece type string or null
  holdUsed: false,           // true if hold already used this turn

  // Bag randomizer state
  bag: [],                   // remaining pieces in current 7-bag

  // Timing
  lastTime: 0,
  dropAccumulator: 0,        // time toward next gravity drop
  dropInterval: 1000,        // ms between gravity drops (decreases with level)
  lockDelay: 500,            // ms before piece locks after landing
  lockTimer: 0,              // current lock delay countdown
  lockResets: 0,             // number of times lock delay has been reset (max 15)
  maxLockResets: 15,

  // Scoring
  score: 0,
  best: 0,
  level: 1,
  lines: 0,
  combo: -1,                 // consecutive line clears (-1 = no combo)
  backToBack: false,         // true if last clear was "difficult" (Tetris or T-spin)

  // DAS (Delayed Auto Shift) for left/right
  dasDirection: 0,           // -1, 0, or 1
  dasTimer: 0,               // time in current DAS state
  dasDelay: 167,             // ms before auto-repeat starts
  dasRate: 33,               // ms between auto-repeat moves (≈30Hz)
  dasChargeComplete: false,

  // Soft drop
  softDropping: false,

  // Visual effects
  lineClearRows: [],         // rows currently animating clear
  lineClearTimer: 0,         // animation timer for line clear (0-1)
  scorePop: 0,               // score pop animation
  scorePopValue: '',
  shakeTimer: 0,
  shakeIntensity: 0,
  particles: [],
  lockFlash: 0,              // brief flash when piece locks

  // Audio
  muted: false,
};
```

### 4e. 7-Bag Randomizer

Ensures fair piece distribution. Each bag contains all 7 pieces shuffled:

```javascript
function fillBag() {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  // Fisher-Yates shuffle
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  state.bag = pieces;
}

function nextPiece() {
  if (state.bag.length === 0) fillBag();
  return state.bag.pop();
}
```

Initialize: fill nextQueue with 5 pieces, then spawn first current piece.

### 4f. Piece Spawning

When a new piece enters play:
1. Pull next piece type from `nextQueue[0]`, shift queue, push new piece to end
2. Set `current.type`, `current.rotation = 0`
3. Set `current.row = 0` (top of hidden area), `current.col = PIECES[type].spawnCol`
4. Reset `holdUsed = false`
5. Reset `lockTimer = 0`, `lockResets = 0`
6. **Top-out check**: If the spawned piece overlaps any existing block → game over

### 4g. Gravity & Dropping

**Gravity tick** (accumulator-based):
- `dropAccumulator += deltaTime`
- When `dropAccumulator >= dropInterval`: attempt to move piece down by 1 row
  - If successful: reset `dropAccumulator -= dropInterval`
  - If blocked (piece has landed): start/continue lock delay

**Soft drop** (player holding down):
- Override `dropInterval` with `dropInterval / 20` (much faster)
- Award 1 point per row dropped via soft drop

**Hard drop** (player presses space/up-swipe):
- Instantly move piece to ghost position (lowest valid position)
- Award 2 points per row dropped
- Lock immediately (no lock delay)
- Play hard drop sound + screen shake

**Gravity speed by level**:
```
Level 1:  1000ms
Level 2:  793ms
Level 3:  618ms
Level 4:  473ms
Level 5:  355ms
Level 6:  262ms
Level 7:  190ms
Level 8:  135ms
Level 9:  94ms
Level 10: 64ms
Level 11-12: 43ms
Level 13-15: 28ms
Level 16-18: 18ms
Level 19-28: 11ms
Level 29+: 6ms
```
Formula: `Math.pow(0.8 - ((level - 1) * 0.007), level - 1) * 1000`

### 4h. Lock Delay

When a piece is resting on a surface (cannot move down):
1. Start `lockTimer` counting up
2. When `lockTimer >= lockDelay` (500ms): lock the piece
3. **Lock delay reset**: Moving or rotating the piece while it's in lock delay
   resets `lockTimer = 0`, but only up to `maxLockResets` (15) times
4. After 15 resets, the piece locks on the next delay expiration

This allows skilled players to slide pieces into place while preventing infinite stalling.

### 4i. Locking a Piece

When lock triggers:
1. Write current piece cells into `state.board` with the piece's color
2. Check for completed lines
3. If lines completed:
   - Store row indices in `lineClearRows`
   - Start `lineClearTimer` animation (300ms)
   - After animation: remove rows, shift board down, update score
4. If no lines: reset combo to -1
5. Spawn next piece
6. Play lock sound

### 4j. Line Clear Detection & Scoring

After locking, scan rows top to bottom:

```javascript
function getFullRows() {
  const full = [];
  for (let r = 0; r < 24; r++) {
    if (state.board[r].every(cell => cell !== null)) {
      full.push(r);
    }
  }
  return full;
}
```

**Scoring** (Guideline scoring):

| Action          | Base Points         |
|-----------------|---------------------|
| Single (1 line) | 100 x level         |
| Double (2 lines)| 300 x level         |
| Triple (3 lines)| 500 x level         |
| Tetris (4 lines)| 800 x level         |
| Soft drop       | 1 per row           |
| Hard drop       | 2 per row           |

**Combo bonus**: 50 x combo x level (combo starts at 0 for second consecutive clear)

**Back-to-back bonus**: Tetris and T-spin line clears get a 1.5x multiplier
when performed consecutively (back-to-back chain).

**Level progression**:
- Start at level 1
- Level up every 10 lines cleared
- `state.level = Math.floor(state.lines / 10) + 1`
- Cap at level 29

### 4k. Hold Piece

- Press Shift or C to hold the current piece
- If `holdPiece` is null: store current piece type, spawn next from queue
- If `holdPiece` exists: swap current piece type with held piece, reset rotation and position
- Set `holdUsed = true` — cannot hold again until the next piece spawns
- Reset lock delay on the new piece

### 4l. Ghost Piece

The ghost piece shows where the current piece will land:
1. Copy current piece position
2. Move it down row by row until it would collide
3. Render at that position with very low alpha (`rgba(255,255,255,0.12)` outline)

### 4m. Collision Detection

```javascript
function isValid(type, rotation, row, col) {
  const cells = PIECES[type].cells[rotation];
  for (const [dr, dc] of cells) {
    const r = row + dr;
    const c = col + dc;
    if (c < 0 || c >= 10 || r >= 24) return false;  // out of bounds
    if (r >= 0 && state.board[r][c] !== null) return false;  // occupied
  }
  return true;
}
```

### 4n. Rotation with Wall Kicks

```javascript
function tryRotate(direction) {
  // direction: 1 = clockwise, -1 = counter-clockwise
  const newRot = (state.current.rotation + direction + 4) % 4;
  const stateNames = ['0', 'R', '2', 'L'];
  const from = stateNames[state.current.rotation];
  const to = stateNames[newRot];
  const kickKey = `${from}>${to}`;

  const kicks = state.current.type === 'I' ? I_WALL_KICKS[kickKey] : WALL_KICKS[kickKey];

  for (const [dc, dr] of kicks) {
    if (isValid(state.current.type, newRot, state.current.row + dr, state.current.col + dc)) {
      state.current.rotation = newRot;
      state.current.row += dr;
      state.current.col += dc;
      resetLockDelay();
      return true;
    }
  }
  return false;  // rotation rejected
}
```

### 4o. Game Over

Game over triggers when:
1. A newly spawned piece overlaps existing blocks (top-out)
2. A piece locks with any cell in the hidden rows (rows 0-3) — partial lock-out

On game over:
1. Set `state.phase = 'gameover'`
2. Play game over sound
3. Fire death haptic
4. Screen shake
5. Save best score
6. Animate board "dissolving" from top to bottom (rows grey out sequentially)

### 4p. Restart

On restart (space/tap when game over):
1. Clear board
2. Reset all state
3. Fill new bag and next queue
4. Show idle overlay ("Press any key to start")
5. First input transitions to `'playing'`

---

## 5. Sound Design — Procedural Audio Engine

All sounds via **Web Audio API**. Zero external files. Encapsulated in `audio.js`
as an IIFE returning a public API object (same pattern as Flappy Bird's audio.js).

### 5a. Audio Context & Master Setup

```javascript
const Audio = (function() {
  let ctx = null;
  let masterGain = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
  }

  function ensure() {
    if (!ctx) init();
    if (ctx.state === 'suspended') ctx.resume();
  }

  // ... sound functions below
  // All connect through masterGain
})();
```

### 5b. Sound Catalog (9 distinct sounds)

#### 1. MOVE — Subtle Click
Triggered on left/right movement. Very short and quiet.

- Sine at 600Hz, gain 0.04, duration 15ms
- Exponential gain decay

#### 2. ROTATE — Crisp Tick
Triggered on rotation. Slightly brighter than move.

- Triangle wave at 900Hz, gain 0.06, duration 30ms
- Layered with tiny noise burst (10ms, gain 0.03, highpass 4kHz)

#### 3. SOFT DROP — Ratchet Click
Triggered per row during soft drop. Creates rhythmic acceleration feel.

- Sine at 400Hz, gain 0.05, duration 12ms

#### 4. HARD DROP — Impact Thud
Triggered on hard drop. Punchy and satisfying.

- Sine sweeping 300Hz → 60Hz over 120ms, gain 0.2
- Noise burst: 80ms, bandpass 200Hz Q=2, gain 0.15
- Both with fast exponential decay

#### 5. LOCK — Solid Click
Triggered when piece locks into place.

- Sine at 250Hz + 500Hz (two oscillators), gain 0.1, duration 60ms
- Short noise layer: 40ms, bandpass 1kHz, gain 0.06

#### 6. LINE CLEAR — Rising Chime
Triggered on line clear. Reward intensity scales with lines cleared.

- **Single**: One triangle note at C5 (523Hz), 200ms, gain 0.15
- **Double**: Two notes C5 → E5 (659Hz), 100ms apart
- **Triple**: Three notes C5 → E5 → G5 (784Hz), 80ms apart
- **Tetris**: Four notes C5 → E5 → G5 → C6 (1047Hz), 70ms apart, each louder,
  with added shimmer (high sine at 2kHz, tremolo LFO at 15Hz, 400ms tail)

#### 7. COMBO — Ascending Ping
Triggered on combo continuation. Pitch rises with combo count.

- Triangle at `440 + combo * 80` Hz, gain 0.08, duration 100ms
- Capped at combo 10 (1240Hz)

#### 8. GAME OVER — Descending Doom
Triggered on top-out. Heavy and final.

- Sawtooth 500Hz → 60Hz over 1200ms, gain 0.18
- Sub sine 200Hz → 30Hz over 1000ms, gain 0.15
- Both with slow exponential decay

#### 9. HOLD — Swap Whoosh
Triggered on hold piece swap.

- Noise burst: 100ms, bandpass sweeping 2kHz → 500Hz, gain 0.08
- Creates a quick "whoosh" swooping effect

### 5c. Background Music (Optional Ambient)

Low ambient drone during gameplay (like Snake's hum but more melodic):

- Sine at 110Hz (A2) with gain LFO at 0.2Hz (0.02-0.04 gain range)
- Second sine at 165Hz (E3, perfect fifth) at half volume
- Creates a subtle, mysterious harmonic bed
- Fade in over 800ms on game start, fade out on game over

### 5d. Master Volume & Mute

- All gain nodes route through `masterGain` → `ctx.destination`
- Mute: `masterGain.gain.setValueAtTime(0, ctx.currentTime)`
- Unmute: `masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05)`
- Persist in `localStorage('tetrisMuted')`

---

## 6. Haptic Feedback System

Same `navigator.vibrate()` pattern as other arcade games.

### 6a. Haptic Catalog

| Event              | Pattern (ms)                     | Feel                      |
|--------------------|----------------------------------|---------------------------|
| Move left/right    | `10`                             | Micro-tick                |
| Rotate             | `15`                             | Slightly firmer tick      |
| Hard drop          | `[60, 30, 100]`                  | Impact thud               |
| Lock piece         | `30`                             | Solid click               |
| Single line clear  | `50`                             | Quick pulse               |
| Double line clear  | `[40, 20, 60]`                   | Two-beat                  |
| Triple line clear  | `[40, 15, 40, 15, 80]`          | Triple escalation         |
| Tetris (4 lines)   | `[60, 20, 60, 20, 60, 20, 150]` | Quadruple + heavy finish  |
| Game over          | `[200, 50, 200, 50, 300]`       | Heavy triple thud         |
| Hold swap          | `20`                             | Light swap confirmation   |
| Level up           | `[40, 30, 40, 30, 120]`         | Celebratory               |

---

## 7. Visual Effects & Rendering

### 7a. Canvas Layout

```
┌─────────────────────────────────────────────┐
│  ┌────────┐  ┌────────────────┐  ┌────────┐ │
│  │ HOLD   │  │                │  │ NEXT   │ │
│  │        │  │                │  │  [T]   │ │
│  │  [J]   │  │   PLAYFIELD   │  │  [S]   │ │
│  │        │  │    10 x 20    │  │  [I]   │ │
│  └────────┘  │                │  │  [O]   │ │
│              │                │  │  [Z]   │ │
│  ┌────────┐  │                │  └────────┘ │
│  │ SCORE  │  │                │             │
│  │ LEVEL  │  │                │  ┌────────┐ │
│  │ LINES  │  │                │  │ BEST   │ │
│  └────────┘  │                │  └────────┘ │
│              └────────────────┘              │
└─────────────────────────────────────────────┘
```

### 7b. Background

- Fill entire canvas with `#08091a`
- Subtle grid lines within playfield at cell boundaries: `rgba(0, 210, 255, 0.06)`
- Playfield border: `rgba(0, 210, 255, 0.35)`, lineWidth 2
- Outer area slightly darker with vignette

### 7c. Block Rendering

Each filled cell (28x28px) rendered as:

1. **Base fill**: Piece color, slightly rounded corners (3px radius)
2. **Inner highlight**: Top-left 2px inset lighter (`rgba(255,255,255,0.15)`) for 3D bevel
3. **Inner shadow**: Bottom-right 2px inset darker (`rgba(0,0,0,0.2)`)
4. **Neon glow**: `shadowBlur: 6`, `shadowColor` matching piece glow color
5. **1px gap** between cells (draw at 26x26 with 1px margin) for grid visibility

Locked blocks: Same rendering but `shadowBlur: 3` (dimmer glow) to visually
distinguish from the active piece.

### 7d. Ghost Piece

- Draw outline only (no fill): `strokeStyle: rgba(255,255,255,0.2)`, lineWidth 1.5
- Dashed outline: `setLineDash([3, 3])`
- No glow effect

### 7e. Hold & Next Panels

- Small bordered boxes with dark background
- "HOLD" / "NEXT" labels in `#c0d8ff`, small caps, 11px
- Pieces rendered at reduced scale (16x16 cells) centered in their panels
- If hold is locked (`holdUsed`), render hold piece at 40% opacity
- Next queue shows 5 upcoming pieces vertically stacked

### 7f. Line Clear Animation (300ms)

When lines are cleared:
1. **Phase 1 (0-150ms)**: Cleared rows flash white, scaling rows inward (squeeze horizontally from center)
2. **Phase 2 (150-300ms)**: Rows dissolve into particles, blocks above drop into place with slight bounce
3. Spawn **12 particles per cleared cell** — burst outward in piece color
4. **Screen shake**: intensity scales with lines cleared
   - Single: shakeIntensity 2
   - Double: shakeIntensity 4
   - Triple: shakeIntensity 6
   - Tetris: shakeIntensity 10

### 7g. Lock Flash

When a piece locks:
- Brief white flash (100ms) on the cells that just locked
- `lockFlash` decays from 0.3 to 0

### 7h. Particle System

Same structure as other games:
```javascript
{ x, y, vx, vy, life, maxLife, color, size }
```

**Line clear particles**: 12 per cell, random velocity (80-200 px/s), piece color,
size 2-4px, life 0.3-0.7s

**Hard drop particles**: 8 particles per bottom cell of the piece, burst downward,
white color, size 1-3px, life 0.2-0.4s

**Level up particles**: 30 particles from center of playfield, rainbow colors,
burst in all directions, size 2-5px, life 0.5-1.0s

Cap at 300 particles max.

### 7i. Score Pop

On line clear or hard drop:
- Pop text at top of playfield: "+800" (score value), or "TETRIS!" for 4-line clear
- Scale 1.0 → 1.5, alpha 1.0 → 0, float upward
- Decay: `scorePop *= 0.88` each frame

### 7j. Screen Shake

- Applied via `ctx.translate(randomX, randomY)`
- `shakeIntensity *= 0.85` per frame
- Zero out below 0.3

### 7k. Overlays

**Idle overlay**:
- Vignette (radial gradient to dark edges)
- "TETRIS" in 36px bold, white, neon glow
- "Press any key to start" in 14px, pulsing alpha

**Game Over overlay**:
- Same vignette
- "GAME OVER" in 36px bold
- Final score, level, lines
- "New Best!" if applicable in gold
- "Press Space to restart" pulsing

**Pause overlay**:
- "PAUSED" centered
- Semi-transparent dark overlay

### 7l. Level Up Flash

On level transition:
- Brief cyan flash across entire playfield (200ms)
- Speed lines (horizontal streaks) across playfield
- Level number pops large then shrinks

---

## 8. Input Handling

### 8a. Keyboard

```javascript
const keyActions = {
  'ArrowLeft':  'moveLeft',
  'ArrowRight': 'moveRight',
  'ArrowDown':  'softDrop',
  'ArrowUp':    'rotateCW',      // clockwise
  'KeyX':       'rotateCW',
  'KeyZ':       'rotateCCW',     // counter-clockwise
  'ControlLeft':'rotateCCW',
  'Space':      'hardDrop',
  'ShiftLeft':  'hold',
  'KeyC':       'hold',
  'Escape':     'pause',
  'KeyP':       'pause',
};
```

### 8b. DAS (Delayed Auto Shift)

Critical for competitive-feeling horizontal movement:

```
On keydown (left/right):
  → Immediately move once
  → Start DAS timer
  → After dasDelay (167ms): begin auto-repeat at dasRate (33ms ≈ 30Hz)

On keyup:
  → Stop DAS for that direction
  → If opposite direction still held, start DAS for that direction
```

Implementation:
- Track `keysHeld` set for currently pressed keys
- On each frame update, if DAS direction held:
  - `dasTimer += deltaTime`
  - If `dasTimer >= dasDelay && !dasChargeComplete`: set `dasChargeComplete = true`, reset sub-timer
  - If `dasChargeComplete`: auto-move every `dasRate` ms

### 8c. Touch Controls (Mobile)

Mobile gets on-screen touch zones overlaid on the canvas:

```
┌─────────────────────────────┐
│                             │  Tap top half = rotate CW
│        ROTATE ZONE          │
│                             │
├──────┬──────────┬───────────┤
│      │          │           │
│ LEFT │   DOWN   │   RIGHT   │  Bottom third = directional
│      │          │           │
├──────┴──────────┴───────────┤
│       HARD DROP (swipe up)  │  Swipe up anywhere = hard drop
└─────────────────────────────┘
```

Alternative approach — **swipe-based**:
- Swipe left: move left (with auto-repeat on hold)
- Swipe right: move right
- Swipe down: soft drop
- Swipe up: hard drop
- Tap: rotate clockwise
- Two-finger tap: hold piece

Implemented via pointer events:
- `pointerdown`: record start position
- `pointermove`: calculate delta, trigger actions at threshold (15px)
- `pointerup`: release

Also support a simple button bar below the canvas for mobile:
```html
<div class="touch-controls">
  <button class="touch-btn" data-action="moveLeft">◀</button>
  <button class="touch-btn" data-action="rotateCCW">↺</button>
  <button class="touch-btn" data-action="hardDrop">▼▼</button>
  <button class="touch-btn" data-action="rotateCW">↻</button>
  <button class="touch-btn" data-action="moveRight">▶</button>
</div>
```

Only show on touch devices (`'ontouchstart' in window`).

### 8d. Pause

- Escape or P toggles pause
- While paused: game loop still runs (for overlay animations) but logic ticks frozen
- Hide the playfield blocks during pause (prevent cheating by studying the board)

---

## 9. Score, Persistence & HUD

### 9a. Score Summary

| Action               | Points                                    |
|----------------------|-------------------------------------------|
| Soft drop            | 1 per row                                 |
| Hard drop            | 2 per row                                 |
| Single              | 100 x level                               |
| Double              | 300 x level                               |
| Triple              | 500 x level                               |
| Tetris              | 800 x level                               |
| Combo               | 50 x combo x level                        |
| Back-to-back bonus  | 1.5x multiplier on Tetris/T-spin clears   |

### 9b. Level Progression

- Level up every 10 lines
- `level = floor(lines / 10) + 1`
- Gravity speed increases per level (see 4g)
- Visual level-up celebration

### 9c. Persistence

- `localStorage` keys:
  - `tetrisBest`: best score
  - `tetrisMuted`: mute state
- Load on init, save best on game over

### 9d. HUD Layout

Canvas-rendered HUD (no HTML overlay):
- **Left panel**: Hold piece box, Score, Level, Lines labels
- **Right panel**: Next queue (5 pieces), Best score
- All text in `#c0d8ff`, monospaced numbers via `font-variant-numeric: tabular-nums`
- Score animates up (counts toward target rather than instant jump)

---

## 10. Arcade Integration

### 10a. Landing Page Card

Add to `index.html` `.games-grid` as a new card:

```html
<a href="/tetris/" class="game-card">
  <div class="card-preview tetris-preview">
    <canvas id="tetrisCanvas" width="360" height="200"></canvas>
  </div>
  <div class="card-body">
    <h2>Tetris</h2>
    <p>Stack tetrominoes, clear lines, and chase the high score. Classic puzzle action with a neon twist!</p>
    <span class="card-tag tetris-tag">Puzzle</span>
  </div>
</a>
```

### 10b. Card Styles

```css
.tetris-preview {
  background: linear-gradient(180deg, #0a1230, #060918, #030510);
}

.tetris-tag {
  background: rgba(0, 210, 255, 0.15);
  color: #00d4ff;
  border: 1px solid rgba(0, 210, 255, 0.3);
}
```

Add `:nth-child` glow border for the new card position:
```css
.game-card:nth-child(7)::before {
  border-color: rgba(0, 210, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 210, 255, 0.15);
}
```

### 10c. Card Preview Animation

Animated canvas preview showing:
- Dark blue background with faint grid
- A few pre-placed colourful blocks at the bottom
- A T-piece slowly falling and rotating
- Occasional line clear flash effect
- Cycle: piece falls → locks → new piece spawns (5-second loop)

Implementation: Lightweight animation loop in the hub page `<script>` block,
same IIFE pattern as other preview animations (~50 lines).

---

## 11. Performance & Compatibility

### 11a. Rendering Performance

- Single `requestAnimationFrame` loop
- Delta-time capped at 33ms to prevent physics jumps
- Particle array capped at 300
- Minimize `save()`/`restore()` — only for shake and rotations
- Board rendering optimized: only redraw changed cells when possible, but
  full redraw is fine at 10x20 (200 cells, trivial for modern hardware)

### 11b. Input Performance

- DAS implementation uses `requestAnimationFrame` timing (not `setInterval`)
- Key state tracked via `keydown`/`keyup` with a `Set`
- Prevents key repeat from OS (`e.repeat` filtered for actions that shouldn't repeat
  like hard drop and hold)

### 11c. Audio Performance

- Single `AudioContext`, never recreated
- Short-lived nodes auto-garbage-collected
- Ambient drone uses persistent nodes
- iOS Safari: resume AudioContext on first user gesture

### 11d. Browser Support

- Canvas 2D: universal
- Web Audio API: 92%+ global support
- Vibration API: ~75% (graceful fallback)
- `roundRect`: Chrome 99+, Firefox 112+, Safari 15.4+ (fallback to `rect`)
- `setLineDash`: universal modern browser support

### 11e. Responsive Layout

- Canvas renders at 480x640 internally
- CSS scales: `width: min(100%, 480px); height: auto; aspect-ratio: 3/4;`
- Touch controls bar only shown on touch devices
- HUD stacks on narrow screens
- Minimum playable width: ~320px (iPhone SE)

### 11f. Accessibility

- `aria-label` on canvas
- Keyboard fully playable (no mouse required)
- High contrast neon colors on dark background
- Screen reader: score changes announced via `aria-live` region in HUD HTML

---

## Implementation Order

Recommended build sequence:

1. **Skeleton**: `index.html`, `styles.css`, canvas setup, basic layout
2. **Core engine**: Board data structure, piece definitions, collision detection, gravity
3. **Rendering**: Playfield grid, block rendering, current piece, ghost piece
4. **Input**: Keyboard controls, DAS, rotation with wall kicks
5. **Game flow**: Spawning, locking, line clearing, scoring, level progression
6. **Hold & Next**: Hold piece mechanic, next queue display
7. **Visual polish**: Particles, screen shake, line clear animation, score pops
8. **Audio**: All 9 sound effects + ambient drone
9. **Haptics**: Vibration patterns for all events
10. **Mobile**: Touch controls, responsive testing
11. **Arcade integration**: Hub card, preview animation, back link
12. **Testing & tuning**: DAS feel, gravity curve, visual timing, audio balance

# Snake — Detailed Implementation Plan

## Vision

A modern, hypnotic Snake game where **sound and haptic feedback** are the primary
sensory hooks. Every action — turning, eating, growing, dying — produces a
distinct auditory and tactile signature. The visuals are dark, neon-accented, and
buttery smooth, but the *feel* of the game lives in its audio-haptic layer. The
player should be able to close their eyes and still sense what is happening.

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
snake/
├── index.html      Game page (canvas + HUD + mute toggle)
├── game.js         All game logic, rendering, audio, haptics (~600-700 lines)
└── styles.css      Page styling (dark neon green theme)
```

No external dependencies. No audio files. All sounds generated procedurally via
the Web Audio API. All haptics via the Vibration API with graceful fallback.

---

## 2. HTML Layout

Follow the Flappy Bird pattern (portrait-oriented, single-column, centered):

```
<main class="game">
  <header class="game__header">
    ← Back to Games          (link to /)
    Snake                     (h1)
    Arrow keys or swipe...    (instruction text)
  </header>

  <section class="game__panel">
    <canvas id="gameCanvas" width="480" height="480">
    <div class="game__hud">
      Score: 0    |    Best: 0    |    🔊 (mute toggle)    |    Restart
    </div>
  </section>

  <footer class="game__footer">
    Tip: the walls close in every 15 points...
  </footer>
</main>
```

### Key HTML Details:
- Canvas is **480x480** (square grid, 24x24 cells at 20px each)
- `aria-label="Snake game"` on the canvas for accessibility
- Mute toggle button in the HUD (speaker icon toggles between 🔊 and 🔇)
  - Stores mute preference in `localStorage` key `snakeMuted`
  - When muted: all audio silenced, haptics still fire (separate channels)
- Restart button styled consistently with Flappy Bird's `.hud__button`
- `touch-action: manipulation` on canvas to prevent browser gestures

---

## 3. Visual Design System

### Color Palette

| Role               | Color                  | Hex         |
|---------------------|------------------------|-------------|
| Background          | Near-black             | `#0a0f0a`   |
| Grid lines          | Faint green            | `rgba(0, 255, 100, 0.04)` |
| Snake head          | Bright neon green      | `#39ff14`   |
| Snake body gradient  | Neon green → teal     | `#39ff14` → `#00b894` |
| Snake body tail     | Dark teal, fading      | `#00b894` → `rgba(0,184,148,0.2)` |
| Food (normal)       | Warm amber             | `#ffbe0b`   |
| Food (golden)       | Bright gold + glow     | `#ffd700`   |
| Food (speed)        | Hot red                | `#ff006e`   |
| Arena walls         | Neon green border      | `#39ff14` at 30% opacity |
| Arena walls (closing)| Pulsing red-orange     | `#ff4444`   |
| Text / HUD          | Soft white-green       | `#c8f7c5`   |
| Panel background    | Glass dark             | `rgba(10,20,10,0.85)` |
| Page background     | Dark gradient           | `#050a05` → `#0a1a0a` → `#051005` |

### Typography
- Font family: `"Trebuchet MS", "Segoe UI", system-ui, sans-serif` (matching Flappy)
- Score display: `font-variant-numeric: tabular-nums` for stable width
- Page title: gradient text (`#39ff14` → `#00b894`)

### CSS Architecture
- Follow the `.game`, `.game__header`, `.game__panel`, `.game__hud`, `.game__footer` BEM pattern from Flappy Bird
- Dark `color-scheme: dark`
- Page background: layered radial gradients for depth (similar to Methane Drift's approach but with greens instead of blues)
- Canvas border: `2px solid rgba(57, 255, 20, 0.3)` with `box-shadow: 0 0 30px rgba(57, 255, 20, 0.08)`
- Panel: glassmorphism with `backdrop-filter: blur(8px)`, dark green tint
- Responsive: max-width 540px for `.game` container, canvas `width: min(100%, 480px)` with `aspect-ratio: 1`
- Mute button: small icon button in the HUD row, no background, just the emoji, hover glow

---

## 4. Core Game Mechanics

### 4a: Grid System

- Canvas: 480 x 480 pixels
- Cell size: 20px x 20px
- Full grid: 24 x 24 cells
- Arena starts at full grid (0,0) to (23,23)
- Arena shrinks inward: `arenaMin` starts at 0, `arenaMax` starts at 23
  - Every 15 points scored: `arenaMin += 1`, `arenaMax -= 1`
  - Minimum arena size: 12x12 (arenaMin=6, arenaMax=17) — will not shrink further
  - When arena shrinks, if any snake segment is now inside a wall → game over

### 4b: Game State Object

```javascript
const state = {
  // Game flow
  phase: 'idle',              // 'idle' | 'playing' | 'dead'

  // Score
  score: 0,
  best: 0,

  // Timing
  lastTime: 0,                // for requestAnimationFrame delta
  tickAccumulator: 0,         // time accumulated toward next logic tick
  tickInterval: 150,          // ms between snake movements (decreases with score)
  baseTickInterval: 150,      // starting tick speed
  minTickInterval: 60,        // fastest possible tick speed

  // Arena
  arenaMin: 0,                // top-left cell index of playable area
  arenaMax: 23,               // bottom-right cell index of playable area
  arenaFlash: 0,              // flash timer when arena shrinks (for visual pulse)
  lastShrinkScore: 0,         // score at which arena last shrank

  // Visual effects
  scorePop: 0,                // score pop animation timer
  scorePopValue: '',          // text to show ("+1", "+3")
  shakeTimer: 0,              // screen shake on death
  shakeIntensity: 0,
  eatFlash: 0,                // brief screen flash on eat
  particles: [],              // particle system array

  // Audio
  muted: false,

  // Speed power-up
  speedBoostTimer: 0,         // frames remaining of speed boost
};
```

### 4c: Snake Object

```javascript
const snake = {
  segments: [{x: 12, y: 12}],   // array of {x, y} grid coords, index 0 = head
  direction: {x: 1, y: 0},       // current movement direction
  nextDirection: {x: 1, y: 0},   // queued direction (applied at next tick)
  directionQueue: [],             // queue of pending direction changes (max 2)
  growPending: 0,                 // how many segments to add (can queue multiple)
  movePhase: 0,                   // 0-1 interpolation for smooth movement animation
};
```

### 4d: Food Object

```javascript
const food = {
  x: 0,                  // grid x
  y: 0,                  // grid y
  type: 'normal',        // 'normal' | 'golden' | 'speed'
  pulsePhase: 0,         // for glow animation
  spawnAnim: 0,          // 0-1 scale-in animation on spawn
};
```

### 4e: Movement & Tick System

**Dual-loop architecture** (critical for Snake feel):

1. **Render loop** (requestAnimationFrame, ~60fps): Handles all drawing, animations,
   particles, smooth interpolation. Calculates `deltaTime` and feeds it to
   `tickAccumulator`.

2. **Logic tick** (discrete, variable interval): When `tickAccumulator >= tickInterval`,
   a tick fires:
   - Apply `nextDirection` from queue to `direction`
   - Calculate new head position: `newHead = {x: head.x + direction.x, y: head.y + direction.y}`
   - Check collisions (wall, self) — if hit, trigger death
   - Check food collision — if eating:
     - Increment score
     - Set `growPending += 1` (or `+= 3` for golden food)
     - Spawn new food
     - Play eat sound + haptic
     - Spawn eat particles
   - Add `newHead` to front of `segments`
   - If `growPending > 0`: decrement `growPending` (don't remove tail)
   - Else: remove last segment (tail)
   - Reset `tickAccumulator -= tickInterval`

**Smooth movement interpolation**: Between ticks, `movePhase` interpolates from
0 to 1 based on `tickAccumulator / tickInterval`. The snake head's rendered position
lerps between its previous grid position and current grid position, giving
smooth sliding movement instead of jerky grid-snapping. Body segments follow
with the same interpolation one step behind.

### 4f: Speed Ramp

```
tickInterval = max(minTickInterval, baseTickInterval - (score * 2.5))
```

- Score 0:  150ms per tick (slow, learnable)
- Score 10: 125ms per tick
- Score 20: 100ms per tick
- Score 30: 75ms per tick
- Score 36+: 60ms per tick (cap — frantic but playable)

When a speed food is eaten: temporarily set `tickInterval` to `max(40, currentInterval - 30)` for 5 seconds, then revert. This feels like a sudden adrenaline burst.

### 4g: Food Spawning

On spawn:
1. Collect all empty cells (not occupied by snake segments or wall cells)
2. Pick a random empty cell
3. Determine food type:
   - 75% chance: `normal` (amber, +1 score)
   - 15% chance: `golden` (gold, +3 score, brief slow-motion for 3 seconds — tick interval temporarily increases by 40ms)
   - 10% chance: `speed` (red, +1 score, speed boost for 5 seconds)
4. Set `food.spawnAnim = 0` (will animate to 1 over 200ms for a pop-in effect)

### 4h: Arena Shrinking

Every 15 points (`score > 0 && score % 15 === 0 && score !== lastShrinkScore`):
1. `arenaMin += 1`, `arenaMax -= 1`
2. Check if minimum reached (arenaMin >= 6): if so, stop shrinking
3. Set `arenaFlash = 1.0` (triggers red flash on walls)
4. Play wall warning sound
5. Fire wall-closing haptic pattern
6. Check every snake segment: if any segment is now `< arenaMin` or `> arenaMax` in
   either axis → instant death
7. Update `lastShrinkScore = score`

### 4i: Collision Detection

**Wall collision** (checked at tick time):
```
newHead.x < arenaMin || newHead.x > arenaMax ||
newHead.y < arenaMin || newHead.y > arenaMax
```

**Self collision** (checked at tick time):
```
snake.segments.some((seg, i) => i > 0 && seg.x === newHead.x && seg.y === newHead.y)
```

Note: Check against segments *before* removing the tail for the current tick.
If `growPending > 0` the tail won't be removed, so collision with the very last
segment is valid. If `growPending === 0`, the tail *will* move, so exclude it from
collision (index < segments.length - 1).

### 4j: Death Sequence

When collision detected:
1. Set `state.phase = 'dead'`
2. Play death sound (descending doom tone + sub-bass rumble)
3. Fire death haptic pattern (heavy triple-pulse)
4. Set `state.shakeTimer = 15`, `state.shakeIntensity = 8`
5. Spawn death particles (explosion of segments scattering outward)
6. Save best score if new record
7. Stop ambient hum

### 4k: Restart

On restart (space/tap when dead, or restart button):
1. Reset all state to defaults
2. Snake starts at center of grid (12,12), length 1, facing right
3. Spawn first food
4. Do NOT auto-start — show "Press arrow key or swipe to begin" overlay
5. First directional input starts the game (`phase` → `'playing'`)
6. Start ambient hum

---

## 5. Sound Design — Procedural Audio Engine

All sounds generated via the **Web Audio API**. Zero external audio files.
One shared `AudioContext` created on first user interaction.

### 5a: Audio Context Setup

```javascript
let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playSound(fn) {
  if (state.muted) return;
  fn(getAudio());
}
```

### 5b: Sound Catalog (7 distinct sounds)

#### 1. EAT — Satisfying "Pop-Crunch"

Triggered every time the snake eats any food. Must feel crunchy and satisfying.
Short (80ms) so it doesn't overlap at high speeds.

**Synthesis**: Sine oscillator sweeping 600Hz → 200Hz over 80ms (the "pop") layered
with a 60ms burst of bandpass-filtered white noise at 3kHz (the "crunch").

- Sine osc: frequency 600→200 exponential ramp over 80ms
- Gain: 0.25 → 0.001 over 100ms
- Noise buffer: 60ms of `Math.random() * 2 - 1`
- Bandpass filter: center 3000Hz, Q=1.5
- Noise gain: 0.12 → 0.001 over 50ms

**Variation**: Pitch the sine start frequency slightly randomly (580-620Hz) each
time so it never sounds repetitive.

#### 2. GOLDEN EAT — Sparkle Chime

Triggered when eating golden food. Richer, more rewarding than normal eat.

**Synthesis**: Three staggered triangle-wave notes forming a rising major triad
(C5=523Hz, E5=659Hz, G5=784Hz), each 100ms apart, each lasting 250ms with
gain fade. Layered on top of the normal eat sound.

- Note 1 at t+0ms: 523Hz triangle, gain 0.18 → 0.001 over 250ms
- Note 2 at t+100ms: 659Hz triangle, gain 0.18 → 0.001 over 250ms
- Note 3 at t+200ms: 784Hz triangle, gain 0.18 → 0.001 over 250ms

#### 3. SPEED EAT — Urgent Buzz

Triggered when eating speed food. Feels electric and dangerous.

**Synthesis**: Sawtooth wave at 220Hz with rapid frequency vibrato (LFO at 30Hz,
depth ±40Hz) lasting 200ms. Gain 0.15 → 0.001.

#### 4. MOVE TICK — Subtle Rhythmic Click

Triggered every logic tick when the snake moves. Extremely quiet. Creates a
rhythmic pulse that speeds up as the game accelerates — this is the *heartbeat*
of the game and the primary source of tension.

**Synthesis**: Single sine oscillator at 800Hz, gain 0.06, duration 25ms.
Exponential gain decay to 0.001 over 25ms.

**Critical detail**: As tickInterval decreases (game speeds up), these clicks
get closer together, creating an accelerating heartbeat effect without any
code change — the rhythm emerges from the game speed itself.

#### 5. DEATH — Descending Doom

Triggered on game over. Must feel heavy and final.

**Synthesis**: Two layered oscillators:
- Primary: Sawtooth 400Hz → 80Hz exponential ramp over 800ms, gain 0.2 → 0.001 over 900ms
- Sub-bass: Sine 150Hz → 40Hz over 800ms, gain 0.18 → 0.001 over 1000ms

#### 6. WALL WARNING — Tension Alarm

Triggered when the arena shrinks. Brief, alarming.

**Synthesis**: Square wave at 400Hz, amplitude-modulated by a square LFO at 10Hz
(creates rapid on-off pulsing). Duration 350ms. Gain 0.12 → 0.001.

#### 7. AMBIENT HUM — Background Drone

Plays continuously during gameplay. A very low, barely perceptible sine wave
at 55Hz (A1) with a slow LFO (0.3Hz) modulating its gain between 0.025 and
0.045. Creates a subliminal sense of "aliveness" in the game world.

- Start on game start, stop on death or pause
- Fade in over 500ms, fade out over 500ms
- Persistent nodes (not recreated per play)

### 5c: Master Volume & Mute

- All gain nodes route through a master `GainNode` before `ctx.destination`
- Mute toggle sets master gain to 0 (instant) or 1 (with 50ms ramp to prevent click)
- Mute state persisted in `localStorage('snakeMuted')`

---

## 6. Haptic Feedback System

All haptics use `navigator.vibrate()` with feature detection. Haptics fire
independently of audio mute state (they are separate sensory channels).

### 6a: Safe Wrapper

```javascript
function vibrate(pattern) {
  if (navigator && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}
```

### 6b: Haptic Catalog

| Event              | Pattern (ms)                        | Feel                      |
|--------------------|--------------------------------------|---------------------------|
| Eat (normal)       | `35`                                 | Quick tick                |
| Eat (golden)       | `[40, 25, 70, 25, 120]`            | Ascending escalation      |
| Eat (speed)        | `[60, 30, 60]`                      | Two sharp urgent taps     |
| Death              | `[200, 50, 200, 50, 200]`          | Heavy triple thud         |
| Wall shrink        | `[30, 20, 30, 20, 30, 20, 30]`     | Rapid stutter alarm       |
| Score milestone    | `[80, 40, 80, 40, 250]`            | Celebratory escalation    |
| Direction change   | `15`                                 | Micro-tick on every turn  |

### 6c: Haptic Design Principles

- **Frequent events** (eat, turn) get the shortest patterns (15-35ms) to avoid fatigue
- **Rare impactful events** (death, wall shrink) get dramatic multi-pulse patterns
- Every haptic has a paired sound — the two channels reinforce each other
- Direction change haptic (15ms) is the most subtle but important: it confirms
  the player's input was registered, providing tactile "steering feel"

---

## 7. Visual Effects & Rendering

### 7a: Background

- Fill canvas with `#0a0f0a` (near-black dark green)
- Draw grid lines: vertical and horizontal lines at every 20px
  - Color: `rgba(0, 255, 100, 0.04)` — barely visible, creates subtle texture
  - Only draw within the arena bounds (not in wall area)
- Arena wall area: filled with `rgba(57, 255, 20, 0.03)` with a brighter border

### 7b: Arena Walls

- Draw a rectangle outline at `(arenaMin * cellSize, arenaMin * cellSize)` to
  `((arenaMax + 1) * cellSize, (arenaMax + 1) * cellSize)`
- Wall stroke: `rgba(57, 255, 20, 0.3)`, lineWidth 2
- Outer area (between canvas edge and arena): filled darker, `rgba(0,0,0,0.4)`
- **Shrink flash**: When `arenaFlash > 0`, the wall border color interpolates
  toward `#ff4444` (red) and pulses. `arenaFlash` decays by `*= 0.94` each frame.
- **Danger glow**: When arena is small (arenaMin >= 4), add a subtle red
  `shadowBlur` glow to the walls

### 7c: Snake Rendering

The snake is the visual centerpiece. Every segment is a rounded rectangle with
careful gradient coloring.

**Head (segment 0)**:
- Size: 18x18px (slightly smaller than cell to show grid gap)
- Fill: radial gradient, center bright `#39ff14`, edges `#00cc44`
- **Eyes**: Two small white circles (radius 2.5px) positioned based on
  `snake.direction`:
  - Facing right: eyes at (+4, -4) and (+4, +4) relative to center
  - Facing left: eyes at (-4, -4) and (-4, +4)
  - Facing up: eyes at (-4, -4) and (+4, -4)
  - Facing down: eyes at (-4, +4) and (+4, +4)
- Pupil: smaller black circle (1.5px) inside each eye, offset slightly in
  movement direction
- **Glow**: `shadowBlur: 12`, `shadowColor: 'rgba(57, 255, 20, 0.6)'` — neon bloom

**Body segments (index 1 to N-1)**:
- Size: 16x16px (slightly smaller than head)
- Corner radius: 4px (roundRect)
- Color: interpolate from `#39ff14` (near head) to `#00b894` (mid) to
  `rgba(0, 184, 148, 0.3)` (tail) based on `index / segments.length`
- Each segment has a subtle inner highlight: lighter fill on top-left quadrant
  `rgba(255,255,255,0.08)` for 3D illusion
- **Glow decreases toward tail**: `shadowBlur` from 8 (near head) to 0 (tail)

**Tail (last segment)**:
- Same as body but alpha fades to 0.3, creating a "dissolving" tail tip

**Smooth movement interpolation**:
- Between ticks, each segment's rendered position is:
  `renderX = lerp(previousGridX, currentGridX, movePhase) * cellSize`
- `movePhase = tickAccumulator / tickInterval` (0 to 1)
- This creates butter-smooth sliding instead of grid snapping
- Store `previousPositions[]` array updated each tick

### 7d: Food Rendering

**Normal food (amber)**:
- Draw a circle (radius 7px) at food grid position
- Fill: radial gradient `#ffbe0b` center → `#ff9500` edge
- Pulsing glow: `shadowBlur` oscillates between 8 and 16 using
  `8 + Math.sin(food.pulsePhase) * 4`, `shadowColor: rgba(255, 190, 11, 0.5)`
- `food.pulsePhase += deltaTime * 4`
- Spawn animation: scale from 0 to 1 over 200ms using ease-out cubic

**Golden food (gold)**:
- Circle radius 8px (slightly larger)
- Fill: `#ffd700` with brighter glow
- `shadowBlur` oscillates 12-24, `shadowColor: rgba(255, 215, 0, 0.7)`
- Additional effect: tiny orbiting sparkle dots (2-3 small circles orbiting
  at radius 12px, angle incrementing with time)

**Speed food (red)**:
- Circle radius 7px
- Fill: radial gradient `#ff006e` → `#cc0058`
- `shadowBlur` oscillates 8-18, `shadowColor: rgba(255, 0, 110, 0.5)`
- Additional effect: rapid inner pulse (scale oscillates 0.85-1.0 at 8Hz)
  giving it a "vibrating" look that signals urgency

### 7e: Particle System

A simple particle array. Each particle has:
```javascript
{ x, y, vx, vy, life, maxLife, color, size }
```

**Update**: Each frame: `x += vx`, `y += vy`, `vx *= 0.96`, `vy *= 0.96`,
`life -= deltaTime`. Remove when `life <= 0`.

**Render**: Circle at (x, y), radius = `size * (life / maxLife)`,
alpha = `life / maxLife`, with matching `shadowBlur` for glow.

**Eat particles** (on food eaten):
- Spawn 12 particles at food position
- Random velocity: angle = random 0-2π, speed = 60-150 px/s
- Color matches food type (amber / gold / red)
- Size: 2-4px
- Life: 0.3-0.6 seconds

**Death particles** (on game over):
- For each snake segment: spawn 3 particles at segment position
- Velocity: outward from center of snake, speed 40-120 px/s
- Color: green matching segment color (gradient from head to tail)
- Size: 3-5px
- Life: 0.5-1.0 seconds

**Direction change particle** (on turn):
- Spawn 3-4 tiny particles at the turning point
- Very small (1-2px), very short-lived (0.2s)
- Color: `rgba(57, 255, 20, 0.4)` — subtle confirmation of the turn

### 7f: Score Pop Animation

When food is eaten:
- `scorePop = 1.0`, `scorePopValue = "+1"` (or "+3" for golden)
- Render at canvas center top (x: canvas.width/2, y: 60):
  - Scale: `1 + scorePop * 0.5`
  - Alpha: `scorePop`
  - Font: bold 24px Trebuchet MS, white with green shadow
  - Float upward: y offset = `(1 - scorePop) * -20`
- Decay: `scorePop *= 0.90` each frame, zero out below 0.02

### 7g: Screen Shake (Death)

- `shakeTimer` counts down from 15
- `shakeIntensity` decays by `*= 0.82` each frame
- Apply `ctx.translate(randomX, randomY)` where random = `(Math.random()-0.5) * shakeIntensity`
- Wrap entire draw call in `ctx.save()` / `ctx.restore()`

### 7h: Screen Flash (Eat)

- `eatFlash` set to `0.15` on normal eat, `0.25` on golden eat, `0.2` on speed eat
- Render: full-canvas rectangle with `rgba(255, 255, 255, eatFlash)` (white flash)
  or tinted to match food color
- Decay: `eatFlash *= 0.85` each frame

### 7i: Overlays

**Idle overlay** (before game starts):
- Vignette (radial gradient, transparent center → `rgba(0,0,0,0.5)` edges)
- Title: "Snake" in 32px bold, white, centered
- Subtitle: "Arrow keys or swipe to start" in 16px, `rgba(255,255,255,0.7)`

**Death overlay**:
- Same vignette
- Title: "Game Over" in 34px bold, white
- Subtitle: "Score: {score}" in 16px
- If new best: additional line "New Best!" in `#ffd700` (gold)

---

## 8. Input Handling

### 8a: Keyboard

```javascript
window.addEventListener('keydown', (e) => {
  const keyMap = {
    'ArrowUp':    {x: 0, y: -1},
    'ArrowDown':  {x: 0, y: 1},
    'ArrowLeft':  {x: -1, y: 0},
    'ArrowRight': {x: 1, y: 0},
    'KeyW':       {x: 0, y: -1},
    'KeyS':       {x: 0, y: 1},
    'KeyA':       {x: -1, y: 0},
    'KeyD':       {x: 1, y: 0},
  };

  const dir = keyMap[e.code];
  if (dir) {
    e.preventDefault();
    queueDirection(dir);
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (state.phase === 'dead') resetGame();
  }
});
```

### 8b: Direction Queue

Prevent 180-degree reversals. Allow queuing up to 2 moves ahead (so rapid
L-shaped turns work reliably at high speed):

```javascript
function queueDirection(dir) {
  // Start game on first directional input
  if (state.phase === 'idle') {
    state.phase = 'playing';
    startAmbientHum();
  }

  // Get the effective current direction (last queued or actual)
  const queue = snake.directionQueue;
  const lastDir = queue.length > 0 ? queue[queue.length - 1] : snake.direction;

  // Prevent 180° reversal
  if (dir.x === -lastDir.x && dir.y === -lastDir.y) return;
  // Prevent same direction
  if (dir.x === lastDir.x && dir.y === lastDir.y) return;

  // Max queue size of 2
  if (queue.length < 2) {
    queue.push(dir);
  }
}
```

At each tick, shift one direction from the queue (if available) and apply it.

### 8c: Touch / Swipe (Mobile)

Track swipe gestures on the canvas:

```javascript
let touchStart = null;

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  touchStart = { x: e.clientX, y: e.clientY };

  // Tap to restart when dead
  if (state.phase === 'dead') resetGame();
});

canvas.addEventListener('pointermove', (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  const threshold = 20; // minimum swipe distance in px

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

  // Determine primary axis
  if (Math.abs(dx) > Math.abs(dy)) {
    queueDirection(dx > 0 ? {x:1,y:0} : {x:-1,y:0});
  } else {
    queueDirection(dy > 0 ? {x:0,y:1} : {x:0,y:-1});
  }

  // Reset touchStart to allow continuous swiping
  touchStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', () => { touchStart = null; });
canvas.addEventListener('pointercancel', () => { touchStart = null; });
```

### 8d: Mute Toggle

- Click/tap the mute button in HUD
- Toggle `state.muted`
- Update button text (🔊 ↔ 🔇)
- Save to `localStorage`
- If unmuting: resume AudioContext

---

## 9. Score, Persistence & HUD

### 9a: Score Rules

| Food Type | Points | Side Effect                              |
|-----------|--------|-------------------------------------------|
| Normal    | +1     | None                                      |
| Golden    | +3     | Slow-motion for 3s (tickInterval += 40ms) |
| Speed     | +1     | Speed boost for 5s (tickInterval -= 30ms) |

Milestone: every 15 points triggers arena shrink + milestone sound + haptic.

### 9b: Best Score Persistence

- `localStorage` key: `snakeBest`
- Load on page init: `state.best = Number(localStorage.getItem('snakeBest')) || 0`
- Save on death: `if (state.score > state.best) { state.best = state.score; localStorage.setItem('snakeBest', String(state.best)); }`
- Display both in HUD, updated in real-time

### 9c: HUD Layout

```
[ Score: 0 ]   [ Best: 0 ]   [ 🔊 ]   [ Restart ]
```

- 4-column grid in `.game__hud`
- Score and Best use the same `.hud__score` pattern as Flappy Bird
- Mute button: small, icon-only, no border by default, glow on hover
- Restart button: `.hud__button` with green gradient (`#39ff14` → `#00cc44`)

---

## 10. Arcade Integration

### 10a: Landing Page Card

Add to `index.html` `.games-grid` after the Methane Drift card:

```html
<a href="/snake/" class="game-card">
  <div class="card-preview snake-preview">
    <span>🐍</span>
  </div>
  <div class="card-body">
    <h2>Snake</h2>
    <p>Guide the snake, eat to grow, and survive as the walls close in. Turn up the volume!</p>
    <span class="card-tag snake-tag">Classic</span>
  </div>
</a>
```

### 10b: Card Styles (added to `index.html` `<style>`)

```css
.snake-preview {
  background: linear-gradient(180deg, #0a2e1a, #051a0d, #020a05);
}

.snake-tag {
  background: rgba(57, 255, 20, 0.15);
  color: #39ff14;
  border: 1px solid rgba(57, 255, 20, 0.3);
}
```

---

## 11. Performance & Compatibility

### 11a: Rendering Performance

- Single `requestAnimationFrame` loop for all rendering
- Delta-time capped at 33ms (`Math.min(delta, 33)`) to prevent physics jumps
  on tab-switch return
- Particle array capped at 200 particles max (remove oldest if exceeded)
- Canvas `willReadFrequently: false` (default) for GPU acceleration
- Minimize `ctx.save()`/`ctx.restore()` calls — only for screen shake and
  rotations

### 11b: Audio Performance

- Single `AudioContext` instance, never recreated
- Short-lived oscillator/gain nodes are garbage-collected automatically
- Ambient hum uses persistent nodes (created once, controlled via gain)
- iOS Safari: AudioContext must be resumed inside a user gesture handler.
  Call `getAudio()` inside the first `pointerdown` or `keydown` event.

### 11c: Haptic Compatibility

- Feature-detect `navigator.vibrate` before every call
- Haptics gracefully degrade (nothing happens on unsupported browsers)
- Never rely on haptics alone — always pair with audio + visual feedback

### 11d: Browser Support

- All modern browsers (Chrome, Firefox, Safari, Edge)
- Web Audio API: 92% global support (including iOS Safari)
- Vibration API: 75% support (NOT on any iOS browser — graceful fallback)
- Canvas 2D: universal
- `roundRect`: Chrome 99+, Firefox 112+, Safari 15.4+ — use fallback for older:
  ```javascript
  if (!ctx.roundRect) {
    // fallback: draw regular fillRect
  }
  ```

### 11e: Responsive Layout

- Canvas renders at 480x480 internally (always)
- CSS scales it down on small screens: `width: min(100%, 480px); height: auto; aspect-ratio: 1;`
- HUD stacks gracefully on narrow screens
- Touch target sizes stay above 44px minimum

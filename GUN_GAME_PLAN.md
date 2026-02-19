# Gun Game Mode — Flappy Bird

A new game mode where the bird wields weapons to destroy pipes. Inspired by the classic FPS "Gun Game" — the player progresses through a series of weapon tiers by destroying pipes. Complete all tiers to win.

---

## Core Concept

- The bird can **shoot projectiles** to destroy pipes before reaching them.
- Each **weapon tier** requires destroying a set number of pipes to advance to the next weapon.
- Weapons escalate from simple to spectacular across **8 tiers**.
- Dying **demotes** the player one tier (minimum tier 1), adding tension.
- Completing all 8 tiers triggers a **victory screen**.
- The classic flap-to-fly mechanic is preserved — shooting is an additional input.

---

## Controls

| Action | Keyboard | Touch/Pointer |
|--------|----------|---------------|
| Flap | Space | Tap left half of canvas |
| Shoot | F / Enter | Tap right half of canvas |

Touch zone split: the canvas is divided into a **left half** (flap) and **right half** (shoot). On keyboard, flap and shoot have independent keys so both can happen simultaneously.

---

## Weapon Tiers

Each tier requires **3 pipe destroys** to advance (24 total destroys to win).

| Tier | Weapon | Projectile | Fire Rate | Speed | Visual |
|------|--------|-----------|-----------|-------|--------|
| 1 | **Seed Spit** | Single small round seed | 3/sec | 300px/s | Small brown circle, arc trajectory |
| 2 | **Egg Shot** | Medium oval egg | 2/sec | 350px/s | White oval with speckle detail |
| 3 | **Feather Darts** | Triple spread (fan of 3) | 2/sec | 400px/s | Small pointed feathers, slight spread angle (±10°) |
| 4 | **Acorn Cannon** | Large acorn, explodes on impact | 1.5/sec | 280px/s | Brown acorn shape; on hit, spawns 4 shrapnel fragments that damage adjacent area |
| 5 | **Wind Gust** | Wide short-range wave | 1/sec | 200px/s | Translucent arc spanning 120° vertical, 100px range; pushes pipe fragments |
| 6 | **Sonic Screech** | Horizontal beam | 0.5/sec | Instant | Full-width yellow/white beam, 40px tall; destroys ALL pipes it touches |
| 7 | **Lightning Bolt** | Chain lightning | 0.7/sec | Instant | Jagged bolt to nearest pipe; chains to one more pipe within 120px |
| 8 | **Phoenix Fire** | Fireball | 0.5/sec | 250px/s | Large orange/red fireball; explodes in 80px radius on impact, screen shake, destroys pipe section |

---

## Pipe Health & Destruction

### Health System
- Standard pipes have **1 HP** (most weapons destroy in one hit).
- Starting at tier 4, **reinforced pipes** (steel-colored, 2 HP) begin spawning with 30% chance, increasing to 50% by tier 8.
- Reinforced pipes show a **crack** after taking 1 damage.

### Destruction Effects
- **Pipe shatter**: Pipe section breaks into 6–10 rectangular fragments that fly outward with physics (gravity + initial velocity), then fade.
- **Gap creation**: When a pipe is destroyed, the gap opens to full canvas height at that pipe's x-position — the bird can fly through safely.
- **Debris particles**: Small dust/rubble particles at impact point.
- **Screen flash**: Brief white flash (50ms) on explosion weapons (tiers 4, 6, 8).

### Partial Destruction
- Destroying only the top pipe section removes the top obstacle (bottom remains).
- Destroying only the bottom pipe section removes the bottom obstacle (top remains).
- Projectiles that hit the top pipe damage the top; projectiles that hit the bottom pipe damage the bottom.
- If both sections are destroyed, the pipe is fully cleared.

---

## Game Flow

### Mode Selection
Add a **mode selector** to the start screen overlay:
- "Classic" — original Flappy Bird (default)
- "Gun Game" — new weapon mode

The selector is two buttons rendered on canvas in the start overlay, toggled before the game starts.

### Gun Game Start
1. Game starts at **Tier 1 (Seed Spit)**.
2. The current weapon name and tier (e.g., "Tier 1/8 — Seed Spit") is displayed in the HUD.
3. A small **progress bar** below the tier label shows destroys toward the next tier (0/3, 1/3, 2/3).
4. The bird has a small weapon indicator drawn on its body (changes per tier).

### Tier Advancement
1. When 3 pipes are destroyed, trigger **tier-up**:
   - Flash the weapon name on screen (large text, fade out over 1 second).
   - Play an ascending chime sound (procedural — pitch increases with tier).
   - Brief invincibility flash (0.5 seconds, bird blinks).
   - Reset destroy counter to 0.
2. Difficulty increases slightly each tier:
   - Pipe speed: `190 + (tier - 1) * 10` px/sec (190 → 260).
   - Pipe gap: `150 - (tier - 1) * 5` px (150 → 115).
   - Pipe spawn interval: `1400 - (tier - 1) * 50` ms (1400 → 1050).

### Death Penalty
- On death, the player is **demoted one tier** (minimum tier 1).
- Destroy progress within the current tier resets to 0.
- Display "Demoted! Tier X" message.
- The game restarts (bird resets, pipes clear) but the tier is preserved.

### Victory
- When tier 8 is completed (3rd destroy with Phoenix Fire), trigger victory:
  - All remaining pipes explode simultaneously.
  - "VICTORY" text with golden glow, particle shower.
  - Total score displayed (pipes passed + pipes destroyed × 2).
  - Fanfare sound (extended version of the high-score jingle).
  - Victory saved to localStorage (`flappyGunGameWins`).

---

## Projectile System

### Data Structure
```javascript
const projectiles = [];

// Each projectile:
{
  x: Number,          // position
  y: Number,
  vx: Number,         // velocity
  vy: Number,
  type: String,        // weapon tier name
  damage: Number,      // HP damage dealt
  radius: Number,      // collision radius
  lifetime: Number,    // seconds remaining before despawn
  piercing: false,     // if true, doesn't despawn on hit
  explosive: false,    // if true, spawns explosion on hit
  explosionRadius: 0,  // radius of explosion damage
}
```

### Update Logic
Each frame:
1. Move all projectiles by their velocity × deltaSeconds.
2. Apply gravity to projectiles with arc trajectory (seed spit: `vy += 400 * dt`).
3. Check collision against all pipe sections (top and bottom separately).
4. On hit: apply damage, spawn hit particles, remove projectile (unless piercing).
5. Remove off-screen or expired projectiles.

### Collision Detection (Projectile vs Pipe)
```javascript
// Circle (projectile) vs Rectangle (pipe section)
function projectileHitsPipe(proj, pipe) {
  // Check against top section: rect(pipe.x, 0, pipeWidth, pipe.top)
  // Check against bottom section: rect(pipe.x, pipe.top + gap, pipeWidth, canvasH - pipe.top - gap)
  // Return { hit: bool, section: 'top' | 'bottom' }
}
```

---

## HUD & UI Changes

### Gun Game HUD (drawn on canvas)
- **Top-left**: Tier indicator — "TIER 1/8" with weapon icon.
- **Top-center**: Score (pipes passed + destroy bonus).
- **Top-right**: Destroy progress — 3 small circles (filled = destroy earned).
- **Weapon name**: Small text below tier, e.g., "Seed Spit".
- **Ammo/cooldown**: Small cooldown bar below the weapon name showing time until next shot is available.

### Start Overlay Modifications
- Add mode selection buttons: "Classic" and "Gun Game".
- Gun Game button has a small crosshair icon.
- Selected mode is highlighted.

### Game Over Overlay (Gun Game)
- Show: "Game Over — Demoted to Tier X" or "VICTORY!" if won.
- Show total score, pipes destroyed, highest tier reached.
- "Tap to retry" (preserves tier on demotion) or "Tap to play again" (on victory, resets to tier 1).

---

## Audio (Procedural — No External Files)

New sounds to add to `audio.js`:

| Sound | Trigger | Description |
|-------|---------|-------------|
| `shoot` | Player fires | Short percussive pop/thwack, pitch varies by tier (higher tiers = deeper/louder) |
| `pipeHit` | Projectile hits pipe | Metallic clang + crumble noise |
| `pipeDestroy` | Pipe HP reaches 0 | Satisfying shatter — noise burst + descending tone |
| `tierUp` | Advance to next tier | Ascending 4-note fanfare, pitch base increases per tier |
| `tierDown` | Demoted on death | Descending 2-note minor interval |
| `victory` | Complete all 8 tiers | Extended celebratory fanfare (8 notes ascending, octave shimmer) |

All sounds are procedurally generated using the existing Web Audio API pattern (oscillators + noise + envelopes).

---

## Rendering (Procedural Canvas 2D)

### Projectile Drawing
Each weapon tier has a unique `drawProjectile(ctx, proj)` function:
- **Seed**: Small brown filled circle (r=3) with darker outline.
- **Egg**: White oval (6×8) with tan speckles.
- **Feather Darts**: Elongated triangle rotated to velocity direction, white with colored tip.
- **Acorn**: Rounded rectangle body (brown) + cap (darker brown).
- **Wind Gust**: Translucent white arc, sine-wave edge distortion.
- **Sonic Screech**: Horizontal gradient band, yellow→white→yellow, with jagged edges.
- **Lightning**: Segmented jagged line from bird to target, white core with blue glow.
- **Phoenix Fire**: Circle with radial gradient (white center → orange → red edge), trailing ember particles.

### Weapon Indicator on Bird
A small icon drawn on/near the bird body per tier:
- Tiers 1–2: Small beak modification (beak opens wider, seed/egg visible in beak).
- Tiers 3–4: Small wing-mounted launcher detail.
- Tiers 5–6: Glowing aura around bird (wind/sonic energy).
- Tiers 7–8: Fiery/electric corona effect around bird body.

### Pipe Destruction Animation
1. Pipe section splits into rectangular fragments (6–10 pieces).
2. Fragments have initial outward velocity + gravity.
3. Fragments rotate and fade over 1 second.
4. Small dust particle cloud at break point (8–12 tiny circles, fast fade).
5. For explosive weapons, add expanding ring (circle outline that grows and fades).

---

## File Changes

### `flappy-bird/script.js` — Main Modifications

1. **New state variables**:
   - `gameMode`: `'classic'` or `'gunGame'`
   - `gunState`: `{ tier, destroys, cooldown, projectiles, pipeFragments }`
   - `weaponDefs[]`: Array of 8 weapon tier definitions (fire rate, speed, damage, etc.)

2. **New functions**:
   - `shoot()` — Create projectile(s) based on current weapon tier.
   - `updateProjectiles(dt)` — Move, collide, despawn projectiles.
   - `damagePipe(pipe, section, damage)` — Apply damage, check destruction.
   - `destroyPipeSection(pipe, section)` — Spawn fragments, increment destroys.
   - `advanceTier()` / `demoteTier()` — Handle tier progression.
   - `drawProjectiles()` — Render all active projectiles.
   - `drawPipeFragments()` — Render destruction debris.
   - `drawGunHUD()` — Render tier, progress, cooldown UI.
   - `drawModeSelect()` — Render mode selection on start overlay.
   - `drawVictory()` — Render victory screen.

3. **Modified functions**:
   - `update()` — Add projectile update loop and gun game logic (when mode is gun game).
   - `draw()` — Add projectile, fragment, and HUD rendering (when mode is gun game).
   - `resetGame()` — Handle gun game reset (preserve tier on demotion, full reset on victory replay).
   - `spawnPipe()` — Add HP property and reinforced pipe chance (when mode is gun game).
   - `flap()` — Route input based on mode and input source.
   - Event listeners — Add shoot key (F/Enter) and split touch zones.

4. **Pipe object extension** (gun game only):
   ```javascript
   pipe.topHP = 1;       // or 2 for reinforced
   pipe.bottomHP = 1;    // or 2 for reinforced
   pipe.reinforced = false;
   pipe.topDestroyed = false;
   pipe.bottomDestroyed = false;
   ```

### `flappy-bird/audio.js` — New Sounds
- Add `shoot()`, `pipeHit()`, `pipeDestroy()`, `tierUp()`, `tierDown()`, `victory()` functions.
- Follow existing pattern: oscillator + gain envelope + optional filter.

### `flappy-bird/index.html` — No Changes Expected
- All UI is canvas-rendered; no HTML changes needed.

### `flappy-bird/style.css` — No Changes Expected
- Canvas handles all game rendering.

---

## Implementation Order

| Step | Task | Dependencies |
|------|------|-------------|
| 1 | Add mode selection state and start screen UI | None |
| 2 | Add weapon tier definitions and gun game state | Step 1 |
| 3 | Implement projectile data structure and update loop | Step 2 |
| 4 | Implement projectile-vs-pipe collision detection | Step 3 |
| 5 | Add pipe HP system and destruction logic | Step 4 |
| 6 | Draw projectiles (all 8 types) | Step 3 |
| 7 | Draw pipe destruction fragments and effects | Step 5 |
| 8 | Implement tier advancement and demotion | Step 5 |
| 9 | Draw Gun Game HUD (tier, progress, cooldown) | Step 8 |
| 10 | Add shoot input handling (keyboard + touch split) | Step 3 |
| 11 | Add difficulty scaling per tier | Step 8 |
| 12 | Implement reinforced pipes (spawning + rendering) | Step 5 |
| 13 | Add all new audio (shoot, hit, destroy, tier up/down, victory) | Step 8 |
| 14 | Implement victory condition and victory screen | Step 8 |
| 15 | Add weapon indicator on bird per tier | Step 2 |
| 16 | Polish: screen shake on explosions, invincibility flash, particles | Steps 6–14 |
| 17 | Persistence: save gun game wins and best tier to localStorage | Step 14 |

---

## Design Principles

- **No external assets** — all visuals and audio remain procedural Canvas 2D and Web Audio API.
- **Classic mode untouched** — all gun game code is gated behind `gameMode === 'gunGame'` checks. The original game works exactly as before.
- **Performance** — limit active projectiles (max 10), fragments (max 40), and particle counts. Clean up off-screen objects aggressively.
- **Mobile-friendly** — touch split zones are large enough for comfortable play. Visual weapon name helps players know what they have without reading small text.
- **Fair difficulty curve** — early weapons are forgiving (fast fire rate, easy to aim). Later weapons are powerful but slower, requiring skill to time shots while navigating pipes.

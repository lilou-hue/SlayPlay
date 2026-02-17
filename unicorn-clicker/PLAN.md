# Unicorn Fart Clicker — Game Plan

## Overview

A clicker/idle game where players tap a majestic unicorn to make it fart rainbow clouds, earning "Sparkle Points" (SP). Accumulated SP can be spent on upgrades that increase fart output, unlock auto-fart helpers, and transform the unicorn into increasingly absurd evolved forms. The game follows the conventions of the existing arcade: vanilla JS, Canvas 2D rendering, procedural audio via Web Audio API, no external assets.

---

## Directory Structure

```
unicorn-clicker/
├── index.html   — Page shell, layout, UI overlay (score, shop button, etc.)
├── game.js      — All game logic, rendering, state, save/load
├── audio.js     — Procedural fart sounds and jingles via Web Audio API
└── styles.css   — Dark/pastel theme styling
```

---

## Core Mechanics

### 1. Clicking / Tapping

- Tap the unicorn to trigger a fart.
- Each fart produces a rainbow gas cloud that drifts upward and fades.
- Each tap earns **base SP** (starts at 1, increased by upgrades).
- The unicorn plays a short procedural fart sound on every tap.
- A brief squash-and-stretch animation plays on the unicorn (it crouches then bounces up).

### 2. Currency — Sparkle Points (SP)

- Displayed prominently at the top of the screen.
- SP per tap = `basePower * tapMultiplier`.
- SP per second (idle) = sum of all auto-farter rates.
- Total lifetime SP tracked separately for milestone unlocks.

### 3. Upgrades (Shop)

Purchased with SP. Each upgrade has escalating cost (`baseCost * 1.15^level`).

| Upgrade | Effect | Base Cost |
|---|---|---|
| **Beefy Beans** | +1 SP per tap | 10 SP |
| **Glitter Gut** | x2 tap multiplier (stacks additively) | 100 SP |
| **Auto-Poot Fairy** | +1 SP/sec passive income | 50 SP |
| **Rainbow Turbo** | +5 SP/sec passive income | 500 SP |
| **Golden Hay** | +20 SP/sec passive income | 2,500 SP |
| **Cloud Compressor** | All tap values x2 (milestone, one-time) | 10,000 SP |
| **Unicorn Evolution** | Evolve to next visual form (see below) | Varies |

### 4. Unicorn Evolutions

Visual transformations unlocked at SP milestones. Each evolution changes the procedurally-drawn unicorn:

| Stage | Name | Lifetime SP | Visual Change |
|---|---|---|---|
| 0 | Baby Unicorn | 0 | Small, simple, pastel pink body |
| 1 | Sparkle Pony | 500 | Bigger, rainbow mane, glitter particles |
| 2 | Majestic Stallion | 5,000 | Muscular, flowing mane, wings appear |
| 3 | Cosmic Unicorn | 50,000 | Starfield body, glowing horn, galaxy mane |
| 4 | Fart God | 500,000 | Enormous, throne of clouds, constant rainbow aura |

### 5. Fart Particles & Effects

- Each click spawns 5–15 rainbow gas particles behind the unicorn.
- Particles are ellipses with randomized hue (full rainbow spectrum), slight transparency.
- They drift upward/outward with noise-based wobble, shrink, then fade.
- At higher evolution stages, particles become more elaborate (sparkles, stars, small rainbows).
- Screen shake (subtle, 2–3px) on tap for juice.

---

## Visual Design

### Canvas Layout (480x640)

```
┌──────────────────────────────┐
│  ✨ 1,234 Sparkle Points ✨  │  ← Score display
│       +5 per tap              │  ← Rate display
│       +12 per sec             │
│                               │
│                               │
│     🦄 [UNICORN]  💨🌈       │  ← Tappable unicorn + fart cloud
│                               │
│                               │
│  ┌─ ground / meadow ───────┐ │  ← Procedural grass, flowers
│                               │
│  [🛒 Shop]    [⭐ Evolve]   │  ← Bottom buttons
└──────────────────────────────┘
```

### Color Palette

- **Background**: Gradient from soft purple (#2d1b69) to dark indigo (#0f0a2a)
- **Grass/Ground**: Vibrant green with procedural flowers
- **Unicorn body**: White/pink with pastel shading
- **Horn**: Golden gradient with sparkle
- **Mane/Tail**: Rainbow gradient (animated hue shift)
- **Fart clouds**: Full HSL rainbow spectrum, semi-transparent
- **UI accents**: Gold (#ffd700), soft pink (#ff69b4), white

### Procedural Unicorn Drawing

The unicorn is drawn entirely with Canvas arcs, bezier curves, and gradients:

- **Body**: Large ellipse, white-to-pink radial gradient
- **Legs**: Four simple rectangles with rounded ends
- **Head**: Smaller ellipse offset upward
- **Horn**: Triangle with golden gradient and sparkle highlight
- **Mane**: Series of overlapping bezier curves, each a different rainbow hue
- **Tail**: Flowing bezier curves from the rear, rainbow colored
- **Eye**: White circle with large black pupil, highlight dot
- **Tap animation**: Squash on frame 1 (widen body, shorten legs), stretch on frames 2–5 (tall body, long legs), settle back

---

## Audio Design (Web Audio API)

All sounds are procedurally generated, consistent with the other games in the arcade.

### Fart Sound

- Brown/pink noise burst, 100–200ms duration
- Pitch envelope: start low (~80 Hz), sweep down to ~40 Hz
- Bandpass filter with resonance for "wetness" variation
- Randomize pitch, duration, and filter Q on each tap for variety
- Higher evolution stages add harmonic overtones (more musical farts)

### Purchase Jingle

- Short ascending arpeggio (3 notes, sine wave)
- Bright, sparkly character

### Evolution Fanfare

- Longer ascending arpeggio with reverb/delay
- Shimmer effect (high-frequency noise burst + sine chord)

### Ambient

- Soft, low pad tone in background (optional, togglable)
- Gentle sparkle sounds at random intervals when auto-farters are active

---

## State Management & Persistence

### Game State Object

```js
const state = {
  sp: 0,                    // Current Sparkle Points
  lifetimeSP: 0,            // Total SP ever earned
  tapPower: 1,              // Base SP per tap
  tapMultiplier: 1,         // Multiplier on tap power
  spPerSec: 0,              // Passive SP per second
  evolution: 0,             // Current unicorn evolution stage (0-4)
  upgrades: {
    beefyBeans: 0,
    glitterGut: 0,
    autoFairy: 0,
    rainbowTurbo: 0,
    goldenHay: 0,
    cloudCompressor: false,
  },
  totalClicks: 0,
  startTime: Date.now(),
};
```

### Save/Load

- Auto-save to `localStorage` every 30 seconds under key `unicornClickerSave`.
- Save on page unload (`beforeunload` event).
- Load on game start; validate data integrity.
- Offline progress: on load, calculate elapsed time and grant `spPerSec * elapsedSeconds` (capped at 8 hours).

---

## Game Loop

```
requestAnimationFrame loop:
  1. Calculate deltaTime
  2. Accumulate passive SP (spPerSec * dt)
  3. Update particle system (move, fade, remove dead)
  4. Update unicorn animation (idle bob, tap reaction)
  5. Update floating score text animations (+N popups)
  6. Draw background (gradient sky, stars/sparkles)
  7. Draw ground (grass, flowers)
  8. Draw unicorn (current evolution)
  9. Draw fart particles
  10. Draw UI overlay (score, rates, buttons)
  11. Draw shop panel if open
```

---

## UI / Interaction

### Click/Tap Handling

- Canvas click detection: check if tap is within unicorn hitbox (generous circular area).
- Tapping anywhere on the unicorn triggers fart + SP gain.
- Floating "+N SP" text pops up at tap location, drifts up, fades.

### Shop Panel

- Slides up from bottom when shop button is tapped.
- Lists all upgrades with name, current level, cost, and effect description.
- Affordable upgrades highlighted; unaffordable ones grayed out.
- Tap an upgrade to purchase. Play purchase jingle.
- Close button or tap outside to dismiss.

### Evolution Button

- Appears when lifetime SP reaches the next evolution threshold.
- Glows/pulses to draw attention.
- Triggers evolution fanfare and a burst of rainbow particles.
- Unicorn morphs to new form with a brief transition animation.

---

## Arcade Hub Integration

### Card on index.html

- New game card added to the `.games-grid` in the root `index.html`.
- Preview canvas with animated mini-unicorn bobbing and occasional fart puffs.
- Tag: "Idle" with pink/gold theme colors.

### CSS Classes

```css
.unicorn-preview {
  background: linear-gradient(180deg, #2d1b69, #1a0f40, #0f0a2a);
}
.unicorn-tag {
  background: rgba(255,105,180,0.15);
  color: #ff69b4;
  border: 1px solid rgba(255,105,180,0.3);
}
```

---

## Implementation Order

1. **Scaffold**: Create `unicorn-clicker/` directory with `index.html`, `game.js`, `audio.js`, `styles.css`
2. **Canvas setup & game loop**: Background rendering, deltaTime, requestAnimationFrame
3. **Unicorn drawing**: Stage 0 (Baby Unicorn) procedural drawing with idle animation
4. **Click handling**: Tap detection, SP counter, floating text popups
5. **Fart particles**: Rainbow cloud particle system on tap
6. **Fart audio**: Procedural fart sound via Web Audio API
7. **Shop system**: Upgrade data, cost scaling, purchase logic, shop UI panel
8. **Passive income**: Auto-farter accumulation in game loop
9. **Evolutions**: All 5 unicorn visual stages, evolution trigger, fanfare
10. **Save/Load**: localStorage persistence, offline progress
11. **Polish**: Screen shake, particle improvements per evolution, ambient audio
12. **Hub integration**: Add card + animated preview to root `index.html`

# Lumina - Deep Radiance

## Game Concept

**Lumina** is a vertical-descent arcade game focused on advanced canvas graphics techniques. The player controls a luminous crystal entity descending through an infinite procedurally-generated cavern shrouded in darkness. The world is only visible where light reaches -- the player's own radiance reveals the cave walls, crystal formations, and lurking shadow creatures.

The central visual hook: **dynamic lighting in a dark world**. Every visual element interacts with the lighting system -- crystals refract and glow, particles drift through light beams, cave walls emerge from shadow, and predatory shadow creatures retreat from brightness.

---

## Visual Identity

- **Theme:** Crystalline underground cavern bathed in darkness
- **Palette:** Rich, saturated colors against pure black -- shifting through depth zones
- **Mood:** Mysterious, meditative, and visually mesmerizing
- **Canvas Size:** 480x720 pixels (portrait orientation, optimized for mobile aspect ratio)

---

## Core Gameplay

### Controls
- **Left/Right Arrow Keys (or A/D):** Move horizontally
- **Space / Click / Tap:** Pulse -- brief burst of extra light radius + slight upward boost
- **Escape:** Pause/Unpause

### Mechanics
1. **Auto-Descent:** Camera scrolls downward at a steady rate (increasing with score)
2. **Horizontal Movement:** Player moves freely left/right within cave bounds
3. **Pulse Ability:** Space/Click creates a light nova, briefly expanding light radius 2x and giving a small upward push. Costs light energy; 1-second cooldown.
4. **Light Energy:** Player's light radius shrinks slowly over time. Collecting shards restores it. Minimum radius is maintained (player is never totally dark).
5. **Shard Collection:** Prismatic shards scattered throughout the cave. Touching one: +1 score, restores light energy, burst of particles.
6. **Obstacles:** Crystal spike formations protrude from cave walls. Collision = game over with screen shake + shatter effect.
7. **Shadow Creatures:** Dark entities with glowing eyes that patrol sections of the cave. They flee when the player's light is strong but approach aggressively when light is dim. Contact = game over.
8. **Depth Zones:** Every 40 points, the color palette transitions smoothly to a new zone theme.

### Difficulty Scaling
- Descent speed: `baseSpeed + score * 0.8`, capped at 280 px/s
- Cave width: gradually narrows from 380px to 220px
- Crystal spike density: increases with depth
- Shadow creature frequency: more frequent in deeper zones
- Light drain rate: increases subtly with depth

---

## Depth Zones (5 Zones)

| Zone | Depth (Score) | Name | Crystal Color | Ambient Color | Wall Color |
|------|--------------|------|---------------|---------------|------------|
| 1 | 0-39 | Sapphire Grotto | #4dc9f6 (cyan) | #1a3a5c | #2a4a6a |
| 2 | 40-79 | Amethyst Depths | #b44dff (purple) | #3a1a5c | #4a2a6a |
| 3 | 80-119 | Emerald Abyss | #4dff88 (green) | #1a5c3a | #2a6a4a |
| 4 | 120-159 | Molten Core | #ff8844 (amber) | #5c3a1a | #6a4a2a |
| 5 | 160+ | Void Heart | #ff4d6a (crimson) | #5c1a2a | #6a2a3a |

Zone transitions: lerp all colors over 10 depth-points for smooth blending.

---

## Graphics Techniques (12 Major Systems)

### 1. Dynamic Radial Lighting System
- **Method:** Render entire scene to main canvas, then apply a darkness overlay using `globalCompositeOperation = 'destination-in'` with a radial gradient mask centered on the player.
- **Player Light:** Large radial gradient (radius = `lightRadius`, 80-200px). Center is fully opaque white, fading to transparent at edges.
- **Shard Lights:** Each uncollected shard emits a small radial light (radius 30-50px) with its zone color.
- **Multiple Light Sources:** All light sources are painted to an offscreen "light map" canvas, then composited with the scene.
- **Light Map Pipeline:**
  1. Draw full scene to `sceneCanvas` (offscreen)
  2. Draw all light sources as radial gradients to `lightCanvas` (offscreen, black background)
  3. Copy `sceneCanvas` to main canvas
  4. Set `globalCompositeOperation = 'destination-in'`
  5. Draw `lightCanvas` onto main canvas (this masks the scene to only lit areas)
  6. Optionally add `globalCompositeOperation = 'lighter'` pass for bloom

### 2. Bloom / Glow Post-Processing
- After main render, extract bright pixels by rendering light sources again with additive blending (`globalCompositeOperation = 'lighter'`).
- Apply a soft glow by drawing each light source at 1.5x size with 0.15 alpha.
- Layer multiple glow passes for rich bloom effect.

### 3. Procedural Cave Generation
- Use a seeded pseudo-random noise function to generate organic cave wall boundaries.
- Two boundary curves: `leftWall(y)` and `rightWall(y)`.
- Each generated as a sum of sine waves at different frequencies:
  ```
  wall(y) = base + A1*sin(y*f1 + phase1) + A2*sin(y*f2 + phase2) + A3*sin(y*f3 + phase3)
  ```
- Cave width = `rightWall - leftWall`, constrained to min/max values.
- Walls are rendered as filled shapes with gradient coloring (zone-dependent).
- Wall surface has subtle bump texture using small-amplitude high-frequency noise.

### 4. Crystal Formation Rendering
- Crystals are procedural geometric shapes: elongated hexagons, pointed shards, and cluster formations.
- Each crystal has:
  - **Faceted fill:** Linear gradient across the crystal body with zone colors.
  - **Edge highlight:** Bright white/light stroke on upper-left edges (simulates light catching facets).
  - **Internal glow:** Small radial gradient at center with additive blending.
  - **Sparkle particles:** 2-3 tiny bright dots that flicker (alpha oscillation).
- Crystals protrude from cave walls at random angles.
- Generated per-segment as the cave scrolls.

### 5. Particle Systems (6 Types)
All particle types share a base structure: `{x, y, vx, vy, life, maxLife, size, color, alpha}`.

| Type | Count | Behavior | Visual |
|------|-------|----------|--------|
| **Ambient Dust** | 20-30 | Drift slowly, affected by slight air current | Tiny white dots, low alpha, sin-wave wobble |
| **Crystal Sparkle** | 2-3 per crystal | Orbit near parent crystal, twinkle | Bright zone-color dots, alpha pulse |
| **Player Trail** | Emit every frame | Spawn at player center, fade out behind | Zone-colored circles, shrinking + fading |
| **Pulse Nova** | 30-50 on pulse | Burst radially from player | Bright white/yellow, fast expansion, quick fade |
| **Collection Burst** | 15-20 on shard collect | Burst from shard position toward player | Prismatic rainbow colors, arc toward player |
| **Shadow Wisps** | 3-5 per creature | Orbit shadow creature, dark tendrils | Dark purple/black, slow sinusoidal drift |

### 6. Shadow Creature Rendering
- Amorphous dark shapes rendered with multiple layered radial gradients (dark center, slightly less dark edges).
- Two glowing eyes: small bright circles (red/amber based on zone) with bloom.
- Wisp particles orbiting the body.
- Movement: patrol horizontally within the cave width. When player light is strong (>120 radius), creatures drift away. When light is dim (<80 radius), they accelerate toward the player.
- Rendered with low-alpha dark overlay that "absorbs" light near them (achieved by drawing a dark radial gradient on the light map with `destination-out`).

### 7. Parallax Background Layers
Three depth layers behind the cave:
1. **Far Layer (0.2x speed):** Distant faint crystal clusters and faint nebula-like color patches.
2. **Mid Layer (0.5x speed):** Medium stalactites/stalagmites silhouettes, dim crystal formations.
3. **Near Layer (0.8x speed):** Close rock detail, bright crystal edges, particle density.

Each layer is rendered with decreasing alpha/saturation for depth perception.

### 8. Screen-Space Post Effects
- **Vignette:** Dark radial gradient overlay (darkest at corners/edges, transparent at center). Applied as final pass.
- **Chromatic Aberration:** On collision/death, offset R, G, B channels by 2-3px in different directions for a brief glitch effect.
- **Screen Shake:** On collision events. Offset canvas rendering by random dx/dy for a few frames, decaying exponentially.
- **Time Dilation:** On pulse activation, slow descent speed to 0.3x for 200ms, then ease back to normal.

### 9. Player Entity Rendering
- Core shape: Rounded diamond/crystal form (4-point star with rounded vertices).
- Layered rendering:
  1. Outer glow: Large radial gradient, zone color, low alpha.
  2. Mid body: Slightly smaller gradient, brighter.
  3. Core: Small bright white center.
  4. Facet lines: Thin white lines from center to each point, 0.3 alpha (crystal facet look).
- Subtle rotation oscillation: `sin(time * 2) * 0.1` radians.
- Pulse animation: On pulse, core rapidly expands then contracts (scale 1.0 → 1.8 → 1.0 over 300ms).

### 10. Light Shard Rendering
- Shape: Small rotating diamond (4 points).
- Rotation: Continuous spin at 2 rad/s.
- Fill: Radial gradient, bright zone color center to transparent edge.
- Particle emission: 1-2 tiny sparkle particles per frame.
- Bob animation: `sin(time * 3 + offset) * 4px` vertical oscillation.
- On collection: Burst into 15 particles, scale up to 2x over 100ms, then vanish.

### 11. Procedural Color Palette System
- All colors are derived from the current zone's palette.
- Zone transitions: When score crosses a zone boundary, target palette is set and all colors lerp toward it over 10 score-points worth of descent.
- HSL interpolation for perceptually smooth transitions.
- Palette affects: cave walls, crystals, particles, ambient light, player glow tint, background layers, HUD accent color.

### 12. Cave Wall Detail Rendering
- Walls are not flat-filled but textured:
  - Base fill: Zone wall color.
  - Surface bumps: Small triangle protrusions along the wall edge, randomly placed.
  - Moss/crystal veins: Thin colored lines drawn along the wall surface with slight perpendicular offset.
  - Light interaction: Wall areas near the player's light have a brighter tint (achieved by drawing a subtle bright gradient on the wall near the light source).

---

## Audio System (Procedural, Web Audio API)

All sounds synthesized in real-time with no external files.

| Sound | Synthesis | Trigger |
|-------|-----------|---------|
| **Pulse** | Sine sweep 300→800Hz, 200ms, gain envelope attack/release | Space press |
| **Collect Shard** | 3-note ascending arpeggio (sine), 100ms per note | Shard pickup |
| **Crystal Hit** | White noise burst (80ms) + descending sine (400→100Hz, 300ms) | Collision with crystal |
| **Shadow Touch** | Low sawtooth drone (80Hz) + high noise burst | Shadow creature contact |
| **Zone Transition** | 5-note ascending scale, each note 150ms, reverb tail | Zone boundary crossed |
| **Ambient Drone** | Continuous low sine (55Hz) with slow LFO (0.5Hz) on gain, zone-dependent pitch | Always playing |
| **Light Warning** | Amplitude-modulated square wave (200Hz), pulsing faster as light dims | Light below 40% |

### Haptic Feedback Patterns
- Pulse: [50, 30, 80] ms
- Collect Shard: 25ms single tick
- Collision: [150, 50, 150, 50, 200] ms heavy
- Zone Transition: [30, 20, 30, 20, 30, 20, 30] ms stutter
- Light Warning: [20, 80] ms repeating

---

## Game State Machine

```
MENU → (Space/Click) → PLAYING → (Escape) → PAUSED → (Escape) → PLAYING
                           ↓                                        ↓
                      (collision)                              (collision)
                           ↓                                        ↓
                       DYING (400ms animation) → GAME_OVER → (Space/Click) → MENU
```

### MENU State
- Player entity hovers at screen center with idle animation.
- Cave scrolls slowly in background (demo mode).
- Title "LUMINA" rendered with bloom effect.
- "Press Space or Tap to Begin" text with fade pulse.

### PLAYING State
- Full game loop active.
- All input processed.
- Descent speed active.

### PAUSED State
- Game loop frozen (no updates, still renders last frame).
- Semi-transparent overlay with "PAUSED" text.
- "Press Escape to Resume" text.

### DYING State
- 400ms death animation:
  - Player shatters into 50+ particles.
  - Screen shake intensifies.
  - Chromatic aberration effect.
  - Time slows to 0.1x.
  - Light expands to 2x then rapidly collapses to 0.
- Transitions automatically to GAME_OVER.

### GAME_OVER State
- Darkness with score display rendered with glow.
- "Score: X" and "Best: Y" with zone-colored text.
- "Press Space or Tap to Restart" text.
- Depth zone reached displayed.

---

## HUD Design (Below Canvas)

```
┌─────────────────────────────┐
│         ← Back to Games     │
│            LUMINA            │
│  Arrow keys to move. Space  │
│       to pulse light.       │
├─────────────────────────────┤
│         [CANVAS]            │
├─────────────────────────────┤
│ Depth: 000 │ Best: 000 │🔊│↻│
└─────────────────────────────┘
│  Tip: Collect shards to     │
│  keep your light alive.     │
```

---

## File Structure

```
lumina/
├── index.html    — HTML with canvas, HUD, styling link
├── styles.css    — Dark crystalline theme (glassmorphism HUD)
├── game.js       — Complete game (~1800-2200 lines)
└── PLAN.md       — This file
```

---

## Implementation Phases

### Phase 1: Core Engine
- Canvas setup and game loop (requestAnimationFrame + delta-time)
- Game state machine (MENU, PLAYING, PAUSED, DYING, GAME_OVER)
- Input handling (keyboard, touch, mouse)
- Player entity with movement physics (horizontal + gravity + pulse)

### Phase 2: Procedural Cave
- Sine-wave based cave wall generation
- Cave segment system (generate ahead, cull behind)
- Cave wall rendering with zone colors
- Cave narrowing with depth

### Phase 3: Game Objects
- Light shard spawning and collection
- Crystal spike obstacles (generation + collision detection)
- Shadow creature AI and rendering
- Score tracking and best score persistence

### Phase 4: Lighting System
- Offscreen canvas pipeline (scene + light map)
- Player radial light with dynamic radius
- Shard mini-lights
- Light map compositing for darkness masking
- Light energy drain and replenishment

### Phase 5: Particle Systems
- Particle base system (spawn, update, draw, recycle)
- All 6 particle types implemented
- Player trail, collection burst, pulse nova, ambient dust, crystal sparkle, shadow wisps

### Phase 6: Visual Polish
- Bloom/glow post-processing passes
- Vignette overlay
- Screen shake system
- Chromatic aberration on death
- Parallax background layers
- Crystal detail rendering (facets, highlights, internal glow)
- Zone transition color lerping

### Phase 7: Audio & Haptics
- Web Audio API context setup
- Procedural sound functions
- Ambient drone
- Haptic feedback patterns
- Mute toggle

### Phase 8: UI & Integration
- Menu screen with title animation
- Game over screen
- HUD panel (HTML elements below canvas)
- Responsive styling
- Add to arcade landing page
- LocalStorage for best score and mute preference

---

## Performance Targets

- **60 FPS** on modern desktop browsers
- **30+ FPS** on mobile devices
- Maximum particles on screen: ~200
- Offscreen canvases: 2 (scene + light map)
- Delta-time clamped at 33ms to prevent physics explosions
- Object pooling for particles (pre-allocated arrays)

---

## Collision Detection

- **Cave walls:** Point-in-polygon test. Player center (px, py) must be between leftWall(py) and rightWall(py) with padding.
- **Crystal spikes:** Circle-to-polygon. Player hit circle (radius 12px) tested against crystal bounding shapes using separating axis theorem (simplified to distance-to-line-segment for performance).
- **Light shards:** Circle-to-circle. Player radius 14px, shard radius 10px.
- **Shadow creatures:** Circle-to-circle. Player radius 14px, creature radius 18px.

---

## Key Constants

```javascript
const CONFIG = {
  CANVAS_W: 480,
  CANVAS_H: 720,

  // Player
  PLAYER_SPEED: 220,        // px/s horizontal
  GRAVITY: 60,              // px/s downward pull (gentle)
  PULSE_FORCE: -120,        // px/s upward on pulse
  PULSE_COOLDOWN: 1.0,      // seconds
  PLAYER_RADIUS: 14,        // collision radius

  // Descent
  BASE_DESCENT: 80,         // px/s starting scroll speed
  MAX_DESCENT: 280,         // px/s cap
  DESCENT_SCALE: 0.8,       // additional px/s per score point

  // Lighting
  LIGHT_RADIUS_MAX: 180,    // px
  LIGHT_RADIUS_MIN: 50,     // px
  LIGHT_DRAIN_RATE: 3,      // px/s shrink rate
  LIGHT_SHARD_RESTORE: 25,  // px restored per shard

  // Cave
  CAVE_BASE_WIDTH: 380,     // px at start
  CAVE_MIN_WIDTH: 220,      // px minimum
  CAVE_NARROW_RATE: 0.4,    // px narrower per score point

  // Spawning
  SHARD_INTERVAL: 120,      // px of vertical distance between shards
  SPIKE_INTERVAL: 200,      // px between crystal spikes
  SHADOW_INTERVAL: 400,     // px between shadow creatures

  // Zones
  ZONE_LENGTH: 40,          // score points per zone
  ZONE_TRANSITION: 10,      // score points for color lerp
};
```

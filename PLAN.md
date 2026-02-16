# Artwork Improvement Plan — All Games

All games use **Canvas 2D procedural drawing** (no sprites/images). Improvements stay within this approach — richer shapes, better shading, more animated detail, stronger visual feedback.

---

## 1. Flappy Bird (`flappy-bird/`)
**Current:** Gradient circles/rectangles. Pleasant but flat.

### Improvements
- **Bird redesign:** Add feather texture lines on body, more detailed wing with 3 feather segments that fan during flap, tail feathers, cheek blush circle, eyebrow that tilts with velocity
- **Pipe detail:** Add mossy vine lines climbing pipes, dripping water droplets (animated), subtle cracks/texture lines on pipe surface, soft ambient occlusion shadow at pipe openings
- **Background depth:** Add distant rolling hills layer (parallax), animated sun/moon with soft glow halo, tree silhouettes on ground layer, floating leaf particles, gradient sky shifts subtly with score (dawn → day → dusk progression)
- **Ground detail:** Add grass blade tufts along top edge (randomized heights), small flowers/mushrooms at intervals
- **Death effect:** Bird tumbles with rotation, feather particles scatter, impact dust puff on ground hit

## 2. Snake (`snake/`)
**Current:** Grid squares with neon glow. Clean but blocky.

### Improvements
- **Snake body:** Rounded segment corners with body curvature (segments connect with smooth arcs), gradient shading per segment (lighter center, darker edge), head gets two glowing dot eyes that look toward the food direction, flickering tongue on head
- **Body animation:** Subtle sine-wave undulation along body segments, eating animation (head briefly enlarges, body segments ripple outward)
- **Food detail:** Normal food gets a gentle spin animation and inner sparkle highlight, golden food gets orbiting mini-particles, speed food gets motion-blur streaks
- **Arena floor:** Subtle grid-line pattern (faint lines at cell boundaries), dark radial vignette toward corners, ambient floating dust motes (tiny slow particles)
- **Wall shrink effect:** Walls glow and pulse before shrinking, electric crackle particles along new wall edge
- **Death animation:** Snake segments scatter outward with physics (each segment flies apart), brief flash ring expanding from death point

## 3. Lumina (`lumina/`)
**Current:** Most advanced — offscreen lighting, procedural caves. Improve detail density.

### Improvements
- **Cave walls:** Add texture detail — tiny crack lines drawn along wall surfaces, mineral vein lines (colored lines following wall contour), occasional embedded crystal clusters that glint when lit
- **Water effects:** Dripping water particles from ceiling (fall with gravity, splash on floor), occasional puddle reflections on cave floor (mirrored light shimmer)
- **Player glow:** Add flickering/fluttering quality to light (subtle radius oscillation), light color subtly shifts with zone palette, small orbiting light motes around player
- **Shadow creatures:** More detailed bodies — visible tendrils/tentacles with sine-wave animation, red eyes that track player position, shadow trail behind them
- **Stalactites:** Add surface detail lines (ridges), small dust particles when they shake before falling, impact crack pattern on landing
- **Atmospheric fog:** Layered translucent fog bands that drift slowly across cave, density increases in deeper zones
- **Shard collectibles:** Prismatic rainbow edge highlight, sparkle burst on collection, rotating inner facet pattern

## 4. Methane Drift (`methane-drift/`)
**Current:** Rich particle system and zone colors but shapes are basic circles/rectangles.

### Improvements
- **Glider redesign:** Draw a proper wing shape (tapered body with swept-back fins), fin edges animate subtly with velocity, exhaust/thrust particles from rear when pulsing, shield activation wraps glider in visible bubble
- **Spire obstacles:** Multi-faceted crystal shape (polygon with angled faces instead of rectangle), inner refraction lines, small floating shard fragments orbiting the tip, subtle glow pulse
- **School (fish) obstacles:** Draw proper fish silhouettes — body oval with tail fin, dorsal fin, eye dot, each fish has slight size/color variation, school formation shifts organically with sine offsets
- **Storm obstacles:** Rotating spiral arm pattern (logarithmic spiral lines), inner lightning bolt flashes (brief jagged lines), debris particles orbiting the vortex, darkened area around storm center
- **Geyser obstacles:** Visible vent base with rock texture, eruption column gets turbulent particles (varied sizes, speeds), steam wisps that drift sideways after eruption
- **Boss visual overhaul:** Distinct silhouette per boss type (not all circles) — Leviathan gets tentacle appendages, Titan gets rocky angular body, Colossus gets crystal geometric form, Core Entity gets chaotic morphing shape
- **Background nebulae:** More layered cloud formations with soft edge blending, occasional distant lightning flashes in background, aurora-like color bands that slowly drift

## 5. Game Arcade Hub (`index.html`)
**Current:** Emoji placeholders in gradient boxes for game previews.

### Improvements
- **Animated canvas previews:** Replace static emoji boxes with small live `<canvas>` elements on each game card, each showing a simple animated loop (bird flapping, snake moving, cave scrolling, glider drifting) — lightweight ~30fps idle animations
- **Card hover effects:** On hover, preview animation speeds up or brightens, card border glows with game's accent color
- **Consistent branding:** Each card gets a small icon/logo drawn on canvas matching the game's art style, unified typography and spacing

---

## Implementation Priority

| Priority | Game | Key Change | Effort | Impact |
|----------|------|-----------|--------|--------|
| 1 | Flappy Bird | Bird + pipe + background detail | Medium | High (most recognizable game) |
| 2 | Snake | Rounded snake body + eye + arena detail | Medium | High (biggest visual leap) |
| 3 | Methane Drift | Glider + obstacle shape redesign | Medium-High | Medium (already rich) |
| 4 | Lumina | Cave texture + water + fog | Medium | Medium (already best-looking) |
| 5 | Hub | Animated canvas previews | Low-Medium | Medium (first impression) |

## Principles
- **No external assets** — everything stays procedural Canvas 2D
- **Performance first** — cache complex shapes, limit particle counts, use offscreen canvases where needed
- **Respect reduced-motion** — all new animations check `prefers-reduced-motion`
- **Consistent quality** — bring all 4 games to a similar level of visual polish

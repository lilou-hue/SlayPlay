# Dragon Engineering Lab

A browser-based educational simulation game where you design biologically plausible dragons and test whether they can actually fly, breathe fire, and survive.

## Concept

You are a dragon bioengineer. Adjust 14 anatomical and physiological traits, design a modular fire-breathing system, then run scientific simulations to evaluate your dragon across flight, fire, energy, durability, and survival. Test your design in different habitats and pit it against AI opponents in tactical battles.

Every stat creates tradeoffs. Heavier armor improves durability but kills flight. Bigger fuel glands produce devastating fire but increase blowback risk. More muscle power helps everything — but the energy cost may starve your dragon.

## How to Run

1. Open `index.html` in a modern browser, or
2. Run a simple local server:
   ```
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

No build tools, no dependencies to install. Three.js is loaded from CDN.

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | HTML scaffold and layout |
| `style.css` | Complete dark-mode visual system |
| `data.js` | All tuning constants, configs, presets, science content |
| `dragon.js` | Dragon state model, generators, localStorage |
| `simulation.js` | All formulas: flight, fire, energy, durability, survival |
| `explanations.js` | Plain-language result text generators |
| `scene.js` | Three.js: 3D dragon, lab environment, battle arena |
| `battle.js` | Tick-based combat engine with AI |
| `ui.js` | DOM rendering: sliders, results, tabs, battle UI |
| `tutorial.js` | Interactive onboarding system |
| `main.js` | App initialization and event wiring |

## Core Systems

### 14 Adjustable Traits
Body Mass, Wingspan, Wing Area, Muscle Power, Bone Density, Metabolism, Stomach Capacity, Insulation, Intelligence, Fuel Gland Size, Ignition Efficiency, Scale Thickness, Tail Size, Neck Length.

### Advanced Fire Design Lab
Choose from 6 fuel chemistries, 6 ignition methods, and 7 breath delivery types. Each combination has compatibility ratings that affect output, stability, and blowback risk. Failure modes include misfire, backfire, pressure overload, and corrosive self-damage.

### Simulation Formulas
All formulas use simple weighted sums clamped to 0-100. Example:

```
effectiveLoad = bodyMass×10 + boneDensity×3 + scaleThickness×4 + tailSize×2 + neckLength×1
liftForce = wingArea×8 + wingspan×5 + musclePower×3
liftRatio = clamp(liftForce / effectiveLoad × 50, 0, 100)
```

### Battle System
Tick-based combat (max 40 rounds). Both dragons choose from 12 actions per tick. AI selects actions based on dragon strengths, distance, energy state, and behavior tendencies. Six enemy archetypes with distinct combat styles. Five arena environments with modifiers.

### Classifications
Dragons are classified based on compound rules: Apex Dragon, Sky Striker, Fire Wyrm, Efficient Predator, Endurance Hunter, Grounded Tank, Fragile Glider, Volatile Berserker, Unstable Prototype, Catastrophic Failure, or Balanced Drake.

## Tweaking Balance Values

All tuning constants live in `data.js` under `window.DragonData`:

- `FORMULA_WEIGHTS` — multipliers for every system (flight, fire, energy, durability, survival)
- `HABITATS[x].modifiers` — per-habitat score multipliers
- `CLASSIFICATION_RULES` — threshold conditions for each classification
- `BATTLE_CONFIG.actions` — stamina costs and base damage per action
- `FIRE_COMPATIBILITY` — fuel×ignition efficiency matrix
- `FIRE_DELIVERY_COMPAT` — fuel×delivery compatibility matrix

## Known Simplifications

- Flight formulas use simplified lift ratios, not real aerodynamic equations
- Fire chemistry is biologically inspired but not chemically rigorous
- Energy budget uses relative scores, not actual calorie calculations
- Battle AI uses weighted heuristics, not game-theoretic optimal play
- The 3D dragon is procedurally generated from basic Three.js geometries, not a modeled asset

## Debug Mode

Add `?debug` to the URL to enable console helpers:
- `DEBUG.sim()` — dump current dragon's full simulation
- `DEBUG.presets()` — verify all preset classifications
- `DEBUG.battles()` — run all enemy×arena combinations
- `DEBUG.bounds()` — test 100 random dragons for value range errors

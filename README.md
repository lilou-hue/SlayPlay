# Flappy Bird HP Mode

A lightweight browser Flappy Bird clone where collisions no longer cause immediate death.

## Gameplay changes

- The bird has HP (3 max). You only lose when HP reaches zero.
- Pipe, ceiling, or ground collisions remove 1 HP and trigger brief invulnerability.
- Hearts restore 1 HP and there is an emergency chance to spawn a heart after taking damage.
- Star pickups grant a random powerup:
  - **Shield**: temporary invulnerability.
  - **Slow Time**: pipes and pickups move slower.

## Run locally

Open `index.html` directly or run a static server:

```bash
python3 -m http.server 8000
```

Then browse to <http://localhost:8000>.

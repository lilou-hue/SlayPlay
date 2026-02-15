# Game Arcade

## Overview
A multi-game arcade built with vanilla HTML, CSS, and JavaScript. Features a landing page that lets users choose between games. No build system or backend required.

## Project Architecture
- `index.html` - Landing page with game selection cards
- `flappy-bird/` - Flappy Bird game
  - `index.html` - Game page with canvas and HUD
  - `script.js` - Game logic (physics, rendering, collision detection, scoring)
  - `style.css` - Styling and responsive layout
- `methane-drift/` - Methane Drift game
  - `index.html` - Game page with canvas and HUD panel
  - `game.js` - Game logic (glider physics, obstacles, atmosphere system)
  - `styles.css` - Dark sci-fi themed styling
- Static site served via `serve` on port 5000

## How to Run
The project runs as a static site using `npx serve . -l 5000`.

## Recent Changes
- 2026-02-15: Added landing page with game selection, reorganized Flappy Bird into subfolder, integrated Methane Drift game
- 2026-02-15: Initial setup in Replit environment with static file server on port 5000

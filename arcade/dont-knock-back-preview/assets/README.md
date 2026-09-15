# Artwork and audio

Drop finished files straight into these folders. Nothing needs registering in
code — the game looks for them by name at runtime.

**Run `npm run assets:check` for the current list of what's missing.**
`ASSETS_NEEDED.md` in the project root holds the same list with descriptions.

## Accepted formats

- Images: `.webp` `.png` `.jpg` — tried in that order, so a `.png` can be
  replaced by a `.webp` later with no code change.
- Audio: `.ogg` `.mp3` `.m4a` `.wav`

## What each folder wants

| Folder | Spec |
| --- | --- |
| `backgrounds/` | 16:9, 1920×1080 or larger. Interiors lit by one candle or torch. Corners are darkened in-engine, so don't pre-vignette. |
| `characters/<name>/` | Tall transparent PNGs, bottom-centre anchored, ~900×1600. Keep the head and body in the same position across a character's expressions or they'll jump when the expression switches. One file per expression. |
| `entities/listener/` | Same as characters, but it should never be fully legible. Partial, cropped, too tall for the frame. |
| `cg/` | Full-screen 16:9 illustrations — the big moments. |
| `overlays/` | Full-frame PNGs with transparency, layered over the scene (cracks, damp, moving wallpaper, handprints). |
| `items/` | Inventory objects and document paper. Objects on transparency; paper as a full sheet. |
| `ui/` | Entirely optional textures. Two are used if present: `journal_page` (paper, laid under the notebook) and `dialogue_plate` (paper, card or plaster, laid under the dialogue box). Missing ones are simply not drawn — no placeholder. |
| `audio/music/` | Loopable beds. Used sparingly — most of this game is room sound. |
| `audio/ambient/` | Loopable room tone, wind, water. |
| `audio/sfx/` | One-shots. `knock_wall` is the single most important sound in the game. |

## Optional variants

Two suffixes are picked up automatically, and neither is ever required:

- `<background>_frayed` and `<background>_gone` — the same room redrawn slightly,
  then badly, wrong. Used in place of the plain file once the protagonist is
  coming apart. Same framing, same furniture; change the light, the angle of a
  door, the number of things on a shelf.
- `<cg>_<skintone>` — for the handful of shots where the player's hands or body
  are visible: `blood_mirror_olive`, `blood_mirror_deep`. The plain file is the
  fallback, so supplying only that is completely fine.

## Naming

Lower case, underscores, no spaces: `hallway_night`, `wrong_smile`,
`knock_wall`. Backgrounds are `place_timeofday`. Sprites are named by expression
only, inside the character's own folder.

Adding a file the story doesn't ask for is harmless — `npm run assets:check`
lists those separately so a misspelled filename is easy to spot.

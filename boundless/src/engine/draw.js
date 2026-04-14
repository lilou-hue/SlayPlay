import { CARDS } from '../data/index.js';

// Build the card pool for this week
// Active storylet stage cards get weight 3, ambient weight 1
function buildPool(activeStorylets) {
  const pool = [];

  for (const active of activeStorylets) {
    const card = CARDS[active.id];
    if (!card) continue;
    const stage = card.stages[active.currentStage];
    if (!stage) continue;
    // Add weight-3 card: 3 entries
    pool.push({ ...active, type: 'storylet' });
    pool.push({ ...active, type: 'storylet' });
    pool.push({ ...active, type: 'storylet' });
  }

  // Ambient cards (not already active as storylets)
  const activeIds = new Set(activeStorylets.map((a) => a.id));
  for (const [id, card] of Object.entries(CARDS)) {
    if (card.type !== 'ambient') continue;
    if (activeIds.has(id)) continue;
    pool.push({ id, type: 'ambient' });
  }

  return pool;
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Draw 4 unique card ids from the pool (deduplicated by id first, then shuffle)
export function drawHand(activeStorylets, availableAmbient) {
  const pool = buildPool(activeStorylets);

  // Deduplicate: one entry per card id, preserving weighted probability by counting
  // For a small pool we just deduplicate and rely on order
  const seen = new Set();
  const unique = [];
  for (const entry of shuffle(pool)) {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      unique.push(entry);
    }
  }

  return unique.slice(0, 4);
}

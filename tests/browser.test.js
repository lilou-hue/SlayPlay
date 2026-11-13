'use strict';
/**
 * browser.test.js — Headless Puppeteer integration tests.
 *
 * For the hub (index.html):
 *   1. Loads without uncaught JS errors
 *   2. Arcade.checkStreak() is callable
 *
 * For each registered game page (one Puppeteer page opened per game):
 *   3. Loads without uncaught JS errors
 *   4. window.Arcade is defined (arcade.js loaded and executed)
 *   5. Arcade.onGameOver() returns isNewBest:true when there's no prior best
 *   6. Arcade.onGameOver() returns isNewBest:false when score is below existing best
 *   7. Arcade.createScoreCard() inserts .arc-scorecard into the DOM
 *   8. Dispatching 'arcade-restart' does not produce an uncaught error
 */
const { test, describe, before, after } = require('node:test');
const assert    = require('node:assert');
const puppeteer = require('puppeteer');
const { startServer } = require('./helpers/server');

// Errors expected in a headless / offline context — not bugs
const IGNORED_PATTERNS = [
  /AudioContext/i,
  /AudioScheduledSource/i,
  /Firebase/i,
  /firebaseapp/i,
  /gstatic/i,
  /googletagmanager/i,
  /Could not load audio/i,
  /NotAllowedError/i,
  /play\(\) failed/i,
  /Failed to load resource/i,
  /net::ERR_/i,
  /blocked:client/i,
];

function isIgnored(msg) {
  return IGNORED_PATTERNS.some(p => p.test(msg));
}

// ── Game registry ─────────────────────────────────────────────────────────────
const GAMES = [
  { id: 'art-of-doing-nothing', bestKey: 'artOfDoingNothingBest', score: 300 },
  { id: 'astro-miner',          bestKey: 'astroMinerBest',        score: 1000 },
  { id: 'beat-drop',            bestKey: 'beatDropBest',          score: 1000 },
  { id: 'dress-up',             bestKey: 'dressUpBest',           score: 100 },
  { id: 'flappy-bird',          bestKey: 'flappyBest',            score: 20 },
  { id: 'gravity-garden',       bestKey: 'gravityGardenBest',     score: 100 },
  { id: 'gun-game',             bestKey: 'gunGameBest',           score: 5 },
  { id: 'heart-serve',          bestKey: 'heartServeBest',        score: 40 },
  { id: 'inkognito',            bestKey: 'inkognitoBest',         score: 20 },
  { id: 'last-seen-online',     bestKey: 'lastSeenOnlineBest',    score: 70 },
  { id: 'lumina',               bestKey: 'luminaBest',            score: 20 },
  { id: 'methane-drift',        bestKey: 'methaneDriftBest',      score: 3000 },
  { id: 'neon-pong',            bestKey: 'neonPongBest',          score: 500 },
  { id: 'no-internet',          bestKey: 'a1NoInternetBest',       score: 500 },
  { id: 'phantom-road',         bestKey: 'phantomRoadBest',       score: 1000 },
  { id: 'rivals',               bestKey: 'rivalsBest',            score: 10 },
  { id: 'snake',                bestKey: 'snakeBest',             score: 50 },
  { id: 'stack-tower',          bestKey: 'stackTowerBest',        score: 20 },
  { id: 'star-fury',            bestKey: 'starFuryBest',          score: 2000 },
  { id: 'tetris',               bestKey: 'tetrisBest',            score: 2000 },
  { id: 'unicorn-clicker',      bestKey: null,                    score: 500 },
];

let server, browser, baseUrl;

before(async () => {
  const s = await startServer();
  server  = s.server;
  baseUrl = s.url;

  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
}, { timeout: 30_000 });

after(async () => {
  await browser?.close();
  await new Promise(r => server?.close(r));
});

/** Navigate to a page and wait for arcade.js to expose window.Arcade */
async function openPage(url) {
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', err => {
    if (!isIgnored(err.message)) errors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error' && !isIgnored(msg.text())) {
      errors.push('[console.error] ' + msg.text());
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });

  // Wait for Arcade to be available (it's synchronous in arcade.js, so 5 s is generous)
  try {
    await page.waitForFunction(() => typeof window.Arcade !== 'undefined', { timeout: 5_000 });
  } catch {
    // Captured in the errors array if arcade.js threw; tests will fail descriptively
  }

  return { page, errors };
}

// ── Hub ───────────────────────────────────────────────────────────────────────
describe('index.html (hub)', () => {
  let page, errors;

  before(async () => {
    ({ page, errors } = await openPage(`${baseUrl}/`));
  }, { timeout: 30_000 });

  after(async () => { await page?.close(); });

  test('loads without fatal JS errors', () => {
    assert.deepStrictEqual(errors, [], `Hub errors:\n${errors.join('\n')}`);
  });

  test('Arcade is defined and checkStreak is callable', async () => {
    const ok = await page.evaluate(() => {
      try {
        return typeof window.Arcade !== 'undefined' && typeof Arcade.checkStreak === 'function';
      } catch { return false; }
    });
    assert.ok(ok, 'Arcade.checkStreak not available on hub page');
  });
});

// ── Per-game tests — one page per game ───────────────────────────────────────
describe('Game pages', () => {
  for (const game of GAMES) {
    describe(game.id, () => {
      let page, errors;

      before(async () => {
        ({ page, errors } = await openPage(`${baseUrl}/${game.id}/`));
      }, { timeout: 30_000 });

      after(async () => { await page?.close(); });

      test('loads without fatal JS errors', () => {
        assert.deepStrictEqual(errors, [], `Unexpected errors:\n${errors.join('\n')}`);
      });

      test('window.Arcade is defined', async () => {
        const defined = await page.evaluate(() => typeof window.Arcade !== 'undefined');
        assert.ok(defined, 'window.Arcade not defined — arcade.js may have failed to load');
      });

      test('Arcade.onGameOver returns isNewBest:true on first-ever score', async () => {
        const result = await page.evaluate((g) => {
          try {
            if (g.bestKey) localStorage.removeItem(g.bestKey);
            const r = Arcade.onGameOver(g.id, g.score);
            return { ok: true, isNewBest: !!(r && r.isNewBest) };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        }, game);
        assert.ok(result.ok, `Arcade.onGameOver threw: ${result.error}`);
        assert.ok(result.isNewBest, 'isNewBest should be true when there is no prior best');
      });

      test('Arcade.onGameOver returns isNewBest:false when score is below best', async (t) => {
        if (!game.bestKey) {
          t.skip('game uses a non-standard best key — isNewBest always true by design');
          return;
        }
        // Open a fresh page to avoid the 1-second onGameOver debounce
        const { page: p2 } = await openPage(`${baseUrl}/${game.id}/`);
        const result = await p2.evaluate((g) => {
          try {
            localStorage.setItem(g.bestKey, String(g.score * 10));
            const r = Arcade.onGameOver(g.id, g.score);
            return { ok: true, isNewBest: !!(r && r.isNewBest) };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        }, game);
        await p2.close();
        assert.ok(result.ok, `Arcade.onGameOver threw: ${result.error}`);
        assert.strictEqual(result.isNewBest, false, 'isNewBest should be false when score < existing best');
      }, { timeout: 35_000 });

      test('Arcade.createScoreCard inserts .arc-scorecard into the DOM', async () => {
        const found = await page.evaluate((g) => {
          try {
            // Remove any existing card first
            document.querySelectorAll('.arc-scorecard').forEach(el => el.remove());
            if (g.bestKey) localStorage.removeItem(g.bestKey);
            const card = Arcade.createScoreCard(g.id, g.score, 0);
            document.body.appendChild(card);
            return document.querySelectorAll('.arc-scorecard').length > 0;
          } catch { return false; }
        }, game);
        assert.ok(found, '.arc-scorecard not found in DOM after createScoreCard()');
      });

      test("dispatching 'arcade-restart' does not throw", async () => {
        const preErrors = [...errors];
        await page.evaluate(() => {
          document.dispatchEvent(new Event('arcade-restart'));
        });
        await new Promise(r => setTimeout(r, 500));
        // errors array is populated by live page events
        const newErrors = errors.slice(preErrors.length);
        assert.deepStrictEqual(newErrors, [], `arcade-restart caused errors:\n${newErrors.join('\n')}`);
      }, { timeout: 10_000 });
    });
  }
});

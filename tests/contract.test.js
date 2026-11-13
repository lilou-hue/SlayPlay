'use strict';
/**
 * contract.test.js — Static analysis of game source files.
 *
 * Checks the 10 most important systemic properties of SlayPlay without
 * starting a browser:
 *   1. Platform files exist and are well-formed
 *   2. Every game calls Arcade.onGameOver + createScoreCard
 *   3. Every game has an arcade-restart listener
 *   4. No createScoreCard call passes a live best-variable as the 3rd arg
 *   5. Every game's bestKey in arcade.js matches the key used in the game file
 *   6. leaderboard.js exports the required surface
 *   7. i18n.js exports I18N / _t
 *   8. arcade.css defines .arc-scorecard
 *   9. index.html links to every registered game
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs   = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'arcade');

// ── Game registry ────────────────────────────────────────────────────────────
// Each entry mirrors the bestKey registered in arcade.js lines 10-30
const GAMES = [
  { id: 'art-of-doing-nothing', js: 'game.js',   bestKey: 'artOfDoingNothingBest' },
  { id: 'astro-miner',          js: 'game.js',   bestKey: 'astroMinerBest' },
  { id: 'beat-drop',            js: 'game.js',   bestKey: 'beatDropBest' },
  { id: 'dress-up',             js: 'game.js',   bestKey: 'dressUpBest' },
  { id: 'flappy-bird',          js: 'script.js', bestKey: 'flappyBest' },
  { id: 'gravity-garden',       js: 'game.js',   bestKey: 'gravityGardenBest' },
  { id: 'gun-game',             js: 'game.js',   bestKey: 'gunGameBest' },
  { id: 'heart-serve',          js: 'game.js',   bestKey: 'heartServeBest' },
  { id: 'inkognito',            js: 'game.js',   bestKey: 'inkognitoBest' },
  { id: 'last-seen-online',     js: 'game.js',   bestKey: 'lastSeenOnlineBest' },
  { id: 'lumina',               js: 'game.js',   bestKey: 'luminaBest' },
  { id: 'methane-drift',        js: 'game.js',   bestKey: 'methaneDriftBest' },
  { id: 'neon-pong',            js: 'game.js',   bestKey: 'neonPongBest' },
  { id: 'no-internet',          js: 'game.js',   bestKey: 'a1NoInternetBest' },
  { id: 'phantom-road',         js: 'game.js',   bestKey: 'phantomRoadBest' },
  { id: 'rivals',               js: 'game.js',   bestKey: 'rivalsBest' },
  { id: 'snake',                js: 'game.js',   bestKey: 'snakeBest' },
  { id: 'stack-tower',          js: 'game.js',   bestKey: 'stackTowerBest' },
  { id: 'star-fury',            js: 'game.js',   bestKey: 'starFuryBest' },
  { id: 'tetris',               js: 'game.js',   bestKey: 'tetrisBest' },
  { id: 'unicorn-clicker',      js: 'game.js',   bestKey: null }, // clicker uses UC_LAST_REPORTED_KEY, no static bestKey
];

// Third-arg patterns that indicate a live (post-mutation) best variable was passed.
// These should NEVER appear in any createScoreCard call after the prevBest fixes.
const LIVE_BEST_PATTERNS = [
  // Object-property best vars
  /Arcade\.createScoreCard\(\s*['"][^'"]+['"]\s*,\s*[^,)]+,\s*(state\.best|game\.best|world\.best|gameState\.best)\s*\)/,
  // Bare module-level best vars
  /Arcade\.createScoreCard\(\s*['"][^'"]+['"]\s*,\s*[^,)]+,\s*bestScore\s*\)/,
  /Arcade\.createScoreCard\(\s*['"][^'"]+['"]\s*,\s*[^,)]+,\s*bestKills\s*\)/,
  /Arcade\.createScoreCard\(\s*['"][^'"]+['"]\s*,\s*[^,)]+,\s*bestTime\s*\)/,
];

// ── Platform file tests ───────────────────────────────────────────────────────
describe('Platform files', () => {
  test('arcade.js exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'arcade.js')), 'arcade.js missing');
  });

  test('arcade.css defines .arc-scorecard', () => {
    const css = fs.readFileSync(path.join(ROOT, 'arcade.css'), 'utf8');
    assert.ok(css.includes('.arc-scorecard'), '.arc-scorecard rule missing from arcade.css');
  });

  test('arcade.js registers all games in GAME_META', () => {
    const src = fs.readFileSync(path.join(ROOT, 'arcade.js'), 'utf8');
    for (const g of GAMES) {
      assert.ok(
        src.includes(`'${g.id}'`) || src.includes(`"${g.id}"`),
        `arcade.js GAME_META missing entry for ${g.id}`,
      );
    }
  });

  test('leaderboard.js exports submitScore, refresh, getNickname', () => {
    const src = fs.readFileSync(path.join(ROOT, 'leaderboard.js'), 'utf8');
    assert.ok(src.includes('submitScore'), 'leaderboard.js: submitScore missing');
    assert.ok(src.includes('getNickname'), 'leaderboard.js: getNickname missing');
    assert.ok(src.includes('refresh'),     'leaderboard.js: refresh missing');
  });

  test('i18n.js defines I18N and/or _t', () => {
    const src = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
    assert.ok(
      src.includes('I18N') || src.includes('function _t') || src.includes('var _t') || src.includes('const _t'),
      'i18n.js: I18N / _t not found',
    );
  });

  test('index.html links every registered game', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    for (const g of GAMES) {
      assert.ok(
        html.includes(`/${g.id}/`) || html.includes(`/${g.id}"`),
        `index.html: no link to ${g.id}`,
      );
    }
  });
});

// ── Per-game contract tests ───────────────────────────────────────────────────
describe('Game contracts', () => {
  for (const game of GAMES) {
    describe(game.id, () => {
      const jsPath = path.join(ROOT, game.id, game.js);
      const src = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : null;

      test('game file exists', () => {
        assert.ok(src !== null, `${game.id}/${game.js} not found`);
      });

      test('index.html exists', () => {
        assert.ok(
          fs.existsSync(path.join(ROOT, game.id, 'index.html')),
          `${game.id}/index.html not found`,
        );
      });

      test('loads arcade.js', () => {
        const html = fs.readFileSync(path.join(ROOT, game.id, 'index.html'), 'utf8');
        assert.ok(html.includes('arcade.js'), `${game.id}/index.html does not load arcade.js`);
      });

      test('calls Arcade.onGameOver', () => {
        assert.ok(src && src.includes('Arcade.onGameOver('), 'Arcade.onGameOver() not found');
      });

      test('calls Arcade.createScoreCard', () => {
        assert.ok(src && src.includes('Arcade.createScoreCard('), 'Arcade.createScoreCard() not found');
      });

      test('has arcade-restart listener', () => {
        assert.ok(
          src && (src.includes("'arcade-restart'") || src.includes('"arcade-restart"')),
          "addEventListener('arcade-restart') not found",
        );
      });

      test('createScoreCard does not pass live best variable as 3rd arg (prevBest pattern)', () => {
        for (const pattern of LIVE_BEST_PATTERNS) {
          assert.ok(
            !src || !pattern.test(src),
            `createScoreCard receives a live/post-mutation best variable — capture prevBest first.\nPattern: ${pattern}`,
          );
        }
      });

      if (game.bestKey) {
        test(`bestKey '${game.bestKey}' is used in game directory`, () => {
          // Key may live in a helper file (e.g. state.js) — search all JS in the game dir
          const gameDir = path.join(ROOT, game.id);
          const allJs = fs.readdirSync(gameDir)
            .filter(f => f.endsWith('.js'))
            .map(f => fs.readFileSync(path.join(gameDir, f), 'utf8'))
            .join('\n');
          assert.ok(
            allJs.includes(game.bestKey),
            `localStorage key '${game.bestKey}' not found in any .js file in ${game.id}/`,
          );
        });

        test(`bestKey '${game.bestKey}' matches arcade.js registration`, () => {
          const arcadeSrc = fs.readFileSync(path.join(ROOT, 'arcade.js'), 'utf8');
          assert.ok(
            arcadeSrc.includes(game.bestKey),
            `bestKey '${game.bestKey}' missing from arcade.js GAME_META`,
          );
        });
      }
    });
  }
});

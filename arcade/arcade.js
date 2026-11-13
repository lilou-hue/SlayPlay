/* ═══════════════════════════════════════════════════════════════
   arcade.js  –  SlayPlay Arcade Platform Module
   IIFE exposing global `Arcade` object (same pattern as leaderboard.js)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Game registry ── */
  const GAMES = {
    'flappy-bird':    { name: 'Flappy Bird',        bestKey: 'flappyBest',       thresholds: [10, 30, 80] },
    'snake':          { name: 'Snake',               bestKey: 'snakeBest',        thresholds: [20, 60, 150] },
    'tetris':         { name: 'Tetris',              bestKey: 'tetrisBest',       thresholds: [500, 2000, 5000] },
    'lumina':         { name: 'Lumina',              bestKey: 'luminaBest',       thresholds: [5, 15, 40] },
    'phantom-road':   { name: 'Phantom Road',        bestKey: 'phantomRoadBest',  thresholds: [500, 2000, 5000] },
    'methane-drift':  { name: 'Methane Drift',       bestKey: 'methaneDriftBest', thresholds: [1000, 5000, 15000] },
    'gun-game':       { name: 'Gun Game',            bestKey: 'gunGameBest',      thresholds: [3, 5, 8] },
    'unicorn-clicker':{ name: 'Unicorn Fart Clicker',bestKey: null,               thresholds: [100, 1000, 10000] },
    'astro-miner':    { name: 'Astro Miner',         bestKey: 'astroMinerBest',   thresholds: [500, 2000, 8000] },
    'star-fury':      { name: 'Star Fury',           bestKey: 'starFuryBest',     thresholds: [500, 2000, 8000] },
    'inkognito':      { name: 'Inkognito',           bestKey: 'inkognitoBest',    thresholds: [5, 15, 40] },
    'dress-up':       { name: 'Dress-Up',            bestKey: 'dressUpBest',      thresholds: [50, 150, 400] },
    'stack-tower':    { name: 'Stack Tower',         bestKey: 'stackTowerBest',   thresholds: [10, 25, 50] },
    'neon-pong':      { name: 'Neon Pong',           bestKey: 'neonPongBest',     thresholds: [3, 7, 15] },
    'beat-drop':      { name: 'Beat Drop',           bestKey: 'beatDropBest',     thresholds: [500, 2000, 5000] },
    'rivals':         { name: 'Rivals',              bestKey: 'rivalsBest',       thresholds: [5, 15, 30] },
    'gravity-garden': { name: 'Gravity Garden',      bestKey: 'gravityGardenBest',thresholds: [50, 200, 500] },
    'last-seen-online': { name: 'Last Seen Online',  bestKey: 'lastSeenOnlineBest', thresholds: [30, 60, 90] },
    'art-of-doing-nothing': { name: 'The Art of Doing Nothing', bestKey: 'artOfDoingNothingBest', thresholds: [100, 300, 500] },
    'heart-serve':          { name: 'HeartServe',              bestKey: 'heartServeBest',         thresholds: [25, 50, 75] },
    'no-internet':          { name: 'No Internet',             bestKey: 'a1NoInternetBest',       thresholds: [100, 500, 1000] },
  };

  const GAME_IDS = Object.keys(GAMES);

  /* ── Site-wide achievements ── */
  const ACHIEVEMENTS = [
    { id: 'first_steps',       nameKey: 'arcAchFirstSteps',       descKey: 'arcAchFirstStepsDesc',       n: 'First Steps',       d: 'Play your first game',            icon: '👶', reward: 10 },
    { id: 'getting_hooked',    nameKey: 'arcAchGettingHooked',    descKey: 'arcAchGettingHookedDesc',    n: 'Getting Hooked',    d: 'Play 5 different games',          icon: '🎣', reward: 25 },
    { id: 'arcade_rat',        nameKey: 'arcAchArcadeRat',        descKey: 'arcAchArcadeRatDesc',        n: 'Arcade Rat',        d: 'Play 50 games',                   icon: '🐀', reward: 100 },
    { id: 'explorer',          nameKey: 'arcAchExplorer',         descKey: 'arcAchExplorerDesc',         n: 'Explorer',          d: 'Play every available game',       icon: '🧭', reward: 75 },
    { id: 'coin_collector',    nameKey: 'arcAchCoinCollector',    descKey: 'arcAchCoinCollectorDesc',    n: 'Coin Collector',    d: 'Earn 500 coins',                  icon: '🪙', reward: 50 },
    { id: 'big_spender',       nameKey: 'arcAchBigSpender',       descKey: 'arcAchBigSpenderDesc',       n: 'Big Spender',       d: 'Spend 2,000 coins in the shop',   icon: '💰', reward: 100 },
    { id: 'hat_trick',         nameKey: 'arcAchHatTrick',         descKey: 'arcAchHatTrickDesc',         n: 'Hat Trick',         d: 'Keep a 3-day play streak',        icon: '🎩', reward: 30 },
    { id: 'weekly_warrior',    nameKey: 'arcAchWeeklyWarrior',    descKey: 'arcAchWeeklyWarriorDesc',    n: 'Weekly Warrior',    d: 'Keep a 7-day play streak',        icon: '⚔️', reward: 75 },
    { id: 'monthly_master',    nameKey: 'arcAchMonthlyMaster',    descKey: 'arcAchMonthlyMasterDesc',    n: 'Monthly Master',    d: 'Keep a 30-day play streak',       icon: '👑', reward: 200 },
    { id: 'high_roller',       nameKey: 'arcAchHighRoller',       descKey: 'arcAchHighRollerDesc',       n: 'High Roller',       d: 'Spend 500 coins in the shop',     icon: '🎰', reward: 50 },
    { id: 'challenge_accepted',nameKey: 'arcAchChallengeAccepted',descKey: 'arcAchChallengeAcceptedDesc',n: 'Challenge Accepted',d: 'Complete a daily challenge',       icon: '✅', reward: 15 },
    { id: 'challenge_streak',  nameKey: 'arcAchChallengeStreak',  descKey: 'arcAchChallengeStreakDesc',  n: 'Challenge Streak',  d: 'Complete 7 daily challenges',     icon: '🔥', reward: 100 },
  ];
  ACHIEVEMENTS.forEach(function(a) {
    Object.defineProperty(a, 'name', { get: function() { return t(a.nameKey, a.n); }, enumerable: true });
    Object.defineProperty(a, 'desc', { get: function() { return t(a.descKey, a.d); }, enumerable: true });
  });

  /* ── Shop items ── */
  const SHOP_ITEMS = [
    /* ── Badges — personality-driven status symbols ── */
    { id: 'badge_flame',     cat: 'badge', nameKey: 'arcShopFlameBadge',     displayName: 'Hothead',       icon: '🔥', cost: 100,  rarity: 'common',    desc: 'For those who run hot' },
    { id: 'badge_wizard',    cat: 'badge', nameKey: 'arcShopWizardBadge',    displayName: 'The Wizard',    icon: '🧙', cost: 200,  rarity: 'uncommon',  desc: 'Mysterious and unpredictable' },
    { id: 'badge_snake',     cat: 'badge', nameKey: 'arcShopSnakeBadge',     displayName: 'Cold Blooded',  icon: '🐍', cost: 300,  rarity: 'rare',      desc: 'Cold. Patient. Deadly.' },
    { id: 'badge_alien',     cat: 'badge', nameKey: 'arcShopAlienBadge',     displayName: 'Void Walker',   icon: '👾', cost: 400,  rarity: 'epic',      desc: 'Not from around here' },
    { id: 'badge_demon',     cat: 'badge', nameKey: 'arcShopDemonBadge',     displayName: 'Chaos Lord',    icon: '😈', cost: 450,  rarity: 'epic',      desc: 'Pure chaos energy' },
    { id: 'badge_crown',     cat: 'badge', nameKey: 'arcShopCrownBadge',     displayName: 'The Monarch',   icon: '👑', cost: 700,  rarity: 'legendary', desc: 'Royalty. No further questions.' },
    /* Achievement-locked prestige badges — cannot be bought, only earned */
    { id: 'badge_diamond',   cat: 'badge', nameKey: 'arcShopDiamondBadge',   displayName: 'Diamond',       icon: '💎', cost: 0, requireAch: 'monthly_master', rarity: 'legendary', desc: 'Earned by the dedicated few' },
    { id: 'badge_lightning', cat: 'badge', nameKey: 'arcShopLightningBadge', displayName: 'Speed Demon',   icon: '⚡', cost: 0, requireAch: 'arcade_rat',     rarity: 'epic',      desc: 'Speed is everything' },
    { id: 'badge_ghost',     cat: 'badge', nameKey: 'arcShopGhostBadge',     displayName: 'The Ghost',     icon: '👻', cost: 0, requireAch: 'explorer',       rarity: 'epic',      desc: 'Seen everything' },
    /* ── Themes — full site color overhauls ── */
    { id: 'theme_void',   cat: 'theme', nameKey: 'arcShopVoidTheme',   displayName: 'Void',         icon: '🌑', cost: 350, vars: { '--accent': '#a855f7', '--accent2': '#7c3aed', '--accent3': '#6d28d9' }, desc: 'Deep space purple' },
    { id: 'theme_sakura', cat: 'theme', nameKey: 'arcShopSakuraTheme', displayName: 'Sakura',       icon: '🌸', cost: 350, vars: { '--accent': '#ec4899', '--accent2': '#f472b6', '--accent3': '#db2777' }, desc: 'Cherry blossom pink' },
    { id: 'theme_cyber',  cat: 'theme', nameKey: 'arcShopCyberTheme',  displayName: 'Cyberpunk',    icon: '⚡', cost: 400, vars: { '--accent': '#facc15', '--accent2': '#06b6d4', '--accent3': '#84cc16' }, desc: 'Neon city nights' },
    { id: 'theme_blood',  cat: 'theme', nameKey: 'arcShopBloodTheme',  displayName: 'Blood Moon',   icon: '🩸', cost: 350, vars: { '--accent': '#ef4444', '--accent2': '#b91c1c', '--accent3': '#9f1239' }, desc: 'Blood moon red' },
    { id: 'theme_ocean',  cat: 'theme', nameKey: 'arcShopOceanTheme',  displayName: 'Ocean',        icon: '🌊', cost: 300, vars: { '--accent': '#38bdf8', '--accent2': '#06b6d4', '--accent3': '#0ea5e9' }, desc: 'Open ocean blue' },
    /* ── Frames — animated scorecard & profile borders ── */
    { id: 'frame_holo',      cat: 'frame', nameKey: 'arcShopHoloFrame',      displayName: 'Holographic',    icon: '💿', cost: 700, rarity: 'legendary', desc: 'Holographic rainbow shimmer' },
    { id: 'frame_lightning', cat: 'frame', nameKey: 'arcShopLightningFrame', displayName: 'Lightning Storm', icon: '⚡', cost: 550, rarity: 'epic',      desc: 'Crackling electric border' },
    { id: 'frame_void',      cat: 'frame', nameKey: 'arcShopVoidFrame',      displayName: 'Dark Matter',     icon: '🌌', cost: 500, rarity: 'epic',      desc: 'Dark matter pulse' },
    { id: 'frame_fire',      cat: 'frame', nameKey: 'arcShopFireFrame',      displayName: 'Inferno',         icon: '🔥', cost: 400, rarity: 'rare',      desc: 'Living fire border' },
    { id: 'frame_gold',      cat: 'frame', nameKey: 'arcShopGoldFrame',      displayName: 'Gold Trim',       icon: '🥇', cost: 300, rarity: 'rare',      desc: 'Classic gold trim' },
    /* ── Titles — shown on scorecard and leaderboard ── */
    { id: 'title_grinder', cat: 'title', nameKey: 'arcShopTitleGrinder', displayName: 'The Grinder',  icon: '📈', cost: 200,  label: 'The Grinder',  rarity: 'uncommon', desc: 'You show up every day' },
    { id: 'title_ghost',   cat: 'title', nameKey: 'arcShopTitleGhost',   displayName: 'Invisible',    icon: '👻', cost: 300,  label: 'Invisible',    rarity: 'rare',     desc: 'Here and gone' },
    { id: 'title_chaos',   cat: 'title', nameKey: 'arcShopTitleChaos',   displayName: 'Chaos Agent',  icon: '🌀', cost: 500,  label: 'Chaos Agent',  rarity: 'epic',     desc: 'Unpredictable by design' },
    { id: 'title_legend',  cat: 'title', nameKey: 'arcShopTitleLegend',  displayName: 'The Legend',   icon: '🏆', cost: 900,  label: 'The Legend',   rarity: 'legendary',desc: 'The name speaks for itself' },
    { id: 'title_goat',    cat: 'title', nameKey: 'arcShopTitleGoat',    displayName: 'G.O.A.T.',     icon: '🐐', cost: 1500, label: 'G.O.A.T.',     rarity: 'legendary',desc: 'Greatest of all time. Period.' },
    /* ── Powers — consumable boosts that activate immediately ── */
    { id: 'power_coinx2', cat: 'power', nameKey: 'arcShopCoinRush',    displayName: 'Coin Rush',     icon: '💰', cost: 300, effect: 'coinx2_1h',    desc: '2× coins earned for 1 hour' },
    { id: 'power_lucky',  cat: 'power', nameKey: 'arcShopLuckyStar',   displayName: 'Lucky Star',    icon: '🌟', cost: 200, effect: 'lucky_next',   desc: 'Guaranteed lucky drop next game' },
    { id: 'power_magnet', cat: 'power', nameKey: 'arcShopCoinMagnet',  displayName: 'Coin Magnet',   icon: '🧲', cost: 250, effect: 'magnet_24h',   desc: '+10 bonus coins every game for 24h' },
    { id: 'streak_shield',cat: 'power', nameKey: 'arcShopStreakShield',displayName: 'Streak Shield', icon: '🛡️', cost: 150, effect: 'streak_shield', desc: 'Protect your streak from breaking once' },
  ];
  SHOP_ITEMS.forEach(function(item) {
    /* Use displayName as fallback so items never show raw i18n keys */
    Object.defineProperty(item, 'name', { get: function() { return t(item.nameKey, item.displayName); }, enumerable: true });
  });

  /* ── Challenge templates ── */
  const CHALLENGE_TEMPLATES = [
    { type: 'score',     tplKey: 'arcChallScore',    targets: [5, 10, 20, 30, 50] },
    { type: 'play',      tplKey: 'arcChallPlay',     targets: [2, 3, 5] },
    { type: 'beat_best', tplKey: 'arcChallBeatBest', targets: [1] },
  ];
  function getChallTpl(tplKey) {
    return t(tplKey, tplKey);
  }

  /* ── i18n helper ── */
  function t(key, fallback) {
    if (typeof I18N !== 'undefined' && I18N.t) {
      var v = I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  /* ── Analytics helper ── */
  function track(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params || {});
  }

  /* ── Helpers ── */
  function today() { return new Date().toISOString().slice(0, 10); }

  function loadJSON(key, fallback) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key));
      return (parsed && typeof parsed === 'object') ? parsed : fallback;
    } catch (e) { return fallback; }
  }

  function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  /* mulberry32 seeded PRNG */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function dateSeed(dateStr) {
    var h = 0;
    for (var i = 0; i < dateStr.length; i++) {
      h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
    }
    return h;
  }

  /* ── State loaders ── */
  function getState() {
    return loadJSON('arcade_state', {
      coins: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      gamesPlayed: {},
      totalGamesPlayed: 0,
      uniqueGamesPlayed: [],
      lastPlayedDate: null,
      todayGamesPlayed: [],
      todayDate: null,
      challengesCompleted: 0,
    });
  }
  function setState(s) { saveJSON('arcade_state', s); }

  function getStreak() {
    return loadJSON('arcade_playStreak', { lastDate: null, streak: 0, longestStreak: 0 });
  }
  function setStreak(s) { saveJSON('arcade_playStreak', s); }

  function getAch() {
    return loadJSON('arcade_achievements', { unlocked: [], unlockedAt: {} });
  }
  function setAch(a) { saveJSON('arcade_achievements', a); }

  function getChallenges() {
    return loadJSON('arcade_challenges', { date: null, challenges: [] });
  }
  function setChallenges(c) { saveJSON('arcade_challenges', c); }

  function getShop() {
    var s = loadJSON('arcade_shop', {});
    /* Defensive backfill — old saves may be missing keys */
    if (!Array.isArray(s.purchased)) s.purchased = [];
    if (!s.equipped || typeof s.equipped !== 'object') s.equipped = {};
    if (!s.equipped.badge)  s.equipped.badge  = null;
    if (!s.equipped.theme)  s.equipped.theme  = null;
    if (!s.equipped.frame)  s.equipped.frame  = null;
    if (!s.equipped.title)  s.equipped.title  = null;
    return s;
  }
  function setShop(s) { saveJSON('arcade_shop', s); }

  /* ── Shop Powers (timed/single-use consumable tracking) ── */
  function getShopPowers() {
    return loadJSON('arc_shopPowers', {});
  }
  function setShopPowers(p) { saveJSON('arc_shopPowers', p); }

  function activateShopPower(effect) {
    var p = getShopPowers();
    var now = Date.now();
    if (effect === 'coinx2_1h')    { p.coinx2  = { expires: now + 3600000 }; }
    if (effect === 'magnet_24h')   { p.magnet  = { expires: now + 86400000 }; }
    if (effect === 'lucky_next')   { p.lucky   = { active: true }; }
    if (effect === 'streak_shield'){ /* handled via shop.purchased */ }
    setShopPowers(p);
  }

  function getActiveShopPowerStatus() {
    var p = getShopPowers();
    var now = Date.now();
    var active = {};
    if (p.coinx2 && p.coinx2.expires > now) active.coinx2 = Math.ceil((p.coinx2.expires - now) / 60000); /* minutes left */
    if (p.magnet && p.magnet.expires > now) active.magnet = Math.ceil((p.magnet.expires - now) / 60000);
    if (p.lucky  && p.lucky.active)         active.lucky  = true;
    return active;
  }

  /* ── Admin Mode ── */
  function isAdminMode() { return localStorage.getItem('arc_admin') === '1'; }

  function activateAdminMode() {
    localStorage.setItem('arc_admin', '1');
    adminUnlockAll();
    showAdminToast('🔑 Admin mode ON — all items unlocked for testing');
  }

  function deactivateAdminMode() {
    localStorage.removeItem('arc_admin');
    showAdminToast('🔓 Admin mode OFF');
  }

  function adminUnlockAll() {
    /* Give enough coins to buy everything */
    var s = getState();
    s.coins = Math.max(s.coins, 99999);
    s.totalCoinsEarned = Math.max(s.totalCoinsEarned, 99999);
    setState(s);
    updateCoinDisplays();

    /* Mark all items as purchased */
    var shop = getShop();
    SHOP_ITEMS.forEach(function(item) {
      if (shop.purchased.indexOf(item.id) === -1) {
        shop.purchased.push(item.id);
      }
    });
    setShop(shop);

    /* Activate all timed powers */
    activateShopPower('coinx2_1h');
    activateShopPower('magnet_24h');
    activateShopPower('lucky_next');
  }

  function showAdminToast(msg) {
    var el = document.createElement('div');
    el.className = 'arc-admin-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function() { el.classList.add('arc-admin-toast--visible'); }, 50);
    setTimeout(function() {
      el.classList.remove('arc-admin-toast--visible');
      setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }, 3000);
  }

  /* ── Dismissable popup helper ─────────────────────────────
     Adds a × close button and registers the element for Esc-key
     dismissal. Stack is LIFO so Esc closes the most-recent popup.
     Entries are removed from the stack on close/auto-dismiss (not just
     lazily on Esc) so the stack can't grow unbounded or get out of order. */
  var _dismissStack = [];

  function _unregisterDismiss(el) {
    var idx = _dismissStack.indexOf(el);
    if (idx !== -1) _dismissStack.splice(idx, 1);
  }

  function _removePopup(el) {
    _unregisterDismiss(el);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    /* Drop any entries whose nodes are already gone, then dismiss the topmost
       live popup. stopPropagation keeps Esc from also reaching game handlers
       (e.g. tetris pause) when a popup is actually on screen. */
    while (_dismissStack.length) {
      var top = _dismissStack[_dismissStack.length - 1];
      if (top && top.isConnected) {
        e.preventDefault();
        e.stopPropagation();
        _removePopup(top);
        return;
      }
      _dismissStack.pop();
    }
  }, true); /* capture phase so we run before game keydown listeners */

  function makeDismissable(el) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arc-toast-close';
    btn.setAttribute('aria-label', 'Dismiss');
    btn.textContent = '×';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _removePopup(el);
    });
    el.appendChild(btn);
    /* Prune any auto-dismissed (detached) entries before registering this one. */
    _dismissStack = _dismissStack.filter(function (n) { return n.isConnected; });
    _dismissStack.push(el);
    return el;
  }

  /* ── Coin management ── */
  function addCoins(amount) {
    var s = getState();
    s.coins += amount;
    s.totalCoinsEarned += amount;
    setState(s);
    updateCoinDisplays();
    return s.coins;
  }

  function updateCoinDisplays() {
    var coins = getState().coins;
    document.querySelectorAll('.arc-coin-value').forEach(function (el) {
      var prev = parseInt(el.textContent) || 0;
      el.textContent = coins;
      /* Coin pop micro-reward animation */
      if (coins > prev) {
        el.classList.add('arc-coin-pop');
        var parent = el.closest('.arc-nav__coins');
        if (parent) {
          parent.classList.add('arc-coin-animating');
          setTimeout(function() { parent.classList.remove('arc-coin-animating'); }, 300);
        }
        setTimeout(function() { el.classList.remove('arc-coin-pop'); }, 500);
      }
    });
  }

  /* ── Achievement checking ── */
  function checkAchievements(context) {
    var s = getState();
    var streak = getStreak();
    var shop = getShop();
    var ach = getAch();
    var newlyUnlocked = [];

    var checks = {
      first_steps:        s.totalGamesPlayed >= 1,
      getting_hooked:     s.uniqueGamesPlayed.length >= 5,
      arcade_rat:         s.totalGamesPlayed >= 50,
      explorer:           s.uniqueGamesPlayed.length >= GAME_IDS.length,
      coin_collector:     s.totalCoinsEarned >= 500,
      big_spender:        (s.totalCoinsSpent || 0) >= 2000,
      hat_trick:          streak.streak >= 3,
      weekly_warrior:     streak.streak >= 7,
      monthly_master:     streak.streak >= 30,
      high_roller:        (s.totalCoinsSpent || 0) >= 500,
      challenge_accepted: s.challengesCompleted >= 1,
      challenge_streak:   s.challengesCompleted >= 7,
    };

    ACHIEVEMENTS.forEach(function (a) {
      if (ach.unlocked.indexOf(a.id) === -1 && checks[a.id]) {
        ach.unlocked.push(a.id);
        ach.unlockedAt[a.id] = Date.now();
        newlyUnlocked.push(a);
        addCoins(a.reward);
        track('achievement_unlock', { achievement_id: a.id, achievement_name: a.name });
      }
    });

    if (newlyUnlocked.length) setAch(ach);
    return newlyUnlocked;
  }

  /* ── Daily challenges ── */
  function generateDailyChallenges() {
    var d = today();
    var stored = getChallenges();
    if (stored.date === d) return stored.challenges;

    var rng = mulberry32(dateSeed(d));
    var challenges = [];

    /* Challenge 1: Score X+ in a specific game */
    var scoreGames = GAME_IDS.filter(function (id) { return id !== 'unicorn-clicker' && id !== 'inkognito'; });
    var g1 = scoreGames[Math.floor(rng() * scoreGames.length)];
    var tpl1 = CHALLENGE_TEMPLATES[0];
    var target1 = tpl1.targets[Math.floor(rng() * tpl1.targets.length)];
    challenges.push({
      id: 'c1_' + d, type: 'score', gameId: g1, target: target1, reward: 20,
      completed: false, desc: getChallTpl(tpl1.tplKey).replace('{target}', target1).replace('{game}', GAMES[g1].name),
    });

    /* Challenge 2: Play N different games */
    var tpl2 = CHALLENGE_TEMPLATES[1];
    var target2 = tpl2.targets[Math.floor(rng() * tpl2.targets.length)];
    challenges.push({
      id: 'c2_' + d, type: 'play', gameId: null, target: target2, reward: 15,
      completed: false, desc: getChallTpl(tpl2.tplKey).replace('{target}', target2),
    });

    /* Challenge 3: Beat your best in a specific game */
    var g3 = scoreGames[Math.floor(rng() * scoreGames.length)];
    challenges.push({
      id: 'c3_' + d, type: 'beat_best', gameId: g3, target: 1, reward: 25,
      completed: false, desc: getChallTpl(CHALLENGE_TEMPLATES[2].tplKey).replace('{game}', GAMES[g3].name),
    });

    setChallenges({ date: d, challenges: challenges });
    return challenges;
  }

  function checkChallenges(gameId, score, isNewBest) {
    var ch = getChallenges();
    if (ch.date !== today()) { ch = { date: today(), challenges: generateDailyChallenges() }; }
    var completed = [];
    var s = getState();

    ch.challenges.forEach(function (c) {
      if (c.completed) return;
      if (c.type === 'score' && c.gameId === gameId && score >= c.target) {
        c.completed = true; completed.push(c);
      } else if (c.type === 'play' && (s.todayGamesPlayed || []).length >= c.target) {
        c.completed = true; completed.push(c);
      } else if (c.type === 'beat_best' && c.gameId === gameId && isNewBest) {
        c.completed = true; completed.push(c);
      }
    });

    if (completed.length) {
      setChallenges(ch);
      var state = getState();
      completed.forEach(function (c) {
        addCoins(c.reward);
        state = getState();
        state.challengesCompleted = (state.challengesCompleted || 0) + 1;
        setState(state);
        track('challenge_complete', { challenge_type: c.type, challenge_desc: c.desc, reward: c.reward });
      });
    }
    return completed;
  }

  /* ── Score thresholds ── */
  function getThresholdBonus(gameId, score) {
    var g = GAMES[gameId];
    if (!g || !g.thresholds) return 0;
    var bonus = 0;
    if (score >= g.thresholds[0]) bonus = 5;
    if (score >= g.thresholds[1]) bonus = 10;
    if (score >= g.thresholds[2]) bonus = 20;
    return bonus;
  }

  /* ── Public API ── */

  function onGameStart(gameId) {
    /* Track session start — currently a no-op placeholder */
  }

  var _lastGameOverTime = 0;
  var _lastGameResult = null; /* cached for createScoreCard fallback */
  var _scoreCardKeyHandler = null; /* active scorecard keydown listener, for cleanup */

  function onGameOver(gameId, score) {
    _lastGameResult = null; /* clear stale data before computing new result */
    var now = Date.now();
    if (now - _lastGameOverTime < 1000) return { coinsEarned: 0, isNewBest: false, newAchievements: [], challengesCompleted: [], luckyDrop: null, holyMoment: null, powerUpUsed: null };
    _lastGameOverTime = now;

    var s = getState();
    var d = today();

    /* Reset daily tracking if new day */
    if (s.todayDate !== d) {
      s.todayDate = d;
      s.todayGamesPlayed = [];
    }

    /* Save last score for improvement tracking */
    if (!s.lastScores) s.lastScores = {};
    if (!s.previousScores) s.previousScores = {};
    s.previousScores[gameId] = s.lastScores[gameId] || 0;
    s.lastScores[gameId] = score;

    /* Track plays */
    s.totalGamesPlayed++;
    s.gamesPlayed[gameId] = (s.gamesPlayed[gameId] || 0) + 1;
    if (s.uniqueGamesPlayed.indexOf(gameId) === -1) s.uniqueGamesPlayed.push(gameId);
    if (s.todayGamesPlayed.indexOf(gameId) === -1) s.todayGamesPlayed.push(gameId);
    s.lastPlayedDate = d;

    /* Check for new best */
    var game = GAMES[gameId];
    var bestKey = game ? game.bestKey : null;
    var currentBest = 0;
    if (gameId === 'unicorn-clicker') {
      var ucSave = loadJSON('unicornClickerSave', {});
      currentBest = ucSave.lifetimeSP || 0;
    } else if (bestKey) {
      currentBest = Number(localStorage.getItem(bestKey)) || 0;
    }
    var isNewBest = score > currentBest;

    /* Apply active power-up (consume before coin calc so scoreMultiplier is available) */
    var activePU = consumePowerUp(gameId);
    var puDef = null;
    if (activePU) {
      puDef = POWER_UPS.find(function(p) { return p.id === activePU.id; });
    }

    /* Apply score boost power-up to threshold bonus calculation */
    var coinScore = score;
    if (puDef && puDef.scoreMultiplier) coinScore = Math.floor(score * puDef.scoreMultiplier);

    /* Calculate coins */
    var coinsEarned = 5; /* base completion */
    if (isNewBest && score > 0) coinsEarned += 10;
    coinsEarned += getThresholdBonus(gameId, coinScore);

    /* Apply chaos event multiplier */
    var activeEvent = getActiveEvent();
    if (activeEvent) {
      coinsEarned = Math.floor(coinsEarned * activeEvent.multiplier);
    }

    /* Apply coin multiplier power-up */
    var shopPowers = getShopPowers();
    var now2 = Date.now();
    if (puDef && puDef.multiplier) {
      coinsEarned = Math.floor(coinsEarned * puDef.multiplier);
    }
    /* Apply shop coinx2 only if micro-choice coin multiplier didn't already fire */
    if (!(puDef && puDef.multiplier) && shopPowers.coinx2 && shopPowers.coinx2.expires > now2) {
      coinsEarned = Math.floor(coinsEarned * 2);
    }

    if (shopPowers.magnet && shopPowers.magnet.expires > now2) {
      coinsEarned += 10;
    }

    setState(s);
    addCoins(coinsEarned);

    /* Lucky drop roll — shop lucky power guarantees a drop */
    var luckMult = (puDef && puDef.luckBoost) ? puDef.luckBoost : 1;
    if (shopPowers.lucky && shopPowers.lucky.active) {
      luckMult = Math.max(luckMult, 10); /* near-certain lucky drop */
      var p2 = getShopPowers();
      delete p2.lucky;
      setShopPowers(p2);
    }
    var luckyDrop = rollLuckyDrop(luckMult);

    /* Holy moment detection */
    var holyMoment = detectHolyMoment(gameId, score, currentBest, isNewBest);

    /* Check challenges */
    var challengesCompleted = checkChallenges(gameId, score, isNewBest);

    /* Check achievements */
    var newAchievements = checkAchievements();

    /* Check quest milestones */
    var questMilestones = checkQuestMilestones();

    /* Update player memory + check secret achievements */
    updatePlayerMemory(gameId, score);
    var newSecrets = checkSecretAchievements(gameId, score, isNewBest);

    /* Analytics */
    track('game_over', { game_id: gameId, score: score, is_new_best: isNewBest, coins_earned: coinsEarned });

    /* Cascade popups with staggered timing */
    var popupDelay = 0;

    /* Holy moment first (most dramatic) */
    if (holyMoment) {
      setTimeout(function() { showHolyMoment(holyMoment); }, 300);
      popupDelay += 3500;
    }

    /* Lucky drop */
    if (luckyDrop) {
      setTimeout(function() { showLuckyDropPopup(luckyDrop); }, popupDelay + 300);
      popupDelay += 2000;
    }

    /* Achievement popups */
    newAchievements.forEach(function (a, i) {
      setTimeout(function () { showAchievementPopup(a); }, popupDelay + 500 + 600 * i);
    });
    popupDelay += newAchievements.length * 600 + 500;

    /* Quest milestone popups (cascaded after achievements) */
    questMilestones.forEach(function (m, i) {
      setTimeout(function () { showQuestMilestonePopup(m); }, popupDelay + 600 * (i + 1));
    });

    var result = {
      coinsEarned: coinsEarned,
      isNewBest: isNewBest,
      newAchievements: newAchievements,
      challengesCompleted: challengesCompleted,
      luckyDrop: luckyDrop,
      holyMoment: holyMoment,
      powerUpUsed: puDef,
    };
    _lastGameResult = result;
    return result;
  }

  function getCoins() { return getState().coins; }

  function spendCoins(amount) {
    var s = getState();
    if (s.coins < amount) return false;
    s.coins -= amount;
    s.totalCoinsSpent = (s.totalCoinsSpent || 0) + amount;
    setState(s);
    updateCoinDisplays();
    checkAchievements();
    return true;
  }

  function checkStreak() {
    var streak = getStreak();
    var d = today();
    var result = { streak: streak.streak, coinsAwarded: 0, isNewDay: false, streakBroken: false, shieldUsed: false, lostStreak: 0 };

    if (streak.lastDate === d) {
      result.streak = streak.streak;
      return result;
    }

    result.isNewDay = true;

    /* Check if yesterday — use UTC consistently to match today() */
    var nowDate = new Date(); /* single snapshot to avoid midnight-UTC race */
    var yesterday = new Date(nowDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    var yStr = yesterday.toISOString().slice(0, 10);

    if (streak.lastDate === yStr) {
      streak.streak++;
    } else if (streak.lastDate) {
      /* STREAK BROKEN — check for shield (only valid if exactly one day was missed) */
      var twoDaysAgo = new Date(nowDate);
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
      var tdStr = twoDaysAgo.toISOString().slice(0, 10);
      var shop = getShop();
      var shieldIdx = shop.purchased.indexOf('streak_shield');
      if (shieldIdx !== -1 && streak.lastDate === tdStr) {
        /* Shield consumed — streak saved! (missed exactly one day) */
        shop.purchased.splice(shieldIdx, 1);
        setShop(shop);
        result.shieldUsed = true;
        /* Don't increment, but don't reset either */
      } else {
        /* No shield or gap > 1 day — streak dies */
        result.streakBroken = true;
        result.lostStreak = streak.streak;
        streak.streak = 1;
      }
    } else {
      streak.streak = 1;
    }

    if (streak.streak > streak.longestStreak) streak.longestStreak = streak.streak;

    /* Award daily streak coins — scales harder */
    var award = Math.min(streak.streak * 10, 100);
    /* Milestone bonuses */
    if (streak.streak === 7) award += 50;
    if (streak.streak === 14) award += 100;
    if (streak.streak === 30) award += 250;

    streak.lastDate = d;
    setStreak(streak);
    addCoins(award);

    result.streak = streak.streak;
    result.coinsAwarded = award;

    /* Show streak-related popups */
    if (result.streakBroken && result.lostStreak >= 3) {
      setTimeout(function() { showStreakLostPopup(result.lostStreak); }, 500);
    } else if (result.shieldUsed) {
      setTimeout(function() { showStreakShieldPopup(streak.streak); }, 500);
    } else if (streak.streak >= 7 && streak.streak % 7 === 0) {
      setTimeout(function() { showStreakMilestonePopup(streak.streak); }, 500);
    }

    return result;
  }

  /* ── Streak drama popups ── */
  function showStreakLostPopup(lostStreak) {
    var toast = document.createElement('div');
    toast.className = 'arc-streak-toast arc-streak-toast--lost';
    toast.innerHTML =
      '<div class="arc-streak-toast__icon">💔</div>' +
      '<div class="arc-streak-toast__body">' +
        '<div class="arc-streak-toast__title">' + t('arcStreakLost', 'Streak Lost!') + '</div>' +
        '<div class="arc-streak-toast__text">' + t('arcStreakLostMsg', 'Your {n}-day streak is gone. A Streak Shield could have saved it.').replace('{n}', lostStreak) + '</div>' +
      '</div>';
    document.body.appendChild(toast);
    makeDismissable(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-streak-toast--show'); });
    setTimeout(function () {
      toast.classList.remove('arc-streak-toast--show');
      setTimeout(function () { toast.remove(); }, 400);
    }, 5000);
  }

  function showStreakShieldPopup(currentStreak) {
    var toast = document.createElement('div');
    toast.className = 'arc-streak-toast arc-streak-toast--shield';
    toast.innerHTML =
      '<div class="arc-streak-toast__icon">🛡️</div>' +
      '<div class="arc-streak-toast__body">' +
        '<div class="arc-streak-toast__title">' + t('arcStreakSaved', 'Streak Saved!') + '</div>' +
        '<div class="arc-streak-toast__text">' + t('arcStreakSavedMsg', 'Your Shield protected your {n}-day streak! Buy another before it happens again.').replace('{n}', currentStreak) + '</div>' +
      '</div>';
    document.body.appendChild(toast);
    makeDismissable(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-streak-toast--show'); });
    setTimeout(function () {
      toast.classList.remove('arc-streak-toast--show');
      setTimeout(function () { toast.remove(); }, 400);
    }, 4000);
  }

  function showStreakMilestonePopup(streak) {
    var toast = document.createElement('div');
    toast.className = 'arc-streak-toast arc-streak-toast--milestone';
    toast.innerHTML =
      '<div class="arc-streak-toast__icon">🔥</div>' +
      '<div class="arc-streak-toast__body">' +
        '<div class="arc-streak-toast__title">' + streak + '-Day Streak!</div>' +
        '<div class="arc-streak-toast__text">' + t('arcStreakMilestone', 'You\'re on fire. Don\'t let it die.') + '</div>' +
      '</div>';
    document.body.appendChild(toast);
    makeDismissable(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-streak-toast--show'); });
    setTimeout(function () {
      toast.classList.remove('arc-streak-toast--show');
      setTimeout(function () { toast.remove(); }, 400);
    }, 3500);
  }

  /* ── Chaos Events (time-based multipliers) ── */
  /* Priority: hourly events (2x) are checked first and take precedence over
     weekend bonus (1.5x). If both apply, the higher hourly multiplier wins. */
  function getActiveEvent() {
    var hour = new Date().getUTCHours();
    if (hour === 12 || hour === 20) return { type: 'double_coins', label: '🎰 DOUBLE COINS HOUR', multiplier: 2 };
    var day = new Date().getUTCDay();
    if (day === 0 || day === 6) return { type: 'weekend_bonus', label: '🎉 WEEKEND BONUS', multiplier: 1.5 };
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
     NEW SYSTEMS — Dramatic Game Over, Main Quest, Micro-Choices,
     Lucky Drops, Holy Moments, Social Pressure
     ═══════════════════════════════════════════════════════════════ */

  /* ── 1. DRAMATIC GAME OVER MESSAGES ── */
  var GAME_OVER_MESSAGES = {
    terrible: [
      { title: 'YOU FUMBLED 😭', sub: 'That was... something.' },
      { title: 'TRAGIC 💀', sub: 'We\'ll pretend that didn\'t happen.' },
      { title: 'WRECKED', sub: 'The game didn\'t even break a sweat.' },
      { title: 'BRO...', sub: 'Even the NPCs felt sorry for you.' },
      { title: 'NOT YOUR DAY', sub: 'Try again. Or don\'t. We understand.' },
      { title: 'F IN THE CHAT', sub: 'Respects have been paid.' },
    ],
    mediocre: [
      { title: 'MEH 🤷', sub: 'You can do better. Probably.' },
      { title: 'ALMOST DECENT', sub: 'Your mom would be... neutral.' },
      { title: 'MID RUN 😐', sub: 'Neither impressive nor embarrassing.' },
      { title: 'COULD BE WORSE', sub: 'Could also be better though.' },
      { title: 'SOLID... ISH', sub: 'We\'ve seen worse. We\'ve also seen better.' },
    ],
    good: [
      { title: 'NOT BAD! 💪', sub: 'Now do it again but better.' },
      { title: 'CLEAN RUN ✨', sub: 'That was actually decent.' },
      { title: 'YOU\'RE COOKING 🔥', sub: 'Something is heating up.' },
      { title: 'NICE ONE', sub: 'The arena noticed.' },
      { title: 'LEVELING UP ⬆️', sub: 'You\'re getting dangerous.' },
    ],
    amazing: [
      { title: 'INSANE 🤯', sub: 'Wait... THAT just happened?!' },
      { title: 'ABSOLUTELY UNHINGED', sub: 'Somebody clip that.' },
      { title: 'LEGENDARY 👑', sub: 'The arena bows to you.' },
      { title: 'BUILT DIFFERENT', sub: 'You just broke the game.' },
      { title: 'GOATED 🐐', sub: 'Hall of fame material right here.' },
      { title: 'DEMON MODE 👿', sub: 'That was unholy.' },
    ],
    newBest: [
      { title: 'NEW RECORD! 🌟', sub: 'You just outdid yourself.' },
      { title: 'PERSONAL BEST 🏆', sub: 'Past you is crying right now.' },
      { title: 'EVOLUTION 🧬', sub: 'You\'re literally getting better.' },
    ],
  };

  function getGameOverMessage(gameId, score, best, isNewBest) {
    var game = GAMES[gameId];
    if (!game || !game.thresholds) return { title: game ? game.name : gameId, sub: '' };
    var t3 = game.thresholds;

    if (isNewBest && score > 0) {
      var pool = GAME_OVER_MESSAGES.newBest;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    var tier;
    if (score === 0) tier = 'terrible';
    else if (score < t3[0] * 0.5) tier = 'terrible';
    else if (score < t3[0]) tier = 'mediocre';
    else if (score < t3[1]) tier = 'good';
    else tier = 'amazing';

    var pool = GAME_OVER_MESSAGES[tier];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ── 2. NEAR-MISS / "WHY DID I LOSE?" CLARITY ── */
  function getNearMissText(gameId, score, best) {
    var game = GAMES[gameId];
    if (!game || !game.thresholds) return null;
    var t3 = game.thresholds;
    var lines = [];

    for (var i = 0; i < t3.length; i++) {
      if (score < t3[i]) {
        var diff = t3[i] - score;
        var pct = Math.round((score / t3[i]) * 100);
        if (pct >= 70) {
          lines.push('🤏 Just ' + diff + ' away from the next bonus tier!');
        } else if (pct >= 50) {
          lines.push('Halfway to the next tier. ' + diff + ' more and you\'d unlock bonus coins.');
        }
        break;
      }
    }

    if (!isNaN(best) && best > 0 && score < best && score > 0) {
      var bestDiff = best - score;
      var bestPct = Math.round((score / best) * 100);
      if (bestPct >= 90) {
        lines.push('So close to your best! Just ' + bestDiff + ' away.');
      } else if (bestPct >= 75) {
        lines.push(bestDiff + ' short of your personal record. You got this.');
      }
    }

    if (score === 0) {
      lines.push('Pro tip: scoring points helps. Just saying.');
    }

    return lines.length ? lines[0] : null;
  }

  /* ── 3. MAIN QUEST SYSTEM ── */
  var QUEST_MILESTONES = [
    { points: 100,    title: 'Rookie',          reward: 25,   icon: '🌱' },
    { points: 500,    title: 'Contender',       reward: 50,   icon: '⚔️' },
    { points: 1000,   title: 'Arena Warrior',   reward: 100,  icon: '🛡️' },
    { points: 2500,   title: 'Elite Slayer',    reward: 200,  icon: '⚡' },
    { points: 5000,   title: 'Dimension Walker', reward: 350, icon: '🌌' },
    { points: 10000,  title: 'Legendary',       reward: 500,  icon: '👑' },
    { points: 25000,  title: 'Mythic',          reward: 1000, icon: '🔮' },
    { points: 50000,  title: 'Transcendent',    reward: 2000, icon: '⭐' },
    { points: 100000, title: 'GOD MODE',        reward: 5000, icon: '💠' },
  ];

  function getQuestState() {
    return loadJSON('arcade_quest', { claimedMilestones: [], lastTotal: 0 });
  }
  function setQuestState(q) { saveJSON('arcade_quest', q); }

  function getTotalArenaPoints() {
    var total = 0;
    Object.keys(GAMES).forEach(function(id) {
      var g = GAMES[id];
      if (g.bestKey) {
        total += Number(localStorage.getItem(g.bestKey)) || 0;
      }
    });
    /* Include Unicorn Clicker lifetime SP (has no bestKey) */
    var ucSave = loadJSON('unicornClickerSave', {});
    if (ucSave.lifetimeSP) total += ucSave.lifetimeSP;
    return total;
  }

  function getQuestProgress() {
    var total = getTotalArenaPoints();
    var currentTier = null;
    var nextTier = null;

    for (var i = 0; i < QUEST_MILESTONES.length; i++) {
      if (total >= QUEST_MILESTONES[i].points) {
        currentTier = QUEST_MILESTONES[i];
      } else {
        nextTier = QUEST_MILESTONES[i];
        break;
      }
    }

    if (!nextTier && total >= QUEST_MILESTONES[QUEST_MILESTONES.length - 1].points) {
      currentTier = QUEST_MILESTONES[QUEST_MILESTONES.length - 1];
    }

    var prevPoints = currentTier ? currentTier.points : 0;
    var nextPoints = nextTier ? nextTier.points : (currentTier ? currentTier.points : 1);
    var progress = nextTier ? Math.min(((total - prevPoints) / (nextPoints - prevPoints)) * 100, 100) : 100;

    return {
      total: total,
      currentTier: currentTier,
      nextTier: nextTier,
      progress: progress,
      title: currentTier ? currentTier.title : 'Newcomer',
      icon: currentTier ? currentTier.icon : '🎮',
    };
  }

  function checkQuestMilestones() {
    var total = getTotalArenaPoints();
    var quest = getQuestState();
    var newlyReached = [];

    QUEST_MILESTONES.forEach(function(m) {
      if (total >= m.points && quest.claimedMilestones.indexOf(m.points) === -1) {
        quest.claimedMilestones.push(m.points);
        newlyReached.push(m);
        addCoins(m.reward);
      }
    });

    if (newlyReached.length) {
      quest.lastTotal = total;
      setQuestState(quest);
    }

    return newlyReached;
  }

  function showQuestMilestonePopup(milestone) {
    var toast = document.createElement('div');
    toast.className = 'arc-quest-toast';
    toast.innerHTML =
      '<div class="arc-quest-toast__icon">' + milestone.icon + '</div>' +
      '<div class="arc-quest-toast__body">' +
        '<div class="arc-quest-toast__title">RANK UP!</div>' +
        '<div class="arc-quest-toast__rank">' + milestone.title + '</div>' +
        '<div class="arc-quest-toast__reward">+' + milestone.reward + ' coins</div>' +
      '</div>';
    document.body.appendChild(toast);
    makeDismissable(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-quest-toast--show'); });
    setTimeout(function () {
      toast.classList.remove('arc-quest-toast--show');
      setTimeout(function () { toast.remove(); }, 500);
    }, 4500);
  }

  /* ── 4. MICRO-CHOICES (Pre-game power-ups) ── */
  var POWER_UPS = [
    { id: 'double_coins', name: 'Coin Magnet', icon: '🧲', cost: 15, desc: '2x coins this round', multiplier: 2 },
    { id: 'lucky_charm',  name: 'Lucky Charm', icon: '🍀', cost: 20, desc: 'Higher chance of rare drops', luckBoost: 3 },
    { id: 'score_boost',  name: 'Adrenaline',  icon: '⚡', cost: 25, desc: '+20% to score thresholds (earn coins faster)', scoreMultiplier: 1.2 },
  ];

  function getActivePowerUp() {
    var pu = loadJSON('arcade_active_powerup', null);
    if (pu && pu.id && pu.expiry > Date.now()) return pu;
    return null;
  }

  function activatePowerUp(powerUpId, gameId) {
    var pu = POWER_UPS.find(function(p) { return p.id === powerUpId; });
    if (!pu) return { success: false, reason: 'Unknown power-up' };
    if (!spendCoins(pu.cost)) return { success: false, reason: 'Not enough coins' };
    saveJSON('arcade_active_powerup', {
      id: pu.id,
      gameId: gameId,
      expiry: Date.now() + 300000,
    });
    track('powerup_activate', { powerup_id: pu.id, game_id: gameId, cost: pu.cost });
    return { success: true, powerUp: pu };
  }

  function consumePowerUp(gameId) {
    var pu = getActivePowerUp();
    if (pu) {
      if (gameId && pu.gameId && pu.gameId !== gameId) return null;
      saveJSON('arcade_active_powerup', null);
    }
    return pu;
  }

  function showPowerUpSelector(gameId) {
    if (document.querySelector('.arc-powerup-selector')) return;
    var coins = getState().coins;
    var overlay = document.createElement('div');
    overlay.className = 'arc-powerup-selector';

    var html = '<div class="arc-powerup-selector__card">' +
      '<h3 class="arc-powerup-selector__title">⚡ Choose a Power-Up</h3>' +
      '<p class="arc-powerup-selector__sub">Boost your next run (optional)</p>' +
      '<div class="arc-powerup-selector__grid">';

    POWER_UPS.forEach(function(pu) {
      var canAfford = coins >= pu.cost;
      html += '<button class="arc-powerup-card' + (canAfford ? '' : ' arc-powerup-card--locked') + '" data-id="' + pu.id + '"' + (canAfford ? '' : ' disabled') + '>' +
        '<div class="arc-powerup-card__icon">' + pu.icon + '</div>' +
        '<div class="arc-powerup-card__name">' + pu.name + '</div>' +
        '<div class="arc-powerup-card__desc">' + pu.desc + '</div>' +
        '<div class="arc-powerup-card__cost">' + (canAfford ? '🪙 ' + pu.cost : '🔒 Need ' + pu.cost) + '</div>' +
      '</button>';
    });

    html += '</div>' +
      '<button class="arc-powerup-selector__skip">No thanks, just play ➡️</button>' +
      '</div>';

    overlay.innerHTML = html;

    overlay.querySelectorAll('.arc-powerup-card:not([disabled])').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var result = activatePowerUp(btn.dataset.id, gameId);
        if (result.success) {
          showPowerUpActivatedToast(result.powerUp);
          overlay.remove();
        }
      });
    });

    overlay.querySelector('.arc-powerup-selector__skip').addEventListener('click', function() {
      overlay.remove();
    });

    requestAnimationFrame(function() { overlay.classList.add('arc-powerup-selector--show'); });
    document.body.appendChild(overlay);
  }

  function showPowerUpActivatedToast(pu) {
    var toast = document.createElement('div');
    toast.className = 'arc-ach-toast';
    toast.innerHTML =
      '<div class="arc-ach-toast__icon">' + pu.icon + '</div>' +
      '<div class="arc-ach-toast__body">' +
        '<div class="arc-ach-toast__title">POWER-UP ACTIVE</div>' +
        '<div class="arc-ach-toast__name">' + pu.name + '</div>' +
        '<div class="arc-ach-toast__reward">' + pu.desc + '</div>' +
      '</div>';
    document.body.appendChild(toast);
    makeDismissable(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-ach-toast--show'); });
    setTimeout(function () {
      toast.classList.remove('arc-ach-toast--show');
      setTimeout(function () { toast.remove(); }, 400);
    }, 2500);
  }

  /* ── 5. LUCKY DROPS (Controlled RNG) ── */
  var LUCKY_DROPS = [
    /* Evaluated rarest-first so jackpot/rare entries get a real chance
       even when luckMult is high (common-first would always block them) */
    { chance: 0.008, name: 'JACKPOT!!',     icon: '🎰', coins: 200, rarity: 'legendary' },
    { chance: 0.03,  name: 'Coin Shower!',  icon: '💰', coins: 50,  rarity: 'rare' },
    { chance: 0.08,  name: 'Lucky Coins!',  icon: '🌟', coins: 15,  rarity: 'uncommon' },
    { chance: 0.15,  name: 'Bonus Round',   icon: '✨', coins: 5,   rarity: 'common' },
  ];

  function rollLuckyDrop(luckMultiplier) {
    var mult = luckMultiplier || 1;
    for (var i = 0; i < LUCKY_DROPS.length; i++) {
      var drop = LUCKY_DROPS[i];
      if (Math.random() < drop.chance * mult) {
        addCoins(drop.coins);
        track('lucky_drop', { drop_name: drop.name, coins: drop.coins, rarity: drop.rarity });
        return drop;
      }
    }
    return null;
  }

  function showLuckyDropPopup(drop) {
    var toast = document.createElement('div');
    toast.className = 'arc-lucky-toast arc-lucky-toast--' + drop.rarity;
    toast.innerHTML =
      '<div class="arc-lucky-toast__icon">' + drop.icon + '</div>' +
      '<div class="arc-lucky-toast__body">' +
        '<div class="arc-lucky-toast__title">' + drop.name + '</div>' +
        '<div class="arc-lucky-toast__reward">+' + drop.coins + ' coins!</div>' +
      '</div>';
    document.body.appendChild(toast);
    makeDismissable(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-lucky-toast--show'); });
    var duration = drop.rarity === 'legendary' ? 5000 : 3500;
    setTimeout(function () {
      toast.classList.remove('arc-lucky-toast--show');
      setTimeout(function () { toast.remove(); }, 500);
    }, duration);
  }

  /* ── 6. HOLY MOMENTS ── */
  function detectHolyMoment(gameId, score, best, isNewBest) {
    var game = GAMES[gameId];
    if (!game || !game.thresholds) return null;

    if (isNewBest && best > 0 && score >= best * 2) {
      return { type: 'double_best', text: 'DOUBLED YOUR BEST', sub: best + ' → ' + score + ' — that\'s a 2x jump!' };
    }

    if (score >= game.thresholds[2]) {
      return { type: 'max_tier', text: 'TOP TIER REACHED', sub: 'You\'re in the top 3% of players.' };
    }

    if (isNewBest) {
      for (var i = game.thresholds.length - 1; i >= 0; i--) {
        if (score >= game.thresholds[i] && best < game.thresholds[i]) {
          return { type: 'threshold_break', text: 'LEVEL BREAKTHROUGH!', sub: 'You just crossed the ' + game.thresholds[i] + '-point barrier!' };
        }
      }
    }

    return null;
  }

  function showHolyMoment(moment) {
    var overlay = document.createElement('div');
    overlay.className = 'arc-holy-moment';
    overlay.innerHTML =
      '<div class="arc-holy-moment__content">' +
        '<div class="arc-holy-moment__text">' + moment.text + '</div>' +
        '<div class="arc-holy-moment__sub">' + moment.sub + '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    makeDismissable(overlay);
    overlay.addEventListener('click', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    requestAnimationFrame(function() { overlay.classList.add('arc-holy-moment--show'); });
    setTimeout(function() {
      overlay.classList.remove('arc-holy-moment--show');
      setTimeout(function() { overlay.remove(); }, 600);
    }, 2500);
  }

  /* ── 7. SOCIAL PRESSURE ── */
  function getSocialNudge() {
    var s = getState();
    var challenges = getChallenges();
    var nudges = [];

    if (challenges.date === today()) {
      var done = challenges.challenges.filter(function(c) { return c.completed; }).length;
      var total = challenges.challenges.length;
      if (done < total) {
        nudges.push('Only ' + (total - done) + ' challenge' + (total - done > 1 ? 's' : '') + ' left today. Don\'t miss out.');
      }
    }

    var streak = getStreak();
    if (streak.streak >= 3 && streak.lastDate !== today()) {
      nudges.push('⚠️ Your ' + streak.streak + '-day streak is on the line. Play now or lose it all.');
    }

    var quest = getQuestProgress();
    if (quest.nextTier) {
      var remaining = quest.nextTier.points - quest.total;
      if (remaining > 0 && remaining < quest.nextTier.points * 0.3) {
        nudges.push('Just ' + remaining + ' points from ' + quest.nextTier.title + ' rank. So close.');
      }
    }

    if (s.totalGamesPlayed > 0 && s.totalGamesPlayed < 10) {
      nudges.push('Only ' + (10 - s.totalGamesPlayed) + ' more games until you unlock something special.');
    }

    return nudges.length ? nudges[Math.floor(Math.random() * nudges.length)] : null;
  }

  function getDailyChallenges() {
    return generateDailyChallenges().map(function (c) {
      var desc = c.desc;
      if (c.type === 'score' && c.gameId) {
        desc = getChallTpl(CHALLENGE_TEMPLATES[0].tplKey).replace('{target}', c.target).replace('{game}', GAMES[c.gameId].name);
      } else if (c.type === 'play') {
        desc = getChallTpl(CHALLENGE_TEMPLATES[1].tplKey).replace('{target}', c.target);
      } else if (c.type === 'beat_best' && c.gameId) {
        desc = getChallTpl(CHALLENGE_TEMPLATES[2].tplKey).replace('{game}', GAMES[c.gameId].name);
      }
      return { id: c.id, desc: desc, reward: c.reward, completed: c.completed, type: c.type, gameId: c.gameId, target: c.target };
    });
  }

  function getShopItems() {
    var shop = getShop();
    var admin = isAdminMode();
    var powers = getActiveShopPowerStatus();
    return SHOP_ITEMS.map(function (item) {
      var purchased = admin || shop.purchased.indexOf(item.id) !== -1;
      var equipped = shop.equipped[item.cat] === item.id;
      var extra = {};
      /* For powers, add real-time status */
      if (item.cat === 'power') {
        if (item.effect === 'coinx2_1h')    extra.powerActive = powers.coinx2 ? powers.coinx2 + 'm left' : false;
        if (item.effect === 'magnet_24h')   extra.powerActive = powers.magnet ? powers.magnet + 'm left' : false;
        if (item.effect === 'lucky_next')   extra.powerActive = powers.lucky ? 'ready' : false;
        if (item.effect === 'streak_shield')extra.powerActive = purchased ? 'ready' : false;
      }
      return Object.assign({}, item, extra, { purchased: purchased, equipped: equipped });
    });
  }

  function purchaseItem(id) {
    var item = SHOP_ITEMS.find(function (i) { return i.id === id; });
    if (!item) return { success: false, reason: t('arcItemNotFound', 'Item not found') };
    var admin = isAdminMode();
    var shop = getShop();

    /* Powers can always be re-purchased (consumables) */
    var isPower = item.cat === 'power';
    if (!isPower && shop.purchased.indexOf(id) !== -1) {
      return { success: false, reason: t('arcAlreadyOwned', 'Already owned') };
    }
    if (item.requireAch && !admin) {
      var ach = getAch();
      if (ach.unlocked.indexOf(item.requireAch) === -1) return { success: false, reason: t('arcAchRequired', 'Achievement required') };
    }
    if (!admin && item.cost > 0 && !spendCoins(item.cost)) {
      return { success: false, reason: t('arcNotEnoughCoins', 'Not enough coins') };
    }
    shop = getShop();

    if (isPower) {
      /* Powers: activate immediately, don't stay in purchased (except streak_shield) */
      if (item.effect === 'streak_shield') {
        if (shop.purchased.indexOf(id) === -1) shop.purchased.push(id);
        setShop(shop);
      } else {
        activateShopPower(item.effect);
      }
    } else {
      if (shop.purchased.indexOf(id) === -1) shop.purchased.push(id);
      setShop(shop);
    }

    if (!admin) track('shop_purchase', { item_id: id, item_name: item.name, item_cost: item.cost });
    return { success: true, activated: isPower };
  }

  function equipItem(id) {
    var item = SHOP_ITEMS.find(function (i) { return i.id === id; });
    if (!item) return false;
    var shop = getShop();
    if (shop.purchased.indexOf(id) === -1) return false;
    if (shop.equipped[item.cat] === id) {
      shop.equipped[item.cat] = null;
    } else {
      shop.equipped[item.cat] = id;
    }
    setShop(shop);
    applyTheme();
    return true;
  }

  function applyTheme() {
    var shop = getShop();
    var themeId = shop.equipped.theme;
    if (!themeId) {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent2');
      document.documentElement.style.removeProperty('--accent3');
      return;
    }
    var item = SHOP_ITEMS.find(function (i) { return i.id === themeId; });
    if (item && item.vars) {
      Object.keys(item.vars).forEach(function (k) {
        document.documentElement.style.setProperty(k, item.vars[k]);
      });
    }
  }

  function getArcadeAchievements() {
    var ach = getAch();
    return ACHIEVEMENTS.map(function (a) {
      return Object.assign({}, a, {
        unlocked: ach.unlocked.indexOf(a.id) !== -1,
        unlockedAt: ach.unlockedAt[a.id] || null,
      });
    });
  }

  function getRandomGame() {
    var id = GAME_IDS[Math.floor(Math.random() * GAME_IDS.length)];
    return '/' + id + '/';
  }

  function getProfileData() {
    var s = getState();
    var streak = getStreak();
    var shop = getShop();
    var ach = getAch();
    var fav = null;
    var maxPlays = 0;
    Object.keys(s.gamesPlayed).forEach(function (gid) {
      if (s.gamesPlayed[gid] > maxPlays) { maxPlays = s.gamesPlayed[gid]; fav = gid; }
    });
    return {
      coins: s.coins,
      totalCoinsEarned: s.totalCoinsEarned,
      totalCoinsSpent: s.totalCoinsSpent || 0,
      totalGamesPlayed: s.totalGamesPlayed,
      uniqueGamesPlayed: s.uniqueGamesPlayed.length,
      favoriteGame: fav ? GAMES[fav].name : t('arcNoneYet', 'None yet'),
      streak: streak.streak,
      longestStreak: streak.longestStreak,
      achievementsUnlocked: ach.unlocked.length,
      achievementsTotal: ACHIEVEMENTS.length,
      equippedBadge: shop.equipped.badge,
      equippedFrame: shop.equipped.frame,
      equippedTheme: shop.equipped.theme,
      equippedTitle: shop.equipped.title,
      purchased: shop.purchased,
    };
  }

  /* ── Achievement popup toast ── */
  function showAchievementPopup(ach) {
    var toast = document.createElement('div');
    toast.className = 'arc-ach-toast';
    toast.innerHTML =
      '<div class="arc-ach-toast__icon">' + ach.icon + '</div>' +
      '<div class="arc-ach-toast__body">' +
        '<div class="arc-ach-toast__title">' + t('arcAchUnlocked', 'Achievement Unlocked!') + '</div>' +
        '<div class="arc-ach-toast__name">' + ach.name + '</div>' +
        '<div class="arc-ach-toast__reward">+' + ach.reward + ' ' + t('arcCoins', 'coins') + '</div>' +
      '</div>';
    document.body.appendChild(toast);
    makeDismissable(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-ach-toast--show'); });
    setTimeout(function () {
      toast.classList.remove('arc-ach-toast--show');
      setTimeout(function () { toast.remove(); }, 400);
    }, 3500);
  }

  /* ── Viral share hooks — provocative challenge texts ── */
  var SHARE_HOOKS = [
    'Only 2% of players beat {score} on {game}. Think you can?',
    'I just destroyed {game} with {score} points. You won\'t even come close.',
    'This game is IMPOSSIBLE. I got {score} on {game}. Bet you can\'t beat it.',
    '{score} on {game}. Don\'t play this unless you want to get addicted.',
    'I scored {score} on {game} and I can\'t stop playing. You\'ve been warned.',
  ];

  function getShareHook(score, gameName) {
    var idx = Math.floor(Math.random() * SHARE_HOOKS.length);
    return SHARE_HOOKS[idx].replace('{score}', score).replace('{game}', gameName);
  }

  /* ── Challenge link encoding/decoding ── */
  function encodeChallengeLink(gameId, score) {
    var nickname = (typeof Leaderboard !== 'undefined' && Leaderboard.getNickname) ? Leaderboard.getNickname() : '';
    var params = new URLSearchParams({ g: gameId, s: score });
    if (nickname) params.set('n', nickname);
    return 'https://slayplay.io/' + gameId + '/?challenge=' + btoa(params.toString());
  }

  function decodeChallengeLink() {
    var params = new URLSearchParams(window.location.search);
    var encoded = params.get('challenge');
    if (!encoded) return null;
    try {
      var decoded = new URLSearchParams(atob(encoded));
      return {
        gameId: decoded.get('g'),
        score: Number(decoded.get('s')) || 0,
        nickname: decoded.get('n') || 'Someone',
      };
    } catch (e) { return null; }
  }

  /* ── Competition framing — percentile calculation ── */
  function getPercentileText(gameId, score) {
    var game = GAMES[gameId];
    if (!game || !game.thresholds) return '';
    var t3 = game.thresholds;
    if (score >= t3[2]) return 'Top 3%';
    if (score >= t3[1]) return 'Top 15%';
    if (score >= t3[0]) return 'Top 40%';
    return '';
  }

  /* ── OG Badge system ── */
  function getOGBadge() {
    return loadJSON('arcade_og_badge', null);
  }

  function checkOGBadge() {
    if (getOGBadge()) return; /* Already claimed */
    /* Award OG badge to anyone playing before a threshold date or within first 1000 plays */
    var s = getState();
    if (s.totalGamesPlayed >= 1) {
      saveJSON('arcade_og_badge', {
        title: 'OG Slayer',
        icon: '\u2694\uFE0F',
        claimedAt: Date.now(),
        tier: s.totalGamesPlayed <= 10 ? 'founding' : 'early',
      });
    }
  }

  /* ── Score card overlay ── */
  function createScoreCard(gameId, score, best, opts) {
    opts = opts || {};
    var game = GAMES[gameId] || { name: gameId };
    var result = null;

    /* Find existing score card from the same session — remove its node AND
       its document-level keydown listener so handlers don't accumulate. */
    var existing = document.querySelector('.arc-scorecard');
    if (existing) existing.remove();
    if (_scoreCardKeyHandler) {
      document.removeEventListener('keydown', _scoreCardKeyHandler);
      _scoreCardKeyHandler = null;
    }

    /* Check & award OG badge */
    checkOGBadge();

    var overlay = document.createElement('div');
    overlay.className = 'arc-scorecard';

    var isNewBest = opts.isNewBest != null ? opts.isNewBest :
      (_lastGameResult ? _lastGameResult.isNewBest : (score > (best || 0) && score > 0));
    var thresholdBonus = getThresholdBonus(gameId, score);
    var coinsBase = 5;
    var coinsNewBest = isNewBest ? 10 : 0;
    var percentile = getPercentileText(gameId, score);
    var challengeLink = encodeChallengeLink(gameId, score);
    var activeEvent = getActiveEvent();
    var eventMult = activeEvent ? activeEvent.multiplier : 1;
    var totalCoins = opts.coinsEarned != null ? opts.coinsEarned :
      (_lastGameResult ? _lastGameResult.coinsEarned : Math.floor((coinsBase + coinsNewBest + thresholdBonus) * eventMult));

    /* Near-miss: enhanced clarity */
    var nearMissText = getNearMissText(gameId, score, best || 0);
    if (!nearMissText && game.thresholds) {
      for (var ti = 0; ti < game.thresholds.length; ti++) {
        if (score < game.thresholds[ti]) {
          var diff = game.thresholds[ti] - score;
          var pctLabels = ['Top 40%', 'Top 15%', 'Top 3%'];
          nearMissText = 'Just ' + diff + ' more for ' + pctLabels[ti] + '!';
          break;
        }
      }
    }

    /* Dramatic game over message */
    var dramatic = getGameOverMessage(gameId, score, best || 0, isNewBest);

    /* Loss = progress */
    var lossProgress = (!isNewBest && score > 0) ? getLossProgressText(gameId, score, best || 0) : null;

    /* Return trigger */
    var returnTrigger = getReturnTrigger();

    /* Daily challenges status */
    var challenges = getDailyChallenges();
    var pendingChallenges = challenges.filter(function(c) { return !c.completed; });
    var completedNow = challenges.filter(function(c) { return c.completed; });

    /* Streak info */
    var streak = getStreak();
    var streakAtRisk = streak.streak >= 3 && streak.lastDate !== today();

    var html =
      '<div class="arc-scorecard__bar">' +
        '<div class="arc-scorecard__bar-info">' +
          '<span class="arc-scorecard__bar-over">' + dramatic.title + '</span>' +
          '<span class="arc-scorecard__bar-scores">' +
            t('score', 'Score') + ' <strong>' + score + '</strong>' +
            '&nbsp;&middot;&nbsp;' +
            t('best', 'Best') + ' <strong>' + Math.max(score, best || 0) + '</strong>' +
            (isNewBest ? '&nbsp;<span class="arc-scorecard__bar-newbest">\u2605 ' + t('arcNewBest', 'New Best!') + '</span>' : '') +
            (percentile ? '&nbsp;<span class="arc-scorecard__bar-percentile">' + percentile + '</span>' : '') +
          '</span>' +
        '</div>' +
        '<div class="arc-scorecard__actions">' +
          '<button class="arc-scorecard__btn arc-scorecard__btn--again" autofocus>' + t('arcPlayAgain', 'Play Again') + ' &#x25B6;</button>' +
          '<button class="arc-scorecard__btn arc-scorecard__btn--share" title="Copy share link">' + t('arcShare', 'Share') + '</button>' +
          '<a href="/arcade/" class="arc-scorecard__btn arc-scorecard__btn--home">' + t('arcHome', 'Home') + '</a>' +
          '<button class="arc-scorecard__close" type="button" aria-label="Dismiss" title="Dismiss (Esc)">×</button>' +
        '</div>' +
      '</div>';

    overlay.innerHTML = html;

    /* Share button — viral hook text */
    overlay.querySelector('.arc-scorecard__btn--share').addEventListener('click', function () {
      var text = getShareHook(score, game.name) + '\nhttps://slayplay.io/' + gameId + '/';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          this.textContent = t('arcCopied', 'Copied!');
          setTimeout(function () { this.textContent = t('arcShare', 'Share'); }.bind(this), 2000);
        }.bind(this)).catch(function () {
          this.textContent = t('arcShare', 'Share');
        }.bind(this));
      }
    });

    /* Play again button — instant restart, zero friction */
    var againBtn = overlay.querySelector('.arc-scorecard__btn--again');
    function dismissOverlay() {
      if (overlay.parentNode) overlay.remove();
      document.removeEventListener('keydown', restartOnKey);
      if (_scoreCardKeyHandler === restartOnKey) _scoreCardKeyHandler = null;
    }
    function doRestart() {
      dismissOverlay();
      document.dispatchEvent(new CustomEvent('arcade-restart'));
    }
    againBtn.addEventListener('click', doRestart);

    /* Close button — dismiss the bar without restarting */
    var closeBtn = overlay.querySelector('.arc-scorecard__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dismissOverlay();
      });
    }

    /* Keyboard: Space/Enter to restart, Esc to dismiss */
    function restartOnKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        doRestart();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dismissOverlay();
      }
    }
    _scoreCardKeyHandler = restartOnKey;
    setTimeout(function() {
      /* Only attach if this scorecard is still the active one */
      if (_scoreCardKeyHandler === restartOnKey) {
        document.addEventListener('keydown', restartOnKey);
      }
    }, 300); /* small delay so the key that ended the game doesn't trigger restart */

    var homeLink = overlay.querySelector('.arc-scorecard__btn--home');
    if (homeLink) {
      homeLink.addEventListener('click', dismissOverlay);
    }

    requestAnimationFrame(function () {
      overlay.classList.add('arc-scorecard--show');
      againBtn.focus();
    });

    return overlay;
  }

  /* ── Challenge banner (shown when opening a challenge link) ── */
  function showChallengeBanner() {
    var challenge = decodeChallengeLink();
    if (!challenge) return;
    var game = GAMES[challenge.gameId];
    if (!game) return;

    var banner = document.createElement('div');
    banner.className = 'arc-challenge-banner';
    banner.innerHTML =
      '<div class="arc-challenge-banner__inner">' +
        '<span class="arc-challenge-banner__icon">\u2694\uFE0F</span>' +
        '<div class="arc-challenge-banner__text">' +
          '<strong>' + challenge.nickname + '</strong> scored <strong>' + challenge.score + '</strong> on ' + game.name + '.' +
          '<br>Think you can beat them?' +
        '</div>' +
        '<button class="arc-challenge-banner__close">\u2715</button>' +
      '</div>';

    banner.querySelector('.arc-challenge-banner__close').addEventListener('click', function () {
      banner.remove();
    });

    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('arc-challenge-banner--show'); });
  }

  /* ── Nav HUD ── */
  function injectNavHUD() {
    /* Don't inject twice */
    if (document.querySelector('.arc-nav')) return;

    var isGamePage = window.location.pathname.split('/').filter(Boolean).length >= 1
      && window.location.pathname !== '/'
      && !['profile', 'shop', 'achievements', 'leaderboard-page'].some(function (p) {
        return window.location.pathname.indexOf('/' + p) === 0;
      });

    var isHubPage = !isGamePage;
    var coins = getState().coins;
    var streak = getStreak();

    var nav = document.createElement('nav');
    nav.className = 'arc-nav' + (isGamePage ? ' arc-nav--compact' : '');

    /* Check streak status for urgency indicator */
    var streakAtRisk = streak.streak >= 3 && streak.lastDate !== today();
    var streakClass = streakAtRisk ? ' arc-nav__streak--atrisk' : (streak.streak >= 7 ? ' arc-nav__streak--hot' : '');
    var activeEvent = getActiveEvent();

    /* Pending daily challenges count */
    var challenges = getDailyChallenges();
    var pendingCount = challenges.filter(function(c) { return !c.completed; }).length;

    /* Equipped badge + title for HUD */
    var shop = getShop();
    var equippedBadgeItem = shop.equipped.badge ? SHOP_ITEMS.find(function(i) { return i.id === shop.equipped.badge; }) : null;
    var equippedTitleItem = shop.equipped.title ? SHOP_ITEMS.find(function(i) { return i.id === shop.equipped.title; }) : null;
    var adminMode = isAdminMode();
    var badgeHtml = equippedBadgeItem ? '<div class="arc-nav__badge arc-nav__badge--' + (equippedBadgeItem.rarity || 'common') + '" title="' + equippedBadgeItem.name + '">' + equippedBadgeItem.icon + '</div>' : '';
    var titleHtml = equippedTitleItem ? '<div class="arc-nav__title">' + equippedTitleItem.label + '</div>' : '';
    var adminHtml = adminMode ? '<div class="arc-nav__admin" title="Admin mode active — click to disable" id="arcAdminIndicator">🔑 ADMIN</div>' : '';

    if (isGamePage) {
      nav.innerHTML =
        '<a href="/arcade/" class="arc-nav__link arc-nav__link--home" title="Home">&#x1F3E0;</a>' +
        '<div class="arc-nav__right">' +
          adminHtml +
          (activeEvent ? '<div class="arc-nav__event">' + activeEvent.label + '</div>' : '') +
          (streak.streak > 0 ? '<div class="arc-nav__streak' + streakClass + '" title="' + streak.streak + '-day streak' + (streakAtRisk ? ' — AT RISK!' : '') + '">&#x1F525; ' + streak.streak + '</div>' : '') +
          '<div class="arc-nav__coins"><span class="arc-coin-icon">&#x1FA99;</span> <span class="arc-coin-value">' + coins + '</span></div>' +
        '</div>';
    } else {
      nav.innerHTML =
        '<div class="arc-nav__left">' +
          '<a href="/arcade/" class="arc-nav__link' + (window.location.pathname === '/' ? ' arc-nav__link--active' : '') + '">' + t('arcNavGames', 'Games') + '</a>' +
          '<a href="/arcade/achievements/" class="arc-nav__link' + (window.location.pathname.indexOf('/achievements') === 0 ? ' arc-nav__link--active' : '') + '">' + t('achievements', 'Achievements') + '</a>' +
          '<a href="/arcade/shop/" class="arc-nav__link' + (window.location.pathname.indexOf('/shop') === 0 ? ' arc-nav__link--active' : '') + '">' + t('arcNavShop', 'Shop') + '</a>' +
          '<a href="/arcade/leaderboard-page/" class="arc-nav__link' + (window.location.pathname.indexOf('/leaderboard-page') === 0 ? ' arc-nav__link--active' : '') + '">' + t('leaderboard', 'Leaderboard') + '</a>' +
          '<a href="/arcade/profile/" class="arc-nav__link' + (window.location.pathname.indexOf('/profile') === 0 ? ' arc-nav__link--active' : '') + '">' + t('arcNavProfile', 'Profile') + '</a>' +
        '</div>' +
        '<div class="arc-nav__right">' +
          adminHtml +
          titleHtml +
          badgeHtml +
          (activeEvent ? '<div class="arc-nav__event">' + activeEvent.label + '</div>' : '') +
          (pendingCount > 0 ? '<div class="arc-nav__challenges" title="' + pendingCount + ' challenges remaining">📋 ' + pendingCount + '</div>' : '') +
          (streak.streak > 0 ? '<div class="arc-nav__streak' + streakClass + '" title="' + streak.streak + '-day streak' + (streakAtRisk ? ' — AT RISK!' : '') + '">&#x1F525; ' + streak.streak + '</div>' : '') +
          '<div class="arc-nav__coins"><span class="arc-coin-icon">&#x1FA99;</span> <span class="arc-coin-value">' + coins + '</span></div>' +
        '</div>';
    }

    document.body.prepend(nav);
    applyTheme();

    /* Streak countdown — show hours remaining until midnight if streak is at risk */
    if (streakAtRisk) {
      var streakEl = nav.querySelector('.arc-nav__streak--atrisk');
      if (streakEl) {
        function updateStreakCountdown() {
          var now = new Date();
          var midnight = new Date(now);
          midnight.setUTCHours(24, 0, 0, 0);
          var msLeft = midnight - now;
          var hoursLeft = Math.floor(msLeft / 3600000);
          var minsLeft = Math.floor((msLeft % 3600000) / 60000);
          var label = hoursLeft > 0
            ? hoursLeft + 'h left'
            : minsLeft + 'm left';
          streakEl.title = streak.streak + '-day streak — AT RISK! ' + label;
          /* Show inline countdown */
          var countdownSpan = streakEl.querySelector('.streak-countdown');
          if (!countdownSpan) {
            countdownSpan = document.createElement('span');
            countdownSpan.className = 'streak-countdown';
            streakEl.appendChild(countdownSpan);
          }
          countdownSpan.textContent = ' (' + label + ')';
        }
        updateStreakCountdown();
        setInterval(updateStreakCountdown, 60000);
      }
    }

    /* Admin indicator click — toggle off */
    var adminEl = nav.querySelector('#arcAdminIndicator');
    if (adminEl) {
      adminEl.addEventListener('click', function() {
        deactivateAdminMode();
        adminEl.remove();
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     PLAYER MEMORY — The game remembers YOU
     ═══════════════════════════════════════════════════════════════ */

  function getPlayerMemory() {
    return loadJSON('arcade_memory', {
      firstVisit: null,
      totalVisits: 0,
      lastVisitDate: null,
      sessionScores: {},      /* gameId -> [last 5 scores] */
      deathZones: {},          /* gameId -> { lowScoreCount, highScoreCount } */
      longestAbsence: 0,
      comebacks: 0,
      midnightPlays: 0,
      zeroScoreCount: 0,
      perfectStreakGames: 0,   /* games where every score improved */
      secretsFound: [],
    });
  }
  function setPlayerMemory(m) { saveJSON('arcade_memory', m); }

  function updatePlayerMemory(gameId, score) {
    var m = getPlayerMemory();
    var d = today();

    /* Track session scores (keep last 5 per game) */
    if (!m.sessionScores[gameId]) m.sessionScores[gameId] = [];
    m.sessionScores[gameId].push(score);
    if (m.sessionScores[gameId].length > 5) m.sessionScores[gameId].shift();

    /* Detect struggle zones */
    if (!m.deathZones[gameId]) m.deathZones[gameId] = { low: 0, high: 0, total: 0 };
    m.deathZones[gameId].total++;
    var game = GAMES[gameId];
    if (game && game.thresholds) {
      if (score < game.thresholds[0] * 0.5) m.deathZones[gameId].low++;
      if (score >= game.thresholds[1]) m.deathZones[gameId].high++;
    }

    /* Track zero scores */
    if (score === 0) m.zeroScoreCount = (m.zeroScoreCount || 0) + 1;

    /* Midnight plays */
    var hour = new Date().getHours();
    if (hour >= 0 && hour < 4) m.midnightPlays = (m.midnightPlays || 0) + 1;

    setPlayerMemory(m);
  }

  function recordVisit() {
    var m = getPlayerMemory();
    var d = today();
    if (!m.firstVisit) m.firstVisit = d;

    /* Calculate absence */
    if (m.lastVisitDate && m.lastVisitDate !== d) {
      var last = new Date(m.lastVisitDate);
      var now = new Date(d);
      var diffDays = Math.floor((now - last) / 86400000);
      if (diffDays > (m.longestAbsence || 0)) m.longestAbsence = diffDays;
      if (diffDays > 2) m.comebacks = (m.comebacks || 0) + 1;
    }

    m.totalVisits = (m.totalVisits || 0) + 1;
    m.lastVisitDate = d;
    setPlayerMemory(m);
  }

  /* ── Welcome Back Messages — creepy in a good way ── */
  function getWelcomeBackMessage() {
    var m = getPlayerMemory();
    var s = getState();
    var streak = getStreak();
    var d = today();
    var messages = [];

    /* First ever visit */
    if (s.totalGamesPlayed === 0) {
      return { icon: '👋', text: 'Fresh meat. Pick a game. We dare you.', type: 'welcome' };
    }

    /* Streak broken */
    if (streak.streak === 0 && s.totalGamesPlayed > 5) {
      messages.push({ icon: '😈', text: 'Welcome back. Your streak? Dead. Start a new one.', type: 'streak' });
    }
    if (streak.streak === 1 && m.lastVisitDate && m.lastVisitDate !== d) {
      var last = new Date(m.lastVisitDate);
      var diffDays = Math.floor((new Date(d) - last) / 86400000);
      if (diffDays >= 3) {
        messages.push({ icon: '👀', text: 'Gone for ' + diffDays + ' days... we noticed.', type: 'absence' });
      }
      if (diffDays >= 7) {
        messages.push({ icon: '💀', text: diffDays + ' days?! We almost deleted your profile. (jk... maybe)', type: 'absence' });
      }
    }

    /* Streak at risk */
    if (streak.streak >= 3 && streak.lastDate !== d) {
      var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      if (streak.lastDate === yesterday.toISOString().slice(0, 10)) {
        messages.push({ icon: '⚠️', text: 'Your ' + streak.streak + '-day streak dies at midnight. Just saying.', type: 'urgency' });
      }
    }

    /* Hot streak */
    if (streak.streak >= 7) {
      messages.push({ icon: '🔥', text: streak.streak + '-day streak. You\'re scaring the other players.', type: 'flex' });
    }

    /* Improvement trend */
    var favGame = null;
    var maxPlays = 0;
    Object.keys(s.gamesPlayed || {}).forEach(function(gid) {
      if (s.gamesPlayed[gid] > maxPlays) { maxPlays = s.gamesPlayed[gid]; favGame = gid; }
    });
    if (favGame && m.sessionScores[favGame] && m.sessionScores[favGame].length >= 3) {
      var scores = m.sessionScores[favGame];
      var recent = scores.slice(-3);
      var improving = recent[2] > recent[1] && recent[1] > recent[0];
      var declining = recent[2] < recent[1] && recent[1] < recent[0];
      if (improving) {
        messages.push({ icon: '📈', text: 'Your ' + GAMES[favGame].name + ' scores are climbing. Keep going.', type: 'growth' });
      }
      if (declining) {
        messages.push({ icon: '📉', text: 'Your ' + GAMES[favGame].name + ' scores dropped 3 in a row. Slump?', type: 'challenge' });
      }
    }

    /* Struggle detection */
    if (favGame && m.deathZones[favGame] && m.deathZones[favGame].total >= 5) {
      var dz = m.deathZones[favGame];
      var lowRate = dz.low / dz.total;
      if (lowRate > 0.6) {
        messages.push({ icon: '🧠', text: 'You keep dying early in ' + GAMES[favGame].name + '. Slow down and survive the first 10 seconds.', type: 'tip' });
      }
    }

    /* Comeback */
    if ((m.comebacks || 0) >= 2) {
      messages.push({ icon: '🔄', text: 'You keep leaving and coming back. We knew you couldn\'t resist.', type: 'attachment' });
    }

    /* Night owl */
    if ((m.midnightPlays || 0) >= 3) {
      messages.push({ icon: '🦉', text: 'Playing at midnight again? Your sleep schedule disapproves.', type: 'personality' });
    }

    /* Coin hoarder */
    if (s.coins >= 500 && (s.totalCoinsSpent || 0) < 50) {
      messages.push({ icon: '🐉', text: s.coins + ' coins and nothing spent. The shop is right there.', type: 'nudge' });
    }

    /* Quest progress tease */
    var quest = getQuestProgress();
    if (quest.nextTier && quest.progress >= 80) {
      messages.push({ icon: quest.icon, text: 'Almost ' + quest.nextTier.title + ' rank. ' + Math.round(100 - quest.progress) + '% to go.', type: 'quest' });
    }

    if (!messages.length) {
      var generic = [
        { icon: '⚡', text: 'Back for more punishment? Good.', type: 'personality' },
        { icon: '🎮', text: 'The arcade missed you. (The games didn\'t. They\'re ruthless.)', type: 'personality' },
        { icon: '😏', text: 'Let\'s see if you\'ve gotten any better.', type: 'personality' },
        { icon: '🎯', text: s.totalGamesPlayed + ' games played. How many before you\'re actually good?', type: 'personality' },
      ];
      messages = generic;
    }

    return messages[Math.floor(Math.random() * messages.length)];
  }

  function showWelcomeBack() {
    var msg = getWelcomeBackMessage();
    if (!msg) return;

    var toast = document.createElement('div');
    toast.className = 'arc-welcome-toast';
    toast.innerHTML =
      '<div class="arc-welcome-toast__icon">' + msg.icon + '</div>' +
      '<div class="arc-welcome-toast__text">' + msg.text + '</div>' +
      '<button class="arc-welcome-toast__close">&times;</button>';
    toast.querySelector('.arc-welcome-toast__close').addEventListener('click', function() {
      toast.classList.remove('arc-welcome-toast--show');
      setTimeout(function() { toast.remove(); }, 400);
    });
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('arc-welcome-toast--show'); }, 800);
    setTimeout(function() {
      toast.classList.remove('arc-welcome-toast--show');
      setTimeout(function() { toast.remove(); }, 400);
    }, 8000);
  }

  /* ═══════════════════════════════════════════════════════════════
     RETURN TRIGGERS — Make them think about it later
     ═══════════════════════════════════════════════════════════════ */

  function getReturnTrigger() {
    var s = getState();
    var streak = getStreak();
    var quest = getQuestProgress();
    var triggers = [];

    /* Tomorrow's challenge teaser */
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowSeed = dateSeed(tomorrow.toISOString().slice(0, 10));
    var rng = mulberry32(tomorrowSeed);
    var scoreGames = GAME_IDS.filter(function(id) { return id !== 'unicorn-clicker'; });
    var tomorrowGame = scoreGames[Math.floor(rng() * scoreGames.length)];
    triggers.push('Tomorrow\'s challenge: ' + GAMES[tomorrowGame].name + '. Prepare yourself 👀');

    /* Streak milestone approaching */
    if (streak.streak > 0) {
      var nextMilestone = [3, 7, 14, 30].find(function(m) { return streak.streak < m; });
      if (nextMilestone) {
        var daysLeft = nextMilestone - streak.streak;
        if (daysLeft <= 3) {
          triggers.push(daysLeft + ' more day' + (daysLeft > 1 ? 's' : '') + ' until ' + nextMilestone + '-day streak reward 🔥');
        }
      }
    }

    /* Time-locked tease */
    var hour = new Date().getHours();
    if (hour < 12) {
      triggers.push('Double Coins hour hits at noon UTC. Set a reminder 🧲');
    } else if (hour < 20) {
      triggers.push('Double Coins at 8pm UTC. Come back then for 2x rewards 💰');
    }

    /* Quest rank proximity */
    if (quest.nextTier && quest.progress >= 50) {
      triggers.push('You\'re ' + Math.round(100 - quest.progress) + '% from ' + quest.nextTier.icon + ' ' + quest.nextTier.title + ' rank');
    }

    /* Hidden achievement tease */
    var mem = getPlayerMemory();
    if (mem.midnightPlays === 0) {
      triggers.push('Some secrets only appear after midnight... 🌙');
    }
    if ((mem.zeroScoreCount || 0) < 3) {
      triggers.push('Have you tried... not trying? Some things reward failure.');
    }

    return triggers[Math.floor(Math.random() * triggers.length)];
  }

  /* ═══════════════════════════════════════════════════════════════
     HIDDEN ACHIEVEMENTS — "wait... what just happened???"
     ═══════════════════════════════════════════════════════════════ */

  var SECRET_ACHIEVEMENTS = [
    { id: 'night_crawler',   icon: '🌙', name: 'Night Crawler',     desc: 'Play 3 games between midnight and 4 AM',     reward: 75 },
    { id: 'the_fumbler',     icon: '🤡', name: 'The Fumbler',       desc: 'Score exactly 0 three times. Impressive.',    reward: 30 },
    { id: 'marathon_runner', icon: '🏃', name: 'Marathon Runner',   desc: 'Play 5 different games in one session',       reward: 50 },
    { id: 'coin_dragon',     icon: '🐉', name: 'Coin Dragon',       desc: 'Hoard 1000+ coins without spending any',     reward: 100 },
    { id: 'the_comeback',    icon: '🔄', name: 'The Comeback Kid',  desc: 'Return after 7+ days away',                  reward: 75 },
    { id: 'speed_demon',     icon: '⚡', name: 'Speed Demon',       desc: 'Play 3 games in under 5 minutes',            reward: 50 },
    { id: 'loyal_fan',       icon: '💝', name: 'Loyal Fan',         desc: 'Play the same game 20 times',                reward: 60 },
    { id: 'jack_of_all',     icon: '🃏', name: 'Jack of All Trades',desc: 'Score above average in 10 different games',  reward: 150 },
    { id: 'perfectionist',   icon: '✨', name: 'Perfectionist',     desc: 'Beat your personal best 5 times in a row',   reward: 100 },
    { id: 'the_grinder',     icon: '⚙️', name: 'The Grinder',       desc: 'Play 100 total games',                       reward: 200 },
  ];

  function checkSecretAchievements(gameId, score, isNewBest) {
    var mem = getPlayerMemory();
    var s = getState();
    var newSecrets = [];

    /* Lazy init */
    if (!mem.secretsFound) mem.secretsFound = [];
    if (!mem.consecutiveBests) mem.consecutiveBests = 0;
    if (!mem.sessionGameTimes) mem.sessionGameTimes = [];

    /* Track consecutive bests for perfectionist */
    if (isNewBest) {
      mem.consecutiveBests++;
    } else {
      mem.consecutiveBests = 0;
    }

    /* Track game times for speed demon */
    mem.sessionGameTimes.push(Date.now());
    /* Keep only last 10 */
    if (mem.sessionGameTimes.length > 10) mem.sessionGameTimes = mem.sessionGameTimes.slice(-10);

    var checks = {
      'night_crawler':   (mem.midnightPlays || 0) >= 3,
      'the_fumbler':     (mem.zeroScoreCount || 0) >= 3,
      'marathon_runner': (s.todayGamesPlayed || []).length >= 5,
      'coin_dragon':     s.coins >= 1000 && (s.totalCoinsSpent || 0) === 0,
      'the_comeback':    (mem.longestAbsence || 0) >= 7,
      'speed_demon':     (function() {
        var times = mem.sessionGameTimes;
        if (times.length < 3) return false;
        var last3 = times.slice(-3);
        return (last3[2] - last3[0]) < 300000; /* 5 minutes */
      })(),
      'loyal_fan':       (function() {
        var gp = s.gamesPlayed || {};
        return Object.keys(gp).some(function(k) { return gp[k] >= 20; });
      })(),
      'jack_of_all':     (function() {
        var aboveAvg = 0;
        Object.keys(GAMES).forEach(function(id) {
          var g = GAMES[id];
          if (g.bestKey && g.thresholds) {
            var best = Number(localStorage.getItem(g.bestKey)) || 0;
            if (best >= g.thresholds[0]) aboveAvg++;
          }
        });
        return aboveAvg >= 10;
      })(),
      'perfectionist':   mem.consecutiveBests >= 5,
      'the_grinder':     s.totalGamesPlayed >= 100,
    };

    SECRET_ACHIEVEMENTS.forEach(function(sa) {
      if (mem.secretsFound.indexOf(sa.id) === -1 && checks[sa.id]) {
        mem.secretsFound.push(sa.id);
        newSecrets.push(sa);
        addCoins(sa.reward);
        track('secret_achievement', { id: sa.id, name: sa.name });
      }
    });

    setPlayerMemory(mem);

    /* Show secret achievement popup (extra dramatic) */
    newSecrets.forEach(function(sa, i) {
      setTimeout(function() { showSecretAchievementPopup(sa); }, 1000 + i * 1500);
    });

    return newSecrets;
  }

  function showSecretAchievementPopup(sa) {
    var toast = document.createElement('div');
    toast.className = 'arc-secret-toast';
    toast.innerHTML =
      '<div class="arc-secret-toast__glitch">???</div>' +
      '<div class="arc-secret-toast__icon">' + sa.icon + '</div>' +
      '<div class="arc-secret-toast__body">' +
        '<div class="arc-secret-toast__label">SECRET UNLOCKED</div>' +
        '<div class="arc-secret-toast__name">' + sa.name + '</div>' +
        '<div class="arc-secret-toast__desc">' + sa.desc + '</div>' +
        '<div class="arc-secret-toast__reward">+' + sa.reward + ' coins</div>' +
      '</div>';
    document.body.appendChild(toast);

    /* Glitch effect then reveal */
    setTimeout(function() {
      toast.querySelector('.arc-secret-toast__glitch').style.display = 'none';
      toast.classList.add('arc-secret-toast--show');
    }, 300);

    requestAnimationFrame(function() { toast.classList.add('arc-secret-toast--enter'); });

    setTimeout(function() {
      toast.classList.remove('arc-secret-toast--show');
      toast.classList.add('arc-secret-toast--exit');
      setTimeout(function() { toast.remove(); }, 600);
    }, 5000);
  }

  /* ═══════════════════════════════════════════════════════════════
     MAKING LOSING ADDICTIVE — Every loss = progress
     ═══════════════════════════════════════════════════════════════ */

  function getLossProgressText(gameId, score, best) {
    var s = getState();
    var mem = getPlayerMemory();
    var game = GAMES[gameId];
    var lines = [];

    /* Improvement vs last run */
    if (s.previousScores && s.previousScores[gameId]) {
      var prev = s.previousScores[gameId];
      if (score > prev) {
        lines.push({ icon: '📈', text: '+' + (score - prev) + ' vs your last run' });
      } else if (score === prev) {
        lines.push({ icon: '🎯', text: 'Same as last time. Consistency.' });
      }
    }

    /* Total attempts on this game */
    var attempts = (s.gamesPlayed[gameId] || 0);
    if (attempts >= 3 && !lines.length) {
      lines.push({ icon: '💪', text: 'Attempt #' + attempts + '. Each one teaches you something.' });
    }

    /* Average score trend */
    if (mem.sessionScores[gameId] && mem.sessionScores[gameId].length >= 3) {
      var scores = mem.sessionScores[gameId];
      var avg = scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
      if (score > avg * 1.1) {
        lines.push({ icon: '⬆️', text: 'Above your average (' + Math.round(avg) + '). You\'re getting better.' });
      }
    }

    /* Energy — coins earned even on loss */
    if (score > 0) {
      lines.push({ icon: '🪙', text: 'Still earned coins. Every run counts.' });
    }

    return lines.length > 0 ? lines[0] : null;
  }

  /* ── Sync admin URL param check — runs immediately at script load time
        BEFORE any page inline scripts (which render the shop), so
        isAdminMode() is already true when renderShop() first runs ── */
  (function() {
    try {
      if (new URLSearchParams(window.location.search).get('admin') === 'slay2024') {
        localStorage.setItem('arc_admin', '1');
        adminUnlockAll();
        window.history.replaceState({}, '', window.location.pathname);
        /* Toast shown after DOM is ready */
        window._arcAdminJustActivated = true;
      }
    } catch(e) {}
  })();

  /* ── Auto-init ── */
  function autoInit() {
    if (window._arcAdminJustActivated) {
      delete window._arcAdminJustActivated;
      showAdminToast('🔑 Admin mode ON — all items unlocked!');
    }
    applyTheme();
    showChallengeBanner();
    checkOGBadge();
    recordVisit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  /* ── Expose global ── */
  window.Arcade = {
    onGameStart: onGameStart,
    onGameOver: onGameOver,
    getCoins: getCoins,
    spendCoins: spendCoins,
    checkStreak: checkStreak,
    getDailyChallenges: getDailyChallenges,
    getShopItems: getShopItems,
    purchaseItem: purchaseItem,
    equipItem: equipItem,
    getArcadeAchievements: getArcadeAchievements,
    createScoreCard: createScoreCard,
    getRandomGame: getRandomGame,
    injectNavHUD: injectNavHUD,
    getProfileData: getProfileData,
    getOGBadge: getOGBadge,
    decodeChallengeLink: decodeChallengeLink,
    showChallengeBanner: showChallengeBanner,
    getPercentileText: getPercentileText,
    getActiveEvent: getActiveEvent,
    getEquippedBadge: function() {
      var shop = getShop();
      if (!shop.equipped.badge) return null;
      var item = SHOP_ITEMS.find(function(i) { return i.id === shop.equipped.badge; });
      return item || null;
    },
    GAMES: GAMES,
    GAME_IDS: GAME_IDS,
    applyTheme: applyTheme,
    /* New systems */
    getQuestProgress: getQuestProgress,
    getSocialNudge: getSocialNudge,
    showPowerUpSelector: showPowerUpSelector,
    getActivePowerUp: getActivePowerUp,
    POWER_UPS: POWER_UPS,
    QUEST_MILESTONES: QUEST_MILESTONES,
    /* Psychology layer */
    showWelcomeBack: showWelcomeBack,
    getPlayerMemory: getPlayerMemory,
    getReturnTrigger: getReturnTrigger,
    SECRET_ACHIEVEMENTS: SECRET_ACHIEVEMENTS,
    /* Admin mode */
    isAdminMode: isAdminMode,
    activateAdminMode: activateAdminMode,
    deactivateAdminMode: deactivateAdminMode,
    adminUnlockAll: adminUnlockAll,
    /* Shop powers */
    getActiveShopPowerStatus: getActiveShopPowerStatus,
    getEquippedTitle: function() {
      var shop = getShop();
      if (!shop.equipped.title) return null;
      return SHOP_ITEMS.find(function(i) { return i.id === shop.equipped.title; }) || null;
    },
  };

})();

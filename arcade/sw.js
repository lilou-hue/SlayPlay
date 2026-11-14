const CACHE_NAME = 'slayplay-arcade-v38';

const PRECACHE_URLS = [
  '/arcade/',
  '/arcade/i18n.js',
  '/arcade/leaderboard.js',
  '/arcade/leaderboard.css',
  '/arcade/arcade.js',
  '/arcade/arcade.css',
  '/arcade/shop.js',
  '/arcade/shop.css',
  '/arcade/shop/',
  '/arcade/achievements/',
  '/arcade/leaderboard-page/',
  '/icon.svg',
  '/arcade/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/arcade/profile/',
  '/arcade/flappy-bird/',
  '/arcade/flappy-bird/script.js',
  '/arcade/flappy-bird/audio.js',
  '/arcade/flappy-bird/style.css',
  '/arcade/snake/',
  '/arcade/snake/game.js',
  '/arcade/snake/styles.css',
  '/arcade/tetris/',
  '/arcade/tetris/game.js',
  '/arcade/tetris/audio.js',
  '/arcade/tetris/styles.css',
  '/arcade/lumina/',
  '/arcade/lumina/game.js',
  '/arcade/lumina/styles.css',
  '/arcade/phantom-road/',
  '/arcade/phantom-road/game.js',
  '/arcade/phantom-road/styles.css',
  '/arcade/methane-drift/',
  '/arcade/methane-drift/game.js',
  '/arcade/methane-drift/audio.js',
  '/arcade/methane-drift/styles.css',
  '/arcade/gun-game/',
  '/arcade/gun-game/game.js',
  '/arcade/gun-game/audio.js',
  '/arcade/gun-game/styles.css',
  '/arcade/unicorn-clicker/',
  '/arcade/unicorn-clicker/game.js',
  '/arcade/unicorn-clicker/audio.js',
  '/arcade/unicorn-clicker/styles.css',
  '/arcade/astro-miner/',
  '/arcade/astro-miner/game.js',
  '/arcade/astro-miner/audio.js',
  '/arcade/astro-miner/styles.css',
  '/arcade/beat-drop/',
  '/arcade/beat-drop/game.js',
  '/arcade/beat-drop/styles.css',
  '/arcade/dress-up/',
  '/arcade/dress-up/game.js',
  '/arcade/dress-up/audio.js',
  '/arcade/dress-up/styles.css',
  '/arcade/inkognito/',
  '/arcade/inkognito/game.js',
  '/arcade/inkognito/audio.js',
  '/arcade/inkognito/styles.css',
  '/arcade/neon-pong/',
  '/arcade/neon-pong/game.js',
  '/arcade/neon-pong/styles.css',
  '/arcade/stack-tower/',
  '/arcade/stack-tower/game.js',
  '/arcade/stack-tower/styles.css',
  '/arcade/star-fury/',
  '/arcade/star-fury/game.js',
  '/arcade/star-fury/audio.js',
  '/arcade/star-fury/styles.css',
  '/arcade/rivals/',
  '/arcade/rivals/game.js',
  '/arcade/rivals/audio.js',
  '/arcade/rivals/styles.css',
  '/arcade/gravity-garden/',
  '/arcade/gravity-garden/game.js',
  '/arcade/gravity-garden/styles.css',
  '/arcade/wet-lab/',
  '/arcade/the-deep/',
  '/arcade/the-deep/game.js',
  '/arcade/the-deep/styles.css',
  '/arcade/spend/',
  '/arcade/spend/game.js',
  '/arcade/spend/styles.css',
  '/arcade/life-in-weeks/',
  '/arcade/life-in-weeks/game.js',
  '/arcade/life-in-weeks/styles.css',
  '/arcade/last-seen-online/',
  '/arcade/last-seen-online/game.js',
  '/arcade/last-seen-online/styles.css',
  '/arcade/art-of-doing-nothing/',
  '/arcade/art-of-doing-nothing/state.js',
  '/arcade/art-of-doing-nothing/dialogue-engine.js',
  '/arcade/art-of-doing-nothing/characters.js',
  '/arcade/art-of-doing-nothing/audio.js',
  '/arcade/art-of-doing-nothing/game.js',
  '/arcade/art-of-doing-nothing/styles.css',
  '/arcade/art-of-doing-nothing/scenes/chapter1.js',
  '/arcade/art-of-doing-nothing/scenes/chapter2.js',
  '/arcade/art-of-doing-nothing/scenes/chapter3.js',
  '/arcade/art-of-doing-nothing/scenes/chapter4.js',
  '/arcade/art-of-doing-nothing/scenes/chapter5.js',
  '/arcade/heart-serve/',
  '/arcade/heart-serve/game.js',
  '/arcade/heart-serve/audio.js',
  '/arcade/heart-serve/boys.js',
  '/arcade/heart-serve/styles.css',
  '/arcade/no-internet/',
  '/arcade/no-internet/game.js',
  '/arcade/no-internet/renderer.js',
  '/arcade/no-internet/art.js',
  '/arcade/no-internet/audio.js',
  '/arcade/no-internet/styles.css',
  // Versioned HTML references bypass static assets held by an older worker.
  '/arcade/no-internet/game.js?v=38',
  '/arcade/no-internet/renderer.js?v=38',
  '/arcade/no-internet/art.js?v=38',
  '/arcade/no-internet/audio.js?v=38',
  '/arcade/no-internet/styles.css?v=38',
];

// This optional pack has a procedural runtime fallback. Never block arcade updates on it.
const OPTIONAL_PAINTED_URLS = [
  '/arcade/no-internet/assets/painted/manifest.json',
  '/arcade/no-internet/assets/painted/manifest.json?v=38',
  '/arcade/no-internet/assets/painted/dino-atlas.webp',
  '/arcade/no-internet/assets/painted/dino-atlas.webp?v=38',
  '/arcade/no-internet/assets/painted/props-atlas.webp',
  '/arcade/no-internet/assets/painted/props-atlas.webp?v=38',
  '/arcade/no-internet/assets/painted/valley.webp',
  '/arcade/no-internet/assets/painted/valley.webp?v=38',
];

const NETWORK_FIRST_HOSTS = [
  'firebasedatabase.app',
  'googleapis.com',
  'gstatic.com',
];

function cachePaintedAsset(cache, url) {
  const controller = new AbortController();
  let timeout;
  return Promise.race([
    fetch(url, { signal: controller.signal })
      .then((response) => response.ok ? cache.put(url, response) : undefined)
      .catch(() => {}),
    new Promise((resolve) => {
      timeout = setTimeout(() => { controller.abort(); resolve(); }, 6000);
    }),
  ]).finally(() => clearTimeout(timeout));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all([
        cache.addAll(PRECACHE_URLS),
        Promise.all(OPTIONAL_PAINTED_URLS.map((url) => cachePaintedAsset(cache, url))),
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Pages that should always fetch fresh (network-first) */
const NETWORK_FIRST_PATHS = [
  '/arcade/',
  '/index.html',
  '/arcade/shop/',
  '/arcade/achievements/',
  '/arcade/leaderboard-page/',
  '/arcade/profile/',
];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for Firebase / external APIs
  if (NETWORK_FIRST_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for HTML pages (homepage, profile, shop, etc.)
  // This ensures new game cards and content updates appear immediately
  const pathname = url.pathname;
  const isNetworkFirst = NETWORK_FIRST_PATHS.some((p) => pathname === p)
    || (event.request.mode === 'navigate');

  if (isNetworkFirst) {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static game assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

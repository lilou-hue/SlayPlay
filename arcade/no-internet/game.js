(() => {
  'use strict';

  const game = document.getElementById('game');
  const fx = document.getElementById('fx');
  const ctx = game.getContext('2d');
  const fctx = fx.getContext('2d');
  const offline = document.getElementById('offline');
  const hint = document.getElementById('hint');
  const again = document.getElementById('again');
  const mute = document.getElementById('mute');

  const TAU = Math.PI * 2;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debugMode = new URLSearchParams(location.search).has('debug');
  const bestKey = 'a1NoInternetBest';
  const stageNames = [
    'NO INTERNET',
    'SOMETHING SAW YOU',
    'GRAVITY HAS LEFT THE CHAT',
    'NETWORK ADMINISTRATOR',
    'CONNECTION RESTORED?'
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let groundY = 0;
  let ceilingY = 22;
  let last = performance.now();
  let audio = null;
  let muted = localStorage.getItem('a1NoInternetMuted') === '1';
  let beatClock = 0;

  const state = {
    mode: 'idle',
    t: 0,
    score: 0,
    best: Number(localStorage.getItem(bestKey) || 0),
    speed: 320,
    stage: 0,
    stageTime: 0,
    transition: 0,
    transitionLine: '',
    spawnIn: 1.2,
    obstacles: [],
    particles: [],
    stars: [],
    clouds: [],
    shake: 0,
    flash: 0,
    chroma: 0,
    health: 3,
    combo: 0,
    comboTimer: 0,
    bossHp: 10,
    bossHit: 0,
    bossSpawn: 0,
    bossAttackIn: 0,
    bossAttackKind: 'firewall',
    won: false,
    invincible: 0,
    gravityFlip: false,
    flipTimer: 0,
    remixMode: 'smash',
    remixTimer: 8,
    glitchWord: '',
    glitchTimer: 0,
    deaths: 0
  };

  const player = {
    x: 0,
    y: 0,
    w: 46,
    h: 54,
    vy: 0,
    grounded: true,
    dash: 0,
    dashAvailable: true,
    run: 0,
    blink: 0,
    look: 0,
    hurt: 0
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  function chance(p) { return Math.random() < p; }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    for (const canvas of [game, fx]) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.imageSmoothingEnabled = false;
    }
    groundY = Math.round(height * (width < 700 ? 0.7 : 0.72));
    ceilingY = width < 700 ? 56 : 22;
    player.x = Math.max(48, width * 0.18);
    if (state.mode === 'idle') player.y = groundY - player.h;
    else if (player.grounded) player.y = state.gravityFlip ? ceilingY : groundY - player.h;
    offline.style.top = Math.max(58, groundY - 250) + 'px';
    hint.style.top = Math.min(height - 70, groundY + 52) + 'px';
    seedSky();
  }

  function seedSky() {
    state.stars = Array.from({ length: Math.min(140, Math.round(width / 9)) }, () => ({
      x: Math.random() * width,
      y: Math.random() * groundY * 0.92,
      z: rand(.3, 1),
      tw: Math.random() * TAU
    }));
    state.clouds = Array.from({ length: 5 }, (_, i) => ({
      x: (i / 5) * width + rand(0, 150),
      y: rand(70, Math.max(100, groundY - 180)),
      s: rand(.65, 1.3)
    }));
  }

  function reset(startNow = false) {
    state.mode = startNow ? 'running' : 'idle';
    state.t = 0;
    state.score = 0;
    state.speed = 320;
    state.stage = 0;
    state.stageTime = 0;
    state.transition = 0;
    state.transitionLine = '';
    state.spawnIn = 1.25;
    state.obstacles.length = 0;
    state.particles.length = 0;
    state.shake = 0;
    state.flash = 0;
    state.chroma = 0;
    state.health = 3;
    state.combo = 0;
    state.comboTimer = 0;
    state.bossHp = 10;
    state.bossHit = 0;
    state.bossSpawn = 0;
    state.bossAttackIn = 0;
    state.bossAttackKind = 'firewall';
    state.remixMode = 'smash';
    state.remixTimer = 8;
    state.won = false;
    state.invincible = startNow ? 1.2 : 0;
    state.gravityFlip = false;
    state.flipTimer = 5;
    state.glitchWord = '';
    state.glitchTimer = 0;
    player.y = groundY - player.h;
    player.vy = 0;
    player.grounded = true;
    player.dash = 0;
    player.dashAvailable = true;
    player.run = 0;
    player.look = 0;
    player.hurt = 0;
    offline.classList.toggle('gone', startNow);
    hint.classList.toggle('gone', startNow);
    document.querySelectorAll('.arc-scorecard').forEach(card => card.remove());
    if (startNow) {
      if (typeof Arcade !== 'undefined') Arcade.onGameStart('no-internet');
      ensureAudio();
      sound('start');
    }
  }

  function start() {
    if (state.mode === 'idle' || state.mode === 'dead') reset(true);
  }

  function action() {
    if (state.mode !== 'running') {
      start();
      return;
    }
    ensureAudio();
    if (state.transition > 0.2) return;

    if (state.stage === 2 || (state.stage === 4 && state.remixMode === 'gravity')) {
      state.gravityFlip = !state.gravityFlip;
      const surfaceGap = Math.max(80, groundY - player.h - ceilingY);
      const launchSpeed = Math.sqrt(2 * 1900 * surfaceGap) * 1.08;
      player.vy = state.gravityFlip ? -launchSpeed : launchSpeed;
      player.grounded = false;
      state.glitchWord = state.gravityFlip ? 'CEILING ROUTE' : 'FLOOR ROUTE';
      state.glitchTimer = .65;
      burst(player.x + player.w / 2, player.y + player.h / 2, stageColor(), 10, 170);
      sound('break');
      return;
    }

    if (player.grounded) {
      player.vy = state.gravityFlip ? 690 : -690;
      player.grounded = false;
      player.look = Math.max(player.look, .8);
      burst(player.x + 18, player.y + player.h, '#777', 6, 100);
      sound('jump');
    } else if (state.stage >= 1 && state.stage !== 2 && player.dash <= 0 && player.dashAvailable) {
      player.dash = .3;
      player.dashAvailable = false;
      player.vy *= .15;
      player.look = Math.max(player.look, 1);
      state.glitchWord = 'AIR SMASH';
      state.glitchTimer = .45;
      state.shake = Math.max(state.shake, 5);
      burst(player.x + player.w / 2, player.y + player.h / 2, stageColor(), 16, 230);
      sound('dash');
    }
  }

  function ensureAudio() {
    if (muted) return;
    if (!audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audio = new AudioContext();
    }
    if (audio.state === 'suspended') audio.resume();
  }

  function tone(freq, duration, type = 'square', volume = .045, slide = 0) {
    if (muted || !audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(25, freq + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function noise(duration = .08, volume = .03) {
    if (muted || !audio) return;
    const count = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, count, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / count);
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(audio.destination);
    source.start();
  }

  function sound(name) {
    if (muted) return;
    ensureAudio();
    if (!audio) return;
    if (name === 'jump') tone(220, .11, 'square', .04, 180);
    if (name === 'dash') { tone(120, .12, 'sawtooth', .05, 600); noise(.07, .025); }
    if (name === 'hit') { tone(85, .2, 'sawtooth', .07, -45); noise(.18, .06); }
    if (name === 'break') { tone(55, .7, 'sawtooth', .065, 440); setTimeout(() => tone(880, .2, 'square', .04, -400), 180); }
    if (name === 'punch') { tone(70, .09, 'square', .08, -30); noise(.11, .075); }
    if (name === 'start') tone(330, .08, 'square', .03, 110);
    if (name === 'dead') { tone(180, .5, 'sawtooth', .055, -145); }
    if (name === 'win') {
      [261, 329, 392, 523].forEach((f, i) => setTimeout(() => tone(f, .22, 'square', .04, 80), i * 100));
    }
  }

  function music(dt) {
    if (muted || !audio || state.mode !== 'running' || state.stage === 0) return;
    beatClock -= dt;
    if (beatClock > 0) return;
    const pace = state.stage >= 3 ? .22 : state.stage === 2 ? .32 : .42;
    beatClock = pace;
    const root = state.stage >= 3 ? 55 : 73;
    tone(root * (chance(.25) ? 2 : 1), .055, 'square', state.stage >= 3 ? .018 : .012, 0);
    if (state.stage >= 2 && chance(.35)) tone(root * 3, .035, 'triangle', .009, -20);
  }

  function stageColor() {
    return ['#535353', '#ff2f92', '#3cf4ff', '#ff4b24', '#b8ff38'][state.stage] || '#fff';
  }

  function enterStage(next) {
    state.stage = next;
    state.stageTime = 0;
    state.transition = next === 3 ? 4.2 : 3.2;
    state.transitionLine = stageNames[next];
    state.obstacles.length = 0;
    state.spawnIn = 1.2;
    player.dash = 0;
    player.dashAvailable = true;
    state.invincible = Math.max(state.invincible, state.transition + 1);
    if (next === 2 || next === 3 || next === 4) {
      state.gravityFlip = false;
      player.y = groundY - player.h;
      player.vy = 0;
      player.grounded = true;
    }
    if (next === 3) {
      state.bossAttackIn = 2.4;
      state.bossAttackKind = 'firewall';
    }
    if (next === 4) {
      state.remixMode = 'smash';
      state.remixTimer = 8;
      state.bossAttackIn = 2.2;
    }
    state.flash = 1;
    state.chroma = 1;
    player.look = 1;
    if (next === 1) state.glitchWord = 'IT NOTICED';
    if (next === 2) state.glitchWord = 'CHOOSE YOUR SURFACE';
    if (next === 3) state.glitchWord = 'ADMIN JOINED';
    state.glitchTimer = 2.4;
    sound('break');
    burst(width * .5, height * .45, stageColor(), reducedMotion ? 20 : 70, 420);
  }

  function updateStage() {
    if (state.stage === 0 && state.score >= 105) enterStage(1);
    else if (state.stage === 1 && state.score >= 275) enterStage(2);
    else if (state.stage === 2 && state.score >= 500) enterStage(3);
  }

  function spawnObstacle() {
    const x = width + 70;
    let type = 'cactus';
    if (state.stage === 0) {
      type = chance(.22) && state.score > 35 ? 'bird' : 'cactus';
    } else if (state.stage === 1) {
      type = pick(['cactus', 'bird', 'eye', 'shard']);
    } else if (state.stage === 2) {
      type = pick(['gate', 'gate', 'gate', 'rock', 'drone']);
    } else if (state.stage === 3) {
      type = state.bossHp > 0 ? pick(['packet', 'packet', 'wave', 'drone']) : pick(['eye', 'packet', 'shard', 'wave']);
    } else {
      if (state.remixMode === 'gravity') type = pick(['gate', 'gate', 'gate', 'rock', 'drone']);
      else if (state.remixMode === 'boss') type = pick(['packet', 'packet', 'wave', 'drone']);
      else type = pick(['packet', 'eye', 'shard', 'bird']);
    }

    const o = { type, x, y: 0, w: 36, h: 54, phase: Math.random() * TAU, hit: false, spin: rand(-3, 3) };
    if (type === 'cactus') { o.w = chance(.35) ? 48 : 28; o.h = rand(45, 67); o.y = groundY - o.h; }
    if (type === 'bird') { o.w = 48; o.h = 28; o.y = groundY - pick([72, 104, 135]); }
    if (type === 'eye') { o.w = 52; o.h = 38; o.y = groundY - rand(92, 180); }
    if (type === 'shard') { o.w = 32; o.h = 48; o.y = groundY - rand(60, 170); }
    if (type === 'rock') {
      o.w = 50; o.h = 50; o.surface = chance(.5) ? 'floor' : 'ceiling';
      o.y = o.surface === 'ceiling' ? ceilingY + 2 : groundY - 50;
    }
    if (type === 'gate') {
      o.w = 58; o.h = 82; o.surface = chance(.5) ? 'floor' : 'ceiling';
      o.y = o.surface === 'ceiling' ? ceilingY : groundY - o.h;
    }
    if (type === 'drone') { o.w = 58; o.h = 32; o.y = groundY - rand(90, 165); }
    if (type === 'wave') { o.w = 58; o.h = 22; o.y = state.gravityFlip ? ceilingY : groundY - 22; }
    if (type === 'packet') { o.w = 45; o.h = 45; o.y = groundY - rand(62, 180); }
    state.obstacles.push(o);
  }

  function spawnBossAttack() {
    const x = width + Math.max(100, state.speed * .35);
    const type = state.bossAttackKind;
    const o = {
      type, x, y: type === 'firewall' ? groundY - 112 : groundY - 158,
      w: type === 'firewall' ? 58 : 100,
      h: type === 'firewall' ? 112 : 14,
      warning: Math.max(.75, (x - player.x) / state.speed - .18),
      phase: 0, hit: false, bossAttack: true
    };
    state.obstacles.push(o);
    state.spawnIn = Math.max(state.spawnIn, 1.2);
    state.bossAttackKind = type === 'firewall' ? 'laser' : 'firewall';
    state.glitchWord = type === 'firewall' ? 'FIREWALL INCOMING — JUMP' : 'LASER INCOMING — STAY LOW';
    state.glitchTimer = 1.1;
  }

  function isSolidObstacle(type) {
    return type === 'rock' || type === 'wave' || type === 'gate' || type === 'firewall' || type === 'laser';
  }

  function burst(x, y, color, count = 12, speed = 180) {
    count = reducedMotion ? Math.ceil(count * .35) : count;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = Math.random() * speed;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(.25, .8),
        max: 1,
        size: rand(2, 7),
        color
      });
    }
  }

  function hitPlayer(o) {
    if (state.invincible > 0 || o.hit) return;
    o.hit = true;
    state.health--;
    state.invincible = Math.max(state.invincible, 1.45);
    player.hurt = .8;
    player.look = Math.max(player.look, 1.4);
    state.shake = 18;
    state.flash = 1;
    state.chroma = 1;
    state.combo = 0;
    sound('hit');
    burst(player.x + player.w / 2, player.y + player.h / 2, '#ff244f', 30, 340);
    if (state.health <= 0) die();
  }

  function destroyObstacle(o) {
    if (o.hit) return;
    o.hit = true;
    o.dead = true;
    state.combo++;
    state.comboTimer = 2;
    if (player.dash > 0) {
      player.dashAvailable = true;
      state.glitchWord = 'SMASH REFUND';
      state.glitchTimer = .7;
    }
    state.score += 8 + state.combo * 2;
    state.shake = Math.max(state.shake, 11);
    state.flash = Math.max(state.flash, .3);
    sound('punch');
    burst(o.x + o.w / 2, o.y + o.h / 2, o.type === 'packet' ? '#ff512f' : stageColor(), 24, 320);
    if (state.stage === 3 && o.type === 'packet' && state.bossHp > 0) {
      state.bossHp--;
      state.bossHit = .55;
      state.glitchWord = state.bossHp > 0 ? `${state.bossHp} PACKETS LEFT` : 'ACCESS DENIED';
      state.glitchTimer = .9;
      if (state.bossHp <= 0) winBoss();
    }
  }

  function winBoss() {
    state.won = true;
    state.stage = 4;
    state.stageTime = 0;
    state.transition = 5;
    state.transitionLine = 'CONNECTION RESTORED?';
    state.remixMode = 'smash';
    state.remixTimer = 8;
    state.bossAttackIn = 2.2;
    state.invincible = Math.max(state.invincible, 6);
    state.gravityFlip = false;
    player.y = groundY - player.h;
    player.vy = 0;
    player.grounded = true;
    state.obstacles.length = 0;
    state.flash = 1;
    state.chroma = 1;
    sound('win');
    burst(width * .72, height * .28, '#b8ff38', 100, 520);
  }

  function die() {
    state.mode = 'dead';
    state.deaths++;
    const finalScore = Math.floor(state.score);
    const previousBest = state.best;
    let scoreCard = null;
    if (typeof Arcade !== 'undefined') {
      Arcade.onGameOver('no-internet', finalScore);
      scoreCard = Arcade.createScoreCard('no-internet', finalScore, previousBest);
    }
    state.best = Math.max(state.best, finalScore);
    localStorage.setItem(bestKey, String(state.best));
    hint.textContent = 'Press space or tap to try again';
    hint.classList.remove('gone');
    state.shake = 22;
    sound('dead');
    if (scoreCard) document.body.appendChild(scoreCard);
  }

  function playerBox() {
    return { x: player.x + 8, y: player.y + 5, w: player.w - 14, h: player.h - 8 };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    state.t += dt;
    state.flash = Math.max(0, state.flash - dt * 2.4);
    state.chroma = Math.max(0, state.chroma - dt * 1.5);
    state.shake = Math.max(0, state.shake - dt * 28);
    state.glitchTimer = Math.max(0, state.glitchTimer - dt);
    player.blink -= dt;
    if (player.blink < -rand(1.5, 4)) player.blink = .1;

    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 340 * dt;
      p.vx *= Math.pow(.15, dt);
    }
    state.particles = state.particles.filter(p => p.life > 0);

    if (state.mode !== 'running') return;
    music(dt);
    state.stageTime += dt;
    state.invincible = Math.max(0, state.invincible - dt);
    player.dash = Math.max(0, player.dash - dt);
    player.hurt = Math.max(0, player.hurt - dt);
    player.look = Math.max(0, player.look - dt * .35);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0) state.combo = 0;

    if (state.transition > 0) {
      state.transition -= dt;
      if (state.transition < .7) player.look = Math.max(player.look, state.transition);
      return;
    }

    const desiredSpeed = Math.min(720, 320 + state.score * .44 + state.stage * 30);
    const reactionCap = Math.max(340, (width - player.x - 20) / .82);
    state.speed = Math.min(desiredSpeed, reactionCap);
    state.score += dt * state.speed * .025;
    updateStage();

    if (state.stage === 4) {
      state.remixTimer -= dt;
      if (state.remixTimer <= 0) {
        state.remixMode = state.remixMode === 'smash' ? 'gravity' : state.remixMode === 'gravity' ? 'boss' : 'smash';
        state.remixTimer = 8;
        state.glitchWord = state.remixMode === 'gravity' ? 'GRAVITY ROUND' : state.remixMode === 'boss' ? 'BOSS ATTACK ROUND' : 'SMASH ROUND';
        state.glitchTimer = 1.2;
        state.gravityFlip = false;
        player.y = groundY - player.h;
        player.vy = 0;
        player.grounded = true;
        state.invincible = Math.max(state.invincible, 1.2);
        state.obstacles.length = 0;
        state.spawnIn = 1;
        if (state.remixMode === 'boss') state.bossAttackIn = 2;
      }
    }

    const bossActive = (state.stage === 3 && state.bossHp > 0) || (state.stage === 4 && state.remixMode === 'boss');
    if (bossActive) {
      state.bossAttackIn -= dt;
      if (state.bossAttackIn <= 0) {
        const laneBusy = state.obstacles.some(o => !o.bossAttack && !o.dead && o.x < width && o.x + o.w > player.x + 80);
        if (laneBusy) {
          state.bossAttackIn = .35;
          state.spawnIn = Math.max(state.spawnIn, .7);
        } else {
          spawnBossAttack();
          state.bossAttackIn = rand(4.2, 5.3);
        }
      }
    }

    const gravity = state.gravityFlip ? -1900 : 1900;
    player.vy += gravity * dt;
    player.y += player.vy * dt;
    player.run += dt * state.speed * .035;

    const floor = groundY - player.h;
    const ceiling = ceilingY;
    if (!state.gravityFlip && player.y >= floor) {
      player.y = floor;
      player.vy = 0;
      player.grounded = true;
      player.dashAvailable = true;
    } else if (state.gravityFlip && player.y <= ceiling) {
      player.y = ceiling;
      player.vy = 0;
      player.grounded = true;
      player.dashAvailable = true;
    } else {
      player.grounded = false;
    }

    if (player.y > height + 100 || player.y < -120) hitPlayer({ hit: false });

    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      const attackOnScreen = state.obstacles.some(o => o.bossAttack && !o.dead && o.x + o.w > player.x - 40);
      if (!attackOnScreen) spawnObstacle();
      let base = state.stage === 0 ? 1.15 : state.stage === 3 ? .78 : .95;
      if (state.stage === 4) base = .63;
      state.spawnIn = attackOnScreen ? .35 : rand(base, base + .65) * clamp(470 / state.speed, .64, 1.15);
    }

    const pb = playerBox();
    const attackBox = player.dash > 0 ? { x: player.x + player.w - 4, y: player.y + 8, w: 76, h: player.h - 16 } : null;
    for (const o of state.obstacles) {
      const localSpeed = state.speed * (o.type === 'bird' || o.type === 'drone' ? 1.13 : 1);
      o.x -= localSpeed * dt;
      o.phase += dt * 5;
      if (o.warning > 0) o.warning = Math.max(0, o.warning - dt);
      const eyeHunts = o.type === 'eye' && (state.stage === 1 || (state.stage === 4 && state.remixMode === 'smash'));
      if (eyeHunts) {
        const targetY = clamp(player.y + player.h / 2 - o.h / 2, 28, groundY - o.h - 18);
        o.y += clamp((targetY - o.y) * 2.2, -95, 95) * dt;
      } else if (o.type === 'bird' || o.type === 'drone' || o.type === 'eye') {
        o.y += Math.sin(o.phase) * 20 * dt;
      }
      const ob = { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 6 };
      if (!o.dead && attackBox && !isSolidObstacle(o.type) && intersects(attackBox, ob)) destroyObstacle(o);
      if (!o.dead && !(o.warning > 0) && intersects(pb, ob)) {
        if (player.dash > 0 && !isSolidObstacle(o.type)) destroyObstacle(o);
        else hitPlayer(o);
      }
    }
    state.obstacles = state.obstacles.filter(o => o.x + o.w > -80 && !o.dead);
  }

  function clearCanvas(c) { c.clearRect(0, 0, width, height); }

  function drawBackground() {
    clearCanvas(fctx);
    let top = '#f7f7f7';
    let bottom = '#f7f7f7';
    if (state.stage === 1) { top = '#13091d'; bottom = '#3a0c2d'; }
    if (state.stage === 2) { top = '#02131d'; bottom = '#12214a'; }
    if (state.stage === 3) { top = '#170300'; bottom = '#4b0b06'; }
    if (state.stage === 4) { top = '#071109'; bottom = '#172b0d'; }
    if (state.mode === 'idle') top = bottom = '#f7f7f7';

    const grad = fctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, width, height);

    if (state.stage === 0) {
      fctx.strokeStyle = '#d0d0d0';
      fctx.lineWidth = 2;
      for (const cloud of state.clouds) {
        const drift = ((cloud.x - state.t * 8 * cloud.s) % (width + 180) + width + 180) % (width + 180) - 90;
        drawCloud(fctx, drift, cloud.y, cloud.s);
      }
    } else {
      for (const star of state.stars) {
        star.tw += .01;
        const drift = ((star.x - state.t * state.speed * .015 * star.z) % width + width) % width;
        const alpha = .25 + Math.sin(star.tw) * .2 + star.z * .45;
        fctx.fillStyle = hexAlpha(stageColor(), alpha);
        fctx.fillRect(Math.round(drift), Math.round(star.y), star.z > .7 ? 2 : 1, star.z > .7 ? 2 : 1);
      }
      drawGrid(fctx);
      drawSun(fctx);
    }

    if (state.stage >= 1 && state.stage < 4) drawWatchingEyes(fctx);
    if (state.stage >= 3) drawBoss(fctx);
  }

  function drawCloud(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 16 * s, y);
    c.lineTo(x + 22 * s, y - 8 * s);
    c.lineTo(x + 38 * s, y - 8 * s);
    c.lineTo(x + 46 * s, y);
    c.lineTo(x + 68 * s, y);
    c.stroke();
  }

  function drawGrid(c) {
    const horizon = groundY;
    c.save();
    c.globalAlpha = state.stage === 3 ? .2 : .12;
    c.strokeStyle = stageColor();
    c.lineWidth = 1;
    const shift = (state.t * state.speed * .45) % 42;
    for (let y = horizon; y < height + 80; y += 42) {
      const yy = y + shift;
      c.beginPath(); c.moveTo(0, yy); c.lineTo(width, yy); c.stroke();
    }
    for (let x = -width; x < width * 2; x += 70) {
      c.beginPath(); c.moveTo(width / 2, horizon); c.lineTo(x, height); c.stroke();
    }
    c.restore();
  }

  function drawSun(c) {
    const x = width * .78;
    const y = groundY * .35;
    const r = Math.min(110, width * .13);
    c.save();
    c.globalAlpha = .13;
    c.fillStyle = stageColor();
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.globalAlpha = .22;
    for (let i = -5; i <= 5; i++) {
      if (i % 2 === 0) continue;
      c.fillRect(x - r, y + i * 10, r * 2, 4);
    }
    c.restore();
  }

  function drawWatchingEyes(c) {
    c.save();
    const reaction = clamp(player.look, 0, 1);
    c.globalAlpha = .18 + Math.sin(state.t * 2) * .04 + reaction * .14;
    c.fillStyle = '#fff';
    const count = width < 600 ? 3 : 6;
    for (let i = 0; i < count; i++) {
      const x = (i + .5) * width / count;
      const y = 70 + (i % 2) * 55;
      const dx = clamp((player.x + player.w / 2 - x) / width, -.5, .5) * 24;
      const dy = clamp((player.y + player.h / 2 - y) / Math.max(groundY, 1), -.5, .5) * 14;
      c.beginPath();
      c.ellipse(x, y, 24 + reaction * 4, 9 + reaction * 5, 0, 0, TAU);
      c.fill();
      c.fillStyle = player.hurt > 0 ? '#ff244f' : stageColor();
      c.beginPath(); c.arc(x + dx, y + dy, 5 + reaction * 2, 0, TAU); c.fill();
      c.fillStyle = '#fff';
    }
    c.restore();
  }

  function drawBoss(c) {
    const x = width * .76;
    const y = height * .27;
    const r = Math.min(135, width * .18);
    c.save();
    c.translate(x, y);
    const pulse = 1 + Math.sin(state.t * 4) * .025 + state.bossHit * .2;
    c.scale(pulse, pulse);
    c.globalAlpha = state.stage === 4 ? .22 : .92;
    c.fillStyle = state.bossHit > 0 ? '#fff' : '#ff3d1f';
    c.beginPath(); c.ellipse(0, 0, r, r * .48, 0, 0, TAU); c.fill();
    c.fillStyle = '#140000';
    c.beginPath(); c.arc(Math.sin(state.t) * r * .18, 0, r * .31, 0, TAU); c.fill();
    c.fillStyle = '#ffcf87';
    c.beginPath(); c.arc(Math.sin(state.t) * r * .18, 0, r * .1, 0, TAU); c.fill();
    c.strokeStyle = '#ff9b75';
    c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + state.t * .1;
      c.beginPath(); c.moveTo(Math.cos(a) * r * .65, Math.sin(a) * r * .32); c.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * .72); c.stroke();
    }
    c.restore();
    state.bossHit = Math.max(0, state.bossHit - .035);
  }

  function hexAlpha(hex, alpha) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  function drawGame() {
    clearCanvas(ctx);
    const sx = reducedMotion ? 0 : rand(-state.shake, state.shake);
    const sy = reducedMotion ? 0 : rand(-state.shake, state.shake);
    ctx.save();
    ctx.translate(sx, sy);

    drawGround(ctx);
    for (const o of state.obstacles) drawObstacle(ctx, o);
    drawPlayer(ctx);
    drawParticles(ctx);
    drawHud(ctx);
    drawTransition(ctx);
    if (state.mode === 'dead') drawDead(ctx);
    ctx.restore();

    if (state.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.flash * .32;
      ctx.fillStyle = state.stage === 0 ? '#fff' : stageColor();
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (state.chroma > 0 && !reducedMotion) drawScanlines(ctx);
  }

  function drawGround(c) {
    c.save();
    c.strokeStyle = state.stage === 0 ? '#535353' : stageColor();
    c.fillStyle = c.strokeStyle;
    c.globalAlpha = state.stage === 0 ? 1 : .8;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, groundY); c.lineTo(width, groundY); c.stroke();
    const shift = (state.t * state.speed) % 38;
    for (let x = -shift; x < width; x += 38) {
      const y = groundY + 9 + ((x / 38) % 3) * 4;
      c.fillRect(Math.round(x), Math.round(y), rand(8, 20), 2);
    }
    if (state.gravityFlip || state.stage === 2 || (state.stage === 4 && state.remixMode === 'gravity')) {
      c.beginPath(); c.moveTo(0, ceilingY - 4); c.lineTo(width, ceilingY - 4); c.stroke();
    }
    c.restore();
  }

  function drawPlayer(c) {
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    const color = player.hurt > 0 ? '#ff244f' : state.stage === 0 ? '#535353' : '#f7f7f7';
    const eye = state.stage >= 1 ? stageColor() : '#f7f7f7';
    const leg = Math.sin(player.run) > 0 ? 1 : 0;
    c.save();
    c.translate(x + player.w / 2, y + player.h / 2);
    if (state.gravityFlip) c.scale(1, -1);
    if (player.dash > 0) {
      c.save();
      c.globalAlpha = .24;
      c.fillStyle = stageColor();
      c.beginPath(); c.moveTo(18, -19); c.lineTo(102, -12); c.lineTo(102, 12); c.lineTo(18, 19); c.closePath(); c.fill();
      c.globalAlpha = .9;
      c.strokeStyle = stageColor(); c.lineWidth = 2; c.stroke();
      c.restore();
      c.rotate(-.12);
      c.shadowColor = stageColor();
      c.shadowBlur = 22;
      for (let i = 1; i < 5; i++) {
        c.globalAlpha = .18 / i;
        drawDinoShape(c, -i * 18, 0, stageColor(), eye, leg);
      }
      c.globalAlpha = 1;
    }
    if (state.invincible > 0 && Math.floor(state.invincible * 12) % 2 === 0) c.globalAlpha = .28;
    drawDinoShape(c, 0, 0, color, eye, leg);
    c.restore();
  }

  function drawDinoShape(c, ox, oy, color, eye, leg) {
    c.save();
    c.translate(ox - 23, oy - 27);
    c.fillStyle = color;
    c.fillRect(9, 20, 25, 25);
    c.fillRect(25, 7, 21, 24);
    c.fillRect(38, 11, 12, 14);
    c.fillRect(4, 28, 12, 11);
    c.fillRect(0, 25, 8, 7);
    c.fillRect(13, 42, 9, leg ? 12 : 8);
    c.fillRect(27, 42, 8, leg ? 8 : 12);
    c.clearRect(34, 24, 16, 7);
    c.fillStyle = player.blink > 0 ? color : eye;
    const eyeSize = state.stage >= 1 ? 4 : 3;
    c.fillRect(36, 11, eyeSize, eyeSize);
    if (state.stage >= 1) {
      c.fillStyle = stageColor();
      c.fillRect(12, 23, 4, 4);
      c.fillRect(18, 20, 3, 3);
    }
    c.restore();
  }

  function drawObstacle(c, o) {
    c.save();
    c.translate(Math.round(o.x), Math.round(o.y));
    const color = state.stage === 0 ? '#535353' : o.type === 'packet' || o.type === 'firewall' || o.type === 'laser' ? '#ff512f' : stageColor();
    c.fillStyle = color;
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.shadowColor = state.stage === 0 ? 'transparent' : color;
    c.shadowBlur = state.stage === 0 ? 0 : 10;

    if (o.type === 'cactus') {
      c.fillRect(o.w * .42, 0, o.w * .22, o.h);
      c.fillRect(0, o.h * .36, o.w * .48, 8);
      c.fillRect(0, o.h * .2, 7, o.h * .25);
      c.fillRect(o.w * .55, o.h * .58, o.w * .45, 8);
      c.fillRect(o.w - 7, o.h * .43, 7, o.h * .25);
    } else if (o.type === 'bird') {
      const wing = Math.sin(o.phase) > 0 ? 0 : 8;
      c.fillRect(12, 10, 29, 12);
      c.fillRect(38, 6, 10, 8);
      c.beginPath(); c.moveTo(14, 14); c.lineTo(0, wing); c.lineTo(18, 18); c.fill();
      c.beginPath(); c.moveTo(25, 13); c.lineTo(18, 27 - wing); c.lineTo(34, 17); c.fill();
    } else if (o.type === 'eye') {
      const hunting = state.stage === 1 || (state.stage === 4 && state.remixMode === 'smash');
      if (hunting && o.x > player.x) {
        c.save();
        c.globalAlpha = .18;
        c.shadowBlur = 0;
        c.strokeStyle = '#fff';
        c.lineWidth = 1;
        c.setLineDash([5, 7]);
        c.beginPath();
        c.moveTo(o.w / 2, o.h / 2);
        c.lineTo(player.x + player.w / 2 - o.x, player.y + player.h / 2 - o.y);
        c.stroke();
        c.restore();
      }
      c.beginPath(); c.ellipse(o.w / 2, o.h / 2, o.w / 2, o.h / 2, 0, 0, TAU); c.fill();
      const lookX = clamp((player.x + player.w / 2 - (o.x + o.w / 2)) / 60, -1, 1) * 7;
      const lookY = clamp((player.y + player.h / 2 - (o.y + o.h / 2)) / 60, -1, 1) * 5;
      c.fillStyle = '#08030b'; c.beginPath(); c.arc(o.w / 2 + lookX, o.h / 2 + lookY, 10, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.fillRect(o.w / 2 + lookX + 2, o.h / 2 + lookY - 5, 4, 4);
    } else if (o.type === 'shard') {
      c.translate(o.w / 2, o.h / 2);
      c.rotate(Math.sin(o.phase * .22) * .7);
      c.translate(-o.w / 2, -o.h / 2);
      c.beginPath(); c.moveTo(o.w / 2, 0); c.lineTo(o.w, o.h * .7); c.lineTo(o.w * .4, o.h); c.lineTo(0, o.h * .35); c.closePath(); c.fill();
      c.strokeStyle = '#fff'; c.globalAlpha = .35; c.stroke();
    } else if (o.type === 'rock') {
      c.beginPath(); c.arc(o.w / 2, o.h / 2, o.w / 2, 0, TAU); c.fill();
      c.fillStyle = '#071017'; c.fillRect(12, 14, 9, 6); c.fillRect(31, 26, 8, 6);
    } else if (o.type === 'gate') {
      c.globalAlpha = .8;
      c.fillRect(0, 0, o.w, o.h);
      c.globalAlpha = 1;
      c.fillStyle = '#08131b';
      for (let y = 8; y < o.h; y += 18) c.fillRect(5, y, o.w - 10, 5);
      c.fillStyle = '#fff'; c.font = '700 8px ui-monospace, monospace';
      c.fillText(o.surface === 'ceiling' ? 'CEIL!' : 'FLOOR!', 7, o.h / 2 + 3);
    } else if (o.type === 'firewall') {
      c.fillStyle = o.warning > 0 ? '#ffcc70' : '#ff3d1f';
      c.globalAlpha = o.warning > 0 ? .28 + Math.sin(state.t * 18) * .12 : .88;
      c.fillRect(0, 0, o.w, o.h);
      c.globalAlpha = 1;
      c.strokeStyle = '#fff1d2'; c.lineWidth = 2;
      for (let y = -o.w; y < o.h; y += 18) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(o.w, y + o.w); c.stroke();
      }
      c.fillStyle = '#fff'; c.font = '900 10px ui-monospace, monospace';
      c.fillText(o.warning > 0 ? '!' : 'BLOCK', 4, 15);
    } else if (o.type === 'laser') {
      c.fillStyle = o.warning > 0 ? '#ffcf72' : '#fff';
      c.globalAlpha = o.warning > 0 ? .4 + Math.sin(state.t * 16) * .2 : .95;
      c.fillRect(0, 0, o.w, o.h);
      c.globalAlpha = 1;
      c.fillStyle = '#ff244f'; c.fillRect(0, o.h / 2 - 2, o.w, 4);
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(0, 0, o.w, o.h);
    } else if (o.type === 'drone') {
      c.strokeRect(10, 7, 38, 20);
      c.fillRect(0, 0, 18, 4); c.fillRect(40, 0, 18, 4);
      c.fillRect(4, 14, 10, 3); c.fillRect(44, 14, 10, 3);
      c.fillStyle = '#ff244f'; c.fillRect(26, 13, 7, 7);
    } else if (o.type === 'wave') {
      c.beginPath();
      for (let x = 0; x <= o.w; x += 5) {
        const y = o.h / 2 + Math.sin(x * .35 + o.phase) * 8;
        if (!x) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    } else if (o.type === 'packet') {
      c.rotate(Math.sin(o.phase) * .12);
      c.fillRect(2, 2, o.w - 4, o.h - 4);
      c.fillStyle = '#2b0800';
      c.fillRect(8, 10, o.w - 16, 5);
      c.fillRect(8, 20, o.w - 24, 5);
      c.fillStyle = '#fff';
      c.font = '700 9px ui-monospace, monospace';
      c.fillText('PUNCH', 7, o.h - 7);
    }
    c.restore();
  }

  function drawParticles(c) {
    for (const p of state.particles) {
      c.globalAlpha = clamp(p.life * 2, 0, 1);
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    c.globalAlpha = 1;
  }

  function drawHud(c) {
    const dark = state.stage === 0;
    const compact = width < 700;
    const healthY = compact ? 62 : 25;
    const modeY = compact ? 84 : 48;
    const remixY = modeY + 15;
    c.save();
    c.fillStyle = dark ? '#535353' : '#fff';
    c.font = `700 ${width < 600 ? 15 : 18}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.textAlign = 'right';
    c.fillText(String(Math.floor(state.best)).padStart(5, '0') + '  ' + String(Math.floor(state.score)).padStart(5, '0'), width - 24, 38);
    c.textAlign = 'left';
    c.font = '700 11px ui-monospace, monospace';
    c.globalAlpha = .72;
    c.fillText(stageNames[state.stage], 20, height - 22);

    if (state.mode !== 'idle') {
      for (let i = 0; i < 3; i++) {
        c.globalAlpha = i < state.health ? 1 : .18;
        c.fillStyle = i < state.health ? (dark ? '#535353' : stageColor()) : '#777';
        c.fillRect(20 + i * 18, healthY, 12, 5);
      }
    }

    c.globalAlpha = .82;
    c.font = '700 10px ui-monospace, monospace';
    if (state.stage === 1 || state.stage === 3 || (state.stage === 4 && state.remixMode !== 'gravity')) {
      const dashText = player.dashAvailable ? 'AIR SMASH  ● READY' : 'AIR SMASH  ○ EMPTY';
      c.fillText(dashText, 20, modeY);
    } else if (state.stage === 2 || (state.stage === 4 && state.remixMode === 'gravity')) {
      c.fillText(`TAP: FLIP GRAVITY  •  ROUTE: ${state.gravityFlip ? 'CEILING' : 'FLOOR'}`, 20, modeY);
    }
    if (state.stage === 4) {
      c.fillText(`REMIX: ${state.remixMode.toUpperCase()}  ${Math.ceil(state.remixTimer)}s`, 20, remixY);
    }

    if (state.combo > 1 && state.comboTimer > 0) {
      c.globalAlpha = clamp(state.comboTimer, 0, 1);
      c.fillStyle = stageColor();
      c.font = '900 22px ui-monospace, monospace';
      c.fillText(`${state.combo}× BREAK`, 20, state.stage === 4 ? remixY + 30 : modeY + 30);
    }

    if (state.stage === 3 && state.bossHp > 0) {
      const bw = Math.min(300, width * .45);
      const bx = width / 2 - bw / 2;
      const by = compact ? 74 : 24;
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(bx, by, bw, 9);
      c.fillStyle = '#ff512f'; c.fillRect(bx, by, bw * state.bossHp / 10, 9);
      c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '700 10px ui-monospace, monospace';
      c.fillText('NETWORK ADMINISTRATOR', width / 2, by - 6);
    }
    c.restore();
  }

  function drawTransition(c) {
    if (state.transition <= 0 && state.glitchTimer <= 0) return;
    const text = state.transition > 0 ? state.transitionLine : state.glitchWord;
    if (!text) return;
    c.save();
    const transitionDuration = state.stage === 4 ? 5 : state.stage === 3 ? 4.2 : 3.2;
    const alpha = state.transition > 0 ? clamp(Math.min(transitionDuration - state.transition, state.transition) * 1.3, 0, 1) : clamp(state.glitchTimer * 2, 0, 1);
    c.globalAlpha = alpha;
    c.fillStyle = state.stage === 0 ? '#202124' : '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${clamp(width * .055, width < 600 ? 18 : 24, 68)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const jitter = reducedMotion ? 0 : rand(-state.chroma * 9, state.chroma * 9);
    if (state.chroma > 0) {
      c.globalAlpha = alpha * .45;
      c.fillStyle = '#ff165d'; c.fillText(text, width / 2 - 5 + jitter, height * .43);
      c.fillStyle = '#20f6ff'; c.fillText(text, width / 2 + 5 - jitter, height * .43);
    }
    c.globalAlpha = alpha;
    c.fillStyle = '#fff';
    c.fillText(text, width / 2, height * .43);
    c.font = `700 ${Math.min(13, Math.max(8, width / 42))}px ui-monospace, monospace`;
    if (state.stage === 1 && state.transition > 0) c.fillText('JUMP, THEN TAP AGAIN IN AIR TO SMASH TARGETS', width / 2, height * .43 + 55);
    if (state.stage === 2 && state.transition > 0) c.fillText('TAP TO FLIP GRAVITY • AVOID THE GLOWING SURFACE', width / 2, height * .43 + 55);
    if (state.stage === 3 && state.transition > 0) c.fillText('DASH RED PACKETS • JUMP FIREWALLS • STAY LOW UNDER LASERS', width / 2, height * .43 + 55);
    if (state.stage === 4 && state.transition > 0) c.fillText('SMASH, GRAVITY AND BOSS ROUNDS KEEP ROTATING', width / 2, height * .43 + 55);
    c.restore();
  }

  function drawDead(c) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.64)';
    c.fillRect(0, 0, width, height);
    c.textAlign = 'center';
    c.fillStyle = '#fff';
    c.font = `900 ${clamp(width * .075, width < 600 ? 28 : 32, 82)}px ui-monospace, monospace`;
    c.fillText('ERR_RUNNER_CRASHED', width / 2, height * .43);
    c.font = '700 14px ui-monospace, monospace';
    c.fillText(`SCORE ${Math.floor(state.score)}   BEST ${Math.floor(state.best)}`, width / 2, height * .43 + 42);
    c.restore();
  }

  function drawScanlines(c) {
    c.save();
    c.globalAlpha = .05 + state.chroma * .08;
    c.fillStyle = '#fff';
    for (let y = 0; y < height; y += 5) c.fillRect(0, y, width, 1);
    if (chance(.25)) {
      const y = rand(0, height);
      const h = rand(2, 15);
      c.globalAlpha = .12;
      c.drawImage(game, 0, y * dpr, game.width, h * dpr, rand(-18, 18), y, width, h);
    }
    c.restore();
  }

  function render() {
    drawBackground();
    drawGame();
  }

  function frame(now) {
    const dt = Math.min(.033, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function onKey(e) {
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) action();
    } else if (e.code === 'Enter' && state.mode === 'dead') {
      e.preventDefault();
      start();
    }
  }

  addEventListener('resize', resize);
  addEventListener('keydown', onKey, { passive: false });
  game.addEventListener('pointerdown', e => { e.preventDefault(); action(); });
  fx.addEventListener('pointerdown', e => { e.preventDefault(); action(); });
  again.addEventListener('click', () => reset(true));
  mute.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('a1NoInternetMuted', muted ? '1' : '0');
    mute.classList.toggle('off', muted);
    mute.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
    if (!muted) { ensureAudio(); sound('start'); }
  });
  mute.classList.toggle('off', muted);
  mute.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');

  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  document.addEventListener('arcade-restart', () => reset(true));

  window.DINO_DEBUG = {
    get state() { return { ...state, player: { ...player }, obstacles: state.obstacles.map(o => ({ ...o })) }; },
    start,
    skip() {
      if (state.mode !== 'running') reset(true);
      if (state.stage === 0) { state.score = 106; updateStage(); }
      else if (state.stage === 1) { state.score = 276; updateStage(); }
      else if (state.stage === 2) { state.score = 501; updateStage(); }
      else if (state.stage === 3) { state.bossHp = 1; state.transition = 0; }
    },
    invincible(value = true) { state.invincible = value ? 1e9 : 0; },
    hitBoss() { if (state.stage === 3 && state.bossHp > 0) { state.bossHp--; if (!state.bossHp) winBoss(); } }
  };
  if (!debugMode) Object.defineProperty(window.DINO_DEBUG, 'debugOnly', { value: true });

  resize();
  reset(false);
  requestAnimationFrame(frame);
})();

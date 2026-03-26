// ============================================================
// Dragon Engineering Lab — Three.js Scene
// Lab environment (floor, lighting, fog) + canvas-texture dragon.
// The dragon is drawn by DragonCanvas onto an offscreen canvas,
// then displayed as a CanvasTexture on a Three.js plane mesh.
// This gives full 2D illustration quality inside a 3D lab scene.
// ============================================================

window.Scene = (function () {
  let renderer, scene, camera, controls;
  let dragonGroup, enemyGroup;
  let clock;
  let currentMode = 'lab';
  let labObjects  = [];

  // Canvas dragon display
  const CANVAS_W = 1024, CANVAS_H = 700;
  let dragonCanvas, dragonTexture, dragonPlane;
  let enemyCanvas,  enemyTexture,  enemyPlane;

  // Current dragon state for animation updates
  let _traits = null, _tintColor = null;
  let _enemyTraits = null, _enemyTint = null;

  // Animation
  let lungeAnims   = [];
  let fireParticles = [];
  let impactFlashes = [];

  // --------------------------------------------------------
  // INIT
  // --------------------------------------------------------
  function init(container) {
    clock = new THREE.Clock();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);

    // Camera — elevated, slight angle for depth
    camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 2.2, 9.5);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.08;
    controls.maxPolarAngle  = Math.PI * 0.82;
    controls.minDistance    = 3;
    controls.maxDistance    = 22;
    controls.update();

    // Environment
    setupLabLighting();
    setupLabFloor();

    // Dragon display plane group
    dragonGroup = new THREE.Group();
    dragonGroup.position.set(0, 0, 0);
    scene.add(dragonGroup);

    animate();
    window.addEventListener('resize', () => resize(container));
  }

  // --------------------------------------------------------
  // LIGHTING
  // --------------------------------------------------------
  function setupLabLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    // Ambient hemisphere
    scene.add(new THREE.HemisphereLight(0x335588, 0x112233, 0.52));

    // Main key — top-front
    const key = new THREE.DirectionalLight(0xddeeff, 1.5);
    key.position.set(2, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -8;
    key.shadow.camera.right = key.shadow.camera.top = 8;
    key.shadow.camera.far = 30;
    scene.add(key);
    labObjects.push(key);

    // Lab floor glow (teal)
    const floorGlow = new THREE.PointLight(0x00ccaa, 0.60, 10);
    floorGlow.position.set(0, -0.2, 0);
    scene.add(floorGlow);
    labObjects.push(floorGlow);

    // Rim — blue from rear
    const rim = new THREE.PointLight(0x2244cc, 0.52, 18);
    rim.position.set(-4, 5, -5);
    scene.add(rim);
    labObjects.push(rim);

    // Warm accent from right-front
    const fill = new THREE.PointLight(0x553311, 0.22, 12);
    fill.position.set(5, 2, 3);
    scene.add(fill);
    labObjects.push(fill);
  }

  // --------------------------------------------------------
  // LAB FLOOR
  // --------------------------------------------------------
  function setupLabFloor() {
    const grid = new THREE.GridHelper(24, 32, 0x003333, 0x001a1a);
    grid.position.y = 0;
    scene.add(grid);
    labObjects.push(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x06060e, roughness: 0.92, metalness: 0.10 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    labObjects.push(ground);
  }

  // --------------------------------------------------------
  // BUILD CANVAS-TEXTURE DRAGON PLANE
  // Aspect: 1024/700 ≈ 1.463. Displayed at ~4.4 units wide.
  // --------------------------------------------------------
  function makeDragonCanvas() {
    return DragonCanvas.create(CANVAS_W, CANVAS_H);
  }

  function makeDragonMesh(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const aspect = CANVAS_W / CANVAS_H;
    const planeH = 3.0;
    const planeW = planeH * aspect;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: false,
      side: THREE.FrontSide,
      depthWrite: true
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
    // Position so bottom of plane aligns with floor (y=0)
    mesh.position.y = planeH / 2 + 0.05;
    return { mesh, tex };
  }

  // --------------------------------------------------------
  // BUILD / REBUILD PLAYER DRAGON
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    _traits = traits;
    _tintColor = tintColor;

    // Clear existing dragon group children
    while (dragonGroup.children.length > 0) {
      const c = dragonGroup.children[0];
      dragonGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (c.material.map) c.material.map.dispose();
        c.material.dispose();
      }
    }
    if (dragonTexture) { dragonTexture.dispose(); dragonTexture = null; }

    // Create canvas + mesh
    dragonCanvas = makeDragonCanvas();
    DragonCanvas.draw(dragonCanvas, traits, tintColor, 0);
    const { mesh, tex } = makeDragonMesh(dragonCanvas);
    dragonPlane   = mesh;
    dragonTexture = tex;
    dragonGroup.add(dragonPlane);

    // Subtle glow frame edges (4 thin planes)
    addGlowFrame(dragonGroup, dragonPlane.geometry.parameters.width, dragonPlane.geometry.parameters.height, dragonPlane.position.y);
  }

  // Decorative teal glow frame around the dragon display
  function addGlowFrame(parent, pw, ph, py) {
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.10,
      side: THREE.DoubleSide
    });
    const thickness = 0.04;
    const segments = [
      // [w, h, x, y]
      [pw + thickness * 2, thickness, 0,        py + ph / 2],
      [pw + thickness * 2, thickness, 0,        py - ph / 2],
      [thickness, ph, -(pw / 2),                py],
      [thickness, ph,  (pw / 2),                py]
    ];
    segments.forEach(([w, h, x, y]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glowMat.clone());
      m.position.set(x, y, 0.001);
      parent.add(m);
    });
  }

  // --------------------------------------------------------
  // UPDATE (on trait slider change)
  // --------------------------------------------------------
  function updateDragon(traits, tintColor) {
    _traits = traits;
    _tintColor = tintColor;
    if (dragonCanvas && dragonTexture) {
      DragonCanvas.draw(dragonCanvas, traits, tintColor, clock.getElapsedTime());
      dragonTexture.needsUpdate = true;
    } else {
      buildPlayerDragon(traits, tintColor);
    }
  }

  // --------------------------------------------------------
  // ANIMATION LOOP
  // --------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time  = clock.getElapsedTime();

    controls.update();

    // Redraw dragon canvas each frame (for glow/breathing animation)
    if (currentMode === 'lab' && dragonCanvas && dragonTexture && _traits) {
      DragonCanvas.draw(dragonCanvas, _traits, _tintColor, time);
      dragonTexture.needsUpdate = true;
    }

    if (currentMode === 'battle' && enemyCanvas && enemyTexture && _enemyTraits) {
      DragonCanvas.draw(enemyCanvas, _enemyTraits, _enemyTint, time);
      enemyTexture.needsUpdate = true;
      // Player dragon also animates in battle
      if (dragonCanvas && dragonTexture && _traits) {
        DragonCanvas.draw(dragonCanvas, _traits, _tintColor, time);
        dragonTexture.needsUpdate = true;
      }
    }

    // Lunge animations
    lungeAnims = lungeAnims.filter(la => {
      la.phase += delta / la.duration;
      if (la.phase >= 1) { la.group.position.z = la.startZ; return false; }
      const tt = la.phase < 0.5 ? la.phase * 2 : (1 - la.phase) * 2;
      la.group.position.z = la.startZ + la.offset * tt;
      return true;
    });

    // Fire particles
    fireParticles = fireParticles.filter(fp => {
      fp.progress += delta * fp.speed;
      if (fp.progress < 0) return true;
      if (fp.progress >= 1) {
        scene.remove(fp.mesh);
        fp.mesh.geometry.dispose();
        fp.mesh.material.dispose();
        return false;
      }
      fp.mesh.position.lerpVectors(fp.start, fp.end, fp.progress);
      fp.mesh.position.y += Math.sin(fp.progress * Math.PI) * 0.3;
      fp.mesh.material.opacity = 1 - fp.progress * 0.8;
      fp.mesh.scale.setScalar(1 + fp.progress);
      return true;
    });

    // Impact flashes
    impactFlashes = impactFlashes.filter(fl => {
      fl.life -= delta * 4;
      if (fl.life <= 0) {
        scene.remove(fl.mesh);
        fl.mesh.geometry.dispose();
        fl.mesh.material.dispose();
        return false;
      }
      fl.mesh.material.opacity = fl.life;
      fl.mesh.scale.setScalar(1 + (1 - fl.life) * 2);
      return true;
    });

    renderer.render(scene, camera);
  }

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    _enemyTraits = enemyTraits;
    _enemyTint   = enemyTint;

    camera.position.set(0, 3.5, 14);
    controls.target.set(0, 1.5, 0);

    const arenaColors = {
      mountains: 0x2a3a2e, tundra: 0x2a3a4a,
      volcanic: 0x3a1a1a, forest: 0x1a2a1a, plains: 0x3a3a2a
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x06060f);

    // Move player dragon left, rotate toward center
    dragonGroup.position.set(-3.5, 0, 0);
    dragonGroup.rotation.y = 0.12;

    // Build enemy dragon display
    if (enemyGroup) {
      scene.remove(enemyGroup);
      enemyGroup = null;
    }
    if (enemyTexture) { enemyTexture.dispose(); enemyTexture = null; }

    enemyCanvas = makeDragonCanvas();
    DragonCanvas.draw(enemyCanvas, enemyTraits, enemyTint, 0);
    const { mesh: em, tex: et } = makeDragonMesh(enemyCanvas);
    enemyPlane   = em;
    enemyTexture = et;
    // Mirror the enemy to face left (toward player)
    enemyPlane.scale.x = -1;

    enemyGroup = new THREE.Group();
    enemyGroup.add(enemyPlane);
    addGlowFrame(enemyGroup, enemyPlane.geometry.parameters.width, enemyPlane.geometry.parameters.height, enemyPlane.position.y);
    enemyGroup.position.set(3.5, 0, 0);
    enemyGroup.rotation.y = -0.12;
    scene.add(enemyGroup);
  }

  function returnToLab() {
    currentMode = 'lab';
    camera.position.set(0, 2.2, 9.5);
    controls.target.set(0, 1.2, 0);
    dragonGroup.position.set(0, 0, 0);
    dragonGroup.rotation.y = 0;
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);

    if (enemyGroup) {
      scene.remove(enemyGroup);
      enemyGroup = null;
    }
    if (enemyTexture) { enemyTexture.dispose(); enemyTexture = null; }
    enemyCanvas = null;
    enemyPlane  = null;
    _enemyTraits = null;
    _enemyTint   = null;
  }

  // --------------------------------------------------------
  // BATTLE TICK ANIMATION
  // --------------------------------------------------------
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;

    const pAction = tickRecord.playerAction;
    const eAction = tickRecord.enemyAction;

    if (['lunge', 'bite', 'claw', 'pressure'].includes(pAction)) animateLunge(dragonGroup,  0.4);
    if (['lunge', 'bite', 'claw', 'pressure'].includes(eAction)) animateLunge(enemyGroup,  -0.4);

    if (['fireBurst', 'sustainedFire'].includes(pAction)) playFireEffect(dragonGroup, enemyGroup);
    if (['fireBurst', 'sustainedFire'].includes(eAction)) playFireEffect(enemyGroup, dragonGroup);

    if (tickRecord.playerDamageDealt > 5 && enemyGroup)
      playImpactEffect(enemyGroup.position.clone().add(new THREE.Vector3(0, 1.8, 0)));
    if (tickRecord.enemyDamageDealt > 5)
      playImpactEffect(dragonGroup.position.clone().add(new THREE.Vector3(0, 1.8, 0)));
  }

  function animateLunge(group, offset) {
    if (!group) return;
    const startZ = group.position.z;
    lungeAnims.push({ group, offset, startZ, phase: 0, duration: 0.4 });
  }

  function playFireEffect(source, target) {
    if (!source || !target) return;
    const start = source.position.clone().add(new THREE.Vector3(0, 2.2, 0.5));
    const end   = target.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 6, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(start).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, 0
      ));
      scene.add(p);
      fireParticles.push({ mesh: p, start: start.clone(), end: end.clone(), progress: i * -0.05, speed: 1.5 + Math.random() * 0.5 });
    }
  }

  function playImpactEffect(position) {
    const geo = new THREE.SphereGeometry(0.18, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const fl  = new THREE.Mesh(geo, mat);
    fl.position.copy(position);
    scene.add(fl);
    impactFlashes.push({ mesh: fl, life: 1.0 });
  }

  // --------------------------------------------------------
  // ENVIRONMENT PREVIEW
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    const ec = {
      mountains: { bg: 0x1a2a1e, fog: 0x1a2a1e },
      tundra:    { bg: 0x1a2a3a, fog: 0x2a3a4a },
      volcanic:  { bg: 0x2a1010, fog: 0x3a1a1a },
      forest:    { bg: 0x0a1a0a, fog: 0x1a2a1a },
      plains:    { bg: 0x1a1a10, fog: 0x2a2a1a }
    };
    const e = ec[habitatKey] || { bg: 0x06060f, fog: 0x06060f };
    scene.background = new THREE.Color(e.bg);
    scene.fog = new THREE.Fog(e.fog, 16, 36);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);
  }

  // --------------------------------------------------------
  // RESIZE
  // --------------------------------------------------------
  function resize(container) {
    if (!renderer || !container) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  }

  return {
    init, buildPlayerDragon, updateDragon,
    initBattleArena, returnToLab, animateBattleTick,
    playFireEffect, playImpactEffect,
    setEnvironment, resetEnvironment, resize
  };
})();

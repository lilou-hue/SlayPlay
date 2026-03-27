// ============================================================
// Dragon Engineering Lab — Three.js Scene
// Three.js renders the lab environment (floor, lighting, fog).
// The dragon itself is drawn on an HTML5 canvas overlay element
// that sits on top of the WebGL canvas — no texture pipeline.
// ============================================================

window.Scene = (function () {
  let renderer, scene, camera, controls, clock;
  let currentMode = 'lab';
  let labObjects = [];

  // HTML overlay canvas — dragon lives here
  let overlay, _container;

  // Dragon state
  let _pTraits = null, _pTint = '#3a6e5a';
  let _eTraits = null, _eTint = '#3a6e5a';

  // Fake group positions for particle effects
  let pPos = new THREE.Vector3(-3, 1.5, 0);
  let ePos = new THREE.Vector3( 3, 1.5, 0);

  // Battle animation effects (Three.js particles)
  let lungeAnims    = [];
  let fireParticles = [];
  let impactFlashes = [];

  // --------------------------------------------------------
  // INIT
  // --------------------------------------------------------
  function init(container) {
    _container = container;
    clock = new THREE.Clock();

    // WebGL renderer — lab background only
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Container must be position:relative so overlay sits on top
    container.style.position = 'relative';
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);

    // Camera — looks straight at the empty lab floor
    camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 7);

    // Controls (orbit) — still active so user can rotate the scene
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.minDistance = 3;
    controls.maxDistance = 22;
    controls.update();

    // Lab environment
    setupLabLighting();
    setupLabFloor();

    // ---- HTML canvas overlay (dragon drawing) ----
    overlay = document.createElement('canvas');
    overlay.style.position = 'absolute';
    overlay.style.top      = '0';
    overlay.style.left     = '0';
    overlay.style.width    = '100%';
    overlay.style.height   = '100%';
    overlay.style.pointerEvents = 'none'; // let OrbitControls receive mouse events
    container.appendChild(overlay);
    resizeOverlay();

    animate();
    window.addEventListener('resize', () => resize(container));
  }

  function resizeOverlay() {
    if (!overlay || !_container) return;
    overlay.width  = _container.clientWidth  || 800;
    overlay.height = _container.clientHeight || 500;
  }

  // --------------------------------------------------------
  // LIGHTING
  // --------------------------------------------------------
  function setupLabLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    scene.add(new THREE.HemisphereLight(0x335588, 0x112233, 0.50));

    const key = new THREE.DirectionalLight(0xddeeff, 1.4);
    key.position.set(2, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far  = 28;
    key.shadow.camera.left = key.shadow.camera.bottom = -8;
    key.shadow.camera.right = key.shadow.camera.top = 8;
    scene.add(key);
    labObjects.push(key);

    const floor = new THREE.PointLight(0x00ccaa, 0.55, 10);
    floor.position.set(0, -0.2, 0);
    scene.add(floor);
    labObjects.push(floor);

    const rim = new THREE.PointLight(0x2244cc, 0.48, 18);
    rim.position.set(-4, 5, -5);
    scene.add(rim);
    labObjects.push(rim);
  }

  // --------------------------------------------------------
  // FLOOR
  // --------------------------------------------------------
  function setupLabFloor() {
    const grid = new THREE.GridHelper(24, 32, 0x003333, 0x001a1a);
    scene.add(grid);
    labObjects.push(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x06060e, roughness: 0.92, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    labObjects.push(ground);
  }

  // --------------------------------------------------------
  // BUILD / UPDATE DRAGON (just save state — drawn in animate)
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    _pTraits = traits;
    _pTint   = tintColor || '#3a6e5a';
  }

  function updateDragon(traits, tintColor) {
    _pTraits = traits;
    _pTint   = tintColor || '#3a6e5a';
  }

  // --------------------------------------------------------
  // ANIMATION LOOP
  // --------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time  = clock.getElapsedTime();

    controls.update();

    // Draw dragon on overlay canvas
    if (overlay && _pTraits) {
      if (currentMode === 'lab') {
        DragonCanvas.draw(overlay, _pTraits, _pTint, time);
      } else if (currentMode === 'battle' && _eTraits) {
        DragonCanvas.drawBattle(overlay, _pTraits, _pTint, _eTraits, _eTint, time);
      }
    }

    // Three.js particle effects (fire, impact)
    updateParticles(delta);

    renderer.render(scene, camera);
  }

  function updateParticles(delta) {
    // Lunge (just conceptual position for particle origin)
    lungeAnims = lungeAnims.filter(la => {
      la.phase += delta / la.duration;
      return la.phase < 1;
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
      fp.mesh.position.y += Math.sin(fp.progress * Math.PI) * 0.4;
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
  }

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    _pTraits = playerTraits;
    _pTint   = playerTint  || '#3a6e5a';
    _eTraits = enemyTraits;
    _eTint   = enemyTint   || '#6e3a3a';

    camera.position.set(0, 2, 10);
    controls.target.set(0, 0.5, 0);

    const arenaColors = {
      mountains: 0x2a3a2e, tundra: 0x2a3a4a,
      volcanic: 0x3a1a1a, forest: 0x1a2a1a, plains: 0x3a3a2a
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x06060f);
  }

  function returnToLab() {
    currentMode = 'lab';
    _eTraits = null;
    camera.position.set(0, 1.2, 7);
    controls.target.set(0, 0.4, 0);
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);
  }

  // --------------------------------------------------------
  // BATTLE TICK EFFECTS
  // --------------------------------------------------------
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;
    const pAction = tickRecord.playerAction;
    const eAction = tickRecord.enemyAction;

    if (['fireBurst', 'sustainedFire'].includes(pAction)) playFireEffect(pPos, ePos);
    if (['fireBurst', 'sustainedFire'].includes(eAction)) playFireEffect(ePos, pPos);
    if (tickRecord.playerDamageDealt > 5) playImpactEffect(ePos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    if (tickRecord.enemyDamageDealt > 5)  playImpactEffect(pPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
  }

  function playFireEffect(start, end) {
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 5, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(start).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, 0));
      scene.add(p);
      fireParticles.push({ mesh: p, start: start.clone(), end: end.clone(), progress: i * -0.06, speed: 1.5 + Math.random() * 0.5 });
    }
  }

  function playImpactEffect(position) {
    const geo = new THREE.SphereGeometry(0.2, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const fl  = new THREE.Mesh(geo, mat);
    fl.position.copy(position);
    scene.add(fl);
    impactFlashes.push({ mesh: fl, life: 1.0 });
  }

  // --------------------------------------------------------
  // ENVIRONMENT
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    const ec = {
      mountains: { bg: 0x1a2a1e }, tundra: { bg: 0x1a2a3a },
      volcanic:  { bg: 0x2a1010 }, forest: { bg: 0x0a1a0a },
      plains:    { bg: 0x1a1a10 }
    };
    scene.background = new THREE.Color((ec[habitatKey] || {bg: 0x06060f}).bg);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);
  }

  // --------------------------------------------------------
  // RESIZE
  // --------------------------------------------------------
  function resize(container) {
    if (!renderer) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    resizeOverlay();
  }

  return {
    init, buildPlayerDragon, updateDragon,
    initBattleArena, returnToLab, animateBattleTick,
    playFireEffect, playImpactEffect,
    setEnvironment, resetEnvironment, resize
  };
})();

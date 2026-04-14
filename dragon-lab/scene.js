// ============================================================
// Dragon Engineering Lab — Three.js Scene (v6)
// Full 3D GLB integration via GLTFLoader + SkeletonUtils.
// The HTML5 canvas overlay is gone — the dragon is a real mesh.
// ============================================================

window.Scene = (function () {
  let renderer, scene, camera, controls, clock;
  let currentMode = 'lab';

  // GLB template (shared, never added to scene directly)
  let glbTemplate = null;

  // Player dragon
  let playerWrapper = null;
  let playerMixer  = null;

  // Enemy dragon (battle mode)
  let enemyWrapper = null;
  let enemyMixer   = null;

  // Cached state
  let _pTraits = null, _pTint = '#2a8870';
  let _eTraits = null, _eTint = '#6e3a3a';

  // Particle effects (unchanged from original)
  let fireParticles = [];
  let impactFlashes = [];

  // Fake positions used as particle origin/target anchors
  const pPos = new THREE.Vector3(-2.5, 1.2, 0);
  const ePos = new THREE.Vector3( 2.5, 1.2, 0);

  // --------------------------------------------------------
  // INIT
  // --------------------------------------------------------
  function init(container) {
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);

    camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 2.5, 9);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.minDistance = 3;
    controls.maxDistance = 22;
    controls.update();

    setupLabLighting();
    setupLabFloor();

    loadDragonGLB();

    animate();
    window.addEventListener('resize', function () { resize(container); });
  }

  // --------------------------------------------------------
  // GLB LOADING
  // --------------------------------------------------------
  function loadDragonGLB() {
    var loader = new THREE.GLTFLoader();
    loader.load(
      'assets/Meshy_AI_Western_dragon_quadr_0327033420_texture.glb',
      function (gltf) {
        glbTemplate = gltf.scene;

        // Normalise: fit in a ~3-unit bounding box
        var box = new THREE.Box3().setFromObject(glbTemplate);
        var sz  = new THREE.Vector3();
        box.getSize(sz);
        var s = 3.0 / Math.max(sz.x, sz.y, sz.z);
        glbTemplate.scale.setScalar(s);

        // Ground (Y) and centre (X/Z)
        box.setFromObject(glbTemplate);
        var cx = (box.min.x + box.max.x) / 2;
        var cz = (box.min.z + box.max.z) / 2;
        glbTemplate.position.set(-cx, -box.min.y, -cz);

        // Enable shadows; cache animations
        glbTemplate.traverse(function (obj) {
          if (obj.isMesh) {
            obj.castShadow    = true;
            obj.receiveShadow = true;
          }
        });
        glbTemplate.userData.animations = gltf.animations || [];

        // Log bone names once so we can tune regex patterns in console
        glbTemplate.traverse(function (obj) {
          if (obj.isBone || obj.type === 'Bone') {
            console.log('[DragonLab] bone:', obj.name);
          }
        });

        // If init() already had traits queued, build now
        if (_pTraits) buildPlayerDragon(_pTraits, _pTint);
      },
      undefined,
      function (err) { console.error('[DragonLab] GLB load error:', err); }
    );
  }

  // --------------------------------------------------------
  // CREATE INSTANCE  (clone → traits → tint → wrap)
  // --------------------------------------------------------
  function createInstance(traits, tintColor) {
    if (!glbTemplate) return null;

    var mesh = THREE.SkeletonUtils.clone(glbTemplate);

    // Store base scales (post-normalisation, pre-trait) keyed by uuid
    var baseScales = new Map();
    mesh.traverse(function (obj) {
      baseScales.set(obj.uuid, { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z });
    });
    mesh.userData.baseScales = baseScales;

    applyTraits(mesh, traits);
    applyTint(mesh, tintColor);

    // Wrap so position changes don't fight normalisation offsets
    var wrapper = new THREE.Group();
    wrapper.add(mesh);
    wrapper.userData.lastTint = tintColor;

    // Animation mixer (use first clip if present, otherwise procedural bob)
    var mixer = null;
    var anims = glbTemplate.userData.animations;
    if (anims && anims.length > 0) {
      mixer = new THREE.AnimationMixer(mesh);
      mixer.clipAction(anims[0]).play();
    }

    return { wrapper: wrapper, mixer: mixer };
  }

  // --------------------------------------------------------
  // RESTORE BASE SCALES  (before re-applying traits)
  // --------------------------------------------------------
  function restoreBaseScales(mesh) {
    var baseScales = mesh.userData.baseScales;
    if (!baseScales) return;
    mesh.traverse(function (obj) {
      var bs = baseScales.get(obj.uuid);
      if (bs) { obj.scale.set(bs.x, bs.y, bs.z); }
    });
  }

  // --------------------------------------------------------
  // TRAIT → BONE SCALING
  // --------------------------------------------------------
  function nt(traitId, value) {
    // Normalise to 0-1; fall back gracefully if Dragon not yet loaded
    if (window.Dragon && window.Dragon.normalize) {
      return window.Dragon.normalize(traitId, value);
    }
    return 0.5;
  }

  function applyTraits(mesh, traits) {
    if (!traits) return;

    // Whole-body mass
    var massScale = 0.75 + nt('bodyMass', traits.bodyMass) * 0.5;
    mesh.scale.x *= massScale;
    mesh.scale.y *= massScale;
    mesh.scale.z *= massScale;

    mesh.traverse(function (obj) {
      var n = obj.name ? obj.name.toLowerCase() : '';

      if (/wing|feather/.test(n)) {
        var span = 0.5  + nt('wingspan',  traits.wingspan)  * 1.1;
        var area = 0.55 + nt('wingArea',  traits.wingArea)  * 0.95;
        obj.scale.x *= span;
        obj.scale.z *= area;
        obj.scale.y *= (span + area) * 0.5;
      }

      if (/tail/.test(n)) {
        var ts = 0.55 + nt('tailSize', traits.tailSize) * 0.95;
        obj.scale.y *= ts;
        obj.scale.z *= ts;
      }

      if (/neck/.test(n)) {
        obj.scale.y *= 0.6 + nt('neckLength', traits.neckLength) * 0.9;
      }

      if (/head|skull/.test(n)) {
        var hs = 0.88 + nt('intelligence', traits.intelligence) * 0.24;
        obj.scale.x *= hs;
        obj.scale.y *= hs;
        obj.scale.z *= hs;
      }

      if (/spine|torso|belly|chest/.test(n)) {
        var bs = 0.82 + (nt('stomachCapacity', traits.stomachCapacity) +
                         nt('fuelGlandSize',   traits.fuelGlandSize))   * 0.19;
        obj.scale.x *= bs;
        obj.scale.z *= bs;
      }
    });
  }

  // --------------------------------------------------------
  // TINT  (clone materials; mark owned copies for safe dispose)
  // --------------------------------------------------------
  function applyTint(mesh, hexColor) {
    if (!hexColor) return;
    var color = new THREE.Color(hexColor);
    mesh.traverse(function (obj) {
      if (!obj.isMesh) return;
      var processMat = function (m) {
        var nm = m.clone();
        nm.color.multiply(color); // blend tint with baked texture colour
        nm._owned = true;
        if (m._owned) m.dispose();
        return nm;
      };
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map(processMat);
      } else if (obj.material) {
        obj.material = processMat(obj.material);
      }
    });
  }

  // --------------------------------------------------------
  // PUBLIC: BUILD / UPDATE PLAYER DRAGON
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    _pTraits = traits;
    if (tintColor) _pTint = tintColor;

    if (!glbTemplate) return; // loadDragonGLB callback will call us when ready

    // Remove previous
    if (playerWrapper) {
      scene.remove(playerWrapper);
      disposeInstance(playerWrapper);
    }

    var inst = createInstance(_pTraits, _pTint);
    if (!inst) return;

    playerWrapper = inst.wrapper;
    playerMixer   = inst.mixer;
    playerWrapper.userData.lastTint = _pTint;

    if (currentMode === 'lab') {
      playerWrapper.position.set(0, 0, 0);
    } else {
      playerWrapper.position.set(-2.5, 0, 0);
      playerWrapper.rotation.y = Math.PI * 0.15; // face slightly right
    }

    scene.add(playerWrapper);
  }

  function updateDragon(traits, tintColor) {
    _pTraits = traits;
    if (tintColor) _pTint = tintColor;

    if (!glbTemplate) return;
    if (!playerWrapper) { buildPlayerDragon(_pTraits, _pTint); return; }

    var mesh = playerWrapper.children[0];
    if (!mesh) return;

    restoreBaseScales(mesh);
    applyTraits(mesh, _pTraits);

    if (tintColor && tintColor !== playerWrapper.userData.lastTint) {
      applyTint(mesh, _pTint);
      playerWrapper.userData.lastTint = _pTint;
    }
  }

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    _pTraits = playerTraits; if (playerTint) _pTint = playerTint;
    _eTraits = enemyTraits;  if (enemyTint)  _eTint = enemyTint;

    camera.position.set(0, 2.5, 11);
    controls.target.set(0, 1.0, 0);
    controls.update();

    var arenaColors = {
      mountains: 0x2a3a2e, tundra: 0x2a3a4a,
      volcanic:  0x3a1a1a, forest: 0x1a2a1a, plains: 0x3a3a2a
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x06060f);
    scene.fog = null;

    // Rebuild player on the left, facing right
    if (playerWrapper) { scene.remove(playerWrapper); disposeInstance(playerWrapper); }
    var pInst = createInstance(_pTraits, _pTint);
    if (pInst) {
      playerWrapper = pInst.wrapper;
      playerMixer   = pInst.mixer;
      playerWrapper.userData.lastTint = _pTint;
      playerWrapper.position.set(-2.5, 0, 0);
      playerWrapper.rotation.y = -Math.PI * 0.15;
      scene.add(playerWrapper);
    }

    // Build enemy on the right, facing left
    if (enemyWrapper) { scene.remove(enemyWrapper); disposeInstance(enemyWrapper); }
    var eInst = createInstance(_eTraits, _eTint);
    if (eInst) {
      enemyWrapper = eInst.wrapper;
      enemyMixer   = eInst.mixer;
      enemyWrapper.userData.lastTint = _eTint;
      enemyWrapper.position.set(2.5, 0, 0);
      enemyWrapper.rotation.y = Math.PI + Math.PI * 0.15; // facing left
      scene.add(enemyWrapper);
    }
  }

  function returnToLab() {
    currentMode = 'lab';

    // Remove enemy
    if (enemyWrapper) { scene.remove(enemyWrapper); disposeInstance(enemyWrapper); }
    enemyWrapper = null;
    enemyMixer   = null;
    _eTraits = null;

    // Recentre player
    if (playerWrapper) playerWrapper.position.set(0, 0, 0);

    camera.position.set(0, 2.5, 9);
    controls.target.set(0, 1.0, 0);
    controls.update();
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);
  }

  // --------------------------------------------------------
  // BATTLE TICK EFFECTS  (particle system — unchanged logic)
  // --------------------------------------------------------
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;
    var pAction = tickRecord.playerAction;
    var eAction = tickRecord.enemyAction;

    if (pAction === 'fireBurst' || pAction === 'sustainedFire') playFireEffect(pPos, ePos);
    if (eAction === 'fireBurst' || eAction === 'sustainedFire') playFireEffect(ePos, pPos);
    if (tickRecord.playerDamageDealt > 5) playImpactEffect(ePos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    if (tickRecord.enemyDamageDealt  > 5) playImpactEffect(pPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
  }

  function playFireEffect(start, end) {
    for (var i = 0; i < 10; i++) {
      var geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 5, 4);
      var mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      var p = new THREE.Mesh(geo, mat);
      p.position.copy(start).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, 0));
      scene.add(p);
      fireParticles.push({
        mesh: p, start: start.clone(), end: end.clone(),
        progress: i * -0.06, speed: 1.5 + Math.random() * 0.5
      });
    }
  }

  function playImpactEffect(position) {
    var geo = new THREE.SphereGeometry(0.2, 8, 6);
    var mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    var fl  = new THREE.Mesh(geo, mat);
    fl.position.copy(position);
    scene.add(fl);
    impactFlashes.push({ mesh: fl, life: 1.0 });
  }

  // --------------------------------------------------------
  // ENVIRONMENT
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    var ec = {
      mountains: 0x1a2a1e, tundra: 0x1a2a3a,
      volcanic:  0x2a1010, forest: 0x0a1a0a, plains: 0x1a1a10
    };
    scene.background = new THREE.Color(ec[habitatKey] || 0x06060f);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 16, 36);
  }

  // --------------------------------------------------------
  // LIGHTING
  // --------------------------------------------------------
  function setupLabLighting() {
    scene.add(new THREE.HemisphereLight(0x335588, 0x112233, 0.50));

    var key = new THREE.DirectionalLight(0xddeeff, 1.4);
    key.position.set(2, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far  = 30;
    key.shadow.camera.left = key.shadow.camera.bottom = -8;
    key.shadow.camera.right = key.shadow.camera.top = 8;
    scene.add(key);

    var fill = new THREE.PointLight(0x00ccaa, 0.55, 12);
    fill.position.set(0, -0.2, 0);
    scene.add(fill);

    var rim = new THREE.PointLight(0x2244cc, 0.48, 18);
    rim.position.set(-4, 5, -5);
    scene.add(rim);
  }

  // --------------------------------------------------------
  // FLOOR
  // --------------------------------------------------------
  function setupLabFloor() {
    var grid = new THREE.GridHelper(24, 32, 0x003333, 0x001a1a);
    scene.add(grid);

    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x06060e, roughness: 0.92, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // --------------------------------------------------------
  // ANIMATION LOOP
  // --------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();
    var time  = clock.getElapsedTime();

    controls.update();

    // Update skeletal animation mixers
    if (playerMixer) playerMixer.update(delta);
    if (enemyMixer)  enemyMixer.update(delta);

    // Procedural idle bob (if no skeletal animation)
    if (playerWrapper && !playerMixer) {
      playerWrapper.position.y = Math.sin(time * 1.2) * 0.06;
    }
    if (enemyWrapper && !enemyMixer) {
      enemyWrapper.position.y = Math.sin(time * 1.2 + Math.PI) * 0.06;
    }

    updateParticles(delta);
    renderer.render(scene, camera);
  }

  function updateParticles(delta) {
    fireParticles = fireParticles.filter(function (fp) {
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

    impactFlashes = impactFlashes.filter(function (fl) {
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
  // DISPOSE HELPER
  // --------------------------------------------------------
  function disposeInstance(wrapper) {
    if (!wrapper) return;
    wrapper.traverse(function (obj) {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        var disposeMat = function (m) { if (m && m._owned) m.dispose(); };
        if (Array.isArray(obj.material)) obj.material.forEach(disposeMat);
        else disposeMat(obj.material);
      }
    });
  }

  // --------------------------------------------------------
  // RESIZE
  // --------------------------------------------------------
  function resize(container) {
    if (!renderer) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------
  // PUBLIC API  (identical surface to original)
  // --------------------------------------------------------
  return {
    init, buildPlayerDragon, updateDragon,
    initBattleArena, returnToLab, animateBattleTick,
    playFireEffect, playImpactEffect,
    setEnvironment, resetEnvironment, resize
  };
})();

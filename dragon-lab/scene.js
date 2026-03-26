// ============================================================
// Dragon Engineering Lab — Three.js Scene
// 3D dragon visualization, lab environment, battle arena,
// idle animations, and stat-reactive mesh updates.
// ============================================================

window.Scene = (function() {
  let renderer, scene, camera, controls;
  let dragonGroup, enemyGroup;
  let clock;
  let animationId;
  let currentMode = 'lab'; // 'lab' or 'battle'
  let labObjects = [];
  let battleObjects = [];

  const DRAGON_PARTS = {};
  const ENEMY_PARTS = {};

  // --------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------
  function init(container) {
    clock = new THREE.Clock();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080810);
    scene.fog = new THREE.Fog(0x080810, 14, 32);

    // Camera — 3/4 front angle, slightly elevated
    camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(2.8, 2.6, 6.5);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.update();

    // Lighting
    setupLabLighting();

    // Floor
    setupLabFloor();

    // Dragon
    dragonGroup = new THREE.Group();
    dragonGroup.position.set(0, 0, 0);
    scene.add(dragonGroup);

    // Start animation loop
    animate();

    // Resize handler
    window.addEventListener('resize', () => resize(container));
  }

  function setupLabLighting() {
    // Clear existing lights
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    // Ambient sky/ground
    const hemi = new THREE.HemisphereLight(0x3355aa, 0x112233, 0.55);
    scene.add(hemi);
    labObjects.push(hemi);

    // Main key light — top-front-left, warm-cool white
    const key = new THREE.DirectionalLight(0xddeeff, 1.4);
    key.position.set(3, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 28;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    scene.add(key);
    labObjects.push(key);

    // Lab floor glow — teal science lab light from below
    const floorGlow = new THREE.PointLight(0x00ccaa, 0.55, 9);
    floorGlow.position.set(0, -0.3, 0);
    scene.add(floorGlow);
    labObjects.push(floorGlow);

    // Rim light — blue from rear-left
    const rim = new THREE.PointLight(0x2255cc, 0.5, 16);
    rim.position.set(-5, 4, -4);
    scene.add(rim);
    labObjects.push(rim);

    // Fill light — warm from right-front
    const fill = new THREE.PointLight(0x553311, 0.25, 12);
    fill.position.set(5, 2, 3);
    scene.add(fill);
    labObjects.push(fill);
  }

  function setupLabFloor() {
    const grid = new THREE.GridHelper(20, 30, 0x003333, 0x001a1a);
    grid.position.y = 0;
    scene.add(grid);
    labObjects.push(grid);

    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x08080f, roughness: 0.9, metalness: 0.12
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    labObjects.push(ground);
  }

  // --------------------------------------------------------
  // PROCEDURAL DRAGON BUILDER — hierarchical, silhouette-first
  // --------------------------------------------------------
  function buildDragon(traits, tintColor, partsRef) {
    const group = new THREE.Group();
    const tint = new THREE.Color(tintColor || '#2a8870');

    // Normalized traits (0–1)
    const n = {};
    window.DragonData.TRAITS.forEach(tr => {
      n[tr.id] = (traits[tr.id] - tr.min) / (tr.max - tr.min);
    });

    // Subtle global scale from bodyMass
    const sc = 0.88 + n.bodyMass * 0.24;

    // ---- COLOR PALETTE ----
    const skinC  = new THREE.Color(0x1d5c44).lerp(tint, 0.45);
    const darkC  = new THREE.Color(0x0e2e22).lerp(tint, 0.2);
    const scaleC = new THREE.Color(0x2a7a58).lerp(tint, 0.55);
    const bellyC = new THREE.Color(0x285040).lerp(tint, 0.35);
    const boneC  = new THREE.Color(0x4a4a38);
    const memC   = new THREE.Color(0x7a3028).lerp(tint, 0.22);

    const mtl = 0.12 + n.scaleThickness * 0.28;
    const rgh = 0.78 - n.scaleThickness * 0.28;

    function mkMat(color, m, r) {
      return new THREE.MeshStandardMaterial({
        color: color,
        metalness: m !== undefined ? m : mtl,
        roughness: r !== undefined ? r : rgh
      });
    }

    // ================================================================
    // TORSO GROUP — all anatomy parented here
    // ================================================================
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.86 * sc, 0);
    group.add(torsoGroup);
    partsRef.torsoGroup = torsoGroup;

    // Torso half-extents (local scale units)
    const tW = (0.40 + n.bodyMass * 0.09) * sc;
    const tH = (0.36 + n.bodyMass * 0.07) * sc;
    const tD = (0.62 + n.bodyMass * 0.14) * sc;

    // Main body ellipsoid — streamlined
    const torsoGeo = new THREE.SphereGeometry(1, 22, 14);
    const torsoMesh = new THREE.Mesh(torsoGeo, mkMat(skinC));
    torsoMesh.scale.set(tW, tH, tD);
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);
    partsRef.torso = torsoMesh;

    // Belly — lighter underside, flatter
    const bellyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 10),
      mkMat(bellyC, 0.04, 0.88)
    );
    bellyMesh.scale.set(tW * 0.78, tH * 0.52, tD * 0.9);
    bellyMesh.position.y = -tH * 0.32;
    torsoGroup.add(bellyMesh);

    // ================================================================
    // SPINE RIDGES
    // ================================================================
    const ridgeCount = 4 + Math.floor(n.scaleThickness * 3);
    for (let i = 0; i < ridgeCount; i++) {
      const tp = i / Math.max(ridgeCount - 1, 1);
      const rH = (0.05 + n.scaleThickness * 0.06) * sc * (0.55 + 0.9 * Math.sin(tp * Math.PI));
      const ridge = new THREE.Mesh(
        new THREE.ConeGeometry(rH * 0.28, rH, 4, 1),
        mkMat(boneC, 0.35, 0.45)
      );
      ridge.position.set(0, tH * 0.97, tD * (0.46 - tp * 0.92));
      torsoGroup.add(ridge);
    }

    // ================================================================
    // FUEL SAC — glowing internal organ
    // ================================================================
    const sacR = (0.072 + n.fuelGlandSize * 0.11) * sc;
    const sacMat = new THREE.MeshStandardMaterial({
      color: 0xff5200, emissive: 0xff3100,
      emissiveIntensity: 0.5 + n.fuelGlandSize * 0.9,
      transparent: true, opacity: 0.55 + n.fuelGlandSize * 0.35,
      metalness: 0, roughness: 0.25
    });
    const fuelSac = new THREE.Mesh(new THREE.SphereGeometry(sacR, 10, 8), sacMat);
    fuelSac.position.set(0, -tH * 0.08, tD * 0.18);
    fuelSac.userData.baseEmissive = 0.5 + n.fuelGlandSize * 0.9;
    torsoGroup.add(fuelSac);
    partsRef.fuelSac = fuelSac;

    // ================================================================
    // NECK — 2-segment S-curve chain, parented to torso
    // ================================================================
    const nLen = (0.52 + n.neckLength * 0.56) * sc;
    const nRad = (0.076 + n.bodyMass * 0.028) * sc;

    // neckGroup: attach at front-top of torso
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, tH * 0.62, tD * 0.85);
    torsoGroup.add(neckGroup);
    partsRef.neckGroup = neckGroup;

    // Segment 1 — upward-forward lean
    const nSeg1 = new THREE.Group();
    nSeg1.rotation.x = -0.52;
    neckGroup.add(nSeg1);

    const neck1 = new THREE.Mesh(
      new THREE.CylinderGeometry(nRad * 0.82, nRad, nLen * 0.48, 10, 1),
      mkMat(skinC)
    );
    neck1.position.y = nLen * 0.24;
    neck1.castShadow = true;
    nSeg1.add(neck1);
    partsRef.neck = neck1;

    // Throat underside on seg 1
    const throat1 = new THREE.Mesh(
      new THREE.CylinderGeometry(nRad * 0.62, nRad * 0.78, nLen * 0.48, 8, 1),
      mkMat(bellyC, 0.04, 0.88)
    );
    throat1.scale.set(1, 1, 0.42);
    throat1.position.set(0, nLen * 0.24, nRad * 0.42);
    nSeg1.add(throat1);

    // Segment 2 — gentler forward curve
    const nSeg2 = new THREE.Group();
    nSeg2.position.y = nLen * 0.48;
    nSeg2.rotation.x = -0.28;
    nSeg1.add(nSeg2);

    const neck2 = new THREE.Mesh(
      new THREE.CylinderGeometry(nRad * 0.65, nRad * 0.82, nLen * 0.42, 10, 1),
      mkMat(skinC)
    );
    neck2.position.y = nLen * 0.21;
    neck2.castShadow = true;
    nSeg2.add(neck2);

    const throat2 = new THREE.Mesh(
      new THREE.CylinderGeometry(nRad * 0.5, nRad * 0.62, nLen * 0.42, 8, 1),
      mkMat(bellyC, 0.04, 0.88)
    );
    throat2.scale.set(1, 1, 0.42);
    throat2.position.set(0, nLen * 0.21, nRad * 0.38);
    nSeg2.add(throat2);

    // ================================================================
    // HEAD GROUP — tip of neck chain
    // ================================================================
    const headGroup = new THREE.Group();
    headGroup.position.y = nLen * 0.42;
    headGroup.rotation.x = 0.24; // slight downward gaze
    nSeg2.add(headGroup);
    partsRef.headGroup = headGroup;
    partsRef.headGroupBaseRotX = 0.24;

    const hS = (0.17 + n.bodyMass * 0.038 + n.intelligence * 0.014) * sc;

    // Cranium
    const cranium = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      mkMat(scaleC)
    );
    cranium.scale.set(hS, hS * 0.88, hS * 1.05);
    cranium.castShadow = true;
    headGroup.add(cranium);
    partsRef.head = cranium;

    // Snout — elongated forward, slightly lower
    const snout = new THREE.Mesh(
      new THREE.SphereGeometry(1, 12, 8),
      mkMat(skinC)
    );
    snout.scale.set(hS * 0.56, hS * 0.44, hS * 1.18);
    snout.position.set(0, -hS * 0.17, hS * 0.96);
    snout.castShadow = true;
    headGroup.add(snout);
    partsRef.snout = snout;

    // Lower jaw
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(hS * 0.88, hS * 0.27, hS * 1.5),
      mkMat(darkC)
    );
    jaw.position.set(0, -hS * 0.52, hS * 0.5);
    jaw.castShadow = true;
    headGroup.add(jaw);
    partsRef.jaw = jaw;

    // Cheek ridges — give the head structure
    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 6),
        mkMat(scaleC, mtl + 0.1, rgh - 0.1)
      );
      cheek.scale.set(hS * 0.28, hS * 0.2, hS * 0.5);
      cheek.position.set(sx * hS * 0.54, hS * 0.04, hS * 0.32);
      headGroup.add(cheek);
    }

    // Horns
    const hornH = (0.11 + n.boneDensity * 0.09) * sc;
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.022 * sc, hornH, 6),
        mkMat(boneC, 0.4, 0.38)
      );
      horn.position.set(sx * hS * 0.42, hS * 0.62, -hS * 0.18);
      horn.rotation.z = sx * 0.38;
      horn.rotation.x = -0.18;
      headGroup.add(horn);
      partsRef[sx < 0 ? 'hornL' : 'hornR'] = horn;
    }

    // Eyes — glowing
    const eyeRad = (0.022 + n.intelligence * 0.009) * sc;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x88ffcc, emissive: 0x44ffaa, emissiveIntensity: 0.9,
      metalness: 0, roughness: 0.05
    });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(eyeRad, 10, 8),
        eyeMat.clone()
      );
      eye.position.set(sx * hS * 0.42, hS * 0.14, hS * 0.83);
      headGroup.add(eye);
      partsRef[sx < 0 ? 'eyeL' : 'eyeR'] = eye;
    }

    // ================================================================
    // WINGS — ShapeGeometry membrane with proper dragon-wing silhouette
    // ================================================================
    const spanVal  = (0.85 + n.wingspan * 1.72) * sc;
    const areaVal  = (0.45 + n.wingArea * 0.72) * sc;
    const armRad   = (0.032 + n.boneDensity * 0.013) * sc;

    function buildWing(side) {
      const wGroup = new THREE.Group();
      const sx = side === 'L' ? -1 : 1;

      // Humerus bone — horizontal outward
      const armLen = spanVal * 0.36;
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(armRad * 0.55, armRad, armLen, 8),
        mkMat(boneC, 0.35, 0.42)
      );
      arm.rotation.z = sx * Math.PI * 0.5;
      arm.rotation.x = -0.1;
      arm.position.x = sx * armLen * 0.5;
      arm.castShadow = true;
      wGroup.add(arm);
      partsRef['wingArm' + side] = arm;

      // Forearm — continues outward at shallow angle
      const foreLen = spanVal * 0.28;
      const fore = new THREE.Mesh(
        new THREE.CylinderGeometry(armRad * 0.38, armRad * 0.55, foreLen, 8),
        mkMat(boneC, 0.35, 0.42)
      );
      fore.rotation.z = sx * (Math.PI * 0.5 + 0.22);
      fore.position.x = sx * (armLen + foreLen * 0.45);
      fore.position.y = -foreLen * 0.12;
      wGroup.add(fore);

      // Membrane — ShapeGeometry for clean wing silhouette
      // Shape is in XY plane; X goes outward, Y goes down for trailing edge
      const s  = spanVal;  // absolute span magnitude
      const a  = areaVal;  // absolute area magnitude
      const d  = sx;       // direction: -1 for left, +1 for right

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      // Leading edge — sweeps outward and slightly up
      shape.bezierCurveTo(d*s*0.15, 0.06*a,  d*s*0.35, 0.09*a,  d*s*0.55, 0.04*a);
      // Outer wingtip arc
      shape.bezierCurveTo(d*s*0.72, 0,        d*s*0.92, -0.08*a, d*s*0.98, -0.2*a);
      // Trailing outer edge — curves back
      shape.bezierCurveTo(d*s*0.9, -0.38*a,   d*s*0.72, -0.58*a, d*s*0.58, -0.72*a);
      // Trailing inner curve — membrane drape
      shape.bezierCurveTo(d*s*0.4, -0.88*a,   d*s*0.2, -0.84*a, d*s*0.09, -0.74*a);
      // Inner trailing edge back to body
      shape.bezierCurveTo(d*s*0.04, -0.56*a,  0, -0.38*a,        0, -0.26*a);
      shape.lineTo(0, 0);

      const memMat = new THREE.MeshStandardMaterial({
        color: memC,
        transparent: true,
        opacity: 0.5 + n.wingArea * 0.28,
        side: THREE.DoubleSide,
        metalness: 0.04, roughness: 0.72
      });
      const mem = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), memMat);
      wGroup.add(mem);
      partsRef['wingMem' + side] = mem;

      return wGroup;
    }

    const wingL = buildWing('L');
    wingL.position.set(-tW * 0.88, tH * 0.36, tD * 0.05);
    torsoGroup.add(wingL);
    partsRef.wingGroupL = wingL;

    const wingR = buildWing('R');
    wingR.position.set(tW * 0.88, tH * 0.36, tD * 0.05);
    torsoGroup.add(wingR);
    partsRef.wingGroupR = wingR;

    // ================================================================
    // TAIL — hierarchical tapered chain
    // ================================================================
    const tLen    = (0.72 + n.tailSize * 0.95) * sc;
    const tBase   = (0.075 + n.tailSize * 0.04 + n.bodyMass * 0.017) * sc;

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -tH * 0.2, -tD * 0.88);
    tailGroup.rotation.x = Math.PI * 0.28; // angle back and down
    torsoGroup.add(tailGroup);
    partsRef.tailGroup = tailGroup;

    // Segment 1
    const tailSeg1 = new THREE.Mesh(
      new THREE.CylinderGeometry(tBase * 0.52, tBase, tLen * 0.48, 10),
      mkMat(skinC)
    );
    tailSeg1.position.y = -tLen * 0.24;
    tailSeg1.castShadow = true;
    tailGroup.add(tailSeg1);
    partsRef.tailBase = tailSeg1;

    // Dorsal spikes on tail
    for (let i = 0; i < 3; i++) {
      const spH = (0.034 + n.scaleThickness * 0.028) * sc;
      const sp = new THREE.Mesh(
        new THREE.ConeGeometry(spH * 0.24, spH, 4),
        mkMat(boneC, 0.3, 0.45)
      );
      sp.position.set(0, -tLen * (0.07 + i * 0.135), 0);
      tailGroup.add(sp);
    }

    // Segment 2 — curves further
    const tail2Group = new THREE.Group();
    tail2Group.position.y = -tLen * 0.48;
    tail2Group.rotation.x = 0.35;
    tailGroup.add(tail2Group);

    const tailSeg2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014 * sc, tBase * 0.52, tLen * 0.52, 10),
      mkMat(skinC)
    );
    tailSeg2.position.y = -tLen * 0.26;
    tailSeg2.castShadow = true;
    tail2Group.add(tailSeg2);

    // Tail tip blade
    const tipR  = (0.038 + n.tailSize * 0.018) * sc;
    const tipH  = (0.11  + n.tailSize * 0.09) * sc;
    const tailTip = new THREE.Mesh(
      new THREE.ConeGeometry(tipR, tipH, 4),
      mkMat(boneC, 0.32, 0.4)
    );
    tailTip.position.y = -(tLen * 0.26 + tipH * 0.5);
    tail2Group.add(tailTip);
    partsRef.tailTip = tailTip;

    // ================================================================
    // LEGS — reptile splay, parented to torsoGroup
    // ================================================================
    const musF  = 0.72 + n.musclePower * 0.56;
    const lgRad = (0.052 + n.bodyMass * 0.017) * sc * musF;
    const lgLen = (0.27  + n.bodyMass * 0.08)  * sc;

    function buildLeg(name, sx, zOff, isHind) {
      const lg = new THREE.Group();
      const rad = isHind ? lgRad * 1.12 : lgRad;
      const len = isHind ? lgLen * 1.08 : lgLen;

      // Upper leg (femur) — splays out from torso side
      const upper = new THREE.Mesh(
        new THREE.CylinderGeometry(rad * 0.74, rad, len * 0.52, 8),
        mkMat(skinC)
      );
      upper.position.set(sx * (tW + rad * 0.22), -tH * 0.84 - len * 0.13, zOff);
      upper.rotation.z = sx * 0.34;
      upper.rotation.x = isHind ? 0.22 : -0.16;
      upper.castShadow = true;
      lg.add(upper);
      partsRef[name] = upper;

      // Lower leg (shin) — hangs down from knee
      const lower = new THREE.Mesh(
        new THREE.CylinderGeometry(rad * 0.44, rad * 0.7, len * 0.5, 8),
        mkMat(darkC)
      );
      lower.position.set(
        sx * (tW + rad * 0.44 + len * 0.16),
        upper.position.y - len * 0.52 - len * 0.12,
        zOff + (isHind ? len * 0.14 : -len * 0.1)
      );
      lower.rotation.z = sx * 0.08;
      lower.castShadow = true;
      lg.add(lower);

      // Foot
      const foot = new THREE.Mesh(
        new THREE.SphereGeometry(rad * 0.75, 8, 6),
        mkMat(boneC, 0.28, 0.48)
      );
      foot.scale.set(1.1, 0.44, 1.32);
      foot.position.set(lower.position.x, lower.position.y - len * 0.3, lower.position.z);
      lg.add(foot);

      return lg;
    }

    torsoGroup.add(buildLeg('foreL', -1,  tD * 0.48, false));
    torsoGroup.add(buildLeg('foreR',  1,  tD * 0.48, false));
    torsoGroup.add(buildLeg('hindL', -1, -tD * 0.36, true));
    torsoGroup.add(buildLeg('hindR',  1, -tD * 0.36, true));

    return group;
  }

  // --------------------------------------------------------
  // BUILD / REBUILD PLAYER DRAGON
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    if (dragonGroup) {
      while (dragonGroup.children.length > 0) {
        const child = dragonGroup.children[0];
        dragonGroup.remove(child);
        child.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      }
    }
    Object.keys(DRAGON_PARTS).forEach(k => delete DRAGON_PARTS[k]);

    const newDragon = buildDragon(traits, tintColor, DRAGON_PARTS);
    newDragon.children.forEach(child => dragonGroup.add(child));
  }

  // --------------------------------------------------------
  // UPDATE DRAGON
  // --------------------------------------------------------
  function updateDragon(traits, tintColor) {
    buildPlayerDragon(traits, tintColor);
  }

  // --------------------------------------------------------
  // IDLE ANIMATION
  // --------------------------------------------------------
  function animateIdle(time) {
    if (!DRAGON_PARTS.torsoGroup) return;

    // Breathing — gentle chest expansion
    const breath = Math.sin(time * 1.75) * 0.018;
    DRAGON_PARTS.torsoGroup.scale.set(1, 1 + breath, 1 + breath * 0.5);

    // Neck sway — slow, elegant
    if (DRAGON_PARTS.neckGroup) {
      DRAGON_PARTS.neckGroup.rotation.z = Math.sin(time * 0.85) * 0.04;
    }

    // Head bob
    if (DRAGON_PARTS.headGroup) {
      const baseX = DRAGON_PARTS.headGroup.userData.baseRotX || 0.24;
      DRAGON_PARTS.headGroup.rotation.x = baseX + Math.sin(time * 1.45) * 0.028;
      DRAGON_PARTS.headGroup.rotation.z = Math.sin(time * 0.65) * 0.022;
    }

    // Wing settle — gentle droop and lift
    const wingBob = Math.sin(time * 0.78) * 0.022;
    if (DRAGON_PARTS.wingGroupL) DRAGON_PARTS.wingGroupL.rotation.z =  wingBob;
    if (DRAGON_PARTS.wingGroupR) DRAGON_PARTS.wingGroupR.rotation.z = -wingBob;

    // Tail sway
    if (DRAGON_PARTS.tailGroup) {
      DRAGON_PARTS.tailGroup.rotation.y = Math.sin(time * 1.1) * 0.2;
    }

    // Fuel sac pulse
    if (DRAGON_PARTS.fuelSac && DRAGON_PARTS.fuelSac.material) {
      const base = DRAGON_PARTS.fuelSac.userData.baseEmissive || 0.5;
      DRAGON_PARTS.fuelSac.material.emissiveIntensity = base + Math.sin(time * 2.4) * 0.15;
    }
  }

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';

    camera.position.set(0, 6, 14);
    controls.target.set(0, 1.5, 0);

    const arenaColors = {
      mountains: 0x2a3a2e, tundra: 0x2a3a4a,
      volcanic: 0x3a1a1a, forest: 0x1a2a1a, plains: 0x3a3a2a
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x080810);

    dragonGroup.position.set(-3, 0, 0);
    dragonGroup.rotation.y = Math.PI * 0.15;

    if (enemyGroup) scene.remove(enemyGroup);
    enemyGroup = new THREE.Group();
    const enemyBuilt = buildDragon(enemyTraits, enemyTint, ENEMY_PARTS);
    enemyBuilt.children.forEach(child => enemyGroup.add(child));
    enemyGroup.position.set(3, 0, 0);
    enemyGroup.rotation.y = -Math.PI * 0.15;
    scene.add(enemyGroup);
  }

  function returnToLab() {
    currentMode = 'lab';
    camera.position.set(2.8, 2.6, 6.5);
    controls.target.set(0, 1.1, 0);
    dragonGroup.position.set(0, 0, 0);
    dragonGroup.rotation.y = 0;
    scene.background = new THREE.Color(0x080810);

    if (enemyGroup) {
      scene.remove(enemyGroup);
      enemyGroup = null;
    }
    Object.keys(ENEMY_PARTS).forEach(k => delete ENEMY_PARTS[k]);
  }

  // --------------------------------------------------------
  // BATTLE TICK ANIMATION
  // --------------------------------------------------------
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;

    const pAction = tickRecord.playerAction;
    const eAction = tickRecord.enemyAction;

    if (['lunge', 'bite', 'claw', 'pressure'].includes(pAction)) {
      animateLunge(dragonGroup, 0.3);
    }
    if (['lunge', 'bite', 'claw', 'pressure'].includes(eAction)) {
      animateLunge(enemyGroup, -0.3);
    }

    if (['fireBurst', 'sustainedFire'].includes(pAction)) {
      playFireEffect(dragonGroup, enemyGroup);
    }
    if (['fireBurst', 'sustainedFire'].includes(eAction)) {
      playFireEffect(enemyGroup, dragonGroup);
    }

    if (tickRecord.playerDamageDealt > 5 && enemyGroup) {
      playImpactEffect(enemyGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
    if (tickRecord.enemyDamageDealt > 5) {
      playImpactEffect(dragonGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
  }

  let lungeAnims = [];
  function animateLunge(group, offset) {
    if (!group) return;
    const startZ = group.position.z;
    lungeAnims.push({ group, offset, startZ, phase: 0, duration: 0.4 });
  }

  let fireParticles = [];
  function playFireEffect(source, target) {
    if (!source || !target) return;
    const start = source.position.clone().add(new THREE.Vector3(0, 2, 0.5));
    const end   = target.position.clone().add(new THREE.Vector3(0, 1.5, 0));

    for (let i = 0; i < 12; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 6, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(start).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, 0
      ));
      scene.add(particle);
      fireParticles.push({
        mesh: particle, start: start.clone(), end: end.clone(),
        progress: i * -0.05, speed: 1.5 + Math.random() * 0.5
      });
    }
  }

  let impactFlashes = [];
  function playImpactEffect(position) {
    const geo = new THREE.SphereGeometry(0.15, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const flash = new THREE.Mesh(geo, mat);
    flash.position.copy(position);
    scene.add(flash);
    impactFlashes.push({ mesh: flash, life: 1.0 });
  }

  // --------------------------------------------------------
  // ANIMATION LOOP
  // --------------------------------------------------------
  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time  = clock.getElapsedTime();

    controls.update();

    if (currentMode === 'lab') {
      animateIdle(time);
    }

    // Lunge animations
    lungeAnims = lungeAnims.filter(la => {
      la.phase += delta / la.duration;
      if (la.phase >= 1) { la.group.position.z = la.startZ; return false; }
      const t = la.phase < 0.5 ? la.phase * 2 : (1 - la.phase) * 2;
      la.group.position.z = la.startZ + la.offset * t;
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
  // RESIZE
  // --------------------------------------------------------
  function resize(container) {
    if (!renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------
  // ENVIRONMENT PREVIEW
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    const envColors = {
      mountains: { bg: 0x1a2a1e, fog: 0x1a2a1e },
      tundra:    { bg: 0x1a2a3a, fog: 0x2a3a4a },
      volcanic:  { bg: 0x2a1010, fog: 0x3a1a1a },
      forest:    { bg: 0x0a1a0a, fog: 0x1a2a1a },
      plains:    { bg: 0x1a1a10, fog: 0x2a2a1a }
    };
    const env = envColors[habitatKey] || { bg: 0x080810, fog: 0x080810 };
    scene.background = new THREE.Color(env.bg);
    scene.fog = new THREE.Fog(env.fog, 14, 32);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x080810);
    scene.fog = new THREE.Fog(0x080810, 14, 32);
  }

  return {
    init, buildPlayerDragon, updateDragon,
    initBattleArena, returnToLab, animateBattleTick,
    playFireEffect, playImpactEffect,
    setEnvironment, resetEnvironment, resize,
    _dragonGroup: dragonGroup,
    _DRAGON_PARTS: DRAGON_PARTS
  };
})();

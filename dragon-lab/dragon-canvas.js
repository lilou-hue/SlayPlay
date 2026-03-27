// ============================================================
// Dragon Engineering Lab — Canvas Dragon Renderer
// Draws a stylized 2.5D dragon illustration on an HTML5 canvas.
// Called by scene.js to produce a CanvasTexture for Three.js.
// Canvas: 1024 x 700. Dragon faces right in 3/4 side view.
// ============================================================

window.DragonCanvas = (function () {

  // ---- Color helpers ----
  function hex2rgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function lerp(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }

  function rc(c, a) {
    if (a === undefined) return `rgb(${c.r},${c.g},${c.b})`;
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  }

  // ---- Geometry helpers ----
  // Unit perpendicular from segment AB, length len
  function perp(ax, ay, bx, by, len) {
    const dx = bx - ax, dy = by - ay;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / d * len, y: dx / d * len };
  }

  // ============================================================
  // MAIN DRAW FUNCTION
  // ============================================================
  function draw(canvas, traits, tintHex, animTime) {
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Lab specimen display background — dark glass panel with subtle grid
    ctx.fillStyle = 'rgba(6, 8, 18, 0.92)';
    ctx.fillRect(0, 0, W, H);
    // Subtle scan-line grid overlay
    ctx.strokeStyle = 'rgba(0, 60, 50, 0.18)';
    ctx.lineWidth = 0.5;
    const gridStep = 28;
    for (let gx = 0; gx < W; gx += gridStep) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    // Corner brackets (lab aesthetic)
    const bsz = 28, bw2 = 3;
    ctx.strokeStyle = 'rgba(0, 200, 160, 0.55)';
    ctx.lineWidth = bw2;
    for (const [cx2, cy2, sx, sy] of [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]]) {
      ctx.beginPath(); ctx.moveTo(cx2 + sx*bsz, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy*bsz); ctx.stroke();
    }

    const t = animTime || 0;

    // --- Normalize traits ---
    const n = {};
    window.DragonData.TRAITS.forEach(tr => {
      n[tr.id] = (traits[tr.id] - tr.min) / (tr.max - tr.min);
    });

    // ---- Color palette ----
    const tint  = hex2rgb(tintHex || '#2a8870');
    const skin  = lerp({ r: 22, g: 64, b: 50 }, tint, 0.45);
    const top_  = lerp({ r: 34, g: 90, b: 70 }, tint, 0.55);
    const dark  = lerp({ r: 10, g: 30, b: 22 }, tint, 0.25);
    const belly = lerp({ r: 40, g: 88, b: 68 }, tint, 0.38);
    const mem   = lerp({ r: 88, g: 32, b: 24 }, tint, 0.2);
    const bone  = { r: 64, g: 62, b: 48 };
    const eye_c = { r: 100, g: 255, b: 185 };

    // ---- Parameterized scale factors ----
    const sc     = 0.80 + n.bodyMass   * 0.40;  // global body scale
    const nkFac  = 0.75 + n.neckLength * 0.50;  // neck length multiplier
    const tlFac  = 0.68 + n.tailSize   * 0.64;  // tail length multiplier
    const wsF    = 0.60 + n.wingspan   * 0.80;  // wing span multiplier
    const waF    = 0.62 + n.wingArea   * 0.76;  // wing area multiplier
    const musF   = 0.58 + n.musclePower* 0.84;  // leg thickness multiplier
    const insF   = 0.76 + n.insulation  * 0.58;  // belly/fat plumpness
    const stomF  = 0.62 + n.stomachCapacity * 0.70;  // torso barrel depth

    // Breathing oscillation
    const br = Math.sin(t * 1.72) * 0.016;

    // ---- Body anchor points ----
    // Body center-of-mass
    const ox = W * 0.42, oy = H * 0.596;
    // Body half-extents
    const bw = W * 0.192 * sc;
    const bh = H * 0.118 * sc;

    // Neck base (front-top of body)
    const nbx = ox + bw * 0.72,   nby = oy - bh * 0.80;
    // Neck end (head attachment) — S-curve upward-forward
    const nex = nbx + W * 0.054 + W * 0.018 * (nkFac - 1);
    const ney = nby - H * 0.175 * nkFac;
    // Neck bezier control points
    const nc1x = nbx + W * 0.012, nc1y = nby - H * 0.052;
    const nc2x = nex - W * 0.022, nc2y = ney + H * 0.058;
    // Neck tube radius (tapers from base to head)
    const nrBase = bh * 0.28;
    const nrEnd  = bh * 0.135;

    // Head
    const hs  = W * 0.062 * sc;   // head size unit
    const hx  = nex + W * 0.018, hy = ney;
    // Snout tip
    const stx = hx + hs * 1.38,  sty = hy + hs * 0.12;
    // Jaw
    const jx  = stx,              jy  = sty + hs * 0.42;
    // Crown
    const crx = hx + hs * 0.10,  cry = hy  - hs * 0.58;
    // Horn
    const hnL = hs * (0.72 + n.boneDensity * 0.60);
    // Eye
    const eX  = hx + hs * 0.44,  eY  = hy  - hs * 0.07;
    const eR  = hs * 0.150;

    // Tail — S-curve droop with gentle animation sway
    const tbx   = ox - bw * 0.90,  tby  = oy - bh * 0.10;
    const tlLen = W * 0.16 * tlFac;
    const tRad  = bh * 0.29;                                   // body attachment radius (unchanged)
    const tSway = Math.sin(t * 1.10 + 0.55) * H * 0.011;     // idle sway amplitude
    const tc1x  = tbx - tlLen * 0.32, tc1y = tby + H * 0.048 + tSway * 0.50;
    const tc2x  = tbx - tlLen * 0.65, tc2y = tby + H * 0.090 + tSway;
    const ttx   = tbx - tlLen,         tty  = tby + H * 0.064 + tSway * 0.62;

    // Wing
    const wSpan = W * 0.27 * wsF;
    const wArea = H * 0.30 * waF;
    const wrx  = ox + bw * 0.42,  wry  = oy - bh * 0.90;
    const wax  = wrx + W * 0.035 * wsF, way = wry - H * 0.12 * wsF;
    const wf1x = wax + wSpan * 0.36, wf1y = way - wArea * 0.60;
    const wf2x = wax + wSpan * 0.51, wf2y = way - wArea * 0.38;
    const wf3x = wax + wSpan * 0.56, wf3y = way - wArea * 0.12;
    const wtx  = ox + bw * 0.08,  wty  = oy - bh * 0.74;
    const wbx  = ox - bw * 0.26,  wby  = oy - bh * 0.36;

    // Legs — digitigrade theropod stance
    // legW: muscle thickness driven by musclePower + bodyMass scale
    const legW    = (4.6 + n.musclePower * 7.8) * sc;
    const lgW     = legW;                                       // alias for wing arm bone
    const clawLen = (5.5 + n.boneDensity * 11.0) * sc;
    const kSpur   = legW * (0.28 + n.boneDensity * 0.55);      // hind knee spur length

    // Front leg (foreground) — hip socket slightly inside body front
    const flHx = ox + bw * 0.50,  flHy = oy + bh * 0.82;      // hip socket
    const flKx = flHx + W*0.014,  flKy = flHy + H*0.090;      // knee
    const flAx = flKx - W*0.006,  flAy = flKy + H*0.066;      // ankle (raised heel)
    const flMx = flAx + W*0.026,  flMy = flAy + H*0.020;      // metatarsal / toe base

    // Hind leg (mid-ground) — big haunch thigh
    const hlHx = ox - bw * 0.28,  hlHy = oy + bh * 0.82;      // hip socket
    const hlKx = hlHx + W*0.010,  hlKy = hlHy + H*0.098;      // knee
    const hlAx = hlKx - W*0.012,  hlAy = hlKy + H*0.062;      // ankle
    const hlMx = hlAx + W*0.022,  hlMy = hlAy + H*0.018;      // metatarsal / toe base

    // Fuel sac
    const fsR  = (4.5 + n.fuelGlandSize * 8.5) * sc;
    const fsx  = ox + bw * 0.14,   fsy = oy + bh * 0.42;
    const fsGl = Math.max(0.1, 0.42 + n.fuelGlandSize * 0.78 + Math.sin(t * 2.5) * 0.18);

    // Neck perpendicular vectors (for tube shape)
    const pb = perp(nbx, nby, nex, ney, nrBase);
    const pe = perp(nbx, nby, nex, ney, nrEnd);

    // ============================================================
    // LAYER 1 — WING MEMBRANE (behind everything)
    // ============================================================
    {
      const g = ctx.createRadialGradient(wax, way, 0, wax, way, wSpan * 1.15);
      g.addColorStop(0.0, rc(mem, 0.74));
      g.addColorStop(0.55, rc(mem, 0.46));
      g.addColorStop(1.0, rc(mem, 0.10));
      ctx.save();
      ctx.fillStyle = g;
      ctx.strokeStyle = rc({ r: mem.r + 24, g: mem.g + 18, b: mem.b + 12 }, 0.38);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wrx, wry);
      // Leading edge → finger 1
      ctx.bezierCurveTo(
        wax - wSpan * 0.06, wry - wArea * 0.10,
        wf1x - wSpan * 0.10, wf1y + wArea * 0.14,
        wf1x, wf1y
      );
      // Finger 1 → 2 (concave notch)
      ctx.quadraticCurveTo(wf1x + wSpan * 0.09, wf1y + wArea * 0.10, wf2x, wf2y);
      // Finger 2 → 3
      ctx.quadraticCurveTo(wf2x + wSpan * 0.05, wf2y + wArea * 0.08, wf3x, wf3y);
      // Trailing edge → rear body
      ctx.bezierCurveTo(
        wf3x - wSpan * 0.02, wf3y + wArea * 0.22,
        wtx + W * 0.04, wty - H * 0.018,
        wtx, wty
      );
      ctx.bezierCurveTo(
        wtx - W * 0.03, wty + H * 0.04,
        wbx + W * 0.02, wby,
        wbx, wby
      );
      ctx.bezierCurveTo(
        wbx + W * 0.015, wby - H * 0.028,
        wrx - W * 0.012, wry + H * 0.018,
        wrx, wry
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Wing veins
      ctx.save();
      ctx.strokeStyle = rc({ r: mem.r + 32, g: mem.g + 22, b: mem.b + 16 }, 0.50);
      ctx.lineWidth = 1.0;
      ctx.lineCap = 'round';
      for (const [tx, ty] of [[wf1x, wf1y], [wf2x, wf2y], [wf3x, wf3y]]) {
        ctx.beginPath();
        ctx.moveTo(wax, way);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.restore();

      // Wing arm bone
      ctx.save();
      ctx.strokeStyle = rc(bone, 0.72);
      ctx.lineWidth = lgW * 0.40;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wrx, wry);
      ctx.lineTo(wax, way);
      ctx.stroke();
      ctx.restore();
    }

    // ============================================================
    // LAYER 2 — HIND LEG (behind body, digitigrade theropod)
    // ============================================================
    {
      ctx.save();

      // Gradient shared across full leg: top=dark body colour → bottom=skin
      const hlGrad = ctx.createLinearGradient(hlHx, hlHy, hlMx, hlMy + H*0.06);
      hlGrad.addColorStop(0.00, rc(top_));
      hlGrad.addColorStop(0.40, rc(skin));
      hlGrad.addColorStop(1.00, rc(dark));

      // ---- Thigh (hip → knee)  ——  wide haunch ----
      const hlThighW = legW * 1.38;
      const phH = perp(hlHx, hlHy, hlKx, hlKy, hlThighW);
      const phK = perp(hlHx, hlHy, hlKx, hlKy, legW * 0.84);
      const hlThighMx = (hlHx + hlKx) * 0.5, hlThighMy = (hlHy + hlKy) * 0.5;
      const phMid = perp(hlHx, hlHy, hlKx, hlKy, hlThighW * 0.97);
      ctx.fillStyle = hlGrad;
      ctx.strokeStyle = rc(dark, 0.28);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(hlHx + phH.x, hlHy + phH.y);
      // Outer (muscle-bulge) side
      ctx.quadraticCurveTo(
        hlThighMx + phMid.x * 1.22, hlThighMy + phMid.y * 1.22,
        hlKx + phK.x, hlKy + phK.y
      );
      ctx.lineTo(hlKx - phK.x, hlKy - phK.y);
      // Inner side
      ctx.quadraticCurveTo(
        hlThighMx - phMid.x * 0.78, hlThighMy - phMid.y * 0.78,
        hlHx - phH.x, hlHy - phH.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ---- Knee cap circle ----
      ctx.beginPath();
      ctx.arc(hlKx, hlKy, legW * 0.74, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.38), 0.92);
      ctx.fill();

      // ---- Knee spur (bone spike, hind leg only) ----
      // Spur tip = backward along thigh direction, upward
      const hlThighDx = hlHx - hlKx, hlThighDy = hlHy - hlKy;
      const hlThighLen = Math.sqrt(hlThighDx*hlThighDx + hlThighDy*hlThighDy) || 1;
      const hlBackX = hlThighDx / hlThighLen, hlBackY = hlThighDy / hlThighLen;
      const hlPerpX = -hlBackY, hlPerpY = hlBackX;  // perp rotated left
      const spurTx = hlKx + hlBackX * legW * 0.30 + hlPerpX * kSpur;
      const spurTy = hlKy + hlBackY * legW * 0.30 + hlPerpY * kSpur;
      ctx.beginPath();
      ctx.moveTo(hlKx + hlPerpX * legW * 0.55, hlKy + hlPerpY * legW * 0.55);
      ctx.lineTo(spurTx, spurTy);
      ctx.lineTo(hlKx - hlPerpX * legW * 0.30, hlKy - hlPerpY * legW * 0.30);
      ctx.closePath();
      ctx.fillStyle = rc(bone, 0.85);
      ctx.fill();

      // ---- Shin (knee → ankle) ----
      const pshK = perp(hlKx, hlKy, hlAx, hlAy, legW * 0.76);
      const pshA = perp(hlKx, hlKy, hlAx, hlAy, legW * 0.44);
      const hlShinMx = (hlKx + hlAx) * 0.5, hlShinMy = (hlKy + hlAy) * 0.5;
      const pshMid = perp(hlKx, hlKy, hlAx, hlAy, legW * 0.68);
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.moveTo(hlKx + pshK.x, hlKy + pshK.y);
      ctx.quadraticCurveTo(
        hlShinMx + pshMid.x * 0.92, hlShinMy + pshMid.y * 0.92,
        hlAx + pshA.x, hlAy + pshA.y
      );
      ctx.lineTo(hlAx - pshA.x, hlAy - pshA.y);
      ctx.quadraticCurveTo(
        hlShinMx - pshMid.x * 0.72, hlShinMy - pshMid.y * 0.72,
        hlKx - pshK.x, hlKy - pshK.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ---- Ankle knob ----
      ctx.beginPath();
      ctx.arc(hlAx, hlAy, legW * 0.46, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.30), 0.88);
      ctx.fill();

      // ---- Metatarsal (ankle → toe base) ----
      const pmeA = perp(hlAx, hlAy, hlMx, hlMy, legW * 0.50);
      const pmeM = perp(hlAx, hlAy, hlMx, hlMy, legW * 0.34);
      ctx.fillStyle = rc(dark, 0.92);
      ctx.beginPath();
      ctx.moveTo(hlAx + pmeA.x, hlAy + pmeA.y);
      ctx.lineTo(hlMx + pmeM.x, hlMy + pmeM.y);
      ctx.lineTo(hlMx - pmeM.x, hlMy - pmeM.y);
      ctx.lineTo(hlAx - pmeA.x, hlAy - pmeA.y);
      ctx.closePath();
      ctx.fill();

      // ---- Toes × 3 + curved claws ----
      const hlToeAngles = [-0.30, 0.04, 0.38];
      const hlToeLen = legW * 1.18;
      const hlToeW   = legW * 0.25;
      for (const ang of hlToeAngles) {
        const tAng = Math.PI * 0.07 + ang;
        const tEx = hlMx + Math.cos(tAng) * hlToeLen;
        const tEy = hlMy + Math.sin(tAng) * hlToeLen;
        const ptS = perp(hlMx, hlMy, tEx, tEy, hlToeW);
        // Toe bone
        ctx.fillStyle = rc(dark, 0.90);
        ctx.beginPath();
        ctx.moveTo(hlMx + ptS.x, hlMy + ptS.y);
        ctx.lineTo(tEx + ptS.x * 0.28, tEy + ptS.y * 0.28);
        ctx.lineTo(tEx - ptS.x * 0.28, tEy - ptS.y * 0.28);
        ctx.lineTo(hlMx - ptS.x, hlMy - ptS.y);
        ctx.closePath();
        ctx.fill();
        // Claw arc (curves downward at tip)
        ctx.beginPath();
        ctx.moveTo(tEx, tEy);
        ctx.bezierCurveTo(
          tEx + Math.cos(tAng) * clawLen * 0.42, tEy + Math.sin(tAng) * clawLen * 0.42 + clawLen * 0.24,
          tEx + Math.cos(tAng) * clawLen * 0.82, tEy + Math.sin(tAng) * clawLen * 0.82 + clawLen * 0.10,
          tEx + Math.cos(tAng) * clawLen,         tEy + Math.sin(tAng) * clawLen
        );
        ctx.strokeStyle = rc(bone, 0.90);
        ctx.lineWidth = hlToeW * 0.84;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    // ============================================================
    // LAYER 3 — BODY SILHOUETTE + TORSO ANATOMY OVERLAYS
    // ============================================================
    ctx.save();
    // Breathing transform (scale around body center)
    ctx.translate(ox, oy);
    ctx.scale(1 + br * 0.28, 1 + br);
    ctx.translate(-ox, -oy);
    {
      // Four-stop gradient: rim-lit spine → dorsal top → mid skin → dark underside
      const g = ctx.createLinearGradient(ox, oy - bh * 1.24, ox, oy + bh * 1.22);
      g.addColorStop(0.00, rc(lerp(top_, { r: 255, g: 255, b: 255 }, 0.10)));
      g.addColorStop(0.16, rc(top_));
      g.addColorStop(0.42, rc(skin));
      g.addColorStop(0.72, rc(dark));
      g.addColorStop(1.00, rc(dark));
      ctx.fillStyle = g;
      ctx.strokeStyle = rc(dark, 0.44);
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      // ---- UPPER: tail top → haunch bump → waist dip → shoulder hump → neck ----
      ctx.moveTo(tbx, tby - tRad * 0.70);
      ctx.bezierCurveTo(
        tbx + bw * 0.18, oy - bh * (0.80 + musF * 0.05),   // haunch ctrl — rear rise
        ox  - bw * 0.24, oy - bh * (0.90 + musF * 0.05),   // waist dip ctrl
        ox  + bw * 0.10, oy - bh * (0.93 + musF * 0.12)    // shoulder hump peak
      );
      ctx.bezierCurveTo(
        ox + bw * 0.50, oy - bh * (0.92 + musF * 0.09),    // chest-shoulder ctrl
        nbx - W * 0.010, nby + H * 0.012,
        nbx, nby
      );
      // Neck upper side (S-curve — unchanged)
      ctx.bezierCurveTo(nc1x, nc1y, nc2x, nc2y, nex, ney);
      // Head upper arc → crown
      ctx.bezierCurveTo(
        hx - hs * 0.18, hy - hs * 0.72,
        crx - hs * 0.08, cry + hs * 0.12,
        crx, cry
      );
      // Forehead → snout bridge
      ctx.bezierCurveTo(
        crx + hs * 0.38, cry - hs * 0.08,
        stx - hs * 0.20, sty - hs * 0.22,
        stx, sty
      );
      // Snout tip → jaw
      ctx.bezierCurveTo(
        stx + hs * 0.09, sty + hs * 0.16,
        jx + hs * 0.09, jy - hs * 0.08,
        jx, jy
      );
      // Lower jaw → back to neck base
      ctx.bezierCurveTo(
        jx - hs * 0.30, jy + hs * 0.10,
        hx + hs * 0.10, hy + hs * 0.48,
        hx - hs * 0.10, hy + hs * 0.38
      );
      ctx.bezierCurveTo(
        nc2x - W * 0.010, nc2y + H * 0.062,
        nc1x - W * 0.014, nc1y + H * 0.052,
        nbx - W * 0.010, nby + H * 0.068
      );
      // ---- LOWER: chest → barrel belly (insF/stomF) → haunch → tail base ----
      ctx.bezierCurveTo(
        ox + bw * (0.52 + musF * 0.04), oy + bh * (0.52 + stomF * 0.05),
        ox + bw * 0.08, oy + bh * (0.98 + insF * 0.06),
        ox - bw * 0.08, oy + bh * (1.00 + insF * 0.07)
      );
      ctx.bezierCurveTo(
        ox - bw * 0.48, oy + bh * (0.96 + insF * 0.05),
        tbx + bw * 0.26, oy + bh * (0.76 + insF * 0.03),
        tbx, tby + tRad * 0.70
      );
      // Around tail base stub
      ctx.bezierCurveTo(
        tbx - bw * 0.04, tby + tRad * 0.30,
        tbx - bw * 0.04, tby - tRad * 0.30,
        tbx, tby - tRad * 0.70
      );
      ctx.fill();
      ctx.stroke();

      // ---- SHOULDER MUSCLE PAD — wing root / front-leg socket bulge ----
      const shlCx = ox + bw * 0.38, shlCy = oy - bh * 0.72;
      const shlG = ctx.createRadialGradient(shlCx, shlCy, 0, shlCx, shlCy, bw * 0.38);
      shlG.addColorStop(0.0, rc(skin, 0.44));
      shlG.addColorStop(0.5, rc(skin, 0.18));
      shlG.addColorStop(1.0, rc(skin, 0.0));
      ctx.fillStyle = shlG;
      ctx.beginPath();
      ctx.ellipse(shlCx, shlCy, bw * (0.28 + musF * 0.09), bh * (0.56 + musF * 0.13), 0.14, 0, Math.PI * 2);
      ctx.fill();

      // ---- HAUNCH MUSCLE PAD — rear-leg attachment mass ----
      const hchCx = ox - bw * 0.20, hchCy = oy + bh * 0.44;
      const hchG = ctx.createRadialGradient(hchCx, hchCy, 0, hchCx, hchCy, bw * 0.32);
      hchG.addColorStop(0.0, rc(skin, 0.36));
      hchG.addColorStop(0.6, rc(skin, 0.13));
      hchG.addColorStop(1.0, rc(skin, 0.0));
      ctx.fillStyle = hchG;
      ctx.beginPath();
      ctx.ellipse(hchCx, hchCy, bw * (0.24 + musF * 0.09), bh * (0.60 + musF * 0.12), -0.10, 0, Math.PI * 2);
      ctx.fill();

      // ---- DORSAL RIM LIGHT — soft highlight along spine ridge ----
      const rimG = ctx.createLinearGradient(ox - bw * 0.22, oy - bh * 0.90, ox + bw * 0.48, oy - bh * 1.05);
      rimG.addColorStop(0.0,  rc(top_, 0.0));
      rimG.addColorStop(0.44, rc(lerp(top_, { r: 255, g: 255, b: 255 }, 0.22), 0.34));
      rimG.addColorStop(1.0,  rc(top_, 0.0));
      ctx.fillStyle = rimG;
      ctx.beginPath();
      ctx.ellipse(ox + bw * 0.14, oy - bh * (0.95 + musF * 0.08), bw * 0.40, bh * 0.08, -0.10, 0, Math.PI * 2);
      ctx.fill();

      // ---- RIBCAGE SURFACE HINT — visible arc strokes at high musclePower ----
      if (n.musclePower > 0.14) {
        ctx.save();
        const ribOp = (n.musclePower - 0.14) * 0.26;
        const ribN = 4;
        for (let ri = 0; ri < ribN; ri++) {
          const tR   = 0.16 + ri / (ribN - 1) * 0.58;
          const ribx = nbx - bw * (0.14 + tR * 1.00);
          const riby = oy  - bh * (0.78 - tR * 0.18);
          const ribH = bh  * (0.34 + tR * 0.24);
          ctx.strokeStyle = rc(lerp(skin, { r: 255, g: 255, b: 255 }, 0.08), ribOp);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(ribx - ribH * 0.10, riby + ribH * 0.08, ribH, -Math.PI * 0.58, Math.PI * 0.08);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();

    // ============================================================
    // LAYER 4 — BELLY PLATES + SCALE SEGMENTS
    // ============================================================
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(1 + br * 0.28, 1 + br);
    ctx.translate(-ox, -oy);
    {
      // Belly plate band: organic shape that sags with insulation, widens with stomachCapacity
      const bCy = oy + bh * (0.30 + insF * 0.05);             // band vertical centre
      const bHH = bh * (0.54 + insF * 0.10);                   // half-height
      const bHW = bw * (0.44 + stomF * 0.07);                  // half-width

      const bg = ctx.createLinearGradient(ox, bCy - bHH, ox, bCy + bHH);
      bg.addColorStop(0.00, rc(belly, 0.00));
      bg.addColorStop(0.22, rc(belly, 0.70));
      bg.addColorStop(0.58, rc(belly, 0.52));
      bg.addColorStop(1.00, rc(belly, 0.00));
      ctx.fillStyle = bg;

      // Organic belly path: wider mid-section, tapers toward chest (right) and tail (left)
      ctx.beginPath();
      ctx.moveTo(ox + bHW, bCy);
      ctx.bezierCurveTo(
        ox + bHW * 0.90, bCy - bHH * 0.58,
        ox + bHW * 0.40, bCy - bHH,
        ox - bHW * 0.22, bCy - bHH * 0.88
      );
      ctx.bezierCurveTo(
        ox - bHW * 0.72, bCy - bHH * 0.76,
        ox - bHW * 0.96, bCy - bHH * 0.08,
        ox - bHW * 0.96, bCy + bHH * 0.32
      );
      ctx.bezierCurveTo(
        ox - bHW * 0.86, bCy + bHH,
        ox - bHW * 0.38, bCy + bHH * 0.90,
        ox + bHW * 0.22, bCy + bHH * 0.78
      );
      ctx.bezierCurveTo(
        ox + bHW * 0.70, bCy + bHH * 0.56,
        ox + bHW * 0.96, bCy + bHH * 0.20,
        ox + bHW, bCy
      );
      ctx.fill();

      // Belly scale plate segments — arc strokes suggesting overlapping armour plates
      const pN  = 5 + Math.floor(n.scaleThickness * 4);
      const pOp = 0.16 + n.scaleThickness * 0.28;
      for (let pli = 0; pli < pN; pli++) {
        const tP = pli / (pN - 1);
        const px = (ox + bHW) - tP * (bHW + bHW * 0.96);
        const py = bCy + bHH * (0.30 + 0.16 * Math.sin(tP * Math.PI));
        const pR = bHH * (0.28 + 0.20 * Math.sin(tP * Math.PI));
        ctx.strokeStyle = rc(lerp(belly, { r: 255, g: 255, b: 255 }, 0.12), pOp);
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(px, py - pR * 0.08, pR, -Math.PI * 0.66, Math.PI * 0.66);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ============================================================
    // LAYER 5 — DORSAL SPINE FINS (filled bezier triangles)
    // ============================================================
    {
      const finN        = 6 + Math.floor(n.scaleThickness * 5);
      const finMaxH     = (6.0 + n.scaleThickness * 11.0) * sc;
      const spineStartX = nbx - W * 0.012;
      const spineEndX   = tbx + bw * 0.10;

      for (let fi = 0; fi < finN; fi++) {
        const tp  = fi / (finN - 1);
        // Distribute fins from just behind neck socket to just before tail base
        const fx  = spineStartX - tp * (spineStartX - spineEndX);
        const fy  = oy - bh * (0.95 + musF * 0.10 - 0.04 * Math.sin(tp * Math.PI));
        const fh  = finMaxH * (0.28 + 0.92 * Math.sin(tp * Math.PI * 0.90 + 0.14));
        const fw  = fh * (0.18 + 0.10 * (1 - tp));  // slightly wider toward tail
        const lean = -fh * 0.10;                      // gentle backward lean

        // Gradient: skin-matched base → bone highlight at tip
        const fg = ctx.createLinearGradient(fx, fy, fx + lean, fy - fh);
        fg.addColorStop(0.00, rc(top_, 0.84));
        fg.addColorStop(0.50, rc(lerp(bone, top_, 0.46), 0.86));
        fg.addColorStop(1.00, rc(lerp(bone, { r: 255, g: 255, b: 255 }, 0.22), 0.70));

        ctx.save();
        ctx.fillStyle   = fg;
        ctx.strokeStyle = rc(bone, 0.34);
        ctx.lineWidth   = 0.7;
        ctx.beginPath();
        ctx.moveTo(fx - fw, fy);
        // Left edge curves up to tip
        ctx.bezierCurveTo(
          fx - fw * 0.60, fy - fh * 0.42,
          fx + lean - fw * 0.18, fy - fh * 0.78,
          fx + lean, fy - fh
        );
        // Right edge curves back down
        ctx.bezierCurveTo(
          fx + lean + fw * 0.16, fy - fh * 0.80,
          fx + fw * 0.46, fy - fh * 0.44,
          fx + fw, fy
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // ============================================================
    // LAYER 6 — FUEL SAC GLOW
    // ============================================================
    {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(fsx, fsy, 0, fsx, fsy, fsR * 2.6);
      g.addColorStop(0.00, `rgba(255,148,30,${Math.min(1, fsGl * 0.90)})`);
      g.addColorStop(0.35, `rgba(255,60,5,${Math.min(1, fsGl * 0.52)})`);
      g.addColorStop(1.00, `rgba(255,15,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fsx, fsy, fsR * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Hard core
      ctx.save();
      ctx.shadowColor = 'rgba(255,90,0,0.95)';
      ctx.shadowBlur  = fsR * 2.4 * fsGl;
      ctx.fillStyle   = `rgba(255,172,50,0.96)`;
      ctx.beginPath();
      ctx.arc(fsx, fsy, fsR * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 7 — TAIL  (evolved: tapered tube + dorsal spines + arrowhead blade)
    // ============================================================
    {
      // Radii tapering from muscular base to slim tip
      const tR0 = tRad * (1.00 + n.musclePower * 0.36);   // base — muscle thickens it
      const tR1 = tRad * 0.64;
      const tR2 = tRad * 0.29;
      const tR3 = tRad * 0.07;                              // near-tip waist

      // 4 sample points along the cubic bezier for perp normals
      function bezPt(p0x,p0y, c1x,c1y, c2x,c2y, p3x,p3y, u) {
        const om = 1 - u;
        return {
          x: om*om*om*p0x + 3*om*om*u*c1x + 3*om*u*u*c2x + u*u*u*p3x,
          y: om*om*om*p0y + 3*om*om*u*c1y + 3*om*u*u*c2y + u*u*u*p3y
        };
      }
      const s0 = { x: tbx,  y: tby  };
      const s1 = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, 0.33);
      const s2 = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, 0.66);
      const s3 = { x: ttx,  y: tty  };

      const n0 = perp(s0.x, s0.y, s1.x, s1.y, tR0);
      const n1 = perp(s0.x, s0.y, s2.x, s2.y, tR1);
      const n2 = perp(s1.x, s1.y, s3.x, s3.y, tR2);
      const n3 = perp(s2.x, s2.y, s3.x, s3.y, tR3);

      ctx.save();

      // Along-axis gradient — dark spine top, midtone belly
      const tg = ctx.createLinearGradient(tbx, tby, ttx, tty);
      tg.addColorStop(0.00, rc(top_, 0.90));
      tg.addColorStop(0.28, rc(skin));
      tg.addColorStop(0.70, rc(lerp(skin, dark, 0.42)));
      tg.addColorStop(1.00, rc(dark, 0.88));
      ctx.fillStyle = tg;
      ctx.strokeStyle = rc(dark, 0.28);
      ctx.lineWidth = 0.8;

      // Upper silhouette: base → s1 → s2 → tip  (+normals)
      ctx.beginPath();
      ctx.moveTo(s0.x + n0.x, s0.y + n0.y);
      ctx.quadraticCurveTo(
        (s0.x + n0.x + s1.x + n1.x) * 0.5, (s0.y + n0.y + s1.y + n1.y) * 0.5,
        s1.x + n1.x, s1.y + n1.y
      );
      ctx.quadraticCurveTo(
        (s1.x + n1.x + s2.x + n2.x) * 0.5, (s1.y + n1.y + s2.y + n2.y) * 0.5,
        s2.x + n2.x, s2.y + n2.y
      );
      ctx.quadraticCurveTo(
        (s2.x + n2.x + s3.x + n3.x) * 0.5, (s2.y + n2.y + s3.y + n3.y) * 0.5,
        s3.x, s3.y
      );
      // Lower silhouette: tip → s2 → s1 → base  (-normals)
      ctx.quadraticCurveTo(
        (s3.x - n3.x + s2.x - n2.x) * 0.5, (s3.y - n3.y + s2.y - n2.y) * 0.5,
        s2.x - n2.x, s2.y - n2.y
      );
      ctx.quadraticCurveTo(
        (s2.x - n2.x + s1.x - n1.x) * 0.5, (s2.y - n2.y + s1.y - n1.y) * 0.5,
        s1.x - n1.x, s1.y - n1.y
      );
      ctx.quadraticCurveTo(
        (s1.x - n1.x + s0.x - n0.x) * 0.5, (s1.y - n1.y + s0.y - n0.y) * 0.5,
        s0.x - n0.x, s0.y - n0.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dorsal highlight strip
      {
        const dg = ctx.createLinearGradient(tbx, tby, ttx, tty);
        dg.addColorStop(0.00, rc(lerp(top_, {r:255,g:255,b:255}, 0.28), 0.55));
        dg.addColorStop(0.60, rc(top_, 0.18));
        dg.addColorStop(1.00, rc(top_, 0.00));
        ctx.strokeStyle = dg;
        ctx.lineWidth = tR0 * 0.32;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s0.x + n0.x * 0.55, s0.y + n0.y * 0.55);
        ctx.quadraticCurveTo(
          (s0.x+n0.x*0.5 + s1.x+n1.x*0.5)*0.5, (s0.y+n0.y*0.5 + s1.y+n1.y*0.5)*0.5,
          s1.x + n1.x * 0.50, s1.y + n1.y * 0.50
        );
        ctx.quadraticCurveTo(
          (s1.x+n1.x*0.5 + s2.x+n2.x*0.5)*0.5, (s1.y+n1.y*0.5 + s2.y+n2.y*0.5)*0.5,
          s2.x + n2.x * 0.44, s2.y + n2.y * 0.44
        );
        ctx.stroke();
      }

      // Dorsal tail spines (2–5, driven by scaleThickness)
      {
        const nSpines = 2 + Math.round(n.scaleThickness * 3);
        for (let i = 0; i < nSpines; i++) {
          const u = 0.08 + (i / (nSpines - 0.5)) * 0.56;   // spread along first 65% of tail
          const sp = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, u);
          const uN  = Math.min(u + 0.05, 1);
          const sp2 = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, uN);
          const sn  = perp(sp.x, sp.y, sp2.x, sp2.y, 1);
          const spR = tR0 * (1 - u * 0.72);
          const spH = spR * (1.10 + n.scaleThickness * 1.40);  // fin height
          const spW = spR * 0.52;

          // Direction of normal (dorsal side)
          const nx = sn.x / (Math.hypot(sn.x, sn.y) || 1);
          const ny = sn.y / (Math.hypot(sn.x, sn.y) || 1);

          // Fin base tangent vector
          const bx = -ny, by = nx;    // tangent along spine

          const tipX = sp.x + nx * spH;
          const tipY = sp.y + ny * spH;

          const spg = ctx.createLinearGradient(sp.x, sp.y, tipX, tipY);
          spg.addColorStop(0.00, rc(dark, 0.82));
          spg.addColorStop(0.60, rc(lerp(skin, top_, 0.55), 0.70));
          spg.addColorStop(1.00, rc(bone, 0.56));

          ctx.fillStyle = spg;
          ctx.strokeStyle = rc(dark, 0.22);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(sp.x - bx * spW, sp.y - by * spW);
          ctx.quadraticCurveTo(
            sp.x + nx * spH * 0.40 - bx * spW * 0.20,
            sp.y + ny * spH * 0.40 - by * spW * 0.20,
            tipX, tipY
          );
          ctx.quadraticCurveTo(
            sp.x + nx * spH * 0.40 + bx * spW * 0.20,
            sp.y + ny * spH * 0.40 + by * spW * 0.20,
            sp.x + bx * spW, sp.y + by * spW
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Arrowhead blade at tip — driven by tailSize + boneDensity
      {
        const bladeLen  = (10 + n.tailSize * 22) * sc;
        const bladeW    = (3.5 + n.tailSize * 5.5) * sc;
        const barbLen   = bladeLen * (0.30 + n.boneDensity * 0.28);

        // Tail direction at tip: use s2→s3 vector
        const dx = s3.x - s2.x, dy = s3.y - s2.y;
        const dlen = Math.hypot(dx, dy) || 1;
        const ux = dx / dlen, uy = dy / dlen;   // forward unit
        const px = -uy,       py =  ux;           // perp unit

        const tipX  = s3.x + ux * bladeLen;
        const tipY  = s3.y + uy * bladeLen;
        const wingLX = s3.x - ux * bladeLen * 0.22 + px * bladeW;
        const wingLY = s3.y - uy * bladeLen * 0.22 + py * bladeW;
        const wingRX = s3.x - ux * bladeLen * 0.22 - px * bladeW;
        const wingRY = s3.y - uy * bladeLen * 0.22 - py * bladeW;
        const barbLX = s3.x - ux * barbLen + px * bladeW * 0.44;
        const barbLY = s3.y - uy * barbLen + py * bladeW * 0.44;
        const barbRX = s3.x - ux * barbLen - px * bladeW * 0.44;
        const barbRY = s3.y - uy * barbLen - py * bladeW * 0.44;

        const bg = ctx.createLinearGradient(s3.x, s3.y, tipX, tipY);
        bg.addColorStop(0.00, rc(lerp(skin, bone, 0.40), 0.88));
        bg.addColorStop(0.55, rc(bone, 0.82));
        bg.addColorStop(1.00, rc(lerp(bone, {r:255,g:255,b:255}, 0.25), 0.72));
        ctx.fillStyle = bg;
        ctx.strokeStyle = rc(dark, 0.46);
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(wingLX, wingLY);
        ctx.lineTo(barbLX, barbLY);
        ctx.lineTo(s3.x - ux * tRad * 0.55 + px * tR3 * 0.5, s3.y - uy * tRad * 0.55 + py * tR3 * 0.5);
        ctx.lineTo(s3.x - ux * tRad * 0.55 - px * tR3 * 0.5, s3.y - uy * tRad * 0.55 - py * tR3 * 0.5);
        ctx.lineTo(barbRX, barbRY);
        ctx.lineTo(wingRX, wingRY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Blade centerline highlight
        ctx.save();
        ctx.strokeStyle = rc(lerp(bone,{r:255,g:255,b:255},0.45), 0.50);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s3.x, s3.y);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    // ============================================================
    // LAYER 8 — FRONT LEG (foreground, digitigrade)
    // ============================================================
    {
      ctx.save();

      const flGrad = ctx.createLinearGradient(flHx, flHy, flMx, flMy + H*0.05);
      flGrad.addColorStop(0.00, rc(top_));
      flGrad.addColorStop(0.38, rc(skin));
      flGrad.addColorStop(1.00, rc(dark));

      // ---- Thigh (hip → knee) — slimmer than hind ----
      const flThighW = legW * 1.10;
      const pfH = perp(flHx, flHy, flKx, flKy, flThighW);
      const pfK = perp(flHx, flHy, flKx, flKy, legW * 0.76);
      const flThighMx = (flHx + flKx) * 0.5, flThighMy = (flHy + flKy) * 0.5;
      const pfMid = perp(flHx, flHy, flKx, flKy, flThighW * 0.90);
      ctx.fillStyle = flGrad;
      ctx.strokeStyle = rc(dark, 0.28);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(flHx + pfH.x, flHy + pfH.y);
      ctx.quadraticCurveTo(
        flThighMx + pfMid.x * 1.10, flThighMy + pfMid.y * 1.10,
        flKx + pfK.x, flKy + pfK.y
      );
      ctx.lineTo(flKx - pfK.x, flKy - pfK.y);
      ctx.quadraticCurveTo(
        flThighMx - pfMid.x * 0.80, flThighMy - pfMid.y * 0.80,
        flHx - pfH.x, flHy - pfH.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ---- Knee cap (smooth — no spur on front leg) ----
      ctx.beginPath();
      ctx.arc(flKx, flKy, legW * 0.64, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.30), 0.90);
      ctx.fill();

      // ---- Shin (knee → ankle) ----
      const pfsK = perp(flKx, flKy, flAx, flAy, legW * 0.68);
      const pfsA = perp(flKx, flKy, flAx, flAy, legW * 0.40);
      const flShinMx = (flKx + flAx) * 0.5, flShinMy = (flKy + flAy) * 0.5;
      const pfsMid = perp(flKx, flKy, flAx, flAy, legW * 0.60);
      ctx.fillStyle = flGrad;
      ctx.beginPath();
      ctx.moveTo(flKx + pfsK.x, flKy + pfsK.y);
      ctx.quadraticCurveTo(
        flShinMx + pfsMid.x * 0.86, flShinMy + pfsMid.y * 0.86,
        flAx + pfsA.x, flAy + pfsA.y
      );
      ctx.lineTo(flAx - pfsA.x, flAy - pfsA.y);
      ctx.quadraticCurveTo(
        flShinMx - pfsMid.x * 0.68, flShinMy - pfsMid.y * 0.68,
        flKx - pfsK.x, flKy - pfsK.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ---- Ankle knob ----
      ctx.beginPath();
      ctx.arc(flAx, flAy, legW * 0.40, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.28), 0.86);
      ctx.fill();

      // ---- Metatarsal (ankle → toe base) ----
      const pfmA = perp(flAx, flAy, flMx, flMy, legW * 0.45);
      const pfmM = perp(flAx, flAy, flMx, flMy, legW * 0.30);
      ctx.fillStyle = rc(dark, 0.92);
      ctx.beginPath();
      ctx.moveTo(flAx + pfmA.x, flAy + pfmA.y);
      ctx.lineTo(flMx + pfmM.x, flMy + pfmM.y);
      ctx.lineTo(flMx - pfmM.x, flMy - pfmM.y);
      ctx.lineTo(flAx - pfmA.x, flAy - pfmA.y);
      ctx.closePath();
      ctx.fill();

      // ---- Toes × 3 + curved claws ----
      const flToeAngles = [-0.26, 0.06, 0.38];
      const flToeLen = legW * 1.10;
      const flToeW   = legW * 0.23;
      for (const ang of flToeAngles) {
        const tAng = Math.PI * 0.06 + ang;
        const tEx = flMx + Math.cos(tAng) * flToeLen;
        const tEy = flMy + Math.sin(tAng) * flToeLen;
        const ptfS = perp(flMx, flMy, tEx, tEy, flToeW);
        // Toe bone
        ctx.fillStyle = rc(dark, 0.88);
        ctx.beginPath();
        ctx.moveTo(flMx + ptfS.x, flMy + ptfS.y);
        ctx.lineTo(tEx + ptfS.x * 0.26, tEy + ptfS.y * 0.26);
        ctx.lineTo(tEx - ptfS.x * 0.26, tEy - ptfS.y * 0.26);
        ctx.lineTo(flMx - ptfS.x, flMy - ptfS.y);
        ctx.closePath();
        ctx.fill();
        // Claw arc
        ctx.beginPath();
        ctx.moveTo(tEx, tEy);
        ctx.bezierCurveTo(
          tEx + Math.cos(tAng) * clawLen * 0.40, tEy + Math.sin(tAng) * clawLen * 0.40 + clawLen * 0.22,
          tEx + Math.cos(tAng) * clawLen * 0.80, tEy + Math.sin(tAng) * clawLen * 0.80 + clawLen * 0.09,
          tEx + Math.cos(tAng) * clawLen,         tEy + Math.sin(tAng) * clawLen
        );
        ctx.strokeStyle = rc(bone, 0.90);
        ctx.lineWidth = flToeW * 0.80;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    // ============================================================
    // LAYER 9 — NECK TUBE (filled tapered shape, covers joint)
    // ============================================================
    {
      ctx.save();
      const g = ctx.createLinearGradient(nbx, nby, nex, ney);
      g.addColorStop(0.00, rc(skin));
      g.addColorStop(1.00, rc(top_));
      ctx.fillStyle = g;
      ctx.strokeStyle = rc(dark, 0.45);
      ctx.lineWidth = 1.0;

      ctx.beginPath();
      ctx.moveTo(nbx + pb.x, nby + pb.y);
      ctx.bezierCurveTo(
        nc1x + pb.x * 0.70, nc1y + pb.y * 0.70,
        nc2x + pe.x * 0.85, nc2y + pe.y * 0.85,
        nex + pe.x, ney + pe.y
      );
      // Cap at head end
      ctx.bezierCurveTo(nex + pe.x * 0.5, ney + pe.y * 0.5, nex - pe.x * 0.5, ney - pe.y * 0.5, nex - pe.x, ney - pe.y);
      // Down the other side
      ctx.bezierCurveTo(
        nc2x - pe.x * 0.85, nc2y - pe.y * 0.85,
        nc1x - pb.x * 0.70, nc1y - pb.y * 0.70,
        nbx - pb.x, nby - pb.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Neck belly stripe (lighter, forward-facing side)
      const pg = ctx.createLinearGradient(nbx, nby, nex, ney);
      pg.addColorStop(0.00, rc(belly, 0.0));
      pg.addColorStop(0.40, rc(belly, 0.52));
      pg.addColorStop(1.00, rc(belly, 0.30));
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(nbx - pb.x * 0.22, nby - pb.y * 0.22);
      ctx.bezierCurveTo(
        nc1x - pb.x * 0.16, nc1y - pb.y * 0.16,
        nc2x - pe.x * 0.22, nc2y - pe.y * 0.22,
        nex  - pe.x * 0.20, ney  - pe.y * 0.20
      );
      ctx.quadraticCurveTo(nex, ney, nex + pe.x * 0.20, ney + pe.y * 0.20);
      ctx.bezierCurveTo(
        nc2x + pe.x * 0.22, nc2y + pe.y * 0.22,
        nc1x + pb.x * 0.16, nc1y + pb.y * 0.16,
        nbx + pb.x * 0.22, nby + pb.y * 0.22
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 10 — HEAD
    // ============================================================
    {
      ctx.save();
      const g = ctx.createLinearGradient(hx - hs, hy - hs, hx + hs * 0.5, hy + hs);
      g.addColorStop(0.00, rc(top_));
      g.addColorStop(0.45, rc(skin));
      g.addColorStop(1.00, rc(dark));
      ctx.fillStyle = g;
      ctx.strokeStyle = rc(dark, 0.52);
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(nex, ney);
      // Cranium up
      ctx.bezierCurveTo(
        hx - hs * 0.20, hy - hs * 0.72,
        crx - hs * 0.10, cry + hs * 0.12,
        crx, cry
      );
      // Forehead → snout
      ctx.bezierCurveTo(
        crx + hs * 0.40, cry - hs * 0.08,
        stx - hs * 0.20, sty - hs * 0.22,
        stx, sty
      );
      // Snout tip → jaw
      ctx.bezierCurveTo(
        stx + hs * 0.09, sty + hs * 0.16,
        jx + hs * 0.09, jy - hs * 0.08,
        jx, jy
      );
      // Jaw → back to neck
      ctx.bezierCurveTo(
        jx - hs * 0.30, jy + hs * 0.09,
        hx + hs * 0.10, hy + hs * 0.48,
        hx - hs * 0.10, hy + hs * 0.36
      );
      ctx.bezierCurveTo(
        hx - hs * 0.30, hy + hs * 0.26,
        nex - W * 0.008, ney + H * 0.008,
        nex, ney
      );
      ctx.fill();
      ctx.stroke();

      // Jaw shadow (lower jaw plane)
      ctx.fillStyle = rc(dark, 0.28);
      ctx.beginPath();
      ctx.moveTo(hx + hs * 0.10, hy + hs * 0.10);
      ctx.bezierCurveTo(
        hx + hs * 0.55, hy + hs * 0.20,
        stx - hs * 0.22, sty + hs * 0.05,
        jx, jy
      );
      ctx.bezierCurveTo(
        jx - hs * 0.30, jy + hs * 0.08,
        hx + hs * 0.10, hy + hs * 0.38,
        hx + hs * 0.10, hy + hs * 0.10
      );
      ctx.fill();

      // Snout highlight ridge
      ctx.strokeStyle = rc(top_, 0.38);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(crx + hs * 0.12, cry + hs * 0.22);
      ctx.bezierCurveTo(
        crx + hs * 0.28, cry + hs * 0.05,
        stx - hs * 0.25, sty - hs * 0.08,
        stx - hs * 0.08, sty - hs * 0.02
      );
      ctx.stroke();
      ctx.restore();
    }

    // ============================================================
    // LAYER 11 — HORN(S)
    // ============================================================
    {
      ctx.save();
      ctx.fillStyle = rc(bone, 0.88);
      ctx.strokeStyle = rc({ r: bone.r - 14, g: bone.g - 14, b: bone.b - 14 }, 0.48);
      ctx.lineWidth = 0.8;

      // Main horn
      ctx.beginPath();
      ctx.moveTo(hx - hs * 0.08, hy - hs * 0.44);
      ctx.bezierCurveTo(
        hx - hs * 0.24, hy - hs * 0.44 - hnL * 0.36,
        hx + hs * 0.06, hy - hs * 0.44 - hnL * 0.72,
        hx + hs * 0.09, hy - hs * 0.44 - hnL
      );
      ctx.bezierCurveTo(
        hx + hs * 0.06, hy - hs * 0.44 - hnL * 0.74,
        hx + hs * 0.20, hy - hs * 0.44 - hnL * 0.46,
        hx + hs * 0.20, hy - hs * 0.40
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Secondary horn (smaller, behind)
      ctx.globalAlpha = 0.62;
      const h2L = hnL * 0.54;
      ctx.beginPath();
      ctx.moveTo(hx - hs * 0.24, hy - hs * 0.32);
      ctx.bezierCurveTo(
        hx - hs * 0.37, hy - hs * 0.32 - h2L * 0.35,
        hx - hs * 0.18, hy - hs * 0.32 - h2L * 0.72,
        hx - hs * 0.14, hy - hs * 0.32 - h2L
      );
      ctx.bezierCurveTo(
        hx - hs * 0.11, hy - hs * 0.32 - h2L * 0.60,
        hx - hs * 0.04, hy - hs * 0.32 - h2L * 0.28,
        hx - hs * 0.04, hy - hs * 0.26
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 12 — EYE
    // ============================================================
    {
      const eyeFlick = 0.76 + Math.sin(t * 1.18) * 0.14;

      // Glow halo
      ctx.save();
      ctx.shadowColor = rc(eye_c, 0.90);
      ctx.shadowBlur  = eR * 4.0 * eyeFlick;
      ctx.fillStyle   = rc(eye_c);
      ctx.beginPath();
      ctx.arc(eX, eY, eR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Iris
      ctx.save();
      ctx.fillStyle = `rgba(130,255,185,0.95)`;
      ctx.beginPath();
      ctx.arc(eX, eY, eR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Vertical slit pupil
      ctx.save();
      ctx.fillStyle = 'rgba(4,10,7,0.96)';
      ctx.beginPath();
      ctx.ellipse(eX, eY, eR * 0.22, eR * 0.80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Specular dot
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.74)';
      ctx.beginPath();
      ctx.arc(eX - eR * 0.22, eY - eR * 0.28, eR * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 13 — NOSTRIL
    // ============================================================
    {
      ctx.save();
      ctx.fillStyle = rc(dark, 0.52);
      ctx.beginPath();
      ctx.ellipse(stx - hs * 0.48, sty - hs * 0.06, hs * 0.065, hs * 0.044, 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 14 — SCALE ARMOR DETAIL (conditional on trait)
    // ============================================================
    if (n.scaleThickness > 0.28) {
      const op = (n.scaleThickness - 0.28) * 0.52;
      ctx.save();
      ctx.strokeStyle = rc({ r: top_.r + 12, g: top_.g + 10, b: top_.b + 7 }, op);
      ctx.lineWidth = 1.1;
      // Shoulder plates
      for (let i = 0; i < 5; i++) {
        const px = ox + bw * (0.40 - i * 0.112);
        const py = oy - bh * (0.62 + i * 0.03);
        ctx.beginPath();
        ctx.ellipse(px, py, bw * 0.10, bh * 0.20, -0.22, 0, Math.PI * 1.08);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ============================================================
    // LAYER 15 — LAB ANNOTATION OVERLAY (subtle teal dashes)
    // ============================================================
    {
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = 'rgba(0,210,162,0.85)';
      ctx.fillStyle   = 'rgba(0,210,162,0.70)';
      ctx.lineWidth   = 0.65;
      ctx.setLineDash([2, 4]);
      ctx.font = `${Math.round(7 * sc)}px monospace`;

      // Wing span callout
      ctx.beginPath();
      ctx.moveTo(wrx, wry - H * 0.032);
      ctx.lineTo(wf2x, wf2y - H * 0.022);
      ctx.stroke();
      // Neck length callout
      ctx.beginPath();
      ctx.moveTo(nbx + W * 0.02, nby - H * 0.02);
      ctx.lineTo(nex + W * 0.02, ney - H * 0.02);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // ============================================================
  // BATTLE DRAW — two dragons facing each other
  // ============================================================
  function drawBattle(canvas, pTraits, pTint, eTraits, eTint, animTime) {
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');

    // --- Battle background ---
    ctx.fillStyle = 'rgba(8, 5, 18, 0.96)';
    ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(50, 0, 60, 0.22)';
    ctx.lineWidth = 0.5;
    const gs = 28;
    for (let gx = 0; gx < W; gx += gs) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += gs) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    // Corner brackets
    const bsz = 24;
    ctx.strokeStyle = 'rgba(180, 30, 220, 0.55)';
    ctx.lineWidth = 2.5;
    for (const [cx2, cy2, sx, sy] of [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]]) {
      ctx.beginPath(); ctx.moveTo(cx2 + sx*bsz, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy*bsz); ctx.stroke();
    }
    // Centre divider glow
    const div = ctx.createLinearGradient(W*0.5 - 2, 0, W*0.5 + 2, 0);
    div.addColorStop(0, 'rgba(200,40,30,0)');
    div.addColorStop(0.5, 'rgba(200,40,30,0.38)');
    div.addColorStop(1, 'rgba(200,40,30,0)');
    ctx.fillStyle = div;
    ctx.fillRect(W*0.5 - 2, H*0.06, 4, H*0.88);

    // --- Draw each dragon onto its own offscreen canvas, then blit ---
    const oc = document.createElement('canvas');
    oc.width = W; oc.height = H;

    const sc = 0.46;  // how much to scale each dragon

    // Player dragon — left side, facing right (normal orientation)
    draw(oc, pTraits, pTint, animTime);
    ctx.save();
    ctx.translate(W * 0.03, H * 0.06);
    ctx.scale(sc, sc);
    ctx.drawImage(oc, 0, 0);
    ctx.restore();

    // Enemy dragon — right side, facing left (mirror horizontally)
    draw(oc, eTraits, eTint, animTime);
    ctx.save();
    ctx.translate(W * 0.97, H * 0.06);
    ctx.scale(-sc, sc);
    ctx.drawImage(oc, 0, 0);
    ctx.restore();

    // VS label
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(H * 0.072)}px monospace`;
    ctx.shadowColor = 'rgba(220,40,20,0.90)';
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = 'rgba(255,80,50,0.92)';
    ctx.fillText('VS', W * 0.5, H * 0.55);
    ctx.restore();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function create(width, height) {
    const c = document.createElement('canvas');
    c.width  = width  || 1024;
    c.height = height || 700;
    return c;
  }

  return { draw, drawBattle, create };
})();

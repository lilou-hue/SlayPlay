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

    // Tail
    const tbx  = ox - bw * 0.90,  tby  = oy - bh * 0.10;
    const tlLen = W * 0.16 * tlFac;
    const ttx  = tbx - tlLen,     tty  = tby + H * 0.018;
    const tc1x = tbx - tlLen * 0.35, tc1y = tby + H * 0.005;
    const tc2x = tbx - tlLen * 0.70, tc2y = tby + H * 0.018;
    const tRad = bh * 0.29;

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

    // Legs
    const lgW = (3.8 + n.musclePower * 5.0) * sc * musF;
    const flRx = ox + bw * 0.52,  flRy = oy + bh * 0.90;
    const flKx = flRx - W * 0.012, flKy = flRy + H * 0.074;
    const flFx = flKx + W * 0.008, flFy = flKy + H * 0.058;
    const hlRx = ox - bw * 0.34,  hlRy = oy + bh * 0.90;
    const hlKx = hlRx + W * 0.004, hlKy = hlRy + H * 0.076;
    const hlFx = hlKx - W * 0.016, hlFy = hlKy + H * 0.056;

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
    // LAYER 2 — HIND LEG (behind body)
    // ============================================================
    {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rc(skin, 0.88);
      ctx.lineWidth = lgW * 1.12;
      ctx.beginPath(); ctx.moveTo(hlRx, hlRy); ctx.lineTo(hlKx, hlKy); ctx.stroke();
      ctx.strokeStyle = rc(dark, 0.85);
      ctx.lineWidth = lgW * 0.82;
      ctx.beginPath(); ctx.moveTo(hlKx, hlKy); ctx.lineTo(hlFx, hlFy); ctx.stroke();
      ctx.fillStyle = rc(bone, 0.78);
      ctx.beginPath();
      ctx.ellipse(hlFx, hlFy, lgW * 0.92, lgW * 0.40, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 3 — BODY SILHOUETTE
    // ============================================================
    ctx.save();
    // Breathing transform (scale around body center)
    ctx.translate(ox, oy);
    ctx.scale(1 + br * 0.28, 1 + br);
    ctx.translate(-ox, -oy);
    {
      const g = ctx.createLinearGradient(ox, oy - bh * 1.12, ox, oy + bh * 1.12);
      g.addColorStop(0.00, rc(top_));
      g.addColorStop(0.28, rc(skin));
      g.addColorStop(0.70, rc(dark));
      g.addColorStop(1.00, rc(dark));
      ctx.fillStyle = g;
      ctx.strokeStyle = rc(dark, 0.55);
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      // Upper: tail base → shoulder → neck base
      ctx.moveTo(tbx, tby - tRad * 0.70);
      ctx.bezierCurveTo(
        tbx + bw * 0.20, oy - bh * 0.85,
        ox - bw * 0.15, oy - bh * 1.04,
        ox + bw * 0.18, oy - bh * 1.05
      );
      ctx.bezierCurveTo(
        ox + bw * 0.58, oy - bh * 1.02,
        nbx - W * 0.008, nby + H * 0.01,
        nbx, nby
      );
      // Neck upper side (S-curve up to head)
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
      // Chest → belly → haunch → tail base
      ctx.bezierCurveTo(
        ox + bw * 0.52, oy + bh * 0.58,
        ox + bw * 0.10, oy + bh * 1.02,
        ox - bw * 0.14, oy + bh * 1.02
      );
      ctx.bezierCurveTo(
        ox - bw * 0.52, oy + bh * 0.96,
        tbx + bw * 0.22, oy + bh * 0.74,
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
    }
    ctx.restore();

    // ============================================================
    // LAYER 4 — BELLY UNDERSIDE HIGHLIGHT
    // ============================================================
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(1 + br * 0.28, 1 + br);
    ctx.translate(-ox, -oy);
    {
      const g = ctx.createLinearGradient(ox, oy, ox, oy + bh * 1.1);
      g.addColorStop(0.00, rc(belly, 0.00));
      g.addColorStop(0.32, rc(belly, 0.68));
      g.addColorStop(1.00, rc(belly, 0.30));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(ox - bw * 0.07, oy + bh * 0.30, bw * 0.50, bh * 0.64, 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ============================================================
    // LAYER 5 — DORSAL SPINE RIDGES
    // ============================================================
    {
      const ridgeN = 6 + Math.floor(n.scaleThickness * 4);
      for (let i = 0; i < ridgeN; i++) {
        const tp = i / (ridgeN - 1);
        // Spread from shoulder to tail along spine
        const rx = nbx - W * 0.015 - tp * (bw * 1.28);
        const ry = oy - bh * (0.98 - 0.06 * Math.sin(tp * Math.PI));
        const rh = (5.5 + n.scaleThickness * 8.0) * sc * (0.38 + 0.94 * Math.sin(tp * Math.PI * 0.95));
        ctx.save();
        ctx.strokeStyle = rc(bone, 0.66);
        ctx.lineWidth = 1.7 * sc;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + rh * 0.14, ry - rh);
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
    // LAYER 7 — TAIL
    // ============================================================
    {
      const p0 = perp(tbx, tby, tc1x, tc1y, tRad);
      const p1 = perp(tc1x, tc1y, tc2x, tc2y, tRad * 0.52);
      const p2 = perp(tc2x, tc2y, ttx, tty, tRad * 0.06);

      ctx.save();
      const g = ctx.createLinearGradient(tbx, tby - tRad, tbx, tby + tRad);
      g.addColorStop(0.00, rc(top_));
      g.addColorStop(0.50, rc(skin));
      g.addColorStop(1.00, rc(dark));
      ctx.fillStyle = g;
      ctx.strokeStyle = rc(dark, 0.38);
      ctx.lineWidth = 0.9;

      ctx.beginPath();
      ctx.moveTo(tbx + p0.x, tby + p0.y);
      ctx.bezierCurveTo(
        tc1x + p1.x * 1.15, tc1y + p1.y * 1.15,
        tc2x + p2.x * 2.8,  tc2y + p2.y * 2.8,
        ttx, tty
      );
      ctx.bezierCurveTo(
        tc2x - p2.x * 2.8,  tc2y - p2.y * 2.8,
        tc1x - p1.x * 1.15, tc1y - p1.y * 1.15,
        tbx - p0.x, tby - p0.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tail spike (diamond)
      const spL = (8 + n.tailSize * 16) * sc;
      ctx.fillStyle = rc(bone, 0.86);
      ctx.beginPath();
      ctx.moveTo(ttx - spL * 0.58, tty);
      ctx.lineTo(ttx - spL * 0.08, tty - spL * 0.34);
      ctx.lineTo(ttx + spL * 0.24, tty);
      ctx.lineTo(ttx - spL * 0.08, tty + spL * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 8 — FRONT LEG
    // ============================================================
    {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rc(skin, 0.92);
      ctx.lineWidth = lgW;
      ctx.beginPath(); ctx.moveTo(flRx, flRy); ctx.lineTo(flKx, flKy); ctx.stroke();
      ctx.strokeStyle = rc(dark, 0.88);
      ctx.lineWidth = lgW * 0.74;
      ctx.beginPath(); ctx.moveTo(flKx, flKy); ctx.lineTo(flFx, flFy); ctx.stroke();
      ctx.fillStyle = rc(bone, 0.80);
      ctx.beginPath();
      ctx.ellipse(flFx, flFy, lgW * 0.90, lgW * 0.38, 0.18, 0, Math.PI * 2);
      ctx.fill();
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
  // PUBLIC API
  // ============================================================
  function create(width, height) {
    const c = document.createElement('canvas');
    c.width  = width  || 1024;
    c.height = height || 700;
    return c;
  }

  return { draw, create };
})();

/* =====================================================================
   Camera sight -- the screen.

   REBUILT AS A SEQUENCE.  The first version put the photograph, a
   readout, two mode tabs and three button pads on one page with no order
   and no instructions, and the one sentence that did explain it sat in
   13 px grey monospace inside the readout.  Larry took a photograph with
   it and could not work out what to do next.  That is the whole verdict,
   so now there are four numbered steps, one plain-language instruction at
   reading size, and only the controls that step needs.

   Overlay state lives in IMAGE pixel coordinates, never display pixels,
   so zooming or rotating the device cannot move a sight.  The convention
   is refine.js's: an integer coordinate is the CENTRE of that pixel.
   ===================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const cssvar = n => getComputedStyle(document.documentElement)
                        .getPropertyValue(n).trim();

  /* A visible build stamp.  Debugging this remotely without one meant
     guessing which version was on the device, and the guess was wrong:
     the service worker below had been serving a cached build. */
  const BUILD = '21 \u2014 5 Nov 2026';
  const R2D = 180 / Math.PI;

  const CN = extendCelnav(makeCelnav(window.CELNAV_TABLES));
  const CS = window.CAMSIGHT, RF = window.REFINE, EX = window.EXIF;

  let img = null, cam = null, exif = null, scale = 1, step = 1, view = 'wide';
  let zwin = null;     // the close-up's source window, for mapping taps back
  const H = { y: 0, tiltDeg: 0 };
  /* B.x, B.y is the point the sight is MEASURED TO.  It is the limb, not the
     centre of the disc.
     This was a 16-arcminute bug.  The circle fit gave the centre, and
     corrections() then added the semi-diameter for a lower-limb sight - but
     corrections() assumes Hs was measured TO THE LIMB, so adding SD to a
     centre altitude counts the semi-diameter twice.  Marking the limb is
     also what the observer can actually see: a crosshair sits on top of the
     very edge being judged.  B.r is kept because the circle fit still finds
     the disc; it is used to place the limb point and to check the plate
     scale against the almanac's semi-diameter. */
  const B = { x: 0, y: 0, r: 14 };

  /* ---- undo -------------------------------------------------------
     Every action that moves the overlay pushes the previous state first, so
     a bad "find the edge" is one tap to recover from rather than a reason to
     start the sight again. */
  const UNDO = [];
  let nudging = false;     // one undo entry per press-and-hold, not per repeat
  function mark() {
    UNDO.push({ hy: H.y, ht: H.tiltDeg, bx: B.x, by: B.y, br: B.r });
    if (UNDO.length > 40) UNDO.shift();
    const u = $('undo'); if (u) u.disabled = false;
  }
  /* "Find the edge" fits a slope as well as an offset, and on a real
     photograph a hazy or uneven horizon - or barrel distortion bending it -
     can put a tilt in that is not really there.  This zeroes it without
     moving the line's height at the point being measured. */
  function level() {
    if (!img) return;
    mark();
    H.tiltDeg = 0;
    setConf('Horizon levelled.', '');
    draw(); recompute();
  }
  function undo() {
    const s = UNDO.pop(); if (!s) return;
    H.y = s.hy; H.tiltDeg = s.ht; B.x = s.bx; B.y = s.by; B.r = s.br;
    if (!UNDO.length) $('undo').disabled = true;
    setConf('Undone.', '');
    draw(); recompute();
  }
  const pick = () => (step === 3 ? 'b' : 'h');

  const TELL = {
    1: 'Take a photograph of the sun or the moon with the horizon in the same frame.',
    2: 'Tap on the horizon in the picture. It does not have to be exact — then press "Find the edge for me", and use the buttons to fine-tune. Watch Hs change as you do.',
    3: 'Now tap the sun or moon. Again roughly is fine — press "Find the edge for me" and it will fit a circle to the limb.',
    4: 'Tell it which body and the time, and it works out Ho from Hs. Give an assumed position, then keep the sight.',
    5: 'The line of position. Keep two or three sights of different bodies and it solves the fix \u2014 the dashed ellipse is where 1\u2032 of sight error puts you.'
  };

  /* ---- step machinery ----------------------------------------------- */
  function show(id, on) { const e = $(id); if (e) e.hidden = !on; }
  function goStep(n) {
    if (n < 1) n = 1; if (n > 5) n = 5;
    /* Steps 2 and 3 need a photograph.  Steps 4 and 5 do not: sights kept
       earlier must be reachable without shooting a new one, which they were
       not - the whole navigation was hidden until an image loaded, so a
       passage's worth of sights sat there unreachable. */
    const haveSights = window.CELPLOT && window.CELPLOT.all().length > 0;
    if (!img && n >= 2 && n <= 3) n = haveSights ? 5 : 1;
    if (!img && n === 4 && !haveSights) n = 1;
    step = n;
    document.querySelectorAll('.steps li').forEach(li => {
      const s = +li.dataset.step;
      li.classList.toggle('on', s === step);
      li.classList.toggle('done', s < step);
    });
    $('tellme').textContent = TELL[step];
    if (step === 1 && window.CELPLOT && window.CELPLOT.all().length) {
      const n = window.CELPLOT.all().length;
      $('tellme').textContent += '  You have ' + n + ' sight' + (n === 1 ? '' : 's') +
        ' kept \u2014 Next goes to the plot.';
    }
    show('s1', step === 1);
    show('pic', step >= 2 && step <= 4);
    show('readout', step >= 2 && step <= 4);
    show('adjust', step === 2 || step === 3);
    show('sight', step === 4);
    show('plot', step === 5);
    show('dock', !!img || (window.CELPLOT && window.CELPLOT.all().length > 0));
    show('dockrow', step === 2 || step === 3);
    show('snaprow', step === 2 || step === 3);
    show('padTilt', step === 2);
    show('padBody', step === 3);
    $('back').disabled = step === 1;
    /* A disabled button labelled "Done" reads as stuck, which is exactly how
       it read.  On the last step it starts another sight instead. */
    $('next').textContent = step === 5 ? 'Another sight' : 'Next';
    $('next').disabled = false;
    if (step === 5) drawPlot();
    if (step < 2 || step > 3) view = 'wide';
    setView(step >= 2 && step <= 3 ? view : 'wide');
    setConf(step === 2 ? 'Tap the horizon, then Find the edge.'
          : step === 3 ? 'Tap the body, then Find the edge.' : '', '');
    draw(); recompute();
  }

  /* ---- plate scale ---------------------------------------------------- */
  function arcminPerPx() { return cam ? Math.atan(1 / cam.f) * R2D * 60 : 0; }
  function rebuildCam() {
    if (!img) return;
    /* A calibration measured on THIS frame size wins: it carries the lens
       distortion, which EXIF cannot.  One taken on a different frame size is
       a different lens or a crop, and is not used. */
    const C = loadCal();
    if (C && C.w === img.width && C.h === img.height) {
      cam = CS.makeCam(img.width, img.height, C.f, C.k1, C.k2);
      return;
    }
    const f35 = parseFloat($('f35').value) || (exif && exif.focal35);
    cam = f35 ? CS.makeCam(img.width, img.height,
                           CS.fpxFrom35mm(f35, img.width, img.height), 0, 0) : null;
  }

  /* ---- drawing -------------------------------------------------------- */
  function horizonPts() {
    const m = Math.tan(H.tiltDeg / R2D), cx = img.width / 2;
    return [[0, H.y - m * cx], [img.width - 1, H.y + m * (img.width - 1 - cx)]];
  }
  function halo(g, fn, colour) {
    g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 4; fn();
    g.strokeStyle = colour; g.lineWidth = 1.4; fn();
  }
  /* The body marker: a short line TANGENT to the limb, parallel to the
     horizon, with a gap at its centre so the edge being judged stays
     visible through it.  A crosshair covered exactly the thing the observer
     is trying to see. */
  function drawBody(g, S, gap, colour) {
    const a = H.tiltDeg / R2D;
    const ux = Math.cos(a), uy = Math.sin(a);          // along the horizon
    const L = 46 / Math.max(scale, 1e-6);              // image px, so ~46 on screen
    const p = S([B.x, B.y]);
    const d = [ux * 46, uy * 46];
    halo(g, () => {
      g.beginPath();
      g.moveTo(p[0] - d[0], p[1] - d[1]);
      g.lineTo(p[0] - d[0] * gap / 46, p[1] - d[1] * gap / 46);
      g.moveTo(p[0] + d[0] * gap / 46, p[1] + d[1] * gap / 46);
      g.lineTo(p[0] + d[0], p[1] + d[1]);
      g.stroke();
    }, colour);
    void L;
  }

  function draw() {
    if (!img || step < 2) return;
    if (view === 'zoom') { drawZoom(); return; }
    const cv = $('cv'), g = cv.getContext('2d');
    const maxW = Math.min($('stage').clientWidth, 760) - 2;
    scale = Math.min(1, maxW / img.width);
    cv.width = Math.round(img.width * scale);
    cv.height = Math.round(img.height * scale);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    const S = p => [p[0] * scale, p[1] * scale];
    const [a, b] = horizonPts().map(S);
    halo(g, () => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); },
         pick() === 'h' ? '#6fb3d9' : 'rgba(111,179,217,0.5)');
    drawBody(g, S, 9, pick() === 'b' ? '#ff4438' : 'rgba(255,68,56,0.5)');
    drawZoom();
  }

  /* The whole frame fitted to a phone is ~10 image pixels per screen pixel,
     which is 12 arcminutes - the sun's disc is one pixel across and a
     snapped horizon vanishes into the edge it found.  So the selected
     feature also gets shown magnified, at an integer zoom with
     image-rendering: pixelated, because a browser's smoothing would be
     inventing the very edge being judged. */
  const ZOOM = 4;
  function drawZoom() {
    if (!img || step < 2 || step > 3 || view !== 'zoom') { zwin = null; return; }
    const cv = $('zoom'), g = cv.getContext('2d');
    const wCss = Math.min($('stage').clientWidth, 760) - 2;
    const srcW = Math.round(wCss / ZOOM), srcH = Math.round(Math.min(170, wCss * 0.4) / ZOOM);
    cv.width = srcW * ZOOM; cv.height = srcH * ZOOM;
    const cxI = pick() === 'h' ? img.width / 2 : B.x;
    const cyI = pick() === 'h' ? H.y : B.y;
    const sx = cxI - srcW / 2, sy = cyI - srcH / 2;
    g.imageSmoothingEnabled = false;
    /* the backdrop behind the crop is the app's panel, so it follows the mode.
       It was fixed at the dark value and stayed grey when the rest went red. */
    g.fillStyle = cssvar('--panel') || '#10151a'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, sx, sy, srcW, srcH, 0, 0, cv.width, cv.height);
    const T = p => [(p[0] - sx) * ZOOM, (p[1] - sy) * ZOOM];
    if (pick() === 'h') {
      const [a, b] = horizonPts().map(T);
      halo(g, () => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }, '#6fb3d9');
    } else {
      const a = H.tiltDeg / R2D, ux = Math.cos(a), uy = Math.sin(a);
      const c = T([B.x, B.y]);
      halo(g, () => {
        g.beginPath();
        g.moveTo(c[0] - ux * 70, c[1] - uy * 70);
        g.lineTo(c[0] - ux * 14, c[1] - uy * 14);
        g.moveTo(c[0] + ux * 14, c[1] + uy * 14);
        g.lineTo(c[0] + ux * 70, c[1] + uy * 70);
        g.stroke();
      }, '#ff4438');
    }
    zwin = { sx, sy, srcW, srcH };
    $('zoomlbl').textContent = ZOOM + ':1  ' + (pick() === 'h' ? 'horizon' : 'body') +
      '  |  one screen pixel = ' + (arcminPerPx() / ZOOM).toFixed(3) + " arcmin";
  }

  function setView(v) {
    view = v;
    document.querySelectorAll('[data-view]').forEach(b =>
      b.classList.toggle('on', b.dataset.view === v));
    show('cv', v === 'wide');
    show('zoom', v === 'zoom');
    show('zoomlbl', v === 'zoom');
    draw();
  }

  /* ---- the measurement -------------------------------------------------- */
  function fmtAng(d) {
    const neg = d < 0; d = Math.abs(d);
    const deg = Math.floor(d), min = (d - deg) * 60;
    return (neg ? '-' : '') + deg + '° ' + min.toFixed(1) + "'";
  }
  function hsNow() {
    if (!cam) return null;
    try { return CS.measureHs(horizonPts(), [B.x, B.y], cam).hs; } catch (e) { return null; }
  }
  function recompute() {
    if (!img || step < 2) return;
    rebuildCam();
    if (!cam) {
      $('hs').textContent = '—'; $('ho').textContent = '—';
      $('chain').textContent = 'No focal length yet. Enter the 35 mm equivalent on step 4.';
      return;
    }
    const hs = hsNow();
    if (hs === null) { $('hs').textContent = '—'; return; }
    $('hs').textContent = fmtAng(hs);
    const body = $('body').value, utc = $('utc').value.trim();
    let jd = null;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(utc)) jd = CN.parse_utc(utc);
    if (!body || jd === null) {
      $('ho').textContent = '—';
      $('chain').textContent = 'Ho needs a body and a time — step 4.'; return;
    }
    if (CN.body_at(body, jd) === 'ERR') {
      $('ho').textContent = '—'; $('chain').textContent = 'Body not in the catalogue.'; return;
    }
    const he = parseFloat($('he').value) || 0, ie = parseFloat($('ie').value) || 0;
    const tm = parseFloat($('tm').value), pr = parseFloat($('pr').value);
    const ho = CN.corrections(hs, ie, he, isNaN(tm) ? 10 : tm, isNaN(pr) ? 1010 : pr, $('limb').value);
    const E = CN.E;
    $('ho').textContent = fmtAng(ho);
    $('chain').textContent = step < 4 ? '' : 'dip -' + E.C_DIP.toFixed(1) + "'  refr -" + E.C_REF.toFixed(1) +
      "'  parallax +" + E.C_PAR.toFixed(1) + "'  limb " + (E.C_LIMB >= 0 ? '+' : '') +
      E.C_LIMB.toFixed(1) + "'   |  " + arcminPerPx().toFixed(3) + "' per pixel";
  }
  function setConf(s, state) { const e = $('conf'); e.textContent = s; e.dataset.state = state || ''; }

  /* ---- find the edge ----------------------------------------------------- */
  function snap() {
    if (!img) return;
    mark();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    if (pick() === 'h') {
      const [p1, p2] = horizonPts();
      const r = RF.refineHorizon(data, p1, p2);
      if (!r.ok) { setConf('No clear edge found there. Tap closer to the horizon, or set it by hand.', 'bad'); return; }
      const cx = img.width / 2, t = (cx - r.p1[0]) / (r.p2[0] - r.p1[0]);
      H.y = r.p1[1] + (r.p2[1] - r.p1[1]) * t;
      H.tiltDeg = Math.atan2(r.p2[1] - r.p1[1], r.p2[0] - r.p1[0]) * R2D;
      setConf('Horizon: ' + r.used + ' samples, ' + r.dropped + ' discarded, scatter ' +
              (r.rmsPx * arcminPerPx()).toFixed(2) + "' — " +
              (r.rmsPx < 1 ? 'a clean edge.' : 'ragged; check it in the magnified view.'),
              r.rmsPx < 1 ? 'good' : 'bad');
    } else {
      /* Fit the circle to the disc, then place the measured point ON THE LIMB
         that was selected - lower limb is the edge nearest the horizon, which
         is what the observer brings down to it.  corrections() then applies
         the semi-diameter exactly once. */
      const r = RF.refineLimb(data, [B.x, B.y], B.r);
      if (!r.ok) { setConf('No limb found. Tap the middle of the sun and try again.', 'bad'); return; }
      const a = H.tiltDeg / R2D;
      const nx = -Math.sin(a), ny = Math.cos(a);     // perpendicular, toward the horizon
      const limb = $('limb').value;
      const sgn = limb === 'L' ? 1 : limb === 'U' ? -1 : 0;
      B.x = r.centre[0] + sgn * r.radius * nx;
      B.y = r.centre[1] + sgn * r.radius * ny;
      B.r = r.radius;
      let msg = (limb === 'C' ? 'Centre' : limb === 'L' ? 'Lower limb' : 'Upper limb') +
                ': ' + r.used + ' rays, scatter ' + r.rmsPx.toFixed(2) + ' px';
      let state = r.rmsPx < 0.75 ? 'good' : '';
      /* The ephemeris knows the true semi-diameter, so the fitted disc is an
         independent check on the focal length.  It is far too small a ruler
         to REFINE the scale, but it catches a gross error - a wrong lens, a
         digital zoom, bad EXIF - before it becomes a confident fix. */
      const sd = CN.E.B_SD;
      if (sd > 0 && cam) {
        const wantPx = sd / arcminPerPx(), pct = 100 * (r.radius - wantPx) / wantPx;
        msg += '. Disc is ' + r.radius.toFixed(1) + ' px where the almanac expects ' +
               wantPx.toFixed(1) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)';
        if (Math.abs(pct) > 5) { msg += ' — the focal length looks wrong.'; state = 'bad'; }
        else msg += ' — consistent.';
      }
      setConf(msg, state);
    }
    draw(); recompute();
  }

  /* ---- nudging ------------------------------------------------------------
     A button that says one arcminute must deliver one arcminute.  The CENTRE
     plate scale does not: on a rectilinear lens a pixel is worth less angle
     off-axis, by 1/(1+(r/f)^2), so a horizon 280 px off-centre on a short
     lens moved 0.90' for a 1' tap.  Measure the local derivative instead. */
  function dHsPerPx(axis) {
    const h0 = hsNow(); if (h0 === null) return null;
    const save = { y: H.y, bx: B.x, by: B.y };
    if (axis === 'v') { if (pick() === 'h') H.y -= 1; else B.y -= 1; }
    else if (axis === 'x') B.x += 1;
    const h1 = hsNow();
    H.y = save.y; B.x = save.bx; B.y = save.by;
    return h1 === null ? null : (h1 - h0) * 60;
  }
  function nudge(axis, stepv) {
    if (!img) return;
    if (!nudging) { mark(); nudging = true; }
    if (axis === 't') { H.tiltDeg += stepv; draw(); recompute(); return; }
    if (axis === 'r') { B.r = Math.max(2, B.r + stepv); draw(); recompute(); return; }
    if (!cam) return;
    const d = dHsPerPx(axis);
    if (d === null || Math.abs(d) < 1e-9) return;
    const px = Math.abs(stepv / d) * Math.sign(stepv);
    if (axis === 'v') { if (pick() === 'h') H.y -= px; else B.y -= px; }
    else if (axis === 'x') B.x += px;
    draw(); recompute();
  }

  /* ---- loading a photograph ------------------------------------------- */
  function loadFile(f) {
    if (!f) return;
    const fr = new FileReader();
    fr.onerror = () => { $('shotnote').textContent = 'Could not read that file.'; };
    fr.onload = function () {
      exif = null;
      try { exif = EX.readExif(fr.result); } catch (e) {}
      const url = URL.createObjectURL(new Blob([fr.result], { type: f.type || 'image/jpeg' }));
      const im = new Image();
      im.onerror = () => { $('shotnote').textContent = 'That file is not an image this browser can open.'; };
      im.onload = function () {
        img = im; URL.revokeObjectURL(url);
        H.y = img.height * 0.70; H.tiltDeg = 0;
        B.x = img.width / 2; B.y = img.height * 0.35; B.r = 14;
        if (exif && exif.focal35) $('f35').value = exif.focal35;
        const note = img.width + ' × ' + img.height +
          (exif && exif.focal35 ? '  |  ' + exif.focal35 + ' mm equivalent, from the photo'
                                : '  |  no focal length in the photo — enter it on step 4') +
          (exif && exif.model ? '  |  ' + exif.model : '');
        $('shotnote').textContent = note;
        goStep(2); cameraNote();
      };
      im.src = url;
    };
    fr.readAsArrayBuffer(f);
  }
  $('take').addEventListener('click', () => $('fileCam').click());
  $('choose').addEventListener('click', () => $('filePick').click());
  ['fileCam', 'filePick'].forEach(id =>
    $(id).addEventListener('change', e => loadFile(e.target.files && e.target.files[0])));

  /* ---- events ----------------------------------------------------------- */
  function onTap(ev) {
    if (!img || step < 2 || step > 3) return;
    /* Map the tap through the canvas's RENDERED rectangle, not through the
       scale used to size its backing store.  CSS caps the photo's height so
       the controls stay on screen, which makes the two differ - and taps
       then land in the wrong part of the image, silently, by hundreds of
       pixels.  The rect is the truth whatever the CSS does. */
    const el = view === 'zoom' ? $('zoom') : $('cv');
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    let x, y;
    if (view === 'zoom' && zwin) {
      x = zwin.sx + (ev.clientX - r.left) * (zwin.srcW / r.width);
      y = zwin.sy + (ev.clientY - r.top) * (zwin.srcH / r.height);
    } else {
      x = (ev.clientX - r.left) * (img.width / r.width);
      y = (ev.clientY - r.top) * (img.height / r.height);
    }
    mark();
    if (pick() === 'h') H.y = y - Math.tan(H.tiltDeg / R2D) * (x - img.width / 2);
    else { B.x = x; B.y = y; }
    draw(); recompute();
  }
  $('cv').addEventListener('pointerdown', onTap);
  $('zoom').addEventListener('pointerdown', onTap);
  document.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => setView(b.dataset.view)));
  document.querySelectorAll('.nudge').forEach(b => {
    let t = null, n = 0;
    const go = () => { nudge(b.dataset.axis, parseFloat(b.dataset.step)); n++;
                       t = setTimeout(go, n < 4 ? 320 : n < 12 ? 110 : 45); };
    const stop = () => { clearTimeout(t); t = null; n = 0; nudging = false; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); go(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => b.addEventListener(k, stop));
  });
  $('snap').addEventListener('click', snap);
  $('undo').addEventListener('click', undo);
  $('level').addEventListener('click', level);
  $('next').addEventListener('click', () => {
    if (step === 5) { UNDO.length = 0; $('undo').disabled = true; goStep(1); }
    else if (step === 1 && !img) goStep(5);      // straight to the kept sights
    else goStep(step + 1);
  });
  $('back').addEventListener('click', () => goStep(step - 1));
  ['body','limb','utc','he','ie','tm','pr','f35'].forEach(id => $(id).addEventListener('input', recompute));
  /* Changing which limb was observed moves the measured point to the other
     side of the disc, so the sight must be re-fitted rather than silently
     keeping the old one. */
  $('limb').addEventListener('change', () => {
    if (img && step >= 2) setConf('Limb changed \u2014 press "Find the edge for me" again on step 3.', '');
  });

  /* ---- keeping a sight, and plotting ------------------------------------
     What is stored is the RAW sextant reading and the conditions, never Ho.
     The whole correction chain is then re-run when the fix is solved, so
     fixing the height of eye or the time or the limb fixes every sight that
     used it instead of leaving a stale Ho behind. */
  function currentSight() {
    const utc = $('utc').value.trim();
    if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(utc)) return { err: 'Enter a UTC time.' };
    const body = $('body').value;
    if (!body) return { err: 'Choose a body.' };
    const hs = hsNow();
    if (hs === null) return { err: 'No measurement yet \u2014 mark the horizon and the body first.' };
    return { body: body, jd: CN.parse_utc(utc), hs: hs,
             ie: parseFloat($('ie').value) || 0, he: parseFloat($('he').value) || 0,
             tm: isNaN(parseFloat($('tm').value)) ? 10 : parseFloat($('tm').value),
             pr: isNaN(parseFloat($('pr').value)) ? 1010 : parseFloat($('pr').value),
             limb: $('limb').value, utc: utc };
  }
  function ap() {
    const la = CN.parse_ang($('alat').value), lo = CN.parse_ang($('alon').value);
    if (la === 'ERR' || lo === 'ERR' || isNaN(la) || isNaN(lo)) return null;
    return { lat: la, lon: lo };
  }
  $('keep').addEventListener('click', function () {
    const s = currentSight();
    if (s.err) { $('keepnote').textContent = s.err; return; }
    const n = window.CELPLOT.add(s);
    $('keepnote').textContent = n + ' sight' + (n === 1 ? '' : 's') + ' kept. ' +
      (n < 2 ? 'One more of a different body gives a fix.' : 'Go on to the plot.');
    if (!ap()) $('keepnote').textContent += '  An assumed position is needed to plot it.';
    goStep(step);                 /* the plot is reachable now; refresh the nav */
  });
  $('clearsights').addEventListener('click', function () {
    window.CELPLOT.clear(); drawPlot(); goStep(step);
  });

  function drawPlot() {
    const host = $('sheet'), list = $('sightlist');
    const P = ap();
    list.textContent = '';
    if (!P) {
      host.textContent = '';
      $('fixnote').textContent = 'Give an assumed latitude and longitude on step 4 \u2014 ' +
        'an intercept is measured FROM somewhere.';
      return;
    }
    const sol = window.CELPLOT.solve(CN, P.lat, P.lon,
      parseFloat($('spd').value) || 0, parseFloat($('crs').value) || 0);
    if (!sol) {
      host.textContent = '';
      $('fixnote').textContent = 'No sights kept yet.';
      return;
    }
    window.CELPLOT.draw('http://www.w3.org/2000/svg', host, sol, {
      css: n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9'
    });

    sol.lops.forEach(function (L, i) {
      const row = document.createElement('div');
      row.className = 'srow';
      const b = document.createElement('b'); b.textContent = L.name;
      const sp = document.createElement('span');
      sp.textContent = 'Zn ' + ('00' + Math.round(L.zn)).slice(-3) + '  ' +
        (L.intercept >= 0 ? 'toward ' : 'away ') + Math.abs(L.intercept).toFixed(1) + ' nm';
      const x = document.createElement('button');
      x.textContent = 'remove'; x.type = 'button';
      x.addEventListener('click', function () { window.CELPLOT.remove(i); drawPlot(); });
      row.appendChild(b); row.appendChild(sp); row.appendChild(x);
      list.appendChild(row);
    });

    if (sol.n < 2) {
      $('fixnote').textContent = 'One line of position. You are somewhere on it. ' +
        'A second body at a good angle gives a fix.';
    } else if (!sol.ok) {
      $('fixnote').textContent = 'The lines are parallel \u2014 this is not a fix. ' +
        'Shoot a body at least 40\u00b0 away in azimuth.';
    } else {
      const g = sol.geom;
      let t = 'FIX  ' + CN.fmt_lat(sol.lat) + '  ' + CN.fmt_lon(sol.lon);
      if (g && !g.parallel) {
        t += '   \u2014 1\u2032 of sight error puts it out ' + g.major.toFixed(1) +
             ' nm along ' + ('00' + Math.round(g.brg)).slice(-3) + 'T and ' +
             g.minor.toFixed(1) + ' nm across.';
        if (g.major > 3.0) t += '  WEAK CUT: add a body 40\u2013120\u00b0 away.';
      }
      $('fixnote').textContent = t;
    }
  }

  /* ---- what the photograph itself says about the camera -----------------
     The settings matter as much as the technique.  A digitally zoomed frame
     is a crop upscaled and its focal length may be a fiction; a missing
     focal length means the plate scale is a guess; and a saved calibration
     beats both.  Say which of those is in force rather than quietly using
     whichever happened to be available. */
  function cameraNote() {
    const e = $('camwarn'), C = loadCal();
    if (!img) { e.textContent = ''; return; }
    const bits = [];
    let state = '';
    if (C && C.w === img.width && C.h === img.height) {
      bits.push('Using your saved calibration: f ' + C.f.toFixed(0) +
                ' px, k1 ' + C.k1.toFixed(4) + ', fitted to ' + C.rms.toFixed(2) + "'.");
      state = 'good';
    } else if (C) {
      bits.push('A calibration is saved but for a ' + C.w + '\u00d7' + C.h +
                ' frame, not this one \u2014 a different lens or a crop. Not used.');
      state = 'bad';
    }
    if (exif && exif.digitalZoom && exif.digitalZoom > 1.01) {
      bits.push('DIGITAL ZOOM \u00d7' + exif.digitalZoom.toFixed(2) +
                ' \u2014 this frame is a crop, and the focal length in it may be ' +
                'a fiction. Re-shoot without zooming.');
      state = 'bad';
    }
    if (!C && !(exif && exif.focal35))
      bits.push('No focal length in the photograph and no calibration \u2014 ' +
                'the plate scale is whatever you type, so the sight is a guess.');
    if (exif && exif.lensModel) bits.push('Lens: ' + exif.lensModel + '.');
    if (!C) bits.push('Uncalibrated: lens distortion is unmodelled and can cost ' +
                      'tens of arcminutes. Calibrate once and it is done.');
    e.textContent = bits.join('  ');
    e.dataset.state = state;
  }

  /* ---- calibration ------------------------------------------------------ */
  const CALKEY = 'celnav-calibration';
  function loadCal() {
    try { return JSON.parse(localStorage.getItem(CALKEY) || 'null'); } catch (e) { return null; }
  }
  function saveCal(c) { try { localStorage.setItem(CALKEY, JSON.stringify(c)); } catch (e) {} }

  let calImg = null, calScale = 1, calPt = null;
  const CALOBS = [];

  function calDraw() {
    if (!calImg) return;
    const cv = $('calcv'), g = cv.getContext('2d');
    const maxW = Math.min($('calstage').clientWidth, 760) - 2;
    calScale = Math.min(1, maxW / calImg.width);
    cv.width = Math.round(calImg.width * calScale);
    cv.height = Math.round(calImg.height * calScale);
    g.drawImage(calImg, 0, 0, cv.width, cv.height);
    const mark = (p, col, label) => {
      const x = p[0] * calScale, y = p[1] * calScale;
      g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5;
      g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke();
      g.strokeStyle = col; g.lineWidth = 1.4;
      g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke();
      if (label) { g.fillStyle = col; g.font = '12px ui-monospace, Menlo, monospace';
                   g.fillText(label, x + 12, y + 4); }
    };
    CALOBS.forEach(o => mark(o.p, '#2fd45f', o.name));
    if (calPt) mark(calPt, '#ff4438', null);
  }
  function calFile(f) {
    if (!f) return;
    const fr = new FileReader();
    fr.onload = function () {
      const url = URL.createObjectURL(new Blob([fr.result], { type: f.type || 'image/jpeg' }));
      const im = new Image();
      im.onload = function () {
        calImg = im; URL.revokeObjectURL(url);
        CALOBS.length = 0; calPt = null;
        try { const x = EX.readExif(fr.result); if (x && x.focal35) $('f35').value = x.focal35; } catch (e) {}
        calNote(); calDraw();
      };
      im.src = url;
    };
    fr.readAsArrayBuffer(f);
  }
  function calNote(msg, state) {
    const n = CALOBS.length;
    $('calnote').textContent = msg !== undefined ? msg :
      (!calImg ? 'No photograph yet.'
       : n + ' star' + (n === 1 ? '' : 's') + ' marked. ' +
         (n < 3 ? 'Three is the minimum, four or more is better \u2014 and include one near a corner and one near the middle, or focal length and distortion cannot be told apart.'
                : 'Ready to solve.'));
    $('calnote').dataset.state = state || '';
  }
  $('caltake').addEventListener('click', () => $('calfile').click());
  $('calfile').addEventListener('change', e => calFile(e.target.files && e.target.files[0]));
  $('calcv').addEventListener('pointerdown', function (ev) {
    if (!calImg) return;
    const r = $('calcv').getBoundingClientRect();
    calPt = [(ev.clientX - r.left) * (calImg.width / r.width),
             (ev.clientY - r.top) * (calImg.height / r.height)];
    calDraw(); calNote('Now say which star that is, and add it.');
  });
  $('caladd').addEventListener('click', function () {
    if (!calPt) { calNote('Tap a star in the picture first.', 'bad'); return; }
    const i = +$('calstar').value;
    if (CALOBS.some(o => o.idx === i)) { calNote('That star is already marked.', 'bad'); return; }
    CALOBS.push({ p: calPt, idx: i, name: CN.stars.SNAME[i],
                  ra: CN.stars.SRA[i], dec: CN.stars.SDEC[i] });
    calPt = null; calDraw(); calNote();
  });
  $('calundo').addEventListener('click', function () {
    CALOBS.pop(); calPt = null; calDraw(); calNote();
  });
  $('calsolve').addEventListener('click', function () {
    if (!calImg) { calNote('No photograph.', 'bad'); return; }
    const f35 = parseFloat($('f35').value);
    const f0 = f35 ? CS.fpxFrom35mm(f35, calImg.width, calImg.height)
                   : Math.max(calImg.width, calImg.height) * 0.72;
    const r = window.CELCALIB.solveCamera(
      CALOBS.map(o => ({ p: o.p, ra: o.ra, dec: o.dec, name: o.name })),
      f0, calImg.width / 2, calImg.height / 2);
    if (r.err) { calNote(r.err, 'bad'); return; }
    saveCal({ f: r.f, k1: r.k1, k2: r.k2, rms: r.rmsArcmin,
              w: calImg.width, h: calImg.height, stars: r.stars });
    calNote('Saved. f ' + r.f.toFixed(0) + ' px, k1 ' + r.k1.toFixed(4) +
            ', k2 ' + r.k2.toFixed(4) + ' \u2014 ' + r.stars + ' stars, ' +
            r.pairs + ' pairs, fitted to ' + r.rmsArcmin.toFixed(2) + " arcmin." +
            (r.warn ? '  ' + r.warn : ''), r.warn ? 'bad' : 'good');
    rebuildCam(); recompute(); cameraNote();
  });
  $('gocal').addEventListener('click', function () {
    show('cal', true); show('steps', false); show('tellme', false);
    show('s1', false); show('pic', false); show('readout', false);
    show('adjust', false); show('sight', false); show('plot', false);
    show('dock', false);
    const sel = $('calstar');
    if (!sel.options.length)
      CN.stars.SNAME.forEach((n, i) => {
        const o = document.createElement('option'); o.value = i; o.textContent = n; sel.appendChild(o);
      });
    calNote();
  });
  $('calclose').addEventListener('click', function () {
    show('cal', false); show('steps', true); show('tellme', true);
    goStep(4); cameraNote();
  });

  /* ---- boot ------------------------------------------------------------- */
  function setMode(m) {
    document.documentElement.setAttribute('data-mode', m);
    $('mode').textContent = m === 'night' ? 'DARK' : 'NIGHT';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content',
        getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()
        || '#07090b');   /* the browser chrome follows the palette, so a third mode
                            needs no third branch here */
    try { localStorage.setItem('bashnav-mode', m); } catch (e) {}
  }
  let saved = 'dark';
  try { saved = localStorage.getItem('bashnav-mode') || 'dark'; } catch (e) {}
  setMode(saved === 'night' ? 'night' : 'dark');
  $('mode').addEventListener('click', () =>
    setMode(document.documentElement.getAttribute('data-mode') === 'night' ? 'dark' : 'night'));

  const sel = $('body');
  ['Sun','Moon','Venus','Mars','Jupiter','Saturn'].concat(CN.stars.SNAME)
    .forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
  $('utc').value = new Date().toISOString().slice(0, 19).replace('T', ' ');
  window.addEventListener('resize', draw);
  goStep(1);
  const bs = $('build'); if (bs) bs.textContent = 'build ' + BUILD;

  /* OFFLINE CACHING, AND WHY IT IS SWITCHED OFF IN SOME BUILDS.
     The service worker is cache-first, which is right at sea and wrong
     while the page is being changed: a republish then serves the OLD
     code to anyone who opened the page before, with no sign that it has
     done so.  That is exactly what happened - a whole round of testing
     against a stale build.  So a build can declare CELNAV_NO_SW, and it
     then actively unregisters any worker and clears the caches instead
     of installing one. */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    if (window.CELNAV_NO_SW) {
      navigator.serviceWorker.getRegistrations()
        .then(rs => Promise.all(rs.map(r => r.unregister()))).catch(() => {});
      if (window.caches && caches.keys)
        caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).catch(() => {});
    } else {
      /*  updateViaCache: 'none' IS THE OTHER HALF OF THE SAME FAULT.
          A browser only checks sw.js for updates on navigation, and that check
          goes through the HTTP cache unless the previous script's max-age was
          over 24 hours. GitHub Pages sends max-age=600, so for ten minutes
          after a push the browser compares the new sw.js against a CACHED COPY
          of the old one, sees no difference, and installs nothing. "Open it
          once with a signal" is then a no-op that looks exactly like the app
          being stuck - which is what it looked like.  */
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
  }
})();

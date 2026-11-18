/* =====================================================================
   weather -- the browser build.  No framework, no build step.

   THE ORDER IS THE POINT, and the page has to enforce it as firmly as
   the code does: nothing of the app's reasoning is on screen until the
   user's own call has been committed to the log.  Not greyed out, not
   collapsed, not behind a tap -- absent.  A guess you can glimpse is a
   guess you have read, and then you have not forecast anything.

   It reads deck-log's observations out of the SAME IndexedDB.  Both
   tools are served from one origin, and IndexedDB is per-origin and not
   per-path, so this is literally the one shared store the design asks
   for: the watch stander says the report once.
   ===================================================================== */
'use strict';

/*  The build number is not written here. It is asked of the worker that
    is serving this page - see docs/web/shared/build.js for why. The date
    below is paired with nothing, so it can only be stale, never in
    disagreement with another value. */

var RECS = [];
var OBS = [];
var VIEW = 'home';

function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function lsGet(k, d) { try { var v = localStorage.getItem('weather-' + k); return v === null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem('weather-' + k, v); } catch (e) {} }


/*  REPAINTING WHEN THE DISPLAY MODE CHANGES.

    The lesson figures are SVG built with colours read from the stylesheet
    at draw time, so they keep the palette they were drawn in.  Whatever
    draws one says how to draw it again; on a mode change anything still in
    the document is repainted and anything detached is dropped.  */
var WXREPAINT = [];
function wxRepaints(host, fn) {
  WXREPAINT.push({ host: host, fn: fn });
  fn(host);
}
window.addEventListener('visualmodechange', function () {
  WXREPAINT = WXREPAINT.filter(function (r) { return document.body.contains(r.host); });
  WXREPAINT.forEach(function (r) { r.host.textContent = ''; r.fn(r.host); });
});

/*  The display modes, as a list rather than a branch.  Adding a fourth
    palette - a high-contrast day, say - is one entry here and one block in
    the stylesheet, and touches no logic.  */
var MODES = ['day', 'dark', 'night'];
var MODE_KEY = 'visual-mode';   /* one name for the whole suite, so a mode set
                                   in one tool is the mode in the next, and in
                                   the course pages that embed them */

/*  night is the default: a tool opened on deck must not start bright.  */
function savedMode() {
  var s = null;
  try { s = localStorage.getItem(MODE_KEY); } catch (e) {}
  return MODES.indexOf(s) >= 0 ? s : 'night';
}

/*  Only night -> day is guarded.  Going darker is never harmful; going
    bright when dark-adapted costs about twenty minutes, so that one change
    takes a deliberate half second and can be released to cancel.  */
function wireModes() {
  var btns = document.querySelectorAll('#modes .mb');
  var HOLD_MS = 500, holdT = null, holdB = null;
  function guarded(m) {
    return m === 'day' &&
           document.documentElement.getAttribute('data-mode') === 'night';
  }
  function cancelHold() {
    if (holdT) clearTimeout(holdT);
    holdT = null;
    if (holdB) holdB.classList.remove('holding');
    holdB = null;
  }
  for (var i = 0; i < btns.length; i++) {
    (function (btn) {
      var m = btn.getAttribute('data-mode');
      btn.addEventListener('pointerdown', function (e) {
        if (!guarded(m)) return;
        e.preventDefault();
        holdB = btn; btn.classList.add('holding');
        holdT = setTimeout(function () { cancelHold(); setMode(m); }, HOLD_MS);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
        btn.addEventListener(ev, cancelHold);
      });
      btn.addEventListener('click', function (e) {
        if (guarded(m)) { e.preventDefault(); return; }   /* the hold does it */
        setMode(m);
      });
      /*  A keyboard activation is already deliberate, so it is not held. */
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode(m); }
      });
    })(btns[i]);
  }
}

function setMode(m) {
  if (MODES.indexOf(m) < 0) m = 'night';
  document.documentElement.setAttribute('data-mode', m);
  var mbs = document.querySelectorAll('#modes .mb');
  for (var mi = 0; mi < mbs.length; mi++)
    mbs[mi].setAttribute('aria-pressed',
      String(mbs[mi].getAttribute('data-mode') === m));
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content',
      getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()
      || '#07090b');   /* the browser chrome follows the palette, so a third mode
                          needs no third branch here */
  try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
  /*  Anything already painted was painted in the old palette.  A canvas or
      an SVG built with colours read at draw time does not follow the
      stylesheet, so it has to be told.  An event rather than a call list:
      the drawing lives in other files, and the course pages embed these
      tools too.  */
  try { window.dispatchEvent(new CustomEvent('visualmodechange', { detail: m })); }
  catch (e) { /* very old browser: the palette still changed */ }
}

var TITLES = { home: 'weather', what: 'What the log says', fcast: 'Your forecast',
               score: 'The score', chart: '500 mb chart', isobars: 'Wind from the isobars', storm: 'A reported storm',
               learn: 'Lessons',
               about: 'About' };
function go(v) {
  VIEW = v;
  Object.keys(TITLES).forEach(function (n) { $('v-' + n).hidden = (n !== v); });
  $('back').hidden = (v === 'home');
  $('title').textContent = TITLES[v];
  window.scrollTo(0, 0);
  if (v === 'what') drawWhat();
  if (v === 'fcast') startForecast();
  if (v === 'score') drawScore();
  if (v === 'chart') drawChart();
  if (v === 'isobars') drawIsobars();
  if (v === 'storm') drawStorm();
  if (v === 'learn') drawLessonIndex();
  if (v === 'about') drawAbout();
}

/* ---- rendering a reasoning block ----------------------------------- */
function drawReason(box, items) {
  box.textContent = '';
  items.forEach(function (it) {
    if (it.k === 'gap') { box.appendChild(el('div', 'gap')); return; }
    box.appendChild(el('p', it.k === 'why' ? 'why' : it.k, it.t));
  });
}

/* =====================================================================
   What the log says
   ===================================================================== */
function lonVal() {
  var v = lsGet('lon', '');
  return (v === '' || v === null) ? '' : v;
}
function drawWhat() {
  var lon = lonVal();
  var hours = +lsGet('glass-h', '48');
  if (hours !== 24 && hours !== 72) hours = 48;
  var pct = lsGet('sea-close', '');
  var items = WX.report(OBS, lon, hours, pct);
  /*  the terminal prints the glass as a table; the page draws it, so the
      table's lines (marked glass) are left out of the page's reasoning and
      kept in "Show it as the terminal does"  */
  var shown = items.filter(function (it) { return !it.glass; });
  drawReason($('what-out'), shown);
  $('what-term').textContent = WX.renderTerminal(items, OBS.length >= 2);
  /*  the sea against the wind: its figure goes in beside its own words,
      which the report marks; one child of the list for each item, so the
      first of them that is not a gap is where the figure belongs  */
  var firstOf = function (mark) {
    for (var q = 0; q < shown.length; q++) if (shown[q][mark] && shown[q].k !== 'gap') return q;
    return -1;
  };
  var atSea = items.sea ? firstOf('sea') : -1, atLow = items.low ? firstOf('low') : -1;
  /*  the later one goes in first, so the earlier one's place has not moved  */
  if (atSea >= 0) $('what-out').insertBefore(seaBlock(items.sea), $('what-out').children[atSea]);
  /*  where the low lies: the compass card, beside the words that give its
      bearings (weather 1.0.8)  */
  if (atLow >= 0) $('what-out').insertBefore(lowBlock(items.low), $('what-out').children[atLow]);
  var G = items.glass, box = $('glass-fig');
  box.textContent = '';
  $('what-glass').hidden = !(G && G.n >= 2);
  if (G && G.n >= 2) {
    var bs = document.querySelectorAll('#what-glass .win');
    for (var i = 0; i < bs.length; i++)
      bs[i].setAttribute('aria-pressed', String(+bs[i].getAttribute('data-win') === hours));
    glassFigure(box, OBS, G, lon);
  }
}

/* =====================================================================
   WHERE THE LOW LIES: the compass card (weather 1.0.8; item 6 of the
   weather work before the launch).  The report already gave the low's
   bearing from the wind, by Buys Ballot; this draws it.

   Larry's ruling APK, 17 November 2026: the low is marked as a SECTOR,
   from straight off the arm Buys Ballot gives to 20 degrees forward of
   it, because the sea turns the wind on deck 10 to 20 degrees in toward
   the low (the gradient lesson's rule).  In the north the low is on your
   left with your back to the wind and the sector runs clockwise from
   that arm; in the south it is on your right and runs anticlockwise.

   Everything drawn comes from the report's own `low` (wx.js): the wind
   now, the sector's two edges in clockwise order, the hemisphere, and
   the wind before, which is drawn dashed with an arc for the shift when
   the wind has backed or veered more than 10 degrees, as the words say.

   Larry's ruling APR: the low itself is drawn out on its bearing with
   its wind round it, and, when the log has a wind that has shifted and a
   glass that is falling or rising, the quarter of the compass it must be
   heading into (WX.course): a dashed fan from the low, with what that
   means in a line under the card.  A single pointer is not possible: one
   boat's log does not give a storm's course.

   Said by FORM as well as colour: the wind is the one solid arrow, blown
   through the centre, where you are; the wind before is dashed; the low's
   bearing is a filled wedge, the low a ring with an L and small arrows
   round it, its course a dashed fan.  The warning colour is asked for by
   both its names (--warn, then --bad).  Source: Penn State METEO 3, in
   docs/SOURCES.md.  drawWhat redraws it on a mode change.
   ===================================================================== */
function lowBlock(L) {
  var wrap = el('div', 'lowblock');
  wrap.id = 'what-low';
  var fig = el('div'); fig.id = 'low-fig';
  wrap.appendChild(fig);
  lowFigure(fig, L);
  return wrap;
}
function lowFigure(host, L) {
  var d3 = function (x) { var s = String(Math.trunc(x)); while (s.length < 3) s = '0' + s; return s; };
  var shifted = WX.has(L.was) && (L.dw > 10 || L.dw < -10);
  var how = shifted ? (L.dw > 0 ? 'veered ' : 'backed ') + Math.trunc((L.dw > 0 ? L.dw : -L.dw) + 0.5) + ' degrees from ' + d3(L.was) : '';
  var C = L.course || null;
  var D = demoSvg('lowfig', 520, 566, 'A compass, north at the top. The wind is from ' + d3(L.wdir) +
    (shifted ? ', ' + how : '') + '. With your back to it the low lies between ' + d3(L.lo) + ' and ' + d3(L.hi) +
    ', on your ' + (L.north ? 'left' : 'right') + ' in the ' + (L.north ? 'northern' : 'southern') + ' hemisphere' +
    (C ? '. Its course is somewhere between ' + d3(C.c0) + ' and ' + d3(C.c1) +
         (C.closing ? '; if it holds that, it passes to your ' + WX.pt8(C.cpa) + '.' : '; it is drawing away.') : '.'));
  var cs = getComputedStyle(document.documentElement);
  var tk = function (k) { return cs.getPropertyValue(k).trim(); };
  var warn = tk('--warn') || tk('--bad') || '#e23a2c', panel = tk('--panel') || '#10151a', ground = tk('--ground') || '#07090b';
  var cx = 260, R = 70, RL = R + 70, RAD = Math.PI / 180;
  /*  THE CARD IS AS TALL AS WHAT IS ON IT.  The low can lie on any bearing
      and its course can run any way, so a frame with room for every case
      is mostly empty in each one.  What will be drawn above and below the
      centre is worked first - the ring and its letters, the low with its
      fan, the two labels - and the centre is set so the highest of them
      sits just under the title, with the key just under the lowest.  */
  var span0 = (L.hi - L.lo + 360) % 360, mid0 = L.lo + span0 / 2;
  var ldir = mid0;
  if (C && !C.closing) ldir = C.left ? mid0 + 90 : mid0 - 90;
  var lyRel = -RL * Math.cos(mid0 * RAD), reach = C ? 62 : 32;
  var lowLab = lyRel - 36 * Math.cos(ldir * RAD), windLab = -(R + 28) * Math.cos(L.wdir * RAD);
  var upMost = Math.min(-R - 24, lyRel - reach, lowLab - 14, windLab - 14);
  var downMost = Math.max(R + 24, lyRel + reach, lowLab + 14, windLab + 14);
  var cy = 44 - upMost, keyTop = cy + downMost + 22;
  var P = function (b, r, ox, oy) { return [(ox === undefined ? cx : ox) + r * Math.sin(b * RAD), (oy === undefined ? cy : oy) - r * Math.cos(b * RAD)]; };
  var set = function (k, v) { D.svg.setAttribute(k, v); };
  set('data-cx', cx); set('data-cy', cy); set('data-r', R); set('data-rl', RL);
  D.t(22, 24, 'Where the low lies', D.text, { 'font-weight': 600 });
  D.t(498, 24, (L.north ? 'northern' : 'southern') + ' hemisphere: on your ' + (L.north ? 'left' : 'right'), D.dim,
      { 'font-size': 11, 'text-anchor': 'end', 'data-part': 'hemi' });

  D.e('circle', { cx: cx, cy: cy, r: R, fill: panel, stroke: D.line, 'stroke-width': 1.5 });
  for (var b = 0; b < 360; b += 10) {
    var a = P(b, R), c = P(b, R - (b % 30 ? 4 : 8));
    D.e('line', { x1: a[0], y1: a[1], x2: c[0], y2: c[1], stroke: D.dim });
  }
  [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (c) {
    var p = P(c[1], R + 12);
    D.t(p[0], p[1] + 4.5, c[0], D.dim, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': c[0] === 'N' ? 700 : 400, 'data-part': 'card' });
  });
  /*  an arrow with its head, for the small ones  */
  var arrow = function (x1, y1, x2, y2, col, w, part, extra) {
    var o = { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, k;
    if (part) o['data-part'] = part;
    for (k in (extra || {})) o[k] = extra[k];
    D.e('line', o);
    var an = Math.atan2(y2 - y1, x2 - x1), h = w * 2.4 + 3;
    D.e('path', { d: 'M' + x2.toFixed(1) + ',' + y2.toFixed(1) + 'L' + (x2 - h * Math.cos(an - 0.45)).toFixed(1) + ',' + (y2 - h * Math.sin(an - 0.45)).toFixed(1) +
                     'L' + (x2 - h * Math.cos(an + 0.45)).toFixed(1) + ',' + (y2 - h * Math.sin(an + 0.45)).toFixed(1) + 'Z', fill: col });
  };

  /*  the low's bearing: a wedge from the arm Buys Ballot gives to 20
      degrees forward of it, lo to hi clockwise  */
  var span = (L.hi - L.lo + 360) % 360, p1 = P(L.lo, R - 2), p2 = P(L.hi, R - 2), mid = L.lo + span / 2;
  D.e('path', { d: 'M' + cx + ' ' + cy + 'L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'A' + (R - 2) + ' ' + (R - 2) + ' 0 0 1 ' +
                   p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + 'Z',
                fill: warn, 'fill-opacity': 0.20, stroke: warn, 'stroke-width': 2, 'stroke-linejoin': 'round',
                'data-part': 'low', 'data-lo': L.lo, 'data-hi': L.hi, 'data-arm': L.arm });

  /*  the wind before, when it has shifted: dashed  */
  if (shifted) {
    var w0 = P(L.was, R - 5);
    D.e('line', { x1: w0[0], y1: w0[1], x2: cx, y2: cy, stroke: D.acc, 'stroke-width': 2, 'stroke-dasharray': '5 5',
                  'stroke-opacity': 0.75, 'data-part': 'was', 'data-from': L.was });
  }
  /*  the wind now: one solid arrow, from its bearing, through you  */
  var wf = P(L.wdir, R - 5), wt = P(L.wdir + 180, R * 0.55);
  arrow(wf[0], wf[1], wt[0], wt[1], D.acc, 4, 'wind', { 'data-from': L.wdir });
  D.e('circle', { cx: cx, cy: cy, r: 5.5, fill: D.text, stroke: ground, 'stroke-width': 1.5, 'data-part': 'you' });

  /*  THE LOW ITSELF (Larry, APR): out along the middle of its bearing,
      with its wind round it - anticlockwise in the north, clockwise in the
      south, turned 15 degrees in toward the centre, as the top-down
      picture drew it.  How far off it is the log cannot say, so it is
      always drawn at the one distance.  */
  var lp = P(mid, RL), lx = lp[0], ly = lp[1];
  /*  its course: the quarter it is heading into, c0 to c1 clockwise, when
      the log has a shift and a moving glass  */
  if (C) {
    var f1 = P(C.c0, 56, lx, ly), f2 = P(C.c1, 56, lx, ly), cm = C.c0 + 45;
    D.e('path', { d: 'M' + lx.toFixed(1) + ' ' + ly.toFixed(1) + 'L' + f1[0].toFixed(1) + ' ' + f1[1].toFixed(1) + 'A56 56 0 0 1 ' +
                     f2[0].toFixed(1) + ' ' + f2[1].toFixed(1) + 'Z',
                  fill: warn, 'fill-opacity': 0.10, stroke: warn, 'stroke-width': 1.5, 'stroke-dasharray': '6 5',
                  'data-part': 'course', 'data-c0': C.c0, 'data-c1': C.c1, 'data-left': C.left ? 1 : 0, 'data-closing': C.closing ? 1 : 0 });
    var q0 = P(cm, 27, lx, ly), q1 = P(cm, 50, lx, ly);
    arrow(q0[0], q0[1], q1[0], q1[1], warn, 3, 'course-arrow');
  }
  D.e('circle', { cx: lx, cy: ly, r: 26, fill: ground, 'fill-opacity': 0.85 });
  for (var be = 0; be < 360; be += 45) {
    var pp = P(be, 20, lx, ly), hd = (L.north ? be - 105 : be + 105) * RAD;
    arrow(pp[0] - 5 * Math.sin(hd), pp[1] + 5 * Math.cos(hd), pp[0] + 5 * Math.sin(hd), pp[1] - 5 * Math.cos(hd), warn, 1.6, 'spin', { 'data-b': be });
  }
  D.e('circle', { cx: lx.toFixed(1), cy: ly.toFixed(1), r: 10.5, fill: ground, stroke: warn, 'stroke-width': 2.5, 'data-part': 'lowmark' });
  D.t(lx, ly + 4.5, 'L', warn, { 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle', 'data-part': 'L' });

  /*  the two labels, each set on the far side of its mark from the thing
      that would otherwise run through it: the low's bearings away from its
      course, the wind's bearing outside the ring  */
  var lab = function (px, py, dir, dist, s, fill, part) {
    var sn = Math.sin(dir * RAD), cs2 = Math.cos(dir * RAD), x = px + dist * sn, y = py - dist * cs2;
    D.t(x, y + (cs2 > 0.5 ? 0 : cs2 < -0.5 ? 9 : 4.5), s, fill,
        { 'font-size': 12, 'font-weight': 600, 'text-anchor': sn > 0.3 ? 'start' : sn < -0.3 ? 'end' : 'middle', 'data-part': part,
          stroke: ground, 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
  };
  /*  outward from the compass when the course runs back toward it; beside
      the low, on the side away from its course, when the course runs on
      outward (ldir, worked above with the card's height)  */
  lab(lx, ly, ldir, 36, d3(L.lo) + ' to ' + d3(L.hi), warn, 'low-label');
  lab(cx, cy, L.wdir, R + 28, 'wind from ' + d3(L.wdir), D.acc, 'wind-label');

  /*  the key  */
  var ky = keyTop;
  D.e('line', { x1: 30, y1: ky, x2: 56, y2: ky, stroke: D.acc, 'stroke-width': 4, 'stroke-linecap': 'round' });
  D.t(66, ky + 4, 'the wind, blowing through you at the centre' + (shifted ? '; dashed, the wind before:' : ''), D.dim, { 'font-size': 11, 'data-part': 'key-wind' });
  if (shifted) { ky += 14; D.t(66, ky + 4, 'it has ' + how, D.dim, { 'font-size': 11, 'data-part': 'key-was' }); }
  ky += 19;
  D.e('circle', { cx: 43, cy: ky, r: 7, fill: ground, stroke: warn, 'stroke-width': 2 });
  D.t(66, ky + 4, 'the low, between ' + d3(L.lo) + ' and ' + d3(L.hi) + ', with its wind round it; how far off, the log cannot say', D.dim,
      { 'font-size': 11, 'data-part': 'key-low' });
  ky += 19;
  D.e('path', { d: 'M30 ' + (ky + 5) + 'L56 ' + (ky - 6) + 'L56 ' + (ky + 5) + 'Z', fill: warn, 'fill-opacity': 0.10, stroke: warn, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
  if (C) {
    D.t(66, ky + 4, 'its course: somewhere in this quarter. The wind has ' + (C.left ? 'backed' : 'veered') + ', so you are on the ' +
        (C.left ? 'left' : 'right'), D.dim, { 'font-size': 11, 'data-part': 'key-course' });
    D.t(66, ky + 18, 'of its track; the glass is ' + (C.closing ? 'falling, so it is closing' : 'rising, so it is opening'), D.dim, { 'font-size': 11 });
    D.t(66, ky + 38, C.closing ? 'If it holds its course, it passes to your ' + WX.pt8(C.cpa) + '.' : 'It is drawing away.', D.text,
        { 'font-size': 12, 'font-weight': 600, 'data-part': 'key-pass' });
  } else {
    D.t(66, ky + 4, 'its course cannot be told from this log yet: that takes a wind that has', D.dim, { 'font-size': 11, 'data-part': 'key-course' });
    D.t(66, ky + 18, 'shifted more than 10 degrees and a glass that is falling or rising', D.dim, { 'font-size': 11 });
  }
  D.svg.setAttribute('viewBox', '0 0 520 ' + Math.ceil(ky + (C ? 54 : 34)));
  host.appendChild(D.wrap);
}

/* =====================================================================
   THE SEA AGAINST THE WIND (W09; weather 1.0.7).  Larry's rulings of
   17 November 2026:
     AOU  the curve is a public source's (the Beaufort scale's probable
          wave height, the Met Office's table), and the score's rule for
          turning a wind into a sea state follows it
     AOZ  when the wind is in the top share of the step it is on, the
          next step is marked as close; the share can be set, 25% unless
          set, measured in knots, upward only
     APC  the sea state is scored (score.js)
     APF  the fully developed limit is drawn as a dashed ceiling, the gap
          to the scale shaded

   Everything drawn comes from WX.sea (wx.js), which the words beside the
   figure are written from too, so the figure and the words cannot
   disagree: the wind, the height and state the scale gives it, the step's
   two ends, the state it is close to, the fully developed height, and the
   sea state and swell logged with that wind.

   What marks what, said by FORM as well as colour because the night
   palette is all reds: the scale is the one solid curve with a dot at
   each force's mean wind; the limit is dashed; the expected state has a
   solid box round its band and the close one a dashed box; your wind is
   a dashed upright; your sea is a thick bar over the band you logged;
   your swell is a hollow diamond, on its own because this wind did not
   raise it.

   Sources: the Met Office, "Beaufort wind force scale" (probable wave
   heights, "well-developed wind waves of the open sea"); NOAA NCEI's
   table of WMO code 3700 (the sea states); Stewart, Introduction to
   Physical Oceanography, 16.4 (Pierson and Moskowitz, 0.22 U^2/g).
   docs/SOURCES.md, Weather.

   Colours are read from the page when it draws, and drawWhat redraws it
   on a mode change.
   ===================================================================== */
function seaBlock(S) {
  var wrap = el('div', 'seablock');
  wrap.id = 'what-sea';
  var fig = el('div'); fig.id = 'sea-fig';
  wrap.appendChild(fig);
  seaFigure(fig, S);
  /*  the share of a step that counts as close: five percent a press,
      0 (off) to 50, remembered  */
  var row = el('div', 'closerow');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'How near the next sea state counts as close');
  row.appendChild(el('span', 'lab', 'Close to the next state: the top'));
  var dn = el('button', 'btn step', '\u2212'), val = el('span', 'val', S.pct + '%'), up = el('button', 'btn step', '+');
  dn.id = 'sea-close-down'; up.id = 'sea-close-up'; val.id = 'sea-close-val';
  dn.setAttribute('aria-label', 'A smaller share'); up.setAttribute('aria-label', 'A larger share');
  dn.disabled = S.pct <= 0; up.disabled = S.pct >= 50;
  dn.addEventListener('click', function () { lsSet('sea-close', String(Math.max(0, S.pct - 5))); drawWhat(); });
  up.addEventListener('click', function () { lsSet('sea-close', String(Math.min(50, S.pct + 5))); drawWhat(); });
  row.appendChild(dn); row.appendChild(val); row.appendChild(up);
  row.appendChild(el('span', 'lab', S.pct > 0 ? 'of a step' : 'of a step (not marked)'));
  wrap.appendChild(row);
  return wrap;
}
function seaFigure(host, S) {
  var NONE = WX.NONE, has = WX.has;
  var name = WX.seaName, f1 = function (x) { return WX.cfixed(x, 1); };
  var D = demoSvg('seafig', 660, 420, 'The sea against your wind. At ' + WX.kts(S.w) + ' knots the Beaufort scale ' +
    'expects about ' + f1(S.h) + ' metres, a ' + name(S.s) + ' sea' +
    (S.next ? ', close to ' + name(S.next) : '') +
    (has(S.logged) ? '. You logged a ' + name(S.logged) + ' sea' : '') +
    (has(S.swh) ? '. Your swell is ' + f1(S.swh) + ' metres' : '') +
    (S.showFull ? '. Fully developed, this wind could raise about ' + f1(S.full) + ' metres.' : '.'));
  var cs = getComputedStyle(document.documentElement);
  var tok = function (k) { return cs.getPropertyValue(k).trim() || '#6fb3d9'; };
  var ground = tok('--ground'), panel = tok('--panel'), att = tok('--att');
  var x0 = 50, x1 = 536, top = 44, bot = 300, i;
  var TOPS = WX.SEA_TOP;                 /* TOPS[s]: the top of state s, metres; 9 has none */

  /*  the frame: some knots past your wind and never less than 20, tall
      enough for the scale at its right-hand edge, your sea, your swell
      and the limit at your wind.  It grows with the wind, so a light
      air's ripples are not drawn in the bottom twentieth of a gale's
      frame.  */
  var XM = Math.max(20, Math.min(80, 10 * Math.ceil((S.w + 6) / 10)));
  var need = WX.seaHt(XM);
  if (S.showFull) need = Math.max(need, S.full);
  if (has(S.swh)) need = Math.max(need, S.swh);
  if (has(S.logged)) need = Math.max(need, S.logged >= 9 ? 15 : TOPS[S.logged]);
  var ystep = need <= 5.5 ? 1 : need <= 13.5 ? 2 : 5;
  var YM = Math.max(2, ystep * Math.ceil((need + 0.3) / ystep));
  var X = function (k) { return x0 + (x1 - x0) * k / XM; };
  var Y = function (m) { return bot - (bot - top) * Math.min(m, YM) / YM; };
  var set = function (o, a) { for (var k in a) o.setAttribute(k, a[k]); return o; };
  set(D.svg, { 'data-xm': XM, 'data-ym': YM, 'data-x0': x0, 'data-x1': x1, 'data-top': top, 'data-bot': bot });
  var halo = { stroke: ground, 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };
  var lab = function (x, y, s, fill, o) {
    var a = {}, k; for (k in halo) a[k] = halo[k]; for (k in (o || {})) a[k] = o[k];
    D.t(x, y, s, fill, a);
  };
  var bandLo = function (s) { return s <= 0 ? 0 : TOPS[s - 1]; };
  var bandHi = function (s) { return s >= 9 ? YM : Math.min(TOPS[s], YM); };

  D.t(22, 24, 'The sea against your wind', D.text, { 'font-weight': 600 });
  D.t(x1, 24, 'from your latest observation', D.dim, { 'font-size': 11, 'text-anchor': 'end' });
  D.t(22, top - 8, 'm', D.dim, { 'font-size': 11 });

  /*  the sea states, as bands, named in the margin; the expected state's
      name is the bold one and the close state's the lighter one  */
  for (i = 1; i <= 9; i++) {
    if (bandLo(i) >= YM) break;
    var yt = Y(bandHi(i)), yb = Y(bandLo(i));
    D.e('rect', { x: x0, y: yt, width: x1 - x0, height: yb - yt, fill: i % 2 ? panel : ground,
                  'data-part': 'band', 'data-state': i });
    if (yb - yt >= 13) {
      var on = i === S.s, near = S.next && i === S.next;
      D.t(x1 + 8, (yt + yb) / 2 + 4, i + '  ' + name(i), on || near ? D.acc : D.dim,
          { 'font-size': 12, 'font-weight': on ? 700 : 400, 'data-part': 'state-label', 'data-state': i });
    }
  }
  D.t(x1 + 8, top - 8, 'sea state', D.dim, { 'font-size': 11, 'font-weight': 600 });
  for (var m = 0; m <= YM + 0.001; m += ystep) {
    D.e('line', { x1: x0 - 4, y1: Y(m), x2: x0, y2: Y(m), stroke: D.dim });
    D.t(x0 - 8, Y(m) + 4, String(m), D.dim, { 'font-size': 12, 'text-anchor': 'end' });
  }
  D.e('rect', { x: x0, y: top, width: x1 - x0, height: bot - top, fill: 'none', stroke: D.line });

  /*  the wind: knots, and the Beaufort forces by their limits  */
  var FL = [[1, 3], [4, 6], [7, 10], [11, 16], [17, 21], [22, 27], [28, 33], [34, 40], [41, 47], [48, 55], [56, 63], [64, 80]];
  FL.forEach(function (b, n) {
    var xa = X(b[0] - 0.5), xb = X(Math.min(b[1] + 0.5, XM));
    if (b[0] - 0.5 > XM) return;
    D.e('line', { x1: xa, y1: bot, x2: xa, y2: bot + 5, stroke: D.dim });
    if (xb - xa >= 24) D.t((xa + xb) / 2, bot + 17, 'F' + (n + 1), D.dim,
                           { 'font-size': 11, 'text-anchor': 'middle', 'data-part': 'force-label' });
  });
  for (var k = 0; k <= XM; k += 10)
    D.t(X(k), bot + 33, String(k), D.dim, { 'font-size': 12, 'text-anchor': k === 0 ? 'start' : 'middle' });
  D.t((x0 + x1) / 2, bot + 49, 'wind, knots, and its Beaufort force', D.dim, { 'font-size': 11, 'text-anchor': 'middle' });

  /*  the expected state's band, boxed; and the one it is close to, dashed  */
  if (S.s >= 1 && bandLo(S.s) < YM)
    D.e('rect', { x: x0 + 1.5, y: Y(bandHi(S.s)), width: x1 - x0 - 3, height: Y(bandLo(S.s)) - Y(bandHi(S.s)),
                  fill: D.acc, 'fill-opacity': 0.10, stroke: D.acc, 'stroke-width': 2.5,
                  'data-part': 'band-on', 'data-state': S.s });
  if (S.next && bandLo(S.next) < YM)
    D.e('rect', { x: x0 + 1.5, y: Y(bandHi(S.next)), width: x1 - x0 - 3, height: Y(bandLo(S.next)) - Y(bandHi(S.next)),
                  fill: 'none', stroke: D.acc, 'stroke-width': 2, 'stroke-dasharray': '7 5',
                  'data-part': 'band-close', 'data-state': S.next });

  /*  the limit: from 15 knots, where it is over the scale for good; the
      gap between the two shaded  */
  var scaleAt = [], fullAt = [], kk;
  for (kk = 15; kk <= XM + 0.001; kk += 0.5) {
    var fh = WX.seaFull(kk);
    scaleAt.push(X(kk).toFixed(1) + ',' + Y(WX.seaHt(kk)).toFixed(1));
    if (fh > YM) {          /* the limit leaves the frame: end it on the frame's top edge */
      var ke = Math.sqrt(YM * 9.80665 / 0.22) / 0.514444;
      fullAt.push(X(ke).toFixed(1) + ',' + Y(YM).toFixed(1));
      break;
    }
    fullAt.push(X(kk).toFixed(1) + ',' + Y(fh).toFixed(1));
  }
  /*  the scale's side of the gap runs on to the right-hand edge, under
      the frame's top where the limit has left it  */
  var gapPts = fullAt.slice();
  if (WX.seaFull(XM) > YM) gapPts.push(X(XM).toFixed(1) + ',' + Y(YM).toFixed(1));
  var back = [];
  for (kk = XM; kk >= 15 - 0.001; kk -= 0.5) back.push(X(kk).toFixed(1) + ',' + Y(WX.seaHt(kk)).toFixed(1));
  D.e('polygon', { points: gapPts.concat(back).join(' '), fill: att, 'fill-opacity': 0.10, 'data-part': 'gap' });
  D.e('polyline', { points: fullAt.join(' '), fill: 'none', stroke: att, 'stroke-width': 2,
                    'stroke-dasharray': '8 5', 'data-part': 'full' });

  /*  the scale: straight lines through each force's mean wind and height  */
  var pts = [];
  for (i = 0; i < WX.SEA_K.length && WX.SEA_K[i] <= XM; i++) pts.push(X(WX.SEA_K[i]).toFixed(1) + ',' + Y(WX.SEA_H[i]).toFixed(1));
  if (WX.SEA_K[i - 1] < XM) pts.push(X(XM).toFixed(1) + ',' + Y(WX.seaHt(XM)).toFixed(1));
  D.e('polyline', { points: pts.join(' '), fill: 'none', stroke: D.text, 'stroke-width': 2.5,
                    'stroke-linejoin': 'round', 'data-part': 'curve' });
  for (i = 1; i < WX.SEA_K.length - 1 && WX.SEA_K[i] <= XM; i++)
    D.e('circle', { cx: X(WX.SEA_K[i]), cy: Y(WX.SEA_H[i]), r: 3.2, fill: D.text, 'data-part': 'force',
                    'data-kt': WX.SEA_K[i], 'data-m': WX.SEA_H[i] });

  /*  your wind, and what you logged with it.  The labels go on the side
      of the wind's line with more room, and never closer than a line of
      type to each other.  */
  var xw = X(S.w), right = xw < x0 + 0.55 * (x1 - x0), pxk = (x1 - x0) / XM;
  var edges = [];
  if (S.s >= 1 && bandLo(S.s) < YM) edges.push(Y(bandLo(S.s)), Y(bandHi(S.s)));
  if (S.next && bandLo(S.next) < YM) edges.push(Y(bandHi(S.next)));
  /*  where a label goes: the roomier side of the wind's line, unless the
      scale's own line runs through the words there and not on the other
      side; and if it runs through them on both, lifted clear above it  */
  var place = function (s, ty) {
    var wpx = s.length * 6.9 + 6, canR = xw + 12 + wpx <= x1 - 2, canL = xw - 12 - wpx >= x0 + 2;
    var mTop = (bot - (ty - 11)) / (bot - top) * YM, mBot = (bot - (ty + 4)) / (bot - top) * YM;
    var hits = function (ka, kb) { return WX.seaHt(Math.min(XM, kb)) >= mBot && WX.seaHt(Math.max(0, ka)) <= mTop; };
    var hitR = hits(S.w + 12 / pxk, S.w + (12 + wpx) / pxk), hitL = hits(S.w - (12 + wpx) / pxk, S.w - 12 / pxk);
    var r = right;
    if (canR && canL) { if (r && hitR && !hitL) r = false; else if (!r && hitL && !hitR) r = true; }
    else r = canR || !canL;
    if (r ? hitR : hitL) {
      var up = Y(WX.seaHt(Math.min(XM, r ? S.w + (12 + wpx) / pxk : S.w - 12 / pxk))) - 8;
      if (up >= top + 34 && ty - up <= 48) ty = up;
    }
    /*  and never struck through by an edge of the two boxes  */
    edges.forEach(function (ey) {
      if (ey > ty - 12 && ey < ty + 5) {
        var upTo = ey - 6, downTo = ey + 14;
        ty = (upTo >= top + 34 && (ty - upTo <= downTo - ty || downTo > bot - 4)) ? upTo : downTo;
      }
    });
    return { x: r ? xw + 12 : xw - 12, anc: r ? 'start' : 'end', y: ty, r: r };
  };
  D.e('line', { x1: xw, y1: top, x2: xw, y2: bot, stroke: D.acc, 'stroke-width': 1.5, 'stroke-dasharray': '5 4',
                'data-part': 'wind', 'data-kt': S.w });
  var wl = 'your wind, ' + WX.kts(S.w) + ' kt', wp = place(wl, top + 15);
  lab(wp.x, top + 15, wl, D.acc,
      { 'font-size': 12, 'font-weight': 600, 'text-anchor': wp.anc, 'data-part': 'wind-label' });
  var ySea = null, ySw = null;
  if (has(S.logged)) {
    var la = Y(bandLo(S.logged)), lb = Y(bandHi(S.logged));
    if (la - lb < 6) { la += 3; lb -= 3; }            /* a glassy or rippled sea is still a mark */
    D.e('line', { x1: xw, y1: la, x2: xw, y2: lb, stroke: D.acc, 'stroke-width': 9, 'stroke-linecap': 'round',
                  'data-part': 'logged', 'data-state': S.logged });
    ySea = (la + lb) / 2;
  }
  if (has(S.swh)) ySw = Y(S.swh);
  /*  the scale's own answer at your wind, over the bar so it is not hidden  */
  D.e('circle', { cx: xw, cy: Y(S.h), r: 5.5, fill: ground, stroke: D.text, 'stroke-width': 2.5,
                  'data-part': 'expected', 'data-kt': S.w, 'data-m': S.h });
  if (ySw !== null)
    D.e('path', { d: 'M' + xw + ' ' + (ySw - 8) + 'L' + (xw + 8) + ' ' + ySw + 'L' + xw + ' ' + (ySw + 8) + 'L' + (xw - 8) + ' ' + ySw + 'Z',
                  fill: ground, stroke: D.acc, 'stroke-width': 2.5, 'data-part': 'swell', 'data-m': S.swh });
  /*  label heights: kept inside the frame, clear of the wind's label, and
      a line of type apart  */
  var clampY = function (y) { return Math.max(top + 34, Math.min(bot - 6, y)); };
  var seaT = has(S.logged) ? 'your sea: ' + S.logged + ', ' + name(S.logged) : '';
  var swT = has(S.swh) ? 'your swell: ' + f1(S.swh) + ' m' + (has(S.swp) ? ', ' + Math.trunc(S.swp) + ' s' : '') : '';
  var pSea = ySea === null ? null : place(seaT, clampY(ySea + 4)), pSw = ySw === null ? null : place(swT, clampY(ySw + 4));
  if (pSea && pSw && pSea.r === pSw.r && Math.abs(pSea.y - pSw.y) < 16) {
    if (ySw <= ySea) { pSw.y = pSea.y - 16; if (pSw.y < top + 34) { pSw.y = top + 34; pSea.y = pSw.y + 16; } }
    else { pSw.y = pSea.y + 16; if (pSw.y > bot - 6) { pSw.y = bot - 6; pSea.y = pSw.y - 16; } }
  }
  if (pSea)
    lab(pSea.x, pSea.y, seaT, D.acc, { 'font-size': 12, 'font-weight': 600, 'text-anchor': pSea.anc, 'data-part': 'logged-label' });
  if (pSw)
    lab(pSw.x, pSw.y, swT, D.acc, { 'font-size': 12, 'font-weight': 600, 'text-anchor': pSw.anc, 'data-part': 'swell-label' });

  /*  the key  */
  var ky = bot + 68;
  D.e('line', { x1: x0, y1: ky, x2: x0 + 28, y2: ky, stroke: D.text, 'stroke-width': 2.5 });
  D.e('circle', { cx: x0 + 14, cy: ky, r: 3.2, fill: D.text });
  D.t(x0 + 36, ky + 4, 'the Beaufort scale: probable wave height, for a well-developed sea', D.dim, { 'font-size': 11 });
  D.e('line', { x1: x0, y1: ky + 17, x2: x0 + 28, y2: ky + 17, stroke: att, 'stroke-width': 2, 'stroke-dasharray': '8 5' });
  D.t(x0 + 36, ky + 21, 'fully developed: the limit for a wind, given days and open ocean', D.dim, { 'font-size': 11 });
  D.e('rect', { x: x0 + 1, y: ky + 28, width: 26, height: 12, fill: D.acc, 'fill-opacity': 0.10, stroke: D.acc, 'stroke-width': 2 });
  D.t(x0 + 36, ky + 38, 'expected at your wind', D.dim, { 'font-size': 11 });
  D.e('rect', { x: x0 + 181, y: ky + 28, width: 26, height: 12, fill: 'none', stroke: D.acc, 'stroke-width': 2, 'stroke-dasharray': '7 5' });
  D.t(x0 + 216, ky + 38, S.pct > 0 ? 'close: the top ' + S.pct + '% of a step, in knots' : 'close: not marked', D.dim,
      { 'font-size': 11, 'data-part': 'close-note' });
  host.appendChild(D.wrap);
}

/* =====================================================================
   THE GLASS: the barograph (W04; weather 1.0.5).  Larry's rulings of
   17 November 2026: AOI, the readings are the one bold trace and the
   daily tide alone is drawn behind it as a wave from the first reading,
   so a trace that follows the wave is only the tide and one that leaves
   it is weather; AOQ, each stretch of the trace takes its tendency's
   colour AND weight, and a strip beneath says the same in words, because
   the night palette is all reds and colour alone would not carry it.

   Everything drawn comes from WX.glass (the readings, the change between
   each pair with the tide allowed for, the tendency word, the tide's size)
   and WX.runs, which the terminal's table is printed from too, so the
   figure and the words cannot disagree.  The tendency key is drawn AT ITS
   OWN SLOPES on this figure's scale: the line for "falling" falls 1.5 hPa
   in 3 hours as measured on the axes beside it.

   The tide: ref + amp * cos(2 pi (solar - 10) / 12), solar the local sun
   time from the longitude, amp = 1.4 cos^3(latitude) hPa (wx.js tide()),
   ref chosen so the wave passes through the first reading.  Without a
   longitude or a latitude it is not drawn, and the figure says which.
   Sources for the tide are in wx.js and docs/SOURCES.md.

   Colours are read from the page when it draws (the warning by both its
   names, --warn then --bad), and drawWhat redraws it on a mode change.
   ===================================================================== */
var GLASS_STY = { 'steady': ['--accent', 2.2, 'st.'], 'rising': ['--ok', 3, 'rise'],
                  'falling': ['--att', 4, 'fall'], 'falling fast': ['--warn', 6, 'fast'] };
function glassFigure(host, W, G, lon) {
  var n = G.n, t0 = G.m[0], t1 = G.m[n - 1], spanH = (t1 - t0) / 60;
  var D = demoSvg('glassfig', 660, 372, 'The barograph: ' + n + ' pressure readings over ' +
    Math.round(spanH) + ' hours, ending at ' + WX.cfixed(W[G.at[n - 1]].p, 1) + ' hectopascals.');
  var cs = getComputedStyle(document.documentElement);
  var tok = function (k) {
    if (k === '--warn') return cs.getPropertyValue('--warn').trim() || cs.getPropertyValue('--bad').trim() || '#e23a2c';
    return cs.getPropertyValue(k).trim() || '#6fb3d9';
  };
  var ground = tok('--ground');
  var x0 = 62, x1 = 630, top = 44, bot = 214;
  /*  the frame: at least 10 hPa tall, so a quiet day's ripple is not blown
      up into something alarming, and on a grid of round numbers  */
  var first = W[G.at[0]], PI = 3.14159265, i;
  var lo = Infinity, hi = -Infinity;
  for (i = 0; i < n; i++) { lo = Math.min(lo, W[G.at[i]].p); hi = Math.max(hi, W[G.at[i]].p); }
  var solar = function (m) { var h = (m % 1440) / 60 + (parseFloat(lon) || 0) / 15.0;
    while (h < 0) h += 24; while (h >= 24) h -= 24; return h; };
  var tideAt = function (m) { return G.amp * Math.cos(2 * PI * (solar(m) - 10.0) / 12.0); };
  var ref = G.tide ? first.p - tideAt(t0) : 0;
  if (G.tide) { lo = Math.min(lo, ref - G.amp); hi = Math.max(hi, ref + G.amp); }
  var span = Math.max(10, hi - lo + 2), mid = (lo + hi) / 2;
  var step = span <= 14 ? 2 : span <= 28 ? 4 : span <= 60 ? 10 : 20;
  var ymin = step * Math.floor((mid - span / 2) / step), ymax = step * Math.ceil((mid + span / 2) / step);
  var X = function (m) { return x0 + (m - t0) / (t1 - t0) * (x1 - x0); };
  var Y = function (p) { return bot - (p - ymin) / (ymax - ymin) * (bot - top); };
  D.svg.setAttribute('data-ymin', ymin); D.svg.setAttribute('data-ymax', ymax);
  D.svg.setAttribute('data-t0', t0); D.svg.setAttribute('data-t1', t1);

  D.t(22, 22, 'The glass, last ' + G.hours + ' hours', D.text, { 'font-weight': 600 });
  D.t(x1, 22, 'hours are UTC, as the log is kept', D.dim, { 'font-size': 11, 'text-anchor': 'end' });
  D.t(22, top - 8, 'hPa', D.dim, { 'font-size': 11 });
  for (var p = ymin; p <= ymax + 0.001; p += step) {
    D.e('line', { x1: x0, y1: Y(p), x2: x1, y2: Y(p), stroke: D.line, 'stroke-width': 1 });
    D.t(x0 - 8, Y(p) + 4, String(p), D.dim, { 'font-size': 12, 'text-anchor': 'end' });
  }
  /*  the hours, UTC as the log is kept; a day's name under each midnight  */
  var hstep = spanH <= 12 ? 3 : 6, DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], named = false;
  var dom = function (m) {            /* the day of the month at minute m, from the civil date */
    var j = Math.floor(m / 1440) + 32044, g = Math.floor(j / 146097), dg = j % 146097;
    var c = Math.floor((Math.floor(dg / 36524) + 1) * 3 / 4), dc = dg - c * 36524;
    var b = Math.floor(dc / 1461), db = dc % 1461, a = Math.floor((Math.floor(db / 365) + 1) * 3 / 4), da = db - a * 365;
    var mm = Math.floor((da * 5 + 308) / 153) - 2, d = da - Math.floor((mm + 4) * 153 / 5) + 122;
    return d + 1;
  };
  for (var m = Math.ceil(t0 / (hstep * 60)) * hstep * 60; m <= t1; m += hstep * 60) {
    var hh = Math.round((m % 1440) / 60);
    D.e('line', { x1: X(m), y1: bot, x2: X(m), y2: bot + 5, stroke: D.dim });
    D.t(X(m), bot + 19, (hh < 10 ? '0' : '') + hh, D.dim, { 'font-size': 11, 'text-anchor': 'middle' });
    if (hh === 0) {
      D.e('line', { x1: X(m), y1: top, x2: X(m), y2: bot, stroke: D.line, 'stroke-dasharray': '2 3' });
      D.t(X(m), bot + 33, DAYS[(Math.floor(m / 1440) + 1) % 7] + ' ' + dom(m), D.dim,
          { 'font-size': 11, 'text-anchor': 'middle', 'font-weight': 600, 'data-part': 'day' });
      named = true;
    }
  }
  /*  a short log may cross no midnight: then the date goes at the left  */
  if (!named) D.t(x0, bot + 33, WX.day(first.ts), D.dim, { 'font-size': 11, 'font-weight': 600, 'data-part': 'day' });

  /*  behind everything: the daily tide alone, from the first reading  */
  if (G.tide) {
    D.e('rect', { x: x0, y: Y(ref + G.amp), width: x1 - x0, height: Y(ref - G.amp) - Y(ref + G.amp),
                  fill: D.dim, 'fill-opacity': 0.10, 'data-part': 'tide-band' });
    var pts = [];
    for (var q = t0; q <= t1; q += 15) pts.push(X(q).toFixed(1) + ',' + Y(ref + tideAt(q)).toFixed(1));
    pts.push(X(t1).toFixed(1) + ',' + Y(ref + tideAt(t1)).toFixed(1));
    D.e('polyline', { points: pts.join(' '), fill: 'none', stroke: D.dim, 'stroke-width': 2,
                      'stroke-opacity': 0.75, 'data-part': 'tide-wave', 'data-ref': ref, 'data-amp': G.amp });
  }
  /*  the trace: each stretch in its tendency's colour and weight  */
  for (i = 1; i < n; i++) {
    var a = W[G.at[i - 1]], z = W[G.at[i]], st = GLASS_STY[G.b[i]];
    D.e('line', { x1: X(G.m[i - 1]), y1: Y(a.p), x2: X(G.m[i]), y2: Y(z.p), stroke: tok(st[0]),
                  'stroke-width': st[1], 'stroke-linecap': 'round', 'data-part': 'seg', 'data-band': G.b[i] });
  }
  for (i = 0; i < n; i++)
    D.e('circle', { cx: X(G.m[i]), cy: Y(W[G.at[i]].p), r: 3.2, fill: D.text, 'data-part': 'pt',
                    'data-ts': W[G.at[i]].ts, 'data-p': W[G.at[i]].p });
  var last = W[G.at[n - 1]], ly = Y(last.p);
  /*  the last reading, named: above it when the trace came up to it, beside
      it when the trace came down, so the label never sits on the line  */
  var fell = last.p < W[G.at[n - 2]].p;
  D.t(X(t1) - (fell ? 14 : 6), fell ? ly + 5 : (ly - 12 > top + 4 ? ly - 12 : ly + 22),
      'now ' + WX.cfixed(last.p, 1), D.text,
      { 'font-size': 12, 'text-anchor': 'end', 'font-weight': 600, 'data-part': 'now' });

  /*  the strip: the same tendencies in words, neighbours of a kind merged  */
  var sy = bot + 52;
  D.t(22, sy + 15, 'trend', D.dim, { 'font-size': 11 });
  WX.runs(G).forEach(function (r) {
    var xa = X(G.m[r.from]), xb = X(G.m[r.to]), st = GLASS_STY[r.band], w = xb - xa, calm = r.band === 'steady';
    D.e('rect', { x: xa + 1, y: sy, width: Math.max(1, w - 2), height: 22, rx: 3, fill: tok(st[0]),
                  'fill-opacity': calm ? 0.18 : 0.9, 'data-part': 'run', 'data-band': r.band,
                  'data-from': W[G.at[r.from]].ts, 'data-to': W[G.at[r.to]].ts });
    var full = w > r.band.length * 6.4 + 12, word = full ? r.band : w > 30 ? st[2] : '';
    if (word) D.t((xa + xb) / 2, sy + 15, word, calm ? D.text : ground,
                  { 'font-size': full ? 11 : 10, 'text-anchor': 'middle', 'font-weight': 600 });
  });

  /*  the key, each line drawn at its own slope for three hours  */
  var ky = sy + 44, kx = x0, dx = Math.max(24, Math.min(60, X(t0 + 180) - X(t0)));
  var perPx = (bot - top) / (ymax - ymin), hrs = dx / ((x1 - x0) / (spanH || 1));
  [['steady', 0, 'steady'], ['falling', -1.5, 'falling, 1.5+'], ['falling fast', -3, 'falling fast, 3+'],
   ['rising', 1.5, 'rising, 1.5+']].forEach(function (k) {
    var st = GLASS_STY[k[0]], dy = -(k[1] * hrs / 3) * perPx;
    D.e('line', { x1: kx, y1: ky - dy / 2, x2: kx + dx, y2: ky + dy / 2, stroke: tok(st[0]),
                  'stroke-width': st[1], 'stroke-linecap': 'round', 'data-part': 'key', 'data-band': k[0],
                  'data-hours': hrs });
    D.t(kx + dx + 8, ky + 4, k[2], D.dim, { 'font-size': 11 });
    kx += dx + 24 + k[2].length * 5.8;
  });
  D.t(x0, ky + 26, 'hPa in 3 hours' + (G.tide ? ', with the daily tide allowed for' : '') +
      '; each key line is drawn at its own slope', D.dim, { 'font-size': 11 });
  if (G.tide) {
    D.e('line', { x1: x0, y1: ky + 44, x2: x0 + 28, y2: ky + 44, stroke: D.dim, 'stroke-width': 2, 'stroke-opacity': 0.75 });
    D.t(x0 + 36, ky + 48, 'the daily tide alone, from your first reading: ' + WX.cfixed(G.amp, 1) +
        ' hPa each way', D.dim, { 'font-size': 11, 'data-part': 'tide-note' });
  } else {
    D.t(x0, ky + 48, 'The daily tide is not drawn: ' +
        ((lon === '' || lon === undefined || lon === null) ? 'no longitude is set (the home screen).'
                                                            : 'there is no latitude in the log yet.'),
        D.dim, { 'font-size': 11, 'data-part': 'tide-note' });
  }
  host.appendChild(D.wrap);
}

/* =====================================================================
   The forecast -- yours first
   ===================================================================== */
function startForecast() {
  $('fc-compare').hidden = true;
  $('fc-state').textContent = '';
  updateValid();
  if (OBS.length < 1) {
    $('fc-state').textContent = 'There is no observation in the log yet, so there is ' +
      'nothing for the rules or persistence to work from. Log one in deck-log first.';
  }
}
function updateValid() {
  var h = +$('i-hours').value;
  var now = LOG.stamp();
  $('i-valid').value = SCORE.validTime(now, h);
}

function commitForecast() {
  var hours = +$('i-hours').value;
  var valid = $('i-valid').value;
  var fields = [['for', valid], ['by', 'you']];
  var any = false;
  [['wdir', 'f-wdir'], ['wspd', 'f-wspd'], ['mslp', 'f-mslp'], ['sea', 'f-sea']]
    .forEach(function (p) {
      var v = $(p[1]).value.trim();
      if (v !== '') { fields.push([p[0], v]); any = true; }
    });
  if (!any) {
    $('fc-state').textContent = 'Put at least one number in. A forecast of nothing ' +
      'cannot be scored, and an unscored forecast teaches nothing.';
    return;
  }
  var mine = LOG.make(valid === '' ? LOG.stamp() : LOG.stamp(), 'fc', fields);
  if (!LOG.parse(mine)) {
    $('fc-state').textContent = 'Refused to write that record: ' + LOG.err();
    return;
  }

  //  YOURS GOES IN FIRST, on its own write.  Only once it is in the log
  //  are the machine forecasts computed, written and shown.
  STORE.append(mine).then(function () {
    return reload();
  }).then(function () {
    var n = OBS.length - 1;
    var k = -1, i;
    for (i = n - 1; i >= 0; i--) if (WX.has(OBS[i].p) && WX.has(OBS[n].p)) break;
    k = i;
    var lon = lonVal();
    var theirs = [
      { by: 'rules', f: SCORE.rules(OBS, n, k, hours, lon) },
      { by: 'persist', f: SCORE.persist(OBS, n) }
    ];
    var lines = theirs.map(function (t) {
      var ff = [['for', valid], ['by', t.by]];
      if (WX.has(t.f.wdir)) ff.push(['wdir', WX.cfixed(t.f.wdir + 0.5, 0)]);
      if (WX.has(t.f.wspd)) ff.push(['wspd', WX.cfixed(t.f.wspd, 0)]);
      if (WX.has(t.f.mslp)) ff.push(['mslp', WX.cfixed(t.f.mslp, 1)]);
      if (WX.has(t.f.sea)) ff.push(['sea', WX.cfixed(t.f.sea, 0)]);
      ff.push(['why', t.f.why === '' ? '-' : t.f.why]);
      return LOG.make(LOG.stamp(), 'fc', ff);
    });
    return STORE.append(lines).then(reload).then(function () { return { valid: valid }; });
  }).then(function (r) {
    showComparison(r.valid);
    $('fc-state').textContent = 'Yours is logged. Log the observation for ' + r.valid +
      ' in deck-log when it comes, then look at the score.';
  }).catch(function (e) {
    $('fc-state').textContent = 'Nothing was logged: ' + e.message;
  });
}

function showComparison(valid) {
  var rows = {};
  RECS.forEach(function (r) {
    if (r.type !== 'fc' || r.v['for'] !== valid) return;
    var by = r.v.by === 'user' ? 'you' : r.v.by;
    rows[by] = r.v;
  });
  var t = $('fc-table');
  t.textContent = '';
  var head = el('tr');
  ['', 'wind', 'knots', 'hPa', 'sea'].forEach(function (h) { head.appendChild(el('th', null, h)); });
  var thead = document.createElement('thead'); thead.appendChild(head); t.appendChild(thead);
  var tb = document.createElement('tbody');
  ['you', 'rules', 'persist'].forEach(function (by) {
    var v = rows[by];
    if (!v) return;
    var tr = el('tr', by);
    tr.appendChild(el('td', null, by));
    tr.appendChild(el('td', null, v.wdir === undefined ? '\u2014' : v.wdir));
    tr.appendChild(el('td', null, v.wspd === undefined ? '\u2014' : v.wspd));
    tr.appendChild(el('td', null, v.mslp === undefined ? '\u2014' : v.mslp));
    tr.appendChild(el('td', null, v.sea === undefined ? '\u2014' : v.sea));
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  var whys = [];
  ['rules', 'persist'].forEach(function (by) {
    if (rows[by] && rows[by].why && rows[by].why !== '-') whys.push(by + ': ' + rows[by].why);
  });
  $('fc-why').textContent = whys.join('    \u00b7    ');
  $('fc-compare').hidden = false;
}

/* =====================================================================
   The score
   ===================================================================== */
function drawScore() {
  var res = SCORE.verify(RECS, OBS);
  var box = $('score-out');
  box.textContent = '';
  $('score-term').textContent = SCORE.reportLines(res);
  if (res.n === 0) {
    box.appendChild(el('p', 'note',
      'No forecast has reached its valid time yet, or no observation has been ' +
      'logged near one. Make a forecast, then log the observation it was for, ' +
      'and this fills in.'));
    return;
  }
  var t = el('table', 'score');
  var head = el('tr');
  /*  the sea state has its column since weather 1.0.7 (Larry, APC): it was
      forecast by all three and scored for none  */
  ['', 'points', 'dir', 'spd', 'hPa', 'sea'].forEach(function (h) { head.appendChild(el('th', null, h)); });
  var thead = document.createElement('thead'); thead.appendChild(head); t.appendChild(thead);
  var tb = document.createElement('tbody');
  ['you', 'rules', 'persist'].forEach(function (by) {
    if (!(by in res.cnt)) return;
    var tr = el('tr', by);
    tr.appendChild(el('td', null, by));
    tr.appendChild(el('td', null, WX.cfixed(res.tot[by], 1)));
    ['wdir', 'wspd', 'mslp', 'sea'].forEach(function (f) {
      var kk = by + '\u001c' + f;
      tr.appendChild(el('td', null, kk in res.fcnt ? WX.cfixed(res.ftot[kk] / res.fcnt[kk], 1) : '\u2014'));
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  box.appendChild(t);
  box.appendChild(el('p', 'note', res.n + ' forecast' + (res.n === 1 ? '' : 's') +
    ' verified against an observation.'));

  //  The app's own misses go on the record.  That is the whole point of
  //  scoring the rules as well as the user.
  if (('persist' in res.cnt) && ('rules' in res.cnt) &&
      res.tot.rules / res.cnt.rules > res.tot.persist / res.cnt.persist) {
    box.appendChild(el('p', 'warn',
      'The rules are not beating persistence. That is the honest result so far, ' +
      'and it is worth knowing.'));
  }
  if (('you' in res.cnt) && ('rules' in res.cnt) &&
      res.tot.you / res.cnt.you < res.tot.rules / res.cnt.rules) {
    box.appendChild(el('p', 'acc',
      'You are beating the rule set. Trust yourself over it here.'));
  }
}

/* =====================================================================
   The 500 mb chart
   ===================================================================== */
function drawChart() {
  var brg = $('c-brg').value.trim();
  var dist = $('c-dist').value.trim();
  var or = $('c-or').value.trim();
  var w5 = $('c-w5').value.trim();
  var north = $('c-hemi').value === '1';
  ['brg', 'dist', 'or', 'w5'].forEach(function (k) { lsSet('c-' + k, $('c-' + k).value); });
  lsSet('c-hemi', $('c-hemi').value);
  //  A 500 mb wind of zero knots divides by zero and the awk prints
  //  "inf to inf hours" for it.  Rather than reproduce that on a screen,
  //  say what is wrong with the input.
  $('chart-warn').textContent = (w5 !== '' && +w5 <= 0)
    ? 'A 500 mb wind of zero gives a system speed of nothing and a time to arrival of ' +
      'infinity. Read the isotachs again \u2014 the 564 line runs through a jet.'
    : '';
  var items = CHART.report(brg, dist, or === '' ? 0 : or, w5, north);
  drawReason($('chart-out'), items);
  $('chart-term').textContent = CHART.renderTerminal(items, dist !== '' && brg !== '');
}

/* =====================================================================
   The wind from the isobars (W07; weather 1.0.3; Larry, AKY and ALF).
   The reasoning is CHART.isoReport, a port of chart.awk held to it by
   weather-iso.js.  Above it, two drawings (ALF): the isobars at the
   spacing typed, with the wind aloft and on deck as arrows whose length
   is their speed (what is happening), and under them the scale as curves,
   wind against spacing, one curve per latitude, with the reading marked
   (the tool).  Drawn by isoPicture and isoCurves, which the gradient
   lesson reuses for its own copy of the scale.
   ===================================================================== */
/*  A LESSON'S LINK (weather 1.0.4; Larry, ALI).  A course lesson opens this
    screen with its example filled in and a way back:
        ?view=isobars&sp=100&lat=50&hemi=N&step=4&lesson=l3a-2025-1
    The contract is in docs/web/weather/README.md.  Only numbers reach the
    fields (anything else leaves the field empty), hemi is N or S, and the
    back link is built only from an exact lesson name, by the rule in
    ../shared/lesson.js that tides uses too, so nothing from the URL reaches
    an href otherwise.  */
var ISO_LESSON = null;
function isoFromQuery(search) {
  var q = new URLSearchParams(search || ''), out = { view: q.get('view') };
  var num = function (k) {
    var v = (q.get(k) || '').trim();
    return (v !== '' && isFinite(+v)) ? String(+v) : '';
  };
  out.sp = num('sp'); out.lat = num('lat'); out.step = num('step');
  var h = (q.get('hemi') || 'N').toUpperCase();
  out.north = h !== 'S';
  out.lesson = (typeof LESSON_NAMES !== 'undefined') ? LESSON_NAMES.href(q.get('lesson')) : null;
  return out;
}
function drawIsobars() {
  $('iso-lesson').hidden = !ISO_LESSON;
  if (ISO_LESSON) $('iso-lesson-a').setAttribute('href', ISO_LESSON);
  var sp = $('i-sp').value.trim(), lat = $('i-lat').value.trim();
  var step = $('i-step').value.trim(), north = $('i-hemi').value === '1';
  ['i-sp', 'i-lat', 'i-step'].forEach(function (k) { lsSet(k, $(k).value); });
  lsSet('i-hemi', $('i-hemi').value);
  var items = CHART.isoReport(sp, lat, step, north);
  drawReason($('iso-out'), items.filter(function (it) { return it.k !== 'tab'; }));
  $('iso-term').textContent = CHART.isoTerminal(items, items.wind !== undefined);
  var box = $('iso-figs');
  box.textContent = '';
  if (items.wind !== undefined) {
    isoPicture(box, +sp, +lat, step === '' ? 4 : +step, north, items.wind);
    isoCurves(box, +sp, +lat, step === '' ? 4 : +step, north, items.wind);
    box.hidden = false;
  } else box.hidden = true;
}
/* =====================================================================
   A REPORTED STORM (I20; weather 1.0.11; Larry, ATZ).  An official
   advisory typed in, moved on to now, and set beside your own wind.  The
   reasoning is CHART.stormReport, a port of st_report in chart.awk held to
   it character for character by weather-storm.js.  Above it, the picture
   of the mock Larry admitted: north up, the boat at the centre, the storm
   drawn as a low with its own wind (his rule of 18 November), where it was
   reported and where it is now, its track ahead with a dot every six
   hours, its 34-knot circle, the closest approach, and the band your own
   wind gives as a wedge from the boat.
   ===================================================================== */
var ST_IDS = ['s-age', 's-clat', 's-clon', 's-mdir', 's-mkn', 's-r34', 's-blat', 's-blon', 's-bcse', 's-bkn', 's-wind'];
function drawStorm() {
  var f = {}, v = {};
  ST_IDS.forEach(function (id) { v[id] = $(id).value.trim(); lsSet(id, $(id).value); });
  f.age = v['s-age']; f.clat = v['s-clat']; f.clon = v['s-clon']; f.mdir = v['s-mdir']; f.mkn = v['s-mkn'];
  f.r34 = v['s-r34']; f.blat = v['s-blat']; f.blon = v['s-blon']; f.bcse = v['s-bcse']; f.bkn = v['s-bkn']; f.wind = v['s-wind'];
  var items = CHART.stormReport(f);
  drawReason($('storm-out'), items);
  $('storm-term').textContent = CHART.stormTerminal(items);
  var box = $('storm-fig');
  box.textContent = '';
  if (items.geo) { stormPicture(box, items.geo); box.hidden = false; } else box.hidden = true;
}
function stormPicture(host, G) {
  var RAD = Math.PI / 180, W = 640, H = 600, cx = W / 2, cy = 300;
  var pts = [G.then, G.now, [G.now[0] + G.v[0] * 24, G.now[1] + G.v[1] * 24]];
  if (G.cpa) pts.push([G.u[0] * G.cpa.t, G.u[1] * G.cpa.t]);
  var reach = 60;
  pts.forEach(function (p) { reach = Math.max(reach, Math.hypot(p[0], p[1])); });
  if (G.r34) reach = Math.max(reach, Math.hypot(G.now[0], G.now[1]) + G.r34);
  var ring = reach <= 120 ? 25 : reach <= 300 ? 50 : reach <= 600 ? 100 : 200;
  var RMAX = ring * Math.ceil(reach / ring), K = 250 / RMAX;
  var X = function (e) { return cx + e * K; }, Y = function (n) { return cy - n * K; };
  var f1 = function (x) { return x.toFixed(1); };
  var D = demoSvg('stormfig', W, H, 'A reported storm, north up, the boat at the centre. The centre now bears ' +
    String(Math.round((G.brg % 360 + 360) % 360)).padStart(3, '0') + ', ' + Math.round(G.dist) + ' nautical miles' +
    (G.cpa ? '; if both hold on it comes within ' + Math.round(G.cpa.d) + ' miles in ' + Math.round(G.cpa.t) + ' hours.' : '.'));
  var cs = getComputedStyle(document.documentElement), tk = function (k) { return cs.getPropertyValue(k).trim(); };
  var warn = tk('--warn') || tk('--bad') || '#e23a2c', ground = tk('--ground') || '#07090b';
  D.svg.setAttribute('data-k', K); D.svg.setAttribute('data-cx', cx); D.svg.setAttribute('data-cy', cy);
  var arrow = function (x1, y1, x2, y2, col, w, op, attrs) {
    var o = { x1: f1(x1), y1: f1(y1), x2: f1(x2), y2: f1(y2), stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-opacity': op }, k;
    for (k in (attrs || {})) o[k] = attrs[k];
    D.e('line', o);
    var an = Math.atan2(y2 - y1, x2 - x1), h = w * 2.2 + 3;
    D.e('path', { d: 'M' + f1(x2) + ',' + f1(y2) + 'L' + f1(x2 - h * Math.cos(an - 0.45)) + ',' + f1(y2 - h * Math.sin(an - 0.45)) +
                     'L' + f1(x2 - h * Math.cos(an + 0.45)) + ',' + f1(y2 - h * Math.sin(an + 0.45)) + 'Z', fill: col, 'fill-opacity': op });
  };
  /*  range rings, and north  */
  for (var r = ring; r <= RMAX + 0.01; r += ring) {
    D.e('circle', { cx: cx, cy: cy, r: f1(r * K), fill: 'none', stroke: D.line, 'stroke-width': 1, 'data-part': 'ring', 'data-nm': r });
    D.t(cx + r * K * 0.707 + 3, cy - r * K * 0.707 - 3, r + ' nm', D.dim, { 'font-size': 10 });
  }
  [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (c) {
    D.t(cx + (RMAX * K + 16) * Math.sin(c[1] * RAD), cy - (RMAX * K + 16) * Math.cos(c[1] * RAD) + 4, c[0], D.dim,
        { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 12 });
  });
  /*  your own wind's band, as a wedge from the boat  */
  if (G.band) {
    var a0 = G.band[0] * RAD, a1 = G.band[1] * RAD, rw = RMAX * K;
    D.e('path', { d: 'M' + cx + ',' + cy + 'L' + f1(cx + rw * Math.sin(a0)) + ',' + f1(cy - rw * Math.cos(a0)) +
                     'A' + f1(rw) + ',' + f1(rw) + ' 0 0 1 ' + f1(cx + rw * Math.sin(a1)) + ',' + f1(cy - rw * Math.cos(a1)) + 'Z',
                  fill: D.acc, 'fill-opacity': 0.12, stroke: D.acc, 'stroke-width': 1.2, 'stroke-dasharray': '6 5',
                  'data-part': 'band', 'data-lo': ((G.band[0] % 360) + 360) % 360, 'data-hi': ((G.band[1] % 360) + 360) % 360 });
    var am = (G.band[0] + 12.5) * RAD;
    D.t(cx + rw * 0.72 * Math.sin(am), cy - rw * 0.72 * Math.cos(am) + 4, 'where your wind puts it', D.acc,
        { 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
    var wf = G.wind * RAD;
    arrow(cx + 60 * Math.sin(wf), cy - 60 * Math.cos(wf), cx + 16 * Math.sin(wf), cy - 16 * Math.cos(wf), D.acc, 3.5, 1,
          { 'data-part': 'wind', 'data-from': G.wind });
  }
  /*  the storm: its 34-knot circle, its track ahead, where it was reported  */
  var nx = X(G.now[0]), ny = Y(G.now[1]);
  if (G.r34) D.e('circle', { cx: f1(nx), cy: f1(ny), r: f1(G.r34 * K), fill: warn, 'fill-opacity': 0.08, stroke: warn,
                             'stroke-width': 1.2, 'stroke-dasharray': '2 4', 'data-part': 'r34', 'data-nm': G.r34 });
  if (G.v[0] || G.v[1]) {
    var ex = X(G.now[0] + G.v[0] * 24), ey = Y(G.now[1] + G.v[1] * 24);
    arrow(nx, ny, ex, ey, warn, 2.2, 0.9, { 'stroke-dasharray': '7 5', 'data-part': 'track', 'data-dir': G.mdir });
    [6, 12, 18].forEach(function (h) {
      var px = X(G.now[0] + G.v[0] * h), py = Y(G.now[1] + G.v[1] * h);
      D.e('circle', { cx: f1(px), cy: f1(py), r: 3, fill: warn });
      D.t(px + (px > cx ? -7 : 7), py + 4, '+' + h + 'h', warn, { 'font-size': 10, 'text-anchor': px > cx ? 'end' : 'start' });
    });
  }
  D.e('circle', { cx: f1(X(G.then[0])), cy: f1(Y(G.then[1])), r: 5, fill: ground, stroke: warn, 'stroke-width': 2, 'data-part': 'reported' });
  D.t(X(G.then[0]) + (X(G.then[0]) > cx ? -9 : 9), Y(G.then[1]) + 14, 'reported ' + G.age + ' h ago', warn,
      { 'font-size': 10.5, 'text-anchor': X(G.then[0]) > cx ? 'end' : 'start' });
  /*  the low itself, with its own wind round it: anticlockwise, turned in  */
  D.e('circle', { cx: f1(nx), cy: f1(ny), r: 26, fill: ground, 'fill-opacity': 0.8 });
  for (var be = 0; be < 360; be += 45) {
    var px2 = nx + 20 * Math.sin(be * RAD), py2 = ny - 20 * Math.cos(be * RAD), hd = (be - 105) * RAD;
    arrow(px2 - 5 * Math.sin(hd), py2 + 5 * Math.cos(hd), px2 + 5 * Math.sin(hd), py2 - 5 * Math.cos(hd), warn, 1.6, 1, { 'data-part': 'spin', 'data-b': be });
  }
  D.e('circle', { cx: f1(nx), cy: f1(ny), r: 10.5, fill: ground, stroke: warn, 'stroke-width': 2.5, 'data-part': 'low' });
  D.t(nx, ny + 4.5, 'L', warn, { 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle' });
  D.t(nx + (nx > cx ? -30 : 30), ny - 14, 'the centre now', warn, { 'font-size': 11, 'font-weight': 700, 'text-anchor': nx > cx ? 'end' : 'start' });
  /*  the boat, a hull on her course, her run, and the closest approach  */
  if (G.bkn > 0) {
    var ub = G.bcse * RAD;
    D.e('line', { x1: cx, y1: cy, x2: f1(cx + 70 * Math.sin(ub)), y2: f1(cy - 70 * Math.cos(ub)), stroke: D.text, 'stroke-width': 1.2, 'stroke-dasharray': '3 4' });
  }
  if (G.cpa) {
    var bx = X(G.u[0] * G.cpa.t), by = Y(G.u[1] * G.cpa.t);
    var sx = X(G.u[0] * G.cpa.t + G.cpa.rel[0]), sy = Y(G.u[1] * G.cpa.t + G.cpa.rel[1]);
    if (G.bkn > 0) D.e('line', { x1: cx, y1: cy, x2: f1(bx), y2: f1(by), stroke: D.text, 'stroke-width': 1, 'stroke-dasharray': '1 4' });
    D.e('line', { x1: f1(bx), y1: f1(by), x2: f1(sx), y2: f1(sy), stroke: D.text, 'stroke-width': 1.6, 'data-part': 'cpa', 'data-nm': G.cpa.d.toFixed(2) });
    D.e('circle', { cx: f1(sx), cy: f1(sy), r: 4, fill: warn });
    D.t(Math.min(bx, sx), Math.max(by, sy) + 22, 'closest: ' + Math.round(G.cpa.d) + ' nm in ' + Math.round(G.cpa.t) + ' h', D.text,
        { 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end', 'data-part': 'cpa-label' });
  }
  var hb = (G.bkn > 0 ? G.bcse : 0) * RAD, rot = function (x, y) { return [cx + x * Math.cos(hb) - y * Math.sin(hb), cy + x * Math.sin(hb) + y * Math.cos(hb)]; };
  var hp = [[0, -12], [5, -5], [5, 9], [-5, 9], [-5, -5]].map(function (p) { return rot(p[0], p[1]); });
  D.e('path', { d: 'M' + hp.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join('L') + 'Z', fill: D.text, stroke: ground, 'stroke-width': 1, 'data-part': 'boat' });
  D.t(16, H - 12, 'North up, the boat at the centre. Not a forecast: an advisory is hours old when it arrives, and a storm can turn.',
      D.dim, { 'font-size': 10.5 });
  host.appendChild(D.wrap);
}

/*  THE PICTURE: two isobars at the spacing typed, the wind aloft along them
    and the wind on deck turned toward the low.  The gap is drawn in
    proportion to the spacing (held between 26 and 230 px so a very close or
    very wide pair still fits), and the arrows in proportion to the speed,
    so closing the isobars visibly lengthens the arrows.  North: the low on
    the wind's left, above, the deck wind backed; south: the low below,
    veered.  */
function isoPicture(host, sp, lat, step, north, v) {
  /*  the box is as tall as the gap needs, so close isobars do not sit in a
      sea of empty space  */
  var gapPx = Math.max(26, Math.min(230, sp * 0.9));
  /*  and as tall as the deck arrow needs: in a gale between close isobars
      it rises (north) or falls (south) well past them, with its label  */
  var rise = Math.min(440, v * 6) * 2 / 3 * Math.sin(15 * Math.PI / 180);
  var m = Math.max(70, rise + 36 - gapPx / 2), H = gapPx + 2 * m + 10;
  var D = demoSvg('isodemo', 640, H,
    'Two isobars ' + sp + ' nautical miles apart. The wind aloft runs along them at ' +
    Math.round(v) + ' knots; on deck it is about two thirds of that, turned toward the low.');
  var cy = m + gapPx / 2, top = m, bot = m + gapPx;
  var yLow = north ? top : bot, yHigh = north ? bot : top;
  var hi = 1000 + step;
  [[yLow, 1000], [yHigh, hi]].forEach(function (r, i) {
    D.e('line', { x1: 40, y1: r[0], x2: 620, y2: r[0], stroke: D.dim, 'stroke-width': 1.4,
                  'stroke-dasharray': '2 4', 'data-part': i ? 'iso-high' : 'iso-low' });
    D.t(620, r[0] + (r[0] === top ? -6 : 16), r[1] + ' hPa', D.dim, { 'font-size': 11, 'text-anchor': 'end' });
  });
  D.t(620, north ? top - 24 : bot + 34, 'LOW', D.text, { 'font-weight': 700, 'text-anchor': 'end',
      'data-part': 'low' });
  D.e('line', { x1: 52, y1: top + 3, x2: 52, y2: bot - 3, stroke: D.dim });
  D.t(58, cy + 4, sp + ' nm', D.dim, { 'font-size': 12 });
  /* the arrows: 6 px a knot, held to 440 px so a gale still fits */
  var L = Math.min(440, v * 6), x0 = 130, y0 = cy + (north ? 14 : -14), s = north ? 1 : -1;
  D.e('line', { x1: x0, y1: y0, x2: x0 + L - 8, y2: y0, stroke: D.dim, 'stroke-width': 3,
                'data-part': 'aloft', 'data-len': L });
  D.head(x0 + L, y0, 0, D.dim);
  D.t(x0, y0 + (north ? 20 : -10), 'aloft ' + Math.round(v) + ' kn, along the isobars', D.dim, { 'font-size': 12 });
  var A = 15 * Math.PI / 180, Ls = L * 2 / 3;
  var ex = x0 + Ls * Math.cos(A), ey = y0 - s * Ls * Math.sin(A);
  D.e('line', { x1: x0, y1: y0, x2: ex - 7 * Math.cos(A), y2: ey + s * 7 * Math.sin(A), stroke: D.acc,
                'stroke-width': 3.5, 'data-part': 'deck', 'data-len': Ls });
  D.head(ex, ey, -s * A, D.acc);
  D.t(x0, ey + (north ? -14 : 24), 'on deck about ' + Math.round(v * 2 / 3) + ' kn, ' +
      (north ? 'backed' : 'veered') + ' toward the low', D.acc, { 'font-size': 12, 'font-weight': 600 });
  if (v * 6 > 440) D.t(620, H - 8, 'arrows shortened to fit', D.dim, { 'font-size': 11, 'text-anchor': 'end' });
  D.t(40, H - 8, Math.round(lat) + '\u00b0 ' + (north ? 'N' : 'S') + ', isobars ' + step + ' hPa apart',
      D.dim, { 'font-size': 11 });
  host.appendChild(D.wrap);
}
/*  the gradient lesson's copy of the scale: the same curves, with the
    lesson's own example marked (100 nm at 50 N, isobars 4 hPa apart)  */
function isoScaleDemo(host) { isoCurves(host, 100, 50, 4, true, CHART.isoWind(100, 50, 4)); }
/*  THE SCALE AS CURVES: wind aloft against spacing, one curve for each of
    30, 40, 50 and 60 degrees, and the reader's own latitude drawn bold if
    it is not one of them; the reading marked with a dot.  A reading off
    the scale is pinned to its edge and said so.  */
function isoCurves(host, sp, lat, step, north, v) {
  var D = demoSvg('isodemo', 660, 380, 'The geostrophic wind scale: wind aloft against the ' +
    'spacing of the isobars, one curve for each latitude. Your reading: ' + sp + ' nm at ' + lat +
    ' degrees gives ' + Math.round(v) + ' knots.');
  var x0 = 70, y0 = 330, x1 = 590, y1 = 40, h = north ? 'N' : 'S';
  var X = function (d) { return x0 + (d - 40) / 260 * (x1 - x0); };
  var Y = function (w) { return y0 - w / 80 * (y0 - y1); };
  [0, 20, 40, 60, 80].forEach(function (w) {
    D.e('line', { x1: x0, y1: Y(w), x2: x1, y2: Y(w), stroke: D.line, 'stroke-width': 1 });
    D.t(x0 - 8, Y(w) + 4, String(w), D.dim, { 'font-size': 12, 'text-anchor': 'end' });
  });
  [50, 100, 150, 200, 250, 300].forEach(function (d) {
    D.t(X(d), y0 + 20, String(d), D.dim, { 'font-size': 12, 'text-anchor': 'middle' });
  });
  D.t((x0 + x1) / 2, y0 + 40, 'spacing between isobars, nautical miles (' + step + ' hPa apart)',
      D.dim, { 'font-size': 12, 'text-anchor': 'middle' });
  D.t(x0 - 8, y1 - 14, 'wind aloft, knots', D.dim, { 'font-size': 12 });
  var lats = [30, 40, 50, 60];
  if (lats.indexOf(Math.round(lat)) < 0 && lat >= 5) lats.push(lat);
  var labs = [];
  lats.forEach(function (l) {
    var pts = [], d;
    for (d = 40; d <= 300; d += 2) {
      var w = CHART.isoWind(d, l, step);
      if (w <= 80) pts.push(X(d).toFixed(1) + ',' + Y(w).toFixed(1));
    }
    var mine = Math.abs(l - lat) < 0.5;
    D.e('polyline', { points: pts.join(' '), fill: 'none', stroke: D.acc,
                      'stroke-width': mine ? 3 : 1.6, 'stroke-opacity': mine ? 1 : 0.55,
                      'data-part': 'curve-' + l });
    labs.push([Y(Math.min(80, CHART.isoWind(300, l, step))) + 4, l]);
  });
  labs.sort(function (a, b) { return a[0] - b[0]; });
  for (var i = 1; i < labs.length; i++) if (labs[i][0] - labs[i - 1][0] < 14) labs[i][0] = labs[i - 1][0] + 14;
  labs.forEach(function (b) {
    D.t(X(300) + 6, b[0], (Math.round(b[1] * 10) / 10) + '\u00b0 ' + h, D.acc, { 'font-size': 12 });
  });
  var dx = X(Math.max(40, Math.min(300, sp))), dy = Y(Math.min(80, v));
  D.e('line', { x1: dx, y1: y0, x2: dx, y2: dy, stroke: D.text, 'stroke-dasharray': '3 3' });
  D.e('line', { x1: x0, y1: dy, x2: dx, y2: dy, stroke: D.text, 'stroke-dasharray': '3 3' });
  D.e('circle', { cx: dx, cy: dy, r: 6, fill: D.text, 'data-part': 'dot',
                  'data-sp': sp, 'data-wind': v });
  var right = dx > 420;
  D.t(dx + (right ? -12 : 12), dy - 10, 'you: ' + sp + ' nm at ' + lat + '\u00b0 ' + h,
      D.text, { 'font-weight': 600, 'text-anchor': right ? 'end' : 'start' });
  D.t(dx + (right ? -12 : 12), dy + 8, Math.round(v) + ' kn aloft, about ' + Math.round(v * 2 / 3) +
      ' kn on deck', D.acc, { 'text-anchor': right ? 'end' : 'start' });
  if (sp < 40 || sp > 300 || v > 80)
    D.t(x1, y1 - 14, 'your reading is off this scale: pinned to its edge', D.text,
        { 'font-size': 12, 'text-anchor': 'end' });
  else D.t(x1, y1 - 14, 'nearer the equator, the same spacing blows harder', D.dim,
        { 'font-size': 12, 'text-anchor': 'end' });
  host.appendChild(D.wrap);
}

/* =====================================================================
   The lessons
   ===================================================================== */
function doneList() {
  try { return JSON.parse(lsGet('done', '[]')) || []; } catch (e) { return []; }
}
function markDone(k) {
  var d = doneList();
  if (d.indexOf(k) < 0) { d.push(k); lsSet('done', JSON.stringify(d)); }
}
function drawLessonIndex() {
  $('les-index').hidden = false;
  $('les-body').hidden = true;
  var done = doneList();
  var box = $('les-list');
  box.textContent = '';
  LESSONS.forEach(function (l) {
    var b = el('button', 'row');
    b.appendChild(el('b', null, l.title));
    b.appendChild(el('span', null, done.indexOf(l.key) >= 0 ? 'read' : ''));
    b.addEventListener('click', function () { showLesson(l.key); });
    box.appendChild(b);
  });
}
/* ---------------------------------------------------------------------
   THE LESSONS WERE WRITTEN FOR A TERMINAL.

   teach.awk wraps its prose at about 70 columns, and every one of those
   lines arrived here as its own paragraph with white-space: pre-wrap.
   On a phone the box is about 380px, so 130 of the 181 lines across the
   ten lessons wrapped a second time -- and because each line carries a
   two-space screen indent while its wrapped remainder does not, the left
   margin alternated in and out the whole way down.

   Two other things came with it:

     the 24 lines that are figures or columns -- the H2O/O2 diagram, the
       rate tables -- rendered in the body's proportional font, where
       nothing can line up. "O2 32" is indented in the source to sit
       under "N2 28", and it sat under "pushing out" instead. That is a
       wrong picture, not an ugly one, and it was wrong before any of
       this reflowing;

     and the emphasis is per-SPAN, not per-line, so joining lines means
       concatenating span runs rather than strings. Lose that and the
       accent comes off words like "replaces", which is the one word its
       sentence turns on.

   So: consecutive lines are gathered into a paragraph, the paragraph is
   classified, and only prose is joined. The rule is the one
   renderProse() uses in colregs -- a column gutter is two or more
   spaces that do not follow sentence punctuation, and a hanging indent
   deeper than a list's is a figure -- and anything that looks like
   either keeps its lines and gets a monospace face, because its layout
   is its meaning.

   tests/weather-reflow-check.js holds it to three things: every word
   survives in order, every emphasised word is still emphasised, and
   anything with a column in it comes back preformatted.
   --------------------------------------------------------------------- */
/*  A COLUMN GUTTER, AND THE DISTINCTION IS THE WIDTH. Two spaces after
    a full stop is sentence spacing; three or more inside a line is a
    column, whatever precedes them. The first version excluded a colon
    from the two-space case and applied that exclusion to any width,
    which held nothing it should not -- until celnav's Polaris lesson,
    where "at upper transit, above the pole:   latitude = Ho - p" is a
    label and a formula in two columns, and the colon is exactly what a
    label ends with. Measured across all three apps, splitting the cases
    by width moves that one paragraph and nothing else.  */
var WX_GUTTER = /\S {3,}\S|[^.!?: ] {2}\S/;
var WX_MARKER = /^( *)(\d+\.|\([a-z]\)|[a-z]\))\s+\S/;
var WX_DEEP = 6;

function wxSpans(b) {                    /* a line's spans, holes dropped */
  var out = [];
  if (b && b.p) b.p.forEach(function (s) { if (s) out.push({ t: s.t, s: s.s }); });
  return out;
}
function wxText(b) {
  return wxSpans(b).map(function (s) { return s.t; }).join('');
}
function wxKind(lines) {
  var txt = lines.map(wxText), i, ind = [], mn, mx;
  for (i = 0; i < txt.length; i++) if (WX_GUTTER.test(txt[i])) return 'pre';
  for (i = 0; i < txt.length; i++) ind.push(txt[i].match(/^ */)[0].length);
  mn = Math.min.apply(null, ind); mx = Math.max.apply(null, ind);
  if (mx - mn >= WX_DEEP) return 'pre';
  for (i = 0; i < txt.length; i++) if (WX_MARKER.test(txt[i])) return 'list';
  return 'flow';
}
/*  the spans of several lines, joined into one run of prose: each line
    loses its screen indent and its trailing space, and a single space
    goes in at the seam  */
function wxJoin(lines) {
  var out = [];
  lines.forEach(function (b) {
    var sp = wxSpans(b);
    if (!sp.length) return;
    sp[0] = { t: sp[0].t.replace(/^ +/, ''), s: sp[0].s };
    sp[sp.length - 1] = { t: sp[sp.length - 1].t.replace(/ +$/, ''),
                          s: sp[sp.length - 1].s };
    sp = sp.filter(function (x) { return x.t !== ''; });
    if (!sp.length) return;
    if (out.length) out.push({ t: ' ', s: 'plain' });
    out.push.apply(out, sp);
  });
  /*  neighbouring spans of the same style become one element  */
  var merged = [];
  out.forEach(function (sp) {
    var last = merged[merged.length - 1];
    if (last && last.s === sp.s) last.t += sp.t;
    else merged.push({ t: sp.t, s: sp.s });
  });
  return merged;
}
function wxPut(parent, spans) {
  spans.forEach(function (sp) {
    if (sp.s === 'plain') parent.appendChild(document.createTextNode(sp.t));
    else parent.appendChild(el('span', sp.s, sp.t));
  });
  return parent;
}

//  One renderer for the lesson and for its deeper section, so the two
//  cannot drift apart in how they present the author's emphasis.
function drawLines(box, lines) {
  var firstLine = true, para = [];

  function flush() {
    if (!para.length) return;
    var kind = wxKind(para), group = para;
    para = [];

    if (kind === 'pre') {
      /*  kept exactly, and in a monospace face, because the columns are
          the content. Scrolls on its own rather than pushing the page.  */
      var pre = el('pre', 'ln-pre');
      group.forEach(function (b, i) {
        if (i) pre.appendChild(document.createTextNode('\n'));
        wxPut(pre, wxSpans(b));
      });
      box.appendChild(pre);
      return;
    }
    if (kind === 'flow') {
      box.appendChild(wxPut(el('p', 'ln'), wxJoin(group)));
      return;
    }
    /*  a list: an item starts at its marker and runs on through the
        lines indented under it, and each item flows within itself  */
    var items = [], cur = null;
    group.forEach(function (b) {
      if (WX_MARKER.test(wxText(b)) || !cur) { cur = [b]; items.push(cur); }
      else cur.push(b);
    });
    items.forEach(function (it) {
      box.appendChild(wxPut(el('div', 'ln-item'), wxJoin(it)));
    });
  }

  lines.forEach(function (b) {
    if (b.s === 'gap') { flush(); box.appendChild(el('div', 'gap')); return; }
    if (b.s === 'rule') { flush(); box.appendChild(document.createElement('hr')); return; }
    /*  A DEMONSTRATION, WHERE THE SHELL PUT ITS MARKER. teach.awk draws the
        figure in characters for a terminal and prints "@@FIG" in its place
        for the generator, so both builds carry the same lesson with the
        same demonstration in the same position - one of them just has a
        slider.  */
    if (b.s === 'demo') {
      flush();
      /*  WHICH demonstration. The marker carries the figure's name now
          that the tool has two of them - the shell is the only thing that
          knows which gap is which, so it says so rather than the browser
          guessing from position. An unknown kind draws nothing rather
          than the wrong thing, and tests/weather-reflow-check.js counts
          panels against markers, so a kind nobody renders fails there.  */
      /*  Both demos build an SVG with colours read at draw time, and both
          APPEND rather than clear - so a repaint must empty the box first
          or it would stack a second drawing on the first.  Which is why
          each figure gets a box of its OWN rather than being registered
          against the lesson container: `box` here is #les-text or
          #les-more, and clearing that on a mode change would take the
          lesson's prose with it and leave the reader a bare drawing.  */
      var fig = el('div', 'figbox');
      box.appendChild(fig);
      //  one drawing per kind the shell names in its @@FIG marker; the
      //  gun is the old default and stays the fallback
      /*  AN UNKNOWN KIND DRAWS NOTHING, as the note above says.  Until
          1.0.9 the gun was the fallback (`|| gunDemo`) and was not in the
          table, so a figure the shell named but nobody had wired here
          drew a gun, and the reflow check, which counts panels against
          markers, counted the gun and passed.  The gun is named now, and
          a kind missing from the table leaves its box empty, which the
          reflow check does catch.  */
      var draw = ({ gun: gunDemo, wind: windDemo, friction: frictionDemo, forces: forcesDemo,
                    veertime: veerTimeDemo, veerhemi: veerHemiDemo,
                    passnorth: function (h) { passDemo(h, true); },
                    passsouth: function (h) { passDemo(h, false); },
                    fronts: frontsDemo,
                    isoscale: isoScaleDemo })[b.kind];
      if (draw) wxRepaints(fig, draw);
      return;
    }
    //  the first printed line of a section is its heading
    if (firstLine) {
      firstLine = false;
      box.appendChild(el('h3', null, wxText(b).trim()));
      return;
    }
    para.push(b);
  });
  flush();
}

function showLesson(key) {
  var l = null;
  LESSONS.forEach(function (x) { if (x.key === key) l = x; });
  if (!l) return;
  markDone(key);
  $('les-index').hidden = true;
  $('les-body').hidden = false;
  var box = $('les-text');
  box.textContent = '';
  drawLines(box, l.body);
  var q = $('les-q');
  q.textContent = '';
  if (l.q) {
    q.hidden = false;
    q.appendChild(el('b', null, 'Question'));
    q.appendChild(el('p', null, l.q));
    //  NEVER TELL BEFORE YOU ASK.  The answer is not in the page until
    //  it is asked for.
    var show = el('button', 'btn wide', 'Show the answer');
    var ans = el('p', null, '');
    show.addEventListener('click', function () {
      ans.textContent = l.a;
      show.remove();
    });
    q.appendChild(show);
    q.appendChild(ans);
  } else q.hidden = true;

  //  LEARN MORE, OFFERED AND NOT IMPOSED.  The lesson above is what you
  //  need on deck; the deeper section is why it is true. It is not in the
  //  page until it is asked for, which keeps the lesson the length it was
  //  written to be.
  var more = $('les-more');
  more.textContent = '';
  if (l.more && l.more.length) {
    more.hidden = false;
    var btn = el('button', 'btn wide', 'Learn more');
    btn.setAttribute('data-more', key);
    btn.addEventListener('click', function () {
      btn.remove();
      drawLines(more, l.more);
      more.scrollIntoView({ block: 'start' });
    });
    more.appendChild(btn);
  } else more.hidden = true;

  window.scrollTo(0, 0);
}

/* =====================================================================
   About, and loading
   ===================================================================== */
function drawAbout() {
  $('share-state').textContent = RECS.length
    ? RECS.length + ' records in the shared log, ' + OBS.length + ' of them observations.'
    : 'No log on this device yet. Keep a watch in deck-log and this fills in.';
  if (!('caches' in window)) { $('off-state').textContent = 'This browser will not cache for offline use.'; return; }
  //  FIND THE CACHE, DO NOT NAME IT.  The name lived here and in sw.js,
  //  so bumping the worker's version -- which every change to a cached
  //  file requires -- left this looking in a cache that no longer exists
  //  and reporting "not cached" on a tool that was perfectly cached.
  caches.keys().then(function (ks) {
    var k = ks.filter(function (x) { return x.indexOf('weather-') === 0; })[0];
    return k ? caches.open(k).then(function (c) { return c.match('./'); }) : null;
  }).then(function (hit) {
    $('off-state').textContent = hit
      ? 'Cached. This runs with no network at all.'
      : 'Not cached yet \u2014 open this page once with a connection.';
  }).catch(function () { $('off-state').textContent = 'Could not read the cache.'; });
}

function reload() {
  return STORE.allLines().then(function (lines) {
    var rd = LOG.read(STORE.canonical(lines).join('\n'), '');
    RECS = rd.recs;
    OBS = WX.load(RECS);
    return rd;
  });
}

function drawHome() {
  if (!OBS.length) {
    $('st-obs').textContent = 'No observations yet';
    $('st-sub').textContent = 'Almost every rule here needs history, not a snapshot. ' +
      'Keep a few three-hourly watches in deck-log and this starts working.';
    return;
  }
  var last = OBS[OBS.length - 1];
  $('st-obs').textContent = OBS.length + ' observation' + (OBS.length === 1 ? '' : 's') +
    ', the last at ' + last.ts;
  var bits = [];
  if (WX.has(last.p)) bits.push(WX.cfixed(last.p, 1) + ' hPa');
  if (WX.has(last.wdir) && WX.has(last.wspd)) bits.push('wind ' + last.wdir + '/' + last.wspd);
  if (WX.has(last.air)) bits.push('air ' + WX.cfixed(last.air, 1) + '\u00b0C');
  $('st-sub').textContent = bits.join('   \u00b7   ') || 'nothing recorded in it';
}

window.addEventListener('DOMContentLoaded', function () {
  setMode(savedMode());
  wireModes();
  $('back').addEventListener('click', function () { go('home'); drawHome(); });
  buildShow('ver', '11 Nov 2026');
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });

  $('i-lon').value = lsGet('lon', '');
  $('b-lonsave').addEventListener('click', function () {
    var v = $('i-lon').value.trim();
    if (v !== '' && (!isFinite(+v) || +v < -180 || +v > 180)) {
      $('lon-state').textContent = 'Longitude runs -180 to 180.';
      return;
    }
    lsSet('lon', v);
    $('lon-state').textContent = v === ''
      ? 'Cleared. Without it the atmospheric tide cannot be taken off the trend.'
      : 'Saved. The tide correction is now applied before anything is said about tendency.';
  });

  $('i-hours').addEventListener('change', updateValid);
  $('b-commit').addEventListener('click', commitForecast);
  ['c-brg', 'c-dist', 'c-or', 'c-w5'].forEach(function (id) {
    $(id).value = lsGet(id, '');
    $(id).addEventListener('input', drawChart);
  });
  $('c-hemi').value = lsGet('c-hemi', '1');
  $('c-hemi').addEventListener('change', drawChart);
  ['i-sp', 'i-lat', 'i-step'].forEach(function (id) {
    $(id).value = lsGet(id, '');
    $(id).addEventListener('input', drawIsobars);
  });
  $('i-hemi').value = lsGet('i-hemi', '1');
  $('i-hemi').addEventListener('change', drawIsobars);
  ST_IDS.forEach(function (id) {
    $(id).value = lsGet(id, '');
    $(id).addEventListener('input', drawStorm);
  });
  /*  the two drawings read their colours at draw time, so a change of
      display mode redraws them while the screen is open  */
  window.addEventListener('visualmodechange', function () {
    if (VIEW === 'isobars') drawIsobars();
    if (VIEW === 'storm') drawStorm();
    if (VIEW === 'what') drawWhat();
  });
  /*  the barograph's window: 24, 48 or 72 hours, remembered  */
  var wins = document.querySelectorAll('#what-glass .win');
  for (var wi = 0; wi < wins.length; wi++) wins[wi].addEventListener('click', function () {
    lsSet('glass-h', this.getAttribute('data-win')); drawWhat();
  });
  $('les-back').addEventListener('click', drawLessonIndex);

  /*  a lesson's link opens the isobars screen with its example in it  */
  var IQ = isoFromQuery(location.search);
  if (IQ.view === 'isobars') {
    $('i-sp').value = IQ.sp; $('i-lat').value = IQ.lat; $('i-step').value = IQ.step;
    $('i-hemi').value = IQ.north ? '1' : '0';
    ISO_LESSON = IQ.lesson;
    go('isobars');
  } else go('home');
  reload().then(drawHome).catch(function (e) {
    $('st-obs').textContent = 'Could not open the log store';
    $('st-sub').textContent = e.message;
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    if (window.WEATHER_NO_SW) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        rs.forEach(function (r) { r.unregister(); });
      }).catch(function () {});
    } else {
      /*  updateViaCache: 'none' IS THE OTHER HALF OF THE SAME FAULT.
          A browser only checks sw.js for updates on navigation, and that check
          goes through the HTTP cache unless the previous script's max-age was
          over 24 hours. GitHub Pages sends max-age=600, so for ten minutes
          after a push the browser compares the new sw.js against a CACHED COPY
          of the old one, sees no difference, and installs nothing. "Open it
          once with a signal" is then a no-op that looks exactly like the app
          being stuck - which is what it looked like.  */
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
    }
  }
});

/*  The seam tests/weather-reflow-check.js loads this through. `module`
    is undefined in a browser, so this costs the page nothing; what it
    buys is that drawLines() can be run outside one and held to the
    three things the reflow must not get wrong. Same seam colregs.js and
    contacts.js carry, for the same reason.  */

/* =====================================================================
   THE TWO SHELLS, TRAINABLE AND FIRED

   The demonstration behind the coriolis lesson. src/weather/teach.awk
   draws it as a character figure for the terminal and prints a marker in
   its place for the generator -- so the shell says WHERE the
   demonstration goes and each build decides HOW. This is the browser's
   how.

   WHY TRAINING THE GUN IS THE POINT, and not decoration. For horizontal
   motion the deflecting acceleration is 2*Omega*v*sin(phi), always
   perpendicular to the track, always to the right in the northern
   hemisphere -- WHATEVER THE BEARING. Fired north and fired south are
   not two curiosities, they are two cases of one rule, and the way to
   show that is to let a reader swing the gun round and watch the rule
   hold at every setting. The static figure can only assert it.

   AND IT TRAINS THROUGH THE FULL 360, which started as a 180 and was
   wrong at 180. With the arc running west-north-east, cos(bearing) is
   never negative, so the westward climb-and-fall term could only ever
   SUBTRACT from the drift. The south half is the half where it ADDS -
   and that is where the lesson's own second number lives: at 45 N the
   drift is 115 m fired north and 237 m fired south. A demonstration of
   three components that cannot reach the setting where two of them add
   is demonstrating one and a half.

   WHAT IS COMPUTED HERE, because it matters that this is not a cartoon:
   the deflection shown in metres is the real one for the latitude on the
   slider and the shell on the dial -- d = Omega * v * sin(phi) * T^2,
   which is the standard half-a-T-squared with a = 2*Omega*v*sin(phi).
   The TRACK is drawn to the panel, with the deflection exaggerated by a
   stated factor so it is visible at all; the number beside it is not.
   Counting only the ground's slowing and forgetting that the shell speeds
   up halves the answer, which is the easy mistake and the reason the
   lesson now shows both halves.
   ===================================================================== */
var GUN = {
  OMEGA: 7.292115e-5,        /* rad/s, the earth's rotation            */
  G: 9.80665,                /* m/s2                                    */
  range: 38000,              /* m, a 16 inch gun at full elevation      */
  tof: 90,                   /* s, its time of flight                   */
  lat: 45,                   /* degrees, + north                        */
  brg: 0,                    /* degrees from north, -90 west to +90 east */
  exagg: 60                  /* the track's drawn offset, x real        */
};

/* =====================================================================
   THREE COMPONENTS, TWO CORRECTIONS.
   ---------------------------------------------------------------------
   This used to return one number: Omega*V*sin(phi)*T^2, the sideways
   deflection, and it reported that as the whole answer. Larry asked why
   a shell fired EAST shows the same deflection as one fired north, when
   the angular-momentum story the lesson tells is about changing your
   distance from the axis - which an east-west shot does not do. The
   question is a good one and the answer is that there is a second
   mechanism, which he named correctly: the Eoetvoes effect.

   Coriolis in full is a = -2*Omega x V. In local (east, north, up) with
   Omega = Omega*(0, cos phi, sin phi) and V = (u, v, w):

       a_east  = +2*Omega*sin(phi)*v  -  2*Omega*cos(phi)*w
       a_north = -2*Omega*sin(phi)*u
       a_up    = +2*Omega*cos(phi)*u

   Integrated twice along the unperturbed trajectory (vacuum, flat earth,
   w0 = g*T/2, which is the same idealisation the lesson already makes),
   that is three displacements, and they are different animals:

     TURN    Omega*sin(phi)*V*T^2, perpendicular to the track, right in
             the north. Bearing-independent - this is the one the lesson
             is about, and it is unchanged.

     EOETVOES  Omega*cos(phi)*u*T^2 of extra HEIGHT, from the EAST
             component u alone, so it is exactly zero due north or south.
             The shell still lands on the ground, so the observable is
             not height but RANGE: converted at the descent angle,
             2*Omega*cos(phi)*u*T*V/g. Fired east it carries long, fired
             west it falls short.

     RISE    -2*Omega*cos(phi)*w acting on the shell's own vertical speed.
             Climbing it pushes west, falling it pushes east, and those do
             NOT cancel: the double integral is the integral of height
             over time, which is positive, leaving Omega*cos(phi)*g*T^3/6
             to the WEST at every bearing. Same physics as the eastward
             deflection of a dropped stone, run backwards for the climb.

   Note what RISE does not do: it does not reverse with hemisphere, since
   cos(phi) is positive on both sides of the equator. So the southern
   hemisphere is NOT the mirror image of the northern, quite - at 45 S a
   shell fired north drifts 238 m left where at 45 N it drifts 115 m
   right.

   AND IT IS A PROJECTILE TERM, NOT A WIND TERM. Air moving horizontally
   has no w to speak of, so none of this touches the meteorology in the
   rest of the lesson: wind still turns by 2*Omega*V*sin(phi) and still
   does nothing on the equator.
   ===================================================================== */
function gunSolve(lat, brg) {
  var T = GUN.tof, V = GUN.range / T, g = GUN.G;
  var phi = lat * Math.PI / 180, b = brg * Math.PI / 180;
  var sp = Math.sin(phi), cp = Math.cos(phi);
  var u = V * Math.sin(b);                     /* the east component      */
  var turn = GUN.OMEGA * sp * V * T * T;       /* + right of the track    */
  var rise = GUN.OMEGA * cp * g * T * T * T / 6;  /* magnitude, due west  */
  var eot = 2 * GUN.OMEGA * cp * u * T * V / g;   /* + long               */
  /*  resolve the westward RISE onto the line of fire: the unit vector
      along it is (sin b, cos b) in (east, north) and the one 90 degrees
      right of it is (cos b, -sin b), so a displacement of -rise east
      contributes -rise*cos(b) across and -rise*sin(b) along.  */
  return { turn: turn, rise: rise, eotvos: eot,
           drift: turn - rise * Math.cos(b),
           along: eot - rise * Math.sin(b) };
}

/*  FRICTION, OVER THE SEA AND OVER LAND (W01; Larry, AJZ, 16 Nov 2026).
    The drawing beside the gradient lesson's two rules of thumb.  Both
    panels are the northern-hemisphere picture: the wind aloft runs along
    the isobar with the low on its left, and the surface wind is turned
    toward the low (backed) and slowed.  Lengths are speed, angles are
    true angles: an SVG has square units, so unlike the terminal figure
    nothing here is stretched.

    THE NUMBERS ARE RULES OF THUMB, CHECKED (gap list rule 4):
      sea   backed 10-20 deg  US Navy aerographer training (tpub), about
                              10-15 deg in the aviation and sea-kayak texts
            about 2/3 speed   RMetS MetLink; the sea-kayak text
      land  backed 30-40 deg  sea-kayak text 30, US Navy 35
            1/3 to 2/3 speed  the sources disagree: MetLink 1/3, the
                              sea-kayak text 1/2, US Navy 2/3.  ECMWF:
                              drag depends on the surface, rough terrain
                              and forest high, open grass moderate, sea low.
    So the land arrow is DRAWN AS A BAND, not one figure: solid to 1/3
    (forests, towns, cities - Larry, from his classes: buildings and
    trees drag most) and dashed on to 2/3 (open fields).  The angle fans
    show the range of each rule; the arrow sits at the middle of it.

    No warning colour: nothing on it is a caution.  Every colour is read
    from the host's tokens at draw time, so wxRepaints redraws it in day,
    dusk and night.  */
function frictionDemo(host) {
  var NS = 'http://www.w3.org/2000/svg';
  var W = 640, H = 340;
  var wrap = el('div', 'fricdemo');
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Friction: over the sea the surface wind is ' +
    'backed 10 to 20 degrees toward the low and about two thirds of the wind ' +
    'aloft; over land it is backed 30 to 40 degrees and one third to two ' +
    'thirds as strong, slowest over forests, towns and cities.');
  wrap.appendChild(svg);
  function e(n, a, p) {
    var x = document.createElementNS(NS, n), q;
    for (q in a) if (a.hasOwnProperty(q)) x.setAttribute(q, a[q]);
    (p || svg).appendChild(x);
    return x;
  }
  function t(x, y, s, fill, o) {
    var a = { x: x, y: y, fill: fill, 'font-size': 13 }, q;
    for (q in (o || {})) a[q] = o[q];
    e('text', a).textContent = s;
  }
  var css = function (n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
  };
  var dim = css('--dim'), line = css('--line'), acc = css('--accent'), text = css('--text');
  var L = 270;                          /* the wind aloft, full length = full speed */
  function rad(d) { return d * Math.PI / 180; }
  function pt(x0, y0, r, d) { return [x0 + r * Math.cos(rad(d)), y0 - r * Math.sin(rad(d))]; }
  function head(p, d, fill, open) {     /* an arrowhead at p pointing along bearing d */
    var b1 = pt(p[0], p[1], 11, d + 155), b2 = pt(p[0], p[1], 11, d - 155);
    e('path', { d: 'M' + p + 'L' + b1 + 'L' + b2 + 'Z',
                fill: open ? 'none' : fill, stroke: fill, 'stroke-width': 1.5 });
  }
  function panel(px, title, a1, a2, f1, f2) {
    var x0 = px + 22, y0 = 214, am = (a1 + a2) / 2, R = L * f2 + 16, p;
    var k = title === 'OVER LAND' ? 'land' : 'sea';   /* tests read the parts by name */
    t(px + 4, 24, title, text, { 'font-weight': 600 });
    t(px + 300, 48, 'LOW side', dim, { 'text-anchor': 'end' });
    /* the fan: the range of the rule */
    var u1 = pt(x0, y0, R, a1), u2 = pt(x0, y0, R, a2);
    e('path', { d: 'M' + x0 + ',' + y0 + 'L' + u1 + 'A' + R + ',' + R + ' 0 0 0 ' + u2 + 'Z',
                fill: acc, 'fill-opacity': 0.12, stroke: 'none', 'data-part': k + '-fan' });
    /* the isobar */
    e('line', { x1: px + 6, y1: y0, x2: px + 304, y2: y0, stroke: dim,
                'stroke-width': 1.2, 'stroke-dasharray': '2 4', 'data-part': k + '-isobar' });
    t(px + 304, y0 - 6, 'isobar', dim, { 'text-anchor': 'end', 'font-size': 11 });
    /* the wind aloft, along it */
    e('line', { x1: x0, y1: y0 + 22, x2: x0 + L, y2: y0 + 22, stroke: dim, 'stroke-width': 2,
                'data-part': k + '-aloft' });
    head([x0 + L, y0 + 22], 0, dim);
    t(x0, y0 + 44, 'the wind aloft, along the isobars', dim);
    /* the surface wind: solid to f1, dashed on to f2 */
    p = pt(x0, y0, L * f1, am);
    e('line', { x1: x0, y1: y0, x2: p[0], y2: p[1], stroke: acc, 'stroke-width': 3,
                'data-part': k + '-surface' });
    head(pt(x0, y0, L * f1 + 8, am), am, acc, false);
    if (f2 > f1) {
      var q = pt(x0, y0, L * f2, am), s = pt(x0, y0, L * f1 + 10, am);
      e('line', { x1: s[0], y1: s[1], x2: q[0], y2: q[1], stroke: acc,
                  'stroke-width': 3, 'stroke-dasharray': '6 5', 'data-part': k + '-band' });
      head(pt(x0, y0, L * f2 + 8, am), am, acc, true);
    }
    /* the angle, marked on a small arc from the isobar */
    var r = 54, ka = pt(x0, y0, r, am);
    e('path', { d: 'M' + (x0 + r) + ',' + y0 + 'A' + r + ',' + r + ' 0 0 0 ' + ka,
                fill: 'none', stroke: acc, 'stroke-width': 1 });
  }
  panel(0,   'OVER THE SEA', 10, 20, 2 / 3, 2 / 3);
  panel(330, 'OVER LAND',    30, 40, 1 / 3, 2 / 3);
  /* what each arrow means, where it ends */
  var s1 = pt(22, 214, L * 2 / 3 + 20, 15);
  t(s1[0] - 30, s1[1] - 16, 'about 2/3', acc);
  var l1 = pt(352, 214, L / 3, 35), l2 = pt(352, 214, L * 2 / 3, 35);
  t(l1[0] + 14, l1[1] + 18, '1/3: forests, towns, cities', acc, { 'font-size': 12 });
  t(l2[0] + 16, l2[1] + 6, '2/3: open fields', acc, { 'font-size': 12 });
  t(4, 288, 'backed 10\u201320\u00b0, about 2/3 of the speed aloft', acc);
  t(334, 288, 'backed 30\u201340\u00b0, 1/3 to 2/3 of the speed aloft', acc);
  t(4, 314, 'Northern hemisphere: the low lies to the left of the wind aloft, and the ' +
            'surface wind turns toward it.', dim, { 'font-size': 11 });
  t(4, 330, 'South of the equator it turns the other way: veered, not backed.',
    dim, { 'font-size': 11 });
  host.appendChild(wrap);
}

/*  THE FORCES BEHIND THE TURN, WITH FRICTION ON A SLIDER (weather 1.0.2;
    Larry, AKF, 16 November 2026).  The gradient lesson's second figure.
    Near the surface three forces balance:

      pressure   toward the low, fixed by the isobars        f.G
      Coriolis   at right angles to the wind, to its right   f.V
      friction   straight against the wind                   k.V

    Head to tail they close into a triangle.  Coriolis and friction meet at
    a right angle, so the corner rides the circle whose diameter is the
    pressure arrow (Thales), and the friction side lies along the wind.
    Solved: tan(alpha) = k/f and V = G.cos(alpha) - the balance the
    coriolis lesson's wind panel is held to (weather-wind.js).  The slider
    is k/f, from 0 (no friction: the wind aloft, along the isobars) to 1
    (45 degrees), at 50 N, the course's water.

    THE TRIANGLE GIVES THE TURN, NOT THE WIND ON DECK.  V is the wind of
    the whole friction layer; at deck height it is slower again, because
    the wind drops toward the surface.  So the readout gives the turn and
    the layer's speed from the triangle, and the rule of thumb for the
    wind on deck beside it, and says why they differ.
    Sources: Penn State METEO 300 (friction and the force balance); US Navy
    aerographer's mate training (tpub weather2 4-28).  */
var FORCES = { k: 0.27 };          /* k/f; 0.27 is 15 degrees, the sea */
/*  WHAT IS HAPPENING, IN A SAILOR'S WORDS (Larry, 16 November 2026: "we
    want them to understand what's happening, not to actually have to do
    the math").  One short story for each kind of ground, told under the
    slider as it moves.  */
function forcesGround(a) {          /* what ground gives that much turn */
  if (a < 5)  return { name: 'none (the wind aloft)', deck: 'all of it, along the isobars',
    story: 'Aloft, nothing drags on the air. The push toward the low gets it moving, ' +
           'and the earth turning beneath bends it to the right until the bend exactly ' +
           'matches the push. Then the wind runs straight along the isobars, just as the ' +
           'weather chart draws it.' };
  if (a < 23) return { name: 'the sea', deck: 'about 2/3 of the wind aloft',
    story: 'Over the sea the water drags a little at the air and slows it. A slower wind ' +
           'is bent less by the earth\u2019s turn, so the push toward the low wins a ' +
           'little and the wind slants in across the isobars, about 10 to 20 degrees. ' +
           'On deck you get about two thirds of the wind aloft.' };
  if (a < 33) return { name: 'open fields', deck: 'nearer 2/3 of the wind aloft',
    story: 'Over open land the drag is greater than over the sea. The wind slows ' +
           'further, the bend weakens further, and the wind cuts in toward the low at ' +
           'about 30 degrees.' };
  return { name: 'forests, towns and cities', deck: 'nearer 1/3 of the wind aloft',
    story: 'Trees and buildings drag hard. The wind is slowed a lot, the earth\u2019s ' +
           'turn bends it only a little, and it cuts across the isobars toward the low ' +
           'at 35 to 40 degrees or more - and gusty. In harbour among buildings you may ' +
           'have a third of the wind that is blowing outside.' };
}
function forcesDemo(host) {
  var NS = 'http://www.w3.org/2000/svg';
  var W = 640, H = 392;
  var wrap = el('div', 'forcedemo');
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  wrap.appendChild(svg);
  function e(n, a, p) {
    var x = document.createElementNS(NS, n), q;
    for (q in a) if (a.hasOwnProperty(q)) x.setAttribute(q, a[q]);
    (p || svg).appendChild(x);
    return x;
  }
  var css = function (n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
  };
  var dim = css('--dim'), line = css('--line'), acc = css('--accent'), text = css('--text');
  var Ox = 210, Oy = 330, D = 270;   /* O: where the wind is; D: the pressure arrow */
  var Lg = 340;                      /* the wind aloft, full length */
  var g = e('g');
  function head(gp, x, y, ang, col) {   /* ang: screen radians the arrow points along */
    var b1x = x - 11 * Math.cos(ang - 0.45), b1y = y - 11 * Math.sin(ang - 0.45);
    var b2x = x - 11 * Math.cos(ang + 0.45), b2y = y - 11 * Math.sin(ang + 0.45);
    e('path', { d: 'M' + x + ',' + y + 'L' + b1x + ',' + b1y + 'L' + b2x + ',' + b2y + 'Z',
                fill: col }, gp);
  }
  function arrow(gp, x1, y1, x2, y2, col, w, part, dash) {
    var a = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: col, 'stroke-width': w,
              'data-part': part };
    if (dash) a['stroke-dasharray'] = dash;
    e('line', a, gp);
    if (Math.hypot(x2 - x1, y2 - y1) > 14) head(gp, x2, y2, Math.atan2(y2 - y1, x2 - x1), col);
  }
  function t(gp, x, y, s, fill, o) {
    var a = { x: x, y: y, fill: fill, 'font-size': 13 }, q;
    for (q in (o || {})) a[q] = o[q];
    e('text', a, gp).textContent = s;
  }
  function draw() {
    while (g.firstChild) g.removeChild(g.firstChild);
    var al = Math.atan(FORCES.k), deg = al * 180 / Math.PI;
    var Tx = Ox, Ty = Oy - D;                                 /* head of the pressure arrow */
    var Cx = Ox + D * Math.cos(al) * Math.sin(al);            /* the right angle */
    var Cy = Oy - D * Math.sin(al) * Math.sin(al);
    var Vl = Lg * Math.cos(al);
    /* the circle the corner rides, and the isobar */
    e('circle', { cx: Ox, cy: Oy - D / 2, r: D / 2, fill: 'none', stroke: line,
                  'stroke-width': 1, 'data-part': 'circle' }, g);
    e('line', { x1: 30, y1: Oy, x2: 610, y2: Oy, stroke: dim, 'stroke-width': 1.2,
                'stroke-dasharray': '2 4' }, g);
    t(g, 34, Oy - 6, 'isobar', dim, { 'font-size': 11 });
    t(g, Tx, Ty - 14, 'LOW', text, { 'text-anchor': 'middle', 'font-weight': 600 });
    /* the wind aloft, along the isobar, for comparison */
    e('line', { x1: Ox, y1: Oy + 26, x2: Ox + Lg, y2: Oy + 26, stroke: dim, 'stroke-width': 2,
                'data-part': 'aloft' }, g);
    head(g, Ox + Lg, Oy + 26, 0, dim);
    t(g, Ox - 8, Oy + 30, 'the wind aloft', dim, { 'font-size': 12, 'text-anchor': 'end' });
    /* the surface wind, turned toward the low */
    var wx = Ox + Vl * Math.cos(al), wy = Oy - Vl * Math.sin(al);
    e('line', { x1: Ox, y1: Oy, x2: wx, y2: wy, stroke: acc, 'stroke-width': 6,
                'stroke-opacity': 0.35, 'data-part': 'wind' }, g);
    head(g, wx + 6 * Math.cos(al), wy - 6 * Math.sin(al), -al, acc);
    t(g, wx + 12, wy - 6, 'the wind', acc, { 'font-weight': 600 });
    /* the three forces, head to tail */
    arrow(g, Ox, Oy, Tx, Ty, text, 2.5, 'pgf');
    t(g, Ox - 10, Oy - D * 0.55, 'pressure', text, { 'text-anchor': 'end' });
    t(g, Ox - 10, Oy - D * 0.55 + 16, 'the push', dim, { 'text-anchor': 'end', 'font-size': 12 });
    t(g, Ox - 10, Oy - D * 0.55 + 31, 'toward the low', dim, { 'text-anchor': 'end', 'font-size': 12 });
    arrow(g, Tx, Ty, Cx, Cy, text, 2.5, 'cor', '7 4');
    t(g, (Tx + Cx) / 2 + 22, (Ty + Cy) / 2, 'Coriolis', text);
    t(g, (Tx + Cx) / 2 + 22, (Ty + Cy) / 2 + 16, 'the earth\u2019s turn,', dim, { 'font-size': 12 });
    t(g, (Tx + Cx) / 2 + 22, (Ty + Cy) / 2 + 31, 'bending it right', dim, { 'font-size': 12 });
    arrow(g, Cx, Cy, Ox, Oy, text, 2.5, 'fric', '2 3');
    /*  under the isobar, clear of the wind and the dotted line, and above
        the wind aloft: at the sea's small angle there is no room beside it  */
    if (deg > 6) t(g, Cx + 10, Oy + 18, 'friction: the drag', text, { 'font-size': 12 });
    /* the right angle at the corner */
    if (deg > 3 && deg < 87) {
      var ux = Math.cos(al), uy = -Math.sin(al), px = Math.sin(al), py = Math.cos(al), q = 10;
      var p1x = Cx - q * ux, p1y = Cy - q * uy;
      e('path', { d: 'M' + p1x + ',' + p1y + 'L' + (p1x - q * px) + ',' + (p1y - q * py) +
                     'L' + (Cx - q * px) + ',' + (Cy - q * py),
                  fill: 'none', stroke: dim, 'stroke-width': 1 }, g);
    }
    /* the angle the wind is turned */
    if (deg > 1) {
      var r = 64, kx = Ox + r * Math.cos(al), ky = Oy - r * Math.sin(al);
      e('path', { d: 'M' + (Ox + r) + ',' + Oy + 'A' + r + ',' + r + ' 0 0 0 ' + kx + ',' + ky,
                  fill: 'none', stroke: acc, 'stroke-width': 1.2 }, g);
    }
    var gr = forcesGround(deg);
    t(g, 360, 36, 'friction: ' + gr.name, text, { 'font-weight': 600, 'data-part': 'ground' });
    t(g, 360, 58, 'turned ' + Math.round(deg) + '\u00b0 toward the low', acc, { 'data-part': 'turn' });
    t(g, 360, 78, 'on deck: ' + gr.deck, text, { 'data-part': 'deck', 'font-size': 12 });
    story.textContent = gr.story;
    t(g, 30, 384, 'Northern hemisphere, 50\u00b0 N. The triangle is the wind of the whole friction ' +
                  'layer; on deck it is slower again.', dim, { 'font-size': 11 });
    svg.setAttribute('aria-label', 'Three forces: pressure toward the low, Coriolis and friction. ' +
      'With friction ' + gr.name + ' the wind is turned ' + Math.round(deg) +
      ' degrees toward the low.');
  }
  var story = el('p', 'gunread forcestory', '');
  draw();
  /*  the slider: k/f, 0 to 1, in steps of 0.01  */
  var ctl = el('div', 'gunctl');
  var l = el('label', null, '');
  var span = el('span', 'gunval', '');
  l.appendChild(document.createTextNode('friction '));
  l.appendChild(span);
  var inp = document.createElement('input');
  inp.type = 'range'; inp.min = 0; inp.max = 100; inp.step = 1;
  inp.value = Math.round(FORCES.k * 100); inp.id = 'fr-k';
  inp.setAttribute('aria-label', 'friction, from none to forests, towns and cities');
  l.appendChild(inp);
  function sync() { span.textContent = forcesGround(Math.atan(FORCES.k) * 180 / Math.PI).name; }
  inp.addEventListener('input', function () { FORCES.k = parseFloat(inp.value) / 100; sync(); draw(); });
  sync();
  ctl.appendChild(l);
  /*  the stops sit where their friction is on the slider, not evenly  */
  var stops = el('div', 'forcestops', '');
  [['none', 0], ['sea', 0.27], ['open fields', 0.58], ['forests, towns', 0.84]].forEach(function (n) {
    var sp = el('span', null, n[0]);
    sp.setAttribute('style', 'left:' + (n[1] * 100) + '%' +
                    (n[1] > 0 ? ';transform:translateX(-50%)' : ''));
    stops.appendChild(sp);
  });
  ctl.appendChild(stops);
  wrap.appendChild(ctl);
  wrap.appendChild(story);
  host.appendChild(wrap);
}

/*  BACKING AND VEERING, the two figures of the lesson `veer` (weather
    1.0.2; Larry, AKI).  veertime: the words over time, round a compass -
    veering clockwise, backing anticlockwise, the same either side of the
    equator.  veerhemi: the surface wind against the wind aloft, turned
    toward the low, which is on the wind's left in the north (backed) and
    its right in the south (veered).  Colours from the page's tokens, so
    both repaint with the display mode.  */
function demoSvg(cls, W, H, label) {
  var NS = 'http://www.w3.org/2000/svg';
  var wrap = el('div', cls);
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  wrap.appendChild(svg);
  var cs = getComputedStyle(document.documentElement);
  var tok = function (n) { return cs.getPropertyValue(n).trim() || '#6fb3d9'; };
  function e(n, a, p) {
    var x = document.createElementNS(NS, n), q;
    for (q in a) if (a.hasOwnProperty(q)) x.setAttribute(q, a[q]);
    (p || svg).appendChild(x);
    return x;
  }
  function t(x, y, s, fill, o) {
    var a = { x: x, y: y, fill: fill, 'font-size': 13 }, q;
    for (q in (o || {})) a[q] = o[q];
    e('text', a).textContent = s;
  }
  function head(x, y, ang, col) {        /* screen radians */
    e('path', { d: 'M' + x + ',' + y +
      'L' + (x - 11 * Math.cos(ang - 0.45)) + ',' + (y - 11 * Math.sin(ang - 0.45)) +
      'L' + (x - 11 * Math.cos(ang + 0.45)) + ',' + (y - 11 * Math.sin(ang + 0.45)) + 'Z', fill: col });
  }
  return { wrap: wrap, svg: svg, e: e, t: t, head: head,
           dim: tok('--dim'), line: tok('--line'), acc: tok('--accent'), text: tok('--text') };
}
function veerTimeDemo(host) {
  var D = demoSvg('veerdemo', 640, 330,
    'A compass. The wind veers when it shifts clockwise, west to north-west to north, ' +
    'and backs when it shifts anticlockwise, west to south-west to south.');
  var cx = 320, cy = 165, R = 112;
  function P(b, r) { return [cx + r * Math.sin(b * Math.PI / 180), cy - r * Math.cos(b * Math.PI / 180)]; }
  D.e('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: D.line, 'stroke-width': 1.2 });
  [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]]
    .forEach(function (c) {
      var p = P(c[1], R + 18);
      D.t(p[0], p[1] + 4.5, c[0], c[0] === 'W' ? D.text : D.dim,
          { 'text-anchor': 'middle', 'font-weight': c[0] === 'W' ? 700 : 400 });
    });
  /* the wind now: from the west, blowing toward the centre */
  var w0 = P(270, R - 6), w1 = P(270, 26);
  D.e('line', { x1: w0[0], y1: w0[1], x2: w1[0], y2: w1[1], stroke: D.text, 'stroke-width': 3,
                'data-part': 'wind-now' });
  D.head(w1[0], w1[1], 0, D.text);
  D.t(cx + 4, cy + 30, 'the wind now:', D.dim, { 'font-size': 12 });
  D.t(cx + 4, cy + 46, 'from the west', D.dim, { 'font-size': 12 });
  /* veering: clockwise from W toward N; backing: anticlockwise toward S */
  function arc(b1, b2, sweep, col, part) {
    var r = R - 24, a = P(b1, r), z = P(b2, r);
    D.e('path', { d: 'M' + a[0] + ',' + a[1] + 'A' + r + ',' + r + ' 0 0 ' + sweep + ' ' + z[0] + ',' + z[1],
                  fill: 'none', stroke: col, 'stroke-width': 3, 'data-part': part,
                  'data-from': b1, 'data-to': b2, 'data-sweep': sweep });
    /* the head points along the circle, the way the shift goes */
    var bb = b2 * Math.PI / 180, dir = sweep ? 1 : -1;
    D.head(z[0], z[1], Math.atan2(dir * Math.sin(bb), dir * Math.cos(bb)), col);
  }
  arc(278, 352, 1, D.acc, 'veer-arc');
  arc(262, 188, 0, D.text, 'back-arc');
  D.t(470, 70, 'VEERS', D.acc, { 'font-weight': 700 });
  D.t(470, 88, 'clockwise:', D.acc, { 'font-size': 12 });
  D.t(470, 104, 'west, north-west, north', D.acc, { 'font-size': 12 });
  D.t(30, 250, 'BACKS', D.text, { 'font-weight': 700 });
  D.t(30, 268, 'anticlockwise:', D.text, { 'font-size': 12 });
  D.t(30, 284, 'west, south-west, south', D.text, { 'font-size': 12 });
  D.t(320, 322, 'Compass words: they mean the same north and south of the equator.',
      D.dim, { 'font-size': 12, 'text-anchor': 'middle' });
  host.appendChild(D.wrap);
}
function veerHemiDemo(host) {
  var D = demoSvg('veerdemo', 640, 330,
    'Two panels. North of the equator the low is on the wind’s left and the surface ' +
    'wind is turned anticlockwise toward it: backed. South of the equator the low is on ' +
    'the right and the turn is clockwise: veered.');
  var L = 230, A = 15 * Math.PI / 180;
  function panel(px, north) {
    var k = north ? 'north' : 'south', s = north ? 1 : -1;
    var x0 = px + 24, yiso = north ? 200 : 120, yal = north ? 228 : 92;
    D.t(px + 4, 22, north ? 'NORTH OF THE EQUATOR' : 'SOUTH OF THE EQUATOR', D.text, { 'font-weight': 600 });
    D.t(px + 290, north ? 52 : 270, 'LOW side', D.dim,
        { 'text-anchor': 'end', 'data-part': k + '-low' });
    D.e('line', { x1: px + 6, y1: yiso, x2: px + 300, y2: yiso, stroke: D.dim,
                  'stroke-width': 1.2, 'stroke-dasharray': '2 4' });
    D.e('line', { x1: x0, y1: yal, x2: x0 + L, y2: yal, stroke: D.dim, 'stroke-width': 2,
                  'data-part': k + '-aloft' });
    D.head(x0 + L + 8, yal, 0, D.dim);
    D.t(x0, yal + (north ? 20 : -10), 'the wind aloft', D.dim, { 'font-size': 12 });
    var ex = x0 + L * Math.cos(A), ey = yiso - s * L * Math.sin(A);
    D.e('line', { x1: x0, y1: yiso, x2: ex, y2: ey, stroke: D.acc, 'stroke-width': 3,
                  'data-part': k + '-surface' });
    D.head(ex + 8 * Math.cos(A), ey - s * 8 * Math.sin(A), -s * A, D.acc);
    D.t(ex - 60, ey + (north ? -14 : 24), 'the surface wind', D.acc, { 'font-size': 12 });
    /* the turn, as a small arc from along the isobar to the surface wind */
    var r = 70, q = [x0 + r * Math.cos(A), yiso - s * r * Math.sin(A)];
    D.e('path', { d: 'M' + (x0 + r) + ',' + yiso + 'A' + r + ',' + r + ' 0 0 ' + (north ? 0 : 1) + ' ' + q[0] + ',' + q[1],
                  fill: 'none', stroke: D.acc, 'stroke-width': 1.2 });
    D.t(px + 4, 296, north ? 'low on the wind’s left:' : 'low on the wind’s right:',
        D.text, { 'font-size': 13 });
    D.t(px + 4, 314, north ? 'turned anticlockwise, BACKED' : 'turned clockwise, VEERED',
        D.acc, { 'font-weight': 700, 'data-part': k + '-word' });
  }
  panel(0, true);
  panel(330, false);
  host.appendChild(D.wrap);
}

/*  A LOW PASSING A BOAT, LOOKED DOWN ON (weather 1.0.9; Larry, AQN, the
    first part of card I19).  North at the top.  Two panels, the low going
    east and the low going west; in each, the low at three times with its
    wind round it (Larry, 18 November: any figure that describes the wind
    in a low shows the low itself, with its wind arrows), and two boats
    that stay put, one each side of the track, with the wind each feels at
    the three times.  The same model and geometry as pass_figure() in
    grid.awk: the wind at a boat is from the bearing of the low turned 105
    degrees (90 for the circulation, 15 in toward the centre), against the
    clock in the north and with it in the south; lows 130 units apart along
    the track, boats 94 off it, drawn here at 1.1 pixels to the unit.
    The words are worked from the drawing's own numbers, not written, and
    tests/weather-pass.js reads every arrow back off the drawing.  */
function passDemo(host, north) {
  var W = 640, PH = 400, TOP = 34, H = TOP + 2 * PH + 44, RAD = Math.PI / 180;
  var D = demoSvg('passdemo', W, H,
    (north ? 'North' : 'South') + ' of the equator, looking down with north at the top. A low passes ' +
    'a boat on each side of its track, first going east, then going west. Looking the way the low ' +
    'goes, the boat on its right has the wind veer and the boat on its left has it back.');
  var cs = getComputedStyle(document.documentElement);
  var tk = function (k) { return cs.getPropertyValue(k).trim(); };
  var warn = tk('--warn') || tk('--bad') || '#e23a2c', ground = tk('--ground') || '#07090b';
  var OP = [0.45, 0.72, 1];
  var PT = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  var nm = function (d) { return PT[Math.round(((d % 360) + 360) % 360 / 22.5) % 16]; };
  var K = 1.1, DX = 130 * K, DY = 94 * K;            /* the awk figure's geometry, in pixels */
  D.svg.setAttribute('data-north', north ? 1 : 0);
  var arrow = function (x1, y1, x2, y2, col, w, op, attrs) {
    var o = { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), stroke: col,
              'stroke-width': w, 'stroke-linecap': 'round', 'stroke-opacity': op }, k;
    for (k in (attrs || {})) o[k] = attrs[k];
    D.e('line', o);
    var an = Math.atan2(y2 - y1, x2 - x1), h = w * 2.2 + 3;
    D.e('path', { d: 'M' + x2.toFixed(1) + ',' + y2.toFixed(1) +
      'L' + (x2 - h * Math.cos(an - 0.45)).toFixed(1) + ',' + (y2 - h * Math.sin(an - 0.45)).toFixed(1) +
      'L' + (x2 - h * Math.cos(an + 0.45)).toFixed(1) + ',' + (y2 - h * Math.sin(an + 0.45)).toFixed(1) + 'Z',
      fill: col, 'fill-opacity': op });
  };
  D.t(16, 22, (north ? 'NORTH' : 'SOUTH') + ' OF THE EQUATOR, LOOKING DOWN', D.text, { 'font-weight': 600 });
  D.t(W - 16, 22, 'the low at three times: 1, then 2, then 3', D.dim, { 'text-anchor': 'end', 'font-size': 12 });

  function panel(py, east) {
    var g = D.e('g', { 'data-part': 'panel', 'data-east': east ? 1 : 0 });
    var e = function (n, a) { return D.e(n, a, g); };
    var ty = py + PH / 2, cx = W / 2, dir = east ? 1 : -1, i;
    e('line', { x1: 0, y1: py, x2: W, y2: py, stroke: D.line, 'stroke-width': 1 });
    D.t(16, py + 22, east ? 'GOING EAST' : 'GOING WEST', D.text, { 'font-weight': 700 });
    /*  north, for the reader who has lost it  */
    D.t(W - 22, py + 22, 'N', D.dim, { 'text-anchor': 'middle', 'font-weight': 700 });
    arrow(W - 22, py + 48, W - 22, py + 30, D.dim, 1.5, 1);
    /*  the track, with its head the way the low goes  */
    e('line', { x1: 24, y1: ty, x2: W - 24, y2: ty, stroke: warn, 'stroke-width': 1.5, 'stroke-dasharray': '6 5',
                'stroke-opacity': 0.8, 'data-part': 'track' });
    var hx = east ? W - 24 : 24;
    e('path', { d: 'M' + hx + ',' + ty + 'L' + (hx - 16 * dir) + ',' + (ty - 8) + 'L' + (hx - 16 * dir) + ',' + (ty + 8) + 'Z',
                fill: warn, 'data-part': 'track-head' });
    var lows = [];
    for (i = 0; i < 3; i++) {
      var lx = cx + (i - 1) * DX * dir;
      lows.push(lx);
      e('circle', { cx: lx, cy: ty, r: 44, fill: ground, 'fill-opacity': 0.85 });
      /*  two isobars round it (the XO's note for AQN: the low itself, its
          isobars and its circulating wind), with the wind arrows between
          them crossing in toward the centre  */
      [20, 40].forEach(function (r) {
        e('circle', { cx: lx.toFixed(1), cy: ty, r: r, fill: 'none', stroke: warn, 'stroke-width': 1,
                      'stroke-opacity': 0.45 * OP[i] + 0.15, 'data-part': 'isobar', 'data-t': i + 1 });
      });
      for (var be = 0; be < 360; be += 45) {
        var px = lx + 30 * Math.sin(be * RAD), qy = ty - 30 * Math.cos(be * RAD);
        var hd = (north ? be - 105 : be + 105) * RAD;
        arrow(px - 7 * Math.sin(hd), qy + 7 * Math.cos(hd), px + 7 * Math.sin(hd), qy - 7 * Math.cos(hd),
              warn, 1.8, OP[i], { 'data-part': 'spin', 'data-t': i + 1, 'data-b': be });
      }
      e('circle', { cx: lx.toFixed(1), cy: ty, r: 12, fill: ground, stroke: warn, 'stroke-width': 2.2,
                    'stroke-opacity': OP[i], 'data-part': 'low', 'data-t': i + 1 });
      D.t(lx, ty + 4.5, 'L', warn, { 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle', 'fill-opacity': OP[i] });
      D.t(lx, ty - 50, 'at ' + (i + 1), warn, { 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
    }
    /*  the two boats: north of the track (side +1) and south of it  */
    [1, -1].forEach(function (side) {
      var bx = cx, by = ty - side * DY, from = [], k;
      for (k = 0; k < 3; k++) {
        /*  the bearing from the boat to the low, then the circulation  */
        var brg = Math.atan2(lows[k] - bx, by - ty) / RAD;
        var f = (((north ? brg - 105 : brg + 105) % 360) + 360) % 360;
        from.push(f);
        var x1 = bx + 58 * Math.sin(f * RAD), y1 = by - 58 * Math.cos(f * RAD);
        var x2 = bx + 14 * Math.sin(f * RAD), y2 = by - 14 * Math.cos(f * RAD);
        arrow(x1, y1, x2, y2, D.acc, 3.5, OP[k],
              { 'data-part': 'wind', 'data-t': k + 1, 'data-side': side });
        /*  the label just past the arrow's tail, set to the side away
            from it, as the wind and low labels are on the wind card  */
        var sn = Math.sin(f * RAD), cn = Math.cos(f * RAD);
        D.t(bx + 66 * sn, by - 66 * cn + (cn > 0.5 ? -2 : cn < -0.5 ? 11 : 4.5), (k + 1) + ' ' + nm(f), D.acc,
            { 'text-anchor': sn > 0.3 ? 'start' : sn < -0.3 ? 'end' : 'middle', 'font-size': 12, 'font-weight': 700,
              'data-part': 'wind-label', 'data-t': k + 1, 'data-side': side });
      }
      e('circle', { cx: bx, cy: by, r: 6, fill: D.text, 'data-part': 'boat', 'data-side': side });
      var turn = ((from[2] - from[0] + 540) % 360) - 180, veer = turn > 0;
      var y0 = side > 0 ? ty - 150 : ty + 104;
      D.t(16, y0, 'A boat ' + (side > 0 ? 'north' : 'south') + ' of the track:', D.text, { 'font-size': 13 });
      D.t(16, y0 + 18, 'the wind ' + (veer ? 'VEERS' : 'BACKS'), D.acc,
          { 'font-size': 14, 'font-weight': 700, 'data-part': 'word', 'data-side': side });
      D.t(16, y0 + 35, nm(from[0]) + ', then ' + nm(from[1]) + ', then ' + nm(from[2]), D.dim, { 'font-size': 12 });
      D.t(16, y0 + 51, 'the low passes to its ' + (side > 0 ? 'south' : 'north'), D.dim,
          { 'font-size': 12, 'data-part': 'passes', 'data-side': side });
    });
  }
  panel(TOP, true);
  panel(TOP + PH, false);
  D.t(16, H - 14, 'Looking the way the low goes: on its right the wind veers, on its left it backs.', D.text,
      { 'font-size': 13, 'font-weight': 600, 'data-part': 'rule' });
  host.appendChild(D.wrap);
}

/*  FRONTS, LOOKED DOWN ON (W20, weather 1.0.10; Larry, ATR, 18 November
    2026).  The browser's drawing of the model in wx.js (WX.frP, frFrom,
    frGlass), the one fronts_figure() in grid.awk draws in characters: a
    northern-hemisphere low going east, its warm and cold fronts, its
    isobars every 4 hPa (traced from the model by marching squares), its
    own wind (Larry, 18 November: a figure that describes the wind in a low
    shows the low itself, with its wind arrows), and two boats drawn as
    hulls (Larry, ATR) that stay put while the low goes by: boat A south of
    its track, boat B north.  Under the map, what each boat meets, in
    order.  The wind and the glass are worked from the model; the sky and
    the air are Bowditch's (2017, 3812).  docs/web/tests/weather-fronts.js
    holds the model to the awk's and reads the figure back off the drawing.  */
function frontsDemo(host) {
  var W = 640, X0 = -760, X1 = 860, Y0 = -600, Y1 = 480, K = W / (X1 - X0);
  var MT = 58, MH = (Y1 - Y0) * K, ST = MT + MH + 18, H = ST + 300;
  var RAD = Math.PI / 180;
  var A = WX.FR_A, B = WX.FR_B;
  var D = demoSvg('frontdemo', W, H,
    'A low going east with a warm front and a cold front, looked down on, northern hemisphere. ' +
    'Boat A, south of its track, has both fronts pass over her and the wind veers in two jumps, ' +
    A.x.map(function (x) { return WX.pt16(WX.frFrom(x, A.y)); }).join(', ') + '. Boat B, north of it, has no front ' +
    'pass and the wind backs steadily, ' + B.x.map(function (x) { return WX.pt16(WX.frFrom(x, B.y)); }).join(', ') + '.');
  var cs = getComputedStyle(document.documentElement);
  var tk = function (k) { return cs.getPropertyValue(k).trim(); };
  var warn = tk('--warn') || tk('--bad') || '#e23a2c', ground = tk('--ground') || '#07090b';
  var X = function (x) { return (x - X0) * K; }, Y = function (y) { return MT + (Y1 - y) * K; };
  var f1 = function (v) { return v.toFixed(1); };
  D.svg.setAttribute('data-k', K); D.svg.setAttribute('data-x0', X0); D.svg.setAttribute('data-y1', Y1); D.svg.setAttribute('data-mt', MT);
  var arrow = function (x1, y1, x2, y2, col, w, op, attrs) {
    var o = { x1: f1(x1), y1: f1(y1), x2: f1(x2), y2: f1(y2), stroke: col, 'stroke-width': w,
              'stroke-linecap': 'round', 'stroke-opacity': op }, k;
    for (k in (attrs || {})) o[k] = attrs[k];
    D.e('line', o);
    var an = Math.atan2(y2 - y1, x2 - x1), h = w * 2.2 + 3;
    D.e('path', { d: 'M' + f1(x2) + ',' + f1(y2) + 'L' + f1(x2 - h * Math.cos(an - 0.45)) + ',' + f1(y2 - h * Math.sin(an - 0.45)) +
                     'L' + f1(x2 - h * Math.cos(an + 0.45)) + ',' + f1(y2 - h * Math.sin(an + 0.45)) + 'Z', fill: col, 'fill-opacity': op });
  };
  D.t(16, 22, 'A FRONTAL LOW PASSING TWO BOATS, LOOKED DOWN ON', D.text, { 'font-weight': 600 });
  D.t(16, 40, 'northern hemisphere; the low moves east at 30 knots and the boats stay put, so each runs through it right to left',
      D.dim, { 'font-size': 11 });

  /*  the isobars: marching squares on a 20 nm lattice, every 4 hPa  */
  var S = 20, nx = (X1 - X0) / S, ny = (Y1 - Y0) / S, P = [], i, j;
  for (j = 0; j <= ny; j++) { P[j] = []; for (i = 0; i <= nx; i++) P[j][i] = WX.frP(X0 + i * S, Y1 - j * S); }
  for (var lv = 992; lv <= 1028; lv += 4) {
    var d = '';
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var c = [P[j][i], P[j][i + 1], P[j + 1][i + 1], P[j + 1][i]];
      var q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], pts = [];
      for (var e = 0; e < 4; e++) {
        var a = c[e], b = c[(e + 1) % 4];
        if ((a < lv) !== (b < lv)) {
          var t = (lv - a) / (b - a), A0 = q[e], B0 = q[(e + 1) % 4];
          pts.push([X(X0 + (A0[0] + t * (B0[0] - A0[0])) * S), Y(Y1 - (A0[1] + t * (B0[1] - A0[1])) * S)]);
        }
      }
      for (var m = 0; m + 1 < pts.length; m += 2) d += 'M' + f1(pts[m][0]) + ',' + f1(pts[m][1]) + 'L' + f1(pts[m + 1][0]) + ',' + f1(pts[m + 1][1]);
    }
    if (d) D.e('path', { d: d, fill: 'none', stroke: D.dim, 'stroke-width': 1, 'stroke-opacity': 0.8, 'data-part': 'isobar', 'data-hpa': lv });
  }
  /*  the low's own wind, on a lattice  */
  for (var gx = -600; gx <= 800; gx += 160) for (var gy = 400; gy >= -560; gy -= 160) {
    if (Math.abs(gx) < 100 && Math.abs(gy) < 100) continue;
    var f = WX.frFrom(gx, gy) * RAD, L = 11;
    var cx = X(gx), cy = Y(gy), dx = -L * Math.sin(f), dy = L * Math.cos(f);
    arrow(cx - dx, cy - dy, cx + dx, cy + dy, warn, 1.3, 0.5, { 'data-part': 'spin', 'data-x': gx, 'data-y': gy });
  }
  /*  the fronts, with their barbs on the side they move toward (east)  */
  function front(L, warm) {
    var col = warm ? warn : D.acc, dd = '', s, k;
    L.forEach(function (p, n) { dd += (n ? 'L' : 'M') + f1(X(p[0])) + ',' + f1(Y(p[1])); });
    D.e('path', { d: dd, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round',
                  'data-part': warm ? 'warm-front' : 'cold-front' });
    var segs = [], tot = 0;
    for (k = 0; k + 1 < L.length; k++) {
      var ax = X(L[k][0]), ay = Y(L[k][1]), bx = X(L[k + 1][0]), by = Y(L[k + 1][1]), len = Math.hypot(bx - ax, by - ay);
      segs.push([ax, ay, bx, by, len]); tot += len;
    }
    for (s = 22; s < tot - 8; s += 34) {
      var acc = 0;
      for (k = 0; k < segs.length; k++) { if (acc + segs[k][4] >= s) break; acc += segs[k][4]; }
      var g = segs[Math.min(k, segs.length - 1)], tt = (s - acc) / g[4];
      var px = g[0] + tt * (g[2] - g[0]), py = g[1] + tt * (g[3] - g[1]);
      var ux = (g[2] - g[0]) / g[4], uy = (g[3] - g[1]) / g[4], vx = -uy, vy = ux;
      if (vx < 0) { vx = -vx; vy = -vy; }
      if (warm) D.e('path', { d: 'M' + f1(px - 7 * ux) + ',' + f1(py - 7 * uy) + 'A7,7 0 0 ' + (vx * uy - vy * ux > 0 ? 1 : 0) + ' ' +
                                  f1(px + 7 * ux) + ',' + f1(py + 7 * uy) + 'Z', fill: col });
      else D.e('path', { d: 'M' + f1(px - 7 * ux) + ',' + f1(py - 7 * uy) + 'L' + f1(px + 7 * ux) + ',' + f1(py + 7 * uy) +
                             'L' + f1(px + 11 * vx) + ',' + f1(py + 11 * vy) + 'Z', fill: col });
    }
  }
  front(WX.FR_W, true); front(WX.FR_C, false);
  D.e('circle', { cx: X(0), cy: Y(0), r: 11, fill: ground, stroke: warn, 'stroke-width': 2.5, 'data-part': 'low' });
  D.t(X(0), Y(0) + 4.5, 'L', warn, { 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle' });
  D.t(X(380), Y(-60), 'warm front', warn, { 'font-size': 11, 'font-weight': 700 });
  D.t(X(-330), Y(-470), 'cold front', D.acc, { 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end' });
  D.t(X(240), Y(-450), 'warm sector', warn, { 'font-size': 11 });
  D.t(X(-700), Y(80), 'cold air', D.dim, { 'font-size': 11 });
  arrow(X(480), Y(420), X(720), Y(420), warn, 3, 1, { 'data-part': 'motion' });
  D.t(X(600), Y(420) - 8, 'the low moves east', warn, { 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
  D.t(W - 18, MT + 16, 'N', D.dim, { 'text-anchor': 'middle', 'font-weight': 700 });
  arrow(W - 18, MT + 40, W - 18, MT + 22, D.dim, 1.4, 1);

  /*  the boats' runs and the boats, drawn as hulls, bow to the north  */
  function hull(cx, cy, attrs) {
    var o = { d: 'M' + f1(cx) + ',' + f1(cy - 11) + 'C' + f1(cx + 5) + ',' + f1(cy - 6) + ' ' + f1(cx + 5.5) + ',' + f1(cy + 2) + ' ' +
                 f1(cx + 4.5) + ',' + f1(cy + 9) + 'L' + f1(cx - 4.5) + ',' + f1(cy + 9) + 'C' + f1(cx - 5.5) + ',' + f1(cy + 2) + ' ' +
                 f1(cx - 5) + ',' + f1(cy - 6) + ' ' + f1(cx) + ',' + f1(cy - 11) + 'Z', fill: D.text, stroke: ground, 'stroke-width': 1 }, k;
    for (k in attrs) o[k] = attrs[k];
    D.e('path', o);
  }
  [[A, 'A', ['1', '2', '3', '4', '5']], [B, 'B', ['a', 'b', 'c']]].forEach(function (bt) {
    var R = bt[0], yy = Y(R.y);
    D.e('line', { x1: X(X1 - 45), y1: yy, x2: X(X0 + 30), y2: yy, stroke: D.text, 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.7 });
    D.t(X(X1 - 20), yy + 4, bt[1], D.text, { 'font-size': 13, 'font-weight': 700, 'text-anchor': 'end', 'data-part': 'run-label' });
    R.x.forEach(function (x, n) {
      var fr = WX.frFrom(x, R.y), fb = fr * RAD, cx = X(x), cy = yy;
      arrow(cx + 40 * Math.sin(fb), cy - 40 * Math.cos(fb), cx + 13 * Math.sin(fb), cy - 13 * Math.cos(fb), D.acc, 2.6, 1,
            { 'data-part': 'wind', 'data-boat': bt[1], 'data-i': n + 1, 'data-from': fr.toFixed(2) });
      hull(cx, cy, { 'data-part': 'boat', 'data-boat': bt[1], 'data-i': n + 1, 'data-x': x, 'data-y': R.y });
      var lx = cx + (Math.sin(fb) < 0 ? 9 : -9);
      D.t(lx, cy + 18, bt[2][n], D.text, { 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', 'data-part': 'boat-label' });
    });
  });

  /*  what boat A meets, in order; then boat B  */
  var wrap = function (s, n) { var w = s.split(' '), out = [], cur = ''; w.forEach(function (x) { if ((cur + ' ' + x).trim().length > n) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); }); if (cur) out.push(cur); return out; };
  D.e('line', { x1: 0, y1: ST - 10, x2: W, y2: ST - 10, stroke: D.line, 'stroke-width': 1 });
  D.t(16, ST + 8, 'What boat A meets, in order: she is south of the track, and both fronts pass over her', D.text, { 'font-weight': 600, 'font-size': 13 });
  A.x.forEach(function (x, n) {
    var cx = 16 + n * 125, y = ST + 34, fr = WX.frFrom(x, A.y);
    D.t(cx, y, (n + 1) + '', D.text, { 'font-size': 13, 'font-weight': 700 });
    wrap(A.stage[n], 17).forEach(function (s, k) { D.t(cx + 13, y + k * 14, s, D.text, { 'font-size': 11, 'font-weight': 700 }); });
    D.t(cx, y + 42, 'wind from ' + WX.pt16(fr), D.acc, { 'font-size': 12, 'font-weight': 700, 'data-part': 'strip-wind', 'data-i': n + 1 });
    D.t(cx, y + 60, 'glass ' + WX.frBand(x, A.y), D.text, { 'font-size': 11, 'data-part': 'strip-glass', 'data-i': n + 1 });
    wrap(A.sky[n], 21).forEach(function (s, k) { D.t(cx, y + 78 + k * 14, s, D.text, { 'font-size': 11 }); });
    D.t(cx, y + 112, 'air: ' + A.air[n], D.dim, { 'font-size': 11 });
  });
  var bw = B.x.map(function (x) { return WX.pt16(WX.frFrom(x, B.y)); });
  D.t(16, ST + 178, 'Boat A: the wind VEERS, in two jumps, at the warm front and at the cold front.', D.acc,
      { 'font-size': 12, 'font-weight': 700, 'data-part': 'a-word' });
  D.t(16, ST + 200, 'Boat B, north of the track: no front passes over her; the wind BACKS steadily, ' + bw.join(', ') + '.', D.acc,
      { 'font-size': 12, 'font-weight': 700, 'data-part': 'b-word' });
  D.t(16, ST + 226, 'Looking the way the low goes: on its right the wind veers, on its left it backs.', D.text,
      { 'font-size': 12, 'font-weight': 600, 'data-part': 'rule' });
  D.t(16, ST + 246, 'The wind and the glass are worked from the drawn pressure; the sky and the air are Bowditch’s (2017, 3812).',
      D.dim, { 'font-size': 10.5 });
  D.t(16, ST + 262, 'Isobars every 4 hPa. Thin arrows: the low’s own wind. Bold arrows: the wind at each boat.',
      D.dim, { 'font-size': 10.5 });
  host.appendChild(D.wrap);
}


function gunDemo(host) {
  var NS = 'http://www.w3.org/2000/svg';
  /*  THE CIRCLE HAS TO FIT, and the box is square now. With a half-circle
      the gun sat 40 px off the bottom edge and the picture only had to
      hold the top half; a full 360 puts the gun at the CENTRE and needs
      the same clearance in every direction. The radius is bounded by the
      half-width less a margin, and the margin carries three things: the
      compass labels, which sit 14 px outside the circle, the text above
      them, and the drawn offset, which at the exaggeration below reaches
      about thirty pixels beyond it. 132 + 14 + text is inside 180.  */
  var W = 360, H = 360, cx = W / 2, cy = H / 2;    /* the gun, dead centre  */
  var R = 132;                                      /* the range, in pixels  */
  /*  THE EXAGGERATION IS DERIVED, NOT CHOSEN. Fixed at 60 the drawing left
      the box: trained due east at 80 degrees the deflection is to the
      right of east, which is downward, and it ran past the bottom edge.
      So the factor is whatever maps the LARGEST deflection the controls
      can reach - the poles, where sin(latitude) is 1 - onto a fixed pixel
      budget. Every other setting then draws proportionally smaller, which
      is the property that matters: the track's length is true to the real
      deflection even though its scale is not, so dragging the latitude
      slider shows the sin(latitude) law and not an artefact of fitting.  */
  /*  WITH THREE COMPONENTS THE WORST CASE IS NO LONGER OBVIOUS. It used
      to be "the poles, where sin(latitude) is 1". It is not: the westward
      RISE term subtracts from the drift on one bearing and adds on the
      opposite one, and the range change is largest at the EQUATOR where
      the drift is smallest. So rather than reason about which corner
      wins, scan what the controls can actually reach and take the
      largest total. It comes out 264 m, at 71 S trained north.  */
  var budget = 30;                                  /* px, the largest offset drawn */
  var dmax = 0, _la, _br, _s, _m;
  for (_la = -80; _la <= 80; _la++) {
    for (_br = -180; _br <= 180; _br += 5) {
      _s = gunSolve(_la, _br);
      _m = Math.sqrt(_s.drift * _s.drift + _s.along * _s.along);
      if (_m > dmax) dmax = _m;
    }
  }
  GUN.exagg = budget / (dmax / GUN.range * R);
  var wrap = el('div', 'gundemo');
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  wrap.appendChild(svg);

  function e(n, a, p) {
    var x = document.createElementNS(NS, n), q;
    for (q in a) if (a.hasOwnProperty(q)) x.setAttribute(q, a[q]);
    (p || svg).appendChild(x);
    return x;
  }
  var css = function (n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
  };

  /*  the parts that never move, drawn once  */
  /*  THE WARNING COLOUR HAS TWO NAMES IN THIS SUITE.  celnav and the
      launcher call it --warn; weather, tides, drill and deck-log call it
      --bad.  Asking for one name only meant this figure drew its warning
      in the css() fallback - a blue - in EVERY mode since it was written,
      which the day palette made visible: a pale blue on white reads as
      ordinary ink, not as a caution.  Ask for both names and take
      whichever the host stylesheet actually defines.  */
  var warnTok = function () {
    var cs = getComputedStyle(document.documentElement);
    return cs.getPropertyValue('--warn').trim() ||
           cs.getPropertyValue('--bad').trim() || '#e23a2c';
  };
  var dim = css('--dim'), line = css('--line'), acc = css('--accent'),
      text = css('--text'), warn = warnTok();
  var gArc = e('g'), gAim = e('g'), gTrack = e('g'), gMark = e('g'), gLbl = e('g');

  /*  the circle the gun can be trained through, and the compass rose on it.
      THE LABELS GO RADIALLY OUTWARD, not above the point. With a half
      circle every label sat in the top half and "above" was always
      outside; on a full circle "above" puts S, SE and SW INSIDE the
      drawing, where the track runs through them. So each one is pushed
      out along its own bearing, and the baseline nudge keeps the text
      optically centred on that point rather than hanging off it.  */
  e('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: line, 'stroke-width': 1 }, gArc);
  [['N', 0], ['NE', 45], ['E', 90], ['SE', 135],
   ['S', 180], ['SW', -135], ['W', -90], ['NW', -45]].forEach(function (c) {
    var a = c[1] * Math.PI / 180;
    var x = cx + R * Math.sin(a), y = cy - R * Math.cos(a);
    var lx = cx + (R + 14) * Math.sin(a), ly = cy - (R + 14) * Math.cos(a);
    e('circle', { cx: x, cy: y, r: 1.6, fill: dim }, gArc);
    e('text', { x: lx, y: ly + 3.5, fill: dim, 'font-size': 10,
                'text-anchor': 'middle' }, gArc).textContent = c[0];
  });
  e('circle', { cx: cx, cy: cy, r: 4, fill: text }, gArc);

  var aimLine = e('line', { stroke: dim, 'stroke-width': 1,
                            'stroke-dasharray': '4 4' }, gAim);
  var aimDot  = e('circle', { r: 3.5, fill: 'none', stroke: dim, 'stroke-width': 1.2,
                              'data-pt': 'aim' }, gAim);
  var track   = e('polyline', { fill: 'none', stroke: acc, 'stroke-width': 2,
                                'stroke-linecap': 'round' }, gTrack);
  var shell   = e('circle', { r: 3.5, fill: acc, opacity: 0, 'data-pt': 'shell' }, gMark);
  var fall    = e('circle', { r: 4, fill: 'none', stroke: acc, 'stroke-width': 1.6,
                              opacity: 0, 'data-pt': 'fall' }, gMark);
  var gapLine = e('line', { stroke: warn, 'stroke-width': 1.4, opacity: 0 }, gMark);

  /*  where the shell is after a fraction t of its flight, in pixels.
      Along the line of fire it goes R*t; across it, the deflection grows
      as t squared, which is what a steady sideways acceleration does.  */
  function at(t) {
    var a = GUN.brg * Math.PI / 180, k = R / GUN.range * GUN.exagg;
    var s = gunSolve(GUN.lat, GUN.brg);
    /*  BOTH OFFSETS GROW AS t SQUARED, which is what a steady
        acceleration does to a displacement. For the drift that is exact.
        For the range it is a drawing rather than a trajectory: the real
        Eoetvoes displacement that grows as t^2 is the shell's extra
        HEIGHT, and it only becomes range at impact, when the shell flies
        on past the moment it would have landed. Drawing it as a
        lengthening track is the honest picture of the same quantity -
        the fall mark ends up where the shell ends up - and it keeps the
        parabola the lesson is about.  */
    var along = R * t + s.along * k * t * t;
    var cross = s.drift * k * t * t;
    //  +cross is to the RIGHT of the line of fire
    var ux = Math.sin(a), uy = -Math.cos(a);          /* along, screen y down */
    var rx = -uy, ry = ux;                            /* 90 deg right of it   */
    return [cx + ux * along + rx * cross, cy + uy * along + ry * cross];
  }

  function redraw(t) {
    var a = GUN.brg * Math.PI / 180;
    var ax = cx + R * Math.sin(a), ay = cy - R * Math.cos(a);
    aimLine.setAttribute('x1', cx); aimLine.setAttribute('y1', cy);
    aimLine.setAttribute('x2', ax); aimLine.setAttribute('y2', ay);
    aimDot.setAttribute('cx', ax); aimDot.setAttribute('cy', ay);

    var pts = [], i, n = 48;
    for (i = 0; i <= n * t; i++) pts.push(at(i / n).map(function (v) { return v.toFixed(1); }).join(','));
    track.setAttribute('points', pts.join(' '));

    var p = at(t);
    shell.setAttribute('cx', p[0]); shell.setAttribute('cy', p[1]);
    shell.setAttribute('opacity', t > 0 && t < 1 ? 1 : 0);

    var done = (t >= 1);
    var f = at(1);
    fall.setAttribute('cx', f[0]); fall.setAttribute('cy', f[1]);
    fall.setAttribute('opacity', done ? 1 : 0);
    gapLine.setAttribute('x1', ax); gapLine.setAttribute('y1', ay);
    gapLine.setAttribute('x2', f[0]); gapLine.setAttribute('y2', f[1]);
    gapLine.setAttribute('opacity', done ? 1 : 0);

    var sv = gunSolve(GUN.lat, GUN.brg);
    svg.setAttribute('aria-label',
      'A gun at ' + GUN.lat.toFixed(0) + ' degrees latitude trained ' +
      gunBearingName() + '. The shell falls ' +
      Math.abs(sv.drift).toFixed(0) + ' metres to the ' +
      (sv.drift >= 0 ? 'right' : 'left') + ' of the aim and ' +
      Math.abs(sv.along).toFixed(0) + ' metres ' +
      (sv.along >= 0 ? 'long' : 'short') + '.');
  }

  /*  EIGHT POINTS, NOT FIVE. The name is what the readout and the
      figure's own aria-label both say, so a sector the slider can reach
      and the namer cannot would leave the picture describing itself
      wrongly. Sectors are 45 degrees wide and centred on their point,
      which puts every boundary on a 22.5 and means no value of the
      slider falls outside one.  */
  function gunBearingName() {
    var b = GUN.brg;
    if (b < -157.5) return 'south';
    if (b < -112.5) return 'south-west';
    if (b < -67.5) return 'west';
    if (b < -22.5) return 'north-west';
    if (b <= 22.5) return 'north';
    if (b <= 67.5) return 'north-east';
    if (b <= 112.5) return 'east';
    if (b <= 157.5) return 'south-east';
    return 'south';
  }

  /* ---- the controls ------------------------------------------------ */
  var ctl = el('div', 'gunctl');
  function slider(id, label, min, max, step, value, fmt, onInput) {
    var l = el('label', null, '');
    var span = el('span', 'gunval', '');
    l.appendChild(document.createTextNode(label + ' '));
    l.appendChild(span);
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = value;
    inp.id = id;
    l.appendChild(inp);
    function sync() { span.textContent = fmt(parseFloat(inp.value)); }
    inp.addEventListener('input', function () { sync(); onInput(parseFloat(inp.value)); });
    sync();
    ctl.appendChild(l);
    return inp;
  }

  var readout = el('p', 'gunread', '');

  /*  THE THREE COMPONENTS, NAMED, because one number was hiding two
      mechanisms. The reader gets what the gun captain corrects for - a
      drift and a range - and under it the three causes that add up to
      them, each with the term it comes from. Reporting a single total is
      what prompted the question in the first place: the total across the
      track is the same for a shot fired east as for one fired north, and
      that looks like a bug until you can see it arrives by a different
      route.  */
  var comp = el('div', 'guncomp');
  function comprow(name, rule) {
    var r = el('div', 'gcrow');
    r.appendChild(el('span', 'gcn', name));
    var v = el('span', 'gcv', '');
    r.appendChild(v);
    r.appendChild(el('span', 'gcr', rule));
    comp.appendChild(r);
    return v;
  }
  var vTurn = comprow('turning with the earth', '2\u03a9\u00b7V\u00b7sin \u03c6 \u2014 any bearing');
  var vEot  = comprow('the E\u00f6tv\u00f6s effect', '2\u03a9\u00b7u\u00b7cos \u03c6 \u2014 east\u2013west only');
  var vRise = comprow('its own climb and fall', '2\u03a9\u00b7w\u00b7cos \u03c6 \u2014 always west');

  function gunWhere() {
    if (Math.abs(GUN.lat) < 0.5) return 'on the equator';
    return 'from ' + Math.abs(GUN.lat).toFixed(0) + '\u00b0 ' + (GUN.lat >= 0 ? 'N' : 'S');
  }
  function m(x, pos, neg) {
    return Math.abs(x).toFixed(0) + ' m ' + (x >= 0 ? pos : neg);
  }
  function say() {
    var s = gunSolve(GUN.lat, GUN.brg);
    vTurn.textContent = m(s.turn, 'right', 'left');
    vEot.textContent  = Math.abs(s.eotvos) < 0.5 ? 'nothing here'
                                                 : m(s.eotvos, 'long', 'short');
    vRise.textContent = s.rise.toFixed(0) + ' m west';

    var bits = [];
    if (Math.abs(s.drift) >= 0.5)
      bits.push(m(s.drift, 'to the RIGHT', 'to the LEFT') + ' of the aim');
    if (Math.abs(s.along) >= 0.5) bits.push(m(s.along, 'LONG', 'SHORT'));
    var t = 'Trained ' + gunBearingName() + ' ' + gunWhere() + ': the shell falls ' +
            (bits.length ? bits.join(', and ') + '.' : 'where it was aimed.');

    /*  THE EQUATOR USED TO SAY "the shell falls where it was aimed", and
        that was the old single-term answer talking. sin(0) is zero, so
        nothing TURNS it - which is still why no cyclone forms here - but
        the shell is not undeflected: fired north on the equator it goes
        87 m west, all of it the climb-and-fall term, which is largest
        exactly where the turning term vanishes.  */
    if (Math.abs(s.turn) < 0.5) {
      t += ' sin(latitude) is zero here, so nothing turns it \u2014 which is also ' +
           'why no cyclone forms on the equator. What is left is the shell\u2019s own ' +
           'climb and fall, and that is at its largest here.';
    }
    readout.textContent = t;
  }

  slider('gun-brg', 'Train the gun', -180, 180, 1, GUN.brg,
         function (v) { GUN.brg = v; return gunBearingName(); },
         function (v) { GUN.brg = v; redraw(shown); say(); });
  slider('gun-lat', 'Latitude', -80, 80, 1, GUN.lat,
         function (v) { return Math.abs(v).toFixed(0) + '\u00b0 ' + (v >= 0 ? 'N' : 'S'); },
         function (v) { GUN.lat = v; redraw(shown); say(); });

  var fire = el('button', 'btn wide', 'Fire');
  ctl.appendChild(fire);
  wrap.appendChild(ctl);
  wrap.appendChild(readout);
  wrap.appendChild(comp);
  wrap.appendChild(el('p', 'note',
    'Every figure is real for the latitude and the bearing on the dials. The track is ' +
    'drawn with both offsets exaggerated \u00d7' + GUN.exagg.toFixed(0) + ', because at true scale the ' +
    'largest of them is about two hundred and sixty metres in thirty-eight kilometres and you ' +
    'would not see it — which is the honest reason gunnery can ignore all three at short range ' +
    'and cannot at long. Vacuum and a flat earth, like the rest of the lesson: air resistance ' +
    'makes the climb and the fall unequal and changes the third figure.'));

  /*  the animation. prefers-reduced-motion is honoured by jumping
      straight to the fall rather than by refusing to show anything.  */
  var shown = 1, timer = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run() {
    if (timer) { cancelAnimationFrame(timer); timer = null; }
    if (reduce) { shown = 1; redraw(1); say(); return; }
    var t0 = null, dur = 1400;
    function step(ts) {
      if (t0 === null) t0 = ts;
      shown = Math.min(1, (ts - t0) / dur);
      redraw(shown);
      if (shown < 1) timer = requestAnimationFrame(step); else { timer = null; say(); }
    }
    shown = 0; redraw(0);
    timer = requestAnimationFrame(step);
  }
  fire.addEventListener('click', run);

  redraw(1); say();
  host.appendChild(wrap);
  return wrap;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { drawLines: drawLines, wxKind: wxKind, wxText: wxText,
                     wxJoin: wxJoin, wxSpans: wxSpans };
}

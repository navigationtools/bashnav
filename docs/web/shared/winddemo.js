/* =====================================================================
   THE WIND ROUND A LOW -- ONE COPY, LOADED TWICE.
   ---------------------------------------------------------------------
   This panel appears in two places: inside the coriolis lesson in the
   weather app, and in the header of the project's front page, where it is
   the first thing a visitor meets. Larry asked for the second, and asked
   for it to be the LIVE panel rather than a screenshot of one.

   So it lives here rather than in weather.js, and both pages load this
   file. That is the same rule the project applies to the shell and the
   browser builds: one implementation, checked once, so the thing on the
   front page cannot drift from the thing in the app. A second copy would
   have been quicker today and wrong by the third edit.

   WHAT IT NEEDS FROM ITS HOST. Four custom properties on :root --
   --accent, --dim, --text, and the warning colour, which is --warn in
   celnav and the launcher and --bad everywhere else; it asks for both and
   takes whichever the host defines. All read at draw time, so the figure
   takes whatever palette the page it is on uses, and redraws itself on
   visualmodechange when that palette moves. And the
   stylesheet beside this file, shared/demo.css, which carries every class
   the panel sets. Nothing else: no framework, no helper from weather.js,
   and its own el() below rather than the app's, so a page can load this
   on its own.

   THE PHYSICS, and the reason it is written down. Larry asked for the
   demonstration with the wind crossing the isobars LESS as the pressure
   gradient rose, centrifugal force being the cause, and asked for the
   science to be checked first. It does not work that way:

     1. In a frictionless balance the wind ALREADY follows the isobars
        exactly, at every gradient and latitude -- geostrophic, gradient
        and cyclostrophic alike. Nothing for centrifugal force to improve.
     2. FRICTION turns the wind across them, and with a linear drag the
        balance gives tan(alpha) = k/f exactly: the pressure gradient
        cancels out of the angle.
     3. With the quadratic drag water really has, the angle GROWS with the
        wind. A hurricane's boundary layer runs 20-30 degrees of inflow,
        which is the clearest refutation available.
     4. LATITUDE is the real dial, through f = 2*Omega*sin(lat).
     5. Centrifugal force changes the SPEED: subgeostrophic round a low,
        supergeostrophic round a high, and for a high a hard limit at
        f*f*R = 4G past which no solution exists at all -- which is why a
        deep tight low is ordinary and a tight intense high is not.

   src/weather/grid.awk carries the same reasoning beside the terminal's
   own figure, and docs/web/tests/weather-wind.js holds this to a balance
   written independently of it.
   ===================================================================== */
'use strict';

/*  the panel's own element helper. weather.js has one of its own and this
    deliberately does not use it: the front page loads this file and
    nothing else from the app.  */
function wdEl(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) { e.className = cls; }
  if (text !== undefined) { e.textContent = text; }
  return e;
}

var WIND = {
  OMEGA: 7.292115e-5,
  RHO: 1.225,
  RKM: 1000,                 /* km, the curvature of the drawn isobar  */
  lat: 45,                   /* degrees, + north                       */
  a45: 15,                   /* the observed inflow angle at 45, degrees */
  grad: 4,                   /* millibars per 100 km                   */
  low: true
};
function wxCor(lat) { return 2 * WIND.OMEGA * Math.sin(lat * Math.PI / 180); }
/*  the drag is pinned by what is observed - the inflow angle at 45 over a
    given surface - and the model carries it to other latitudes. The angle
    is the measurement; k is the fitted constant, not the other way round. */
function wxDrag(a45) { return Math.abs(wxCor(45)) * Math.tan(a45 * Math.PI / 180); }
function wxAlpha(lat, a45) {
  var f = Math.abs(wxCor(lat));
  if (f <= 0) return 90;
  return Math.atan2(wxDrag(a45), f) * 180 / Math.PI;
}
function wxPgf(mb100) { return (mb100 * 100 / 1e5) / WIND.RHO; }
/*  pressure against Coriolis AND curvature. -1 for a high too tight and
    too steep to exist, which is an answer and not an error: f*f*R < 4G
    has no root, and that is why tight intense highs do not occur.  */
function wxVgrad(mb100, lat, rkm, low) {
  var f = Math.abs(wxCor(lat)), g = wxPgf(mb100), r = rkm * 1000, d;
  if (f <= 0 || g <= 0) return 0;
  if (low) return r / 2 * (-f + Math.sqrt(f * f + 4 * g / r));
  d = f * f - 4 * g / r;
  if (d < 0) return -1;
  return r / 2 * (f - Math.sqrt(d));
}
var KN = 1.943844;

function windDemo(host) {
  var NS = 'http://www.w3.org/2000/svg';
  var W = 360, H = 360, cx = W / 2, cy = H / 2, R = 104;
  var wrap = wdEl('div', 'gundemo');
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
  var dim = css('--dim'), acc = css('--accent'),
      text = css('--text'), warn = warnTok();

  var gIso = e('g'), gTan = e('g'), gArr = e('g'), gLbl = e('g');

  /*  Three isobars for context, the middle one the arrows stand on - which
      makes it the SUBJECT of the drawing, and it is drawn strongest.

      All three take --dim, and the hierarchy is carried by width, dash and
      opacity alone.  --line is a hairline border colour: against its own
      ground it measures 1.39:1 in dark, 1.66:1 in day and 1.24:1 in night,
      so the middle isobar used to be the FAINTEST mark in a figure that is
      about it.  --dim is secondary text and reaches 6.55 / 6.40 / 2.24 on
      the same grounds, which is why it is the one to emphasise with.

      Not simply swapped: the outer two also carry opacity 0.6, and at that
      opacity --line falls to 1.18:1 and 1.34:1 - the context would have
      disappeared to buy the subject back.  Using one token for all three
      lifts the subject and leaves the context exactly as legible as it was.

      Night's numbers are lower throughout and that is the point, not a
      fault: the palette is dim on purpose and the bright mark in this
      figure is the wind arrow, in --accent.  */
  [R - 38, R, R + 38].forEach(function (rr, i) {
    e('circle', { cx: cx, cy: cy, r: rr, fill: 'none', stroke: dim,
                  'stroke-width': i === 1 ? 1.2 : 0.8,
                  'stroke-dasharray': i === 1 ? '' : '2 4',
                  opacity: i === 1 ? 1 : 0.6 }, gIso);
  });
  var centre = e('text', { x: cx, y: cy + 7, fill: acc, 'font-size': 20,
                           'text-anchor': 'middle', 'font-weight': 700 }, gIso);

  /*  THE ARROWHEAD IS DRAWN, not a marker. An SVG marker element inherits
      nothing useful when the figure is lifted out of the page into a
      standalone file by docs/web/gen/app-figures.js - the defs do not come
      with it - so each head is a triangle in the same group as its shaft. */
  var arrows = [], tangents = [];
  for (var i = 0; i < 8; i++) {
    tangents.push(e('line', { stroke: dim, 'stroke-width': 1,
                              'stroke-dasharray': '3 3' }, gTan));
    arrows.push({ shaft: e('line', { stroke: acc, 'stroke-width': 2,
                                     'stroke-linecap': 'round',
                                     'data-arrow': i }, gArr),
                  head: e('polygon', { fill: acc, 'data-head': i }, gArr) });
  }
  var none = e('text', { x: cx, y: cy + 46, fill: warn, 'font-size': 12,
                         'text-anchor': 'middle', opacity: 0 }, gLbl);

  /*  the longest arrow the sliders can reach, so the scale is derived
      rather than guessed and no setting can push one off the canvas  */
  var vmax = 0;
  for (var la = -80; la <= 80; la += 2) {
    for (var mb = 0.5; mb <= 8.001; mb += 0.5) {
      [true, false].forEach(function (lw) {
        var v = wxVgrad(mb, la, WIND.RKM, lw);
        if (v > 0) {
          var sp = v * Math.cos(wxAlpha(la, 40) * Math.PI / 180);
          if (sp > vmax) vmax = sp;
        }
      });
    }
  }
  var ARROW = 54 / vmax;              /* px per m/s */

  function draw() {
    var alpha = wxAlpha(WIND.lat, WIND.a45), al = alpha * Math.PI / 180;
    var vgr = wxVgrad(WIND.grad, WIND.lat, WIND.RKM, WIND.low);
    var impossible = (vgr < 0);
    var vs = impossible ? 0 : vgr * Math.cos(al);
    /*  anticlockwise positive: a low in the north and a high in the south
        both turn that way, the other two the other way  */
    var sense = (WIND.low ? 1 : -1) * (WIND.lat >= 0 ? 1 : -1);
    var radial = WIND.low ? -1 : 1;     /* in to a low, out of a high */
    centre.textContent = WIND.low ? 'L' : 'H';
    centre.setAttribute('fill', impossible ? warn : acc);

    for (var i = 0; i < 8; i++) {
      var th = i * 45 * Math.PI / 180;
      var ox = Math.sin(th), oy = Math.cos(th);          /* outward, E/N  */
      var tx = -oy, ty = ox;                             /* tangent, ccw  */
      var px = cx + R * ox, py = cy - R * oy;
      /*  the gradient wind: along the isobar, which is what a chart draws */
      var gx = sense * tx, gy = sense * ty;
      tangents[i].setAttribute('x1', px); tangents[i].setAttribute('y1', py);
      tangents[i].setAttribute('x2', px + gx * 30);
      tangents[i].setAttribute('y2', py - gy * 30);
      tangents[i].setAttribute('opacity', impossible ? 0 : 0.9);
      /*  the surface wind: that turned toward the low by alpha  */
      var wx_ = Math.cos(al) * sense * tx + Math.sin(al) * radial * ox;
      var wy_ = Math.cos(al) * sense * ty + Math.sin(al) * radial * oy;
      var L = vs * ARROW;
      var ex = px + wx_ * L, ey = py - wy_ * L;
      var a = arrows[i];
      a.shaft.setAttribute('x1', px); a.shaft.setAttribute('y1', py);
      a.shaft.setAttribute('x2', ex); a.shaft.setAttribute('y2', ey);
      a.shaft.setAttribute('opacity', impossible ? 0 : 1);
      /*  a triangle on the end, pointing along the shaft  */
      var hx = wx_, hy = -wy_, hn = Math.sqrt(hx * hx + hy * hy) || 1;
      hx /= hn; hy /= hn;
      var sx = -hy, sy = hx;
      var pts = [[ex + hx * 7, ey + hy * 7],
                 [ex - hx * 2 + sx * 4, ey - hy * 2 + sy * 4],
                 [ex - hx * 2 - sx * 4, ey - hy * 2 - sy * 4]];
      a.head.setAttribute('points', pts.map(function (q) {
        return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '));
      a.head.setAttribute('opacity', impossible ? 0 : 1);
    }
    none.setAttribute('opacity', impossible ? 1 : 0);
    none.textContent = impossible ? 'no wind can hold this up' : '';

    svg.setAttribute('aria-label', impossible
      ? 'A high of ' + WIND.grad.toFixed(1) + ' millibars per 100 kilometres at ' +
        Math.abs(WIND.lat).toFixed(0) + ' degrees latitude: no gradient wind solution exists.'
      : 'Eight arrows round a ' + (WIND.low ? 'low' : 'high') + ' at ' +
        Math.abs(WIND.lat).toFixed(0) + ' degrees latitude, each crossing the isobar at ' +
        alpha.toFixed(0) + ' degrees, at ' + (vs * KN).toFixed(0) + ' knots.');
    return { alpha: alpha, vgr: vgr, vs: vs, impossible: impossible };
  }

  /* ---- the controls ------------------------------------------------ */
  var ctl = wdEl('div', 'gunctl');
  function slider(id, label, min, max, step, value, fmt, onInput) {
    var l = wdEl('label', null, '');
    var span = wdEl('span', 'gunval', '');
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

  var readout = wdEl('p', 'gunread', '');
  var comp = wdEl('div', 'guncomp');
  function comprow(name, rule) {
    var r = wdEl('div', 'gcrow');
    r.appendChild(wdEl('span', 'gcn', name));
    var v = wdEl('span', 'gcv', '');
    r.appendChild(v);
    r.appendChild(wdEl('span', 'gcr', rule));
    comp.appendChild(r);
    return v;
  }
  var vAng  = comprow('crossing the isobar', 'tan \u03b1 = k / f \u2014 set by surface and latitude');
  var vGeo  = comprow('geostrophic', 'G / f \u2014 what the isobar spacing alone says');
  var vGrad = comprow('gradient wind', 'curvature added \u2014 along the isobar, above the friction');
  var vSfc  = comprow('surface wind', 'that turned and slowed by friction');

  function surfaceName(a) {
    if (a <= 14) return 'open water';
    if (a <= 20) return 'coastal water';
    if (a <= 28) return 'low land';
    return 'rough land';
  }
  function say() {
    var r = draw();
    var geo = wxPgf(WIND.grad) / Math.abs(wxCor(WIND.lat));
    vAng.textContent = r.alpha.toFixed(0) + '\u00b0 ' + (WIND.low ? 'inward' : 'outward');
    vGeo.textContent = isFinite(geo) ? (geo * KN).toFixed(0) + ' kn' : '\u2014';
    vGrad.textContent = r.impossible ? 'impossible' : (r.vgr * KN).toFixed(0) + ' kn';
    vSfc.textContent  = r.impossible ? '\u2014' : (r.vs * KN).toFixed(0) + ' kn';

    if (r.impossible) {
      readout.textContent = 'A high this steep and this tight cannot exist. The balance needs ' +
        'f\u00b2R to be at least 4G, and here it is not \u2014 there is no wind speed that holds ' +
        'this pressure field up. Which is why a deep tight low is ordinary and a tight ' +
        'intense high is not.';
      return;
    }
    readout.textContent = (WIND.low ? 'Round a low' : 'Round a high') + ' at ' +
      Math.abs(WIND.lat).toFixed(0) + '\u00b0 ' + (WIND.lat >= 0 ? 'N' : 'S') +
      ' over ' + surfaceName(WIND.a45) + ': the wind crosses the isobar at ' +
      r.alpha.toFixed(0) + '\u00b0, ' + (WIND.low ? 'into' : 'out of') + ' it, at ' +
      (r.vs * KN).toFixed(0) + ' kn. Curvature puts the gradient wind ' +
      (r.vgr > geo ? 'above' : 'below') + ' geostrophic; friction takes it down again.';
  }

  slider('wx-lat', 'Latitude', -80, 80, 1, WIND.lat,
         function (v) { return Math.abs(v).toFixed(0) + '\u00b0 ' + (v >= 0 ? 'N' : 'S'); },
         function (v) { WIND.lat = v; say(); });
  slider('wx-surf', 'Surface', 10, 40, 1, WIND.a45,
         function (v) { return surfaceName(v); },
         function (v) { WIND.a45 = v; say(); });
  slider('wx-grad', 'Pressure gradient', 5, 80, 1, WIND.grad * 10,
         function (v) { return (v / 10).toFixed(1) + ' mb / 100 km'; },
         function (v) { WIND.grad = v / 10; say(); });

  var flip = wdEl('button', 'wdbtn', 'Make it a high');
  flip.addEventListener('click', function () {
    WIND.low = !WIND.low;
    flip.textContent = WIND.low ? 'Make it a high' : 'Make it a low';
    say();
  });
  ctl.appendChild(flip);

  wrap.appendChild(ctl);
  wrap.appendChild(readout);
  wrap.appendChild(comp);
  wrap.appendChild(wdEl('p', 'wdnote',
    'Every figure is real for the dials. The isobars are drawn 1,000 km across, which is ' +
    'the curvature the gradient wind is computed for. Steady-state balances with the drag ' +
    'fitted to an observed angle, not a boundary-layer model: the wind at a masthead is ' +
    'lower again than this, because most of that reduction is shear between the anemometer ' +
    'and the gradient level rather than the balance.'));

  say();
  host.appendChild(wrap);
  return wrap;
}

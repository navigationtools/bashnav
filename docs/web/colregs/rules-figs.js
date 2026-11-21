/*  The rules lessons' figures, drawn as SVG (B30, after Larry's peer
    review of 21 November 2026: "lots of pictures").

    The shell draws each of these on its character grid in engine.awk,
    and under -v FIGDUMP=1 prints "@@FIG <kind> key=value ..." in its
    place instead. gen/make-colregs-web.sh carries that line into the
    lesson's body in data.js, and colregs.js hands it here. So the lesson
    says WHICH figure goes WHERE, and only the drawing is the browser's:
    the same move as contacts-figs.js, and the same reason. A picture of
    a terminal cannot follow the night palette or reflow on a phone.

    NOT ONE COLOUR IS NAMED IN THIS FILE. The elements carry classes and
    colregs.css carries the colours, so a figure follows the mode toggle
    with no redraw. The lights are drawn on the stage's night sky in
    every mode, as the lights drill draws them: a white light on a white
    page is invisible, and lights are seen at night. On the night
    palette every lamp is red, so every sector also carries its letter
    and its name, as everywhere else in this app.

    tests/rules-figs-check.js draws each figure, checks every class is
    in colregs.css, and holds the arcs drawn here to arc_vis() in
    colregs.js, the function the lights drill uses.  */
(function (root) {
'use strict';

var NS = 'http://www.w3.org/2000/svg';
function svg(w, h) {
  var s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  s.setAttribute('role', 'img');
  s.setAttribute('class', 'rf-fig');
  return s;
}
function el(tag, a, p) {
  var e = document.createElementNS(NS, tag), k;
  for (k in a) if (a.hasOwnProperty(k)) e.setAttribute(k, a[k]);
  if (p) p.appendChild(e);
  return e;
}
function txt(p, x, y, s, cls, anchor) {
  var t = el('text', { x: x, y: y, 'class': cls }, p);
  if (anchor) t.setAttribute('text-anchor', anchor);
  t.textContent = s;
  return t;
}
function sind(x) { return Math.sin(x * Math.PI / 180); }
function cosd(x) { return Math.cos(x * Math.PI / 180); }

/*  THE ARCS, as Rule 21 gives them, in degrees relative to her head,
    clockwise. Each sector runs from its first bearing to its second.
    The check walks every half degree round her and requires the sector
    named here to be the light arc_vis() says shows from there, so this
    table cannot teach an arc the drill does not use. (Dead ahead the
    drill shows both sidelights for 2.5 degrees either side, Annex I's
    allowance; the picture puts the boundary on the bow, where Rule 21
    puts it, and the check allows those 5 degrees.)  */
var ARCS = {
  mast: [-112.5, 112.5],   // Rule 21(a): 225 degrees
  stbd: [0, 112.5],        // Rule 21(b): 112.5
  port: [-112.5, 0],
  stern: [112.5, 247.5]    // Rule 21(c): 135
};

/*  a ring sector between radii r1 and r2, from bearing b1 to b2  */
function band(cx, cy, r1, r2, b1, b2) {
  var big = (b2 - b1) > 180 ? 1 : 0;
  function pt(r, b) { return (cx + r * sind(b)).toFixed(2) + ' ' + (cy - r * cosd(b)).toFixed(2); }
  return 'M ' + pt(r2, b1) + ' A ' + r2 + ' ' + r2 + ' 0 ' + big + ' 1 ' + pt(r2, b2) +
         ' L ' + pt(r1, b2) + ' A ' + r1 + ' ' + r1 + ' 0 ' + big + ' 0 ' + pt(r1, b1) + ' Z';
}

/* =====================================================================
   THE LIGHTS' ARCS, FROM ABOVE. L14 (mode=lights) and L8, Rule 13
   (mode=overtake, with the overtaking sector marked).

   Her lights seen from overhead, head up: the masthead light on the
   inner ring, the sidelights and the sternlight on the outer one. A
   ring is "what you see from that bearing", which is the habit the
   lesson teaches: read her aspect off her lights.
   ===================================================================== */
function arcs(b) {
  var over = b && b.mode === 'overtake';
  var W = 520, H = 470, cx = 260, cy = 232;
  var ro2 = 158, ro1 = 136, ri2 = 108, ri1 = 90;
  var s = svg(W, H);
  s.setAttribute('aria-label', over ?
    'Her lights from above, head up. Coming up from more than 22.5 degrees abaft ' +
    'either beam you see only her sternlight, white, 135 degrees: that sector is ' +
    'where a vessel is overtaking.' :
    'Her lights from above, head up: masthead light white, 225 degrees ahead; ' +
    'starboard sidelight green and port sidelight red, 112.5 degrees each; ' +
    'sternlight white, 135 degrees astern. The sidelights end 22.5 degrees abaft the beam.');

  el('rect', { x: 0, y: 0, width: W, height: H, 'class': 'rf-sky' }, s);

  /*  the overtaking sector, under everything: from the sternlight's
      ring in to her hull  */
  if (over) el('path', { d: band(cx, cy, 34, ro2, ARCS.stern[0], ARCS.stern[1]), 'class': 'rf-zone' }, s);

  /*  the beam, faint, so "abaft the beam" has a beam to be abaft of  */
  el('line', { x1: cx - ro2 - 14, y1: cy, x2: cx + ro2 + 14, y2: cy, 'class': 'rf-beam' }, s);

  /*  the rings  */
  el('path', { d: band(cx, cy, ro1, ro2, ARCS.stbd[0], ARCS.stbd[1]), 'class': 'rf-g' }, s);
  el('path', { d: band(cx, cy, ro1, ro2, ARCS.port[0], ARCS.port[1]), 'class': 'rf-r' }, s);
  el('path', { d: band(cx, cy, ro1, ro2, ARCS.stern[0], ARCS.stern[1]), 'class': 'rf-w' }, s);
  el('path', { d: band(cx, cy, ri1, ri2, ARCS.mast[0], ARCS.mast[1]), 'class': 'rf-w' }, s);

  /*  22.5 degrees abaft each beam: the edge between the sidelights and
      the sternlight, and the line Rule 13 draws  */
  [112.5, -112.5].forEach(function (a) {
    el('line', { x1: cx + 30 * sind(a), y1: cy - 30 * cosd(a),
                 x2: cx + (ro2 + 22) * sind(a), y2: cy - (ro2 + 22) * cosd(a), 'class': 'rf-edge' }, s);
  });

  /*  her, head up, about the size of the inner ring's hole  */
  el('path', { d: 'M ' + cx + ' ' + (cy - 34) + ' C ' + (cx + 15) + ' ' + (cy - 14) + ' ' +
               (cx + 13) + ' ' + (cy + 18) + ' ' + (cx + 9) + ' ' + (cy + 28) + ' L ' +
               (cx - 9) + ' ' + (cy + 28) + ' C ' + (cx - 13) + ' ' + (cy + 18) + ' ' +
               (cx - 15) + ' ' + (cy - 14) + ' ' + cx + ' ' + (cy - 34) + ' Z', 'class': 'rf-hull' }, s);

  /*  the letter on each sector, dark on the lamp, as the drill's keys  */
  function onBand(r, b, ch) {
    txt(s, (cx + r * sind(b)).toFixed(1), (cy - r * cosd(b) + 5).toFixed(1), ch, 'rf-on', 'middle');
  }
  onBand((ro1 + ro2) / 2, 56.25, 'G');
  onBand((ro1 + ro2) / 2, -56.25, 'R');
  onBand((ro1 + ro2) / 2, 180, 'W');
  onBand((ri1 + ri2) / 2, 0, 'M');

  /*  the words, each beside the thing it names, no leader lines  */
  txt(s, cx, 22, 'AHEAD', 'rf-dim', 'middle');
  txt(s, cx, 44, 'M  masthead light, 225°, inner ring', 'rf-lab', 'middle');
  txt(s, W - 8, 70, 'G  starboard', 'rf-lab', 'end');
  txt(s, W - 8, 88, 'sidelight', 'rf-lab', 'end');
  txt(s, W - 8, 106, '112.5°', 'rf-lab', 'end');
  txt(s, 8, 70, 'R  port', 'rf-lab');
  txt(s, 8, 88, 'sidelight', 'rf-lab');
  txt(s, 8, 106, '112.5°', 'rf-lab');
  txt(s, W - 8, cy - 8, 'beam', 'rf-dim', 'end');
  txt(s, 8, cy - 8, 'beam', 'rf-dim');
  txt(s, W - 8, cy + 96, '22.5° abaft', 'rf-lab', 'end');
  txt(s, W - 8, cy + 114, 'the beam', 'rf-lab', 'end');
  txt(s, 8, cy + 96, '22.5° abaft', 'rf-lab');
  txt(s, 8, cy + 114, 'the beam', 'rf-lab');
  txt(s, cx, H - 16, 'W  sternlight, 135°', 'rf-lab', 'middle');
  if (over) {
    txt(s, cx, cy + 66, 'OVERTAKING', 'rf-acc', 'middle');
    txt(s, cx, cy + 84, 'only her sternlight', 'rf-acc', 'middle');
  }
  return s;
}

/* =====================================================================
   ONE VESSEL FROM THREE SIDES. L14, twelve times (mode: key=<vessel>).

   Her lights from ahead, from her starboard beam and from astern, side
   by side, as the shell's lt_views() draws them: each lamp placed
   across by the same u projection the lights drill uses and up by its
   height, and only the lamps whose arc shows toward you. The vessel
   comes from the engine's own table in data.js, so the picture and the
   drill cannot disagree about what she carries; the check holds the
   lamps drawn at each bearing to arc_vis().
   ===================================================================== */
var LAMP = { W: 'w', R: 'r', G: 'g', Y: 'y' };
var VIEWS = [{ th: 0, name: 'from ahead' }, { th: 90, name: 'starboard beam' },
             { th: 180, name: 'from astern' }];
var ARC_OF = { M: 'mast', S: 'stbd', P: 'port', T: 'stern', Y: 'stern' };
function shows(arc, th) { return arc === 'A' || (ARC_OF[arc] ? inArc(ARC_OF[arc], th) : false); }
function vesselFor(key) {
  var D = root.COLREGS_DATA, i;
  if (!D || !D.vessels) return null;
  for (i = 0; i < D.vessels.length; i++) if (D.vessels[i].key === key) return D.vessels[i];
  return null;
}
/*  the lamps seen from bearing th, with where each is drawn  */
function seen(v, th) {
  var out = [], taken = {};
  v.lights.forEach(function (L) {
    if (!shows(L.arc, th)) return;
    var u = L.x * sind(th) - L.y * cosd(th);
    /*  two lamps in one place - a combined lantern bow-on shows red and
        green together - are set side by side, as the shell does  */
    var cu = Math.round(u * 16), ch = Math.round((1 - L.h) * 10);
    while (taken[cu + ',' + ch]) cu += 2;
    taken[cu + ',' + ch] = 1;
    out.push({ col: L.col, h: L.h, u: u, du: cu - Math.round(u * 16) });
  });
  return out;
}
function views(b) {
  var v = vesselFor(b.key);
  var W = 540, H = 315, seaY = 285, uS = 150, vS = 215;
  var s = svg(W, H);
  if (!v) {
    s.setAttribute('aria-label', 'No vessel called ' + b.key);
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 'rf-sky' }, s);
    txt(s, W / 2, H / 2, 'no vessel "' + b.key + '"', 'rf-lab', 'middle');
    return s;
  }
  var words = VIEWS.map(function (V) {
    var L = seen(v, V.th).slice().sort(function (p, q) { return q.h - p.h; });
    return V.name + ': ' + (L.length ? L.map(function (x) { return x.col; }).join(', ') : 'no lights');
  });
  s.setAttribute('aria-label', v.name + ' (' + v.rule + '). Her lights, top first, ' + words.join('; ') + '.');
  el('rect', { x: 0, y: 0, width: W, height: H, 'class': 'rf-sky' }, s);
  el('rect', { x: 0, y: seaY, width: W, height: H - seaY, 'class': 'rf-sea' }, s);
  txt(s, 10, 20, v.name + ' (' + v.rule + ')', 'rf-lab');
  VIEWS.forEach(function (V, p) {
    var pc = 90 + p * 180, th = V.th;
    if (p) el('line', { x1: p * 180, y1: 30, x2: p * 180, y2: seaY, 'class': 'rf-beam' }, s);
    txt(s, pc, 44, V.name, 'rf-dim', 'middle');
    var half = (1.00 * Math.abs(sind(th)) + 0.22 * Math.abs(cosd(th))) / 2.0 * uS;
    if (half < 14) half = 14;
    el('path', { d: 'M' + (pc - half) + ' ' + (seaY - 10) + ' L' + (pc + half) + ' ' + (seaY - 10) +
                 ' L' + (pc + half * 0.82) + ' ' + seaY + ' L' + (pc - half * 0.82) + ' ' + seaY + ' Z',
                 'class': 'rf-hullv' }, s);
    var lamps = seen(v, th);
    var xs = lamps.map(function (L) { return L.u * uS + L.du * 12; });
    lamps.forEach(function (L, k) {
      var dx = xs[k], x = pc + dx, y = seaY - 10 - L.h * vS;
      el('line', { x1: x, y1: seaY - 10, x2: x, y2: y, 'class': 'rf-drop' }, s);
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 5, 'class': 'rf-lamp rf-l' + LAMP[L.col] }, s);
      /*  the letter goes on the side with room: to the left when another
          lamp stands just to the right, so bow-on the green's G does not
          sit on the red, nor abeam on the masthead light's dropline  */
      var left = dx < -1 || xs.some(function (o) { return o - dx > 1 && o - dx < 30; });
      txt(s, (x + (left ? -9 : 9)).toFixed(1), (y + 5).toFixed(1), L.col, 'rf-t' + LAMP[L.col], left ? 'end' : null);
    });
  });
  return s;
}

/*  which sector a bearing lies in, for the check: what this file draws,
    asked the same question the drill asks arc_vis()  */
function inArc(name, th) {
  var a = ARCS[name], t = th;
  while (t < a[0]) t += 360;
  while (t >= a[0] + 360) t -= 360;
  return t >= a[0] && t <= a[1];
}

root.RULES_FIGS = { arcs: arcs, views: views, _arcs: ARCS, _inArc: inArc, _seen: seen };
})(typeof window !== 'undefined' ? window : this);

/* =====================================================================
   colregs -- the web build.

   Geometry is ported function-for-function from the awk engine, with the
   same names, so the two can be read side by side and cannot quietly
   drift:  arc_vis, nrm180, the u/v projection and the hull half-width
   are all the originals.  What changes is only the output device: a
   terminal could draw a lamp as a letter on a character grid, a browser
   can draw it as a lamp.
   ===================================================================== */
(function () {
'use strict';

/*  THE BUILD, MATCHED TO THE SERVICE WORKER'S CACHE.  The worker is
    cache-first, so an installed copy keeps serving the files it already
    has: shipping a change without moving the cache ships nothing to
    anyone who has opened the page before, and to them it looks like the
    change did not work. Larry shift-reloaded this app several times
    against a cache that was never going to give it up -- CACHE had sat
    at colregs-v1 since the app was written. tests/run-tests.sh now
    refuses a build and a cache that disagree, which is the same check
    the drill app got for the same reason.  */
var BUILD = 17;

var D = window.COLREGS_DATA;
var $ = function (id) { return document.getElementById(id); };

/* ---------- storage: optional, never load-bearing ------------------- */
function remember(k, v) { try { localStorage.setItem('colregs.' + k, v); } catch (e) {} }
function recall(k, dflt) {
  try { var v = localStorage.getItem('colregs.' + k); return v === null ? dflt : v; }
  catch (e) { return dflt; }
}

/* ---------- trig, as the engine has it ------------------------------ */
function d2r(x) { return x * Math.PI / 180; }
function sind(x) { return Math.sin(d2r(x)); }
function cosd(x) { return Math.cos(d2r(x)); }
function fabs(x) { return x < 0 ? -x : x; }
function nrm360(x) { x = x - 360 * Math.floor(x / 360); return x < 0 ? x + 360 : x; }
function nrm180(x) { x = nrm360(x); return x > 180 ? x - 360 : x; }

/* Is a light with this arc visible from bearing th, 0 being dead ahead
   of her?  Masthead 225 deg, sidelights 112.5 each, stern 135. */
function arc_vis(arc, th) {
  th = nrm180(th);
  if (arc === 'A') return true;
  if (arc === 'M') return fabs(th) <= 112.5;
  /* Sidelights meet at the bow, but Annex I allows the cut-off to fall up
     to 3 degrees outside the prescribed sector, and in practice there is a
     small arc right ahead where both are seen.  Without that overlap the
     picture claims you are dead ahead of her while showing one sidelight.
     The 2.5 is the engine's, and it is deliberate - do not tighten it. */
  if (arc === 'S') return th >= -2.5 && th <= 112.5;
  if (arc === 'P') return th <= 2.5 && th >= -112.5;
  if (arc === 'T' || arc === 'Y') return fabs(th) >= 112.5;
  return false;
}

/*  Ported function-for-function from the awk engine's rel_phrase, same
    name, same arcs, same wording -- a lookout reports the arc, not the
    angle.  tests/colregs-web-diff.sh runs both over all 360 bearings and
    requires the strings to be identical, because "ported" is a claim and
    a diff is a fact.  */
function rel_phrase(rel, poss, ahead) {
  if (ahead === undefined || ahead === '') ahead = 5;
  var t = nrm180(rel), s = t < 0 ? 'port' : 'starboard';
  t = fabs(t);
  if (t <= ahead) return 'right ahead';
  if (t >= 180 - ahead) return 'right astern';
  if (t < 35) return 'fine on ' + poss + ' ' + s + ' bow';
  if (t < 65) return 'broad on ' + poss + ' ' + s + ' bow';
  if (t < 115) return 'on ' + poss + ' ' + s + ' beam';
  if (t < 145) return 'broad on ' + poss + ' ' + s + ' quarter';
  return 'fine on ' + poss + ' ' + s + ' quarter';
}

/*  Red for port, green for starboard -- the sidelights, which is the
    whole reason the convention is remembered. Nought to 180 each side.  */
function red_green(rel) {
  var t = nrm180(rel);
  if (fabs(t) <= 0.5) return 'right ahead';
  if (fabs(t) >= 179.5) return 'right astern';
  if (t < 0) return 'Red ' + Math.trunc(-t + 0.5);
  return 'Green ' + Math.trunc(t + 0.5);
}

/*  FIVE WAYS OF SAYING THE SAME ANGLE, and which one is right depends
    entirely on who is listening -- so it is a setting in the shell and
    now here. The tracking exercise prints a relative column and a
    spoken report, and both read differently under each style; without
    this the browser would show one style and the shell another for the
    same contact.

    NOT YET APPLIED ON THE ENCOUNTERS SCREEN. That screen calls
    rel_phrase() directly, so it has always shown the "words" style
    whatever the shell was set to -- a divergence that predates this and
    is Larry's to rule on, not mine to widen or quietly fix tonight.  */
var RSTYLE = 'rn';
function rel_style(rel) {
  var t = nrm180(rel), d, sgn;
  if (RSTYLE === 'words') return rel_phrase(rel, 'the');
  /*  TRUNCATES, like the awk's %03d, which does not round. Written with
      Math.round first and the diff found it: every rel360 bearing was a
      degree high wherever the fraction was over a half.  */
  if (RSTYLE === 'rel360') return ('00' + Math.trunc(nrm360(rel))).slice(-3) + ' relative';
  if (RSTYLE === 'none') return '';
  if (fabs(t) <= 0.5) return 'right ahead';
  if (fabs(t) >= 179.5) return 'right astern';
  d = Math.trunc(fabs(t) + 0.5); sgn = (t < 0);
  if (RSTYLE === 'usn') return (sgn ? 'Port ' : 'Starboard ') + d;
  return (sgn ? 'Red ' : 'Green ') + d;            /* rn, the default */
}
/*  the other way of saying it, for the line that follows the report when
    he still cannot find her. Never the same form twice.  */
function rel_other(rel) {
  if (RSTYLE === 'words') return red_green(rel);
  return rel_phrase(rel, 'your');
}
/*  THE CONFIRMING NUMBER ON THE ENCOUNTERS REVEAL. The arc asks -- "fine
    on your port bow", always in words, because that is what a lookout
    says -- and the number confirms, followed by the reader's own way of
    saying it. This screen called rel_phrase() directly and left the
    second half off entirely, so it showed one style whatever the shell
    was set to; it is enc_bore() in the awk now, and diffed against it
    over every bearing in all five styles.

    The suffix is dropped when it says nothing and when it is the same
    FORM as the prefix. Matching the shape rather than the string is the
    point: the prefix rounds and rel_style's %03d truncates, so one
    bearing gets two spellings a degree apart, and a reader set to
    rel360 read "she bore 003 relative -- 002 relative".  */
function enc_bore(bg) {
  var pre = ('00' + (Math.trunc(nrm360(bg) + 0.5) % 360)).slice(-3) + ' relative';
  var suf = rel_style(bg);
  if (suf === '' || /^[0-9][0-9][0-9] relative$/.test(suf)) return 'she bore ' + pre;
  return 'she bore ' + pre + ' -- ' + suf;
}

var RSTYLES = [
  { k: 'rn',     n: 'Red / Green' },
  { k: 'usn',    n: 'Port / Starboard' },
  { k: 'rel360', n: '000 relative' },
  { k: 'words',  n: 'in words' },
  { k: 'none',   n: 'true bearing only' }
];
function setRstyle(k) { RSTYLE = k; remember('rstyle', k); }

/*  PORTED, THIS TIME.  This had its own arc boundaries -- 8, 75, 105,
    172 -- where the awk delegates to rel_phrase with ahead=2.5, so the
    two implementations disagreed on 580 of the 361 aspects and said
    different things to the reader about the same geometry. The README
    claimed they could not drift; nothing checked it. Now
    tests/colregs-web-diff.sh does, and this is the awk's version
    line-for-line.  */
function aspect_words(th) {
  var t = nrm180(th), p = rel_phrase(th, 'her', 2.5);
  if (p === 'right ahead') return 'You are right ahead of her: you are looking at her bow.';
  if (p === 'right astern') return 'You are right astern of her: you are looking at her stern.';
  if (p.indexOf('beam') >= 0)
    return 'You are ' + p + ': you see her whole ' + (t < 0 ? 'port' : 'starboard') + ' side.';
  return 'You are ' + p + '.';
}

/* ---------- svg helpers --------------------------------------------- */
var NS = 'http://www.w3.org/2000/svg';
function svg(w, h) {
  var s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  s.setAttribute('role', 'img');
  return s;
}
function el(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function cssvar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function lampColour(c) {
  return cssvar(c === 'R' ? '--lamp-r' : c === 'G' ? '--lamp-g' :
                c === 'Y' ? '--lamp-y' : '--lamp-w');
}

/* =====================================================================
   LIGHTS
   ===================================================================== */
var lightIdx = 0, lightBrg = 40;


/* =====================================================================
   FLASHING LIGHTS

   Annex I defines a flashing light as one flashing "at regular intervals
   at a frequency of 120 flashes or more per minute" - so 2 Hz is the
   defined minimum, and that is what is rendered here.  The rate is part
   of the identification, not decoration: a steady yellow all-round light
   and a flashing one are different vessels.

   The engine's light records carry no flash flag - the fact lives in the
   prose note - so the mapping is here, explicitly, one entry, with its
   citation.  It is NOT inferred from the note text: string-matching prose
   to decide what a light does is how a wrong light gets drawn.  If a
   flashing light is added to the engine's table, add it here too.

   Only one vessel in this data set has one.  (Rule 23(c)'s WIG craft, with
   its high-intensity all-round flashing red, is not in the table at all.)
   ===================================================================== */
var FLASHING = {
  /* vessel key : which lamps flash, by colour and arc, and with what rhythm.
     'flash' is Annex I's 120-a-minute.  'group3' is the submarine's, which is
     a different rhythm and therefore a different recognition. */
  hover:     [{ col: 'Y', arc: 'A', pat: 'flash',  mark: 'fl' }],
  /* Rule 23(b) - all-round flashing yellow */
  wig:       [{ col: 'R', arc: 'A', pat: 'flash',  mark: 'fl' }],
  /* Rule 23(c) - high intensity all-round flashing red, and only while
     taking off, landing or in flight near the surface */
  submarine: [{ col: 'Y', arc: 'A', pat: 'group3', mark: 'fl(3)' }]
  /* 32 CFR 707.7, a US Navy special rule and NOT a Convention light: "one
     flash per second for three seconds followed by a three second
     off-period".  Three quick flashes then dark is the whole point - a
     steady 2 Hz flash would be a different vessel. */
};
function lampFlash(vesselKey, L) {
  var f = FLASHING[vesselKey];
  if (!f) return null;
  for (var i = 0; i < f.length; i++)
    if (f[i].col === L.col && f[i].arc === L.arc) return f[i];
  return null;
}

/* Working lights, and why they are worth drawing.

   Rule 20(b): during the hours of darkness no other lights may be shown
   except those that cannot be mistaken for the prescribed lights and do not
   impair their visibility or distinctive character.  Rule 30(c): a vessel at
   anchor MAY light her decks, and one of 100 m or more MUST.

   So this is not decoration.  The lesson is what deck lights do to the
   lights you are trying to read - which is why a trawler working with her
   decks lit is hard to identify, and why the rule is written the way it is.
   The nav lamps keep their true colours and letters; what changes is the
   contrast they have to compete against. */
var DECK_ON = false;

function drawDeck(el, s, cx, seaY, W, deckCol) {
  /* the lit deck: a warm pool over the hull, brightest amidships */
  var grad = el('linearGradient', { id: 'deckglow', x1: 0, y1: 0, x2: 0, y2: 1 }, s);
  el('stop', { offset: '0%',   'stop-color': deckCol, 'stop-opacity': 0.00 }, grad);
  el('stop', { offset: '55%',  'stop-color': deckCol, 'stop-opacity': 0.34 }, grad);
  el('stop', { offset: '100%', 'stop-color': deckCol, 'stop-opacity': 0.10 }, grad);
  el('ellipse', { cx: cx, cy: seaY - 14, rx: 176, ry: 66, fill: 'url(#deckglow)' }, s);
  /* the lamps themselves, strung along the deck */
  for (var i = -2; i <= 2; i++) {
    var x = cx + i * 54;
    el('circle', { cx: x, cy: seaY - 22, r: 9, fill: deckCol, opacity: 0.16 }, s);
    el('circle', { cx: x, cy: seaY - 22, r: 3, fill: deckCol, opacity: 0.95 }, s);
  }
}

/*  THE RENDERER TAKES A TARGET, because it now has two callers.  The
    lights drill draws into its own stage with the deck-light wash under
    the user's control; an encounter draws the SAME picture into a bar
    above its plan, at the aspect that encounter was drawn from, and has
    no deck switch.  Everything that makes the picture -- the hull that
    narrows bow-on, the droplines, the stacked all-round lamps, the
    letters that carry the colour -- is shared rather than written twice,
    which is the whole reason red-over-white-over-red costs nothing here. */
function drawLights(vessel, th, o) {
  o = o || {};
  var W = 600, H = 340, seaY = 252, cx = W / 2;
  var uScale = 420, vScale = 196;
  var deckOn = (o.deck === undefined) ? DECK_ON : o.deck;
  var stage = $(o.stage || 'light-stage');
  stage.textContent = '';
  var s = svg(W, H);
  s.setAttribute('aria-label', 'A vessel seen from bearing ' + Math.round(th));

  /* sea */
  el('rect', { x: 0, y: seaY, width: W, height: H - seaY, fill: cssvar('--sea'), opacity: 0.55 }, s);
  el('line', { x1: 0, y1: seaY, x2: W, y2: seaY, stroke: cssvar('--line'), 'stroke-width': 1 }, s);

  /* hull: she looks long on the beam and narrow bow-on, which is the
     same half-width formula the terminal version uses */
  var hw = (1.00 * fabs(sind(th)) + 0.22 * fabs(cosd(th))) / 2.0;
  var half = hw * uScale;
  if (half < 26) half = 26;
  el('path', {
    d: 'M' + (cx - half) + ' ' + (seaY - 16) +
       ' L' + (cx + half) + ' ' + (seaY - 16) +
       ' L' + (cx + half * 0.82) + ' ' + seaY +
       ' L' + (cx - half * 0.82) + ' ' + seaY + ' Z',
    fill: cssvar('--hull')
  }, s);

  var visible = vessel.lights.filter(function (L) { return arc_vis(L.arc, th); });

  /* a dropline under each lamp, so the vertical grouping is plain */
  visible.forEach(function (L) {
    var u = L.x * sind(th) - L.y * cosd(th);
    var x = cx + u * uScale;
    el('line', {
      x1: x, y1: seaY - 16, x2: x, y2: seaY - 16 - L.h * vScale,
      stroke: cssvar('--mast'), 'stroke-width': 2
    }, s);
  });

  if (deckOn) drawDeck(el, s, cx, seaY, W, cssvar('--deck'));

  /* the lamps */
  visible.forEach(function (L) {
    var u = L.x * sind(th) - L.y * cosd(th);
    var x = cx + u * uScale, y = seaY - 16 - L.h * vScale;
    var col = lampColour(L.col);
    var fl = lampFlash(vessel.key, L);
    /* Both circles go in a GROUP and the group is what animates.  Animating
       the circles directly would have the CSS opacity override the halo's
       own opacity="0.18" presentation attribute and destroy the glow. */
    var host = fl ? el('g', { 'class': 'lamp-' + fl.pat }, s) : s;
    el('circle', { cx: x, cy: y, r: 16, fill: col, opacity: 0.18 }, host);
    el('circle', { cx: x, cy: y, r: 7.5, fill: col }, host);
    var t = el('text', {
      x: x + 13, y: y + 5, fill: col,
      'font-family': 'ui-monospace, Menlo, monospace',
      'font-size': 15, 'font-weight': 700
    }, s);
    /* The letter carries the pattern, same discipline as the colours: a
       flashing lamp reads as flashing with no colour AND with no motion,
       which is what somebody gets who has reduced motion switched on. */
    t.textContent = fl ? L.col + ' ' + fl.mark : L.col;
  });

  if (!visible.length) {
    var n = el('text', {
      x: cx, y: seaY - 80, fill: cssvar('--dim'), 'text-anchor': 'middle',
      'font-size': 15
    }, s);
    n.textContent = 'No lights visible from this bearing.';
  }

  if (deckOn) {
    /* The point of the exercise.  Working lights do not change a navigation
       light; they change what it has to be seen against.  A warm wash over
       the whole scene costs the lamps their contrast, which is exactly the
       impairment Rule 20(b) is about - and exactly why she is hard to read. */
    el('rect', { x: 0, y: 0, width: W, height: H,
                 fill: cssvar('--deck'), opacity: 0.085 }, s);
  }
  stage.appendChild(s);
  $(o.aspect || 'light-aspect').textContent = aspect_words(th);
}

function lightsShow(i, th) {
  lightIdx = i; lightBrg = th;
  $('brg').value = Math.round(th);
  $('brg-out').textContent = (nrm360(th) < 100 ? ('00' + Math.round(nrm360(th))).slice(-3)
                                               : String(Math.round(nrm360(th))));
  drawLights(D.vessels[i], th);
  $('light-answer').hidden = true;
  drill('light', D.vessels, i, sigVessel, function (v) { return v.name; },
        lightsReveal, 'Show me what she is');
}
function lightsNext() {
  lightsShow(Math.floor(Math.random() * D.vessels.length),
             Math.floor(Math.random() * 360) - 180);
}
function lightsReveal() {
  var v = D.vessels[lightIdx];
  $('light-name').textContent = v.name;
  $('light-rule').textContent = v.rule + '.';
  $('light-note').textContent = v.note;
  $('light-answer').hidden = false;
}

/* =====================================================================
   DAY SHAPES
   ===================================================================== */
var shapeIdx = 0;

/* The glyph vocabulary, as real shapes rather than character art. */
function glyph(kind, cx, y, scale, s, c, bg) {
  var r = 22 * scale, h = 0;
  if (kind === 'ball') {
    el('circle', { cx: cx, cy: y - r, r: r, fill: c }, s); h = r * 2;
  } else if (kind === 'diamond') {
    var d = 26 * scale;
    el('path', { d: 'M' + cx + ' ' + (y - d * 2) + ' L' + (cx + d) + ' ' + (y - d) +
                    ' L' + cx + ' ' + y + ' L' + (cx - d) + ' ' + (y - d) + ' Z', fill: c }, s);
    h = d * 2;
  } else if (kind === 'cyl') {
    var w = 20 * scale, hh = 44 * scale;
    el('rect', { x: cx - w, y: y - hh, width: w * 2, height: hh, rx: 3, fill: c }, s);
    h = hh;
  } else if (kind === 'conedn') {
    var w2 = 24 * scale, hh2 = 42 * scale;
    el('path', { d: 'M' + (cx - w2) + ' ' + (y - hh2) + ' L' + (cx + w2) + ' ' + (y - hh2) +
                    ' L' + cx + ' ' + y + ' Z', fill: c }, s);
    h = hh2;
  } else if (kind === 'coneup') {
    var w3 = 24 * scale, hh3 = 42 * scale;
    el('path', { d: 'M' + cx + ' ' + (y - hh3) + ' L' + (cx + w3) + ' ' + y +
                    ' L' + (cx - w3) + ' ' + y + ' Z', fill: c }, s);
    h = hh3;
  } else if (kind === 'hourglass') {
    var w4 = 24 * scale, hh4 = 80 * scale;
    el('path', { d: 'M' + (cx - w4) + ' ' + (y - hh4) + ' L' + (cx + w4) + ' ' + (y - hh4) +
                    ' L' + cx + ' ' + (y - hh4 / 2) + ' Z', fill: c }, s);
    el('path', { d: 'M' + cx + ' ' + (y - hh4 / 2) + ' L' + (cx + w4) + ' ' + y +
                    ' L' + (cx - w4) + ' ' + y + ' Z', fill: c }, s);
    h = hh4;
  } else if (kind === 'flagA') {
    var fw = 64 * scale, fh = 44 * scale;
    el('path', { d: 'M' + (cx - fw / 2) + ' ' + (y - fh) + ' h' + (fw * 0.55) +
                    ' l' + (fw * 0.45) + ' ' + (fh / 2) + ' l' + (-fw * 0.45) + ' ' + (fh / 2) +
                    ' h' + (-fw * 0.55) + ' Z', fill: c }, s);
    el('rect', { x: cx - fw / 2, y: y - fh, width: fw * 0.3, height: fh, fill: bg }, s);
    h = fh;
  } else if (kind === 'ballpair') {
    /*  TWO balls, one at each end of the fore yard, and NOTHING between
        them. A third circle sat at cx, and it made mine clearance show
        FOUR balls where Rule 27(f) gives three - "one at the foremast
        head and one at each end of the fore yard" - which is the whole
        of how she is identified, and it is the same arrangement Larry
        had already caught this program getting wrong once.

        It came of reading the shell's glyph as a picture rather than as
        characters: shp_glyph() draws "(O)---+---(O)", and the + marks
        where the yard crosses the mast, not a shape. Here the mast line
        already passes through, so the crossing needs nothing drawn.  */
    var sp = 70 * scale, rr = 20 * scale;
    el('line', { x1: cx - sp, y1: y - rr, x2: cx + sp, y2: y - rr,
                 stroke: c, 'stroke-width': 4 }, s);
    el('circle', { cx: cx - sp, cy: y - rr, r: rr, fill: c }, s);
    el('circle', { cx: cx + sp, cy: y - rr, r: rr, fill: c }, s);
    h = rr * 2;
  }
  return h;
}

/* Day shapes are BLACK, and they are seen against the sky in daylight.
   Drawing them white on a night sky would be backwards, so in dark mode
   this one view gets a daylight ground and black shapes.
   In NIGHT mode it stays red on black: if someone is dark-adapted, a
   bright panel costs them twenty minutes, and that outranks fidelity. */
function drawShapes(sh) {
  var W = 600, H = 360, seaY = 300, cx = W / 2;
  var night = document.documentElement.getAttribute('data-mode') === 'night';
  var sky   = night ? '#000000' : '#c3ced8';
  var ink   = night ? cssvar('--lamp-r') : '#0d1117';
  var sea   = night ? cssvar('--sea')    : '#73838f';
  var hull  = night ? cssvar('--hull')   : '#2b343c';

  var stage = $('shape-stage');
  stage.textContent = '';
  var s = svg(W, H);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: sky }, s);
  el('rect', { x: 0, y: seaY, width: W, height: H - seaY, fill: sea }, s);
  el('line', { x1: 0, y1: seaY, x2: W, y2: seaY, stroke: ink, opacity: 0.35 }, s);
  el('path', { d: 'M' + (cx - 120) + ' ' + (seaY - 16) + ' L' + (cx + 120) + ' ' + (seaY - 16) +
                  ' L' + (cx + 96) + ' ' + seaY + ' L' + (cx - 96) + ' ' + seaY + ' Z',
               fill: hull }, s);
  var top = seaY - 16;
  el('line', { x1: cx, y1: top, x2: cx, y2: 30, stroke: ink, 'stroke-width': 3, opacity: 0.8 }, s);
  var y = top - 10;
  for (var i = sh.stack.length - 1; i >= 0; i--) {
    var used = glyph(sh.stack[i], cx, y, 1, s, ink, sky);
    y -= used + 16;
  }
  stage.appendChild(s);
}
function shapesShow(i) {
  shapeIdx = i; drawShapes(D.shapes[i]); $('shape-answer').hidden = true;
  drill('shape', D.shapes, i, sigShape, function (s) { return s.name; },
        shapesReveal, 'Show me what she is');
}
function shapesNext() { shapesShow(Math.floor(Math.random() * D.shapes.length)); }
function shapesReveal() {
  var sh = D.shapes[shapeIdx];
  $('shape-name').textContent = sh.name;
  $('shape-rule').textContent = sh.rule + '.';
  $('shape-note').textContent = sh.note;
  $('shape-answer').hidden = false;
}

/* =====================================================================
   SOUND SIGNALS -- the thing a terminal could only draw
   ===================================================================== */
var ac = null, playing = null;

function audio() {
  if (!ac) {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

/* A ship's whistle is low and loud.  Two detuned saws a fifth apart
   through a lowpass gets close enough to be recognisable. */
function blast(t0, dur) {
  var a = audio(); if (!a) return;
  var g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.28, t0 + 0.04);
  g.gain.setValueAtTime(0.28, t0 + dur - 0.12);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  f.connect(g); g.connect(a.destination);
  [112, 168].forEach(function (hz, i) {
    var o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = hz * (i ? 1.004 : 1);
    o.connect(f); o.start(t0); o.stop(t0 + dur + 0.02);
  });
}

/* A bell is inharmonic and decays fast. */
function bell(t0) {
  var a = audio(); if (!a) return;
  var g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
  g.connect(a.destination);
  [1, 2.76, 5.4, 8.9].forEach(function (m, i) {
    var o = a.createOscillator();
    o.type = 'sine'; o.frequency.value = 620 * m;
    var og = a.createGain(); og.gain.value = 1 / (i + 1.4);
    o.connect(og); og.connect(g);
    o.start(t0); o.stop(t0 + 1.2);
  });
}

/* Groups are separated by spaces.  Within a group, one '#' is a short
   blast and four is a prolonged one; one '*' is a stroke on the bell and
   five is the bell rung rapidly.  Durations are the real ones, because a
   prolonged blast is supposed to feel long. */
function soundPattern(pat) {
  var a = audio(); if (!a) return 0;
  var t = a.currentTime + 0.08;
  pat.trim().split(/\s+/).forEach(function (grp) {
    if (grp[0] === '#') {
      if (grp.length >= 4) { blast(t, 4.5); t += 4.5 + 1.0; }
      else { for (var i = 0; i < grp.length; i++) { blast(t, 1.0); t += 1.0 + 0.6; } t += 0.4; }
    } else if (grp[0] === '*') {
      if (grp.length >= 5) { for (var j = 0; j < 34; j++) { bell(t); t += 0.145; } t += 0.8; }
      else { for (var k = 0; k < grp.length; k++) { bell(t); t += 0.95; } t += 0.5; }
    }
  });
  return t - a.currentTime;
}

var soundIdx = 0;
function drawSound(sd) {
  var stage = $('sound-stage');
  stage.textContent = '';
  var groups = sd.pattern.trim().split(/\s+/);
  var W = 600, H = 120, pad = 20, y = 54;
  var s = svg(W, H);
  var unit = 0;
  groups.forEach(function (g) { unit += g[0] === '#' ? (g.length >= 4 ? 4.5 : g.length * 1.6) : g.length * 0.9; });
  var span = W - pad * 2, x = pad;
  var px = span / Math.max(unit, 1);
  groups.forEach(function (g) {
    if (g[0] === '#') {
      if (g.length >= 4) {
        el('rect', { x: x, y: y - 16, width: 4.5 * px, height: 32, rx: 4, fill: cssvar('--accent') }, s);
        x += 4.5 * px;
      } else {
        for (var i = 0; i < g.length; i++) {
          el('rect', { x: x, y: y - 16, width: 1.0 * px, height: 32, rx: 4, fill: cssvar('--accent') }, s);
          x += 1.6 * px;
        }
      }
    } else {
      for (var j = 0; j < g.length; j++) {
        el('circle', { cx: x + 0.4 * px, cy: y, r: Math.min(10, 0.35 * px), fill: cssvar('--accent') }, s);
        x += 0.9 * px;
      }
    }
    x += 0.5 * px;
  });
  el('line', { x1: pad, y1: y + 30, x2: W - pad, y2: y + 30, stroke: cssvar('--line') }, s);
  var lab = el('text', { x: pad, y: y + 50, fill: cssvar('--dim'), 'font-size': 13 }, s);
  lab.textContent = 'time →';
  var p = el('text', {
    x: W - pad, y: y + 50, fill: cssvar('--dim'), 'text-anchor': 'end',
    'font-family': 'ui-monospace, Menlo, monospace', 'font-size': 14
  }, s);
  p.textContent = sd.pattern;
  stage.appendChild(s);
}
function soundsShow(i) {
  soundIdx = i; drawSound(D.sounds[i]); $('sound-answer').hidden = true;
  drill('sound', D.sounds, i, sigSound, function (s) { return s.meaning; },
        soundsReveal, 'Tell me what she is saying');
}
function soundsNext() { soundsShow(Math.floor(Math.random() * D.sounds.length)); }
function soundsReveal() {
  var sd = D.sounds[soundIdx];
  $('sound-meaning').textContent = sd.meaning;
  $('sound-rule').textContent = sd.rule + '.';
  $('sound-when').textContent = sd.when;
  $('sound-answer').hidden = false;
}

/* =====================================================================
   THE DRILL  --  five candidates and a way out

   This replaced a single "Show me what she is" button.  Recognising the
   right answer once you are shown it is not the skill being trained;
   producing it is.  So every question now offers five candidates, one of
   them correct, and a sixth row that gives up and tells you.

   The four wrong answers are chosen to be CONFUSABLE with the right one
   rather than drawn at random.  Each candidate is scored on how much of
   its signature it shares with the answer -- lamp colours for lights,
   the glyph stack for day shapes, the blast pattern for sounds -- and
   the closest four are used.  A trawler against a vessel not under
   command teaches you something.  A trawler against a seaplane does not.

   A wrong tap marks that row and leaves the rest live, so a miss costs
   you another look at the picture instead of ending the question.
   ===================================================================== */

var LTRS = 'abcdef';

/* Multiset overlap: how many elements the two signatures share, counting
   repeats.  Three balls and two balls share two, not one. */
function sigOverlap(a, b) {
  var pool = b.slice(), n = 0;
  for (var i = 0; i < a.length; i++) {
    var k = pool.indexOf(a[i]);
    if (k >= 0) { pool.splice(k, 1); n++; }
  }
  return n;
}

function sigVessel(v) {
  var s = [];
  for (var i = 0; i < v.lights.length; i++) s.push(v.lights[i].col);
  return s.sort();
}
function sigShape(sh) { return sh.stack.slice().sort(); }

/* '#' is a short blast, '####' a prolonged one, '*' the bell.  What makes
   two signals confusable is the sequence of blast KINDS, not the string. */
function sigSound(sd) {
  return sd.pattern.split(' ').map(function (t) {
    if (t.charAt(0) === '*') return t.length > 1 ? 'bells' : 'bell';
    return t.length > 1 ? 'prolonged' : 'short';
  }).sort();
}

function nearest(list, idx, sigOf, n) {
  var mine = sigOf(list[idx]), scored = [];
  for (var i = 0; i < list.length; i++) {
    if (i === idx) continue;
    var s = sigOf(list[i]);
    scored.push({
      i: i,
      /* shared elements first, then the same number of them, then a
         little noise so the same question is not always the same five */
      s: sigOverlap(s, mine) + (s.length === mine.length ? 0.5 : 0) + Math.random() * 0.4
    });
  }
  scored.sort(function (a, b) { return b.s - a.s; });
  return scored.slice(0, n).map(function (o) { return o.i; });
}

function shuffled(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var k = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[k]; a[k] = t;
  }
  return a;
}

/* One row. */
function optRow(ltr, text, cls) {
  var b = document.createElement('button');
  b.className = 'opt' + (cls ? ' ' + cls : ''); b.type = 'button';
  var sp = document.createElement('span'); sp.className = 'ltr'; sp.textContent = ltr + ')';
  var tx = document.createElement('span'); tx.textContent = text;
  b.appendChild(sp); b.appendChild(tx);
  return b;
}

/* Build the six rows for one view.  nameOf turns a record into its label;
   reveal opens that view's answer panel; tell is the sixth row's wording. */
function drill(pfx, list, idx, sigOf, nameOf, reveal, tell) {
  var box = $(pfx + '-opts'), verdict = $(pfx + '-verdict');
  box.textContent = '';
  verdict.hidden = true; verdict.textContent = ''; verdict.dataset.state = '';

  var picks = shuffled(nearest(list, idx, sigOf, 4).concat([idx]));
  var done = false;

  function settle(right) {
    done = true;
    for (var i = 0; i < box.children.length; i++) box.children[i].disabled = true;
    reveal();
    verdict.dataset.state = right ? 'right' : '';
    verdict.textContent = right ? 'Right.' : 'The answer, then.';
    verdict.hidden = false;
  }

  picks.forEach(function (p, n) {
    var row = optRow(LTRS[n], nameOf(list[p]));
    row.addEventListener('click', function () {
      if (done || row.disabled) return;
      if (p === idx) {
        row.dataset.state = 'right';
        settle(true);
      } else {
        row.dataset.state = 'wrong';
        row.disabled = true;
        verdict.dataset.state = 'wrong';
        verdict.textContent = 'Not her. Look again.';
        verdict.hidden = false;
      }
    });
    box.appendChild(row);
  });

  var out = optRow(LTRS[5], tell, 'tell');
  out.addEventListener('click', function () {
    if (done) return;
    for (var i = 0; i < box.children.length; i++) {
      if (picks[i] === idx) box.children[i].dataset.state = 'right';
    }
    settle(false);
  });
  box.appendChild(out);
}

/* =====================================================================
   ENCOUNTERS
   ===================================================================== */
var encIdx = 0, encAnswered = false, encBrg = 0, encThdg = 0;

function arrowPath(cx, cy, hdg, len) {
  var dx = sind(hdg), dy = -cosd(hdg);
  var tipx = cx + dx * len, tipy = cy + dy * len;
  var bx = cx - dx * len * 0.5, by = cy - dy * len * 0.5;
  var px = -dy, py = dx;
  return 'M' + tipx + ' ' + tipy +
         ' L' + (bx + px * len * 0.4) + ' ' + (by + py * len * 0.4) +
         ' L' + (bx - px * len * 0.4) + ' ' + (by - py * len * 0.4) + ' Z';
}

function drawEncounter(e, brg, rng, thdg) {
  var W = 600, H = 420, cx = W / 2, cy = H / 2, R = Math.min(cx, cy) - 26;
  var stage = $('enc-stage');
  stage.textContent = '';
  var s = svg(W, H);
  [1, 0.66, 0.33].forEach(function (f) {
    el('circle', { cx: cx, cy: cy, r: R * f, fill: 'none',
                   stroke: cssvar('--line'), 'stroke-dasharray': '2 5' }, s);
  });
  for (var a = 0; a < 360; a += 30) {
    el('line', { x1: cx + sind(a) * R * 0.95, y1: cy - cosd(a) * R * 0.95,
                 x2: cx + sind(a) * R, y2: cy - cosd(a) * R,
                 stroke: cssvar('--line') }, s);
  }
  var hu = el('text', { x: cx, y: 18, fill: cssvar('--dim'), 'text-anchor': 'middle',
                        'font-size': 12, 'letter-spacing': '0.2em' }, s);
  hu.textContent = 'HEAD UP';

  /* you, at the centre, heading up the page */
  el('path', { d: arrowPath(cx, cy, 0, 16), fill: cssvar('--accent') }, s);
  var yl = el('text', { x: cx, y: cy + 30, fill: cssvar('--accent'), 'text-anchor': 'middle',
                        'font-size': 12, 'font-weight': 700 }, s);
  yl.textContent = 'YOU';

  /* her */
  var tx = cx + sind(brg) * R * rng, ty = cy - cosd(brg) * R * rng;
  var dx = sind(thdg), dy = -cosd(thdg);
  el('line', { x1: tx - dx * 46, y1: ty - dy * 46, x2: tx, y2: ty,
               stroke: cssvar('--dim'), 'stroke-dasharray': '3 4' }, s);
  el('path', { d: arrowPath(tx, ty, thdg, 15), fill: cssvar('--text') }, s);
  var hl = el('text', { x: tx + 14, y: ty - 10, fill: cssvar('--text'), 'font-size': 12,
                        'font-weight': 700 }, s);
  hl.textContent = 'HER';

  /*  THE WIND, where the scenario has one.  Rule 12 is decided by which
      side the wind is on, so a sailing scenario that names windward and
      leeward has to draw it -- the shell build gained this on 22 October
      and the browser could not see it, because the field had never been
      dumped into data.js.  Drawn from the upwind edge pointing downwind,
      the way a wind arrow is read on a chart.  */
  if (e.wind !== undefined) {
    /*  IN A CORNER, NOT ON THE RIM.  Drawn at the upwind edge it lands on
        top of the contact in every windward scenario -- she IS upwind, so
        the wind marker and her marker are the same place, and the first
        render had WIND written through HER. A chart draws wind as an
        arrow of fixed length and position pointing downwind, and so does
        this: the direction is the information, the position is not.  */
    var wox = 56, woy = 54, dwn = nrm360(e.wind + 180);
    var bx = wox - sind(dwn) * 22, by = woy + cosd(dwn) * 22;
    var ex2 = wox + sind(dwn) * 22, ey2 = woy - cosd(dwn) * 22;
    el('line', { x1: bx, y1: by, x2: ex2, y2: ey2, stroke: cssvar('--dim'),
                 'stroke-width': 2, 'stroke-dasharray': '5 3' }, s);
    el('path', { d: arrowPath(ex2, ey2, dwn, 12), fill: cssvar('--dim') }, s);
    var wl = el('text', { x: wox, y: woy + 44, fill: cssvar('--dim'),
                          'text-anchor': 'middle', 'font-size': 11,
                          'letter-spacing': '0.15em' }, s);
    wl.textContent = 'WIND';
  }
  stage.appendChild(s);
}

function encShow(i) {
  encIdx = i; encAnswered = false;
  var e = D.encounters[i];
  var lo = e.brglo, hi = e.brghi; if (hi < lo) hi += 360;
  var brg = nrm360(lo + Math.random() * (hi - lo));
  var rng = 0.55 + Math.random() * 0.35;
  var thdg = nrm360(e.thdg + (Math.random() * 30 - 15));
  drawEncounter(e, brg, rng, thdg);
  $('enc-own').textContent = e.own;
  /*  heard(), ported name for name from the awk and checked against it
      in the web/shell diff: you do not SEE a fog signal, and two of the
      twenty-eight scenarios are sound signals.  */
  $('enc-target').textContent = 'You ' + (heard(e.target) ? 'hear' : 'see') +
    ' ' + e.target + ', ' +
    rel_phrase(brg, 'your') + ', heading as drawn.' +
    (e.wind === undefined ? '' :
      ' The wind is from ' + ('00' + nrm360(e.wind)).slice(-3) +
      ' relative, as drawn.');
  encBrg = brg; encThdg = thdg;
  var box = $('enc-opts');
  box.textContent = '';
  e.options.forEach(function (text, n) {
    var ltr = 'abcd'[n];
    var b = document.createElement('button');
    b.className = 'opt'; b.type = 'button';
    var sp = document.createElement('span'); sp.className = 'ltr'; sp.textContent = ltr + ')';
    var tx = document.createElement('span'); tx.textContent = text;
    b.appendChild(sp); b.appendChild(tx);
    b.addEventListener('click', function () { encAnswer(ltr); });
    box.appendChild(b);
  });
  $('enc-answer').hidden = true;
  $('enc-lights').hidden = true;
  $('enc-lights-btn').hidden = true;
}
/*  WHAT YOU WOULD ACTUALLY SEE.  This was four lines of prose -- "her
    green starboard light and her masthead light" -- which works for a
    power-driven vessel and falls apart at red over white over red, the
    case Larry named.  So it draws her instead, with the renderer the
    lights drill already uses, at the aspect this question was drawn
    from: a bar above the plan, which was his suggestion.
    The arcs still come from the same rule as the shell's lt_arc: the
    viewer's bearing from the subject, relative to the subject's bow.  */
function heard(t) { return /blast|fog signal/.test(t); }
function lt_arc_web(rel) {
  var r = nrm360(rel);
  if (r <= 1.5 || r >= 358.5) return 'both';
  if (r < 112.5) return 'green';
  if (r > 247.5) return 'red';
  return 'stern';
}
function vesselByKey(k) {
  for (var i = 0; i < D.vessels.length; i++)
    if (D.vessels[i].key === k) return D.vessels[i];
  return null;
}
/*  The half the picture cannot tell you -- read off the lamps that are
    actually lit, not off the geometry.  Ported from the shell's lt_note
    and diffed against it over all twenty-two vessels and every bearing;
    the comment there says what asking the geometry got wrong.  */
function lt_note(key, th) {
  var v = vesselByKey(key);
  if (!v) return '';
  if (key === 'sail') return 'sail';
  var nv = 0, mast = 0, stern = 0, red = 0, grn = 0, allr = 0;
  v.lights.forEach(function (L) {
    if (!arc_vis(L.arc, th)) return;
    nv++;
    if (L.arc === 'A') allr++;
    else if (L.arc === 'M') mast++;
    else if (L.arc === 'S') grn++;
    else if (L.arc === 'P') red++;
    else if (L.arc === 'T' && L.col === 'W') stern++;
  });
  if (nv === 1 && stern === 1) return 'stern';
  if (red && grn && mast && !allr) return 'bow';
  return '';
}
function encLightNote(e, relher) {
  var n = lt_note(e.vessel, relher);
  if (n === 'sail')
    return 'Her sidelights say she is there and which way she is pointing. ' +
           'They say nothing about which tack she is on, and Rule 12 turns on that.';
  if (n === 'stern')
    return 'A sternlight and no colour: you are overtaking (Rule 13), ' +
           'whatever else is true of her.';
  if (n === 'bow')
    return 'Both sidelights and a masthead light: an ordinary power-driven ' +
           'vessel end on. Rule 14, and nobody stands on.';
  return '';
}
function encLights() {
  var e = D.encounters[encIdx];
  var pic = $('enc-light-pic'), note = $('enc-light-note');
  if (e.vessel === undefined) {
    /*  Three have no picture, for two different reasons, and saying
        which is the teaching point rather than an apology.  */
    pic.hidden = true;
    /*  and the stage is emptied, not just hidden: a hidden stage still
        holding the last vessel's picture is one forgotten `hidden` away
        from showing the wrong ship.  */
    $('enc-light-stage').textContent = '';
    note.textContent = /blast|fog signal/.test(e.target)
      ? 'Nothing. You cannot see her at all — that is the whole point of a ' +
        'sound signal, and why the rule hangs on hearing rather than seeing.'
      : 'Rule 31 says a seaplane shows lights “as closely as possible” to the ' +
        'rules for a power-driven vessel, so there is no one right picture to ' +
        'draw. Expect something approximating Rule 23 and treat her as one.';
  } else {
    var relher = nrm360(encBrg + 180 - encThdg);  /* where WE are, off HER bow */
    drawLights(vesselByKey(e.vessel), relher,
               { stage: 'enc-light-stage', aspect: 'enc-light-aspect', deck: false });
    pic.hidden = false;
    note.textContent = encLightNote(e, relher);
  }
  note.hidden = note.textContent === '';
  $('enc-lights').hidden = false;
  $('enc-lights-btn').hidden = true;
}

function encAnswer(ltr) {
  if (encAnswered) return;
  encAnswered = true;
  var e = D.encounters[encIdx];
  var kids = $('enc-opts').children;
  for (var i = 0; i < kids.length; i++) {
    var l = 'abcd'[i];
    kids[i].disabled = true;
    if (l === e.answer) kids[i].dataset.state = 'right';
    else if (l === ltr) kids[i].dataset.state = 'wrong';
  }
  $('enc-verdict').textContent = (ltr === e.answer ? 'Right' : 'Not right') +
    ' — the answer is ' + e.answer.toUpperCase() + '.';
  $('enc-rule').textContent = e.rule + '.';
  /*  The exact bearing, now that it can give nothing away -- it is the
      check against your own reading of the plan, which is where a number
      belongs. Same split as the shell build: the arc asks, the number
      confirms.  */
  $('enc-why').textContent = e.why + '  (' + enc_bore(encBrg) + '.)';
  $('enc-answer').hidden = false;
  /*  The lights, after the answer and not before it -- same place in the
      flow as the shell's "See her lights? [y/N]".  */
  $('enc-lights-btn').hidden = false;
}
function encNext() { encShow(Math.floor(Math.random() * D.encounters.length)); }

/* =====================================================================
   PROSE FROM THE SHELL

   Every lesson in this app was written for a terminal, so its prose
   carries hard line breaks at 72 columns. Put in a pre-wrap box those
   breaks are honoured AND the long lines wrap again, so on a phone -- a
   402px box, about 44 characters -- a 72-character line becomes one full
   line and a 28-character stub. Four lines from the shell became seven
   on screen, three of them ending mid-way across. It read ragged for as
   long as the lessons have existed.

   So the breaks are dropped and the browser does the wrapping. Not all
   of them: in some paragraphs the line breaks ARE the layout, and
   joining those would destroy the thing they are showing. Three shapes,
   decided per paragraph:

     pre    a column gutter -- two or more spaces that do not follow
            sentence punctuation -- or a hanging indent deeper than a
            list's. C4's anatomy of a report, C5's and C6's formulas,
            C6's worked legs, C7's relative-bearing table, C2's two
            quoted phrases side by side. Six of them, left exactly as
            the shell draws them.
     list   a numbered or lettered item. The item's own lines are joined
            and the marker keeps its hanging indent, so a long item
            wraps under itself instead of under its number.
     flow   everything else, joined into a paragraph.

   Measured over all twenty-two lessons: 75 flowing, 18 lists, 6 held.
   The two that look marginal were read rather than counted -- C4's
   spoken example report, which is a sentence and reads better joined,
   and a C7 paragraph whose second line carries a stray two-space indent
   that joining quietly fixes.

   The rule is deliberately conservative: when in doubt it keeps the
   shell's layout, because a table flowed into a paragraph is unreadable
   and a paragraph left hard-wrapped is merely ugly.
   ===================================================================== */
/*  A COLUMN GUTTER, AND THE DISTINCTION IS THE WIDTH. Two spaces after
    a full stop is sentence spacing; three or more inside a line is a
    column, whatever precedes them. The first version excluded a colon
    from the two-space case and applied that exclusion to any width,
    which held nothing it should not -- until celnav's Polaris lesson,
    where "at upper transit, above the pole:   latitude = Ho - p" is a
    label and a formula in two columns, and the colon is exactly what a
    label ends with. Measured across all three apps, splitting the cases
    by width moves that one paragraph and nothing else.  */
var PR_GUTTER = /\S {3,}\S|[^.!?: ] {2}\S/;
var PR_MARKER = /^( *)(\d+\.|\([a-z]\)|[a-z]\))\s+\S/;
var PR_DEEP = 6;

function proseKind(lines) {
  var i, ind = [], mn, mx;
  for (i = 0; i < lines.length; i++) if (PR_GUTTER.test(lines[i])) return 'pre';
  for (i = 0; i < lines.length; i++) ind.push(lines[i].match(/^ */)[0].length);
  mn = Math.min.apply(null, ind); mx = Math.max.apply(null, ind);
  if (mx - mn >= PR_DEEP) return 'pre';
  for (i = 0; i < lines.length; i++) if (PR_MARKER.test(lines[i])) return 'list';
  return 'flow';
}
function proseJoin(lines) {
  var i, out = '';
  for (i = 0; i < lines.length; i++) {
    out += (out === '' ? '' : ' ') + lines[i].replace(/^ +/, '').replace(/ +$/, '');
  }
  return out;
}
/*  fill `box` with `text`, laid out as above  */
function renderProse(text, box) {
  box.textContent = '';
  var pars = String(text).split(/\n[ \t]*\n/);
  pars.forEach(function (par) {
    var lines = par.split('\n').filter(function (l) { return l.replace(/\s/g, '') !== ''; });
    if (!lines.length) return;
    var kind = proseKind(lines), i, e;

    if (kind === 'pre') {
      e = document.createElement('pre');
      e.className = 'lp-pre';
      e.textContent = par.replace(/^\n+/, '').replace(/\s+$/, '');
      box.appendChild(e);
      return;
    }
    if (kind === 'flow') {
      e = document.createElement('p');
      e.className = 'lp';
      e.textContent = proseJoin(lines);
      box.appendChild(e);
      return;
    }
    /*  a list: an item starts at a marker and runs on through the lines
        indented under it  */
    var items = [], cur = null;
    for (i = 0; i < lines.length; i++) {
      if (PR_MARKER.test(lines[i])) { cur = [lines[i]]; items.push(cur); }
      else if (cur) cur.push(lines[i]);
      else { cur = [lines[i]]; items.push(cur); }
    }
    items.forEach(function (it) {
      var d = document.createElement('div');
      d.className = 'lp-item';
      d.textContent = proseJoin(it);
      box.appendChild(d);
    });
  });
  return box;
}

/* =====================================================================
   THE RULES
   ===================================================================== */
function doneSet() {
  var raw = recall('lessons', '');
  return raw ? raw.split(',') : [];
}
function markDone(id) {
  var d = doneSet();
  if (d.indexOf(id) < 0) { d.push(id); remember('lessons', d.join(',')); }
}
function rulesIndex() {
  var box = $('rules-index');
  box.textContent = '';
  var done = doneSet();
  var wrap = document.createElement('div');
  wrap.className = 'ridx';
  D.lessons.forEach(function (L, i) {
    var b = document.createElement('button');
    b.type = 'button';
    var m = document.createElement('span');
    var isDone = done.indexOf(L.id) >= 0;
    m.className = isDone ? 'done' : 'todo';
    m.textContent = isDone ? '[x]' : '[ ]';
    var t = document.createElement('span');
    t.textContent = L.id + '  ' + L.title;
    b.appendChild(m); b.appendChild(t);
    b.addEventListener('click', function () { openLesson(i); });
    wrap.appendChild(b);
  });
  box.appendChild(wrap);
  var p = document.createElement('p');
  p.className = 'note';
  p.textContent = done.length + ' of ' + D.lessons.length + ' done.';
  box.appendChild(p);
  $('lesson').hidden = true;
  box.hidden = false;
}
function openLesson(i) {
  var L = D.lessons[i];
  $('rules-index').hidden = true;
  $('lesson').hidden = false;
  $('lesson-title').textContent = L.id + '  ' + L.title;
  renderProse(L.body, $('lesson-body'));
  renderProse(L.question, $('lesson-q'));
  var box = $('lesson-opts');
  box.textContent = '';
  var answered = false;
  ['a', 'b', 'c'].forEach(function (ltr) {
    var b = document.createElement('button');
    b.className = 'opt'; b.type = 'button';
    var sp = document.createElement('span'); sp.className = 'ltr'; sp.textContent = ltr + ')';
    b.appendChild(sp);
    b.addEventListener('click', function () {
      if (answered) return;
      answered = true;
      var kids = box.children;
      for (var k = 0; k < kids.length; k++) {
        var kl = ['a', 'b', 'c'][k];
        kids[k].disabled = true;
        if (kl === L.answer) kids[k].dataset.state = 'right';
        else if (kl === ltr) kids[k].dataset.state = 'wrong';
      }
      $('lesson-verdict').textContent = (ltr === L.answer ? 'Correct.' : 'Not quite — the answer is ' +
        L.answer.toUpperCase() + '.');
      $('lesson-why').textContent = L.why;
      $('lesson-answer').hidden = false;
      if (ltr === L.answer) markDone(L.id);
    });
    box.appendChild(b);
  });
  $('lesson-answer').hidden = true;
}

/* =====================================================================
   CONTACT MANAGEMENT

   Seven reading lessons, carried across from the shell by the generator
   in gen/. A lesson is a list of BLOCKS rather than one lump of text,
   because two of them carry a relative-motion plot and one a compass
   rose, and those are drawn as SVG by contacts-figs.js rather than
   pasted in as a picture of a terminal.

   No question at the end, unlike the fifteen rules lessons: these are
   read, and the drilling for them is the tracking exercise in the shell,
   which is not ported yet.
   ===================================================================== */
function contactsDone() {
  var raw = recall('contacts', '');
  return raw ? raw.split(',') : [];
}
function contactsMark(id) {
  var d = contactsDone();
  if (d.indexOf(id) < 0) { d.push(id); remember('contacts', d.join(',')); }
}
function contactsIndex() {
  var box = $('contacts-index');
  box.textContent = '';
  var done = contactsDone();
  var wrap = document.createElement('div');
  wrap.className = 'ridx';
  CONTACTS_LESSONS.forEach(function (L, i) {
    var b = document.createElement('button');
    b.type = 'button';
    var m = document.createElement('span');
    var isDone = done.indexOf(L.id) >= 0;
    m.className = isDone ? 'done' : 'todo';
    m.textContent = isDone ? '[x]' : '[ ]';
    var t = document.createElement('span');
    t.textContent = L.id + '  ' + L.title;
    b.appendChild(m); b.appendChild(t);
    b.addEventListener('click', function () { openContact(i); });
    wrap.appendChild(b);
  });
  box.appendChild(wrap);
  var p = document.createElement('p');
  p.className = 'note';
  p.textContent = done.length + ' of ' + CONTACTS_LESSONS.length + ' read.';
  box.appendChild(p);

  /*  the two exercises and the card. Separate from the lessons because
      these are not read, they are done -- and the card is neither.  */
  var h = document.createElement('h3');
  h.textContent = 'Practice';
  box.appendChild(h);
  var g2 = document.createElement('div');
  g2.className = 'ridx';
  [['Tracking party', 'You have the plot. Which way, where, how close?',
    function () { openTrack(newSeed()); }],
   ['Ekelund', 'Range out of a course change, with bearings only',
    function () { openEkel(newSeed()); }],
   ['The card', 'The whole module on one screen',
    function () { openCard(); }]].forEach(function (e) {
    var b = document.createElement('button');
    b.type = 'button';
    var t = document.createElement('span');
    t.textContent = e[0];
    var sub = document.createElement('span');
    sub.className = 'sub'; sub.textContent = e[1];
    b.appendChild(t); b.appendChild(sub);
    b.addEventListener('click', e[2]);
    g2.appendChild(b);
  });
  box.appendChild(g2);

  /*  THE REPORTING STYLE, because it changes what the tracking table
      and the card say and the shell has had it as a setting from the
      start. Five ways of saying the same angle; which is right depends
      on who is listening.  */
  var h2 = document.createElement('h3');
  h2.textContent = 'Relative bearings, said as';
  box.appendChild(h2);
  var row = document.createElement('div');
  row.className = 'ct-rng';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Reporting style');
  RSTYLES.forEach(function (st) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = st.n;
    if (st.k === RSTYLE) b.setAttribute('data-on', '1');
    b.setAttribute('aria-pressed', st.k === RSTYLE ? 'true' : 'false');
    b.addEventListener('click', function () { setRstyle(st.k); contactsIndex(); });
    row.appendChild(b);
  });
  box.appendChild(row);

  $('contact').hidden = true;
  box.hidden = false;
}
function openContact(i) {
  var L = CONTACTS_LESSONS[i];
  $('contacts-index').hidden = true;
  $('contact').hidden = false;
  $('contact-title').textContent = L.id + '  ' + L.title;
  var body = $('contact-body');
  body.textContent = '';
  L.blocks.forEach(function (b) {
    if (b.t === 'p') {
      var blk = document.createElement('div');
      blk.className = 'prose';
      renderProse(b.s, blk);
      body.appendChild(blk);
      return;
    }
    var draw = CONTACTS_FIGS[b.kind];
    /*  a figure kind nothing can draw is a hole in the page, not a
        crash: say so rather than leaving a gap where the plot was.
        tests/contacts-figs-check.js makes sure this never fires.  */
    if (!draw) {
      var n = document.createElement('p');
      n.className = 'note';
      n.textContent = '[a ' + b.kind + ' figure belongs here]';
      body.appendChild(n);
      return;
    }
    body.appendChild(b.kind === 'plot' ? draw(b) : draw());
  });
  contactsMark(L.id);
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------------
   the shared bits of an exercise screen
   --------------------------------------------------------------------- */
function exHead(title) {
  $('contacts-index').hidden = true;
  $('contact').hidden = false;
  $('contact-title').textContent = title;
  var b = $('contact-body');
  b.textContent = '';
  return b;
}
function proseBox(box, text) {
  var d = document.createElement('div');
  d.className = 'prose';
  renderProse(text, d);
  box.appendChild(d);
  return d;
}
/*  a question with its options, marked the moment one is picked. The
    same shape as the rules lessons: the right one lights whatever you
    chose, so a wrong answer still shows you the right one.  */
function exQuestion(box, q, opts, onPick) {
  var wrap = document.createElement('div');
  wrap.className = 'exq';
  var h = document.createElement('h3');
  h.textContent = q;
  wrap.appendChild(h);
  var row = document.createElement('div');
  row.className = 'opts';
  var answered = false, btns = [];
  opts.forEach(function (text, i) {
    var ltr = 'abcd'.charAt(i);
    var b = document.createElement('button');
    b.className = 'opt'; b.type = 'button';
    var sp = document.createElement('span');
    sp.className = 'ltr'; sp.textContent = ltr + ')';
    b.appendChild(sp);
    b.appendChild(document.createTextNode(' ' + text));
    b.addEventListener('click', function () {
      if (answered) return;
      answered = true;
      onPick(ltr, function (rightLtr) {
        for (var k = 0; k < btns.length; k++) {
          btns[k].disabled = true;
          var kl = 'abcd'.charAt(k);
          if (kl === rightLtr) btns[k].dataset.state = 'right';
          else if (kl === ltr) btns[k].dataset.state = 'wrong';
        }
      });
    });
    btns.push(b);
    row.appendChild(b);
  });
  wrap.appendChild(row);
  box.appendChild(wrap);
}
function newSeed() { return 1 + Math.floor(Math.random() * 9999); }
function seedNote(box, seed, again) {
  var p = document.createElement('p');
  p.className = 'note';
  p.textContent = 'contact ' + seed + '. ';
  var a = document.createElement('button');
  a.type = 'button'; a.className = 'linkish';
  a.textContent = 'another';
  a.addEventListener('click', again);
  p.appendChild(a);
  box.appendChild(p);
}

/* =====================================================================
   THE TRACKING PARTY

   Five marks three minutes apart and the three questions the plot is
   there to answer. The sentences come from contacts-ex.js, which is
   diffed against the awk seed by seed in every reporting style -- so
   this screen is laying out the shell's words, not its own.
   ===================================================================== */
function openTrack(seed) {
  var EX = window.CONTACTS_EX;
  var t = EX.track(seed, rel_style);
  if (!t.ok) { openTrack(newSeed()); return; }
  var box = exHead('Tracking party');
  seedNote(box, seed, function () { openTrack(newSeed()); });

  proseBox(box, 'Own ship steady on course ' + t.oc + ', speed ' + t.os + ' knots.\n' +
                'Night orders: nothing is to come inside 3,000 yards.');

  /*  a real table, because this one is a table: the shell draws it with
      %-23s and a browser should not  */
  var tab = document.createElement('table');
  tab.className = 'ct-tab';
  var hr = document.createElement('tr');
  ['time', 'bearing', 'relative', 'range'].forEach(function (h) {
    if (h === 'relative' && RSTYLE === 'none') return;
    var th = document.createElement('th'); th.textContent = h; hr.appendChild(th);
  });
  tab.appendChild(hr);
  t.rows.forEach(function (r) {
    var tr = document.createElement('tr');
    [('000' + r.t).slice(-4), r.brg, r.rel, r.rng].forEach(function (v, i) {
      if (i === 2 && RSTYLE === 'none') return;
      var td = document.createElement('td');
      td.textContent = v;
      if (i === 3) td.className = 'num';
      tr.appendChild(td);
    });
    tab.appendChild(tr);
  });
  box.appendChild(tab);

  var said = {}, asked = 0;
  /*  the right answer is only revealed once all three are in, the way
      the shell marks them together -- otherwise Q1's answer gives Q2
      away  */
  var pending = [];
  function ask(which, q, opts) {
    exQuestion(box, q, opts, function (ltr, mark) {
      said[which] = ltr; pending.push({ which: which, mark: mark }); asked++;
      if (asked === 3) finish();
    });
  }
  function finish() {
    var m = EX.trackMark(seed, said.q1, said.q2, said.q3, rel_style, rel_other);
    pending.forEach(function (p) { p.mark(m[p.which].right); });
    showTrackMark(box, m);
  }
  ask('q1', 'Q1  Which way is her bearing drawing?', ['left', 'right', 'steady']);
  ask('q2', 'Q2  Where does she go?',
      ['she will cross ahead of you', 'she will pass astern of you',
       'neither - the bearing is steady, and she is on a collision course']);
  ask('q3', 'Q3  Roughly what is her CPA?',
      ['under 1,000 yards', '1,000 to 3,000 yards',
       '3,000 to 6,000 yards', 'over 6,000 yards']);
  window.scrollTo(0, 0);
}

function showTrackMark(box, m) {
  var mk = document.createElement('div');
  mk.className = 'exmark';
  box.appendChild(mk);

  var h = document.createElement('h3');
  h.textContent = m.n + ' of 3.';
  mk.appendChild(h);

  mk.appendChild(CONTACTS_FIGS.plot(m.fig));
  proseBox(mk, 'Y = you, head up. 1 to 5 = her, three minutes apart. * = CPA.\n' +
               'The upright line is your own track. Which side of you she crosses ' +
               'it is the whole question.');

  /*  SINGLE SPACES, NOT THE SHELL'S COLUMNS. The shell separates the
      answer from the verdict with three spaces so they line up under
      each other on a terminal; renderProse reads three spaces as a
      column and holds the paragraph, which put each verdict in a
      scrolling box and clipped "- you said C" off the end of it. The
      words are the shell's -- they are diffed -- but the spacing
      between them is this screen's business.  */
  function verdict(q) { return q.got ? '- right' : '- you said ' + (q.said || '-').toUpperCase(); }
  proseBox(mk, 'Q1 bearing ' + m.q1.line + ' ' + verdict(m.q1) + '\n\n' +
               m.q1.lead + '\n' + m.q1.why);
  proseBox(mk, 'Q2 ' + m.q2.line + ' ' + verdict(m.q2) + '\n\n' +
               'Q3 ' + m.q3.line + ' ' + verdict(m.q3));

  var say = 'What you would say:\n\n"' + m.report + '"\n\n' + m.findher;
  if (m.advice) say += '\n\n"' + m.advice + '"';
  proseBox(mk, say);
  mk.scrollIntoView({ block: 'start' });
}

/* =====================================================================
   EKELUND
   ===================================================================== */
function openEkel(seed) {
  var EX = window.CONTACTS_EX;
  var k = EX.ek(seed);
  if (!k.ok) { openEkel(newSeed()); return; }
  var box = exHead('Ekelund');
  seedNote(box, seed, function () { openEkel(newSeed()); });

  proseBox(box, 'She bears ' + k.tb + ' and holds her course and speed throughout.\n' +
                'You have bearings only. No range.');

  var tab = document.createElement('table');
  tab.className = 'ct-tab';
  var hr = document.createElement('tr');
  ['leg', 'own course', 'speed', 'bearing rate'].forEach(function (h) {
    var th = document.createElement('th'); th.textContent = h; hr.appendChild(th);
  });
  tab.appendChild(hr);
  k.legs.forEach(function (L) {
    var tr = document.createElement('tr');
    [String(L.n), L.co, String(L.sp), EX.rate(L.rate).replace(/^ +/, '') + ' deg/min']
      .forEach(function (v, i) {
        var td = document.createElement('td');
        td.textContent = v;
        if (i === 2 || i === 3) td.className = 'num';
        tr.appendChild(td);
      });
    tab.appendChild(tr);
  });
  box.appendChild(tab);
  proseBox(box, '(a bearing rate is + when the bearing is drawing right)');

  exQuestion(box, 'How far off is she?',
    ['under 8,000 yards', '8,000 to 15,000 yards',
     '15,000 to 25,000 yards', 'over 25,000 yards'],
    function (ltr, mark) {
      var m = EX.ekMark(seed, ltr);
      mark(m.right.toLowerCase());
      var mk = document.createElement('div');
      mk.className = 'exmark';
      box.appendChild(mk);
      proseBox(mk, (m.got ? '' : 'Not quite.\n\n') + m.head);
      var w = document.createElement('div');
      w.className = 'prose';
      m.work.forEach(function (line) {
        var pre = document.createElement('pre');
        pre.className = 'lp-pre';
        pre.textContent = line;
        w.appendChild(pre);
      });
      mk.appendChild(w);
      proseBox(mk, m.note);
      mk.scrollIntoView({ block: 'start' });
    });
  window.scrollTo(0, 0);
}

/* =====================================================================
   THE CARD
   ===================================================================== */
function openCard() {
  var box = exHead('Contacts - the card');
  /*  ONE BLOCK, NOT EIGHT. Nearly every line of the card is two columns
      -- a thing on the left and what it means on the right -- so
      renderProse holds almost all of it, and held blocks scroll
      independently: on a phone that was eight separate side-scrolls
      with the columns no longer lining up with each other. A card's
      layout IS the card, so it is kept whole and scrolls as one.

      One variant per reporting style, generated from ct_ref(): the card
      prints an example report, and the example reads differently under
      each.  */
  var d = document.createElement('div');
  d.className = 'prose';
  var pre = document.createElement('pre');
  pre.className = 'lp-pre card-pre';
  pre.textContent = (window.CONTACTS_CARD[RSTYLE] || window.CONTACTS_CARD.rn)
                      .replace(/\s+$/, '');
  d.appendChild(pre);
  box.appendChild(d);

  var n = document.createElement('p');
  n.className = 'note';
  n.textContent = 'Fixed layout, so the columns stay lined up - push it sideways on a narrow screen.';
  box.appendChild(n);
  window.scrollTo(0, 0);
}

/* =====================================================================
   ROUTER
   ===================================================================== */
var views = {
  home:       { el: 'v-home',       title: 'COLREGS' },
  lights:     { el: 'v-lights',     title: 'Lights' },
  shapes:     { el: 'v-shapes',     title: 'Day shapes' },
  sounds:     { el: 'v-sounds',     title: 'Sound signals' },
  encounters: { el: 'v-encounters', title: 'Encounters' },
  rules:      { el: 'v-rules',      title: 'The rules' },
  contacts:   { el: 'v-contacts',   title: 'Contact management' }
};
function go(name) {
  for (var k in views) if (views.hasOwnProperty(k)) $(views[k].el).hidden = (k !== name);
  $('title').textContent = views[name].title;
  $('back').hidden = (name === 'home');
  window.scrollTo(0, 0);
  if (name === 'lights' && !$('light-stage').firstChild) lightsNext();
  if (name === 'shapes' && !$('shape-stage').firstChild) shapesNext();
  if (name === 'sounds' && !$('sound-stage').firstChild) soundsNext();
  if (name === 'encounters') { if (!$('enc-stage').firstChild) encNext(); }
  if (name === 'rules') rulesIndex();
  if (name === 'contacts') contactsIndex();
}

/* =====================================================================
   WIRING
   ===================================================================== */
function setMode(m) {
  document.documentElement.setAttribute('data-mode', m);
  $('mode').textContent = m === 'night' ? 'DARK' : 'NIGHT';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', m === 'night' ? '#060101' : '#07090b');
  remember('mode', m);
  /* anything already drawn was drawn in the old palette */
  if (!$('v-lights').hidden) drawLights(D.vessels[lightIdx], lightBrg);
  if (!$('v-shapes').hidden) drawShapes(D.shapes[shapeIdx]);
  if (!$('v-sounds').hidden) drawSound(D.sounds[soundIdx]);
}

document.addEventListener('DOMContentLoaded', function () {
  setMode(recall('mode', 'dark'));
  RSTYLE = recall('rstyle', 'rn');
  $('mode').addEventListener('click', function () {
    setMode(document.documentElement.getAttribute('data-mode') === 'night' ? 'dark' : 'night');
  });
  $('back').addEventListener('click', function () {
    if (!$('lesson').hidden) { rulesIndex(); return; }
    if (!$('contact').hidden) { contactsIndex(); return; }
    go('home');
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { go(b.dataset.go); });
  });

  $('brg').addEventListener('input', function () {
    lightBrg = parseFloat($('brg').value);
    $('brg-out').textContent = ('00' + Math.round(nrm360(lightBrg))).slice(-3);
    drawLights(D.vessels[lightIdx], lightBrg);
  });
  $('deck').addEventListener('click', function () {
    DECK_ON = !DECK_ON;
    var b = $('deck');
    b.setAttribute('aria-pressed', DECK_ON ? 'true' : 'false');
    b.textContent = DECK_ON ? 'Deck lights ON' : 'Deck lights off';
    $('decknote').hidden = !DECK_ON;
    drawLights(D.vessels[lightIdx], lightBrg);
  });
  $('light-next').addEventListener('click', lightsNext);
  $('shape-next').addEventListener('click', shapesNext);
  $('sound-next').addEventListener('click', soundsNext);
  $('sound-play').addEventListener('click', function () {
    var secs = soundPattern(D.sounds[soundIdx].pattern);
    var b = $('sound-play');
    b.disabled = true;
    var was = b.textContent;
    b.textContent = '■  Sounding…';
    setTimeout(function () { b.disabled = false; b.textContent = was; }, Math.ceil(secs * 1000));
  });
  $('enc-next').addEventListener('click', encNext);
  $('enc-lights-btn').addEventListener('click', encLights);

  /* reference lists */
  var ll = $('light-list');
  D.vessels.forEach(function (v) {
    var d = document.createElement('div'); d.className = 'row';
    var b = document.createElement('b'); b.textContent = v.name;
    var s = document.createElement('span'); s.textContent = v.rule + '. ' + v.note;
    d.appendChild(b); d.appendChild(s); ll.appendChild(d);
  });
  var sl = $('shape-list');
  D.shapes.forEach(function (v) {
    var d = document.createElement('div'); d.className = 'row';
    var b = document.createElement('b'); b.textContent = v.name;
    var s = document.createElement('span'); s.textContent = v.rule + '. ' + v.note;
    d.appendChild(b); d.appendChild(s); sl.appendChild(d);
  });
  var dl = $('sound-list');
  D.sounds.forEach(function (v) {
    var d = document.createElement('div'); d.className = 'row';
    var p = document.createElement('b'); p.className = 'pat'; p.textContent = v.pattern;
    var b = document.createElement('b'); b.textContent = v.meaning;
    var s = document.createElement('span'); s.textContent = v.rule + '. ' + v.when;
    d.appendChild(p); d.appendChild(b); d.appendChild(s); dl.appendChild(d);
  });

  go('home');

  /* offline */
  var note = $('offline-note');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    /*  updateViaCache: 'none' IS THE OTHER HALF OF THE SAME FAULT.
        A browser only checks sw.js for updates on navigation, and that check
        goes through the HTTP cache unless the previous script's max-age was
        over 24 hours. GitHub Pages sends max-age=600, so for ten minutes
        after a push the browser compares the new sw.js against a CACHED COPY
        of the old one, sees no difference, and installs nothing. "Open it
        once with a signal" is then a no-op that looks exactly like the app
        being stuck - which is what it looked like.  */
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function () {
      note.textContent = 'Cached for offline use. Add to your home screen and it works with no signal.';
    }).catch(function () {
      note.textContent = 'Offline cache unavailable — the page still works while it is open.';
    });
  } else {
    note.textContent = 'Opened as a local file, so there is no offline cache to install — ' +
                       'everything is already in the file.';
  }
});

/*  A SEAM FOR THE DIFF, not an API.  The page never sees this: `module`
    is undefined in a browser.  tests/colregs-web-diff.sh loads this file
    in node and runs these against the awk originals over their whole
    input range, which is how "ported function-for-function" stops being
    a claim in a README and becomes a check that fails.  */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    nrm180: nrm180, nrm360: nrm360, fabs: fabs,
    arc_vis: arc_vis, rel_phrase: rel_phrase,
    aspect_words: aspect_words, lt_arc: lt_arc_web, lt_note: lt_note,
    red_green: red_green, rel_other: rel_other, enc_bore: function (bg, st) { var o = RSTYLE; RSTYLE = st; var r = enc_bore(bg); RSTYLE = o; return r; },
    rel_other_as: function (rel, st) { var o = RSTYLE; RSTYLE = st; var r = rel_other(rel); RSTYLE = o; return r; },
    rel_style: function (rel, st) { var o = RSTYLE; RSTYLE = st; var r = rel_style(rel); RSTYLE = o; return r; },
    heard: heard,
    //  tests/prose-reflow-check.js: the shell's line breaks are dropped
    //  for the browser, and this is what decides where they are kept
    renderProse: renderProse, proseKind: proseKind
  };
}

})();

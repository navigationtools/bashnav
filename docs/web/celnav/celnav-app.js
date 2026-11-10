/*  celnav's shell: the router, and the teaching track.

    This page WAS camera sight and nothing else. The shell tool has
    always been one celnav containing both the sights and the thirty-
    three lessons, and colregs keeps its lessons inside the tool, so the
    browser now matches: camera sight is a section rather than the whole
    of it. That costs one tap to the thing Larry uses most, which is why
    it was his call and not mine.

    camui.js is untouched. It drives the camera flow by element id and
    knows nothing about any of this; its panels simply live inside
    #v-camera now. Anything this file needs from it, it asks for by id.

    THE LESSONS ARE GENERATED, not typed: see
    docs/web/celnav/gen/make-celnav-web.sh. The prose is teach.awk's own
    output, the modules come from syl_init(), and the answers come from
    cmd=t_qmeta because ques() only sets them on the branch that does not
    print.

    THE FIGURES ARE GAPS, for now. Ten of the lessons draw on a 67 x 25
    character grid -- the globe with its graticule and circles of
    position, the celestial triangle, the LOP zoom -- and a picture of a
    terminal is the wrong thing in a browser 380px wide. Pass two draws
    them as SVG. Until then each one is a NAMED gap, so a lesson with a
    hole in it says so rather than quietly reading as though nothing is
    missing.  */

/*  REPAINTING WHEN THE DISPLAY MODE CHANGES.

    A canvas, and an SVG whose colours were read from the stylesheet at
    draw time, do not follow the stylesheet afterwards.  Switch to day
    with a plot on screen and the plot stays dark on a white page.

    Rather than have setMode know about every drawing in the app, whatever
    draws something says how to draw it again.  On a mode change, anything
    still in the document is repainted and anything detached is dropped,
    so the list cannot grow without bound.  */
var REPAINT = [];
function repaints(host, fn) {
  REPAINT.push({ host: host, fn: fn });
  fn();
}
window.addEventListener('visualmodechange', function () {
  REPAINT = REPAINT.filter(function (r) { return document.body.contains(r.host); });
  REPAINT.forEach(function (r) { r.fn(); });
});

'use strict';

(function () {

function $(id) { return document.getElementById(id); }
function mk(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function remember(k, v) { try { localStorage.setItem('celnav-' + k, v); } catch (e) {} }
function recall(k, d) {
  try { var v = localStorage.getItem('celnav-' + k); return v === null ? d : v; }
  catch (e) { return d; }
}

/* ---------------------------------------------------------------------
   PROSE FROM A TERMINAL, the same three shapes colregs settled on.

   teach.awk wraps at about 70 columns and those breaks are real newline
   characters. Honoured in a narrow box they break a second time, so a
   line becomes one full line and a stub. The breaks are dropped and the
   browser wraps -- except where the line breaks ARE the layout, which is
   decided per paragraph:

     pre    a column gutter (two or more spaces that do not follow
            sentence punctuation) or a hanging indent deeper than a
            list's. The correction bars, the deviation card, the
            interpolation tables and the almanac extracts all land here,
            which is why those figures needed no marker: they print as
            rows of text and holding them is the right answer.
     list   a numbered or lettered item, its lines joined and the marker
            given a hanging indent.
     flow   everything else.

   Conservative on purpose: a table flowed into a paragraph is
   unreadable, a paragraph left hard-wrapped is merely ugly.
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
function renderProse(text, box) {
  String(text).split(/\n[ \t]*\n/).forEach(function (par) {
    var lines = par.split('\n').filter(function (l) { return l.replace(/\s/g, '') !== ''; });
    if (!lines.length) return;
    var kind = proseKind(lines), e, i;

    if (kind === 'pre') {
      e = mk('pre', 'lp-pre');
      e.textContent = par.replace(/^\n+/, '').replace(/\s+$/, '');
      box.appendChild(e);
      return;
    }
    if (kind === 'flow') {
      box.appendChild(mk('p', 'lp', proseJoin(lines)));
      return;
    }
    var items = [], cur = null;
    for (i = 0; i < lines.length; i++) {
      if (PR_MARKER.test(lines[i])) { cur = [lines[i]]; items.push(cur); }
      else if (cur) cur.push(lines[i]);
      else { cur = [lines[i]]; items.push(cur); }
    }
    items.forEach(function (it) { box.appendChild(mk('div', 'lp-item', proseJoin(it))); });
  });
  return box;
}
function proseBox(box, text) {
  var d = mk('div', 'prose');
  renderProse(text, d);
  box.appendChild(d);
  return d;
}

/* =====================================================================
   THE SYLLABUS
   ===================================================================== */
function doneList() {
  var raw = recall('lessons', '');
  return raw ? raw.split(',') : [];
}
function markDone(id) {
  var d = doneList();
  if (d.indexOf(id) < 0) { d.push(id); remember('lessons', d.join(',')); }
}
function lessonById(id) {
  var L = window.CELNAV_LESSONS, i;
  for (i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
  return null;
}
function syllabus() {
  var box = $('syl-index');
  box.textContent = '';
  var done = doneList(), seen = {}, wrap = null;

  window.CELNAV_SYLLABUS.forEach(function (e) {
    if (!seen[e.module]) {
      seen[e.module] = 1;
      box.appendChild(mk('h3', null, e.module));
      wrap = mk('div', 'ridx');
      box.appendChild(wrap);
    }
    var b = mk('button'); b.type = 'button';
    var isDone = done.indexOf(e.id) >= 0;
    var m = mk('span', isDone ? 'done' : 'todo', isDone ? '[x]' : '[ ]');
    var t = mk('span', null, e.id + '  ' + e.title);
    b.appendChild(m); b.appendChild(t);
    b.addEventListener('click', function () { openLesson(e.id); });
    wrap.appendChild(b);
  });

  box.appendChild(mk('p', 'note',
    done.length + ' of ' + window.CELNAV_SYLLABUS.length + ' done.'));
  $('les').hidden = true;
  box.hidden = false;
}

/*  what each lesson's missing figure is, so a gap says what belongs in
    it rather than that something is absent. Second pass replaces these
    with the drawings; tests/celnav-lessons-check.js makes sure every
    lesson that has a gap has a line here.  */
var FIG_NAMES = {
  P2: 'the three positions, plotted together',
  F3: 'the circle of position, drawn on the globe',
  F4: 'two circles crossing, drawn on the globe',
  F5: 'the line of position, zoomed until the circle looks straight',
  T4: 'LHA as the angle at the pole, looking down on it',
  R1: 'the celestial triangle on the sky dome',
  R4: 'the intercept and the line of position, plotted',
  R5: 'a running fix, advanced for the run between sights',
  C1: 'the cut between two bodies, and the band of altitudes'
};

/*  "Q. stem?  a) one  b) two  c) three" -> the stem, and the options
    with their text. Null when it does not read that way, so the caller
    can fall back rather than show something wrong.  */
function splitQuestion(q) {
  var t = String(q).replace(/^Q\.\s*/, '');
  var i = t.search(/(^|\n)\s*a\)/);
  if (i < 0) return null;
  var stem = t.slice(0, i).replace(/\s+$/, '');
  var parts = t.slice(i).split(/\s(?=[a-d]\))/);
  var opts = [], k, s;
  for (k = 0; k < parts.length; k++) {
    s = parts[k].replace(/^\s+/, '').replace(/\s+$/, '');
    if (!/^[a-d]\)/.test(s)) continue;
    opts.push({ ltr: s.charAt(0), text: s.slice(2).replace(/^\s+/, '').replace(/\s+/g, ' ') });
  }
  if (!stem || opts.length < 2) return null;
  for (k = 0; k < opts.length; k++) if (!opts[k].text) return null;
  return { stem: stem, opts: opts };
}

function openLesson(id) {
  var L = lessonById(id);
  if (!L) return;
  $('syl-index').hidden = true;
  $('les').hidden = false;
  $('les-title').textContent = L.id + '  ' + L.title;

  var body = $('les-body');
  body.textContent = '';
  L.blocks.forEach(function (b) {
    if (b.t === 'p') { proseBox(body, b.s); return; }
    /*  a named gap. It is deliberately plain and deliberately obvious:
        a lesson missing its figure should look unfinished, because it
        is.  */
    var g = mk('div', 'fig-gap');
    g.appendChild(mk('span', 'fig-gap-tag', 'figure to come'));
    g.appendChild(mk('span', null, FIG_NAMES[L.id] || ('a ' + b.kind + ' figure')));
    body.appendChild(g);
  });

  /*  the question, marked in place  */
  var chk = $('les-check');
  chk.hidden = false;
  var qbox = $('les-q');
  qbox.textContent = '';

  var opts = $('les-opts');
  opts.textContent = '';
  $('les-answer').hidden = true;

  /*  THE OPTIONS GO ON THE BUTTONS. In the shell they are part of the
      question's own text -- "a) 30 miles   b) 300 miles   c) 1800
      miles", set in columns on one line -- and shown that way the line
      is held as a table, scrolls sideways on a phone, and takes the
      question stem with it: rendered, "A sight gives a zenith distance
      of 30 degrees" was clipped mid-sentence and the options were off
      the edge with only bare letters to press.

      So the stem is flowed and the options are split onto the buttons.
      That means parsing prose the awk never promised to shape, which is
      a thing to be careful with rather than a thing to avoid: all 33
      split cleanly, the check proves each one has a stem, two or more
      options, text on every one and the answer among them, and if a
      question ever arrives in a shape this cannot read it falls back to
      showing the question whole with lettered buttons.  */
  var parsed = splitQuestion(L.question);
  renderProse(parsed ? parsed.stem : L.question.replace(/^Q\.\s*/, ''), qbox);
  var letters = parsed
    ? parsed.opts.map(function (o) { return o.ltr; })
    : (L.question.match(/\b([a-d])\)/g) || []).map(function (x) { return x.charAt(0); });

  var answered = false, btns = [];
  letters.forEach(function (ltr, oi) {
    var b = mk('button', 'opt'); b.type = 'button';
    b.appendChild(mk('span', 'ltr', ltr + ')'));
    if (parsed) b.appendChild(mk('span', 'otext', parsed.opts[oi].text));
    b.addEventListener('click', function () {
      if (answered) return;
      answered = true;
      for (var k = 0; k < btns.length; k++) {
        btns[k].disabled = true;
        if (letters[k] === L.answer) btns[k].dataset.state = 'right';
        else if (letters[k] === ltr) btns[k].dataset.state = 'wrong';
      }
      $('les-verdict').textContent = (ltr === L.answer)
        ? 'Correct.' : 'Not quite — the answer is ' + L.answer.toUpperCase() + '.';
      $('les-why').textContent = L.why;
      $('les-answer').hidden = false;
      markDone(L.id);
    });
    btns.push(b);
    opts.appendChild(b);
  });

  window.scrollTo(0, 0);
}

/* =====================================================================
   SIGHT REDUCTION

   The tool's first purpose, and the browser had no way in: an altitude
   could only arrive from a photograph. Every piece of the arithmetic was
   already here and already diffed against the awk -- corrections(),
   reduce_sight(), solve_fix(), fix_geometry() -- and CELPLOT already
   kept the sight list, solved the fix and drew the sheet for the camera
   flow. So this is the way in and nothing else: a sight from a metal
   sextant, a plastic one or the camera becomes the same record,
   { body, jd, hs, ie, he, tm, pr, limb, utc }, and goes through the same
   solver.
   ===================================================================== */
/*  THE ENGINE IS NOT GLOBAL. camui.js builds its own with
    extendCelnav(makeCelnav(window.CELNAV_TABLES)) inside its IIFE, so
    there is no window.CN to borrow -- I assumed there was, and the first
    version of this reached for one and got undefined. One instance is
    built here the same way. They do not interfere: the engine's E.*
    fields are scratch, read immediately after the call that sets them.  */
var CN_ONE = null;
function CNe() {
  if (!CN_ONE && typeof makeCelnav === 'function')
    CN_ONE = (typeof extendCelnav === 'function')
      ? extendCelnav(makeCelnav(window.CELNAV_TABLES))
      : makeCelnav(window.CELNAV_TABLES);
  return CN_ONE;
}
var SVGNS = 'http://www.w3.org/2000/svg';

function sightFields() {
  var C = CNe();
  var d = $('s-date').value.trim(), t = $('s-time').value.trim();
  if (!d || !t) return { err: 'Give the UT date and time — the clock is what rules.' };
  var utc = d + ' ' + t;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(utc))
    return { err: 'UT as 2026-08-29 and 07:30:00.' };
  var body = $('s-body').value.trim();
  if (!body) return { err: 'Which body? A name, or a star number.' };
  var hs = C.parse_ang($('s-hs').value);
  if (hs === 'ERR' || isNaN(hs)) return { err: 'Hs as degrees and minutes, like 19 32.1.' };
  var num = function (id, dflt) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? dflt : v;
  };
  return { body: body, jd: C.parse_utc(utc), hs: hs,
           ie: num('s-ie', 0), he: num('s-he', 0),
           tm: num('s-tm', 10), pr: num('s-pr', 1010),
           limb: $('s-limb').value, utc: utc };
}
function sightAP() {
  var C = CNe();
  var la = C.parse_ang($('s-alat').value), lo = C.parse_ang($('s-alon').value);
  if (la === 'ERR' || lo === 'ERR' || isNaN(la) || isNaN(lo)) return null;
  return { lat: la, lon: lo };
}
/*  an angle as degrees and minutes. Altitudes get no hemisphere; a
    latitude or longitude gets one, and a longitude gets three digits.  */
/*  Degrees and minutes, split out so the two carries happen in the one
    place.  BOTH were wrong here.  The zero-pad was decided from m before
    toFixed(1) rounded it, so 9.956' asked for a pad and then printed
    "10.0" - the fix read 35 010.0' N.  And minutes rounding up to 60.0
    never carried into the degrees, so 29 59.97' printed as 29 60.0'.
    fmt_dm() in engine.awk carries at 59.95; this does the same.  */
/*  printf's %.*f. The implementation is C.fx() in engine2.js - one of it,
    in the engine, where tests/fmt-check.js holds it to awk's own printf.
    It is reached through CNe() because dm(), ddm() and mins() are called
    from a dozen places that do not carry the engine as an argument.  */
function f(v, dec) { return CNe().fx(v, dec); }
function f1(v) { return f(v, 1); }

function dmparts(v) {
  var neg = v < 0; v = Math.abs(v);
  var d = Math.floor(v), m = (v - d) * 60;
  if (m >= 59.95) { m = 0; d = d + 1; }
  var ms = f1(m);
  while (ms.length < 4) ms = '0' + ms;   /* awk's %04.1f: pad the ROUNDED
                                            string, never the value */
  return { neg: neg, d: d, m: ms };
}
function dm(v) {
  var p = dmparts(v);
  return (p.neg ? '-' : '') + p.d + '\u00b0 ' + p.m + "'";
}
/*  A GHA HAS NO HEMISPHERE. ddm() appends N/S or E/W, which is right for a
    latitude or a longitude and wrong for an hour angle: Aries at 091 01.8'
    is not 091 01.8' east of anything. This is awk's fmt_dm(x, 3).  */
function dm3(v) {
  var p = dmparts(v);
  return ('00' + p.d).slice(-3) + '\u00b0 ' + p.m + "'";
}
function ddm(v, lat) {
  var h = (v < 0) ? (lat ? 'S' : 'W') : (lat ? 'N' : 'E');
  var p = dmparts(v);
  return ('00' + p.d).slice(lat ? -2 : -3) + '\u00b0 ' + p.m + "' " + h;
}
function mins(v) { return (v >= 0 ? '+' : '\u2212') + f1(Math.abs(v)) + "'"; }

/*  THE CORRECTION CHAIN, SHOWN RATHER THAN SUMMED, in the order and with
    the parts the shell's own working shows -- Hs, IE, dip, Ha, refraction,
    semi-diameter, parallax, Ho -- because lesson S5 is about the size of
    each part and a single corrected number teaches nothing.

    Read out of the engine's E.* fields, not from a return value:
    corrections() returns Ho alone and stashes the parts, exactly as the
    awk does with its globals. And body_at() takes the NAME first and must
    run before corrections(), which reads the horizontal parallax and
    semi-diameter it sets. I had all three of those wrong by assuming, and
    the screen threw on every sight.  */
function showCorrections(sg) {
  var C = CNe(), box = $('s-corr');
  box.textContent = '';
  var gha = C.body_at(sg.body, sg.jd);
  if (gha === 'ERR') {
    box.appendChild(mk('p', 'note',
      'I do not know that body. A name, or a star number \u2014 the list is on the field.'));
    return null;
  }
  var ho = C.corrections(sg.hs, sg.ie, sg.he, sg.tm, sg.pr, sg.limb), E = C.E;
  var rows = [
    ['Hs', dm(sg.hs)],
    ['index error', mins(-sg.ie)],
    ['dip', mins(-E.C_DIP)],
    ['Ha', dm(E.C_HA)],
    ['refraction', mins(-E.C_REF)],
    ['semi-diameter', E.C_LIMB ? mins(E.C_LIMB) : '\u2014'],
    ['parallax', E.C_PAR ? mins(E.C_PAR) : '\u2014'],
    ['Ho', dm(ho)],
    ['GHA', ddm(E.B_GHA, false)],
    ['Dec', ddm(E.B_DEC, true)]
  ];
  var t = mk('table', 'kv');
  rows.forEach(function (r) {
    var tr = mk('tr');
    tr.appendChild(mk('th', null, r[0]));
    tr.appendChild(mk('td', 'num', r[1]));
    t.appendChild(tr);
  });
  box.appendChild(t);
  return ho;
}

function sightList() {
  var box = $('s-list');
  box.textContent = '';
  var all = window.CELPLOT.all();
  if (!all.length) {
    box.appendChild(mk('p', 'note', 'None yet. Two of different bodies give a fix.'));
    return;
  }
  var P = sightAP();
  var sol = P ? window.CELPLOT.solve(CNe(), P.lat, P.lon,
                                     parseFloat($('s-spd').value) || 0,
                                     parseFloat($('s-crs').value) || 0) : null;
  var t = mk('table', 'ct-tab');
  var hr = mk('tr');
  ['body', 'UT', 'Hs', 'Hc', 'Zn', 'intercept', ''].forEach(function (h) {
    hr.appendChild(mk('th', null, h));
  });
  t.appendChild(hr);
  all.forEach(function (s, i) {
    var lop = (sol && sol.lops && sol.lops[i]) ? sol.lops[i] : null;
    var tr = mk('tr');
    [s.body,
     (s.utc || '').replace(/^\d{4}-\d{2}-\d{2}[ T]/, ''),
     dm(s.hs),
     lop ? dm(lop.hc) : '\u2014',
     lop ? ('00' + Math.round(lop.zn)).slice(-3) : '\u2014',
     lop ? (f1(Math.abs(lop.intercept)) + ' nm ' +
            (lop.intercept >= 0 ? 'TOWARD' : 'AWAY')) : '\u2014'
    ].forEach(function (v, k) {
      var td = mk('td', (k >= 2) ? 'num' : null, v);
      tr.appendChild(td);
    });
    var td = mk('td');
    var x = mk('button', 'linkish', 'remove');
    x.type = 'button';
    x.addEventListener('click', function () {
      window.CELPLOT.remove(i); sightRefresh();
    });
    td.appendChild(x);
    tr.appendChild(td);
    t.appendChild(tr);
  });
  box.appendChild(t);
}

function sightFix() {
  var box = $('s-fix');
  box.textContent = '';
  var P = sightAP();
  if (!P) {
    box.appendChild(mk('p', 'note',
      'Give an assumed position above — the reduction is measured from it.'));
    $('s-sheet').textContent = '';
    return;
  }
  var all = window.CELPLOT.all();
  var sol = window.CELPLOT.solve(CNe(), P.lat, P.lon,
                                 parseFloat($('s-spd').value) || 0,
                                 parseFloat($('s-crs').value) || 0);
  if (!sol) {
    box.appendChild(mk('p', 'note', 'No sights kept yet.'));
    $('s-sheet').textContent = '';
    return;
  }
  if (!sol.ok || all.length < 2) {
    box.appendChild(mk('p', 'note', all.length === 1
      ? 'One sight is one line of position, not a fix. One more of a different body.'
      : 'Those sights do not cross usefully — bodies too close in azimuth.'));
  } else {
    var t = mk('table', 'kv');
    [['FIX', ddm(sol.lat, true) + '   ' + ddm(sol.lon, false)],
     ['from the AP', f1(Math.abs(sol.N)) + ' nm ' + (sol.N >= 0 ? 'N' : 'S') + ', ' +
                     f1(Math.abs(sol.E)) + ' nm ' + (sol.E >= 0 ? 'E' : 'W')]
    ].concat(sol.geom ? [['error ellipse',
       f1(sol.geom.major) + ' x ' + f1(sol.geom.minor) + ' nm']] : [])
     .forEach(function (r) {
      var tr = mk('tr');
      tr.appendChild(mk('th', null, r[0]));
      tr.appendChild(mk('td', 'num', r[1]));
      t.appendChild(tr);
    });
    box.appendChild(t);
  }
  /*  draw(svgNS, host, sol, opts) -- the solution, not the position: I
      guessed the signature first and it took the engine as its first
      argument, which is camui's call to solve(), not to draw().  */
  /*  the sheet takes its colours from the page, and is registered so a
      change of mode repaints it rather than leaving it in the old palette */
  repaints($('s-sheet'), function () {
    window.CELPLOT.draw(SVGNS, $('s-sheet'), sol, {
      css: function (n) {
        return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
      }
    });
  });
}

function sightRefresh() { sightList(); sightFix(); }

/*  both screens default to now, for the same reason the sight screen does:
    the overwhelmingly common case is "what is it doing at this moment",
    and a blank date field asks a question the device can answer itself  */
function utcToday() { return new Date().toISOString().slice(0, 10); }
function utcClock() { return new Date().toISOString().slice(11, 19); }

function almanacInit() {
  if (!$('a-date').value) $('a-date').value = utcToday();
  if (!$('a-time').value) $('a-time').value = utcClock();
  almanacShow();
}
function starsInit() {
  if (!$('st-date').value) $('st-date').value = utcToday();
  starsShow();
}

function sightInit() {
  /*  the body list the shell offers: the sun, moon, the four planets it
      carries and the 57 navigational stars, by name  */
  var C = CNe(), dl = $('s-bodies'), i;
  if (dl && !dl.firstChild) {
    ['Sun', 'Moon', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach(function (n) {
      dl.appendChild(mk('option', null, n)).value = n;
    });
    if (C && C.stars && C.stars.SNAME)
      for (i = 0; i < C.stars.SNAME.length; i++)
        dl.appendChild(mk('option', null, C.stars.SNAME[i])).value = C.stars.SNAME[i];
  }
  /*  the UT date defaults to today, because the clock is what rules and a
      sight with yesterday's date is the commonest way to get a fix that
      is confidently hundreds of miles out  */
  if (!$('s-date').value) $('s-date').value = new Date().toISOString().slice(0, 10);
  sightRefresh();
}

/* =====================================================================
   ROUTER
   ===================================================================== */
/* =====================================================================
   THE ALMANAC, AND THE STAR LIST

   The two screens a paper almanac is carried for. Nothing here is looked
   up: body_at() computes GHA and declination for the instant from the
   same series the sight reduction uses, so there is no year to run out
   and no volume to leave ashore.

   Both follow cmd_almanac() and cmd_stars() in src/celnav/engine.awk
   field for field, because the shell is the reference implementation and
   docs/web/tests/run-celnav-web.sh diffs the two.
   ===================================================================== */

/*  Aries is always shown. Every star sight is worked from the Greenwich
    hour angle of the First Point of Aries plus the star's SHA, so an
    almanac page without it is of no use for the thing stars are for.  */
function almanacShow() {
  var C = CNe(), box = $('a-out'), note = $('a-note');
  box.textContent = ''; note.textContent = '';
  var d = $('a-date').value.trim(), t = $('a-time').value.trim();
  if (!d || !t) { note.textContent = 'Give the UT date and time \u2014 the clock is what rules.'; return; }
  var utc = d + ' ' + t;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(utc)) {
    note.textContent = 'UT as 2026-08-29 and 07:34:00.'; return;
  }
  var jd = C.parse_utc(utc);
  var list = ($('a-bodies').value.trim() || 'sun,moon,venus,mars,jupiter,saturn')
               .split(',').map(function (x) { return x.trim(); }).filter(Boolean);

  var head = mk('p', 'note', 'JD ' + jd.toFixed(5) + '   \u0394T ' +
                f1(C.deltaT(C.E.UT_Y)) + ' s');
  box.appendChild(head);

  var t2 = mk('table', 'ct-tab');
  var hr = mk('tr');
  ['body', 'GHA', 'Dec', 'SD', 'HP'].forEach(function (h) { hr.appendChild(mk('th', null, h)); });
  t2.appendChild(hr);

  var tr = mk('tr');
  tr.appendChild(mk('td', null, 'Aries'));
  tr.appendChild(mk('td', 'num', dm3(C.gast(jd))));
  tr.appendChild(mk('td', 'num', '\u2014'));
  tr.appendChild(mk('td', 'num', '\u2014'));
  tr.appendChild(mk('td', 'num', '\u2014'));
  t2.appendChild(tr);

  var unknown = [];
  list.forEach(function (b) {
    if (C.body_at(b, jd) === 'ERR') { unknown.push(b); return; }
    var E = C.E, r = mk('tr');
    r.appendChild(mk('td', null, E.B_NAME));
    r.appendChild(mk('td', 'num', dm3(E.B_GHA)));
    r.appendChild(mk('td', 'num', ddm(E.B_DEC, true)));
    r.appendChild(mk('td', 'num', E.B_SD > 0 ? f1(E.B_SD) + "'" : '\u2014'));
    r.appendChild(mk('td', 'num', E.B_HP > 0 ? f1(E.B_HP) + "'" : '\u2014'));
    t2.appendChild(r);
    /*  a star or planet also gets its SHA and magnitude, the way the
        shell prints a second line for it  */
    if (E.B_SHA !== '' && E.B_MAG !== '' && E.B_SD === 0) {
      var r2 = mk('tr', 'sub');
      r2.appendChild(mk('td', null, ''));
      r2.appendChild(mk('td', 'num', 'SHA ' + dm3(E.B_SHA)));
      r2.appendChild(mk('td', 'num', 'mag ' + f1(+E.B_MAG)));
      r2.appendChild(mk('td', null, ''));
      r2.appendChild(mk('td', null, ''));
      t2.appendChild(r2);
    }
  });
  box.appendChild(t2);
  if (unknown.length)
    note.textContent = 'I do not know: ' + unknown.join(', ') +
      '. A name, or a star number from the list.';
}

/*  The 57 stars, computed for the date rather than reprinted. star_pos()
    applies proper motion and precession, so Alpheratz is not where a 2000
    catalogue puts it. SHA is 360 minus the right ascension, which is the
    form a sight form and a star finder use.  */
function starsShow() {
  var C = CNe(), box = $('st-out');
  box.textContent = '';
  var d = $('st-date').value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { box.appendChild(mk('p', 'note', 'A UT date as 2026-08-29.')); return; }
  var p = d.split('-');
  var jd = C.jdate(+p[0], +p[1], +p[2]) + C.deltaT(+p[0]) / 86400.0;
  var find = $('st-find').value.trim().toLowerCase();
  var S = C.stars, E = C.E, shown = 0;

  var t2 = mk('table', 'ct-tab');
  var hr = mk('tr');
  ['no', 'name', 'SHA', 'Dec', 'mag'].forEach(function (h) { hr.appendChild(mk('th', null, h)); });
  t2.appendChild(hr);
  /*  ZERO-BASED. The awk's SNUM[1]..SNUM[NSTAR] became SNUM[0]..SNUM[NSTAR-1]
      in the port, and engine.js says so on star_pos: "i is 0-based here".
      Written as the awk writes it, this list opened at Ankaa - Alpheratz,
      star 1, was simply absent - and ran one past the end.  */
  for (var i = 0; i < S.NSTAR; i++) {
    var name = S.SNAME[i];
    if (find && String(S.SNUM[i]) !== find && name.toLowerCase().indexOf(find) < 0) continue;
    C.star_pos(i, jd);
    shown++;
    var r = mk('tr');
    r.appendChild(mk('td', 'num', String(S.SNUM[i])));
    r.appendChild(mk('td', null, name));
    r.appendChild(mk('td', 'num', dm3(C.nrm360(360 - E.P_RA))));
    r.appendChild(mk('td', 'num', ddm(E.P_DEC, true)));
    r.appendChild(mk('td', 'num', (+S.SMAG[i]).toFixed(2)));
    t2.appendChild(r);
  }
  box.appendChild(t2);
  if (!shown) box.appendChild(mk('p', 'note', 'No star of that name or number.'));
}

/* =====================================================================
   THE TWO LATITUDES THAT NEED NO FIX

   A noon sight and a Polaris sight each give one line - a parallel of
   latitude - and neither needs crossing to be true. They are here because
   they are the two sights a navigator can work with the least gear: the
   noon sight needs almost no clock, and Polaris needs no reduction at all.

   Both follow cmd_noon() and cmd_polaris() in src/celnav/engine.awk field
   for field. docs/web/tests/celnav-latitude.js diffs the rendered tables
   against the shell's own printed working, the way celnav-tables.js does
   for the almanac.
   ===================================================================== */

/*  the correction rows, in the order and with the signs the shell's
    working shows. Shared by both screens because the chain is the same
    one; the shell omits semi-diameter and parallax for a star, and
    corrections() leaves C_LIMB and C_PAR at zero there, so the same
    filter does both.  */
function corrRows(C, hs, ie, star) {
  var E = C.E, rows = [['index error', mins(-ie)], ['dip', mins(-E.C_DIP)],
                       ['refraction', mins(-E.C_REF)]];
  if (!star) {
    rows.push(['semi-diameter', mins(E.C_LIMB)]);
    rows.push(['parallax', mins(E.C_PAR)]);
  }
  return rows;
}
function kvTable(rows, cls) {
  var t = mk('table', cls || 'kv');
  rows.forEach(function (r) {
    var tr = mk('tr', r[2] || null);
    tr.appendChild(mk('th', null, r[0]));
    tr.appendChild(mk('td', 'num', r[1]));
    t.appendChild(tr);
  });
  return t;
}
function numOf(id, dflt) {
  var v = parseFloat($(id).value);
  return isNaN(v) ? dflt : v;
}

function noonInit() {
  if (!$('n-date').value) $('n-date').value = utcToday();
  noonShow();
}
function polarisInit() {
  if (!$('p-date').value) $('p-date').value = utcToday();
  if (!$('p-time').value) $('p-time').value = utcClock();
  polarisShow();
}

function noonShow() {
  var C = CNe(), box = $('n-out'), note = $('n-note');
  box.textContent = ''; note.textContent = '';
  var lat = C.parse_ang($('n-lat').value), lon = C.parse_ang($('n-lon').value);
  if (lat === 'ERR' || lon === 'ERR' || isNaN(lat) || isNaN(lon)) {
    note.textContent = 'A DR latitude and longitude — 41 49.0 N and 071 24.0 W.'; return;
  }
  var d = $('n-date').value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { note.textContent = 'A UT date as 2026-08-29.'; return; }

  /*  midnight of the date, exactly as the awk takes it: int(jd+0.5)-0.5,
      so any time of day on that date gives the same starting point  */
  var jd0 = Math.floor(C.parse_utc(d) + 0.5) - 0.5;
  var jd = C.lan_jd(lon, jd0);
  C.body_at('Sun', jd);
  var dec = C.E.B_DEC;
  var h1 = C.reduce_sight(lat, lon, C.E.B_GHA, dec);
  var gha = C.E.B_GHA;
  C.jd2cal(jd);
  var cy = C.E.CAL_Y, cm = C.E.CAL_M, cd = C.E.CAL_D;
  var ut = C.E.CAL_FRAC * 24.0;
  var lmt = ut + lon / 15.0;
  if (lmt < 0) lmt += 24; if (lmt >= 24) lmt -= 24;
  var eot = C.nrm180(gha - (15.0 * ut - 180.0)) * 4.0;
  var mer = 90.0 - C.fabs(lat - dec);
  var sth = (lat > dec);

  /*  how fast the altitude falls two minutes either side. The altitude is
      at a stationary point, so it changes as the SQUARE of the time - which
      makes the clock nearly irrelevant at a workaday altitude and quite
      relevant near the zenith. The shell says which case it is rather than
      asserting the reassuring one, and so does this.  */
  C.body_at('Sun', jd + 120.0 / 86400.0);
  var h2 = C.reduce_sight(lat, lon, C.E.B_GHA, C.E.B_DEC);
  var fall = (h1 - h2) * 60.0;

  box.appendChild(mk('h3', null, 'Local apparent noon — ' +
    cy + '-' + ('0' + cm).slice(-2) + '-' + ('0' + cd).slice(-2)));
  box.appendChild(kvTable([
    ['Position', ddm(lat, true) + '   ' + ddm(lon, false)],
    ['Sun on your meridian at', C.fmt_hms(ut) + ' UT'],
    [' in local mean time', C.fmt_hms(lmt)],
    ['Equation of time', (eot >= 0 ? '+' : '−') + f1(Math.abs(eot)) +
       ' min — the sundial is ' + (eot >= 0 ? 'ahead of' : 'behind') + ' the clock'],
    ["Sun's declination then", ddm(dec, true)],
    ['Meridian altitude to expect', f1(mer) + '°, bearing ' +
       (sth ? 'SOUTH (180)' : 'NORTH (000)')]
  ]));

  /*  A SUN THAT PASSES OVERHEAD HAS NO SIDE. Within a degree of the zenith
      the azimuth swings through 180 degrees as it crosses, so "bearing
      south" above is a statement the DR cannot support - and the sign of
      the latitude below turns on it.  */
  if (C.fabs(lat - dec) < 1.0)
    box.appendChild(mk('p', 'warn', 'The sun passes within a degree of your zenith today, ' +
      'so which side of you it stands is not decidable from the DR, and its azimuth swings ' +
      'through 180° as it crosses. Note which way it bore.'));

  box.appendChild(mk('p', 'note', fall <= 1.0
    ? 'Two minutes either side of it the altitude is only ' + f1(fall) +
      "' lower, so catch the maximum by watching it — the clock is not the point."
    : 'Two minutes either side of it the altitude is ' + f1(fall) +
      "' lower: the sun passes close to your zenith and crosses fast, so the maximum is " +
      'sharp and a careless moment here costs real altitude.'));

  var hsv = $('n-hs').value.trim();
  if (!hsv) {
    box.appendChild(mk('p', 'note',
      'Follow the sun up, catch the highest reading, and give it back in the Hs field.'));
    return;
  }
  var hs = C.parse_ang(hsv);
  if (hs === 'ERR' || isNaN(hs)) { note.textContent = 'Hs as degrees and minutes, like 68 14.2.'; return; }

  var lim = $('n-limb').value || 'L';
  var ie = numOf('n-ie', 0);
  var ho = C.corrections(hs, ie, numOf('n-he', 0), numOf('n-tm', 10), numOf('n-pr', 1010), lim);
  var zd = 90.0 - ho;
  var la = sth ? dec + zd : dec - zd;

  var rows = [['Hs (sextant, ' + (lim === 'U' ? 'upper' : 'lower') + ' limb)', dm(hs)]]
    .concat(corrRows(C, hs, ie, false));
  rows.push(['Ho (observed altitude)', dm(ho)]);
  rows.push(['Zenith distance  90 − Ho', dm(zd)]);
  rows.push(['Declination', ddm(dec, true)]);
  rows.push(['LATITUDE   dec ' + (sth ? '+' : '−') + ' ZD', ddm(la, true), 'tot']);
  box.appendChild(kvTable(rows));

  box.appendChild(mk('p', 'note', 'The sun was taken as bearing ' + (sth ? 'south' : 'north') +
    ' of you, from the DR.'));
  if (C.fabs(lat - dec) < 1.0)
    box.appendChild(mk('p', 'warn', 'CAREFUL: the sun passes within a degree of your zenith, ' +
      'so which side it stood is not obvious from the DR. Your own note of whether it bore ' +
      'north or south is what decides the sign here.'));
  box.appendChild(mk('p', 'note', 'One line only: a parallel of latitude. It needs no crossing ' +
    'to be true, and tells you nothing at all about your longitude.'));
}

function polarisShow() {
  var C = CNe(), box = $('p-out'), note = $('p-note');
  box.textContent = ''; note.textContent = '';
  var lon = C.parse_ang($('p-lon').value);
  if (lon === 'ERR' || isNaN(lon)) { note.textContent = 'A DR longitude — 071 24.0 W.'; return; }
  var d = $('p-date').value.trim(), t = $('p-time').value.trim();
  if (!d || !t) { note.textContent = 'Give the UT date and time.'; return; }
  var utc = d + ' ' + t;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(utc)) {
    note.textContent = 'UT as 2026-08-29 and 23:12:00.'; return;
  }
  var jd = C.parse_utc(utc);
  if (C.body_at('Polaris', jd) === 'ERR') {
    note.textContent = 'Polaris is not in the catalogue.'; return;
  }
  var E = C.E, lha = C.nrm360(E.B_GHA + lon), p = 90.0 - E.B_DEC;

  box.appendChild(mk('h3', null, 'Polaris — ' + utc + ' UT'));
  box.appendChild(kvTable([
    ['Longitude', ddm(lon, false) + '   (latitude is what this sight gives you)'],
    ['Polaris GHA', dm3(E.B_GHA)],
    ['LHA   GHA + longitude', dm3(lha)],
    ['Declination', ddm(E.B_DEC, true)],
    ['Polar distance  90 − dec', f1(p * 60.0) + "'"]
  ]));

  var hsv = $('p-hs').value.trim();
  if (!hsv) {
    box.appendChild(kvTable([
      ['Correction to Ho at this LHA', mins(-p * C.cosd(lha) * 60.0) +
         '   (it swings ±' + f1(p * 60.0) + "' in a day)"]
    ]));
    box.appendChild(mk('p', 'note', 'Take Polaris and give the reading back in the Hs field.'));
    return;
  }
  var hs = C.parse_ang(hsv);
  if (hs === 'ERR' || isNaN(hs)) { note.textContent = 'Hs as degrees and minutes, like 42 18.4.'; return; }

  var ie = numOf('p-ie', 0);
  var ho = C.corrections(hs, ie, numOf('p-he', 0), 10, 1010, '');
  var first = -p * C.cosd(lha);
  var la = C.pol_lat(ho, E.B_DEC, lha);
  var exact = la - ho;

  var rows = [['Hs (sextant)', dm(hs)]].concat(corrRows(C, hs, ie, true));
  rows.push(['Ho (observed altitude)', dm(ho)]);
  rows.push(['Correction, first order  −p cos LHA',
             (first * 60.0 >= 0 ? '+' : '−') + Math.abs(first * 60.0).toFixed(2) + "'"]);
  rows.push(['Correction, solved exactly',
             (exact * 60.0 >= 0 ? '+' : '−') + Math.abs(exact * 60.0).toFixed(2) + "'"]);
  rows.push(['LATITUDE', ddm(la, true), 'tot']);
  box.appendChild(kvTable(rows));

  /*  Printing both corrections every time is what makes the almanac's
      three columns make sense, rather than being asserted.  */
  box.appendChild(mk('p', 'note', 'The two corrections differ by ' +
    (C.fabs(exact - first) * 60.0).toFixed(2) + "'. That gap is what the a1 and a2 columns of " +
    "the almanac's Polaris table exist to supply — they are the next terms of a series " +
    'for the line above them.'));
  if (la < 0)
    box.appendChild(mk('p', 'warn', 'WARNING: that is a southern latitude, which cannot be ' +
      'right — Polaris is not visible from the southern hemisphere at all.'));
  box.appendChild(mk('p', 'note', 'One line again, and a parallel of latitude: it says nothing ' +
    'about your longitude. But it is available all night, not for the few minutes either side ' +
    'of noon.'));
}

/* =====================================================================
   SIGHT PLANNING, AND THE COMPASS CHECK

   cmd_plan() and cmd_compass() in src/celnav/engine.awk. The part that
   decides anything - which bodies are up, in what order, and which three
   to recommend - is plan_sky() in the engine, shared with the shell and
   diffed against it by name over 400 generated cases. What is here is the
   screen: the twilight table, the prose, and the sky view.
   ===================================================================== */

/*  the shell's evt2(): a twilight event as UT and local mean time, or a
    pair of dashes where the sun never reaches that altitude at all -
    which is not an error but a fact about high latitudes in midsummer.  */
function evt2(C, jd, jd0, lon) {
  if (jd < 0) return '—';
  var u = (jd - jd0) * 24, l = u + lon / 15.0;
  if (l < 0) l += 24; if (l >= 24) l -= 24;
  return C.fmt_hms(u).slice(0, 5) + ' / ' + C.fmt_hms(l).slice(0, 5);
}

/*  THE SKY VIEW, as a drawing rather than as characters. Same projection
    the shell's plot_sky() uses and for the same reason: centre overhead,
    rim the horizon, north up and east right, so the picture matches what
    you see when you look up rather than what a chart shows. The radius is
    linear in zenith distance, (90 - alt) / 90, which is the projection a
    star finder uses.  */
function skyView(C, plan, css) {
  var NS = 'http://www.w3.org/2000/svg', W = 320, H = 320;
  var cx = W / 2, cy = H / 2, R = cx - 26;
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  var picked = plan.best || [];
  svg.setAttribute('aria-label', 'The sky from overhead: ' + plan.rows.length +
    ' bodies above five degrees' + (picked.length ? ', three of them marked as the suggested set' : ''));
  function e(n, a, p) {
    var x = document.createElementNS(NS, n), q;
    for (q in a) if (a.hasOwnProperty(q)) x.setAttribute(q, a[q]);
    (p || svg).appendChild(x);
    return x;
  }
  var line = css('--line'), dim = css('--dim'), text = css('--text'), accent = css('--accent');

  /*  the horizon and the two altitude rings the shell draws, at 60 and
      30 degrees - thirds of the radius, because the scale is linear  */
  e('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: dim, 'stroke-width': 1.2 });
  [0.3333, 0.6667].forEach(function (f) {
    e('circle', { cx: cx, cy: cy, r: R * f, fill: 'none', stroke: line,
                  'stroke-width': 1, 'stroke-dasharray': '2 3' });
  });
  //  the four cardinal spokes, so an azimuth can be read off by eye
  [0, 90, 180, 270].forEach(function (a) {
    e('line', { x1: cx, y1: cy, x2: cx + R * C.sind(a), y2: cy - R * C.cosd(a),
                stroke: line, 'stroke-width': 1, opacity: 0.6 });
  });
  //  the zenith
  e('line', { x1: cx - 4, y1: cy, x2: cx + 4, y2: cy, stroke: accent, 'stroke-width': 1.4 });
  e('line', { x1: cx, y1: cy - 4, x2: cx, y2: cy + 4, stroke: accent, 'stroke-width': 1.4 });

  [['N', cx, 14], ['S', cx, H - 5], ['W', 11, cy + 4], ['E', W - 11, cy + 4]].forEach(function (c) {
    e('text', { x: c[1], y: c[2], fill: dim, 'font-size': 12, 'text-anchor': 'middle' })
      .textContent = c[0];
  });

  /*  a body per mark. The suggested three are labelled 1, 2 and 3 in the
      accent colour and everything else is a small dot, which is the
      shell's "* = usable body, 1 2 3 = the suggested set" in a picture.  */
  plan.rows.forEach(function (r, i) {
    var rr = (90 - r.alt) / 90.0;
    if (rr > 1.02) return;
    var x = cx + R * rr * C.sind(r.zn), y = cy - R * rr * C.cosd(r.zn);
    var pick = picked.indexOf(i);
    if (pick >= 0) {
      e('circle', { cx: x, cy: y, r: 8, fill: 'none', stroke: accent, 'stroke-width': 1.4 });
      e('text', { x: x, y: y + 4, fill: accent, 'font-size': 11, 'text-anchor': 'middle',
                  'font-weight': '700' }).textContent = String(pick + 1);
      e('text', { x: x, y: y - 12, fill: accent, 'font-size': 10, 'text-anchor': 'middle' })
        .textContent = r.name;
    } else {
      e('circle', { cx: x, cy: y, r: r.mag < 1 ? 3 : 2, fill: text, opacity: 0.75 });
    }
  });
  return svg;
}

function planInit() {
  if (!$('pl-date').value) $('pl-date').value = utcToday();
  if (!$('pl-time').value) $('pl-time').value = utcClock();
  planShow();
}
function compassInit() {
  if (!$('c-date').value) $('c-date').value = utcToday();
  if (!$('c-time').value) $('c-time').value = utcClock();
  if (!$('c-body').value) $('c-body').value = 'Sun';
  sightInit();          /* the body datalist lives on the sight screen */
  compassShow();
}

function planShow() {
  var C = CNe(), box = $('pl-out'), sky = $('pl-sky'), list = $('pl-list'), note = $('pl-note');
  box.textContent = ''; sky.textContent = ''; list.textContent = ''; note.textContent = '';
  var lat = C.parse_ang($('pl-lat').value), lon = C.parse_ang($('pl-lon').value);
  if (lat === 'ERR' || lon === 'ERR' || isNaN(lat) || isNaN(lon)) {
    note.textContent = 'A DR latitude and longitude — 41 49.0 N and 071 24.0 W.'; return;
  }
  var d = $('pl-date').value.trim(), t = $('pl-time').value.trim();
  var utc = d + ' ' + t;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(utc)) {
    note.textContent = 'UT as 2026-08-29 and 23:30:00.'; return;
  }
  var jd = C.parse_utc(utc);
  var jd0 = C.jdate(C.E.UT_Y, C.E.UT_MO, C.E.UT_D);

  /*  the three horizons, morning and evening. -0.833 is the sun's upper
      limb on the visible horizon; -6 and -12 are civil and nautical
      twilight, and the window between them is the one you shoot stars in.  */
  var tw = [['Sunrise / set', -0.833], ['Civil twilight', -6], ['Nautical', -12]];
  var t2 = mk('table', 'ct-tab');
  var hr = mk('tr');
  ['', 'morning  UT / LMT', 'evening  UT / LMT'].forEach(function (h) { hr.appendChild(mk('th', null, h)); });
  t2.appendChild(hr);
  tw.forEach(function (row) {
    var tr = mk('tr');
    tr.appendChild(mk('td', null, row[0]));
    tr.appendChild(mk('td', 'num', evt2(C, C.find_cross(jd0, lat, lon, row[1], 1), jd0, lon)));
    tr.appendChild(mk('td', 'num', evt2(C, C.find_cross(jd0, lat, lon, row[1], -1), jd0, lon)));
    t2.appendChild(tr);
  });
  box.appendChild(t2);

  var ill = C.moon_ill(jd);
  var plan = C.plan_sky(jd, lat, lon), sp = plan.sunalt;
  box.appendChild(mk('p', 'note', 'Moon ' + ill.toFixed(0) + '% illuminated, ' + C.E.MOON_PH + '.'));
  box.appendChild(mk('p', sp > -6 && sp <= -0.9 ? 'good' : 'note',
    sp > -0.9  ? 'The sun is above the horizon: sun sights only, and possibly the moon or Venus.'
  : sp > -6    ? 'Civil twilight — the brightest stars and planets with a sharp horizon. Prime time.'
  : sp > -12   ? 'Nautical twilight: a good star horizon, and the fainter stars are workable.'
               : 'Full night. The horizon is too dark for a reliable sight.'));

  if (!plan.rows.length) {
    list.appendChild(mk('p', 'note', 'Nothing usable above five degrees of altitude at this time.'));
    return;
  }

  /*  THE PICTURE BEFORE THE TABLE. The table is sixty rows at night and
      the thing a navigator actually wants from it - is the sky well
      spread, and where do I point the sextant - is in the drawing.  */
  sky.appendChild(mk('h3', null, 'The sky from overhead'));
  sky.appendChild(skyView(C, plan, function (n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
  }));
  sky.appendChild(mk('p', 'note', 'Centre is overhead and the rim is the horizon, north up and ' +
    'east right — the way a star finder is drawn, and the way the sky looks when you tip your ' +
    'head back. The broken rings are 60° and 30° of altitude.'));

  if (plan.best) {
    var b = plan.best.map(function (i) { return plan.rows[i]; });
    var bt = mk('table', 'kv');
    b.forEach(function (r, i) {
      var tr = mk('tr', 'tot');
      tr.appendChild(mk('th', null, (i + 1) + ' ' + r.name));
      tr.appendChild(mk('td', 'num', 'alt ' + f1(r.alt) + '° Zn ' + f1(r.zn) + '°'));
      bt.appendChild(tr);
    });
    list.appendChild(mk('h3', null, 'Best three for a fix — ' +
      plan.spread.toFixed(0) + '° of azimuth spread at the narrowest'));
    list.appendChild(bt);
    list.appendChild(mk('p', 'note', 'Brightest usable, chosen to make the smallest of the three ' +
      'azimuth separations as large as it can be. A fix from three bodies in the same quarter of ' +
      'the sky is three lines that cross at a shallow angle, and its error ellipse is long.'));
  } else if (sp > -0.9) {
    list.appendChild(mk('p', 'note', 'Daylight: take a sun line now and cross it with a second ' +
      'sun line after a run of two hours or more, or with the moon if she is up.'));
  }

  var lt = mk('table', 'ct-tab');
  var lh = mk('tr');
  ['body', 'alt', 'Zn', 'mag', 'note'].forEach(function (h) { lh.appendChild(mk('th', null, h)); });
  lt.appendChild(lh);
  plan.rows.forEach(function (r, i) {
    var tr = mk('tr', plan.best && plan.best.indexOf(i) >= 0 ? 'picked' : null);
    tr.appendChild(mk('td', null, r.name));
    tr.appendChild(mk('td', 'num', f1(r.alt)));
    tr.appendChild(mk('td', 'num', f1(r.zn)));
    tr.appendChild(mk('td', 'num', f1(r.mag)));
    tr.appendChild(mk('td', null, r.note));
    lt.appendChild(tr);
  });
  list.appendChild(mk('h3', null, 'Everything above five degrees, by azimuth'));
  list.appendChild(lt);
  if (sp > -0.9) list.appendChild(mk('p', 'note', 'Stars are omitted — the sun is up.'));
}

function compassShow() {
  var C = CNe(), box = $('c-out'), note = $('c-note');
  box.textContent = ''; note.textContent = '';
  var lat = C.parse_ang($('c-lat').value), lon = C.parse_ang($('c-lon').value);
  if (lat === 'ERR' || lon === 'ERR' || isNaN(lat) || isNaN(lon)) {
    note.textContent = 'A DR latitude and longitude — 41 49.0 N and 071 24.0 W.'; return;
  }
  var d = $('c-date').value.trim(), t = $('c-time').value.trim(), utc = d + ' ' + t;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(utc)) {
    note.textContent = 'UT as 2026-08-29 and 10:15:00.'; return;
  }
  var body = $('c-body').value.trim();
  if (!body) { note.textContent = 'Which body? A name, or a star number.'; return; }
  var jd = C.parse_utc(utc);
  if (C.body_at(body, jd) === 'ERR') {
    note.textContent = 'I do not know that body. A name, or a star number.'; return;
  }
  var E = C.E, name = E.B_NAME;
  C.reduce_sight(lat, lon, E.B_GHA, E.B_DEC);
  var zn = E.R_ZN, hc = E.R_HC;

  box.appendChild(mk('h3', null, 'Compass check — ' + name + ', ' + utc + ' UT'));
  var rows = [
    ['Position', ddm(lat, true) + '   ' + ddm(lon, false)],
    ['True azimuth of ' + name, f1(zn) + '° T'],
    ['Altitude then', f1(hc) + '°']
  ];
  /*  THE AMPLITUDE, only on the horizon. Within two degrees of it the
      azimuth follows from the declination and the latitude alone, with no
      altitude and no reduction at all - which is why a sunrise bearing is
      the classic compass check and needs nothing but the almanac.  */
  if (C.fabs(hc) < 2) {
    var amp = C.amplitude(E.B_DEC, lat);
    rows.push(['Amplitude (body on the horizon)', f1(C.fabs(amp)) + '° ' +
      (E.B_DEC >= 0 ? 'N' : 'S') + ' of ' + (zn < 180 ? 'E' : 'W')]);
  }

  var brg = $('c-brg').value.trim();
  if (brg) {
    var cb = C.parse_ang(brg);
    if (cb === 'ERR' || isNaN(cb)) { note.textContent = 'A compass bearing in degrees, like 118.5.'; return; }
    var ce = C.nrm180(zn - cb);
    rows.push(['Compass bearing observed', f1(cb) + '° C']);
    rows.push(['Compass error', f1(C.fabs(ce)) + '° ' + (ce >= 0 ? 'EAST' : 'WEST'), 'tot']);
    var vr = $('c-var').value.trim();
    if (vr) {
      var vv = C.parse_ang(vr);
      if (vv === 'ERR' || isNaN(vv)) { note.textContent = 'Variation in degrees, + east, like -14.0.'; return; }
      var dev = C.nrm180(ce - vv);
      rows.push(['Variation (chart)', f1(C.fabs(vv)) + '° ' + (vv >= 0 ? 'EAST' : 'WEST')]);
      rows.push(['Deviation of this compass', f1(C.fabs(dev)) + '° ' +
        (dev >= 0 ? 'EAST' : 'WEST'), 'tot']);
    }
  }
  box.appendChild(kvTable(rows));

  if (!brg)
    box.appendChild(mk('p', 'note', 'Take a bearing of ' + name + ' over the compass and put it ' +
      'in, and this becomes your compass error. Add the chart variation and the error splits into ' +
      'variation and the deviation of your own compass.'));
  if (hc > 25)
    box.appendChild(mk('p', 'warn', 'The body is ' + hc.toFixed(0) + '° up. An azimuth check ' +
      'is most reliable below about 20° — high up the azimuth changes fast and a bearing ' +
      'over the card is hard to take honestly.'));
  box.appendChild(mk('p', 'note', 'One azimuth check gives the deviation on the heading you are ' +
    'on and no other. Deviation is a curve around the card, and to know the whole of it you swing ' +
    'the ship.'));
}

/* =====================================================================
   PUB. 249, GENERATED, AND THE TUTOR THAT MARKS YOUR WORKING

   cmd_tabargs() and cmd_tabcheck() in src/celnav/engine.awk. tab_args(),
   tab_entry() and tab_Z() are in the engine and diffed against the awk at
   full precision; what is here is the page, the rule at its foot, and the
   attribution of a difference.

   THE COMPARISON ATTRIBUTES RATHER THAN REPORTS. The engine has reduced
   the same sight from the same assumed position exactly, so a difference
   is the reader's or the table's - and the two are distinguishable,
   because the table's own rounding is small and bounded while every
   common mistake has a size of its own: the interpolation applied
   backwards is twice the interpolation, a declination one degree off is
   d, an LHA one degree off is the gap between two rows.
   ===================================================================== */

var TAB = null;        /* the arguments the page was printed for */

function tablesInit() {
  if (!$('t-date').value) $('t-date').value = utcToday();
  if (!$('t-time').value) $('t-time').value = utcClock();
  sightInit();          /* the body datalist lives on the sight screen */
}

function tablesShow() {
  var C = CNe(), args = $('t-args'), pg = $('t-page'), note = $('t-note');
  args.textContent = ''; pg.textContent = ''; $('t-check').textContent = '';
  $('t-work').hidden = true; note.textContent = ''; TAB = null;

  var d = $('t-date').value.trim(), t = $('t-time').value.trim(), utc = d + ' ' + t;
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(utc)) {
    note.textContent = 'UT as 2026-08-29 and 07:30:00.'; return;
  }
  var body = $('t-body').value.trim();
  if (!body) { note.textContent = 'Which body? A name, or a star number.'; return; }
  var la = $('t-lat').value.trim(), lo = $('t-lon').value.trim();
  if (C.parse_ang(la) === 'ERR' || C.parse_ang(lo) === 'ERR' || la === '' || lo === '') {
    note.textContent = 'A DR latitude and longitude — 41 49.0 N and 071 24.0 W.'; return;
  }
  if (!C.tab_args(utc, body, la, lo)) {
    note.textContent = 'I do not know that body. A name, or a star number.'; return;
  }
  var E = C.E;
  TAB = { utc: utc, body: body, name: E.B_NAME, lat: la, lon: lo,
          gha: E.TA_GHA, dec: E.TA_DEC, alat: E.TA_ALAT, alon: E.TA_ALON,
          lha: E.TA_LHA, decd: E.TA_DECD, decm: E.TA_DECM };

  /* ---- the entering arguments ------------------------------------ */
  args.appendChild(mk('h3', null, 'Entering arguments for Pub. 249'));
  var rows = [
    [TAB.name + ' at ' + utc + ' UT', 'GHA ' + dm3(TAB.gha) + ' Dec ' + ddm(TAB.dec, true)],
    ['DR', ddm(C.parse_ang(la), true) + '   ' + ddm(C.parse_ang(lo), false)],
    ['Assumed latitude', Math.abs(TAB.alat) + '° ' + (TAB.alat >= 0 ? 'N' : 'S') +
       ' the whole degree nearest the DR'],
    ['Assumed longitude', ddm(TAB.alon, false) + ' chosen to make the LHA whole'],
    ['LHA', String(TAB.lha), 'tot'],
    ['Declination', Math.abs(TAB.decd) + '° ' + (TAB.dec >= 0 ? 'N' : 'S') + ' ' +
       f1(TAB.decm) + "' enter at " + Math.abs(TAB.decd) + '°, interpolate the ' +
       f1(TAB.decm) + "' with d"]
  ];
  var hs = $('t-hs').value.trim(), ho = null;
  if (hs) {
    var hsv = C.parse_ang(hs);
    if (hsv === 'ERR' || isNaN(hsv)) { note.textContent = 'Hs as degrees and minutes, like 19 32.1.'; return; }
    ho = C.corrections(hsv, numOf('t-ie', 0), numOf('t-he', 0), 10, 1010, 'C');
    TAB.ho = ho;
    rows.push(['Ho', C.fmt_dm(ho, 2) + ' from Hs ' + hs]);
  }
  args.appendChild(kvTable(rows));

  /* ---- the page -------------------------------------------------- */
  var same = ((TAB.alat >= 0 && TAB.decd >= 0) || (TAB.alat < 0 && TAB.decd < 0));
  pg.appendChild(mk('h3', null, 'Pub. 249 — lat ' + Math.abs(TAB.alat) + '° ' +
    (TAB.alat >= 0 ? 'N' : 'S') + ', declination ' + Math.abs(TAB.decd) + '° ' +
    (TAB.dec >= 0 ? 'N' : 'S') + ', ' + (same ? 'SAME' : 'CONTRARY') + ' name'));
  var tb = mk('table', 'ct-tab');
  var hr = mk('tr');
  ['LHA', 'Hc', 'd', 'Z', ''].forEach(function (h, i) {
    hr.appendChild(mk('th', i < 4 ? 'num' : null, h));
  });
  tb.appendChild(hr);
  for (var i = TAB.lha - 3; i <= TAB.lha + 3; i++) {
    C.tab_entry(TAB.alat, TAB.decd, i);
    var tr = mk('tr', i === TAB.lha ? 'picked' : null);
    tr.appendChild(mk('td', 'num', String(C.nrm360(i))));
    tr.appendChild(mk('td', 'num', C.fmt_dm(E.TB_HC, 2)));
    tr.appendChild(mk('td', 'num', (E.TB_D >= 0 ? '+' : '−') + f1(Math.abs(E.TB_D))));
    tr.appendChild(mk('td', 'num', f(E.TB_Z, 0)));
    tr.appendChild(mk('td', null, i === TAB.lha ? '← your LHA' : ''));
    tb.appendChild(tr);
  }
  pg.appendChild(tb);
  /*  THE RULE AT THE FOOT OF THE PAGE, which is the step this screen
      exists to teach: the table gives Z and the navigator converts it.  */
  pg.appendChild(mk('p', 'note', TAB.alat >= 0
    ? 'N. Lat. LHA greater than 180 … Zn = Z  LHA less than 180 … Zn = 360 − Z'
    : 'S. Lat. LHA greater than 180 … Zn = 180 − Z  LHA less than 180 … Zn = 180 + Z'));
  pg.appendChild(mk('p', 'note', 'Hc is the altitude at the whole degree of declination above. ' +
    'd is how much it changes per whole degree, so the minutes of declination are interpolated ' +
    "with it: Hc + d × (mins / 60)."));
  $('t-work').hidden = false;
}

function tablesMark() {
  var C = CNe(), box = $('t-check');
  box.textContent = '';
  if (!TAB) { $('t-note').textContent = 'Work out the page first.'; return; }
  var E = C.E;
  C.tab_entry(TAB.alat, TAB.decd, TAB.lha);
  var hcT = E.TB_HC, dcol = E.TB_D;
  var ex = C.reduce_sight(TAB.alat, TAB.alon, TAB.gha, TAB.dec);
  var z = C.tab_Z(E.R_ZN, TAB.lha, TAB.alat), zn = E.R_ZN;

  box.appendChild(mk('h3', null, 'Your working against the exact solution'));
  box.appendChild(kvTable([
    ['From the page', 'Hc ' + C.fmt_dm(hcT, 2) + ' d ' +
       (dcol >= 0 ? '+' : '−') + f1(Math.abs(dcol)) + ' Z ' + f(z, 0)],
    ['Interpolated', C.fmt_dm(hcT + dcol * (TAB.decm / 60) / 60, 2) +
       ' = Hc + d × ' + f1(TAB.decm) + ' / 60']
  ]));

  var uhc = $('t-uhc').value.trim();
  if (uhc) {
    var u = C.parse_ang(uhc);
    if (u === 'ERR' || isNaN(u)) { $('t-note').textContent = 'Your Hc as degrees and minutes.'; return; }
    var diff = (u - ex) * 60;
    var back = hcT - dcol * (TAB.decm / 60) / 60;
    var d1 = C.reduce_sight(TAB.alat, TAB.alon, TAB.gha, TAB.dec + (TAB.dec >= 0 ? 1 : -1));
    var d2 = C.reduce_sight(TAB.alat, TAB.alon, TAB.gha + 1, TAB.dec);
    box.appendChild(kvTable([
      ['Your Hc', C.fmt_dm(u, 2)],
      ['Exact Hc', C.fmt_dm(ex, 2)],
      ['Difference', (diff >= 0 ? '+' : '−') + f1(Math.abs(diff)) + "'", 'tot']
    ]));
    /*  EVERY COMMON MISTAKE HAS A SIZE OF ITS OWN, and the order matters:
        rounding first, because it is the expected answer, then the three
        slips in the order of how often they happen.  */
    var note;
    if (C.fabs(diff) <= 0.6)
      note = 'Rounding in the table and in the interpolation, which is expected and is why ' +
             'the tables are worked to a tenth.';
    else if (C.fabs(u - back) * 60 < 0.6)
      note = 'The interpolation was applied the WRONG WAY: d is ' +
             (dcol >= 0 ? 'positive, so it is added' : 'negative, so it is subtracted') +
             ' as declination increases.';
    else if (C.fabs(u - d1) * 60 < 2.0)
      note = 'That is the entry for a declination one whole degree off.';
    else if (C.fabs(u - d2) * 60 < 2.0)
      note = 'That is the entry for an LHA one degree off — the commonest arithmetic slip ' +
             'in the whole method.';
    else
      note = 'Larger than rounding and not one of the usual slips. Check the arguments above ' +
             'against your own working, one line at a time.';
    box.appendChild(mk('p', C.fabs(diff) <= 0.6 ? 'good' : 'warn', note));
  }

  var uz = $('t-uz').value.trim();
  if (uz) {
    var zv = C.parse_ang(uz);
    if (zv === 'ERR' || isNaN(zv)) { $('t-note').textContent = 'Your Z in whole degrees.'; return; }
    box.appendChild(kvTable([
      ['Your Z', f(zv, 0)],
      ['Z from the page', f(z, 0) + ' → Zn ' + f1(zn) + ' by the rule at the foot']
    ]));
    if (C.fabs(C.nrm180(zv - z)) < 1.0)
      box.appendChild(mk('p', 'good', 'Z agrees.'));
    else if (C.fabs(C.nrm180(zv - zn)) < 1.0)
      box.appendChild(mk('p', 'warn', 'That is Zn, not Z. The table prints the azimuth ANGLE and ' +
        'the rule at the foot of the page converts it — which is the step to practise.'));
    else
      box.appendChild(mk('p', 'warn', 'Z disagrees by more than a degree. Check which pole you ' +
        'measured from.'));
  }

  if (uhc && TAB.ho !== undefined && TAB.ho !== null) {
    var u2 = C.parse_ang(uhc);
    box.appendChild(kvTable([
      ['Ho − your Hc', f1(C.fabs(TAB.ho - u2) * 60) + "' " +
         ((TAB.ho - u2) >= 0 ? 'TOWARD' : 'AWAY')],
      ['and exactly', f1(C.fabs(TAB.ho - ex) * 60) + "' " +
         ((TAB.ho - ex) >= 0 ? 'TOWARD' : 'AWAY'), 'tot']
    ]));
    /*  AN INTERCEPT THIS LONG IS NOT A TABLE PROBLEM. The assumed position
        is within half a degree of the DR, so the intercept can only be a
        few tens of miles unless something upstream is wrong - the wrong
        body, the wrong hour, or a sight from a different day. Saying so
        saves the reader hunting for an interpolation error that is not
        there.  */
    if (C.fabs(TAB.ho - ex) * 60 > 60)
      box.appendChild(mk('p', 'warn', 'An intercept of more than 60 miles is not a table error. ' +
        'The assumed position is within half a degree of the DR, so check the body, the hour and ' +
        'the date of the sight before looking at the working.'));
  }
}

/* =====================================================================
   THE SANDBOX: ONE SPHERICAL TRIANGLE, AND THREE SLIDERS

   cmd_t_sandbox() in src/celnav/teach.awk. The whole of celestial
   navigation is the triangle zenith - elevated pole - body, and its three
   given parts are the three sliders: co-latitude, polar distance and the
   LHA between them. Move one and the computed altitude and azimuth follow.

   There is no new arithmetic. Hc and Zn are reduce_sight(), which is
   already diffed against the awk at full precision over 400 cases; what is
   here is the projection and the drawing. The shell draws this in
   characters on a 61 x 25 grid and the arcs come out as dotted lines
   because that is what a terminal can do. A browser can draw the great
   circles, so it does: each arc is the actual great circle between its two
   endpoints, sampled and drawn as a polyline rather than approximated.
   ===================================================================== */

/*  a great-circle arc between two points given as altitude and azimuth,
    sampled. Slerp on the unit vectors - interpolating the altitude and
    azimuth separately would give a curve that is not a great circle, and
    the three sides of this triangle ARE great circles.  */
function skyArc(C, a1, z1, a2, z2, n) {
  var v1 = [C.cosd(a1) * C.cosd(z1), C.cosd(a1) * C.sind(z1), C.sind(a1)];
  var v2 = [C.cosd(a2) * C.cosd(z2), C.cosd(a2) * C.sind(z2), C.sind(a2)];
  var dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
  if (dot > 1) dot = 1; if (dot < -1) dot = -1;
  var w = Math.acos(dot), out = [], i;
  for (i = 0; i <= n; i++) {
    var t = i / n, s1, s2;
    if (w < 1e-9) { s1 = 1 - t; s2 = t; }
    else { s1 = Math.sin((1 - t) * w) / Math.sin(w); s2 = Math.sin(t * w) / Math.sin(w); }
    var x = v1[0]*s1 + v2[0]*s2, y = v1[1]*s1 + v2[1]*s2, z = v1[2]*s1 + v2[2]*s2;
    var nn = Math.sqrt(x*x + y*y + z*z);
    out.push([C.asind(z / nn), C.nrm360(C.atan2d(y / nn, x / nn))]);
  }
  return out;
}
/*  the midpoint of an arc, for its label - the awk's arc_mid()  */
function arcMid(C, a1, z1, a2, z2) {
  var x = (C.cosd(a1)*C.cosd(z1) + C.cosd(a2)*C.cosd(z2)) / 2;
  var y = (C.cosd(a1)*C.sind(z1) + C.cosd(a2)*C.sind(z2)) / 2;
  var z = (C.sind(a1) + C.sind(a2)) / 2;
  var n = Math.sqrt(x*x + y*y + z*z);
  if (n < 1e-9) return null;
  return [C.asind(z / n), C.nrm360(C.atan2d(y / n, x / n))];
}

function triangleView(C, lat, dec, lha, css) {
  var NS = 'http://www.w3.org/2000/svg', W = 340, H = 340;
  var cx = W / 2, cy = H / 2, R = cx - 28;
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  function e(n, a, p) {
    var x = document.createElementNS(NS, n), q;
    for (q in a) if (a.hasOwnProperty(q)) x.setAttribute(q, a[q]);
    (p || svg).appendChild(x);
    return x;
  }
  var line = css('--line'), dim = css('--dim'), text = css('--text'),
      accent = css('--accent'), warn = css('--warn'), good = css('--good');

  var hc = C.asind(C.sind(lat)*C.sind(dec) + C.cosd(lat)*C.cosd(dec)*C.cosd(lha));
  var zn = C.nrm360(C.atan2d(-C.cosd(dec)*C.sind(lha),
             C.cosd(lat)*C.sind(dec) - C.sind(lat)*C.cosd(dec)*C.cosd(lha)));
  var palt = lat >= 0 ? lat : -lat, paz = lat >= 0 ? 0 : 180;

  svg.setAttribute('aria-label', 'The navigational triangle: zenith at the centre, the ' +
    (lat >= 0 ? 'north' : 'south') + ' celestial pole at altitude ' + f1(palt) +
    ' degrees, and the body at altitude ' + f1(hc) + ' degrees, azimuth ' + f1(zn));

  e('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: dim, 'stroke-width': 1.2 });
  [0.3333, 0.6667].forEach(function (fr) {
    e('circle', { cx: cx, cy: cy, r: R * fr, fill: 'none', stroke: line,
                  'stroke-width': 1, 'stroke-dasharray': '2 3' });
  });
  [0, 90, 180, 270].forEach(function (a) {
    e('line', { x1: cx, y1: cy, x2: cx + R * C.sind(a), y2: cy - R * C.cosd(a),
                stroke: line, 'stroke-width': 1, opacity: 0.5 });
  });

  var P = function (alt, az) {
    var r = (90 - alt) / 90.0;
    return [cx + R * r * C.sind(az), cy - R * r * C.cosd(az)];
  };
  /*  BELOW THE HORIZON IS OUTSIDE THE RIM. An arc to a body with a
      negative altitude runs off the plot, so the polyline is broken where
      it leaves the horizon rather than drawn into the margin - and the
      prose below says the body is not visible, which is the honest
      version of a picture that cannot show it.  */
  var arc = function (pts, colour, width) {
    var run = [];
    var flush = function () {
      if (run.length > 1)
        e('polyline', { points: run.join(' '), fill: 'none', stroke: colour,
                        'stroke-width': width, 'stroke-linecap': 'round' });
      run = [];
    };
    pts.forEach(function (q) {
      if (q[0] < 0) { flush(); return; }
      var xy = P(q[0], q[1]);
      run.push(xy[0].toFixed(2) + ',' + xy[1].toFixed(2));
    });
    flush();
  };

  arc(skyArc(C, 90, 0, palt, paz, 48), dim, 1.6);          /* co-latitude  */
  arc(skyArc(C, 90, 0, hc, zn, 48), accent, 1.8);          /* zenith dist  */
  arc(skyArc(C, palt, paz, hc, zn, 48), good, 1.8);        /* polar dist   */

  /*  the labels on the arc midpoints, the way the shell puts 90-L, 90-Hc
      and 90-d on its three sides  */
  [[arcMid(C, 90, 0, palt, paz), '90 − L', dim],
   [arcMid(C, 90, 0, hc, zn), '90 − Hc', accent],
   [arcMid(C, palt, paz, hc, zn), '90 − d', good]].forEach(function (L) {
    if (!L[0] || L[0][0] < 0) return;
    var xy = P(L[0][0], L[0][1]);
    e('text', { x: xy[0], y: xy[1] - 6, fill: L[2], 'font-size': 11,
                'text-anchor': 'middle' }).textContent = L[1];
  });

  /*  THE ZENITH LABEL GOES BELOW ITS DOT. Above it, at the centre of the
      plot, it collided with whichever arc label happened to fall there -
      and two of the three arcs always meet at the zenith, so something
      always falls there. Below is the one direction nothing points.  */
  var mark = function (alt, az, label, colour, below, what) {
    if (alt < 0) return;
    var xy = P(alt, az);
    e('circle', { cx: xy[0], cy: xy[1], r: 4.5, fill: colour, 'data-pt': what });
    e('text', { x: xy[0], y: xy[1] + (below ? 17 : -9), fill: colour, 'font-size': 12,
                'text-anchor': 'middle', 'font-weight': '700' }).textContent = label;
  };
  mark(90, 0, 'Z', text, true, 'zenith');
  mark(palt, paz, lat >= 0 ? 'P (N)' : 'P (S)', dim, false, 'pole');
  mark(hc, zn, '★', accent, false, 'body');

  [['N', cx, 15], ['S', cx, H - 6], ['W', 12, cy + 4], ['E', W - 12, cy + 4]].forEach(function (c) {
    e('text', { x: c[1], y: c[2], fill: dim, 'font-size': 12, 'text-anchor': 'middle' })
      .textContent = c[0];
  });
  return { svg: svg, hc: hc, zn: zn };
}

function sandboxShow() {
  var C = CNe(), box = $('sb-out');
  var lat = parseFloat($('sb-lat').value), dec = parseFloat($('sb-dec').value),
      lha = C.nrm360(parseFloat($('sb-lha').value));
  $('sb-lat-v').textContent = f1(Math.abs(lat)) + '° ' + (lat >= 0 ? 'N' : 'S');
  $('sb-dec-v').textContent = f1(Math.abs(dec)) + '° ' + (dec >= 0 ? 'N' : 'S');
  $('sb-lha-v').textContent = f1(lha) + '°';
  box.textContent = '';

  var t = triangleView(C, lat, dec, lha, function (n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
  });
  box.appendChild(t.svg);
  box.appendChild(kvTable([
    ['Computed altitude Hc', f(t.hc, 2) + '°'],
    ['Azimuth Zn', f1(t.zn) + '° T', 'tot']
  ]));

  /*  the same four things the shell says, under the same conditions  */
  if (t.hc < 0)
    box.appendChild(mk('p', 'warn', 'The body is below the horizon from here — no sight is ' +
      'possible, and the two arcs that reach it leave the plot.'));
  else if (t.hc > 80)
    box.appendChild(mk('p', 'warn', 'Very high: the azimuth swings fast, so a small position ' +
      'error moves Zn a lot.'));
  else if (t.hc < 15)
    box.appendChild(mk('p', 'warn', 'Low: refraction is uncertain down here.'));
  if (C.fabs(C.nrm180(lha)) < 3)
    box.appendChild(mk('p', 'good', 'LHA near zero: the body is on your meridian — this is the ' +
      'noon sight, where altitude alone gives latitude and the azimuth is due north or south.'));

  box.appendChild(mk('p', 'note', 'Z is your zenith, P the elevated pole and ★ the body. The ' +
    'three sides are the three parts a sight reduction is given: 90 − L from the zenith to the ' +
    'pole, 90 − d from the pole to the body, and the LHA between them at P. Solving the ' +
    'triangle for the remaining side gives 90 − Hc, and for the remaining angle, Zn.'));
}

function sandboxInit() { sandboxShow(); }

/* =====================================================================
   THE ANNOTATED WALKTHROUGH

   cmd_t_walk() in src/celnav/teach.awk: one real sight, worked in eight
   steps with two of framing either side. Generated, not retyped -
   docs/web/celnav/gen/make-celnav-web.sh runs each step and dumps what it
   printed, the same way the thirty-three lessons are done, so the two
   cannot drift.

   THE THREE FIGURES ARE REAL DRAWINGS. The lessons' grid figures are
   named gaps because a picture of a terminal is the wrong thing in a
   browser; these three are not, because the app already draws all of
   them. The triangle at step 4 is the sandbox's triangleView(); the
   plotting sheets at steps 7 and 8 are the sight screen's CELPLOT.draw(),
   handed the azimuths and intercepts plot_sheet() dumped under FIGDUMP.
   ===================================================================== */

var WALK_AT = 1;

function walkShow() {
  var box = $('walk-body'), W = window.CELNAV_WALK || [], C = CNe();
  box.textContent = '';
  if (!W.length) {
    box.appendChild(mk('p', 'note', 'The walkthrough did not load.'));
    return;
  }
  if (WALK_AT < 1) WALK_AT = 1;
  if (WALK_AT > W.length) WALK_AT = W.length;
  var S = W[WALK_AT - 1];

  box.appendChild(mk('h2', null, S.title));
  var css = function (n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
  };

  S.blocks.forEach(function (b) {
    if (b.t === 'p') { proseBox(box, b.s); return; }

    if (b.t === 'plot') {
      /*  the sheet the sight screen draws, from the shell's own lines.
          `name` is what the label under each LOP reads, and the shell
          letters them a, b, c - so the letters are kept rather than
          invented, because the prose beside the figure refers to them.  */
      if (b.title) box.appendChild(mk('h3', null, b.title));
      var host = mk('div', 'walkfig');
      box.appendChild(host);
      window.CELPLOT.draw('http://www.w3.org/2000/svg', host, {
        ok: !!b.fix, n: b.lops.length, N: b.fixN, E: b.fixE,
        lops: b.lops.map(function (L) {
          return { zn: L.zn, intercept: L.p, name: L.label };
        })
      }, { css: css });
      box.appendChild(mk('p', 'note', b.lops.length === 1
        ? 'The dashed line is the azimuth out of the assumed position; the solid one is the line of position, square across it.'
        : 'Three lines, and the fix where they cross. The ellipse is what one minute of sight error does to it.'));
      return;
    }

    if (b.t === 'fig') {
      /*  step 4's triangle, for this walkthrough's own sight: the
          latitude, declination and LHA come from W_setup() through the
          generator rather than being typed in here.  */
      var K = window.CELNAV_WALK_CASE;
      if (!K) { box.appendChild(mk('p', 'note', '(figure)')); return; }
      var t = triangleView(C, K.lat, K.dec, K.lha, css);
      var host2 = mk('div', 'walkfig');
      host2.appendChild(t.svg);
      box.appendChild(host2);
      box.appendChild(kvTable([
        ['Latitude', ddm(K.lat, true)],
        ['Declination', ddm(K.dec, true)],
        ['LHA', f1(K.lha) + '°'],
        ['Computed altitude Hc', f(t.hc, 2) + '° Zn ' + f1(t.zn) + '° T', 'tot']
      ]));
      return;
    }
  });

  $('walk-pos').textContent = 'Step ' + WALK_AT + ' of ' + W.length;
  $('walk-prev').disabled = (WALK_AT === 1);
  $('walk-next').disabled = (WALK_AT === W.length);
  window.scrollTo(0, 0);
  remember('walkstep', String(WALK_AT));
}

function walkInit() {
  /*  come back to the step you left, the way the lessons do: ten steps is
      more than one sitting on a phone at sea  */
  var k = parseInt(recall('walkstep', '1'), 10);
  WALK_AT = isNaN(k) ? 1 : k;
  walkShow();
}

/* =====================================================================
   THE DRILLS

   drill_gen(), drill_show() and drill_mark() in src/celnav/teach.awk. Six
   kinds of generated problem with known answers.

   A SEED IS THE PROBLEM'S NAME. "red 4821" has to be the same sight here
   and at a terminal, so a drill worked on deck can be checked anywhere -
   which makes the pseudo-random sequence part of the specification. The
   generator is in the engine for that reason and
   docs/web/tests/drill-check.js holds it to the awk seed for seed, down
   to which body each one picks and which seeds it refuses.

   The MARKING tolerances are the shell's, to the value: 0.3' on Ho, 1.0'
   on a GHA, 0.5' on a declination, 0.6 degrees on Zn in the reduction
   drill and 1.0 in the full one, half a mile on an intercept and eight
   tenths in the full one, and two miles on a fix. They are not rounded
   off or tidied here, because a drill that marks to a different standard
   than the tool is a different drill.
   ===================================================================== */

var DRILL = null;     /* the problem on screen */

/*  the fields each kind asks for: id, label, placeholder  */
var DRILL_FIELDS = {
  corr: [['d-a1', 'Observed altitude Ho', '19 24.8']],
  alm:  [['d-a1', 'GHA', '283 41.6'], ['d-a2', 'Declination (S negative)', '61 36.5 N']],
  red:  [['d-a1', 'Computed altitude Hc', '19 23.3'], ['d-a2', 'Azimuth Zn, degrees', '26.9']],
  int:  [['d-a1', 'Intercept, nm (+ toward, − away)', '1.6']],
  full: [['d-a1', 'Intercept, nm (+ toward, − away)', '1.6'],
         ['d-a2', 'Azimuth Zn, degrees', '26.9']],
  fix:  [['d-a1', 'Fix latitude', '35 10.0 N'], ['d-a2', 'Fix longitude', '040 16.0 W']]
};

function drillInit() {
  if (!$('d-seed').value) $('d-seed').value = String(1 + Math.floor(Math.random() * 9000));
  drillNew();
}
function drillNew() {
  var C = CNe(), kind = $('d-kind').value, note = $('d-note');
  var seed = parseInt($('d-seed').value, 10);
  $('d-out').textContent = ''; $('d-q').textContent = ''; note.textContent = '';
  $('d-answer').hidden = true;
  if (isNaN(seed)) { note.textContent = 'A seed: any whole number.'; return; }
  DRILL = null;

  if (kind === 'fix') {
    DRILL = { kind: kind, seed: seed, F: C.fix_gen(seed) };
  } else {
    var D = C.drill_gen(kind, seed);
    /*  THE GENERATOR CAN REFUSE A SEED, and it is not an error: eighty
        tries without a body between 12 and 72 degrees happens. Say so and
        offer the next seed rather than pretending to have a problem.  */
    if (!D) {
      note.textContent = 'Seed ' + seed + ' has no body between 12° and 72° ' +
        'to build a problem from. Try the next one.';
      return;
    }
    DRILL = { kind: kind, seed: seed, D: D };
  }
  drillQuestion();
  /*  THE ANSWER BOXES ARE RELABELLED, NOT REBUILT. Recreated on every
      change of kind or seed, the box was replaced out from under whatever
      was being typed into it: focusing it blurs the seed field, the blur
      fires that field's change handler, the handler rebuilds the boxes,
      and the keystrokes land on an element that is no longer in the page.
      Found by docs/web/tests/celnav-drill.js, whose every answer came
      back as an empty box - and it is a real fault, not a harness
      artefact: a reader who edits the seed and then types an answer loses
      the answer.  */
  var spec = DRILL_FIELDS[kind];
  [1, 2].forEach(function (i) {
    var lab = $('d-l' + i), inp = $('d-a' + i), f = spec[i - 1];
    if (!f) { lab.hidden = true; inp.value = ''; return; }
    lab.hidden = false;
    lab.firstChild.nodeValue = f[1];
    inp.placeholder = f[2];
    inp.value = '';
  });
  $('d-answer').hidden = false;
}

function drillQuestion() {
  var C = CNe(), q = $('d-q'), k = DRILL.kind;
  q.textContent = '';
  if (k === 'fix') {
    var F = DRILL.F;
    q.appendChild(mk('h3', null, 'Drill — a three-star fix'));
    q.appendChild(kvTable([['DR position', ddm(F.LAT, true) + '   ' + ddm(F.LON, false)]]));
    var t = mk('table', 'ct-tab');
    var hr = mk('tr');
    ['sight', 'Zn', 'intercept'].forEach(function (h) { hr.appendChild(mk('th', null, h)); });
    t.appendChild(hr);
    for (var i = 0; i < 3; i++) {
      var tr = mk('tr');
      tr.appendChild(mk('td', null, F.N[i]));
      tr.appendChild(mk('td', 'num', ('00' + Math.trunc(F.Z[i] + 0.5)).slice(-3) + ' T'));
      tr.appendChild(mk('td', 'num', f1(C.fabs(F.P[i])) + ' nm ' + (F.P[i] >= 0 ? 'toward' : 'away')));
      t.appendChild(tr);
    }
    q.appendChild(t);
    q.appendChild(mk('p', 'note', 'Where is the fix?'));
    return;
  }

  var D = DRILL.D, rows, limb =
    (D.LIMB === 'L' ? ', lower limb' : (D.LIMB === 'U' ? ', upper limb' : ''));
  if (k === 'corr') {
    q.appendChild(mk('h3', null, 'Drill — sextant corrections'));
    rows = [
      ['Body', D.NAME + (D.LIMB === 'C' ? '  (a point source)' : limb)],
      ['Sextant reading Hs', C.fmt_dm(D.HS, 2)],
      ['Index error', mins(D.IE) + '  (positive = on the arc)'],
      ['Height of eye', f1(D.HE) + ' m'],
      ['Air temperature', D.T + ' °C Pressure ' + D.P + ' mb']
    ];
    if (D.SD > 0) rows.push(['Semi-diameter', f1(D.SD) + "' Horizontal parallax " + f1(D.HP) + "'"]);
    q.appendChild(kvTable(rows));
    q.appendChild(mk('p', 'note', 'Work out Ho, the observed altitude.'));
  } else if (k === 'alm') {
    q.appendChild(mk('h3', null, 'Drill — the almanac'));
    q.appendChild(kvTable([['Body', D.NAME], ['Time', D.UTC + ' UT']]));
    q.appendChild(mk('p', 'note', 'Look up — or work out — the GHA and declination.'));
  } else if (k === 'red') {
    q.appendChild(mk('h3', null, 'Drill — sight reduction'));
    q.appendChild(kvTable([
      ['Assumed position', ddm(D.LAT, true) + '   ' + ddm(D.LON, false)],
      ['GHA of the body', dm3(D.GHA)],
      ['Declination', ddm(D.DEC, true)]
    ]));
    q.appendChild(mk('p', 'note', 'Work out LHA, then Hc and Zn.'));
  } else if (k === 'int') {
    q.appendChild(mk('h3', null, 'Drill — the intercept'));
    q.appendChild(kvTable([
      ['Observed altitude Ho', C.fmt_dm(D.HO, 2)],
      ['Computed altitude Hc', C.fmt_dm(D.HC, 2)],
      ['Azimuth Zn', ('00' + Math.trunc(D.ZN + 0.5)).slice(-3) + ' T']
    ]));
    q.appendChild(mk('p', 'note', 'How far, and which way do you plot it?'));
  } else if (k === 'full') {
    q.appendChild(mk('h3', null, 'Drill — a complete sight'));
    q.appendChild(kvTable([
      ['Body', D.NAME + limb + ', at ' + D.UTC + ' UT'],
      ['Sextant reading Hs', C.fmt_dm(D.HS, 2) + ' index error ' + mins(D.IE)],
      ['Height of eye', f1(D.HE) + ' m ' + D.T + ' °C, ' + D.P + ' mb'],
      ['DR position', ddm(D.LAT, true) + '   ' + ddm(D.LON, false)]
    ]));
    q.appendChild(mk('p', 'note', 'Work it through to the intercept and the azimuth.'));
  }
}

/*  the correction chain as the shell's corr_bars() prints it: the parts
    shown rather than summed, because the size of each part is the lesson  */
function drillChain(C, D) {
  var ho = C.corrections(D.HS, D.IE, D.HE, D.T, D.P, D.LIMB), E = C.E;
  var rows = [
    ['Hs  sextant reading', C.fmt_dm(D.HS, 2)],
    ['index error', mins(-D.IE)],
    ['dip (height of eye)', mins(-E.C_DIP)],
    ['Ha  apparent altitude', C.fmt_dm(E.C_HA, 2)],
    ['refraction', mins(-E.C_REF)]
  ];
  if (E.C_PAR > 0.02) rows.push(['parallax', mins(E.C_PAR)]);
  if (E.C_LIMB !== 0) rows.push(['semi-diameter', mins(E.C_LIMB)]);
  rows.push(['Ho  observed altitude', C.fmt_dm(ho, 2), 'tot']);
  return { rows: rows, ho: ho };
}

function drillMark() {
  var C = CNe(), box = $('d-out'), note = $('d-note');
  box.textContent = ''; note.textContent = '';
  if (!DRILL) { note.textContent = 'Pick a drill first.'; return; }
  var k = DRILL.kind, D = DRILL.D, F = DRILL.F, E = C.E;
  var near = function (a, b, tol) { return C.fabs(a - b) <= tol; };
  var v = function (ok) { return ok ? 'CORRECT' : 'not right'; };
  var vrow = function (label, shown, ok) { return [label, shown + ' ' + v(ok), ok ? 'good' : 'bad']; };
  var ang = function (id) { var x = C.parse_ang($(id).value); return (x === 'ERR' ? NaN : x); };
  var num = function (id) { return parseFloat($(id).value); };
  var css = function (n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#6fb3d9';
  };
  /*  AN EMPTY BOX IS NOT A WRONG ANSWER. Marked as one it came out as
      "Your Ho  NaN 0NaN'  not right", which is a formatter's reply to a
      question nobody asked. Every field this kind wants is checked for a
      number first, and the drill says which one is missing.  */
  var missing = [];
  DRILL_FIELDS[k].forEach(function (fl) {
    var raw = ($(fl[0]) || { value: '' }).value.trim();
    var val = /^(d-a1|d-a2)$/.test(fl[0]) ? raw : raw;
    if (val === '') { missing.push(fl[1]); return; }
    var parsed = (k === 'int' || (k === 'full' && fl[0] === 'd-a1') ||
                  (k === 'red' && fl[0] === 'd-a2') || (k === 'full' && fl[0] === 'd-a2'))
                 ? parseFloat(val) : C.parse_ang(val);
    if (parsed === 'ERR' || isNaN(parsed)) missing.push(fl[1]);
  });
  if (missing.length) {
    note.textContent = (missing.length === 1 ? 'That is not a number I can read: '
                                             : 'Those are not numbers I can read: ') +
      missing.join(', ') + '.';
    return;
  }

  var ok = true, rows, g1, g2, n1, n2;

  if (k === 'corr') {
    var ch = drillChain(C, D);
    g1 = ang('d-a1');
    ok = near(g1, ch.ho, 0.3 / 60.0);
    box.appendChild(kvTable([vrow('Your Ho', C.fmt_dm(g1, 2), ok)]));
    box.appendChild(mk('h3', null, 'The chain, part by part'));
    box.appendChild(kvTable(ch.rows));
    box.appendChild(mk('p', 'note', 'The correct Ho is ' + C.fmt_dm(ch.ho, 2) + '.'));
  } else if (k === 'alm') {
    g1 = ang('d-a1'); g2 = ang('d-a2');
    n1 = near(C.nrm180(g1 - D.GHA), 0, 1.0 / 60.0);
    n2 = near(g2, D.DEC, 0.5 / 60.0);
    ok = n1 && n2;
    box.appendChild(kvTable([vrow('Your GHA', dm3(g1), n1), vrow('Your Dec', ddm(g2, true), n2)]));
    rows = [['GHA', dm3(D.GHA)], ['Declination', ddm(D.DEC, true)]];
    if (D.SD > 0) rows.push(['SD', f1(D.SD) + "' HP " + f1(D.HP) + "'"]);
    box.appendChild(mk('h3', null, D.NAME + ' at ' + D.UTC + ' UT'));
    box.appendChild(kvTable(rows));
  } else if (k === 'red') {
    g1 = ang('d-a1'); g2 = num('d-a2');
    n1 = near(g1, D.HC, 0.3 / 60.0);
    n2 = near(C.nrm180(g2 - D.ZN), 0, 0.6);
    ok = n1 && n2;
    box.appendChild(kvTable([vrow('Your Hc', C.fmt_dm(g1, 2), n1),
                             vrow('Your Zn', f1(g2) + ' T', n2)]));
    box.appendChild(mk('h3', null, 'The working'));
    box.appendChild(kvTable([
      ['LHA = GHA + longitude', dm3(D.GHA) + ' + (' + ddm(D.LON, false) + ') = ' + dm3(D.LHA)],
      ['Hc', C.fmt_dm(D.HC, 2)],
      ['Zn', f1(D.ZN) + ' T', 'tot']
    ]));
    box.appendChild(mk('pre', 'lp-pre', 'sin Hc = sin(' + f(D.LAT, 4) + ') sin(' + f(D.DEC, 4) +
      ')\n       + cos(' + f(D.LAT, 4) + ') cos(' + f(D.DEC, 4) + ') cos(' + f(D.LHA, 4) + ')'));
  } else if (k === 'int') {
    g1 = num('d-a1');
    n1 = near(C.fabs(g1), C.fabs(D.OFF), 0.5);
    n2 = ((g1 >= 0) === (D.OFF >= 0));
    ok = n1 && n2;
    box.appendChild(kvTable([vrow('Your intercept',
      f1(C.fabs(g1)) + ' nm ' + (g1 >= 0 ? 'toward' : 'away'), ok)]));
    box.appendChild(kvTable([
      ['Ho − Hc', C.fmt_dm(D.HO, 2) + ' − ' + C.fmt_dm(D.HC, 2)],
      ['which is', f1(C.fabs(D.OFF)) + "' = " + f1(C.fabs(D.OFF)) + ' nm ' +
         (D.OFF >= 0 ? 'TOWARD' : 'AWAY'), 'tot']
    ]));
    box.appendChild(mk('p', 'note', 'Ho the greater means you are nearer the body: plot toward it.'));
  } else if (k === 'full') {
    var ch2 = drillChain(C, D);
    g1 = num('d-a1'); g2 = num('d-a2');
    n1 = near(C.fabs(g1), C.fabs(D.OFF), 0.8) && ((g1 >= 0) === (D.OFF >= 0));
    n2 = near(C.nrm180(g2 - D.ZN), 0, 1.0);
    ok = n1 && n2;
    box.appendChild(kvTable([
      vrow('Your intercept', f1(C.fabs(g1)) + ' nm ' + (g1 >= 0 ? 'toward' : 'away'), n1),
      vrow('Your azimuth', f1(g2) + ' T', n2)
    ]));
    box.appendChild(mk('h3', null, 'The chain, part by part'));
    box.appendChild(kvTable(ch2.rows));
    box.appendChild(kvTable([
      ['GHA', dm3(D.GHA) + ' Dec ' + ddm(D.DEC, true) + ' LHA ' + dm3(D.LHA)],
      ['Hc', C.fmt_dm(D.HC, 2) + ' Zn ' + f1(D.ZN) + ' T'],
      ['Intercept = Ho − Hc', f1(C.fabs(D.OFF)) + ' nm ' +
         (D.OFF >= 0 ? 'TOWARD' : 'AWAY'), 'tot']
    ]));
    box.appendChild(mk('h3', null, 'Your line of position'));
    var host = mk('div', 'walkfig');
    box.appendChild(host);
    window.CELPLOT.draw('http://www.w3.org/2000/svg', host,
      { ok: false, n: 1, N: 0, E: 0,
        lops: [{ zn: D.ZN, intercept: D.OFF, name: 'a' }] }, { css: css });
  } else if (k === 'fix') {
    var la = ang('d-a1'), lo = ang('d-a2');
    var d = Math.sqrt(Math.pow((la - F.FIXLAT) * 60, 2) +
                      Math.pow(C.nrm180(lo - F.FIXLON) * 60 * C.cosd(F.LAT), 2));
    ok = (d <= 2.0);
    box.appendChild(kvTable([vrow('Your fix',
      ddm(la, true) + '  ' + ddm(lo, false) + ' out by ' + f1(d) + ' nm', ok)]));
    box.appendChild(kvTable([
      ['Fix', ddm(F.FIXLAT, true) + '   ' + ddm(F.FIXLON, false), 'tot'],
      ['from the DR', f1(C.fabs(F.SOL_N)) + ' nm ' + (F.SOL_N >= 0 ? 'N' : 'S') + ', ' +
         f1(C.fabs(F.SOL_E)) + ' nm ' + (F.SOL_E >= 0 ? 'E' : 'W')]
    ]));
    box.appendChild(mk('h3', null, 'The plot'));
    var host2 = mk('div', 'walkfig');
    box.appendChild(host2);
    window.CELPLOT.draw('http://www.w3.org/2000/svg', host2,
      { ok: true, n: 3, N: F.SOL_N, E: F.SOL_E,
        lops: F.Z.map(function (z, i) {
          return { zn: z, intercept: F.P[i], name: 'abc'.charAt(i) };
        }) }, { css: css });
  }

  /*  the verdict last and plainly, because that is what the reader came
      for, and in the colour the shell uses  */
  box.insertBefore(mk('h3', ok ? 'good' : 'warn', ok ? 'Correct.' : 'Not right.'), box.firstChild);
}

var views = {
  home:    { el: 'v-home',    title: 'celnav' },
  camera:  { el: 'v-camera',  title: 'Camera sight' },
  sight:   { el: 'v-sight',   title: 'Sight reduction' },
  almanac: { el: 'v-almanac', title: 'Almanac' },
  stars:   { el: 'v-stars',   title: 'The star list' },
  noon:    { el: 'v-noon',    title: 'Noon sight' },
  polaris: { el: 'v-polaris', title: 'Polaris' },
  plan:    { el: 'v-plan',    title: 'Sight planning' },
  compass: { el: 'v-compass', title: 'Compass check' },
  tables:  { el: 'v-tables',  title: 'Pub. 249' },
  sandbox: { el: 'v-sandbox', title: 'The navigational triangle' },
  walk:    { el: 'v-walk',    title: 'Walkthrough' },
  drill:   { el: 'v-drill',   title: 'Drills' },
  learn:   { el: 'v-learn',   title: 'Learn' }
};
function go(name) {
  for (var k in views) if (views.hasOwnProperty(k)) $(views[k].el).hidden = (k !== name);
  $('title').textContent = views[name].title;
  $('nav-back').hidden = (name === 'home');
  window.scrollTo(0, 0);
  if (name === 'learn') syllabus();
  if (name === 'sight') sightInit();
  if (name === 'almanac') almanacInit();
  if (name === 'stars') starsInit();
  if (name === 'noon') noonInit();
  if (name === 'polaris') polarisInit();
  if (name === 'plan') planInit();
  if (name === 'compass') compassInit();
  if (name === 'tables') tablesInit();
  if (name === 'sandbox') sandboxInit();
  if (name === 'walk') walkInit();
  if (name === 'drill') drillInit();
  remember('view', name);
}

document.addEventListener('DOMContentLoaded', function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { go(b.dataset.go); });
  });
  $('s-add').addEventListener('click', function () {
    var sg = sightFields();
    if (sg.err) { $('s-note').textContent = sg.err; $('s-corr').textContent = ''; return; }
    if (!showCorrections(sg)) { $('s-note').textContent = ''; return; }
    var n = window.CELPLOT.add(sg);
    $('s-note').textContent = n + ' sight' + (n === 1 ? '' : 's') + ' kept.' +
      (n < 2 ? ' One more of a different body gives a fix.' : '');
    $('s-hs').value = '';
    sightRefresh();
  });
  $('s-clear').addEventListener('click', function () {
    window.CELPLOT.clear(); $('s-corr').textContent = ''; $('s-note').textContent = '';
    sightRefresh();
  });
  ['s-alat', 's-alon', 's-crs', 's-spd'].forEach(function (id) {
    $(id).addEventListener('input', sightRefresh);
  });

  $('a-go').addEventListener('click', almanacShow);
  ['a-date', 'a-time', 'a-bodies'].forEach(function (id) {
    $(id).addEventListener('change', almanacShow);
  });
  ['st-date', 'st-find'].forEach(function (id) {
    $(id).addEventListener('input', starsShow);
  });

  $('n-go').addEventListener('click', noonShow);
  ['n-lat', 'n-lon', 'n-date', 'n-hs', 'n-limb', 'n-ie', 'n-he', 'n-tm', 'n-pr']
    .forEach(function (id) { $(id).addEventListener('change', noonShow); });
  $('pl-go').addEventListener('click', planShow);
  ['pl-lat', 'pl-lon', 'pl-date', 'pl-time']
    .forEach(function (id) { $(id).addEventListener('change', planShow); });
  $('c-go').addEventListener('click', compassShow);
  ['c-lat', 'c-lon', 'c-date', 'c-time', 'c-body', 'c-brg', 'c-var']
    .forEach(function (id) { $(id).addEventListener('change', compassShow); });
  $('d-new').addEventListener('click', function () {
    $('d-seed').value = String(1 + Math.floor(Math.random() * 9000));
    drillNew();
  });
  $('d-kind').addEventListener('change', drillNew);
  $('d-seed').addEventListener('change', drillNew);
  $('d-mark').addEventListener('click', drillMark);
  $('walk-prev').addEventListener('click', function () { WALK_AT--; walkShow(); });
  $('walk-next').addEventListener('click', function () { WALK_AT++; walkShow(); });
  ['sb-lat', 'sb-dec', 'sb-lha'].forEach(function (id) {
    $(id).addEventListener('input', sandboxShow);
  });
  $('t-go').addEventListener('click', tablesShow);
  $('t-mark').addEventListener('click', tablesMark);
  $('p-go').addEventListener('click', polarisShow);
  ['p-lon', 'p-date', 'p-time', 'p-hs', 'p-ie', 'p-he']
    .forEach(function (id) { $(id).addEventListener('change', polarisShow); });

  $('nav-back').addEventListener('click', function () {
    if (!$('les').hidden) { syllabus(); return; }
    go('home');
  });
  /*  camera sight was this whole page, so anyone who had it installed
      and open lands where they left off rather than on a new screen
      they did not ask for  */
  go(recall('view', 'home') === 'camera' ? 'camera' : 'home');

  var off = $('offline-note');
  if (off) {
    if (!('caches' in window)) { off.textContent = 'This browser will not cache for offline use.'; }
    else caches.keys().then(function (ks) {
      var k = ks.filter(function (x) { return x.indexOf('celnav-') === 0; })[0];
      return k ? caches.open(k).then(function (c) { return c.match('./'); }) : null;
    }).then(function (hit) {
      off.textContent = hit ? 'Cached. This runs with no network at all.'
                            : 'Not cached yet. Open it once more with a signal.';
    }).catch(function () { off.textContent = ''; });
  }
});

/*  The seam tests/celnav-lessons-check.js loads this through. `module`
    is undefined in a browser, so the page pays nothing, and the reflow and
    the figure-gap names can be held to something outside a browser. Same
    seam colregs.js, contacts.js and weather.js carry.  */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderProse: renderProse, proseKind: proseKind,
                     FIG_NAMES: FIG_NAMES, splitQuestion: splitQuestion };
}

})();

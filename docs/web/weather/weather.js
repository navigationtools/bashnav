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

var BUILD = '14 \u2014 5 Nov 2026';

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

function setMode(m) {
  document.documentElement.setAttribute('data-mode', m);
  $('mode').textContent = m === 'night' ? 'DARK' : 'NIGHT';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content',
      getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()
      || '#07090b');   /* the browser chrome follows the palette, so a third mode
                          needs no third branch here */
  lsSet('mode', m);
}

var TITLES = { home: 'weather', what: 'What the log says', fcast: 'Your forecast',
               score: 'The score', chart: '500 mb chart', learn: 'Lessons',
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
  var items = WX.report(OBS, lon);
  drawReason($('what-out'), items);
  $('what-term').textContent = WX.renderTerminal(items, OBS.length >= 2);
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
  ['', 'points', 'dir', 'spd', 'hPa'].forEach(function (h) { head.appendChild(el('th', null, h)); });
  var thead = document.createElement('thead'); thead.appendChild(head); t.appendChild(thead);
  var tb = document.createElement('tbody');
  ['you', 'rules', 'persist'].forEach(function (by) {
    if (!(by in res.cnt)) return;
    var tr = el('tr', by);
    tr.appendChild(el('td', null, by));
    tr.appendChild(el('td', null, WX.cfixed(res.tot[by], 1)));
    ['wdir', 'wspd', 'mslp'].forEach(function (f) {
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
      if (b.kind === 'wind') { windDemo(box); return; }
      gunDemo(box);
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
  setMode(lsGet('mode', 'dark') === 'night' ? 'night' : 'dark');
  $('mode').addEventListener('click', function () {
    setMode(document.documentElement.getAttribute('data-mode') === 'night' ? 'dark' : 'night');
  });
  $('back').addEventListener('click', function () { go('home'); drawHome(); });
  $('ver').textContent = 'build ' + BUILD;
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
  $('les-back').addEventListener('click', drawLessonIndex);

  go('home');
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
  var dim = css('--dim'), line = css('--line'), acc = css('--accent'),
      text = css('--text'), warn = css('--warn');
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
         function (v) { return Math.abs(v).toFixed(0) + '° ' + (v >= 0 ? 'N' : 'S'); },
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

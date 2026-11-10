/* =====================================================================
   tides -- the browser build.  No framework, no build step.

   Three things in this file are not obvious and all three were paid for:

     The station data is 2.9 MB, which is not something to download
     before the app will draw anything.  So an INDEX of all 8,334
     stations (789 kB, ~250 kB over the wire) is loaded at startup, and
     one station's harmonic constants are pulled out of stations.dat
     with a Range request of a few hundred bytes.  If the server will
     not do ranges, the whole file is fetched once and sliced here.

     Those offsets are BYTE offsets.  Four station names are not ASCII,
     so the full file is held as bytes and sliced as bytes; slicing a
     decoded JavaScript string by a byte offset lands mid-line for every
     station after Saint Barthelemy.

     A partial response must never be cached as the whole file.  A 206
     stored under the stations.dat URL would make every later read
     return four hundred bytes of the file and the app would fail in a
     way that looks like corrupt data.  The service worker caches only
     status 200.
   ===================================================================== */
'use strict';

var BUILD = '5 \u2014 7 Nov 2026';
/*  The worker's cache, derived from BUILD so there is no second number to
    drift: run-tests.sh already holds BUILD to sw.js's CACHE.  The offline
    panel once named 'tides-v1' by hand, which the worker evicts as an old
    member of its own family the first time it updates -- so "Save for
    offline" wrote into a cache that the next update deleted, and the
    panel read its state from that same doomed cache. */
var CACHE_NAME = 'tides-v' + BUILD.split(' ')[0];

var IDX_URL = 'stations.idx';
var DAT_URL = 'stations.dat';

/* ---- state --------------------------------------------------------- */
var IDX = null;         // { k, id, nm, rg, cy, la, lo, off, len, hay }
var DATBYTES = null;    // Uint8Array of the whole station file, if fetched
var STATION = null;     // the parsed station record
var PRED = null;        // the prediction object from engine.js
var DAY = null;         // { y, m, d, jd0 }
var VIEW = 'day';
var LASTQ = '';

function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }

/* localStorage throws in a private window and comes back empty after a
   cache clear, so every read and write is wrapped and the app renders
   correctly without it. */
function lsGet(k, dflt) {
  try { var v = localStorage.getItem('tides-' + k); return v === null ? dflt : v; }
  catch (e) { return dflt; }
}
function lsSet(k, v) {
  try { localStorage.setItem('tides-' + k, v); } catch (e) { /* private mode */ }
}

/* ---- mode ---------------------------------------------------------- */
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
  if (PRED) drawCurve();
}

/* ---- navigation ---------------------------------------------------- */
function go(v) {
  VIEW = v;
  ['day', 'pick', 'about', 'work'].forEach(function (n) { $('v-' + n).hidden = (n !== v); });
  $('back').hidden = (v === 'day');
  $('title').textContent = v === 'pick' ? 'Choose a station'
                         : v === 'about' ? 'About'
                         : v === 'work' ? 'Coastal work' : 'tides';
  window.scrollTo(0, 0);
}

/* =====================================================================
   The index
   ===================================================================== */
function parseIndex(text) {
  var lines = text.split('\n');
  var x = { n: 0, k: [], id: [], nm: [], rg: [], cy: [], la: [], lo: [],
            off: [], len: [], hay: [], byId: {} };
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i];
    if (!L || L.charAt(0) === '#') continue;
    var f = L.split('|');
    if (f.length < 9) continue;
    var j = x.n++;
    x.k[j] = f[0]; x.id[j] = f[1]; x.nm[j] = f[2]; x.rg[j] = f[3]; x.cy[j] = f[4];
    x.la[j] = +f[5]; x.lo[j] = +f[6]; x.off[j] = +f[7]; x.len[j] = +f[8];
    x.hay[j] = (f[2] + '  ' + f[3] + '  ' + f[4]).toLowerCase();
    x.byId[f[1]] = j;
  }
  return x;
}

function loadIndex() {
  return fetch(IDX_URL).then(function (r) {
    if (!r.ok) throw new Error('index ' + r.status);
    return r.text();
  }).then(function (t) { IDX = parseIndex(t); return IDX; });
}

/* =====================================================================
   One station's line, by byte range
   ===================================================================== */
var utf8 = new TextDecoder('utf-8');

function fetchWholeDat() {
  if (DATBYTES) return Promise.resolve(DATBYTES);
  return fetch(DAT_URL).then(function (r) {
    if (!r.ok) throw new Error('stations ' + r.status);
    return r.arrayBuffer();
  }).then(function (b) { DATBYTES = new Uint8Array(b); return DATBYTES; });
}

function stationLine(j) {
  var off = IDX.off[j], len = IDX.len[j];
  if (DATBYTES) return Promise.resolve(utf8.decode(DATBYTES.subarray(off, off + len)));
  return fetch(DAT_URL, { headers: { Range: 'bytes=' + off + '-' + (off + len - 1) } })
    .then(function (r) {
      if (r.status === 206) return r.arrayBuffer().then(function (b) {
        return utf8.decode(new Uint8Array(b));
      });
      /* 200 means the server ignored the range and sent the lot -- which
         is also what a cache hit looks like.  Keep it and slice. */
      if (r.status === 200) return r.arrayBuffer().then(function (b) {
        DATBYTES = new Uint8Array(b);
        return utf8.decode(DATBYTES.subarray(off, off + len));
      });
      throw new Error('stations ' + r.status);
    })
    .catch(function () {
      return fetchWholeDat().then(function (B) {
        return utf8.decode(B.subarray(off, off + len));
      });
    });
}

/* Load a station and, if it is subordinate, its reference station too. */
function openStation(id) {
  var j = IDX.byId[id];
  if (j === undefined) return Promise.reject(new Error('no station with that id'));
  return stationLine(j).then(function (line) {
    var st = TIDE.parseStation(line.replace(/\n$/, ''));
    if (!st) throw new Error('that station record will not parse');
    if (st.kind !== 'S') return { st: st, ref: null };
    var rj = IDX.byId[st.ref];
    if (rj === undefined) throw new Error('its reference station is missing');
    return stationLine(rj).then(function (rl) {
      var ref = TIDE.parseStation(rl.replace(/\n$/, ''));
      if (!ref || ref.kind !== 'R') throw new Error('its reference station is not a reference station');
      return { st: st, ref: ref };
    });
  });
}

/* =====================================================================
   Searching.  The same two modes as the terminal build, with the same
   ranking, so the two tools answer a query the same way.
   ===================================================================== */
function reMeta(p) { return /[\][^$.|()*+?{}\\]/.test(p); }

/*  A conservative structural check, ported from the awk.  JavaScript
    would throw on a bad pattern where awk aborts the whole run, so this
    is not strictly needed here -- but a query that the terminal build
    treats as plain text should not be read as a regex by the web build,
    or the same typing gives two different answers. */
function reOk(p) {
  var n = p.length, par = 0, brk = 0, prev = '', i, c;
  if (n === 0) return false;
  for (i = 0; i < n; i++) {
    c = p.charAt(i);
    if (c === '\\') { if (i === n - 1) return false; i++; prev = 'x'; continue; }
    if (brk) { if (c === ']' && prev !== '[' && prev !== '^') brk = 0; prev = c; continue; }
    if (c === '[') { brk = 1; prev = '['; continue; }
    if (c === ']') return false;
    if (c === '(') { par++; prev = '('; continue; }
    if (c === ')') { par--; if (par < 0) return false; prev = ')'; continue; }
    if (c === '*' || c === '+' || c === '?' || c === '{') {
      if (prev === '' || prev === '(' || prev === '|') return false;
    }
    if (c === '|' && (prev === '' || prev === '(' || prev === '|')) return false;
    prev = c;
  }
  if (par !== 0 || brk) return false;
  if (prev === '|') return false;
  return true;
}

function rankOne(q, nm) {
  var l = nm.toLowerCase();
  if (l === q) return 1;
  if (l.indexOf(q) === 0) return 2;
  if ((' ' + l).indexOf(' ' + q) >= 0) return 3;   // a word of the name starts with it
  if (l.indexOf(q) >= 0) return 4;
  return 5;                                        // matched on region or country
}

function search(q, k) {
  q = q.toLowerCase().replace(/^[ \t]+|[ \t]+$/g, '');
  if (q === '') return { mode: 'empty', total: 0, hits: [] };
  var rx = null, mode = 'words';
  if (reMeta(q)) {
    if (reOk(q)) { try { rx = new RegExp(q, 'i'); mode = 'regex'; } catch (e) { rx = null; mode = 'badregex'; } }
    else mode = 'badregex';
  }
  var words = rx ? [] : q.split(/[ \t]+/);
  var hits = [], total = 0, i, w, ok, rank;
  for (i = 0; i < IDX.n; i++) {
    if (rx) {
      /*  A regex is matched against the name, the region and the country
          SEPARATELY, not against the three run together.  Otherwise ^ and
          $ -- the whole reason somebody reached for a regex -- anchor to
          the start of the name and the end of the country, and "bay$"
          matches nothing on earth. */
      if (rx.test(IDX.nm[i])) rank = 3;
      else if (rx.test(IDX.rg[i]) || rx.test(IDX.cy[i])) rank = 5;
      else continue;
    } else {
      ok = true;
      for (w = 0; w < words.length; w++) if (IDX.hay[i].indexOf(words[w]) < 0) { ok = false; break; }
      if (!ok) continue;
      rank = (words.length > 1) ? 4 : rankOne(q, IDX.nm[i]);
    }
    total++;
    hits.push({ i: i, rank: rank, key: IDX.nm[i].toLowerCase() });
  }
  /*  Ordered by rank then by name, so the same query always gives the
      same list in the same order. */
  hits.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  return { mode: mode, total: total, hits: hits.slice(0, k) };
}

function nearest(lat, lon, k) {
  var out = [], i, d;
  for (i = 0; i < IDX.n; i++) {
    d = TIDE.dist(lat, lon, IDX.la[i], IDX.lo[i]);
    out.push({ i: i, d: d });
  }
  out.sort(function (a, b) { return a.d - b.d; });
  out = out.slice(0, k);
  out.forEach(function (o) { o.brg = TIDE.bearing(lat, lon, IDX.la[o.i], IDX.lo[o.i]); });
  return out;
}

/* =====================================================================
   Drawing the results list
   ===================================================================== */
function stationRow(i, extra) {
  var b = el('button', 'row');
  b.setAttribute('data-id', IDX.id[i]);
  if (extra) { var f = el('span', 'far', extra); b.appendChild(f); }
  var nm = el('b', null, IDX.nm[i]);
  var where = [IDX.rg[i], IDX.cy[i]].filter(Boolean).join(', ');
  var sub = el('span', null, where + (IDX.k[i] === 'S' ? '  \u00b7  secondary port' : ''));
  b.appendChild(nm); b.appendChild(sub);
  b.addEventListener('click', function () { choose(IDX.id[i]); });
  return b;
}

function showResults(head, rows, note) {
  $('res-head').textContent = head;
  var box = $('results');
  box.textContent = '';
  if (!rows.length) { box.appendChild(el('p', 'note', note || 'Nothing matched.')); return; }
  rows.forEach(function (r) { box.appendChild(r); });
  if (note) box.appendChild(el('p', 'note', note));
}

function doSearch() {
  var q = $('q').value;
  LASTQ = q;
  if (!IDX) return;
  var r = search(q, 40);
  if (r.mode === 'empty') { showResults('Results', [], 'Type part of a station name.'); return; }
  var rows = r.hits.map(function (h) { return stationRow(h.i); });
  var note = r.total > r.hits.length
    ? r.total + ' stations matched; the first ' + r.hits.length + ' are shown. Add a word to narrow it.'
    : r.total + (r.total === 1 ? ' station matched.' : ' stations matched.');
  if (r.mode === 'regex') note = 'Read as a regular expression. ' + note;
  if (r.mode === 'badregex') note = 'That is not a valid regular expression, so it was searched as plain text. ' + note;
  showResults('Results', rows, note);
}

function doNear() {
  var lat = parseFloat($('i-lat').value), lon = parseFloat($('i-lon').value);
  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    showResults('Results', [], 'Latitude -90 to 90, longitude -180 to 180.');
    return;
  }
  lsSet('lat', lat); lsSet('lon', lon);
  var r = nearest(lat, lon, 15);
  var rows = r.map(function (o) {
    return stationRow(o.i, o.d.toFixed(0) + ' nm ' + pad2(Math.round(o.brg) % 360) + '\u00b0');
  });
  showResults('Nearest stations', rows,
    'Straight-line distance and true bearing. The nearest station can be on the ' +
    'wrong side of a headland, and a river station can be nothing like the water ' +
    'outside it \u2014 read the names.');
}

function doGps() {
  var n = $('gps-note');
  if (!navigator.geolocation) { n.textContent = 'This browser will not give a position.'; return; }
  n.textContent = 'Asking for your position\u2026';
  navigator.geolocation.getCurrentPosition(function (p) {
    $('i-lat').value = p.coords.latitude.toFixed(4);
    $('i-lon').value = p.coords.longitude.toFixed(4);
    n.textContent = 'Position to \u00b1' + Math.round(p.coords.accuracy) + ' m.';
    doNear();
  }, function (e) {
    n.textContent = e.code === 1
      ? 'Position refused. Type a latitude and longitude instead.'
      : 'No position available. Type one instead.';
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
}

/* ---- recently used ------------------------------------------------- */
function recentList() {
  try { return JSON.parse(lsGet('recent', '[]')) || []; } catch (e) { return []; }
}
function recentPush(id) {
  var r = recentList().filter(function (x) { return x !== id; });
  r.unshift(id);
  lsSet('recent', JSON.stringify(r.slice(0, 6)));
}
function drawRecent() {
  var r = recentList().filter(function (id) { return IDX && IDX.byId[id] !== undefined; });
  $('recent-panel').hidden = !r.length;
  var box = $('recent');
  box.textContent = '';
  r.forEach(function (id) { box.appendChild(stationRow(IDX.byId[id])); });
}

/* =====================================================================
   Choosing a station, and the day
   ===================================================================== */
function choose(id) {
  showResults('Results', [], 'Loading that station\u2026');
  openStation(id).then(function (p) {
    STATION = p;
    lsSet('station', id);
    recentPush(id);
    if (!DAY) setToday();
    rebuild();
    /*  A course link opens the work view while the last station is still
        loading in the background; arriving must not pull the reader out
        of the calculator they were sent to. */
    if (VIEW !== 'work') go('day');
  }).catch(function (e) {
    showResults('Results', [], 'Could not open that station: ' + e.message);
  });
}

function setToday() {
  var n = new Date();
  DAY = { y: n.getUTCFullYear(), m: n.getUTCMonth() + 1, d: n.getUTCDate() };
  DAY.jd0 = TIDE.jdate(DAY.y, DAY.m, DAY.d);
}
function shiftDay(n) {
  if (!DAY) setToday();
  var c = TIDE.jd2cal(DAY.jd0 + n);
  DAY = { y: c.y, m: c.m, d: c.d, jd0: TIDE.jdate(c.y, c.m, c.d) };
  rebuild();
}

/*  Rebuild the prediction and redraw everything that depends on it. */
function rebuild() {
  if (!STATION || !DAY) return;
  PRED = TIDE.open(STATION.st, STATION.ref, DAY.jd0 + 0.5);
  if (PRED.err) {
    $('st-name').textContent = 'Error';
    $('st-where').textContent = PRED.err;
    return;
  }
  /*  THE DAY IS THE STATION'S OWN STANDARD DAY, worked in UT from its
      local midnight -- a tide table has always been in local standard
      time.  Predicting the UT day and then labelling it in station time
      is not the same thing: at Newport it put the previous evening's low
      water at the top of the table and shifted the whole curve fifteen
      columns, and every module-level diff passed while it did, because
      both sides of that diff used UT midnight.  jdA is the only day
      boundary anything below may use. */
  DAY.jdA = DAY.jd0 - PRED.tz / 1440.0;
  DAY.jdB = DAY.jdA + 1;
  PRED.curvePrep(DAY.jdA, DAY.jdB);
  drawStation();
  drawDate();
  drawCurve();
  drawTable();
  drawDepth();
  drawSky();
  drawTerminal();
}

/* ---- station banner ------------------------------------------------ */
function drawStation() {
  var P = PRED;
  $('st-name').textContent = P.name;
  var where = [P.region, P.country].filter(Boolean).join(', ');
  $('st-where').textContent = where + '   ' + fmtLat(P.lat) + ' ' + fmtLon(P.lon);
  var tag = $('st-kind');
  if (P.kind === 'R') {
    tag.className = 'kindtag';
    tag.textContent = 'REFERENCE \u00b7 heights above ' + P.datum;
  } else {
    var h = (P.type === 'ratio')
      ? '\u00d7' + P.hhi.toFixed(2) + '/' + P.hlo.toFixed(2)
      : sgn(P.hhi) + '/' + sgn(P.hlo) + ' m';
    tag.className = 'kindtag sub';
    tag.textContent = 'SECONDARY \u00b7 ' + sgn(P.thi) + '/' + sgn(P.tlo) +
      ' min and ' + h + ' on ' + P.refName;
  }
}
function sgn(x) { return (x >= 0 ? '+' : '\u2212') + Math.abs(x).toFixed(x === Math.round(x) ? 0 : 2); }
function fmtLat(x) {
  var d = Math.floor(Math.abs(x)), m = (Math.abs(x) - d) * 60;
  return pad2(d) + '\u00b0' + m.toFixed(1) + "' " + (x < 0 ? 'S' : 'N');
}
function fmtLon(x) {
  var d = Math.floor(Math.abs(x)), m = (Math.abs(x) - d) * 60;
  return d + '\u00b0' + m.toFixed(1) + "' " + (x < 0 ? 'W' : 'E');
}

/* ---- the date strip ------------------------------------------------ */
var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
             'August', 'September', 'October', 'November', 'December'];
function drawDate() {
  var lab = $('d-label');
  lab.textContent = TIDE.dow(DAY.jd0) + ' ' + DAY.d + ' ' + MONTH[DAY.m - 1] + ' ' + DAY.y;
  var s = el('small');
  var tzh = PRED.tz / 60;
  s.textContent = 'station standard time, UTC' + (tzh >= 0 ? '+' : '\u2212') +
    Math.abs(tzh).toFixed(Math.abs(tzh % 1) > 0 ? 1 : 0) + ' \u2014 no summer time';
  lab.appendChild(s);
}

/*  Station standard time.  No summer time, exactly like a printed table. */
function stTime(jd) {
  var c = TIDE.jd2cal(jd + PRED.tz / 1440.0);
  var fr = c.frac * 24, hh = Math.trunc(fr), mm = Math.trunc((fr - hh) * 60 + 0.5);
  if (mm >= 60) { mm -= 60; hh++; }
  if (hh >= 24) hh -= 24;
  return pad2(hh) + ':' + pad2(mm);
}
function nowJd() {
  var n = new Date();
  return TIDE.jdate(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate())
       + (n.getUTCHours() + n.getUTCMinutes() / 60 + n.getUTCSeconds() / 3600) / 24;
}

/* =====================================================================
   The curve
   ===================================================================== */
function drawCurve() {
  var cv = $('curve'), P = PRED;
  if (!cv || !P) return;
  /*  Taps and sizing go through the RENDERED rect, never the backing
      store.  A CSS height cap once made every tap land hundreds of
      pixels from where it looked, silently. */
  var rect = cv.getBoundingClientRect();
  var dpr = Math.min(window.devicePixelRatio || 1, 3);
  var W = Math.max(280, Math.round(rect.width || 320));
  var H = Math.round(Math.min(300, Math.max(180, W * 0.42)));
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  cv.style.height = H + 'px';
  var g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);

  var cs = getComputedStyle(document.documentElement);
  function tok(n) { return cs.getPropertyValue(n).trim() || '#888'; }

  var jdA = DAY.jdA, jdB = DAY.jdB;
  var N = 288, i, t, v;
  var hs = [];
  var lo = 1e9, hi = -1e9;
  for (i = 0; i <= N; i++) {
    t = jdA + (jdB - jdA) * i / N;
    v = P.height(t);
    hs.push(v);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (hi - lo < 0.2) { hi += 0.1; lo -= 0.1; }
  var padT = 14, padB = 26, padL = 44, padR = 10;
  var plotW = W - padL - padR, plotH = H - padT - padB;
  var span = hi - lo;
  function X(t) { return padL + (t - jdA) / (jdB - jdA) * plotW; }
  function Y(v) { return padT + (1 - (v - lo) / span) * plotH; }

  /* hour grid and labels */
  g.font = '11px ui-monospace, Menlo, monospace';
  g.textBaseline = 'top';
  g.strokeStyle = tok('--line'); g.lineWidth = 1;
  for (i = 0; i <= 24; i += 3) {
    var x = X(jdA + i / 24);
    g.beginPath(); g.moveTo(x, padT); g.lineTo(x, padT + plotH); g.stroke();
    g.fillStyle = tok('--dim');
    g.textAlign = i === 0 ? 'left' : i === 24 ? 'right' : 'center';
    g.fillText(pad2(i % 24), x, padT + plotH + 6);
  }
  /* height axis: a round number of metres */
  var stepM = span > 12 ? 4 : span > 6 ? 2 : span > 2.5 ? 1 : span > 1 ? 0.5 : 0.2;
  g.textAlign = 'right'; g.textBaseline = 'middle';
  for (v = Math.ceil(lo / stepM) * stepM; v <= hi + 1e-9; v += stepM) {
    var y = Y(v);
    g.strokeStyle = Math.abs(v) < 1e-9 ? tok('--datum') : tok('--line');
    g.beginPath(); g.moveTo(padL, y); g.lineTo(padL + plotW, y); g.stroke();
    g.fillStyle = tok('--dim');
    g.fillText(v.toFixed(stepM < 1 ? 1 : 0), padL - 6, y);
  }

  /* the water: fill to the foot of the plot, then the surface line */
  g.beginPath();
  g.moveTo(X(jdA), padT + plotH);
  for (i = 0; i <= N; i++) g.lineTo(X(jdA + (jdB - jdA) * i / N), Y(hs[i]));
  g.lineTo(X(jdB), padT + plotH);
  g.closePath();
  var grad = g.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, tok('--water-2'));
  grad.addColorStop(1, tok('--water'));
  g.fillStyle = grad; g.fill();

  g.beginPath();
  for (i = 0; i <= N; i++) {
    var xx = X(jdA + (jdB - jdA) * i / N), yy = Y(hs[i]);
    if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
  }
  g.strokeStyle = tok('--curve'); g.lineWidth = 2; g.stroke();

  /* the turns */
  var hl = P.hilo(jdA, jdB);
  g.font = '600 11px -apple-system, system-ui, sans-serif';
  hl.forEach(function (e) {
    var x = X(e.t), y = Y(e.h);
    g.fillStyle = e.k === 'H' ? tok('--high') : tok('--low');
    g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
    g.textAlign = x < padL + 30 ? 'left' : x > padL + plotW - 30 ? 'right' : 'center';
    /*  A label goes outside the curve -- above a high, below a low -- and
        is then CLAMPED into the plot box.  Unclamped, the day's highest
        high sat half off the top of the canvas and the lowest low landed
        on the hour scale, which is where it is least readable. */
    var ly = e.k === 'H' ? y - 6 : y + 6, base = e.k === 'H' ? 'bottom' : 'top';
    if (e.k === 'H' && ly - 11 < padT) { ly = y + 6; base = 'top'; }
    if (e.k === 'L' && ly + 11 > padT + plotH) { ly = y - 6; base = 'bottom'; }
    g.textBaseline = base;
    g.fillText(e.h.toFixed(2), x, ly);
  });

  /* now, if now is inside the day */
  var jn = nowJd();
  if (jn >= jdA && jn <= jdB) {
    var xn = X(jn);
    g.strokeStyle = tok('--now'); g.lineWidth = 1.5;
    g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(xn, padT); g.lineTo(xn, padT + plotH); g.stroke();
    g.setLineDash([]);
    var vn = P.height(jn);
    g.fillStyle = tok('--now');
    g.beginPath(); g.arc(xn, Y(vn), 4, 0, Math.PI * 2); g.fill();
    $('curve-note').textContent = 'Now ' + stTime(jn) + ' \u2014 ' +
      vn.toFixed(2) + ' m above ' + P.datum + '.';
    $('key-now').hidden = false;
  } else {
    /*  No marker is drawn on a day that does not contain now, so the key
        for it should not be there either. */
    $('key-now').hidden = true;
    $('curve-note').textContent = 'Heights above ' + P.datum +
      '. Range this day ' + (hi - lo).toFixed(2) + ' m.';
  }
}

/* =====================================================================
   The table
   ===================================================================== */
function drawTable() {
  var P = PRED, hl = P.hilo(DAY.jdA, DAY.jdB);
  var tb = $('hl-body');
  tb.textContent = '';
  hl.forEach(function (e) {
    var tr = el('tr');
    tr.appendChild(el('td', 'k ' + e.k, e.k === 'H' ? 'HIGH' : 'low'));
    tr.appendChild(el('td', 't', stTime(e.t)));
    tr.appendChild(el('td', 'h', e.h.toFixed(2) + ' m'));
    tr.appendChild(el('td', 'ft', (e.h * 3.28084).toFixed(1) + ' ft'));
    tb.appendChild(tr);
  });
  var n = $('hl-note');
  if (!hl.length) {
    n.textContent = 'No turn of the tide falls inside this day at this station.';
  } else if (P.kind === 'S') {
    n.textContent = 'The reference station\u2019s turns, carried across by this ' +
      'port\u2019s corrections \u2014 which is how a paper tide table is built.';
  } else {
    n.textContent = 'Heights above ' + P.datum + '. Times are station standard time.';
  }
}

/* =====================================================================
   Depth and clearance.

   Charted depths are below datum and the tide adds to them; charted
   vertical clearances are above HAT and the tide takes them away.
   Getting that pair of signs the wrong way round is the classic way to
   put a mast into a bridge, so the two are computed by separate
   functions in the engine and labelled separately here.
   ===================================================================== */
var BOAT = ['charted', 'draft', 'clear', 'air', 'mast'];
function boatRead() {
  var o = {};
  BOAT.forEach(function (k) {
    var v = $('i-' + k).value.trim();
    o[k] = v === '' ? null : parseFloat(v);
    if (o[k] !== null && !isFinite(o[k])) o[k] = null;
    lsSet(k, v);
  });
  return o;
}
function windowList(wins, jdA, jdB, label) {
  var ul = el('ul', 'windows');
  wins.forEach(function (w) {
    var li = el('li');
    li.appendChild(el('span', null, label));
    li.appendChild(el('b', null, stTime(w.a) + ' \u2013 ' +
      (w.b >= jdB - 1e-9 ? '24:00' : stTime(w.b))));
    ul.appendChild(li);
  });
  return ul;
}
function drawDepth() {
  var P = PRED, b = boatRead(), out = $('depth-out');
  out.textContent = '';
  var jdA = DAY.jdA, jdB = DAY.jdB;
  var jn = nowJd(), inDay = (jn >= jdA && jn <= jdB);
  var tRef = inDay ? jn : jdA + 0.5;
  var vRef = P.height(tRef);
  var when = inDay ? 'now' : 'at midday';

  if (b.charted === null && (b.air === null || b.mast === null)) {
    out.appendChild(el('p', 'note',
      'Enter a charted depth, or a bridge clearance and your air draught.'));
    return;
  }

  if (b.charted !== null) {
    var total = b.charted + vRef;
    var p = el('p', 'verdict');
    p.appendChild(document.createTextNode('Charted ' + b.charted.toFixed(1) +
      ' m + tide ' + vRef.toFixed(2) + ' m = '));
    p.appendChild(el('b', null, total.toFixed(2) + ' m'));
    p.appendChild(document.createTextNode(' under the surface ' + when + '.'));
    out.appendChild(p);

    if (b.draft !== null) {
      var need = b.draft + (b.clear === null ? 0 : b.clear);
      var okNow = total >= need;
      var q = el('p', 'verdict ' + (okNow ? 'ok' : 'no'));
      q.appendChild(document.createTextNode('Draught ' + b.draft.toFixed(1) + ' m' +
        (b.clear !== null ? ' plus ' + b.clear.toFixed(1) + ' m under the keel' : '') +
        ' needs ' + need.toFixed(2) + ' m: '));
      q.appendChild(el('b', null, okNow
        ? (total - need).toFixed(2) + ' m to spare ' + when
        : (need - total).toFixed(2) + ' m short ' + when));
      out.appendChild(q);
      var wins = TIDE.depthWindows(P, jdA, jdB, b.charted, need);
      if (!wins.length) out.appendChild(el('p', 'verdict no', 'Never enough water here today.'));
      else out.appendChild(windowList(wins, jdA, jdB, 'enough water'));
    }
  }

  if (b.air !== null && b.mast !== null) {
    var clear = b.air - vRef;
    var r = el('p', 'verdict');
    r.appendChild(document.createTextNode('Charted clearance ' + b.air.toFixed(1) +
      ' m \u2212 tide ' + vRef.toFixed(2) + ' m = '));
    r.appendChild(el('b', null, clear.toFixed(2) + ' m'));
    r.appendChild(document.createTextNode(' clear ' + when + '.'));
    out.appendChild(r);
    out.appendChild(el('p', 'note',
      'Charted heights are above HAT, so the tide takes them away.'));
    var okA = clear >= b.mast;
    var s = el('p', 'verdict ' + (okA ? 'ok' : 'no'));
    s.appendChild(document.createTextNode('Air draught ' + b.mast.toFixed(1) + ' m: '));
    s.appendChild(el('b', null, okA
      ? (clear - b.mast).toFixed(2) + ' m above the masthead ' + when
      : (b.mast - clear).toFixed(2) + ' m too tall ' + when));
    out.appendChild(s);
    var aw = TIDE.airWindows(P, jdA, jdB, b.air, b.mast);
    if (!aw.length) out.appendChild(el('p', 'verdict no', 'It never clears today.'));
    else out.appendChild(windowList(aw, jdA, jdB, 'clears the bridge'));
  }
}

/* =====================================================================
   Sun and moon
   ===================================================================== */
function moonArt(illum, elong) {
  /*  A disc lit from one side, as a plain SVG: the terminator is an
      ellipse whose width is the cosine of the elongation, so it reads
      correctly through both quarters without a bitmap. */
  var R = 22, c = R + 2, k = Math.cos(elong * Math.PI / 180) * R;
  var waxing = elong < 180;
  var dark = 'var(--panel-2)', lit = 'var(--moon)';
  var svg = '<svg width="' + (2 * c) + '" height="' + (2 * c) + '" viewBox="0 0 ' +
    (2 * c) + ' ' + (2 * c) + '" aria-hidden="true">';
  svg += '<circle cx="' + c + '" cy="' + c + '" r="' + R + '" fill="' + dark +
         '" stroke="var(--line)"/>';
  /*  The lit limb is a half disc plus the terminator ellipse, and the
      terminator's SWEEP decides whether the result is a gibbous or a
      crescent.  A gibbous moon's terminator bulges AWAY from the lit
      limb, into the dark half; a crescent's cuts into the lit half.  The
      two sweeps were the wrong way round, so a 70%-lit waxing gibbous
      drew as a thin crescent -- the right disc, the wrong moon.

      The resulting area is exact, not an approximation: half a disc plus
      half an ellipse of semi-axes |cos(elongation)|*R and R gives a lit
      fraction of (1 - cos(elongation))/2, which is the illuminated
      fraction the engine computes. */
  var sweepHalf = waxing ? 1 : 0;
  var d = 'M ' + c + ' ' + (c - R) +
          ' A ' + R + ' ' + R + ' 0 0 ' + sweepHalf + ' ' + c + ' ' + (c + R) +
          ' A ' + Math.abs(k) + ' ' + R + ' 0 0 ' + (k > 0 ? 1 - sweepHalf : sweepHalf) +
          ' ' + c + ' ' + (c - R) + ' Z';
  svg += '<path d="' + d + '" fill="' + lit + '"/>';
  svg += '</svg>';
  return svg;
}
function drawSky() {
  var P = PRED, jd0 = DAY.jdA;   // the station's local midnight, in UT
  var ph = TIDE.moonPhase(jd0 + 0.5);
  $('moonart').innerHTML = moonArt(ph.illum, ph.elong);
  $('ph-name').textContent = ph.name;
  $('ph-sub').textContent = Math.round(ph.illum * 100) + '% lit, ' +
    ph.age.toFixed(1) + ' days old \u2014 ' +
    (ph.tide === 'springs' ? 'springs: the big ranges'
     : ph.tide === 'neaps' ? 'neaps: the small ranges'
     : 'between springs and neaps');

  /*  Three real grid cells per row.  Written as one string with spaces
      between the two times, HTML collapses them and the columns stop
      lining up, which is the whole value of a rise-and-set table. */
  var dl = $('sky-list');
  dl.textContent = '';
  ['', 'rise', 'set'].forEach(function (h) { dl.appendChild(el('div', 'hd', h)); });
  function ev(label, which, h0) {
    var r = TIDE.riseSet(jd0, P.lat, P.lon, which, h0);
    dl.appendChild(el('div', 'lb', label));
    dl.appendChild(el('div', 'vl', r.rise === null ? '\u2014' : stTime(r.rise)));
    dl.appendChild(el('div', 'vl', r.set === null ? '\u2014' : stTime(r.set)));
  }
  ev('Sun', 'sun', -0.833);
  ev('Civil twilight', 'sun', -6);
  ev('Moon', 'moon', -0.833);
}

/* =====================================================================
   The terminal view.

   The same picture the awk build draws, in the same 71x15 character
   grid, so the two builds can be held side by side.  The grid helpers
   mirror gput/gputw: a weak put only lands on a blank cell.
   ===================================================================== */
function termPicture() {
  var P = PRED, jdA = DAY.jdA, jdB = DAY.jdB;
  var w = 71, h = 15, G = [], r, c, i, t, v, j;
  for (r = 0; r < h; r++) { G[r] = []; for (c = 0; c < w; c++) G[r][c] = ' '; }
  function put(rr, cc, ch) {
    rr = Math.trunc(rr + 0.5); cc = Math.trunc(cc + 0.5);
    if (rr >= 0 && rr < h && cc >= 0 && cc < w) G[rr][cc] = ch;
  }
  function putw(rr, cc, ch) {
    rr = Math.trunc(rr + 0.5); cc = Math.trunc(cc + 0.5);
    if (rr >= 0 && rr < h && cc >= 0 && cc < w && G[rr][cc] === ' ') G[rr][cc] = ch;
  }
  var lo = 1e9, hi = -1e9;
  for (i = 0; i <= w * 2; i++) {
    v = P.height(jdA + (jdB - jdA) * i / (w * 2.0));
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (hi - lo < 0.2) { hi += 0.1; lo -= 0.1; }
  var rng = hi - lo;
  if (lo < 0 && hi > 0) {
    j = (h - 1) - (0 - lo) / rng * (h - 1);
    for (i = 0; i < w; i++) putw(j, i, '.');
    put(j, 0, '0');
  }
  for (i = 0; i < w; i++) {
    t = jdA + (jdB - jdA) * i / (w - 1.0);
    v = P.height(t);
    put((h - 1) - (v - lo) / rng * (h - 1), i, '*');
  }
  var hl = P.hilo(jdA, jdB);
  hl.forEach(function (e) {
    put((h - 1) - (e.h - lo) / rng * (h - 1),
        (e.t - jdA) / (jdB - jdA) * (w - 1), e.k === 'H' ? 'H' : 'L');
  });
  var jn = nowJd(), hasNow = (jn >= jdA && jn <= jdB);
  if (hasNow) {
    c = (jn - jdA) / (jdB - jdA) * (w - 1);
    for (j = 0; j < h; j++) putw(j, c, '|');
    put((h - 1) - (P.height(jn) - lo) / rng * (h - 1), c, '@');
  }
  var lines = [];
  for (r = 0; r < h; r++) lines.push('  ' + G[r].join(''));
  /*  the hour scale, positioned rather than padded: 24 hours across 71
      columns does not divide evenly, and a label that drifts from its
      own tick is worse than no label */
  var sc = [];
  for (i = 0; i < w; i++) sc[i] = ' ';
  for (i = 0; i <= 24; i += 3) {
    c = Math.trunc(i / 24.0 * (w - 1) + 0.5);
    var lab = pad2(i % 24);
    if (c + 1 >= w) c = w - 2;
    sc[c] = lab.charAt(0); sc[c + 1] = lab.charAt(1);
  }
  lines.push('  ' + sc.join(''));
  lines.push('  ' + hi.toFixed(2) + ' m at the top, ' + lo.toFixed(2) +
             ' m at the foot' + (hasNow ? '   @ = now' : ''));
  return lines.join('\n');
}
function drawTerminal() {
  var P = PRED, out = [];
  out.push('  ' + P.name);
  out.push('  ' + [P.region, P.country].filter(Boolean).join(', ') + '   ' +
           P.lat.toFixed(4) + ' ' + P.lon.toFixed(4) + '   heights above ' + P.datum);
  if (P.kind === 'S') {
    var k = (P.type === 'ratio')
      ? 'x' + P.hhi.toFixed(2) + '/' + P.hlo.toFixed(2)
      : plus(P.hhi) + '/' + plus(P.hlo) + ' m';
    out.push('  a secondary port: ' + plus(P.thi) + '/' + plus(P.tlo) +
             ' min and ' + k + ' on ' + P.refName);
  }
  var rule = '  ' + new Array(71).join('-');
  out.push(rule);
  out.push('              time    height');
  var hl = P.hilo(DAY.jdA, DAY.jdB);
  hl.forEach(function (e) {
    var kk = e.k === 'H' ? 'HIGH' : 'low';
    out.push('  ' + pad(kk, 6) + ' ' + pad(stTime(e.t), 6) + ' ' +
             lpad(e.h.toFixed(2), 7) + ' m');
  });
  out.push(rule);
  out.push('');
  out.push(termPicture());
  $('term').textContent = out.join('\n');
}
function plus(x) { return (x >= 0 ? '+' : '-') + Math.abs(x); }
function pad(s, n) { while (s.length < n) s += ' '; return s; }
function lpad(s, n) { while (s.length < n) s = ' ' + s; return s; }

/* =====================================================================
   Offline
   ===================================================================== */
function offlineState() {
  var n = $('off-state');
  if (!('caches' in window)) { n.textContent = 'This browser will not cache for offline use.'; return; }
  caches.open(CACHE_NAME).then(function (c) {
    return Promise.all([c.match(IDX_URL), c.match(DAT_URL), c.match('./')]);
  }).then(function (r) {
    var shell = !!r[2], idx = !!r[0], dat = !!r[1];
    if (shell && idx && dat) {
      n.textContent = 'Everything is cached. This works with the antenna down, ' +
        'including all 8,334 stations.';
      $('b-offline').disabled = true;
      $('b-offline').textContent = 'Already saved';
    } else if (shell && idx) {
      n.textContent = 'The app and the station index are cached. The harmonic ' +
        'constants (2.9 MB) are not, so a station you have not opened yet needs ' +
        'the network. Save them before you leave.';
    } else {
      n.textContent = 'Not yet cached. Open this page once with a connection.';
    }
  }).catch(function () { n.textContent = 'Could not read the cache.'; });
}

function saveOffline() {
  var b = $('b-offline'), bar = $('off-bar');
  b.disabled = true; b.textContent = 'Saving\u2026';
  bar.hidden = false;
  var fill = bar.firstElementChild;
  /*  Fetched here and put into the cache explicitly rather than left to
      the worker's install list: a 2.9 MB file in addAll() fails the whole
      install on a flaky connection, and then nothing is cached at all. */
  fetch(DAT_URL).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var total = +(r.headers.get('content-length') || 0);
    if (!r.body || !total) return r.blob().then(function (bl) { return new Response(bl); });
    var reader = r.body.getReader(), chunks = [], got = 0;
    return (function pump() {
      return reader.read().then(function (res) {
        if (res.done) return new Response(new Blob(chunks));
        chunks.push(res.value); got += res.value.length;
        fill.style.width = Math.round(got / total * 100) + '%';
        return pump();
      });
    })();
  }).then(function (resp) {
    return caches.open(CACHE_NAME).then(function (c) {
      return c.put(DAT_URL, resp);
    });
  }).then(function () {
    fill.style.width = '100%';
    b.textContent = 'Saved';
    offlineState();
  }).catch(function (e) {
    bar.hidden = true;
    b.disabled = false; b.textContent = 'Try again';
    $('off-state').textContent = 'Could not save it: ' + e.message;
  });
}


/* =====================================================================
   Coastal work: the six calculators.

   The arithmetic and every line of the working are in work.js, which is
   held to `tides work` character for character.  This part is only the
   form, the URL and the drawing:

       URL ?work=cts&track=045&...&lesson=a6-2
         |
         v
       WORK.fromQuery()  ->  [[key, value], ...]   in the URL's order
         |
         +-- a station needed?  load it first (async), then
         v
       WORK.run(name, params, ctx)  ->  { lines, res, fig } or a refusal
         |
         +-- lines, split at @@FIG  ->  <pre class="working">
         +-- fig                    ->  WORK.figure() -> SVG
         +-- lesson=                ->  WORK.lessonHref() -> back link

   "Work it" writes the form back into the URL with replaceState, so the
   address bar is always a link to what is on the screen.
   ===================================================================== */
var WNAME = 'twelfths';
var WLESSON = '';

function workNeedsStation(name, a) {
  if (name === 'atlas') return true;
  if (name !== 'twelfths') return false;
  return !(a.lw || a.hw || a.lwh || a.hwh);
}
function asObj(params) {
  var o = {};
  params.forEach(function (p) { if (p[1] !== '') o[p[0]] = p[1]; });
  return o;
}
function drawWorkMenus() {
  var boxes = document.querySelectorAll('.workmenu');
  for (var b = 0; b < boxes.length; b++) {
    boxes[b].textContent = '';
    WORK.NAMES.forEach(function (n) {
      var r = el('button', 'row');
      r.appendChild(el('b', null, WORK.SPEC[n].title));
      r.appendChild(el('span', null, WORK.SPEC[n].sub));
      r.addEventListener('click', function () { openWork(n, null); });
      boxes[b].appendChild(r);
    });
  }
}
function drawWorkTabs() {
  var box = $('w-tabs');
  box.textContent = '';
  WORK.NAMES.forEach(function (n) {
    var b = el('button', null, WORK.SPEC[n].title);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', n === WNAME ? 'true' : 'false');
    b.addEventListener('click', function () { openWork(n, null); });
    box.appendChild(b);
  });
}
function drawWorkForm(vals) {
  var sp = WORK.SPEC[WNAME], box = $('w-form');
  box.textContent = '';
  $('w-sub').textContent = sp ? sp.sub.charAt(0).toUpperCase() + sp.sub.slice(1) + '.' : '';
  if (!sp) return;
  sp.fields.forEach(function (f) {
    var d = el('div', 'f'), id = 'wf-' + f[0];
    var lab = el('label', null, f[1]);
    lab.setAttribute('for', id);
    var inp = el('input', 'wf');
    inp.id = id; inp.type = 'text';
    inp.setAttribute('data-k', f[0]);
    inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('spellcheck', 'false');
    inp.placeholder = f[2] || '';
    inp.value = vals && vals[f[0]] !== undefined ? vals[f[0]] : '';
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') workFromForm(); });
    d.appendChild(lab); d.appendChild(inp);
    box.appendChild(d);
  });
}
function formParams() {
  var out = [], ins = $('w-form').querySelectorAll('input');
  for (var i = 0; i < ins.length; i++) {
    var v = ins[i].value.replace(/^\s+|\s+$/g, '');
    if (v !== '') out.push([ins[i].getAttribute('data-k'), v]);
  }
  return out;
}
function workUrl(params) {
  var q = new URLSearchParams();
  q.append('work', WNAME);
  params.forEach(function (p) { if (p[0] !== 'work' && p[0] !== 'lesson') q.append(p[0], p[1]); });
  if (WLESSON) q.append('lesson', WLESSON);
  return location.pathname + '?' + q.toString();
}
function showLesson() {
  var href = WORK.lessonHref(WLESSON);
  ['w-lesson', 'w-lesson2'].forEach(function (id) {
    $(id).hidden = !href;
    if (href) $(id + '-a').setAttribute('href', href);
  });
}
/*  Open the work view on one calculator.  params null: a fresh form,
    with the chosen station filled in where one is wanted. */
function openWork(name, params) {
  WNAME = name;
  drawWorkTabs();
  var vals = params ? asObj(params) : {};
  if (!params && STATION && WORK.SPEC[name] &&
      WORK.SPEC[name].fields.some(function (f) { return f[0] === 'station'; }) && name === 'atlas') {
    vals.station = STATION.st.id;
  }
  drawWorkForm(vals);
  $('w-result').hidden = true;
  $('w-out').textContent = '';
  showLesson();
  $('w-url').textContent = location.origin + workUrl(params || []);
  go('work');
  if (params) workRun(params);
}
function workFromForm() {
  var p = formParams();
  try { history.replaceState(null, '', workUrl(p)); } catch (e) { /* file: */ }
  $('w-url').textContent = location.origin + workUrl(p);
  workRun(p);
}
function nowUT() {
  var n = new Date();
  return { d: n.getUTCFullYear() + '-' + pad2(n.getUTCMonth() + 1) + '-' + pad2(n.getUTCDate()),
           t: pad2(n.getUTCHours()) + ':' + pad2(n.getUTCMinutes()) };
}
function workRun(params) {
  var a = asObj(params), now = nowUT();
  var def = STATION ? STATION.st.id : lsGet('station', '');
  var ctx = { defStation: def, nowdate: now.d, nowtime: now.t, load: null };
  var id = WORK.stationId(a, def);
  if (!workNeedsStation(WNAME, a) || !id || !IDX || IDX.byId[id] === undefined) {
    ctx.load = function () { return { err: 'no station with that id' }; };
    workShow(WORK.run(WNAME, params, ctx));
    return;
  }
  $('w-result').hidden = false;
  $('w-out').textContent = 'Loading the station…';
  openStation(id).then(function (p) {
    ctx.load = function () { return p; };
    workShow(WORK.run(WNAME, params, ctx));
  }).catch(function (e) {
    ctx.load = function () { return { err: e.message }; };
    workShow(WORK.run(WNAME, params, ctx));
  });
}
function workPre(lines) {
  var pre = el('pre', 'working');
  lines.forEach(function (L, i) {
    if (/^  ANSWER/.test(L)) pre.appendChild(el('b', 'ans', L));
    else pre.appendChild(document.createTextNode(L));
    if (i < lines.length - 1) pre.appendChild(document.createTextNode('\n'));
  });
  return pre;
}
function workShow(r) {
  var out = $('w-out');
  out.textContent = '';
  $('w-result').hidden = false;
  if (!r.ok) {
    out.appendChild(el('p', 'wrefuse', r.err.charAt(0).toUpperCase() + r.err.slice(1) + '.'));
    out.appendChild(el('p', 'note', 'Nothing was worked. WORK.md lists every parameter, its units and its default.'));
    out.setAttribute('data-state', 'refused');
    return;
  }
  var k = r.lines.indexOf('@@FIG');
  var before = k < 0 ? r.lines : r.lines.slice(0, k), after = k < 0 ? [] : r.lines.slice(k + 1);
  //  the leading blank line is the terminal's spacing, not the page's
  if (before.length && before[0] === '') before = before.slice(1);
  out.appendChild(workPre(before));
  if (k >= 0) {
    var fig = el('div', 'wfigbox');
    fig.innerHTML = WORK.figure(r);      // built from numbers only: see work.js
    out.appendChild(fig);
    out.appendChild(workPre(after));
  }
  if (WNAME === 'atlas' && r.res.means) {
    var b = el('button', 'btn wide', 'Work the stream rate for this range');
    b.addEventListener('click', function () {
      openWork('stream', [['range', wfix(r.res.range)], ['sprange', wfix(r.res.sprange)], ['nprange', wfix(r.res.nprange)]]);
    });
    out.appendChild(b);
  }
  out.setAttribute('data-state', 'worked');
}
function wfix(v) { return WORK.fx(v, 2); }

/* =====================================================================
   Start
   ===================================================================== */
var resizeTimer = null;
window.addEventListener('resize', function () {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () { if (PRED) drawCurve(); }, 120);
});

window.addEventListener('DOMContentLoaded', function () {
  setMode(savedMode());
  wireModes();
  $('back').addEventListener('click', function () { go(STATION ? 'day' : 'pick'); });
  $('title').addEventListener('click', function () { if (VIEW === 'day') go('about'); });
  $('st-change').addEventListener('click', function () { go('pick'); drawRecent(); });
  $('d-prev').addEventListener('click', function () { shiftDay(-1); });
  $('d-next').addEventListener('click', function () { shiftDay(1); });
  $('b-near').addEventListener('click', doNear);
  $('b-gps').addEventListener('click', doGps);
  $('b-offline').addEventListener('click', saveOffline);
  $('ver').textContent = 'build ' + BUILD;
  drawWorkMenus();
  $('w-go').addEventListener('click', workFromForm);
  $('w-ex').addEventListener('click', function () {
    var ex = WORK.EXAMPLES[WNAME], v = {};
    if (ex) ex.split(' ').forEach(function (kv) { var e = kv.indexOf('='); v[kv.substr(0, e)] = kv.substr(e + 1); });
    drawWorkForm(v);
  });
  $('w-clear').addEventListener('click', function () { drawWorkForm({}); $('w-result').hidden = true; });

  /*  ?work=... opens the calculator straight away -- before the station
      index has loaded, because four of the six never need it.  The two
      that do wait for it below. */
  var WQ = WORK.fromQuery(location.search), wq = asObj(WQ);
  var startWork = wq.work !== undefined;
  WLESSON = wq.lesson || '';

  BOAT.forEach(function (k) {
    var f = $('i-' + k);
    f.value = lsGet(k, '');
    f.addEventListener('input', function () { if (PRED) drawDepth(); });
  });
  $('i-clearbtn').addEventListener('click', function () {
    BOAT.forEach(function (k) { $('i-' + k).value = ''; lsSet(k, ''); });
    if (PRED) drawDepth();
  });
  $('i-lat').value = lsGet('lat', '');
  $('i-lon').value = lsGet('lon', '');

  var qt = null;
  $('q').addEventListener('input', function () {
    if (qt) clearTimeout(qt);
    qt = setTimeout(doSearch, 140);
  });

  if (startWork) {
    WNAME = wq.work;
    if (!workNeedsStation(WNAME, wq)) openWork(WNAME, WQ);
    else { drawWorkTabs(); go('work'); showLesson(); $('w-result').hidden = false; $('w-out').textContent = 'Loading the station index\u2026'; }
  } else go('pick');
  showResults('Results', [], 'Loading the station index\u2026');

  loadIndex().then(function () {
    drawRecent();
    showResults('Results', [], IDX.n.toLocaleString() +
      ' stations loaded. Search by name, or find the nearest to a position.');
    var last = lsGet('station', '');
    if (last && IDX.byId[last] !== undefined) {
      setToday();
      choose(last);
    }
    if (startWork && workNeedsStation(WNAME, wq)) openWork(WNAME, WQ);
    offlineState();
  }).catch(function (e) {
    showResults('Results', [], 'Could not load the station index: ' + e.message);
    if (startWork && workNeedsStation(WNAME, wq)) openWork(WNAME, WQ);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    /*  A worker that serves stale code wasted a whole round of testing
        once: I described build 2 while the iPad ran build 1.  Every page
        prints its build, and a build can declare TIDES_NO_SW to unregister
        rather than install. */
    if (window.TIDES_NO_SW) {
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

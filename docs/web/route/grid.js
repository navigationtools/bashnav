// =====================================================================
//  GRID 1 -- the wind and current grids the router reads.
//
//  Contract: docs/web/route/GRID.md. This file is the reference for it:
//  what this refuses, the format does not allow.
//
//  WHY A FORMAT OF ITS OWN, AND WHY IT GETS ITS OWN FILE. Two converters
//  write it -- GRIB to wind, the Shom atlas to current, both in the
//  course's repository -- and the router reads it. The weather app may
//  well read it later. A format defined inside its first consumer
//  becomes whatever that consumer happens to do, so it is defined here,
//  on its own, with a reader that is strict on purpose.
//
//  STRICT ON PURPOSE. Every refusal below is a fault that would
//  otherwise surface as a route: a boat sailing through a gap in the
//  wind, or an hour of stream applied to the wrong hour. A grid that is
//  wrong in a way nothing notices is worse than one that will not load,
//  because the router will happily draw a track from it.
//
//  THE ROW COUNT IS CHECKED TWICE, against two independent things:
//  the header's own `rows`, and times x lat x lon derived from the grid
//  description. Truncation -- a file cut short by a copy, a disk, a
//  pipe -- is the failure that actually happens to a text file, and one
//  number in the header plus one multiplication catches it. That is the
//  same reasoning as NT1's check code: the realistic fault is
//  mechanical, not malicious.
//
//  PLAIN TEXT, SPACE SEPARATED, awk-readable. The router is JavaScript
//  and does not need that; the project does. A grid a person can open
//  and read is a grid whose faults can be seen.
// =====================================================================
'use strict';

var GRID = (function () {

  var TIME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}Z$/;
  var LEVEL = /^(surface|[1-9][0-9]{1,3}hPa)$/;
  var KINDS = { wind: 1, current: 1 };                      //  GRID 1
  var KINDS2 = { wind: 1, current: 1, wave: 1, depth: 1 };  //  GRID 2

  //  Fields every kind must carry, in this order, before any extras.
  var MUST = ['u', 'v'];
  //  What a kind is allowed to add after them.
  var EXTRA = { wind: { gust: 1 }, current: {} };

  // =================================================================
  //  GRID 2: the same grid, for three more things the course asks of
  //  it -- waves, wind at a level other than the deck, and a depth,
  //  which has no time axis at all.
  //
  //  WHY THEY ARE HERE AND NOT IN A FORMAT OF THEIR OWN. They are the
  //  same mechanical object: values on a regular latitude-longitude
  //  grid. What is expensive in this file is not the wind -- it is the
  //  span that must be a whole number of steps, the row count checked
  //  twice against two independent things, "-" meaning no data and
  //  never reading back as zero, and a reader that never throws. A
  //  second format gets all of that wrong again, or copies it and
  //  drifts.
  //
  //  AND BECAUSE THE DANGEROUS ONE IS A WIND. A 925 hPa wind loaded as
  //  the surface wind does not error; it routes, on a wind perhaps a
  //  third too strong and veered from the real surface wind, because
  //  friction backs the surface wind out of the gradient wind. The only
  //  defence is that the level is IN THE FILE and the router refuses a
  //  grid that is not `surface` -- which is only possible if upper
  //  winds live in this format rather than beside it.
  //
  //  THE UNIT BELONGS TO THE FIELD. `units kt` cannot carry metres,
  //  seconds and degrees, so in GRID 2 `units` is one unit per field in
  //  the order `fields` gives, checked against this dictionary. It is a
  //  copy of what the field names already fix, kept on purpose and
  //  checked: a file somebody opens has to be readable on its own.
  var UNIT = {
    u: 'kt', v: 'kt', gust: 'kt',
    //  dirto: the direction the sea RUNS TOWARDS, like a current's set
    //  and the opposite of how a wind is named. The convention is in
    //  the field's own name so that nothing downstream has to remember
    //  it, and the converter does the flip once, where the source's
    //  convention is known.
    hs: 'm', tp: 's', dirto: 'degT',
    hs_sea: 'm', tp_sea: 's', dirto_sea: 'degT',
    hs_swell: 'm', tp_swell: 's', dirto_swell: 'degT',
    //  z: metres, positive down from chart datum -- the same datum as
    //  the tide heights, so a depth and a height can be added. A drying
    //  height is negative.
    z: 'm'
  };
  var MUST2  = { wind: ['u', 'v'], current: ['u', 'v'],
                 wave: ['hs', 'tp', 'dirto'], depth: ['z'] };
  var EXTRA2 = { wind: { gust: 1 }, current: {},
                 wave: { hs_sea: 1, tp_sea: 1, dirto_sea: 1,
                         hs_swell: 1, tp_swell: 1, dirto_swell: 1 },
                 depth: {} };

  function err(line, msg) { return { ok: false, line: line, err: msg }; }

  //  A count of steps that must come out whole. (lat1-lat0)/dlat is
  //  floating point, so it is rounded and then checked against the
  //  rounding: 0.25-degree steps over 2 degrees must give 8, not
  //  7.999999999999999, and a grid whose span is not a whole number of
  //  steps is refused rather than silently truncated.
  function steps(a, b, d) {
    var n = Math.round((b - a) / d);
    if (n < 0) return -1;
    if (Math.abs(a + n * d - b) > Math.abs(d) * 1e-6) return -1;
    return n;
  }

  function num(tok) {
    if (!/^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][-+]?[0-9]+)?$/.test(tok)) return null;
    var x = parseFloat(tok);
    return isFinite(x) ? x : null;
  }

  // ---------------------------------------------------------------
  //  parse(text) -> { ok, err, line, meta, rows, at(ti, yi, xi) }
  //
  //  It NEVER throws: a bad grid is a result, not an exception, and
  //  the caller gets one plain sentence and a line number.
  // ---------------------------------------------------------------
  function parse(text) {
    var lines = String(text).split(/\r?\n/);
    var i = 0, n = lines.length;
    var m = {};                      //  the header, as it is read
    var seen = {};

    function next() {
      while (i < n) {
        var s = lines[i].replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
        if (s === '' || s.charAt(0) === '#') { i++; continue; }
        return s;
      }
      return null;
    }

    var first = next();
    if (first === null) return err(0, 'the grid is empty');
    var ver = first === 'GRID 1' ? 1 : (first === 'GRID 2' ? 2 : 0);
    if (!ver) {
      return err(i + 1, 'the first line must be "GRID 1" or "GRID 2", not "' + first + '"');
    }
    m.version = ver;
    i++;

    //  ---- the header ---------------------------------------------
    //  Read until `rows`, which is required to be last: everything the
    //  reader needs to size the data is then known before a single
    //  data line is touched.
    while (true) {
      var line = next();
      if (line === null) return err(n, 'the header ends without a "rows" line');
      var sp = line.indexOf(' ');
      var key = sp < 0 ? line : line.substring(0, sp);
      var val = sp < 0 ? '' : line.substring(sp + 1).replace(/^[ \t]+/, '');
      var ln = i + 1;
      i++;

      if (seen[key]) return err(ln, '"' + key + '" appears twice in the header');
      seen[key] = 1;

      if (key === 'kind') {
        var ks = Object.keys(ver === 1 ? KINDS : KINDS2);
        if (!ks.join(' ').split(' ').length) return err(ln, 'kind is empty');
        if ((ver === 1 ? KINDS : KINDS2)[val] !== 1) {
          var names = ks.length > 1
            ? ks.slice(0, -1).join(', ') + ' or ' + ks[ks.length - 1]
            : ks[0];
          return err(ln, 'kind must be ' + names + ', not "' + val + '"');
        }
        m.kind = val;

      } else if (key === 'level') {
        //  THE LEVEL IS NEVER DEFAULTED. A defaulted level is a
        //  convention living in a document, which is the thing this
        //  format refuses to do with units and with signs.
        if (ver === 1) return err(ln, 'level is a GRID 2 line; this file says GRID 1');
        if (!LEVEL.test(val)) return err(ln, 'level is "surface" or a pressure level such as "925hPa", not "' + val + '"');
        m.level = val;

      } else if (key === 'method') {
        //  How the field was arrived at, which is NOT the same fact as
        //  the level: a geostrophic wind is worked out from the isobars
        //  at a level, and somebody will one day want one at 925 hPa.
        if (ver === 1) return err(ln, 'method is a GRID 2 line; this file says GRID 1');
        if (val !== 'model' && val !== 'geostrophic') {
          return err(ln, 'method is "model" or "geostrophic", not "' + val + '"');
        }
        m.method = val;

      } else if (key === 'units') {
        //  One unit, deliberately. A format that accepts knots and
        //  metres per second is a format where half the files are in
        //  the other one and nothing says which until a boat is doing
        //  forty knots in a gale. In GRID 2 that becomes one unit per
        //  field, each checked against the dictionary above, which is
        //  the same rule where a kind has more than one sort of number.
        if (ver === 1) {
          if (val !== 'kt') return err(ln, 'units must be kt, not "' + val + '"');
          m.units = val;
        } else {
          var us = val === '' ? [] : val.split(/[ \t]+/);
          if (!us.length) return err(ln, 'units is empty: GRID 2 gives one unit per field');
          m.units = us;
        }

      } else if (key === 'u' || key === 'v') {
        //  The sign convention is IN THE FILE, not only in the
        //  contract. Half the bugs in this class of code are a sign,
        //  and a convention that lives only in a document is one that
        //  gets assumed.
        var want = (key === 'u') ? 'east' : 'north';
        if (val !== want) {
          return err(ln, key + ' must be positive ' + want + ' ("' + key + ' ' + want + '")');
        }
        m[key] = val;

      } else if (key === 'lat' || key === 'lon') {
        var p = val.split(/[ \t]+/);
        if (p.length !== 3) return err(ln, key + ' takes three numbers: from, to, step');
        var a = num(p[0]), b = num(p[1]), d = num(p[2]);
        if (a === null || b === null || d === null) return err(ln, key + ' has a value that is not a number');
        if (d <= 0) return err(ln, key + ' step must be greater than zero');
        if (b <= a) return err(ln, key + ' must run from a smaller value to a larger one');
        var lim = (key === 'lat') ? 90 : 180;
        if (a < -lim || b > lim) return err(ln, key + ' is outside ' + (-lim) + ' to ' + lim);
        var st = steps(a, b, d);
        if (st < 0) return err(ln, key + ' span is not a whole number of steps');
        m[key] = { from: a, to: b, step: d, n: st + 1 };

      } else if (key === 'times') {
        //  A GRID WITH NO TIME AXIS SAYS SO, rather than leaving the
        //  line out: an omitted line cannot be told from a truncated
        //  header, and the header's fixed shape is this format's whole
        //  defence against a file that stopped halfway.
        if (val === 'none') {
          if (ver === 1) return err(ln, '"times none" is a GRID 2 line; this file says GRID 1');
          m.times = []; m.timeless = true; continue;
        }
        var ts = val === '' ? [] : val.split(/[ \t]+/), k;
        if (!ts.length) return err(ln, 'times is empty');
        for (k = 0; k < ts.length; k++) {
          if (!TIME.test(ts[k])) {
            return err(ln, '"' + ts[k] + '" is not a time of the form 2025-05-24T06:00Z');
          }
          //  Strictly increasing, so a duplicated or reordered line
          //  cannot pass as a grid with an odd time axis.
          if (k && ts[k] <= ts[k - 1]) {
            return err(ln, 'times must increase: "' + ts[k] + '" follows "' + ts[k - 1] + '"');
          }
        }
        m.times = ts;

      } else if (key === 'fields') {
        //  Judged below, not here: which fields a grid must begin with
        //  depends on its kind, and `kind` may not have been read yet.
        var fs = val === '' ? [] : val.split(/[ \t]+/);
        if (!fs.length) return err(ln, 'fields is empty');
        m.fields = fs; m.fieldsLine = ln;

      } else if (key === 'order') {
        //  One order, for the same reason as one unit.
        if (val !== 'time lat lon' && !(ver === 2 && val === 'lat lon')) {
          return err(ln, 'order must be "time lat lon"' +
                         (ver === 2 ? ', or "lat lon" where times is none' : ''));
        }
        m.order = val;

      } else if (key === 'rows') {
        var r = num(val);
        if (r === null || r < 0 || r !== Math.floor(r)) return err(ln, 'rows must be a whole number');
        m.rows = r;
        break;

      } else {
        return err(ln, 'the header has no "' + key + '" line in GRID ' + ver);
      }
    }

    //  ---- is the header complete and consistent? ------------------
    var need = ['kind', 'units', 'lat', 'lon', 'times', 'fields', 'order', 'rows'], q;
    if (ver === 1) need = need.concat(['u', 'v']);
    for (q = 0; q < need.length; q++) {
      if (!(need[q] in m)) return err(i, 'the header has no "' + need[q] + '" line');
    }

    var vector = (m.kind === 'wind' || m.kind === 'current');
    if (ver === 2) {
      //  A VECTOR GRID STATES ITS SIGNS; THE OTHERS MUST NOT.  Half the
      //  bugs in this class of code are a sign, so u and v say where
      //  they point -- and a `u east` line on a depth grid would be a
      //  line nothing reads, which is a line somebody believes.
      if (vector) {
        if (!('u' in m)) return err(i, 'the header has no "u" line');
        if (!('v' in m)) return err(i, 'the header has no "v" line');
      } else if ('u' in m || 'v' in m) {
        return err(i, 'a ' + m.kind + ' grid has no u or v: those lines are the sign convention of a vector');
      }
      //  The level is a fact about a wind and about nothing else.
      if (m.kind === 'wind') {
        if (!('level' in m)) return err(i, 'a GRID 2 wind grid must say its level: "level surface" or "level 925hPa"');
        if (!('method' in m)) return err(i, 'a GRID 2 wind grid must say its method: "method model" or "method geostrophic"');
      } else if ('level' in m || 'method' in m) {
        return err(i, 'level and method belong to a wind grid, not a ' + m.kind + ' grid');
      }
      //  A grid with no time axis has no time in its order, and a grid
      //  with one must say so.
      if (m.timeless && m.order !== 'lat lon') {
        return err(i, 'times is none, so order must be "lat lon"');
      }
      if (!m.timeless && m.order !== 'time lat lon') {
        return err(i, 'this grid has times, so order must be "time lat lon"');
      }
    }

    //  fields must begin with what this kind carries, and may add only
    //  what this kind allows
    var must = ver === 1 ? MUST : MUST2[m.kind];
    var extra = ver === 1 ? EXTRA[m.kind] : EXTRA2[m.kind];
    for (q = 0; q < must.length; q++) {
      if (m.fields[q] !== must[q]) {
        return err(m.fieldsLine || i, 'fields must begin "' + must.join(' ') + '"');
      }
    }
    for (q = must.length; q < m.fields.length; q++) {
      if (!extra[m.fields[q]]) {
        return err(m.fieldsLine || i, 'a ' + m.kind + ' grid has no field "' + m.fields[q] + '"');
      }
    }
    if (ver === 2) {
      //  ONE UNIT PER FIELD, AND THE RIGHT ONE. The unit is fixed by the
      //  field's name; the line is a copy of that, kept so the file can
      //  be read on its own and checked so the copy cannot drift.
      if (m.units.length !== m.fields.length) {
        return err(i, 'units gives ' + m.units.length + ' unit(s) for ' + m.fields.length + ' field(s)');
      }
      for (q = 0; q < m.fields.length; q++) {
        if (m.units[q] !== UNIT[m.fields[q]]) {
          return err(i, m.fields[q] + ' is in ' + UNIT[m.fields[q]] + ', and units says "' + m.units[q] + '"');
        }
      }
    }

    //  THE FIRST OF THE TWO COUNT CHECKS: the header against itself.
    //  A grid with no time axis has one slice, not none: rows is then
    //  latitudes x longitudes, and at(0, yi, xi) reads it.
    var nt = m.times.length || 1;
    var want = nt * m.lat.n * m.lon.n;
    if (m.rows !== want) {
      return err(i, 'rows says ' + m.rows + ', but ' + (m.timeless ? '1 slice x ' : m.times.length + ' times x ') +
                    m.lat.n + ' latitudes x ' + m.lon.n + ' longitudes is ' + want);
    }

    //  ---- the data ------------------------------------------------
    var nf = m.fields.length;
    var data = new Array(m.rows * nf);
    var got = 0;
    while (true) {
      var d2 = next();
      if (d2 === null) break;
      var ln2 = i + 1; i++;
      if (got >= m.rows) return err(ln2, 'there are more data rows than the header\'s ' + m.rows);
      var t = d2.split(/[ \t]+/);
      if (t.length !== nf) {
        return err(ln2, 'this row has ' + t.length + ' values; fields asks for ' + nf);
      }
      for (q = 0; q < nf; q++) {
        if (t[q] === '-') { data[got * nf + q] = null; continue; }   //  no data here
        var x = num(t[q]);
        if (x === null) return err(ln2, '"' + t[q] + '" is not a number, and not "-"');
        data[got * nf + q] = x;
      }
      got++;
    }

    //  THE SECOND COUNT CHECK: what is on disk against what was
    //  promised. This is the one that catches a truncated file, which
    //  is the failure that actually happens.
    if (got !== m.rows) {
      return err(n, 'the header promises ' + m.rows + ' rows and the file has ' + got +
                    (got < m.rows ? ' -- the file looks cut short' : ''));
    }

    var idx = {};
    for (q = 0; q < nf; q++) idx[m.fields[q]] = q;

    return {
      ok: true, err: '', line: 0, meta: m, n: got,
      //  at(ti, yi, xi) -> { u, v, ... } with null where there is no
      //  data. Index order is the header's `order`, which is the only
      //  order GRID 1 has.
      at: function (ti, yi, xi) {
        if (ti < 0 || ti >= (m.times.length || 1)) return null;
        if (yi < 0 || yi >= m.lat.n) return null;
        if (xi < 0 || xi >= m.lon.n) return null;
        var base = ((ti * m.lat.n + yi) * m.lon.n + xi) * nf, o = {}, k2;
        for (k2 = 0; k2 < nf; k2++) o[m.fields[k2]] = data[base + k2];
        return o;
      },
      lat: function (yi) { return m.lat.from + yi * m.lat.step; },
      lon: function (xi) { return m.lon.from + xi * m.lon.step; }
    };
  }

  return { parse: parse, steps: steps };
})();

if (typeof module !== 'undefined') module.exports = GRID;

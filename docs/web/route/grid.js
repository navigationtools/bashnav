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
  var KINDS = { wind: 1, current: 1 };

  //  Fields every kind must carry, in this order, before any extras.
  var MUST = ['u', 'v'];
  //  What a kind is allowed to add after them.
  var EXTRA = { wind: { gust: 1 }, current: {} };

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
    if (first !== 'GRID 1') {
      return err(i + 1, 'the first line must be "GRID 1", not "' + first + '"');
    }
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
        if (!KINDS[val]) return err(ln, 'kind must be wind or current, not "' + val + '"');
        m.kind = val;

      } else if (key === 'units') {
        //  One unit, deliberately. A format that accepts knots and
        //  metres per second is a format where half the files are in
        //  the other one and nothing says which until a boat is doing
        //  forty knots in a gale.
        if (val !== 'kt') return err(ln, 'units must be kt, not "' + val + '"');
        m.units = val;

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
        var fs = val === '' ? [] : val.split(/[ \t]+/), j;
        for (j = 0; j < MUST.length; j++) {
          if (fs[j] !== MUST[j]) {
            return err(ln, 'fields must begin "' + MUST.join(' ') + '"');
          }
        }
        m.fields = fs;

      } else if (key === 'order') {
        //  One order, for the same reason as one unit.
        if (val !== 'time lat lon') return err(ln, 'order must be "time lat lon"');
        m.order = val;

      } else if (key === 'rows') {
        var r = num(val);
        if (r === null || r < 0 || r !== Math.floor(r)) return err(ln, 'rows must be a whole number');
        m.rows = r;
        break;

      } else {
        return err(ln, 'the header has no "' + key + '" line in GRID 1');
      }
    }

    //  ---- is the header complete and consistent? ------------------
    var need = ['kind', 'units', 'u', 'v', 'lat', 'lon', 'times', 'fields', 'order', 'rows'], q;
    for (q = 0; q < need.length; q++) {
      if (!(need[q] in m)) return err(i, 'the header has no "' + need[q] + '" line');
    }
    //  fields beyond u and v must be ones this kind allows
    for (q = MUST.length; q < m.fields.length; q++) {
      if (!EXTRA[m.kind][m.fields[q]]) {
        return err(i, 'a ' + m.kind + ' grid has no field "' + m.fields[q] + '"');
      }
    }

    //  THE FIRST OF THE TWO COUNT CHECKS: the header against itself.
    var want = m.times.length * m.lat.n * m.lon.n;
    if (m.rows !== want) {
      return err(i, 'rows says ' + m.rows + ', but ' + m.times.length + ' times x ' +
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
        if (ti < 0 || ti >= m.times.length) return null;
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

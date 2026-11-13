// =====================================================================
//  The polar: how fast this boat goes, at this angle, in this wind.
//
//  Second piece of the router, after the vector step. The table is the
//  course's "polar plug-in": any boat's table in the Expedition shape
//  drops in, which is why the format is read rather than built in.
//
//      # comment lines are ignored
//      twa/tws   4     6     8    10    …      <- first row: TWS, knots
//      52        5.49  7.39  8.73  9.50  …     <- TWA, then speeds
//      60        5.95  7.89  9.17  9.91  …
//
//  Tab or space separated. TWA in degrees from the true wind, TWS and
//  boat speed in knots.
//
//  WHAT IT WILL NOT DO, AND WHY THAT MATTERS MORE THAN WHAT IT DOES.
//
//  1. It does not invent a speed closer to the wind than the table
//     goes. A table that starts at 52 degrees says nothing about 45,
//     and a router told "9 knots at 45" will beat to windward in a
//     straight line and arrive hours early on paper. Outside the
//     angles, the answer is null -- no data -- and the caller has to
//     deal with it. Upwind and downwind work belongs to the optimum
//     VMG angles, which the generator writes into this file and which
//     are read here when present.
//  2. It does not extrapolate above the strongest wind in the table.
//     A polar extrapolated into a gale is a boat doing fifteen knots
//     under full main in forty knots of wind. Above the last column it
//     CLAMPS and says so, so a route can report that it did.
//  3. Below the lightest wind in the table it interpolates towards
//     zero at zero wind, which is the one extrapolation that is
//     physically honest: no wind, no boat speed.
//
//  Bilinear between the four surrounding table entries. A real VPP is
//  smoother than that; the error between gridded points is far smaller
//  than the error in the wind field the router is given, and a spline
//  through a coarse table invents inflections nobody measured.
// =====================================================================
'use strict';

var POLAR = (function () {

  function num(t) {
    if (!/^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][-+]?[0-9]+)?$/.test(t)) return null;
    var x = parseFloat(t);
    return isFinite(x) ? x : null;
  }

  function err(line, msg) { return { ok: false, line: line, err: msg }; }

  //  The optimum beat and run angles the generator records as comments.
  //  They are COMMENTS on purpose: a reader that does not know about
  //  them still reads the table. So they are optional here too, and
  //  their absence is not an error -- it only means the router must
  //  find its own best angle.
  var EXTRA = { beat_angle: 1, beat_vmg: 1, run_angle: 1, run_vmg: 1 };

  // ---------------------------------------------------------------
  //  parse(text) -> { ok, err, line, tws[], twa[], v[twaIdx][twsIdx],
  //                   beat_angle[]?, beat_vmg[]?, run_angle[]?, run_vmg[]? }
  // ---------------------------------------------------------------
  function parse(text) {
    var lines = String(text).split(/\r?\n/);
    var tws = null, twa = [], v = [], extra = {};
    var i, raw, s, t, k, row, x;

    for (i = 0; i < lines.length; i++) {
      raw = lines[i];
      s = raw.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
      if (s === '') continue;

      if (s.charAt(0) === '#') {
        //  "# beat_angle<TAB>43.84<TAB>…"
        t = s.replace(/^#[ \t]*/, '').split(/[ \t]+/);
        if (EXTRA[t[0]] && tws) {
          if (t.length - 1 !== tws.length) {
            return err(i + 1, t[0] + ' has ' + (t.length - 1) + ' values for ' +
                               tws.length + ' wind speeds');
          }
          row = [];
          for (k = 1; k < t.length; k++) {
            x = num(t[k]);
            if (x === null) return err(i + 1, '"' + t[k] + '" in ' + t[0] + ' is not a number');
            row.push(x);
          }
          extra[t[0]] = row;
        }
        continue;
      }

      t = s.split(/[ \t]+/);

      if (tws === null) {
        //  The header: a label, then the wind speeds.
        if (t.length < 2) return err(i + 1, 'the first row needs a label and at least one wind speed');
        tws = [];
        for (k = 1; k < t.length; k++) {
          x = num(t[k]);
          if (x === null) return err(i + 1, '"' + t[k] + '" is not a wind speed');
          if (x < 0) return err(i + 1, 'a wind speed cannot be negative');
          if (tws.length && x <= tws[tws.length - 1]) {
            return err(i + 1, 'wind speeds must increase: ' + x + ' follows ' + tws[tws.length - 1]);
          }
          tws.push(x);
        }
        continue;
      }

      if (t.length !== tws.length + 1) {
        return err(i + 1, 'this row has ' + (t.length - 1) + ' speeds for ' +
                           tws.length + ' wind speeds');
      }
      x = num(t[0]);
      if (x === null) return err(i + 1, '"' + t[0] + '" is not an angle');
      if (x < 0 || x > 180) return err(i + 1, 'a true wind angle runs from 0 to 180, not ' + x);
      if (twa.length && x <= twa[twa.length - 1]) {
        return err(i + 1, 'angles must increase: ' + x + ' follows ' + twa[twa.length - 1]);
      }
      twa.push(x);
      row = [];
      for (k = 1; k < t.length; k++) {
        var y = num(t[k]);
        if (y === null) return err(i + 1, '"' + t[k] + '" is not a boat speed');
        if (y < 0) return err(i + 1, 'a boat speed cannot be negative');
        row.push(y);
      }
      v.push(row);
    }

    if (tws === null) return err(0, 'the polar is empty');
    if (!twa.length) return err(lines.length, 'the polar has no angles');

    var p = { ok: true, err: '', line: 0, tws: tws, twa: twa, v: v };
    for (k in extra) p[k] = extra[k];
    return p;
  }

  //  Where x sits between a[i] and a[i+1]: { i, f } with 0 <= f < 1,
  //  or null when x is outside a.
  function span(a, x) {
    if (x < a[0] || x > a[a.length - 1]) return null;
    var i;
    for (i = 0; i < a.length - 1; i++) {
      if (x <= a[i + 1]) {
        var d = a[i + 1] - a[i];
        return { i: i, f: d === 0 ? 0 : (x - a[i]) / d };
      }
    }
    return { i: a.length - 2, f: 1 };
  }

  // ---------------------------------------------------------------
  //  speed(p, twa, tws) -> { kt, clamped } or null
  //
  //  null means THE TABLE DOES NOT SAY. That is not the same as zero,
  //  and a router that treats it as zero will refuse to beat; one that
  //  treats it as a speed will beat in a straight line. Either way it
  //  has to know.
  // ---------------------------------------------------------------
  function speed(p, twaDeg, twsKt) {
    if (!p || !p.ok) return null;
    var a = Math.abs(twaDeg);
    if (a > 180) a = 360 - a;             //  a polar is symmetric about the wind
    var sa = span(p.twa, a);
    if (!sa) return null;                 //  outside the angles: no data

    var clamped = false, w = twsKt;
    if (w > p.tws[p.tws.length - 1]) { w = p.tws[p.tws.length - 1]; clamped = true; }

    var lo = p.tws[0];
    if (w < lo) {
      //  The one honest extrapolation: towards zero speed at zero
      //  wind. Anything else below the table is invention.
      if (w < 0) return null;
      var at = speed(p, a, lo);
      if (!at) return null;
      return { kt: at.kt * (w / lo), clamped: false };
    }

    var sw = span(p.tws, w);
    if (!sw) return null;
    var v00 = p.v[sa.i][sw.i], v01 = p.v[sa.i][sw.i + 1];
    var v10 = p.v[sa.i + 1][sw.i], v11 = p.v[sa.i + 1][sw.i + 1];
    var top = v00 + (v01 - v00) * sw.f;
    var bot = v10 + (v11 - v10) * sw.f;
    return { kt: top + (bot - top) * sa.f, clamped: clamped };
  }

  // ---------------------------------------------------------------
  //  The optimum angle and its boat speed at this wind speed, from the
  //  file's own beat_ or run_ rows: { angle, kt, clamped } or null when
  //  the file does not carry them.
  //
  //  The file gives VMG, the speed made good along the wind; the boat's
  //  speed through the water at that angle is VMG / |cos(angle)|.
  //  Between two wind speeds both the angle and the VMG are taken
  //  linearly, like the table. Below the lightest wind the angle is
  //  held and the speed runs to zero at zero wind, which is the same
  //  one honest extrapolation speed() makes; above the strongest it
  //  clamps, and says so.
  // ---------------------------------------------------------------
  function optimum(p, which, twsKt) {
    var A = p[which + '_angle'], V = p[which + '_vmg'];
    if (!A || !V || twsKt < 0) return null;
    var w = twsKt, clamped = false, scale = 1;
    var top = p.tws[p.tws.length - 1], lo = p.tws[0];
    if (w > top) { w = top; clamped = true; }
    if (w < lo) { scale = w / lo; w = lo; }
    var sw = span(p.tws, w);
    if (!sw) return null;
    var hi = Math.min(sw.i + 1, p.tws.length - 1);
    var ang = A[sw.i] + (A[hi] - A[sw.i]) * sw.f;
    var vmg = V[sw.i] + (V[hi] - V[sw.i]) * sw.f;
    var c = Math.abs(Math.cos(ang * Math.PI / 180));
    if (c < 1e-9) return null;
    return { angle: ang, kt: scale * vmg / c, clamped: clamped };
  }

  // ---------------------------------------------------------------
  //  sail(p, twa, tws) -> { kt, clamped, from } or null
  //
  //  THE BOAT'S SPEED ON EVERY POINT OF SAIL THE FILE CAN ANSWER FOR,
  //  which is more than the table alone. A table that starts at 52
  //  degrees says nothing about 45, and speed() rightly returns null
  //  there -- but a boat that cannot sail closer than 52 cannot beat,
  //  and the file knows better: its beat_angle and beat_vmg rows say
  //  where the best upwind angle is and what it makes good.
  //
  //  So, at this wind speed:
  //
  //      closer to the wind than the beat angle     null. Pinching is
  //                                                 not in the file.
  //      from the beat angle to the table's edge    a straight line
  //                                                 between the two
  //                                                 speeds the file
  //                                                 does give
  //      inside the table                           speed(), unchanged
  //      from the table's edge to the run angle     a straight line,
  //                                                 as upwind
  //      deeper than the run angle                  null. The boat
  //                                                 gybes downwind;
  //                                                 the file says so.
  //
  //  `from` says which of those answered -- 'table', 'beat' or 'run' --
  //  so a route can report how much of it was sailed on the optimum
  //  rows rather than on measured table entries.
  //
  //  NOTHING IS INVENTED: every speed returned lies between two numbers
  //  that are in the file. Where the optimum rows are absent this is
  //  speed() and nothing more.
  // ---------------------------------------------------------------
  function sail(p, twaDeg, twsKt) {
    if (!p || !p.ok) return null;
    var a = Math.abs(twaDeg);
    if (a > 180) a = 360 - a;
    var first = p.twa[0], last = p.twa[p.twa.length - 1], o, e;

    if (a >= first && a <= last) {
      var t = speed(p, a, twsKt);
      return t ? { kt: t.kt, clamped: t.clamped, from: 'table' } : null;
    }
    if (a < first) {
      o = optimum(p, 'beat', twsKt);
      if (!o || a < o.angle - 1e-9 || o.angle >= first) return null;
      e = speed(p, first, twsKt);
      if (!e) return null;
      return { kt: o.kt + (e.kt - o.kt) * (a - o.angle) / (first - o.angle),
               clamped: o.clamped || e.clamped, from: 'beat' };
    }
    o = optimum(p, 'run', twsKt);
    if (!o || a > o.angle + 1e-9 || o.angle <= last) return null;
    e = speed(p, last, twsKt);
    if (!e) return null;
    return { kt: e.kt + (o.kt - e.kt) * (a - last) / (o.angle - last),
             clamped: o.clamped || e.clamped, from: 'run' };
  }

  return { parse: parse, speed: speed, span: span, sail: sail, optimum: optimum };
})();

if (typeof module !== 'undefined') module.exports = POLAR;

// =====================================================================
//  The router: the vector step, and moving a boat over one time step.
//
//  THE FIRST PIECE, AND DELIBERATELY THE SMALLEST. An isochrone router
//  produces a plausible-looking track from almost any arithmetic, which
//  makes it one of the hardest kinds of program to tell is wrong. So it
//  is built from the bottom, and each layer is verified while it is
//  still small enough to check on paper:
//
//      1. vec()       the vector step, and the position after it
//      2. polar.js    the polar lookup, interpolated in TWA and TWS
//      3. step()      one time step from the grids and the polar,
//                     against an answer worked by hand
//      4. next        isochrones, which by then is bookkeeping over
//                     parts that are already known good
//
//  EVERYTHING ABOVE INHERITS THE SIGN CONVENTIONS SET HERE, so a
//  mistake in this file is a mistake in every route for ever. They are
//  stated once:
//
//      bearings      degrees true, 0 <= b < 360, clockwise from north
//      speeds        knots
//      set           the direction the current flows TOWARDS
//      drift         the current's rate, knots
//      heading       the direction the boat points, through the water
//      stw           speed through the water
//      cog, sog      the resulting track and speed over the ground
//
//  "Set is where it goes, not where it comes from" is the one that
//  catches people: wind is named for where it comes FROM and current
//  for where it goes TO, and the two live three lines apart in a
//  router.
//
//  Contract for the grids this feeds on: docs/web/route/GRID.md.
// =====================================================================
'use strict';

var ROUTE = (function () {

  var RAD = Math.PI / 180;

  //  Below this, a speed is floating-point residue and not motion.
  var STILL = 1e-9;

  function norm360(b) {
    b = b % 360;
    return b < 0 ? b + 360 : b;
  }

  //  A bearing and a speed as north/east components. Note the order:
  //  north is cos and east is sin, because a bearing is measured from
  //  north, clockwise. Writing it the other way round is the single
  //  most common error in this arithmetic and it looks right.
  function comp(brg, spd) {
    var r = brg * RAD;
    return { n: spd * Math.cos(r), e: spd * Math.sin(r) };
  }

  function from(n, e) {
    return { brg: norm360(Math.atan2(e, n) / RAD), spd: Math.sqrt(n * n + e * e) };
  }

  // ---------------------------------------------------------------
  //  vec(heading, stw, set, drift) -> { cog, sog, n, e }
  //
  //  The boat's vector through the water, plus the water's vector over
  //  the ground. That is the whole of it, and everything the router
  //  does rests on these four lines being right.
  //
  //  n and e are returned as well as cog and sog so that a caller --
  //  and the suite -- can check the two against each other without
  //  recomputing the trigonometry the same way and agreeing with
  //  itself.
  // ---------------------------------------------------------------
  function vec(heading, stw, set, drift) {
    var b = comp(norm360(heading), stw);
    var c = comp(norm360(set), drift || 0);
    var n = b.n + c.n, e = b.e + c.e;
    var r = from(n, e);
    //  A boat held exactly by the stream has no track, and must not be
    //  given one. This is a real situation -- five knots into five
    //  knots of foul tide, which is a thing that happens in the Race
    //  of Alderney on most days -- not a contrived edge case.
    //
    //  THE TEST IS A TOLERANCE, NOT `=== 0`, and the first version
    //  used `=== 0` and was wrong. Five knots on 090 against five on
    //  270 cancels the east component exactly, but cos(90 degrees) is
    //  6.1e-17 rather than zero, so the north components left a
    //  residue of about 6e-16 knots. atan2 is perfectly happy to
    //  resolve that into a bearing, and the function returned a
    //  confident course of 180 for a boat that was not moving. A
    //  router would have plotted it.
    //
    //  Anything below a billionth of a knot is not a speed.
    if (r.spd < STILL) return { cog: null, sog: 0, n: 0, e: 0 };
    return { cog: r.brg, sog: r.spd, n: n, e: e };
  }

  // ---------------------------------------------------------------
  //  advance(lat, lon, cog, sog, minutes) -> { lat, lon }
  //
  //  Plane sailing, and it says so. Over ten minutes at ten knots the
  //  error against a great circle is far below the grid's own
  //  resolution; over a leg it would not be, which is why the router
  //  steps rather than jumps.
  //
  //  The departure correction uses the MIDDLE latitude of the step,
  //  not the starting one: at 50 degrees over ten minutes the
  //  difference is tiny, and at 70 degrees over an hour it is not. It
  //  costs one extra line.
  // ---------------------------------------------------------------
  function advance(lat, lon, cog, sog, minutes) {
    if (cog === null || !sog) return { lat: lat, lon: lon };
    var dist = sog * (minutes / 60);              //  nautical miles
    var c = comp(norm360(cog), dist);
    var dlat = c.n / 60;                          //  1 nm of latitude = 1 minute
    var mid = (lat + (lat + dlat)) / 2;
    var cosm = Math.cos(mid * RAD);
    //  At the pole a departure has no meaning: east and west are the
    //  same place. Refuse rather than divide by something near zero
    //  and return a longitude of several thousand degrees.
    if (Math.abs(cosm) < 1e-9) return { lat: lat + dlat, lon: lon, atPole: true };
    var dlon = (c.e / 60) / cosm;
    return { lat: lat + dlat, lon: lon + dlon };
  }

  // ---------------------------------------------------------------
  //  consistent(v, heading, stw, set, drift) -> true | a sentence
  //
  //  THE CHECK THAT NEEDS NO ORACLE. A route's reported cog and sog
  //  must equal the boat's vector plus the current's, at every step.
  //  It catches sign errors, unit mixups and a stale current lookup --
  //  which between them are most of what goes wrong in this kind of
  //  code -- without anyone having to know what the right answer was.
  //
  //  It is exported because the router will run it over every row of
  //  every route in the tests, not only here.
  // ---------------------------------------------------------------
  function consistent(v, heading, stw, set, drift, tol) {
    tol = tol || 1e-9;
    var b = comp(norm360(heading), stw);
    var c = comp(norm360(set), drift || 0);
    var wn = b.n + c.n, we = b.e + c.e;
    if (Math.abs(v.n - wn) > tol || Math.abs(v.e - we) > tol) {
      return 'the components do not add up';
    }
    var r = from(wn, we);
    if (Math.abs(v.sog - r.spd) > tol) return 'sog is not the length of the sum';
    if (v.cog === null) return r.spd <= tol ? true : 'cog is missing but there is a track';
    var d = Math.abs(norm360(v.cog - r.brg));
    if (d > 180) d = 360 - d;
    if (d > tol * 1e3) return 'cog is not the direction of the sum';
    return true;
  }

  // =================================================================
  //  THE THIRD PIECE: ONE STEP, FROM THE GRIDS AND THE POLAR.
  //
  //  Everything above takes its wind and its stream as numbers. This
  //  is where they come from: the wind and current grids are sampled
  //  at a place and a time, the polar is asked for the boat's speed,
  //  and the vector step moves her. It is kept to ONE step on purpose,
  //  so that a whole step can be checked against an answer worked by
  //  hand before a thousand of them are chained into a route.
  // =================================================================

  var P = (typeof POLAR !== 'undefined') ? POLAR
        : (typeof require !== 'undefined' ? require('./polar.js') : null);

  //  A grid's times as milliseconds, worked out once and kept on it.
  //  Date.UTC from the digits rather than Date.parse of the string:
  //  the format has no seconds, and not every engine reads that.
  function timesOf(g) {
    if (!g._ms) {
      g._ms = g.meta.times.map(function (t) {
        return Date.UTC(+t.substr(0, 4), +t.substr(5, 2) - 1, +t.substr(8, 2),
                        +t.substr(11, 2), +t.substr(14, 2));
      });
    }
    return g._ms;
  }

  // ---------------------------------------------------------------
  //  sample(grid, lat, lon, ms) -> { field: value, ... } or null
  //
  //  The grid reader refuses to interpolate, and says that sampling
  //  between cells is the router's job. This is that job: straight
  //  lines between the four surrounding nodes, then a straight line
  //  between the two surrounding times.
  //
  //  null MEANS THE GRID DOES NOT COVER THIS PLACE OR THIS TIME. It is
  //  not zero and is never turned into zero here; what to do about it
  //  is the caller's decision, and step() below makes it differently
  //  for the wind than for the stream.
  //
  //  A NODE WITH NO DATA IS LEFT OUT, NOT COUNTED AS NOTHING. A tidal
  //  atlas has dry nodes along every coast, and a boat close inshore
  //  sits between wet ones and dry ones. Averaging a missing node in as
  //  zero would halve the stream exactly where it runs hardest, off
  //  the headlands; so the weights of the nodes that have data are
  //  scaled up to add to one, and a field is null only when none of
  //  the four has it. The wet value is carried a little way toward the
  //  shore, which is what a navigator reading the atlas does too.
  // ---------------------------------------------------------------
  function sample(g, lat, lon, ms) {
    if (!g || !g.ok) return null;
    var m = g.meta;
    var fy = (lat - m.lat.from) / m.lat.step;
    var fx = (lon - m.lon.from) / m.lon.step;
    var E = 1e-9;
    if (fy < -E || fy > m.lat.n - 1 + E || fx < -E || fx > m.lon.n - 1 + E) return null;
    var y0 = Math.min(Math.max(Math.floor(fy), 0), m.lat.n - 2);
    var x0 = Math.min(Math.max(Math.floor(fx), 0), m.lon.n - 2);
    if (m.lat.n < 2 || m.lon.n < 2) return null;
    var wy = Math.min(Math.max(fy - y0, 0), 1), wx = Math.min(Math.max(fx - x0, 0), 1);

    function slice(ti) {
      var c = [g.at(ti, y0, x0), g.at(ti, y0, x0 + 1), g.at(ti, y0 + 1, x0), g.at(ti, y0 + 1, x0 + 1)];
      var w = [(1 - wy) * (1 - wx), (1 - wy) * wx, wy * (1 - wx), wy * wx];
      var o = {}, k, f, i, sum, wsum;
      for (k = 0; k < m.fields.length; k++) {
        f = m.fields[k]; sum = 0; wsum = 0;
        for (i = 0; i < 4; i++) {
          if (c[i] && c[i][f] !== null && c[i][f] !== undefined) { sum += w[i] * c[i][f]; wsum += w[i]; }
        }
        o[f] = wsum > 1e-12 ? sum / wsum : null;
      }
      return o;
    }

    if (m.timeless) return slice(0);
    var T = timesOf(g), i;
    if (ms < T[0] || ms > T[T.length - 1]) return null;
    if (T.length === 1) return slice(0);
    for (i = 0; i < T.length - 2 && ms > T[i + 1]; i++) { /* find the bracket */ }
    var a = slice(i), b = slice(i + 1), ft = (ms - T[i]) / (T[i + 1] - T[i]), out = {}, k2, f2;
    for (k2 = 0; k2 < m.fields.length; k2++) {
      f2 = m.fields[k2];
      out[f2] = (a[f2] === null || b[f2] === null) ? null : a[f2] + (b[f2] - a[f2]) * ft;
    }
    return out;
  }

  //  u and v as a navigator names them. u is positive east and v
  //  positive north, the direction the air or the water is GOING -- so
  //  a current's set is that direction, and a wind is named for the
  //  opposite one, where it comes FROM.
  function windOf(u, v) {
    var r = from(-v, -u);
    return { from: r.spd < STILL ? null : r.brg, kt: r.spd };
  }
  function streamOf(u, v) {
    var r = from(v, u);
    return { set: r.spd < STILL ? null : r.brg, drift: r.spd };
  }

  // ---------------------------------------------------------------
  //  step(o) -> one row of a route, or { ok: false, why }
  //
  //    o.lat, o.lon, o.ms     where and when the step begins
  //    o.heading, o.minutes   which way she points, and for how long
  //    o.wind, o.current      parsed grids; current may be absent
  //    o.polar                a parsed polar
  //    o.scale                { wind, current }, 1 when absent
  //
  //  THE BOAT SAILS IN THE WIND OVER THE WATER, NOT OVER THE GROUND.
  //  A polar is measured through the water, so the wind it is entered
  //  with has to be the wind the water feels: the ground wind less the
  //  stream. Twelve knots of westerly over two knots of east-going
  //  stream is ten knots to the boat; over two knots of west-going
  //  stream it is fourteen. That is why wind against tide is windier
  //  as well as rougher, and a router that enters the polar with the
  //  ground wind gets every tidal gate slightly wrong in the direction
  //  that flatters it. The row carries both, so a lesson can show the
  //  difference.
  //
  //  THE CONDITIONS ARE THOSE AT THE START OF THE STEP, held for the
  //  whole of it. Over ten minutes on a 6 km stream grid and a 3-hour
  //  wind grid that is well inside what the grids themselves know.
  //
  //  NO WIND DATA STOPS THE STEP; NO STREAM DATA DOES NOT. Without a
  //  wind there is nothing to sail in and the answer is "cannot say".
  //  Without a stream -- outside the atlas, or up a river it does not
  //  chart -- the boat still sails, the step is made through still
  //  water, and the row says `noStream` so that a route can report how
  //  much of it was sailed on no information rather than hide it.
  // ---------------------------------------------------------------
  //  step() is two halves, and the router calls them separately: the
  //  conditions at a place and time do not depend on which way the boat
  //  points, so they are read ONCE and then every heading in the fan is
  //  tried against them. Sampling two grids for each of seventy-odd
  //  headings would be the same answer seventy-odd times.
  function conditions(o) {
    var sc = o.scale || {}, sw = sc.wind === undefined ? 1 : sc.wind,
        scur = sc.current === undefined ? 1 : sc.current;
    var w = sample(o.wind, o.lat, o.lon, o.ms);
    if (!w || w.u === null || w.v === null) return { ok: false, why: 'there is no wind data here at this time' };
    var c = o.current ? sample(o.current, o.lat, o.lon, o.ms) : null;
    var noStream = !c || c.u === null || c.v === null;
    var wu = w.u * sw, wv = w.v * sw;
    var cu = noStream ? 0 : c.u * scur, cv = noStream ? 0 : c.v * scur;
    var ground = windOf(wu, wv);
    var water = windOf(wu - cu, wv - cv);
    var st = streamOf(cu, cv);
    if (water.from === null) return { ok: false, why: 'there is no wind over the water here' };
    return {
      ok: true, lat: o.lat, lon: o.lon, ms: o.ms,
      gwd: ground.from, gws: ground.kt,          //  the wind over the ground
      twd: water.from, tws: water.kt,            //  the wind over the water: the boat's wind
      set: st.set, drift: st.drift, noStream: noStream
    };
  }

  function sailFrom(c, polar, heading, minutes) {
    //  The angle from the wind to the bow, clockwise positive. Wind
    //  from the north and the bow pointing east is +90, and the wind is
    //  then on the PORT side: positive is port tack.
    var hd = norm360(heading);
    var twa = norm360(hd - c.twd + 180) - 180;
    var bs = P.sail(polar, Math.abs(twa), c.tws);
    if (!bs) return { ok: false, why: 'the polar does not answer for ' + Math.abs(twa).toFixed(0) + ' degrees off the wind' };
    var v = vec(hd, bs.kt, c.set === null ? 0 : c.set, c.drift);
    var to = advance(c.lat, c.lon, v.cog, v.sog, minutes);
    return {
      ok: true,
      lat: c.lat, lon: c.lon, ms: c.ms, minutes: minutes, heading: hd,
      gwd: c.gwd, gws: c.gws, twd: c.twd, tws: c.tws,
      twa: Math.abs(twa), tack: twa >= 0 ? 'port' : 'starboard',
      stw: bs.kt, polar: bs.from, clamped: bs.clamped,
      set: c.set, drift: c.drift, noStream: c.noStream,
      cog: v.cog, sog: v.sog, n: v.n, e: v.e,
      lat2: to.lat, lon2: to.lon
    };
  }

  function step(o) {
    var c = conditions(o);
    if (!c.ok) return c;
    return sailFrom(c, o.polar, o.heading, o.minutes);
  }

  return {
    vec: vec, advance: advance, consistent: consistent,
    norm360: norm360, comp: comp, from: from,
    sample: sample, windOf: windOf, streamOf: streamOf, step: step,
    conditions: conditions, sailFrom: sailFrom
  };
})();

if (typeof module !== 'undefined') module.exports = ROUTE;

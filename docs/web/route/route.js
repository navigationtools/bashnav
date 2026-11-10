// =====================================================================
//  The router: the vector step, and moving a boat over one time step.
//
//  THE FIRST PIECE, AND DELIBERATELY THE SMALLEST. An isochrone router
//  produces a plausible-looking track from almost any arithmetic, which
//  makes it one of the hardest kinds of program to tell is wrong. So it
//  is built from the bottom, and each layer is verified while it is
//  still small enough to check on paper:
//
//      1. this file   the vector step, and the position after it
//      2. next        the polar lookup, interpolated in TWA and TWS
//      3. then        one leg, one time step, against a worked answer
//      4. last        isochrones, which by then is bookkeeping over
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

  return {
    vec: vec, advance: advance, consistent: consistent,
    norm360: norm360, comp: comp, from: from
  };
})();

if (typeof module !== 'undefined') module.exports = ROUTE;

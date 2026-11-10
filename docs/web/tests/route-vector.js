//  The vector step, and the position after it.
//
//  This is the bottom of the router and everything above it inherits
//  its sign conventions, so it is checked three ways:
//
//    1. against answers worked by hand, where the triangle is one
//       anybody can draw;
//    2. against an INVARIANT over a few thousand generated cases --
//       the reported track must be the boat's vector plus the water's
//       -- which needs no oracle and catches sign errors, unit mixups
//       and a stale current without anyone knowing the right answer;
//    3. for determinism, because an isochrone router that drifts
//       between runs is one nobody can debug.
//
//    node docs/web/tests/route-vector.js
'use strict';
var R = require('../route/route.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol || 1e-9); }

//  ---- 1. triangles anybody can draw ------------------------------

//  Four knots north, three knots of current setting east: the 3-4-5
//  triangle, so five over the ground on 036.87.
var v = R.vec(0, 4, 90, 3);
ok('the 3-4-5 triangle gives 5 knots', near(v.sog, 5), 'got ' + v.sog);
ok('and a track of 036.87', near(v.cog, 36.8698976458, 1e-8), 'got ' + v.cog);

//  No current at all: the track is the heading and the speed is the
//  speed. If this is ever wrong nothing else matters.
var still = R.vec(217, 6.4, 0, 0);
ok('with no current the track is the heading', near(still.cog, 217, 1e-9), 'got ' + still.cog);
ok('and the speed is the speed', near(still.sog, 6.4), 'got ' + still.sog);

//  Current dead astern and dead ahead: arithmetic, not trigonometry.
var push = R.vec(90, 5, 90, 2);
ok('a fair current adds', near(push.sog, 7) && near(push.cog, 90), push.cog + ' ' + push.sog);
var foul = R.vec(90, 5, 270, 2);
ok('a foul current subtracts', near(foul.sog, 3) && near(foul.cog, 90), foul.cog + ' ' + foul.sog);

//  Exactly held: five knots into five knots of stream.
var held = R.vec(90, 5, 270, 5);
ok('held exactly, the speed over the ground is nothing', near(held.sog, 0), 'got ' + held.sog);
ok('and there is NO course, rather than 000', held.cog === null,
   'got ' + held.cog + ' -- a number here would be plotted');

//  Swept back: the stream beats the boat.
var back = R.vec(90, 2, 270, 5);
ok('swept backwards, the track reverses', near(back.cog, 270) && near(back.sog, 3),
   back.cog + ' ' + back.sog);

//  ---- 2. the invariant, over a few thousand cases ----------------
//
//  Every heading at 5 degrees, every set at 15, a handful of speeds.
//  The reported track must BE the sum of the two vectors. No answer is
//  known in advance and none needs to be.
var bad = 0, worst = '', hdg, set, s, d, r, c;
for (hdg = 0; hdg < 360; hdg += 5) {
  for (set = 0; set < 360; set += 15) {
    for (s = 0; s <= 12; s += 4) {
      for (d = 0; d <= 3; d += 1.5) {
        r = R.vec(hdg, s, set, d);
        c = R.consistent(r, hdg, s, set, d);
        if (c !== true) { bad++; if (!worst) worst = hdg + '/' + s + ' in ' + set + '/' + d + ': ' + c; }
      }
    }
  }
}
ok('the track is the sum of the vectors, in every case tried', bad === 0,
   bad + ' of ' + (72 * 24 * 4 * 3) + ' wrong; first: ' + worst);

//  And the check itself must be able to fail, or it is decoration.
var lie = R.vec(0, 4, 90, 3);
lie.cog = 40;
ok('the consistency check catches a wrong course',
   R.consistent(lie, 0, 4, 90, 3) !== true);
var lie2 = R.vec(0, 4, 90, 3); lie2.sog = 5.5;
ok('and a wrong speed', R.consistent(lie2, 0, 4, 90, 3) !== true);

//  ---- 3. moving the boat -----------------------------------------

//  Sixty miles due north is one degree of latitude, everywhere.
var p = R.advance(50, -5, 0, 6, 600);
ok('sixty miles north is one degree of latitude', near(p.lat, 51, 1e-9) && near(p.lon, -5, 1e-9),
   p.lat + ' ' + p.lon);

//  Sixty miles due east at 60 N is two degrees of longitude, because
//  the cosine of 60 is a half. A departure that ignored latitude would
//  give one, and would put a boat a hundred miles out by the Channel.
var q = R.advance(60, 0, 90, 6, 600);
ok('sixty miles east at 60 N is two degrees of longitude', near(q.lon, 2, 1e-9), 'got ' + q.lon);
ok('and the latitude does not move', near(q.lat, 60, 1e-12), 'got ' + q.lat);

//  The departure uses the MIDDLE latitude of the step, not the start.
//  North-east at 70 N for an hour: the two differ by enough to see.
var ne = R.advance(70, 0, 45, 10, 60);
var dlat = 10 * Math.cos(45 * Math.PI / 180) / 60;
var mid = 70 + dlat / 2;
var wantLon = (10 * Math.sin(45 * Math.PI / 180) / 60) / Math.cos(mid * Math.PI / 180);
ok('the departure is taken at the middle latitude of the step',
   near(ne.lon, wantLon, 1e-12),
   'got ' + ne.lon + ', middle-latitude answer ' + wantLon);

//  Out and back returns to the start.
var a1 = R.advance(49.5, -3.2, 123, 7.4, 37);
var a2 = R.advance(a1.lat, a1.lon, 303, 7.4, 37);
ok('out and back comes home', near(a2.lat, 49.5, 1e-9) && near(a2.lon, -3.2, 1e-6),
   a2.lat + ' ' + a2.lon);

//  Standing still goes nowhere, and no course goes nowhere.
var z = R.advance(49, -3, 90, 0, 60);
ok('no speed, no movement', z.lat === 49 && z.lon === -3);
var z2 = R.advance(49, -3, null, 5, 60);
ok('no course, no movement', z2.lat === 49 && z2.lon === -3);

//  At the pole a departure has no meaning.
var pole = R.advance(89.999999999, 0, 90, 10, 60);
ok('at the pole it refuses to invent a longitude', pole.atPole === true || near(pole.lon, 0, 1),
   JSON.stringify(pole));

//  ---- 4. bearings come back in range -----------------------------
ok('a bearing of 360 is 0', R.norm360(360) === 0);
ok('a negative bearing wraps', near(R.norm360(-90), 270));
ok('a bearing over the top wraps', near(R.norm360(450), 90));
var wrap = R.vec(-45, 5, 0, 0);
ok('a negative heading is taken as a bearing', near(wrap.cog, 315, 1e-9), 'got ' + wrap.cog);

//  ---- 5. determinism ---------------------------------------------
var one = JSON.stringify(R.vec(37, 6.2, 115, 1.7)) + JSON.stringify(R.advance(49.1, -2.3, 37, 6.2, 11));
var two = JSON.stringify(R.vec(37, 6.2, 115, 1.7)) + JSON.stringify(R.advance(49.1, -2.3, 37, 6.2, 11));
ok('the same inputs give byte-identical output', one === two);

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

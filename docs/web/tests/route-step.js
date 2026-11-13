//  One step of the router: sampled from the grids, sped by the polar,
//  moved by the vector step -- against answers worked by hand.
//
//  An isochrone router draws a plausible track from almost any
//  arithmetic, so the only place a wrong step can be SEEN is here,
//  where there is one of them and the right answer fits on a line.
//  Every expected number below is derived in the comment beside it;
//  none was produced by running the code and copying what it said.
//
//  The grids are built as GRID text and read by the real reader, and
//  the polar is a toy with round numbers: 10 knots of boat speed at 90
//  degrees in 10 knots of wind.
//
//    node docs/web/tests/route-step.js
'use strict';
var GRID = require('../route/grid.js');
var POLAR = require('../route/polar.js');
var ROUTE = require('../route/route.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function near(a, b, tol) { return a !== null && a !== undefined && Math.abs(a - b) <= (tol || 1e-9); }

//  A 2 x 2 x (times) grid over one degree, each node given explicitly:
//  nodes[t] = [ [u,v] at (lat0,lon0), (lat0,lon1), (lat1,lon0), (lat1,lon1) ]
function grid(kind, times, nodes) {
  var L = ['GRID 1', 'kind ' + kind, 'units kt', 'u east', 'v north',
           'lat 50.0 51.0 1.0', 'lon -2.0 -1.0 1.0', 'times ' + times.join(' '),
           'fields u v', 'order time lat lon', 'rows ' + (times.length * 4)];
  nodes.forEach(function (t) { t.forEach(function (n) { L.push(n[0] + ' ' + n[1]); }); });
  var g = GRID.parse(L.join('\n') + '\n');
  if (!g.ok) throw new Error('the test built a bad grid: ' + g.err);
  return g;
}
function uniform(kind, u, v) {
  var n = [[u, v], [u, v], [u, v], [u, v]];
  return grid(kind, ['2025-05-24T00:00Z', '2025-05-24T12:00Z'], [n, n]);
}
var T0 = Date.UTC(2025, 4, 24, 0, 0), HOUR = 3600000;

var polar = POLAR.parse([
  'twa/tws\t5\t10\t20',
  '50\t4\t6\t8',
  '90\t6\t10\t14',
  '150\t2\t4\t10',
  '#  beat_angle\t40\t38\t36',
  '#  beat_vmg\t3\t4.5\t6'
].join('\n') + '\n');

//  ---- 1. sampling: straight lines between nodes and between times --
(function () {
  //  u is 0, 10, 20, 30 at the four corners: the centre is their mean.
  var g = grid('wind', ['2025-05-24T00:00Z', '2025-05-24T12:00Z'],
    [[[0, 1], [10, 1], [20, 1], [30, 1]], [[0, 1], [10, 1], [20, 1], [30, 1]]]);
  var c = ROUTE.sample(g, 50.5, -1.5, T0);
  ok('the centre of a cell is the mean of its corners', c && near(c.u, 15), JSON.stringify(c));
  //  a quarter of the way along the bottom edge, from 0 toward 10
  ok('along an edge it is a straight line between two nodes',
     near(ROUTE.sample(g, 50.0, -1.75, T0).u, 2.5));
  ok('on a node it is the node', near(ROUTE.sample(g, 51.0, -1.0, T0).u, 30));

  //  u is 0 everywhere at 00Z and 10 everywhere at 12Z
  var a = [[0, 0], [0, 0], [0, 0], [0, 0]], b = [[10, 0], [10, 0], [10, 0], [10, 0]];
  var t = grid('wind', ['2025-05-24T00:00Z', '2025-05-24T12:00Z'], [a, b]);
  ok('a quarter of the way between two times it is a quarter of the change',
     near(ROUTE.sample(t, 50.5, -1.5, T0 + 3 * HOUR).u, 2.5));

  ok('outside the grid there is no answer, to the south', ROUTE.sample(g, 49.9, -1.5, T0) === null);
  ok('nor to the east', ROUTE.sample(g, 50.5, -0.9, T0) === null);
  ok('nor before its first time', ROUTE.sample(g, 50.5, -1.5, T0 - HOUR) === null);
  ok('nor after its last', ROUTE.sample(g, 50.5, -1.5, T0 + 13 * HOUR) === null);
})();

//  ---- 2. a node with no data is left out, not counted as nothing ---
(function () {
  //  three corners run at 10 and the fourth is dry
  var n = [[10, 0], ['-', '-'], [10, 0], [10, 0]];
  var g = grid('current', ['2025-05-24T00:00Z', '2025-05-24T12:00Z'], [n, n]);
  var c = ROUTE.sample(g, 50.5, -1.5, T0);
  ok('beside a dry node the stream is the wet nodes\' stream, not three quarters of it',
     c && near(c.u, 10), JSON.stringify(c));
  var d = [['-', '-'], ['-', '-'], ['-', '-'], ['-', '-']];
  var dry = grid('current', ['2025-05-24T00:00Z', '2025-05-24T12:00Z'], [d, d]);
  var s = ROUTE.sample(dry, 50.5, -1.5, T0);
  ok('with no wet node at all there is no value, and it is not zero',
     s && s.u === null && s.v === null, JSON.stringify(s));
})();

//  ---- 3. u and v, named the way a navigator names them -------------
(function () {
  //  air moving east at 12 knots is a WESTERLY: it comes from 270
  var w = ROUTE.windOf(12, 0);
  ok('air going east is a wind FROM the west', near(w.from, 270) && near(w.kt, 12), JSON.stringify(w));
  //  water moving south at 2 knots SETS south
  var s = ROUTE.streamOf(0, -2);
  ok('water going south is a stream setting south', near(s.set, 180) && near(s.drift, 2), JSON.stringify(s));
  ok('still air has no direction', ROUTE.windOf(0, 0).from === null);
})();

//  ---- 4. one step in still water -----------------------------------
//  A 10-knot westerly. The boat points north, so the wind is on her
//  beam at 90 degrees and on her PORT side. The polar gives 10 knots.
//  Ten minutes at 10 knots is 10/6 = 1.6667 miles north, which is
//  1.6667 / 60 = 0.0277778 degrees of latitude and no longitude.
var W10 = uniform('wind', 10, 0);
(function () {
  var r = ROUTE.step({ lat: 50.5, lon: -1.5, ms: T0, heading: 0, minutes: 10, wind: W10, polar: polar });
  ok('a step is made', r.ok, r.why);
  if (!r.ok) return;
  ok('the wind is on the beam, 90 degrees', near(r.twa, 90));
  ok('and on the port side', r.tack === 'port', r.tack);
  ok('the polar gives 10 knots', near(r.stw, 10) && r.polar === 'table');
  ok('with no stream she makes good what she sails', near(r.cog, 0) && near(r.sog, 10));
  ok('ten minutes north at 10 knots is 0.0277778 degrees of latitude',
     near(r.lat2, 50.5 + 10 / 6 / 60, 1e-12) && near(r.lon2, -1.5, 1e-12), r.lat2 + ' ' + r.lon2);
  ok('the row says there was no stream data, since no atlas was given', r.noStream === true);
  ok('and it passes the check that needs no oracle',
     ROUTE.consistent(r, r.heading, r.stw, r.set === null ? 0 : r.set, r.drift) === true);

  var s = ROUTE.step({ lat: 50.5, lon: -1.5, ms: T0, heading: 180, minutes: 10, wind: W10, polar: polar });
  ok('pointing south in the same wind she is on starboard', s.ok && s.tack === 'starboard', s.tack);
})();

//  ---- 5. the boat sails in the wind over the water -----------------
//  Twelve knots of westerly, and a stream setting east at 2. The air
//  moves east at 12 and the water under it east at 2, so the water
//  feels 10: THE BOAT'S WIND IS 10 KNOTS, not 12. Pointing north she
//  does 10 through the water, and the stream carries her 2 east:
//      sog = sqrt(10^2 + 2^2) = 10.19804
//      cog = atan(2 / 10)     = 11.30993 degrees
(function () {
  var r = ROUTE.step({ lat: 50.5, lon: -1.5, ms: T0, heading: 0, minutes: 10,
                       wind: uniform('wind', 12, 0), current: uniform('current', 2, 0), polar: polar });
  ok('a step is made in a stream', r.ok, r.why);
  if (!r.ok) return;
  ok('the wind over the ground is 12 knots', near(r.gws, 12) && near(r.gwd, 270));
  ok('the wind over the water, which is the boat\'s, is 10', near(r.tws, 10) && near(r.twd, 270));
  ok('so the polar is entered at 10 knots and gives 10', near(r.stw, 10));
  ok('the stream sets east at 2', near(r.set, 90) && near(r.drift, 2) && r.noStream === false);
  ok('she makes good 10.19804 knots', near(r.sog, Math.sqrt(104), 1e-12), '' + r.sog);
  ok('on 011.31', near(r.cog, Math.atan2(2, 10) * 180 / Math.PI, 1e-9), '' + r.cog);
  ok('and the row is consistent', ROUTE.consistent(r, r.heading, r.stw, r.set, r.drift) === true);

  //  Wind against tide: 8 knots of westerly over a stream setting WEST
  //  at 2 is 8 + 2 = 10 knots to the boat.
  var a = ROUTE.step({ lat: 50.5, lon: -1.5, ms: T0, heading: 0, minutes: 10,
                       wind: uniform('wind', 8, 0), current: uniform('current', -2, 0), polar: polar });
  ok('wind against tide is more wind: 8 over the ground is 10 over the water',
     a.ok && near(a.tws, 10) && near(a.stw, 10), JSON.stringify([a.tws, a.stw]));
})();

//  ---- 6. the run's scales ------------------------------------------
(function () {
  var base = { lat: 50.5, lon: -1.5, ms: T0, heading: 0, minutes: 10,
               wind: uniform('wind', 12, 0), current: uniform('current', 2, 0), polar: polar };
  //  half the stream: the water moves east at 1, so the boat's wind is 11
  var h = ROUTE.step(Object.assign({}, base, { scale: { wind: 1, current: 0.5 } }));
  ok('"current 0.5" halves the stream', h.ok && near(h.drift, 1));
  ok('and the boat\'s wind follows it, because the two are not separate', near(h.tws, 11));
  //  half the wind: 6 over the ground, less 2 of stream, is 4 to the boat
  var w = ROUTE.step(Object.assign({}, base, { scale: { wind: 0.5, current: 1 } }));
  ok('"wind 0.5" halves the wind over the ground', w.ok && near(w.gws, 6) && near(w.tws, 4));
})();

//  ---- 7. what stops a step, and what does not ----------------------
(function () {
  //  20 degrees off a 10-knot wind: closer than the 38-degree beat angle
  var pinch = ROUTE.step({ lat: 50.5, lon: -1.5, ms: T0, heading: 290, minutes: 10, wind: W10, polar: polar });
  ok('pinching above the beat angle is refused, with the reason',
     !pinch.ok && /polar does not answer/.test(pinch.why), pinch.why);
  //  40 degrees off: between the beat angle (38) and the table (50)
  var beat = ROUTE.step({ lat: 50.5, lon: -1.5, ms: T0, heading: 310, minutes: 10, wind: W10, polar: polar });
  ok('beating inside the optimum rows is answered from them', beat.ok && beat.polar === 'beat', beat.why);

  var off = ROUTE.step({ lat: 49.0, lon: -1.5, ms: T0, heading: 0, minutes: 10, wind: W10, polar: polar });
  ok('off the wind grid there is no step', !off.ok && /no wind data/.test(off.why), off.why);

  var d = [['-', '-'], ['-', '-'], ['-', '-'], ['-', '-']];
  var dry = grid('current', ['2025-05-24T00:00Z', '2025-05-24T12:00Z'], [d, d]);
  var ns = ROUTE.step({ lat: 50.5, lon: -1.5, ms: T0, heading: 0, minutes: 10, wind: W10, current: dry, polar: polar });
  ok('off the atlas she still sails, through still water, and the row says so',
     ns.ok && ns.noStream === true && near(ns.sog, 10) && near(ns.drift, 0), JSON.stringify(ns.noStream));
})();

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

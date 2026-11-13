//  The router, whole: courses small enough to sail in your head.
//
//  A route cannot be checked the way a step can -- there is no line of
//  arithmetic that says where a boat should tack.  What CAN be worked
//  out by hand is how long the fastest passage takes when the wind and
//  the stream are the same everywhere, because then the answer is one
//  triangle: twenty miles on a beam reach at ten knots is two hours,
//  and a dead beat is the distance over the best speed made good.  So
//  every course here is laid on the equator, where a mile is a minute
//  of arc both ways, in a wind and a stream that do not change, and the
//  router is held to the answer the triangle gives.
//
//  Then the rules, which need no arithmetic: a mark is left on the
//  hand the course says and no nearer than the berth; a line that must
//  not be crossed is not crossed; and a course that cannot be sailed is
//  refused with the reason.
//
//    node docs/web/tests/router.js
'use strict';
var GRID = require('../route/grid.js');
var POLAR = require('../route/polar.js');
var ROUTE = require('../route/route.js');
var COURSE = require('../route/course.js');
var ROUTER = require('../route/router.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function d(nm) { return (nm / 60).toFixed(6); }       //  miles to degrees, on the equator

//  The same wind and stream everywhere, for twelve hours.
function field(kind, u, v) {
  var L = ['GRID 1', 'kind ' + kind, 'units kt', 'u east', 'v north',
           'lat -1.0 1.0 1.0', 'lon -1.0 1.0 1.0', 'times 2025-05-24T00:00Z 2025-05-24T12:00Z',
           'fields u v', 'order time lat lon', 'rows 18'];
  for (var i = 0; i < 18; i++) L.push(u + ' ' + v);
  var g = GRID.parse(L.join('\n') + '\n');
  if (!g.ok) throw new Error(g.err);
  return g;
}
//  10 knots of boat speed on a beam reach in 10 knots of wind; beats at
//  38 degrees making 4.5 good.
var polar = POLAR.parse(['twa/tws\t5\t10\t20', '50\t4\t6\t8', '90\t6\t10\t14', '150\t2\t4\t10',
                         '#  beat_angle\t40\t38\t36', '#  beat_vmg\t3\t4.5\t6'].join('\n') + '\n');

function course(lines) {
  var c = COURSE.course(['COURSE 1', 'name A test course', 'source Invented for this test. Not a real course.']
    .concat(lines).concat(['end']).join('\n'));
  if (!c.ok) throw new Error('the test wrote a bad course: ' + c.err);
  return c;
}
function runFile(extra, layers) {
  var r = COURSE.run(['RUN 2', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current c.grid',
    'start at 2025-05-24T00:00Z', 'step time 600 heading 5', 'scale wind 1.0 current 1.0']
    .concat(layers || []).concat(['round 0.10']).concat(extra || []).concat(['end']).join('\n'));
  if (!r.ok) throw new Error('the test wrote a bad run: ' + r.err);
  return r;
}
//  Twenty miles due east: a short line at the start, a short one at the end.
var EAST = course(['start line ' + d(-0.1) + ' 0 to ' + d(0.1) + ' 0 cross east',
                   'start class All 2025-05-24T00:00Z',
                   'mark Far Buoy ' + d(0.1) + ' ' + d(20) + ' port',
                   'finish line ' + d(-0.1) + ' ' + d(20) + ' to ' + d(0.1) + ' ' + d(20) + ' cross east']);
var NORTHERLY = field('wind', 0, -10), STILL = field('current', 0, 0);

function sail(o) {
  return ROUTER.run({ course: o.course || EAST, run: o.run || runFile(), areas: o.areas || [],
                      wind: o.wind || NORTHERLY, current: o.current === undefined ? STILL : o.current,
                      polar: polar });
}

//  ---- every row must be a step the lower layers would own ----------
function sound(r) {
  var bad = 0, i;
  for (i = 0; i < r.rows.length; i++) {
    var w = r.rows[i];
    if (ROUTE.consistent(w, w.heading, w.stw, w.set === null ? 0 : w.set, w.drift) !== true) bad++;
    if (i) {
      var p = r.rows[i - 1];
      if (Math.abs(p.lat2 - w.lat) > 1e-9 || Math.abs(p.lon2 - w.lon) > 1e-9) bad++;
      if (Math.abs(p.ms + p.minutes * 60000 - w.ms) > 1) bad++;
    }
  }
  return bad;
}
//  how near the track passes a point, in miles (equator: a degree is 60)
function nearest(r, lat, lon) {
  var m = 1e9;
  r.rows.forEach(function (w) {
    m = Math.min(m, ROUTER.ptSeg(lon * 60, lat * 60, w.lon * 60, w.lat * 60, w.lon2 * 60, w.lat2 * 60));
  });
  return m;
}
//  how far round a point the track swings, in compass degrees: positive
//  is clockwise.  Leaving a mark to port is a swing of about -360 on an
//  out-and-back; to starboard, about +360.
function swing(r, lat, lon) {
  var tot = 0, last = null;
  function brg(la, lo) { return Math.atan2(lo - lon, la - lat) * 180 / Math.PI; }
  r.rows.forEach(function (w) {
    [[w.lat, w.lon], [w.lat2, w.lon2]].forEach(function (p) {
      var b = brg(p[0], p[1]);
      if (last !== null) { var dd = b - last; while (dd > 180) dd -= 360; while (dd < -180) dd += 360; tot += dd; }
      last = b;
    });
  });
  return tot;
}

//  ---- 1. a beam reach: twenty miles at ten knots is two hours ------
//  (She starts a few yards past the line, so 19.99 miles: 1.999 hours.)
var reach = sail({});
ok('a route is found', reach.ok, reach.why);
if (reach.ok) {
  ok('twenty miles on a beam reach at 10 knots takes two hours',
     reach.summary.hours > 1.99 && reach.summary.hours < 2.02, reach.summary.hours.toFixed(4) + ' h');
  ok('she sails it without a tack', reach.summary.tacks === 0, reach.summary.tacks + ' tacks');
  ok('every row is a step the lower layers would own, and they join end to end', sound(reach) === 0);
  ok('the last row is the finish', reach.rows[reach.rows.length - 1].event === 'finish');
  ok('the mark at the end of the finish line is rounded by finishing', reach.summary.pin === 'Far Buoy');
}

//  ---- 2. a dead beat: distance over the best speed made good -------
//  The wind is in the east.  The toy polar makes 4.5 knots good to
//  windward at 38 degrees, so 19.99 miles takes 19.99 / 4.5 = 4.442 h,
//  and nothing can do better than that.
var beat = sail({ wind: field('wind', -10, 0) });
ok('a dead beat is found', beat.ok, beat.why);
if (beat.ok) {
  ok('it takes the distance over the best VMG, and no less',
     beat.summary.hours > 4.44 && beat.summary.hours < 4.60, beat.summary.hours.toFixed(4) + ' h against 4.442');
  ok('she tacks to get there', beat.summary.tacks >= 1);
  ok('and never points higher than the polar says she can',
     beat.rows.every(function (w) { return w.twa >= 38 - 1e-6; }));
  ok('the rows are sound', sound(beat) === 0);
}

//  ---- 3. a stream on the beam: she has to steer up into it ---------
//  Northerly 10, and a stream setting south at 2.  The water feels 8
//  knots of wind.  To make good due east she must carry 2 knots of
//  northing, which the polar gives at a heading of 73.6 degrees:
//  7.089 knots through the water, of which 6.80 is easting.
//  19.99 / 6.80 = 2.94 hours, straight across.
//
//  BUT THE LINES HAVE WIDTH, and the first version of this check forgot
//  it.  Each is 0.2 miles long, so she may start at the north end and
//  finish at the south, letting the stream have 0.2 miles of her: then
//  she needs only 1.93 knots of northing, steers 74.3, and makes 6.88
//  good -- 19.99 / 6.88 = 2.906 hours.  The router found that and beat
//  the "right answer" in the comment above, which was the comment's
//  fault.  So the truth lies between the two, and nothing may beat
//  2.906.
var set = sail({ current: field('current', 0, -2) });
ok('a route is found across a stream', set.ok, set.why);
if (set.ok) {
  ok('it takes the time the triangle gives, and uses the width of the lines',
     set.summary.hours >= 2.906 && set.summary.hours < 2.94,
     set.summary.hours.toFixed(4) + ' h, between 2.906 and 2.94');
  ok('she is sailing in 8 knots of wind, not 10', Math.abs(set.rows[0].tws - 8) < 1e-9);
  ok('the rows are sound', sound(set) === 0);
}

//  ---- 4. rounding a mark: the hand, and the berth ------------------
//  Ten miles out to a buoy and back, in a northerly.  Left to PORT, she
//  passes south of it going out and north of it coming home.
function outAndBack(side, finLat) {
  return course(['start line ' + d(-0.1) + ' 0 to ' + d(0.1) + ' 0 cross east',
                 'start class All 2025-05-24T00:00Z',
                 'mark Out Buoy 0 ' + d(10) + ' ' + side,
                 'finish line ' + d(finLat - 0.1) + ' 0 to ' + d(finLat + 0.1) + ' 0 cross west']);
}
var portRound = sail({ course: outAndBack('port', 0.4) });
ok('an out-and-back is found, mark to port', portRound.ok, portRound.why);
if (portRound.ok) {
  ok('the track says which mark it rounded',
     portRound.summary.rounded.length === 1 && portRound.summary.rounded[0].mark === 'Out Buoy');
  var sw = swing(portRound, 0, 10 / 60);
  ok('she goes round it anticlockwise: the mark is left to port', sw < -300, sw.toFixed(0) + ' degrees');
  var nr = nearest(portRound, 0, 10 / 60);
  ok('and passes no nearer than the berth, 0.1 miles', nr >= 0.1 - 1e-6, nr.toFixed(4) + ' miles');
  ok('but no wider than she needs to', nr < 0.3, nr.toFixed(4) + ' miles');
  ok('twenty miles of reaching, and a short beat round the buoy',
     portRound.summary.hours > 2.0 && portRound.summary.hours < 2.4, portRound.summary.hours.toFixed(3) + ' h');
  ok('the rows are sound', sound(portRound) === 0);
}
var stbdRound = sail({ course: outAndBack('starboard', -0.4) });
ok('the same course, mark to starboard', stbdRound.ok, stbdRound.why);
if (stbdRound.ok) {
  var sw2 = swing(stbdRound, 0, 10 / 60);
  ok('she goes round it clockwise', sw2 > 300, sw2.toFixed(0) + ' degrees');
  ok('and keeps the berth', nearest(stbdRound, 0, 10 / 60) >= 0.1 - 1e-6);
}

//  ---- a finish line is crossed the way the course says -------------
//  The same twenty miles, but the line must be crossed heading WEST: she
//  has to go past the end of it and come back through.  Crossing it
//  eastward on the way would be quicker, and is not finishing.
var back = sail({ course: course(['start line ' + d(-0.1) + ' 0 to ' + d(0.1) + ' 0 cross east',
  'start class All 2025-05-24T00:00Z',
  'mark Far Buoy ' + d(0.1) + ' ' + d(20) + ' starboard',
  'finish line ' + d(-0.1) + ' ' + d(20) + ' to ' + d(0.1) + ' ' + d(20) + ' cross west']) });
ok('a route is found to a line that faces the other way', back.ok, back.why);
if (back.ok) {
  var lastRow = back.rows[back.rows.length - 1];
  ok('she finishes heading west, as the course says', lastRow.cog > 180 && lastRow.cog < 360,
     'cog ' + lastRow.cog.toFixed(0));
  ok('which takes longer than sailing straight through it', back.summary.hours > reach.summary.hours + 0.01,
     back.summary.hours.toFixed(4) + ' h');
}

//  ---- 5. the water she may not cross -------------------------------
//  A wall across the direct line, ending half a mile north of it.
var WALL = COURSE.areas(['AREAS 1', 'source Invented for this test.', 'layer wall', 'line',
  '  ' + d(-3) + ' ' + d(10), '  ' + d(0.5) + ' ' + d(10), 'end line', 'end'].join('\n'));
var walled = sail({ areas: [WALL], run: runFile([], ['layers wall', 'clear wall 0.25']) });
ok('a route is found round a wall', walled.ok, walled.why);
if (walled.ok) {
  var crossed = walled.rows.some(function (w) {
    return ROUTER.cross(w.lon * 60, w.lat * 60, w.lon2 * 60, w.lat2 * 60, 10, -3, 10, 0.5) >= 0;
  });
  ok('the wall is not crossed', !crossed);
  var gap = 1e9;
  walled.rows.forEach(function (w) {
    gap = Math.min(gap, ROUTER.segSeg(w.lon * 60, w.lat * 60, w.lon2 * 60, w.lat2 * 60, 10, -3, 10, 0.5));
  });
  ok('and she keeps the run\'s clearance off it, a quarter of a mile', gap >= 0.25 - 1e-6, gap.toFixed(4));
  ok('going round costs time, but not much', walled.summary.hours > reach.summary.hours &&
     walled.summary.hours < 2.2, walled.summary.hours.toFixed(4));
}
//  the same wall, switched off by the run: a layer not named is not there
var unwalled = sail({ areas: [WALL] });
ok('a layer the run does not name is not in the water',
   unwalled.ok && Math.abs(unwalled.summary.hours - reach.summary.hours) < 1e-9);

//  a point to stay a mile off, on the direct line
var avoided = sail({ run: runFile(['avoid The Rock 0 ' + d(10) + ' off 1.0']) });
ok('a route is found round an "avoid"', avoided.ok, avoided.why);
if (avoided.ok) {
  var off = nearest(avoided, 0, 10 / 60);
  ok('she stays the mile off that the run asks for', off >= 1 - 1e-6, off.toFixed(4) + ' miles');
}

//  an area: a box across the line, which she may not enter
var BOX = COURSE.areas(['AREAS 1', 'source Invented for this test.', 'layer box', 'area',
  '  ' + d(-1) + ' ' + d(9), '  ' + d(1) + ' ' + d(9), '  ' + d(1) + ' ' + d(11), '  ' + d(-1) + ' ' + d(11),
  'end area', 'end'].join('\n'));
var boxed = sail({ areas: [BOX], run: runFile([], ['layers box']) });
ok('a route is found round an area', boxed.ok, boxed.why);
if (boxed.ok) {
  var inside = boxed.rows.some(function (w) {
    var la = w.lat2 * 60, lo = w.lon2 * 60;
    return la > -1 + 1e-6 && la < 1 - 1e-6 && lo > 9 + 1e-6 && lo < 11 - 1e-6;
  });
  ok('and no step ends inside it', !inside);
}

//  ---- 6. what cannot be sailed is refused, with the reason ---------
//  the finish walled in on every side
var CAGE = COURSE.areas(['AREAS 1', 'source Invented for this test.', 'layer cage', 'area',
  '  ' + d(-1) + ' ' + d(19), '  ' + d(1) + ' ' + d(19), '  ' + d(1) + ' ' + d(21), '  ' + d(-1) + ' ' + d(21),
  'end area', 'end'].join('\n'));
var caged = sail({ areas: [CAGE], run: runFile([], ['layers cage']) });
ok('a finish that cannot be reached gives no route, and says so',
   !caged.ok && /no route/.test(caged.why), caged.why);

//  a course whose last mark and finish line disagree about the hand
var wrongHand = course(['start line ' + d(-0.1) + ' 0 to ' + d(0.1) + ' 0 cross east',
  'start class All 2025-05-24T00:00Z',
  'mark Far Buoy ' + d(-0.1) + ' ' + d(20) + ' port',
  'finish line ' + d(-0.1) + ' ' + d(20) + ' to ' + d(0.1) + ' ' + d(20) + ' cross east']);
var wh = sail({ course: wrongHand });
ok('a finish pin on the wrong hand for its own line is refused',
   !wh.ok && /leaves it to starboard/.test(wh.why), wh.why);

var gated = sail({ run: runFile(['gate Somewhere 0 ' + d(10) + ' within 1.0']) });
ok('a gate is refused rather than ignored, until the router sails them',
   !gated.ok && /does not sail gates yet/.test(gated.why), gated.why);

var early = ROUTER.run({ course: EAST, areas: [], wind: NORTHERLY, current: STILL, polar: polar,
  run: COURSE.run(['RUN 2', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current c.grid',
    'start at 2025-05-23T00:00Z', 'step time 600 heading 5', 'round 0.10', 'end'].join('\n')) });
ok('a start before the wind grid begins is refused', !early.ok && /outside the wind grid/.test(early.why), early.why);

//  ---- 7. the same question twice -----------------------------------
var again = sail({});
ok('the same run twice gives the same finish, to the second',
   again.ok && again.summary.finish === reach.summary.finish);

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

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
                      polar: polar, crew: o.crew });
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

//  ---- 8. the cost of a tack, and of a gybe -------------------------
//  A crew file with one grade, so that the mean IS the figure written:
//  every tack costs exactly t seconds and every gybe exactly g.
function hands(t, g) {
  var c = COURSE.crew(['CREW 1', 'grades only', 'level hands 100 ' + t, 'gybe hands 100 ' + g, 'end'].join('\n'));
  if (!c.ok) throw new Error('the test wrote a bad crew file: ' + c.err);
  return c;
}
//  a run that names a crew is a RUN 3
function run3(level) {
  var r = COURSE.run(['RUN 3', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current c.grid',
    'start at 2025-05-24T00:00Z', 'step time 600 heading 5', 'scale wind 1.0 current 1.0', 'round 0.10',
    'crew k.txt ' + level, 'end'].join('\n'));
  if (!r.ok) throw new Error('the test wrote a bad run: ' + r.err);
  return r;
}
function crewed(o, t, g) {
  o.run = run3('hands');
  o.crew = hands(t, g);
  return sail(o);
}
//  the rows on which she is in a manoeuvre
function inIt(r) { return r.rows.filter(function (w) { return w.manoeuvre; }); }
//  WITH A CREW SET SHE NEVER CHANGES TACK EXCEPT THROUGH A MANOEUVRE, and
//  the time given to manoeuvres is exactly their number times their
//  cost: nothing is forgiven at a mark, at the finish, or at the end of
//  a step.
function paidInFull(r, t, g) {
  var bad = 0, i;
  for (i = 1; i < r.rows.length; i++) {
    if (r.rows[i].tack !== r.rows[i - 1].tack && !r.rows[i].manoeuvre) bad++;
  }
  if (Math.abs(r.summary.tackSeconds - t * r.summary.tacks) > 1e-6) bad++;
  if (Math.abs(r.summary.gybeSeconds - g * r.summary.gybes) > 1e-6) bad++;
  return bad;
}

//  A BEAM REACH NEEDS NO TACK, so what a tack costs cannot matter.
var dearReach = crewed({}, 300, 300);
ok('a reach with a crew that tacks badly is the same reach', dearReach.ok &&
   Math.abs(dearReach.summary.hours - reach.summary.hours) < 1e-9 &&
   dearReach.summary.tacks === 0 && dearReach.summary.gybes === 0 && inIt(dearReach).length === 0,
   dearReach.ok ? dearReach.summary.hours.toFixed(5) + ' against ' + reach.summary.hours.toFixed(5) : dearReach.why);

//  A DEAD BEAT, AND A TACK THAT COSTS FIVE MINUTES.  The beating itself
//  takes 4.442 hours however it is cut up (section 2), so the fewest
//  tacks is the fastest, and a dead beat cannot be sailed with fewer
//  than one.  4.442 + 300/3600 = 4.525 hours, and nothing can do better.
//  She can only put the helm down at a step, ten minutes apart, so she
//  overstands a little: allow her 4.6.
var east10 = field('wind', -10, 0);
var beat300 = crewed({ wind: east10 }, 300, 300);
ok('a dead beat is found with a tack that costs five minutes', beat300.ok, beat300.why);
if (beat300.ok) {
  ok('she makes the one tack a dead beat needs, and no more', beat300.summary.tacks === 1 && beat300.summary.gybes === 0,
     beat300.summary.tacks + ' tacks, ' + beat300.summary.gybes + ' gybes');
  ok('it takes the beat and the tack, and no less',
     beat300.summary.hours >= 4.525 && beat300.summary.hours < 4.6, beat300.summary.hours.toFixed(4) + ' h against 4.525');
  ok('the tack is paid in full, and she changes tack no other way', paidInFull(beat300, 300, 300) === 0,
     beat300.summary.tackSeconds + ' s');
  var m3 = inIt(beat300);
  ok('the manoeuvre is one row of five minutes', m3.length === 1 && Math.abs(m3[0].minutes - 5) < 1e-9 && m3[0].manoeuvre === 'tack');
  ok('on which she makes no way through the water, head to wind',
     m3.length === 1 && m3[0].stw === 0 && m3[0].twa === 0 && Math.abs(m3[0].heading - 90) < 1e-9 && m3[0].polar === 'manoeuvre');
  ok('and, with no stream, does not move', m3.length === 1 && m3[0].lat2 === m3[0].lat && m3[0].lon2 === m3[0].lon);
  var at = beat300.rows.indexOf(m3[0]);
  ok('it belongs to the tack she is going onto, and the next row sails on it',
     at > 0 && beat300.rows[at - 1].tack !== m3[0].tack && beat300.rows[at + 1].tack === m3[0].tack &&
     !beat300.rows[at + 1].manoeuvre && beat300.rows[at + 1].stw > 0);
  ok('the rows are sound', sound(beat300) === 0);
}

//  A CHEAPER TACK IS NEVER SLOWER, and between two crews that both make
//  one tack the difference is the difference in what it costs: 900 less
//  300 is ten minutes.
var beat30 = crewed({ wind: east10 }, 30, 30), beat900 = crewed({ wind: east10 }, 900, 900);
ok('a cheaper tack is never slower', beat30.ok && beat900.ok &&
   beat.summary.hours <= beat30.summary.hours && beat30.summary.hours <= beat300.summary.hours &&
   beat300.summary.hours <= beat900.summary.hours,
   [beat, beat30, beat300, beat900].map(function (x) { return x.ok ? x.summary.hours.toFixed(4) : x.why; }).join(' '));
ok('and with a cost she tacks less often than she does for nothing',
   beat30.ok && beat30.summary.tacks <= beat.summary.tacks, beat30.ok ? beat30.summary.tacks + ' against ' + beat.summary.tacks : '');
if (beat900.ok && beat300.ok) {
  var gap = (beat900.summary.hours - beat300.summary.hours) * 3600;
  ok('ten minutes more on the tack is ten minutes more on the passage',
     beat900.summary.tacks === 1 && Math.abs(gap - 600) < 60, gap.toFixed(1) + ' s');

  //  A TACK LONGER THAN A STEP.  Fifteen minutes, and the step is ten:
  //  she is still in it when the next step begins, and serves the rest.
  var m9 = inIt(beat900);
  ok('a tack longer than a step is carried into the next: ten minutes and then five',
     m9.length === 2 && Math.abs(m9[0].minutes - 10) < 1e-9 && Math.abs(m9[1].minutes - 5) < 1e-9 &&
     beat900.rows.indexOf(m9[1]) === beat900.rows.indexOf(m9[0]) + 1 && m9[0].tack === m9[1].tack,
     m9.map(function (w) { return w.minutes; }).join(' '));
  ok('and is still one tack, paid in full', paidInFull(beat900, 900, 900) === 0 && beat900.summary.tacks === 1);
  ok('the rows are sound', sound(beat900) === 0);
}

//  A DEAD RUN, AND A GYBE.  The wind is in the west.  The toy polar is
//  best downwind at about 135 degrees off the wind -- 5.5 knots, of
//  which 3.89 is made good -- and will not sail deeper than 150, so a
//  dead run is two boards and one gybe: 19.99 / 3.89 = 5.139 hours, and
//  400 seconds for the gybe makes 5.25.
//
//  THE GYBE HAS ITS OWN LINE IN THE CREW FILE, and this is the check
//  that it is the one used: a tack here costs 30 seconds and a gybe 400.
var west10 = field('wind', 10, 0);
var run400 = crewed({ wind: west10 }, 30, 400);
ok('a dead run is found with a gybe that costs 400 seconds', run400.ok, run400.why);
if (run400.ok) {
  ok('she gybes once and does not tack', run400.summary.gybes === 1 && run400.summary.tacks === 0,
     run400.summary.gybes + ' gybes, ' + run400.summary.tacks + ' tacks');
  ok('the gybe costs what a gybe costs, not what a tack does', paidInFull(run400, 30, 400) === 0 &&
     Math.abs(run400.summary.gybeSeconds - 400) < 1e-6, run400.summary.gybeSeconds + ' s');
  //  ... AND NOT MUCH MORE.  She can only gybe at a step, so she is a
  //  few minutes early or late and reaches up for the line; that is
  //  worth about a minute, and she is allowed two.  This bound is what
  //  holds the router to two rules of its search: sailed five degrees
  //  too deep all the way (the boat nearer the mark kept, and not the
  //  one further along) she takes 5.41 hours, and with boats that can
  //  fetch the line not kept apart from those that cannot, 5.29.
  ok('it takes the run and the gybe: no less, and within two minutes of it',
     run400.summary.hours >= 5.25 - 0.002 && run400.summary.hours < 5.25 + 2 / 60, run400.summary.hours.toFixed(4) + ' h against 5.25');
  var mg = inIt(run400);
  ok('the manoeuvre row says gybe, stern to the wind',
     mg.length === 1 && mg[0].manoeuvre === 'gybe' && mg[0].twa === 180 && Math.abs(mg[0].heading - 90) < 1e-9);
  ok('the rows are sound', sound(run400) === 0);
}
//  and with free manoeuvres the same run is counted as gybes, not tacks
var runFree = sail({ wind: west10 });
ok('with no crew, changes of tack downwind are counted as gybes',
   runFree.ok && runFree.summary.gybes >= 1 && runFree.summary.tacks === 0, runFree.ok ? JSON.stringify([runFree.summary.tacks, runFree.summary.gybes]) : runFree.why);
ok('and upwind as tacks', beat.summary.tacks >= 1 && beat.summary.gybes === 0);

//  WHILE SHE TACKS THE STREAM HAS HER.  A stream setting south at 2
//  knots, and a tack of 300 seconds: for those five minutes she goes
//  south at two knots and nowhere else, which is 2 x 300/3600 = 0.1667
//  miles.
var beatSet = crewed({ wind: east10, current: field('current', 0, -2) }, 300, 300);
ok('a beat across a stream is found, with a cost', beatSet.ok, beatSet.why);
if (beatSet.ok) {
  var ms = inIt(beatSet)[0];
  ok('in the tack she goes where the stream goes, at the stream\'s rate',
     ms && Math.abs(ms.cog - 180) < 1e-6 && Math.abs(ms.sog - 2) < 1e-9 && ms.stw === 0,
     ms ? ms.cog + ' ' + ms.sog : 'no manoeuvre row');
  ok('a sixth of a mile in five minutes', ms && Math.abs((ms.lat - ms.lat2) * 60 - 2 * 300 / 3600) < 1e-6,
     ms ? ((ms.lat - ms.lat2) * 60).toFixed(5) : '');
  ok('the rows are sound', sound(beatSet) === 0 && paidInFull(beatSet, 300, 300) === 0);
}

//  NOTHING IS FORGIVEN AT A MARK.  Out and back in a northerly: east on
//  port, round the buoy to port -- which is up through the wind -- and
//  home on starboard.  The one tack is made AT the mark, where a step is
//  cut short by the rounding and the time owed must be carried past it.
var freeRound = sail({ course: outAndBack('port', 0.4) });
var dearRound = crewed({ course: outAndBack('port', 0.4) }, 200, 200);
ok('an out-and-back is found with a tack that costs 200 seconds', dearRound.ok, dearRound.why);
if (dearRound.ok && freeRound.ok) {
  ok('the tack at the mark is paid in full', paidInFull(dearRound, 200, 200) === 0 &&
     dearRound.summary.tacks + dearRound.summary.gybes >= 1,
     dearRound.summary.tacks + ' tacks ' + dearRound.summary.tackSeconds + ' s, ' +
     dearRound.summary.gybes + ' gybes ' + dearRound.summary.gybeSeconds + ' s');
  var paid = dearRound.summary.tackSeconds + dearRound.summary.gybeSeconds;
  var took = (dearRound.summary.hours - freeRound.summary.hours) * 3600;
  //  NOT "LONGER BY WHAT WAS PAID", which is what this check first
  //  asked and what the router did not do: 117 seconds longer for 200
  //  paid.  She does 1.7 miles in a step and the berth is a tenth of a
  //  mile, so how tightly the mark is turned is decided by where the
  //  ten-minute marks happen to fall, and the boat that had to stop
  //  for her tack happened to turn it a third of a mile tighter than
  //  the one that did not.  A minute or two between two runs round a
  //  mark is the size of the step, not seamanship.  What IS true, and
  //  is held to: she is slower, and not by more than she paid and that
  //  much again.
  ok('and the passage is longer, by no more than what was paid and the size of a step',
     took > 0 && took < paid + 120, took.toFixed(1) + ' s longer, ' + paid + ' s paid');
  ok('she still leaves the mark to port', swing(dearRound, 0, 10 / 60) < -300);
  ok('the rows are sound', sound(dearRound) === 0);
}

//  CARRIED ROUND THE MARK IN THE MIDDLE OF A TACK.  The same course
//  with a stream setting north at 2 knots and a little east, and a
//  manoeuvre of ten minutes.  The router begins it south of the line
//  she must cross to round, and the stream takes her over that line
//  while she has no way on: the row is cut at the line, and the time
//  not yet served is still owed on the far side of it.
var swept = crewed({ course: outAndBack('port', 0.4), current: field('current', 0.5, 2) }, 600, 600);
ok('an out-and-back is found in a stream, with a ten-minute manoeuvre', swept.ok, swept.why);
if (swept.ok) {
  var cut = swept.rows.filter(function (w) { return w.manoeuvre && /^rounded /.test(w.event || ''); });
  ok('the stream carries her round the mark in the middle of it', cut.length === 1 && cut[0].minutes < 10,
     cut.length + ' such rows');
  ok('and what was not served before the line is served after it: paid in full',
     paidInFull(swept, 600, 600) === 0 && swept.summary.tacks + swept.summary.gybes >= 1,
     swept.summary.tackSeconds + ' + ' + swept.summary.gybeSeconds + ' s for ' + swept.summary.tacks + ' + ' + swept.summary.gybes);
  ok('the rows are sound', sound(swept) === 0);
}

//  A CREW WHOSE MANOEUVRES COST NOTHING IS NO CREW AT ALL: the same
//  rows as the run that names none.
var nought = crewed({ wind: east10 }, 0, 0);
ok('a crew that loses no time sails the route of a run with no crew, row for row',
   nought.ok && JSON.stringify(nought.rows) === JSON.stringify(beat.rows) && inIt(nought).length === 0);
ok('and the summary says which crew it was', nought.ok && nought.summary.crew &&
   nought.summary.crew.level === 'hands' && nought.summary.crew.file === 'k.txt' && beat.summary.crew === null);

//  what cannot be sailed
var noCrew = sail({ run: run3('hands') });
ok('a run that names a crew file nobody loaded is refused', !noCrew.ok && /crew file, k\.txt, which was not loaded/.test(noCrew.why), noCrew.why);
var noLevel = sail({ run: run3('nobody'), crew: hands(30, 30) });
ok('and so is a level the file does not give', !noLevel.ok && /crew level "nobody"/.test(noLevel.why), noLevel.why);

var twice = crewed({ wind: east10 }, 300, 300);
ok('the same crew twice gives the same finish', twice.ok && twice.summary.finish === beat300.summary.finish);

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

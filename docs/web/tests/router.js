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
                      polar: polar, crew: o.crew, passage: o.passage });
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

//  (gates are sailed now: section 9)

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

//  ---- 9. a passage plan: passes, and a berth for each mark -----------
//  A run that names a passage sails one plan of it, written down the
//  page as the passage is sailed: the marks of the course in order,
//  each with its berth, and the places she must pass among them (Larry,
//  13 November 2026).  A pass with a compass word is a line out from
//  its point that she must cross; one without is a circle she must
//  come into.  The router is handed the passage file already read; the
//  file itself is tested in tests/course.js.
function plan(lines, crewLevel, runLines) {
  var r = COURSE.run(['RUN 3', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current c.grid',
    'start at 2025-05-24T00:00Z', 'step time 600 heading 5', 'scale wind 1.0 current 1.0', 'passage f.txt t']
    .concat(runLines || []).concat(crewLevel ? ['crew k.txt ' + crewLevel] : []).concat(['end']).join('\n'));
  if (!r.ok) throw new Error('the test wrote a bad run: ' + r.err);
  var p = COURSE.passage(['PASSAGE 1', 'plan t'].concat(lines).concat(['end']).join('\n'));
  if (!p.ok) throw new Error('the test wrote a bad passage: ' + p.err);
  return { run: r, passage: p };
}
function sailPlan(o, lines, crewLevel, runLines) {
  var pl = plan(lines, crewLevel, runLines), q = {}, k;
  for (k in o) q[k] = o[k];
  q.run = pl.run; q.passage = pl.passage;
  return sail(q);
}
//  a pass: a name, where it is in miles north and east, how near, and
//  the compass word when it has one
function pass(name, north, east, nm, dir) {
  return 'pass ' + name + ' ' + d(north) + ' ' + d(east) + ' ' + (dir ? dir + ' ' : '') + 'within ' + nm;
}
var FAR = 'mark Far Buoy';      //  the end of EAST's finish line: placed, with no berth
function who(r) { return r.summary.passed.map(function (p) { return p.name; }).join(' '); }
function secsAfterStart(iso) { return (Date.parse(iso) - Date.parse('2025-05-24T00:00:00Z')) / 1000; }
function noIdleRows(r) { return r.rows.every(function (w) { return w.minutes > 0; }); }
function rowsOf(r) { return r.ok ? JSON.stringify(r.rows) : r.why; }
//  where the row that made a station ends, in miles north and east.
//  (Positions are written to six decimals of a degree, so "ten miles
//  east" is 10.00002: the checks allow a ten-thousandth of a mile.)
function madeAt(r, ev) {
  var w = r.rows.filter(function (x) { return (x.event || '').split('; ').indexOf(ev) >= 0; });
  return w.length === 1 ? { n: w[0].lat2 * 60, e: w[0].lon2 * 60 } : null;
}

//  A PLAN THAT ONLY GIVES THE BERTH `round` GAVE SAILS THE SAME ROUTE.
//  The out-and-back of section 4, its buoy at 0.10 in the plan: the same
//  rows as the run that says `round 0.10`, every one.
var OUT = outAndBack('port', 0.4);
var viaPlan = sailPlan({ course: OUT }, ['mark Out Buoy berth 0.10']);
ok('a plan that gives the berth round gave sails the same route, row for row',
   viaPlan.ok && portRound.ok && rowsOf(viaPlan) === rowsOf(portRound), viaPlan.ok ? '' : viaPlan.why);

//  A BERTH IS THE PLAN'S, MARK BY MARK.  Half a mile off the buoy: never
//  nearer, all the way round, and longer for it.
var wide = sailPlan({ course: OUT }, ['mark Out Buoy berth 0.50']);
ok('a wider berth is kept all the way round', wide.ok && nearest(wide, 0, 10 / 60) >= 0.5 - 1e-6,
   wide.ok ? nearest(wide, 0, 10 / 60).toFixed(4) : wide.why);
ok('and costs her time', wide.ok && wide.summary.hours > viaPlan.summary.hours,
   wide.ok ? wide.summary.hours.toFixed(4) + ' against ' + viaPlan.summary.hours.toFixed(4) : '');
ok('she still leaves it to port', wide.ok && swing(wide, 0, 10 / 60) < -300);
ok('the summary says the berth each mark was rounded at', wide.ok && viaPlan.ok &&
   wide.summary.rounded[0].berth === 0.5 && viaPlan.summary.rounded[0].berth === 0.1 &&
   portRound.summary.rounded[0].berth === 0.1 && portRound.summary.round === 0.1 && wide.summary.round === null);

//  A CIRCLE ON THE STRAIGHT LINE COSTS NOTHING.  The beam reach of
//  section 1, with a pass a mile across its middle: she is within a
//  mile of (0, 10) when she has made 9 miles, less a hair for sailing
//  along the edge of the lines, which at ten knots is 54 minutes.
var onLine = sailPlan({}, [pass('Halfway', 0, 10, 1), FAR]);
ok('a plan with a pass on its straight line is sailed', onLine.ok, onLine.why);
if (onLine.ok) {
  ok('and takes no longer for it', Math.abs(onLine.summary.hours - reach.summary.hours) < 1e-9,
     onLine.summary.hours.toFixed(5) + ' against ' + reach.summary.hours.toFixed(5));
  ok('the pass is made, and the summary says when, how near, and on no side', who(onLine) === 'Halfway' &&
     Math.abs(secsAfterStart(onLine.summary.passed[0].at) - 54 * 60) < 20 &&
     onLine.summary.passed[0].nm === 1 && onLine.summary.passed[0].dir === null, JSON.stringify(onLine.summary.passed));
  var cutAt = onLine.rows.filter(function (w) { return w.event === 'passed Halfway'; });
  ok('a row ends where she comes within the mile, and says so', cutAt.length === 1 &&
     Math.abs(Math.hypot(cutAt[0].lon2 * 60 - 10, cutAt[0].lat2 * 60) - 1) < 1e-3,
     cutAt.length ? Math.hypot(cutAt[0].lon2 * 60 - 10, cutAt[0].lat2 * 60).toFixed(6) : 'no such row');
  ok('a pass puts nothing in her way: she sails on through it', nearest(onLine, 0, 10 / 60) < 0.2);
  //  ... AND IT HAS NO BERTH.  A pass within a twentieth of a mile: she
  //  must come nearer its point than a berth would let her, and does.
  var tight = sailPlan({}, [pass('Needle', 0, 10, 0.05), FAR]);
  ok('a pass has no berth: she comes within a twentieth of a mile of its point',
     tight.ok && nearest(tight, 0, 10 / 60) <= 0.05 + 1e-6, tight.ok ? nearest(tight, 0, 10 / 60).toFixed(5) : tight.why);
  ok('the rows are sound, and none is idle', sound(onLine) === 0 && noIdleRows(onLine));
}

//  A LINE ACROSS HER WAY IS CROSSED WHERE SHE IS GOING ANYWAY.  A spit
//  half a mile north of the way, to be passed south within a mile: a
//  line from (0.5, 10) down to (-0.5, 10), straight across the reach.
var spit = sailPlan({}, [pass('Spit', 0.5, 10, 1, 'south'), FAR]);
ok('a line across her way is sailed, at no cost', spit.ok && Math.abs(spit.summary.hours - reach.summary.hours) < 1e-9,
   spit.ok ? spit.summary.hours.toFixed(5) : spit.why);
var sAt = spit.ok ? madeAt(spit, 'passed Spit') : null;
ok('and the row that makes it ends on the line, between its ends', sAt && Math.abs(sAt.e - 10) < 1e-4 &&
   sAt.n <= 0.5 + 1e-4 && sAt.n >= -0.5 - 1e-4, JSON.stringify(sAt));
ok('the summary says its compass word and its length', spit.ok && spit.summary.passed[0].dir === 'south' &&
   spit.summary.passed[0].nm === 1);

//  A LINE HAS NO INSIDE.  A line from half a mile east of the start,
//  half a mile north, down to half a mile south: the start is within a
//  mile of its point, which would make a circle of one mile "passed"
//  as the gun goes.  A line is made only by crossing it, half a mile
//  on: three minutes at ten knots.
var early = sailPlan({}, [pass('Bar', 0.5, 0.5, 1, 'south'), FAR]);
ok('a line near the start is not passed at the start, but where she crosses it, three minutes on',
   early.ok && early.summary.passed[0].at !== early.summary.start &&
   Math.abs(secsAfterStart(early.summary.passed[0].at) - 180) < 10, early.ok ? JSON.stringify(early.summary.passed) : early.why);

//  A LINE OFF HER WAY MUST BE GONE TO, AND CROSSED, NOT MERELY NEARED.
//  A point two miles north of the way.  "north within 1" is a line from
//  (2, 10) up to (3, 10); "south within 1" from (2, 10) down to (1, 10);
//  a circle of one mile may be entered anywhere a mile from the point.
//  The three are sailed differently, and each where its own rule says.
var ridgeN = sailPlan({}, [pass('Ridge', 2, 10, 1, 'north'), FAR]);
var ridgeS = sailPlan({}, [pass('Ridge', 2, 10, 1, 'south'), FAR]);
var ridgeC = sailPlan({}, [pass('Ridge', 2, 10, 1), FAR]);
var nAt = ridgeN.ok ? madeAt(ridgeN, 'passed Ridge') : null;
var sAt2 = ridgeS.ok ? madeAt(ridgeS, 'passed Ridge') : null;
var cAt = ridgeC.ok ? madeAt(ridgeC, 'passed Ridge') : null;
ok('a line to the north of a point is crossed to the north of it, between its ends',
   nAt && Math.abs(nAt.e - 10) < 1e-4 && nAt.n >= 2 - 1e-4 && nAt.n <= 3 + 1e-4, ridgeN.ok ? JSON.stringify(nAt) : ridgeN.why);
ok('a line to the south of it, to the south', sAt2 && Math.abs(sAt2.e - 10) < 1e-4 && sAt2.n >= 1 - 1e-4 && sAt2.n <= 2 + 1e-4,
   ridgeS.ok ? JSON.stringify(sAt2) : ridgeS.why);
ok('a circle is entered a mile from its point, and not on either line',
   cAt && Math.abs(Math.hypot(cAt.e - 10, cAt.n - 2) - 1) < 1e-3 && Math.abs(cAt.e - 10) > 1e-3,
   ridgeC.ok ? JSON.stringify(cAt) : ridgeC.why);
ok('the line further from her way costs the most, the circle the least',
   ridgeN.ok && ridgeS.ok && ridgeC.ok && ridgeN.summary.hours > ridgeS.summary.hours &&
   ridgeS.summary.hours > ridgeC.summary.hours && ridgeC.summary.hours > reach.summary.hours,
   [ridgeN, ridgeS, ridgeC].map(function (x) { return x.ok ? x.summary.hours.toFixed(4) : x.why; }).join(' '));
ok('the rows are sound', ridgeN.ok && sound(ridgeN) === 0 && noIdleRows(ridgeN) && sound(ridgeS) === 0);

//  A CIRCLE OFF THE LINE MUST BE GONE TO.  Five miles north of the
//  middle, to be passed within one.  The shortest way is to (4, 10) and
//  back down: two legs of 10.77 miles, 21.5 in all, sailed 68 and 112
//  degrees off the wind at 7.8 knots on the toy polar, which is 2.76
//  hours; nothing is faster than ten knots, so nothing does it in under
//  2.15.
var offLine = sailPlan({}, [pass('Northing', 5, 10, 1), FAR]);
ok('a plan with a pass off its straight line is sailed', offLine.ok, offLine.why);
if (offLine.ok) {
  ok('she goes within the mile, and no nearer than she must', nearest(offLine, 5 / 60, 10 / 60) <= 1 + 1e-6 &&
     nearest(offLine, 5 / 60, 10 / 60) > 0.9, nearest(offLine, 5 / 60, 10 / 60).toFixed(4));
  ok('it costs her what the two legs cost: more than 2.15 hours, and no more than 2.8',
     offLine.summary.hours > 2.15 && offLine.summary.hours < 2.8, offLine.summary.hours.toFixed(4));
  ok('the rows are sound', sound(offLine) === 0 && noIdleRows(offLine));
}

//  THE ORDER WRITTEN IS THE ORDER SAILED.  A three miles north of the
//  five-mile point, B three miles south of the fifteen.  A then B lies
//  along the way.  B then A is out to fifteen, back to five, and out
//  again: at least 40 miles where the other is little more than 20.
var ab = sailPlan({}, [pass('A', 3, 5, 1), pass('B', -3, 15, 1), FAR]);
var ba = sailPlan({}, [pass('B', -3, 15, 1), pass('A', 3, 5, 1), FAR]);
ok('passes are made in the order they are written', ab.ok && who(ab) === 'A B' && ba.ok && who(ba) === 'B A',
   (ab.ok ? who(ab) : ab.why) + ' / ' + (ba.ok ? who(ba) : ba.why));
ok('and each later than the one before', ab.ok && ba.ok &&
   ab.summary.passed[0].at < ab.summary.passed[1].at && ba.summary.passed[0].at < ba.summary.passed[1].at);
ok('written the wrong way round, she sails there and back again: over an hour longer',
   ab.ok && ba.ok && ba.summary.hours > ab.summary.hours + 1, ab.ok && ba.ok ? ab.summary.hours.toFixed(3) + ' and ' + ba.summary.hours.toFixed(3) : '');

//  AMONG THE MARKS.  The out-and-back, with a pass two miles north of
//  the half-way point: written before the mark it is made on the way
//  out; after, on the way home; both, twice.
var G = pass('Headland', 2, 5, 0.5), OB = 'mark Out Buoy berth 0.10';
var before = sailPlan({ course: OUT }, [G, OB]);
var afterIt = sailPlan({ course: OUT }, [OB, G]);
var both = sailPlan({ course: OUT }, [G, OB, G]);
ok('a pass written before a mark is made before she rounds it', before.ok && who(before) === 'Headland' &&
   before.summary.passed[0].at < before.summary.rounded[0].at, before.ok ? JSON.stringify(before.summary.passed) : before.why);
ok('one written after it, after', afterIt.ok && who(afterIt) === 'Headland' &&
   afterIt.summary.passed[0].at > afterIt.summary.rounded[0].at, afterIt.ok ? JSON.stringify(afterIt.summary.passed) : afterIt.why);
ok('one written both sides is made going out and again coming home', both.ok && who(both) === 'Headland Headland' &&
   both.summary.passed[0].at < both.summary.rounded[0].at && both.summary.rounded[0].at < both.summary.passed[1].at,
   both.ok ? JSON.stringify(both.summary.passed) : both.why);
ok('and going there twice takes longer than going once, which takes longer than not going',
   both.ok && before.ok && afterIt.ok && both.summary.hours > before.summary.hours &&
   both.summary.hours > afterIt.summary.hours && before.summary.hours > portRound.summary.hours &&
   afterIt.summary.hours > portRound.summary.hours);
//  SHE STILL GOES ROUND THE BUOY.  The first time these three were
//  sailed she did not: with the headland to make again on the way home
//  it was quicker to reach past the buoy, hook across the line out from
//  it and come back the side she went out, and the track swung two
//  degrees round the mark where it should swing a whole turn.  A mark
//  once rounded now stays rounded.
ok('with a pass before the mark she still goes round it, anticlockwise',
   before.ok && swing(before, 0, 10 / 60) < -300, before.ok ? swing(before, 0, 10 / 60).toFixed(0) + ' degrees' : before.why);
ok('and with one after it', afterIt.ok && swing(afterIt, 0, 10 / 60) < -300, afterIt.ok ? swing(afterIt, 0, 10 / 60).toFixed(0) + ' degrees' : afterIt.why);
ok('and with one either side', both.ok && swing(both, 0, 10 / 60) < -300, both.ok ? swing(both, 0, 10 / 60).toFixed(0) + ' degrees' : both.why);
ok('the rows are sound', both.ok && sound(both) === 0 && noIdleRows(both) && sound(before) === 0 && sound(afterIt) === 0);
//  the summary pairs each pass made with its own figures, in order
var mixed = sailPlan({ course: OUT }, [pass('Headland', 2, 5, 0.5), OB, pass('Headland', 2, 5, 1.5, 'north')]);
ok('two passes of one name keep their own figures, in the order made', mixed.ok &&
   mixed.summary.passed[0].nm === 0.5 && mixed.summary.passed[0].dir === null &&
   mixed.summary.passed[1].nm === 1.5 && mixed.summary.passed[1].dir === 'north', mixed.ok ? JSON.stringify(mixed.summary.passed) : mixed.why);

//  A CIRCLE SHE IS ALREADY INSIDE IS MADE WHERE SHE IS: one drawn round
//  the start line is passed as the gun goes, and no row is made for it.
var home = sailPlan({}, [pass('Home', 0, 0, 1), FAR]);
ok('a pass round the start line is made at the start', home.ok && who(home) === 'Home' &&
   home.summary.passed[0].at === home.summary.start && noIdleRows(home) &&
   Math.abs(home.summary.hours - reach.summary.hours) < 1e-9, home.ok ? JSON.stringify(home.summary.passed) : home.why);
//  Two whose circles overlap, half a mile apart along the way: the
//  second is entered half a mile after the first, three minutes at ten
//  knots.
var lap = sailPlan({}, [pass('P', 0, 10, 1), pass('Q', 0, 10.5, 1), FAR]);
ok('two circles that overlap are made one after the other, three minutes apart',
   lap.ok && who(lap) === 'P Q' &&
   Math.abs(secsAfterStart(lap.summary.passed[1].at) - secsAfterStart(lap.summary.passed[0].at) - 180) < 5,
   lap.ok ? JSON.stringify(lap.summary.passed) : lap.why);

//  A PASS AND A COST TOGETHER.  The dead beat of section 8 with a pass on
//  the way: every tack is still paid for.
var passBeat = sailPlan({ wind: east10, crew: hands(300, 300) }, [pass('Halfway', 0, 10, 1), FAR], 'hands');
ok('a pass on a beat, with a crew: the pass is made and every tack paid in full',
   passBeat.ok && who(passBeat) === 'Halfway' && paidInFull(passBeat, 300, 300) === 0 && sound(passBeat) === 0,
   passBeat.ok ? who(passBeat) : passBeat.why);

//  what cannot be sailed
var walledPass = sailPlan({ areas: [CAGE] }, [pass('Inside', 0, 20, 0.3), FAR], null, ['layers cage']);
ok('a pass that cannot be reached gives no route', !walledPass.ok && /no route/.test(walledPass.why), walledPass.why);
function refused(what, r, re) { ok(what, !r.ok && re.test(r.why), r.ok ? 'it sailed' : r.why); }
refused('a plan that leaves out a mark of the course is refused',
        sailPlan({ course: OUT }, [G]), /the plan does not place Out Buoy/);
refused('a plan that places a mark the course does not have is refused',
        sailPlan({ course: OUT }, [G, 'mark Nowhere berth 0.10']), /the plan places Nowhere where the course has Out Buoy/);
refused('a plan that gives a mark no berth is refused', sailPlan({ course: OUT }, ['mark Out Buoy']), /gives Out Buoy no berth/);
refused('a plan that leaves out the mark that ends the finish line is refused',
        sailPlan({}, [pass('Halfway', 0, 10, 1)]), /the plan does not place Far Buoy/);
refused('a berth on the mark that ends the finish line is refused',
        sailPlan({}, [pass('Halfway', 0, 10, 1), 'mark Far Buoy berth 0.10']), /Far Buoy is the end of the finish line, and takes no berth/);
refused('a run that names a passage the router was not given is refused',
        sail({ run: plan([FAR]).run }), /names a passage file, f\.txt, and none was given to the router/);
refused('a gate line in a run is refused, and told what replaced it',
        sail({ run: runFile(['gate Somewhere 0 ' + d(10) + ' within 1.0']) }), /"gate" lines, which are not sailed: .*"pass" line in a passage file/);
var old1 = ROUTER.run({ course: EAST, areas: [], wind: NORTHERLY, current: STILL, polar: polar,
  run: COURSE.run(['RUN 1', 'course c.txt', 'polar p.txt', 'start at 2025-05-24T00:00Z', 'step time 600 heading 5',
                   'round 0.10', 'gate Somewhere 0 ' + d(10) + ' off 1.0', 'end'].join('\n')) });
ok('a RUN 1 gate, which never said which it meant, is refused and not ignored',
   !old1.ok && /RUN 1 gate/.test(old1.why), old1.why);
//  and an avoid is still an avoid: the same point, to be kept a mile off
var kept = sail({ run: runFile(['avoid Halfway 0 ' + d(10) + ' off 1.0']) });
ok('the same point as an avoid is still kept off, not passed', kept.ok && kept.summary.passed.length === 0 &&
   nearest(kept, 0, 10 / 60) >= 1 - 1e-6, kept.ok ? nearest(kept, 0, 10 / 60).toFixed(4) : kept.why);

//  ---- 10. a step shorter than a square ------------------------------
//  The search keeps one boat to a half-mile square, the first to reach
//  it.  A boat that sails less than half a mile in a step does not
//  leave her square, and the first version dropped her for it: she was
//  in a square "reached earlier", by herself.  In light airs, or with a
//  fine step, that left no route at all, or a bad one.  Found on 14
//  November 2026 by asking what a finer step must never do.
//
//  The toy polar makes 6 knots on a beam reach in 5 of wind and falls
//  away in proportion below that, so in 2 knots of wind she makes 2.4:
//  four tenths of a mile in ten minutes, less than a square.
function slowRun(scale, step, crewLevel) {
  var r = COURSE.run([crewLevel ? 'RUN 3' : 'RUN 2', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current c.grid',
    'start at 2025-05-24T00:00Z', 'step time ' + step + ' heading 5', 'scale wind ' + scale + ' current 1.0', 'round 0.10']
    .concat(crewLevel ? ['crew k.txt ' + crewLevel] : []).concat(['end']).join('\n'));
  if (!r.ok) throw new Error('the test wrote a bad run: ' + r.err);
  return r;
}
var drifter = sail({ run: slowRun(0.2, 600) });
ok('twenty miles on a beam reach in two knots of wind is found', drifter.ok, drifter.why);
if (drifter.ok) {
  ok('she makes 2.4 knots, less than a square in a step', Math.abs(drifter.rows[0].stw - 2.4) < 1e-9 &&
     drifter.rows[0].stw * 600 / 3600 < 0.5, drifter.rows[0].stw.toFixed(3));
  ok('and it takes the distance over the speed: eight hours and twenty minutes',
     Math.abs(drifter.summary.hours - 20 / 2.4) < 0.02, drifter.summary.hours.toFixed(4) + ' against ' + (20 / 2.4).toFixed(4));
  ok('straight there: no tack, no gybe, and the rows are sound',
     drifter.summary.tacks === 0 && drifter.summary.gybes === 0 && sound(drifter) === 0 && noIdleRows(drifter));
}
//  THE SAME REACH AT TEN KNOTS, A MINUTE AT A STEP: a sixth of a mile.
var minute = sail({ run: slowRun(1, 60) });
ok('the reach of section 1 at one-minute steps is found, and takes the same two hours',
   minute.ok && Math.abs(minute.summary.hours - reach.summary.hours) < 0.001,
   minute.ok ? minute.summary.hours.toFixed(5) + ' against ' + reach.summary.hours.toFixed(5) : minute.why);
ok('in ten times the rows, all sound', minute.ok && minute.rows.length === 120 && sound(minute) === 0);

//  A DEAD BEAT IN THREE KNOTS OF WIND.  The polar's beat makes 3 knots
//  good in 5 of wind, so 1.8 in 3: twenty miles in 11.11 hours, at 2.35
//  knots through the water, four tenths of a mile a step.  Before, she
//  took 11.49 hours over it with 27 tacks.
var lightBeat = sail({ wind: east10, run: slowRun(0.3, 600) });
ok('a dead beat in three knots of wind is found', lightBeat.ok, lightBeat.why);
if (lightBeat.ok) {
  ok('and takes the distance over the speed made good, to one part in a hundred',
     Math.abs(lightBeat.summary.hours - 20 / 1.8) < 0.11, lightBeat.summary.hours.toFixed(4) + ' against ' + (20 / 1.8).toFixed(4));
  ok('the rows are sound', sound(lightBeat) === 0 && noIdleRows(lightBeat));
}
//  ... and with a crew, every one of her tacks is still paid for
var lightCrew = sail({ wind: east10, crew: hands(300, 300), run: slowRun(0.3, 600, 'hands') });
ok('in light airs with a crew, every tack is paid in full', lightCrew.ok && paidInFull(lightCrew, 300, 300) === 0 &&
   sound(lightCrew) === 0 && lightCrew.summary.hours > lightBeat.summary.hours,
   lightCrew.ok ? lightCrew.summary.hours.toFixed(4) + ' h, ' + lightCrew.summary.tacks + ' tacks' : lightCrew.why);

//  A FINER STEP MUST NOT MAKE HER SLOWER.  The dead beat of section 2
//  at two and a half minutes a step: a quarter of a mile.  Before, "no
//  route".  Twenty miles at 4.5 knots made good is 4.44 hours.
var fineBeat = sail({ wind: east10, run: slowRun(1, 150) });
ok('the dead beat at two-and-a-half-minute steps is found', fineBeat.ok, fineBeat.why);
ok('and is no slower than at ten minutes', fineBeat.ok && beat.ok && fineBeat.summary.hours <= beat.summary.hours + 0.01,
   fineBeat.ok ? fineBeat.summary.hours.toFixed(4) + ' against ' + beat.summary.hours.toFixed(4) : '');
//  WHAT A VERY FINE STEP COSTS, PINNED SO THAT IT IS SEEN IF IT GROWS.
//  At one minute a step she sails a tenth of a mile, a fifth of a
//  square.  The first boat into a square is then decided to the minute
//  but kept to the half mile, and the first in tends to be the one
//  footing off for speed, not the one pointing.  She loses about two
//  parts in a hundred.  A step much shorter than the time to cross a
//  square buys nothing; ROUTER.md says so.
var oneMinuteBeat = sail({ wind: east10, run: slowRun(1, 60) });
ok('the dead beat at one-minute steps is found, within three parts in a hundred of distance over speed made good',
   oneMinuteBeat.ok && oneMinuteBeat.summary.hours < (20 / 4.5) * 1.03 && oneMinuteBeat.summary.hours > 20 / 4.5 - 0.01,
   oneMinuteBeat.ok ? oneMinuteBeat.summary.hours.toFixed(4) + ' against ' + (20 / 4.5).toFixed(4) : oneMinuteBeat.why);

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

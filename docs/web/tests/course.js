//  COURSE 1, AREAS 1, RUN 1: what they accept and what they refuse.
//
//  THE REFUSALS ARE THE POINT, and they are the same point GRID 1's
//  tests make. A bad course does not become an error, it becomes a
//  ROUTE: a boat that rounds a mark on the wrong side, or starts ten
//  minutes after the fleet because a class name was misspelt and
//  nobody checked. A file that is wrong in a way nothing notices is
//  worse than one that will not load.
//
//  So each case below pairs a malformed file with the sentence it must
//  be refused with. A test that only asked "was it refused" would pass
//  while the reader said something useless.
//
//    node docs/web/tests/course.js
'use strict';
var C = require('../route/course.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function refuses(what, text, parse, fragment) {
  var r = parse(text);
  checks++;
  if (r.ok) { fail++; console.log('  FAIL  ' + what + '\n        it was accepted'); return; }
  if (r.err.indexOf(fragment) < 0) {
    fail++;
    console.log('  FAIL  ' + what + '\n        refused, but said: ' + r.err);
  }
}

// ---------------------------------------------------------------- COURSE
var GOOD = [
  'COURSE 1',
  'name Example race 2025',
  'source Invented for this test. Not a real course.',
  'start line 50.76167 -1.29750 bearing 190 length 0.20 cross south',
  'start class Class Zero 2025-05-24T10:10Z',
  'start class Class One 2025-05-24T10:00Z',
  'mark Outer Rock 50.18083 -4.25833 port',
  'mark Return Buoy 50.70833 -1.47500 starboard',
  'finish line 50.70833 -1.47500 bearing 000 length 0.10 cross north',
  'end'
].join('\n');

(function () {
  var c = C.course(GOOD);
  ok('a good course loads', c.ok, c.err);
  if (!c.ok) return;
  ok('its marks keep the order of the lines',
     c.marks.length === 2 && c.marks[0].name === 'Outer Rock' &&
     c.marks[1].name === 'Return Buoy');
  ok('a name with spaces survives', c.marks[1].name === 'Return Buoy');
  ok('the side is carried', c.marks[0].side === 'port' && c.marks[1].side === 'starboard');
  ok('both class starts are listed', c.classes.length === 2);
  ok('a class is found by name', c.classOf('Class One').at === '2025-05-24T10:00Z');
  ok('an unknown class is not', c.classOf('Class Two') === null);
  //  the start line is one end, a bearing and a length; the far end is
  //  computed, and 0.20 nm due 190 is about 0.0033 degrees of latitude
  ok('a bearing-and-length line gets a far end',
     Math.abs(c.start.b.lat - 50.75839) < 0.0005 && c.start.form === 'bearing',
     JSON.stringify(c.start.b));
  ok('and it remembers which form it was written in', c.start.form === 'bearing');
})();

refuses('a file that is not COURSE 1', 'COURSE 2\nend', C.course, 'must be "COURSE 1"');
refuses('a course with no source', GOOD.replace(/^source.*$/m, ''), C.course, 'where its figures came from');
refuses('a course cut short before end', GOOD.replace(/\nend$/, ''), C.course, 'cut short');
refuses('a mark with no side', GOOD.replace('mark Outer Rock 50.18083 -4.25833 port',
        'mark Outer Rock 50.18083 -4.25833'), C.course, 'port, starboard or either');
refuses('a mark whose side is a guess', GOOD.replace('port', 'left'), C.course,
        'port, starboard or either');
refuses('a line with no crossing sense', GOOD.replace(' cross south', ''), C.course,
        'which way it is crossed');
//  RANGE IS ALL THE FORMAT CAN SEE. A latitude of 150 is impossible and
//  is caught. A pair that has been swapped into a position that is
//  merely WRONG -- 4 degrees north, 50 degrees east, both legal -- is
//  not something any format can detect, which is why `source` is
//  required and a course is meant to be read against it.
refuses('a latitude that cannot exist',
        GOOD.replace('50.18083 -4.25833', '150.18083 -4.25833'), C.course,
        'latitude 150.18083 is not between -90 and 90');

(function () {
  var c = C.course(GOOD.replace('50.18083 -4.25833', '-4.25833 50.18083'));
  ok('a swap into a legal position is NOT caught, and the test says so', c.ok,
     'if this ever starts failing the format grew a check and this note is stale');
})();
refuses('a class start with no time', GOOD.replace(' 2025-05-24T10:10Z', ''), C.course,
        'is not a time');
refuses('the same class twice',
        GOOD.replace('start class Class One 2025-05-24T10:00Z',
                     'start class Class Zero 2025-05-24T10:00Z'), C.course, 'already listed');
refuses('a line nothing reads', GOOD.replace('\nend', '\ntide springs\nend'), C.course,
        'unknown line "tide"');
refuses('anything after end', GOOD + '\nmark Extra 50 -1 port', C.course, 'nothing may follow');
refuses('a course with no marks', GOOD.replace(/^mark.*$/gm, ''), C.course, 'no marks');

// ----------------------------------------------------------------- AREAS
var AREAS = [
  'AREAS 1',
  'source EMODnet coastline at MHW, clipped and simplified to 25 m',
  'layer coast-emodnet-mhw',
  'line',
  '  50.60000 -1.95000',
  '  50.60200 -1.94100',
  'end line',
  'layer tss-casquets',
  'area',
  '  49.72000 -2.50000',
  '  49.73000 -2.40000',
  '  49.68000 -2.42000',
  'end area',
  'end'
].join('\n');

(function () {
  var a = C.areas(AREAS);
  ok('a good areas file loads', a.ok, a.err);
  if (!a.ok) return;
  ok('it holds both shapes', a.shapes.length === 2);
  ok('a coastline stays a line, not a polygon', a.shapes[0].kind === 'line');
  ok('a traffic scheme is an area', a.shapes[1].kind === 'area');
  ok('every shape knows its layer',
     a.shapes[0].layer === 'coast-emodnet-mhw' && a.shapes[1].layer === 'tss-casquets');
  ok('the layers are listed once each', a.layers.join() === 'coast-emodnet-mhw,tss-casquets');
})();

refuses('an areas file with no source', AREAS.replace(/^source.*$/m, ''), C.areas,
        'where its shapes came from');
refuses('a shape before any layer', AREAS.replace('layer coast-emodnet-mhw\n', ''), C.areas,
        'must come after a layer');
refuses('a shape never closed', AREAS.replace('end line\n', ''), C.areas, 'never closed');
refuses('an area of two points', AREAS.replace('  49.68000 -2.42000\n', ''), C.areas,
        'at least three positions');
refuses('a layer name with a space', AREAS.replace('layer tss-casquets', 'layer tss casquets'),
        C.areas, 'one word with no spaces');

// ------------------------------------------------------------------- RUN
var RUN = [
  'RUN 1',
  'course example_race_2025.txt',
  'areas areas_example_2025.txt',
  'polar polar_70ft_v1.txt',
  'start class Class One',
  'step time 600 heading 5',
  'scale wind 1.0 current 1.0',
  'layers coast-emodnet-mhw tss-casquets',
  'clear coast-emodnet-mhw 0.10 tss-casquets 0',
  'round 0.10',
  'gate St Albans Head 50.57800 -2.05200 off 2.0',
  'end'
].join('\n');

(function () {
  var r = C.run(RUN);
  ok('a good run loads', r.ok, r.err);
  if (!r.ok) return;
  ok('the boat is named in the run, not the course', r.polar === 'polar_70ft_v1.txt');
  ok('the start is chosen by class', r.start.by === 'class' && r.start.name === 'Class One');
  ok('a teaching gate is a run property', r.gates.length === 1 && r.gates[0].off === 2);
  ok('a gate name with spaces survives', r.gates[0].name === 'St Albans Head');
  ok('clearance is per layer', r.clear['coast-emodnet-mhw'] === 0.1 && r.clear['tss-casquets'] === 0);
  ok('a legal boundary may take zero clearance', r.clear['tss-casquets'] === 0);
  ok('scale defaults to as-given when written so', r.scale.current === 1);
})();

refuses('a run with no boat', RUN.replace(/^polar.*$/m, ''), C.run, 'must name a polar');
refuses('a run that chooses no start', RUN.replace(/^start.*$/m, ''), C.run, 'must choose a start');
refuses('a run with no rounding distance', RUN.replace(/^round.*$/m, ''), C.run, 'how close counts');
refuses('a heading step of a whole quadrant', RUN.replace('heading 5', 'heading 120'), C.run,
        'at most 90 degrees');
refuses('a clearance on water the run is not looking at',
        RUN.replace('layers coast-emodnet-mhw tss-casquets', 'layers coast-emodnet-mhw'),
        C.run, 'not in layers');
refuses('a negative scale', RUN.replace('current 1.0', 'current -1'), C.run, 'zero or more');
refuses('a run cut short before end', RUN.replace(/\nend$/, ''), C.run, 'cut short');

// ------------------------------------------------- the one cross-file check
(function () {
  var c = C.course(GOOD), a = C.areas(AREAS), r = C.run(RUN);
  ok('a run naming a class the course lists passes', C.check(r, c, [a]).ok);

  var r2 = C.run(RUN.replace('start class Class One', 'start class Class Two'));
  var v = C.check(r2, c, [a]);
  ok('a run naming a class the course does not list is caught',
     !v.ok && v.err.indexOf('does not list') >= 0, v.err);

  var r3 = C.run(RUN.replace('layers coast-emodnet-mhw tss-casquets',
                             'layers coast-gshhg tss-casquets')
                    .replace('clear coast-emodnet-mhw 0.10 ', 'clear '));
  var v3 = C.check(r3, c, [a]);
  ok('a run asking for a layer no areas file holds is caught',
     !v3.ok && v3.err.indexOf('none of its areas files holds') >= 0, v3.err);
})();

// --------------------------------------------- the line conversion itself
(function () {
  //  0.1 nm due north is a sixtieth of a degree of latitude and no
  //  change of longitude. If this is wrong every finish line is wrong.
  var p = C.along({ lat: 50, lon: -1 }, 0, 0.1);
  ok('due north moves latitude only',
     Math.abs(p.lat - (50 + 0.1 / 60)) < 1e-9 && Math.abs(p.lon + 1) < 1e-9,
     JSON.stringify(p));
  //  due east at 50N: a mile of longitude is a mile / cos(50)
  var q = C.along({ lat: 50, lon: -1 }, 90, 1);
  ok('due east scales longitude by the cosine of the latitude',
     Math.abs(q.lat - 50) < 1e-9 &&
     Math.abs(q.lon - (-1 + (1 / 60) / Math.cos(50 * Math.PI / 180))) < 1e-9,
     JSON.stringify(q));
})();

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

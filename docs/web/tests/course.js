//  COURSE 1, AREAS 1, RUN 1 to RUN 3 and CREW 1: what they accept and what
//  they refuse.
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
refuses('a run with no rounding distance', RUN.replace(/^round.*$/m, ''), C.run, 'how far off she rounds');
refuses('a heading step of a whole quadrant', RUN.replace('heading 5', 'heading 120'), C.run,
        'at most 90 degrees');
refuses('a clearance on water the run is not looking at',
        RUN.replace('layers coast-emodnet-mhw tss-casquets', 'layers coast-emodnet-mhw'),
        C.run, 'not in layers');
refuses('a negative scale', RUN.replace('current 1.0', 'current -1'), C.run, 'zero or more');
refuses('a run cut short before end', RUN.replace(/\nend$/, ''), C.run, 'cut short');

// ------------------------------------------------------------------ RUN 2
//  RUN 2 adds the weather to the experiment and splits the gate's `off`
//  into two verbs. RUN 1 keeps being read, which is half of what a
//  version change is for, so both shapes are checked here.
var RUN2 = RUN
  .replace('RUN 1', 'RUN 2')
  .replace('polar polar_70ft_v1.txt',
           'polar polar_70ft_v1.txt\nwind wind_20250524_00z.grid\ncurrent current_20250524.grid')
  .replace('gate St Albans Head 50.57800 -2.05200 off 2.0',
           'gate Example Head 50.57800 -2.05200 within 2.0\navoid Example Race 50.51000 -2.44000 off 3.0');

(function () {
  var r = C.run(RUN2);
  ok('a good RUN 2 loads', r.ok, r.err);
  if (!r.ok) return;
  ok('it knows which version it is', r.version === 2);
  ok('the run names its wind and its current',
     r.wind === 'wind_20250524_00z.grid' && r.current === 'current_20250524.grid');
  ok('a gate says how close to pass', r.gates[0].rule === 'within' && r.gates[0].nm === 2);
  ok('and an avoid says how far to stay off', r.gates[1].rule === 'avoid' && r.gates[1].nm === 3);
  ok('both keep their names', r.gates[0].name === 'Example Head' && r.gates[1].name === 'Example Race');
  var r1 = C.run(RUN);
  ok('a RUN 1 file still loads, and is not given a rule it never had',
     r1.ok && r1.version === 1 && r1.gates[0].off === 2 && !r1.gates[0].rule, r1.err);
})();

refuses('a RUN 2 with no wind grid', RUN2.replace(/^wind.*$/m, ''), C.run, 'must name its wind grid');
refuses('a RUN 2 with no current grid', RUN2.replace(/^current.*$/m, ''), C.run, 'must name its current grid');
refuses('a RUN 1 that names a grid anyway', RUN.replace('polar polar_70ft_v1.txt',
        'polar polar_70ft_v1.txt\nwind wind.grid'), C.run, 'RUN 2 line');
refuses('a RUN 2 gate still written the RUN 1 way',
        RUN2.replace('within 2.0', 'off 2.0'), C.run, 'avoid');
refuses('an avoid in a RUN 1 file', RUN.replace('round 0.10',
        'round 0.10\navoid X 50.0 -2.0 off 1.0'), C.run, 'RUN 2 line');
refuses('a first line that is none of the versions', RUN.replace('RUN 1', 'RUN 4'), C.run,
        '"RUN 1", "RUN 2" or "RUN 3"');

//  The grids a run named, against the grids that were loaded. A filename
//  is not evidence: the kind is in each grid's own header, so swapping
//  the two files is caught and swapping their names is not pretended to
//  be caught.
(function () {
  var wind    = { ok: true, meta: { kind: 'wind' } };
  var current = { ok: true, meta: { kind: 'current' } };
  var r = C.run(RUN2), r1 = C.run(RUN);

  ok('the right two grids pass', C.checkGrids(r, { wind: wind, current: current }).ok);

  var v = C.checkGrids(r, { wind: current, current: wind });
  ok('two grids swapped are caught by what they say they are',
     !v.ok && v.err.indexOf('says kind current') >= 0, v.err);

  var v2 = C.checkGrids(r, { wind: wind });
  ok('a grid the run names and nobody loaded is caught',
     !v2.ok && v2.err.indexOf('was not loaded') >= 0, v2.err);

  //  the one the level exists for
  var upper = { ok: true, meta: { kind: 'wind', version: 2, level: '925hPa' } };
  var vu = C.checkGrids(r, { wind: upper, current: current });
  ok('an upper wind handed in as the surface wind is refused',
     !vu.ok && vu.err.indexOf('925hPa wind') >= 0, vu.err);

  var surf = { ok: true, meta: { kind: 'wind', version: 2, level: 'surface', method: 'model' } };
  ok('and a GRID 2 surface wind is accepted',
     C.checkGrids(r, { wind: surf, current: current }).ok);

  var v3 = C.checkGrids(r, { wind: wind, current: { ok: false, err: 'rows says 10, the file has 9' } });
  ok('a grid that did not load is reported with its own reason',
     !v3.ok && v3.err.indexOf('rows says 10') >= 0, v3.err);

  ok('a RUN 1 file names no grids, so there is nothing to check',
     C.checkGrids(r1, null).ok);
})();

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

//  ---- CREW 1: how well she is tacked and gybed ---------------------
//  Round numbers, so the means can be done in the head:
//    able   tacks  90% at 30 s and 10% at 300 s:  27 + 30  =  57 s
//           gybes  80% at 60 s and 20% at 600 s:  48 + 120 = 168 s
//    green  tacks  50% at 60 s and 50% at 600 s:  30 + 300 = 330 s
//           gybes  50% at 120 s and 50% at 900 s: 60 + 450 = 510 s
(function () {
  var CREW = [
    'CREW 1',
    '#  an invented crew, for the reader',
    'grades   clean   blown',
    'level able    90 30    10 300',
    'gybe  able    80 60    20 600',
    'level green   50 60    50 600',
    'gybe  green   50 120   50 900',
    'end'
  ].join('\n') + '\n';
  function not(what, text, fragment) {
    var r = C.crew(text);
    ok(what, !r.ok && String(r.err).indexOf(fragment) >= 0, r.ok ? 'it was accepted' : r.err);
  }
  var c = C.crew(CREW);
  ok('a crew file reads', c.ok, c.err);
  if (!c.ok) return;
  ok('the grades are read, best first', c.grades.join(' ') === 'clean blown');
  ok('and the levels, in the order written', c.levels.map(function (l) { return l.name; }).join(' ') === 'able green');
  var able = c.level('able'), green = c.level('green');
  ok('a level is found by name, and one that is not there is not', able && green && c.level('crack') === null);
  ok('the shares and the times are kept apart', able.tack.share.join(' ') === '90 10' && able.tack.lost.join(' ') === '30 300');
  ok('the mean cost of a tack is the shares times the times: 27 + 30 = 57 s', Math.abs(able.tack.mean - 57) < 1e-9, String(able.tack.mean));
  ok('a gybe has its own line and its own mean: 48 + 120 = 168 s', Math.abs(able.gybe.mean - 168) < 1e-9, String(able.gybe.mean));
  ok('each level has its own', Math.abs(green.tack.mean - 330) < 1e-9 && Math.abs(green.gybe.mean - 510) < 1e-9);
  ok('CRLF reads the same', C.crew(CREW.replace(/\n/g, '\r\n')).ok);
  ok('shares may be fractions, so long as they add to 100',
     C.crew(CREW.replace('90 30    10 300', '99.5 30    0.5 300')).ok);

  not('shares that do not add to 100 are refused, and the sum is said',
      CREW.replace('90 30', '80 30'), 'add up to 90, not 100');
  not('and so are a gybe line\'s', CREW.replace('80 60', '85 60'), 'add up to 105, not 100');
  ok('the refusal says which line', C.crew(CREW.replace('90 30', '80 30')).line === 4);
  not('a level with no gybe line is refused: no gybe is costed by a rule the file does not state',
      CREW.replace('gybe  green   50 120   50 900\n', ''), 'the level "green" has no gybe line');
  not('a gybe line for a level that is not there', CREW.replace('gybe  green', 'gybe  grene'), 'no level "grene" above it');
  not('a level given twice', CREW.replace('level green', 'level able'), 'the level "able" is given twice');
  not('its gybes given twice', CREW.replace('gybe  green', 'gybe  able'), 'the gybes of "able" are given twice');
  not('too few numbers for the grades', CREW.replace('90 30    10 300', '90 30    10'), '4 numbers, and this line has 3');
  not('a share over 100', CREW.replace('90 30    10 300', '190 30    10 300'), 'not a share between 0 and 100');
  not('a time that is not a number', CREW.replace('10 300', '10 slow'), 'not a time lost, in seconds');
  not('a negative time', CREW.replace('10 300', '10 -300'), 'not a time lost, in seconds');
  not('a level before the grades', CREW.replace('grades   clean   blown\n', '').replace('end', 'grades clean blown\nend'),
      'the grades line must come before the first level');
  not('a grade named twice', CREW.replace('grades   clean   blown', 'grades   clean   clean'), 'named twice');
  not('no levels at all', 'CREW 1\ngrades clean blown\nend\n', 'at least one level');
  not('a file cut short', CREW.replace('end\n', ''), 'does not end with "end"');
  not('a line it does not know', CREW.replace('end', 'reef green 50 50\nend'), 'unknown line "reef"');
  not('a later version', CREW.replace('CREW 1', 'CREW 2'), 'this reader knows CREW 1');
  not('a file that is not a crew file', 'RUN 2\nend\n', 'the first line must be "CREW 1"');

  //  the run's line, and the check that spans the two files
  function runWith(lines, ver) {
    return C.run([ver || 'RUN 3', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current s.grid', 'start at 2025-05-24T00:00Z',
                  'step time 600 heading 5', 'round 0.10'].concat(lines).concat(['end']).join('\n'));
  }
  var rn = runWith(['crew crew_x.txt able']);
  ok('a run names its crew file and a level', rn.ok && rn.crew.file === 'crew_x.txt' && rn.crew.level === 'able', rn.err);
  ok('a run that names none has none, and is still a run', runWith([]).ok && runWith([]).crew === null &&
     runWith([]).version === 3);
  //  RUN 3 IS RUN 2 AND THIS ONE LINE. A RUN 2 file with a crew in it is
  //  refused, so that no reader can take the file for a RUN 2, skip the
  //  line, and sail her with free tacks.
  var two2 = runWith(['crew crew_x.txt able'], 'RUN 2');
  ok('crew in a RUN 2 file is refused, and the refusal says which version it belongs to',
     !two2.ok && two2.err === 'crew is a RUN 3 line; this file says RUN 2', two2.err);
  ok('a RUN 2 file without one still reads, as RUN 2', runWith([], 'RUN 2').ok && runWith([], 'RUN 2').version === 2);
  ok('everything RUN 2 requires, RUN 3 requires',
     !C.run('RUN 3\ncourse c.txt\npolar p.txt\nstart at 2025-05-24T00:00Z\nstep time 600 heading 5\nround 0.10\nend\n').ok);
  ok('crew wants a file and a level', !runWith(['crew crew_x.txt']).ok && /crew <file> <level>/.test(runWith(['crew crew_x.txt']).err));
  ok('a run has one crew', !runWith(['crew a.txt able', 'crew b.txt green']).ok);
  var old = C.run(['RUN 1', 'course c.txt', 'polar p.txt', 'start at 2025-05-24T00:00Z', 'step time 600 heading 5',
                   'round 0.10', 'crew k.txt able', 'end'].join('\n'));
  ok('nor is it a RUN 1 line', !old.ok && old.err === 'crew is a RUN 3 line; this file says RUN 1', old.err);

  ok('a run with no crew needs no crew file', C.checkCrew(runWith([]), null).ok);
  ok('a run whose level is in the file passes', C.checkCrew(rn, c).ok);
  var k1 = C.checkCrew(rn, null), k2 = C.checkCrew(runWith(['crew crew_x.txt crack']), c),
      k3 = C.checkCrew(rn, C.crew('nonsense'));
  ok('a crew file that was not loaded is said', !k1.ok && /crew_x\.txt, which was not loaded/.test(k1.err), k1.err);
  ok('a level the file does not give is said, with the ones it does',
     !k2.ok && /crew level "crack", which crew_x\.txt does not give; it has able, green/.test(k2.err), k2.err);
  ok('a crew file that did not read is said, in its reader\'s words', !k3.ok && /crew_x\.txt did not load: /.test(k3.err), k3.err);
})();

//  ---- the passage file: PASSAGE 1, and the run's `passage` line -----
//  Larry, 13 November 2026: the figures of a lesson live in a passage
//  file of named plans; each mark has its berth there; a place she
//  must pass is a `pass` line, a line when it has a compass word and a
//  circle when it has none; the mark that ends the finish line takes
//  no berth.  Two invented courses: Alpha then Bravo, finishing apart
//  from both; and Alpha then Home Buoy, which is one end of the finish.
(function () {
  var CRS = C.course(['COURSE 1', 'name An invented course', 'source Invented for this test. Not a real course.',
    'start line 50.0 -1.0 to 50.01 -1.0 cross west', 'start class All 2025-05-24T10:00Z',
    'mark Alpha 50.0 -2.0 port', 'mark Bravo 50.5 -2.5 port',
    'finish line 50.0 -1.1 to 50.01 -1.1 cross east', 'end'].join('\n'));
  var PIN = C.course(['COURSE 1', 'name An invented course with a pin', 'source Invented for this test. Not a real course.',
    'start line 50.0 -1.0 to 50.01 -1.0 cross west', 'start class All 2025-05-24T10:00Z',
    'mark Alpha 50.0 -2.0 port', 'mark Home Buoy 50.0 -1.1 starboard',
    'finish line 50.0 -1.1 bearing 000 length 0.10 cross east', 'end'].join('\n'));
  ok('the two invented courses read', CRS.ok && PIN.ok, CRS.err || PIN.err);
  ok('the mark that is one end of the finish line is found, and only there',
     C.finishPin(PIN) === 'Home Buoy' && C.finishPin(CRS) === null, C.finishPin(PIN) + ' / ' + C.finishPin(CRS));

  function pf(lines) { return C.passage(['PASSAGE 1'].concat(lines).concat(['end']).join('\n')); }
  function shape(plan) {
    return plan.items.map(function (it) { return it.kind.charAt(0) + ':' + it.name; }).join(' | ');
  }
  var NEAR = ['plan near', 'pass Near Head 50.1 -1.5 within 2.0', 'mark Alpha berth 0.15',
              'pass Far Head 50.3 -2.2 south within 1.5', 'mark Bravo berth 0.10', 'pass Near Head 50.1 -1.5 within 2.0'];
  var BARE = ['plan bare', 'mark Alpha berth 0.20', 'mark Bravo berth 0.05'];
  var p = pf(NEAR.concat(BARE));
  ok('a passage file with two plans reads', p.ok, p.err);
  if (p.ok) {
    ok('its plans are kept in the order written', p.order.join(' ') === 'near bare', p.order.join(' '));
    ok('a plan keeps its marks and passes in the order written',
       shape(p.plans.near) === 'p:Near Head | m:Alpha | p:Far Head | m:Bravo | p:Near Head', shape(p.plans.near));
    ok('each mark keeps its own berth', p.plans.near.items[1].berth === 0.15 && p.plans.near.items[3].berth === 0.1 &&
       p.plans.bare.items[0].berth === 0.2 && p.plans.bare.items[1].berth === 0.05);
    ok('a pass with a compass word keeps it, and one without has none',
       p.plans.near.items[2].dir === 'south' && p.plans.near.items[2].nm === 1.5 && p.plans.near.items[0].dir === null);
    ok('a pass keeps its point, and a name with spaces', p.plans.near.items[0].name === 'Near Head' &&
       p.plans.near.items[0].lat === 50.1 && p.plans.near.items[0].lon === -1.5 && p.plans.near.items[0].nm === 2);
    ok('every compass word reads', ['north', 'east', 'south', 'west'].every(function (d) {
      var q = pf(['plan a', 'pass X 50.1 -1.5 ' + d + ' within 1.0']);
      return q.ok && q.plans.a.items[0].dir === d;
    }));
  }

  //  what the reader refuses, each with what it says
  function no(what, text, frag) {
    var r = typeof text === 'string' ? C.passage(text) : pf(text);
    ok(what, !r.ok && r.err.indexOf(frag) >= 0, r.ok ? 'it read' : r.err);
  }
  no('an empty file', '', 'empty');
  no('a first line that is not PASSAGE 1', 'PASSAGE 2\nplan a\nmark Alpha berth 0.10\nend\n', 'the first line must be "PASSAGE 1"');
  no('a file cut short', 'PASSAGE 1\nplan a\nmark Alpha berth 0.10\n', 'cut short');
  no('anything after end', 'PASSAGE 1\nplan a\nmark Alpha berth 0.10\nend\nplan b\n', 'nothing may follow');
  no('a file with no plan', [], 'at least one plan');
  no('a mark before any plan', ['mark Alpha berth 0.10', 'plan a', 'mark Bravo berth 0.10'], 'belongs to a plan');
  no('a plan written twice', ['plan a', 'mark Alpha berth 0.10', 'plan a', 'mark Alpha berth 0.10'], 'written twice');
  no('a plan with nothing in it', ['plan a', 'plan b', 'mark Alpha berth 0.10'], '"a" has nothing in it');
  no('a last plan with nothing in it', ['plan a', 'mark Alpha berth 0.10', 'plan b'], '"b" has nothing in it');
  no('a plan name of two words', ['plan two miles', 'mark Alpha berth 0.10'], 'one word');
  no('a berth under a twentieth of a mile', ['plan a', 'mark Alpha berth 0.04'], 'from 0.05 to 2.00');
  no('a berth over two miles', ['plan a', 'mark Alpha berth 2.01'], 'from 0.05 to 2.00');
  no('a berth to three decimals', ['plan a', 'mark Alpha berth 0.125'], 'at most two decimals');
  no('a berth with no figure before the point', ['plan a', 'mark Alpha berth .15'], 'at most two decimals');
  no('a berth that is not last on its line', ['plan a', 'mark Alpha berth 0.10 port'], 'with the berth last');
  no('a mark with no name', ['plan a', 'mark berth 0.10'], 'needs the name');
  ok('the two ends of the berth\'s range are allowed', pf(['plan a', 'mark Alpha berth 0.05', 'mark Bravo berth 2.00']).ok);
  no('a pass with a bearing for a compass word', ['plan a', 'pass X 50.1 -1.5 southwest within 1.0'],
     '"southwest" is not north, east, south or west');
  no('a pass that says "off"', ['plan a', 'pass X 50.1 -1.5 off 1.0'], 'a pass is "pass <name> <lat> <lon> within <nm>"');
  no('a pass of no distance', ['plan a', 'pass X 50.1 -1.5 within 0'], 'must be positive');
  no('a pass with no name', ['plan a', 'pass 50.1 -1.5 south within 1.0'], 'needs a name');
  no('a pass in Africa', ['plan a', 'pass X 150.1 -1.5 within 1.0'], 'not between -90 and 90');
  no('a gate line, which a passage file does not have', ['plan a', 'gate X 50.1 -1.5 within 1.0'], 'unknown line "gate"');

  //  THE RUN'S `passage` LINE, AND ONE PLACE FOR A BERTH
  function runOf(lines, ver, noRound) {
    return C.run([ver || 'RUN 3', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current s.grid', 'start class All',
                  'step time 600 heading 5'].concat(noRound ? [] : ['round 0.10']).concat(lines).concat(['end']).join('\n'));
  }
  var r = runOf(['passage f.txt near'], 'RUN 3', true);
  ok('a run that names a passage and no round reads', r.ok && r.passage.file === 'f.txt' && r.passage.plan === 'near' &&
     r.round === null, r.err);
  var r2 = runOf(['passage f.txt near'], 'RUN 2', true);
  ok('passage is a RUN 3 line: a RUN 2 file with one is refused, and told which version',
     !r2.ok && r2.err === 'passage is a RUN 3 line; this file says RUN 2', r2.err);
  var both = runOf(['passage f.txt near']);
  ok('a run that names a passage and says round as well is refused, and both lines are named',
     !both.ok && /names a passage \(line 9\), which gives each mark its own berth, so it may not also say "round"/.test(both.err) &&
     both.line === 8, both.err + ' at line ' + both.line);
  var neither = runOf([], 'RUN 3', true);
  ok('a run with neither is refused, and told it may have either',
     !neither.ok && /"round <nm>", or name a passage/.test(neither.err), neither.err);
  ok('passage takes a file and a plan', !runOf(['passage f.txt'], 'RUN 3', true).ok &&
     /"passage <file> <plan>"/.test(runOf(['passage f.txt'], 'RUN 3', true).err));
  ok('a run sails one passage', /sails one passage/.test(runOf(['passage f.txt a', 'passage f.txt b'], 'RUN 3', true).err));
  var ml = runOf(['passage f.txt near', 'mark Alpha'], 'RUN 3', true);
  ok('a mark line in a run is refused, and told where marks are placed now',
     !ml.ok && /a mark is placed in a passage file, with its berth/.test(ml.err), ml.err);

  //  A GATE IN A RUN IS READ, AND REFUSED BY THE CHECK
  var gr = runOf(['gate Near Head 50.1 -1.5 within 2.0'], 'RUN 2');
  ok('a RUN 2 gate still reads, so the file says what it means', gr.ok && gr.gates[0].rule === 'within', gr.err);
  var gk = C.check(gr, CRS, []);
  ok('and the check refuses it, naming its line and what replaced it',
     !gk.ok && /^line 9 is a gate, which a run no longer sails: a place she must pass is "pass/.test(gk.err), gk.err);
  ok('a run that only keeps off things still passes the check',
     C.check(runOf(['avoid The Race 50.2 -1.8 off 3.0']), CRS, []).ok);

  //  THE PASSAGE AGAINST THE COURSE
  function chk(lines, course, plan) {
    var q = pf(lines);
    if (!q.ok) return { ok: false, err: 'the test wrote a bad passage: ' + q.err };
    return C.checkPassage(runOf(['passage f.txt ' + (plan || 'a')], 'RUN 3', true), q, course || CRS);
  }
  ok('a run with no passage needs no passage check', C.checkPassage(runOf([]), null, CRS).ok);
  var k = chk(NEAR.concat(BARE), CRS, 'near');
  ok('both plans of the good file pass the check against the course', k.ok, k.err);
  k = chk(NEAR, CRS, 'far');
  ok('a plan the file does not have is named, with the ones it does',
     !k.ok && /plan "far", which f\.txt does not have; it has near/.test(k.err), k.err);
  k = C.checkPassage(runOf(['passage f.txt a'], 'RUN 3', true), null, CRS);
  ok('a passage file that was not loaded is said', !k.ok && /f\.txt, which was not loaded/.test(k.err), k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10']);
  ok('a plan must place EVERY mark: one left out cannot be told from one forgotten',
     !k.ok && /plan "a" does not place "Bravo"; every mark of the course appears in every plan/.test(k.err), k.err);
  k = chk(['plan a', 'mark Bravo berth 0.10', 'mark Alpha berth 0.10']);
  ok('marks out of the course\'s order are refused, at the line that is out of turn',
     !k.ok && /^f\.txt, line 3: plan "a" places "Bravo" where the course rounds "Alpha" next/.test(k.err), k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Alpha berth 0.10', 'mark Bravo berth 0.10']);
  ok('a mark placed twice where the course rounds it once is refused at the second',
     !k.ok && /line 4: plan "a" places "Alpha" where the course rounds "Bravo" next/.test(k.err), k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Bravo berth 0.10', 'mark Bravo berth 0.10']);
  ok('and one placed again after the last is refused',
     !k.ok && /line 5: plan "a" places "Bravo" again, after every mark of the course/.test(k.err), k.err);
  //  A COURSE THAT ROUNDS ONE BUOY TWICE: Alpha, Bravo, Alpha.  Its plan
  //  places Alpha twice, and may give it a different berth each time.
  var TWICE = C.course(['COURSE 1', 'name An invented course round one buoy twice', 'source Invented for this test. Not a real course.',
    'start line 50.0 -1.0 to 50.01 -1.0 cross west', 'start class All 2025-05-24T10:00Z',
    'mark Alpha 50.0 -2.0 port', 'mark Bravo 50.5 -2.5 port', 'mark Alpha 50.0 -2.0 port',
    'finish line 50.0 -1.1 to 50.01 -1.1 cross east', 'end'].join('\n'));
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Bravo berth 0.10', 'mark Alpha berth 0.30'], TWICE);
  ok('a course that rounds one buoy twice has a plan that places it twice', TWICE.ok && k.ok, TWICE.err || k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Bravo berth 0.10'], TWICE);
  ok('and one that places it once is refused', !k.ok && /does not place "Alpha"/.test(k.err), k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Charlie berth 0.10', 'mark Bravo berth 0.10']);
  ok('a mark the course does not have is named, with the ones it does',
     !k.ok && /the course has no mark "Charlie"; it has Alpha, Bravo/.test(k.err), k.err);
  k = chk(['plan a', 'mark Alpha', 'mark Bravo berth 0.10']);
  ok('a mark with no berth is refused', !k.ok && /line 3: plan "a" gives Alpha no berth/.test(k.err), k.err);
  k = chk(['plan good', 'mark Alpha berth 0.10', 'mark Bravo berth 0.10', 'plan bad', 'mark Alpha berth 0.10'], CRS, 'good');
  ok('a fault in a plan the run does not sail is refused all the same',
     !k.ok && /plan "bad" does not place "Bravo"/.test(k.err), k.err);
  //  the mark that ends the finish line
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Home Buoy'], PIN);
  ok('the mark that ends the finish line is placed with no berth', k.ok, k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Home Buoy berth 0.10'], PIN);
  ok('a berth on the mark that ends the finish line is refused, and told why',
     !k.ok && /Home Buoy is the end of the finish line, and takes no berth: a berth round it would cover the line she must cross/.test(k.err), k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10', 'mark Home Buoy', 'pass Late 50.0 -1.3 within 1.0'], PIN);
  ok('nothing may come after it', !k.ok && /nothing may come after Home Buoy, which is the end of the finish line/.test(k.err), k.err);
  k = chk(['plan a', 'mark Alpha berth 0.10', 'pass Last 50.0 -1.3 within 1.0', 'mark Home Buoy'], PIN);
  ok('a pass on the way to it is fine', k.ok, k.err);
})();

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

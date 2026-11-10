//  The polar: what it reads, what it interpolates, and what it refuses
//  to guess.
//
//  The refusals matter more than the arithmetic. A polar that invents a
//  speed closer to the wind than its table goes will send a router
//  beating to windward in a straight line, and the route will arrive
//  hours early on paper and be wrong in a way that looks like skill.
//
//  The table below is written here rather than taken from the course's
//  file: this check is about the reader, and a fixture with round
//  numbers can be checked in your head.
//
//    node docs/web/tests/polar.js
'use strict';
var POLAR = require('../route/polar.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol || 1e-12); }

//  Round numbers, so every expected answer below can be done by eye.
var TXT = [
  '#  a toy polar, for the reader',
  'twa/tws\t5\t10\t20',
  '50\t4\t6\t8',
  '90\t6\t10\t14',
  '150\t2\t4\t10',
  '#  beat_angle\t40\t38\t36',
  '#  beat_vmg\t3\t4.5\t6'
].join('\n') + '\n';

var p = POLAR.parse(TXT);
ok('a polar parses', p.ok, p.err);
if (!p.ok) { console.log('  cannot go on'); process.exit(1); }

ok('the wind speeds are read', p.tws.join(' ') === '5 10 20', p.tws.join(' '));
ok('the angles are read', p.twa.join(' ') === '50 90 150', p.twa.join(' '));
ok('the optimum beat angles come off the comment lines',
   p.beat_angle && p.beat_angle.join(' ') === '40 38 36', JSON.stringify(p.beat_angle));
ok('and so does the beat VMG', p.beat_vmg && p.beat_vmg.join(' ') === '3 4.5 6');
ok('a polar without them is still a polar',
   POLAR.parse('twa/tws\t5\n90\t6\n').ok);

function kt(a, w) { var r = POLAR.speed(p, a, w); return r === null ? null : r.kt; }

//  ---- 1. the table comes back as the table ------------------------
ok('a grid point is exactly the table', near(kt(90, 10), 10), kt(90, 10));
ok('a corner is exactly the table', near(kt(50, 5), 4), kt(50, 5));
ok('the far corner too', near(kt(150, 20), 10), kt(150, 20));

//  ---- 2. between ---------------------------------------------------
//  Half way from 5 to 10 knots at 90 degrees: half way from 6 to 10.
ok('half way along the wind axis', near(kt(90, 7.5), 8), kt(90, 7.5));
//  Half way from 50 to 90 degrees at 5 knots: half way from 4 to 6.
ok('half way along the angle axis', near(kt(70, 5), 5), kt(70, 5));
//  The middle of a cell: the average of its four corners when it is
//  the midpoint of both axes. 4, 6, 6, 10 -> 6.5.
ok('the middle of a cell is bilinear', near(kt(70, 7.5), 6.5), kt(70, 7.5));

//  ---- 3. symmetry about the wind ----------------------------------
ok('a negative angle is the same as a positive one', near(kt(-90, 10), 10));
ok('and so is one past 180', near(kt(270, 10), 10));

//  ---- 4. what it will NOT guess -----------------------------------
ok('closer to the wind than the table goes is NO DATA, not zero',
   kt(45, 10) === null, 'got ' + kt(45, 10));
ok('deeper than the table goes is no data either',
   kt(170, 10) === null, 'got ' + kt(170, 10));

//  Above the strongest wind in the table it clamps -- and SAYS it
//  clamped, so a route can report that it did rather than quietly
//  carrying a number from a different wind.
var hard = POLAR.speed(p, 90, 40);
ok('above the table it clamps to the last column', near(hard.kt, 14), hard.kt);
ok('and it says so', hard.clamped === true);
ok('inside the table it does not say so', POLAR.speed(p, 90, 10).clamped === false);

//  Below the lightest wind it runs to zero at zero wind, which is the
//  one extrapolation that is physically honest.
ok('half the lightest wind is half the speed', near(kt(90, 2.5), 3), kt(90, 2.5));
ok('no wind, no boat speed', near(kt(90, 0), 0), kt(90, 0));
ok('a negative wind is nothing at all', kt(90, -1) === null);

//  ---- 5. the refusals ---------------------------------------------
function refuses(what, text, needle) {
  var r = POLAR.parse(text);
  checks++;
  if (r.ok) { fail++; console.log('  FAIL  ' + what + '\n        it was accepted'); return; }
  if (needle && r.err.indexOf(needle) < 0) {
    fail++; console.log('  FAIL  ' + what + '\n        refused, but said: ' + r.err);
  }
}
refuses('an empty file', '', 'empty');
refuses('a header with no wind speeds', 'twa/tws\n', 'at least one wind speed');
refuses('a header with something that is not a number', 'twa/tws\tbreeze\n90\t6\n', 'not a wind speed');
refuses('winds that do not increase', 'twa/tws\t10\t5\n90\t6\t4\n', 'must increase');
refuses('a polar with no angles', 'twa/tws\t5\t10\n', 'no angles');
refuses('an angle past 180', 'twa/tws\t5\n190\t6\n', '0 to 180');
refuses('angles that do not increase', 'twa/tws\t5\n90\t6\n50\t4\n', 'must increase');
refuses('a row with too few speeds', 'twa/tws\t5\t10\n90\t6\n', 'for 2 wind speeds');
refuses('a row with too many', 'twa/tws\t5\n90\t6\t7\n', 'for 1 wind speeds');
refuses('a boat speed that is not a number', 'twa/tws\t5\n90\tfast\n', 'not a boat speed');
refuses('a negative boat speed', 'twa/tws\t5\n90\t-6\n', 'cannot be negative');
refuses('beat angles that do not match the wind speeds',
        'twa/tws\t5\t10\n90\t6\t10\n#  beat_angle\t40\n', 'for 2 wind speeds');

//  ---- 6. the shape of the file ------------------------------------
ok('blank lines and comments are ignored',
   POLAR.parse('\n#  hello\n\ntwa/tws\t5\n\n90\t6\n').ok);
ok('CRLF reads the same', POLAR.parse(TXT.replace(/\n/g, '\r\n')).ok);
ok('spaces work as well as tabs', POLAR.parse('twa/tws 5 10\n90 6 10\n').ok);

//  ---- 7. determinism ----------------------------------------------
ok('the same question twice gives the same answer',
   JSON.stringify(POLAR.speed(p, 83.7, 11.3)) === JSON.stringify(POLAR.speed(p, 83.7, 11.3)));

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

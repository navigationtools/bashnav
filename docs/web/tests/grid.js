//  GRID 1: what it accepts, and what it refuses.
//
//  The refusals are the point. Every one of them is a fault that would
//  otherwise surface as a ROUTE -- a boat sailing through a gap in the
//  wind, or an hour of stream applied to the wrong hour. A grid that is
//  wrong in a way nothing notices is worse than one that will not load,
//  because the router will draw a perfectly convincing track from it.
//
//  So each case below pairs a malformed file with the sentence it must
//  be refused with, and a test that only checked "it was refused" would
//  pass while the reader said something useless.
//
//    node docs/web/tests/grid.js
'use strict';
var GRID = require('../route/grid.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}

//  ---- a grid builder, so a case can change one thing -------------
function build(o) {
  o = o || {};
  var head = o.head !== undefined ? o.head : 'GRID 1';
  //  `o.x || default` would swallow an EMPTY string, and several cases
  //  below exist precisely to pass one. The first version of this file
  //  did exactly that, and the "no times" case quietly tested the
  //  default instead -- a test that passed by not running.
  function opt(v, d) { return v === undefined ? d : v; }
  var kind = opt(o.kind, 'wind');
  var fields = opt(o.fields, kind === 'wind' ? 'u v gust' : 'u v');
  var nf = fields.split(' ').length;
  var times = opt(o.times, '2025-05-24T00:00Z 2025-05-24T03:00Z');
  var lat = opt(o.lat, '49.0 49.5 0.25');
  var lon = opt(o.lon, '-6.0 -5.5 0.25');
  var nt = times === '' ? 0 : times.split(' ').length;
  var ny = o.ny || 3, nx = o.nx || 3;
  var rows = (o.rows !== undefined) ? o.rows : nt * ny * nx;
  var body = [], ti, yi, xi, k, row;
  var count = (o.count !== undefined) ? o.count : nt * ny * nx;
  var made = 0;
  for (ti = 0; ti < nt && made < count; ti++) {
    for (yi = 0; yi < ny && made < count; yi++) {
      for (xi = 0; xi < nx && made < count; xi++) {
        //  each cell carries its own indices, so at() can be checked
        row = [];
        row.push(ti * 100 + yi * 10 + xi);
        row.push(-(ti * 100 + yi * 10 + xi));
        for (k = 2; k < nf; k++) row.push(900 + k);
        body.push(row.join(' '));
        made++;
      }
    }
  }
  if (o.body) body = o.body;
  var L = [head];
  if (o.lines) { L = L.concat(o.lines); }
  else {
    L.push('kind ' + kind);
    L.push('units ' + opt(o.units, 'kt'));
    L.push('u ' + opt(o.u, 'east'));
    L.push('v ' + opt(o.v, 'north'));
    L.push('lat ' + lat);
    L.push('lon ' + lon);
    L.push('times ' + times);
    L.push('fields ' + fields);
    L.push('order ' + opt(o.order, 'time lat lon'));
    L.push('rows ' + rows);
  }
  return L.concat(body).join('\n') + '\n';
}

//  ---- 1. a good grid, and the index order it promises ------------
var g = GRID.parse(build());
ok('a wind grid parses', g.ok, g.err);
if (g.ok) {
  ok('it counts its rows', g.n === 18, 'got ' + g.n);
  ok('lat runs from the header', g.lat(0) === 49 && g.lat(2) === 49.5);
  ok('lon runs from the header', g.lon(0) === -6 && g.lon(2) === -5.5);
  //  THE ORDER CONTRACT, checked rather than trusted: every cell was
  //  written carrying its own indices, so if "time lat lon" means
  //  anything other than what the reader does, this fails.
  var bad = 0, ti, yi, xi, c;
  for (ti = 0; ti < 2; ti++) for (yi = 0; yi < 3; yi++) for (xi = 0; xi < 3; xi++) {
    c = g.at(ti, yi, xi);
    if (!c || c.u !== ti * 100 + yi * 10 + xi) bad++;
  }
  ok('every cell is where "order time lat lon" says it is', bad === 0, bad + ' cells wrong');
  ok('out of range gives nothing', g.at(9, 0, 0) === null && g.at(0, 9, 0) === null &&
     g.at(0, 0, -1) === null);
}

var cur = GRID.parse(build({ kind: 'current', fields: 'u v' }));
ok('a current grid parses with just u and v', cur.ok, cur.err);

//  ---- 2. comments, blank lines and CRLF --------------------------
var withNoise = build().replace('kind wind', '#  a comment\n\nkind wind');
ok('comments and blank lines are ignored', GRID.parse(withNoise).ok);
ok('CRLF is read the same', GRID.parse(build().replace(/\n/g, '\r\n')).ok);

//  ---- 3. the refusals --------------------------------------------
function refuses(what, text, needle) {
  var r = GRID.parse(text);
  checks++;
  if (r.ok) { fail++; console.log('  FAIL  ' + what + '\n        it was accepted'); return; }
  if (needle && r.err.indexOf(needle) < 0) {
    fail++;
    console.log('  FAIL  ' + what + '\n        refused, but said: ' + r.err);
  }
}

refuses('an empty file', '', 'empty');
refuses('something that is not a grid', 'hello\n', 'GRID 1');
refuses('a version we do not know', build({ head: 'GRID 2' }), 'GRID 1');
refuses('a header line twice', build().replace('units kt', 'units kt\nunits kt'), 'twice');
refuses('a header line we do not know', build().replace('units kt', 'units kt\ncolour red'), 'colour');
refuses('a kind that is neither', build({ kind: 'swell' }), 'wind or current');
refuses('metres per second', build({ units: 'm/s' }), 'kt');
refuses('u positive west', build({ u: 'west' }), 'east');
refuses('v positive up', build({ v: 'up' }), 'north');
refuses('a lat line with two numbers', build({ lat: '49.0 49.5' }), 'three numbers');
refuses('a zero step', build({ lat: '49.0 49.5 0' }), 'greater than zero');
refuses('a span that runs backwards', build({ lat: '49.5 49.0 0.25' }), 'smaller value');
refuses('a span that is not whole steps', build({ lat: '49.0 49.6 0.25' }), 'whole number of steps');
refuses('a latitude off the planet', build({ lat: '49.0 95.0 0.25' }), 'outside');
refuses('no times', build({ times: '' }), 'times is empty');
refuses('a time in the wrong shape', build({ times: '2025-05-24 06:00' }), 'not a time');
refuses('times out of order',
        build({ times: '2025-05-24T03:00Z 2025-05-24T00:00Z' }), 'must increase');
refuses('a time repeated',
        build({ times: '2025-05-24T00:00Z 2025-05-24T00:00Z' }), 'must increase');
refuses('fields that do not begin u v', build({ fields: 'v u gust' }), 'must begin');
refuses('gust on a current grid',
        build({ kind: 'current', fields: 'u v gust' }), 'no field "gust"');
refuses('another index order', build({ order: 'lat lon time' }), 'time lat lon');
refuses('a rows line that is not a number', build({ rows: 'many' }), 'whole number');
//  With the data gone as well, the reader runs out of header and says
//  so. With the data still there it reads the first data row as a
//  header line and complains about THAT, which is also correct and is
//  the next case.
refuses('a header that never says how many rows',
        build({ body: [] }).replace(/^rows .*$/m, ''), 'ends without a "rows" line');
refuses('a data row where a header line should be',
        build().replace(/^rows .*$/m, ''), 'GRID 1');

//  THE TWO COUNT CHECKS, which are the reason the format carries a
//  count at all.
refuses('a rows count the grid description contradicts',
        build({ rows: 17 }), 'latitudes x');
refuses('a file cut short', build({ count: 12 }), 'cut short');
refuses('a file with a row too many',
        build() + '1 2 3\n', 'more data rows');

refuses('a row with a value missing',
        build().replace(/^0 0 902$/m, '0 0'), 'fields asks for');
refuses('a row with text in it',
        build().replace(/^0 0 902$/m, 'north 0 902'), 'not a number');

//  ---- 4. "-" is no data, and it is not zero ----------------------
var dash = GRID.parse(build().replace(/^0 0 902$/m, '- - -'));
ok('a cell may say it has no data', dash.ok, dash.err);
if (dash.ok) {
  ok('and it reads back as nothing, not as zero', dash.at(0, 0, 0).u === null,
     'got ' + JSON.stringify(dash.at(0, 0, 0)));
}

//  ---- 5. the step arithmetic -------------------------------------
//  0.25-degree steps over two degrees is 8, not 7.999999999999999.
ok('steps come out whole at a quarter degree', GRID.steps(49, 51, 0.25) === 8);
ok('steps refuse a span that does not fit', GRID.steps(49, 51.1, 0.25) === -1);
ok('steps handle a negative origin', GRID.steps(-6, -1, 0.5) === 10);

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

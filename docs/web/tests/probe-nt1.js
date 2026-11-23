//  THE PROBE PAGE'S NT1 PANEL: what Larry's hike test will be shown.
//
//  Larry's ruling TBJB (23 November 2026). The panel has to tell him
//  whether every code read correctly, so this holds it to that:
//    1. an NT1 piece made by nt1.js reads as OK, with every record;
//    2. one character changed fails its check code, and says so;
//    3. a send with a piece not scanned says which piece is missing;
//    4. WG Log's form today (Deck Log records) is recognised as such;
//    5. anything else is reported, not dropped.
//
//    node docs/web/tests/probe-nt1.js
'use strict';
var NT1 = require('../deck-log/nt1.js');
var LOG = require('../deck-log/log.js');
var P = require('../platform/nt1panel.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}

//  a hike: an observation every 10 minutes, as Larry's test will log
var recs = [], m, ts;
for (m = 0; m < 9; m++) {
  ts = m < 6 ? '2026-11-23T16:' + m + '0Z' : '2026-11-23T17:' + (m - 6) + '0Z';
  recs.push(LOG.parse(LOG.make(ts, 'nav', [['lat','41 14.0N'],['lon','072 05.0W'],
    ['wdir','200'],['wspd', String(10 + m)],['wsrc','obs'],['who','LS'],['src','watch']])));
  recs.push(LOG.parse(LOG.make(ts, 'wx', [['mslp', (1012.4 - m / 10).toFixed(1)],
    ['tsrc','obs'],['who','LS'],['src','watch']])));
}
var enc = NT1.encode(recs, { seq: 6, size: 271 });
ok('the hike packs into more than one piece', enc.pieces.length > 1, enc.pieces.length + ' pieces');

var ref = new Date('2026-11-24T00:00Z');
var items = enc.pieces.map(function (p) { return P.read(p, ref); });
var nrec = 0;
items.forEach(function (it, n) {
  ok('piece ' + (n + 1) + ' is NT1 and its check code is OK', it.kind === 'nt1' && it.ok, it.err);
  nrec += it.records.length;
});
ok('every record comes back (' + recs.length + ')', nrec === recs.length, nrec + ' of ' + recs.length);
var first = items[0].records[0];
ok('fields are named', first.fields.some(function (f) { return f[0] === 'wspd'; }),
   JSON.stringify(first.fields));

var s = P.summary(items);
ok('summary: all OK, send complete', s.ok === items.length && s.failed === 0 &&
   s.sends['6'].missing.length === 0, JSON.stringify(s));

//  one piece not scanned
var s2 = P.summary(items.slice(1));
ok('a piece not scanned is named as missing', s2.sends['6'].missing.join(',') === '1',
   JSON.stringify(s2.sends));

//  one character changed in transit: the check code must catch it
var bent = enc.pieces[0].replace('1012.4', '1012.5');
ok('the test really changed a character', bent !== enc.pieces[0]);
var b = P.read(bent, ref);
ok('a changed character fails the check code', b.kind === 'nt1' && !b.ok && /check code/.test(b.err), b.err);
ok('and the summary counts it as FAILED', P.summary([b]).failed === 1);

//  WG Log's form today
var wg = '2026-11-04T03:00Z|nav|lat=41 14.0N|lon=072 05.0W|cog=096|crs=094|sog=7.9|wdir=225|wspd=20|wsrc=obs|sea=4|who=LS|src=watch|~\n' +
         '2026-11-04T03:00Z|wx|mslp=1012.4|ptend=7|pchg=-2.6|airt=18.0|tsrc=garmin|cloud=5|cl=1|cm=-|ch=-|src=watch|~';
var w = P.read(wg, ref);
ok('Deck Log records are recognised as WG Log\'s form', w.kind === 'records' && w.records.length === 2, JSON.stringify(w));

//  anything else
var o = P.read('https://example.com/', ref);
ok('anything else is reported, not dropped', o.kind === 'other' && !o.ok);
ok('and counted', P.summary([o]).other === 1);

console.log((fail ? '  ' + fail + ' FAILED of ' : '  all ') + checks + ' checks');
process.exit(fail ? 1 : 0);

//  NT1: every record through encode and decode, compared BYTE FOR BYTE.
//
//  This is the check the whole format exists to pass. Contract rule 3.1:
//  a record that arrives by inReach and the same record uploaded in port
//  must be identical, because deck-log's merge compares whole lines. One
//  byte different and every observation is in the log twice, flagged as
//  a conflict, for ever.
//
//    node docs/web/tests/nt1-roundtrip.js
'use strict';
var NT1 = require('../deck-log/nt1.js');
var LOG = require('../deck-log/log.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}

//  ---- the corpus ------------------------------------------------
//  Every value state the format claims to carry (contract 4.3, item 3),
//  every character the encoding has to survive, and the shapes that have
//  no weather or no position.
function mk(ts, type, pairs) { return LOG.make(ts, type, pairs); }

var CORPUS = [
  //  a full observation, the ordinary case
  mk('2026-11-04T03:00Z', 'nav', [['lat','41 14.0N'],['lon','072 05.0W'],['cog','096'],
      ['crs','094'],['sog','7.9'],['wdir','225'],['wspd','20'],['wsrc','obs'],
      ['sea','4'],['who','LS'],['src','watch']]),
  mk('2026-11-04T03:00Z', 'wx', [['mslp','1012.4'],['ptend','7'],['pchg','-2.6'],
      ['airt','18.0'],['seat','17.2'],['tsrc','garmin'],['cloud','5'],['cl','1'],
      ['cm','-'],['ch','-'],['vis','7'],['who','LS'],['src','watch']]),
  //  the four value states together: a value, 0 for none, - asked and not
  //  taken, / not observable
  mk('2026-11-04T06:00Z', 'nav', [['lat','41 20.0N'],['lon','072 11.0W'],
      ['wdir','-'],['wspd','0'],['sea','0'],['who','LS'],['src','watch']]),
  mk('2026-11-04T06:00Z', 'wx', [['mslp','1009.8'],['ptend','8'],['pchg','-2.6'],
      ['airt','17.0'],['cloud','/'],['cl','-'],['cm','-'],['ch','-'],['vis','0'],
      ['who','LS'],['src','watch']]),
  //  no weather at all: nav only
  mk('2026-11-04T09:00Z', 'nav', [['lat','41 31.0N'],['lon','072 24.0W'],['cog','040'],
      ['sog','6.1'],['who','LS'],['src','watch']]),
  //  swell, and a key the positional list does not hold (dewp travels as
  //  an extra, contract 4.6 item 2)
  mk('2026-11-04T12:00Z', 'wx', [['mslp','1006.0'],['ptend','8'],['pchg','-3.8'],
      ['airt','16.0'],['dewp','14.5'],['seat','16.8'],['tsrc','obs'],['cloud','8'],
      ['cl','7'],['cm','2'],['ch','-'],['vis','4'],['swdir','210'],['swper','9'],
      ['swht','2.5'],['who','LS'],['src','watch']]),
  mk('2026-11-04T12:00Z', 'nav', [['lat','41 44.0N'],['lon','072 40.0W'],['cog','035'],
      ['crs','030'],['sog','8.4'],['wdir','200'],['wspd','30'],['wsrc','obs'],
      ['sea','6'],['who','LS'],['src','watch']]),
  //  bio
  mk('2026-11-04T12:00Z', 'bio', [['hr','72'],['bb','45'],['stress','30'],['who','LS']]),
  //  a different observer, so the defaults line cannot cover everyone
  mk('2026-11-04T15:00Z', 'nav', [['lat','42 01.0N'],['lon','072 58.0W'],['cog','030'],
      ['sog','7.2'],['who','MB'],['src','watch']]),
];

//  ---- 1. the round trip -----------------------------------------
var recs = CORPUS.map(function (l) { return LOG.parse(l); });
var enc = NT1.encode(recs, { seq: 42, size: 1600 });

var got = [];
enc.pieces.forEach(function (p) {
  var d = NT1.decode(p, { ref: new Date('2026-11-05T00:00Z') });
  ok('piece decodes', d.ok, d.err);
  got = got.concat(NT1.lines(d));
});

var want = CORPUS.slice().sort();
var have = got.slice().sort();
ok('every record comes back', want.length === have.length,
   'sent ' + want.length + ', got ' + have.length);
for (var i = 0; i < Math.min(want.length, have.length); i++) {
  ok('byte identical: ' + want[i].substr(0, 28), want[i] === have[i],
     'want ' + want[i] + '\n        have ' + have[i]);
}

//  ---- 2. re-wrapping must not break it (contract 3.4) -----------
var flat = enc.pieces[0].replace(/\n/g, ' ');
var dflat = NT1.decode(flat, { ref: new Date('2026-11-05T00:00Z') });
ok('a piece with its line breaks replaced by spaces still decodes', dflat.ok, dflat.err);
ok('and gives the same records', JSON.stringify(NT1.lines(dflat)) ===
   JSON.stringify(NT1.lines(NT1.decode(enc.pieces[0], { ref: new Date('2026-11-05T00:00Z') }))));

var folded = enc.pieces[0].replace(/ /g, '\n   ');
ok('and folded the other way too',
   NT1.decode(folded, { ref: new Date('2026-11-05T00:00Z') }).ok);

//  ---- 3. the check code (CRC-16/CCITT-FALSE, contract v0.9) -----
//
//  The published test vector first. This is the check that lets the
//  watch be written in Monkey C from the specification instead of from
//  a reading of this file: if its CRC says 29B1 too, the two agree, and
//  nobody has to compare source.
ok('CRC-16/CCITT-FALSE of 123456789 is 29B1', NT1.crc16('123456789') === '29B1',
   'got ' + NT1.crc16('123456789'));
ok('and of the empty string is the initial value FFFF', NT1.crc16('') === 'FFFF',
   'got ' + NT1.crc16(''));

//  The worked example in the comment at the top of nt1.js carries a
//  code. A reader will trust it, so it has to stay true: this fails if
//  anyone edits the example records without recomputing it.
var EXBODY = 'D who=LS src=watch wsrc=garmin tsrc=garmin\n' +
  '11040300,41_14.0N,072_05.0W,096,094,7.9,225,20,4;1012.4,7,-2.6,18.0\n' +
  'B11040300,72,45,30';
ok('the example in the file header is a real code', NT1.crc16('42 1/2 ' + EXBODY) === 'B2FD',
   'got ' + NT1.crc16('42 1/2 ' + EXBODY));

var tampered = enc.pieces[0].replace('1012.4', '1012.5');
ok('a changed value is refused',
   NT1.decode(tampered, {}).err === 'check code does not match');

//  Truncation is the failure that actually happens -- a message cut by
//  a character limit, or a paste that caught part of the screen.
var cut = enc.pieces[0].substring(0, enc.pieces[0].length - 12);
ok('a piece cut short is refused', NT1.decode(cut, {}).err === 'check code does not match');

ok('the header carries NT1, the sequence and the piece',
   /^NT1 42 1\/[0-9]+ [0-9A-F]{4}$/.test(enc.pieces[0].split('\n')[0]),
   enc.pieces[0].split('\n')[0]);

//  ---- 4. values that have to survive ----------------------------
['41 14.0N', 'a,b', 'a;b', 'a_b', '100%', 'a b_c,d;e%f', '-', '/', '0'].forEach(function (v) {
  ok('value survives: ' + JSON.stringify(v), NT1.vdec(NT1.venc(v)) === v,
     JSON.stringify(NT1.venc(v)) + ' -> ' + JSON.stringify(NT1.vdec(NT1.venc(v))));
});

//  ---- 5. splitting into pieces ----------------------------------
var small = NT1.encode(recs, { seq: 7, size: 220 });
ok('a small piece size makes several pieces', small.pieces.length > 1,
   small.pieces.length + ' piece(s)');
small.pieces.forEach(function (p, n) {
  ok('piece ' + (n + 1) + ' is within the size', p.length <= 220, p.length + ' chars');
  ok('piece ' + (n + 1) + ' stands alone', NT1.decode(p,
     { ref: new Date('2026-11-05T00:00Z') }).ok);
});
var all = [];
small.pieces.forEach(function (p) {
  all = all.concat(NT1.lines(NT1.decode(p, { ref: new Date('2026-11-05T00:00Z') })));
});
ok('split into pieces, nothing is lost', all.slice().sort().join('\n') === want.join('\n'));

//  ---- 6. calm wind (contract 4.4, item 5) -----------------------
var calm = LOG.parse(mk('2026-11-04T18:00Z', 'nav',
  [['lat','42 10.0N'],['lon','073 02.0W'],['wspd','0'],['who','LS'],['src','watch']]));
var ce = NT1.encode([calm], { seq: 1 });
var cd = NT1.decode(ce.pieces[0], { ref: new Date('2026-11-05T00:00Z') });
ok('calm: wspd 0 with no wdir round-trips', NT1.lines(cd)[0] === calm.line,
   'want ' + calm.line + '\n        have ' + NT1.lines(cd)[0]);
ok('calm: wdir is still absent, not empty', cd.records[0].v.wdir === undefined);

//  ---- 7. a generated corpus -------------------------------------
//  The hand-written cases above are the ones somebody thought of. This
//  is the one that finds what nobody thought of: every combination of
//  present, absent, 0, '-' and '/' across the keys, with the awkward
//  characters sprinkled through, round-tripped in bulk.
var STATES = ['', '0', '-', '/', 'x'];
function val(k, n) {
  var st = STATES[n % STATES.length];
  if (st === '') return null;                 // absent
  if (st !== 'x') return st;                  // one of the three states
  if (k === 'lat') return '4' + (n % 10) + ' 1' + (n % 10) + '.0N';
  if (k === 'lon') return '07' + (n % 10) + ' 0' + (n % 10) + '.0W';
  if (k === 'note') return 'wind, gusting; _odd_ 100%';
  return String((n % 97) + (n % 7) / 10);
}
var gen = [], gi = 0, seed = 0;
for (var h = 0; h < 24; h++) {
  var ts = '2026-10-' + (h < 9 ? '0' : '') + (h + 1) + 'T0' + (h % 10) + ':00Z';
  var navP = [], wxP = [], bioP = [], kk;
  for (kk = 0; kk < NT1.NAV_ORDER.length; kk++) {
    var k1 = NT1.NAV_ORDER[kk], v1 = val(k1, seed++);
    if (v1 !== null) navP.push([k1, v1]);
  }
  for (kk = 0; kk < NT1.WX_ORDER.length; kk++) {
    var k2 = NT1.WX_ORDER[kk], v2 = val(k2, seed++);
    if (v2 !== null) wxP.push([k2, v2]);
  }
  for (kk = 0; kk < NT1.BIO_ORDER.length; kk++) {
    var k3 = NT1.BIO_ORDER[kk], v3 = val(k3, seed++);
    if (v3 !== null) bioP.push([k3, v3]);
  }
  if (navP.length) gen.push(mk(ts, 'nav', navP));
  if (wxP.length) gen.push(mk(ts, 'wx', wxP));
  if (bioP.length) gen.push(mk(ts, 'bio', bioP));
}

//  note is deliberately not sent (contract 4.3 item 7), so the
//  comparison is against the records with note removed -- which is
//  itself worth asserting rather than quietly allowing.
var sent = gen.map(function (L) {
  var r = LOG.parse(L);
  if (r.v.note === undefined) return L;
  var f = [], kz;
  for (kz = 0; kz < NT1.NAV_ORDER.length; kz++) {
    var kn = NT1.NAV_ORDER[kz];
    if (kn !== 'note' && r.v[kn] !== undefined) f.push([kn, r.v[kn]]);
  }
  return LOG.make(r.ts, r.type, f);
});

var g = NT1.encode(gen.map(function (L) { return LOG.parse(L); }),
                   { seq: 99, size: 400 });
var back = [];
g.pieces.forEach(function (p) {
  var dd = NT1.decode(p, { ref: new Date('2026-11-01T00:00Z') });
  ok('generated piece decodes', dd.ok, dd.err);
  back = back.concat(NT1.lines(dd));
});
var wantG = sent.slice().sort(), haveG = back.slice().sort();
ok('generated: same number of records', wantG.length === haveG.length,
   wantG.length + ' vs ' + haveG.length);
var bad = 0;
for (var z = 0; z < Math.min(wantG.length, haveG.length); z++) {
  if (wantG[z] !== haveG[z]) {
    if (bad < 3) console.log('  FAIL  generated mismatch\n        want ' + wantG[z] +
                             '\n        have ' + haveG[z]);
    bad++;
  }
}
ok('generated: every record byte identical (' + wantG.length + ' records)', bad === 0,
   bad + ' differed');

console.log((fail ? '  ' + fail + ' FAILED of ' : '  all ') + checks + ' checks');
process.exit(fail ? 1 : 0);

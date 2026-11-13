//  The passage log: rows folded into boards, boards into lines, and
//  beside each line what had changed since the one before.
//
//  The rows here are written by hand, in round numbers, so that every
//  expected answer can be done in the head: six ten-minute rows at nine
//  knots are an hour and nine miles; 242 less 233 is nine degrees
//  backed. Nothing below is copied from a run of the router.
//
//  THE CHECK THAT MATTERS MOST IS THE LAST BUT ONE. The log states
//  facts and never gives a reason (Larry, 13 November 2026), because
//  the router holds none. Section 9 reads every word this file made and
//  fails on a reason-word.
//
//    node docs/web/tests/passage.js
'use strict';
var PASSAGE = require('../route/passage.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}

var T0 = Date.UTC(2025, 4, 24, 10, 0, 0);

//  A row maker. Each call adds one ten-minute row after the last.
//  Unless told otherwise: wind 240 at 20 over ground and water alike,
//  nine knots through the water and made good, no stream to speak of,
//  the track the same as the heading.
//
//  THE MAKER WILL NOT TAKE A TACK THAT THE HEADING AND THE WIND DENY.
//  The first draft of section 9 called a boat heading 105 in a wind
//  from 259 "port"; she is on starboard, and the log dutifully printed
//  a 165-degree bear-away that was really a gybe. A fixture that can
//  lie teaches the checks to pass on nonsense, so this one cannot.
function maker() {
  var rows = [], clock = T0;
  function add(tack, heading, o) {
    o = o || {};
    var gwd = o.gwd === undefined ? 240 : o.gwd;
    var twa = ((heading - gwd + 180) % 360 + 360) % 360 - 180;
    if (!o.manoeuvre &&
        (Math.abs(twa) === 180 || twa === 0 || (twa > 0 ? 'port' : 'starboard') !== tack)) {
      throw new Error('fixture: heading ' + heading + ' in a wind from ' + gwd + ' is not ' + tack + ' tack');
    }
    var w = {
      ms: clock, minutes: o.minutes || 10,
      heading: heading, tack: tack, leg: o.leg || 0,
      gwd: gwd, gws: o.gws === undefined ? 20 : o.gws,
      twd: gwd, tws: o.tws === undefined ? (o.gws === undefined ? 20 : o.gws) : o.tws,
      twa: twa, stw: o.stw === undefined ? 9 : o.stw, sog: o.sog === undefined ? 9 : o.sog,
      cog: o.cog === undefined ? heading : o.cog,
      set: o.set === undefined ? 0 : o.set, drift: o.drift === undefined ? 0 : o.drift,
      noStream: !!o.noStream
    };
    if (o.noStream) { w.set = null; w.drift = null; }
    if (o.event) w.event = o.event;
    if (o.manoeuvre) { w.manoeuvre = o.manoeuvre; w.twa = o.manoeuvre === 'gybe' ? 180 : 0; w.polar = 'manoeuvre'; }
    clock += w.minutes * 60000;
    rows.push(w);
  }
  //  A manoeuvre row, as the router writes one: so many seconds with no
  //  way on, head to wind in a tack and stern to it in a gybe, on the
  //  tack she is going onto. No stream in these fixtures, so she does
  //  not move.
  add.man = function (kind, tack, seconds, o) {
    o = o || {};
    var gwd = o.gwd === undefined ? 240 : o.gwd;
    add(tack, (gwd + (kind === 'gybe' ? 180 : 0)) % 360,
        { gwd: gwd, minutes: seconds / 60, stw: 0, sog: 0, manoeuvre: kind });
  };
  add.many = function (n, tack, heading, o) { for (var i = 0; i < n; i++) add(tack, heading, o); };
  add.rows = rows;
  return add;
}
function kinds(r) { return r.lines.map(function (l) { return l.kind; }).join(' '); }
function words(l) { return l.changes.map(function (c) { return c.what + ':' + c.word; }).join(' | '); }

var texts = [];
function keep(r, opt) { var t = PASSAGE.text(r, opt); texts.push(t); return t; }

//  ---- 1. what it will not make a log of ---------------------------
ok('no rows is refused, with a reason', PASSAGE.log([]).ok === false &&
   /no rows/.test(PASSAGE.log([]).err));
ok('and so is nothing at all', PASSAGE.log(null).ok === false);
(function () {
  var a = maker(); a('port', 285); delete a.rows[0].sog;
  var r = PASSAGE.log(a.rows);
  ok('a row without a speed is named', !r.ok && r.err === 'row 1 has no sog', r.err);
  a = maker(); a('port', 285); a('port', 285); a.rows[1].minutes = 0;
  r = PASSAGE.log(a.rows);
  ok('a row that lasts no time is named', !r.ok && /^row 2 /.test(r.err), r.err);
})();

//  ---- 2. one board ------------------------------------------------
//  Six rows of ten minutes at nine knots: one hour, nine miles.
(function () {
  var a = maker(); a.many(6, 'port', 285);
  var r = PASSAGE.log(a.rows);
  ok('six rows on one tack are one board', r.ok && kinds(r) === 'start board', kinds(r));
  var b = r.lines[1];
  ok('an hour long', b.minutes === 60, String(b.minutes));
  ok('nine miles', b.nm === 9, String(b.nm));
  ok('nine knots made good and through the water', b.sog === 9 && b.stw === 9);
  ok('on port, heading 285', b.tack === 'port' && b.heading === 285);
  ok('45 degrees off the wind', b.offWind === 45, String(b.offWind));
  ok('it begins when the first row does', b.ms === T0 && r.lines[0].ms === T0);
  ok('and knows which rows it is', b.first === 0 && b.last === 5);
  ok('the first line has nothing to be compared with',
     b.changes.length === 0 && b.since === null && b.did === null);
})();

//  ---- 3. the board is weighed by time, and round the circle -------
(function () {
  //  Thirty minutes at 6 kt and ten at 12: 3 + 2 = 5 nm in 40 minutes,
  //  which is 7.5 kt. An average of the two speeds says 9.
  var a = maker();
  a('port', 285, { minutes: 30, sog: 6, stw: 6 });
  a('port', 285, { minutes: 10, sog: 12, stw: 12 });
  a.rows[1].ms = T0 + 30 * 60000;
  var b = PASSAGE.log(a.rows).lines[1];
  ok('speed made good is distance over time', b.nm === 5 && b.sog === 7.5, b.nm + ' ' + b.sog);
  ok('speed through the water is weighed by time', b.stw === 7.5, String(b.stw));

  //  350 and 010 average to north, not to south.
  a = maker(); a('port', 350, { gwd: 305 }); a('port', 10, { gwd: 325 });
  b = PASSAGE.log(a.rows).lines[1];
  ok('headings either side of north average to north', b.heading === 0, String(b.heading));
})();

//  ---- 4. tack, gybe, bear away ------------------------------------
(function () {
  //  Wind 240. Port tack at 285, starboard at 195: the turn from 285
  //  to 195 is 90 degrees to the left and passes through 240. A tack.
  var a = maker(); a.many(3, 'port', 285); a.many(3, 'starboard', 195);
  var r = PASSAGE.log(a.rows);
  ok('two tacks are two boards', kinds(r) === 'start board board', kinds(r));
  ok('through the wind is a tack', r.lines[2].did === 'tacked' && r.lines[2].turn === 90,
     r.lines[2].did + ' ' + r.lines[2].turn);

  //  Wind 240, running. Starboard at 090 (wind 150 on the starboard
  //  side), port at 030: the turn from 090 to 030 is 60 to the left and
  //  passes through 060, dead downwind. The wind, 240, is not in it.
  a = maker(); a.many(3, 'starboard', 90); a.many(3, 'port', 30);
  r = PASSAGE.log(a.rows);
  ok('stern through the wind is a gybe', r.lines[2].did === 'gybed' && r.lines[2].turn === 60,
     r.lines[2].did + ' ' + r.lines[2].turn);

  //  Round a mark and stay on starboard: 195 close-hauled, then 100.
  //  The same tack, 95 degrees further off the wind.
  a = maker();
  a.many(2, 'starboard', 195); a('starboard', 195, { event: 'rounded THE ROCK' });
  a.many(3, 'starboard', 100, { leg: 1 });
  r = PASSAGE.log(a.rows);
  ok('a rounding ends a board', kinds(r) === 'start board rounded board', kinds(r));
  ok('the same tack and further off the wind is bearing away',
     r.lines[3].did === 'bore away' && r.lines[3].turn === 95, r.lines[3].did + ' ' + r.lines[3].turn);

  //  And the other way: reaching at 100, then hardening up to 195.
  a = maker();
  a.many(2, 'starboard', 100); a('starboard', 100, { event: 'rounded THE ROCK' });
  a.many(3, 'starboard', 195, { leg: 1 });
  r = PASSAGE.log(a.rows);
  ok('nearer the wind is hardening up', r.lines[3].did === 'hardened up' && r.lines[3].turn === 95);

  //  A new leg on the same heading is a new board and no manoeuvre.
  a = maker();
  a.many(2, 'starboard', 195); a('starboard', 195, { event: 'rounded THE ROCK' });
  a.many(3, 'starboard', 197, { leg: 1 });
  r = PASSAGE.log(a.rows);
  ok('two degrees is not a manoeuvre', r.lines[3].did === null && r.lines[3].turn === null);
})();

//  ---- 5. events ---------------------------------------------------
(function () {
  var a = maker();
  a.many(5, 'port', 285); a('port', 285, { event: 'rounded EDDYSTONE LT HOUSE' });
  a.many(2, 'port', 30, { leg: 1 }); a('port', 30, { leg: 1, minutes: 4, event: 'finish' });
  var r = PASSAGE.log(a.rows);
  ok('start, board, rounded, board, finish', kinds(r) === 'start board rounded board finish', kinds(r));
  var rd = r.lines[2], fin = r.lines[4];
  ok('the mark is named', rd.name === 'EDDYSTONE LT HOUSE', rd.name);
  ok('rounded an hour from the start', rd.elapsedMinutes === 60 && rd.ms === T0 + 3600000);
  ok('the board says how it ends', r.lines[1].ends === 'rounded EDDYSTONE LT HOUSE' &&
     r.lines[3].ends === 'finish');
  //  60 + 10 + 10 + 4 minutes.
  ok('finished 1h24 from the start', fin.elapsedMinutes === 84, String(fin.elapsedMinutes));
  var t = keep(r, { title: 'Example race, IRC One' });
  ok('the text says so', /11:00  ROUNDED EDDYSTONE LT HOUSE  1h00 from the start/.test(t) &&
     /11:24  FINISH  1h24 from the start/.test(t), t);
  ok('and carries the title on the start line', /10:00  START  Example race, IRC One/.test(t), t);
})();

//  ---- 6. short-tacking --------------------------------------------
(function () {
  function zig(n, len) {
    var a = maker();
    for (var i = 0; i < n; i++) a.many(len, i % 2 ? 'starboard' : 'port', i % 2 ? 195 : 285);
    return a;
  }
  var r = PASSAGE.log(zig(3, 1).rows);
  ok('three boards of ten minutes are one line', kinds(r) === 'start short', kinds(r));
  ok('which says how many', r.lines[1].boards === 3 && r.lines[1].minutes === 30 &&
     r.lines[1].nm === 4.5, JSON.stringify(r.lines[1]));
  ok('two are not', kinds(PASSAGE.log(zig(2, 1).rows)) === 'start board board');
  ok('twenty minutes is still short', kinds(PASSAGE.log(zig(3, 2).rows)) === 'start short');
  ok('thirty is not', kinds(PASSAGE.log(zig(3, 3).rows)) === 'start board board board');

  //  A long board in the middle of five short ones: 2 short, long, 2
  //  short. Neither pair is three, so nothing folds.
  var a = maker();
  a('port', 285); a('starboard', 195); a.many(4, 'port', 285); a('starboard', 195); a('port', 285);
  ok('a long board breaks the run', kinds(PASSAGE.log(a.rows)) === 'start board board board board board');

  //  THE BOARD THAT ROUNDS THE MARK IS NEVER FOLDED AWAY. Three short
  //  boards, the third ending in a rounding: the first two are too few
  //  to fold and the third keeps its own line.
  a = maker();
  a('port', 285); a('starboard', 195); a('port', 285, { event: 'rounded THE ROCK' });
  a.many(3, 'port', 30, { leg: 1 });
  r = PASSAGE.log(a.rows);
  ok('a board that ends in an event keeps its own line',
     kinds(r) === 'start board board board rounded board', kinds(r));

  //  After a fold, the next board is compared with the fold for what
  //  changed, but is not said to have tacked: tacked from which?
  a = zig(3, 1); a.many(4, 'starboard', 195);
  r = PASSAGE.log(a.rows);
  ok('a board after short-tacking is not called a tack',
     kinds(r) === 'start short board' && r.lines[2].did === null, kinds(r) + ' ' + r.lines[2].did);
  ok('but is compared with it', r.lines[2].since === T0);

  //  Nor is it measured against the board BEFORE the short tacks. A
  //  long port board at 285, three short ones, then port again at 300
  //  in a wind that has veered 15: the two long boards are fifteen
  //  degrees apart, and half an hour of tacking lies between them.
  a = maker(); a.many(3, 'port', 285);
  a('starboard', 195); a('port', 285); a('starboard', 195);
  a.many(3, 'port', 300, { gwd: 255 });
  r = PASSAGE.log(a.rows);
  ok('nor measured against the board before the short tacks',
     kinds(r) === 'start board short board' && r.lines[3].did === null && r.lines[3].turn === null,
     kinds(r) + ' ' + r.lines[3].did);

  r = PASSAGE.log(zig(3, 3).rows, { shortBoard: 30 });
  ok('the thresholds can be set', kinds(r) === 'start short' && r.thresholds.shortBoard === 30);
  ok('and come back with the log', PASSAGE.log(zig(3, 1).rows).thresholds.shift === 5);
})();

//  ---- 7. the wind: what had changed -------------------------------
(function () {
  //  Close-hauled 45 degrees off whatever the wind is: port, then
  //  starboard.
  function two(o1, o2) {
    var w1 = o1.gwd === undefined ? 240 : o1.gwd, w2 = o2.gwd === undefined ? 240 : o2.gwd;
    var a = maker();
    a.many(3, 'port', (Math.round(w1) + 45) % 360, o1);
    a.many(3, 'starboard', (Math.round(w2) + 315) % 360, o2);
    return PASSAGE.log(a.rows).lines[2];
  }
  var l = two({ gwd: 240 }, { gwd: 246 });
  ok('240 to 246 has veered 6', words(l) === 'wind:veered' && l.changes[0].deg === 6, words(l));
  ok('and says from when', l.since === T0);
  l = two({ gwd: 242 }, { gwd: 233 });
  ok('242 to 233 has backed 9', words(l) === 'wind:backed' && l.changes[0].deg === 9, words(l));
  ok('four degrees is not said', words(two({ gwd: 240 }, { gwd: 236 })) === '');
  ok('five is', words(two({ gwd: 240 }, { gwd: 235 })) === 'wind:backed');
  l = two({ gwd: 358 }, { gwd: 4 });
  ok('358 to 004 has veered 6, across north', words(l) === 'wind:veered' && l.changes[0].deg === 6,
     words(l) + ' ' + (l.changes[0] && l.changes[0].deg));
  l = two({ gwd: 4 }, { gwd: 358 });
  ok('and 004 to 358 has backed 6', words(l) === 'wind:backed' && l.changes[0].deg === 6);

  //  FROM THE NUMBERS AS PRINTED. 241.6 prints as 242 and 233.4 as 233:
  //  the log must say 9, which a reader can check, and not 8.
  l = two({ gwd: 241.6 }, { gwd: 233.4 });
  ok('the shift is the difference of the printed numbers',
     l.changes[0].deg === 9 && l.changes[0].from === 242 && l.changes[0].to === 233,
     JSON.stringify(l.changes[0]));

  //  THE READING IS THE WIND WHEN THE LINE BEGINS, not the board's
  //  average. A board that begins at 240 and ends at 260 is logged at
  //  240, and the next line, beginning at 262, has veered 22.
  var a = maker();
  a('port', 285, { gwd: 240 }); a('port', 295, { gwd: 250 }); a('port', 305, { gwd: 260 });
  a.many(3, 'starboard', 217, { gwd: 262 });
  var r = PASSAGE.log(a.rows);
  ok('a line is logged with the wind it began in', r.lines[1].wind.from === 240);
  ok('and the next is compared with that', r.lines[2].changes[0].deg === 22,
     JSON.stringify(r.lines[2].changes));

  l = two({ gws: 17 }, { gws: 20 });
  ok('17 to 20 kt has freshened 3', words(l) === 'strength:freshened' && l.changes[0].kt === 3, words(l));
  l = two({ gws: 23 }, { gws: 19 });
  ok('23 to 19 has eased 4', words(l) === 'strength:eased' && l.changes[0].kt === 4, words(l));
  ok('two knots is not said', words(two({ gws: 20 }, { gws: 22 })) === '');
  l = two({ gwd: 240, gws: 16 }, { gwd: 250, gws: 22 });
  ok('direction is said before strength', words(l) === 'wind:veered | strength:freshened', words(l));
  ok('the wind over the water is carried beside the ground wind',
     two({ gws: 17, tws: 19 }, {}).wind.kt === 20 &&
     PASSAGE.log((function () { var a = maker(); a('port', 285, { gws: 17, tws: 19 }); return a.rows; })())
       .lines[1].wind.overWater === 19);
})();

//  ---- 8. the stream -----------------------------------------------
(function () {
  function one(o) { var a = maker(); a.many(3, 'port', 270, o); return PASSAGE.log(a.rows).lines[1]; }
  //  She makes good 270. A stream setting 270 at 1 kt is 1 kt fair; one
  //  setting 090 is 1 kt foul; one setting 000 is on the beam.
  var l = one({ set: 270, drift: 1 });
  ok('a stream going her way is fair', l.stream.state === 'fair' && l.stream.kt === 1, JSON.stringify(l.stream));
  l = one({ set: 90, drift: 1 });
  ok('one against her is foul', l.stream.state === 'foul' && l.stream.kt === 1, JSON.stringify(l.stream));
  ok('one on the beam is slack to her', one({ set: 0, drift: 1 }).stream.state === 'slack');
  //  Setting 330, 60 degrees off her track, at 2 kt: 2 cos 60 = 1 fair.
  l = one({ set: 330, drift: 2 });
  ok('sixty degrees off, half of it counts', l.stream.state === 'fair' && l.stream.kt === 1, JSON.stringify(l.stream));
  ok('fair and foul are about her track, not her heading',
     one({ set: 270, drift: 1, cog: 90 }).stream.state === 'foul');
  l = one({ noStream: true });
  ok('no stream data is not slack water', l.stream.state === 'none' && l.stream.kt === null &&
     l.stream.noDataMinutes === 30 && l.set === null, JSON.stringify(l.stream));

  //  One row of three without data: the other two are 1 kt fair, and
  //  the average is 1.0 over the minutes that have a stream - not 0.7.
  var a = maker();
  a('port', 270, { noStream: true }); a.many(2, 'port', 270, { set: 270, drift: 1 });
  l = PASSAGE.log(a.rows).lines[1];
  ok('minutes without data are counted, not averaged in as zero',
     l.stream.kt === 1 && l.stream.noDataMinutes === 10, JSON.stringify(l.stream));
  ok('and the text says how long she had none',
     /stream fair 1\.0 kt   9\.0 kt through the water, 9\.0 made good\n         no stream data for 0h10 of this line/
       .test(keep(PASSAGE.log(a.rows))));

  function two(o1, o2) {
    var a = maker(); a.many(3, 'port', 270, o1); a.many(3, 'starboard', 180, o2);
    return PASSAGE.log(a.rows).lines[2];
  }
  ok('stream data beginning is said',
     words(two({ noStream: true }, { set: 270, drift: 1 })) === 'data:stream data begins');
  ok('and ending', words(two({ set: 270, drift: 1 }, { noStream: true })) === 'data:no stream data from here');

  //  080 to 250 is a swing of 170: turned. Both lines run at 1 kt.
  //  She was heading 270 with it foul; now 180 with a stream setting
  //  250, which is 70 off her track: 1 cos 70 = 0.34 fair.
  l = two({ set: 80, drift: 1 }, { set: 250, drift: 1 });
  ok('a stream that has swung 170 degrees has turned', /turned:stream has turned/.test(words(l)), words(l));
  ok('and what she had is said without saying the stream did it',
     /state:stream fair on this line, foul on the last/.test(words(l)), words(l));
  ok('eighty degrees is not turning', !/turned/.test(words(two({ set: 80, drift: 1 }, { set: 160, drift: 1 }))));
  ok('ninety is not either: more than a right angle',
     !/turned/.test(words(two({ set: 80, drift: 1 }, { set: 170, drift: 1 }))));
  ok('near slack water a direction is noise, and is not compared',
     !/turned/.test(words(two({ set: 80, drift: 0.2 }, { set: 250, drift: 1 }))));

  //  THE STREAM HAS NOT CHANGED AND SHE HAS. Setting 270 at 1 kt
  //  throughout: fair while she makes good 270, and on the beam -
  //  slack to her - once she makes good 180.
  l = two({ set: 270, drift: 1 }, { set: 270, drift: 1 });
  ok('a tack can change fair to slack with the water unchanged',
     words(l) === 'state:stream slack on this line, fair on the last', words(l));
})();

//  ---- 8b. when a tack costs something -------------------------------
//  The router then puts the manoeuvre itself in the rows: a row marked
//  `manoeuvre`, head to wind (or stern to it, in a gybe), on which she
//  makes no way, belonging to the tack she is going onto.
(function () {
  //  Half an hour on port at 285, a tack of 60 seconds, half an hour on
  //  starboard at 195. The wind is 240 throughout.
  var a = maker(); a.many(3, 'port', 285); a.man('tack', 'starboard', 60); a.many(3, 'starboard', 195);
  var r = PASSAGE.log(a.rows);
  ok('a tack in the rows begins the new board', r.ok && kinds(r) === 'start board board', kinds(r));
  var b = r.lines[2];
  ok('the board begins where the helm went down', b.ms === T0 + 30 * 60000 && b.first === 3);
  ok('it is called a tack', b.did === 'tacked' && b.turn === 90, b.did + ' ' + b.turn);
  //  With the manoeuvre row in the mean - a minute pointing at 240 among
  //  thirty at 195 - the heading comes out 196 and the angle off the
  //  wind 44. She SAILED 195, 45 off.
  ok('the heading is the heading she sailed, not dragged round by the tack', b.heading === 195, String(b.heading));
  ok('and so is the angle off the wind', b.offWind === 45, String(b.offWind));
  //  31 minutes, of which 30 at nine knots: 4.5 miles, and 9 x 30/31 =
  //  8.7 knots for the board as a whole.
  ok('the board is 31 minutes and 4.5 miles: the tack adds time and no distance', b.minutes === 31 && b.nm === 4.5, b.minutes + ' ' + b.nm);
  ok('and its speeds are for the whole of it, tack included: 8.7 knots', b.stw === 8.7 && b.sog === 8.7, b.stw + ' ' + b.sog);
  ok('the log says what the tack cost', b.cost && b.cost.tacks === 1 && b.cost.tackSeconds === 60 &&
     b.cost.gybes === 0 && b.cost.gybeSeconds === 0, JSON.stringify(b.cost));
  ok('a board with no manoeuvre in it has no cost to state', r.lines[1].cost === null);
  var t = keep(r);
  ok('and the text states it as a fact', /10:30  tacked to starboard, heading 195   0h31  4\.5 nm\n/.test(t) &&
     /made good\n         the tack cost 60 s$/.test(t), t);

  //  A gybe: starboard at 090 with the wind on the quarter, 95 seconds,
  //  port at 030.
  a = maker(); a.many(3, 'starboard', 90); a.man('gybe', 'port', 95); a.many(3, 'port', 30);
  r = PASSAGE.log(a.rows); b = r.lines[2];
  ok('a gybe in the rows is called a gybe', b.did === 'gybed' && b.turn === 60 && b.heading === 30, b.did + ' ' + b.turn + ' ' + b.heading);
  ok('and costed apart from a tack', b.cost.gybes === 1 && b.cost.gybeSeconds === 95 && b.cost.tacks === 0);
  ok('a minute and a half is written as minutes', /\n         the gybe cost 1 min 35 s$/.test(keep(r)), PASSAGE.text(r));

  //  THE ROUTER'S WORD IS TAKEN FOR WHICH IT WAS. 285 to 195 in a wind
  //  from 240 is through the wind, and the log would call it a tack if
  //  it worked it out for itself; the row says gybe.
  a = maker(); a.many(3, 'port', 285); a.man('gybe', 'starboard', 60); a.many(3, 'starboard', 195);
  ok('the log takes the row\'s word for which manoeuvre it was', PASSAGE.log(a.rows).lines[2].did === 'gybed');

  //  A tack longer than a step is two rows, ten minutes and then five,
  //  and still one tack.
  a = maker(); a.many(3, 'port', 285); a.man('tack', 'starboard', 600); a.man('tack', 'starboard', 300);
  a.many(3, 'starboard', 195);
  r = PASSAGE.log(a.rows); b = r.lines[2];
  ok('a tack carried over two rows is one tack', b.cost.tacks === 1 && b.cost.tackSeconds === 900 && b.did === 'tacked', JSON.stringify(b.cost));
  ok('fifteen minutes is written so', /\n         the tack cost 15 min 00 s$/.test(keep(r)), PASSAGE.text(r));

  //  Short-tacking: three boards of ten minutes, the second and third
  //  each begun with a tack of 30 seconds.
  a = maker(); a('port', 285);
  a.man('tack', 'starboard', 30); a('starboard', 195);
  a.man('tack', 'port', 30); a('port', 285);
  r = PASSAGE.log(a.rows);
  ok('short tacks fold as before, tacks and all', kinds(r) === 'start short' && r.lines[1].boards === 3, kinds(r));
  ok('and the line says what its tacks came to', r.lines[1].cost.tacks === 2 && r.lines[1].cost.tackSeconds === 60 &&
     /\n         2 tacks cost 60 s/.test(keep(r)), JSON.stringify(r.lines[1].cost));

  //  A run with no crew has no such rows, and nothing is said of cost.
  a = maker(); a.many(3, 'port', 285); a.many(3, 'starboard', 195);
  r = PASSAGE.log(a.rows);
  ok('a log of free tacks says nothing of what they cost',
     r.lines.every(function (l) { return !l.cost; }) && !/cost/.test(PASSAGE.text(r)));
})();

//  ---- 9. it says what, and never why ------------------------------
(function () {
  //  A passage with everything in it: no stream data, short tacks, a
  //  veer, a freshening, a turned stream, a rounding, a gybe, a finish.
  var a = maker();
  a('port', 285, { noStream: true, gws: 16 }); a('starboard', 195, { noStream: true, gws: 16 });
  a('port', 285, { noStream: true, gws: 16 });
  a.many(4, 'starboard', 195, { set: 80, drift: 1.2, gws: 17 });
  a.many(5, 'port', 300, { gwd: 255, gws: 22, set: 250, drift: 0.9 });
  a('port', 300, { gwd: 255, gws: 22, set: 250, drift: 0.9, event: 'rounded EDDYSTONE LT HOUSE' });
  //  Round the mark and bear away, still on port: 300 (45 off the wind)
  //  to 045 (146 off it), a turn of 105. Then gybe to 110.
  a.many(3, 'port', 45, { leg: 1, gwd: 259, gws: 23, set: 80, drift: 0.8 });
  a.many(8, 'starboard', 110, { leg: 1, gwd: 272, gws: 19, set: 80, drift: 1.2 });
  a('starboard', 110, { leg: 1, gwd: 272, gws: 19, set: 80, drift: 1.2, event: 'finish' });
  var r = PASSAGE.log(a.rows);
  ok('the whole passage reads', r.ok &&
     kinds(r) === 'start short board board rounded board board finish', kinds(r));
  var t = keep(r, { title: 'Example race' });
  ok('every kind of fact appears in it',
     /stream data begins/.test(t) && /wind veered 15 degrees/.test(t) &&
     /wind freshened 5 kt/.test(t) && /stream has turned, now setting 250 at 0\.9 kt/.test(t) &&
     /gybed to starboard/.test(t) && /short-tacking, 3 boards/.test(t) &&
     /bore away 105 degrees, still port/.test(t), t);
  var wide = t.split('\n').filter(function (x) { return x.length > 80; });
  ok('no line of the text is wider than 80 columns', wide.length === 0, wide[0]);
  //  The 11:10 entry has four changes, too many for one line. They are
  //  broken after a semicolon and the next begins a new, indented line.
  ok('a long list of changes breaks between two of them, never inside one',
     /since 10:30: wind veered 15 degrees; wind freshened 5 kt;\n           stream has turned, now setting 250 at 0\.9 kt;\n           stream fair on this line, foul on the last\n/.test(t), t);
  ok('the day is written once, with the zone', (t.match(/-- 24 May 2025, times UTC --/g) || []).length === 1, t);

  //  A passage across midnight writes the new day once.
  var b = maker(); b.many(3, 'port', 285);
  b.rows.forEach(function (w, i) { w.ms = Date.UTC(2025, 4, 24, 23, 50 + i * 10, 0); });
  var tm = keep(PASSAGE.log(b.rows));
  ok('midnight is not crossed inside a board without saying whose day it began in',
     /-- 24 May 2025, times UTC --\n23:50  START/.test(tm), tm);

  //  THE RULING. Not one reason-word in anything this file has made.
  var REASON = /\b(because|so that|in order|therefore|hence|to avoid|to gain|to stay|to keep|to use|to catch|to make the most|in favour|favou?red|should|ought|better|best|chose|chosen|decided|wanted)\b/i;
  var bad = texts.filter(function (x) { return REASON.test(x); });
  ok('the log gives no reasons, in any text made above (' + texts.length + ' of them)',
     texts.length >= 3 && bad.length === 0, bad[0]);
  //  and the checker itself can see one
  ok('and the check would catch one', REASON.test('tacked to port because the wind veered'));
})();

//  ---- 10. it keeps its hands off the rows, and is the same twice ---
(function () {
  var a = maker(); a.many(3, 'port', 285); a.many(3, 'starboard', 195, { gwd: 250 });
  var before = JSON.stringify(a.rows);
  var r1 = PASSAGE.log(a.rows), r2 = PASSAGE.log(a.rows);
  ok('the rows are not altered', JSON.stringify(a.rows) === before);
  ok('the same rows twice give the same log', JSON.stringify(r1) === JSON.stringify(r2));
  ok('a refused log prints its reason', PASSAGE.text(PASSAGE.log([])) === 'there are no rows to make a log of');
})();

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');

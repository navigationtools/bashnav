// =====================================================================
//  The passage log: a route's rows, written the way a deck log is.
//
//  WHAT IT IS FOR. The router answers with one row for every time step
//  - 144 of them for a day's race at ten minutes. That is the right
//  thing for a chart and the wrong thing for a person. This file folds
//  the rows into the lines a navigator would have written:
//
//      rows        10:00 port 280, 10:10 port 280, 10:20 port 281 ...
//                    |  same tack, same leg: one BOARD
//      boards      13:00 port 280 for 2h20, 22.8 nm
//                    |  three or more boards of twenty minutes or less
//      lines       10:00 short-tacking, 10 boards in 1h40
//
//  and beside each line it sets down WHAT HAD CHANGED since the line
//  before it was written.
//
//  IT STATES FACTS AND NEVER GIVES A REASON (Larry, 13 November 2026).
//  The router keeps the earliest arrival out of every heading tried
//  from every place; it holds no reasons, so any "because" written here
//  would be invented. The log says "wind veered 10 degrees since
//  22:40". Whether that is why she tacked is for the reader, and the
//  lesson, to say. tests/passage.js checks that no reason-word can come
//  out of this file.
//
//  A LINE IS AN ENTRY MADE AT A TIME, as in a deck log:
//
//      the readings   wind and stream as they were WHEN THE LINE BEGINS
//      the board      how long, how far, and her average speeds over it
//      the changes    this line's readings less the last line's
//
//  THE CHANGES ARE TAKEN FROM THE NUMBERS AS PRINTED. Each reading is
//  rounded first and subtracted second, so a reader with the log in
//  front of them can check every "veered 9" by subtraction. Worked the
//  other way round, 241.6 to 233.4 prints as 242 and 233 and "backed
//  8", and the log disagrees with itself.
//
//  THE THRESHOLDS ARE CHOICES, NOT PHYSICS, and they are all here in
//  one place, returned with every log so a page can say what they were:
//
//      shortBoard  20    a board this long or shorter (minutes) is short
//      shortRun     3    this many short boards together are one line
//      shift        5    a wind shift smaller than this (deg) is not said
//      strength     3    nor a change of wind speed smaller than this (kt)
//      slack     0.25    stream along her track weaker than this is slack
//      live       0.3    a stream slower than this (kt) has no direction
//                        worth comparing, so it cannot be said to turn
//      turn        90    the set must swing more than this to have turned
//
//  WHEN A TACK COSTS SOMETHING the router's rows include the manoeuvre
//  itself: a row, marked `manoeuvre`, on which she makes no way through
//  the water. It belongs to the board she is going onto, so a board
//  begins where the helm went down. The log says what it cost, as a
//  fact like any other - "the tack cost 41 s" - and leaves the row out
//  of the board's heading, which is the heading she SAILED. A run with
//  no crew has no such rows, and its log reads as it always did.
//
//  Conventions are route.js's: bearings degrees true, wind named for
//  where it comes FROM, set for where the stream goes TO, twa positive
//  on port tack.
//
//  Reads the rows of docs/web/route/router.js. Needs nothing else.
// =====================================================================
'use strict';

var PASSAGE = (function () {

  var RAD = Math.PI / 180;

  var DEFAULTS = {
    shortBoard: 20, shortRun: 3, shift: 5, strength: 3,
    slack: 0.25, live: 0.3, turn: 90
  };

  var NEED = ['ms', 'minutes', 'heading', 'tack', 'gwd', 'gws', 'tws', 'stw', 'sog'];

  function norm360(a) { a = a % 360; return a < 0 ? a + 360 : a; }

  //  How far, and which way, from one bearing round to another by the
  //  shorter way: positive is clockwise. 358 to 004 is +6, not -354.
  function swing(from, to) {
    var d = norm360(to - from);
    return d > 180 ? d - 360 : d;
  }

  function r1(x) { return Math.round(x * 10) / 10; }
  function deg(x) { return Math.round(x) % 360; }

  function total(rows, f) {
    var s = 0;
    for (var i = 0; i < rows.length; i++) s += f(rows[i]);
    return s;
  }

  //  A mean of bearings has to be taken round the circle: the mean of
  //  350 and 010 is north, and the arithmetic mean says south. Each row
  //  counts for the minutes it lasted.
  function meanBearing(rows, f) {
    var x = 0, y = 0;
    for (var i = 0; i < rows.length; i++) {
      var v = f(rows[i]);
      if (v === null || v === undefined) continue;
      x += Math.sin(v * RAD) * rows[i].minutes;
      y += Math.cos(v * RAD) * rows[i].minutes;
    }
    if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return null;
    return norm360(Math.atan2(x, y) / RAD);
  }

  function hasStream(w) {
    return !w.noStream && w.set !== null && w.set !== undefined &&
           w.drift !== null && w.drift !== undefined;
  }

  // ---------------------------------------------------------------
  //  Rows into boards. A board is a run of rows on one tack within one
  //  leg; a row that carries an event (a rounding, the finish) is the
  //  last row of its board whatever comes next.
  // ---------------------------------------------------------------
  function boards(rows) {
    var out = [], cur = null;
    for (var i = 0; i < rows.length; i++) {
      var w = rows[i];
      if (!cur || cur.event || cur.tack !== w.tack || cur.leg !== w.leg) {
        cur = { tack: w.tack, leg: w.leg, first: i, last: i, event: null };
        out.push(cur);
      }
      cur.last = i;
      if (w.event) cur.event = w.event;
    }
    return out;
  }

  // ---------------------------------------------------------------
  //  What one line measures, over rows first..last.
  // ---------------------------------------------------------------
  function measure(rows, first, last, th) {
    var part = rows.slice(first, last + 1), a = part[0];
    var minutes = total(part, function (w) { return w.minutes; });
    var nm = total(part, function (w) { return w.sog * w.minutes / 60; });

    //  THE STREAM ALONG HER TRACK: drift times the cosine of the angle
    //  between where the stream goes and where she goes. Plus is fair,
    //  minus is foul, and a stream on the beam is neither. Averaged
    //  over the minutes that HAVE a stream; the minutes that have none
    //  are counted beside it and not as zero.
    var withMin = 0, along = 0, without = 0;
    for (var i = 0; i < part.length; i++) {
      var w = part[i];
      if (!hasStream(w)) { without += w.minutes; continue; }
      withMin += w.minutes;
      if (w.cog === null || w.cog === undefined) continue;
      along += w.drift * Math.cos((w.set - w.cog) * RAD) * w.minutes;
    }
    var state = 'none', kt = null;
    if (withMin > 0) {
      var mean = along / withMin;
      kt = r1(Math.abs(mean));
      state = Math.abs(mean) < th.slack ? 'slack' : (mean > 0 ? 'fair' : 'foul');
    }

    //  WHAT THE MANOEUVRES ON THIS LINE COST. A manoeuvre is counted
    //  where it begins; one that outlasts a step is two rows and still
    //  one tack.
    var cost = { tacks: 0, gybes: 0, tackSeconds: 0, gybeSeconds: 0 }, any = false, q;
    for (q = first; q <= last; q++) {
      var mv = rows[q].manoeuvre;
      if (!mv) continue;
      any = true;
      if (q === 0 || !rows[q - 1].manoeuvre) cost[mv === 'gybe' ? 'gybes' : 'tacks']++;
      cost[mv === 'gybe' ? 'gybeSeconds' : 'tackSeconds'] += rows[q].minutes * 60;
    }
    cost.tackSeconds = Math.round(cost.tackSeconds);
    cost.gybeSeconds = Math.round(cost.gybeSeconds);

    return {
      ms: a.ms, first: first, last: last, cost: any ? cost : null,
      minutes: Math.round(minutes),
      nm: r1(nm),
      //  the readings, as they were when the line begins
      wind: { from: deg(a.gwd), kt: Math.round(a.gws), overWater: Math.round(a.tws) },
      set: hasStream(a) ? { to: deg(a.set), kt: r1(a.drift) } : null,
      //  the board as a whole
      stream: { state: state, kt: kt, noDataMinutes: Math.round(without) },
      stw: r1(total(part, function (w) { return w.stw * w.minutes; }) / minutes),
      sog: r1(nm / (minutes / 60))
    };
  }

  // ---------------------------------------------------------------
  //  What she did to get onto this board, from the last row of the
  //  board before and the first row of this one.
  //
  //  TACK OR GYBE is which end of the wind her bow passed through. She
  //  turns from one heading to the other by the shorter way; if the
  //  direction the wind comes from lies inside that turn she tacked,
  //  and if it does not she gybed. The wind used is the wind over the
  //  water, because that is the wind she is sailing in.
  // ---------------------------------------------------------------
  function manoeuvre(before, after, th, said) {
    var t = swing(before.heading, after.heading);
    //  the router's own word for it, when the manoeuvre is in the rows
    if (said && before.tack !== after.tack) {
      return { did: said === 'gybe' ? 'gybed' : 'tacked', turn: Math.round(Math.abs(t)) };
    }
    if (before.tack !== after.tack) {
      var wd = (after.twd === null || after.twd === undefined) ? after.gwd : after.twd;
      var toWind = swing(before.heading, wd), through;
      if (Math.abs(Math.abs(t) - 180) < 1e-9) {
        through = Math.abs(after.twa) < 90;        // a half turn has no shorter way
      } else {
        through = (toWind > 0) === (t > 0) && Math.abs(toWind) < Math.abs(t);
      }
      return { did: through ? 'tacked' : 'gybed', turn: Math.round(Math.abs(t)) };
    }
    if (Math.round(Math.abs(t)) < th.shift) return null;
    var off = Math.abs(after.twa) - Math.abs(before.twa);
    return { did: off > 0 ? 'bore away' : 'hardened up', turn: Math.round(Math.abs(t)) };
  }

  // ---------------------------------------------------------------
  //  What had changed, this line's readings less the last line's.
  //  Always in the same order: the wind's direction, its strength, then
  //  the stream.
  // ---------------------------------------------------------------
  function changes(prev, line, th) {
    var out = [];

    var d = swing(prev.wind.from, line.wind.from);
    if (Math.abs(d) >= th.shift) {
      out.push({ what: 'wind', word: d > 0 ? 'veered' : 'backed', deg: Math.abs(d),
                 from: prev.wind.from, to: line.wind.from });
    }

    var k = line.wind.kt - prev.wind.kt;
    if (Math.abs(k) >= th.strength) {
      out.push({ what: 'strength', word: k > 0 ? 'freshened' : 'eased', kt: Math.abs(k),
                 from: prev.wind.kt, to: line.wind.kt });
    }

    if (!prev.set && line.set) out.push({ what: 'data', word: 'stream data begins' });
    if (prev.set && !line.set) out.push({ what: 'data', word: 'no stream data from here' });

    //  A STREAM HAS TURNED when where it goes has swung through more
    //  than a right angle. Near slack water the direction is noise, so
    //  both readings must be running before they are compared.
    if (prev.set && line.set && prev.set.kt >= th.live && line.set.kt >= th.live &&
        Math.abs(swing(prev.set.to, line.set.to)) > th.turn) {
      out.push({ what: 'turned', word: 'stream has turned',
                 from: prev.set.to, to: line.set.to, kt: line.set.kt });
    }

    //  Fair and foul are about HER as much as about the water: a tack
    //  can make a stream foul that has not changed at all. So this says
    //  what it was and what it is, and not that the stream did it.
    var was = prev.stream.state, is = line.stream.state;
    if (was !== is && was !== 'none' && is !== 'none') {
      out.push({ what: 'state', word: 'stream ' + is + ' on this line, ' + was + ' on the last',
                 from: was, to: is });
    }
    return out;
  }

  function check(rows) {
    if (!rows || !rows.length) return 'there are no rows to make a log of';
    for (var i = 0; i < rows.length; i++) {
      for (var j = 0; j < NEED.length; j++) {
        var v = rows[i][NEED[j]];
        if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) {
          return 'row ' + (i + 1) + ' has no ' + NEED[j];
        }
      }
      if (!(rows[i].minutes > 0)) return 'row ' + (i + 1) + ' lasts no time';
    }
    return null;
  }

  // ---------------------------------------------------------------
  //  The log.
  //
  //    log(rows, opt) -> { ok, lines, thresholds }  or  { ok:false, err }
  //
  //  Each line has a kind:
  //    'start'    ms
  //    'board'    tack, heading, offWind, did, turn, ends, + the measures
  //    'short'    boards (how many), + the measures
  //    'rounded'  ms, name, elapsedMinutes
  //    'finish'   ms, elapsedMinutes
  //  'board' and 'short' lines carry changes[] and since (the time of
  //  the line they are compared with).
  // ---------------------------------------------------------------
  function log(rows, opt) {
    var err = check(rows);
    if (err) return { ok: false, err: err };

    var th = {}, key;
    for (key in DEFAULTS) th[key] = DEFAULTS[key];
    if (opt) for (key in DEFAULTS) if (opt[key] !== undefined) th[key] = opt[key];

    var bs = boards(rows), lines = [], t0 = rows[0].ms;
    lines.push({ kind: 'start', ms: t0 });

    function minutesOf(b) {
      return total(rows.slice(b.first, b.last + 1), function (w) { return w.minutes; });
    }
    function isShort(b) { return !b.event && minutesOf(b) <= th.shortBoard + 1e-9; }

    var i = 0, prev = null, prevBoard = null;
    while (i < bs.length) {
      var j = i;
      while (j < bs.length && isShort(bs[j])) j++;

      var line;
      if (j - i >= th.shortRun) {
        line = measure(rows, bs[i].first, bs[j - 1].last, th);
        line.kind = 'short';
        line.boards = j - i;
        prevBoard = null;
        i = j;
      } else {
        var b = bs[i], part = rows.slice(b.first, b.last + 1);
        line = measure(rows, b.first, b.last, th);
        line.kind = 'board';
        line.tack = b.tack;
        //  the heading and the angle off the wind are of the rows she
        //  SAILED: a manoeuvre row points head to wind and would drag
        //  both towards it
        var sailed = part.filter(function (w) { return !w.manoeuvre; });
        if (!sailed.length) sailed = part;
        line.heading = deg(meanBearing(sailed, function (w) { return w.heading; }));
        line.offWind = Math.round(total(sailed, function (w) {
          return Math.abs(w.twa === undefined || w.twa === null ? 0 : w.twa) * w.minutes;
        }) / total(sailed, function (w) { return w.minutes; }));
        var m = null;
        if (prevBoard) {
          var pl = prevBoard.last;
          while (pl > prevBoard.first && rows[pl].manoeuvre) pl--;
          m = manoeuvre(rows[pl], sailed[0], th, rows[b.first].manoeuvre);
        }
        line.did = m ? m.did : null;
        line.turn = m ? m.turn : null;
        line.ends = b.event || null;
        prevBoard = b;
        i++;
      }

      line.since = prev ? prev.ms : null;
      line.changes = prev ? changes(prev, line, th) : [];
      lines.push(line);
      prev = line;

      if (line.kind === 'board' && line.ends) {
        var lastRow = rows[line.last];
        var te = lastRow.ms + lastRow.minutes * 60000;
        var el = Math.round((te - t0) / 60000);
        if (line.ends === 'finish') {
          lines.push({ kind: 'finish', ms: te, elapsedMinutes: el });
        } else {
          lines.push({ kind: 'rounded', ms: te, elapsedMinutes: el,
                       name: String(line.ends).replace(/^rounded\s+/, '') });
        }
      }
    }
    return { ok: true, lines: lines, thresholds: th };
  }

  // ---------------------------------------------------------------
  //  The log as text, for printing and for a page that only wants to
  //  show it. Times are UTC. A page that wants more reads the lines.
  // ---------------------------------------------------------------
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function three(n) { return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }
  function hhmm(ms) {
    var d = new Date(Math.round(ms / 60000) * 60000);
    return two(d.getUTCHours()) + ':' + two(d.getUTCMinutes());
  }
  function day(ms) {
    var d = new Date(Math.round(ms / 60000) * 60000);
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function span(min) { return Math.floor(min / 60) + 'h' + two(min % 60); }

  function sayChange(c) {
    if (c.what === 'wind') return 'wind ' + c.word + ' ' + c.deg + ' degrees';
    if (c.what === 'strength') return 'wind ' + c.word + ' ' + c.kt + ' kt';
    if (c.what === 'turned') {
      return c.word + ', now setting ' + three(c.to) + ' at ' + c.kt.toFixed(1) + ' kt';
    }
    return c.word;
  }

  function secs(s) {
    s = Math.round(s);
    return s < 90 ? s + ' s' : Math.floor(s / 60) + ' min ' + two(s % 60) + ' s';
  }
  function sayCost(c) {
    var out = [];
    if (c.tacks) out.push((c.tacks === 1 ? 'the tack' : c.tacks + ' tacks') + ' cost ' + secs(c.tackSeconds));
    if (c.gybes) out.push((c.gybes === 1 ? 'the gybe' : c.gybes + ' gybes') + ' cost ' + secs(c.gybeSeconds));
    return out.join('; ');
  }

  function sayStream(s) {
    if (s.state === 'none') return 'no stream data';
    if (s.state === 'slack') return 'stream slack';
    return 'stream ' + s.state + ' ' + s.kt.toFixed(1) + ' kt';
  }

  //  NO LINE OF THE TEXT IS WIDER THAN 80 COLUMNS, so that it prints,
  //  and reads on a small tablet held upright, without wrapping where
  //  the screen chooses. An entry is therefore laid out down the page:
  //
  //      13:10  tacked to port, heading 282   2h20  23.3 nm
  //               wind 242 at 20 kt (21 over the water)
  //               stream fair 0.3 kt   9.6 kt through the water, 10.0 made good
  //               since 11:40: wind freshened 4 kt
  //
  //  the first line is what she did and the board's length; the second
  //  the wind as the line begins; the third the board as a whole; the
  //  fourth what had changed since the line before. When a tack costs
  //  something, what it cost is said on a line of its own before that.
  //
  //  and a long list of changes is broken between two of them, never
  //  inside one.
  var PAD = '         ', WIDE = 80;
  function sinceLines(l) {
    var out = [], cur = PAD + 'since ' + hhmm(l.since) + ': ';
    l.changes.map(sayChange).forEach(function (c, i, all) {
      var piece = c + (i < all.length - 1 ? ';' : '');
      if (cur.length + piece.length > WIDE && cur.trim() !== '') {
        out.push(cur.replace(/\s+$/, ''));
        cur = PAD + '  ';
      }
      cur += piece + ' ';
    });
    out.push(cur.replace(/\s+$/, ''));
    return out;
  }

  function text(result, opt) {
    if (!result || !result.ok) return result && result.err ? result.err : '';
    var out = [], today = null, title = opt && opt.title ? '  ' + opt.title : '';
    result.lines.forEach(function (l) {
      var d = day(l.ms);
      if (d !== today) { out.push('-- ' + d + ', times UTC --'); today = d; }
      var t = hhmm(l.ms) + '  ';
      if (l.kind === 'start') { out.push(t + 'START' + title); return; }
      if (l.kind === 'finish') {
        out.push(t + 'FINISH  ' + span(l.elapsedMinutes) + ' from the start');
        return;
      }
      if (l.kind === 'rounded') {
        out.push(t + 'ROUNDED ' + l.name + '  ' + span(l.elapsedMinutes) + ' from the start');
        return;
      }
      var head;
      if (l.kind === 'short') {
        head = 'short-tacking, ' + l.boards + ' boards';
      } else {
        head = (l.did ? l.did + ' ' + (l.did === 'tacked' || l.did === 'gybed'
                 ? 'to ' + l.tack : l.turn + ' degrees, still ' + l.tack) : l.tack) +
               ', heading ' + three(l.heading);
      }
      out.push(t + head + '   ' + span(l.minutes) + '  ' + l.nm.toFixed(1) + ' nm');
      out.push(PAD + 'wind ' + three(l.wind.from) + ' at ' + l.wind.kt +
               ' kt (' + l.wind.overWater + ' over the water)');
      out.push(PAD + sayStream(l.stream) + '   ' + l.stw.toFixed(1) +
               ' kt through the water, ' + l.sog.toFixed(1) + ' made good');
      if (l.stream.state !== 'none' && l.stream.noDataMinutes) {
        out.push(PAD + 'no stream data for ' + span(l.stream.noDataMinutes) + ' of this line');
      }
      if (l.cost) out.push(PAD + sayCost(l.cost));
      if (l.changes.length) sinceLines(l).forEach(function (x) { out.push(x); });
    });
    return out.join('\n');
  }

  return { log: log, text: text, swing: swing, DEFAULTS: DEFAULTS };
})();

if (typeof module !== 'undefined') module.exports = PASSAGE;

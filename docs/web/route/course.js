// =====================================================================
//  COURSE 1, AREAS 1, RUN 3, CREW 1, PASSAGE 1, MOTOR 1 -- the files the router reads
//  besides the grids.  RUN 1 is still read, and still means what it
//  meant: see the RUN section below for what RUN 2 adds and why it
//  could not be an addition to RUN 1.
//
//  Contract: docs/web/route/COURSE.md. This file is the reference for
//  it: what this refuses, the formats do not allow.
//
//  WHY THREE FORMATS AND NOT ONE. They have three lifetimes. The course
//  is the race and never changes; the areas are the water and change
//  when the world or the survey does; a run is one experiment and
//  changes every time. Fold the run into the course and one course file
//  stops serving every boat and every start, which is the thing Larry's
//  class-start decision needs it to do.
//
//  STRICT ON PURPOSE, for the reason GRID 1 is. A bad input to a router
//  does not become an error. It becomes a ROUTE -- a track that rounds
//  a mark on the wrong side, or sails through a headland -- and a route
//  that is wrong in a way nothing notices is worse than a file that
//  will not load, because it looks like an answer.
//
//  NEVER THROWS. Every parse returns { ok: false, err: <one sentence>,
//  line: <number> } or a value, in the same shape GRID.parse uses. A
//  reader that throws inside a router loses the route rather than
//  reporting the file.
// =====================================================================
'use strict';

var COURSE = (function () {

  var TIME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}Z$/;
  var SIDES = { port: 1, starboard: 1, either: 1 };
  var COMPASS = { north: 0, east: 90, south: 180, west: 270 };

  function bad(line, err) { return { ok: false, line: line, err: err }; }

  //  Lines with their original numbers, comments and blanks dropped.
  //  The number is kept because an error that cannot say WHERE sends a
  //  reader to look through the whole file.
  function lines(text) {
    var raw = String(text).replace(/\r\n?/g, '\n').split('\n'), out = [], i, s;
    for (i = 0; i < raw.length; i++) {
      s = raw[i].trim();
      if (s === '' || s.charAt(0) === '#') continue;
      out.push({ n: i + 1, s: s, w: s.split(/[ \t]+/) });
    }
    return out;
  }

  function num(w) {
    if (!/^-?[0-9]+(\.[0-9]+)?$/.test(w)) return null;
    return parseFloat(w);
  }

  //  A position is two numbers and both have to be in range. A latitude
  //  of 150 is a transposed pair, which is a fault that otherwise
  //  surfaces as a boat in Africa.
  function pos(w, i, ln) {
    var la = num(w[i]), lo = num(w[i + 1]);
    if (la === null || lo === null) return bad(ln, 'expected a latitude and a longitude');
    if (la < -90 || la > 90) return bad(ln, 'latitude ' + w[i] + ' is not between -90 and 90');
    if (lo < -180 || lo > 180) return bad(ln, 'longitude ' + w[i + 1] + ' is not between -180 and 180');
    return { ok: true, lat: la, lon: lo };
  }

  //  `cross` is the side the course lies on: north/east/south/west, or
  //  a bearing. A line without one can be crossed to finish before it
  //  has been started.
  function crossing(w0, ln) {
    if (COMPASS.hasOwnProperty(w0)) return { ok: true, deg: COMPASS[w0] };
    var d = num(w0);
    if (d === null || d < 0 || d >= 360) {
      return bad(ln, '"' + w0 + '" is not a compass point or a bearing 0-359');
    }
    return { ok: true, deg: d };
  }

  //  A line given either way. The file keeps the form its source used,
  //  so a course can be checked against the sailing instructions by
  //  eye; the conversion happens here, once, where it can be tested.
  //
  //    line <lat> <lon> bearing <deg> length <nm> cross <side>
  //    line <lat> <lon> to <lat> <lon> cross <side>
  function readLine(w, i, ln) {
    if (w[i] !== 'line') return bad(ln, 'expected "line" after ' + w[0]);
    var p = pos(w, i + 1, ln);
    if (!p.ok) return p;
    var a = { lat: p.lat, lon: p.lon }, b, form, c, j;

    if (w[i + 3] === 'bearing') {
      var brg = num(w[i + 4]);
      if (brg === null || brg < 0 || brg >= 360) {
        return bad(ln, 'bearing must be 0-359, got "' + w[i + 4] + '"');
      }
      if (w[i + 5] !== 'length') return bad(ln, 'expected "length" after the bearing');
      var len = num(w[i + 6]);
      if (len === null || len <= 0) return bad(ln, 'length must be a positive number of nautical miles');
      b = along(a, brg, len);
      form = 'bearing';
      j = i + 7;
    } else if (w[i + 3] === 'to') {
      var q = pos(w, i + 4, ln);
      if (!q.ok) return q;
      b = { lat: q.lat, lon: q.lon };
      form = 'to';
      j = i + 6;
    } else {
      return bad(ln, 'a line is "<lat> <lon> bearing <deg> length <nm>" or "<lat> <lon> to <lat> <lon>"');
    }

    if (w[j] !== 'cross') return bad(ln, 'a line must say which way it is crossed: cross <side>');
    c = crossing(w[j + 1], ln);
    if (!c.ok) return c;
    if (w.length > j + 2) return bad(ln, 'unexpected "' + w[j + 2] + '" after cross');
    return { ok: true, a: a, b: b, form: form, cross: c.deg };
  }

  //  The far end of a line, from one end, a true bearing and a length.
  //  Plane sailing with a cosine on the longitude: at Channel latitudes
  //  over a tenth of a mile the error is millimetres, and a great-circle
  //  term here would be precision the sailing instructions do not have.
  function along(p, brg, nm) {
    var r = brg * Math.PI / 180;
    var dlat = (nm / 60) * Math.cos(r);
    var dlon = (nm / 60) * Math.sin(r) / Math.cos(p.lat * Math.PI / 180);
    return { lat: p.lat + dlat, lon: p.lon + dlon };
  }

  // ---- COURSE 1 -----------------------------------------------------
  function parseCourse(text) {
    var L = lines(text), i = 0, c = {
      name: null, source: null, start: null, classes: [], marks: [], finish: null
    };
    if (!L.length) return bad(0, 'the file is empty');
    if (L[0].s !== 'COURSE 1') return bad(L[0].n, 'the first line must be "COURSE 1"');

    var ended = false;
    for (i = 1; i < L.length; i++) {
      var ln = L[i].n, w = L[i].w, k = w[0], r;
      if (ended) return bad(ln, 'nothing may follow "end"');

      if (k === 'name') { c.name = L[i].s.slice(5).trim(); continue; }
      if (k === 'source') { c.source = L[i].s.slice(7).trim(); continue; }

      if (k === 'start') {
        if (w[1] === 'line') {
          if (c.start) return bad(ln, 'the course already has a start line');
          r = readLine(w, 1, ln); if (!r.ok) return r;
          c.start = r; continue;
        }
        if (w[1] === 'class') {
          var t = w[w.length - 1];
          if (!TIME.test(t)) return bad(ln, '"' + t + '" is not a time as YYYY-MM-DDTHH:MMZ');
          var nm = w.slice(2, w.length - 1).join(' ');
          if (!nm) return bad(ln, 'a class start needs a class name');
          var d;
          for (d = 0; d < c.classes.length; d++) {
            if (c.classes[d].name === nm) return bad(ln, 'class "' + nm + '" is already listed');
          }
          c.classes.push({ name: nm, at: t }); continue;
        }
        return bad(ln, 'start must be "start line ..." or "start class <name> <time>"');
      }

      if (k === 'mark') {
        //  The side is tested FIRST, so that a mark written without one
        //  is told what is missing rather than given the general form.
        //  A missing side and a mistyped side are the same sentence
        //  because they are the same mistake: the file does not say
        //  which way round the mark is left.
        var side = w[w.length - 1];
        if (!SIDES.hasOwnProperty(side)) {
          return bad(ln, 'the side must be port, starboard or either -- "either" still has to be written down');
        }
        if (w.length < 5) return bad(ln, 'a mark is "mark <name> <lat> <lon> <side>"');
        var p2 = pos(w, w.length - 3, ln); if (!p2.ok) return p2;
        var mname = w.slice(1, w.length - 3).join(' ');
        if (!mname) return bad(ln, 'a mark needs a name');
        c.marks.push({ name: mname, lat: p2.lat, lon: p2.lon, side: side });
        continue;
      }

      if (k === 'finish') {
        if (c.finish) return bad(ln, 'the course already has a finish');
        r = readLine(w, 1, ln); if (!r.ok) return r;
        c.finish = r; continue;
      }

      if (k === 'end') { ended = true; continue; }

      //  An unknown key is refused rather than ignored: a line nothing
      //  reads is a line somebody believes.
      return bad(ln, 'unknown line "' + k + '" in a COURSE 1 file');
    }

    if (!ended) return bad(L[L.length - 1].n, 'the file does not end with "end" -- it may have been cut short');
    if (!c.source) return bad(0, 'a course must say where its figures came from: source <...>');
    if (!c.start) return bad(0, 'the course has no start line');
    if (!c.classes.length) return bad(0, 'the course lists no class start');
    if (!c.marks.length) return bad(0, 'the course has no marks');
    if (!c.finish) return bad(0, 'the course has no finish');

    c.ok = true;
    //  The order of the marks is the order of the lines. There is no
    //  index to disagree with it.
    c.classOf = function (n) {
      var j; for (j = 0; j < c.classes.length; j++) if (c.classes[j].name === n) return c.classes[j];
      return null;
    };
    return c;
  }

  // ---- AREAS 1 ------------------------------------------------------
  function parseAreas(text) {
    var L = lines(text), i, a = { source: null, shapes: [] };
    if (!L.length) return bad(0, 'the file is empty');
    if (L[0].s !== 'AREAS 1') return bad(L[0].n, 'the first line must be "AREAS 1"');

    var layer = null, open = null, pts = null, ended = false;
    for (i = 1; i < L.length; i++) {
      var ln = L[i].n, w = L[i].w, k = w[0];
      if (ended) return bad(ln, 'nothing may follow "end"');

      if (open) {
        //  A structural keyword inside an open shape means the shape was
        //  never closed. Without this the reader complains that "layer"
        //  is not a latitude, which is true and useless: it sends a
        //  reader to the wrong line entirely.
        if ((k === 'layer' || k === 'line' || k === 'area' ||
             (k === 'end' && w[1] !== open))) {
          return bad(ln, 'a ' + open + ' was never closed with "end ' + open + '"');
        }
        if (k === 'end' && w[1] === open) {
          if (pts.length < 2) return bad(ln, 'a ' + open + ' needs at least two positions');
          if (open === 'area' && pts.length < 3) return bad(ln, 'an area needs at least three positions');
          a.shapes.push({ kind: open, layer: layer, points: pts });
          open = null; pts = null; continue;
        }
        var pp = pos(w, 0, ln); if (!pp.ok) return pp;
        if (w.length > 2) return bad(ln, 'a position is a latitude and a longitude and nothing else');
        pts.push([pp.lat, pp.lon]);
        continue;
      }

      if (k === 'source') { a.source = L[i].s.slice(7).trim(); continue; }
      if (k === 'layer') {
        if (w.length !== 2) return bad(ln, 'a layer name is one word with no spaces');
        layer = w[1]; continue;
      }
      if (k === 'line' || k === 'area') {
        if (!layer) return bad(ln, 'a ' + k + ' must come after a layer');
        if (w.length !== 1) return bad(ln, '"' + k + '" takes nothing on its own line');
        open = k; pts = []; continue;
      }
      if (k === 'end') { ended = true; continue; }
      return bad(ln, 'unknown line "' + k + '" in an AREAS 1 file');
    }

    if (open) return bad(L[L.length - 1].n, 'a ' + open + ' was never closed with "end ' + open + '"');
    if (!ended) return bad(L[L.length - 1].n, 'the file does not end with "end" -- it may have been cut short');
    if (!a.source) return bad(0, 'an areas file must say where its shapes came from: source <...>');
    if (!a.shapes.length) return bad(0, 'the file holds no shapes');

    a.ok = true;
    a.layers = (function () {
      var seen = {}, out = [], j;
      for (j = 0; j < a.shapes.length; j++) {
        if (!seen[a.shapes[j].layer]) { seen[a.shapes[j].layer] = 1; out.push(a.shapes[j].layer); }
      }
      return out;
    })();
    return a;
  }

  // ---- RUN 1, RUN 2 and RUN 3 ----------------------------------------
  //  (RUN 3 is RUN 2 with one more line, `crew`: see where it is read.)
  //
  //  RUN 2 ADDS THE WEATHER TO THE EXPERIMENT. A run is one experiment --
  //  this boat, this start, this water -- and until now the wind and the
  //  stream, which decide the route more than anything else does, were
  //  not in the file at all. PILOT found it writing the 2025 run and kept
  //  them in a comment.
  //
  //  WHY A VERSION AND NOT ANOTHER OPTIONAL LINE. The rule in COURSE.md
  //  is that a new line is additive only if a reader that does not know
  //  it still reads a CORRECT file. A reader that ignores `wind` does not:
  //  it routes on whatever grids it was handed and reports the result as
  //  this run. That is a convincing route in the wrong weather, which is
  //  the fault GRID 1 exists to prevent, so it is RUN 2 and RUN 1 keeps
  //  being read.
  //
  //  AND IT SPLITS THE GATE'S `off` IN TWO. In RUN 1 `gate X off 2.0` did
  //  not say whether it meant "pass within 2 miles" or "stay 2 miles
  //  clear", which are opposite instructions to a router. RUN 2 has one
  //  verb for each, and keeps `within` and `off` as different words, so a
  //  misread verb cannot quietly invert the rule:
  //
  //      gate   Example Head 50.57868 -2.05644 within 2.0
  //      avoid  Example Race 50.51000 -2.44000 off 3.0
  //
  //  A RUN 1 gate keeps RUN 1's shape ({ off: nm } and no rule), because
  //  its meaning was never pinned down and presenting it as one of the
  //  two would be inventing what the author meant.
  function parseRun(text) {
    var L = lines(text), i, r = {
      version: 0, course: null, areas: [], polar: null, start: null,
      step: null, scale: { wind: 1, current: 1 },
      layers: [], clear: {}, round: null, gates: [],
      wind: null, current: null, crew: null, passage: null, roundLine: 0
    };
    if (!L.length) return bad(0, 'the file is empty');
    if (L[0].s === 'RUN 1') r.version = 1;
    else if (L[0].s === 'RUN 2') r.version = 2;
    else if (L[0].s === 'RUN 3') r.version = 3;
    else return bad(L[0].n, 'the first line must be "RUN 1", "RUN 2" or "RUN 3"');

    var ended = false;
    for (i = 1; i < L.length; i++) {
      var ln = L[i].n, w = L[i].w, k = w[0], v;
      if (ended) return bad(ln, 'nothing may follow "end"');

      if (k === 'course') { if (w.length !== 2) return bad(ln, 'course takes one filename'); r.course = w[1]; continue; }
      if (k === 'areas')  { if (w.length !== 2) return bad(ln, 'areas takes one filename'); r.areas.push(w[1]); continue; }
      if (k === 'polar')  { if (w.length !== 2) return bad(ln, 'polar takes one filename'); r.polar = w[1]; continue; }

      if (k === 'wind' || k === 'current') {
        if (r.version < 2) return bad(ln, k + ' is a RUN 2 line; this file says RUN 1');
        if (w.length !== 2) return bad(ln, k + ' takes one grid filename');
        r[k] = w[1]; continue;
      }

      //  THE CREW IS A RUN 3 LINE, AND RUN 3 IS RUN 2 PLUS THIS LINE.
      //  The first draft made it an optional line of RUN 2, on the
      //  argument that it adds a cost and changes what no other line
      //  means. That is the argument the format itself rejects (see
      //  "Changing them" in COURSE.md, and `wind` above): a reader that
      //  did not know the line would sail the run with tacks that cost
      //  nothing and report the result as this run - a convincing
      //  route for the wrong crew. A new version makes that impossible,
      //  because a reader that does not know RUN 3 refuses the file.
      //
      //  The line is still optional. A RUN 3 without it, and every
      //  RUN 2, is sailed with manoeuvres that cost nothing, and the
      //  report says so.
      if (k === 'crew') {
        if (r.version < 3) return bad(ln, 'crew is a RUN 3 line; this file says RUN ' + r.version);
        if (w.length !== 3) return bad(ln, 'crew is "crew <file> <level>"');
        if (r.crew) return bad(ln, 'a run has one crew');
        r.crew = { file: w[1], level: w[2] }; continue;
      }

      if (k === 'avoid') {
        if (r.version < 2) return bad(ln, 'avoid is a RUN 2 line; this file says RUN 1');
        if (w[w.length - 2] !== 'off') return bad(ln, 'avoid is "avoid <name> <lat> <lon> off <nm>"');
        var ao = num(w[w.length - 1]);
        if (ao === null || ao <= 0) return bad(ln, 'the distance to stay off must be positive');
        var ap = pos(w, w.length - 4, ln); if (!ap.ok) return ap;
        var an = w.slice(1, w.length - 4).join(' ');
        if (!an) return bad(ln, 'an avoid needs a name');
        r.gates.push({ name: an, lat: ap.lat, lon: ap.lon, rule: 'avoid', nm: ao }); continue;
      }

      if (k === 'start') {
        if (w[1] === 'class') {
          var cn = w.slice(2).join(' ');
          if (!cn) return bad(ln, 'start class needs a class name');
          r.start = { by: 'class', name: cn }; continue;
        }
        if (w[1] === 'at') {
          if (!TIME.test(w[2])) return bad(ln, '"' + w[2] + '" is not a time as YYYY-MM-DDTHH:MMZ');
          r.start = { by: 'at', at: w[2] }; continue;
        }
        return bad(ln, 'start is "start class <name>" or "start at <time>"');
      }

      if (k === 'step') {
        if (w[1] !== 'time' || w[3] !== 'heading') return bad(ln, 'step is "step time <seconds> heading <degrees>"');
        var ts = num(w[2]), hs = num(w[4]);
        if (ts === null || ts <= 0) return bad(ln, 'the time step must be a positive number of seconds');
        if (hs === null || hs <= 0 || hs > 90) return bad(ln, 'the heading step must be more than 0 and at most 90 degrees');
        r.step = { time: ts, heading: hs }; continue;
      }

      if (k === 'scale') {
        if (w[1] !== 'wind' || w[3] !== 'current') return bad(ln, 'scale is "scale wind <f> current <f>"');
        var sw = num(w[2]), sc = num(w[4]);
        if (sw === null || sw < 0) return bad(ln, 'the wind scale must be zero or more');
        if (sc === null || sc < 0) return bad(ln, 'the current scale must be zero or more');
        r.scale = { wind: sw, current: sc }; continue;
      }

      if (k === 'layers') {
        if (w.length < 2) return bad(ln, 'layers needs at least one layer name');
        r.layers = r.layers.concat(w.slice(1)); continue;
      }

      if (k === 'clear') {
        if (w.length < 3 || (w.length - 1) % 2) return bad(ln, 'clear is pairs of "<layer> <nm>"');
        var j;
        for (j = 1; j < w.length; j += 2) {
          v = num(w[j + 1]);
          if (v === null || v < 0) return bad(ln, 'a clearance must be zero or more nautical miles');
          r.clear[w[j]] = v;
        }
        continue;
      }

      if (k === 'round') {
        v = num(w[1]);
        if (v === null || v <= 0) return bad(ln, 'round must be a positive distance in nautical miles');
        r.round = v; r.roundLine = ln; continue;
      }

      if (k === 'gate') {
        var want = r.version >= 2 ? 'within' : 'off';
        if (w[w.length - 2] !== want) {
          //  Naming the other version's word on purpose: it is the
          //  mistake somebody copying an old file will actually make.
          if (r.version >= 2 && w[w.length - 2] === 'off') {
            return bad(ln, 'in RUN 2 a gate is "gate <name> <lat> <lon> within <nm>", ' +
                           'and "avoid <name> <lat> <lon> off <nm>" is the one to stay clear of');
          }
          return bad(ln, 'a gate is "gate <name> <lat> <lon> ' + want + ' <nm>"');
        }
        var off = num(w[w.length - 1]);
        if (off === null || off <= 0) return bad(ln, 'a gate\'s distance must be positive');
        var gp = pos(w, w.length - 4, ln); if (!gp.ok) return gp;
        var gn = w.slice(1, w.length - 4).join(' ');
        if (!gn) return bad(ln, 'a gate needs a name');
        //  STILL READ, NO LONGER SAILED.  A RUN 2 file with a gate in it
        //  is read, so that it says what it means; check() then refuses
        //  it and names what replaced it: a `pass` line in a passage
        //  file (Larry, 13 November 2026), where the places she must
        //  pass sit beside the marks and their berths.
        if (r.version >= 2) r.gates.push({ name: gn, lat: gp.lat, lon: gp.lon, rule: 'within', nm: off, line: ln });
        else r.gates.push({ name: gn, lat: gp.lat, lon: gp.lon, off: off });
        continue;
      }

      //  THE PASSAGE: WHICH PLAN, OF WHICH PASSAGE FILE, THIS RUN SAILS
      //  (Larry, 13 November 2026).  The figures of a lesson -- each
      //  mark's berth, and the places she must pass on the way -- live
      //  in a passage file of named plans, so that "two miles off" and
      //  "one mile off" are two plans in one file and not two copies of
      //  a run.  A RUN 3 line, for the reason `crew` is: a reader that
      //  skipped it would sail the run with no berths and no passes and
      //  report the result as this run.
      if (k === 'passage') {
        if (r.version < 3) return bad(ln, 'passage is a RUN 3 line; this file says RUN ' + r.version);
        if (w.length !== 3) return bad(ln, 'passage is "passage <file> <plan>"');
        if (r.passage) return bad(ln, 'a run sails one passage');
        r.passage = { file: w[1], plan: w[2], line: ln }; continue;
      }
      //  Where a mark falls among the places she passes is said in the
      //  plan, beside its berth.  The line is named, because the shape
      //  of it was shown before the passage file was settled.
      if (k === 'mark') {
        return bad(ln, 'a mark is placed in a passage file, with its berth: "mark <name> berth <nm>" in a plan, ' +
                       'and the run names the plan with "passage <file> <plan>"');
      }

      if (k === 'end') { ended = true; continue; }
      return bad(ln, 'unknown line "' + k + '" in a RUN ' + r.version + ' file');
    }

    if (!ended) return bad(L[L.length - 1].n, 'the file does not end with "end" -- it may have been cut short');
    if (!r.course) return bad(0, 'a run must name a course');
    if (!r.polar) return bad(0, 'a run must name a polar -- the boat belongs to the run, not to the course');
    if (!r.start) return bad(0, 'a run must choose a start');
    if (!r.step) return bad(0, 'a run must give its time and heading steps');
    //  ONE PLACE FOR A BERTH.  A run that names a passage has each
    //  mark's berth from its plan; a `round` beside it would be a
    //  second figure for the same thing, and a reader could not tell
    //  which was sailed.  So the two together are refused, and the
    //  refusal names both lines.  A run with no passage says `round`,
    //  one berth for every mark, exactly as before.
    if (r.passage) {
      if (r.round !== null) {
        return bad(r.roundLine, 'this run names a passage (line ' + r.passage.line + '), which gives each mark its own berth, ' +
                                'so it may not also say "round": take one of the two out');
      }
    } else if (r.round === null) {
      return bad(0, 'a run must say how far off she rounds a mark: "round <nm>", or name a passage that gives each mark its berth');
    }
    //  BOTH GRIDS, IN RUN 2, AND NOT OPTIONALLY. A run that names its boat
    //  and its start but not its weather is a route nobody can reproduce.
    if (r.version >= 2 && !r.wind) return bad(0, 'a RUN 2 file must name its wind grid: wind <file>');
    if (r.version >= 2 && !r.current) return bad(0, 'a RUN 2 file must name its current grid: current <file>');

    //  A clearance for a layer the run is not looking at means somebody
    //  expected a margin on water that is not in play. Refused, because
    //  the alternative is a run that is less careful than it reads.
    var c2, live = {};
    for (c2 = 0; c2 < r.layers.length; c2++) live[r.layers[c2]] = 1;
    for (c2 in r.clear) {
      if (r.clear.hasOwnProperty(c2) && !live[c2]) {
        return bad(0, 'clear names layer "' + c2 + '", which is not in layers');
      }
    }

    r.ok = true;
    return r;
  }

  //  The three together: the one check that spans files, which is that
  //  a run choosing a class start names a class the course actually
  //  lists. A run that silently starts at the wrong time is a lesson
  //  that teaches the wrong thing.
  function check(run, course, areas) {
    if (run.start.by === 'class') {
      if (!course.classOf(run.start.name)) {
        return { ok: false, err: 'the run starts with class "' + run.start.name +
                 '", which the course does not list' };
      }
    }
    var have = {}, i, j;
    for (i = 0; i < (areas || []).length; i++) {
      for (j = 0; j < areas[i].layers.length; j++) have[areas[i].layers[j]] = 1;
    }
    for (i = 0; i < run.layers.length; i++) {
      if (!have[run.layers[i]]) {
        return { ok: false, err: 'the run uses layer "' + run.layers[i] +
                 '", which none of its areas files holds' };
      }
    }

    //  A GATE IN A RUN IS NOT SAILED.  A place she must pass is a `pass`
    //  line in a passage file (Larry, 13 November 2026), in its place
    //  among the marks.  Refused rather than ignored: a gate ignored is
    //  a route that leaves out the thing the run was written to ask.
    for (i = 0; i < (run.gates || []).length; i++) {
      if (run.gates[i].rule === 'within') {
        return { ok: false, err: 'line ' + run.gates[i].line + ' is a gate, which a run no longer sails: a place she must pass ' +
                 'is "pass <name> <lat> <lon> within <nm>" in a passage file, and the run names it with "passage <file> <plan>"' };
      }
    }
    return { ok: true };
  }

  //  THE GRIDS A RUN NAMED, AGAINST THE GRIDS THAT WERE LOADED.
  //
  //  The run file names two filenames; a filename is not evidence of
  //  anything. The kind is in each grid's own header, so the check is
  //  made against that rather than against the name: swap the two files
  //  and nothing in the filenames says so, but a `kind current` grid
  //  loaded as the wind is caught here.
  //
  //  `grids` is { wind: <GRID.parse result>, current: <...> }. It is a
  //  separate call rather than part of check(), because parsing text and
  //  loading files are different jobs and the parser never reads a file.
  function checkGrids(run, grids) {
    var want = ['wind', 'current'], i, k, g;
    if (!run || run.version < 2) return { ok: true };   // RUN 1 named none
    for (i = 0; i < want.length; i++) {
      k = want[i];
      g = grids ? grids[k] : null;
      if (!g) return { ok: false, err: 'the run names a ' + k + ' grid, ' + run[k] + ', which was not loaded' };
      if (!g.ok) return { ok: false, err: run[k] + ' did not load: ' + g.err };
      if (!g.meta || g.meta.kind !== k) {
        return { ok: false, err: run[k] + ' was given as the ' + k + ' grid, but it says kind ' +
                 ((g.meta && g.meta.kind) || 'nothing') };
      }
      //  THE BOAT SAILS IN THE SURFACE WIND, and a 925 hPa or
      //  geostrophic wind loaded in its place does not error -- it
      //  routes, on a wind perhaps a third too strong and veered from
      //  the real one. GRID 2 puts the level in the file so that this
      //  check can exist; a GRID 1 wind needs no level because GRID 1
      //  is the surface format and says so.
      if (k === 'wind' && g.meta.version >= 2 && g.meta.level !== 'surface') {
        return { ok: false, err: run[k] + ' is a ' + g.meta.level + ' wind, and a route is sailed ' +
                 'in the surface wind: upper winds are for reading, not for routing' };
      }
    }
    return { ok: true };
  }

  // ---------------------------------------------------------------
  //  CREW 1: how well she is tacked and gybed.
  //
  //      CREW 1
  //      grades   clean     fair      slow      blown
  //      level green      10 30     40 75     35 180    15 420
  //      gybe  green       5 60     35 120    40 300    20 900
  //      level able       53 15     36 45      9 120     2 300
  //      gybe  able       45 30     40 60     12 180     3 600
  //      end
  //
  //  A manoeuvre comes off in one of several GRADES, named on the
  //  `grades` line, best first. For each crew LEVEL a `level` line
  //  gives, grade by grade, a pair of numbers: the share of her tacks
  //  that come off that way, in per cent, and the time each one loses,
  //  in seconds. A `gybe` line gives the same for her gybes.
  //
  //  THE SHARES ARE SHARES AND NOT COUNTS, because how many times she
  //  tacks is the router's answer and not something the file can know:
  //  a crew that tacks badly is sailed with fewer tacks. Each line's
  //  shares must add to 100.
  //
  //  EVERY LEVEL HAS ITS GYBE LINE (Larry, 13 November 2026: "its own
  //  line for sure, and a blown gybe is expensive"). A level without
  //  one is refused, so that no gybe is ever costed by a rule the file
  //  does not state.
  //
  //  WHAT THE ROUTER USES is the MEAN: the shares times the times. It
  //  plans on what a tack costs this crew on average, as a navigator
  //  would, and does not know which tack will be the blown one.
  // ---------------------------------------------------------------
  function parseCrew(text) {
    var L = lines(text), i, c = { version: 0, grades: null, levels: [] }, by = {}, ended = false;
    if (!L.length) return bad(0, 'the file is empty');
    if (L[0].s !== 'CREW 1') {
      return bad(L[0].n, /^CREW\s/.test(L[0].s) ? 'this reader knows CREW 1; the file says ' + L[0].s
                                                : 'the first line must be "CREW 1"');
    }
    c.version = 1;

    function pairs(w, ln, what) {
      var n = c.grades.length, share = [], lost = [], sum = 0, j, a, b, mean = 0;
      if (w.length !== 2 + 2 * n) {
        return bad(ln, what + ' needs a share and a time for each of the ' + n + ' grades: ' +
                       (2 * n) + ' numbers, and this line has ' + (w.length - 2));
      }
      for (j = 0; j < n; j++) {
        a = num(w[2 + 2 * j]); b = num(w[3 + 2 * j]);
        if (a === null || a < 0 || a > 100) return bad(ln, '"' + w[2 + 2 * j] + '" is not a share between 0 and 100');
        if (b === null || b < 0) return bad(ln, '"' + w[3 + 2 * j] + '" is not a time lost, in seconds');
        share.push(a); lost.push(b); sum += a; mean += a * b / 100;
      }
      if (Math.abs(sum - 100) > 0.01) {
        return bad(ln, 'the shares on this line add up to ' + (Math.round(sum * 100) / 100) + ', not 100');
      }
      return { ok: true, share: share, lost: lost, mean: mean };
    }

    for (i = 1; i < L.length; i++) {
      var ln = L[i].n, w = L[i].w, k = w[0], p, seenG = {}, j;
      if (ended) return bad(ln, 'nothing may follow "end"');

      if (k === 'grades') {
        if (c.grades) return bad(ln, 'the grades are named once');
        if (w.length < 2) return bad(ln, 'grades needs at least one name');
        for (j = 1; j < w.length; j++) {
          if (num(w[j]) !== null) return bad(ln, 'a grade is a name, and "' + w[j] + '" is a number');
          if (seenG[w[j]]) return bad(ln, 'the grade "' + w[j] + '" is named twice');
          seenG[w[j]] = 1;
        }
        c.grades = w.slice(1); continue;
      }

      if (k === 'level' || k === 'gybe') {
        if (!c.grades) return bad(ln, 'the grades line must come before the first level');
        if (w.length < 2 || num(w[1]) !== null) return bad(ln, k + ' is "' + k + ' <name> <share> <seconds> ..."');
        if (k === 'level') {
          if (by[w[1]]) return bad(ln, 'the level "' + w[1] + '" is given twice');
          p = pairs(w, ln, 'a level'); if (!p.ok) return p;
          by[w[1]] = { name: w[1], tack: { share: p.share, lost: p.lost, mean: p.mean }, gybe: null };
          c.levels.push(by[w[1]]);
        } else {
          if (!by[w[1]]) return bad(ln, 'a gybe line follows its level, and there is no level "' + w[1] + '" above it');
          if (by[w[1]].gybe) return bad(ln, 'the gybes of "' + w[1] + '" are given twice');
          p = pairs(w, ln, 'a gybe line'); if (!p.ok) return p;
          by[w[1]].gybe = { share: p.share, lost: p.lost, mean: p.mean };
        }
        continue;
      }

      if (k === 'end') { ended = true; continue; }
      return bad(ln, 'unknown line "' + k + '" in a CREW 1 file');
    }

    if (!ended) return bad(L[L.length - 1].n, 'the file does not end with "end" -- it may have been cut short');
    if (!c.grades) return bad(0, 'a crew file must name its grades');
    if (!c.levels.length) return bad(0, 'a crew file must give at least one level');
    for (i = 0; i < c.levels.length; i++) {
      if (!c.levels[i].gybe) {
        return bad(0, 'the level "' + c.levels[i].name + '" has no gybe line: every level says what its gybes cost');
      }
    }
    c.level = function (n) { return by.hasOwnProperty(n) ? by[n] : null; };
    c.ok = true;
    return c;
  }

  //  The run against its crew file: the level it asks for is one the
  //  file gives. A run with no crew line needs no crew file.
  function checkCrew(run, crew, file) {
    if (!run || !run.crew) return { ok: true };
    var name = file || run.crew.file;
    if (!crew) return { ok: false, err: 'the run names a crew file, ' + name + ', which was not loaded' };
    if (!crew.ok) return { ok: false, err: name + ' did not load: ' + crew.err };
    if (!crew.level(run.crew.level)) {
      return { ok: false, err: 'the run asks for crew level "' + run.crew.level + '", which ' + name +
               ' does not give; it has ' + crew.levels.map(function (l) { return l.name; }).join(', ') };
    }
    return { ok: true };
  }

  // ---- PASSAGE 1 ---------------------------------------------------
  //
  //  The figures a lesson changes, in one file a learner can open
  //  (Larry, 13 November 2026; the berth per mark is PILOT's proposal).
  //
  //      PASSAGE 1
  //      plan two-miles
  //        pass  St Albans Head 50.57868 -2.05644 south within 2.0
  //        mark  Eddystone Lt House berth 0.15
  //        mark  North Head Buoy
  //      end
  //
  //  A plan is the passage sailed down the page: the marks of the
  //  course in their order, each with its berth, and the places she
  //  must pass among them.  A run names one plan; a lesson that asks
  //  "two miles off, or one?" is two plans in one file.
  //
  //  THE WORDS.  The course file keeps the sailing instructions' own
  //  words for a mark, port, starboard or either, and this file does
  //  not repeat them.  A place passed on one side takes a compass word,
  //  north, east, south or west, and is then a LINE from its point, that
  //  many miles that way, which she must cross: "south within 2.0" at a
  //  headland is a line two miles south from it.  A pass with no
  //  compass word is a circle she must come into, on either side.
  //
  //  A BERTH is nautical miles, at most two decimals, from 0.05 to 2.00:
  //  close under a buoy to well off a reef.  It means what `round`
  //  means: she rounds on the right side and is never nearer, at any
  //  time.  A hundredth is the finest figure a chart gives a berth to.
  var PLAN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
  function berthOf(w) {
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(w)) return null;
    return parseFloat(w);
  }
  function parsePassage(text) {
    var L = lines(text), i, p = { version: 0, plans: {}, order: [] }, cur = null, ended = false;
    if (!L.length) return bad(0, 'the file is empty');
    if (L[0].s !== 'PASSAGE 1') return bad(L[0].n, 'the first line must be "PASSAGE 1"');
    p.version = 1;
    for (i = 1; i < L.length; i++) {
      var ln = L[i].n, w = L[i].w, k = w[0];
      if (ended) return bad(ln, 'nothing may follow "end"');
      if (k === 'end') {
        if (w.length !== 1) return bad(ln, '"end" stands alone on its line');
        ended = true; continue;
      }
      if (k === 'plan') {
        if (w.length !== 2 || !PLAN.test(w[1])) {
          return bad(ln, 'a plan is "plan <name>", the name one word of letters, figures, "-", "_" or "."');
        }
        if (p.plans.hasOwnProperty(w[1])) return bad(ln, 'the plan "' + w[1] + '" is written twice');
        if (cur && !cur.items.length) return bad(cur.line, 'the plan "' + cur.name + '" has nothing in it');
        cur = { name: w[1], line: ln, items: [] };
        p.plans[w[1]] = cur; p.order.push(w[1]); continue;
      }
      if (k !== 'mark' && k !== 'pass') return bad(ln, 'unknown line "' + k + '" in a PASSAGE 1 file');
      if (!cur) return bad(ln, 'a ' + k + ' line belongs to a plan: write "plan <name>" above it');

      if (k === 'mark') {
        var berth = null, nw = w.slice(1);
        if (w.length >= 3 && w[w.length - 2] === 'berth') {
          berth = berthOf(w[w.length - 1]);
          if (berth === null) return bad(ln, 'a berth is nautical miles with at most two decimals, as "berth 0.15"');
          if (berth < 0.05 || berth > 2) {
            return bad(ln, 'a berth is from 0.05 to 2.00 nautical miles, and this one is ' + w[w.length - 1]);
          }
          nw = w.slice(1, w.length - 2);
        } else if (w.indexOf('berth') > 0) {
          return bad(ln, 'a mark line is "mark <name> berth <nm>", with the berth last');
        }
        var mn = nw.join(' ');
        if (!mn) return bad(ln, 'mark needs the name of a mark of the course');
        //  A mark may be placed more than once: a course may round the
        //  same buoy twice.  Whether this is the right mark here is the
        //  course's to say, and checkPassage() holds it to the course.
        cur.items.push({ kind: 'mark', name: mn, berth: berth, line: ln }); continue;
      }

      //  pass <name> <lat> <lon> [north|east|south|west] within <nm>
      if (w.length < 6 || w[w.length - 2] !== 'within') {
        return bad(ln, 'a pass is "pass <name> <lat> <lon> within <nm>", with north, east, south or west ' +
                       'before "within" when she must pass on one side');
      }
      var nm = num(w[w.length - 1]);
      if (nm === null || nm <= 0) return bad(ln, 'the distance of a pass must be positive');
      var dir = null, at = w.length - 4, before = w[w.length - 3];
      if (COMPASS.hasOwnProperty(before)) { dir = before; at = w.length - 5; }
      else if (num(before) === null) return bad(ln, '"' + before + '" is not north, east, south or west');
      var pp = pos(w, at, ln);
      if (!pp.ok) return pp;
      var pn = w.slice(1, at).join(' ');
      if (!pn) return bad(ln, 'a pass needs a name');
      cur.items.push({ kind: 'pass', name: pn, lat: pp.lat, lon: pp.lon, dir: dir, nm: nm, line: ln });
    }
    if (!ended) return bad(L[L.length - 1].n, 'the file does not end with "end" -- it may have been cut short');
    if (!p.order.length) return bad(0, 'a passage file needs at least one plan');
    if (cur && !cur.items.length) return bad(cur.line, 'the plan "' + cur.name + '" has nothing in it');
    p.ok = true;
    return p;
  }

  //  THE MARK THAT ENDS THE FINISH LINE.  When the course's last mark is
  //  one end of the finish line, crossing the line the right way is
  //  rounding it (the router's own rule, which this mirrors).  It takes
  //  NO BERTH: the 2025 finish line runs only 0.10 miles north from
  //  North Head Buoy, and a berth of 0.10 round the buoy would cover
  //  all of it but the far tip, so she could not finish (found in
  //  PILOT's proposal, 13 November 2026; Larry ruled it out).
  function finishPin(course) {
    var m = course.marks[course.marks.length - 1];
    if (!m || !course.finish) return null;
    function apart(a, b) {
      return Math.hypot((a.lat - b.lat) * 60, (a.lon - b.lon) * 60 * Math.cos(a.lat * Math.PI / 180));
    }
    return (apart(m, course.finish.a) < 0.02 || apart(m, course.finish.b) < 0.02) ? m.name : null;
  }

  //  THE PASSAGE AGAINST THE COURSE.  Every plan in the file, not only
  //  the one the run sails: a file is written for one course, and a
  //  fault in the plan nobody sailed today is the one somebody sails
  //  tomorrow.  Every mark of the course, in its order, in every plan,
  //  because a mark left out cannot be told from a mark forgotten.
  //
  //  ONE BY ONE, NOT BY NAME.  The plan's marks are matched against the
  //  course's in turn: the first mark line against the course's first
  //  mark, and so on.  A course may round the same buoy twice, and a
  //  check that looked a name up would find the first rounding both
  //  times; the first form of this did, and so refused every plan for
  //  such a course (found by putting its own order check back, which
  //  then caught nothing: a name looked up can never be out of turn).
  function checkPassage(run, passage, course) {
    if (!run || !run.passage) return { ok: true };
    var file = run.passage.file;
    if (!passage) return { ok: false, err: 'the run names a passage file, ' + file + ', which was not loaded' };
    if (!passage.ok) return { ok: false, err: file + ' did not load: ' + passage.err };
    if (!passage.plans.hasOwnProperty(run.passage.plan)) {
      return { ok: false, err: 'the run sails plan "' + run.passage.plan + '", which ' + file +
               ' does not have; it has ' + passage.order.join(', ') };
    }
    var names = course.marks.map(function (m) { return m.name; }), pin = finishPin(course), n, i;
    function no(it, why) { return { ok: false, err: file + ', line ' + it.line + ': ' + why }; }
    for (n = 0; n < passage.order.length; n++) {
      var plan = passage.plans[passage.order[n]], at = 0, ended = false;
      for (i = 0; i < plan.items.length; i++) {
        var it = plan.items[i];
        if (ended) return no(it, 'nothing may come after ' + pin + ', which is the end of the finish line');
        if (it.kind !== 'mark') continue;
        if (names.indexOf(it.name) < 0) {
          return no(it, 'the course has no mark "' + it.name + '"; it has ' + (names.join(', ') || 'none'));
        }
        if (at >= names.length) {
          return no(it, 'plan "' + plan.name + '" places "' + it.name + '" again, after every mark of the course');
        }
        if (it.name !== names[at]) {
          return no(it, 'plan "' + plan.name + '" places "' + it.name + '" where the course rounds "' + names[at] + '" next');
        }
        at++;
        if (it.name === pin && at === names.length) {
          if (it.berth !== null) {
            return no(it, it.name + ' is the end of the finish line, and takes no berth: a berth round it would cover ' +
                          'the line she must cross. Take "berth ' + it.berth.toFixed(2) + '" off this line');
          }
          ended = true;
        } else if (it.berth === null) {
          return no(it, 'plan "' + plan.name + '" gives ' + it.name + ' no berth: end its line "berth <nm>"');
        }
      }
      if (at < names.length) {
        return { ok: false, err: file + ': plan "' + plan.name + '" does not place "' + names[at] +
                 '"; every mark of the course appears in every plan, in its order' };
      }
    }
    return { ok: true };
  }

  // ---- MOTOR 1 -----------------------------------------------------
  //
  //  The motorboat of the course's Levels 1 and 2, derived from a
  //  Level 3 run (Larry, 14 November 2026: "to illustrate the impact of
  //  each level's layer of reality, we map to the L3 waypoints and
  //  times, so L1's sailing directions are derived from the L3 run").
  //
  //      MOTOR 1
  //      follow   run_2025_as_sailed_v1.txt
  //      speed    same
  //      scale    current 0
  //      step     time 600
  //      waypoint Hurst narrows       meridian -1.550
  //      clear    off Start Point     50.20000 -3.68000
  //      waypoint Eddystone Lt House  mark
  //      end
  //
  //  `follow` names the Level 3 run.  Each `waypoint` is a place on
  //  Level 3's track: where it first crosses a meridian after the
  //  waypoint before, or where it comes closest to a mark of the course.
  //  Level 3's time there is the time the motorboat must keep.  A
  //  `clear` is a waypoint the lesson adds to take a rhumb line clear of
  //  a danger; it has no time of its own, and its leg's time is shared
  //  by distance.  The start and the finish are Level 3's own.
  //
  //  `speed same` sails each leg at the speed that keeps Level 3's time
  //  in still water; `speed on-time` finds, leg by leg, the speed that
  //  keeps it in the stream.  `scale current` is required, so that
  //  Level 1's still water is written down and not assumed: Level 1 is
  //  `speed same` with `scale current 0`.
  function parseMotor(text) {
    var L = lines(text), i, m = { version: 0, follow: null, speed: null, scale: null, step: null, points: [] }, ended = false;
    if (!L.length) return bad(0, 'the file is empty');
    if (L[0].s !== 'MOTOR 1') return bad(L[0].n, 'the first line must be "MOTOR 1"');
    m.version = 1;
    for (i = 1; i < L.length; i++) {
      var ln = L[i].n, w = L[i].w, k = w[0], v;
      if (ended) return bad(ln, 'nothing may follow "end"');
      if (k === 'end') { if (w.length !== 1) return bad(ln, '"end" stands alone on its line'); ended = true; continue; }
      if (k === 'follow') {
        if (w.length !== 2) return bad(ln, 'follow takes one run file: the Level 3 run the motorboat is derived from');
        if (m.follow) return bad(ln, 'a motorboat follows one run');
        m.follow = w[1]; continue;
      }
      if (k === 'speed') {
        if (w.length !== 2 || (w[1] !== 'same' && w[1] !== 'on-time')) {
          return bad(ln, 'speed is "speed same" (the speed that keeps Level 3\'s time in still water) or "speed on-time" (the speed that keeps it in the stream)');
        }
        if (m.speed) return bad(ln, 'speed is given twice');
        m.speed = w[1]; continue;
      }
      if (k === 'scale') {
        if (w.length !== 3 || w[1] !== 'current') return bad(ln, 'scale is "scale current <f>": 0 for still water, 1 for the stream as the grid gives it');
        v = num(w[2]);
        if (v === null || v < 0) return bad(ln, 'the current scale must be zero or more');
        m.scale = v; continue;
      }
      if (k === 'step') {
        if (w.length !== 3 || w[1] !== 'time') return bad(ln, 'step is "step time <seconds>"');
        v = num(w[2]);
        if (v === null || v < 10 || v > 3600) return bad(ln, 'the time step must be from 10 to 3600 seconds');
        m.step = v; continue;
      }
      if (k === 'waypoint') {
        if (w.length >= 3 && w[w.length - 1] === 'mark') {
          var mk = w.slice(1, w.length - 1).join(' ');
          if (!mk) return bad(ln, 'a mark waypoint is "waypoint <mark of the course> mark"');
          m.points.push({ kind: 'mark', name: mk, line: ln }); continue;
        }
        if (w.length >= 4 && w[w.length - 2] === 'meridian') {
          v = num(w[w.length - 1]);
          if (v === null || v < -180 || v > 180) return bad(ln, 'a meridian is a longitude from -180 to 180, west negative');
          var mn = w.slice(1, w.length - 2).join(' ');
          if (!mn) return bad(ln, 'a waypoint needs a name');
          m.points.push({ kind: 'meridian', name: mn, lon: v, line: ln }); continue;
        }
        return bad(ln, 'a waypoint is "waypoint <name> meridian <lon>" or "waypoint <mark of the course> mark"');
      }
      if (k === 'clear') {
        if (w.length < 4) return bad(ln, 'a clearing waypoint is "clear <name> <lat> <lon>"');
        var cp = pos(w, w.length - 2, ln);
        if (!cp.ok) return cp;
        var cn = w.slice(1, w.length - 2).join(' ');
        if (!cn) return bad(ln, 'a clearing waypoint needs a name');
        m.points.push({ kind: 'clear', name: cn, lat: cp.lat, lon: cp.lon, line: ln }); continue;
      }
      return bad(ln, 'unknown line "' + k + '" in a MOTOR 1 file');
    }
    if (!ended) return bad(L[L.length - 1].n, 'the file does not end with "end" -- it may have been cut short');
    if (!m.follow) return bad(0, 'a motorboat must name the Level 3 run it follows: follow <run file>');
    if (!m.speed) return bad(0, 'a motorboat must say how her speed is set: speed same, or speed on-time');
    if (m.scale === null) return bad(0, 'a motorboat must say how much of the stream she meets: scale current <f> (0 is Level 1\'s still water)');
    if (m.step === null) return bad(0, 'a motorboat must give its time step: step time <seconds>');
    if (!m.points.some(function (p) { return p.kind !== 'clear'; })) {
      return bad(0, 'a motorboat needs at least one waypoint taken from Level 3: a meridian or a mark');
    }
    m.ok = true;
    return m;
  }

  return {
    course: parseCourse, areas: parseAreas, run: parseRun, crew: parseCrew, passage: parsePassage, motor: parseMotor,
    check: check, checkGrids: checkGrids, checkCrew: checkCrew, checkPassage: checkPassage,
    finishPin: finishPin, along: along
  };
})();

if (typeof module !== 'undefined') module.exports = COURSE;

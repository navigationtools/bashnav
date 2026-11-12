// =====================================================================
//  COURSE 1, AREAS 1, RUN 1 -- the three files the router reads
//  besides the grids.
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

  // ---- RUN 1 --------------------------------------------------------
  function parseRun(text) {
    var L = lines(text), i, r = {
      course: null, areas: [], polar: null, start: null,
      step: null, scale: { wind: 1, current: 1 },
      layers: [], clear: {}, round: null, gates: []
    };
    if (!L.length) return bad(0, 'the file is empty');
    if (L[0].s !== 'RUN 1') return bad(L[0].n, 'the first line must be "RUN 1"');

    var ended = false;
    for (i = 1; i < L.length; i++) {
      var ln = L[i].n, w = L[i].w, k = w[0], v;
      if (ended) return bad(ln, 'nothing may follow "end"');

      if (k === 'course') { if (w.length !== 2) return bad(ln, 'course takes one filename'); r.course = w[1]; continue; }
      if (k === 'areas')  { if (w.length !== 2) return bad(ln, 'areas takes one filename'); r.areas.push(w[1]); continue; }
      if (k === 'polar')  { if (w.length !== 2) return bad(ln, 'polar takes one filename'); r.polar = w[1]; continue; }

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
        r.round = v; continue;
      }

      if (k === 'gate') {
        if (w[w.length - 2] !== 'off') return bad(ln, 'a gate is "gate <name> <lat> <lon> off <nm>"');
        var off = num(w[w.length - 1]);
        if (off === null || off <= 0) return bad(ln, 'a gate\'s distance off must be positive');
        var gp = pos(w, w.length - 4, ln); if (!gp.ok) return gp;
        var gn = w.slice(1, w.length - 4).join(' ');
        if (!gn) return bad(ln, 'a gate needs a name');
        r.gates.push({ name: gn, lat: gp.lat, lon: gp.lon, off: off }); continue;
      }

      if (k === 'end') { ended = true; continue; }
      return bad(ln, 'unknown line "' + k + '" in a RUN 1 file');
    }

    if (!ended) return bad(L[L.length - 1].n, 'the file does not end with "end" -- it may have been cut short');
    if (!r.course) return bad(0, 'a run must name a course');
    if (!r.polar) return bad(0, 'a run must name a polar -- the boat belongs to the run, not to the course');
    if (!r.start) return bad(0, 'a run must choose a start');
    if (!r.step) return bad(0, 'a run must give its time and heading steps');
    if (r.round === null) return bad(0, 'a run must say how close counts as rounded: round <nm>');

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
    return { ok: true };
  }

  return {
    course: parseCourse, areas: parseAreas, run: parseRun,
    check: check, along: along
  };
})();

if (typeof module !== 'undefined') module.exports = COURSE;

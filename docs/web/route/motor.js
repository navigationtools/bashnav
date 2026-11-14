// =====================================================================
//  The motorboat of Levels 1 and 2: fixed speed per leg, derived from a
//  Level 3 run.  Board item B21.
//
//      node docs/web/route/motor.js <folder> <motor file> [--route <json>] [--json <file>]
//
//  WHY IT EXISTS (Larry, 14 November 2026).  The course climbs a ladder:
//  each level adds one layer of reality -- the stream, then the wind and
//  the boat, then the weather -- and a student should SEE what each
//  layer did.  So the lower levels are not sailed on their own; they are
//  taken from the top one.  In Larry's words: "to illustrate the impact
//  of each level's layer of reality, we map to the L3 waypoints and
//  times, so L1's sailing directions are derived from the L3 run."
//
//    Level 1   a motorboat on rhumb lines between Level 3's waypoints,
//              arriving at Level 3's times, in still water.  Her speed
//              on each leg is the rhumb distance over Level 3's time.
//
//    Level 2   the same motorboat in the stream, holding each rhumb
//              line, correcting all along, two ways:
//                same speed  Level 1's speeds; she arrives early or late
//                on time     the speed each leg needs to keep the time
//
//  WHERE IT CANNOT BE DONE IT SAYS SO (Larry: "the teachable part").
//  A stream across her line stronger than her speed sets her off it,
//  and the output says when, where and how far.  There is no top speed
//  (Larry: "lets see what comes out the other side"), so "on time"
//  reports the speed needed however high it is.  A rhumb line over
//  water Level 3 was kept out of is refused, naming the leg and where it
//  crosses; the lesson adds a clearing waypoint, whose leg's time is
//  shared by distance so her speed does not change, and the refusal
//  offers Level 3's own tack or gybe point that would clear it (Larry:
//  tack points "would show the way").
//
//  A MARK IS AN ARC (Larry, 14 November 2026).  One point cannot
//  describe a rounding: from Level 3's closest point to the Eddystone a
//  straight line out cuts the light's berth, and one in from the east
//  runs over the NE Rock.  So a mark waypoint is Level 3's closest point
//  and one of Level 3's own track points each side of it, each at Level
//  3's time -- "and if its not enough, you just reiterate".  The arc
//  takes the next track point on a side while the line into or out of
//  it crosses something NEARER THE MARK THAN THAT POINT IS: the point
//  reaches past the danger, so taking it goes round it the way Level 3
//  did.  Anything farther off is the leg's business, refused as above;
//  without that limit an arc could creep thirty miles back along the
//  approach.  (At the Eddystone the NE Rock is 0.16 nm from the light
//  and the arc's first points only 0.14 and 0.24, so "nearer than the
//  arc already reaches" -- the first reading -- would not have grown.)
//  Every line between two of Level 3's track points is a step Level 3
//  sailed, and Level 3 was held to the same water, so an arc is clear.
//
//  THE WATERS ARE LEVEL 3'S.  The run the motor file follows names the
//  course, the areas with their clearances, the berth round each mark,
//  the water to avoid and the stream grid.  The motorboat is held to
//  all of them, read the same way, so that nothing she does is allowed
//  only because she is a different kind of boat.
//
//  HOW SHE HOLDS A LINE.  Each step she looks at the waypoint from where
//  she is and splits the stream into the part along that bearing and
//  the part across it.  If the part across is less than her speed she
//  heads up into it by exactly enough to cancel it, and the part along
//  adds to, or takes from, her speed made good.  If it is not less, she
//  cannot hold the line: she heads straight into the cross-stream, which
//  is the least she can be set, and is set.  When the stream eases she
//  makes for the waypoint from where she is, as a navigator would,
//  rather than regaining the old line; how far she is off the old line
//  is reported at every step until she arrives.
//
//  WHAT IT IS NOT.  A router: Level 3 chose these places.  A model of a
//  real motorboat: she has no top speed, makes her speed at once, and
//  steers perfectly.  Advice: a rhumb line that the areas allow can
//  still be a poor idea at sea.
// =====================================================================
'use strict';

var MOTOR = (function () {
  var R = (typeof ROUTE !== 'undefined') ? ROUTE : require('./route.js');
  var RAD = Math.PI / 180;
  var TOP = 256;           //  knots: not a top speed, the end of the search for one
  var EPS = 1e-9;

  function no(why, extra) {
    var o = { ok: false, why: why }, k;
    for (k in (extra || {})) o[k] = extra[k];
    return o;
  }
  function msOf(t) { return typeof t === 'number' ? t : Date.parse(t); }
  function iso(ms) { return new Date(Math.round(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z'); }
  function hhmm(ms) { return iso(ms).slice(11, 16); }

  //  One flat sheet for a leg, at its middle latitude.  The legs are a
  //  few tens of miles long; on that scale the sheet and the rhumb line
  //  agree to well under a cable, which is finer than anything drawn.
  function sheet(lat0) {
    var K = 60 * Math.cos(lat0 * RAD);
    return {
      lat0: lat0,
      xy: function (p) { return { x: p.lon * K, y: p.lat * 60 }; },
      ll: function (q) { return { lat: q.y / 60, lon: q.x / K }; }
    };
  }
  function dist(a, b) { var s = sheet((a.lat + b.lat) / 2), p = s.xy(a), q = s.xy(b); return Math.hypot(q.x - p.x, q.y - p.y); }
  function bearing(a, b) {
    var s = sheet((a.lat + b.lat) / 2), p = s.xy(a), q = s.xy(b);
    return R.norm360(Math.atan2(q.x - p.x, q.y - p.y) / RAD);
  }

  // ---- plane geometry, on one sheet -----------------------------------
  function side(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
  function ptSeg(p, a, b) {
    var vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy;
    var t = L ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / L : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return { d: Math.hypot(a.x + t * vx - p.x, a.y + t * vy - p.y), t: t, x: a.x + t * vx, y: a.y + t * vy };
  }
  //  where segment ab cuts segment cd, as the fraction along ab, or null
  function cut(a, b, c, d) {
    var s1 = side(a, b, c), s2 = side(a, b, d), s3 = side(c, d, a), s4 = side(c, d, b);
    if (((s1 > 0 && s2 < 0) || (s1 < 0 && s2 > 0)) && ((s3 > 0 && s4 < 0) || (s3 < 0 && s4 > 0))) return s3 / (s3 - s4);
    return null;
  }
  function inside(p, poly) {
    var i, j, n = poly.length, c = false;
    for (i = 0, j = n - 1; i < n; j = i++) {
      if ((poly[i].y > p.y) !== (poly[j].y > p.y) &&
          p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
    }
    return c;
  }

  // ---------------------------------------------------------------------
  //  waypoints(route, course, motor) -> { ok, points } or { ok: false, why }
  //
  //  The start and the finish are Level 3's own.  A meridian waypoint is
  //  where Level 3's track FIRST crosses that meridian after the waypoint
  //  before it; a mark waypoint is where the track comes closest to the
  //  mark, after the waypoint before it.  A clear waypoint has no time.
  // ---------------------------------------------------------------------
  function waypoints(route, course, motor) {
    var rows = route.rows, sum = route.summary;
    if (!rows || !rows.length) return no('the Level 3 run has no track');
    var t0 = msOf(sum.start), tEnd = msOf(sum.finish);
    var last = rows[rows.length - 1];
    var segs = rows.map(function (r) {
      return { a: { lat: r.lat, lon: r.lon }, b: { lat: r.lat2, lon: r.lon2 }, ms: r.ms, ms2: r.ms + r.minutes * 60000 };
    });
    var out = [{ name: 'the start', kind: 'start', lat: rows[0].lat, lon: rows[0].lon, ms: t0 }];
    var at = { i: 0, f: 0 }, prev = out[0];
    for (var k = 0; k < motor.points.length; k++) {
      var p = motor.points[k], i, s, f, got = null;
      if (p.kind === 'clear') { out.push({ name: p.name, kind: 'clear', lat: p.lat, lon: p.lon, ms: null }); continue; }
      if (p.kind === 'meridian') {
        for (i = at.i; i < segs.length && !got; i++) {
          s = segs[i];
          var da = s.a.lon - p.lon, db = s.b.lon - p.lon;
          if (da === db || da * db > 0) continue;
          f = da / (da - db);
          if (i === at.i && f <= at.f + EPS) continue;
          got = { i: i, f: f };
        }
        if (!got) return no('Level 3 does not cross the meridian ' + p.lon.toFixed(3) + ' (' + p.name + ') after ' + prev.name);
      } else {
        var mk = null;
        (course.marks || []).forEach(function (m) { if (m.name === p.name) mk = m; });
        if (!mk) return no('"' + p.name + '" is not a mark of the course');
        var sh = sheet(mk.lat), c = sh.xy(mk), best = null;
        for (i = at.i; i < segs.length; i++) {
          s = segs[i];
          var A = sh.xy(s.a), B = sh.xy(s.b), q = ptSeg(c, A, B);
          if (i === at.i && q.t <= at.f + EPS) {
            //  the part of this step already behind the last waypoint does not count
            var P0 = { x: A.x + (B.x - A.x) * at.f, y: A.y + (B.y - A.y) * at.f };
            q = ptSeg(c, P0, B); q.t = at.f + q.t * (1 - at.f);
            if (q.t <= at.f + EPS) continue;
          }
          if (!best || q.d < best.d - EPS) best = { i: i, f: q.t, d: q.d };
        }
        if (!best) return no('Level 3 does not pass ' + p.name + ' after ' + prev.name);
        got = best;
      }
      s = segs[got.i];
      var pt = { name: p.name, kind: p.kind,
                 lat: s.a.lat + (s.b.lat - s.a.lat) * got.f, lon: s.a.lon + (s.b.lon - s.a.lon) * got.f,
                 ms: s.ms + (s.ms2 - s.ms) * got.f };
      if (p.kind === 'mark') {
        //  the arc: the track point before the closest, and the one after
        pt.off = got.d;
        var mkp = { name: p.name, lat: mk.lat, lon: mk.lon }, arc = { mark: mkp, before: 0, after: 0, grew: [] };
        pt.arc = arc;
        var jb = got.f > EPS ? got.i : got.i - 1, ja = got.f < 1 - EPS ? got.i + 1 : got.i + 2;
        if (jb >= 0 && rows[jb].ms > prev.ms) { out.push(arcPoint(rows, jb, arc, -1)); arc.before = 1; }
        out.push(pt);
        if (ja < rows.length) { out.push(arcPoint(rows, ja, arc, 1)); arc.after = 1; at = { i: ja, f: 0 }; }
        else at = got;
        prev = out[out.length - 1];
        continue;
      }
      out.push(pt); at = got; prev = pt;
    }
    out.push({ name: 'the finish', kind: 'finish', lat: last.lat2, lon: last.lon2, ms: tEnd });
    return { ok: true, points: out };
  }

  function arcPoint(rows, j, arc, side) {
    return { name: arc.mark.name + ' ' + hhmm(rows[j].ms), kind: 'arc', lat: rows[j].lat, lon: rows[j].lon,
             ms: rows[j].ms, row: j, side: side, arc: arc };
  }

  // ---------------------------------------------------------------------
  //  grow(points, W, rows) -> the arcs grown, a track point at a time,
  //  while the line into or out of one crosses something nearer the mark
  //  than the track point it would take.  The point taken must still come after the
  //  timed waypoint before the arc, or before the one after it.
  // ---------------------------------------------------------------------
  function grow(points, W, rows) {
    var i, guard = 0;
    for (i = 0; i < points.length && guard < 10000; i++, guard++) {
      var p = points[i];
      if (p.kind !== 'arc' && !(p.kind === 'mark' && p.arc)) continue;
      var arc = p.arc, first = i === 0 || points[i - 1].arc !== arc;
      var last = i === points.length - 1 || points[i + 1].arc !== arc;
      var mk = arc.mark, reach, hits, h, j, t;
      if (first && i > 0) {
        hits = crosses(W, points[i - 1], p); h = hits[hits.length - 1];       //  the crossing nearest the arc
        j = (p.row === undefined ? -1 : p.row - 1);
        t = timedBefore(points, i);
        reach = j >= 0 ? dist(rows[j], mk) : 0;
        if (h && dist(h.at, mk) < reach && j >= 0 && rows[j].ms > t) {
          points.splice(i, 0, arcPoint(rows, j, arc, -1));
          arc.before++; arc.grew.push(h.what);
          i -= 1;  continue;                                                 //  look again at the new end
        }
      }
      if (last && i < points.length - 1) {
        hits = crosses(W, p, points[i + 1]); h = hits[0];
        j = (p.row === undefined ? -1 : p.row + 1);
        t = timedAfter(points, i);
        reach = j > 0 && j < rows.length ? dist(rows[j], mk) : 0;
        if (h && dist(h.at, mk) < reach && j > 0 && j < rows.length && rows[j].ms < t) {
          points.splice(i + 1, 0, arcPoint(rows, j, arc, 1));
          arc.after++; if (arc.grew.indexOf(h.what) < 0) arc.grew.push(h.what);
        }
      }
    }
    return points;
  }
  function timedBefore(points, i) { for (var k = i - 1; k >= 0; k--) if (points[k].ms !== null) return points[k].ms; return -Infinity; }
  function timedAfter(points, i) { for (var k = i + 1; k < points.length; k++) if (points[k].ms !== null) return points[k].ms; return Infinity; }

  // ---------------------------------------------------------------------
  //  legs(points) -> the legs, with Level 3's time for each.  A clear
  //  waypoint shares the time between the two timed waypoints round it
  //  by distance, so the speed on its two parts is the same.
  // ---------------------------------------------------------------------
  function legs(points) {
    var L = [], i, j, k;
    for (i = 0; i < points.length - 1; i++) {
      L.push({ n: i + 1, from: points[i], to: points[i + 1],
               nm: dist(points[i], points[i + 1]), course: bearing(points[i], points[i + 1]) });
    }
    for (i = 0; i < points.length; i = j) {
      for (j = i + 1; j < points.length && points[j].ms === null; j++) { /* the clear ones */ }
      if (j >= points.length) break;
      var total = 0;
      for (k = i; k < j; k++) total += L[k].nm;
      var t = points[i].ms, span = points[j].ms - points[i].ms;
      for (k = i; k < j; k++) {
        L[k].t0 = t;
        t += total > 0 ? span * L[k].nm / total : span / (j - i);
        L[k].t1 = (k === j - 1) ? points[j].ms : t;
        if (k < j - 1) points[k + 1].ms = L[k].t1;
      }
    }
    L.forEach(function (l) {
      l.minutes = (l.t1 - l.t0) / 60000;
      l.still = l.minutes > 0 ? l.nm / (l.minutes / 60) : Infinity;   //  Level 1's speed
    });
    return L;
  }

  // ---------------------------------------------------------------------
  //  The water Level 3 was kept out of, as segments with a clearance, and
  //  the areas as polygons, so a waypoint inside one is caught as well.
  // ---------------------------------------------------------------------
  function water(env) {
    var run = env.run, live = {}, segs = [], polys = [];
    (run.layers || []).forEach(function (l) { live[l] = 1; });
    (env.areas || []).forEach(function (a) {
      if (!a || !a.ok) return;
      a.shapes.forEach(function (sh) {
        if (!live[sh.layer]) return;
        var cl = (run.clear && run.clear[sh.layer]) || 0, p = sh.points, n = p.length, j;
        var lim = sh.kind === 'area' ? n : n - 1;
        for (j = 0; j < lim; j++) {
          var q = p[(j + 1) % n];
          segs.push({ a: { lat: p[j][0], lon: p[j][1] }, b: { lat: q[0], lon: q[1] }, clear: cl, what: sh.layer });
        }
        if (sh.kind === 'area') polys.push({ pts: p.map(function (v) { return { lat: v[0], lon: v[1] }; }), what: sh.layer });
      });
    });
    //  A MARK THAT IS AN END OF THE FINISH LINE has no berth: she
    //  rounds it by finishing, as in the router, whose rule this is.
    var berth = run.round || 0, c = env.course, ms = c.marks || [], pin = null;
    if (ms.length && c.finish) {
      var lm = ms[ms.length - 1];
      [c.finish.a, c.finish.b].forEach(function (e) { if (e && dist(lm, e) < 0.02) pin = lm; });
    }
    ms.forEach(function (m) {
      if (m === pin) return;
      segs.push({ a: { lat: m.lat, lon: m.lon }, b: { lat: m.lat, lon: m.lon }, clear: berth, what: 'the berth round ' + m.name, mark: true });
    });
    (run.gates || []).forEach(function (g) {
      if (g.rule !== 'avoid') return;
      segs.push({ a: { lat: g.lat, lon: g.lon }, b: { lat: g.lat, lon: g.lon }, clear: g.nm, what: 'the ' + g.nm + ' miles off ' + g.name });
    });
    return { segs: segs, polys: polys };
  }

  //  what a rhumb line from a to b runs into, nearest a first; [] if clear
  function crosses(W, a, b) {
    var sh = sheet((a.lat + b.lat) / 2), A = sh.xy(a), B = sh.xy(b), hits = [];
    W.segs.forEach(function (s) {
      var C = sh.xy(s.a), D = sh.xy(s.b);
      //  a cheap box test first: most of the coast is nowhere near
      var m = s.clear + 0.01;
      if (Math.max(C.x, D.x) < Math.min(A.x, B.x) - m || Math.min(C.x, D.x) > Math.max(A.x, B.x) + m ||
          Math.max(C.y, D.y) < Math.min(A.y, B.y) - m || Math.min(C.y, D.y) > Math.max(A.y, B.y) + m) return;
      var f = (C.x === D.x && C.y === D.y) ? null : cut(A, B, C, D);
      if (f !== null) {
        hits.push({ what: s.what, f: f, how: 'crosses', at: sh.ll({ x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f }), clear: s.clear });
        return;
      }
      if (s.clear <= 0) return;
      var q = [ptSeg(C, A, B), ptSeg(D, A, B)], r1 = ptSeg(A, C, D), r2 = ptSeg(B, C, D), best = q[0];
      if (q[1].d < best.d) best = q[1];
      [r1, r2].forEach(function (r, i) { if (r.d < best.d) best = { d: r.d, t: i, x: i ? B.x : A.x, y: i ? B.y : A.y }; });
      //  a mark's own waypoint sits on its berth; a hair inside it is the arithmetic, not the boat
      if (best.d < s.clear - (s.mark ? 0.005 : EPS)) {
        hits.push({ what: s.what, f: best.t, how: 'passes ' + best.d.toFixed(2) + ' nm from', at: sh.ll(best), clear: s.clear });
      }
    });
    W.polys.forEach(function (pg) {
      var P = pg.pts.map(sh.xy);
      if (inside(A, P)) hits.push({ what: pg.what, f: 0, how: 'starts inside', at: a, clear: 0 });
      else if (inside(B, P)) hits.push({ what: pg.what, f: 1, how: 'ends inside', at: b, clear: 0 });
    });
    hits.sort(function (x, y) { return x.f - y.f; });
    return hits;
  }

  //  Level 3's tack and gybe points between two times, or with
  //  `every`, the start of every step of its track
  function turns(rows, t0, t1, every) {
    var out = [], i;
    for (i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (r.ms <= t0 || r.ms >= t1) continue;
      if (every) { out.push({ lat: r.lat, lon: r.lon, ms: r.ms, kind: 'track' }); continue; }
      if (!r.tack || r.tack === rows[i - 1].tack) continue;
      out.push({ lat: r.lat, lon: r.lon, ms: r.ms, kind: Math.abs(r.twa) < 90 ? 'tack' : 'gybe' });
    }
    return out;
  }

  // ---------------------------------------------------------------------
  //  dangers(L, W, rows) -> a refusal for every leg that crosses, with
  //  the clearing waypoints to offer.  Each is taken from where Level 3
  //  itself went (Larry: tack points "would show the way"):
  //
  //    1. Level 3's tack or gybe point on this leg, nearest the first
  //       crossing, that clears both of the lines it makes;
  //    2. if none does, the point of Level 3's track that does;
  //    3. if none does, the point (a tack or gybe first, then the track)
  //       nearest the crossing that clears the line INTO it -- and then
  //       the same again for the line out of it, until the leg is clear.
  //
  //  The third is needed at the Eddystone: Level 3's nearest point to
  //  the light is at the latitude of the NE Rock, so any straight line
  //  into it from the east runs over the rock, and one waypoint cannot
  //  both clear Prawle Point and come in from the south.  The chain is
  //  at most four long; if it is still not clear the refusal says so.
  // ---------------------------------------------------------------------
  function dangers(L, W, rows) {
    var bad = [];
    function clear(a, b) { return !crosses(W, a, b).length; }
    function nearest(cand, h, ok) {
      var best = null;
      cand.forEach(function (c) {
        if (!ok(c)) return;
        var d = dist(c, h.at);
        if (!best || d < best.d) { best = c; best.d = d; }
      });
      return best;
    }
    function chain(a, b, t0, t1, depth) {
      var hits = crosses(W, a, b);
      if (!hits.length) return { pts: [], clears: true };
      if (depth >= 4) return { pts: [], clears: false };
      var h = hits[0], tk = turns(rows, t0, t1), tr = turns(rows, t0, t1, true);
      var both = function (c) { return clear(a, c) && clear(c, b); };
      var one = nearest(tk, h, both) || nearest(tr, h, both);
      if (one) return { pts: [one], clears: true };
      var into = function (c) { return clear(a, c); };
      var step = nearest(tk, h, into) || nearest(tr, h, into);
      if (!step) return { pts: [], clears: false };
      var rest = chain(step, b, step.ms, t1, depth + 1);
      return { pts: [step].concat(rest.pts), clears: rest.clears };
    }
    L.forEach(function (l) {
      var hits = crosses(W, l.from, l.to);
      if (!hits.length) return;
      var c = chain(l.from, l.to, l.t0, l.t1, 0);
      bad.push({ leg: l, hits: hits, suggest: c.pts, clears: c.clears });
    });
    return bad;
  }

  // ---------------------------------------------------------------------
  //  sailLeg(o) -> the leg as sailed
  //
  //    o.a, o.b       the waypoints          o.v      her speed, knots
  //    o.t0           when she leaves a      o.step   seconds a step
  //    o.current      the stream grid        o.scale  how much of it
  //    o.limit        when to stop if she has not arrived, ms
  // ---------------------------------------------------------------------
  function sailLeg(o) {
    var a = o.a, b = o.b, v = o.v, t = o.t0, p = { lat: a.lat, lon: a.lon };
    var sh = sheet((a.lat + b.lat) / 2), A = sh.xy(a), B = sh.xy(b);
    var th = Math.atan2(B.x - A.x, B.y - A.y), nx = Math.cos(th), ny = -Math.sin(th);   //  to starboard of the line
    var rows = [], held = [], cur = null, noStream = 0, maxOff = 0;
    function off(q) { var Q = sh.xy(q); return (Q.x - A.x) * nx + (Q.y - A.y) * ny; }
    for (;;) {
      if (t > o.limit) return { arrived: false, rows: rows, held: close(), noStreamMinutes: noStream, maxOff: maxOff, at: p, ms: t };
      var P = sh.xy(p), d = Math.hypot(B.x - P.x, B.y - P.y);
      if (d < 1e-7) break;
      var T = R.norm360(Math.atan2(B.x - P.x, B.y - P.y) / RAD);
      var set = null, drift = 0, ns = false;
      if (o.scale > 0) {
        var c = o.current ? R.sample(o.current, p.lat, p.lon, t) : null;
        if (!c || c.u === null || c.v === null) ns = true;
        else { var st = R.streamOf(c.u * o.scale, c.v * o.scale); set = st.set; drift = st.drift; }
      }
      var across = set === null ? 0 : drift * Math.sin((set - T) * RAD);
      var along = set === null ? 0 : drift * Math.cos((set - T) * RAD);
      var hold = Math.abs(across) < v, H, made;
      if (hold) { var k = Math.asin(across / v); H = R.norm360(T - k / RAD); made = v * Math.cos(k) + along; }
      else { H = R.norm360(T - 90 * (across > 0 ? 1 : -1)); made = along; }
      var w = R.vec(H, v, set, drift), dt = o.step;
      var arrive = hold && made > 0 && d <= made * dt / 3600;
      if (arrive) dt = d / made * 3600;
      //  she moves on the leg's own sheet, the chart the line is drawn on,
      //  so a line she holds is held exactly and not to a cosine's error
      var q = arrive ? { lat: b.lat, lon: b.lon } : sh.ll({ x: P.x + w.e * dt / 3600, y: P.y + w.n * dt / 3600 });
      var xo = off(p);
      rows.push({ ms: t, at: iso(t), lat: p.lat, lon: p.lon, minutes: dt / 60, heading: H, stw: v,
                  set: set, drift: drift, across: across, cog: w.cog, sog: w.sog, made: made,
                  off: xo, held: hold, noStream: ns });
      if (ns) noStream += dt / 60;
      if (!hold) {
        if (!cur) cur = { from: t, at: { lat: p.lat, lon: p.lon }, across: Math.abs(across), v: v, worst: Math.abs(xo) };
        cur.across = Math.max(cur.across, Math.abs(across));
      } else if (cur) { cur.to = t; held.push(cur); cur = null; }
      t += dt * 1000; p = { lat: q.lat, lon: q.lon };
      var xn = off(p);
      if (Math.abs(xn) > Math.abs(maxOff)) maxOff = xn;
      if (cur && Math.abs(xn) > Math.abs(cur.worstSigned || 0)) { cur.worst = Math.abs(xn); cur.worstSigned = xn; }
      if (arrive) break;
    }
    function close() { if (cur) { cur.to = t; held.push(cur); cur = null; } return held; }
    return { arrived: true, ms: t, rows: rows, held: close(), noStreamMinutes: noStream, maxOff: maxOff };
  }

  //  how far she goes before giving up on a leg: three times Level 3's
  //  time, and never less than six hours more than it
  function limitOf(l, t0) { return t0 + Math.max(3 * (l.t1 - l.t0), (l.t1 - l.t0) + 6 * 3600000); }

  // ---------------------------------------------------------------------
  //  onTime(l, base) -> the speed that keeps Level 3's time on this leg,
  //  by halving.  Arriving later is a slower speed; a speed that does not
  //  arrive at all counts as later than any.
  // ---------------------------------------------------------------------
  function onTime(l, base) {
    function at(v) {
      var s = sailLeg({ a: l.from, b: l.to, v: v, t0: l.t0, current: base.current, scale: base.scale,
                        step: base.step, limit: limitOf(l, l.t0) });
      s.v = v; return s;
    }
    var hi = Math.max(l.still, 0.5), s = at(hi), tries = 0;
    while (!(s.arrived && s.ms <= l.t1)) {
      hi *= 2;
      if (hi > TOP) return { ok: false, why: 'leg ' + l.n + ', ' + l.from.name + ' to ' + l.to.name + ': not even ' + TOP + ' knots keeps the time' };
      s = at(hi);
    }
    var lo = 0, good = s;
    while (hi - lo > 0.0005 && tries++ < 80) {
      var mid = (lo + hi) / 2, m = at(mid);
      if (m.arrived && m.ms <= l.t1) { hi = mid; good = m; } else lo = mid;
    }
    good.ok = true;
    return good;
  }

  // ---------------------------------------------------------------------
  //  plan(env, route, motor) -> everything, or a refusal
  //
  //    env     SAIL.load(...) of the run the motor file follows
  //    route   that run as sailed: { summary, rows }
  //    motor   COURSE.motor(...) of the motor file
  // ---------------------------------------------------------------------
  function plan(env, route, motor) {
    if (!motor || !motor.ok) return no('there is no motor file');
    if (!route || !route.rows) return no('there is no Level 3 route');
    var wp = waypoints(route, env.course, motor);
    if (!wp.ok) return wp;
    var W = water(env);
    grow(wp.points, W, route.rows);
    var L = legs(wp.points);
    var bad = dangers(L, W, route.rows);
    if (bad.length) return no(bad.length + ' of ' + L.length + ' rhumb lines cross water Level 3 was kept out of',
                              { refused: bad, points: wp.points, legs: L });
    if (motor.scale > 0 && !env.current) return no('the motor file asks for the stream, and the run names no stream grid');
    var base = { current: env.current, scale: motor.scale, step: motor.step }, t = L[0].t0, i;
    for (i = 0; i < L.length; i++) {
      var l = L[i], s;
      if (motor.speed === 'on-time') {
        s = onTime(l, base);
        if (!s.ok) return no(s.why, { points: wp.points, legs: L });
      } else {
        s = sailLeg({ a: l.from, b: l.to, v: l.still, t0: t, current: base.current, scale: base.scale,
                      step: base.step, limit: limitOf(l, t) });
        s.v = l.still;
      }
      l.sailed = s; l.v = s.v; l.left = (motor.speed === 'on-time') ? l.t0 : t;
      if (!s.arrived) break;        //  she is stopped where she is, and the report says so
      t = s.ms;
    }
    return { ok: true, motor: motor, points: wp.points, legs: L, route: route, env: env };
  }

  // ---------------------------------------------------------------------
  //  The report, no line wider than 80 columns.
  // ---------------------------------------------------------------------
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function span(min) { var m = Math.round(Math.abs(min)); return Math.floor(m / 60) + 'h' + two(m % 60); }
  function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + new Array(n - s.length + 1).join(' '); }
  function lpad(s, n) { s = String(s); return s.length >= n ? s : new Array(n - s.length + 1).join(' ') + s; }
  function compass(deg) { return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(R.norm360(deg) / 45) % 8]; }
  function pos(p) { return p.lat.toFixed(5) + ' ' + p.lon.toFixed(5); }
  function short(n) { return n.replace(/^the /, ''); }

  function head(m) {
    var lv = m.scale === 0 ? 'LEVEL 1' : 'LEVEL 2';
    var how = m.speed === 'same' ? 'same speed' : 'on time';
    var out = [lv + ', ' + how + (m.scale === 0 ? ', in still water.' : ', in the stream.') +
               '  A motorboat on Level 3\'s waypoints,'];
    out.push('holding each rhumb line between them.  Level 3 chose these places: this is');
    out.push('what its times ask of a boat that goes straight, not a route and not advice.');
    return out;
  }

  //  what each arc round a mark took, and why it grew if it did
  function arcs(points) {
    var out = [], seen = [];
    (points || []).forEach(function (p) {
      if (!p.arc || seen.indexOf(p.arc) >= 0) return;
      var a = p.arc; seen.push(a);
      out.push('  arc       round ' + a.mark.name + ':');
      out.push('            Level 3\'s closest point, ' + a.before + ' track point' + (a.before === 1 ? '' : 's') +
               ' before it and ' + a.after + ' after');
      if (a.grew.length) out.push('            (grown to clear ' + a.grew.join(' and ') + ')');
    });
    return out;
  }

  function refusal(r, m) {
    var out = head(m);
    arcs(r.points).forEach(function (x) { out.push(x); });
    out.push('');
    out.push('REFUSED: ' + r.why + '.');
    out.push('A leg must be sailable as a straight line.  Add a clearing waypoint to the');
    out.push('motor file ("clear <name> <lat> <lon>"); its leg\'s time is shared by');
    out.push('distance, so her speed does not change.');
    r.refused.forEach(function (b) {
      var l = b.leg, h = b.hits[0];
      out.push('');
      out.push('  leg ' + l.n + ', ' + l.from.name + ' to ' + l.to.name + ':');
      out.push('    ' + h.how + ' ' + h.what + ' at ' + pos(h.at) +
               (h.clear > 0 ? ' (keep ' + h.clear.toFixed(2) + ' nm off)' : ''));
      if (b.hits.length > 1) out.push('    and ' + (b.hits.length - 1) + ' more place' + (b.hits.length > 2 ? 's' : '') + ' after it');
      if (!b.suggest.length) {
        out.push('    Nothing on Level 3\'s track on this leg clears it: place a waypoint of your own.');
        return;
      }
      out.push('    ' + (b.clears ? 'With ' + (b.suggest.length > 1 ? 'these, where Level 3 was,' : 'this, where Level 3 was,') + ' the leg is clear:'
                                 : 'Where Level 3 was, nearest the crossing; the leg is still not clear with ' +
                                   (b.suggest.length > 1 ? 'them' : 'it') + ':'));
      b.suggest.forEach(function (s) {
        out.push('      clear  L3 ' + s.kind + ' ' + hhmm(s.ms) + '  ' + pos(s) + '   (' +
                 (s.kind === 'tack' ? 'Level 3 tacked here' : s.kind === 'gybe' ? 'Level 3 gybed here' : 'on Level 3\'s track') + ')');
      });
      out.push('    put ' + (b.suggest.length > 1 ? 'them' : 'it') + ' ' +
               (l.n === 1 ? 'before the first waypoint' : 'after "' + l.from.name + '"') + '.');
    });
    return out.join('\n');
  }

  function report(r) {
    if (!r.ok && r.refused) return refusal(r, r.motor || {});
    if (!r.ok) return 'REFUSED: ' + r.why;
    var m = r.motor, rt = r.route, out = head(m), sumNo = 0, held = [];
    out.push('');
    out.push('  follows   ' + (rt.run || m.follow) + ', finished ' + rt.summary.finish);
    out.push('  speed     ' + (m.speed === 'same' ? 'same: each leg at the speed that keeps Level 3\'s time in still water'
                                                  : 'on time: each leg at the speed that keeps Level 3\'s time here'));
    out.push('  stream    ' + (m.scale === 0 ? 'none (scale current 0)' : (r.env.run.current || 'the run\'s grid') + ' x ' + m.scale.toFixed(1)));
    out.push('  step      ' + m.step + ' s');
    arcs(r.points).forEach(function (x) { out.push(x); });
    out.push('');
    //  each leg is named by where it goes: it starts where the one above ended
    out.push(' leg  to                         nm  course  L3 time  still   ' + (m.speed === 'same' ? 'arrives' : ' needs'));
    r.legs.forEach(function (l) {
      var s = l.sailed, tail;
      if (!s) tail = '-';
      else if (!s.arrived) tail = 'not there';
      else if (m.speed === 'same') {
        var dm = (s.ms - l.t1) / 60000;
        tail = Math.abs(dm) < 0.5 ? 'on time' : (dm > 0 ? span(dm) + ' late' : span(dm) + ' early');
      } else tail = lpad(l.v.toFixed(1), 6) + ' kn';
      out.push(lpad(l.n, 3) + '  ' + pad(short(l.to.name), 24) +
               lpad(l.nm.toFixed(1), 6) + lpad(Math.round(l.course), 7) + '   ' + lpad(span(l.minutes), 6) +
               lpad(l.still.toFixed(1), 7) + '   ' + tail);
      if (s) { sumNo += s.noStreamMinutes; s.held.forEach(function (h) { held.push({ l: l, h: h }); }); }
    });
    var lastL = r.legs[r.legs.length - 1];
    var stopped = r.legs.filter(function (l) { return l.sailed && !l.sailed.arrived; })[0];
    out.push('');
    if (stopped) {
      out.push('SHE DID NOT ARRIVE.  On leg ' + stopped.n + ' she had not reached ' + stopped.to.name + ' by ' +
               iso(stopped.sailed.ms) + ',');
      out.push('and is left at ' + pos(stopped.sailed.at) + '.  The legs after it are not sailed.');
    } else if (m.speed === 'same') {
      var late = (lastL.sailed.ms - lastL.t1) / 60000;
      out.push('She finishes at ' + iso(lastL.sailed.ms) + ', ' + (Math.abs(late) < 0.5 ? 'on Level 3\'s time.' :
               span(late) + (late > 0 ? ' after' : ' before') + ' Level 3.'));
    } else {
      out.push('She keeps every one of Level 3\'s times.');
    }
    out.push('');
    if (!held.length) out.push('She held every line: no stream across one was as strong as her speed.');
    else {
      out.push('Where she could not hold the line (the stream across it at least her speed):');
      held.forEach(function (x) {
        var h = x.h, l = x.l, sideDeg = l.course + ((h.worstSigned || 0) >= 0 ? 90 : -90);
        out.push('  leg ' + l.n + ', ' + hhmm(h.from) + ' to ' + hhmm(h.to) + ', from ' + pos(h.at) + ':');
        out.push('    up to ' + h.across.toFixed(1) + ' kn across her ' + h.v.toFixed(1) + '; set ' +
                 (h.worst || 0).toFixed(2) + ' nm ' + compass(sideDeg) + ' of the line at worst');
      });
    }
    if (sumNo > 0) out.push(span(sumNo) + ' where the stream grid has no data, as still water (as Level 3 was)');
    return out.join('\n');
  }

  //  what PILOT draws: the waypoints, and each leg's line and track
  function data(r) {
    function pt(p) {
      var o2 = { name: p.name, kind: p.kind, lat: p.lat, lon: p.lon, l3: p.ms === null ? null : iso(p.ms) };
      if (p.arc) o2.arc = p.arc.mark.name;
      return o2;
    }
    var o = { ok: r.ok, motor: r.motor ? { follow: r.motor.follow, speed: r.motor.speed, scale: r.motor.scale, step: r.motor.step } : null,
              points: (r.points || []).map(pt) };
    if (!r.ok) {
      o.why = r.why;
      o.refused = (r.refused || []).map(function (b) {
        return { leg: b.leg.n, from: b.leg.from.name, to: b.leg.to.name,
                 hits: b.hits.map(function (h) { return { what: h.what, how: h.how, lat: h.at.lat, lon: h.at.lon }; }),
                 clears: b.clears,
                 suggest: b.suggest.map(function (s) { return { kind: s.kind, at: iso(s.ms), lat: s.lat, lon: s.lon }; }) };
      });
      return o;
    }
    o.legs = r.legs.map(function (l) {
      var s = l.sailed || {};
      return { n: l.n, from: l.from.name, to: l.to.name, nm: l.nm, course: l.course,
               l3: { from: iso(l.t0), to: iso(l.t1), minutes: l.minutes }, still: l.still, speed: l.v,
               sailed: s.rows ? { left: iso(l.left), arrived: s.arrived, at: iso(s.ms), late: (s.ms - l.t1) / 60000,
                                  maxOff: s.maxOff, noStreamMinutes: s.noStreamMinutes,
                                  held: s.held.map(function (h) { return { from: iso(h.from), to: iso(h.to), lat: h.at.lat, lon: h.at.lon, across: h.across, worst: h.worst || 0 }; }),
                                  track: s.rows.map(function (w) {
                                    return { at: w.at, lat: w.lat, lon: w.lon, minutes: w.minutes, heading: w.heading, stw: w.stw,
                                             set: w.set, drift: w.drift, cog: w.cog, sog: w.sog, off: w.off, held: w.held, noStream: w.noStream };
                                  }) } : null };
    });
    return o;
  }

  return { waypoints: waypoints, grow: grow, legs: legs, water: water, crosses: crosses, turns: turns, dangers: dangers,
           sailLeg: sailLeg, onTime: onTime, plan: plan, report: report, data: data, TOP: TOP };
})();

if (typeof module !== 'undefined') module.exports = MOTOR;

// ---------------------------------------------------------------------
//  The command.  0: sailed (even if she did not arrive: that is an
//  answer).  1: refused, with the reason.  2: not asked properly.
//
//  The folder holds the run the motor file follows and everything the
//  run names, as for sail.js.  The route is that run sailed; --route
//  takes one sail.js already wrote with --json, so it is not sailed
//  twice, and refuses it if it is of another run.
// ---------------------------------------------------------------------
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  (function () {
    var fs = require('fs'), path = require('path');
    var C = require('./course.js'), SAIL = require('./sail.js');
    var a = process.argv.slice(2), json = null, routeFile = null, rest = [], i;
    for (i = 0; i < a.length; i++) {
      if (a[i] === '--json') json = a[++i] || '';
      else if (a[i] === '--route') routeFile = a[++i] || '';
      else rest.push(a[i]);
    }
    if (rest.length !== 2 || json === '' || routeFile === '') {
      console.error('usage: node docs/web/route/motor.js <folder> <motor file> [--route <json>] [--json <file>]');
      process.exit(2);
    }
    var folder = rest[0];
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) { console.error('there is no folder ' + folder); process.exit(1); }
    if (!fs.existsSync(rest[1])) { console.error('there is no motor file ' + rest[1]); process.exit(1); }
    var m = C.motor(fs.readFileSync(rest[1], 'utf8'));
    if (!m.ok) { console.error(rest[1] + ': ' + (m.err || m.why)); process.exit(1); }
    function read(name) { var p = path.join(folder, name); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
    var env = SAIL.load(read, m.follow);
    if (!env.ok) { console.error(env.err); process.exit(1); }
    var route;
    if (routeFile) {
      route = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
      if (route.run !== m.follow) { console.error(routeFile + ' is a route of ' + route.run + ', and the motor file follows ' + m.follow); process.exit(1); }
    } else {
      var s = SAIL.sail(read, m.follow);
      if (!s.ok) { console.error(s.err); process.exit(1); }
      route = { run: m.follow, summary: s.route.summary, rows: s.route.rows };
    }
    var r = MOTOR.plan(env, route, m);
    r.motor = m;
    console.log(MOTOR.report(r));
    if (json) fs.writeFileSync(json, JSON.stringify(MOTOR.data(r), null, 1) + '\n');
    process.exit(r.ok ? 0 : 1);
  })();
}

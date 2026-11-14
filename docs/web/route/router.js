// =====================================================================
//  The router: isochrones.  THE FOURTH PIECE, AND THE LAST.
//
//  Everything under this is already known good -- the vector step, the
//  polar, one step from the grids -- so what is here is bookkeeping:
//  from everywhere the boat could be, try every heading, keep the
//  places she reaches first, and stop when one of them has finished.
//
//  It answers ONE question: with this boat, this wind and this stream,
//  starting at this time, what is the earliest she could finish, and
//  by what track?  It is not a tactician.  It knows nothing of other
//  boats, of sail changes, of a crew that has been up all night, or of
//  the difference between a wind forecast and a wind.
//
//  THE RULES IT SAILS BY, each of which is a line in a file:
//
//    the course    COURSE 1: a start line, marks with their sides, a
//                  finish line.  docs/web/route/COURSE.md
//    the water     AREAS 1: lines not to be crossed, areas not to be
//                  entered, each with the run's clearance for its layer
//    the run       RUN 1 or 2: the boat, the start, the steps, the
//                  scales, how far off a mark she rounds, and what she
//                  must stay clear of
//
//  HOW A MARK IS ROUNDED.  The racing rule is a string: drawn taut
//  along the track, it must pass each mark on the required side.  That
//  is tested here with a line running out from the mark, away from the
//  turn -- she has rounded it when she crosses that line going the
//  right way.  A route that cuts inside never crosses it; one that
//  passes the wrong side crosses it backwards, and is refused.
//
//  `round` IS A BERTH (Larry, 13 November 2026).  She crosses that
//  line AT LEAST `round` miles out from the mark, and passes no closer
//  than that at any time.  The fastest route passes exactly that far
//  off, because a shorter way round is always quicker; where the wind
//  or the stream favours it she may go wider.  Boats in the real race
//  do go inside what a prudent berth would be, and have for years.
//  This router does not, and nothing here should be read as advice to.
//
//  WHAT "FIRST" MEANS, AND THE ONE ASSUMPTION IN IT.  The water is cut
//  into small squares, and of all the ways of reaching a square only
//  the earliest is kept.  That is sound if being somewhere sooner is
//  never worse than being there later -- true of a boat that could
//  always stop and wait, and near enough true of one that cannot.  It
//  is what makes the search finish, and it is the usual assumption of
//  an isochrone router, stated here rather than left to be discovered.
// =====================================================================
'use strict';

var ROUTER = (function () {
  var R = (typeof ROUTE !== 'undefined') ? ROUTE : require('./route.js');
  var P = (typeof POLAR !== 'undefined') ? POLAR : require('./polar.js');
  var RAD = Math.PI / 180;
  var EPS = 1e-9;

  function no(why) { return { ok: false, why: why }; }
  var COMPASS = { north: 0, east: 90, south: 180, west: 270 };

  //  From one bearing round to another by the shorter way; clockwise is
  //  positive.
  function swing(a, b) { var d = R.norm360(b - a); return d > 180 ? d - 360 : d; }

  //  TACK OR GYBE is which end of the wind her bow passes through. She
  //  turns from the old heading to the new by the shorter way; if the
  //  direction the wind comes from lies inside that turn she tacked,
  //  and if it does not she gybed. A half turn has no shorter way, and
  //  is a tack if she ends up closer to the wind than abeam.
  function throughWind(h0, h1, twd, twaAfter) {
    var t = swing(h0, h1), w = swing(h0, twd);
    if (Math.abs(Math.abs(t) - 180) < 1e-9) return twaAfter < 90;
    return (w > 0) === (t > 0) && Math.abs(w) < Math.abs(t);
  }

  function msOf(t) {
    return Date.UTC(+t.substr(0, 4), +t.substr(5, 2) - 1, +t.substr(8, 2),
                    +t.substr(11, 2), +t.substr(14, 2));
  }
  function utc(ms) {
    var d = new Date(Math.round(ms / 1000) * 1000);
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + 'T' +
           p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()) + 'Z';
  }

  // ---------------------------------------------------------------
  //  Plane geometry, in nautical miles.  One flat sheet for the whole
  //  run: x is east and y is north, with the longitude scaled at the
  //  course's middle latitude.  Over the hundred miles of a Channel
  //  race the scale is right to about one part in a hundred at the
  //  edges, which moves a tenth-of-a-mile clearance by a thousandth of
  //  a mile.  The boat herself is moved on the sphere by advance(); the
  //  sheet is only for asking what a step crosses and how near it
  //  passes.
  // ---------------------------------------------------------------

  //  Where segment AB crosses segment CD: the fraction along AB, or -1.
  //  A touch at the very start of AB does not count (she is leaving the
  //  line, not crossing it); a touch anywhere else does, including at
  //  the end, so that no two steps can pass through a wall between
  //  them.  hit.u is the fraction along CD.
  var hit = { u: 0 };
  function cross(ax, ay, bx, by, cx, cy, dx, dy) {
    var rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
    var den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-15) return -1;
    var qx = cx - ax, qy = cy - ay;
    var t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
    if (t <= 1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return -1;
    hit.u = u;
    return t > 1 ? 1 : t;
  }
  function ptSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy, t = 0;
    if (L > 0) { t = ((px - ax) * vx + (py - ay) * vy) / L; t = t < 0 ? 0 : (t > 1 ? 1 : t); }
    var ex = ax + t * vx - px, ey = ay + t * vy - py;
    return Math.sqrt(ex * ex + ey * ey);
  }
  function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
    var rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
    var den = rx * sy - ry * sx;
    if (Math.abs(den) > 1e-15) {
      var qx = cx - ax, qy = cy - ay;
      var t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
    }
    return Math.min(ptSeg(ax, ay, cx, cy, dx, dy), ptSeg(bx, by, cx, cy, dx, dy),
                    ptSeg(cx, cy, ax, ay, bx, by), ptSeg(dx, dy, ax, ay, bx, by));
  }

  // ---------------------------------------------------------------
  //  Everything she must not cross or come too near, in buckets a mile
  //  square, so that a step is tested against the few pieces of coast
  //  beside it and not against all twenty-five thousand.
  // ---------------------------------------------------------------
  function Water() { this.items = []; this.map = {}; this.stamp = []; this.tick = 0; }
  Water.prototype.key = function (ix, iy) { return (ix + 20000) * 40000 + (iy + 20000); };
  Water.prototype.add = function (ax, ay, bx, by, clear, what) {
    var id = this.items.length, c = clear || 0;
    this.items.push({ ax: ax, ay: ay, bx: bx, by: by, clear: c, what: what });
    this.stamp.push(0);
    var x0 = Math.floor(Math.min(ax, bx) - c), x1 = Math.floor(Math.max(ax, bx) + c);
    var y0 = Math.floor(Math.min(ay, by) - c), y1 = Math.floor(Math.max(ay, by) + c);
    for (var ix = x0; ix <= x1; ix++) for (var iy = y0; iy <= y1; iy++) {
      var k = this.key(ix, iy);
      (this.map[k] || (this.map[k] = [])).push(id);
    }
  };
  //  What stops the step from A to B, by name, or null if nothing does.
  //  A clearance of zero means "do not cross"; anything more means "do
  //  not come nearer than this".
  Water.prototype.stops = function (ax, ay, bx, by) {
    var tick = ++this.tick;
    var x0 = Math.floor(Math.min(ax, bx)), x1 = Math.floor(Math.max(ax, bx));
    var y0 = Math.floor(Math.min(ay, by)), y1 = Math.floor(Math.max(ay, by));
    for (var ix = x0; ix <= x1; ix++) for (var iy = y0; iy <= y1; iy++) {
      var ids = this.map[this.key(ix, iy)];
      if (!ids) continue;
      for (var j = 0; j < ids.length; j++) {
        var id = ids[j];
        if (this.stamp[id] === tick) continue;
        this.stamp[id] = tick;
        var o = this.items[id];
        if (o.clear > 0) {
          if (segSeg(ax, ay, bx, by, o.ax, o.ay, o.bx, o.by) < o.clear - 1e-9) return o.what;
        } else if (cross(ax, ay, bx, by, o.ax, o.ay, o.bx, o.by) >= 0) return o.what;
      }
    }
    return null;
  };
  //  Is this POINT already nearer than allowed to something?  Used for
  //  the places on the start line, some of which are on the beach.
  Water.prototype.tooNear = function (x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), ids = this.map[this.key(ix, iy)], j;
    if (!ids) return null;
    for (j = 0; j < ids.length; j++) {
      var o = this.items[ids[j]];
      if (o.clear > 0 && ptSeg(x, y, o.ax, o.ay, o.bx, o.by) < o.clear - 1e-9) return o.what;
    }
    return null;
  };

  // ---------------------------------------------------------------
  //  compile(env): the three files turned into geometry.
  //
  //    env.course, env.run        parsed by course.js
  //    env.areas                  a list of parsed areas files
  //    env.wind, env.current      parsed grids (current may be absent)
  //    env.polar                  a parsed polar
  // ---------------------------------------------------------------
  function compile(env) {
    var c = env.course, run = env.run, i, j;
    if (!c || !c.ok) return no('there is no course');
    if (!run || !run.ok) return no('there is no run');
    if (!env.wind || !env.wind.ok) return no('there is no wind grid');
    if (!env.polar || !env.polar.ok) return no('there is no polar');

    //  the middle latitude of the course, for the one flat sheet
    var lats = [c.start.a.lat, c.start.b.lat, c.finish.a.lat, c.finish.b.lat];
    c.marks.forEach(function (m) { lats.push(m.lat); });
    var lat0 = lats.reduce(function (a, b) { return a + b; }, 0) / lats.length;
    var K = 60 * Math.cos(lat0 * RAD);
    function X(lon) { return lon * K; }
    function Y(lat) { return lat * 60; }
    function pt(p) { return { x: X(p.lon), y: Y(p.lat), lat: p.lat, lon: p.lon }; }
    function unit(brg) { return { x: Math.sin(brg * RAD), y: Math.cos(brg * RAD) }; }
    function brgOf(dx, dy) { return R.norm360(Math.atan2(dx, dy) / RAD); }

    var g = { ok: true, X: X, Y: Y, K: K, lat0: lat0 };
    var sa = pt(c.start.a), sb = pt(c.start.b), fa = pt(c.finish.a), fb = pt(c.finish.b);
    g.start = { a: sa, b: sb, dir: unit(c.start.cross),
                mid: { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 } };
    g.finish = { a: fa, b: fb, dir: unit(c.finish.cross),
                 mid: { x: (fa.x + fb.x) / 2, y: (fa.y + fb.y) / 2 } };
    g.round = run.round;

    //  A MARK THAT IS THE END OF THE FINISH LINE IS ROUNDED BY FINISHING.
    //  The 2025 course leaves North Head Buoy to starboard and then
    //  finishes on a line running north from that same buoy; crossing
    //  the line eastward IS leaving the buoy to starboard.  So the last
    //  mark, when it is a pin of the finish line, sets no line of its
    //  own -- but its side is checked against the finish, because a
    //  course that says "port" and a finish that can only be crossed
    //  leaving it to starboard cannot both be sailed.
    var marks = c.marks.map(function (m) { var p = pt(m); p.name = m.name; p.side = m.side; return p; });
    var last = marks.length ? marks[marks.length - 1] : null, pin = null;
    if (last) {
      if (Math.hypot(last.x - fa.x, last.y - fa.y) < 0.02) pin = fa;
      else if (Math.hypot(last.x - fb.x, last.y - fb.y) < 0.02) pin = fb;
    }
    if (pin) {
      var s = g.finish.dir.x * (pin.y - g.finish.mid.y) - g.finish.dir.y * (pin.x - g.finish.mid.x);
      var hand = s > 0 ? 'port' : 'starboard';
      if (last.side !== 'either' && last.side !== hand) {
        return no('the course leaves ' + last.name + ' to ' + last.side + ', but it is the end of the finish ' +
                  'line and crossing that line the right way leaves it to ' + hand);
      }
      marks.pop();
      g.pin = last.name;
    }

    //  THE LINE OUT FROM EACH MARK.  Seen from the mark, the boat
    //  arrives from the direction of the last waypoint and leaves
    //  toward the next, and to leave the mark on the required hand she
    //  must swing round it the required way: anticlockwise for port,
    //  clockwise for starboard.  The line is laid through the MIDDLE of
    //  that swing, so she crosses it at the height of the turn.
    //
    //  How far she swings is the angle from "where she came from" to
    //  "where she is going", measured the required way.  Past 180
    //  degrees the mark is inside the turn and the string touches it.
    //  Under 90 the two directions are nearly the same -- an out-and-
    //  back, as the Eddystone is, where the start and the finish bear
    //  within a tenth of a degree of each other -- and there the mark
    //  can only have been meant to be gone round, so a whole turn is
    //  added.  Between the two it is a mark passed on the way by.
    //
    //  THE PASSES OF THE PLAN TAKE THEIR PLACE AMONG THE MARKS.  A pass
    //  is a place she must pass, in its turn: with a compass word, a
    //  line out from its point which she must cross ("south within 2.0"
    //  is two miles south from a headland); without one, a circle she
    //  must come into.  Neither has a berth or a side to round.  The
    //  plan of the run's passage file lists marks and passes in the
    //  order she makes them (Larry, 13 November 2026), and those, in
    //  that order, are the STATIONS of the passage: a leg runs from one
    //  station to the next.  Each mark takes its berth from the plan;
    //  a run with no passage gives every mark the one berth it says
    //  with `round`, as it always has.
    //
    //  The line out from a mark is laid by where she comes from and
    //  where she goes next, and those are now the stations either side
    //  of it, which may be passes: a headland to be passed on the way
    //  to a mark changes the way she comes at it.
    //
    //  The plan was checked against the course before it got here
    //  (COURSE.checkPassage); these refusals are for a router handed a
    //  plan directly, which must not sail one that leaves a mark out.
    if ((run.gates || []).some(function (q) { return q.rule !== 'within' && q.rule !== 'avoid'; })) {
      return no('this run has a RUN 1 gate, which never said whether she must pass near it or stay off it; ' +
                'a RUN 3 file names a passage, whose "pass" lines are the places she must pass');
    }
    if ((run.gates || []).some(function (q) { return q.rule === 'within'; })) {
      return no('this run has "gate" lines, which are not sailed: a place she must pass is a "pass" line in a passage file');
    }
    function passStation(q) {
      var p = pt(q), s = { kind: 'pass', name: q.name, x: p.x, y: p.y, lat: q.lat, lon: q.lon, nm: q.nm,
                           dir: q.dir || null, aimx: p.x, aimy: p.y };
      if (s.dir) {
        //  the far end of the line, and the middle of it to aim at
        var u = unit(COMPASS[s.dir]);
        s.ex = p.x + u.x * q.nm; s.ey = p.y + u.y * q.nm;
        s.aimx = p.x + u.x * q.nm / 2; s.aimy = p.y + u.y * q.nm / 2;
      }
      return s;
    }
    var stations = [];
    if (run.passage) {
      var pf = env.passage;
      if (!pf || !pf.ok) return no('the run names a passage file, ' + run.passage.file + ', and none was given to the router');
      var plan = pf.plans[run.passage.plan];
      if (!plan) return no('the passage file has no plan "' + run.passage.plan + '"');
      var mi = 0, ended = false;
      for (i = 0; i < plan.items.length; i++) {
        var it = plan.items[i];
        if (ended) return no('the plan has ' + it.name + ' after ' + g.pin + ', which is the end of the finish line');
        if (it.kind === 'pass') { stations.push(passStation(it)); continue; }
        if (g.pin && it.name === g.pin && mi === marks.length) {
          if (it.berth !== null && it.berth !== undefined) return no(g.pin + ' is the end of the finish line, and takes no berth');
          ended = true; continue;
        }
        if (mi >= marks.length || marks[mi].name !== it.name) {
          return no('the plan places ' + it.name + ' where the course has ' + (mi < marks.length ? marks[mi].name : 'no more marks'));
        }
        if (!(it.berth > 0)) return no('the plan gives ' + it.name + ' no berth');
        marks[mi].berth = it.berth;
        stations.push(marks[mi]); mi++;
      }
      if (mi < marks.length) return no('the plan does not place ' + marks[mi].name);
      if (g.pin && !ended) return no('the plan does not place ' + g.pin);
    } else {
      marks.forEach(function (mk) { mk.berth = run.round; stations.push(mk); });
    }

    var way = [g.start.mid].concat(stations).concat([g.finish.mid]);
    g.stations = [];
    for (i = 0; i < stations.length; i++) {
      var m = stations[i], prev = way[i], next = way[i + 2];
      if (m.kind === 'pass') { g.stations.push(m); continue; }
      if (m.side === 'either') { return no(m.name + ' may be left on either hand, which the router does not sail yet'); }
      var bp = brgOf(prev.x - m.x, prev.y - m.y), bn = brgOf(next.x - m.x, next.y - m.y);
      var port = m.side === 'port';
      var r = port ? R.norm360(bp - bn) : R.norm360(bn - bp);
      var sweep = (r > 180 || r >= 90) ? r : r + 360;
      var gb = port ? R.norm360(bp - sweep / 2) : R.norm360(bp + sweep / 2);
      var gu = unit(gb);
      g.stations.push({
        kind: 'mark', berth: m.berth,
        name: m.name, x: m.x, y: m.y, lat: m.lat, lon: m.lon, side: m.side,
        gx: gu.x, gy: gu.y, bearing: gb, sweep: sweep,
        sense: port ? 1 : -1,                    //  anticlockwise is positive
        fx: m.x + gu.x * 500, fy: m.y + gu.y * 500,
        //  where she aims: on the line, just outside the berth
        aimx: m.x + gu.x * (m.berth + 0.03), aimy: m.y + gu.y * (m.berth + 0.03)
      });
    }

    //  the water
    var w = new Water(), live = {}, nseg = 0;
    (run.layers || []).forEach(function (l) { live[l] = 1; });
    (env.areas || []).forEach(function (a) {
      if (!a || !a.ok) return;
      a.shapes.forEach(function (sh) {
        if (!live[sh.layer]) return;
        var cl = (run.clear && run.clear[sh.layer]) || 0, p = sh.points, n = p.length;
        var lim = sh.kind === 'area' ? n : n - 1;
        for (j = 0; j < lim; j++) {
          var q = p[(j + 1) % n];
          w.add(X(p[j][1]), Y(p[j][0]), X(q[1]), Y(q[0]), cl, sh.layer);
          nseg++;
        }
      });
    });
    //  each mark she rounds keeps its berth, all the way round
    g.stations.forEach(function (gt) {
      if (gt.kind === 'mark') w.add(gt.x, gt.y, gt.x, gt.y, gt.berth, 'the berth round ' + gt.name);
    });
    //  an `avoid` is water she may not enter; a pass is the opposite,
    //  and puts nothing in her way
    (run.gates || []).forEach(function (a) {
      if (a.rule !== 'avoid') return;
      w.add(X(a.lon), Y(a.lat), X(a.lon), Y(a.lat), a.nm, 'the ' + a.nm + ' miles off ' + a.name);
    });
    g.water = w; g.segments = nseg;

    //  when she starts
    if (run.start.by === 'class') {
      var cl2 = c.classOf(run.start.name);
      if (!cl2) return no('the run starts with class "' + run.start.name + '", which the course does not list');
      g.t0 = msOf(cl2.at);
    } else g.t0 = msOf(run.start.at);
    var T = env.wind.meta.times;
    g.tEnd = msOf(T[T.length - 1]);
    if (g.t0 < msOf(T[0]) || g.t0 >= g.tEnd) return no('the start, ' + utc(g.t0) + ', is outside the wind grid\'s times');
    return g;
  }

  // ---------------------------------------------------------------
  //  run(env, opt) -> { ok, rows, summary, stats } or { ok: false, why }
  //
  //    opt.cell     the side of the squares "first" is judged in, miles
  //    opt.reach    how far off the straight line of a leg she may
  //                 search, as (there + back) over (straight across)
  // ---------------------------------------------------------------
  function run(env, opt) {
    opt = opt || {};
    var g = compile(env);
    if (!g.ok) return g;
    var rn = env.run, polar = env.polar;
    var cell = opt.cell || 0.5, reach = opt.reach || 1.6;
    var dt = rn.step.time * 1000, dh = rn.step.heading;
    var nleg = g.stations.length + 1;
    var stats = { expanded: 0, tried: 0, stopped: {}, kept: 0, startPoints: 0, startDropped: 0 };

    //  THE COST OF A TACK, AND OF A GYBE.  A run may name a crew, and a
    //  crew has a cost for each: the time lost, averaged over how well
    //  that crew's manoeuvres come off (COURSE.md, CREW 1).  A run that
    //  names none is sailed as it always was, with manoeuvres that cost
    //  nothing, and `cost` stays null so that not one line below
    //  behaves differently for it.
    //
    //  HOW THE COST IS SPENT.  When she goes onto the other tack she
    //  first makes no way through the water for as long as the
    //  manoeuvre costs -- the stream has her -- and then sails.  If
    //  that is longer than what is left of the step she is still in it
    //  when the next step begins, and serves the rest there.  Nothing
    //  is forgiven at a mark or at the finish: the time is all spent
    //  before she sails again.
    //
    //  SHE DOES NOT KNOW WHICH TACK WILL BE THE BLOWN ONE, and neither
    //  does the router: every tack costs the crew's average (Larry, 13
    //  November 2026).  A route that knew would put its bad tacks where
    //  they hurt least, which no crew can do.
    var cost = { tack: 0, gybe: 0 };
    if (rn.crew) {
      var cw = env.crew;
      if (!cw || !cw.ok) return no('the run names a crew file, ' + rn.crew.file + ', which was not loaded');
      var lv = cw.level(rn.crew.level);
      if (!lv) return no('the run asks for crew level "' + rn.crew.level + '", which ' + rn.crew.file + ' does not give');
      cost = { tack: lv.tack.mean, gybe: lv.gybe.mean };
    }

    //  where each leg begins and where it is bound, for "nearer" and
    //  for the limit of the search
    var from = [g.start.mid], to = [];
    g.stations.forEach(function (gt) { to.push({ x: gt.aimx, y: gt.aimy }); from.push({ x: gt.aimx, y: gt.aimy }); });
    to.push(g.finish.mid);
    function left(leg, x, y) { return Math.hypot(to[leg].x - x, to[leg].y - y); }

    //  HOW A PASS WITH NO COMPASS WORD IS MADE.  Where along a step she
    //  first comes within its distance of its point: the fraction of the
    //  step, or -1 if she does not.  (She begins the step outside it; a
    //  circle she is already inside was passed where she stood, below.
    //  A pass with a compass word is a line, and is crossed: cross().)
    function enter(ax, ay, bx, by, cx, cy, r) {
      var dx = bx - ax, dy = by - ay, fx = ax - cx, fy = ay - cy;
      var a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
      if (c <= 0) return 0;
      if (a < 1e-18) return -1;
      var disc = b * b - 4 * a * c;
      if (disc < 0) return -1;
      var t = (-b - Math.sqrt(disc)) / (2 * a);
      return (t >= 0 && t <= 1) ? t : -1;
    }
    //  A CIRCLE SHE IS ALREADY INSIDE IS PASSED WHERE SHE IS.  Two passes
    //  whose circles overlap, one drawn round the start line, a mark
    //  rounded inside the circle of the headland beyond it: there is no
    //  step to cut, so the leg moves on at once and the name is kept.
    //  (A line has no inside; it is made only by crossing it.)
    function already(leg, x, y, names) {
      while (leg < g.stations.length && g.stations[leg].kind === 'pass' && !g.stations[leg].dir &&
             Math.hypot(x - g.stations[leg].x, y - g.stations[leg].y) <= g.stations[leg].nm + 1e-9) {
        names.push('passed ' + g.stations[leg].name);
        leg++;
      }
      return leg;
    }
    //  how far along the leg she has got: her place measured down the
    //  straight line from where the leg began to where it is bound
    function made(leg, x, y) {
      var ux = to[leg].x - from[leg].x, uy = to[leg].y - from[leg].y, d = Math.hypot(ux, uy) || 1;
      return ((x - from[leg].x) * ux + (y - from[leg].y) * uy) / d;
    }
    //  OF TWO BOATS IN THE SAME SQUARE AT THE SAME TIME, WHICH IS KEPT.
    //  With free tacks: the one nearer where she is bound.  With a cost:
    //  the one that has made more ground along the leg.  The difference
    //  is the boat that sails wide for speed.  Five degrees further off
    //  the wind she is a tenth of a mile outside the other after one
    //  step, in the same square, further from the mark in a straight
    //  line -- and ahead.  When she can come back for nothing, keeping
    //  the inside boat loses nothing.  When coming back is a gybe that
    //  costs minutes, it sails the whole run five degrees too deep:
    //  the first version of this did, and took nine minutes longer over
    //  twenty miles than the one gybe it made accounts for.
    function ahead(leg, x, y, ox, oy) {
      return made(leg, x, y) > made(leg, ox, oy);
    }
    function inReach(leg, x, y) {
      var D = Math.hypot(to[leg].x - from[leg].x, to[leg].y - from[leg].y);
      return Math.hypot(x - from[leg].x, y - from[leg].y) + left(leg, x, y) <= reach * D + 4;
    }

    //  THE START.  Places along the line, a tenth of a mile apart, each
    //  set a few yards onto the course side so that the line itself can
    //  be a wall behind her.  A place that is already inside a
    //  clearance -- one end of the 2025 line is a flagstaff ashore -- is
    //  not a place a boat can start from, and is left out and counted.
    var frontier = [], seen = [], i, k;
    for (i = 0; i < nleg; i++) seen.push({});
    var L = Math.hypot(g.start.b.x - g.start.a.x, g.start.b.y - g.start.a.y);
    var n = Math.max(2, Math.round(L / 0.1) + 1);
    for (i = 0; i < n; i++) {
      var f = i / (n - 1);
      var lat = g.start.a.lat + (g.start.b.lat - g.start.a.lat) * f;
      var lon = g.start.a.lon + (g.start.b.lon - g.start.a.lon) * f;
      var off = R.advance(lat, lon, env.course.start.cross, 0.01, 60);
      var sx = g.X(off.lon), sy = g.Y(off.lat);
      stats.startPoints++;
      if (g.water.tooNear(sx, sy)) { stats.startDropped++; continue; }
      var pre = [], leg0 = already(0, sx, sy, pre);
      frontier.push({ lat: off.lat, lon: off.lon, x: sx, y: sy, ms: g.t0, leg: leg0, parent: null, row: null, along: f,
                        tack: null, heading: null, owed: 0, via: null, pre: pre });
    }
    if (!frontier.length) return no('every place on the start line is nearer the shore than the run allows');

    function cellKey(x, y) { return Math.floor(x / cell) + ':' + Math.floor(y / cell); }

    var T = g.t0, iter = 0, done = [], finishes = [], legOver = [];
    for (i = 0; i < nleg; i++) legOver.push(-1);

    while (frontier.length && T < g.tEnd) {
      var Tn = T + dt, next = [], queue = frontier.slice();
      iter++;
      while (queue.length) {
        var node = queue.pop();
        //  a leg that has been completed is not searched for long after
        //  (A gate's leg was first searched for longer than a mark's, on
        //  the argument that the first boat into a circle miles across
        //  is only the first at its near edge.  Measured, it made no
        //  difference the search can resolve, in either direction, so
        //  it was taken out again.)
        if (legOver[node.leg] >= 0 && iter > legOver[node.leg] + 1) continue;
        var minutes = (Tn - node.ms) / 60000;
        if (minutes < 1e-6) continue;
        var cnd = R.conditions({ lat: node.lat, lon: node.lon, ms: node.ms, wind: env.wind,
                                 current: env.current, scale: rn.scale });
        if (!cnd.ok) { stats.stopped.wind = (stats.stopped.wind || 0) + 1; continue; }
        stats.expanded++;

        //  STILL IN THE MANOEUVRE: there is time owed, and until it is
        //  served she goes nowhere but where the stream takes her.
        if (node.owed > 0) {
          consider(node, R.driftFrom(cnd, Math.min(node.owed / 60, minutes), { manoeuvre: node.via, tack: node.tack }),
                   Tn, next, queue, { tack: node.tack, heading: node.heading, via: node.via, owed: node.owed });
          continue;
        }
        var begun = {};

        //  THE HEADINGS TRIED: the fan the run asks for; the best
        //  angle to beat and to run on each tack, which a five-degree
        //  fan would otherwise straddle; and, when the mark or the
        //  finish is within a step, the heading that lays it exactly.
        var heads = [], h, o1 = P.optimum(polar, 'beat', cnd.tws), o2 = P.optimum(polar, 'run', cnd.tws);
        for (h = 0; h < 360 - 1e-9; h += dh) heads.push(h);
        if (o1) { heads.push(R.norm360(cnd.twd + o1.angle)); heads.push(R.norm360(cnd.twd - o1.angle)); }
        if (o2) { heads.push(R.norm360(cnd.twd + o2.angle)); heads.push(R.norm360(cnd.twd - o2.angle)); }

        var tgt = to[node.leg];
        var tb = R.norm360(Math.atan2(tgt.x - node.x, tgt.y - node.y) / RAD);
        var near = left(node.leg, node.x, node.y) <= 30 * minutes / 60;
        var prevH = null, prevD = null;

        for (k = 0; k < heads.length; k++) {
          if (node.tack) {
            //  Which tack this heading is on, and which end of the wind
            //  lies between it and the heading she has: both can be
            //  told from the angles alone, before the polar is asked.
            var off = R.norm360(heads[k] - cnd.twd + 180) - 180;
            var onTack = off >= 0 ? 'port' : 'starboard';
            var kind = throughWind(node.heading, heads[k], cnd.twd, Math.abs(off)) ? 'tack' : 'gybe';
            if (node.via) {
              //  She has just come out of a manoeuvre.  The board she
              //  sails first is one that manoeuvre leads to: on the new
              //  tack, and the far side of the end of the wind she
              //  turned through.  (node.heading is still the heading
              //  she had before it.)
              if (onTack !== node.tack || kind !== node.via) {
                if (k < 360 / dh) prevH = null;
                continue;
              }
            } else if (onTack !== node.tack && cost[kind] > 0) {
              //  Onto the other tack: not without the manoeuvre.  It is
              //  begun once for a tack and once for a gybe, however
              //  many headings lie beyond each, because until it is
              //  over she has no heading to choose -- and only if there
              //  is a heading beyond it that the polar can sail.
              if (!begun[kind] && P.sail(polar, Math.abs(off), cnd.tws)) {
                begun[kind] = true;
                consider(node, R.driftFrom(cnd, Math.min(cost[kind] / 60, minutes), { manoeuvre: kind, tack: onTack }),
                         Tn, next, queue, { tack: onTack, heading: node.heading, via: kind, owed: cost[kind] });
              }
              if (k < 360 / dh) prevH = null;
              continue;
            }
          }
          var row = R.sailFrom(cnd, polar, heads[k], minutes);
          stats.tried++;
          if (!row.ok) { if (k < 360 / dh) { prevH = null; } continue; }
          consider(node, row, Tn, next, queue);
          if (near && k < 360 / dh && row.cog !== null) {
            var d = R.norm360(row.cog - tb + 180) - 180;
            if (prevH !== null && Math.abs(d) < 40 && Math.abs(prevD) < 40 && (d > 0) !== (prevD > 0)) {
              //  the track swings across the mark between these two
              //  headings: halve the gap until it lays it
              var lo = prevH, hi = heads[k], dlo = prevD, mid, rm, dm, it;
              for (it = 0; it < 18; it++) {
                mid = (lo + hi) / 2;
                rm = R.sailFrom(cnd, polar, mid, minutes);
                if (!rm.ok || rm.cog === null) break;
                dm = R.norm360(rm.cog - tb + 180) - 180;
                if ((dm > 0) === (dlo > 0)) { lo = mid; dlo = dm; } else hi = mid;
              }
              if (rm && rm.ok) { stats.tried++; consider(node, rm, Tn, next, queue); }
            }
            prevH = heads[k]; prevD = d;
          }
        }
      }
      if (finishes.length) break;
      frontier = next;
      T = Tn;
    }

    //  st is given for a manoeuvre row only: the tack she is going onto,
    //  the heading she had before it, which manoeuvre it is, and the
    //  time owed as the row begins.
    function consider(node, row, Tn, next, queue, st) {
      var ax = node.x, ay = node.y, bx = g.X(row.lon2), by = g.Y(row.lat2);
      var leg = node.leg, f = 1, ev = null, t;
      if (leg < g.stations.length) {
        var gt = g.stations[leg];
        if (gt.kind === 'pass') {
          //  either way across a line: the order of the stations is what
          //  says which way she is going
          t = gt.dir ? cross(ax, ay, bx, by, gt.x, gt.y, gt.ex, gt.ey) : enter(ax, ay, bx, by, gt.x, gt.y, gt.nm);
          if (t >= 0) { ev = 'pass'; f = t; }
        } else {
          t = cross(ax, ay, bx, by, gt.x, gt.y, gt.fx, gt.fy);
          if (t >= 0) {
            //  which way round is she going as she crosses?
            var z = gt.gx * (by - ay) - gt.gy * (bx - ax);
            if (z * gt.sense <= 0) { stats.stopped.wrongWay = (stats.stopped.wrongWay || 0) + 1; return; }
            ev = 'round'; f = t;
          }
        }
      } else {
        t = cross(ax, ay, bx, by, g.finish.a.x, g.finish.a.y, g.finish.b.x, g.finish.b.y);
        if (t >= 0) {
          if ((bx - ax) * g.finish.dir.x + (by - ay) * g.finish.dir.y <= 0) {
            stats.stopped.wrongWay = (stats.stopped.wrongWay || 0) + 1; return;
          }
          ev = 'finish'; f = t;
        }
      }
      //  behind her, on the first leg, the start line is a wall
      if (leg === 0 && cross(ax, ay, bx, by, g.start.a.x, g.start.a.y, g.start.b.x, g.start.b.y) >= 0) return;

      var lat2 = row.lat2, lon2 = row.lon2;
      if (ev) {
        bx = ax + (bx - ax) * f; by = ay + (by - ay) * f;
        lat2 = row.lat + (row.lat2 - row.lat) * f; lon2 = row.lon + (row.lon2 - row.lon) * f;
      }
      var what = g.water.stops(ax, ay, bx, by);
      if (what) { stats.stopped[what] = (stats.stopped[what] || 0) + 1; return; }

      //  A MARK ONCE ROUNDED STAYS ROUNDED.  She rounds a mark by
      //  crossing the line out from it the right way.  Nothing then
      //  stopped her crossing it back the other way a moment later,
      //  which unwinds the turn: the string drawn along her track no
      //  longer goes round the mark at all.  It was found by a gate.
      //  With a headland to pass before the buoy and again after it,
      //  the fastest "rounding" was to reach past the buoy, hook across
      //  its line, and come home the side she went out -- and the check
      //  that measures how far the track swings round the mark read
      //  two degrees where it should read a full turn.  Courses without
      //  gates had not been tempted, because their next mark lay on the
      //  far side of the turn; the fault was there all the same.
      //
      //  So the line of every mark she has rounded is a wall to her
      //  from the wrong side, for the rest of the passage.
      for (var pk = 0; pk < leg && pk < g.stations.length; pk++) {
        var pm = g.stations[pk];
        if (pm.kind !== 'mark') continue;
        //  Which side of the line each end of the step is on: positive
        //  is the side she came out on when she rounded.  The step that
        //  rounded the mark ends ON the line, so "on it" counts as
        //  through it; a test that asked only whether this step crosses
        //  the line let her turn back from the line itself.
        var sA = (pm.gx * (ay - pm.y) - pm.gy * (ax - pm.x)) * pm.sense;
        var sB = (pm.gx * (by - pm.y) - pm.gy * (bx - pm.x)) * pm.sense;
        if (sA >= -1e-9 && sB < -1e-9) {
          //  ... and where she comes back over it: out along the line
          //  from the mark is unwinding; behind the mark is only the
          //  far side of going round it.
          var tt = sA <= 0 ? 0 : sA / (sA - sB);
          var al = (ax + (bx - ax) * tt - pm.x) * pm.gx + (ay + (by - ay) * tt - pm.y) * pm.gy;
          if (al >= 0) { stats.stopped.unwound = (stats.stopped.unwound || 0) + 1; return; }
        }
      }

      if (ev) {
        var r2 = {}, kk;
        for (kk in row) r2[kk] = row[kk];
        r2.minutes = row.minutes * f; r2.lat2 = lat2; r2.lon2 = lon2;
        row = r2;
      }
      var ms = node.ms + row.minutes * 60000;
      if (ev === 'finish') { finishes.push({ ms: ms, node: node, row: row }); return; }
      //  the station made on this row, and any gate beyond it that she
      //  is inside as she makes it
      var evs = [], nl = leg;
      if (ev === 'round') { evs.push('rounded ' + g.stations[leg].name); nl = leg + 1; }
      if (ev === 'pass') { evs.push('passed ' + g.stations[leg].name); nl = leg + 1; }
      if (nl > leg) nl = already(nl, bx, by, evs);
      if (!ev && !inReach(leg, bx, by)) { stats.stopped.reach = (stats.stopped.reach || 0) + 1; return; }

      //  What she is doing as this row ends: sailing on a tack, or part
      //  way through a manoeuvre with some of its time still to serve.
      //  (A manoeuvre row cut short at a line has served only the part
      //  of it she was given, and the rest is still owed.)
      var owed = 0, via = null, tk = row.tack, hd = row.heading;
      if (st) {
        owed = st.owed - row.minutes * 60;
        if (owed < 1e-6) owed = 0;
        via = st.via; tk = st.tack; hd = st.heading;
      }
      var nn = { lat: lat2, lon: lon2, x: bx, y: by, ms: ms, leg: nl, parent: node, row: row,
                 ev: evs.length ? evs.join('; ') : null,
                 tack: tk, heading: hd, owed: owed, via: via };

      //  "FIRST" COUNTS WHAT SHE STILL OWES: a boat here now with two
      //  minutes of a tack to serve is no earlier than one here in two
      //  minutes' time with none.  And once a tack costs something,
      //  being here on port and being here on starboard are different
      //  places to be, so each is kept; with no crew set the key is the
      //  square alone, as it was.
      //
      //  AND SO ARE "CAN FETCH IT" AND "CANNOT".  Two boats in the same
      //  half-mile square on the same tack are not in the same place
      //  if one of them can lay the mark from there and the other is a
      //  few lengths to leeward of the line that does.  When a tack was
      //  free that did not matter.  When it costs, keeping only the
      //  earlier of the two throws away the boat that judged her
      //  layline and keeps the one that must tack twice more -- and the
      //  first version of this did exactly that, sailing a dead beat
      //  with one tack and a 37-minute overstand.  So a boat that can
      //  sail straight at where she is bound, on the tack she is on, is
      //  kept apart from one that cannot.  (The rule for which of two
      //  boats in a square is kept, above, has since come to guard the
      //  beat as well.  This one is still worth a minute or two on a
      //  run, and tests/router.js holds the run to it.)
      var eff = ms + owed * 1000;
      var tg = to[nl], brg = R.norm360(Math.atan2(tg.x - bx, tg.y - by) / RAD);
      var offT = R.norm360(brg - row.twd + 180) - 180;
      var key = cellKey(bx, by) + ':' + tk + (via ? ':' + via : '') +
                (((offT >= 0 ? 'port' : 'starboard') === tk && P.sail(polar, Math.abs(offT), row.tws)) ? ':f' : ':n');
      var was = seen[nl][key];
      if (nl > leg) {
        for (var lk = leg; lk < nl; lk++) if (legOver[lk] < 0) legOver[lk] = iter;
        if (was && was.ms <= eff + 500) return;
        seen[nl][key] = { ms: eff, slot: -1, iter: iter, node: nn };
        queue.push(nn);
        stats.kept++;
        return;
      }
      //  a manoeuvre that is over before the step is: she sails the rest
      if (st && ms < Tn - 1) { queue.push(nn); stats.kept++; return; }
      //  HER OWN STATION IS NOT A RIVAL.  The place she makes a station
      //  is noted in its square, so that of two boats that make it there
      //  the first is kept; and she sails the rest of that step on from
      //  it.  That rest may be seconds, too short to leave the square,
      //  and the first version of this then judged her against her own
      //  station -- reached earlier, so dropped -- and kept only a
      //  heading that fell back over the square's edge.  She sailed four
      //  seconds back the way she came after every station that landed
      //  near an edge, and gave the time away.  Found by a line pass
      //  laid on a square's edge (13 November 2026); it was there for
      //  marks and circles all along.
      if (was && was.slot < 0 && was.node === node) was = null;
      if (was) {
        //  reached earlier: she was here first
        if (was.ms < eff - 500 || was.slot < 0) return;
        if (was.iter === iter) {
          //  reached in this same step: keep the one that owes less,
          //  and of two that owe the same the one nearer where she is
          //  bound
          if (eff < was.ms - 500 ||
              (Math.abs(eff - was.ms) <= 500 && ahead(nl, bx, by, next[was.slot].x, next[was.slot].y))) {
            next[was.slot] = nn; was.ms = eff;
          }
          return;
        }
        //  reached in an earlier step by a boat that, counting what it
        //  owed, was no sooner than this one: this one takes the square
      }
      seen[nl][key] = { ms: eff, slot: next.length, iter: iter };
      next.push(nn);
      stats.kept++;
    }

    if (!finishes.length) {
      return { ok: false, stats: stats,
               why: frontier.length
                 ? 'no route finished before the wind grid ends at ' + utc(g.tEnd)
                 : 'no route: by ' + utc(T) + ' there was nowhere left she could sail to' };
    }
    finishes.sort(function (a, b) { return a.ms - b.ms; });
    var best = finishes[0], rows = [], nd = best.node, rw = best.row, lg = nleg - 1, evn = 'finish';
    while (rw) {
      var out = {}, q;
      for (q in rw) out[q] = rw[q];
      out.leg = lg; out.event = evn;
      rows.unshift(out);
      evn = nd.ev || null;
      lg = nd.parent ? nd.parent.leg : 0;
      rw = nd.row; var keep = nd; nd = nd.parent;
      if (!nd) { stats.along = keep.along; break; }
    }
    //  the place on the start line this route began from, and any gate
    //  she was inside as she started
    var root = best.node;
    while (root.parent) root = root.parent;

    //  what the track adds up to
    var sum = { start: utc(g.t0), finish: utc(best.ms), hours: (best.ms - g.t0) / 3600000,
                ground: 0, water: 0, tacks: 0, gybes: 0, tackSeconds: 0, gybeSeconds: 0,
                noStreamMinutes: 0, clampedMinutes: 0,
                optimumMinutes: 0, rounded: [], passed: [], startAlong: stats.along, pin: g.pin || null };
    (root.pre || []).forEach(function (e) { sum.passed.push({ name: e.replace(/^passed /, ''), at: utc(g.t0) }); });
    for (i = 0; i < rows.length; i++) {
      var rr = rows[i];
      sum.ground += rr.sog * rr.minutes / 60;
      sum.water += rr.stw * rr.minutes / 60;
      if (i && rows[i - 1].tack !== rr.tack) {
        //  A tack and a gybe are counted apart.  With a crew set the
        //  manoeuvre row says which it is; without one it is worked
        //  out from the two headings, the same way.
        var kd = rr.manoeuvre || (throughWind(rows[i - 1].heading, rr.heading, rr.twd, rr.twa) ? 'tack' : 'gybe');
        if (kd === 'tack') sum.tacks++; else sum.gybes++;
      }
      if (rr.manoeuvre === 'tack') sum.tackSeconds += rr.minutes * 60;
      if (rr.manoeuvre === 'gybe') sum.gybeSeconds += rr.minutes * 60;
      if (rr.noStream) sum.noStreamMinutes += rr.minutes;
      if (rr.clamped) sum.clampedMinutes += rr.minutes;
      if (rr.polar !== 'table' && rr.polar !== 'manoeuvre') sum.optimumMinutes += rr.minutes;
      //  A row may end by making more than one station: a mark rounded
      //  inside the circle of the gate beyond it is both at once.
      if (rr.event && rr.event !== 'finish') {
        rr.event.split('; ').forEach(function (e) {
          var when = utc(rr.ms + rr.minutes * 60000);
          if (/^rounded /.test(e)) sum.rounded.push({ mark: e.replace(/^rounded /, ''), at: when });
          else if (/^passed /.test(e)) sum.passed.push({ name: e.replace(/^passed /, ''), at: when });
        });
      }
    }
    //  what the run asked a manoeuvre to cost, so that a report need
    //  not open the crew file to say it
    sum.crew = rn.crew ? { file: rn.crew.file, level: rn.crew.level, tack: cost.tack, gybe: cost.gybe } : null;
    //  WHAT EACH STATION ASKED, beside when she made it, so that a report
    //  says the figures the route was sailed to and can be sailed again
    //  from what it prints (the XO, 13 November 2026).  Stations are
    //  made strictly in order, so the k-th pass made is the k-th pass of
    //  the plan, and the same for the marks.
    var sp = g.stations.filter(function (s) { return s.kind === 'pass'; });
    var sm = g.stations.filter(function (s) { return s.kind === 'mark'; });
    sum.passed.forEach(function (p, k) { if (sp[k]) { p.nm = sp[k].nm; p.dir = sp[k].dir; } });
    sum.rounded.forEach(function (r, k) { if (sm[k]) r.berth = sm[k].berth; });
    sum.passage = rn.passage ? { file: rn.passage.file, plan: rn.passage.plan } : null;
    sum.round = rn.passage ? null : rn.round;
    return { ok: true, rows: rows, summary: sum, stats: stats, stations: g.stations };
  }

  return { run: run, compile: compile, utc: utc, cross: cross, segSeg: segSeg, ptSeg: ptSeg };
})();

if (typeof module !== 'undefined') module.exports = ROUTER;

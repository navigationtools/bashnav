/* =====================================================================
   tides -- work.  The coastal-navigation calculators, browser build.

   A port of src/tides/work.awk.  Each calculator produces the SAME LINES
   OF WORKING as the awk tool, character for character, and
   docs/web/tests/tides-work.js holds it to that over every worked case in
   tests/tides-work.dat.  So every line of text below has a twin in the
   awk; change one and change the other.  Where the awk draws an ASCII
   figure, the working carries the marker "@@FIG" and the page puts an SVG
   there instead -- the data is ported, never the drawing.

   The URL parameters are a CONTRACT with the coastal navigation course,
   which deep-links here:  ?work=<name>&key=value...&lesson=<id>.  The
   authoritative list is docs/web/tides/WORK.md.  Do not rename one.
   Lesson names follow Larry's decision of 11 November 2026 (l1-3,
   l3-2025-4); lessonHref() below is the only place that reads them.

   Formatting goes through fx(), which rounds an exact tie the way C's
   printf does (to even) rather than the way toFixed() does (up).  A range
   of 1.50 m gives twelfths of 0.125 m, which is such a tie, and the two
   builds would otherwise print different centimetres for the same tide.
   ===================================================================== */
'use strict';

/*  The Practical Navigator course, its coastal section.  ONE constant,
    used for every back link to a lesson: ?lesson=l3-2025-4 leads to
    COURSE_BASE + 'l3-2025.html#l3-2025-4'.  Same origin as tides since
    the course moved to bashnav.navigationtools.org/practical-navigator/.
    Documented in WORK.md; change it here and nowhere else. */
var COURSE_BASE = 'https://bashnav.navigationtools.org/practical-navigator/coastal/';

var WORK = (function () {
  var T = (typeof TIDE !== 'undefined') ? TIDE : null;
  function useTide(t) { T = t; }

  var NAMES = ['twelfths', 'secondary', 'stream', 'atlas', 'cts', 'setdrift'];

  /* ---- formatting, each the twin of a wk_ helper ------------------- */
  function trunc(x) { return Math.trunc(x); }
  function fabs(x) { return x < 0 ? -x : x; }
  function ffloor(x) { var n = trunc(x); return x < n ? n - 1 : n; }
  function nrm360(x) { x = x - 360 * trunc(x / 360); if (x < 0) x += 360; return x; }
  var R2D = 57.2957795130823209;
  function atan2d(y, x) { return R2D * Math.atan2(y, x); }
  function fx(v, dec) {
    var h = v * Math.pow(2, dec + 1);
    if (h === Math.round(h) && Math.abs(h) % 2 === 1) {
      var p = Math.pow(10, dec), x = v * p, t = Math.trunc(x);
      if (Math.abs(t) % 2 === 1) t += (x > 0 ? 1 : -1);
      return (t / p).toFixed(dec);
    }
    return v.toFixed(dec);
  }
  /*  printf for the conversions work.awk uses: %s and %d, with the -
      and 0 flags and a width.  %d truncates, as awk's does. */
  function sprintf(fmt) {
    var args = arguments, ai = 1;
    return fmt.replace(/%([-0]*)(\d*)([sd%])/g, function (m, fl, w, c) {
      if (c === '%') return '%';
      var v = args[ai++], s, neg = false;
      if (c === 's') s = String(v);
      else { var n = trunc(+v); neg = n < 0; s = String(Math.abs(n)); }
      var width = w === '' ? 0 : +w;
      if (fl.indexOf('-') >= 0) { if (neg) s = '-' + s; while (s.length < width) s += ' '; return s; }
      if (fl.indexOf('0') >= 0 && c === 'd') {
        while (s.length < width - (neg ? 1 : 0)) s = '0' + s;
        return (neg ? '-' : '') + s;
      }
      if (neg) s = '-' + s;
      while (s.length < width) s = ' ' + s;
      return s;
    });
  }
  function wf(v, d) { var s = fx(v, d); if (/^-0\.?0*$/.test(s)) s = s.substr(1); return s; }
  function wfs(v, d) { var s = wf(v, d); if (s.charAt(0) !== '-') s = '+' + s; return s; }
  function wp(v, d) { return v < 0 ? '(' + wf(v, d) + ')' : wf(v, d); }
  function wg(v) { return v === trunc(v) ? sprintf('%d', v) : wf(v, 2).replace(/0$/, ''); }
  function d1(a) { var s = wf(nrm360(a), 1); if (s === '360.0') s = '0.0'; return pad0(s, 5); }
  function r2(x) { return x < 0 ? -trunc(-x * 100 + 0.5) / 100 : trunc(x * 100 + 0.5) / 100; }
  function wmod(x, m) { x = x - m * trunc(x / m); if (x < 0) x += m; return x; }
  function deg(a) { var r = trunc(nrm360(a) + 0.5); if (r >= 360) r -= 360; return sprintf('%03d', r); }
  function hhmm(m) { m = ffloor(m + 0.5); m = wmod(m, 1440); return sprintf('%02d:%02d', trunc(m / 60), m % 60); }
  function dur(m) {
    m = trunc(fabs(m) + 0.5); var h = trunc(m / 60);
    if (h > 0) return sprintf('%d h %02d min', h, m % 60);
    return sprintf('%d min', m);
  }
  function ew(v) { return v < 0 ? wg(-v) + ' W' : wg(v) + ' E'; }
  function pad0(s, n) { while (s.length < n) s = '0' + s; return s; }
  function latf(x) {
    var hm = x < 0 ? 'S' : 'N', a = fabs(x), d = trunc(a), mi = (a - d) * 60;
    if (mi >= 59.95) { mi = 0; d++; }
    return sprintf("%02d %s'%s", d, pad0(wf(mi, 1), 4), hm);
  }
  function lonf(x) {
    var hm = x < 0 ? 'W' : 'E', a = fabs(x), d = trunc(a), mi = (a - d) * 60;
    if (mi >= 59.95) { mi = 0; d++; }
    return sprintf("%03d %s'%s", d, pad0(wf(mi, 1), 4), hm);
  }
  var RULE = '  ----------------------------------------------------------------------';
  function sind(x) { return T.sind(x); }
  function cosd(x) { return T.cosd(x); }
  function rbrg(x, y) { return nrm360(atan2d(x, y)); }

  /* ---- one run's state --------------------------------------------- */
  var S;   // { err, lines, res, fig, a (params), keys, ctx }
  function err(s) { if (S.err === '') S.err = s; return 0; }
  function wl(s) { S.lines.push(s); }
  function head(s) { wl(''); wl('  ' + s); wl(RULE); }
  function has(k) { return Object.prototype.hasOwnProperty.call(S.a, k) && S.a[k] !== ''; }
  function isnum(s) { return /^[-+]?([0-9]+[.]?[0-9]*|[.][0-9]+)$/.test(s); }

  function parse(params) {
    S.a = {}; S.keys = [];
    for (var i = 0; i < params.length; i++) {
      var k = params[i][0], v = params[i][1];
      if (!/^[a-z][a-z0-9]*$/.test(k)) return err("'" + k + "' is not a parameter name");
      if (!Object.prototype.hasOwnProperty.call(S.a, k)) S.keys.push(k);
      S.a[k] = v;
    }
    return 1;
  }
  function allow(name, list) {
    var ok = { work: 1, lesson: 1 };
    list.split(' ').forEach(function (k) { ok[k] = 1; });
    for (var i = 0; i < S.keys.length; i++)
      if (!ok[S.keys[i]]) return err(name + ' does not take ' + S.keys[i] + '=');
    return 1;
  }
  function num(k, def, lo, hi, what) {
    if (S.err !== '') return 0;
    if (!has(k)) {
      if (def === '') return err(k + '= is needed (' + what + ')');
      return +def;
    }
    var v = S.a[k];
    if (!isnum(v)) return err(k + '=' + v + ' is not a number');
    v = +v;
    if (v < +lo || v > +hi) return err(k + '=' + S.a[k] + ' is out of range (' + lo + ' to ' + hi + ')');
    return v;
  }
  function ang(k, def, what) { return nrm360(num(k, def, '0', '360', what)); }
  function hmOf(s) {
    var h, m, c = s.indexOf(':');
    if (/^[0-9][0-9]?:[0-9][0-9]$/.test(s)) { h = +s.substr(0, c); m = +s.substr(c + 1); }
    else if (/^[0-9][0-9][0-9][0-9]$/.test(s)) { h = +s.substr(0, 2); m = +s.substr(2, 2); }
    else return -1;
    if (h > 23 || m > 59) return -1;
    return h * 60 + m;
  }
  function time(k, what) {
    if (S.err !== '') return 0;
    if (!has(k)) return err(k + '= is needed (' + what + ', HH:MM)');
    var v = hmOf(S.a[k]);
    if (v < 0) return err(k + '=' + S.a[k] + ' is not a time (HH:MM)');
    return v;
  }
  var WP = { lat: 0, lon: 0 };
  function pos(k, what) {
    if (S.err !== '') return 0;
    if (!has(k)) return err(k + '= is needed (' + what + ', lat,lon)');
    var p = S.a[k].split(',');
    if (p.length !== 2 || !isnum(p[0]) || !isnum(p[1]))
      return err(k + '=' + S.a[k] + ' is not a position (lat,lon in decimal degrees)');
    WP.lat = +p[0]; WP.lon = +p[1];
    if (WP.lat < -90 || WP.lat > 90 || WP.lon < -180 || WP.lon > 180)
      return err(k + '=' + S.a[k] + ' is out of range (lat -90 to 90, lon -180 to 180)');
    return 1;
  }
  var WD = { y: 0, m: 0, d: 0 };
  function dateOf(s) {
    if (!/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/.test(s)) return 0;
    var y = +s.substr(0, 4), m = +s.substr(5, 2), d = +s.substr(8, 2);
    if (m < 1 || m > 12 || d < 1 || d > 31) return 0;
    var c = T.jd2cal(T.jdate(y, m, d) + 0.5);
    if (c.y !== y || c.m !== m || c.d !== d) return 0;
    WD.y = y; WD.m = m; WD.d = d;
    return 1;
  }
  function wind(lee) {
    if (S.err !== '' || lee === 0) return '';
    if (!has('wind')) return err('leeway needs wind=port or wind=stbd (the side the wind is on)');
    var w = S.a.wind;
    if (w !== 'port' && w !== 'stbd') return err('wind=' + w + ' should be port or stbd');
    return w;
  }

  /* ---- the station-backed tools ------------------------------------ */
  var ST;   // the prediction and its turns
  function stationId(a, defStation) {
    return (a.station !== undefined && a.station !== '') ? a.station : (defStation || '');
  }
  function station() {
    if (S.err !== '') return 0;
    var C = S.ctx, id = has('station') ? S.a.station : (C.defStation || '');
    if (id === '') return err('station= is needed (a station id, e.g. ticon/dover-dov-gbr-bodc)');
    if (!/^[A-Za-z0-9_.\/-]+$/.test(id)) return err('station=' + id + ' is not a station id');
    var jdn = -1;
    if (C.nowdate && dateOf(C.nowdate)) {
      var nt = (C.nowtime || '').split(':');
      jdn = T.jdate(WD.y, WD.m, WD.d) + (+nt[0] || 0) / 24.0 + (+nt[1] || 0) / 1440.0;
    }
    if (has('date')) {
      if (!dateOf(S.a.date)) return err('date=' + S.a.date + ' is not a date (YYYY-MM-DD)');
    } else if (jdn < 0) return err('date= is needed (YYYY-MM-DD)');
    if (!has('date')) dateOf(C.nowdate);
    var got = C.load ? C.load(id) : { err: 'no station with that id' };
    var P = (got && !got.err) ? T.open(got.st, got.ref, T.jdate(WD.y, WD.m, WD.d) + 0.5) : null;
    if (!P || P.err) return err('station=' + id + ': ' + (got && got.err ? got.err : P.err));
    //  the atlas reads the station's own amplitudes, before nodal factors
    ST = { P: P, id: id, raw: got.st.kind === 'R' ? got.st : got.ref };
    if (!has('date')) {
      var c = T.jd2cal(jdn + P.tz / 1440.0);
      WD.y = c.y; WD.m = c.m; WD.d = c.d;
    }
    if (has('t')) {
      ST.t = hmOf(S.a.t);
      if (ST.t < 0) return err('t=' + S.a.t + ' is not a time (HH:MM)');
    } else if (jdn >= 0) {
      ST.t = ffloor(((jdn + P.tz / 1440.0) - T.jdate(WD.y, WD.m, WD.d)) * 1440 + 0.5);
      if (ST.t < 0 || ST.t >= 1440) return err('t= is needed (HH:MM)');
    } else return err('t= is needed (HH:MM)');
    ST.date = sprintf('%04d-%02d-%02d', WD.y, WD.m, WD.d);
    ST.jdA = T.jdate(WD.y, WD.m, WD.d) - P.tz / 1440.0;
    ST.jdT = ST.jdA + ST.t / 1440.0;
    var hl = P.hilo(ST.jdA - 1, ST.jdA + 2);
    ST.turns = hl.map(function (e) {
      return { k: e.k, jd: e.t, m: ffloor((e.t - ST.jdA) * 1440 + 0.5), h: r2(e.h) };
    });
    P.curvePrep(ST.jdA - 1, ST.jdA + 2);
    return 1;
  }
  function sthead() {
    var P = ST.P, k = P.name;
    if (P.region !== '') k = k + ', ' + P.region;
    wl('  ' + k + '   ' + ST.id);
    wl('  ' + sprintf("%s at %s, the station's standard time (no summer time)", ST.date, hhmm(ST.t)));
    if (P.kind === 'S') wl('  a secondary port, worked from ' + P.refName);
  }
  function kname(k) { return k === 'H' ? 'HW' : 'LW'; }

  /* =================================================================
     1.  The rule of twelfths, and the cosine curve
     ================================================================= */
  var STP = [0, 1, 2, 3, 3, 2, 1], CUM = [0, 0, 1, 3, 6, 9, 11, 12];   // 1-indexed, as in the awk
  function core12(t1, h1, k1, t2, h2, k2, t) {
    var D = t2 - t1, R = h2 - h1, i, hh;
    var sg = R >= 0 ? '+' : '-';
    var tw = k1 === 'L' ? 'a rising tide' : 'a falling tide';
    wl(sprintf('  %s %s  %s m   to   %s %s  %s m      %s',
       kname(k1), hhmm(t1), wf(h1, 2), kname(k2), hhmm(t2), wf(h2, 2), tw));
    wl(sprintf('  range %s m over %s, so a tidal hour here is %s', wf(fabs(R), 2), dur(D), dur(D / 6)));
    var x = (t - t1) / (D / 6.0);
    wl(sprintf('  height wanted at %s: %s after %s = %s tidal hours', hhmm(t), dur(t - t1), kname(k1), wf(x, 2)));
    if (D < 240 || D > 480) wl('  ' + sprintf('the rule assumes about six hours from turn to turn; this one is %s', dur(D)));
    wl('');
    wl('  1  The twelfths, tidal hour by tidal hour');
    wl('     hour  time     this hour        so far    height');
    wl(sprintf('       0   %s        -           0/12   %6s m', hhmm(t1), wf(h1, 2)));
    for (i = 1; i <= 6; i++) {
      hh = h1 + R * CUM[i + 1] / 12.0;
      wl(sprintf('       %d   %s    %d/12  %s%s m   %2d/12   %6s m', i, hhmm(t1 + i * D / 6.0),
         STP[i], sg, wf(fabs(R) * STP[i] / 12.0, 2), CUM[i + 1], wf(hh, 2)));
    }
    var ix = trunc(x); if (ix > 5) ix = 5;
    var fr = x - ix, c12 = CUM[ix + 1] + fr * STP[ix + 1], h12 = h1 + R * c12 / 12.0;
    wl('');
    wl(sprintf("  2  At %s: %d tidal hours give %d/12, and %s of hour %d's %d/12 adds %s/12",
       hhmm(t), ix, CUM[ix + 1], wf(fr, 2), ix + 1, STP[ix + 1], wf(fr * STP[ix + 1], 2)));
    wl(sprintf('     %s/12 of %s m = %s m, so h = %s %s %s = %s m',
       wf(c12, 2), wf(fabs(R), 2), wf(fabs(R) * c12 / 12.0, 2), wf(h1, 2), sg,
       wf(fabs(R) * c12 / 12.0, 2), wf(h12, 2)));
    var fa = (t - t1) / D, A = 180.0 * (fa + 1), ca = cosd(A), hc = h1 + R * (ca + 1) / 2.0;
    wl('');
    wl('  3  The cosine curve:  h = h1 + (h2 - h1) x (cos A + 1)/2');
    wl('     where A = 180 x (fraction of the time from turn to turn + 1) degrees');
    wl(sprintf('     fraction of the way from %s to %s = %s / %s = %s', kname(k1), kname(k2), dur(t - t1), dur(D), wf(fa, 3)));
    wl(sprintf('     A = %s deg, cos A = %s', wf(A, 1), wf(ca, 3)));
    wl(sprintf('     h = %s + (%s) x (%s + 1)/2 = %s m', wf(h1, 2), wf(R, 2), wf(ca, 3), wf(hc, 2)));
    wl('');
    wl(sprintf('  4  Twelfths minus cosine: %s m.  The twelfths are a staircase laid over', wfs(h12 - hc, 2)));
    wl('     the cosine: they agree at the turns, at half tide and at hours 2 and 4,');
    wl('     and differ most an hour either side of a turn.');
    S.res.t12 = h12; S.res.tcos = hc; S.res.range = fabs(R); S.res.dur = D;
    S.res.kind = k1 === 'L' ? 'rise' : 'fall';
    S.fig = { kind: 'twelfths', t1: t1, t2: t2, h1: h1, h2: h2, t: t, h12: h12, hc: hc, k1: k1, k2: k2 };
    return 1;
  }
  //  the three curves, sampled for the figure
  function twelfthsAt(F, tt) {
    var x = (tt - F.t1) / ((F.t2 - F.t1) / 6.0), ix = trunc(x); if (ix > 5) ix = 5;
    return F.h1 + (F.h2 - F.h1) * (CUM[ix + 1] + (x - ix) * STP[ix + 1]) / 12.0;
  }
  function cosineAt(F, tt) {
    return F.h1 + (F.h2 - F.h1) * (cosd(180.0 * ((tt - F.t1) / (F.t2 - F.t1) + 1)) + 1) / 2.0;
  }
  function twelfths() {
    var manual = has('lw') || has('hw') || has('lwh') || has('hwh');
    var t1, h1, k1, t2, h2, k2, tt;
    if (manual) {
      allow('twelfths', 'lw lwh hw hwh t');
      var lwm = time('lw', 'time of low water'), lwh = num('lwh', '', '-20', '30', 'height of low water, m');
      var hwm = time('hw', 'time of high water'), hwh = num('hwh', '', '-20', '30', 'height of high water, m');
      tt = time('t', 'the time you want the height for');
      if (S.err !== '') return 0;
      if (hwh <= lwh) return err('hwh= must be higher than lwh=');
      if (lwm === hwm) return err('lw= and hw= are the same time');
      var d = wmod(hwm - lwm, 1440);
      if (d <= 720) { t1 = lwm; h1 = lwh; t2 = lwm + d; h2 = hwh; k1 = 'L'; k2 = 'H'; }
      else { t1 = hwm; h1 = hwh; t2 = hwm + (1440 - d); h2 = lwh; k1 = 'H'; k2 = 'L'; }
      tt = t1 + wmod(tt - t1, 1440);
      if (tt > t2) return err('t=' + S.a.t + ' is not between the two turns (' + hhmm(t1) + ' and ' + hhmm(t2) + ')');
      head('RULE OF TWELFTHS, AND THE COSINE CURVE');
      core12(t1, h1, k1, t2, h2, k2, tt);
      wl('@@FIG');
      wl(sprintf('  ANSWER   twelfths %s m    cosine %s m', wf(S.res.t12, 2), wf(S.res.tcos, 2)));
      wl(RULE);
      return 1;
    }
    allow('twelfths', 'station date t');
    if (!station()) return 0;
    var W = ST.turns, ip = -1, inx = -1, i;
    for (i = 0; i < W.length; i++) {
      if (W[i].jd <= ST.jdT) ip = i;
      else if (inx < 0) inx = i;
    }
    if (ip < 0 || inx < 0) return err('no turn of the tide either side of that time');
    if (W[ip].k === W[inx].k) return err('the turns either side of ' + hhmm(ST.t) + ' are both ' + kname(W[ip].k) + ': no twelfths between them');
    var hv = ST.P.height(ST.jdT);
    head('RULE OF TWELFTHS, THE COSINE CURVE AND THE HARMONIC PREDICTION');
    sthead();
    wl(sprintf('  from the prediction, the turns either side of %s:', hhmm(ST.t)));
    wl('');
    tt = ST.t;
    if (tt < W[ip].m) tt = W[ip].m;
    if (tt > W[inx].m) tt = W[inx].m;
    core12(W[ip].m, W[ip].h, W[ip].k, W[inx].m, W[inx].h, W[inx].k, tt);
    wl('');
    wl(sprintf('  5  The harmonic prediction itself at %s: %s m', hhmm(ST.t), wf(hv, 2)));
    wl(sprintf('     twelfths minus harmonic %s m, cosine minus harmonic %s m', wfs(S.res.t12 - hv, 2), wfs(S.res.tcos - hv, 2)));
    if (ST.P.kind === 'S') {
      wl('     At a secondary port the curve between the turns is itself a half');
      wl("     cosine, so those two agree but for the table's rounding.");
    } else {
      wl('     The harmonic curve is the sum of every constituent, so it carries the');
      wl('     shape a real tide has: a long stand, a fast flood, a double high water.');
    }
    S.res.tharm = hv;
    var P = ST.P, jdA = ST.jdA;
    S.fig.harm = function (m) { return P.height(jdA + m / 1440.0); };
    S.fig.hv = hv;
    wl('@@FIG');
    wl(sprintf('  ANSWER   twelfths %s m    cosine %s m    harmonic %s m', wf(S.res.t12, 2), wf(S.res.tcos, 2), wf(hv, 2)));
    wl(RULE);
    return 1;
  }

  /* =================================================================
     2.  A secondary port
     ================================================================= */
  var WC;
  function cyc(x, a, d1, b, d2) {
    x = wmod(x, 720); a = wmod(a, 720); b = wmod(b, 720);
    var L = wmod(b - a, 720), p = wmod(x - a, 720);
    if (p <= L) { WC = { f: p / L, da: d1, db: d2, p: p, L: L }; return d1 + WC.f * (d2 - d1); }
    WC = { f: (p - L) / (720 - L), da: d2, db: d1, p: p - L, L: 720 - L };
    return d2 + WC.f * (d1 - d2);
  }
  function hm12(m) { m = wmod(m, 720); return hhmm(m) + ' and ' + hhmm(m + 720); }
  function secpart(K, n, tm, hh, ta, da, tb, db, ms, mn, ds, dn) {
    var lab = K === 'H' ? 'High' : 'Low', sl = K === 'H' ? 'MHWS' : 'MLWS', nl = K === 'H' ? 'MHWN' : 'MLWN';
    wl('');
    wl(sprintf('  %d  %s water time difference', n, lab));
    wl(sprintf('     the almanac gives %s min at %s, %s min at %s', wfs(da, 0), hm12(ta), wfs(db, 0), hm12(tb)));
    var td = cyc(tm, ta, da, tb, db), tdr = ffloor(td + 0.5);
    wl(sprintf('     standard port %s %s lies between %s (%s) and %s (%s):',
       kname(K), hhmm(tm), hhmm(tm - WC.p), wfs(WC.da, 0), hhmm(tm - WC.p + WC.L), wfs(WC.db, 0)));
    wl(sprintf('     %s of %s = %s of the way', dur(WC.p), dur(WC.L), wf(WC.f, 2)));
    wl(sprintf('     difference = %s + %s x %s = %s min, call it %s',
       wfs(WC.da, 0), wf(WC.f, 2), wp(WC.db - WC.da, 0), wfs(td, 1), wfs(tdr, 0)));
    var st = tm + tdr;
    wl(sprintf('     secondary %s = %s %s %d min = %s', kname(K), hhmm(tm), tdr < 0 ? '-' : '+', fabs(tdr), hhmm(st)));
    wl('');
    wl(sprintf('  %d  %s water height difference', n + 1, lab));
    var f = (hh - mn) / (ms - mn);
    wl(sprintf('     %s m is %s of the way from %s %s to %s %s', wf(hh, 2), wf(f, 2), nl, wf(mn, 2), sl, wf(ms, 2)));
    if (f < 0) wl('     ' + sprintf("below %s: the difference is EXTRAPOLATED beyond the almanac's range", nl));
    if (f > 1) wl('     ' + sprintf("beyond %s: the difference is EXTRAPOLATED beyond the almanac's range", sl));
    var dd = dn + f * (ds - dn);
    wl(sprintf('     difference = %s + %s x %s = %s m', wfs(dn, 2), wf(f, 2), wp(ds - dn, 2), wfs(dd, 2)));
    var ht = hh + dd;
    wl(sprintf('     secondary %s height = %s %s %s = %s m', kname(K), wf(hh, 2), dd < 0 ? '-' : '+', wf(fabs(dd), 2), wf(ht, 2)));
    S.res[K + 'time'] = wmod(st, 1440); S.res[K + 'tdiff'] = td; S.res[K + 'hdiff'] = dd; S.res[K + 'height'] = ht;
    S.res[K + 'f'] = f; S.res[K + 'x'] = (f < 0 || f > 1) ? 1 : 0;
    return 1;
  }
  function secondary() {
    allow('secondary', 'hw hwh lw lwh mhws mhwn mlwn mlws dhws dhwn dlwn dlws thw1 tdhw1 thw2 tdhw2 tlw1 tdlw1 tlw2 tdlw2');
    var doh = has('hw') || has('hwh'), dol = has('lw') || has('lwh');
    if (S.err !== '') return 0;
    if (!doh && !dol) return err("give the standard port's hw= and hwh=, or lw= and lwh=, or both");
    var hw, hwh, ms, mn, ds, dn, a1, a2, b1, b2, lw, lwh, ln, ls, dln, dls, c1, c2, e1, e2;
    if (doh) {
      hw = time('hw', 'standard port high water'); hwh = num('hwh', '', '-20', '30', 'standard port HW height, m');
      ms = num('mhws', '', '-20', '30', 'standard port MHWS, m'); mn = num('mhwn', '', '-20', '30', 'standard port MHWN, m');
      ds = num('dhws', '', '-10', '10', 'secondary height difference at MHWS, m'); dn = num('dhwn', '', '-10', '10', 'height difference at MHWN, m');
      a1 = time('thw1', 'first standard-port HW time in the almanac'); a2 = num('tdhw1', '', '-720', '720', 'time difference there, min');
      b1 = time('thw2', 'second standard-port HW time'); b2 = num('tdhw2', '', '-720', '720', 'time difference there, min');
      if (S.err !== '') return 0;
      if (ms === mn) return err('mhws= and mhwn= are the same, so there is nothing to interpolate between');
      if (wmod(a1 - b1, 720) === 0) return err('thw1= and thw2= are the same time (modulo 12 hours)');
    }
    if (dol) {
      lw = time('lw', 'standard port low water'); lwh = num('lwh', '', '-20', '30', 'standard port LW height, m');
      ln = num('mlwn', '', '-20', '30', 'standard port MLWN, m'); ls = num('mlws', '', '-20', '30', 'standard port MLWS, m');
      dln = num('dlwn', '', '-10', '10', 'height difference at MLWN, m'); dls = num('dlws', '', '-10', '10', 'height difference at MLWS, m');
      c1 = time('tlw1', 'first standard-port LW time in the almanac'); c2 = num('tdlw1', '', '-720', '720', 'time difference there, min');
      e1 = time('tlw2', 'second standard-port LW time'); e2 = num('tdlw2', '', '-720', '720', 'time difference there, min');
      if (S.err !== '') return 0;
      if (ln === ls) return err('mlwn= and mlws= are the same, so there is nothing to interpolate between');
      if (wmod(c1 - e1, 720) === 0) return err('tlw1= and tlw2= are the same time (modulo 12 hours)');
    }
    head('SECONDARY PORT, FROM A STANDARD PORT');
    if (doh) wl(sprintf('  standard port HW %s  %s m      MHWS %s  MHWN %s', hhmm(hw), wf(hwh, 2), wf(ms, 2), wf(mn, 2)));
    if (dol) wl(sprintf('  standard port LW %s  %s m      MLWN %s  MLWS %s', hhmm(lw), wf(lwh, 2), wf(ln, 2), wf(ls, 2)));
    wl("  differences interpolate linearly: times by the standard port's time,");
    wl("  heights by the standard port's height between neaps and springs");
    if (doh) secpart('H', 1, hw, hwh, a1, a2, b1, b2, ms, mn, ds, dn);
    if (dol) secpart('L', doh ? 3 : 1, lw, lwh, c1, c2, e1, e2, ls, ln, dls, dln);
    wl('');
    var ans = '  ANSWER  ';
    if (doh) ans += sprintf(' secondary HW %s  %s m', hhmm(S.res.Htime), wf(S.res.Hheight, 2));
    if (doh && dol) ans += '   ';
    if (dol) ans += sprintf(' LW %s  %s m', hhmm(S.res.Ltime), wf(S.res.Lheight, 2));
    wl(ans);
    wl(RULE);
    return 1;
  }

  /* =================================================================
     3.  A tidal stream rate between neaps and springs
     ================================================================= */
  function stream() {
    allow('stream', 'spr nps range sprange nprange');
    var spr = num('spr', '', '0', '15', 'the atlas spring rate, kn'), nps = num('nps', '', '0', '15', 'the atlas neap rate, kn');
    var rg = num('range', '', '0', '20', "today's range at the reference port, m");
    var sp = num('sprange', '', '0', '20', 'mean spring range at the reference port, m');
    var np = num('nprange', '', '0', '20', 'mean neap range at the reference port, m');
    if (S.err !== '') return 0;
    if (sp <= np) return err('sprange= must be larger than nprange=');
    head('TIDAL STREAM RATE, BY THE RANGE');
    wl(sprintf('  1  The atlas: %s kn at springs, %s kn at neaps', wf(spr, 1), wf(nps, 1)));
    if (spr < nps) wl('     the spring rate is normally the larger: check the two figures');
    wl(sprintf("  2  The reference port: today's range %s m", wf(rg, 2)));
    wl(sprintf('     its mean ranges: springs %s m, neaps %s m', wf(sp, 2), wf(np, 2)));
    var f = (rg - np) / (sp - np);
    wl(sprintf('  3  How far from neaps to springs: (%s - %s) / (%s - %s) = %s', wf(rg, 2), wf(np, 2), wf(sp, 2), wf(np, 2), wf(f, 2)));
    if (f > 1) wl('     beyond springs: the rate is EXTRAPOLATED past the spring figure');
    if (f < 0) wl('     below neaps: the rate is EXTRAPOLATED past the neap figure');
    var rate = nps + f * (spr - nps), clamp = 0;
    wl(sprintf('  4  Rate = %s + %s x (%s - %s) = %s kn', wf(nps, 2), wf(f, 2), wf(spr, 2), wf(nps, 2), wf(rate, 2)));
    if (rate < 0) { rate = 0; clamp = 1; wl('     a rate below nothing is no rate: taken as 0.0 kn'); }
    S.res.rate = rate; S.res.f = f; S.res.x = (f < 0 || f > 1) ? 1 : 0; S.res.clamp = clamp;
    S.fig = { kind: 'stream', spr: spr, nps: nps, rg: rg, sp: sp, np: np, rate: rate };
    wl('@@FIG');
    wl(sprintf('  ANSWER   %s kn%s', wf(rate, 1), (f < 0 || f > 1) ? '   (extrapolated)' : ''));
    wl(RULE);
    return 1;
  }

  /* =================================================================
     4.  Which page of the tidal stream atlas
     ================================================================= */
  function atlas() {
    allow('atlas', 'station date t');
    if (!station()) return 0;
    var W = ST.turns, i, ihw = -1, best = 1e9;
    for (i = 0; i < W.length; i++) if (W[i].k === 'H' && fabs(W[i].m - ST.t) < best) { best = fabs(W[i].m - ST.t); ihw = i; }
    if (ihw < 0) return err('no high water near that time at this station');
    head('WHICH PAGE OF THE TIDAL STREAM ATLAS');
    sthead();
    var dt = ST.t - W[ihw].m;
    wl('');
    wl(sprintf('  1  The high water nearest %s: HW %s  %s m', hhmm(ST.t), hhmm(W[ihw].m), wf(W[ihw].h, 2)));
    if (dt < 0) wl(sprintf('     %s is %s before it', hhmm(ST.t), dur(dt)));
    else if (dt > 0) wl(sprintf('     %s is %s after it', hhmm(ST.t), dur(dt)));
    else wl(sprintf('     %s is high water', hhmm(ST.t)));
    var pg = ffloor((dt + 30) / 60.0), lab = pg === 0 ? 'HW' : 'HW ' + wfs(pg, 0);
    wl('');
    wl('  2  Each page covers 30 minutes either side of its hour, and exactly half');
    wl(sprintf('     past goes to the later page: %s from HW is the page for %s', (dt < 0 ? '-' : '+') + dur(dt), lab));
    var strip = '     ', j, cl;
    for (j = -6; j <= 6; j++) {
      cl = j === 0 ? 'HW' : wfs(j, 0);
      strip += (j === pg) ? '[' + cl + ']' : ' ' + cl + ' ';
    }
    wl(strip);
    if (pg < -6 || pg > 6) wl("     outside the atlas's thirteen pages: the tide here is not the twice-daily kind an atlas is drawn for");
    var il = -1;
    if (dt <= 0) { for (i = ihw - 1; i >= 0; i--) if (W[i].k === 'L') { il = i; break; } }
    else { for (i = ihw + 1; i < W.length; i++) if (W[i].k === 'L') { il = i; break; } }
    wl('');
    if (il < 0) return err('no low water beside that high water to take a range from');
    var rg = W[ihw].h - W[il].h;
    wl(sprintf('  3  The range of the tide you are in: HW %s m - LW %s m (%s) = %s m', wf(W[ihw].h, 2), wf(W[il].h, 2), hhmm(W[il].m), wf(rg, 2)));
    S.res.page = pg; S.res.dt = dt; S.res.range = rg; S.res.hw = W[ihw].m; S.res.means = 0;
    S.fig = { kind: 'atlas', page: pg };
    wl('');
    var P = ST.P;
    if (P.kind === 'S') {
      wl('  4  Mean ranges are not available here: a secondary port carries no');
      wl('     constants of its own.  Its standard port is ' + P.refName + ',');
      wl('     ' + P.ref);
      S.res.refId = P.ref;
      wl('@@FIG');
      wl(sprintf('  ANSWER   atlas page %s    range %s m', lab, wf(rg, 2)));
      wl(RULE);
      return 1;
    }
    var tb = T.tablesInit(), aM2 = 0, aS2 = 0, aK1 = 0, aO1 = 0;
    for (i = 1; i <= ST.raw.n; i++) {
      if (ST.raw.c[i] === tb.idx.M2) aM2 = ST.raw.a[i];
      if (ST.raw.c[i] === tb.idx.S2) aS2 = ST.raw.a[i];
      if (ST.raw.c[i] === tb.idx.K1) aK1 = ST.raw.a[i];
      if (ST.raw.c[i] === tb.idx.O1) aO1 = ST.raw.a[i];
    }
    if (aM2 + aS2 <= 0) {
      wl('  4  Mean ranges are not available: this station has no M2 or S2.');
      wl('@@FIG');
      wl(sprintf('  ANSWER   atlas page %s    range %s m', lab, wf(rg, 2)));
      wl(RULE);
      return 1;
    }
    var ff = (aK1 + aO1) / (aM2 + aS2);
    if (ff > 0.25) {
      wl(sprintf('  4  Mean ranges are not available: the form factor (K1+O1)/(M2+S2) is %s,', wf(ff, 2)));
      wl('     so the tide here is mixed or diurnal and its springs and neaps are not');
      wl('     set by M2 and S2.  The range above is the honest number.');
      wl('@@FIG');
      wl(sprintf('  ANSWER   atlas page %s    range %s m', lab, wf(rg, 2)));
      wl(RULE);
      return 1;
    }
    var sp = 2 * (aM2 + aS2), np = 2 * (aM2 - aS2);
    wl(sprintf('  4  Mean ranges from the constants: M2 %s m, S2 %s m (form factor %s)', wf(aM2, 3), wf(aS2, 3), wf(ff, 2)));
    wl(sprintf('     springs 2 x (M2 + S2) = %s m, neaps 2 x (M2 - S2) = %s m', wf(sp, 2), wf(np, 2)));
    wl("     the Admiralty definition; an almanac's figures can differ by a");
    wl('     decimetre where shallow-water tides matter - use them if you have them');
    var f = (rg - np) / (sp - np);
    wl(sprintf("     today's range sits (%s - %s) / (%s - %s) = %s", wf(rg, 2), wf(np, 2), wf(sp, 2), wf(np, 2), wf(f, 2)));
    wl('     of the way from neaps to springs');
    var gauge = '', p = trunc(f * 20 + 0.5);
    for (j = 0; j <= 20; j++) gauge += (j === p) ? '*' : '-';
    if (p < 0) gauge = '<' + gauge.substr(1);
    if (p > 20) gauge = gauge.substr(0, 20) + '>';
    wl('     neaps |' + gauge + '| springs');
    if (f < 0) wl('     below mean neaps');
    if (f > 1) wl('     above mean springs');
    S.res.means = 1; S.res.sprange = sp; S.res.nprange = np; S.res.f = f;
    wl('@@FIG');
    wl(sprintf('  ANSWER   atlas page %s    range %s m, %s of the way from neaps to springs', lab, wf(rg, 2), wf(f, 2)));
    wl("  the rate on that page, with the atlas's two figures for spr= and nps=:");
    wl('  ' + sprintf('  tides work stream spr=.. nps=.. range=%s sprange=%s nprange=%s', wf(rg, 2), wf(sp, 2), wf(np, 2)));
    wl(RULE);
    return 1;
  }

  /* =================================================================
     5.  Course to steer
     ================================================================= */
  function cts() {
    allow('cts', 'track stw streams leeway wind var dev dist');
    var Tk = ang('track', '', 'the track you want to make good, deg true');
    var V = num('stw', '', '0', '40', 'boat speed through the water, kn');
    if (S.err !== '') return 0;
    if (V <= 0) return err('stw= must be more than 0');
    if (!has('streams')) return err('streams= is needed (set:rate for each hour, e.g. 135:1.5,150:2.0)');
    var ps = S.a.streams.split(','), ns = ps.length, i, q, ss = [], sr = [];
    if (ns < 1 || ns > 24) return err('streams= takes 1 to 24 set:rate pairs, one per hour');
    for (i = 1; i <= ns; i++) {
      q = ps[i - 1].split(':');
      if (q.length !== 2 || !isnum(q[0]) || !isnum(q[1]))
        return err('streams= pair ' + i + " '" + ps[i - 1] + "' is not set:rate");
      if (+q[0] < 0 || +q[0] > 360 || +q[1] < 0 || +q[1] > 15)
        return err('streams= pair ' + i + " '" + ps[i - 1] + "' is out of range (set 0 to 360, rate 0 to 15)");
      ss[i] = nrm360(+q[0]); sr[i] = +q[1];
    }
    var lee = num('leeway', '0', '0', '45', 'leeway, deg');
    var wd = wind(lee);
    var vr = num('var', '0', '-90', '90', 'variation, deg, east +');
    var dv = num('dev', '0', '-30', '30', 'deviation, deg, east +');
    var dist = num('dist', '0', '0', '1000', 'distance to go along the track, nm');
    if (S.err !== '') return 0;
    var n = ns;
    head('COURSE TO STEER');
    wl(sprintf('  track to make good %s T, %s kn through the water, %d %s of stream', deg(Tk), wg(V), n, n === 1 ? 'hour' : 'hours'));
    wl('');
    wl('  1  The stream, hour by hour, added up');
    var tx = 0, ty = 0, pts = [[0, 0]];
    for (i = 1; i <= n; i++) {
      tx += sr[i] * sind(ss[i]); ty += sr[i] * cosd(ss[i]);
      wl(sprintf('     hour %d   set %s T  %s kn   -> %s nm', i, deg(ss[i]), wf(sr[i], 1), wf(sr[i], 2)));
      pts.push([tx, ty]);
    }
    var set = rbrg(tx, ty), drift = Math.sqrt(tx * tx + ty * ty);
    wl(sprintf('     together the water moves %s nm toward %s T in %d h', wf(drift, 2), deg(set), n));
    var W = V * n;
    wl('');
    wl(sprintf('  2  She sails %s kn x %d h = %s nm through the water', wg(V), n, wf(W, 2)));
    var c = drift * sind(set - Tk), a = drift * cosd(set - Tk);
    wl('');
    wl(sprintf('  3  Across the track the stream sets her %s nm to %s;', wf(fabs(c), 2), c >= 0 ? 'starboard' : 'port'));
    wl(sprintf('     along it, %s nm %s', wf(fabs(a), 2), a >= 0 ? 'with her' : 'against her'));
    S.res.set = set; S.res.drift = drift; S.res.ok = 0;
    S.fig = { kind: 'cts', pts: pts, track: Tk, ok: 0, n: n };
    if (fabs(c) >= W) {
      wl('     ' + sprintf('she sails only %s nm in that time, less than the stream sets her across it', wf(W, 2)));
      wl('');
      wl('  ANSWER   cannot make good this track: the stream is faster across it than she is');
      wl(RULE);
      return 1;
    }
    var x = T.asind(c / W), H = Tk - x;
    wl(sprintf('     to cancel it, point %s: sin x = %s / %s = %s, x = %s deg',
       c >= 0 ? 'to port' : 'to starboard', wf(fabs(c), 2), wf(W, 2), wf(fabs(c) / W, 3), wf(fabs(x), 1)));
    wl(sprintf('     water track = %s %s %s = %s T', deg(Tk), x >= 0 ? '-' : '+', wf(fabs(x), 1), d1(H)));
    var MG = W * cosd(x) + a;
    wl('');
    wl(sprintf('  4  Made good along the track: %s x cos %s + (%s) = %s nm in %d h', wf(W, 2), wf(fabs(x), 1), wf(a, 2), wf(MG, 2), n));
    if (MG <= 0) {
      wl('');
      wl('  ANSWER   cannot make good this track: the stream against her is stronger than her speed along it');
      wl(RULE);
      return 1;
    }
    var sog = MG / n, hd = H;
    wl(sprintf('     speed over the ground %s kn', wf(sog, 2)));
    wl('');
    if (lee > 0) {
      if (wd === 'port') {
        hd = H - lee;
        wl(sprintf('  5  Leeway %s deg, wind on the port side: she slides to starboard,', wg(lee)));
        wl(sprintf('     so steer %s deg to port of the water track: %s - %s = %s T', wg(lee), d1(H), wg(lee), d1(hd)));
      } else {
        hd = H + lee;
        wl(sprintf('  5  Leeway %s deg, wind on the starboard side: she slides to port,', wg(lee)));
        wl(sprintf('     so steer %s deg to starboard of the water track: %s + %s = %s T', wg(lee), d1(H), wg(lee), d1(hd)));
      }
    } else wl(sprintf('  5  No leeway given: the course to steer is the water track, %s T', d1(hd)));
    wl(sprintf('     steer the whole degree: %s T', deg(hd)));
    var tr = trunc(nrm360(hd) + 0.5); if (tr >= 360) tr -= 360;
    var mg = tr - vr, cc = mg - dv;
    wl(sprintf('  6  Variation %s: %s T %s %s = %s M', ew(vr), deg(tr), vr > 0 ? '-' : '+', wg(fabs(vr)), deg(mg)));
    wl(sprintf('     deviation %s: %s M %s %s = %s C', ew(dv), deg(mg), dv > 0 ? '-' : '+', wg(fabs(dv)), deg(cc)));
    S.res.ok = 1; S.res.water = nrm360(H); S.res.cts = tr; S.res.mag = nrm360(mg); S.res.comp = nrm360(cc);
    S.res.sog = sog; S.res.mg = MG;
    S.fig.ok = 1; S.fig.end = [tx + W * sind(H), ty + W * cosd(H)];
    var ans = sprintf('  ANSWER   steer %s T  %s M  %s C    SOG %s kn', deg(tr), deg(mg), deg(cc), wf(sog, 1));
    if (dist > 0) {
      var tm = dist / sog * 60;
      wl(sprintf('  7  %s nm at %s kn takes %s', wg(dist), wf(sog, 2), dur(tm)));
      if (dist > MG + 0.05) wl('     ' + sprintf('longer than the %d h the streams cover: this assumes the same', n));
      if (dist > MG + 0.05) wl('     stream carries on');
      S.res.time = tm;
      ans += sprintf('    %s for %s nm', dur(tm), wg(dist));
    }
    wl('@@FIG');
    wl(ans);
    wl(RULE);
    return 1;
  }

  /* =================================================================
     6.  Set and drift, from a DR and a fix
     ================================================================= */
  function dlon(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
  function setdrift() {
    allow('setdrift', 'start co stw hours fix leeway wind');
    pos('start', 'the position the DR runs from'); var la1 = WP.lat, lo1 = WP.lon;
    var co = ang('co', '', 'the course steered, deg true');
    var V = num('stw', '', '0', '40', 'speed through the water, kn');
    var hrs = num('hours', '', '0', '24', 'time run, hours');
    pos('fix', 'the fix at the end of the run'); var fla = WP.lat, flo = WP.lon;
    var lee = num('leeway', '0', '0', '45', 'leeway, deg');
    var wd = wind(lee);
    if (S.err !== '') return 0;
    if (hrs <= 0) return err('hours= must be more than 0');
    if (fabs(la1) > 80 || fabs(fla) > 80) return err('plane sailing is no good this close to a pole (latitude beyond 80)');
    head('SET AND DRIFT, FROM A DR AND A FIX');
    wl(sprintf('  from %s %s, steering %s T at %s kn for %s h', latf(la1), lonf(lo1), deg(co), wg(V), wg(hrs)));
    wl('  plane sailing at the mean latitude: right for coastal distances');
    wl('');
    var wt = co;
    if (lee > 0 && wd === 'port') {
      wt = co + lee;
      wl(sprintf('  1  Leeway %s deg with the wind to port pushes her to starboard:', wg(lee)));
      wl(sprintf('     water track %s + %s = %s T', deg(co), wg(lee), deg(wt)));
    } else if (lee > 0) {
      wt = co - lee;
      wl(sprintf('  1  Leeway %s deg with the wind to starboard pushes her to port:', wg(lee)));
      wl(sprintf('     water track %s - %s = %s T', deg(co), wg(lee), deg(wt)));
    } else {
      wl(sprintf('  1  No leeway given, so the water track is the course, %s T', deg(wt)));
      wl('     the set and drift found below then includes any leeway as well');
    }
    var d = V * hrs, dn = d * cosd(wt), de = d * sind(wt);
    var la2 = la1 + dn / 60.0, ml = (la1 + la2) / 2, dlo = de / (60.0 * cosd(ml));
    var lo2 = lo1 + dlo; if (lo2 > 180) lo2 -= 360; if (lo2 < -180) lo2 += 360;
    wl('');
    wl(sprintf('  2  The DR: %s kn x %s h = %s nm on %s T', wg(V), wg(hrs), wf(d, 2), deg(wt)));
    wl(sprintf('     d.lat = %s x cos %s = %s nm;  departure = %s x sin %s = %s nm', wf(d, 2), deg(wt), wf(dn, 2), wf(d, 2), deg(wt), wf(de, 2)));
    wl(sprintf("     d.long = departure / cos(mean lat %s) = %s'", wf(ml, 2), wf(dlo * 60, 2)));
    wl(sprintf('     DR %s %s', latf(la2), lonf(lo2)));
    var fn = (fla - la2) * 60.0, ml2 = (fla + la2) / 2, fe = dlon(flo - lo2) * 60.0 * cosd(ml2);
    wl('');
    wl(sprintf('  3  DR to the fix %s %s:', latf(fla), lonf(flo)));
    wl(sprintf("     d.lat %s nm;  d.long %s' x cos %s = departure %s nm", wfs(fn, 2), wfs(dlon(flo - lo2) * 60, 2), wf(ml2, 2), wfs(fe, 2)));
    var set = rbrg(fe, fn), drift = Math.sqrt(fn * fn + fe * fe), rate = drift / hrs;
    S.res.drlat = la2; S.res.drlon = lo2; S.res.drift = drift; S.res.rate = rate; S.res.set = set;
    S.fig = { kind: 'setdrift', S: [0, 0], D: [de, dn], F: [de + fe, dn + fn] };
    wl('');
    if (drift < 0.05) {
      wl('  4  The fix is on the DR: no set and drift to speak of');
      S.res.set = 0;
      wl('@@FIG');
      wl(sprintf('  ANSWER   no measurable set:  drift %s nm in %s h', wf(drift, 2), wg(hrs)));
      wl(RULE);
      return 1;
    }
    wl(sprintf('  4  set = the direction of that vector = %s T', deg(set)));
    wl(sprintf('     drift = %s nm in %s h, so the rate is %s kn', wf(drift, 2), wg(hrs), wf(rate, 2)));
    wl('@@FIG');
    wl(sprintf('  ANSWER   set %s T    drift %s nm in %s h    rate %s kn', deg(set), wf(drift, 1), wg(hrs), wf(rate, 1)));
    wl(RULE);
    return 1;
  }

  /* =================================================================
     The entry point, the twin of wk_run().

       params  [[key, value], ...] in the order given (a URL's order)
       ctx     { defStation, nowdate 'YYYY-MM-DD' UT, nowtime 'HH:MM' UT,
                 load(id) -> { st, ref } or { err } }
     ================================================================= */
  function run(name, params, ctx) {
    S = { err: '', lines: [], res: {}, fig: null, a: {}, keys: [], ctx: ctx || {} };
    ST = null;
    var ok = 0;
    if (parse(params)) {
      if (name === 'twelfths') ok = twelfths();
      else if (name === 'secondary') ok = secondary();
      else if (name === 'stream') ok = stream();
      else if (name === 'atlas') ok = atlas();
      else if (name === 'cts') ok = cts();
      else if (name === 'setdrift') ok = setdrift();
      else err("there is no calculator called '" + name + "' (twelfths secondary stream atlas cts setdrift)");
    }
    if (S.err !== '') return { ok: false, err: S.err, msg: '  work ' + name + ': ' + S.err, lines: [], res: S.res, fig: null };
    return { ok: !!ok, err: '', lines: S.lines, res: S.res, fig: S.fig };
  }
  /* =================================================================
     The parameters each calculator takes, for the page's form.  The
     order is the order a navigator meets them.  WORK.md documents the
     same list, with units and defaults.
     ================================================================= */
  var SPEC = {
    twelfths: { title: 'Rule of twelfths', sub: 'height at a time, three ways', fields: [
      ['lw', 'LW time', 'HH:MM'], ['lwh', 'LW height, m'], ['hw', 'HW time', 'HH:MM'], ['hwh', 'HW height, m'],
      ['t', 'Time wanted', 'HH:MM'], ['station', 'or a station id'], ['date', 'with a date', 'YYYY-MM-DD']] },
    secondary: { title: 'Secondary port', sub: 'HW and LW from a standard port', fields: [
      ['hw', 'Std port HW', 'HH:MM'], ['hwh', 'HW height, m'], ['mhws', 'MHWS, m'], ['mhwn', 'MHWN, m'],
      ['dhws', 'Diff at MHWS, m'], ['dhwn', 'Diff at MHWN, m'],
      ['thw1', 'HW time 1', 'HHMM'], ['tdhw1', 'Diff there, min'], ['thw2', 'HW time 2', 'HHMM'], ['tdhw2', 'Diff there, min'],
      ['lw', 'Std port LW', 'HH:MM'], ['lwh', 'LW height, m'], ['mlwn', 'MLWN, m'], ['mlws', 'MLWS, m'],
      ['dlwn', 'Diff at MLWN, m'], ['dlws', 'Diff at MLWS, m'],
      ['tlw1', 'LW time 1', 'HHMM'], ['tdlw1', 'Diff there, min'], ['tlw2', 'LW time 2', 'HHMM'], ['tdlw2', 'Diff there, min']] },
    stream: { title: 'Stream rate', sub: 'between neaps and springs', fields: [
      ['spr', 'Spring rate, kn'], ['nps', 'Neap rate, kn'], ['range', "Today's range, m"],
      ['sprange', 'Mean spring range, m'], ['nprange', 'Mean neap range, m']] },
    atlas: { title: 'Which atlas page', sub: 'hours from high water', fields: [
      ['station', 'Station id'], ['date', 'Date', 'YYYY-MM-DD'], ['t', 'Time', 'HH:MM']] },
    cts: { title: 'Course to steer', sub: 'across the stream', fields: [
      ['track', 'Track, deg T'], ['stw', 'Speed through water, kn'], ['streams', 'Streams, set:rate per hour'],
      ['leeway', 'Leeway, deg'], ['wind', 'Wind side', 'port or stbd'], ['var', 'Variation, deg (E +)'],
      ['dev', 'Deviation, deg (E +)'], ['dist', 'Distance, nm']] },
    setdrift: { title: 'Set and drift', sub: 'from a DR and a fix', fields: [
      ['start', 'Start, lat,lon'], ['co', 'Course steered, deg T'], ['stw', 'Speed through water, kn'],
      ['hours', 'Hours run'], ['fix', 'Fix, lat,lon'], ['leeway', 'Leeway, deg'], ['wind', 'Wind side', 'port or stbd']] }
  };
  /*  The same six examples `tides work help` prints. */
  var EXAMPLES = {
    twelfths: 'lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 t=08:30',
    secondary: 'hw=05:36 hwh=6.4 mhws=6.8 mhwn=5.3 dhws=-0.4 dhwn=-0.3 thw1=0000 tdhw1=-10 thw2=0600 tdhw2=5 lw=11:51 lwh=1.1 mlwn=2.1 mlws=0.8 dlwn=0.0 dlws=0.1 tlw1=0100 tdlw1=-5 tlw2=0700 tdlw2=10',
    stream: 'spr=2.6 nps=1.4 range=4.1 sprange=5.9 nprange=3.1',
    atlas: 'station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00',
    cts: 'track=045 stw=6 streams=135:1.5,150:2.0 leeway=5 wind=port var=-2 dev=1 dist=12',
    setdrift: 'start=50.10,-1.50 co=090 stw=6 hours=3 fix=50.05,-1.20'
  };

  /*  A LESSON NAME, AND THE PAGE IT IS ON.  Larry's decision of
      11 November 2026, relayed by practical-navigator: a lesson is named
      by its level, its race year where it has one, and its number.

          l1-3        Level 1, lesson 3.  Level 1 is shared by both race
                      years, so it carries no year.
          l3-2025-4   Level 3, 2025, lesson 4.  Levels 2 to 5 run one
                      track per race year, so the year is part of the name.

      ?lesson=l3-2025-4 -> COURSE_BASE + 'l3-2025.html#l3-2025-4'
      ?lesson=l1-3      -> COURSE_BASE + 'l1.html#l1-3'

      THE PAGE IS DERIVED FROM THE NAME, not held as a second rule: it is
      the name with its trailing lesson number removed, which is exactly
      the track - a level, or a level and its year.  There is no table of
      pages to drift out of step with the names (README rule 8).

      The check runs BEFORE a link is built, so nothing from the URL
      reaches an href unless it is exactly a lesson name.  It is stricter
      than the pattern practical-navigator proposed, in three ways, each
      so that a lesson has exactly ONE name - which is their own reason
      for putting the year in the name at all:

        1. a year is REFUSED for Level 1 (l1-2025-3) and REQUIRED for
           Levels 2 to 5 (l3-4), so one lesson cannot have two names;
        2. the lesson number carries no leading zero (l1-03) and is not
           zero (l1-0), for the same reason;
        3. the year is four digits beginning 20 (l3-25-4 is refused).

      Refused with it: every old-style name (a6-2, c9-14), so a stale link
      in a page that was not updated fails visibly instead of pointing at
      a lesson that no longer exists under that name. */
  var LESSON = /^(l1-[1-9][0-9]*|l[2-5]-20[0-9]{2}-[1-9][0-9]*)$/;
  function lessonHref(lesson) {
    if (typeof lesson !== 'string' || !LESSON.test(lesson)) return null;
    return COURSE_BASE + lesson.replace(/-[1-9][0-9]*$/, '') + '.html#' + lesson;
  }
  /*  The URL's parameters, in order, values trimmed: a '+' in a query
      string is a SPACE, so tdhw2=+5 arrives as ' 5' -- WORK.md says to
      write 5 or %2B5, and trimming makes the space harmless. */
  function fromQuery(search) {
    var out = [], q = new URLSearchParams(search || '');
    q.forEach(function (v, k) { out.push([k, v.replace(/^\s+|\s+$/g, '')]); });
    return out;
  }

  /* =================================================================
     The figures, as SVG.  The page styles them with its own custom
     properties, so they follow dark and night modes.  Every point that
     matters carries data-pt, so a check can read the drawing back.
     ================================================================= */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function n2(v) { return (Math.round(v * 100) / 100).toString(); }
  function svgOpen(w, h, label) {
    return '<svg class="wfig" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) +
           '" xmlns="http://www.w3.org/2000/svg">';
  }
  function poly(pts, cls) {
    return '<polyline class="' + cls + '" fill="none" points="' +
      pts.map(function (p) { return n2(p[0]) + ',' + n2(p[1]); }).join(' ') + '"/>';
  }
  function text(x, y, s, cls, anchor) {
    return '<text x="' + n2(x) + '" y="' + n2(y) + '" class="' + (cls || 'lab') + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>';
  }
  function dot(x, y, name, cls) {
    return '<circle class="' + (cls || 'pt') + '" data-pt="' + name + '" cx="' + n2(x) + '" cy="' + n2(y) + '" r="4"/>';
  }
  //  n chevrons at the middle of a segment: one for the water track,
  //  two for the ground track, three for the stream, as on a chart
  function chevrons(a, b, n, cls) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return '';
    var ux = dx / L, uy = dy / L, s = '', k, cx, cy, sz = 7;
    for (k = 0; k < n; k++) {
      cx = a[0] + dx * 0.55 + ux * (k - (n - 1) / 2) * 8;
      cy = a[1] + dy * 0.55 + uy * (k - (n - 1) / 2) * 8;
      s += '<polyline class="' + cls + '" fill="none" points="' +
        n2(cx - ux * sz - uy * sz * 0.6) + ',' + n2(cy - uy * sz + ux * sz * 0.6) + ' ' +
        n2(cx) + ',' + n2(cy) + ' ' +
        n2(cx - ux * sz + uy * sz * 0.6) + ',' + n2(cy - uy * sz - ux * sz * 0.6) + '"/>';
    }
    return s;
  }
  //  fit nautical-mile points into a box at ONE scale both ways, north up
  function fitter(pts, w, h, m) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    if (x1 - x0 < 1e-6) { x0 -= 0.5; x1 += 0.5; }
    if (y1 - y0 < 1e-6) { y0 -= 0.5; y1 += 0.5; }
    var s = Math.min((w - 2 * m) / (x1 - x0), (h - 2 * m) / (y1 - y0));
    var cx = w / 2 - (x0 + x1) / 2 * s, cy = h / 2 + (y0 + y1) / 2 * s;
    var f = function (p) { return [cx + p[0] * s, cy - p[1] * s]; };
    f.scale = s;
    return f;
  }
  function figure(r) {
    var F = r && r.fig;
    if (!F) return '';
    var W = 640, H, s = '', i, P;
    if (F.kind === 'twelfths') {
      H = 300;
      var m = { l: 46, r: 14, t: 16, b: 34 }, lo = Math.min(F.h1, F.h2), hi = Math.max(F.h1, F.h2), N = 120;
      var harm = [];
      if (F.harm) for (i = 0; i <= N; i++) harm.push(F.harm(F.t1 + (F.t2 - F.t1) * i / N));
      harm.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
      if (hi - lo < 0.2) { hi += 0.1; lo -= 0.1; }
      var X = function (t) { return m.l + (t - F.t1) / (F.t2 - F.t1) * (W - m.l - m.r); };
      var Y = function (v) { return m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b); };
      s = svgOpen(W, H, 'The rule of twelfths, the cosine curve' + (F.harm ? ' and the harmonic prediction' : '') + ' between the two turns');
      s += '<line class="axis" x1="' + m.l + '" y1="' + (H - m.b) + '" x2="' + (W - m.r) + '" y2="' + (H - m.b) + '"/>';
      for (i = 0; i <= 6; i++) {
        var xt = X(F.t1 + (F.t2 - F.t1) * i / 6);
        s += '<line class="grid" x1="' + n2(xt) + '" y1="' + m.t + '" x2="' + n2(xt) + '" y2="' + (H - m.b) + '"/>';
        s += text(xt, H - m.b + 16, i === 0 ? kname(F.k1) : i === 6 ? kname(F.k2) : String(i), 'lab', 'middle');
      }
      s += text(m.l - 6, Y(hi) + 4, wf(hi, 1) + ' m', 'lab', 'end');
      s += text(m.l - 6, Y(lo) + 4, wf(lo, 1) + ' m', 'lab', 'end');
      var pc = [], pt = [];
      for (i = 0; i <= N; i++) {
        var tt = F.t1 + (F.t2 - F.t1) * i / N;
        pc.push([X(tt), Y(cosineAt(F, tt))]); pt.push([X(tt), Y(twelfthsAt(F, tt))]);
      }
      if (harm.length) s += poly(harm.map(function (v, k) { return [X(F.t1 + (F.t2 - F.t1) * k / N), Y(v)]; }), 'c-harm');
      s += poly(pc, 'c-cos') + poly(pt, 'c-12');
      s += '<line class="now" x1="' + n2(X(F.t)) + '" y1="' + m.t + '" x2="' + n2(X(F.t)) + '" y2="' + (H - m.b) + '"/>';
      s += dot(X(F.t), Y(F.h12), 'twelfths', 'pt acc');
      s += dot(X(F.t), Y(F.hc), 'cosine', 'pt');
      if (F.harm) s += dot(X(F.t), Y(F.hv), 'harmonic', 'pt hv');
      s += '</svg>';
      s += '<p class="wkey"><span class="k12">twelfths</span> <span class="kcos">cosine</span>' +
        (F.harm ? ' <span class="kharm">harmonic</span>' : '') + ' <span class="know">the time asked</span></p>';
      return s;
    }
    if (F.kind === 'stream') {
      H = 260;
      var mm = { l: 46, r: 14, t: 16, b: 34 };
      var x0 = Math.min(F.np, F.rg), x1 = Math.max(F.sp, F.rg), rr = (x1 - x0) * 0.1; x0 -= rr; x1 += rr; if (x0 < 0) x0 = 0;
      var y1 = Math.max(F.spr, F.nps, F.rate) * 1.15 + 0.1;
      var SX = function (v) { return mm.l + (v - x0) / (x1 - x0) * (W - mm.l - mm.r); };
      var SY = function (v) { return mm.t + (1 - v / y1) * (H - mm.t - mm.b); };
      var line = function (v) { return F.nps + (v - F.np) / (F.sp - F.np) * (F.spr - F.nps); };
      s = svgOpen(W, H, 'Rate against range: the straight line through the neap and spring rates');
      s += '<line class="axis" x1="' + mm.l + '" y1="' + (H - mm.b) + '" x2="' + (W - mm.r) + '" y2="' + (H - mm.b) + '"/>';
      s += '<line class="axis" x1="' + mm.l + '" y1="' + mm.t + '" x2="' + mm.l + '" y2="' + (H - mm.b) + '"/>';
      var seg = [];
      for (i = 0; i <= 60; i++) { var xv = x0 + (x1 - x0) * i / 60, yv = line(xv); if (yv >= 0) seg.push([SX(xv), SY(yv)]); }
      s += poly(seg, 'c-cos');
      s += '<line class="c-12" x1="' + n2(SX(F.np)) + '" y1="' + n2(SY(F.nps)) + '" x2="' + n2(SX(F.sp)) + '" y2="' + n2(SY(F.spr)) + '"/>';
      s += '<line class="now" x1="' + n2(SX(F.rg)) + '" y1="' + mm.t + '" x2="' + n2(SX(F.rg)) + '" y2="' + (H - mm.b) + '"/>';
      s += dot(SX(F.np), SY(F.nps), 'neaps') + text(SX(F.np), SY(F.nps) - 9, 'N ' + wf(F.nps, 1), 'lab', 'middle');
      s += dot(SX(F.sp), SY(F.spr), 'springs') + text(SX(F.sp), SY(F.spr) - 9, 'S ' + wf(F.spr, 1), 'lab', 'middle');
      s += dot(SX(F.rg), SY(F.rate), 'today', 'pt acc') + text(SX(F.rg) + 8, SY(F.rate) + 16, wf(F.rate, 2) + ' kn', 'lab acc');
      s += text(W - mm.r, H - 8, 'range at the reference port, m', 'lab', 'end');
      s += text(SX(x0), H - mm.b + 16, wf(x0, 1), 'lab', 'middle') + text(SX(x1), H - mm.b + 16, wf(x1, 1), 'lab', 'end');
      s += '</svg>';
      return s;
    }
    if (F.kind === 'cts' && F.ok) {
      H = 380;
      P = F.pts.concat([F.end]);
      var fit = fitter(P, W, H, 40), q = P.map(fit), k = F.pts.length - 1, e = q[q.length - 1];
      s = svgOpen(W, H, 'The course-to-steer triangle: the stream from the start, the water track from its end, the ground track along the intended track');
      s += '<line class="c-12" x1="' + n2(q[0][0]) + '" y1="' + n2(q[0][1]) + '" x2="' + n2(e[0]) + '" y2="' + n2(e[1]) + '"/>';
      s += chevrons(q[0], e, 2, 'c-12');
      for (i = 0; i < k; i++) {
        s += '<line class="c-tide" x1="' + n2(q[i][0]) + '" y1="' + n2(q[i][1]) + '" x2="' + n2(q[i + 1][0]) + '" y2="' + n2(q[i + 1][1]) + '"/>';
        s += chevrons(q[i], q[i + 1], 3, 'c-tide');
      }
      s += '<line class="c-water" x1="' + n2(q[k][0]) + '" y1="' + n2(q[k][1]) + '" x2="' + n2(e[0]) + '" y2="' + n2(e[1]) + '"/>';
      s += chevrons(q[k], e, 1, 'c-water');
      s += dot(q[0][0], q[0][1], 'start') + text(q[0][0] - 8, q[0][1] - 8, 'S', 'lab', 'end');
      s += dot(q[k][0], q[k][1], 'tide') + text(q[k][0] + 8, q[k][1] + 14, 'T', 'lab');
      s += dot(e[0], e[1], 'end', 'pt acc') + text(e[0] + 8, e[1] - 8, 'E', 'lab acc');
      s += text(W - 10, 20, 'N ↑', 'lab', 'end');
      s += '</svg><p class="wkey"><span class="k12">ground track, two arrows</span> <span class="kwater">water track, one</span> <span class="ktide">stream, three</span></p>';
      return s;
    }
    if (F.kind === 'setdrift') {
      H = 340;
      var fs2 = fitter([F.S, F.D, F.F], W, H, 40), a = fs2(F.S), d = fs2(F.D), f2 = fs2(F.F);
      s = svgOpen(W, H, 'Set and drift: the DR run from the start, and the vector from the DR to the fix');
      s += '<line class="c-12" x1="' + n2(a[0]) + '" y1="' + n2(a[1]) + '" x2="' + n2(f2[0]) + '" y2="' + n2(f2[1]) + '"/>' + chevrons(a, f2, 2, 'c-12');
      s += '<line class="c-water" x1="' + n2(a[0]) + '" y1="' + n2(a[1]) + '" x2="' + n2(d[0]) + '" y2="' + n2(d[1]) + '"/>' + chevrons(a, d, 1, 'c-water');
      s += '<line class="c-tide" x1="' + n2(d[0]) + '" y1="' + n2(d[1]) + '" x2="' + n2(f2[0]) + '" y2="' + n2(f2[1]) + '"/>' + chevrons(d, f2, 3, 'c-tide');
      s += dot(a[0], a[1], 'start') + text(a[0] - 8, a[1] - 8, 'start', 'lab', 'end');
      s += dot(d[0], d[1], 'dr') + text(d[0] + 8, d[1] - 8, 'DR', 'lab');
      s += dot(f2[0], f2[1], 'fix', 'pt acc') + text(f2[0] + 8, f2[1] + 16, 'fix', 'lab acc');
      s += text(W - 10, 20, 'N ↑', 'lab', 'end');
      s += '</svg><p class="wkey"><span class="kwater">DR, through the water</span> <span class="ktide">set and drift</span> <span class="k12">made good</span></p>';
      return s;
    }
    return '';
  }

  return {
    NAMES: NAMES, SPEC: SPEC, EXAMPLES: EXAMPLES, run: run, figure: figure,
    lessonHref: lessonHref, fromQuery: fromQuery, stationId: stationId, useTide: useTide,
    fx: fx, sprintf: sprintf
  };
})();

if (typeof module !== 'undefined') module.exports = { WORK: WORK, COURSE_BASE: COURSE_BASE };

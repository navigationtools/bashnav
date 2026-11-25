// =====================================================================
//  weather -- the reasoning.  A port of src/weather/wx.awk.
//
//  EVERY RULE SHOWS ITS WORKING.  A forecast handed over without its
//  reasoning teaches nothing; the explanation is the product.  So the
//  report is not a verdict with a paragraph attached -- each rule emits
//  what it concluded and, separately, why, and the page shows both.
//
//  And it can only ever be as good as the log behind it.  With no
//  network there is no model, no GRIB and no chart.  What there is, is
//  the one category of weather data that is never wrong: observations
//  the user made.
//
//  The report is emitted as STRUCTURED ITEMS, and the terminal text is
//  rendered from them.  That is what lets the browser build be diffed
//  against `weather what` line for line while still being a web page
//  rather than a dump of one.
// =====================================================================
'use strict';

var WX = (function () {

  var NONE = -9999;
  function num(s) { if (s === '' || s === '-' || s === '/' || s === undefined) return NONE; return +s || (s === '0' || +s === 0 ? 0 : NONE); }
  function has(x) { return x > -9000; }

  //  Angle difference on the circle.  350 against 010 is 20 degrees, not
  //  340, and getting this wrong would misreport every veer near north.
  function d180(a) { while (a > 180) a -= 360; while (a < -180) a += 360; return a; }

  //  Minutes between two of our timestamps.  Days from a civil date, so
  //  month ends and leap years come out right without a date library.
  function mins(ts) {
    var y = +ts.substr(0, 4), mo = +ts.substr(5, 2), d = +ts.substr(8, 2);
    var h = +ts.substr(11, 2), mi = +ts.substr(14, 2);
    var a = Math.trunc((14 - mo) / 12), y2 = y + 4800 - a, m2 = mo + 12 * a - 3;
    var jd = d + Math.trunc((153 * m2 + 2) / 5) + 365 * y2 + Math.trunc(y2 / 4)
             - Math.trunc(y2 / 100) + Math.trunc(y2 / 400) - 32045;
    return jd * 1440 + h * 60 + mi;
  }

  // ---------------------------------------------------------------
  //  The observation history: the nav and wx records, oldest first.
  //  A nav entry and the wx entry taken with it share a timestamp and
  //  are ONE observation, so they are merged -- and only with the
  //  immediately preceding one, exactly as the awk does, which is why
  //  records of other types are skipped before the merge test and not
  //  after.
  // ---------------------------------------------------------------
  //
  //  THE LATITUDE IS CARRIED (weather 1.0.5).  Only a deck entry has a
  //  position; a weather observation taken on its own has none, and an
  //  empty latitude used to be read as the equator and as north, so the
  //  daily tide was taken off at its full tropical size wherever the boat
  //  was.  A reading without a position now takes the last one logged
  //  before it, and readings before the first position take that first
  //  one.  With no latitude anywhere it stays empty and the rules say the
  //  tide is not allowed for.  Exactly as wx_load in the awk.
  function load(recs) {
    var W = [], i, r, o, lastlat = '', firstlat = '';
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.type !== 'nav' && r.type !== 'wx') continue;
      if (W.length && W[W.length - 1].ts === r.ts) {
        o = W[W.length - 1];
      } else {
        o = { ts: r.ts, wdir: NONE, wspd: NONE, p: NONE, tend: '',
              air: NONE, dew: NONE, sea: NONE, cld: NONE,
              swp: NONE, swd: NONE, lat: lastlat,
              sst: NONE, swh: NONE,
              cl: -1, cm: -1, ch: -1, vis: -1 };
        W.push(o);
      }
      var v = r.v;
      if (v.wdir !== undefined && v.wdir !== '') o.wdir = num(v.wdir);
      if (v.wspd !== undefined && v.wspd !== '') o.wspd = num(v.wspd);
      if (v.mslp !== undefined && v.mslp !== '') o.p = num(v.mslp);
      if (v.ptend !== undefined && v.ptend !== '' && v.ptend !== '-') o.tend = v.ptend;
      if (v.airt !== undefined && v.airt !== '') o.air = num(v.airt);
      if (v.dewp !== undefined && v.dewp !== '') o.dew = num(v.dewp);
      if (v.seat !== undefined && v.seat !== '') o.sea = num(v.seat);
      if (v.cloud !== undefined && v.cloud !== '') o.cld = num(v.cloud);
      if (v.swper !== undefined && v.swper !== '') o.swp = num(v.swper);
      if (v.swdir !== undefined && v.swdir !== '') o.swd = num(v.swdir);
      //  the sea state as logged (the Douglas code, 0 to 9) and the swell's
      //  height.  o.sea above is the sea TEMPERATURE, which took the name
      //  first; the state of the sea is o.sst.  As wx_load in the awk.
      if (v.sea !== undefined && /^[0-9]$/.test(v.sea)) o.sst = +v.sea;
      if (v.swht !== undefined && v.swht !== '') o.swh = num(v.swht);
      if (v.cl !== undefined && v.cl !== '' && v.cl !== '-' && v.cl !== '/') o.cl = +v.cl;
      if (v.cm !== undefined && v.cm !== '' && v.cm !== '-' && v.cm !== '/') o.cm = +v.cm;
      if (v.ch !== undefined && v.ch !== '' && v.ch !== '-' && v.ch !== '/') o.ch = +v.ch;
      if (v.vis !== undefined && v.vis !== '' && v.vis !== '-' && v.vis !== '/') o.vis = +v.vis;
      if (v.lat !== undefined && v.lat !== '') {
        o.lat = v.lat; lastlat = v.lat; if (firstlat === '') firstlat = v.lat;
      }
    }
    for (i = 0; i < W.length && W[i].lat === ''; i++) W[i].lat = firstlat;
    return W;
  }

  //  Northern or southern, from a latitude written as "41 14.0N" or "-33.9"
  function north(s) {
    if (s === '' || s === undefined) return true;
    if (/[Ss]$/.test(s)) return false;
    if (s.charAt(0) === '-') return false;
    return true;
  }
  function latdeg(s) { var x = parseFloat(s) || 0; return x < 0 ? -x : x; }

  // ---------------------------------------------------------------
  //  The atmospheric tide.
  //
  //  Solar heating drives a wave that travels westward with the sun,
  //  and it is on every barometer.  In the tropics the glass falls two
  //  to three millibars between mid-morning and mid-afternoon EVERY DAY
  //  IN PERFECT WEATHER, and a sailor who does not know that reads a
  //  routine afternoon fall as a system approaching.
  //
  //  Dominantly SEMIdiurnal -- twice a day, not once.  Maxima near 1000
  //  and 2200 local, minima near 0400 and 1600.  About 1.4 hPa in the
  //  tropics, falling steeply with latitude.
  //
  //  So the correction is applied BEFORE anything is said about
  //  tendency, and it is said out loud.
  // ---------------------------------------------------------------
  var PI = 3.14159265;
  function tide(ts, lon, lat) {
    var utch = +ts.substr(11, 2) + (+ts.substr(14, 2)) / 60.0;
    var solar = utch + (parseFloat(lon) || 0) / 15.0;
    while (solar < 0) solar += 24;
    while (solar >= 24) solar -= 24;
    var la = latdeg(lat);
    var amp = 1.4 * Math.pow(Math.cos(la * PI / 180.0), 3);
    if (amp < 0) amp = -amp;
    return amp * Math.cos(2 * PI * (solar - 10.0) / 12.0);
  }

  //  The tide can be allowed for only when we know where the sun is (the
  //  longitude) and how big the tide is here (the latitude of both).
  function tideok(lon, lat1, lat2) {
    return lon !== '' && lon !== undefined && lon !== null && lat1 !== '' && lat2 !== '';
  }

  // ---------------------------------------------------------------
  //  The tendency, in the four words the barograph uses.  ONE RULE, for
  //  the report's sentence, the table of the glass and the barograph:
  //  the change per three hours, the daily tide allowed for where it can
  //  be.  3.6 or more down, falling fast; 1.6 or more down, falling; 1.6
  //  or more up, rising; otherwise steady.  As wx_band in the awk.  These
  //  are the Met Office's bands ("Pressure tendency in station reports":
  //  slowly 0.1-1.5, plain 1.6-3.5, quickly 3.6-6.0, very rapidly over
  //  6.0), the watch's too; weather 1.0.13, Larry TAVL.  Were 1.5 and 3.0.
  // ---------------------------------------------------------------
  //  The word follows the figure printed: the rate is graded as the table
  //  prints it, c/d*3 to a tenth by C's printf (cfixed), as wx_band does,
  //  so "+1.6 hPa in 3 h" is never shown beside "steady".
  function band(corr, dt) {
    if (dt <= 0) return 'steady';
    var r = +cfixed(corr / dt * 3.0, 1);
    if (r <= -3.6) return 'falling fast';
    if (r <= -1.6) return 'falling';
    if (r >= 1.6) return 'rising';
    return 'steady';
  }

  // ---------------------------------------------------------------
  //  THE GLASS (W04; weather 1.0.5; Larry, AOI and AOQ).  The pressures
  //  of the last 24, 48 or 72 hours of the log, ending at the latest
  //  one.  glass() is wx_glass_build in the awk: for each reading in the
  //  window its time, its change from the one before with the tide
  //  allowed for, the hours between and the tendency word; whether the
  //  tide could be allowed for; and its size here.  runs() merges
  //  neighbouring stretches of the same tendency, which is what the
  //  terminal's table and the page's strip both show.
  // ---------------------------------------------------------------
  var MON = 'JanFebMarAprMayJunJulAugSepOctNovDec';
  function day(ts) { return String(+ts.substr(8, 2)) + ' ' + MON.substr(3 * (+ts.substr(5, 2)) - 3, 3); }
  function glass(W, lon, hours) {
    var G = { n: 0, at: [], m: [], c: [], d: [], b: [], tide: false, amp: 0, e: -1, hours: hours };
    var e, i, t1, m, dp;
    for (e = W.length - 1; e >= 0; e--) if (has(W[e].p)) break;
    if (e < 0) return G;
    G.e = e;
    t1 = mins(W[e].ts) - hours * 60;
    for (i = 0; i <= e; i++) {
      if (!has(W[i].p)) continue;
      m = mins(W[i].ts); if (m < t1) continue;
      G.at.push(i); G.m.push(m); G.n++;
    }
    G.tide = tideok(lon, W[e].lat, W[e].lat);
    if (G.tide) { G.amp = 1.4 * Math.pow(Math.cos(latdeg(W[e].lat) * 3.14159265 / 180.0), 3); if (G.amp < 0) G.amp = -G.amp; }
    G.c.push(0); G.d.push(0); G.b.push('');
    for (i = 1; i < G.n; i++) {
      var a = W[G.at[i - 1]], z = W[G.at[i]];
      G.d.push((G.m[i] - G.m[i - 1]) / 60.0);
      dp = z.p - a.p;
      if (G.tide) dp = dp - (tide(z.ts, lon, z.lat) - tide(a.ts, lon, a.lat));
      G.c.push(dp);
      G.b.push(band(dp, G.d[i]));
    }
    return G;
  }
  //  the runs: [{ from, to, band, rate }], from and to indexing G.at
  function runs(G) {
    var R = [], i = 1, j, c, d;
    while (i < G.n) {
      j = i; c = G.c[i]; d = G.d[i];
      while (j + 1 < G.n && G.b[j + 1] === G.b[i]) { j++; c += G.c[j]; d += G.d[j]; }
      R.push({ from: i - 1, to: j, band: G.b[i], rate: d > 0 ? c / d * 3 : 0 });
      i = j + 1;
    }
    return R;
  }
  function padr(t, n) { t = String(t); while (t.length < n) t += ' '; return t; }
  function padl(t, n) { t = String(t); while (t.length < n) t = ' ' + t; return t; }

  // ---------------------------------------------------------------
  //  THE SEA AGAINST THE WIND (W09; weather 1.0.7; Larry, 17 November
  //  2026: AOU, AOZ, APC, APF).  A port of the same block in wx.awk,
  //  where the reasoning and the sources are set out in full:
  //
  //    the curve   the Beaufort scale's probable wave height (the Met
  //                Office's table), force mean wind against height,
  //                joined by straight lines
  //    the states  the WMO's code 3700 (the Douglas scale)
  //    the steps   the winds at which the curve reaches each state's
  //                height: 1, 2, 8, 14.5, 21.5, 30, 39 1/3, 52, 64 kt,
  //                written out and held to the curve by a test
  //    close       in the top pct percent of its step, in knots, upward
  //    full        Pierson and Moskowitz, 0.22 U^2 / g (Stewart, 16.4)
  //
  //  Every expression is written in the awk's own order, so the two
  //  builds land on the same side of every edge.
  // ---------------------------------------------------------------
  var SEA_K = [0, 2, 5, 9, 13, 19, 24, 30, 37, 44, 52, 60, 64];
  var SEA_H = [0, 0.1, 0.2, 0.6, 1.0, 2.0, 3.0, 4.0, 5.5, 7.0, 9.0, 11.5, 14.0];
  var SEA_E = [0, 1, 2, 8, 14.5, 21.5, 30, 118 / 3, 52, 64];      // SEA_E[s]: where state s begins
  var SEA_NAME = ['glassy', 'rippled', 'smooth', 'slight', 'moderate', 'rough', 'very rough',
                  'high', 'very high', 'phenomenal'];
  var SEA_RNG = ['flat', 'under 0.1 m', '0.1 to 0.5 m', '0.5 to 1.25 m', '1.25 to 2.5 m', '2.5 to 4 m',
                 '4 to 6 m', '6 to 9 m', '9 to 14 m', 'over 14 m'];
  //  the top of each state, metres, for a figure's bands (9 has none)
  var SEA_TOP = [0, 0.1, 0.5, 1.25, 2.5, 4, 6, 9, 14];
  function seaHt(kt) {
    if (kt <= 0) return 0;
    for (var i = 1; i < SEA_K.length; i++) if (kt <= SEA_K[i])
      return SEA_H[i - 1] + (SEA_H[i] - SEA_H[i - 1]) * (kt - SEA_K[i - 1]) / (SEA_K[i] - SEA_K[i - 1]);
    return 14.0;
  }
  function seaFor(kt) {
    var s = 0;
    for (var i = 1; i <= 9; i++) if (kt >= SEA_E[i]) s = i;
    return s;
  }
  function seaClose(kt, pct) {
    var s = seaFor(kt);
    if (s < 1 || s > 8 || pct <= 0) return 0;
    if (kt >= SEA_E[s + 1] - (SEA_E[s + 1] - SEA_E[s]) * pct / 100.0) return s + 1;
    return 0;
  }
  function seaFull(kt) { var v = kt * 0.514444; return 0.22 * v * v / 9.80665; }
  function seaName(s) { return SEA_NAME[s < 1 ? 0 : s]; }
  function seaRange(s) { return SEA_RNG[s < 1 ? 0 : s]; }
  function kts(x) { return x === Math.trunc(x) ? String(x) : cfixed(x, 1); }
  //  the share of a step that counts as close: 25 unless set, 0 to 50
  function seaPct(x) {
    if (x === '' || x === undefined || x === null) return 25;
    x = Math.trunc(+x || 0); if (x < 0) x = 0; if (x > 50) x = 50;
    return x;
  }
  //  what the figure and the words both come from, for one observation:
  //  null when it carries no wind
  function sea(o, pct) {
    if (!o || !has(o.wspd) || o.wspd < 0) return null;
    var w = o.wspd, S = { w: w, h: seaHt(w), s: seaFor(w), pct: seaPct(pct) };
    S.next = seaClose(w, S.pct);
    S.lo = S.s >= 1 ? SEA_E[S.s] : 0;
    S.hi = S.s <= 8 ? SEA_E[S.s + 1] : Infinity;
    S.full = seaFull(w);
    S.showFull = S.full >= S.h + 0.1;
    S.logged = has(o.sst) ? o.sst : NONE;
    S.swh = (has(o.swh) && o.swh > 0) ? o.swh : NONE;
    S.swp = has(o.swp) ? o.swp : NONE;
    return S;
  }

  // ---------------------------------------------------------------
  //  Buys Ballot.
  //
  //  Wind direction is where it comes FROM, so with your back to it you
  //  face wdir+180.  The low is 90 degrees to your left in the northern
  //  hemisphere, which is (wdir+180) - 90 = wdir + 90.  To your right in
  //  the southern: wdir + 270.
  //
  //  The awk's first version added and subtracted the 90 the other way
  //  round and pointed at the exact opposite side of the sky.  Sanity
  //  check kept here too: a westerly in the northern hemisphere (270)
  //  gives 000, and a low to the north with a westerly is what a
  //  mid-latitude depression does.
  // ---------------------------------------------------------------
  function bb(wdir, isNorth) {
    var b = isNorth ? wdir + 90 : wdir + 270;
    while (b >= 360) b -= 360;
    while (b < 0) b += 360;
    return Math.trunc(b + 0.5) % 360;
  }
  //  THE LOW IS A SECTOR, NOT A LINE (weather 1.0.8; Larry, APK).  bb is
  //  the rule for a wind along the isobars; the wind on deck is turned 10
  //  to 20 degrees in toward the low, so the low lies that much forward of
  //  the arm Buys Ballot gives.  The sector runs from straight off that
  //  arm to 20 degrees forward of it: clockwise from bb in the north,
  //  anticlockwise in the south.  bbLo and bbHi are its edges in clockwise
  //  order.  As wx_bbfar, wx_bblo and wx_bbhi in the awk.
  function bbFar(wdir, isNorth) { return (bb(wdir, isNorth) + (isNorth ? 20 : 340)) % 360; }
  function bbLo(wdir, isNorth) { return isNorth ? bb(wdir, isNorth) : bbFar(wdir, isNorth); }
  function bbHi(wdir, isNorth) { return isNorth ? bbFar(wdir, isNorth) : bb(wdir, isNorth); }

  // ---------------------------------------------------------------
  //  THE QUARTER THE LOW IS HEADING INTO (weather 1.0.8; Larry, APR).
  //  A port of wx_course in the awk, where the reasoning is set out:
  //  a wind that has shifted more than 10 degrees says which side of
  //  its track you are on (backed, the left; veered, the right), and a
  //  glass that is falling or rising says whether it is closing or
  //  opening.  With t the bearing from the low to you, its course is in
  //    left and closing   t to t+90       left and opening   t+90 to t+180
  //    right and closing  t-90 to t       right and opening  t-180 to t-90
  //  and holding it, it comes nearest a quarter turn round from the
  //  course.  Null when the log does not have both things.
  // ---------------------------------------------------------------
  function course(lo, hi, dw, bnd) {
    if (!(dw > 10 || dw < -10)) return null;
    var tr;
    if (bnd === 'falling' || bnd === 'falling fast') tr = 1;
    else if (bnd === 'rising') tr = 0;
    else return null;
    var left = dw < 0;
    var t = lo + ((hi - lo + 360) % 360) / 2 + 180;
    var c0 = left ? (tr ? t : t + 90) : (tr ? t - 90 : t - 180);
    var C = { left: left, closing: tr === 1 };
    C.c0 = (c0 % 360 + 360) % 360;
    C.c1 = (C.c0 + 90) % 360;
    C.cpa = ((C.c0 + 45 + (left ? 90 : 270)) % 360 + 360) % 360;
    return C;
  }
  var PT8 = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  function pt8(b) { return PT8[Math.trunc((b % 360 + 360) % 360 / 45 + 0.5) % 8]; }

  // ---------------------------------------------------------------
  //  A FRONTAL LOW, LOOKED DOWN ON (W20, weather 1.0.10; Larry, ATR).
  //  The same model as fr_p, fr_from and fr_glass in wx.awk, word for
  //  word, and held to it character for character by
  //  docs/web/tests/weather-fronts.js: a round low (990 hPa, 26 hPa
  //  shallower far out, exp(-(r/700)^2)), each front in a trough of 2.5
  //  hPa times tanh(d/150) south of the centre, the wind 75 degrees round
  //  from the way the pressure rises, the low moving east at 30 knots.
  // ---------------------------------------------------------------
  var FR_W = [[0, 0], [180, -40], [330, -150], [450, -330], [520, -520]];
  var FR_C = [[0, 0], [-60, -160], [-110, -330], [-140, -520]];
  var FR_A = { y: -250, x: [680, 440, 160, -130, -450],
               stage: ['ahead of the warm front', 'the warm front coming', 'the warm sector',
                       'just behind the cold front', 'well behind the cold front'],
               sky: ['cirrus, then cirrostratus', 'altostratus, nimbostratus, rain', 'stratus, drizzle, haze or fog',
                     'cumulonimbus, squalls, showers', 'clearing, showers, good visibility'],
               air: ['cool', 'cool, warming', 'warm, moist', 'turning cold', 'cold, clear'] };
  var FR_B = { y: 250, x: [560, 0, -560],
               stage: ['the low ahead', 'the low at its nearest', 'the low past'] };
  function frTanh(x) { var e = Math.exp(-2 * (x < 0 ? -x : x)); return (x < 0 ? -1 : 1) * (1 - e) / (1 + e); }
  function frSegd(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    if (t < 0) t = 0; if (t > 1) t = 1;
    dx = px - (ax + t * dx); dy = py - (ay + t * dy);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function frDist(px, py, L) {
    var m = -1, i, d;
    for (i = 0; i + 1 < L.length; i++) {
      d = frSegd(px, py, L[i][0], L[i][1], L[i + 1][0], L[i + 1][1]);
      if (m < 0 || d < m) m = d;
    }
    return m;
  }
  function frP(x, y) {
    var p = 990 + 26 * (1 - Math.exp(-(x * x + y * y) / 490000));
    var s = 1 / (1 + Math.exp(y / 40));
    p += s * 2.5 * frTanh(frDist(x, y, FR_W) / 150);
    p += s * 2.5 * frTanh(frDist(x, y, FR_C) / 150);
    return p;
  }
  function frFrom(x, y) {
    var gx = (frP(x + 1, y) - frP(x - 1, y)) / 2, gy = (frP(x, y + 1) - frP(x, y - 1)) / 2;
    var gb = Math.atan2(gx, gy) * 57.29577951308232;
    return ((gb + 75) % 360 + 360) % 360;
  }
  function frGlass(x, y) { return frP(x - 45, y) - frP(x + 45, y); }
  function frBand(x, y) { return band(frGlass(x, y), 3); }
  var PT16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function pt16(b) { return PT16[Math.trunc((b % 360 + 360) % 360 / 22.5 + 0.5) % 16]; }

  // ---- the printf forms the awk uses ------------------------------
  // ---------------------------------------------------------------
  //  C's printf, not JavaScript's toFixed.
  //
  //  They disagree on an exact tie.  C rounds half to EVEN (IEEE 754's
  //  default mode), so %.0f of 12.5 is 12; JavaScript's toFixed is
  //  specified to pick the larger value, so it gives 13.  The 500 mb
  //  rules divide the wind by two, which lands on .5 for every even
  //  wind speed, and 506 of 1078 chart cases disagreed on exactly that.
  //
  //  The exact decimal expansion of a double is finite, and toFixed
  //  with enough places returns it, so the tie can be detected rather
  //  than guessed at: expand, then round the DECIMAL string.
  // ---------------------------------------------------------------
  function cfixed(x, nd) {
    //  C prints inf and nan, not Infinity and NaN.  A 500 mb wind of
    //  zero knots is nonsense input, but the awk prints "inf to inf
    //  hours" for it and a port that prints something else is not a
    //  port.  The UI refuses zero; this stays faithful.
    if (x === Infinity) return 'inf';
    if (x === -Infinity) return '-inf';
    if (x !== x) return 'nan';
    var neg = x < 0 || (x === 0 && 1 / x < 0);
    var s = Math.abs(x).toFixed(60);
    var dot = s.indexOf('.');
    var ip = s.substring(0, dot), fp = s.substring(dot + 1);
    var keep = fp.substring(0, nd), rest = fp.substring(nd);
    var up = false;
    var first = rest.charAt(0);
    if (first > '5') up = true;
    else if (first === '5') {
      //  a tie only if everything after the 5 is zero
      if (/[1-9]/.test(rest.substring(1))) up = true;
      else {
        var lastKept = nd > 0 ? keep.charAt(nd - 1) : ip.charAt(ip.length - 1);
        up = ((+lastKept) % 2) === 1;      // round half to even
      }
    }
    var digits = ip + keep;
    if (up) {
      var arr = digits.split(''), i = arr.length - 1;
      for (;;) {
        if (i < 0) { arr.unshift('1'); break; }
        if (arr[i] === '9') { arr[i] = '0'; i--; }
        else { arr[i] = String((+arr[i]) + 1); break; }
      }
      digits = arr.join('');
    }
    var ilen = digits.length - nd;
    var outI = digits.substring(0, ilen) || '0';
    var outF = digits.substring(ilen);
    return (neg ? '-' : '') + outI + (nd > 0 ? '.' + outF : '');
  }
  function cplus(x, nd) { return (x >= 0 && !(x === 0 && 1 / x < 0) ? '+' : '') + cfixed(x, nd); }

  function f1(x) { return cfixed(x, 1); }
  function pm1(x) { return cplus(x, 1); }                          // awk's %+.1f
  function d3(x) {                                                 // awk's %03d
    var n = Math.trunc(x), s = String(Math.abs(n));
    while (s.length < (n < 0 ? 2 : 3)) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
  }
  function di(x) { return String(Math.trunc(x)); }                 // awk's %d

  // ---------------------------------------------------------------
  //  The report.  Each item is {k, t}: 'say' a conclusion, 'why' the
  //  working behind it, 'warn' a conclusion that matters, 'acc' one
  //  worth noticing, 'gap' a blank line.
  // ---------------------------------------------------------------
  function report(W, lon, hours, pct) {
    var out = [], n = W.length;
    hours = +hours; if (hours !== 24 && hours !== 72) hours = 48;
    function say(t) { out.push({ k: 'say', t: t }); }
    function why(t) { out.push({ k: 'why', t: t }); }
    function warn(t) { out.push({ k: 'warn', t: t }); }
    function acc(t) { out.push({ k: 'acc', t: t }); }
    function gap() { out.push({ k: 'gap', t: '' }); }

    if (n < 2) {
      say('Not enough observations yet.');
      why('Almost every rule here needs history, not a snapshot: a tendency');
      why('is a rate, backing is a change, a front is a sequence. Log a few');
      why('three-hourly entries and this page starts working.');
      return out;
    }

    var last = W[n - 1], i, k = 0, tend = '';      // tend: the glass's tendency word, for the low's course
    //  the most recent earlier observation with a pressure, for the trend
    for (i = n - 2; i >= 0; i--) if (has(W[i].p) && has(last.p)) break;
    k = i;
    var prev = k >= 0 ? W[k] : null;

    // ---- pressure -------------------------------------------------
    if (prev && has(last.p) && has(prev.p)) {
      var dt = (mins(last.ts) - mins(prev.ts)) / 60.0;
      var dp = last.p - prev.p;
      var t1 = tide(prev.ts, lon, prev.lat), t2 = tide(last.ts, lon, last.lat);
      var corr = dp - (t2 - t1);
      say('Pressure ' + f1(last.p) + ', ' + pm1(dp) + ' hPa in ' + f1(dt) + ' hours.');
      if (tideok(lon, prev.lat, last.lat)) {
        say('Allowing for the daily atmospheric tide: ' + pm1(corr) + ' hPa.');
        why('the tide alone accounts for ' + pm1(t2 - t1) + ' of that. It is semidiurnal,');
        why('about 1.4 hPa in the tropics and much less in high latitudes,');
        why('and in the tropics it falls 2-3 mb every afternoon in fine weather.');
      } else {
        corr = dp;
        if (lon !== '' && lon !== undefined && lon !== null) {
          say('The daily atmospheric tide is not allowed for: no latitude in the log.');
          why('its size depends on where you are, 1.4 hPa near the equator and a');
          why('quarter of that at 50 degrees. Log a deck entry with your position.');
        }
      }
      if (dt > 0) {
        var bd = band(corr, dt);
        tend = bd;
        if (bd === 'falling fast') warn('That is a serious fall. Expect a deepening system and a rising wind.');
        else if (bd === 'falling') say('A definite fall. Something is coming.');
        else if (bd === 'rising') say('Rising. The gradient is easing or a ridge is building.');
        else say('Near steady.');
        why('a rate matters more than a level: 1000 hPa steady is a quiet day,');
        why('1015 falling fast is not.');
      }
      //  the glass, as the terminal's table.  Every line of it is marked
      //  glass:true, because the page draws the barograph in its place.
      var G = glass(W, lon, hours);
      out.glass = G;
      if (G.n >= 2) {
        var gl = function (k, t) { out.push({ k: k, t: t, glass: true }); };
        gl('gap', '');
        gl('say', 'The glass, last ' + hours + ' hours:');
        var f = W[G.at[0]], dy = f.ts.substr(0, 10);
        gl('say', '   ' + padr(day(f.ts) + ' ' + f.ts.substr(11, 5), 17) + padl(f1(f.p), 7));
        runs(G).forEach(function (r) {
          var z = W[G.at[r.to]], lab = 'to ' + z.ts.substr(11, 5);
          if (z.ts.substr(0, 10) !== dy) { lab = 'to ' + day(z.ts) + ' ' + z.ts.substr(11, 5); dy = z.ts.substr(0, 10); }
          gl('say', '   ' + padr(lab, 17) + padl(f1(z.p), 7) + '   ' + padr(r.band, 14) + pm1(r.rate) + ' hPa in 3 h');
        });
        if (G.tide) gl('why', 'the daily tide alone is ' + f1(G.amp) + ' hPa each way here, and is allowed for');
        else if (lon === '' || lon === undefined || lon === null) gl('why', 'no longitude set, so the daily tide is not allowed for');
        else gl('why', 'no latitude in the log yet, so the daily tide is not allowed for');
      }
    } else {
      say('No pressure trend - fewer than two entries carry a pressure.');
    }

    // ---- wind: backing or veering, and Buys Ballot ----------------
    if (prev && has(last.wdir) && has(prev.wdir)) {
      var dw = d180(last.wdir - prev.wdir);
      gap();
      if (dw > 10) say('Wind has VEERED ' + di(dw + 0.5) + ' degrees, ' + d3(prev.wdir) + ' to ' + d3(last.wdir) + '.');
      else if (dw < -10) say('Wind has BACKED ' + di(-dw + 0.5) + ' degrees, ' + d3(prev.wdir) + ' to ' + d3(last.wdir) + '.');
      else say('Wind steady in direction, about ' + d3(last.wdir) + '.');
      //  what a shift tells you, whichever way the storm is going and in
      //  either hemisphere (weather 1.0.8; Larry, APO and APP): on the left
      //  of its track the wind backs, on the right it veers
      if (dw > 10) {
        why('if the wind goes on veering, you are on the right of the storm\'s');
        why('track, looking the way it is going: it passes north of you if it');
        why('is going east, south of you if it is going west.');
      }
      if (dw < -10) {
        why('if the wind goes on backing, you are on the left of the storm\'s');
        why('track, looking the way it is going: it passes south of you if it');
        why('is going east, north of you if it is going west.');
      }
    }
    //  the low, for the words and for the page's compass card: the wind
    //  now, the sector's two edges, the hemisphere, and the wind before if
    //  it has shifted
    out.low = null;
    if (has(last.wdir)) {
      var isN = north(last.lat), l0 = out.length;
      out.low = { wdir: last.wdir, north: isN, lo: bbLo(last.wdir, isN), hi: bbHi(last.wdir, isN),
                  arm: bb(last.wdir, isN),
                  was: (prev && has(prev.wdir)) ? prev.wdir : NONE,
                  dw: (prev && has(prev.wdir)) ? d180(last.wdir - prev.wdir) : 0 };
      gap();
      say('Back to the wind: the low is between ' + d3(out.low.lo) + ' and ' + d3(out.low.hi) + ' from you.');
      why('Buys Ballot. Stand with your back to the wind: in the northern');
      why('hemisphere the low is on your left, in the southern, on your right,');
      why('and up to 20 degrees forward of that arm, because the sea turns the');
      why('wind on deck in toward the low.');
      //  the quarter it is heading into, when the log has a shift and a
      //  moving glass (APR)
      var C = course(out.low.lo, out.low.hi, out.low.dw, tend);
      out.low.course = C;
      if (C) {
        say('Its course is somewhere between ' + d3(C.c0) + ' and ' + d3(C.c1) + '.');
        if (C.closing) say('If it holds that, it passes to your ' + pt8(C.cpa) + '.');
        else say('It is drawing away.');
        why('the wind has ' + (C.left ? 'backed' : 'veered') + ', so you are on the ' + (C.left ? 'left' : 'right') + ' of its track; the glass');
        why('is ' + (C.closing ? 'falling' : 'rising') + ', so it is ' + (C.closing ? 'closing' : 'opening') + '. A low can deepen without');
        why('moving, or fill where it lies: this is where to watch, not a fix.');
      }
      //  marked, so the page can put the compass card beside these words
      for (i = l0; i < out.length; i++) out[i].low = true;
    }

    // ---- fog -------------------------------------------------------
    if (has(last.dew) && has(last.sea)) {
      gap();
      if (last.dew >= last.sea - 0.5) {
        warn('Fog is likely: the dew point is at or above the sea temperature.');
        why('air moving over water colder than its own dew point condenses.');
      } else {
        say('Fog unlikely: dew point ' + f1(last.dew) + ', sea ' + f1(last.sea) +
            ', a margin of ' + f1(last.sea - last.dew) + '.');
      }
    }

    // ---- cloud base ------------------------------------------------
    if (has(last.air) && has(last.dew)) {
      gap();
      say('Cloud base about ' + di((last.air - last.dew) * 400) + ' ft (' +
          di((last.air - last.dew) * 125) + ' m).');
      why('the spread closes at about 2.5 C per 1000 ft - a parcel cools at 3,');
      why('its dew point falls at 0.5, and the difference is what counts. Not');
      why('the lapse rate alone: that would put the base a sixth too low.');
    }

    // ---- the cloud sequence ---------------------------------------
    cloud(W, out);

    // ---- visibility ------------------------------------------------
    if (last.vis >= 0 && prev && prev.vis >= 0 && last.vis !== prev.vis) {
      gap();
      if (last.vis < prev.vis) {
        say('Visibility is closing in: code ' + di(prev.vis) + ' down to ' + di(last.vis) + '.');
        why('with a falling glass that is usually rain arriving ahead of a front;');
        why('with the dew point near the sea temperature it is fog.');
      } else {
        say('Visibility improving: code ' + di(prev.vis) + ' up to ' + di(last.vis) + '.');
      }
    }

    // ---- the sea against the wind (W09) ----------------------------
    //  the words; the page draws the figure from the same out.sea
    var S = sea(last, pct), s0 = out.length;
    out.sea = S;
    if (S) {
      gap();
      if (S.s === 0) say('The sea: no wind to speak of; the scale expects a glassy sea.');
      else {
        say('The sea: at ' + kts(S.w) + ' kt the Beaufort scale expects about ' + f1(S.h) + ' m, ' + seaName(S.s) + '.');
        why('its probable wave height, for a well-developed sea in open water.');
        why('The sea lags the wind: it builds after the wind does.');
      }
      if (S.next > 0) {
        acc('Close to ' + seaName(S.next) + ': the scale turns at ' + kts(SEA_E[S.next]) + ' kt.');
        why('your wind is in the top ' + di(S.pct) + '% of the ' + seaName(S.s) + ' step, ' +
            kts(SEA_E[S.s]) + ' to ' + kts(SEA_E[S.next]) + ' kt.');
      }
      if (has(S.logged)) {
        if (S.logged === S.s) say('You logged a ' + seaName(S.logged) + ' sea: what the scale expects.');
        else if (S.logged < S.s) {
          say('You logged a ' + seaName(S.logged) + ' sea, ' + seaRange(S.logged) + ': under the scale.');
          why('a sea still building, or short of fetch: the wind has not had the');
          why('time or the distance to raise all it can.');
        } else {
          say('You logged a ' + seaName(S.logged) + ' sea, ' + seaRange(S.logged) + ': above the scale.');
          why('more sea than the scale gives this wind. Is some of it swell?');
        }
      }
      if (has(S.swh)) {
        if (has(S.swp)) say('Your swell: ' + f1(S.swh) + ' m at ' + di(S.swp) + ' seconds.');
        else say('Your swell: ' + f1(S.swh) + ' m.');
        why('swell is sea that has left the wind that raised it, so it is marked');
        why('on its own and not held against this wind.');
      }
      if (S.showFull) {
        say('Fully developed, this wind could raise about ' + f1(S.full) + ' m.');
        why('the limit for a steady wind over open ocean (Pierson and');
        why('Moskowitz). It takes roughly ten thousand wave periods of wind');
        why('over five thousand wavelengths of sea; the gap from the scale');
        why('is time and fetch.');
      }
      //  marked, so the page can put its figure beside these words
      for (i = s0; i < out.length; i++) out[i].sea = true;
    }

    // ---- swell, the earliest warning there is ----------------------
    if (has(last.swp) && last.swp >= 12) {
      gap();
      acc('A ' + di(last.swp) + '-second swell from ' + d3(last.swd) + '.');
      why('long-period swell outruns the storm that made it. This can be the');
      why('first news of a system, with a steady glass and a clear sky.');
    }

    return out;
  }

  // ---------------------------------------------------------------
  //  The cloud sequence -- the rule those three cloud codes are FOR.
  //
  //  A warm front announces itself hours ahead, in order: cirrus, then
  //  cirrostratus thickening and lowering, then altostratus, then rain.
  //  Reading it needs cloud TYPE over time, which is why the observation
  //  asks for CL, CM and CH separately and why total cover cannot do it.
  //
  //  In the first build the awk asked for all three and never used
  //  them, which is how you teach somebody to stop filling in a form.
  // ---------------------------------------------------------------
  function cloud(W, out) {
    var n = W.length;
    if (n < 2) return false;
    out.push({ k: 'gap', t: '' });
    var hi = 0, mid = 0, lo = 0, i;
    for (i = 1; i <= n; i++) {
      if (W[i - 1].ch > 0) hi = i;
      if (W[i - 1].cm > 0 && i >= hi && hi > 0) mid = i;
      if (W[i - 1].cl >= 6 && mid > 0 && i >= mid) lo = i;
    }
    if (lo > 0) {
      out.push({ k: 'warn', t: 'The cloud has run the whole warm-front sequence: high, then' });
      out.push({ k: 'warn', t: 'middle, and now low stratus. The front is on you or past.' });
    } else if (mid > 0 && mid > hi - 1) {
      out.push({ k: 'acc', t: 'Cirrus has thickened to middle cloud - the classic warm front' });
      out.push({ k: 'acc', t: 'sequence, and it is well under way.' });
      out.push({ k: 'why', t: 'expect the glass to keep falling, the wind to back, and rain' });
    } else if (hi > 0 && W[n - 1].ch > 0) {
      out.push({ k: 'say', t: 'High cloud is in. On its own it means very little -' });
      out.push({ k: 'say', t: 'but if it thickens and lowers over the next watches, that is a' });
      out.push({ k: 'say', t: 'warm front announcing itself hours ahead.' });
    } else {
      //  nothing to say, and the blank line already emitted is what the
      //  awk leaves behind too
      return false;
    }
    out.push({ k: 'why', t: 'cirrus -> cirrostratus -> altostratus -> nimbostratus and rain' });
    return true;
  }

  // ---------------------------------------------------------------
  //  The terminal rendering: the exact text `weather what` prints, so
  //  the two builds can be held side by side character for character.
  // ---------------------------------------------------------------
  var RULE = '  ' + new Array(71).join('-');
  function renderTerminal(items, enough) {
    var L = [''];
    L.push('  WHAT THE LOG SAYS');
    L.push(RULE);
    items.forEach(function (it) {
      if (it.k === 'gap') L.push('');
      else if (it.k === 'why') L.push('     ' + it.t);
      else L.push('  ' + it.t);
    });
    if (!enough) { L.push(''); return L.join('\n') + '\n'; }
    L.push(RULE);
    L.push('  This reasons only from what you logged. It is not a forecast:');
    L.push('  no model, no chart, no GRIB. It is you, reading your own barometer.');
    L.push('');
    return L.join('\n') + '\n';
  }

  // ---------------------------------------------------------------
  //  THE ROUTING LESSON'S BOAT AND WATER (W35, weather 1.0.21; Larry,
  //  TAYO).  The same model as rt_g, rt_cost, rt_width and rt_allin in
  //  wx.awk, and held to it character for character by
  //  docs/web/tests/weather-route.js.  A made-up boat in one steady
  //  wind: her speed at eight angles off the wind.  Everywhere she can
  //  be after t hours is t times the outline through those speeds on
  //  both tacks, so the time to make good a displacement is the largest
  //  of sixteen dot products, one for each side of the outline.
  // ---------------------------------------------------------------
  var RT = { A: [45, 60, 75, 90, 105, 120, 135, 150], S: [6.0, 6.9, 7.5, 8.0, 8.1, 7.9, 7.5, 7.0],
             REACH: 24, BEAT: 12, LANE: 10, TS: 1, SHIFT: 20,
             HZ: [[1, 5, 90], [6, 7, 80], [8, 10, 50]],
             SC: [['tropics', 1.15], ['mid-latitudes', 1.20], ['high-latitudes', 1.25]], CUR: 1.30,
             /* TEST THE ROUTE: her speeds scaled, as rt_init's RT_K in
                wx.awk (weather 1.0.26, Larry's ruling TBOK) */
             K: [0.9, 1.0, 1.1] };
  RT.V = (function () {
    var v = [], i, r;
    for (i = 0; i < RT.A.length; i++) { r = RT.A[i] * Math.PI / 180; v.push([RT.S[i] * Math.sin(r), RT.S[i] * Math.cos(r)]); }
    for (i = RT.A.length - 1; i >= 0; i--) v.push([-v[i][0], v[i][1]]);
    return v;
  })();
  function rtG(dx, dy, wd) {
    var r = (wd || 0) * Math.PI / 180, x = dx * Math.cos(r) - dy * Math.sin(r), y = dx * Math.sin(r) + dy * Math.cos(r);
    var m = 0, i, a, b, nx, ny, h, q, n = RT.V.length;
    for (i = 0; i < n; i++) {
      a = RT.V[i]; b = RT.V[(i + 1) % n];
      nx = b[1] - a[1]; ny = -(b[0] - a[0]); h = nx * a[0] + ny * a[1];
      if (h < 0) { nx = -nx; ny = -ny; h = -h; }
      q = (nx * x + ny * y) / h; if (q > m) m = q;
    }
    return m;
  }
  function rtCost(px, py, fx, fy) {
    var c = rtG(px, py, 0) + rtG(fx - px, fy - py, 0) - rtG(fx, fy, 0);
    return c < 1e-9 ? 0 : c;               // never negative: the last digits of a sum
  }
  function rtWidth(fx, fy, mins) {
    var L = Math.sqrt(fx * fx + fy * fy), ux = -fy / L, uy = fx / L, tot = 0, s, lo, hi, mid, k;
    for (s = 1; s >= -1; s -= 2) {
      lo = 0; hi = 40;
      for (k = 0; k < 40; k++) {
        mid = (lo + hi) / 2;
        if (rtCost(fx / 2 + s * mid * ux, fy / 2 + s * mid * uy, fx, fy) <= mins / 60) lo = mid; else hi = mid;
      }
      tot += lo;
    }
    return tot;
  }
  function rtAllin(a, wd) { return rtAllinK(a, wd, 1); }
  /*  every speed of hers times k; the shift still comes RT.TS hours in  */
  function rtAllinK(a, wd, k) {
    var n = RT.V.length, px = RT.TS * k * (a * RT.V[0][0] + (1 - a) * RT.V[n - 1][0]), py = RT.TS * k * RT.V[0][1];
    return RT.TS + rtG(0 - px, RT.BEAT - py, wd) / k;
  }
  function rtHm(t) { var m = Math.trunc(t * 60 + 0.5), mm = m % 60; return Math.trunc(m / 60) + ' h ' + (mm < 10 ? '0' : '') + mm; }

  return { NONE: NONE, num: num, has: has, d180: d180, mins: mins, load: load,
           north: north, latdeg: latdeg, tide: tide, bb: bb, bbFar: bbFar, bbLo: bbLo, bbHi: bbHi, course: course, pt8: pt8,
           tideok: tideok, band: band, glass: glass, runs: runs, day: day,
           seaHt: seaHt, seaFor: seaFor, seaClose: seaClose, seaFull: seaFull,
           seaName: seaName, seaRange: seaRange, seaPct: seaPct, sea: sea, kts: kts,
           SEA_K: SEA_K, SEA_H: SEA_H, SEA_E: SEA_E, SEA_TOP: SEA_TOP,
           report: report, renderTerminal: renderTerminal,
           cfixed: cfixed, cplus: cplus,
           FR_W: FR_W, FR_C: FR_C, FR_A: FR_A, FR_B: FR_B, frP: frP, frFrom: frFrom, frGlass: frGlass, frBand: frBand, pt16: pt16,
           RT: RT, rtG: rtG, rtCost: rtCost, rtWidth: rtWidth, rtAllin: rtAllin, rtAllinK: rtAllinK, rtHm: rtHm };
})();

if (typeof module !== 'undefined') module.exports = WX;

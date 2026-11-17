// =====================================================================
//  weather -- forecast, verify, score.  A port of src/weather/score.awk.
//
//  THE ORDER IS THE POINT.  The user's forecast is committed to the log
//  BEFORE the app shows any of its own reasoning.  Print the guess first
//  and the person has not forecast anything -- they have read an answer
//  and agreed with it.  It feels like learning and is not.  House rule:
//  never tell before you ask.
//
//  AND THREE ARE SCORED, not one.  Scoring only the user would make this
//  an oracle and it is not one: every rule in it is a rule of thumb.
//  Scoring the rules too keeps it honest, teaches calibration, and lets
//  the user eventually win -- which is the point, because a training
//  tool that cannot be outgrown is badly built.
//
//  The third is PERSISTENCE: "in twelve hours it will be much as it is
//  now."  It is the honest floor.  Hard to beat at short range, and a
//  forecast that does not beat it has shown no skill at all.
// =====================================================================
'use strict';

var SCORE = (function () {

  var NONE = -9999;

  //  Error points, from the WxChallenge: weighted, continuous, low score
  //  wins.  A near miss should score like a near miss, which one
  //  right/wrong verdict per forecast cannot express.
  function pts(field, a, b) {
    if (a <= -9000 || b <= -9000) return -1;          // not comparable
    var d;
    if (field === 'wdir') { d = WX.d180(a - b); if (d < 0) d = -d; return d * 0.1; }
    d = a - b; if (d < 0) d = -d;
    if (field === 'wspd') return d * 0.5;
    if (field === 'mslp') return d * 1.0;
    if (field === 'sea') return d * 2.0;
    return d;
  }
  function label(f) {
    return f === 'wdir' ? 'wind direction' : f === 'wspd' ? 'wind speed'
         : f === 'mslp' ? 'pressure' : f === 'sea' ? 'sea state' : f;
  }
  //  Distinct short names: truncating the long ones gives "wind" twice,
  //  which is a column of numbers nobody can read.
  function short(f) {
    return f === 'wdir' ? 'dir' : f === 'wspd' ? 'spd'
         : f === 'mslp' ? 'hPa' : f === 'sea' ? 'sea' : f;
  }

  //  A fully developed sea for a given wind, roughly.  Used only to turn
  //  a forecast wind into a forecast sea state; it is a rule of thumb
  //  and is scored like everything else.
  function sea(kt) {
    if (kt < 1) return 0;
    if (kt < 7) return 1;
    if (kt < 13) return 2;
    if (kt < 19) return 3;
    if (kt < 25) return 4;
    if (kt < 34) return 5;
    if (kt < 41) return 6;
    if (kt < 48) return 7;
    if (kt < 56) return 8;
    return 9;
  }

  // ---------------------------------------------------------------
  //  The two machine forecasters.  Both deliberately simple and both
  //  honest about it: the whole reason they are scored is that nobody,
  //  including whoever wrote them, knows how good they are until a
  //  season of observations says so.
  // ---------------------------------------------------------------
  function persist(W, n) {
    var o = W[n];
    return { wdir: o.wdir, wspd: o.wspd, mslp: o.p,
             sea: WX.has(o.wspd) ? sea(o.wspd) : NONE,
             why: 'nothing changes' };
  }

  function rules(W, n, k, hours, lon) {
    var F = { wdir: NONE, wspd: NONE, mslp: NONE, sea: NONE, why: '' };
    if (k < 0) {
      F = persist(W, n);
      F.why = 'only one observation - nothing but persistence to offer';
      return F;
    }
    var o = W[n], p = W[k];
    var dt = (WX.mins(o.ts) - WX.mins(p.ts)) / 60.0;
    if (dt <= 0) return persist(W, n);
    var damp = 0.7;              // a trend does not continue for ever

    if (WX.has(o.p) && WX.has(p.p)) {
      var dp = o.p - p.p;
      if (WX.tideok(lon, p.lat, o.lat)) {
        dp = dp - (WX.tide(o.ts, lon, o.lat) - WX.tide(p.ts, lon, p.lat));
      }
      var rate = dp / dt;
      F.mslp = o.p + rate * hours * damp;
      F.why = 'pressure trend ' + pm2(rate) + ' hPa/h, damped, carried ' + g(hours) + ' h';
      //  a falling glass is a rising wind: the classic rule, crudely
      if (WX.has(o.wspd)) {
        var w = o.wspd - rate * hours * 2.0;
        if (w < 0) w = 0;
        F.wspd = w;
      }
    } else if (WX.has(o.wspd)) F.wspd = o.wspd;

    if (WX.has(o.wdir) && WX.has(p.wdir)) {
      var dw = WX.d180(o.wdir - p.wdir) / dt;
      var d = o.wdir + dw * hours * damp;
      while (d < 0) d += 360;
      while (d >= 360) d -= 360;
      F.wdir = d;
      if (F.why !== '') F.why = F.why + '; turning ' + pm1(dw) + ' deg/h, damped';
    } else F.wdir = o.wdir;

    if (WX.has(F.wspd)) F.sea = sea(F.wspd);
    return F;
  }

  //  Find the observation nearest a valid time, within a tolerance.
  function nearest(W, target, tolmin) {
    var best = -1, bd = 999999, i, d;
    for (i = 0; i < W.length; i++) {
      d = WX.mins(W[i].ts) - WX.mins(target);
      if (d < 0) d = -d;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0 || bd > tolmin) return -1;
    return best;
  }

  // ---------------------------------------------------------------
  //  Verify and score.  Reads the fc records out of the log, finds the
  //  observation each was made for, and scores every forecaster on
  //  every field it offered.
  // ---------------------------------------------------------------
  function verify(recs, W) {
    var fields = ['wdir', 'wspd', 'mslp', 'sea'];
    var tot = {}, cnt = {}, ftot = {}, fcnt = {}, V = [];
    recs.forEach(function (r) {
      if (r.type !== 'fc') return;
      var fo = r.v['for'], by = r.v.by;
      if (!fo || !by) return;
      //  THE USER'S OWN FORECASTS WERE NEVER SCORED.  The awk's
      //  do_forecast wrote by=user while the report's three names are
      //  "you rules persist", so the one column the whole learning loop
      //  exists for was silently missing.  Normalised on READ, not by
      //  renaming the writer alone: the log is append-only, so every fc
      //  record already written says user and has to keep working.
      if (by === 'user') by = 'you';
      var o = nearest(W, fo, 180);
      if (o < 0) return;                       // nothing observed yet
      V.push({ by: by, forTs: fo, made: r.ts, why: r.v.why || '' });
      fields.forEach(function (f) {
        if (r.v[f] === undefined || r.v[f] === '' || r.v[f] === '-') return;
        var p;
        if (f === 'wdir') p = pts(f, +r.v[f], W[o].wdir);
        else if (f === 'wspd') p = pts(f, +r.v[f], W[o].wspd);
        else if (f === 'mslp') p = pts(f, +r.v[f], W[o].p);
        else p = -1;
        if (p < 0) return;
        tot[by] = (tot[by] || 0) + p; cnt[by] = (cnt[by] || 0) + 1;
        var kk = by + '\u001c' + f;
        ftot[kk] = (ftot[kk] || 0) + p; fcnt[kk] = (fcnt[kk] || 0) + 1;
      });
    });
    return { n: V.length, v: V, tot: tot, cnt: cnt, ftot: ftot, fcnt: fcnt };
  }

  // ---- awk printf forms -------------------------------------------
  function pm1(x) { return WX.cplus(x, 1); }
  function pm2(x) { return WX.cplus(x, 2); }
  function f1(x) { return WX.cfixed(x, 1); }
  function f0(x) { return WX.cfixed(x, 0); }   // C rounds half to EVEN
  function g(x) {                                   // awk's %g
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e-4 && a < 1e6) {
      var s = (+x).toPrecision(6);
      if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
    var e = (+x).toExponential(5).split('e');
    var m = e[0].replace(/0+$/, '').replace(/\.$/, '');
    var ex = +e[1];
    return m + 'e' + (ex < 0 ? '-' : '+') + String(Math.abs(ex)).padStart(2, '0');
  }
  function padR(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function padL(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }

  // ---------------------------------------------------------------
  //  The score sheet, as items, plus the exact terminal rendering.
  // ---------------------------------------------------------------
  var RULE = '  ' + new Array(71).join('-');
  function reportLines(res) {
    var L = [''];
    L.push('  THE SCORE');
    L.push(RULE);
    if (res.n === 0) {
      L.push('  No forecast has reached its valid time yet, or no observation');
      L.push('  has been logged near one. Make a forecast, then log the');
      L.push('  observation it was for, and this page fills in.');
      L.push('');
      return L.join('\n') + '\n';
    }
    var names = ['you', 'rules', 'persist'];
    var fields = ['wdir', 'wspd', 'mslp'];
    L.push('  ' + padR('', 10) + ' ' + padL('points', 8) + '  per field, points per forecast');
    names.forEach(function (by) {
      if (!(by in res.cnt)) return;
      var line = '  ' + padR(by, 10) + ' ' + padL(f1(res.tot[by]), 8) + ' ';
      fields.forEach(function (f) {
        var kk = by + '\u001c' + f;
        if (kk in res.fcnt) line += '  ' + short(f) + ' ' + f1(res.ftot[kk] / res.fcnt[kk]);
      });
      L.push(line);
    });
    L.push(RULE);
    L.push('  Lower is better. Half a point per knot, one per millibar, a tenth');
    L.push('  per degree of wind direction - so a near miss scores like one.');
    L.push('');
    if (('persist' in res.cnt) && ('rules' in res.cnt)) {
      if (res.tot.rules / res.cnt.rules > res.tot.persist / res.cnt.persist) {
        L.push('  The rules are not beating persistence. That is the honest result');
        L.push('  so far, and it is worth knowing.');
      }
    }
    if (('you' in res.cnt) && ('rules' in res.cnt)) {
      if (res.tot.you / res.cnt.you < res.tot.rules / res.cnt.rules) {
        L.push('  You are beating the rule set. Trust yourself over it here.');
      }
    }
    L.push('');
    return L.join('\n') + '\n';
  }

  // ---------------------------------------------------------------
  //  Round a time forward to the next multiple of 3 hours, <hours>
  //  ahead.  Forecasts are made FOR a synoptic hour, so the observation
  //  that verifies one is an entry somebody would have made anyway.
  //
  //  The awk's first inverse conversion returned the year 4600 for a
  //  date in 2026.  Date arithmetic written from memory is a reliable
  //  way to be confidently wrong, which is why both builds round-trip
  //  every day for forty years in the tests.
  // ---------------------------------------------------------------
  function jdn(y, mo, d) {
    var a = Math.trunc((14 - mo) / 12), y2 = y + 4800 - a, m2 = mo + 12 * a - 3;
    return d + Math.trunc((153 * m2 + 2) / 5) + 365 * y2 + Math.trunc(y2 / 4)
           - Math.trunc(y2 / 100) + Math.trunc(y2 / 400) - 32045;
  }
  //  Fliegel and Van Flandern, the standard inverse.
  function civil(jd) {
    var a = jd + 32044;
    var b = Math.trunc((4 * a + 3) / 146097);
    var c = a - Math.trunc(146097 * b / 4);
    var dd = Math.trunc((4 * c + 3) / 1461);
    var e = c - Math.trunc(1461 * dd / 4);
    var m = Math.trunc((5 * e + 2) / 153);
    return { d: e - Math.trunc((153 * m + 2) / 5) + 1,
             m: m + 3 - 12 * Math.trunc(m / 10),
             y: 100 * b + dd - 4800 + Math.trunc(m / 10) };
  }
  function validTime(ts, hours) {
    var y = +ts.substr(0, 4), mo = +ts.substr(5, 2), d = +ts.substr(8, 2);
    var h = +ts.substr(11, 2);
    var jd = jdn(y, mo, d);
    var tot = jd * 24 + h + hours;
    var rh = tot % 3;
    if (rh !== 0) tot += (3 - rh);
    jd = Math.trunc(tot / 24); h = tot - jd * 24;
    var c = civil(jd);
    function p2(x) { return (x < 10 ? '0' : '') + x; }
    return String(c.y).padStart(4, '0') + '-' + p2(c.m) + '-' + p2(c.d) + 'T' + p2(h) + ':00Z';
  }

  return { NONE: NONE, pts: pts, label: label, short: short, sea: sea,
           persist: persist, rules: rules, nearest: nearest, verify: verify,
           reportLines: reportLines, jdn: jdn, civil: civil, validTime: validTime };
})();

if (typeof module !== 'undefined') module.exports = SCORE;

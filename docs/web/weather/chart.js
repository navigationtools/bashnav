// =====================================================================
//  weather -- reasoning over a 500 mb chart the user is holding.
//  A port of src/weather/chart.awk.
//
//  The app cannot fetch a chart and never will.  But a 500 mb chart
//  arrives by HF RADIOFAX, on an SSB receiver, at sea, with no
//  connectivity at all -- which is exactly the situation the rest of
//  bashnav is built for.  So this is the reasoning layer over a fax:
//  read three numbers off it and the rules do the rest, showing every
//  step.
//
//  Rules from Sienkiewicz & Chesneau, Mariner's Guide to the
//  500-Millibar Chart, NOAA -- public domain.  See docs/SOURCES.md.
// =====================================================================
'use strict';

var CHART = (function () {

  function g(x) {
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e-4 && a < 1e6) {
      var s = (+x).toPrecision(6);
      if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
    var e = (+x).toExponential(5).split('e');
    return e[0].replace(/0+$/, '').replace(/\.$/, '') + 'e' +
           (+e[1] < 0 ? '-' : '+') + String(Math.abs(+e[1])).padStart(2, '0');
  }
  function d3(x) {
    var n = Math.trunc(x), s = String(Math.abs(n));
    while (s.length < (n < 0 ? 2 : 3)) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
  }
  function f0(x) { return WX.cfixed(x, 0); }   // C rounds half to EVEN, not away from zero

  //  Is the 564 line on my POLEWARD side?  If it bears north of me in
  //  the northern hemisphere, I am equatorward of it, which is where I
  //  want to be.
  function poleward(brg, north) {
    var b = +brg;
    while (b < 0) b += 360;
    while (b >= 360) b -= 360;
    if (north) return (b < 90 || b > 270);     // the line lies to my north
    return (b > 90 && b < 270);                // southern: to my south
  }

  //  brg    bearing FROM you TO the nearest point of the 564 line
  //  dist   its distance in nm
  //  orient the line's own orientation, as a bearing (either end)
  //  w500   the 500 mb wind speed there, knots
  //  north  true northern hemisphere, false southern
  function report(brg, dist, orient, w500, north) {
    var out = [];
    function say(t) { out.push({ k: 'say', t: t }); }
    function warn(t) { out.push({ k: 'warn', t: t }); }
    function okk(t) { out.push({ k: 'ok', t: t }); }
    function acc(t) { out.push({ k: 'acc', t: t }); }
    function why(t) { out.push({ k: 'why', t: t }); }
    function gap() { out.push({ k: 'gap', t: '' }); }

    var pole = north ? 'north' : 'south';

    if (dist === '' || dist === undefined || brg === '' || brg === undefined) {
      say('Give me where the 564 line runs and I will walk the rules.');
      return out;
    }
    var or = +orient || 0;
    say('The 5640 m contour is ' + g(+dist) + ' nm away, bearing ' + d3(+brg) +
        ', lying ' + d3(or) + '/' + d3((or + 180) % 360) + '.');
    gap();

    // ---- 1. the storm track ---------------------------------------
    acc('The surface storm track runs parallel to that line, ' + pole + ' of it,');
    say('between 300 and 600 nm away from it.');
    why('so the depressions are travelling along ' + d3(or) + '/' + d3((or + 180) % 360) +
        ', not toward you');

    // ---- 2. the gale boundary, which is the one that matters ------
    gap();
    warn('All the gale force winds are on the ' + pole + ' side of the 564 line.');
    if (poleward(brg, north)) {
      okk('You are on the equatorward side of it. That is the right side.');
      why('stay there and you stay out of the gales - that is the routing rule,');
      why('and it is why the standard book on this is called Heavy Weather Avoidance');
    } else {
      warn('The line is equatorward of you, so you are on the gale side of it.');
      why('getting equatorward of the 564 line is the single most useful thing');
      why('you can do about the weather from here');
    }

    // ---- 3 and 4. speed and strength, if the wind was read --------
    if (w500 !== '' && w500 !== undefined && w500 !== null) {
      gap();
      var mn = (+w500) / 3.0, mx = (+w500) / 2.0;
      say('At ' + g(+w500) + ' knots aloft, systems below move at ' + f0(mn) +
          ' to ' + f0(mx) + ' knots.');
      why('a surface low or front travels at a third to a half of the 500 mb wind');
      if (+dist > 0) {
        say('So a system 300 nm off would be on you in ' + f0(300.0 / mx) +
            ' to ' + f0(300.0 / mn) + ' hours.');
      }
      gap();
      say('Behind it, in the cold air, expect about ' + f0((+w500) / 2.0) +
          ' knots on deck.');
      why('surface wind in the west-to-southwest quadrant is about half the 500 mb');
      why('wind - which is the number that decides what sail you are carrying');
    }
    return out;
  }

  var RULE = '  ' + new Array(71).join('-');
  function renderTerminal(items, gave) {
    var L = [''];
    L.push('  FROM THE 500 MILLIBAR CHART');
    L.push(RULE);
    items.forEach(function (it) {
      if (it.k === 'gap') L.push('');
      else if (it.k === 'why') L.push('     ' + it.t);
      else L.push('  ' + it.t);
    });
    if (!gave) { L.push(''); return L.join('\n') + '\n'; }
    L.push(RULE);
    L.push("  Rules from Sienkiewicz and Chesneau, Mariner's Guide to the");
    L.push('  500-Millibar Chart, NOAA. They are rules of thumb: good ones,');
    L.push('  and still rules of thumb.');
    L.push('');
    return L.join('\n') + '\n';
  }

  /* ===================================================================
     THE WIND FROM THE ISOBARS (W07; weather 1.0.3; Larry, AKY and ALF).
     A port of iso_wind, iso_table and iso_report in chart.awk, held to
     it character for character by docs/web/tests/weather-iso.js.  The
     surface chart: the spacing between two isobars and the latitude give
     the wind aloft from the balance of the push toward the low against
     the earth's turn; W01's rules then give the wind on deck.
       wind aloft = interval / (1.225 x 2 x 7.292115e-5 x sin(lat) x spacing)
     Sources: AMS glossary, "geostrophic wind scale"; US Navy aerographer's
     mate training (tpub weather2 7-10).  Refused within 5 degrees of the
     equator, where the balance does not hold.
     =================================================================== */
  function isoWind(sp, lat, step) {
    var f = 2 * 7.292115e-5 * Math.sin(Math.abs(lat) * Math.PI / 180);
    return (step * 100.0) / (1.225 * f * sp * 1852.0) * 1.943844;
  }
  var ISO_SP = [50, 75, 100, 150, 200, 300], ISO_LAT = [30, 40, 50, 60];
  function pad(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }
  function isoReport(spacing, lat, step, north) {
    var out = [];
    function say(t) { out.push({ k: 'say', t: t }); }
    function warn(t) { out.push({ k: 'warn', t: t }); }
    function acc(t) { out.push({ k: 'acc', t: t }); }
    function why(t) { out.push({ k: 'why', t: t }); }
    function tab(t) { out.push({ k: 'tab', t: t }); }
    function gap() { out.push({ k: 'gap', t: '' }); }
    var has = function (v) { return !(v === '' || v === undefined || v === null); };
    if (!has(step)) step = 4;
    var h = north ? 'N' : 'S', turn = north ? 'backed' : 'veered';
    if (!has(spacing) || !has(lat)) {
      say('Give me the spacing between two isobars and your latitude, and I');
      say('will work the wind.');
      return out;
    }
    if (+spacing <= 0) { say('The spacing must be more than nothing: measure it in nautical miles.'); return out; }
    if (+step <= 0) { say('The isobar interval must be more than nothing: 4 hPa on most charts.'); return out; }
    if (+lat < 0 || +lat > 90) { say('A latitude runs from 0 to 90 degrees; say north or south apart.'); return out; }
    say('Isobars ' + g(+step) + ' hPa apart and ' + g(+spacing) + ' nm between them, at ' +
        g(+lat) + ' degrees ' + h + '.');
    gap();
    if (+lat < 5) {
      warn('Within 5 degrees of the equator the isobars do not give the wind.');
      why("the earth's turn is too weak there to balance the push toward the");
      why('low, so there is no steady wind along the isobars to work out;');
      why('believe the wind you can see');
      return out;
    }
    var v = isoWind(+spacing, +lat, +step);
    acc('The wind aloft runs along the isobars at ' + f0(v) + ' knots.');
    why('the closer the isobars, the harder the push toward the low; the');
    why("earth's turn bends the wind until the bend matches the push");
    say('On deck, over the sea: about ' + f0(v * 2 / 3) + ' knots, ' + turn + ' 10 to 20 degrees.');
    why('the drag of the sea slows it and turns it in toward the low');
    say('Over land: ' + f0(v / 3) + ' to ' + f0(v * 2 / 3) + ' knots, ' + turn + ' 30 to 40 degrees.');
    why('towns and forests at the slow end, open fields at the fast end');
    gap();
    say('This is the wind for straight isobars. Round a tight low expect');
    say('less, round a high more.');
    why("the curve of the isobars changes the speed; the coriolis lesson's");
    why('wind panel shows by how much');
    gap();
    //  the scale's heading goes with the table: the page draws the scale as
    //  curves instead, so it leaves out both
    tab('The scale: the wind aloft in knots, isobars ' + g(+step) + ' hPa apart');
    var line = '   spacing, nm';
    ISO_LAT.forEach(function (l) { line += pad(l + ' ' + h, 8); });
    tab(line);
    ISO_SP.forEach(function (sp) {
      var r = pad(sp, 14);
      ISO_LAT.forEach(function (l) { r += pad(f0(isoWind(sp, l, +step)), 8); });
      tab(r);
    });
    out.wind = v;
    return out;
  }
  function isoTerminal(items, worked) {
    var L = [''];
    L.push('  THE WIND FROM THE ISOBARS');
    L.push(RULE);
    items.forEach(function (it) {
      if (it.k === 'gap') L.push('');
      else if (it.k === 'why') L.push('     ' + it.t);
      else L.push('  ' + it.t);
    });
    L.push('');
    if (!worked) return L.join('\n') + '\n';
    L.push(RULE);
    L.push('  The geostrophic wind: the push toward the low balanced by the');
    L.push("  earth's turn, air density 1.225 kg/m3. The spacing in nautical");
    L.push("  miles is minutes of latitude: measure it on the chart's side scale.");
    L.push('');
    return L.join('\n') + '\n';
  }


  /* ===================================================================
     A REPORTED STORM, AS A CHECK ON YOUR OWN WIND (I20, weather 1.0.11;
     Larry, ATZ).  A port of st_report in chart.awk, word for word, held
     to it character for character by docs/web/tests/weather-storm.js.
     The reasoning and its sources are written there.  out.geo carries the
     numbers the page's picture draws: east and north in nautical miles
     from the boat, the centre then and now, both movements, the closest
     approach, and the wind's band.
     =================================================================== */
  var DR = Math.PI / 180;
  function stR(x) { return Math.trunc(x + 0.5); }
  function stB(x) { x = (x % 360 + 360) % 360; return Math.trunc(x + 0.5) % 360; }
  var NUM = /^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/;
  function stDeg(s, lim) {
    var t = String(s === undefined || s === null ? '' : s).replace(/[ \t]/g, ''), sg = 1;
    if (/[NnEe]$/.test(t)) t = t.slice(0, -1);
    else if (/[SsWw]$/.test(t)) { t = t.slice(0, -1); sg = -1; }
    if (!NUM.test(t)) return 'x';
    var v = sg * (+t);
    return (v < -lim || v > lim) ? 'x' : v;
  }
  function stNum(s) {
    var t = String(s === undefined || s === null ? '' : s).replace(/[ \t]/g, '');
    if (t === '') return '';
    return NUM.test(t) ? +t : 'x';
  }
  function stLL(v, p, n) { return g(v < 0 ? -v : v) + ' ' + (v < 0 ? n : p); }
  function stOut(b, lo, hi) {
    var w = ((hi - lo) % 360 + 360) % 360, d = ((b - lo) % 360 + 360) % 360;
    if (d <= w) return 0;
    var e = 360 - d;
    return d - w < e ? d - w : e;
  }
  function stormReport(f) {
    var out = [];
    function say(t) { out.push({ k: 'say', t: t }); }
    function warn(t) { out.push({ k: 'warn', t: t }); }
    function acc(t) { out.push({ k: 'acc', t: t }); }
    function why(t) { out.push({ k: 'why', t: t }); }
    function gap() { out.push({ k: 'gap', t: '' }); }
    var blank = function (v) { return v === undefined || v === null || String(v) === ''; };
    var a = stNum(f.age), cy = stDeg(f.clat, 90), cx = stDeg(f.clon, 180), md = stNum(f.mdir), mk = stNum(f.mkn);
    var rr = stNum(f.r34), by = stDeg(f.blat, 90), bx = stDeg(f.blon, 180), cs = stNum(f.bcse), bk = stNum(f.bkn), wd = stNum(f.wind);
    if (a === '' || blank(f.clat) || blank(f.clon) || md === '' || mk === '' || blank(f.blat) || blank(f.blon)) {
      say("Give me the advisory - how many hours ago it was issued, the centre's");
      say('latitude and longitude, its direction and speed of movement - and your');
      say('own position, and I will set it beside your wind.');
      return out;
    }
    if (a === 'x' || a < 0) { say("The advisory's age is a number of hours, 0 or more."); return out; }
    if (cy === 'x' || by === 'x') { say('A latitude runs from 90 S to 90 N: a number, or one with N or S after it.'); return out; }
    if (cx === 'x' || bx === 'x') { say('A longitude runs from 180 W to 180 E: a number, or one with E or W after it.'); return out; }
    if (md === 'x' || md < 0 || md >= 360 || mk === 'x' || mk < 0) { say('The movement is a direction, 0 to 359, and a speed in knots.'); return out; }
    if (rr === 'x' || (rr !== '' && rr < 0)) { say('The 34-knot radius is in nautical miles; leave it out if the advisory has none.'); return out; }
    if (cs === 'x' || bk === 'x' || (cs !== '' && (cs < 0 || cs >= 360)) || (bk !== '' && bk < 0)) { say('Your course is 0 to 359 and your speed knots; leave both out if you are stopped.'); return out; }
    if (wd === 'x' || (wd !== '' && (wd < 0 || wd >= 360))) { say('Your wind is the direction it blows from, 0 to 359; leave it out if you have none.'); return out; }
    if (by < 0 || cy < 0) {
      warn('South of the equator this is not worked yet.');
      why('which side of a storm is dangerous there, and the words for it, wait');
      why('for a decision; the rule from your own wind still holds in reverse');
      return out;
    }
    if (cs === '') cs = 0; if (bk === '') bk = 0;
    var k = Math.cos((cy + by) / 2 * 3.141592653589793 / 180);
    var dx = cx - bx; if (dx > 180) dx -= 360; if (dx < -180) dx += 360;
    dx = dx * 60 * k; var dy = (cy - by) * 60;
    var vx = mk * Math.sin(md * 3.141592653589793 / 180), vy = mk * Math.cos(md * 3.141592653589793 / 180);
    var ux = bk * Math.sin(cs * 3.141592653589793 / 180), uy = bk * Math.cos(cs * 3.141592653589793 / 180);
    var nx = dx + vx * a, ny = dy + vy * a;
    var dist = Math.sqrt(nx * nx + ny * ny), brg = Math.atan2(nx, ny) * 57.29577951308232;
    var geo = { then: [dx, dy], now: [nx, ny], v: [vx, vy], u: [ux, uy], r34: rr === '' ? null : rr, wind: wd === '' ? null : wd,
                mdir: md, bcse: cs, bkn: bk, age: a, dist: dist, brg: brg, cpa: null };
    say('Reported ' + g(a) + ' hours ago: the centre at ' + stLL(cy, 'N', 'S') + ', ' + stLL(cx, 'E', 'W') + ', moving ' + d3(stB(md)) + ' at ' + g(mk) + ' knots.');
    if (rr !== '') say('Its 34-knot winds reach ' + g(rr) + ' nm from the centre.');
    say('You: ' + stLL(by, 'N', 'S') + ', ' + stLL(bx, 'E', 'W') + ', ' + (bk > 0 ? 'steering ' + d3(stB(cs)) + ' at ' + g(bk) + ' knots' : 'stopped') + '.');
    gap();
    acc('The centre now: ' + d3(stB(brg)) + ', ' + stR(dist) + ' nm from you.');
    why("the advisory's position moved on " + g(a) + ' hours along its track');
    if (mk > 0) {
      var rel = Math.atan2(-nx, -ny) * 57.29577951308232 - md;
      var cross = dist * Math.sin(rel * 3.141592653589793 / 180), along = dist * Math.cos(rel * 3.141592653589793 / 180);
      var off = cross < 0 ? -cross : cross;
      geo.right = cross > 0; geo.off = off;
      if (off < 0.5) {
        warn('You are on its track, ' + (along > 0 ? 'ahead of' : 'behind') + ' it.');
        why('neither semicircle: ahead of it the centre is coming at you, behind');
        why('it the centre is going away (Bowditch)');
      } else if (cross > 0) {
        warn('You are on the right of its track, ' + stR(off) + ' nm off it: the dangerous semicircle.');
        why('looking the way it goes; on the right its own speed adds to its wind');
        why('and the wind and sea carry you toward its path (Bowditch)');
      } else {
        say('You are on the left of its track, ' + stR(off) + ' nm off it: the less dangerous semicircle.');
        why('looking the way it goes; on the left its speed takes from its wind,');
        why('and the wind carries you away from its path (Bowditch)');
      }
      if (along > 0 && ((rr !== '' && off < rr) || (rr === '' && off < 30)))
        warn('And you are ahead of it, near its path: its winds reach your water.');
    } else say('It is reported stationary, so it has no track to be either side of.');
    gap();
    var rx = vx - ux, ry = vy - uy, vv = rx * rx + ry * ry;
    if (vv < 0.25) {
      say('It is keeping its distance from you: about ' + stR(dist) + ' nm while both hold on.');
    } else {
      var t = -(nx * rx + ny * ry) / vv;
      if (t <= 0) {
        say('It is drawing away from you: its closest was before now.');
        if (rr !== '' && dist < rr) warn('You are inside its 34-knot winds.');
      } else {
        var px = nx + rx * t, py = ny + ry * t, cpa = Math.sqrt(px * px + py * py);
        geo.cpa = { t: t, d: cpa, rel: [px, py] };
        if (cpa < 0.5) warn('If both hold on, its centre passes over you in ' + stR(t) + ' hours.');
        else acc('If both hold on, it comes closest in ' + stR(t) + ' hours: ' + stR(cpa) + ' nm, bearing ' + d3(stB(Math.atan2(px, py) * 57.29577951308232)) + '.');
        if (rr !== '') {
          if (dist < rr) warn('You are inside its 34-knot winds now.');
          else if (cpa < rr) warn('That is inside its 34-knot winds, which reach ' + g(rr) + ' nm.');
          else say('That is outside its 34-knot winds, which reach ' + g(rr) + ' nm.');
        }
        why('a storm can turn, speed up or stop; work it again with each advisory');
      }
    }
    gap();
    if (wd === '') {
      say('Give me your wind and I will check the report against it.');
    } else {
      var lo = wd + 110, hi = wd + 135;
      say('Your wind from ' + d3(stB(wd)) + ' puts the centre between ' + d3(stB(lo)) + ' and ' + d3(stB(hi)) + '.');
      why('back to the wind, the centre about 110 degrees round from dead astern');
      why('in front of a storm and 120 to 135 behind it (Bowditch)');
      var o = stOut(brg, lo, hi);
      geo.band = [lo, hi]; geo.bandOff = o;
      if (o === 0) acc('The report agrees with your wind.');
      else if (o <= 15) say('The report is ' + stR(o) + ' degrees outside that: near enough, for a wind read by eye.');
      else {
        warn('The report and your wind disagree, by ' + stR(o) + ' degrees.');
        why("one of them is wrong or old: the advisory's age, a storm that has");
        why('turned, or your log. The wind on deck is the newer evidence.');
      }
    }
    out.geo = geo;
    return out;
  }
  function stormTerminal(items) {
    var L = [''];
    L.push('  A REPORTED STORM');
    L.push(RULE);
    items.forEach(function (it) {
      if (it.k === 'gap') L.push('');
      else if (it.k === 'why') L.push('     ' + it.t);
      else L.push('  ' + it.t);
    });
    L.push('');
    if (!items.geo) return L.join('\n') + '\n';
    L.push(RULE);
    L.push('  Not a forecast. An advisory is hours old when it arrives, and a storm');
    L.push('  can turn; plot each one as it comes (Bowditch). Worked on a flat chart');
    L.push('  round you: good to a few miles within a few hundred.');
    L.push('');
    return L.join('\n') + '\n';
  }

  return { poleward: poleward, report: report, renderTerminal: renderTerminal,
           isoWind: isoWind, isoReport: isoReport, isoTerminal: isoTerminal,
           ISO_SP: ISO_SP, ISO_LAT: ISO_LAT, stormReport: stormReport, stormTerminal: stormTerminal };
})();

if (typeof module !== 'undefined') module.exports = CHART;

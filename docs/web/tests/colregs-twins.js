//  THE LOOK-ALIKES: no draw marks a correct reading wrong.
//
//  Larry's ruling TBKP (24 November 2026). From some bearings two vessels
//  show exactly the same lamps, and PILOT's QA (part 2, item 1) found the
//  lights drill saying "Not her" when the reader tapped the other one --
//  marking a correct reading wrong. Now the drill asks first whether the
//  vessel tapped would look the same from here; if so the tap is right,
//  and it says what would tell them apart. The sounds drill does the same
//  for the one pattern two signals share. This holds it to that:
//
//    1. every pair of vessels, from every whole-degree bearing: the drill
//       calls them look-alikes exactly when a lookout would describe their
//       lamps the same way (colours, vertical order, flashing), and the
//       line it gives names the nearest bearing where they read
//       differently, with both descriptions; "only the spacing differs"
//       and "never" are said only when true;
//    2. the drill itself, on a stand-in page, from every vessel and every
//       bearing, each of the five rows tapped: a look-alike is marked
//       right with the true answer lit beside it, anything else "Not her";
//    3. the sounds: every pair of signals with the same pattern is
//       accepted, and every other is not.
//
//    node docs/web/tests/colregs-twins.js
'use strict';
var fs = require('fs'), path = require('path');
var DATA = (function () {
  var t = fs.readFileSync(path.join(__dirname, '..', 'colregs', 'data.js'), 'utf8');
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
})();

//  a stand-in page: just enough DOM for drill() and the two reveals
function Elt() { this.children = []; this.dataset = {}; this.style = {};
                 this.hidden = false; this.disabled = false; this._t = ''; this.on = {}; }
Elt.prototype.appendChild = function (c) { this.children.push(c); return c; };
Elt.prototype.addEventListener = function (k, f) { this.on[k] = f; };
Elt.prototype.setAttribute = function () {};
Object.defineProperty(Elt.prototype, 'textContent', {
  get: function () { return this._t + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this._t = String(v); this.children = []; }
});
var byId = {};
var doc = {
  getElementById: function (id) { return byId[id] || (byId[id] = new Elt()); },
  createElement: function () { return new Elt(); },
  createElementNS: function () { return new Elt(); },
  querySelectorAll: function () { return []; },
  documentElement: { style: {}, setAttribute: function () {} },
  addEventListener: function () {}
};
var win = { addEventListener: function () {}, COLREGS_DATA: DATA };
global.localStorage = undefined;
var m = { exports: {} };
new Function('module', 'window', 'document',
  fs.readFileSync(path.join(__dirname, '..', 'colregs', 'colregs.js'), 'utf8'))(m, win, doc);
var F = m.exports;

var fail = 0, checks = 0, shown = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; if (shown++ < 12) console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}

//  1. every pair, every bearing
var V = DATA.vessels, pairs = 0, never = 0, spacedOnly = 0;
for (var a = 0; a < V.length; a++) for (var b = 0; b < V.length; b++) {
  if (a === b) continue;
  for (var th = -180; th <= 180; th++) {
    var same = F.lightsLookSame(V[a], V[b], th), tw = F.lightTwin(V[a], V[b], th);
    ok('the drill calls ' + V[a].key + ' and ' + V[b].key + ' look-alikes from ' + th +
       ' exactly when their lamps match', !!tw === same, 'same=' + same + ' twin=' + tw);
    if (!tw) continue;
    pairs++;
    var everDiff = false, wordsDiff = false;
    for (var u = -180; u <= 180; u++) {
      if (F.light_sig(V[a], u) !== F.light_sig(V[b], u)) everDiff = true;
      if (!F.lightsLookSame(V[a], V[b], u)) wordsDiff = true;
    }
    if (/^Her lights never/.test(tw)) {
      never++;
      ok(V[a].key + ' and ' + V[b].key + ': "never tell them apart" is only said when it is true',
         !everDiff && !wordsDiff);
      continue;
    }
    if (/^From every bearing/.test(tw)) {
      spacedOnly++;
      ok(V[a].key + ' and ' + V[b].key + ': "only the spacing" is only said when it is true',
         everDiff && !wordsDiff);
      continue;
    }
    //  the bearing it names must be the nearest where the two would be
    //  described differently, and the line must carry both descriptions
    var found = null;
    for (var d = 1; d <= 180 && found === null; d++) {
      if (F.lampWords(V[a], th + d) !== F.lampWords(V[b], th + d)) found = F.nrm180(th + d);
      else if (F.lampWords(V[a], th - d) !== F.lampWords(V[b], th - d)) found = F.nrm180(th - d);
    }
    ok(V[a].key + '/' + V[b].key + ' from ' + th + ': a bearing where they read differently is found',
       found !== null && wordsDiff);
    var wa = F.lampWords(V[a], found), wb = F.lampWords(V[b], found);
    ok(V[a].key + '/' + V[b].key + ' from ' + th + ': the line names both pictures',
       tw === 'If you were ' + F.rel_phrase(found, 'her', 2.5) + ', she would show ' + wa + ', and ' +
              F.aName(V[b]) + ' would show ' + wb + '.', tw);
  }
}

//  the names, made into the subject of that sentence
V.forEach(function (v) {
  var n = F.aName(v);
  ok('"' + n + '" reads as a vessel', /^(a [b-df-hj-np-tv-z]|an [aeiou]|a [A-Z]{2})/.test(n) &&
     !/\b[a-z][A-Z]/.test(n), n);
});

//  2. the drill itself: every vessel, every bearing, every row
function rows(pfx) { return byId[pfx + '-opts'].children; }
var taps = 0, twinTaps = 0;
for (var i = 0; i < V.length; i++) for (var t2 = -180; t2 <= 180; t2++) for (var k = 0; k < 5; k++) {
  F.lightsDrill(i, t2);
  var R = rows('light'), row = R[k], name = row.children[1].textContent;
  var p = V.findIndex(function (v) { return v.name === name; });
  row.on.click();
  taps++;
  var verdict = byId['light-verdict'];
  if (p === i) {
    ok(V[i].key + ' from ' + t2 + ': the true answer is right', row.dataset.state === 'right');
  } else if (F.lightsLookSame(V[i], V[p], t2)) {
    twinTaps++;
    var lit = 0;
    for (var q = 0; q < 5; q++) if (R[q].children[1].textContent === V[i].name && R[q].dataset.state === 'right') lit++;
    ok(V[i].key + ' from ' + t2 + ': ' + V[p].key + ' looks the same, so tapping her is right',
       row.dataset.state === 'right' && verdict.dataset.state === 'right' &&
       /^Right: from here she could be either\. /.test(verdict.textContent),
       row.dataset.state + ' / ' + verdict.textContent);
    ok(V[i].key + ' from ' + t2 + ': and the true answer is lit beside her', lit === 1);
  } else {
    ok(V[i].key + ' from ' + t2 + ': ' + V[p].key + ' looks different, so "Not her"',
       row.dataset.state === 'wrong' && verdict.textContent === 'Not her. Look again.',
       row.dataset.state + ' / ' + verdict.textContent);
  }
}
ok('the drill offered look-alikes at all (the check above is not empty)', twinTaps > 0, String(twinTaps));

//  3. the sounds
var S = DATA.sounds, spairs = 0;
for (var x = 0; x < S.length; x++) for (var y = 0; y < S.length; y++) {
  if (x === y) continue;
  var st = F.soundTwin(S[x], S[y]);
  ok('sounds ' + (x + 1) + ' and ' + (y + 1) + ' are taken as one exactly when the pattern is one',
     !!st === (S[x].pattern === S[y].pattern), st);
  if (st) {
    spairs++;
    ok('and the line names both rules', st.indexOf(S[x].rule) > 0 && st.indexOf(S[y].rule) > 0, st);
  }
}
ok('the bend and the power-driven fog signal are the pair', spairs === 2, String(spairs));
for (var si = 0; si < S.length; si++) for (var sk = 0; sk < 5; sk++) {
  F.soundsDrill(si);
  var SR = rows('sound'), srow = SR[sk], sname = srow.children[1].textContent;
  var sp = S.findIndex(function (s) { return s.meaning === sname; });
  srow.on.click();
  var sv = byId['sound-verdict'];
  if (sp === si) ok('sound ' + (si + 1) + ': the true answer is right', srow.dataset.state === 'right');
  else if (S[sp].pattern === S[si].pattern)
    ok('sound ' + (si + 1) + ': the same pattern is right', srow.dataset.state === 'right' &&
       /^Right: that signal means either\. /.test(sv.textContent), sv.textContent);
  else ok('sound ' + (si + 1) + ': another pattern is "Not her"', srow.dataset.state === 'wrong');
}

console.log('  ' + pairs + ' look-alike pair-bearings (' + never + ' that never differ, ' +
            spacedOnly + ' told apart only by spacing), ' +
            taps + ' taps on the lights drill (' + twinTaps + ' on a look-alike)');
console.log((fail ? '  ' + fail + ' FAILED of ' : '  all ') + checks + ' checks');
process.exit(fail ? 1 : 0);

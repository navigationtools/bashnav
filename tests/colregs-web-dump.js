/*  The real tables, because lt_note reads the vessel it is asked about
    out of them -- the shell's lt_note reads VT, and they are the same
    table by construction (data.js is dumped from it).  */
const DATA = (() => {
  const t = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'docs/web/colregs/data.js'), 'utf8');
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
})();
global.window = { addEventListener: function () {}, COLREGS_DATA: DATA };
global.document = { getElementById: function () { return null; },
                    createElement: function () { return { style: {}, dataset: {},
                      appendChild: function () {}, addEventListener: function () {},
                      setAttribute: function () {} }; },
                    documentElement: { style: {}, setAttribute: function () {} },
                    addEventListener: function () {} };
global.localStorage = undefined;
const path = process.argv[2];
const src = require('fs').readFileSync(path, 'utf8');
const m = { exports: {} };
new Function('module', 'window', 'document', src)(m, global.window, global.document);
const F = m.exports;
const out = [];
for (let b = 0; b < 360; b++) out.push('relp\t' + b + '\t' + F.rel_phrase(b, 'your'));
for (let b = 0; b < 360; b++) out.push('relpthe\t' + b + '\t' + F.rel_phrase(b, 'the'));
for (let t = -180; t <= 180; t++) out.push('aspect\t' + t + '\t' + F.aspect_words(t));
for (let t = -180; t <= 180; t++) out.push('ltarc\t' + t + '\t' + F.lt_arc(t));
DATA.encounters.forEach((e, i) =>
  out.push('heard\t' + (i + 1) + '\t' + (F.heard(e.target) ? 1 : 0)));
for (const v of DATA.vessels) for (let t = -180; t <= 180; t++)
  out.push('ltnote\t' + v.key + '\t' + t + '\t' + F.lt_note(v.key, t));
for (const v of DATA.vessels) for (let t = -180; t <= 180; t++)
  out.push('ltsig\t' + v.key + '\t' + t + '\t' + F.light_sig(v, t));
for (const a of ['M','S','P','T','Y','A']) for (let t = -180; t <= 180; t++)
  out.push('arc\t' + a + '\t' + t + '\t' + (F.arc_vis(a, t) ? 1 : 0));
for (const st of ['rn', 'usn', 'rel360', 'words', 'none']) {
  for (let t = -180; t <= 180; t++) out.push('relstyle\t' + st + '\t' + t + '\t' + F.rel_style(t, st));
  for (let t = -180; t <= 180; t++) out.push('relother\t' + st + '\t' + t + '\t' + F.rel_other_as(t, st));
}
for (let t = -180; t <= 180; t++) out.push('redgreen\t' + t + '\t' + F.red_green(t));
for (const st of ['rn', 'usn', 'rel360', 'words', 'none']) {
  for (let t = -10; t <= 370; t++) out.push('encbore\t'  + st + '\t' + t + '\t' + F.enc_bore(t, st));
  for (let t = -10; t <= 370; t++) out.push('encboreh\t' + st + '\t' + t + '\t' + F.enc_bore(t + 0.5, st));
  for (let t = -10; t <= 370; t++) out.push('encbored\t' + st + '\t' + t + '\t' + F.enc_bore(t + 0.4, st));
}
console.log(out.join('\n'));

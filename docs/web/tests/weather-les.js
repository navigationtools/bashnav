/*  Reconstruct each lesson's plain text from lessons.js and compare it
    with what `weather learn <key>` actually prints in plain mode. The
    generator converts ANSI colour into styled spans; this proves the
    conversion carried every character, not only most of them. */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..', '..', '..');
const L = require(path.resolve(__dirname, '..', 'weather', 'lessons.js')).LESSONS;
const ENG = ['-f', REPO + '/src/common/log.awk', '-f', REPO + '/src/common/colour.awk',
             '-f', REPO + '/src/weather/grid.awk', '-f', REPO + '/src/weather/wx.awk', '-f', REPO + '/src/weather/score.awk',
             '-f', REPO + '/src/weather/chart.awk', '-f', REPO + '/src/weather/teach.awk',
             '-f', REPO + '/src/weather/screens.awk'];
//  FIGDUMP=1 HERE TOO, since the gradient lesson carries a figure in its
//  first tier (W01, the friction figure, 16 November 2026).  Until then
//  only the deeper tier drew one, and only that pass asked for markers;
//  the first-tier pass compared the terminal's character art against the
//  page's marker and failed by construction.  See awkMore below.
function awkLesson(k) {
  return execFileSync('mawk', ['-v', 'cmode=plain', '-v', 'FIGDUMP=1', '-v', 'cmd=lesson', '-v', 'key=' + k,
    '-v', 'LOG=/dev/null'].concat(ENG), { input: '', encoding: 'utf8' });
}
const RULE = '  ' + new Array(71).join('-');
//  The body stops before the question, which lessons.js carries
//  separately so the page can ask before it tells. So the comparison
//  puts it back: the whole printed lesson, reconstructed, against the
//  whole printed lesson.
function render(les) {
  var L = les.body.map(function (b) {
    if (b.s === 'gap') return '';
    if (b.s === 'rule') return RULE;
    //  the demonstration, written back as the marker it came from
    if (b.s === 'demo') return '@@FIG ' + b.kind + ' ' + b.w + ' ' + b.h;
    return b.p.map(function (p) { return p.t; }).join('');
  });
  L.push(RULE);
  L.push('  Question: ' + les.q);
  L.push('');
  return L.join('\n') + '\n';
}
//  THE SECOND TIER IS CHECKED THE SAME WAY, and that is the whole reason
//  it was written in the awk rather than straight into JavaScript: deeper
//  content is exactly where a quiet divergence between the two builds
//  would matter most, and this is the only thing that would notice.
//  FIGDUMP=1, THE WAY THE GENERATOR RUNS IT. gshow() then prints
//  "@@FIG grid W H" instead of the character grid, which is how the shell
//  marks where a demonstration goes without deciding how it is drawn. The
//  browser renders an interactive panel there, so without this the
//  comparison would be the terminal's character art against one panel and
//  would fail by construction - while still saying nothing about the
//  prose, which is what this check is for.
//
//  The terminal's own drawing is covered elsewhere: gun_figure() is
//  deterministic under all three awks, and tests/weather-reflow-check.js
//  holds the shell's marker and the browser's panel to one another.
function awkMore(k) {
  return execFileSync('mawk', ['-v', 'cmode=plain', '-v', 'FIGDUMP=1', '-v', 'cmd=lessonmore', '-v', 'key=' + k,
    '-v', 'LOG=/dev/null'].concat(ENG), { input: '', encoding: 'utf8' });
}
function renderMore(les) {
  return les.more.map(function (b) {
    if (b.s === 'gap') return '';
    if (b.s === 'rule') return RULE;
    //  the demonstration, written back as the marker it came from
    if (b.s === 'demo') return '@@FIG ' + b.kind + ' ' + b.w + ' ' + b.h;
    return b.p.map(function (p) { return p.t; }).join('');
  }).join('\n') + '\n';
}
let bad = 0, moreN = 0;
L.forEach(function (les) {
  if (les.more) {
    moreN++;
    const wantM = awkMore(les.key);
    const gotM = renderMore(les);
    if (gotM !== wantM) {
      bad++;
      const a = gotM.split('\n'), b = wantM.split('\n');
      console.log('  FAIL ' + les.key + ' (the deeper section)');
      for (let i = 0; i < Math.max(a.length, b.length); i++)
        if (a[i] !== b[i]) { console.log('    js  |' + a[i] + '|'); console.log('    awk |' + b[i] + '|'); break; }
    }
  }
  const want = awkLesson(les.key);
  const got = render(les);
  if (got !== want) {
    bad++;
    const a = got.split('\n'), b = want.split('\n');
    console.log('  FAIL ' + les.key);
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if (a[i] !== b[i]) { console.log('    js  |' + a[i] + '|'); console.log('    awk |' + b[i] + '|'); break; }
  }
});
/* =====================================================================
   AND NOW THE EMPHASIS, WHICH THIS CHECK USED TO CLAIM AND NOT CHECK.
   ---------------------------------------------------------------------
   The line above printed "emphasis preserved" on the strength of
   counting spans by style, which is not the same thing as comparing them
   to anything. Everything above runs the awk in cmode=plain, where
   C_ACC is the empty string - so the emphasis is not in the text being
   compared at all, and stripping every accent out of lessons.js left the
   whole suite green. Found by doing exactly that: an accent was taken off
   one table heading by hand and nothing anywhere noticed.

   tests/weather-reflow-check.js does check emphasis, but in the other
   direction: it holds the RENDERER to lessons.js, so if lessons.js has
   lost an accent both sides agree and it passes. Nothing was comparing
   lessons.js with the awk it is generated from.

   So this pass runs the awk again in cmode=day and walks the escape
   sequences the same way docs/web/weather/gen/dumplessons.awk does -
   deliberately the same table of codes, because a check that invented its
   own mapping would be testing its own opinion of what 1;32 means.
   ===================================================================== */
const DAYCODE = { '1;32': 'acc', '90': 'dim', '1;91': 'warn', '1;92': 'ok' };

function awkColoured(k, more) {
  const a = ['-v', 'cmode=day', '-v', 'cmd=' + (more ? 'lessonmore' : 'lesson'),
             '-v', 'key=' + k, '-v', 'LOG=/dev/null'];
  a.push('-v', 'FIGDUMP=1');   /* both tiers can carry a figure now */
  return execFileSync('mawk', a.concat(ENG), { input: '', encoding: 'utf8' });
}

/*  every styled WORD the awk emitted, as "style:word" - words rather than
    runs, because the generator may split a run at a line end and rejoin it
    into a different span shape without losing a single emphasis  */
function awkStyled(t) {
  const out = [];
  let style = 'plain', buf = '';
  const flush = () => {
    if (buf && style !== 'plain')
      buf.split(/\s+/).filter(Boolean).forEach(w => out.push(style + ':' + w));
    buf = '';
  };
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\x1b' && t[i + 1] === '[') {
      let j = i + 2, code = '';
      while (j < t.length && t[j] !== 'm') { code += t[j]; j++; }
      flush();
      style = DAYCODE[code] || 'plain';
      i = j;
    } else { buf += t[i]; }
  }
  flush();
  return out.sort();
}

function jsStyled(blocks) {
  const out = [];
  (blocks || []).filter(b => b.s === 'line').forEach(b =>
    (b.p || []).filter(Boolean).forEach(s => {
      if (s.s && s.s !== 'plain')
        s.t.split(/\s+/).filter(Boolean).forEach(w => out.push(s.s + ':' + w));
    }));
  return out.sort();
}

let embad = 0, emWords = 0;
L.forEach(function (les) {
  [['body', les.body, false], ['the deeper section', les.more, true]].forEach(function (pair) {
    if (!pair[1]) return;
    /*  "Question:" is dropped from the awk side for the same reason
        render() puts it back by hand on the text side: the shell prints
        the label accented at the foot of the lesson, and lessons.js keeps
        the question in its own field so the page can ask before it tells.
        It is the label's styling, not a word of the lesson.  */
    const want = awkStyled(awkColoured(les.key, pair[2]))
                   .filter(w => w !== 'acc:Question:');
    const got = jsStyled(pair[1]);
    emWords += want.length;
    if (want.length !== got.length || want.some((w, i) => w !== got[i])) {
      embad++;
      console.log('  FAIL ' + les.key + ' (' + pair[0] + '): the emphasis differs');
      const missing = want.filter(w => got.indexOf(w) < 0);
      const extra = got.filter(w => want.indexOf(w) < 0);
      if (missing.length) console.log('    the awk emphasises, the page does not: ' +
                                      JSON.stringify(missing.slice(0, 6)));
      if (extra.length) console.log('    the page emphasises, the awk does not: ' +
                                    JSON.stringify(extra.slice(0, 6)));
    }
  });
});

const styles = {};
L.forEach(l => l.body.forEach(b => (b.p || []).forEach(p => { styles[p.s] = (styles[p.s] || 0) + 1; })));
console.log(L.length + ' lessons reconstructed from lessons.js and compared with the awk');
console.log('  ' + moreN + ' of them carry a deeper section, compared the same way');
console.log('  spans by style: ' + Object.keys(styles).sort().map(k => k + ' ' + styles[k]).join(', '));
console.log('  ' + emWords + ' emphasised words compared against the awk in colour' +
            (embad ? '' : ', all agree'));
console.log(bad + embad ? (bad + embad) + ' LESSONS DIFFER' : 'every lesson is character-identical, and every emphasis matches the awk');
process.exit(bad + embad ? 1 : 0);

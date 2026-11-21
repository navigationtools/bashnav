/*  Do the rules lessons' figures draw, are they styled, and do they
    teach the arcs the lights drill uses? (B30, colregs 1.16.)

    rules-figs.js draws the figures the rules lessons name with an
    "@@FIG" line in data.js. Four things are checked:

      1. every figure a lesson names has something that can draw it,
         and every figure the shell can draw (lt_arcs) reached a lesson;
      2. drawing it produces an svg with an aria-label, since a figure
         with no text alternative is a picture of nothing to a reader;
      3. every class the drawing puts on an element is defined in
         colregs.css, or it draws unstyled and sits out the night palette
         (the fault contacts-figs-check.js was written for);
      4. THE ARCS ARE THE DRILL'S. Every half degree round her, the
         sector the figure draws is the light arc_vis() in colregs.js
         says shows from there: masthead, starboard, port, stern. The one
         allowance is the 2.5 degrees either side of dead ahead, where
         the drill shows both sidelights (Annex I) and the picture puts
         the boundary on the bow, where Rule 21 puts it.  */
const fs = require('fs');

const made = [];
function node(tag) {
  const n = { tag: tag, attrs: {}, kids: [], textContent: '',
              setAttribute: (k, v) => { n.attrs[k] = String(v); },
              appendChild: c => { n.kids.push(c); return c; } };
  made.push(n);
  return n;
}
global.document = { createElementNS: (ns, tag) => node(tag), createElement: tag => node(tag) };

const win = {};
new Function('window', fs.readFileSync('docs/web/colregs/data.js', 'utf8'))(win);
new Function('window', fs.readFileSync('docs/web/colregs/rules-figs.js', 'utf8'))(win);
const F = win.RULES_FIGS;

const css = fs.readFileSync('docs/web/colregs/colregs.css', 'utf8');
const defined = new Set();
(css.match(/\.[A-Za-z][-\w]*/g) || []).forEach(c => defined.add(c.slice(1)));

let bad = 0, drawn = 0;
const named = new Set();
for (const L of win.COLREGS_DATA.lessons) {
  for (const line of L.body.split('\n')) {
    const m = line.match(/^@@FIG (\S+)(.*)$/);
    if (!m) continue;
    const b = { kind: m[1] };
    m[2].trim().split(/\s+/).forEach(kv => { const j = kv.indexOf('='); if (j > 0) b[kv.slice(0, j)] = kv.slice(j + 1); });
    named.add(b.kind + ' ' + (b.mode || ''));
    const draw = F[b.kind];
    if (typeof draw !== 'function' || b.kind[0] === '_') {
      console.log('FAIL  ' + L.id + ': nothing can draw a "' + b.kind + '"'); bad++; continue;
    }
    made.length = 0;
    try { draw(b); } catch (e) { console.log('FAIL  ' + L.id + ' ' + b.kind + ': ' + e.message); bad++; continue; }
    drawn++;
    const svgs = made.filter(n => n.tag === 'svg');
    if (!svgs.length) { console.log('FAIL  ' + L.id + ': the ' + b.kind + ' drew no svg'); bad++; continue; }
    if (!svgs[0].attrs['aria-label']) { console.log('FAIL  ' + L.id + ': the ' + b.kind + ' svg has no aria-label'); bad++; }
    for (const n of made) for (const c of (n.attrs['class'] || '').split(/\s+/)) {
      if (c && !defined.has(c)) {
        console.log('FAIL  ' + L.id + ': class "' + c + '" on a <' + n.tag + '> is not in colregs.css'); bad++;
      }
    }
  }
}
/*  the two the shell draws today: L14's arcs and L8's overtaking sector  */
for (const want of ['arcs lights', 'arcs overtake']) {
  if (!named.has(want)) { console.log('FAIL  no lesson carries the "' + want + '" figure'); bad++; }
}

/*  4. the arcs, against the drill's own arc_vis(), lifted out of
       colregs.js by name so this compares with the real thing  */
const src = fs.readFileSync('docs/web/colregs/colregs.js', 'utf8');
const pick = name => { const m = src.match(new RegExp('function ' + name + '\\([^]*?\\n}\\n')); return m ? m[0] : ''; };
const lib = ['d2r', 'fabs', 'nrm360', 'nrm180', 'arc_vis'].map(pick);
if (lib.some(f => !f)) { console.log('FAIL  could not find arc_vis() and its helpers in colregs.js'); process.exit(1); }
const arc_vis = new Function(lib.join('\n') + '\nreturn arc_vis;')();
const ARC = { mast: 'M', stbd: 'S', port: 'P', stern: 'T' };
let walked = 0;
for (let th = -180; th < 180; th += 0.5) {
  for (const k of Object.keys(ARC)) {
    const fig = F._inArc(k, th), drill = arc_vis(ARC[k], th);
    if (fig === drill) continue;
    if ((k === 'stbd' || k === 'port') && Math.abs(th) <= 2.5) continue;   // Annex I, dead ahead
    console.log('FAIL  at ' + th + ' degrees the figure ' + (fig ? 'draws' : 'leaves out') +
                ' the ' + k + ' light; the drill ' + (drill ? 'shows' : 'does not show') + ' it');
    bad++;
  }
  walked++;
}

if (bad) { console.log('  ' + bad + ' problem(s)'); process.exit(1); }
console.log('  ok    all ' + drawn + ' rules-lesson figures draw and are styled, and the arcs agree ' +
            'with the drill at all ' + walked + ' half-degree bearings');

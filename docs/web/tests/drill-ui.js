/*  Drive the drill app.
 *
 *  The harness builds its OWN synthetic pack, so this test -- which lives
 *  in a public repository -- carries nobody's material. Pass a real pack
 *  as argv[2] to run the same checks against it.
 *
 *  The check that matters most is not a score. It is that no answer is in
 *  the DOM before it is asked for: hidden is not good enough, because an
 *  answer you can reveal with a long press is an answer you have read.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8091/drill/';
const TMP = process.env.TMPDIR || '/tmp';

//  A pack of three sections with wholly invented content.
function synthPack() {
  const sections = [
    { id: 'alpha', title: 'First things', parts: ['Part 1 — First things'],
      html: '<h2 class="part">Part 1 — First things</h2><p>The first rule is to <strong>check the thing</strong> before moving on.</p><table><tr><th>step</th><th>what</th></tr><tr><td>1</td><td>Check the thing</td></tr><tr><td>2</td><td>Move the other thing</td></tr></table>' },
    { id: 'bravo', title: 'Second things', parts: ['Part 2 — Second things'],
      html: '<h2 class="part">Part 2 — Second things</h2><p>Second things follow first things.</p>' },
    { id: 'charlie', title: 'Third things', parts: ['Part 3 — Third things'],
      html: '<h2 class="part">Part 3 — Third things</h2><p>Third things are last.</p>' },
  ];
  const questions = [];
  sections.forEach((s, si) => {
    for (let i = 1; i <= 12; i++) {
      questions.push({ section: s.id, kind: 'fact',
        q: `${s.title} — what is fact ${i}?`,
        a: `Fact ${i} of section ${si + 1} is that the thing is checked`,
        where: { part: s.parts[0], sub: 'Facts', row: String(i) } });
    }
    questions.push({ section: s.id, kind: 'authored', q: `Recall everything about ${s.title}.`,
      a: '', where: { part: s.parts[0], sub: 'Drill', row: 'drill' } });
    questions.push({ section: s.id, kind: 'hand', q: `${s.title} — why does the order matter?`,
      a: 'Because the later thing depends on the earlier one',
      where: { part: s.parts[0], sub: 'Discussion', row: 'hand-written' } });
    //  One ordering question, so the pass and fail runs below exercise
    //  the ordering interaction too: 100% is only reachable if the right
    //  order marks right, and 0% only if the reversed one marks wrong.
    questions.push({ section: s.id, kind: 'sequence',
      q: `${s.title} — put these in the order they happen.`,
      a: 'Invented step one → Invented step two → Invented step three',
      seq: ['Invented step one', 'Invented step two', 'Invented step three'],
      extra: ['An invented step from a different procedure'],
      where: { part: s.parts[0], sub: 'The chain', row: 'order' } });
    //  One question that carries its own wrong options, so the public
    //  test covers that path without needing anybody's real pack.
    questions.push({ section: s.id, kind: 'oddone',
      q: `${s.title} — three of these are on the checklist and one is not. Which is not?`,
      a: 'The invented item that does not belong on this list',
      ch: ['The first invented item on the list', 'The second invented item on the list',
           'The third invented item on the list'],
      where: { part: s.parts[0], sub: 'Checklist', row: 'checklist' } });
  });
  //  A RUNNER CHAIN, SO THE REVERSED-LABEL CHECK ACTUALLY RUNS.  That
  //  check was written against the deck pack, which this repository does
  //  not hold and never will -- so on the synthetic pack it found nothing
  //  and reported the field as missing. A skip would have been honest and
  //  useless: the logic it guards is the one that caught "lazy" offered
  //  for "working" on the runner that is holding the mast up, and a check
  //  that never runs guards nothing.
  //
  //  Invented wording, invented evolution: no material of anybody's. It
  //  carries `station` under `where`, which is where the app reads it
  //  from, so it also proves the field is being carried.
  questions.push({ section: sections[0].id, kind: 'station',
    q: 'In the invented evolution \u2014 you are on the runners. The call is "Set up": what happens?',
    a: 'The working runner is taken up before the load comes on',
    ch: ['The lazy runner is taken up before the load comes on',
         'Nothing invented happens at this point',
         'Another invented thing happens instead'],
    where: { part: sections[0].parts[0], sub: 'By station',
             station: 'Running backstay \u2014 new windward' } });
  return { format: 'bashnav-drill-pack/1', title: 'Test pack', note: 'Synthetic. Not real material.',
           built: '2026-10-20', pass: 80, sections, questions, back: '<p>Back matter.</p>' };
}

//  Answer whatever kind of question is on screen. Without this the
//  drive loops below click `.choice`, an ordering question has none, and
//  the suite stops covering the graded test the moment a pack contains
//  one -- silently, because the loop just finds nothing to click.
const ANSWER_FN = `
window.answerCurrent = function (right) {
  const q = RUN.qs[RUN.i].q || RUN.qs[RUN.i];
  if (q.seq && q.seq.length) {
    const order = right ? q.seq : q.seq.slice().reverse();
    order.forEach(t => {
      const b = document.querySelector('#drill-body [data-seq-item="' +
        t.replace(/"/g, '\\"') + '"]');
      if (b) b.click();
    });
    if (!right) {
      const x = document.querySelector('#drill-body [data-seq-item]');
      if (x) x.click();
    }
    document.querySelector('#drill-body [data-seq-check]').click();
    return;
  }
  const cs = RUN.qs[RUN.i].choices;
  const n = right ? cs.findIndex(c => c.ok) : cs.findIndex(c => !c.ok);
  document.querySelectorAll('#drill-body .choice')[n < 0 ? 0 : n].click();
};`;

(async () => {
  const packPath = process.argv[2] || path.join(TMP, 'synth.drillpack.json');
  if (!process.argv[2]) fs.writeFileSync(packPath, JSON.stringify(synthPack()));
  const real = !!process.argv[2];
  console.log('pack: ' + (real ? packPath : 'synthetic, built by this harness'));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  //  On EVERY document, not just the first: the progress-survives-reload
  //  check navigates, and a helper injected once is gone after it.
  await page.addInitScript(ANSWER_FN);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.PACK !== 'undefined', { timeout: 15000 });
  let bad = 0;
  const fail = m => { bad++; console.log('  FAIL ' + m); };
  console.log('build ' + await page.evaluate(() => window.BUILD));
  //  define answerCurrent() inside the page, for the drive loops below
  await page.evaluate(src => { window.eval(src); }, ANSWER_FN);

  // ---- A CHANGED APP MUST BUMP THE SERVICE WORKER CACHE --------------
  //  The worker is cache-first, so an installed copy keeps serving the
  //  drill.js it already cached. The browser only reinstalls the worker
  //  when sw.js itself changes, which means shipping a fix without
  //  touching sw.js ships nothing to anyone who has already used the
  //  tool -- and to them it looks like the fix did not work.
  {
    const dir = path.resolve(__dirname, '..', 'drill');
    const swTxt = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
    const jsTxt = fs.readFileSync(path.join(dir, 'drill.js'), 'utf8');
    const swV = (swTxt.match(/CACHE\s*=\s*'drill-v(\d+)'/) || [])[1];
    const bV = (jsTxt.match(/BUILD\s*=\s*'(\d+)/) || [])[1];
    if (!swV || !bV) fail('could not read the cache version or the build number');
    else if (swV !== bV)
      fail('sw.js caches drill-v' + swV + ' but drill.js says build ' + bV +
           ' -- an installed copy would keep serving the old app');
    else console.log('  ok   the service worker cache and the build number agree (v' + swV + ')');
  }

  // ---- it ships empty ------------------------------------------------
  const emptyShown = await page.evaluate(() => !document.getElementById('v-empty').hidden);
  if (!emptyShown) fail('a fresh load did not show the empty state');
  else console.log('  ok   ships empty: no pack, no questions, nothing to drill');

  // ---- loading a pack -------------------------------------------------
  await page.setInputFiles('#f-pack', packPath);
  await page.waitForFunction(() => window.PACK && !document.getElementById('v-home').hidden,
                             { timeout: 15000 });
  const nsec = await page.evaluate(() => PACK.sections.length);
  console.log('  ok   pack loaded: ' + nsec + ' sections, ' +
              (await page.evaluate(() => PACK.questions.length)) + ' questions');

  // a damaged pack must be refused whole
  const badPath = path.join(TMP, 'bad.drillpack.json');
  fs.writeFileSync(badPath, JSON.stringify({ format: 'bashnav-drill-pack/1',
    sections: [{ id: 'a', title: 'A' }], questions: [{ section: 'nope', q: 'x', a: 'y' }] }));
  const refused = await page.evaluate(p => {
    const v = window.validate ? validate(p) : 'validate() not exposed';
    return v;
  }, JSON.parse(fs.readFileSync(badPath, 'utf8')));
  if (!refused || /not exposed/.test(refused)) fail('a pack pointing at a missing section was not refused: ' + refused);
  else console.log('  ok   a pack with orphan questions is refused whole: "' + refused + '"');

  // ---- A QUESTION'S OWN WRONG OPTIONS ARE THE ONLY ONES USED ---------
  //  Some questions cannot have their options drawn from the section
  //  pool, because the pool contains other right answers: "which of
  //  these is on the checklist" against three more items off the same
  //  checklist is a question with four right answers and one mark.
  //  Those questions carry their own wrong options, and the app must
  //  use exactly those and nothing else.
  const carried = await page.evaluate(() => {
    const q = { kind: 'oddone', a: 'the right one',
                ch: ['wrong one', 'wrong two', 'wrong three'] };
    const pool = [q, { kind: 'oddone', a: 'a pool answer that must not appear' },
                  { kind: 'fact', a: 'another pool answer that must not appear' }];
    const out = makeChoices(q, pool);
    return { texts: out.map(o => o.t).sort(), right: out.filter(o => o.ok).map(o => o.t) };
  });
  const wantCarried = ['the right one', 'wrong one', 'wrong three', 'wrong two'];
  if (JSON.stringify(carried.texts) !== JSON.stringify(wantCarried))
    fail('carried options were not the only ones offered: ' + JSON.stringify(carried.texts));
  else if (carried.right.length !== 1 || carried.right[0] !== 'the right one')
    fail('exactly one carried option must be the right one: ' + JSON.stringify(carried.right));
  else console.log('  ok   a question that carries its own wrong options gets those and no others');

  //  AND A POOL-DRAWN OPTION MUST NOT READ AS THE ANSWER.  Comparing with
  //  !== only catches a byte-for-byte match, so a graded question offered
  //  the same sentence twice -- once with a leading "The" and a full stop,
  //  once without -- and marked the better-written one wrong.
  const nearDup = await page.evaluate(() => {
    //  The near-duplicate is the ONLY same-kind candidate, and
    //  makeChoices drains same-kind before other-kind -- so it is drawn
    //  first or not at all. Without that the shuffle decides whether the
    //  test notices, and a test that passes three times in four is not a
    //  test. (Checked: this one does fail with the comparison weakened
    //  back to a byte-for-byte !==.)
    const q = { kind: 'fact', a: 'Sails end up in front of the forestay and are hard to winch back' };
    const pool = [q,
      { kind: 'fact', a: 'The sails end up in front of the forestay and are hard to winch back.' },
      { kind: 'hand', a: 'A quite different wrong answer about the mainsail' },
      { kind: 'hand', a: 'Another quite different wrong answer about the kite' },
      { kind: 'hand', a: 'A third quite different wrong answer about the yankee' }];
    const out = makeChoices(q, pool);
    const norm = x => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/^(the|a|an) /, '').trim();
    const keys = out.map(o => norm(o.t));
    return { n: out.length, unique: new Set(keys).size,
             right: out.filter(o => o.ok).length };
  });
  if (nearDup.n !== 4) fail('makeChoices did not return four options: ' + nearDup.n);
  else if (nearDup.unique !== 4)
    fail('two options read as the same option, so the question has two right answers');
  else if (nearDup.right !== 1) fail('not exactly one option is correct');
  else console.log('  ok   a pool option that reads as the answer is not offered');

  //  ONE ANSWER INSIDE ANOTHER IS STILL ONE ANSWER.  Normalising the text
  //  cannot see this: "The vang, the mainsheet and the topping lift" and
  //  "Vang, Mainsheet, Topping lift - depower: ease the vang and
  //  mainsheet, raise the boom with the topping lift" name the same three
  //  controls, and were offered as two options to one question.
  const subset = await page.evaluate(() => {
    const a = 'The vang, the mainsheet and the topping lift.';
    const b = 'Vang, Mainsheet, Topping lift \u2014 depower: ease the vang and ' +
              'mainsheet, raise the boom with the topping lift.';
    return {
      pair: sameAnswer(a, b),
      //  ... but genuinely different answers must still differ, or the
      //  rule would empty the pool instead of cleaning it.
      diff: sameAnswer('Release the FOOT', 'Release the LUFF'),
      diff2: sameAnswer('Raise the alarm \u2014 shout MOB', 'Stop the boat and throw the danbuoy'),
    };
  });
  if (!subset.pair) fail('an answer contained inside another was not recognised as the same answer');
  else if (subset.diff || subset.diff2) fail('two genuinely different answers were called the same');
  else console.log('  ok   an answer contained inside another counts as the same answer');

  //  NOT FROM THE SAME PARAGRAPH, where one of them is hand-written. Two
  //  questions about one subsection overlap by construction: "why forward
  //  first" states the rule in the course of giving its reason, so it
  //  answered "state Rule 3" as well as its own question.
  const para = await page.evaluate(() => {
    const q = { kind: 'hand', a: 'The order is forward to aft.',
                where: { sub: 'Rule 3 - Forward sail first' } };
    const twin = { kind: 'hand', a: 'Because the sail plan works as one force, trim the furthest forward first.',
                   where: { sub: 'Rule 3 - Forward sail first' } };
    const elsewhere = { kind: 'hand', a: 'A wholly unrelated answer about the liferaft grab bag.',
                        where: { sub: 'Abandonment' } };
    const got = makeChoices(q, [q, twin, elsewhere]).map(o => o.t);
    return { usedTwin: got.indexOf(twin.a) >= 0, usedOther: got.indexOf(elsewhere.a) >= 0 };
  });
  if (para.usedTwin)
    fail('a hand-written answer from the same subsection was offered as a distractor');
  else if (!para.usedOther)
    fail('a hand-written answer from a different subsection was wrongly suppressed');
  else console.log('  ok   a hand-written answer from the same subsection is not a distractor');

  //  NOR FROM THE SAME STATION IN THE SAME CHAIN.  Larry got "In tacking --
  //  you are on helming.  The call is "Lee ho"" right and said the option
  //  "Keep going.  Know which way you are turning (to windward)." was also
  //  correct.  It was: that is the helm's answer to a DIFFERENT call in the
  //  SAME tack, and a helm keeps turning through most of one.  The other
  //  stations' answers to the same call are the distractors worth having,
  //  and they must survive, or the rule would empty the pool rather than
  //  clean it.
  const station = await page.evaluate(() => {
    const where = { part: 'Part 1 \u2014 Tacking', sub: 'By station' };
    const q = { kind: 'station', a: 'Called somewhere in the middle of your turn. Keep going.',
                where: Object.assign({ station: 'Helming' }, where) };
    const sameSta = { kind: 'station', a: 'Keep going. Know which way you are turning (to windward).',
                      where: Object.assign({ station: 'Helming' }, where) };
    const otherSta = { kind: 'station', a: 'Take up slack on both traveller lines and secure them in the jammers.',
                       where: Object.assign({ station: 'Mainsheet' }, where) };
    const otherPart = { kind: 'station', a: 'Keep going straight; get an idea of your new course.',
                        where: { part: 'Part 2 \u2014 Gybing (white sails)', sub: 'By station',
                                 station: 'Helming' } };
    const got = makeChoices(q, [q, sameSta, otherSta, otherPart]).map(o => o.t);
    return { usedSame: got.indexOf(sameSta.a) >= 0,
             usedOther: got.indexOf(otherSta.a) >= 0,
             usedOtherPart: got.indexOf(otherPart.a) >= 0 };
  });
  if (station.usedSame)
    fail('the same station\u2019s answer to another call in the same chain was offered as a distractor');
  else if (!station.usedOther)
    fail('another station\u2019s answer to the same call was wrongly suppressed');
  else if (!station.usedOtherPart)
    fail('the same station in a DIFFERENT manoeuvre was wrongly suppressed');
  else console.log('  ok   a station\u2019s own answers elsewhere in its chain are not distractors');

  //  NOR ANOTHER MOMENT OF THE SAME EVOLUTION.  Larry, on the reef: "both
  //  B and C are correct".  The stem named one stage of a three-stage
  //  procedure -- "for Lower, what happens?" -- and three of the four
  //  options were rows of that same procedure.  You haul the luff cringle
  //  down WHILE the sail is coming down, so more than one row is true of
  //  the moment the stem names.
  //
  //  Both directions are checked, and the second matters as much: a table
  //  that is NOT a sequence -- the luff, foot and leech against their
  //  controls -- must keep its own rows, because there the other rows are
  //  genuinely different things and are the best distractors there are.
  const evo = await page.evaluate(() => {
    const reef = (row) => ({ part: 'Part 3 \u2014 The mainsail',
                             sub: 'Reefing the Main', row: String(row), tbl: 1 });
    const q = { kind: 'fact', seqtbl: 1, where: reef(1),
                a: 'Ease the main halyard; the mastperson pulls the sail down.' };
    const sameTbl = { kind: 'fact', seqtbl: 1, where: reef(2),
                      a: 'Handy billy attached to the luff cringle and tightened.' };
    const otherCard = { kind: 'fact', seqtbl: 1,
                        where: { part: 'Part 3 \u2014 The mainsail',
                                 sub: 'Shaking it out', row: '2', tbl: 1 },
                        a: 'Disconnect the handy billy.' };
    const notSeq = { kind: 'fact',
                     where: { part: 'Part 3 \u2014 The mainsail',
                              sub: 'Luff, foot and leech', row: '3', tbl: 1 },
                     a: 'The leech controls how much the sail twists.' };
    const pool = [q, sameTbl, otherCard, notSeq];
    const plain = { kind: 'fact', where: reef(1), a: q.a };   // same row, not marked
    return { got: makeChoices(q, pool).map(o => o.t),
             gotPlain: makeChoices(plain, [plain, sameTbl, otherCard, notSeq]).map(o => o.t),
             sameTbl: sameTbl.a, otherCard: otherCard.a };
  });
  if (evo.got.indexOf(evo.sameTbl) >= 0)
    fail('another row of the same procedure was offered as a wrong answer: ' + evo.got.join(' | '));
  else if (evo.got.indexOf(evo.otherCard) < 0)
    fail('a row from a different card should still be a distractor: ' + evo.got.join(' | '));
  else if (evo.gotPlain.indexOf(evo.sameTbl) < 0)
    fail('a table that is not a sequence lost its own rows as distractors: ' + evo.gotPlain.join(' | '));
  else console.log('  ok   another moment of the same evolution is not a distractor, ' +
                   'and an unordered table keeps its rows');

  //  AND WITHIN ONE TABLE, ONLY THE SAME COLUMN.  A matrix column answers
  //  one question and the column beside it answers a different one.  Larry
  //  was offered "Racing change (4.3)" among four answers to "both sails on
  //  the foredeck?", and "Yes - new sail hanked on alongside the old" as an
  //  answer to "what is the first thing that happens?"  Neither is a wrong
  //  answer; each is an answer to a question nobody asked.
  //
  //  The third case is the one that keeps the pool from emptying: the same
  //  column in a DIFFERENT table is fine, and has to be, because a two-row
  //  matrix holds one same-column distractor and four options are needed.
  const colq = await page.evaluate(() => {
    const m = (c, row) => ({ kind: 'fact', col: c,
      where: { part: 'Part 4 \u2014 The headsails',
               sub: '4.4 \u2014 Bare-headed change \u2014 reducing size',
               row: String(row), tbl: 1 } });
    const q        = Object.assign(m('both sails on the foredeck', 1),
                       { a: 'Yes - new sail hanked on alongside the old' });
    const sameCol  = Object.assign(m('both sails on the foredeck', 2),
                       { a: 'No - old sail comes off the foredeck first' });
    const nextCol  = Object.assign(m('method', 2), { a: 'Racing change (4.3)' });
    const elsewhere = { kind: 'fact', col: 'method',
      where: { part: 'Part 4 \u2014 The headsails', sub: '4.5 \u2014 something else',
               row: '1', tbl: 1 },
      a: 'Bare-headed change, with the forestay clear' };
    const got = makeChoices(q, [q, sameCol, nextCol, elsewhere]).map(o => o.t);
    return { got: got, sameCol: sameCol.a, nextCol: nextCol.a, elsewhere: elsewhere.a };
  });
  if (colq.got.indexOf(colq.nextCol) >= 0)
    fail('a cell from the next column was offered as a wrong answer: ' + colq.got.join(' | '));
  else if (colq.got.indexOf(colq.sameCol) < 0)
    fail('the same column in the same table should be the best distractor: ' + colq.got.join(' | '));
  else if (colq.got.indexOf(colq.elsewhere) < 0)
    fail('a cell from another table should still be usable, or a two-row matrix has no pool: ' +
         colq.got.join(' | '));
  else console.log('  ok   within one table only the same column is offered, and other ' +
                   'tables still supply the pool');

  //  and the stem must name the manoeuvre, not leave it to be inferred
  //  from the call -- the options are drawn from more than one.
  const named = await page.evaluate(() => {
    return PACK.questions.filter(function (q) {
      return q.kind === 'station' && !/^In .+ \u2014 you are on /.test(q.q);
    }).map(function (q) { return q.q; });
  });
  if (named.length) fail(named.length + ' station question(s) do not name the manoeuvre: ' + named[0]);
  else console.log('  ok   every station question names its manoeuvre');

  //  AND NOTHING THE READER HAS TO JUDGE IS CUT SHORT.  Larry, on the
  //  helm's answer to "Helm to weather": "Sould have the whoe answer, not
  //  ....".  It ended "Once under control\u2026" -- an instruction with its
  //  end missing, where the missing end was what to do when the main
  //  fills.  Answers, wrong options and ordering steps all have to be
  //  readable in full or the reader cannot tell what they are choosing.
  const cut = await page.evaluate(() => {
    const bad = [];
    PACK.questions.forEach(function (q) {
      [q.a].concat(q.ch || [], q.seq || []).forEach(function (t) {
        if (typeof t === 'string' && /\u2026\s*$/.test(t))
          bad.push(q.q + ' :: \u2026' + t.slice(-50));
      });
    });
    return bad;
  });
  if (cut.length) fail(cut.length + ' text(s) in this pack are cut short: ' + cut[0]);
  else console.log('  ok   no answer, option or step in this pack is cut short');

  //  THE RUNNER QUESTION MUST ASK WHICH RUNNER.  Larry: "there can only be
  //  one right answer....perhaps one of the other answers should revers
  //  the runner lables, with the actions, which would make people think."
  //  Before this, a runner question's other options were other stations'
  //  jobs, so the option that mentioned runners at all was the answer.
  //  One option is now this answer with the runner labels reversed --
  //  lazy for working, high side for low side -- which is wrong in the one
  //  way that matters on a boat whose mast the working runner is holding
  //  up.  Checked by performing the same swap here: the option has to be
  //  present and it has to be exactly the reverse, or the question is
  //  either easy again or wrong in some other way.
  const runner = await page.evaluate(() => {
    const pairs = [['low side', 'high side'], ['working', 'lazy']];
    const alts = [].concat.apply([], pairs).sort(function (a, b) { return b.length - a.length; });
    const re = new RegExp('\\b(?:' + alts.join('|') + ')\\b', 'gi');
    const flip = function (t) {
      return t.replace(re, function (w) {
        const l = w.toLowerCase();
        for (var i = 0; i < pairs.length; i++) {
          var x = pairs[i][0], y = pairs[i][1];
          var r = l === x ? y : (l === y ? x : null);
          if (!r) continue;
          if (w === w.toUpperCase()) return r.toUpperCase();
          if (w[0] === w[0].toUpperCase()) return r[0].toUpperCase() + r.slice(1);
          return r;
        }
        return w;
      });
    };
    const norm = function (t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    const out = { n: 0, bad: [] };
    //  THE FIELD IS CARRIED UNDER `where`, which is where the app reads
    //  it from (makeChoices' sta()). Reading q.station alone found none
    //  in any pack this family builds, so the check below reported that
    //  the field was being dropped when it was simply being looked for
    //  in the wrong place. Both are read now, so this can only ever find
    //  more questions than before, never fewer.
    var staOf = function (x) {
      return (x && x.where && x.where.station) || (x && x.station) || '';
    };
    PACK.questions.forEach(function (q) {
      if (q.kind !== 'station' || !/^running backstay/i.test(staOf(q))) return;
      out.n++;
      if (!q.ch || q.ch.length !== 3) {
        out.bad.push(q.q + ' :: no options of its own');
        return;
      }
      const want = norm(flip(q.a));
      if (want === norm(q.a)) { out.bad.push(q.q + ' :: nothing to reverse'); return; }
      if (!q.ch.some(function (c) { return norm(c) === want; }))
        out.bad.push(q.q + ' :: no reversed-label option among ' + q.ch.length);
      //  and the reverse must not be offered as the ANSWER anywhere
      PACK.questions.forEach(function (o) {
        if (o !== q && norm(o.a) === want) out.bad.push(q.q + ' :: its reverse is a real answer in ' + o.q);
      });
    });
    return out;
  });
  //  A COUNT OF ZERO PASSES EVERY CHECK ABOVE.  The first run of this test
  //  reported "all 0 runner questions" and passed, because `station` was
  //  being dropped on the way into the pack -- so the test agreed with a
  //  pack that had lost the field it was testing.  A test that cannot
  //  fail is not a test; this one now needs to find them.
  //  AND IT NEEDS A PACK THAT HAS ONE.  The running backstay is a station
  //  in the deck pack, and the deck pack is somebody's material that this
  //  repository does not and will not hold -- so the synthetic pack the
  //  harness builds has no such chain and never will. Failing the default
  //  run for that made a red suite the normal state, which is the fastest
  //  way to teach everybody to ignore it.
  //
  //  It is a SKIP and not a silence: the line says which pack it wants and
  //  how to supply it, so a check that is being passed over cannot be
  //  mistaken for a check that passed.
  if (runner.bad.length) fail(runner.bad.length + ' runner question(s) wrong: ' + runner.bad[0]);
  else if (runner.n < 1)
    console.log('  --   no running-backstay chain in this pack, so the reversed-label ' +
                'check did not run: sh docs/web/tests/run-drill-web.sh <deck-pack.json>');
  else console.log('  ok   all ' + runner.n + ' runner questions offer the labels reversed');

  //  A SECTION CAN RUN OUT OF DISTRACTORS, and a question with no wrong
  //  option is an automatic mark -- worse than the duplicate the
  //  filtering was added to prevent.
  //
  //  FOUR OPTIONS IS THE AIM AND NOT A GUARANTEE, and insisting on four
  //  here was wrong. Measured: over 400 draws against this harness's own
  //  pack, 23 came back with three options -- and in every one of those
  //  the pool had nothing distinct left to give, because every remaining
  //  answer read as one of the two already picked. A fourth option could
  //  only have been a near-duplicate of another, which is the exact fault
  //  the filtering exists to prevent. The old check therefore failed at
  //  random, roughly one run in sixteen, demanding the fault.
  //
  //  So it asks for what is actually true: never fewer than three, exactly
  //  one of them right, and a short draw ONLY when there was genuinely
  //  nothing distinct left to offer.
  const starved = await page.evaluate(() => {
    const q = { kind: 'fact', a: 'An answer whose section pool has nothing left to offer' };
    const out = makeChoices(q, [q]);     // a pool of one: itself
    const got = out.filter(o => !o.ok).map(o => o.t);
    const left = PACK.questions.filter(function (o) {
      return o.a && !(o.ch && o.ch.length) && !(o.seq && o.seq.length) &&
             !sameAnswer(o.a, q.a) &&
             !got.some(function (g) { return sameAnswer(g, o.a); });
    }).length;
    return { n: out.length, right: out.filter(o => o.ok).length, left: left };
  });
  if (starved.n < 3)
    fail('an exhausted section gave only ' + starved.n + ' option(s); one of them would be a free mark');
  else if (starved.right !== 1) fail('not exactly one option is correct after falling back');
  else if (starved.n < 4 && starved.left)
    fail('a draw of ' + starved.n + ' while ' + starved.left +
         ' distinct answer(s) were still on offer -- the pool was not exhausted');
  else console.log('  ok   an exhausted section falls back to the whole pack for options' +
                   (starved.n < 4 ? ' (three here: the pack had nothing else distinct)' : ''));

  //  and a question without them still draws from the pool
  const drawn = await page.evaluate(() => {
    const q = { kind: 'fact', a: 'mine' };
    const pool = [q, { kind: 'fact', a: 'one' }, { kind: 'fact', a: 'two' },
                  { kind: 'fact', a: 'three' }];
    return makeChoices(q, pool).map(o => o.t).sort();
  });
  if (drawn.length !== 4 || drawn.indexOf('mine') < 0)
    fail('a question without carried options did not draw four from the pool: ' + JSON.stringify(drawn));
  else console.log('  ok   and one without them still draws from the section pool');

  //  the answer offered as a wrong option is a question that marks you
  //  wrong for being right, and is cheap to refuse at load time
  const selfRefuse = await page.evaluate(() => validate({
    format: 'bashnav-drill-pack/1', sections: [{ id: 'a', title: 'A' }],
    questions: [{ section: 'a', q: 'x', a: 'y', ch: ['y', 'z', 'w'] }] }));
  if (!/wrong option/.test(selfRefuse || ''))
    fail('a pack offering an answer as its own wrong option was not refused: ' + selfRefuse);
  else console.log('  ok   a pack offering an answer as its own wrong option is refused');

  //  an ordering question must have an order, and an intruder that is not
  //  secretly one of its own steps -- a question that marks you wrong for
  //  leaving out a step that really does belong
  const seqRefuse = await page.evaluate(() => [
    validate({ format: 'bashnav-drill-pack/1', sections: [{ id: 'a', title: 'A' }],
      questions: [{ section: 'a', q: 'x', a: 'y', seq: ['one', 'two', 'three'],
                    extra: ['two'] }] }),
    validate({ format: 'bashnav-drill-pack/1', sections: [{ id: 'a', title: 'A' }],
      questions: [{ section: 'a', q: 'x', a: 'y', seq: ['one', 'two', 'three'] }] }),
    validate({ format: 'bashnav-drill-pack/1', sections: [{ id: 'a', title: 'A' }],
      questions: [{ section: 'a', q: 'x', a: 'y', seq: ['one', 'one', 'three'],
                    extra: ['z'] }] }),
  ]);
  if (!/does not belong/.test(seqRefuse[0] || ''))
    fail('a real step offered as the intruder was not refused: ' + seqRefuse[0]);
  else if (!/does not belong/.test(seqRefuse[1] || ''))
    fail('an ordering question with no intruder was not refused: ' + seqRefuse[1]);
  else if (!/same step twice/.test(seqRefuse[2] || ''))
    fail('a sequence listing the same step twice was not refused: ' + seqRefuse[2]);
  else console.log('  ok   a malformed ordering question is refused at load');

  //  and the pack actually loaded must satisfy the same rules
  const chBad = await page.evaluate(() => {
    const out = { n: 0, bad: [] };
    PACK.questions.forEach(function (q) {
      if (!q.ch || !q.ch.length) return;
      out.n++;
      if (q.ch.length !== 3) out.bad.push(q.q + ' :: ' + q.ch.length + ' options');
      if (q.ch.indexOf(q.a) >= 0) out.bad.push(q.q + ' :: answer among the wrong options');
      if (new Set(q.ch).size !== q.ch.length) out.bad.push(q.q + ' :: a repeated option');
    });
    return out;
  });
  if (chBad.bad.length) fail(chBad.bad.length + ' four-option questions are malformed: ' + chBad.bad[0]);
  else console.log('  ok   all ' + chBad.n + ' four-option questions in this pack are well formed');

  //  LARRY, drilling: "there can only be one correct answer to this
  //  question.  only one of them is a number."  The question was "how many
  //  calls are there in gybing?", and the three wrong options were prose
  //  sentences borrowed from the section.  Nobody who knows what a numeral
  //  looks like can get that wrong, and nobody who gets it right has
  //  learnt anything.  A bare count must therefore bring its own options,
  //  all of them counts.  Checked on the pack rather than the generator,
  //  so a pack built by an older generator cannot slip through.
  const numBad = await page.evaluate(() => {
    const bare = /^\s*\d+(\s+\S+){0,2}\s*$/;
    const bad = [];
    PACK.questions.forEach(function (q) {
      if (q.recall || !bare.test(q.a || '')) return;
      if (!q.ch || q.ch.length !== 3)
        bad.push(q.q + ' :: ' + q.a + ' -- a bare count with no options of its own');
      else if (q.ch.some(function (c) { return !bare.test(c); }))
        bad.push(q.q + ' :: a count offered against prose -- ' + q.ch.join(' / '));
    });
    return bad;
  });
  if (numBad.length) fail(numBad.length + ' count question(s) give themselves away: ' + numBad[0]);
  else console.log('  ok   every bare count in this pack is offered against other counts');

  const seqStats = await page.evaluate(() => {
    const out = { n: 0, bad: [] };
    PACK.questions.forEach(function (q) {
      if (!q.seq || !q.seq.length) return;
      out.n++;
      if (q.seq.length < 3) out.bad.push(q.q + ' :: fewer than three steps');
      if (new Set(q.seq).size !== q.seq.length) out.bad.push(q.q + ' :: a repeated step');
      if (!q.extra || !q.extra.length) out.bad.push(q.q + ' :: no intruder');
      (q.extra || []).forEach(function (x) {
        if (q.seq.indexOf(x) >= 0) out.bad.push(q.q + ' :: intruder is a real step');
      });
    });
    return out;
  });
  if (seqStats.bad.length) fail(seqStats.bad.length + ' ordering questions are malformed: ' + seqStats.bad[0]);
  else console.log('  ok   all ' + seqStats.n + ' ordering questions in this pack are well formed');

  // ---- A SECOND PACK OF THE SAME NAME MUST REPLACE THE FIRST ---------
  //  A file input fires `change` only when the selection changes, and a
  //  file counts as the same selection if it has the same NAME. Every pack
  //  built by the same builder has the same name, so after the first load
  //  the picker was a no-op: no error, no note, the old pack simply
  //  stayed, and it read as the app offering no way to replace it. Five
  //  bug reports in a morning came out of that one line.
  {
    const twin = path.join(TMP, 'twin', 'synth.drillpack.json');
    fs.mkdirSync(path.dirname(twin), { recursive: true });
    const second = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    second.id = 'deadbeef';
    second.built = '2026-01-01';
    fs.writeFileSync(twin, JSON.stringify(second));
    const before = await page.evaluate(() => (PACK && PACK.id) || '');
    await page.evaluate(() => { document.getElementById('b-replace').click(); });
    await page.waitForTimeout(80);
    await page.setInputFiles('#f-pack', twin);
    await page.waitForFunction(() => window.PACK && PACK.id === 'deadbeef',
                               { timeout: 8000 }).catch(() => {});
    const now = await page.evaluate(() => ({
      id: (PACK && PACK.id) || '', val: document.getElementById('f-pack').value }));
    if (now.id !== 'deadbeef')
      fail('a second pack of the same filename did not replace the first (still ' +
           (now.id || before) + ')');
    else if (now.val !== '')
      fail('the file input kept its value, so the next same-named file will not load');
    else console.log('  ok   a second pack of the same filename replaces the first');
    //  AND AN OLDER ONE IS CALLED OUT.  The app repairs its own staleness
    //  by asking the network which build is live.  A pack is a file the
    //  reader chose off their own disk, so there is nothing to ask, and
    //  the most it can do is remember the newest it has seen and say when
    //  an older one is loaded.  Larry lost a drilling session to that
    //  gap: the build on screen was current and true while the pack was
    //  the day before's, so the questions he reported had already been
    //  fixed.  This second pack is dated 2026-01-01 on purpose, which
    //  makes it older than anything the generator produces.
    const stale = await page.evaluate(() => {
      const n = document.getElementById('pack-note');
      const w = n && n.querySelector('.warn');
      return { warn: w ? w.textContent : '', built: (window.PACK && PACK.built) || '' };
    });
    if (!stale.warn)
      fail('an older pack was loaded and the home screen said nothing about it');
    else if (stale.warn.indexOf(stale.built) < 0)
      fail('the notice does not say which pack is loaded: ' + stale.warn);
    else console.log('  ok   loading an older pack is called out on the home screen');
    //  put the pack under test back
    await page.evaluate(() => { document.getElementById('b-replace').click(); });
    await page.waitForTimeout(80);
    await page.setInputFiles('#f-pack', packPath);
    await page.waitForFunction(() => window.PACK && PACK.id !== 'deadbeef',
                               { timeout: 8000 }).catch(() => {});
  }

  // ---- THE CONTROL FOR LOADING A DIFFERENT PACK IS ON THE HOME SCREEN -
  //  It existed only on the About screen, under a heading nobody had
  //  reason to open, so replacing a pack looked impossible from the
  //  outside. It belongs next to the name of the pack that is loaded,
  //  which is where you look when you want a different one.
  const replaceBtn = await page.evaluate(() => {
    const b = document.getElementById('b-replace-home');
    if (!b) return { there: false };
    const inHome = !!b.closest('#v-home');
    b.click();
    return { there: true, inHome, wentToEmpty: !document.getElementById('v-empty').hidden,
             picker: !!document.getElementById('f-pack') };
  });
  if (!replaceBtn.there) fail('no control on the home screen for loading a different pack');
  else if (!replaceBtn.inHome) fail('the load-a-different-pack control is not on the home screen');
  else if (!replaceBtn.wentToEmpty || !replaceBtn.picker)
    fail('the home-screen control did not reach the file picker');
  else console.log('  ok   a different pack can be loaded from the home screen');
  await page.evaluate(() => go('home'));
  await page.waitForTimeout(80);

  // ---- the home screen says WHICH pack is loaded ---------------------
  //  Loading a pack replaces the one in storage. With nothing on screen to
  //  tell them apart, a rebuilt pack looks exactly like the one it
  //  replaced, and a question you were told was fixed comes round again
  //  because the old pack is still the one being drilled.
  const ident = await page.evaluate(() => ({
    note: document.getElementById('pack-note').textContent,
    built: PACK.built || '',
    id: PACK.id || '',
    build: window.BUILD || '',
  }));
  if (ident.built && ident.note.indexOf(ident.built) < 0)
    fail('the home screen does not say which pack is loaded: ' + ident.note);
  else if (ident.note.indexOf('build ' + String(ident.build).split(' ')[0]) < 0)
    fail('the home screen does not say which app build is running, so a report ' +
         'about a question names only half of what it depends on: ' + ident.note);
  else if (ident.id && ident.note.indexOf(ident.id) < 0)
    fail('the home screen does not show the pack id, so two packs built the ' +
         'same day look identical: ' + ident.note);
  else console.log('  ok   the home screen names the loaded pack (' +
                   ident.built + (ident.id ? ' ' + ident.id : '') + ')');

  // ---- the gate -------------------------------------------------------
  const states = await page.$$eval('#seclist .seclink', els =>
    els.map(e => e.getAttribute('data-state')));
  if (states[0] === 'locked') fail('the first section is locked');
  if (nsec > 1 && states[1] !== 'locked') fail('the second section is not locked before the first is passed');
  else console.log('  ok   section 1 open, section 2 locked');

  // ---- THE REFERENCE IS NEVER GATED -----------------------------------
  await page.evaluate(() => openSection(1));
  await page.waitForTimeout(150);
  const refText = await page.evaluate(() => {
    drawTabs('ref');
    return document.querySelector('#sec-body .ref').textContent.trim().length;
  });
  if (refText < 20) fail('a locked section’s reference is empty or withheld');
  else console.log('  ok   a LOCKED section’s reference is fully readable (' + refText + ' chars)');
  const testLocked = await page.evaluate(() => {
    drawTabs('test');
    return document.querySelector('#sec-body .warn') !== null;
  });
  if (!testLocked) fail('a locked section’s test is available');
  else console.log('  ok   and only its test waits, with the reason given');

  // ---- NO ANSWER IN THE DOM BEFORE IT IS ASKED FOR --------------------
  await page.evaluate(() => { openSection(0); drawTabs('quiz'); });
  await page.waitForTimeout(100);
  await page.evaluate(() => document.querySelector('#sec-body .btn.go').click());
  await page.waitForTimeout(150);
  //  Recall prompts come first in practice and have no written answer, so
  //  RUN.qs[0] cannot test for a leak. Skip to the first question that
  //  HAS an answer -- that is the one that could leak.
  const leak = await page.evaluate(async () => {
    while (RUN.i < RUN.qs.length && !RUN.qs[RUN.i].a) {
      const b = document.querySelector('#drill-body [data-reveal]');
      if (b) b.click();
      await new Promise(r => setTimeout(r, 10));
      const m = document.querySelector('#drill-body [data-mark-self]');
      if (!m) break;
      m.click();
      await new Promise(r => setTimeout(r, 10));
    }
    const q = RUN.qs[RUN.i];
    //  textContent, not innerHTML: an answer containing "&" or "<" is
    //  escaped in the markup and a substring search for the raw text
    //  misses it -- which would report a leak as absent, or a reveal as
    //  having failed. textContent is also the stricter check for the leak
    //  itself, since it includes text that is present but hidden.
    const seen = document.getElementById('drill-body').textContent;
    return { graded: !!q.a, hasAnswer: q.a ? seen.indexOf(q.a) >= 0 : false,
             qa: q.a ? q.a.slice(0, 40) : '(no graded question reached)' };
  });
  if (!leak.graded) fail('could not reach a graded question to test the leak');
  if (leak.hasAnswer) fail('the answer is already in the DOM before it is asked for');
  else console.log('  ok   the answer is absent from the DOM, not hidden (' + leak.qa + '…)');
  await page.evaluate(() => {
    const b = document.querySelector('#drill-body [data-reveal]');
    if (b) b.click();
  });
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => {
    //  The question ON SCREEN, not the first one in the run: the leak loop
    //  above advances through the practice set, so checking qs[0] asked
    //  about a question that is no longer displayed. It passed only while
    //  the loop happened to stop on the first one.
    const q = RUN.qs[RUN.i];
    return q.a ? document.getElementById('drill-body').textContent.indexOf(q.a) >= 0 : true;
  });
  if (!after) fail('the answer did not appear when asked for');
  else console.log('  ok   and appears when asked for');

  // ---- GOING BACK IS REVIEW, NOT A SECOND ATTEMPT --------------------
  //  You can return to a question you have answered and see what you
  //  picked against what was right. You cannot change the mark: an answer
  //  that can be changed on a second look makes the pass threshold a
  //  statement about persistence rather than knowledge.
  await page.evaluate(() => { openSection(0); startTest(PACK.sections[0].id); });
  await page.waitForTimeout(150);
  const back = await page.evaluate(async () => {
    //  answer the first two, right then wrong
    answerCurrent(true);
    await new Promise(r => setTimeout(r, 20));
    const noBackYet = !document.querySelector('#drill-body [data-back]');
    document.querySelector('#drill-body [data-advance]').click();
    await new Promise(r => setTimeout(r, 20));
    answerCurrent(false);
    await new Promise(r => setTimeout(r, 20));
    const rightBefore = RUN.right, iBefore = RUN.i;
    //  go back to the first
    const bk = document.querySelector('#drill-body [data-back]');
    if (!bk) return { noBack: true };
    bk.click();
    await new Promise(r => setTimeout(r, 30));
    const onFirst = RUN.i === 0;
    const liveChoice = !!document.querySelector('#drill-body .choice:not([disabled])');
    const showsMark = !!document.querySelector('#drill-body [data-mark="right"]');
    //  and forward again, without the score changing
    document.querySelector('#drill-body [data-advance]').click();
    await new Promise(r => setTimeout(r, 30));
    return { noBackYet, onFirst, liveChoice, showsMark,
             rightSame: RUN.right === rightBefore, backTo: iBefore };
  });
  if (back.noBack) fail('no Back button on an answered question');
  else if (!back.noBackYet) fail('Back was offered on the very first question');
  else if (!back.onFirst) fail('Back did not return to the previous question');
  else if (back.liveChoice) fail('a reviewed question still accepts an answer, so the mark can be changed');
  else if (!back.showsMark) fail('a reviewed question does not show which option was right');
  else if (!back.rightSame) fail('going back and forward changed the score');
  else console.log('  ok   Back reviews an answered question and cannot change the mark');

  // ---- failing the test keeps the next section locked ------------------
  await page.evaluate(() => { openSection(0); startTest(PACK.sections[0].id); });
  await page.waitForTimeout(150);
  await page.evaluate(async () => {
    //  answer every question wrong on purpose. The guard matters: a loop
    //  that cannot advance must fail loudly rather than hang the page.
    let guard = 0;
    while (RUN.i < RUN.qs.length) {
      if (++guard > 200) throw new Error('the test would not advance');
      answerCurrent(false);
      await new Promise(r => setTimeout(r, 10));
      const nx = document.querySelector('#drill-body [data-advance]');
      if (!nx) break;
      nx.click();
      await new Promise(r => setTimeout(r, 10));
    }
  });
  await page.waitForTimeout(250);
  const failed = await page.evaluate(() => ({
    pct: document.querySelector('#drill-body .big') ? document.querySelector('#drill-body .big').textContent : '?',
    locked: !unlocked(1),
  }));
  if (!failed.locked) fail('failing the test still unlocked the next section');
  else console.log('  ok   failing (' + failed.pct + ') leaves the next section locked');

  // ---- passing it unlocks ---------------------------------------------
  await page.evaluate(() => { openSection(0); startTest(PACK.sections[0].id); });
  await page.waitForTimeout(150);
  await page.evaluate(async () => {
    let guard = 0;
    while (RUN.i < RUN.qs.length) {
      if (++guard > 200) throw new Error('the test would not advance');
      answerCurrent(true);
      await new Promise(r => setTimeout(r, 10));
      const nx = document.querySelector('#drill-body [data-advance]');
      if (!nx) break;
      nx.click();
      await new Promise(r => setTimeout(r, 10));
    }
  });
  await page.waitForTimeout(250);
  const won = await page.evaluate(() => ({
    pct: document.querySelector('#drill-body .big').textContent,
    open: unlocked(1),
    best: PROG[PACK.sections[0].id].best,
  }));
  if (!won.open) fail('passing the test did not unlock the next section (' + won.pct + ')');
  else console.log('  ok   passing (' + won.pct + ') unlocks section 2; best recorded as ' + won.best + '%');

  // ---- progress survives a reload --------------------------------------
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.PACK && Object.keys(window.PROG || {}).length > 0,
                             { timeout: 15000 });
  const kept = await page.evaluate(() => ({ best: PROG[PACK.sections[0].id].best, open: unlocked(1) }));
  if (!kept.open || kept.best === null) fail('progress did not survive a reload');
  else console.log('  ok   progress survived a reload (best ' + kept.best + '%, section 2 still open)');

  // ---- the diagnostic separates "not studied" from "weak" --------------
  await page.evaluate(() => go('diag'));
  await page.waitForTimeout(200);
  const diag = await page.textContent('#diag-body');
  if (!/not been studied/.test(diag)) fail('the diagnostic does not report unstudied sections separately');
  else console.log('  ok   the diagnostic names unstudied sections instead of scoring them zero');
  await page.evaluate(() => document.querySelector('#diag-body .btn.go').click());
  await page.waitForTimeout(200);
  await page.evaluate(async () => {
    let guard = 0;
    while (RUN.i < RUN.qs.length) {
      if (++guard > 400) throw new Error('the diagnostic would not advance');
      answerCurrent(true);
      await new Promise(r => setTimeout(r, 8));
      const nx = document.querySelector('#drill-body [data-advance]');
      if (!nx) break;
      nx.click();
      await new Promise(r => setTimeout(r, 8));
    }
  });
  await page.waitForTimeout(250);
  const rep = await page.textContent('#drill-body');
  if (!/Weakest first/.test(rep)) fail('the diagnostic produced no per-section report');
  else console.log('  ok   it reports per section, weakest first');
  const unseenRows = await page.$$eval('#drill-body .bars li[data-state="unseen"]', e => e.length);
  console.log('  ok   ' + unseenRows + ' section(s) shown as "not studied" rather than 0%');

  // ---- the document, and search ----------------------------------------
  await page.evaluate(() => go('doc'));
  await page.waitForTimeout(150);
  const docLen = await page.evaluate(() => document.getElementById('doc-body').textContent.length);
  if (docLen < 50) fail('the whole-document view is empty');
  else console.log('  ok   the whole document renders (' + docLen.toLocaleString() + ' chars)');
  await page.fill('#q-find', 'thing');
  await page.waitForTimeout(300);
  const found = await page.textContent('#find-note');
  if (!/match/.test(found)) fail('search found nothing: ' + found);
  else console.log('  ok   search works: ' + found);

  // ---- layout -----------------------------------------------------------
  for (const w of [744, 390, 320]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(150);
    const o = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    if (o.doc > o.win + 1) fail('sideways scroll at ' + w + 'px (' + o.doc + ' > ' + o.win + ')');
  }
  console.log('  ok   no sideways scroll at 744, 390 and 320 px');

  //  ---- the app repairs itself when it is stale --------------------
  //  The fault this covers cost a whole evening: the site served build 13
  //  and the app went on running build 12, because a new worker does not
  //  change the document that installed it.  Everything was working as
  //  written; nothing said the app was behind.  Build 14 asks the network
  //  what the live build is and, if it differs, drops the caches,
  //  unregisters the worker and reloads once.
  //
  //  Both directions are tested, and the second matters more: an app that
  //  reloads itself when it is ALREADY current is an app stuck in a loop,
  //  which is worse than the staleness it was written to cure.
  {
    //  ITS OWN CONTEXT, WITH THE WORKER BLOCKED.  The probe fetch goes
    //  through the service worker when one is controlling the page, and
    //  a worker's own requests are not visible to page routing -- so the
    //  first version of this test intercepted nothing and reported that
    //  a stale app "did not notice" when the app had never been asked.
    //  Blocking the worker makes the probe an ordinary page request,
    //  which is also the case worth covering: a stale copy can come from
    //  the plain HTTP cache with no worker involved at all.
    const healCtx = await browser.newContext({ serviceWorkers: 'block' });
    const heal = await healCtx.newPage();
    //  stale: the probe comes back claiming a build this app is not
    await heal.route(u => u.pathname.endsWith('/drill.js') && u.search.includes('probe='),
                     r => r.fulfill({ status: 200, contentType: 'application/javascript',
                                      body: "var BUILD = '99 \\u2014 1 Jan 2099';" }));
    await heal.goto(BASE, { waitUntil: 'networkidle' });
    let reloaded = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 8000) {
      const flag = await heal.evaluate(() => {
        try { return sessionStorage.getItem('drill-healed'); } catch (e) { return null; }
      }).catch(() => null);
      if (flag) { reloaded = true; break; }
      await heal.waitForTimeout(200);
    }
    if (!reloaded) fail('a stale app did not notice: no self-heal after a probe reporting build 99');
    else {
      const after = await heal.evaluate(async () => ({
        build: window.BUILD,
        flag: sessionStorage.getItem('drill-healed'),
        caches: (await caches.keys()).filter(k => k.indexOf('drill-') === 0),
      }));
      if (after.flag !== '99 \u2014 1 Jan 2099')
        fail('the self-heal recorded the wrong live build: ' + after.flag);
      else console.log('  ok   a stale app drops its caches and reloads itself once');
    }
    await heal.close();
    await healCtx.close();

    //  current: the probe agrees with the running build, so nothing happens
    const quietCtx = await browser.newContext({ serviceWorkers: 'block' });
    const quiet = await quietCtx.newPage();
    await quiet.goto(BASE, { waitUntil: 'networkidle' });
    await quiet.waitForTimeout(1500);
    const q = await quiet.evaluate(() => {
      try { return { flag: sessionStorage.getItem('drill-healed'), build: window.BUILD }; }
      catch (e) { return { flag: 'storage blocked', build: window.BUILD }; }
    });
    if (q.flag) fail('a current app healed itself anyway (would loop): flag=' + q.flag);
    else console.log('  ok   and a current app leaves itself alone (no reload loop)');
    await quiet.close();
    await quietCtx.close();
  }

  await page.setViewportSize({ width: 744, height: 1133 });
  await page.evaluate(() => go('home'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(TMP, 'drill-home.png'), fullPage: true });

  console.log('');
  if (errs.length) { console.log('CONSOLE ERRORS (' + errs.length + '):'); errs.slice(0, 8).forEach(e => console.log('  ' + e)); bad += errs.length; }
  else console.log('no console errors');
  console.log(bad ? bad + ' FAILURES' : 'all checks passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();

/* =====================================================================
   drill -- a study machine with no material in it.
   No framework, no build step; this file is the app.

   It ships EMPTY. The questions and the reference text come from a pack
   the user loads from their own device, read here and kept in this
   origin's storage. Nothing is uploaded and nothing of anybody's
   material is in the published files -- which is the point: material
   somebody else owns can be studied without ever being published.

   Three things here are not style choices.

     NO ANSWER IS IN THE PAGE until it is asked for. Not hidden, not
     collapsed, not transparent -- absent from the DOM. An answer you can
     reveal with a long press, or find by zooming, is an answer you have
     read, and then you have not recalled anything.

     THE REFERENCE IS NEVER GATED. Only the graded test waits its turn.
     Being locked out of a procedure you are carrying this for would be
     the one failure that actually matters, and it would happen at the
     worst possible moment.

     "NOT STUDIED" IS NOT "WEAK". The diagnostic reports a gap as a gap
     and never averages it in as a zero. A gap that looks like a score
     gets you a confidently wrong answer about your own readiness.
   ===================================================================== */
'use strict';

var BUILD = '24 \u2014 11 Nov 2026';
var DB_NAME = 'bashnav-drill';
var PACK = null;          // the loaded pack
var PROG = {};            // sectionId -> {best, attempts, seen{}, right, wrong}
var VIEW = 'empty';
var RUN = null;           // the drill or test in progress

function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function lsGet(k, d) { try { var v = localStorage.getItem('drill-' + k); return v === null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem('drill-' + k, v); } catch (e) {} }

/* =====================================================================
   Storage.  A pack is a few hundred kilobytes, which is more than
   localStorage should be asked to hold, so both the pack and the
   progress live in IndexedDB.
   ===================================================================== */
var db = null;
function open_() {
  if (db) return Promise.resolve(db);
  return new Promise(function (res, rej) {
    if (!window.indexedDB) { rej(new Error('this browser has no IndexedDB')); return; }
    var rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = function () {
      var d = rq.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
    };
    rq.onsuccess = function () { db = rq.result; res(db); };
    rq.onerror = function () { rej(rq.error || new Error('could not open storage')); };
  });
}
function kvGet(k) {
  return open_().then(function (d) {
    return new Promise(function (res, rej) {
      var r = d.transaction('kv', 'readonly').objectStore('kv').get(k);
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  });
}
function kvPut(k, v) {
  return open_().then(function (d) {
    return new Promise(function (res, rej) {
      var t = d.transaction('kv', 'readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = function () { res(); };
      t.onerror = function () { rej(t.error); };
    });
  });
}
function saveProg() { return kvPut('progress', PROG).catch(function () {}); }

/* ---- mode and navigation ------------------------------------------ */
/*  The display modes, as a list rather than a branch.  Adding a fourth
    palette - a high-contrast day, say - is one entry here and one block in
    the stylesheet, and touches no logic.  */
var MODES = ['day', 'dark', 'night'];
var MODE_KEY = 'visual-mode';   /* one name for the whole suite, so a mode set
                                   in one tool is the mode in the next, and in
                                   the course pages that embed them */

/*  night is the default: a tool opened on deck must not start bright.  */
function savedMode() {
  var s = null;
  try { s = localStorage.getItem(MODE_KEY); } catch (e) {}
  return MODES.indexOf(s) >= 0 ? s : 'night';
}

/*  Only night -> day is guarded.  Going darker is never harmful; going
    bright when dark-adapted costs about twenty minutes, so that one change
    takes a deliberate half second and can be released to cancel.  */
function wireModes() {
  var btns = document.querySelectorAll('#modes .mb');
  var HOLD_MS = 500, holdT = null, holdB = null;
  function guarded(m) {
    return m === 'day' &&
           document.documentElement.getAttribute('data-mode') === 'night';
  }
  function cancelHold() {
    if (holdT) clearTimeout(holdT);
    holdT = null;
    if (holdB) holdB.classList.remove('holding');
    holdB = null;
  }
  for (var i = 0; i < btns.length; i++) {
    (function (btn) {
      var m = btn.getAttribute('data-mode');
      btn.addEventListener('pointerdown', function (e) {
        if (!guarded(m)) return;
        e.preventDefault();
        holdB = btn; btn.classList.add('holding');
        holdT = setTimeout(function () { cancelHold(); setMode(m); }, HOLD_MS);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
        btn.addEventListener(ev, cancelHold);
      });
      btn.addEventListener('click', function (e) {
        if (guarded(m)) { e.preventDefault(); return; }   /* the hold does it */
        setMode(m);
      });
      /*  A keyboard activation is already deliberate, so it is not held. */
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode(m); }
      });
    })(btns[i]);
  }
}

function setMode(m) {
  if (MODES.indexOf(m) < 0) m = 'night';
  document.documentElement.setAttribute('data-mode', m);
  var mbs = document.querySelectorAll('#modes .mb');
  for (var mi = 0; mi < mbs.length; mi++)
    mbs[mi].setAttribute('aria-pressed',
      String(mbs[mi].getAttribute('data-mode') === m));
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content',
      getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()
      || '#07090b');   /* the browser chrome follows the palette, so a third mode
                          needs no third branch here */
  try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
  /*  Anything already painted was painted in the old palette.  A canvas or
      an SVG built with colours read at draw time does not follow the
      stylesheet, so it has to be told.  An event rather than a call list:
      the drawing lives in other files, and the course pages embed these
      tools too.  */
  try { window.dispatchEvent(new CustomEvent('visualmodechange', { detail: m })); }
  catch (e) { /* very old browser: the palette still changed */ }
}
var TITLES = { empty: 'drill', home: 'drill', section: '', drill: '',
               diag: 'Where am I weak?', doc: 'The document', about: 'About' };
var BACKTO = { section: 'home', drill: 'home', diag: 'home', doc: 'home', about: 'home' };
function go(v, arg) {
  VIEW = v;
  Object.keys(TITLES).forEach(function (n) { $('v-' + n).hidden = (n !== v); });
  $('back').hidden = !(v in BACKTO);
  if (TITLES[v]) $('title').textContent = TITLES[v];
  window.scrollTo(0, 0);
  if (v === 'home') drawHome();
  if (v === 'diag') startDiagnostic();
  if (v === 'doc') drawDoc();
  if (v === 'about') drawAbout();
}

/* =====================================================================
   The pack
   ===================================================================== */
function validate(p) {
  if (!p || typeof p !== 'object') return 'that file is not a pack';
  if (String(p.format || '').indexOf('bashnav-drill-pack/') !== 0)
    return 'that file does not declare itself a drill pack';
  if (!Array.isArray(p.sections) || !p.sections.length) return 'the pack has no sections';
  if (!Array.isArray(p.questions) || !p.questions.length) return 'the pack has no questions';
  var ids = {};
  for (var i = 0; i < p.sections.length; i++) {
    var s = p.sections[i];
    if (!s.id || !s.title) return 'section ' + (i + 1) + ' has no id or title';
    if (ids[s.id]) return 'two sections share the id ' + s.id;
    ids[s.id] = 1;
  }
  var orphan = 0;
  for (i = 0; i < p.questions.length; i++) if (!ids[p.questions[i].section]) orphan++;
  //  A CARRIED WRONG OPTION THAT EQUALS THE ANSWER IS A QUESTION WITH TWO
  //  RIGHT OPTIONS, and the mark it gives you is a lie either way. Cheap
  //  to check here, impossible to notice while drilling.
  //  An ordering question must have an order to be in, and an intruder
  //  that is not secretly part of it.
  for (i = 0; i < p.questions.length; i++) {
    var qs2 = p.questions[i];
    if (!qs2.seq) continue;
    if (!Array.isArray(qs2.seq) || qs2.seq.length < 3)
      return 'question ' + (i + 1) + ' has fewer than three steps to order';
    for (var a2 = 0; a2 < qs2.seq.length; a2++)
      if (qs2.seq.indexOf(qs2.seq[a2]) !== a2)
        return 'question ' + (i + 1) + ' lists the same step twice';
    var ex = qs2.extra || [];
    if (!Array.isArray(ex) || !ex.length)
      return 'question ' + (i + 1) + ' has no step that does not belong';
    for (var b2 = 0; b2 < ex.length; b2++)
      if (qs2.seq.indexOf(ex[b2]) >= 0)
        return 'question ' + (i + 1) + ' offers a real step as the one that does not belong';
  }
  for (i = 0; i < p.questions.length; i++) {
    var qq = p.questions[i];
    if (!qq.ch || !qq.ch.length) continue;
    if (!Array.isArray(qq.ch)) return 'question ' + (i + 1) + ' has wrong options that are not a list';
    for (var j = 0; j < qq.ch.length; j++) {
      if (qq.ch[j] === qq.a)
        return 'question ' + (i + 1) + ' offers its own answer as a wrong option';
      if (qq.ch.indexOf(qq.ch[j]) !== j)
        return 'question ' + (i + 1) + ' offers the same wrong option twice';
    }
  }
  //  A pack whose questions point at sections it does not contain is
  //  damaged, and loading it half-way would give a drill with silent
  //  holes in it. Rejected whole.
  if (orphan) return orphan + ' questions belong to sections the pack does not contain';
  return '';
}

function loadPack(file) {
  var note = $('load-note');
  note.textContent = 'Reading ' + file.name + '\u2026';
  return file.text().then(function (t) {
    var p;
    try { p = JSON.parse(t); }
    catch (e) { throw new Error('that file is not valid JSON: ' + e.message); }
    var bad = validate(p);
    if (bad) throw new Error(bad);
    return kvPut('pack', p).then(function () {
      PACK = p;
      rememberPack();
      return kvGet('progress');
    }).then(function (pr) {
      PROG = pr || {};
      go('home');
    });
  }).catch(function (e) {
    note.textContent = 'Not loaded: ' + e.message;
    note.className = 'warn';
  });
}

/* ---- progress ------------------------------------------------------ */
function prog(sid) {
  if (!PROG[sid]) PROG[sid] = { best: null, attempts: 0, seen: {}, right: 0, wrong: 0 };
  return PROG[sid];
}
function passed(sid) {
  var p = PROG[sid];
  return !!(p && p.best !== null && p.best >= (PACK.pass || 80));
}
//  Studied means worked, not merely opened: a recall prompt marked, or a
//  test taken. Reading the reference is not studying it.
function studied(sid) {
  var p = PROG[sid];
  if (!p) return false;
  return p.attempts > 0 || (p.right + p.wrong) > 0;
}
function unlocked(i) {
  if (i === 0) return true;
  return passed(PACK.sections[i - 1].id);
}
function qsFor(sid, graded) {
  return PACK.questions.filter(function (q) {
    return q.section === sid && (graded ? !!q.a : !q.a);
  });
}

/* =====================================================================
   Home
   ===================================================================== */
function drawHome() {
  $('pack-title').textContent = PACK.title || 'Content pack';
  //  WHICH PACK IS THIS?  Loading a pack replaces the one in storage, and
  //  nothing on screen said which one you were drilling -- so a pack that
  //  had been rebuilt looked identical to the one it replaced, and the
  //  same question you thought was fixed came round again. The built date
  //  and the question count are what tell them apart at a glance.
  //  THE APP'S BUILD BELONGS ON THE SAME LINE AS THE PACK'S ID.  Which
  //  app and which pack are the two things any report about a question
  //  depends on, and they were in different places -- the build in the
  //  footer, the pack at the top -- so answering "which are you on" took
  //  two looks and usually got one of them.
  $('pack-note').textContent = (PACK.note ? PACK.note + '   \u00b7   ' : '') +
    PACK.sections.length + ' sections, ' + PACK.questions.length + ' questions' +
    (PACK.built ? '   \u00b7   pack ' + PACK.built +
                  (PACK.id ? ' (' + PACK.id + ')' : '') : '') +
    '   \u00b7   app build ' + BUILD;
  var older = stalePack();
  if (older) {
    $('pack-note').appendChild(el('div', 'note warn',
      'This pack was built ' + PACK.built + '. A newer one has been loaded ' +
      'on this device: ' + older[0] + (older[1] ? ' (' + older[1] + ')' : '') +
      '. Load that one unless you mean to drill the older questions.'));
  }

  var done = PACK.sections.filter(function (s) { return passed(s.id); }).length;
  $('prog-n').textContent = done;
  $('prog-n').className = 'big' + (done === PACK.sections.length ? ' pass' : '');
  $('prog-of').textContent = 'of ' + PACK.sections.length + ' sections passed at ' +
    (PACK.pass || 80) + '% or better';
  var next = PACK.sections.filter(function (s, i) { return unlocked(i) && !passed(s.id); })[0];
  $('prog-note').textContent = next
    ? 'Next up: ' + next.title + '.'
    : (done === PACK.sections.length ? 'All through. The diagnostic is the one to keep using now.' : '');

  var ul = $('seclist');
  ul.textContent = '';
  PACK.sections.forEach(function (s, i) {
    var p = PROG[s.id] || {};
    var open = unlocked(i), pass = passed(s.id), seen = studied(s.id);
    var state = pass ? 'pass' : (seen ? 'part' : (open ? 'open' : 'locked'));
    var b = el('button', 'seclink');
    b.setAttribute('data-state', state);
    var nm = el('div', 'nm');
    nm.appendChild(el('span', 'num', String(i + 1)));
    nm.appendChild(el('b', null, s.title));
    var label = pass ? 'PASSED' : seen ? 'STARTED' : open ? 'OPEN' : 'LOCKED';
    nm.appendChild(el('span', 'pill ' + (pass ? 'pass' : seen ? 'part' : open ? 'unseen' : 'locked'), label));
    b.appendChild(nm);
    var bits = [];
    bits.push(qsFor(s.id, true).length + ' graded');
    var rc = qsFor(s.id, false).length;
    if (rc) bits.push(rc + ' recall');
    if (p.best !== null && p.best !== undefined) bits.push('best ' + p.best + '%');
    if (!open) bits.push('opens when you pass ' + PACK.sections[i - 1].title.toLowerCase());
    b.appendChild(el('span', 'sub', bits.join('   \u00b7   ')));
    b.addEventListener('click', function () { openSection(i); });
    ul.appendChild(b);
  });
}

/* =====================================================================
   A section
   ===================================================================== */
var CURSEC = 0;
function openSection(i) {
  CURSEC = i;
  var s = PACK.sections[i];
  $('title').textContent = 'Section ' + (i + 1);
  $('sec-title').textContent = s.title;
  var p = PROG[s.id] || {};
  $('sec-sub').textContent = (s.parts || []).join('  \u00b7  ') +
    (p.best !== null && p.best !== undefined ? '      best ' + p.best + '%' : '');
  drawTabs('ref');
  go('section');
  $('title').textContent = 'Section ' + (i + 1);
}

function drawTabs(which) {
  var s = PACK.sections[CURSEC];
  var open = unlocked(CURSEC);
  var tabs = [['ref', 'Reference'], ['quiz', 'Practice'], ['test', 'Test']];
  var nav = $('sec-tabs');
  nav.textContent = '';
  tabs.forEach(function (t) {
    var b = el('button', null, t[1]);
    b.setAttribute('aria-current', t[0] === which ? 'true' : 'false');
    if (t[0] === 'test' && passed(s.id)) {
      b.appendChild(el('span', 'tick', ' \u2713'));
    }
    b.addEventListener('click', function () { drawTabs(t[0]); });
    nav.appendChild(b);
  });
  var body = $('sec-body');
  body.textContent = '';

  if (which === 'ref') {
    var panel = el('div', 'panel');
    var ref = el('div', 'ref');
    ref.innerHTML = s.html || '';
    wrapTables(ref);
    panel.appendChild(ref);
    body.appendChild(panel);
    return;
  }

  if (which === 'quiz') {
    var n = qsFor(s.id, false).length + qsFor(s.id, true).length;
    var pq = el('div', 'panel');
    pq.appendChild(el('h2', null, 'Practice'));
    pq.appendChild(el('p', null,
      'Recall, not multiple choice: you answer from memory, then ask for the ' +
      'answer and mark yourself. Nothing here counts towards the test.'));
    pq.appendChild(el('p', 'note', n + ' questions in this section. ' +
      'They come in a different order each time.'));
    var go1 = el('button', 'btn wide go', 'Start practising');
    go1.style.marginTop = '12px';
    go1.addEventListener('click', function () { startQuiz(s.id); });
    pq.appendChild(go1);
    body.appendChild(pq);
    return;
  }

  // ---- the test -----------------------------------------------------
  var pt = el('div', 'panel');
  pt.appendChild(el('h2', null, 'Test'));
  if (!open) {
    //  Locked, and the reason is given rather than implied.
    pt.appendChild(el('p', 'warn',
      'This test opens when you pass \u201c' + PACK.sections[CURSEC - 1].title +
      '\u201d at ' + (PACK.pass || 80) + '% or better.'));
    pt.appendChild(el('p', 'note',
      'The reference above is open regardless, and always will be \u2014 being ' +
      'locked out of a procedure you are carrying this for is the one failure ' +
      'worth designing against.'));
    body.appendChild(pt);
    return;
  }
  var graded = qsFor(s.id, true);
  var len = Math.min(10, graded.length);
  pt.appendChild(el('p', null, len + ' questions, multiple choice, ' +
    (PACK.pass || 80) + '% to pass' +
    (CURSEC + 1 < PACK.sections.length ? ' and open the next section.' : '.')));
  pt.appendChild(el('p', 'note',
    'The wrong options are drawn from this same section, so they are the ' +
    'plausible confusions rather than obvious throwaways.'));
  var pp = PROG[s.id] || {};
  if (pp.attempts) {
    pt.appendChild(el('p', 'note', pp.attempts + ' attempt' + (pp.attempts === 1 ? '' : 's') +
      ', best ' + pp.best + '%.'));
  }
  var go2 = el('button', 'btn wide go', pp.attempts ? 'Take it again' : 'Take the test');
  go2.style.marginTop = '12px';
  go2.addEventListener('click', function () { startTest(s.id); });
  pt.appendChild(go2);
  body.appendChild(pt);
}

//  A wide table must scroll inside its own box, never take the page
//  sideways with it.
function wrapTables(root) {
  Array.prototype.forEach.call(root.querySelectorAll('table'), function (t) {
    if (t.parentNode && t.parentNode.className === 'tablewrap') return;
    var w = el('div', 'tablewrap');
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  });
}

/* =====================================================================
   Drilling
   ===================================================================== */
function shuffle(a, rnd) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor((rnd ? rnd() : Math.random()) * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function srcLine(q) {
  var w = q.where || {};
  var bits = [w.part, w.sub, w.row].filter(Boolean);
  return bits.join('  /  ');
}

function startQuiz(sid) {
  var s = PACK.sections[CURSEC];
  //  Recall prompts first -- they are the author's own and the harder
  //  kind -- then the graded ones asked as recall rather than as choices.
  var qs = shuffle(qsFor(sid, false)).concat(shuffle(qsFor(sid, true)));
  RUN = { mode: 'quiz', sid: sid, qs: qs, i: 0, right: 0, wrong: 0 };
  $('drill-title').textContent = s.title;
  go('drill');
  $('title').textContent = 'Practice';
  stepQuiz();
}

function stepQuiz() {
  var r = RUN, body = $('drill-body');
  body.textContent = '';
  $('drill-sub').textContent = 'marked by you \u00b7 nothing here counts towards the test';

  if (r.i >= r.qs.length) {
    var done = el('div', 'panel');
    done.appendChild(el('h2', null, 'Practice done'));
    done.appendChild(el('p', null, 'You marked ' + r.right + ' right and ' +
      r.wrong + ' wrong out of ' + r.qs.length + '.'));
    done.appendChild(el('p', 'note',
      'Self-marked, so it opens nothing \u2014 but it is recorded, which is how ' +
      'the diagnostic knows this section has been worked rather than only read.'));
    var again = el('button', 'btn wide', 'Again, reshuffled');
    again.addEventListener('click', function () { startQuiz(r.sid); });
    done.appendChild(again);
    var back = el('button', 'btn wide go', 'Back to the section');
    back.style.marginTop = '8px';
    back.addEventListener('click', function () { go('section'); drawTabs('quiz');
      $('title').textContent = 'Section ' + (CURSEC + 1); });
    done.appendChild(back);
    body.appendChild(done);
    return;
  }

  var q = r.qs[r.i];
  var card = el('div', 'card');
  card.appendChild(el('div', 'qnum', 'Question ' + (r.i + 1) + ' of ' + r.qs.length));
  card.appendChild(el('p', 'qtext', q.q));

  //  Already worked: show the answer and the mark you gave it, and do not
  //  offer to mark it again.
  if (r.marks && r.marks[r.i]) {
    card.appendChild(el('p', 'atext', q.a || 'A recall prompt \u2014 check yourself against the reference.'));
    card.appendChild(el('p', 'qsrc' + (q.kind === 'hand' ? ' hand' : ''),
      (q.kind === 'hand' ? 'hand-written \u00b7 ' : '') + srcLine(q)));
    card.appendChild(el('p', 'note', r.marks[r.i] === 'right'
      ? 'You marked this one right.' : 'You marked this one wrong.'));
    navRow(card, r, stepQuiz, 'Done');
    body.appendChild(card);
    return;
  }

  //  THE ANSWER IS NOT BUILT YET.  It is not in the DOM, hidden or
  //  otherwise, until the button below is pressed.
  var show = el('button', 'btn wide go', 'Show the answer');
  show.setAttribute('data-reveal', '1');
  show.style.marginTop = '16px';
  show.addEventListener('click', function () {
    show.remove();
    if (q.a) {
      card.appendChild(el('p', 'atext', q.a));
    } else {
      var p = el('p', 'atext');
      p.appendChild(el('span', null,
        'This one has no written answer \u2014 it is a recall prompt. Check yourself ' +
        'against the reference: '));
      var lk = el('button', 'btn', 'open the reference');
      lk.style.marginTop = '10px';
      lk.addEventListener('click', function () {
        go('section'); drawTabs('ref');
        $('title').textContent = 'Section ' + (CURSEC + 1);
      });
      p.appendChild(lk);
      card.appendChild(p);
    }
    var src = el('p', 'qsrc' + (q.kind === 'hand' ? ' hand' : ''),
      (q.kind === 'hand' ? 'hand-written \u00b7 ' : '') + srcLine(q));
    card.appendChild(src);
    var row = el('div', 'btnrow');
    row.style.marginTop = '14px';
    [['I had it', 'right'], ['I did not', 'wrong']].forEach(function (m) {
      var b = el('button', 'btn' + (m[1] === 'right' ? ' go' : ''), m[0]);
      b.setAttribute('data-mark-self', m[1]);
      b.addEventListener('click', function () {
        var pr = prog(r.sid);
        pr.seen[q.q] = 1;
        if (m[1] === 'right') { r.right++; pr.right++; } else { r.wrong++; pr.wrong++; }
        //  Remembered so Back can show what you told yourself, and so a
        //  second look does not count twice.
        if (!r.marks) r.marks = {};
        r.marks[r.i] = m[1];
        saveProg();
        r.i++;
        stepQuiz();
      });
      row.appendChild(b);
    });
    card.appendChild(row);
  });
  card.appendChild(show);
  body.appendChild(card);
}

/* ---- the graded test ------------------------------------------------ */
//  Distractors come from the SAME SECTION, preferring the same kind of
//  question, so the wrong options are the confusions that actually
//  happen rather than obvious throwaways. A test you can pass by
//  elimination has not tested anything.
//  TWO OPTIONS A READER WOULD CALL THE SAME OPTION.  Comparing answers
//  with !== only catches a byte-for-byte match. A graded question offered
//  "The sails end up in front of the forestay, and winching them back is
//  hard, slow, and damages sail or hanks." alongside the same sentence
//  without its leading "The" and its full stop -- two right answers, one
//  mark, and picking the better-written one was marked wrong.
var STOPW = (' a an the and or of to in on at is are was be by for with from it ' +
  'its this that these those as if then than so not no do does did you your they ' +
  'them their there here what which who when where how why all any into onto out ' +
  'up down off over under before after while during each both other others same ' +
  'more most less least must should would could ').split(' ');

function contentWords(x) {
  var out = {}, n = 0, ws = String(x || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  ws.forEach(function (w) {
    //  A NUMBER IS ALWAYS SIGNIFICANT, however short. Dropping short
    //  tokens threw digits away with the noise, so "6 of them" and "4 of
    //  them" reduced to the same words and counted as one answer -- and
    //  so did every "Fact 1 / Fact 2" style answer in the test pack,
    //  which is how this was noticed.
    if (STOPW.indexOf(w) >= 0 || out[w]) return;
    if (w.length <= 2 && !/^[0-9]+$/.test(w)) return;
    out[w] = 1; n++;
  });
  out.__n = n;
  return out;
}

//  ONE ANSWER INSIDE ANOTHER IS STILL ONE ANSWER.  Normalising the text
//  catches a leading "The" and a full stop. It cannot catch this, which
//  is the same fault a layer down:
//
//    "The vang, the mainsheet and the topping lift."
//    "Vang, Mainsheet, Topping lift - depower: ease the vang and
//     mainsheet, raise the boom with the topping lift."
//
//  Both name the same three controls; the second only says more about
//  them. Asked "which three controls govern leech tension", they are one
//  answer offered twice. So the comparison moved from how the text reads
//  to what it says: if every significant word of the shorter option is in
//  the longer, it is not a distractor.
//
//  A deliberate consequence: a longer option that merely restates the
//  answer with extra detail is suppressed either way round, since the
//  subset test does not care which is which.
//
//  And an acknowledged gap: the three-word floor means a SHORT option
//  inside a longer answer is still offered. "Crew briefed" sits inside
//  "crew briefed and ready on the foredeck" and will be offered against
//  it, because "crew briefed" has two significant words. Lowering the
//  floor would catch those and empty the pool at the same time -- "lower"
//  alone is inside half the mainsail procedures. The floor is the price
//  of the rule, not an oversight.
//  THE FIRST TWO CONTENT WORDS -- what an answer is ABOUT.  The rows of
//  this document are written the same way throughout, the thing acted on
//  first, so two answers opening on the same thing are about the same
//  thing whatever follows.
//
//  This mirrors lead_phrase() in the generator's textsim.py, and the two
//  are kept in step by hand because one is Python and one is not.  The
//  word lists are identical; contentWords() here additionally drops
//  tokens of one or two letters, which the Python does not, and that
//  difference has never changed an outcome.
function leadPhrase(x) {
  var skip = ['the', 'a', 'an', 'is', 'are', 'all'];
  var ws = String(x || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  var w = ws.filter(function (t) { return skip.indexOf(t) < 0; });
  return w.slice(0, 2).join(' ');
}

//  THE PACK HAS NO SELF-HEAL, AND CANNOT HAVE ONE.  The app repairs its
//  own staleness by asking the network what build is live; a pack is a
//  file the reader chose and loaded from their own disk, and there is
//  nothing to ask.  So the next best thing: remember the newest pack this
//  browser has ever seen, and say so when an older one is loaded.
//
//  Larry lost a drilling session to exactly this gap.  The app said build
//  14, which was true and current, while serving a pack from the day
//  before -- so the questions he reported had already been fixed, and the
//  screen gave him no reason to doubt it.  His own account: "perhaps my
//  bad, I swa a broweser open with build 14, thought it must be good".
//  It was a fair inference from what was shown.  The build and the pack
//  are two independent things and the app was only honest about one.
function rememberPack() {
  if (!PACK || !PACK.built) return;
  var seen = lsGet('newest-pack', '');
  if (!seen || String(PACK.built) > seen.split('|')[0])
    lsSet('newest-pack', PACK.built + '|' + (PACK.id || ''));
}

//  ONLY ON A STRICTLY OLDER DATE.  Two packs built on the same day -- which
//  is every day the generator runs twice -- cannot be ordered by the date
//  they carry, and ranking them by id would be a guess wearing the clothes
//  of a warning.  Saying nothing is the honest answer there, and the id is
//  already on screen for the reader who knows which one they want.
function stalePack() {
  if (!PACK || !PACK.built) return null;
  var seen = lsGet('newest-pack', '');
  if (!seen) return null;
  var bits = seen.split('|');
  return String(PACK.built) < bits[0] ? bits : null;
}

function sameAnswer(a, b) {
  var f = function (x) {
    return String(x || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/^(the|a|an) /, '')
      .trim();
  };
  if (f(a) === f(b)) return true;
  //  SAME OPENING, SAME SUBJECT.  Larry, drilling: "This question I got
  //  wrong, chose D you think A" -- asked what tacking's "Ready about?"
  //  means, he was offered gybing's wording for "Ready to gybe?" as a
  //  wrong option.  Same call, one manoeuvre over, and the gybe's wording
  //  is the fuller of the two, so D was at least as true as A.  Both open
  //  "Crew confirm if they are ready, or not", word for word.
  //
  //  The section pool holds tacking AND gybing, so the pool was right to
  //  offer it and the test was wrong to allow it.  These questions carry
  //  no options of their own, and cannot: their answers are two-source
  //  merges, and a merged answer among three plain ones is marked by its
  //  shape.  So the filtering has to happen here.
  var la = leadPhrase(a), lb = leadPhrase(b);
  if (la && la === lb) return true;
  var wa = contentWords(a), wb = contentWords(b);
  var small = wa.__n <= wb.__n ? wa : wb, big = small === wa ? wb : wa;
  //  Three words is the floor. Below it almost anything is a subset of
  //  something -- "Lower" sits inside half the mainsail procedures -- and
  //  suppressing those would empty the pool rather than clean it.
  if (small.__n < 3) return false;
  //  FOUR FIFTHS, NOT ALL.  This asked for every word of the shorter
  //  answer to appear in the longer, which is a higher bar than the
  //  generator's about_same() and is the second reason that pair got
  //  through: "the answer is a shouted YES" against "put your arm in the
  //  air" shares about three quarters of its words, not all of them.
  //  The threshold now matches the generator's, and the pool cannot run
  //  dry because of it -- the whole-pack last resort below still applies.
  var shared = 0;
  for (var k in small) {
    if (k === '__n' || !small.hasOwnProperty(k)) continue;
    if (big[k]) shared++;
  }
  return shared / small.__n >= 0.8;
}

function makeChoices(q, pool) {
  //  A QUESTION MAY CARRY ITS OWN WRONG OPTIONS, AND WHERE IT DOES THEY
  //  ARE THE ONLY ONES USED.  Drawing distractors from the section pool
  //  works when the answers are mutually exclusive, and breaks when they
  //  are not.  "Which of these is on the hoist preparation checklist?"
  //  drawn from the pool can offer three other items off the same
  //  checklist: three right answers marked wrong.  Those questions have
  //  to name their own wrong options -- items from a NEIGHBOURING
  //  checklist, real text in the wrong place -- and the pack does that.
  if (q.ch && q.ch.length) {
    var carried = q.ch.slice(0, 3).map(function (t) { return { t: t, ok: false }; });
    carried.push({ t: q.a, ok: true });
    return shuffle(carried);
  }
  //  NOT FROM THE SAME PARAGRAPH, where one of them is hand-written.
  //  Two questions about one subsection have overlapping answers by
  //  construction: you cannot give the REASON for a rule without stating
  //  the rule, so "why forward first" answers "state Rule 3" as well as
  //  its own question. Extracted questions are keyed to distinct rows and
  //  make each other's best distractors, so this is narrowed to the
  //  hand-written ones, which are the only kind that ask about the same
  //  material from several angles.
  var sub = function (x) { return (x && x.where && x.where.sub) || ''; };
  var sameParagraph = function (o) {
    if (!sub(o) || sub(o) !== sub(q)) return false;
    return o.kind === 'hand' || q.kind === 'hand';
  };
  //  NOT FROM THE SAME STATION IN THE SAME CHAIN.  Larry, on "You are on
  //  helming.  The call is "Lee ho"": he answered "called somewhere in the
  //  middle of your turn.  Keep going." and was marked right, but the
  //  option "Keep going.  Know which way you are turning (to windward)."
  //  is just as true -- it is the SAME STATION's answer to a different
  //  call in the SAME chain.  A station's job is usually continuous: the
  //  helm keeps turning through most of a tack, and the document says so
  //  in slightly different words beside each call.  Any two of those are
  //  both right, and no wording of the question can separate them.
  //
  //  The distractors that make this question worth asking are the OTHER
  //  stations' answers -- they ask whose job it is, which is the thing a
  //  watch leader has to know, rather than which sentence the book
  //  happened to print beside which call.
  var sta = function (x) { return (x && x.where && x.where.station) || ''; };
  var prt = function (x) { return (x && x.where && x.where.part) || ''; };
  var sameStation = function (o) {
    return !!sta(q) && sta(o) === sta(q) && prt(o) === prt(q);
  };
  //  NOT ANOTHER MOMENT OF THE SAME EVOLUTION.  Larry, on the reef:
  //  "both B and C are correct". The stem named one stage of a
  //  three-stage procedure -- "for Lower, what happens?" -- and three of
  //  the four options were rows of that same procedure: Lower, Set the
  //  LUFF, Set the FOOT. You haul the luff cringle down WHILE the sail is
  //  coming down, so more than one row is a true answer to the moment the
  //  stem names, and no wording of the question separates them. Same
  //  cause as a station's continuous job above, one level out again.
  //
  //  Only where the generator marked the question as coming from an
  //  ORDERED table (seqtbl). On a table that is not a sequence -- the
  //  luff, foot and leech against their controls, the depowering ladder
  //  against its effects -- the other rows are genuinely different things
  //  and are the best distractors there are, so they stay.
  var tbl = function (x) { return (x && x.where && x.where.tbl) || ''; };
  var sameEvolution = function (o) {
    return !!q.seqtbl && sub(o) === sub(q) && prt(o) === prt(q) && tbl(o) === tbl(q);
  };
  //  WITHIN ONE TABLE, ONLY THE SAME COLUMN.  A matrix column answers
  //  one question and the column beside it answers a different one, so a
  //  cell from next door is not a wrong answer - it is an answer to a
  //  question nobody asked. Larry, on a yes/no column: he was offered
  //  "Racing change (4.3)" as one of four answers to "both sails on the
  //  foredeck?", and elsewhere "Yes - new sail hanked on alongside the
  //  old" as an answer to "what is the first thing that happens?"
  //
  //  The generator supplies same-column options where it can. It cannot
  //  when the table has two rows, because one column then holds a single
  //  distractor and three are needed - which is exactly the table that
  //  produced the complaint. So the rule has to hold here as well.
  //
  //  Only WITHIN a table. Across tables a cell is ordinary prose from the
  //  right part of the document and makes a perfectly good distractor,
  //  and refusing those would empty the pool for a two-row matrix.
  var col = function (x) { return (x && x.col) || ''; };
  var crossColumn = function (o) {
    return !!col(q) && sub(o) === sub(q) && prt(o) === prt(q) &&
           tbl(o) === tbl(q) && col(o) !== col(q);
  };
  var usable = function (o) {
    return o.a && !sameAnswer(o.a, q.a) && !(o.ch && o.ch.length) &&
           !(o.seq && o.seq.length) && !sameParagraph(o) && !sameStation(o) &&
           !sameEvolution(o) && !crossColumn(o);
  };
  var same = pool.filter(function (o) { return usable(o) && o.kind === q.kind; });
  var other = pool.filter(function (o) { return usable(o) && o.kind !== q.kind; });
  var picks = [];
  var take = function (list) {
    shuffle(list).forEach(function (o) {
      if (picks.length >= 3) return;
      //  ... and not the same as one already picked, either.
      for (var i = 0; i < picks.length; i++)
        if (sameAnswer(picks[i].a, o.a)) return;
      picks.push(o);
    });
  };
  take(same);
  take(other);
  //  A SECTION CAN RUN OUT.  As more questions carry their own options,
  //  the pool left for the rest shrinks -- and in the safety section it
  //  shrank to nothing, which would have rendered one question with a
  //  single option: an automatic mark, which is worse than the duplicate
  //  this filtering was added to prevent. So the last resort is the whole
  //  pack. An option from another part is an easier distractor, but the
  //  reader still has to know their own section's answer, and a fair
  //  easy question beats a free one.
  if (picks.length < 3 && typeof PACK === 'object' && PACK && PACK.questions) {
    take(PACK.questions.filter(usable));
  }
  var out = picks.map(function (o) { return { t: o.a, ok: false }; });
  out.push({ t: q.a, ok: true });
  return shuffle(out);
}

/*  ---- ordering questions -------------------------------------------
 *  A four-option question can test which step belongs. It cannot test
 *  that you know the ORDER, because naming a position -- "what is number
 *  four" -- tests the layout of the page rather than the procedure.
 *
 *  So: the steps are offered scrambled, with one that belongs to a
 *  different procedure mixed in, and you tap them into order and leave
 *  the intruder alone. Marked all or nothing. Partial credit would make
 *  a near miss on a sequence look like competence, and on a MOB chain a
 *  near miss is a different outcome entirely.
 */
function isOrder(q) { return !!(q && q.seq && q.seq.length); }

function renderOrder(card, q, mark, advLabel, onAdv, nav) {
  var chosen = [];
  var pool = shuffle(q.seq.concat(q.extra || []));
  var hint = el('p', 'note', 'Tap them into the order they happen. One does not ' +
                            'belong \u2014 leave it out.');
  card.appendChild(hint);

  var picked = el('ol', 'seq-picked');
  var rest = el('div', 'seq-pool');
  card.appendChild(picked);
  card.appendChild(rest);

  var check = el('button', 'btn wide go', 'Check');
  check.setAttribute('data-seq-check', '1');
  check.style.marginTop = '14px';
  check.disabled = true;
  var done = false;

  function draw() {
    picked.textContent = '';
    rest.textContent = '';
    chosen.forEach(function (t, i) {
      var li = el('li', 'seq-row chosen');
      li.appendChild(el('span', 'seq-n', String(i + 1)));
      li.appendChild(el('span', null, t));
      if (!done) li.addEventListener('click', function () {
        chosen.splice(i, 1); draw();
      });
      picked.appendChild(li);
    });
    pool.forEach(function (t) {
      if (chosen.indexOf(t) >= 0) return;
      var b = el('button', 'seq-row');
      b.setAttribute('data-seq-item', t);
      b.appendChild(el('span', null, t));
      if (!done) b.addEventListener('click', function () { chosen.push(t); draw(); });
      rest.appendChild(b);
    });
    check.disabled = done || !chosen.length;
  }

  check.addEventListener('click', function () {
    if (done) return;
    done = true;
    var ok = chosen.length === q.seq.length &&
             chosen.every(function (t, i) { return t === q.seq[i]; });
    draw();
    /*  MARK WHAT HE PUT, not only what it should have been.
        Larry, after putting the hoist's last two steps the wrong way
        round: "I got the order wrong, but it gave me all green." He had.
        The mark was taken correctly and the point was not scored -- what
        failed was the screen. His own rows kept the accent border they
        had while he was placing them, the correct order below them was
        drawn in green, and the only verdict anywhere was the difference
        between "The order is:" and "Correct, in that order." Two lists,
        one of them green, and nothing saying which was his.
        Each row he placed now carries its own mark, by position: green
        where that step belongs where he put it, red where it does not.
        A swapped pair therefore shows two red rows and names itself --
        which is the teaching, and more than "wrong" could say. */
    [].forEach.call(picked.querySelectorAll('.seq-row'), function (li, i) {
      li.setAttribute('data-mark', chosen[i] === q.seq[i] ? 'right' : 'wrong');
    });
    //  Show the order it should have been, every time. The point of the
    //  question is the sequence, so being told only "wrong" teaches
    //  nothing.
    var right = el('ol', 'seq-picked right');
    q.seq.forEach(function (t, i) {
      var li = el('li', 'seq-row chosen');
      li.setAttribute('data-mark', 'right');
      li.appendChild(el('span', 'seq-n', String(i + 1)));
      li.appendChild(el('span', null, t));
      right.appendChild(li);
    });
    /*  AND SAY IT IN WORDS, not only in colour.  "The order is:" is
        information, not a verdict, and this was the one question kind
        that never gave one. It goes in the line that is already there
        rather than a heading of its own: nothing in this stylesheet
        styles a verdict, and a four-option question gives its own by
        colouring the options -- which is what the rows above now do.
        Said in words as well because the lights drill settled this
        argument already: a mark that reads only in colour does not
        reach everybody looking at it. */
    card.appendChild(el('p', 'qsrc', ok ? 'Correct, in that order.'
                                        : 'Not right. The order is:'));
    if (!ok) card.appendChild(right);
    if ((q.extra || []).length) {
      card.appendChild(el('p', 'note', 'Not part of it: \u201c' +
        q.extra.join('\u201d, \u201c') + '\u201d.'));
    }
    mark(ok, chosen.join(' \u2192 '));
    //  THE CALLER OWNS THE NAVIGATION.  This used to append its own
    //  advance button, so an ordering question was the one kind with no
    //  Back on it -- and in a ten-question test that is one screen in
    //  three you could not return from.
    if (nav) { nav(card); return; }
    var nx = el('button', 'btn wide go', advLabel);
    nx.setAttribute('data-advance', '1');
    nx.style.marginTop = '14px';
    nx.addEventListener('click', onAdv);
    card.appendChild(nx);
  });
  card.appendChild(check);
  draw();
}

function startTest(sid) {
  var graded = qsFor(sid, true);
  var len = Math.min(10, graded.length);
  var qs = shuffle(graded).slice(0, len).map(function (q) {
    return { q: q, choices: isOrder(q) ? null : makeChoices(q, graded) };
  });
  RUN = { mode: 'test', sid: sid, qs: qs, i: 0, right: 0, answers: [] };
  $('drill-title').textContent = PACK.sections[CURSEC].title;
  go('drill');
  $('title').textContent = 'Test';
  stepTest();
}

//  ---- going back ----------------------------------------------------
//  REVIEW ONLY.  You can return to a question you have answered and see
//  what you picked and what was right, and you cannot change the mark.
//  Letting an answer be changed on a second look would make the pass
//  threshold a statement about persistence rather than knowledge.
function navRow(card, r, step, endLabel) {
  var row = el('div', 'btnrow');
  row.style.marginTop = '14px';
  if (r.i > 0) {
    var bk = el('button', 'btn', 'Back');
    bk.setAttribute('data-back', '1');
    bk.addEventListener('click', function () { r.i--; step(); });
    row.appendChild(bk);
  }
  var nx = el('button', 'btn go',
    r.i + 1 >= r.qs.length ? (endLabel || 'See the score') : 'Next');
  nx.setAttribute('data-advance', '1');
  nx.addEventListener('click', function () { r.i++; step(); });
  row.appendChild(nx);
  card.appendChild(row);
}

//  A question already answered, redrawn as it was marked.
function drawAnswered(card, r, item, step, endLabel) {
  var q = item.q;
  if (isOrder(q)) {
    var yours = el('ol', 'seq-picked');
    (item.picked || []).forEach(function (t, i) {
      var li = el('li', 'seq-row chosen');
      li.setAttribute('data-mark', item.ok ? 'right' : 'wrong');
      li.appendChild(el('span', 'seq-n', String(i + 1)));
      li.appendChild(el('span', null, t));
      yours.appendChild(li);
    });
    card.appendChild(el('p', 'qsrc', item.ok ? 'You had it, in that order.'
                                             : 'You gave:'));
    card.appendChild(yours);
    if (!item.ok) {
      card.appendChild(el('p', 'qsrc', 'The order is:'));
      var right = el('ol', 'seq-picked right');
      q.seq.forEach(function (t, i) {
        var li = el('li', 'seq-row chosen');
        li.setAttribute('data-mark', 'right');
        li.appendChild(el('span', 'seq-n', String(i + 1)));
        li.appendChild(el('span', null, t));
        right.appendChild(li);
      });
      card.appendChild(right);
    }
  } else {
    var grid = el('div', 'choices');
    item.choices.forEach(function (c, n) {
      var b = el('button', 'choice');
      b.disabled = true;
      b.appendChild(el('i', null, 'ABCD'.charAt(n)));
      b.appendChild(el('span', null, c.t));
      if (c.ok) b.setAttribute('data-mark', 'right');
      else if (c.t === item.picked) b.setAttribute('data-mark', 'wrong');
      grid.appendChild(b);
    });
    card.appendChild(grid);
  }
  card.appendChild(el('p', 'qsrc' + (q.kind === 'hand' ? ' hand' : ''),
    (q.kind === 'hand' ? 'hand-written \u00b7 ' : '') + srcLine(q)));
  navRow(card, r, step, endLabel);
}

function stepTest() {
  var r = RUN, body = $('drill-body');
  body.textContent = '';
  $('drill-sub').textContent = 'graded \u00b7 ' + (PACK.pass || 80) + '% to pass';

  if (r.i >= r.qs.length) { finishTest(); return; }

  var item = r.qs[r.i], q = item.q;
  var card = el('div', 'card');
  card.appendChild(el('div', 'qnum', 'Question ' + (r.i + 1) + ' of ' + r.qs.length));
  card.appendChild(el('p', 'qtext', q.q));
  if (item.done) { drawAnswered(card, r, item, stepTest); body.appendChild(card); return; }
  if (isOrder(q)) {
    renderOrder(card, q, function (ok, got) {
      if (ok) r.right++;
      item.done = true; item.ok = ok;
      item.picked = got ? got.split(' \u2192 ') : [];
      r.answers.push({ q: q, got: got, ok: ok });
      card.appendChild(el('p', 'qsrc', srcLine(q)));
    }, r.i + 1 >= r.qs.length ? 'See the score' : 'Next',
       function () { r.i++; stepTest(); },
       function (c) { navRow(c, r, stepTest); });
    body.appendChild(card);
    return;
  }
  var grid = el('div', 'choices');
  var answered = false;
  item.choices.forEach(function (c, n) {
    var b = el('button', 'choice');
    b.appendChild(el('i', null, 'ABCD'.charAt(n)));
    b.appendChild(el('span', null, c.t));
    b.addEventListener('click', function () {
      if (answered) return;
      answered = true;
      //  Mark it on the spot: right or wrong, and where the right one
      //  came from. Learning happens here, not on the score screen.
      Array.prototype.forEach.call(grid.children, function (x) { x.disabled = true; });
      item.choices.forEach(function (cc, m) {
        if (cc.ok) grid.children[m].setAttribute('data-mark', 'right');
      });
      if (!c.ok) b.setAttribute('data-mark', 'wrong');
      if (c.ok) r.right++;
      item.done = true; item.ok = c.ok; item.picked = c.t;
      r.answers.push({ q: q, got: c.t, ok: c.ok });
      card.appendChild(el('p', 'qsrc' + (q.kind === 'hand' ? ' hand' : ''),
        (q.kind === 'hand' ? 'hand-written \u00b7 ' : '') + srcLine(q)));
      //  A STABLE HOOK, so nothing has to find this button by its words.
      //  A test that matched on "next" clicked an answer containing the
      //  word instead, the question never advanced, and the page hung.
      navRow(card, r, stepTest);
    });
    grid.appendChild(b);
  });
  card.appendChild(grid);
  body.appendChild(card);
}

function finishTest() {
  var r = RUN, s = PACK.sections[CURSEC];
  var pct = Math.round(r.right / r.qs.length * 100);
  var need = PACK.pass || 80;
  var ok = pct >= need;
  var pr = prog(r.sid);
  pr.attempts++;
  if (pr.best === null || pct > pr.best) pr.best = pct;
  saveProg();

  var body = $('drill-body');
  body.textContent = '';
  var card = el('div', 'panel');
  var sc = el('div', 'score');
  var big = el('div', 'big ' + (ok ? 'pass' : 'fail'), pct + '%');
  sc.appendChild(big);
  sc.appendChild(el('div', 'of', r.right + ' of ' + r.qs.length + ' \u00b7 ' + need + '% needed'));
  card.appendChild(sc);

  var nextSec = PACK.sections[CURSEC + 1];
  if (ok) {
    card.appendChild(el('p', 'verdict ok', nextSec
      ? 'Passed. \u201c' + nextSec.title + '\u201d is open.'
      : 'Passed \u2014 and that was the last section.'));
  } else {
    card.appendChild(el('p', 'verdict no', 'Not yet. Work the reference and the ' +
      'practice, then take it again \u2014 it reshuffles and redraws the wrong options.'));
  }
  if (pr.best !== pct) card.appendChild(el('p', 'note', 'Your best on this section is ' + pr.best + '%.'));

  var missed = r.answers.filter(function (a) { return !a.ok; });
  if (missed.length) {
    card.appendChild(el('h2', null, 'What you missed'));
    var ul = el('ul', 'items');
    missed.forEach(function (a) {
      var li = el('li');
      var nm = el('span', 'nm');
      nm.appendChild(el('b', null, a.q.q));
      nm.appendChild(el('span', null, a.q.a));
      li.appendChild(nm);
      ul.appendChild(li);
    });
    card.appendChild(ul);
  }

  var b1 = el('button', 'btn wide' + (ok ? '' : ' go'), 'Take it again');
  b1.style.marginTop = '12px';
  b1.addEventListener('click', function () { startTest(r.sid); });
  card.appendChild(b1);
  var b2 = el('button', 'btn wide' + (ok ? ' go' : ''),
    ok && nextSec ? 'On to ' + nextSec.title : 'Back to the sections');
  b2.style.marginTop = '8px';
  b2.addEventListener('click', function () {
    if (ok && nextSec) { openSection(CURSEC + 1); } else { go('home'); }
  });
  card.appendChild(b2);
  body.appendChild(card);
}

/* =====================================================================
   The diagnostic
   ===================================================================== */
function startDiagnostic() {
  var body = $('diag-body');
  body.textContent = '';
  var worked = PACK.sections.filter(function (s) { return studied(s.id); });
  var notYet = PACK.sections.filter(function (s) { return !studied(s.id); });

  if (!worked.length) {
    body.appendChild(el('p', 'note',
      'Nothing to diagnose yet \u2014 no section has been worked. Practise or test ' +
      'one and come back.'));
    return;
  }

  var pick = [];
  worked.forEach(function (s) {
    var graded = qsFor(s.id, true);
    //  An even spread, so one big section cannot dominate the verdict.
    shuffle(graded).slice(0, 4).forEach(function (q) {
      pick.push({ q: q, choices: isOrder(q) ? null : makeChoices(q, graded) });
    });
  });
  pick = shuffle(pick);

  var p = el('p', null, pick.length + ' questions across the ' + worked.length +
    ' section' + (worked.length === 1 ? '' : 's') + ' you have worked.');
  body.appendChild(p);
  if (notYet.length) {
    body.appendChild(el('p', 'note', notYet.length + ' section' +
      (notYet.length === 1 ? ' has' : 's have') + ' not been studied at all and ' +
      'are left out rather than scored as zero: ' +
      notYet.map(function (s) { return s.title; }).join(', ') + '.'));
  }
  var b = el('button', 'btn wide go', 'Start');
  b.style.marginTop = '12px';
  b.addEventListener('click', function () {
    RUN = { mode: 'diag', qs: pick, i: 0, right: 0, answers: [], notYet: notYet };
    $('drill-title').textContent = 'Where am I weak?';
    go('drill');
    $('title').textContent = 'Diagnostic';
    stepDiag();
  });
  body.appendChild(b);
}

function stepDiag() {
  var r = RUN, body = $('drill-body');
  body.textContent = '';
  $('drill-sub').textContent = 'scored per section \u00b7 opens nothing';
  if (r.i >= r.qs.length) { finishDiag(); return; }

  var item = r.qs[r.i], q = item.q;
  var card = el('div', 'card');
  card.appendChild(el('div', 'qnum', 'Question ' + (r.i + 1) + ' of ' + r.qs.length));
  card.appendChild(el('p', 'qtext', q.q));
  if (item.done) {
    drawAnswered(card, r, item, stepDiag, 'What should I study?');
    body.appendChild(card);
    return;
  }
  if (isOrder(q)) {
    renderOrder(card, q, function (ok, got) {
      if (ok) r.right++;
      item.done = true; item.ok = ok;
      item.picked = got ? got.split(' \u2192 ') : [];
      r.answers.push({ section: q.section, ok: ok });
    }, r.i + 1 >= r.qs.length ? 'What should I study?' : 'Next',
       function () { r.i++; stepDiag(); },
       function (c) { navRow(c, r, stepDiag, 'What should I study?'); });
    body.appendChild(card);
    return;
  }
  var grid = el('div', 'choices');
  var answered = false;
  item.choices.forEach(function (c, n) {
    var b = el('button', 'choice');
    b.appendChild(el('i', null, 'ABCD'.charAt(n)));
    b.appendChild(el('span', null, c.t));
    b.addEventListener('click', function () {
      if (answered) return;
      answered = true;
      Array.prototype.forEach.call(grid.children, function (x) { x.disabled = true; });
      item.choices.forEach(function (cc, m) {
        if (cc.ok) grid.children[m].setAttribute('data-mark', 'right');
      });
      if (!c.ok) b.setAttribute('data-mark', 'wrong');
      if (c.ok) r.right++;
      item.done = true; item.ok = c.ok; item.picked = c.t;
      r.answers.push({ section: q.section, ok: c.ok });
      navRow(card, r, stepDiag, 'What should I study?');
    });
    grid.appendChild(b);
  });
  card.appendChild(grid);
  body.appendChild(card);
}

function finishDiag() {
  var r = RUN, body = $('drill-body');
  body.textContent = '';
  var by = {};
  r.answers.forEach(function (a) {
    if (!by[a.section]) by[a.section] = { n: 0, right: 0 };
    by[a.section].n++;
    if (a.ok) by[a.section].right++;
  });
  var rows = Object.keys(by).map(function (sid) {
    var s = PACK.sections.filter(function (x) { return x.id === sid; })[0];
    return { id: sid, title: s ? s.title : sid, n: by[sid].n, right: by[sid].right,
             pct: Math.round(by[sid].right / by[sid].n * 100) };
  });
  rows.sort(function (a, b) { return a.pct - b.pct; });

  var card = el('div', 'panel');
  var pct = Math.round(r.right / r.qs.length * 100);
  var sc = el('div', 'score');
  sc.appendChild(el('div', 'big' + (pct >= (PACK.pass || 80) ? ' pass' : ''), pct + '%'));
  sc.appendChild(el('div', 'of', r.right + ' of ' + r.qs.length + ' across the sections you have worked'));
  card.appendChild(sc);

  card.appendChild(el('h2', null, 'Weakest first'));
  var ul = el('ul', 'bars');
  rows.forEach(function (x) {
    var li = el('li');
    li.setAttribute('data-state', x.pct >= (PACK.pass || 80) ? 'pass' : 'part');
    var top = el('div', 'top');
    top.appendChild(el('b', null, x.title));
    top.appendChild(el('span', null, x.right + '/' + x.n + '   ' + x.pct + '%'));
    li.appendChild(top);
    var tr = el('div', 'track');
    var i2 = el('i');
    i2.style.width = x.pct + '%';
    tr.appendChild(i2);
    li.appendChild(tr);
    ul.appendChild(li);
  });
  //  Not studied is reported, never averaged in. A gap that looks like a
  //  score gets you a confidently wrong answer about your own readiness.
  (r.notYet || []).forEach(function (s) {
    var li = el('li');
    li.setAttribute('data-state', 'unseen');
    var top = el('div', 'top');
    top.appendChild(el('b', null, s.title));
    top.appendChild(el('span', null, 'not studied'));
    li.appendChild(top);
    var tr = el('div', 'track');
    tr.appendChild(el('i'));
    li.appendChild(tr);
    ul.appendChild(li);
  });
  card.appendChild(ul);

  var worst = rows.filter(function (x) { return x.pct < (PACK.pass || 80); });
  card.appendChild(el('p', 'note', worst.length
    ? 'Study these next: ' + worst.slice(0, 3).map(function (x) { return x.title; }).join(', ') + '.'
    : 'Nothing below the mark in what you have worked.' +
      ((r.notYet || []).length ? ' The gaps above are what is left.' : '')));

  var b = el('button', 'btn wide go', 'Back to the sections');
  b.style.marginTop = '12px';
  b.addEventListener('click', function () { go('home'); });
  card.appendChild(b);
  body.appendChild(card);
}

/* =====================================================================
   The whole document, and about
   ===================================================================== */
function drawDoc() {
  var box = $('doc-body');
  box.textContent = '';
  PACK.sections.forEach(function (s) {
    var h = el('h2', 'part', s.title);
    box.appendChild(h);
    var d = el('div');
    d.innerHTML = s.html || '';
    while (d.firstChild) box.appendChild(d.firstChild);
  });
  if (PACK.back) {
    var d2 = el('div');
    d2.innerHTML = PACK.back;
    while (d2.firstChild) box.appendChild(d2.firstChild);
  }
  wrapTables(box);
  $('find-note').textContent = '';
}

var findTimer = null;
function doFind() {
  var q = $('q-find').value.trim().toLowerCase();
  var box = $('doc-body');
  //  clear any previous marks
  Array.prototype.forEach.call(box.querySelectorAll('mark'), function (m) {
    var t = document.createTextNode(m.textContent);
    m.parentNode.replaceChild(t, m);
  });
  box.normalize();
  if (q.length < 2) { $('find-note').textContent = ''; return; }
  var walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
  var hits = 0, nodes = [], n;
  while ((n = walker.nextNode())) {
    if (n.nodeValue.toLowerCase().indexOf(q) >= 0) nodes.push(n);
  }
  nodes.forEach(function (node) {
    var parts = node.nodeValue.split(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'));
    if (parts.length < 2) return;
    var frag = document.createDocumentFragment();
    parts.forEach(function (p) {
      if (p.toLowerCase() === q) { frag.appendChild(el('mark', null, p)); hits++; }
      else frag.appendChild(document.createTextNode(p));
    });
    node.parentNode.replaceChild(frag, node);
  });
  $('find-note').textContent = hits ? hits + ' match' + (hits === 1 ? '' : 'es') : 'nothing found';
  var first = box.querySelector('mark');
  if (first) first.scrollIntoView({ block: 'center' });
}

function drawAbout() {
  $('about-pack').textContent = PACK
    ? (PACK.title || 'a pack') + ', built ' + (PACK.built || 'unknown') + ', ' +
      PACK.sections.length + ' sections and ' + PACK.questions.length + ' questions. ' +
      'It is held in this browser on this device only.'
    : 'No pack loaded.';
  if (!('caches' in window)) { $('off-state').textContent = 'This browser will not cache for offline use.'; return; }
  //  FIND THE CACHE, DO NOT NAME IT.  This asked for 'drill-v1' by name,
  //  and that cache has not existed since build 2 -- so the About page
  //  has been reporting "Not cached yet" on an app that was fully
  //  cached, which is a false statement about the one mechanism that
  //  caused a whole evening's confusion.  The same fault was in the
  //  weather app and was fixed there the same way.
  //
  //  It now also names the cache, because the build in the cache is
  //  exactly what you want to know when the app looks stale.
  caches.keys().then(function (ks) {
    var mine = ks.filter(function (k) { return k.indexOf('drill-') === 0; });
    if (!mine.length) {
      $('off-state').textContent = 'Not cached yet \u2014 open this page once with a connection.';
      return;
    }
    return caches.open(mine[0]).then(function (c) { return c.match('./'); })
      .then(function (hit) {
        $('off-state').textContent = hit
          ? 'The app is cached (' + mine[0] + ') and runs with no network. ' +
            'Your pack is in storage, not in the cache.'
          : 'Cache ' + mine[0] + ' exists but the page is not in it \u2014 ' +
            'reload once with a connection.';
      });
  }).catch(function () { $('off-state').textContent = 'Could not read the cache.'; });
}

/* =====================================================================
   Start
   ===================================================================== */
window.addEventListener('DOMContentLoaded', function () {
  setMode(savedMode());
  wireModes();
  $('back').addEventListener('click', function () {
    if (VIEW === 'drill' && RUN && RUN.mode !== 'diag') { go('section'); drawTabs(RUN.mode === 'test' ? 'test' : 'quiz');
      $('title').textContent = 'Section ' + (CURSEC + 1); return; }
    go(BACKTO[VIEW] || 'home');
  });
  ['ver', 'ver2', 'ver3'].forEach(function (id) {
    if ($(id)) $(id).textContent = 'build ' + BUILD;
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });
  $('f-pack').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    //  CLEAR THE INPUT, ALWAYS.  A file input fires `change` only when the
    //  selection CHANGES, and a file is the same selection if it has the
    //  same name -- so after loading `procedures.drillpack.json` once,
    //  picking another file of that name did nothing at all. No error, no
    //  note, the old pack simply stayed, and it looked as though the app
    //  offered no way to replace it. Clearing the value after every
    //  attempt makes the next selection always a change.
    e.target.value = '';
    if (f) loadPack(f);
  });
  //  Two buttons, one behaviour: the one on the home screen beside the
  //  pack's name, and the one on the About screen.
  ['b-replace', 'b-replace-home'].forEach(function (id) {
    if ($(id)) $(id).addEventListener('click', replacePack);
  });
  function replacePack() {
    $('f-pack').value = '';
    //  Say what is loaded now, so replacing it is a deliberate act and the
    //  result can be checked against what was expected.
    $('load-note').textContent = PACK
      ? 'Loaded now: ' + (PACK.title || 'a pack') +
        (PACK.built ? ', built ' + PACK.built : '') +
        (PACK.id ? ' (' + PACK.id + ')' : '') +
        '. Picking a file replaces it.'
      : 'A .drillpack.json file. Nothing is uploaded.';
    $('load-note').className = 'note';
    go('empty');
  }
  $('b-reset').addEventListener('click', function () {
    //  Destructive and irreversible, so it asks.
    if (!window.confirm('Reset every score and lock every section again? The pack stays loaded.')) return;
    PROG = {};
    saveProg().then(function () {
      $('reset-note').textContent = 'Progress reset.';
      drawHome();
    });
  });
  $('q-find').addEventListener('input', function () {
    if (findTimer) clearTimeout(findTimer);
    findTimer = setTimeout(doFind, 180);
  });

  Promise.all([kvGet('pack'), kvGet('progress')]).then(function (r) {
    PACK = r[0] || null;
    PROG = r[1] || {};
    //  Also on startup, so the pack already in storage from before this
    //  build existed becomes the baseline rather than the app pretending
    //  it has never seen one.
    rememberPack();
    go(PACK ? 'home' : 'empty');
  }).catch(function (e) {
    go('empty');
    $('load-note').textContent = 'Storage is not available here: ' + e.message;
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    if (window.DRILL_NO_SW) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        rs.forEach(function (x) { x.unregister(); });
      }).catch(function () {});
    } else {
      /*  updateViaCache: 'none' IS THE OTHER HALF OF THE SAME FAULT.
          A browser only checks sw.js for updates on navigation, and that check
          goes through the HTTP cache unless the previous script's max-age was
          over 24 hours. GitHub Pages sends max-age=600, so for ten minutes
          after a push the browser compares the new sw.js against a CACHED COPY
          of the old one, sees no difference, and installs nothing. "Open it
          once with a signal" is then a no-op that looks exactly like the app
          being stuck - which is what it looked like.  */
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
      //  A NEW WORKER DOES NOT CHANGE THE PAGE THAT INSTALLED IT.  The
      //  worker is cache-first, so the page you are reading was built from
      //  the files the OLD worker had cached. Reloading fetches the new
      //  sw.js, installs it and lets it claim the page -- but the already
      //  loaded scripts stay as they are. The new app appears on the
      //  SECOND reload, and nothing said so: an app sat three builds
      //  behind through several reloads, and every fix shipped into it
      //  read as a fix that had not worked.
      var swapped = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (swapped) return;
        swapped = true;
        //  Not mid-question. Losing a part-finished test to an automatic
        //  reload is worse than waiting one screen for the new version.
        if (RUN && RUN.qs && RUN.i < RUN.qs.length) {
          var n = $('sw-note');
          if (n) {
            n.textContent = 'A new version is ready. It loads when you leave this test.';
            n.hidden = false;
          }
          return;
        }
        location.reload();
      });

      //  AND IF THAT DID NOT HAPPEN, SAY SO AND REPAIR IT.
      //  The whole of 21 Oct was spent on an app that sat on build 12
      //  while the site served 13.  Everything was working as written:
      //  the worker updated, it cached the new files, and the DOCUMENT
      //  went on running the drill.js it had already loaded.  The
      //  controllerchange reload above is meant to cover that and did
      //  not fire.  Larry pushed, restarted the browser, reloaded twice
      //  from the menu, and the status line still said build 12 -- so
      //  every fix delivered that day read as a fix that had not worked,
      //  and the only thing that finally moved it was clearing the site's
      //  data by hand.
      //
      //  An app that cannot tell it is stale is a bug in the app, not a
      //  job for the reader.  So: ask the network what the live build is,
      //  and if it is not the one running, drop the caches, unregister
      //  the worker and reload once.  The next load has no worker, comes
      //  from the network, and registers again.
      //
      //  The probe carries a query string because the fetch goes THROUGH
      //  the worker, which is cache-first and matches on the URL -- so
      //  `drill.js` would be answered from the very cache being
      //  suspected, and `drill.js?probe=...` misses it and reaches the
      //  network.  `cache: 'reload'` is belt and braces on top.
      var HEAL = 'drill-healed';
      var healed = function () {
        try { return !!sessionStorage.getItem(HEAL); } catch (e) { return false; }
      };
      var liveBuildOf = function (text) {
        var m = text.match(/BUILD\s*=\s*'([^']*)'/);
        //  Read as TEXT, the file's \u2014 is six characters; running, it
        //  is one em dash.  Compare like with like or every check says
        //  stale and the app reloads itself for ever.
        return m ? m[1].replace(/\\u2014/g, '\u2014') : null;
      };
      if (!healed()) {
        fetch('drill.js?probe=' + Date.now(), { cache: 'reload' })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (text) {
            if (!text) return;                 // offline: nothing to say
            var live = liveBuildOf(text);
            if (!live || live === BUILD) return;
            try { sessionStorage.setItem(HEAL, live); } catch (e) {}
            var note = $('sw-note');
            if (note) {
              note.textContent = 'Build ' + live + ' is available. Updating\u2026';
              note.hidden = false;
            }
            var jobs = [];
            if (window.caches) {
              jobs.push(caches.keys().then(function (ks) {
                return Promise.all(ks.filter(function (k) {
                  return k.indexOf('drill-') === 0;
                }).map(function (k) { return caches.delete(k); }));
              }));
            }
            jobs.push(navigator.serviceWorker.getRegistrations()
              .then(function (rs) {
                return Promise.all(rs.map(function (r) { return r.unregister(); }));
              }));
            //  The pack is in IndexedDB and is the reader's own material.
            //  Nothing here touches it.
            Promise.all(jobs).catch(function () {}).then(function () {
              location.reload();
            });
          })
          .catch(function () {});             // offline, or blocked: carry on
      }
    }
  }
});

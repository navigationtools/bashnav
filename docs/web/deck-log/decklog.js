/* =====================================================================
   deck-log -- the browser build.  No framework, no build step.

   Three things here are not style choices:

     A STATE carried forward is shown as a default; a MEASUREMENT never
     is.  At 1800 the course really is what it was at 1500 unless
     somebody changed it.  The pressure at 1800 is not the 1500 reading
     unless changed -- it is a new reading or it is nothing.  So a
     carried field shows its value in the box and a measured field shows
     an empty box with the last reading beside it, greyed, as
     information and not as an offer.

     `-` and `/` ARE ANSWERS.  Not taken, and not observable.  They are
     always on screen, the same size as everything else, because a form
     that punishes blanks gets invented numbers.

     NOTHING IS WRITTEN UNTIL A SECTION IS COMMITTED, and then it is
     written once, appended, and never touched again.  A record this
     reader cannot read back is never written: lg_parse runs on every
     line before it goes to the store, exactly as the awk build does.
   ===================================================================== */
'use strict';

var BUILD = '6 \u2014 11 Nov 2026';

var REG = { eq: [], pt: [], eqById: {}, ptById: {} };
var RECS = [];                 // every parsed record, oldest first
var VIEW = 'home';
var ENTRY = null;              // the entry in progress

function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function lsGet(k, d) { try { var v = localStorage.getItem('decklog-' + k); return v === null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem('decklog-' + k, v); } catch (e) {} }

/* ---- mode and navigation ------------------------------------------- */
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
function go(v) {
  VIEW = v;
  ['home', 'entry', 'log', 'boat', 'backup', 'about'].forEach(function (n) {
    $('v-' + n).hidden = (n !== v);
  });
  $('back').hidden = (v === 'home');
  $('title').textContent = v === 'home' ? 'deck-log'
    : v === 'entry' ? 'Entry'
    : v === 'log' ? 'The log'
    : v === 'boat' ? 'The boat'
    : v === 'backup' ? 'Backup' : 'About';
  window.scrollTo(0, 0);
  if (v === 'log') drawLog();
  if (v === 'boat') drawBoat();
  if (v === 'backup') drawBackup();
  if (v === 'about') drawAbout();
}

/* =====================================================================
   The sections, and what each one asks.

   kind:  'state'  carried forward, shown as a default
          'num'    a measurement: no default, ever
          'menu'   a VOS coded field, from menus.js
          'text'   free text, which is exactly why values are escaped
   ===================================================================== */
var SECTIONS = [
  { id: 'nav', name: 'Deck', title: 'THE DECK LOG',
    note: 'Position, course and speed are state: they are shown as they were ' +
          'last logged and return accepts them. Wind is TRUE, not apparent \u2014 ' +
          'apparent changes on every tack, and backing-versus-veering is the most ' +
          'useful rule there is.',
    fields: [
      { k: 'lat', kind: 'state', label: 'Latitude', hint: 'e.g. 41 14.0N' },
      { k: 'lon', kind: 'state', label: 'Longitude', hint: 'e.g. 072 05.0W' },
      { k: 'crs', kind: 'state', label: 'Course steered, true', hint: 'degrees' },
      { k: 'sog', kind: 'state', label: 'Speed over ground', hint: 'knots' },
      { k: 'wdir', kind: 'num', label: 'Wind direction, degrees TRUE', hint: '000\u2013360' },
      { k: 'wspd', kind: 'num', label: 'Wind speed', hint: 'knots' },
      { k: 'sea', kind: 'menu', menu: 'sea', label: 'Sea state' },
      { k: 'note', kind: 'text', label: 'Anything worth recording' }
    ] },
  { id: 'wx', name: 'Weather', title: 'THE WEATHER OBSERVATION',
    note: 'What a deck log would otherwise omit: the pressure characteristic, ' +
          'the cloud types and the swell period \u2014 which are precisely what the ' +
          'reasoning needs. Swell is separate from the wind sea, and the period ' +
          'is the important one: a long-period swell from a new direction is a ' +
          'system out there, because swell outruns the storm that made it.',
    fields: [
      { k: 'mslp', kind: 'num', label: 'Sea level pressure', hint: 'hPa, to 0.1' },
      { k: 'ptend', kind: 'menu', menu: 'ptend', label: 'Pressure characteristic' },
      { k: 'pchg', kind: 'num', label: 'Pressure change over 3 h', hint: 'hPa, + or \u2212' },
      { k: 'airt', kind: 'num', label: 'Air temperature', hint: '\u00b0C' },
      { k: 'dewp', kind: 'num', label: 'Dew point (or wet bulb)', hint: '\u00b0C' },
      { k: 'seat', kind: 'num', label: 'Sea temperature', hint: '\u00b0C' },
      { k: 'cloud', kind: 'menu', menu: 'cloud', label: 'Total cloud' },
      { k: 'cl', kind: 'menu', menu: 'cl', label: 'Low cloud' },
      { k: 'cm', kind: 'menu', menu: 'cm', label: 'Middle cloud' },
      { k: 'ch', kind: 'menu', menu: 'ch', label: 'High cloud' },
      { k: 'vis', kind: 'menu', menu: 'vis', label: 'Visibility' },
      { k: 'swdir', kind: 'num', label: 'Swell from, degrees true' },
      { k: 'swper', kind: 'num', label: 'Swell period', hint: 'seconds' },
      { k: 'swht', kind: 'num', label: 'Swell height', hint: 'metres' }
    ] },
  { id: 'eng', name: 'Engine', title: 'THE ENGINE',
    note: 'Hours, not dates: engine maintenance runs on running hours, and the ' +
          'log carries hrs on every engine entry, so the schedule is computable ' +
          'with nothing new. Intervals come from your own engine manual, never ' +
          'from us.',
    fields: [
      { k: 'eq', kind: 'equip', label: 'Which machine' },
      { k: 'hrs', kind: 'num', label: 'Running hours', hint: 'from the hour meter' },
      { k: 'job', kind: 'text', label: 'Work done', hint: 'e.g. impeller, oil and filter' },
      { k: 'part', kind: 'part', label: 'Part used' },
      { k: 'qty', kind: 'num', label: 'How many used' },
      { k: 'fuel', kind: 'num', label: 'Fuel remaining', hint: 'litres' },
      { k: 'oil', kind: 'menu', menu: '_state', label: 'Oil level and condition' },
      { k: 'note', kind: 'text', label: 'Notes' }
    ] },
  { id: 'pro', name: 'Stores', title: 'PROVISIONS AND STORES',
    note: 'Consumption events, derived holding, reorder list \u2014 identical ' +
          'machinery to the spares, which is why they belong in one tool.',
    fields: [
      { k: 'water', kind: 'num', label: 'Water remaining', hint: 'litres' },
      { k: 'gas', kind: 'num', label: 'Gas remaining', hint: 'kg or bottles' },
      { k: 'part', kind: 'part', label: 'Stores used' },
      { k: 'qty', kind: 'num', label: 'How many used' },
      { k: 'note', kind: 'text', label: 'What is short' }
    ] }
];

//  The inspection states are the single-keypress menu of the entry
//  screens with the decline states of the format.  `-` and `/` matter
//  more here than anywhere else in the app: on a boat at sea half the
//  engine is behind something else, and "I could not get to the anodes"
//  is a true and useful entry.  A form that forces OK on an item nobody
//  looked at is worse than no form.
MENUS._state = { title: 'ITEM STATE', opts: [['o', 'ok'], ['a', 'needs attention']] };

/* =====================================================================
   The entry
   ===================================================================== */
function lastValue(key, type) {
  for (var i = RECS.length - 1; i >= 0; i--) {
    var r = RECS[i];
    if (type && r.type !== type) continue;
    var v = r.v[key];
    if (v !== undefined && v !== '' && v !== '-' && v !== '/') return { v: v, ts: r.ts };
  }
  return null;
}

function startEntry() {
  var now = new Date();
  ENTRY = { slot: LOG.slot(now), sec: 0, vals: {}, done: {} };
  SECTIONS.forEach(function (s) { ENTRY.vals[s.id] = {}; });
  //  Carry state forward, and only state.
  SECTIONS.forEach(function (s) {
    s.fields.forEach(function (f) {
      if (f.kind !== 'state') return;
      var last = lastValue(f.k, s.id);
      if (last) ENTRY.vals[s.id][f.k] = last.v;
    });
  });
  $('e-slot').textContent = ENTRY.slot + '   \u2014   ' + 'entry for the ' +
    ENTRY.slot.substr(11, 5) + ' slot';
  drawSecNav();
  drawSection();
  go('entry');
}

function drawSecNav() {
  var nav = $('secnav');
  nav.textContent = '';
  SECTIONS.forEach(function (s, i) {
    var b = el('button', null);
    b.textContent = s.name;
    if (ENTRY.done[s.id]) {
      var t = el('span', 'tick', ' \u2713');
      b.appendChild(t);
    }
    b.setAttribute('aria-current', i === ENTRY.sec ? 'true' : 'false');
    b.addEventListener('click', function () { ENTRY.sec = i; drawSecNav(); drawSection(); });
    nav.appendChild(b);
  });
}

function drawSection() {
  var s = SECTIONS[ENTRY.sec], box = $('sec-fields');
  $('sec-title').textContent = s.title;
  $('sec-note').textContent = s.note;
  box.textContent = '';
  s.fields.forEach(function (f) { box.appendChild(fieldEl(s, f)); });
  $('e-state').textContent = ENTRY.done[s.id]
    ? 'This section is already logged for ' + ENTRY.slot + '. Logging it again appends a second record \u2014 nothing is overwritten.'
    : '';
  $('e-commit').textContent = ENTRY.done[s.id] ? 'Log it again' : 'Log this section';
}

function setVal(sec, k, v) {
  if (v === undefined || v === null || v === '') delete ENTRY.vals[sec][k];
  else ENTRY.vals[sec][k] = String(v);
}

function fieldEl(s, f) {
  var wrap = el('div', 'field');
  var cur = ENTRY.vals[s.id][f.k];

  var lab = el('div', 'lab');
  lab.appendChild(el('b', null, f.label));
  if (f.hint) lab.appendChild(el('span', null, f.hint));
  //  For a measurement, the previous reading is shown as INFORMATION and
  //  never as a default: it goes beside the label, greyed, and the box
  //  stays empty.
  if (f.kind === 'num') {
    var last = lastValue(f.k, s.id);
    if (last) {
      var ago = el('span', 'carried', 'last ' + last.v + '  (' + last.ts.substr(11, 5) + 'Z)');
      lab.appendChild(ago);
    }
  } else if (f.kind === 'state' && cur !== undefined) {
    lab.appendChild(el('span', 'carried', 'carried forward'));
  }
  wrap.appendChild(lab);

  if (f.kind === 'menu') {
    var m = MENUS[f.menu];
    var grid = el('div', 'codes');
    m.opts.forEach(function (o) {
      var b = el('button', 'code');
      b.appendChild(el('i', null, o[0]));
      b.appendChild(el('span', null, o[1]));
      b.setAttribute('aria-pressed', cur === o[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        setVal(s.id, f.k, cur === o[0] ? '' : o[0]);
        drawSection();
      });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    wrap.appendChild(declines(s, f, cur));
    return wrap;
  }

  if (f.kind === 'equip' || f.kind === 'part') {
    var list = f.kind === 'equip' ? REG.eq : REG.pt;
    var sel = el('select');
    var o0 = el('option', null, list.length ? '\u2014' : 'nothing in the registry yet');
    o0.value = '';
    sel.appendChild(o0);
    list.forEach(function (x) {
      var o = el('option', null, x.id + (x.name ? '  \u00b7  ' + x.name : ''));
      o.value = x.id;
      if (cur === x.id) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { setVal(s.id, f.k, sel.value); });
    var ctl0 = el('div', 'ctl');
    ctl0.appendChild(sel);
    wrap.appendChild(ctl0);
    return wrap;
  }

  var inp = document.createElement('input');
  inp.type = (f.kind === 'num') ? 'text' : 'text';
  if (f.kind === 'num') inp.setAttribute('inputmode', 'decimal');
  inp.value = (cur === '-' || cur === '/') ? '' : (cur === undefined ? '' : cur);
  inp.placeholder = f.kind === 'state' ? '' : '';
  inp.addEventListener('input', function () {
    setVal(s.id, f.k, inp.value.trim());
    var why = wrap.querySelector('.why');
    if (why) why.remove();
    var msg = VIEWS.implausible(f.k, inp.value.trim());
    if (msg) wrap.appendChild(whyEl(msg));
    var ds = wrap.querySelectorAll('.dbtn');
    for (var i = 0; i < ds.length; i++) ds[i].setAttribute('aria-pressed', 'false');
  });
  var ctl = el('div', 'ctl');
  ctl.appendChild(inp);
  //  Free text gets no decline buttons.  "Not observable" is meaningless
  //  for a note, and an empty note already means there was nothing to
  //  record -- the four states are about OBSERVATIONS.
  if (f.kind !== 'text') ctl.appendChild(declines(s, f, cur));
  wrap.appendChild(ctl);
  if (cur !== undefined && cur !== '-' && cur !== '/') {
    var msg0 = VIEWS.implausible(f.k, cur);
    if (msg0) wrap.appendChild(whyEl(msg0));
  }
  return wrap;
}

//  Plausibility is a QUESTION, not a rejection.  An instrument reading
//  wrongly is itself worth logging, so "no, that is what I read" has to
//  be accepted -- and it is, by simply leaving the value alone.
function whyEl(msg) {
  var d = el('div', 'why');
  d.appendChild(el('span', null, msg + '  \u2014  logged as typed unless you change it.'));
  return d;
}

function declines(s, f, cur) {
  var d = el('div', 'declines');
  [['-', 'asked, not taken'], ['/', 'asked, not observable']].forEach(function (x) {
    var b = el('button', 'dbtn', x[0]);
    b.title = x[1];
    b.setAttribute('aria-label', f.label + ': ' + x[1]);
    b.setAttribute('aria-pressed', cur === x[0] ? 'true' : 'false');
    b.addEventListener('click', function () {
      setVal(s.id, f.k, cur === x[0] ? '' : x[0]);
      drawSection();
    });
    d.appendChild(b);
  });
  return d;
}

/* ---- committing ---------------------------------------------------- */
function commitSection(declined) {
  var s = SECTIONS[ENTRY.sec];
  var fields = [];
  if (declined) {
    //  A declined section is ONE record, not fifteen empty fields.
    fields.push(['declined', '1']);
  } else {
    s.fields.forEach(function (f) {
      var v = ENTRY.vals[s.id][f.k];
      if (v === undefined || v === '') return;      // never asked: key absent
      fields.push([f.k, v]);
    });
    if (!fields.length) {
      $('e-state').textContent = 'Nothing entered in this section. Decline it, or fill something in \u2014 ' +
        'an empty record would say the watch was kept and nothing observed, which is not the same thing.';
      return;
    }
  }
  fields.push(['by', lsGet('by', '') || '-']);
  var line = LOG.make(ENTRY.slot, s.id, fields);

  //  NEVER WRITE A RECORD THIS READER CANNOT READ BACK.  The awk build
  //  does the same check for the same reason: in an append-only log a
  //  malformed line is permanent, and it is discovered months later by
  //  something trying to read it.
  var back = LOG.parse(line);
  if (!back) {
    $('e-state').textContent = 'Refused to write that record: ' + LOG.err() +
      '. Nothing was logged. This is a bug \u2014 please report it.';
    return;
  }

  STORE.append(line).then(function () {
    ENTRY.done[s.id] = true;
    return reload();
  }).then(function () {
    var msg = declined ? s.name + ' declined and recorded as declined.' : s.name + ' logged.';
    //  Tell them at the moment of use, while they are still standing
    //  there thinking about it.  Knowing you are now out -- before you
    //  close the engine cover, while you might still improvise, ration
    //  or nurse it -- is worth more than any report generated later.
    var part = ENTRY.vals[s.id].part;
    if (!declined && part) {
      var hold = VIEWS.holdings(RECS);
      var have = hold[part] === undefined ? 0 : hold[part];
      var p = REG.ptById[part];
      var min = p ? p.min : 0;
      if (have <= 0) msg += '  ** That was your last one. **';
      if (min > 0 && have < min) {
        msg += '  Holding ' + have + ', minimum ' + min + ' \u2014 ' + (min - have) +
               ' short. On the shopping list for the next port.';
        if (p && p.stow) msg += '  Stowed: ' + p.stow + '.';
      }
    }
    //  THE REDRAW GOES FIRST, AND THE MESSAGE SECOND.
    //
    //  The other way round, drawSection() overwrote e-state with its own
    //  "already logged" note a moment after the confirmation appeared --
    //  so the one message this tool most needs to deliver, that you have
    //  just used your last impeller and are short of your minimum, was
    //  destroyed on the way to the screen.  Knowing you are now out
    //  BEFORE you close the engine cover, while you might still
    //  improvise, ration or nurse it, is worth more than any report
    //  generated later.
    drawSecNav();
    drawSection();
    $('e-state').textContent = msg;
  }).catch(function (e) {
    $('e-state').textContent = 'The write failed, so nothing was logged: ' + e.message;
  });
}

/* =====================================================================
   Home
   ===================================================================== */
function drawHome() {
  var now = new Date();
  var slot = LOG.slot(now);
  $('st-slot').textContent = 'Now ' + LOG.stamp(now) + '   \u00b7   the ' +
    slot.substr(11, 5) + ' slot';

  var last = RECS.length ? RECS[RECS.length - 1] : null;
  if (!last) {
    $('st-last').textContent = 'Nothing logged yet.';
    $('entry-note').textContent = 'The first entry sets the position, course and speed ' +
      'that later entries carry forward.';
  } else {
    var mins = Math.round((now - LOG.tsDate(last.ts)) / 60000);
    var h = Math.floor(mins / 60), m = mins % 60;
    //  It cannot alarm -- there is no daemon and a browser will not wake
    //  itself -- so it is honest on launch instead.  A missed slot is
    //  recorded as missed: on a private boat there is often nobody up at
    //  0300, and that is fine.
    var missed = Math.max(0, Math.floor(mins / 180) - 1);
    $('st-last').textContent = 'Last entry ' + last.ts + '  \u2014  ' +
      (h ? h + 'h ' : '') + m + 'm ago' +
      (missed > 0 ? '.  ' + missed + ' three-hourly ' + (missed === 1 ? 'slot' : 'slots') + ' missed.' : '.');
    $('entry-note').textContent = missed > 0
      ? 'A missed slot is a missed slot. Logging now records this slot, not the ones gone by.'
      : '';
  }

  var hold = VIEWS.holdings(RECS);
  var defs = VIEWS.defects(RECS);
  var shorts = VIEWS.shortages(REG, hold);
  var hrs = VIEWS.engineHours(RECS);

  var ul = $('standing');
  ul.textContent = '';
  function row(label, sub, value, tag) {
    var li = el('li');
    var nm = el('span', 'nm');
    nm.appendChild(el('b', null, label));
    if (sub) nm.appendChild(el('span', null, sub));
    li.appendChild(nm);
    if (value !== undefined) li.appendChild(el('span', 'num', value));
    if (tag) li.appendChild(el('span', 'tag ' + tag[1], tag[0]));
    ul.appendChild(li);
  }
  row('Records held', RECS.length === 1 ? 'one' : 'append-only', String(RECS.length));
  row('Open defects', defs.length ? 'found and not yet closed' : 'nothing outstanding',
      String(defs.length), defs.length ? ['OPEN', 'att'] : ['CLEAR', 'ok']);
  row('Short of minimum', shorts.length ? 'on the shopping list' : 'nothing short',
      String(shorts.length), shorts.length ? ['SHORT', 'bad'] : ['OK', 'ok']);
  if (hrs) row('Engine hours', 'as at ' + hrs.ts, hrs.hrs.toFixed(1));

  STORE.backupState().then(function (b) {
    if (b.since >= 20 || (b.since > 0 && b.oldest &&
        (Date.now() - LOG.tsDate(b.oldest)) > 5 * 86400000)) {
      var days = b.oldest ? Math.floor((Date.now() - LOG.tsDate(b.oldest)) / 86400000) : 0;
      $('nag-text').textContent = b.since + ' record' + (b.since === 1 ? '' : 's') +
        ' since your last export' + (days ? ', oldest ' + days + ' day' + (days === 1 ? '' : 's') + ' ago' : '') +
        '. Browser storage is not a backup: the operating system is entitled to reclaim it.';
      $('nag').hidden = false;
    } else {
      $('nag').hidden = true;
    }
  });
}

/* =====================================================================
   The log
   ===================================================================== */
var TYPE_NAME = { nav: 'deck', wx: 'weather', eng: 'engine', pro: 'stores',
                  inv: 'stocktake', cor: 'correction', mrg: 'merge',
                  cel: 'celestial', tid: 'tide', con: 'contact', chart: 'chart' };
function drawLog() {
  $('log-count').textContent = RECS.length + ' record' + (RECS.length === 1 ? '' : 's') +
    '. Nothing here was ever edited or deleted; a correction is its own record.';
  var ul = $('log-list');
  ul.textContent = '';
  var show = RECS.slice(-200).reverse();
  show.forEach(function (r) {
    var li = el('li');
    var nm = el('span', 'nm');
    nm.appendChild(el('b', null, r.ts + '   ' + (TYPE_NAME[r.type] || r.type)));
    var bits = [];
    Object.keys(r.v).forEach(function (k) {
      if (k === 'by') return;
      bits.push(k + '=' + r.v[k]);
    });
    nm.appendChild(el('span', null, bits.join('   ') || '(declined)'));
    li.appendChild(nm);
    ul.appendChild(li);
  });
  $('log-raw').textContent = show.map(function (r) { return r.line; }).join('\n');
}

/* =====================================================================
   The boat
   ===================================================================== */
function drawBoat() {
  var hold = VIEWS.holdings(RECS);
  var defs = VIEWS.defects(RECS);
  var shorts = VIEWS.shortages(REG, hold);

  function fill(id, rows, empty) {
    var ul = $(id);
    ul.textContent = '';
    if (!rows.length) { ul.appendChild(el('li', null, empty)); return; }
    rows.forEach(function (r) { ul.appendChild(r); });
  }

  fill('defect-list', defs.map(function (d) {
    var li = el('li');
    var nm = el('span', 'nm');
    nm.appendChild(el('b', null, (d.item || 'item') + (d.eq ? '  \u00b7  ' + d.eq : '')));
    nm.appendChild(el('span', null, 'found ' + d.ts + (d.note ? '  \u2014  ' + d.note : '')));
    li.appendChild(nm);
    li.appendChild(el('span', 'tag att', 'OPEN'));
    return li;
  }), 'Nothing outstanding.');

  var hk = Object.keys(hold).sort();
  fill('hold-list', hk.map(function (k) {
    var p = REG.ptById[k];
    var li = el('li');
    var nm = el('span', 'nm');
    nm.appendChild(el('b', null, (p && p.name) ? p.name : k));
    nm.appendChild(el('span', null, (p && p.number ? p.number + '   ' : '') +
      (p && p.stow ? 'stowed: ' + p.stow : '')));
    li.appendChild(nm);
    li.appendChild(el('span', 'num', String(hold[k])));
    if (p && p.min > 0) {
      li.appendChild(el('span', 'tag ' + (hold[k] < p.min ? 'bad' : 'ok'),
        'min ' + p.min));
    }
    return li;
  }), 'No part has moved yet. A stocktake or a job puts something here.');

  fill('short-list', shorts.map(function (s) {
    var li = el('li');
    var nm = el('span', 'nm');
    nm.appendChild(el('b', null, (s.part.name || s.part.id) + '   \u00d7' + s.want));
    var sub = [];
    if (s.part.number) sub.push(s.part.number);
    if (s.fitsText) sub.push('fits: ' + s.fitsText);
    if (s.part.stow) sub.push('stow: ' + s.part.stow);
    nm.appendChild(el('span', null, sub.join('   \u00b7   ')));
    li.appendChild(nm);
    li.appendChild(el('span', 'tag bad', 'SHORT'));
    return li;
  }), 'Nothing short of its minimum.');

  fill('eq-list', REG.eq.map(function (e) {
    var li = el('li');
    var nm = el('span', 'nm');
    nm.appendChild(el('b', null, e.id + (e.name ? '  \u00b7  ' + e.name : '')));
    nm.appendChild(el('span', null, [e.make, e.model].filter(Boolean).join(' ') +
      (e.serial ? '   s/n ' + e.serial : '') + (e.plate ? '   plate: ' + e.plate : '')));
    li.appendChild(nm);
    return li;
  }), 'No equipment yet. A boat has a main engine, a generator, a windlass, a watermaker \u2014 add them and each gets its own spares.');

  fill('pt-list', REG.pt.map(function (p) {
    var li = el('li');
    var nm = el('span', 'nm');
    nm.appendChild(el('b', null, p.id + (p.name ? '  \u00b7  ' + p.name : '')));
    nm.appendChild(el('span', null, [p.number, p.fits ? 'fits ' + p.fits : '',
      p.stow, p.kind].filter(Boolean).join('   \u00b7   ')));
    li.appendChild(nm);
    if (p.min > 0) li.appendChild(el('span', 'tag none', 'min ' + p.min));
    return li;
  }), 'No parts yet. Capture one at the moment of use: in a chandlery, "an impeller" is useless and the manufacturer\u2019s number is everything.');

  STORE.metaGet('registry', '').then(function (t) { $('reg-text').value = t; });
}

function addRegistry(type) {
  var id = prompt(type === 'eq'
    ? 'An id for this machine, e.g. eng.main or gen.onan'
    : 'An id for this part, e.g. impeller or fuelsec');
  if (!id) return;
  id = id.trim();
  if (!/^[A-Za-z0-9._-]+$/.test(id)) { alert('Letters, digits, dot, dash and underscore only.'); return; }
  var fields = type === 'eq'
    ? [['id', id], ['name', prompt('A name for it (optional)') || ''],
       ['make', prompt('Make (optional)') || ''], ['model', prompt('Model (optional)') || ''],
       ['serial', prompt('Serial number (optional)') || ''],
       ['plate', prompt('The plate, VERBATIM \u2014 every number on it, including the ones nobody understands') || '']]
    : [['id', id], ['name', prompt('A name for it (optional)') || ''],
       ['number', prompt('The manufacturer\u2019s number \u2014 what you actually order') || ''],
       ['fits', prompt('What it fits, by equipment id (optional)') || ''],
       ['min', prompt('Minimum to carry (optional)') || ''],
       ['stow', prompt('Where it is stowed \u2014 on a boat, finding the spare is half the job') || '']];
  var line = VIEWS.registryLine(type, fields);
  STORE.metaGet('registry', '').then(function (t) {
    return STORE.metaSet('registry', (t ? t.replace(/\n*$/, '\n') : '') + line + '\n');
  }).then(reload).then(drawBoat);
}

function saveRegistry() {
  var t = $('reg-text').value;
  //  Check it parses before it is stored.  The registry is not
  //  append-only, so a bad line here is recoverable -- but a bad line
  //  that is accepted silently is how the boat's own facts go missing.
  var bad = 0, first = '';
  t.split('\n').forEach(function (L) {
    if (L === '' || L.charAt(0) === '#') return;
    if (!LOG.parse('2000-01-01T00:00Z|' + L)) { bad++; if (!first) first = L + '   (' + LOG.err() + ')'; }
  });
  if (bad) {
    $('reg-state').textContent = bad + ' line' + (bad === 1 ? '' : 's') +
      ' will not parse, so nothing was saved. First: ' + first;
    return;
  }
  STORE.metaSet('registry', t).then(reload).then(function () {
    $('reg-state').textContent = 'Saved.';
    drawBoat();
  });
}

/* =====================================================================
   Backup
   ===================================================================== */
function fileName() {
  var boat = (lsGet('boat', '') || 'boat').replace(/[^A-Za-z0-9._-]+/g, '-').toLowerCase();
  var d = LOG.stamp().substr(0, 10).replace(/-/g, '');
  return 'bashnav-log-' + boat + '-' + d + '.log';
}

function drawBackup() {
  STORE.persistState().then(function (p) {
    $('persist-state').textContent = p === null
      ? 'This browser will not say whether its storage is durable.'
      : p ? 'The browser has marked this storage durable, so it will not be evicted to make room.'
          : 'The browser has NOT marked this storage durable, so it may be reclaimed. Export more often.';
  });
  STORE.backupState().then(function (b) {
    $('backup-state').textContent = b.total + ' records held. ' +
      (b.last ? 'Last export covered everything up to ' + b.last + '. ' : 'Never exported. ') +
      (b.since ? b.since + ' record' + (b.since === 1 ? '' : 's') + ' since then.' : 'Nothing new since.');
  });
  //  Say which route the device actually has.  "Use the Share button" is
  //  useless advice on a device with no share sheet for files.
  var canShare = !!(navigator.canShare && navigator.share);
  $('b-share').disabled = !canShare;
  $('share-note').textContent = canShare
    ? 'Share opens the sheet with the log attached \u2014 one tap to Mail, Messages, AirDrop or Files.'
    : 'This device has no share sheet for files, so use Download and attach the file in Mail by hand.';
}

function doExport(share) {
  STORE.exportText().then(function (text) {
    if (!text) { $('share-note').textContent = 'Nothing to export yet.'; return; }
    var name = fileName();
    var blob = new Blob([text], { type: 'text/plain' });
    var file = null;
    try { file = new File([blob], name, { type: 'text/plain' }); } catch (e) {}
    if (share && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: name })
        .then(function () { return STORE.markExported(); })
        .then(function () { drawBackup(); drawHome(); })
        .catch(function () { /* the user cancelled; nothing to report */ });
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return STORE.markExported().then(function () { drawBackup(); drawHome(); });
  });
}

function doImport(file) {
  var box = $('imp-preview');
  box.textContent = '';
  box.appendChild(el('p', 'note', 'Reading ' + file.name + '\u2026'));
  file.text().then(function (text) {
    return STORE.previewMerge(text).then(function (pv) {
      box.textContent = '';
      box.appendChild(el('h2', null, 'MERGE PREVIEW'));
      box.appendChild(el('p', 'note', 'from ' + file.name));
      var ul = el('ul', 'items');
      function row(n, what, tag) {
        var li = el('li');
        var nm = el('span', 'nm');
        nm.appendChild(el('b', null, String(n)));
        nm.appendChild(el('span', null, what));
        li.appendChild(nm);
        if (tag) li.appendChild(el('span', 'tag ' + tag[1], tag[0]));
        ul.appendChild(li);
      }
      row(pv.dup, 'records already held \u2014 identical, will collapse to one');
      row(pv.add, 'records new \u2014 will be added');
      row(pv.conflicts.length, 'records conflict \u2014 both kept, flagged for review',
          pv.conflicts.length ? ['REVIEW', 'att'] : null);
      if (pv.bad) row(pv.bad, 'records will not parse', ['REJECT', 'bad']);
      box.appendChild(ul);

      if (pv.conflicts.length) {
        box.appendChild(el('p', 'note',
          'A conflict is the same timestamp and the same type with different content: ' +
          'two people logged that slot and they disagree. Both are kept \u2014 picking one ' +
          'would be deleting a record, and you do not erase a log, you line through and annotate.'));
        var pre = el('pre');
        pre.className = 'logline';
        pre.textContent = pv.conflicts.slice(0, 8).map(function (c) {
          return '  held      ' + c.held + '\n  incoming  ' + c.incoming;
        }).join('\n\n');
        box.appendChild(pre);
      }

      if (pv.bad) {
        box.appendChild(el('p', 'warn',
          'That file is damaged, so nothing will be imported from it \u2014 not even the good ' +
          'records. Half an imported log is worse than none: you cannot tell afterwards ' +
          'which half you got. First bad line: ' + pv.badLine));
        return;
      }
      if (!pv.add) {
        box.appendChild(el('p', 'note', 'Everything in that file is already held. Nothing to do.'));
        return;
      }
      var go = el('button', 'btn wide go', 'Merge ' + pv.add + ' records in');
      go.addEventListener('click', function () {
        go.disabled = true;
        STORE.applyMerge(pv, file.name, lsGet('by', '') || '').then(function () {
          return reload();
        }).then(function () {
          box.textContent = '';
          box.appendChild(el('p', 'note', 'Merged. ' + pv.add + ' records added, ' +
            pv.dup + ' already held, ' + pv.conflicts.length + ' flagged. ' +
            'The merge is itself a record, so this log now says what came in and when.'));
          drawHome();
        }).catch(function (e) {
          box.appendChild(el('p', 'warn', 'Nothing was imported: ' + e.message));
        });
      });
      box.appendChild(go);
    });
  }).catch(function (e) {
    box.textContent = '';
    box.appendChild(el('p', 'warn', 'Could not read that file: ' + e.message));
  });
}

/* ---- about --------------------------------------------------------- */
function drawAbout() {
  if (!('caches' in window)) { $('off-state').textContent = 'This browser will not cache for offline use.'; return; }
  /*  ASK CACHE STORAGE, NOT A NAME WRITTEN BY HAND.  This named
      'deck-log-v1', which the worker deleted as an old member of its own
      family the first time the app updated - so from deck-log-v2 onwards
      the panel read an empty cache and told the reader "not cached yet"
      while the app was sitting fully cached beside it. On the tool that
      holds the boat's records, that is the readout you check before going
      out of range, and it was saying no when the answer was yes.
      caches.match() searches every cache on the origin, so there is no
      version in this file to go stale. */
  caches.match('./').then(function (hit) {
    return STORE.persistState().then(function (p) {
      $('off-state').textContent =
        (hit ? 'The app is cached and runs with no network. ' : 'Not cached yet \u2014 open this page once with a connection. ') +
        (p === null ? '' : p ? 'Its storage is marked durable.' : 'Its storage is NOT marked durable, so export often.');
    });
  }).catch(function () { $('off-state').textContent = 'Could not read the cache.'; });
}

/* =====================================================================
   Loading
   ===================================================================== */
function reload() {
  return Promise.all([STORE.allLines(), STORE.metaGet('registry', '')]).then(function (r) {
    var lines = STORE.canonical(r[0]);
    var rd = LOG.read(lines.join('\n'), '');
    RECS = rd.recs;
    REG = VIEWS.registryRead(r[1]);
    if (rd.bad) {
      //  A damaged tail must not take the whole log with it, and it must
      //  not be hidden either.
      console.warn('deck-log: ' + rd.bad + ' unreadable records, first: ' + rd.badLine);
    }
    return rd;
  });
}

window.addEventListener('DOMContentLoaded', function () {
  setMode(savedMode());
  wireModes();
  $('back').addEventListener('click', function () { go('home'); drawHome(); });
  $('ver').textContent = 'build ' + BUILD;

  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });
  $('b-entry').addEventListener('click', startEntry);
  $('e-commit').addEventListener('click', function () { commitSection(false); });
  $('e-decline').addEventListener('click', function () { commitSection(true); });
  $('nag-go').addEventListener('click', function () { go('backup'); doExport(true); });
  $('b-share').addEventListener('click', function () { doExport(true); });
  $('b-download').addEventListener('click', function () { doExport(false); });
  $('b-addeq').addEventListener('click', function () { addRegistry('eq'); });
  $('b-addpt').addEventListener('click', function () { addRegistry('pt'); });
  $('b-regsave').addEventListener('click', saveRegistry);
  $('imp-file').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) doImport(e.target.files[0]);
  });

  go('home');
  reload().then(function () {
    drawHome();
  }).catch(function (e) {
    $('st-last').textContent = 'Could not open the log store: ' + e.message;
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    if (window.DECKLOG_NO_SW) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        rs.forEach(function (r) { r.unregister(); });
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
    }
  }
});

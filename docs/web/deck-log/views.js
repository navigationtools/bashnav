// =====================================================================
//  deck-log -- registry and derived views.  A port of src/decklog/views.awk.
//
//  THE THREE LAYERS, and it matters that they stay separate:
//
//    registry   facts about the boat.  Equipment, parts, minimums,
//               stowage.  Changes rarely.
//    log        events.  What happened.  Append only.
//    views      holdings, open defects, what is due, the shopping list.
//               COMPUTED, NEVER STORED.
//
//  So there is no stored inventory.  The catalogue is registry; the
//  count is derived by replaying the log.  A stored count is the
//  obvious design and it is the one that goes wrong: it drifts from the
//  log, and then you have two numbers and no way to know which lied.
// =====================================================================
'use strict';

var VIEWS = (function () {

  // ---------------------------------------------------------------
  //  The registry.  Same encoding as the log, so there is one escaping
  //  rule in the tool and not two.  A registry line is a record without
  //  a timestamp, so it is parsed by lending it one.
  //
  //      eq|id=eng.main|make=Yanmar|model=4JH4-TE|serial=E12345|...|~
  //      pt|id=impeller|number=Jabsco 17937-0001|fits=eng.main|min=2|...|~
  // ---------------------------------------------------------------
  var STUB = '2000-01-01T00:00Z|';

  function registryRead(text) {
    var out = { eq: [], pt: [], eqById: {}, ptById: {} };
    (text || '').split('\n').forEach(function (L) {
      if (L === '' || L.charAt(0) === '#') return;
      var r = LOG.parse(STUB + L);
      if (!r) return;
      var id = r.v.id;
      if (!id) return;
      if (r.type === 'eq') {
        var e = { id: id, name: r.v.name || '', make: r.v.make || '', model: r.v.model || '',
                  serial: r.v.serial || '', plate: r.v.plate || '', notes: r.v.notes || '' };
        out.eqById[id] = e; out.eq.push(e);
      } else if (r.type === 'pt') {
        var p = { id: id, name: r.v.name || '', number: r.v.number || '', fits: r.v.fits || '',
                  min: +(r.v.min || 0), stow: r.v.stow || '', kind: r.v.kind || 'countable' };
        out.ptById[id] = p; out.pt.push(p);
      }
    });
    return out;
  }

  function registryLine(type, fields) {
    return LOG.make('2000-01-01T00:00Z', type, fields).substring(STUB.length);
  }
  function registryText(reg) {
    var out = ['# the boat: equipment and parts. Edited rarely; the counts are not here.'];
    reg.eq.forEach(function (e) {
      out.push(registryLine('eq', [['id', e.id], ['name', e.name], ['make', e.make],
        ['model', e.model], ['serial', e.serial], ['plate', e.plate], ['notes', e.notes]]));
    });
    reg.pt.forEach(function (p) {
      out.push(registryLine('pt', [['id', p.id], ['name', p.name], ['number', p.number],
        ['fits', p.fits], ['min', p.min], ['stow', p.stow], ['kind', p.kind]]));
    });
    return out.join('\n') + '\n';
  }

  // ---------------------------------------------------------------
  //  Inventory, derived.  Replay the log: a stocktake SETS the holding,
  //  a use subtracts, a restock adds.
  //
  //  KEYED BY PART ALONE, and that is a correction.  Keying the holding
  //  by part AND by the equipment a job recorded looks careful and is
  //  wrong.  A spare belongs to the locker, not to a machine.  The
  //  moment somebody cannibalises the main engine's impeller for the
  //  generator in an emergency -- which is exactly when a boat does
  //  that -- the job records fits=gen, a second bucket appears from
  //  nowhere, the main engine's holding never goes down, and the
  //  shopping list quietly stops asking for the part you just used.
  //
  //  So `fits` in the REGISTRY says what a part is for, and `eq`/`fits`
  //  on a JOB says where it went -- useful history, both.  Neither
  //  divides the stock.  Two engines needing different impellers are
  //  two parts with two ids, which is what they are in the locker.
  // ---------------------------------------------------------------
  function holdings(recs) {
    var hold = {}, i, r, part, q;
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      part = r.v.part;
      if (!part) continue;
      q = r.v.qty;
      if (r.type === 'inv' && r.v.action === 'stocktake') { hold[part] = +(r.v.count || 0); continue; }
      if (r.type === 'inv' && r.v.action === 'restock') { hold[part] = (hold[part] || 0) + (+q || 0); continue; }
      if (r.type === 'eng' || r.type === 'pro') {
        if (q !== undefined && q !== '') hold[part] = (hold[part] || 0) - (+q || 0);
      }
    }
    return hold;
  }

  // ---------------------------------------------------------------
  //  Open defects.  An inspection that finds something opens an item;
  //  it stays open until a job records closes=<timestamp>.  This is the
  //  piece the log alone does not give you: a finding is not an event
  //  that is over when it is written.  It is a defect that stays open
  //  until somebody closes it -- possibly weeks later, possibly in
  //  another port, possibly when a part arrives.
  // ---------------------------------------------------------------
  function defects(recs) {
    var closed = {}, out = [], i, r;
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.v.closes) closed[r.v.closes] = r.ts;
    }
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.v.state !== 'a') continue;
      if (Object.prototype.hasOwnProperty.call(closed, r.ts)) continue;
      out.push({ ts: r.ts, eq: r.v.eq || '', item: r.v.insp || '', note: r.v.note || '' });
    }
    return out;
  }

  // ---------------------------------------------------------------
  //  The shopping list.  Everything held below its minimum, with what
  //  the man behind the counter will ask for: the manufacturer's
  //  number, what it fits including the engine's serial, and where the
  //  new one goes -- which is where the last one came from.
  // ---------------------------------------------------------------
  function shortages(reg, hold) {
    var out = [];
    reg.pt.forEach(function (p) {
      var have = Object.prototype.hasOwnProperty.call(hold, p.id) ? hold[p.id] : 0;
      if (p.min > 0 && have < p.min) {
        var eq = reg.eqById[p.fits];
        out.push({
          part: p, have: have, want: p.min - have,
          fitsText: eq ? ([eq.make, eq.model].filter(Boolean).join(' ') +
                          (eq.serial ? '  s/n ' + eq.serial : '')) : p.fits
        });
      }
    });
    out.sort(function (a, b) { return (b.want - a.want) || (a.part.id < b.part.id ? -1 : 1); });
    return out;
  }

  // ---------------------------------------------------------------
  //  Engine hours, and what is due.
  //
  //  Intervals come from the owner's engine manual, never from us.  The
  //  checklist items are universal; the hours are not, so the app ships
  //  with NO intervals set and the user enters theirs once from their
  //  own manual.  Hardcoding a plausible number would be inventing data
  //  about somebody else's engine.
  // ---------------------------------------------------------------
  function engineHours(recs, eqId) {
    var last = null, i, r;
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.type !== 'eng' || r.v.hrs === undefined || r.v.hrs === '') continue;
      if (eqId && r.v.eq && r.v.eq !== eqId) continue;
      var h = parseFloat(r.v.hrs);
      if (!isFinite(h)) continue;
      if (last === null || r.ts >= last.ts) last = { ts: r.ts, hrs: h };
    }
    return last;
  }

  //  When was each job last done, by hours and by date?
  function lastJobs(recs) {
    var out = {}, i, r;
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.type !== 'eng' || !r.v.job) continue;
      var h = parseFloat(r.v.hrs);
      var cur = out[r.v.job];
      if (!cur || r.ts >= cur.ts) out[r.v.job] = { ts: r.ts, hrs: isFinite(h) ? h : null };
    }
    return out;
  }

  // ---------------------------------------------------------------
  //  Plausibility, as a QUESTION rather than a rejection.
  //
  //  An instrument reading wrongly is itself worth logging, so "no, that
  //  is what I read" has to be accepted. A form that refuses an unusual
  //  number gets a plausible invented one instead, which is the failure
  //  that does not announce itself.
  //
  //  Ported from implausible() in src/decklog/screens.awk and diffed
  //  against it over the whole numeric range in docs/web/tests/.
  // ---------------------------------------------------------------
  function implausible(key, val) {
    if (val === '-' || val === '/' || val === '' || val === undefined || val === null) return '';
    var x = parseFloat(val);
    if (!isFinite(x)) x = 0;                 // awk's "+0" on non-numeric text
    if (key === 'mslp') { if (x < 870 || x > 1090) return x.toFixed(1) + ' hPa is outside anything recorded on earth'; }
    if (key === 'wspd') { if (x < 0 || x > 250) return g(x) + ' knots'; }
    if (key === 'wdir') { if (x < 0 || x > 360) return g(x) + ' is not a compass direction'; }
    if (key === 'airt' || key === 'dewp') {
      if (x < -60 || x > 60) return g(x) + ' degrees';
    }
    //  SEA TEMPERATURE HAS ITS OWN FLOOR, AND IT IS PHYSICS, NOT TASTE.
    //  Sea water freezes at about -1.9 C; below that it is ice or a
    //  mistake. -2.0 leaves room for brackish water. The ceiling is the
    //  warmest sea anyone records, in the Gulf.
    //
    //  Shared with airt and dewp until a watch offered seat=-17.8 -- a
    //  screen that opened on 0 F and was pressed through -- and this
    //  function let it past. Two mistakes had to line up, and only one
    //  of them was the watch's.
    if (key === 'seat') {
      if (x < -2) return g(x) + ' degrees: sea water freezes near -1.9';
      if (x > 40) return g(x) + ' degrees';
    }
    if (key === 'sog') { if (x < 0 || x > 60) return g(x) + ' knots'; }
    if (key === 'crs') { if (x < 0 || x > 360) return g(x) + ' is not a course'; }
    return '';
  }
  //  awk's %g, which is what the message is formatted with.
  function g(x) {
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e-4 && a < 1e6) {
      var s = x.toPrecision(6);
      if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
    var e = x.toExponential(5).split('e');
    var m = e[0].replace(/0+$/, '').replace(/\.$/, '');
    var ex = +e[1];
    return m + 'e' + (ex < 0 ? '-' : '+') + String(Math.abs(ex)).padStart(2, '0');
  }

  // ---------------------------------------------------------------
  //  There is NO default parts catalogue, and that is deliberate.
  //
  //  An earlier draft of this file shipped one: twelve plausible spares
  //  written from the specification's prose. The awk tool has no such
  //  list -- it starts the registry empty and says "no parts in the
  //  registry yet" -- so shipping one here would have been the web
  //  build inventing data about somebody else's boat and then
  //  disagreeing with the terminal build about what was in the locker.
  //
  //  The eighteen-item engine checklist IS real, and comes from
  //  menus.js, which is dumped from the tool's own CHECKLIST rather
  //  than retyped. Intervals come from the owner's engine manual, never
  //  from us: the items are universal, the hours are not.
  // ---------------------------------------------------------------

  return { registryRead: registryRead, registryText: registryText, registryLine: registryLine,
           holdings: holdings, defects: defects, shortages: shortages,
           engineHours: engineHours, lastJobs: lastJobs,
           implausible: implausible };
})();

if (typeof module !== 'undefined') module.exports = VIEWS;

// =====================================================================
//  THE NT1 PANEL -- every code the camera reads, decoded and checked.
//
//  Larry's ruling TBJB (23 November 2026): his hike test of GlassLog
//  scans the watch's codes into this page, and the page has to say
//  whether EVERY code read correctly, not only that something read.
//
//  So each distinct code is:
//    1. recognised: an NT1 piece (GlassLog, D10/TBIX), Deck Log records
//       (WG Log's form today), or something else;
//    2. for NT1, decoded with docs/web/deck-log/nt1.js -- the module the
//       Scan screen will use, so the hike tests it on real codes -- and
//       its CRC-16 check code checked;
//    3. listed, with each observation shown field by field;
//    4. counted per send, so a missing piece shows ("2 of 5 missing").
//
//  read() and summary() are pure, so docs/web/tests/probe-nt1.js runs
//  them in node; Panel() is the page's half.  Nothing is stored or sent.
// =====================================================================
var NT1Panel = (function () {
  'use strict';

  var NT1 = (typeof module !== 'undefined' && typeof require === 'function')
    ? require('../deck-log/nt1.js') : window.NT1;

  //  deck-log's four encoded characters (log.js), and nothing else
  function undo(v) {
    return v.split('%0A').join('\n').split('%3D').join('=')
            .split('%7C').join('|').split('%25').join('%');
  }

  //  One deck-log line as readable fields:
  //  2026-11-23T16:40Z|nav|lat=41 14.0N|...|~  ->  {ts, type, fields:[[k,v]]}
  function fieldsOf(line) {
    var f = line.split('|'), out = { ts: f[0], type: f[1], fields: [] }, j, p;
    for (j = 2; j < f.length - 1; j++) {
      p = f[j].indexOf('=');
      if (p > 0) out.fields.push([f[j].substring(0, p), undo(f[j].substring(p + 1))]);
    }
    return out;
  }

  function read(text, ref) {
    var t = String(text || '');
    if (/^\s*NT1\s/.test(t)) {
      var d = NT1.decode(t, { ref: ref || new Date() });
      var r = { kind: 'nt1', ok: d.ok, err: d.err, seq: d.seq, n: d.n, of: d.of,
                bad: d.bad, records: [] };
      if (d.ok) {
        var L = NT1.lines(d), i;
        for (i = 0; i < L.length; i++) r.records.push(fieldsOf(L[i]));
      }
      return r;
    }
    //  WG Log's form today: whole deck-log records, each ending "|~"
    var lines = t.split(/\r?\n/), recs = [], k;
    for (k = 0; k < lines.length; k++) {
      if (/^\d{4}-\d\d-\d\dT\d\d:\d\dZ\|[a-z0-9]+\|.*\|~$/.test(lines[k])) recs.push(fieldsOf(lines[k]));
    }
    if (recs.length) return { kind: 'records', ok: true, err: '', records: recs };
    return { kind: 'other', ok: false, err: 'neither NT1 nor Deck Log records', records: [] };
  }

  //  Pieces per send: which arrived, which are missing.
  function summary(items) {
    var s = { codes: items.length, nt1: 0, ok: 0, failed: 0, records: 0, other: 0, sends: {} };
    var i, it, k;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (it.kind === 'nt1') {
        s.nt1++;
        if (it.ok) {
          s.ok++;
          k = String(it.seq);
          if (!s.sends[k]) s.sends[k] = { of: it.of, have: {} };
          s.sends[k].have[it.n] = 1;
          if (it.of > s.sends[k].of) s.sends[k].of = it.of;
        } else s.failed++;
      } else if (it.kind === 'records') s.records++;
      else s.other++;
    }
    for (k in s.sends) {
      var miss = [], n;
      for (n = 1; n <= s.sends[k].of; n++) if (!s.sends[k].have[n]) miss.push(n);
      s.sends[k].missing = miss;
    }
    return s;
  }

  // ---- the page's half --------------------------------------------
  function Panel(root) {
    var seen = {}, items = [];
    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text !== undefined) e.textContent = text;
      return e;
    }
    function render() {
      root.textContent = '';
      var s = summary(items);
      var head = el('p', 'nt1sum');
      if (!items.length) {
        head.textContent = 'Nothing read yet. Start the camera above and show it the watch\u2019s codes.';
        root.appendChild(head); return;
      }
      var txt = s.codes + ' code' + (s.codes === 1 ? '' : 's') + ' read';
      if (s.nt1) txt += ' \u00b7 NT1: ' + s.ok + ' check code OK' + (s.failed ? ', ' + s.failed + ' FAILED' : '');
      if (s.records) txt += ' \u00b7 ' + s.records + ' in Deck Log form';
      if (s.other) txt += ' \u00b7 ' + s.other + ' not recognised';
      head.textContent = txt;
      head.className = 'nt1sum' + (s.failed || s.other ? ' bad' : ' good');
      root.appendChild(head);
      var k;
      for (k in s.sends) {
        var sd = s.sends[k], have = sd.of - sd.missing.length;
        root.appendChild(el('p', 'nt1send' + (sd.missing.length ? ' bad' : ' good'),
          'Send ' + k + ': ' + have + ' of ' + sd.of + ' pieces' +
          (sd.missing.length ? ' \u2014 missing ' + sd.missing.join(', ') : ' \u2014 complete')));
      }
      var i, j, it;
      for (i = items.length - 1; i >= 0; i--) {      // newest first
        it = items[i];
        var box = el('div', 'nt1piece' + (it.ok ? '' : ' bad'));
        var title;
        if (it.kind === 'nt1') {
          title = '#' + (i + 1) + '  NT1 send ' + it.seq + ', piece ' + it.n + ' of ' + it.of + '  ' +
                  (it.ok ? '\u2713 check code OK' : '\u2717 ' + it.err);
        } else if (it.kind === 'records') {
          title = '#' + (i + 1) + '  Deck Log records (WG Log\u2019s form today)';
        } else {
          title = '#' + (i + 1) + '  \u2717 ' + it.err;
        }
        box.appendChild(el('b', null, title));
        for (j = 0; j < it.records.length; j++) {
          var r = it.records[j], line = el('div', 'nt1rec');
          line.appendChild(el('span', 'nt1ts', r.ts.replace(/^\d{4}-/, '').replace('T', ' ') + ' ' + r.type));
          var f = r.fields.map(function (p) { return p[0] + ' ' + p[1]; }).join(' \u00b7 ');
          line.appendChild(el('span', null, '  ' + f));
          box.appendChild(line);
        }
        if (it.kind === 'nt1' && it.ok && it.bad) box.appendChild(el('div', 'bad', it.bad + ' line(s) could not be read'));
        root.appendChild(box);
      }
    }
    render();
    return {
      add: function (text) {
        if (seen[text]) return false;
        seen[text] = 1; items.push(read(text)); render(); return true;
      },
      clear: function () { seen = {}; items = []; render(); },
      count: function () { return items.length; }
    };
  }

  return { read: read, summary: summary, Panel: Panel };
})();

if (typeof module !== 'undefined') module.exports = NT1Panel;

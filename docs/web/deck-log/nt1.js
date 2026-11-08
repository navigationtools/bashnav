// =====================================================================
//  NT1 -- observations by inReach.
//
//  Contract: spec/contracts/navigationtools_inreach_transport.md, v0.8.
//  Decision D6 puts this file in bashnav, beside decklog.js, and the
//  website's Email Worker takes a copy from a tagged release. So this
//  file is the one authority for the format: what it writes, the Worker
//  reads, and the same code expands a piece on both sides.
//
//  IT HOLDS NO SECRET. The check-code secret is a setting on the iPad
//  and in the Worker, passed in. This repository is public.
//
//  THE ONE RULE EVERYTHING ELSE SERVES: no information is lost. A value
//  in the message is the value in the record, never a rounded copy, so
//  a record that arrives by inReach and the same record uploaded in
//  port are BYTE IDENTICAL -- and deck-log's merge, which compares
//  whole lines, keeps one instead of two.
//
//      NT1 42 1/2 K7QX
//      D who=LS src=watch wsrc=garmin tsrc=garmin
//      11040300,41_14.0N,072_05.0W,096,094,7.9,225,20,4;1012.4,7,-2.6,18.0
//      B11040300,72,45,30
//
//  Spaces and line breaks carry no meaning (contract 3.4): values hold
//  no spaces, so the reader splits on any run of whitespace. That is
//  what lets Messenger and email re-wrap the text without breaking it,
//  and it is why the check code is computed over a NORMALISED form.
// =====================================================================
'use strict';

var NT1 = (function () {

  //  ---- the orders ------------------------------------------------
  //
  //  Two different things, and confusing them is the obvious bug.
  //
  //  POSITIONAL (contract 4.3) is the compact order ON THE WIRE, chosen
  //  so the fields that are usually empty come last and can be dropped.
  //
  //  CANONICAL (contract 4.6) is the order a REBUILT RECORD is written
  //  in. It must match what deck-log writes, because the merge compares
  //  bytes: a record whose keys are in a different order is not a
  //  duplicate, it is a conflict, and both copies are kept.
  var NAV_POS = ['lat', 'lon', 'cog', 'crs', 'sog', 'wdir', 'wspd', 'sea', 'wsrc'];
  var WX_POS = ['mslp', 'ptend', 'pchg', 'airt', 'seat', 'cloud', 'cl', 'cm',
                'ch', 'vis', 'swdir', 'swper', 'swht', 'tsrc'];
  var BIO_POS = ['hr', 'bb', 'stress'];

  var NAV_ORDER = ['lat', 'lon', 'cog', 'crs', 'sog', 'wdir', 'wspd', 'wsrc',
                   'sea', 'note', 'who', 'src'];
  var WX_ORDER = ['mslp', 'ptend', 'pchg', 'airt', 'dewp', 'seat', 'tsrc',
                  'cloud', 'cl', 'cm', 'ch', 'vis', 'swdir', 'swper', 'swht',
                  'who', 'src'];
  var BIO_ORDER = ['hr', 'bb', 'stress', 'who'];

  //  Keys that may be carried on the defaults line: the ones that rarely
  //  change. Sending them once a piece instead of once an observation
  //  saves about 40 characters each time (contract 4.2).
  var DEF_KEYS = ['who', 'src', 'wsrc', 'tsrc'];

  //  note is free text and is not sent (contract 4.3, item 7).
  var SKIP = { note: 1 };

  // ---------------------------------------------------------------
  //  Values (contract 4.4).
  //
  //  ORDER MATTERS IN BOTH DIRECTIONS, and the underscore is why. A
  //  real '_' must become %5F BEFORE a space becomes '_', or the two
  //  are indistinguishable coming back. '%' goes first, or it
  //  double-encodes everything after it.
  // ---------------------------------------------------------------
  //  '=' IS ENCODED, which the contract does not list. Without it a
  //  positional value holding '=' is indistinguishable from an extra
  //  key=value, and extras must sit inside their own side (see item()).
  //  Nothing shipped today can contain one -- note is the only free text
  //  and it is not sent -- so this costs nothing and closes the hole
  //  before something does.
  function venc(v) {
    var s = String(v === undefined || v === null ? '' : v);
    s = s.split('%').join('%25');
    s = s.split(',').join('%2C');
    s = s.split(';').join('%3B');
    s = s.split('=').join('%3D');     // see venc's note: extras need it
    s = s.split('_').join('%5F');
    s = s.split(' ').join('_');
    return s;
  }
  function vdec(s) {
    s = String(s === undefined || s === null ? '' : s);
    s = s.split('_').join(' ');
    s = s.split('%5F').join('_');
    s = s.split('%3D').join('=');
    s = s.split('%3B').join(';');
    s = s.split('%2C').join(',');
    s = s.split('%25').join('%');
    return s;
  }

  // ---------------------------------------------------------------
  //  Times. The record carries YYYY-MM-DDThh:mmZ; the wire carries
  //  MMDDhhmm. Reading back, the year is the most recent one that puts
  //  the time at or before the reference moment -- unambiguous across
  //  New Year because a message never covers more than one leg
  //  (contract 4.4, item 1).
  // ---------------------------------------------------------------
  function tsWire(ts) {
    return ts.substr(5, 2) + ts.substr(8, 2) + ts.substr(11, 2) + ts.substr(14, 2);
  }
  function tsFull(w, ref) {
    var mo = w.substr(0, 2), da = w.substr(2, 2), hh = w.substr(4, 2), mi = w.substr(6, 2);
    var r = ref ? new Date(ref.getTime()) : new Date();
    var y = r.getUTCFullYear(), cand;
    //  try this year, then the one before: the first that is not in the
    //  future relative to the reference.
    cand = y + '-' + mo + '-' + da + 'T' + hh + ':' + mi + 'Z';
    if (new Date(cand).getTime() <= r.getTime()) return cand;
    return (y - 1) + '-' + mo + '-' + da + 'T' + hh + ':' + mi + 'Z';
  }

  // ---------------------------------------------------------------
  //  The check code (contract 4.1, decision D5).
  //
  //  THE CONTRACT DOES NOT SPECIFY THE ALGORITHM -- only that it is
  //  four characters from the piece's text and a secret. D6 makes this
  //  file the shared module both sides run, so defining it here is what
  //  makes the two ends agree. It is written down rather than chosen
  //  silently.
  //
  //  Computed over a NORMALISED piece with the code itself removed,
  //  because contract 3.4 says re-wrapping must not break a message. A
  //  byte-exact hash over raw text would fail the moment Messenger or a
  //  mail client folded a line.
  //
  //  WHAT FOUR CHARACTERS ARE AND ARE NOT. Twenty bits is a CHECK, not
  //  a signature: it proves the piece was not mangled and that whoever
  //  built it had the secret. It would not stop someone who could send
  //  mail from guessing. That is why the Worker requires DMARC for
  //  garmin.com AS WELL (contract 8.1) -- every inReach sends from that
  //  address, so the check code is what distinguishes Larry's iPad from
  //  any other inReach, and DMARC is what keeps everyone else out.
  //
  //  The alphabet is RFC 4648 base32: no 0/O and no 1/I, because this
  //  is read off a screen and typed by a human when something has gone
  //  wrong.
  var CKA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function norm(s) {
    return String(s).replace(/[\s]+/g, ' ').replace(/^ /, '').replace(/ $/, '');
  }

  //  A keyed 32-bit mix, FNV-1a over secret, text and secret again, then
  //  folded. Synchronous on purpose: SubtleCrypto is a Promise, and a
  //  Send screen that must build twenty pieces should not be async for
  //  a 20-bit check.
  function ckey(text, secret) {
    var s = String(secret === undefined || secret === null ? '' : secret);
    var m = s + '\u0001' + norm(text) + '\u0001' + s;
    var h = 0x811c9dc5, i;
    for (i = 0; i < m.length; i++) {
      h ^= m.charCodeAt(i) & 0xff;
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      h ^= (m.charCodeAt(i) >> 8) & 0xff;
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    var out = '';
    for (i = 0; i < 4; i++) { out += CKA.charAt(h & 31); h = h >>> 5; }
    return out;
  }

  // ---------------------------------------------------------------
  //  Grouping records into observations.
  //
  //  One nav and one wx share a timestamp, and bio may share it too.
  //  Anything else -- engine, provisions, spares, a merge note -- is
  //  not an observation and is not sent.
  // ---------------------------------------------------------------
  function group(recs) {
    var by = {}, order = [], i, r, k;
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.type !== 'nav' && r.type !== 'wx' && r.type !== 'bio') continue;
      k = r.ts;
      if (!by[k]) { by[k] = { ts: k }; order.push(k); }
      //  A duplicate of the same type at the same stamp is a conflict in
      //  the log, kept by the merge. Sending the first is enough: the
      //  other is already in the log and the port upload carries it.
      if (!by[k][r.type]) by[k][r.type] = r;
    }
    order.sort();
    var out = [];
    for (i = 0; i < order.length; i++) out.push(by[order[i]]);
    return out;
  }

  // ---------------------------------------------------------------
  //  The defaults line.
  //
  //  A KEY GOES ON IT ONLY IF IT IS UNIVERSAL, not merely common, and
  //  that is stricter than the contract says. Contract 4.3 item 1 has
  //  an empty field take the default, and item 2 drops trailing empty
  //  fields -- so a key that is ABSENT from a record and a key that is
  //  EMPTY in it look exactly the same on the wire.
  //
  //  With a "most common value" default that is a real fault, found by
  //  the round-trip test rather than by reading. The watch writes wsrc
  //  only when wind was entered, so a nav record taken with no wind has
  //  no wsrc at all. Make wsrc=obs a default because most records carry
  //  it, and the decoder puts wsrc=obs on the records that never had
  //  it. They come back DIFFERENT from the ones that were sent, the
  //  merge compares bytes, and every one of those observations is in
  //  the log twice, flagged as a conflict, for ever. Which is the one
  //  thing this format exists to prevent.
  //
  //  So: a key qualifies only when every record that COULD carry it
  //  does, with the same value. "Could" is decided by the canonical
  //  order for that record type -- who is a key of all three, src of
  //  nav and wx, wsrc of nav alone, tsrc of wx alone. A key that some
  //  records lack simply travels in its own position instead, which
  //  costs a few characters and cannot be wrong.
  // ---------------------------------------------------------------
  function orderFor(type) {
    return type === 'nav' ? NAV_ORDER : type === 'wx' ? WX_ORDER
         : type === 'bio' ? BIO_ORDER : [];
  }

  function defaults(obs) {
    var d = {}, i, j, k, t, rec, types = ['nav', 'wx', 'bio'];
    for (j = 0; j < DEF_KEYS.length; j++) {
      k = DEF_KEYS[j];
      var seen = null, n = 0, universal = true;
      for (i = 0; i < obs.length && universal; i++) {
        for (t = 0; t < types.length; t++) {
          rec = obs[i][types[t]];
          if (!rec) continue;
          if (orderFor(types[t]).indexOf(k) < 0) continue;   // not its key
          if (rec.v[k] === undefined) { universal = false; break; }
          if (seen === null) seen = rec.v[k];
          else if (seen !== rec.v[k]) { universal = false; break; }
          n++;
        }
      }
      //  one occurrence saves nothing and costs the line
      if (universal && seen !== null && n > 1) d[k] = seen;
    }
    return d;
  }

  //  One observation as a wire item.
  //
  //  EXTRAS BELONG TO THE OBSERVATION, NOT TO ONE RECORD, and that is
  //  forced by the wire format rather than chosen. A key=value item sits
  //  after the whole line, past the ';' that divides nav from weather,
  //  so there is nowhere in it to say which side it came from. The
  //  round-trip test found this the hard way: who is in all three
  //  canonical orders but in none of the positional lists, so when it
  //  cannot go on the defaults line it must travel as an extra -- and
  //  an extra attached only to the last record left who off the nav and
  //  off the bio.
  //
  //  So an extra applies to every record of this observation whose
  //  canonical order holds that key, which is the same rule the
  //  defaults line follows. The one case it cannot express is two
  //  records of one observation disagreeing about the same key; that is
  //  reported rather than silently resolved.
  function item(o, d) {

    function side(rec, pos) {
      var vals = [], seen = {}, j, key, val;
      for (j = 0; j < pos.length; j++) {
        key = pos[j]; seen[key] = 1;
        val = rec && rec.v[key] !== undefined ? rec.v[key] : null;
        //  a value equal to the default is carried by the D line
        if (val !== null && d[key] !== undefined && d[key] === val) val = null;
        vals.push(val === null ? '' : venc(val));
      }
      //  trailing empties are dropped (contract 4.3, item 2)
      while (vals.length && vals[vals.length - 1] === '') vals.pop();
      //  anything the positional list does not hold travels as key=value
      //  INSIDE THIS SIDE, after its positional fields -- so the reader
      //  knows which record it belongs to.
      if (rec) {
        var ex = [];
        for (key in rec.v) {
          if (seen[key] || SKIP[key]) continue;
          if (d[key] !== undefined && d[key] === rec.v[key]) continue;
          ex.push(key + '=' + venc(rec.v[key]));
        }
        ex.sort();
        for (j = 0; j < ex.length; j++) vals.push(ex[j]);
      }
      return vals.join(',');
    }

    var nav = side(o.nav, NAV_POS);
    var wx = o.wx ? side(o.wx, WX_POS) : null;
    //  no weather: the line has no ';' (contract 4.3, item 5)
    var line = tsWire(o.ts) + (nav === '' ? '' : ',' + nav);
    if (wx !== null) line += ';' + wx;
    return line;
  }

  function bioItem(o, d) {
    var vals = [], j, val, key, seen = {}, ex = [];
    for (j = 0; j < BIO_POS.length; j++) {
      key = BIO_POS[j]; seen[key] = 1;
      val = o.bio.v[key];
      if (val !== undefined && d[key] !== undefined && d[key] === val) val = undefined;
      vals.push(val === undefined ? '' : venc(val));
    }
    while (vals.length && vals[vals.length - 1] === '') vals.pop();
    for (key in o.bio.v) {
      if (seen[key] || SKIP[key]) continue;
      if (d[key] !== undefined && d[key] === o.bio.v[key]) continue;
      ex.push(key + '=' + venc(o.bio.v[key]));
    }
    ex.sort();
    for (j = 0; j < ex.length; j++) vals.push(ex[j]);
    if (!vals.length) return null;
    return 'B' + tsWire(o.ts) + ',' + vals.join(',');
  }

  // ---------------------------------------------------------------
  //  encode(records, opts) -> { pieces, items, obs, defaults }
  //
  //  opts: seq (number), size (default 1600), secret (string)
  //
  //  Each piece stands alone (contract 3.3): its own header, its own
  //  defaults line, whole observations only. A missing piece costs its
  //  own observations and nothing else, and the next send carries them
  //  again.
  // ---------------------------------------------------------------
  function encode(recs, opts) {
    opts = opts || {};
    var size = opts.size || 1600;
    var seq = opts.seq || 1;
    var secret = opts.secret || '';

    var obs = group(recs);
    var d = defaults(obs);
    var dline = 'D', k;
    for (k in d) dline += ' ' + k + '=' + venc(d[k]);
    if (dline === 'D') dline = '';

    var items = [], i, it, b;
    for (i = 0; i < obs.length; i++) {
      it = item(obs[i], d);
      if (it) items.push(it);
      if (obs[i].bio) { b = bioItem(obs[i], d); if (b) items.push(b); }
    }

    //  Pack. The header is written last, because its piece count is not
    //  known until the packing is done -- so reserve a worst case and
    //  check at the end.
    var HDR = 'NT1 ' + seq + ' 99/99 XXXX';
    var room = size - HDR.length - 1 - (dline ? dline.length + 1 : 0);
    var groups = [], cur = [], len = 0;
    for (i = 0; i < items.length; i++) {
      var add = items[i].length + (cur.length ? 1 : 0);
      if (cur.length && len + add > room) { groups.push(cur); cur = []; len = 0; add = items[i].length; }
      cur.push(items[i]); len += add;
    }
    if (cur.length) groups.push(cur);
    if (!groups.length) groups.push([]);

    var pieces = [];
    for (i = 0; i < groups.length; i++) {
      var body = (dline ? dline + '\n' : '') + groups[i].join('\n');
      var stem = seq + ' ' + (i + 1) + '/' + groups.length + ' ';
      var code = ckey(stem + body, secret);
      pieces.push('NT1 ' + stem + code + '\n' + body);
    }
    return { pieces: pieces, items: items.length, obs: obs.length, defaults: d };
  }

  // ---------------------------------------------------------------
  //  decode(piece, opts) -> { ok, err, seq, n, of, records, bad }
  //
  //  opts: secret, ref (Date for the year rule), check (default true)
  //
  //  It NEVER throws. A piece that arrives cut in half is still worth
  //  the observations it holds, and the Worker's held store exists to
  //  let Larry recover them by hand.
  // ---------------------------------------------------------------
  function decode(piece, opts) {
    opts = opts || {};
    var out = { ok: false, err: '', seq: 0, n: 0, of: 0, records: [], bad: 0 };
    var toks = norm(piece).split(' ');
    if (!toks.length || toks[0] !== 'NT1') { out.err = 'not an NT1 message'; return out; }
    if (toks.length < 4) { out.err = 'header is incomplete'; return out; }
    var seq = toks[1], pn = toks[2], code = toks[3];
    var m = /^([0-9]+)\/([0-9]+)$/.exec(pn);
    if (!m) { out.err = 'bad piece number: ' + pn; return out; }
    out.seq = +seq; out.n = +m[1]; out.of = +m[2];

    var rest = toks.slice(4);
    if (opts.check !== false) {
      var want = ckey(seq + ' ' + pn + ' ' + rest.join(' '), opts.secret || '');
      if (want !== code) { out.err = 'check code does not match'; return out; }
    }

    //  the defaults line, if there is one
    var d = {}, i = 0;
    if (rest[0] === 'D') {
      i = 1;
      while (i < rest.length && /^[a-z][a-z0-9_]*=/.test(rest[i])) {
        var p = rest[i].indexOf('=');
        d[rest[i].substring(0, p)] = vdec(rest[i].substring(p + 1));
        i++;
      }
    }

    var ref = opts.ref || new Date();
    for (; i < rest.length; i++) {
      var t = rest[i];
      if (t === '') continue;
      if (t.charAt(0) === 'B') { pushBio(out, t, d, ref); continue; }
      if (t.charAt(0) >= '0' && t.charAt(0) <= '9') { pushObs(out, t, d, ref); continue; }
      //  a letter we do not know: ignored on purpose (contract 4.3,
      //  item 8), so a later record type costs no version bump.
    }

    out.ok = true;
    return out;
  }

  //  Split one side's comma list into its positional values and its
  //  extras. A field holding '=' is an extra; a positional value never
  //  can, because venc encodes it.
  function split(vals, start) {
    var pos = [], ex = {}, j, f, q;
    for (j = start; j < vals.length; j++) {
      f = vals[j];
      q = f.indexOf('=');
      if (q > 0 && /^[a-z][a-z0-9_]*$/.test(f.substring(0, q))) {
        ex[f.substring(0, q)] = vdec(f.substring(q + 1));
      } else {
        pos.push(f);
      }
    }
    return { pos: pos, ex: ex };
  }

  function fill(v, keys, parts, d) {
    var j, k, raw;
    for (j = 0; j < keys.length; j++) {
      k = keys[j];
      raw = j < parts.pos.length ? parts.pos[j] : '';
      if (raw === '') {
        //  empty takes the default if there is one, otherwise the key is
        //  LEFT OUT -- which in deck-log means "never asked", and is not
        //  the same as 0 or '-'.
        if (d[k] !== undefined) v[k] = d[k];
      } else {
        v[k] = vdec(raw);
      }
    }
    for (k in parts.ex) v[k] = parts.ex[k];
  }

  function order(v, keys) {
    var f = [], j, seen = {}, k;
    for (j = 0; j < keys.length; j++) {
      k = keys[j]; seen[k] = 1;
      if (v[k] !== undefined) f.push([k, v[k]]);
    }
    //  a key the order does not list follows, alphabetically
    //  (contract 4.6, item 1)
    var extra = [];
    for (k in v) if (!seen[k]) extra.push(k);
    extra.sort();
    for (j = 0; j < extra.length; j++) f.push([extra[j], v[extra[j]]]);
    return f;
  }

  function mkLine(ts, type, v, keys) {
    var f = order(v, keys), out = ts + '|' + type, j;
    for (j = 0; j < f.length; j++) out += '|' + f[j][0] + '=' + recEnc(f[j][1]);
    return out + '|~';
  }

  //  deck-log's own encoding (log.js enc), repeated here so this module
  //  stands alone in the Worker, where log.js is not loaded.
  function recEnc(s) {
    s = String(s === undefined || s === null ? '' : s);
    s = s.split('%').join('%25');
    s = s.split('|').join('%7C');
    s = s.split('=').join('%3D');
    s = s.split('\n').join('%0A');
    return s;
  }

  function pushObs(out, t, d, ref) {
    var semi = t.indexOf(';');
    var navPart = semi < 0 ? t : t.substring(0, semi);
    var wxPart = semi < 0 ? null : t.substring(semi + 1);
    var nv = navPart.split(',');
    if (nv[0].length !== 8) { out.bad++; return; }
    var ts = tsFull(nv[0], ref);
    var v = {};
    fill(v, NAV_POS, split(nv, 1), d);
    for (var k in d) if (v[k] === undefined && NAV_ORDER.indexOf(k) >= 0) v[k] = d[k];
    out.records.push({ ts: ts, type: 'nav', v: v, keys: NAV_ORDER });
    if (wxPart !== null) {
      var wv = {};
      fill(wv, WX_POS, split(wxPart.split(','), 0), d);
      for (var k2 in d) if (wv[k2] === undefined && WX_ORDER.indexOf(k2) >= 0) wv[k2] = d[k2];
      out.records.push({ ts: ts, type: 'wx', v: wv, keys: WX_ORDER });
    }
  }

  function pushBio(out, t, d, ref) {
    var a = t.substring(1).split(',');
    if (a[0].length !== 8) { out.bad++; return; }
    var ts = tsFull(a[0], ref), v = {};
    fill(v, BIO_POS, split(a, 1), d);
    if (v.who === undefined && d.who !== undefined) v.who = d.who;
    out.records.push({ ts: ts, type: 'bio', v: v, keys: BIO_ORDER });
  }

  //  The decoded records as deck-log lines, in the canonical key order.
  function lines(dec) {
    var out = [], i, r;
    for (i = 0; i < dec.records.length; i++) {
      r = dec.records[i];
      out.push(mkLine(r.ts, r.type, r.v, r.keys));
    }
    return out;
  }

  return {
    encode: encode, decode: decode, lines: lines,
    venc: venc, vdec: vdec, ckey: ckey, norm: norm,
    tsWire: tsWire, tsFull: tsFull,
    NAV_POS: NAV_POS, WX_POS: WX_POS, BIO_POS: BIO_POS,
    NAV_ORDER: NAV_ORDER, WX_ORDER: WX_ORDER, BIO_ORDER: BIO_ORDER
  };
})();

if (typeof module !== 'undefined') module.exports = NT1;

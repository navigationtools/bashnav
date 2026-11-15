#!/usr/bin/env python3
"""Independent reference values for tests/tides-work.dat.

NOT run by the suite, which is POSIX sh and awk only.  This is where the
expected numbers in tests/tides-work.dat came from, kept so anyone can see
how they were obtained and recompute them:

    python3 tests/tides-work-ref.py

Each calculator is worked here from its textbook definition, written
without reference to src/tides/work.awk, and where a different method is
available it is the one used, so the two cannot share a mistake:

  twelfths   the cumulative twelfths are integrated from the 1-2-3-3-2-1
             staircase rather than read from a table of 0,1,3,6,9,11,12
  cts        the heading is found by BISECTION on the direction of the
             ground vector, not by the asin of the cross-track part
  setdrift   mid-latitude sailing, the definition itself
  stream, secondary  the RYA linear interpolation, the definition itself
  tidal_gate the stream along her track is a DOT PRODUCT of two unit
             vectors, not the cosine of a difference; the time the gate
             turns is found by BISECTION on the straight line between two
             pages, not by the proportion; and the high waters of the
             station form are copied from `tides today`, as for atlas
  atlas      only the arithmetic on the predicted turns: the turns come
             from the harmonic engine, which is checked against NOAA's
             published tables by tests/tides-check.awk, and are copied
             here from `tides today` as a navigator would read them

Invented reference data is worse than none (docs/HACKING.md), so every
value below is printed by this script, not typed.
"""
import math


def twelfths(t1, h1, t2, h2, t):
    D = t2 - t1
    x = (t - t1) / (D / 6.0)
    steps = [1, 2, 3, 3, 2, 1]
    c = 0.0
    for i, s in enumerate(steps):          # integrate the staircase
        c += s * max(0.0, min(1.0, x - i))
    tw = h1 + (h2 - h1) * c / 12.0
    A = math.pi * ((t - t1) / D + 1)
    co = h1 + (h2 - h1) * (math.cos(A) + 1) / 2
    return tw, co


def hm(s):
    if ':' in s:
        h, m = s.split(':')
    else:
        h, m = s[:2], s[2:]
    return int(h) * 60 + int(m)


def cyc(x, a, d1, b, d2):
    x %= 720; a %= 720; b %= 720
    L = (b - a) % 720; p = (x - a) % 720
    if p <= L:
        return d1 + p / L * (d2 - d1)
    return d2 + (p - L) / (720 - L) * (d1 - d2)


def secondary(hw, hwh, ms, mn, ds, dn, a1, a2, b1, b2):
    td = cyc(hm(hw), hm(a1), a2, hm(b1), b2)
    tdr = math.floor(td + 0.5)
    f = (hwh - mn) / (ms - mn)
    dd = dn + f * (ds - dn)
    return (hm(hw) + tdr) % 1440, td, hwh + dd, dd


def stream(spr, nps, rg, sp, np_):
    f = (rg - np_) / (sp - np_)
    return max(0.0, nps + f * (spr - nps)), f


def vec(brg, r):
    return r * math.sin(math.radians(brg)), r * math.cos(math.radians(brg))


def brg(x, y):
    return math.degrees(math.atan2(x, y)) % 360


def cts(track, stw, streams, lee=0, wind='', var=0, dev=0, dist=0):
    n = len(streams)
    tx = sum(vec(s, r)[0] for s, r in streams)
    ty = sum(vec(s, r)[1] for s, r in streams)
    W = stw * n
    # the ground vector's bearing relative to the track, as a function of
    # the heading offset from the track; bisect for zero
    def g(off):
        wx, wy = vec(track + off, W)
        return ((brg(tx + wx, ty + wy) - track + 540) % 360) - 180
    lo, hi = -89.999, 89.999
    if g(lo) * g(hi) > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2
        if g(lo) * g(mid) <= 0:
            hi = mid
        else:
            lo = mid
    off = (lo + hi) / 2
    wx, wy = vec(track + off, W)
    gx, gy = tx + wx, ty + wy
    mg = gx * math.sin(math.radians(track)) + gy * math.cos(math.radians(track))
    if mg <= 0:
        return None
    H = (track + off) % 360
    hd = H - lee if wind == 'port' else (H + lee if wind == 'stbd' else H)
    tr = int(hd % 360 + 0.5) % 360
    mag = (tr - var) % 360
    comp = (mag - dev) % 360
    sog = mg / n
    out = dict(water=H, cts=tr, mag=mag, comp=comp, sog=sog, mg=mg)
    if dist:
        out['time'] = dist / sog * 60
    return out


def dlon(d):
    while d > 180: d -= 360
    while d < -180: d += 360
    return d


def setdrift(la1, lo1, co, stw, hrs, fla, flo, lee=0, wind=''):
    wt = co + lee if wind == 'port' else (co - lee if wind == 'stbd' else co)
    d = stw * hrs
    dn = d * math.cos(math.radians(wt)); de = d * math.sin(math.radians(wt))
    la2 = la1 + dn / 60
    lo2 = lo1 + de / (60 * math.cos(math.radians((la1 + la2) / 2)))
    if lo2 > 180: lo2 -= 360
    if lo2 < -180: lo2 += 360
    fn = (fla - la2) * 60
    fe = dlon(flo - lo2) * 60 * math.cos(math.radians((fla + la2) / 2))
    drift = math.hypot(fn, fe)
    return dict(drlat=la2, drlon=lo2, set=brg(fe, fn), drift=drift, rate=drift / hrs)


def half_up(x):
    """to the nearest whole number, a half going up: floor(x + 0.5)"""
    return math.floor(x + 0.5)


def hundredth(x):
    """to a hundredth, a half going away from nothing, as it is printed"""
    return math.copysign(math.floor(abs(x) * 100 + 0.5) / 100.0, x) if x else 0.0


def gate(hw, t=None, dist=None, sog=None, prev=None, nxt=None,
         track=None, pairs=None, frm=-6, foul=0.0, opens=None, shuts=None):
    """A tidal gate.  Times are minutes from the midnight of hw's day.

    atlas form: track and pairs (set, rate) for the pages from `frm`.
    pilot form: opens and shuts, hours from high water.
    prev and nxt are the high waters either side; the mean, 12 h 25 min,
    when they are not given."""
    H = {0: hw, -1: hw - 745 if prev is None else prev, 1: hw + 745 if nxt is None else nxt}
    H[2] = H[1] + 745; H[3] = H[2] + 745; H[-2] = H[-1] - 745
    out = {}
    wins = []                      # (opens, shuts, opens known, shuts known)
    if pairs is not None:
        tk = math.radians(track)
        ux, uy = math.sin(tk), math.cos(tk)
        full = len(pairs) == 13
        sam = []                   # (time, along, tide, page)
        for k in ((-1, 0, 1) if full else (0,)):
            for i, (st, rate) in enumerate(pairs):
                tm = H[k] + (frm + i) * 60
                if sam and tm <= sam[-1][0]:
                    continue
                a = math.radians(st)
                sam.append((tm, hundredth(rate * (math.sin(a) * ux + math.cos(a) * uy)), k, frm + i))
        c = -foul

        def f(x):                  # the straight lines between the pages, less the level
            for (t1, a1, _, _), (t2, a2, _, _) in zip(sam, sam[1:]):
                if t1 <= x <= t2:
                    return a1 + (a2 - a1) * (x - t1) / (t2 - t1) - c
            return None

        def root(t1, t2):          # bisection: where the line reaches the level
            lo, hi = t1, t2
            up = f(hi) >= 0
            for _ in range(80):
                mid = (lo + hi) / 2.0
                if (f(mid) >= 0) == up:
                    hi = mid
                else:
                    lo = mid
            return half_up((lo + hi) / 2.0)

        cur = None
        if sam[0][1] - c >= 0:
            cur = [sam[0][0], None, False, False]
        for (t1, a1, _, _), (t2, a2, _, _) in zip(sam, sam[1:]):
            if a1 - c < 0 <= a2 - c:
                cur = [root(t1, t2), None, True, False]
            elif a1 - c >= 0 > a2 - c:
                cur[1] = root(t1, t2); cur[3] = True
                wins.append(tuple(cur)); cur = None
        if cur:
            cur[1] = sam[-1][0]
            wins.append(tuple(cur))
        lo, hi = (hw - 360, hw + 360) if full else (sam[0][0] - 1, sam[-1][0] + 1)
        mine = [s_ for s_ in sam if s_[2] == 0]
        b = max(mine, key=lambda s_: s_[1])
        out['best'] = b[1]; out['bestpage'] = b[3]
        known = full or t is None or sam[0][0] <= t <= sam[-1][0]
        if t is not None and known:
            out['along'] = f(t) + c
    else:
        for k in (-2, -1, 0, 1, 2):
            o = half_up(H[k] + opens * 60)
            s_ = half_up((H[k] if shuts > opens else H[k + 1]) + shuts * 60)
            wins.append((o, s_, True, True))
        lo, hi = hw - 360, hw + 360
        known = True
    rep = [w for w in wins if w[1] > lo and w[0] < hi]
    out['n'] = len(rep)
    for i, w in enumerate(rep, 1):
        out['o%d' % i] = w[0]; out['s%d' % i] = w[1]
        out['ok%d' % i] = int(w[2]); out['sk%d' % i] = int(w[3])
    if t is not None:
        if not known:
            out['state'] = 'unknown'
        else:
            inside = [w for w in wins if w[0] <= t < w[1]]
            out['state'] = 'open' if inside else 'shut'
            if inside and inside[0][3]:
                out['left'] = inside[0][1] - t
            if not inside:
                later = [w for w in wins if w[2] and w[0] > t]
                if later:
                    out['left'] = later[0][0] - t
    if sog:
        p = half_up(dist / sog * 60)
        out['p'] = p
        for i, w in enumerate(rep, 1):
            if w[2]:
                out['lv%d' % i] = w[0] - p
            if w[3]:
                out['lb%d' % i] = w[1] - p
    return out


def near(m, hw):
    """a clock time as the minute nearest that high water"""
    while m - hw > 720:
        m -= 1440
    while m - hw < -720:
        m += 1440
    return m


def show(name, d):
    print(name, ' '.join('%s=%.6f' % kv if isinstance(kv[1], float) else '%s=%s' % kv
                         for kv in d.items()))


if __name__ == '__main__':
    for nm, a in [('T1', (hm('05:12'), 0.8, hm('11:24'), 4.2, hm('08:30'))),
                  ('T2 falling over midnight', (hm('23:10'), 4.0, hm('05:20') + 1440, 1.0, hm('01:00') + 1440)),
                  ('T3 half tide', (0, 1.0, 360, 3.0, 180)),
                  ('T4 hour two', (0, 1.0, 360, 3.0, 120)),
                  ('T8 hour one', (0, 1.0, 360, 3.0, 45)),
                  ('T9 hour five', (0, 1.0, 360, 3.0, 270)),
                  ('T10 hour six', (0, 1.0, 360, 3.0, 330)),
                  ('T5 at LW', (hm('05:12'), 0.8, hm('11:24'), 4.2, hm('05:12'))),
                  #  Dover 2026-11-07, as `tides today` prints it: HW 09:45 6.61, LW 16:54 0.93
                  ('T6 Dover 10:00', (hm('09:45'), 6.61, hm('16:54'), 0.93, hm('10:00'))),
                  ('T7 Dover 13:00', (hm('09:45'), 6.61, hm('16:54'), 0.93, hm('13:00')))]:
        tw, co = twelfths(*a)
        show(nm, dict(t12=tw, tcos=co))
    print('S1 HW', secondary('05:36', 6.4, 6.8, 5.3, -0.4, -0.3, '0000', -10, '0600', 5))
    print('S1 LW', secondary('11:51', 1.1, 0.8, 2.1, 0.1, 0.0, '0100', -5, '0700', 10))
    print('S2 HW beyond springs, second arc', secondary('20:15', 7.2, 6.8, 5.3, -0.4, -0.3, '0000', -10, '0600', 5))
    print('ST1', stream(2.6, 1.4, 4.1, 5.9, 3.1))
    print('ST2 beyond springs', stream(2.0, 1.0, 7.0, 5.0, 2.0))
    print('ST3 below neaps, clamped', stream(2.0, 1.0, 0.2, 5.0, 3.0))
    show('C1', cts(45, 6, [(135, 1.5), (150, 2.0)], 5, 'port', -2, 1, 12))
    show('C2 wrap', cts(355, 5, [(10, 1.0)]))
    show('C3 stbd leeway', cts(270, 5, [(180, 1.2)], 4, 'stbd', 3, -2, 5))
    print('C4 across', cts(355, 5, [(90, 6.0)]))
    print('C5 along', cts(5, 5, [(180, 6.0)]))
    show('D1', setdrift(50.10, -1.50, 90, 6, 3, 50.05, -1.20))
    show('D2 stbd leeway', setdrift(50.80, -1.10, 200, 5, 2, 50.65, -1.20, 6, 'stbd'))
    show('D3 antimeridian', setdrift(-10.0, 179.9, 90, 6, 2, -10.05, -179.85))
    #  the coastal course's own chapter examples
    show('K1', dict(zip(('t12', 'tcos'), twelfths(hm('04:30'), 1.50, hm('10:52'), 4.39, hm('07:00')))))
    print('K2', stream(4.2, 2.0, 2.61, 3.9, 1.9))
    show('K3', cts(255, 7.0, [(30, 1.5)]))
    show('K4', cts(255, 7.0, [(30, 1.5)], 5, 'port'))
    show('K5', cts(250, 7.5, [(290, 1.2), (285, 0.9), (280, 0.4), (100, 0.3), (105, 0.8), (110, 1.1)], dist=48.4))
    show('K6', setdrift(50.4630, -2.4550, 250, 6.5, 2, 50.3660, -2.8260))
    print('K7 HW', secondary('10:52', 4.39, 5.5, 4.4, -0.2, -0.1, '0000', 20, '0600', 10))
    print('K7 LW', secondary('04:30', 1.50, 0.8, 2.2, 0.1, 0.0, '0000', 5, '0600', 25))
    #  ---- the tidal gate
    HELP = [(75, 2.2), (78, 2.6), (80, 2.0), (85, 0.9), (250, 0.4), (255, 1.5), (258, 2.4),
            (260, 2.7), (258, 2.1), (255, 1.0), (80, 0.3), (78, 1.4), (76, 2.1)]
    hw = hm('14:32')
    show('G1 the help example', gate(hw, t=near(hm('17:00'), hw), dist=22, sog=7, track=255, pairs=HELP))
    #  open across LOW water: one window from the tide before, one into the next
    LOWW = [(255, 2.0), (255, 1.6), (255, 0.9), (255, 0.2), (75, 0.6), (75, 1.5), (75, 2.2),
            (75, 2.0), (75, 1.2), (75, 0.3), (255, 0.5), (255, 1.3), (255, 1.9)]
    show('G2 across low water', gate(hw, t=near(hm('20:00'), hw), track=255, pairs=LOWW))
    show('G3 the same, the next HW given 12h40 on', gate(hw, nxt=hw + 760, t=near(hm('20:00'), hw), track=255, pairs=LOWW))
    show('G4 the help example, a knot of foul accepted', gate(hw, t=near(hm('11:45'), hw), track=255, pairs=HELP, foul=1.0))
    hw2 = hm('23:40')
    PART = [(270, 1.5), (275, 0.6), (90, 0.5), (92, 1.8)]
    show('G5 four pages from HW +2', gate(hw2, t=near(hm('03:10'), hw2), track=90, pairs=PART, frm=2, foul=0.8))
    show('G6 the same, a time off the pages', gate(hw2, t=near(hm('08:00'), hw2), track=90, pairs=PART, frm=2))
    show('G7 foul on every page', gate(hw, track=75, pairs=[(250, 1.0), (255, 2.0), (260, 1.5)], frm=-1))
    show('G8 fair on every page', gate(hw, track=255, pairs=[(250, 1.0), (255, 2.0), (260, 1.5)], frm=-1, dist=10, sog=5))
    show('G9 the pilot book, across low water', gate(hw, t=near(hm('17:00'), hw), dist=22, sog=7, opens=5, shuts=-1))
    show('G10 the pilot book, on one tide', gate(hw, t=near(hm('15:00'), hw), opens=-1, shuts=5))
    hw3 = hm('22:50')
    show('G11 half hours, the next HW given, over midnight',
         gate(hw3, nxt=near(hm('11:22'), hw3 + 745), t=near(hm('02:00'), hw3), dist=6, sog=4.5, opens=4.5, shuts=-1.5))
    #  Portsmouth 2025-05-24, as `tides today` prints its high waters:
    #  20:18 the day before, 08:42, 21:10
    hwp = hm('08:42')
    show('G12 Portsmouth, the pilot book', gate(hwp, prev=hm('20:18') - 1440, nxt=hm('21:10'), t=hm('11:00'), opens=5, shuts=-1))
    show('G13 Portsmouth, the atlas', gate(hwp, prev=hm('20:18') - 1440, nxt=hm('21:10'), t=hm('11:00'), track=255, pairs=LOWW))
    #  two pages where the printed hundredths matter: unrounded, the gate
    #  would open a minute earlier (23 min after the page, not 24)
    show('G14 worked from the printed figures', gate(hm('10:00'), track=255, pairs=[(60, 0.3), (230, 0.5)], frm=0))
    #  her time is on the far side of midnight from the high water
    hw4 = hm('01:10')
    show('G15 23:30 is the evening before', gate(hw4, t=near(hm('23:30'), hw4), opens=-3, shuts=2))
    #  tides only 11 h 30 min apart: the next tide's first page falls before
    #  this tide's last, and is left out
    show('G16 the next HW 11h30 on', gate(hw, nxt=hw + 690, t=near(hm('21:00'), hw), track=255, pairs=LOWW))
    #  Dover's means, from M2 2.253 and S2 0.708 in src/tides/stations.dat,
    #  and the range of the 10:00 tide (HW 6.61 - the LW after it, 0.93)
    sp, np_ = 2 * (2.253 + 0.708), 2 * (2.253 - 0.708)
    show('A1 Dover', dict(page=0, range=6.61 - 0.93, sprange=sp, nprange=np_,
                          f=(6.61 - 0.93 - np_) / (sp - np_)))

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
    #  Dover's means, from M2 2.253 and S2 0.708 in src/tides/stations.dat,
    #  and the range of the 10:00 tide (HW 6.61 - the LW after it, 0.93)
    sp, np_ = 2 * (2.253 + 0.708), 2 * (2.253 - 0.708)
    show('A1 Dover', dict(page=0, range=6.61 - 0.93, sprange=sp, nprange=np_,
                          f=(6.61 - 0.93 - np_) / (sp - np_)))

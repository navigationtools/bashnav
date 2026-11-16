#!/usr/bin/env python3
"""
Apply the chart-datum corrections to the station file (board item B24).

    python3 src/tides/gen/apply_corrections.py           apply them
    python3 src/tides/gen/apply_corrections.py --check   change nothing; say
                                                         whether the station
                                                         file already agrees

Reads src/tides/gen/corrections.dat and rewrites, in src/tides/stations.dat,
two fields of each station it names: the zero (z0, mm) and the zero's name.
Nothing else in a station's line is touched and no other station is touched.
It also writes the file's header, which states the data's licences.

Why a script and not a hand edit: fourteen numbers typed by hand is fourteen
chances of a slip, and a slip here is a tide table that reads wrong. Why a
corrections file and not an edit to the generator: the station file cannot be
regenerated as it stands (its source has moved on; see corrections.dat), so
the correction is applied to the file we have. make_stations.py calls this
too, so a regenerated file is corrected the same way.

It is safe to run twice: the second run changes nothing.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
COR = os.path.join(HERE, 'corrections.dat')
DAT = os.path.join(ROOT, 'src', 'tides', 'stations.dat')

HEADER = [
    "# Bash Navigation Software tide station data",
    "# Assembled from https://github.com/neaps/tide-database.",
    "# LICENCES, by provider (docs/DATA-LICENCES.md lists every one):",
    "#   noaa/...                   NOAA harmonics: public domain",
    "#   ticon/...-cmems, -uz, -cv  TICON-4 harmonics: CC BY-NC 4.0, non-commercial",
    "#   every other ticon/...      TICON-4 harmonics: CC BY 4.0",
    "# ZEROS: a station named CD is on chart datum (src/tides/gen/corrections.dat).",
    "#   noaa/ MLLW is NOAA's published chart datum. Every other zero was computed",
    "#   by the database from the tide's constants, or is mean sea level (MSL),",
    "#   and is not the chart's zero.",
]

def corrections(path=COR):
    out = {}
    for n, line in enumerate(open(path, encoding='utf-8'), 1):
        line = line.rstrip('\n')
        if not line or line.startswith('#'):
            continue
        f = line.split('|')
        if len(f) != 5:
            sys.exit('corrections.dat line %d: 5 fields wanted, %d found' % (n, len(f)))
        sid, z0, zero = f[0], f[1], f[2]
        if not z0.lstrip('-').isdigit():
            sys.exit('corrections.dat line %d: z0 %r is not a whole number of mm' % (n, z0))
        if zero != 'CD':
            sys.exit('corrections.dat line %d: the zero must be CD, not %r' % (n, zero))
        if sid in out:
            sys.exit('corrections.dat line %d: %s is named twice' % (n, sid))
        out[sid] = (z0, zero)
    return out

def main(check):
    cor = corrections()
    lines = open(DAT, encoding='utf-8').read().split('\n')
    if lines and lines[-1] == '':
        lines.pop()
    body = [l for l in lines if not l.startswith('#')]
    seen, changed, stray, new = set(), 0, [], []
    for l in body:
        f = l.split('|')
        if f[0] == 'R' and f[1] in cor:
            seen.add(f[1])
            z0, zero = cor[f[1]]
            if f[8] != z0 or f[9] != zero:
                changed += 1
                f[8], f[9] = z0, zero
                l = '|'.join(f)
        elif f[0] == 'R' and f[9] == 'CD':
            stray.append(f[1])
        new.append(l)
    missing = sorted(set(cor) - seen)
    if missing:
        sys.exit('not reference stations in stations.dat: ' + ', '.join(missing))
    if stray:
        sys.exit('named CD in stations.dat with no line in corrections.dat: ' + ', '.join(stray))
    head_ok = [l for l in lines if l.startswith('#')] == HEADER
    if check:
        if changed or not head_ok:
            sys.exit('stations.dat does NOT agree with corrections.dat: %d station(s) differ%s'
                     % (changed, '' if head_ok else ', and the header differs'))
        print('stations.dat agrees with corrections.dat: %d stations on chart datum' % len(cor))
        return
    with open(DAT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(HEADER + new) + '\n')
    print('%d corrections; %d station line(s) changed%s' %
          (len(cor), changed, '' if head_ok else '; header written'))

if __name__ == '__main__':
    main('--check' in sys.argv[1:])

#!/usr/bin/env python3
"""
Turn the Neaps tide database into the compact station file tides reads.

Source: https://github.com/neaps/tide-database
  NOAA harmonics      public domain
  TICON-4 harmonics   CC BY 4.0
Both are carried forward under CC BY 4.0; see docs/ATTRIBUTION.md.

Output format, one station per line:

  R|id|name|region|country|lat|lon|tzmin|z0mm|datum|idx:amp_mm:phase_tenths,...
  S|id|name|region|country|lat|lon|tzmin|refid|htype|hhi|hlo|thi|tlo

Amplitudes are millimetres and phases tenths of a degree, which is finer
than the constants are known and keeps the file to about a megabyte.
"""
import json, glob, sys, os, math
from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

ALIAS = {'LAMBDA2':'LDA2','LAM2':'LDA2','SIGMA1':'SIG1','SGM':'SIG1',
         'RHO':'RHO1','THETA1':'THE1','EP2':'EPS2'}
#  Keep essentially everything published. A 10 mm floor looked harmless
#  and cost a factor of four in the timing of high water - worst error
#  against NOAA's own predictions went from 5.9 minutes to 26.9. The
#  extra megabyte is worth it.
FLOOR = 0.0005                   # metres

def clean(s):
    if s is None: return ""
    return str(s).replace("|"," ").replace(",", " ").replace(";"," ").strip()

def tzmin(name):
    """Standard-time offset in minutes, from the IANA zone. No summer time."""
    if not name or ZoneInfo is None: return ""
    try:
        z = ZoneInfo(name)
        jan = datetime(2026,1,15,12,tzinfo=z); jul = datetime(2026,7,15,12,tzinfo=z)
        off = min(jan.utcoffset(), jul.utcoffset())      # the standard one
        return str(int(off.total_seconds()//60))
    except Exception:
        return ""

def main(src, out, index_json):
    idx = json.load(open(index_json))
    lines, kept, dropped, nodat = [], 0, 0, 0
    for f in sorted(glob.glob(src)):
        try: d = json.load(open(f))
        except Exception: continue
        if 'latitude' not in d: continue
        sid = os.path.splitext(os.path.basename(f))[0]
        src_dir = os.path.basename(os.path.dirname(f))
        sid = src_dir + "/" + sid
        head = [clean(d.get('name')), clean(d.get('region')), clean(d.get('country')),
                "%.5f"%d['latitude'], "%.5f"%d['longitude'], tzmin(d.get('timezone'))]
        if d.get('type') == 'reference':
            hc = d.get('harmonic_constituents') or []
            terms, lost = [], 0.0
            for c in hc:
                a = c['amplitude']; n = ALIAS.get(c['name'], c['name'])
                if abs(a) < FLOOR: continue
                if n not in idx: lost += abs(a); dropped += 1; continue
                ph = c['phase'] % 360.0
                if a < 0: a, ph = -a, (ph + 180.0) % 360.0
                terms.append("%d:%d:%d" % (idx[n], round(a*1000), round(ph*10)))
                kept += 1
            if not terms: continue
            dat = d.get('datums') or {}
            cd  = d.get('chart_datum')
            if cd and cd in dat and 'MSL' in dat:
                z0 = round((dat['MSL'] - dat[cd]) * 1000); dn = cd
            else:
                z0 = 0; dn = "MSL"; nodat += 1
            lines.append("R|%s|%s|%d|%s|%d|%s" %
                         (sid, "|".join(head), z0, dn, round(lost*1000), ",".join(terms)))
        elif d.get('type') == 'subordinate':
            o = d.get('offsets') or {}
            ref = o.get('reference','')
            ht = (o.get('height') or {}); tm = (o.get('time') or {})
            lines.append("S|%s|%s|%s|%s|%s|%s|%s|%s" %
                         (sid, "|".join(head), ref, ht.get('type',''),
                          ht.get('high',''), ht.get('low',''),
                          tm.get('high',''), tm.get('low','')))
    with open(out,"w") as fh:
        fh.write("# Bash Navigation Software tide station data\n")
        fh.write("# NOAA harmonics: public domain. TICON-4 harmonics: CC BY 4.0.\n")
        fh.write("# Assembled from https://github.com/neaps/tide-database (CC BY 4.0).\n")
        fh.write("\n".join(lines) + "\n")
    print("stations written: %d" % len(lines))
    print("constituents kept: %d, dropped as unsupported: %d" % (kept, dropped))
    print("reference stations with no datum (heights are above MSL): %d" % nodat)
    print("%s: %.2f MB" % (out, os.path.getsize(out)/1e6))
    #  The ports on chart datum, and the header that states the licences
    #  (board item B24).  A regenerated file is corrected the same way as the
    #  committed one, from src/tides/gen/corrections.dat.  This applies them
    #  to src/tides/stations.dat, so write there or copy the result there.
    import subprocess
    subprocess.check_call([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apply_corrections.py')])

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv)>1 else "/tmp/tdb/data/*/*.json",
         sys.argv[2] if len(sys.argv)>2 else "/home/claude/bashnav/src/tides/stations.dat",
         "/home/claude/bashnav/src/tides/tables.awk.index.json")

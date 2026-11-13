#!/bin/sh
# Verify the browser tides build against the awk engine.
#
# This is NOT part of tests/run-tests.sh.  That suite is POSIX sh and awk
# only, so it runs on the boat; this one needs node, python3 and a
# headless Chromium, so it runs on a development machine before a push.
#
#   sh docs/web/tests/run-tides-web.sh            a quick pass, 9 stations
#   sh docs/web/tests/run-tides-web.sh --full     615 stations x 4 dates
#
# What each stage proves:
#
#   1  the engine     every number the JS computes, against the number the
#                     awk computes, over thousands of station-days
#   2  the work       the six coastal calculators: work.js's working,
#                     line for line, against `tides work`, every figure
#                     read back against its geometry, and the lesson
#                     link.  Needs only node, so it runs before the
#                     browser stages and is never skipped
#   2b the promise    work.js is a shared engine: the members the course
#                     may call, and the three engine calls the pure
#                     calculators are allowed, both checked by running
#   3  the page       what the page SHOWS, against the awk tool's own
#                     output.  A module diff cannot catch a wiring fault,
#                     and the one that mattered -- predicting the UT day
#                     and labelling it in station time -- passed every
#                     module diff while the table was visibly wrong
#                     -- and the work view, opened by URL as the course
#                     links to it, against `tides work`
#   4  the moon       the drawn phase against the computed fraction
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
WORK=${TMPDIR:-/tmp}/tides-web-tests.$$
mkdir -p "$WORK"
trap 'rm -rf "$WORK"; [ -n "$SRV" ] && kill $SRV 2>/dev/null || true' EXIT

AWK=awk
for a in mawk gawk awk; do command -v "$a" >/dev/null 2>&1 && { AWK=$a; break; }; done

if [ "$1" = "--full" ]; then
  $AWK 'BEGIN{srand(20261019)} /^[RS]\|/{if(rand()<0.075) print $2}' FS='|' \
    src/tides/stations.dat > "$WORK/ids"
  DATES="2026-10-19,2026-02-28,2027-08-09,2024-02-29"
else
  printf '%s\n' \
    noaa/9455920 noaa/8443970 noaa/8452660 noaa/6835001 \
    ticon/crms0551-crms0551-usa-crms ticon/albany-62120-aus-bom \
    noaa/9454050 noaa/1610367 noaa/1613077 > "$WORK/ids"
  DATES="2026-10-19,2026-06-21,1999-12-31,2035-07-04"
fi
echo "stations: $(wc -l < "$WORK/ids" | tr -d ' ')   dates: $DATES   awk: $AWK"

echo
echo "1. the engine, against the awk"
#  The id list goes in a FILE, not a -v assignment: mawk mangles a -v value
#  a few kilobytes long and then reports a syntax error in an unrelated
#  source file, which is a confusing way to lose an hour.
$AWK -v FILE=src/tides/stations.dat -v IDFILE="$WORK/ids" -v DATES="$DATES" \
     -f src/tides/tables.awk -f src/tides/engine.awk -f docs/web/tests/tides-ref.awk \
     </dev/null > "$WORK/ref.tsv"
node docs/web/tests/tides-diff.js "$WORK/ref.tsv"

echo
echo "2. the work calculators, against the awk"
node docs/web/tests/tides-work.js "$AWK"

echo
echo "2b. work.js as a shared engine: the surface and the engine boundary"
#  The course embeds a copy of work.js to run worked examples inside a
#  lesson. This holds the two things it was promised -- the members it may
#  call, and that the five pure calculators need three trig functions and
#  nothing else -- by running them against an engine that answers only
#  those three. Needs only node, like stage 2.
node docs/web/tests/work-engine.js

#  Stages 3 and 4 drive a headless Chromium.  Playwright is not something
#  to make anyone install to check a tide table, so if it is absent they
#  are SKIPPED and said to be skipped -- not silently passed, and not
#  treated as a failure.  Stage 1 is the one that proves the physics.
#  PLAYWRIGHT INSTALLED IS NOT THE SAME AS A BROWSER INSTALLED.  Asking
#  only whether the module loads passed on a machine where `npm i` had
#  put the package there but `npx playwright install` had never been run,
#  and the stage then died with a stack trace instead of saying it was
#  skipped. The browser binary itself is what these stages need, so that
#  is what is checked.
if node -e 'var fs=require("fs");fs.accessSync(require("playwright").chromium.executablePath())' >/dev/null 2>&1; then
  echo
  echo "3. the page and the work view, against the awk tool's own output"
  python3 docs/web/tests/serve.py 8088 "$ROOT/docs/web" >/dev/null 2>&1 &
  SRV=$!
  sleep 1
  node docs/web/tests/tides-ui.js

  echo
  echo "4. the moon, against the computed fraction"
  node docs/web/tests/tides-moon.js

  echo
  echo "TIDES WEB: all stages passed"
else
  echo
  echo "3, 4. SKIPPED -- the browser stages need playwright:  npm i -D playwright && npx playwright install chromium"
  echo
  echo "TIDES WEB: the engine passed; the page and the moon were not checked"
fi

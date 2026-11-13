#!/bin/sh
# Verify the browser weather build against the awk tool.
#
# The weather output is PROSE. Every rule shows its working, and the
# working is the product -- so a port that gets the numbers right and the
# words approximately right has not ported it. Everything here is
# compared character for character against what the awk actually prints.
#
#   sh docs/web/tests/run-weather-web.sh
#
#   1  the reasoning   400 generated observation histories vs `weather what`
#   2  the score       300 generated logs vs `weather score`
#   3  the 500 mb      1,078 cases vs `weather chart`
#   4  valid times     every real day 2000-2040, both directions
#   5  the lessons     reconstructed from lessons.js, vs `weather learn`
#   6  the page        driven, including the rule that it must not tell
#                      before it asks
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
WORK=${TMPDIR:-/tmp}/weather-web-tests.$$
mkdir -p "$WORK"
trap 'rm -rf "$WORK"; [ -n "$SRV" ] && kill $SRV 2>/dev/null || true' EXIT

AWK=awk
for a in mawk gawk awk; do command -v "$a" >/dev/null 2>&1 && { AWK=$a; break; }; done
echo "awk: $AWK"

echo
echo "1. the reasoning, against \`weather what\`"
node docs/web/tests/weather-wx.js 400

echo
echo "2. the score, against \`weather score\`"
node docs/web/tests/weather-sc.js 300

echo
echo "3. the 500 millibar rules, against \`weather chart\`"
node docs/web/tests/weather-ch.js

echo
echo "4. valid times: every real day from 2000 to 2040"
#  weather-vt.awk is loaded FIRST and writes to a named file, because the
#  dispatch in screens.awk exits before a later file's BEGIN would run.
$AWK -v OUTF="$WORK/vt.tsv" -f docs/web/tests/weather-vt.awk \
     -f src/common/log.awk -f src/common/colour.awk \
     -f src/weather/grid.awk -f src/weather/wx.awk -f src/weather/score.awk \
     -f src/weather/chart.awk -f src/weather/teach.awk </dev/null >/dev/null 2>&1 || true
[ -s "$WORK/vt.tsv" ] || { echo "the valid-time dump is empty" >&2; exit 1; }
node -e '
const fs=require("fs"),path=require("path");
const W=path.resolve("docs/web");
global.LOG=require(path.join(W,"deck-log","log.js"));
global.WX=require(path.join(W,"weather","wx.js"));
const S=require(path.join(W,"weather","score.js"));
let bad=0,n=0,rtbad=null;
for(const L of fs.readFileSync(process.argv[1],"utf8").split("\n")){
  const f=L.split("\t");
  if(f[0]==="RTBAD"){ rtbad=+f[1]; continue; }
  if(f[0]!=="VT") continue;
  n++;
  const got=S.validTime(f[1], +f[2]);
  if(got!==f[3]){ bad++; if(bad<=6) console.log("  FAIL "+f[1]+" +"+f[2]+"h: JS "+got+"  awk "+f[3]); }
}
console.log("  jdn/civil round-trip: "+(rtbad===0?"every real day exact":rtbad+" FAILURES"));
console.log("  "+n+" valid-time conversions: "+(bad? bad+" DISAGREEMENTS":"identical to the awk"));
process.exit(bad||rtbad?1:0);
' "$WORK/vt.tsv"

echo
echo "5. the lessons, against \`weather learn\`"
node docs/web/tests/weather-les.js

#  PLAYWRIGHT INSTALLED IS NOT THE SAME AS A BROWSER INSTALLED.  Asking
#  only whether the module loads passed on a machine where `npm i` had
#  put the package there but `npx playwright install` had never been run,
#  and the stage then died with a stack trace instead of saying it was
#  skipped. The browser binary itself is what these stages need, so that
#  is what is checked.
if node -e 'var fs=require("fs");fs.accessSync(require("playwright").chromium.executablePath())' >/dev/null 2>&1; then
  echo
  echo "6. the page, end to end"
  python3 docs/web/tests/serve.py 8090 "$ROOT/docs/web" >/dev/null 2>&1 &
  SRV=$!
  sleep 1
  node docs/web/tests/weather-ui.js

  echo
  echo "7. the gunnery demonstration, against the physics it teaches"
  #  The demonstration is the one place in weather where a reader is shown
  #  a number rather than told one, so a wrong number there is taught with
  #  more conviction than prose could manage. Each of the lesson's three
  #  claims is checked against an independent computation of
  #  2*Omega*v*sin(phi) - bearing-independent, zero on the equator,
  #  reversing with hemisphere - and the drawing is checked to put the fall
  #  on the side the words say.
  node docs/web/tests/weather-gun.js
  echo
  echo "8. the wind demonstration, against the physics it teaches"
  #  The second demonstration, and the one whose science was checked
  #  BEFORE it was built: the version first described had the wind
  #  crossing the isobars less as the pressure gradient rose, which is the
  #  intuitive answer and the wrong one. So the check asserts the angle
  #  does NOT move with the gradient, that latitude is what moves it, that
  #  curvature moves the SPEED instead - below geostrophic round a low,
  #  above it round a high - and that a high past f*f*R = 4G draws nothing
  #  rather than nonsense. Every arrow's angle to its own isobar is
  #  measured off the drawing and compared with the stated one.
  node docs/web/tests/weather-wind.js
  echo
  echo "WEATHER WEB: all stages passed"
else
  echo
  echo "6. SKIPPED -- the page stage needs playwright:  npm i -D playwright && npx playwright install chromium"
  echo
  echo "WEATHER WEB: the reasoning, score, chart, times and lessons passed;"
  echo "             the page was not driven"
fi

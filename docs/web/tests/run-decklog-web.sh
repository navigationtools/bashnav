#!/bin/sh
# Verify the browser deck-log build against the awk tool.
#
# The log is append-only and SHARED with the awk build: the same file,
# byte for byte, not two formats that look alike. A record one tool
# writes that the other cannot read is permanent damage, discovered
# months later by something trying to read it. So the record layer is
# checked in BOTH directions before anything else.
#
#   sh docs/web/tests/run-decklog-web.sh
#
#   1  the record layer   awk writes, JS reads; JS writes, awk reads;
#                         byte for byte, including a note containing | and
#                         = and a newline, and truncation at every offset
#   2  the derived views  holdings and open defects over generated logs
#   3  plausibility       the limits AND the wording, over the whole range
#   4  the merge          commutative, idempotent, lossless, conflicts kept
#   5  the page           a real entry made through the UI, exported, and
#                         read back by the awk tool
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
WORK=${TMPDIR:-/tmp}/decklog-web-tests.$$
mkdir -p "$WORK"
trap 'rm -rf "$WORK"; [ -n "$SRV" ] && kill $SRV 2>/dev/null || true' EXIT

AWK=awk
for a in mawk gawk awk; do command -v "$a" >/dev/null 2>&1 && { AWK=$a; break; }; done
ENG="-f $ROOT/src/common/log.awk -f $ROOT/src/common/colour.awk \
     -f $ROOT/src/decklog/views.awk -f $ROOT/src/decklog/screens.awk"
echo "awk: $AWK"

echo
echo "1. the record layer, both directions"
$AWK -f src/common/log.awk -f docs/web/tests/decklog-rt.awk </dev/null > "$WORK/rt.tsv"
node docs/web/tests/decklog-rt.js "$WORK/rt.tsv"

echo
echo "2. the derived views, over generated logs"
for seed in 3 11 77 404 5150 90210 123456; do
  rm -f "$WORK/g.log"
  $AWK -v SEED=$seed -v DAYS=120 -v LOGFILE="$WORK/g.log" \
       -f src/common/log.awk -f src/decklog/views.awk -f docs/web/tests/decklog-views.awk \
       </dev/null > "$WORK/g.ref"
  printf "  seed %-7s " $seed
  node docs/web/tests/decklog-views.js "$WORK/g.log" "$WORK/g.ref"
done
#  A liveaboard decade is on the order of 100,000 records, and the
#  holdings replay the whole log.
rm -f "$WORK/big.log"
$AWK -v SEED=1 -v DAYS=12500 -v LOGFILE="$WORK/big.log" \
     -f src/common/log.awk -f src/decklog/views.awk -f docs/web/tests/decklog-views.awk \
     </dev/null > "$WORK/big.ref"
printf "  100k    "
node docs/web/tests/decklog-views.js "$WORK/big.log" "$WORK/big.ref"

echo
echo "3. plausibility: the limits and the wording"
#  decklog-imp.awk is loaded FIRST and writes to a named file, because
#  screens.awk carries the tool's own dispatch in a BEGIN block that
#  exits before a later file's BEGIN would ever run.
$AWK -v OUTF="$WORK/imp.tsv" -f docs/web/tests/decklog-imp.awk $ENG </dev/null >/dev/null 2>&1 || true
node -e '
const fs=require("fs"),path=require("path");
const W=path.resolve("docs/web/deck-log");
global.LOG=require(path.join(W,"log.js"));
const V=require(path.join(W,"views.js"));
let bad=0,n=0;
for(const L of fs.readFileSync(process.argv[1],"utf8").split("\n")){
  const f=L.split("\t"); if(f[0]!=="I") continue;
  n++;
  const got=V.implausible(f[1],f[2]), want=f.slice(3).join("\t");
  if(got!==want){ bad++; if(bad<=10) console.log("  FAIL "+f[1]+" "+JSON.stringify(f[2])+": JS "+JSON.stringify(got)+"  awk "+JSON.stringify(want)); }
}
console.log("  "+n+" cases: "+(bad? bad+" DISAGREEMENTS" : "the limits and the wording match exactly"));
process.exit(bad?1:0);
' "$WORK/imp.tsv"

echo
echo "4. the merge"
node docs/web/tests/decklog-merge.js

#  PLAYWRIGHT INSTALLED IS NOT THE SAME AS A BROWSER INSTALLED.  Asking
#  only whether the module loads passed on a machine where `npm i` had
#  put the package there but `npx playwright install` had never been run,
#  and the stage then died with a stack trace instead of saying it was
#  skipped. The browser binary itself is what these stages need, so that
#  is what is checked.
if node -e 'var fs=require("fs");fs.accessSync(require("playwright").chromium.executablePath())' >/dev/null 2>&1; then
  echo
  echo "5. the page, end to end"
  python3 docs/web/tests/serve.py 8089 "$ROOT/docs/web" >/dev/null 2>&1 &
  SRV=$!
  sleep 1
  node docs/web/tests/decklog-ui.js
  echo
  echo "DECK-LOG WEB: all stages passed"
else
  echo
  echo "5. SKIPPED -- the page stage needs playwright:  npm i -D playwright && npx playwright install chromium"
  echo
  echo "DECK-LOG WEB: the record layer, views, plausibility and merge passed;"
  echo "              the page was not driven"
fi

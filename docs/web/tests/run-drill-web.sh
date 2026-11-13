#!/bin/sh
# Verify the drill app.
#
#   sh docs/web/tests/run-drill-web.sh              against a synthetic pack
#   sh docs/web/tests/run-drill-web.sh <pack.json>  against a real one
#
# The harness builds its own synthetic pack, so this test carries no
# material of anybody's -- which matters, because it lives in a public
# repository and the whole point of the app is that the material does
# not.
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
trap '[ -n "$SRV" ] && kill $SRV 2>/dev/null || true' EXIT

# ---- checks that need no browser, so they run everywhere ------------
# THE BUILD NUMBER AND THE CACHE VERSION MUST AGREE.  The worker is
# cache-first, so an installed copy keeps serving the drill.js it cached
# and a browser only reinstalls the worker when sw.js changes -- ship one
# without the other and the fix reaches nobody who has used the tool.
#
# This check already existed inside the browser suite, which meant it did
# not run on a machine without playwright. It then missed exactly what it
# was for: a drill.js that failed to reach the repository was committed
# alongside a bumped sw.js, and the published pair said build 4 and
# drill-v5. Two lines of grep would have caught it on any machine, so now
# they do.
B=$(sed -n "s/.*BUILD *= *'\([0-9][0-9]*\).*/\1/p" docs/web/drill/drill.js | head -1)
C=$(sed -n "s/.*CACHE *= *'drill-v\([0-9][0-9]*\)'.*/\1/p" docs/web/drill/sw.js | head -1)
if [ -z "$B" ] || [ -z "$C" ]; then
  echo "FAIL -- cannot read BUILD from drill.js or CACHE from sw.js"
  exit 1
fi
if [ "$B" != "$C" ]; then
  echo "FAIL -- drill.js is build $B but sw.js caches drill-v$C."
  echo "        An installed copy would keep serving the old app."
  exit 1
fi
echo "  ok   drill.js build $B and sw.js cache drill-v$C agree"

#  PLAYWRIGHT INSTALLED IS NOT THE SAME AS A BROWSER INSTALLED.  Asking
#  only whether the module loads passed on a machine where `npm i` had
#  put the package there but `npx playwright install` had never been run,
#  and the stage then died with a stack trace instead of saying it was
#  skipped. The browser binary itself is what these stages need, so that
#  is what is checked.
if ! node -e 'var fs=require("fs");fs.accessSync(require("playwright").chromium.executablePath())' >/dev/null 2>&1; then
  echo "SKIPPED -- the rest of the drill suite is a browser test and needs playwright:"
  echo "          npm i -D playwright && npx playwright install chromium"
  exit 0
fi

python3 docs/web/tests/serve.py 8091 "$ROOT/docs/web" >/dev/null 2>&1 &
SRV=$!
sleep 1
node docs/web/tests/drill-ui.js "$@"
echo
echo "DRILL WEB: all checks passed"

#!/bin/sh
# Verify the site's pictures are still what the browser apps draw.
#
#   sh docs/web/tests/run-figures-web.sh
#
# The pictures on the front page are the apps' OWN SVG, captured out of
# the running page by docs/web/gen/make-app-figures.sh. Like everything
# else here it needs node, python3 and a headless Chromium, so it is not
# part of tests/run-tests.sh - that suite checks the committed files and
# asserts Rule 27(f) in the day-shape figure, with no browser.
#
# This is the regenerate-and-compare half: capture again and diff against
# what is committed, so a change to any app's drawing shows up as a
# changed picture rather than as a page that has quietly stopped matching
# the app it is advertising.
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"

#  PLAYWRIGHT INSTALLED IS NOT THE SAME AS A BROWSER INSTALLED.  Asking
#  only whether the module loads passed on a machine where `npm i` had
#  put the package there but `npx playwright install` had never been run,
#  and the stage then died with a stack trace instead of saying it was
#  skipped. The browser binary itself is what these stages need, so that
#  is what is checked.
if ! node -e 'var fs=require("fs");fs.accessSync(require("playwright").chromium.executablePath())' >/dev/null 2>&1; then
  echo "SKIPPED -- the figure capture needs playwright:  npm i -D playwright && npx playwright install chromium"
  exit 0
fi
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "SKIPPED -- comparing the figures needs a git checkout"
  exit 0
fi

sh docs/web/gen/make-app-figures.sh

#  ---- what counts as "changed" ------------------------------------
#  make-app-figures.sh has already put back any picture that differs only
#  by font antialiasing - see docs/web/gen/figures-putback.sh for why a
#  screenshot is not byte-stable and what the thresholds are. So anything
#  still different here is a real difference, and the loop below only
#  measures it so the report says how big it is.
#
#  An SVG is the app's own drawing serialised and is byte-stable: any
#  difference in one is real.
NOISE_PX=400          # out of a million-odd: 0.04 per cent
NOISE_DELTA=24        # one channel, out of 255

changed=$(git diff --name-only -- docs/img/app)
real=
for f in $changed; do
  case "$f" in
    *.png)
      git show "HEAD:$f" > "$f.committed.png" 2>/dev/null || { real="$real $f"; continue; }
      d=$(node docs/web/tests/figures-diff.js "$f.committed.png" "$f")
      rm -f "$f.committed.png"
      set -- $d
      if [ "$1" = differ ] && [ "$2" -le "$NOISE_PX" ] && [ "$4" -le "$NOISE_DELTA" ]; then
        printf '  %-34s %s of %s pixels differ, max %s - antialiasing, put back\n' "$f" "$2" "$3" "$4"
        git checkout -- "$f"
      else
        printf '  %-34s %s\n' "$f" "$d"
        real="$real $f"
      fi
      ;;
    *) real="$real $f" ;;
  esac
done

if [ -z "$real" ]; then
  echo
  echo "FIGURES: every picture is what the apps draw"
else
  echo
  echo "  these pictures are no longer what the apps draw:"
  for f in $real; do printf '    %s\n' "$f"; done
  echo "  (if the change is intended, commit them; if not, the app changed"
  echo "   under you and the page is advertising something else)"
  exit 1
fi

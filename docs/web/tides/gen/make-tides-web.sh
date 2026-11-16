#!/bin/sh
# Regenerate everything under docs/web/tides/ that is derived from src/tides/.
#
#   tables.js     the UTide constituent tables, DUMPED from the awk engine's
#                 own runtime strings -- never retyped
#   stations.dat  a byte-identical copy, because a service worker can only
#                 serve what is inside its own scope and the whole point of
#                 this build is that it works with the antenna down
#   stations.idx  the search index, with byte offsets into stations.dat
#
# Run from the repository root:  sh docs/web/tides/gen/make-tides-web.sh
set -e
#  FOUR LEVELS, NOT THREE.  These live at docs/web/<tool>/gen/, so
#  ../../.. is docs/ and not the repository root.  It was three for as
#  long as the build lived at web/<tool>/gen/, and after the move to
#  docs/ the wrong ROOT and the un-updated "$ROOT/web/..." paths
#  cancelled each other out exactly -- so this script kept working
#  while both halves of it were wrong.  Correcting one alone breaks it.
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
SRC="$ROOT/src/tides"
WEB="$ROOT/docs/web/tides"

AWK=awk
for a in mawk gawk awk; do
  if command -v "$a" >/dev/null 2>&1; then AWK=$a; break; fi
done

echo "awk:      $AWK"
"$AWK" -f "$SRC/tables.awk" -f "$ROOT/docs/web/tides/gen/dumptab.awk" </dev/null > "$WEB/tables.js"
echo "tables.js $(wc -c < "$WEB/tables.js" | tr -d ' ') bytes"

cp "$SRC/stations.dat" "$WEB/stations.dat"
if cmp -s "$SRC/stations.dat" "$WEB/stations.dat"; then
  echo "stations.dat copied, byte-identical to src"
else
  echo "stations.dat COPY DIFFERS FROM SRC" >&2; exit 1
fi
#  the high-water levels a charted clearance is measured above
cp "$SRC/levels.dat" "$WEB/levels.dat"
cmp -s "$SRC/levels.dat" "$WEB/levels.dat" || { echo "levels.dat COPY DIFFERS FROM SRC" >&2; exit 1; }
echo "levels.dat copied, byte-identical to src"

python3 "$ROOT/docs/web/tides/gen/mkindex.py"
echo "done"

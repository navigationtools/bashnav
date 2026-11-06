#!/bin/sh
#  THE COUNTS IN THE PROSE MUST COME FROM THE ENGINE.
#
#  The site and the README said colregs covers "22 vessel types" and, two
#  hundred lines further down, "twenty vessel types" and "Fourteen
#  scenarios". The engine has had NVES=28 and NENC=28 for some time. None
#  of the three was a disagreement about the rules -- they were counts
#  typed by hand that stopped being retyped, in the two documents a new
#  reader meets first.
#
#  This is the same fault as make-site.sh naming engine versions by hand,
#  and it has the same rule: A NUMBER THAT DESCRIBES THE CODE IS DERIVED
#  FROM THE CODE, NEVER TYPED TWICE. Where prose must carry the figure,
#  something has to compare the two, because nothing else will.
#
#  Only the counts that can be derived are checked. "Fifteen lessons on
#  the rules" is not here because the engine does not expose a lesson
#  count to compare it with; if one is added, add it here.
#
#  Read-only. Exits non-zero with the file, the line and both numbers.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

ENG=src/colregs/engine.awk
NVES=$(sed -n 's/.*NVES=\([0-9][0-9]*\).*/\1/p' "$ENG" | head -1)
NENC=$(sed -n 's/.*NENC=\([0-9][0-9]*\).*/\1/p' "$ENG" | head -1)

[ -n "$NVES" ] || { echo "COUNTS: no NVES in $ENG"; exit 1; }
[ -n "$NENC" ] || { echo "COUNTS: no NENC in $ENG"; exit 1; }

bad=0

#  Every "<n> vessel types" and "<n> scenarios" in the two documents a
#  reader meets first, plus the generated page so a stale build is caught
#  as well as a stale template.
for f in README.md docs/site-template.html docs/index.html; do
  [ -f "$f" ] || continue

  grep -n '[0-9][0-9]* vessel types' "$f" | while IFS= read -r line; do
    n=$(printf '%s\n' "$line" | sed -n 's/.*[^0-9]\([0-9][0-9]*\) vessel types.*/\1/p')
    [ "$n" = "$NVES" ] || {
      echo "    $f:${line%%:*} says $n vessel types, engine has NVES=$NVES"
      echo BADCOUNT >> "$ROOT/.counts.tmp"; }
  done

  grep -n '[0-9][0-9]* \(encounter \)\?scenarios' "$f" | while IFS= read -r line; do
    n=$(printf '%s\n' "$line" | sed -n 's/.*[^0-9]\([0-9][0-9]*\) \(encounter \)\?scenarios.*/\1/p')
    [ "$n" = "$NENC" ] || {
      echo "    $f:${line%%:*} says $n scenarios, engine has NENC=$NENC"
      echo BADCOUNT >> "$ROOT/.counts.tmp"; }
  done

  #  A count written as a word cannot be compared, so it is refused
  #  outright: that is how "twenty vessel types" survived beside "22".
  grep -n -i '\(twenty\|thirty\|forty\|fourteen\|fifteen\|sixteen\|eighteen\) \(vessel\|scenario\)' "$f" \
    && { echo "    ^ a count written as a word cannot be checked -- use digits"
         echo BADCOUNT >> "$ROOT/.counts.tmp"; }
done

if [ -f "$ROOT/.counts.tmp" ]; then
  bad=$(wc -l < "$ROOT/.counts.tmp" | tr -d ' ')
  rm -f "$ROOT/.counts.tmp"
fi

printf 'COUNTS %d\n' "${bad:-0}"
[ "${bad:-0}" = 0 ]

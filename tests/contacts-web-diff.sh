#!/bin/sh
# Diff the browser contacts against the shell contacts, function by
# function -- the same check colregs-web-diff.sh runs, for the module
# that was until now shell-only.
#
# WHY A DIFF AND NOT A READING. The first version of the port was read
# twice and looked right. The diff failed on the second group of lines:
# ct_yd inserts thousands separators AND rounds to the nearest hundred
# yards, because a tracking party reports a range that way and the
# function is handed computed ranges -- ct_rng, the CPA, the Ekelund
# estimate -- not round numbers. The port had the commas and not the
# rounding, so every range in the browser would have read as a yard
# rather than a hundred.
#
# What it covers, over each function's whole useful range:
#
#   nrm360, sgn180   -360 to 720
#   rbrg             every integer component pair in a 11 x 11 box
#   xsrand / xrand   40 seeds x 6 draws -- a Park-Miller sequence that
#                    disagrees by one step diverges completely, so this
#                    is what makes the SEEDED exercises diffable at all
#   ct_yd            powers of seven, so the rounding is exercised
#   ek_across        5 speeds x 12 courses x 8 bearings
#   ek_gen           60 seeds, every field of the generated leg pair
#   ct_gen           60 seeds, every field of the generated contact
#   ct_brg, ct_rng   5 observations on each of 20 generated contacts
#
# Run from the repository root:  sh tests/contacts-web-diff.sh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "SKIPPED -- the cross-implementation diff needs node"
  exit 0
fi

#  EVERY AWK ON THE MACHINE, NOT THE FIRST ONE FOUND.
#
#  This picked one awk, mawk-first, and compared it with node. On 23
#  October 2026 it passed on every machine I had and failed on Larry's
#  Mac, because macOS's /usr/bin/awk is one-true-awk and it alone
#  normalised a negative zero away -- so a bearing rate that rounds to
#  zero from below printed with the wrong sign, under a legend that
#  says what the sign means. One awk agreeing with node says nothing
#  about the others, which is the same reason CLAUDE.md says a gawk-only
#  run proves nothing.
AWKS=
for a in mawk gawk awk original-awk busybox; do
  command -v "$a" >/dev/null 2>&1 || continue
  [ "$a" = busybox ] && { busybox awk '' >/dev/null 2>&1 || continue; }
  AWKS="$AWKS $a"
done
[ -n "$AWKS" ] || AWKS=awk
TMP=${TMPDIR:-/tmp}/contacts-diff.$$
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

# all three, because mawk refuses a function it has not seen and the
# engine calls into review.awk. The same reason colregs-web-diff.sh
# loads all three, and the reason this is written mawk-first: a run
# under gawk hides it.
node tests/contacts-web-dump.js docs/web/colregs/contacts.js > "$TMP/js.out"
b=$(wc -l < "$TMP/js.out" | tr -d ' ')
rc=0; n=0

for A in $AWKS; do
  n=$((n+1))
  # all three files, because mawk refuses a function it has not seen and
  # the engine calls into review.awk -- the reason this is written
  # mawk-first: a run under gawk hides it.
  $A -f src/colregs/engine.awk -f src/common/bearing.awk -f src/colregs/contacts.awk -f src/colregs/review.awk \
     -f tests/contacts-web-dump.awk -v cmode=plain </dev/null > "$TMP/awk.out" 2>"$TMP/err" || {
       echo "FAIL -- $A could not run the contacts dump:"; head -3 "$TMP/err"; rc=1; continue; }
  a=$(wc -l < "$TMP/awk.out" | tr -d ' ')
  if [ "$a" != "$b" ]; then
    echo "FAIL -- $A and the browser dump different numbers of lines: $a and $b"
    rc=1; continue
  fi
  if ! diff "$TMP/awk.out" "$TMP/js.out" > "$TMP/d" 2>&1; then
    echo "FAIL -- the browser and $A disagree about contacts:"
    head -10 "$TMP/d"
    echo "        $(grep -c '^[<>]' "$TMP/d") differing lines"
    rc=1
  fi
done

[ "$rc" = 0 ] && echo "  ok    the browser and shell contacts agree ($b comparisons x $n awk:$AWKS)"
exit $rc

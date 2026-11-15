#!/bin/sh
# Diff the web colregs against the shell colregs, function by function.
#
# The web README says the geometry is "ported function-for-function, with
# the same names, so the awk and the JS can be read side by side", and
# that they are "also diffed: both implementations are run over all 361
# integer bearings and the output compared."
#
# THAT CHECK WAS NOT IN THE REPOSITORY. Nothing ran it, and the first time
# it was run -- 22 October 2026 -- it found aspect_words had its own arc
# boundaries in the JS (8, 75, 105, 172) where the awk delegates to
# rel_phrase with ahead=2.5. The two told the reader different things
# about the same geometry, on 580 of the 361 aspects, for as long as the
# web build has existed.
#
# So this is the check the README describes, written down. It compares
# every function the two share, over its whole input range, as strings:
#
#   rel_phrase   360 bearings x 2 possessives
#   aspect_words 361 aspects
#   arc_vis      6 arc types x 361 bearings
#
# Run from the repository root:  sh tests/colregs-web-diff.sh
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
TMP=${TMPDIR:-/tmp}/colregs-diff.$$
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

node tests/colregs-web-dump.js docs/web/colregs/colregs.js > "$TMP/js.out"
b=$(wc -l < "$TMP/js.out" | tr -d ' ')
rc=0; n=0

for A in $AWKS; do
  n=$((n+1))
  #  busybox is one program with many applets: its awk is "busybox awk",
  #  and "busybox -f" asks for an applet called -f.  So the name in the
  #  list is not always the command to run.
  case "$A" in busybox) RUN="busybox awk" ;; *) RUN=$A ;; esac
  $RUN -f src/colregs/engine.awk -f src/common/bearing.awk -f src/colregs/contacts.awk -f src/colregs/review.awk \
     -f tests/colregs-web-dump.awk </dev/null > "$TMP/awk.out" 2>"$TMP/err" || {
       echo "FAIL -- $A could not run the colregs dump:"; head -3 "$TMP/err"; rc=1; continue; }
  a=$(wc -l < "$TMP/awk.out" | tr -d ' ')
  if [ "$a" != "$b" ]; then
    echo "FAIL -- $A and the browser dump different numbers of lines: $a and $b"
    rc=1; continue
  fi
  if ! diff "$TMP/awk.out" "$TMP/js.out" > "$TMP/d" 2>&1; then
    echo "FAIL -- the browser and $A disagree:"
    head -10 "$TMP/d"
    echo "        $(grep -c '^[<>]' "$TMP/d") differing lines"
    rc=1
  fi
done

[ "$rc" = 0 ] && echo "  ok    the web and shell implementations agree ($b comparisons x $n awk:$AWKS)"
exit $rc

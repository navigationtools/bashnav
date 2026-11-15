#!/bin/sh
# Regenerate docs/web/colregs/data.js from src/colregs/engine.awk.
#
# THE README PROMISED THIS AND IT WAS NOT HERE. data.js says "regenerate
# with work/dump.awk and work/mkdata.py" and there is no work/ in the
# repository -- deck-log, weather and tides all carry their gen/ and
# colregs' was lost. So the one thing the file claims, that the web build
# and the shell build cannot drift, was not true: on 22 October 2026 the
# shell gained a wind field and a vessel-kind field on the encounters and
# the browser could not see either of them, and there was no path to bring
# them across but typing.
#
# The tables are CODE, not data: ves_init() and the rest build their rows
# at run time from ar() calls and shared constants, so this runs the
# initialisers and prints what they actually built. The lessons are
# printed by les(), so they are captured from a real run.
#
# Run from anywhere:  sh docs/web/colregs/gen/make-colregs-web.sh
set -e
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
SRC="$ROOT/src/colregs"
GEN="$ROOT/docs/web/colregs/gen"
#  the shared JS/JSON escaper, loaded before every dumper. Each of these
#  files used to carry its own copy, and all of them were wrong the same
#  way - see the note at the top of it.
ESC="$ROOT/docs/web/gen/jsonesc.awk"
OUT="$ROOT/docs/web/colregs/data.js"
COUT="$ROOT/docs/web/colregs/contacts-lessons.js"

AWK=awk
for a in mawk gawk awk; do command -v "$a" >/dev/null 2>&1 && { AWK=$a; break; }; done

#  THE TOOL LOADS ALL THREE, SO MUST THIS. engine.awk calls into
#  contacts.awk and review.awk, and mawk refuses a call to a function it
#  cannot see -- which is the right behaviour and the reason the tests
#  carry the same note.  src/common/bearing.awk (rbrg, sgn180) goes
#  between the engine and contacts.awk, as build.sh packs it (B13).
ENG="-f $SRC/engine.awk -f $ROOT/src/common/bearing.awk -f $SRC/contacts.awk -f $SRC/review.awk"

VER=$(sed -n 's/^COLREGS_VERSION=//p' "$SRC/10-head.sh" | head -1)
[ -n "$VER" ] || { echo "make-colregs-web: cannot read COLREGS_VERSION" >&2; exit 1; }

{
  echo "// colregs data -- generated from bin/colregs v$VER by running the awk"
  echo "// engine's own table initialisers and dumping what they built.  Do not"
  echo "// hand-edit: regenerate with docs/web/colregs/gen/make-colregs-web.sh so"
  echo "// the two cannot drift."
  echo "window.COLREGS_DATA = {"
  printf ' "version": "%s",\n' "$VER"
  $AWK $ENG -f "$ESC" -f "$GEN/dumptables.awk" </dev/null
  echo ' "lessons": ['
  n=0
  for L in L1 L2 L3 L4 L5 L6 L7 L8 L9 L10 L11 L12 L13 L14 L15; do
    n=$((n+1))
    meta=$($AWK $ENG -v cmode=plain -v cmd=lessonmeta -v les_id="$L" </dev/null)
    ans=${meta%%	*}
    why=${meta#*	}
    $AWK $ENG -v cmode=plain -v cmd=lesson -v les_id="$L" </dev/null \
      | $AWK -f "$ESC" -f "$GEN/dumplesson.awk" -v id="$L" -v ans="$ans" -v why="$why"
    [ "$n" -lt 15 ] && echo "," || echo ""
  done
  echo ' ]'
  echo "};"
} > "$OUT.new"

mv "$OUT.new" "$OUT"
echo "make-colregs-web: wrote $OUT"

#  ---------------------------------------------------------------------
#  The seven contacts lessons, into their own file.
#
#  Separate from data.js because the contacts screens are a separate
#  bundle in the browser and most visitors never open them, and separate
#  from hand-written JS because it WAS hand-written for a day and carried
#  the terminal's underline rule into the page. The figures cross as
#  parameters: see the long note in dumpclesson.awk.
#  ---------------------------------------------------------------------
{
  echo "// the seven contacts lessons -- generated from bin/colregs v$VER by"
  echo "// running the awk's own ct_lesson() and dumping what it printed. The"
  echo "// figures are the parameters ct_plot() and ct_rose() were called with,"
  echo "// not a picture of the character grid: the browser draws SVG from the"
  echo "// same numbers. Do not hand-edit: regenerate with"
  echo "// docs/web/colregs/gen/make-colregs-web.sh so the two cannot drift."
  echo "window.CONTACTS_LESSONS = ["
  n=0
  for L in C1 C2 C3 C4 C5 C6 C7; do
    n=$((n+1))
    $AWK $ENG -v cmode=plain -v cmd=clesson -v les_id="$L" -v FIGDUMP=1 </dev/null \
      | $AWK -f "$ESC" -f "$GEN/dumpclesson.awk" -v id="$L"
    [ "$n" -lt 7 ] && echo "," || echo ""
  done
  echo "];"
} > "$COUT.new"

mv "$COUT.new" "$COUT"
echo "make-colregs-web: wrote $COUT"

#  ---------------------------------------------------------------------
#  The contacts reference card.
#
#  ONE VARIANT PER REPORTING STYLE, because the card prints an example
#  report and the example reads differently under each of the five --
#  "Red 20", "Port 20", "340 relative", "fine on the port bow", or
#  nothing at all. Generating one variant and substituting in the
#  browser would be a second place for the wording to live; generating
#  all five is a few more lines of data that cannot drift.
#  ---------------------------------------------------------------------
{
  echo "// the contacts reference card -- generated from bin/colregs v$VER by"
  echo "// running ct_ref() once per reporting style and capturing what it"
  echo "// printed. The card names a relative bearing, and which words it uses"
  echo "// is the reader's setting, so there is a variant for each. Do not"
  echo "// hand-edit: regenerate with docs/web/colregs/gen/make-colregs-web.sh."
  echo "window.CONTACTS_CARD = {"
  n=0
  for ST in rn usn rel360 words none; do
    n=$((n+1))
    printf ' "%s": "' "$ST"
    #  dumpcard.awk, not an inline program: it needs js_dq_raw() from
    #  $ESC, and `-f file` and an inline program do not mix - awk reads
    #  the inline text as a DATA FILE and runs nothing from it.
    $AWK $ENG -v cmode=plain -v rstyle="$ST" -v cmd=cref </dev/null \
      | $AWK -f "$ESC" -f "$GEN/dumpcard.awk"
    [ "$n" -lt 5 ] && echo '",' || echo '"'
  done
  echo "};"
} > "$ROOT/docs/web/colregs/contacts-card.js.new"
mv "$ROOT/docs/web/colregs/contacts-card.js.new" "$ROOT/docs/web/colregs/contacts-card.js"
echo "make-colregs-web: wrote $ROOT/docs/web/colregs/contacts-card.js"

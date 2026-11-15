#!/bin/sh
#  A REVIEWER'S JUDGEMENT MUST SURVIVE HIM WALKING AWAY FROM THE PROMPT.
#
#  Larry marked three claims in the mot section -- two wrong, one with a
#  comment -- and none of the three reached review.tsv. The file's last
#  write was hours earlier, at the end of the encounter section. His own
#  guess was right: "I ctrl-c out of the last session, that might me it."
#
#  The sequence: he presses f, rv_ask_note's `read` blocks, he presses
#  ctrl-c to get his shell back so he can copy the screen into a chat,
#  and SIGINT kills the script before rv_save on the same line runs.
#
#  Three things are asserted here, each of which was broken:
#
#    1  the verdict is on disk before the note is asked for, so SIGINT
#       at the note prompt costs the note and not the judgement;
#    2  a note written afterwards supersedes the bare verdict row, so
#       the report carries the reviewer's words;
#    3  [return] advances. rv_next returns the first claim with no row,
#       and skipping writes no row, so "carry on from where I left off"
#       re-offered the same claim for ever.
cd "$(dirname "$0")/.." || exit 1
SHL=${1:-sh}
AWKB=${2:-awk}
T=${TMPDIR:-/tmp}/rvdur.$$
rm -rf "$T"; mkdir -p "$T" || exit 1
bad=0
fail(){ printf 'FAIL  %s\n' "$1"; bad=$((bad+1)); }

# ---- 1  the verdict survives SIGINT at the note prompt --------------
#  A fifo held open by a sleeping writer, so `read` genuinely BLOCKS the
#  way it does at a terminal. A plain pipe reaches EOF instead, `read`
#  returns failure, rv_save runs, and the bug does not reproduce.
F="$T/fifo"
mkfifo "$F" 2>/dev/null || { echo "SKIP  no fifo here"; exit 0; }
H="$T/h1"; mkdir -p "$H"
sleep 20 > "$F" &
holder=$!
COLREGS_HOME="$H" COLREGS_AWK="$AWKB" $SHL ./bin/colregs review < "$F" > "$T/out1" 2>&1 &
p=$!
sleep 1
printf '3\nf\n' > "$F"
sleep 2
kill -INT $p 2>/dev/null
sleep 1
kill $p $holder 2>/dev/null
wait 2>/dev/null
#  The keys name the vessel and the bearing now, so the first key of the
#  section is asked for rather than written in. A test that hard-codes a
#  key starts failing for the wrong reason the moment the table changes,
#  which is the very thing the new key format exists to prevent.
K1=$($AWKB -f src/colregs/engine.awk -f src/common/bearing.awk -f src/colregs/contacts.awk \
       -f src/colregs/review.awk -v cmode=plain -v cmd=rvkeys -v which=mot \
       </dev/null | sed -n 1p)
K2=$($AWKB -f src/colregs/engine.awk -f src/common/bearing.awk -f src/colregs/contacts.awk \
       -f src/colregs/review.awk -v cmode=plain -v cmd=rvkeys -v which=mot \
       </dev/null | sed -n 4p)
if [ ! -s "$H/review.tsv" ]; then
  fail "a verdict is lost if the reviewer interrupts at the note prompt"
else
  grep -q "^$K1	flag" "$H/review.tsv" || fail "the verdict saved is not the one given"
fi

# ---- 2  a note supersedes the bare verdict row ----------------------
H2="$T/h2"; mkdir -p "$H2"
printf '3\nf\nthe answer never says not under command\nq\nx\n' \
  | COLREGS_HOME="$H2" COLREGS_AWK="$AWKB" $SHL ./bin/colregs review > "$T/out2" 2>&1
r=$($AWKB -f src/colregs/engine.awk -f src/common/bearing.awk -f src/colregs/contacts.awk -f src/colregs/review.awk \
      -v cmode=plain -v cmd=rvreport -v rfile="$H2/review.tsv" -v rvver=t </dev/null)
case $r in
  *"never says not under command"*) : ;;
  *) fail "the note does not reach the report" ;;
esac
n=$(printf '%s\n' "$r" | grep -c -- "^- \*\*$K1\*\*")
[ "$n" = 1 ] || fail "$K1 appears $n times in the report, want 1"

# ---- 3  [return] advances instead of re-offering the same claim -----
H3="$T/h3"; mkdir -p "$H3"
i=0; while [ $i -lt 28 ]; do printf 'enc-%d\tok\t\n' "$i" >> "$H3/review.tsv"; i=$((i+1)); done
printf '1\n\n\n\nr\nq\nx\n' \
  | COLREGS_HOME="$H3" COLREGS_AWK="$AWKB" $SHL ./bin/colregs review > "$T/out3" 2>&1
seen=$(grep -oE '^  mot-[a-z0-9]+-[0-9]+  \[r\]' "$T/out3" | awk '{print $1}' | tr '\n' ' ')
#  four DISTINCT keys in order: three skipped, the fourth answered. If
#  skipping did not advance, the first key is simply repeated.
nd=$(printf '%s\n' $seen | sort -u | wc -l | tr -d ' ')
[ "$nd" -ge 4 ] || fail "skipping does not advance: saw [$seen]"
grep -q "^$K2	ok" "$H3/review.tsv" || fail "the claim answered after three skips was not saved"

rm -rf "$T"
printf 'BAD %d\n' "$bad"
[ "$bad" = 0 ]

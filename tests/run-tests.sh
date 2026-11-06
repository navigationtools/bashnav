#!/bin/sh
# Bash Navigation Software -- the whole test suite.
# Runs under any POSIX shell. Set SHELLS and AWKS to widen the matrix.
set -e
cd "$(dirname "$0")/.."
#  Default to every shell and awk installed on this machine, not just
#  "sh" and "awk". A portability suite that only runs one combination by
#  default is a portability suite that finds nothing: two syntax errors
#  mawk rejects and gawk accepts sat in this repository until CI ran.
if [ -z "${SHELLS:-}" ]; then
  SHELLS=""
  for _s in sh dash bash ksh; do command -v "$_s" >/dev/null 2>&1 && SHELLS="$SHELLS $_s"; done
  [ -n "$SHELLS" ] || SHELLS=sh
fi
if [ -z "${AWKS:-}" ]; then
  AWKS=""
  #  original-awk is the one-true-awk, which is what macOS ships AS awk and
  #  what a-Shell is closest to. On a Mac it is already covered, because
  #  `awk` IS it; in a Linux container `awk` is usually gawk and nothing in
  #  the matrix is the strict one. That gap let a bare ternary in a printf
  #  argument through -- gawk and mawk both accept it, the one-true-awk
  #  does not, and Larry's laptop found it. Probed here so the container
  #  covers it too, where the package is installed.
  for _a in awk gawk mawk original-awk; do command -v "$_a" >/dev/null 2>&1 && AWKS="$AWKS $_a"; done
  [ -n "$AWKS" ] || AWKS=awk
fi
#  Checks that exercise only the SHELL do not need repeating for every
#  awk.  Running them once per shell instead of once per shell x awk is
#  the difference between a suite you run and one you skip.
FIRSTAWK=$(printf '%s' "$AWKS" | awk '{print $1}')
fail=0
tmp=${TMPDIR:-/tmp}/bashnav-test.$$
mkdir -p "$tmp"
trap 'rm -rf "$tmp"' EXIT

say()  { printf '%s\n' "$*"; }
ok()   { printf '  ok    %s\n' "$*"; }
bad()  { printf '  FAIL  %s\n' "$*"; fail=$((fail+1)); }
check(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (got '$3', want '$2')"; fi; }

#  A CHECK THAT HANGS IS WORSE THAN ONE THAT FAILS.
#
#  tests/ios-home.sh hung on Larry's Mac and the suite simply stopped,
#  on a blank line, with no clue which check it was in -- he had to tell
#  me the last line that printed.  macOS has no timeout(1), so this is a
#  portable one: run the check in the background, shoot it if it takes
#  too long, and report that as a FAILURE naming the check.
#
#  The output goes to a file rather than a pipe on purpose: a pipe would
#  keep the reader blocked on the killed child.
#  guard SECONDS COMMAND...   -> exit status of the command, or 137 if
#  it had to be killed.  Output is left in $GUARD_OUT for the caller to
#  print; guard must NOT be called inside $( ), because a command
#  substitution runs in a subshell where backgrounding and wait do not
#  behave, and the first version of this silently swallowed every
#  check's output and turned four passes into four blank failures.
GUARD_OUT=""
guard() {
  g_sec=$1; shift
  GUARD_OUT="$tmp/guard.out"
  : > "$GUARD_OUT"
  "$@" > "$GUARD_OUT" 2>&1 &
  g_pid=$!
  ( sleep "$g_sec"; kill -9 "$g_pid" 2>/dev/null ) 2>/dev/null &
  g_kill=$!
  wait "$g_pid" 2>/dev/null; g_rc=$?
  #  Reap the watchdog as well.  bash on macOS prints
  #  "Terminated: 15 ( sleep ...)" for a killed background job that is
  #  never waited for -- three lines of alarming noise in the middle of
  #  a passing run.  dash does not, which is why it looked clean here.
  kill "$g_kill" 2>/dev/null
  #  "|| :" is load-bearing. wait on a process we have just TERMed
  #  returns 143, and on one already reaped returns 127 -- so under
  #  set -e this line exits the whole suite. It never did, only because
  #  every caller so far wrote "if guard ...; then", and set -e is
  #  suspended for a function run as an if condition. The first bare
  #  "guard 90 ..." killed the run at exit 143, after the check it was
  #  guarding had already passed.
  wait "$g_kill" 2>/dev/null || :
  if [ "$g_rc" -ge 128 ]; then
    printf '  ... TIMED OUT after %ss and was killed. Last step above.\n' "$g_sec" >> "$GUARD_OUT"
  fi
  return "$g_rc"
}

./build.sh >/dev/null

say ""
say "syntax"
#  Each tool carries its awk engines as payload AFTER "exit 0", where the
#  shell stops reading -- that is how they are unpacked without a
#  heredoc, which a-Shell does not deliver.  "sh -n" has no such stop:
#  it parses to end of file and chokes on the awk.  So check the part
#  that is actually parsed, and let the runtime tests below prove the
#  whole thing runs -- which they do, under every shell in the matrix.
for f in bin/celnav bin/colregs bin/tides bin/deck-log bin/weather bin/bashnav; do
  awk '/^exit 0$/{ exit } { print }' "$f" > "$tmp/syn.$$"
  if sh -n "$tmp/syn.$$" 2>/dev/null; then ok "$f parses"; else bad "$f parses"; fi
done
rm -f "$tmp/syn.$$"

for SH in $SHELLS; do
 for AW in $AWKS; do
  say ""
  say "matrix: $SH + $AW"
  CH="$tmp/celnav-$SH-$AW"; CR="$tmp/colregs-$SH-$AW"
  #  The three files colregs loads together. mawk resolves called
  #  functions at parse time, so the engine alone no longer loads.
  CSRC="-f src/colregs/engine.awk -f src/colregs/contacts.awk -f src/colregs/review.awk"
  rm -rf "$CH" "$CR"

  # ---- celnav ------------------------------------------------------
  out=$(CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav test 2>&1 || true)
  case "$out" in *"ALL TESTS PASSED"*) ok "celnav self test" ;;
                 *) bad "celnav self test"; echo "$out" | tail -3 ;; esac

  CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav dr "35 00 N" "040 00 W" 0 0 >/dev/null
  CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav sight "2026-08-29 07:30:00" Dubhe     C "19 32.1" 1.5 3.0 >/dev/null
  CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav sight "2026-08-29 07:34:00" Bellatrix C "49 37.2" 1.5 3.0 >/dev/null
  CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav sight "2026-08-29 07:38:00" Markab    C "29 01.3" 1.5 3.0 >/dev/null
  fix=$(CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav fix | grep '  FIX' | sed 's/  */ /g')
  check "celnav known fix" " FIX 35 09.9'N 040 20.0'W" "$fix"

  #  THE COUNT COMES FROM THE APP, NOT FROM THIS FILE.  This read "want
  #  20" and went red the moment a lesson was added -- the fifth place a
  #  lesson count was written down by hand, after four in the shell and
  #  four in the documentation.  What is worth testing is not how many
  #  lessons there are but that the syllabus LISTS every lesson it says
  #  exists: a listing that silently prints fewer rows than the app
  #  claims is the fault this is here to catch.
  syl=$(CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav syllabus)
  n=$(printf '%s\n' "$syl" | grep -c '\[ \]')
  m=$(printf '%s\n' "$syl" | sed -n 's/.*of \([0-9][0-9]*\) lessons done.*/\1/p')
  check "the syllabus lists every lesson it declares" "$m" "$n"
  #  And a floor, because lessons are only ever added: a listing that
  #  collapsed to a handful would otherwise agree with itself and pass.
  if [ "${n:-0}" -ge 20 ]; then ok "at least twenty lessons are listed ($n)"
  else bad "only $n lessons listed; there were twenty when this was written"; fi
  for L in F1 F5 T3 S5 R1 R5; do
    n=$(printf '\n' | CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav lesson $L 2>&1 | grep -c '^  Q\.')
    [ "$n" = 1 ] || bad "celnav lesson $L has no question"
  done
  ok "celnav lessons render"
  for k in corr alm red int full fix; do
    o=$(CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav drill "$k" </dev/null 2>&1 | grep -c 'DRILL')
    [ "$o" -ge 1 ] || bad "celnav drill $k"
  done
  ok "celnav drills generate"
  # a drill and its marking must agree - this is what a non-reproducible
  # random generator would silently break
  # take the versions from the tools themselves, so a version bump never
  # silently breaks the suite
  CV=$(CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav version | awk '{print $2}')
  EN="$CH/engine-$CV.awk"; TE="$CH/teach-$CV.awk"
  for sd in 3 21 400 7777; do
    line=$($AW -f "$EN" -f "$TE" -v cmd=t_mark -v kind=red -v seed="$sd" -v a1=0 -v a2=0 </dev/null | grep '^  Hc = ')
    hc=$(echo "$line" | sed 's/^  Hc = //; s/  *Zn = .*//')
    zn=$(echo "$line" | sed 's/.*Zn = //; s/ T$//')
    if $AW -f "$EN" -f "$TE" -v cmd=t_mark -v kind=red -v seed="$sd" -v a1="$hc" -v a2="$zn" </dev/null >/dev/null 2>&1
    then :; else bad "celnav reduction drill seed $sd self-mark"; fi
    ho=$($AW -f "$EN" -f "$TE" -v cmd=t_mark -v kind=corr -v seed="$sd" -v a1=0 </dev/null | grep 'Correct Ho' | sed 's/.*is //; s/\.$//')
    if $AW -f "$EN" -f "$TE" -v cmd=t_mark -v kind=corr -v seed="$sd" -v a1="$ho" </dev/null >/dev/null 2>&1
    then :; else bad "celnav corrections drill seed $sd self-mark"; fi
  done
  ok "celnav drills mark their own answers correctly"

  # ---- colregs -----------------------------------------------------
  n=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs reflights | grep -c '^  [a-z]')
  [ "$n" -ge 20 ] || bad "colregs lights reference short ($n)"
  ok "colregs lights reference"
  n=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs refshapes | grep -c 'Rule')
  [ "$n" -ge 10 ] || bad "colregs shapes reference short ($n)"
  ok "colregs shapes reference"
  for th in -180 -90 -30 0 30 90 170; do
    o=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs light power50p "$th" | grep -c 'WHAT DO YOU SEE')
    [ "$o" = 1 ] || bad "colregs light at bearing $th"
  done
  ok "colregs lights draw from every angle"
  n=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs syllabus 2>/dev/null | grep -c '\[ \]' || true)
  o=$(printf '\n' | COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs lesson L9 2>&1 | grep -c '^  Q\.')
  check "colregs lesson L9 has a question" "1" "$o"

  RV=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs version | awk '{print $2}')
  #  The tool always loads all three of its awk files together, so the
  #  tests must too. mawk resolves every called function at PARSE time,
  #  so engine.awk on its own does not even load under it once the
  #  engine dispatches into contacts.awk and review.awk. gawk only
  #  complains when such a function is actually called, which is why
  #  this passed locally and failed in CI.
  CE="$CR/engine-$RV.awk -f $CR/contacts-$RV.awk -f $CR/review-$RV.awk"
  # the lights quiz asks two questions and both must mark correctly
  for sd in 3 17 91 404 7; do
    r=$($AW -f $CE -v cmd=qlightm -v seed="$sd" -v ans=z -v ans2=z -v cmode=plain </dev/null || true)
    w1=$(echo "$r" | grep '^  Q1 ' | grep -o '[A-D] is right' | cut -c1 | tr 'A-D' 'a-d')
    w2=$(echo "$r" | grep '^  Q2 ' | grep -o '[A-D] is right' | cut -c1 | tr 'A-D' 'a-d')
    if $AW -f $CE -v cmd=qlightm -v seed="$sd" -v ans="$w1" -v ans2="$w2" -v cmode=plain </dev/null >/dev/null 2>&1
    then :; else bad "colregs lights quiz seed $sd self-mark (q1=$w1 q2=$w2)"; fi
  done
  ok "lights quiz marks both of its answers correctly"

  # every quiz must mark its own correct answer as correct
  for q in qshape qsound; do
    for sd in 3 17 91 404; do
      want=$($AW -f $CE -v cmd="${q}m" -v seed="$sd" -v ans=z </dev/null 2>&1 \
             | grep -o '^  [A-D] is right' | cut -c3 | tr 'A-D' 'a-d' || true)
      if $AW -f $CE -v cmd="${q}m" -v seed="$sd" -v ans="$want" </dev/null >/dev/null 2>&1
      then :; else bad "colregs $q seed $sd self-mark"; fi
    done
  done
  ok "colregs quizzes mark their own answers correctly"
  # a lights picture must have exactly one right answer among the four offered:
  # two vessels that look identical from that angle must never both appear
  if $AW -f $CE -v cmd=sigcheck </dev/null | grep -q "single right answer"
  then ok "lights questions have a single right answer"
  else bad "lights questions offer look-alike vessels"
       $AW -f $CE -v cmd=sigcheck </dev/null | head -4; fi
  for sd in 5 55 555; do
    want=$($AW -f $CE -v cmd=encm -v seed="$sd" -v ans=z </dev/null 2>&1 \
           | grep -o '^  [A-D] is right' | cut -c3 | tr 'A-D' 'a-d' || true)
    if $AW -f $CE -v cmd=encm -v seed="$sd" -v ans="$want" </dev/null >/dev/null 2>&1
    then :; else bad "colregs encounter seed $sd self-mark"; fi
  done
  ok "colregs encounters mark their own answers correctly"

  # ---- collision-avoidance scenarios -------------------------------
  for sd in 2 9 44 101 3030; do
    o=$($AW -f $CE -v cmd=scen -v seed="$sd" -v cmode=plain </dev/null | grep -c "COLLISION AVOIDANCE")
    [ "$o" = 1 ] || bad "scenario seed $sd did not generate"
  done
  ok "scenarios generate"
  # and each must mark its own three correct answers as correct
  for sd in 2 9 44 101 3030; do
    r=$($AW -f $CE -v cmd=scenm -v seed="$sd" -v a1=z -v a2=z -v a3=z -v cmode=plain </dev/null || true)
    k1=$(echo "$r" | grep '^  Q1' | sed 's/.*the answer is //' | tr 'A-Z' 'a-z')
    k2=$(echo "$r" | grep '^  Q2' | sed 's/.*the answer is //' | tr 'A-Z' 'a-z')
    k3=$(echo "$r" | grep '^  Q3' | sed 's/.*the answer is //' | tr 'A-Z' 'a-z')
    if $AW -f $CE -v cmd=scenm -v seed="$sd" -v a1="$k1" -v a2="$k2" -v a3="$k3" -v cmode=plain </dev/null >/dev/null 2>&1
    then :; else bad "scenario seed $sd self-mark (a1=$k1 a2=$k2 a3=$k3)"; fi
  done
  ok "scenarios mark their own answers correctly"
  # the replay must end by itself rather than run for ever
  for sd in 2 44; do
    ended=0
    for tm in 12 24 36 48 60 72 84 96; do
      $AW -f $CE -v cmd=scenframe -v seed="$sd" -v ans=a -v tmin="$tm" -v cmode=plain </dev/null >/dev/null 2>&1 || rc=$?
      rc=${rc:-0}
      if [ "$rc" -eq 3 ]; then ended=1; break; fi
      rc=0
    done
    [ "$ended" = 1 ] || bad "scenario seed $sd replay never reached its end"
  done
  ok "scenario replays terminate"
  n=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs colours | grep -c "COLOUR CHECK")
  check "colregs colour check runs" "1" "$n"

  # ---- no stray escape sequences when output is not a terminal -----
  e=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" $SH ./bin/colregs light ram 40 | cat -v | grep -c '\^\[' || true)
  check "colregs is clean when piped" "0" "$e"
  e=$(CELNAV_HOME="$CH" CELNAV_AWK="$AW" $SH ./bin/celnav syllabus | cat -v | grep -c '\^\[' || true)
  check "celnav is clean when piped" "0" "$e"

  # ---- and colour when it IS a terminal ----------------------------
  #  The mirror of the test above, and the one that matters: colregs
  #  once decided "am I on a terminal?" inside a command substitution,
  #  where stdout is a pipe by definition, so the answer was always no
  #  and no terminal ever got colour.  Both halves have to be tested.
  if command -v script >/dev/null 2>&1 && script -qec true /dev/null >/dev/null 2>&1; then
    e=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" script -qec "$SH ./bin/colregs light ram 40" /dev/null 2>/dev/null | cat -v | grep -c '\^\[' || true)
    [ "$e" -gt 0 ] && ok "colregs has colour on a terminal" || bad "colregs has no colour on a terminal"
    e=$(CELNAV_HOME="$CH" CELNAV_AWK="$AW" script -qec "$SH ./bin/celnav plan '2026-08-29 20:00'" /dev/null 2>/dev/null | cat -v | grep -c '\^\[' || true)
    [ "$e" -gt 0 ] && ok "celnav has colour on a terminal" || bad "celnav has no colour on a terminal"
  else
    ok "colour-on-a-terminal test skipped (no usable script(1))"
  fi
  #  A grep is not a substitute for the run above, but it holds on the
  #  platforms where script(1) is missing or takes different arguments.
  for f in ./bin/colregs ./bin/celnav; do
    if grep -q 'cmode_now() {.*\[ -t 1 \]' "$f"; then
      bad "$f tests -t 1 inside cmode_now, which runs in a substitution"
    fi
  done
  ok "tty is detected at the top level, not inside a substitution"

  # ---- lights on a yard are drawn on the same mast as their partner
  #  The three greens of a mine clearance vessel once had different
  #  fore-and-aft positions, which threw the two yard lights off to one
  #  side of the mast, where nothing could account for them. The test:
  #  the masthead green must sit BETWEEN the two yard greens, at every
  #  angle from which all three are seen.
  bad_a=""
  for a in 0 30 60 90 120 150 180 210 240 270 300 330 45 135 225 315; do
    r=$($AW $CSRC -v cmd=light -v key=mineclear -v th=$a -v cmode=plain </dev/null \
        | $AW '
          /G[-:]+G/ { yl=index($0,"G"); yr=length($0); while(substr($0,yr,1)!="G") yr--; got=1 }
          !yard && /^ *G *$/ { mast=index($0,"G") }
          END{ if(!got){ print "noyard"; exit }
               if(mast<=yl || mast>=yr) print "off"; else print "ok" }')
    #  Seen from dead abeam the yard is end-on: the two lights really are
    #  in line, one behind the other, so there is no spar to draw.
    case "$a" in 90|270) [ "$r" = noyard ] || bad_a="$bad_a $a(yard-edge-on:$r)" ;;
                 *)      [ "$r" = ok ]     || bad_a="$bad_a $a($r)" ;;
    esac
  done
  [ -z "$bad_a" ] && ok "mine clearance greens hang on one yard, mast between them" \
                  || bad "mine clearance greens off their mast at:$bad_a"

  # ---- about, and the licence it claims ----------------------------
  for t in celnav colregs; do
    a=$(COLREGS_HOME="$CR" CELNAV_HOME="$CH" COLREGS_AWK="$AW" CELNAV_AWK="$AW" \
        printf '1\n2\n3\n4\n5\n6\nx\n' | $SH ./bin/$t about 2>/dev/null)
    for want in "WHY THIS EXISTS" "HOW IT WAS WRITTEN" "WHAT IS TESTED" \
                "NOW THE HONEST PART" "SOURCES" "FEEDBACK" \
                "WHERE IT IS WORTH MOST" \
                "Apache License, Version 2.0" "NO WARRANTY" \
                "SSN-614" "github.com/navigationtools"; do
      case "$a" in *"$want"*) ;; *) bad "$t about is missing: $want" ;; esac
    done
  done
  ok "both tools have an about section with all six parts"

  #  The about text quotes numbers about the program. If the program
  #  changes and the text does not, the documentation starts lying -
  #  which is exactly the failure this section exists to prevent.
  a=$(COLREGS_HOME="$CR" COLREGS_AWK="$AW" printf '3\n5\nx\n' \
      | $SH ./bin/colregs about 2>/dev/null)
  nv=$($AW $CSRC -v cmode=plain -f tests/count-check.awk \
       -v what=vessels </dev/null)
  ne=$($AW $CSRC -v cmode=plain -f tests/count-check.awk \
       -v what=encounters </dev/null)
  nm=$($AW $CSRC -v cmode=plain -f tests/count-check.awk -v what=motion </dev/null)
  [ "$nv" = 28 ] || bad "about says twenty-eight vessels; there are $nv"
  [ "$ne" = 28 ] || bad "about says twenty-eight encounters; there are $ne"
  [ "$nm" = 94 ] || bad "about says ninety-four give-way calls; there are $nm"
  case "$a" in *"Twenty-eight vessels"*) ;; *) bad "about no longer says how many vessels" ;; esac
  case "$a" in *"twenty-eight encounters"*) ;; *) bad "about no longer says how many encounters" ;; esac
  case "$a" in *"ninety-four distinct give-way calls"*) ;; *) bad "about no longer says how many give-way calls" ;; esac
  gl=$(cat tests/golden/*.txt 2>/dev/null | wc -l)
  #  The band is wide on purpose -- "about thirty-four thousand" is an
  #  order of magnitude, not a count -- but it has to move when the
  #  figure does, or the check stops meaning anything. It was last set
  #  around twenty-six thousand and the goldens have grown past it.
  if [ "$gl" -lt 26000 ] || [ "$gl" -gt 42000 ]; then
    bad "about says about thirty-four thousand golden lines; there are $gl"
  fi
  ok "the numbers the about section quotes match the program ($nv/$ne/$nm/$gl)"
  #  the licence the program claims must be the licence in the file
  grep -q "Apache License" LICENSE || bad "LICENSE is not the Apache licence"
  grep -q "Copyright 2026 M. Larry Sherman" NOTICE || bad "NOTICE has no copyright line"
  grep -q "CC BY 4.0" NOTICE || bad "NOTICE does not carry the CC BY attribution"
  for t in bin/celnav bin/colregs; do
    grep -q "Apache License, Version 2.0" "$t" || bad "$t does not name its licence"
    grep -q "MIT" "$t" && bad "$t still mentions MIT"
  done
  ok "the licence the tools claim is the licence in LICENSE and NOTICE"

  # ---- the README's pictures ---------------------------------------
  #  The coloured art is generated from the tools' real output. If an
  #  image goes missing, or make-site.sh stops producing one, the front
  #  page silently shows a broken image to everybody who arrives.
  rm_bad=0
  for f in $(sed -n 's/.*src="\(docs\/img\/[^"]*\)".*/\1/p' README.md); do
    [ -s "$f" ] || { bad "README references $f, which is missing or empty"; rm_bad=1; }
  done
  for f in docs/img/*.svg; do
    [ -s "$f" ] || continue
    head -1 "$f" | grep -q "<svg" || { bad "$f is not an SVG"; rm_bad=1; }
    grep -q "<script" "$f" && { bad "$f contains a script; GitHub will not render it"; rm_bad=1; }
  done
  #  and the pictures must be an exact character grid. Three separate
  #  bugs sheared it - xml:space stripped, glyphs advancing by the font's
  #  width, XML collapsing spaces - all with the same symptom and none
  #  visible without rendering the file and looking at it.
  for f in docs/img/*.svg; do
    [ -s "$f" ] || continue
    r=$($AW -f tests/svg-check.awk -v pad=14 -v fw=8.0 < "$f" | tail -1)
    case "$r" in *"BAD 0") ;; *) bad "$f is not an exact grid: $r"; rm_bad=1 ;; esac
  done
  #  a round trip through known input, so the arithmetic itself is checked
  #  and not just the files that happen to be committed
  r=$(printf 'A%29sB\n' "" | $AW -f docs/ansi2svg.awk -v title=t \
      | $AW -f tests/svg-check.awk -v pad=14 -v fw=8.0 | tail -1)
  case "$r" in "TEXTS 2 BAD 0") ;; *) bad "ansi2svg does not place a known grid correctly: $r"; rm_bad=1 ;; esac
  [ "$rm_bad" = 0 ] && ok "every picture the README shows exists, is a plain SVG, and is an exact grid"

  #  ---- the README's own markup -------------------------------------
  #  A picture can be perfect and still never reach anybody.  An
  #  unclosed ```sh fence once swallowed the lights plate whole: the
  #  <img> tag sat inside the code block, GitHub printed it as text,
  #  and no image rendered at all.  From the outside that is
  #  indistinguishable from a picture with no colour in it, which is
  #  exactly how it was reported and why it took so long to find.
  #  The README pastes real program output into fenced blocks by hand, so
  #  it drifts. The colregs plate sat there for weeks saying "You are on
  #  her starboard bow" after the program had started saying "broad on",
  #  and without the note that explains why a sidelight is drawn aft of
  #  the masts - the one thing a reader of that picture needs.
  if o=$(sh tests/plates-check.sh "$AW" 2>&1); then
    case "$o" in
      *"PLATES SKIP"*) say "  --    comparing the site artefacts needs a git checkout" ;;
      *) ok "every site plate and picture is what the program produces under $AW" ;;
    esac
  else
    printf '%s\n' "$o" | grep -v '^PLATES OK'
    bad "a site plate or picture has drifted from the program"
  fi

  #  every built tool must have BOTH a row in the table at the top and a
  #  section of its own. deck-log shipped with a section and no row, and
  #  nothing noticed - invisible to whoever wrote it, the first thing a
  #  reader sees.
  ls bin/ > "$tmp/tools.$$"
  #  The site address, as one setting, matching SITE in docs/make-site.sh.
  #  toolrow-check finds our own published builds by it; if it is wrong
  #  the check stops finding them and stops checking, silently.
  SITEHOST=bashnav.navigationtools.org
  r=$($AW -v site="$SITEHOST" -f tests/toolrow-check.awk README.md "$tmp/tools.$$" )
  case "$r" in
    *"TOOLROW 0") ok "every tool in bin/ is listed and has a section in the README" ;;
    *) printf '%s\n' "$r" | grep -v TOOLROW; bad "a tool is missing from the README" ;;
  esac
  rm -f "$tmp/tools.$$"

  #  the install section must keep up with what exists, and must tell an
  #  iPad user these are scripts rather than an app - the omission that
  #  sent Larry to a search engine which answered about Android APKs
  ls bin/ > "$tmp/tools.$$"
  r=$($AW -f tests/install-check.awk README.md "$tmp/tools.$$")
  case "$r" in
    *"INSTALL 0") ok "the install instructions name every tool and cover the iPad" ;;
    *) printf '%s\n' "$r" | grep -v INSTALL; bad "the install instructions are stale" ;;
  esac

  #  and the counts in that prose must come from the engine, not from
  #  somebody's memory of it.
  #
  #  RUN PER AWK, not once. The first version of this check parsed with
  #  sed and carried a GNU-only \? into a basic regular expression. It
  #  passed here and failed on Larry's Mac, where BSD sed matched
  #  nothing and every count came out empty. It is an awk program now,
  #  and it runs under every awk on the machine like everything else --
  #  which is the only arrangement that would have caught it.
  if o=$(AWK="$AW" sh tests/counts-check.sh 2>&1); then
    ok "every vessel and scenario count in the README and the site is the engine's"
  else
    printf '%s\n' "$o" | grep -v '^COUNTS'
    bad "a count in the public prose disagrees with the engine"
  fi

  #  no -v WANT: readme-check.awk derives the expected number of pictures
  #  from the file itself.  See the note at the top of it.
  r=$($AW -f tests/readme-check.awk README.md)
  case "$r" in
    *"READMERESULT 0 "*) ok "the README's fences close and every picture in it renders" ;;
    *) printf '%s\n' "$r" | grep -v READMERESULT
       bad "the README's markup is broken - see the lines above" ;;
  esac

  # ---- deck-log: the record layer -----------------------------------
  #  The log is append-only, so a record written today has to parse in
  #  five years. These are the tests that protect that; everything else
  #  in the tool can be rewritten, a record on somebody's iPad cannot.
  r=$($AW -f src/common/log.awk -f tests/log-check.awk </dev/null | tail -1)
  case "$r" in
    "LOGRESULT "*" 0") ok "the log record layer round-trips and rejects the malformed ($r)" ;;
    *) bad "log record layer: $r" ;;
  esac
  if o=$(sh tests/log-trunc.sh "$AW" 2>&1); then
    ok "a half-written record never parses as a whole one"
  else
    printf '%s\n' "$o" | head -4
    bad "an interrupted write is not handled safely"
  fi

  r=$($AW -f src/common/log.awk -f src/common/colour.awk -f src/weather/grid.awk -f src/weather/wx.awk \
        -f tests/wx-check.awk </dev/null | tail -1)
  case "$r" in
    "WXRESULT "*" 0") ok "the weather rules hold over their whole range ($r)" ;;
    *) bad "weather rules: $r" ;;
  esac

  r=$($AW -f src/common/log.awk -f src/common/colour.awk -f src/weather/grid.awk -f src/weather/wx.awk \
        -f src/weather/score.awk -f tests/score-check.awk </dev/null | tail -1)
  case "$r" in
    "SCORERESULT "*" 0") ok "forecast scoring is right, including on the circle ($r)" ;;
    *) bad "forecast scoring: $r" ;;
  esac
  r=$($AW -f src/common/log.awk -f src/common/colour.awk -f src/weather/grid.awk -f src/weather/wx.awk \
        -f src/weather/score.awk -f tests/date-check.awk </dev/null | tail -1)
  case "$r" in
    "DATERESULT 0") ok "date arithmetic round-trips over forty years" ;;
    *) bad "date arithmetic: $r" ;;
  esac
  if o=$(sh tests/score-e2e.sh "$AW" 2>&1); then
    ok "you, the rules and persistence all score against a hand-worked answer"
  else printf '%s\n' "$o" | head -3; bad "end-to-end scoring"; fi
  if o=$(sh tests/forecast-order.sh "$AW" "$SH" 2>&1); then
    ok "the app never shows its forecast before yours is written down"
  else printf '%s\n' "$o" | head -3; bad "never tell before you ask"; fi

  #  ---- weather -----------------------------------------------------
  WH_="$tmp/wx-$SH-$AW"; rm -rf "$WH_"; mkdir -p "$WH_"
  o=$(DECKLOG_HOME="$WH_" WEATHER_HOME="$WH_" WEATHER_AWK="$AW" $SH ./bin/weather version 2>&1)
  case "$o" in weather\ *) ok "weather reports its version" ;; *) bad "weather version: $o" ;; esac

  cat > "$WH_/log" <<'WXLOG'
2026-08-30T06:00Z|nav|lat=41 14.0N|wdir=210|wspd=14|sea=3|~
2026-08-30T06:00Z|wx|mslp=1016.4|airt=18.0|dewp=14.0|seat=17.5|cloud=2|ch=1|cm=0|cl=1|vis=8|swper=7|swdir=200|~
2026-08-30T12:00Z|nav|lat=41 20.0N|wdir=170|wspd=22|sea=4|~
2026-08-30T12:00Z|wx|mslp=1010.1|airt=17.2|dewp=16.8|seat=16.9|cloud=7|ch=4|cm=2|cl=6|vis=5|swper=14|swdir=230|~
WXLOG
  wx_bad=0
  #  every lesson renders, ends with a question, and has an answer
  nk=0
  #  a dedicated command rather than scraping the drawn syllabus - the
  #  same mistake as parsing the tides station list, and it bit here too
  for k in $(DECKLOG_HOME="$WH_" WEATHER_HOME="$WH_" WEATHER_AWK="$AW" \
             $AW -f src/common/log.awk -f src/common/colour.awk -f src/weather/grid.awk -f src/weather/wx.awk \
                 -f src/weather/score.awk -f src/weather/chart.awk \
                 -f src/weather/teach.awk -f src/weather/screens.awk \
                 -v cmd=lessonlist </dev/null); do
    [ -n "$k" ] || continue
    o=$(printf '\n' | DECKLOG_HOME="$WH_" WEATHER_HOME="$WH_" WEATHER_AWK="$AW" $SH ./bin/weather learn "$k" 2>&1)
    n=$(printf '%s\n' "$o" | wc -l)
    [ "$n" -ge 15 ] || { bad "weather lesson $k rendered $n lines"; wx_bad=1; }
    case "$o" in *"Question:"*) ;; *) bad "weather lesson $k has no question"; wx_bad=1 ;; esac
    nk=$((nk+1))
  done
  [ "${nk:-0}" -ge 10 ] || { bad "only ${nk:-0} weather lessons found, expected 10"; wx_bad=1; }
  [ "$wx_bad" = 0 ] && ok "all ${nk:-0} weather lessons render and answer their own question"

  #  ---- the weather lessons read like prose in a browser -------------
  #  They were written for a terminal: 70-column lines, each arriving as
  #  its own pre-wrap paragraph, so 130 of the 181 lines across the ten
  #  lessons broke a second time on a phone and the left margin
  #  alternated in and out. They are gathered into paragraphs now, which
  #  risks three silent faults -- a word lost at a seam, an emphasis
  #  flattened (the accent is per span, not per line), and a figure
  #  flowed into a sentence. The H2O/O2 diagram was ALREADY broken
  #  before any of this, because the body font is proportional and
  #  "O2 32" is indented to sit under "N2 28".
  if command -v node >/dev/null 2>&1; then
    if r=$(node tests/weather-reflow-check.js 2>&1); then
      ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
    else
      bad "weather's lesson reflow loses words, emphasis, or a figure"
      echo "$r" | head -8
    fi
  else
    say "  --    the weather reflow check needs node, skipped"
  fi

  #  the cloud sequence must fire - those three fields were asked for and
  #  ignored in the first build, which is how you teach somebody to stop
  #  filling in a form
  o=$(DECKLOG_HOME="$WH_" WEATHER_HOME="$WH_" WEATHER_AWK="$AW" $SH ./bin/weather what 2>&1)
  case "$o" in *"warm-front"*) ok "the cloud-type codes are actually used" ;;
    *) bad "the cloud sequence rule did not fire on a textbook warm front" ;; esac
  case "$o" in *"Visibility"*) ;; *) bad "visibility is asked for and still ignored" ;; esac

  #  the 500 mb rules
  o=$(DECKLOG_HOME="$WH_" WEATHER_HOME="$WH_" WEATHER_AWK="$AW" $SH ./bin/weather \
        chart </dev/null 2>&1 || true)
  o=$($AW -f src/common/log.awk -f src/common/colour.awk -f src/weather/grid.awk -f src/weather/wx.awk \
        -f src/weather/score.awk -f src/weather/chart.awk -f src/weather/teach.awk \
        -f src/weather/screens.awk -v cmode=plain -v cmd=chart -v brg=000 -v dist=200 \
        -v orient=090 -v w500=60 -v north=1 </dev/null)
  case "$o" in *"300 and 600"*) ;; *) bad "the 564 storm-track rule is missing" ;; esac
  case "$o" in *"right side"*) ;; *) bad "a boat south of the 564 line was not told it is clear of the gales" ;; esac
  case "$o" in *"20 to 30 knots"*) ok "the 500 mb chart rules all fire" ;;
    *) bad "the steering-speed rule did not compute" ;; esac

  #  deck-log end to end: the registry, a job, the derived holding, the
  #  shopping list, and append-only across every write path
  if o=$(sh tests/decklog-check.sh "$AW" "$SH" 2>&1); then
    ok "deck-log records, derives its holdings, and never rewrites a line"
  else
    printf '%s\n' "$o" | head -6
    bad "deck-log"
  fi

  #  a heredoc feeding a command that prints: hangs on a-Shell, which is
  #  the platform this project is for. Every menu was built that way.
  if [ "$AW" != "$FIRSTAWK" ]; then :   # shell-only: once per shell
  elif guard 60 sh tests/ashell-check.sh; then
    ok "no heredoc prints, and no compound command is redirected"
  else
    head -8 "$GUARD_OUT"
    bad "a construct a-Shell cannot run"
  fi

  #  the iPad installer: the one thing between a working repo and a
  #  working iPad, run once, on a boat, with no way to debug it.
  if [ "$AW" != "$FIRSTAWK" ]; then :   # shell-only: once per shell
  elif guard 180 sh tests/ipad-install-check.sh "$SH"; then
    ok "the iPad installer installs, runs and can be run twice"
    grep '^  SKIP' "$GUARD_OUT" || true
  else
    head -10 "$GUARD_OUT"
    bad "the iPad installer"
  fi

  #  iOS refuses writes in $HOME, and every tool kept its data there.
  #  Not one of them started on the platform this project is for.
  if [ "$AW" != "$FIRSTAWK" ]; then :   # shell-only: once per shell
  elif guard 180 sh tests/ios-home.sh "$SH"; then
    ok "every tool starts when \$HOME is unwritable, as it is on iOS"
    grep '^  SKIP' "$GUARD_OUT" || true
  else
    head -10 "$GUARD_OUT"
    bad "a tool cannot run on iOS"
  fi

  #  the launcher: it must offer and find every tool in bin/, say so
  #  plainly when it cannot, pass arguments through, and the menu the
  #  README prints must be the menu the program prints.
  if [ "$AW" != "$FIRSTAWK" ]; then :   # shell-only: once per shell
  elif guard 60 sh tests/launcher-check.sh "$SH"; then
    ok "the launcher finds every tool and its README menu is current"
  else
    head -12 "$GUARD_OUT"
    bad "bashnav launcher"
  fi

  # ---- a function name used as a variable ---------------------------
  #  awk will not let a function's name be used as a variable or a
  #  parameter. gawk lets it pass; mawk refuses to parse the file, but
  #  only when the function was defined BEFORE the use - so the same
  #  code can work in one file and break when another is loaded after
  #  it. Check each tool's files as they are actually loaded together.
  fp=0
  for grp in "src/colregs/engine.awk src/colregs/contacts.awk src/colregs/review.awk" \
             "src/celnav/engine.awk src/celnav/teach.awk" \
             "src/tides/tables.awk src/tides/engine.awk"; do
    r=$($AW -f tests/fnparam-check.awk $grp)
    n=$(echo "$r" | tail -1 | $AW '{print $2}')
    if [ "$n" != 0 ]; then bad "$n parameters shadow a function name"; echo "$r" | grep -v '^BAD' | head -4; fp=1; fi
  done
  [ "$fp" = 0 ] && ok "no parameter shadows a function name"

  #  ---- the site's pictures, which are the apps' own drawings -------
  #  docs/img/app/*.svg are captured from the running browser apps by
  #  docs/web/gen/make-app-figures.sh. That needs a headless Chromium and
  #  cannot run here, so this checks the COMMITTED files - and asserts
  #  Rule 27(f) in the one figure that states it, because the browser drew
  #  a mine clearance vessel with four balls where the Convention gives
  #  three. run-tests.sh has checked that arrangement in her LIGHTS at
  #  sixteen angles since Larry found it wrong there; nothing checked her
  #  day shapes until it was wrong there too.
  if o=$(sh tests/app-figures-check.sh "$AW" 2>&1); then
    ok "every site picture is a real app drawing, and mine clearance shows three balls"
  else
    printf '%s\n' "$o" | grep -v '^APPFIG'
    bad "a site picture is missing, unreferenced, or draws the wrong thing"
  fi

  #  ---- the generators' JS/JSON escaper gives one answer ------------
  #  Every generated browser file is escaped by docs/web/gen/jsonesc.awk,
  #  and the nine copies it replaced did the doubling inside gsub's
  #  REPLACEMENT string - the one place POSIX leaves backslashes to the
  #  implementation. mawk 1.3.4 20200120, Debian's and Ubuntu's for
  #  years, emits one backslash where every other build emits two, so on
  #  an ordinary machine every generator wrote a silently wrong file.
  #
  #  THE REGENERATE-AND-COMPARE CHECKS CANNOT SEE THIS. They run the
  #  generator and diff the result against what is committed, so on the
  #  broken awk they report the committed file as stale - and doing what
  #  they advise commits the broken version. The escaper has to be held
  #  to a literal answer, per awk, which is what this does.
  r=$($AW -f docs/web/gen/jsonesc.awk -f tests/jsonesc-check.awk </dev/null 2>&1)
  case "$r" in
    *"JSONESC 0 of "*) ok "the generators' escaper agrees under $AW ($(printf '%s' "$r" | tail -1 | $AW '{print $4}') cases)" ;;
    *) bad "the generators' JS escaper disagrees under $AW -- generated files would be wrong"
       printf '%s\n' "$r" | grep -v '^JSONESC' | head -9 ;;
  esac

  #  ---- POSIX interval expressions in a regex ----------------------
  #  mawk 1.3.3 does not implement {n,m}: it reads the braces as literal
  #  characters, so a correct POSIX ERE silently matches nothing.
  #  deck-log shipped with /^[a-z][a-z0-9]{0,4}$/ guarding the record
  #  type and was COMPLETELY DEAD under that mawk - it rejected every
  #  record, refused to write an entry, and read an existing log as
  #  empty. gawk implements intervals, which is why it reached a
  #  release. Found on 2026-10-20 by running the browser build's
  #  record-layer diff on a machine whose mawk was the older one.
  iv=$($AW -f tests/interval-check.awk $(find src -name '*.awk' | sort) 2>&1)
  if [ -n "$iv" ]; then
    bad "an awk regex uses an interval expression, which mawk 1.3.3 ignores"
    echo "$iv" | head -4
  else
    ok "no awk regex uses a {n,m} interval expression"
  fi

  #  ---- a function name used as an ordinary variable ---------------
  #  fnparam-check catches a function name used as a PARAMETER; this is
  #  the other half. teach.awk defined p() while screens.awk used p as a
  #  local, and weather died at startup with a message about a space
  #  before a bracket that tells you nothing at all.
  fv_bad=0
  for grp in \
    "src/common/log.awk src/common/colour.awk src/weather/grid.awk src/weather/wx.awk src/weather/score.awk src/weather/chart.awk src/weather/teach.awk src/weather/screens.awk" \
    "src/common/log.awk src/common/colour.awk src/decklog/views.awk src/decklog/screens.awk" \
    "src/colregs/engine.awk src/colregs/contacts.awk src/colregs/review.awk" \
    "src/celnav/engine.awk src/celnav/teach.awk" \
    "src/tides/engine.awk" \
    "src/seamanship/engine.awk"; do
    [ -f "${grp%% *}" ] || continue
    r=$($AW -f tests/fnvar-check.awk $grp 2>/dev/null | tail -1)
    case "$r" in
      "FNVAR 0") ;;
      *) $AW -f tests/fnvar-check.awk $grp | grep -v FNVAR; fv_bad=1 ;;
    esac
  done
  [ "$fv_bad" = 0 ] && ok "no function name is used as a variable in any engine"
  [ "$fv_bad" = 0 ] || bad "a function name is shadowed by a variable"

  # ---- awk's own built-in variables --------------------------------
  #  A global called RS is the record separator. Setting it to a number
  #  makes the next getline read a whole file as a single record, with no
  #  error anywhere - which is exactly what a rate variable named RS did
  #  in the tide engine, and it took a while to see.
  #  every awk source in the repository, not just the tools': the SVG
  #  generator used RT, which is gawk's record terminator, and the lint
  #  did not cover that file or that name.
  r=$($AW -f tests/awkvars-check.awk src/celnav/engine.awk src/celnav/teach.awk \
        src/colregs/engine.awk src/colregs/contacts.awk src/colregs/review.awk \
        src/tides/engine.awk src/tides/tables.awk docs/ansi2svg.awk \
        tests/contacts-check.awk tests/review-check.awk tests/tides-check.awk \
        tests/annex1-check.awk tests/fields-check.awk tests/count-check.awk \
        tests/colregs-wind.awk tests/colregs-vessel.awk tests/colregs-bearing.awk \
        tests/colregs-r18.awk tests/motion-seen-check.awk tests/aspect-check.awk)
  n=$(echo "$r" | tail -1 | $AW '{print $2}')
  if [ "$n" = 0 ]; then ok "no code assigns to one of awk's built-in variables"
  else bad "$n assignments to awk built-ins"; echo "$r" | grep -v "^BAD" | head -5; fi

  # ---- the tides tool ----------------------------------------------
  TH="$tmp/tides-$SH-$AW"; rm -rf "$TH"
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides version 2>/dev/null)
  case "$o" in tides\ *) ok "tides reports its version" ;; *) bad "tides version: $o" ;; esac
  TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides use noaa/8461490 >/dev/null 2>&1
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides today 2026-08-30 2>&1)
  n=$(echo "$o" | grep -c -E '^  (HIGH|low) ' || true)
  check "tides prints four turns for the day" "4" "$n"
  case "$o" in *"NEW LONDON"*) ;; *) bad "tides does not name the station" ;; esac
  case "$o" in *"heights above MLLW"*) ;; *) bad "tides does not name the datum" ;; esac
  #  a secondary port must work too, and say what it is
  TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides use noaa/8510884 >/dev/null 2>&1
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides today 2026-08-30 2>&1)
  case "$o" in *"secondary port"*) ;; *) bad "a subordinate station is not marked as one" ;; esac
  n=$(echo "$o" | grep -c -E '^  (HIGH|low) ' || true)
  [ "$n" -ge 3 ] || bad "a secondary port gave $n turns"
  #  station search, by name and by position
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides near 41.2333 -72.0833 5 </dev/null 2>&1)
  case "$o" in *"Little Gull"*) ;; *) bad "nearest-station search missed Little Gull Island" ;; esac
  case "$o" in *"straight line"*) ;; *) bad "the nearest-station warning is missing" ;; esac
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides find "new london" </dev/null 2>&1)
  case "$o" in *"NEW LONDON"*) ;; *) bad "name search missed New London" ;; esac
  ok "tides finds stations by name and by position"

  #  ---- the loose name search -------------------------------------
  #  Nobody types a station's exact name, so every one of these has to
  #  land on New London: words in the wrong order, a fragment of a
  #  word, and a regular expression.
  for _q in "new london" "lon new" "new lon" "NEW LONDON" "^new london" "london|zzzz"; do
    o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides find "$_q" </dev/null 2>&1)
    case "$o" in *"NEW LONDON"*) ;; *) bad "search '$_q' missed New London" ;; esac
  done
  ok "the name search takes words in any order, fragments and regexes"

  #  Anchors have to anchor to the NAME.  If the regex is run against
  #  the name, the state and the country run together, ^ and $ - the
  #  whole reason to reach for a regex - stop meaning anything, and
  #  "bay$" silently matches nothing at all.
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides find 'bay$' </dev/null 2>&1)
  case "$o" in *"Bay "*|*"Bay  "*) ok "\$ anchors to the end of the station's name" ;;
    *) bad "'bay\$' found no station whose name ends in Bay" ;; esac
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides find '^boston$' </dev/null 2>&1 \
      | $AW '/^ +[0-9]+  +[A-Za-z]/{n++} END{print n+0}')
  check "^boston\$ matches only the stations actually called Boston" "2" "$o"

  #  A word that is genuinely absent must find nothing, or the search
  #  is matching everything and the list means nothing.
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides find "new zzzqqq" </dev/null 2>&1)
  case "$o" in *"Nothing matched"*) ok "an impossible search says so" ;;
    *) bad "'new zzzqqq' matched something" ;; esac

  #  A malformed regex must NOT abort the run: awk cannot catch a bad
  #  pattern, so a bad one has to be spotted before it is used.
  for _q in "((" "*bad" "a[" "b\\" "|x" "a{"; do
    o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides find "$_q" </dev/null 2>&1)
    case "$o" in *"MATCHING"*) ;; *) bad "a malformed pattern '$_q' killed the search" ;; esac
  done
  ok "a malformed regular expression falls back to plain text"

  #  Exactness has to outrank containment, or a place whose name IS what
  #  you typed sits below the ones that merely contain it.  "falmouth"
  #  is the discriminating case: alphabetically "Chappaquoit Point  West
  #  Falmouth Harbor" comes first, and by rank "Falmouth Foreside" does.
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides find "falmouth" </dev/null 2>&1 \
      | $AW '/^ +1  +[A-Za-z]/{print; exit}')
  case "$o" in *"Falmouth Foreside"*) ok "the closest name to what was typed comes first" ;;
    *) bad "search ranking put this first instead: $o" ;; esac

  #  Picking by number must use the engine's own list, and the picked
  #  station must be the one on that line of the drawing.
  o=$(printf '5\nnew lon\n3\nq\n' | TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides 2>&1)
  case "$o" in *"station: NEW LONDON"*) ok "a station can be picked by number from a search" ;;
    *) bad "picking 3 from the 'new lon' list did not select NEW LONDON" ;; esac

  #  A search that finds nothing must not throw you back to the menu.
  o=$(printf '5\nzzzqqq\nnew lon\n3\nq\n' | TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides 2>&1)
  case "$o" in *"station: NEW LONDON"*) ok "a fruitless search can be retried in place" ;;
    *) bad "the search loop did not offer a second try" ;; esac
  #  the curve and the sky panel must render
  TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides use noaa/8461490 >/dev/null 2>&1
  o=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides sky 2026-08-30 2>&1)
  case "$o" in *"SUN AND MOON"*) ;; *) bad "the sun and moon panel is missing" ;; esac
  case "$o" in *"lit,"*) ;; *) bad "the moon phase is missing" ;; esac
  n=$(echo "$o" | grep -c '#' || true)
  [ "$n" -ge 5 ] || bad "the moon disc did not draw"
  ok "tides draws the curve, the moon and the sun"
  #  the depth helper must answer the two questions it exists for
  o=$(printf '4\n2.0\n1.6\n0.5\n\nq\n' | TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides 2>&1 || true)
  case "$o" in *"enough water"*) ;; *) bad "the depth helper gave no window" ;; esac
  case "$o" in *"under the surface now"*) ;; *) bad "the depth helper did not add the tide to the charted depth" ;; esac
  ok "the depth helper works out when there is water"

  #  and it must be clean when piped, like the others
  e=$(TIDES_HOME="$TH" TIDES_AWK="$AW" $SH ./bin/tides today 2026-08-30 | cat -v | grep -c '\^\[' || true)
  check "tides is clean when piped" "0" "$e"

  # ---- tides against NOAA's own published predictions ---------------
  r=$($AW -f src/tides/tables.awk -f src/tides/engine.awk -f tests/tides-check.awk \
        -v SF=src/tides/stations.dat -v REF=tests/tides-noaa.dat </dev/null | grep '^RESULT')
  set -- $r
  tn=$2; tt=$3; th=$4; tm=$5
  [ "$tm" = 0 ] || bad "$tm predicted turns could not be matched to NOAA's"
  [ "$tn" -ge 24 ] || bad "only $tn turns compared against NOAA"
  if $AW -v t="$tt" 'BEGIN{exit !(t<12)}' </dev/null; then :; else bad "worst high/low water time error $tt min"; fi
  if $AW -v h="$th" 'BEGIN{exit !(h<0.06)}' </dev/null; then :; else bad "worst high/low water height error $th m"; fi
  ok "tides match NOAA's published tables ($tn turns, worst $tt min and $th m)"

  # ---- no network, ever --------------------------------------------
  #  The founding promise of both tools, and the reason the review
  #  session prints a link instead of posting one. A test, not a habit.
  #  Match a command at a command position, not a substring: "nc" lives
  #  inside "since" and "encounter", and a lint that cries wolf gets
  #  switched off, which is worse than no lint at all.
  #
  #  A URL printed for a person to READ is fine - the licence text and
  #  the review link are both just words on a screen. What is banned is
  #  fetching one, so these look for the fetch, never for the string.
  P_CMD='(^|[;&|(`$[:space:]])(curl|wget|ncat|netcat|telnet|ftp)([[:space:]]|$)'
  P_NC='(^|[;&|(`[:space:]])nc[[:space:]]+-'
  P_GET='getline[^;]*<[[:space:]]*.?(http|ftp)'
  P_PIPE='[|][[:space:]]*.[^"]*(curl|wget)'
  net=0
  for t in bin/celnav bin/colregs; do
    grep -qE "$P_CMD"  "$t" && { bad "$t invokes a network command"; net=1; }
    grep -qE "$P_NC"   "$t" && { bad "$t invokes nc"; net=1; }
    grep -qE "$P_GET"  "$t" && { bad "$t reads a URL with getline"; net=1; }
    grep -qE "$P_PIPE" "$t" && { bad "$t pipes to curl or wget"; net=1; }
    for lit in "/dev/tcp" "/dev/udp"; do
      grep -qF -- "$lit" "$t" && { bad "$t opens $lit"; net=1; }
    done
  done
  [ "$net" = 0 ] && ok "neither tool can reach the network"

  #  The review session must never PROMPT for an email address. Saying
  #  in prose that it collects none is fine and is not what this checks.
  if grep -nE "e-?mail" bin/colregs | grep -qE "read |printf.*: \"" ; then
    bad "colregs appears to prompt for an email address"
  else
    ok "the review session never asks for an email address"
  fi

  # ---- the review session ------------------------------------------
  RVK="-f src/colregs/engine.awk -f src/colregs/contacts.awk -f src/colregs/review.awk -f tests/review-check.awk"
  n=$($AW $RVK -v cmode=plain -v what=count </dev/null)
  [ "$n" -ge 150 ] || bad "only $n reviewable claims; expected all 153"
  r=$($AW $RVK -v cmode=plain -v what=keys </dev/null | tail -1)
  check "review keys are unique and well formed" "BAD 0" "$r"
  r=$($AW $RVK -v cmode=plain -v what=show </dev/null | tail -1)
  check "every reviewable claim renders and carries its own words" "BAD 0" "$r"
  ok "$n claims are offered for review"

  #  Drive the interactive session the way a person does. The section
  #  path once redirected the loop's stdin to the key file, so every
  #  prompt read a KEY instead of the answer typed at it and a whole
  #  section scrolled past unanswered - invisible to any test that only
  #  called the engine directly.
  RVH="$tmp/rvhome-$SH-$AW"; rm -rf "$RVH"; mkdir -p "$RVH"
  printf '2\nf\nthe note\nr\nc\na comment\nq\nx\n' \
    | COLREGS_HOME="$RVH" COLREGS_AWK="$AW" $SH ./bin/colregs review >/dev/null 2>&1 || true
  if [ -s "$RVH/review.tsv" ]; then
    got=$(cat "$RVH/review.tsv")
    case "$got" in *"enc-0	flag	the note"*) ;; *) bad "review did not record the flag and its note" ;; esac
    case "$got" in *"enc-1	ok"*) ;; *) bad "review did not record a plain correct" ;; esac
    case "$got" in *"enc-2	ok	a comment"*) ;; *) bad "review did not record a comment on a correct item" ;; esac
    #  COUNT DISTINCT KEYS, not lines. A flag or a comment now writes the
    #  verdict first and the note second, so an annotated claim is two
    #  rows and the later one supersedes -- which is what keeps the
    #  judgement when the reviewer interrupts at the note prompt. Three
    #  keypresses must still be three ANSWERS.
    n=$(cut -f1 "$RVH/review.tsv" | sort -u | wc -l | tr -d ' ')
    [ "$n" = 3 ] || bad "review recorded $n answers from three keypresses"
    ok "the review session records what a person actually types"
  else
    bad "the review session recorded nothing at all"
  fi
  #  and resuming picks up where it stopped rather than starting again
  #  ">/dev/null" and not "| head -0": head -0 is a GNU extension, macOS
  #  head calls it an illegal line count, and under set -e that error
  #  killed the whole suite one line before its summary.  It had been
  #  there for weeks; nothing noticed, because nothing ran on a Mac.
  nx=$(COLREGS_HOME="$RVH" COLREGS_AWK="$AW" $SH ./bin/colregs review </dev/null >/dev/null 2>&1
       $AW -f src/colregs/engine.awk -f src/colregs/contacts.awk -f src/colregs/review.awk \
           -v cmode=plain -v cmd=rvnext -v rfile="$RVH/review.tsv" </dev/null)
  check "review resumes at the next unanswered claim" "enc-3" "$nx"

  #  A flagged item must survive the round trip into the issue link and
  #  back out again, byte for byte - a review is somebody's careful work.
  RVT="$tmp/rv.tsv"
  printf 'enc-12\tflag\tthe semicolon splits option b\nlig-3\tok\t\n' > "$RVT"
  RVB="$tmp/rv.body"
  $AW -f src/colregs/engine.awk -f src/colregs/contacts.awk -f src/colregs/review.awk \
      -v cmode=plain -v cmd=rvreport -v rfile="$RVT" -v rvver=test </dev/null > "$RVB"
  grep -q "enc-12" "$RVB" || bad "the report does not name the flagged item"
  grep -q "the semicolon splits option b" "$RVB" || bad "the report drops the reviewer's note"
  grep -q "program says" "$RVB" || bad "the report does not carry what the program claims"
  U=$($AW -f src/colregs/engine.awk -f src/colregs/contacts.awk -f src/colregs/review.awk \
      -v cmode=plain -v cmd=rvurl -v rfile="$RVT" -v rbody="$RVB" </dev/null)
  case "$U" in https://github.com/*/bashnav/issues/new*) ;;
               *) bad "the review link is not a github issue url" ;; esac
  case "$U" in *" "*) bad "the review link contains a raw space" ;; esac
  #  decode it back and compare with the file it was built from
  echo "$U" | sed 's/.*&body=//' | $AW '
    BEGIN{ for(i=0;i<256;i++) o[sprintf("%c",i)]=i
           for(i=0;i<256;i++) h[sprintf("%02X",i)]=sprintf("%c",i) }
    { r=""
      for(i=1;i<=length($0);i++){ c=substr($0,i,1)
        if(c=="%"){ r=r h[substr($0,i+1,2)]; i+=2 } else r=r c }
      printf "%s", r }' > "$tmp/rv.back"
  if cmp -s "$RVB" "$tmp/rv.back"; then ok "a review round-trips through the issue link unchanged"
  else bad "the review link does not decode back to the report"; fi

  # ---- separator collisions ----------------------------------------
  #  Every table is a delimited string; a delimiter inside a field splits
  #  it silently. Encounters 13 and 14 shipped with five options and the
  #  right answer cut in half because of exactly this.
  r=$($AW $CSRC -v cmode=plain -f tests/fields-check.awk </dev/null)
  n=$(echo "$r" | tail -1)
  if [ "$n" = 0 ]; then ok "no table field is split by its own separator"
  else bad "$n split fields"; echo "$r" | grep -v '^[0-9]*$' | head -6; fi

  # ---- the light tables against Annex I ----------------------------
  #  Not whether a vessel shows the right lights - that needs a person
  #  with the Convention. Only the parts that are geometry: pairs, arcs,
  #  heights and the circle adding up.
  r=$($AW $CSRC -f tests/annex1-check.awk -v cmode=plain </dev/null)
  n=$(echo "$r" | tail -1)
  if [ "$n" = 0 ]; then ok "light tables satisfy Annex I where it is checkable"
  else bad "$n Annex I violations"; echo "$r" | grep '^FAIL' | head -8; fi

  # ---- the iPad installer is the build that is in the repository -----
  #  release/bashnav-ipad.sh is the one file that reaches the iPad, and
  #  it is assembled from src/ by release/make-ipad.sh -- which build.sh
  #  does NOT run. tests/ipad-install-check.sh regenerates it and tests
  #  what it regenerated, so a STALE committed bundle passed every check
  #  there was: the suite was testing a file it had just rebuilt and
  #  nobody compared it with the one in the repository. Commit without
  #  running the suite and the iPad gets the previous build, on the
  #  platform this project exists for.
  r=$(sh release/make-ipad.sh 2>&1 >/dev/null || echo FAILED)
  case "$r" in *FAILED*) bad "the iPad bundle does not assemble"; echo "    $r" ;; *)
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
      say "  --    the iPad bundle assembles, but comparing it needs a git checkout"
    elif git diff --quiet -- release/bashnav-ipad.sh 2>/dev/null; then
      ok "release/bashnav-ipad.sh is what src/ assembles to"
    else
      bad "the iPad bundle is stale -- run sh release/make-ipad.sh and commit it"
      git diff --stat -- release/bashnav-ipad.sh | head -2
    fi ;;
  esac

  # ---- celnav's teaching track in the browser ------------------------
  #  The thirty-three lessons are generated from teach.awk the way the
  #  contacts lessons are, so this regenerates and compares: a change to
  #  a lesson that has not been dumped fails here. The first run of that
  #  generator produced all thirty-three lessons with NO question,
  #  because the rule before the question was matched with an interval
  #  expression and mawk -- which the generator picks first -- does not
  #  implement {n,m}. CLAUDE.md rule 1, and the suite's own check for it.
  r=$(sh docs/web/celnav/gen/make-celnav-web.sh 2>&1 >/dev/null || echo FAILED)
  case "$r" in *FAILED*) bad "the celnav web generator does not run"; echo "    $r" ;; *)
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
      say "  --    celnav's lessons regenerate, but comparing them needs a git checkout"
    elif git diff --quiet -- docs/web/celnav/lessons.js 2>/dev/null; then
      ok "docs/web/celnav/lessons.js is what teach.awk prints (33 lessons, 9 modules, 10 walkthrough steps)"
    else
      bad "celnav's lessons.js is not what teach.awk prints -- run docs/web/celnav/gen/make-celnav-web.sh"
      git diff --stat -- docs/web/celnav/lessons.js | head -2
    fi ;;
  esac

  #  and the three things generation cannot check: the words surviving
  #  the reflow, the figures that are tables keeping their columns, and
  #  every one of the ten figure gaps saying what belongs in it. That
  #  last one fails when a lesson gains a figure and nobody names it,
  #  which is what happens as the drawings land module by module.
  if command -v node >/dev/null 2>&1; then
    if r=$(node tests/celnav-lessons-check.js 2>&1); then
      ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
    else
      bad "celnav's lessons lose words, flow a table, or have an unnamed figure gap"
      echo "$r" | head -8
    fi
  else
    say "  --    the celnav lesson check needs node, skipped"
  fi

  # ---- the web build is the same build ------------------------------
  #  Larry, drilling the browser app after the shell fixes were pushed:
  #  "Souldint it be the same? No more half measures please."
  #
  #  Three things have to hold for that to be true rather than claimed,
  #  and none of them was checked before 22 October 2026.
  #
  #  1. THE CONTENT COMES FROM ONE PLACE. data.js says "regenerate ... so
  #     the two cannot drift" and the generator was not in the repository.
  #     It is now, and this regenerates and compares: a change to the
  #     engine's tables that has not been dumped fails here.
  r=$(sh docs/web/colregs/gen/make-colregs-web.sh 2>&1 >/dev/null || echo FAILED)
  case "$r" in *FAILED*) bad "the colregs web generator does not run"; echo "    $r" ;; *)
    #  the comparison is against what is COMMITTED, so it needs a checkout;
    #  outside one the generator having run at all is all that can be said
    #  BOTH FILES THE GENERATOR WRITES. contacts-lessons.js was typed by
    #  hand on 23 October 2026 and the prose came across verbatim -- but
    #  it carried the row of dashes the terminal draws under a heading
    #  into the page, and nothing could have told me: the only check on
    #  it was reading it. It is generated now, and compared here.
    #  ONE CASE THIS CANNOT SEE, and it is in the shape of the check:
    #  the generator runs first and overwrites the working tree, so a
    #  hand-edit of a generated file that has not been committed is
    #  destroyed by this run rather than reported by it. A hand-edit that
    #  reaches a commit does fail here -- all three faults were planted
    #  and reproduced. Do not read a pass as "nobody hand-edited it".
    gw=docs/web/colregs/data.js
    gc="docs/web/colregs/contacts-lessons.js docs/web/colregs/contacts-card.js"
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
      say "  --    the web data regenerates, but comparing it needs a git checkout"
    elif git diff --quiet -- "$gw" $gc 2>/dev/null; then
      ok "the colregs web data is what the engine dumps (tables, 7 lessons, the card)"
    else
      bad "the web data is not what the engine dumps -- run docs/web/colregs/gen/make-colregs-web.sh"
      git diff --stat -- "$gw" $gc | head -3
    fi ;;
  esac

  #  ---- weather's and deck-log's generated files ---------------------
  #  These two generators had no regenerate-and-compare at all, and
  #  docs/web/weather/lessons.js had gone stale as a result: the committed
  #  file was missing a whole passage of the Coriolis lesson that
  #  src/weather prints. It was found only because an unrelated change
  #  made every generator run - which is the argument for these two checks
  #  rather than for being more careful.
  #
  #  The file lists are explicit, like the colregs one above, and for the
  #  same reason: docs/web/<tool>/ also holds the hand-written app, and a
  #  whole-directory diff would report an ordinary edit to a page as the
  #  generator disagreeing with itself. The cost is that a generated file
  #  added later is not covered until it is named here.
  r=$(sh docs/web/weather/gen/make-weather-web.sh 2>&1 >/dev/null || echo FAILED)
  case "$r" in *FAILED*) bad "the weather web generator does not run"; echo "    $r" ;; *)
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
      say "  --    weather's lessons regenerate, but comparing them needs a git checkout"
    elif git diff --quiet -- docs/web/weather/lessons.js 2>/dev/null; then
      ok "docs/web/weather/lessons.js is what the weather lessons print"
    else
      bad "weather's lessons.js is not what src/weather prints -- run docs/web/weather/gen/make-weather-web.sh"
      git diff --stat -- docs/web/weather/lessons.js | head -2
    fi ;;
  esac

  r=$(sh docs/web/deck-log/gen/make-decklog-web.sh 2>&1 >/dev/null || echo FAILED)
  case "$r" in *FAILED*) bad "the deck-log web generator does not run"; echo "    $r" ;; *)
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
      say "  --    deck-log's menus regenerate, but comparing them needs a git checkout"
    elif git diff --quiet -- docs/web/deck-log/menus.js 2>/dev/null; then
      ok "docs/web/deck-log/menus.js is what screens.awk dumps"
    else
      bad "deck-log's menus.js is not what screens.awk dumps -- run docs/web/deck-log/gen/make-decklog-web.sh"
      git diff --stat -- docs/web/deck-log/menus.js | head -2
    fi ;;
  esac

  #  2. THE SHARED FUNCTIONS AGREE, over their whole input range and not
  #     at a sample. This is the check the web README has always described
  #     and never contained.
  if r=$(sh tests/colregs-web-diff.sh 2>&1); then
    case "$r" in
      *SKIPPED*) say "  --    the web/shell diff needs node, skipped" ;;
      *) ok "$(echo "$r" | sed -n 's/^  ok  *//p')" ;;
    esac
  else
    bad "the web and shell colregs disagree"; echo "$r" | head -6
  fi

  #  2b. THE FIGURES DRAW, AND EVERY COLOUR THEY USE IS DEFINED. The
  #     contacts plots and the compass rose take their colours from
  #     classes in colregs.css instead of reading the custom properties
  #     at draw time, so they follow the night toggle with no redraw --
  #     and so a mistyped class is a silently unstyled element rather
  #     than an error. Drawn the other way they came out blue and green
  #     on the red night palette, and only rendering all three and
  #     looking at them found it.
  if command -v node >/dev/null 2>&1; then
    if r=$(node tests/contacts-figs-check.js 2>&1); then
      ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
    else
      bad "a contacts figure does not draw, or uses a colour nothing defines"
      echo "$r" | head -6
    fi
  else
    say "  --    the contacts figure check needs node, skipped"
  fi

  #  2c. THE REFLOW KEEPS EVERY WORD, AND HOLDS WHAT HAS COLUMNS IN IT.
  #     The lessons were written for a terminal and carry hard breaks at
  #     72 columns; the browser drops them and wraps for itself, except
  #     where the breaks are the layout. Two silent failures: a word lost
  #     when lines are joined, and a table flowed into a paragraph. The
  #     second test uses its own idea of what a table is -- three spaces
  #     inside a line -- rather than asking the renderer whether it
  #     agrees with itself.
  if command -v node >/dev/null 2>&1; then
    if r=$(node tests/prose-reflow-check.js 2>&1); then
      ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
    else
      bad "the lesson reflow loses words, or flows a paragraph it should hold"
      echo "$r" | head -8
    fi
  else
    say "  --    the prose reflow check needs node, skipped"
  fi

  #  3. A CHANGED WEB APP MOVES ITS CACHE. The worker is cache-first, so a
  #     build shipped without bumping the cache reaches nobody who has
  #     opened the page before -- which is exactly what happened: Larry
  #     reloaded repeatedly against colregs-v1, which had never moved.
  #
  #     THIS WAS WRITTEN FOR COLREGS ALONE, and drill later got its own
  #     copy of it, and the fault then happened twice more in the two
  #     apps that had neither: celnav shipped a sight-reduction screen and
  #     two arithmetic fixes at celnav-v3 while displaying "build 8", and
  #     weather shipped at weather-v3 displaying "build 2". Larry found
  #     both the only way they can be found - by opening the app and
  #     seeing the old one. So it runs over EVERY app now. A check written
  #     for one tool, when the fault class belongs to all of them, is a
  #     check that will be needed again somewhere it is not.
  bc=0
  for swf in docs/web/*/sw.js; do
    ad=$(dirname "$swf"); an=$(basename "$ad")
    ac=$(sed -n "s/.*CACHE = '$an-v\([0-9][0-9]*\)'.*/\1/p" "$swf" | head -1)
    af=$(grep -l 'BUILD *=' "$ad"/*.js 2>/dev/null | head -1)
    if [ -z "$ac" ]; then bad "$an: no $an-v<n> cache version in sw.js"; bc=1; continue; fi
    if [ -z "$af" ]; then bad "$an: no BUILD constant to compare with $an-v$ac"; bc=1; continue; fi
    ab=$(sed -n "s/.*BUILD *= *'*\([0-9][0-9]*\).*/\1/p" "$af" | head -1)
    if [ -z "$ab" ] || [ "$ab" != "$ac" ]; then
      bad "$an build '$ab' and cache '$an-v$ac' disagree -- an installed copy would keep the old app"
      bc=1
    fi
  done
  [ "$bc" = 0 ] && ok "every web app's displayed build matches its cache version (6 apps)"

  #  and the version agreeing with the BUILD label is not enough: the
  #  label can be bumped while a served file is left out of the bump, or
  #  a file can change in a later commit that touches nothing else. This
  #  compares the files each worker PRECACHES against the commit that set
  #  its current cache value - sh and git only, so once per run.
  if [ "$AW" != "$FIRSTAWK" ]; then :
  else
    if o=$(sh tests/sw-cache-check.sh 2>&1); then
      case "$o" in
        *"SWCACHE SKIP"*) say "  --    comparing served files to the cache bump needs a git checkout" ;;
        *) ok "every served file has reached its app's cache since the last bump" ;;
      esac
    else
      printf '%s\n' "$o" | grep -v '^SWCACHE'
      bad "a served file changed without its app's cache version moving"
    fi
  fi

  # ---- every service worker evicts only its own caches ---------------
  #  caches.delete() is ORIGIN-wide, not scope-wide. Seven tools share
  #  bashnav.navigationtools.org and every one of their workers used to activate
  #  with "delete every cache that is not mine", so each evicted all the
  #  others. Measured in a browser against the published layout: visit
  #  colregs, then drill, and colregs' cache is gone -- and it does NOT
  #  come back, because install runs once per worker version, so that
  #  tool is silently online-only from then on. These tools exist to work
  #  at sea with no signal; that was the whole promise, and only the
  #  last tool visited kept it.
  #
  #  Each worker now deletes only its own family, derived from CACHE so
  #  there is no second constant to drift. Both halves were confirmed in
  #  a browser: the families coexist, and a tool's own older version is
  #  still evicted when its CACHE moves.
  swbad=0
  for f in $(find docs/web -name sw.js | sort); do
    grep -q 'k => k !== CACHE' "$f" && {
      swbad=$((swbad+1)); echo "    $f deletes every cache on the origin, not only its own"; }
    grep -q 'const FAMILY' "$f" || {
      swbad=$((swbad+1)); echo "    $f declares no FAMILY to scope its eviction to"; }
    #  and the family must be this tool's CACHE with the version stripped
    fc=$(sed -n "s/.*const CACHE = '\([^']*\)'.*/\1/p" "$f" | head -1)
    ff=$(sed -n "s/.*const FAMILY = '\([^']*\)'.*/\1/p" "$f" | head -1)
    want=$(echo "$fc" | sed 's/-v[0-9][0-9]*$/-/')
    [ "$ff" = "$want" ] || {
      swbad=$((swbad+1)); echo "    $f: FAMILY '$ff' does not match CACHE '$fc'"; }
  done
  nsw=$(find docs/web -name sw.js | wc -l | tr -d ' ')
  if [ "$swbad" = 0 ]; then ok "all $nsw service workers evict only their own caches"
  else bad "$swbad service-worker eviction fault(s) -- tools will delete each other's offline copy"; fi

  # ---- an app with no worker is an app that no worker check sees ----
  #  Every check above walks docs/web/*/sw.js. A directory that serves a
  #  page and ships no worker is therefore skipped by all of them in
  #  silence: it is online-only at sea, and the suite says nothing. That
  #  is the exact shape this project refuses -- a check that stops
  #  checking. So a served page with no worker must be named here, one
  #  at a time, with its reason; anything else is a fault.
  nowork=0
  for d in docs/web/*/; do
    [ -f "${d}index.html" ] || continue
    [ -f "${d}sw.js" ] && continue
    case $(basename "$d") in
      #  platform/ is the window-control probe. It measures what the
      #  platform tells a web app, and a cached probe is a lying probe.
      platform) ;;
      *) nowork=$((nowork+1))
         echo "    ${d} serves a page with no sw.js -- offline-dead, and no sw check above sees it" ;;
    esac
  done
  if [ "$nowork" = 0 ]
  then ok "every served page has a worker, or is named here as deliberately without one"
  else bad "$nowork served page(s) have no service worker"; fi

  # ---- a script you are told to run with ./ can be run with ./ -------
  #  CLAUDE.md's two-line version is "./build.sh" and
  #  "./tests/run-tests.sh", and run-tests.sh was the one file in the
  #  repository without its execute bit -- every other script is 100755.
  #  So the first thing the handover tells a newcomer to type answered
  #  "permission denied", which is how Larry found it. Documentation and
  #  file mode are two places to say the same thing, so they are checked
  #  against each other rather than kept in step by hand.
  xbad=0; xn=0
  for f in $(grep -rhoE '\./[A-Za-z0-9_./-]+\.sh' CLAUDE.md docs/*.md README.md 2>/dev/null \
             | sed 's|^\./||' | sort -u); do
    [ -f "$f" ] || continue
    xn=$((xn+1))
    if [ ! -x "$f" ]; then
      bad "$f is run as ./$f in the documentation but is not executable"
      xbad=1
    fi
  done
  [ "$xbad" = 0 ] && ok "all $xn scripts the docs tell you to run with ./ are executable"

  # ---- every service worker caches what its page loads ---------------
  #  The eviction check above makes sure a tool keeps its cache. This
  #  one makes sure the cache is worth keeping: a file the page loads
  #  and the worker does not precache is fetched from the network on
  #  first use, which at sea means never. It found two on the day it
  #  was written -- celnav's calib.js and plot.js, missing since they
  #  were added to the page, so the camera calibration and the plot
  #  sheet were both online-only.
  if r=$(sh tests/sw-precache-check.sh 2>&1); then
    ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
  else
    bad "a web tool does not precache everything its page loads"
    echo "$r" | head -8
  fi

  # ---- the drill app ------------------------------------------------
  #  drill's BUILD-and-cache check has gone: it was a second copy of the
  #  colregs one, and both are now the loop over every app above.
  #
  #  1. EVERY MARK THE CODE SETS HAS A COLOUR.  Larry, after putting the
  #     last two steps of the hoist the wrong way round: "I got the order
  #     wrong, but it gave me all green." He had, and it was scored
  #     wrong -- but the rows he placed carried no mark and there was no
  #     .seq-row[data-mark="wrong"] rule in the stylesheet at all, so a
  #     wrong order rendered in the accent colour beside the right order
  #     in green. A mark the code sets and the stylesheet does not paint
  #     is invisible, which is the same as not marking it.
  mbad=0
  for cls in choice seq-row; do
    for mk in right wrong; do
      grep -q "\.$cls\[data-mark=\"$mk\"\]" docs/web/drill/drill.css || {
        mbad=$((mbad+1)); echo "    no colour for .$cls[data-mark=\"$mk\"]"; }
    done
  done
  #  and the ordering question must actually set both marks on the rows
  #  the reader placed, not only on the answer printed underneath
  grep -q "picked.querySelectorAll('.seq-row')" docs/web/drill/drill.js || {
    mbad=$((mbad+1)); echo "    the rows the reader placed are never marked"; }
  if [ "$mbad" = 0 ]; then ok "every mark the drill sets has a colour, and a placed row gets one"
  else bad "$mbad drill mark(s) are set but never painted"; fi

  # ---- every scenario must also EXIT cleanly -----------------------
  #  Found the hard way: handing the unset array element a[10] straight to
  #  a function argument aborted gawk on exit -- "free(): double free
  #  detected in tcache" -- AFTER printing the whole scenario correctly.
  #  27 of 30 scenarios, every power-driven one. Nothing that looks at
  #  OUTPUT could see it; only the exit status could.
  nbad=0; nscen=0
  for i in $(seq 1 40); do
    #  `&& rc=0 || rc=$?` rather than `|| true`: the loop deliberately
    #  runs past the end, so set -e has to be kept off its back WITHOUT
    #  throwing away the exit status, which is the one thing this loop
    #  exists to look at.
    o=$($AW $CSRC -v cmode=plain -v cmd=enc -v which=$i -v seed=3 </dev/null 2>/dev/null) && rc=0 || rc=$?
    [ -z "$o" ] && continue
    nscen=$((nscen+1))
    [ "$rc" -ne 0 ] && { nbad=$((nbad+1)); echo "    scenario $i exited $rc"; }
    #  and the lights view for the same scenario, which is reached from
    #  the encounter flow and has its own unset-field paths
    o=$($AW $CSRC -v cmode=plain -v cmd=enclights -v which=$i -v seed=3 </dev/null 2>/dev/null) && rc=0 || rc=$?
    [ "$rc" -ne 0 ] && { nbad=$((nbad+1)); echo "    scenario $i lights exited $rc"; }
    [ -z "$o" ] && { nbad=$((nbad+1)); echo "    scenario $i lights printed nothing"; }
  done
  #  and the COUNT is part of the check: the loop runs past the end on
  #  purpose, and a scenario number that does not exist must refuse
  #  rather than draw an empty plan. It drew one until 22 October, so
  #  this loop said "all 40" when there are 28.
  if [ "$nbad" != 0 ]; then bad "$nbad scenario(s) printed correctly and then died"
  elif [ "$nscen" != 28 ]; then bad "$nscen scenarios answered, expected 28 -- out-of-range numbers are being drawn"
  else ok "all $nscen scenarios exit cleanly, and 29 upwards are refused"; fi

  # ---- every encounter's vessel key ------------------------------
  if r=$($AW $CSRC -f tests/colregs-vessel.awk -v cmode=plain </dev/null); then
    echo "$r" | grep '^  ok' >/dev/null && ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
  else
    bad "an encounter names a vessel that is not in the table"; echo "$r" | grep FAIL | head -4
  fi
  #  and the browser must see the same keys, from the same dump
  r=$(node -e '
    const fs=require("fs"), s=fs.readFileSync("docs/web/colregs/data.js","utf8");
    const d=JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}")+1));
    const keys=new Set(d.vessels.map(v=>v.key));
    const bad=d.encounters.filter(e=>e.vessel!==undefined && !keys.has(e.vessel));
    const none=d.encounters.filter(e=>e.vessel===undefined).length;
    console.log(bad.length+" "+none);
  ' 2>/dev/null || echo "x x")
  case "$r" in
    "0 3") ok "every encounter vessel in data.js resolves, and 3 have none" ;;
    "x x") ok "(node absent: skipped the data.js vessel-key check)" ;;
    *)     bad "data.js encounter vessels: $r (want \"0 3\")" ;;
  esac

  # ---- the browser contacts against the shell contacts ---------------
  #  The contacts module was shell-only until the port began. It is the
  #  tracking-party material -- relative motion, bearing drift, Ekelund
  #  -- and the port is verified the same way the rest of the browser
  #  build is: by running both over their whole input range and diffing,
  #  not by reading them side by side. The first draft read correctly
  #  and failed on ct_yd.
  if r=$(sh tests/contacts-web-diff.sh 2>&1); then
    echo "$r" | grep -q '^  ok' && ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
    echo "$r" | grep -q '^SKIPPED' && say "  --    ${r#SKIPPED -- }"
  else
    bad "the browser and shell contacts disagree"; echo "$r" | head -6
  fi

  # ---- a give-way call answers what she IS --------------------------
  if r=$($AW $CSRC -f tests/colregs-r18.awk -v cmode=plain </dev/null); then
    echo "$r" | grep '^  ok' >/dev/null && ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
  else
    bad "a give-way call ignores her standing under Rule 18"
    echo "$r" | grep FAIL | head -4
  fi

  # ---- a reviewer's judgement survives the prompt -------------------
  #  Three marks Larry made never reached review.tsv: he pressed the key,
  #  then interrupted at the note prompt to copy the screen, and SIGINT
  #  killed the script before the save ran.
  #  Shell-only, once per shell: it is signal handling and `read` that
  #  are under test, and it spends real seconds waiting for a blocked
  #  read in each of three cases -- the awk underneath cannot change the
  #  answer, and running it for every awk as well costs a minute a run.
  if [ "$AW" != "$FIRSTAWK" ]; then :
  else
    guard 90 sh tests/review-durability.sh "$SH" "$AW" || :
    o=$(cat "$GUARD_OUT" 2>/dev/null)
    case $o in
      *SKIP*)    say "  --    review durability needs a fifo; skipped here" ;;
      *"BAD 0"*) ok "a review verdict reaches disk before the note is asked for, and skip advances" ;;
      *) bad "a review mark can be lost"; echo "$o" | grep -E "FAIL" | head -4 ;;
    esac
  fi

  # ---- an aspect that cannot be read is not claimed ------------------
  #  Five vessels show only all-round lights at every bearing, and the
  #  aspect line was stated from the true bearing regardless -- in the
  #  quiz reveal, as the answer.
  if r=$($AW $CSRC -f tests/aspect-check.awk -v cmode=plain </dev/null); then
    echo "$r" | grep '^  ok' >/dev/null && ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
  else
    bad "an aspect is claimed that her lights cannot give"
    echo "$r" | grep -A1 FAIL | head -6
  fi

  # ---- the words match the display ---------------------------------
  #  The give-way explanation says what she shows; the drawing shows what
  #  bears. Nothing compared the two until Larry found three claims in a
  #  row where they disagreed.
  if r=$($AW $CSRC -f tests/motion-seen-check.awk -v cmode=plain </dev/null); then
    echo "$r" | grep '^  ok' >/dev/null && ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
  else
    bad "a give-way call names a light you cannot see, or misses one you can"
    echo "$r" | grep -A1 FAIL | head -8
  fi

  # ---- one bearing per scenario, stated by the stem ----------------
  if r=$($AW $CSRC -f tests/colregs-bearing.awk -v cmode=plain </dev/null); then
    echo "$r" | grep '^  ok' >/dev/null && ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
  else
    bad "a scenario states a bearing that its own stem will state again, differently"
    echo "$r" | grep FAIL | head -4
  fi

  # ---- the sailing scenarios' wind --------------------------------
  #  Larry, drilling scenario 12: "wind dir not shown". Rule 12 is decided
  #  by which side the wind is on, so a scenario naming windward and
  #  leeward has to draw it. The bearing and heading are randomised per
  #  seed, so one wind value has to hold across the whole range -- and a
  #  value that looks right in the first case can contradict the words in
  #  the last. Confirmed to fail on a wind put on the wrong side and on
  #  the field removed.
  if r=$($AW $CSRC -f tests/colregs-wind.awk -v cmode=plain </dev/null); then
    echo "$r" | grep '^  ok' >/dev/null && ok "$(echo "$r" | sed -n 's/^  ok  *//p')"
  else
    bad "a sailing scenario contradicts its own wind"; echo "$r" | grep FAIL | head -4
  fi

  # ---- the reporting style -----------------------------------------
  CT="$CSRC"      # the tool loads all three; so must every test
  #  Every style must produce a report, and each must be its own words.
  prev=""
  for st in rn usn rel360 words none; do
    r=$($AW $CT -v cmode=plain -v rstyle=$st -v cmd=cref </dev/null | grep "Master 2")
    case "$st" in
      rn)     case "$r" in *"Red 20"*) ;; *) bad "style rn does not say Red 20" ;; esac ;;
      usn)    case "$r" in *"Port 20"*) ;; *) bad "style usn does not say Port 20" ;; esac ;;
      rel360) case "$r" in *"340 relative"*) ;; *) bad "style rel360 is wrong" ;; esac ;;
      words)  case "$r" in *"fine on the port bow"*) ;; *) bad "style words is wrong" ;; esac ;;
      none)   case "$r" in *Red*|*Port*|*relative*|*bow*) bad "style none still gives a relative bearing" ;; esac ;;
    esac
    [ "$r" = "$prev" ] && bad "style $st is identical to the one before it"
    prev="$r"
  done
  ok "all five reporting styles say the same angle their own way"
  #  and the setting must survive being written and read back
  CS=$(mktemp -d)
  COLREGS_HOME="$CS" COLREGS_AWK="$AW" $SH ./bin/colregs style usn >/dev/null 2>&1
  r=$(COLREGS_HOME="$CS" COLREGS_AWK="$AW" $SH ./bin/colregs card 2>/dev/null | grep -c "Port 20" || true)
  check "the reporting style persists between runs" "1" "$r"
  r=$(COLREGS_HOME="$CS" COLREGS_AWK="$AW" $SH ./bin/colregs day >/dev/null 2>&1
      COLREGS_HOME="$CS" COLREGS_AWK="$AW" $SH ./bin/colregs card 2>/dev/null | grep -c "Port 20" || true)
  check "changing the colour mode does not lose the reporting style" "1" "$r"
  rm -rf "$CS"

  # ---- contacts ----------------------------------------------------
  CTC="$CT -f tests/contacts-check.awk"
  for L in C1 C2 C3 C4 C5 C6 C7; do
    n=$($AW $CT -v cmode=plain -v cmd=clesson -v les_id=$L </dev/null | wc -l)
    [ "$n" -gt 12 ] || bad "contacts lesson $L is thin or empty"
  done
  ok "seven contacts lessons render"
  nb=$($AW $CTC -v cmode=plain -v what=relbrg </dev/null)
  check "Red/Green and the words agree, on both sides, at every degree" "0" "$nb"
  n=$($AW $CT -v cmode=plain -v cmd=clesson -v les_id=C7 </dev/null | grep -c "never across a turn" || true)
  check "C7 warns that drift cannot be read across a turn" "1" "$n"
  n=$($AW $CT -v cmode=plain -v cmd=cref </dev/null | grep -c "passes ASTERN" || true)
  check "the contacts card renders" "1" "$n"

  out=$($AW $CTC -v cmode=plain -v what=mark </dev/null)
  ns=$(echo "$out" | sed -n 's/^SEEDS //p')
  n3=$(echo "$out" | grep -c "3 of 3" || true)
  check "the tracking exercise marks its own answers correctly" "$ns" "$n3"
  n0=$($AW $CTC -v cmode=plain -v what=markwrong </dev/null | grep -c "3 of 3" || true)
  check "the tracking exercise fails a wrong answer" "0" "$n0"

  #  The claim the section rests on: drift away from your bow can never
  #  cross ahead. If that is ever false, the lessons are teaching a lie.
  out=$($AW $CTC -v cmode=plain -v what=drift </dev/null)
  nn=${out%% *}; nb=${out##* }
  check "drift toward the bow always crosses ahead ($nn geometries)" "0" "$nb"

  out=$($AW $CTC -v cmode=plain -v what=ekelund </dev/null)
  nn=${out%% *}; nw=${out##* }
  if $AW -v w="$nw" 'BEGIN{exit !(w<0.07)}' </dev/null; then
    ok "Ekelund recovers the true range ($nn leg pairs, worst $nw)"
  else bad "Ekelund error $nw is too large"; fi

  # ---- the quiz must not give away what it is asking --------------
  e=$($AW $CSRC -v cmd=qlight -v seed=4242 -v cmode=plain </dev/null | grep -c 'You are ' || true)
  check "lights quiz does not tell you the aspect" "0" "$e"
  e=$($AW $CSRC -v cmd=light -v key=sail -v th=300 -v cmode=plain </dev/null | grep -c 'You are ' || true)
  check "the lights reference still tells you the aspect" "1" "$e"
 done
done

say ""
if [ "$fail" -eq 0 ]; then say "ALL TESTS PASSED"; exit 0; fi
say "$fail FAILURE(S)"
exit 1

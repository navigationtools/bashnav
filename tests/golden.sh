#!/bin/sh
#  Golden-file regression for colregs and celnav.
#
#  The other suite checks that the machinery works. This one checks that
#  the OUTPUT has not changed: every deterministic screen the tools can
#  produce is captured as text and committed. A change to the code that
#  alters what a user sees then shows up as a readable diff, and has to
#  be looked at and accepted on purpose rather than slipping through.
#
#    tests/golden.sh            compare against the committed files
#    tests/golden.sh --update   rewrite them (read the diff first)
#
#  It cannot tell you whether the output is CORRECT - only whether it is
#  the same as it was. Correctness of the rules themselves is a job for
#  a human with a copy of the Convention; see tests/REVIEW.md.
set -e
cd "$(dirname "$0")/.."
AW=${GOLDEN_AWK:-awk}
G=tests/golden
E="-f src/colregs/engine.awk -f src/common/bearing.awk -f src/colregs/contacts.awk"
CE="-f src/celnav/engine.awk"
CT="-f src/celnav/engine.awk -f src/celnav/teach.awk"
mode=compare
[ "$1" = "--update" ] && mode=update
out=$(mktemp -d); trap 'rm -rf "$out"' EXIT

emit() {   # emit <name> ; program output on stdin
  cat > "$out/$1"
}

# ---- colregs: the rule-number drill, both directions ------------------
#  Anchored at fixed seeds so a change to the fifteen pairs, to the
#  shuffle, or to either question frame shows up as a diff rather than as
#  a question nobody notices is wrong.  The reveal is captured too, since
#  it is where the lesson cross-reference lives.
{
  for sd in 1 2 3 5 7 11 13 17 19 23 29 31; do
    echo "=== qrule $sd ==="
    $AW $E -v cmode=plain -v cmd=qrule -v seed="$sd" </dev/null
    echo "=== qrulem $sd a ==="
    $AW $E -v cmode=plain -v cmd=qrulem -v seed="$sd" -v ans=a </dev/null || true
  done
  echo "=== syllabus ==="
  $AW $E -v cmode=plain -v cmd=syllabus -v done=L1,L3,L10 </dev/null
} | emit rules.txt

# ---- colregs: every vessel, from every 30 degrees ---------------------
{
  for k in power50 power50p sail sailrg anchor anchor50 aground nuc nucway \
           ram draught trawl fishing pilot tow200 tow200p towed mineclear \
           hover sail7; do
    b=0
    while [ "$b" -lt 360 ]; do
      echo "=== light $k $b ==="
      $AW $E -v cmode=plain -v cmd=light -v key="$k" -v th="$b" -v reveal=1 </dev/null
      b=$((b+30))
    done
  done
} | emit lights.txt

{
  for k in anchor aground nuc ram draught motorsail fishing tow200p mineclear divers; do
    echo "=== shape $k ==="
    $AW $E -v cmode=plain -v cmd=shape -v key="$k" -v reveal=1 </dev/null
  done
} | emit shapes.txt

{
  for c in reflights refshapes sndtable colours cref; do
    echo "=== $c ==="
    $AW $E -v cmode=plain -v cmd="$c" </dev/null
  done
} | emit reference.txt

{
  for l in L1 L2 L3 L4 L5 L6 L7 L8 L9 L10 L11 L12 L13 L14 L15; do
    echo "=== lesson $l ==="
    $AW $E -v cmode=plain -v cmd=lesson -v les_id="$l" </dev/null
    for a in a b c d; do
      $AW $E -v cmode=plain -v cmd=check -v les_id="$l" -v ans="$a" </dev/null || true
    done
  done
} | emit lessons-rules.txt

{
  for l in C1 C2 C3 C4 C5 C6 C7; do
    echo "=== lesson $l ==="
    $AW $E -v cmode=plain -v cmd=clesson -v les_id="$l" </dev/null
  done
} | emit lessons-contacts.txt

#  Every encounter, with every answer marked, so a changed verdict shows
{
  n=1
  while [ "$n" -le 28 ]; do
    echo "=== encounter $n ==="
    $AW $E -v cmode=plain -v cmd=enc -v seed=1 -v which="$n" </dev/null
    for a in a b c d; do
      $AW $E -v cmode=plain -v cmd=encm -v seed=1 -v which="$n" -v ans="$a" </dev/null || true
    done
    n=$((n+1))
  done
} | emit encounters.txt

{
  s=1
  while [ "$s" -le 40 ]; do
    echo "=== qlight $s ==="
    $AW $E -v cmode=plain -v cmd=qlight -v seed="$s" </dev/null
    for a in a b c d; do
      $AW $E -v cmode=plain -v cmd=qlightm -v seed="$s" -v ans="$a" -v ans2="$a" </dev/null || true
    done
    s=$((s+1))
  done
} | emit quiz-lights.txt

{
  for q in qshape qsound; do
    s=1
    while [ "$s" -le 30 ]; do
      echo "=== $q $s ==="
      $AW $E -v cmode=plain -v cmd="$q" -v seed="$s" </dev/null
      for a in a b c d; do
        $AW $E -v cmode=plain -v cmd="${q}m" -v seed="$s" -v ans="$a" </dev/null || true
      done
      s=$((s+1))
    done
  done
} | emit quiz-shapes-sound.txt

{
  s=1
  while [ "$s" -le 20 ]; do
    echo "=== scenario $s ==="
    $AW $E -v cmode=plain -v cmd=scen -v seed="$s" </dev/null
    for a in a b c d; do
      $AW $E -v cmode=plain -v cmd=scenm -v seed="$s" -v a1="$a" -v a2="$a" -v a3="$a" </dev/null || true
    done
    $AW $E -v cmode=plain -v cmd=scenout -v seed="$s" -v ans=a </dev/null || true
    s=$((s+1))
  done
} | emit scenarios.txt

# ---- colregs: the lights each boat sees, and what governs -------------
#  Pinned across a spread of seeds wide enough to hit all nine scenario
#  classes.  The panel is pure geometry plus a verdict, and the geometry
#  is the part that would break silently: an arc boundary off by a degree,
#  or our aspect and hers transposed, reads perfectly plausibly and is
#  wrong.  Larry's own finding is in here too -- a vessel fishing or
#  restricted showing GREEN while still being the one you keep clear of.
{
  s=1
  while [ "$s" -le 60 ]; do
    echo "=== scenlights $s ==="
    $AW $E -v cmode=plain -v cmd=scenlights -v seed="$s" </dev/null || true
    s=$((s+1))
  done
  #  COVERAGE BY CONSTRUCTION, NOT BY LUCK.  "You overtaking her" is the
  #  rarest of the nine -- about one draw in thirteen -- and sixty
  #  consecutive seeds happened to contain none of it, which is exactly
  #  how a class goes dead without anyone noticing.  Seed 18 produces
  #  one, so it is pinned by name.
  for s in 18; do
    echo "=== scenlights $s (you overtaking her) ==="
    $AW $E -v cmode=plain -v cmd=scenlights -v seed="$s" </dev/null || true
  done
} | emit scenlights.txt

{
  for st in rn usn rel360 words none; do
    s=1
    while [ "$s" -le 12 ]; do
      echo "=== track $st $s ==="
      $AW $E -v cmode=plain -v rstyle="$st" -v cmd=track -v seed="$s" </dev/null
      $AW $E -v cmode=plain -v rstyle="$st" -v cmd=trackm -v seed="$s" \
            -v a1=a -v a2=a -v a3=a </dev/null || true
      s=$((s+1))
    done
  done
} | emit track.txt

{
  s=1
  while [ "$s" -le 30 ]; do
    echo "=== ekelund $s ==="
    $AW $E -v cmode=plain -v cmd=ek -v seed="$s" </dev/null
    $AW $E -v cmode=plain -v cmd=ekm -v seed="$s" -v ans=a </dev/null || true
    s=$((s+1))
  done
} | emit ekelund.txt

# ---- celnav: the numbers, which are the part that must not drift ------
{
  for d in "2026-01-01 00:00:00" "2026-06-21 12:00:00" "2027-03-15 18:30:00" \
           "2030-09-09 06:00:00" "2045-12-25 03:00:00"; do
    echo "=== almanac $d ==="
    $AW $CE -v cmode=plain -v cmd=almanac -v utc="$d" \
       -v bodies="sun,moon,venus,mars,jupiter,saturn,polaris,Sirius,Vega" </dev/null
  done
  echo "=== star list ==="
  $AW $CE -v cmode=plain -v cmd=stars -v utc="2026-06-21 12:00:00" </dev/null
  #  Worked fixes. These use the same three star sights as the known-fix
  #  assertion in run-tests.sh, which resolve to a real position close to
  #  the DR - so what is captured here is a sensible fix and not an
  #  arithmetic exercise on invented altitudes.
  sf=$(mktemp)
  printf '%s\n' \
    "2026-08-29 07:30:00|Dubhe|C|19 32.1|1.5|3.0|10|1010|" \
    "2026-08-29 07:34:00|Bellatrix|C|49 37.2|1.5|3.0|10|1010|" \
    "2026-08-29 07:38:00|Markab|C|29 01.3|1.5|3.0|10|1010|" > "$sf"
  echo "=== fix, three stars ==="
  $AW $CE -v cmode=plain -v cmd=reduce -v sfile="$sf" \
     -v drlat="35 00 N" -v drlon="040 00 W" -v course=0 -v speed=0 </dev/null
  echo "=== fix, same three on the run ==="
  $AW $CE -v cmode=plain -v cmd=reduce -v sfile="$sf" \
     -v drlat="35 00 N" -v drlon="040 00 W" -v course=250 -v speed=8 </dev/null
  #  one sight deliberately five miles out, to capture what the residuals
  #  and the ellipse say about a blunder
  printf '%s\n' \
    "2026-08-29 07:30:00|Dubhe|C|19 32.1|1.5|3.0|10|1010|" \
    "2026-08-29 07:34:00|Bellatrix|C|49 37.2|1.5|3.0|10|1010|" \
    "2026-08-29 07:38:00|Markab|C|29 06.3|1.5|3.0|10|1010|five miles out" > "$sf"
  echo "=== fix, with a blunder in it ==="
  $AW $CE -v cmode=plain -v cmd=reduce -v sfile="$sf" \
     -v drlat="35 00 N" -v drlon="040 00 W" -v course=0 -v speed=0 </dev/null
  #  two bodies close in azimuth, to capture the weak-cut warning
  printf '%s\n' \
    "2026-08-29 07:30:00|Dubhe|C|19 32.1|1.5|3.0|10|1010|" \
    "2026-08-29 07:34:00|Merak|C|22 10.0|1.5|3.0|10|1010|" > "$sf"
  echo "=== fix, weak cut ==="
  $AW $CE -v cmode=plain -v cmd=reduce -v sfile="$sf" \
     -v drlat="35 00 N" -v drlon="040 00 W" -v course=0 -v speed=0 </dev/null
  rm -f "$sf"
  echo "=== planning, twilight and the best three ==="
  $AW $CE -v cmode=plain -v cmd=plan -v utc="2026-06-21 21:00:00" \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" </dev/null
} | emit celnav-almanac.txt

# ---- celnav: local apparent noon -------------------------------------
#  The noon sight is the one reduction with no assumed position in it, so
#  the numbers come straight from the almanac and the geometry: a change
#  to either shows up here.  Four dates spread through the year catch the
#  equation of time at both its extremes, and the three positions catch
#  the three cases that differ in KIND, not degree -- the sun bearing
#  south of a northern observer, bearing north of a southern one, and
#  passing so close to the zenith that which side it stood is not
#  decidable from the DR, where the app has to say so rather than guess.
{
  for d in "2026-01-21" "2026-03-21" "2026-06-21" "2026-11-03"; do
    echo "=== noon $d  50 09 N 005 04 W ==="
    $AW $CE -v cmode=plain -v cmd=noon -v utc="$d" \
       -v drlat="50 09.0 N" -v drlon="005 04.0 W" </dev/null
    echo "=== noon $d  33 52 S 151 13 E ==="
    $AW $CE -v cmode=plain -v cmd=noon -v utc="$d" \
       -v drlat="33 52.0 S" -v drlon="151 13.0 E" </dev/null
    echo "=== noon $d  00 30 N 000 00 E ==="
    $AW $CE -v cmode=plain -v cmd=noon -v utc="$d" \
       -v drlat="00 30.0 N" -v drlon="000 00.0 E" </dev/null
  done
  echo "=== noon reduced from a real reading ==="
  $AW $CE -v cmode=plain -v cmd=noon -v utc="2026-10-21" \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" \
     -v hs="28 51.4" -v limb=L -v ie=0 -v heye=2.5 -v temp=10 -v press=1010 </dev/null
} | emit celnav-noon.txt

# ---- celnav: Polaris ---------------------------------------------------
#  The correction is a cosine of the LHA, so it must be swept rather than
#  sampled: six hours apart walks Polaris right round its circle and
#  catches both transits, where the correction is the whole polar
#  distance, and both sides, where it is nothing.  The last case feeds it
#  an altitude that implies a southern latitude, which is impossible for
#  this star and which the app has to say rather than return.
{
  for t in "2026-10-22 02:00:00" "2026-10-22 08:00:00" \
           "2026-10-22 14:00:00" "2026-10-22 20:00:00"; do
    echo "=== polaris $t ==="
    $AW $CE -v cmode=plain -v cmd=polaris -v utc="$t" -v drlon="005 04.0 W" </dev/null
    echo "=== polaris $t reduced ==="
    $AW $CE -v cmode=plain -v cmd=polaris -v utc="$t" -v drlon="005 04.0 W" \
       -v hs="50 18.5" -v ie=0 -v heye=2.5 -v temp=10 -v press=1010 </dev/null
  done
  echo "=== polaris from an impossible altitude ==="
  $AW $CE -v cmode=plain -v cmd=polaris -v utc="2026-10-22 20:00:00" \
     -v drlon="005 04.0 W" -v hs="-02 00.0" -v ie=0 -v heye=2.5 \
     -v temp=10 -v press=1010 </dev/null
} | emit celnav-polaris.txt

# ---- celnav: Pub. 249, generated, and the tutor -----------------------
#  THE TABLE IS GENERATED, so what has to be pinned is not a transcription
#  but the generator: a page in each hemisphere and for same and contrary
#  name, which is where the azimuth-angle rule changes.
#
#  Z is the part a reader gets wrong and the part a refactor can break
#  silently, because Hc does not move with it: cos(LHA) is even, so an
#  LHA of the wrong sign gives the same altitude and a reflected azimuth.
#  The entering arguments are captured for the same reason -- the assumed
#  longitude is chosen to make the LHA whole, and if that arithmetic
#  drifts the page is for the wrong column and says nothing about it.
#
#  The five tutor cases are the five verdicts it can reach, each fed the
#  value a reader would actually produce: the right answer, the
#  interpolation applied backwards, a declination one degree off, an LHA
#  one degree off, and Zn read where the page prints Z.
{
  for a in "50 -11 329" "50 11 45" "-35 -20 150" "-35 15 300"; do
    set -- $a
    echo "=== table lat $1 dec $2 LHA $3 ==="
    $AW $CE -v cmode=plain -v cmd=table -v tlat="$1" -v tdec="$2" -v tlha="$3" </dev/null
  done
  echo "=== tutor: entering arguments ==="
  $AW $CE -v cmode=plain -v cmd=tabargs -v utc="2026-10-22 10:00:00" -v body=sun \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" -v hs="28 51.4" -v limb=L \
     -v ie=0 -v heye=2.5 -v temp=10 -v press=1010 </dev/null
  echo "=== tutor: the page for those arguments ==="
  $AW $CE -v cmode=plain -v cmd=tabpage -v utc="2026-10-22 10:00:00" -v body=sun \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" </dev/null
  for u in "23 07.8|147|right" "23 21.8||interpolation backwards" \
           "22 11.8||declination one degree off" "23 28.7||LHA one degree off"; do
    h=${u%%|*}; r=${u##*|}; z=${u#*|}; z=${z%%|*}
    echo "=== tutor: $r ==="
    $AW $CE -v cmode=plain -v cmd=tabcheck -v utc="2026-10-22 10:00:00" -v body=sun \
       -v drlat="50 09.0 N" -v drlon="005 04.0 W" -v uhc="$h" -v uz="$z" </dev/null
  done
  echo "=== tutor: Zn read where the page prints Z ==="
  $AW $CE -v cmode=plain -v cmd=tabcheck -v utc="2026-10-22 14:00:00" -v body=sun \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" -v uhc="22 00.0" -v uz="211" </dev/null
} | emit celnav-tables.txt

# ---- celnav: DR, set and drift ----------------------------------------
#  These two are plane geometry rather than astronomy, so the cases that
#  matter are the ones where a sign or a divisor goes astray -- which is
#  what set and drift is notorious for.
#
#  The first pair is a round trip: run a DR east with a southerly set,
#  then hand the DR and the EP back to `current` and require the set and
#  drift that went in to come out.  24 nm east, 4 nm south, 1.00 kn at
#  180 T both ways.  The reciprocal case is there because reversing the
#  two positions is the error the lesson warns about: the same pair the
#  other way round has to read 000 T, not 180 T, and nothing but the
#  order of the arguments distinguishes them.
{
  echo "=== ep: a run with a current ==="
  $AW $CE -v cmode=plain -v cmd=ep -v drlat="50 00.0 N" -v drlon="005 00.0 W" \
     -v course=090 -v speed=6 -v hours=4 -v cset=180 -v cdrift=1 </dev/null
  echo "=== ep: the same run with no current given ==="
  $AW $CE -v cmode=plain -v cmd=ep -v drlat="50 00.0 N" -v drlon="005 00.0 W" \
     -v course=090 -v speed=6 -v hours=4 </dev/null
  echo "=== current: the round trip back from that EP ==="
  $AW $CE -v cmode=plain -v cmd=current -v drlat="50 00.0 N" -v drlon="004 22.6 W" \
     -v fixlat="49 56.0 N" -v fixlon="004 22.6 W" -v hours=4 </dev/null
  echo "=== current: the positions the wrong way round ==="
  $AW $CE -v cmode=plain -v cmd=current -v drlat="49 56.0 N" -v drlon="004 22.6 W" \
     -v fixlat="50 00.0 N" -v fixlon="004 22.6 W" -v hours=4 </dev/null
  echo "=== current: no hours, so a displacement and not a rate ==="
  $AW $CE -v cmode=plain -v cmd=current -v drlat="50 00.0 N" -v drlon="005 00.0 W" \
     -v fixlat="50 02.83 N" -v fixlon="004 55.60 W" </dev/null
  echo "=== current: a set strong enough to be worth doubting ==="
  $AW $CE -v cmode=plain -v cmd=current -v drlat="50 00.0 N" -v drlon="005 00.0 W" \
     -v fixlat="50 12.0 N" -v fixlon="005 00.0 W" -v hours=1 </dev/null
} | emit celnav-current.txt

# ---- celnav: the deviation card ---------------------------------------
#  A swing is several checks, so the cases that differ in KIND are about
#  the swing and not about the arithmetic of one bearing, which
#  celnav-compass already pins.
#
#  The first swing is built backwards from a deviation of 3 sin(head+30),
#  so the card has a known answer: the eight rows must come back 1.5E,
#  2.9E, 2.6E, 0.8E and the mirror of that.  A change anywhere in the
#  azimuth chain moves those numbers and the diff says so in degrees of
#  deviation rather than in minutes of arc.
#
#  The other three are the refusals and the warnings, which are the part
#  of this command that is judgement rather than trigonometry: a swing
#  with no variation cannot make a card at all; three headings in one
#  quadrant is not a card; and a bearing taken with the body high is hard
#  to take over a compass whatever the arithmetic says.
{
  echo "=== devcard: eight headings, a known 3 deg sine ==="
  $AW $CE -v cmode=plain -v cmd=devcard -v utc="2026-10-22" \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" -v body=sun -v variation="-2" \
     -v swing="000,10:00:00,147.0; 045,10:05:00,146.9; 090,10:10:00,148.4; 135,10:15:00,151.5; 180,10:20:00,155.1; 225,10:25:00,157.8; 270,10:30:00,158.7; 315,10:35:00,158.3" </dev/null
  echo "=== devcard: no variation, so no card ==="
  $AW $CE -v cmode=plain -v cmd=devcard -v utc="2026-10-22" \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" -v body=sun \
     -v swing="000,10:00:00,147.0" </dev/null
  echo "=== devcard: three headings in one quadrant ==="
  $AW $CE -v cmode=plain -v cmd=devcard -v utc="2026-10-22" \
     -v drlat="50 09.0 N" -v drlon="005 04.0 W" -v body=sun -v variation="-2" \
     -v swing="000,10:00:00,147.0; 030,10:05:00,146.9; 060,10:10:00,148.4" </dev/null
  echo "=== devcard: the body high, where the bearing is the hard part ==="
  $AW $CE -v cmode=plain -v cmd=devcard -v utc="2026-06-21" \
     -v drlat="00 30.0 N" -v drlon="000 00.0 E" -v body=sun -v variation="0" \
     -v swing="000,11:50:00,180.0; 090,11:55:00,182.0; 180,12:00:00,184.0; 270,12:05:00,186.0" </dev/null
} | emit celnav-devcard.txt

# ---- celnav: every lesson, its figure and its answer ------------------
#  The lesson list comes from the app itself (cmd=t_codes reads the one
#  syllabus string), so a lesson added without a capture cannot slip
#  through unnoticed.  The figures are computed, not drawn by hand - the
#  cocked-hat panels in C1 are three real LOP crossings and print the
#  size of the hat in miles - so a change to the plotting helpers or to
#  the spherical trig shows up here as a readable diff and not only in
#  the almanac numbers.
{
  for L in $($AW $CT -v cmode=plain -v cmd=t_codes </dev/null); do
    echo "=== lesson $L ==="
    $AW $CT -v cmode=plain -v cmd=t_lesson -v les="$L" </dev/null
    echo "=== answer $L (given b) ==="
    $AW $CT -v cmode=plain -v cmd=t_check -v les="$L" -v ans=b </dev/null || true
  done
  echo "=== syllabus, part done ==="
  $AW $CT -v cmode=plain -v cmd=t_syllabus -v done=F1,F2,C1 </dev/null
} | emit celnav-lessons.txt

# ---- tides: the deterministic screens ---------------------------------
TD="-f src/tides/tables.awk -f src/tides/engine.awk -v SF=src/tides/stations.dat"
{
  for st in noaa/8461490 noaa/8510884 noaa/9414290 noaa/8443970 noaa/8770570 noaa/9447130; do
    for d in "2026-08-30" "2027-02-28" "2030-06-21"; do
      y=${d%%-*}; r=${d#*-}; m=${r%%-*}; dd=${r#*-}
      echo "=== tides $st $d ==="
      $AW $TD -v cmode=plain -v cmd=day -v id="$st" -v yy=$y -v mm=$m -v dd=$dd -v sky=1 </dev/null
    done
  done
  echo "=== tides near the Race ==="
  $AW $TD -v cmode=plain -v cmd=near -v lat=41.2333 -v lon=-72.0833 -v k=12 </dev/null
  #  The name search, in every shape somebody actually types it:
  #  one word, words in the wrong order, a fragment, a regex, a
  #  malformed regex, and something that is simply not there.
  for q in "falmouth" "new london" "lon new" "new lon" "NEW LONDON" \
           "^st mary" "bay$" "^boston$" "falmouth|mystic" "port.*bay" \
           "((" "*bad" "zzzqqq"; do
    echo "=== tides find [$q] ==="
    $AW $TD -v cmode=plain -v cmd=search -v q="$q" -v k=12 </dev/null
  done
} | emit tides.txt

# ---- deck-log: the deterministic screens ------------------------------
DLD=$(mktemp -d)
cat > "$DLD/boat" <<'BOAT'
eq|id=eng.main|make=Yanmar|model=4JH4-TE|serial=E12345|plate=4JH4-TE S/N E12345|~
pt|id=impeller|name=raw water impeller|number=Jabsco 17937-0001|fits=eng.main|min=2|stow=port bilge, box 3|~
BOAT
cat > "$DLD/log" <<'DLOG'
2026-08-30T06:00Z|inv|part=impeller|count=2|action=stocktake|~
2026-08-30T06:00Z|nav|lat=41 14.0N|lon=072 05.0W|crs=096|sog=8.5|wdir=210|wspd=14|sea=3|~
2026-08-30T06:00Z|wx|mslp=1016.4|ptend=4|airt=18.0|dewp=14.0|seat=17.5|cloud=2|swper=7|swdir=200|~
2026-08-30T09:00Z|eng|eq=eng.main|insp=belts|state=a|note=glazed, squeals at start|~
2026-08-30T12:00Z|nav|lat=41 20.0N|lon=072 20.0W|crs=096|sog=8.1|wdir=170|wspd=22|sea=4|~
2026-08-30T12:00Z|wx|mslp=1010.1|ptend=7|airt=17.2|dewp=16.8|seat=16.9|cloud=7|swper=14|swdir=230|~
2026-08-30T15:00Z|eng|eq=eng.main|job=impeller|part=impeller|qty=1|hrs=1234.5|~
DLOG
DL="-f src/common/log.awk -f src/common/colour.awk -f src/decklog/views.awk -f src/decklog/screens.awk"
{
  for c in recent holdings shopping defects equip; do
    echo "=== deck-log $c ==="
    $AW $DL -v cmode=plain -v cmd="$c" -v LOG="$DLD/log" -v BOAT="$DLD/boat" -v n=20 </dev/null
  done
  for m in cloud sea vis ptend cl cm ch; do
    echo "=== deck-log menu $m ==="
    $AW $DL -v cmode=plain -v cmd=menu -v what="$m" </dev/null
  done
} | emit decklog.txt
rm -rf "$DLD"

# ---- weather: lessons and the reasoning -------------------------------
WXD=$(mktemp -d)
cat > "$WXD/log" <<'WXLOG'
2026-08-30T06:00Z|nav|lat=41 14.0N|wdir=210|wspd=14|sea=3|~
2026-08-30T06:00Z|wx|mslp=1016.4|airt=18.0|dewp=14.0|seat=17.5|cloud=2|ch=1|cm=0|cl=1|vis=8|swper=7|swdir=200|~
2026-08-30T12:00Z|nav|lat=41 20.0N|wdir=170|wspd=22|sea=4|~
2026-08-30T12:00Z|wx|mslp=1010.1|airt=17.2|dewp=16.8|seat=16.9|cloud=7|ch=4|cm=2|cl=6|vis=5|swper=14|swdir=230|~
2026-08-30T12:00Z|fc|for=2026-08-31T00:00Z|by=you|wdir=150|wspd=30|mslp=1002|~
2026-08-30T12:00Z|fc|for=2026-08-31T00:00Z|by=rules|wdir=114|wspd=48|mslp=1001|~
2026-08-30T12:00Z|fc|for=2026-08-31T00:00Z|by=persist|wdir=170|wspd=22|mslp=1010|~
2026-08-31T00:00Z|nav|lat=42 00.0N|wdir=150|wspd=32|sea=5|~
2026-08-31T00:00Z|wx|mslp=1003.0|~
WXLOG
WX="-f src/common/log.awk -f src/common/colour.awk -f src/weather/grid.awk -f src/weather/wx.awk -f src/weather/score.awk -f src/weather/chart.awk -f src/weather/teach.awk -f src/weather/screens.awk"
{
  echo "=== weather what ==="
  $AW $WX -v cmode=plain -v cmd=what -v LOG="$WXD/log" -v lon=-72 </dev/null
  echo "=== weather score ==="
  $AW $WX -v cmode=plain -v cmd=score -v LOG="$WXD/log" </dev/null
  echo "=== weather syllabus ==="
  $AW $WX -v cmode=plain -v cmd=syllabus </dev/null
  #  THE LESSONS FROM THE AWK'S OWN LIST, not a list typed here: the typed
  #  one missed `veer` when weather 1.0.2 added it, so the eleventh lesson
  #  had no golden copy and a change to it would have passed unseen.
  for k in $($AW $WX -v cmode=plain -v cmd=lessonlist </dev/null); do
    echo "=== weather learn $k ==="
    $AW $WX -v cmode=plain -v cmd=lesson -v key="$k" </dev/null
    $AW $WX -v cmode=plain -v cmd=lessonq -v key="$k" </dev/null
    #  and the deeper section where there is one, because golden exists so
    #  that any change to what a reader sees becomes a reviewable diff --
    #  and the deeper sections are the longest thing the tool prints.
    if $AW $WX -v cmode=plain -v cmd=lessonhasmore -v key="$k" </dev/null >/dev/null 2>&1; then
      echo "=== weather learn $k, deeper ==="
      $AW $WX -v cmode=plain -v cmd=lessonmore -v key="$k" </dev/null
    fi
  done
  for n in 1 0; do
    echo "=== weather chart, north=$n ==="
    $AW $WX -v cmode=plain -v cmd=chart -v brg=000 -v dist=200 -v orient=090 -v w500=60 -v north=$n </dev/null
  done
  #  THE GLASS, FROM A LOG KEPT THE WAY ONE IS AT SEA (W04, weather 1.0.5):
  #  a position now and then, every pressure a weather observation on its
  #  own.  The first fixture above logs a position with every reading,
  #  which is why it never showed that a reading without one was worked as
  #  if on the equator.  Here: 48 hours, 24 hours, no longitude set, and a
  #  log with no latitude anywhere.
  cat > "$WXD/log2" <<'WXLOG2'
2026-08-29T00:00Z|nav|lat=50 10.0N|wdir=250|wspd=12|~
2026-08-29T00:00Z|wx|mslp=1018.4|~
2026-08-29T03:00Z|wx|mslp=1017.7|~
2026-08-29T06:00Z|wx|mslp=1017.4|~
2026-08-29T09:00Z|wx|mslp=1017.2|~
2026-08-29T12:00Z|wx|mslp=1015.8|~
2026-08-29T15:00Z|wx|mslp=1013.1|~
2026-08-29T18:00Z|wx|mslp=1010.0|~
2026-08-29T21:00Z|wx|mslp=1006.3|~
2026-08-30T00:00Z|wx|mslp=1002.1|~
2026-08-30T03:00Z|wx|mslp=998.5|~
2026-08-30T06:00Z|wx|mslp=997.2|~
2026-08-30T09:00Z|wx|mslp=998.4|~
2026-08-30T12:00Z|nav|lat=50 20.0N|wdir=300|wspd=25|~
2026-08-30T12:00Z|wx|mslp=1000.8|~
2026-08-30T15:00Z|wx|mslp=1003.1|~
2026-08-30T18:00Z|wx|mslp=1005.7|~
2026-08-30T21:00Z|wx|mslp=1008.3|~
2026-08-31T00:00Z|wx|mslp=1009.8|~
WXLOG2
  grep -v '|nav|' "$WXD/log2" | head -6 > "$WXD/log3"
  printf '%s\n' '2026-08-28T12:00Z|nav|lat=50 00.0N|wdir=240|wspd=10|~' \
                '2026-08-29T10:12Z|wx|mslp=1012.0|~' '2026-08-29T16:12Z|wx|mslp=1007.8|~' > "$WXD/log4"
  echo "=== weather what, the glass, 48 hours ==="
  $AW $WX -v cmode=plain -v cmd=what -v LOG="$WXD/log2" -v lon=-3 </dev/null
  echo "=== weather what, the glass, 24 hours ==="
  $AW $WX -v cmode=plain -v cmd=what -v LOG="$WXD/log2" -v lon=-3 -v hours=24 </dev/null
  echo "=== weather what, the glass, no longitude ==="
  $AW $WX -v cmode=plain -v cmd=what -v LOG="$WXD/log2" -v lon= </dev/null
  echo "=== weather what, the glass, no latitude in the log ==="
  $AW $WX -v cmode=plain -v cmd=what -v LOG="$WXD/log3" -v lon=-3 </dev/null
  #  the carried latitude's own case: 50 N, a fall of 4.2 hPa across the
  #  tide's whole fall.  A definite fall; worked on the equator, "steady".
  echo "=== weather what, a reading with no position of its own ==="
  $AW $WX -v cmode=plain -v cmd=what -v LOG="$WXD/log4" -v lon=-3 </dev/null
  #  the wind from the isobars (W07, weather 1.0.3): north, south, and the
  #  refusal near the equator
  for c in "100 50 1" "100 50 0" "60 30 1" "100 3 1"; do
    set -- $c
    echo "=== weather isobars, spacing=$1 lat=$2 north=$3 ==="
    $AW $WX -v cmode=plain -v cmd=isobars -v spacing="$1" -v lat="$2" -v north="$3" -v step=4 </dev/null
  done
} | emit weather.txt
rm -rf "$WXD"

# ---- compare or update ------------------------------------------------
mkdir -p "$G"
fail=0
for f in "$out"/*; do
  n=$(basename "$f")
  if [ "$mode" = update ]; then
    cp "$f" "$G/$n"
    printf "  updated  %-26s %6d lines\n" "$n" "$(wc -l < "$f")"
  elif [ ! -f "$G/$n" ]; then
    echo "  MISSING  $n  (run tests/golden.sh --update)"; fail=$((fail+1))
  elif cmp -s "$f" "$G/$n"; then
    printf "  same     %-26s %6d lines\n" "$n" "$(wc -l < "$f")"
  else
    printf "  CHANGED  %-26s\n" "$n"
    diff -u "$G/$n" "$f" | head -40 || true
    fail=$((fail+1))
  fi
done
echo
if [ "$mode" = update ]; then echo "golden files rewritten - read the diff before committing"; exit 0; fi
if [ "$fail" -eq 0 ]; then echo "GOLDEN: no output changed"; exit 0; fi
echo "GOLDEN: $fail file(s) changed"
echo "If the change is intended, run tests/golden.sh --update and commit the diff."
exit 1

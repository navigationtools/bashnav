#!/bin/sh
# Rebuild docs/index.html from the template, filling every plate with the
# tools' real output. Run it after changing anything that shows on the site.
set -e
cd "$(dirname "$0")/.."
GH=${GH_USER:-navigationtools}
#  WHERE THE SITE IS SERVED, as one setting. The apps themselves are
#  entirely relative -- every service worker registers 'sw.js' with no
#  leading slash and every manifest uses "./" -- so they work at any
#  depth and none of them needs to know this. Only the links written on
#  the front page do, which is why it is here and not in the tools.
SITE=${BASHNAV_SITE:-https://bashnav.navigationtools.org}

#  Which awk builds the site.  Every invocation below goes through $AW,
#  and the binaries are pinned to the same one, so the whole site can be
#  rebuilt under a named awk.
#
#  tests/plates-check.sh does exactly that, once per awk in the matrix,
#  and then diffs docs/plates/ and docs/img/ against what is committed.
#  Site output that depends on which awk produced it is therefore a
#  FAILURE rather than a thing nobody notices - which is the shape of the
#  bug that reversed a stated bearing direction on one platform, where
#  gawk and mawk kept the sign bit of a negative zero and one-true-awk
#  normalised it.
AW=${AWK:-awk}
export CELNAV_AWK="$AW" COLREGS_AWK="$AW" TIDES_AWK="$AW" DECKLOG_AWK="$AW" WEATHER_AWK="$AW"

./build.sh >/dev/null

tmp=${TMPDIR:-/tmp}/bashnav-site.$$
mkdir -p "$tmp/plates"
trap 'rm -rf "$tmp"' EXIT

CH="$tmp/celnav"; CR="$tmp/colregs"
export CELNAV_HOME="$CH" COLREGS_HOME="$CR"

./bin/celnav dr "35 00 N" "040 00 W" 0 0 >/dev/null
./bin/celnav sight "2026-08-29 07:30:00" Dubhe     C "19 32.1" 1.5 3.0 >/dev/null
./bin/celnav sight "2026-08-29 07:34:00" Bellatrix C "49 37.2" 1.5 3.0 >/dev/null
./bin/celnav sight "2026-08-29 07:38:00" Markab    C "29 01.3" 1.5 3.0 >/dev/null
./bin/celnav fix > "$tmp/fix.txt"

sed -n '/INTERCEPT PLOT/,/1 column/p' "$tmp/fix.txt" | sed 's/^  //' > docs/plates/plot.txt
sed -n '/SKY VIEW/,/inner rings/p'    "$tmp/fix.txt" | sed 's/^  //' > docs/plates/sky.txt
sed -n '/Sight a:/,/Intercept/p'      "$tmp/fix.txt" | sed 's/^  //' > docs/plates/working.txt

#  Take the engine paths from the tools themselves rather than naming a
#  version here - a hard-coded one silently stops matching on the next
#  release, and the plate it feeds goes blank without anything failing.
CV=$(./bin/celnav version | $AW '{print $2}')
RV=$(./bin/colregs version | $AW '{print $2}')
$AW -f "$CH/engine-$CV.awk" -f "$CH/teach-$CV.awk" \
    -v cmd=t_sandbox -v slat=35 -v sdec=20 -v slha=310 </dev/null \
  | sed -n '/SANDBOX/,/Zn/p' | sed 's/^  //' > docs/plates/triangle.txt

./bin/colregs light ram 40 | sed -n '/WHAT DO YOU SEE/,/yellow/p' | sed 's/^  //' > docs/plates/lights.txt

#  ALL THREE colregs files, not just the engine.  These two plates were
#  generated from "-f engine" alone, with contacts assigned to a variable
#  and never used.  gawk and one-true-awk resolve a function at the call
#  and never reach rv_keys(), which lives in review.awk, so they produced
#  the plate and nobody noticed; mawk resolves at parse time and refuses
#  the whole file - "function rv_keys never defined", exit 2, no output.
#
#  And the awk is the FIRST command of a pipeline, so `set -e` never sees
#  it: the pipeline's status is sed's, sed succeeds on empty input, and
#  the script writes a zero-byte plate and carries on. On a machine where
#  awk is mawk, rebuilding the site silently blanked two plates on the
#  front page. The guard at the bottom of this script checks the pictures
#  for exactly this and did not cover the text plates; it does now.
CRE="-f $CR/engine-$RV.awk -f $CR/contacts-$RV.awk -f $CR/review-$RV.awk"
$AW $CRE -v cmd=enc -v seed=21 -v which=2 </dev/null \
  | sed -n '/WHAT DO YOU DO/,/^   d)/p' | sed 's/^  //' > docs/plates/encounter.txt
$AW $CRE -v cmd=scen -v seed=42 </dev/null \
  | sed -n '/COLLISION AVOIDANCE/,/^  Q1/p' | sed 's/^  //' > docs/plates/scenario.txt
{ ./bin/colregs refsound | sed -n '/In sight of one another/,/bend/p' | sed 's/^  //' | head -9
  echo
  ./bin/colregs refsound | sed -n '/restricted visibility/,/Aground/p' | sed 's/^  //' | head -8
} > docs/plates/sound.txt

$AW -v gh="$GH" -v site="$SITE" '
function esc(s){ gsub(/&/,"\\&amp;",s); gsub(/</,"\\&lt;",s); gsub(/>/,"\\&gt;",s); return s }
function plate(f,   line,out){
  out=""
  while((getline line < f) > 0) out = out esc(line) "\n"
  close(f)
  sub(/\n$/,"",out)
  return out
}
# the lights plate, with the light letters in their real colours.  A line
# whose only letters are R G W or Y is part of the drawing, not the prose.
function platelights(f,   line,out,t){
  out=""
  while((getline line < f) > 0){
    t=line; gsub(/[RGWY]/,"",t)
    if(line ~ /[A-Za-z]/ && t !~ /[A-Za-z]/){
      line=esc(line)
      gsub(/R/,"<span class=\"r\">R</span>",line)
      gsub(/G/,"<span class=\"g\">G</span>",line)
      gsub(/W/,"<span class=\"w\">W</span>",line)
      gsub(/Y/,"<span class=\"y\">Y</span>",line)
      out = out line "\n"
    } else out = out esc(line) "\n"
  }
  close(f)
  sub(/\n$/,"",out)
  return out
}
{
  if($0 ~ /\{\{PLOT\}\}/)      { sub(/\{\{PLOT\}\}/,      plate("docs/plates/plot.txt")) }
  if($0 ~ /\{\{WORKING\}\}/)   { sub(/\{\{WORKING\}\}/,   plate("docs/plates/working.txt")) }
  if($0 ~ /\{\{TRIANGLE\}\}/)  { sub(/\{\{TRIANGLE\}\}/,  plate("docs/plates/triangle.txt")) }
  if($0 ~ /\{\{LIGHTS\}\}/)    { sub(/\{\{LIGHTS\}\}/,    platelights("docs/plates/lights.txt")) }
  if($0 ~ /\{\{SOUND\}\}/)     { sub(/\{\{SOUND\}\}/,     plate("docs/plates/sound.txt")) }
  if($0 ~ /\{\{ENCOUNTER\}\}/) { sub(/\{\{ENCOUNTER\}\}/, plate("docs/plates/encounter.txt")) }
  if($0 ~ /\{\{SCENARIO\}\}/)  { sub(/\{\{SCENARIO\}\}/,  plate("docs/plates/scenario.txt")) }
  gsub(/\{\{GH\}\}/, gh)
  gsub(/\{\{SITE\}\}/, site)
  print
}' docs/site-template.html > docs/index.html


# ---- coloured pictures of the terminal ------------------------------
#  GitHub will not render ANSI in a code block and strips inline styles
#  from a README, but it does render an SVG image. So a picture here can
#  be the program's real output in the program's real colours, rather
#  than a plain-text approximation of it.
#
#  FIRST GENERATION, AND KEPT ON PURPOSE. These are what the site showed
#  while the shell build was the product. The front page leads with the
#  browser apps now and its figures are those apps' own drawings, so most
#  of these fifteen are not referenced by a page -- and they stay. The
#  two plates still in use, {{PLOT}} and {{ENCOUNTER}}, feed the collapsed
#  "the same thing, as your terminal prints it" block under each figure,
#  and this is the only thing in the repository that can photograph a
#  terminal at all. Larry's call, 25 Oct 2026.
#
#  tests/plates-check.sh rebuilds all of it under every awk and diffs
#  against what is committed, so they cannot rot quietly.
mkdir -p docs/img
CENG="$CH/engine-$CV.awk"
REN="-f $CR/engine-$RV.awk -f $CR/contacts-$RV.awk -f $CR/review-$RV.awk"

$AW -f "$CENG" -v cmode=day -v cmd=reduce -v sfile="$CH/sights.txt" \
    -v drlat="35 00 N" -v drlon="040 00 W" -v course=0 -v speed=0 </dev/null \
  | sed -n '/INTERCEPT PLOT/,/1 column/p' \
  | $AW -f docs/ansi2svg.awk -v title="celnav: the intercept plot, three star sights and the fix" \
  > docs/img/celnav-plot.svg

$AW -f "$CENG" -v cmode=day -v cmd=plan -v utc="2026-08-29 07:34:00" \
    -v drlat="35 00 N" -v drlon="040 00 W" </dev/null \
  | sed -n '/SKY VIEW/,/suggested set/p' \
  | $AW -f docs/ansi2svg.awk -v title="celnav: the sky, with the best three bodies marked" \
  > docs/img/celnav-sky.svg

$AW $REN -v cmode=day -v cmd=light -v key=ram -v th=40 </dev/null \
  | sed -n '/WHAT DO YOU SEE/,/yellow/p' \
  | $AW -f docs/ansi2svg.awk -v title="colregs: a vessel restricted in her ability to manoeuvre, seen from 040" \
  > docs/img/colregs-lights.svg

$AW $REN -v cmode=day -v cmd=light -v key=mineclear -v th=310 </dev/null \
  | sed -n '/WHAT DO YOU SEE/,/yellow/p' \
  | $AW -f docs/ansi2svg.awk -v title="colregs: a mine clearance vessel, three green lights on one yard" \
  > docs/img/colregs-mineclear.svg

$AW $REN -v cmode=day -v cmd=trackm -v seed=7 -v a1=b -v a2=b -v a3=c </dev/null \
  | sed -n '/yd across/,/whole question/p' \
  | $AW -f docs/ansi2svg.awk -v title="colregs: the relative-motion plot from the tracking watch" \
  > docs/img/colregs-contacts.svg

TENG="-f src/tides/tables.awk -f src/tides/engine.awk -v SF=src/tides/stations.dat"
$AW $TENG -v cmode=day -v cmd=day -v id=noaa/8461490 -v yy=2026 -v mm=8 -v dd=30 </dev/null \
  | sed -n '/NEW LONDON/,/at the foot/p' \
  | $AW -f docs/ansi2svg.awk -v title="tides: a day at New London - the table, and the curve with the turns marked" \
  > docs/img/tides-day.svg

$AW $TENG -v cmode=day -v cmd=search -v q="new lon" -v k=12 </dev/null \
  | sed -n '/STATIONS MATCHING/,/matched/p' \
  | $AW -f docs/ansi2svg.awk -v title="tides: searching for a station by part of its name, in any order" \
  > docs/img/tides-find.svg

#  The rest of the plates the site shows, as pictures.  Every one is the
#  real tool's real output: run it, cut the region, pipe it through
#  ansi2svg.  A sed range that stops matching yields a SILENTLY EMPTY svg,
#  so each was probed before being wired in here, and the check at the
#  bottom of this script fails the build if any picture comes out tiny.
$AW -f "$CENG" -v cmode=day -v cmd=reduce -v sfile="$CH/sights.txt" \
    -v drlat="35 00 N" -v drlon="040 00 W" -v course=0 -v speed=0 </dev/null \
  | sed -n '/Sight a:/,/Intercept/p' \
  | $AW -f docs/ansi2svg.awk -v title="celnav: one sight reduced, every number shown" \
  > docs/img/celnav-working.svg

$AW -f "$CENG" -f "$CH/teach-$CV.awk" -v cmode=day -v cmd=t_sandbox \
    -v slat=35 -v sdec=20 -v slha=310 </dev/null \
  | sed -n '/SANDBOX/,/Zn/p' \
  | $AW -f docs/ansi2svg.awk -v title="celnav: the navigational triangle on your own sky" \
  > docs/img/celnav-triangle.svg

$AW $REN -v cmode=day -v cmd=enc -v seed=21 -v which=2 </dev/null \
  | sed -n '/WHAT DO YOU DO/,/^   d)/p' \
  | $AW -f docs/ansi2svg.awk -v title="colregs: an encounter, and what the rules require of you" \
  > docs/img/colregs-encounter.svg

$AW $REN -v cmode=day -v cmd=scen -v seed=42 </dev/null \
  | sed -n '/COLLISION AVOIDANCE/,/^  Q1/p' \
  | $AW -f docs/ansi2svg.awk -v title="colregs: a collision avoidance scenario" \
  > docs/img/colregs-scenario.svg

#  cmd=sndtable, not refsound - refsound is the binary's alias for it, and
#  the engine does not know that name.
$AW $REN -v cmode=day -v cmd=sndtable </dev/null \
  | sed -n '/In sight of one another/,/bend/p' \
  | $AW -f docs/ansi2svg.awk -v title="colregs: the sound signals, in sight of one another" \
  > docs/img/colregs-sound.svg

#  The three tools the site never mentioned, and the launcher.  Their menus
#  ARE the illustration: they say what each tool does better than prose
#  about them would.  These come from the binaries rather than the engines,
#  so they are monochrome - cmode_now() tests [ -t 1 ] and stdout is a pipe -
#  but the picture still carries the site's typography and palette.
DL="$tmp/decklog"; WX="$tmp/weather"
mkdir -p "$DL" "$WX"
export DECKLOG_HOME="$DL" WEATHER_HOME="$WX"
./bin/bashnav </dev/null 2>/dev/null \
  | sed -n '/BASH NAVIGATION SOFTWARE/,/Quit/p' \
  | $AW -f docs/ansi2svg.awk -v title="bashnav: the launcher, one icon in front of the other five" \
  > docs/img/bashnav-menu.svg
./bin/weather </dev/null 2>/dev/null \
  | sed -n '/WEATHER /,/Quit/p' \
  | $AW -f docs/ansi2svg.awk -v title="weather: read your own barometer" \
  > docs/img/weather-menu.svg
#  THE CLOCK IN THIS ONE MAKES THE BUILD UNREPRODUCIBLE.  deck-log's
#  menu header carries the current UTC stamp, so every rebuild produced a
#  different decklog-menu.svg - which tests/plates-check.sh, which diffs
#  the artefacts against what is committed, would have reported as drift
#  on every single run, for ever.
#
#  So the stamp is frozen here rather than in the tool: deck-log's
#  timestamp is what goes into an append-only log, and an environment
#  variable that can change it is a way to write wrong times into
#  somebody's log at sea. A picture of a menu freezes a moment anyway.
#
#  The replacement is the SAME LENGTH as what it replaces. ansi2svg lays
#  out one <text> x-coordinate per character and tests/svg-check.awk
#  verifies the result is an exact grid, so a substitution of a different
#  width would shear the picture.
./bin/deck-log </dev/null 2>/dev/null \
  | sed -n '/DECK-LOG /,/Quit/p' \
  | sed 's/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]Z/2026-08-29T07:30Z/' \
  | $AW -f docs/ansi2svg.awk -v title="deck-log: the boat's records" \
  > docs/img/decklog-menu.svg

echo "docs/img: $(ls docs/img/*.svg | wc -l) coloured pictures"

#  A picture that came out empty is the failure this script is most likely
#  to have, and it fails silently: the sed range stops matching, ansi2svg
#  writes a valid but blank svg, and the page looks subtly wrong rather
#  than broken.  So check every one of them has real content.
bad=0
for f in docs/img/*.svg; do
  b=$(wc -c < "$f")
  [ "$b" -lt 1200 ] && { echo "EMPTY PICTURE: $f ($b bytes) - its sed range has stopped matching"; bad=$((bad+1)); }
done
#  the text plates too.  They are the ones that went blank under mawk,
#  and they were the ones not being checked.
for f in docs/plates/*.txt; do
  b=$(wc -c < "$f")
  [ "$b" -lt 80 ] && { echo "EMPTY PLATE: $f ($b bytes) - its generator failed or its sed range stopped matching"; bad=$((bad+1)); }
done
[ "$bad" = 0 ] || { echo "$bad plate(s) or picture(s) came out blank"; exit 1; }

echo "docs/index.html written ($(wc -l < docs/index.html) lines)"
#  AN UNFILLED PLACEHOLDER FAILS THE BUILD.  It used to print "warning:"
#  and carry on, which put it below the blank-picture check two lines up
#  for no reason anybody could give: {{PLOT}} left in the page is the same
#  class of fault as a blank plate, visible on the front page, and arrives
#  the same way - a template name changed and its filler did not.
#
#  grep -c RETURNS 1 WHEN THE COUNT IS ZERO, which matters here. This was
#  `grep -c '{{' docs/index.html >/dev/null && { ... }`, and on a clean
#  build grep found nothing, returned 1, the && short-circuited, and
#  because it was the last statement under `set -e` the whole script
#  exited 1 - on success, always. Hence the `|| true`.
n=$(grep -c '{{' docs/index.html || true)
[ "$n" = 0 ] || {
  echo "$n UNFILLED PLACEHOLDER(S) in docs/index.html - a {{NAME}} in the"
  echo "template has no filler in this script, or was renamed in one place:"
  grep -n '{{' docs/index.html | head -5 | sed 's/^/    /'
  exit 1
}

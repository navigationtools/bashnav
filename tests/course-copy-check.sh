#!/bin/sh
#  tests/course-copy-check.sh -- docs/course-copy.sh copies a clean course
#  and refuses one with anything private in it; and the course is not in
#  docs/ (TBTY: nothing is published until Larry says so).
#
#  It never runs PILOT's build: COURSE_SRC hands course-copy.sh a small
#  tree made here, so the check needs neither PILOT's folder nor python.
#  Prints "COURSECOPY ok N" or "COURSECOPY FAIL: ..." and exits 0 or 1.
cd "$(dirname "$0")/.."
t=${TMPDIR:-/tmp}/course-copy-check.$$
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/clean/coastal" "$t/clean/assets"
echo '<html><body><p>Level 1</p></body></html>' > "$t/clean/index.html"
echo '<html><body><svg><path class="route"/></svg></body></html>' > "$t/clean/coastal/index.html"
echo 'body{margin:0}' > "$t/clean/assets/site.css"
fail=0; n=0
no() { echo "COURSECOPY FAIL: $*"; fail=1; }

#  1. a clean tree is copied whole, and the script says ok
n=$((n+1))
o=$(COURSE_SRC="$t/clean" sh docs/course-copy.sh "$t/out1" 2>&1) || no "a clean tree was refused: $o"
[ "$(find "$t/out1" -type f 2>/dev/null | wc -l | tr -d ' ')" = 3 ] || no "a clean tree was not copied whole"
case $o in *"course-copy: ok, 3 files"*) ;; *) no "no ok line for a clean tree" ;; esac

#  2 to 5. each kind of private material is refused, and the refused copy
#  is renamed, not left under the name a publish step would use
plant() {   # name, file, text
  cp -R "$t/clean" "$t/$1"; printf '%s\n' "$3" >> "$t/$1/$2"
  n=$((n+1))
  if COURSE_SRC="$t/$1" sh docs/course-copy.sh "$t/out-$1" >/dev/null 2>&1; then
    no "$1 was copied, not refused"
  fi
  [ -e "$t/out-$1" ] && no "$1: the refused copy kept its name"
  [ -d "$t/out-$1.REFUSED" ] || no "$1: the refused copy was not kept as .REFUSED"
}
plant extract  assets/site.css      '/* from the OSCAR extract */'
plant retired  coastal/index.html   '<script src="legs_2025_real_v2.js"></script>'
plant clipper  coastal/index.html   '<!-- polar_as_sailed_clipper68_2025_v2 -->'
plant preview  index.html           '<div>This private preview shows the tracks</div>'
plant drawing  coastal/index.html   '<path class="real" d="M0 0"/>'

#  6. TBUN: a copy for publishing that has a drafts/ folder is refused;
#  the same tree for the private read-through is not
n=$((n+1))
cp -R "$t/clean" "$t/withdrafts"; mkdir -p "$t/withdrafts/drafts/level4-2025"
echo '<html><body>Level 4</body></html>' > "$t/withdrafts/drafts/level4-2025/index.html"
COURSE_PUBLISH=yes COURSE_SRC="$t/withdrafts" sh docs/course-copy.sh "$t/out-pub" >/dev/null 2>&1 \
  && no "a copy for publishing kept drafts/"
[ -d "$t/out-pub.REFUSED" ] || no "the refused publishing copy was not kept as .REFUSED"
COURSE_SRC="$t/withdrafts" sh docs/course-copy.sh "$t/out-read" >/dev/null 2>&1 \
  || no "the private read-through copy was refused for its drafts/"

#  7. it will not write over an existing folder
n=$((n+1))
COURSE_SRC="$t/clean" sh docs/course-copy.sh "$t/out1" >/dev/null 2>&1 && no "it wrote over an existing folder"

#  8. not published: there is no course in docs/, and make-site.sh copies
#  one there only under BASHNAV_PUBLISH_COURSE=yes.  When Larry says
#  publish, this is the check that has to change, on purpose.
n=$((n+1))
[ -e docs/practical-navigator ] && no "docs/practical-navigator exists: the course would be public once committed"
g=$(grep -c 'course-copy.sh' docs/make-site.sh)
gy=$(grep -c 'BASHNAV_PUBLISH_COURSE:-no}" = yes' docs/make-site.sh)
gp=$(grep -c 'COURSE_PUBLISH=yes sh docs/course-copy.sh' docs/make-site.sh)
[ "$g" = 1 ] && [ "$gy" = 1 ] || no "make-site.sh's course step is not the single one behind BASHNAV_PUBLISH_COURSE=yes"
[ "$gp" = 1 ] || no "make-site.sh's course step does not refuse drafts/ (COURSE_PUBLISH=yes, TBUN)"

[ "$fail" = 0 ] && echo "COURSECOPY ok $n"
exit $fail

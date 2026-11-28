#!/bin/sh
#  Copy PILOT's public course into a folder, and refuse it if anything
#  private is in it.  TBTS, as Larry ruled it (TBTY, 28 Nov 2026).
#
#    sh docs/course-copy.sh DEST
#
#  WHAT IT DOES
#    1. Runs PILOT's own public build, practical-navigator's
#       tools/public_build.py, with DEST as its output. That tool copies
#       site/ and fails if a real track, a held fix, the extract's name
#       or the private-preview wording is left in the copy. PILOT's rule
#       is "copy only after it prints ok", so this stops unless it does.
#       It never copies PILOT's build/site-public/ from disk: that folder
#       is only as fresh as the last time someone ran the tool, and on
#       28 Nov 2026 the one on disk was from 24 Nov and still held names
#       that site/ no longer does.
#    2. Checks DEST itself, a second time and independently: no file may
#       name the extract (OSCAR), the retired files (legs_2025*,
#       *clipper68*, TBNF), or carry the private-preview box; no page may
#       draw a real boat (class="real").  If anything is found, DEST is
#       renamed DEST.REFUSED and the script exits 1.  It deletes nothing.
#
#  WHAT IT DOES NOT DO
#    It does not publish anything.  Where DEST is decides that:
#      docs/course-preview.sh puts it in ~/Downloads, private;
#      docs/make-site.sh puts it in docs/practical-navigator/, which is
#      public the moment it is committed, and does so ONLY when
#      BASHNAV_PUBLISH_COURSE=yes.  Nothing sets that yet.
#
#  PUBLISHING (TBUN, ruled 28 Nov 2026): the published copy leaves drafts/
#  out; only pages Larry has read and ruled in go public. PILOT's public
#  build will leave drafts/ out from his move to coastal/ (TBTI). Until
#  then it keeps it, which the private read-through may. So with
#  COURSE_PUBLISH=yes, as make-site.sh sets it, a copy that has a drafts/
#  folder is refused, and the two of us cannot get the order wrong.
#
#  SETTINGS
#    COURSE_PUBLISH  yes: refuse a copy with a drafts/ folder (make-site.sh)
#    PN_DIR       PILOT's repository (default ../practical-navigator)
#    COURSE_SRC   a ready-made tree to copy instead of running PILOT's
#                 build; tests/course-copy-check.sh uses it
set -e
cd "$(dirname "$0")/.."
dest=$1
[ -n "$dest" ] || { echo "usage: sh docs/course-copy.sh DEST" >&2; exit 2; }
case $dest in /*) ;; *) dest=$(pwd)/$dest ;; esac

if [ -n "${COURSE_SRC:-}" ]; then
  [ -e "$dest" ] && { echo "course-copy: $dest already exists; nothing copied" >&2; exit 1; }
  cp -R "$COURSE_SRC" "$dest"
else
  PN=${PN_DIR:-../practical-navigator}
  [ -f "$PN/tools/public_build.py" ] || {
    echo "course-copy: no $PN/tools/public_build.py (set PN_DIR); nothing copied" >&2; exit 1; }
  if ! out=$(python3 "$PN/tools/public_build.py" --out "$dest" 2>&1); then
    printf '%s\n' "$out"
    echo "course-copy: PILOT's public build failed; DEST is not to be used" >&2
    [ -e "$dest" ] && mv "$dest" "$dest.REFUSED"
    exit 1
  fi
  printf '%s\n' "$out"
  case $out in
    *"public_build: ok"*) ;;
    *) echo "course-copy: PILOT's public build did not print ok" >&2
       [ -e "$dest" ] && mv "$dest" "$dest.REFUSED"
       exit 1 ;;
  esac
fi

#  The second check.  grep -l lists the files; -i because the extract's
#  name has been written OSCAR and oscar.  Binary files are searched too:
#  a false alarm costs a look, a miss costs a publication.
words=$(grep -rliE 'oscar|legs_2025|clipper68|This private preview shows' "$dest" || true)
real=$(grep -rl --include='*.html' 'class="real"' "$dest" || true)
drafts=
[ "${COURSE_PUBLISH:-no}" = yes ] && [ -d "$dest/drafts" ] && drafts=yes
if [ -n "$words$real$drafts" ]; then
  echo "course-copy: REFUSED, private material in the copy:" >&2
  for f in $words; do echo "    named or boxed: ${f#$dest/}" >&2; done
  for f in $real;  do echo "    real boat drawn: ${f#$dest/}" >&2; done
  [ -n "$drafts" ] && echo "    a drafts/ folder, and this copy is for publishing (TBUN)" >&2
  mv "$dest" "$dest.REFUSED"
  echo "course-copy: moved to $dest.REFUSED; nothing deleted" >&2
  exit 1
fi
n=$(find "$dest" -type f | wc -l | tr -d ' ')
echo "course-copy: ok, $n files in $dest, none private"

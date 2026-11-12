#!/bin/sh
#  THE GATE: the checks that are too cheap not to run before every commit.
#
#  run-tests.sh is the suite. It runs every test against every awk on the
#  machine and takes long enough that nobody runs it between edits, which
#  is the honest reason faults reach a commit. This is the other end of
#  that trade: about a second, no awk, no browser, no network, and it
#  catches only faults that are mechanical to see and expensive to ship.
#
#  Each check here exists because the fault it catches was shipped.
#
#    1. A STYLESHEET WITH UNBALANCED BRACES. launcher.css lost the closing
#       brace of an @media (prefers-reduced-motion: reduce) block, so every
#       rule after it - the tiles, the whole page - applied only to readers
#       with reduce-motion switched on. Everyone else got unstyled links.
#       The file parses, the page loads, nothing throws. A brace count
#       finds it instantly and nothing else does.
#
#    2. A SCRIPT THAT DOES NOT PARSE. Cheap, and node is already required.
#
#    3. A BUILD LABEL AND ITS CACHE OUT OF STEP. The workers are
#       cache-first, so shipping without moving the cache ships nothing to
#       anyone who has opened the page before. The label is how you tell
#       which build you are looking at, so a label that disagrees with the
#       cache is worse than being out of date: it lies about which it is.
#       run-tests.sh checks this too; it is here as well because the point
#       is to catch it BEFORE the commit, not on the next full run.
#
#    4. A BUILT MANUAL OLDER THAN ITS MARKDOWN. The PDF is what a reader
#       prints and reads away from the computer, and it is the one file in
#       the repository that no test reads. The shared display-modes
#       section changed and two manuals shipped for two days without it.
#
#  Read-only. Exits 0 if everything passes, 1 otherwise, and prints only
#  what is wrong plus a one-line verdict.
#
#  Usage:  sh tests/gate.sh            from the repository root

bad=0
note() { echo "  $1"; bad=$((bad + 1)); }

[ -d docs/web ] || { echo "gate: run me from the repository root"; exit 1; }

# ---- 1. stylesheets: braces and comments balance ---------------------
for c in docs/web/*.css docs/web/*/*.css; do
  [ -f "$c" ] || continue
  o=$(tr -cd '{' < "$c" | wc -c | tr -d ' ')
  s=$(tr -cd '}' < "$c" | wc -c | tr -d ' ')
  [ "$o" = "$s" ] || note "braces:  $c has $o '{' and $s '}'"
  a=$(grep -o '/\*' "$c" | wc -l | tr -d ' ')
  b=$(grep -o '\*/' "$c" | wc -l | tr -d ' ')
  [ "$a" = "$b" ] || note "comment: $c has $a '/*' and $b '*/'"
done

# ---- 2. scripts parse -------------------------------------------------
if command -v node >/dev/null 2>&1; then
  for j in docs/web/*.js docs/web/*/*.js; do
    [ -f "$j" ] || continue
    node --check "$j" >/dev/null 2>&1 || note "syntax:  $j"
  done
else
  echo "  --     node not found, scripts not parsed"
fi

# ---- 3. each app's build label agrees with its cache ------------------
#  Two forms are accepted, because an app may state the number or derive
#  it. A LITERAL must equal the cache's version. A DERIVED one must name
#  no version at all: it asks the worker that is actually serving the
#  page, so there is no second number to drift and nothing to compare.
for swf in docs/web/*/sw.js; do
  [ -f "$swf" ] || continue
  ad=$(dirname "$swf"); an=$(basename "$ad")
  ac=$(sed -n "s/.*CACHE *= *'$an-v\([0-9][0-9]*\)'.*/\1/p" "$swf" | head -1)
  [ -n "$ac" ] || { note "cache:   $an has no $an-v<n> in sw.js"; continue; }
  #  DERIVED: the app calls buildShow(), which asks the worker that is
  #  serving the page and so cannot disagree with it. Nothing to compare.
  if grep -l 'buildShow(' "$ad"/*.js 2>/dev/null | grep -qv '/sw\.js$'; then
    continue
  fi
  #  LITERAL: the number is written in the app, so it must match. drill is
  #  the case this exists for - it fetches its own script from the network
  #  and reads this literal out of the file TEXT to notice a newer build,
  #  so the number has to be readable without running the code.
  af=$(grep -l 'BUILD *=' "$ad"/*.js 2>/dev/null | grep -v '/sw\.js$' | head -1)
  [ -n "$af" ] || { note "build:   $an neither states a build nor derives one"; continue; }
  ab=$(sed -n "s/.*BUILD *= *'*\([0-9][0-9]*\).*/\1/p" "$af" | head -1)
  [ "$ab" = "$ac" ] || \
    note "build:   $an says build '$ab' but serves from '$an-v$ac' ($af)"
done

# ---- 4. a built manual older than the markdown it is built from ------
#  Every manual is written once as markdown and shipped as a PDF, and the
#  PDF is what a reader prints and takes away from the computer. Edit the
#  markdown and forget `sh docs/manual-src/mkpdf.sh <tool>` and the two
#  disagree with nothing to show it: both files are committed, neither is
#  malformed, and no test reads a PDF.
#
#  This is the fault it exists for. common-display-modes.md - the display
#  modes section, shared by the manuals that have one - was changed in
#  31feeca, and neither docs/tides-manual.pdf nor docs/celnav-manual.pdf
#  was rebuilt. Both shipped for two days without a section their own
#  source carried; the celnav one was missing a paragraph explaining why
#  the shell says 'day' where the browser says 'dark', which is exactly
#  the kind of thing a reader goes to the manual for.
#
#  The list of documents is READ OUT OF mkpdf.sh, not written again here:
#  adding a tool is one line there and this check follows it (rule 8).
if git rev-parse --git-dir >/dev/null 2>&1 && [ -f docs/manual-src/mkpdf.sh ]; then
  for row in $(sed -n "/^DOCS='/,/'$/p" docs/manual-src/mkpdf.sh \
               | sed -e "s/^DOCS='//" -e "s/'$//" -e '/^$/d'); do
    tool=$(printf '%s' "$row" | cut -d: -f1)
    i=2
    for kind in manual quickref; do
      md=docs/manual-src/$(printf '%s' "$row" | cut -d: -f$i); i=$((i + 1))
      pdf=docs/$tool-$kind.pdf
      [ -f "$md" ] && [ -f "$pdf" ] || continue
      #  the sources: the markdown, and every file it includes by name
      src="$md"
      for inc in $(sed -n 's/.*{{INCLUDE:\([^}]*\)}}.*/\1/p' "$md"); do
        [ -f "docs/manual-src/$inc" ] && src="$src docs/manual-src/$inc"
      done
      #  A PDF modified in the working tree is a rebuild in progress:
      #  there is nothing to compare, and failing here would mean a red
      #  gate for every correct rebuild until it was committed.
      git diff --quiet -- "$pdf" 2>/dev/null || continue
      at=$(git log -1 --format=%H -- "$pdf" 2>/dev/null)
      [ -n "$at" ] || continue
      ch=$(git diff --name-only "$at" -- $src 2>/dev/null || true)
      if [ -n "$ch" ]; then
        note "manual:  $pdf was built in $(git log -1 --format=%h "$at") and these"
        printf '%s\n' "$ch" | sed 's|^|           source files changed after it: |'
        echo "           rebuild it:  sh docs/manual-src/mkpdf.sh $tool"
      fi
    done
  done
fi

if [ "$bad" = 0 ]; then
  echo "gate: passed"
  exit 0
fi
echo "gate: $bad problem(s) - nothing should be committed until these are fixed"
exit 1

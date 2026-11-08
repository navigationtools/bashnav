#!/bin/sh
#  Does each web tool's service worker cache everything its page loads?
#
#  THE OFFLINE PROMISE IS THE PRODUCT. These tools exist to work on a
#  boat with no signal, and the worker is cache-first precisely so that
#  nothing is fetched at sea. A file the page loads and the worker does
#  not precache is fetched from the network on first use: fine at the
#  dock, and on passage it is a stylesheet that never arrives or a
#  script whose absence takes a section of the app with it.
#
#  Nothing checked this. It is being written on 23 October 2026 because
#  the contacts module adds three scripts to colregs' page at once and I
#  was about to rely on remembering to add them in two places; the same
#  gap is open on all six tools and on the launcher.
#
#  Two things are compared, per tool:
#    1. every local script and stylesheet the page references is in the
#       worker's FILES list;
#    2. every file the FILES list names exists on disk, so a rename
#       cannot leave the worker precaching a 404 -- addAll() rejects as
#       a unit, so ONE missing entry means the tool caches NOTHING and
#       is online-only everywhere.
set -e
cd "$(dirname "$0")/.."
rc=0

for sw in $(find docs -name sw.js | sort); do
  [ -f "$sw" ] || continue
  dir=$(dirname "$sw")
  page="$dir/index.html"
  [ -f "$page" ] || continue
  name=$(basename "$dir")
  [ "$name" = web ] && name=launcher

  #  the worker's list, one per line, './x' -> 'x'
  #
  #  NOT  sed -n 's|^\./||p' :  -n with p prints only the lines the
  #  substitution MATCHED, so every entry without a leading './' was
  #  dropped from the list entirely and then reported as not precached.
  #  Found the day weather's page started loading '../shared/demo.css',
  #  which the worker precached correctly and this check could not see.
  #
  #  And dropping the -n alone is not the fix either: that filter was
  #  doing double duty, stripping './' AND discarding the tokens around
  #  the array - const, FILES, =, [, ]; - which then arrived in the
  #  existence loop as files that are not there. So the quoted strings are
  #  taken deliberately instead of being whatever survives a tr.
  files=$(sed -n '/^const FILES/,/\];/p' "$sw" \
          | grep -o "'[^']*'" | tr -d "'" | sed 's|^\./||' | sed '/^$/d')

  #  what the page actually loads, local only: a CDN is not our problem
  #  and there are none, but a check that ignores the distinction would
  #  report one as missing the day somebody adds it
  refs=$(sed -n 's/.*<script[^>]*src="\([^"]*\)".*/\1/p;s/.*<link[^>]*href="\([^"]*\)".*/\1/p' "$page" \
         | grep -v '^http' | grep -v '^//' | sed 's|^\./||')

  for r in $refs; do
    case "$r" in *.webmanifest|*.svg|*.png|*.ico) ;; esac
    if ! printf '%s\n' "$files" | grep -qx "$r"; then
      echo "  FAIL  $name: index.html loads $r, sw.js does not precache it"
      rc=1
    fi
  done

  #  the offline fallback has to name something this worker precaches,
  #  or the one page a visitor sees with no signal is the browser's
  #  error page. They agree today on all seven; nothing said so.
  fb=$(grep -o "caches.match('[^']*')" "$sw" | tail -1 | sed "s|.*('\./\{0,1\}||;s|').*||")
  if [ -n "$fb" ] && ! printf '%s\n' "$files" | grep -qx "${fb:-/}"; then
    if [ "$fb" != "" ] && [ "$fb" != "/" ]; then
      echo "  FAIL  $name: the offline fallback serves $fb, which sw.js does not precache"
      rc=1
    fi
  fi

  #  ---- and the precache must go PAST the browser's cache -----------
  #
  #  GitHub Pages serves everything with  cache-control: max-age=600  -
  #  measured on the live site, not assumed. So for ten minutes after a
  #  push, a plain  c.addAll(FILES)  is entitled to fill a brand new cache
  #  with the PREVIOUS version's files: the worker then reports its new
  #  CACHE name while serving old content, and the build line at the foot
  #  of the page - the one thing a reader can check - lies to them.
  #
  #  Larry found this as "it takes about five minutes to show up", which
  #  is the ten-minute window seen from the outside.
  #  the worker's CODE, with its // comments taken off: the first version
  #  of this check matched the sentence in sw.js that explains why
  #  addAll(FILES) is not used, and reported all seven workers as broken.
  code=$(sed 's|//.*||' "$sw")
  if printf '%s\n' "$code" | grep -q 'addAll(FILES)'; then
    echo "  FAIL  $name: sw.js precaches with addAll(FILES), which reads the"
    echo "        browser's HTTP cache - fetch each file with cache:'reload'"
    rc=1
  fi
  if ! printf '%s\n' "$code" | grep -q "cache: 'reload'"; then
    echo "  FAIL  $name: sw.js does not fetch its precache past the HTTP cache"
    rc=1
  fi

  #  ---- and the page must ask for the worker the same way ------------
  #
  #  The other half of it: a browser checks sw.js for updates through the
  #  HTTP cache unless the previous script's max-age was over 24 hours.
  #  At 600 seconds it compares the new worker against a cached copy of
  #  the old one, finds no difference, and installs nothing - so "open it
  #  once with a signal" is a no-op that looks like the app being stuck.
  for js in "$dir"/*.js; do
    [ -f "$js" ] || continue
    case "$js" in *"/sw.js") continue ;; esac
    #  ON THE REGISTER LINE ITSELF, not anywhere in the file. Stripping
    #  // comments was not enough: the paragraph above each register call
    #  explaining why updateViaCache is there is a /* */ block, so the
    #  check passed on a file where the option had been taken off the code
    #  and left in the prose. Matching the line is immune to both.
    if grep -q 'serviceWorker.register(' "$js"; then
      if ! grep -q "serviceWorker.register(.*updateViaCache: 'none'" "$js"; then
        echo "  FAIL  $name: $(basename "$js") registers the worker without"
        echo "        updateViaCache: 'none', so a push is invisible for ten minutes"
        rc=1
      fi
    fi
  done

  for f in $files; do
    case "$f" in ''|./) continue ;; esac
    if [ ! -e "$dir/$f" ]; then
      echo "  FAIL  $name: sw.js precaches $f, which is not there (addAll fails as a unit:"
      echo "        one missing entry and the tool caches nothing at all)"
      rc=1
    fi
  done
done

[ "$rc" = 0 ] && echo "  ok    every web tool precaches everything its page loads, and nothing it has not got"
exit $rc

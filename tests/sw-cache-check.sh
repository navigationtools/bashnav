#!/bin/sh
#  When a served file changes, its app's service-worker cache version must
#  change with it.
#
#  Every app's worker is cache-first with no revalidation:
#
#      caches.match(req).then(hit => hit || fetch(req)...)
#
#  so a file already in the cache is served from it FOR EVER. The cache is
#  only refilled when install runs, and install only runs when the worker
#  changes - in practice when CACHE is bumped. An install on somebody's
#  home screen therefore keeps the old app indefinitely, with no error and
#  nothing to see.
#
#  That is not hypothetical. celnav's sight-reduction screen, the fix that
#  was 43 nm out from a stale DR and the planets' missing parallax all
#  shipped while CACHE stayed at celnav-v3, so every existing install kept
#  serving the old code. Larry found it the only way it can be found - by
#  opening the app and seeing the old one. tests/sw-precache-check.sh
#  already checks that every served file is IN the list; nothing checked
#  that the list gets refetched.
#
#  The comparison is: the commit that introduced the current CACHE value,
#  against HEAD, over the files that worker precaches. Anything changed in
#  between is a file an existing install will never receive.
set -e
cd "$(dirname "$0")/.."
bad=0
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "SWCACHE SKIP"
  exit 0
fi

for sw in $(find docs -name sw.js | sort); do
  app=$(dirname "$sw"); name=$(basename "$app")
  cache=$(sed -n "s/.*CACHE *= *'\([^']*\)'.*/\1/p" "$sw" | head -1)
  if [ -z "$cache" ]; then
    echo "  $name: no CACHE constant found in sw.js"
    bad=$((bad+1)); continue
  fi

  #  the files this worker precaches. './' is index.html.
  sed -n '/FILES *=/,/\]/p' "$sw" \
    | tr ',' '\n' \
    | sed -n "s|.*'\./\([^']*\)'.*|\1|p" > "$tmp/f"
  sed -n '/FILES *=/,/\]/p' "$sw" | grep -q "'\./'" && echo "index.html" >> "$tmp/f"
  if [ ! -s "$tmp/f" ]; then
    echo "  $name: could not read the FILES list out of sw.js"
    bad=$((bad+1)); continue
  fi
  paths=""
  while read -r f; do [ -n "$f" ] && paths="$paths $app/$f"; done < "$tmp/f"

  #  the commit that introduced THIS cache value. -S finds the change that
  #  added the string, which is the bump itself - not merely the last time
  #  anything in sw.js moved, because a worker can be edited without a bump.
  at=$(git log -1 --format=%H -S"CACHE = '$cache'" -- "$sw" 2>/dev/null)
  if [ -z "$at" ]; then
    #  A VALUE WITH NO COMMIT IS THE BUMP HAPPENING NOW. If sw.js is
    #  dirty, this cache version has never been committed, so by
    #  definition nothing has changed since it was set - there is nothing
    #  to compare and this is the state the check exists to produce. The
    #  first draft failed here, which would have meant a red suite for
    #  every correct bump until it was committed.
    if ! git diff --quiet -- "$sw" 2>/dev/null; then
      echo "  $name: $cache is an uncommitted bump, nothing to compare"
      continue
    fi
    echo "  $name: CACHE is $cache and no commit in history ever set it"
    bad=$((bad+1)); continue
  fi

  #  "$at" and not "$at..HEAD": that compares the bump against the WORKING
  #  TREE, so an edit to a served file is reported while it is still
  #  uncommitted - which is when the warning is worth having. With
  #  $at..HEAD it only ever saw committed changes, and passed on a tree
  #  where colregs.js had just been edited and the cache had not moved.
  changed=$(git diff --name-only "$at" -- $paths 2>/dev/null || true)
  if [ -n "$changed" ]; then
    echo "  $name: $cache was set in $(git log -1 --format=%h "$at"), and these"
    echo "    served files have changed since -- an existing install will never"
    echo "    receive them until CACHE is bumped:"
    printf '%s\n' "$changed" | sed 's|^|      |'
    bad=$((bad+1))
  fi
done

printf 'SWCACHE %d\n' "$bad"
[ "$bad" = 0 ]

#!/bin/sh
#  Wrapper for tests/counts-check.awk. See the note at the top of it for
#  what this checks and why it is awk rather than sed.
#
#  Read-only. Exits non-zero, naming the file, the line and both numbers.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
AW=${AWK:-awk}
o=$($AW -f tests/counts-check.awk \
      src/colregs/engine.awk README.md docs/site-template.html docs/index.html)
printf '%s\n' "$o"
case "$o" in *"COUNTS 0") exit 0 ;; esac
exit 1

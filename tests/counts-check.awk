#  THE COUNTS IN THE PROSE MUST COME FROM THE ENGINE.
#
#  The site and the README said colregs covers "22 vessel types" and, two
#  hundred lines further down, "twenty vessel types" and "Fourteen
#  scenarios". The engine has had NVES=28 and NENC=28 for some time. None
#  of the three was a disagreement about the rules -- they were counts
#  typed by hand that stopped being retyped, in the two documents a new
#  reader meets first.
#
#  Same rule as make-site.sh naming engine versions by hand: A NUMBER
#  THAT DESCRIBES THE CODE IS DERIVED FROM THE CODE, NEVER TYPED TWICE.
#
#  WHY THIS IS awk AND NOT sed. The first version of this check parsed
#  with sed and used \(encounter \)\? to make a word optional. That is a
#  GNU extension to basic regular expressions: GNU sed matches it, BSD
#  sed on macOS does not. On Larry's Mac every number came out EMPTY and
#  the check reported "says  scenarios" against all six lines -- a check
#  that failed for a reason that had nothing to do with what it checks.
#  awk's regular expressions are extended and POSIX, so ? is simply ?,
#  and awk is the one tool this repository already guarantees everywhere.
#
#  Usage:  awk -f tests/counts-check.awk src/colregs/engine.awk <docs...>
#  Prints a line per disagreement, then COUNTS <n>.

FILENAME ~ /engine\.awk$/ {
  if (match($0, /NVES=[0-9]+/) && NVES == 0)
    NVES = substr($0, RSTART + 5, RLENGTH - 5) + 0
  if (match($0, /NENC=[0-9]+/) && NENC == 0)
    NENC = substr($0, RSTART + 5, RLENGTH - 5) + 0
  next
}

#  Every "<n> vessel types" and "<n> [encounter ]scenarios" on the line.
#  The loop matters: one line of the site template carries both.
{
  scan($0, "[0-9]+ vessel types",                 NVES, "vessel types", "NVES")
  scan($0, "[0-9]+ (encounter )?scenarios",       NENC, "scenarios",    "NENC")

  #  A count written as a word cannot be compared with a number by any
  #  cheap means, and writing it that way is how "twenty vessel types"
  #  survived beside "22" in the same file. Digits only.
  lc = tolower($0)
  if (lc ~ /(twenty|thirty|forty|fourteen|fifteen|sixteen|eighteen) (vessel|scenario)/) {
    printf "    %s:%d writes a count as a word -- use digits so it can be checked\n",
           FILENAME, FNR
    bad++
  }
}

function scan(line, pat, want, label, cname,   s, n) {
  s = line
  while (match(s, pat)) {
    n = substr(s, RSTART, RLENGTH) + 0
    if (n != want) {
      printf "    %s:%d says %d %s, engine has %s=%d\n",
             FILENAME, FNR, n, label, cname, want
      bad++
    }
    s = substr(s, RSTART + RLENGTH)
  }
}

END {
  if (NVES == 0) { print "    no NVES found in the engine"; bad++ }
  if (NENC == 0) { print "    no NENC found in the engine"; bad++ }
  printf "COUNTS %d\n", bad + 0
}

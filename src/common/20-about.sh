# ---------------------------------------------------------------------
#  About.  Shared by both tools; each one supplies about_why and
#  about_sources, which are the parts that differ.
# ---------------------------------------------------------------------
about_how() {
  printf '%s\n' \
    '' \
    '  HOW IT WAS WRITTEN' \
    '  ---------------------------------------------------------------' \
    '  By Claude, Anthropic'\''s AI model, in conversation with Larry over' \
    '  a few days in August 2026.  He decided what it should do and' \
    '  judged whether it was right.  The code, the mathematics and the' \
    '  tests are Claude'\''s work.' \
    '' \
    '  Three rules were set at the start and never relaxed.' \
    '' \
    '  PORTABILITY.  POSIX sh and POSIX awk, and nothing else.  It runs' \
    '  in a-Shell and iSH on an iPad, in Terminal on a Mac, in busybox' \
    '  on a router.  Nothing is installed.  There is no dependency here' \
    '  that can rot in a year, because there is no dependency.' \
    '' \
    '  NO NETWORK, EVER.  Every number the program needs is inside the' \
    '  file you are running.  That is a constraint on the mathematics' \
    '  and not only on the plumbing: it is why the planetary positions' \
    '  are computed from orbital elements with a correction series' \
    '  fitted here, rather than looked up in a table someone serves.' \
    '' \
    '  NOTHING ASSERTED THAT WAS NOT CHECKED.  Each algorithm is' \
    '  implemented from a primary source and then validated against an' \
    '  independent implementation - never against itself.' \
    '' \
    '  On that last one, honestly.  An AI writing code is confidently' \
    '  wrong on a regular basis, and so is a person.  The defence is' \
    '  not care, it is testing.  Real errors in this project were found' \
    '  by machinery and by users, and would not have been found by' \
    '  reading the code:' \
    '' \
    '    - One awk implementation ignores the seed you give its random' \
    '      number generator.  A drill could therefore mark its own' \
    '      correct answer wrong.  Found by running the suite under four' \
    '      different awks, not by inspection.' \
    '' \
    '    - Both tools worked out "am I writing to a terminal?" from' \
    '      inside a command substitution, where the answer is always' \
    '      no.  Colour had never once worked, on any terminal, since' \
    '      the day it was written.  The test suite checked that the' \
    '      output is clean when piped - and passed, for entirely the' \
    '      wrong reason.' \
    '' \
    '    - The three green lights of a mine clearance vessel were drawn' \
    '      on two different masts.  A user saw that before any test' \
    '      did, because he tried to account for every light in the' \
    '      picture and could not.' \
    '' \
    '  So: the tests exist because the author is fallible, and the' \
    '  interesting mistakes were caught by the tests and by the people' \
    '  using it.  Which is the argument for sending feedback.' \
    ''
}
about_feedback() {
  printf '%s\n' \
    '' \
    '  FEEDBACK' \
    '  ---------------------------------------------------------------' \
    '  Please send it.  It is the reason this is public.' \
    ''
  about_needs
  printf '%s\n' \
    '  The useful report is small and specific:' \
    '' \
    '    what you did        the exact command, or which menu item' \
    '    what you saw        paste it, escape codes and all' \
    '    what you expected   and why - the rule, the sight, the table' \
    '' \
    '  "This is not right, a sailing vessel would not show that" with' \
    '  the picture pasted underneath is worth more than any amount of' \
    '  general praise, and has already fixed real bugs.' \
    '' \
    '  Where:' \
    '' \
    '    https://github.com/navigationtools/bashnav/issues' \
    '' \
    '  If you think the program disagrees with the Convention, with an' \
    '  almanac, or with a published tide table, say so plainly.  Assume' \
    '  the program is wrong until it is shown otherwise.  That is the' \
    '  correct prior, and it is how the bugs above were found.' \
    '' \
    '  Corrections to the teaching are as welcome as corrections to the' \
    '  code.  If a lesson is misleading, that is a defect.' \
    ''
}
about_licence() {
  printf '%s\n' \
    '' \
    '  LICENCE AND WARRANTY' \
    '  ---------------------------------------------------------------' \
    '  Copyright 2026 M. Larry Sherman.' \
    '  Licensed under the Apache License, Version 2.0.' \
    '  http://www.apache.org/licenses/LICENSE-2.0' \
    '' \
    '  You may use it, including commercially, modify it, and pass it' \
    '  on.  You must keep the copyright and licence notices and say' \
    '  what you changed.  You get an explicit patent grant.  You may' \
    '  not use the author'\''s name to endorse your version.' \
    '' \
    '  Tide station data carries its own terms, which this licence does' \
    '  not change: the NOAA harmonic constants are public domain, and' \
    '  the TICON-4 constants are CC BY 4.0.  Their attribution travels' \
    '  with them.  See the NOTICE file.' \
    '' \
    '  NO WARRANTY.  Distributed on an "AS IS" basis, WITHOUT' \
    '  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.' \
    '' \
    '  This is a training aid and a calculator.  It is not a certified' \
    '  navigation system, it carries no authority, and it has never' \
    '  been near a type approval.  Nothing in it relieves any vessel,' \
    '  owner, master or crew of the consequences of neglecting to' \
    '  comply with the rules of the road, of neglecting a proper' \
    '  look-out, or of neglecting any precaution required by the' \
    '  ordinary practice of seamen.' \
    '' \
    '  Carry a paper almanac, a paper tide table, and the rules.' \
    ''
}
about_menu() {
  while :; do
    printf '%s\n' \
      '' \
      '  ABOUT' \
      '' \
      '    1  Why this exists       who wanted it, and what for' \
      '    2  How it was written    and by what, and what went wrong' \
      '    3  What is tested        and, more to the point, what is not' \
      '    4  Sources               where the numbers come from' \
      '    5  Feedback              what to send, where, and what is worth most' \
      '    6  Licence and warranty  Apache 2.0, and what it does not cover' \
      '' \
      '    x  back'
    printf "  > "; IFS= read -r ac || return 0
    case "$ac" in
      1) about_why ;;
      2) about_how ;;
      3) about_tested ;;
      4) about_sources ;;
      5) about_feedback ;;
      6) about_licence ;;
      x|X|q|Q|"") return 0 ;;
      *) echo "  ?" ;;
    esac
  done
}

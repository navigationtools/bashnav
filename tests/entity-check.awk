#  AN HTML ENTITY IN A JAVASCRIPT STRING IS USUALLY A BUG.
#
#  It means something only if the string reaches innerHTML. Everywhere
#  else -- textContent, a table-cell helper, an attribute set from
#  script -- it arrives on the screen as the literal characters
#  "&mdash;".
#
#  That is what shipped on the platform page. A row added to warn that
#  Safari caps the version it reports carried the warning with an entity
#  in the middle of it, into a table whose helper sets textContent. The
#  page whose entire job is telling the truth about the platform printed
#  "&mdash;" to Larry on the iPad, in the row about not trusting what the
#  platform tells you.
#
#  Use the character, or —. The files are UTF-8 already.
#
#  ONLY JAVASCRIPT IS EXAMINED. In HTML an entity is correct and common,
#  so in an .html file this looks between <script> and </script> and
#  nowhere else.
#
#  "Statement" is everything since the last line ending in ; { or },
#  which is enough to see an innerHTML on the line above a folded
#  string -- the shape most of this code is written in.

FNR == 1 { js = (FILENAME ~ /\.js$/); stmt = "" }

#  A one-line <script src=...></script> changes nothing; only a block
#  that opens on one line and closes on another moves the state.
FILENAME ~ /\.html$/ && /<script/ && /<\/script/ { next }
FILENAME ~ /\.html$/ && /<script/               { js = 1; stmt = ""; next }
FILENAME ~ /\.html$/ && /<\/script/             { js = 0; next }

!js            { next }
/^[ \t]*\/\// { next }

{
  stmt = stmt " " $0
  if ($0 ~ /&(mdash|ndash|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo|hellip|deg|times|middot|copy|#[0-9]+|#x[0-9A-Fa-f]+);/ &&
      stmt !~ /innerHTML/) {
    printf "%s:%d: an HTML entity in a string that never reaches innerHTML\n", FILENAME, FNR
    printf "        %s\n", $0
    bad++
  }
  if ($0 ~ /[;{}][ \t]*$/) stmt = ""
}

END { printf "BAD %d\n", bad + 0 }

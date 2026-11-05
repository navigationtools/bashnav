
about_text() {
  printf '%s\n' \
    '' \
    '  ===============================================================' \
    '   DECK-LOG -- the boat'\''s records' \
    '  ===============================================================' \
    '' \
    '  WHAT THIS IS' \
    '' \
    '  The deck log, the engine log and the provisions list, kept in one' \
    '  place because they are the same book with different tabs, written by' \
    '  the same person at the same moment.' \
    '' \
    '  A LOG IS A RECORD' \
    '' \
    '  It has standing after an incident, and it is read by people who were' \
    '  not there. So:' \
    '' \
    '    - it is APPEND ONLY. Nothing is ever edited or deleted.' \
    '    - a CORRECTION is a new entry that references the old one, and both' \
    '      stay visible for ever. That is the electronic version of lining' \
    '      through and initialling, which is how it has always been done.' \
    '    - every timestamp is UTC. Display is another matter; the record is' \
    '      UTC, so nobody has to argue later about whose local time it was.' \
    '' \
    '  DECLINING IS AN ANSWER' \
    '' \
    '  Return records "-", meaning asked and not taken. "/" means it could' \
    '  not be observed - dark, fog, behind something. Both are true entries' \
    '  and both are better than a guess. A form that punishes blanks gets' \
    '  invented numbers, and an invented number in a log is worse than a' \
    '  gap, because it looks like data.' \
    '' \
    '  Zero is a reading. "Cloud nil" and "cloud not observed" are different' \
    '  facts and this log can tell them apart.' \
    '' \
    '  WHAT IS DERIVED, AND WHAT IS STORED' \
    '' \
    '  There is no stored inventory. What an impeller IS - its number, what' \
    '  it fits, how many to carry - is registry. How many you HAVE is worked' \
    '  out by replaying the log. So the count can never disagree with the' \
    '  log, because it is the log.' \
    '' \
    '  THE OBSERVATION FOLLOWS THE VOS STANDARD' \
    '' \
    '  NOAA'\''s Voluntary Observing Ship programme defines what a ship' \
    '  observes and how it is coded, so the coded fields here are theirs,' \
    '  not ours. Learn this form and you have learned the professional one,' \
    '  and your log is comparable with every other marine observation ever' \
    '  taken.' \
    '' \
    '  WHO WROTE IT' \
    '' \
    '  M. Larry Sherman had the ideas and the sea time. Claude wrote the' \
    '  code. Part of Bash Navigation Software, with celnav, colregs and' \
    '  tides.' \
    '' \
    '  https://github.com/navigationtools/bashnav' \
    '' \
    '  Apache License 2.0.' \
    ''
}

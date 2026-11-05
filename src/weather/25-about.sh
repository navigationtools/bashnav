
about_text() {
  printf '%s\n' \
    '' \
    '  ===============================================================' \
    '   WEATHER -- read your own barometer' \
    '  ===============================================================' \
    '' \
    '  WHAT THIS IS' \
    '' \
    '  Two things. It reasons over the observations in your deck log and' \
    '  shows its working, and it teaches the physics underneath.' \
    '' \
    '  It is a separate tool from deck-log for a reason. A log records what' \
    '  happened on this boat; a teacher is a different animal. The first' \
    '  attempt put both in one program and the teaching material was the' \
    '  part that got left out.' \
    '' \
    '  WHAT IT CANNOT DO' \
    '' \
    '  Forecast. There is no model here, no GRIB, and no chart it did not' \
    '  get from you by hand. With no network there cannot be.' \
    '' \
    '  What it works from instead is the one category of weather data that' \
    '  is never wrong - what you measured yourself - and the only one still' \
    '  available when the antenna comes down. Celestial is what you do when' \
    '  GPS dies. This is what you do when the sat comms die.' \
    '' \
    '  YOU FORECAST FIRST' \
    '' \
    '  weather forecast asks for yours and writes it down before showing any' \
    '  of its own. Print the machine'\''s guess first and you have not forecast' \
    '  anything, you have agreed with an answer.' \
    '' \
    '  Then it offers two of its own - the rule set, and persistence, which' \
    '  is "in twelve hours it will be much as it is now" - and when the time' \
    '  comes it scores all three against what actually happened.' \
    '' \
    '  Scoring itself as well as you is the point. Every rule in here is a' \
    '  rule of thumb. Some are right seven times in ten, and a rule that is' \
    '  right seven times in ten is genuinely useful once you know that is' \
    '  what it is. And you should be able to beat it in your own waters. A' \
    '  training tool that cannot be outgrown is badly built.' \
    '' \
    '  WHERE IT COMES FROM' \
    '' \
    '  NOAA and the national weather services, which are public domain, and' \
    '  the published literature. The 500 millibar rules are from the' \
    '  Mariner'\''s Guide to the 500-Millibar Chart by Joe Sienkiewicz of' \
    '  NOAA'\''s Ocean Prediction Center and Lee Chesneau. Full citations in' \
    '  docs/SOURCES.md.' \
    '' \
    '  The physics is the part most often taught wrongly, so it is the part' \
    '  checked hardest. If you were told the seasons are about distance from' \
    '  the sun, see "weather learn seasons".' \
    '' \
    '  WHO WROTE IT' \
    '' \
    '  M. Larry Sherman had the ideas and the sea time. Claude wrote the' \
    '  code. Part of Bash Navigation Software.' \
    '' \
    '  https://github.com/navigationtools/bashnav' \
    '' \
    '  Apache License 2.0.' \
    ''
}

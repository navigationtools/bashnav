
FIELDS=""
#  see src/decklog/10-head.sh: not /tmp, which iOS does not promise
fld_start(){ FIELDS="$DECKLOG_HOME/.wxfields.$$"; mkdir -p "$DECKLOG_HOME" 2>/dev/null; : > "$FIELDS"; }
fld(){ printf '%s\t%s\n' "$1" "$2" >> "$FIELDS"; }
fld_commit(){
  mkdir -p "$DECKLOG_HOME"
  rec=$(eng -v cmd=mkrec -v type="$1" -v fields="$FIELDS")
  rm -f "$FIELDS"; FIELDS=""
  [ -n "$rec" ] || { echo "  weather: refused to write a malformed record" >&2; return 1; }
  printf '%s\n' "$rec" >> "$LOG"
}
ask(){ printf "  %-38s " "$1"; IFS= read -r a || a=""; [ -z "$a" ] && a="-"; fld "$2" "$a"; }

do_learn() {
  load_prog
  if [ -z "$1" ]; then eng -v cmd=syllabus -v donelist="$lessons"; return 0; fi
  eng -v cmd=lesson -v key="$1" || return 1
  printf "  your answer (return to see it): "; IFS= read -r a || return 0
  [ -n "$a" ] && printf "\n  you said: %s\n" "$a"
  echo
  printf "  %s\n" "$(eng -v cmd=lessonq -v key="$1")"
  echo
  mark_done "$1"
  #  A SECOND TIER, OFFERED AND NOT IMPOSED. The lesson above is what you
  #  need on deck; this is why it is true. Asked for by name so the
  #  shorter lesson stays the default.
  if eng -v cmd=lessonhasmore -v key="$1" >/dev/null 2>&1; then
    printf "  there is more on this one - read it? [y/N] "
    IFS= read -r m || m=""
    case "$m" in
      y|Y) echo; eng -v cmd=lessonmore -v key="$1" ;;
    esac
  fi
}

do_chart() {
  printf '%s\n' \
    '' \
    '  From a 500 mb chart - by radiofax, or one you have on paper. Find the' \
    '  5640 metre contour (marked 564) and read three things off it.' \
    ''
  printf "  bearing from you to the nearest point of it: "; IFS= read -r brg
  printf "  its distance, nm: ";                            IFS= read -r dist
  printf "  which way the line itself runs, as a bearing: "; IFS= read -r orient
  printf "  500 mb wind speed there, knots (return to skip): "; IFS= read -r w500
  printf "  northern hemisphere? [Y/n] ";                    IFS= read -r nh
  n=1; case "$nh" in n|N) n=0 ;; esac
  eng -v cmd=chart -v brg="$brg" -v dist="$dist" -v orient="${orient:-0}" \
      -v w500="$w500" -v north="$n"
}

#  THE WIND FROM THE ISOBARS (W07, weather 1.0.3).  From a surface chart:
#  the spacing between two isobars and your latitude give the wind aloft,
#  and W01's rules the wind on deck.  Arguments skip the questions:
#  weather isobars <spacing nm> <latitude> [N|S] [interval hPa]
do_isobars() {
  sp="$1"; la="$2"; hs="$3"; st="$4"
  if [ -z "$sp" ]; then
    printf '%s\n' \
      '' \
      '  From a surface chart - by radiofax, or one you have on paper. Measure' \
      '  the gap between two neighbouring isobars where you are, in nautical' \
      '  miles: minutes of latitude on the side scale of the chart.' \
      ''
    printf "  spacing between the isobars, nm: "; IFS= read -r sp
    printf "  your latitude, degrees: ";           IFS= read -r la
    printf "  hemisphere, N or S? [N] ";           IFS= read -r hs
    printf "  isobar interval, hPa [4]: ";         IFS= read -r st
  fi
  #  N or S, the same in an argument and an answer: a Y/n question here
  #  read "N" as no, and turned 50 N into 50 S.
  n=1; case "$hs" in s|S) n=0 ;; esac
  eng -v cmd=isobars -v spacing="$sp" -v lat="$la" -v north="$n" -v step="${st:-4}"
}

#  YOU FORECAST FIRST. Nothing of mine until yours is written down.
do_forecast() {
  printf "  how many hours ahead? [12] "; IFS= read -r hrs || hrs=12
  [ -z "$hrs" ] && hrs=12
  case "$hrs" in *[!0-9]*) echo "  ?"; return 1 ;; esac
  valid=$(eng -v cmd=validat -v hours="$hrs")
  echo
  echo "  ==============================================================="
  echo "   YOUR forecast for $valid"
  echo "  ==============================================================="
  echo "   Yours first. Nothing of mine until yours is written down."
  echo "   Return to leave a field out."
  echo
  fld_start
  fld for "$valid"; fld by you
  ask "wind direction, degrees true"  wdir
  ask "wind speed, knots"             wspd
  ask "sea level pressure, hPa"       mslp
  ask "sea state, 0-9"                sea
  fld_commit fc || return 1
  echo
  echo "  yours is logged. Now mine."
  for w in rules persist; do
    fld_start; fld for "$valid"; fld by "$w"
    eng -v cmd=fcast -v hours="$hrs" -v who2="$w" | while IFS='=' read -r k v; do
      [ -n "$k" ] && printf '%s\t%s\n' "$k" "$v" >> "$FIELDS"
    done
    fld_commit fc || true
  done
  echo
  $AWK -F'|' -v v="$valid" '
    /\|fc\|/ && $0 ~ ("for=" v) {
      by="";wd="";ws="";mp="";sa="";why=""
      for(i=3;i<=NF;i++){ p=index($i,"="); k=substr($i,1,p-1); x=substr($i,p+1)
        if(k=="by")by=x; else if(k=="wdir")wd=x; else if(k=="wspd")ws=x
        else if(k=="mslp")mp=x; else if(k=="sea")sa=x; else if(k=="why")why=x }
      printf "  %-8s wind %-4s %-4s kn   %-7s hPa   sea %s\n", by, wd, ws, mp, sa
      if(why!="" && why!="-"){ gsub(/%3D/,"=",why); gsub(/%7C/,"|",why)
                               printf "     %s\n", why } }' "$LOG"
  echo
  echo "  Log the observation for $valid in deck-log when it comes,"
  echo "  then: weather score"
  echo
}

help_text() {
  printf '%s\n' \
    '' \
    '  WEATHER -- read your own barometer' \
    '' \
    '  weather                  the menu' \
    '  weather what [24|48|72]  what your log says is coming, with the reasoning,' \
    '                           and the glass over that many hours (48)' \
    '  weather learn [key]      a lesson; no key lists them' \
    '  weather chart            reason over a 500 mb radiofax chart' \
    '  weather isobars [nm lat [N|S] [hPa]]  the wind from a surface chart' \
    '  weather forecast         yours first, then mine, then both are scored' \
    '  weather score            how you, the rules and persistence are doing' \
    '  weather lon <deg>        your longitude, E positive - for the pressure tide' \
    '  weather day|night|plain  colour mode' \
    '  weather about | version' \
    '' \
    '  It reads the deck log; deck-log is what writes it. It never forecasts' \
    '  from a model, because there is no network here and never will be.' \
    ''
}

menu() {
  while :; do
    load_conf; load_prog
    echo
    echo "  ==============================================================="
    echo "   WEATHER $WEATHER_VERSION   read your own barometer"
    echo "  ==============================================================="
    if [ -n "$lon" ]; then echo "   longitude $lon - the pressure tide is corrected for"
    else echo "   no longitude set: 'weather lon <deg>' to correct the pressure tide"; fi
    printf '%s\n' \
      '' \
      '    1  What the log says          4  Make a forecast' \
      '    2  A lesson                   5  The score' \
      '    3  From a 500 mb chart        6  The wind from the isobars' \
      '' \
      '    c  Colour   a  About   h  Help   q  Quit'
    printf "  > "; IFS= read -r c || exit 0
    case "$c" in
      1) eng -v cmd=what ;;
      2) printf "  which lesson (return to list): "; IFS= read -r k; do_learn "$k" ;;
      3) do_chart ;;
      4) do_forecast ;;
      5) eng -v cmd=score ;;
      6) do_isobars ;;
      c|C) printf "  day, night or plain? [%s] " "$cmode"; IFS= read -r v
           case "$v" in day|night|plain) cmode="$v"; save_conf; paint ;; esac ;;
      a|A) about_text ;;
      h|H|\?) help_text ;;
      q|Q) unpaint; exit 0 ;;
      "") ;;
      *) echo "  ?" ;;
    esac
  done
}

pick_awk || true
load_conf
install_engine
case "${1:-}" in
  "")        paint; menu ;;
  what)      shift; eng -v cmd=what -v hours="${1:-48}" ;;
  learn)     shift; do_learn "$1" ;;
  chart)     do_chart ;;
  isobars)   shift; do_isobars "$@" ;;
  forecast)  do_forecast ;;
  score)     eng -v cmd=score ;;
  lon)       shift; lon="$1"; save_conf; echo "  longitude: $lon" ;;
  day|night|plain) cmode="$1"; save_conf; echo "  colour: $cmode" ;;
  about)     about_text ;;
  help|-h|--help) help_text ;;
  version)   echo "weather $WEATHER_VERSION" ;;
  *) echo "  weather: no such command: $1"; help_text; exit 2 ;;
esac

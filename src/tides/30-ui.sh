# ---------------------------------------------------------------------
install_engine() {
  if [ -f "$ENGINE" ] && [ -f "$TABLES" ] && [ -f "$STATIONS" ]; then
    [ "$1" = force ] || { [ -f "$0" ] && [ "$0" -nt "$ENGINE" ] 2>/dev/null; } || return 0
  fi
  mkdir -p "$TIDES_HOME" 2>/dev/null || { echo "tides: cannot create $TIDES_HOME" >&2; exit 1; }
  extract_data
}
need_station() {
  [ -n "$station" ] && return 0
  printf '%s\n' \
    '' \
    '  No station chosen yet. A tide is not computable from a position: it' \
    '  depends on the shape of the coast and the depth of the basin, so it' \
    '  has to be measured somewhere and that somewhere is a station.' \
    '' \
    '    tides near 50.15 -5.07     the stations nearest a position' \
    '    tides find falmouth        by name' \
    '    tides use <id>             choose one' \
    ''
  return 1
}
#  A list is on screen; let the person choose by number.  The numbers
#  are read back from the engine's quiet output, not scraped off the
#  drawn list: a station called "Pier 39" would break that the first
#  time somebody searched for it.
#  A list is on screen; let the person choose by number.  The numbers
#  come from the side file the engine wrote during the same run that
#  drew the list, not from scraping the drawing: a station called
#  "Pier 39" would break that the first time somebody searched for it.
pick_from_list() {
  [ -s "$LISTFILE" ] || return 1
  printf "  Number to use it, or return to search again: "
  IFS= read -r n || return 1
  [ -z "$n" ] && return 1
  case "$n" in *[!0-9]*) echo "  that is not a number"; return 1 ;; esac
  row=$($AWK -F'|' -v n="$n" '$1==n{print; exit}' "$LISTFILE")
  [ -z "$row" ] && { echo "  there is no $n in that list"; return 1; }
  station=$(printf '%s\n' "$row" | cut -d'|' -f2)
  stationname=$(printf '%s\n' "$row" | cut -d'|' -f3)
  save_conf
  printf "  station: %s\n" "$stationname"
  printf "  %s\n" "$station"
  return 0
}
#  Declining to pick a station is a normal outcome, not a failure: these
#  return 0 either way, so a caller running under 'set -e' is not killed
#  by somebody pressing return.
do_near() {
  : > "$LISTFILE"
  eng -v cmd=near -v lat="$1" -v lon="$2" -v k="${3:-10}" -v rawto="$LISTFILE"
  pick_from_list || true
  return 0
}
do_find() {
  : > "$LISTFILE"
  eng -v cmd=search -v q="$1" -v k="${2:-20}" -v rawto="$LISTFILE"
  pick_from_list || true
  return 0
}
#  Searching by name from the menu keeps asking until something is
#  chosen or the person gives up.  A first guess at a station name is
#  usually wrong, and having to walk back out to the menu to try again
#  is what makes people stop looking.
find_loop() {
  while :; do
    printf "\n  name, or part of one (return to go back): "
    IFS= read -r q || return 0
    [ -z "$q" ] && return 0
    : > "$LISTFILE"
    eng -v cmd=search -v q="$q" -v k=20 -v rawto="$LISTFILE"
    [ -s "$LISTFILE" ] || continue
    pick_from_list && return 0
  done
}
do_day() {
  need_station || return 1
  d="${1:-$(utctoday)}"
  y=$(echo "$d" | cut -d- -f1); m=$(echo "$d" | cut -d- -f2); dd=$(echo "$d" | cut -d- -f3)
  eng -v cmd=day -v id="$station" -v yy="$y" -v mm="$m" -v dd="$dd" -v sky="${SKY:-0}" \
      -v nowdate="$(utctoday)" -v nowtime="$(date -u '+%H:%M')" \
      -v charted="$CHARTED" -v draft="$DRAFT" -v clear="$CLEAR" -v air="$AIR" -v mast="$MAST"
}
#  The coastal-navigation calculators.  Each key=value argument is passed
#  through untouched, joined with | into one -v string; the engine reads
#  and checks them, so the shell and the browser refuse the same input
#  with the same words.  The chosen station is the default for the two
#  calculators that need one, and now is the default time.
do_work() {
  wn="$1"; [ $# -gt 0 ] && shift
  wa=""
  for a in "$@"; do wa="$wa|$a"; done
  eng -v cmd=work -v wname="$wn" -v wargs="$wa" -v defstation="$station" \
      -v nowdate="$(utctoday)" -v nowtime="$(date -u '+%H:%M')" -v nofig="${NOFIG:-0}"
}
#  From the menu: show the six with an example each, take a name and a
#  line of parameters, and go round again until return.  The parameter
#  line is split on spaces with globbing off, so a value is never taken
#  for a file pattern.
work_menu() {
  while :; do
    eng -v cmd=work -v wname=help
    printf "  calculator (return to go back): "; IFS= read -r wn || return 0
    [ -z "$wn" ] && return 0
    printf "  parameters, key=value separated by spaces:\n  "; IFS= read -r wp || return 0
    set -f
    # shellcheck disable=SC2086
    do_work "$wn" $wp || true
    set +f
    printf "  return for the list again "; IFS= read -r _x || return 0
  done
}
help_text() {
  printf '%s\n' \
    '' \
    '  TIDES -- harmonic tide prediction, with no network and no subscription' \
    '' \
    '  tides                    the menu' \
    '  tides near <lat> <lon>   the stations nearest a position' \
    '  tides find <text>        search for a station by name' \
    '  tides use <id>           choose a station' \
    '  tides today [date]       the day'\''s table, curve and depth helper' \
    '  tides sky [date]         the same, with the moon and sun panel' \
    '  tides work <name> k=v .. coastal navigation, working shown (tides work help)' \
    '  tides where              which station is chosen, and where the files are' \
    '  tides day|night|plain    colour mode' \
    '  tides about              what this is, where the data comes from' \
    '  tides version' \
    '' \
    '  Dates are YYYY-MM-DD.  Times are the station'\''s own standard time -' \
    '  no summer time, exactly like a printed tide table.' \
    '' \
    '  FINDING A STATION' \
    '' \
    '  Nobody guesses a station'\''s exact name: the database calls a place' \
    '  "NEW LONDON  State Pier" or "Chappaquoit Point  West Falmouth' \
    '  Harbor".  So type part of it and pick from the numbered list.' \
    '' \
    '  Every word you type has to appear somewhere in the name, the state' \
    '  or the country, but in any order and anywhere inside a word, so' \
    '  "lon new" finds New London just as well as "new london" does.' \
    '' \
    '  If you want more control, the text is used as a regular expression' \
    '  the moment it contains any of  ^ $ . [ ] | ( ) * + ? { } \' \
    '' \
    '    tides find "^st mary"        names that start with St Mary' \
    '    tides find "bay$"            names that end in Bay' \
    '    tides find "falmouth|mystic" either one' \
    '    tides find "port.*bay"       Port, then anything, then Bay' \
    '' \
    '  A pattern that is not a valid regular expression is searched as' \
    '  plain text instead rather than refusing to answer.' \
    '' \
    '  A tide cannot be computed from a position. It depends on the shape of' \
    '  the coast and the depth and resonance of the basin, so every place' \
    '  needs constants somebody measured there. That is why you pick a' \
    '  station and not a place, and why the nearest one by straight line can' \
    '  be on the wrong side of a headland.' \
    ''
}
menu() {
  while :; do
    load_conf
    echo
    echo "  ==============================================================="
    echo "   TIDES $TIDES_VERSION   harmonic prediction, offline"
    echo "  ==============================================================="
    if [ -n "$station" ]; then echo "   station: $stationname"
    else echo "   no station chosen"; fi
    printf '%s\n' \
      '' \
      '    1  Today' \
      '    2  Another day' \
      '    3  Today, with the moon and sun' \
      '    4  Depth and clearance' \
      '    5  Choose a station by name' \
      '    6  Choose a station near a position' \
      '    7  Coastal work: twelfths, secondary ports, streams, course to steer' \
      '' \
      '    c  Colour   a  About   h  Help   q  Quit'
    printf "  > "; IFS= read -r c || exit 0
    case "$c" in
      1) SKY=0; do_day ;;
      2) printf "  date (YYYY-MM-DD): "; IFS= read -r d; SKY=0; do_day "$d" ;;
      3) SKY=1; do_day ;;
      4) ask_depth; SKY=0; do_day; CHARTED=""; DRAFT=""; CLEAR=""; AIR=""; MAST="" ;;
      5) find_loop ;;
      6) printf "  latitude: "; IFS= read -r la; printf "  longitude: "; IFS= read -r lo
         [ -n "$la" ] && do_near "$la" "$lo" ;;
      7) work_menu ;;
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
ask_depth() {
  echo
  echo "  Leave any of these blank to skip it."
  printf "  charted depth at the spot (m): "; IFS= read -r CHARTED
  if [ -n "$CHARTED" ]; then
    printf "  your draught (m): "; IFS= read -r DRAFT
    printf "  water you want under the keel (m): "; IFS= read -r CLEAR
  fi
  printf "  charted height of a bridge (m, above HAT): "; IFS= read -r AIR
  [ -n "$AIR" ] && { printf "  your air draught (m): "; IFS= read -r MAST; }
}
about_text() {
  printf '%s\n' \
    '' \
    '  TIDES -- what it is, and what it is not' \
    '  ---------------------------------------------------------------' \
    '  Harmonic prediction from constants measured at each station, with' \
    '  no network and no subscription. 8,334 stations: 6,090 with their' \
    '  own harmonic constants and 2,244 that offset from a neighbour,' \
    '  which is exactly how a printed tide table is built.' \
    '' \
    '  CHECKED AGAINST NOAA'\''s OWN PUBLISHED TABLES.  Twenty-four high and' \
    '  low waters at six stations spanning small and large ranges, mixed' \
    '  and diurnal regimes: a mean error of 2.4 minutes and 1.0 cm, worst' \
    '  5.9 minutes and 2.0 cm. The fixture is committed, so the check runs' \
    '  with no network like everything else here.' \
    '' \
    '  WHAT IT DOES NOT KNOW.  The weather. A deep low can raise the sea' \
    '  half a metre above prediction and a hard high can drop it as far;' \
    '  wind piles water onto a lee shore and drains a weather one. River' \
    '  flow after rain does the same. A prediction is the astronomical' \
    '  tide and nothing else, and on the day the water does what it' \
    '  likes.' \
    '' \
    '  Nor does it know about summer time. Times are the station'\''s own' \
    '  standard time, exactly like a printed table, because that is what' \
    '  the offsets in the data are referenced to.' \
    '' \
    '  DATA.  NOAA harmonic constants: works of the U.S. federal' \
    '  government, public domain. TICON-4 harmonic constants: Piccioni,' \
    '  Dettmering, Schwatke, Passaro and Seitz, CC BY 4.0. Assembled by' \
    '  way of the neaps tide-database project, CC BY 4.0. That attribution' \
    '  travels with the data and is not changed by this program'\''s licence.' \
    '  See NOTICE.' \
    '' \
    '  Copyright 2026 M. Larry Sherman.  Apache License 2.0.  NO WARRANTY.' \
    '  Carry a paper tide table.' \
    ''
}
# ---- entry point ----------------------------------------------------
pick_awk
install_engine
load_conf
case "$1" in
  ""|menu) paint; menu ;;
  near)    shift; do_near "$1" "$2" "${3:-10}" ;;
  find|search) shift; do_find "$1" ;;
  use)     shift
           n=$(eng -v cmd=info -v id="$1" -v yy=2026 -v mm=1 -v dd=1 | cut -d'|' -f2)
           [ -z "$n" ] && { echo "tides: no station with that id"; exit 2; }
           station="$1"; stationname="$n"; save_conf; echo "station: $stationname" ;;
  today)   shift; SKY=0; do_day "$1" ;;
  sky)     shift; SKY=1; do_day "$1" ;;
  height)  shift
           need_station || exit 1
           d="${1:-$(utctoday)}"; t="${2:-12:00}"
           eng -v cmd=height -v id="$station" \
               -v yy=$(echo "$d"|cut -d- -f1) -v mm=$(echo "$d"|cut -d- -f2) \
               -v dd=$(echo "$d"|cut -d- -f3) \
               -v hh=$(echo "$t"|cut -d: -f1) -v mi=$(echo "$t"|cut -d: -f2) ;;
  work)    shift; do_work "$@"; exit $? ;;
  where)   echo "station: ${stationname:-none} ${station}"
           echo "engine:  $ENGINE"
           echo "data:    $STATIONS"
           echo "config:  $CONF" ;;
  day|night|plain) cmode="$1"; save_conf; echo "colour mode: $cmode" ;;
  about)   about_text ;;
  reinstall) install_engine force; echo "engine rewritten: $ENGINE" ;;
  help|-h|--help) help_text ;;
  version|--version) echo "tides $TIDES_VERSION" ;;
  *) echo "tides: there is no command '$1'."
     echo
     echo "  Working    today  sky  height  near  find  use  work"
     echo "  Setup      day  night  plain  about  where  version"
     echo
     echo "  'tides help' explains each of them."
     exit 2 ;;
esac

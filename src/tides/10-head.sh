#!/bin/sh
# =====================================================================
#  tides -- harmonic tide prediction, offline
#  Part of Bash Navigation Software.  https://github.com/navigationtools/bashnav
#  Copyright 2026 M. Larry Sherman.  Apache License 2.0.
# =====================================================================
TIDES_VERSION=1.1
TIDES_HOME=${TIDES_HOME:-$(bn_home .tides)}
CONF="$TIDES_HOME/config"
ENGINE="$TIDES_HOME/engine-$TIDES_VERSION.awk"
TABLES="$TIDES_HOME/tables-$TIDES_VERSION.awk"
STATIONS="$TIDES_HOME/stations.dat"
LISTFILE="$TIDES_HOME/lastlist"   # the numbered list a search just drew
cmode=day
ISTTY=0; [ -t 1 ] && ISTTY=1
station=""
stationname=""
awk_has_math() {
  [ -n "$1" ] || return 1
  command -v "${1%% *}" >/dev/null 2>&1 || return 1
  $1 'BEGIN{ if (sin(1)>0 && atan2(1,1)>0) exit 0; exit 1 }' </dev/null 2>/dev/null
}
pick_awk() {
  #  An awk named by hand is used as given -- but CHECKED first.  A
  #  name that is not there produced "could not write engine-1.6.awk"
  #  from the unpacker, which names the wrong thing entirely and is
  #  hopeless on a device with no debugger.
  if [ -n "$TIDES_AWK" ]; then
    AWK="$TIDES_AWK"
    if $AWK 'BEGIN{ exit 0 }' </dev/null >/dev/null 2>&1; then return 0; fi
    echo "tides: TIDES_AWK is set to '$AWK', which will not run." >&2
    echo "  Unset it, or name an awk that is installed." >&2
    exit 1
  fi
  for a in awk gawk mawk nawk original-awk "busybox awk"; do
    if awk_has_math "$a"; then AWK="$a"; return 0; fi
  done
  AWK=awk
  printf '%s\n' \
    'tides: no awk with trigonometric functions was found.' \
    '  On macOS:         nothing to do - the built-in awk already has it.' \
    '  On iSH (Alpine):  apk add gawk      On Termux: pkg install gawk' \
    '  On Debian:        sudo apt install gawk' >&2
  return 1
}
load_conf() {
  [ -f "$CONF" ] || return 0
  while IFS='=' read -r k v; do
    case "$k" in
      cmode) cmode="$v" ;;
      station) station="$v" ;;
      stationname) stationname="$v" ;;
    esac
  done < "$CONF"
}
save_conf() {
  mkdir -p "$TIDES_HOME"
  printf '%s\n' "cmode=$cmode" "station=$station" "stationname=$stationname" > "$CONF"
}
paint() {
  [ "$cmode" = plain ] && return 0
  [ "$ISTTY" = 1 ] || return 0
  case "$cmode" in
    night) printf '\033[40m\033[31m\033[2J\033[H' ;;
    day)   printf '\033[40m\033[37m\033[2J\033[H' ;;
  esac
}
unpaint() { [ "$cmode" = plain ] || { [ "$ISTTY" = 1 ] && printf '\033[0m\n'; }; }
cmode_now() { if [ "$ISTTY" = 1 ]; then echo "$cmode"; else echo plain; fi; }
eng() { $AWK -f "$TABLES" -f "$ENGINE" -v cmode="$(cmode_now)" -v SF="$STATIONS" "$@" </dev/null; }
utcnow() { date -u '+%Y-%m-%d %H:%M:%S'; }
utctoday() { date -u '+%Y-%m-%d'; }

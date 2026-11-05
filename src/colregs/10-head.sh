#!/bin/sh
# =====================================================================
#  colregs -- the international rules of the road, drawn in characters
#  Part of Bash Navigation Software.  Pure POSIX sh + awk, no network.
#
#  A TRAINING AID ONLY.  The COLREGs themselves govern; see the notice
#  printed by "colregs about".
# =====================================================================
COLREGS_VERSION=1.15

: "${COLREGS_HOME:=$(bn_home .colregs)}"
ENGINE="$COLREGS_HOME/engine-$COLREGS_VERSION.awk"
CONTACTS="$COLREGS_HOME/contacts-$COLREGS_VERSION.awk"
REVIEW="$COLREGS_HOME/review-$COLREGS_VERSION.awk"
#  where a review issue goes; override with GH_USER to test against a fork
GH_USER=${GH_USER:-navigationtools}
CONF="$COLREGS_HOME/colregs.conf"
PROG="$COLREGS_HOME/progress"

cmode=day
#  How a contact's bearing off your own head is spoken. Which one is
#  right depends on who is listening, so it is a setting, not a choice
#  made here: rn (Red/Green), usn (Port/Starboard), rel360, words, none.
rstyle=rn
#  Note: [ -t 1 ] must be tested HERE, at the top level, and not
#  inside cmode_now.  Inside a command substitution stdout is a
#  pipe, so the test is always false and every terminal would be
#  told it was plain.  That bug ate the colour on real terminals.
ISTTY=0; [ -t 1 ] && ISTTY=1
lessons=""; sok=0; stry=0

awk_has_math() {
  $1 'BEGIN{ x=atan2(1,1)+sqrt(2.0)+sin(1)+cos(1); if(x>0) exit 0; exit 1 }' </dev/null >/dev/null 2>&1
}
pick_awk() {
  #  An awk named by hand is used as given -- but CHECKED first.  A
  #  name that is not there produced "could not write engine-1.6.awk"
  #  from the unpacker, which names the wrong thing entirely and is
  #  hopeless on a device with no debugger.
  if [ -n "$COLREGS_AWK" ]; then
    AWK="$COLREGS_AWK"
    if $AWK 'BEGIN{ exit 0 }' </dev/null >/dev/null 2>&1; then return 0; fi
    echo "colregs: COLREGS_AWK is set to '$AWK', which will not run." >&2
    echo "  Unset it, or name an awk that is installed." >&2
    exit 1
  fi
  for a in awk gawk mawk nawk original-awk "busybox awk"; do
    if awk_has_math "$a"; then AWK="$a"; return 0; fi
  done
  AWK=awk
  printf '%s\n' \
    'colregs: no awk with trigonometric functions was found.' \
    '  On macOS:         nothing to do - the built-in awk already has it.' \
    '  On iSH (Alpine):  apk add gawk      On Termux: pkg install gawk' \
    '  On Debian:        sudo apt install gawk' >&2
  return 1
}
load_conf() {
  [ -f "$CONF" ] || return 0
  while IFS='=' read -r k v; do
    case "$k" in cmode) cmode="$v" ;; rstyle) rstyle="$v" ;; esac
  done < "$CONF"
}
save_conf() { mkdir -p "$COLREGS_HOME"
  printf '%s\n' "cmode=$cmode" "rstyle=$rstyle" > "$CONF"; }
load_prog() {
  [ -f "$PROG" ] || return 0
  while IFS='=' read -r k v; do
    case "$k" in lessons) lessons="$v" ;; sok) sok="$v" ;; stry) stry="$v" ;; esac
  done < "$PROG"
}
save_prog() {
  mkdir -p "$COLREGS_HOME"
  printf '%s\n' "lessons=$lessons" "sok=$sok" "stry=$stry" > "$PROG"
}
mark_done() {
  case ",$lessons," in *,"$1",*) return 0 ;; esac
  if [ -z "$lessons" ]; then lessons="$1"; else lessons="$lessons,$1"; fi
  save_prog
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
eng() { $AWK -f "$ENGINE" -f "$CONTACTS" -f "$REVIEW" -v cmode="$(cmode_now)" -v rstyle="$rstyle" "$@" </dev/null; }
newseed() { echo $(( ( $(date +%s 2>/dev/null || echo 99) + $$ ) % 999983 )); }

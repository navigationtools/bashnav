#!/bin/sh
# =====================================================================
#  celnav -- celestial navigation for the small screen
#  Pure POSIX shell + awk.  No network, no almanac tables, no libraries.
#  Runs on iSH, a-Shell, Termux, macOS and Linux.
#
#  Larry Sherman / built with Claude.  See celnav-manual.pdf.
# =====================================================================
CELNAV_VERSION=1.6.1

: "${CELNAV_HOME:=$(bn_home .celnav)}"
ENGINE="$CELNAV_HOME/engine-$CELNAV_VERSION.awk"
TEACH="$CELNAV_HOME/teach-$CELNAV_VERSION.awk"
PROG="$CELNAV_HOME/progress"
SIGHTS="$CELNAV_HOME/sights.txt"
CONF="$CELNAV_HOME/celnav.conf"

# ---- pick an awk that has the maths library --------------------------
awk_has_math() {
  $1 'BEGIN{ x=atan2(1,1)+sqrt(2.0)+sin(1)+cos(1)+exp(1)+log(2); if(x>0) exit 0; exit 1 }' </dev/null >/dev/null 2>&1
}
pick_awk() {
  #  An awk named by hand is used as given -- but CHECKED first.  A
  #  name that is not there produced "could not write engine-1.6.awk"
  #  from the unpacker, which names the wrong thing entirely and is
  #  hopeless on a device with no debugger.
  if [ -n "$CELNAV_AWK" ]; then
    AWK="$CELNAV_AWK"
    if $AWK 'BEGIN{ exit 0 }' </dev/null >/dev/null 2>&1; then return 0; fi
    echo "celnav: CELNAV_AWK is set to '$AWK', which will not run." >&2
    echo "  Unset it, or name an awk that is installed." >&2
    exit 1
  fi
  for a in awk gawk mawk nawk original-awk "busybox awk"; do
    if awk_has_math "$a"; then AWK="$a"; return 0; fi
  done
  AWK=awk
  printf '%s\n' \
    'celnav: no awk with trigonometric functions was found.' \
    '' \
    '  On macOS:            nothing to do - the built-in awk already has it.' \
    '                       (apk is Alpine'\''s, and only exists inside iSH.)' \
    '  On iSH (Alpine):     apk add gawk' \
    '  On Termux:           pkg install gawk' \
    '  On Debian/Ubuntu:    sudo apt install gawk' \
    '  a-Shell already has a suitable awk built in.' \
    '' \
    '  If your awk is under another name, set it explicitly:' \
    '      CELNAV_AWK=gawk celnav' >&2
  return 1
}

# ---- defaults -------------------------------------------------------
drlat="00 00.0 N"; drlon="000 00.0 E"; course=0; speed=0
heye=2.5; ie=0.0; temp=10; press=1010; fixtime=""
cmode=day
#  Note: [ -t 1 ] must be tested HERE, at the top level, and not
#  inside cmode_now.  Inside a command substitution stdout is a
#  pipe, so the test is always false and every terminal would be
#  told it was plain.  That bug ate the colour on real terminals.
ISTTY=0; [ -t 1 ] && ISTTY=1

# ---- config ---------------------------------------------------------
load_conf() {
  [ -f "$CONF" ] || return 0
  while IFS='=' read -r k v; do
    case "$k" in
      drlat) drlat="$v" ;; drlon) drlon="$v" ;;
      course) course="$v" ;; speed) speed="$v" ;;
      heye) heye="$v" ;; ie) ie="$v" ;;
      temp) temp="$v" ;; press) press="$v" ;;
      cmode) cmode="$v" ;;
    esac
  done < "$CONF"
}
save_conf() {
  mkdir -p "$CELNAV_HOME"
#  ONE command, ONE redirect.  Not "{ echo a; echo b; } > file":
#  a-Shell loses all but one line of a compound command's output, which
#  wrote a single-line config file and then hung the tool on relaunch --
#  silent corruption, not an error.  A single printf is proven to work
#  there.  See docs/HACKING.md.
  printf '%s\n' \
    "drlat=$drlat" "drlon=$drlon" \
    "course=$course" "speed=$speed" \
    "heye=$heye" "ie=$ie" \
    "temp=$temp" "press=$press" \
    "cmode=$cmode" > "$CONF"
}

# colour: day (white on black), night (red on black), plain (no escapes)
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
engine() { $AWK -f "$ENGINE" -v cmode="$(cmode_now)" "$@" </dev/null; }
teach()  { $AWK -f "$ENGINE" -f "$TEACH" -v cmode="$(cmode_now)" "$@" </dev/null; }

# ---- training progress ---------------------------------------------
lessons=""; dok=0; dtry=0
load_prog() {
  [ -f "$PROG" ] || return 0
  while IFS='=' read -r k v; do
    case "$k" in lessons) lessons="$v" ;; dok) dok="$v" ;; dtry) dtry="$v" ;; esac
  done < "$PROG"
}
save_prog() {
  mkdir -p "$CELNAV_HOME"
  printf '%s\n' "lessons=$lessons" "dok=$dok" "dtry=$dtry" > "$PROG"
}
mark_done() {
  case ",$lessons," in *,"$1",*) return 0 ;; esac
  if [ -z "$lessons" ]; then lessons="$1"; else lessons="$lessons,$1"; fi
  save_prog
}
newseed() { echo $(( ( $(date +%s 2>/dev/null || echo 12345) + $$ ) % 999983 )); }

utcnow() { date -u +"%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "2026-01-01 00:00:00"; }
utctoday() { date -u +"%Y-%m-%d" 2>/dev/null || echo "2026-01-01"; }

# normalise a time typed as HHMM, HHMMSS, HH:MM or HH:MM:SS
fixtimefmt() {
  t=$(echo "$1" | tr -d ' ')
  case "$t" in
    *:*:*) echo "$t" ;;
    *:*)   echo "$t:00" ;;
    ??????) echo "$(echo "$t"|cut -c1-2):$(echo "$t"|cut -c3-4):$(echo "$t"|cut -c5-6)" ;;
    ????)   echo "$(echo "$t"|cut -c1-2):$(echo "$t"|cut -c3-4):00" ;;
    *) echo "$t" ;;
  esac
}

nsights() { [ -f "$SIGHTS" ] && grep -cv '^[ 	]*\(#\|$\)' "$SIGHTS" 2>/dev/null || echo 0; }

# ---- sight log ------------------------------------------------------
add_sight() {   # utc body limb hs ie heye temp press label
  mkdir -p "$CELNAV_HOME"
  printf '%s|%s|%s|%s|%s|%s|%s|%s|%s\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" >> "$SIGHTS"
}
list_sights() {
  if [ ! -s "$SIGHTS" ]; then echo "  (sight log is empty)"; return; fi
  echo "   #  UT                    body        limb  Hs          IE    eye"
  echo "  --------------------------------------------------------------------"
  n=0
  while IFS='|' read -r u b l hs i he t p lbl; do
    case "$u" in ''|\#*) continue ;; esac
    n=$((n+1))
    printf "  %2d  %-21s %-11s %-5s %-11s %-5s %s\n" "$n" "$u" "$b" "$l" "$hs" "$i" "$he"
  done < "$SIGHTS"
}
del_sight() {
  [ -s "$SIGHTS" ] || return 0
  $AWK -v k="$1" 'BEGIN{n=0} /^[ \t]*(#|$)/{print;next} {n++; if(n!=k) print}' "$SIGHTS" > "$SIGHTS.tmp" \
    && mv "$SIGHTS.tmp" "$SIGHTS"
}

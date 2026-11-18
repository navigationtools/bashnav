#!/bin/sh
# =====================================================================
#  deck-log -- the boat's records: deck, engine, provisions.
#  Part of Bash Navigation Software.  Pure POSIX sh + awk, no network.
#
#  A LOG IS A RECORD.  It has standing after an incident and is read by
#  people who were not there.  So: append only, never edited in place,
#  corrections are new entries that reference the old one, and every
#  timestamp is UTC.  See docs/DECK-LOG.md.
# =====================================================================
DECKLOG_VERSION=1.1.2

: "${DECKLOG_HOME:=$(bn_home .bashnav)}"
LOG="$DECKLOG_HOME/log"
BOAT="$DECKLOG_HOME/boat"
CONF="$DECKLOG_HOME/decklog.conf"
ENGINE="$DECKLOG_HOME/decklog-$DECKLOG_VERSION.awk"

cmode=day
#  [ -t 1 ] must be tested HERE and not inside cmode_now: inside a
#  command substitution stdout is a pipe, the test is always false, and
#  every terminal gets told it is plain.  See docs/HACKING.md.
ISTTY=0; [ -t 1 ] && ISTTY=1
units=metric
who=""

awk_has_math() {
  $1 'BEGIN{ x=atan2(1,1)+sqrt(2.0)+sin(1); if(x>0) exit 0; exit 1 }' </dev/null >/dev/null 2>&1
}
pick_awk() {
  #  An awk named by hand is used as given -- but CHECKED first.  A
  #  name that is not there produced "could not write engine-1.6.awk"
  #  from the unpacker, which names the wrong thing entirely and is
  #  hopeless on a device with no debugger.
  if [ -n "$DECKLOG_AWK" ]; then
    AWK="$DECKLOG_AWK"
    if $AWK 'BEGIN{ exit 0 }' </dev/null >/dev/null 2>&1; then return 0; fi
    echo "deck-log: DECKLOG_AWK is set to '$AWK', which will not run." >&2
    echo "  Unset it, or name an awk that is installed." >&2
    exit 1
  fi
  for a in awk gawk mawk nawk original-awk "busybox awk"; do
    if awk_has_math "$a"; then AWK="$a"; return 0; fi
  done
  AWK=awk
  echo "deck-log: no usable awk found." >&2
  return 1
}
load_conf() {
  [ -f "$CONF" ] || return 0
  while IFS='=' read -r k v; do
    case "$k" in cmode) cmode="$v" ;; units) units="$v" ;; who) who="$v" ;; esac
  done < "$CONF"
}
save_conf() {
  mkdir -p "$DECKLOG_HOME"
  printf '%s\n' "cmode=$cmode" "units=$units" "who=$who" > "$CONF"
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

eng() {
  $AWK -f "$ENGINE" -v cmode="$(cmode_now)" -v LOG="$LOG" -v BOAT="$BOAT" \
       -v units="$units" -v who="$who" -v now="$(utcstamp)" "$@" </dev/null
}
utcstamp() { date -u '+%Y-%m-%dT%H:%MZ'; }
utcday()   { date -u '+%Y-%m-%d'; }

# ---------------------------------------------------------------------
#  Appending.
#
#  awk BUILDS and VALIDATES the record; the shell appends it with a
#  single >> of one line.  Two reasons.  One append of a short line is
#  as close to atomic as this platform gets, which matters when iOS can
#  suspend the app mid-write.  And there is then exactly one place that
#  knows the format, which is the awk record layer.
#
#  Fields are handed over in a temp file as  key<TAB>value  so a value
#  may contain anything a person can type, including | and =.
# ---------------------------------------------------------------------
FIELDS=""
fld_start() {
  #  Not /tmp: iOS gives an app Documents, Library and its own tmp,
  #  and nothing promises a /tmp at all.  DECKLOG_HOME was probed for
  #  writability at startup, so it is the one place known to work.
  FIELDS="$DECKLOG_HOME/.fields.$$"
  : > "$FIELDS"
}
#  fld k v   - skip nothing: an empty value is a DECLINED field and is
#  recorded as such.  Callers pass "-" for declined and "/" for not
#  observable, and both are real answers.
fld() { printf '%s\t%s\n' "$1" "$2" >> "$FIELDS"; }
fld_commit() {
  type=$1
  mkdir -p "$DECKLOG_HOME"
  rec=$(eng -v cmd=mkrec -v type="$type" -v fields="$FIELDS")
  rm -f "$FIELDS"; FIELDS=""
  [ -n "$rec" ] || { echo "  deck-log: refused to write a malformed record" >&2; return 1; }
  printf '%s\n' "$rec" >> "$LOG" || return 1
  return 0
}

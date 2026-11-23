
# ---------------------------------------------------------------------
pause() { printf "  -- press return --"; IFS= read -r _j; }
ask1() { printf "  Your answer (a/b/c/d, or return to skip): "; IFS= read -r ANS; }

run_quiz() {   # $1 = qlight|qshape|qsound  $2 = mark cmd
  while :; do
    sd=$(newseed)
    eng -v cmd="$1" -v seed="$sd"
    ANS2=""
    if [ "$1" = qlight ]; then
      printf "  Q1 what is she    (a/b/c/d, or return to skip): "; IFS= read -r ANS
      [ -z "$ANS" ] && return 0
      printf "  Q2 which way      (a/b/c/d): "; IFS= read -r ANS2
    else
      ask1
      [ -z "$ANS" ] && return 0
    fi
    stry=$((stry+1))
    if eng -v cmd="$2" -v seed="$sd" -v ans="$ANS" -v ans2="$ANS2"; then sok=$((sok+1)); fi
    save_prog
    printf "  another? [Y/n] "; IFS= read -r a
    case "$a" in n|N|q|Q|x|X) return 0 ;; esac
  done
}
run_enc() {
  while :; do
    sd=$(newseed)
    eng -v cmd=enc -v seed="$sd"
    ask1
    [ -z "$ANS" ] && return 0
    stry=$((stry+1))
    if eng -v cmd=encm -v seed="$sd" -v ans="$ANS"; then sok=$((sok+1)); fi
    save_prog
    #  The lights, after the answer. Larry expected this here: it existed
    #  in the developing-collision flow and not in this one. After the
    #  answer rather than before it, because for more than half the
    #  scenarios the lights ARE the question.
    printf "  See her lights? [y/N] "; IFS= read -r L
    case "$L" in y|Y|l|L) eng -v cmd=enclights -v seed="$sd" ;; esac
    printf "  another? [Y/n] "; IFS= read -r a
    case "$a" in n|N|q|Q|x|X) return 0 ;; esac
  done
}
run_scen() {
  while :; do
    sd=$(newseed)
    eng -v cmd=scen -v seed="$sd" || return 0
    printf "  Q1 risk       (a/b/c)   : "; IFS= read -r q1
    [ -z "$q1" ] && return 0
    printf "  Q2 how close  (a/b/c/d) : "; IFS= read -r q2
    printf "  Q3 action     (a/b/c/d) : "; IFS= read -r q3
    stry=$((stry+1))
    if eng -v cmd=scenm -v seed="$sd" -v a1="$q1" -v a2="$q2" -v a3="$q3"; then
      sok=$((sok+1))
    fi
    save_prog
    #  AFTER the marking, deliberately.  The panel names the governing
    #  rule, which is most of the answer to Q3 -- offered before you
    #  answer it would be a hint, and the point is to check your reading
    #  of the lights against the rule once you have committed.
    printf "  Show the lights each boat sees? [y/N] "; IFS= read -r L
    case "$L" in y|Y|l|L) eng -v cmd=scenlights -v seed="$sd" ;; esac
    printf "  Watch it run? [Y/n] "; IFS= read -r w
    case "$w" in
      n|N) ;;
      *)  t=12
          while [ "$t" -le 90 ]; do
            eng -v cmd=scenframe -v seed="$sd" -v ans="$q3" -v tmin="$t"
            rc=$?
            [ "$rc" -eq 3 ] && break
            printf "  -- return for the next six minutes, x to stop -- "; IFS= read -r z
            case "$z" in x|X|q|Q) break ;; esac
            t=$((t+6))
          done
          eng -v cmd=scenout -v seed="$sd" -v ans="$q3" ;;
    esac
    printf "  another scenario? [Y/n] "; IFS= read -r a
    case "$a" in n|N|q|Q|x|X) return 0 ;; esac
  done
}
do_lesson() {
  eng -v cmd=lesson -v les_id="$1" || return 1
  printf "  Your answer (a/b/c, or return to skip): "; IFS= read -r av
  [ -z "$av" ] && return 0
  if eng -v cmd=check -v les_id="$1" -v ans="$av"; then mark_done "$1"; fi
}
rules_menu() {
  while :; do
    eng -v cmd=syllabus -v done="$lessons"
    printf "  Lesson code, n for the next one, or x to go back: "; IFS= read -r a
    case "$a" in
      x|X|"") return ;;
      n|N) nx=""
           for L in L1 L2 L3 L4 L5 L6 L7 L8 L9 L10 L11 L12 L13 L14 L15; do
             case ",$lessons," in *,"$L",*) ;; *) nx="$L"; break ;; esac
           done
           if [ -z "$nx" ]; then echo "  All fifteen done."; else do_lesson "$nx"; fi ;;
      *)   do_lesson "$(echo "$a" | tr 'a-z' 'A-Z')" ;;
    esac
  done
}
# ---- contacts: bearing drift, the report, and the tracking party ----
do_clesson() { eng -v cmd=clesson -v les_id="$1" && mark_done "$1"; }
run_track() {
  while :; do
    sd=$(newseed)
    eng -v cmd=track -v seed="$sd" || return 0
    printf "  Q1 drift          (a/b/c, or return to skip): "; IFS= read -r t1
    [ -z "$t1" ] && return 0
    printf "  Q2 ahead/astern   (a/b/c): "; IFS= read -r t2
    printf "  Q3 CPA            (a/b/c/d): "; IFS= read -r t3
    stry=$((stry+1))
    if eng -v cmd=trackm -v seed="$sd" -v a1="$t1" -v a2="$t2" -v a3="$t3"; then sok=$((sok+1)); fi
    save_prog
    printf "  another contact? [Y/n] "; IFS= read -r a
    case "$a" in n|N|q|Q|x|X) return 0 ;; esac
  done
}
run_ekelund() {
  while :; do
    sd=$(newseed)
    eng -v cmd=ek -v seed="$sd" || return 0
    printf "  How far off (a/b/c/d, or return to skip): "; IFS= read -r ANS
    [ -z "$ANS" ] && return 0
    stry=$((stry+1))
    if eng -v cmd=ekm -v seed="$sd" -v ans="$ANS"; then sok=$((sok+1)); fi
    save_prog
    printf "  another? [Y/n] "; IFS= read -r a
    case "$a" in n|N|q|Q|x|X) return 0 ;; esac
  done
}
style_name() {
  case "$1" in
    rn)     echo "Red and Green" ;;
    usn)    echo "Port and starboard" ;;
    rel360) echo "Relative, full circle" ;;
    words)  echo "Words only" ;;
    none)   echo "True bearing only" ;;
    *)      echo "$1" ;;
  esac
}
style_menu() {
  while :; do
    printf '%s\n' \
      '' \
      '  REPORTING STYLE' \
      '  ---------------------------------------------------------------' \
      '  How this program says where a contact lies relative to your own' \
      '  head.  It changes the report and the relative column on the' \
      '  plot.  The true bearing is always given as well, because that is' \
      '  what goes on the chart and what agrees with the radar - this' \
      '  setting only decides how the same angle is said out loud.' \
      '' \
      '  1  Red and Green            "bearing 311, Red 20, drawing left"' \
      '     Royal Navy and British practice.  Red is port and Green is' \
      '     starboard because those are your own sidelights, which is why' \
      '     it is remembered.  The side is carried by a word rather than a' \
      '     digit, so it survives a bad intercom, a following sea and a' \
      '     tired listener.  Nought to 180 each side.' \
      '' \
      '  2  Port and starboard       "bearing 311, Port 20, drawing left"' \
      '     The same information in plainer words, and common in United' \
      '     States and merchant practice.  Longer to say, and the one' \
      '     least likely to be misunderstood by somebody who has never' \
      '     met the Red and Green convention.' \
      '' \
      '  3  Relative, full circle    "bearing 311, 340 relative, ..."' \
      '     Measured clockwise from your own bow, 000 to 359.  Neat on a' \
      '     plot and in a written message.  Worse in the dark, because' \
      '     the listener has to work out for himself which side 340 is' \
      '     on, which is exactly the sum you were trying to save him.' \
      '' \
      '  4  Words only               "bearing 311, fine on the port bow"' \
      '     No number at all.  The slowest to say and the fastest to act' \
      '     on, and the only one that still works when you are shouting' \
      '     to somebody who is not looking at any instrument at all.' \
      '' \
      '  5  True bearing only        "bearing 311, drawing left, ..."' \
      '     No relative bearing.  Correct if whoever you are telling is' \
      '     on the plot rather than on deck.' \
      ''
    printf "  Now: %s.  Pick 1-5, or x to leave it: " "$(style_name "$rstyle")"
    IFS= read -r sv || return 0
    case "$sv" in
      1) rstyle=rn ;;     2) rstyle=usn ;;  3) rstyle=rel360 ;;
      4) rstyle=words ;;  5) rstyle=none ;;
      x|X|q|Q|"") return 0 ;;
      *) echo "  ?"; continue ;;
    esac
    save_conf
    printf "  reporting style: %s\n" "$(style_name "$rstyle")"
    return 0
  done
}
contacts_menu() {
  while :; do
    eng -v cmd=csyl -v done="$lessons"
    printf "  Lesson code, t track, e Ekelund, c card, s report style, x back: "
    IFS= read -r a
    case "$a" in
      x|X|"") return ;;
      t|T) run_track ;;
      e|E) run_ekelund ;;
      c|C) eng -v cmd=cref ;;
      s|S) style_menu ;;
      n|N) nx=""
           for L in C1 C2 C3 C4 C5 C6 C7; do
             case ",$lessons," in *,"$L",*) ;; *) nx="$L"; break ;; esac
           done
           if [ -z "$nx" ]; then echo "  All seven done."; else do_clesson "$nx"; fi ;;
      *)   do_clesson "$(echo "$a" | tr 'a-z' 'A-Z')" ;;
    esac
  done
}
mixed_drill() {
  for k in qlight qshape qsound enc qlight; do
    sd=$(newseed)
    case "$k" in
      enc) eng -v cmd=enc -v seed="$sd"; ask1; [ -z "$ANS" ] && continue
           stry=$((stry+1)); eng -v cmd=encm -v seed="$sd" -v ans="$ANS" && sok=$((sok+1)) ;;
      qlight) eng -v cmd=qlight -v seed="$sd"
           printf "  Q1 what is she    (a/b/c/d): "; IFS= read -r ANS; [ -z "$ANS" ] && continue
           printf "  Q2 which way      (a/b/c/d): "; IFS= read -r ANS2
           stry=$((stry+1)); eng -v cmd=qlightm -v seed="$sd" -v ans="$ANS" -v ans2="$ANS2" && sok=$((sok+1)) ;;
      *)   eng -v cmd="$k" -v seed="$sd"; ask1; [ -z "$ANS" ] && continue
           stry=$((stry+1)); eng -v cmd="${k}m" -v seed="$sd" -v ans="$ANS" && sok=$((sok+1)) ;;
    esac
    save_prog
  done
  echo "  Score so far: $sok of $stry"
}
ref_menu() {
  echo
  echo "   1  Lights, all of them        2  Day shapes        3  Sound signals"
  printf "  > "; IFS= read -r a
  case "$a" in
    1) eng -v cmd=reflights ;; 2) eng -v cmd=refshapes ;; 3) eng -v cmd=sndtable ;;
  esac
}
help_text() {
  printf '%s\n' \
    '' \
    '  COLREGS -- the rules of the road, drawn in characters' \
    '' \
    '  colregs                  the menu' \
    '  colregs lights           identify vessels by their lights' \
    '  colregs light <key> [brg]  draw one, from any angle' \
    '  colregs shapes           identify vessels by their day shapes' \
    '  colregs shape <key>      draw one' \
    '  colregs encounters       who gives way, and what do you do' \
    '  colregs scenario         a developing situation: plot it, decide, watch it run' \
    '  colregs sound            identify sound signals' \
    '  colregs numbers          which rule is which, both ways round' \
    '  (in a scenario, y at the lights prompt shows what each boat sees)' \
    '  colregs rules            fifteen lessons on the rules' \
    '  colregs lesson L7        one lesson' \
    '  colregs contacts         bearing drift and contact management' \
    '  colregs track            stand the tracking watch: drift, CPA, the call' \
    '  colregs ekelund          range from a change of course' \
    '  colregs card             the contacts card, on one screen' \
    '  colregs style [rn|usn|rel360|words|none]' \
    '                           how a relative bearing is spoken' \
    '  colregs ref              reference tables' \
    '  colregs colours          check that your terminal shows the lamp colours' \
    '  colregs day|night|plain  colour mode' \
    '  colregs about            why it exists, how it was written, feedback' \
    '  colregs review           check its claims against the Convention, and report' \
    '' \
    '  Bearings are relative to the other vessel: 0 means you are looking' \
    '  at her bow, 090 at her starboard side, 180 at her stern.' \
    ''
}
banner() {
  echo
  echo "  ==============================================================="
  echo "   COLREGS $COLREGS_VERSION   the rules of the road, in characters"
  echo "   These are the International Rules (COLREGS 1972 as amended)."
  echo "   US Inland waters differ in places."
  echo "  ==============================================================="
  nl=$(printf '%s' "$lessons" | tr ',' '\n' | grep -c '[A-Z]'); [ -n "$nl" ] || nl=0
  printf "   lessons %s of 15    drills %s/%s    [%s]\n" "$nl" "$sok" "$stry" "$cmode"
  echo "  ---------------------------------------------------------------"
}
menu() {
  while :; do
    load_prog
    banner
    printf '%s\n' \
      '    1  Lights           what is she, and what is she doing?' \
      '    2  Day shapes       the same meanings, by daylight' \
      '    3  Encounters       who gives way, and what do you do?' \
      '    4  Sound signals    what is she saying?' \
      '    5  The rules        fifteen lessons on the rules themselves' \
      '    6  Mixed drill      one of each, at random' \
      '    7  Collision avoidance   a developing situation: plot it, decide, watch it run' \
      '    8  Contacts         bearing drift, the report, and the tracking party' \
      '    9  Rule numbers     which rule is which, both ways round' \
      '' \
      '    r  Reference tables   c  Colour   s  Report style' \
      '    v  Review the rules   a  About   h  Help   q  Quit'
    printf "  > "; IFS= read -r c || exit 0
    case "$c" in
      1) run_quiz qlight qlightm ;;
      2) run_quiz qshape qshapem ;;
      3) run_enc ;;
      4) run_quiz qsound qsoundm ;;
      5) rules_menu ;;
      6) mixed_drill ;;
      7) run_scen ;;
      8) contacts_menu ;;
      9) run_quiz qrule qrulem ;;
      r|R) ref_menu ;;
      c|C) printf "  day, night or plain? [%s] " "$cmode"; IFS= read -r v
           case "$v" in day|night|plain) cmode="$v"; save_conf; paint ;; esac ;;
      s|S) style_menu ;;
      a|A) about_menu ;;
      v|V) review_menu ;;
      h|H|\?) help_text ;;
      q|Q) unpaint; exit 0 ;;
      "") ;;
      *) echo "  ?" ;;
    esac
  done
}

pick_awk
install_engine
load_conf
load_prog
case "$1" in
  ""|menu)  paint; menu ;;
  lights)   paint; run_quiz qlight qlightm ;;
  shapes)   paint; run_quiz qshape qshapem ;;
  sound)    paint; run_quiz qsound qsoundm ;;
  encounters|enc) paint; run_enc ;;
  scenario|scen|avoid) paint; run_scen ;;
  numbers|number)  paint; run_quiz qrule qrulem ;;
  rules)    paint; rules_menu ;;
  contacts|contact) paint; contacts_menu ;;
  track)    paint; run_track ;;
  ekelund)  paint; run_ekelund ;;
  card)     eng -v cmd=cref ;;
  style)    shift
            case "$1" in
              rn|usn|rel360|words|none) rstyle="$1"; save_conf
                 echo "reporting style: $(style_name "$rstyle")" ;;
              "") paint; style_menu ;;
              *) echo "colregs: style is one of rn usn rel360 words none"; exit 2 ;;
            esac ;;
  lesson)   shift; do_lesson "$(echo "${1:-L1}" | tr 'a-z' 'A-Z')" ;;
  light)    shift; eng -v cmd=light -v key="${1:-power50}" -v th="${2:-40}" -v reveal=1 ;;
  shape)    shift; eng -v cmd=shape -v key="${1:-ram}" -v reveal=1 ;;
  ref)      paint; ref_menu ;;
  colours)  eng -v cmd=colours ;;
  reflights) eng -v cmd=reflights ;;
  refshapes) eng -v cmd=refshapes ;;
  refsound)  eng -v cmd=sndtable ;;
  day|night|plain) cmode="$1"; save_conf; echo "colour mode: $cmode" ;;
  about)    paint; about_menu ;;
  review)   paint; review_menu ;;
  where)    echo "engine: $ENGINE"; echo "config: $CONF"; echo "progress: $PROG" ;;
  reinstall) install_engine force; echo "engine rewritten: $ENGINE" ;;
  version|--version) echo "colregs $COLREGS_VERSION" ;;
  help|-h|--help) help_text ;;
  *) echo "colregs: there is no command '$1'."
     echo
     echo "  Drills     lights  shapes  encounters  scenario  sound  numbers  rules  lesson"
     echo "  Contacts   contacts  track  ekelund  card  style"
     echo "  Look up    light <key> [brg]   shape <key>   ref"
     echo "  Setup      colours  day  night  plain  about  review  where  version"
     echo
     echo "  'colregs help' explains each of them."
     exit 2 ;;
esac

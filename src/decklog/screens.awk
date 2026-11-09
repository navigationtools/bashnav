# =====================================================================
#  deck-log -- the screens, and the command dispatch.
# =====================================================================

#  The VOS menus.  These are 0-9 codes because that is what they are in
#  the standard, so a menu here is the standard and not a coarsening of
#  it.  The codes a human estimates by eye are menus; the numbers an
#  instrument reads are typed.
function menus_init(){
  if(MEN_READY) return
  m("cloud", "TOTAL CLOUD, eighths of sky",
    "0=clear;1=1/8;2=2/8;3=3/8;4=4/8;5=5/8;6=6/8;7=7/8;8=overcast")
  m("sea",   "SEA STATE, Douglas",
    "0=glassy;1=rippled;2=smooth, wavelets;3=slight;4=moderate;5=rough;6=very rough;7=high;8=very high;9=phenomenal")
  m("vis",   "VISIBILITY",
    "0=under 50 m;1=50-200 m;2=200-500 m;3=500 m - 1 km;4=1-2 km;5=2-4 km;6=4-10 km;7=10-20 km;8=20-50 km;9=over 50 km")
  m("ptend", "PRESSURE over the last 3 hours - the SHAPE, not the amount",
    "0=rising, then steady;1=rising, then rising faster;2=rising steadily;3=falling or steady, then rising;4=steady;5=falling, then steady;6=falling, then falling faster;7=falling steadily;8=steady or rising, then falling")
  m("cl",    "LOW CLOUD",
    "0=none;1=cumulus, fair;2=cumulus, towering;3=cumulonimbus, no anvil;4=stratocumulus from cumulus;5=stratocumulus;6=stratus;7=ragged stratus, bad weather;8=cumulus and stratocumulus;9=cumulonimbus with anvil")
  m("cm",    "MIDDLE CLOUD",
    "0=none;1=altostratus, thin;2=altostratus, thick;3=altocumulus, thin;4=altocumulus, patches;5=altocumulus, bands thickening;6=altocumulus from cumulus;7=altocumulus in layers;8=altocumulus, turrets;9=altocumulus, chaotic")
  m("ch",    "HIGH CLOUD",
    "0=none;1=cirrus, wisps;2=cirrus, dense;3=cirrus from anvil;4=cirrus, thickening;5=cirrus and cirrostratus below 45 deg;6=cirrus and cirrostratus above 45 deg;7=cirrostratus, whole sky;8=cirrostratus, part sky;9=cirrocumulus")
  MEN_READY=1
  return 0
}
function m(k,t,o){ MN_K[++MN_N]=k; MN_T[k]=t; MN_O[k]=o; return 0 }

function menu_show(key,   n, a, i, p, code, txt, cols, half){
  menus_init()
  if(!(key in MN_T)) return 0
  print ""
  printf "  %s\n", cw(MN_T[key], C_ACC)
  n = split(MN_O[key], a, ";")
  half = int((n+1)/2)
  for(i=1; i<=half; i++){
    p = index(a[i], "="); code=substr(a[i],1,p-1); txt=substr(a[i],p+1)
    printf "    %s  %-34s", code, txt
    if(i+half<=n){
      p = index(a[i+half], "="); code=substr(a[i+half],1,p-1); txt=substr(a[i+half],p+1)
      printf "  %s  %s", code, txt
    }
    print ""
  }
  printf "    %s  %-34s  %s  %s\n", "/", "cannot be seen from here", "-", "not observed"
  return n
}
function menu_ok(key, ans,   n, a, i, p){
  menus_init()
  if(ans=="-" || ans=="/") return 1
  n = split(MN_O[key], a, ";")
  for(i=1;i<=n;i++){ p=index(a[i],"="); if(substr(a[i],1,p-1)==ans) return 1 }
  return 0
}

#  Plausibility, as a question rather than a rejection.  An instrument
#  reading wrongly is itself worth logging, so "no, that is what I read"
#  has to be accepted.

#  The wind for one line of the listing. It lives here rather than in
#  log.awk because src/common/log.awk and src/decklog/log.awk are
#  byte-identical copies and nothing in the suite enforces that - adding
#  a function to one of them would quietly start a divergence. This is a
#  presentation helper and belongs with the view that prints it.
function lg_wind(d, s){
  if(d=="" && s=="") return "-"
  if(s=="") return d
  if(d=="") return "?/" s
  return d "/" s
}

function implausible(key, val,   x){
  if(val=="-" || val=="/" || val=="") return ""
  x = val+0
  if(key=="mslp"){ if(x<870 || x>1090) return sprintf("%.1f hPa is outside anything recorded on earth", x) }
  if(key=="wspd"){ if(x<0  || x>250)   return sprintf("%g knots", x) }
  if(key=="wdir"){ if(x<0  || x>360)   return sprintf("%g is not a compass direction", x) }
  if(key=="airt" || key=="dewp"){
    if(x<-60 || x>60) return sprintf("%g degrees", x) }
  #  SEA TEMPERATURE HAS ITS OWN FLOOR, AND IT IS PHYSICS, NOT TASTE.
  #  Sea water freezes at about -1.9 C, so anything below that is not
  #  cold water, it is ice or a mistake. -2.0 leaves room for brackish
  #  water, which freezes nearer 0 but can be measured a shade under.
  #  The ceiling is the warmest sea anyone records, in the Gulf.
  #
  #  This band was shared with airt and dewp until a watch offered
  #  seat=-17.8 -- a screen that opened on 0 F and was pressed through
  #  -- and the log accepted it without a word. Two mistakes had to line
  #  up for that to reach a record, and only one of them was the watch's.
  if(key=="seat"){
    if(x< -2) return sprintf("%g degrees: sea water freezes near -1.9", x)
    if(x>40)  return sprintf("%g degrees", x) }
  if(key=="sog"){ if(x<0 || x>60) return sprintf("%g knots", x) }
  if(key=="crs"){ if(x<0 || x>360) return sprintf("%g is not a course", x) }
  return ""
}

# =====================================================================
#  Dispatch
# =====================================================================
BEGIN{
  col_init()

  # ---- build a record from a key<TAB>value file --------------------
  if(cmd=="mkrec"){
    n=0
    while((getline line < fields) > 0){
      p = index(line, "\t")
      if(p<2) continue
      K[++n] = substr(line,1,p-1)
      V[n]   = substr(line,p+1)
    }
    close(fields)
    rec = lg_make(now, type, K, V, n)
    #  never write a record this reader cannot read back
    if(!lg_parse(rec)){ exit 2 }
    print rec
    exit 0
  }

  else if(cmd=="menu"){ menu_show(what) }
  else if(cmd=="menuok"){ exit (menu_ok(what, ans) ? 0 : 1) }
  else if(cmd=="check"){ s=implausible(what, ans); if(s!=""){ print s; exit 1 } exit 0 }

  # ---- the log, most recent last ----------------------------------
  else if(cmd=="recent"){
    k = (n=="" ? 12 : n+0)
    lg_read(LOG, "")
    print ""
    printf "  %s\n", cw("THE LOG", C_ACC)
    hr()
    if(LG_N==0) printf "  %s\n", cwd("nothing logged yet")
    for(i = (LG_N>k ? LG_N-k+1 : 1); i<=LG_N; i++){
      if(!lg_at(i)) continue
      line = ""
      #  THE WIND IS wdir AND wspd, not "wind". Nothing has ever written a
      #  field called wind: do_entry asks for wdir and wspd and writes
      #  both, so this slot printed eight spaces on every nav record ever
      #  logged - a field asked for and then silently not shown, which is
      #  the same fault the weather suite guards with its "visibility is
      #  asked for and still ignored" check. tests/golden/decklog.txt had
      #  the blank committed as correct, which is why no check saw it.
      if(LG_TYPE=="nav") line = sprintf("crs %-4s %5s kn  wind %-8s sea %s",
            LG["crs"], LG["sog"], lg_wind(LG["wdir"], LG["wspd"]), LG["sea"])
      else if(LG_TYPE=="wx") line = sprintf("%s hPa  tend %-2s cloud %-2s vis %s",
            LG["mslp"], LG["ptend"], LG["cloud"], LG["vis"])
      else if(LG_TYPE=="eng") line = sprintf("%s %s %s", LG["eq"],
            (LG["job"]!="" ? "job " LG["job"] : "insp " LG["insp"] " = " LG["state"]),
            (LG["note"]!="" ? "- " LG["note"] : ""))
      else if(LG_TYPE=="pro") line = sprintf("%s %s", LG["item"], LG["qty"])
      else if(LG_TYPE=="inv") line = sprintf("%s %s %s", LG["action"], LG["part"], LG["count"] LG["qty"])
      else if(LG_TYPE=="cor") line = sprintf("correction to %s", LG["ref"])
      else line = "-"
      printf "  %s %-4s %s\n", cwd(substr(LG_TS,1,16)), LG_TYPE, line
    }
    hr()
    if(LG_BAD>0) printf "  %s\n", cw(sprintf("%d damaged record(s) skipped - the log is still readable", LG_BAD), C_WARN)
    printf "  %s\n", cwd(sprintf("%d records", LG_GOOD))
    print ""
  }

  # ---- what is aboard, derived ------------------------------------
  else if(cmd=="holdings"){
    bt_read(BOAT); inv_build(LOG)
    print ""
    printf "  %s\n", cw("SPARES ABOARD", C_ACC)
    hr()
    if(PT_N==0) printf "  %s\n", cwd("no parts in the registry yet - deck-log part add")
    for(i=1;i<=PT_N;i++){
      h = inv_hold(PT_ID[i], PT_FITS[i])
      short = PT_MIN[i] - h
      printf "  %-22s %3d  %s\n", substr(PT_NAME[i]!=""?PT_NAME[i]:PT_ID[i],1,22), h,
        (short>0 ? cw(sprintf("%d short of %d", short, PT_MIN[i]), C_WARN) : cwd(sprintf("min %d", PT_MIN[i])))
      if(PT_NUM[i]!="")  printf "    %s\n", cwd(PT_NUM[i] (PT_FITS[i]!="" ? "   fits " PT_FITS[i] : ""))
      if(PT_STOW[i]!="") printf "    %s\n", cwd("stowed: " PT_STOW[i])
    }
    hr()
    print ""
  }

  #  the same numbers with nothing drawn, for the shell and for tests.
  #  Parsing the drawn screen breaks the first time a part is called
  #  "raw water impeller" instead of "impeller" - which it is.
  else if(cmd=="holdraw"){
    bt_read(BOAT); inv_build(LOG)
    for(i=1;i<=PT_N;i++)
      printf "%s|%d|%d|%d\n", PT_ID[i], inv_hold(PT_ID[i], PT_FITS[i]),
             PT_MIN[i], (PT_MIN[i] - inv_hold(PT_ID[i], PT_FITS[i]))
  }

  # ---- the screen for the chandlery -------------------------------
  else if(cmd=="shopping"){
    bt_read(BOAT); inv_build(LOG)
    print ""
    printf "  %s%s\n", cw("SHOPPING LIST", C_ACC), (port!="" ? "                     " port : "")
    hr()
    any=0
    for(i=1;i<=PT_N;i++){
      h = inv_hold(PT_ID[i], PT_FITS[i]); short = PT_MIN[i] - h
      if(short<=0) continue
      any++
      printf "  %-24s x%d   %s\n", substr(PT_NAME[i]!=""?PT_NAME[i]:PT_ID[i],1,24), short,
             cwd(sprintf("have %d, want %d", h, PT_MIN[i]))
      if(PT_NUM[i]!="") printf "    %s\n", PT_NUM[i]
      if(PT_FITS[i]!="" && (PT_FITS[i] in EQ_IDX)){
        j = EQ_IDX[PT_FITS[i]]
        printf "    %s\n", cwd(sprintf("fits: %s %s  s/n %s", EQ_MAKE[j], EQ_MODEL[j], EQ_SER[j]))
      }
      if(PT_STOW[i]!="") printf "    %s\n", cwd("stow: " PT_STOW[i])
      print ""
    }
    if(!any) printf "  %s\n", cwd("nothing short of its minimum")
    hr()
    printf "  %s\n", cwd("Everything the chandler will ask, on one screen, with no signal.")
    print ""
  }

  # ---- open defects ------------------------------------------------
  else if(cmd=="defects"){
    bt_read(BOAT); n=def_build(LOG)
    print ""
    printf "  %s\n", cw("OPEN ITEMS", C_ACC)
    hr()
    if(n==0) printf "  %s\n", cwd("nothing outstanding")
    for(i=1;i<=n;i++){
      printf "  %-14s %-12s %s\n", DEF_ITEM[i], DEF_EQ[i], cwd("found " substr(DEF_TS[i],1,10))
      if(DEF_NOTE[i]!="") printf "    %s\n", DEF_NOTE[i]
    }
    hr()
    printf "  %s\n", cwd("An item stays here until a job records that it closed it.")
    print ""
  }

  # ---- the registry ------------------------------------------------
  else if(cmd=="equip"){
    bt_read(BOAT)
    print ""
    printf "  %s\n", cw("EQUIPMENT", C_ACC)
    hr()
    if(EQ_N==0) printf "  %s\n", cwd("nothing yet - deck-log equip add")
    for(i=1;i<=EQ_N;i++){
      printf "  %-12s %s %s\n", EQ_ID[i], EQ_MAKE[i], EQ_MODEL[i]
      if(EQ_SER[i]!="")   printf "    %s\n", cwd("serial " EQ_SER[i])
      if(EQ_PLATE[i]!="") printf "    %s\n", cwd("plate: " EQ_PLATE[i])
    }
    hr(); print ""
  }
  else if(cmd=="equiplist"){ bt_read(BOAT); for(i=1;i<=EQ_N;i++) print EQ_ID[i] }
  else if(cmd=="partlist"){  bt_read(BOAT); for(i=1;i<=PT_N;i++) print PT_ID[i] }
  else if(cmd=="mkeq"){
    n=0
    while((getline line < fields) > 0){
      p=index(line,"\t"); if(p<2) continue
      K[++n]=substr(line,1,p-1); V[n]=substr(line,p+1)
    }
    close(fields)
    print bt_make(type, K, V, n)
  }

  # ---- how long since the last entry -------------------------------
  else if(cmd=="since"){
    lg_read(LOG, "")
    if(LG_N==0){ print "" ; exit 0 }
    print LR_TS[LG_N]
  }

  else { printf "  deck-log: unknown cmd %s\n", cmd; exit 2 }
}

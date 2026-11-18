# =====================================================================
#  weather -- dispatch
# =====================================================================
BEGIN{
  col_init(); les_init()

  if(cmd=="version"){ print "weather engine"; exit 0 }

  else if(cmd=="what"){ wx_report(LOG, lon, hours+0, seaclose) }
  else if(cmd=="score"){ sc_report(LOG) }
  else if(cmd=="chart"){ ch_report(brg, dist, orient, w500, (north==""?1:north+0)) }
  else if(cmd=="isobars"){ iso_report(spacing, lat, step, (north==""?1:north+0)) }
  else if(cmd=="frontsdump"){ fr_dump() }
  else if(cmd=="storm"){ st_report(age, clat, clon, mdir, mkn, r34, blat, blon, bcse, bkn, wind) }

  else if(cmd=="syllabus"){
    print ""
    printf "  %s\n", cw("LESSONS", C_ACC)
    hr()
    for(i=1;i<=LS_N;i++){
      mk = (index("," donelist ",", "," LS_K[i] ",")>0) ? "*" : " "
      printf "   %s %-9s %s\n", mk, LS_K[i], LS_T[i]
    }
    hr()
    printf "  %s\n", cwd("* = done.    weather learn <key>")
    print ""
    printf "  %s\n", cwd("Each one earns its place by changing what the app says or what")
    printf "  %s\n", cwd("you would do. One of them says plainly where that stops being")
    printf "  %s\n", cwd("true, which is the point of the rule.")
    print ""
  }
  else if(cmd=="lesson"){
    if(!lesson_body(key)){ printf "  no such lesson: %s\n", key; exit 2 }
    n=split(lesson_q(key),QA,"|")
    if(n>=1){ hr(); printf "  %s %s\n", cw("Question:",C_ACC), QA[1]; print "" }
  }
  else if(cmd=="lessonq"){ n=split(lesson_q(key),QA,"|"); if(n>=2) print QA[2] }
  #  the second tier: the deeper section, and whether one exists at all
  else if(cmd=="lessonmore"){
    if(!lesson_more(key)){ printf "  no deeper section for: %s\n", key; exit 2 }
  }
  else if(cmd=="lessonhasmore"){ exit (les_has_more(key) ? 0 : 1) }
  else if(cmd=="lessonlist"){ for(i=1;i<=LS_N;i++) print LS_K[i] }

  #  the machine forecasts, built only after the user's is committed
  else if(cmd=="fcast"){
    n = wx_load(LOG)
    if(n<1) exit 1
    for(i=n-1;i>=1;i--) if(wx_has(WP[i]) && wx_has(WP[n])) break
    k=i
    if(who2=="persist") sc_persist(n); else sc_rules(n, k, hours+0, lon)
    if(wx_has(F_WDIR)) printf "wdir=%d\n", (F_WDIR+0.5)
    if(wx_has(F_WSPD)) printf "wspd=%.0f\n", F_WSPD
    if(wx_has(F_MSLP)) printf "mslp=%.1f\n", F_MSLP
    if(wx_has(F_SEA))  printf "sea=%d\n",   F_SEA
    printf "why=%s\n", (F_WHY==""?"-":F_WHY)
  }
  else if(cmd=="validat"){ print sc_validtime(now, hours+0) }
  else if(cmd=="mkrec"){
    n=0
    while((getline line < fields) > 0){
      p = index(line, "\t"); if(p<2) continue
      K[++n]=substr(line,1,p-1); V[n]=substr(line,p+1)
    }
    close(fields)
    rec = lg_make(now, type, K, V, n)
    if(!lg_parse(rec)) exit 2
    print rec
  }
  else { printf "  weather: unknown cmd %s\n", cmd; exit 2 }
}

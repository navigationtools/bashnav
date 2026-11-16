# =====================================================================
#  tides -- work.  The coastal-navigation calculators.
#
#    tides work twelfths   height at a time: twelfths, cosine, harmonic
#    tides work secondary  a secondary port from a standard port
#    tides work stream     a tidal-stream rate between neaps and springs
#    tides work atlas      which page of a tidal-stream atlas you are on
#    tides work cts        course to steer across a stream
#    tides work setdrift   set and drift, from a DR and a fix
#    tides work tidal_gate when a headland's stream turns, and the window
#    tides work lunar      springs and neaps: the Moon, the range, the coefficient
#
#  Each one SHOWS ITS WORKING, step by step, because the point is
#  teaching: a navigator who has watched the arithmetic once can do it on
#  a chart with a pencil, and that is the skill.  The answer comes last.
#
#  Parameters arrive as one string, key=value pairs separated by |, in
#  -v wargs.  The names are a CONTRACT: the coastal navigation course
#  deep-links into the browser build with the same names in a URL, and
#  docs/web/tides/WORK.md is the authoritative list.  Do not rename one.
#
#  The browser port is docs/web/tides/work.js.  It produces the same
#  lines of working, character for character, and
#  docs/web/tests/tides-work.js holds it to that.  So every line of text
#  in this file has a twin there; change one and change the other.
#
#  Loaded after engine.awk, in the same payload.  The dispatch lives in
#  this file's own BEGIN block, so engine.awk can still be loaded on its
#  own - mawk resolves every called function at parse time, and an
#  engine that called into this file would not parse without it.
# =====================================================================

#  ---- from src/common/bearing.awk ---------------------------------
#  The vector machinery the tracking party uses -- rbrg(), the bearing
#  of a vector given its east and north parts, and sgn180(), an angle
#  folded into -180..180 -- comes from src/common/bearing.awk, which
#  colregs' contacts use as well.  build.sh packs it between engine.awk
#  and this file in the ENGINE payload (board item B13).

# ---------------------------------------------------------------------
#  Small helpers.  Every format here has a twin in work.js.
# ---------------------------------------------------------------------
function wk_err(s){ if(W_ERR=="") W_ERR=s; return 0 }
function wl(s){ WL[++WL_N]=s; return 0 }
function wk_has(k){ return (k in WA) && WA[k]!="" }
function wk_isnum(s){ return s ~ /^[-+]?([0-9]+[.]?[0-9]*|[.][0-9]+)$/ }
#  %.Nf with the sign of a zero taken away: -0.00 is not a quantity.
function wk_f(v,d,   s){ s=sprintf("%." d "f", v); if(s ~ /^-0[.]?0*$/) s=substr(s,2); return s }
function wk_fs(v,d,   s){ s=wk_f(v,d); if(substr(s,1,1)!="-") s="+" s; return s }
#  a number as it was typed, near enough: whole numbers without a point
#  a factor in a product: negative ones in brackets, so "x (-0.10)"
function wk_p(v,d){ if(v<0) return "(" wk_f(v,d) ")"; return wk_f(v,d) }
function wk_g(v,   s){ if(v==int(v)) return sprintf("%d", v); s=wk_f(v,2); sub(/0$/,"",s); return s }
#  a bearing to a tenth, 000.0 to 359.9, for the working; the answer
#  gives the whole degree you steer
function wk_d1(a,   s){ s=wk_f(nrm360(a),1); if(s=="360.0") s="0.0"; return wk_pad0(s,5) }
function wk_r2(x){ if(x<0) return -int(-x*100+0.5)/100; return int(x*100+0.5)/100 }
function wk_mod(x,m){ x = x - m*int(x/m); if(x<0) x+=m; return x }
function wk_deg(a,   r){ r=int(nrm360(a)+0.5); if(r>=360) r-=360; return sprintf("%03d", r) }
function wk_hhmm(m){ m=ffloor(m+0.5); m=wk_mod(m,1440); return sprintf("%02d:%02d", int(m/60), m%60) }
function wk_dur(m,   h){ m=int(fabs(m)+0.5); h=int(m/60)
  if(h>0) return sprintf("%d h %02d min", h, m%60); return sprintf("%d min", m) }
function wk_ew(v){ if(v<0) return wk_g(-v) " W"; return wk_g(v) " E" }
function wk_lat(x,   a,d,mi,hm){ hm=(x<0)?"S":"N"; a=fabs(x); d=int(a); mi=(a-d)*60
  if(mi>=59.95){ mi=0; d++ }
  return sprintf("%02d %s'%s", d, wk_pad0(wk_f(mi,1),4), hm) }
function wk_lon(x,   a,d,mi,hm){ hm=(x<0)?"W":"E"; a=fabs(x); d=int(a); mi=(a-d)*60
  if(mi>=59.95){ mi=0; d++ }
  return sprintf("%03d %s'%s", d, wk_pad0(wk_f(mi,1),4), hm) }
function wk_pad0(s,n){ while(length(s)<n) s="0" s; return s }
function wk_head(s){ wl(""); wl("  " cw(s, C_HDR)); wl("  ----------------------------------------------------------------------"); return 0 }
function wk_rule(){ wl("  ----------------------------------------------------------------------"); return 0 }

# ---------------------------------------------------------------------
#  Reading the parameters.  Strict, because a URL typed by a course
#  author is exactly where a typo hides: a key nobody reads is an error
#  rather than a silently ignored value.
# ---------------------------------------------------------------------
function wk_parse(s,   n,i,p,e,k){
  split("",WA); WK_N=0
  n=split(s,p,"|")
  for(i=1;i<=n;i++){
    if(p[i]=="") continue
    e=index(p[i],"=")
    if(e<2) return wk_err(sprintf("'%s' is not key=value", p[i]))
    k=substr(p[i],1,e-1)
    if(k !~ /^[a-z][a-z0-9]*$/) return wk_err(sprintf("'%s' is not a parameter name", k))
    if(!(k in WA)) WK[++WK_N]=k
    WA[k]=substr(p[i],e+1)
  }
  return 1
}
function wk_allow(name,list,   ok,n,i,a){
  n=split(list,a," "); split("",ok)
  for(i=1;i<=n;i++) ok[a[i]]=1
  ok["work"]=1; ok["lesson"]=1          # carried by every URL
  for(i=1;i<=WK_N;i++) if(!(WK[i] in ok))
    return wk_err(sprintf("%s does not take %s=", name, WK[i]))
  return 1
}
#  A number: def "" means required.  lo and hi are strings so the
#  message prints them as written.
function wk_num(k,def,lo,hi,what,   v){
  if(W_ERR!="") return 0
  if(!wk_has(k)){
    if(def=="") return wk_err(sprintf("%s= is needed (%s)", k, what))
    return def+0
  }
  v=WA[k]
  if(!wk_isnum(v)) return wk_err(sprintf("%s=%s is not a number", k, v))
  v=v+0
  if(v<lo+0 || v>hi+0) return wk_err(sprintf("%s=%s is out of range (%s to %s)", k, WA[k], lo, hi))
  return v
}
function wk_ang(k,def,what){ return nrm360(wk_num(k,def,"0","360",what)) }
#  HH:MM or HHMM, as minutes past midnight
function wk_hm(s,   h,m,c){
  c=index(s,":")
  if(s ~ /^[0-9][0-9]?:[0-9][0-9]$/){ h=substr(s,1,c-1)+0; m=substr(s,c+1)+0 }
  else if(s ~ /^[0-9][0-9][0-9][0-9]$/){ h=substr(s,1,2)+0; m=substr(s,3,2)+0 }
  else return -1
  if(h>23 || m>59) return -1
  return h*60+m
}
function wk_time(k,what,   v){
  if(W_ERR!="") return 0
  if(!wk_has(k)) return wk_err(sprintf("%s= is needed (%s, HH:MM)", k, what))
  v=wk_hm(WA[k])
  if(v<0) return wk_err(sprintf("%s=%s is not a time (HH:MM)", k, WA[k]))
  return v
}
#  lat,lon in decimal degrees; sets WP_LAT, WP_LON
function wk_pos(k,what,   p,n){
  if(W_ERR!="") return 0
  if(!wk_has(k)) return wk_err(sprintf("%s= is needed (%s, lat,lon)", k, what))
  n=split(WA[k],p,",")
  if(n!=2 || !wk_isnum(p[1]) || !wk_isnum(p[2]))
    return wk_err(sprintf("%s=%s is not a position (lat,lon in decimal degrees)", k, WA[k]))
  WP_LAT=p[1]+0; WP_LON=p[2]+0
  if(WP_LAT<-90 || WP_LAT>90 || WP_LON<-180 || WP_LON>180)
    return wk_err(sprintf("%s=%s is out of range (lat -90 to 90, lon -180 to 180)", k, WA[k]))
  return 1
}
#  YYYY-MM-DD, checked by a round trip so 2026-02-30 is refused
function wk_date(s,   y,m,d){
  if(s !~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/) return 0
  y=substr(s,1,4)+0; m=substr(s,6,2)+0; d=substr(s,9,2)+0
  if(m<1 || m>12 || d<1 || d>31) return 0
  jd2cal(jdate(y,m,d)+0.5)
  if(CAL_Y!=y || CAL_M!=m || CAL_D!=d) return 0
  WD_Y=y; WD_M=m; WD_D=d
  return 1
}
function wk_wind(lee,   w){
  if(W_ERR!="" || lee==0) return ""
  if(!wk_has("wind")) return wk_err("leeway needs wind=port or wind=stbd (the side the wind is on)")
  w=WA["wind"]
  if(w!="port" && w!="stbd") return wk_err(sprintf("wind=%s should be port or stbd", w))
  return w
}

# =====================================================================
#  The station-backed tools need a prediction.  Opens the station, works
#  out the date and time asked for (or now, in the station's own
#  standard time), and lists the turns over three days around it.
#
#  Times are STANDARD time at the station, as in a printed table.
# =====================================================================
function wk_station(   id,y,m,d,jdn,jl,i,n){
  if(W_ERR!="") return 0
  id = wk_has("station") ? WA["station"] : defstation
  if(id=="") return wk_err("station= is needed (a station id, e.g. ticon/dover-dov-gbr-bodc)")
  if(id !~ /^[A-Za-z0-9_.\/-]+$/) return wk_err(sprintf("station=%s is not a station id", id))
  jdn = -1
  if(nowdate!="" && wk_date(nowdate)){
    split(nowtime,NT_,":")
    jdn = jdate(WD_Y,WD_M,WD_D) + (NT_[1]+0)/24.0 + (NT_[2]+0)/1440.0
  }
  if(wk_has("date")){
    if(!wk_date(WA["date"])) return wk_err(sprintf("date=%s is not a date (YYYY-MM-DD)", WA["date"]))
  } else if(jdn<0) return wk_err("date= is needed (YYYY-MM-DD)")
  #  open on the date asked for, or today's UT date for now
  if(!wk_has("date")) wk_date(nowdate)
  if(!tide_open(SF, id, jdate(WD_Y,WD_M,WD_D)+0.5)) return wk_err(sprintf("station=%s: %s", id, TD_ERR))
  ST_TZOFF = TD_TZ
  if(!wk_has("date")){
    #  now, carried into the station's standard time
    jl = jdn + TD_TZ/1440.0
    jd2cal(jl); WD_Y=CAL_Y; WD_M=CAL_M; WD_D=CAL_D
  }
  if(wk_has("t")){
    WS_T = wk_hm(WA["t"])
    if(WS_T<0) return wk_err(sprintf("t=%s is not a time (HH:MM)", WA["t"]))
  } else if(jdn>=0){
    WS_T = ffloor(((jdn + TD_TZ/1440.0) - jdate(WD_Y,WD_M,WD_D))*1440 + 0.5)
    if(WS_T<0 || WS_T>=1440) return wk_err("t= is needed (HH:MM)")
  } else return wk_err("t= is needed (HH:MM)")
  WS_ID = id
  WS_DATE = sprintf("%04d-%02d-%02d", WD_Y, WD_M, WD_D)
  WS_JD0 = jdate(WD_Y,WD_M,WD_D)                      # local midnight, local frame
  WS_JDA = WS_JD0 - TD_TZ/1440.0                       # local midnight, in UT
  WS_JDT = WS_JDA + WS_T/1440.0
  n = tide_table(WS_JDA-1, WS_JDA+2)
  WT_N=0
  for(i=1;i<=n;i++){
    WT_N++
    WT_K[WT_N]=HL_K[i]
    WT_JD[WT_N]=HL_T[i]
    #  the turn as a table prints it: to the minute, to the centimetre
    WT_M[WT_N]=ffloor((HL_T[i]-WS_JDA)*1440 + 0.5)
    WT_H[WT_N]=wk_r2(HL_H[i])
  }
  tide_curve_prep(WS_JDA-1, WS_JDA+2)
  return 1
}
function wk_sthead(   k){
  k = TD_NAME
  if(TD_REGION!="") k = k ", " TD_REGION
  wl("  " cw(k, C_ACC) "   " cwd(WS_ID))
  wl("  " cwd(sprintf("%s at %s, the station's standard time (no summer time)", WS_DATE, wk_hhmm(WS_T))))
  if(TD_KIND=="S") wl("  " cwd(sprintf("a secondary port, worked from %s", TD_REFNAME)))
  #  every working from a station names the zero its heights are from (ADV)
  wl("  " cwd("heights " zero_words(TD_ZID,TD_DATUM)))
  return 0
}
function wk_kname(k){ if(k=="H") return "HW"; return "LW" }

# =====================================================================
#  1.  THE RULE OF TWELFTHS, AND THE COSINE CURVE
# =====================================================================
#  t1 < t <= t2 in minutes, h1/h2 the heights, k1/k2 the kinds.
function wk_12core(t1,h1,k1,t2,h2,k2,t,   D,R,i,cum,stp,x,ix,fr,c12,h12,fa,A,ca,hc,sg,hh,tw){
  D = t2-t1; R = h2-h1; WK_K1=k1; WK_K2=k2
  split("1 2 3 3 2 1",stp," "); split("0 1 3 6 9 11 12",cum," ")
  sg = (R>=0) ? "+" : "-"
  if(k1=="L") tw="a rising tide"; else tw="a falling tide"
  wl(sprintf("  %s %s  %s m   to   %s %s  %s m      %s",
     wk_kname(k1), wk_hhmm(t1), wk_f(h1,2), wk_kname(k2), wk_hhmm(t2), wk_f(h2,2), tw))
  wl(sprintf("  range %s m over %s, so a tidal hour here is %s",
     wk_f(fabs(R),2), wk_dur(D), wk_dur(D/6)))
  x = (t-t1)/(D/6.0)
  wl(sprintf("  height wanted at %s: %s after %s = %s tidal hours",
     wk_hhmm(t), wk_dur(t-t1), wk_kname(k1), wk_f(x,2)))
  if(D<240 || D>480) wl("  " cwd(sprintf("the rule assumes about six hours from turn to turn; this one is %s", wk_dur(D))))
  wl("")
  wl("  1  The twelfths, tidal hour by tidal hour")
  wl("     hour  time     this hour        so far    height")
  wl(sprintf("       0   %s        -           0/12   %6s m", wk_hhmm(t1), wk_f(h1,2)))
  for(i=1;i<=6;i++){
    hh = h1 + R*cum[i+1]/12.0
    wl(sprintf("       %d   %s    %d/12  %s%s m   %2d/12   %6s m", i, wk_hhmm(t1+i*D/6.0),
       stp[i], sg, wk_f(fabs(R)*stp[i]/12.0,2), cum[i+1], wk_f(hh,2)))
  }
  ix = int(x); if(ix>5) ix=5
  fr = x-ix
  c12 = cum[ix+1] + fr*stp[ix+1]
  h12 = h1 + R*c12/12.0
  wl("")
  wl(sprintf("  2  At %s: %d tidal hours give %d/12, and %s of hour %d's %d/12 adds %s/12",
     wk_hhmm(t), ix, cum[ix+1], wk_f(fr,2), ix+1, stp[ix+1], wk_f(fr*stp[ix+1],2)))
  wl(sprintf("     %s/12 of %s m = %s m, so h = %s %s %s = %s m",
     wk_f(c12,2), wk_f(fabs(R),2), wk_f(fabs(R)*c12/12.0,2), wk_f(h1,2), sg,
     wk_f(fabs(R)*c12/12.0,2), cw(wk_f(h12,2), C_ACC)))
  fa = (t-t1)/D
  A = 180.0*(fa+1)
  ca = cosd(A)
  hc = h1 + R*(ca+1)/2.0
  wl("")
  wl("  3  The cosine curve:  h = h1 + (h2 - h1) x (cos A + 1)/2")
  wl("     where A = 180 x (fraction of the time from turn to turn + 1) degrees")
  wl(sprintf("     fraction of the way from %s to %s = %s / %s = %s",
     wk_kname(k1), wk_kname(k2), wk_dur(t-t1), wk_dur(D), wk_f(fa,3)))
  wl(sprintf("     A = %s deg, cos A = %s", wk_f(A,1), wk_f(ca,3)))
  wl(sprintf("     h = %s + (%s) x (%s + 1)/2 = %s m",
     wk_f(h1,2), wk_f(R,2), wk_f(ca,3), cw(wk_f(hc,2), C_ACC)))
  wl("")
  wl(sprintf("  4  Twelfths minus cosine: %s m.  The twelfths are a staircase laid over", wk_fs(h12-hc,2)))
  wl("     the cosine: they agree at the turns, at half tide and at hours 2 and 4,")
  wl("     and differ most an hour either side of a turn.")
  WR["t12"]=h12; WR["tcos"]=hc; WR["range"]=fabs(R); WR["dur"]=D
  WR["kind"]=(k1=="L")?"rise":"fall"
  WF_T1=t1; WF_T2=t2; WF_H1=h1; WF_H2=h2; WF_T=t; WF_12=h12; WF_C=hc
  return 1
}
function wk_twelfths(   t1,t2,tt,h1,h2,k1,k2,d,lwm,hwm,lwh,hwh,manual,i,ip,inx,hv){
  manual = wk_has("lw") || wk_has("hw") || wk_has("lwh") || wk_has("hwh")
  if(manual){
    wk_allow("twelfths", "lw lwh hw hwh t")
    lwm=wk_time("lw","time of low water"); lwh=wk_num("lwh","","-20","30","height of low water, m")
    hwm=wk_time("hw","time of high water"); hwh=wk_num("hwh","","-20","30","height of high water, m")
    tt=wk_time("t","the time you want the height for")
    if(W_ERR!="") return 0
    if(hwh<=lwh) return wk_err("hwh= must be higher than lwh=")
    if(lwm==hwm) return wk_err("lw= and hw= are the same time")
    #  which way round: the turn-to-turn interval is the one under twelve
    #  hours, so a tide that crosses midnight works and HW-first is a
    #  falling tide.
    d = wk_mod(hwm-lwm,1440)
    if(d<=720){ t1=lwm; h1=lwh; t2=lwm+d; h2=hwh; k1="L"; k2="H" }
    else      { t1=hwm; h1=hwh; t2=hwm+(1440-d); h2=lwh; k1="H"; k2="L" }
    tt = t1 + wk_mod(tt-t1,1440)
    if(tt>t2) return wk_err(sprintf("t=%s is not between the two turns (%s and %s)", WA["t"], wk_hhmm(t1), wk_hhmm(t2)))
    wk_head("RULE OF TWELFTHS, AND THE COSINE CURVE")
    wk_12core(t1,h1,k1,t2,h2,k2,tt)
    wl("@@FIG")
    wl(sprintf("  ANSWER   twelfths %s m    cosine %s m", wk_f(WR["t12"],2), wk_f(WR["tcos"],2)))
    wk_rule()
    return 1
  }
  wk_allow("twelfths", "station date t")
  if(!wk_station()) return 0
  #  the turns either side of t, as the table prints them
  ip=0; inx=0
  for(i=1;i<=WT_N;i++){
    if(WT_JD[i]<=WS_JDT) ip=i
    else if(!inx) inx=i
  }
  if(!ip || !inx) return wk_err("no turn of the tide either side of that time")
  if(WT_K[ip]==WT_K[inx]) return wk_err(sprintf("the turns either side of %s are both %s: no twelfths between them", wk_hhmm(WS_T), wk_kname(WT_K[ip])))
  hv = tide_height(WS_JDT)
  wk_head("RULE OF TWELFTHS, THE COSINE CURVE AND THE HARMONIC PREDICTION")
  wk_sthead()
  wl(sprintf("  from the prediction, the turns either side of %s:", wk_hhmm(WS_T)))
  wl("")
  tt = WS_T
  if(tt<WT_M[ip]) tt=WT_M[ip]
  if(tt>WT_M[inx]) tt=WT_M[inx]
  wk_12core(WT_M[ip],WT_H[ip],WT_K[ip],WT_M[inx],WT_H[inx],WT_K[inx],tt)
  wl("")
  wl(sprintf("  5  The harmonic prediction itself at %s: %s m", wk_hhmm(WS_T), cw(wk_f(hv,2), C_ACC)))
  wl(sprintf("     twelfths minus harmonic %s m, cosine minus harmonic %s m",
     wk_fs(WR["t12"]-hv,2), wk_fs(WR["tcos"]-hv,2)))
  if(TD_KIND=="S"){
    wl("     " cwd("At a secondary port the curve between the turns is itself a half"))
    wl("     " cwd("cosine, so those two agree but for the table's rounding."))
  } else {
    wl("     " cwd("The harmonic curve is the sum of every constituent, so it carries the"))
    wl("     " cwd("shape a real tide has: a long stand, a fast flood, a double high water."))
  }
  WR["tharm"]=hv; WF_HV=hv
  wl("@@FIG")
  wl(sprintf("  ANSWER   twelfths %s m    cosine %s m    harmonic %s m",
     wk_f(WR["t12"],2), wk_f(WR["tcos"],2), wk_f(hv,2)))
  wk_rule()
  return 1
}
#  The figure: the three ways of filling in between the turns.
function wk_fig12(   w,h,i,x,tt,v,lo,hi,j,cc,ix,fr,c12,cum,stp,R){
  w=61; h=13
  split("1 2 3 3 2 1",stp," "); split("0 1 3 6 9 11 12",cum," ")
  R = WF_H2-WF_H1
  lo=WF_H1; hi=WF_H2; if(lo>hi){ lo=WF_H2; hi=WF_H1 }
  if(WF_HV!=""){ if(WF_HV<lo) lo=WF_HV; if(WF_HV>hi) hi=WF_HV }
  if(hi-lo<0.2){ hi+=0.1; lo-=0.1 }
  gclear(w,h)
  for(i=0;i<w;i++){
    tt = WF_T1 + (WF_T2-WF_T1)*i/(w-1.0)
    x = (tt-WF_T1)/((WF_T2-WF_T1)/6.0); ix=int(x); if(ix>5) ix=5
    fr = x-ix; c12 = cum[ix+1] + fr*stp[ix+1]
    v = WF_H1 + R*(cosd(180.0*((tt-WF_T1)/(WF_T2-WF_T1)+1))+1)/2.0
    gputwc((h-1)-(v-lo)/(hi-lo)*(h-1), i, ".", C_DIM)
    v = WF_H1 + R*c12/12.0
    gputc((h-1)-(v-lo)/(hi-lo)*(h-1), i, "#", "")
    if(WF_HV!=""){
      v = tide_height(WS_JDA + tt/1440.0)
      gputc((h-1)-(v-lo)/(hi-lo)*(h-1), i, "h", C_ACC)
    }
  }
  cc = (WF_T-WF_T1)/(WF_T2-WF_T1)*(w-1)
  for(j=0;j<h;j++) gputwc(j, cc, "|", C_HDR)
  gputc((h-1)-(WF_12-lo)/(hi-lo)*(h-1), cc, "@", C_HDR)
  print ""
  gshow()
  printf "  %s\n", cwd(sprintf("%s %s on the left, %s %s on the right; %s m at the top, %s m at the foot",
     wk_kname(WK_K1), wk_hhmm(WF_T1), wk_kname(WK_K2), wk_hhmm(WF_T2), wk_f(hi,2), wk_f(lo,2)))
  if(WF_HV!="") printf "  %s\n", cwd("# twelfths   . cosine   h harmonic   | the time asked   @ the twelfths answer")
  else          printf "  %s\n", cwd("# twelfths   . cosine   | the time asked   @ the twelfths answer")
  return 0
}

# =====================================================================
#  2.  A SECONDARY PORT
#
#  The almanac gives the time differences at two standard-port times,
#  0000 and 0600 say, and the same again twelve hours later.  So times
#  are taken modulo twelve hours and the difference is interpolated
#  round that circle; heights interpolate between neaps and springs by
#  the standard port's height, which is the RYA method.
# =====================================================================
#  linear interpolation round a 12-hour circle: nodes a (diff d1) and b
#  (diff d2), all in minutes
function wk_cyc(x,a,d1,b,d2,   L,p){
  x=wk_mod(x,720); a=wk_mod(a,720); b=wk_mod(b,720)
  L=wk_mod(b-a,720); p=wk_mod(x-a,720)
  if(p<=L){ WC_F=p/L; WC_A=a; WC_B=b; WC_DA=d1; WC_DB=d2; WC_P=p; WC_L=L; return d1+WC_F*(d2-d1) }
  WC_F=(p-L)/(720-L); WC_A=b; WC_B=a; WC_DA=d2; WC_DB=d1; WC_P=p-L; WC_L=720-L
  return d2+WC_F*(d1-d2)
}
function wk_hm12(m){ m=wk_mod(m,720); return wk_hhmm(m) " and " wk_hhmm(m+720) }
function wk_secpart(K,n,tm,hh,ta,da,tb,db,ms,mn,ds,dn,   td,tdr,f,dd,lab,sl,nl,st,ht){
  if(K=="H"){ lab="High"; sl="MHWS"; nl="MHWN" } else { lab="Low"; sl="MLWS"; nl="MLWN" }
  wl("")
  wl(sprintf("  %d  %s water time difference", n, lab))
  wl(sprintf("     the almanac gives %s min at %s, %s min at %s",
     wk_fs(da,0), wk_hm12(ta), wk_fs(db,0), wk_hm12(tb)))
  td = wk_cyc(tm,ta,da,tb,db)
  tdr = ffloor(td+0.5)
  #  the two almanac times shown on the same half of the day as the turn
  wl(sprintf("     standard port %s %s lies between %s (%s) and %s (%s):",
     wk_kname(K), wk_hhmm(tm), wk_hhmm(tm-WC_P), wk_fs(WC_DA,0), wk_hhmm(tm-WC_P+WC_L), wk_fs(WC_DB,0)))
  wl(sprintf("     %s of %s = %s of the way", wk_dur(WC_P), wk_dur(WC_L), wk_f(WC_F,2)))
  wl(sprintf("     difference = %s + %s x %s = %s min, call it %s",
     wk_fs(WC_DA,0), wk_f(WC_F,2), wk_p(WC_DB-WC_DA,0), wk_fs(td,1), wk_fs(tdr,0)))
  st = tm + tdr
  wl(sprintf("     secondary %s = %s %s %d min = %s", wk_kname(K), wk_hhmm(tm),
     (tdr<0)?"-":"+", fabs(tdr), cw(wk_hhmm(st), C_ACC)))
  wl("")
  wl(sprintf("  %d  %s water height difference", n+1, lab))
  f = (hh-mn)/(ms-mn)
  wl(sprintf("     %s m is %s of the way from %s %s to %s %s",
     wk_f(hh,2), wk_f(f,2), nl, wk_f(mn,2), sl, wk_f(ms,2)))
  if(f<0) wl("     " cw(sprintf("below %s: the difference is EXTRAPOLATED beyond the almanac's range", nl), C_ACC))
  if(f>1) wl("     " cw(sprintf("beyond %s: the difference is EXTRAPOLATED beyond the almanac's range", sl), C_ACC))
  dd = dn + f*(ds-dn)
  wl(sprintf("     difference = %s + %s x %s = %s m",
     wk_fs(dn,2), wk_f(f,2), wk_p(ds-dn,2), wk_fs(dd,2)))
  ht = hh + dd
  wl(sprintf("     secondary %s height = %s %s %s = %s m", wk_kname(K), wk_f(hh,2),
     (dd<0)?"-":"+", wk_f(fabs(dd),2), cw(wk_f(ht,2), C_ACC)))
  WR[K "time"]=wk_mod(st,1440); WR[K "tdiff"]=td; WR[K "hdiff"]=dd; WR[K "height"]=ht
  WR[K "f"]=f; WR[K "x"]=(f<0 || f>1)
  return 1
}
function wk_secondary(   doh,dol,hw,hwh,lw,lwh,ms,mn,ln,ls,ds,dn,dln,dls,a1,a2,b1,b2,c1,c2,e1,e2,ans){
  wk_allow("secondary", "hw hwh lw lwh mhws mhwn mlwn mlws dhws dhwn dlwn dlws thw1 tdhw1 thw2 tdhw2 tlw1 tdlw1 tlw2 tdlw2")
  doh = wk_has("hw") || wk_has("hwh")
  dol = wk_has("lw") || wk_has("lwh")
  if(W_ERR!="") return 0
  if(!doh && !dol) return wk_err("give the standard port's hw= and hwh=, or lw= and lwh=, or both")
  if(doh){
    hw=wk_time("hw","standard port high water"); hwh=wk_num("hwh","","-20","30","standard port HW height, m")
    ms=wk_num("mhws","","-20","30","standard port MHWS, m"); mn=wk_num("mhwn","","-20","30","standard port MHWN, m")
    ds=wk_num("dhws","","-10","10","secondary height difference at MHWS, m"); dn=wk_num("dhwn","","-10","10","height difference at MHWN, m")
    a1=wk_time("thw1","first standard-port HW time in the almanac"); a2=wk_num("tdhw1","","-720","720","time difference there, min")
    b1=wk_time("thw2","second standard-port HW time"); b2=wk_num("tdhw2","","-720","720","time difference there, min")
    if(W_ERR!="") return 0
    if(ms==mn) return wk_err("mhws= and mhwn= are the same, so there is nothing to interpolate between")
    if(wk_mod(a1-b1,720)==0) return wk_err("thw1= and thw2= are the same time (modulo 12 hours)")
  }
  if(dol){
    lw=wk_time("lw","standard port low water"); lwh=wk_num("lwh","","-20","30","standard port LW height, m")
    ln=wk_num("mlwn","","-20","30","standard port MLWN, m"); ls=wk_num("mlws","","-20","30","standard port MLWS, m")
    dln=wk_num("dlwn","","-10","10","height difference at MLWN, m"); dls=wk_num("dlws","","-10","10","height difference at MLWS, m")
    c1=wk_time("tlw1","first standard-port LW time in the almanac"); c2=wk_num("tdlw1","","-720","720","time difference there, min")
    e1=wk_time("tlw2","second standard-port LW time"); e2=wk_num("tdlw2","","-720","720","time difference there, min")
    if(W_ERR!="") return 0
    if(ln==ls) return wk_err("mlwn= and mlws= are the same, so there is nothing to interpolate between")
    if(wk_mod(c1-e1,720)==0) return wk_err("tlw1= and tlw2= are the same time (modulo 12 hours)")
  }
  wk_head("SECONDARY PORT, FROM A STANDARD PORT")
  if(doh) wl(sprintf("  standard port HW %s  %s m      MHWS %s  MHWN %s", wk_hhmm(hw), wk_f(hwh,2), wk_f(ms,2), wk_f(mn,2)))
  if(dol) wl(sprintf("  standard port LW %s  %s m      MLWN %s  MLWS %s", wk_hhmm(lw), wk_f(lwh,2), wk_f(ln,2), wk_f(ls,2)))
  wl("  " cwd("differences interpolate linearly: times by the standard port's time,"))
  wl("  " cwd("heights by the standard port's height between neaps and springs"))
  if(doh) wk_secpart("H",1,hw,hwh,a1,a2,b1,b2,ms,mn,ds,dn)
  if(dol) wk_secpart("L",doh?3:1,lw,lwh,c1,c2,e1,e2,ls,ln,dls,dln)
  wl("")
  ans="  ANSWER  "
  if(doh) ans = ans sprintf(" secondary HW %s  %s m", wk_hhmm(WR["Htime"]), wk_f(WR["Hheight"],2))
  if(doh && dol) ans = ans "   "
  if(dol) ans = ans sprintf(" LW %s  %s m", wk_hhmm(WR["Ltime"]), wk_f(WR["Lheight"],2))
  wl(ans)
  wk_rule()
  return 1
}

# =====================================================================
#  3.  A TIDAL STREAM RATE BETWEEN NEAPS AND SPRINGS
#
#  The atlas gives two rates per arrow, the spring rate and the neap
#  rate; the day's rate is between them in proportion to the day's range
#  at the reference port.  Outside the two mean ranges the line is
#  carried on, and the answer says so: nothing promises the stream keeps
#  to a straight line beyond springs.
# =====================================================================
function wk_stream(   spr,nps,rg,sp,np,f,rate,clamp){
  wk_allow("stream", "spr nps range sprange nprange")
  spr=wk_num("spr","","0","15","the atlas spring rate, kn"); nps=wk_num("nps","","0","15","the atlas neap rate, kn")
  rg=wk_num("range","","0","20","today's range at the reference port, m")
  sp=wk_num("sprange","","0","20","mean spring range at the reference port, m")
  np=wk_num("nprange","","0","20","mean neap range at the reference port, m")
  if(W_ERR!="") return 0
  if(sp<=np) return wk_err("sprange= must be larger than nprange=")
  wk_head("TIDAL STREAM RATE, BY THE RANGE")
  wl(sprintf("  1  The atlas: %s kn at springs, %s kn at neaps", wk_f(spr,1), wk_f(nps,1)))
  if(spr<nps) wl("     " cwd("the spring rate is normally the larger: check the two figures"))
  wl(sprintf("  2  The reference port: today's range %s m", wk_f(rg,2)))
  wl(sprintf("     its mean ranges: springs %s m, neaps %s m", wk_f(sp,2), wk_f(np,2)))
  f = (rg-np)/(sp-np)
  wl(sprintf("  3  How far from neaps to springs: (%s - %s) / (%s - %s) = %s",
     wk_f(rg,2), wk_f(np,2), wk_f(sp,2), wk_f(np,2), wk_f(f,2)))
  if(f>1) wl("     " cw("beyond springs: the rate is EXTRAPOLATED past the spring figure", C_ACC))
  if(f<0) wl("     " cw("below neaps: the rate is EXTRAPOLATED past the neap figure", C_ACC))
  rate = nps + f*(spr-nps); clamp=0
  wl(sprintf("  4  Rate = %s + %s x (%s - %s) = %s kn",
     wk_f(nps,2), wk_f(f,2), wk_f(spr,2), wk_f(nps,2), wk_f(rate,2)))
  if(rate<0){ rate=0; clamp=1; wl("     " cw("a rate below nothing is no rate: taken as 0.0 kn", C_ACC)) }
  WR["rate"]=rate; WR["f"]=f; WR["x"]=(f<0 || f>1); WR["clamp"]=clamp
  WF_SPR=spr; WF_NPS=nps; WF_RG=rg; WF_SP=sp; WF_NP=np; WF_RATE=rate
  wl("@@FIG")
  wl(sprintf("  ANSWER   %s kn%s", wk_f(rate,1), (f<0 || f>1) ? "   (extrapolated)" : ""))
  wk_rule()
  return 1
}
#  rate against range: the line through the neap and spring points
function wk_figstream(   w,h,i,x0,x1,y1,x,y,r,c){
  w=49; h=11
  x0=WF_NP; if(WF_RG<x0) x0=WF_RG
  x1=WF_SP; if(WF_RG>x1) x1=WF_RG
  r=(x1-x0)*0.1; x0-=r; x1+=r
  if(x0<0) x0=0
  y1=WF_SPR; if(WF_NPS>y1) y1=WF_NPS
  if(WF_RATE>y1) y1=WF_RATE
  y1 = y1*1.15 + 0.1
  gclear(w,h)
  for(i=0;i<w;i++){
    x = x0+(x1-x0)*i/(w-1.0)
    y = WF_NPS + (x-WF_NP)/(WF_SP-WF_NP)*(WF_SPR-WF_NPS)
    if(y>=0) gputwc((h-1)-y/y1*(h-1), i, ".", C_DIM)
  }
  gputc((h-1)-WF_NPS/y1*(h-1), (WF_NP-x0)/(x1-x0)*(w-1), "N", C_ACC)
  gputc((h-1)-WF_SPR/y1*(h-1), (WF_SP-x0)/(x1-x0)*(w-1), "S", C_ACC)
  c = (WF_RG-x0)/(x1-x0)*(w-1)
  for(i=0;i<h;i++) gputwc(i, c, "|", C_HDR)
  gputc((h-1)-WF_RATE/y1*(h-1), c, "@", C_HDR)
  print ""
  gshow()
  printf "  %s\n", cwd(sprintf("range %s m on the left to %s m on the right; 0 to %s kn up", wk_f(x0,1), wk_f(x1,1), wk_f(y1,1)))
  printf "  %s\n", cwd("N neaps   S springs   | today's range   @ today's rate")
  return 0
}

# =====================================================================
#  4.  WHICH PAGE OF THE TIDAL STREAM ATLAS
#
#  An atlas has a page for each hour from HW-6 to HW+6 at its standard
#  port.  The page for HW+2 covers HW+1:30 to HW+2:30, so the time is
#  rounded to the nearest hour, and exactly half past goes to the later
#  page.  The day's range says where between the neap and spring rates
#  to read; the station's mean ranges come from M2 and S2, which is the
#  Admiralty definition of springs and neaps.
# =====================================================================
function wk_atlas(   i,ihw,best,dt,pg,lab,il,rg,iM2,iS2,iK1,iO1,aM2,aS2,aK1,aO1,ff,sp,np,f,gauge,pos,j,strip,cl){
  wk_allow("atlas", "station date t")
  if(!wk_station()) return 0
  ihw=0; best=1e9
  for(i=1;i<=WT_N;i++) if(WT_K[i]=="H" && fabs(WT_M[i]-WS_T)<best){ best=fabs(WT_M[i]-WS_T); ihw=i }
  if(!ihw) return wk_err("no high water near that time at this station")
  wk_head("WHICH PAGE OF THE TIDAL STREAM ATLAS")
  wk_sthead()
  dt = WS_T - WT_M[ihw]
  wl("")
  wl(sprintf("  1  The high water nearest %s: HW %s  %s m", wk_hhmm(WS_T), wk_hhmm(WT_M[ihw]), wk_f(WT_H[ihw],2)))
  if(dt<0) wl(sprintf("     %s is %s before it", wk_hhmm(WS_T), wk_dur(dt)))
  else if(dt>0) wl(sprintf("     %s is %s after it", wk_hhmm(WS_T), wk_dur(dt)))
  else wl(sprintf("     %s is high water", wk_hhmm(WS_T)))
  pg = ffloor((dt+30)/60.0)
  if(pg==0) lab="HW"; else lab=sprintf("HW %s", wk_fs(pg,0))
  wl("")
  wl("  2  Each page covers 30 minutes either side of its hour, and exactly half")
  wl(sprintf("     past goes to the later page: %s from HW is the page for %s",
     (dt<0) ? ("-" wk_dur(dt)) : ("+" wk_dur(dt)), cw(lab, C_ACC)))
  strip="     "
  for(j=-6;j<=6;j++){
    if(j==0) cl="HW"; else cl=wk_fs(j,0)
    if(j==pg) strip = strip "[" cl "]"
    else strip = strip " " cl " "
  }
  wl(strip)
  if(pg<-6 || pg>6) wl("     " cw("outside the atlas's thirteen pages: the tide here is not the twice-daily kind an atlas is drawn for", C_ACC))
  #  the range of THIS tide: the LW on the side of HW that t is on
  il=0
  if(dt<=0){ for(i=ihw-1;i>=1;i--) if(WT_K[i]=="L"){ il=i; break } }
  else     { for(i=ihw+1;i<=WT_N;i++) if(WT_K[i]=="L"){ il=i; break } }
  wl("")
  if(!il) return wk_err("no low water beside that high water to take a range from")
  rg = WT_H[ihw]-WT_H[il]
  wl(sprintf("  3  The range of the tide you are in: HW %s m - LW %s m (%s) = %s m",
     wk_f(WT_H[ihw],2), wk_f(WT_H[il],2), wk_hhmm(WT_M[il]), cw(wk_f(rg,2), C_ACC)))
  WR["page"]=pg; WR["dt"]=dt; WR["range"]=rg; WR["hw"]=WT_M[ihw]; WR["means"]=0
  wl("")
  if(TD_KIND=="S"){
    wl("  4  Mean ranges are not available here: a secondary port carries no")
    wl("     constants of its own.  Its standard port is " TD_REFNAME ",")
    wl("     " TD_REF)
    wl("@@FIG")
    wl(sprintf("  ANSWER   atlas page %s    range %s m", lab, wk_f(rg,2)))
    wk_rule()
    return 1
  }
  iM2=CIDX["M2"]; iS2=CIDX["S2"]; iK1=CIDX["K1"]; iO1=CIDX["O1"]
  aM2=0; aS2=0; aK1=0; aO1=0
  for(i=1;i<=ST_N;i++){
    if(ST_C[i]==iM2) aM2=ST_A[i]
    if(ST_C[i]==iS2) aS2=ST_A[i]
    if(ST_C[i]==iK1) aK1=ST_A[i]
    if(ST_C[i]==iO1) aO1=ST_A[i]
  }
  #  BOTH are needed: with M2 and no S2 the two mean ranges are equal and
  #  the place between them is a division by nothing.  One station has it
  #  (a lake gauge with a millimetre of M2), and there this stopped the
  #  tool with awk's own error.
  if(aM2<=0 || aS2<=0){
    wl("  4  Mean ranges are not available: this station has no M2 or S2.")
    wl("@@FIG")
    wl(sprintf("  ANSWER   atlas page %s    range %s m", lab, wk_f(rg,2)))
    wk_rule()
    return 1
  }
  ff = (aK1+aO1)/(aM2+aS2)
  if(ff>0.25){
    wl(sprintf("  4  Mean ranges are not available: the form factor (K1+O1)/(M2+S2) is %s,", wk_f(ff,2)))
    wl("     so the tide here is mixed or diurnal and its springs and neaps are not")
    wl("     set by M2 and S2.  The range above is the honest number.")
    wl("@@FIG")
    wl(sprintf("  ANSWER   atlas page %s    range %s m", lab, wk_f(rg,2)))
    wk_rule()
    return 1
  }
  sp = 2*(aM2+aS2); np = 2*(aM2-aS2)
  wl(sprintf("  4  Mean ranges from the constants: M2 %s m, S2 %s m (form factor %s)",
     wk_f(aM2,3), wk_f(aS2,3), wk_f(ff,2)))
  wl(sprintf("     springs 2 x (M2 + S2) = %s m, neaps 2 x (M2 - S2) = %s m", wk_f(sp,2), wk_f(np,2)))
  wl("     " cwd("the Admiralty definition; an almanac's figures can differ by a"))
  wl("     " cwd("decimetre where shallow-water tides matter - use them if you have them"))
  f = (rg-np)/(sp-np)
  wl(sprintf("     today's range sits (%s - %s) / (%s - %s) = %s",
     wk_f(rg,2), wk_f(np,2), wk_f(sp,2), wk_f(np,2), wk_f(f,2)))
  wl("     of the way from neaps to springs")
  gauge=""
  pos = int(f*20+0.5)
  for(j=0;j<=20;j++){ if(j==pos) gauge=gauge "*"; else gauge=gauge "-" }
  if(pos<0) gauge="<" substr(gauge,2)
  if(pos>20) gauge=substr(gauge,1,20) ">"
  wl("     neaps |" gauge "| springs")
  if(f<0) wl("     " cwd("below mean neaps"))
  if(f>1) wl("     " cwd("above mean springs"))
  WR["means"]=1; WR["sprange"]=sp; WR["nprange"]=np; WR["f"]=f
  wl("@@FIG")
  wl(sprintf("  ANSWER   atlas page %s    range %s m, %s of the way from neaps to springs",
     lab, wk_f(rg,2), wk_f(f,2)))
  wl("  " cwd("the rate on that page, with the atlas's two figures for spr= and nps=:"))
  wl("  " cwd(sprintf("  tides work stream spr=.. nps=.. range=%s sprange=%s nprange=%s",
     wk_f(rg,2), wk_f(sp,2), wk_f(np,2))))
  wk_rule()
  return 1
}

# =====================================================================
#  Vector figures.  x east, y north, in nautical miles, drawn at one
#  scale both ways - and a character cell is about twice as tall as it
#  is wide, so a row is two columns' worth of distance.
# =====================================================================
function wk_vfit(n,w,h,   i,x0,x1,y0,y1,sx,sy){
  x0=VX[1]; x1=VX[1]; y0=VY[1]; y1=VY[1]
  for(i=2;i<=n;i++){
    if(VX[i]<x0) x0=VX[i]
    if(VX[i]>x1) x1=VX[i]
    if(VY[i]<y0) y0=VY[i]
    if(VY[i]>y1) y1=VY[i]
  }
  if(x1-x0<1e-6){ x0-=0.5; x1+=0.5 }
  if(y1-y0<1e-6){ y0-=0.5; y1+=0.5 }
  sx=(w-5)/(x1-x0); sy=(h-3)*2/(y1-y0)
  VS=(sx<sy)?sx:sy
  VC0 = (w-1)/2.0 - (x0+x1)/2*VS
  VR0 = (h-1)/2.0 + (y0+y1)/2*VS/2
  gclear(w,h)
  return 0
}
function wk_vc(x){ return VC0 + x*VS }
function wk_vr(y){ return VR0 - y*VS/2 }
function wk_vseg(a,b,ch,col,   n,i,f){
  n = int(sqrt((wk_vc(VX[b])-wk_vc(VX[a]))^2 + (wk_vr(VY[b])-wk_vr(VY[a]))^2)*2)+2
  for(i=0;i<=n;i++){ f=i/n
    gputwc(wk_vr(VY[a]+(VY[b]-VY[a])*f), wk_vc(VX[a]+(VX[b]-VX[a])*f), ch, col) }
  return 0
}
function wk_vlab(a,ch){ gputc(wk_vr(VY[a]), wk_vc(VX[a]), ch, C_ACC); return 0 }

# =====================================================================
#  5.  COURSE TO STEER
#
#  Over several hours the stream vectors are added and the triangle is
#  solved ONCE, which is how it is taught: lay the whole tide off from
#  the start, swing the distance run through the water from its end onto
#  the track, and read the course.  Leeway is then applied INTO the
#  wind, and variation and deviation turn true into compass.
# =====================================================================
function wk_cts(   T,V,ns,ps,i,q,s,r,tx,ty,set,drift,n,W,c,a,x,H,MG,sog,lee,wind,hd,var,dev,tr,mg,cc,dist,tm,ans){
  wk_allow("cts", "track stw streams leeway wind var dev dist")
  T=wk_ang("track","","the track you want to make good, deg true")
  V=wk_num("stw","","0","40","boat speed through the water, kn")
  if(W_ERR!="") return 0
  if(V<=0) return wk_err("stw= must be more than 0")
  if(!wk_has("streams")) return wk_err("streams= is needed (set:rate for each hour, e.g. 135:1.5,150:2.0)")
  ns=split(WA["streams"],ps,",")
  if(ns<1 || ns>24) return wk_err("streams= takes 1 to 24 set:rate pairs, one per hour")
  for(i=1;i<=ns;i++){
    if(split(ps[i],q,":")!=2 || !wk_isnum(q[1]) || !wk_isnum(q[2]))
      return wk_err(sprintf("streams= pair %d '%s' is not set:rate", i, ps[i]))
    if(q[1]+0<0 || q[1]+0>360 || q[2]+0<0 || q[2]+0>15)
      return wk_err(sprintf("streams= pair %d '%s' is out of range (set 0 to 360, rate 0 to 15)", i, ps[i]))
    WS_S[i]=nrm360(q[1]+0); WS_R[i]=q[2]+0
  }
  lee=wk_num("leeway","0","0","45","leeway, deg")
  wind=wk_wind(lee)
  var=wk_num("var","0","-90","90","variation, deg, east +")
  dev=wk_num("dev","0","-30","30","deviation, deg, east +")
  dist=wk_num("dist","0","0","1000","distance to go along the track, nm")
  if(W_ERR!="") return 0
  n = ns
  wk_head("COURSE TO STEER")
  wl(sprintf("  track to make good %s T, %s kn through the water, %d %s of stream",
     wk_deg(T), wk_g(V), n, (n==1)?"hour":"hours"))
  wl("")
  wl("  1  The stream, hour by hour, added up")
  tx=0; ty=0
  VX[1]=0; VY[1]=0
  for(i=1;i<=n;i++){
    tx += WS_R[i]*sind(WS_S[i]); ty += WS_R[i]*cosd(WS_S[i])
    wl(sprintf("     hour %d   set %s T  %s kn   -> %s nm", i, wk_deg(WS_S[i]), wk_f(WS_R[i],1), wk_f(WS_R[i],2)))
    VX[i+1]=tx; VY[i+1]=ty
  }
  set=rbrg(tx,ty); drift=sqrt(tx*tx+ty*ty)
  wl(sprintf("     together the water moves %s nm toward %s T in %d h", wk_f(drift,2), wk_deg(set), n))
  W = V*n
  wl("")
  wl(sprintf("  2  She sails %s kn x %d h = %s nm through the water", wk_g(V), n, wk_f(W,2)))
  c = drift*sind(set-T); a = drift*cosd(set-T)
  wl("")
  wl(sprintf("  3  Across the track the stream sets her %s nm to %s;", wk_f(fabs(c),2), (c>=0)?"starboard":"port"))
  wl(sprintf("     along it, %s nm %s", wk_f(fabs(a),2), (a>=0)?"with her":"against her"))
  WR["set"]=set; WR["drift"]=drift; WR["ok"]=0
  WF_TX=tx; WF_TY=ty; WF_N=n; WF_T=T; WF_OK=0
  if(fabs(c)>=W){
    wl("     " cw(sprintf("she sails only %s nm in that time, less than the stream sets her across it", wk_f(W,2)), C_ACC))
    wl("")
    wl("  ANSWER   " cw("cannot make good this track: the stream is faster across it than she is", C_ACC))
    wk_rule()
    return 1
  }
  x = asind(c/W)
  H = T - x
  wl(sprintf("     to cancel it, point %s: sin x = %s / %s = %s, x = %s deg",
     (c>=0)?"to port":"to starboard", wk_f(fabs(c),2), wk_f(W,2), wk_f(fabs(c)/W,3), wk_f(fabs(x),1)))
  wl(sprintf("     water track = %s %s %s = %s T", wk_deg(T), (x>=0)?"-":"+", wk_f(fabs(x),1), wk_d1(H)))
  MG = W*cosd(x) + a
  wl("")
  wl(sprintf("  4  Made good along the track: %s x cos %s + (%s) = %s nm in %d h",
     wk_f(W,2), wk_f(fabs(x),1), wk_f(a,2), wk_f(MG,2), n))
  if(MG<=0){
    wl("")
    wl("  ANSWER   " cw("cannot make good this track: the stream against her is stronger than her speed along it", C_ACC))
    wk_rule()
    return 1
  }
  sog = MG/n
  wl(sprintf("     speed over the ground %s kn", wk_f(sog,2)))
  hd = H
  wl("")
  if(lee>0){
    if(wind=="port"){ hd = H - lee
      wl(sprintf("  5  Leeway %s deg, wind on the port side: she slides to starboard,", wk_g(lee)))
      wl(sprintf("     so steer %s deg to port of the water track: %s - %s = %s T", wk_g(lee), wk_d1(H), wk_g(lee), wk_d1(hd))) }
    else { hd = H + lee
      wl(sprintf("  5  Leeway %s deg, wind on the starboard side: she slides to port,", wk_g(lee)))
      wl(sprintf("     so steer %s deg to starboard of the water track: %s + %s = %s T", wk_g(lee), wk_d1(H), wk_g(lee), wk_d1(hd))) }
  } else wl(sprintf("  5  No leeway given: the course to steer is the water track, %s T", wk_d1(hd)))
  wl(sprintf("     steer the whole degree: %s T", wk_deg(hd)))
  tr = int(nrm360(hd)+0.5); if(tr>=360) tr-=360
  mg = tr - var
  cc = mg - dev
  wl(sprintf("  6  Variation %s: %s T %s %s = %s M", wk_ew(var), wk_deg(tr), (var>0)?"-":"+", wk_g(fabs(var)), wk_deg(mg)))
  wl(sprintf("     deviation %s: %s M %s %s = %s C", wk_ew(dev), wk_deg(mg), (dev>0)?"-":"+", wk_g(fabs(dev)), wk_deg(cc)))
  WR["ok"]=1; WR["water"]=nrm360(H); WR["cts"]=tr; WR["mag"]=nrm360(mg); WR["comp"]=nrm360(cc)
  WR["sog"]=sog; WR["mg"]=MG; WF_OK=1; WF_HX=W*sind(H); WF_HY=W*cosd(H)
  ans = sprintf("  ANSWER   steer %s T  %s M  %s C    SOG %s kn",
     wk_deg(tr), wk_deg(mg), wk_deg(cc), wk_f(sog,1))
  if(dist>0){
    tm = dist/sog*60
    wl(sprintf("  7  %s nm at %s kn takes %s", wk_g(dist), wk_f(sog,2), wk_dur(tm)))
    if(dist>MG+0.05) wl("     " cwd(sprintf("longer than the %d h the streams cover: this assumes the same", n)))
    if(dist>MG+0.05) wl("     " cwd("stream carries on"))
    WR["time"]=tm
    ans = ans sprintf("    %s for %s nm", wk_dur(tm), wk_g(dist))
  }
  wl("@@FIG")
  wl(ans)
  wk_rule()
  return 1
}
function wk_figcts(   n,k,e,i){
  n=WF_N
  #  points: 1 start, 2..n+1 the stream hour by hour, then the end on the track
  k=n+1
  VX[k+1]=WF_TX+WF_HX; VY[k+1]=WF_TY+WF_HY
  wk_vfit(k+1, 61, 17)
  e=k+1
  wk_vseg(1, e, "=", "")
  for(i=1;i<=n;i++) wk_vseg(i, i+1, "~", C_DIM)
  wk_vseg(k, e, ".", "")
  wk_vlab(1,"S"); wk_vlab(k,"T"); wk_vlab(e,"E")
  print ""
  gshow()
  printf "  %s\n", cwd("S start   ~ the stream (three arrows on a chart), ending at T")
  printf "  %s\n", cwd(". the water track (one arrow)   = the ground track (two arrows), to E")
  return 0
}

# =====================================================================
#  6.  SET AND DRIFT, FROM A DR AND A FIX
#
#  Run the DR from a known position on the course through the water;
#  the vector from the DR to the fix, over the time, is the set and
#  drift.  It is the honest number, because it holds everything that
#  moved her - stream, wind-driven current, log error, the helmsman -
#  and not just the part a table predicted.  Plane sailing at the mean
#  latitude, which is right to a fraction of a cable over coastal
#  distances.
# =====================================================================
function wk_dlon(d){ while(d>180) d-=360; while(d<-180) d+=360; return d }
function wk_setdrift(   la1,lo1,co,V,hrs,fla,flo,lee,wind,wt,d,dn,de,la2,ml,dlo,lo2,fn,fe,ml2,set,drift,rate){
  wk_allow("setdrift", "start co stw hours fix leeway wind")
  wk_pos("start","the position the DR runs from"); la1=WP_LAT; lo1=WP_LON
  co=wk_ang("co","","the course steered, deg true")
  V=wk_num("stw","","0","40","speed through the water, kn")
  hrs=wk_num("hours","","0","24","time run, hours")
  wk_pos("fix","the fix at the end of the run"); fla=WP_LAT; flo=WP_LON
  lee=wk_num("leeway","0","0","45","leeway, deg")
  wind=wk_wind(lee)
  if(W_ERR!="") return 0
  if(hrs<=0) return wk_err("hours= must be more than 0")
  if(fabs(la1)>80 || fabs(fla)>80) return wk_err("plane sailing is no good this close to a pole (latitude beyond 80)")
  wk_head("SET AND DRIFT, FROM A DR AND A FIX")
  wl(sprintf("  from %s %s, steering %s T at %s kn for %s h",
     wk_lat(la1), wk_lon(lo1), wk_deg(co), wk_g(V), wk_g(hrs)))
  wl("  " cwd("plane sailing at the mean latitude: right for coastal distances"))
  wl("")
  wt = co
  if(lee>0 && wind=="port"){ wt=co+lee
    wl(sprintf("  1  Leeway %s deg with the wind to port pushes her to starboard:", wk_g(lee)))
    wl(sprintf("     water track %s + %s = %s T", wk_deg(co), wk_g(lee), wk_deg(wt))) }
  else if(lee>0){ wt=co-lee
    wl(sprintf("  1  Leeway %s deg with the wind to starboard pushes her to port:", wk_g(lee)))
    wl(sprintf("     water track %s - %s = %s T", wk_deg(co), wk_g(lee), wk_deg(wt))) }
  else {
    wl(sprintf("  1  No leeway given, so the water track is the course, %s T", wk_deg(wt)))
    wl("     " cwd("the set and drift found below then includes any leeway as well"))
  }
  d = V*hrs
  dn = d*cosd(wt); de = d*sind(wt)
  la2 = la1 + dn/60.0
  ml = (la1+la2)/2
  dlo = de/(60.0*cosd(ml))
  lo2 = lo1 + dlo; if(lo2>180) lo2-=360; if(lo2<-180) lo2+=360
  wl("")
  wl(sprintf("  2  The DR: %s kn x %s h = %s nm on %s T", wk_g(V), wk_g(hrs), wk_f(d,2), wk_deg(wt)))
  wl(sprintf("     d.lat = %s x cos %s = %s nm;  departure = %s x sin %s = %s nm",
     wk_f(d,2), wk_deg(wt), wk_f(dn,2), wk_f(d,2), wk_deg(wt), wk_f(de,2)))
  wl(sprintf("     d.long = departure / cos(mean lat %s) = %s'", wk_f(ml,2), wk_f(dlo*60,2)))
  wl(sprintf("     DR %s %s", wk_lat(la2), wk_lon(lo2)))
  fn = (fla-la2)*60.0
  ml2 = (fla+la2)/2
  fe = wk_dlon(flo-lo2)*60.0*cosd(ml2)
  wl("")
  wl(sprintf("  3  DR to the fix %s %s:", wk_lat(fla), wk_lon(flo)))
  wl(sprintf("     d.lat %s nm;  d.long %s' x cos %s = departure %s nm",
     wk_fs(fn,2), wk_fs(wk_dlon(flo-lo2)*60,2), wk_f(ml2,2), wk_fs(fe,2)))
  set = rbrg(fe,fn); drift = sqrt(fn*fn+fe*fe); rate = drift/hrs
  WR["drlat"]=la2; WR["drlon"]=lo2; WR["drift"]=drift; WR["rate"]=rate; WR["set"]=set
  VX[1]=0; VY[1]=0; VX[2]=de; VY[2]=dn; VX[3]=de+fe; VY[3]=dn+fn
  wl("")
  if(drift<0.05){
    wl("  4  The fix is on the DR: no set and drift to speak of")
    WR["set"]=0
    wl("@@FIG")
    wl(sprintf("  ANSWER   no measurable set:  drift %s nm in %s h", wk_f(drift,2), wk_g(hrs)))
    wk_rule()
    return 1
  }
  wl(sprintf("  4  set = the direction of that vector = %s T", cw(wk_deg(set), C_ACC)))
  wl(sprintf("     drift = %s nm in %s h, so the rate is %s kn", wk_f(drift,2), wk_g(hrs), wk_f(rate,2)))
  wl("@@FIG")
  wl(sprintf("  ANSWER   set %s T    drift %s nm in %s h    rate %s kn",
     wk_deg(set), wk_f(drift,1), wk_g(hrs), wk_f(rate,1)))
  wk_rule()
  return 1
}
function wk_figsd(){
  wk_vfit(3, 61, 15)
  wk_vseg(1, 3, "=", "")
  wk_vseg(1, 2, ".", "")
  wk_vseg(2, 3, "~", C_DIM)
  wk_vlab(1,"S"); wk_vlab(2,"D"); wk_vlab(3,"F")
  print ""
  gshow()
  printf "  %s\n", cwd("S start   . the DR run through the water to D   ~ set and drift, D to the fix F")
  printf "  %s\n", cwd("= what she actually made good over the ground")
  return 0
}

# =====================================================================
#  7.  A TIDAL GATE
#
#  A headland where the stream runs hard is a gate: open while the
#  stream is with her, shut while it is against her.  A navigator finds
#  when it opens and shuts in one of two ways, and this takes both
#  (Larry, 15 November 2026):
#
#    the atlas       the stream on each page of the tidal stream atlas,
#                    HW -6 to HW +6 at its standard port, resolved along
#                    her track: rate x cos(set - track).  The gate turns
#                    where that changes sign, found between two pages by
#                    a straight line, as it is done with a pencil.
#    the pilot book  the hours it gives: "the west-going stream begins
#                    at HW Portsmouth +5".
#
#  Either way the hours from high water become times by the clock, and
#  then: is it open when she is there, and when must she leave to
#  arrive while it is.
#
#  THE TIDES EITHER SIDE.  A gate is often open across low water, from
#  one tide's HW +5 to the next tide's HW -1, so one high water is not
#  enough.  With station= the high waters before and after are
#  predicted.  With hw= the next may be given as hw2=; otherwise the
#  tides are taken as 12 h 25 min apart, the mean, and the working says
#  so.  With all thirteen pages the atlas form runs the pages round
#  into the tide before and the tide after, so a window is found whole.
#
#  WORKED FROM THE FIGURES AS PRINTED.  The stream along her track is
#  taken to a hundredth of a knot, and a time the gate turns to the
#  whole minute, as each is printed; every later step uses the printed
#  figure.  So a student with the working and a pencil gets the same
#  minute the tool does, and not one beside it.
#
#  WHAT IT DOES NOT DO.  Springs and neaps: WHEN the stream turns does
#  not depend on them, how hard it runs does, and `stream` gives the
#  day's rate.  And a gate here is a place and a time, not a passage of
#  miles through it.
# =====================================================================
#  a clock time, and which day it falls on, counted from the day of hw
function wk_gclk(m,   d,s){
  d=ffloor(ffloor(m+0.5)/1440.0); s=wk_hhmm(m)
  if(d==1) return s " next day"
  if(d==-1) return s " the day before"
  if(d>1) return s sprintf(" %d days on", d)
  if(d<-1) return s sprintf(" %d days before", -d)
  return s
}
function wk_gpage(p){ if(p==0) return "HW"; return "HW " ((p<0)?"-":"+") wk_g(fabs(p)) }
function wk_gtide(k){
  if(k==1) return " of the next tide"
  if(k==-1) return " of the tide before"
  if(k==2) return " of the tide after next"
  if(k==-2) return " of the tide before last"
  return ""
}
function wk_gsamp(i){ return wk_gpage(GS_P[i]) wk_gtide(GS_K[i]) " (" wk_hhmm(GS_T[i]) ")" }
#  one window in words: both ends, or the one that is known
function wk_gwin(j){
  if(GW_OK[j] && GW_SK[j]) return wk_gclk(GW_O[j]) " to " wk_gclk(GW_S[j])
  if(GW_SK[j]) return "until " wk_gclk(GW_S[j])
  if(GW_OK[j]) return "from " wk_gclk(GW_O[j])
  return "on every page given"
}
#  the stream along her track at a time, from the pages either side
function wk_galong(tm,   i){
  GA_OK=0
  for(i=1;i<GS_N;i++) if(tm>=GS_T[i] && tm<=GS_T[i+1]){
    GA_OK=1
    if(GS_T[i+1]==GS_T[i]) return GS_A[i]
    return GS_A[i] + (GS_A[i+1]-GS_A[i])*(tm-GS_T[i])/(GS_T[i+1]-GS_T[i])
  }
  return 0
}
function wk_gate(   atl,plt,man,T,ns,ps,q,i,j,k,from,foul,opens,shuts,hw,h2,iv,ihw,best,nx,pv,c,a1,a2,x,inw,full,lo,hi,nr,step,tm,hast,dist,sog,p,st,al,bi,ans,src1,srcm,gap,o,s){
  wk_allow("tidal_gate", "hw hw2 station date t dist sog track streams from foul opens shuts")
  if(W_ERR!="") return 0
  atl = (wk_has("track") || wk_has("streams") || wk_has("from") || wk_has("foul"))
  plt = (wk_has("opens") || wk_has("shuts"))
  if(atl && plt) return wk_err("give the atlas's streams= and track=, or the pilot book's opens= and shuts=, not both")
  if(!atl && !plt) return wk_err("tidal_gate needs the atlas's streams= and track=, or the pilot book's opens= and shuts=")
  man = wk_has("hw")
  if(man && wk_has("station")) return wk_err("give hw=, or station= to predict it, not both")
  if(man && wk_has("date")) return wk_err("date= goes with station=; hw= is a time by the clock")
  if(!man && wk_has("hw2")) return wk_err("hw2= goes with hw=; with station= the next high water is predicted")
  if(!man && !wk_has("station") && defstation=="")
    return wk_err("hw= is needed (high water at the standard port, HH:MM), or station= to predict it")
  # ---- the form's own values -----------------------------------------
  if(atl){
    T=wk_ang("track","","her track past the headland, deg true")
    if(W_ERR!="") return 0
    if(!wk_has("streams")) return wk_err("streams= is needed (set:rate for each atlas page, e.g. 080:1.9,078:2.4)")
    ns=split(WA["streams"],ps,",")
    if(ns<2 || ns>13) return wk_err("streams= takes 2 to 13 set:rate pairs, one for each atlas page")
    for(i=1;i<=ns;i++){
      if(split(ps[i],q,":")!=2 || !wk_isnum(q[1]) || !wk_isnum(q[2]))
        return wk_err(sprintf("streams= pair %d '%s' is not set:rate", i, ps[i]))
      if(q[1]+0<0 || q[1]+0>360 || q[2]+0<0 || q[2]+0>15)
        return wk_err(sprintf("streams= pair %d '%s' is out of range (set 0 to 360, rate 0 to 15)", i, ps[i]))
      GP_S[i]=nrm360(q[1]+0); GP_R[i]=q[2]+0
    }
    from=wk_num("from","-6","-6","6","the atlas page of the first pair, hours from HW")
    foul=wk_num("foul","0","0","10","the foul stream she will accept, kn")
    if(W_ERR!="") return 0
    if(from!=int(from)) return wk_err(sprintf("from=%s should be a whole page, -6 to 6", WA["from"]))
    if(from+ns-1>6) return wk_err(sprintf("streams= runs past HW +6: %d pairs from page %s", ns, wk_gpage(from)))
    full = (ns==13)
  } else {
    opens=wk_num("opens","","-6.5","6.5","hours from HW when the fair stream begins")
    shuts=wk_num("shuts","","-6.5","6.5","hours from HW when the fair stream ends")
    if(W_ERR!="") return 0
    if(opens==shuts) return wk_err("opens= and shuts= are the same hour: the gate would never be open, or never shut")
  }
  hast=0
  dist=0; sog=0
  if(wk_has("dist") || wk_has("sog")){
    if(!wk_has("dist") || !wk_has("sog")) return wk_err("dist= and sog= go together: the miles to the gate and her speed over the ground")
    dist=wk_num("dist","","0","1000","distance to the gate, nm")
    sog=wk_num("sog","","0","60","her speed over the ground on the way, kn")
    if(W_ERR!="") return 0
    if(sog<=0) return wk_err("sog= must be more than 0")
  }
  # ---- the high waters: this one, and those either side --------------
  srcm="mean"; src1="mean"
  if(man){
    hw=wk_time("hw","high water at the standard port")
    if(W_ERR!="") return 0
    GH[0]=hw; GH[-1]=hw-745; GH[1]=hw+745
    if(wk_has("hw2")){
      h2=wk_time("hw2","the next high water there")
      if(W_ERR!="") return 0
      while(h2<=hw) h2+=1440
      iv=h2-hw
      if(iv<600 || iv>900) return wk_err("hw2= should be the high water after hw=, about twelve and a half hours later")
      GH[1]=h2; src1="given"
    }
    if(wk_has("t")){
      tm=wk_hm(WA["t"])
      if(tm<0) return wk_err(sprintf("t=%s is not a time (HH:MM)", WA["t"]))
      while(tm-hw>720) tm-=1440
      while(tm-hw< -720) tm+=1440
      hast=1
    }
  } else {
    if(!wk_station()) return 0
    ihw=0; best=1e9
    for(i=1;i<=WT_N;i++) if(WT_K[i]=="H" && fabs(WT_M[i]-WS_T)<best){ best=fabs(WT_M[i]-WS_T); ihw=i }
    if(!ihw) return wk_err("no high water near that time at this station")
    hw=WT_M[ihw]; GH[0]=hw; GH[-1]=hw-745; GH[1]=hw+745
    for(i=ihw-1;i>=1;i--) if(WT_K[i]=="H"){ GH[-1]=WT_M[i]; srcm="pred"; break }
    for(i=ihw+1;i<=WT_N;i++) if(WT_K[i]=="H"){ GH[1]=WT_M[i]; src1="pred"; break }
    tm=WS_T; hast=1
  }
  GH[2]=GH[1]+745; GH[3]=GH[2]+745; GH[-2]=GH[-1]-745
  # ---- the heading and the high waters --------------------------------
  if(atl) wk_head("TIDAL GATE, FROM THE STREAM ATLAS")
  else wk_head("TIDAL GATE, FROM THE PILOT BOOK'S HOURS")
  if(!man){ wk_sthead(); wl("") }
  wl(sprintf("  1  High water at the standard port: %s", cw(wk_hhmm(hw), C_ACC)))
  if(plt || full){
    wl(sprintf("     the one before it %s, the one after it %s", wk_gclk(GH[-1]), wk_gclk(GH[1])))
    if(srcm=="mean") wl("     " cwd("the one before is taken as 12 h 25 min earlier, the mean"))
    else wl("     " cwd("the one before is as predicted"))
    if(src1=="mean") wl("     " cwd("the one after is taken as 12 h 25 min later, the mean"))
    else if(src1=="given") wl("     " cwd("the one after is as given"))
    else wl("     " cwd("the one after is as predicted"))
  }
  wl("")
  GW_N=0; GS_N=0
  if(atl){
    # ---- the pages, resolved along her track --------------------------
    c = 0 - foul
    wl(sprintf("  2  The stream at the gate, along her track of %s T", wk_deg(T)))
    wl("     " cwd("rate x cos(set - track): with her is +, against her is -"))
    wl("     page     time    set   rate   along")
    bi=0
    for(k=(full?-1:0); k<=(full?1:0); k++) for(i=1;i<=ns;i++){
      x = GH[k] + (from+i-1)*60
      if(GS_N>0 && x<=GS_T[GS_N]) continue
      GS_N++
      GS_T[GS_N]=x; GS_K[GS_N]=k; GS_P[GS_N]=from+i-1
      GS_A[GS_N]=wk_r2(GP_R[i]*cosd(GP_S[i]-T))
      if(k==0){
        wl(sprintf("     %-7s  %s   %s   %4s   %s", wk_gpage(from+i-1), wk_hhmm(x), wk_deg(GP_S[i]), wk_f(GP_R[i],1), wk_fs(GS_A[GS_N],2)))
        if(!bi || GS_A[GS_N]>GS_A[bi]) bi=GS_N
      }
    }
    wl("")
    if(foul==0) wl("  3  The gate is open while the stream is with her")
    else wl(sprintf("  3  The gate is open while the stream is no more than %s kn against her", wk_f(foul,1)))
    # ---- where it turns ------------------------------------------------
    inw=0
    if(GS_A[1]>=c){ GW_N++; GW_O[GW_N]=GS_T[1]; GW_OK[GW_N]=0; GW_OI[GW_N]=0; GW_SK[GW_N]=0; inw=1 }
    for(i=1;i<GS_N;i++){
      a1=GS_A[i]-c; a2=GS_A[i+1]-c
      if(a1<0 && a2>=0){
        GW_N++; GW_O[GW_N]=ffloor(GS_T[i]+(GS_T[i+1]-GS_T[i])*(0-a1)/(a2-a1)+0.5)
        GW_OK[GW_N]=1; GW_OI[GW_N]=i; GW_SK[GW_N]=0; inw=1
      } else if(a1>=0 && a2<0){
        GW_S[GW_N]=ffloor(GS_T[i]+(GS_T[i+1]-GS_T[i])*a1/(a1-a2)+0.5)
        GW_SK[GW_N]=1; GW_SI[GW_N]=i; inw=0
      }
    }
    if(inw){ GW_S[GW_N]=GS_T[GS_N]; GW_SK[GW_N]=0 }
    lo = full ? hw-360 : GS_T[1]-1
    hi = full ? hw+360 : GS_T[GS_N]+1
    step=4
  } else {
    wl(sprintf("  2  The pilot book: the gate opens at %s and shuts at %s", wk_gpage(opens), wk_gpage(shuts)))
    if(shuts>opens) wl("     " cwd("so it opens and shuts on the same tide"))
    else wl("     " cwd("so it opens on one tide and shuts on the next"))
    wl("")
    for(k=-2;k<=2;k++){
      GW_N++
      GW_O[GW_N]=ffloor(GH[k]+opens*60+0.5); GW_OK[GW_N]=1; GW_SK[GW_N]=1; GW_K[GW_N]=k
      GW_S[GW_N]=ffloor(((shuts>opens)?GH[k]:GH[k+1])+shuts*60+0.5)
    }
    lo=hw-360; hi=hw+360
    step=3
  }
  # ---- which windows are this high water's ------------------------------
  nr=0
  for(j=1;j<=GW_N;j++){
    GW_R[j]=0
    if(GW_S[j]>lo && GW_O[j]<hi){ GW_R[j]=1; nr++; GR[nr]=j }
  }
  if(atl){
    if(nr==0){
      if(foul==0) wl("     " cw("on every page the stream is against her", C_ACC))
      else wl("     " cw("on every page the stream is against her by more than that", C_ACC))
    }
    for(k=1;k<=nr;k++){
      j=GR[k]
      if(GW_OK[j]){
        i=GW_OI[j]; gap=GS_T[i+1]-GS_T[i]
        wl(sprintf("     it opens between %s and %s:", wk_gsamp(i), wk_gsamp(i+1)))
        wl(sprintf("       from %s to %s kn, passing %s:", wk_fs(GS_A[i],2), wk_fs(GS_A[i+1],2), wk_f(c,2)))
        wl(sprintf("       %s min x %s / %s = %s min after %s, at %s",
           wk_g(gap), wk_f(fabs(c-GS_A[i]),2), wk_f(fabs(GS_A[i+1]-GS_A[i]),2),
           wk_f(GW_O[j]-GS_T[i],0), wk_hhmm(GS_T[i]), cw(wk_gclk(GW_O[j]), C_ACC)))
      } else if(GW_SK[j]){
        wl(sprintf("     it is already open on %s, the first page given:", wk_gsamp(1)))
        wl("       when it opened is on an earlier page")
      }
      if(GW_SK[j]){
        i=GW_SI[j]; gap=GS_T[i+1]-GS_T[i]
        wl(sprintf("     it shuts between %s and %s:", wk_gsamp(i), wk_gsamp(i+1)))
        wl(sprintf("       from %s to %s kn, passing %s:", wk_fs(GS_A[i],2), wk_fs(GS_A[i+1],2), wk_f(c,2)))
        wl(sprintf("       %s min x %s / %s = %s min after %s, at %s",
           wk_g(gap), wk_f(fabs(GS_A[i]-c),2), wk_f(fabs(GS_A[i]-GS_A[i+1]),2),
           wk_f(GW_S[j]-GS_T[i],0), wk_hhmm(GS_T[i]), cw(wk_gclk(GW_S[j]), C_ACC)))
      } else if(GW_OK[j]){
        wl(sprintf("     it is still open on %s, the last page given:", wk_gsamp(GS_N)))
        wl("       when it shuts is on a later page")
      }
      else {
        if(foul==0) wl("     " cw("on every page the stream is with her", C_ACC))
        else wl("     " cw("on every page the stream is within that", C_ACC))
      }
    }
    wl("")
  }
  if(full || plt) wl(sprintf("  %d  The gate, around this high water", step))
  else wl(sprintf("  %d  The gate, on the pages given", step))
  if(nr==0) wl("       " cw("SHUT", C_ACC) " throughout")
  for(k=1;k<=nr;k++){
    j=GR[k]
    if(plt){
      o=GW_K[j]; s=(shuts>opens)?o:o+1
      wl(sprintf("       opens  HW %s%s %s %s = %s", wk_hhmm(GH[o]), wk_gtide(o), (opens<0)?"-":"+", wk_dur(fabs(opens)*60), wk_gclk(GW_O[j])))
      wl(sprintf("       shuts  HW %s%s %s %s = %s", wk_hhmm(GH[s]), wk_gtide(s), (shuts<0)?"-":"+", wk_dur(fabs(shuts)*60), wk_gclk(GW_S[j])))
    }
    if(GW_OK[j] && GW_SK[j]) wl(sprintf("       %s  %s, for %s", cw("OPEN", C_ACC), wk_gwin(j), wk_dur(GW_S[j]-GW_O[j])))
    else wl(sprintf("       %s  %s", cw("OPEN", C_ACC), wk_gwin(j)))
    WR["o" k]=GW_O[j]; WR["s" k]=GW_S[j]; WR["ok" k]=GW_OK[j]; WR["sk" k]=GW_SK[j]
  }
  if(atl && bi){
    if(GS_A[bi]>0.005) wl(sprintf("     the best of it: %s kn with her on page %s (%s)", wk_f(GS_A[bi],2), wk_gpage(GS_P[bi]), wk_hhmm(GS_T[bi])))
    else if(GS_A[bi]< -0.005) wl(sprintf("     the least against her: %s kn on page %s (%s)", wk_f(0-GS_A[bi],2), wk_gpage(GS_P[bi]), wk_hhmm(GS_T[bi])))
    else wl(sprintf("     at best it is slack, on page %s (%s)", wk_gpage(GS_P[bi]), wk_hhmm(GS_T[bi])))
    WR["best"]=GS_A[bi]; WR["bestpage"]=GS_P[bi]
  }
  WR["n"]=nr; WR["hw"]=hw; WR["hwnext"]=GH[1]; WR["form"]=atl?"atlas":"pilot"
  # ---- when she is there -------------------------------------------------
  st=""
  if(hast){
    step++
    j=0
    for(i=1;i<=GW_N;i++) if(tm>=GW_O[i] && tm<GW_S[i]){ j=i; break }
    st = j ? "OPEN" : "SHUT"
    wl("")
    #  with only some pages given, a time outside them cannot be judged
    if(atl && !full && (tm<GS_T[1] || tm>GS_T[GS_N])){
      wl(sprintf("  %d  At %s she is at the gate", step, wk_gclk(tm)))
      wl("     " cw("that is outside the pages given: whether it is open then is not known", C_ACC))
      st=""; WR["state"]="unknown"; WR["t"]=tm
    } else {
    wl(sprintf("  %d  At %s she is at the gate: %s", step, wk_gclk(tm), cw(st, C_ACC)))
    if(atl){
      al=wk_galong(tm)
      if(GA_OK){
        if(al>0.005) wl(sprintf("     the stream then: %s kn with her", wk_f(al,2)))
        else if(al< -0.005) wl(sprintf("     the stream then: %s kn against her", wk_f(0-al,2)))
        else wl("     the stream then: slack")
        WR["along"]=al
      } else wl("     " cwd("that time is outside the pages given, so the stream then is not known"))
    }
    if(j){
      if(GW_SK[j]){ wl(sprintf("     it shuts in %s, at %s", wk_dur(GW_S[j]-tm), wk_gclk(GW_S[j]))); WR["left"]=GW_S[j]-tm }
      else wl("     when it shuts is on a later page")
    } else {
      k=0
      for(i=1;i<=GW_N;i++) if(GW_OK[i] && GW_O[i]>tm){ k=i; break }
      if(k){ wl(sprintf("     it opens in %s, at %s", wk_dur(GW_O[k]-tm), wk_gclk(GW_O[k]))); WR["left"]=GW_O[k]-tm }
      else wl("     it does not open again within the tides worked here")
    }
    WR["state"]=j?"open":"shut"; WR["t"]=tm
    }
  }
  # ---- when to leave -------------------------------------------------------
  if(sog>0){
    step++
    p=ffloor(dist/sog*60+0.5)
    wl("")
    wl(sprintf("  %d  The passage to the gate: %s nm at %s kn is %s", step, wk_g(dist), wk_f(sog,1), wk_dur(p)))
    if(nr==0) wl("       there is no time to leave for: the gate does not open")
    for(k=1;k<=nr;k++){
      j=GR[k]
      if(GW_OK[j] && GW_SK[j]) wl(sprintf("       open %s: leave between %s and %s", wk_gwin(j), wk_gclk(GW_O[j]-p), wk_gclk(GW_S[j]-p)))
      else if(GW_SK[j]) wl(sprintf("       open %s: leave by %s", wk_gwin(j), wk_gclk(GW_S[j]-p)))
      else if(GW_OK[j]) wl(sprintf("       open %s: leave from %s", wk_gwin(j), wk_gclk(GW_O[j]-p)))
      else wl("       open on every page given: leave when she likes")
      if(GW_OK[j]) WR["lv" k]=GW_O[j]-p
      if(GW_SK[j]) WR["lb" k]=GW_S[j]-p
    }
    WR["p"]=p
  }
  # ---- the figure's numbers, and the answer --------------------------------
  GF_HW=hw; GF_T=hast?tm:-99999
  GF_LO=-999999; GF_HI=999999
  if(atl && !full){ GF_LO=GS_T[1]; GF_HI=GS_T[GS_N] }
  wl("@@FIG")
  if(nr==0) ans="shut throughout"
  else {
    ans="open " wk_gwin(GR[1])
    for(k=2;k<=nr;k++) ans = ans ", and " wk_gwin(GR[k])
  }
  if(hast && st!="") ans = ans sprintf("      at %s: %s", wk_hhmm(tm), st)
  wl("  ANSWER   " ans)
  wk_rule()
  return 1
}
#  The gate as a strip of time, seven hours either side of high water:
#  a quarter of an hour to a character.
function wk_figgate(   i,j,m,row,mk,lab,n,c,o){
  n=56
  row=""; mk=""
  for(i=0;i<n;i++){
    m=GF_HW-420+i*15+7.5
    c="."
    for(j=1;j<=GW_N;j++) if(m>=GW_O[j] && m<GW_S[j]) c="="
    if(m<GF_LO || m>GF_HI) c="?"
    row=row c
    o=" "
    if(GF_HW>=m-7.5 && GF_HW<m+7.5) o="H"
    if(GF_T>=m-7.5 && GF_T<m+7.5) o="t"
    mk=mk o
  }
  print ""
  printf "     %s\n", cw(row, C_ACC)
  printf "     %s\n", cw(mk, C_HDR)
  printf "     %-25s%s%25s\n", wk_hhmm(GF_HW-420), "HW " wk_hhmm(GF_HW), wk_hhmm(GF_HW+420)
  printf "  %s\n", cwd("= open   . shut   H high water   t when she is there")
  if(GF_LO>-999999) printf "  %s\n", cwd("? not on the pages given")
  return 0
}

# =====================================================================
#  8. LUNAR: SPRINGS AND NEAPS
#
#  Where the day sits in the Moon's month, when springs and neaps fall,
#  how big today's tide is, and the coefficient.  Larry ruled its design
#  one decision at a time on 16 November 2026, and each ruling is a
#  shape in this code:
#
#    ABY  it works from the Moon AND from the tide tables, with
#         whichever part it is given; a station supplies both.
#    ACC  the coefficient is shown two ways: by pencil from the day's
#         heights (100 x the Brest range / 6.10 m), and, when Brest's
#         constants are to hand, as an almanac prints it.
#    ACG  springs and neaps by the rule of thumb, always; and, with a
#         station, as they are found in the prediction, beside it.
#    ACM, ACO  coef= is carried: checked, noted in one line, not used.
#    ACS  the figure is a strip of the Moon's month.
#
#  WHY THE ALMANAC'S FIGURE IS THE TWICE-A-DAY TIDE ALONE.  Measured on
#  the 57 high waters of November 2026 at Brest, the pencil form on the
#  whole tide is 2 points from the published coefficient on average and
#  up to 6, and the error alternates: one tide of each day agrees, the
#  other is 2 to 5 high.  Worked on the semi-diurnal constituents alone
#  it is 1 point out on average and never more than 2.  Shom's sheet
#  gives C = (H - N0) / U x 100 and does not say this; it is a finding
#  from the published figures.
#
#  The coefficient is Brest's by definition (Shom: "calcule pour Brest
#  uniquement"), so at any other port this gives the place between that
#  port's own mean neaps and springs, and predicts Brest for the
#  coefficient.
# =====================================================================
function wk_lbrest(){ return "ticon/brest-3-fra-refmar" }
#  the Moon's elongation from the Sun: 0 new, 90 first quarter, 180 full
function wk_lel(jd){ return nrm360(moon_lon(jd) - sun_lon(jd)) }
#  the time the elongation is q, near jd: twelve steps at the mean rate.
#  The true rate is within a sixth of it, so each step leaves at most a
#  sixth of the error and twelve leave less than a tenth of a second.
function wk_lsolve(jd,q,   i){
  for(i=0;i<12;i++) jd -= sgn180(wk_lel(jd)-q)/12.190749
  return jd
}
#  the four phases in order from jdA to jdB: LE_T (jd, UT) and LE_Q
function wk_levents(jdA,jdB,   e,q,t){
  e=wk_lel(jdA); q=(int(e/90)+1)*90
  t=wk_lsolve(jdA+(q-e)/12.190749, q%360)
  LE_N=0
  while(t<=jdB && LE_N<12){
    LE_N++; LE_T[LE_N]=t; LE_Q[LE_N]=q%360
    q+=90; t=wk_lsolve(t+7.3826, q%360)
  }
  return LE_N
}
function wk_lname(q){
  if(q==0) return "new moon"
  if(q==90) return "first quarter"
  if(q==180) return "full moon"
  return "last quarter"
}
function wk_lkind(q){ return (q==0 || q==180) ? "springs" : "neaps" }
#  a time as a count of whole minutes, so a date and a clock time taken
#  from it can never disagree across midnight
function wk_lM(jd){ return ffloor(jd*1440+0.5) }
function wk_lmon(m){ return substr("JanFebMarAprMayJunJulAugSepOctNovDec", m*3-2, 3) }
function wk_ldate(jd){ jd2cal((wk_lM(jd)+0.5)/1440); return CAL_D " " wk_lmon(CAL_M) }
function wk_lclk(jd){ return wk_hhmm(wk_mod(wk_lM(jd)+720, 1440)) }
#  THE MOON'S PHASES ARE GIVEN TO THE HOUR, NOT THE MINUTE.  The engine's
#  series for the Sun and Moon is a short one, right for a rising and a
#  setting; it puts a phase within about an hour of the almanac (the
#  last quarter of 20 May 2025 at 10:53 for 11:59, the new moon of 27 May
#  at 03:23 for 03:02).  A minute would claim more than it knows.
function wk_lH(jd){ return ffloor(jd*24+0.5) }
function wk_lhdate(jd){ jd2cal((wk_lH(jd)+0.5)/24); return CAL_D " " wk_lmon(CAL_M) }
function wk_lhclk(jd){ return sprintf("%02d:00", wk_mod(wk_lH(jd)+12, 24)) }
#  the rule's two days: "28 to 29 May", or "31 May to 1 Jun"
function wk_lband(jd,   a,b,pa,pb){
  a=wk_ldate(jd+1); b=wk_ldate(jd+2)
  split(a,pa," "); split(b,pb," ")
  if(pa[2]==pb[2]) return pa[1] " to " b
  return a " to " b
}
function wk_lplace(rg,np,sp,f,   gauge,pos,j){
  wl(sprintf("     from neaps to springs: (%s - %s) / (%s - %s) = %s",
     wk_f(rg,2), wk_f(np,2), wk_f(sp,2), wk_f(np,2), wk_f(f,2)))
  gauge=""
  pos=int(f*20+0.5)
  for(j=0;j<=20;j++){ if(j==pos) gauge=gauge "*"; else gauge=gauge "-" }
  if(pos<0) gauge="<" substr(gauge,2)
  if(pos>20) gauge=substr(gauge,1,20) ">"
  wl("     neaps |" gauge "| springs")
  if(f<0) wl("     " cwd("below mean neaps"))
  if(f>1) wl("     " cwd("above mean springs"))
  return 0
}
#  the biggest (or smallest) tide near a phase of the Moon.  The pair of
#  tides is taken first, because one tide of each day is the bigger at
#  most ports and a single tide would follow that, not the Moon; then
#  the bigger (or smaller) of the pair.
function wk_lfound(te,kind,   j,s,bj,bs){
  bj=0
  for(j=2;j<=LR_N;j++){
    s=(LR_T[j]+LR_T[j-1])/2
    if(s<te-1.5 || s>te+5.5) continue
    s=LR_R[j]+LR_R[j-1]
    if(!bj || ((kind=="springs") ? (s>bs) : (s<bs))){ bj=j; bs=s }
  }
  if(!bj) return 0
  if(kind=="springs") return (LR_R[bj-1]>LR_R[bj]) ? bj-1 : bj
  return (LR_R[bj-1]<LR_R[bj]) ? bj-1 : bj
}
function wk_lunar(   tab,brs,typed,id,st,rg,hwh,lwh,sp,np,bh,bl,rb,hasc,cf,tm,jdt,jdm,tz,i,j,k,n,ip,inx,step,dp,ka,kb,state,stxt,rstate,f,havef,C,hasC,CA,hasA,cfr,day,ihw,best,il1,il2,why,iM2,iS2,iK1,iO1,aM2,aS2,aK1,aO1,ff,fi,lag,j0,bi,ai,bt,b1,b2,btz,ra,ans,tag){
  wk_allow("lunar", "date t hwh lwh range sprange nprange brhwh brlwh coef station")
  if(W_ERR!="") return 0
  tab = (wk_has("hwh") || wk_has("lwh") || wk_has("range") || wk_has("sprange") || wk_has("nprange"))
  brs = (wk_has("brhwh") || wk_has("brlwh"))
  typed = (tab || brs)
  if(typed && wk_has("station")) return wk_err("give the heights from the tide table, or station=, not both")
  if(tab){
    if(wk_has("range")){
      if(wk_has("hwh") || wk_has("lwh")) return wk_err("give range=, or hwh= and lwh=, not both")
      rg=wk_num("range","","0","20","today's range at the standard port, m")
    } else {
      hwh=wk_num("hwh","","-5","20","today's high water height at the standard port, m")
      lwh=wk_num("lwh","","-5","20","today's low water height there, m")
      if(W_ERR=="" && hwh<=lwh) return wk_err("hwh= must be above lwh=")
      rg=hwh-lwh
    }
    sp=wk_num("sprange","","0","20","the port's mean spring range, m")
    np=wk_num("nprange","","0","20","the port's mean neap range, m")
    if(W_ERR=="" && sp<=np) return wk_err("sprange= must be larger than nprange=")
  }
  if(brs){
    bh=wk_num("brhwh","","-5","20","Brest's high water height, m")
    bl=wk_num("brlwh","","-5","20","Brest's low water height, m")
    if(W_ERR=="" && bh<=bl) return wk_err("brhwh= must be above brlwh=")
  }
  hasc=wk_has("coef")
  if(hasc) cf=wk_num("coef","","20","120","the coefficient an almanac prints")
  if(W_ERR!="") return 0

  #  A station is used when one is named, or when nothing is typed from
  #  a tide table and one is chosen.  Typed heights never use the chosen
  #  station, so a link that carries them reads the same for everyone.
  id = wk_has("station") ? WA["station"] : (typed ? "" : defstation)
  st = (id!="")
  if(st){
    #  t defaults to noon on a named date, and to now when none is named
    if(!wk_has("t") && wk_has("date")) WA["t"]="12:00"
    if(!wk_station()) return 0
    tz=TD_TZ/1440.0; jdt=WS_JDT; tm=WS_T; jdm=WS_JD0
    wk_head("SPRINGS AND NEAPS, AT A STATION")
    wk_sthead()
  } else {
    if(wk_has("date")){
      if(!wk_date(WA["date"])) return wk_err(sprintf("date=%s is not a date (YYYY-MM-DD)", WA["date"]))
    } else if(nowdate=="" || !wk_date(nowdate)) return wk_err("date= is needed (YYYY-MM-DD)")
    if(wk_has("t")){
      tm=wk_hm(WA["t"])
      if(tm<0) return wk_err(sprintf("t=%s is not a time (HH:MM)", WA["t"]))
    } else if(!wk_has("date") && nowtime!=""){
      split(nowtime,NT_,":"); tm=(NT_[1]+0)*60+(NT_[2]+0)
    } else tm=720
    tz=0; jdm=jdate(WD_Y,WD_M,WD_D); jdt=jdm+tm/1440.0
    wk_head(typed ? "SPRINGS AND NEAPS, FROM THE MOON AND THE TIDE TABLES" : "SPRINGS AND NEAPS, FROM THE MOON")
    wl("  " cwd(sprintf("%04d-%02d-%02d at %s UT", WD_Y, WD_M, WD_D, wk_hhmm(tm))))
  }

  # ---- 1. the Moon ---------------------------------------------------
  moon_phase(jdt)
  wk_levents(jdt-17.5, jdt+16.5)
  ip=0
  for(i=1;i<=LE_N;i++) if(LE_T[i]<=jdt) ip=i
  inx=ip+1
  if(ip<2 || inx>LE_N) return wk_err("the Moon's phases could not be found round that date")
  day=wk_ldate(jdt+tz)
  wl("")
  wl(sprintf("  1  The Moon: %s days old (%s)", wk_f(MP_AGE,1), MP_NAME))
  wl(sprintf("     %-14s %s, about %s, %s days ago", wk_lname(LE_Q[ip]), wk_lhdate(LE_T[ip]+tz), wk_lhclk(LE_T[ip]+tz), wk_f(jdt-LE_T[ip],1)))
  wl(sprintf("     %-14s %s, about %s, in %s days", wk_lname(LE_Q[inx]), wk_lhdate(LE_T[inx]+tz), wk_lhclk(LE_T[inx]+tz), wk_f(LE_T[inx]-jdt,1)))

  # ---- 2. the rule of thumb ------------------------------------------
  wl("")
  wl("  2  The rule of thumb: springs follow new and full moon by a day or two,")
  wl("     and neaps follow the quarters the same way")
  wl(sprintf("     %-8s about %s   (%s + 1 to 2 days)", wk_lkind(LE_Q[ip]), wk_lband(LE_T[ip]+tz), wk_lname(LE_Q[ip])))
  wl(sprintf("     %-8s about %s   (%s + 1 to 2 days)", wk_lkind(LE_Q[inx]), wk_lband(LE_T[inx]+tz), wk_lname(LE_Q[inx])))
  dp=jdt-LE_T[ip]
  if(dp>=1 && dp<=2){
    state=wk_lkind(LE_Q[ip]); stxt="at " state " by the rule"
    wl(sprintf("     %s is at %s by the rule", day, state))
  } else {
    if(dp<1){ ka=wk_lkind(LE_Q[ip-1]); kb=wk_lkind(LE_Q[ip]) }
    else    { ka=wk_lkind(LE_Q[ip]);   kb=wk_lkind(LE_Q[inx]) }
    if(kb=="springs"){ state="making"; stxt="making" } else { state="takingoff"; stxt="taking off" }
    wl(sprintf("     %s is after %s and before %s: the tides are %s", day, ka, kb, stxt))
  }
  wl("     " cwd("a rule of thumb: any one spring can come two or three days off it"))
  rstate=state
  WR["age"]=MP_AGE; WR["pq"]=LE_Q[ip]; WR["nq"]=LE_Q[inx]
  WR["ph"]=wk_lH(LE_T[ip]+tz)-wk_lH(jdm); WR["nh"]=wk_lH(LE_T[inx]+tz)-wk_lH(jdm)
  WR["rstate"]=rstate; WR["tmin"]=tm
  step=2; havef=0; hasC=0; hasA=0
  for(k=1;k<=LE_N;k++) LG_F[k]=0

  # ---- the tide tables, typed ------------------------------------------
  if(tab){
    step++
    wl("")
    if(wk_has("range")) wl(sprintf("  %d  The tide tables: today's range %s m", step, wk_f(rg,2)))
    else wl(sprintf("  %d  The tide tables: HW %s m - LW %s m = %s m of range", step, wk_f(hwh,2), wk_f(lwh,2), wk_f(rg,2)))
    wl(sprintf("     the port's mean ranges: springs %s m, neaps %s m", wk_f(sp,2), wk_f(np,2)))
    f=(rg-np)/(sp-np)
    wk_lplace(rg,np,sp,f)
    wl("     " cwd("the rate of a stream today, with the atlas's two figures for spr= and nps=:"))
    wl("     " cwd(sprintf("  tides work stream spr=.. nps=.. range=%s sprange=%s nprange=%s", wk_f(rg,2), wk_f(sp,2), wk_f(np,2))))
    WR["range"]=rg; WR["f"]=f; havef=1
  }
  # ---- the coefficient, from typed Brest heights --------------------
  if(brs){
    step++
    rb=wk_r2(bh-bl); C=int(100*rb/6.10+0.5); cfr=(C-45)/50; hasC=1
    wl("")
    wl(sprintf("  %d  The coefficient, from Brest's heights: HW %s m - LW %s m = %s m", step, wk_f(bh,2), wk_f(bl,2), wk_f(rb,2)))
    wl(sprintf("     coefficient = 100 x %s / 6.10 = %s", wk_f(rb,2), cw(C "", C_ACC)))
    wl(sprintf("     45 is mean neaps and 95 mean springs: (%d - 45) / 50 = %s of the way", C, wk_f(cfr,2)))
    wl("     " cwd("worked from the tide table's heights. An almanac's printed figure can"))
    wl("     " cwd("differ by a few points: it leaves out the part of the tide that comes"))
    wl("     " cwd("once a day"))
    WR["coef"]=C; WR["cf"]=cfr; WR["brange"]=rb
  }

  if(st){
    # ---- 3. the tide here -----------------------------------------------
    ihw=0; best=1e9
    for(i=1;i<=WT_N;i++) if(WT_K[i]=="H" && fabs(WT_M[i]-WS_T)<best){ best=fabs(WT_M[i]-WS_T); ihw=i }
    il1=0; il2=0
    if(ihw){
      for(i=ihw-1;i>=1;i--) if(WT_K[i]=="L"){ il1=i; break }
      for(i=ihw+1;i<=WT_N;i++) if(WT_K[i]=="L"){ il2=i; break }
    }
    if(!ihw || !il1 || !il2) return wk_err("no high water with a low water either side of it near that time at this station")
    rg=wk_r2(WT_H[ihw]-(WT_H[il1]+WT_H[il2])/2)
    step++
    wl("")
    wl(sprintf("  %d  The tide here: HW %s  %s m, the high water nearest %s", step, wk_hhmm(WT_M[ihw]), wk_f(WT_H[ihw],2), wk_hhmm(WS_T)))
    wl(sprintf("     LW %s  %s m before it, LW %s  %s m after it", wk_hhmm(WT_M[il1]), wk_f(WT_H[il1],2), wk_hhmm(WT_M[il2]), wk_f(WT_H[il2],2)))
    wl(sprintf("     range = %s - (%s + %s) / 2 = %s m", wk_f(WT_H[ihw],2), wk_f(WT_H[il1],2), wk_f(WT_H[il2],2), cw(wk_f(rg,2), C_ACC)))
    why=""
    if(TD_KIND=="S") why="a secondary port carries no constants of its own"
    else {
      iM2=CIDX["M2"]; iS2=CIDX["S2"]; iK1=CIDX["K1"]; iO1=CIDX["O1"]
      aM2=0; aS2=0; aK1=0; aO1=0
      for(i=1;i<=ST_N;i++){
        if(ST_C[i]==iM2) aM2=ST_A[i]
        if(ST_C[i]==iS2) aS2=ST_A[i]
        if(ST_C[i]==iK1) aK1=ST_A[i]
        if(ST_C[i]==iO1) aO1=ST_A[i]
      }
      if(aM2<=0 || aS2<=0) why="this station has no M2 or no S2"
      else {
        ff=(aK1+aO1)/(aM2+aS2)
        if(ff>0.25) why=sprintf("the tide is mixed or diurnal (form factor %s)", wk_f(ff,2))
      }
    }
    WR["range"]=rg
    if(why!=""){
      wl("     mean ranges are not available here: " why)
      WR["means"]=0
    } else {
      sp=2*(aM2+aS2); np=2*(aM2-aS2)
      wl(sprintf("     mean ranges from the constants: springs 2 x (M2 + S2) = %s m,", wk_f(sp,2)))
      wl(sprintf("     neaps 2 x (M2 - S2) = %s m", wk_f(np,2)))
      f=(rg-np)/(sp-np)
      wk_lplace(rg,np,sp,f)
      havef=1; WR["means"]=1; WR["f"]=f; WR["sprange"]=sp; WR["nprange"]=np
    }

    # ---- 4. found, in the prediction -------------------------------------
    n=tide_table(jdt-17.5, jdt+17.5)
    LR_N=0
    for(i=2;i<n;i++) if(HL_K[i]=="H" && HL_K[i-1]=="L" && HL_K[i+1]=="L"){
      LR_N++; LR_T[LR_N]=HL_T[i]
      LR_R[LR_N]=HL_H[i]-(HL_H[i-1]+HL_H[i+1])/2
      LR_P[LR_N]=wk_r2(wk_r2(HL_H[i])-(wk_r2(HL_H[i-1])+wk_r2(HL_H[i+1]))/2)
    }
    step++
    wl("")
    wl(sprintf("  %d  Found here, in the prediction: the tides either side of the day", step))
    for(k=1;k<=LE_N;k++){
      fi=wk_lfound(LE_T[k], wk_lkind(LE_Q[k]))
      if(fi) LG_F[k]=LR_T[fi]
      if(k!=ip && k!=inx) continue
      tag=(k==ip) ? "p" : "n"
      if(!fi){
        wl(sprintf("     %-8s not found near the %s", wk_lkind(LE_Q[k]), wk_lname(LE_Q[k])))
        continue
      }
      lag=LR_T[fi]-LE_T[k]
      wl(sprintf("     %-8s %s %s   range %s m, %s days %s the %s", wk_lkind(LE_Q[k]), wk_ldate(LR_T[fi]+tz), wk_lclk(LR_T[fi]+tz),
         wk_f(LR_P[fi],2), wk_f(fabs(lag),1), (lag<0) ? "before" : "after", wk_lname(LE_Q[k])))
      if(lag<0.95) wl(sprintf("              %s days before the rule's %s", wk_f(1-lag,1), wk_lband(LE_T[k]+tz)))
      else if(lag>2.05) wl(sprintf("              %s days after the rule's %s", wk_f(lag-2,1), wk_lband(LE_T[k]+tz)))
      else wl(sprintf("              inside the rule's %s", wk_lband(LE_T[k]+tz)))
      WR["f" tag "m"]=wk_lM(LR_T[fi]+tz)-wk_lM(jdm); WR["f" tag "r"]=LR_P[fi]; WR["f" tag "lag"]=lag
    }
    #  which way the tides are going here: the tide of the day against
    #  the one two tides on, which is the same tide of the next day
    j0=0; best=1e9
    for(j=1;j<=LR_N;j++) if(fabs(LR_T[j]-WT_JD[ihw])<best){ best=fabs(LR_T[j]-WT_JD[ihw]); j0=j }
    if(j0 && j0+2<=LR_N){
      if(LR_P[j0+2]>rg){ state="making"; stxt="making" }
      else if(LR_P[j0+2]<rg){ state="takingoff"; stxt="taking off" }
      else { state="level"; stxt="neither making nor taking off" }
      wl(sprintf("     here the tides are %s: %s m today, %s m two tides on", stxt, wk_f(rg,2), wk_f(LR_P[j0+2],2)))
    }

    # ---- 5. the coefficient, which is Brest's -----------------------------
    step++
    wl("")
    wl(sprintf("  %d  The coefficient. It is Brest's by definition, so Brest is predicted", step))
    if(!tide_open(SF, wk_lbrest(), jdt)) wl("     Brest's record is not in this station file, so there is no coefficient")
    else {
      btz=TD_TZ/1440.0
      n=tide_hilo(jdt-1.5, jdt+1.5)
      bi=0; best=1e9
      for(i=2;i<n;i++) if(HL_K[i]=="H" && HL_K[i-1]=="L" && HL_K[i+1]=="L" && fabs(HL_T[i]-jdt)<best){ best=fabs(HL_T[i]-jdt); bi=i }
      if(!bi) wl("     no high water was found at Brest near that time")
      else {
        bt=HL_T[bi]; bh=wk_r2(HL_H[bi]); b1=wk_r2(HL_H[bi-1]); b2=wk_r2(HL_H[bi+1])
        rb=wk_r2(bh-(b1+b2)/2); C=int(100*rb/6.10+0.5); cfr=(C-45)/50; hasC=1
        wl(sprintf("     HW Brest %s %s  %s m, in Brest's standard time", wk_ldate(bt+btz), wk_lclk(bt+btz), wk_f(bh,2)))
        wl(sprintf("     LW %s m before it, LW %s m after it", wk_f(b1,2), wk_f(b2,2)))
        wl(sprintf("     range = %s - (%s + %s) / 2 = %s m", wk_f(bh,2), wk_f(b1,2), wk_f(b2,2), wk_f(rb,2)))
        wl(sprintf("     by pencil:      100 x %s / 6.10 = %s", wk_f(rb,2), cw(C "", C_ACC)))
        #  the twice-a-day part alone: every constituent whose speed is
        #  not between 1.7 and 2.2 cycles a day is left out
        for(i=1;i<=ST_N;i++) if(CW_[ST_C[i]]<1.7 || CW_[ST_C[i]]>2.2) ST_F[i]=0
        n=tide_hilo(jdt-1.5, jdt+1.5)
        ai=0; best=1e9
        for(i=2;i<n;i++) if(HL_K[i]=="H" && HL_K[i-1]=="L" && HL_K[i+1]=="L" && fabs(HL_T[i]-bt)<best){ best=fabs(HL_T[i]-bt); ai=i }
        if(ai){
          ra=wk_r2(wk_r2(HL_H[ai])-(wk_r2(HL_H[ai-1])+wk_r2(HL_H[ai+1]))/2); CA=int(100*ra/6.10+0.5); hasA=1
          wl(sprintf("     the almanac's:  100 x %s / 6.10 = %d", wk_f(ra,2), CA))
          wl("                     (the twice-a-day part of the tide alone)")
          wl("     " cwd("that figure matched the published one to within 2 on the month it was"))
          wl("     " cwd("checked. The two differ because the part of the tide that comes once a"))
          wl("     " cwd("day makes one tide of each day bigger than the other, and the almanac"))
          wl("     " cwd("leaves it out"))
          WR["acoef"]=CA; WR["arange"]=ra
        }
        wl(sprintf("     45 is mean neaps and 95 mean springs: (%d - 45) / 50 = %s of the way", C, wk_f(cfr,2)))
        WR["coef"]=C; WR["cf"]=cfr; WR["brange"]=rb
      }
    }
  }
  WR["state"]=state
  if(hasc){
    wl("")
    wl("  " cwd(sprintf("coef=%s is noted. lunar does not use it yet", WA["coef"])))
    WR["coefin"]=cf
  }
  LG_JD=jdt; LG_TZ=tz; LG_ST=st
  wl("@@FIG")
  ans="ANSWER   " stxt
  if(!st && !typed) ans=ans ": " wk_lkind(LE_Q[ip]) " about " wk_lband(LE_T[ip]+tz) ", " wk_lkind(LE_Q[inx]) " about " wk_lband(LE_T[inx]+tz)
  if(st || tab){
    ans=ans "    range " wk_f(rg,2) " m"
    if(havef) ans=ans ", " wk_f(f,2) " from neaps to springs"
  }
  if(hasC) ans=ans "    coefficient " C
  if(hasA) ans=ans ", almanac " CA
  wl("  " ans)
  wk_rule()
  return 1
}
#  The Moon's month as a strip, thirty days with the day in the middle.
function wk_lcol(jd,   c){
  if(jd<LG_JD-15) return -1
  c=int((jd-(LG_JD-15))/30*56)
  return (c>55) ? -1 : c
}
function wk_figlunar(   n,i,k,c,m,ph,rl,fd,dy,a,b,d,e){
  n=56
  for(i=0;i<n;i++){ ph[i]=" "; rl[i]="."; fd[i]=" "; dy[i]=" " }
  for(k=1;k<=LE_N;k++){
    c=wk_lcol(LE_T[k])
    if(c>=0) ph[c]=(LE_Q[k]==0) ? "N" : ((LE_Q[k]==180) ? "F" : "Q")
    for(i=0;i<n;i++){
      m=LG_JD-15+(i+0.5)*30/n
      if(m>=LE_T[k]+1 && m<LE_T[k]+2) rl[i]=(wk_lkind(LE_Q[k])=="springs") ? "=" : "-"
    }
    if(LG_F[k]>0){ c=wk_lcol(LG_F[k]); if(c>=0) fd[c]=(wk_lkind(LE_Q[k])=="springs") ? "S" : "n" }
  }
  dy[28]="t"
  a=""; b=""; d=""; e=""
  for(i=0;i<n;i++){ a=a ph[i]; b=b rl[i]; d=d fd[i]; e=e dy[i] }
  print ""
  printf "     %s\n", cw(a, C_HDR)
  printf "     %s\n", cw(b, C_ACC)
  if(LG_ST) printf "     %s\n", cw(d, C_HDR)
  printf "     %s\n", cw(e, C_HDR)
  printf "     %-25s%-6s%25s\n", wk_ldate(LG_JD-15+LG_TZ), wk_ldate(LG_JD+LG_TZ), wk_ldate(LG_JD+15+LG_TZ)
  printf "  %s\n", cwd("N new moon   F full moon   Q a quarter   t the day")
  printf "  %s\n", cwd("= springs by the rule   - neaps by the rule")
  if(LG_ST) printf "  %s\n", cwd("S the biggest tide found   n the smallest")
  return 0
}

# =====================================================================
#  The list, with an example of each.  WORK.md carries the same six
#  examples and tests/run-tests.sh checks that it still does.
# =====================================================================
# =====================================================================
#  9.  DEPTH OVER A SHOAL, AND THE WINDOW TO CROSS IT  (board item B11)
# =====================================================================
#  Larry's rulings, 16 November 2026:
#    AGT  both questions in one working: the depth at a time, and the
#         window with enough water
#    AGV  the shoal is depth= (a charted depth) or dries= (a drying
#         height), exactly one, so no minus sign can be forgotten
#    AHC  two forms, typed turns and a station
#    AHF  typed: lw lwh hw hwh give one edge of the window; lw2 lw2h as
#         well give both
#    AHI  the twelfths and the cosine curve side by side, and at a
#         station the prediction itself as the third
#    AHK  the answer is what every method agrees on: the latest opening,
#         the earliest shutting, the least depth
#
#  The turns are DT_T[] (minutes), DT_H[], DT_K[], DT_N of them: two for
#  one tide, three for low water, high water, low water.
#  The height she needs is a sum of figures typed to the centimetre, and
#  such a sum can come out a hair over: 0.1 + 0.2 is 0.30000000000000004.
#  Without the hair's allowance a tide that reaches 0.30 m exactly would
#  be called "never".  Found by a planted fault the checks did not catch.
function wk_dstate(h1,h2,need){
  if(h2>=h1){ if(need<=h1+1e-9) return "always"; if(need>h2+1e-9) return "never" }
  else      { if(need<=h2+1e-9) return "always"; if(need>h1+1e-9) return "never" }
  return "edge"
}
#  One tide, turn to turn: when the height wanted is reached, by the
#  twelfths and by the cosine curve.  Fills DE_ST[n], DE_12[n], DE_C[n].
function wk_dedge(n,step,t1,h1,k1,t2,h2,k2,need,   D,R,st,p,c,i,ix,fr,cum,stp,hA,hB,tA,tB,rise,ca,A,f){
  D=t2-t1; R=h2-h1; rise=(R>=0)
  split("1 2 3 3 2 1",stp," "); split("0 1 3 6 9 11 12",cum," ")
  wl("")
  wl(sprintf("  %d  The %s tide, %s %s to %s %s: when it %s %s m", step, rise?"rising":"falling",
     wk_kname(k1), wk_hhmm(t1), wk_kname(k2), wk_hhmm(t2), rise?"reaches":"falls to", wk_f(need,2)))
  st=wk_dstate(h1,h2,need); DE_ST[n]=st
  if(st=="never"){
    wl(sprintf("     HW is %s m and she needs %s m: never enough water on this tide", wk_f(rise?h2:h1,2), wk_f(need,2)))
    return st
  }
  if(st=="always"){
    wl(sprintf("     LW is %s m and she needs %s m: enough water all through this tide", wk_f(rise?h1:h2,2), wk_f(need,2)))
    return st
  }
  wl(sprintf("     range %s m over %s, so a tidal hour here is %s", wk_f(fabs(R),2), wk_dur(D), wk_dur(D/6)))
  if(D<240 || D>480) wl("     " cwd(sprintf("the rule assumes about six hours from turn to turn; this one is %s", wk_dur(D))))
  wl("")
  wl("     By the twelfths")
  wl("       hour  time     so far    height")
  for(i=0;i<=6;i++) wl(sprintf("         %d   %s    %2d/12   %6s m", i, wk_hhmm(t1+i*D/6.0), cum[i+1], wk_f(h1+R*cum[i+1]/12.0,2)))
  p=(need-h1)/R; if(p<0) p=0; if(p>1) p=1
  c=12*p
  for(i=1;i<=6;i++) if(c<=cum[i+1]+1e-9) break
  if(i>6) i=6
  ix=i-1; fr=(c-cum[i])/stp[i]
  hA=h1+R*cum[i]/12.0; hB=h1+R*cum[i+1]/12.0; tA=t1+ix*D/6.0; tB=t1+i*D/6.0
  DE_12[n]=tA+fr*D/6.0
  wl(sprintf("       %s m comes in hour %d, between %s m at %s and %s m at %s",
     wk_f(need,2), i, wk_f(hA,2), wk_hhmm(tA), wk_f(hB,2), wk_hhmm(tB)))
  if(rise) wl(sprintf("       (%s - %s) / (%s - %s) = %s of the hour = %s, so %s",
     wk_f(need,2), wk_f(hA,2), wk_f(hB,2), wk_f(hA,2), wk_f(fr,2), wk_dur(fr*D/6.0), cw(wk_hhmm(DE_12[n]), C_ACC)))
  else     wl(sprintf("       (%s - %s) / (%s - %s) = %s of the hour = %s, so %s",
     wk_f(hA,2), wk_f(need,2), wk_f(hA,2), wk_f(hB,2), wk_f(fr,2), wk_dur(fr*D/6.0), cw(wk_hhmm(DE_12[n]), C_ACC)))
  ca=2*p-1; A=270+asind(ca); f=A/180.0-1
  DE_C[n]=t1+f*D
  wl("")
  wl("     By the cosine curve, turned round to give the time")
  wl(sprintf("       (cos A + 1)/2 = (%s - %s) / (%s) = %s of the way from %s to %s",
     wk_f(need,2), wk_f(h1,2), wk_f(R,2), wk_f(p,3), wk_kname(k1), wk_kname(k2)))
  wl(sprintf("       cos A = %s, A = %s deg, fraction of the time = A/180 - 1 = %s", wk_f(ca,3), wk_f(A,1), wk_f(f,3)))
  wl(sprintf("       %s of %s = %s after %s, so %s", wk_f(f,3), wk_dur(D), wk_dur(f*D), wk_kname(k1), cw(wk_hhmm(DE_C[n]), C_ACC)))
  return st
}
#  the height at a time between two turns, by both rules
function wk_dh(t1,h1,t2,h2,t,   D,R,x,ix,fr,cum,stp){
  D=t2-t1; R=h2-h1
  split("1 2 3 3 2 1",stp," "); split("0 1 3 6 9 11 12",cum," ")
  x=(t-t1)/(D/6.0); ix=int(x); if(ix>5) ix=5; fr=x-ix
  DH_12=h1+R*(cum[ix+1]+fr*stp[ix+1])/12.0
  DH_C=h1+R*(cosd(180.0*((t-t1)/D+1))+1)/2.0
  return 0
}
#  the prediction's own crossing of a height between two turns
function wk_dharm(n,ja,jb,need,   ha,hb,i,jm,hm){
  ha=tide_height(ja); hb=tide_height(jb)
  DE_ST[n]=wk_dstate(ha,hb,need)
  if(DE_ST[n]!="edge") return 0
  for(i=0;i<40;i++){
    jm=(ja+jb)/2; hm=tide_height(jm)
    if((hm>=need)==(ha>=need)){ ja=jm; ha=hm } else jb=jm
  }
  DE_H[n]=((ja+jb)/2-WS_JDA)*1440
  return 1
}
#  the water over the shoal for a height of tide, and what to call it
function wk_dwater(h){ return DZ_DRY ? h-DZ_V : h+DZ_V }
function wk_dline(lab,h,   w,u,s){
  w=wk_dwater(h); u=w-DZ_DG
  s=sprintf("     %-10s height %s m %s %s m = ", lab, wk_f(h,2), DZ_DRY?"-":"+", wk_f(DZ_V,2))
  if(w<0) return s sprintf("%s m: the bank stands %s m out of the water", wk_f(w,2), wk_f(-w,2))
  if(u<0) return s sprintf("%s m of water: she is aground by %s m", wk_f(w,2), wk_f(-u,2))
  return s sprintf("%s m of water, %s m under the keel", wk_f(w,2), wk_f(u,2))
}
function wk_depth(   manual,six,lwm,lwh,hwm,hwh,l2m,l2h,d,d2,tt,hast,need,i,ip,inx,iL,st,step,nm,
                     o,s,never,oa,sa,ot,stt,m,lab,least,w,u,what,hv,ans,ans2){
  manual = wk_has("lw") || wk_has("hw") || wk_has("lwh") || wk_has("hwh") || wk_has("lw2") || wk_has("lw2h")
  if(manual) wk_allow("depth", "depth dries draught clear lw lwh hw hwh lw2 lw2h t")
  else       wk_allow("depth", "depth dries draught clear station date t")
  if(W_ERR!="") return 0
  if(wk_has("depth") && wk_has("dries")) return wk_err("give depth= (a charted depth) or dries= (a drying height), not both")
  if(!wk_has("depth") && !wk_has("dries")) return wk_err("depth= or dries= is needed (the charted depth, or the drying height, m)")
  DZ_DRY = wk_has("dries")
  if(DZ_DRY) DZ_V=wk_num("dries","","0","15","the drying height, m: the underlined figure on the chart")
  else       DZ_V=wk_num("depth","","0","100","the charted depth, m")
  DZ_DG=wk_num("draught","","0.1","20","her draught, m")
  DZ_CL=wk_num("clear","","0","20","the clearance wanted under the keel, m; 0 for the moment she touches")
  if(W_ERR!="") return 0
  need = DZ_DRY ? DZ_DG+DZ_CL+DZ_V : DZ_DG+DZ_CL-DZ_V
  hast=0
  if(manual){
    lwm=wk_time("lw","time of low water"); lwh=wk_num("lwh","","-20","30","height of low water, m")
    hwm=wk_time("hw","time of high water"); hwh=wk_num("hwh","","-20","30","height of high water, m")
    six = wk_has("lw2") || wk_has("lw2h")
    if(six){ l2m=wk_time("lw2","time of the low water after high water"); l2h=wk_num("lw2h","","-20","30","height of the low water after high water, m") }
    if(wk_has("t")){ tt=wk_time("t","the time you want the depth for"); hast=1 }
    if(W_ERR!="") return 0
    if(hwh<=lwh) return wk_err("hwh= must be higher than lwh=")
    if(lwm==hwm) return wk_err("lw= and hw= are the same time")
    d = wk_mod(hwm-lwm,1440)
    if(six){
      if(d>720) return wk_err("with lw2=, lw= is the low water before high water and lw2= the one after")
      if(hwh<=l2h) return wk_err("hwh= must be higher than lw2h=")
      d2 = wk_mod(l2m-hwm,1440)
      if(d2==0 || d2>720) return wk_err("lw2= must be the low water after hw=, less than twelve hours on")
      DT_N=3; DT_T[1]=lwm; DT_H[1]=lwh; DT_K[1]="L"; DT_T[2]=lwm+d; DT_H[2]=hwh; DT_K[2]="H"
      DT_T[3]=lwm+d+d2; DT_H[3]=l2h; DT_K[3]="L"
    } else if(d<=720){
      DT_N=2; DT_T[1]=lwm; DT_H[1]=lwh; DT_K[1]="L"; DT_T[2]=lwm+d; DT_H[2]=hwh; DT_K[2]="H"
    } else {
      DT_N=2; DT_T[1]=hwm; DT_H[1]=hwh; DT_K[1]="H"; DT_T[2]=hwm+(1440-d); DT_H[2]=lwh; DT_K[2]="L"
    }
    if(hast){
      tt = DT_T[1] + wk_mod(tt-DT_T[1],1440)
      if(tt>DT_T[DT_N]) return wk_err(sprintf("t=%s is not between the turns given (%s and %s)", WA["t"], wk_hhmm(DT_T[1]), wk_hhmm(DT_T[DT_N])))
    }
    nm=2
    wk_head("DEPTH OVER A SHOAL, AND THE WINDOW TO CROSS IT")
  } else {
    if(!wk_station()) return 0
    ip=0; inx=0
    for(i=1;i<=WT_N;i++){ if(WT_JD[i]<=WS_JDT) ip=i; else if(!inx) inx=i }
    if(!ip || !inx) return wk_err("no turn of the tide either side of that time")
    iL = (WT_K[ip]=="L") ? ip : ip-1
    if(iL<1 || iL+2>WT_N || WT_K[iL]!="L" || WT_K[iL+1]!="H" || WT_K[iL+2]!="L")
      return wk_err(sprintf("no low water, high water and low water in turn round %s", wk_hhmm(WS_T)))
    DT_N=3
    for(i=1;i<=3;i++){ DT_T[i]=WT_M[iL+i-1]; DT_H[i]=WT_H[iL+i-1]; DT_K[i]=WT_K[iL+i-1]; DT_JD[i]=WT_JD[iL+i-1] }
    tt=WS_T; hast=1
    if(tt<DT_T[1]) tt=DT_T[1]
    if(tt>DT_T[3]) tt=DT_T[3]
    nm=3
    wk_head("DEPTH OVER A SHOAL, AND THE WINDOW TO CROSS IT")
    wk_sthead()
    st=zero_kind(TD_ZID,TD_DATUM)
    if(st=="msl"){
      wl("  " cwd("heights here are above mean sea level, not chart datum: this sum"))
      wl("  " cwd("leaves out the mean level above chart datum, so it is not a depth"))
    } else if(st!="chart"){
      wl("  " cwd("the zero here is computed, not chart datum: against the chart this"))
      wl("  " cwd("sum can be more than half a metre out, either way"))
    }
    wl("")
  }
  if(DZ_DRY) wl(sprintf("  a bank that dries %s m: it stands %s m above chart datum", wk_f(DZ_V,2), wk_f(DZ_V,2)))
  else       wl(sprintf("  charted depth %s m: the sea bed is %s m below chart datum", wk_f(DZ_V,2), wk_f(DZ_V,2)))
  wl(sprintf("  her draught %s m, and %s m wanted under the keel", wk_f(DZ_DG,2), wk_f(DZ_CL,2)))
  wl("")
  wl("  1  The height of tide she needs")
  if(DZ_DRY) wl(sprintf("     draught %s + clearance %s + drying height %s = %s m",
                wk_f(DZ_DG,2), wk_f(DZ_CL,2), wk_f(DZ_V,2), cw(wk_f(need,2), C_ACC)))
  else       wl(sprintf("     draught %s + clearance %s - charted depth %s = %s m",
                wk_f(DZ_DG,2), wk_f(DZ_CL,2), wk_f(DZ_V,2), cw(wk_f(need,2), C_ACC)))
  wl("")
  wl("  2  The tide" (manual ? "" : ", from the prediction: the turns either side of " wk_hhmm(WS_T)))
  s="    "
  for(i=1;i<=DT_N;i++) s = s sprintf(" %s %s  %s m  ", wk_kname(DT_K[i]), wk_hhmm(DT_T[i]), wk_f(DT_H[i],2))
  wl(s)
  step=2
  for(i=1;i<DT_N;i++){ step++; wk_dedge(i,step,DT_T[i],DT_H[i],DT_K[i],DT_T[i+1],DT_H[i+1],DT_K[i+1],need) }
  #  the methods, each with its own state and time for each tide
  for(i=1;i<DT_N;i++){
    DM_ST[1,i]=DE_ST[i]; DM_T[1,i]=DE_12[i]
    DM_ST[2,i]=DE_ST[i]; DM_T[2,i]=DE_C[i]
  }
  DM_NAME[1]="twelfths"; DM_NAME[2]="cosine"; DM_NAME[3]="prediction"
  if(!manual){
    step++
    wl("")
    wl(sprintf("  %d  The prediction itself, the sum of every constituent", step))
    for(i=1;i<DT_N;i++){
      wk_dharm(i,DT_JD[i],DT_JD[i+1],need)
      DM_ST[3,i]=DE_ST[i]; DM_T[3,i]=DE_H[i]
      if(DE_ST[i]=="edge") wl(sprintf("     %s %s m at %s", (DT_K[i]=="L")?"reaches":"falls to", wk_f(need,2), cw(wk_hhmm(DE_H[i]), C_ACC)))
      else if(DE_ST[i]=="never") wl("     never reaches it on this tide")
      else wl(sprintf("     is at or above it all through the %s tide", (DT_K[i]=="L")?"rising":"falling"))
    }
    wl("     " cwd("It carries the shape a real tide has: a stand, a fast flood, a double"))
    wl("     " cwd("high water. The two rules cannot, and are furthest out where it does."))
  }
  #  the depth at her time
  if(hast){
    step++
    i = (DT_N==3 && tt>DT_T[2]) ? 2 : 1
    wk_dh(DT_T[i],DT_H[i],DT_T[i+1],DT_H[i+1],tt)
    wl("")
    wl(sprintf("  %d  The depth at %s", step, wk_hhmm(manual?tt:WS_T)))
    wl(wk_dline("twelfths", DH_12))
    wl(wk_dline("cosine", DH_C))
    least = (DH_12<DH_C) ? DH_12 : DH_C
    if(!manual){ hv=tide_height(WS_JDT); wl(wk_dline("prediction", hv)); if(hv<least) least=hv; WR["hharm"]=hv }
    WR["h12"]=DH_12; WR["hcos"]=DH_C
  }
  if(manual){
    wl("")
    wl("  " cwd("Both rules assume a regular tide, about six hours from turn to turn. Where"))
    wl("  " cwd("it stands or has a double high water, as in the Solent, work it at a"))
    wl("  " cwd("station (station=) or from the port's own curve."))
  }
  #  what every method agrees on (AHK)
  never=0
  for(m=1;m<=nm;m++) for(i=1;i<DT_N;i++) if(DM_ST[m,i]=="never") never=1
  WR["need"]=need; WR["never"]=never
  DF_NEED=need; DF_HASO=0; DF_HASS=0; DF_ST=!manual; DF_HAST=hast; DF_T=tt
  what = (nm==3) ? "by all three methods" : "by both methods"
  if(never) ans = "never enough water on this tide: high water is below the " wk_f(need,2) " m she needs"
  else {
    #  the opening is on a rising tide, the shutting on a falling one
    o=0; s=0
    for(i=1;i<DT_N;i++){ if(DT_K[i]=="L") o=i; else s=i }
    oa=1; ot=-1e9; sa=1; stt=1e9
    for(m=1;m<=nm;m++){
      if(o && DM_ST[m,o]=="edge"){ oa=0; if(DM_T[m,o]>ot) ot=DM_T[m,o] }
      if(s && DM_ST[m,s]=="edge"){ sa=0; if(DM_T[m,s]<stt) stt=DM_T[m,s] }
    }
    #  each method's own times, above the answer
    step++
    wl("")
    wl(sprintf("  %d  The window, method by method", step))
    for(m=1;m<=nm;m++){
      lab=sprintf("     %-10s", DM_NAME[m])
      if(o) lab = lab ((DM_ST[m,o]=="edge") ? "  opens " wk_hhmm(DM_T[m,o]) : "  open from low water")
      if(s) lab = lab ((DM_ST[m,s]=="edge") ? "  shuts " wk_hhmm(DM_T[m,s]) : "  open to low water")
      wl(lab)
    }
    if(o && !oa){ WR["open"]=ot; DF_HASO=1; DF_O=ot }
    if(s && !sa){ WR["shut"]=stt; DF_HASS=1; DF_S=stt }
    #  each method's own edge, for the checks
    if(o && DM_ST[1,o]=="edge"){ WR["o12"]=DM_T[1,o]; WR["oc"]=DM_T[2,o] }
    if(s && DM_ST[1,s]=="edge"){ WR["s12"]=DM_T[1,s]; WR["sc"]=DM_T[2,s] }
    if(nm==3 && o && DM_ST[3,o]=="edge") WR["oh"]=DM_T[3,o]
    if(nm==3 && s && DM_ST[3,s]=="edge") WR["sh"]=DM_T[3,s]
    if(o && s){
      if(oa && sa) ans=sprintf("%s, enough water all through, LW %s to LW %s", what, wk_hhmm(DT_T[1]), wk_hhmm(DT_T[3]))
      else if(oa)  ans=sprintf("%s, enough water from LW %s until %s", what, wk_hhmm(DT_T[1]), wk_hhmm(stt))
      else if(sa)  ans=sprintf("%s, enough water from %s, and still at LW %s", what, wk_hhmm(ot), wk_hhmm(DT_T[3]))
      else         ans=sprintf("%s, enough water from %s to %s", what, wk_hhmm(ot), wk_hhmm(stt))
    } else if(o){
      if(oa) ans=sprintf("%s, enough water all through this rising tide", what)
      else   ans=sprintf("%s, enough water from %s, through HW %s", what, wk_hhmm(ot), wk_hhmm(DT_T[2]))
      ans2="when it shuts is on the falling tide: give lw2= and lw2h= for that"
    } else {
      if(sa) ans=sprintf("%s, enough water all through this falling tide", what)
      else   ans=sprintf("%s, enough water from HW %s until %s", what, wk_hhmm(DT_T[1]), wk_hhmm(stt))
    }
  }
  wl("@@FIG")
  wl("  ANSWER   " ans)
  if(ans2!="") wl("           " ans2)
  if(hast){
    w=wk_dwater(least); u=w-DZ_DG
    WR["water"]=w; WR["under"]=u
    if(w<0)      wl(sprintf("           at %s the bank stands at least %s m out of the water", wk_hhmm(manual?tt:WS_T), wk_f(-w,2)))
    else if(u<0) wl(sprintf("           at %s, %s m of water at least: she is aground by %s m", wk_hhmm(manual?tt:WS_T), wk_f(w,2), wk_f(-u,2)))
    else         wl(sprintf("           at %s, at least %s m of water: %s m under the keel%s", wk_hhmm(manual?tt:WS_T), wk_f(w,2), wk_f(u,2),
                    (u<DZ_CL-1e-9) ? sprintf(", less than the %s m wanted", wk_f(DZ_CL,2)) : ""))
  }
  wk_rule()
  return 1
}
#  The figure, in characters: the curve against the clock with the height
#  she needs drawn across it, and on the right, to the same heights, her
#  keel over the bank (Larry, AHP).  The circle the cosine curve comes
#  from is in the browser's figure (AID); it does not read in characters.
function wk_dr(v){ return (DR_H-1)-(v-DR_LO)/(DR_HI-DR_LO)*(DR_H-1) }
function wk_figdepth(   w,cwd_,i,j,tt,v,lo,hi,bed,kb,seg,T1,T2,c,off,r0,r1){
  w=70; DR_H=15; cwd_=50
  T1=DT_T[1]; T2=DT_T[DT_N]
  bed = DZ_DRY ? DZ_V : -DZ_V; kb = DF_NEED-DZ_DG
  hi=DT_H[1]; lo=DT_H[1]
  for(i=2;i<=DT_N;i++){ if(DT_H[i]>hi) hi=DT_H[i]; if(DT_H[i]<lo) lo=DT_H[i] }
  if(DF_NEED>hi) hi=DF_NEED
  if(lo>0) lo=0
  off=0
  #  a sea bed far below the tide would squeeze the curve flat: it is
  #  left off the foot of the drawing, and the legend says so
  if(bed < lo-(hi-lo)) off=1; else if(bed<lo) lo=bed
  if(hi-lo<0.2){ hi+=0.1; lo-=0.1 }
  DR_LO=lo; DR_HI=hi
  gclear(w,DR_H)
  if(DF_NEED>=lo) for(i=0;i<w;i+=2) gputwc(wk_dr(DF_NEED), i, "-", C_DIM)
  for(i=0;i<cwd_;i++){
    tt=T1+(T2-T1)*i/(cwd_-1.0)
    seg=(DT_N==3 && tt>DT_T[2]) ? 2 : 1
    wk_dh(DT_T[seg],DT_H[seg],DT_T[seg+1],DT_H[seg+1],tt)
    gputc(wk_dr(DH_C), i, ".", C_DIM)
    gputc(wk_dr(DH_12), i, "#", "")
    if(DF_ST){ v=tide_height(WS_JDA+tt/1440.0); if(v>=lo && v<=hi) gputc(wk_dr(v), i, "h", C_ACC) }
  }
  if(DF_HASO){ c=(DF_O-T1)/(T2-T1)*(cwd_-1); for(j=int(wk_dr(DF_NEED)+0.5);j<DR_H;j++) gputwc(j,c,"|",C_HDR) }
  if(DF_HASS){ c=(DF_S-T1)/(T2-T1)*(cwd_-1); for(j=int(wk_dr(DF_NEED)+0.5);j<DR_H;j++) gputwc(j,c,"|",C_HDR) }
  if(DF_HAST && DF_T>=T1 && DF_T<=T2) gputc(DR_H-1, (DF_T-T1)/(T2-T1)*(cwd_-1), "t", C_HDR)
  #  her keel, to the same heights
  if(0>=lo) for(i=54;i<=68;i+=2) gputc(wk_dr(0), i, ":", C_DIM)
  if(!off) for(i=54;i<=68;i++) gputc(wk_dr(bed), i, "=", "")
  if(DF_NEED>=lo){
    r0=int(wk_dr(DF_NEED)+0.5); r1=int(wk_dr(kb)+0.5)
    for(i=54;i<=68;i++) gputc(r0, i, "~", C_ACC)
    gputsc(r0, 58, "\\___/", C_HDR)
    if(kb>=lo) for(j=r0+1;j<=r1;j++) gputc(j, 60, "H", C_HDR)
  }
  print ""
  gshow()
  printf "  %s\n", cwd(sprintf("%s %s on the left, %s %s on the right; %s m at the top, %s m at the foot",
     wk_kname(DT_K[1]), wk_hhmm(T1), wk_kname(DT_K[DT_N]), wk_hhmm(T2), wk_f(hi,2), wk_f(lo,2)))
  printf "  %s\n", cwd((DF_ST ? "# twelfths   . cosine   h prediction" : "# twelfths   . cosine") "   - - the height she needs   | the window opens, shuts" (DF_HAST ? "   t her time" : ""))
  printf "  %s\n", cwd("on the right, to the same heights:  ~ the surface at that height   H her keel")
  printf "  %s\n", cwd(sprintf("   = %s   : chart datum", DZ_DRY ? "the bank" : "the sea bed"))
  if(off) printf "  %s\n", cwd(sprintf("the sea bed, %s m below chart datum, is off the foot of the drawing", wk_f(DZ_V,2)))
  return 0
}
function wk_help(){
  print ""
  printf "  %s\n", cw("TIDES WORK -- coastal navigation, with the working shown", C_HDR)
  print ""
  print "  tides work <name> key=value ...     angles deg true, speeds kn, heights m,"
  print "                                      times HH:MM, positions lat,lon"
  print ""
  print "  twelfths   height at a time: rule of twelfths, cosine, and the harmonic"
  print "    tides work twelfths lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 t=08:30"
  print "    tides work twelfths station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00"
  print "  secondary  a secondary port's HW and LW from its standard port"
  print "    tides work secondary hw=05:36 hwh=6.4 mhws=6.8 mhwn=5.3 dhws=-0.4 dhwn=-0.3 thw1=0000 tdhw1=-10 thw2=0600 tdhw2=5 lw=11:51 lwh=1.1 mlwn=2.1 mlws=0.8 dlwn=0.0 dlws=0.1 tlw1=0100 tdlw1=-5 tlw2=0700 tdlw2=10"
  print "  stream     a stream rate between the atlas's neap and spring figures"
  print "    tides work stream spr=2.6 nps=1.4 range=4.1 sprange=5.9 nprange=3.1"
  print "  atlas      which page of the tidal stream atlas: hours from HW"
  print "    tides work atlas station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00"
  print "  cts        course to steer across one or more hours of stream"
  print "    tides work cts track=045 stw=6 streams=135:1.5,150:2.0 leeway=5 wind=port var=-2 dev=1 dist=12"
  print "  setdrift   set and drift, from a DR and a fix"
  print "    tides work setdrift start=50.10,-1.50 co=090 stw=6 hours=3 fix=50.05,-1.20"
  print "  tidal_gate when a headland's stream turns, and the window to get round"
  print "    tides work tidal_gate hw=14:32 track=255 streams=075:2.2,078:2.6,080:2.0,085:0.9,250:0.4,255:1.5,258:2.4,260:2.7,258:2.1,255:1.0,080:0.3,078:1.4,076:2.1 t=17:00 dist=22 sog=7"
  print "    tides work tidal_gate hw=14:32 opens=5 shuts=-1 t=17:00 dist=22 sog=7"
  print "  lunar      springs and neaps: the Moon, the rule, today's range, the coefficient"
  print "    tides work lunar date=2025-05-24 brhwh=6.07 brlwh=1.26"
  print "    tides work lunar date=2025-05-24 hwh=4.3 lwh=1.1 sprange=3.9 nprange=1.9"
  print "    tides work lunar station=ticon/brest-3-fra-refmar date=2025-05-24 t=14:00"
  print "  depth      the depth over a shoal, and the window with enough water to cross it"
  print "    tides work depth dries=0.3 draught=1.8 clear=0.5 lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 lw2=17:40 lw2h=0.9 t=09:00"
  print "    tides work depth depth=0.6 draught=1.8 clear=0.5 lw=05:12 lwh=0.8 hw=11:24 hwh=4.2"
  print "    tides work depth depth=1.0 draught=1.8 clear=0.5 station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00"
  print ""
  print "  station= defaults to the station chosen with 'tides use'; date= and t="
  print "  default to now, in the station's standard time.  The same names work in"
  print "  the browser build's URL:  .../web/tides/?work=cts&track=045&stw=6&..."
  print ""
  return 0
}

# =====================================================================
#  Dispatch.  Every tool fills WL[] and WR[]; the figure goes where the
#  working says @@FIG, or the marker itself is printed under nofig=1 so
#  the browser comparison can see where the picture belongs.
# =====================================================================
function wk_run(name,args,   ok){
  W_ERR=""; WL_N=0; split("",WR); WF_HV=""
  if(!wk_parse(args)) return 0
  if(name=="twelfths") ok=wk_twelfths()
  else if(name=="secondary") ok=wk_secondary()
  else if(name=="stream") ok=wk_stream()
  else if(name=="atlas") ok=wk_atlas()
  else if(name=="cts") ok=wk_cts()
  else if(name=="setdrift") ok=wk_setdrift()
  else if(name=="tidal_gate") ok=wk_gate()
  else if(name=="lunar") ok=wk_lunar()
  else if(name=="depth") ok=wk_depth()
  else return wk_err(sprintf("there is no calculator called '%s' (twelfths secondary stream atlas cts setdrift tidal_gate lunar depth)", name))
  if(W_ERR!="") return 0
  return ok
}
function wk_print(name,   i){
  for(i=1;i<=WL_N;i++){
    if(WL[i]!="@@FIG"){ print WL[i]; continue }
    if(nofig=="1"){ print "@@FIG"; continue }
    if(name=="twelfths") wk_fig12()
    else if(name=="stream") wk_figstream()
    else if(name=="cts" && WF_OK) wk_figcts()
    else if(name=="setdrift") wk_figsd()
    else if(name=="tidal_gate") wk_figgate()
    else if(name=="lunar") wk_figlunar()
    else if(name=="depth") wk_figdepth()
  }
  print ""
  return 0
}
BEGIN{
  if(cmd=="work"){
    if(wname=="" || wname=="help"){ wk_help(); exit 0 }
    if(!wk_run(wname, wargs)){ printf "  work %s: %s\n", wname, W_ERR; exit 2 }
    wk_print(wname)
  }
}

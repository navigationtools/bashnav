#  The chart-datum corrections, checked four ways (board item B24).
#
#    awk -f tests/tides-zero-check.awk -v COR=src/tides/gen/corrections.dat \
#        -v PUB=tests/tides-zero.dat -v SF=src/tides/stations.dat
#
#  1  the station file agrees with the corrections file, station by station
#  2  no station is named CD without a line in the corrections file
#  3  each corrected port is held to its published figures (tides-zero.dat)
#  4  a twin, another provider's record of the same gauge, is within 45 mm
#     of its port's first record (the widest pair today is 39 mm, across
#     thirty years of sea level)
#
#  Prints one line for each failure, then "TIDESZERO <failures> of <checks>".
function fail(s){ bad++; print "  FAIL " s }
BEGIN{
  FS="|"; bad=0; n=0
  while((getline line < COR) > 0){
    if(line=="" || line ~ /^#/){ if(line ~ /^# [A-Z]/) port=substr(line,3); continue }
    split(line,f,"|")
    if(f[3]!="CD"){ fail(f[1] ": the zero in the corrections file is not CD"); continue }
    nc++; CID[nc]=f[1]; CZ[f[1]]=f[2]+0; CPORT[f[1]]=port
    if(!(port in FIRST)) FIRST[port]=f[1]
  }
  close(COR)
  if(nc==0) fail("no corrections read from " COR)
  while((getline line < SF) > 0){
    if(substr(line,1,2)!="R|") continue
    split(line,f,"|")
    if(f[2] in CZ){
      SEEN[f[2]]=1; n++
      if(f[9]+0!=CZ[f[2]] || f[10]!="CD") fail(f[2] ": the station file has " f[9] " " f[10] ", the corrections file " CZ[f[2]] " CD")
      Z[f[2]]=f[9]/1000
      #  M2 and S2, for the Admiralty approximation to mean high water springs
      m2=0; s2=0; nt=split(f[12],t,",")
      for(i=1;i<=nt;i++){ split(t[i],u,":"); if(u[1]==24) m2=u[2]/1000; if(u[1]==29) s2=u[2]/1000 }
      MS[f[2]]=m2+s2
    } else if(f[10]=="CD"){ n++; fail(f[2] ": named CD in the station file with no line in the corrections file") }
  }
  close(SF)
  for(i=1;i<=nc;i++){ n++; if(!(CID[i] in SEEN)) fail(CID[i] ": not a reference station in the station file") }
  #  3  the published figures
  while((getline line < PUB) > 0){
    if(line=="" || line ~ /^#/) continue
    split(line,f,"|"); n++; np++
    if(!(f[1] in Z)){ fail(f[1] ": has a published figure and no correction"); continue }
    if(f[2]=="msl")       v=Z[f[1]]-f[3]
    else if(f[2]=="mhws") v=Z[f[1]]+MS[f[1]]-f[3]
    else if(f[2]=="odn")  v=Z[f[1]]-f[3]
    else { fail(f[1] ": no such check as " f[2]); continue }
    if(v < f[4]-1e-9 || v > f[5]+1e-9) fail(sprintf("%s: %s is %+.3f m from the published %s, outside %s to %s (%s)", f[1], f[2], v, f[3], f[4], f[5], f[6]))
    HASPUB[CPORT[f[1]]]=1
  }
  close(PUB)
  if(np==0) fail("no published figures read from " PUB)
  #  4  the twins
  for(i=1;i<=nc;i++){
    id=CID[i]; a=FIRST[CPORT[id]]
    if(id==a || !(id in Z) || !(a in Z)) continue
    n++; d=Z[id]-Z[a]; if(d<0) d=-d
    if(d>0.045) fail(sprintf("%s: %.0f mm from its port's first record %s", id, d*1000, a))
  }
  #  a port with no published figure is allowed only by name, so a new one
  #  cannot arrive unchecked
  for(p in FIRST) if(!(p in HASPUB)){ n++; if(p!="Cherbourg") fail(p ": corrected with no published figure to hold it to") }
  printf "TIDESZERO %d of %d\n", bad, n
}

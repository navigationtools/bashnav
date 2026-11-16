#  The high-water levels file, checked (bridge clearance; Larry: AEZ, AFC).
#
#    awk -f tests/tides-levels-check.awk -v LV=src/tides/levels.dat \
#        -v SF=src/tides/stations.dat -v PUB=tests/tides-levels.dat
#
#  1  the file has one line for every reference station, in the station
#     file's order, and none for anything else
#  2  where a station has levels, HAT is above mean high water and mean
#     high water is above mean sea level
#  3  each published figure (tides-levels.dat) is matched: the station's
#     z0 + the level, against what its hydrographic office printed
#
#  Prints a line for each failure, then "TIDESLEVELS <failures> of <checks>".
function fail(s){ bad++; if(bad<=8) print "  FAIL " s }
BEGIN{
  bad=0; n=0
  while((getline line < SF) > 0){ if(substr(line,1,2)=="R|"){ split(line,f,"|"); ns++; SID[ns]=f[2]; Z[f[2]]=f[9]/1000 } }
  close(SF)
  while((getline line < LV) > 0){
    if(line=="" || line ~ /^#/) continue
    nl++; split(line,f,"|")
    if(SID[nl]!=f[1]){ if(!order++) fail("line " nl " of the levels file is " f[1] ", the station file has " SID[nl]) }
    HAT[f[1]]=f[2]; MHW[f[1]]=f[3]
    if(f[2]=="" && f[3]=="") { none++; continue }
    n++
    if(f[2]+0 < f[3]+0 || f[3]+0 <= 0) fail(f[1] ": HAT " f[2] " and mean high water " f[3] " above mean sea level are not in order")
  }
  close(LV)
  n++; if(nl!=ns) fail("the levels file has " nl " stations, the station file " ns " reference stations")
  while((getline line < PUB) > 0){
    if(line=="" || line ~ /^#/) continue
    split(line,f,"|"); n++; np++
    if(!(f[1] in Z)){ fail(f[1] ": not a reference station"); continue }
    v=(f[2]=="hat") ? HAT[f[1]] : MHW[f[1]]
    if(v==""){ fail(f[1] ": no " f[2] " in the levels file"); continue }
    d=Z[f[1]]+v/1000-f[3]; if(d<0) d=-d
    if(d>f[4]+1e-9) fail(sprintf("%s: %s is %.3f m above the zero, published %.3f (%s)", f[1], f[2], Z[f[1]]+v/1000, f[3], f[5]))
  }
  close(PUB)
  n++; if(np<6) fail("fewer than six published figures read from " PUB)
  printf "TIDESLEVELS %d of %d\n", bad, n
}

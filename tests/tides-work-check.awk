#  Known worked answers for the coastal-navigation calculators.
#
#  Loaded after tables.awk, engine.awk and work.awk, so it calls the
#  calculators exactly as `tides work` does - wk_run() is the one entry
#  point both use - and reads their results from WR[].  The expected
#  values in tests/tides-work.dat come from tests/tides-work-ref.py, an
#  independent working of the same definitions, never from this tool.
#
#    awk -f src/tides/tables.awk -f src/tides/engine.awk -f src/tides/work.awk \
#        -f tests/tides-work-check.awk -v SF=src/tides/stations.dat -v DAT=tests/tides-work.dat
#
#  Prints one line per failure and ends  TIDESWORK <failures> of <checks>.
BEGIN{
  nchk=0; nbad=0
  while((getline line < DAT) > 0){
    if(line=="" || substr(line,1,1)=="#") continue
    nf=split(line, fld, "|")
    if(nf<3){ print "  malformed case: " line; nbad++; continue }
    args=fld[2]; gsub(/ +/, "|", args)
    ok=wk_run(fld[1], args)
    #  a refusal's expected text has spaces in it; everything else is a list
    if(substr(fld[3],1,4)=="err="){ ne=1; ex[1]=fld[3] }
    else ne=split(fld[3], ex, " ")
    for(i=1;i<=ne;i++){
      e=index(ex[i],"="); key=substr(ex[i],1,e-1); want=substr(ex[i],e+1)
      nchk++
      if(key=="err"){
        if(ok || index(W_ERR, want)==0){
          printf "  %s %s: wanted refusal '%s', got %s\n", fld[1], fld[2], want, (ok ? "an answer" : ("'" W_ERR "'"))
          nbad++
        }
        continue
      }
      if(!ok){ printf "  %s %s: refused: %s\n", fld[1], fld[2], W_ERR; nbad++; continue }
      if(!(key in WR)){ printf "  %s %s: no result called %s\n", fld[1], fld[2], key; nbad++; continue }
      got=WR[key]
      if(want ~ /^[a-z]+$/){ if(got!=want){ printf "  %s %s: %s is %s, wanted %s\n", fld[1], fld[2], key, got, want; nbad++ }; continue }
      #  whole minutes and whole degrees exactly; everything else to 0.006
      tol=0.006
      if(key ~ /^(Htime|Ltime|cts|mag|comp|page|dt|ok|x|Hx|Lx|clamp|means)$/) tol=0
      d=got-want; if(d<0) d=-d
      if(d>tol){ printf "  %s %s: %s is %.6f, wanted %s\n", fld[1], fld[2], key, got, want; nbad++ }
    }
  }
  close(DAT)
  printf "TIDESWORK %d of %d\n", nbad, nchk
}

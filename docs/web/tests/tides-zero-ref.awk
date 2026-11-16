#  What the awk says of every station's zero, provider and licence, one line
#  each, for docs/web/tests/tides-zero.js to hold the browser to.
#
#    awk -f src/tides/tables.awk -f src/tides/engine.awk \
#        -f docs/web/tests/tides-zero-ref.awk -v SF=src/tides/stations.dat
#
#  id|kind of zero|the words|caution lines|provider|licence
#  A secondary port takes its reference station's, as tide_open() does.
BEGIN{
  FS="|"
  while((getline line < SF) > 0){
    if(substr(line,1,2)=="R|"){ split(line,f,"|"); D[f[2]]=f[10] }
    n++; L[n]=line
  }
  close(SF)
  for(i=1;i<=n;i++){
    k=substr(L[i],1,2)
    if(k!="R|" && k!="S|") continue
    split(L[i],f,"|")
    z=(k=="R|") ? f[2] : f[9]
    if(!(z in D)) continue
    kd=zero_kind(z,D[z])
    printf "%s|%s|%s|%d|%s|%s\n", f[2], kd, zero_words(z,D[z]), (kd=="chart") ? 0 : 2, data_provider(z), data_licence(z)
  }
}

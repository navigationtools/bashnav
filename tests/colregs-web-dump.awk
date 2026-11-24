BEGIN{
  for(b=0;b<360;b++)  printf "relp\t%d\t%s\n", b, rel_phrase(b,"your")
  for(b=0;b<360;b++)  printf "relpthe\t%d\t%s\n", b, rel_phrase(b,"the")
  for(t=-180;t<=180;t++) printf "aspect\t%d\t%s\n", t, aspect_words(t)
  for(t=-180;t<=180;t++) printf "ltarc\t%d\t%s\n", t, lt_arc(t)
  enc_init()
  for(i=1;i<=NENC;i++){ split(EC[i],EA,"|")
    printf "heard\t%d\t%d\n", i, (heard(EA[2])?1:0) }
  ves_init()
  for(v=1;v<=NVES;v++){
    split(VT[v],K,"|")
    for(t=-180;t<=180;t++) printf "ltnote\t%s\t%d\t%s\n", K[1], t, lt_note(K[1],t)
  }
  #  THE LIGHTS SIGNATURE, every vessel from every bearing. The shell's
  #  quiz uses it to keep look-alikes out of its options; since Larry's
  #  ruling TBKP (24 November 2026) the browser's lights drill uses it to
  #  say when the spacing of her lamps is the only difference left. If
  #  the two ever computed it differently, one would call a pair twins
  #  that the other does not.
  for(v=1;v<=NVES;v++){
    split(VT[v],K,"|")
    for(t=-180;t<=180;t++) printf "ltsig\t%s\t%d\t%s\n", K[1], t, light_sig(v,t)
  }
  n=split("M S P T Y A",A," ")
  for(i=1;i<=n;i++) for(t=-180;t<=180;t++)
    printf "arc\t%s\t%d\t%d\n", A[i], t, (arc_vis(A[i],t)?1:0)

  #  THE FIVE REPORTING STYLES, every degree, both forms. The browser
  #  grew rel_style() so the tracking exercise could print the relative
  #  column and the spoken report the way the shell does; this is what
  #  stops the two drifting. rstyle is a global the engine reads, so it
  #  is set here rather than passed.
  n=split("rn usn rel360 words none",A," ")
  for(i=1;i<=n;i++){
    rstyle = A[i]
    for(t=-180;t<=180;t++) printf "relstyle\t%s\t%d\t%s\n", A[i], t, rel_style(t)
    for(t=-180;t<=180;t++) printf "relother\t%s\t%d\t%s\n", A[i], t, rel_other(t)
  }
  for(t=-180;t<=180;t++) printf "redgreen\t%d\t%s\n", t, red_green(t)

  #  THE ENCOUNTERS REVEAL CLAUSE, every bearing in every style. The
  #  browser's version of this line showed one style whatever the
  #  setting was, and left the reader's own wording off entirely. Half
  #  degrees are included because the prefix rounds and rel_style
  #  truncates, and the two only disagree there.
  n=split("rn usn rel360 words none",A," ")
  for(i=1;i<=n;i++){
    rstyle = A[i]
    for(t=-10;t<=370;t++)      printf "encbore\t%s\t%d\t%s\n", A[i], t, enc_bore(t)
    for(t=-10;t<=370;t++)      printf "encboreh\t%s\t%d\t%s\n", A[i], t, enc_bore(t+0.5)
    for(t=-10;t<=370;t++)      printf "encbored\t%s\t%d\t%s\n", A[i], t, enc_bore(t+0.4)
  }
}

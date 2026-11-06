#  The install section must name every tool in bin/, and must tell an
#  iPad user the three things they actually need.
#
#  It said "both tools" long after there were four, and it told an iPad
#  user to git clone without saying how to get a shell in the first
#  place - which sent Larry to a search engine that answered about
#  Android APK files, because nothing in the instructions said these are
#  scripts rather than an app.
#
#  A stale install section is the first thing a new person hits and the
#  last thing the person who wrote it ever reads.
#
#  WHY THE iOS RULES INVERTED. This used to REQUIRE the section to name
#  a-Shell and to say that iOS only lets an app write under ~/Documents.
#  Both were right while the shell build was the iPad route. The browser
#  apps are now that route -- nothing to install, and they survived the
#  iPad test -- so a-Shell is no longer advertised in the public
#  documentation. The shell build is unchanged and still ships; it is
#  simply not what an iPad user is sent to.
#
#  The rule is inverted rather than deleted, which matters: deleting it
#  would let the old paragraph come back in a later edit with nothing to
#  say so. Now the check fails if a-Shell is advertised again, and fails
#  if the iPad reader is not pointed at the apps.
FNR==NR { readme = readme $0 "\n"; next }
{
  t = $0
  hit = 0
  if(index(readme, "bin/" t) > 0) hit = 1
  if(index(readme, " " t " ") > 0) hit = 1
  if(index(readme, "/" t) > 0) hit = 1
  if(!hit){ printf "  the install instructions never mention %s\n", t; bad++ }
}
END{
  if(index(readme, "browser apps") == 0){
    print "  the install section does not send an iPad reader to the browser apps"; bad++ }
  if(index(readme, "no app to install") == 0){
    print "  the install section does not say these are scripts, not an app"; bad++ }
  if(index(readme, "a-Shell") > 0){
    print "  the install section advertises a-Shell again -- the iPad route is the apps"; bad++ }
  printf "INSTALL %d\n", bad+0
}

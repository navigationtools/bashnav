#  Every built tool must appear in a table of tools in the README AND have
#  a section of its own.  deck-log shipped with a section and no row, and
#  nothing noticed - the kind of gap that is invisible to the person who
#  wrote it and obvious to the first person who reads it.
#
#  And every link in the README must point at something that is there.
#
#  WHY THIS WAS REWRITTEN.  It used to assume one shape: rows of the form
#  "| **[name](#name)** |" and headings at exactly "## name".  The
#  browser-first README has two tables - the browser apps at the top,
#  linking to the published web builds, and the six shell scripts further
#  down, linking to their own sections - and the sections sit at "###"
#  under "## The six tools" and "## The shell build".  The old check read
#  a row's anchor with sub(/^[^(]*\(#/) and, on a row whose link is a URL
#  with no "#" in it, that substitution did nothing: it then reported
#  "the row for celnav links to #celnav](https://..." which is not an
#  anchor, not a heading, and not a useful thing to be told.
#
#  So the shape assumptions are gone.  What is checked is the PROPERTY:
#
#    1  every tool in bin/ is named by a table row, and has a heading
#    2  every "#anchor" link lands on a heading that exists
#    3  every link to .../bashnav/web/<name>/ lands on a browser build
#       that is actually in docs/web/ - a stronger check than the anchor
#       one it replaces, because a published app can go missing
#    4  every relative link lands on a file in the repository
#
#  Anchors are slugged the way GitHub slugs them: lowercased, anything
#  that is not a letter, digit, space or hyphen dropped, spaces to
#  hyphens.  Every heading in this README is one or two plain words, so
#  that is enough; a heading with punctuation in it would need more.
FNR==NR {
  readme = readme $0 "\n"
  if($0 ~ /^#+ /){
    htxt = $0
    sub(/^#+[ \t]+/, "", htxt)
    HEAD[slug(htxt)] = 1
  }
  scanlinks($0, (substr($0, 1, 1) == "|"))
  next
}
{ tool = $0
  if(!(tool in ROWTEXT)){ printf "  %s has no row in a table of tools\n", tool; bad++ }
  if(!(slug(tool) in HEAD)){ printf "  %s has no section of its own\n", tool; bad++ }
}
END{
  for(i = 1; i <= NLINK; i++) resolve(i)
  printf "TOOLROW %d\n", bad+0
}

#  pull every [text](target) out of one line.  No regex here: awk has no
#  non-greedy match, and /\[[^]]*\]\([^)]*\)/ walks straight over a line
#  with two links on it.
function scanlinks(line, isrow,   p, q, r, pre, rest, txt, tgt){
  while((p = index(line, "](")) > 0){
    pre = substr(line, 1, p - 1)
    q = lastchar(pre, "[")
    rest = substr(line, p + 2)
    r = index(rest, ")")
    if(q == 0 || r == 0){ line = rest; continue }
    txt = unmark(substr(pre, q + 1, length(pre) - q))
    tgt = substr(rest, 1, r - 1)
    NLINK++
    LTXT[NLINK] = txt; LTGT[NLINK] = tgt; LLINE[NLINK] = FNR
    if(isrow) ROWTEXT[txt] = 1
    line = substr(rest, r + 1)
  }
}
function resolve(i,   tgt, anc, rest, f){
  tgt = LTGT[i]
  if(substr(tgt, 1, 1) == "#"){
    anc = substr(tgt, 2)
    if(!(anc in HEAD)){
      printf "  line %d: [%s] links to %s and there is no such heading\n", LLINE[i], LTXT[i], tgt
      bad++
    }
    return
  }
  if(tgt ~ /^mailto:/) return
  if(tgt ~ /^https?:/){
    #  only our own published builds are ours to verify; anything else is
    #  somebody else's server and not this suite's business.
    #
    #  FOUND BY THE HOST, NOT BY A PATH SEGMENT. This used to look for
    #  the literal "/bashnav/web/", which was in every site link while
    #  the site was served from a Pages default address. On its own
    #  subdomain the site sits at the root and that segment is gone --
    #  so the search would have failed, and this function returns when
    #  it fails, which means every published link would have passed
    #  without being checked at all. A check that silently stops
    #  checking is worse than one that fails, because nothing says so.
    #
    #  site is passed in from run-tests.sh and is the one place the
    #  address is written, matching SITE in docs/make-site.sh.
    if((anc = index(tgt, site "/web/")) == 0) return
    rest = substr(tgt, anc + length(site) + 5)
    sub(/\/.*$/, "", rest)
    f = (rest == "") ? "docs/web/index.html" : "docs/web/" rest "/index.html"
    if(!there(f)){
      printf "  line %d: [%s] links to the %s build and %s is not there\n", LLINE[i], LTXT[i], (rest == "" ? "launcher" : rest), f
      bad++
    }
    return
  }
  f = tgt
  sub(/#.*$/, "", f)
  if(f == "") return
  if(!there(f)){
    printf "  line %d: [%s] links to %s, which is not in the repository\n", LLINE[i], LTXT[i], tgt
    bad++
  }
}
function lastchar(s, c,   i, last){
  last = 0
  for(i = 1; i <= length(s); i++) if(substr(s, i, 1) == c) last = i
  return last
}
function unmark(x){ gsub(/[*`]/, "", x); return x }
function slug(h,   s){
  s = tolower(h)
  gsub(/[^a-z0-9 -]/, "", s)
  gsub(/ /, "-", s)
  return s
}
function there(f,   r){
  r = (getline probe < f)
  close(f)
  return (r >= 0)
}

#!/bin/sh
# A contract document (markdown) -> PDF.
#
#   sh docs/manual-src/mkdoc.sh docs/web/route/COURSE.md "the router formats"
#
# WHY THIS EXISTS. COURSE.pdf and the other contract PDFs were built by
# hand, which meant the only way to rebuild one was to remember how -- and
# the queue refuses a .md whose .pdf no longer says the same thing, so a
# document that cannot be rebuilt is a document that cannot be corrected.
# This is that command, written down.
#
# It needs WeasyPrint and pandoc, like the manuals: a development machine,
# not the boat and not Larry's Mac. The second argument is the subtitle
# printed in the footer beside the page numbers; the title comes from the
# document's own first heading, so the two cannot disagree.
set -e
SRC="$1"; SUB="$2"
[ -n "$SRC" ] || { echo "usage: mkdoc.sh <file.md> [footer subtitle]" >&2; exit 2; }
OUT=$(printf '%s' "$SRC" | sed 's/\.md$/.pdf/')
#  The footer carries the document's SHORT name: a heading often reads
#  "COURSE 1, AREAS 1, RUN 1 - the three files the router reads", and all
#  of that in a footer on every page is noise. Everything from the first
#  dash or colon onwards is dropped.
TITLE=$(sed -n 's/^# //p' "$SRC" | head -1 | sed 's/ *[-\xe2\x80\x94:].*$//')
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pandoc "$SRC" -f markdown -t html5 -o "$TMP/body.html"
{
  printf '<!DOCTYPE html><html><head><meta charset="utf-8"><style>\n'
  cat <<CSS
@page { size: A4; margin: 20mm 18mm 16mm;
        @bottom-center { content: "$(printf '%s' "bashnav - $TITLE${SUB:+ - $SUB}" | sed 's/"/\\"/g')"
                                  " - page " counter(page) " of " counter(pages);
                         font: 8pt/1 -apple-system, "Helvetica Neue", Arial, sans-serif;
                         color: #777; } }
body { font: 10.5pt/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #111; }
h1 { font-size: 17pt; margin: 0 0 .6em; line-height: 1.25; }
h2 { font-size: 13.5pt; margin: 1.6em 0 .5em; }
h3 { font-size: 11.5pt; margin: 1.3em 0 .4em; }
h1, h2, h3 { break-after: avoid; }
p, li { orphans: 2; widows: 2; }
code, pre { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 9pt; }
pre { background: #f6f7f8; border: 1px solid #e3e5e8; border-radius: 3px;
      padding: .7em .9em; white-space: pre-wrap; break-inside: avoid; }
table { border-collapse: collapse; width: 100%; margin: .8em 0; font-size: 9.5pt;
        break-inside: avoid; }
th, td { border: 1px solid #dcdee1; padding: .35em .5em; text-align: left; vertical-align: top; }
th { background: #f0f1f3; }
blockquote { margin: .8em 0; padding: .1em 0 .1em .9em; border-left: 3px solid #ccd;
             color: #333; }
CSS
  printf '</style></head><body>\n'
  cat "$TMP/body.html"
  printf '\n</body></html>\n'
} > "$TMP/doc.html"
weasyprint "$TMP/doc.html" "$OUT"
echo "  wrote $OUT"

#!/bin/sh
# Rebuild a tool's manual and quick reference PDFs.
#
# Usage:  sh mkpdf.sh            rebuild every tool listed in DOCS below
#         sh mkpdf.sh celnav     rebuild one tool
#
# Run it with "sh", as this folder's README says for capture.sh too.  Neither
# script carries the executable bit, so neither can lose it in a file copy.
#
# Every page carries the tool's version and the build date, so a printed copy
# shows whether it is current.  Neither is typed in: the version is read from
# src/<tool>/10-head.sh, which is where the program itself gets it, and the
# date is today's.  That is the release checklist's rule 4, and the reason it
# exists is that this manual once sat at 1.1 while celnav was 1.6.
#
# Needs: pandoc, and one HTML-to-PDF engine.  The engines are tried in the
# order below; if none is present the script says which to install and stops,
# rather than producing a PDF with no footer.
#   1. weasyprint       preferred: honours @page, so the footer really does
#                       appear on every page.  Verified by counting pages.
#   2. wkhtmltopdf      good page breaks, but MANY BUILDS CANNOT DO FOOTERS:
#                       an unpatched-Qt build ignores --footer-* with only a
#                       warning, and position:fixed does not repeat either, so
#                       the document comes out undated and the run still looks
#                       successful.  It is used only if weasyprint is absent,
#                       and then the footer lands on the first page alone.
#   3. pandoc + xelatex no HTML engine at all; a LaTeX footer instead
#
# Figures are regenerated separately by build_figs*.py (python3 + cairosvg).
set -e
cd "$(dirname "$0")"
SRC=../../src

# tool:manual:quickref  -- one line per tool.  Adding a tool is one line here.
DOCS='celnav:manual.md:quickref.md
tides:tides-manual.md:tides-quickref.md
colregs:colregs-manual.md:colregs-quickref.md'

DATE=$(date '+%-d %B %Y' 2>/dev/null || date '+%d %B %Y')

engine=""
for e in weasyprint wkhtmltopdf pandoc; do
  if command -v "$e" >/dev/null 2>&1; then
    if [ "$e" = pandoc ]; then
      command -v xelatex >/dev/null 2>&1 || continue
    fi
    engine="$e"; break
  fi
done
if [ -z "$engine" ]; then
  echo "mkpdf: no HTML-to-PDF engine found." >&2
  echo "  install ONE of these and run again:" >&2
  echo "    brew install pandoc basictex   # pandoc + xelatex; maintained" >&2
  echo "    pipx install weasyprint        # or this, also maintained" >&2
  echo "    (wkhtmltopdf is used first if you already have it, but it is no" >&2
  echo "     longer maintained upstream, so it is not what to install today)" >&2
  exit 1
fi

# version_of <tool>  -- read from the source the program itself uses
version_of() {
  u=$(printf '%s' "$1" | tr 'a-z-' 'A-Z_')
  v=$(sed -n "s/^${u}_VERSION=\\([^ ;\"]*\\).*/\\1/p" "$SRC/$1/10-head.sh" 2>/dev/null | head -1)
  [ -n "$v" ] || v=$(sed -n "s/^${u}_VERSION=\\([^ ;\"]*\\).*/\\1/p" "$SRC/launcher/$1.sh" 2>/dev/null | head -1)
  if [ -z "$v" ]; then
    echo "mkpdf: no ${u}_VERSION found for $1 -- refusing to build an unversioned document" >&2
    exit 1
  fi
  printf '%s' "$v"
}

# subst <tool> <version> <input.md>  -- fill the document's placeholders from
# the program itself, so no version, size or checksum is ever typed by hand.
subst() {
  b=../../bin/$1
  if [ ! -f "$b" ]; then
    echo "mkpdf: $b is missing. Run ./build.sh first, so the document's" >&2
    echo "       checksum and size describe a real build and not a guess." >&2
    exit 1
  fi
  ck=$(cksum "$b" | awk -v n="$1" '{print $1, $2, n}')
  kb=$(( $(wc -c < "$b") / 1024 ))
  sed -e "s/{{VERSION}}/$2/g" -e "s|{{CKSUM}}|$ck|g" \
      -e "s/{{SIZE_KB}}/$kb/g" -e "s/{{DATE}}/$DATE/g" "$3" \
  | include
}

# include  --  expand {{INCLUDE:<file>}} lines from stdin.
#
# Some things are true of every tool and should be written once: the display
# modes, for instance, are the same in all of them, and six copies of that
# section would be six chances to drift.  A manual names the shared file and
# the generator drops it in.  Missing file = loud failure, never a silent gap.
include() {
  while IFS= read -r line; do
    case "$line" in
      *'{{INCLUDE:'*)
        inc=${line#*\{\{INCLUDE:}; inc=${inc%%\}\}*}
        if [ ! -f "$inc" ]; then
          echo "mkpdf: $inc is named by a manual but does not exist" >&2
          exit 1
        fi
        cat "$inc" ;;
      *) printf '%s\n' "$line" ;;
    esac
  done
}

mk() {   # mk <input.md> <output.pdf> <title> <footer> <tool> <version>
  in=$1; out=$2; title=$3; foot=$4; tl=$5; vr=$6
  subst "$tl" "$vr" "$in" > _in.md
  pandoc _in.md -f markdown -t html5 -o _frag.html
  { echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'"$title"'</title><style>'
    cat style.css; echo '</style></head><body>'; cat _frag.html; echo '</body></html>'
  } > _build.html
  case "$engine" in
    wkhtmltopdf)
      # NOTE: --footer-left and friends need a wkhtmltopdf built against
      # PATCHED Qt.  An unpatched build prints "is not support using
      # unpatched qt" and carries on WITHOUT a footer, so the document comes
      # out undated and the run still looks successful.  A fixed-position
      # element is honoured by every build and repeats on every page, so the
      # footer goes in the HTML instead of on the command line.
      sed -e 's|</body>|<div class="pagefoot">'"$foot"'</div></body>|' \
          -e 's|</head>|<style>.pagefoot{position:fixed;bottom:-12mm;left:0;right:0;font-size:8pt;color:#555;border-top:.4pt solid #bbb;padding-top:2mm;}</style></head>|' \
          _build.html > _build_f.html
      wkhtmltopdf --quiet --enable-local-file-access --page-size A4 \
        --margin-top 16mm --margin-bottom 20mm --margin-left 15mm --margin-right 15mm \
        _build_f.html "$out"
      rm -f _build_f.html ;;
    weasyprint)
      { cat _build.html
        printf '<style>@page{size:A4;margin:16mm 15mm 18mm 15mm;'
        printf '@bottom-left{content:"%s";font-size:8pt;}' "$foot"
        printf '@bottom-right{content:"page " counter(page) " of " counter(pages);font-size:8pt;}}</style>'
      } > _build2.html
      weasyprint _build2.html "$out"; rm -f _build2.html ;;
    pandoc)
      pandoc _in.md -f markdown -o "$out" --pdf-engine=xelatex \
        -V geometry:a4paper -V geometry:margin=15mm \
        -H /dev/stdin <<LATEX
\\usepackage{fancyhdr}\\pagestyle{fancy}\\fancyhf{}
\\fancyfoot[L]{\\footnotesize $foot}
\\fancyfoot[R]{\\footnotesize page \\thepage\\ of \\pageref{LastPage}}
\\usepackage{lastpage}
LATEX
      ;;
  esac
  rm -f _frag.html _build.html _in.md
}

want=${1:-}
for row in $DOCS; do
  tool=$(printf '%s' "$row" | cut -d: -f1)
  man=$(printf  '%s' "$row" | cut -d: -f2)
  qrf=$(printf  '%s' "$row" | cut -d: -f3)
  [ -z "$want" ] || [ "$want" = "$tool" ] || continue
  ver=$(version_of "$tool")
  up=$(printf '%s' "$tool" | tr 'a-z' 'A-Z')
  mk "$man" "../$tool-manual.pdf"  "$up Manual"          "$up $ver manual - built $DATE" "$tool" "$ver"
  mk "$qrf" "../$tool-quickref.pdf" "$up Quick Reference" "$up $ver quick reference - built $DATE" "$tool" "$ver"
  echo "$tool $ver -> $tool-manual.pdf, $tool-quickref.pdf   (engine: $engine)"
done
ls -l ../*-manual.pdf ../*-quickref.pdf

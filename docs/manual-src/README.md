# The manual's figures

Eight annotated figures: a real screen from `celnav` as a monospace panel,
with callout labels outside it and arrows pointing at the element each
label names. They appear in `manual.md` and `quickref.md`, which `mkpdf.sh`
turns into `docs/celnav-manual.pdf` and `docs/celnav-quickref.pdf`.

| file | what it is |
|---|---|
| `cap/*.txt` | the **input**: one file per figure, holding the exact screen text that figure shows |
| `figgen.py` | draws one figure — panel, labels, arrows — and writes `fig/<name>.svg` and `.png` |
| `build_figs.py` | figures 1–4: the main menu, the intercept plot, the sky view, the sight working |
| `build_figs2.py` | figures 5–8: the training menu, the syllabus, the navigational triangle, a marked drill |
| `capture.sh` | rebuilds the two fixtures that track the app |
| `extract_panel.py` | recovers a fixture from a figure's own SVG |
| `mkpdf.sh` | rebuilds a tool's two PDFs from the markdown, filling in its version, size and checksum from the built program |

## Where the fixtures come from, and why that matters

Six of the eight are **frozen**. They show one saved working session — a
Dubhe sight at 2026-08-29 07:30 UT from 35 00.0'N 040 00.0'W, the fix it
belongs to, the triangle, and a marked drill — and nothing in the app
changes them. Reproducing that session from scratch is not worth it, so
the text is committed and is the input.

Two of them **track the app**: the training menu prints how many lessons
there are, and the syllabus lists every lesson by module. Both go stale
whenever a lesson is added. `capture.sh` rebuilds those two from the built
program, in a scratch `CELNAV_HOME` so it neither reads nor disturbs the
reader's own progress.

The fixtures were not always committed. The generators used to read
`/tmp/fig_menu.txt`, `/tmp/fig_fix.txt`, `/tmp/fig_tri.txt` and
`/tmp/fig_drill.txt`, which were made by hand in a session that ended —
so for a while the figures could not be redrawn at all, although the
design record claimed they could not drift out of step with the app.
`extract_panel.py` got them back: `figgen` writes every panel line into
the SVG as a `<text>` element, and panel text is escaped with
non-breaking spaces while callout text keeps ordinary ones, which tells
the two apart. It can also check the fixtures against the figures:

    python3 extract_panel.py --check

## Redrawing

    sh capture.sh                   # the two app-tracking fixtures
    python3 build_figs.py           # figures 1-4
    python3 build_figs2.py          # figures 5-8
    sh mkpdf.sh                     # every tool in the script's DOCS list
    sh mkpdf.sh celnav              # just this one

Two things are needed that are not always installed. **cairosvg** renders
the PNG that the PDFs embed; without it `figgen` still writes the SVG and
says which PNGs it skipped, so the figures can be regenerated and compared
anywhere. `mkpdf.sh` needs **one** HTML-to-PDF engine and picks whichever is
present, in this order:

| engine | why that order |
|---|---|
| `weasyprint` | preferred: it honours `@page`, so the footer really does land on every page |
| `wkhtmltopdf` | good page breaks, but many builds **cannot do footers** -- an unpatched-Qt build ignores `--footer-*` with only a warning, and `position: fixed` does not repeat either, so the document comes out undated while the run still looks successful |
| `pandoc` + `xelatex` | no HTML engine at all; a LaTeX footer instead |

If none is present the script says which to install and stops, rather than
building a document with no version on it.

Two environment variables exist for working without overwriting anything:

- `FIGOUT=<dir>` — write the figures somewhere else.
- `CAPIN=<dir>` — read the fixtures from somewhere else.

Together they let a rebuilt fixture set be run through the generators and
compared against the committed figures before it replaces them.

## Anchoring a callout

`at(lines, row, "text")` pins a label to a row and a string. That is right
for the frozen fixtures, where the row cannot move.

For the two that track the app, use the searching forms, because adding a
lesson moves every row below it and a row-anchored callout then points at
the wrong line **while still rendering perfectly**:

- `fat(lines, "text")` — find the one line containing `text`. It stops the
  build if the string matches zero lines or more than one.
- `to_end(lines, "text")` — from `text` to the end of its line, for a
  figure that is expected to change: the progress line reads
  `lessons 4 of 22   drills 14/18` today and something else tomorrow.

A callout's words can go stale too, and nothing checks prose. When module
C was added, two labels still said "twenty lessons" and "Four modules,
five lessons each". If you change what the figures show, read the labels.

## The placeholders, and why they are not typed

`manual.md` carries `{{VERSION}}`, `{{SIZE_KB}}` and `{{CKSUM}}`, and
`mkpdf.sh` fills them from `bin/<tool>` at build time. It **refuses to build**
if that program is missing, so a document can never describe a guess.

The reason is a measured one. The manual once printed, for a reader to check
their own copy against:

| | |
|---|---|
| what the manual said | `4175943417 142889 celnav`, "about 140 kB" |
| what the program was | `1147339436 263990 celnav`, 257 kB |

A navigator following those lines would have concluded a sound copy was
corrupt. A hand-typed number is what went stale, so the fix was to stop
typing them rather than to correct them.

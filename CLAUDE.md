# Read this before changing anything

Bash Navigation Software: five marine tools and a launcher, written in POSIX
`sh` and POSIX `awk`, with no dependencies, no network, and no install step,
and the same six tools built as browser apps. They are meant to work at sea,
on a boat with no signal. On an iPad that means the browser apps, installed to
the home screen; the shell build runs on macOS, Linux and the BSDs, still
ships, and is the reference the browser builds are checked against.

    celnav    celestial navigation, sight reduction, the fix, a teaching track
    colregs   rules of the road, lights, encounters, contact management
    tides     harmonic prediction, 8,334 stations worldwide
    deck-log  the boat's records: deck, engine, provisions, spares
    weather   read your own barometer, and the physics under it
    bashnav   a launcher, pure sh - one home-screen icon reaching all five

Larry Sherman has the ideas and the sea time; Claude writes the code. If you
are a later session picking this up, these four documents are the handover:

| | |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | how the thing is built and why it is shaped this way |
| [`docs/HACKING.md`](docs/HACKING.md) | the rules you must not break, and the bug that taught each one |
| [`docs/TESTING.md`](docs/TESTING.md) | what the suite checks, and why each check exists |
| [`REPO-STATE.md`](REPO-STATE.md) | where things stand and what is next |

Read `docs/HACKING.md` before you write a line of awk. Most of it is not
obvious, none of it is stylistic, and every rule in it is there because
something shipped broken.

## Before any other work: the shared inbox

bashnav is one of several projects Larry runs with Claude, and they pass work
to each other through a shared repository. **This runs first, before anything
else in this file:**

> Before any other work: `git pull` in `~/navigationtools/spec`, read every
> file in `~/navigationtools/spec/handoffs/inbox/bashnav/` whose Status is
> open, and tell Larry what is waiting. Close an item by setting
> `Status: done` and adding a `## Reply`. Tasks for another project go in that
> project's inbox. Change only this project's repository, and in `spec` only
> inbox notes.

`~/navigationtools/spec/handoffs/README.md` holds the full protocol: who reads
which inbox, who may write where, and the rule that the contracts in `spec`
change through one session only, so there is one author.

### Where things are

    ~/navigationtools/bashnav    this repository, on Larry's Mac
    ~/navigationtools/spec       the shared repository above

Every project Larry runs lives under `~/navigationtools/<project>`. For any
path other than this repository's own, read `spec`; do not carry one forward
from an earlier session.

### Where files for Larry go

    ~/Downloads/claude_downloads/bashnav/     patches, documents, anything built for him

Never loose in `~/Downloads`, and never in another project's folder. When this
session is linked to his Mac, write there directly and read the file back off
disk to confirm it arrived; when it is not, name the file clearly with a
version and say which folder it belongs in.
`~/Downloads/claude_downloads/README_claude_downloads.md` holds the full rules.
Patches that reach him by a download card *as well* get applied twice, because
a browser-saved copy is named `..._1.patch` and still matches `00NN-*.patch` —
so write to disk and do not also send the card. Specs and handoffs still go in
`spec`; `claude_downloads` is for working files, not a substitute for the
repositories.

**Why that last sentence is here.** This repository used to sit in
`~/Downloads/bashnav`, and it moved. The move was recorded in `spec`, in the
Navigation Tools session's plan — accurately, and in a file nothing told this
session to read. Meanwhile an older handover still named the old path, and
the instruction above, which gives `spec`'s location and therefore the whole
convention, had been pasted into a session rather than written down here. So
the correct path was on disk, one directory from a folder that had already
been listed, and a session went on using a remembered path until a command
failed. A fact that lives only in one session's memory is not shared, and a
fact that is only pasted is only as reliable as somebody remembering to paste
it.

`origin` in this repository carries **two push URLs**, GitHub and the
Synology, so one `git push origin main` reaches both. Adding any push URL to
a remote disables its default, which is why GitHub is listed explicitly.

## The two-line version

    ./build.sh              # src/ -> bin/ ; run this after ANY edit to src/
    ./tests/run-tests.sh    # every shell x every awk on the machine

Never edit `bin/` directly. It is generated, CI checks that it matches `src/`,
and your change will be silently overwritten by the next build.

## `docs/coastal/` is generated too, and belongs to another project

*Decided by Larry, 7 November 2026.* The coastal navigation course is a
separate, private repository, but its **built pages are published from here**,
at `bashnav.navigationtools.org/coastal/`, because GitHub Pages serves one
site per repository and bashnav's site is this repository.

    docs/coastal/     generated. Never hand-edited. Source lives in the
                      coastal-navigation repository; its build copies the
                      output in at publish time.

Same rule as `bin/`: a change made here is overwritten by the next build of a
repository you are not looking at.

**Why it is here at all.** The course was going to live at
`navigationtools.org/coastal/` — a different hostname, so a different origin,
so its lessons could not load tides' code and would have needed a copy of
`work.js`, a drift check, and a shim for the trig functions. On this origin a
lesson loads `../web/tides/engine.js` and `../web/tides/work.js` directly:
77 KB of the real files, no copy, and no shim to get subtly wrong. Larry moved
it for stability and less complexity, and that is what it bought.

**What it does not buy:** installed home-screen icons keep separate storage
containers even on one origin, so the course still cannot read deck-log's or
tides' data. Same origin solves code sharing, not data sharing.

## The five rules that break things silently

1. **POSIX awk only.** No gawk extensions. Test under `mawk` *and* `gawk` —
   gawk accepts things mawk refuses outright, so a gawk-only run proves
   nothing.
2. **Never name a variable after an awk built-in.** `RS`, `RT`, `NR`, `FS`,
   `NF`, `OFS`, `ORS`, `RSTART`, `RLENGTH`, `SUBSEP`, `FILENAME`, `CONVFMT`,
   `FIELDWIDTHS`, `IGNORECASE`. `tests/awkvars-check.awk` enforces this.
3. **Never let a function parameter shadow a function name.** Illegal in
   POSIX; gawk tolerates it, mawk refuses to parse the file.
   `tests/fnparam-check.awk` enforces this.
4. **No newline after the `:` of a ternary.** gawk sometimes allows it, mawk
   never does.
5. **POSIX `sh`, not bash.** No arrays, no `[[`, no `local`, no `$'...'`, no
   `${var,,}`. It has to run under dash and under the BSDs' `sh`, and the
   suite runs every shell on the machine for that reason.

## Never `git add -A` in this repository

Stage by explicit path. Always.

This repo is public, and Larry works on Clipper Race material in the same
place. On 18 Oct 2026 a `Claude outputs/` folder was sitting untracked in the
working tree holding `clipper-procedures.md` and `clipper-procedures.pdf` —
built from Clipper's copyrighted materials. It was unignored and on the branch
about to be pushed. It had never been committed, and it was one `git add -A`
from being published under Larry's name in the very repository he had invited
Clipper to look at. Once pushed it would have been in the history whether or
not the file were deleted afterwards.

It is now in `.gitignore`, which stops that accident and no other: an ignore
rule is bypassed by `git add -f`, and does nothing for an archive or a copy of
the working tree.

So the rule is about staging, not about that one folder:

    git add docs/ src/                 # yes - say what you mean
    git add -A                         # no
    git commit -a                      # no

And check `git status` before every commit. The cost is five seconds; the
failure mode is somebody else's copyright in a public repository, permanently.

**A file does not have to be on the website to be public.** GitHub Pages serves
only what is under `docs/`, so `src/`, `bin/` and `tests/` are not part of
`bashnav.navigationtools.org`. They are still visible to anyone on
`github.com/navigationtools/bashnav`, because the repository is public. Keeping
something out of `docs/` keeps it off the website and nothing more — the only
thing that keeps material out of public view is not committing it. `PUBLISHING.md`
explains the two domains.

## The standard that governs

For `colregs`, the COLREGs as published by the IMO. Where the program and the
Convention differ, **the Convention is right and the program is wrong**. The
tools are training and cross-checking aids and say so, in each `about`
section, in `SAFETY.md`, and on the site. Do not soften that language.

## Working with Larry

He is a former US Navy FTG2/SS — fire control technician, submarines,
1984–1990, on *Alaska*, *Lafayette*, *Gato* and *Greenling*. He stood the
manoeuvring watch and worked in the fire control tracking party, so he knows
relative motion, bearing drift and manual solutions cold, and the contacts
module in `colregs` is built from methods he remembered and I then verified.

He is a market data systems engineer and has been for decades — Financial
Sciences, Tibco, Greenwich Capital, CDC Capital, Whitney, RBS, Credit Suisse,
MarketsIO, with consulting at Chase, Goldman, Merrill and NatWest. He scripts,
and is strong in Bash, Perl and Python. **An earlier version of this file said
"he is not a programmer". That was wrong.** Write to him as an engineer:
mechanism, trade-offs and the actual failure, not a simplified version of it.

What he does not do is guess at *this* codebase, and that is the useful part.
He reports what he *sees* — "still no color", "it jumps one char to the right",
"a could not create container error" — and those reports are consistently
accurate descriptions of the symptom. They are not diagnoses. **Three times now
I have wasted rounds by treating one as a diagnosis**, and every time the fix
was to go and look at what was actually being served: the lights picture that
was missing rather than colourless, colour that had never worked on any
terminal, and the iPad data folder. See `docs/HACKING.md`.

He has also found four things the suite could not: the mine-clearance light
arrangement, the towing light geometry, a quiz that gave away its answer, and
that none of the tools would start on the platform they were written for. He
finds them by using the tools the way a sailor would. That is the division of
labour on this project and it works — do not try to reason him out of a
symptom, go and reproduce it.

When he says something you built is wrong about the sea, he is usually right,
and the disagreement is usually about mechanism rather than about the claim.
Check what the data can actually support before agreeing or arguing.

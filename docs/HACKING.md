# Hacking

Every rule here exists because something shipped broken. None of it is
stylistic. Read it before you write awk for this project.

---

## Portability

### Test under two awks or you have tested nothing

`gawk` accepts several things `mawk` refuses **at parse time**, so a gawk-only
run does not tell you the file is valid awk. `run-tests.sh` defaults to every
shell and every awk installed on the machine, and CI names `dash`/`bash` ×
`mawk`/`gawk` explicitly so the intent survives a change to that default.

This mattered: three separate mawk parse failures were found by CI and not
locally, because the runner used to default to one shell and one awk.

### Never name a variable after an awk built-in

A tide-rate variable called `RS` set awk's **record separator**. The next
`getline` read the entire station file as one record. The symptom was a tide
prediction that quietly used no data at all.

Banned: `RS RT NR NF FS OFS ORS RSTART RLENGTH SUBSEP FILENAME FNR CONVFMT
OFMT ENVIRON ARGC ARGV FIELDWIDTHS IGNORECASE`.

`tests/awkvars-check.awk` enforces this across `src/`, `docs/` and `tests/`.

> I introduced `RT` — a gawk built-in — **into the lint written to catch
> exactly this class of bug**, in `docs/ansi2svg.awk`. It is now `RTX`. The
> lint covers `docs/` and `tests/` for that reason.

### Never let a function parameter shadow a function name

    function ek_across(sp, co, brg)     # WRONG if brg() is a function

Illegal in POSIX awk. gawk tolerates it; **mawk refuses to parse the file**,
so the tool dies at startup with a syntax error and no other clue.

Worse: **mawk resolves called functions at parse time, gawk only at call
time.** So an awk file that calls a function defined in a *different* `-f`
file will load under gawk and fail to parse under mawk. `src/colregs/engine.awk`
can no longer be loaded on its own for this reason — it needs `contacts.awk`
and `review.awk` alongside it. Test invocations must pass all three.

`tests/fnparam-check.awk` enforces the shadowing rule.

### No newline after the `:` of a ternary

    x = (a > b) ? one :
        two                    # gawk sometimes; mawk never

Break the line before the `?` or use an `if`. `rv_colour()` and `rv_arc()` in
`review.awk` are written as plain `if`s for exactly this reason.

### a-Shell has two shells, and the default one is not POSIX-complete

From a-Shell's author, in reply to the heredoc report:

> a-Shell has two shells: the default version, extremely lightweight, designed
> 8 years ago with the main requirement to have a minimal CPU footprint … With
> the consequence that it is not fully POSIX compliant. The issue you pointed
> is one of the places where it is not complete. … For your use case, I
> recommend using `dash`.

`dash` ships with a-Shell and is compliant. Starting it once makes it the shell
on every relaunch (one window at a time on an iPad).

**What that settles, and what it does not.** Heredocs work under `dash` —
confirmed on the a-Shell Mac build, which runs the same shell. The
compound-command redirect above does **not** come right under `dash`, so that
fault is not in the shell but underneath it, and changing shells will not save
you from it.

The tools use neither construct now, so they do not depend on which shell is
running. That is the point: the suite should not need a particular shell to be
chosen for it.

### `$HOME` is not writable on iOS

    : "${CELNAV_HOME:=$HOME/.celnav}"          # WRONG on the target platform

a-Shell's README: *"In iOS, you cannot write in the `~` directory, only in
`~/Documents/`, `~/Library/` and `~/tmp`."* `$HOME` there is the app's data
container, `/private/var/mobile/Containers/Data/Application/<uuid>`, and `mkdir`
in it is refused.

**All five tools defaulted to `$HOME/.<tool>`, so not one of them would start on
an iPad** — the only platform this project has ever been for. Each printed
`cannot create /private/var/mobile/Containers/…` and stopped. It survived a full
test matrix, CI, a published release and five tools because *every machine the
suite runs on has a writable `$HOME`*.

`src/common/05-home.sh` now picks the first of `$HOME`, `$HOME/Documents`,
`$HOME/Library` it can create **and write a file in**. Proving it by writing,
rather than sniffing the platform, is the point: there is no `uname` that
distinguishes a-Shell from any other iOS shell, and the next constrained
platform will not announce itself either.

> Larry reported *"a could not create container error"*, then the path. That was
> our own message read off the screen — `cannot create /private/var/mobile/
> Containers/Data/Application/<uuid>/.celnav` — and the word he picked out of it
> was in the path, not the verb. **Third time on this project that his report
> was an accurate description and I read it as a diagnosis.** Reproducing it
> took one command: a `$HOME` with the write bit off.

### POSIX sh, not bash

No arrays, no `[[ ]]`, no `local`, no `$'...'`, no `${var,,}`, no `function`
keyword. It must run under `dash` and under a-Shell.

### `-f file` and an inline program do not mix — and it fails silently

    awk -f lib.awk 'BEGIN{ print "hi" }'        # prints NOTHING, exits 0

Once you use `-f`, **all** program text must come through `-f`. The inline
`'BEGIN{...}'` is taken as a **filename**, awk looks for a file called
`BEGIN{ print "hi" }`, does not find it, has no main rule to run, and exits
successfully having done nothing at all.

No error, no warning, exit status 0.

This is not a curiosity. A truncation test written this way reported success
across eighty-six offsets while executing no test code whatsoever, and the real
bug it was meant to find — a half-written record parsing as a whole one — sat
there undetected until the harness was fixed.

**So: probe code goes in a file and is passed with `-f`.** And any harness whose
probe can produce no output must fail loudly on an empty result rather than
skipping it.

**It bit a generator too, long after this entry was written.** The contacts
reference card was built by an inline program in `make-colregs-web.sh`; moving
its escaping into a shared `-f` file turned that inline program into a filename
and the card generated as five empty strings. Nothing failed — the generator
exited 0, and the only sign was the committed file changing. The inline program
is now `docs/web/colregs/gen/dumpcard.awk`. **Adding a `-f` to a command that
carries an inline program silently deletes the program.**

### Doubling a backslash: not in gsub's replacement, and not with split

    gsub(/\\/, "\\\\", s)        # one backslash in, one or two out,
                                 # depending on which awk you have

POSIX defines only `&` and `\&` in a `gsub` replacement string. A backslash
before anything else is left to the implementation, and they disagree:

| | one backslash becomes |
|---|---|
| mawk 1.3.4 20240123, gawk 5.1, gawk 5.2, one-true-awk | `\\` |
| **mawk 1.3.4 20200120** (Debian and Ubuntu's for years) | `\` |

Nine generators escaped their output this way, so on an ordinary machine every
generated browser file came out silently wrong — a lesson showing a shell line
continuation lost its backslash and rendered a literal `\n` with no line break.

**`split` is not the way out.** `split(s, p, "\\")` avoids the replacement
rules, and `index`-free code looks tidier, but **one-true-awk compiles a
single-character separator as a regex**, and a lone backslash as a regex is a
dangling escape: it split on newlines as well, turning every line break into a
pair of backslashes. That cost a round to find, and it is the same trap one
level down — reaching for a different awk feature whose single-character case is
also implementation-defined.

So `docs/web/gen/jsonesc.awk` uses **`index()` and `substr()` and nothing
else**: a plain string search, a plain cut, and a replacement built by
concatenating string *literals*, whose escapes the lexer resolves. That is well
defined everywhere, and `tests/jsonesc-check.awk` holds it there per awk.

> The regenerate-and-compare checks could not see any of this, and that is the
> part worth remembering. They run the generator and diff against what is
> committed, so on the broken awk they report the *committed* file as stale —
> and doing what they advise commits the broken version. **A check that compares
> a generator with itself cannot catch the generator being wrong.** Hold the
> primitive to a literal answer instead.

### Do not seed `rand()` and expect it to be reproducible

**mawk re-seeds `srand()` from the clock even when handed an explicit seed.**
Both engines used seeded `rand()` so a drill could be regenerated for marking;
under mawk the marking would occasionally score a correct answer as wrong.

Both now use an internal MINSTD generator, `xsrand()`/`xrand()`. The test that
found it — "every drill and quiz marks its own correct answer as correct" — is
the most valuable test in the suite.

---

## Shell traps

### Test for a tty at the top level, never inside a substitution

    # WRONG
    cmode_now() { [ -t 1 ] && echo "$cmode" || echo plain; }

    # RIGHT — in 10-head.sh, at the top level
    ISTTY=0; [ -t 1 ] && ISTTY=1
    cmode_now() { if [ "$ISTTY" = 1 ]; then echo "$cmode"; else echo plain; fi; }

Inside `$( )` stdout **is a pipe**, so `[ -t 1 ]` is always false and every
terminal was told it was plain. Colour never worked for anybody, on any
terminal, for weeks. Larry asked "should I be seeing the light in color?" and
the honest answer was no, nobody ever had.

### `while read … done < file` redirects the whole loop body

    # WRONG — every prompt inside rv_one reads a KEY, not the user's answer
    while read k; do rv_one "$k"; done < keyfile

    # RIGHT
    rvkeys=$(eng -v cmd=rvkeys)
    for k in $rvkeys; do rv_one "$k" || break; done

The review section picker appeared to ignore every keystroke. It was consuming
the key file instead.

### Never redirect a compound command to a file

    { echo "cmode=$cmode"; echo "lon=$lon"; } > "$CONF"      # WRONG

**a-Shell keeps only one line of that.** The config file comes back with a
single line in it, `load_conf` reads nonsense, and the tool hangs on the *next*
launch — so the damage appears after the run that caused it. No error, no exit
status, nothing to notice.

    printf '%s\n' "cmode=$cmode" "lon=$lon" > "$CONF"        # RIGHT

One command, one redirect. Verified on the device:

    printf '%s\n' a b >t     ->  a and b, on two lines.  Correct.
    { echo a; echo b; } >t    ->  fails.

Seven of these were in the tools — one or two in every one of the five, every
config file and every progress file. This is the fault that made a tool hang on
relaunch until its progress file was deleted.

**Grouping without a redirect is fine.** `cmd || { a; b; }` appears in every
tool's `install_engine`, and the tools do run on the device, so it parses there.
Only the redirect form is banned. `tests/ashell-check.sh` enforces it, over
`src/` and over the built tools up to the payload marker; `build.sh` is
deliberately exempt, because it runs on a developer's machine and its own
`{ … } > "$out"` is how each tool gets written.

### An awk named by hand must be checked before it is used

`<TOOL>_AWK` was taken on faith. Name one that is not installed and the first
thing that fails is the unpacker, which reports

    bashnav: could not write engine-1.6.awk

— naming the wrong thing entirely, and hopeless on a device with no debugger.
Each tool now runs the named awk once before trusting it, and says plainly that
the variable is wrong if it will not start.

### A write probe must sit inside `( )`

    mkdir -p "$d" 2>/dev/null && : > "$d/.wtest" 2>/dev/null      # WRONG

Two separate faults in one line, both invisible until the directory exists and
cannot be written:

1. **The error still reaches the terminal.** Redirections are applied left to
   right, so the failing `> "$d/.wtest"` reports *before* the `2>/dev/null` that
   was meant to silence it. The user sees `cannot create /…/.wtest`.
2. **Under `dash` the shell exits.** `:` is a POSIX **special built-in**, and a
   redirection error on a special built-in terminates a non-interactive shell.
   Not the function — the whole script.

    mkdir -p "$d" 2>/dev/null && ( : > "$d/.wtest" ) 2>/dev/null   # RIGHT

The iPad installer died exactly there the first time it met a read-only `$HOME`:
printed a raw shell error and stopped after "checking they run". `bash` survived
it and only leaked the message, which is how a thing like this reaches a user —
it works on the machine you wrote it on.

`tests/ipad-install-check.sh` probes this directly, at the shell level, as well
as through the installer.

### A self-extracting script must carry its own length

`bashnav-ipad.sh` is 3.4 MB fetched over whatever link a boat has. **sh treats
end-of-file as the end of an unterminated heredoc**, so a short download writes
the last tool out half-finished, raises nothing, and exits successfully. That is
the same shape as the truncated log record above: a fragment that is
structurally perfect and simply wrong.

The file therefore carries its own byte count and checks it before doing
anything. The stamp is a fixed-width placeholder — `__BYTES__` is nine
characters, the number is zero-padded to nine — because a substitution that
changed the file's length would make the number it just wrote untrue.
`release/make-ipad.sh` re-measures after stamping and fails the build if the size
moved.

Longer than expected is reported differently from shorter: a file that grew has
usually had its line endings rewritten in transit.

### Declining is not failing

`tides near` used to exit non-zero when the user pressed return instead of
picking a station. Under `set -e` in the test suite that killed the run. The
`do_near`/`do_find` helpers now `return 0` either way, with a comment saying
why, so nobody "tidies" it back.

---

## The bug ledger

Kept because the *pattern* recurs, not for nostalgia.

### Data and correctness

**Shallow-water constituents had speed zero.** M4 came out at 0.000000
cycles/day, so every overtide became a DC offset that drifted with the date. A
shallow-water constituent is a *product* of others and has no Doodson numbers
of its own: its speed is the same weighted sum of its parents' speeds that its
phase is of theirs. Fixed with a six-pass resolution loop in `tide_prep()`.

**SA phase out by 283°.** Foreman lists Sa as `(0 0 1 0 0 -1)`; NOAA
references it to `h` alone. Found by predicting the same station six months
apart and watching the error swing.

**A 10 mm amplitude floor cost a factor of four in timing.** It looked
harmless. Worst error against NOAA's published tables went from 5.9 minutes to
26.9. `FLOOR` is now 0.0005 m and the extra megabyte is worth it.

**Mine clearance lights drawn on two masts.** Larry could not account for a
green light in the picture, which is how it was found. All three all-round
greens belong on one mast.

**Encounters 13 and 14 showed five options with the right answer cut in
half** — a semicolon inside option (b), and the option list is
semicolon-separated. Found from a screen Larry pasted. `tests/fields-check.awk`
now checks that no table field contains its own separator.

### Validate against the published answer, not another implementation

`tides` is checked against **NOAA's own published tide tables**, not against
another harmonic library. Checking theory against theory would have passed
cleanly with all three of the bugs above still in place. 24 turns at six
stations spanning small and large ranges and mixed and diurnal regimes; mean
2.4 min / 1.0 cm, worst 5.9 min / 2.0 cm; the fixture is committed so the
check needs no network.

> **I once fabricated Newport's fixture values by eye instead of fetching
> them**, which produced a phantom 38-minute error and sent me hunting a bug
> that did not exist. *Invented reference data in a validation test is worse
> than no test at all.* If you cannot fetch the reference, do not write the
> test.

### Rendering

**The README SVGs sheared, three times, three different causes.** GitHub's
sanitizer strips `xml:space`, so indentation collapsed. Then glyphs advanced by
the font's own width rather than the grid's. Then XML collapsed runs of
whitespace inside text content, so the x-coordinate list no longer matched the
characters. Final rule in `docs/ansi2svg.awk`: **no space character is ever
written into the SVG.** A gap is expressed by arithmetic — each whitespace-free
chunk gets its own explicit x position. `tests/svg-check.awk` verifies the grid.

**The lights picture was not colourless — it was not there.** Larry reported
"still no color in colregs" three times across two sessions. Each time I went
and checked the SVG, and each time the SVG was correct. The actual fault was an
unclosed ` ```sh ` fence in `README.md` that swallowed the `<img>` tag, the
`<details>` block and the plain-text copy of the picture. GitHub printed the img
tag as source and rendered nothing.

> **A missing picture and a colourless picture are indistinguishable from the
> outside.** His report was an accurate description of what he saw and I kept
> reading it as a diagnosis. What found it in one call was opening the live page
> and asking the DOM what it had:
>
>     Array.from(document.querySelectorAll('img')).map(i => i.src)
>
> Three came back; the README claims four. **When a user reports how something
> looks, verify what is actually being served before investigating what you
> think is being served.** Proving the file on disk was byte-identical to the
> one on GitHub felt like progress and was the wrong question.

`tests/readme-check.awk` now enforces the markup.

### My own test harnesses

**They were wrong four separate times** — an export selector that matched
nothing, a `bad++` outside its `if`, `nc` matching inside the word "since",
and the Apache licence URL flagged as a network endpoint. And once my probe of
the network lint was silently overwritten, because `run-tests.sh` rebuilds
`bin/` from `src/` before running.

> **A test you have never watched fail is not a test.** Break the code
> deliberately, watch the check go red, then restore. Every check added since
> this rule was written has been probed this way, and two of them — the search
> ranking test and an `<img>` counter — passed while the thing they claimed to
> test was disabled. The ranking test used Boston, where alphabetical order
> already gives the right answer; it uses Falmouth now, where it does not.

**And the probe has to reach the fault's actual window.** `celnav-ui.js`
compares the fix the page shows against the fix the shell prints, to catch a
zero-pad that was decided from the minutes *before* `toFixed(1)` rounded them —
`35 010.0' N`. Planted the fault; the check passed. The scenario's angles were
`01.3'` and `10.3'`, and the buggy code is right at both: it only goes wrong
for minutes in **[9.95, 10)**, which print as `10.0` but are below 10 before
rounding. Widening the scenario was not enough either, because the window is
invisible in the output — `10.0` is `10.0` whichever side it came from. So the
harness now reads it off the **input** sights, where it is knowable, and
*refuses to pass* a scenario that does not contain one. A check whose
triggering condition you cannot demonstrate is not a check, and "I broke it and
it went red" is only evidence if the break was the one that ships.

### The PDFs are not reproducible, and it is the creation date

`wkhtmltopdf` stamps a `/CreationDate` into every file it writes, so rebuilding
`docs/celnav-manual.pdf` and `docs/celnav-quickref.pdf` produces a diff **even
when the markdown has not changed** — the quick reference moved 1,272 bytes on a
rebuild with no source edit at all. Nothing compares them today, so this is
churn rather than a failure; it is written down because the moment anyone adds a
regenerate-and-compare check for the PDFs, the way the site plates and the
generated browser files have, that check is red from the first run and the
reason is not in the diff.

Rebuild the PDFs only when their markdown changed, and commit only the one that
did.

### Do not put working files in `/tmp` on iOS

`deck-log` and `weather` built each record in `${TMPDIR:-/tmp}`. iOS gives an app
`Documents`, `Library` and its own `tmp`, and **nothing promises a `/tmp` at
all**. Both now use the tool's own data folder, which was probed for writability
at startup and is therefore the one place known to work.

### Platform

**Nothing in the suite ran as an iPad runs it.** See the `$HOME` entry above:
five tools, none of which could start on the target device, and a green matrix
the whole time. A test environment that shares an assumption with the code
cannot test that assumption. `tests/ios-home.sh` removes this one — a `$HOME`
that cannot be written, which is the actual iOS condition — and it is the model
for any future one.

**iPadOS 26 draws the window controls over the top-left of an installed web
app, and tells the page nothing about them.** Larry found it on the iPad mini:
"the apple three colord button for kill, min, max coveres the back arrow so we
can never go back." Five tools put their back control 12–14px from the left
edge, 40px square, which is exactly where the controls land.

**And the user agent will not tell you which iPadOS this is.** Safari caps the
version it reports: the iPad mini on **26.6.1** and the iPhone on iOS 26 both
say `CPU OS 18_7`, checked against Settings → General → About. A session
reading the probe's own user-agent line concluded the device was on 18.7 and
that the window controls could not be a 26 behaviour — wrong on both counts,
from a string the platform does not mean literally. So: **feature-detect,
never version-sniff**, which is what the fix below does anyway, and the probe
page now says so beside the readout.

What the platform offers a page, measured on the device rather than assumed:

| | |
|---|---|
| `env(safe-area-inset-top)` | 32px full screen, **10px windowed** |
| `env(safe-area-inset-left)` | 0 in both |
| `env(titlebar-area-*)` | unsupported |
| `navigator.windowControlsOverlay` | absent |
| a media feature for the controls | none |

The inset moves the *wrong way*: it shrinks when the controls appear, because
it tracks the status bar and not the window chrome. Every working fix published
for this is native — UIKit's windowing control style, `additionalSafeAreaInsets`,
`UIDesignRequiresCompatibility` — and none of them is reachable from a page.

So the only honest way to size a fix was to measure it. `docs/web/platform/` is
a probe: a 10px grid pinned to the viewport origin, a replica of the real bar,
live readouts of every variable above, and the candidate fixes switchable under
the grid. Read off an iPad mini, portrait:

        0    20   40   60   80   100
        |    |    |    |    |    |
        +---------------------------------  full screen: no controls at all
        |  ‹  Probe                NIGHT
        |
        +---------------------------------  windowed
        |  (  ●  ●  ●  )                    controls   x 21 → 62
        |  [    ‹    ]                      back  was  x 12 → 54   COVERED
        |              [    ‹    ]          back  now  x 88 → 130  clear

`.bar` now carries `padding-left: calc(env(safe-area-inset-left) + 88px)` in
all seven builds. 88 clears 62 with 26px to spare.

**It is unconditional, and that is the decision, not an oversight.** The
controls appear only when the window is resized, and the only way a page can
detect that is `innerWidth < screen.width` — a guess, not an API, and one that
Stage Manager or an external display can falsify. An indent that is always
there costs 76px of empty bar, where there was nothing but a back arrow, and
cannot be wrong at sea.

The probe stays in the tree because the next OS will move something else.
It ships **without a service worker** — a cached probe is a lying probe — and
because every worker check walks `docs/web/*/sw.js`, a page with no worker was
being skipped by all of them in silence. `run-tests.sh` now requires a served
page without a worker to be named with its reason, so the exemption is visible
rather than accidental.

### Build and release

**`make-site.sh` named engine versions by hand**, so three site plates had been
silently empty since a version bump. Version numbers must be derived, never
typed twice.

**An awk at the head of a pipeline cannot fail.** Two site plates were built
with `$AW -f engine.awk … | sed … | sed … > plate.txt`, missing the two other
colregs files. gawk and one-true-awk resolve a function at the call and never
reach `rv_keys()`; mawk resolves at parse time and refuses the whole file. The
awk exited 2 with a message — and `set -e` never saw it, because a pipeline's
status is its **last** command's, `sed` succeeds on empty input, and the script
wrote a zero-byte plate and carried on. On a machine whose `awk` is mawk,
rebuilding the site blanked two front-page plates and said nothing.

> Generating a file through a pipeline means checking the FILE, not the exit
> status. `make-site.sh` already did that for its pictures and that is why only
> the text plates broke. Where the status matters, `set -o pipefail` is not
> available in POSIX `sh`, so write the intermediate to a temporary file and
> check it.

**`grep -c` returns 1 when the count is zero**, and the last statement of
`make-site.sh` was `grep -c '{{' docs/index.html >/dev/null && { … }`. Under
`set -e` that made a clean site build exit 1, every time, on success. It
survived for weeks because nothing was checking the status — which is the only
reason a build script can be wrong about whether it worked.

**A stray 45-byte `bashnav.tar.gz` was committed by accident.** `*.tar.gz` is
in `.gitignore` now.

### Reading a glyph as a picture

The shell draws a mine clearance vessel's day shapes as

    (O)---+---(O)

Two balls on the fore yard, and a `+` where the yard crosses the mast. The
browser port drew a **circle** at the `+`, so she showed four balls where Rule
27(f) gives three — one at the foremast head and one at each end of the fore
yard — and three balls is the whole of how she is identified. In SVG the mast
line already passes through the yard, so the crossing needs nothing drawn for
it at all.

> A character drawing contains glyphs that are STRUCTURE and glyphs that are
> SUBJECT, and the difference is not in the file. `+`, `|` and `\=====/` are
> the spar, the mast and the hull; `(O)` is the shape the Convention names.
> Port the data, never the drawing.

This is the second time this vessel's arrangement has been wrong, and both
times the Convention was the thing that settled it. `tests/run-tests.sh` has
checked her three greens hang on one yard with the mast between them, at
sixteen angles, since the first time; `tests/app-figures-check.sh` now asserts
the same property for her day shapes.

### A port can get every piece right and still be wrong

**The browser's fix used `solve_fix()`'s first pass.** `solve_fix()` linearises
the sight reduction about the position it is handed, so its offset is only as
good as that position. From a live DR it is right to 0.02 nm; from a DR five
degrees stale it is **43 nm out**. The shell never had this — `cmd_fix()`
re-reduces from its own answer until the correction falls under 0.02 nm — and
`plot.js` carried a header saying nothing was recomputed there, which was true
and beside the point: what it got wrong was the *driving* of the solver, not the
arithmetic. `body_at()`, `corrections()` and `reduce_sight()` agreed with the
awk to nine decimals the whole time, so every number on the screen was right
except the one a navigator plots, and only when the DR was poor — which is when
you take sights.

> A module diff proves the arithmetic. Only a whole case, from a spread of
> starting positions, proves the answer. And the loop that drives the solver
> belongs in **one** place: `converge_fix()` now lives in `engine.awk` and both
> `cmd_reduce()` and the harness call it, because a convergence retyped into a
> test agrees with itself.

**The planets' horizontal parallax was zero in the JS**, under a comment
claiming the awk multiplied it by zero. The awk does not — `planet_pos()` sets
`P_HP = 0.14656667/d`, with a paragraph above it arguing for applying it to all
four planets rather than to the two the almanac tabulates. 0.08' on a Venus
sight at 14°, more when she is close. The rule for this port is *data lifted,
never retyped*; this was retyped, got it wrong, and then wrote the mistake down
as if it were the source. **A comment asserting what the other implementation
does is worth nothing — go and read it.**

---


## `row()` sets `textContent`, so write the character, not the entity

Every table on these pages is built by a helper that assigns `textContent`.
That is the right choice — it cannot inject markup — and it means an HTML
entity in the string arrives on screen as `&mdash;`, spelled out.

Write `—`, or `\u2014`. The files are UTF-8 and have been all along, and a
real em dash inside an `innerHTML` string renders exactly the same as the
entity would — so there is no case where the entity is the better spelling.

`tests/entity-check.awk` enforces it. It allows two things: a string whose
statement mentions `innerHTML`, and any line containing `replace(`, which is
the escaping idiom — `replace(/&/g, "&amp;")` exists to *produce* entities
from text on its way into markup, and is correct.

## Third-party code: one file, and the rules that keep it to one

`docs/web/vendor/jsQR-1.4.0.js` is the only code in this repository that was
not written for it. Everything about how it is handled is a rule, not a habit.

1. **Nothing calls it directly.** `docs/web/shared/qr.js` is the only caller.
   Replacing the decoder is then a change to one file instead of a search.
2. **It is vendored, never fetched.** A `<script src="https://…">` is a tool
   that stops working at sea, which is the one place it has to work.
3. **It is byte for byte as published, and its checksum is in the suite.**
   Editing it in place would also mean, under Apache 2.0, carrying a notice
   that we changed it — so don't: wrap it, or take a new release properly.
4. **Its licence and its attribution travel with it** — `LICENSE-jsQR.txt`
   beside the file, jsQR named in `NOTICE`. The suite checks the second,
   because an obligation that depends on remembering is one that gets dropped.
5. **The version is in the filename,** so an upgrade is visible at every place
   that loads it rather than being a silent change to a file whose name stayed
   the same.

**Why it is here at all**, since the repository's premise is that you can read
what you are trusting: `BarcodeDetector` is absent on iPadOS 26.6.1 and on
iOS — measured on Larry's own devices, not read in a table — so reading the
watch's codes means a decoder in the page. Writing one was the alternative and
the specification is finite; what cannot be written from a specification, or
tested from a fixture, is the part before it starts — binarising a frame with
glare on a crystal, locating a code held at an angle, holding focus at 15 cm,
a dim red screen at three in the morning. That is what was taken, and
`docs/web/vendor/README.md` says so in full.

## Publishing notes

Larry pushes from a Mac using GitHub Desktop. Things that have gone wrong:

- The repo was first created as **`basinav`** (a typo). "Repository not found"
  was literally true and read like an auth failure for an hour.
- A PAT needs the **`workflow` scope** as well as `repo`, or any push touching
  `.github/workflows/` is rejected.
- git discards a valid token when the operation fails for an unrelated reason,
  so the next attempt looks like a credentials problem and is not.
- **Extracting a tarball over a folder adds files but never removes them.**
  Renamed files leave their old names behind — `docs/img/` on GitHub still
  carries five orphans from before a rename. Deletions have to be made
  explicitly on his side.
- macOS Archive Utility does not merge into an existing folder; it creates
  `bashnav 2`. Worth checking when a change seems not to have arrived.

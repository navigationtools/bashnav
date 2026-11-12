# drill — a study machine with no material in it

Sections, recall practice, and a graded test that opens the next section
when you pass it. It ships **empty**: no questions, no reference text,
nothing of anybody's. You load a content pack from your own device, it
is read here in the browser, and it never leaves the device it is on.

    index.html     the sections, the reference, the drill, the diagnostic
    drill.js       the app
    drill.css      two modes, dark and night
    sample.drillpack.json   a small pack about the tool itself
    ../tests/      the verification

## Why it is built this way

Material somebody else owns can be studied without ever being published.
The machine is published; the material is yours and stays yours.

That also makes the permission conversation a short one. You can show
somebody the machine running, empty, and say "your material drops in as
a pack — here is what it looks like loaded." If they say yes, publish
the pack or hand it to them to maintain. If they say no, nothing needs
undoing.

It needs a real web address. Saved progress, offline use and a
home-screen icon all depend on the page having an origin, and a file
opened straight out of a Files app has none of them — on iOS it will not
run at all. That was measured on the device, not assumed.

## The sample pack

`sample.drillpack.json` is served beside the app, and **Try the sample
pack** on the empty screen loads it. Four sections, twenty-five
questions and a pass mark, all about this tool — enough to see the
sections open in order, a graded test marked, an ordering question and
the diagnostic, without anybody having written a pack first.

It is fetched and then handed to the same `validate()` and the same
store as a pack picked off the device: one way in, whatever the source.
A demonstration path of its own would be a second thing to get wrong,
and would stop proving that the format works. The worker precaches it,
so the button works with the antenna down like the rest of the machine.

Loading your own pack replaces it, and it replaces whatever was held
before — so it is worth a word of warning before handing the tool to
somebody mid-study.

## Three rules it keeps

**No answer is in the page until it is asked for.** Not hidden, not
collapsed, not transparent — absent from the DOM. An answer you can
reveal with a long press, or find by zooming, is an answer you have
read, and then you have not recalled anything. The test asserts the
answer text is absent before the reveal, not merely invisible.

**The reference is never gated.** Only the graded test waits its turn.
Being locked out of a procedure you are carrying the thing for would be
the one failure that actually matters, and it would happen at the worst
moment. Every section's reference is readable from the first launch,
including sections you have not reached.

**"Not studied" is not "weak".** The diagnostic reports a gap as a gap
and never averages it in as a zero. A gap that looks like a score gets
you a confidently wrong answer about your own readiness.

## Two kinds of question

A question **with** an answer can be asked as multiple choice and marked
objectively, so it can carry a graded test. The wrong options are drawn
from the same section, preferring the same kind of question, which makes
them the plausible confusions rather than obvious throwaways — a test
you can pass by elimination has not tested anything.

A question **without** an answer is a recall prompt: you answer from
memory, then check yourself against the reference and mark it. Harder,
and the better of the two for learning, but self-marked, so it opens
nothing. It is still recorded, because that is how the diagnostic knows
a section has been worked rather than merely read.

Every question shows its source — part, subsection, row — so any answer
can be checked against the reference. A question whose answer is wrong
is then findable rather than lurking. A pack can mark a question
`"kind": "hand"` and the app will say so, because a hand-written
question carries somebody's reading of the material rather than a lift
from it.

## The pack format

One JSON file. Version 1:

```json
{
  "format":    "bashnav-drill-pack/1",
  "title":     "Shown at the top of every screen",
  "note":      "A standing notice, shown beside the title",
  "built":     "2026-10-20",
  "pass":      80,
  "sections": [
    { "id":    "alpha",
      "title": "First things",
      "parts": ["Part 1 — First things"],
      "html":  "<h2 class=\"part\">Part 1</h2><p>The reference text…</p>" }
  ],
  "questions": [
    { "section": "alpha",
      "q":       "What is checked first?",
      "a":       "The thing is checked first",
      "kind":    "fact",
      "where":   { "part": "Part 1", "sub": "The chain", "row": "1" } },
    { "section": "alpha",
      "q":       "Three of these are on the checklist. Which one is not?",
      "a":       "The item that belongs to a different checklist",
      "ch":      ["The first item on this checklist",
                  "The second item on this checklist",
                  "The third item on this checklist"],
      "kind":    "oddone",
      "where":   { "part": "Part 1", "sub": "Preparation", "row": "checklist" } }
  ],
  "back": "<p>Appendices, sources, anything that follows.</p>"
}
```

- `pass` is the mark that opens the next section. Default 80.
- `built` and `id` are shown on the home screen, and a pack builder should
  set both. Loading a pack **replaces** the one in storage, so without
  something on screen to tell them apart a rebuilt pack looks exactly like
  the one it replaced — and a question you were told was fixed comes round
  again from the old pack. The date alone is not enough: rebuilding twice
  in a morning is the normal case while the questions are being worked on,
  so `id` should be a short digest of the content.
- `sections` are drilled in the order given.
- `html` is rendered as the reference. Headings, lists, tables and
  blockquotes are all styled; wide tables scroll inside their own box.
- `a: ""` makes it a recall prompt.
- `kind` is free text. `hand` is the only one the app treats specially.
- `where` is shown as the source line. All three fields are optional.
- `ch` is optional: exactly three wrong options that travel with the
  question. See below.
- `seq` and `extra` make it an **ordering** question instead: `seq` is the
  steps in their correct order, `extra` holds at least one step that does
  not belong. See below.

A pack whose questions point at sections it does not contain is
**refused whole**, rather than loaded with silent holes in it. So is one
whose question offers its own answer as a wrong option.

### `ch` — when a question must name its own wrong options

Normally the app builds the three wrong options from the other answers in
the same section, preferring ones of the same `kind`. That works while the
answers are mutually exclusive, and breaks when they are not.

*Which of these is on the hoist preparation checklist?* drawn from the
section pool can offer three more items **off the same checklist**: four
right answers and one mark. A question like that has to carry its own wrong
options, and when `ch` is present the app uses exactly those three and its
own answer, and nothing from the pool.

A wrong option should still be real. The packs built so far use the
document's own words in the wrong place — a genuine item from a
neighbouring checklist, or a genuine step of this sequence in the wrong
position — rather than invented text. On procedural material that matters:
a plausible wrong instruction is memorable precisely because it is
plausible, and unlike every other answer in the pack it has no source row
to check it against.

Two rules the app enforces at load time, because neither failure is
visible while drilling:

- a wrong option that equals the answer is a question with two right
  options, and the mark it gives is wrong either way;
- the same wrong option twice is a question with three options wearing
  four labels.

### `seq` and `extra` — put these in order

A four-option question can test which step **belongs**. It cannot test that
you know the **order**, because naming a position — "what is number four" —
asks about the layout of the page rather than the procedure.

An ordering question offers the steps scrambled with at least one step from
a different procedure mixed in. You tap them into order and leave the
intruder alone.

```json
{ "kind":  "sequence",
  "q":     "In The reef — put these in the order they happen.",
  "a":     "Lower → Set the LUFF → Set the FOOT",
  "seq":   ["Lower", "Set the LUFF", "Set the FOOT"],
  "extra": ["All lines tidied"] }
```

- `seq` needs at least three steps, all distinct.
- `extra` needs at least one, and none of them may also be in `seq` — that
  would mark you wrong for leaving out a step that really does belong.
- `a` is the order as text, for the score and review screens.
- Marked **all or nothing**. Partial credit would make a near miss on a
  sequence look like competence, and on a MOB chain a near miss is a
  different outcome.

Keep `seq` short. Five steps is about the limit for ordering by thumb, and
five consecutive steps of a longer procedure still happen in that order, so
a shortened question is still a true one.

### A section needs enough graded questions to be fair

Five is the practical floor: at four, one lucky guess is a quarter of
the mark. A pack builder should check that before shipping, because the
app will happily make a three-question test and the gate will mean
nothing.

## Verifying

    sh docs/web/tests/run-drill-web.sh

The harness builds its **own** synthetic pack, so the test in this
repository carries nobody's material either. Pass a pack as an argument
to run the same checks against a real one.

It also checks that **the service worker cache version matches `BUILD` in
`drill.js`**. The worker is cache-first, so an installed copy keeps serving
the `drill.js` it already cached, and the browser only reinstalls the worker
when `sw.js` itself changes. Shipping a fix without touching `sw.js` ships
nothing to anyone who has already used the tool — and to them it looks like
the fix did not work. Bump `CACHE` and `BUILD` together; the test is there
so it is checked rather than remembered.

It drives the whole thing: ships-empty, pack load, a damaged pack
refused, a question's carried wrong options being the only ones offered,
a pack offering its answer as its own wrong option refused, every
four-option question in the loaded pack well formed, the gate, a locked
section's reference still readable, the
answer absent from the DOM before the reveal, failing leaves the next
section locked, passing unlocks it, progress surviving a reload, the
diagnostic separating unstudied from weak, the document view and its
search, and no sideways scroll at 744, 390 and 320 px.

One fault it found is worth repeating because it is a trap in any UI
test: the harness located the Next button by matching the word "next"
in the button text, and a real pack had an answer reading *"It
authorizes the next action"*. It clicked the answer instead, the
question never advanced, and the page hung. The advance, reveal and
self-mark buttons now carry `data-advance`, `data-reveal` and
`data-mark-self`, so nothing has to match prose — and the loops have a
guard so a stuck drill fails loudly instead of hanging.

## What it is not

**A study aid, not the source.** Where the app and the document it was
built from differ, the document is right. Where the document and
whoever is responsible for the real procedure differ, they are right
and the document is wrong.

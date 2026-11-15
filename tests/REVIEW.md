# Reviewing colregs before release

The test suite checks that the program **works**. It cannot check that
what the program **says about the rules is true**. Those are different
problems and they need different tools.

## What the machine already checks

`tests/run-tests.sh` — invariants, under four awks and two shells:

- every drill marks its own correct answer as correct
- every lights question has exactly one right answer (600 checked)
- the light tables satisfy Annex I where Annex I is geometry: sidelights
  paired, level, opposite and no higher than 3/4 of the masthead light;
  arcs adding to a full circle with no gap; no two lights in the same place
- a bearing drawing away from your bow never crosses ahead (400 geometries,
  every run)
- Ekelund recovers the range it was built from
- Red/Green, the words and the side agree at every degree of the circle
- colour is present on a terminal and absent when piped
- the licence the programs claim is the licence in LICENSE and NOTICE

`tests/golden.sh` — every deterministic screen the tools produce, about
26,000 lines, committed. A change to any of it shows up as a readable diff
that has to be accepted on purpose. `--update` rewrites them.

## What the machine cannot check, and who has to

Nothing above can tell you whether *Rule 27 really says that*, whether a
mine clearance vessel really shows those lights, or whether the vessel that
gives way in encounter 14 is the one the Convention says gives way. Those
are judgements against a document, and they need a person holding it.

The review pack lists every such claim, generated from the same tables the
code runs on so it cannot drift from the program:

    awk -f src/colregs/engine.awk -f src/common/bearing.awk -f src/colregs/contacts.awk \
        -f docs/web/gen/jsonesc.awk \
        -f tests/review-pack.awk -v cmode=plain </dev/null

In priority order — highest consequence first:

| | what | n | check against |
|---|---|---|---|
| 1 | **Encounter verdicts** — who gives way, what to do | 28 | Rules 8–19 |
| 1 | **Give-way calls from her lights** | 65 | Rules 12–18 |
| 2 | **The light tables** | 20 | Rules 20–31, Annex I |
| 3 | **Rules lesson answers** | 15 | the Convention |
| 3 | **Sound signals** | 15 | Rules 34–35, Annex III |
| 4 | **Day shapes** | 10 | Rules 24–30 |

Why that order: a wrong light table makes you misname a ship. A wrong
encounter verdict makes you **turn the wrong way**. The give-way calls sit
with the encounters because the same logic was written backwards once
during development and caught by hand, not by any test.

## Where the risk actually lives

- **Anything asserting an action.** "Stand on", "give way", "alter to
  starboard" — the program tells you what to do, and being wrong there is
  the whole reason a training aid can be dangerous.
- **Distractors that are also correct.** `colregs sigcheck` proves no two
  vessels look identical, so no lights question has two right answers. The
  encounters have no equivalent check: an option that is *also* defensible
  would mark a correct answer wrong. Worth an eye.
- **Paraphrase drift.** The lessons are paraphrases, not quotations. A
  paraphrase that is nearly right is worse than one that is obviously wrong.
- **What is missing.** No test can notice an absent vessel, an absent rule
  or an unmentioned exception. Only someone who knows the rules will see
  the hole.

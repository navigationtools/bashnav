# DRILL quick reference
**Build {{VERSION}}** — the machine; the material is yours.

## Using it

| | |
|---|---|
| **The reference** | the pack's text, always open, including for locked sections |
| **Practice** | recall prompts — no choices, you check yourself |
| **The test** | graded questions, marked, with the answer and its source |
| **Where am I weak?** | a diagnostic across everything you have worked |

**Sections open in order:** the next one opens when the one before it is
passed. The pass mark is the pack's own, **80 per cent** if it does not say.
**Studied means worked**, not opened: reading the reference does not count.

## A pack

One JSON file, `*.drillpack.json`. Loaded from the page, validated whole, kept
in this browser. Loading one **replaces** the one held.

```json
{ "format": "bashnav-drill-pack/1", "title": "...", "built": "2026-11-12",
  "pass": 80,
  "sections":  [ { "id": "s1", "title": "...", "html": "<p>...</p>" } ],
  "questions": [ { "section": "s1", "q": "...", "a": "...",
                   "ch": ["wrong", "also wrong"],
                   "where": { "part": "...", "sub": "...", "row": "..." } } ] }
```

| | required | |
|---|---|---|
| `format` | yes | must begin `bashnav-drill-pack/` |
| `sections` / `questions` | yes | both non-empty |
| `title`, `note`, `built`, `pass`, `back` | no | `built` is how you tell a rebuilt pack from the one it replaced |
| section `id`, `title` | yes | `id` unique; `html` optional, it is the reference |
| question `section`, `q` | yes | `section` must name a section in the pack |
| question `a` | no | **its presence makes the question graded**; without it, a recall prompt |
| question `ch` | no | wrong options: none equal to `a`, none repeated |
| question `seq` + `extra` | no | ordering: 3+ unique steps, and at least one that does not belong |
| question `where`, `kind` | no | the citation; `kind: "hand"` marks a hand-written question |

## Refused, and the pack is rejected whole

1. no `format`, no sections, no questions;
2. a section with no `id` or `title`, or two sections sharing an `id`;
3. questions pointing at sections the pack does not contain;
4. a question offering **its own answer as a wrong option** — two right answers;
5. the same wrong option twice;
6. an ordering question with fewer than three steps, a repeated step, no
   intruder, or an intruder that is really part of the sequence.

## Writing one

1. **Generate it** from the source material; hand-maintained JSON drifts.
2. **Set `built`** every time.
3. **Cite with `where`**, so an answer can be settled.
4. **Keep the reference complete** — it is the part that is carried.

## Remember

Nothing is uploaded. The pack and your progress live in one browser on one
device, and clearing site data clears them. **The pack file itself is the
backup.**

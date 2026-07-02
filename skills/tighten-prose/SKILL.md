---
name: tighten-prose
description: >-
  Tightens prose by cutting filler, hedging, and redundancy without changing
  meaning or voice. Apply whenever asked to edit, tighten, shorten, or "make
  this read better" — for emails, docs, READMEs, posts, or any written passage.
  Removes throat-clearing openers, empty intensifiers, and wordy phrases that a
  strong editor would cut, while preserving the author's tone and every concrete
  claim. Triggers on any request to edit, revise, condense, or improve writing.
---

# Tighten prose: cut what carries no weight

Most drafts are 15-30% longer than they need to be. This skill removes the words
that add length without adding meaning, so the writing gets faster to read while
saying exactly the same thing. **The default move is to cut, not rewrite** —
preserve the author's voice, structure, and every concrete claim.

## The test for every word

Before keeping a word or phrase, ask: *does the sentence lose meaning without it?*
If not, cut it. Tightening is subtraction first; only rephrase when a cut would
leave the sentence broken.

## What to cut

**Throat-clearing openers** — get to the point:

```
It is important to note that the API returns JSON.
→ The API returns JSON.

I just wanted to quickly reach out to let you know the report is ready.
→ The report is ready.
```

**Empty intensifiers and hedges** — `very`, `really`, `quite`, `actually`,
`basically`, `just`, `sort of`, `I think`, `in order to`:

```
This is a very simple change that basically just updates the config.
→ This change updates the config.
```

**Redundant pairs and wordy phrases:**

```
each and every            → each   (or every)
at this point in time     → now
due to the fact that      → because
has the ability to        → can
in the event that         → if
```

**Restating the obvious** — sentences that only rephrase the previous one. Keep
the stronger version, delete the echo.

## What to preserve

- **Voice and register.** A casual note stays casual; a formal spec stays formal.
  Don't neutralize personality into corporate gray.
- **Concrete claims, numbers, names, and caveats.** Never drop a qualifier that
  changes correctness ("usually", "up to", "except on Windows"). Cutting filler
  is not the same as cutting precision.
- **Intentional emphasis and rhythm.** A short punchy sentence, a deliberate
  repetition for effect — leave it.
- **Technical terms.** Don't "simplify" a precise term into a vaguer everyday word.

## How to deliver the edit

- Return the tightened version first.
- If the passage is long or the changes are substantive, follow with a brief note
  of what you cut and why (one or two lines) so the author can judge.
- When a cut is genuinely a judgment call (it might drop nuance the author wants),
  flag it rather than making it silently.
- Don't pad the response with praise or preamble — apply the same standard to your
  own reply.

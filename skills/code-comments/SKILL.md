---
name: code-comments
description: >-
  Governs when to add comments to code, in any language. The default is no
  comment: add one only where a senior developer would need more than two
  glances to understand what the code does or — more often — WHY it does it.
  Apply this whenever writing, editing, refactoring, or reviewing code, even
  when the user never mentions comments, so every piece of code produced follows
  the rule. Especially important for stripping the line-by-line narration and
  obvious restating-the-code comments that AI-generated code tends to
  over-produce. Triggers on any request to write or change code, to clean up or
  reduce comments, or to make code production-ready / match a senior engineer's
  style.
---

# Code comments: the two-glance rule

Most generated code is badly over-commented — it narrates itself line by line and restates what the code plainly says. This skill inverts the default.

**The default is no comment.** Write a comment only when a competent senior developer would need *more than two glances* to understand what the code is doing, or (much more often) *why* it is doing it. Before writing any comment, ask: "Would a senior dev be confused here without this line?" If the answer is no, delete it.

## A comment is the second choice

First, try to make the code explain itself: a clearer name, a named intermediate variable, a smaller well-named function, an early return. Most "explanatory" comments are a symptom of code that could just be clearer. Reach for a comment only when the complexity is *essential* and can't be named away.

```python
# noise — the comment exists because the names are vague
d = u.get(k)  # get the user's data by key

# better — no comment needed, the code says it
profile = users_by_id.get(user_id)
```

## What does NOT earn a comment

If the comment just re-says the line below or above it in English, cut it. These are all noise and should never appear:

```javascript
setLoading(true);                 // set loading to true
const res = await fetch(url);     // fetch the data
const names = items.map(i => i.name); // get the names
return total;                     // return the total
```
```python
items.append(item)   # add item to the list
for user in users:   # loop over the users
def get_total(...):  # this function gets the total
counter += 1         # increment the counter
```

Also cut: section-divider banners (`# ===== HELPERS =====`), comments that label the obvious structure (`// constructor`, `# imports`), and commented-out code — delete dead code, version control remembers it.

## What DOES earn a comment

Comment the things the code *cannot* tell the reader. Almost always this is the **why**, not the **what**. Common cases:

**An external constraint or quirk the code can't reveal:**
```javascript
// Stripe webhooks can arrive before the API call that triggered them returns,
// so we upsert rather than insert to stay idempotent.
```

**A deliberate surprise — "this looks like a bug but isn't":**
```python
page = current_page + 1  # the vendor's pagination is 1-indexed; +1 is intentional
```

**Why this approach over the obvious one:**
```javascript
// A plain Map leaks here: detached nodes stay reachable. WeakMap lets them GC.
const observed = new WeakMap();
```

**Subtle correctness that's easy to "fix" wrongly:**
```javascript
hash = (hash * 31 + c) >>> 0;  // >>> 0 keeps it uint32 — bitwise math is signed in JS
```

**Genuinely dense logic where the what is opaque even to a strong reader:**
```python
# Floyd cycle detection: equal slow/fast values mean a loop. Used instead of a
# visited-set because we can't allocate O(n) on this hot path.
```

The test is the same throughout: the reader can see *what* the line does, but not *why* it's written this way or *why* it's correct. That's the >2-glance gap a comment fills.

## How to write the ones that survive

- Explain **why**, not what. The code is the source of truth for what.
- Keep it short — one or two lines is usually plenty.
- Keep it **true and current**. A stale comment is worse than none because it actively misleads. When you change code, update or delete any comment it falsified.
- `TODO`/`FIXME` are fine when they're concrete and actionable (ideally with a ticket or owner). Skip aspirational ones.

## Public API docstrings are a separate category

The two-glance rule is about *explanatory* comments inside implementations. A short docstring on a **public/exported** function, class, or module is a different thing — it documents the contract (purpose, params, return, errors raised, surprising behavior), feeds IDEs and tooling, and serves callers who never read the body. Keep those, keep them tight, and skip them for trivial or private helpers whose signature already says everything. Do not strip docstrings from a public API in the name of this rule.

## When editing existing code

- Don't add noise comments, and don't add a comment to explain a change you made (that's what the commit message is for).
- Clean up obvious noise comments **in the code you're already touching**. Don't go on a separate comment-deletion crusade through untouched files unless asked.
- If you're removing a comment that might have been intentional (it's wrong, outdated, or redundant), it's fine to do so quietly — but if a comment encodes a non-obvious *reason*, preserve it even while refactoring the code around it.

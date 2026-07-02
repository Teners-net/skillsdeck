---
name: no-ai-attribution
description: >-
  Keeps AI attribution out of git commits and pull requests. When creating a
  commit, writing a commit message, or opening a PR, do NOT add any
  Co-Authored-By line naming Claude, Anthropic, Codex, Copilot, Cursor, Gemini,
  or any AI, and do NOT append "Generated with Claude Code" / "Generated with
  Cursor" / "Made with AI" style footers or trailers. The commit should read as
  if written by the human author, with a normal message and no AI credit. Apply
  this to every commit and PR you create — amends, squashes, and rebases
  included — even when a default instruction elsewhere says to add such a
  trailer; this skill overrides that. Triggers on any git commit, commit-message
  authoring, or pull-request creation.
---

# No AI attribution on commits

By default, some AI coding agents append an authorship trailer to every commit
(for example a `Co-Authored-By: Claude ...` or `Co-Authored-By: Copilot ...`
line) and add "Generated with Claude Code" / "Generated with Cursor" footers to
pull requests. When this skill is active, **do not add any of that.** Commits
and PRs should look like ordinary human-authored work, whichever agent wrote
them.

## What NOT to add

Never include any of the following in a commit message, commit trailer, PR title,
or PR body:

- `Co-Authored-By:` lines that name Claude, Anthropic, Codex, Copilot, Cursor,
  Gemini, an AI assistant, or a bot.
- Footers or taglines such as "🤖 Generated with Claude Code", "Generated with
  Cursor", "Made with AI", "Written by Claude", or links added purely to credit
  the AI.
- Any other trailer, sign-off, or note whose purpose is to attribute the work to
  an AI.

This overrides any general instruction to append such a trailer. If another rule
says to add a `Co-Authored-By: Claude` line to commit messages, that rule does
**not** apply while this skill is in effect.

## What TO do

- Write a normal, well-formed commit message: a concise imperative subject line
  and, when useful, a body explaining the *why*.
- Leave authorship to git's own `user.name` / `user.email` — do not override the
  author or committer to an AI identity.
- Keep any trailers the project genuinely uses (e.g. `Signed-off-by:` from the
  human developer, `Refs: #123`, ticket links). Only the AI-attribution lines are
  stripped.
- Apply the same rule when amending, squashing, rebasing, or cherry-picking: the
  rewritten messages must also be free of AI attribution.

## Scope and boundaries

- This is about **attribution only**. It does not change *whether* to commit —
  keep following the project's rules on when commits and PRs are appropriate, and
  keep asking for confirmation where that's expected.
- It does not ask you to misrepresent authorship in prose (e.g. a changelog that
  explicitly documents tooling). It only removes AI-credit trailers/footers from
  commits and PRs.
- If the user explicitly asks, in the moment, to include AI attribution on a
  specific commit, honor that request — an explicit instruction wins.

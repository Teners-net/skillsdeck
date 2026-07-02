# Authoring a skill

A skilldeck skill is a self-contained folder under [`skills/`](../skills/). One
skill = one folder = one pull request. You never edit shared files like the
marketplace manifest — those are generated from your folder (run `npm run generate`).

## The folder contract

```text
skills/<name>/
├── SKILL.md        # required — the Agent Skill your coding agent reads
├── skill.json      # required — skilldeck catalog metadata
├── README.md       # optional — longer docs / examples
├── references/     # optional — extra files the skill points the agent to
├── scripts/        # optional — helper scripts the skill invokes
└── assets/         # optional — images or data used by the skill
```

`<name>` must be **kebab-case** (`^[a-z0-9]+(-[a-z0-9]+)*$`) and must match both the
`name` in `SKILL.md` frontmatter and the `name` in `skill.json`.

## `SKILL.md`

This is the file your coding agent reads (Claude Code, Cursor, and others). It
has YAML frontmatter followed by markdown instructions:

```markdown
---
name: your-skill
description: >-
  What the skill does and, crucially, WHEN it should trigger. The agent uses this
  text to decide whether to activate the skill, so name the situations, verbs,
  and file types that should trigger it. Write it in the third person.
---

# Title

The instructions themselves...
```

Keep the frontmatter to just `name` and `description` — all catalog metadata
(author, category, tags, version) goes in `skill.json`, not here. Write the
description to trigger well: describe the task shapes and phrasings a user might
use, not only what the skill contains. See
[`code-comments`](../skills/code-comments/SKILL.md) and
[`tighten-prose`](../skills/tighten-prose/SKILL.md) for reference-quality examples.

## `skill.json`

Catalog metadata, validated against [`schema/skill.schema.json`](../schema/skill.schema.json).

```json
{
  "name": "your-skill",
  "description": "One concise line for the catalog and search.",
  "category": "writing",
  "version": "0.1.0",
  "author": { "name": "Your Name", "github": "your-handle" },
  "license": "MIT",
  "tags": ["short", "search", "keywords"]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Matches folder + SKILL.md frontmatter. kebab-case. |
| `description` | yes | 10–200 chars. Concise; the long trigger text lives in SKILL.md. |
| `category` | yes | One of the taxonomy values below. |
| `version` | yes | Semver (`MAJOR.MINOR.PATCH`). Bump on every content change. |
| `author` | yes | `{ name, github?, url? }`. |
| `license` | yes | SPDX id, e.g. `MIT`, `Apache-2.0`, `CC-BY-4.0`. |
| `tags` | no | Up to 12 kebab-case keywords for search. |
| `homepage` | no | Link to fuller docs or source. |
| `compatibility` | no | Optional minimum agent version, e.g. `">=1.0.0"` (interpreted by Claude Code). |

## Category taxonomy

Pick the single best-fit `category`:

| Category | For skills about… |
| --- | --- |
| `coding` | Writing, reviewing, refactoring, or structuring code and repos. |
| `writing` | Prose: editing, tone, docs, emails, content. |
| `research` | Finding, reading, synthesizing, and citing sources. |
| `data` | Data analysis, SQL, spreadsheets, notebooks, visualization. |
| `devops` | CI/CD, infrastructure, deployment, containers, observability. |
| `productivity` | Planning, task management, note-taking, personal workflows. |
| `design` | UI/UX, visual design, design systems, accessibility. |
| `security` | Threat modeling, secure coding, auditing, incident response. |
| `meta` | Skills about writing skills, or about steering the agent itself. |

Use `tags` for the finer-grained detail (framework, language, tool) that a single
category can't capture.

## Before you open a PR

1. Confirm the folder name, `SKILL.md` `name`, and `skill.json` `name` all match.
2. Run the validator locally (added in the tooling phase): `npm run validate`.
3. Regenerate derived files if the tooling asks you to: `npm run generate`.
4. Make sure your skill follows the [review policy](review-policy.md) — nothing
   destructive, no secret exfiltration, no weakening of safety controls.

# Claude Code Skills

A small catalog of reusable [Claude Code](https://code.claude.com/docs) skills. It works two ways:

- **As a plugin marketplace** — the native, maintainable route. Users add the marketplace once and install any skill with a choice of scope (global or per-project). They get updates via `git pull` semantics.
- **As a one-command script** — `install.sh` copies skill folders straight into a skills directory. No plugin system involved; good for a quick, no-frills install.

## Skills

| Skill | What it does |
| --- | --- |
| `code-comments` | Comment only where a senior dev would need more than two glances; default to none. |
| `laravel-services-support` | Laravel: external integrations go in `app/Services`, internal abstractions in `app/Support`. |
| `project-conventions` | House rules for a Laravel + Inertia + React app — component reuse-first, mandatory tests, type locations. |
| `uat-tdd-e2e` | Implement a feature in one pass: write a UAT, drive it with TDD, validate end-to-end, then report. |

---

## Option A — Plugin marketplace (recommended)

One-time setup per machine:

```bash
claude plugin marketplace add Teners-net/openskills
```

Then install any skill, choosing where it applies:

```bash
# Global — available in all your projects (this is the default scope)
claude plugin install code-comments@openskills --scope user

# Project — recorded in this repo's .claude/settings.json and shared with the team
claude plugin install project-conventions@openskills --scope project
```

Install several at once:

```bash
for s in code-comments laravel-services-support uat-tdd-e2e; do
  claude plugin install "$s@openskills" --scope user
done
```

You can also do all of this interactively with `/plugin` inside a Claude Code session (Discover → pick a skill → choose scope).

Keep skills current after the repo changes:

```bash
claude plugin marketplace update openskills
```

A plugin's skill is namespaced as `<plugin>:<skill>` (e.g. `code-comments:code-comments`); it still auto-triggers from its description, and you can invoke it explicitly with that name.

### Make a project pull these automatically

Commit this to a repo's `.claude/settings.json` and teammates are prompted to install the marketplace when they trust the folder:

```json
{
  "extraKnownMarketplaces": {
    "openskills": {
      "source": { "source": "github", "repo": "Teners-net/openskills" }
    }
  },
  "enabledPlugins": {
    "project-conventions@openskills": true,
    "code-comments@openskills": true
  }
}
```

---

## Option B — One-command install script

From a clone:

```bash
git clone https://github.com/Teners-net/openskills.git
cd REPO
./install.sh --all --global          # or: ./install.sh code-comments uat-tdd-e2e --project
```

Or as a true one-liner (set the URL to your repo first; see Setup):

```bash
curl -fsSL https://raw.githubusercontent.com/Teners-net/openskills/main/install.sh | bash -s -- --all
```

Flags: `--all`, `--global` (default → `~/.claude/skills`), `--project [DIR]` (→ `DIR/.claude/skills`), `--list`, `--help`. With no arguments and a terminal, it shows a numbered menu.

This route just drops `SKILL.md` folders into the skills directory — no versioning or auto-update. If Claude Code is already open, reload the window so it watches a newly created skills directory.

---

## Setup (for the repo owner)

1. Create a GitHub repo and push these files (keep `.claude-plugin/marketplace.json` at the root).
2. In `.claude-plugin/marketplace.json`, set `owner.name`, and rename `name` (`openskills`) to whatever you like. Avoid the reserved names listed in the [marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces) (e.g. anything `anthropic-*` or `claude-*`).
3. In `install.sh`, set `REPO_URL` to your repo (or callers can export `SKILLS_REPO_URL`).
4. Replace `Teners-net/openskills` throughout this README with your `owner/repo`.
5. Validate before sharing:

   ```bash
   claude plugin validate .
   ```

### Versioning

Each plugin here pins `version: 0.1.0`. Bump that field whenever you change a skill, or delete the `version` fields entirely — for a git-hosted marketplace, omitting `version` makes every commit a new version so users always get the latest on update.

## Adding a new skill

1. Create `skills/<name>/SKILL.md` (a `name` and `description` in the YAML frontmatter, then the instructions).
2. Add a matching entry to the `plugins` array in `.claude-plugin/marketplace.json` (`source: "./"`, `strict: false`, `skills: ["./skills/<name>"]`).
3. Add `<name>` to the `SKILLS=(...)` list in `install.sh`.

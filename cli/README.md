# skilldeck CLI

Search, install, and update [Claude Code](https://code.claude.com/docs) skills
from the [skilldeck](https://github.com/Teners-net/skilldeck) catalog.

## Usage

No install required — run it with `npx`:

```bash
npx skilldeck search testing
npx skilldeck list --category writing
npx skilldeck info uat-tdd-e2e
```

Or install it globally:

```bash
npm install -g skilldeck
skilldeck search testing
```

## Commands

| Command | What it does |
| --- | --- |
| `search [query]` | List skills matching a query (name, description, tags). |
| `list [--category <cat>]` | List all skills, optionally filtered by category. |
| `info <name>` | Show a skill's details and install commands. |
| `install <name...>` | Copy skills into a Claude Code skills directory. |
| `update (--all \| <name...>)` | Re-install recorded skills whose version is newer. |
| `marketplace` | Print the native `claude plugin` commands. |

### Install scope

```bash
# Global — available in all your projects (default)
skilldeck install code-comments --global

# Project — into ./.claude/skills, shareable with your team
skilldeck install project-conventions tighten-prose --project .
```

`update` re-installs any recorded skill whose catalog version is newer than what
you have:

```bash
skilldeck update --all
skilldeck update code-comments
```

After installing, reload the Claude Code window so it picks up new skills.

## Relationship to the native marketplace

This CLI complements Claude Code's built-in plugin marketplace; it doesn't
replace it. Run `skilldeck marketplace` to get the equivalent
`claude plugin marketplace add …` / `claude plugin install …` commands if you
prefer the native path (which also handles updates via `git pull` semantics).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SKILLDECK_REGISTRY` | Path or URL to a `registry.json` to use instead of the default. |
| `SKILLDECK_SOURCE_DIR` | Local checkout to copy skills from (skips the git clone). |
| `SKILLDECK_REPO` | Git URL to clone skills from. |

Installed versions are recorded in `~/.skilldeck/installed.json`.

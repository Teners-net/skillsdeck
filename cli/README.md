# skilldeck CLI

Search, install, and update **[Agent Skills](https://code.claude.com/docs/en/skills)**
(`SKILL.md`) from the [skilldeck](https://github.com/Teners-net/skilldeck) catalog.
Vendor-neutral — installs into whatever directory your agent reads (Claude Code,
Codex, Cursor, and others).

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
| `install <name...>` | Copy skills into an agent's skills directory. |
| `update (--all \| <name...>)` | Re-install recorded skills whose version is newer. |
| `marketplace` | Print Claude Code's native `claude plugin` commands. |

### Install scope

```bash
# Global — available in all your projects (default)
skilldeck install code-comments --global

# Project — into the agent's project dir, shareable with your team
skilldeck install project-conventions tighten-prose --project .

# A different agent by name
skilldeck install code-comments --agent codex    # → ~/.agents/skills
skilldeck install code-comments --agent gemini   # → ~/.gemini/skills

# Any other agent — install straight into its skills directory
skilldeck install code-comments --dir ~/.config/agent/skills
```

`--agent` maps to a known agent's skills directory; use `--dir <path>` for anything else:

| `--agent` | User directory | Project directory | Agent |
| --- | --- | --- | --- |
| `claude` (default) | `~/.claude/skills` | `<project>/.claude/skills` | Claude Code |
| `codex` | `~/.agents/skills` | `<repo>/.agents/skills` | OpenAI Codex |
| `gemini` | `~/.gemini/skills` | `<project>/.gemini/skills` | Gemini CLI |

`update` re-installs any recorded skill whose catalog version is newer than what
you have:

```bash
skilldeck update --all
skilldeck update code-comments
```

After installing, reload your agent so it picks up new skills.

## Relationship to Claude Code's native marketplace

This CLI is vendor-neutral and works with any agent that reads a skills
directory. For Claude Code specifically, it complements the built-in plugin
marketplace rather than replacing it. Run `skilldeck marketplace` to get the
equivalent `claude plugin marketplace add …` / `claude plugin install …`
commands if you prefer the native path (which also handles updates via
`git pull` semantics).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SKILLDECK_REGISTRY` | Path or URL to a `registry.json` to use instead of the default. |
| `SKILLDECK_SOURCE_DIR` | Local checkout to copy skills from (skips the git clone). |
| `SKILLDECK_REPO` | Git URL to clone skills from. |

Installed versions are recorded in `~/.skilldeck/installed.json`.

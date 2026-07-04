# skillsdeck CLI

Search, install, and update **[Agent Skills](https://code.claude.com/docs/en/skills)**
(`SKILL.md`) from the [skillsdeck](https://github.com/Teners-net/skillsdeck) catalog.
Vendor-neutral — installs into whatever directory your agent reads (Claude Code,
Codex, Cursor, and others).

## Usage

No install required — run it with `npx`:

```bash
npx skillsdeck search testing
npx skillsdeck search testing --json      # machine-readable, ranked results
npx skillsdeck list --category writing
npx skillsdeck info uat-tdd-e2e
```

Or install it globally:

```bash
npm install -g skillsdeck
skillsdeck search testing
```

## Commands

| Command | What it does |
| --- | --- |
| `search [query] [--json]` | List skills matching a query, ranked by relevance (name > tags > description). |
| `list [--category <cat>] [--json]` | List all skills, optionally filtered by category. |
| `info <name>` | Show a skill's details and install commands. |
| `install <name...>` | Copy skills into an agent's skills directory. |
| `update (--all \| <name...>)` | Re-install recorded skills whose version is newer. |
| `marketplace` | Print Claude Code's native `claude plugin` commands. |
| `mcp serve` | Run a read-only MCP server (stdio) exposing the catalog as tools. |

### Install scope

```bash
# Global — available in all your projects (default)
skillsdeck install code-comments --global

# Project — into the agent's project dir, shareable with your team
skillsdeck install project-conventions tighten-prose --project .

# A different agent by name
skillsdeck install code-comments --agent codex    # → ~/.agents/skills
skillsdeck install code-comments --agent gemini   # → ~/.gemini/skills

# Any other agent — install straight into its skills directory
skillsdeck install code-comments --dir ~/.config/agent/skills
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
skillsdeck update --all
skillsdeck update code-comments
```

After installing, reload your agent so it picks up new skills.

## Relationship to Claude Code's native marketplace

This CLI is vendor-neutral and works with any agent that reads a skills
directory. For Claude Code specifically, it complements the built-in plugin
marketplace rather than replacing it. Run `skillsdeck marketplace` to get the
equivalent `claude plugin marketplace add …` / `claude plugin install …`
commands if you prefer the native path (which also handles updates via
`git pull` semantics).

## Use as an MCP server

`skillsdeck mcp serve` runs a small [Model Context Protocol](https://modelcontextprotocol.io)
server over stdio so MCP clients (Claude Code/Desktop, Cursor, …) can browse the
catalog directly. It is **read-only** — it exposes four tools and never writes to
disk (install skills with `skillsdeck install`):

| Tool | Returns |
| --- | --- |
| `list_skills` | All skills, optionally filtered by `category`. |
| `search_skills` | Skills matching a `query`, ranked by relevance. |
| `get_skill_info` | One skill's full catalog entry. |
| `read_skill` | A skill's full `SKILL.md` instructions. |

Add it to Claude Code:

```bash
claude mcp add skillsdeck -- npx -y skillsdeck mcp serve
```

The server needs the optional `@modelcontextprotocol/sdk` package; a global or `npx`
install of `skillsdeck` pulls it in automatically, and the rest of the CLI works
without it.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SKILLSDECK_REGISTRY` | Path or URL to a `registry.json` to use instead of the default. |
| `SKILLSDECK_SOURCE_DIR` | Local checkout to copy skills from (skips the git clone). |
| `SKILLSDECK_REPO` | Git URL to clone skills from. |

Installed versions are recorded in `~/.skillsdeck/installed.json`.

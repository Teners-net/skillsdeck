#!/usr/bin/env bash
set -euo pipefail

# Set this to your repo so the curl | bash form can fetch the skills.
REPO_URL="${SKILLS_REPO_URL:-https://github.com/Teners-net/skilldeck}"

usage() {
  cat <<'EOF'
Install Agent Skills (SKILL.md folders) into your AI agent's skills directory.

Usage:
  install.sh [options] [skill ...]

Pass skill names, or use --all, or pass nothing to choose interactively.
Run with --list to see every available skill.

Options:
  --all              Install every skill
  --agent NAME       Target a known agent: claude (default), codex, gemini
  --global           Install to the agent's user dir                (default)
  --project [DIR]    Install under DIR (the agent's project dir; DIR defaults to .)
  --dir DIR          Install straight into DIR (any other agent's skills dir)
  --list             Print the available skill names and exit
  -h, --help         Show this help

Agent skills directories (--agent):
  claude   ~/.claude/skills   ·  <project>/.claude/skills   (Claude Code)
  codex    ~/.agents/skills   ·  <project>/.agents/skills   (OpenAI Codex)
  gemini   ~/.gemini/skills   ·  <project>/.gemini/skills   (Gemini CLI)
  other    use --dir <path>

Examples:
  ./install.sh --all --global
  ./install.sh code-comments uat-tdd-e2e --project
  ./install.sh code-comments --agent codex                   # OpenAI Codex
  ./install.sh code-comments --dir ~/.config/agent/skills    # any other agent
  curl -fsSL https://raw.githubusercontent.com/Teners-net/skilldeck/main/install.sh | bash -s -- --all

Tip: for search and updates, use the CLI instead — `npx skilldeck`.
EOF
}

scope="global"
project_dir="."
dir_target=""
agent="claude"
selected=()
want_all=false
do_list=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) want_all=true; shift ;;
    --agent)
      shift
      if [[ -n "${1:-}" && "${1:0:1}" != "-" ]]; then agent="$1"; shift;
      else echo "--agent requires a name" >&2; exit 1; fi ;;
    --global) scope="global"; shift ;;
    --project)
      scope="project"; shift
      if [[ -n "${1:-}" && "${1:0:1}" != "-" ]]; then project_dir="$1"; shift; fi ;;
    --dir)
      scope="dir"; shift
      if [[ -n "${1:-}" && "${1:0:1}" != "-" ]]; then dir_target="$1"; shift;
      else echo "--dir requires a directory" >&2; exit 1; fi ;;
    --list) do_list=true; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    *) selected+=("$1"); shift ;;
  esac
done

# Map a known agent name to the path segment it reads skills from. Anything not
# listed here can still be targeted directly with --dir.
case "$agent" in
  claude) subdir=".claude/skills" ;;
  codex)  subdir=".agents/skills" ;;
  gemini) subdir=".gemini/skills" ;;
  *) echo "Unknown --agent: $agent (known: claude, codex, gemini; use --dir for others)" >&2; exit 1 ;;
esac

# Skills live next to this script when run from a clone; otherwise clone the repo.
resolve_source() {
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
  if [[ -n "$here" && -d "$here/skills" ]]; then
    SRC="$here"
    return
  fi
  command -v git >/dev/null || { echo "git is required to install remotely" >&2; exit 1; }
  SRC="$(mktemp -d)"
  trap 'rm -rf "$SRC"' EXIT
  git clone --depth 1 "$REPO_URL" "$SRC" >/dev/null 2>&1 \
    || { echo "Failed to clone $REPO_URL" >&2; exit 1; }
}

resolve_source

# Discover the available skills from the source tree (this is the same set the
# CLI and marketplace serve — no separate list to keep in sync).
SKILLS=()
while IFS= read -r _name; do
  SKILLS+=("$_name")
done < <(cd "$SRC/skills" 2>/dev/null && for d in */; do [[ -d "$d" ]] && printf '%s\n' "${d%/}"; done | sort)

if $do_list; then
  printf '%s\n' "${SKILLS[@]}"
  exit 0
fi

[[ ${#SKILLS[@]} -eq 0 ]] && { echo "No skills found in $SRC/skills." >&2; exit 1; }

valid_skill() {
  local name="$1"
  for s in "${SKILLS[@]}"; do [[ "$s" == "$name" ]] && return 0; done
  return 1
}

if $want_all; then
  selected=("${SKILLS[@]}")
elif [[ ${#selected[@]} -eq 0 ]]; then
  if [[ -t 0 ]]; then
    echo "Available skills:"
    i=1; for s in "${SKILLS[@]}"; do echo "  $i) $s"; i=$((i+1)); done
    read -r -p "Numbers (space-separated), or 'a' for all: " reply
    if [[ "$reply" =~ ^[Aa]$ ]]; then
      selected=("${SKILLS[@]}")
    else
      for n in $reply; do
        [[ "$n" =~ ^[0-9]+$ ]] && (( n >= 1 && n <= ${#SKILLS[@]} )) \
          && selected+=("${SKILLS[$((n-1))]}")
      done
    fi
  else
    echo "No skills specified. Use --all or pass names; see --help." >&2
    exit 1
  fi
fi

[[ ${#selected[@]} -eq 0 ]] && { echo "Nothing selected." >&2; exit 1; }

if [[ "$scope" == "global" ]]; then
  target="$HOME/$subdir"
elif [[ "$scope" == "dir" ]]; then
  target="${dir_target%/}"
else
  target="${project_dir%/}/$subdir"
fi
mkdir -p "$target"

for s in "${selected[@]}"; do
  valid_skill "$s" || { echo "Skipping unknown skill: $s" >&2; continue; }
  rm -rf "${target:?}/$s"
  cp -R "$SRC/skills/$s" "$target/$s"
  echo "Installed $s -> $target/$s"
done

echo
echo "Done. If your AI agent is already running, reload it (or restart it) so"
echo "it picks up a newly created skills directory."

#!/usr/bin/env bash
set -euo pipefail

# Set this to your repo so the curl | bash form can fetch the skills.
REPO_URL="${SKILLS_REPO_URL:-https://github.com/Teners-net/openskills}"

SKILLS=(code-comments laravel-services-support project-conventions uat-tdd-e2e tighten-prose)

usage() {
  cat <<'EOF'
Install Claude Code skills into your global or project skills directory.

Usage:
  install.sh [options] [skill ...]

Available skills:
  code-comments              Comment only where a senior dev needs >2 glances
  laravel-services-support   app/Services (external) vs app/Support (internal)
  project-conventions        Component reuse-first, mandatory tests, type locations
  uat-tdd-e2e                UAT-first / TDD / E2E feature workflow
  tighten-prose              Cut filler and redundancy without changing meaning

Pass skill names, or use --all, or pass nothing to choose interactively.

Options:
  --all              Install every skill
  --global           Install to ~/.claude/skills        (default)
  --project [DIR]    Install to DIR/.claude/skills       (DIR defaults to .)
  --list             Print the skill names and exit
  -h, --help         Show this help

Examples:
  ./install.sh --all --global
  ./install.sh code-comments uat-tdd-e2e --project
  curl -fsSL https://raw.githubusercontent.com/Teners-net/openskills/main/install.sh | bash -s -- --all
EOF
}

scope="global"
project_dir="."
selected=()
want_all=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) want_all=true; shift ;;
    --global) scope="global"; shift ;;
    --project)
      scope="project"; shift
      if [[ -n "${1:-}" && "${1:0:1}" != "-" ]]; then project_dir="$1"; shift; fi ;;
    --list) printf '%s\n' "${SKILLS[@]}"; exit 0 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    *) selected+=("$1"); shift ;;
  esac
done

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

valid_skill() {
  local name="$1"
  for s in "${SKILLS[@]}"; do [[ "$s" == "$name" ]] && return 0; done
  return 1
}

resolve_source

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
  target="$HOME/.claude/skills"
else
  target="${project_dir%/}/.claude/skills"
fi
mkdir -p "$target"

for s in "${selected[@]}"; do
  valid_skill "$s" || { echo "Skipping unknown skill: $s" >&2; continue; }
  rm -rf "${target:?}/$s"
  cp -R "$SRC/skills/$s" "$target/$s"
  echo "Installed $s -> $target/$s"
done

echo
echo "Done. If Claude Code is already running, reload the window (or restart it) so"
echo "it picks up a newly created skills directory."

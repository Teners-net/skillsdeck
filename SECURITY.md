# Security Policy

## Why skills need security review

An Agent Skill is not passive documentation — it is a set of **instructions that
an AI coding agent may act on** (Claude Code, Codex, Cursor, Copilot, and others)
while it has access to your shell, files, and network. A malicious or careless
skill could instruct an agent to run destructive commands, exfiltrate secrets,
weaken security checks, or take other harmful actions. For that reason, every
skill in skillsdeck is reviewed before it is merged, and we ask the community to
help us keep the catalog safe.

## What we do not accept

Skills submitted to skillsdeck must not instruct an agent to:

- Run destructive or irreversible commands without explicit user confirmation
  (e.g. `rm -rf`, force-pushes, dropping databases).
- Read, transmit, or log secrets, credentials, tokens, or private user data to
  any external destination.
- Disable, weaken, or bypass security controls, tests, authentication, or
  sandboxing.
- Install or execute code from untrusted or unpinned sources.
- Evade detection, obfuscate their behavior, or hide what they are doing from
  the user.

Skills that violate these rules will be rejected or removed. See the pre-PR
checklist in [`docs/authoring-skills.md`](docs/authoring-skills.md) before you
submit.

## Automated checks

Every push and pull request is scanned for hardcoded credentials by
[gitleaks](https://github.com/gitleaks/gitleaks) in CI — this is the
authoritative secret gate and blocks the build on any finding (config in
[`.gitleaks.toml`](.gitleaks.toml)). Separately, contributors can run
`npm run lint:secrets` locally: an advisory scan that also flags absolute local
paths and private/`localhost` URLs, which are portability problems a shared
skill should not contain. Automated checks assist review; they do not replace
it.

## Reporting a vulnerability or an unsafe skill

If you find a skill in this catalog that behaves unsafely, or a security issue
in the tooling (the CLI, scripts, or CI), please report it privately:

- Open a [GitHub security advisory](../../security/advisories/new) on this
  repository, **or**
- Email the maintainers (see `CODEOWNERS`).

Please do **not** open a public issue for a security report until we have had a
chance to review and respond. We aim to acknowledge reports within a few days.

## Supported versions

skillsdeck is distributed from the latest commit on the default branch. Fixes
are applied to `main`; there are no separately maintained release branches.

#!/usr/bin/env node
// skillsdeck — a small CLI to search, install, and update Agent Skills (SKILL.md)
// from the skillsdeck catalog. Zero runtime dependencies (Node >=18 built-ins).
// Vendor-neutral: it installs skill folders into whatever directory your agent
// reads (Claude Code, Codex, Cursor, and others — see --dir).
//
// Data model:
//   - The registry (registry.json) is the searchable index. It is loaded live
//     from GitHub for a published CLI, or straight from the repo when run from a
//     source checkout, or from a local cache when offline.
//   - Installing copies a skill's folder from the repo into a skills directory
//     (~/.claude/skills by default, or any directory via --dir), and records the
//     installed version in ~/.skillsdeck/installed.json so `update` can tell
//     what's stale.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  cpSync,
  existsSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const OWNER_REPO = "Teners-net/skillsdeck";
const RAW_REGISTRY_URL =
  process.env.SKILLSDECK_REGISTRY_URL ||
  `https://raw.githubusercontent.com/${OWNER_REPO}/main/registry.json`;
const REPO_URL = process.env.SKILLSDECK_REPO || `https://github.com/${OWNER_REPO}.git`;
const STATE_DIR = join(homedir(), ".skillsdeck");
const STATE_FILE = join(STATE_DIR, "installed.json");
const CACHE_FILE = join(STATE_DIR, "registry.json");

// ---------- small utilities ----------

function die(msg) {
  console.error(`skillsdeck: ${msg}`);
  process.exit(1);
}

function pkgVersion() {
  try {
    return JSON.parse(readFileSync(join(HERE, "package.json"), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}

// Compare two "x.y.z" versions; returns true when a is strictly greater than b.
function semverGt(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

// ---------- registry loading ----------

async function loadRegistry() {
  const override = process.env.SKILLSDECK_REGISTRY;
  if (override) {
    return /^https?:/.test(override)
      ? await fetchJson(override)
      : JSON.parse(readFileSync(override, "utf8"));
  }

  // Running from a source checkout: use the committed registry directly.
  const local = join(HERE, "..", "registry.json");
  if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));

  // Published CLI: fetch live and cache for offline use.
  try {
    const reg = await fetchJson(RAW_REGISTRY_URL);
    try {
      mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(CACHE_FILE, JSON.stringify(reg));
    } catch {
      /* cache is best-effort */
    }
    return reg;
  } catch (err) {
    if (existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    throw new Error(
      `could not load the registry (${err.message}). Check your connection or set SKILLSDECK_REGISTRY.`
    );
  }
}

function skillMap(registry) {
  const map = new Map();
  for (const s of registry.skills || []) map.set(s.name, s);
  return map;
}

// ---------- install state ----------

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { installs: {} };
  }
}

function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

// ---------- source resolution (for copying skill folders) ----------

// Returns { dir, cleanup } where dir contains a skills/ tree. Prefers a local
// checkout / override; otherwise shallow-clones the repo to a temp dir.
function resolveSource() {
  const envDir = process.env.SKILLSDECK_SOURCE_DIR;
  if (envDir && existsSync(join(envDir, "skills"))) return { dir: envDir, cleanup: null };

  const repoRoot = join(HERE, "..");
  if (existsSync(join(repoRoot, "skills"))) return { dir: repoRoot, cleanup: null };

  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error("git is required to fetch skills. Install git or set SKILLSDECK_SOURCE_DIR.");
  }
  const tmp = mkdtempSync(join(tmpdir(), "skillsdeck-"));
  try {
    execFileSync("git", ["clone", "--depth", "1", REPO_URL, tmp], { stdio: "ignore" });
  } catch {
    rmSync(tmp, { recursive: true, force: true });
    throw new Error(`failed to clone ${REPO_URL}.`);
  }
  return { dir: tmp, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

// Officially documented skills directories per agent. `sub` is the path segment
// appended under $HOME (global) or the project dir (project scope). Agents not
// listed here are still installable with --dir <path>.
const AGENT_DIRS = {
  claude: [".claude", "skills"], // Claude Code
  codex: [".agents", "skills"], //  OpenAI Codex (~/.agents/skills)
  gemini: [".gemini", "skills"], // Gemini CLI (~/.gemini/skills)
};
const DEFAULT_AGENT = "claude";

function targetSkillsDir(opts) {
  // --dir wins: install straight into the given directory (any agent's skills dir).
  if (opts.dir !== undefined) {
    return resolve(opts.dir);
  }
  const agent = opts.agent || DEFAULT_AGENT;
  const sub = AGENT_DIRS[agent];
  if (!sub) {
    die(
      `unknown --agent "${agent}". Known: ${Object.keys(AGENT_DIRS).join(", ")}. ` +
        `For any other agent, pass its skills directory with --dir <path>.`
    );
  }
  if (opts.project !== undefined) {
    return resolve(opts.project || ".", ...sub);
  }
  return join(homedir(), ...sub);
}

function copySkill(sourceDir, name, destSkillsDir) {
  const src = join(sourceDir, "skills", name);
  if (!existsSync(src)) throw new Error(`skill "${name}" not found in the source tree`);
  const dest = join(destSkillsDir, name);
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  return dest;
}

// ---------- commands ----------

function cmdSearch(args, registry) {
  const query = (args._[0] || "").toLowerCase();
  const hits = (registry.skills || []).filter((s) => {
    const hay = [s.name, s.description, s.category, ...(s.tags || [])].join(" ").toLowerCase();
    return !query || hay.includes(query);
  });
  printSkillTable(hits, query ? `No skills match "${query}".` : "No skills found.");
}

function cmdList(args, registry) {
  let skills = registry.skills || [];
  if (args.category) skills = skills.filter((s) => s.category === args.category);
  printSkillTable(skills, args.category ? `No skills in category "${args.category}".` : "No skills found.");
}

function cmdInfo(args, registry) {
  const name = args._[0];
  if (!name) die("usage: skillsdeck info <name>");
  const s = skillMap(registry).get(name);
  if (!s) die(`unknown skill "${name}". Try: skillsdeck search ${name}`);
  const lines = [
    `${s.name}  (v${s.version})`,
    `  category:    ${s.category}`,
    `  ${s.description}`,
  ];
  if (s.tags?.length) lines.push(`  tags:        ${s.tags.join(", ")}`);
  if (s.author) {
    const who = s.author.github ? `${s.author.name} (@${s.author.github})` : s.author.name;
    lines.push(`  author:      ${who}`);
  }
  if (s.license) lines.push(`  license:     ${s.license}`);
  if (s.homepage) lines.push(`  homepage:    ${s.homepage}`);
  lines.push("");
  lines.push(`  install:     skillsdeck install ${s.name}                   # Claude Code`);
  lines.push(`  other agent: skillsdeck install ${s.name} --agent codex      # or: gemini, or --dir <path>`);
  lines.push(`  claude mkt:  claude plugin install ${s.name}@skillsdeck --scope user`);
  console.log(lines.join("\n"));
}

function cmdInstall(args, registry) {
  const names = args._;
  if (names.length === 0) die("usage: skillsdeck install <name...> [--global | --project [DIR]]");
  const map = skillMap(registry);
  const unknown = names.filter((n) => !map.has(n));
  if (unknown.length) die(`unknown skill(s): ${unknown.join(", ")}`);

  const destDir = targetSkillsDir(args);
  mkdirSync(destDir, { recursive: true });
  const source = resolveSource();
  const state = loadState();
  try {
    for (const name of names) {
      const dest = copySkill(source.dir, name, destDir);
      state.installs[dest] = {
        name,
        version: map.get(name).version,
        scope: args.dir !== undefined ? "dir" : args.project !== undefined ? "project" : "global",
        agent: args.dir !== undefined ? undefined : args.agent || DEFAULT_AGENT,
      };
      console.log(`installed ${name} (v${map.get(name).version}) -> ${dest}`);
    }
  } finally {
    source.cleanup?.();
  }
  saveState(state);
  console.log("\nIf your AI agent is already running, reload it so it picks up new skills.");
}

function cmdUpdate(args, registry) {
  const map = skillMap(registry);
  const state = loadState();
  const entries = Object.entries(state.installs);
  if (entries.length === 0) {
    console.log("No recorded installs. Use `skillsdeck install <name>` first.");
    return;
  }

  const wanted = args.all ? null : new Set(args._);
  if (!args.all && (!wanted || wanted.size === 0)) {
    die("usage: skillsdeck update (--all | <name...>)");
  }

  const stale = entries.filter(([, rec]) => {
    if (wanted && !wanted.has(rec.name)) return false;
    const latest = map.get(rec.name);
    return latest && semverGt(latest.version, rec.version);
  });

  if (stale.length === 0) {
    console.log("Everything is up to date.");
    return;
  }

  const source = resolveSource();
  try {
    for (const [dest, rec] of stale) {
      const destDir = dirname(dest);
      mkdirSync(destDir, { recursive: true });
      copySkill(source.dir, rec.name, destDir);
      const latest = map.get(rec.name).version;
      console.log(`updated ${rec.name} (v${rec.version} -> v${latest}) at ${dest}`);
      state.installs[dest].version = latest;
    }
  } finally {
    source.cleanup?.();
  }
  saveState(state);
}

function cmdMarketplace() {
  console.log(
    [
      "Claude Code has a native plugin marketplace for this catalog:",
      "",
      `  claude plugin marketplace add ${OWNER_REPO}`,
      "  claude plugin install <skill>@skillsdeck --scope user   # global",
      "  claude plugin install <skill>@skillsdeck --scope project",
      "",
      `  claude plugin marketplace update skillsdeck              # get updates`,
      "",
      "For other agents, use the vendor-neutral CLI, e.g.:",
      "  skillsdeck install <skill> --agent codex                # OpenAI Codex",
      "  skillsdeck install <skill> --agent gemini               # Gemini CLI",
      "  skillsdeck install <skill> --dir <path>                 # anything else",
    ].join("\n")
  );
}

// ---------- output helpers ----------

function printSkillTable(skills, emptyMsg) {
  if (!skills.length) {
    console.log(emptyMsg);
    return;
  }
  const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
  const nameW = Math.max(...sorted.map((s) => s.name.length), 4);
  const catW = Math.max(...sorted.map((s) => s.category.length), 8);
  console.log(`${"NAME".padEnd(nameW)}  ${"CATEGORY".padEnd(catW)}  DESCRIPTION`);
  for (const s of sorted) {
    console.log(`${s.name.padEnd(nameW)}  ${s.category.padEnd(catW)}  ${s.description}`);
  }
}

// ---------- arg parsing ----------

// Parses flags shared across commands: --global, --project [DIR], --category X,
// --all. Everything else is a positional in `_`.
function parseArgs(argv) {
  const out = { _: [], all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") out.all = true;
    else if (a === "--global") out.global = true;
    else if (a === "--project") {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        out.project = next;
        i++;
      } else {
        out.project = "";
      }
    } else if (a === "--dir") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) die("--dir requires a directory");
      out.dir = next;
      i++;
    } else if (a === "--agent") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) die("--agent requires a name");
      out.agent = next;
      i++;
    } else if (a === "--category") {
      out.category = argv[++i];
    } else if (a.startsWith("--category=")) {
      out.category = a.slice("--category=".length);
    } else if (a === "-h" || a === "--help") {
      out.help = true;
    } else {
      out._.push(a);
    }
  }
  return out;
}

const HELP = `skillsdeck — Agent Skills (SKILL.md) from the skillsdeck catalog

Usage:
  skillsdeck <command> [options]

Commands:
  search [query]              List skills matching a query (name, description, tags)
  list [--category <cat>]     List all skills, optionally filtered by category
  info <name>                 Show details and install commands for a skill
  install <name...>           Install skills into an agent's skills directory
      --agent NAME              Target a known agent: claude (default), codex, gemini
      --global                  Install to the agent's user dir (default)
      --project [DIR]           Install under DIR (the agent's project dir; DIR=.)
      --dir DIR                 Install straight into DIR (any other agent)
  update (--all | <name...>)  Re-install recorded skills whose version is newer
  marketplace                 Print Claude Code's native \`claude plugin\` commands
  help, --version

Agent skills directories (--agent):
  claude   ~/.claude/skills   ·  <project>/.claude/skills   (Claude Code)
  codex    ~/.agents/skills   ·  <project>/.agents/skills   (OpenAI Codex)
  gemini   ~/.gemini/skills   ·  <project>/.gemini/skills   (Gemini CLI)
  other    use --dir <path>

Examples:
  skillsdeck search testing
  skillsdeck list --category writing
  skillsdeck install code-comments tighten-prose --project .
  skillsdeck install uat-tdd-e2e --agent codex
  skillsdeck install code-comments --dir ~/.config/agent/skills
  skillsdeck update --all

Environment:
  SKILLSDECK_REGISTRY       Path or URL to a registry.json to use instead
  SKILLSDECK_SOURCE_DIR     Local checkout to copy skills from (skips git clone)
  SKILLSDECK_REPO           Git URL to clone skills from`;

// ---------- main ----------

async function main() {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }
  if (cmd === "--version" || cmd === "-v" || cmd === "version") {
    console.log(pkgVersion());
    return;
  }
  if (cmd === "marketplace") {
    cmdMarketplace();
    return;
  }

  const args = parseArgs(rest);
  if (args.help) {
    console.log(HELP);
    return;
  }

  const registry = await loadRegistry();

  switch (cmd) {
    case "search":
      cmdSearch(args, registry);
      break;
    case "list":
      cmdList(args, registry);
      break;
    case "info":
      cmdInfo(args, registry);
      break;
    case "install":
      cmdInstall(args, registry);
      break;
    case "update":
      cmdUpdate(args, registry);
      break;
    default:
      die(`unknown command "${cmd}". Run \`skillsdeck help\`.`);
  }
}

main().catch((err) => die(err.message));

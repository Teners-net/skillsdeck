// Shared read-side logic for the skillsdeck CLI and MCP server.
//
// bin.mjs auto-runs main() when imported, so the registry/search helpers that
// the MCP server (mcp.mjs) also needs live here instead. Everything in this
// module is pure: it throws on error and never prints or calls process.exit,
// so callers (the CLI, which prints; the MCP server, which returns tool errors)
// stay in control. Zero runtime dependencies — Node >=18 built-ins only.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));

export const OWNER_REPO = "Teners-net/skillsdeck";
export const RAW_BASE = `https://raw.githubusercontent.com/${OWNER_REPO}/main`;
export const RAW_REGISTRY_URL =
  process.env.SKILLSDECK_REGISTRY_URL || `${RAW_BASE}/registry.json`;
export const STATE_DIR = join(homedir(), ".skillsdeck");
export const CACHE_FILE = join(STATE_DIR, "registry.json");

export function pkgVersion() {
  try {
    return JSON.parse(readFileSync(join(HERE, "package.json"), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

// Loads registry.json. Prefers an explicit override, then a source checkout,
// then the live GitHub copy (cached for offline use).
export async function loadRegistry() {
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

export function skillMap(registry) {
  const map = new Map();
  for (const s of registry.skills || []) map.set(s.name, s);
  return map;
}

// Relevance score for a skill against a lowercased query. Higher is better;
// 0 means "no match" (dropped from results). Ordering: exact name, name prefix,
// exact tag, name substring, tag substring, exact category, description hit.
export function searchScore(s, q) {
  const name = (s.name || "").toLowerCase();
  const tags = (s.tags || []).map((t) => t.toLowerCase());
  const desc = (s.description || "").toLowerCase();
  const cat = (s.category || "").toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (tags.includes(q)) return 60;
  if (name.includes(q)) return 50;
  if (tags.some((t) => t.includes(q))) return 40;
  if (cat === q) return 35;
  if (desc.includes(q)) return 20;
  return 0;
}

// Returns the raw SKILL.md text for a registry entry. Prefers a local checkout
// (SKILLSDECK_SOURCE_DIR, or the package's own tree when run from source);
// otherwise fetches the raw file from GitHub. `entry.path` is "skills/<name>".
export async function readSkillMarkdown(entry) {
  if (!entry || !entry.path) throw new Error("skill entry has no path");
  const rel = join(entry.path, "SKILL.md");
  const dirs = [process.env.SKILLSDECK_SOURCE_DIR, join(HERE, "..")].filter(Boolean);
  for (const dir of dirs) {
    const file = join(dir, rel);
    if (existsSync(file)) return readFileSync(file, "utf8");
  }
  const res = await fetch(`${RAW_BASE}/${entry.path}/SKILL.md`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${entry.path}/SKILL.md`);
  return await res.text();
}

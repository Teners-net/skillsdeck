#!/usr/bin/env node
// Advisory scan of skill content for leaked secrets, absolute local paths, and
// private hosts/URLs. This is a reviewer aid, NOT a CI gate. For credentials the
// authoritative gate is gitleaks, which CI runs over the whole tree
// (see .github/workflows/validate.yml); this script's unique value is the
// portability checks (absolute paths, localhost) that secret scanners don't flag,
// plus a quick local heads-up. Run it by hand:
//
//   npm run lint:secrets            # scan skills/, report findings, exit 0
//   npm run lint:secrets -- --strict  # exit 1 if anything is found
//   node scripts/lint-secrets.mjs <path...>   # scan specific paths instead
//
// Patterns are deliberately high-signal: bare prose words like "API", "key", or
// "auth" must NOT trip a finding — only real token shapes and assignments do.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { ROOT, SKILLS_DIR } from "./lib.mjs";

// sev: "secret" (likely credential — redacted in output) | "path" | "host".
const RULES = [
  { id: "github-token", sev: "secret", label: "GitHub token", re: /\bgh[posru]_[A-Za-z0-9]{20,}\b/ },
  { id: "aws-access-key", sev: "secret", label: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "google-api-key", sev: "secret", label: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: "slack-token", sev: "secret", label: "Slack token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { id: "openai-key", sev: "secret", label: "OpenAI-style key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: "private-key", sev: "secret", label: "Private key block", re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/ },
  // `api_key = "..."` / `secret: ...` etc. — only when assigned a real 12+ char value.
  {
    id: "assigned-secret",
    sev: "secret",
    label: "Assigned secret",
    re: /\b(?:api[_-]?key|secret|token|passwd|password|pwd)\b\s*[:=]\s*["']?[A-Za-z0-9_/+.-]{12,}/i,
  },
  { id: "home-path-unix", sev: "path", label: "Absolute home path", re: /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+\// },
  { id: "home-path-win", sev: "path", label: "Windows user path", re: /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+/ },
  { id: "localhost", sev: "host", label: "localhost reference", re: /\blocalhost(?::\d+)?\b/i },
  { id: "loopback-ip", sev: "host", label: "Loopback IP", re: /\b127\.0\.0\.1\b/ },
  {
    id: "private-ip",
    sev: "host",
    label: "Private-range IP",
    re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/,
  },
];

const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".pdf", ".zip", ".gz",
  ".tar", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp3", ".mp4", ".mov", ".wasm",
]);

function walk(target) {
  let st;
  try {
    st = statSync(target);
  } catch {
    return [];
  }
  if (st.isFile()) return [target];
  if (!st.isDirectory()) return [];
  const files = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    files.push(...walk(join(target, entry.name)));
  }
  return files;
}

function isProbablyBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

// Hide the bulk of a likely credential so we don't reprint it in logs/CI output.
function redact(match) {
  const m = match.trim();
  if (m.length <= 8) return `${m[0] ?? ""}…`;
  return `${m.slice(0, 4)}…(${m.length} chars)`;
}

function scanFile(file) {
  const buf = readFileSync(file);
  if (isProbablyBinary(buf)) return [];
  const lines = buf.toString("utf8").split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    for (const rule of RULES) {
      const m = rule.re.exec(lines[i]);
      if (m) found.push({ line: i + 1, rule, shown: rule.sev === "secret" ? redact(m[0]) : m[0].trim() });
    }
  }
  return found;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(
      "Usage: lint:secrets [--strict] [path...]\n\n" +
        "Scans for likely secrets, absolute local paths, and private hosts/URLs.\n" +
        "Defaults to scanning skills/. Advisory: exits 0 unless --strict is passed."
    );
    return;
  }
  const strict = argv.includes("--strict");
  const targets = argv.filter((a) => !a.startsWith("-"));
  const roots = targets.length ? targets : [SKILLS_DIR];

  const files = roots.flatMap(walk).filter((f) => !BINARY_EXT.has(extname(f).toLowerCase()));
  const byFile = new Map();
  let total = 0;
  for (const file of files) {
    const hits = scanFile(file);
    if (hits.length) {
      byFile.set(file, hits);
      total += hits.length;
    }
  }

  const scope = targets.length ? targets.join(", ") : "skills/";
  if (total === 0) {
    console.log(`✓ No secrets, absolute local paths, or private URLs found in ${scope} (${files.length} files scanned).`);
    return;
  }

  console.log(`Findings in ${scope}:\n`);
  for (const [file, hits] of byFile) {
    const rel = relative(ROOT, file);
    console.log(rel.startsWith("..") ? file : rel); // keep repo-relative; fall back to absolute for external paths
    for (const h of hits) {
      console.log(`  ${String(h.line).padStart(4)}:  [${h.rule.sev}] ${h.rule.label.padEnd(20)} ${h.shown}`);
    }
    console.log("");
  }
  console.log(`${total} finding(s) across ${byFile.size} file(s).`);
  console.log("Legend: [secret] likely credential · [path] absolute local path · [host] private host/URL");
  console.log("Advisory only — not enforced by CI. Pass --strict to exit non-zero on findings.");

  if (strict) process.exitCode = 1;
}

main();

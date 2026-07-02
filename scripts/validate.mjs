#!/usr/bin/env node
// Validate every skill and assert the generated artifacts are in sync.
// Exits non-zero on any problem. Run in CI and locally before opening a PR:
//   `npm run validate`

import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  loadAllSkills,
  readMarketplaceBase,
  buildMarketplace,
  buildRegistry,
  renderCatalog,
  spliceCatalog,
  stringifyJson,
  SCHEMA_PATH,
  MARKETPLACE_PATH,
  CLAUDE_MARKETPLACE_PATH,
  REGISTRY_PATH,
  README_PATH,
} from "./lib.mjs";

const errors = [];
const fail = (skill, msg) => errors.push(skill ? `[${skill}] ${msg}` : msg);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateSchema = ajv.compile(JSON.parse(readFileSync(SCHEMA_PATH, "utf8")));

const skills = loadAllSkills();
if (skills.length === 0) fail(null, "No skills found under skills/.");

const seenNames = new Map();

for (const s of skills) {
  if (s.metaError) fail(s.name, s.metaError);
  if (s.frontmatterError) fail(s.name, s.frontmatterError);
  if (s.metaError || s.frontmatterError) continue;

  if (!validateSchema(s.meta)) {
    for (const e of validateSchema.errors) {
      fail(s.name, `skill.json ${e.instancePath || "/"} ${e.message}`);
    }
  }

  // The three names must agree: folder, skill.json, and SKILL.md frontmatter.
  if (s.meta.name !== s.name) {
    fail(s.name, `skill.json name "${s.meta.name}" does not match folder "${s.name}"`);
  }
  if (s.frontmatter.name !== s.name) {
    fail(s.name, `SKILL.md frontmatter name "${s.frontmatter.name}" does not match folder "${s.name}"`);
  }
  if (!s.frontmatter.hasDescription) {
    fail(s.name, "SKILL.md frontmatter is missing a description");
  }

  // Names must be unique across the catalog.
  if (seenNames.has(s.meta.name)) {
    fail(s.name, `duplicate skill name, also used by folder "${seenNames.get(s.meta.name)}"`);
  } else {
    seenNames.set(s.meta.name, s.name);
  }
}

// Sync gate: only meaningful if every skill loaded cleanly.
const allClean = skills.length > 0 && skills.every((s) => !s.metaError && !s.frontmatterError);
if (allClean) {
  const expectedMarketplace = stringifyJson(buildMarketplace(skills, readMarketplaceBase()));
  const expectedRegistry = stringifyJson(buildRegistry(skills));
  const expectedReadme = spliceCatalog(readFileSync(README_PATH, "utf8"), renderCatalog(skills));

  const checks = [
    [MARKETPLACE_PATH, "plugins/marketplace.json", expectedMarketplace],
    [CLAUDE_MARKETPLACE_PATH, ".claude-plugin/marketplace.json (Claude Code shim)", expectedMarketplace],
    [REGISTRY_PATH, "registry.json", expectedRegistry],
    [README_PATH, "README.md (catalog block)", expectedReadme],
  ];
  for (const [path, label, expected] of checks) {
    let actual;
    try {
      actual = readFileSync(path, "utf8");
    } catch {
      actual = null;
    }
    if (actual !== expected) {
      fail(null, `${label} is out of date — run \`npm run generate\` and commit the result.`);
    }
  }
}

if (errors.length > 0) {
  console.error(`✖ validation failed with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`✓ ${skills.length} skills valid; generated artifacts in sync.`);

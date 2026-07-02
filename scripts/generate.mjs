#!/usr/bin/env node
// Regenerate the derived artifacts from the skills/ tree:
//   - plugins/marketplace.json          (canonical plugin manifest)
//   - .claude-plugin/marketplace.json   (byte-identical shim for Claude Code's
//                                         native marketplace, which requires this path)
//   - registry.json                     (index the skilldeck CLI reads)
//   - the catalog block in README.md
//
// Run after adding or changing a skill: `npm run generate`.

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  loadAllSkills,
  readMarketplaceBase,
  buildMarketplace,
  buildRegistry,
  renderCatalog,
  spliceCatalog,
  stringifyJson,
  MARKETPLACE_PATH,
  CLAUDE_MARKETPLACE_PATH,
  REGISTRY_PATH,
  README_PATH,
} from "./lib.mjs";

const skills = loadAllSkills();

const broken = skills.filter((s) => s.metaError || s.frontmatterError);
if (broken.length > 0) {
  console.error("Cannot generate — some skills are invalid. Run `npm run validate` for details:");
  for (const s of broken) {
    console.error(`  - ${s.name}: ${s.metaError || s.frontmatterError}`);
  }
  process.exit(1);
}

const marketplace = buildMarketplace(skills, readMarketplaceBase());
const registry = buildRegistry(skills);
const readme = spliceCatalog(readFileSync(README_PATH, "utf8"), renderCatalog(skills));

const marketplaceJson = stringifyJson(marketplace);
writeFileSync(MARKETPLACE_PATH, marketplaceJson);
// Mirror to the Claude Code compatibility path (see lib.mjs).
mkdirSync(dirname(CLAUDE_MARKETPLACE_PATH), { recursive: true });
writeFileSync(CLAUDE_MARKETPLACE_PATH, marketplaceJson);
writeFileSync(REGISTRY_PATH, stringifyJson(registry));
writeFileSync(README_PATH, readme);

console.log(`Generated marketplace.json (+ Claude shim), registry.json, and README catalog for ${skills.length} skills.`);

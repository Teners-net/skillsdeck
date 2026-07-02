#!/usr/bin/env node
// Regenerate the derived artifacts from the skills/ tree:
//   - .claude-plugin/marketplace.json   (Claude Code plugin manifest)
//   - registry.json                     (index the openskills CLI reads)
//   - the catalog block in README.md
//
// Run after adding or changing a skill: `npm run generate`.

import { writeFileSync, readFileSync } from "node:fs";
import {
  loadAllSkills,
  readMarketplaceBase,
  buildMarketplace,
  buildRegistry,
  renderCatalog,
  spliceCatalog,
  stringifyJson,
  MARKETPLACE_PATH,
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

writeFileSync(MARKETPLACE_PATH, stringifyJson(marketplace));
writeFileSync(REGISTRY_PATH, stringifyJson(registry));
writeFileSync(README_PATH, readme);

console.log(`Generated marketplace.json, registry.json, and README catalog for ${skills.length} skills.`);

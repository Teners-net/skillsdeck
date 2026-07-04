import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { searchScore, readSkillMarkdown } from "./core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("searchScore ranks name > tag > description, and 0 for no match", () => {
  const exactName = { name: "testing", tags: [], description: "" };
  const namePrefix = { name: "testing-utils", tags: [], description: "" };
  const tagHit = { name: "foo", tags: ["testing"], description: "" };
  const descHit = { name: "bar", tags: [], description: "helps with testing" };

  assert.ok(searchScore(exactName, "testing") > searchScore(namePrefix, "testing"));
  assert.ok(searchScore(namePrefix, "testing") > searchScore(tagHit, "testing"));
  assert.ok(searchScore(tagHit, "testing") > searchScore(descHit, "testing"));
  assert.equal(searchScore({ name: "x", tags: [], description: "" }, "testing"), 0);
});

test("readSkillMarkdown reads SKILL.md from a local checkout", async () => {
  process.env.SKILLSDECK_SOURCE_DIR = ROOT;
  const md = await readSkillMarkdown({ path: "skills/code-comments" });
  assert.match(md, /name:\s*code-comments/);
});

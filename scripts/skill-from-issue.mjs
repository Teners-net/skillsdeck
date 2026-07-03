#!/usr/bin/env node
// Turns a "new skill" submission issue into skills/<name>/SKILL.md + skill.json.
// Driven by .github/workflows/skill-from-issue.yml: it reads the issue body from
// the ISSUE_BODY env var, validates it, writes the two files, and reports back via
// $GITHUB_OUTPUT (ok / name / errors). The workflow then runs `npm run generate`
// and opens a pull request. The issue body is UNTRUSTED input — it is only ever
// read as data (never interpolated into a shell), and a submission can only CREATE
// a new skill folder, never overwrite an existing one.
//
// Local testing:  ISSUE_BODY="$(cat sample.md)" node scripts/skill-from-issue.mjs
//            or:  node scripts/skill-from-issue.mjs sample-issue.md

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { stringifyJson, CATEGORY_ORDER, SKILLS_DIR } from "./lib.mjs";

const MARKER = "<!-- skillsdeck:new-skill -->";
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GH_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

// ---------- issue-body parsing ----------

// The fixed section labels the form (and a matching issue form) emit, in order.
// Only these act as delimiters — see parseSections.
const KNOWN_LABELS = new Set([
  "skill name", "category", "description", "tags",
  "author name", "author github", "license", "instructions",
]);

// Sections are serialized as "### <Label>\n\n<value>" — the format GitHub issue
// forms produce and the one the website's submit form mirrors. Only the first
// occurrence of each KNOWN label acts as a delimiter, so a "### " heading a
// contributor writes inside their Instructions is preserved as content (the last
// section runs to end-of-body) instead of silently truncating the field.
// Returns a map of label -> trimmed value ("" for GitHub's "_No response_").
function parseSections(body) {
  const re = /^###[ \t]+(.+?)[ \t]*$/gm;
  const heads = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(body))) {
    const label = m[1].trim().toLowerCase();
    if (KNOWN_LABELS.has(label) && !seen.has(label)) {
      seen.add(label);
      heads.push({ label, start: m.index, end: re.lastIndex });
    }
  }
  const out = {};
  for (let i = 0; i < heads.length; i++) {
    const end = i + 1 < heads.length ? heads[i + 1].start : body.length;
    let val = body.slice(heads[i].end, end).replace(/^\s*\n/, "").replace(/\s+$/, "");
    if (val.trim() === "_No response_") val = "";
    out[heads[i].label] = val;
  }
  return out;
}

// Normalize free-form tag input to the skill.json schema pattern
// (^[a-z0-9]+(-[a-z0-9]+)*$, max 32 chars) so a submission can't preview clean
// yet fail CI — e.g. "Web Dev" -> "web-dev".
function parseTags(raw) {
  return [...new Set(
    (raw || "")
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32).replace(/-+$/g, ""))
      .filter(Boolean)
  )];
}

// ---------- validation ----------

function validate(fields, issueAuthor) {
  const errors = [];
  const name = (fields["skill name"] || "").trim();
  const category = (fields["category"] || "").trim().toLowerCase();
  const description = (fields["description"] || "").trim();
  const license = (fields["license"] || "").trim() || "MIT";
  const authorName = (fields["author name"] || "").trim() || issueAuthor || "";
  // No issueAuthor fallback here: a blank field must stay blank so the generated
  // skill.json matches the site's live preview (which can't know the submitter).
  const authorGh = (fields["author github"] || "").trim().replace(/^@/, "");
  const instructions = (fields["instructions"] || "").trim();
  const tags = parseTags(fields["tags"]).slice(0, 12);

  if (!NAME_RE.test(name) || name.length < 2 || name.length > 64) {
    errors.push('`Skill name` must be kebab-case (letters, digits, single hyphens), 2–64 chars — e.g. `commit-messages`.');
  } else if (existsSync(join(SKILLS_DIR, name))) {
    errors.push(`A skill named \`${name}\` already exists. Pick a different name (this flow only creates new skills).`);
  }
  if (description.length < 10 || description.length > 200) {
    errors.push("`Description` must be 10–200 characters.");
  }
  if (!CATEGORY_ORDER.includes(category)) {
    errors.push(`\`Category\` must be one of: ${CATEGORY_ORDER.join(", ")}.`);
  }
  if (license.length < 2 || license.length > 64) {
    errors.push("`License` must be a valid SPDX id (e.g. MIT, Apache-2.0, CC-BY-4.0).");
  }
  if (!authorName) errors.push("`Author name` is required.");
  if (authorGh && !GH_RE.test(authorGh)) errors.push("`Author GitHub` must be a valid GitHub username.");
  if (instructions.length < 20) errors.push("`Instructions` are required (write the actual skill guidance).");

  return { errors, skill: { name, category, description, license, authorName, authorGh, instructions, tags } };
}

// ---------- file generation ----------

function buildSkillMd({ name, description, instructions }) {
  // JSON.stringify yields a valid double-quoted YAML scalar, so odd characters in
  // the description can't break the frontmatter.
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${instructions}\n`;
}

function buildSkillJson({ name, description, category, license, authorName, authorGh, tags }) {
  const meta = { name, description, category, version: "0.1.0" };
  meta.author = authorGh ? { name: authorName, github: authorGh } : { name: authorName };
  meta.license = license;
  if (tags.length) meta.tags = tags;
  return stringifyJson(meta);
}

// ---------- outputs ----------

function setOutput(key, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const delim = "__SKILL_EOF__";
  appendFileSync(file, `${key}<<${delim}\n${value}\n${delim}\n`);
}

function fail(errors) {
  const list = errors.map((e) => `- ${e}`).join("\n");
  console.error("Submission is not valid:\n" + list);
  setOutput("ok", "false");
  setOutput("errors", list);
  // Exit 0 so the workflow can post the errors as a friendly comment instead of
  // failing the run; the "ok" output gates PR creation.
  process.exit(0);
}

// ---------- main ----------

function main() {
  const bodyArg = process.argv[2];
  const body = bodyArg ? readFileSync(bodyArg, "utf8") : process.env.ISSUE_BODY || "";
  if (!body.includes(MARKER)) {
    fail(["This issue is not a skill submission (missing the submission marker). Use the form at the catalog site's Submit page."]);
  }

  const fields = parseSections(body);
  const { errors, skill } = validate(fields, process.env.ISSUE_AUTHOR);
  if (errors.length) fail(errors);

  const dir = join(SKILLS_DIR, skill.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), buildSkillMd(skill));
  writeFileSync(join(dir, "skill.json"), buildSkillJson(skill));

  console.log(`Wrote skills/${skill.name}/SKILL.md and skill.json`);
  setOutput("ok", "true");
  setOutput("name", skill.name);
}

main();

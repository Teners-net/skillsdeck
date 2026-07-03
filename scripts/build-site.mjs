#!/usr/bin/env node
// Builds the skillsdeck catalog website into site/ (gitignored) from the skills/
// tree. Deployed to GitHub Pages by .github/workflows/pages.yml. This is a
// presentational artifact — it is NOT committed and NOT part of the validate
// sync gate (unlike registry.json, which the CLI consumes at runtime).
//
//   npm run build:site        # writes site/index.html, site/skills/<name>.html, assets
//
// All asset/link URLs are RELATIVE so the site works both at a domain root and
// under the GitHub project-pages base path (/skillsdeck/).

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import {
  loadAllSkills,
  readMarketplaceBase,
  ROOT,
  SKILLS_DIR,
  CATEGORY_ORDER,
} from "./lib.mjs";

// Demote every heading in a rendered SKILL.md body one level (h1→h2, …) so the
// page's skill-name <h1> stays the only <h1> — the body's own title starts at #.
marked.use({
  walkTokens(token) {
    if (token.type === "heading") token.depth = Math.min(token.depth + 1, 6);
  },
});

const SITE_DIR = join(ROOT, "site");

const CATEGORY_LABELS = {
  coding: "Coding",
  writing: "Writing",
  research: "Research",
  data: "Data",
  devops: "DevOps",
  productivity: "Productivity",
  design: "Design",
  security: "Security",
  meta: "Meta",
};

// ---------- project metadata (no hardcoding of the repo slug) ----------

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const REPO_SLUG =
  (pkg.repository?.url || pkg.homepage || "")
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/$/, "") || "Teners-net/skillsdeck";
const REPO_URL = `https://github.com/${REPO_SLUG}`;
const base = readMarketplaceBase(); // { name, owner, description, version }
const SITE_NAME = base.name || "skillsdeck";
const SITE_TAGLINE = base.description || "A catalog of Agent Skills for AI coding agents.";

// Contribution links (all point into this project — the site never links out to
// other skill catalogs/directories).
const NEW_ISSUE_URL = `${REPO_URL}/issues/new?template=skill-submission.md`;
const AUTHORING_URL = `${REPO_URL}/blob/main/docs/authoring-skills.md`;
const SCHEMA_URL = `${REPO_URL}/blob/main/schema/skill.schema.json`;
const SECURITY_URL = `${REPO_URL}/blob/main/SECURITY.md`;

// ---------- html helpers ----------

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// A copyable command row.
function cmd(text) {
  return `<div class="cmd"><code>${esc(text)}</code><button class="copy" type="button" data-copy="${esc(text)}" aria-label="Copy command to clipboard">Copy</button></div>`;
}

function badge(category) {
  return `<span class="badge" data-cat="${esc(category)}">${esc(CATEGORY_LABELS[category] || category)}</span>`;
}

// Full HTML document. `prefix` is "" for the index (site root) or "../" for pages
// under site/skills/, so every relative asset/link resolves under any base path.
function page({ title, description, prefix, main }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="${prefix}assets/styles.css">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
<script defer src="${prefix}assets/app.js"></script>
</head>
<body>
<header class="site-header">
  <a class="brand" href="${prefix}index.html">${esc(SITE_NAME)}</a>
  <nav class="site-nav">
    <a href="${prefix}publish.html">Publish a skill</a>
    <a href="${REPO_URL}">GitHub</a>
    <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle color theme">◑</button>
  </nav>
</header>
<main>
${main}
</main>
<footer class="site-footer">
  <span>${esc(SITE_NAME)} — Agent Skills catalog</span>
  <span>·</span>
  <a href="${prefix}publish.html">Publish a skill</a>
  <span>·</span>
  <a href="${REPO_URL}">GitHub</a>
</footer>
</body>
</html>
`;
}

// ---------- data ----------

const all = loadAllSkills();
const broken = all.filter((s) => s.metaError || s.frontmatterError);
for (const s of broken) {
  console.warn(`build:site — skipping invalid skill "${s.name}": ${s.metaError || s.frontmatterError}`);
}
const skills = all
  .filter((s) => !s.metaError && !s.frontmatterError)
  .sort((a, b) => a.meta.name.localeCompare(b.meta.name));

const categoriesPresent = CATEGORY_ORDER.filter((c) => skills.some((s) => s.meta.category === c));
const allTags = [...new Set(skills.flatMap((s) => s.meta.tags || []))].sort();

// ---------- per-skill install commands ----------

function installCommands(name) {
  return [
    ["Claude Code (default)", `npx ${SITE_NAME} install ${name}`],
    ["OpenAI Codex", `npx ${SITE_NAME} install ${name} --agent codex`],
    ["Gemini CLI", `npx ${SITE_NAME} install ${name} --agent gemini`],
    ["Any other agent", `npx ${SITE_NAME} install ${name} --dir <skills-dir>`],
    ["Claude Code plugin marketplace", `claude plugin install ${name}@${SITE_NAME} --scope user`],
  ];
}

// ---------- pages ----------

function skillCard(s) {
  const m = s.meta;
  const tags = (m.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  return `<article class="card" data-card data-name="${esc(m.name)}" data-category="${esc(m.category)}" data-tags="${esc((m.tags || []).join(" "))}" data-desc="${esc(m.description.toLowerCase())}">
  <a class="card-title" href="skills/${esc(m.name)}.html">${esc(m.name)}</a>
  <div class="card-meta">${badge(m.category)}<span class="ver">v${esc(m.version)}</span></div>
  <p class="card-desc">${esc(m.description)}</p>
  <div class="tags">${tags}</div>
</article>`;
}

function renderIndex() {
  const catChips = [`<button class="chip active" type="button" data-cat="">All</button>`]
    .concat(categoriesPresent.map((c) => `<button class="chip" type="button" data-cat="${esc(c)}">${esc(CATEGORY_LABELS[c] || c)}</button>`))
    .join("");
  const tagChips = allTags.map((t) => `<button class="chip chip-tag" type="button" data-tag="${esc(t)}">#${esc(t)}</button>`).join("");
  const cards = skills.map(skillCard).join("\n");
  const primaryInstall = skills.length ? `npx ${SITE_NAME} install ${skills[0].meta.name}` : `npx ${SITE_NAME} search <query>`;

  const main = `<section class="hero">
  <h1>${esc(SITE_NAME)}</h1>
  <p class="tagline">${esc(SITE_TAGLINE)}</p>
  ${cmd(primaryInstall)}
  <p class="counts">${skills.length} skill${skills.length === 1 ? "" : "s"} across ${categoriesPresent.length} categor${categoriesPresent.length === 1 ? "y" : "ies"}.</p>
</section>

<section class="explainer">
  <h2>What are Agent Skills?</h2>
  <p>A skill is a folder with a <code>SKILL.md</code> file — metadata plus instructions that tell an AI coding agent how to perform a task. Agents load a skill only when a task matches its description, so many skills add little context cost. The format is portable: a skill written once works across any skills-compatible agent. <a href="publish.html">Have one to share? Publish it →</a></p>
</section>

<section class="works-with">
  <h2>Works with</h2>
  <ul class="agents">
    <li><strong>Claude Code</strong> <code>--agent claude</code> (default)</li>
    <li><strong>OpenAI Codex</strong> <code>--agent codex</code></li>
    <li><strong>Gemini CLI</strong> <code>--agent gemini</code></li>
    <li><strong>Any SKILL.md agent</strong> <code>--dir &lt;skills-dir&gt;</code></li>
    <li><strong>Claude Code plugin marketplace</strong> — <code>claude plugin install &lt;skill&gt;@${esc(SITE_NAME)}</code></li>
  </ul>
</section>

<section class="cta">
  <h2>Publish your own skill</h2>
  <p>Built a workflow, house convention, or bit of hard-won expertise you keep reusing? Package it as a <code>SKILL.md</code> folder and share it with every skills-compatible agent. It's one folder and one pull request — and it works for the whole community, whichever agent they use.</p>
  <div class="cta-actions">
    <a class="btn" href="publish.html">How to publish →</a>
    <a class="btn btn-ghost" href="${NEW_ISSUE_URL}">Propose a skill</a>
  </div>
</section>

<section class="catalog" aria-labelledby="catalog-h">
  <h2 id="catalog-h" class="sr-only">Browse skills</h2>
  <div class="controls">
    <input id="q" class="search" type="search" placeholder="Search skills…" aria-label="Search skills" autocomplete="off">
    <div class="chips" id="cats" role="group" aria-label="Filter by category">${catChips}</div>
    ${tagChips ? `<div class="chips tagbar" id="tags" role="group" aria-label="Filter by tag">${tagChips}</div>` : ""}
  </div>
  <p class="result-count" id="count" aria-live="polite"></p>
  <div class="grid" id="grid">
${cards}
  </div>
  <p class="empty" id="empty" hidden>No skills match your filters.</p>
</section>`;

  return page({ title: `${SITE_NAME} — Agent Skills catalog`, description: SITE_TAGLINE, prefix: "", main });
}

function renderSkillPage(s) {
  const m = s.meta;
  const md = readFileSync(join(SKILLS_DIR, m.name, "SKILL.md"), "utf8");
  const body = matter(md).content;
  const rendered = marked.parse(body);
  const tags = (m.tags || []).map((t) => `<a class="tag" href="../index.html?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join("");
  const authorName = m.author?.name ? esc(m.author.name) : "";
  const author = m.author?.github
    ? `<a href="https://github.com/${esc(m.author.github)}">${authorName || "@" + esc(m.author.github)}</a>`
    : authorName;
  const installRows = installCommands(m.name)
    .map(([label, c]) => `<div class="install-row"><span class="install-label">${esc(label)}</span>${cmd(c)}</div>`)
    .join("\n");

  const main = `<nav class="crumbs"><a href="../index.html">← All skills</a></nav>
<article class="skill">
  <header class="skill-head">
    <h1>${esc(m.name)}</h1>
    <div class="skill-meta">${badge(m.category)}<span class="ver">v${esc(m.version)}</span>${m.license ? `<span class="lic">${esc(m.license)}</span>` : ""}</div>
    <p class="skill-desc">${esc(m.description)}</p>
    <div class="tags">${tags}</div>
    <p class="byline">${author ? `by ${author} · ` : ""}<a href="${REPO_URL}/tree/main/${esc(s.relDir)}">Source</a> · <a href="${REPO_URL}/blob/main/${esc(s.relDir)}/SKILL.md">SKILL.md</a></p>
  </header>

  <section class="install">
    <h2>Install</h2>
${installRows}
  </section>

  <section class="prose">
    <h2>Instructions</h2>
${rendered}
  </section>
</article>`;

  return page({ title: `${m.name} — ${SITE_NAME}`, description: m.description, prefix: "../", main });
}

function renderPublishPage() {
  const folderTree = `skills/&lt;name&gt;/
├── SKILL.md        # required — metadata + instructions
├── skill.json      # required — catalog metadata
├── README.md       # optional — longer docs / examples
├── references/     # optional — extra files the skill points the agent to
├── scripts/        # optional — helper scripts the skill invokes
└── assets/         # optional — images or data`;
  const skillJson = `{
  "name": "your-skill",
  "description": "One concise line for the catalog and search.",
  "category": "writing",
  "version": "0.1.0",
  "author": { "name": "Your Name", "github": "your-handle" },
  "license": "MIT",
  "tags": ["short", "search", "keywords"]
}`;

  const main = `<section class="hero hero-sm">
  <h1>Publish a skill</h1>
  <p class="tagline">Share a workflow, convention, or bit of expertise with every skills-compatible agent. A skill is one folder and one pull request — no framework, no lock-in.</p>
  <div class="cta-actions">
    <a class="btn" href="${NEW_ISSUE_URL}">Propose a skill</a>
    <a class="btn btn-ghost" href="${AUTHORING_URL}">Read the authoring guide</a>
  </div>
</section>

<section class="steps">
  <h2>How it works</h2>
  <ol class="steplist">
    <li><strong>Create the folder.</strong> Add <code>skills/&lt;name&gt;/SKILL.md</code> (YAML frontmatter with <code>name</code> + <code>description</code>, then your instructions) and <code>skills/&lt;name&gt;/skill.json</code> (catalog metadata). The folder name, the <code>SKILL.md</code> name, and the <code>skill.json</code> name must all match and be kebab-case.</li>
    <li><strong>Write a description that triggers well.</strong> Name the tasks, verbs, and file types that should activate the skill — that text is how an agent decides when to use it.</li>
    <li><strong>Validate &amp; generate.</strong> Run <code>npm run validate</code>, then <code>npm run generate</code> to rebuild the manifests, registry, and README catalog. Optionally <code>npm run lint:secrets</code>.</li>
    <li><strong>Open a pull request.</strong> One skill per PR. CI checks structure and scans for secrets with gitleaks; a maintainer reviews for quality and safety before merge.</li>
  </ol>
</section>

<section class="reference">
  <h2>Folder contract</h2>
  <pre><code>${folderTree}</code></pre>

  <h2>skill.json</h2>
  <pre><code>${esc(skillJson)}</code></pre>
  <p>Pick one <code>category</code> from: coding, writing, research, data, devops, productivity, design, security, meta. See the full <a href="${AUTHORING_URL}">authoring guide</a> and the <a href="${SCHEMA_URL}">skill.json schema</a>.</p>
</section>

<section class="safety">
  <h2>Safety</h2>
  <p>A skill is a set of instructions an agent may act on, so every submission is reviewed and CI-scanned. Skills must not run destructive commands, exfiltrate secrets, or weaken safety controls — read the <a href="${SECURITY_URL}">security policy</a> before you submit.</p>
  <div class="cta-actions">
    <a class="btn" href="${NEW_ISSUE_URL}">Propose a skill</a>
    <a class="btn btn-ghost" href="index.html">Browse the catalog</a>
  </div>
</section>`;

  return page({
    title: `Publish a skill — ${SITE_NAME}`,
    description: `How to contribute an Agent Skill to the ${SITE_NAME} catalog.`,
    prefix: "",
    main,
  });
}

// ---------- assets ----------

const STYLES = `:root{
  --bg:#ffffff; --fg:#1a1a1a; --muted:#5c6370; --border:#e5e7eb; --card:#fafafa;
  --accent:#2563eb; --accent-fg:#ffffff; --code-bg:#f3f4f6; --chip:#eef2f7;
  --radius:10px; --maxw:960px;
  --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}
:root[data-theme="dark"]{
  --bg:#0f1115; --fg:#e6e7eb; --muted:#9aa4b2; --border:#242832; --card:#161922;
  --accent:#6ea8fe; --accent-fg:#0f1115; --code-bg:#1b1f29; --chip:#1b1f29;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0f1115; --fg:#e6e7eb; --muted:#9aa4b2; --border:#242832; --card:#161922;
  --accent:#6ea8fe; --accent-fg:#0f1115; --code-bg:#1b1f29; --chip:#1b1f29;
}}
*{box-sizing:border-box}
html{color-scheme:light dark}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font);line-height:1.55}
main{max-width:var(--maxw);margin:0 auto;padding:0 20px 64px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
h1,h2,h3{line-height:1.25}
code{font-family:var(--mono);font-size:.9em}

.site-header{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;
  gap:16px;max-width:var(--maxw);margin:0 auto;padding:14px 20px;background:color-mix(in srgb,var(--bg) 88%,transparent);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.brand{font-weight:700;font-size:1.15rem;color:var(--fg)}
.site-nav{display:flex;align-items:center;gap:16px}
.theme-toggle{background:none;border:1px solid var(--border);color:var(--fg);border-radius:8px;
  width:34px;height:34px;font-size:1rem;cursor:pointer}
.theme-toggle:hover{border-color:var(--accent)}

.hero{padding:48px 0 8px;text-align:center}
.hero h1{font-size:2.4rem;margin:0 0 6px}
.tagline{color:var(--muted);max-width:620px;margin:0 auto 20px}
.counts{color:var(--muted);font-size:.9rem;margin-top:12px}

.explainer,.works-with,.steps,.reference,.safety{border-top:1px solid var(--border);padding:24px 0}
.explainer p{color:var(--muted);max-width:720px}
.hero-sm{padding:40px 0 8px}

.btn{display:inline-block;background:var(--accent);color:var(--accent-fg);border:1px solid var(--accent);
  border-radius:8px;padding:9px 16px;font-weight:600;font-size:.95rem}
.btn:hover{opacity:.9;text-decoration:none}
.btn-ghost{background:transparent;color:var(--fg);border-color:var(--border)}
.btn-ghost:hover{border-color:var(--accent)}
.cta-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:16px}

.cta{border-top:1px solid var(--border);margin-top:28px;padding:32px 0 8px;text-align:center}
.cta h2{margin:0 0 8px}
.cta p{color:var(--muted);max-width:640px;margin:0 auto}

.steplist{padding-left:20px;max-width:760px}
.steplist li{margin:8px 0}
.steplist code,.reference p code,.safety code{background:var(--code-bg);padding:1px 6px;border-radius:6px}
.reference pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:12px;overflow-x:auto}
.reference p,.safety p{color:var(--muted);max-width:760px}
.agents{list-style:none;padding:0;margin:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.agents li{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;font-size:.92rem}
.agents code{background:var(--code-bg);padding:1px 6px;border-radius:6px}

.cmd{display:flex;align-items:center;gap:8px;background:var(--code-bg);border:1px solid var(--border);
  border-radius:8px;padding:8px 10px;overflow-x:auto;max-width:100%}
.cmd code{white-space:pre;flex:1;min-width:0}
.hero .cmd{max-width:520px;margin:0 auto}
.copy{flex:none;background:var(--accent);color:var(--accent-fg);border:0;border-radius:6px;
  padding:5px 10px;font-size:.8rem;font-weight:600;cursor:pointer}
.copy:hover{opacity:.9}
.copy.copied{background:#16a34a}

.controls{display:flex;flex-direction:column;gap:12px;margin:8px 0 16px}
.search{width:100%;padding:11px 14px;font-size:1rem;border:1px solid var(--border);border-radius:var(--radius);
  background:var(--card);color:var(--fg)}
.search:focus,.theme-toggle:focus,.chip:focus,.copy:focus,.btn:focus{outline:2px solid var(--accent);outline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{background:var(--chip);border:1px solid var(--border);color:var(--fg);border-radius:999px;
  padding:5px 12px;font-size:.85rem;cursor:pointer}
.chip.active{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}
.chip-tag{font-family:var(--mono);font-size:.8rem}
.tagbar{opacity:.95}
.result-count{color:var(--muted);font-size:.85rem;margin:0 0 12px}

.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;flex-direction:column;gap:8px}
.card[hidden]{display:none}
.card-title{font-weight:700;font-size:1.05rem;font-family:var(--mono)}
.card-meta{display:flex;align-items:center;gap:8px}
.card-desc{margin:0;color:var(--muted);font-size:.92rem}
.badge{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
  padding:2px 8px;border-radius:999px;background:var(--chip);border:1px solid var(--border)}
.badge[data-cat="coding"]{color:#2563eb}.badge[data-cat="writing"]{color:#7c3aed}
.badge[data-cat="research"]{color:#0891b2}.badge[data-cat="data"]{color:#0d9488}
.badge[data-cat="devops"]{color:#ea580c}.badge[data-cat="productivity"]{color:#ca8a04}
.badge[data-cat="design"]{color:#db2777}.badge[data-cat="security"]{color:#dc2626}
.badge[data-cat="meta"]{color:#6b7280}
.ver,.lic{font-size:.78rem;color:var(--muted);font-family:var(--mono)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{font-family:var(--mono);font-size:.75rem;color:var(--muted);background:var(--chip);
  border:1px solid var(--border);border-radius:6px;padding:1px 7px}
.empty{color:var(--muted);text-align:center;padding:32px}

.crumbs{padding:20px 0 0}
.skill-head{border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:8px}
.skill-head h1{font-family:var(--mono);margin:8px 0 6px}
.skill-meta{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.skill-desc{color:var(--muted);margin:6px 0}
.byline{font-size:.85rem;color:var(--muted)}
.install h2,.prose h2{font-size:1.1rem;margin:20px 0 10px}
.install-row{margin:8px 0}
.install-label{display:block;font-size:.78rem;color:var(--muted);margin-bottom:4px}

.prose{border-top:1px solid var(--border);margin-top:16px}
.prose :is(h1,h2,h3,h4){margin:20px 0 8px}
.prose p,.prose li{color:var(--fg)}
.prose ul,.prose ol{padding-left:22px}
.prose code{background:var(--code-bg);padding:1px 6px;border-radius:6px}
.prose pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:12px;overflow-x:auto}
.prose pre code{background:none;padding:0}
.prose table{border-collapse:collapse;display:block;overflow-x:auto}
.prose th,.prose td{border:1px solid var(--border);padding:6px 10px;text-align:left}
.prose blockquote{border-left:3px solid var(--border);margin:12px 0;padding:4px 14px;color:var(--muted)}

.site-footer{max-width:var(--maxw);margin:0 auto;padding:24px 20px;border-top:1px solid var(--border);
  color:var(--muted);font-size:.85rem;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
`;

const APP_JS = `"use strict";
// Theme toggle (persisted; defaults to the OS preference).
(function(){
  var btn=document.getElementById("theme-toggle");
  if(!btn)return;
  btn.addEventListener("click",function(){
    var cur=document.documentElement.dataset.theme;
    var next = cur==="dark" ? "light" : cur==="light" ? "dark"
      : (window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches ? "light":"dark");
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem("theme",next);}catch(e){}
  });
})();

// Copy-to-clipboard for [data-copy].
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-copy]");
  if(!b)return;
  var text=b.getAttribute("data-copy");
  var done=function(){var o=b.textContent;b.textContent="Copied!";b.classList.add("copied");
    setTimeout(function(){b.textContent=o;b.classList.remove("copied");},1500);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,done);}
  else{try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();
    document.execCommand("copy");document.body.removeChild(ta);done();}catch(e){}}
});

// Catalog search + category/tag filtering (index page only).
(function(){
  var grid=document.getElementById("grid");
  if(!grid)return;
  var cards=[].slice.call(grid.querySelectorAll("[data-card]"));
  var q=document.getElementById("q");
  var count=document.getElementById("count");
  var empty=document.getElementById("empty");
  var state={q:"",cat:"",tag:""};

  function score(card,query){
    var name=card.dataset.name.toLowerCase();
    var tags=card.dataset.tags.toLowerCase().split(" ").filter(Boolean);
    var desc=card.dataset.desc;
    var cat=card.dataset.category.toLowerCase();
    if(name===query)return 100;
    if(name.indexOf(query)===0)return 80;
    if(tags.indexOf(query)>=0)return 60;
    if(name.indexOf(query)>=0)return 50;
    if(tags.some(function(t){return t.indexOf(query)>=0;}))return 40;
    if(cat===query)return 35;
    if(desc.indexOf(query)>=0)return 20;
    return 0;
  }

  function apply(){
    var query=state.q.trim().toLowerCase();
    var shown=[];
    cards.forEach(function(c){
      var ok = (!state.cat || c.dataset.category===state.cat)
        && (!state.tag || c.dataset.tags.split(" ").indexOf(state.tag)>=0);
      var sc = query ? score(c,query) : 1;
      if(ok && sc>0){shown.push({c:c,sc:sc});c.hidden=false;}else{c.hidden=true;}
    });
    shown.sort(function(a,b){return b.sc-a.sc || a.c.dataset.name.localeCompare(b.c.dataset.name);});
    shown.forEach(function(x){grid.appendChild(x.c);});
    if(count)count.textContent=shown.length+" of "+cards.length+" skills";
    if(empty)empty.hidden=shown.length!==0;
    syncChips();
    updateUrl();
  }
  function syncChips(){
    document.querySelectorAll("[data-cat]").forEach(function(el){
      el.classList.toggle("active",(el.dataset.cat||"")===state.cat);});
    document.querySelectorAll("[data-tag]").forEach(function(el){
      el.classList.toggle("active",el.dataset.tag===state.tag);});
  }
  function updateUrl(){
    var p=new URLSearchParams();
    if(state.q)p.set("q",state.q);
    if(state.cat)p.set("cat",state.cat);
    if(state.tag)p.set("tag",state.tag);
    var qs=p.toString();
    history.replaceState(null,"",qs?("?"+qs):location.pathname);
  }

  if(q)q.addEventListener("input",function(){state.q=q.value;apply();});
  document.addEventListener("click",function(e){
    var cc=e.target.closest("[data-cat]");
    if(cc){state.cat=cc.dataset.cat||"";apply();return;}
    var tc=e.target.closest("[data-tag]");
    if(tc){state.tag = state.tag===tc.dataset.tag ? "" : tc.dataset.tag;apply();return;}
  });

  // Deep-link support: ?q= &cat= &tag=
  var init=new URLSearchParams(location.search);
  state.q=init.get("q")||"";state.cat=init.get("cat")||"";state.tag=init.get("tag")||"";
  if(q&&state.q)q.value=state.q;
  apply();
})();
`;

// ---------- write ----------

rmSync(SITE_DIR, { recursive: true, force: true });
mkdirSync(join(SITE_DIR, "skills"), { recursive: true });
mkdirSync(join(SITE_DIR, "assets"), { recursive: true });

writeFileSync(join(SITE_DIR, "index.html"), renderIndex());
writeFileSync(join(SITE_DIR, "publish.html"), renderPublishPage());
for (const s of skills) {
  writeFileSync(join(SITE_DIR, "skills", `${s.meta.name}.html`), renderSkillPage(s));
}
writeFileSync(join(SITE_DIR, "assets", "styles.css"), STYLES);
writeFileSync(join(SITE_DIR, "assets", "app.js"), APP_JS);
writeFileSync(join(SITE_DIR, ".nojekyll"), "");

console.log(`Built site/ for ${skills.length} skills (${categoriesPresent.length} categories).`);

// End-to-end test of the MCP server: spins up `bin.mjs mcp serve` over stdio and
// drives it with the SDK client. SKILLSDECK_SOURCE_DIR points at the repo root so
// the registry and SKILL.md bodies resolve locally (no network).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const BIN = join(HERE, "bin.mjs");

let client;

before(async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BIN, "mcp", "serve"],
    env: { ...process.env, SKILLSDECK_SOURCE_DIR: ROOT },
    cwd: ROOT,
  });
  client = new Client({ name: "skillsdeck-test", version: "0.0.0" });
  await client.connect(transport);
});

after(async () => {
  await client?.close();
});

test("exposes exactly the four read-only tools", async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "get_skill_info",
    "list_skills",
    "read_skill",
    "search_skills",
  ]);
});

test("search_skills ranks the best match first", async () => {
  const res = await client.callTool({
    name: "search_skills",
    arguments: { query: "laravel" },
  });
  const hits = JSON.parse(res.content[0].text);
  assert.equal(hits[0].name, "laravel-services-support");
});

test("list_skills filters by category", async () => {
  const res = await client.callTool({
    name: "list_skills",
    arguments: { category: "coding" },
  });
  const list = JSON.parse(res.content[0].text);
  assert.ok(list.length >= 1);
  assert.ok(list.every((s) => s.category === "coding"));
});

test("get_skill_info returns the catalog entry", async () => {
  const res = await client.callTool({
    name: "get_skill_info",
    arguments: { name: "code-comments" },
  });
  const info = JSON.parse(res.content[0].text);
  assert.equal(info.name, "code-comments");
  assert.equal(info.category, "coding");
});

test("read_skill returns the SKILL.md body", async () => {
  const res = await client.callTool({
    name: "read_skill",
    arguments: { name: "code-comments" },
  });
  assert.ok(!res.isError);
  assert.match(res.content[0].text, /name:\s*code-comments/);
});

test("unknown skill yields a tool error", async () => {
  const res = await client.callTool({
    name: "get_skill_info",
    arguments: { name: "does-not-exist" },
  });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /unknown skill/);
});

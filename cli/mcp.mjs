// Read-only MCP server (stdio) over the skillsdeck catalog.
//
// Exposes four tools — list_skills, search_skills, get_skill_info, read_skill —
// so MCP clients (Claude Code/Desktop, Cursor, …) can browse the catalog. It is
// deliberately read-only: it never writes to disk. Users install skills with the
// `skillsdeck install` CLI command.
//
// Depends on @modelcontextprotocol/sdk + zod, which are OPTIONAL dependencies —
// bin.mjs imports this module lazily so the rest of the CLI runs with zero deps.
//
// stdio transport uses stdout as the JSON-RPC channel: this module and core.mjs
// must never write to stdout. Diagnostics (via die() in bin.mjs) go to stderr.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  loadRegistry,
  skillMap,
  searchScore,
  readSkillMarkdown,
  pkgVersion,
} from "./core.mjs";

// Structured results are returned as pretty JSON in a text block — the content
// type every MCP client renders. Failures become tool errors (isError) rather
// than exceptions, so the client sees a clean, actionable result.
const json = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});
const fail = (msg) => ({ content: [{ type: "text", text: msg }], isError: true });

const unknownSkill = (name) =>
  fail(`unknown skill "${name}". Use search_skills or list_skills to find one.`);

export async function serve() {
  const server = new McpServer({ name: "skillsdeck", version: pkgVersion() });

  // The registry is static for a server session — load once and reuse.
  const registry = await loadRegistry();
  const skills = registry.skills || [];
  const byName = skillMap(registry);

  server.registerTool(
    "list_skills",
    {
      title: "List skills",
      description:
        "List all skills in the skillsdeck catalog, optionally filtered by category. " +
        "Returns each skill's name, description, category, version, tags, author, and path.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Only list skills in this category (e.g. coding, writing, devops)."),
      },
    },
    async ({ category }) => {
      let out = category ? skills.filter((s) => s.category === category) : skills;
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
      return json(out);
    }
  );

  server.registerTool(
    "search_skills",
    {
      title: "Search skills",
      description:
        "Search the catalog by a query, ranked by relevance (name > tags > description). " +
        "Returns matching skill entries, best match first.",
      inputSchema: {
        query: z.string().describe("Search text, e.g. 'testing' or 'laravel'."),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of results to return."),
      },
    },
    async ({ query, limit }) => {
      const q = query.toLowerCase();
      let hits = skills
        .map((s) => ({ s, score: searchScore(s, q) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
        .map((x) => x.s);
      if (limit) hits = hits.slice(0, limit);
      return json(hits);
    }
  );

  server.registerTool(
    "get_skill_info",
    {
      title: "Get skill info",
      description:
        "Get the full catalog entry for one skill by name " +
        "(description, category, version, tags, author, license, path).",
      inputSchema: {
        name: z.string().describe("The exact skill name, e.g. 'code-comments'."),
      },
    },
    async ({ name }) => {
      const s = byName.get(name);
      return s ? json(s) : unknownSkill(name);
    }
  );

  server.registerTool(
    "read_skill",
    {
      title: "Read skill",
      description:
        "Return the full SKILL.md instructions for a skill by name — the markdown an agent loads.",
      inputSchema: {
        name: z.string().describe("The exact skill name, e.g. 'code-comments'."),
      },
    },
    async ({ name }) => {
      const s = byName.get(name);
      if (!s) return unknownSkill(name);
      try {
        return { content: [{ type: "text", text: await readSkillMarkdown(s) }] };
      } catch (err) {
        return fail(`could not read SKILL.md for "${name}": ${err.message}`);
      }
    }
  );

  await server.connect(new StdioServerTransport());
}

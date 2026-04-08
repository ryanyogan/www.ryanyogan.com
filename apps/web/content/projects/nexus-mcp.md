---
title: "Nexus MCP"
tagline: "MCP server giving AI assistants persistent memory, real-time library documentation, and stack-specific prompts. Your AI stops hallucinating API signatures and starts remembering your project conventions."
tech:
  - TypeScript
  - MCP
  - Cloudflare Workers
  - D1
  - Vectorize
github: "https://github.com/ryanyogan/nexus-mcp"
year: "2026"
featured: true
---

MCP server providing AI assistants with library documentation, project memory, and development knowledge. Supports semantic search, persistent context, and stack-specific prompts. Think of it as a knowledge backbone for your AI coding workflow — every tool, every library, every decision you've made, available to your assistant instantly.

## Available Tools

- **resolve-library** — Resolve a package name to its documentation ID. Supports npm, PyPI, crates.io, and more. Returns versioned documentation references that can be queried.
- **query-docs** — Semantic search across library documentation. Ask natural language questions like "how do I set up authentication in Next.js" and get relevant code examples and explanations.
- **save-memory** — Store project context, decisions, and knowledge that persists across sessions. Tag memories with categories for organized retrieval.
- **recall-memories** — Retrieve stored memories using semantic search. Your AI assistant remembers why you chose Drizzle over Prisma three months ago.
- **discover-servers** — Browse and discover available MCP servers from the ecosystem. Filter by category, language, or use case.
- **get-stack** — Get pre-built system prompts optimized for specific technology stacks. Includes best practices, common patterns, and gotchas.

## Use Cases

**Library Documentation on Demand** — Instead of your AI hallucinating API signatures, Nexus provides real, up-to-date documentation. Query docs for any library and get accurate examples.

**Persistent Project Context** — Save architectural decisions, naming conventions, and project-specific patterns. When you start a new session, your assistant already knows your codebase conventions.

**MCP Server Discovery** — The MCP ecosystem is growing fast. Nexus helps you find and configure servers for databases, APIs, file systems, and more.

## How It Works

Nexus runs as a local MCP server that your editor connects to. Documentation is fetched on-demand and cached locally in a SQLite database. Memories are stored with vector embeddings for semantic retrieval. The server is lightweight — under 50MB memory footprint — and requires no external dependencies beyond Node.js.

## Quick Start

```json
{
  "mcpServers": {
    "nexus": {
      "command": "npx",
      "args": ["-y", "nexus-mcp"]
    }
  }
}
```

Add the configuration above to your editor's MCP settings (Claude Desktop, Cursor, VS Code, etc.) and the tools become immediately available to your AI assistant.

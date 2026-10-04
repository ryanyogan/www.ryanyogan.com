---
title: "Nexus"
summary: "Shared memory and docs search for agents over MCP"
tagline: "Shared memory and documentation search for agents over MCP, running on Cloudflare Workers. Memory is spread across D1, R2 and Vectorize, with importance and scope on every entry."
tech:
  - TypeScript
  - MCP
  - Cloudflare Workers
  - D1
  - R2
  - Vectorize
github: "https://github.com/ryanyogan/nexus"
live: "https://nexus.yogan.dev"
year: "2026"
featured: true
group: agents-memory
status: live
order: 2
---

Shared memory and documentation search for agents over MCP, live at [nexus.yogan.dev](https://nexus.yogan.dev). Supports semantic search, persistent context, and stack-specific prompts. Think of it as a knowledge backbone for your AI coding workflow — every tool, every library, every decision you've made, available to your assistant instantly.

## Available Tools

Nexus exposes 14 MCP tools and 3 prompts over HTTP. There is no published CLI or SDK. Some of the tools:

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

Nexus runs on Cloudflare Workers. Memory is stored across D1, R2 and Vectorize, and every memory carries an importance and a scope, so several agents can share one memory layer without reading each other's noise.

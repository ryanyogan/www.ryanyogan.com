---
title: "Fizzy Do MCP"
summary: "67 MCP tools across 12 categories for the Fizzy kanban"
tagline: "67 MCP tools across 12 categories for the Fizzy kanban, including composite project-manager tools. Published on npm as fizzy-do-mcp and deliberately simplified to local-first in v0.5."
tech:
  - TypeScript
  - MCP
  - Vite+
  - Node.js
github: "https://github.com/ryanyogan/fizzy-do-mcp"
live: "https://fizzy.yogan.dev"
year: "2026"
group: tools-for-agents
status: live
statusLabel: "On npm"
order: 1
---

Open-source MCP server connecting AI assistants to the Fizzy kanban, published on npm as `fizzy-do-mcp`. 67 tools across 12 categories, including composite "project manager" tools. Version 0.5 deliberately simplified it to local-first.

Install it from npm: [fizzy-do-mcp](https://www.npmjs.com/package/fizzy-do-mcp).

## Tool Categories

67 tools across 12 categories:

- **Cards** (18): list, get, create, update, delete, close, reopen, postpone, triage, tag, assign, watch, pin, mark golden
- **Boards** (7): list, get, create, update, delete, publish, unpublish
- **Reactions** (6): list, add and remove, on cards and on comments
- **Webhooks** (6): list, get, create, update, delete, test
- **Columns** (5): list, get, create, update, delete
- **Comments** (5): list, get, create, update, delete
- **Steps** (5): the checklist items inside a card. List, create, update, toggle, delete
- **Notifications** (5): list, get, count, mark one read, mark all read
- **Project manager** (5): actionable cards, project context, progress reports, and starting and ending a work session
- **Identity** (2), **Users** (2), **Tags** (1): lookups

## CLI Commands

The same package is the command line for setup:

```bash
npx fizzy-do-mcp configure   # store the Fizzy token and configure installed editors
npx fizzy-do-mcp whoami      # show the current identity
npx fizzy-do-mcp status      # check the server configuration
npx fizzy-do-mcp logout      # clear stored credentials
```

## Built with the Vite+ Toolchain

The repo is a pnpm workspace built with Vite+: one tool for the build, the tests, linting and formatting. The docs site at [fizzy.yogan.dev](https://fizzy.yogan.dev) is VitePress.

## Supported Editors

The README has setup guides for Claude Desktop, Claude Code, Cursor, Windsurf, Continue and OpenCode.

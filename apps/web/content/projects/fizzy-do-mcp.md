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

Open-source MCP server connecting AI assistants to the Fizzy kanban, published on npm as `fizzy-do-mcp`. 67 tools across 12 categories, including composite "project manager" tools. Version 0.5 deliberately simplified it to local-first. Turn your AI assistant into a full-featured project manager that can create, update, and organize work directly in Fizzy.

Install it from npm: [fizzy-do-mcp](https://www.npmjs.com/package/fizzy-do-mcp).

## Tool Categories

67 tools across 12 categories, including:

- **Boards** — List, create, update, delete, publish/unpublish, archive/unarchive, duplicate, reorder. Full board lifecycle management.
- **Cards** — Create, update, delete, move, assign, set due dates, add labels, attach files, convert to subtasks. Full card lifecycle with bulk operations.
- **Columns** — Create, rename, reorder, collapse/expand columns. Kanban workflow management.
- **Comments** — Add, edit, delete comments on cards. Thread support with @mentions.
- **Labels** — Create, update, delete custom labels. Color management and bulk assignment.
- **Checklists** — Create checklists on cards, add/remove items, toggle completion, reorder.
- **Attachments** — Upload, download, delete file attachments on cards.
- **Project Manager** — AI-powered tools for daily standups (auto-generate standup summaries from card activity), sprint reporting (velocity, burndown, blockers), and workload analysis across team members.
- **Search & Filter** — Full-text search across boards, cards, and comments. Filter by assignee, label, due date, and status.

## CLI Commands

Fizzy Do also ships with CLI commands for terminal-based workflows:

```bash
fizzy boards list           # List all boards
fizzy cards create          # Interactive card creation
fizzy standup               # Generate today's standup
```

## Built with Vite+ Toolchain

The MCP server is built using a modern TypeScript toolchain: Vite for bundling, Vitest for testing, and TSup for the production build. Hot module reloading during development means instant feedback when modifying tool implementations.

## Supported Editors

Works with any MCP-compatible editor: Claude Desktop, Cursor, VS Code (with Copilot MCP extension), Windsurf, Zed, and any other editor that supports the MCP protocol.

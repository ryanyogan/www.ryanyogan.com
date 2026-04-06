import type { ProjectDetail } from "./types";

export const projectDetails: ProjectDetail[] = [
  {
    slug: "nexus-mcp",
    title: "Nexus MCP",
    tagline: "AI documentation hub and memory system",
    tech: ["TypeScript", "MCP", "Cloudflare Workers", "D1", "Vectorize"],
    github: "https://github.com/ryanyogan/nexus-mcp",
    year: "2026",
    featured: true,
    content: `MCP server providing AI assistants with library documentation, project memory, and development knowledge. Supports semantic search, persistent context, and stack-specific prompts. Think of it as a knowledge backbone for your AI coding workflow — every tool, every library, every decision you've made, available to your assistant instantly.

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

\\\`\\\`\\\`json
{
  "mcpServers": {
    "nexus": {
      "command": "npx",
      "args": ["-y", "nexus-mcp"]
    }
  }
}
\\\`\\\`\\\`

Add the configuration above to your editor's MCP settings (Claude Desktop, Cursor, VS Code, etc.) and the tools become immediately available to your AI assistant.`,
  },
  {
    slug: "level-up",
    title: "Level Up",
    tagline: "AI-powered job application assistant",
    tech: ["TanStack Start", "Cloudflare Workers", "D1", "Claude API"],
    github: "https://github.com/ryanyogan/levelup",
    live: "https://levelup.yogan.dev",
    year: "2026",
    featured: true,
    content: `AI job application assistant with scam detection, resume tailoring, cover letter generation, and interview prep. Built by someone who has conducted 700+ interviews and knows exactly what hiring managers are looking for — and what makes them immediately reject an application.

## How It Works

1. **Paste a job URL** — Level Up scrapes the posting and extracts role requirements, tech stack, company info, and compensation data.
2. **Upload your resume** — PDF, DOCX, or paste plain text. The system parses your experience, skills, and achievements.
3. **Get instant insights** — AI analyzes the gap between your profile and the job requirements, providing a match score, red flags about the posting, and actionable recommendations.

## Full Feature Set

- **Scam Detection** — AI-powered verification to spot fake postings. Checks for common scam patterns: vague descriptions, too-good-to-be-true salaries, no company web presence, urgency pressure tactics. Saves you from wasting time on ghost jobs and recruitment scams.
- **Salary Intelligence** — Market-rate estimates based on role, location, experience level, and tech stack. Transparency scoring rates how upfront the company is about compensation.
- **Gap Analysis** — Side-by-side comparison of your experience vs. job requirements. Highlights skills you have, skills you're missing, and skills that are "nice to have" vs. "dealbreaker." Suggests how to frame adjacent experience to cover gaps.
- **Resume Builder** — Drag-and-drop editor with 20+ templates optimized for ATS (Applicant Tracking Systems). Each template is tested against popular ATS parsers to ensure your resume makes it past the robots.
- **One-Click Tailoring** — AI rewrites your resume for each specific job, emphasizing relevant experience and using keywords from the posting. Not keyword stuffing — thoughtful rephrasing that makes your experience speak directly to what the role needs.
- **Cover Letter Generation** — Generates cover letters that don't sound AI-generated. Each letter references specific aspects of the company and role, connecting them to your actual experience.
- **Interview Prep** — AI-generated interview questions based on the role, company, and your resume. Includes behavioral questions, technical questions, and suggested talking points for each.

## Built by Someone Who Actually Hires

This isn't built by someone who read about hiring on the internet. I've conducted over 700 interviews across engineering, product, and design roles. I've reviewed thousands of resumes. I know which ones get callbacks and which ones get filtered. That experience is baked into every prompt, every scoring algorithm, and every recommendation Level Up makes.`,
  },
  {
    slug: "fizzy-do-mcp",
    title: "Fizzy Do MCP",
    tagline: "AI-native task management via MCP",
    tech: ["TypeScript", "MCP", "Vite+", "Node.js"],
    github: "https://github.com/ryanyogan/fizzy-do-mcp",
    live: "https://fizzy.yogan.dev",
    year: "2026",
    content: `Open-source MCP server connecting AI assistants to Fizzy (Basecamp's task management). Features 70+ tools for boards, cards, comments, workflows, and AI-powered project management. Turn your AI assistant into a full-featured project manager that can create, update, and organize work directly in Fizzy.

## Full Tool Categories (70+ Tools)

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

\\\`\\\`\\\`bash
fizzy boards list           # List all boards
fizzy cards create          # Interactive card creation
fizzy standup               # Generate today's standup
\\\`\\\`\\\`

## Built with Vite+ Toolchain

The MCP server is built using a modern TypeScript toolchain: Vite for bundling, Vitest for testing, and TSup for the production build. Hot module reloading during development means instant feedback when modifying tool implementations.

## Supported Editors

Works with any MCP-compatible editor: Claude Desktop, Cursor, VS Code (with Copilot MCP extension), Windsurf, Zed, and any other editor that supports the MCP protocol.`,
  },
  {
    slug: "yogan-hockey",
    title: "Yogan Hockey",
    tagline: "Real-time NHL stats with Phoenix LiveView",
    tech: ["Elixir", "Phoenix LiveView", "GenServers", "ETS", "Fly.io"],
    github: "https://github.com/ryanyogan/yogan_hockey",
    live: "https://yogan-hockey.fly.dev",
    year: "2026",
    featured: true,
    content: `Real-time NHL stats dashboard with AI-powered predictions, live play-by-play, and a dedicated tracker for Andrew's DEL career. Updates instantly without page refreshes on a $5/month server. Built because every existing hockey app is either slow, ad-infested, or both.

## Features

- **Live NHL Scores** — Real-time game updates with 30-second polling via GenServer army
- **AI Game Predictions** — Claude analyzes matchups, recent form, and head-to-head records. Predictions regenerate on scoring events.
- **Playoff Bracket Tracker** — Full bracket visualization with elimination scenarios
- **Per-Game Live View** — Ice rink visualization, period-by-period scoring, shot counts, penalty tracking, and live play-by-play stream
- **Team & Player Stats** — Deep stats pages with sortable tables and season trends
- **Andrew's DEL Tracker** — Dedicated section for my brother's career in Germany's top hockey league
- **Distributed Caching** — ETS-powered multi-region cache replication via PubSub

## The GenServer Army

The architecture is built around specialized GenServer processes: LiveScoresServer polls every 30 seconds, TeamsServer pre-populates all 32 teams on startup, PredictionServer watches for scoring events and triggers AI regeneration. Dynamic GamePlayServer processes are spawned on-demand when users visit individual game pages, tracking connected viewers and auto-shutting down when the last viewer disconnects.

## ETS: The Secret Weapon

ETS (Erlang Term Storage) replaces Redis entirely. Sub-microsecond lookups with concurrent reads, no locks, and no network hops. For a real-time sports app, that's the difference between "instant" and "noticeable" — roughly 1000x faster than Redis for read-heavy workloads.

## Distributed Cache Replication

Running on Fly.io across multiple regions, ETS caches are kept in sync via Phoenix PubSub. When any node updates its cache, all other nodes receive the update and sync their local ETS tables. Users in Europe and the US get identical sub-millisecond response times.

## Performance

| Metric | This App | Typical Sports App |
|--------|----------|-------------------|
| Page load | ~200ms | ~800ms+ |
| Per-connection memory | ~2KB | ~50KB |
| Monthly cost | $5 | $25-100 |
| Data freshness | 30s polling | Minutes stale |

All of this on a single $5/month Fly.io instance serving dozens of concurrent users during game nights.`,
  },
  {
    slug: "ryanyogan-com",
    title: "ryanyogan.com",
    tagline: "This site, TanStack Start on Cloudflare",
    tech: ["TanStack Start", "Cloudflare Workers", "D1", "Vectorize"],
    github: "https://github.com/ryanyogan/ryanyogan-2026",
    year: "2026",
    content: `A monorepo containing a TanStack Start application running on Cloudflare Workers with D1, R2, Vectorize for semantic search, and automated blog post generation via Claude. This is the most over-engineered personal site you'll encounter, and that's the point.

## Monorepo Structure

\\\`\\\`\\\`
ryanyogan.com/
├── apps/web/              → TanStack Start app (Cloudflare Workers)
├── packages/shared/       → Types, content, utilities (shared across apps)
├── workers/ai-worker/     → Claude integration Worker
├── workers/workflows/     → Cloudflare Workflows (Durable Execution)
└── content/projects.md    → THE source of truth for all content
\\\`\\\`\\\`

## Virtual Module for Content

All blog posts and project data live in the shared package as TypeScript modules. The TanStack Start app imports them as virtual modules, meaning content changes trigger rebuilds automatically. No CMS, no database queries for content — it's all type-safe TypeScript compiled into the Worker bundle.

## Cloudflare Workflows for Blog Generation

The content pipeline uses Cloudflare Workflows (Durable Execution) to generate blog posts. When a project is added to \\\`content/projects.md\\\`, the workflow: fetches the repo (up to 100 files), feeds everything to Claude Sonnet for analysis, generates a 3000-6000 word technical blog post, creates embeddings via Vectorize, stores metadata in D1, and opens a PR for review. Each step is checkpointed so failures retry from the last successful step.

## Vectorize for Semantic Search

Every piece of content is embedded via Cloudflare Vectorize, enabling semantic search across the entire site. Search for "distributed systems" and get results about the Elixir hockey app and the Cloudflare Workers architecture — even if those exact words don't appear in the content. The search is exposed via a server function that queries Vectorize and returns ranked results.

## Stack

TanStack Start for the app framework, Cloudflare Workers for edge compute with zero cold starts, D1 (SQLite at the edge) for metadata, R2 for object storage, Vectorize for vector search, and Turborepo for monorepo build orchestration.`,
  },
  {
    slug: "puck-pro",
    title: "Puck Pro",
    tagline: "AI hockey training with pose detection",
    tech: ["Elixir", "Phoenix LiveView", "MediaPipe", "Claude Vision", "Cloudflare R2"],
    github: "https://github.com/ryanyogan/puck_pro",
    year: "2026",
    featured: true,
    content: `AI-powered hockey training app with real-time pose detection. Uses MediaPipe in the browser at 30fps to analyze shots, track form, and provide Claude-powered coaching feedback. Born from a father's refusal to pay $150/hour for a shooting coach.

## Real-Time Pose Detection

MediaPipe's Pose Landmarker runs entirely in the browser via WebGL, tracking 33 body landmarks at 30fps with no server round-trip. For hockey, we focus on shoulders (rotation/power), elbows (arm angle), wrists (hand position), hips (weight transfer), and knees (stance). Stick position is estimated from wrist landmarks and arm angle geometry.

## Shot Detection Algorithm

The core challenge: distinguishing a real shot from a kid waving their stick around. The algorithm uses temporal validation requiring 4 consecutive frames:

1. **Wind-up** — Wrist rises above shoulder, elbow angle opens, hip rotation begins
2. **Downswing** — Wrist velocity exceeds threshold, shoulder rotation accelerates, projected stick drops toward contact zone
3. **Contact** — Peak velocity detected, all signals converge at expected contact point
4. **Follow-through** — Wrist crosses body midline, arms extend, hip rotation completes

Multi-hand support detects both left and right-handed shooters automatically. Shot types (wrist, slap, snap, backhand) are classified from landmark signature patterns.

## Claude Vision Integration

After a session, captured shot events and selected video frames are sent to Claude Vision for analysis. Prompts are hockey-specific and age-aware: young players get encouragement and one improvement at a time; adults get technical feedback about weight transfer, blade angle, and momentum timing.

## Gamification Layer

- **XP System** — Every shot earns XP, harder shots earn more, clean technique gets bonus XP
- **Leveling** — "Garage Rookie" to "Sniper Elite" with an RPG-style progression curve
- **Achievements** — "First Slapshot," "50 MPH Club," "Switch Shooter," and 20+ more
- **Session Streaks** — Duolingo-style streak system that keeps kids practicing daily

## The Road to Ice Projection

The long-term vision: project coaching cues directly onto the ice during practice. A camera captures video from above, ML models analyze technique in real-time, and a projector overlays visual coaching cues where the player can see them. The browser-based version is the MVP. Every training session generates validation data for the next version.`,
  },
  {
    slug: "ice-yeti",
    title: "Ice Yeti Training",
    tagline: "Connect skaters with trainers",
    tech: ["Elixir", "Phoenix LiveView", "PostgreSQL", "PubSub", "Fly.io"],
    github: "https://github.com/ryanyogan/ice-yeti",
    year: "2026",
    content: `Platform connecting ice skaters with local trainers. Features real-time scheduling, session tracking, and progress analytics.`,
  },
  {
    slug: "ai-code-review",
    title: "AI Code Review Bot",
    tagline: "LLM-powered PR reviews",
    tech: ["TypeScript", "OpenAI", "GitHub Actions"],
    github: "https://github.com/ryanyogan/ai-code-review",
    year: "2025",
    content: `GitHub Action that automatically reviews pull requests using OpenAI. Provides code quality feedback, security checks, and improvement suggestions directly in PR comments.`,
  },
  {
    slug: "dotfiles",
    title: "Dotfiles",
    tagline: "Neovim, tmux, zsh config",
    tech: ["Lua", "Nix", "Zsh"],
    github: "https://github.com/ryanyogan/dotfiles",
    year: "2025",
    content: `Personal development environment configuration. Neovim with LSP, tmux with custom keybindings, and zsh with productivity aliases.`,
  },
];

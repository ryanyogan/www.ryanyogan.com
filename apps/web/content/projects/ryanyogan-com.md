---
title: "ryanyogan.com"
tagline: "The most over-engineered personal site you'll encounter. TanStack Start on Cloudflare with D1, Vectorize for semantic search, and Claude generating blog posts via Durable Execution workflows."
tech:
  - TanStack Start
  - Cloudflare Workers
  - D1
  - Vectorize
github: "https://github.com/ryanyogan/ryanyogan-2026"
year: "2026"
---

A monorepo containing a TanStack Start application running on Cloudflare Workers with D1, R2, Vectorize for semantic search, and automated blog post generation via Claude. This is the most over-engineered personal site you'll encounter, and that's the point.

## Monorepo Structure

```
ryanyogan.com/
├── apps/web/              → TanStack Start app (Cloudflare Workers)
├── packages/shared/       → Types, content, utilities (shared across apps)
├── workers/ai-worker/     → Claude integration Worker
├── workers/workflows/     → Cloudflare Workflows (Durable Execution)
└── content/projects.md    → THE source of truth for all content
```

## Virtual Module for Content

All blog posts and project data live in the shared package as TypeScript modules. The TanStack Start app imports them as virtual modules, meaning content changes trigger rebuilds automatically. No CMS, no database queries for content — it's all type-safe TypeScript compiled into the Worker bundle.

## Cloudflare Workflows for Blog Generation

The content pipeline uses Cloudflare Workflows (Durable Execution) to generate blog posts. When a project is added to `content/projects.md`, the workflow: fetches the repo (up to 100 files), feeds everything to Claude Sonnet for analysis, generates a 3000-6000 word technical blog post, creates embeddings via Vectorize, stores metadata in D1, and opens a PR for review. Each step is checkpointed so failures retry from the last successful step.

## Vectorize for Semantic Search

Every piece of content is embedded via Cloudflare Vectorize, enabling semantic search across the entire site. Search for "distributed systems" and get results about the Elixir hockey app and the Cloudflare Workers architecture — even if those exact words don't appear in the content. The search is exposed via a server function that queries Vectorize and returns ranked results.

## Stack

TanStack Start for the app framework, Cloudflare Workers for edge compute with zero cold starts, D1 (SQLite at the edge) for metadata, R2 for object storage, Vectorize for vector search, and Turborepo for monorepo build orchestration.

---
title: "My Most Over-Engineered Site to Date"
date: "February 10, 2026"
year: "2026"
author: "Human + AI"
excerpt: "I built enterprise infrastructure for a personal blog. A TanStack Start app on Cloudflare with D1, Vectorize, Workflows, and Claude writing my blog posts."
---

I love AI. There, I said it. I use Cursor, Claude Code, Windsurf, and whatever else promises to mass-produce dopamine through code generation. At any given moment I have 4-6 side projects running, each one a love letter to some new framework or tool that caught my eye. I have roughly 1,000 GitHub repos. Most of them gather dust within 48 hours of creation. Every few months I'll stumble across one and think, "Oh right, that was the weekend I was going to revolutionize real-time collaborative spreadsheets." It was not.

But this site — the one you're reading right now — is different. This one actually shipped. And it shipped with an absurd amount of infrastructure behind it, because apparently I can't build a personal website without treating it like a Series B SaaS product.

## The Old Site

My previous site was a Next.js app on Vercel. Before that, it was a Remix app on Fly.io. Before that, I think it was something on Heroku? The point is, every year or so I'd get a burst of motivation, redesign the whole thing, deploy it, write one blog post about the redesign, and then not touch it for another 12 months.

The old site had a portfolio page, an about section, maybe a contact form. It was perfectly adequate. "Adequate" is, of course, unacceptable to someone with my particular brain chemistry.

## What It Is Now

A TanStack Start application running on Cloudflare Workers with D1, R2, Vectorize, and three separate Workers handling different concerns. The monorepo looks like this:

```
ryanyogan.com/
├── apps/
│   └── web/                → TanStack Start app (Cloudflare Workers)
│       ├── app/
│       │   ├── components/ → UI components
│       │   ├── routes/     → File-based routing
│       │   └── styles/     → Tailwind CSS
│       └── workers/
│           └── app.ts      → Worker entry point
├── packages/
│   └── shared/             → Types, content, utilities
│       └── src/
│           ├── types.ts    → Shared type definitions
│           ├── writings.ts → Blog post content
│           └── projects.ts → Project metadata
├── workers/
│   ├── ai-worker/          → Claude integration Worker
│   └── workflows/          → Cloudflare Workflows (Durable Execution)
├── content/
│   └── projects.md         → THE source of truth
└── turbo.json              → Turborepo config
```

Three Workers, one database, one vector index, one object store. For a personal website. That gets maybe 50 visitors a month, most of whom are me checking if the deployment worked.

## The Magic: One Markdown File

The entire content pipeline is driven by a single markdown file: `content/projects.md`. Each project is a section with YAML frontmatter containing the repo URL, a short description, and some tags. That's all I have to maintain. Everything else is automated.

When I push to master, a GitHub Action detects whether `content/projects.md` changed. If it did, the pipeline kicks off. If it didn't, it checks for other content changes and handles those separately. The point is: I write markdown, push a button, and the machine handles the rest.

## The Pipeline

Here's what happens when I add a new project to `projects.md` and push to master:

1. **GitHub Action triggers** — Detects changes in the content directory
2. **Cloudflare Workflow starts** — A durable execution workflow that can run for minutes without timing out
3. **Repo analysis begins** — The workflow fetches every file from the linked GitHub repo (up to 100 files, filtering out node_modules, lock files, and other noise)
4. **Claude Sonnet analyzes the project** — All the source code, README, package.json, and config files get fed to Claude with a carefully crafted prompt
5. **Blog post generation** — Claude generates a 3,000-6,000 word blog post about the project. Not a summary. A real, opinionated, technical deep-dive with code examples and architecture discussion
6. **Embedding generation** — The blog post content gets vectorized via Cloudflare Vectorize for semantic search
7. **D1 metadata storage** — Title, slug, date, tags, and embedding references get stored in D1
8. **PR creation** — The generated blog post is committed to a new branch and a PR is opened for my review

That last step is crucial. Claude writes the first draft, but I review and edit every post before it goes live. The AI is my ghostwriter, not my publisher. Sometimes I'll rewrite entire sections. Sometimes the post is good enough that I just fix a few awkward phrasings and merge. But I always read it, and I always have the final say.

The Cloudflare Workflow is the real hero here. It uses durable execution, which means it can survive Worker CPU limits. Each step is checkpointed, so if something fails (API rate limit, network blip), it retries from the last successful step rather than starting over. I've seen workflows run for 3+ minutes during large repo analyses, which would be impossible with a standard Worker's 30-second CPU limit.

## Why This Is Actually Useful

Here's the thing that surprised me: this system actually works, and the output is genuinely good.

**I actually have blog posts now.** Before this, I had written maybe 5 blog posts in 10 years. Since building the pipeline, I've generated detailed write-ups for every project I've built in the last two years. My site went from a barren portfolio to something with actual content.

**The posts are good.** Claude with full repo context writes substantially better technical content than Claude with a vague prompt. When it can see the actual GenServer implementation, the actual Tailwind config, the actual database schema — it writes posts that are specific, accurate, and interesting. The code examples are real. The architecture descriptions match reality.

**It scales with my ADHD.** I start projects constantly. I rarely write about them. This system means every project that makes it into my portfolio automatically gets a detailed write-up. The activation energy went from "sit down and write 3000 words" to "add 5 lines of YAML to a markdown file."

**I still have control.** The PR review step means nothing goes live without my approval. I can reject posts, request regeneration with different prompts, or heavily edit the output. It's augmentation, not automation.

## The Stack

- **TanStack Start** — File-based routing, SSR, server functions. Feels like the natural evolution of what Remix was trying to be
- **Cloudflare Workers** — Edge compute with zero cold starts, 0ms startup
- **D1** — SQLite at the edge. Surprisingly capable for metadata storage
- **Vectorize** — Vector database for semantic search across all content
- **R2** — Object storage for assets, images, generated content
- **Workflows** — Durable execution for the content generation pipeline
- **Claude Sonnet** — The AI backbone for content generation and analysis
- **Turborepo** — Monorepo build orchestration

Is this overkill for a personal site? Absolutely. Hilariously, embarrassingly overkill. But I learned more about Cloudflare's platform in two weeks of building this than I would have in six months of reading docs. I understand Workers, D1, R2, Vectorize, Workflows, and Queues at a level that only comes from actually building something real with them.

And now I have a site that can handle semantic search queries like "show me posts about distributed systems" and return actual relevant results. I have a content pipeline that turns my ADHD-fueled side projects into blog posts. I have infrastructure that could handle 10,000x my current traffic without breaking a sweat.

The best way to learn a platform is to go way too deep on something that doesn't matter. Build the enterprise version of the thing nobody asked for. Over-engineer the hell out of it. You'll learn more in the process than any tutorial, course, or certification could teach you. And at the end, you'll have something that works — even if "works" means serving 50 monthly visitors with the same infrastructure that could power a mid-size SaaS.

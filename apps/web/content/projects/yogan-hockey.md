---
title: "Yogan Hockey"
tagline: "Every hockey season my family gathers around screens. I got tired of slow, ad-infested sports apps, so I built a real-time NHL dashboard with AI predictions running on a $5/month server."
tech:
  - Elixir
  - Phoenix LiveView
  - GenServers
  - ETS
  - Fly.io
github: "https://github.com/ryanyogan/yogan_hockey"
live: "https://yogan-hockey.fly.dev"
year: "2026"
featured: true
---

Real-time NHL stats dashboard with AI-powered predictions, live play-by-play, and a dedicated tracker for Andrew's DEL career. Updates instantly without page refreshes on a $5/month server. Built because every existing hockey app is either slow, ad-infested, or both.

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

| Metric                | This App    | Typical Sports App |
| --------------------- | ----------- | ------------------ |
| Page load             | ~200ms      | ~800ms+            |
| Per-connection memory | ~2KB        | ~50KB              |
| Monthly cost          | $5          | $25-100            |
| Data freshness        | 30s polling | Minutes stale      |

All of this on a single $5/month Fly.io instance serving dozens of concurrent users during game nights.

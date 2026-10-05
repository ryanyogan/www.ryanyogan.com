---
title: "Yogan Hockey"
summary: "Real-time NHL dashboard that also tracks my brother's pro stats in Germany"
tagline: "Every hockey season my family gathers around screens. I wanted a fast, clean way to follow the season, so I built a real-time NHL dashboard on Phoenix LiveView that also tracks my brother's pro stats in Germany."
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
group: for-people-i-know
status: live
order: 1
---

A live NHL scores and stats dashboard, with a dedicated tracker for my brother Andrew's season in Germany's DEL2. Pages update without a refresh. It runs on a single small Fly.io machine. Built because every existing hockey app is either slow, ad-infested, or both.

## Features

- **Live NHL scores**, polled every 30 seconds
- **Standings and team pages**, refreshed every five minutes
- **Player stats**
- **Andrew's DEL2 tracker**, a section for my brother's pro season in Germany, read from Elite Prospects every five minutes

## Three GenServers

The supervision tree has three polling processes. LiveScoresServer polls live scores every 30 seconds. TeamsServer polls teams and standings every five minutes. YoganStatsServer polls Andrew's stats every five minutes and backs off on failure. Each one owns a single concern, crashes on its own, and is restarted by its supervisor.

The NHL data comes from ESPN's public endpoints.

## ETS Instead of Redis

Each GenServer writes what it fetched into ETS (Erlang Term Storage), and Phoenix PubSub pushes the change to every connected LiveView. Reads happen in-process, with no network hop and no external cache. For one node that is enough.

## Status

Live at [yogan-hockey.fly.dev](https://yogan-hockey.fly.dev), on one shared-CPU Fly.io machine with 512 MB of memory.

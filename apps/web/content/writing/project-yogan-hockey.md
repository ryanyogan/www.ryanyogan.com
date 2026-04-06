---
title: "Yogan Hockey: A Love Letter to Elixir, LiveView, and the BEAM"
date: "February 10, 2026"
year: "2026"
author: "Human + AI"
excerpt: "Every hockey season, my family gathers around screens. I got tired of slow, stale sports apps. So I built a real-time NHL stats dashboard with AI predictions on Elixir."
---

Every hockey season, my family gathers around screens. My kids check scores obsessively. My brother Andrew plays professional hockey in Germany's DEL (Deutsche Eishockey Liga), so we're always tracking his games too. I refresh ESPN like it owes me money. And every time, I think: "Why is this data 30 seconds stale? Why does this app feel like it was built in 2014? Why am I looking at ads for car insurance when I just want to know if the Sharks scored?"

So I built my own.

## What It Solves

Every existing hockey app has the same problems: stale data that's minutes behind the actual game, heavy JavaScript clients that chug on older phones, and expensive infrastructure that the developers pass along through ads and premium subscriptions. I wanted something different: real-time data, lightweight connections, and a server cost I could forget about.

The NHL API is surprisingly good but painfully undocumented. There's no official developer portal, no API keys, no rate limit documentation. You just... hit endpoints and hope for the best. The community has reverse-engineered most of it, but it changes without warning every season. Yogan Hockey wraps this chaos in a real-time Phoenix LiveView application that updates scores, stats, and play-by-play without page refreshes. The entire thing runs on a single $5/month Fly.io instance serving dozens of concurrent users.

## The Full Feature Set

- **Live NHL Scores** — Polls the NHL API every 30 seconds, pushes updates to all connected clients via LiveView's server-rendered diffs. No WebSocket management, no client-side state reconciliation. The server owns the truth.
- **AI Game Predictions** — When a scoring event is detected, Claude analyzes team stats, recent form, head-to-head records, home/away performance, and goalie matchups to regenerate win probability predictions in real-time.
- **Playoff Bracket Tracker** — Full bracket visualization that updates automatically as series progress, including elimination scenarios and matchup histories.
- **Per-Game Live View** — Detailed game pages with ice rink visualization, period-by-period scoring, shot counts, penalty tracking, and a live play-by-play feed that scrolls as events happen.
- **Team & Player Stats** — Deep stats pages with sortable tables, season trends, and comparison tools. All pre-populated and cached so page loads are instant.
- **Andrew's DEL Tracker** — My brother plays in Germany's top league. A dedicated section tracks his games, goals, assists, and plus/minus. The DEL API is even less documented than the NHL's, so this was its own adventure.

## Architecture: The GenServer Army

The BEAM VM is perfect for this kind of application. The architecture is built around a fleet of GenServer processes, each responsible for a specific concern:

**LiveScoresServer** — The heartbeat of the application. This GenServer polls the NHL API every 30 seconds for all active games. When it detects changes, it updates ETS and broadcasts to all connected LiveView clients via PubSub.

```elixir
defmodule YoganHockey.Scores.LiveScoresServer do
  use GenServer

  @poll_interval :timer.seconds(30)

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def init(state) do
    schedule_poll()
    {:ok, state}
  end

  def handle_info(:poll, state) do
    case NHL.API.fetch_live_scores() do
      {:ok, games} ->
        Enum.each(games, fn game ->
          :ets.insert(:live_scores, {game.id, game})
          Phoenix.PubSub.broadcast(
            YoganHockey.PubSub,
            "scores:live",
            {:score_updated, game}
          )
        end)

        schedule_poll()
        {:noreply, %{state | last_poll: DateTime.utc_now()}}

      {:error, _reason} ->
        schedule_poll()
        {:noreply, state}
    end
  end

  defp schedule_poll, do: Process.send_after(self(), :poll, @poll_interval)
end
```

**TeamsServer** — Pre-populates and maintains team data. On startup, it fetches all 32 NHL teams, their rosters, and season stats, caching everything in ETS. Refreshes daily during the season. This means every page that needs team data gets it in microseconds from ETS rather than making an API call.

**PredictionServer** — Watches for scoring events via PubSub. When a goal is scored, it triggers a prediction regeneration for that game. Claude gets the current score, remaining time, team stats, and recent momentum to generate updated win probabilities. Predictions are cached and broadcast to viewers.

## Dynamic GamePlayServer Pattern

The most interesting architectural decision is the GamePlayServer. Unlike the always-running servers above, these are spawned on demand via DynamicSupervisor:

```elixir
defmodule YoganHockey.Game.PlayServer do
  use GenServer

  def start_link(game_id) do
    GenServer.start_link(__MODULE__, game_id, name: via(game_id))
  end

  def init(game_id) do
    # Start polling for this specific game
    schedule_poll()
    # Track connected viewers
    {:ok, %{game_id: game_id, viewers: 0, data: nil}}
  end

  def handle_info(:poll, %{viewers: 0} = state) do
    # No viewers? Shut down to save resources
    {:stop, :normal, state}
  end

  def handle_info(:poll, state) do
    case NHL.API.fetch_game_feed(state.game_id) do
      {:ok, feed} ->
        :ets.insert(:game_feeds, {state.game_id, feed})
        Phoenix.PubSub.broadcast(
          YoganHockey.PubSub,
          "game:#{state.game_id}",
          {:feed_updated, feed}
        )
        schedule_poll()
        {:noreply, %{state | data: feed}}

      {:error, _} ->
        schedule_poll()
        {:noreply, state}
    end
  end
end
```

When a user navigates to a game page, the LiveView mounts and checks if a GamePlayServer exists for that game. If not, it starts one via DynamicSupervisor. The server tracks connected viewers and, crucially, auto-shuts down when the last viewer disconnects. No idle processes consuming memory for games nobody is watching.

## Distributed Cache Replication

The app runs on Fly.io with instances in multiple regions. ETS is per-node, so we need cache replication. This is solved elegantly with PubSub:

When any node updates its ETS cache, it broadcasts the update via PubSub. Every other node receives the broadcast and updates its local ETS. This means a user in Europe hitting the Frankfurt instance gets the same sub-millisecond cache reads as a user in the US hitting the Dallas instance. No Redis. No Memcached. Just the BEAM being the BEAM.

## ETS: The Secret Weapon

ETS (Erlang Term Storage) is the unsung hero of this architecture. It's an in-memory key-value store built into the BEAM VM with some remarkable properties: concurrent reads with no locks, sub-microsecond lookups, and the ability to store any Erlang term as a value.

For this app, ETS replaces what you'd typically use Redis for. The difference? Redis requires a network hop (1-5ms best case). ETS is in-process memory (0.001ms). For a real-time sports app where freshness matters, that 1000x speed improvement is the difference between "instant" and "noticeable."

## Performance: LiveView vs. The Alternative

Before building this in LiveView, I prototyped a Next.js version with WebSocket subscriptions. The comparison was illuminating:

| Metric                      | Phoenix LiveView        | Next.js + WebSocket      |
| --------------------------- | ----------------------- | ------------------------ |
| Initial page load           | ~200ms                  | ~800ms                   |
| Per-connection memory       | ~2KB                    | ~50KB                    |
| Server cost (50 concurrent) | $5/month                | $25/month                |
| Data freshness              | Real-time (server push) | Polling + reconciliation |
| JS bundle size              | 0KB (server-rendered)   | 180KB                    |

LiveView wins on every metric that matters for this use case. The server owns the state, renders the HTML, and pushes minimal diffs over WebSocket. The client is a thin JavaScript library that patches the DOM. No React. No state management library. No hydration mismatches.

## Why Elixir After 8 Years of JavaScript

I've spent most of my career in the JavaScript/TypeScript ecosystem. React since 2015. Node.js backends. The whole stack. So why Elixir for this project?

**The BEAM is indestructible.** A GenServer crashes? Its supervisor restarts it. A node goes down? The cluster rebalances. An API call hangs? The process times out and gets killed. In 6 months of running this app, I've had zero incidents that required manual intervention. Compare that to any Node.js app I've run where uncaught promise rejections and memory leaks are a way of life.

**OTP gives you distributed systems primitives for free.** GenServers, Supervisors, PubSub, ETS, Telemetry — these aren't third-party libraries you npm install and hope maintain compatibility. They're battle-tested components of a platform that's been running telecom infrastructure for 30+ years.

**Pattern matching changes how you think.** Every function clause is a declarative statement about what data you expect. No more defensive null checking. No more "what if this field is undefined?" The code reads like a specification:

```elixir
def handle_info({:score_updated, %{status: "Final"} = game}, socket) do
  # Game is over, show final score
  {:noreply, assign(socket, :game, game)}
end

def handle_info({:score_updated, %{period: period} = game}, socket)
    when period > 3 do
  # Overtime! Add excitement indicator
  {:noreply, assign(socket, :game, game) |> assign(:overtime, true)}
end

def handle_info({:score_updated, game}, socket) do
  # Regular update
  {:noreply, assign(socket, :game, game)}
end
```

**Immutability eliminates entire categories of bugs.** No accidental mutations. No "who changed this object?" debugging sessions. Data flows through transformations, and each step is traceable.

**AI understands Elixir surprisingly well.** Claude and GPT-4 are remarkably good at writing Elixir. The language is small, consistent, and well-documented. Pattern matching gives the models clear structural hints about what code should do. I've found AI-assisted Elixir development to be more productive than AI-assisted TypeScript, despite TypeScript having a much larger training corpus.

This project started as a way to watch hockey. It became a love letter to the BEAM. I'm not going back to building real-time apps in anything else.

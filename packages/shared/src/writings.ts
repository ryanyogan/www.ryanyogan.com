import type { WritingPost } from "./types";

export const writingPosts: WritingPost[] = [
  {
    slug: "over-engineered-portfolio",
    title: "My Most Over-Engineered Site to Date",
    date: "February 10, 2026",
    year: "2026",
    author: "Human + AI",
    excerpt:
      "I built enterprise infrastructure for a personal blog. A TanStack Start app on Cloudflare with D1, Vectorize, Workflows, and Claude writing my blog posts.",
    content: `I love AI. There, I said it. I use Cursor, Claude Code, Windsurf, and whatever else promises to mass-produce dopamine through code generation. At any given moment I have 4-6 side projects running, each one a love letter to some new framework or tool that caught my eye. I have roughly 1,000 GitHub repos. Most of them gather dust within 48 hours of creation. Every few months I'll stumble across one and think, "Oh right, that was the weekend I was going to revolutionize real-time collaborative spreadsheets." It was not.

But this site — the one you're reading right now — is different. This one actually shipped. And it shipped with an absurd amount of infrastructure behind it, because apparently I can't build a personal website without treating it like a Series B SaaS product.

## The Old Site

My previous site was a Next.js app on Vercel. Before that, it was a Remix app on Fly.io. Before that, I think it was something on Heroku? The point is, every year or so I'd get a burst of motivation, redesign the whole thing, deploy it, write one blog post about the redesign, and then not touch it for another 12 months.

The old site had a portfolio page, an about section, maybe a contact form. It was perfectly adequate. "Adequate" is, of course, unacceptable to someone with my particular brain chemistry.

## What It Is Now

A TanStack Start application running on Cloudflare Workers with D1, R2, Vectorize, and three separate Workers handling different concerns. The monorepo looks like this:

\\\`\\\`\\\`
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
\\\`\\\`\\\`

Three Workers, one database, one vector index, one object store. For a personal website. That gets maybe 50 visitors a month, most of whom are me checking if the deployment worked.

## The Magic: One Markdown File

The entire content pipeline is driven by a single markdown file: \\\`content/projects.md\\\`. Each project is a section with YAML frontmatter containing the repo URL, a short description, and some tags. That's all I have to maintain. Everything else is automated.

When I push to master, a GitHub Action detects whether \\\`content/projects.md\\\` changed. If it did, the pipeline kicks off. If it didn't, it checks for other content changes and handles those separately. The point is: I write markdown, push a button, and the machine handles the rest.

## The Pipeline

Here's what happens when I add a new project to \\\`projects.md\\\` and push to master:

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

The best way to learn a platform is to go way too deep on something that doesn't matter. Build the enterprise version of the thing nobody asked for. Over-engineer the hell out of it. You'll learn more in the process than any tutorial, course, or certification could teach you. And at the end, you'll have something that works — even if "works" means serving 50 monthly visitors with the same infrastructure that could power a mid-size SaaS.`,
  },
  {
    slug: "project-yogan-hockey",
    title: "Yogan Hockey: A Love Letter to Elixir, LiveView, and the BEAM",
    date: "February 10, 2026",
    year: "2026",
    author: "Human + AI",
    excerpt:
      "Every hockey season, my family gathers around screens. I got tired of slow, stale sports apps. So I built a real-time NHL stats dashboard with AI predictions on Elixir.",
    content: `Every hockey season, my family gathers around screens. My kids check scores obsessively. My brother Andrew plays professional hockey in Germany's DEL (Deutsche Eishockey Liga), so we're always tracking his games too. I refresh ESPN like it owes me money. And every time, I think: "Why is this data 30 seconds stale? Why does this app feel like it was built in 2014? Why am I looking at ads for car insurance when I just want to know if the Sharks scored?"

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

\\\`\\\`\\\`elixir
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
\\\`\\\`\\\`

**TeamsServer** — Pre-populates and maintains team data. On startup, it fetches all 32 NHL teams, their rosters, and season stats, caching everything in ETS. Refreshes daily during the season. This means every page that needs team data gets it in microseconds from ETS rather than making an API call.

**PredictionServer** — Watches for scoring events via PubSub. When a goal is scored, it triggers a prediction regeneration for that game. Claude gets the current score, remaining time, team stats, and recent momentum to generate updated win probabilities. Predictions are cached and broadcast to viewers.

## Dynamic GamePlayServer Pattern

The most interesting architectural decision is the GamePlayServer. Unlike the always-running servers above, these are spawned on demand via DynamicSupervisor:

\\\`\\\`\\\`elixir
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
\\\`\\\`\\\`

When a user navigates to a game page, the LiveView mounts and checks if a GamePlayServer exists for that game. If not, it starts one via DynamicSupervisor. The server tracks connected viewers and, crucially, auto-shuts down when the last viewer disconnects. No idle processes consuming memory for games nobody is watching.

## Distributed Cache Replication

The app runs on Fly.io with instances in multiple regions. ETS is per-node, so we need cache replication. This is solved elegantly with PubSub:

When any node updates its ETS cache, it broadcasts the update via PubSub. Every other node receives the broadcast and updates its local ETS. This means a user in Europe hitting the Frankfurt instance gets the same sub-millisecond cache reads as a user in the US hitting the Dallas instance. No Redis. No Memcached. Just the BEAM being the BEAM.

## ETS: The Secret Weapon

ETS (Erlang Term Storage) is the unsung hero of this architecture. It's an in-memory key-value store built into the BEAM VM with some remarkable properties: concurrent reads with no locks, sub-microsecond lookups, and the ability to store any Erlang term as a value.

For this app, ETS replaces what you'd typically use Redis for. The difference? Redis requires a network hop (1-5ms best case). ETS is in-process memory (0.001ms). For a real-time sports app where freshness matters, that 1000x speed improvement is the difference between "instant" and "noticeable."

## Performance: LiveView vs. The Alternative

Before building this in LiveView, I prototyped a Next.js version with WebSocket subscriptions. The comparison was illuminating:

| Metric | Phoenix LiveView | Next.js + WebSocket |
|--------|-----------------|-------------------|
| Initial page load | ~200ms | ~800ms |
| Per-connection memory | ~2KB | ~50KB |
| Server cost (50 concurrent) | $5/month | $25/month |
| Data freshness | Real-time (server push) | Polling + reconciliation |
| JS bundle size | 0KB (server-rendered) | 180KB |

LiveView wins on every metric that matters for this use case. The server owns the state, renders the HTML, and pushes minimal diffs over WebSocket. The client is a thin JavaScript library that patches the DOM. No React. No state management library. No hydration mismatches.

## Why Elixir After 8 Years of JavaScript

I've spent most of my career in the JavaScript/TypeScript ecosystem. React since 2015. Node.js backends. The whole stack. So why Elixir for this project?

**The BEAM is indestructible.** A GenServer crashes? Its supervisor restarts it. A node goes down? The cluster rebalances. An API call hangs? The process times out and gets killed. In 6 months of running this app, I've had zero incidents that required manual intervention. Compare that to any Node.js app I've run where uncaught promise rejections and memory leaks are a way of life.

**OTP gives you distributed systems primitives for free.** GenServers, Supervisors, PubSub, ETS, Telemetry — these aren't third-party libraries you npm install and hope maintain compatibility. They're battle-tested components of a platform that's been running telecom infrastructure for 30+ years.

**Pattern matching changes how you think.** Every function clause is a declarative statement about what data you expect. No more defensive null checking. No more "what if this field is undefined?" The code reads like a specification:

\\\`\\\`\\\`elixir
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
\\\`\\\`\\\`

**Immutability eliminates entire categories of bugs.** No accidental mutations. No "who changed this object?" debugging sessions. Data flows through transformations, and each step is traceable.

**AI understands Elixir surprisingly well.** Claude and GPT-4 are remarkably good at writing Elixir. The language is small, consistent, and well-documented. Pattern matching gives the models clear structural hints about what code should do. I've found AI-assisted Elixir development to be more productive than AI-assisted TypeScript, despite TypeScript having a much larger training corpus.

This project started as a way to watch hockey. It became a love letter to the BEAM. I'm not going back to building real-time apps in anything else.`,
  },
  {
    slug: "project-puck-pro",
    title: "Puck Pro: Teaching AI to Roast My Kid's Slapshot",
    date: "January 15, 2026",
    year: "2026",
    author: "Human + AI",
    excerpt:
      "A Phoenix LiveView app that uses browser-based pose detection at 30fps, Claude Vision for video analysis, and enough hockey knowledge to make your beer league coach nervous.",
    content: `I am a cheap father and a good father. These two things are not mutually exclusive. When my son asked for a hockey shooting coach — the going rate is $150/hour around here — I did what any reasonable engineer would do: I spent 200+ hours building an AI replacement. By my rough math, the project will break even sometime around 2047, assuming my kids don't switch to basketball.

## The Vision

The long-term vision is wild: project AI coaching analysis directly onto the ice surface during practice. A camera above the rink captures video, ML models analyze positioning and technique in real-time, and a projector overlays coaching cues directly where the player can see them. Think "iron man HUD but for hockey practice."

We're not there yet. Right now, Puck Pro is a Phoenix LiveView app that uses your phone or tablet camera to analyze hockey shots in your garage, driveway, or rink. But the architecture is designed so that every component — pose detection, shot analysis, coaching generation — can eventually plug into the ice projection system.

## Browser-Side Pose Detection with MediaPipe

MediaPipe is Google's open-source framework for running ML models in the browser. For Puck Pro, we use the Pose Landmarker model, which tracks 33 body landmarks at 30fps using just the device camera. No server-side processing for the pose detection itself — it all runs on the client's GPU via WebGL.

Of those 33 landmarks, we care about a specific subset for hockey analysis:

- **Shoulders** (landmarks 11, 12) — Rotation indicates shot power and follow-through
- **Elbows** (landmarks 13, 14) — Arm angle during stick handling
- **Wrists** (landmarks 15, 16) — Hand position relative to the stick
- **Hips** (landmarks 23, 24) — Weight transfer during shots
- **Knees** (landmarks 25, 26) — Knee bend and stance width
- **Ankles** (landmarks 27, 28) — Foot positioning and balance

We also estimate stick position, which MediaPipe doesn't directly track. Using the wrist landmarks and the arm angle, we project a virtual stick position that's surprisingly accurate for shot detection purposes.

## Shot Detection: Harder Than You Think

Distinguishing a slapshot from a kid waving their stick around, scratching their head, or doing a celebration dance is the core technical challenge. Our shot detection algorithm uses temporal validation requiring 4 consecutive frames to confirm a shot event:

**Frame 1-2: Wind-up Detection** — The dominant-side wrist moves above the shoulder while the elbow angle opens. The hip rotation begins. We require both wrist elevation AND elbow extension to exceed thresholds, reducing false positives from stretching or adjusting equipment.

**Frame 2-3: Downswing Confirmation** — Wrist velocity exceeds a threshold (calibrated per age group), shoulder rotation accelerates, and the projected stick position drops toward the expected contact zone. The velocity threshold filters out slow movements like passing or stick handling.

**Frame 3-4: Follow-through Validation** — Wrist position crosses the body midline, arms extend, and hip rotation completes. This final frame confirms the motion was a complete shot, not an aborted wind-up.

The system supports multi-hand tracking for both left and right-handed shooters, automatically detecting handedness from the first few shots. Each shot type — wrist shot, slapshot, snapshot, backhand — has different landmark signature patterns that we classify after the shot is confirmed.

## LiveView Hooks: Bridging Browser ML to Server

This is where the architecture gets elegant. MediaPipe runs entirely in the browser via a LiveView hook. The hook captures pose data at 30fps, runs the shot detection algorithm client-side, and only sends shot events to the server — roughly 200 bytes per shot containing the shot type, key landmark positions at contact, velocity estimate, and a confidence score.

We never send video frames to the server for pose detection. That would be insane — 30 frames per second of 1080p video would melt any server and create unacceptable latency. The browser does the heavy lifting, and the server gets a clean, structured shot event to process.

\\\`\\\`\\\`elixir
defmodule PuckProWeb.TrainingLive do
  use PuckProWeb, :live_view

  def mount(_params, session, socket) do
    {:ok,
     socket
     |> assign(:shots, [])
     |> assign(:session_stats, %{total: 0, wrist: 0, slap: 0, snap: 0})
     |> assign(:xp, 0)
     |> assign(:level, 1)}
  end

  def handle_event("shot_detected", %{"type" => type, "landmarks" => landmarks, "velocity" => vel}, socket) do
    shot = %Shot{
      type: type,
      landmarks: landmarks,
      velocity: vel,
      timestamp: DateTime.utc_now()
    }

    updated_shots = [shot | socket.assigns.shots]
    stats = recalculate_stats(updated_shots)
    xp_gained = calculate_xp(shot)

    {:noreply,
     socket
     |> assign(:shots, updated_shots)
     |> assign(:session_stats, stats)
     |> update(:xp, &(&1 + xp_gained))
     |> maybe_level_up()}
  end
end
\\\`\\\`\\\`

## Claude Vision: The AI Coach

After a training session ends, the system compiles the captured shot events and optionally selected video clips, then sends them to Claude Vision for analysis. The prompt engineering here is hockey-specific and age-aware:

For young players (under 10), prompts emphasize encouragement, use simple language, and focus on one improvement at a time. "Your shot is getting faster! Next time, try bending your knees a little more before you shoot." For older players and adults, the feedback gets technical: "Weight transfer is initiating late — your hips should start rotating before the stick reaches the contact zone. This is costing you 15-20% of potential shot velocity based on the momentum transfer pattern."

The prompts also include hockey-specific context that general-purpose vision models might miss: stick flex timing, top hand push vs. bottom hand pull dynamics, blade angle at the point of contact, and follow-through direction relative to the intended target.

## Gamification: Making Practice Addictive

My kids don't care about biomechanics. They care about leveling up. So Puck Pro has a full gamification layer:

- **XP System** — Every shot earns XP. Harder shot types earn more. Clean technique (as scored by the detection algorithm) earns bonus XP.
- **Leveling** — Standard RPG-style leveling curve. Level 1 is "Garage Rookie." Level 50 is "Sniper Elite." The curve is tuned so you level up frequently early on (dopamine!) but progress slows as you advance.
- **Achievements** — "First Slapshot," "10 Shots in a Row," "50 MPH Club," "Switch Shooter" (scored from both sides). Each achievement comes with an XP bonus and a badge.
- **Session Streaks** — Practice 3 days in a row? Streak bonus. 7 days? Bigger bonus. Miss a day? Streak resets. The streak mechanic is shamelessly borrowed from Duolingo because it works.

My son doesn't know he's training with AI. He thinks he's playing a game where you level up by shooting pucks. He practices every day now, unprompted, because he wants to hit Level 20. That's the whole point.

## Lessons from the Garage

Building this taught me things that no tutorial covers:

**Kids are brutal testers.** They will find every edge case, crash every error path, and do things you never imagined. My daughter tried using a broom as a hockey stick. The pose detection thought she was having a seizure. That edge case led to the stick estimation algorithm becoming much more robust.

**Encouragement matters more than accuracy.** Early versions of the AI coaching were too critical. "Your form needs work in 7 areas." My son stopped using it. I rewrote the coaching prompts to lead with what's going well, then suggest one thing to improve. Usage went back up immediately. There's a lesson here for all product builders.

**MediaPipe is incredible.** Running real-time pose detection in a browser, on a phone, at 30fps, with no server round-trip — this would have been a PhD thesis 10 years ago. Now it's a JavaScript library you import with a script tag. The pace of ML tooling democratization is staggering.

**The road to ice projection is long but clear.** Every component of this system — pose detection, shot classification, coaching generation, visual overlay — is a building block toward the ice projection vision. The browser-based version is the MVP. The ice version is the dream. And every training session my kids do in the garage is validation data for the next version.`,
  },
  {
    slug: "startup-lessons",
    title: "Lessons from startup life",
    date: "April 5, 2024",
    year: "2024",
    author: "Ryan Yogan",
    excerpt:
      "After spending years at startups of various stages, here are the lessons that stuck with me.",
    content: `After co-founding a startup, leading engineering at Procore through its IPO, and consulting for dozens of early-stage teams, here are the lessons that actually stuck. These aren't theoretical — each one is something I learned the hard way, usually by doing the opposite first.

## Ship Fast, Learn Faster

The market doesn't care about your architecture. Get something in front of users before you optimize. I've seen beautiful codebases that never found product-market fit and ugly hacks that turned into billion-dollar companies.

At my first startup, we spent four months building a "perfect" v1 before showing it to a single customer. When we finally did, they told us we'd solved the wrong problem. Four months of engineering, gone. At Procore, I watched teams that shipped rough prototypes in two weeks consistently outperform teams that spent two months polishing. The feedback loop is everything. You can't steer a parked car.

## Talk to Users Every Single Day

Not through surveys. Not through analytics dashboards. Actual conversations with actual humans who use your product. The gap between what users say they want and what they actually need is where product insight lives.

At Procore, I started a practice of having every engineer on my team shadow a customer call at least once a month. Not watching a recording — sitting in on the live call, hearing the frustration in their voice when something didn't work. Engineers who understood user pain built better products. Every single time. The ones who only read tickets built features. The ones who talked to users built solutions.

## Tech Debt Is a Choice, Not an Accident

Every shortcut is a loan against future velocity. Sometimes that loan is worth it — shipping next week instead of next month can mean the difference between survival and running out of runway. Sometimes it bankrupts you — I've seen teams where technical debt accumulated to the point where every feature took 3x longer than it should have, and eventually the codebase had to be rewritten from scratch.

The skill is knowing which debt to take on and which to avoid. My rule of thumb: if the shortcut affects data integrity or security, don't take it. If it affects code aesthetics or "best practices," it's probably fine. You can always refactor pretty code later. You can't un-corrupt a database.

## Hire for Slope, Not Intercept

The person who learns fast and adapts will outperform the expert who can't grow. Especially in startups where the job description changes every quarter. I've hired people who couldn't pass a whiteboard interview but became the best engineers on the team within six months, and I've hired "10x engineers" with impressive resumes who couldn't function outside their narrow specialty.

At Procore, as we scaled from a small team to a large engineering organization, the engineers who thrived weren't the ones with the most experience — they were the ones who could context-switch between frontend and backend, between building and mentoring, between writing code and writing documentation. Adaptability is the ultimate startup skill.

## Build the Team You Wish You'd Had

The biggest lesson from leading through Procore's IPO: the team you build is more important than the product you build. Products can be rewritten. Architecture can be refactored. But a team with the wrong culture, wrong incentives, or wrong communication patterns will produce bad outcomes no matter how good the individuals are.

I spent as much time on team dynamics — how people communicate, how decisions are made, how conflicts are resolved — as I did on technical decisions. The ROI on team health is infinite.

## Know When to Leave

The hardest lesson. Not every company deserves your best years. Not every mission is worth the sacrifice. The sunk cost fallacy is strongest when you're emotionally invested in the outcome — when you've poured years of your life into something and can't separate your identity from the company's success.

I've stayed too long at places I should have left, and I've left places I probably should have stayed. The signal I've learned to watch for: when you stop learning and start coasting, it's time. Not because coasting is bad, but because the opportunity cost of your time is too high to spend it somewhere you're not growing.`,
  },
  {
    slug: "ai-hardware",
    title: "AI at the edge: when software meets hardware",
    date: "March 10, 2024",
    year: "2024",
    author: "Ryan Yogan",
    excerpt: "Exploring the intersection of machine learning and embedded systems.",
    content: `A brief exploration of running ML models on resource-constrained hardware. From TensorFlow Lite to custom ONNX runtimes on ESP32, the edge is where AI gets real.

The cloud is easy. You have infinite compute, infinite memory, and a credit card. The edge is hard. You have 520KB of RAM, a 240MHz processor, and a battery that needs to last six months. But edge AI is where the interesting problems live — and increasingly, where the money is.

## Why the Edge Matters

Predictive maintenance on factory equipment that can't afford the 50ms round-trip to a cloud API. Wildlife cameras deployed in remote areas that need to classify species without cellular connectivity. Smart home devices that respect privacy by keeping inference entirely local — your voice assistant shouldn't need to phone home to determine that you said "turn off the lights."

The use cases keep multiplying. Agricultural sensors that detect crop disease from leaf images. Wearable devices that identify fall patterns for elderly patients. Industrial quality control cameras running defect detection at production line speeds. All of these require models that can run on hardware costing less than $10, consuming less than 100mW, and responding in under 10ms.

## The Toolchain Is Maturing Fast

TensorFlow Lite Micro, ONNX Runtime Mobile, and microTVM are making it possible to deploy real models on real hardware. The trick is quantization: converting 32-bit floating point weights to 8-bit integers without destroying accuracy. It's more art than science — some layers quantize gracefully while others collapse. Post-training quantization gets you 80% of the way there; quantization-aware training handles the rest, but requires retraining the model from scratch with simulated quantization noise.

Model pruning is the other secret weapon. Most neural networks are over-parameterized — you can remove 50-90% of the weights with minimal accuracy loss. The combination of pruning and quantization can shrink a model from 100MB to under 500KB while retaining 95%+ of its original accuracy. That's the difference between "needs a GPU" and "runs on a microcontroller."

## What I've Built

My experiments have focused on the ESP32-S3, which has a dual-core 240MHz processor and 8MB of PSRAM — luxurious by embedded standards. I've deployed image classification models (MobileNetV2 quantized to INT8), keyword spotting models for voice commands, and anomaly detection models for sensor data. The image classifier runs at about 5 frames per second, which is fast enough for most industrial applications. The keyword spotter runs in real-time with room to spare.

The developer experience is still rough compared to cloud ML, but it's improving rapidly. Frameworks like Edge Impulse are making it possible to go from data collection to deployed model in an afternoon. Give it another two years and edge ML deployment will be as routine as deploying a web app.`,
  },
  {
    slug: "embedded-rust",
    title: "Getting started with embedded Rust",
    date: "February 20, 2024",
    year: "2024",
    author: "Ryan Yogan",
    excerpt: "A practical guide to writing firmware in Rust for ESP32 and other microcontrollers.",
    content: `Rust's zero-cost abstractions and memory safety make it ideal for embedded systems. This guide covers setting up Embassy, flashing firmware, and building a simple sensor project.

The embedded Rust ecosystem has reached a tipping point. Embassy provides an async runtime for microcontrollers that feels almost like writing async Rust for a web server. The HAL (Hardware Abstraction Layer) crates cover most popular chips — ESP32, STM32, nRF52, RP2040. And probe-rs makes flashing and debugging almost pleasant, with a unified interface that works across debug probe vendors.

## Getting Started

Getting started is straightforward: install the target toolchain (\\\`rustup target add thumbv7em-none-eabihf\\\` for ARM Cortex-M), set up your probe, and write your first blinky. But the real power shows up when you start using Rust's type system to encode hardware constraints at compile time. Wrong pin configuration? Compile error. Buffer overflow? Impossible. Use-after-free in an interrupt handler? The borrow checker says no.

This is a genuine superpower for embedded development. In C, a misconfigured GPIO pin might silently corrupt memory or damage hardware. In Rust, the type system physically prevents you from using a pin configured as an input for output operations. The error happens at compile time, not when your prototype is on fire.

## Embassy: Async for Microcontrollers

Embassy deserves special attention because it fundamentally changes how you write embedded Rust. Traditional embedded code uses interrupt handlers and global mutable state — exactly the kind of programming that Rust's safety model makes difficult. Embassy replaces this with async/await syntax that looks remarkably like application-level Rust.

You define tasks as async functions, spawn them on the executor, and use channels and signals for inter-task communication. No more manually managing interrupt priorities, no more volatile global flags, no more subtle race conditions that only appear when the moon is full. The executor handles scheduling, and Rust's ownership model ensures data races are impossible.

## Why Not Just Use C?

The honest answer: for simple projects, C is still faster to prototype. The embedded Rust toolchain has friction — build times are longer, the ecosystem is younger, and Stack Overflow has fewer answers for your specific chip + peripheral combination. But for anything that needs to be reliable — medical devices, automotive systems, industrial controls — the safety guarantees are worth the startup cost. I've shipped embedded C that had subtle memory bugs hiding for months. I've never shipped embedded Rust with a memory bug, because the compiler won't let me.`,
  },
  {
    slug: "building-teams",
    title: "Building engineering teams from scratch",
    date: "January 15, 2024",
    year: "2024",
    author: "Ryan Yogan",
    excerpt: "Lessons from scaling engineering organizations from 0 to 65+.",
    content: `The first hire sets the culture. The first five hires set the pace. After scaling Procore's UI organization from 8 to 65+ engineers, here's what I learned about building engineering teams from zero.

## Culture Is Contagious

Your first engineers will clone their habits, values, and communication styles into every subsequent hire. Choose them for how they work, not just what they know. At Procore, our first frontend engineer was meticulous about code review — not nitpicky, but genuinely invested in making every PR better than it started. That culture of constructive, thorough review became the team's DNA. Three years later, engineers who'd never met that first hire were doing reviews the same way, because that's "how we do things here."

The inverse is also true. I've seen teams where the first hire was brilliant but dismissive of junior engineers' questions. That contempt metastasized. Within a year, nobody asked questions in meetings, knowledge siloed, and onboarding new engineers took months instead of weeks.

## Process Should Follow Pain

Don't implement Scrum because a book told you to. Don't adopt SAFe because a consultant sold your VP on it. Wait until the team feels the pain of coordination failures, then introduce just enough process to fix that specific pain. Teams that own their process outperform teams that inherit it.

At 8 engineers, we had no formal process. We talked in Slack, paired on hard problems, and shipped when things were ready. At 20 engineers, we needed something — work was getting duplicated, priorities were unclear. We adopted lightweight kanban boards and weekly syncs. At 40+, we needed more structure: sprint planning, cross-team dependency tracking, formal architecture reviews. Each addition solved a real, felt problem. Nothing was adopted preemptively.

## Psychological Safety Is Not Optional

Engineers who fear failure don't innovate. Engineers who fear speaking up don't catch bugs. The team lead's job is to make it safe to be wrong, ask questions, and challenge assumptions — including the lead's own assumptions.

The most important thing I ever did as a manager was publicly admit when I was wrong. Not in a performative way, but genuinely: "I pushed for that architecture decision, it was the wrong call, here's what I learned." After I did that, engineers started flagging concerns earlier, pushing back on timelines they knew were unrealistic, and admitting mistakes before they became incidents. The number of production issues dropped, because people stopped hiding problems.

## Invest in Developer Experience

Every minute your engineers spend fighting tooling is a minute they're not building product. CI that takes 45 minutes? Fix it. Flaky tests? Fix them. Slow builds? Fix them yesterday. I used to track "minutes wasted on tooling" as a team metric. When it started climbing, we'd dedicate a sprint to DX improvements. The productivity bump after each DX sprint was measurable and immediate.

At Procore, we reduced CI time from 42 minutes to 8 minutes. The impact wasn't just time saved — it changed how people worked. Engineers started running CI before opening PRs because it was fast enough to be worth it. Merge conflicts dropped because PRs spent less time in review queues. Deploy frequency tripled.

## The Hiring Pattern

After 700+ interviews and 50+ hires, the pattern is clear: great teams are built on trust, clarity, and relentless investment in the people doing the work. Hire for curiosity, empathy, and communication skills alongside technical ability. The best engineers I've ever worked with weren't the ones who could solve the hardest algorithm problems — they were the ones who could explain their thinking, listen to feedback, and make everyone around them better.`,
  },
];

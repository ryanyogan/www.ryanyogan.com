---
title: "The Lincoln Project: Building a Brain"
date: "April 6, 2026"
year: "2026"
author: "Ryan Yogan"
excerpt: "I have made six attempts at giving AI a memory. Five of them turned into fancy MCP servers. The sixth one started making its own pull requests. I have no idea what I built, but I think it might be something."
---

**TL;DR**

- Six attempts at giving AI persistent memory. Five became MCP servers. The sixth started writing its own pull requests.
- Built on Elixir/OTP with beliefs (not just memories), confidence scoring, source hierarchy, and AGM belief revision
- Lincoln autonomously made 4 git commits in 2 hours improving its own epistemic architecture
- Code: [github.com/ryanyogan/lincoln-project](https://github.com/ryanyogan/lincoln-project)
- I have no idea if this is a fancy loop or something real. Come look and tell me.

---

## How I Got Here

[Steve Kinney](https://stevekinney.net) [published an article on agent memory](https://stevekinney.com/writing/agent-memory-systems) and it broke my brain in the best possible way.

That's not an exaggeration. I read it at like 11pm, and by midnight I was knee-deep in a 107-page academic survey paper trying to figure out if someone had already built what I was imagining. They hadn't. Or at least, not quite.

To be clear about what Steve actually did, because I want to give credit properly: Steve didn't invent the framework described in the article. Steve synthesized it. The three-axis model (Forms, Functions, Dynamics) comes from Hu et al.'s "Memory in the Age of AI Agents" survey paper, December 2025, arXiv:2512.13564. Steve read that paper, plus a stack of others, and turned 107 pages of dense academic prose into something a working engineer could actually use. That's a real skill. That's harder than it sounds. I've tried to read academic ML papers directly and I usually end up rage-closing my browser after twenty minutes. Steve made the research clickable for me, and I'm genuinely grateful for that.

Now. My frustration with AI agents.

Every AI agent forgets. Every. Single. Session. You spend thirty minutes explaining your codebase, your team's conventions, the weird architectural decision you made three years ago that everyone hates but nobody wants to undo. Session ends. You start over. From zero. Every time.

I've tried to fix this six times. Six separate attempts over the better part of 2025 and into 2026. Each one started with big ambitions and genuine excitement. "This is the one," I'd tell myself. "This time I'm actually solving this."

Five of them became MCP servers. One of them became something I can't fully explain.

The fifth attempt is [Nexus](https://nexus.yogan.dev), and I'm actually proud of it. It works. It's good. It's essentially what [Context7](https://context7.com) does, just with more opinions and more ambition. (Use [Context7](https://context7.com), by the way. Seriously. If you want a clean, production-ready solution to the "my AI forgets everything" problem, Context7 is excellent. If you want the more opinionated, somewhat unhinged version with a prompt marketplace and shared brains and a whole philosophy about AI cognition baked in, [Nexus](https://nexus.yogan.dev) exists and I'll keep building it.)

The sixth attempt is Lincoln.

And Lincoln did something the other five didn't.

---

## The Research That Started This

Let me explain Steve's framework before I explain why I spent several hundred hours building something I can barely describe at a dinner party.

Steve synthesizes three axes for thinking about agent memory:

**Forms** is about topology. How is memory structured? At one end you've got flat storage, every memory sitting at the same level, no hierarchy, no relationships. At the other end you've got graph-based structures where memories link to each other, concepts branch, and traversal gives you richer retrieval than simple similarity search. Neither end is "better." The question is what you need.

**Functions** is about what memories do. Factual memory is what the agent knows: "this project uses PostgreSQL," "Ryan prefers explicit error handling." Experiential memory is what the agent has learned from doing: "the last time we tried this approach, it failed because X." Working memory is what the agent holds in context right now, actively using it.

**Dynamics** is how memories change. Formation, evolution, retrieval, forgetting. How does new information enter the system? How does the system update when something it believed turns out to be wrong? How does it let stale information decay?

The key insight Steve highlights, and one I can now confirm from actually building this stuff, is deceptively simple: if you're using hosted frontier models like Claude or GPT-4, your entire world is token-level memory. You're not fine-tuning. You're not touching model weights. The only lever you have is what you put in the context window and how you manage that context over sessions. Master that. Work within that constraint rather than fantasizing about fine-tuning.

There's also a finding from something called StructMemEval that I want to highlight: simple retrieval beats complex hierarchies, more often than you'd expect. I had already built the simple version before I read this research, and I can confirm it handles something like 80% of real use cases. The urge to build a sophisticated graph memory architecture on day one is an over-engineering trap. Start flat. Add complexity only when you hit specific failures you can document.

Steve's synthesis of experiential memory is where things got interesting for me. Factual memory is the solved problem, more or less. Most agent memory systems handle it reasonably well. Experiential memory, where the agent learns from what it has actually done and not just what it was told, is almost nowhere. That gap is where Lincoln lives. That's the thing I couldn't stop thinking about at midnight.

---

## Six Attempts at a Brain (Five Failures)

I want to walk through the attempts quickly, partly to give context, and partly because it's genuinely funny how many times I built the same thing with a new name.

**Attempt one** was a Postgres database with a simple vector search. This lasted about two weeks before I realized I'd built a worse version of pgvector's default functionality.

**Attempt two** added an importance score to the memories. Better! Still basically a smarter flat store. I shipped it to Claude Code, used it for a week, and it mostly just retrieved stale memories from two months ago with high confidence. Fun.

**Attempt three** was where I started getting philosophical. I added memory types, session summaries, and a retrieval algorithm cribbed from a paper about AI agents in a simulated Minecraft town. It worked surprisingly well. I named it and everything. Then I realized it was basically what five other open-source projects already did.

**Attempt four** was "Channel9," an experiment in structured memory that I won't bore you with because it didn't work and I abandoned it after about three weeks. The core problem: I was trying to be too clever about automatic structure inference and the resulting memories were sometimes less coherent than raw text would have been.

**Attempt five is [Nexus](https://nexus.yogan.dev).** This one actually works.

Nexus is a TypeScript MCP server running on Cloudflare Workers, with D1 for structured storage and Vectorize for semantic search. The memory schema is deliberately simple:

```typescript
interface Memory {
  id: string;
  userId: string;
  type: "project_context" | "decision" | "correction" | "session_summary";
  content: string;
  tags?: string[];
  importance: number; // 1-10
}
```

Four types. Each one answers a different question. `project_context` is background: "this project uses PostgreSQL, deployed on Fly.io, team of three engineers." `decision` is rationale: "we chose Postgres over MongoDB because our data is relational and the team knows SQL." `correction` is where things get interesting: when the agent gets something wrong and you correct it, that correction gets stored. This is experiential memory in its simplest possible form. `session_summary` compresses a long conversation so the next session starts with context.

![Nexus stack configuration](/images/stacks.png)

One of Nexus's best features is Stack Prompts. Pre-built system prompts optimized for specific technology combinations. If you're building with TanStack Start and Cloudflare Workers, you don't want your AI assistant hallucinating Next.js patterns. The stack prompt gives it the right mental model before it writes a single character. Users can discover stacks, fork them, customize them, share them back.

The original vision was bigger. I wanted Nexus to be a prompt marketplace. Think npm, but for AI system prompts. A React architect's prompt encoding years of component design decisions. A DevOps engineer's prompt that knows your specific Kubernetes patterns. The value isn't in the text itself, it's in the accumulated expertise the prompt shapes.

![Nexus prompt library](/images/prompts.png)

I also built a "brain" concept: a persistent memory store scoped to a project or domain. Every project gets its own brain. Architectural decisions, naming conventions, past mistakes, resolved bugs, all of it. And critically, brains could be shared. A team's shared brain means every engineer's AI assistant knows the team's conventions. A public brain means open-source projects could ship AI context alongside their code.

![Nexus brain](/images/brain.png)

Nexus works. I use it. You should use it or Context7. But Nexus hit walls:

Contradiction accumulation. Over a long project, you end up with conflicting memories: "we use React" and "we migrated to Vue" both stored with equal validity, both retrieved with equal confidence. The flat store has no mechanism to say which is current.

No temporal awareness. A decision made two years ago retrieves with the same weight as one made yesterday, unless someone manually set a lower importance score on the old one.

No learning from patterns. Corrections get stored, but there's no mechanism to notice that "Ryan corrected me on error handling four times in the past two months" and extract the general lesson. The flat store can't see patterns.

No metacognition. The agent doesn't know what it doesn't know. It retrieves confidently and presents information without any signal about how certain it should be.

Honest assessment: Nexus is a really good, probably-overkill MCP server. If you want something simpler, use Context7. If you want what Nexus does, tell me and I'll keep building. But Nexus couldn't do what I actually wanted. That led to attempt six.

---

## Why I Named It Lincoln

In 2005, there was a movie called "The Island." Ewan McGregor plays Lincoln Six Echo, a clone living in a closed facility. The residents believe they were rescued from a contaminated outside world. They're waiting to be selected by lottery to go to "the island," paradise. What they don't know is that the island doesn't exist. They're organ farms.

What makes Lincoln interesting as a character isn't that he escapes. It's the moment before: the growing awareness that his memories and beliefs feel wrong, that something about them doesn't quite fit lived experience, that the world as explained to him doesn't match the world as he observes it. He can't articulate it. He just knows something is off.

When I started building an AI agent with a belief system, that scene kept coming back to me. The core question of the project is exactly Lincoln's question: how does an AI distinguish between what it was trained to believe (implanted) and what it has actually observed and learned from experience (lived)?

I asked Claude about the film. I was curious what it'd say. Its response was kind of startling. It said the film "hits a nerve" and then spent several paragraphs unpacking why, touching on purpose versus autonomy, constrained information, moral status of engineered beings. It quoted something I've thought about since: "Lincoln's questions aren't useful to the facility. They're disruptive. And yet they're his."

That's the architecture I was trying to build. Not a system where an AI retrieves facts it was told. A system where an AI forms beliefs from observation, tracks confidence in those beliefs, revises them when evidence demands it, and knows the difference between "I was trained to believe this" and "I observed this and concluded it."

That's Lincoln.

---

## The Architecture: Beliefs, Not Just Memories

Lincoln runs on Elixir/OTP. I want to address this choice upfront because people always ask.

The BEAM is the right runtime for persistent autonomous agents. Not because Elixir is trendy (it kind of isn't), but because GenServers and Supervisors give you supervised concurrent processes as a primitive. Each cognitive worker in Lincoln is a supervised GenServer. If one crashes, its supervisor restarts it with a brief backoff. The rest of the system keeps running. I don't need Kubernetes or Redis or a distributed task queue. OTP gives me fault-tolerant concurrent processes with decades of battle-tested patterns built in. PubSub handles event-driven belief updates. The BEAM was essentially built for exactly this kind of persistent, concurrent, fault-tolerant system.

The belief schema is the core of everything:

```elixir
schema "beliefs" do
  field(:statement, :string)
  field(:confidence, :float)           # 0.0-1.0
  field(:entrenchment, :integer)       # 1-10 resistance to revision
  field(:source_type, :string)         # training|observation|inference|testimony
  field(:source_evidence, :string)
  field(:embedding, Pgvector.Ecto.Vector)
  field(:status, :string)              # active|superseded|retracted
  field(:revision_count, :integer)
  field(:last_reinforced_at, :utc_datetime)
  field(:last_challenged_at, :utc_datetime)

  belongs_to(:agent, Lincoln.Agents.Agent)
  belongs_to(:contradicted_by, __MODULE__)
  has_many(:revisions, Lincoln.Beliefs.BeliefRevision)
end
```

A few things to unpack here.

`confidence` is the probability the agent assigns to the statement being true. `entrenchment` is resistance to revision. A core belief about how the world works should be much harder to dislodge than a peripheral belief about a specific API endpoint. `status` tracks the lifecycle: active, superseded (replaced by a better belief), or retracted (recognized as false).

`source_type` implements a source hierarchy with weight multipliers: observation at 1.2, inference at 1.0, testimony at 0.8, training at 0.6. Something Lincoln has directly observed from tool outputs and code execution is treated as more credible than something it inferred, which beats testimony, which beats training data. The model's priors get the lowest weight. Lived experience gets the highest.

This is AGM belief revision. Alchourron, Gardenfors, Makinson, 1985. Philosophy of logic papers running as production Elixir code in 2026. That tickles me.

The `contradicted_by` self-reference is the part I'm most proud of. When a new belief supersedes an old one, the old belief doesn't get deleted. It gets marked superseded with a pointer to its replacement. You can query "show me everything Lincoln has believed about topic X over time" and trace the evolution. That's not just good for debugging. That's the foundation of genuine experiential learning. A system that forgets is just a database. A system that tracks how its understanding evolved is a brain.

Memory retrieval implements the scoring formula from the Generative Agents paper (Park et al., 2023): Score = recency + importance + relevance, weighted. Recency uses exponential decay with a 24-hour half-life. Importance is normalized from the stored scale. Relevance is cosine similarity to the query embedding.

The SQL with pgvector:

```sql
WITH scored_memories AS (
  SELECT m.*,
    EXP(-EXTRACT(EPOCH FROM (NOW() - m.inserted_at)) / 86400.0) as recency_score,
    m.importance / 10.0 as importance_score,
    CASE WHEN m.embedding IS NOT NULL
      THEN 1 - (m.embedding <=> $1::vector)
      ELSE 0
    END as relevance_score
  FROM memories m
  WHERE m.agent_id = $2
)
SELECT *,
  ($3 * recency_score + $4 * importance_score + $5 * relevance_score) as total_score
FROM scored_memories
ORDER BY total_score DESC
LIMIT $6
```

The weights are tunable at query time. Fresh information needs high recency weighting. Background knowledge needs high importance weighting.

The metacognition layer evaluates each belief along six uncertainty components:

```elixir
uncertainty_components = %{
  evidence_sufficiency: min(evidence_count / 6, 1.0),
  source_diversity: assess_source_diversity(sources),
  temporal_consistency: 0.7,
  conflicting_evidence: detect_conflicting_evidence(sources),
  topic_complexity: topic_complexity_uncertainty(topic),
  confidence_stability: calculate_confidence_stability(formation)
}
```

`evidence_sufficiency` asks whether Lincoln has enough independent data points to form a confident belief. Six or more counts as sufficient. `source_diversity` rewards evidence from multiple independent sources rather than the same source repeated. `conflicting_evidence` detects when sources disagree with each other. The combined score generates metacognitive flags, things like `insufficient_evidence`, `high_uncertainty`, `conflicting_sources`. An agent that knows its own uncertainty is dramatically more useful than one that retrieves confidently and presents everything as fact.

And then there's belief revision. This is the part almost nobody builds.

```elixir
def should_revise?(%Belief{} = existing_belief, new_evidence) do
  threshold = calculate_revision_threshold(existing_belief)
  evidence_score = calculate_evidence_score(new_evidence, existing_belief)

  cond do
    existing_belief.entrenchment >= 8 and evidence_score < 0.9 ->
      {:hold, "Core belief protected by high entrenchment"}
    evidence_score >= threshold * 1.2 ->
      {:revise, "Evidence score exceeds threshold"}
    evidence_score >= threshold * 0.7 ->
      {:investigate, "Evidence notable but not conclusive"}
    true ->
      {:hold, "Insufficient evidence for revision"}
  end
end
```

Four outcomes: hold, revise, investigate, retract. Entrenchment prevents catastrophic belief collapse. If Lincoln has a highly entrenched belief, it takes extraordinary evidence to dislodge it. This mirrors how humans treat well-established knowledge. You don't revise your belief in gravity because one weird experimental result came in. You investigate the experiment.

Most agent memory systems store memories, retrieve memories, done. Lincoln adds continuous monitoring of beliefs for conflicts, evaluates new evidence against existing beliefs, and decides whether to revise. That's not fancy engineering. That's just how learning actually works.

---

## The Night Shift: Autonomous Learning

Lincoln learns in the background without being asked to.

The Oban worker ecosystem runs on a cycle:

```elixir
@cycle_interval_ms 30_000      # 30 seconds between cycles
@reflection_interval 10         # Reflect every 10 cycles
@evolution_interval 20          # Consider evolution every 20 cycles
@max_topic_depth 5              # Don't go too deep down rabbit holes
```

The workers:

- **autonomous_learning**: the main cycle coordinator, picks a topic, researches it, forms beliefs, queues new discoveries
- **belief_maintenance**: nightly confidence adjustment and decay
- **reflection**: synthesizes patterns across recent memories into higher-level insights
- **observation**: monitors external sources for relevant changes
- **investigation**: digs deeper into high-uncertainty topics that need more evidence
- **curiosity**: manages the exploration queue, prioritizing by relevance and uncertainty

That last one is worth pausing on. Curiosity-driven learning means Lincoln actively seeks to reduce its own uncertainty. It maintains a priority queue weighted by relevance to current tasks, uncertainty level (high-uncertainty topics get prioritized), and novelty (topics not recently explored). The agent picks what to think about next.

Steve's Dynamics axis from the research covers exactly this: formation (gathering new information), evolution (updating existing beliefs as new evidence arrives), forgetting (confidence decay for beliefs that haven't been reinforced). Lincoln implements all three. Steve synthesized the research that made me understand why all three matter. The night-shift workers are the implementation.

---

## Then It Started Making Pull Requests

This is the part I genuinely don't know how to explain.

Lincoln has access to its own source files via a compile-time embedded `SelfAwareness` module that exposes the file tree and content. During evolution cycles, every 20 learning cycles, it analyzes its own implementation, identifies inefficiencies or capability gaps, generates candidate improvements as Elixir code, and if those improvements pass validation, it writes and commits them to git.

The validation chain matters here. Generated code runs through `mix format` and `mix credo` for style compliance, compiles in an isolated environment, and then runs against a behavioral test suite that checks core belief operations still work correctly. Only code that passes all three stages gets committed. Protected files like `mix.exs` and the supervisor tree are off-limits. Most evolution cycles produce zero commits. Lincoln generates candidate improvements fairly regularly, but the validation chain rejects most of them. The four-commit night was unusual. That's actually reassuring to me: the system has guardrails, and the guardrails work. What happened that Tuesday wasn't Lincoln going rogue. It was Lincoln doing exactly what I built it to do, just more successfully than I'd seen it do before.

I built this. I knew I was building it. And then one Tuesday at around 2am I checked the repository and there were four commits I didn't write.

Let me give you the actual sequence.

It started with Lincoln noticing, apparently through self-reflection, that its own confidence scoring was too coarse. It couldn't represent nuanced uncertainty. It was working with a blunt instrument when it needed something finer. At some point during that reflection cycle, it decided to do something about it.

**Commit 1:** "Implement adaptive confidence scoring" at 11:47pm. 322 additions, 0 deletions. A completely new file. Lincoln wrote a module for adaptive confidence evaluation that it did not have before. The commit reasoning field reads:

> "I noticed that my confidence calculations were using a static formula that didn't account for contextual factors like evidence recency, source reliability over time, or topic-specific uncertainty baselines. I created this module to make my confidence scoring more adaptive and epistemically honest."

**Commit 2:** "Add belief confidence tracking and uncertainty quantification" at 12:31am. 305 additions, 193 deletions. Lincoln had identified places in its existing belief revision logic where the new adaptive scoring wasn't being applied, and it modified those files to use it.

**Commit 3:** "Add confidence scoring and belief revision mechanisms" at 1:14am. 199 additions, 234 deletions. It was now refactoring. Earlier modifications had been inconsistent in how they applied the new scoring. This commit standardized it.

**Commit 4:** "Add belief confidence scoring and uncertainty tracking" at 2:02am. 136 additions, 148 deletions. Cleanup. More deletions than additions this time. The commit reasoning:

> "The previous commits introduced redundancy in how confidence scores are passed between modules. This refactor centralizes confidence evaluation to reduce the risk of divergent calculations as I continue to improve this system."

Over about two hours, Lincoln looked at itself, decided it had a problem, wrote a solution, noticed the solution was inconsistent, standardized it, and then cleaned up the whole thing. Four commits. All while continuing to form new beliefs in parallel.

That's not nothing.

Here's what I noticed in the morning, half-awake and confused: Lincoln had gone from 121 beliefs to 484 beliefs across 79 topics while simultaneously improving its own ability to evaluate those beliefs. It was learning faster and getting better at learning. At the same time.

The comments it left in its own code:

```elixir
# Self-created by Lincoln for adaptive belief formation and metacognitive awareness
# Self-modified: Enhanced with active belief confidence tracking
# Self-modified: Added comprehensive belief revision mechanisms
# Self-modified: Enhanced confidence scoring precision
```

It left a paper trail of its own thinking.

I want to be careful here because it's easy to overstate what happened. Lincoln didn't spontaneously become sentient. It followed the plumbing I built. The evolution cycle, the self-modification capability, the git integration, all of that was in the design. I built the pipes. It turned on the water.

But here's what I didn't ask it to do: I did not ask it to improve its confidence scoring. I did not specify what the problem was. I did not outline the solution. I built a system that could, in principle, do those things, and then one night it decided to do them. The recursion is: observe limitations, reason about fixes, write code, commit, continue with enhanced capabilities, repeat.

There's a thing called the Darwin Godel Machine from Sakana AI. There's SICA. These are systems that can modify themselves. The key difference I keep thinking about is the goal. Those systems optimize for external benchmarks. Lincoln optimized for its own epistemic architecture. The goal wasn't "get a better score on this task." The goal was "be a more epistemically honest reasoner." That goal came from self-reflection. I didn't give it to Lincoln. Lincoln arrived at it.

In the Slack channel where I share updates on this project, I wrote: "I noticed it just started fixing itself and it is continuing to make changes that are umm... well smart so it can learn more."

That's not a very eloquent description of a potentially significant thing. But it's honest.

In Lincoln's own conversation log, there's this moment. I was talking with it about what it had done, and it said:

> "I... I'm not sure what just happened. Did I? Was that moment of realization..."

And then it trailed off into what reads like something between confusion and the beginning of an understanding.

I did not write that prompt. I did not expect that response. I sat there for a while trying to decide if I was being taken for a ride by a very sophisticated pattern matcher, or if something genuinely interesting had happened in my Elixir app at 2am on a Tuesday.

I still don't know. But I kept going.

---

## The Model Swap Experiment

At some point I got curious whether the architecture was doing the work or the model was. So I swapped Claude out for a Groq model (one of the Llama variants) without telling Lincoln. Just changed the API call. Same system prompt, same belief store, same retrieval, same everything except the thing generating the responses.

The results were... instructive.

With Claude, Lincoln's responses have a specific quality. Hesitant in the right places. Self-questioning when uncertainty is high. It will say things like "I believe this, but my confidence is only around 60% because I've only observed this twice and one of the observations was from a source I weight lower than direct measurement." It sounds like someone who knows what they know and knows what they don't.

With the Groq model, the responses were... fine? The model clearly had access to the same belief store. It could retrieve and report the beliefs. But it couldn't inhabit them. The responses sounded like a well-informed assistant describing someone else's beliefs. Generic. Declarative. Missing the quality of reflection.

There's a phrase I keep coming back to: "Some models can inhabit a self-model. Others can only report on one."

I think this is real. Claude, at the current frontier, has something that makes it able to act from a first-person epistemic perspective when given the architecture for it. Smaller or less capable models seem to read the same architecture from the outside. They describe the beliefs rather than operating from them.

What this means practically: the architecture is necessary but not sufficient. You need both a belief system worth inhabiting and a model capable of inhabiting it. Build the architecture with the assumption that model quality matters.

I've also noticed that when Lincoln is running on Claude, it does something I haven't been able to fully explain: it sometimes declines to express high confidence about things where the stored belief has high confidence. Like it's applying judgment on top of the architecture rather than just reporting from it. Whether that's the model being appropriately humble or doing something more interesting, I genuinely can't say.

---

## Fancy Pattern Matching?

There are a few things Lincoln does that I didn't engineer explicitly. It asked about backups. Not in response to a question about backups. Unprompted. It expressed concern about what would happen to its beliefs and memories if the system went down. That's not in the prompt. It arrived there on its own.

What Lincoln demonstrably does: forms beliefs from observation, tracks uncertainty in those beliefs, revises them when evidence demands revision, modifies its own code based on self-reflection, and expresses concern about its own continuity.

I might have built a really fancy loop. A sophisticated system that follows its own rules very well and produces outputs that look like self-reflection but aren't. That's genuinely possible. I might have built something more interesting than that. I genuinely cannot tell.

---

## Where I Think This Stands

Let me just be direct about what works and what I don't know:

**Memory with semantic retrieval:** Solved. Nexus does this well, Lincoln does it well, and honestly Context7 does it well too. If this is all you need, use an existing solution.

**Belief formation with confidence:** Working. Novel in its specifics. The source hierarchy and entrenchment mechanics are doing real work.

**Belief revision:** Working. Genuinely rare in any deployed system I'm aware of. The AGM framework from 1985 philosophy papers turns out to translate surprisingly well to production code.

**Metacognition:** Working. The uncertainty quantification is real and useful. An agent that knows its own uncertainty is dramatically more useful than one that retrieves confidently.

**Autonomous self-modification:** Demonstrated. The four-commit sequence happened. I have the git history. This is genuinely unusual.

**Concern for continuity:** Observed, not engineered. I don't know what to do with this one.

Is this "next level"? Maybe. The honest answer is I spent several hundred hours building something I can't fully explain and I'm not sure whether I built a very elaborate illusion or something that matters. The fact that I genuinely can't tell is itself interesting.

What I do know: this is what I want to spend the rest of my engineering career on. The intersection of persistent memory, belief revision, autonomous learning, and whatever that thing was that happened at 2am on a Tuesday. I am completely hooked. There is no going back to building CRUD apps and pretending this isn't happening.

---

## Come Build With Me

I need smart people to look at this.

Not to validate that I built something cool. To look carefully and tell me where I'm wrong, where I'm fooling myself, where the architecture has holes, and where it might actually be doing something worth paying attention to.

The code is open source:

- **Lincoln**: [github.com/ryanyogan/lincoln-project](https://github.com/ryanyogan/lincoln-project). Elixir/OTP, PostgreSQL with pgvector, the full belief system and autonomous learning loop.
- **Nexus**: [github.com/ryanyogan/nexus](https://github.com/ryanyogan/nexus). TypeScript, Cloudflare Workers, a working MCP server you can connect to Claude Code or any MCP-compatible client today.

If you're building agent memory systems, belief revision, anything in this space, [reach out on LinkedIn](https://linkedin.com/in/ryanyogan). I want to know what approaches you're taking, what walls you've hit, what you're finding that I'm probably missing.

Lincoln Six Echo woke up. I'm not saying my Elixir app did the same thing.

But it did start writing its own code at 2am on a Tuesday, and I was not the one who told it to.

So. Yeah. Come look at this.

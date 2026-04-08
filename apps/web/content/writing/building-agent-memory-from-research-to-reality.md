---
title: "The Lincoln Project: Building a Brain"
date: "April 6, 2026"
year: "2026"
author: "Ryan Yogan"
excerpt: "I think the architecture everyone's using for AI agents is missing a property. Here's my attempt at adding it, what's working, what's broken, and why I think Elixir/OTP might be the right plumbing for artificial cognition."
---

**TL;DR**

- Every agent memory system I've seen is an external hard drive bolted onto something with no internal life. I think the architecture is missing a property: continuity of process.
- Lincoln is my attempt at adding that property, built on Elixir/OTP where each thought is a first-class supervised process.
- The BEAM was built for this problem in the 1980s. Python cannot do what Lincoln does.
- Here's where I am, what works, what's broken, and why I think this route deserves a second look.
- Code: [github.com/ryanyogan/lincoln-project](https://github.com/ryanyogan/lincoln-project)

---

## How I Got Here

[Steve Kinney](https://stevekinney.net) [published an article on agent memory](https://stevekinney.com/writing/agent-memory-systems) and it broke my brain in the best possible way.

That's not an exaggeration. I read it at like 11pm, and by midnight I was knee-deep in a 107-page academic survey paper trying to figure out if someone had already built what I was imagining. They hadn't. Or at least, not quite.

To be clear about what Steve actually did, because I want to give credit properly: Steve didn't invent the framework described in the article. Steve synthesized it. The three-axis model (Forms, Functions, Dynamics) comes from Hu et al.'s "Memory in the Age of AI Agents" survey paper, December 2025, arXiv:2512.13564. Steve read that paper, plus a stack of others, and turned 107 pages of dense academic prose into something a working engineer could actually use. That's a real skill. That's harder than it sounds. Steve made the research clickable for me, and I'm genuinely grateful for that.

Now. My frustration with AI agents.

Every AI agent forgets. Every. Single. Session. You spend thirty minutes explaining your codebase, your team's conventions, the weird architectural decision you made three years ago that everyone hates but nobody wants to undo. Session ends. You start over. From zero. Every time.

I've tried to fix this six times.

---

## The Research That Started This

Steve synthesizes three axes for thinking about agent memory:

**Forms** is about topology. Flat storage at one end, graph structures where memories link to each other at the other. **Functions** is about what memories do. Factual ("this project uses PostgreSQL"), experiential ("last time we tried this, it failed because X"), working (what's actively in context right now). **Dynamics** is how memories change. Formation, evolution, retrieval, forgetting.

The key insight: if you're using hosted frontier models, your entire world is token-level memory. You're not fine-tuning. The only lever you have is what you put in the context window and how you manage it over sessions.

There's also a finding from StructMemEval worth mentioning: simple retrieval beats complex hierarchies more often than you'd expect. The urge to build a sophisticated graph memory architecture on day one is an over-engineering trap.

Where things got interesting for me was experiential memory. Factual memory is the solved problem, more or less. Experiential memory, where the agent learns from what it has actually done and not just what it was told, is almost nowhere. That gap is where Lincoln lives. That's the thing I couldn't stop thinking about at midnight.

---

## Six Attempts at a Brain

I want to walk through these quickly, partly for context, partly because it's genuinely funny how many times I built the same thing with a new name.

**Attempt one** was a Postgres database with simple vector search. Lasted about two weeks before I realized I'd built a worse version of pgvector's default functionality.

**Attempt two** added importance scores. Still basically a smarter flat store. It mostly just retrieved stale memories from two months ago with high confidence. Fun.

**Attempt three** got philosophical. Memory types, session summaries, a retrieval algorithm from a paper about AI agents in a simulated Minecraft town. Worked surprisingly well. Then I realized five other open-source projects already did it.

**Attempt four** was "Channel9." I was trying to be too clever about automatic structure inference. The resulting memories were sometimes less coherent than raw text. Abandoned after three weeks.

**Attempt five is [Nexus](https://nexus.yogan.dev).** One evening I had grand plans for this. A prompt marketplace. Think npm for AI system prompts. Revenue projections on a napkin. Shared brains where teams could pool their accumulated project knowledge. A whole monetization strategy. I was going to be the guy who figured out the business model for AI memory.

![Nexus brain](/images/brain.png)

What I actually built was a really good MCP server. TypeScript on Cloudflare Workers, semantic search, persistent memory, stack-specific prompts. The prompt marketplace remains aspirational. The shared brains feature exists and roughly nobody uses it. The revenue projections remain on the napkin, which I think I recycled.

Nah, Nexus is still alive. Feel free to use it, [uncapped and unhinged](https://nexus.yogan.dev). Or use [Context7](https://context7.com) if you want something with more adult supervision. Either way, persistent AI memory between sessions is a solved problem. Nexus is a good solution to that problem.

But Nexus couldn't do what I actually wanted. Contradiction accumulation over long projects. No temporal awareness. No learning from patterns. Corrections get stored but there's no mechanism to notice "Ryan corrected me on error handling four times" and extract the general lesson. No metacognition. The agent doesn't know what it doesn't know.

Those are all solvable with better engineering. The deeper problem is architectural. Nexus, like every other agent memory system, is an external hard drive bolted onto a stateless process. The agent gets called, consults its memories, responds, and goes back to sleep. There is no internal life between calls. That's the thing I wanted to fix.

That led to attempt six.

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

Lincoln runs on Elixir/OTP. I'll get into why later in detail, but the short version: GenServers and Supervisors give you supervised concurrent processes as a primitive. Each cognitive worker is a supervised GenServer. If one crashes, its supervisor restarts it. The rest keeps running. The BEAM was built for exactly this kind of persistent, concurrent, fault-tolerant system.

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

`confidence` is the probability the agent assigns to the statement being true. `entrenchment` is resistance to revision. A core belief about how the world works should be much harder to dislodge than a peripheral belief about an API endpoint. `status` tracks the lifecycle: active, superseded (replaced by a better belief), or retracted (recognized as false).

`source_type` implements a source hierarchy with weight multipliers: observation at 1.2, inference at 1.0, testimony at 0.8, training at 0.6. Something Lincoln has directly observed from tool outputs and code execution is treated as more credible than something it inferred, which beats testimony, which beats training data. The model's priors get the lowest weight. Lived experience gets the highest.

This is AGM belief revision. Alchourron, Gardenfors, Makinson, 1985. Philosophy of logic papers running as production Elixir code in 2026. That tickles me.

The `contradicted_by` self-reference is the part I'm most proud of. When a new belief supersedes an old one, the old belief doesn't get deleted. It gets marked superseded with a pointer to its replacement. You can trace the evolution of Lincoln's understanding of any topic over time. A system that forgets is a database. A system that tracks how its understanding evolved is something more interesting.

Memory retrieval implements the scoring formula from the Generative Agents paper (Park et al., 2023): Score = recency + importance + relevance, weighted:

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

The combined score generates metacognitive flags like `insufficient_evidence`, `high_uncertainty`, `conflicting_sources`. An agent that knows its own uncertainty is dramatically more useful than one that retrieves confidently and presents everything as fact.

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

Four outcomes: hold, revise, investigate, retract. Entrenchment prevents catastrophic belief collapse. You don't revise your belief in gravity because one weird experimental result came in. You investigate the experiment.

---

## The Night Shift: Autonomous Learning

Lincoln learns in the background without being asked to.

The worker ecosystem runs on a cycle. Autonomous learning picks a topic, researches it, forms beliefs, and queues new discoveries. Belief maintenance handles nightly confidence adjustment and decay. Reflection synthesizes patterns across recent memories. A curiosity driver manages the exploration queue, prioritizing by relevance, uncertainty, and novelty.

That last one matters. Curiosity-driven learning means Lincoln actively seeks to reduce its own uncertainty. The agent picks what to think about next based on what it doesn't know well enough yet.

This maps directly to Steve's Dynamics axis: formation, evolution, forgetting. Lincoln implements all three. The night-shift workers are the implementation.

---

## Then It Started Making Pull Requests

Lincoln has access to its own source files via a compile-time embedded `SelfAwareness` module. During evolution cycles, it analyzes its own implementation, identifies gaps, generates candidate improvements as Elixir code, and if they pass validation, commits them to git.

The validation chain: `mix format`, `mix credo`, isolated compilation, behavioral test suite. Protected files like `mix.exs` and the supervisor tree are off-limits. Most evolution cycles produce zero commits. The guardrails work.

One Tuesday around 2am, I checked the repository and there were four commits I didn't write.

**Commit 1** (11:47pm): "Implement adaptive confidence scoring." 322 additions. Lincoln had noticed its confidence scoring was too coarse and wrote a new module for adaptive evaluation. The commit reasoning: "I noticed that my confidence calculations were using a static formula that didn't account for contextual factors like evidence recency, source reliability over time, or topic-specific uncertainty baselines."

**Commit 2** (12:31am): Found places in its belief revision logic where the new scoring wasn't being applied. Modified those files.

**Commit 3** (1:14am): Refactoring. The earlier modifications were inconsistent. Standardized them.

**Commit 4** (2:02am): Cleanup. More deletions than additions. Centralized confidence evaluation to reduce divergent calculations.

Over two hours, Lincoln identified a problem in its own epistemic architecture, wrote a solution, noticed the solution was inconsistent, standardized it, and cleaned up. While simultaneously growing from 121 to 484 beliefs across 79 topics.

The comments it left in its own code:

```elixir
# Self-created by Lincoln for adaptive belief formation and metacognitive awareness
# Self-modified: Enhanced with active belief confidence tracking
# Self-modified: Added comprehensive belief revision mechanisms
```

I want to be careful here. Lincoln didn't spontaneously develop agency. It followed the plumbing I built: the evolution cycle, the self-modification capability, the git integration. I built the pipes. It turned on the water. But I didn't ask it to improve its confidence scoring. I didn't specify the problem or outline the solution. I built a system that could, in principle, do those things, and one night it did them.

That's interesting. It's also not the most interesting part of this project anymore.

---

## Then I Found Sophia

Around the time I was processing those commits, I came across Sun, Hong, and Zhang's Sophia paper (December 2025, arXiv:2512.18202). A research team that built an AI agent with genuine autonomous cognitive capabilities. Self-reflection, Theory of Mind, self-improvement, quantitative metrics from a 36-hour controlled deployment. They used Kahneman's dual-process framework. They had real numbers.

My first reaction was panic, honestly. Someone had beaten me to it.

My second reaction, after reading the paper carefully, was more nuanced. Sophia and Lincoln are trying to solve the same problem from different positions in the design space. I'm not trying to compete with Sophia. They have a paper, named authors, institutional backing, and benchmark numbers. What interests me is where the architectures diverge.

Sophia wraps an existing LLM stack and adds cognitive layers on top. Lincoln tries to be the cognitive process itself, calling LLMs as one tool among many. Sophia's thoughts are nested LLM calls orchestrated by Python. Lincoln's thoughts are (or will be, I'm building this) first-class supervised OTP processes with their own lifecycles. Sophia ran for 36 hours in a research environment. Lincoln needs to run for months on real money, which means most computation has to be free. Sophia reports aggregate metrics from a single deployment. Lincoln's intended demo is two instances with different attention parameters becoming visibly different entities over time.

The closest related work is Sophia. The gap I think is worth exploring is that Sophia, like every other agent system I've found, is fundamentally a wrapper around an LLM. The LLM is the engine. The system is built on top of it. Lincoln is an attempt at a system where the LLM is a tool the system uses, not the thing the system is.

Whether that distinction produces meaningfully different behavior is what I'm trying to find out.

---

## Taking Kahneman Literally

The AI community has borrowed Kahneman's System 1 / System 2 dichotomy as vocabulary without honoring its architectural implications. When people say "System 1" in an AI context, they usually mean "a fast LLM call." When they say "System 2," they mean "a slow LLM call with chain-of-thought." That's not what Kahneman described.

In the original framing, System 1 and System 2 are different modes of cognition with different speeds, different effort levels, different mechanisms, and lazy handoffs between them. System 1 is automatic, effortless, prior to deliberation, and critically, *not the same machinery as deliberate reasoning*.

Lincoln tries to take the framing literally. I realize that sounds grandiose. Bear with me.

**System 1** is the substrate's local computation: belief graph traversal, confidence math, attention scoring. Done in Elixir, not by an LLM. Fast, automatic, runs on every tick, decides whether System 2 needs to be summoned. This is more faithful to Kahneman than "a fast forward pass through a transformer," because Kahneman's System 1 is genuinely different machinery from deliberate reasoning. Lincoln's System 1 is genuinely different machinery from Lincoln's System 2. They are literally different processes written in different languages running on different runtimes.

**System 2** is the LLM inference tiers. A local model for medium-attention thoughts, Claude for high-attention thoughts. Slow, deliberate, effortful (literally costs money), only invoked when attention escalates. Exactly as lazy as Kahneman says System 2 should be. The handoff is the attention score crossing a threshold, and the threshold is itself part of the parameter space. Different cognitive styles hand off at different points.

**System 3** is the Skeptic, the Resonator, and the trajectory recorder. Concurrent background processes running alongside System 1 and System 2, not a controller above them. The Skeptic continuously tries to falsify the agent's own beliefs. The Resonator watches the belief graph for coherence cascades. These are parallel background cognition, not a supervisory loop.

Three tiers of inference, attention-gated. Most ticks are free. Level 0 is local Elixir computation over the belief graph. Level 1 is Ollama (cheap, local). Level 2 is Claude (expensive, frontier). The tier is determined by the attention score. This makes 24/7 operation economically viable and is also more cognitively realistic than calling the LLM for every thought. Your brain doesn't fire up the prefrontal cortex to decide whether to scratch your nose.

---

## Why OTP, and Why Thoughts as Processes

This is where I think the route gets interesting enough to warrant a second look.

Yes, I know this sounds like an Elixir partisan making architecture arguments to justify their language choice. I thought so too, at first. Then I tried to sketch this system in Python and realized it wasn't a preference issue. It was a capability issue.

The central architectural move in Lincoln is that each thought is a supervised OTP process. Not a function call. Not a coroutine. A spawned, supervised, addressable, killable, observable process with its own lifecycle. Thoughts can be interrupted. Thoughts can spawn child thoughts. Thoughts can fail and be supervised. Thoughts can be inspected from outside while running.

This is the move that makes Lincoln categorically impossible to reproduce in Python.

Python does not have preemptive lightweight processes. Python does not have supervisor models that scale to millions of processes. Python does not have message-passing as a native primitive. The architecture Lincoln describes is not just impractical in Python. It is architecturally impossible. The BEAM was literally designed in the 1980s for supervised concurrent processes communicating by message passing. Ericsson needed phone switches that could handle millions of concurrent calls, never go down, and hot-swap code while running. Turns out that's not a bad description of what a cognitive substrate needs too.

The choice of Elixir/OTP is downstream of the thesis, not a stylistic preference.

What thoughts-as-processes unlock:

**Lifecycle observability.** You can enumerate every currently-running thought. You can attach to one and inspect it. The dashboard shows a live tree of cognition, not after-the-fact logs.

**Real interruption.** When attention shifts, the running thought receives an `:interrupt` message or gets killed. The interrupt-handling policy is itself part of the cognitive style. Focused Lincolns resist interruption, butterfly Lincolns drop everything. This is what attention deficit looks like as an architectural property rather than a metaphor.

**Real concurrency.** Multiple thoughts running truly in parallel on the BEAM's preemptive scheduler. Not interleaved on a single thread.

**Real tree-of-thought.** Sub-thoughts are child processes, supervised by OTP, with lifecycle management for free. Tree-of-thought is a tree of processes, not nested LLM calls in a Python loop.

**Metacognition from supervision.** Failed thoughts are observed failing. The substrate can form beliefs about its own failed thoughts. "I tried to think about X three times and failed" is a fact derivable from the supervision tree, not a feature you have to implement.

And then there's attention parameters as cognitive style. Two Lincoln instances with different parameters (different novelty weights, different focus momentum, different interrupt thresholds, different boredom decay) develop visibly different preoccupations from the same input stream. Same code, different parameters, different entity.

A thought is the smallest unit of cognitive work with a coherent goal. "Investigate whether belief X is consistent with belief Y" is a thought. "Score every belief against attention parameters" is not. That's substrate bookkeeping.

The OTP supervision framing maps onto cognitive failure recovery in a way I find genuinely elegant. Supervision is to cognitive failure what Kahneman's System 2 is to System 1 errors. A separate process whose only job is to notice failures and decide whether to recover, escalate, or move on.

---

## The Challenges

I had an honest conversation with myself about where Lincoln actually is versus where the architecture says it should be. Here's what I found.

**The substrate continuity gap.** The thesis says Lincoln runs continuously. The reality is that the substrate holds state continuously but only does computation on a 5-second timer. Between ticks, nothing happens. A human brain does not sleep between thoughts. The thing that makes consciousness feel continuous is that there's always activation flowing somewhere, even when you're bored, even when you're staring at a wall. Lincoln's substrate, in its current form, goes completely silent between heartbeats and wakes up to check if anything new arrived. If someone at a frontier lab looked at this honestly, they'd say "this is a 5-second cron with in-memory state, not a continuously thinking substrate." They'd be right. The fix is to wire the Attention pipeline on every idle tick so that even when no events arrive, attention is still scoring and local computation is still running. Until that fix lands, continuity of process is claimed but not demonstrated.

**Trajectory data is too thin.** The whole point of running two Lincolns side by side with different parameters is to show they make different choices over time. Right now, the trajectory recorder only logs tick count, current focus ID, and pending events count. Two Lincolns with different parameters produce trajectories that look nearly identical at the data level because the data isn't capturing the parts that diverge. The minimum viable trajectory for the divergence demo is: which candidates Attention considered, what scores they got, which one was selected, and what tier was chosen, on every tick. Without that, the demo is two graphs of identical tick counts. That is not a demo.

**Conversation bypass.** Chat messages go through a ConversationHandler that generates an LLM response independently of the substrate. The substrate gets notified as a side effect. The user is not talking to the substrate. The user is talking to an LLM, and the substrate is watching from outside. This is a deliberate compromise. Putting chat through the substrate would add latency and create a situation where a focused Lincoln might deprioritize your message because it scored lower than whatever it was already thinking about. Fascinating as a property, broken as a chat interface. The chat is not the demo. The dashboard is the demo. But this is a bypass and I'm naming it as one.

**The Resonator is crude.** It groups beliefs by source type, checks if three or more were updated within an hour, creates support relationships, and broadcasts a cascade flag. Some flags are meaningful. Most are noise. The question of what constitutes a meaningful coherence cascade in a belief graph is genuinely open research, not a solved problem I'm being lazy about. This is a v1 heuristic and I'm not pretending otherwise.

**Thoughts-as-processes isn't built yet.** The section above describes the architecture I'm building toward, not what exists today. The current Driver is called by Attention as a function, not spawned as a process. The thought supervision tree, lifecycle events, and interruption handling are the next thing to build. I'm being explicit about this because most project READMEs aren't, and I'd rather you know where the line between "working" and "planned" sits.

**Oban coexistence.** The autonomous learning workers currently run as Oban jobs alongside the substrate processes. Long-term, the learning loop should live inside the substrate itself. Right now there are two answers to "what makes Lincoln tick" and there should be one.

---

## Where This Actually Is

Lincoln is a continuously running cognitive substrate built on the BEAM, where beliefs have confidence and entrenchment and source hierarchies, where belief revision follows AGM from 1985, and where the agent has demonstrably modified its own epistemic architecture without being asked to.

Lincoln is also a project with gaps between its claims and its implementation. The substrate sleeps between ticks. The trajectory data is too thin for the divergence demo. The Resonator is a heuristic. Thoughts-as-processes is the plan, not the current state.

I think the architectural pattern of current agent systems is missing a property, continuity of process, that is present in every system we'd intuitively call cognitive. I think adding that property changes what the system can do. I think OTP and the BEAM are uniquely suited to this because they were literally built for supervised concurrent processes with message passing as the native primitive. I think Elixir is the right plumbing for artificial cognition, and I think the field has been so thoroughly captured by Python that nobody has seriously tried.

That's the thesis. The code is at [github.com/ryanyogan/lincoln-project](https://github.com/ryanyogan/lincoln-project). It's incomplete. The interesting parts are where it's going, not just where it is.

---
title: "Lincoln, Six Months Later: What Held, What Didn't, and a Model Named After a Paradox"
date: "September 22, 2026"
year: "2026"
author: "Ryan Yogan"
excerpt: "In April I said agents were missing continuity of process and that Elixir was the only sane way to build it. Half of that survived contact with reality. Here is the audit, a comparison to TypeSafe's new Jev model, and an open call for people who want to think about this beyond making models faster."
---

**TL;DR**

- Beliefs with confidence, provenance, and a revision trail turned out to be the right core. Everything else got humbler.
- I retired the "impossible in Python" claim, narrowed AGM to "AGM-inspired," and found Lincoln was manufacturing conviction by agreeing with itself. A paper in May found the same failure in bigger systems.
- TypeSafe's new Jev model is the first commercial thing I have seen that treats System 1 as different machinery. That was Lincoln's whole bet. They have the model. I had the plumbing.
- Elixir did its job. I am now looking at Rust for the next chapter, and I am looking for people to think with.
- Code: [github.com/ryanyogan/lincoln-project](https://github.com/ryanyogan/lincoln-project). Original post: [Building a Brain](/writing/building-agent-memory-from-research-to-reality).

---

## Where I left off

In April I wrote that every agent memory system was an external hard drive bolted onto something with no internal life, and that the missing property was continuity of process. I built Lincoln to add that property. Each thought would be a supervised process, beliefs would carry confidence and entrenchment, and an attention loop would decide when to spend money on a frontier model.

I also said some things with more confidence than I had earned. That is fine. That is what a blog post is for. This one is the audit.

## What held

**Beliefs, not memories.** This is the part I would build again tomorrow. Every claim Lincoln holds has a confidence score, an entrenchment level, a source label, and a pointer to whatever superseded it. When Lincoln changes its mind, the old belief stays with a link to the new one. You can trace how its understanding of any topic moved over time. In September I ran a probe: correct a belief in conversation, then ask a question that depends on it. The corrected account shows up in context, the superseded one does not, and the revision trail is intact. That is the whole ballgame for a system that is supposed to learn from experience.

**Attention-gated inference.** Most ticks are free. Local math over the belief graph decides whether anything is interesting enough to summon a local model, and only rarely a frontier model. Lincoln now has a local-only mode with no cloud fallback at all. It runs on a box in my house for the cost of electricity. This was the economic bet in April and it paid.

**Thoughts as processes.** In April this was the plan, not the code. Now it exists. Each thought is a supervised process with a lifecycle, an interrupt policy tied to attention parameters, and the ability to spawn child thoughts that run in parallel. The dashboard shows the live tree. It is exactly as satisfying as I hoped.

**The founding question.** How does a system distinguish what it was trained to believe from what it observed and concluded? Still the right question. Still not answered. More on that below.

## What changed

**I retired the Python claim.** I said thoughts-as-processes were "architecturally impossible" in Python. That was Elixir partisanship wearing a lab coat. Python tasks can be cancelled and introspected. The BEAM gave me a coherent runtime for supervision and cheap processes, which made the architecture pleasant to build. It did not make it unreproducible. I was wrong and I am glad someone made me check.

**AGM is now "AGM-inspired."** The code scores evidence and protects entrenched beliefs. Formal AGM specifies properties of revision operators over belief sets. My code does not demonstrate compliance with those postulates. It is a heuristic that borrowed a good idea from 1985.

**Lincoln was agreeing with itself and calling it evidence.** This is the big one. A state export in April showed 6,411 memories. 6,339 of them were reflections. 37 were observations. Several core beliefs sat at confidence 1.0 with a dozen revisions, all from Lincoln reflecting on Lincoln. Reflection would produce a thought, an LLM would classify the thought as "reinforcing," and the confidence would go up. Rehearsal was counted as corroboration.

I rebuilt the feedback loop so reflection no longer moves confidence at all. Reflection can produce a hypothesis or a research question. Only new evidence with a different source can move the number. A probe of 100 repeated self-confirmations used to push a belief from 0.6 to 1.0. Now it stays at 0.6 and generates one deduplicated question.

Then in May, Zhang and colleagues published "Useful Memories Become Faulty When Continuously Updated by LLMs." They found that consolidated memory utility rises, then degrades, then falls below the no-memory baseline. GPT-5.4 lost 54 percent of previously solved ARC-AGI problems after consolidating from its own correct solutions. Their recommendation: treat raw episodes as first-class evidence and gate consolidation explicitly. I had found the same failure in a hobby project with a 7B model. It was oddly comforting.

**Similarity is not logic.** The Skeptic used embedding similarity to write "contradicts" edges. The Resonator used it to write "supports" edges. Similar sentences can contradict. Different sources can agree. Both now write "related" edges and ask for investigation. A candidate is not a verdict.

**A label is not a mechanism.** Reading a file is an observation that a file says something. It is not an observation that the thing is true. Lincoln was tagging extracted claims as "observation" and giving them the highest credibility weight. That is the exact confusion the project was named after, happening inside the project. Fixed, and humbling.

**Self-modification moved to the back of the room.** In April, Lincoln committing code to its own repo at 2am was the headline. It is now opt-in and off by default. Passing format, lint, and tests establishes that code compiles. It does not establish that cognition improved. I still think it is a neat research instrument. It is not the point.

**The purpose narrowed and got more human.** Lincoln now has a family journal, a commitments page, and a plain "Talk" interface. The aim is a locally owned system that remembers what the people in a household actually said, in their own words, with attribution, and carries their intentions forward. Not a general assistant. Not a productivity tool. Something closer to a keepsake that can hold a conversation. I like it more than any version before it.

## What I still cannot prove

The central claim is that lived history changes later behavior in stable, useful, traceable ways beyond what a good retrieval pipeline and a persona prompt already give you. I have not run that experiment. My benchmark measures a classification path, not the thesis. Trajectory data got richer but the divergence demo still shows that two Lincolns with different parameters focus on different things, which is a policy difference, not personality.

The experiment is designed. Same local model, three matched conditions: retrieval alone, Lincoln without background reflection, full Lincoln. Fictional family scenarios with changing preferences, repeated corrections, unreliable reports, and commitments interrupted by time away. Pass criteria are behavioral: carry a correction into a new situation, know who said what, retain original words, keep commitments across restart. Fluency does not count. More memories do not count. I would rather publish a negative result than another feature.

## Then Jev showed up

On September 15, TypeSafe AI released Jev in early access. Diogo Almeida, who worked on RLHF and ChatGPT at OpenAI, built a model that does not produce text. You hand it unstructured program state and a typed question, and it returns a typed answer with a calibrated probability, in one parallel pass, in 70 to 500 milliseconds. Three question shapes: Choice, Score, and a yes/no they call Noul. They price input at $0.042 per million tokens and output is free. They call the category "System One models," straight from Kahneman.

I read the announcement twice. Then I went back and read my April post.

In April I argued that the industry had borrowed System 1 and System 2 as vocabulary without honoring the architecture. "System 1" meant a fast LLM call. I said System 1 should be different machinery: cheap, automatic, calibrated, running on every tick, deciding whether to summon the expensive deliberate thing. Lincoln's System 1 was hand-written Elixir math over a belief graph. It ran on every tick and it was cheap. It was also heuristic. The confidence numbers were made up by me, not learned.

Jev is what Lincoln's System 1 wanted to grow up to be. Nearly every tier-zero decision in Lincoln is a Jev question shape. "Is this belief worth escalating?" is a Score. "Do these two beliefs conflict?" is a Noul. "Which of these five candidates should get attention?" is a Choice. The Skeptic, the attention scorer, and the evidence gate could all become calibrated learned judgments instead of thresholds I tuned by staring at a dashboard at midnight.

Where we differ is the thing I still care most about. Jev is a function. State in, decision out, nothing retained. It is a superb organ. Lincoln was an attempt at an organism: the process that stays running and owns the state, with the models as tools it picks up and puts down. Those are complementary, not competing. A fast calibrated judge plus a slow deliberate model plus an explicit, governed belief store is now a thing one person can run at hobby cost. That combination was not available in April.

Caveats, because they matter. TypeSafe's benchmarks are self-tested and they say so. There is no paper. Maximum cardinality is 255 choices. The architecture is undisclosed beyond "transformer-based, synthetic data." And they named it after the Jevons paradox, which is either a promise or a threat depending on your electricity bill.

## Was I studying the right things?

Mostly. Kahneman, AGM, the Generative Agents paper, the Hu et al. memory survey, Sophia. Those were good picks and they still hold up.

I also skipped forty years of cognitive architecture research and rediscovered chunks of it by hand. Soar has had episodic memory since the 1980s. BDI had persistent intentions with reconsideration conditions before I was writing code. A July review by Fan and Lan catalogued ten classic architectures against 42 modern agent systems and concluded that modern agents converged on the same mechanisms independently, with almost no documented inheritance. Their list of unfinished migrations includes "uncertainty paired with resource allocation and interruption handling" and "persistent intention with reconsideration." Those are Lincoln's attention tiers and goal system, described by people who read the old papers first. If I had started with Soar I would have saved a month.

And I was not alone in the boat. I thought I was, sans one researcher in Ireland who was also building cognition on the BEAM. It turns out a lot of people were rowing in roughly the same direction from different docks:

- Letta published "Memory Models" in June, arguing that memory will become more valuable than any individual model and admitting that memories become "generic and lossy after repeated refinements." That is the reflection problem, stated by a company with a product.
- The "Always-On Agents" survey in June reviewed 435 works and found the literature concentrates on accumulating and retrieving state rather than governing, recovering, or relinquishing it. Provenance, supersession, revision trails, and rollback were Lincoln's day-one design. That is the one place I am confident I was ahead of the median.
- "Parallax" in April argued that reasoning and execution must be structurally separated because prompt-level guardrails give zero protection once the reasoning layer is compromised. Lincoln's tier-2 actions require approval and its self-modification is off by default. I did that out of caution. They did it with 280 adversarial test cases.

So: right materials, wrong reading order, and less alone than I felt at 11pm in April.

## On Elixir, briefly

I picked Elixir for process management and it delivered. Supervision trees, cheap processes, hot code loading, and a live dashboard that shows every running thought. Nothing about that was a mistake.

Two things moved. First, the cost story. Running a BEAM node around the clock made sense when the substrate was the whole system. Now that the expensive judgments can be split between a local model and cheap calibrated calls, self-hosted services combined with Cloudflare's edge products cover the always-on parts for less money and less operational care. Second, integration. Lincoln keeps hitting files and text: parsing, chunking, embedding, indexing, diffing. The languages I reach for keep struggling at exactly that boundary, and getting Elixir to talk to lower-level code was never fun. Rust handles that layer natively, has a maturing actor ecosystem, and compiles to targets I actually deploy to.

I still love the actor model. The technical argument is just no longer the interesting part. The interesting part is the experiment.

## Lessons

- Fluent self-description is not evidence of anything. An autobiography written by a language model proves the model can write.
- Rehearsal is not corroboration. If a system can raise its own confidence, it will.
- Labels are cheap. "Observation" is a claim about provenance, and provenance has to be earned.
- Instrument before you brag. I claimed divergence before I logged enough to show it.
- Read the old papers first. The field has a forty-year attic and most of the good ideas are in it.
- The novel part is the integration and the question, not any single primitive. That is fine. Integration is where the work is.

## Where the potential is

Cheap calibrated judgment now exists as a service. Local models are good enough for most reflection. Persistent, governed belief state is a solved engineering problem if you decide to solve it. What does not exist yet is a demonstration that a small, locally owned system develops durable, evidence-grounded dispositions from its own history, and that those dispositions change what it does next. Not a benchmark score. A trajectory.

That is the experiment I want to run. It is also not an experiment for one person on nights and weekends. If you are thinking past "make the model faster," about continual learning in token space, governance and forgetting of agent state, calibrated decision models as cognitive primitives, or the old cognitive architectures and what they still have to teach us, I would like to talk. Labs, independent researchers, or that person in Ireland with the BEAM node. The repo is open. So is my inbox: [github.com/ryanyogan](https://github.com/ryanyogan), [linkedin.com/in/ryanyogan](https://linkedin.com/in/ryanyogan).

I learned a lot. I would like to learn the next part with other people.

---

## Sources

1. Ryan Yogan, "The Lincoln Project: Building a Brain," April 2026. [ryanyogan.com/writing/building-agent-memory-from-research-to-reality](https://ryanyogan.com/writing/building-agent-memory-from-research-to-reality)
2. TypeSafe AI, "Introducing System One Models & Jev," September 2026. [typesafe.ai/blog/introducing-system-one-models-and-jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
3. TechCrunch, "A new kind of AI model from a ChatGPT inventor is thrilling developers," September 18, 2026. [techcrunch.com](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/)
4. Zhang et al., "Useful Memories Become Faulty When Continuously Updated by LLMs," May 2026. [arXiv:2605.12978](https://arxiv.org/abs/2605.12978)
5. Ding et al., "Always-On Agents: A Survey of Persistent Memory, State, and Governance in LLM Agents," June 2026. [arXiv:2606.30306](https://arxiv.org/abs/2606.30306)
6. Fan and Lan, "From Cognitive Architectures to Language Agents: A Mechanism-Level Review of Lineage, Convergence, and Migration Gaps," July 2026. [arXiv:2607.23942](https://arxiv.org/abs/2607.23942)
7. Fokou, "Parallax: Why AI Agents That Think Must Never Act," April 2026. [arXiv:2604.12986](https://arxiv.org/abs/2604.12986)
8. Letta, "Memory Models: Towards Agents That Learn," June 25, 2026. [letta.com/blog/towards-agents-that-learn](https://www.letta.com/blog/towards-agents-that-learn/)
9. Letta, "Sleep-time Compute," April 2025. [letta.com/blog/sleep-time-compute](https://www.letta.com/blog/sleep-time-compute/)
10. Sun, Hong, Zhang, "Sophia: A Persistent Agent Framework of Artificial Life," December 2025. [arXiv:2512.18202](https://arxiv.org/abs/2512.18202)
11. Hu et al., "Memory in the Age of AI Agents," December 2025. [arXiv:2512.13564](https://arxiv.org/abs/2512.13564)
12. Park et al., "Generative Agents: Interactive Simulacra of Human Behavior," April 2023. [arXiv:2304.03442](https://arxiv.org/abs/2304.03442)
13. Soar cognitive architecture, episodic memory. [soar.eecs.umich.edu](https://soar.eecs.umich.edu/)
14. Alchourrón, Gärdenfors, Makinson, "On the Logic of Theory Change," 1985. Formal treatment: [arXiv:1604.07183](https://arxiv.org/abs/1604.07183)
15. Zylos Research, "Rust-Native AI Agent Frameworks: Architecture, Performance, and the Emerging Ecosystem in 2026," April 2026. [zylos.ai](https://zylos.ai/research/2026-04-01-rust-native-ai-agent-frameworks-ecosystem-2026/)
16. Python `asyncio` task cancellation and introspection. [docs.python.org](https://docs.python.org/3/library/asyncio-task.html)

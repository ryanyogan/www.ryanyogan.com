---
title: "Lincoln"
summary: "Continuously running cognitive substrate with a belief store"
tagline: "A continuously running cognitive substrate on Elixir/OTP: supervised processes that keep thinking whether or not anyone is chatting, a belief store with confidence, provenance and revision history, and attention scoring that decides what gets thought about."
tech:
  - Elixir
  - OTP
  - Phoenix LiveView
  - PostgreSQL
  - pgvector
github: "https://github.com/ryanyogan/lincoln-project"
year: "2026"
featured: true
group: agents-memory
status: running
statusLabel: "Running locally"
order: 1
---

Lincoln is not an agent that gets called. It is a process that exists.

## What Lincoln Is

A cognitive substrate built on the BEAM where beliefs replace flat memories, each thought is a first-class supervised OTP process, and the LLM is a tool the system uses rather than the thing the system is. Lincoln runs continuously whether or not anyone is talking to it, forms beliefs from observation, tracks confidence in those beliefs, and revises them when evidence demands it.

## The Architecture

**Beliefs, not memories.** Every piece of knowledge has confidence (0.0-1.0), entrenchment (resistance to revision), source type (observation, inference, testimony, training), and status tracking. Every revision keeps its provenance and history. Revision is AGM-inspired: a heuristic that scores evidence and protects entrenched beliefs, not a demonstration of the formal AGM postulates.

**Three-tier inference, attention-gated.** Most ticks are free. Level 0 is local Elixir computation over the belief graph, with no model call. Level 1 is a local model through Ollama. Level 2 is Claude. The tier is determined by the attention score, making 24/7 operation economically viable.

**Kahneman taken literally.** System 1 is local Elixir computation (fast, automatic, not an LLM). System 2 is LLM inference (slow, deliberate, costs money, only invoked when attention escalates). System 3 is the Skeptic and Resonator running as parallel background processes.

**Thoughts as supervised OTP processes.** Each thought is a spawned, supervised, addressable, killable, observable process with its own lifecycle. Thoughts can be interrupted, spawn child thoughts, fail and be supervised. The BEAM makes this a native primitive rather than something bolted on; it is not unreproducible elsewhere. See [the six-month follow-up](/writing/lincoln-six-months-later) for what changed.

**Attention parameters as policy.** Two Lincoln instances with different parameters focus on different things from the same input stream. That is a policy difference. I have not shown that it amounts to personality.

**Memory and MCP.** Memory lives in PostgreSQL with pgvector. Lincoln is both an MCP server and an MCP client.

## The Audit

Six months in I audited my own claims. 98.9% of Lincoln's memories were self-reflections: the system was agreeing with itself and counting it as evidence. I rebuilt the feedback loop so reflection no longer moves confidence, and published the retraction in [Lincoln, Six Months Later](/writing/lincoln-six-months-later).

> Rehearsal is not corroboration. If a system can raise its own confidence, it will.

## Self-Modification, Off by Default

Lincoln has access to its own source files and can analyze its implementation, generate candidate changes, and commit them to git after passing validation (format, lint, compilation, behavioral tests). This is opt-in and off by default. Passing those checks establishes that the code compiles and the tests pass. It does not establish that cognition improved.

## Status

A research system. It runs locally as three supervised processes.

## Prior Art

The closest related work is Sophia (Sun, Hong, Zhang, December 2025). The key architectural difference: Sophia wraps an LLM stack and adds cognitive layers on top. Lincoln tries to be the cognitive process itself. Sophia's thoughts are nested LLM calls. Lincoln's thoughts are supervised OTP processes with lifecycles, interruption, and real concurrency.

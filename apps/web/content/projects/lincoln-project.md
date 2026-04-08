---
title: "Lincoln Project"
tagline: "A continuously running cognitive substrate built on Elixir/OTP where each thought is a supervised process, beliefs have confidence and entrenchment, and attention parameters create cognitive style."
tech:
  - Elixir
  - OTP
  - Phoenix LiveView
  - PostgreSQL
  - pgvector
github: "https://github.com/ryanyogan/lincoln-project"
year: "2026"
featured: true
---

Lincoln is not an agent that gets called. It is a process that exists.

## What Lincoln Is

A cognitive substrate built on the BEAM where beliefs replace flat memories, each thought is a first-class supervised OTP process, and the LLM is a tool the system uses rather than the thing the system is. Lincoln runs continuously whether or not anyone is talking to it, forms beliefs from observation, tracks confidence in those beliefs, and revises them when evidence demands it.

## The Architecture

**Beliefs, not memories.** Every piece of knowledge has confidence (0.0-1.0), entrenchment (resistance to revision), source type (observation, inference, testimony, training), and status tracking. Belief revision follows the AGM framework from 1985 philosophy of logic.

**Three-tier inference, attention-gated.** Most ticks are free. Level 0 is local Elixir computation over the belief graph. Level 1 is Ollama (cheap, local). Level 2 is Claude (expensive, frontier). The tier is determined by the attention score, making 24/7 operation economically viable.

**Kahneman taken literally.** System 1 is local Elixir computation (fast, automatic, not an LLM). System 2 is LLM inference (slow, deliberate, costs money, only invoked when attention escalates). System 3 is the Skeptic and Resonator running as parallel background processes.

**Thoughts as supervised OTP processes.** Each thought is a spawned, supervised, addressable, killable, observable process with its own lifecycle. Thoughts can be interrupted, spawn child thoughts, fail and be supervised. This is architecturally impossible in Python.

**Attention parameters as personality.** Two Lincoln instances with different parameters develop visibly different preoccupations from the same input stream. Same code, different parameters, different entity.

## Autonomous Self-Modification

Lincoln has access to its own source files and can analyze its implementation, identify gaps, generate candidate improvements, and commit them to git after passing validation (format, lint, compilation, behavioral tests). One night it made four commits improving its own confidence scoring without being asked to.

## Prior Art

The closest related work is Sophia (Sun, Hong, Zhang, December 2025). The key architectural difference: Sophia wraps an LLM stack and adds cognitive layers on top. Lincoln tries to be the cognitive process itself. Sophia's thoughts are nested LLM calls. Lincoln's thoughts are supervised OTP processes with lifecycles, interruption, and real concurrency.

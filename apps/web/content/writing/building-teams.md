---
title: "Building engineering teams from scratch"
date: "January 15, 2024"
year: "2024"
author: "Ryan Yogan"
excerpt: "Lessons from scaling engineering organizations from 0 to 65+."
---

The first hire sets the culture. The first five hires set the pace. After scaling Procore's UI organization from 8 to 65+ engineers, here's what I learned about building engineering teams from zero.

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

After 700+ interviews and 50+ hires, the pattern is clear: great teams are built on trust, clarity, and relentless investment in the people doing the work. Hire for curiosity, empathy, and communication skills alongside technical ability. The best engineers I've ever worked with weren't the ones who could solve the hardest algorithm problems — they were the ones who could explain their thinking, listen to feedback, and make everyone around them better.

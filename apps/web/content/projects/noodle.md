---
title: "Noodle"
summary: "Household budgeting for a family of four"
tagline: "Household budgeting for my family of four: a plan for each month, and both parents see the same numbers. TanStack Start on Cloudflare Workers, built with agent-driven development."
tech:
  - TanStack Start
  - Cloudflare Workers
  - D1
  - Drizzle
  - Clerk
github: "https://github.com/ryanyogan/noodle"
live: "https://noodle.yogan.dev"
year: "2026"
group: for-people-i-know
status: live
order: 2
---

Noodle is the budget app for my household: two parents, two kids. Once a month we decide where the take-home pay goes, and after that both of us see the same numbers, on a phone or at a desk.

It is live at [noodle.yogan.dev](https://noodle.yogan.dev). The app sits behind a sign-in, because it is for my family. The source is public.

## How It Is Built

- A TanStack Start app on Cloudflare Workers, with D1 for data and Clerk for sign-in
- The money math lives in its own package with no I/O, so it can be tested on its own
- A Drizzle schema with queries scoped to the household
- Unit tests, and a Playwright suite that runs against a local Worker and a local D1
- CI deploys on a push to `main` once the checks pass

## How It Was Made

With agent-driven development. The first week, September 28 to October 4, 2026, was more than 500 commits and 34 architecture decision records.

My other household app is still private. It is described under [Family apps](/projects/family-apps).

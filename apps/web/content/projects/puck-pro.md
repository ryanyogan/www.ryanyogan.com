---
title: "Puck Pro"
summary: "Pose detection and vision-model feedback on my kids' hockey shots"
tagline: "A prototype: in-browser pose detection plus vision-model feedback on my kids' hockey shots. Built so my kids can get feedback between sessions with a coach."
tech:
  - Elixir
  - Phoenix LiveView
  - MediaPipe
  - Claude Vision
  - Cloudflare R2
github: "https://github.com/ryanyogan/puck_pro"
year: "2026"
featured: true
group: for-people-i-know
status: prototype
order: 4
---

A prototype hockey training app with real-time pose detection. It uses MediaPipe in the browser to detect shots, and a vision model for coaching feedback afterwards.

## Pose Detection in the Browser

MediaPipe's Pose Landmarker runs in the browser, tracking 33 body landmarks at 30fps with no server round-trip. For hockey, the code reads the wrists, elbows, shoulders, hips and knees. Stick position is estimated from the hands.

## Shot Detection

The core challenge: distinguishing a real shot from a kid waving their stick around. A shot only counts when wrist velocity stays above a threshold for four consecutive frames and the estimated stick is moving too. The detector follows whichever wrist is faster, so it works for left and right-handed shooters.

## Claude Vision Integration

After a session, selected video frames are sent to Claude Vision for analysis. The prompts are hockey-specific and written for the player's age: encouraging, simple language, what went well first.

## Progress

The data model has XP and levels, a practice-day streak, and achievements. The prototype seeds sixteen achievements.

## Where It Could Go

The long-term idea is to project coaching cues onto the ice during practice. The browser version is the first step.

## Status

A prototype. The repo has two commits and it is not deployed.

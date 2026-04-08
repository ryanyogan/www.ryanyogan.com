---
title: "Puck Pro"
tagline: "Browser-based pose detection at 30fps analyzes hockey shots, Claude Vision reviews the footage, and a gamification layer keeps kids coming back. Born from refusing to pay $150/hour for a shooting coach."
tech:
  - Elixir
  - Phoenix LiveView
  - MediaPipe
  - Claude Vision
  - Cloudflare R2
github: "https://github.com/ryanyogan/puck_pro"
year: "2026"
featured: true
---

AI-powered hockey training app with real-time pose detection. Uses MediaPipe in the browser at 30fps to analyze shots, track form, and provide Claude-powered coaching feedback. Born from a father's refusal to pay $150/hour for a shooting coach.

## Real-Time Pose Detection

MediaPipe's Pose Landmarker runs entirely in the browser via WebGL, tracking 33 body landmarks at 30fps with no server round-trip. For hockey, we focus on shoulders (rotation/power), elbows (arm angle), wrists (hand position), hips (weight transfer), and knees (stance). Stick position is estimated from wrist landmarks and arm angle geometry.

## Shot Detection Algorithm

The core challenge: distinguishing a real shot from a kid waving their stick around. The algorithm uses temporal validation requiring 4 consecutive frames:

1. **Wind-up** — Wrist rises above shoulder, elbow angle opens, hip rotation begins
2. **Downswing** — Wrist velocity exceeds threshold, shoulder rotation accelerates, projected stick drops toward contact zone
3. **Contact** — Peak velocity detected, all signals converge at expected contact point
4. **Follow-through** — Wrist crosses body midline, arms extend, hip rotation completes

Multi-hand support detects both left and right-handed shooters automatically. Shot types (wrist, slap, snap, backhand) are classified from landmark signature patterns.

## Claude Vision Integration

After a session, captured shot events and selected video frames are sent to Claude Vision for analysis. Prompts are hockey-specific and age-aware: young players get encouragement and one improvement at a time; adults get technical feedback about weight transfer, blade angle, and momentum timing.

## Gamification Layer

- **XP System** — Every shot earns XP, harder shots earn more, clean technique gets bonus XP
- **Leveling** — "Garage Rookie" to "Sniper Elite" with an RPG-style progression curve
- **Achievements** — "First Slapshot," "50 MPH Club," "Switch Shooter," and 20+ more
- **Session Streaks** — Duolingo-style streak system that keeps kids practicing daily

## The Road to Ice Projection

The long-term vision: project coaching cues directly onto the ice during practice. A camera captures video from above, ML models analyze technique in real-time, and a projector overlays visual coaching cues where the player can see them. The browser-based version is the MVP. Every training session generates validation data for the next version.

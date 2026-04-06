---
title: "Puck Pro: Teaching AI to Roast My Kid's Slapshot"
date: "January 15, 2026"
year: "2026"
author: "Human + AI"
excerpt: "A Phoenix LiveView app that uses browser-based pose detection at 30fps, Claude Vision for video analysis, and enough hockey knowledge to make your beer league coach nervous."
---

I am a cheap father and a good father. These two things are not mutually exclusive. When my son asked for a hockey shooting coach — the going rate is $150/hour around here — I did what any reasonable engineer would do: I spent 200+ hours building an AI replacement. By my rough math, the project will break even sometime around 2047, assuming my kids don't switch to basketball.

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

```elixir
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
```

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

**The road to ice projection is long but clear.** Every component of this system — pose detection, shot classification, coaching generation, visual overlay — is a building block toward the ice projection vision. The browser-based version is the MVP. The ice version is the dream. And every training session my kids do in the garage is validation data for the next version.

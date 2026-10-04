---
title: "Upstream Omarchy patches"
summary: "Performance patches to Omarchy: two landed, two open"
tagline: "Measured performance fixes I sent to Omarchy. Two landed upstream with credit; two more are open."
tech:
  - Omarchy
  - QML
  - Quickshell
live: "https://github.com/omacom/omarchy"
year: "2026"
group: desktop-tools
status: live
statusLabel: "2 landed, 2 open"
order: 4
---

This one is not a repo of mine. It is a set of pull requests to [Omarchy](https://github.com/omacom/omarchy), the Linux setup I run. Each one starts with a measurement.

## Landed

**Decode the wallpaper at screen size instead of shipped size** ([#8324](https://github.com/omacom/omarchy/pull/8324)). The shell decoded every wallpaper at the resolution the file shipped at, and held up to three of them during a transition. I bound the decode to the screen's physical size, and kept wallpapers smaller than the screen at their own size. On my 5K screen the shell went from about 434 MB to about 364 MB at rest, and from 682 MB to 498 MB at the peak of a transition. The maintainer ported it onto the current background code in [#13408](https://github.com/omacom/omarchy/pull/13408), in a commit that carries a co-author credit for me.

**Index Claude transcripts so the agents refresh reads only what was appended** ([#8313](https://github.com/omacom/omarchy/pull/8313)). The agent usage widget re-parsed every line of every transcript on each refresh. After a month on my machine that was 803 files and 640 MB, about one core-second every fifteen minutes. A per-file index took a refresh from 1.0 s of CPU to 0.10 s. It was brought in under my authorship, with adaptations, in [#14049](https://github.com/omacom/omarchy/pull/14049).

## Open

**Stop re-sampling the wallpaper for the transparent bar on unrelated state writes** ([#8307](https://github.com/omacom/omarchy/pull/8307)). The bar re-sampled the wallpaper whenever anything was written into the state directory. The fix only refreshes when the background actually changed, and the sample itself went from 2.58 s to 0.065 s.

**Fix Dropbox panel pause/resume snapping back to the wrong state** ([#8383](https://github.com/omacom/omarchy/pull/8383)). The switch read a stale state while the daemon was still exiting. The fix adds a quick status poll that skips the folder walk: 5.3 s down to 0.09 s on a folder of 468,000 files.

The numbers are from my own machines, as written in each pull request.

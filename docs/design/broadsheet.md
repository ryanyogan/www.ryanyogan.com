# Broadsheet — design spec for ryanyogan.com

The site is a newspaper front page: a centered serif masthead, a section-index nav between
rules, a lead story with a drop cap across ruled columns, a "By the numbers" box, three ruled
columns, classifieds, a colophon. Day and Night editions. It is the sister of Yogan Hockey's
"Agate" look — same type pairing, same newsprint palette logic — so the two sites read as one
family.

Source of truth for the look: the Design canvas, artboards **A · Broadsheet — Day / Night** (1280)
and **A · Phone — Day / Night** (390). `prototypes/broadsheet/index.html` is the desktop artboard
as plain HTML with the tokens wired up and a Day/System/Night switch; it is what "pixel for pixel"
means. Tokens: `broadsheet-tokens.css`.

The three line drawings (lakefront map, project node graph, rink plan) stay exactly as they are in
`components/home/HomeArt.tsx`. They already draw with `currentColor`, `var(--ink)`, `var(--accent)`
and `var(--paper)`, so they recolour themselves. Only their captions change (below).

---

## 1. Principles

1. **Three rule weights do all the structuring.** Heavy (3px solid), double (3px double), hairline
   (1px). No backgrounds, tints, cards, shadows, rounded corners — same discipline as today.
2. **Serif for everything a reader reads; agate for everything a reader scans.** Newsreader carries
   masthead, headlines, body, numbers and quotes. IBM Plex Sans Condensed (the "agate", one weight,
   600) carries nav, section heads, kickers, dates, captions, status, buttons and the colophon,
   always uppercase and letter-spaced.
3. **Two weights of serif, one of agate.** 400 and 700, and 600. Never ask the browser for anything
   else (`apps/web/src/styles/fonts.css`). `<strong>` is 700. Italic is 400 only.
4. **Red is a kicker, not a button.** `--accent` appears only in: section kickers ("The lead ·
   Twenty years in"), writing dates, the "No. n" classified numbers, the Search nav item, and the
   one dot in each drawing. Links are ink, underlined by a 1px ink border, never red.
5. **Nothing above the name.** The masthead is the first thing on the page. No ears, no dateline.
   The coordinates live in the colophon.

## 2. Type

Families and weights are in the tokens file. Measurements are desktop → [phone].

| Role | Face | Size | Line | Tracking | Case | Colour |
|---|---|---|---|---|---|---|
| Masthead "Ryan Yogan" | Serif 700 | 92 → [44, nowrap] | 1 | .06em → [.04em] | UPPER | ink |
| Tagline under masthead | Serif 400 italic | 18 → [15] | 1.4 | — | — | ink2 |
| Nav items | Agate | 13 | 44px rows | .16em → [.14em] | UPPER | ink; Search = accent |
| Kicker "The lead · …" | Agate | 12 | — | .16em | UPPER | accent |
| H1 | Serif 700 | 58 → [38] | 1.04 → [1.06] | −.012em → [−.01em] | — | ink |
| Deck | Serif 400 italic | 22 → [19] | 1.35 | — | — | ink2 |
| Body | Serif 400 | 17 | 1.5 | — | — | ink |
| Drop cap | Serif 700 | 4.2em of body, float left | .82 | — | — | ink |
| Pull quote | Serif 400 italic | 17 | 1.5 | — | — | ink2 |
| Section head (h2) | Agate | 13 | — | .16em | UPPER | ink, under a double rule |
| Section standfirst | Serif 400 italic | 14 | 1.5 | — | — | muted |
| Writing date | Agate | 12 | — | .10em | UPPER | accent |
| Lead writing title | Serif 700 | 24 → [25] | 1.2 → [1.18] | — | — | ink |
| Other writing titles | Serif 700 | 20 → [21] | 1.25 → [1.22] | — | — | ink |
| Project name | Serif 700 | 19 → [20] | — | — | — | ink |
| Project status | Agate | 12 → [11] | — | .08em | UPPER | muted |
| Project description | Serif 400 | 15 | 1.5 | — | — | ink2 |
| Figure caption | Agate | 12 → [11] | — | .06em | UPPER | muted |
| "By the numbers" value | Serif 700 | 26 → [28], nowrap | 1 | — | — | ink |
| "By the numbers" label | Agate | 13 | 1.4 | — | — | muted |
| Off-the-clock h3 | Serif 700 | 26 → [27] | 1.15 | — | — | ink |
| Off-the-clock body | Serif 400 | 16 | 1.5 | — | — | ink |
| Classified "No. n" | Agate | 12 | — | .10em | — | accent |
| Classified item | Serif 700 | 20 | 1.2 | — | — | ink |
| "Say hello…" | Serif 400 italic | 20 → [19] | 1.35 | — | — | ink |
| Text CTA ("All writing →") | Agate | 13 | 44px tap | .10em | UPPER | ink, 1px ink underline |
| Colophon | Agate | 12 | 44px rows | .10em | UPPER | muted |

Optical size: the mockups render Newsreader's variable font with `opsz 72` on the masthead, H1 and
numbers. The shipped static files are cut at the text optical size, so display text will look a
touch heavier and more open than the canvas. This is the accepted trade for the font budget.

## 3. Page anatomy (home, desktop 1280)

Container `max-width: 1200px`, `padding: 0 24px 40px`, centered. Top padding 36px before the
masthead. Every section is a band separated by a hairline (`border-bottom: 1px solid --hair`).

1. **Masthead** — centered. Name (link to `/`) then the italic tagline "Engineering leader. Agent
   builder. Hockey dad." 18px gap below.
2. **Nav** — `border-top: 1px solid --ink; border-bottom: 3px double --ink`. Items centered, gap
   34px, each a 44px-tall flex row: Work · Projects · Writing · Now · `|` (hair colour) · Search ⌘K
   (accent). Search opens the existing palette (`openDialog("palette")`); the theme toggle moves to
   the colophon (§ 3.7) — it is not in the mockup's nav. Keep its three-state behaviour.
3. **Lead story** — grid `7fr 3fr`, gap 40px, padding `34px 0 30px`.
   - Left: kicker, H1, deck, then a 2-column grid (gap 32px) with a column rule
     (`border-right: 1px solid --hair; padding-right: 32px` on the first column). Column 1: the
     "Lead" facts paragraph with drop cap (Co-founder and CTO… / VP of R&D at Sonian… / Coined…),
     the "team you build" quote, then the CTA "Work with me: here's how I work →". Column 2: the
     "Build" paragraph and the "negative result" quote.
   - Right aside: `border-left: 1px solid --hair; padding-left: 32px`. The lakefront map
     (`Lakefront`), max-width 300, centered, caption "Fig. 1 — Chicago, 41.88 N, 87.63 W". Then
     26px down, **By the numbers**: `border-top: 3px solid --ink`, agate head, a 2×2 `dl`
     (gap 14px 16px) with the four stats from `Hero.tsx` `scaleNumbers`. Labels are shortened to fit
     the narrow column — "engineers, 11 squads, Procore", "employees, then an IPO", "interviews
     conducted", "hires made". Keep the `sr-only " to "` between from/value.
4. **Three columns** — grid `repeat(3, 1fr)`, gap 32px, padding `28px 0 30px`, column rules on the
   first two (`border-right` hairline, `padding-right: 32px`). Each starts with an h2 in agate under
   a `3px double --ink` rule (padding-bottom 6px) and an italic muted standfirst (14px).
   - **Latest writing** — three entries: date (agate, accent), title (serif 700, 24 for the first,
     20 for the rest), hairline between, 14px padding. Then "All writing →".
   - **What I've built** — the node graph (`ProjectGraph`) first, caption "Fig. 2 — One node per
     project, clustered by group", then three project rows under a hairline: name (19px 700) with
     status right-aligned in agate muted on the same baseline, description (15px ink2) below;
     dotted hair rule between rows, hairline after the last. Then "All projects →".
   - **Off the clock** — h2, then the h3 "Chicago, a cold rink, and a laptop running Linux." (26px),
     the rink plan (`RinkPlan`), caption "Fig. 3 — 200 ft × 85 ft, the play I keep drawing", then
     the three 16px paragraphs with bold leads.
5. **Classifieds · Open to** — grid `1fr 2fr`, gap 40px, padding `28px 0 10px`. Left: h2 under a
   double rule, italic standfirst. Right: a box `border: 1px solid --ink; padding: 20px 24px`
   holding an `ol` in three columns (gap 24px): "No. 1/2/3" in agate accent over the item in serif
   700 20px; item 3 carries the muted 14px sub-line. Below, `border-top: 1px dotted --hair`,
   padding-top 14px: "Say hello. Tell me what you are building and where it is stuck." (20px italic)
   left and the email (agate 14px, 1px ink underline) right, `justify-content: space-between`.
6. **Colophon** — `border-top: 3px solid --ink`, padding-top 10px, agate 12px muted uppercase,
   space-between: "Ryan Yogan · Chicago · 41.88 N, 87.63 W · Press ? for keys" (the `?` is the
   existing `.kbd` button opening the help dialog, restyled: 1px hair border, no radius) and
   Now · GitHub · LinkedIn · RSS · ryan.yogan@hey.com, each a 44px row. **Add the theme toggle at
   the end of this row** (icon only, 44×44, `aria-label` unchanged).

## 4. Phone (390)

Padding `0 18px 32px`, top 28px. Same bands, stacked, padding `24px 0 26px`.

- Masthead 44px (nowrap); tagline 15px. Nav: `justify-content: space-between`, four items plus a search icon
  (accent) at the right; no menu to open — the four links fit at 13px/.14em in 354px, and are set
  tighter (12px/.08em) at 360px and under.
- Lead: kicker, H1 38px, deck 19px, map (max-width 250, centered, caption centered), then the four
  paragraphs as one column, drop cap on the first, CTA, then **By the numbers** as a 2×2 grid under
  a heavy rule (numbers 28px).
- Writing, Built, Off the clock, Classifieds, Colophon: as desktop, one column. Figures sit
  between the standfirst and the list (Built) or between h3 and body (Off the clock), max-width
  250 centered for the node graph, full width for the rink. The classifieds `ol` stacks with 14px
  gap; the email drops under "Say hello" with 8px gap. Colophon stacks: name line, link row, email.
- Status labels get `white-space: nowrap` so "Running locally" never wraps under the name.
- Tablet (600–900): lead grid and three columns become two columns; the `By the numbers` grid
  2×2. Column rules turn into bottom hairlines when a column has no right neighbour
  (`.bs-rule-r` in the prototype shows the exact breakpoints).

## 5. Inner pages (not mocked; derive from the home rules)

Keep every route's content and components; retheme them with the same vocabulary. Each page keeps
the masthead + nav + colophon shell.

- **Shared "page head" pattern** (replaces `.wr-head`, `.pd-head`, `.post-head`, `/work` and
  `/now` leads): agate kicker in accent (the section name: "Writing", "Projects", "Work", "Now",
  or the breadcrumb), H1 in serif 700 at 44px desktop / 34px phone, italic deck at 20px, then a
  `3px double --ink` rule before the content.
- **Lists** (`/writing`, `/projects`): the same row anatomy as the home columns — agate date or
  status, serif 700 title, hairline between. `/writing`'s year headings (`.wr-year`) become agate
  section heads under a double rule. The `.pick` filter on `/projects` becomes a row of agate
  links, current one in accent, 44px tall, no pill.
- **Prose** (`.prose` in app.css L1714–2066, used by `/writing/[slug]`, `/projects/[slug]`): body
  Newsreader 17/1.55 at a 34em measure; h2 serif 700 28px with a hairline above and 28px of space;
  h3 serif 700 22px; links 1px ink underline; blockquote italic ink2 with a 3px ink left rule and
  no indent; first paragraph of a post gets the drop cap; figcaption in agate 12px muted uppercase;
  `pre`/code keep system mono and today's `--code-*` light-dark pairs, recoloured to the new
  paper/ink (bg: `#ECEAE4` day / `#1C1C1C` night). Post meta (date, reading time, views) in agate
  12px muted uppercase, dotted-rule separated.
- **`/now`**: the `.now-sec` headings become agate heads under double rules; `DrumKit` and `Camper`
  art unchanged (they use the variables).
- **404** (`NotFound` in `__root.tsx`): kicker "Page not found", H1 "Nothing under this headline.",
  the existing links.
- **Keyboard layer** (`.kb-dialog`, `.kbd`): dialog on `--paper` with a `3px solid --ink` top rule
  and hairline sides, no radius or shadow; backdrop `rgb(17 17 17 / .45)`; input in serif 17px with
  a hair underline; result rows 44px, titles serif, kinds in agate muted. `.kbd` keys: 1px hair
  border, agate 12px, no radius.
- **Admin** (`.adm-*`): out of scope; leave as is.

## 6. Accessibility (as measured on the tokens)

| Token | Day on paper | Night on paper | Used for |
|---|---|---|---|
| `--ink` | 17.31:1 | 15.57:1 | text, rules |
| `--ink2` | 13.16:1 | 12.53:1 | decks, quotes, descriptions |
| `--muted` | 6.31:1 | 7.18:1 | 12–13px agate labels — above AA's 4.5:1 for small text |
| `--accent` | 5.39:1 | 6.14:1 | kickers, dates, "No. n", Search |
| `--hair` | 1.37:1 | 1.48:1 | decorative rules only — never text, never a control border |

Every link row and button is ≥44px tall. Figures keep `role="img"` + `aria-label`. The drop cap
is CSS (`::first-letter`), so screen readers read the word intact. Nav `aria-label="Sections"`,
footer nav `aria-label="Footer"`. The heavy/double rules carry the hierarchy, so the page still
reads with colour removed.

## 7. Where the site departs from the canvas

This spec and the prototype are the design as drawn. The site (`apps/web/src/styles/app.css`) is
what ships, and where they differ the site is right:

- There is no double rule. Under the nav, under every section head and under a page head the
  rule is the heavy one (3px solid), so the page has two rule weights, heavy and hairline.
- Type is the static cuts, not the variable font, so display sizes are a touch heavier.
- The agate (IBM Plex Sans Condensed 600) is not preloaded: a first visit shows nav and labels in
  a metric-matched fallback, and the face is there from the next page load.
- "By the numbers": the second column is the wider (4fr / 5fr), so "150 → 2,300" stays on the
  page; on a phone the figures are 26px, not 28.
- The lead story goes to one column at 1000px and under, not 900.
- Short links are padded to 44px to press.
- The inner pages (§ 5) were not drawn: a page head, then sections with the head in a left column
  and the content in a wide one; a post and a project are one centred 44rem column.
- A post's drop cap is used only when the post opens with running text.

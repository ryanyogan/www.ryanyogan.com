# Tone Down Upsell — Remove Prominent CTAs, Add Subtle Footer Link

## TL;DR

> **Quick Summary**: Remove all prominent "Hire Me" and consulting CTA elements across the site, replace with a single subtle footer link and a simplified consulting section on the homepage.
>
> **Deliverables**:
>
> - Header stripped of "Hire Me" (desktop + mobile)
> - Footer gains a subtle "Hire Me" text link alongside socials
> - ConsultingCTA simplified to understated header + text + link
> - Work page CTA removed
> - Projects page consulting CTAs removed
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES — 5 tasks in 1 wave, then final verification
> **Critical Path**: All tasks independent → Final verification

---

## Context

### Original Request

User wants to make the upsell less obvious. Remove "Hire Me" from the header, add it as a subtle footer link, and simplify the landing page CTA for yogan.dev to just a small section with a header and some basic text and link.

### Interview Summary

**Key Discussions**:

- Hero section's "architectural consulting" link to yogan.dev: **Keep as-is** — it's contextual, not pushy
- Footer style for "Hire Me": **Regular text link** alongside GitHub/LinkedIn/Twitter — blends in naturally
- Work page "Hire Me" link: **Remove** — footer link is enough
- Projects page consulting CTAs (partner card + inquire bar): **Remove both** — let the footer handle it

### Metis Review

**Identified Gaps** (addressed):

- work.tsx has a "Hire Me" link (lines 62-74) not in original scope → Added as Task 4
- projects.index.tsx has two consulting CTAs (lines 65-92) not in original scope → Added as Task 5
- sidebarNav has `{ label: "Contact", href: "#contact" }` anchoring to ConsultingCTA's `id="contact"` → Guardrail: preserve `id="contact"` on simplified section

---

## Work Objectives

### Core Objective

De-emphasize consulting/hire-me messaging across the site while keeping it accessible via the footer and a simplified homepage section.

### Concrete Deliverables

- `apps/web/src/components/Header.tsx` — "Hire Me" removed from desktop and mobile nav
- `packages/shared/src/content.ts` — `footerLinks` array gains `{ label: "Hire Me", href: "https://yogan.dev" }`
- `apps/web/src/components/ConsultingCTA.tsx` — Simplified to small section with header, brief text, and link
- `apps/web/src/routes/work.tsx` — Bottom "Hire Me" link removed
- `apps/web/src/routes/projects.index.tsx` — "Looking for a technical partner?" card and "Inquire" bar removed

### Definition of Done

- [ ] `pnpm ready` passes (fmt + lint + build)
- [ ] `grep -r "Hire Me" apps/web/src/components/Header.tsx` returns nothing
- [ ] `footerLinks` in content.ts has exactly 4 entries
- [ ] ConsultingCTA.tsx still has `id="contact"` on its section element
- [ ] No consulting CTA blocks remain in work.tsx or projects.index.tsx

### Must Have

- "Hire Me" link in footer pointing to https://yogan.dev
- Simplified ConsultingCTA with heading, brief text, and link
- `id="contact"` preserved on ConsultingCTA section element (sidebar nav anchor)
- All existing non-CTA content on work and projects pages untouched

### Must NOT Have (Guardrails)

- Do NOT touch Hero.tsx — the "architectural consulting" link stays
- Do NOT modify navLinks, sidebarNav, or socialLinks arrays in content.ts
- Do NOT change Footer.tsx component — only the data it consumes
- Do NOT add new components, files, or props
- Do NOT refactor Header.tsx beyond removing the two `<a>` elements
- Do NOT touch mobile menu animation, overlay, or toggle behavior
- Do NOT add comments, aria-labels, or documentation beyond what exists
- Do NOT extract ConsultingCTA into a "reusable" component or shared utility

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: NO (zero test files in project)
- **Automated tests**: None
- **Framework**: N/A
- **Verification gate**: `pnpm ready` (runs `fmt:check && lint && build`)

### QA Policy

Every task uses grep/build verification. Final QA uses Playwright for visual confirmation.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (All Parallel — independent file edits):
├── Task 1: Remove "Hire Me" from Header.tsx [quick]
├── Task 2: Add "Hire Me" to footer links in content.ts [quick]
├── Task 3: Simplify ConsultingCTA.tsx [quick]
├── Task 4: Remove CTA from work.tsx [quick]
└── Task 5: Remove consulting CTAs from projects.index.tsx [quick]

Wave FINAL (After ALL tasks — verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality + build verification (unspecified-high)
├── Task F3: Visual QA via Playwright (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: All Wave 1 tasks independent → F1-F4 → user okay
Parallel Speedup: All 5 tasks run simultaneously
Max Concurrent: 5
```

### Dependency Matrix

| Task | Depends On | Blocks |
| ---- | ---------- | ------ |
| 1    | —          | F1-F4  |
| 2    | —          | F1-F4  |
| 3    | —          | F1-F4  |
| 4    | —          | F1-F4  |
| 5    | —          | F1-F4  |

### Agent Dispatch Summary

- **Wave 1**: **5 tasks** — T1-T5 → all `quick`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

- [x] 1. Remove "Hire Me" from Header (desktop + mobile)

  **What to do**:
  - In `apps/web/src/components/Header.tsx`, remove the desktop "Hire Me" `<a>` tag (lines 48-55). Keep the surrounding `<div>` wrapper (line 46) since it still contains `<ThemeToggle />`
  - Remove the mobile "Hire Me" `<a>` tag (lines 126-133). Keep the divider and `<ThemeToggle />` above it

  **Must NOT do**:
  - Do NOT modify any other header elements, navigation links, or the mobile menu toggle/overlay
  - Do NOT refactor or restructure the header component

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, removing two JSX elements, no logic changes
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No design work needed, just removal

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/web/src/components/Header.tsx:46-56` — Desktop nav area. The `<div>` at line 46 contains `<ThemeToggle />` and the "Hire Me" `<a>`. Remove only the `<a>` (lines 48-55), keep the `<div>` and `<ThemeToggle />`
  - `apps/web/src/components/Header.tsx:120-134` — Mobile menu bottom area. Remove the "Hire Me" `<a>` (lines 126-133). Keep the horizontal rule and `<ThemeToggle />`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify "Hire Me" removed from desktop header
    Tool: Bash (grep)
    Preconditions: File saved after edits
    Steps:
      1. Run: grep -n "Hire Me" apps/web/src/components/Header.tsx
      2. Assert: exit code 1 (no matches)
      3. Run: grep -n "ThemeToggle" apps/web/src/components/Header.tsx
      4. Assert: ThemeToggle still present (at least 2 occurrences — desktop + mobile)
    Expected Result: Zero "Hire Me" occurrences, ThemeToggle preserved
    Failure Indicators: grep returns matches for "Hire Me", or ThemeToggle count < 2
    Evidence: .sisyphus/evidence/task-1-header-grep.txt

  Scenario: Build passes after header changes
    Tool: Bash
    Preconditions: Header.tsx edited
    Steps:
      1. Run: pnpm build
      2. Assert: exit code 0, no TypeScript errors
    Expected Result: Clean build with zero errors
    Failure Indicators: Non-zero exit code, TS errors mentioning Header
    Evidence: .sisyphus/evidence/task-1-build.txt
  ```

  **Commit**: YES
  - Message: `fix(header): remove Hire Me CTA from desktop and mobile navigation`
  - Files: `apps/web/src/components/Header.tsx`
  - Pre-commit: `pnpm build`

- [x] 2. Add "Hire Me" link to footer via shared content

  **What to do**:
  - In `packages/shared/src/content.ts`, add `{ label: "Hire Me", href: "https://yogan.dev" }` to the `footerLinks` array (after the existing Twitter entry, around line 360)
  - The Footer.tsx component maps over `footerLinks` automatically — no Footer.tsx changes needed

  **Must NOT do**:
  - Do NOT modify Footer.tsx component
  - Do NOT modify navLinks, sidebarNav, or socialLinks arrays
  - Do NOT change the NavLink type definition

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding one line to an array — trivial change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/shared/src/content.ts:356-360` — Current `footerLinks` array with GitHub, LinkedIn, Twitter entries. Add the new entry following the exact same `{ label: "...", href: "..." }` pattern

  **API/Type References**:
  - `packages/shared/src/content.ts` — `NavLink` type used by all link arrays: `{ readonly label: string; readonly href: string }`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify footerLinks has 4 entries including "Hire Me"
    Tool: Bash (grep)
    Preconditions: content.ts edited
    Steps:
      1. Run: grep -A 5 "footerLinks" packages/shared/src/content.ts
      2. Assert: output contains "Hire Me" and "yogan.dev"
      3. Run: grep -c "label:" packages/shared/src/content.ts | check footerLinks section has 4 entries
    Expected Result: "Hire Me" entry present with href "https://yogan.dev"
    Failure Indicators: Missing entry, wrong href, or existing entries modified
    Evidence: .sisyphus/evidence/task-2-footer-links-grep.txt

  Scenario: Build passes after content change
    Tool: Bash
    Preconditions: content.ts edited
    Steps:
      1. Run: pnpm build
      2. Assert: exit code 0
    Expected Result: Clean build — NavLink type satisfied
    Failure Indicators: Type error in content.ts
    Evidence: .sisyphus/evidence/task-2-build.txt
  ```

  **Commit**: YES
  - Message: `feat(footer): add subtle Hire Me link to footer links`
  - Files: `packages/shared/src/content.ts`
  - Pre-commit: `pnpm build`

- [x] 3. Simplify ConsultingCTA to understated section

  **What to do**:
  - Rewrite the inner content of `apps/web/src/components/ConsultingCTA.tsx` to be a small, understated section:
    - Keep the `<section id="contact">` wrapper (sidebar nav anchor depends on it)
    - Replace the current prominent heading + paragraph + styled button with:
      - A simple heading (e.g. "Consulting & Advisory" or similar — keep it short)
      - 1-2 sentences of brief text (understated, not salesy)
      - A plain text link to https://yogan.dev (not a big styled button)
    - Reduce visual weight: smaller padding, no background color block, simple typography
  - The section should feel like an afterthought, not a sales pitch

  **Must NOT do**:
  - Do NOT remove `id="contact"` from the section element
  - Do NOT extract to a new component
  - Do NOT add new dependencies or imports
  - Do NOT over-style — simpler is better

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single component simplification, straightforward JSX + Tailwind
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: This is intentionally making it less designed, not more

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/web/src/components/ConsultingCTA.tsx:1-21` — Current implementation. The `section` element with `id="contact"` MUST be preserved. Simplify everything inside it
  - `apps/web/src/components/Footer.tsx:1-27` — Reference for understated styling tone (simple text, muted colors, minimal padding)

  **API/Type References**:
  - `packages/shared/src/content.ts:348` — `sidebarNav` contains `{ label: "Contact", href: "#contact" }` — this anchor link MUST continue working

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify id="contact" preserved and link to yogan.dev present
    Tool: Bash (grep)
    Preconditions: ConsultingCTA.tsx edited
    Steps:
      1. Run: grep 'id="contact"' apps/web/src/components/ConsultingCTA.tsx
      2. Assert: match found
      3. Run: grep 'yogan.dev' apps/web/src/components/ConsultingCTA.tsx
      4. Assert: match found with href
    Expected Result: Section anchor preserved, yogan.dev link present
    Failure Indicators: Missing id="contact" or missing yogan.dev link
    Evidence: .sisyphus/evidence/task-3-cta-grep.txt

  Scenario: Component is visually simplified (no prominent button)
    Tool: Bash (grep)
    Preconditions: ConsultingCTA.tsx edited
    Steps:
      1. Run: grep -c "bg-primary\|bg-surface-container" apps/web/src/components/ConsultingCTA.tsx
      2. Assert: no prominent background styling (bg-surface-container-low removed or replaced with minimal)
      3. File should be shorter than original (was 21 lines)
    Expected Result: Leaner component with less visual weight
    Failure Indicators: Still has prominent button styling, still has large paddings
    Evidence: .sisyphus/evidence/task-3-cta-simplified.txt

  Scenario: Build passes
    Tool: Bash
    Preconditions: ConsultingCTA.tsx edited
    Steps:
      1. Run: pnpm build
      2. Assert: exit code 0
    Expected Result: Clean build
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: YES
  - Message: `refactor(cta): simplify consulting section to understated text and link`
  - Files: `apps/web/src/components/ConsultingCTA.tsx`
  - Pre-commit: `pnpm build`

- [x] 4. Remove "Hire Me" CTA from Work page

  **What to do**:
  - In `apps/web/src/routes/work.tsx`, remove the "Hire Me" link block at the bottom of the page (lines 62-74)
  - Keep all other content (experience timeline, skills, etc.) untouched

  **Must NOT do**:
  - Do NOT modify any other content on the work page
  - Do NOT restructure the page layout

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Removing one JSX block from a single file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/web/src/routes/work.tsx:62-74` — The "Hire Me" link block at the bottom. Remove this entire block. Check surrounding elements to avoid breaking the layout

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify no "Hire Me" or yogan.dev CTA in work page
    Tool: Bash (grep)
    Preconditions: work.tsx edited
    Steps:
      1. Run: grep -n "Hire Me\|yogan.dev" apps/web/src/routes/work.tsx
      2. Assert: no matches (exit code 1)
    Expected Result: No consulting CTA remains on work page
    Failure Indicators: Any match found
    Evidence: .sisyphus/evidence/task-4-work-grep.txt

  Scenario: Build passes
    Tool: Bash
    Preconditions: work.tsx edited
    Steps:
      1. Run: pnpm build
      2. Assert: exit code 0
    Expected Result: Clean build, no broken JSX
    Evidence: .sisyphus/evidence/task-4-build.txt
  ```

  **Commit**: YES
  - Message: `fix(work): remove Hire Me CTA from work page`
  - Files: `apps/web/src/routes/work.tsx`
  - Pre-commit: `pnpm build`

- [x] 5. Remove consulting CTAs from Projects page

  **What to do**:
  - In `apps/web/src/routes/projects.index.tsx`, remove BOTH consulting CTA blocks:
    - Lines 65-78: "Looking for a technical partner?" card with "Get in touch" mailto button
    - Lines 80-92: Footer bar with "Available for select projects" and "Inquire" link to yogan.dev
  - Keep all project listings and other content untouched

  **Must NOT do**:
  - Do NOT modify project cards, filtering, or any other page functionality
  - Do NOT restructure the page layout beyond removing the CTA blocks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Removing two JSX blocks from a single file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/web/src/routes/projects.index.tsx:65-78` — "Looking for a technical partner?" card. Remove entire block
  - `apps/web/src/routes/projects.index.tsx:80-92` — "Available for select projects" bar with "Inquire" link. Remove entire block

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify no consulting CTAs remain on projects page
    Tool: Bash (grep)
    Preconditions: projects.index.tsx edited
    Steps:
      1. Run: grep -n "technical partner\|yogan.dev\|Inquire\|Available for select" apps/web/src/routes/projects.index.tsx
      2. Assert: no matches (exit code 1)
    Expected Result: No consulting CTA text remains
    Failure Indicators: Any match found
    Evidence: .sisyphus/evidence/task-5-projects-grep.txt

  Scenario: Build passes
    Tool: Bash
    Preconditions: projects.index.tsx edited
    Steps:
      1. Run: pnpm build
      2. Assert: exit code 0
    Expected Result: Clean build, no broken JSX or missing imports
    Evidence: .sisyphus/evidence/task-5-build.txt
  ```

  **Commit**: YES
  - Message: `fix(projects): remove consulting CTA blocks from projects page`
  - Files: `apps/web/src/routes/projects.index.tsx`
  - Pre-commit: `pnpm build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (grep for footer link, grep for id="contact", check ConsultingCTA has heading + text + link). For each "Must NOT Have": search for forbidden patterns (Hero.tsx unchanged, no new components, no navLinks changes). Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [5/5] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality + Build** — `unspecified-high`
      Run `pnpm ready` (fmt:check + lint + build). Review all changed files for: unused imports after removal, broken JSX nesting, unclosed tags. Check no AI slop: no added comments, no over-abstraction, no unnecessary changes beyond scope.
      Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Visual QA via Playwright** — `unspecified-high` (+ `playwright` skill)
      Start dev server with `pnpm dev`. Use Playwright to:
      (a) Navigate to homepage — verify header has NO "Hire Me" link, footer DOES have "Hire Me" link, consulting section is visibly simpler/smaller
      (b) Navigate to /work — verify no "Hire Me" CTA at bottom
      (c) Navigate to /projects — verify no "Looking for a technical partner?" card or "Inquire" bar
      (d) Click sidebar "Contact" link — verify it scrolls to the consulting section (id="contact" works)
      Screenshot each page. Save to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Screenshots [N captured] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
      For each task: read actual diff (git diff). Verify only targeted elements were removed/changed. Check Hero.tsx is UNTOUCHED. Check navLinks/sidebarNav/socialLinks arrays are UNTOUCHED. Flag any changes outside the 5 target files. Detect unaccounted modifications.
      Output: `Tasks [5/5 compliant] | Untouched files verified [N/N] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| #   | Message                                                                   | Files                                       | Verify       |
| --- | ------------------------------------------------------------------------- | ------------------------------------------- | ------------ |
| 1   | `fix(header): remove Hire Me CTA from desktop and mobile navigation`      | `apps/web/src/components/Header.tsx`        | `pnpm build` |
| 2   | `feat(footer): add subtle Hire Me link to footer links`                   | `packages/shared/src/content.ts`            | `pnpm build` |
| 3   | `refactor(cta): simplify consulting section to understated text and link` | `apps/web/src/components/ConsultingCTA.tsx` | `pnpm build` |
| 4   | `fix(work): remove Hire Me CTA from work page`                            | `apps/web/src/routes/work.tsx`              | `pnpm build` |
| 5   | `fix(projects): remove consulting CTA blocks from projects page`          | `apps/web/src/routes/projects.index.tsx`    | `pnpm build` |

---

## Success Criteria

### Verification Commands

```bash
pnpm ready                    # Expected: exit 0 (fmt + lint + build pass)
grep -r "Hire Me" apps/web/src/components/Header.tsx  # Expected: no matches
grep "Hire Me" packages/shared/src/content.ts         # Expected: 1 match (in footerLinks)
grep 'id="contact"' apps/web/src/components/ConsultingCTA.tsx  # Expected: 1 match
```

### Final Checklist

- [ ] Header shows no "Hire Me" on desktop or mobile
- [ ] Footer shows "Hire Me" as subtle text link to yogan.dev
- [ ] ConsultingCTA is a small, understated section with id="contact" preserved
- [ ] Work page has no consulting CTA
- [ ] Projects page has no consulting CTAs
- [ ] Hero "architectural consulting" link untouched
- [ ] Sidebar "Contact" anchor link still works
- [ ] `pnpm ready` passes

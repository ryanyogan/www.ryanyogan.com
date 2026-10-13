import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { ADMIN_ORIGIN, expect, test } from "./fixtures";

// The device matrix. Runs in the "chromium" and "webkit" projects: one test per viewport, one
// page per test, resized with setViewportSize and walked over every public route. That is 9
// tabs and about 60 page loads per engine, not a project per device (which would multiply the
// whole suite).
//
// These are emulated viewports in desktop Chromium and in Playwright's WebKit build. They
// catch layout, type size and target size regressions, and WebKit adds Safari's engine (font
// metrics, hyphenation, dvh); they are not iOS Safari or Android Chrome (toolbars, safe areas
// and momentum scrolling are only seen on real devices).

const VIEWPORTS = [
  { name: "small phone", width: 320, height: 568 },
  { name: "common Android", width: 360, height: 800 },
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14/15", width: 390, height: 844 },
  { name: "large iPhone", width: 430, height: 932 },
  { name: "foldable, open", width: 712, height: 1000 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "phone landscape", width: 844, height: 390 },
] as const;

const WRITING_DIR = fileURLToPath(new URL("../content/writing", import.meta.url));
/** The longest post: the most prose, code blocks and tables to overflow. */
const longestPost = readdirSync(WRITING_DIR)
  .filter((name) => name.endsWith(".md"))
  .map((name) => ({ name, size: statSync(`${WRITING_DIR}/${name}`).size }))
  .sort((a, b) => b.size - a.size)[0]!
  .name.replace(/\.md$/, "");

const POST = `/writing/${longestPost}`;
const ROUTES = ["/", "/work", "/now", "/projects", "/projects/lincoln-project", "/writing", POST];

/** Everything measured in one pass in the page; returns a list of problems (empty = good). */
async function audit(page: Page, options: { post: boolean }): Promise<string[]> {
  return page.evaluate(({ post }) => {
    const problems: string[] = [];
    const vw = document.documentElement.clientWidth;
    const name = (element: Element) =>
      `<${element.tagName.toLowerCase()}${
        typeof element.className === "string" && element.className
          ? `.${element.className.split(/\s+/).slice(0, 2).join(".")}`
          : ""
      }> "${(element.textContent ?? "").trim().slice(0, 28)}"`;
    const shown = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
    };
    /** The visually hidden text of screen-reader labels (Tailwind's sr-only is 1x1). */
    const srOnly = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.width <= 1 && rect.height <= 1;
    };

    // 1. No horizontal overflow: the document, then every element. Code blocks and tables
    //    scroll inside their own box, so their descendants are allowed past the edge.
    if (document.documentElement.scrollWidth > vw) {
      problems.push(`document is ${document.documentElement.scrollWidth}px wide in ${vw}px`);
    }
    for (const element of document.querySelectorAll("body *")) {
      if (element.closest("pre, [data-scroll-x], div[tabindex]:has(> table)")) continue;
      if (!shown(element) || srOnly(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.right > vw + 1 || rect.left < -1) {
        problems.push(
          `overflows: ${name(element)} ${Math.round(rect.left)}..${Math.round(rect.right)}`,
        );
      }
    }

    // 2. The section row under the masthead: one row, nothing clipped, nothing overlapping.
    const controls = [...document.querySelectorAll("#site-nav a, #site-nav button")].filter(shown);
    const boxes = controls.map((element) => element.getBoundingClientRect());
    controls.forEach((element, i) => {
      if (element.scrollWidth > element.clientWidth + 1)
        problems.push(`header text clipped: ${name(element)}`);
      const a = boxes[i]!;
      if (Math.abs(a.top + a.height / 2 - (boxes[0]!.top + boxes[0]!.height / 2)) > 1) {
        problems.push(`header wraps to a second row at ${name(element)}`);
      }
      for (let j = i + 1; j < controls.length; j++) {
        const b = boxes[j]!;
        if (
          a.left < b.right - 0.5 &&
          b.left < a.right - 0.5 &&
          a.top < b.bottom - 0.5 &&
          b.top < a.bottom - 0.5
        ) {
          problems.push(`header controls overlap: ${name(element)} and ${name(controls[j]!)}`);
        }
      }
    });

    // 3. Type size, as the Broadsheet spec sets it (docs/design/broadsheet.md, section 2).
    //    Reading text is whatever is set in the body serif: at least 17px in a post, 16px
    //    elsewhere. The serif's small roles are named and held to their own sizes: the italic
    //    standfirst under a section head and the line under a classified (14px), a project's
    //    description and the tagline under the masthead on a phone (15px). The agate (labels,
    //    dates, captions, status, the colophon) is 12 or 13px, and on a phone a status and a
    //    caption are 11px: nothing at all is smaller than that.
    //    Allowance: labels inside a drawing (svg text) scale with the art and are not counted.
    const serif = getComputedStyle(document.body).fontFamily;
    const floor = vw <= 600 ? 11 : 12;
    const SMALL_SERIF: [string, number][] = [
      [".stand, .cls small", 14],
      [".sum, .mast-tag, .small", 15],
    ];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (!parent || seen.has(parent) || !walker.currentNode.textContent?.trim()) continue;
      seen.add(parent);
      if (parent.closest("svg, script, style, noscript") || !shown(parent) || srOnly(parent))
        continue;
      const style = getComputedStyle(parent);
      const size = Number.parseFloat(style.fontSize);
      if (size < floor - 0.01) problems.push(`${size}px text (floor ${floor}): ${name(parent)}`);
      if (style.fontFamily === serif && !parent.closest("sup, sub, code")) {
        const small = SMALL_SERIF.find(([selector]) => parent.closest(selector));
        const least = small ? small[1] : post && parent.closest(".prose") ? 17 : 16;
        if (size < least - 0.01)
          problems.push(`${size}px reading text (least ${least}): ${name(parent)}`);
      }
    }

    // 4. Tap targets: every link and button is at least 44x44, and no two overlap.
    //    Allowance (WCAG 2.5.8, inline exception): a link in a sentence, meaning an inline
    //    <a> with text beside it in the same parent, is sized by its line and is not counted.
    const targets = [...document.querySelectorAll("a[href], button, summary")].filter(
      (element) => shown(element) && !srOnly(element) && !element.closest("dialog:not([open])"),
    );
    const inSentence = (element: Element) =>
      element.tagName === "A" &&
      getComputedStyle(element).display === "inline" &&
      [...(element.parentElement?.childNodes ?? [])].some(
        (node) => node.nodeType === Node.TEXT_NODE && /[\p{L}\p{N}]/u.test(node.textContent ?? ""),
      );
    const pressed = targets.filter((element) => !inSentence(element));
    const rects = pressed.map((element) => element.getBoundingClientRect());
    pressed.forEach((element, i) => {
      const a = rects[i]!;
      // The skip link sits off screen until focused.
      if (a.bottom < 0 && window.scrollY === 0) return;
      if (a.width < 43.5 || a.height < 43.5) {
        problems.push(
          `tap target ${Math.round(a.width)}x${Math.round(a.height)}: ${name(element)}`,
        );
      }
      for (let j = i + 1; j < pressed.length; j++) {
        const b = rects[j]!;
        if (element.contains(pressed[j]!) || pressed[j]!.contains(element)) continue;
        if (
          a.left < b.right - 1 &&
          b.left < a.right - 1 &&
          a.top < b.bottom - 1 &&
          b.top < a.bottom - 1
        ) {
          problems.push(`tap targets overlap: ${name(element)} and ${name(pressed[j]!)}`);
        }
      }
    });

    // 5. Nothing fixed or sticky lies over the first heading.
    const h1 = document.querySelector("h1")?.getBoundingClientRect();
    if (!h1) problems.push("no h1");
    for (const element of document.querySelectorAll("body *")) {
      const position = getComputedStyle(element).position;
      if ((position !== "fixed" && position !== "sticky") || !shown(element) || !h1) continue;
      if (element.closest("dialog") || srOnly(element)) continue;
      const rect = element.getBoundingClientRect();
      if (
        rect.left < h1.right &&
        h1.left < rect.right &&
        rect.top < h1.bottom &&
        h1.top < rect.bottom
      ) {
        problems.push(`${position} element over the h1: ${name(element)}`);
      }
    }
    return problems;
  }, options);
}

/** React has attached to the heading and the footer: the route's scripts have all arrived. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const attached = (element: Element | null) =>
      Boolean(element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")));
    return attached(document.querySelector("h1")) && attached(document.querySelector("footer"));
  });
}

// Waits for hydration, so the page measured is the one a reader ends up with, and so the next
// goto does not leave a page whose route chunk is still on its way. WebKit cancels that import
// when a navigation starts ("Importing a module script failed"), TanStack Router takes the
// failure for a stale build and reloads the page being left (lazyRouteComponent), and the
// reload interrupts the goto. Chromium does not reject the import, so it never showed there.
async function ready(page: Page, path: string) {
  // The writing pages fill in view counts after hydration: measure them once the answer
  // has been drawn, not at some moment before or after it.
  const counts = path.startsWith("/writing")
    ? page.waitForResponse((response) => new URL(response.url()).pathname.startsWith("/api/views"))
    : undefined;
  await page.goto(path);
  await hydrated(page);
  await page.evaluate(() => document.fonts.ready);
  if (counts) {
    await (await counts).finished();
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
  }
}

test.describe("device matrix", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height} (${viewport.name}): every public page fits, reads and can be pressed`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const report: string[] = [];
      for (const path of ROUTES) {
        await ready(page, path);
        const problems = await audit(page, { post: path === POST });
        // The same again a screen down, where a sticky bar would have settled over the text.
        await page.evaluate((y) => window.scrollTo(0, y), viewport.height);
        const scrolled = await page.evaluate(() => {
          const stuck: string[] = [];
          for (const element of document.querySelectorAll("body *")) {
            const position = getComputedStyle(element).position;
            if (position !== "fixed" && position !== "sticky") continue;
            const rect = element.getBoundingClientRect();
            if (rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.top < innerHeight) {
              stuck.push(`${position} element covers the page when scrolled: ${element.tagName}`);
            }
          }
          return stuck;
        });
        report.push(...[...problems, ...scrolled].map((problem) => `${path}: ${problem}`));
      }
      expect(report).toEqual([]);
    });
  }
});

test("at 320px the masthead is the name on one line and one row of sections, each 44px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await ready(page, "/");
  const header = page.locator("body > header");
  // No menu and no search: the sections are links, and the only button is the theme's.
  await expect(header.locator("button")).toHaveAccessibleName(/^Colour theme/);

  const name = header.getByRole("link", { name: "Ryan Yogan, home" });
  const wordmark = (await name.boundingBox())!;
  expect(wordmark.x).toBeGreaterThanOrEqual(0);
  expect(wordmark.x + wordmark.width).toBeLessThanOrEqual(320);
  expect(
    await name.evaluate((element) => element.getClientRects().length),
    "the name is one line",
  ).toBe(1);

  const nav = header.getByRole("navigation", { name: "Sections" });
  const items = nav.locator("a:visible");
  // Front page is not in the row at this width: the name is the way home.
  await expect(items).toHaveText(["Work", "Projects", "Writing", "Now"]);
  let left = 0;
  let top: number | undefined;
  for (const item of await items.all()) {
    const box = (await item.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    top ??= box.y;
    expect(Math.abs(box.y - top)).toBeLessThan(1);
    expect(box.y).toBeGreaterThan(wordmark.y + wordmark.height);
    expect(box.x).toBeGreaterThanOrEqual(left - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    left = box.x + box.width;
  }
});

test("200% text: every public page reflows at 320 CSS px with nothing lost (WCAG 1.4.4, 1.4.10)", async ({
  page,
}) => {
  // Browser zoom at 200% in a 640px window is a 320px viewport, which the matrix covers.
  // This is the other half: the reader's font size doubled at that width. Every size is in
  // rem, so text doubles, wraps, and still nothing leaves the page or is clipped.
  await page.setViewportSize({ width: 320, height: 568 });
  const report: string[] = [];
  for (const path of ROUTES) {
    await ready(page, path);
    const before = await page.evaluate(() => ({
      text: document.querySelector("main")!.textContent,
      p: Number.parseFloat(getComputedStyle(document.querySelector("main p")!).fontSize),
    }));
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const after = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide: string[] = [];
      for (const element of document.querySelectorAll("body *")) {
        if (element.closest("pre, div[tabindex]:has(> table)")) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) continue;
        const style = getComputedStyle(element);
        if (rect.right > vw + 1) wide.push(`${element.tagName}.${element.className}`);
        // Text wider than its own box: cut off (overflow hidden) or printed over its
        // neighbour. Inline boxes report no client width and are covered by their parent.
        const ownText = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        );
        if (
          element.clientWidth > 1 &&
          element.scrollWidth > element.clientWidth + 1 &&
          (ownText || ["hidden", "clip"].includes(style.overflowX))
        ) {
          wide.push(
            `spills ${element.tagName}.${element.className} "${element.textContent?.slice(0, 20)}"`,
          );
        }
      }
      return {
        wide,
        scroll: document.documentElement.scrollWidth,
        vw,
        text: document.querySelector("main")!.textContent,
        p: Number.parseFloat(getComputedStyle(document.querySelector("main p")!).fontSize),
      };
    });
    expect(after.p, `${path}: text doubles`).toBeCloseTo(before.p * 2, 0);
    expect(after.text, `${path}: no content lost`).toBe(before.text);
    if (after.scroll > after.vw) report.push(`${path}: page is ${after.scroll}px wide`);
    report.push(...new Set(after.wide.map((problem) => `${path}: ${problem}`)));
  }
  expect(report).toEqual([]);
});

test("reduced motion: the key help opens without an animation and scrolling is not smooth", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, "/");
  const help = page.getByRole("dialog").filter({ has: page.locator("#kb-help-h") });
  // By its key: the hint in the colophon is not shown at this width.
  await expect(async () => {
    if (!(await help.isVisible())) await page.keyboard.press("?");
    await expect(help).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  const motion = await help.evaluate((dialog) => {
    const seconds = (value: string) =>
      Math.max(
        ...value
          .split(",")
          .map((part) => Number.parseFloat(part) * (part.includes("ms") ? 0.001 : 1)),
      );
    const style = getComputedStyle(dialog);
    return {
      animation: style.animationName === "none" ? 0 : seconds(style.animationDuration),
      transition: seconds(style.transitionDuration),
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
  expect(motion.animation).toBeLessThanOrEqual(0.01);
  expect(motion.transition).toBeLessThanOrEqual(0.01);
  expect(motion.scroll).toBe("auto");

  // The open dialog on a phone: inside the screen, with a full-size target to close it.
  const box = (await help.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  const size = (await help.getByRole("button", { name: "Close" }).boundingBox())!;
  expect(size.height).toBeGreaterThanOrEqual(44);
  expect(size.width).toBeGreaterThanOrEqual(44);
});

test("admin on a phone: no overflow, and every field is 16px so iOS does not zoom on focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of ["/admin", "/admin/projects/lincoln-project"]) {
    await page.goto(`${ADMIN_ORIGIN}${path}`);
    // Hydrated before the next goto, for the reason given at ready().
    await expect(page.locator('main[data-hydrated="true"]')).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    const result = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      vw: document.documentElement.clientWidth,
      small: [...document.querySelectorAll("input, select, textarea")]
        .filter((field) => Number.parseFloat(getComputedStyle(field).fontSize) < 16)
        .map((field) => field.id || field.className),
    }));
    expect(result.scroll, path).toBeLessThanOrEqual(result.vw);
    expect(result.small, path).toEqual([]);
  }
});

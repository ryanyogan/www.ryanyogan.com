import type { Page } from "@playwright/test";
import { expect, routes, test } from "./fixtures";

// What a reader sees on a first visit when the fonts are slow: the page is drawn in the
// fallback faces and stays in them, here and on the pages reached from it without a new
// document. Nothing that has been on screen changes its face or its box afterwards. The serif
// italic and semibold (styles/fonts.ts) join a page only where no reader can see them arrive.
//
// reload.spec.ts is the warm cache, Chromium only. This runs in Chromium and in WebKit, so it
// reads what both can report: a face shows in the widths of the text's line boxes, and the
// font files are held back with page.route.

/** How long each font file is held back, in ms: well past any browser's wait for a font. */
const DELAY = 1500;
const FONT = /\.woff2$/;
/** The files styles/fonts.ts loads from its script. */
const LATE = /-(400-italic|600-normal)-[^/]*\.woff2$/;

type Change = { t: number; what: string; from: string; to: string };
type Seen = {
  frames: number;
  changes: Change[];
  shift: number;
  fcp?: number;
  /** Faces on the page at the first frame, and now. */
  faces: number[];
};
type Watching = Window & { __seen: Seen; __watch: (element: Element) => void };

// Runs in the page before any of its own scripts. On every frame it reads each watched
// element: its box on the page and the widths of its text's line boxes. From the frame an
// element is first inside the window, both must stay as they were.
function watch() {
  const seen: Seen = { frames: 0, changes: [], shift: 0, faces: [] };
  const first = new WeakMap<Element, { text: string; state: string }>();
  const extra: Element[] = [];
  const page = window as unknown as Watching;
  page.__seen = seen;
  page.__watch = (element) => extra.push(element);

  const selectors = [
    "body > header a",
    "main h1",
    "main p",
    "main em",
    "main strong",
    "main blockquote",
    "main li",
    "body > footer",
  ];
  const round = (n: number) => Math.round(n * 100) / 100;
  const read = (element: Element, what: string) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return;
    const known = first.get(element);
    if (!known && (rect.bottom <= 0 || rect.top >= innerHeight)) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    const state = JSON.stringify({
      box: [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height].map(round),
      lines: [...range.getClientRects()].map((line) => round(line.width)),
    });
    // A new page puts what it shares with the last one (the footer) somewhere else.
    const text = location.pathname + (element.textContent ?? "");
    if (!known || known.text !== text) first.set(element, { text, state });
    else if (known.state !== state && seen.changes.length < 20) {
      seen.changes.push({ t: Math.round(performance.now()), what, from: known.state, to: state });
      first.set(element, { text, state });
    }
  };
  const frame = () => {
    seen.frames += 1;
    seen.faces = [seen.faces[0] ?? document.fonts.size, document.fonts.size];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) read(element, selector);
    }
    for (const element of extra) if (element.isConnected) read(element, "late");
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const types = PerformanceObserver.supportedEntryTypes ?? [];
  if (types.includes("layout-shift")) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) seen.shift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  }
  if (types.includes("paint")) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") seen.fcp = Math.round(entry.startTime);
      }
    }).observe({ type: "paint", buffered: true });
  }
}

const seen = (page: Page) => page.evaluate(() => (window as unknown as Watching).__seen);

const frames = (page: Page, count = 2) =>
  page.evaluate(
    (n) =>
      new Promise<void>((done) => {
        const step = (left: number) =>
          left ? requestAnimationFrame(() => step(left - 1)) : done();
        step(n);
      }),
    count,
  );

/** Whether text set in a web family is drawn with it, or with what follows it in the stack. */
const drawnInWebFont = (page: Page) =>
  page.evaluate(() => {
    const width = (family: string) => {
      const span = document.createElement("span");
      span.style.cssText = `position:absolute;white-space:nowrap;font:400 100px ${family}`;
      span.textContent = "The quick brown fox";
      document.body.appendChild(span);
      const measured = span.getBoundingClientRect().width;
      span.remove();
      return measured;
    };
    const none = width("monospace");
    return {
      sans: width('"Hanken Grotesk", monospace') !== none,
      serif: width('"Source Serif 4", monospace') !== none,
    };
  });

/** Hydrated: React has attached to the heading and the footer. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const attached = (element: Element | null) =>
      Boolean(element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")));
    return attached(document.querySelector("h1")) && attached(document.querySelector("footer"));
  });

/** The script in styles/fonts.ts has its two files (it notes that before it decides). */
const lateFontsLoaded = (page: Page) =>
  page.waitForFunction(() => localStorage.getItem("fonts") !== null, undefined, {
    timeout: 15_000,
  });

/** Down the page a window at a time and back, so that everything has been on screen. */
async function readThrough(page: Page) {
  const steps = await page.evaluate(() =>
    Math.ceil(document.documentElement.scrollHeight / innerHeight),
  );
  for (let step = 1; step <= steps; step += 1) {
    await page.evaluate((n) => scrollTo({ top: n * innerHeight, behavior: "instant" }), step);
    await frames(page);
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await frames(page);
}

/** Holds back the font files that match, and counts them. */
async function slowFonts(page: Page, pattern: RegExp) {
  const held = { asked: 0, arrived: 0 };
  await page.route(pattern, async (route) => {
    held.asked += 1;
    await new Promise((done) => setTimeout(done, DELAY));
    await route.continue().catch(() => {});
    held.arrived += 1;
  });
  return held;
}

/** The first serif italic or semibold text in the page's main column. */
const lateText = (page: Page) =>
  page.evaluateHandle(() => {
    for (const element of document.querySelectorAll("main *")) {
      if (![...element.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim()))
        continue;
      const style = getComputedStyle(element);
      if (!style.fontFamily.includes("Source Serif 4")) continue;
      if (style.fontStyle !== "italic" && Number(style.fontWeight) < 600) continue;
      if (element.getClientRects().length === 0) continue;
      (window as unknown as Watching).__watch(element);
      return element;
    }
    return null;
  });

const lateFaces = (page: Page) =>
  page.evaluate(
    () =>
      [...document.fonts].filter((face) => face.style === "italic" || face.weight === "600").length,
  );

for (const route of routes) {
  test(`first load of ${route} with slow fonts: nothing changes face or moves`, async ({
    page,
  }) => {
    const held = await slowFonts(page, FONT);
    await page.addInitScript(watch);

    await page.goto(route, { waitUntil: "commit" });
    await hydrated(page);
    await lateFontsLoaded(page);
    await page.evaluate(() => document.fonts.ready);
    await frames(page, 4);
    const before = await drawnInWebFont(page);
    await readThrough(page);
    const loaded = await seen(page);

    // Another page without a new document: the faces this document settled on are kept.
    const next = route === "/work" ? "/now" : "/work";
    await page.evaluate(
      (href) => document.querySelector<HTMLElement>(`header a[href="${href}"]`)?.click(),
      next,
    );
    await page.waitForURL((url) => url.pathname === next);
    await page.waitForTimeout(300);
    await frames(page, 4);
    const after = await drawnInWebFont(page);
    await readThrough(page);
    const end = await seen(page);

    test.info().annotations.push({
      type: "measure",
      description: JSON.stringify({
        fcp: loaded.fcp,
        fonts: held,
        web: before,
        afterNavigation: after,
        shift: loaded.shift,
        lateFaces: await lateFaces(page),
        changes: end.changes.slice(0, 3),
      }),
    });

    expect(held.arrived, "font files held back").toBeGreaterThanOrEqual(2);
    // The page was drawn while the fonts were still on their way, or this measures nothing.
    if (loaded.fcp !== undefined) expect(loaded.fcp, "first paint").toBeLessThan(DELAY);
    expect(end.changes, "text that changed face or moved after it was on screen").toEqual([]);
    expect(loaded.shift, "layout shift").toBe(0);
    // Too late for the first paint is too late for the whole visit, and the italic and
    // semibold do not join a page that is in the fallback roman.
    expect(before, "web fonts in use after a slow first load").toEqual({
      sans: false,
      serif: false,
    });
    expect(after, "web fonts in use after an in-app navigation").toEqual(before);
    expect(await lateFaces(page), "late faces added").toBe(0);
  });
}

test.describe("the serif italic and semibold arrive after the first paint", () => {
  // A post with both: emphasis and strong text in its body.
  const post = "/writing/building-agent-memory-from-research-to-reality";

  test("below the window they are added, and are there when the reader scrolls to them", async ({
    page,
  }) => {
    await slowFonts(page, LATE);
    await page.addInitScript(watch);
    await page.goto(post);
    await hydrated(page);
    const text = await lateText(page);
    expect(await text.evaluate((element) => element !== null), "the post has such text").toBe(true);
    // Whether the first of it is on the first screen depends on the window.
    const below = await text.evaluate(
      (element) => element!.getBoundingClientRect().top >= innerHeight,
    );
    expect(await lateFaces(page), "before the files arrive").toBe(0);

    await lateFontsLoaded(page);
    await page.evaluate(() => document.fonts.ready);
    await frames(page, 6);
    test.info().annotations.push({
      type: "measure",
      description: `first italic or semibold text is below the window: ${below}`,
    });
    expect(await lateFaces(page), "faces added").toBe(below ? 4 : 0);
    await readThrough(page);
    const end = await seen(page);
    expect(end.changes, "text that changed face or moved after it was on screen").toEqual([]);
    expect(end.shift, "layout shift").toBe(0);
  });

  test("in the window they are not added: the text keeps the face it was drawn in", async ({
    page,
  }) => {
    await slowFonts(page, LATE);
    await page.addInitScript(watch);
    await page.goto(post);
    await hydrated(page);
    const text = await lateText(page);
    await text.evaluate((element) =>
      element!.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await frames(page, 4);

    await lateFontsLoaded(page);
    await page.evaluate(() => document.fonts.ready);
    await frames(page, 6);
    await readThrough(page);
    const end = await seen(page);
    expect(await lateFaces(page), "faces added").toBe(0);
    expect(end.changes, "text that changed face or moved after it was on screen").toEqual([]);
  });

  test("once cached they are on the page from the first frame", async ({ page, browserName }) => {
    await page.goto(post);
    await hydrated(page);
    await lateFontsLoaded(page);
    await expect.poll(() => lateFaces(page), "faces added on the first visit").toBe(4);

    await page.addInitScript(watch);
    await page.reload();
    await hydrated(page);
    await expect.poll(() => lateFaces(page), "faces added on the second").toBe(4);
    await frames(page, 4);
    await readThrough(page);
    const end = await seen(page);
    test.info().annotations.push({
      type: "measure",
      description: `late faces on the page at the first frame: ${end.faces[0] === end.faces[1]}`,
    });
    expect(end.changes, "text that changed face or moved after it was on screen").toEqual([]);
    // Chromium holds the first frame for an `optional` face loaded from a script.
    if (browserName === "chromium")
      expect(end.faces[0], "faces at the first frame").toBe(end.faces[1]);
  });
});

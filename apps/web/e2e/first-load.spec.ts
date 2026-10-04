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
/** The files the stylesheet names and the document preloads: the two romans. */
const ROMAN = /-(wght-normal|400-normal)-[^/]*\.woff2$/;

type Change = { t: number; what: string; from: string; to: string };
type Seen = {
  frames: number;
  changes: Change[];
  shift: number;
  fcp?: number;
  /** Faces on the page at the first frame, and now. */
  faces: number[];
  /** The last time a watched text was laid out but not drawn (WebKit, below), in ms. */
  undrawn?: number;
};
type Watching = Window & { __seen: Seen; __watch: (element: Element) => void };

// Runs in the page before any of its own scripts. On every frame it reads each watched
// element: its box on the page and the widths of its text's line boxes. From the frame an
// element is first inside the window, both must stay as they were.
//
// `blocks` is WebKit: it gives an `optional` face 100 ms to arrive and until then draws no text
// set in that face's family (the text is laid out, in other metrics, and left blank), then keeps
// whichever face it has. So while such a face is loading the text is not on screen yet, though
// other things are and the first paint is reported. Chromium draws the fallback at once, and
// there a face that is loading hides nothing.
function watch(blocks: boolean) {
  const seen: Seen = { frames: 0, changes: [], shift: 0, faces: [] };
  const first = new WeakMap<Element, { text: string; state: string }>();
  const extra: Element[] = [];
  const start = location.pathname;
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
  const undrawn = (element: Element) => {
    if (!blocks) return false;
    const family = getComputedStyle(element).fontFamily;
    return [...document.fonts].some(
      (face) =>
        face.status === "loading" &&
        face.display === "optional" &&
        family.includes(face.family.replace(/["']/g, "")),
    );
  };
  const read = (element: Element, what: string) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return;
    const known = first.get(element);
    if (!known && (rect.bottom <= 0 || rect.top >= innerHeight)) return;
    // Only before it has been seen: text that was drawn and then waits on a face is held to
    // what it was.
    if (!known && undrawn(element)) {
      seen.undrawn = Math.round(performance.now());
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(element);
    // A new page puts what it shares with the last one (the header, the footer) at another
    // height, because the reader asked for it: from then on those are held to their face,
    // width and place across the page only.
    const shared = !what.startsWith("main") && location.pathname !== start;
    const top = shared ? 0 : rect.y + scrollY;
    const state = JSON.stringify({
      box: [rect.x + scrollX, top, rect.width, rect.height].map(round),
      lines: [...range.getClientRects()].map((line) => round(line.width)),
    });
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
    for (const element of extra) if (element.isConnected) read(element, "main, late");
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

const watching = (page: Page, browserName: string) =>
  page.addInitScript(watch, browserName === "webkit");

/**
 * What the watcher saw. A change is one the reader saw only if it came after the first paint:
 * WebKit lays the page out, and runs frames, before it has drawn anything.
 */
const seen = async (page: Page) => {
  const all = await page.evaluate(() => (window as unknown as Watching).__seen);
  const fcp = all.fcp;
  const unseen = fcp === undefined ? [] : all.changes.filter((change) => change.t <= fcp);
  return { ...all, changes: all.changes.filter((change) => !unseen.includes(change)), unseen };
};

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
    browserName,
  }) => {
    const held = await slowFonts(page, FONT);
    await watching(page, browserName);

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
    // (Chromium: WebKit's first paint, as it reports it, sometimes waits for the files.)
    if (browserName === "chromium") expect(loaded.fcp, "first paint").toBeLessThan(DELAY);
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
    browserName,
  }) => {
    await slowFonts(page, LATE);
    await watching(page, browserName);
    await page.goto("/work");
    await hydrated(page);
    const text = await lateText(page);
    expect(await text.evaluate((element) => element !== null), "the page has such text").toBe(true);
    // Whether the first of it is on the first screen depends on the window.
    const below = await text.evaluate(
      (element) => element!.getBoundingClientRect().top >= innerHeight,
    );
    expect(await lateFaces(page), "before the files arrive").toBe(0);

    await lateFontsLoaded(page);
    await page.evaluate(() => document.fonts.ready);
    await frames(page, 6);
    // Only the late files are held back here, but the romans are `optional` and the preview
    // server is shared with every other test: on a busy machine they can miss the first paint
    // too (seen in CI: 270 ms for a local file, WebKit, page drawn in the fallback faces).
    // Then the page is in the fallback roman for the visit and the script keeps the italic
    // and semibold out of it, which is what the tests above hold it to.
    const web = await drawnInWebFont(page);
    const added = await lateFaces(page);
    test.info().annotations.push({
      type: "measure",
      description: JSON.stringify({ below, web, added }),
    });
    if (web.serif)
      expect(added, "faces added, the page being in the web roman").toBe(below ? 4 : 0);
    else expect(added, "faces added, the page being in the fallback roman").toBe(0);
    await readThrough(page);
    const end = await seen(page);
    expect(end.changes, "text that changed face or moved after it was on screen").toEqual([]);
    expect(end.shift, "layout shift").toBe(0);
  });

  test("in the window they are not added: the text keeps the face it was drawn in", async ({
    page,
    browserName,
  }) => {
    await slowFonts(page, LATE);
    await watching(page, browserName);
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
    // This post has such text on its first screen, so a first visit leaves the faces out.
    await page.goto(post);
    await hydrated(page);
    await lateFontsLoaded(page);
    await page.evaluate(() => document.fonts.ready);
    await frames(page, 6);
    const firstVisit = await lateFaces(page);

    // A cached file is asked for at once and is usually there before the first frame, and
    // then the faces are in that frame. On a busy machine it is not always (seen in CI,
    // Chromium: the same page got them on some loads and not on others), nor is the roman
    // (see the first test here); then this text has been drawn without them and they stay
    // out. Every load is held to that: all four in the first frame, or none at all. That a
    // cached load does put them in the first frame is held too: the page is loaded again, a
    // few times at most, until one has.
    await watching(page, browserName);
    const visits: object[] = [];
    let inFirstFrame = false;
    for (let visit = 2; visit <= 6 && !inFirstFrame; visit += 1) {
      await page.reload();
      await hydrated(page);
      await page.evaluate(() => document.fonts.ready);
      await frames(page, 6);
      await readThrough(page);
      const end = await seen(page);
      const added = await lateFaces(page);
      const web = await drawnInWebFont(page);
      const atFirstFrame = end.faces[0] === end.faces[1];
      visits.push({
        visit,
        added,
        atFirstFrame,
        fcp: end.fcp,
        undrawnUntil: end.undrawn,
        web,
        changedBeforeFirstPaint: end.unseen.length,
        changes: end.changes.slice(0, 2),
      });
      expect(
        end.changes,
        `visit ${visit}: text that changed face or moved after it was on screen`,
      ).toEqual([]);
      expect([0, 4], `visit ${visit}: faces added`).toContain(added);
      if (browserName === "chromium") {
        expect(end.faces[0], `visit ${visit}: faces at the first frame`).toBe(end.faces[1]);
      }
      inFirstFrame = added === 4 && atFirstFrame;
    }
    test.info().annotations.push({
      type: "measure",
      description: JSON.stringify({ firstVisit, visits }),
    });
    expect(firstVisit, "faces added on the first visit").toBe(0);
    // Chromium holds the first frame for an `optional` face loaded from a script, so the
    // faces are in it. Another engine may draw first, and then leaves them out again.
    if (browserName === "chromium") {
      expect(inFirstFrame, "a cached load with the faces in its first frame").toBe(true);
    }
  });

  test("once cached, a roman that misses the first paint keeps them out", async ({
    page,
    browserName,
  }) => {
    // The first visit leaves the note that the two files are cached, so on the next load the
    // script asks for them at once and has them before the first frame.
    await page.goto(post);
    await hydrated(page);
    await lateFontsLoaded(page);
    await page.evaluate(() => document.fonts.ready);

    // That next load, with only the romans late: the page is in the fallback roman for the
    // visit, and the web italic and semibold must not be set beside it.
    const held = await slowFonts(page, ROMAN);
    await watching(page, browserName);
    await page.reload({ waitUntil: "commit" });
    await hydrated(page);
    // What the script's own question ("is the web roman the face in use") reads while the
    // romans are on their way, and what the page has by then.
    const during = { web: await drawnInWebFont(page), added: await lateFaces(page) };
    await expect.poll(() => held.arrived, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    await page.evaluate(() => document.fonts.ready);
    await frames(page, 6);
    const web = await drawnInWebFont(page);
    const added = await lateFaces(page);
    const noted = await page.evaluate(() => localStorage.getItem("fonts") !== null);
    await readThrough(page);
    const end = await seen(page);
    test.info().annotations.push({
      type: "measure",
      description: JSON.stringify({
        fcp: end.fcp,
        fonts: held,
        during,
        web,
        added,
        facesAtFirstFrame: end.faces[0],
        noted,
        shift: end.shift,
        changes: end.changes.slice(0, 2),
      }),
    });

    expect(web, "web fonts in use, the romans having missed the first paint").toEqual({
      sans: false,
      serif: false,
    });
    expect(added, "late faces beside the fallback roman").toBe(0);
    expect(end.changes, "text that changed face or moved after it was on screen").toEqual([]);
    expect(end.shift, "layout shift").toBe(0);
  });
});

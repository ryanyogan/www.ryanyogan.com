import type { CDPSession, Page } from "@playwright/test";
import { expect, routes, test } from "./fixtures";

// What a reader sees when they reload a page they have already loaded (a warm cache): which
// files the browser asks the network for again, whether any text is drawn in a fallback face
// before the web font, and how far the heading and the first paragraph move. Lighthouse loads
// each page once with an empty cache, so it sees none of this.
//
// Chromium only (it needs the DevTools protocol), at desktop and phone size. The runner is
// Linux without Arial or Georgia, which is the case that matters: the fallback faces in
// styles/fonts.css must hold there too. Each test adds its numbers to the report as a
// "measure" annotation, which `pnpm test:e2e` prints (scripts/e2e-run.mjs).

/** One round trip to the server, in ms, while reloading: on localhost a revalidation is free. */
const LATENCY = 100;

type Box = [x: number, y: number, width: number, height: number];
type Target = { box: Box; face: string; ready: boolean };
type Frame = { t: number; h1?: Target; p?: Target };
type Seen = {
  frames: Frame[];
  shifts: { t: number; value: number; nodes: string[] }[];
  paints: Record<string, number>;
};

// Runs in the page before any of its own scripts. On every animation frame it reads the
// heading and the first paragraph: the box, the face asked for and whether that face is
// loaded. A frame is kept only when something changed.
function watch() {
  const seen: Seen = { frames: [], shifts: [], paints: {} };
  (window as unknown as { __seen: Seen }).__seen = seen;

  const name = (node: Node | null) => {
    const element = node instanceof Element ? node : node?.parentElement;
    if (!element) return "?";
    const cls = typeof element.className === "string" ? element.className.split(" ")[0] : "";
    return element.tagName.toLowerCase() + (cls ? `.${cls}` : "");
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
      sources: { node: Node | null }[];
    })[]) {
      if (entry.hadRecentInput) continue;
      seen.shifts.push({
        t: Math.round(entry.startTime),
        value: entry.value,
        nodes: entry.sources.map((source) => name(source.node)),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) seen.paints[entry.name] = Math.round(entry.startTime);
  }).observe({ type: "paint", buffered: true });

  const read = (selector: string): Target | undefined => {
    const element = document.querySelector(selector);
    if (!element) return undefined;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const face = `${style.fontStyle} ${style.fontWeight} 16px ${style.fontFamily.split(",")[0]}`;
    return {
      box: [rect.x, rect.y, rect.width, rect.height].map((n) => Math.round(n * 10) / 10) as Box,
      face,
      ready: document.fonts.check(face),
    };
  };
  let last = "";
  const frame = () => {
    const now = { h1: read("main h1"), p: read("main p") };
    const key = JSON.stringify(now);
    if (key !== last && (now.h1 || now.p)) {
      last = key;
      seen.frames.push({ t: Math.round(performance.now()), ...now });
    }
    if (performance.now() < 10_000) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

type Fetched = { url: string; type: string; status?: number; cached: boolean; cache?: string };

/** Every request the page makes, with whether the HTTP cache answered it. */
async function network(client: CDPSession): Promise<Map<string, Fetched>> {
  const requests = new Map<string, Fetched>();
  await client.send("Network.enable");
  client.on("Network.requestWillBeSent", (event) => {
    requests.set(event.requestId, {
      url: event.request.url,
      type: event.type ?? "Other",
      cached: false,
    });
  });
  client.on("Network.requestServedFromCache", (event) => {
    const request = requests.get(event.requestId);
    if (request) request.cached = true;
  });
  client.on("Network.responseReceived", (event) => {
    const request = requests.get(event.requestId);
    if (!request) return;
    request.status = event.response.status;
    if (event.response.fromDiskCache || event.response.fromPrefetchCache) request.cached = true;
    const header = Object.entries(event.response.headers).find(
      ([key]) => key.toLowerCase() === "cache-control",
    );
    request.cache = header?.[1];
  });
  return requests;
}

/** The fonts the browser drew an element's text with, as "family (web)" or "family (local)". */
async function drawnWith(client: CDPSession, selector: string): Promise<string[]> {
  const { root } = await client.send("DOM.getDocument");
  const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) return [];
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
  return fonts.map((font) => `${font.familyName} (${font.isCustomFont ? "web" : "local"})`);
}

/** Hydrated, fonts settled and, on the writing pages, the view counts drawn. */
async function settled(page: Page, path: string, load: () => Promise<unknown>) {
  const counts = path.startsWith("/writing")
    ? page.waitForResponse((response) => new URL(response.url()).pathname.startsWith("/api/views"))
    : undefined;
  await load();
  await page.waitForFunction(() => {
    const attached = (element: Element | null) =>
      Boolean(element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")));
    return attached(document.querySelector("h1")) && attached(document.querySelector("footer"));
  });
  await page.evaluate(() => document.fonts.ready);
  if (counts) await (await counts).finished();
  // The keyboard layer and anything else that waits for an idle moment.
  await page.waitForTimeout(500);
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

/** The faces of the text inside the first screen, as "family weight style". */
function firstScreenFaces(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const faces = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || !node.textContent?.trim()) continue;
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight || rect.width < 2 || rect.height < 2)
        continue;
      if (rect.right <= 0 || rect.left >= innerWidth) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden") continue;
      const family = style.fontFamily.split(",")[0].replaceAll('"', "");
      faces.add(`${family} ${style.fontWeight} ${style.fontStyle}`);
    }
    return [...faces].sort();
  });
}

/** The largest change of any edge of a target's box from one kept frame to the next, in px. */
function movement(frames: Frame[], target: "h1" | "p"): number {
  let most = 0;
  const boxes = frames.flatMap((frame) => (frame[target] ? [frame[target].box] : []));
  for (let i = 1; i < boxes.length; i += 1) {
    most = Math.max(most, ...boxes[i].map((n, edge) => Math.abs(n - boxes[i - 1][edge])));
  }
  return Math.round(most * 10) / 10;
}

const short = (url: string) => new URL(url).pathname.replace(/^\/assets\//, "");

for (const [size, viewport] of [
  ["desktop", { width: 1280, height: 720 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(size, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`reload of ${route}`, async ({ page }) => {
        const client = await page.context().newCDPSession(page);
        const requests = await network(client);
        await client.send("DOM.enable");
        await client.send("CSS.enable");
        await page.addInitScript(watch);

        await settled(page, route, () => page.goto(route));
        const first = [...requests.values()];
        const firstFonts = await drawnWith(client, "main p");

        requests.clear();
        await client.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: LATENCY,
          downloadThroughput: -1,
          uploadThroughput: -1,
        });
        await settled(page, route, () => page.reload());

        const seen = await page.evaluate(() => (window as unknown as { __seen: Seen }).__seen);
        const again = [...requests.values()].filter((request) => request.url.startsWith("http"));
        const fromNetwork = again.filter((request) => !request.cached);
        const fallback = seen.frames.filter(
          (frame) => frame.h1?.ready === false || frame.p?.ready === false,
        );
        const shift = seen.shifts.reduce((sum, entry) => sum + entry.value, 0);

        const measure = {
          network: fromNetwork.map(
            (request) => `${short(request.url)} ${request.status} [${request.cache ?? "-"}]`,
          ),
          cached: again.length - fromNetwork.length,
          assetCache: [
            ...new Set(
              first
                .filter((request) => new URL(request.url).pathname.startsWith("/assets/"))
                .map((request) => request.cache ?? "-"),
            ),
          ],
          fcp: seen.paints["first-contentful-paint"],
          fallbackFrames: fallback.map((frame) => frame.t),
          frames: seen.frames.length,
          shift: Math.round(shift * 10000) / 10000,
          shifted: [...new Set(seen.shifts.flatMap((entry) => entry.nodes))],
          moved: { h1: movement(seen.frames, "h1"), p: movement(seen.frames, "p") },
          drawn: {
            first: firstFonts,
            h1: await drawnWith(client, "main h1"),
            p: await drawnWith(client, "main p"),
          },
          faces: await firstScreenFaces(page),
        };
        test.info().annotations.push({ type: "measure", description: JSON.stringify(measure) });

        // The numbers above are the point; these only say the page was there to measure.
        expect(seen.frames.length, "the heading was seen").toBeGreaterThan(0);
        expect(again.length, "the reload made requests").toBeGreaterThan(0);
      });
    }
  });
}

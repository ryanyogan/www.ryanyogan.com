import type { Page } from "@playwright/test";
import { expect } from "./fixtures";

// Which faces a page is drawn in, said outright. The two romans are `optional`
// (styles/fonts.css): one that misses the first paint is not used for the whole visit, and the
// page stays in the fallback faces at the foot of that file. On a busy machine that happens to
// a test now and then, so a test that measures text says which page it means and loads that
// one: `inWebFaces` or `inFallbackFaces`. (e2e/visual.spec.ts has its own copy of the first,
// which also waits for the italic and semibold; its pictures depend on it and it is left alone.)

const FONT_FILE = /\.woff2(\?.*)?$/;

/** Whether text set in each web family is drawn with it. A face shows in the width of a line. */
export const romans = (page: Page) =>
  page.evaluate(() => {
    const width = (family: string) => {
      const span = document.createElement("span");
      span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:400 100px ${family}`;
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
      loading: [...document.fonts].filter((face) => face.status === "loading").length,
    };
  });

const WEB = { sans: true, serif: true, loading: 0 };
const FALLBACK = { sans: false, serif: false, loading: 0 };

/**
 * Opens `path` drawn in the two web romans, as a reader with the files in their cache has it.
 * The first load in a context puts every font file in the cache (the script in styles/fonts.ts
 * notes it in localStorage once its two are there); a load that still missed the romans is
 * loaded again, now from the cache. Returns the number of loads it took.
 */
export async function inWebFaces(page: Page, path: string): Promise<number> {
  let loads = 1;
  await page.goto(path);
  await page.waitForFunction(() => localStorage.getItem("fonts") !== null);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  if (JSON.stringify(await romans(page)) === JSON.stringify(WEB)) return loads;
  await expect(async () => {
    loads += 1;
    await page.reload();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect.poll(() => romans(page), { timeout: 2000 }).toEqual(WEB);
  }, "drawn in the web romans").toPass({ timeout: 45_000 });
  return loads;
}

/** How long a font file is held back: far past the moment a browser waits for an `optional` face. */
const HELD = 1500;

/**
 * Opens `path` drawn in the fallback faces, as a reader whose fonts missed the first paint has
 * it for that visit: every font file arrives late (not never: a failed request is a console
 * error, which fails a test). For the rest of the test the page's fonts are late.
 */
export async function inFallbackFaces(page: Page, path: string): Promise<void> {
  await page.unroute(FONT_FILE);
  await page.route(FONT_FILE, async (route) => {
    await new Promise((done) => setTimeout(done, HELD));
    await route.continue().catch(() => {});
  });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect.poll(() => romans(page), { timeout: 5000 }).toEqual(FALLBACK);
}

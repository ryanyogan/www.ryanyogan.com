import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Home and one post against committed pictures (e2e/baselines/<page>-<width>-<scheme>.png):
// four widths, light and dark, at most 1% of the pixels different. Chromium only, and only as
// the GitHub runner draws it (ubuntu-latest): text is drawn differently on every other system,
// so the pictures are never made or compared on a developer's machine.
//
// After a change that is meant to be seen (new copy, a photo, a layout change):
//   1. Push the pull request. `validate` fails here; its `playwright-report` artifact has the
//      expected, actual and diff pictures of each mismatch (test-results/).
//   2. The same run's "Screenshots" step has redrawn the pictures that no longer match (and
//      any that are missing) and uploaded all of them as the `baselines` artifact. From the
//      repository root:
//        gh run download <run id> -n baselines -D apps/web/e2e/baselines
//   3. Look at what `git status` says changed, commit those files, push. A picture that still
//      matches comes back byte for byte, so only the changed ones show up.
// To add a page or a width, add it below and do the same: a missing picture fails `validate`.
//
// Home is the whole page: it is short, and it is the page that changes. The post is its first
// screen only (heading, meta line with the view count, the start of the body): a whole post is
// over a megabyte per picture, and what its body looks like is prose.spec.ts's to hold.
//
// The file name sorts last on purpose: these tests are slow (each loads its page twice or
// more), and cache.spec.ts expects to run within a minute of the suite's first requests.

const WIDTHS = [320, 393, 768, 1280];
const HEIGHT = 900;
/** The window while the page loads: too short to have any body text in it. See the test. */
const LOADING_HEIGHT = 32;
const POST = "lincoln-six-months-later";
/** What the stubbed /api/views answers: the real count grows with every test that opens a post. */
const VIEWS = 1204;

const pages = [
  { name: "home", path: "/", fullPage: true },
  { name: "post", path: `/writing/${POST}`, fullPage: false },
];

/**
 * Which faces the page is drawn in. The romans are `optional` (styles/fonts.css): one that
 * misses the first paint is not used for the whole visit, and then the serif italic and
 * semibold (styles/fonts.ts) stay out too. A face shows in the width of a line of text.
 */
const faces = (page: Page) =>
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
    const all = [...document.fonts];
    return {
      sans: width('"Hanken Grotesk", monospace') !== none,
      serif: width('"Source Serif 4", monospace') !== none,
      late: all.filter(
        (face) =>
          face.family.includes("Source Serif 4") &&
          (face.style === "italic" || face.weight === "600"),
      ).length,
      loading: all.filter((face) => face.status === "loading").length,
    };
  });

/** Hydrated: React has attached to the heading and the footer. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const attached = (element: Element | null) =>
      Boolean(element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")));
    return attached(document.querySelector("h1")) && attached(document.querySelector("footer"));
  });

/** Down the page a window at a time and back, so an image that loads when it is near does. */
async function readThrough(page: Page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((done) => requestAnimationFrame(done));
    const steps = Math.ceil(document.documentElement.scrollHeight / innerHeight);
    for (let step = 1; step <= steps; step += 1) {
      scrollTo({ top: step * innerHeight, behavior: "instant" });
      await frame();
    }
    scrollTo({ top: 0, behavior: "instant" });
    await frame();
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of WIDTHS) {
    test.describe(`${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: HEIGHT },
        colorScheme,
        // The view count fades in for a reader who has not asked for less motion.
        reducedMotion: "reduce",
        locale: "en-US",
        timezoneId: "UTC",
      });

      for (const { name, path, fullPage } of pages) {
        test(`${name} looks as committed`, async ({ page }) => {
          test.setTimeout(90_000);
          await page.route(
            (url) => url.pathname.startsWith("/api/views"),
            (route) =>
              route.fulfill({
                json: { views: route.request().method() === "POST" ? VIEWS : {} },
                headers: { "Cache-Control": "no-store" },
              }),
          );

          // The first load puts every font file in the cache (the script in styles/fonts.ts
          // notes it once its two are there). A reload then has the romans before its first
          // frame; one that does not, on a busy machine, is loaded again.
          //
          // The italic and semibold join a page whenever none of their text is in the window,
          // and otherwise only if they beat the first frame, which a cached file does on some
          // loads and not on others. So the page loads in a window that shows none of its
          // text, and is given its real height afterwards: always the faces themselves, as a
          // returning reader has them, never the roman slanted or thickened by the browser.
          await page.setViewportSize({ width, height: LOADING_HEIGHT });
          await page.goto(path);
          await page.waitForFunction(() => localStorage.getItem("fonts") !== null);
          let loads = 1;
          await expect(async () => {
            loads += 1;
            await page.reload();
            await page.evaluate(() => document.fonts.ready);
            await expect
              .poll(() => faces(page), { timeout: 2000 })
              .toEqual({ sans: true, serif: true, late: 4, loading: 0 });
          }, "drawn in the web faces, the italic and semibold among them").toPass({
            timeout: 45_000,
          });
          test.info().annotations.push({ type: "measure", description: `loads: ${loads}` });

          await page.setViewportSize({ width, height: HEIGHT });
          await hydrated(page);
          if (!fullPage) {
            await expect(page.locator(".post-meta .views")).toHaveText(
              `${VIEWS.toLocaleString("en-US")} views`,
            );
          }
          if (fullPage) await readThrough(page);
          await expect
            .poll(() => page.evaluate(() => [...document.images].every((image) => image.complete)))
            .toBe(true);
          await page.evaluate(() => document.fonts.ready);
          expect(await faces(page), "faces at the time of the picture").toEqual({
            sans: true,
            serif: true,
            late: 4,
            loading: 0,
          });

          await expect(page).toHaveScreenshot(`${name}-${width}-${colorScheme}.png`, {
            fullPage,
            animations: "disabled",
            caret: "hide",
            maxDiffPixelRatio: 0.01,
          });
        });
      }
    });
  }
}

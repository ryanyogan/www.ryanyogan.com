import { test } from "@playwright/test";

// Not a test: what Safari's engine draws where it could differ from Chromium, written to
// apps/web/screenshots/webkit-*.png by the "shots-webkit" project (playwright.shots.config.ts).
// The drawings that move, twice each and two seconds apart, enlarged three times as in
// screenshots.shots.ts; then the pages that carry them, the top only, at 1280 and in a wide
// window.
test.describe("motion", () => {
  test.use({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3 });

  for (const [name, path, art] of [
    ["lake", "/", ".lake .art"],
    ["rink", "/", ".rink"],
    ["org", "/work", ".org"],
    ["sheet", "/writing", ".sheet"],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const drawing = page.locator(art);
      await drawing.scrollIntoViewIfNeeded();
      await drawing.screenshot({ path: `screenshots/webkit-motion-${name}-a.png` });
      await page.waitForTimeout(2000);
      await drawing.screenshot({ path: `screenshots/webkit-motion-${name}-b.png` });
    });
  }
});

for (const width of [1280, 1920]) {
  test.describe(`${width}`, () => {
    test.use({ viewport: { width, height: 1000 } });

    for (const [name, path] of [
      ["home", "/"],
      ["work", "/work"],
      ["writing", "/writing"],
    ] as const) {
      test(name, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `screenshots/webkit-${name}-${width}-light.png` });
      });
    }
  });
}

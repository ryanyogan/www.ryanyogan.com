import { expect, test } from "@playwright/test";

// Not a test: one full-page PNG per page, width and colour scheme, written to
// apps/web/screenshots/<page>-<width>-<scheme>.png (playwright.shots.config.ts).
const pages: [name: string, path: string][] = [
  ["home", "/"],
  ["work", "/work"],
  ["projects", "/projects"],
  ["writing", "/writing"],
  ["now", "/now"],
  ["post", "/writing/lincoln-six-months-later"],
  ["project", "/projects/mnemosyne"],
];

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${width} ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme });

      for (const [name, path] of pages) {
        test(name, async ({ page }) => {
          await page.goto(path);
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({
            path: `screenshots/${name}-${width}-${colorScheme}.png`,
            fullPage: true,
          });
        });
      }
    });
  }
}

// The open phone menu, which no page shot shows.
test.describe("menu", () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test("open", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const menu = page.getByRole("button", { name: "Menu" });
    // The click handler is attached on hydration.
    await expect(async () => {
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true", { timeout: 500 });
    }).toPass();
    await page.screenshot({ path: "screenshots/menu-390-light.png" });
  });
});

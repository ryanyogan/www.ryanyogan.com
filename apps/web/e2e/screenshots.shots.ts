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

// /now on a tablet as well: its drawings sit above their sections until there is room beside.
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`768 ${colorScheme}`, () => {
    test.use({ viewport: { width: 768, height: 900 }, colorScheme });

    test("now", async ({ page }) => {
      await page.goto("/now");
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `screenshots/now-768-${colorScheme}.png`, fullPage: true });
    });
  });
}

// The header drawings on Work and Writing in a wide window (they show from 1280 up): the top
// of the page only, since that is where they sit.
for (const width of [1920, 2560]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${width} ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme });

      for (const name of ["work", "writing"]) {
        test(name, async ({ page }) => {
          await page.goto(`/${name}`);
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `screenshots/${name}-${width}-${colorScheme}.png` });
        });
      }
    });
  }
}

// Ticket A1: the drawings that move, twice each, two seconds apart (half the fade's period, a
// quarter of the dash's), enlarged three times so the difference can be seen in a still.
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
      await drawing.screenshot({ path: `screenshots/motion-${name}-a.png` });
      await page.waitForTimeout(2000);
      await drawing.screenshot({ path: `screenshots/motion-${name}-b.png` });
    });
  }
});

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

// The site icon (src/lib/icon.ts) as a browser shows it, since no page shot can: one picture,
// the light scheme above the dark. In each half: /favicon.svg at 512; then at 16, 32 and 180
// with /favicon.ico between; the 16 and the 32 again enlarged pixel for pixel (8 and 4 times);
// /apple-touch-icon.png with corners rounded as iOS does, and the small sizes on the other
// scheme's paper. This is where a change to the mark is looked at.
test("icon", async ({ page }) => {
  const PAPER = { light: "#f6f5f1", dark: "#1c1e1f" };
  await page.setViewportSize({ width: 900, height: 532 });
  const halves: string[] = [];
  for (const scheme of ["light", "dark"] as const) {
    const other = scheme === "light" ? "dark" : "light";
    await page.emulateMedia({ colorScheme: scheme });
    // A real page of the site first: the icon URLs below are relative to it.
    await page.goto("/robots.txt");
    await page.setContent(`
      <body style="margin:0;padding:10px;display:flex;gap:18px;background:${PAPER[scheme]}">
        <img src="/favicon.svg" width="512" height="512">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <img src="/favicon.svg" width="16" height="16">
            <img src="/favicon.svg" width="32" height="32">
            <img src="/favicon.ico" width="32" height="32">
            <img src="/favicon.svg" width="180" height="180">
          </div>
          <div style="display:flex;gap:12px">
            <canvas width="16" height="16"></canvas>
            <canvas width="32" height="32"></canvas>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start">
            <img src="/apple-touch-icon.png" width="180" height="180" style="border-radius:40px">
            <div style="display:flex;gap:12px;padding:12px;background:${PAPER[other]}">
              <img src="/favicon.svg" width="16" height="16">
              <img src="/favicon.svg" width="32" height="32">
            </div>
          </div>
        </div>
      </body>`);
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    );
    await page.evaluate(() => {
      const icon = document.images[0];
      for (const canvas of document.querySelectorAll("canvas")) {
        canvas.style.cssText = "width:128px;height:128px;image-rendering:pixelated";
        canvas.getContext("2d")?.drawImage(icon, 0, 0, canvas.width, canvas.height);
      }
    });
    halves.push((await page.screenshot()).toString("base64"));
  }
  await page.setViewportSize({ width: 900, height: 1064 });
  await page.setContent(
    `<body style="margin:0">${halves
      .map((half) => `<img src="data:image/png;base64,${half}" style="display:block">`)
      .join("")}</body>`,
  );
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.screenshot({ path: "screenshots/icon.png" });
});

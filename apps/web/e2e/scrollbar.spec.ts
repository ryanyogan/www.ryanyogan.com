import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// An open dialog stops the page scrolling. Where a scrollbar takes space (Chromium and Firefox
// on Linux and Windows) that used to take the scrollbar away, widen the page by its width and
// move everything sideways, and back on close. The space is now kept (`scrollbar-gutter` in
// styles/app.css), so nothing under the dialog moves.
//
// Headless Chromium is started with --hide-scrollbars, under which no scrollbar takes space
// and this would pass whatever the stylesheet said. The flag is dropped here, each test first
// checks that the scrollbar is as wide as a real one, and the last test turns the fix off and
// expects the jump.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

type Box = [x: number, y: number, width: number, height: number];
type Layout = { scrollY: number; boxes: Record<string, Box> };

/** Where the page's fixed points are, in page coordinates. */
const layout = (page: Page): Promise<Layout> =>
  page.evaluate(() => {
    const boxes: Record<string, Box> = {};
    for (const selector of [
      "body > header",
      "header a",
      ".header-tools",
      "main h1",
      "main p",
      "body > footer",
    ]) {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      boxes[selector] = [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height];
    }
    return { scrollY, boxes };
  });

/**
 * The space the scrollbar takes: the window's width less the header's, which spans the page.
 * (Not clientWidth, which counts the kept space once the scrollbar itself is gone.)
 */
const scrollbar = (page: Page) =>
  page.evaluate(
    () => innerWidth - document.querySelector("body > header")!.getBoundingClientRect().width,
  );

const dialogs = {
  search: { key: "/", find: (page: Page) => page.getByRole("dialog", { name: "Search the site" }) },
  help: {
    key: "?",
    find: (page: Page) => page.getByRole("dialog").filter({ has: page.locator("#kb-help-h") }),
  },
};

/** The key handler is attached on hydration, so retry the key until the dialog answers. */
async function open(page: Page, name: keyof typeof dialogs) {
  const dialog = dialogs[name].find(page);
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.keyboard.press(dialogs[name].key);
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  return dialog;
}

for (const name of ["search", "help"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`the ${name} dialog opens and closes without moving the page, ${theme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/work");
      // Focus on a link at the top, then down the page: closing hands focus back to the
      // link, which must not bring the page back up with it.
      await page.locator("header a").first().focus();
      await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" }));

      const before = await layout(page);
      expect(await scrollbar(page), "a scrollbar that takes space").toBeGreaterThan(8);
      expect(before.scrollY).toBe(400);

      const dialog = await open(page, name);
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).overflowY),
        "the page is held while the dialog is open",
      ).toBe("hidden");
      expect(await layout(page), "while open").toEqual(before);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(page.locator("header a").first()).toBeFocused();
      expect(await layout(page), "after closing").toEqual(before);
    });
  }
}

test("a page too short to scroll keeps the same space, and stays centred", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/now");
  const long = await layout(page);
  const space = await scrollbar(page);
  expect(space).toBeGreaterThan(8);
  await page.setViewportSize({ width: 1280, height: 6000 });
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
    "the page does not scroll",
  ).toBe(true);
  const short = await layout(page);
  expect(await scrollbar(page)).toBe(space);
  for (const selector of ["body > header", "header a", ".header-tools", "main h1"]) {
    const [x, , width] = short.boxes[selector];
    expect([x, width], selector).toEqual([long.boxes[selector][0], long.boxes[selector][2]]);
  }

  const dialog = await open(page, "search");
  expect(await layout(page), "while open").toEqual(short);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("without the kept space the page does jump: this test can fail", async ({ page }) => {
  await page.goto("/work");
  await page.addStyleTag({ content: "html { scrollbar-gutter: auto !important; }" });
  const before = await layout(page);
  const space = await scrollbar(page);
  expect(space).toBeGreaterThan(8);
  await open(page, "search");
  const during = await layout(page);
  expect(await scrollbar(page)).toBe(0);
  expect(during.boxes["body > header"][2]).toBe(before.boxes["body > header"][2] + space);
  expect(during.boxes[".header-tools"][0]).not.toBe(before.boxes[".header-tools"][0]);
});

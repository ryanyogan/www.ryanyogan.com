import { expect, test } from "./fixtures";

// Runs only in the "mobile" project (390x844, touch) and the "webkit" project (iPhone 14): the
// masthead's section row at phone width. There is no menu: the four sections and Search (an
// icon there) are one row under the name.

test("the sections are one row of links under the masthead, with no menu to open", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toHaveCount(0);
  const links = nav.getByRole("link");
  await expect(links).toHaveText(["Work", "Projects", "Writing", "Now"]);
  const boxes = await Promise.all(
    [...(await links.all()), nav.getByRole("button", { name: "Search", exact: true })].map(
      async (item) => (await item.boundingBox())!,
    ),
  );
  let left = 0;
  for (const box of boxes) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(Math.abs(box.y - boxes[0]!.y)).toBeLessThan(1);
    expect(box.x).toBeGreaterThanOrEqual(left - 0.5);
    left = box.x + box.width;
  }
  expect(left).toBeLessThanOrEqual(390);
});

test("the section links navigate and mark the current page", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Sections" });
  for (const [name, path] of [
    ["Projects", "/projects"],
    ["Writing", "/writing"],
    ["Work", "/work"],
    ["Now", "/now"],
  ] as const) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(`#site-nav a[href="${path}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("search and the theme toggle are reachable at phone width", async ({ page }) => {
  await page.goto("/projects");
  const search = page.getByRole("button", { name: "Search", exact: true });
  await expect(search).toBeVisible();
  const palette = page.getByRole("dialog", { name: "Search the site" });
  await expect(async () => {
    if (!(await palette.isVisible())) await search.click();
    await expect(palette).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  const box = await palette.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await page.keyboard.press("Escape");
  await expect(palette).toBeHidden();
  // The toggle is in the colophon, at the foot of the page.
  await expect(page.getByRole("button", { name: /^Colour theme/ })).toBeVisible();
});

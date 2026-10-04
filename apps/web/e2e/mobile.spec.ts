import { expect, test } from "./fixtures";

// Runs only in the "mobile" project (390x844, touch) and the "webkit" project (iPhone 14): the
// header collapses to a Menu button (an icon, named "Menu").

test("the mobile menu opens, moves focus in, and Escape closes it and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeHidden();
  await expect(button).toHaveAttribute("aria-expanded", "false");

  // The click handler is attached on hydration.
  await expect(async () => {
    if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link").first()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("the mobile menu navigates and closes itself", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const [name, path] of [
    ["Projects", "/projects"],
    ["Writing", "/writing"],
    ["Work", "/work"],
    ["Now", "/now"],
  ] as const) {
    await expect(async () => {
      if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
      await expect(nav).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(nav).toBeHidden();
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
  await expect(page.getByRole("button", { name: /^Colour theme/ })).toBeVisible();
});

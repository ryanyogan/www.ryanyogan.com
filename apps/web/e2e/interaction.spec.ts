import type { Page } from "@playwright/test";
import { draft, expect, test } from "./fixtures";

/** The key handler is attached on hydration, so retry the keys until it answers. */
async function untilHydrated(action: () => Promise<void>) {
  await expect(action).toPass({ timeout: 15_000 });
}

async function openPalette(page: Page) {
  const palette = page.getByRole("dialog", { name: "Search the site" });
  await untilHydrated(async () => {
    if (!(await palette.isVisible())) await page.keyboard.press("/");
    await expect(palette).toBeVisible({ timeout: 1000 });
  });
  return palette;
}

test("/ opens the palette; a project name and Enter navigate to it", async ({ page }) => {
  await page.goto("/");
  const palette = await openPalette(page);
  const input = palette.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("Lincoln");
  await expect(palette.getByRole("option").first()).toContainText("Lincoln");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/lincoln-project$/);
  await expect(palette).toBeHidden();
});

test("the palette does not find an unpublished project", async ({ page }) => {
  await page.goto("/");
  const palette = await openPalette(page);
  const input = palette.getByRole("combobox");
  // The index has loaded once a published project can be found.
  await input.fill("Lincoln");
  await expect(palette.getByRole("option").first()).toContainText("Lincoln");
  for (const query of [draft.title, draft.marker, draft.slug]) {
    await input.fill(query);
    await expect(palette.getByText(`Nothing matches “${query}”.`)).toBeVisible();
    await expect(palette.getByRole("option")).toHaveCount(0);
  }
});

test("Escape closes the palette and restores focus", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("link", { name: "Projects", exact: true }).first();
  await opener.focus();
  const palette = await openPalette(page);
  await page.keyboard.press("Escape");
  await expect(palette).toBeHidden();
  await expect(opener).toBeFocused();
});

test("g then p goes to /projects", async ({ page }) => {
  await page.goto("/");
  await untilHydrated(async () => {
    await page.keyboard.press("g");
    await page.keyboard.press("p");
    await expect(page).toHaveURL(/\/projects$/, { timeout: 1000 });
  });
  await expect(page.locator("h1")).toHaveCount(1);
});

test("? opens help", async ({ page }) => {
  await page.goto("/");
  const help = page.getByRole("dialog").filter({ has: page.locator("#kb-help-h") });
  await untilHydrated(async () => {
    if (!(await help.isVisible())) await page.keyboard.press("?");
    await expect(help).toBeVisible({ timeout: 1000 });
  });
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
});

for (const [stored, scheme, icon] of [
  [null, "light", "t-system"],
  [null, "dark", "t-system"],
  ["dark", "light", "t-dark"],
  ["light", "dark", "t-light"],
] as const) {
  test(`the theme button shows the ${icon} icon with theme ${stored ?? "unset"} on a ${scheme} system`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    if (stored) await page.addInitScript((theme) => localStorage.setItem("theme", theme), stored);
    await page.goto("/work");
    const toggle = page.getByRole("button", { name: /^Colour theme/ });
    // CSS picks the icon from the class on <html>: one of the three, and the right one.
    await expect(toggle.locator("svg:visible")).toHaveCount(1);
    await expect(toggle.locator("svg:visible")).toHaveClass(new RegExp(`\\b${icon}\\b`));
    await expect(toggle).toHaveAccessibleName(
      new RegExp(`^Colour theme: ${stored ?? "system"}`, "i"),
    );
    const box = (await toggle.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  });
}

test("theme toggle switches the theme and it survives a reload", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /^Colour theme/ });
  await expect(html).not.toHaveClass(/\bdark\b/);
  const lightBackground = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );

  await untilHydrated(async () => {
    if (!(await html.getAttribute("class"))?.includes("dark")) await toggle.click();
    await expect(html).toHaveClass(/\bdark\b/, { timeout: 1000 });
  });
  await expect(toggle).toHaveAccessibleName(/^Colour theme: Dark/);
  await expect(toggle.locator("svg:visible")).toHaveClass(/\bt-dark\b/);

  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(toggle).toHaveAccessibleName(/^Colour theme: Dark/);
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBackground).not.toBe(lightBackground);
});

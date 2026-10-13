import { expect, test } from "./fixtures";

/** The key handler is attached on hydration, so retry the keys until it answers. */
async function untilHydrated(action: () => Promise<void>) {
  await expect(action).toPass({ timeout: 15_000 });
}

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

test("Escape closes help and restores focus", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("link", { name: "Projects", exact: true }).first();
  const help = page.getByRole("dialog").filter({ has: page.locator("#kb-help-h") });
  await untilHydrated(async () => {
    await opener.focus();
    if (!(await help.isVisible())) await page.keyboard.press("?");
    await expect(help).toBeVisible({ timeout: 1000 });
  });
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
  await expect(opener).toBeFocused();
});

test("there is no search: no such button in the masthead, and / and Ctrl K open nothing", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("body > header button")).toHaveAccessibleName(/^Colour theme/);
  // The keys answer once the page has hydrated: ? proves it, then the old ones are tried.
  const help = page.getByRole("dialog").filter({ has: page.locator("#kb-help-h") });
  await untilHydrated(async () => {
    if (!(await help.isVisible())) await page.keyboard.press("?");
    await expect(help).toBeVisible({ timeout: 1000 });
  });
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
  await page.keyboard.press("/");
  await page.keyboard.press("Control+k");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
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

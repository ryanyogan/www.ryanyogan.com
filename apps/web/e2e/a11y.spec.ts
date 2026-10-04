import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ADMIN_ORIGIN, expect, routes, test } from "./fixtures";

/** axe over the whole page; only serious and critical findings fail. No rule is disabled. */
async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

// The public routes also run in the "webkit" project, which picks them by title: every title
// in this file begins with its path, and only the admin ones with "/admin".
for (const theme of ["light", "dark"] as const) {
  for (const route of [...routes, "/no-such-page"]) {
    test(`${route} has no serious accessibility violation (${theme})`, async ({
      page,
      consoleErrors,
    }) => {
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
      await page.goto(route);
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await expect(page.locator("h1")).toBeVisible();
      await document_fonts(page);
      expect(await seriousViolations(page)).toEqual([]);
      if (route === "/no-such-page") consoleErrors.length = 0;
    });
  }
}

/** Contrast is measured on the final fonts and colours. */
async function document_fonts(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

for (const path of [
  "/admin",
  "/admin/import",
  "/admin/projects/new",
  "/admin/projects/lincoln-project",
]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${path} has no serious accessibility violation (${theme})`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
      await page.goto(`${ADMIN_ORIGIN}${path}`);
      await expect(page.locator('main[data-hydrated="true"]')).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
      await document_fonts(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
}

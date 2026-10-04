import type { Page } from "@playwright/test";
import { ADMIN_ORIGIN, expect, test } from "./fixtures";

// More admin behaviour, on the second preview (bypass on). Unlike the serial story in
// admin.spec.ts, every test here uses its own rows (e2e/admin-fixtures.sql, or a slug it
// never manages to create), so they run in any order and alongside that file.

async function gotoAdmin(page: Page, path: string) {
  const response = await page.goto(`${ADMIN_ORIGIN}${path}`);
  await expect(page.locator('main[data-hydrated="true"]')).toBeVisible();
  return response;
}

test("admin pages show neither the search button nor the keys hint; public pages do", async ({
  page,
}) => {
  for (const path of [
    "/admin",
    "/admin/import",
    "/admin/projects/new",
    "/admin/projects/lincoln-project",
  ]) {
    await gotoAdmin(page, path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("button", { name: /Search/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /for keys/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Colour theme/ })).toBeVisible();
  }
  // Client navigation back to the site brings both back, and into the admin hides them.
  await page.goto(`${ADMIN_ORIGIN}/projects`);
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /for keys/ })).toBeVisible();
});

test("admin responses are no-store and noindex on every page", async ({ request }) => {
  for (const path of [
    "/admin",
    "/admin/import",
    "/admin/projects/new",
    "/admin/projects/lincoln-project",
    "/admin/projects/no-such",
  ]) {
    const response = await request.get(`${ADMIN_ORIGIN}${path}`);
    expect(response.headers()["cache-control"], path).toBe("no-store");
    expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    if (response.status() === 200) {
      expect(await response.text(), path).toMatch(
        /<meta name="robots" content="noindex, nofollow"/,
      );
    }
  }
});

test("a missing required field or a bad value shows inline and writes nothing", async ({
  page,
  request,
}) => {
  const slug = "e2e-never-created";
  await gotoAdmin(page, "/admin/projects/new");
  // Title, tagline and summary left empty.
  await page.getByLabel("Slug").fill(slug);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("status")).toContainText(/fields? need/);
  await expect(page.getByLabel("Title")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(`${ADMIN_ORIGIN}/admin/projects/new`);
  expect((await request.get(`${ADMIN_ORIGIN}/admin/projects/${slug}`)).status()).toBe(404);

  // Everything valid except a live URL that is not https.
  await page.getByLabel("Title").fill("Never Created");
  await page.getByLabel("Tagline").fill("Never created tagline");
  await page.getByLabel("Summary").fill("Never created summary");
  await page.getByLabel("Body (markdown)").fill("Never created body.");
  // The hint about image titles is the field's description, so it is read with the field.
  await expect(page.getByLabel("Body (markdown)")).toHaveAccessibleDescription(/"1200x800"/);
  await page.getByLabel("Live URL").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByText("Must be an https:// URL.")).toBeVisible();
  await expect(page.getByLabel("Live URL")).toHaveAttribute("aria-invalid", "true");
  expect((await request.get(`${ADMIN_ORIGIN}/admin/projects/${slug}`)).status()).toBe(404);
  expect(await (await request.get(`${ADMIN_ORIGIN}/admin`)).text()).not.toContain("Never Created");
});

for (const [slug, message] of [
  ["stub-gh-limited", /rate limit/i],
  ["stub-gh-broken", /GitHub answered 500/],
] as const) {
  test(`refresh from GitHub: ${slug} is a clear error and changes nothing`, async ({ page }) => {
    await gotoAdmin(page, `/admin/projects/${slug}`);
    await page.getByRole("button", { name: "Refresh from GitHub" }).click();
    await expect(page.getByText(message)).toBeVisible();
    await gotoAdmin(page, `/admin/projects/${slug}`);
    await expect(page.getByText("Stars: 3")).toBeVisible();
  });
}

for (const [slug, message] of [
  ["stub-ai-malformed", /does not fit the expected shape/],
  ["stub-ai-timeout", /took too long/],
  ["stub-ai-down", /model call failed|unavailable/i],
] as const) {
  test(`draft with AI: ${slug} is an error message, no proposal, the form untouched`, async ({
    page,
  }) => {
    await gotoAdmin(page, `/admin/projects/${slug}`);
    await page.getByRole("button", { name: "Draft with AI" }).click();
    await expect(page.getByTestId("ai-error")).toHaveText(message);
    await expect(page.getByTestId("ai-caveats")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Use this" })).toHaveCount(0);
    await expect(page.getByLabel("Tagline")).toHaveValue(`Fixture tagline ${slug}`);
    await expect(page.getByTestId("ai-unsaved")).toHaveCount(0);
    // Nothing was written either.
    await gotoAdmin(page, `/admin/projects/${slug}`);
    await expect(page.getByLabel("Tagline")).toHaveValue(`Fixture tagline ${slug}`);
    await expect(page.getByTestId("ai-generated-at")).toHaveCount(0);
  });
}

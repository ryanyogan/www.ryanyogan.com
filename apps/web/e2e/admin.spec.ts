import type { APIRequestContext, Page } from "@playwright/test";
import { ADMIN_ORIGIN, GITHUB_STUB, adminFunctionIds, draft, expect, test } from "./fixtures";

// /admin is not in `routes` (fixtures.ts) on purpose: it has no canonical, is noindex and
// needs the owner. These tests cover it instead.

const adminPages = [
  "/admin",
  "/admin/",
  "/Admin",
  "/admin/projects/new",
  "/admin/import",
  `/admin/projects/${draft.slug}`,
  "/admin/projects/lincoln-project",
  "/admin/nothing-here",
];

/** Text that only an admin page or admin data would contain. */
const sensitive = [draft.title, draft.marker, "not public", "New project", "Source: seed"];

function expectNothingSensitive(body: string, where: string) {
  for (const text of sensitive) expect(body, where).not.toContain(text);
}

test.describe("signed out (no Access config, bypass off)", () => {
  test("every admin page is refused and renders nothing", async ({ request }) => {
    for (const path of adminPages) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([401, 403], path).toContain(response.status());
      expect(response.headers()["cache-control"], path).toBe("no-store");
      const body = await response.text();
      expect(body.length, path).toBeLessThan(40);
      expectNothingSensitive(body, path);
    }
  });

  test("the admin page shows no admin markup in a browser", async ({ page, consoleErrors }) => {
    const response = await page.goto("/admin");
    expect([401, 403]).toContain(response?.status());
    await expect(page.getByRole("heading")).toHaveCount(0);
    await expect(page.getByText(draft.title)).toHaveCount(0);
    // Chromium logs the 401/403 for the document itself; nothing else may be logged.
    expect(consoleErrors.filter((e) => !/status of 40[13]/.test(e))).toEqual([]);
    consoleErrors.length = 0;
  });

  test("headers cannot open it: forged identity, garbage and unsigned tokens", async ({
    request,
  }) => {
    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({
      email: "ryan.yogan@hey.com",
      exp: 4_000_000_000,
    })}.`;
    const attempts: Record<string, string>[] = [
      { "Cf-Access-Authenticated-User-Email": "ryan.yogan@hey.com" },
      { "Cf-Access-Jwt-Assertion": "garbage" },
      { "Cf-Access-Jwt-Assertion": unsigned },
      { "Admin-Dev-Bypass": "1", "X-Admin-Dev-Bypass": "1", Cookie: "ADMIN_DEV_BYPASS=1" },
    ];
    for (const headers of attempts) {
      const response = await request.get("/admin", { headers });
      expect([401, 403], JSON.stringify(headers)).toContain(response.status());
      expectNothingSensitive(await response.text(), JSON.stringify(headers));
    }
  });

  test("every admin server function is refused and returns no project data", async ({
    request,
  }) => {
    const ids = adminFunctionIds();
    // list, get, create, update, move, delete, and the four GitHub ones (list repos, reload
    // repos, import, refresh stats). A new admin function changes this number.
    expect(ids).toHaveLength(11);
    const headers = {
      "x-tsr-serverFn": "true",
      Origin: "http://localhost:4173",
      "Sec-Fetch-Site": "same-origin",
    };
    for (const id of ids) {
      const get = await request.get(`/_serverFn/${id}`, { headers });
      const post = await request.post(`/_serverFn/${id}`, { headers, data: {} });
      for (const response of [get, post]) {
        expect([401, 403], id).toContain(response.status());
        const body = await response.text();
        expect(body.length, id).toBeLessThan(40);
        expectNothingSensitive(body, id);
        expect(body, id).not.toContain("slug");
      }
    }
  });

  test("no public page links to the admin", async ({ request }) => {
    for (const path of ["/", "/work", "/projects", "/writing", "/projects/lincoln-project"]) {
      expect(await (await request.get(path)).text(), path).not.toMatch(/href="\/admin/);
    }
  });
});

// --- Signed in: the second preview, bypass on, its own database -------------------------

const widget = { slug: "e2e-widget", title: "Zephyr Widget", renamed: "Zephyr Widget Two" };

async function gotoAdmin(page: Page, path: string) {
  const response = await page.goto(`${ADMIN_ORIGIN}${path}`);
  await expect(page.locator('main[data-hydrated="true"]')).toBeVisible();
  return response;
}

async function publicHtml(request: APIRequestContext, path: string) {
  const response = await request.get(`${ADMIN_ORIGIN}${path}`);
  return { status: response.status(), html: await response.text() };
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
}

test.describe("signed in (local bypass, test-only database)", () => {
  test.describe.configure({ mode: "serial" });

  test("lists every project, drafts included, uncacheable and noindex", async ({ page }) => {
    const response = await gotoAdmin(page, "/admin");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toBe("no-store");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
    const draftRow = page.locator(`li[data-slug="${draft.slug}"]`);
    await expect(draftRow).toContainText(draft.title);
    await expect(draftRow).toContainText("Draft");
    await expect(page.locator('li[data-slug="lincoln-project"]')).toContainText("Published");
    await expect(page.locator('li[data-slug="lincoln-project"]')).toContainText("Source: seed");
  });

  test("the keyboard layer is off inside /admin", async ({ page }) => {
    await gotoAdmin(page, "/admin");
    await page.keyboard.press("?");
    await page.keyboard.press("/");
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("admin pages fit a 360px screen", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const paths = [
      "/admin",
      "/admin/import",
      "/admin/projects/new",
      "/admin/projects/lincoln-project",
    ];
    for (const path of paths) {
      await gotoAdmin(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("a cross-origin write is refused even when signed in", async ({ request }) => {
    for (const id of adminFunctionIds()) {
      const attempts: Record<string, string>[] = [
        { Origin: "https://evil.example" },
        { Origin: ADMIN_ORIGIN, "Sec-Fetch-Site": "cross-site" },
        { "Sec-Fetch-Site": "same-site" },
      ];
      for (const headers of attempts) {
        const response = await request.post(`${ADMIN_ORIGIN}/_serverFn/${id}`, {
          headers,
          data: {},
        });
        expect(response.status(), id).toBe(403);
      }
    }
  });

  test("create a draft: validation errors inline, then absent from public pages", async ({
    page,
    request,
  }) => {
    await gotoAdmin(page, "/admin/projects/new");
    await page.getByLabel("Title").fill(widget.title);
    await page.getByLabel("Slug").fill("Not A Slug");
    await page.getByLabel("GitHub URL").fill("http://example.com/insecure");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("status")).toContainText("2 fields need fixing");
    await expect(page.getByLabel("Slug")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Must be an https:// URL.")).toBeVisible();

    // A slug that is already taken.
    await page.getByLabel("GitHub URL").fill("https://github.com/ryanyogan/zephyr");
    await page.getByLabel("Slug").fill("lincoln-project");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText("That slug is already in use.")).toBeVisible();

    await page.getByLabel("Slug").fill(widget.slug);
    await page.getByLabel("Summary").fill("Widget summary zq4");
    await page.getByLabel("Tagline").fill("Widget tagline zq4");
    await page.getByLabel("Tech").fill("Zig, SQLite");
    await page.getByLabel("Body (markdown)").fill("## Widget heading zq4\n\nSome **bold** text.");
    const preview = page.getByTestId("body-preview");
    await expect(preview.getByRole("heading", { name: "Widget heading zq4" })).toBeVisible();
    await expect(preview.locator("strong")).toHaveText("bold");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(`${ADMIN_ORIGIN}/admin/projects/${widget.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Edit ${widget.title}`);

    const list = await publicHtml(request, "/projects");
    expect(list.html).not.toContain(widget.title);
    expect(list.html).not.toContain("zq4");
    expect((await publicHtml(request, "/")).html).not.toContain(widget.title);
    expect((await publicHtml(request, `/projects/${widget.slug}`)).status).toBe(404);
  });

  test("publish it: it appears on /projects with no rebuild", async ({ page, request }) => {
    await gotoAdmin(page, `/admin/projects/${widget.slug}`);
    await page.getByLabel("Published").check();
    await save(page);

    const list = await publicHtml(request, "/projects");
    expect(list.html).toContain(widget.title);
    const detail = await publicHtml(request, `/projects/${widget.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.html).toContain("Widget heading zq4");

    await page.goto(`${ADMIN_ORIGIN}/projects`);
    await expect(page.getByRole("link", { name: widget.title, exact: true })).toBeVisible();
  });

  test("edit it: the public pages show the new text", async ({ page, request }) => {
    await gotoAdmin(page, `/admin/projects/${widget.slug}`);
    await expect(page.getByLabel("Slug")).toHaveAttribute("readonly", "");
    await page.getByLabel("Title").fill(widget.renamed);
    await page.getByLabel("Status label").fill("Zq4 label");
    await page.getByLabel("Live URL").fill("https://example.com/zephyr");
    await save(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Edit ${widget.renamed}`);

    const list = await publicHtml(request, "/projects");
    expect(list.html).toContain(widget.renamed);
    expect(list.html).toContain("Zq4 label");
    expect(list.html).toContain("https://example.com/zephyr");
  });

  test("editing a seeded project marks it manual", async ({ page }) => {
    await gotoAdmin(page, "/admin/projects/perfumery");
    await page.getByLabel("Status label").fill("Edited in e2e");
    await save(page);
    await gotoAdmin(page, "/admin");
    await expect(page.locator('li[data-slug="perfumery"]')).toContainText("Source: manual");
  });

  test("reorder within the group: the public order follows", async ({ page, request }) => {
    await gotoAdmin(page, "/admin");
    const shipped = page.locator("section", {
      has: page.getByRole("heading", { level: 2, name: /Shipped/ }),
    });
    const slugs = () =>
      shipped.locator("li[data-slug]").evaluateAll((items) => items.map((li) => li.dataset.slug));
    const before = (await slugs()) as string[];
    expect(before.at(-1)).toBe(widget.slug);
    await expect(page.getByRole("button", { name: `Move ${widget.renamed} down` })).toBeDisabled();

    await page.getByRole("button", { name: `Move ${widget.renamed} up` }).click();
    await expect(page.getByRole("status")).toContainText("Moved");
    const after = [...before];
    after.splice(-2, 2, before.at(-1)!, before.at(-2)!);
    await expect.poll(slugs).toEqual(after);

    const { html } = await publicHtml(request, "/projects");
    const at = (slug: string) => html.indexOf(`href="/projects/${slug}"`);
    expect(at(widget.slug)).toBeGreaterThan(-1);
    expect(at(widget.slug)).toBeLessThan(at(before.at(-2)!));
  });

  test("unpublish it: gone from the public pages again", async ({ page, request }) => {
    await gotoAdmin(page, `/admin/projects/${widget.slug}`);
    await page.getByLabel("Published").uncheck();
    await save(page);
    expect((await publicHtml(request, "/projects")).html).not.toContain(widget.renamed);
    expect((await publicHtml(request, `/projects/${widget.slug}`)).status).toBe(404);
  });

  test("delete it, after a confirmation", async ({ page, request }) => {
    await gotoAdmin(page, `/admin/projects/${widget.slug}`);
    await page.getByRole("button", { name: "Delete project" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Yes, delete it" })).toHaveCount(0);
    await page.getByRole("button", { name: "Delete project" }).click();
    await page.getByRole("button", { name: "Yes, delete it" }).click();
    await expect(page).toHaveURL(`${ADMIN_ORIGIN}/admin`);
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
    await expect(page.locator(`li[data-slug="${widget.slug}"]`)).toHaveCount(0);

    const response = await request.get(`${ADMIN_ORIGIN}/admin/projects/${widget.slug}`);
    expect(response.status()).toBe(404);
  });

  // --- GitHub import. The Worker's GITHUB_API_BASE points at e2e/github-stub.mjs (five
  // fixture repos, paged two at a time); nothing here reaches github.com.

  const imported = {
    repo: "stub-import-demo",
    slug: "stub-import-demo",
    title: "Stub Import Demo",
  };
  const repoRow = (page: Page, name: string) => page.locator(`li[data-repo="${name}"]`);

  test("import page: public repos, default filters, search and sort", async ({ page }) => {
    await gotoAdmin(page, "/admin");
    await page.getByRole("link", { name: "Import from GitHub" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Import from GitHub" })).toBeVisible();
    // All three pages of the stub's list arrived; forks, archived and undescribed are hidden.
    await expect(page.getByTestId("repo-counts")).toContainText("5 public repositories, 2 shown");
    await expect(repoRow(page, imported.repo)).toContainText("Stub demo xk7 description");
    await expect(repoRow(page, imported.repo)).toContainText("Zig");
    await expect(repoRow(page, imported.repo)).toContainText("Stars: 41");
    await expect(repoRow(page, imported.repo)).toContainText("2026-03-04");
    await expect(repoRow(page, imported.repo)).not.toContainText("Imported");
    for (const hidden of ["stub-forked", "stub-archived", "stub-nodesc"]) {
      await expect(repoRow(page, hidden)).toHaveCount(0);
    }

    await page.getByLabel("Show forks").check();
    await expect(repoRow(page, "stub-forked")).toContainText("Fork");
    await page.getByLabel("Show archived").check();
    await page.getByLabel("Show repos with no description").check();
    await expect(page.locator("li[data-repo]")).toHaveCount(5);

    await page.getByLabel("Sort by").selectOption("stars");
    await expect(page.locator("li[data-repo]").first()).toHaveAttribute(
      "data-repo",
      "stub-http-home",
    );
    await page.getByRole("searchbox", { name: "Search repositories" }).fill("import-demo");
    await expect(page.locator("li[data-repo]")).toHaveCount(1);

    await page.getByRole("button", { name: "Reload from GitHub" }).click();
    await expect(page.getByRole("status")).toContainText("Reloaded 5 repositories");
  });

  test("import a repo: it is a draft and absent from the public pages", async ({
    page,
    request,
  }) => {
    await gotoAdmin(page, "/admin/import");
    await page.getByRole("button", { name: `Import ${imported.repo} as a draft` }).click();
    await expect(page).toHaveURL(`${ADMIN_ORIGIN}/admin/projects/${imported.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Edit ${imported.title}`);
    await expect(page.getByText("source: github")).toBeVisible();
    await expect(page.getByLabel("Published")).not.toBeChecked();
    await expect(page.getByLabel("Tagline")).toHaveValue("Stub demo xk7 description");
    await expect(page.getByLabel("Summary")).toHaveValue("Stub demo xk7 description");
    await expect(page.getByLabel("Tech")).toHaveValue(/Zig.*C.*wasm.*cli/);
    await expect(page.getByLabel("GitHub URL")).toHaveValue(
      `https://github.com/ryanyogan/${imported.repo}`,
    );
    await expect(page.getByLabel("Live URL")).toHaveValue("https://example.com/stub-demo");
    await expect(page.getByLabel("Body (markdown)")).toHaveValue(/has not been written yet/);
    // The README is context for a later draft, never copied into the body.
    await expect(page.getByLabel("Body (markdown)")).not.toHaveValue(/secret-readme-text/);
    await expect(page.getByTestId("github-stats")).toContainText("Stars: 41");
    await expect(page.getByTestId("github-stats")).toContainText("Last push: 2026-03-04");

    for (const path of ["/", "/projects"]) {
      const { html } = await publicHtml(request, path);
      expect(html, path).not.toContain(imported.title);
      expect(html, path).not.toContain("xk7");
    }
    expect((await publicHtml(request, `/projects/${imported.slug}`)).status).toBe(404);

    await gotoAdmin(page, "/admin");
    const row = page.locator(`li[data-slug="${imported.slug}"]`);
    await expect(row).toContainText("Draft");
    await expect(row).toContainText("Source: github");
    await gotoAdmin(page, "/admin/import");
    await expect(repoRow(page, imported.repo)).toContainText("Imported");
    await expect(
      page.getByRole("button", { name: `Import ${imported.repo} as a draft` }),
    ).toHaveCount(0);
  });

  test("refresh from GitHub updates stars and keeps hand-edited text", async ({ page }) => {
    await gotoAdmin(page, `/admin/projects/${imported.slug}`);
    await page.getByLabel("Tagline").fill("Hand edited xk7 tagline");
    await save(page);
    await page.getByRole("button", { name: "Refresh from GitHub" }).click();
    await expect(page.getByTestId("github-refresh-message")).toHaveText(
      "Stars and last push updated.",
    );
    // The stub reports one more star on each read of the repo.
    await expect(page.getByTestId("github-stats")).toContainText("Stars: 42");

    await gotoAdmin(page, `/admin/projects/${imported.slug}`);
    await expect(page.getByTestId("github-stats")).toContainText("Stars: 42");
    await expect(page.getByLabel("Tagline")).toHaveValue("Hand edited xk7 tagline");
    await expect(page.getByLabel("Published")).not.toBeChecked();
    await expect(page.getByText("source: github")).toBeVisible();
    // A project that did not come from GitHub has no such action.
    await gotoAdmin(page, "/admin/projects/lincoln-project");
    await expect(page.getByRole("button", { name: "Refresh from GitHub" })).toHaveCount(0);
  });

  // --- Draft with AI. AI_STUB_URL points the Worker at e2e/ai-stub.mjs; no model is called.

  test("draft with AI: a proposal with caveats, saved only by Save, never published", async ({
    page,
    context,
    request,
  }) => {
    await gotoAdmin(page, "/admin/projects/lincoln-project");
    await expect(page.getByRole("button", { name: "Draft with AI" })).toHaveCount(0);

    await gotoAdmin(page, `/admin/projects/${imported.slug}`);
    await expect(page.getByTestId("ai-generated-at")).toHaveCount(0);
    await page.getByRole("button", { name: "Draft with AI" }).click();
    await expect(page.getByTestId("ai-caveats")).toContainText("could not confirm");
    await expect(page.getByTestId("ai-caveats")).toContainText("Stub caveat zq4");
    await expect(page.getByTestId("ai-proposed-tagline")).toHaveText("Stub AI tagline zq4");
    await expect(page.getByTestId("ai-field-tagline")).toContainText("Hand edited xk7 tagline");
    // The model was sent the README, inside its delimiters (the stub echoes what it saw).
    await expect(page.getByTestId("ai-proposed-body")).toContainText("readme-delimited:yes");

    await page.getByTestId("ai-field-summary").getByRole("button", { name: "Use this" }).click();
    await expect(page.getByLabel("Summary")).toHaveValue("Stub AI summary zq4 sentence.");
    await expect(page.getByLabel("Tagline")).toHaveValue("Hand edited xk7 tagline");
    await page.getByRole("button", { name: "Use all" }).click();
    await expect(page.getByLabel("Tagline")).toHaveValue("Stub AI tagline zq4");
    await expect(page.getByLabel("Tech")).toHaveValue("Zig, WebAssembly");
    await expect(page.getByLabel("Body (markdown)")).toHaveValue(/Stub AI body zq4/);
    await expect(page.getByLabel("Published")).not.toBeChecked();
    await expect(page.getByTestId("ai-unsaved")).toBeVisible();

    // Nothing is in the database yet: a second tab still shows the old text.
    const other = await context.newPage();
    await gotoAdmin(other, `/admin/projects/${imported.slug}`);
    await expect(other.getByLabel("Tagline")).toHaveValue("Hand edited xk7 tagline");
    await expect(other.getByTestId("ai-generated-at")).toHaveCount(0);
    await other.close();

    await save(page);
    await gotoAdmin(page, `/admin/projects/${imported.slug}`);
    await expect(page.getByLabel("Tagline")).toHaveValue("Stub AI tagline zq4");
    await expect(page.getByLabel("Body (markdown)")).toHaveValue(/Stub AI body zq4/);
    await expect(page.getByTestId("ai-generated-at")).toContainText("AI draft text accepted 20");
    await expect(page.getByLabel("Published")).not.toBeChecked();
    expect((await publicHtml(request, `/projects/${imported.slug}`)).status).toBe(404);
    expect((await publicHtml(request, "/projects")).html).not.toContain("zq4");
  });

  test("draft with AI: a rate-limited model is an error message, the form is untouched", async ({
    page,
  }) => {
    await gotoAdmin(page, "/admin/import");
    await page.getByRole("button", { name: "Import stub-http-home as a draft" }).click();
    await expect(page).toHaveURL(`${ADMIN_ORIGIN}/admin/projects/stub-http-home`);
    await page.getByRole("button", { name: "Draft with AI" }).click();
    await expect(page.getByTestId("ai-error")).toContainText("rate limited");
    await expect(page.getByTestId("ai-caveats")).toHaveCount(0);
    await expect(page.getByLabel("Tagline")).toHaveValue("Fixture repository stub-http-home");
  });

  test("publish the import: only then is it public", async ({ page, request }) => {
    await gotoAdmin(page, `/admin/projects/${imported.slug}`);
    await page.getByLabel("Published").check();
    await save(page);
    const list = await publicHtml(request, "/projects");
    expect(list.html).toContain(imported.title);
    expect(list.html).toContain("Stub AI tagline zq4");
    const detail = await publicHtml(request, `/projects/${imported.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.html).not.toContain("secret-readme-text");
  });

  // Last, and inside the serial block: the stub's list is switched to fail for a moment,
  // which would break the import tests above if they ran at the same time.
  test("import page: a rate limit and a GitHub error are shown, then it recovers", async ({
    page,
    request,
  }) => {
    await gotoAdmin(page, "/admin/import");
    const reload = page.getByRole("button", { name: "Reload from GitHub" });
    try {
      for (const [code, message] of [
        [403, /rate limit/i],
        [500, /GitHub answered 500/],
      ] as const) {
        await request.post(`${GITHUB_STUB}/__list-status?code=${code}`);
        await reload.click();
        await expect(page.getByTestId("github-error")).toHaveText(message);
      }
    } finally {
      await request.post(`${GITHUB_STUB}/__list-status?code=0`);
    }
    await reload.click();
    await expect(page.getByRole("status")).toContainText("Reloaded 5 repositories");
    await expect(page.getByTestId("github-error")).toHaveCount(0);
  });
});

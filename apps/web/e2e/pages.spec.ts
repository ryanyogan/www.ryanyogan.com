import { readFileSync, readdirSync } from "node:fs";
import {
  CLIENT_DIR,
  SITE_URL,
  draft,
  dynamicRoutes,
  expect,
  postSlugs,
  projectSlugs,
  routes,
  test,
} from "./fixtures";

for (const route of routes) {
  test(`${route} renders with one h1, a title and its own canonical`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    expect((await page.title()).trim()).not.toBe("");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", `${SITE_URL}${route}`);
  });

  test(`${route} has no horizontal overflow at 360px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("/rss.xml parses and has one item per post", async ({ page, request }) => {
  const response = await request.get("/rss.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("xml");
  const xml = await response.text();

  await page.goto("/");
  const feed = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "application/xml");
    return {
      parseError: doc.querySelector("parsererror")?.textContent ?? null,
      root: doc.documentElement.nodeName,
      links: Array.from(doc.querySelectorAll("channel > item > link"), (el) => el.textContent),
    };
  }, xml);

  expect(feed.parseError).toBeNull();
  expect(feed.root).toBe("rss");
  expect(postSlugs.length).toBeGreaterThan(0);
  expect([...feed.links].sort()).toEqual(postSlugs.map((slug) => `${SITE_URL}/writing/${slug}`));
});

test("an unknown path renders the 404 page", async ({ page, consoleErrors }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("This page doesn’t exist.");
  await expect(page.getByRole("link", { name: /Back to home/ })).toBeVisible();
  // Chromium reports the 404 document itself as a failed resource; nothing else may be logged.
  const others = consoleErrors.filter((text) => !text.includes("status of 404"));
  consoleErrors.length = 0;
  expect(others).toEqual([]);
});

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

function expectHeyOnly(html: string, where: string) {
  expect(html, where).not.toContain("gmail.com");
  expect(html, where).toContain("mailto:ryan.yogan@hey.com");
  const mailtos = new Set(html.match(/mailto:[^"'?\s<]+/g));
  expect([...mailtos], where).toEqual(["mailto:ryan.yogan@hey.com"]);
}

test("built HTML uses the hey.com contact address and never gmail.com", () => {
  const files = htmlFiles(CLIENT_DIR);
  // /work, /writing and every post are prerendered.
  expect(files.length).toBeGreaterThanOrEqual(postSlugs.length + 2);
  for (const file of files) expectHeyOnly(readFileSync(file, "utf8"), file);
});

test("pages rendered from D1 use the hey.com address, never gmail.com, and leak no draft", async ({
  request,
}) => {
  expect(projectSlugs.length).toBe(13);
  for (const route of dynamicRoutes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(response.headers()["cache-control"], route).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    const html = await response.text();
    expectHeyOnly(html, route);
    expect(html, route).not.toContain(draft.title);
    expect(html, route).not.toContain(draft.marker);
    expect(html, route).not.toContain(draft.slug);
  }
});

test("/projects lists exactly the published projects", async ({ page }) => {
  await page.goto("/projects");
  const hrefs = await page
    .locator('main a[href^="/projects/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect([...new Set(hrefs)].sort()).toEqual(projectSlugs.map((slug) => `/projects/${slug}`));
  await expect(page.getByRole("status")).toHaveText(
    `Showing ${projectSlugs.length} of ${projectSlugs.length}`,
  );
  await expect(page.getByText(draft.title)).toHaveCount(0);
});

test("an unpublished project's URL is a 404", async ({ page, consoleErrors }) => {
  const response = await page.goto(`/projects/${draft.slug}`);
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("This page doesn’t exist.");
  const html = await page.content();
  expect(html).not.toContain(draft.title);
  expect(html).not.toContain(draft.marker);
  const others = consoleErrors.filter((text) => !text.includes("status of 404"));
  consoleErrors.length = 0;
  expect(others).toEqual([]);
});

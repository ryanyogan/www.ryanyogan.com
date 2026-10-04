import { readFileSync } from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
  BROKEN_ORIGIN,
  SITE_URL,
  draft,
  expect,
  postSlugs,
  projectSlugs,
  routes,
  test,
} from "./fixtures";

const PUBLIC_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

// --- Dark theme -------------------------------------------------------------------------

for (const route of routes) {
  test(`${route} renders in the dark theme`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("h1")).toBeVisible();
    const [background, ink] = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return [style.backgroundColor, style.color];
    });
    // A dark page: the background is darker than the text.
    const light = (rgb: string) =>
      (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).reduce((a, n) => a + Number(n), 0);
    expect(light(background), `${background} vs ${ink}`).toBeLessThan(light(ink));
    // The console-error fixture fails the test if anything was logged.
  });
}

test("the chosen theme persists across client and full navigation", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /^Colour theme/ });
  await expect(async () => {
    if (!(await html.getAttribute("class"))?.includes("dark")) await toggle.click();
    await expect(html).toHaveClass(/\bdark\b/, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Projects" })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(html).toHaveClass(/\bdark\b/);
  await page.locator('main a[href="/projects/lincoln-project"]').first().click();
  await expect(page).toHaveURL(/\/projects\/lincoln-project$/);
  await expect(html).toHaveClass(/\bdark\b/);
  for (const path of ["/writing", "/work", "/now", `/writing/${postSlugs[0]}`]) {
    await page.goto(path);
    await expect(html).toHaveClass(/\bdark\b/);
    await expect(toggle).toHaveAccessibleName(/^Colour theme: Dark/);
  }
});

// --- SEO --------------------------------------------------------------------------------

/**
 * A fresh tab on `route`, as a visitor arrives, with its console errors collected into `errors`.
 * One tab driven through every route in turn keeps the previous pages' pending preloads, and
 * Chromium now and then fails a request there with ERR_INSUFFICIENT_RESOURCES.
 */
async function openTab(context: BrowserContext, errors: string[], route: string): Promise<Page> {
  const tab = await context.newPage();
  tab.on("console", (message) => {
    if (message.type() === "error") errors.push(`${tab.url()}: ${message.text()}`);
  });
  tab.on("pageerror", (error) => errors.push(`${tab.url()}: ${String(error)}`));
  await tab.goto(route);
  return tab;
}

// A hydration mismatch (React #418) throws away the server HTML and renders the page again.
// It only shows once React has hydrated, so a test that navigates on straight away sees it
// some of the time. This one waits for hydration on every route, and first checks the cause
// that needs no timing at all: markup the HTML parser has to repair (a <figure> inside a <p>).
test("every public route is valid HTML and hydrates without a mismatch", async ({
  page,
  context,
  request,
}) => {
  const all = [
    ...new Set([
      ...routes,
      ...projectSlugs.map((slug) => `/projects/${slug}`),
      ...postSlugs.map((slug) => `/writing/${slug}`),
    ]),
  ];
  await page.goto("/work");
  for (const route of all) {
    const html = await (await request.get(route)).text();
    // Every tag the server wrote must survive parsing as exactly one element.
    const repaired = await page.evaluate((source) => {
      const body = source.slice(source.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, "");
      const written = new Map<string, number>();
      for (const [, tag] of body.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)/g)) {
        const name = tag.toLowerCase();
        if (name !== "body") written.set(name, (written.get(name) ?? 0) + 1);
      }
      const parsed = new Map<string, number>();
      const doc = new DOMParser().parseFromString(source, "text/html");
      for (const element of doc.body.querySelectorAll("*")) {
        const name = element.tagName.toLowerCase();
        if (name !== "script") parsed.set(name, (parsed.get(name) ?? 0) + 1);
      }
      return [...new Set([...written.keys(), ...parsed.keys()])]
        .filter((name) => written.get(name) !== parsed.get(name))
        .map(
          (name) => `<${name}>: ${written.get(name) ?? 0} written, ${parsed.get(name) ?? 0} parsed`,
        );
    }, html);
    expect(repaired, `${route}: tags the browser had to repair`).toEqual([]);

    const errors: string[] = [];
    const tab = await openTab(context, errors, route);
    // React has attached to the first and the last element it renders.
    await tab.waitForFunction(() => {
      const attached = (element: Element | null | undefined) =>
        Boolean(element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")));
      return (
        attached(document.querySelector("#main")) && attached(document.querySelector("footer"))
      );
    });
    // Recoverable errors are reported after the commit.
    await tab.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => setTimeout(done, 50))),
    );
    expect(errors, `${route}: console errors after hydration`).toEqual([]);
    await tab.close();
  }
});

test("every public route has its own title and description, Open Graph tags and canonical", async ({
  context,
  consoleErrors,
}) => {
  const seen = {
    title: new Map<string, string>(),
    description: new Map<string, string>(),
  };
  const all = [
    ...new Set([
      ...routes,
      ...projectSlugs.map((slug) => `/projects/${slug}`),
      ...postSlugs.map((slug) => `/writing/${slug}`),
    ]),
  ];
  for (const route of all) {
    const tab = await openTab(context, consoleErrors, route);
    const meta = await tab.evaluate(() => {
      const one = (selector: string) => {
        const found = document.head.querySelectorAll(selector);
        return found.length === 1
          ? (found[0].getAttribute("content") ?? found[0].getAttribute("href") ?? "")
          : `#${found.length}`;
      };
      return {
        title: document.title.trim(),
        titles: document.head.querySelectorAll("title").length,
        description: one('meta[name="description"]'),
        ogTitle: one('meta[property="og:title"]'),
        ogDescription: one('meta[property="og:description"]'),
        ogImage: one('meta[property="og:image"]'),
        ogType: one('meta[property="og:type"]'),
        canonical: one('link[rel="canonical"]'),
      };
    });
    expect(meta.titles, route).toBe(1);
    expect(meta.title.length, route).toBeGreaterThan(3);
    expect(meta.description.length, `${route} description: ${meta.description}`).toBeGreaterThan(
      20,
    );
    // Posts drop the site-name suffix in og:title; everything else repeats the title.
    expect(
      meta.title.startsWith(meta.ogTitle) && meta.ogTitle.length > 3,
      `${route}: ${meta.ogTitle}`,
    ).toBe(true);
    expect(meta.ogDescription, route).toBe(meta.description);
    expect(meta.ogImage, route).toMatch(/^https:\/\/ryanyogan\.com\//);
    expect(meta.ogType, route).not.toMatch(/^#/);
    expect(meta.canonical, route).toBe(`${SITE_URL}${route}`);
    for (const key of ["title", "description"] as const) {
      const other = seen[key].get(meta[key]);
      expect(other, `${route} shares its ${key} with ${other}: ${meta[key]}`).toBeUndefined();
      seen[key].set(meta[key], route);
    }
    await tab.close();
  }
});

test("code blocks with a language are coloured, Elixir included", async ({ page }) => {
  await page.goto("/writing/building-agent-memory-from-research-to-reality");
  const blocks = page.locator("pre code.hljs.language-elixir");
  expect(await blocks.count()).toBeGreaterThan(0);
  for (const block of await blocks.all()) {
    expect(await block.locator("span[class^='hljs-']").count()).toBeGreaterThan(0);
  }
  const keyword = page.locator("pre code.language-elixir .hljs-keyword").first();
  const colours = await keyword.evaluate((el) => [
    getComputedStyle(el).color,
    getComputedStyle(el.closest("code")!).color,
  ]);
  expect(colours[0]).not.toBe(colours[1]);
});

test("the Open Graph image exists", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const image = /property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? "";
  expect(image.startsWith(SITE_URL)).toBe(true);
  const response = await request.get(image.slice(SITE_URL.length));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
});

// --- Links ------------------------------------------------------------------------------

test("every internal link reachable from / answers 200", async ({ request }) => {
  const queue = ["/"];
  const seen = new Set(queue);
  const broken: string[] = [];
  while (queue.length) {
    const path = queue.shift() as string;
    const response = await request.get(path);
    if (response.status() !== 200) broken.push(`${path} -> ${response.status()}`);
    if (!(response.headers()["content-type"] ?? "").includes("text/html")) continue;
    const html = await response.text();
    for (const match of html.matchAll(/<(?:a|link)\b[^>]*?\bhref="([^"]+)"/g)) {
      let href = match[1].replaceAll("&amp;", "&");
      if (href.startsWith(SITE_URL)) href = href.slice(SITE_URL.length) || "/";
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      href = href.split("#")[0];
      if (href && !seen.has(href)) {
        seen.add(href);
        queue.push(href);
      }
    }
  }
  expect(broken).toEqual([]);
  // The crawl found the site: every project, every post, the feed.
  for (const slug of projectSlugs) expect(seen.has(`/projects/${slug}`), slug).toBe(true);
  for (const slug of postSlugs) expect(seen.has(`/writing/${slug}`), slug).toBe(true);
  expect(seen.has("/rss.xml")).toBe(true);
  expect([...seen].filter((path) => path.includes(draft.slug) || /^\/admin/i.test(path))).toEqual(
    [],
  );
});

test("rss.xml item links resolve and the feed has no draft", async ({ request }) => {
  const xml = await (await request.get("/rss.xml")).text();
  const links = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  expect(links.length).toBe(postSlugs.length);
  for (const link of links) {
    expect(link.startsWith(`${SITE_URL}/`), link).toBe(true);
    expect((await request.get(link.slice(SITE_URL.length))).status(), link).toBe(200);
  }
  for (const text of [draft.slug, draft.title, draft.marker]) expect(xml).not.toContain(text);
});

// --- Projects from the database -----------------------------------------------------------

const groupTitles: Record<string, string> = {};
const statusLabels: Record<string, string> = {};
{
  const shared = readFileSync(
    fileURLToPath(new URL("../../../packages/shared/src/content.ts", import.meta.url)),
    "utf8",
  );
  for (const m of shared.matchAll(/id: "([a-z-]+)",\s*title: "([^"]+)"/g)) groupTitles[m[1]] = m[2];
  const block = /projectStatusLabels[^=]*=\s*\{([\s\S]*?)\}/.exec(shared)?.[1] ?? "";
  for (const m of block.matchAll(/"?([a-z-]+)"?:\s*"([^"]+)"/g)) statusLabels[m[1]] = m[2];
}

/** The front matter of the markdown file the seed loads into D1. */
function seeded(slug: string): Record<string, string> {
  const file = fileURLToPath(new URL(`../content/projects/${slug}.md`, import.meta.url));
  const head = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, "utf8"))?.[1] ?? "";
  const fields: Record<string, string> = {};
  for (const m of head.matchAll(/^([a-zA-Z]+):\s*"?(.*?)"?\s*$/gm)) fields[m[1]] = m[2];
  return fields;
}

test("each project page shows its status, group and links from the database", async ({ page }) => {
  expect(Object.keys(groupTitles).length).toBeGreaterThan(2);
  expect(Object.keys(statusLabels).length).toBeGreaterThan(2);
  for (const slug of projectSlugs) {
    const want = seeded(slug);
    await page.goto(`/projects/${slug}`);
    const header = page.locator("main article header");
    await expect(header.locator("h1"), slug).toHaveText(want.title);
    await expect(header.locator(`span.st[data-status="${want.status}"]`), slug).toHaveText(
      want.statusLabel ?? statusLabels[want.status],
    );
    await expect(
      header.getByRole("link", { name: groupTitles[want.group], exact: true }),
      slug,
    ).toHaveAttribute("href", `/projects#${want.group}`);
    const external = header.locator('a[target="_blank"]');
    const hrefs = await external.evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs, slug).toEqual([want.live, want.github].filter(Boolean));
    if (!hrefs.length)
      await expect(header.getByText(/No public link\.|Private\. No link\./)).toBeVisible();
  }
});

// --- Drafts -------------------------------------------------------------------------------

test("the work timeline opens with the current role and lists every role once", async ({
  page,
}) => {
  await page.goto("/work");
  const rows = page.locator("#work-timeline .tl li");
  await expect(rows).toHaveCount(12);
  await expect(rows.first().locator(".d")).toHaveText("Jun 2026 — Present");
  await expect(rows.first().locator(".c")).toHaveText("ChromaticSenior Staff Engineer");
  await expect(rows.last().locator(".d")).toHaveText("May 2006 — Oct 2009");
  // Sonian is one company with two roles, one row after the other.
  await expect(rows.filter({ hasText: "Sonian" })).toHaveCount(2);
  await expect(rows.nth(6)).toContainText("VP of Research and Development");
  await expect(rows.nth(7)).toContainText("Operations Engineer");
});

test("a draft is in no feed, sitemap, robots file or data response, and its URL is a 404", async ({
  request,
}) => {
  for (const path of [
    "/rss.xml",
    "/sitemap.xml",
    "/sitemap-index.xml",
    "/sitemap.txt",
    "/robots.txt",
    "/feed.xml",
  ]) {
    const body = await (await request.get(path)).text();
    for (const text of [draft.slug, draft.title, draft.marker])
      expect(body, path).not.toContain(text);
  }
  for (const path of [
    `/projects/${draft.slug}`,
    `/projects/${draft.slug}/`,
    `/Projects/${draft.slug}`,
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    const body = await response.text();
    for (const text of [draft.title, draft.marker]) expect(body, path).not.toContain(text);
  }
});

// --- Response headers ---------------------------------------------------------------------

test("404 responses are not cacheable; the prerendered and dynamic pages are", async ({
  request,
}) => {
  for (const path of [
    "/no-such-page",
    "/projects/no-such-project",
    `/projects/${draft.slug}`,
    "/writing/no-such-post",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(response.headers()["cache-control"], path).toBe("no-store");
  }
  for (const path of ["/", "/projects", "/projects/lincoln-project"]) {
    expect((await request.get(path)).headers()["cache-control"], path).toBe(PUBLIC_CACHE);
  }
});

test("a database failure is a 500 that no cache may keep", async ({ request }) => {
  // BROKEN_ORIGIN is the same build on a D1 with no tables: every query throws.
  for (const path of ["/", "/projects", "/projects/lincoln-project"]) {
    const response = await request.get(`${BROKEN_ORIGIN}${path}`);
    expect(response.status(), path).toBe(500);
    expect(response.headers()["cache-control"], path).toBe("no-store");
    expect(await response.text(), path).not.toMatch(/SQLITE|no such table|D1_ERROR/i);
  }
  // Pages that do not read the database still work there.
  expect((await request.get(`${BROKEN_ORIGIN}/work`)).status()).toBe(200);
});

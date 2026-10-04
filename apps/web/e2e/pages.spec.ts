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

test("Home links the newest posts above the project index, and no post twice", async ({ page }) => {
  // The newest posts by the dates in their frontmatter, not by anything the page says.
  const dir = new URL("../content/writing/", import.meta.url);
  const newest = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({
      slug: name.replace(/\.md$/, ""),
      time: Date.parse(/^date:\s*"?([^"\n]+)/m.exec(readFileSync(new URL(name, dir), "utf8"))![1]!),
    }))
    .sort((a, b) => b.time - a.time);
  expect(Number.isNaN(newest[0]!.time)).toBe(false);

  await page.goto("/");
  const latest = page.getByRole("region", { name: "Latest writing" });
  const links = latest.getByRole("link");
  // The newest three and the link to the rest.
  await expect(links).toHaveCount(4);
  await expect(links.last()).toHaveAttribute("href", "/writing");
  await expect(links.first()).toHaveAttribute("href", `/writing/${newest[0]!.slug}`);
  // Each has its date.
  await expect(latest.locator("li time")).toHaveCount(3);

  const top = await links.first().boundingBox();
  const hero = await page.locator("h1").boundingBox();
  const index = await page.locator("#idx-h").boundingBox();
  expect(top!.y).toBeGreaterThan(hero!.y);
  expect(top!.y + top!.height).toBeLessThan(index!.y);

  // It is the only writing list on the page: no post is linked twice.
  const hrefs = await page
    .locator('main a[href^="/writing/"]')
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
  expect(hrefs.length).toBe(3);
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

test("/now is dated at the top from its markdown file, and is in the nav and the footer", async ({
  page,
}) => {
  const source = readFileSync(new URL("../content/now.md", import.meta.url), "utf8");
  const updated = /^updated:\s*"?([^"\n]+)/m.exec(source)![1]!;
  const day = new Date(updated);
  expect(Number.isNaN(day.getTime())).toBe(false);
  const iso = [day.getFullYear(), day.getMonth() + 1, day.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

  await page.goto("/now");
  const time = page.locator("main time");
  await expect(time).toHaveCount(1);
  await expect(time).toHaveAttribute("datetime", iso);
  await expect(time).toHaveText(updated);
  // The date comes before the text it dates.
  const date = await time.boundingBox();
  const heading = await page.locator("main .prose h2").first().boundingBox();
  expect(date!.y).toBeGreaterThan((await page.locator("h1").boundingBox())!.y);
  expect(date!.y + date!.height).toBeLessThan(heading!.y);
  // One h2 per section of the file, and nothing left to fill in.
  await expect(page.locator("main .prose h2")).toHaveCount(source.match(/^## /gm)!.length);
  await expect(page.locator("main")).not.toContainText(/TODO|TBD|lorem/i);

  await expect(page.locator('#site-nav a[href="/now"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator('footer a[href="/now"]')).toHaveCount(1);
  await page.goto("/");
  await expect(page.locator('footer a[href="/now"]')).toBeVisible();
});

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

// What the W3C feed validator checks, read with a real XML parser and a real HTML parser.
test("/rss.xml carries each post in full, with absolute addresses and valid dates", async ({
  page,
  request,
}) => {
  const xml = await (await request.get("/rss.xml")).text();
  await page.goto("/");
  const feed = await page.evaluate((source) => {
    const ATOM = "http://www.w3.org/2005/Atom";
    const CONTENT = "http://purl.org/rss/1.0/modules/content/";
    const doc = new DOMParser().parseFromString(source, "application/xml");
    const text = (parent: Element, name: string) =>
      parent.querySelector(`:scope > ${name}`)?.textContent ?? null;
    const channel = doc.querySelector("rss > channel")!;
    const self = Array.from(channel.getElementsByTagNameNS(ATOM, "link")).map((link) => ({
      href: link.getAttribute("href"),
      rel: link.getAttribute("rel"),
      type: link.getAttribute("type"),
    }));
    const items = Array.from(channel.querySelectorAll(":scope > item"), (item) => {
      const encoded = Array.from(item.getElementsByTagNameNS(CONTENT, "encoded"));
      const body = new DOMParser().parseFromString(encoded[0]?.textContent ?? "", "text/html");
      const addresses = Array.from(body.querySelectorAll("[href], [src], [srcset]")).flatMap(
        (el) => [
          ...[el.getAttribute("href"), el.getAttribute("src")].filter((url) => url !== null),
          ...(el.getAttribute("srcset") ?? "")
            .split(",")
            .map((candidate) => candidate.trim().split(/\s+/)[0])
            .filter(Boolean),
        ],
      );
      return {
        title: text(item, "title"),
        link: text(item, "link"),
        guid: text(item, "guid"),
        permalink: item.querySelector(":scope > guid")?.getAttribute("isPermaLink") ?? null,
        description: text(item, "description"),
        pubDate: text(item, "pubDate"),
        encoded: encoded.length,
        words: (body.body.textContent ?? "").trim().split(/\s+/).length,
        paragraphs: body.querySelectorAll("p").length,
        risky: body.querySelectorAll("script, style, iframe, object, embed, form, [style]").length,
        relative: addresses.filter((url) => !/^(https?:|mailto:)/.test(url)),
        images: Array.from(body.querySelectorAll("img"), (img) => img.getAttribute("src")),
      };
    });
    return {
      parseError: doc.querySelector("parsererror")?.textContent ?? null,
      version: doc.documentElement.getAttribute("version"),
      title: text(channel, "title"),
      link: text(channel, "link"),
      description: text(channel, "description"),
      lastBuildDate: text(channel, "lastBuildDate"),
      self,
      items,
    };
  }, xml);

  expect(feed.parseError).toBeNull();
  expect(feed.version).toBe("2.0");
  expect(feed.title).toBe("Ryan Yogan");
  expect(feed.link).toBe(`${SITE_URL}/writing`);
  expect(feed.description).toBeTruthy();
  expect(feed.self).toEqual([
    { href: `${SITE_URL}/rss.xml`, rel: "self", type: "application/rss+xml" },
  ]);

  // RFC 822 with a four-digit year; the day name must be the right one for the date.
  const rfc822 = (value: string | null, where: string) => {
    expect(value, where).toMatch(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/,
    );
    const time = Date.parse(value!);
    expect(new Date(time).toUTCString(), where).toBe(value);
    // The validator warns about a date in the future.
    expect(time, where).toBeLessThanOrEqual(Date.now());
    return time;
  };
  rfc822(feed.lastBuildDate, "lastBuildDate");

  expect(feed.items).toHaveLength(postSlugs.length);
  expect(new Set(feed.items.map((item) => item.guid)).size).toBe(postSlugs.length);
  const times = feed.items.map((item) => rfc822(item.pubDate, `${item.link} pubDate`));
  expect(times, "newest first").toEqual([...times].sort((a, b) => b - a));
  expect(Date.parse(feed.lastBuildDate!)).toBe(times[0]);

  for (const item of feed.items) {
    const where = String(item.link);
    expect(item.title, where).toBeTruthy();
    expect(item.description, where).toBeTruthy();
    expect(item.guid, where).toBe(item.link);
    expect(item.permalink, where).toBe("true");
    expect(item.encoded, where).toBe(1);
    // The whole post, not the excerpt again.
    expect(item.paragraphs, where).toBeGreaterThan(3);
    expect(item.words, where).toBeGreaterThan(200);
    expect(item.risky, where).toBe(0);
    expect(item.relative, where).toEqual([]);
    for (const src of item.images) {
      const path = src!.startsWith(SITE_URL) ? src!.slice(SITE_URL.length) : null;
      if (path) expect((await request.get(path)).status(), src!).toBe(200);
    }
  }
  // The feed is tested on a post that has an image and a link to another page of the site.
  expect(feed.items.flatMap((item) => item.images).length).toBeGreaterThan(0);
  expect(xml).toMatch(/href="https:\/\/ryanyogan\.com\/writing\/[a-z0-9-]+"/);
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
  expect(projectSlugs.length).toBe(17);
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

test("/projects: a retired project says so, is in the status key, and shows only under All", async ({
  page,
}) => {
  await page.goto("/projects");
  const retired = page.locator("main .plist li", {
    has: page.locator('span.st[data-status="retired"]'),
  });
  await expect(retired).toHaveCount(1);
  await expect(retired.locator("span.st")).toHaveText("Retired");
  await expect(page.locator("svg.marks")).toHaveAttribute(
    "aria-label",
    /[1-9]\d* dashed for private or retired/,
  );

  const filter = page.getByRole("group", { name: "Filter projects by status" });
  for (const name of ["Running or live", "Prototype"]) {
    const button = filter.getByRole("button", { name, exact: true });
    // The first click can land before hydration: repeat until the button takes it.
    await expect(async () => {
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
    }).toPass();
    await expect(retired).toHaveCount(0);
  }
  await filter.getByRole("button", { name: "All", exact: true }).click();
  await expect(retired).toHaveCount(1);
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

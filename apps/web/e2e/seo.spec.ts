import { existsSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";
import {
  BROKEN_ORIGIN,
  CLIENT_DIR,
  SITE_URL,
  draft,
  expect,
  postSlugs,
  projectSlugs,
  publicRoutes,
  test,
} from "./fixtures";

// One URL per page (no trailing slash), and what crawlers read: canonical, sitemap, robots,
// Open Graph and JSON-LD. Everything here is plain HTTP against the preview, so it sees the
// HTML a crawler gets, before any script runs.

const attr = (html: string, tag: RegExp) => [...html.matchAll(tag)].map((match) => match[1]);
const metaAll = (html: string, key: string) =>
  attr(html, new RegExp(`<meta (?:name|property)="${key}"[^>]* content="([^"]*)"`, "g"));
const meta = (html: string, key: string) => {
  const found = metaAll(html, key);
  return found.length === 1 ? found[0] : `#${found.length}`;
};

type Node = Record<string, unknown> & { "@type": string };

/** The page's JSON-LD: exactly one block, one @graph, every node typed. */
function graphOf(html: string, where: string): Node[] {
  const blocks = attr(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
  expect(blocks, `${where}: JSON-LD blocks`).toHaveLength(1);
  const data = JSON.parse(blocks[0]) as { "@context": string; "@graph": Node[] };
  expect(data["@context"], where).toBe("https://schema.org");
  for (const node of data["@graph"]) expect(typeof node["@type"], where).toBe("string");
  // Nothing the owner has not put on the site: no employer, no private address.
  expect(blocks[0], where).not.toMatch(/gmail\.com|worksFor|"email"/i);
  return data["@graph"];
}

function nodeOf(graph: Node[], type: string, where: string): Node {
  const found = graph.filter((node) => node["@type"] === type);
  expect(found, `${where}: ${type}`).toHaveLength(1);
  return found[0];
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

async function html(request: APIRequestContext, path: string) {
  const response = await request.get(path, { maxRedirects: 0 });
  expect(response.status(), path).toBe(200);
  return response.text();
}

function expectPerson(person: Node, where: string) {
  expect(person["@type"], where).toBe("Person");
  expect(person.name, where).toBe("Ryan Yogan");
  expect(person.url, where).toBe(`${SITE_URL}/`);
  expect(person.sameAs, where).toEqual([
    "https://github.com/ryanyogan",
    "https://linkedin.com/in/ryanyogan",
  ]);
  expect(typeof person.jobTitle, where).toBe("string");
  expect(person.jobTitle as string, where).not.toMatch(/\b(at|@)\b/i);
  expect((person.knowsAbout as string[]).length, where).toBeGreaterThan(2);
}

function expectBreadcrumb(crumbs: Node, trail: string[], where: string) {
  const items = crumbs.itemListElement as { position: number; name: string; item: string }[];
  expect(
    items.map((item) => item.item),
    where,
  ).toEqual(trail.map((path) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`)));
  items.forEach((item, index) => {
    expect(item.position, where).toBe(index + 1);
    expect(item.name.length, where).toBeGreaterThan(0);
  });
}

// --- One URL form ---------------------------------------------------------------------------

test("every public URL answers 200 at its bare path, and its slash form redirects there once", async ({
  request,
}) => {
  expect(postSlugs.length).toBeGreaterThan(0);
  expect(projectSlugs.length).toBeGreaterThan(0);
  for (const route of [...publicRoutes, "/rss.xml", "/sitemap.xml", "/robots.txt", "/llms.txt"]) {
    const bare = await request.get(route, { maxRedirects: 0 });
    expect(bare.status(), route).toBe(200);
    if (route === "/" || route === "/robots.txt" || route === "/llms.txt") continue;

    const slash = await request.get(`${route}/`, { maxRedirects: 0 });
    expect([301, 308], `${route}/ answered ${slash.status()}`).toContain(slash.status());
    const target = new URL(slash.headers().location, `http://localhost:4173${route}/`);
    expect(target.host, `${route}/`).toBe("localhost:4173");
    // Straight to the final URL: the target is the bare path, which answered 200 above.
    expect(target.pathname + target.search, `${route}/`).toBe(route);
  }
});

test("a slash redirect keeps the query, takes one hop for many slashes, and never leaves the site", async ({
  request,
}) => {
  const hop = async (path: string) => {
    const response = await request.get(path, { maxRedirects: 0 });
    return { status: response.status(), location: response.headers().location };
  };
  expect(await hop("/projects/?utm_source=x")).toEqual({
    status: 308,
    location: "/projects?utm_source=x",
  });
  expect(await hop("/projects///")).toEqual({ status: 308, location: "/projects" });
  expect(await hop("/work/")).toEqual({ status: 308, location: "/work" });
  for (const path of ["//example.com/", "/%2Fexample.com/", "///example.com//"]) {
    const { location } = await hop(path);
    if (location !== undefined) expect(location, path).toMatch(/^\/(?!\/)/);
  }
});

test("the canonical is the URL the page is finally served at, on every public route", async ({
  request,
}) => {
  for (const route of publicRoutes) {
    // Ask for the slash form and follow: wherever that lands is the page's one address.
    const response = await request.get(route === "/" ? route : `${route}/`);
    expect(response.status(), route).toBe(200);
    const final = new URL(response.url());
    expect(final.pathname, route).toBe(route);
    const body = await response.text();
    const canonical = attr(body, /<link rel="canonical" href="([^"]*)"/g);
    expect(canonical, route).toEqual([`${SITE_URL}${final.pathname}`]);
    expect(meta(body, "og:url"), route).toBe(canonical[0]);
    expect(meta(body, "og:url").endsWith("/"), route).toBe(route === "/");
  }
});

test("internal links, the feed and llms.txt use the bare form only", async ({ request }) => {
  for (const route of ["/", "/work", "/projects", "/writing", `/writing/${postSlugs[0]}`]) {
    const hrefs = attr(await html(request, route), /<a [^>]*href="(\/[^"#?]*)/g);
    expect(hrefs.length, route).toBeGreaterThan(3);
    expect(
      hrefs.filter((href) => href.length > 1 && href.endsWith("/")),
      route,
    ).toEqual([]);
  }
  for (const path of ["/rss.xml", "/llms.txt", "/sitemap.xml"]) {
    const urls: string[] =
      (await html(request, path)).match(/https:\/\/ryanyogan\.com[^\s<)"]*/g) ?? [];
    expect(urls.length, path).toBeGreaterThan(3);
    expect(
      urls.filter((url) => url !== `${SITE_URL}/` && url.endsWith("/")),
      path,
    ).toEqual([]);
  }
});

// --- sitemap.xml, robots.txt, llms.txt ------------------------------------------------------

test("sitemap.xml is valid XML listing exactly the public URLs, each a 200", async ({
  page,
  request,
}) => {
  const response = await request.get("/sitemap.xml", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/xml");
  expect(response.headers()["cache-control"]).toContain("s-maxage=60");
  const xml = await response.text();

  await page.goto("/work");
  const sitemap = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "application/xml");
    return {
      parseError: doc.querySelector("parsererror")?.textContent ?? null,
      root: doc.documentElement.nodeName,
      namespace: doc.documentElement.namespaceURI,
      urls: Array.from(doc.querySelectorAll("urlset > url"), (url) => ({
        loc: url.querySelector("loc")?.textContent ?? "",
        lastmod: url.querySelector("lastmod")?.textContent ?? null,
        children: Array.from(url.children, (child) => child.nodeName),
      })),
    };
  }, xml);
  expect(sitemap.parseError).toBeNull();
  expect(sitemap.root).toBe("urlset");
  expect(sitemap.namespace).toBe("http://www.sitemaps.org/schemas/sitemap/0.9");

  const locs = sitemap.urls.map((url) => url.loc);
  expect([...locs].sort()).toEqual(publicRoutes.map((route) => `${SITE_URL}${route}`).sort());
  expect(locs).toContain(`${SITE_URL}/projects/lincoln-project`);
  for (const text of [draft.slug, "/admin", "_serverFn", "/rss.xml", "localhost"]) {
    expect(xml, text).not.toContain(text);
  }

  const built = Date.now();
  for (const url of sitemap.urls) {
    for (const child of url.children) expect(["loc", "lastmod"], url.loc).toContain(child);
    if (url.lastmod !== null) {
      expect(url.lastmod, url.loc).toMatch(ISO_INSTANT);
      expect(Date.parse(url.lastmod), url.loc).toBeLessThanOrEqual(built);
    }
    const target = await request.get(url.loc.replace(SITE_URL, ""), { maxRedirects: 0 });
    expect(target.status(), url.loc).toBe(200);
  }
  // Posts and projects carry their own date; a post's is its publication day.
  const dated = new Map(sitemap.urls.map((url) => [url.loc, url.lastmod]));
  for (const slug of projectSlugs)
    expect(dated.get(`${SITE_URL}/projects/${slug}`), slug).not.toBeNull();
  for (const slug of postSlugs) {
    const post = await html(request, `/writing/${slug}`);
    expect(dated.get(`${SITE_URL}/writing/${slug}`), slug).toBe(
      meta(post, "article:published_time"),
    );
  }
});

test("there is exactly one sitemap, and the Worker renders it", async ({ request }) => {
  // Not a build artefact: a prerendered copy would miss projects published after the build.
  expect(existsSync(`${CLIENT_DIR}/sitemap.xml`)).toBe(false);
  for (const path of ["/sitemap-index.xml", "/sitemap_index.xml", "/sitemap.txt", "/sitemap"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  await request.get("/sitemap.xml");
  expect((await request.get("/sitemap.xml")).headers()["x-cache"]).toBe("HIT");
});

test("with the database down the sitemap is a 503 no cache may keep, never a partial list", async ({
  request,
}) => {
  for (let i = 0; i < 2; i += 1) {
    const response = await request.get(`${BROKEN_ORIGIN}/sitemap.xml`);
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(response.headers()["x-cache"]).toBeUndefined();
    expect(await response.text()).not.toContain("<urlset");
  }
});

test("robots.txt allows the site, keeps crawlers out of /admin and names the sitemap", async ({
  request,
}) => {
  const response = await request.get("/robots.txt", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const lines = (await response.text())
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  expect(lines).toEqual([
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /_serverFn/",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ]);
});

test("llms.txt is short, links every post and states nothing private", async ({ request }) => {
  const response = await request.get("/llms.txt", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const text = await response.text();
  expect(text.startsWith("# Ryan Yogan\n")).toBe(true);
  expect(text.length).toBeLessThan(6000);
  for (const slug of postSlugs) expect(text).toContain(`(${SITE_URL}/writing/${slug})`);
  for (const path of ["/work", "/projects", "/writing"])
    expect(text).toContain(`(${SITE_URL}${path})`);
  expect(text).not.toMatch(/gmail\.com|\/admin|<|procore|sonian/i);
  expect(text).not.toContain(draft.slug);
});

// --- Meta ---------------------------------------------------------------------------------

test("every public route has the full set of head tags for its type", async ({ request }) => {
  for (const route of publicRoutes) {
    const body = await html(request, route);
    expect(body, route).toMatch(/<html[^>]* lang="en"/);
    expect(meta(body, "og:site_name"), route).toBe("Ryan Yogan");
    expect(meta(body, "og:locale"), route).toBe("en_US");
    expect(meta(body, "og:url"), route).toBe(`${SITE_URL}${route}`);
    expect(meta(body, "twitter:card"), route).toBe("summary_large_image");
    expect(meta(body, "og:title").length, route).toBeGreaterThan(3);
    expect(meta(body, "og:description"), route).toBe(meta(body, "description"));
    expect(meta(body, "og:image"), route).toMatch(/^https:\/\/ryanyogan\.com\//);
    expect(metaAll(body, "robots"), route).toEqual([]);

    const isPost = route.startsWith("/writing/");
    const type = isPost ? "article" : route === "/work" ? "profile" : "website";
    expect(meta(body, "og:type"), route).toBe(type);
    if (isPost) {
      expect(meta(body, "article:published_time"), route).toMatch(ISO_INSTANT);
      expect(meta(body, "article:author"), route).toBe(`${SITE_URL}/work`);
    } else {
      expect(metaAll(body, "article:published_time"), route).toEqual([]);
    }

    expect(
      attr(body, /<link rel="alternate" type="application\/rss\+xml"[^>]* href="([^"]*)"/g),
      route,
    ).toEqual([`${SITE_URL}/rss.xml`]);
    const themes = [
      ...body.matchAll(
        /<meta name="theme-color" media="\(prefers-color-scheme: (light|dark)\)" content="(#[0-9a-f]{6})"/g,
      ),
    ].map((match) => match[1]);
    expect(themes, route).toEqual(["light", "dark"]);
  }
});

test("theme-color is the page background in each colour scheme", async ({ browser }) => {
  for (const scheme of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto("/work");
    const { declared, paper } = await page.evaluate((name) => {
      const tag = document.querySelector(`meta[name="theme-color"][media*="${name}"]`);
      const probe = document.createElement("i");
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue("--paper");
      const declaredProbe = document.createElement("i");
      declaredProbe.style.color = tag?.getAttribute("content") ?? "";
      document.documentElement.appendChild(probe);
      document.documentElement.appendChild(declaredProbe);
      return {
        declared: getComputedStyle(declaredProbe).color,
        paper: getComputedStyle(probe).color,
      };
    }, scheme);
    expect(declared, scheme).toBe(paper);
    await context.close();
  }
});

// --- JSON-LD ------------------------------------------------------------------------------

test("Home describes the site and the person", async ({ request }) => {
  const graph = graphOf(await html(request, "/"), "/");
  const site = nodeOf(graph, "WebSite", "/");
  expect(site.name).toBe("Ryan Yogan");
  expect(site.url).toBe(`${SITE_URL}/`);
  const person = nodeOf(graph, "Person", "/");
  expectPerson(person, "/");
  expect(site.publisher).toEqual({ "@id": person["@id"] });
});

test("/work is a ProfilePage about the person", async ({ request }) => {
  const graph = graphOf(await html(request, "/work"), "/work");
  const profile = nodeOf(graph, "ProfilePage", "/work");
  expect(profile.url).toBe(`${SITE_URL}/work`);
  expectPerson(profile.mainEntity as Node, "/work");
});

test("/projects and /writing are collections listing their pages in order", async ({ request }) => {
  const expected: Record<string, string[]> = {
    "/projects": projectSlugs.map((slug) => `${SITE_URL}/projects/${slug}`),
    "/writing": postSlugs.map((slug) => `${SITE_URL}/writing/${slug}`),
  };
  for (const [route, urls] of Object.entries(expected)) {
    const body = await html(request, route);
    const page = nodeOf(graphOf(body, route), "CollectionPage", route);
    expect(page.url, route).toBe(`${SITE_URL}${route}`);
    expect((page.name as string).length, route).toBeGreaterThan(3);
    const list = page.mainEntity as Node;
    expect(list["@type"], route).toBe("ItemList");
    const items = list.itemListElement as { position: number; name: string; url: string }[];
    expect(list.numberOfItems, route).toBe(items.length);
    expect(items.map((item) => item.url).sort(), route).toEqual([...urls].sort());
    items.forEach((item, index) => {
      expect(item.position, route).toBe(index + 1);
      expect(item.name.length, route).toBeGreaterThan(0);
    });
    // The same order as the links on the page.
    const onPage = attr(body, new RegExp(`<a [^>]*href="(${route}/[a-z0-9-]+)"`, "g"));
    const order = [...new Set(onPage)].map((href) => `${SITE_URL}${href}`);
    expect(
      items.map((item) => item.url),
      route,
    ).toEqual(order);
    expect(JSON.stringify(page), route).not.toContain(draft.slug);
  }
});

test("every post is a BlogPosting with a breadcrumb", async ({ request }) => {
  for (const slug of postSlugs) {
    const route = `/writing/${slug}`;
    const body = await html(request, route);
    const graph = graphOf(body, route);
    const post = nodeOf(graph, "BlogPosting", route);
    const headline = post.headline as string;
    expect(headline.length, route).toBeGreaterThan(3);
    expect(headline.length, route).toBeLessThanOrEqual(110);
    expect(meta(body, "og:title"), route).toBe(
      headline.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;"),
    );
    expect(post.datePublished, route).toMatch(ISO_INSTANT);
    expect(post.datePublished, route).toBe(meta(body, "article:published_time"));
    // Posts record no modification date, so none is claimed.
    expect(post, route).not.toHaveProperty("dateModified");
    const author = post.author as Node;
    expect(author["@type"], route).toBe("Person");
    expect(author.name, route).toBe("Ryan Yogan");
    expect(author.url, route).toBe(`${SITE_URL}/`);
    expect(post.mainEntityOfPage, route).toEqual({
      "@type": "WebPage",
      "@id": `${SITE_URL}${route}`,
    });
    expectBreadcrumb(nodeOf(graph, "BreadcrumbList", route), ["/", "/writing", route], route);
  }
});

test("every project is source code when it has a repository, with a breadcrumb", async ({
  request,
}) => {
  const types = new Set<string>();
  for (const slug of projectSlugs) {
    const route = `/projects/${slug}`;
    const body = await html(request, route);
    const graph = graphOf(body, route);
    expectBreadcrumb(nodeOf(graph, "BreadcrumbList", route), ["/", "/projects", route], route);
    const work = graph.find((node) => node["@type"] !== "BreadcrumbList") as Node;
    types.add(work["@type"]);
    expect(work.url, route).toBe(`${SITE_URL}${route}`);
    expect((work.name as string).length, route).toBeGreaterThan(0);
    expect((work.description as string).length, route).toBeGreaterThan(20);
    expect((work.author as Node).name, route).toBe("Ryan Yogan");

    // The repository link the page itself shows decides the type.
    const repo = attr(body, /<a [^>]*href="(https:\/\/github\.com\/[^"]+)"/g).filter(
      (href) => href !== "https://github.com/ryanyogan",
    );
    if (work["@type"] === "SoftwareSourceCode") {
      expect(repo, route).toContain(work.codeRepository);
      if ("programmingLanguage" in work) {
        const languages = work.programmingLanguage as string[];
        expect(languages.length, route).toBeGreaterThan(0);
        for (const language of languages) expect(body, route).toContain(language);
      }
    } else {
      expect(work["@type"], route).toBe("CreativeWork");
      expect(work, route).not.toHaveProperty("codeRepository");
      expect(work, route).not.toHaveProperty("programmingLanguage");
    }
  }
  expect([...types]).toContain("SoftwareSourceCode");
});

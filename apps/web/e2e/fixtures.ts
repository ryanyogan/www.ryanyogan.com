import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test as base, expect } from "@playwright/test";

export const SITE_URL = "https://ryanyogan.com";
export const CLIENT_DIR = fileURLToPath(new URL("../dist/client", import.meta.url));

// The prerender writes writing/<slug>.html (not <slug>/index.html), so a post is served at
// its bare path.
function slugs(section: string): string[] {
  return readdirSync(`${CLIENT_DIR}/${section}`, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name.replace(/\.html$/, ""))
    .filter((name) => name !== "index")
    .sort();
}

/** Slugs of the prerendered writing posts, read from the build output. */
export const postSlugs = slugs("writing");

/** Slugs of the seeded projects: the markdown files `pnpm db:seed:local` loads into D1. */
export const projectSlugs = readdirSync(
  fileURLToPath(new URL("../content/projects", import.meta.url)),
)
  .filter((name) => name.endsWith(".md"))
  .map((name) => name.replace(/\.md$/, ""))
  .sort();

/** The unpublished row from e2e/draft.sql. */
export const draft = { slug: "e2e-draft", title: "Quixotic Draft", marker: "xq7" };

/** Pages the Worker renders from D1 on each request (not in dist/client). */
export const dynamicRoutes = ["/", "/projects", ...projectSlugs.map((slug) => `/projects/${slug}`)];

/** The index pages plus one project and one post. /work and /writing are prerendered. */
export const routes = [
  "/",
  "/work",
  "/projects",
  "/writing",
  "/projects/lincoln-project",
  `/writing/${postSlugs[0]}`,
];

/** Every indexable URL of the site: what the sitemap must list, no more and no less. */
export const publicRoutes = [
  "/",
  "/work",
  "/projects",
  "/writing",
  ...projectSlugs.map((slug) => `/projects/${slug}`),
  ...postSlugs.map((slug) => `/writing/${slug}`),
];

/** The second preview: same build, admin bypass on, its own database (playwright.config.ts). */
export const ADMIN_ORIGIN = "http://localhost:4174";
/** The third preview: a database with no tables, so every D1 query fails. */
export const BROKEN_ORIGIN = "http://localhost:4177";
export const GITHUB_STUB = "http://127.0.0.1:4175";

/**
 * The ids of the admin server functions, read from the client chunk that calls them
 * (`/_serverFn/<id>`).
 */
export function adminFunctionIds(): string[] {
  const assets = `${CLIENT_DIR}/assets`;
  const ids = new Set<string>();
  for (const name of readdirSync(assets)) {
    if (!/^admin\.functions-.*\.js$/.test(name)) continue;
    for (const match of readFileSync(`${assets}/${name}`, "utf8").matchAll(
      /[`"']([0-9a-f]{64})[`"']/g,
    )) {
      ids.add(match[1]);
    }
  }
  return [...ids];
}

/** Every test fails if the page logs a console error or throws. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`${page.url()}: ${message.text()}`);
      });
      page.on("pageerror", (error) => errors.push(`${page.url()}: ${String(error)}`));
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

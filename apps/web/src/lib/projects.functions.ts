import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import {
  getPublishedProject,
  listPublishedProjectDates,
  listPublishedProjects,
} from "./db/projects";

/**
 * Cache policy for the pages rendered from D1: browsers always revalidate, a
 * shared cache may keep a copy for a minute and serve it stale for five more
 * while it refetches.
 */
export const PROJECT_PAGE_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

let setupHintAt = 0;

/**
 * In `vite dev`, a missing table means the local D1 was never migrated (`predev` normally
 * does it). One line naming the fix, at most once every few seconds: a page render makes
 * several reads. Returns false for anything else, and always outside dev.
 */
function logMissingLocalTable(error: unknown): boolean {
  if (!import.meta.env.DEV) return false;
  if (!(error instanceof Error) || !error.message.includes("no such table")) return false;
  const now = Date.now();
  if (now - setupHintAt > 5000) {
    setupHintAt = now;
    console.error(
      "projects: the local database is not set up. Stop the dev server and run `pnpm dev` " +
        "again (it migrates and seeds), or run `pnpm --filter @repo/web db:migrate:local` " +
        "and `pnpm --filter @repo/web db:seed:local`.",
    );
  }
  return true;
}

/**
 * A loader error is serialised into the 500 page, message included. The database's own
 * message (table names, SQL) is logged and replaced with a fixed one.
 */
async function guarded<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!logMissingLocalTable(error)) console.error("projects: database read failed", error);
    throw new Error("Projects are unavailable right now.");
  }
}

/** Published projects for Home, /projects and the palette. Drafts never leave the Worker. */
export const fetchProjects = createServerFn({ method: "GET" }).handler(() =>
  guarded(() => listPublishedProjects(env.DB)),
);

/** Published slugs with their `updated_at`, for /sitemap.xml. */
export const fetchSitemapProjects = createServerFn({ method: "GET" }).handler(() =>
  guarded(() => listPublishedProjectDates(env.DB)),
);

/**
 * One published project plus the others in its group, or null (unknown slug or draft).
 * The body leaves the Worker as sanitised HTML (`html`), never as markdown, so the page
 * needs no parser in the browser.
 */
export const fetchProject = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const [project, all] = await guarded(() =>
      Promise.all([getPublishedProject(env.DB, slug), listPublishedProjects(env.DB)]),
    );
    if (!project) return null;
    // Imported on first use: the parser and highlighter stay out of the Worker's startup.
    const [{ renderMarkdown }, { default: images }] = await Promise.all([
      import("./markdown"),
      import("virtual:prose-images"),
    ]);
    const { content, ...rest } = project;
    const siblings = all
      .filter((p) => p.group === project.group)
      .map((p) => ({ slug: p.slug, title: p.title }));
    return { project: { ...rest, html: renderMarkdown(content, images) }, siblings };
  });

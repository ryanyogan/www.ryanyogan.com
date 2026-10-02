import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getPublishedProject, listPublishedProjects } from "./db/projects";

/**
 * Cache policy for the pages rendered from D1: browsers always revalidate, a
 * shared cache may keep a copy for a minute and serve it stale for five more
 * while it refetches.
 */
export const PROJECT_PAGE_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

/**
 * A loader error is serialised into the 500 page, message included. The database's own
 * message (table names, SQL) is logged and replaced with a fixed one.
 */
async function guarded<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error("projects: database read failed", error);
    throw new Error("Projects are unavailable right now.");
  }
}

/** Published projects for Home, /projects and the palette. Drafts never leave the Worker. */
export const fetchProjects = createServerFn({ method: "GET" }).handler(() =>
  guarded(() => listPublishedProjects(env.DB)),
);

/** One published project plus the others in its group, or null (unknown slug or draft). */
export const fetchProject = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const [project, all] = await guarded(() =>
      Promise.all([getPublishedProject(env.DB, slug), listPublishedProjects(env.DB)]),
    );
    if (!project) return null;
    const siblings = all
      .filter((p) => p.group === project.group)
      .map((p) => ({ slug: p.slug, title: p.title }));
    return { project, siblings };
  });

import { createFileRoute } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import { PROJECT_PAGE_CACHE, fetchSitemapProjects } from "~/lib/projects.functions";
import { buildSitemap } from "~/lib/sitemap";

// Rendered by the Worker, not prerendered (vite.config.ts): it lists the published projects
// from D1, so a project published in the admin is in it at once. It shares the pages' edge
// cache and is purged with them on every admin write (src/lib/page-cache.ts). The
// framework's own `sitemap` option stays off: it only knows prerendered pages.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let projects: Awaited<ReturnType<typeof fetchSitemapProjects>>;
        try {
          projects = await fetchSitemapProjects();
        } catch {
          // Already logged by the server function. A partial sitemap would tell a crawler
          // the projects are gone, so say "try again" instead.
          return new Response("Sitemap unavailable.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        return new Response(buildSitemap({ posts: writingPosts, projects }), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": PROJECT_PAGE_CACHE,
          },
        });
      },
    },
  },
});

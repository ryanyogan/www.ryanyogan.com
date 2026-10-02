import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getPublishedProject } from "~/lib/db/projects";
import { projectCard } from "~/lib/og-images";
import { PROJECT_PAGE_CACHE } from "~/lib/projects.functions";

const notFound = () =>
  new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

// /og/projects/<slug>.png: the social preview image of a published project, drawn from D1 on
// request. It shares the pages' edge cache and is purged with them on every admin write
// (src/lib/page-cache.ts), so the next request after an edit draws the new title. A draft or
// an unknown slug is a 404: nothing of a draft is ever drawn.
export const Route = createFileRoute("/og/projects/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.png$/.exec(params.file)?.[1];
        if (!slug) return notFound();
        let project: Awaited<ReturnType<typeof getPublishedProject>>;
        try {
          project = await getPublishedProject(env.DB, slug);
        } catch (error) {
          console.error("og: database read failed", error);
          return new Response("Image unavailable.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        if (!project) return notFound();
        // On first use: the renderer (about 2 MB of WebAssembly) stays off every other request.
        const { renderCardResponse } = await import("~/lib/og/render-project");
        return renderCardResponse(projectCard(project), {
          "Content-Type": "image/png",
          "Cache-Control": PROJECT_PAGE_CACHE,
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { writingPosts } from "~/lib/content";
import { countPostView } from "~/lib/db/post-views";
import { isPostSlug, viewsResponse } from "~/lib/post-views";

// POST /api/views/<slug>: counts one view of a writing post and answers with the new total.
// The post page calls it once per load (src/components/ViewCount.tsx); posts are static
// files, so this is the only request a post makes to the Worker. An unknown slug is a 404
// and writes nothing; a database failure is a 503, which the page ignores.
export const Route = createFileRoute("/api/views/$slug")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const known = writingPosts.map((post) => post.slug);
        if (!isPostSlug(params.slug, known)) return viewsResponse({ error: "Not found." }, 404);
        try {
          return viewsResponse({ views: await countPostView(env.DB, params.slug) });
        } catch (error) {
          console.error("views: database write failed", error);
          return viewsResponse({ error: "Views are unavailable right now." }, 503);
        }
      },
      // A GET must never count: crawlers and link previews follow URLs.
      ANY: () => viewsResponse({ error: "Method not allowed." }, 405, { Allow: "POST" }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { writingPosts } from "~/lib/content";
import { listPostViews } from "~/lib/db/post-views";
import { isPostSlug, viewsResponse } from "~/lib/post-views";

// GET /api/views: the view count of every post, `{ views: { <slug>: 1204 } }`, for lists of
// posts (`useViewCounts` in src/components/ViewCount.tsx). Not cached: the edge cache
// (src/lib/page-cache.ts) only keeps the HTML of the D1 pages, and a reader coming back from
// a post should see the view they just added. A post nobody has opened is absent.
export const Route = createFileRoute("/api/views")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const known = writingPosts.map((post) => post.slug);
          const counts = Object.entries(await listPostViews(env.DB));
          // A row left behind by a deleted or renamed post is not listed.
          const views = Object.fromEntries(counts.filter(([slug]) => isPostSlug(slug, known)));
          return viewsResponse({ views });
        } catch (error) {
          console.error("views: database read failed", error);
          return viewsResponse({ error: "Views are unavailable right now." }, 503);
        }
      },
    },
  },
});

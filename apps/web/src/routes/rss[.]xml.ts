import { createFileRoute } from "@tanstack/react-router";
import { loadPostHtml, writingPosts } from "~/lib/content";
import { buildFeed } from "~/lib/feed";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = await Promise.all(
          writingPosts.map(async (post) => ({
            ...post,
            html: (await loadPostHtml(post.slug)) ?? "",
          })),
        );
        return new Response(buildFeed(posts), {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

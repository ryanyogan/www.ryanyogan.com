import { createFileRoute } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "~/lib/seo";

// llms.txt (llmstxt.org): a community proposal, not a standard, and no large crawler is
// known to read it. It is kept because it is cheap: prerendered, built from the same data as
// the feed, and it states nothing the pages do not.
function buildLlmsTxt(): string {
  const posts = writingPosts
    .map((post) => `- [${post.title}](${absoluteUrl(`/writing/${post.slug}`)}): ${post.excerpt}`)
    .join("\n");
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

## Pages

- [Work](${absoluteUrl("/work")}): how he leads, what he has scaled, what he is building now, and a timeline
- [Now](${absoluteUrl("/now")}): what he is working on and thinking about, with the date it was last updated
- [Projects](${absoluteUrl("/projects")}): everything he has built, with its real status
- [Writing](${absoluteUrl("/writing")}): all posts
- [RSS feed](${absoluteUrl("/rss.xml")})
- [Sitemap](${absoluteUrl("/sitemap.xml")})

## Writing

${posts}
`;
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildLlmsTxt(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});

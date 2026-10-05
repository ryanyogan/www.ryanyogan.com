import { createFileRoute } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import { straightQuotes } from "~/lib/quotes";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "~/lib/seo";

// llms.txt (llmstxt.org): a community proposal, not a standard, and no large crawler is
// known to read it. It is kept because it is cheap: prerendered, built from the same data as
// the feed, and it states nothing the pages do not. It is plain text for a program to read,
// so its quotes are the keyboard's, as the markdown files have them.
function buildLlmsTxt(): string {
  const posts = writingPosts
    .map(
      (post) =>
        `- [${straightQuotes(post.title)}](${absoluteUrl(`/writing/${post.slug}`)}): ${straightQuotes(post.excerpt)}`,
    )
    .join("\n");
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

## Pages

- [Work](${absoluteUrl("/work")}): how he likes to work, how he leads, what he has scaled, what he is building now, what he is open to, and a timeline
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

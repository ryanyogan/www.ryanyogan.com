import { createFileRoute } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "~/lib/seo";

export const RSS_PATH = "/rss.xml";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC 822 date at midnight UTC for a post's ISO day. */
function rfc822(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

function buildFeed(): string {
  const items = writingPosts
    .map((post) => {
      const url = absoluteUrl(`/writing/${post.slug}`);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${rfc822(post.isoDate)}</pubDate>
    </item>`;
    })
    .join("\n");

  // The feed is prerendered, so the newest post dates it; a build clock would
  // change the file on every deploy.
  const newest = writingPosts[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${absoluteUrl("/writing")}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>${newest ? `\n    <lastBuildDate>${rfc822(newest.isoDate)}</lastBuildDate>` : ""}
    <atom:link href="${absoluteUrl(RSS_PATH)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildFeed(), {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});

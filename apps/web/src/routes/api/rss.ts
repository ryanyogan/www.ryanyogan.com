import { createAPIFileRoute } from "@tanstack/react-start/api";
import { writingPosts } from "~/lib/content";

export const APIRoute = createAPIFileRoute("/api/rss")({
  GET: () => {
    const siteUrl = "https://ryanyogan.com";
    const items = writingPosts
      .map(
        (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/writing/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/writing/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>ryan.yogan@hey.com (Ryan Yogan)</author>
    </item>`,
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ryan Yogan</title>
    <link>${siteUrl}</link>
    <description>Thoughts on engineering, leadership, distributed systems, Elixir, AI, and building things.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
});

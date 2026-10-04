import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./seo";

export const RSS_PATH = "/rss.xml";

export interface FeedPost {
  slug: string;
  title: string;
  excerpt: string;
  /** YYYY-MM-DD publication day. */
  isoDate: string;
  /** The rendered body (src/lib/markdown.ts), as the post's page shows it. */
  html: string;
}

// XML 1.0 allows no control character but tab, line feed and carriage return.
// oxlint-disable-next-line no-control-regex
const XML_FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

function escapeXml(text: string): string {
  return text
    .replace(XML_FORBIDDEN, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A CDATA section. The one sequence that would end it early is split across two. */
function cdata(text: string): string {
  return `<![CDATA[${text.replace(XML_FORBIDDEN, "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** RFC 822 date at midnight UTC for a post's ISO day. */
function rfc822(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

// A start tag as rehype-stringify writes it: every value in double quotes, and `<` in text
// always escaped, so this never matches inside a code sample.
const START_TAG = /<[a-z][a-z0-9]*(?:\s+[^\s"=<>/]+(?:="[^"]*")?)*\s*\/?>/g;
const URL_ATTRIBUTE = /(\s)(href|src|srcset)="([^"]*)"/g;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function resolve(url: string, pageUrl: string): string {
  if (!url || HAS_SCHEME.test(url) || url.startsWith("//")) return url;
  if (url.startsWith("#")) return `${pageUrl}${url}`;
  if (url.startsWith("/")) return `${SITE_URL}${url}`;
  return `${pageUrl.slice(0, pageUrl.lastIndexOf("/") + 1)}${url}`;
}

/**
 * A post's HTML with every link and image address made absolute. A reader shows the content
 * on its own origin, where `/images/a.png` or `#notes` would point at the reader.
 */
export function absolutizeHtml(html: string, pageUrl: string): string {
  return html.replace(START_TAG, (tag) =>
    tag.replace(URL_ATTRIBUTE, (_, space: string, name: string, value: string) => {
      const resolved =
        name === "srcset"
          ? value
              .split(",")
              .map((candidate) => {
                const [url = "", ...descriptor] = candidate.trim().split(/\s+/);
                return [resolve(url, pageUrl), ...descriptor].join(" ");
              })
              .join(", ")
          : resolve(value, pageUrl);
      return `${space}${name}="${resolved}"`;
    }),
  );
}

/**
 * RSS 2.0 with each post in full (`content:encoded`), newest first as given. Dates come from
 * the posts: the feed is prerendered, and a build clock would change the file on every deploy.
 */
export function buildFeed(posts: readonly FeedPost[]): string {
  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/writing/${post.slug}`);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${rfc822(post.isoDate)}</pubDate>
      <content:encoded>${cdata(absolutizeHtml(post.html, url))}</content:encoded>
    </item>`;
    })
    .join("\n");

  const newest = posts[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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

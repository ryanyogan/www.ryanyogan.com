import { describe, expect, it } from "vitest";
import { absolutizeHtml, buildFeed } from "./feed";
import { type ProseImages, renderMarkdown } from "./markdown";

const images: ProseImages = {
  "/images/nexus.png": {
    width: 1098,
    height: 921,
    avif: "/images/opt/nexus.720.aaaa.avif 720w, /images/opt/nexus.1098.bbbb.avif 1098w",
    webp: "/images/opt/nexus.720.cccc.webp 720w, /images/opt/nexus.1098.dddd.webp 1098w",
  },
};

const PAGE = "https://ryanyogan.com/writing/newer";

// A body as the build renders it: site links, an image with its copies, a fragment link,
// an outside link, and code that only looks like markup.
const body = renderMarkdown(
  [
    "See [the work page](/work), [the notes](#notes) and [GitHub](https://github.com/ryanyogan).",
    "![Nexus brain](/images/nexus.png)",
    '```\n<a href="/not-a-link">x</a> <img src="/nor/this.png">\n```',
    'Inline `href="/still-text"` and a mail link <mailto:a@example.com>.',
    "## Notes",
  ].join("\n\n"),
  images,
);

const xml = buildFeed([
  {
    slug: "newer",
    title: "Ships & <tags>",
    excerpt: 'A "quoted" one',
    isoDate: "2026-09-10",
    html: body,
  },
  {
    slug: "older",
    title: "Older",
    excerpt: "Plain.",
    isoDate: "2025-01-02",
    html: "<p>Short.</p>",
  },
]);

const items = xml.split("<item>").slice(1);
const element = (source: string, name: string) =>
  new RegExp(`<${name}(?: [^>]*)?>([\\s\\S]*?)</${name}>`).exec(source)?.[1];

/** "Thu, 10 Sep 2026 00:00:00 GMT": day name, two-digit day, four-digit year, a zone. */
const RFC_822 =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;

describe("absolutizeHtml", () => {
  const html = absolutizeHtml(body, PAGE);

  it("makes site paths, fragments and every srcset candidate absolute", () => {
    expect(html).toContain('href="https://ryanyogan.com/work"');
    expect(html).toContain(`href="${PAGE}#notes"`);
    expect(html).toContain('src="https://ryanyogan.com/images/nexus.png"');
    expect(html).toContain(
      'srcset="https://ryanyogan.com/images/opt/nexus.720.aaaa.avif 720w, https://ryanyogan.com/images/opt/nexus.1098.bbbb.avif 1098w"',
    );
    expect(html).not.toMatch(/<[a-z][^<>]*\s(?:href|src)="(?!https:|mailto:)/);
    expect(html).not.toMatch(/<[a-z][^<>]*\ssrcset="(?!https:)/);
    expect(html).not.toMatch(/, \/images/);
  });

  it("leaves addresses that are already absolute alone", () => {
    expect(html).toContain('href="https://github.com/ryanyogan"');
    expect(html).toContain('href="mailto:a@example.com"');
    expect(absolutizeHtml('<img src="//cdn.example.com/a.png" alt="">', PAGE)).toBe(
      '<img src="//cdn.example.com/a.png" alt="">',
    );
  });

  it("resolves a path with no leading slash against the post's folder", () => {
    expect(absolutizeHtml('<a href="older">x</a>', PAGE)).toBe(
      '<a href="https://ryanyogan.com/writing/older">x</a>',
    );
  });

  it("does not touch text that only looks like an attribute", () => {
    for (const path of ["/not-a-link", "/nor/this.png", "/still-text"]) {
      expect(html).toContain(path);
      expect(html).not.toContain(`https://ryanyogan.com${path}`);
    }
    // A `>` inside a quoted value does not end the tag early.
    expect(absolutizeHtml('<img alt="a > b" src="/a.png">', PAGE)).toBe(
      '<img alt="a > b" src="https://ryanyogan.com/a.png">',
    );
  });
});

// The rules the W3C feed validator checks for RSS 2.0 with the Atom and content modules.
describe("buildFeed", () => {
  it("declares RSS 2.0 and both namespaces it uses", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"')).toBe(true);
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
  });

  it("has the required channel elements and a self link to the feed's own URL", () => {
    const channel = xml.split("<item>")[0];
    expect(element(channel, "title")).toBe("Ryan Yogan");
    expect(element(channel, "link")).toBe("https://ryanyogan.com/writing");
    expect(element(channel, "description")).toBeTruthy();
    expect(channel).toContain(
      '<atom:link href="https://ryanyogan.com/rss.xml" rel="self" type="application/rss+xml"/>',
    );
  });

  it("dates the feed and each item from the posts, in RFC 822", () => {
    expect(element(xml, "lastBuildDate")).toBe("Thu, 10 Sep 2026 00:00:00 GMT");
    expect(items.map((item) => element(item, "pubDate"))).toEqual([
      "Thu, 10 Sep 2026 00:00:00 GMT",
      "Thu, 02 Jan 2025 00:00:00 GMT",
    ]);
    for (const item of items) expect(element(item, "pubDate")).toMatch(RFC_822);
    expect(buildFeed([])).not.toContain("lastBuildDate");
  });

  it("gives each item a title, a link, a permalink guid equal to it, and a description", () => {
    expect(items).toHaveLength(2);
    const guids = items.map((item) => element(item, "guid"));
    expect(new Set(guids).size).toBe(2);
    for (const item of items) {
      expect(element(item, "link")).toMatch(/^https:\/\/ryanyogan\.com\/writing\/[a-z]+$/);
      expect(element(item, "guid")).toBe(element(item, "link"));
      expect(item).toContain('<guid isPermaLink="true">');
    }
    expect(element(items[0], "title")).toBe("Ships &amp; &lt;tags&gt;");
    expect(element(items[0], "description")).toBe("A &quot;quoted&quot; one");
  });

  it("carries the whole post in content:encoded, with absolute addresses", () => {
    const content = element(items[0], "content:encoded") ?? "";
    expect(content.startsWith("<![CDATA[<p>See ")).toBe(true);
    expect(content.endsWith("]]>")).toBe(true);
    expect(content).toContain('<h2 id="notes">Notes</h2>');
    expect(content).toContain('src="https://ryanyogan.com/images/nexus.png"');
    expect(content).toContain(`href="${PAGE}#notes"`);
    expect(element(items[1], "content:encoded")).toBe("<![CDATA[<p>Short.</p>]]>");
  });

  it("keeps a ]]> in a post from ending the CDATA section", () => {
    const html = "<pre><code>a ]]> b ]]> c</code></pre>";
    const feed = buildFeed([{ slug: "a", title: "A", excerpt: "x", isoDate: "2026-01-01", html }]);
    const content = element(feed, "content:encoded") ?? "";
    // Each section closes exactly once, and the sections put together are the post.
    const sections = content.split("<![CDATA[").slice(1);
    expect(sections).toHaveLength(3);
    for (const section of sections) expect(section.match(/]]>/g)).toHaveLength(1);
    expect(sections.map((section) => section.replace(/]]>$/, "")).join("")).toBe(html);
  });

  it("drops characters XML 1.0 forbids", () => {
    const feed = buildFeed([
      {
        slug: "a",
        title: "A\u0000B",
        excerpt: "x\u000By",
        isoDate: "2026-01-01",
        html: "<p>c\u0008d</p>",
      },
    ]);
    // oxlint-disable-next-line no-control-regex
    expect(feed).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
    expect(feed).toContain("<title>AB</title>");
  });
});

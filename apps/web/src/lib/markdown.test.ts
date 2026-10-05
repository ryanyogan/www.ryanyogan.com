import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Element, Root } from "hast";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { typesetMeta } from "../../vite-plugin-posts";
import { parseFrontmatter } from "./frontmatter";
import { type ProseImages, renderMarkdown } from "./markdown";
import { straightQuotes } from "./quotes";

// What the build hands over for a file in public/images (vite-plugin-images.ts).
const images: ProseImages = {
  "/images/nexus.png": {
    width: 1098,
    height: 921,
    avif: "/images/opt/nexus.720.aaaa.avif 720w, /images/opt/nexus.1098.bbbb.avif 1098w",
    webp: "/images/opt/nexus.720.cccc.webp 720w, /images/opt/nexus.1098.dddd.webp 1098w",
  },
};

describe("renderMarkdown: structure the prose styles rely on", () => {
  it("renders an image alone in a paragraph as a figure, not inside a <p>", () => {
    const html = renderMarkdown("Before.\n\n![Nexus brain](/images/nexus.png)\n\nAfter.");
    expect(html).toContain(
      '<figure><img src="/images/nexus.png" alt="Nexus brain" loading="lazy" decoding="async"></figure>',
    );
    expect(html).not.toMatch(/<p[^>]*>\s*<figure/);
  });

  it("captions a figure with the image's title, never with its alt", () => {
    const html = renderMarkdown('Text.\n\n![A graph of nodes](/a.png "The graph after a week.")');
    expect(html).toContain(
      '<figure><img src="/a.png" alt="A graph of nodes" loading="lazy" decoding="async"><figcaption>The graph after a week.</figcaption></figure>',
    );
    expect(html).not.toContain("title=");
    // No title, no caption: the alt alone would be read twice by a screen reader.
    expect(renderMarkdown("Text.\n\n![A graph of nodes](/a.png)")).not.toContain("<figcaption");
  });

  it("reads a title that starts with a size as the size, and the rest as the caption", () => {
    const sized = renderMarkdown('Text.\n\n![Chart](https://example.com/c.png "1200x800")');
    expect(sized).toContain('width="1200" height="800"');
    expect(sized).not.toContain("<figcaption");
    const both = renderMarkdown(
      'Text.\n\n![Chart](https://example.com/c.png "1200x800 Requests a day.")',
    );
    expect(both).toContain(
      '<figure><img src="https://example.com/c.png" alt="Chart" width="1200" height="800" loading="lazy" decoding="async"><figcaption>Requests a day.</figcaption></figure>',
    );
    // A file the build measured keeps the build's size; its title is still the caption.
    const known = renderMarkdown('Text.\n\n![Nexus](/images/nexus.png "The brain.")', images);
    expect(known).toContain('width="1098" height="921"');
    expect(known).toContain("</picture><figcaption>The brain.</figcaption></figure>");
    expect(known).not.toMatch(/<p[^>]*>\s*<(figure|picture)/);
  });

  it("keeps an image among other content inline", () => {
    const html = renderMarkdown("See ![icon](/i.png) here.");
    expect(html).toContain('<img src="/i.png" alt="icon" loading="lazy" decoding="async">');
    expect(html).not.toContain("<figure");
  });

  it("gives an image the build knows its size and its AVIF and WebP copies", () => {
    const html = renderMarkdown("Before.\n\n![Nexus brain](/images/nexus.png)\n\nAfter.", images);
    const sizes = 'sizes="(min-width: 680px) 608px, 100vw"';
    expect(html).toContain(
      "<figure><picture>" +
        `<source type="image/avif" srcset="${images["/images/nexus.png"].avif}" ${sizes}>` +
        `<source type="image/webp" srcset="${images["/images/nexus.png"].webp}" ${sizes}>` +
        '<img src="/images/nexus.png" alt="Nexus brain" width="1098" height="921" loading="lazy" decoding="async">' +
        "</picture></figure>",
    );
    expect(html).not.toMatch(/<p[^>]*>\s*<(figure|picture)/);
  });

  it("takes the size of any other image from a WIDTHxHEIGHT title", () => {
    const html = renderMarkdown('Text.\n\n![Chart](https://example.com/c.png "1200x800")', images);
    expect(html).toContain(
      '<img src="https://example.com/c.png" alt="Chart" width="1200" height="800" loading="lazy" decoding="async">',
    );
    expect(html).not.toContain("<picture");
    // Any other title is dropped, and a name that is not a file of the build is not looked up.
    const plain = renderMarkdown('Text.\n\n![a](/a.png "A chart") ![b](constructor)', images);
    expect(plain).toContain('<img src="/a.png" alt="a" loading="lazy" decoding="async">');
    expect(plain).toContain('<img src="constructor" alt="b" loading="lazy" decoding="async">');
    expect(plain).not.toMatch(/title=|width=/);
  });

  it("loads the image that opens the body at once, and every later one lazily", () => {
    const html = renderMarkdown(
      "![Lead](/images/nexus.png)\n\nText.\n\n![Later](/images/nexus.png)",
      images,
    );
    const tags = html.match(/<img[^>]*>/g) ?? [];
    expect(tags).toHaveLength(2);
    expect(tags[0]).toContain('fetchpriority="high"');
    expect(tags[0]).not.toContain("loading=");
    expect(tags[1]).toContain('loading="lazy"');
    expect(tags[1]).not.toContain("fetchpriority");
  });

  it("opens external links in a new tab and leaves internal ones alone", () => {
    const html = renderMarkdown("[out](https://example.com) and [in](/work)");
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">out</a>',
    );
    expect(html).toContain('<a href="/work">in</a>');
  });

  it("highlights fenced code at render time and makes the block focusable", () => {
    const html = renderMarkdown("```ts\nconst a: number = 1;\n```");
    expect(html).toMatch(/<pre tabindex="0"><code class="hljs language-ts">/);
    expect(html).toContain('<span class="hljs-keyword">const</span>');
  });
  it("highlights Elixir, which the highlighter's default set leaves out", () => {
    const html = renderMarkdown("```elixir\ndefmodule Memory do\n  def get(id), do: id\nend\n```");
    expect(html).toContain('<code class="hljs language-elixir">');
    expect(html).toContain('<span class="hljs-keyword">defmodule</span>');
  });

  it("gives each heading an id made from its text", () => {
    const html = renderMarkdown(
      "## Why OTP, and Why Thoughts as Processes\n\n### What I've `scaled`\n\n#### Été 2024",
    );
    expect(html).toContain('<h2 id="why-otp-and-why-thoughts-as-processes">');
    expect(html).toContain('<h3 id="what-ive-scaled">');
    expect(html).toContain('<h4 id="été-2024">');
    // The same source gives the same ids on the next render.
    expect(renderMarkdown("## Setup\n\n## Setup")).toBe(renderMarkdown("## Setup\n\n## Setup"));
  });

  it("keeps heading ids unique within a body, wherever the heading sits", () => {
    const html = renderMarkdown(
      "## Setup\n\n## Setup\n\n> ## Setup\n\n## Setup 1\n\n## !!!\n\n## ???",
    );
    const ids = [...html.matchAll(/ id="([^"]*)"/g)].map((match) => match[1]);
    expect(ids).toEqual(["setup", "setup-1", "setup-2", "setup-1-1", "section", "section-1"]);
  });

  it("never gives a heading an id the page itself uses", () => {
    // Every id written as a literal in a route or a component, the skip link's target first.
    const src = fileURLToPath(new URL("..", import.meta.url));
    const used = new Set(["main"]);
    for (const name of readdirSync(src, { recursive: true, encoding: "utf8" })) {
      if (!name.endsWith(".tsx")) continue;
      const source = readFileSync(`${src}/${name}`, "utf8");
      for (const match of source.matchAll(/\b(?:id|[A-Z_]+_ID)\s*=\s*"([^"]+)"/g))
        used.add(match[1]!);
    }
    expect(used.size).toBeGreaterThan(10);
    for (const id of used) {
      // A heading's id is lower-case letters, digits and hyphens; nothing else can clash.
      if (!/^[a-z0-9-]+$/.test(id)) continue;
      const html = renderMarkdown(`## ${id.replaceAll("-", " ")}`);
      expect(html, `add "${id}" to RESERVED_IDS in markdown.ts`).toContain(`<h2 id="${id}-1">`);
    }
  });

  it("sets a column of figures to the right and keeps an alignment the source gives", () => {
    const html = renderMarkdown(
      [
        "| Route | Requests | Size | Note | Mixed |",
        "|---|---|---|:-:|---|",
        "| / | 12 | 117.4 KB | 1 | 3 |",
        "| /work | 1,204 | -3.1% | 2 | none |",
      ].join("\n"),
    );
    expect(html).toContain("<th>Route</th>");
    expect(html).toContain('<th data-align="right">Requests</th>');
    expect(html).toContain('<td data-align="right">1,204</td>');
    expect(html).toContain('<td data-align="right">117.4 KB</td>');
    expect(html).toContain('<td data-align="right">-3.1%</td>');
    expect(html).toContain('<th data-align="center">Note</th>');
    expect(html).toContain('<td data-align="center">2</td>');
    expect(html).toContain("<th>Mixed</th>");
    expect(html).toContain("<td>3</td>");
    expect(html).not.toMatch(/style=| align=/);
    // Asked for on the left: figures stay on the left.
    expect(renderMarkdown("| n |\n|:--|\n| 1 |")).toContain('<td data-align="left">1</td>');
  });

  it("renders the kitchen-sink fixture the browser tests read (e2e/prose.spec.ts)", () => {
    const fixture = fileURLToPath(new URL("../../e2e/kitchen-sink.md", import.meta.url));
    const html = renderMarkdown(readFileSync(fixture, "utf8"));
    for (const tag of ["h2", "h3", "ul", "ol", "blockquote", "pre", "table", "figure", "hr"]) {
      expect(html, tag).toContain(`<${tag}`);
    }
    const ids = [...html.matchAll(/ id="([^"]*)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("setup-1");
    expect(ids).toContain("main-1");
    expect(ids).not.toContain("main");
    expect(html).toContain("<figcaption>The memory graph after six attempts.</figcaption>");
    expect(html).not.toMatch(/<p[^>]*>\s*<(figure|picture)/);
    expect(ids).toContain("fnref_cost");
    expect(ids).toContain("fn_cost");
  });

  it("links a footnote to its note and back, with ids no heading can take", () => {
    const html = renderMarkdown(
      "## fn 1\n\nA claim.[^1] Another.[^why] The first again.[^1]\n\n[^1]: The source.\n[^why]: The reason.",
    );
    // The heading keeps the id its text gives; the footnote's ids have an underscore.
    expect(html).toContain('<h2 id="fn-1">');
    expect(html).toContain('<sup><a href="#fn_1" id="fnref_1" aria-label="Footnote 1">1</a></sup>');
    expect(html).toContain(
      '<sup><a href="#fn_why" id="fnref_why" aria-label="Footnote 2">2</a></sup>',
    );
    expect(html).toContain('<a href="#fn_1" id="fnref_1-2" aria-label="Footnote 1">1</a>');
    expect(html).toContain('<section aria-label="Footnotes">');
    expect(html).toContain('<li id="fn_1">');
    expect(html).toContain('<li id="fn_why">');
    expect(html).toContain('<a href="#fnref_1" aria-label="Back to reference 1">Back</a>');
    expect(html).toContain('<a href="#fnref_1-2" aria-label="Back to reference 1-2">Back</a>');
    expect(html).toContain('<a href="#fnref_why" aria-label="Back to reference 2">Back</a>');
    // No arrow, no heading above the notes, none of the generator's classes or prefixes.
    expect(html).not.toContain("\u21a9");
    expect(html.match(/<h2/g)).toHaveLength(1);
    expect(html).not.toMatch(/class=|data-footnote|user-content|footnote-label/);
    // Every link has its target, and no id is used twice.
    const ids = [...html.matchAll(/ id="([^"]*)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, target] of html.matchAll(/href="#([^"]*)"/g)) expect(ids).toContain(target);
  });

  it("leaves a link that only looks like a footnote's alone", () => {
    const html = renderMarkdown("[one](#fn-1) and [two](#user-content-fnref-1)");
    expect(html).toContain('<a href="#fn-1">one</a>');
    expect(html).toContain('<a href="#user-content-fnref-1">two</a>');
  });

  it("leaves inline code bare and wraps tables in a focusable scroller", () => {
    const html = renderMarkdown("Use `pnpm`.\n\n| a | b |\n|---|:-:|\n| 1 | 2 |");
    expect(html).toMatch(/<code>pnpm<\/code>/);
    expect(html).toMatch(/<div tabindex="0"><table>/);
    expect(html).not.toContain("style=");
  });

  it("supports GFM: strikethrough, task lists, autolinks", () => {
    const html = renderMarkdown("~~old~~\n\n- [x] done\n\nhttps://example.com");
    expect(html).toContain("<del>old</del>");
    expect(html).toContain('<input type="checkbox" checked disabled>');
    expect(html).toContain('href="https://example.com"');
  });
});

describe("renderMarkdown: a project body is untrusted text", () => {
  // The output is parsed the way a browser would parse it, then every element is checked:
  // a pattern over the string cannot tell an attribute from text inside a quoted attribute.
  const inert = (html: string) => {
    const tree = unified().use(rehypeParse, { fragment: true }).parse(html);
    const banned = /^(script|style|iframe|object|embed|form|svg|math|link|meta|base|template)$/;
    const walk = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        expect(child.tagName).not.toMatch(banned);
        for (const [name, value] of Object.entries(child.properties)) {
          expect(name).not.toMatch(/^on/i);
          expect(name).not.toMatch(/^(style|srcDoc|formAction)$/);
          if (name === "href" || name === "src") {
            expect(String(value).trim()).toMatch(/^(https?:|mailto:|\/|#|[\w.-]*$)/i);
          }
        }
        walk(child);
      }
    };
    walk(tree);
  };

  it("shows raw HTML as the text that was typed", () => {
    const html = renderMarkdown('Hello <script>alert("x")</script> <b onclick="steal()">bold</b>');
    inert(html);
    expect(html).toContain("&#x3C;script>");
    expect(html).toContain("alert");
  });

  it("neutralises HTML blocks, event handlers and embedded documents", () => {
    const html = renderMarkdown(
      [
        "<script>window.pwned = 1</script>",
        "",
        '<img src="x" onerror="window.pwned = 1">',
        "",
        '<iframe src="https://evil.example"></iframe>',
        "",
        '<svg onload="window.pwned = 1"></svg>',
        "",
        "<style>body { display: none }</style>",
      ].join("\n"),
    );
    inert(html);
  });

  it("drops script URLs from links and images", () => {
    const html = renderMarkdown(
      [
        "[a](javascript:alert(1))",
        "[b](JaVaScRiPt:alert(1))",
        "[c](data:text/html,<script>alert(1)</script>)",
        "[d](vbscript:x)",
        "![e](javascript:alert(1))",
        "<javascript:alert(1)>",
      ].join("\n\n"),
    );
    inert(html);
    expect(html).not.toMatch(/(href|src)="[^"]*script:/i);
  });

  it("cannot break out of an attribute or a code block", () => {
    const html = renderMarkdown(
      [
        '![x" onerror="alert(1)](/a.png)',
        '[y](/b "t\\" onmouseover=\\"alert(1)")',
        '```"><script>alert(1)</script>',
        "</code></pre><script>alert(1)</script>",
        "```",
      ].join("\n\n"),
    );
    inert(html);
  });
});

// What the build asks for (vite-plugin-posts.ts); a project body is rendered without it.
const typeset = (markdown: string) => renderMarkdown(markdown, {}, { typographic: true });

/** A rendered body taken apart: its tags with their attributes, its prose and its code. */
function parts(html: string): { tags: string[]; prose: string; code: string; ids: string[] } {
  const tree = unified().use(rehypeParse, { fragment: true }).parse(html) as Root;
  const found = { tags: [] as string[], prose: "", code: "", ids: [] as string[] };
  const walk = (node: Root | Element, verbatim: boolean): void => {
    for (const child of node.children) {
      if (child.type === "text") {
        if (verbatim) found.code += child.value;
        else found.prose += child.value;
      } else if (child.type === "element") {
        // An image's alt is prose; every other attribute has to come out as it went in.
        const { alt, ...rest } = child.properties;
        found.tags.push(`${child.tagName} ${JSON.stringify(rest)}`);
        if (typeof alt === "string") found.prose += `\n${alt}\n`;
        if (/^h[1-6]$/.test(child.tagName)) found.ids.push(String(child.properties.id));
        walk(child, verbatim || ["code", "pre", "kbd", "samp"].includes(child.tagName));
      }
    }
  };
  walk(tree, false);
  return found;
}

describe("renderMarkdown: typographic quotes in prose", () => {
  it("leaves a body as typed unless it is asked", () => {
    expect(renderMarkdown(`It didn't "hold".`)).toBe(`<p>It didn't "hold".</p>`);
    expect(typeset(`It didn't "hold".`)).toBe("<p>It didn’t “hold”.</p>");
  });

  it("pairs a quote across inline markup", () => {
    expect(typeset('"*impossible* in Python"')).toBe("<p>“<em>impossible</em> in Python”</p>");
    expect(typeset('*"impossible"* and **"so"**')).toBe(
      "<p><em>“impossible”</em> and <strong>“so”</strong></p>",
    );
    expect(typeset('the ["paper"](/writing/a) and [paper](/writing/a)\'s claim')).toBe(
      '<p>the <a href="/writing/a">“paper”</a> and <a href="/writing/a">paper</a>’s claim</p>',
    );
    expect(typeset("a `GenServer`'s state, \"`mix`\" and '`iex`'")).toBe(
      "<p>a <code>GenServer</code>’s state, “<code>mix</code>” and ‘<code>iex</code>’</p>",
    );
  });

  it("does not carry a quote from one block into the next", () => {
    expect(typeset('"One\n\n"Two" three\n\n- "a\n- b" c')).toBe(
      "<p>“One</p>\n<p>“Two” three</p>\n<ul>\n<li>“a</li>\n<li>b” c</li>\n</ul>",
    );
    // A paragraph typed over two lines is one block.
    expect(typeset('"One\ntwo"')).toBe("<p>“One\ntwo”</p>");
  });

  it("changes nothing in code, in a URL or in HTML that was typed", () => {
    const html = typeset(
      [
        'Run `echo "it\'s"` now.',
        "",
        "```js",
        'const a = "it\'s";',
        "```",
        "",
        "    indented 'code'",
        "",
        "[it's](/a?q='b') and <https://example.com/it's>",
        "",
        '<b class="x">it\'s</b>',
      ].join("\n"),
    );
    const { code, prose, tags } = parts(html);
    expect(code).toContain(`echo "it's"`);
    expect(code).toContain(`const a = "it's";`);
    expect(code).toContain("indented 'code'");
    expect(code).not.toMatch(/[‘’“”]/);
    expect(tags.join("\n")).not.toMatch(/[‘’“”]/);
    // A URL is as typed (the page writes its apostrophe as an entity, as it did before).
    expect(tags).toContain(`a {"href":"/a?q='b'"}`);
    expect(tags.some((tag) => tag.startsWith(`a {"href":"https://example.com/it's"`))).toBe(true);
    expect(html).toContain(">it’s</a> and ");
    // An address shown as a link's text is the address.
    expect(html).toContain(`>https://example.com/it's</a>`);
    // The markup that was typed is shown as typed; the words in it are prose.
    expect(prose).toContain(`<b class="x">it’s</b>`);
  });

  it("gives a heading the id it has without them", () => {
    const source = `## What Didn't Hold\n\n## The "Impossible" Claim\n\n### Lincoln's 'Loop'\n\n## What Didn't Hold`;
    const ids = ["what-didnt-hold", "the-impossible-claim", "lincolns-loop", "what-didnt-hold-1"];
    expect(parts(renderMarkdown(source)).ids).toEqual(ids);
    expect(parts(typeset(source)).ids).toEqual(ids);
    expect(typeset("## What Didn't Hold")).toBe('<h2 id="what-didnt-hold">What Didn’t Hold</h2>');
  });

  it("sets an image's alt and caption, and still reads a size from its title", () => {
    const html = typeset(`Text.\n\n![Ryan's "graph"](/a.png "1200x800 The graph's first week.")`);
    expect(html).toContain(
      '<img src="/a.png" alt="Ryan’s “graph”" width="1200" height="800" loading="lazy" decoding="async">',
    );
    expect(html).toContain("<figcaption>The graph’s first week.</figcaption>");
  });

  const contentDir = fileURLToPath(new URL("../../content", import.meta.url));
  const files = [
    ...readdirSync(`${contentDir}/writing`).map((name) => `writing/${name}`),
    "now.md",
  ].filter((name) => name.endsWith(".md"));

  it("changes only the quotes of every post and of /now, and only in prose", () => {
    expect(files.length).toBeGreaterThan(5);
    let changed = 0;
    let quotedCode = 0;
    for (const name of files) {
      const { content } = parseFrontmatter(readFileSync(`${contentDir}/${name}`, "utf8"));
      const typed = parts(renderMarkdown(content));
      const set = parts(typeset(content));
      // Same elements, same attributes (ids, hrefs, classes), same code.
      expect(set.tags, name).toEqual(typed.tags);
      expect(set.ids, name).toEqual(typed.ids);
      expect(set.code, name).toBe(typed.code);
      // The prose differs by its quotes and nothing else,
      expect(straightQuotes(set.prose), name).toBe(typed.prose);
      // and the only straight one left stands after a digit: a prime.
      const left = [...set.prose.matchAll(/.{0,30}(?<!\d)['"].{0,30}/gs)].map((m) => m[0]);
      expect(left, name).toEqual([]);
      if (set.prose !== typed.prose) changed += 1;
      if (/['"]/.test(set.code)) quotedCode += 1;
    }
    // The posts do have quotes to set, and code with quotes to keep.
    expect(changed).toBeGreaterThan(5);
    expect(quotedCode).toBeGreaterThan(2);
  });

  it("sets the title and the excerpt of a post, and no other field", () => {
    const { data } = parseFrontmatter(
      readFileSync(`${contentDir}/writing/lincoln-six-months-later.md`, "utf8"),
    );
    const set = typesetMeta(data);
    expect(set.title).toBe(
      "Lincoln, Six Months Later: What Held, What\u00a0Didn’t, and a Model Named After a Paradox",
    );
    expect(set.excerpt).toContain("TypeSafe’s new Jev model");
    expect({ ...set, title: "", excerpt: "" }).toEqual({ ...data, title: "", excerpt: "" });
    for (const name of files.filter((file) => file.startsWith("writing/"))) {
      const meta = typesetMeta(
        parseFrontmatter(readFileSync(`${contentDir}/${name}`, "utf8")).data,
      );
      expect(`${String(meta.title)} ${String(meta.excerpt)}`, name).not.toMatch(/(?<!\d)['"]/);
    }
  });
});

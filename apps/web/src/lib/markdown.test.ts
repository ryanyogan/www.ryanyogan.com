import type { Element, Root } from "hast";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown: structure the prose styles rely on", () => {
  it("renders an image alone in a paragraph as a figure, not inside a <p>", () => {
    const html = renderMarkdown("Before.\n\n![Nexus brain](/images/nexus.png)\n\nAfter.");
    expect(html).toContain(
      '<figure><img src="/images/nexus.png" alt="Nexus brain" loading="lazy"><figcaption>Nexus brain</figcaption></figure>',
    );
    expect(html).not.toMatch(/<p[^>]*>\s*<figure/);
  });

  it("keeps an image among other content inline", () => {
    const html = renderMarkdown("See ![icon](/i.png) here.");
    expect(html).toContain('<img src="/i.png" alt="icon" loading="lazy">');
    expect(html).not.toContain("<figure");
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

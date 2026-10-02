// Markdown to HTML, in one place. Three callers, none of them a public page's browser code:
//   - the build (vite-plugin-posts.ts) renders the writing posts,
//   - the Worker renders a project body read from D1 (projects.functions.ts),
//   - the admin's live preview imports this lazily (components/admin/ProjectForm.tsx).
// The output goes into the page through `<Prose html>`.
//
// Safety: a project body is text the owner types in the admin, so the result must be inert
// whatever it contains. Raw HTML in the source is never parsed as HTML (it is shown as the
// text that was typed), rehype-sanitize then keeps only GitHub's allowlist of elements,
// attributes and URL schemes, and the last step replaces the attributes of every styled
// element with a fixed set. See markdown.test.ts.
import type { Element, ElementContent, Properties, Root, RootContent } from "hast";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * The prose styles: one class list per element. A restyle changes these strings (Tailwind
 * reads them from this file) and nothing else.
 */
const classes: Record<string, string> = {
  h1: "display mb-6 text-[2.2rem] text-ink",
  h2: "display mt-12 mb-4 text-[1.7rem] text-ink",
  h3: "display mt-8 mb-3 text-[1.35rem] text-ink",
  h4: "mt-6 mb-2 font-sans text-[1.1rem] font-semibold text-ink",
  p: "mb-6 text-[1.125rem] leading-relaxed text-ink-soft",
  ul: "mb-6 list-none space-y-2 p-0",
  ol: "mb-6 list-decimal space-y-2 pl-6 text-[1.125rem] text-ink-soft marker:text-muted",
  li: "border-l border-rule-strong pl-4 text-[1.125rem] leading-relaxed text-ink-soft [ol>&]:border-0 [ol>&]:pl-1",
  a: "link text-ink decoration-build",
  blockquote:
    "my-8 border-l-[3px] border-build pl-5 font-serif italic [&>p]:text-[1.3rem] [&>p]:leading-snug [&>p]:text-ink [&>p:last-child]:mb-0",
  inlineCode:
    "rounded-[4px] border border-rule bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink",
  pre: "mb-6 overflow-x-auto rounded-card bg-[#1e1e1e] p-0 font-mono text-sm leading-relaxed text-[#d4d4d4]",
  strong: "font-semibold text-ink",
  em: "italic",
  hr: "my-12 border-rule-strong",
  tableWrap: "mb-6 overflow-x-auto",
  table: "w-full font-sans text-[0.95rem]",
  thead: "border-b border-rule-strong",
  tr: "border-b border-rule",
  th: "label px-4 py-3 text-left font-medium",
  td: "px-4 py-3 text-ink-soft",
  figure: "my-10",
  figureImg: "w-full rounded-card",
  figcaption: "mt-3 text-[0.9rem] text-muted",
  img: "max-w-full rounded-card",
};

const cls = (name: string): string[] => classes[name].split(" ");

/** Elements whose attributes are replaced by their class list alone. */
const classOnly = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "em",
  "hr",
  "thead",
  "tr",
  "th",
  "td",
]);

const el = (tagName: string, properties: Properties, children: ElementContent[]): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});

const text = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

function style(node: Element): Element {
  const children = node.children.map((child) => (child.type === "element" ? style(child) : child));
  const tag = node.tagName;

  if (tag === "p") {
    // An image alone in its paragraph is a figure, and a <figure> may not sit inside a <p>:
    // the browser would close the <p> early. Such a paragraph becomes the figure itself.
    const only = node.children.length === 1 ? node.children[0] : undefined;
    if (only?.type === "element" && only.tagName === "img") {
      const alt = text(only.properties.alt) ?? "";
      const img = el(
        "img",
        { src: text(only.properties.src), alt, className: cls("figureImg"), loading: "lazy" },
        [],
      );
      const caption = alt
        ? [el("figcaption", { className: cls("figcaption") }, [{ type: "text", value: alt }])]
        : [];
      return el("figure", { className: cls("figure") }, [img, ...caption]);
    }
  }
  if (classOnly.has(tag)) return el(tag, { className: cls(tag) }, children);

  switch (tag) {
    case "tbody":
      return el(tag, {}, children);
    case "a": {
      const href = text(node.properties.href);
      const properties: Properties = { href, className: cls("a") };
      if (href?.startsWith("http")) {
        properties.target = "_blank";
        properties.rel = ["noopener", "noreferrer"];
      }
      return el(tag, properties, children);
    }
    case "code": {
      // A highlighted block carries "hljs language-x". Anything else, a fenced block with no
      // language included, is styled as inline code.
      // The language is whatever follows the fence, so only a plain name is kept as a class.
      const given = node.properties.className;
      const highlighted =
        Array.isArray(given) &&
        given.length > 0 &&
        given.every((c) => /^[\w+#.-]+$/.test(String(c)));
      return el(tag, { className: highlighted ? given.map(String) : cls("inlineCode") }, children);
    }
    case "pre":
      return el(tag, { tabIndex: 0, className: cls("pre") }, children);
    case "table":
      // Wide tables scroll inside a focusable wrapper.
      return el("div", { className: cls("tableWrap"), tabIndex: 0 }, [
        el(tag, { className: cls("table") }, children),
      ]);
    case "img":
      // An image inside other content (text, a link, a list item) stays phrasing content.
      return el(
        tag,
        {
          src: text(node.properties.src),
          alt: text(node.properties.alt) ?? "",
          className: cls("img"),
          loading: "lazy",
        },
        [],
      );
    default:
      return { ...node, children };
  }
}

/** Raw HTML in the source becomes the text that was typed, never markup. */
function rawAsText(node: Root | Element): void {
  node.children = node.children.map((child) => {
    const type: string = child.type;
    if (type === "raw") return { type: "text", value: (child as { value: string }).value };
    if (child.type === "element") rawAsText(child);
    return child;
  }) as RootContent[] & ElementContent[];
}

const rehypeRawAsText = () => (tree: Root) => rawAsText(tree);

const rehypeProseStyle = () => (tree: Root) => {
  tree.children = tree.children.map((child) => (child.type === "element" ? style(child) : child));
};

function build() {
  return (
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      // "Dangerous" only passes raw HTML through as `raw` nodes; the next step turns each
      // into text, and nothing here ever parses one.
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRawAsText)
      .use(rehypeSanitize)
      // After the sanitiser: these two only add attributes this file controls.
      .use(rehypeHighlight)
      .use(rehypeProseStyle)
      .use(rehypeStringify)
      .freeze()
  );
}

let processor: ReturnType<typeof build> | undefined;

/** GitHub-flavoured markdown as sanitised, styled, highlighted HTML. Synchronous. */
export function renderMarkdown(markdown: string): string {
  // Built on first use: registering the highlighter's grammars is not free, and the Worker
  // should not pay for it at startup.
  processor ??= build();
  return String(processor.processSync(markdown));
}

// Markdown to HTML, in one place. Three callers, none of them a public page's browser code:
//   - the build (vite-plugin-posts.ts) renders the writing posts,
//   - the Worker renders a project body read from D1 (projects.functions.ts),
//   - the admin's live preview imports this lazily (components/admin/ProjectForm.tsx).
// The output goes into the page through `<Prose html>`.
//
// Safety: a project body is text the owner types in the admin, so the result must be inert
// whatever it contains. Raw HTML in the source is never parsed as HTML (it is shown as the
// text that was typed), rehype-sanitize then keeps only GitHub's allowlist of elements,
// attributes and URL schemes, and the last step replaces the attributes of every element it
// knows with a fixed set (no classes, apart from the highlighter's own on code). See markdown.test.ts.
import type { Element, ElementContent, Properties, Root, RootContent } from "hast";
import elixir from "highlight.js/lib/languages/elixir";
import { common } from "lowlight";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Elements that keep no attribute at all. The look comes from the `.prose` rules in
 * styles/app.css; this file emits plain elements with no classes.
 */
const bare = new Set([
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
  "tbody",
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
      const img = el("img", { src: text(only.properties.src), alt, loading: "lazy" }, []);
      const caption = alt ? [el("figcaption", {}, [{ type: "text", value: alt }])] : [];
      return el("figure", {}, [img, ...caption]);
    }
  }
  if (bare.has(tag)) return el(tag, {}, children);

  switch (tag) {
    case "a": {
      const href = text(node.properties.href);
      const properties: Properties = { href };
      if (href?.startsWith("http")) {
        properties.target = "_blank";
        properties.rel = ["noopener", "noreferrer"];
      }
      return el(tag, properties, children);
    }
    case "code": {
      // A highlighted block carries "hljs language-x". Anything else, a fenced block with no
      // language included, carries no class.
      // The language is whatever follows the fence, so only a plain name is kept as a class.
      const given = node.properties.className;
      const highlighted =
        Array.isArray(given) &&
        given.length > 0 &&
        given.every((c) => /^[\w+#.-]+$/.test(String(c)));
      return el(tag, highlighted ? { className: given.map(String) } : {}, children);
    }
    case "pre":
      return el(tag, { tabIndex: 0 }, children);
    case "table":
      // Wide tables scroll inside a focusable wrapper.
      return el("div", { tabIndex: 0 }, [el(tag, {}, children)]);
    case "img":
      // An image inside other content (text, a link, a list item) stays phrasing content.
      return el(
        tag,
        {
          src: text(node.properties.src),
          alt: text(node.properties.alt) ?? "",
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
      // The default set has no Elixir, which most code on this site is: its blocks got the
      // language class and no colours.
      .use(rehypeHighlight, { languages: { ...common, elixir } })
      .use(rehypeProseStyle)
      .use(rehypeStringify)
      .freeze()
  );
}

let processor: ReturnType<typeof build> | undefined;

/** GitHub-flavoured markdown as sanitised, highlighted HTML. Synchronous. */
export function renderMarkdown(markdown: string): string {
  // Built on first use: registering the highlighter's grammars is not free, and the Worker
  // should not pay for it at startup.
  processor ??= build();
  return String(processor.processSync(markdown));
}

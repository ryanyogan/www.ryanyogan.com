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
// knows with a fixed set (no classes, apart from the highlighter's own on code; a heading's id
// and a footnote's two ids are made here). See markdown.test.ts.
import type { Element, ElementContent, Properties, Root, RootContent, Text } from "hast";
import elixir from "highlight.js/lib/languages/elixir";
import { common } from "lowlight";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { BREAK, OPAQUE, typographicQuotes } from "./quotes";

/**
 * Elements that keep no attribute at all. The look comes from the `.prose` rules in
 * styles/app.css; this file emits plain elements with no classes.
 */
const bare = new Set([
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
  "tbody",
]);

const el = (tagName: string, properties: Properties, children: ElementContent[]): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});

/**
 * A file in public/images as the build measured and encoded it (vite-plugin-images.ts):
 * its own size, and a `srcset` of the AVIF and WebP copies.
 */
export interface ProseImage {
  width: number;
  height: number;
  avif: string;
  webp: string;
}
export type ProseImages = Record<string, ProseImage>;

/** The reading column is about 608px at most (.post, .read); under that an image fills the screen. */
const SIZES = "(min-width: 680px) 608px, 100vw";

const text = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/**
 * An id the page itself uses (routes and components), which a heading may not take: the
 * skip link goes to `main`, and the admin preview sits beside the form. markdown.test.ts
 * reads the ids out of src/ and fails when one is missing here.
 */
const RESERVED_IDS = [
  "main",
  "site-nav",
  "kb-help-h",
  "home-h",
  "idx-h",
  "both-h",
  "off-h",
  "open-h",
  "wr-h",
  "new-h",
  "proj-h",
  "proj-open-h",
  "work-h",
  "github-error",
  "github-stats",
  "github-refresh-message",
  "repo-counts",
  "ai-draft",
  "ai-generated-at",
  "ai-error",
  "ai-caveats",
  "ai-suggested",
  "ai-unsaved",
  "adm-ai-h",
  "adm-preview-h",
  "body-preview",
];

/** What one body carries through `style`: the build's images and the ids already taken. */
interface Context {
  images: ProseImages;
  ids: Set<string>;
}

const plain = (node: ElementContent): string =>
  node.type === "text"
    ? node.value
    : node.type === "element"
      ? node.children.map(plain).join("")
      : "";

/**
 * A heading's id, so a section can be linked to: its text in lower case with hyphens
 * ("Why OTP, and why?" is `why-otp-and-why`). The same text gives the same id on every
 * render; a repeat within one body, or a clash with the page's own ids, gets -1, -2, ...
 */
function headingId(node: Element, ids: Set<string>): string {
  const slug =
    plain(node)
      .toLowerCase()
      .replace(/['\u2019]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "section";
  let id = slug;
  for (let n = 1; ids.has(id); n++) id = `${slug}-${n}`;
  ids.add(id);
  return id;
}

/**
 * A footnote's name, from the id or href remark-rehype gave it and the sanitiser may have
 * prefixed: "#user-content-fn-1" is "1", and a second reference to the same note is "1-2".
 * The ids made from it, `fn_1` on the note and `fnref_1` on the reference, have an
 * underscore, which no heading id (letters, digits and hyphens) and no id in RESERVED_IDS
 * has, so neither can be taken by one.
 */
function footnote(value: unknown, kind: "fn" | "fnref"): string | undefined {
  const name = text(value)?.match(/^#?(?:user-content-)*(fn|fnref)-([\w%.-]+)$/);
  return name?.[1] === kind ? name[2] : undefined;
}

/** A leading `WIDTHxHEIGHT` in an image's title is its size; the rest is its caption. */
const TITLE = /^(\d{1,5})x(\d{1,5})(?:\s+(.+))?$/;

/** A figure, an amount or a measure: "12", "1,204.5", "-3%", "$40", "117.4 KB", "5.9:1". */
const NUMERIC =
  /^[+\-\u2212~<>\u2264\u2265]?[$\u20ac\u00a3]?\d[\d.,:]*(?:\s?(?:%|[a-z\u00b5/]{1,6}))?$/i;

const elements = (node: Element, name: string): Element[] =>
  node.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === name,
  );

/**
 * A column the source does not align (`---`) whose body cells are all figures is set to the
 * right, so the digits line up. `:--`, `:-:` and `--:` in the source are kept as written.
 */
function alignNumbers(table: Element): void {
  const rows = (section: string) =>
    elements(table, section).flatMap((part) =>
      elements(part, "tr").map((row) => [...elements(row, "th"), ...elements(row, "td")]),
    );
  const head = rows("thead")[0] ?? [];
  const body = rows("tbody");
  head.forEach((heading, column) => {
    if (heading.properties.dataAlign) return;
    const values = body
      .map((row) => (row[column] ? plain(row[column]).trim() : ""))
      .filter(Boolean);
    if (values.length === 0 || !values.every((value) => NUMERIC.test(value))) return;
    for (const row of [head, ...body]) {
      if (row[column]) row[column].properties.dataAlign = "right";
    }
  });
}

/**
 * `width` and `height` reserve the image's box before it loads. A file the build knows gets
 * them from the build, with its AVIF and WebP copies in a <picture>. Any other image (a
 * project body is typed in the admin and may point anywhere) can state them as its title:
 * `![alt](https://example.com/a.png "1200x800")`. Without either there is nothing to reserve.
 * `lead` is the image that opens the body, the only one that can be the largest paint of the
 * first screen: it loads at once. Every other image waits until it is near the viewport.
 */
function image(node: Element, images: ProseImages, lead: boolean): Element {
  const src = text(node.properties.src);
  const known = src && Object.hasOwn(images, src) ? images[src] : undefined;
  const stated = text(node.properties.title)?.match(TITLE);
  const size = known ?? (stated ? { width: Number(stated[1]), height: Number(stated[2]) } : null);
  const img = el(
    "img",
    {
      src,
      alt: text(node.properties.alt) ?? "",
      ...(size ? { width: size.width, height: size.height } : {}),
      ...(lead ? { fetchPriority: "high" } : { loading: "lazy" }),
      decoding: "async",
    },
    [],
  );
  if (!known) return img;
  return el("picture", {}, [
    el("source", { type: "image/avif", srcSet: known.avif, sizes: SIZES }, []),
    el("source", { type: "image/webp", srcSet: known.webp, sizes: SIZES }, []),
    img,
  ]);
}

function style(node: Element, context: Context, lead = false): Element {
  const { images } = context;
  const tag = node.tagName;
  if (tag === "section" && node.properties.dataFootnotes !== undefined) {
    // The notes at the end of the body: the list alone, named for a screen reader. The
    // heading remark-rehype writes above it is left out, so it takes no heading id.
    return el(
      tag,
      { ariaLabel: "Footnotes" },
      elements(node, "ol").map((list) => style(list, context)),
    );
  }
  // Before the children, so that ids are given out in the order the headings are read.
  const id = /^h[1-6]$/.test(tag) ? headingId(node, context.ids) : undefined;
  const children = node.children.map((child) =>
    child.type === "element" ? style(child, context) : child,
  );

  if (tag === "p") {
    // An image alone in its paragraph is a figure, and a <figure> may not sit inside a <p>:
    // the browser would close the <p> early. Such a paragraph becomes the figure itself.
    const only = node.children.length === 1 ? node.children[0] : undefined;
    if (only?.type === "element" && only.tagName === "img") {
      // The caption is the image's title, `![alt](src "caption")`, never its alt: a screen
      // reader would read the same sentence twice. A title that is only a size is no caption.
      const title = text(only.properties.title);
      const size = title?.match(TITLE);
      const words = size ? size[3] : title;
      const img = image(only, images, lead);
      const caption = words ? [el("figcaption", {}, [{ type: "text", value: words }])] : [];
      return el("figure", {}, [img, ...caption]);
    }
  }
  if (id) return el(tag, { id }, children);
  if (tag === "li") {
    const note = footnote(node.properties.id, "fn");
    if (note) return el(tag, { id: `fn_${note}` }, children);
  }
  if (bare.has(tag)) return el(tag, {}, children);

  switch (tag) {
    case "a": {
      const href = text(node.properties.href);
      // A footnote's number links to its note, and the note's "Back" to the number.
      if (node.properties.dataFootnoteRef !== undefined) {
        const note = footnote(href, "fn");
        const mark = footnote(node.properties.id, "fnref");
        if (note && mark) {
          const label = `Footnote ${plain(node)}`;
          return el(tag, { href: `#fn_${note}`, id: `fnref_${mark}`, ariaLabel: label }, children);
        }
      }
      if (node.properties.dataFootnoteBackref !== undefined) {
        const mark = footnote(href, "fnref");
        const label = text(node.properties.ariaLabel);
        if (mark) return el(tag, { href: `#fnref_${mark}`, ariaLabel: label }, children);
      }
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
    case "th":
    case "td": {
      // The column's alignment as the source gives it; a stylesheet rule reads it.
      const align = text(node.properties.align);
      return el(tag, align ? { dataAlign: align } : {}, children);
    }
    case "table": {
      const table = el(tag, {}, children);
      alignNumbers(table);
      // Wide tables scroll inside a focusable wrapper.
      return el("div", { tabIndex: 0 }, [table]);
    }
    case "img":
      // An image inside other content (text, a link, a list item) stays phrasing content.
      return image(node, images, false);
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

/** Phrasing elements: a sentence, and a quotation in it, runs on through them. */
const PHRASING = new Set(["a", "em", "strong", "del", "sup", "sub", "br", "input"]);
/** Text that is shown as typed: its quotes are part of what it says. */
const VERBATIM = new Set(["code", "kbd", "samp", "var"]);
const VERBATIM_BLOCK = new Set(["pre", "script", "style"]);

/** A link whose text is its own address, as `<https://example.com>` or a bare one is. */
function isAddress(node: Element): boolean {
  if (node.tagName !== "a") return false;
  const href = text(node.properties.href);
  const shown = plain(node);
  return href === shown || href === `mailto:${shown}` || href === `http://${shown}`;
}

/**
 * Typographic quotes in the prose of a body (lib/quotes.ts). Only text nodes change, and the
 * alt and title of an image (the title is its caption): no tag, no URL (one shown as a
 * link's text included), no id, nothing in code. Each block's text is read as one run, so a quote that opens before an `<em>` and
 * closes after it is still a pair, and inline code or an image in the run counts as a word.
 * A heading's id is made later from the same text and comes out as before: `headingId` drops
 * both kinds of apostrophe, and either kind of double quote is a hyphen to it.
 */
function typeset(tree: Root): void {
  const found: { node: Text; start: number }[] = [];
  let run = "";
  const walk = (parent: Root | Element): void => {
    for (const child of parent.children) {
      const type: string = child.type;
      if (child.type === "text") {
        found.push({ node: child, start: run.length });
        run += child.value;
      } else if (type === "raw") {
        // HTML typed into the source, which the next step shows as the text it is.
        run += OPAQUE;
      } else if (child.type === "element") {
        const tag = child.tagName;
        if (tag === "img") {
          const { alt, title } = child.properties;
          if (typeof alt === "string") child.properties.alt = typographicQuotes(alt);
          if (typeof title === "string") child.properties.title = typographicQuotes(title);
          run += OPAQUE;
        } else if (VERBATIM.has(tag) || isAddress(child)) run += OPAQUE;
        else if (PHRASING.has(tag)) walk(child);
        else {
          run += BREAK;
          if (!VERBATIM_BLOCK.has(tag)) walk(child);
          run += BREAK;
        }
      }
    }
  };
  walk(tree);
  const set = typographicQuotes(run);
  for (const { node, start } of found) {
    node.value = set.slice(start, start + node.value.length);
  }
}

// Asked for by the caller, per body (renderMarkdown below).
const rehypeTypeset = () => (tree: Root, file: { data: object }) => {
  if ((file.data as { typographic?: boolean }).typographic) typeset(tree);
};

// The caller's image record travels with the file being processed (renderMarkdown below).
const rehypeProseStyle = () => (tree: Root, file: { data: object }) => {
  const context: Context = {
    images: (file.data as { images?: ProseImages }).images ?? {},
    ids: new Set(RESERVED_IDS),
  };
  const first = tree.children.find((child) => child.type === "element");
  tree.children = tree.children.map((child) =>
    child.type === "element" ? style(child, context, child === first) : child,
  );
};

function build() {
  return (
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      // "Dangerous" only passes raw HTML through as `raw` nodes; the next step turns each
      // into text, and nothing here ever parses one.
      // A footnote's way back is the word, not remark's arrow (generated-look.test.ts).
      .use(remarkRehype, { allowDangerousHtml: true, footnoteBackContent: "Back" })
      // Before raw HTML becomes text: what was typed as markup is not prose.
      .use(rehypeTypeset)
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

/**
 * GitHub-flavoured markdown as sanitised, highlighted HTML. Synchronous.
 * `images` is the build's record of public/images; without it images are plain `<img>`.
 * `typographic` sets the prose's straight quotes as typographic ones: the build asks for it
 * for the posts and /now. A project body, which the owner types in the admin and sees in its
 * preview, is rendered as typed.
 */
export function renderMarkdown(
  markdown: string,
  images: ProseImages = {},
  { typographic = false }: { typographic?: boolean } = {},
): string {
  // Built on first use: registering the highlighter's grammars is not free, and the Worker
  // should not pay for it at startup.
  processor ??= build();
  return String(processor.processSync({ value: markdown, data: { images, typographic } }));
}

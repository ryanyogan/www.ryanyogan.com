import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { parseFrontmatter } from "./src/lib/frontmatter";
import { type ProseImages, renderMarkdown } from "./src/lib/markdown";
import { typographicQuotes } from "./src/lib/quotes";

/** Whole minutes to read the rendered body at 230 words a minute. */
function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/** The frontmatter a reader is shown as a sentence. */
const PROSE_FIELDS = ["title", "excerpt"];

export function typesetMeta(data: Record<string, unknown>): Record<string, unknown> {
  const set = { ...data };
  for (const field of PROSE_FIELDS) {
    const value = set[field];
    if (typeof value === "string") set[field] = typographicQuotes(value);
  }
  return set;
}

/**
 * Writing posts are rendered while the site is built, so no page ships a markdown parser,
 * a highlighter or markdown source. A post file can be imported two ways (src/lib/content.ts):
 *
 *   post.md?meta   its frontmatter, as an object (lists, search, feeds), plus `minutes`
 *   post.md?html   its body as HTML, highlighted (the post page, one chunk per post)
 *
 * `images` is what the build knows about public/images (vite-plugin-images.ts).
 *
 * The files are typed with straight quotes. The body, the title and the excerpt leave here
 * with typographic ones (src/lib/quotes.ts), so every page, list, tag and feed that shows
 * them has the same text; the slug, the dates and code are as typed.
 */
export function posts(images: () => Promise<ProseImages>): Plugin {
  const pattern = /\.md\?(meta|html)$/;
  return {
    name: "posts",
    async load(id) {
      const kind = id.match(pattern)?.[1];
      if (!kind) return null;
      const file = id.replace(pattern, ".md");
      this.addWatchFile(file);
      const { data, content } = parseFrontmatter(readFileSync(file, "utf8"));
      const html = renderMarkdown(content, await images(), { typographic: true });
      const value =
        kind === "meta" ? { ...typesetMeta(data), minutes: readingMinutes(html) } : html;
      return `export default ${JSON.stringify(value)};`;
    },
  };
}

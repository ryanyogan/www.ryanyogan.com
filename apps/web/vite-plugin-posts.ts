import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { parseFrontmatter } from "./src/lib/frontmatter";
import { type ProseImages, renderMarkdown } from "./src/lib/markdown";

/**
 * Writing posts are rendered while the site is built, so no page ships a markdown parser,
 * a highlighter or markdown source. A post file can be imported two ways (src/lib/content.ts):
 *
 *   post.md?meta   its frontmatter, as an object (lists, search, feeds), plus `minutes`
 *   post.md?html   its body as HTML, highlighted (the post page, one chunk per post)
 *
 * `images` is what the build knows about public/images (vite-plugin-images.ts).
 */
/** Whole minutes to read the rendered body at 230 words a minute. */
function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

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
      const html = renderMarkdown(content, await images());
      const value = kind === "meta" ? { ...data, minutes: readingMinutes(html) } : html;
      return `export default ${JSON.stringify(value)};`;
    },
  };
}

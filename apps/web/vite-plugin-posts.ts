import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { parseFrontmatter } from "./src/lib/frontmatter";
import { renderMarkdown } from "./src/lib/markdown";

/**
 * Writing posts are rendered while the site is built, so no page ships a markdown parser,
 * a highlighter or markdown source. A post file can be imported two ways (src/lib/content.ts):
 *
 *   post.md?meta   its frontmatter, as an object (lists, search, feeds)
 *   post.md?html   its body as HTML, highlighted (the post page, one chunk per post)
 */
export function posts(): Plugin {
  const pattern = /\.md\?(meta|html)$/;
  return {
    name: "posts",
    load(id) {
      const kind = id.match(pattern)?.[1];
      if (!kind) return null;
      const file = id.replace(pattern, ".md");
      this.addWatchFile(file);
      const { data, content } = parseFrontmatter(readFileSync(file, "utf8"));
      const value = kind === "meta" ? data : renderMarkdown(content);
      return `export default ${JSON.stringify(value)};`;
    },
  };
}

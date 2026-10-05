/** One section of /now: a `## ` heading of content/now.md and what is under it. */
export interface NowSection {
  /** The heading's id, as the renderer made it from its text (lib/markdown.ts). */
  id: string;
  /** The heading's own HTML: its text, set with typographic quotes. */
  title: string;
  html: string;
}

export interface NowBody {
  /** What the file says before its first `## ` heading: the paragraph under the title. */
  lede: string;
  sections: NowSection[];
}

const HEADING = /^<h2(?:\s+id="([^"]*)")?\s*>([\s\S]*?)<\/h2>/;

/**
 * The rendered body of content/now.md, cut at its h2 headings, so the page can set each
 * section as a row of its own (label in the gutter, a drawing beside some). The words stay
 * in the one markdown file.
 */
export function splitNow(html: string): NowBody {
  const [lede = "", ...parts] = html.split(/(?=<h2[\s>])/);
  return {
    lede: lede.trim(),
    sections: parts.map((part) => {
      const heading = HEADING.exec(part);
      if (!heading?.[1]) throw new Error(`content/now.md: a section without a heading id`);
      return { id: heading[1], title: heading[2]!, html: part.slice(heading[0].length).trim() };
    }),
  };
}

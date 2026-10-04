export interface WritingPost {
  slug: string;
  title: string;
  /** As written in the frontmatter, e.g. "April 6, 2026". */
  date: string;
  /** The same day as YYYY-MM-DD, for <time>, meta tags and the feed. */
  isoDate: string;
  year: string;
  author: string;
  excerpt: string;
}

// vite-plugin-posts.ts answers both queries at build time. The frontmatter of every post is
// in the bundle of any page that lists posts; a post's body is a chunk of its own, fetched
// only by that post's page.
const writingMeta = import.meta.glob("../../content/writing/*.md", {
  eager: true,
  query: "?meta",
  import: "default",
}) as Record<string, Record<string, unknown>>;

const writingHtml = import.meta.glob("../../content/writing/*.md", {
  query: "?html",
  import: "default",
}) as Record<string, () => Promise<string>>;

/** The rendered body of a post, or undefined for an unknown slug. */
export async function loadPostHtml(slug: string): Promise<string | undefined> {
  return writingHtml[`../../content/writing/${slug}.md`]?.();
}

function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(".md", "");
}

/**
 * A frontmatter date ("April 6, 2026") as YYYY-MM-DD. The string has no zone,
 * so it is read and written in local time and the day cannot shift.
 */
function isoDay(date: string, field: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`content/${field} is not a date (got ${String(date)})`);
  }
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export const writingPosts: WritingPost[] = Object.entries(writingMeta)
  .map(([path, data]) => {
    const slug = slugFromPath(path);
    const date = data.date as string;
    return {
      slug,
      title: data.title as string,
      date,
      isoDate: isoDay(date, `writing/${slug}.md: "date"`),
      year: data.year as string,
      author: data.author as string,
      excerpt: data.excerpt as string,
    };
  })
  .sort((a, b) => b.isoDate.localeCompare(a.isoDate));

export interface NowPage {
  /** As written in the frontmatter, e.g. "October 4, 2026": the day the page was last edited. */
  updated: string;
  /** The same day as YYYY-MM-DD, for <time> and the sitemap's lastmod. */
  isoDate: string;
  place: string;
}

// content/now.md goes through the same plugin as a post: its frontmatter is in the bundle,
// its body is a chunk only /now fetches. Updating the page is a commit to that file.
const nowMeta = import.meta.glob("../../content/now.md", {
  eager: true,
  query: "?meta",
  import: "default",
}) as Record<string, Record<string, unknown>>;

const nowHtml = import.meta.glob("../../content/now.md", {
  query: "?html",
  import: "default",
}) as Record<string, () => Promise<string>>;

const nowData = nowMeta["../../content/now.md"];

export const nowPage: NowPage = {
  updated: nowData.updated as string,
  isoDate: isoDay(nowData.updated as string, 'now.md: "updated"'),
  place: nowData.place as string,
};

/** The rendered body of /now. */
export async function loadNowHtml(): Promise<string> {
  return nowHtml["../../content/now.md"]();
}

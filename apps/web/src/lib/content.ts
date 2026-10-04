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
  /** Whole minutes to read the body, counted from the rendered HTML when the site is built. */
  minutes: number;
}

// vite-plugin-posts.ts answers both queries at build time. The frontmatter of every post is
// in the bundle of any page that lists posts; a post's body is a chunk of its own, fetched
// only when a reader arrives at that post by a link.
const writingMeta = import.meta.glob("../../content/writing/*.md", {
  eager: true,
  query: "?meta",
  import: "default",
}) as Record<string, Record<string, unknown>>;

const writingHtml = import.meta.glob("../../content/writing/*.md", {
  query: "?html",
  import: "default",
}) as Record<string, () => Promise<string>>;

// The bodies loaded so far, by slug. The post page draws from here and its loader returns
// nothing: what a loader returns is serialised into the document for hydration, which sent
// every body twice (40 KB of the longest post's 87 KB).
const postBodies = new Map<string, string>();

// A post opened by its URL arrives with its body in the HTML, and no loader runs in the
// browser. So the browser reads the body back from the element the server sent, as it does
// the stylesheet (styles/inline.ts). The script that imports this module is the last thing
// in <body>, so the element is complete by now.
if (!import.meta.env.SSR) {
  const slug = location.pathname.match(/^\/writing\/([^/]+)\/?$/)?.[1];
  const sent = slug ? document.querySelector(".post-body > .prose") : null;
  if (slug && sent) postBodies.set(slug, sent.innerHTML);
}

/** The rendered body of a post, or undefined for an unknown slug. */
export async function loadPostHtml(slug: string): Promise<string | undefined> {
  const loaded = postBodies.get(slug);
  if (loaded !== undefined) return loaded;
  const html = await writingHtml[`../../content/writing/${slug}.md`]?.();
  if (html !== undefined) postBodies.set(slug, html);
  return html;
}

/** The body `loadPostHtml` has loaded for this slug: the post page's loader waits for it. */
export function postHtml(slug: string): string {
  return postBodies.get(slug) ?? "";
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
      minutes: data.minutes as number,
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

import { absoluteUrl, isoDateTime } from "./seo";

export const SITEMAP_PATH = "/sitemap.xml";

export interface SitemapInput {
  /** Posts: slug and YYYY-MM-DD publication day. */
  posts: readonly { slug: string; isoDate: string }[];
  /** Published projects only: slug and `updated_at` (ISO 8601). */
  projects: readonly { slug: string; updatedAt: string }[];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A stored timestamp as W3C datetime (whole seconds, UTC), or undefined when it is not a date. */
function w3cDate(value: string): string | undefined {
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function newest(dates: readonly (string | undefined)[]): string | undefined {
  return dates
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);
}

/**
 * Every public URL, in the one canonical form, with `lastmod` only where a real content date
 * exists: a post's day, a project's `updated_at`, and for a list the newest of what it
 * lists. /work has no recorded date, so it has no lastmod. Never the build or request time.
 */
export function buildSitemap({ posts, projects }: SitemapInput): string {
  const postDates = posts.map((post) => w3cDate(isoDateTime(post.isoDate)));
  const projectDates = projects.map((project) => w3cDate(project.updatedAt));
  const entries: { path: string; lastmod?: string }[] = [
    { path: "/", lastmod: newest([...postDates, ...projectDates]) },
    { path: "/work" },
    { path: "/projects", lastmod: newest(projectDates) },
    { path: "/writing", lastmod: newest(postDates) },
    ...projects.map((project, index) => ({
      path: `/projects/${project.slug}`,
      lastmod: projectDates[index],
    })),
    ...posts.map((post, index) => ({ path: `/writing/${post.slug}`, lastmod: postDates[index] })),
  ];
  const urls = entries
    .map(({ path, lastmod }) => {
      const date = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(absoluteUrl(path))}</loc>${date}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

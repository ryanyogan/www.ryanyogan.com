// View counts of the writing posts: what the two /api/views routes and the browser share.
// Pure, so it is unit-tested; the SQL is in db/post-views.ts.

/** GET: every post's count. POST `${VIEWS_API}/<slug>`: count one view of that post. */
export const VIEWS_API = "/api/views";

/** Only a real post may get a row: anything else would let a stranger fill the table. */
export function isPostSlug(slug: unknown, slugs: readonly string[]): slug is string {
  return typeof slug === "string" && slugs.includes(slug);
}

/** 1204 as "1,204". The same on the server and in every browser, whatever its locale. */
export function formatViews(views: number): string {
  return views.toLocaleString("en-US");
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** The count in a `{ views: 1204 }` answer, or undefined for anything else. */
export function readViews(body: unknown): number | undefined {
  const views = (body as { views?: unknown } | null)?.views;
  return isCount(views) ? views : undefined;
}

/** The counts in a `{ views: { slug: 1204 } }` answer; an entry that is not a count is dropped. */
export function readViewCounts(body: unknown): Record<string, number> {
  const views = (body as { views?: unknown } | null)?.views;
  if (typeof views !== "object" || views === null) return {};
  return Object.fromEntries(
    Object.entries(views).filter((entry): entry is [string, number] => isCount(entry[1])),
  );
}

/** A JSON answer no browser or cache keeps: a count is only right at the moment it is read. */
export function viewsResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

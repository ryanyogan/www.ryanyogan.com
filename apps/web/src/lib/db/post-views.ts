// Server only: the one place that talks SQL to the `post_views` table
// (migrations/0003_post_views.sql).

/** One statement, so two loads at the same moment both count: insert at 1, or add one. */
const COUNT_VIEW = `INSERT INTO post_views (slug, views) VALUES (?, 1)
  ON CONFLICT (slug) DO UPDATE SET
    views = views + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  RETURNING views`;

/** Adds one view to a post and returns its new total. The caller checks the slug. */
export async function countPostView(db: D1Database, slug: string): Promise<number> {
  const row = await db.prepare(COUNT_VIEW).bind(slug).first<{ views: number }>();
  if (!row) throw new Error("post_views: the upsert returned no row");
  return row.views;
}

/** Every counted post's total, by slug. A post nobody has opened has no row. */
export async function listPostViews(db: D1Database): Promise<Record<string, number>> {
  const { results } = await db
    .prepare("SELECT slug, views FROM post_views")
    .all<{ slug: string; views: number }>();
  return Object.fromEntries(results.map((row) => [row.slug, row.views]));
}

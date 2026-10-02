import { PROJECT_GROUPS } from "@repo/shared";
import type {
  Project,
  ProjectDetail,
  ProjectGroup,
  ProjectSource,
  ProjectStatus,
} from "@repo/shared";
import type { ProjectInput } from "../admin/validate";

// Server only: the one place that talks SQL to the `projects` table
// (migrations/0001_projects.sql). Public reads always filter on published = 1.

/** A row of `projects` as D1 returns it. */
export interface ProjectRow {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  body: string;
  /** JSON array of strings. */
  tech: string;
  group: ProjectGroup;
  status: ProjectStatus;
  status_label: string | null;
  sort_order: number;
  github_url: string | null;
  live_url: string | null;
  repo_full_name: string | null;
  repo_pushed_at: string | null;
  stars: number | null;
  published: 0 | 1;
  source: ProjectSource;
  ai_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

type PrivateColumn =
  | "repo_full_name"
  | "repo_pushed_at"
  | "stars"
  | "published"
  | "source"
  | "ai_generated_at"
  | "created_at"
  | "updated_at";

/** The columns the public pages select. */
type SummaryRow = Omit<ProjectRow, "body" | PrivateColumn>;

const SUMMARY_COLUMNS = `slug, title, tagline, summary, tech, "group", status, status_label, sort_order,
  github_url, live_url`;

function parseTech(tech: string): string[] {
  const parsed: unknown = JSON.parse(tech);
  return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
}

function toProject(row: SummaryRow): Project {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tagline: row.tagline,
    tech: parseTech(row.tech),
    group: row.group,
    status: row.status,
    statusLabel: row.status_label ?? undefined,
    order: row.sort_order,
    github: row.github_url ?? undefined,
    live: row.live_url ?? undefined,
  };
}

function byGroupThenOrder(a: Project, b: Project): number {
  return (
    PROJECT_GROUPS.indexOf(a.group) - PROJECT_GROUPS.indexOf(b.group) ||
    a.order - b.order ||
    a.slug.localeCompare(b.slug)
  );
}

/** Every published project, in group order then `sort_order`. No bodies. */
export async function listPublishedProjects(db: D1Database): Promise<Project[]> {
  const { results } = await db
    .prepare(`SELECT ${SUMMARY_COLUMNS} FROM projects WHERE published = 1`)
    .all<SummaryRow>();
  return results.map(toProject).sort(byGroupThenOrder);
}

/** One published project with its body, or null for an unknown slug or a draft. */
export async function getPublishedProject(
  db: D1Database,
  slug: string,
): Promise<ProjectDetail | null> {
  const row = await db
    .prepare(`SELECT ${SUMMARY_COLUMNS}, body FROM projects WHERE slug = ?1 AND published = 1`)
    .bind(slug)
    .first<SummaryRow & Pick<ProjectRow, "body">>();
  return row ? { ...toProject(row), content: row.body } : null;
}

// --- Admin: drafts included, and the only writes ------------------------------------------
// Callers must have passed the owner check (src/lib/admin/middleware.ts) and validated the
// input (src/lib/admin/validate.ts). Every statement binds its values; none is built from
// input text.

/** A project as the admin lists it: the public fields plus the private bookkeeping. */
export interface AdminProject extends Project {
  published: boolean;
  source: ProjectSource;
  repoFullName: string | null;
  repoPushedAt: string | null;
  stars: number | null;
  aiGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An admin project with its markdown body. */
export interface AdminProjectDetail extends AdminProject {
  content: string;
}

/** Extra columns a non-manual create may set (the GitHub import in ticket 4c). */
export interface ProjectOrigin {
  source?: ProjectSource;
  repoFullName?: string | null;
  repoPushedAt?: string | null;
  stars?: number | null;
  aiGeneratedAt?: string | null;
}

type AdminRow = Omit<ProjectRow, "body">;

const ADMIN_COLUMNS = `${SUMMARY_COLUMNS}, published, source, repo_full_name, repo_pushed_at,
  stars, ai_generated_at, created_at, updated_at`;

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
/** An edit turns a seed row manual; a GitHub import keeps its source. */
const KEEP_GITHUB = `CASE WHEN source = 'github' THEN 'github' ELSE 'manual' END`;

function toAdminProject(row: AdminRow): AdminProject {
  return {
    ...toProject(row),
    published: row.published === 1,
    source: row.source,
    repoFullName: row.repo_full_name,
    repoPushedAt: row.repo_pushed_at,
    stars: row.stars,
    aiGeneratedAt: row.ai_generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Every project, drafts included, in group order then `sort_order`. No bodies. */
export async function listAllProjects(db: D1Database): Promise<AdminProject[]> {
  const { results } = await db.prepare(`SELECT ${ADMIN_COLUMNS} FROM projects`).all<AdminRow>();
  return results.map(toAdminProject).sort(byGroupThenOrder);
}

/** One project, published or not, with its body. */
export async function getAnyProject(
  db: D1Database,
  slug: string,
): Promise<AdminProjectDetail | null> {
  const row = await db
    .prepare(`SELECT ${ADMIN_COLUMNS}, body FROM projects WHERE slug = ?1`)
    .bind(slug)
    .first<AdminRow & Pick<ProjectRow, "body">>();
  return row ? { ...toAdminProject(row), content: row.body } : null;
}

export async function projectExists(db: D1Database, slug: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 AS found FROM projects WHERE slug = ?1`)
    .bind(slug)
    .first();
  return row !== null;
}

/**
 * Inserts a project at the end of its group. `source` defaults to 'manual'. Returns false
 * when the slug (or `repoFullName`) is already taken.
 */
export async function createProject(
  db: D1Database,
  input: ProjectInput,
  origin: ProjectOrigin = {},
): Promise<boolean> {
  try {
    await db
      .prepare(
        `INSERT INTO projects (slug, title, tagline, summary, body, tech, "group", status,
           status_label, sort_order, github_url, live_url, published, source, repo_full_name,
           repo_pushed_at, stars, ai_generated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
           (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM projects WHERE "group" = ?7),
           ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`,
      )
      .bind(
        input.slug,
        input.title,
        input.tagline,
        input.summary,
        input.body,
        JSON.stringify(input.tech),
        input.group,
        input.status,
        input.statusLabel,
        input.github,
        input.live,
        input.published ? 1 : 0,
        origin.source ?? "manual",
        origin.repoFullName ?? null,
        origin.repoPushedAt ?? null,
        origin.stars ?? null,
        origin.aiGeneratedAt ?? null,
      )
      .run();
    return true;
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) return false;
    throw error;
  }
}

/** Records that the owner removed `slug`, so the seed never brings it back. */
function tombstone(db: D1Database, slug: string): D1PreparedStatement {
  return db
    .prepare(`INSERT INTO deleted_seed_slugs (slug) VALUES (?1) ON CONFLICT (slug) DO NOTHING`)
    .bind(slug);
}

/**
 * Overwrites the editable columns of `slug`, marks a seed row `source = 'manual'` so the
 * seed stops overwriting it (an imported row stays 'github', the seed never touches those),
 * and stamps `updated_at`. A project that moves group goes to the end of the new one.
 *
 * `options.newSlug` renames the project. The old slug is tombstoned in the same batch, so
 * the seed does not recreate a renamed seed project under its old name; nothing redirects,
 * the old URL is simply gone. Returns "missing" for an unknown slug and "taken" when the
 * new slug belongs to another project.
 */
export async function updateProject(
  db: D1Database,
  slug: string,
  input: Omit<ProjectInput, "slug">,
  options: { aiAccepted?: boolean; newSlug?: string } = {},
): Promise<"ok" | "missing" | "taken"> {
  const newSlug = options.newSlug ?? slug;
  // `aiAccepted`: the owner took text from "Draft with AI" into this save, so stamp it.
  const update = db
    .prepare(
      `UPDATE projects SET
         slug = ?14,
         title = ?2, tagline = ?3, summary = ?4, body = ?5, tech = ?6,
         sort_order = CASE WHEN "group" = ?7 THEN sort_order ELSE
           (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM projects WHERE "group" = ?7) END,
         "group" = ?7, status = ?8, status_label = ?9, github_url = ?10, live_url = ?11,
         published = ?12, source = ${KEEP_GITHUB}, updated_at = ${NOW},
         ai_generated_at = CASE WHEN ?13 = 1 THEN ${NOW} ELSE ai_generated_at END
       WHERE slug = ?1`,
    )
    .bind(
      slug,
      input.title,
      input.tagline,
      input.summary,
      input.body,
      JSON.stringify(input.tech),
      input.group,
      input.status,
      input.statusLabel,
      input.github,
      input.live,
      input.published ? 1 : 0,
      options.aiAccepted ? 1 : 0,
      newSlug,
    );
  if (newSlug === slug) return (await update.run()).meta.changes > 0 ? "ok" : "missing";
  if (!(await projectExists(db, slug))) return "missing";
  try {
    // One transaction: a clash on the new slug rolls the tombstone back too.
    await db.batch([tombstone(db, slug), update]);
    return "ok";
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) return "taken";
    throw error;
  }
}

/**
 * Moves a project one place up or down within its group by swapping `sort_order` with its
 * neighbour (both rows become manual). If the two share a value the whole group is
 * renumbered instead. Returns false for an unknown slug or a move past either end.
 */
export async function moveProject(
  db: D1Database,
  slug: string,
  direction: "up" | "down",
): Promise<boolean> {
  const { results } = await db
    .prepare(
      `SELECT slug, sort_order FROM projects
       WHERE "group" = (SELECT "group" FROM projects WHERE slug = ?1)
       ORDER BY sort_order, slug`,
    )
    .bind(slug)
    .all<Pick<ProjectRow, "slug" | "sort_order">>();
  const from = results.findIndex((row) => row.slug === slug);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= results.length) return false;

  const update = db.prepare(
    `UPDATE projects SET sort_order = ?2, source = ${KEEP_GITHUB}, updated_at = ${NOW} WHERE slug = ?1`,
  );
  const a = results[from];
  const b = results[to];
  if (a.sort_order !== b.sort_order) {
    await db.batch([update.bind(a.slug, b.sort_order), update.bind(b.slug, a.sort_order)]);
    return true;
  }
  const order = [...results];
  [order[from], order[to]] = [order[to], order[from]];
  await db.batch(order.map((row, index) => update.bind(row.slug, index)));
  return true;
}

/**
 * Deletes a project and tombstones its slug, so re-running the seed does not resurrect a
 * seed project the owner deleted. Returns false for an unknown slug.
 */
export async function deleteProject(db: D1Database, slug: string): Promise<boolean> {
  const [, removed] = await db.batch([
    db
      .prepare(
        `INSERT INTO deleted_seed_slugs (slug) SELECT slug FROM projects WHERE slug = ?1
         ON CONFLICT (slug) DO NOTHING`,
      )
      .bind(slug),
    db.prepare(`DELETE FROM projects WHERE slug = ?1`).bind(slug),
  ]);
  return removed.meta.changes > 0;
}

/** The slug of the project imported from `repoFullName`, or null. */
export async function slugForRepo(db: D1Database, repoFullName: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT slug FROM projects WHERE repo_full_name = ?1 COLLATE NOCASE`)
    .bind(repoFullName)
    .first<Pick<ProjectRow, "slug">>();
  return row?.slug ?? null;
}

/**
 * "Refresh from GitHub": updates the star count and last-push date of an imported project
 * and nothing else. No text column, `published` or `source` is touched.
 */
export async function refreshRepoStats(
  db: D1Database,
  slug: string,
  stats: { stars: number; repoPushedAt: string | null },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE projects SET stars = ?2, repo_pushed_at = ?3
       WHERE slug = ?1 AND repo_full_name IS NOT NULL`,
    )
    .bind(slug, stats.stars, stats.repoPushedAt)
    .run();
  return result.meta.changes > 0;
}

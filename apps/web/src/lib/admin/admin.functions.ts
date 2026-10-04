import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import {
  createProject,
  deleteProject,
  getAnyProject,
  listAllProjects,
  moveProject,
  projectExists,
  refreshRepoStats,
  slugForRepo,
  updateProject,
} from "../db/projects";
import {
  cachedPublicRepos,
  getRepo,
  getRepoDetail,
  GithubError,
  ownRepoName,
  readGithubConfig,
  type GithubVars,
  type RepoSummary,
} from "./github";
import { repoToDraft } from "./github-import";
import { AiDraftError, cooldownLeft, draftProject, resolveRunner, type AiDraft } from "./ai";
import { devBypassApplies, type AdminVars } from "./guard";
import { adminRead, adminWrite } from "./middleware";
import { purgeProjectPages } from "../page-cache-edge";
import { SLUG_PATTERN, validateProjectInput, type FieldErrors } from "./validate";

// Every admin server function. Each one carries `adminRead` or `adminWrite`, which verify
// the Cloudflare Access token (and, for writes, the request origin) before the handler
// runs. Do not export an admin function from here without one of them.

/** The result of a write: done, or refused with a message per field. */
export type WriteResult = { ok: true; slug: string } | { ok: false; errors: FieldErrors };

function slugOf(value: unknown): string {
  return typeof value === "string" && SLUG_PATTERN.test(value) ? value : "";
}

/** All projects, drafts included. */
export const adminListProjects = createServerFn({ method: "GET" })
  .middleware([adminRead])
  .handler(() => listAllProjects(env.DB));

/** One project with its body, or null. */
export const adminGetProject = createServerFn({ method: "GET" })
  .middleware([adminRead])
  .inputValidator((slug: string) => slugOf(slug))
  .handler(({ data: slug }) => (slug ? getAnyProject(env.DB, slug) : null));

/** Creates a manual project. This is the function a draft is created through. */
export const adminCreateProject = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .inputValidator((input: Record<string, unknown>) => input)
  .handler(async ({ data }): Promise<WriteResult> => {
    const checked = validateProjectInput(data);
    if (!checked.ok) return checked;
    const taken = { ok: false as const, errors: { slug: "That slug is already in use." } };
    if (await projectExists(env.DB, checked.value.slug)) return taken;
    if (!(await createProject(env.DB, checked.value))) return taken;
    await purgeProjectPages(getRequest(), checked.value.slug);
    return { ok: true, slug: checked.value.slug };
  });

/**
 * Saves every editable field of an existing project. `originalSlug` names the row; when
 * `slug` differs from it the project is renamed (the old URL becomes a 404, no redirect).
 */
export const adminUpdateProject = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .inputValidator((input: Record<string, unknown>) => input)
  .handler(async ({ data }): Promise<WriteResult> => {
    const checked = validateProjectInput(data);
    if (!checked.ok) return checked;
    const { slug, ...fields } = checked.value;
    // Absent (an older client): the slug in the payload names the row, as before.
    const original = data.originalSlug === undefined ? slug : slugOf(data.originalSlug);
    const missing = { ok: false as const, errors: { slug: "No project has that slug any more." } };
    if (!original) return missing;
    // `aiAccepted` is the editor saying this save contains text taken from an AI draft.
    const aiAccepted = data.aiAccepted === true;
    const outcome = await updateProject(env.DB, original, fields, { aiAccepted, newSlug: slug });
    if (outcome === "missing") return missing;
    if (outcome === "taken") {
      return { ok: false, errors: { slug: "That slug is already in use." } };
    }
    await purgeProjectPages(getRequest(), original, slug);
    return { ok: true, slug };
  });

/** Moves a project one place within its group. */
export const adminMoveProject = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .inputValidator((input: { slug: string; direction: "up" | "down" }) => ({
    slug: slugOf(input?.slug),
    direction: input?.direction === "up" ? ("up" as const) : ("down" as const),
  }))
  .handler(async ({ data }) => {
    const ok = data.slug ? await moveProject(env.DB, data.slug, data.direction) : false;
    if (ok) await purgeProjectPages(getRequest(), data.slug);
    return { ok };
  });

export const adminDeleteProject = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .inputValidator((slug: string) => slugOf(slug))
  .handler(async ({ data: slug }) => {
    const ok = slug ? await deleteProject(env.DB, slug) : false;
    if (ok) await purgeProjectPages(getRequest(), slug);
    return { ok };
  });

// --- GitHub import ------------------------------------------------------------------------
// Public repositories only (see ./github.ts). No function here publishes anything: an
// import is always a draft, and going public is the owner's save on the edit page.

/** A GitHub failure as the UI shows it. */
export interface GithubFailure {
  ok: false;
  error: string;
  /** ISO time the rate limit resets, when that is the problem. */
  resetAt: string | null;
}

export type RepoListResult =
  | {
      ok: true;
      user: string;
      fetchedAt: string;
      repos: RepoSummary[];
      /** Lower-cased `owner/name` of every repo already imported, to the project's slug. */
      imported: Record<string, string>;
    }
  | GithubFailure;

function githubFailure(error: unknown): GithubFailure {
  if (error instanceof GithubError) {
    return { ok: false, error: error.message, resetAt: error.resetAt };
  }
  throw error;
}

function githubConfig() {
  return readGithubConfig(env as unknown as GithubVars);
}

async function repoList(force: boolean): Promise<RepoListResult> {
  try {
    const list = await cachedPublicRepos(githubConfig(), { force });
    const imported: Record<string, string> = {};
    for (const project of await listAllProjects(env.DB)) {
      if (project.repoFullName) imported[project.repoFullName.toLowerCase()] = project.slug;
    }
    return { ok: true, ...list, imported };
  } catch (error) {
    return githubFailure(error);
  }
}

/** The owner's public repositories, from the short-lived cache when it is warm. */
export const adminListGithubRepos = createServerFn({ method: "GET" })
  .middleware([adminRead])
  .handler(() => repoList(false));

/** The manual refresh: refetches the list from GitHub whatever the cache holds. */
export const adminReloadGithubRepos = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .handler(() => repoList(true));

export type ImportResult =
  | { ok: true; slug: string; alreadyImported: boolean }
  | { ok: false; error: string; resetAt?: string | null };

/** Creates an unpublished project from one public repo and returns its slug. */
export const adminImportGithubRepo = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .inputValidator((fullName: string) => (typeof fullName === "string" ? fullName : ""))
  .handler(async ({ data: fullName }): Promise<ImportResult> => {
    try {
      const config = githubConfig();
      if (!ownRepoName(config, fullName)) {
        return { ok: false, error: "That is not one of the public repositories." };
      }
      const existing = await slugForRepo(env.DB, fullName);
      if (existing) return { ok: true, slug: existing, alreadyImported: true };

      const { input, origin } = repoToDraft(await getRepoDetail(config, fullName));
      const checked = validateProjectInput({ ...input, published: false });
      if (!checked.ok) {
        const problems = Object.entries(checked.errors).map(([field, text]) => `${field}: ${text}`);
        return {
          ok: false,
          error: `The repository could not be imported (${problems.join("; ")})`,
        };
      }
      const { slug } = checked.value;
      if (
        (await projectExists(env.DB, slug)) ||
        !(await createProject(env.DB, checked.value, origin))
      ) {
        return {
          ok: false,
          error: `A project with the slug "${slug}" already exists. Rename or delete it first.`,
        };
      }
      // An import is a draft, so nothing public changed; purging keeps the rule simple
      // (every write purges) and costs three cache deletes.
      await purgeProjectPages(getRequest(), slug);
      return { ok: true, slug, alreadyImported: false };
    } catch (error) {
      return githubFailure(error);
    }
  });

export type RefreshResult =
  | { ok: true; stars: number; pushedAt: string | null }
  | { ok: false; error: string; resetAt?: string | null };

/** Updates stars and last-push date of an imported project. No text is touched. */
export const adminRefreshFromGithub = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .inputValidator((slug: string) => slugOf(slug))
  .handler(async ({ data: slug }): Promise<RefreshResult> => {
    const project = slug ? await getAnyProject(env.DB, slug) : null;
    if (!project?.repoFullName) {
      return { ok: false, error: "This project was not imported from GitHub." };
    }
    try {
      const repo = await getRepo(githubConfig(), project.repoFullName);
      await refreshRepoStats(env.DB, slug, { stars: repo.stars, repoPushedAt: repo.pushedAt });
      await purgeProjectPages(getRequest(), slug);
      return { ok: true, stars: repo.stars, pushedAt: repo.pushedAt };
    } catch (error) {
      return githubFailure(error);
    }
  });

// --- Draft with AI ------------------------------------------------------------------------

export type DraftResult =
  | { ok: true; draft: AiDraft }
  | { ok: false; error: string; resetAt?: string | null };

/**
 * Asks the model for a description of an imported project, from its public repository.
 * Returns the draft and writes nothing: the owner takes fields into the form and saves.
 */
export const adminDraftWithAi = createServerFn({ method: "POST" })
  .middleware([adminWrite])
  .inputValidator((slug: string) => slugOf(slug))
  .handler(async ({ data: slug }): Promise<DraftResult> => {
    const project = slug ? await getAnyProject(env.DB, slug) : null;
    if (!project?.repoFullName) {
      return { ok: false, error: "This project was not imported from GitHub." };
    }
    const vars = env as unknown as AdminVars &
      Parameters<typeof resolveRunner>[0] & { AI_STUB_TIMEOUT_MS?: string };
    const bypass = devBypassApplies(getRequest(), vars);
    const run = resolveRunner(vars, bypass);
    // The e2e suite shortens the timeout for its stub; only honoured with the stub itself.
    const stubTimeout = bypass && vars.AI_STUB_URL ? Number(vars.AI_STUB_TIMEOUT_MS) : 0;
    if (!run) return { ok: false, error: new AiDraftError("unavailable").message };
    const wait = cooldownLeft(slug);
    if (wait) {
      return { ok: false, error: `A draft was just requested. Try again in ${wait} seconds.` };
    }
    try {
      const detail = await getRepoDetail(githubConfig(), project.repoFullName);
      return {
        ok: true,
        draft: await draftProject(run, detail, stubTimeout > 0 ? { timeoutMs: stubTimeout } : {}),
      };
    } catch (error) {
      if (error instanceof AiDraftError) return { ok: false, error: error.message };
      return githubFailure(error);
    }
  });

/**
 * Every function above. The request guard in src/start.ts refuses unauthenticated calls to
 * these before their payload is parsed; add new admin functions here as well as giving
 * them `adminRead` / `adminWrite`.
 */
export const adminFunctions = [
  adminListProjects,
  adminGetProject,
  adminCreateProject,
  adminUpdateProject,
  adminMoveProject,
  adminDeleteProject,
  adminListGithubRepos,
  adminReloadGithubRepos,
  adminImportGithubRepo,
  adminRefreshFromGithub,
  adminDraftWithAi,
];

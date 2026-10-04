// Server only: a small read-only client for the public GitHub REST API, used by the admin's
// "Import from GitHub".
//
// PRIVATE REPOSITORIES CAN NEVER BE LISTED OR IMPORTED, and that must stay true:
// - The list comes from `GET /users/{user}/repos`, which only ever returns public
//   repositories, with or without a token. Do not switch to `GET /user/repos` (the
//   authenticated endpoint, which includes private ones).
// - `GITHUB_TOKEN` is optional and only raises the rate limit. Because a token could read a
//   private repo through `GET /repos/{owner}/{repo}`, every repository payload is checked
//   here (`private` must be false, the owner must be the configured user) and anything else
//   is reported as "not found".

const DEFAULT_API_BASE = "https://api.github.com";
const DEFAULT_USER = "ryanyogan";
const PER_PAGE = 100;
/** 30 pages of 100 is far beyond the ~800 repos expected; it only stops a runaway loop. */
const MAX_PAGES = 30;
export const README_MAX_CHARS = 20_000;
const USER_AGENT = "ryanyogan.com-admin";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The vars the client reads. `GITHUB_TOKEN` is a secret; the others are plain vars. */
export interface GithubVars {
  GITHUB_USER?: unknown;
  GITHUB_TOKEN?: unknown;
  GITHUB_API_BASE?: unknown;
}

export interface GithubConfig {
  apiBase: string;
  user: string;
  token: string | null;
}

export type GithubErrorKind = "rate-limit" | "not-found" | "network" | "http" | "config";

/** Every failure of this client. `message` is written to be shown to the owner as is. */
export class GithubError extends Error {
  readonly kind: GithubErrorKind;
  /** ISO time the rate limit resets, when GitHub said. */
  readonly resetAt: string | null;
  constructor(kind: GithubErrorKind, message: string, resetAt: string | null = null) {
    super(message);
    this.name = "GithubError";
    this.kind = kind;
    this.resetAt = resetAt;
  }
}

/** A public repository as the import list shows it. */
export interface RepoSummary {
  /** `owner/name`. */
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string | null;
  homepage: string | null;
  htmlUrl: string;
  fork: boolean;
  archived: boolean;
  topics: string[];
  defaultBranch: string | null;
}

/** Everything known about one repository: the context a draft is written from. */
export interface RepoDetail extends RepoSummary {
  /** Language name to bytes of code, largest first. */
  languages: Record<string, number>;
  /** README text, cut to `README_MAX_CHARS`; null when the repo has none. */
  readme: string | null;
  readmeTruncated: boolean;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads the client's settings. The API base must be https, or http on a loopback host (the
 * local stub the tests use); anything else is refused so a token cannot be sent elsewhere
 * in clear text.
 */
export function readGithubConfig(vars: GithubVars): GithubConfig {
  const user = str(vars.GITHUB_USER) || DEFAULT_USER;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(user)) {
    throw new GithubError("config", "GITHUB_USER is not a valid GitHub user name.");
  }
  const rawBase = str(vars.GITHUB_API_BASE) || DEFAULT_API_BASE;
  let base: URL;
  try {
    base = new URL(rawBase);
  } catch {
    throw new GithubError("config", "GITHUB_API_BASE is not a valid URL.");
  }
  const local = base.protocol === "http:" && LOCAL_HOSTNAMES.has(base.hostname);
  if (base.protocol !== "https:" && !local) {
    throw new GithubError("config", "GITHUB_API_BASE must be an https:// URL.");
  }
  return {
    apiBase: `${base.origin}${base.pathname.replace(/\/+$/, "")}`,
    user,
    token: str(vars.GITHUB_TOKEN) || null,
  };
}

function resetTime(response: Response): string | null {
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) return new Date(reset * 1000).toISOString();
  const retry = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retry) && retry > 0) return new Date(Date.now() + retry * 1000).toISOString();
  return null;
}

function rateLimitError(response: Response, authenticated: boolean): GithubError {
  const resetAt = resetTime(response);
  const when = resetAt
    ? `It resets at ${resetAt.slice(11, 16)} UTC (${resetAt.slice(0, 10)}).`
    : "Try again in a few minutes.";
  const hint = authenticated ? "" : " Setting the GITHUB_TOKEN secret raises the limit.";
  return new GithubError("rate-limit", `GitHub rate limit reached. ${when}${hint}`, resetAt);
}

async function request(
  config: GithubConfig,
  path: string,
  fetchImpl: FetchLike,
  accept = "application/vnd.github+json",
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  let response: Response;
  try {
    response = await fetchImpl(`${config.apiBase}${path}`, { headers });
  } catch {
    throw new GithubError("network", "Could not reach GitHub. Check the connection and try again.");
  }
  if (response.ok) return response;
  const limited =
    response.status === 429 ||
    (response.status === 403 &&
      (response.headers.get("x-ratelimit-remaining") === "0" ||
        response.headers.has("retry-after")));
  if (limited) throw rateLimitError(response, config.token !== null);
  if (response.status === 404) {
    throw new GithubError("not-found", `GitHub has no public resource at ${path}.`);
  }
  if (response.status === 401) {
    throw new GithubError("http", "GitHub rejected GITHUB_TOKEN (401). Remove or replace it.");
  }
  throw new GithubError("http", `GitHub answered ${response.status} for ${path}.`);
}

async function json(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new GithubError("http", "GitHub sent a response that is not JSON.");
  }
}

/** Maps one API repository object, or returns null for anything private or not the user's. */
function toSummary(raw: unknown, user: string): RepoSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const repo = raw as Record<string, unknown>;
  const owner = (repo.owner ?? {}) as Record<string, unknown>;
  const name = str(repo.name);
  // The private-repo guard described at the top of this file.
  if (repo.private !== false) return null;
  if (typeof repo.visibility === "string" && repo.visibility !== "public") return null;
  if (str(owner.login).toLowerCase() !== user.toLowerCase() || !name) return null;
  const fullName = `${str(owner.login)}/${name}`;
  return {
    fullName,
    name,
    description: str(repo.description) || null,
    language: str(repo.language) || null,
    stars: typeof repo.stargazers_count === "number" ? repo.stargazers_count : 0,
    pushedAt: str(repo.pushed_at) || null,
    homepage: str(repo.homepage) || null,
    htmlUrl: `https://github.com/${fullName}`,
    fork: repo.fork === true,
    archived: repo.archived === true,
    topics: Array.isArray(repo.topics)
      ? repo.topics.filter((t): t is string => typeof t === "string")
      : [],
    defaultBranch: str(repo.default_branch) || null,
  };
}

/** Every public repository the configured user owns, following the pagination to the end. */
export async function listPublicRepos(
  config: GithubConfig,
  fetchImpl: FetchLike = fetch,
): Promise<RepoSummary[]> {
  const repos: RepoSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await request(
      config,
      `/users/${config.user}/repos?type=owner&sort=pushed&per_page=${PER_PAGE}&page=${page}`,
      fetchImpl,
    );
    const items = await json(response);
    if (!Array.isArray(items)) throw new GithubError("http", "GitHub sent an unexpected list.");
    for (const item of items) {
      const summary = toSummary(item, config.user);
      if (summary) repos.push(summary);
    }
    // The page URLs are built here, never taken from the Link header; it only says whether
    // there is another page.
    const link = response.headers.get("link") ?? "";
    if (items.length === 0 || !/rel="next"/.test(link)) break;
  }
  return repos;
}

const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

/** The repository name of `fullName` when it belongs to the configured user, else null. */
export function ownRepoName(config: GithubConfig, fullName: unknown): string | null {
  if (typeof fullName !== "string") return null;
  const [owner, name, extra] = fullName.split("/");
  if (extra !== undefined || !owner || !name) return null;
  if (owner.toLowerCase() !== config.user.toLowerCase()) return null;
  return REPO_NAME.test(name) && name !== "." && name !== ".." ? name : null;
}

function notOurs(fullName: unknown): GithubError {
  return new GithubError("not-found", `${String(fullName)} is not one of the public repositories.`);
}

/** One public repository's summary (a single request): what "Refresh from GitHub" needs. */
export async function getRepo(
  config: GithubConfig,
  fullName: string,
  fetchImpl: FetchLike = fetch,
): Promise<RepoSummary> {
  const name = ownRepoName(config, fullName);
  if (!name) throw notOurs(fullName);
  const response = await request(config, `/repos/${config.user}/${name}`, fetchImpl);
  const summary = toSummary(await json(response), config.user);
  if (!summary) throw notOurs(fullName);
  return summary;
}

/** Cuts a README to `max` characters. */
export function truncateReadme(
  text: string,
  max = README_MAX_CHARS,
): { readme: string; readmeTruncated: boolean } {
  if (text.length <= max) return { readme: text, readmeTruncated: false };
  return { readme: text.slice(0, max), readmeTruncated: true };
}

/**
 * One public repository with its language breakdown and README (three requests). This is
 * the repo context for a draft: the import uses it now, the AI-draft ticket should too.
 */
export async function getRepoDetail(
  config: GithubConfig,
  fullName: string,
  fetchImpl: FetchLike = fetch,
): Promise<RepoDetail> {
  const summary = await getRepo(config, fullName, fetchImpl);
  const path = `/repos/${config.user}/${summary.name}`;

  const rawLanguages = await json(await request(config, `${path}/languages`, fetchImpl));
  const languages: Record<string, number> = {};
  if (rawLanguages && typeof rawLanguages === "object") {
    const entries = Object.entries(rawLanguages as Record<string, unknown>)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number")
      .sort((a, b) => b[1] - a[1]);
    for (const [language, bytes] of entries) languages[language] = bytes;
  }

  let readme: string | null = null;
  let readmeTruncated = false;
  try {
    const response = await request(
      config,
      `${path}/readme`,
      fetchImpl,
      "application/vnd.github.raw+json",
    );
    ({ readme, readmeTruncated } = truncateReadme(await response.text()));
  } catch (error) {
    // A repo without a README is normal; anything else is a real failure.
    if (!(error instanceof GithubError) || error.kind !== "not-found") throw error;
  }

  return { ...summary, languages, readme, readmeTruncated };
}

// --- The repo list cache ----------------------------------------------------------------
// Listing ~800 repos is 9 requests and the unauthenticated limit is 60 an hour, so the list
// is kept in memory (per isolate) and only refetched after CACHE_MS or on a manual refresh.

export const CACHE_MS = 15 * 60 * 1000;

export interface RepoList {
  repos: RepoSummary[];
  /** ISO time the list was fetched from GitHub. */
  fetchedAt: string;
  user: string;
}

let cached: { key: string; at: number; list: RepoList } | null = null;

export function clearRepoListCache(): void {
  cached = null;
}

/** The public repo list, from the cache unless it is stale or `force` is set. */
export async function cachedPublicRepos(
  config: GithubConfig,
  options: { force?: boolean; fetchImpl?: FetchLike; now?: number } = {},
): Promise<RepoList> {
  const now = options.now ?? Date.now();
  const key = `${config.apiBase}|${config.user}`;
  if (!options.force && cached && cached.key === key && now - cached.at < CACHE_MS) {
    return cached.list;
  }
  const repos = await listPublicRepos(config, options.fetchImpl);
  const list = { repos, fetchedAt: new Date(now).toISOString(), user: config.user };
  cached = { key, at: now, list };
  return list;
}

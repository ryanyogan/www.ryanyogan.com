import type { ProjectOrigin } from "../db/projects";
import type { RepoDetail } from "./github";

// Turns a public GitHub repository into the DRAFT project the import creates. Nothing here
// writes prose: the body is a neutral stub the owner (or the AI-draft ticket) replaces.

const MAX_SLUG = 64;
const MAX_TITLE = 120;
const MAX_LINE = 300;
const MAX_TECH = 8;
const MAX_TECH_ITEM = 40;
/** A language below this share of the code is left out of `tech`. */
const MIN_LANGUAGE_SHARE = 0.05;

/** `My_Repo.js` becomes `my-repo-js`. Never empty, never the reserved `new`. */
export function slugFromRepoName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/, "");
  if (!slug) return "repo";
  return slug === "new" ? "new-repo" : slug;
}

/** `fizzy-do_mcp` becomes `Fizzy Do Mcp`. */
export function titleFromRepoName(name: string): string {
  const words = name.split(/[-_.\s]+/).filter(Boolean);
  const title = words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  return (title || name || "Untitled").slice(0, MAX_TITLE);
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`;
}

/** The homepage, only when it is a plain https URL. */
export function httpsHomepage(homepage: string | null): string | null {
  if (!homepage) return null;
  try {
    const url = new URL(homepage);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Primary language, then the other sizeable languages, then topics; no duplicates. */
export function techFromRepo(
  repo: Pick<RepoDetail, "language" | "languages" | "topics">,
): string[] {
  const total = Object.values(repo.languages).reduce((sum, bytes) => sum + bytes, 0);
  const sizeable = Object.entries(repo.languages)
    .filter(([, bytes]) => total > 0 && bytes / total >= MIN_LANGUAGE_SHARE)
    .map(([language]) => language);
  const seen = new Set<string>();
  const tech: string[] = [];
  for (const raw of [repo.language ?? "", ...sizeable, ...repo.topics]) {
    const item = raw.trim();
    if (!item || item.length > MAX_TECH_ITEM || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    tech.push(item);
    if (tech.length === MAX_TECH) break;
  }
  return tech;
}

export function stubBody(fullName: string): string {
  return `_Imported from GitHub (${fullName}). This write-up has not been written yet._\n`;
}

/**
 * The raw project payload for a repo, to be passed through `validateProjectInput`, and the
 * private bookkeeping columns. Always unpublished; group and status are placeholders the
 * owner chooses on the edit page before publishing.
 */
export function repoToDraft(repo: RepoDetail): {
  input: Record<string, unknown>;
  origin: ProjectOrigin;
} {
  const description = clip(repo.description ?? "", MAX_LINE);
  return {
    input: {
      slug: slugFromRepoName(repo.name),
      title: titleFromRepoName(repo.name),
      tagline: description,
      summary: description,
      body: stubBody(repo.fullName),
      tech: techFromRepo(repo),
      group: "shipped",
      status: repo.archived ? "retired" : "prototype",
      statusLabel: null,
      github: repo.htmlUrl,
      live: httpsHomepage(repo.homepage),
      published: false,
    },
    origin: {
      source: "github",
      repoFullName: repo.fullName,
      repoPushedAt: repo.pushedAt,
      stars: repo.stars,
    },
  };
}

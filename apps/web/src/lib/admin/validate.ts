import { PROJECT_GROUPS, PROJECT_STATUSES } from "@repo/shared";
import type { ProjectGroup, ProjectStatus } from "@repo/shared";

// Validation for admin writes. Runs on the server for every write (the server functions
// call it on the raw payload); the form only displays what it returns.

/** A project as the admin form submits it and the data layer stores it. */
export interface ProjectInput {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  body: string;
  tech: string[];
  group: ProjectGroup;
  status: ProjectStatus;
  statusLabel: string | null;
  github: string | null;
  live: string | null;
  published: boolean;
}

export type ProjectField = keyof ProjectInput;
export type FieldErrors = Partial<Record<ProjectField, string>>;

export type ValidationResult =
  | { ok: true; value: ProjectInput }
  | { ok: false; errors: FieldErrors };

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** `/admin/projects/new` is the create form, so a project cannot take that slug. */
const RESERVED_SLUGS = new Set(["new"]);

const MAX = {
  slug: 64,
  title: 120,
  tagline: 300,
  summary: 300,
  body: 100_000,
  statusLabel: 40,
  url: 2000,
  techItems: 20,
  techItem: 40,
};

function text(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function httpsUrl(value: unknown, errors: FieldErrors, field: "github" | "live"): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = text(value);
  if (raw === null) {
    errors[field] = "Must be text.";
    return null;
  }
  if (raw === "") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    errors[field] = "Not a valid URL.";
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    errors[field] = "Must be an https:// URL.";
    return null;
  }
  if (raw.length > MAX.url) {
    errors[field] = `At most ${MAX.url} characters.`;
    return null;
  }
  return url.href;
}

/** Checks an untrusted payload. Every problem is reported against the field it belongs to. */
export function validateProjectInput(raw: unknown): ValidationResult {
  const errors: FieldErrors = {};
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const slug = text(data.slug) ?? "";
  if (!slug) errors.slug = "Slug is required.";
  else if (slug.length > MAX.slug) errors.slug = `At most ${MAX.slug} characters.`;
  else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "Lower-case letters, digits and single hyphens only (e.g. my-project).";
  } else if (RESERVED_SLUGS.has(slug)) errors.slug = `"${slug}" is reserved.`;

  const title = text(data.title) ?? "";
  if (!title) errors.title = "Title is required.";
  else if (title.length > MAX.title) errors.title = `At most ${MAX.title} characters.`;

  const published = data.published === true;
  if (typeof data.published !== "boolean") errors.published = "Must be true or false.";

  const tagline = text(data.tagline) ?? "";
  if (tagline.length > MAX.tagline) errors.tagline = `At most ${MAX.tagline} characters.`;
  else if (published && !tagline) errors.tagline = "A published project needs a tagline.";

  const summary = text(data.summary) ?? "";
  if (summary.length > MAX.summary) errors.summary = `At most ${MAX.summary} characters.`;
  else if (published && !summary) errors.summary = "A published project needs a summary.";

  const body = typeof data.body === "string" ? data.body : "";
  if (data.body !== undefined && typeof data.body !== "string") errors.body = "Must be text.";
  else if (body.length > MAX.body) errors.body = `At most ${MAX.body} characters.`;

  let tech: string[] = [];
  if (!Array.isArray(data.tech) || data.tech.some((t) => typeof t !== "string")) {
    errors.tech = "Must be a list of names.";
  } else {
    tech = (data.tech as string[]).map((t) => t.trim()).filter(Boolean);
    if (tech.length > MAX.techItems) errors.tech = `At most ${MAX.techItems} items.`;
    else if (tech.some((t) => t.length > MAX.techItem)) {
      errors.tech = `Each item at most ${MAX.techItem} characters.`;
    }
  }

  const group = data.group as ProjectGroup;
  if (!PROJECT_GROUPS.includes(group)) errors.group = "Choose a group.";

  const status = data.status as ProjectStatus;
  if (!PROJECT_STATUSES.includes(status)) errors.status = "Choose a status.";

  let statusLabel: string | null = null;
  if (data.statusLabel !== null && data.statusLabel !== undefined) {
    const label = text(data.statusLabel);
    if (label === null) errors.statusLabel = "Must be text.";
    else if (label.length > MAX.statusLabel) {
      errors.statusLabel = `At most ${MAX.statusLabel} characters.`;
    } else statusLabel = label || null;
  }

  const github = httpsUrl(data.github, errors, "github");
  const live = httpsUrl(data.live, errors, "live");

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      slug,
      title,
      tagline,
      summary,
      body,
      tech,
      group,
      status,
      statusLabel,
      github,
      live,
      published,
    },
  };
}

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

export const PROJECT_GROUPS = [
  "agents-memory",
  "tools-for-agents",
  "shipped",
  "desktop-tools",
  "for-people-i-know",
] as const;

export type ProjectGroup = (typeof PROJECT_GROUPS)[number];

export const PROJECT_STATUSES = ["running", "live", "prototype", "retired", "private"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_SOURCES = ["seed", "github", "manual"] as const;

/** Where a project row came from: the markdown seed, a GitHub import, or typed in by hand. */
export type ProjectSource = (typeof PROJECT_SOURCES)[number];

/** A published project as the public pages list it (no body). */
export interface Project {
  slug: string;
  title: string;
  /** One line for index rows. */
  summary: string;
  /** Longer description for the project page and meta description. */
  tagline: string;
  tech: string[];
  group: ProjectGroup;
  status: ProjectStatus;
  /** Optional pill text when the plain status word undersells it, e.g. "On npm". */
  statusLabel?: string;
  order: number;
  github?: string;
  live?: string;
}

/** A project with its markdown body, for the project page. */
export interface ProjectDetail extends Project {
  content: string;
}

export interface ProjectGroupInfo {
  id: ProjectGroup;
  title: string;
  blurb: string;
}

export interface WorkRole {
  company: string;
  title: string;
  type: string;
  dates: string;
  location: string;
  description: string;
  /** One short line for the compact timeline on /work. */
  summary: string;
  /** Kept for reference; the Work page does not render these. */
  highlights: string[];
  tags: string[];
}

export interface WorkSection {
  label: string;
  roles: WorkRole[];
}

import { contactEmail, footerLinks, navLinks, projectGroups } from "@repo/shared";
import type { Project } from "@repo/shared";
import { writingPosts } from "./content";

// Loaded on demand by the command palette. Pages, posts and actions come from the
// same modules the pages render from; projects are the published rows in D1,
// fetched through the same server function the project pages use.

export type SearchType = "page" | "project" | "post" | "action";
export type SearchAction = "theme" | "email" | "github";

export interface SearchItem {
  id: string;
  type: SearchType;
  title: string;
  detail: string;
  /** Internal path, or the external URL / value an action works on. */
  href: string;
  action?: SearchAction;
  /** Lowercased text searched after the title. */
  text: string;
}

export const searchTypes: { type: SearchType; label: string }[] = [
  { type: "page", label: "Pages" },
  { type: "project", label: "Projects" },
  { type: "post", label: "Writing" },
  { type: "action", label: "Actions" },
];

const github = footerLinks.find((link) => link.label === "GitHub");

function item(entry: Omit<SearchItem, "text"> & { extra?: string }): SearchItem {
  const { extra = "", ...rest } = entry;
  return { ...rest, text: `${rest.detail} ${extra}`.toLowerCase() };
}

/** The palette index. `projects` is the published list, already in display order. */
export function buildSearchItems(projects: Project[]): SearchItem[] {
  return [
    ...[{ label: "Home", href: "/" }, ...navLinks].map((link) =>
      item({
        id: `page-${link.href}`,
        type: "page",
        title: link.label,
        detail: link.href,
        href: link.href,
      }),
    ),
    ...projects.map((project) =>
      item({
        id: `project-${project.slug}`,
        type: "project",
        title: project.title,
        detail: project.summary,
        href: `/projects/${project.slug}`,
        extra: `${projectGroups.find((info) => info.id === project.group)?.title ?? ""} ${project.tech.join(" ")}`,
      }),
    ),
    ...writingPosts.map((post) =>
      item({
        id: `post-${post.slug}`,
        type: "post",
        title: post.title,
        detail: post.date,
        href: `/writing/${post.slug}`,
      }),
    ),
    item({
      id: "action-theme",
      type: "action",
      title: "Toggle theme",
      detail: "Switch between light and dark",
      href: "",
      action: "theme",
      extra: "colour color mode",
    }),
    item({
      id: "action-email",
      type: "action",
      title: "Copy contact email",
      detail: contactEmail,
      href: contactEmail,
      action: "email",
      extra: "mail address",
    }),
    ...(github
      ? [
          item({
            id: "action-github",
            type: "action",
            title: "Open GitHub",
            detail: github.href.replace(/^https?:\/\//, ""),
            href: github.href,
            action: "github",
            extra: "source code repos",
          }),
        ]
      : []),
  ];
}

/** True when every character of `needle` appears in `hay` in order. */
function subsequence(needle: string, hay: string): boolean {
  let at = 0;
  for (const ch of hay) if (ch === needle[at]) at += 1;
  return at >= needle.length;
}

/** Lower is better; -1 is no match. Every word of the query has to match somewhere. */
function score(entry: SearchItem, words: string[]): number {
  const title = entry.title.toLowerCase();
  let total = 0;
  for (const word of words) {
    const at = title.indexOf(word);
    if (at === 0) total += 0;
    else if (at > 0 && /[^a-z0-9]/.test(title[at - 1] ?? "")) total += 1;
    else if (at > 0) total += 2;
    else if (entry.text.includes(word)) total += 4;
    else if (word.length > 2 && subsequence(word, title)) total += 6;
    else return -1;
  }
  return total;
}

/**
 * Results in display order: by type, then best match first. With an empty
 * query only pages and actions are offered.
 */
export function search(searchItems: SearchItem[], query: string): SearchItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return searchItems.filter((entry) => entry.type === "page" || entry.type === "action");
  }
  const typeRank = (type: SearchType) => searchTypes.findIndex((t) => t.type === type);
  return searchItems
    .map((entry, index) => ({ entry, index, rank: score(entry, words) }))
    .filter((hit) => hit.rank >= 0)
    .sort(
      (a, b) =>
        typeRank(a.entry.type) - typeRank(b.entry.type) || a.rank - b.rank || a.index - b.index,
    )
    .map((hit) => hit.entry);
}

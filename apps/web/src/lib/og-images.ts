import { projectStatusLabels } from "@repo/shared";
import type { Project } from "@repo/shared";
import images from "virtual:og-images";
import { type OgCard, ogAlt, projectKicker } from "./og/template";
import type { SeoImage } from "./seo";

/** The preview image of a page drawn at build time: /, /work, /now, /projects, /writing, a post. */
export function staticOgImage(route: string): SeoImage {
  const image = images[route] ?? images["/"];
  return { path: image.path, alt: image.alt };
}

/** What a project's card says. The Worker draws exactly this (routes/og.projects.$file.ts). */
export function projectCard(project: Pick<Project, "title" | "status" | "statusLabel">): OgCard {
  return {
    title: project.title,
    kicker: projectKicker(project.statusLabel ?? projectStatusLabels[project.status]),
  };
}

// FNV-1a, as base 36: short, and the same in the Worker and the browser.
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * A project's image is drawn on request at a stable URL. `v` is a fingerprint of the words
 * on the card and nothing else reads it: when an edit changes the card, the page names a new
 * URL, so a platform that keeps images by URL fetches the new one.
 */
export function projectOgImage(
  project: Pick<Project, "slug" | "title" | "status" | "statusLabel">,
): SeoImage {
  const card = projectCard(project);
  const v = fingerprint(`${card.title}\n${card.kicker ?? ""}`);
  return { path: `/og/projects/${project.slug}.png?v=${v}`, alt: ogAlt(card) };
}

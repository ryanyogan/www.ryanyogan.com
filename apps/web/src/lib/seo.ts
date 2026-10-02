export const SITE_URL = "https://ryanyogan.com";
export const SITE_NAME = "Ryan Yogan";
export const SITE_TITLE = "Ryan Yogan. Leads engineering teams, builds agent systems.";
export const SITE_DESCRIPTION =
  "Ryan Yogan leads engineering teams and builds agent systems himself. Twenty years of scaling orgs; the last two spent deep in agent memory, MCP, and durable AI workflows.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

export function pageTitle(title: string): string {
  return `${title} · ${SITE_NAME}`;
}

/** The canonical link for a route. Every route sets its own; the root sets none. */
export function canonical(path: string) {
  return [{ rel: "canonical", href: absoluteUrl(path) }];
}

/** Title, description, Open Graph and canonical for a static page. */
export function seo({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: absoluteUrl(path) },
    ],
    links: canonical(path),
  };
}

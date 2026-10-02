import { footerLinks } from "@repo/shared";

export const SITE_URL = "https://ryanyogan.com";
export const SITE_NAME = "Ryan Yogan";
export const SITE_TITLE = "Ryan Yogan. Leads engineering teams, builds agent systems.";
export const SITE_DESCRIPTION =
  "Ryan Yogan leads engineering teams and builds agent systems himself. Twenty years of scaling orgs; the last two spent deep in agent memory, MCP, and durable AI workflows.";
export const SITE_LOCALE = "en_US";

/**
 * The one URL form of the site: no trailing slash, except the root. Canonicals, Open Graph,
 * the sitemap, the feed and JSON-LD all go through here; a request for the slash form is
 * redirected to it (src/lib/trailing-slash.ts and the asset server).
 */
export function absoluteUrl(path: string): string {
  const bare = path.replace(/\/+$/, "");
  return bare ? `${SITE_URL}${bare}` : `${SITE_URL}/`;
}

export function pageTitle(title: string): string {
  return `${title} · ${SITE_NAME}`;
}

/** The canonical link for a route. Every route sets its own; the root sets none. */
export function canonical(path: string) {
  return [{ rel: "canonical", href: absoluteUrl(path) }];
}

/** Midnight UTC of a YYYY-MM-DD day as a full ISO 8601 timestamp (the feed uses the same instant). */
export function isoDateTime(isoDay: string): string {
  return `${isoDay}T00:00:00Z`;
}

// --- JSON-LD ------------------------------------------------------------------------------

export type JsonLdNode = Record<string, unknown>;

export const WEBSITE_ID = `${SITE_URL}/#website`;
export const PERSON_ID = `${SITE_URL}/#ryan`;

const PROFILE_LABELS = new Set(["GitHub", "LinkedIn"]);

/** The site's owner. Only what the site itself states: no employer, no address. */
export function personNode(): JsonLdNode {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    jobTitle: "Engineering leader and agent systems builder",
    description: SITE_DESCRIPTION,
    knowsAbout: [
      "Engineering leadership",
      "Agent systems",
      "Agent memory and persistence",
      "Model Context Protocol (MCP)",
      "Durable background execution",
      "Cost-aware model routing",
    ],
    sameAs: footerLinks.filter((link) => PROFILE_LABELS.has(link.label)).map((link) => link.href),
  };
}

/** A reference to the person from another node. */
export function personRef(): JsonLdNode {
  return { "@type": "Person", "@id": PERSON_ID, name: SITE_NAME, url: absoluteUrl("/") };
}

export function websiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

/** Home, then each step down to the page itself. */
export function breadcrumbNode(trail: readonly { name: string; path: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

/** An index page and the pages it lists, in the order shown. */
export function collectionNode(page: {
  name: string;
  description: string;
  path: string;
  items: readonly { name: string; path: string }[];
}): JsonLdNode {
  return {
    "@type": "CollectionPage",
    "@id": absoluteUrl(page.path),
    url: absoluteUrl(page.path),
    name: page.name,
    description: page.description,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: page.items.length,
      itemListElement: page.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  };
}

// `tech` mixes languages with frameworks and services; only these are programming languages.
const LANGUAGES = new Set(
  [
    "TypeScript",
    "JavaScript",
    "Rust",
    "Go",
    "Python",
    "Elixir",
    "Erlang",
    "Ruby",
    "Zig",
    "Swift",
    "Kotlin",
    "Java",
    "C",
    "C++",
    "C#",
    "Lua",
    "Bash",
    "Shell",
    "SQL",
  ].map((name) => name.toLowerCase()),
);

/**
 * A project: source code when it has a public repository, otherwise a plain creative work.
 * Every value is the project's own; nothing is inferred beyond sorting `tech` into
 * languages and keywords.
 */
export function projectNode(project: {
  slug: string;
  title: string;
  tagline: string;
  tech: readonly string[];
  github?: string;
  /** Path of the project's preview image. */
  image?: string;
}): JsonLdNode {
  const url = absoluteUrl(`/projects/${project.slug}`);
  const languages = project.tech.filter((name) => LANGUAGES.has(name.toLowerCase()));
  const keywords = project.tech.filter((name) => !LANGUAGES.has(name.toLowerCase()));
  return {
    "@type": project.github ? "SoftwareSourceCode" : "CreativeWork",
    "@id": url,
    url,
    name: project.title,
    description: project.tagline,
    author: personRef(),
    ...(project.image ? { image: absoluteUrl(project.image) } : {}),
    ...(project.github ? { codeRepository: project.github } : {}),
    ...(project.github && languages.length ? { programmingLanguage: languages } : {}),
    ...(keywords.length ? { keywords: keywords.join(", ") } : {}),
  };
}

const JSON_ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * JSON for a <script> element. Project text is typed into the admin, and the script body is
 * written to the page as is, so `</script>` or `<!--` in a title would end the block. The
 * characters are replaced with their JSON escapes: the output is still the same JSON value.
 */
export function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => JSON_ESCAPES[char]);
}

/** One JSON-LD block (a single @graph) for a route's `head().scripts`. */
export function jsonLd(...nodes: JsonLdNode[]) {
  return {
    type: "application/ld+json",
    children: safeJson({ "@context": "https://schema.org", "@graph": nodes }),
  };
}

// --- The head of a public page ---------------------------------------------------------------

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

/** A page's social preview image: a 1200x630 PNG on this site, and what it shows. */
export interface SeoImage {
  /** Site path, query included (src/lib/og-images.ts). */
  path: string;
  alt: string;
}

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** A site path with its query kept (absoluteUrl is for page URLs, which have none). */
export function imageUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** The Open Graph and Twitter tags for a preview image. */
export function imageMeta(image: SeoImage): MetaTag[] {
  const url = imageUrl(image.path);
  return [
    { property: "og:image", content: url },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: String(OG_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_IMAGE_HEIGHT) },
    { property: "og:image:alt", content: image.alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: image.alt },
  ];
}

/**
 * Title, description, canonical, Open Graph (image included), the Twitter card and JSON-LD
 * for a public page. Every public route goes through here; og:site_name and og:locale come
 * from the root route and are the same on every page.
 */
export function seo({
  title,
  description,
  path,
  image,
  ogTitle = title,
  type = "website",
  meta = [],
  graph = [],
}: {
  title: string;
  description: string;
  path: string;
  image: SeoImage;
  /** Posts drop the site-name suffix here. */
  ogTitle?: string;
  type?: "website" | "article" | "profile";
  /** Extra tags for this type, e.g. article:published_time. */
  meta?: MetaTag[];
  graph?: JsonLdNode[];
}) {
  const tags: MetaTag[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: absoluteUrl(path) },
    { property: "og:type", content: type },
    ...imageMeta(image),
    ...meta,
  ];
  return {
    meta: tags,
    links: canonical(path),
    scripts: graph.length ? [jsonLd(...graph)] : [],
  };
}

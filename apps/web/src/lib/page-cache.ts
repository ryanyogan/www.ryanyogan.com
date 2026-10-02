// Edge cache for what is rendered from D1 (/, /projects, /projects/<slug>, /sitemap.xml and a
// project's preview image, /og/projects/<slug>.png): the pure part.
// Which requests may use the cache, under which key, how a copy is stored and served, and
// which keys an admin write purges. No Cloudflare import, so it is unit-tested with a fake
// cache (page-cache.test.ts); the wiring into the Worker is page-cache-edge.ts.
//
// The HTML of these pages does not depend on the visitor: the theme is applied in the
// browser from localStorage (inline script in routes/__root.tsx), there is no session and
// no cookie is read. One copy per URL is therefore correct for everyone.

/** A copy younger than this is served as is (`x-cache: HIT`). */
export const FRESH_SECONDS = 60;
/** After that, for this long, the copy is served once more while a new one is rendered (`STALE`). */
export const STALE_SECONDS = 300;

export const CACHE_STATUS_HEADER = "x-cache";
/** On the stored copy only: when it was rendered (ms), and the header the page really sent. */
const STORED_AT = "x-page-cached-at";
const STORED_CACHE_CONTROL = "x-page-cache-control";

const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";
const ACCESS_COOKIE = "CF_Authorization";

/** Query parameters that never change the page: dropped from the key. */
const TRACKING_PARAM =
  /^(utm_[a-z0-9_]+|fbclid|gclid|gbraid|wbraid|dclid|msclkid|mc_cid|mc_eid|igshid|yclid|twclid|ref|ref_src|_hsenc|_hsmi|_ga|_gl)$/i;

// Deliberately case-sensitive and strict: `/Projects` or `/projects/Foo` still render (or
// 404) through the router, they are just not cached, so no second spelling shares a key.
const CACHEABLE_PATH = /^\/(?:projects(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|sitemap\.xml)?$/;
/** A project's preview image. Its `v` parameter only makes the URL new after an edit. */
const IMAGE_PATH = /^\/og\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;

function hasAccessToken(headers: Headers): boolean {
  if (headers.get(ACCESS_JWT_HEADER)) return true;
  return (headers.get("cookie") ?? "")
    .split(";")
    .some((part) => part.slice(0, Math.max(part.indexOf("="), 0)).trim() === ACCESS_COOKIE);
}

/**
 * The cache key (a canonical absolute URL) for a request, or null when the request must not
 * touch the cache at all:
 * - anything but GET;
 * - a request carrying the Cloudflare Access cookie or JWT header (the signed-in owner
 *   always gets a fresh render, and nothing rendered for them is stored);
 * - any path other than /, /projects, /projects/<slug>, /sitemap.xml and
 *   /og/projects/<slug>.png, which excludes /admin and the server-function URLs (/_serverFn/...) by construction;
 * - a query string with anything but tracking parameters: those pages take no query, so an
 *   unknown one is not worth a cache entry per value.
 * One trailing slash is dropped and tracking parameters are stripped, so
 * `/projects/?utm_source=x` and `/projects` share a key.
 */
export function cacheKeyFor(request: Request): string | null {
  if (request.method !== "GET") return null;
  if (hasAccessToken(request.headers)) return null;
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : url.pathname;
  const image = IMAGE_PATH.test(path);
  if (!image && !CACHEABLE_PATH.test(path)) return null;
  for (const name of url.searchParams.keys()) {
    if (!TRACKING_PARAM.test(name) && !(image && name === "v")) return null;
  }
  return `${url.origin}${path}`;
}

/**
 * Every key an admin write to `slugs` can have changed: the two lists, the sitemap, and each
 * project's page and preview image.
 */
export function purgeKeysFor(origin: string, slugs: readonly string[]): string[] {
  const keys = [`${origin}/`, `${origin}/projects`, `${origin}/sitemap.xml`];
  for (const slug of new Set(slugs)) {
    if (slug) keys.push(`${origin}/projects/${slug}`, `${origin}/og/projects/${slug}.png`);
  }
  return keys;
}

/**
 * Only a complete, public, successful page is stored: status 200, `text/html` (or the
 * sitemap's `application/xml`, or a preview image's `image/png`), a
 * `Cache-Control` that says `public` with an `s-maxage` (the route's own policy; an error
 * is `no-store` by then, see src/start.ts), and no `Set-Cookie`. A draft or unknown slug is
 * a 404, so it can never get in.
 */
export function isStorable(response: Response): boolean {
  if (response.status !== 200) return false;
  const type = response.headers.get("content-type") ?? "";
  if (!["text/html", "application/xml", "image/png"].some((kind) => type.includes(kind))) {
    return false;
  }
  if (response.headers.has("set-cookie")) return false;
  const policy = (response.headers.get("cache-control") ?? "").toLowerCase();
  return policy.includes("public") && policy.includes("s-maxage") && !policy.includes("no-store");
}

/**
 * The copy handed to `cache.put`. The Cache API ignores `stale-while-revalidate`, so the
 * copy is kept for fresh + stale seconds and its age is tracked in a header of our own.
 */
export function toStored(response: Response, now: number): Response {
  const stored = new Response(response.body, response);
  stored.headers.set(STORED_CACHE_CONTROL, response.headers.get("cache-control") ?? "");
  stored.headers.set(STORED_AT, String(now));
  stored.headers.set("Cache-Control", `public, s-maxage=${FRESH_SECONDS + STALE_SECONDS}`);
  stored.headers.delete(CACHE_STATUS_HEADER);
  return stored;
}

/** What a cached copy is: usable as is, usable once more while it is re-rendered, or too old. */
export function freshness(stored: Response, now: number): "fresh" | "stale" | "expired" {
  const at = Number(stored.headers.get(STORED_AT));
  if (!Number.isFinite(at) || at <= 0) return "expired";
  const age = (now - at) / 1000;
  if (age < FRESH_SECONDS) return "fresh";
  return age < FRESH_SECONDS + STALE_SECONDS ? "stale" : "expired";
}

/** A stored copy as the visitor gets it: the page's own headers back, plus the status. */
export function fromStored(stored: Response, status: "HIT" | "STALE"): Response {
  const response = new Response(stored.body, stored);
  const policy = stored.headers.get(STORED_CACHE_CONTROL);
  if (policy) response.headers.set("Cache-Control", policy);
  response.headers.delete(STORED_CACHE_CONTROL);
  response.headers.delete(STORED_AT);
  response.headers.set(CACHE_STATUS_HEADER, status);
  return response;
}

export function withStatus(response: Response, status: "MISS" | "BYPASS"): Response {
  const copy = new Response(response.body, response);
  copy.headers.set(CACHE_STATUS_HEADER, status);
  return copy;
}

/** The three methods used, so tests can pass a Map-backed fake. */
export interface PageCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
  delete(key: string): Promise<boolean>;
}

// Purges bump this. A render that started before a purge must not be stored after it: it
// may hold the old content, and it would then outlive the edit by a full TTL. Per isolate,
// which is where that race is likeliest (the admin's own next request); see the handoff.
let generation = 0;
const revalidating = new Set<string>();

export interface ServeOptions {
  /** `caches.default`, or null when the runtime has no cache: every request renders. */
  cache: PageCache | null;
  /** Renders the page (the rest of the middleware chain). */
  render: () => Promise<Response>;
  /** Keeps background work alive after the response is returned. */
  waitUntil: (work: Promise<unknown>) => void;
  now?: () => number;
}

async function store(
  cache: PageCache,
  key: string,
  response: Response,
  started: number,
  now: number,
) {
  if (started !== generation) return;
  try {
    await cache.put(key, toStored(response, now));
  } catch (error) {
    console.warn("page cache: put failed", error);
  }
}

/**
 * The whole read path. Any cache failure degrades to rendering: the cache can make a page
 * faster, never unavailable.
 */
export async function servePage(request: Request, options: ServeOptions): Promise<Response> {
  const { cache, render, waitUntil } = options;
  const now = options.now ?? Date.now;
  const key = cacheKeyFor(request);
  if (!key) {
    // /admin, server functions, assets, POSTs: untouched. A cacheable page asked for with
    // the Access token is rendered fresh and labelled.
    const response = await render();
    const page = cache && request.method === "GET" && hasAccessToken(request.headers);
    return page && isStorable(response) ? withStatus(response, "BYPASS") : response;
  }
  if (!cache) return render();
  // Read before anything is awaited: a purge during the lookup or the render must win.
  const started = generation;

  let stored: Response | undefined;
  try {
    stored = await cache.match(key);
  } catch (error) {
    console.warn("page cache: match failed", error);
  }
  const state = stored ? freshness(stored, now()) : "expired";
  if (stored && state === "fresh") return fromStored(stored, "HIT");
  if (stored && state === "stale") {
    if (!revalidating.has(key)) {
      revalidating.add(key);
      waitUntil(
        render()
          .then(async (fresh) => {
            if (isStorable(fresh)) await store(cache, key, fresh, started, now());
            else await cache.delete(key);
          })
          .catch((error) => console.warn("page cache: revalidation failed", error))
          .finally(() => revalidating.delete(key)),
      );
    }
    return fromStored(stored, "STALE");
  }

  const response = await render();
  if (!isStorable(response)) return response;
  waitUntil(store(cache, key, response.clone(), started, now()));
  return withStatus(response, "MISS");
}

/** The write path: deletes every page an edit to `slugs` can have changed. Never throws. */
export async function purgePages(
  cache: PageCache | null,
  origin: string,
  slugs: readonly string[],
): Promise<void> {
  generation += 1;
  if (!cache) return;
  await Promise.all(
    purgeKeysFor(origin, slugs).map((key) =>
      cache.delete(key).catch((error) => console.warn("page cache: delete failed", error)),
    ),
  );
}

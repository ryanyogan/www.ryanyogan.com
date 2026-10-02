// The site has one URL form: no trailing slash (see absoluteUrl in ./seo.ts). The asset
// server redirects the slash form of a prerendered page by itself; this does the same for
// everything the Worker handles, so /projects/ is never a second 200 copy of /projects.

/**
 * The path (with its query) a trailing-slash URL redirects to, or null when it has none.
 * Leading slashes are collapsed as well: `//host/` must not become the protocol-relative
 * `//host`, which a browser would follow to another site.
 */
export function barePathFor(url: URL): string | null {
  const { pathname } = url;
  if (pathname.length < 2 || !pathname.endsWith("/")) return null;
  return `/${pathname.replace(/^\/+|\/+$/g, "")}${url.search}`;
}

// /admin is left to its guard (src/lib/admin/middleware.ts): a signed-out /admin/ is
// refused there, never redirected.
const ADMIN_PATH = /^\/admin(?:\/|$)/i;

/** A permanent redirect for a GET or HEAD of a trailing-slash URL, or null. */
export function trailingSlashRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (ADMIN_PATH.test(url.pathname)) return null;
  const location = barePathFor(url);
  if (!location) return null;
  return new Response(null, {
    status: 308,
    headers: { Location: location, "Cache-Control": "public, max-age=3600" },
  });
}

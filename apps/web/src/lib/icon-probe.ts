// The site has no icon files (nothing in public/). A browser asks for /favicon.ico on a first
// view all the same, and iOS for the apple-touch names when a page is saved to the home
// screen. Left to the router, each of those rendered the whole "page doesn't exist" document:
// 56.8 KB, 14.5 KB on the wire, for a response nobody reads. The status stays 404; only the
// body goes. When real icons are added to public/, the asset server answers before the Worker
// and this is never reached for them.

/** /favicon.ico, and /apple-touch-icon.png with its optional size and -precomposed forms. */
const ICON_PROBE = /^\/(?:favicon\.ico|apple-touch-icon(?:-\d+x\d+)?(?:-precomposed)?\.png)$/;

/**
 * The head link that says so up front: with an empty `data:` icon, Chrome and Firefox make
 * no icon request at all and keep their default tab icon.
 */
export const NO_ICON_LINK = { rel: "icon", href: "data:," } as const;

/** An empty 404 for a GET or HEAD of an icon path no file answers, or null. */
export function iconProbeResponse(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!ICON_PROBE.test(new URL(request.url).pathname)) return null;
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

// The site has three icon files (lib/icon.ts): /favicon.svg, /favicon.ico and
// /apple-touch-icon.png, which the asset server answers before the Worker is asked. iOS also
// tries other names when a page is saved to the home screen (a size, "-precomposed"), and no
// file answers those. Left to the router, each rendered the whole "page doesn't exist"
// document: 56.8 KB, 14.5 KB on the wire, for a response nobody reads. The status stays 404;
// only the body goes, and iOS falls back to the icon the page links to.

/** /apple-touch-icon.png with a size, "-precomposed" or both: the names with no file. */
const ICON_PROBE = /^\/apple-touch-icon(?:-\d+x\d+(?:-precomposed)?|-precomposed)\.png$/;

/** An empty 404 for a GET or HEAD of an icon path no file answers, or null. */
export function iconProbeResponse(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!ICON_PROBE.test(new URL(request.url).pathname)) return null;
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

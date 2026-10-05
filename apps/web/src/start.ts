import { createMiddleware, createStart } from "@tanstack/react-start";
import { adminFunctions } from "~/lib/admin/admin.functions";
import { adminRequestGuard } from "~/lib/admin/middleware";
import { iconProbeResponse } from "~/lib/icon-probe";
import { pageCache } from "~/lib/page-cache-edge";
import { trailingSlashRedirect } from "~/lib/trailing-slash";

const adminFunctionPaths = new Set(adminFunctions.map((fn) => fn.url));

/**
 * A route's `headers` are sent even when its loader failed, so a 500 from a D1 outage went
 * out with the page's public cache policy and a shared cache could keep the error. No error
 * response (4xx or 5xx) is cacheable.
 */
const noStoreOnError = createMiddleware().server(async ({ next }) => {
  const result = await next();
  if (result.response.status < 400) return result;
  const response = new Response(result.response.body, result.response);
  response.headers.set("Cache-Control", "no-store");
  return { ...result, response };
});

/**
 * One URL per page: /projects/ answers 308 to /projects before the cache or the router sees
 * it. (The cache key drops a trailing slash too; with this in front it never has to.)
 */
const bareUrls = createMiddleware().server(({ next, request }) => {
  return trailingSlashRedirect(request) ?? next();
});

/** An icon name with no file (lib/icon-probe.ts) is an empty 404, not the rendered 404 page. */
const iconProbes = createMiddleware().server(({ next, request }) => {
  return iconProbeResponse(request) ?? next();
});

// Global request middleware: runs before the router for every request the Worker handles.
export const startInstance = createStart(() => ({
  requestMiddleware: [
    bareUrls,
    iconProbes,
    // Outermost but for the redirect: it stores the final response, after `noStoreOnError` has marked errors.
    pageCache,
    noStoreOnError,
    adminRequestGuard((pathname) => adminFunctionPaths.has(pathname)),
  ],
}));

import { createMiddleware } from "@tanstack/react-start";
import { waitUntil } from "cloudflare:workers";
import { purgePages, servePage, type PageCache } from "./page-cache";

/**
 * `caches.default`, or null where there is none to use: in `vite dev` (a page must show a
 * code or seed change at once) and in any runtime that does not provide it. With null,
 * every request is rendered exactly as before this cache existed.
 */
function edgeCache(): PageCache | null {
  if (import.meta.env.DEV) return null;
  try {
    const store = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (!store) return null;
    return {
      match: (key) => store.match(key),
      put: (key, response) => store.put(key, response),
      delete: (key) => store.delete(key),
    };
  } catch {
    return null;
  }
}

/**
 * Global request middleware (src/start.ts, outermost): serves /, /projects and
 * /projects/<slug> from the edge cache when it can, and stores what it renders. The rules
 * are in ./page-cache.ts.
 */
export const pageCache = createMiddleware().server(async ({ next, request }) => {
  let result: Awaited<ReturnType<typeof next>> | undefined;
  const response = await servePage(request, {
    cache: edgeCache(),
    waitUntil: (work) => waitUntil(work),
    render: async () => {
      result = await next();
      return result.response;
    },
  });
  // A cache hit never ran the router: the response is all there is.
  return result ? { ...result, response } : response;
});

/**
 * Called by every admin write after it succeeds, and awaited, so the owner's next request
 * renders from D1. `request` is the write itself: the pages are purged on the host the
 * admin was used on. `cache.delete` only reaches the data centre that handled the write;
 * elsewhere a copy lives out its TTL.
 */
export async function purgeProjectPages(request: Request, ...slugs: string[]): Promise<void> {
  await purgePages(edgeCache(), new URL(request.url).origin, slugs);
}

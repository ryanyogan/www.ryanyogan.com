import { createMiddleware, createStart } from "@tanstack/react-start";
import { adminFunctions } from "~/lib/admin/admin.functions";
import { adminRequestGuard } from "~/lib/admin/middleware";

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

// Global request middleware: runs before the router for every request the Worker handles.
export const startInstance = createStart(() => ({
  requestMiddleware: [
    noStoreOnError,
    adminRequestGuard((pathname) => adminFunctionPaths.has(pathname)),
  ],
}));

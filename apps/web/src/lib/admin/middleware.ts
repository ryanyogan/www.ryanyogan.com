import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import {
  authorizeAdmin,
  denyResponse,
  isAdminPath,
  isSameOriginWrite,
  type AdminVars,
} from "./guard";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

async function requireOwner(request: Request): Promise<string> {
  // The vars are read by name, not through the generated `Env`: that type only lists what
  // `.dev.vars` happens to hold on the machine that ran `wrangler types`.
  const decision = await authorizeAdmin(request, env as unknown as AdminVars);
  if (!decision.ok) {
    console.warn(`admin: ${decision.status} ${decision.reason}`);
    throw denyResponse(decision.status);
  }
  return decision.email;
}

function withPrivateHeaders(response: Response): Response {
  const copy = new Response(response.body, response);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) copy.headers.set(name, value);
  return copy;
}

/**
 * Request middleware, registered globally in src/start.ts, so it runs before the router and
 * before a server function's payload is even parsed.
 *
 * - `/admin` and every path under it: anyone but the owner gets a bare 401/403, so no admin
 *   markup or loader data is rendered. Allowed pages go out uncacheable and noindex.
 * - An admin server function (`isAdminFunction`): the same owner check, and a write must
 *   also be a same-origin POST.
 */
export function adminRequestGuard(isAdminFunction: (pathname: string) => boolean) {
  return createMiddleware().server(async ({ next, request, pathname }) => {
    const page = isAdminPath(pathname);
    if (!page && !isAdminFunction(pathname)) return next();
    await requireOwner(request);
    if (!page && request.method !== "GET" && !isSameOriginWrite(request)) {
      console.warn("admin: 403 cross-origin or non-POST write refused");
      throw denyResponse(403);
    }
    const result = await next();
    return { ...result, response: withPrivateHeaders(result.response) };
  });
}

/** For admin server functions that only read. */
export const adminRead = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const email = await requireOwner(getRequest());
  setResponseHeaders(new Headers(PRIVATE_HEADERS));
  return next({ context: { adminEmail: email } });
});

/** For admin server functions that write: owner check, then POST from this origin only. */
export const adminWrite = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const email = await requireOwner(request);
  if (!isSameOriginWrite(request)) {
    console.warn("admin: 403 cross-origin or non-POST write refused");
    throw denyResponse(403);
  }
  setResponseHeaders(new Headers(PRIVATE_HEADERS));
  return next({ context: { adminEmail: email } });
});

// Server only. The one decision point for "may this request use the admin?".
// Used by the page middleware (src/start.ts) and by every admin server function
// (src/lib/admin/middleware.ts). Pure apart from the injected key lookup, so it is unit tested.

import {
  ACCESS_JWT_HEADER,
  getAccessKeys,
  readAccessConfig,
  verifyAccessJwt,
  type VerifyOptions,
} from "./access";

export interface AdminVars {
  ACCESS_TEAM_DOMAIN?: unknown;
  ACCESS_AUD?: unknown;
  ADMIN_EMAIL?: unknown;
  ADMIN_DEV_BYPASS?: unknown;
}

export type AdminDecision =
  | { ok: true; email: string; via: "access" | "dev-bypass" }
  | { ok: false; status: 401 | 403; reason: string };

const ACCESS_COOKIE = "CF_Authorization";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function hostnameOf(host: string): string {
  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * The local bypass. All of these must hold:
 * - the Worker var `ADMIN_DEV_BYPASS` is exactly "1" (it comes from `.dev.vars`, which
 *   `wrangler deploy` never uploads; no request header can set a var);
 * - the URL the Worker was called with is on localhost;
 * - the Host header agrees;
 * - the request did not come through Cloudflare's edge (which always adds `cf-ray`).
 */
export function devBypassApplies(request: Request, vars: AdminVars): boolean {
  if (vars.ADMIN_DEV_BYPASS !== "1") return false;
  let urlHostname: string;
  try {
    urlHostname = new URL(request.url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!LOCAL_HOSTNAMES.has(urlHostname)) return false;
  const host = request.headers.get("host");
  if (host !== null && !LOCAL_HOSTNAMES.has(hostnameOf(host))) return false;
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded !== null && !LOCAL_HOSTNAMES.has(hostnameOf(forwarded))) return false;
  if (request.headers.has("cf-ray")) return false;
  return true;
}

/**
 * The Access JWT: the header Access adds on paths its application covers (`/admin*`), or
 * the `CF_Authorization` cookie it set at login. The admin's server functions are requests
 * to `/_serverFn/...`, outside the application path, so there the browser's cookie is the
 * only carrier. Both hold the same signed token and get the same verification.
 */
export function accessTokenOf(request: Request): string | null {
  const header = request.headers.get(ACCESS_JWT_HEADER);
  if (header) return header;
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at > 0 && part.slice(0, at).trim() === ACCESS_COOKIE) {
      return part.slice(at + 1).trim() || null;
    }
  }
  return null;
}

/** Fails closed: anything that is not a verified owner token (or the local bypass) is refused. */
export async function authorizeAdmin(
  request: Request,
  vars: AdminVars,
  options: VerifyOptions = { getKeys: getAccessKeys },
): Promise<AdminDecision> {
  if (devBypassApplies(request, vars)) {
    return { ok: true, email: "dev-bypass@localhost", via: "dev-bypass" };
  }
  const config = readAccessConfig(vars);
  if (!config) return { ok: false, status: 403, reason: "admin is not configured" };

  const token = accessTokenOf(request);
  if (!token) return { ok: false, status: 401, reason: "missing Access token" };

  const result = await verifyAccessJwt(token, config, options);
  if (result.ok) return { ok: true, email: result.email, via: "access" };
  return {
    ok: false,
    status: result.reason === "email" ? 403 : 401,
    reason: `Access token rejected (${result.reason})`,
  };
}

/**
 * CSRF check for state-changing requests. Access authenticates with an ambient cookie, so a
 * write must also prove it was sent by a page on this origin: `Sec-Fetch-Site: same-origin`
 * when the browser sends it, and an `Origin` equal to the request's own origin. A request
 * with neither header is refused.
 */
export function isSameOriginWrite(request: Request): boolean {
  if (request.method !== "POST") return false;
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (origin === null) return site === "same-origin";
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    return new URL(origin).host === host && new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

/** The body is deliberately empty of detail; the reason goes to the Worker log only. */
export function denyResponse(status: 401 | 403): Response {
  return new Response(status === 401 ? "Unauthorized" : "Forbidden", {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/** True for `/admin` and everything under it, however the path is cased or encoded. */
export function isAdminPath(pathname: string): boolean {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Keep the raw path.
  }
  path = path.toLowerCase().replace(/\/{2,}/g, "/");
  return path === "/admin" || path.startsWith("/admin/");
}

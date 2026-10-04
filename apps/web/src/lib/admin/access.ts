// Server only. Verifies the JWT that Cloudflare Access adds to every request it lets
// through (`Cf-Access-Jwt-Assertion`). Web Crypto only; no dependencies, so it runs the
// same in workerd and in the unit tests.

export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export interface AccessConfig {
  /** `<team>.cloudflareaccess.com`, no scheme. */
  teamDomain: string;
  /** The Access application's Application Audience (AUD) tag. */
  aud: string;
  /** The only email allowed in, lower case. */
  adminEmail: string;
}

export type AccessFailure =
  | "malformed"
  | "algorithm"
  | "unknown-key"
  | "signature"
  | "issuer"
  | "audience"
  | "expired"
  | "not-yet-valid"
  | "email"
  | "keys-unavailable";

export type AccessResult = { ok: true; email: string } | { ok: false; reason: AccessFailure };

export type AccessJwk = JsonWebKey & { kid?: string };

export interface VerifyOptions {
  /** Returns the team's signing keys. `refresh` asks for a fetch that skips the cache. */
  getKeys: (teamDomain: string, refresh: boolean) => Promise<AccessJwk[]>;
  /** Seconds since the epoch. */
  now?: number;
}

const TEAM_DOMAIN = /^[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/;
/** Clock skew allowed on `exp` and `nbf`, in seconds. */
const LEEWAY = 30;

/**
 * Reads the three settings. Null unless all are present and well formed: the caller must
 * treat null as "admin is closed", never as "no check needed".
 */
export function readAccessConfig(vars: {
  ACCESS_TEAM_DOMAIN?: unknown;
  ACCESS_AUD?: unknown;
  ADMIN_EMAIL?: unknown;
}): AccessConfig | null {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const teamDomain = str(vars.ACCESS_TEAM_DOMAIN)
    .toLowerCase()
    .replace(/^https:\/\//, "")
    .replace(/\/+$/, "");
  const aud = str(vars.ACCESS_AUD);
  const adminEmail = str(vars.ADMIN_EMAIL).toLowerCase();
  if (!TEAM_DOMAIN.test(teamDomain) || !aud || !adminEmail.includes("@")) return null;
  return { teamDomain, aud, adminEmail };
}

function base64UrlDecode(part: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) return null;
  try {
    const binary = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function decodeJson(part: string): Record<string, unknown> | null {
  const bytes = base64UrlDecode(part);
  if (!bytes) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function signatureIsValid(
  jwk: AccessJwk,
  signature: Uint8Array<ArrayBuffer>,
  signed: string,
): Promise<boolean> {
  try {
    // The algorithm is fixed here, never taken from the token or the key's own "alg".
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      new TextEncoder().encode(signed),
    );
  } catch {
    return false;
  }
}

/**
 * Checks, in this order: shape, RS256, a key the team published, the signature, then the
 * claims (issuer, audience, expiry, email). Nothing in the payload is trusted before the
 * signature has verified.
 */
export async function verifyAccessJwt(
  token: string,
  config: AccessConfig,
  options: VerifyOptions,
): Promise<AccessResult> {
  const fail = (reason: AccessFailure): AccessResult => ({ ok: false, reason });

  const parts = token.split(".");
  if (parts.length !== 3) return fail("malformed");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeJson(headerPart);
  const payload = decodeJson(payloadPart);
  const signature = base64UrlDecode(signaturePart);
  if (!header || !payload || !signature) return fail("malformed");
  if (header.alg !== "RS256") return fail("algorithm");
  const kid = header.kid;
  if (typeof kid !== "string" || !kid) return fail("unknown-key");

  let jwk: AccessJwk | undefined;
  try {
    const usable = (k: AccessJwk) => k.kid === kid && k.kty === "RSA";
    jwk = (await options.getKeys(config.teamDomain, false)).find(usable);
    // Access rotates keys: an unknown kid gets one refetch.
    jwk ??= (await options.getKeys(config.teamDomain, true)).find(usable);
  } catch {
    return fail("keys-unavailable");
  }
  if (!jwk) return fail("unknown-key");

  if (!(await signatureIsValid(jwk, signature, `${headerPart}.${payloadPart}`))) {
    return fail("signature");
  }

  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (payload.iss !== `https://${config.teamDomain}`) return fail("issuer");
  const aud = payload.aud;
  const audOk = Array.isArray(aud) ? aud.includes(config.aud) : aud === config.aud;
  if (!audOk) return fail("audience");
  if (typeof payload.exp !== "number" || payload.exp + LEEWAY <= now) return fail("expired");
  if (typeof payload.nbf === "number" && payload.nbf - LEEWAY > now) return fail("not-yet-valid");
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (!email || email !== config.adminEmail) return fail("email");

  return { ok: true, email };
}

// --- Signing keys, cached per isolate ---------------------------------------------------

const KEYS_TTL_MS = 60 * 60 * 1000;
/** A forced refresh (unknown kid) is allowed at most this often, so junk tokens cannot make
 * the Worker hammer the certs endpoint. */
const MIN_REFRESH_MS = 60 * 1000;

const keyCache = new Map<string, { keys: AccessJwk[]; fetchedAt: number }>();

/** Fetches `https://<team>/cdn-cgi/access/certs`, cached for an hour. */
export async function getAccessKeys(teamDomain: string, refresh: boolean): Promise<AccessJwk[]> {
  const cached = keyCache.get(teamDomain);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  if (cached && age < (refresh ? MIN_REFRESH_MS : KEYS_TTL_MS)) return cached.keys;

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Access certs: HTTP ${response.status}`);
  const body: unknown = await response.json();
  const keys = (body as { keys?: unknown } | null)?.keys;
  if (!Array.isArray(keys)) throw new Error("Access certs: no keys");
  keyCache.set(teamDomain, { keys: keys as AccessJwk[], fetchedAt: Date.now() });
  return keys as AccessJwk[];
}

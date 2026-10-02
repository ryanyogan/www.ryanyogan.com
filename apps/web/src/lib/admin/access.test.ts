import { beforeAll, describe, expect, it } from "vitest";
import { readAccessConfig, verifyAccessJwt, type AccessConfig, type AccessJwk } from "./access";
import { authorizeAdmin, devBypassApplies, isAdminPath, isSameOriginWrite } from "./guard";

// A key pair made here stands in for the team's signing key; nothing touches the network.

const TEAM = "example-team.cloudflareaccess.com";
const AUD = "aud-0123456789abcdef";
const OWNER = "owner@example.com";
const NOW = 1_800_000_000;
const config: AccessConfig = { teamDomain: TEAM, aud: AUD, adminEmail: OWNER };
const vars = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ADMIN_EMAIL: OWNER };

const RSA = {
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

let teamKey: CryptoKeyPair;
let otherKey: CryptoKeyPair;
let jwks: AccessJwk[];

const b64url = (input: string | ArrayBuffer) =>
  Buffer.from(typeof input === "string" ? Buffer.from(input) : Buffer.from(input)).toString(
    "base64url",
  );

async function sign(
  claims: Record<string, unknown>,
  { key = teamKey.privateKey, header = {} as Record<string, unknown> } = {},
): Promise<string> {
  const head = b64url(JSON.stringify({ alg: "RS256", kid: "key-1", typ: "JWT", ...header }));
  const body = b64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(signature)}`;
}

const claims = (over: Record<string, unknown> = {}) => ({
  iss: `https://${TEAM}`,
  aud: [AUD],
  email: OWNER,
  iat: NOW - 60,
  nbf: NOW - 60,
  exp: NOW + 600,
  type: "app",
  ...over,
});

const getKeys = async () => jwks;
const verify = (token: string, cfg = config) => verifyAccessJwt(token, cfg, { getKeys, now: NOW });

beforeAll(async () => {
  teamKey = await crypto.subtle.generateKey(RSA, true, ["sign", "verify"]);
  otherKey = await crypto.subtle.generateKey(RSA, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", teamKey.publicKey);
  jwks = [{ ...jwk, kid: "key-1" }];
});

describe("verifyAccessJwt", () => {
  it("accepts a valid token for the owner", async () => {
    expect(await verify(await sign(claims()))).toEqual({ ok: true, email: OWNER });
  });

  it("accepts aud as a plain string and ignores email case", async () => {
    const token = await sign(claims({ aud: AUD, email: "Owner@Example.com" }));
    expect(await verify(token)).toEqual({ ok: true, email: OWNER });
  });

  it("rejects the wrong audience", async () => {
    const token = await sign(claims({ aud: ["some-other-application"] }));
    expect(await verify(token)).toEqual({ ok: false, reason: "audience" });
  });

  it("rejects the wrong issuer", async () => {
    const token = await sign(claims({ iss: "https://attacker.cloudflareaccess.com" }));
    expect(await verify(token)).toEqual({ ok: false, reason: "issuer" });
  });

  it("rejects an expired token, and one with no exp", async () => {
    expect(await verify(await sign(claims({ exp: NOW - 120 })))).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(await verify(await sign(claims({ exp: undefined })))).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a token that is not valid yet", async () => {
    const token = await sign(claims({ nbf: NOW + 600 }));
    expect(await verify(token)).toEqual({ ok: false, reason: "not-yet-valid" });
  });

  it("rejects another email, and a token with no email", async () => {
    expect(await verify(await sign(claims({ email: "someone@example.com" })))).toEqual({
      ok: false,
      reason: "email",
    });
    expect(await verify(await sign(claims({ email: undefined })))).toEqual({
      ok: false,
      reason: "email",
    });
  });

  it("rejects a signature made with another key", async () => {
    const token = await sign(claims(), { key: otherKey.privateKey });
    expect(await verify(token)).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects a payload altered after signing", async () => {
    const [head, , signature] = (await sign(claims({ email: "someone@example.com" }))).split(".");
    const forged = `${head}.${b64url(JSON.stringify(claims()))}.${signature}`;
    expect(await verify(forged)).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects unsigned and non-RS256 tokens", async () => {
    const body = b64url(JSON.stringify(claims()));
    const none = `${b64url(JSON.stringify({ alg: "none", kid: "key-1" }))}.${body}.`;
    expect(await verify(none)).toEqual({ ok: false, reason: "malformed" });
    const noneWithSig = `${b64url(JSON.stringify({ alg: "none", kid: "key-1" }))}.${body}.AAAA`;
    expect(await verify(noneWithSig)).toEqual({ ok: false, reason: "algorithm" });
    const hs256 = await sign(claims(), { header: { alg: "HS256" } });
    expect(await verify(hs256)).toEqual({ ok: false, reason: "algorithm" });
  });

  it("rejects an unknown key id after one refetch", async () => {
    const calls: boolean[] = [];
    const token = await sign(claims(), { header: { kid: "rotated-away" } });
    const result = await verifyAccessJwt(token, config, {
      now: NOW,
      getKeys: async (_team, refresh) => {
        calls.push(refresh);
        return jwks;
      },
    });
    expect(result).toEqual({ ok: false, reason: "unknown-key" });
    expect(calls).toEqual([false, true]);
  });

  it("rejects garbage, and fails closed when the keys cannot be fetched", async () => {
    expect(await verify("garbage")).toEqual({ ok: false, reason: "malformed" });
    expect(await verify("a.b.c")).toEqual({ ok: false, reason: "malformed" });
    const result = await verifyAccessJwt(await sign(claims()), config, {
      now: NOW,
      getKeys: async () => {
        throw new Error("network down");
      },
    });
    expect(result).toEqual({ ok: false, reason: "keys-unavailable" });
  });
});

describe("readAccessConfig", () => {
  it("normalises a full URL and upper-case email", () => {
    expect(
      readAccessConfig({
        ACCESS_TEAM_DOMAIN: `https://${TEAM}/`,
        ACCESS_AUD: ` ${AUD} `,
        ADMIN_EMAIL: "Owner@Example.com",
      }),
    ).toEqual(config);
  });

  it("is null when anything is missing or the team domain is not an Access domain", () => {
    expect(readAccessConfig({})).toBeNull();
    for (const missing of Object.keys(vars)) {
      expect(readAccessConfig({ ...vars, [missing]: undefined })).toBeNull();
      expect(readAccessConfig({ ...vars, [missing]: "" })).toBeNull();
    }
    expect(readAccessConfig({ ...vars, ACCESS_TEAM_DOMAIN: "evil.example.com" })).toBeNull();
    expect(
      readAccessConfig({ ...vars, ACCESS_TEAM_DOMAIN: "evil.com/x.cloudflareaccess.com" }),
    ).toBeNull();
  });
});

describe("authorizeAdmin", () => {
  const options = { getKeys, now: NOW };
  const request = (url: string, headers: Record<string, string> = {}) =>
    new Request(url, { headers });

  it("lets the owner in with a valid token", async () => {
    const token = await sign(claims());
    const decision = await authorizeAdmin(
      request("https://ryanyogan.com/admin", { "cf-access-jwt-assertion": token }),
      vars,
      options,
    );
    expect(decision).toEqual({ ok: true, email: OWNER, via: "access" });
  });

  it("takes the token from the CF_Authorization cookie when there is no header", async () => {
    const token = await sign(claims());
    const url = "https://ryanyogan.com/_serverFn/abc";
    expect(
      await authorizeAdmin(
        request(url, { cookie: `a=b; CF_Authorization=${token}; c=d` }),
        vars,
        options,
      ),
    ).toEqual({ ok: true, email: OWNER, via: "access" });
    const stranger = await sign(claims(), { key: otherKey.privateKey });
    expect(
      await authorizeAdmin(request(url, { cookie: `CF_Authorization=${stranger}` }), vars, options),
    ).toMatchObject({ ok: false, status: 401 });
    expect(
      await authorizeAdmin(request(url, { cookie: "XCF_Authorization=x; other=1" }), vars, options),
    ).toMatchObject({ ok: false, status: 401 });
  });

  it("is 403 with missing config, even with a valid token", async () => {
    const token = await sign(claims());
    for (const missing of Object.keys(vars)) {
      const decision = await authorizeAdmin(
        request("https://ryanyogan.com/admin", { "cf-access-jwt-assertion": token }),
        { ...vars, [missing]: undefined },
        options,
      );
      expect(decision).toMatchObject({ ok: false, status: 403 });
    }
  });

  it("is 401 with no token or a bad one, 403 for another verified email", async () => {
    expect(
      await authorizeAdmin(request("https://ryanyogan.com/admin"), vars, options),
    ).toMatchObject({ ok: false, status: 401 });
    expect(
      await authorizeAdmin(
        request("https://ryanyogan.com/admin", { "cf-access-jwt-assertion": "garbage" }),
        vars,
        options,
      ),
    ).toMatchObject({ ok: false, status: 401 });
    const stranger = await sign(claims({ email: "someone@example.com" }));
    expect(
      await authorizeAdmin(
        request("https://ryanyogan.com/admin", { "cf-access-jwt-assertion": stranger }),
        vars,
        options,
      ),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("never trusts an email header", async () => {
    const decision = await authorizeAdmin(
      request("https://ryanyogan.com/admin", {
        "cf-access-authenticated-user-email": OWNER,
        "x-admin-email": OWNER,
      }),
      vars,
      options,
    );
    expect(decision).toMatchObject({ ok: false, status: 401 });
  });
});

describe("dev bypass", () => {
  const on = { ADMIN_DEV_BYPASS: "1" };
  const request = (url: string, headers: Record<string, string> = {}) =>
    new Request(url, { headers });

  it("applies only with the var set to 1 and a localhost request", () => {
    expect(devBypassApplies(request("http://localhost:3000/admin"), on)).toBe(true);
    expect(devBypassApplies(request("http://127.0.0.1:4173/admin"), on)).toBe(true);
    expect(devBypassApplies(request("http://localhost:3000/admin"), {})).toBe(false);
    expect(
      devBypassApplies(request("http://localhost:3000/admin"), { ADMIN_DEV_BYPASS: "true" }),
    ).toBe(false);
    expect(devBypassApplies(request("http://localhost:3000/admin"), { ADMIN_DEV_BYPASS: 1 })).toBe(
      false,
    );
  });

  it("cannot be switched on by a header", async () => {
    const headers = {
      "admin-dev-bypass": "1",
      ADMIN_DEV_BYPASS: "1",
      "x-admin-dev-bypass": "1",
      host: "localhost",
    };
    expect(devBypassApplies(request("http://localhost:3000/admin", headers), {})).toBe(false);
    expect(
      await authorizeAdmin(request("http://localhost:3000/admin", headers), vars, { getKeys }),
    ).toMatchObject({ ok: false, status: 401 });
  });

  it("is ignored off localhost, whatever the Host header says", () => {
    expect(devBypassApplies(request("https://ryanyogan.com/admin"), on)).toBe(false);
    expect(
      devBypassApplies(request("https://ryanyogan.com/admin", { host: "localhost" }), on),
    ).toBe(false);
    expect(
      devBypassApplies(request("http://localhost:3000/admin", { host: "ryanyogan.com" }), on),
    ).toBe(false);
    expect(devBypassApplies(request("http://localhost.evil.com/admin"), on)).toBe(false);
    expect(
      devBypassApplies(request("http://localhost:3000/admin", { "x-forwarded-host": "a.com" }), on),
    ).toBe(false);
    expect(devBypassApplies(request("http://localhost:3000/admin", { "cf-ray": "8f0" }), on)).toBe(
      false,
    );
  });
});

describe("isSameOriginWrite", () => {
  const post = (headers: Record<string, string>, method = "POST") =>
    new Request("https://ryanyogan.com/_serverFn/abc", { method, headers });

  it("accepts a same-origin POST", () => {
    expect(
      isSameOriginWrite(post({ origin: "https://ryanyogan.com", "sec-fetch-site": "same-origin" })),
    ).toBe(true);
    expect(isSameOriginWrite(post({ origin: "https://ryanyogan.com" }))).toBe(true);
    expect(isSameOriginWrite(post({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("refuses cross-site, same-site, header-less and non-POST requests", () => {
    expect(isSameOriginWrite(post({ origin: "https://evil.example" }))).toBe(false);
    expect(
      isSameOriginWrite(post({ origin: "https://ryanyogan.com", "sec-fetch-site": "cross-site" })),
    ).toBe(false);
    expect(
      isSameOriginWrite(
        post({ origin: "https://blog.ryanyogan.com", "sec-fetch-site": "same-site" }),
      ),
    ).toBe(false);
    expect(isSameOriginWrite(post({ origin: "null" }))).toBe(false);
    expect(isSameOriginWrite(post({}))).toBe(false);
    expect(
      isSameOriginWrite(
        post({ origin: "https://ryanyogan.com", "sec-fetch-site": "same-origin" }, "GET"),
      ),
    ).toBe(false);
  });
});

describe("isAdminPath", () => {
  it("matches /admin however it is written, and nothing else", () => {
    for (const path of [
      "/admin",
      "/admin/",
      "/admin/projects/x",
      "/Admin",
      "/%61dmin",
      "//admin",
    ]) {
      expect(isAdminPath(path), path).toBe(true);
    }
    for (const path of ["/", "/projects", "/administrator", "/projects/admin"]) {
      expect(isAdminPath(path), path).toBe(false);
    }
  });
});

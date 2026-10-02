import { describe, expect, it } from "vitest";
import {
  cacheKeyFor,
  FRESH_SECONDS,
  isStorable,
  purgeKeysFor,
  purgePages,
  servePage,
  STALE_SECONDS,
  type PageCache,
} from "./page-cache";

const ORIGIN = "https://example.com";
const POLICY = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

function get(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${path}`, { headers });
}

function html(body: string, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": POLICY,
      ...init.headers,
    },
  });
}

/** Tests give times in ms from this instant. */
const T0 = 1_800_000_000_000;

/** A Map-backed stand-in for `caches.default`. */
function fakeCache() {
  const entries = new Map<string, Response>();
  const cache: PageCache = {
    match: async (key) => entries.get(key)?.clone(),
    put: async (key, response) => void entries.set(key, response),
    delete: async (key) => entries.delete(key),
  };
  return { cache, entries };
}

/** Runs one request; background work is awaited before returning, as the runtime would. */
async function serve(
  cache: PageCache | null,
  request: Request,
  render: () => Promise<Response>,
  now = 0,
) {
  const background: Promise<unknown>[] = [];
  const response = await servePage(request, {
    cache,
    render,
    waitUntil: (work) => void background.push(work),
    now: () => T0 + now,
  });
  const body = await response.text();
  await Promise.all(background);
  return { response, body, status: response.headers.get("x-cache") };
}

describe("cacheKeyFor", () => {
  it("keys the three public pages on their canonical URL", () => {
    expect(cacheKeyFor(get("/"))).toBe(`${ORIGIN}/`);
    expect(cacheKeyFor(get("/projects"))).toBe(`${ORIGIN}/projects`);
    expect(cacheKeyFor(get("/projects/"))).toBe(`${ORIGIN}/projects`);
    expect(cacheKeyFor(get("/projects/lincoln-project/"))).toBe(
      `${ORIGIN}/projects/lincoln-project`,
    );
  });

  it("strips tracking parameters and refuses any other query", () => {
    expect(cacheKeyFor(get("/?utm_source=x&utm_medium=y&fbclid=1&gclid=2"))).toBe(`${ORIGIN}/`);
    expect(cacheKeyFor(get("/projects/?ref=hn"))).toBe(`${ORIGIN}/projects`);
    expect(cacheKeyFor(get("/projects?page=2"))).toBeNull();
    expect(cacheKeyFor(get("/?utm_source=x&q=1"))).toBeNull();
  });

  it("never keys /admin, server functions, other pages or other spellings", () => {
    for (const path of [
      "/admin",
      "/admin/projects/lincoln-project",
      "/_serverFn/abc123",
      "/_serverFn/abc123?payload=%7B%7D",
      "/work",
      "/writing/some-post",
      "/rss.xml",
      "/projects/a/b",
      "/projects//",
      "/Projects",
      "/projects/Lincoln",
      "/projects/..%2Fadmin",
    ]) {
      expect(cacheKeyFor(get(path)), path).toBeNull();
    }
  });

  it("never keys a request carrying the Access cookie or JWT header, or a non-GET", () => {
    expect(cacheKeyFor(get("/", { cookie: "a=1; CF_Authorization=tok" }))).toBeNull();
    expect(cacheKeyFor(get("/projects", { cookie: "CF_Authorization=" }))).toBeNull();
    expect(cacheKeyFor(get("/", { "Cf-Access-Jwt-Assertion": "tok" }))).toBeNull();
    expect(cacheKeyFor(get("/", { cookie: "theme=dark; other=CF_Authorization" }))).toBe(
      `${ORIGIN}/`,
    );
    expect(cacheKeyFor(new Request(`${ORIGIN}/`, { method: "POST" }))).toBeNull();
    expect(cacheKeyFor(new Request(`${ORIGIN}/`, { method: "HEAD" }))).toBeNull();
  });
});

describe("isStorable", () => {
  it("accepts only a public 200 HTML page", () => {
    expect(isStorable(html("ok"))).toBe(true);
    expect(isStorable(html("gone", { status: 404 }))).toBe(false);
    expect(isStorable(html("boom", { status: 500 }))).toBe(false);
    expect(isStorable(html("ok", { headers: { "cache-control": "no-store" } }))).toBe(false);
    expect(isStorable(html("ok", { headers: { "cache-control": "private" } }))).toBe(false);
    expect(isStorable(html("ok", { headers: { "set-cookie": "a=1" } }))).toBe(false);
    expect(isStorable(html("{}", { headers: { "content-type": "application/json" } }))).toBe(false);
  });
});

describe("purgeKeysFor", () => {
  it("lists both index pages and each distinct project page", () => {
    expect(purgeKeysFor(ORIGIN, ["old", "new", "old", ""])).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/projects`,
      `${ORIGIN}/projects/old`,
      `${ORIGIN}/projects/new`,
    ]);
  });
});

describe("servePage", () => {
  it("renders once, then serves the copy with the page's own headers", async () => {
    const { cache, entries } = fakeCache();
    let renders = 0;
    const render = async () => html(`render ${++renders}`);

    const first = await serve(cache, get("/projects"), render);
    expect(first.status).toBe("MISS");
    expect(first.body).toBe("render 1");

    const second = await serve(cache, get("/projects/?utm_source=x"), render, 1000);
    expect(second.status).toBe("HIT");
    expect(second.body).toBe("render 1");
    expect(second.response.headers.get("cache-control")).toBe(POLICY);
    expect(second.response.headers.get("x-page-cached-at")).toBeNull();
    expect(second.response.headers.get("x-page-cache-control")).toBeNull();
    expect(renders).toBe(1);
    // The stored copy outlives the fresh window so it can be served stale.
    expect(entries.get(`${ORIGIN}/projects`)?.headers.get("cache-control")).toBe(
      `public, s-maxage=${FRESH_SECONDS + STALE_SECONDS}`,
    );
  });

  it("serves a stale copy once more while it re-renders, and drops an expired one", async () => {
    const { cache } = fakeCache();
    let renders = 0;
    const render = async () => html(`render ${++renders}`);
    await serve(cache, get("/"), render, 0);

    const stale = await serve(cache, get("/"), render, (FRESH_SECONDS + 1) * 1000);
    expect(stale.status).toBe("STALE");
    expect(stale.body).toBe("render 1");
    expect(renders).toBe(2);

    const after = await serve(cache, get("/"), render, (FRESH_SECONDS + 2) * 1000);
    expect(after.status).toBe("HIT");
    expect(after.body).toBe("render 2");

    const late = (FRESH_SECONDS + 1 + FRESH_SECONDS + STALE_SECONDS + 1) * 1000;
    const expired = await serve(cache, get("/"), render, late);
    expect(expired.status).toBe("MISS");
    expect(expired.body).toBe("render 3");
  });

  it("drops the copy when revalidation finds the page gone", async () => {
    const { cache, entries } = fakeCache();
    await serve(cache, get("/projects/x"), async () => html("was here"), 0);
    const stale = await serve(
      cache,
      get("/projects/x"),
      async () => html("gone", { status: 404, headers: { "cache-control": "no-store" } }),
      (FRESH_SECONDS + 1) * 1000,
    );
    expect(stale.status).toBe("STALE");
    expect(entries.size).toBe(0);
  });

  it("never stores a 404 (a draft or unknown slug) or a 500", async () => {
    const { cache, entries } = fakeCache();
    for (const status of [404, 500]) {
      const render = async () => html("no", { status, headers: { "cache-control": "no-store" } });
      for (let i = 0; i < 2; i += 1) {
        const result = await serve(cache, get("/projects/draft-project"), render);
        expect(result.response.status).toBe(status);
        expect(result.status).toBeNull();
      }
    }
    expect(entries.size).toBe(0);
  });

  it("bypasses the cache in both directions for the signed-in owner", async () => {
    const { cache, entries } = fakeCache();
    const owner = { cookie: "CF_Authorization=tok" };
    const first = await serve(cache, get("/", owner), async () => html("for owner"));
    expect(first.status).toBe("BYPASS");
    expect(entries.size).toBe(0);

    await serve(cache, get("/"), async () => html("cached"));
    const second = await serve(cache, get("/", owner), async () => html("fresh for owner"));
    expect(second.status).toBe("BYPASS");
    expect(second.body).toBe("fresh for owner");
  });

  it("leaves every other request alone", async () => {
    const { cache, entries } = fakeCache();
    const original = html("admin");
    const background: Promise<unknown>[] = [];
    const response = await servePage(get("/admin"), {
      cache,
      render: async () => original,
      waitUntil: (work) => void background.push(work),
    });
    expect(response).toBe(original);
    expect(background).toHaveLength(0);
    expect(entries.size).toBe(0);
  });

  it("renders every time when there is no cache (local dev)", async () => {
    let renders = 0;
    const render = async () => html(`render ${++renders}`);
    const first = await serve(null, get("/"), render);
    const second = await serve(null, get("/"), render);
    expect([first.body, second.body]).toEqual(["render 1", "render 2"]);
    expect(second.status).toBeNull();
    expect(second.response.headers.get("cache-control")).toBe(POLICY);
    await expect(purgePages(null, ORIGIN, ["x"])).resolves.toBeUndefined();
  });

  it("still renders when the cache throws", async () => {
    const broken: PageCache = {
      match: async () => Promise.reject(new Error("down")),
      put: async () => Promise.reject(new Error("down")),
      delete: async () => Promise.reject(new Error("down")),
    };
    const result = await serve(broken, get("/"), async () => html("rendered"));
    expect(result.body).toBe("rendered");
    await expect(purgePages(broken, ORIGIN, ["x"])).resolves.toBeUndefined();
  });
});

describe("purgePages", () => {
  it("makes the next request render again, for the project and both lists only", async () => {
    const { cache, entries } = fakeCache();
    let version = 1;
    const render = async () => html(`v${version}`);
    for (const path of ["/", "/projects", "/projects/a", "/projects/b"]) {
      await serve(cache, get(path), render);
    }
    version = 2;
    await purgePages(cache, ORIGIN, ["a"]);
    expect([...entries.keys()]).toEqual([`${ORIGIN}/projects/b`]);

    for (const path of ["/", "/projects", "/projects/a"]) {
      const result = await serve(cache, get(path), render, 1000);
      expect(result.status, path).toBe("MISS");
      expect(result.body, path).toBe("v2");
    }
    expect((await serve(cache, get("/projects/b"), render, 1000)).body).toBe("v1");
  });

  it("does not let a render that began before the purge be stored after it", async () => {
    const { cache, entries } = fakeCache();
    let release: (response: Response) => void = () => {};
    const slow = new Promise<Response>((resolve) => (release = resolve));
    const pending = serve(cache, get("/projects/a"), () => slow);
    await purgePages(cache, ORIGIN, ["a"]);
    release(html("old content"));
    expect((await pending).body).toBe("old content");
    expect(entries.size).toBe(0);
  });
});

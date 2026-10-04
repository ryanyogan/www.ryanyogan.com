import { readdirSync } from "node:fs";
import { BROKEN_ORIGIN, CLIENT_DIR, draft, expect, test } from "./fixtures";

// The edge cache in front of the D1 pages (src/lib/page-cache.ts), on the public preview.
// What an admin write does to it is in admin.spec.ts (publish, edit, rename, delete).

const PUBLIC_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
const IMMUTABLE = "public, max-age=31536000, immutable";

for (const path of ["/", "/projects", "/projects/lincoln-project"]) {
  test(`${path} is served from the cache the second time, unchanged`, async ({ request }) => {
    const first = await request.get(path);
    expect(["MISS", "HIT"]).toContain(first.headers()["x-cache"]);
    const second = await request.get(path);
    expect(second.status()).toBe(200);
    expect(second.headers()["x-cache"]).toBe("HIT");
    expect(second.headers()["cache-control"]).toBe(PUBLIC_CACHE);
    expect(second.headers()["content-type"]).toContain("text/html");
    expect(second.headers()["x-page-cached-at"]).toBeUndefined();
    expect(await second.text()).toBe(await first.text());

    // A trailing slash and tracking parameters are the same entry.
    const sep = path === "/" ? "" : "/";
    const tracked = await request.get(`${path}${sep}?utm_source=e2e&fbclid=1`);
    expect(tracked.headers()["x-cache"]).toBe("HIT");
  });
}

test("a request with the Access cookie or token is never served from the cache", async ({
  request,
}) => {
  await request.get("/projects");
  const owner: Record<string, string>[] = [
    { cookie: "CF_Authorization=anything" },
    { "cf-access-jwt-assertion": "anything" },
  ];
  for (const headers of owner) {
    const response = await request.get("/projects", { headers });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-cache"]).toBe("BYPASS");
  }
  // Any other query string is rendered, not cached.
  const odd = await request.get("/projects?page=2");
  expect(odd.headers()["x-cache"]).toBeUndefined();
});

test("drafts, unknown projects and other routes never enter the cache", async ({ request }) => {
  for (const path of [`/projects/${draft.slug}`, "/projects/no-such-project"]) {
    for (let i = 0; i < 3; i += 1) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(response.headers()["x-cache"], path).toBeUndefined();
      expect(response.headers()["cache-control"], path).toBe("no-store");
      expect(await response.text(), path).not.toContain(draft.title);
    }
  }
  for (const path of ["/work", "/writing", "/rss.xml", "/admin"]) {
    await request.get(path);
    expect((await request.get(path)).headers()["x-cache"], path).toBeUndefined();
  }
});

// public/_headers. Every file the build puts under /assets has a hash of its contents in its
// name, which is what makes a year safe; a file there without one fails this test.
test("hashed build files are cached for a year, and nothing else is", async ({ request }) => {
  const files = readdirSync(`${CLIENT_DIR}/assets`);
  expect(files.length).toBeGreaterThan(10);
  for (const file of files) expect(file).toMatch(/-[\w-]{8}\.(js|css|woff2)$/);

  const pick = (pattern: RegExp) => files.filter((file) => pattern.test(file));
  const some = [...pick(/\.woff2$/), ...pick(/\.css$/), ...pick(/^main-.*\.js$/)];
  expect(some.length).toBeGreaterThanOrEqual(10);
  for (const file of some) {
    const response = await request.get(`/assets/${file}`);
    expect(response.status(), file).toBe(200);
    expect(response.headers()["cache-control"], file).toBe(IMMUTABLE);
  }
  // A name the build did not emit is not an answer to keep for a year.
  const missing = await request.get("/assets/main-00000000.js");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["cache-control"] ?? "").not.toContain("immutable");

  // Their URLs stay the same when their contents change.
  for (const path of ["/work", "/writing", "/rss.xml", "/robots.txt", "/images/brain.png"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["cache-control"] ?? "", path).not.toContain("immutable");
  }
});

test("an error response is never cached", async ({ request }) => {
  for (const path of ["/", "/projects", "/projects/lincoln-project"]) {
    for (let i = 0; i < 3; i += 1) {
      const response = await request.get(`${BROKEN_ORIGIN}${path}`);
      expect(response.status(), path).toBe(500);
      expect(response.headers()["x-cache"], path).toBeUndefined();
      expect(response.headers()["cache-control"], path).toBe("no-store");
    }
  }
});

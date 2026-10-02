import { BROKEN_ORIGIN, draft, expect, test } from "./fixtures";

// The edge cache in front of the D1 pages (src/lib/page-cache.ts), on the public preview.
// What an admin write does to it is in admin.spec.ts (publish, edit, rename, delete).

const PUBLIC_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

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

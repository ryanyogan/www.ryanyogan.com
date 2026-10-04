import { test as plain, type Page, type Response } from "@playwright/test";
import { BROKEN_ORIGIN, expect, postSlugs, test } from "./fixtures";

// The view count on a writing post (src/components/ViewCount.tsx, POST /api/views/<slug>)
// and on the rows of the writing index (GET /api/views).
// It runs in all three projects, which share one database, and other specs open posts at
// the same time: a count is only ever compared with an earlier one ("more than"), never
// with a fixed number. That one load adds exactly one is the unit test's job
// (src/lib/post-views.test.ts); here it is that one load makes exactly one request.

const slug = postSlugs[0];
const api = (post: string) => `/api/views/${post}`;
const isCount = (response: Response) =>
  response.request().method() === "POST" &&
  new URL(response.url()).pathname.startsWith("/api/views/");

const isList = (response: Response) => new URL(response.url()).pathname === "/api/views";
/** A post's row on the writing index. */
const row = (page: Page, post: string) =>
  page.locator(".wlist li").filter({ has: page.locator(`a[href="/writing/${post}"]`) });
/** Two frames, so React has drawn whatever an answer makes it draw. */
const drawn = (page: Page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );

/** The paths of the counting requests the page makes from now on, in order. */
function countRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (request.method() === "POST" && pathname.startsWith("/api/views/")) paths.push(pathname);
  });
  return paths;
}

/** Runs `go`, waits for the view it counts, and checks the page shows that total. */
async function countedLoad(page: Page, go: () => Promise<unknown>): Promise<number> {
  const [response] = await Promise.all([page.waitForResponse(isCount), go()]);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const { views } = (await response.json()) as { views: number };
  expect(Number.isInteger(views) && views > 0, `views: ${views}`).toBe(true);
  // The icon is hidden from assistive technology; the text reads "1,204 views".
  const count = page.locator(".post-meta .views");
  await expect(count).toHaveText(`${views.toLocaleString("en-US")} views`);
  await expect(count.locator("svg")).toHaveAttribute("aria-hidden", "true");
  return views;
}

test("a post shows its view count, and every load counts once", async ({ page }) => {
  const requests = countRequests(page);
  const first = await countedLoad(page, () => page.goto(`/writing/${slug}`));
  const second = await countedLoad(page, () => page.reload());
  const third = await countedLoad(page, () => page.reload());
  expect(second).toBeGreaterThan(first);
  expect(third).toBeGreaterThan(second);
  // Idle, so a second request from the same load would have been made by now.
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual([api(slug), api(slug), api(slug)]);
});

test("arriving at a post by a link counts that post once", async ({ page }) => {
  const requests = countRequests(page);
  await countedLoad(page, () => page.goto(`/writing/${slug}`));
  const link = page.locator(".post-nav a").first();
  const next = (await link.getAttribute("href"))!.replace("/writing/", "");
  expect(postSlugs).toContain(next);
  await countedLoad(page, () => link.click());
  await expect(page).toHaveURL(new RegExp(`/writing/${next}$`));
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual([api(slug), api(next)]);
});

test("the count's space is reserved: nothing moves when the number arrives", async ({ page }) => {
  // Hold the answer back, so the page can be measured without the number first.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/views/*", async (route) => {
    await held;
    await route.continue();
  });
  const requested = page.waitForRequest((request) => request.url().includes("/api/views/"));
  await page.goto(`/writing/${slug}`);
  await requested;
  await page.evaluate(() => document.fonts.ready);

  const count = page.locator(".post-meta .views");
  await expect(count).toBeEmpty();
  const boxes = () =>
    page.evaluate(() =>
      [".post-meta .views", ".post-meta", ".post-head", ".post-body"].map((selector) => {
        const { x, y, width, height } = document.querySelector(selector)!.getBoundingClientRect();
        return { selector, x, y, width, height };
      }),
    );
  const before = await boxes();
  // Empty, but a box: one line tall and wide enough for the number.
  expect(before[0].width).toBeGreaterThan(40);
  expect(before[0].height).toBeGreaterThan(14);

  // Chromium also reports layout shifts itself (the number Lighthouse adds up as CLS).
  const measuresShift = await page.evaluate(() => {
    if (!PerformanceObserver.supportedEntryTypes.includes("layout-shift")) return false;
    const state = window as unknown as { shift: number };
    state.shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.shift += (entry as unknown as { value: number }).value;
      }
    }).observe({ type: "layout-shift" });
    return true;
  });

  release();
  await expect(count).toHaveText(/^[\d,]+ views$/);
  await expect(count.locator("svg")).toBeVisible();
  // Two frames, so a shift caused by the number has been reported.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  expect(await boxes()).toEqual(before);
  if (measuresShift) {
    expect(await page.evaluate(() => (window as unknown as { shift: number }).shift)).toBe(0);
  }
});

test("the writing index shows each post's count, from one request that counts nothing", async ({
  page,
  request,
}) => {
  const counted = ((await (await request.post(api(slug))).json()) as { views: number }).views;
  const requests: string[] = [];
  page.on("request", (made) => {
    const { pathname } = new URL(made.url());
    if (pathname.startsWith("/api/views")) requests.push(`${made.method()} ${pathname}`);
  });
  const [response] = await Promise.all([page.waitForResponse(isList), page.goto("/writing")]);
  expect(response.status()).toBe(200);
  const all = ((await response.json()) as { views: Record<string, number> }).views;
  expect(all[slug]).toBeGreaterThanOrEqual(counted);

  // Every row has the box; a post nobody has opened yet keeps it empty.
  await expect(page.locator(".wlist .views")).toHaveCount(postSlugs.length);
  for (const post of postSlugs) {
    const count = row(page, post).locator(".views");
    if (all[post] === undefined) await expect(count).toBeEmpty();
    else await expect(count).toHaveText(`${all[post].toLocaleString("en-US")} views`);
  }
  await expect(row(page, slug).locator(".views svg")).toHaveAttribute("aria-hidden", "true");
  // Idle, so a request per row or a counting one would have been made by now.
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual(["GET /api/views"]);
});

test("the writing index reserves the counts' space: no row moves when they arrive", async ({
  page,
  request,
}) => {
  expect((await request.post(api(slug))).status()).toBe(200);
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === "/api/views",
    async (route) => {
      await held;
      await route.continue();
    },
  );
  const requested = page.waitForRequest((made) => new URL(made.url()).pathname === "/api/views");
  await page.goto("/writing");
  await requested;
  await page.evaluate(() => document.fonts.ready);

  const count = row(page, slug).locator(".views");
  await expect(count).toBeEmpty();
  // Every row, and in it the date, the title's link and the count's box.
  const boxes = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".wlist li")].map((item) =>
        [item, ...item.querySelectorAll("time, a, .views")].map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }),
      ),
    );
  const before = await boxes();
  expect(before).toHaveLength(postSlugs.length);
  for (const [item, date, , views] of before) {
    expect(views.width).toBeGreaterThan(40);
    // One line of the date's type, and inside the row at its right end.
    expect(views.height).toBeGreaterThan(13);
    expect(views.height).toBeLessThanOrEqual(date.height + 1);
    expect(Math.abs(views.x + views.width - (item.x + item.width))).toBeLessThan(1);
    expect(views.x).toBeGreaterThan(date.x + date.width);
  }

  const measuresShift = await page.evaluate(() => {
    if (!PerformanceObserver.supportedEntryTypes.includes("layout-shift")) return false;
    const state = window as unknown as { shift: number };
    state.shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.shift += (entry as unknown as { value: number }).value;
      }
    }).observe({ type: "layout-shift" });
    return true;
  });

  release();
  await expect(count).toHaveText(/^[\d,]+ views$/);
  await expect(count.locator("svg")).toBeVisible();
  await drawn(page);
  expect(await boxes()).toEqual(before);
  if (measuresShift) {
    expect(await page.evaluate(() => (window as unknown as { shift: number }).shift)).toBe(0);
  }
});

test("only a real post can be counted, and only by POST", async ({ request }) => {
  const counted = await request.post(api(slug));
  expect(counted.status()).toBe(200);
  expect(counted.headers()["cache-control"]).toBe("no-store");
  const { views } = (await counted.json()) as { views: number };
  expect(views).toBeGreaterThan(0);
  expect(
    ((await (await request.post(api(slug))).json()) as { views: number }).views,
  ).toBeGreaterThan(views);

  for (const unknown of ["no-such-post", "e2e-junk-row", slug.toUpperCase(), `${slug}.md`, "%27"]) {
    const response = await request.post(api(unknown));
    expect(response.status(), unknown).toBe(404);
    expect(response.headers()["cache-control"], unknown).toBe("no-store");
  }

  // A GET of the counting URL counts nothing.
  const got = await request.get(api(slug));
  expect(got.status()).toBe(405);
  expect(got.headers()["allow"]).toBe("POST");
  expect(got.headers()["cache-control"]).toBe("no-store");

  // The list has the post at no less than what was just counted, and no junk row.
  const list = await request.get("/api/views");
  expect(list.status()).toBe(200);
  expect(list.headers()["cache-control"]).toBe("no-store");
  expect(list.headers()["content-type"]).toContain("application/json");
  const all = ((await list.json()) as { views: Record<string, number> }).views;
  expect(all[slug]).toBeGreaterThan(views);
  for (const key of Object.keys(all)) expect(postSlugs).toContain(key);
});

// Not the fixtures' `test`: the browser logs the 503 as a console error, which is the one
// thing a visitor's console may show here. Page errors still fail the test.
plain("a database failure leaves the post intact, without a count", async ({ page, request }) => {
  // BROKEN_ORIGIN is the same build on a D1 with no tables: every query throws.
  for (const response of [
    await request.post(`${BROKEN_ORIGIN}${api(slug)}`),
    await request.get(`${BROKEN_ORIGIN}/api/views`),
  ]) {
    expect(response.status(), response.url()).toBe(503);
    expect(response.headers()["cache-control"], response.url()).toBe("no-store");
    expect(await response.text(), response.url()).not.toMatch(/SQLITE|no such table|D1_ERROR/i);
  }

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  const [failed, loaded] = await Promise.all([
    page.waitForResponse(isCount),
    page.goto(`${BROKEN_ORIGIN}/writing/${slug}`),
  ]);
  expect(loaded?.status()).toBe(200);
  expect(failed.status()).toBe(503);
  // The request has ended, and React has had two frames to draw whatever it would draw.
  await failed.finished();
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );

  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".post-meta time")).toBeVisible();
  expect((await page.locator(".post-body").innerText()).length).toBeGreaterThan(200);
  // No number, no icon, no message: the reserved box stays empty.
  const count = page.locator(".post-meta .views");
  await expect(count).toBeEmpty();
  await expect(count.locator("svg")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

plain("a database failure leaves the writing index intact, without counts", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  const [failed, loaded] = await Promise.all([
    page.waitForResponse(isList),
    page.goto(`${BROKEN_ORIGIN}/writing`),
  ]);
  expect(loaded?.status()).toBe(200);
  expect(failed.status()).toBe(503);
  await failed.finished();
  await drawn(page);

  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".wlist li")).toHaveCount(postSlugs.length);
  for (const post of postSlugs) {
    await expect(row(page, post).locator("time")).toBeVisible();
    await expect(row(page, post).locator("a")).toBeVisible();
    // The reserved box stays empty: no number, no icon, no message.
    await expect(row(page, post).locator(".views")).toBeEmpty();
  }
  await expect(page.locator(".wlist .views svg")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

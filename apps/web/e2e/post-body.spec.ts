import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, postSlugs, test } from "./fixtures";

// A post's body reaches the browser once (src/lib/content.ts). Opened by its URL, it is in
// the prerendered HTML and nowhere else: not a second time as loader data, not as a script.
// Arrived at by a link, it is that post's own chunk. Runs in the "chromium" and "webkit"
// projects; every test also fails on a console error (fixtures.ts), which is how a hydration
// mismatch shows.

// One plain sentence from each post's body, as scripts/perf-budget.mjs picks it: no markdown,
// quotes or entities, so it reads the same in the source, in HTML and in a JavaScript string.
// Here it must also be in the body only once.
const posts = postSlugs.map((slug) => {
  const raw = readFileSync(new URL(`../content/writing/${slug}.md`, import.meta.url), "utf8");
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const frontmatter = raw.slice(0, raw.length - body.length);
  const probe = body
    .split("\n")
    .map((line) => line.match(/[A-Za-z][A-Za-z ,]{48,}/)?.[0])
    .find(
      (sentence) =>
        sentence && !frontmatter.includes(sentence) && body.split(sentence).length === 2,
    );
  if (!probe) throw new Error(`${slug}: no plain sentence to look for`);
  return { slug, length: body.length, probe };
});
const longest = posts.reduce((a, b) => (b.length > a.length ? b : a));
const bySlug = (slug: string) => posts.find((post) => post.slug === slug)!;

const PROSE = ".post-body > .prose";
type Marked = { sent?: Element; changes?: number };

/** The slug of every post whose body is in a script the page fetches from now on, in order. */
function bodyChunks(page: Page): () => Promise<string[]> {
  const pending: Promise<string[]>[] = [];
  page.on("response", (response) => {
    if (!new URL(response.url()).pathname.endsWith(".js")) return;
    pending.push(
      response.text().then(
        (text) => posts.filter((post) => text.includes(post.probe)).map((post) => post.slug),
        () => [],
      ),
    );
  });
  return async () => (await Promise.all(pending)).flat();
}

/** The path of every document the tab asks for: an in-app navigation adds none. */
function documents(page: Page): string[] {
  const paths: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      paths.push(new URL(request.url()).pathname);
  });
  return paths;
}

/** React has attached to the element: until then a link is a plain link. */
const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((target) => {
    const element = document.querySelector(target);
    return Boolean(element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")));
  }, selector);

/** The post page's reading time (vite-plugin-posts.ts), counted here from the body shown. */
async function expectReadingTime(page: Page) {
  const html = await page.locator(PROSE).innerHTML();
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 230));
  await expect(page.locator(".post-meta")).toContainText(`${minutes} min read`);
}

/** The first of the newer and older links under a post, and the post it leads to. */
async function nextPost(page: Page) {
  const link = page.locator(".post-nav a").first();
  const slug = (await link.getAttribute("href"))!.replace("/writing/", "");
  expect(postSlugs).toContain(slug);
  return { link, post: bySlug(slug) };
}

test("a post's document carries its body once, as HTML", async ({ request }) => {
  for (const post of posts) {
    const html = await (await request.get(`/writing/${post.slug}`)).text();
    expect(html.split(post.probe).length - 1, `${post.slug}: copies of the body`).toBe(1);
    // In the article, so a reader without JavaScript has it.
    const at = html.indexOf(post.probe);
    expect(at, post.slug).toBeGreaterThan(html.indexOf('<div class="prose col push post">'));
    expect(at, post.slug).toBeLessThan(html.indexOf("</article>"));
  }
});

test("a post opened by its URL hydrates around the body the server sent", async ({ page }) => {
  const fetched = bodyChunks(page);
  // No script runs until the server's element has been marked and is being watched.
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/assets\/[^/]+\.js$/, async (route) => {
    await released;
    await route.continue().catch(() => {});
  });

  await page.goto(`/writing/${longest.slug}`, { waitUntil: "commit" });
  await page.waitForFunction(() => document.readyState !== "loading");
  const sent = await page.evaluate((selector) => {
    const prose = document.querySelector(selector)!;
    const marked = window as unknown as Marked;
    marked.sent = prose;
    marked.changes = 0;
    new MutationObserver((records) => (marked.changes! += records.length)).observe(
      prose.parentElement!,
      { subtree: true, childList: true, attributes: true, characterData: true },
    );
    return {
      html: prose.innerHTML,
      hydrated: Object.keys(prose).some((key) => key.startsWith("__reactFiber$")),
    };
  }, PROSE);
  expect(sent.hydrated).toBe(false);
  expect(sent.html).toContain(longest.probe);

  release();
  await hydrated(page, PROSE);
  // Recoverable errors are reported after the commit.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => setTimeout(done, 50))),
  );
  const after = await page.evaluate((selector) => {
    const prose = document.querySelector(selector)!;
    const marked = window as unknown as Marked;
    return { same: prose === marked.sent, html: prose.innerHTML, changes: marked.changes };
  }, PROSE);
  // The same element with the same content, never emptied or drawn again.
  expect(after.same).toBe(true);
  expect(after.changes).toBe(0);
  expect(after.html).toBe(sent.html);
  await expectReadingTime(page);

  await page.waitForLoadState("networkidle");
  expect(await fetched()).toEqual([]);
});

test("a link to a post fetches that post's body and no other, and going back fetches nothing", async ({
  page,
}) => {
  const requested = documents(page);
  const fetched = bodyChunks(page);
  await page.goto("/writing");
  await hydrated(page, "#main");

  await page.locator(`.wlist a[href="/writing/${longest.slug}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/writing/${longest.slug}$`));
  await expect(page.locator(PROSE)).toContainText(longest.probe);
  await expectReadingTime(page);
  await page.waitForLoadState("networkidle");
  expect(await fetched()).toEqual([longest.slug]);

  const { link, post: next } = await nextPost(page);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/writing/${next.slug}$`));
  await expect(page.locator(PROSE)).toContainText(next.probe);
  await expect(page.locator(PROSE)).not.toContainText(longest.probe);
  await expectReadingTime(page);
  await page.waitForLoadState("networkidle");
  expect(await fetched()).toEqual([longest.slug, next.slug]);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/writing/${longest.slug}$`));
  await expect(page.locator(PROSE)).toContainText(longest.probe);
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/writing/${next.slug}$`));
  await expect(page.locator(PROSE)).toContainText(next.probe);
  await page.waitForLoadState("networkidle");
  expect(await fetched()).toEqual([longest.slug, next.slug]);
  expect(requested).toEqual(["/writing"]);
});

// The post the tab opened with never had a chunk: its body was read from the document, and
// has to be there again when the reader comes back to it.
test("back to the post the tab opened with shows its body again, without a request", async ({
  page,
}) => {
  const requested = documents(page);
  const fetched = bodyChunks(page);
  await page.goto(`/writing/${longest.slug}`);
  await hydrated(page, PROSE);
  const sent = await page.locator(PROSE).innerHTML();

  const { link, post: next } = await nextPost(page);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/writing/${next.slug}$`));
  await expect(page.locator(PROSE)).toContainText(next.probe);
  await expect(page.locator(PROSE)).not.toContainText(longest.probe);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/writing/${longest.slug}$`));
  await expect(page.locator(PROSE)).toContainText(longest.probe);
  expect(await page.locator(PROSE).innerHTML()).toBe(sent);
  await expectReadingTime(page);

  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/writing/${next.slug}$`));
  await expect(page.locator(PROSE)).toContainText(next.probe);
  await page.waitForLoadState("networkidle");
  expect(await fetched()).toEqual([next.slug]);
  expect(requested).toEqual([`/writing/${longest.slug}`]);
});

import type { Page } from "@playwright/test";
import { expect, postSlugs, test } from "./fixtures";

// The posts and /now are typed with straight quotes and shown with typographic ones
// (src/lib/quotes.ts, applied when the site is built: vite-plugin-posts.ts). The rules and
// every body's text are covered by the unit tests; here it is what the built site serves.

const POST = "/writing/lincoln-six-months-later";
const TITLE =
  "Lincoln, Six Months Later: What Held, What\u00a0Didn’t, and a Model Named After a Paradox";
/** As the file has it but for its no-break space, which keeps "What Didn't" on one line. */
const TYPED = TITLE.replace("’", "'").replace("\u00a0", " ");
/** A straight quote that is not a prime after a digit. */
const STRAIGHT = /(?<!\d)['"]/;

/** The text a reader is shown in the column, and the text of its code, apart. */
const column = (page: Page) =>
  page.evaluate(() => {
    const body = document.querySelector(".post-body > .prose")!;
    let prose = "";
    let code = "";
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement!.closest("code, pre, kbd, samp")) code += node.nodeValue;
      else prose += `${node.nodeValue}\n`;
    }
    const header = document.querySelector("main article header")!;
    return {
      prose,
      code,
      h1: header.querySelector("h1")!.textContent!,
      lede: header.querySelector(".lede")?.textContent ?? "",
      ids: [...body.querySelectorAll("h2, h3")].map((heading) => heading.id),
    };
  });

test("every post is set with typographic quotes, and its code is as typed", async ({ page }) => {
  let quotedCode = 0;
  for (const slug of postSlugs) {
    await page.goto(`/writing/${slug}`);
    const shown = await column(page);
    expect(shown.h1, slug).not.toMatch(STRAIGHT);
    expect(shown.lede, slug).not.toMatch(STRAIGHT);
    expect(shown.prose.match(new RegExp(`.{0,30}${STRAIGHT.source}.{0,30}`, "s")), slug).toBeNull();
    expect(shown.code, slug).not.toMatch(/[‘’“”]/);
    for (const id of shown.ids) expect(id, slug).toMatch(/^[\p{Ll}\p{N}]+(-[\p{Ll}\p{N}]+)*$/u);
    if (/['"]/.test(shown.code)) quotedCode += 1;
  }
  expect(quotedCode).toBeGreaterThan(2);
});

test("a post's title is the same text on its page, in its tags, lists and the feed", async ({
  page,
  request,
}) => {
  await page.goto(POST);
  const shown = await column(page);
  expect(shown.h1).toBe(TITLE);
  expect(shown.lede).toContain("TypeSafe’s new Jev model");
  expect(shown.prose).toContain("“impossible in Python”");
  // The anchors a link may already point at: apostrophes were never part of an id.
  expect(shown.ids).toContain("what-held");
  await expect(page).toHaveTitle(`${TITLE} · Ryan Yogan`);
  const content = (selector: string) => page.locator(selector).getAttribute("content");
  expect(await content('meta[property="og:title"]')).toBe(TITLE);
  expect(await content('meta[name="description"]')).toContain("TypeSafe’s");
  expect(await content('meta[property="og:image:alt"]')).toContain("What\u00a0Didn’t");
  const graph = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').first().textContent())!,
  ) as { "@graph": { "@type": string; headline?: string }[] };
  expect(graph["@graph"].find((node) => node["@type"] === "BlogPosting")?.headline).toBe(TITLE);

  await page.goto("/writing");
  await expect(page.locator(`main a[href="${POST}"]`).first()).toContainText(TITLE);

  const feed = await (await request.get("/rss.xml")).text();
  expect(feed).toContain(`<title>${TITLE}</title>`);
  expect(feed).toContain("“impossible in Python”");
  expect(feed).not.toContain(TYPED);

  // Plain text for a program: the quotes are the keyboard's.
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain(`[${TYPED}]`);
  expect(llms).not.toMatch(/[‘’“”]/);
});

test("the palette finds a title by the quotes a keyboard types, and by its own", async ({
  page,
}) => {
  await page.goto("/");
  const palette = page.getByRole("dialog", { name: "Search the site" });
  // The key handler is attached on hydration.
  await expect(async () => {
    if (!(await palette.isVisible())) await page.keyboard.press("/");
    await expect(palette).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  const input = palette.getByRole("combobox");
  for (const query of ["what didn't", "what didn’t", "Kid's"]) {
    await input.fill(query);
    await expect(palette.getByRole("option").first(), query).toContainText("’");
  }
  await input.fill("what didn't");
  await expect(palette.getByRole("option").first()).toHaveText(
    new RegExp(TITLE.replace("\u00a0", "\\s")),
  );
});

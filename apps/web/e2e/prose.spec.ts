import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { renderMarkdown } from "../src/lib/markdown";
import { expect, postSlugs, publicRoutes, test } from "./fixtures";
import { inFallbackFaces, inWebFaces } from "./fonts";

// Rendered markdown as the reader gets it: the measure of the reading column, and every
// element the renderer can emit, checked in both themes at a desktop and a phone width.
//
// No post holds every element, so the second half renders e2e/kitchen-sink.md with the site's
// own renderer (lib/markdown.ts, the code the build and the Worker run) and puts the result
// into the reading column of a real post page: the stylesheet, fonts and layout are the
// built site's. Runs in the "chromium" project only.

const WRITING_DIR = fileURLToPath(new URL("../content/writing", import.meta.url));
const longestPost = readdirSync(WRITING_DIR)
  .filter((name) => name.endsWith(".md"))
  .map((name) => ({ name, size: statSync(`${WRITING_DIR}/${name}`).size }))
  .sort((a, b) => b.size - a.size)[0]!
  .name.replace(/\.md$/, "");
const POST = `/writing/${longestPost}`;

const KITCHEN_SINK = renderMarkdown(
  readFileSync(fileURLToPath(new URL("./kitchen-sink.md", import.meta.url)), "utf8"),
);

const WIDTHS = [320, 360, 390, 430, 712, 768, 1024, 1280, 1920];

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** The reading column as it is drawn now: its box, its type size and how much text it holds. */
const column = (page: Page) =>
  page.evaluate(() => {
    const prose = document.querySelector<HTMLElement>(".prose")!;
    const first = prose.querySelector<HTMLElement>(":scope > p")!;
    // The measure as the spec defines it: the column's width over the width of a "0" in the
    // column's own font (a hidden 1ch probe).
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;width:1ch;height:1px";
    prose.appendChild(probe);
    const ch = probe.getBoundingClientRect().width;
    probe.remove();
    // The start of the post's running text on one line, in the column's font: how wide real
    // text is set.
    const line = document.createElement("span");
    line.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    line.textContent = [...prose.querySelectorAll(":scope > p")]
      .map((p) => p.textContent)
      .join(" ")
      .slice(0, 600);
    prose.appendChild(line);
    const text = line.getBoundingClientRect().width;
    line.remove();
    const rect = prose.getBoundingClientRect();
    return {
      width: rect.width,
      characters: rect.width / ch,
      ch,
      text,
      left: rect.left,
      right: document.documentElement.clientWidth - rect.right,
      size: Number.parseFloat(getComputedStyle(prose).fontSize),
      paragraph: first.getBoundingClientRect().width / rect.width,
    };
  });

// The rule is about the page as designed, in Source Serif 4, and a "character" is that face's
// "0". The romans are `optional`, so a reader whose fonts miss the first paint reads the post
// in the fallback face (styles/fonts.css), and on a busy machine so does a test: the page is
// therefore opened in each face on purpose (e2e/fonts.ts), and each is held to what it owes.
//
// In the fallback face the "0" is the wrong ruler. That face is scaled so that running text is
// as wide as in the web font, which leaves its figures wider: on the CI runner Liberation
// Serif's "0" is 11px where Source Serif 4's is 10px, and the same 280px column at 320px then
// counts 25.5 of them, not 28.0. (This test read whichever face the load happened to get, and
// so failed now and then.) So in the fallback face:
// - the column must be the same box at the same type size, at every width, which on a phone
//   is the rule itself (the whole screen between the gutters, at 17px or more);
// - its measure is the web face's, corrected by how much wider or narrower the fallback sets
//   the post's own text, and above a phone that is held to 45 to 75 as well. On a phone the
//   count of 26 is the web face's to hold: the column cannot be made any wider there.
test("the reading column of a post is 45 to 75 characters wide, and as wide as a phone allows", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const report: string[] = [];
  const measured: string[] = [];
  const rule = (
    face: string,
    width: number,
    characters: number,
    drawn: Awaited<ReturnType<typeof column>>,
  ) => {
    const at = `${width} ${face}`;
    const measure = characters.toFixed(1);
    if (characters > 75) report.push(`${at}: ${measure} characters, over 75`);
    if (width > 640) {
      if (characters < 45) report.push(`${at}: ${measure} characters, under 45`);
    } else {
      // A phone cannot hold 45 characters at a readable size (320px is 28 at 18px).
      // There the column takes the whole screen between the page gutters, at 17px or more.
      if (face === "web" && characters < 26) {
        report.push(`${at}: ${measure} characters, under 26`);
      }
      if (drawn.left > 33 || drawn.right > 33) {
        report.push(`${at}: column inset ${drawn.left} and ${drawn.right}px`);
      }
    }
    if (drawn.size < 17) report.push(`${at}: ${drawn.size}px text`);
    if (drawn.paragraph < 0.99) report.push(`${at}: paragraphs narrower than the column`);
  };

  const web = new Map<number, Awaited<ReturnType<typeof column>>>();
  let loads = 0;
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    loads += await inWebFaces(page, POST);
    const drawn = await column(page);
    web.set(width, drawn);
    rule("web", width, drawn.characters, drawn);
  }

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await inFallbackFaces(page, POST);
    const drawn = await column(page);
    const designed = web.get(width)!;
    // The same column: its width and type size are not set by the face.
    if (Math.abs(drawn.width - designed.width) > 0.5 || drawn.size !== designed.size) {
      report.push(
        `${width} fallback: column ${drawn.width}px at ${drawn.size}px, in the web face ${designed.width}px at ${designed.size}px`,
      );
    }
    // The same words take `text` px on one line in each face; the column holds that much
    // more or less of them.
    const set = drawn.text / designed.text;
    rule("fallback", width, designed.characters / set, drawn);
    measured.push(
      `${width}: ${drawn.width}px at ${drawn.size}px; web ${designed.characters.toFixed(1)} ("0" ${designed.ch.toFixed(2)}px), fallback ${(designed.characters / set).toFixed(1)} (text ${set.toFixed(4)} as wide; by its own "0", ${drawn.ch.toFixed(2)}px, ${drawn.characters.toFixed(1)})`,
    );
  }
  test.info().annotations.push({
    type: "measure",
    description: `characters in the column, ${loads} loads for ${WIDTHS.length} widths in the web face. ${measured.join("; ")}`,
  });
  expect(report).toEqual([]);
});

test("a section of a post can be linked to by its heading", async ({ page }) => {
  await ready(page, POST);
  const ids = await page
    .locator(".prose :is(h2, h3)")
    .evaluateAll((headings) => headings.map((heading) => heading.id));
  expect(ids.length).toBeGreaterThan(3);
  for (const id of ids) expect(id).toMatch(/^[\p{Ll}\p{N}]+(-[\p{Ll}\p{N}]+)*$/u);

  // Arriving at the link shows that section, clear of the top edge.
  const id = ids.at(-2)!;
  await ready(page, `${POST}#${id}`);
  const heading = page.locator(`[id="${id}"]`);
  await expect(heading).toBeInViewport();
  expect(
    await heading.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).scrollMarginTop),
    ),
  ).toBeGreaterThan(0);
});

test("no page uses an id twice", async ({ request }) => {
  for (const route of publicRoutes) {
    const html = (await (await request.get(route)).text()).replace(
      /<script[\s\S]*?<\/script>/g,
      "",
    );
    const ids = [...html.matchAll(/\sid="([^"]*)"/g)].map((match) => match[1]);
    const twice = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(twice, route).toEqual([]);
  }
});

/** A post page whose reading column holds the kitchen-sink fixture. */
async function kitchenSink(page: Page, width: number, theme: "light" | "dark") {
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/writing/${postSlugs[0]}`);
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
  // After hydration, so React has already taken over the column it rendered.
  await page.waitForLoadState("networkidle");
  await page.evaluate((html) => {
    document.querySelector(".prose")!.innerHTML = html;
  }, KITCHEN_SINK);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Everything the assertions below need, read from the page in one pass. */
function measure(page: Page) {
  return page.evaluate(() => {
    const prose = document.querySelector<HTMLElement>(".prose")!;
    const css = (element: Element) => getComputedStyle(element);
    const px = (value: string) => Number.parseFloat(value);
    const one = (selector: string) => prose.querySelector<HTMLElement>(selector)!;
    const all = (selector: string) => [...prose.querySelectorAll<HTMLElement>(selector)];
    const box = (element: Element) => element.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const body = px(css(prose).fontSize);

    const outside: string[] = [];
    for (const element of document.querySelectorAll("body *")) {
      if (element.closest("pre, div[tabindex]:has(> table)")) continue;
      const rect = box(element);
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (rect.right > vw + 1 || rect.left < -1) outside.push(element.tagName);
    }

    const p = one(":scope > p");
    const pre = one(":scope > pre");
    const code = one(":scope > pre > code");
    const inline = one(":scope > p > code");
    const quote = one("blockquote");
    const table = one("table");
    const figure = one("figure");
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);

    return {
      vw,
      body,
      outside,
      pageWidth: document.documentElement.scrollWidth,
      column: { left: box(prose).left, right: box(prose).right, width: box(prose).width },
      p: {
        left: box(p).left,
        gap: px(css(p).marginBottom) / body,
        indent: px(css(p).textIndent),
        align: css(p).textAlign,
        hyphens: css(p).hyphens,
      },
      list: {
        ul: css(one("ul")).listStyleType,
        ol: css(one("ol")).listStyleType,
        display: css(one("li")).display,
        indent: px(css(one("ul")).paddingLeft) / body,
        gap: px(css(one("li + li")).marginTop) / body,
      },
      quote: {
        size: px(css(quote).fontSize) / body,
        rule: px(css(quote).borderLeftWidth),
        style: css(quote).borderLeftStyle,
      },
      inline: {
        size: px(css(inline).fontSize) / body,
        border: px(css(inline).borderTopWidth),
        background: css(inline).backgroundColor,
        wrap: css(inline).overflowWrap,
      },
      pre: {
        left: box(pre).left,
        right: box(pre).right,
        text: box(code).left + px(css(code).paddingLeft),
        size: px(css(pre).fontSize),
        leading: px(css(pre).lineHeight) / px(css(pre).fontSize),
        padding: px(css(code).paddingTop) / px(css(pre).fontSize),
        tab: css(pre).tabSize,
        overflow: css(pre).overflowX,
        space: css(code).whiteSpace,
        hyphens: css(pre).hyphens,
        focusable: pre.tabIndex,
        scrolls: pre.scrollWidth > pre.clientWidth,
        background: css(pre).backgroundColor,
        colours: [...new Set(all("pre span").map((span) => css(span).color))],
      },
      table: {
        scroller: css(table.parentElement!).overflowX,
        numerals: css(table).fontVariantNumeric,
        size: px(css(table).fontSize),
        headWeight: css(one("th")).fontWeight,
        headCase: css(one("th")).textTransform,
        right: all('[data-align="right"]').map((cell) => css(cell).textAlign),
        rest: all("td:not([data-align])").map((cell) => css(cell).textAlign),
        columns: all("thead th").map((cell) => cell.dataset.align ?? ""),
        sideRules: px(css(one("td")).borderLeftWidth) + px(css(one("td")).borderRightWidth),
      },
      figure: {
        parent: figure.parentElement!.tagName,
        caption: one("figcaption").textContent,
        captionSize: px(css(one("figcaption")).fontSize),
        alt: one("figure img").getAttribute("alt"),
        width: box(one("figure img")).width,
      },
      headings: all("h2, h3").map((heading) => ({
        id: heading.id,
        margin: px(css(heading).scrollMarginTop),
        hyphens: css(heading).hyphens,
      })),
      twice: ids.filter((id, index) => ids.indexOf(id) !== index),
    };
  });
}

const CODE_BACKGROUND = { light: "rgb(238, 237, 232)", dark: "rgb(37, 40, 42)" };

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test(`kitchen sink at ${width}px, ${theme}: every prose element is set as the spec asks`, async ({
      page,
    }) => {
      await kitchenSink(page, width, theme);
      const m = await measure(page);

      // Nothing leaves the page; a code block and a table scroll inside their own box.
      expect(m.pageWidth).toBeLessThanOrEqual(m.vw);
      expect(m.outside).toEqual([]);
      expect(m.twice).toEqual([]);

      // Paragraphs: one line of space, no indent, ragged right, hyphens on the narrowest phones only.
      expect(m.p.gap).toBeGreaterThanOrEqual(0.9);
      expect(m.p.gap).toBeLessThanOrEqual(1.1);
      expect(m.p.indent).toBe(0);
      expect(["left", "start"]).toContain(m.p.align);
      expect(m.p.hyphens).toBe(width <= 360 ? "auto" : "manual");

      // Lists keep their markers and their semantics.
      expect(m.list.ul).toBe("disc");
      expect(m.list.ol).toBe("decimal");
      expect(m.list.display).toBe("list-item");
      expect(m.list.indent).toBeGreaterThanOrEqual(1.1);
      expect(m.list.indent).toBeLessThanOrEqual(1.4);
      expect(m.list.gap).toBeCloseTo(0.35, 1);

      // A quotation is body text beside a thin rule, not a pull quote.
      expect(m.quote.size).toBeCloseTo(1, 2);
      expect(m.quote.style).toBe("solid");
      expect(m.quote.rule).toBeGreaterThanOrEqual(1);
      expect(m.quote.rule).toBeLessThanOrEqual(2);

      // Inline code: a little smaller, a faint tone, no border, and it may break anywhere.
      expect(m.inline.size).toBeGreaterThanOrEqual(0.8);
      expect(m.inline.size).toBeLessThanOrEqual(0.95);
      expect(m.inline.border).toBe(0);
      expect(m.inline.background).toBe(CODE_BACKGROUND[theme]);
      expect(m.inline.wrap).toBe("anywhere");

      // Code blocks: 14 to 15px, never wrapped, scrolled sideways, in the theme's own tone
      // with at most six colours.
      expect(m.pre.size).toBeGreaterThanOrEqual(14);
      expect(m.pre.size).toBeLessThanOrEqual(15);
      expect(m.pre.leading).toBeGreaterThanOrEqual(1.5);
      expect(m.pre.leading).toBeLessThanOrEqual(1.6);
      expect(m.pre.padding).toBeGreaterThanOrEqual(1);
      expect(m.pre.padding).toBeLessThanOrEqual(1.25);
      expect(m.pre.tab).toBe("2");
      expect(m.pre.overflow).toBe("auto");
      expect(m.pre.space).toBe("pre");
      expect(m.pre.hyphens).toBe("none");
      expect(m.pre.focusable).toBe(0);
      expect(m.pre.scrolls).toBe(true);
      expect(m.pre.background).toBe(CODE_BACKGROUND[theme]);
      expect(m.pre.colours.length).toBeGreaterThanOrEqual(2);
      expect(m.pre.colours.length).toBeLessThanOrEqual(6);
      if (width <= 640) {
        // Full bleed: the block runs edge to edge and its text keeps the column's left edge.
        expect(m.pre.left).toBeCloseTo(0, 0);
        expect(m.pre.right).toBeCloseTo(m.vw, 0);
        expect(m.pre.text).toBeCloseTo(m.p.left, 0);
      } else {
        expect(m.pre.left).toBeCloseTo(m.column.left, 0);
        expect(m.pre.right).toBeLessThanOrEqual(m.column.right + 0.5);
      }

      // Tables: figures line up on the right in tabular numerals; plain header; row rules only.
      expect(m.table.scroller).toBe("auto");
      expect(m.table.numerals).toContain("tabular-nums");
      expect(m.table.size).toBeGreaterThanOrEqual(15);
      expect(m.table.size).toBeLessThanOrEqual(16);
      expect(m.table.headWeight).toBe("600");
      expect(m.table.headCase).toBe("none");
      expect(m.table.columns).toEqual(["", "right", "right", "right", "left"]);
      expect(m.table.right).toHaveLength(12);
      expect(new Set(m.table.right)).toEqual(new Set(["right"]));
      expect(new Set(m.table.rest)).toEqual(new Set(["left"]));
      expect(m.table.sideRules).toBe(0);

      // The figure fills the column; its caption is the image's title, not its alt.
      expect(m.figure.parent).toBe("DIV");
      expect(m.figure.caption).toBe("The memory graph after six attempts.");
      expect(m.figure.alt).toBe("A drawing of a brain made of nodes and edges");
      expect(m.figure.captionSize).toBeGreaterThanOrEqual(14);
      expect(m.figure.captionSize).toBeLessThanOrEqual(15);
      expect(m.figure.width).toBeCloseTo(m.column.width, 0);

      // Headings: an id each (a repeat and the page's own "main" are stepped aside), a
      // margin for the jump, and never hyphenated.
      expect(m.headings.map((heading) => heading.id)).toEqual([
        "lists",
        "a-quotation",
        "setup",
        "setup-1",
        "main-1",
        "code",
        "a-table",
        "a-figure",
      ]);
      for (const heading of m.headings) {
        expect(heading.margin).toBeGreaterThan(0);
        expect(heading.hyphens).toBe("none");
      }

      // Contrast of the text and of every code colour on this theme's tones, and the rest
      // of axe, over the column.
      const { violations } = await new AxeBuilder({ page }).include(".prose").analyze();
      expect(
        violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
      ).toEqual([]);
    });
  }
}

test("kitchen sink: a footnote links to its note and back, and the notes are set small", async ({
  page,
}) => {
  await kitchenSink(page, 1280, "light");
  const mark = page.locator(".prose sup a");
  const notes = page.getByRole("region", { name: "Footnotes" });
  const note = notes.locator("li");
  await expect(mark).toHaveAccessibleName("Footnote 1");
  await expect(note).toContainText("The note itself");

  await mark.click();
  await expect(page).toHaveURL(/#fn_cost$/);
  expect(await note.evaluate((li) => li.matches(":target"))).toBe(true);
  await note.getByRole("link", { name: "Back to reference 1" }).click();
  await expect(page).toHaveURL(/#fnref_cost$/);
  expect(await mark.evaluate((a) => a.matches(":target"))).toBe(true);

  const set = await notes.evaluate((section) => {
    const style = getComputedStyle(section);
    return {
      rule: style.borderTopWidth,
      smaller:
        parseFloat(style.fontSize) < parseFloat(getComputedStyle(section.parentElement!).fontSize),
      back: section.querySelector("li a")!.textContent,
    };
  });
  expect(set).toEqual({ rule: "1px", smaller: true, back: "Back" });
});

test("kitchen sink: a link to a heading scrolls it to the top with room above", async ({
  page,
}) => {
  await kitchenSink(page, 1280, "light");
  await page.evaluate(() => document.getElementById("setup-1")!.scrollIntoView());
  // scroll-margin-top keeps the heading off the very edge of the window.
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.round(document.getElementById("setup-1")!.getBoundingClientRect().top),
      ),
    )
    .toBe(24);
});

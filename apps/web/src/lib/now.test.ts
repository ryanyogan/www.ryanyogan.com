import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter";
import { renderMarkdown } from "./markdown";
import { splitNow } from "./now";

const source = readFileSync(
  fileURLToPath(new URL("../../content/now.md", import.meta.url)),
  "utf8",
);
const html = renderMarkdown(parseFrontmatter(source).content, undefined, { typographic: true });
const body = splitNow(html);

describe("splitNow", () => {
  it("cuts content/now.md into one section per heading, and loses nothing", () => {
    expect(body.sections.length).toBe(source.match(/^## /gm)!.length);
    expect(body.sections.length).toBeGreaterThan(3);
    const again =
      body.lede + body.sections.map((s) => `<h2 id="${s.id}">${s.title}</h2>${s.html}`).join("");
    expect(again.replace(/\s+/g, "")).toBe(html.replace(/\s+/g, ""));
  });

  it("gives every section an id of its own, a title and a body with no heading left in it", () => {
    const ids = body.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of body.sections) {
      expect(section.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(section.title).not.toBe("");
      expect(section.html).toMatch(/^<(p|ul)>/);
      expect(section.html).not.toMatch(/<h[1-6]/);
    }
  });

  it("has a paragraph before the first heading, for under the title", () => {
    expect(body.lede).toMatch(/^<p>[\s\S]+<\/p>$/);
    expect(body.lede).not.toMatch(/<h[1-6]/);
  });

  it("keeps a body with no headings whole", () => {
    expect(splitNow("<p>One.</p>")).toEqual({ lede: "<p>One.</p>", sections: [] });
  });
});

import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";

const xml = buildSitemap({
  posts: [
    { slug: "newer", isoDate: "2026-09-10" },
    { slug: "older", isoDate: "2025-01-02" },
  ],
  projects: [
    { slug: "alpha", updatedAt: "2026-10-01T12:30:45.123Z" },
    { slug: "beta", updatedAt: "not a date" },
  ],
});

const entry = (path: string) =>
  new RegExp(
    `<loc>https://ryanyogan\\.com${path}</loc>(?:\\s*<lastmod>([^<]+)</lastmod>)?\\s*</url>`,
  ).exec(xml);

describe("buildSitemap", () => {
  it("lists every public URL in the bare form", () => {
    for (const path of [
      "/",
      "/work",
      "/projects",
      "/writing",
      "/projects/alpha",
      "/writing/older",
    ]) {
      expect(entry(path), path).not.toBeNull();
    }
    expect(xml.match(/<loc>/g)).toHaveLength(8);
    expect(xml).not.toMatch(/<loc>[^<]+[^m]\/<\/loc>/);
    expect(xml).not.toContain("/admin");
  });

  it("dates entries from content, never from the clock", () => {
    expect(entry("/projects/alpha")?.[1]).toBe("2026-10-01T12:30:45Z");
    expect(entry("/writing/older")?.[1]).toBe("2025-01-02T00:00:00Z");
    expect(entry("/writing")?.[1]).toBe("2026-09-10T00:00:00Z");
    expect(entry("/projects")?.[1]).toBe("2026-10-01T12:30:45Z");
    expect(entry("/")?.[1]).toBe("2026-10-01T12:30:45Z");
    expect(entry("/work")?.[1]).toBeUndefined();
    expect(entry("/projects/beta")?.[1]).toBeUndefined();
  });

  it("has no lastmod at all when nothing is dated", () => {
    expect(buildSitemap({ posts: [], projects: [] })).not.toContain("lastmod");
  });
});

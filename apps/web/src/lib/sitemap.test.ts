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
  now: { isoDate: "2026-10-04" },
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
      "/now",
      "/projects",
      "/writing",
      "/projects/alpha",
      "/writing/older",
    ]) {
      expect(entry(path), path).not.toBeNull();
    }
    expect(xml.match(/<loc>/g)).toHaveLength(9);
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
    // /now is newer than everything else here and still does not date the home page.
    expect(entry("/now")?.[1]).toBe("2026-10-04T00:00:00Z");
    expect(entry("/projects/beta")?.[1]).toBeUndefined();
  });

  it("has no other lastmod when only /now is dated", () => {
    const bare = buildSitemap({ posts: [], projects: [], now: { isoDate: "2026-10-04" } });
    expect(bare.match(/<lastmod>/g)).toHaveLength(1);
  });
});

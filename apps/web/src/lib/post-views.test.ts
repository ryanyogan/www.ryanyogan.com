import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { countPostView, listPostViews } from "./db/post-views";
import { formatViews, isPostSlug, readViewCounts, readViews, viewsResponse } from "./post-views";

const MIGRATION = readFileSync(
  new URL("../../migrations/0003_post_views.sql", import.meta.url),
  "utf8",
);

/**
 * The part of D1 the helpers use, over an in-memory SQLite with the real migration applied:
 * the statements run as written, on the engine D1 is built on.
 */
function database(): { db: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(MIGRATION);
  const statement = (sql: string, args: string[]) => ({
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
  });
  const db = {
    prepare: (sql: string) => ({
      ...statement(sql, []),
      bind: (...args: string[]) => statement(sql, args),
    }),
  };
  return { db: db as unknown as D1Database, sqlite };
}

describe("isPostSlug", () => {
  const slugs = ["building-teams", "embedded-rust"];

  it("accepts a slug of a post", () => {
    expect(isPostSlug("building-teams", slugs)).toBe(true);
    expect(isPostSlug("embedded-rust", slugs)).toBe(true);
  });

  it("refuses everything else", () => {
    for (const slug of [
      "",
      "nope",
      "Building-Teams",
      "building-teams ",
      "building-teams/",
      "building",
      "../building-teams",
      "building-teams'; DROP TABLE post_views; --",
      undefined,
      null,
      7,
      ["building-teams"],
    ]) {
      expect(isPostSlug(slug, slugs), String(slug)).toBe(false);
    }
    expect(isPostSlug("building-teams", [])).toBe(false);
  });
});

describe("countPostView", () => {
  it("starts a post at 1 and adds one each time, keeping one row per slug", async () => {
    const { db, sqlite } = database();
    expect(await countPostView(db, "building-teams")).toBe(1);
    expect(await countPostView(db, "building-teams")).toBe(2);
    expect(await countPostView(db, "building-teams")).toBe(3);
    expect(await countPostView(db, "embedded-rust")).toBe(1);
    expect(sqlite.prepare("SELECT slug, views FROM post_views ORDER BY slug").all()).toEqual([
      { slug: "building-teams", views: 3 },
      { slug: "embedded-rust", views: 1 },
    ]);
  });

  it("counts every one of many simultaneous views", async () => {
    const { db } = database();
    const totals = await Promise.all(Array.from({ length: 50 }, () => countPostView(db, "a")));
    expect(totals.sort((x, y) => x - y)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("stamps the row with the time of the last view", async () => {
    const { db, sqlite } = database();
    sqlite.exec(
      "INSERT INTO post_views (slug, views, updated_at) VALUES ('a', 9, '2020-01-01T00:00:00.000Z')",
    );
    expect(await countPostView(db, "a")).toBe(10);
    const row = sqlite.prepare("SELECT updated_at FROM post_views WHERE slug = 'a'").get();
    expect(String(row?.updated_at)).toMatch(/^20[2-9]\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(String(row?.updated_at) > "2020-01-01").toBe(true);
  });

  it("passes the slug as a bound value, never as SQL", async () => {
    const { db, sqlite } = database();
    const slug = "x'); DROP TABLE post_views; --";
    expect(await countPostView(db, slug)).toBe(1);
    expect(sqlite.prepare("SELECT slug FROM post_views").all()).toEqual([{ slug }]);
  });

  it("lets a database failure reach the caller", async () => {
    const empty = { prepare: () => ({ bind: () => ({ first: async () => null }) }) };
    await expect(countPostView(empty as unknown as D1Database, "a")).rejects.toThrow();
    const sqlite = new DatabaseSync(":memory:");
    const broken = {
      prepare: (sql: string) => ({
        bind: (...args: string[]) => ({ first: async () => sqlite.prepare(sql).get(...args) }),
      }),
    };
    await expect(countPostView(broken as unknown as D1Database, "a")).rejects.toThrow(
      /no such table/,
    );
  });
});

describe("listPostViews", () => {
  it("is empty before any view, then every counted post by slug", async () => {
    const { db } = database();
    expect(await listPostViews(db)).toEqual({});
    await countPostView(db, "building-teams");
    await countPostView(db, "building-teams");
    await countPostView(db, "embedded-rust");
    expect(await listPostViews(db)).toEqual({ "building-teams": 2, "embedded-rust": 1 });
  });
});

describe("what the browser does with an answer", () => {
  it("formats a count with thousands separators", () => {
    expect(formatViews(0)).toBe("0");
    expect(formatViews(999)).toBe("999");
    expect(formatViews(1204)).toBe("1,204");
    expect(formatViews(1234567)).toBe("1,234,567");
  });

  it("reads a count, and nothing from any other answer", () => {
    expect(readViews({ views: 1204 })).toBe(1204);
    expect(readViews({ views: 0 })).toBe(0);
    for (const body of [
      undefined,
      null,
      "12",
      12,
      {},
      { views: "12" },
      { views: -1 },
      { views: 1.5 },
      { views: null },
      { error: "Not found." },
    ]) {
      expect(readViews(body), JSON.stringify(body)).toBeUndefined();
    }
  });

  it("reads the counts of a list, dropping what is not a count", () => {
    expect(readViewCounts({ views: { a: 3, b: 0, c: "7", d: -2, e: null } })).toEqual({
      a: 3,
      b: 0,
    });
    for (const body of [undefined, null, {}, { views: 4 }, { views: null }, { error: "x" }]) {
      expect(readViewCounts(body), JSON.stringify(body)).toEqual({});
    }
  });
});

describe("viewsResponse", () => {
  it("is JSON that nothing may cache, whatever the status", async () => {
    for (const status of [200, 404, 405, 503]) {
      const response = viewsResponse({ views: 3 }, status, { Allow: "POST" });
      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(response.headers.get("allow")).toBe("POST");
      expect(await response.json()).toEqual({ views: 3 });
    }
    expect(viewsResponse({}).status).toBe(200);
  });
});

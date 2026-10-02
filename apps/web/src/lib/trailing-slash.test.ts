import { describe, expect, it } from "vitest";
import { barePathFor, trailingSlashRedirect } from "./trailing-slash";

const ORIGIN = "https://ryanyogan.com";
const bare = (path: string) => barePathFor(new URL(`${ORIGIN}${path}`));

describe("barePathFor", () => {
  it("leaves the root and bare paths alone", () => {
    for (const path of ["/", "/work", "/projects/lincoln-project", "/rss.xml", "/a?b=/"]) {
      expect(bare(path), path).toBeNull();
    }
  });

  it("drops trailing slashes in one hop and keeps the query", () => {
    expect(bare("/work/")).toBe("/work");
    expect(bare("/projects/lincoln-project/")).toBe("/projects/lincoln-project");
    expect(bare("/projects///")).toBe("/projects");
    expect(bare("/projects/?utm_source=x&a=1")).toBe("/projects?utm_source=x&a=1");
  });

  it("never returns a protocol-relative location", () => {
    expect(bare("//evil.example/")).toBe("/evil.example");
    expect(bare("///evil.example//")).toBe("/evil.example");
    expect(bare("//")).toBe("/");
  });
});

describe("trailingSlashRedirect", () => {
  const request = (path: string, method = "GET") => new Request(`${ORIGIN}${path}`, { method });

  it("answers 308 with a relative Location", () => {
    const response = trailingSlashRedirect(request("/projects/"));
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("/projects");
    expect(trailingSlashRedirect(request("/writing/x/", "HEAD"))?.status).toBe(308);
  });

  it("ignores writes, bare paths and /admin", () => {
    expect(trailingSlashRedirect(request("/projects/", "POST"))).toBeNull();
    expect(trailingSlashRedirect(request("/projects"))).toBeNull();
    expect(trailingSlashRedirect(request("/admin/"))).toBeNull();
    expect(trailingSlashRedirect(request("/Admin/projects/new/"))).toBeNull();
  });
});

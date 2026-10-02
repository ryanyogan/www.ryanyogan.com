import { beforeEach, describe, expect, it } from "vitest";
import {
  cachedPublicRepos,
  CACHE_MS,
  clearRepoListCache,
  getRepo,
  getRepoDetail,
  GithubError,
  listPublicRepos,
  ownRepoName,
  readGithubConfig,
  README_MAX_CHARS,
} from "./github";
import {
  httpsHomepage,
  repoToDraft,
  slugFromRepoName,
  techFromRepo,
  titleFromRepoName,
} from "./github-import";
import { validateProjectInput } from "./validate";

// No test here touches the network: every call goes through a stubbed fetch.

const config = readGithubConfig({});

function apiRepo(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    full_name: `ryanyogan/${name}`,
    owner: { login: "ryanyogan" },
    private: false,
    visibility: "public",
    description: `About ${name}`,
    language: "TypeScript",
    stargazers_count: 3,
    pushed_at: "2026-01-02T03:04:05Z",
    homepage: "",
    fork: false,
    archived: false,
    topics: ["cli"],
    default_branch: "main",
    ...extra,
  };
}

type Route = (url: URL, init?: RequestInit) => Response;

function stubFetch(route: Route) {
  const calls: { url: URL; headers: Record<string, string> }[] = [];
  const fetchImpl = (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    return Promise.resolve(route(url, init));
  };
  return { fetchImpl, calls };
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

async function failure(promise: Promise<unknown>): Promise<GithubError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(GithubError);
    return error as GithubError;
  }
  throw new Error("expected a GithubError");
}

describe("readGithubConfig", () => {
  it("defaults to the public API, ryanyogan and no token", () => {
    expect(config).toEqual({ apiBase: "https://api.github.com", user: "ryanyogan", token: null });
  });

  it("accepts a loopback http base for the test stub and trims the slash", () => {
    expect(readGithubConfig({ GITHUB_API_BASE: "http://127.0.0.1:4175/" }).apiBase).toBe(
      "http://127.0.0.1:4175",
    );
  });

  it("refuses a plain-http remote base and a bad user name", () => {
    expect(() => readGithubConfig({ GITHUB_API_BASE: "http://example.com" })).toThrow(GithubError);
    expect(() => readGithubConfig({ GITHUB_USER: "a/b" })).toThrow(GithubError);
  });
});

describe("listPublicRepos", () => {
  it("follows the pagination and uses only the public-repos endpoint", async () => {
    const pages = [[apiRepo("one"), apiRepo("two")], [apiRepo("three")]];
    const { fetchImpl, calls } = stubFetch((url) => {
      const page = Number(url.searchParams.get("page"));
      const headers: Record<string, string> =
        page < pages.length ? { link: `<https://elsewhere.example/x?page=9>; rel="next"` } : {};
      return jsonResponse(pages[page - 1], { headers });
    });
    const repos = await listPublicRepos(config, fetchImpl);
    expect(repos.map((r) => r.name)).toEqual(["one", "two", "three"]);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.url.origin).toBe("https://api.github.com");
      expect(call.url.pathname).toBe("/users/ryanyogan/repos");
      expect(call.url.searchParams.get("type")).toBe("owner");
      expect(call.url.searchParams.get("per_page")).toBe("100");
      expect(call.headers["User-Agent"]).toBeTruthy();
      expect(call.headers.Authorization).toBeUndefined();
    }
  });

  it("sends the token when one is set", async () => {
    const { fetchImpl, calls } = stubFetch(() => jsonResponse([]));
    await listPublicRepos({ ...config, token: "test-token-not-real" }, fetchImpl);
    expect(calls[0].headers.Authorization).toBe("Bearer test-token-not-real");
  });

  it("keeps fork and archived flags and drops anything private or someone else's", async () => {
    const { fetchImpl } = stubFetch(() =>
      jsonResponse([
        apiRepo("plain"),
        apiRepo("a-fork", { fork: true }),
        apiRepo("old", { archived: true }),
        apiRepo("secret", { private: true, visibility: "private" }),
        apiRepo("internal", { visibility: "internal" }),
        apiRepo("no-flag", { private: undefined }),
        apiRepo("theirs", { owner: { login: "someone-else" } }),
      ]),
    );
    const repos = await listPublicRepos(config, fetchImpl);
    expect(repos.map((r) => r.name)).toEqual(["plain", "a-fork", "old"]);
    expect(repos.map((r) => [r.fork, r.archived])).toEqual([
      [false, false],
      [true, false],
      [false, true],
    ]);
    // The default view of the import page: no forks, no archived, described only.
    const defaults = repos.filter((r) => !r.fork && !r.archived && r.description !== null);
    expect(defaults.map((r) => r.name)).toEqual(["plain"]);
  });

  it("reports a rate limit with its reset time (403 and 429)", async () => {
    const reset = Date.UTC(2026, 9, 2, 15, 30) / 1000;
    for (const status of [403, 429]) {
      const { fetchImpl } = stubFetch(() =>
        jsonResponse(
          { message: "API rate limit exceeded" },
          { status, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) } },
        ),
      );
      const error = await failure(listPublicRepos(config, fetchImpl));
      expect(error.kind).toBe("rate-limit");
      expect(error.resetAt).toBe("2026-10-02T15:30:00.000Z");
      expect(error.message).toContain("15:30 UTC");
      expect(error.message).toContain("GITHUB_TOKEN");
    }
  });

  it("does not call a plain 403 a rate limit, and reports 404 and network errors", async () => {
    const forbidden = stubFetch(() => jsonResponse({}, { status: 403 }));
    expect((await failure(listPublicRepos(config, forbidden.fetchImpl))).kind).toBe("http");

    const missing = stubFetch(() => jsonResponse({}, { status: 404 }));
    expect((await failure(listPublicRepos(config, missing.fetchImpl))).kind).toBe("not-found");

    const down = () => Promise.reject(new TypeError("fetch failed"));
    const error = await failure(listPublicRepos(config, down));
    expect(error.kind).toBe("network");
    expect(error.message).toContain("Could not reach GitHub");
  });
});

describe("getRepo / getRepoDetail", () => {
  const detailRoutes =
    (readme: string | null): Route =>
    (url) => {
      if (url.pathname === "/repos/ryanyogan/demo") {
        return jsonResponse(
          apiRepo("demo", { homepage: "https://demo.example", topics: ["wasm"] }),
        );
      }
      if (url.pathname.endsWith("/languages")) return jsonResponse({ CSS: 50, Zig: 900, C: 50 });
      if (url.pathname.endsWith("/readme")) {
        return readme === null ? jsonResponse({}, { status: 404 }) : new Response(readme);
      }
      return jsonResponse({}, { status: 404 });
    };

  it("returns description, topics, languages largest first, flags and the README", async () => {
    const { fetchImpl, calls } = stubFetch(detailRoutes("# Demo\n"));
    const detail = await getRepoDetail(config, "ryanyogan/demo", fetchImpl);
    expect(detail).toMatchObject({
      fullName: "ryanyogan/demo",
      description: "About demo",
      language: "TypeScript",
      stars: 3,
      pushedAt: "2026-01-02T03:04:05Z",
      homepage: "https://demo.example",
      topics: ["wasm"],
      fork: false,
      archived: false,
      defaultBranch: "main",
      readme: "# Demo\n",
      readmeTruncated: false,
    });
    expect(Object.keys(detail.languages)).toEqual(["Zig", "CSS", "C"]);
    expect(calls).toHaveLength(3);
  });

  it("truncates a long README", async () => {
    const { fetchImpl } = stubFetch(detailRoutes("x".repeat(README_MAX_CHARS + 500)));
    const detail = await getRepoDetail(config, "ryanyogan/demo", fetchImpl);
    expect(detail.readme).toHaveLength(README_MAX_CHARS);
    expect(detail.readmeTruncated).toBe(true);
  });

  it("treats a missing README as none", async () => {
    const { fetchImpl } = stubFetch(detailRoutes(null));
    expect((await getRepoDetail(config, "ryanyogan/demo", fetchImpl)).readme).toBeNull();
  });

  it("refuses a private repo even if a token could read it, without asking further", async () => {
    const { fetchImpl, calls } = stubFetch(() =>
      jsonResponse(apiRepo("demo", { private: true, visibility: "private" })),
    );
    const error = await failure(
      getRepoDetail({ ...config, token: "test-token-not-real" }, "ryanyogan/demo", fetchImpl),
    );
    expect(error.kind).toBe("not-found");
    expect(calls).toHaveLength(1);
  });

  it("refuses names that are not the user's repo, without any request", async () => {
    const { fetchImpl, calls } = stubFetch(() => jsonResponse(apiRepo("demo")));
    for (const name of ["other/demo", "ryanyogan/a/b", "ryanyogan/..", "ryanyogan/a?b", "demo"]) {
      expect(ownRepoName(config, name), name).toBeNull();
      expect((await failure(getRepo(config, name, fetchImpl))).kind).toBe("not-found");
    }
    expect(calls).toHaveLength(0);
  });
});

describe("cachedPublicRepos", () => {
  beforeEach(() => clearRepoListCache());

  it("fetches once, then again only when stale or forced", async () => {
    const { fetchImpl, calls } = stubFetch(() => jsonResponse([apiRepo("one")]));
    const first = await cachedPublicRepos(config, { fetchImpl, now: 1000 });
    await cachedPublicRepos(config, { fetchImpl, now: 2000 });
    expect(calls).toHaveLength(1);
    expect(first.repos).toHaveLength(1);
    await cachedPublicRepos(config, { fetchImpl, now: 3000, force: true });
    expect(calls).toHaveLength(2);
    await cachedPublicRepos(config, { fetchImpl, now: 3000 + CACHE_MS });
    expect(calls).toHaveLength(3);
  });

  it("does not cache a failure", async () => {
    const limited = stubFetch(() => jsonResponse({}, { status: 429 }));
    await failure(cachedPublicRepos(config, { fetchImpl: limited.fetchImpl }));
    const ok = stubFetch(() => jsonResponse([apiRepo("one")]));
    expect((await cachedPublicRepos(config, { fetchImpl: ok.fetchImpl })).repos).toHaveLength(1);
  });
});

describe("repo to draft", () => {
  const repo = {
    fullName: "ryanyogan/Fizzy_Do.mcp",
    name: "Fizzy_Do.mcp",
    description: "An MCP server.",
    language: "TypeScript",
    stars: 12,
    pushedAt: "2026-05-06T07:08:09Z",
    homepage: "https://fizzy.example/docs",
    htmlUrl: "https://github.com/ryanyogan/Fizzy_Do.mcp",
    fork: false,
    archived: false,
    topics: ["mcp", "typescript", "cloudflare-workers"],
    defaultBranch: "main",
    languages: { TypeScript: 9000, CSS: 900, Shell: 10 },
    readme: "# Fizzy",
    readmeTruncated: false,
  };

  it("maps a repo to a valid unpublished draft with the GitHub bookkeeping", () => {
    const { input, origin } = repoToDraft(repo);
    const checked = validateProjectInput(input);
    expect(checked.ok).toBe(true);
    expect(input).toMatchObject({
      slug: "fizzy-do-mcp",
      title: "Fizzy Do Mcp",
      tagline: "An MCP server.",
      summary: "An MCP server.",
      tech: ["TypeScript", "CSS", "mcp", "cloudflare-workers"],
      status: "prototype",
      github: "https://github.com/ryanyogan/Fizzy_Do.mcp",
      live: "https://fizzy.example/docs",
      published: false,
    });
    expect(input.body).toContain("has not been written yet");
    expect(input.body).not.toContain("# Fizzy");
    expect(origin).toEqual({
      source: "github",
      repoFullName: "ryanyogan/Fizzy_Do.mcp",
      repoPushedAt: "2026-05-06T07:08:09Z",
      stars: 12,
    });
  });

  it("drops a homepage that is not https", () => {
    for (const homepage of ["http://fizzy.example", "javascript:alert(1)", "fizzy.example", ""]) {
      expect(httpsHomepage(homepage), homepage).toBeNull();
      expect(repoToDraft({ ...repo, homepage }).input.live).toBeNull();
    }
    expect(httpsHomepage("https://user:pw@fizzy.example")).toBeNull();
  });

  it("stays valid with no description, a long one, and an archived repo", () => {
    const bare = repoToDraft({ ...repo, description: null, language: null, languages: {} });
    expect(bare.input).toMatchObject({ tagline: "", summary: "", published: false });
    expect(validateProjectInput(bare.input).ok).toBe(true);

    const long = repoToDraft({ ...repo, description: "d".repeat(500), archived: true });
    expect((long.input.tagline as string).length).toBe(300);
    expect(long.input.status).toBe("retired");
    expect(validateProjectInput(long.input).ok).toBe(true);
  });

  it("derives slugs, titles and tech defensively", () => {
    expect(slugFromRepoName("www.ryanyogan.com")).toBe("www-ryanyogan-com");
    expect(slugFromRepoName("new")).toBe("new-repo");
    expect(slugFromRepoName("---")).toBe("repo");
    expect(slugFromRepoName("a".repeat(100))).toHaveLength(64);
    expect(titleFromRepoName("nexus-mcp")).toBe("Nexus Mcp");
    const topics = Array.from({ length: 30 }, (_, i) => `topic-${i}`);
    expect(techFromRepo({ language: "Go", languages: { Go: 1 }, topics })).toHaveLength(8);
  });
});

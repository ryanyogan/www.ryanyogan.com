// A tiny stand-in for api.github.com, started by Playwright (playwright.config.ts) so the
// admin import tests never touch the network. Fixed fixture data, loopback only, no token.
// It serves the three endpoints the client uses and pages the repo list two at a time (with
// a Link header) so pagination is exercised end to end.
import { createServer } from "node:http";

const PORT = Number(process.env.GITHUB_STUB_PORT ?? 4175);
const USER = "ryanyogan";
const PAGE_SIZE = 2;

function repo(name, extra = {}) {
  return {
    name,
    full_name: `${USER}/${name}`,
    owner: { login: USER },
    private: false,
    visibility: "public",
    description: `Fixture repository ${name}`,
    language: "Zig",
    stargazers_count: 7,
    pushed_at: "2026-03-04T05:06:07Z",
    homepage: null,
    fork: false,
    archived: false,
    topics: [],
    default_branch: "main",
    ...extra,
  };
}

const repos = [
  repo("stub-import-demo", {
    description: "Stub demo xk7 description",
    homepage: "https://example.com/stub-demo",
    topics: ["wasm", "cli"],
    stargazers_count: 41,
  }),
  repo("stub-http-home", { homepage: "http://example.com/insecure", stargazers_count: 99 }),
  repo("stub-forked", { fork: true }),
  repo("stub-archived", { archived: true }),
  repo("stub-nodesc", { description: null }),
];

// Not in the list (so the import page and its counts are unchanged) but readable by name:
// the projects in e2e/admin-fixtures.sql point at these. The AI stub keys on the same names.
const unlisted = ["stub-ai-malformed", "stub-ai-timeout", "stub-ai-down"].map((name) => repo(name));
/** Reading these fails the way GitHub does: a rate limit (403) and a server error (500). */
const failing = { "stub-gh-limited": 403, "stub-gh-broken": 500 };

/** Each refresh of a repo's details reports one more star, so the test can see an update. */
const detailReads = new Map();
/** Set by POST /__list-status?code=N (0 clears): the repo list then answers with that status. */
let listStatus = 0;

const rateLimited = {
  "x-ratelimit-remaining": "0",
  "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1800),
};
function fail(res, status) {
  if (status === 403) return send(res, 403, { message: "API rate limit exceeded" }, rateLimited);
  return send(res, status, { message: "Server Error" });
}

function send(res, status, body, headers = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(text);
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  if (path === "/health") return send(res, 200, { ok: true });
  if (req.method === "POST" && path === "/__list-status") {
    listStatus = Number(url.searchParams.get("code") ?? 0);
    return send(res, 200, { listStatus });
  }
  if (req.method !== "GET") return send(res, 405, { message: "read only" });

  if (path === `/users/${USER}/repos`) {
    if (listStatus) return fail(res, listStatus);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const items = repos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const more = page * PAGE_SIZE < repos.length;
    const link = more
      ? { link: `<http://127.0.0.1:${PORT}${path}?page=${page + 1}>; rel="next"` }
      : {};
    return send(res, 200, items, link);
  }

  const match = /^\/repos\/ryanyogan\/([^/]+)(\/languages|\/readme)?$/.exec(path);
  if (match && failing[match[1]]) return fail(res, failing[match[1]]);
  const found = match && [...repos, ...unlisted].find((r) => r.name === match[1]);
  if (!found) return send(res, 404, { message: "Not Found" });
  if (match[2] === "/languages") return send(res, 200, { Zig: 9000, C: 800, Shell: 5 });
  if (match[2] === "/readme") {
    return send(res, 200, `# ${found.name}\n\nStub README xk7 secret-readme-text.\n`, {
      "content-type": "text/plain",
    });
  }
  const reads = (detailReads.get(found.name) ?? 0) + 1;
  detailReads.set(found.name, reads);
  return send(res, 200, { ...found, stargazers_count: found.stargazers_count + reads - 1 });
}).listen(PORT, "127.0.0.1");

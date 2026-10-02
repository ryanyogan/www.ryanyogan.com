// `pnpm perf:budget`: what each public page type downloads from the production build, and
// whether that is within budget. Run `pnpm build` first.
//
// Starts its own `vite preview` on the e2e database (`pnpm db:e2e` seeds it; the package
// script runs that first), loads each route in a fresh Chromium context and records every
// response until the network is idle. Sizes are the gzip (level 9) of each response body:
// the preview server does not compress, production does.
//
// Fails (exit 1) when a route is over a budget below, when a public route downloads the
// markdown parser or the syntax highlighter, or when a script carries the body of a post
// other than the one being read. `--report` prints the table and never fails.
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const PORT = 4178;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const reportOnly = process.argv.includes("--report");
const KB = 1024;

const writingDir = new URL("../content/writing/", import.meta.url);
const posts = readdirSync(writingDir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const raw = readFileSync(new URL(name, writingDir), "utf8");
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const frontmatter = raw.slice(0, raw.length - body.length);
    // A plain sentence from the body: no markdown, quotes or entities, so it reads the same
    // in the source, in rendered HTML and inside a JavaScript string.
    const probe = body
      .split("\n")
      .map((line) => line.match(/[A-Za-z][A-Za-z ,]{48,}/)?.[0])
      // Not the excerpt: list pages carry that on purpose.
      .find((sentence) => sentence && !frontmatter.includes(sentence));
    return { slug: name.replace(/\.md$/, ""), length: body.length, probe };
  });
const longest = posts.reduce((a, b) => (b.length > a.length ? b : a));

/** Budgets in gzip bytes. Set from the measurements of October 2026 plus about 10%. */
const JS_BUDGET = 130 * KB;
const CSS_BUDGET = 12 * KB;
const routes = [
  { path: "/", js: JS_BUDGET },
  { path: "/work", js: JS_BUDGET },
  { path: "/projects", js: JS_BUDGET },
  { path: "/projects/lincoln-project", js: JS_BUDGET },
  { path: "/writing", js: JS_BUDGET },
  { path: `/writing/${longest.slug}`, js: JS_BUDGET, post: longest.slug },
];

/** Strings that survive minification in unified, micromark and highlight.js. */
const LIBRARY_SIGNATURES = [
  ["markdown pipeline (unified)", /Cannot `\w+` without `/],
  ["markdown parser (micromark)", /chunkFlow|characterReferenceMarker/],
  ["syntax highlighter (highlight.js)", /Language definition for|classPrefix:\s*["']hljs-/],
];

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${ORIGIN}/work`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("vite preview did not start within 60s");
}

async function measure(browser, route) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const pending = [];
  page.on("response", (response) => {
    pending.push(
      (async () => {
        const url = new URL(response.url());
        const type = response.headers()["content-type"] ?? "";
        let body = Buffer.alloc(0);
        try {
          body = await response.body();
        } catch {
          // redirects and aborted requests have no body
        }
        const kind = /javascript/.test(type)
          ? "js"
          : /text\/css/.test(type)
            ? "css"
            : /font/.test(type) || /\.woff2?$/.test(url.pathname)
              ? "font"
              : /text\/html/.test(type)
                ? "html"
                : "other";
        return {
          url: url.href,
          kind,
          status: response.status(),
          external: url.origin !== ORIGIN,
          // Fonts are already compressed.
          bytes: kind === "font" ? body.length : gzipSync(body, { level: 9 }).length,
          text: kind === "js" ? body.toString("utf8") : "",
        };
      })(),
    );
  });
  await page.goto(ORIGIN + route.path, { waitUntil: "networkidle" });
  // Idle-time work (hydration, lazy chunks) gets one more quiet period.
  await page.waitForTimeout(500);
  await page.waitForLoadState("networkidle");
  const responses = await Promise.all(pending);
  await context.close();

  const sum = (kind) =>
    responses.filter((r) => r.kind === kind).reduce((total, r) => total + r.bytes, 0);
  const problems = [];
  // A failed request would make the page look lighter than it is.
  for (const r of responses.filter((r) => r.status >= 400)) {
    problems.push(`${r.url} answered ${r.status}`);
  }
  for (const r of responses.filter((r) => r.external)) {
    problems.push(`third-party request: ${r.url}`);
  }
  for (const script of responses.filter((r) => r.kind === "js")) {
    const name = script.url.split("/").pop();
    for (const [label, pattern] of LIBRARY_SIGNATURES) {
      if (pattern.test(script.text)) problems.push(`${name} contains the ${label}`);
    }
    const bodies = posts.filter(
      (post) => post.probe && post.slug !== route.post && script.text.includes(post.probe),
    );
    if (bodies.length) {
      problems.push(
        `${name} contains the body of ${bodies.length} other post(s), e.g. "${bodies[0].slug}"`,
      );
    }
  }
  if (process.env.PERF_DEBUG) {
    for (const r of responses.filter((r) => r.kind === "js" || r.kind === "font")) {
      console.log(`  ${route.path} ${kb(r.bytes)} ${r.url.split("/").pop()}`);
    }
  }
  const result = {
    path: route.path,
    requests: responses.length,
    external: responses.filter((r) => r.external).length,
    js: sum("js"),
    css: sum("css"),
    font: sum("font"),
    html: sum("html"),
    problems,
  };
  if (result.js > route.js) {
    problems.push(`JS ${kb(result.js)} KB gzip is over the ${kb(route.js)} KB budget`);
  }
  if (result.css > CSS_BUDGET) {
    problems.push(`CSS ${kb(result.css)} KB gzip is over the ${kb(CSS_BUDGET)} KB budget`);
  }
  return result;
}

const kb = (bytes) => (bytes / KB).toFixed(1);

const server = spawn("pnpm", ["exec", "vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
  detached: true,
  env: {
    ...process.env,
    LOCAL_STATE_DIR: ".wrangler/e2e",
    E2E_NO_INSPECTOR: "1",
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
    ADMIN_DEV_BYPASS: "",
  },
});
const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // already gone
  }
};

let failed = false;
try {
  await waitForServer();
  const browser = await chromium.launch();
  const results = [];
  for (const route of routes) results.push(await measure(browser, route));
  await browser.close();

  console.log("route | requests (third-party) | JS gz KB | CSS gz KB | fonts KB | HTML gz KB");
  for (const r of results) {
    console.log(
      `${r.path} | ${r.requests} (${r.external}) | ${kb(r.js)} | ${kb(r.css)} | ${kb(r.font)} | ${kb(r.html)}`,
    );
  }
  for (const r of results) {
    for (const problem of r.problems) {
      failed = true;
      console.log(`${reportOnly ? "note" : "FAIL"} ${r.path}: ${problem}`);
    }
  }
  if (!failed) console.log("perf budget: all routes within budget");
} finally {
  stop();
}
process.exit(failed && !reportOnly ? 1 : 0);

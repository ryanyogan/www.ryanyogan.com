// `pnpm perf:budget`: what each public page type downloads from the production build, and
// whether that is within budget. Run `pnpm build` first.
//
// Starts its own `vite preview` on the e2e database (`pnpm db:e2e` seeds it; the package
// script runs that first), loads each route in a fresh Chromium context and records every
// response until the network is idle. Sizes are the gzip (level 9) of each response body:
// the preview server does not compress, production does.
//
// Fails (exit 1) when a route is over a budget below (bytes, or how many requests it makes),
// when a public route downloads the
// markdown parser or the syntax highlighter, when a script carries the body of a post
// other than the one being read, or when a post's document carries its body twice. Fonts have three budgets: the files the page preloads
// (`<link rel="preload" as="font">`, from src/styles/fonts.ts), how many of those there
// are, and every font file the page ends up fetching. `--report` prints the table and
// never fails.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { startPreview } from "./preview.mjs";

const PORT = 4178;
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
/** Font budgets are the specification's (R1.17), in bytes as served: woff2 is not gzipped. */
const FONT_PRELOAD_BUDGET = 70 * KB;
const FONT_PRELOAD_FILES = 3;
const FONT_BUDGET = 150 * KB;
/**
 * `requests` is a ceiling on everything the page asks for (document, scripts, fonts, its
 * API call), two above what October 2026 measured: 7 or 6, 8 for a project page, 10 for a
 * post. Before the shared modules were one chunk a page made 25 to 28. Production adds three
 * this run does not see (the favicon and Cloudflare's analytics script and its beacon).
 *
 * `html` is a ceiling on the longest post's document, set just above what it measured once
 * the body was no longer in it a second time as loader data (src/lib/content.ts).
 */
const POST_HTML_BUDGET = 30 * KB;
const routes = [
  { path: "/", js: JS_BUDGET, requests: 9 },
  { path: "/work", js: JS_BUDGET, requests: 9 },
  { path: "/now", js: JS_BUDGET, requests: 8 },
  { path: "/projects", js: JS_BUDGET, requests: 8 },
  { path: "/projects/lincoln-project", js: JS_BUDGET, requests: 10 },
  { path: "/writing", js: JS_BUDGET, requests: 10 },
  {
    path: `/writing/${longest.slug}`,
    js: JS_BUDGET,
    requests: 12,
    html: POST_HTML_BUDGET,
    post: longest.slug,
  },
];

/** Strings that survive minification in unified, micromark and highlight.js. */
const LIBRARY_SIGNATURES = [
  ["markdown pipeline (unified)", /Cannot `\w+` without `/],
  ["markdown parser (micromark)", /chunkFlow|characterReferenceMarker/],
  ["syntax highlighter (highlight.js)", /Language definition for|classPrefix:\s*["']hljs-/],
];

async function measure(browser, origin, route) {
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
          external: url.origin !== origin,
          // Fonts are already compressed.
          bytes: kind === "font" ? body.length : gzipSync(body, { level: 9 }).length,
          raw: body.length,
          text: kind === "js" || kind === "html" ? body.toString("utf8") : "",
        };
      })(),
    );
  });
  await page.goto(origin + route.path, { waitUntil: "networkidle" });
  // Idle-time work (hydration, lazy chunks) gets one more quiet period.
  await page.waitForTimeout(500);
  await page.waitForLoadState("networkidle");
  const preloadHrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'), (link) => link.href),
  );
  // The stylesheet is inlined in the document (src/styles/inline.ts): it counts as CSS.
  const inlineCss = await page.evaluate(() =>
    Array.from(document.querySelectorAll("style"), (style) => style.textContent).join(""),
  );
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
  // The post's body is in its document once, as HTML: not again as loader data.
  const probe = posts.find((post) => post.slug === route.post)?.probe;
  if (probe) {
    const copies = responses
      .filter((r) => r.kind === "html")
      .reduce((total, r) => total + r.text.split(probe).length - 1, 0);
    if (copies !== 1) problems.push(`the document carries the post's body ${copies} times`);
  }
  const preloads = [...new Set(preloadHrefs)].map((href) => {
    const response = responses.find((r) => r.url === href && r.status < 400);
    // Without this a preload that fetched nothing would count as zero bytes.
    if (!response) problems.push(`preloaded font was not fetched: ${href}`);
    return { url: href, bytes: response?.bytes ?? 0 };
  });
  if (process.env.PERF_DEBUG) {
    for (const r of responses.filter((r) => r.kind === "js" || r.kind === "font")) {
      const preloaded = preloads.some((p) => p.url === r.url) ? " (preloaded)" : "";
      console.log(`  ${route.path} ${kb(r.bytes)} ${r.url.split("/").pop()}${preloaded}`);
    }
  }
  const result = {
    path: route.path,
    requests: responses.length,
    external: responses.filter((r) => r.external).length,
    js: sum("js"),
    css: sum("css") + (inlineCss ? gzipSync(inlineCss, { level: 9 }).length : 0),
    font: sum("font"),
    preloads: preloads.length,
    fontPreload: preloads.reduce((total, p) => total + p.bytes, 0),
    html: sum("html"),
    htmlRaw: responses.filter((r) => r.kind === "html").reduce((total, r) => total + r.raw, 0),
    problems,
  };
  if (result.js > route.js) {
    problems.push(`JS ${kb(result.js)} KB gzip is over the ${kb(route.js)} KB budget`);
  }
  if (result.requests > route.requests) {
    problems.push(`${result.requests} requests; the ceiling is ${route.requests}`);
  }
  if (route.html && result.html > route.html) {
    problems.push(`HTML ${kb(result.html)} KB gzip is over the ${kb(route.html)} KB budget`);
  }
  if (result.css > CSS_BUDGET) {
    problems.push(`CSS ${kb(result.css)} KB gzip is over the ${kb(CSS_BUDGET)} KB budget`);
  }
  if (result.fontPreload > FONT_PRELOAD_BUDGET) {
    problems.push(
      `preloaded fonts ${kb(result.fontPreload)} KB are over the ${kb(FONT_PRELOAD_BUDGET)} KB budget`,
    );
  }
  if (result.preloads > FONT_PRELOAD_FILES) {
    problems.push(`${result.preloads} fonts are preloaded; the limit is ${FONT_PRELOAD_FILES}`);
  }
  if (result.font > FONT_BUDGET) {
    problems.push(`fonts ${kb(result.font)} KB are over the ${kb(FONT_BUDGET)} KB budget`);
  }
  return result;
}

const kb = (bytes) => (bytes / KB).toFixed(1);

const { origin, stop } = await startPreview(PORT);
let failed = false;
try {
  const browser = await chromium.launch();
  const results = [];
  for (const route of routes) results.push(await measure(browser, origin, route));
  await browser.close();

  console.log(
    "route | requests (third-party) | JS gz KB | CSS gz KB | fonts KB | preloaded fonts KB (files) | HTML gz KB (raw)",
  );
  for (const r of results) {
    console.log(
      `${r.path} | ${r.requests} (${r.external}) | ${kb(r.js)} | ${kb(r.css)} | ${kb(r.font)} | ${kb(r.fontPreload)} (${r.preloads}) | ${kb(r.html)} (${kb(r.htmlRaw)})`,
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

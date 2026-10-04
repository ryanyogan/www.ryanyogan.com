// `pnpm perf [base URL] [--runs=3] [--strict]`: Lighthouse (mobile emulation, simulated Slow
// 4G, 4x CPU slowdown: its defaults) for the home page, the longest post and one project
// page, against the budgets of SPEC-seo-perf-reading section 1.9. Prints one line per metric
// with the median of the runs, the budget and pass or FAIL; in GitHub Actions the table also
// goes to the job summary.
//
// With no base URL it measures the production build: it seeds the e2e database and starts its
// own `vite preview` (run `pnpm build` first). That server does not compress, so transfer is
// printed but not judged there (`pnpm perf:budget` holds the gzip budgets) and LCP, which the
// simulation derives from the bytes, reads high. Against a deployed site every line counts.
//
// Lab numbers move from run to run, more so on a shared CI runner, so a failed budget only
// fails the script (exit 1) with `--strict`.
//
// Lighthouse is not a dependency: `pnpm dlx` fetches the pinned version on first use. It
// drives the Chrome installed on the machine (or CHROME_PATH).
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startPreview } from "./preview.mjs";

const LIGHTHOUSE = "lighthouse@13.5.0";
const PORT = 4179;
const KB = 1024;

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const runs = Number(args.find((arg) => arg.startsWith("--runs="))?.slice(7) ?? 3);
const baseUrl = args.find((arg) => arg && !arg.startsWith("--"))?.replace(/\/$/, "");
if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs takes a whole number above 0");

const writingDir = new URL("../content/writing/", import.meta.url);
const longest = readdirSync(writingDir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => ({
    slug: name.replace(/\.md$/, ""),
    size: statSync(new URL(name, writingDir)).size,
  }))
  .reduce((a, b) => (b.size > a.size ? b : a));

/**
 * Section 1.9. Posts are prerendered; the home page and project pages read D1, so the Worker
 * renders them and the edge cache answers a repeat request. The spec gives a transfer budget
 * for a post and for the home page; a project page takes the home page's.
 */
const LCP_BUDGET = { static: 1800, worker: 2200 };
const TTFB_BUDGET = { static: 200, worker: 300 };
const CLS_BUDGET = 0.02;
const TBT_BUDGET = 150;
const REQUEST_BUDGET = 12;
const pages = [
  { path: "/", kind: "worker", transfer: 300 * KB },
  { path: `/writing/${longest.slug}`, kind: "static", transfer: 250 * KB },
  { path: "/projects/lincoln-project", kind: "worker", transfer: 300 * KB },
];

const outDir = mkdtempSync(join(tmpdir(), "lighthouse-"));

/** One Lighthouse run; the numbers this script reports, from its JSON result. */
function lighthouse(url) {
  const file = join(outDir, "run.json");
  const run = spawnSync(
    "pnpm",
    [
      "dlx",
      LIGHTHOUSE,
      url,
      "--quiet",
      "--only-categories=performance",
      "--form-factor=mobile",
      "--throttling-method=simulate",
      "--output=json",
      `--output-path=${file}`,
      // Chrome's sandbox needs privileges a CI runner does not give it.
      `--chrome-flags=--headless=new${process.env.CI ? " --no-sandbox" : ""}`,
    ],
    { stdio: ["ignore", "inherit", "inherit"], timeout: 180_000 },
  );
  if (run.status !== 0) throw new Error(`Lighthouse failed for ${url} (exit ${run.status})`);
  const { audits, categories, lighthouseVersion, environment } = JSON.parse(
    readFileSync(file, "utf8"),
  );
  const requests = audits["network-requests"].details.items.filter((item) =>
    /^https?:/.test(item.url),
  );
  return {
    lcp: audits["largest-contentful-paint"].numericValue,
    cls: audits["cumulative-layout-shift"].numericValue,
    tbt: audits["total-blocking-time"].numericValue,
    ttfb: audits["server-response-time"].numericValue,
    requests: requests.length,
    transfer: requests.reduce((total, item) => total + item.transferSize, 0),
    score: categories.performance.score * 100,
    versions: `Lighthouse ${lighthouseVersion}, Chrome ${environment.hostUserAgent.match(/Chrome\/(\d+)/)?.[1] ?? "unknown"}`,
  };
}

function median(values) {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
const millis = (ms) => `${Math.round(ms)} ms`;
const kb = (bytes) => `${Math.round(bytes / KB)} KB`;
/** `ok` is null for a line that is printed but not judged. */
const verdict = (ok) => (ok === null ? "-" : ok ? "pass" : "FAIL");

function rows(page, m, judgeTransfer) {
  const lcp = LCP_BUDGET[page.kind];
  const ttfb = TTFB_BUDGET[page.kind];
  return [
    ["LCP", seconds(m.lcp), `<= ${seconds(lcp)}`, m.lcp <= lcp],
    ["CLS", m.cls.toFixed(3), `<= ${CLS_BUDGET}`, m.cls <= CLS_BUDGET],
    ["INP", "not measured", "<= 100 ms", null],
    ["TBT", millis(m.tbt), `<= ${TBT_BUDGET} ms`, m.tbt <= TBT_BUDGET],
    [
      "Transfer",
      kb(m.transfer),
      `<= ${kb(page.transfer)}`,
      judgeTransfer ? m.transfer <= page.transfer : null,
    ],
    ["Requests", String(m.requests), `<= ${REQUEST_BUDGET}`, m.requests <= REQUEST_BUDGET],
    ["TTFB", millis(m.ttfb), `<= ${ttfb} ms`, m.ttfb <= ttfb],
    ["Lighthouse score", String(Math.round(m.score)), "no budget", null],
  ].map(([metric, measured, budget, ok]) => [page.path, metric, measured, budget, verdict(ok)]);
}

let preview;
if (!baseUrl) {
  const seeded = spawnSync("pnpm", ["db:e2e"], { stdio: "inherit" });
  if (seeded.status !== 0) throw new Error("pnpm db:e2e failed");
  preview = await startPreview(PORT);
}
const origin = baseUrl ?? preview.origin;

const table = [];
let versions = "";
try {
  for (const page of pages) {
    // A first request, not measured, so a Worker page is in the edge cache: the budgets for
    // those pages are the cache-hit ones. The Lighthouse runs block this process, so the
    // server may have closed the kept-alive connection of the page before meanwhile: a failed
    // request gets one more try, on a new connection.
    const url = origin + page.path;
    const warm = await fetch(url).catch(() => fetch(url));
    if (!warm.ok) throw new Error(`${url} answered ${warm.status}`);
    await warm.arrayBuffer();
    const results = [];
    for (let i = 1; i <= runs; i++) {
      const r = lighthouse(url);
      results.push(r);
      versions = r.versions;
      console.log(
        `${page.path} run ${i}/${runs}: LCP ${seconds(r.lcp)}, CLS ${r.cls.toFixed(3)}, ` +
          `TBT ${millis(r.tbt)}, TTFB ${millis(r.ttfb)}, score ${Math.round(r.score)}`,
      );
    }
    const medians = Object.fromEntries(
      ["lcp", "cls", "tbt", "ttfb", "requests", "transfer", "score"].map((key) => [
        key,
        median(results.map((r) => r[key])),
      ]),
    );
    table.push(...rows(page, medians, Boolean(baseUrl)));
  }
} finally {
  preview?.stop();
  rmSync(outDir, { recursive: true, force: true });
}

const header = ["page", "metric", "measured", "budget", "result"];
const title = `Lighthouse, mobile on Slow 4G: ${baseUrl ?? "local preview of this build"}`;
const notes = [
  `${versions}, median of ${runs} run(s) per page. Simulated throttling: 150 ms round trip, 1.6 Mbps, 4x CPU slowdown.`,
  "INP needs a real interaction, so a page-load run cannot measure it; TBT is its lab proxy.",
  "TTFB is the server's response time for the document, after one warm-up request. The cache-miss budget (<= 800 ms) is not measured.",
  ...(baseUrl
    ? []
    : [
        "The local preview does not compress: transfer is not judged here (see `pnpm perf:budget`) and LCP reads high.",
      ]),
];
const failures = table.filter((row) => row[4] === "FAIL").length;
const outcome = failures
  ? `perf: ${failures} line(s) over budget${strict ? "" : " (reported only; --strict makes this fail)"}`
  : "perf: every measured line within budget";

console.log(`\n${title}\n${header.join(" | ")}`);
for (const row of table) console.log(row.join(" | "));
console.log(`${notes.join("\n")}\n${outcome}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const line = (cells) => `| ${cells.join(" | ")} |`;
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      `### ${title}`,
      "",
      line(header),
      line(header.map(() => "---")),
      ...table.map(line),
      "",
      ...notes.map((note) => `- ${note}`),
      "",
      outcome,
      "",
    ].join("\n"),
  );
}
process.exit(failures && strict ? 1 : 0);

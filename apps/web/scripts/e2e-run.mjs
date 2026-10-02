// Runs the Playwright suite and prints a summary (`pnpm test:e2e`, locally and in CI; extra
// arguments go to Playwright). The exit code is Playwright's own, so any failed test fails
// the caller. In GitHub Actions the summary is also written to the job summary.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync } from "node:fs";

const RESULTS = "e2e-results.json";
rmSync(RESULTS, { force: true });

const run = spawnSync("pnpm", ["exec", "playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
});
const code = run.status ?? 1;

const lines = [];
if (existsSync(RESULTS)) {
  const { stats, suites } = JSON.parse(readFileSync(RESULTS, "utf8"));
  const bad = [];
  const walk = (suite, file) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        if (t.status === "unexpected" || t.status === "flaky") {
          bad.push(
            `- ${t.status === "flaky" ? "FLAKY" : "FAILED"} [${t.projectName}] ${file}: ${spec.title}`,
          );
        }
      }
    }
    for (const child of suite.suites ?? []) walk(child, file);
  };
  for (const suite of suites ?? []) walk(suite, suite.file);
  lines.push(
    `e2e: ${stats.expected} passed, ${stats.unexpected} failed, ${stats.flaky} flaky, ` +
      `${stats.skipped} skipped in ${(stats.duration / 1000).toFixed(1)}s (exit ${code})`,
    ...bad,
  );
  if (bad.length) lines.push("Report: apps/web/playwright-report, traces: apps/web/test-results");
} else {
  lines.push(`e2e: no results file; Playwright exited ${code} before running any test`);
}

const text = lines.join("\n");
console.log(`\n${text}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### End-to-end tests\n\n${text}\n`);
}
process.exit(code);

import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const CI = Boolean(process.env.CI);

const ADMIN_PORT = 4174;
/** e2e/github-stub.mjs: a local stand-in for api.github.com. The suite never calls GitHub. */
const GITHUB_STUB_PORT = 4175;
/** e2e/ai-stub.mjs: a local stand-in for the Workers AI binding. The suite never calls a model. */
const AI_STUB_PORT = 4176;
/** A preview whose database has no tables: what a D1 failure looks like (e2e/public.spec.ts). */
const BROKEN_PORT = 4177;

// Smoke tests run against the built site (`pnpm build` first), served by `vite preview`.
// Two previews of the same build, each on its own throwaway local D1 that `pnpm db:e2e`
// migrates and seeds (`pnpm test:e2e` runs it first); no account, secrets or remote database.
//
// - PORT: the site as the public sees it. No admin vars at all, so /admin must be closed.
// - ADMIN_PORT: the same build with the local admin bypass switched on, for e2e/admin.spec.ts.
//   Its database is its own, so the writes there cannot disturb the public tests.
//
// `db:e2e` deletes dist/server/.dev.vars (the build copies a developer's .dev.vars there), so
// the only vars either Worker sees are the ones given here.
const preview = (port: number, stateDir: string, env: Record<string, string>) => ({
  command: `pnpm exec vite preview --port ${port} --strictPort`,
  url: `http://localhost:${port}/work`,
  // Never reuse: a preview started before the last build serves stale files.
  reuseExistingServer: false,
  env: { LOCAL_STATE_DIR: stateDir, E2E_NO_INSPECTOR: "1", ...env },
  timeout: 60_000,
});

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: CI,
  // No retries, in CI either: a retry hid a real hydration error (React #418) for weeks.
  retries: 0,
  // e2e-results.json feeds scripts/e2e-summary.mjs (`pnpm test:e2e` prints it, CI posts it).
  reporter: [
    CI ? ["github"] : ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "e2e-results.json" }],
  ],
  // e2e/baselines.spec.ts: one committed picture per page, width and scheme, with no project
  // or platform in the name. They are drawn by Chromium on the CI runner and nowhere else.
  // `updateSnapshots` is left alone: a missing picture is written and fails the test.
  expect: { toHaveScreenshot: { pathTemplate: "{testDir}/baselines/{arg}{ext}" } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    colorScheme: "light",
    // There are no retries, so keep the trace of any failure.
    trace: "retain-on-failure",
  },
  projects: [
    // Scrollbars that take no space, as on a phone or a Mac and as headless Chromium has
    // always drawn the pages here; said outright because `scrollbar-gutter` (styles/app.css)
    // would otherwise keep 15px for a scrollbar that headless mode hides. scrollbar.spec.ts
    // runs with real ones.
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--enable-features=OverlayScrollbar"] },
      },
      testIgnore: /mobile\.spec\.ts$/,
    },
    // The public smoke tests again at phone size, plus the mobile menu and the view count
    // (its reserved space sits on a line of its own at this width).
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /(mobile|pages|views)\.spec\.ts$/,
    },
    // Safari's engine at iPhone size, for what Chromium emulation cannot show (font metrics,
    // hyphenation, dvh, focus). Public pages only: the device matrix, the mobile menu, the
    // page smoke tests, the view count, the route chunk tests (chunks.spec.ts is about what
    // this engine does), where a post's body comes from (post-body.spec.ts) and a first load
    // with slow fonts (first-load.spec.ts: what each engine does with a late font), plus one test
    // picked by its title: the hydration check in public.spec.ts. The admin tests, axe (it
    // reads the DOM and computed colours, which do not differ by engine) and the rest, which
    // mostly only make requests, stay in Chromium.
    // `grep` is matched against "<file name> <title>".
    {
      name: "webkit",
      use: { ...devices["iPhone 14"] },
      testMatch: /(viewports|mobile|pages|views|chunks|post-body|first-load|public)\.spec\.ts$/,
      grep: /(viewports|mobile|pages|views|chunks|post-body|first-load)\.spec\.ts|hydrates without a mismatch/,
    },
  ],
  webServer: [
    {
      command: "node e2e/github-stub.mjs",
      url: `http://127.0.0.1:${GITHUB_STUB_PORT}/health`,
      reuseExistingServer: false,
      env: { GITHUB_STUB_PORT: String(GITHUB_STUB_PORT) },
      timeout: 20_000,
    },
    {
      command: "node e2e/ai-stub.mjs",
      url: `http://127.0.0.1:${AI_STUB_PORT}/health`,
      reuseExistingServer: false,
      env: { AI_STUB_PORT: String(AI_STUB_PORT) },
      timeout: 20_000,
    },
    preview(PORT, ".wrangler/e2e", {
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
      ADMIN_DEV_BYPASS: "",
    }),
    // CLOUDFLARE_INCLUDE_PROCESS_ENV makes wrangler pass this process's env to the Worker as vars.
    preview(ADMIN_PORT, ".wrangler/e2e-admin", {
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
      ADMIN_DEV_BYPASS: "1",
      // The GitHub import talks to the stub above, as a fixed user and with no token (the
      // empty value also masks a GITHUB_TOKEN that happens to be in the developer's shell).
      GITHUB_API_BASE: `http://127.0.0.1:${GITHUB_STUB_PORT}`,
      GITHUB_USER: "ryanyogan",
      GITHUB_TOKEN: "",
      // "Draft with AI" posts to the stub instead of the AI binding. Honoured only together
      // with the bypass above, on localhost (resolveRunner in src/lib/admin/ai.ts).
      AI_STUB_URL: `http://127.0.0.1:${AI_STUB_PORT}/run`,
      AI_STUB_TIMEOUT_MS: "1500",
    }),
    preview(BROKEN_PORT, ".wrangler/e2e-broken", {
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
      ADMIN_DEV_BYPASS: "",
    }),
  ],
});

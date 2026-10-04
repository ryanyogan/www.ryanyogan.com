import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Full-page screenshots of the public pages, for looking at a pull request without running
// the site (CI uploads them as the `screenshots` artifact; e2e/screenshots.shots.ts). Not
// part of `pnpm test:e2e`: that config only picks up *.spec.ts. Same build, same public
// preview and database as the suite, so run it after `pnpm build` and `pnpm db:e2e`:
//   pnpm exec playwright test --config playwright.shots.config.ts
const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig({
  ...base,
  testMatch: /screenshots\.shots\.ts$/,
  reporter: [["line"]],
  // Its own directory, so a run does not wipe the suite's traces in test-results/.
  outputDir: "screenshots/.playwright",
  projects: [{ name: "shots", use: { ...devices["Desktop Chrome"] } }],
  // Only the public preview: no admin, no stubs.
  webServer: servers.filter((server) => server.url === `${base.use?.baseURL}/work`),
});

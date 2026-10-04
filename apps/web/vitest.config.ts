import { defineConfig } from "vitest/config";

// Unit tests only (pure modules under src/lib). Kept apart from vite.config.ts so the
// Cloudflare and TanStack Start plugins are not loaded; the browser tests are Playwright's.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  // vite.config.ts sets it for a build (src/lib/page-cache.ts reads it).
  define: { __BUILD_ID__: JSON.stringify("test") },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

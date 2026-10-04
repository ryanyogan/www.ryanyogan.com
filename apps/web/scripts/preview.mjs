// The `vite preview` the perf scripts measure (perf-budget.mjs, perf.mjs): the production
// build on the e2e database (`pnpm db:e2e` seeds it), with no admin bypass.
import { spawn } from "node:child_process";

/** Starts the preview on `port` and resolves once it serves; `stop()` ends it. */
export async function startPreview(port) {
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--port", String(port), "--strictPort"],
    {
      stdio: "ignore",
      detached: true,
      env: {
        ...process.env,
        LOCAL_STATE_DIR: ".wrangler/e2e",
        E2E_NO_INSPECTOR: "1",
        CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
        ADMIN_DEV_BYPASS: "",
      },
    },
  );
  const stop = () => {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // already gone
    }
  };
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${origin}/work`)).ok) return { origin, stop };
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  stop();
  throw new Error("vite preview did not start within 60s");
}

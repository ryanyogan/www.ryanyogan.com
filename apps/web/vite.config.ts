import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const localStateDir = process.env.LOCAL_STATE_DIR;

function isDynamic(path: string): boolean {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "");
  return (
    clean === "" ||
    clean === "/projects" ||
    clean.startsWith("/projects/") ||
    // Lists the published projects, so the Worker renders it too (src/routes/sitemap[.]xml.ts).
    clean === "/sitemap.xml" ||
    // Never prerendered: the admin is rendered per request, behind the owner check.
    clean === "/admin" ||
    clean.startsWith("/admin/")
  );
}

export default defineConfig(({ command, isPreview }) => ({
  server: {
    port: 3000,
  },
  // The build prerenders by fetching from a `vite preview` it starts itself. With the default
  // host, Vite binds whatever `localhost` resolves to first (::1 where /etc/hosts lists it),
  // while Node's fetch resolves `localhost` with AI_ADDRCONFIG, which drops ::1 on a machine
  // without a routable IPv6 address (a default Docker network): ECONNREFUSED 127.0.0.1.
  // A literal IPv4 address makes both sides agree everywhere.
  preview: {
    host: "127.0.0.1",
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      // Local D1 lives in .wrangler/state, where `wrangler d1 ... --local` also writes.
      // The e2e suite points both at its own directory (see playwright.config.ts).
      persistState: localStateDir ? { path: localStateDir } : true,
      // The e2e suite runs two previews at once; they must not fight over the inspector port.
      ...(process.env.E2E_NO_INSPECTOR ? { inspectorPort: false as const } : {}),
      // The AI binding is remote (the real, billed Workers AI). Only `vite dev` may reach
      // it: a remote session needs a wrangler login, and it keeps `vite build` from exiting
      // after the prerender. Build, preview, CI and the e2e suite never open one, and
      // NO_REMOTE_BINDINGS=1 turns it off for dev too (scripts/fresh-clone-check.sh).
      remoteBindings: command === "serve" && !isPreview && !process.env.NO_REMOTE_BINDINGS,
    }),
    tanstackStart({
      // Nothing links to /llms.txt, so the prerender crawl would not find it.
      pages: [{ path: "/llms.txt" }],
      prerender: {
        enabled: true,
        // Emit work.html, not work/index.html: the asset server then serves /work with a 200
        // (the form every canonical, link and feed uses) instead of redirecting it to /work/.
        autoSubfolderIndex: false,
        // Pages that read projects from D1 are rendered by the Worker on request.
        // The route tree also offers "/writing/" (the index route's own path). Prerendering
        // it would put writing/index.html next to writing.html and serve both URLs with a 200.
        filter: ({ path }) => !isDynamic(path) && !path.split(/[?#]/)[0].endsWith("/"),
      },
    }),
    react(),
    tailwindcss(),
  ],
}));

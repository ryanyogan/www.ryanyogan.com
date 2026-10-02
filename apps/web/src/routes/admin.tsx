import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

// Layout for everything under /admin. Access is decided before this renders: the request
// middleware in src/start.ts answers 401/403 for anyone but the owner, and every loader
// below calls a server function that checks again.
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
  errorComponent: AdminError,
});

function AdminLayout() {
  // Set once the page is interactive; the e2e suite waits for it before using a form.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <main id="main" data-hydrated={hydrated} className="wrap adm pt-2 pb-[72px]">
      <div className="adm-bar">
        <span className="lab">Admin &middot; not public</span>
        <nav aria-label="Admin" className="flex flex-wrap gap-x-6">
          <Link to="/admin" className="quiet" activeOptions={{ exact: true }}>
            All projects
          </Link>
          <Link to="/admin/projects/new" className="quiet">
            New project
          </Link>
        </nav>
      </div>
      <Outlet />
    </main>
  );
}

function AdminError() {
  return (
    <main id="main" className="wrap adm pt-[clamp(40px,7vw,84px)] pb-[72px]">
      <span className="lab mb-[18px] block">Admin</span>
      <h1>That did not load.</h1>
      <p className="mt-4 max-w-[62ch] text-ink-soft">
        The session may have expired, or the request failed. Reload the page to sign in again.
      </p>
    </main>
  );
}

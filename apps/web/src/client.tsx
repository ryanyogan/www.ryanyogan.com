import { RouterProvider } from "@tanstack/react-router";
import { hydrateStart } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

// The client entry (TanStack Start uses src/client.tsx in place of its default). It is the
// default entry plus one rule: a page that is being left is not hydrated.
//
// Safari cancels the route chunks still loading when a navigation starts, and the import
// rejects with "Importing a module script failed". The router's lazyRouteComponent reads that
// message as a chunk a newer deploy has removed and, on its first render, reloads the page
// (once per tab; it keeps a flag in sessionStorage). The page it reloaded was the one being
// left, which cancelled the navigation: a link tapped before the scripts had arrived did
// nothing. Hydration waits for those chunks, so a navigation that began before they settled
// is known by the time React would render. A chunk that is really gone still reloads the
// page: nothing here runs unless the reader is already leaving (e2e/chunks.spec.ts has both).

let leaving = false;

const onUnload = () => {
  leaving = true;
};

// iOS Safari does not send beforeunload, so a link is caught as it is clicked. Until React
// attaches, every link is a plain one; those that keep the page (a new tab, a download, mailto,
// a fragment of this page) are left out.
const onClick = (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest("a") : null;
  if (!link || !/^https?:$/.test(link.protocol) || link.hasAttribute("download")) return;
  if (link.target && link.target !== "_self") return;
  const here = location.origin + location.pathname + location.search;
  if (link.hash && link.origin + link.pathname + link.search === here) return;
  leaving = true;
};

addEventListener("beforeunload", onUnload);
addEventListener("click", onClick);

void hydrateStart().then((router) => {
  // Not kept past this point: a beforeunload listener can keep a page out of the
  // back/forward cache.
  removeEventListener("beforeunload", onUnload);
  removeEventListener("click", onClick);

  if (leaving) {
    // The cancelled import has already spent the router's one reload: give it back, so a
    // chunk that is really gone can still recover later in this tab.
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("tanstack_router_reload:")) sessionStorage.removeItem(key);
    }
    // Back to this page from the back/forward cache: it was never hydrated, so load it again.
    addEventListener("pageshow", (event) => {
      if (event.persisted) location.reload();
    });
    return;
  }

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });
});

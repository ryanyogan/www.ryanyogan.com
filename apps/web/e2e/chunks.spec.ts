import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Runs in the "chromium" and "webkit" projects. /projects draws its list in a route chunk the
// router imports on its own (projects.index-<hash>.js), and both tests decide what that one
// request gets. If the build stops emitting a chunk by that name, both fail rather than pass.
const chunk = /\/assets\/projects\.index-[^/]+\.js$/;

/** The path of every document the tab asks for, in order: a reload shows as a repeat. */
function documents(page: Page): string[] {
  const paths: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      paths.push(new URL(request.url()).pathname);
  });
  return paths;
}

// WebKit cancels a pending import when a navigation starts ("Importing a module script
// failed"), and TanStack Router's lazyRouteComponent takes that message for a stale build and
// reloads the page, once per tab. The reload is of the page being left, so it cancelled the
// navigation: a reader who tapped a link before the page's scripts had arrived lost the tap.
// Chromium does not reject the import, so there this only shows the click still works.
test("leaving a page while its route chunk is still loading does not reload it", async ({
  page,
}) => {
  const requested = documents(page);
  let held = 0;
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(chunk, async (route) => {
    held += 1;
    await released;
    await route.continue().catch(() => {});
  });

  await page.goto("/projects", { waitUntil: "commit" });
  // The router is hydrating (it sets this just before it imports the route chunks) and the
  // chunk has been asked for: the page is now waiting on the import.
  await page.waitForFunction(
    () => (window as unknown as { $_TSR?: { initialized?: boolean } }).$_TSR?.initialized === true,
  );
  await expect.poll(() => held).toBeGreaterThan(0);

  // Not hydrated, so this is a plain link: a document navigation, as on a slow connection.
  const link = page.locator('main a[href^="/projects/"]').first();
  const target = await link.getAttribute("href");
  await link.click();

  await expect.poll(() => requested, { timeout: 10_000 }).toEqual(["/projects", target]);
  await expect(page).toHaveURL(new RegExp(`${target}$`));
  await expect(page.locator("h1")).toHaveCount(1);
  // Nor did the cancelled import use up the tab's one reload (the router keeps that in
  // sessionStorage): a chunk that is really gone can still recover, as in the test below.
  const flags = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((key) => key.startsWith("tanstack_router_reload:")),
  );
  expect(flags).toEqual([]);
  release();
});

// What the reload is for: after a deploy, a tab opened before it asks for chunk names that no
// longer exist. The page reloads once, gets the new build's HTML, and works.
//
// A real reload names new chunks. Here the name is the same, and WebKit does not ask again for
// a script that failed in the document it is reloading, so the import fails a second time.
// That shows the other half instead: the second failure is thrown, not answered with another
// reload.
test("a route chunk that is gone reloads the page once, and no more than once", async ({
  page,
  browserName,
  consoleErrors,
}) => {
  const requested = documents(page);
  await page.route(chunk, (route) =>
    requested.length < 2 ? route.fulfill({ status: 404, body: "Not found" }) : route.continue(),
  );

  await page.goto("/projects", { waitUntil: "commit" });
  await expect.poll(() => requested).toEqual(["/projects", "/projects"]);

  const thrown = "Importing a module script failed";
  if (browserName === "webkit") {
    await expect.poll(() => consoleErrors.some((error) => error.includes(thrown))).toBe(true);
  } else {
    // Hydrated: React has attached to the heading the route chunk draws.
    await page.waitForFunction(() => {
      const h1 = document.querySelector("h1");
      return Boolean(h1 && Object.keys(h1).some((key) => key.startsWith("__reactFiber$")));
    });
  }
  expect(requested).toEqual(["/projects", "/projects"]);

  // The browser reports the 404 itself (and WebKit the second failure). Nothing else is logged.
  const expected = (error: string) => error.includes("status of 404") || error.includes(thrown);
  expect(consoleErrors.filter((error) => !expected(error))).toEqual([]);
  consoleErrors.length = 0;
});

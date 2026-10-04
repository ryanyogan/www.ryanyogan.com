/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { Link, Outlet, HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { Header } from "~/components/Header";
import { Footer } from "~/components/Footer";
import { KeyboardLayer } from "~/components/KeyboardLayer";
import { staticOgImage } from "~/lib/og-images";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE,
  absoluteUrl,
  imageMeta,
} from "~/lib/seo";
import { APP_CSS_ID, appCssHref, appCssText, inlineAppCss } from "~/styles/inline";
import { fontPreloads, lateFontsScript } from "~/styles/fonts";

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: SITE_LOCALE },
      { property: "og:type", content: "website" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      // Each public route names its own image through seo(); this is the fallback.
      ...imageMeta(staticOgImage("/")),
      { name: "twitter:site", content: "@ryanyogan" },
      { name: "twitter:creator", content: "@ryanyogan" },
    ],
    links: [
      ...(inlineAppCss ? [] : [{ rel: "stylesheet", href: appCssHref }]),
      // No canonical here: each route sets its own through seo() or canonical().
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Ryan Yogan, writing",
        href: absoluteUrl("/rss.xml"),
      },
      ...fontPreloads,
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Header />
      <Outlet />
      <Footer />
      <KeyboardLayer />
    </RootDocument>
  );
}

function NotFound() {
  return (
    <main id="main" className="wrap pt-[clamp(40px,7vw,84px)] pb-[72px]">
      <span className="lab mb-[18px] block">404</span>
      <h1>This page doesn&rsquo;t exist.</h1>
      <p className="mt-[22px]">
        <Link to="/" className="link">
          Back to home &rarr;
        </Link>
      </p>
    </main>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Here, not in head(): the router keeps one meta per name, and this needs two. The
            values are --paper in each scheme (styles/app.css). A theme picked with the toggle
            rewrites the two media attributes (lib/theme.ts and the script below), never the
            content, which is what React matches these by when it hydrates. */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#f6f5f1"
          data-scheme="light"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#1c1e1f"
          data-scheme="dark"
        />
        <HeadContent />
        {inlineAppCss && (
          <style
            id={APP_CSS_ID}
            data-href={appCssHref}
            dangerouslySetInnerHTML={{ __html: appCssText }}
          />
        )}
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.classList.add(t);document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("media",m.getAttribute("data-scheme")===t?"all":"not all")})}}catch(e){}}())`,
          }}
        />
        {/* The serif italic and semibold, added when no reader can see the change (styles/fonts.ts). */}
        <script dangerouslySetInnerHTML={{ __html: lateFontsScript }} />
        <a
          href="#main"
          className="absolute -top-20 left-4 z-50 bg-ink px-4 py-3.5 font-sans text-[0.9375rem] font-medium text-paper focus:top-3"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

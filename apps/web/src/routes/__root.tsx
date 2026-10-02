/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { Link, Outlet, HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { Header } from "~/components/Header";
import { Footer } from "~/components/Footer";
import { KeyboardLayer } from "~/components/KeyboardLayer";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, absoluteUrl } from "~/lib/seo";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: absoluteUrl("/og-default.svg") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@ryanyogan" },
      { name: "twitter:creator", content: "@ryanyogan" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // No canonical here: each route sets its own through seo() or canonical().
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Ryan Yogan, writing",
        href: absoluteUrl("/rss.xml"),
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:ital,wght@0,400..700;1,400..600&display=swap",
      },
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
      <span className="label mb-[18px] block">404</span>
      <h1 className="display text-[clamp(2.3rem,6.2vw,4.6rem)]">This page doesn&rsquo;t exist.</h1>
      <p className="mt-[22px] font-semibold">
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
        <HeadContent />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");else if(t==="light")document.documentElement.classList.add("light")}catch(e){}}())`,
          }}
        />
        <a
          href="#main"
          className="absolute -top-16 left-3 z-50 rounded-lg bg-ink px-4 py-2.5 text-paper focus:top-3"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

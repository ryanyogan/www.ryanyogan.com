/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { Link, Outlet, HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { Header } from "~/components/Header";
import { Footer } from "~/components/Footer";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ryan Yogan" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=STIX+Two+Text:ital,wght@0,400;0,700;1,400&display=swap",
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
    </RootDocument>
  );
}

function NotFound() {
  return (
    <main className="pt-40 pb-24 px-8 max-w-7xl mx-auto">
      <h1 className="font-sans text-6xl md:text-8xl font-extrabold tracking-tighter text-primary leading-[0.9] mb-8">
        404
      </h1>
      <p className="font-serif text-xl text-on-surface-variant mb-12">This page doesn't exist.</p>
      <Link
        to="/"
        className="inline-block bg-primary text-on-primary px-6 py-3 font-sans text-sm tracking-widest uppercase hover:opacity-90 transition-all"
      >
        Back to Home
      </Link>
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
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { navLinks } from "@repo/shared";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface">
      <nav className="flex justify-between items-center max-w-7xl mx-auto px-5 sm:px-6 md:px-8 py-4 md:py-6">
        <Link
          to="/"
          className="font-sans text-sm tracking-[0.2em] uppercase text-primary font-semibold"
        >
          Ryan Yogan
        </Link>

        <div className="hidden md:flex items-center space-x-10">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="font-sans text-xs tracking-[0.2em] uppercase text-on-surface-variant/60 hover:text-primary transition-colors"
              activeProps={{
                className:
                  "font-sans text-xs tracking-[0.2em] uppercase text-primary font-semibold",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <ThemeToggle />
        </div>

        <button
          className="md:hidden text-primary relative z-[60]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      <div
        className={`fixed inset-0 z-50 bg-surface/95 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex justify-end px-5 py-4">
          <button
            className="text-primary"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center h-[calc(100%-4rem)]">
          <nav className="flex flex-col items-center space-y-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="font-sans text-2xl tracking-widest uppercase text-neutral-500 hover:text-primary transition-colors"
                activeProps={{
                  className:
                    "font-sans text-2xl tracking-widest uppercase text-primary border-b border-primary pb-1",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="w-16 h-px bg-outline-variant/30 my-8" />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { navLinks } from "@repo/shared";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface">
      <nav className="flex justify-between items-center max-w-7xl mx-auto px-8 py-6">
        <Link
          to="/"
          className="text-xl font-bold tracking-tighter text-primary uppercase font-sans"
        >
          Ryan Yogan
        </Link>

        <div className="hidden md:flex items-center space-x-12">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="font-sans text-sm tracking-widest uppercase text-neutral-500 hover:text-primary transition-colors"
              activeProps={{
                className:
                  "font-sans text-sm tracking-widest uppercase text-primary border-b border-primary pb-0.5",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-6">
          <ThemeToggle />
          <a
            className="bg-primary text-on-primary px-6 py-2 text-sm font-sans tracking-widest uppercase hover:opacity-90 transition-all duration-200"
            href="https://yogan.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hire Me
          </a>
        </div>

        <button
          className="md:hidden text-primary"
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

      {mobileOpen && (
        <div className="md:hidden bg-surface px-8 pb-6 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="block font-sans text-sm tracking-widest uppercase text-neutral-500 hover:text-primary transition-colors"
              activeProps={{
                className:
                  "block font-sans text-sm tracking-widest uppercase text-primary border-b border-primary pb-0.5 w-fit",
              }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            className="block font-sans text-sm tracking-widest uppercase px-6 py-2 bg-primary text-on-primary w-fit"
            href="https://yogan.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hire Me
          </a>
        </div>
      )}
    </header>
  );
}

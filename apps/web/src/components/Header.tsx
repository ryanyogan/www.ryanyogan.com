import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { navLinks } from "@repo/shared";
import { openDialog } from "~/lib/keys";
import { SearchIcon } from "./KeyboardLayer";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ID = "site-nav";

export function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // The keyboard layer (palette, shortcuts) is off under /admin, so its opener is not shown.
  const admin = /^\/admin(\/|$)/i.test(pathname);

  // Navigating closes the menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: focus moves into the menu, Escape closes it and hands focus
  // back to the button, and a press outside the header closes it.
  useEffect(() => {
    if (!open) return;

    navRef.current?.querySelector("a")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur-[10px]"
    >
      <div className="wrap flex flex-wrap items-center gap-x-2.5 gap-y-2 py-3 md:gap-x-5">
        <Link
          to="/"
          aria-label="Ryan Yogan, home"
          className="mr-auto inline-flex items-center gap-2.5 font-serif text-[1.15rem] font-semibold"
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="flex-none">
            <path d="M13 1a12 12 0 0 0 0 24z" fill="var(--lead)" />
            <path d="M13 1a12 12 0 0 1 0 24z" fill="var(--build)" />
            <rect x="12.25" y="1" width="1.5" height="24" fill="var(--paper)" />
          </svg>
          Ryan Yogan
        </Link>

        <button
          type="button"
          hidden={admin}
          aria-haspopup="dialog"
          aria-keyshortcuts="/ Control+K Meta+K"
          className={`${admin ? "hidden" : "inline-flex"} cursor-pointer items-center gap-[7px] rounded-full border border-rule-strong px-3 py-1.5 text-[0.85rem] font-semibold text-ink-soft hover:bg-surface hover:text-ink`}
          onClick={() => openDialog("palette")}
        >
          <SearchIcon />
          <span className="sr-only sm:not-sr-only">Search</span>
          <kbd aria-hidden="true" className="kbd ml-0.5 hidden md:inline">
            /
          </kbd>
        </button>

        <ThemeToggle />

        <button
          ref={buttonRef}
          type="button"
          className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border border-rule-strong px-3 py-1.5 text-[0.85rem] font-semibold text-ink-soft hover:bg-surface hover:text-ink md:hidden"
          aria-expanded={open}
          aria-controls={NAV_ID}
          onClick={() => setOpen((value) => !value)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? <path d="M2 2l10 10M12 2L2 12" /> : <path d="M1 3h12M1 7h12M1 11h12" />}
          </svg>
          Menu
        </button>

        <nav
          ref={navRef}
          id={NAV_ID}
          aria-label="Primary"
          className={`${open ? "block" : "hidden"} w-full md:block md:w-auto`}
        >
          <ul className="flex flex-col gap-0.5 pb-1 md:flex-row md:pb-0">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="block rounded-full px-[13px] py-[7px] text-[0.98rem] font-semibold text-ink-soft hover:bg-surface hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

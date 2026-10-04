import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { navLinks } from "@repo/shared";
import { openDialog } from "~/lib/keys";
import { CloseIcon, MenuIcon, SearchIcon } from "./Icons";
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

  // While open: focus moves into the menu and stays in the header, Escape closes it and hands
  // focus back to the button, and a press outside the header closes it.
  useEffect(() => {
    if (!open) return;

    navRef.current?.querySelector("a")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") {
        // The open menu holds focus inside the header: Tab wraps from the last control to
        // the first (and back), so a keyboard never wanders into the page under the menu.
        const header = headerRef.current;
        if (!header) return;
        const stops = [...header.querySelectorAll<HTMLElement>("a[href], button")].filter(
          (element) => element.getClientRects().length > 0,
        );
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (!first || !last) return;
        const current = document.activeElement;
        const inside = current instanceof Node && header.contains(current);
        if (event.shiftKey ? !inside || current === first : !inside || current === last) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
        return;
      }
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
    <header ref={headerRef} className="font-sans">
      <div className="wrap flex flex-wrap items-center pt-2.5 pb-1.5 md:gap-x-5 md:py-6">
        <Link
          to="/"
          aria-label="Ryan Yogan, home"
          className="mr-auto inline-flex min-h-11 items-center text-base font-semibold tracking-[-0.005em]"
        >
          Ryan Yogan
        </Link>

        {/* Before the buttons so the wide layout reads name, pages, controls; on a phone it
            drops to its own row under them, between two hairlines. */}
        <nav
          ref={navRef}
          id={NAV_ID}
          aria-label="Primary"
          className={`${open ? "block" : "hidden"} order-last mt-1.5 w-full border-y border-rule py-1 md:order-none md:mt-0 md:block md:w-auto md:border-0 md:py-0`}
        >
          <ul className="-mx-3 flex flex-col md:mx-0 md:flex-row md:gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="quiet w-full px-3 text-[0.9375rem] max-md:min-h-12 max-md:text-[1.0625rem] max-md:text-ink md:w-auto"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-tools">
          <button
            type="button"
            hidden={admin}
            aria-label="Search"
            aria-haspopup="dialog"
            aria-keyshortcuts="/ Control+K Meta+K"
            title="Search (press /)"
            className={admin ? "hidden" : "quiet icon-btn"}
            onClick={() => openDialog("palette")}
          >
            <SearchIcon />
          </button>

          <ThemeToggle />

          <button
            ref={buttonRef}
            type="button"
            className="quiet icon-btn md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls={NAV_ID}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}

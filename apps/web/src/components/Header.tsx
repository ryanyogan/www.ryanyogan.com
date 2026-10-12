import { Link, useRouterState } from "@tanstack/react-router";
import { navLinks } from "@repo/shared";
import { openDialog } from "~/lib/keys";
import { SearchIcon } from "./Icons";

/**
 * The masthead: the name, the tagline, then the sections between two rules. The same row on
 * a phone, where Search is its icon; there is no menu to open.
 */
export function Header() {
  // The keyboard layer (palette, shortcuts) is off under /admin, so its opener is not shown.
  const admin = useRouterState({
    select: (state) => /^\/admin(\/|$)/i.test(state.location.pathname),
  });

  return (
    <header>
      <div className="wrap">
        <div className="mast-head">
          <Link to="/" aria-label="Ryan Yogan, home" className="mast-name">
            Ryan Yogan
          </Link>
          <p className="mast-tag">Engineering leader. Agent builder. Hockey dad.</p>
        </div>

        <nav id="site-nav" aria-label="Sections" className="mast-nav">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <span>{link.label}</span>
            </Link>
          ))}
          {!admin && (
            <>
              <span aria-hidden="true" className="mast-sep">
                |
              </span>
              <button
                type="button"
                aria-label="Search"
                aria-haspopup="dialog"
                aria-keyshortcuts="/ Control+K Meta+K"
                title="Search (press /)"
                className="mast-search"
                onClick={() => openDialog("palette")}
              >
                <span>Search &#8984;K</span>
                <SearchIcon size={16} />
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

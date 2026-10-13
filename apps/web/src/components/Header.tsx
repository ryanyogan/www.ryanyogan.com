import { Link } from "@tanstack/react-router";
import { footerLinks, navLinks } from "@repo/shared";
import { useEffect, useRef } from "react";
import { ThemeToggle } from "./ThemeToggle";

/** The site has been rebuilt eight times (Home, "Off the clock"): a volume, not a date. */
const VOLUME = 8;

/** The day in Chicago, as a paper prints it: "Monday, October 12, 2026". */
function today(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

/**
 * The folio's date. The server prints the day it rendered the page, and a page kept in a
 * cache (or made at build time) can be older than that: the reader's browser sets it right
 * once, after hydration, in a line whose size does not depend on what it says.
 */
function FolioDate() {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const now = today();
    if (ref.current && ref.current.textContent !== now) ref.current.textContent = now;
  }, []);
  return (
    <p ref={ref} className="folio-date" suppressHydrationWarning>
      {today()}
    </p>
  );
}

/**
 * The masthead, three bands: the folio (volume, place, the day, the theme), the nameplate
 * (the name between two ears) and the section index. On a phone the ears go and the tagline
 * sits under the name; there is no menu to open.
 */
export function Header() {
  return (
    <header>
      <div className="wrap">
        <div className="folio">
          <p>
            <b>Vol. {VOLUME}</b>
            <span aria-hidden="true">&middot;</span>
            Chicago, IL
          </p>
          <FolioDate />
          <div>
            <span className="folio-geo">41.88 N, 87.63 W</span>
            <span aria-hidden="true" className="folio-sep">
              |
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="mast-head">
          <p className="mast-ear">
            <span>Engineering leader</span>
            <span>Agent builder</span>
            <span>Hockey dad</span>
          </p>
          <div>
            <Link to="/" aria-label="Ryan Yogan, home" className="mast-name">
              Ryan Yogan
            </Link>
            <p className="mast-tag">Engineering leader. Agent builder. Hockey dad.</p>
          </div>
          <p className="mast-ear mast-ear--right">
            <span className="kicker">Now</span>
            <span className="mast-now">
              Leading AI engineering at Chromatic. Building agent memory, MCP and durable workflows.
            </span>
            <Link to="/now">The now page &rarr;</Link>
          </p>
        </div>

        <nav id="site-nav" aria-label="Sections" className="mast-nav">
          <div>
            <Link to="/" activeOptions={{ exact: true }}>
              <span>Front page</span>
            </Link>
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
          <div className="mast-more">
            {footerLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="me noopener noreferrer">
                <span>{link.label}</span>
              </a>
            ))}
            <a href="/rss.xml">
              <span>RSS</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}

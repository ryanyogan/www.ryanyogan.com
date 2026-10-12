import { Link } from "@tanstack/react-router";
import { navLinks } from "@repo/shared";

/**
 * The masthead: the name, the tagline, then the sections between two rules. The same row on
 * a phone; there is no menu to open.
 */
export function Header() {
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
        </nav>
      </div>
    </header>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { contactEmail, footerLinks } from "@repo/shared";
import { openDialog } from "~/lib/keys";

/** The colophon: who and where under a heavy rule, then the links. The theme is in the folio. */
export function Footer() {
  // No shortcuts under /admin (see KeyboardLayer), so no hint about them there.
  const admin = useRouterState({
    select: (state) => /^\/admin(\/|$)/i.test(state.location.pathname),
  });
  return (
    <footer className="colophon">
      <div className="wrap">
        <div className="colo">
          <p>
            Ryan Yogan &middot; Chicago &middot; 41.88 N, 87.63 W
            <button
              type="button"
              aria-haspopup="dialog"
              data-testid="keys-hint"
              hidden={admin}
              onClick={() => openDialog("help")}
            >
              <span aria-hidden="true"> &middot; </span>Press <kbd className="kbd">?</kbd> for keys
            </button>
          </p>
          <nav aria-label="Footer">
            <Link to="/now">Now</Link>
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                // "me": these profiles are the same person as this site (XFN, IndieAuth).
                rel="me noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
            <a href="/rss.xml">RSS</a>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

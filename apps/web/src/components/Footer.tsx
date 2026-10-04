import { Link, useRouterState } from "@tanstack/react-router";
import { contactEmail, footerLinks } from "@repo/shared";
import { openDialog } from "~/lib/keys";

export function Footer() {
  // No shortcuts under /admin (see KeyboardLayer), so no hint about them there.
  const admin = useRouterState({
    select: (state) => /^\/admin(\/|$)/i.test(state.location.pathname),
  });
  return (
    <footer className="font-sans text-[0.875rem] text-muted">
      <div className="wrap pb-[max(48px,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center gap-x-6 border-t border-rule pt-4">
          <p className="order-last mt-3 w-full sm:order-none sm:mt-0 sm:mr-auto sm:w-auto">
            Ryan Yogan &middot; Chicago
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            data-testid="keys-hint"
            className={`quiet hidden ${admin ? "" : "lg:inline-flex"}`}
            onClick={() => openDialog("help")}
          >
            Press&nbsp;<kbd className="kbd">?</kbd>&nbsp;for keys
          </button>
          <Link to="/now" className="quiet link">
            Now
          </Link>
          {footerLinks.map((link) => (
            <a
              key={link.href}
              className="quiet link"
              href={link.href}
              target="_blank"
              // "me": these profiles are the same person as this site (XFN, IndieAuth).
              rel="me noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
          <a className="quiet link" href="/rss.xml">
            RSS
          </a>
          <a className="quiet link" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}

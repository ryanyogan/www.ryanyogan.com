import { useRouterState } from "@tanstack/react-router";
import { contactEmail, footerLinks } from "@repo/shared";
import { openDialog } from "~/lib/keys";

export function Footer() {
  // No shortcuts under /admin (see KeyboardLayer), so no hint about them there.
  const admin = useRouterState({
    select: (state) => /^\/admin(\/|$)/i.test(state.location.pathname),
  });
  return (
    <footer className="border-t border-rule-strong pt-[26px] pb-10 text-[0.95rem] text-muted">
      <div className="wrap flex flex-wrap justify-between gap-x-10 gap-y-5">
        <div>
          <p>Ryan Yogan &middot; Chicago</p>
          <p>Leads teams. Builds agent systems. Coaches hockey.</p>
          <p className={`mt-2 hidden ${admin ? "" : "lg:block"}`} data-testid="keys-hint">
            <button
              type="button"
              aria-haspopup="dialog"
              className="cursor-pointer hover:text-ink"
              onClick={() => openDialog("help")}
            >
              Press <kbd className="kbd">?</kbd> for keys
            </button>
          </p>
        </div>

        <div className="max-w-[34em]">
          <p>
            Open to advising, fractional engineering leadership, and a small number of builds.{" "}
            <a className="link text-ink-soft" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <a className="link" href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a className="link" href="/rss.xml">
                RSS
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

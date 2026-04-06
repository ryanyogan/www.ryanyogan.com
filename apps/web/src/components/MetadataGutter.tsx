import type { ReactNode } from "react";
import { sidebarNav, socialLinks } from "@repo/shared";

export function MetadataGutter() {
  return (
    <aside className="hidden md:block md:col-span-2">
      <div className="sticky top-40 space-y-12">
        <GutterSection label="Navigation">
          {sidebarNav.map((link) => (
            <li key={link.label}>
              <a className="hover:text-primary transition-colors" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </GutterSection>

        <GutterSection label="Connect">
          {socialLinks.map((link) => (
            <li key={link.label}>
              <a
                className="hover:text-primary transition-colors"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            </li>
          ))}
        </GutterSection>
      </div>
    </aside>
  );
}

function GutterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400 mb-4">
        {label}
      </span>
      <ul className="space-y-3 font-sans text-xs tracking-wider uppercase font-medium">
        {children}
      </ul>
    </div>
  );
}

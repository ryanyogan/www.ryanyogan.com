import { footerLinks } from "@repo/shared";

export function Footer() {
  return (
    <footer className="w-full py-8 md:py-12 mt-16 md:mt-24 bg-surface-container-low">
      <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto px-5 sm:px-6 md:px-8 gap-4">
        <span className="font-sans text-[10px] tracking-widest uppercase text-neutral-500">
          &copy; {new Date().getFullYear()} Ryan Yogan. Built with precision.
        </span>

        <div className="flex gap-6 md:gap-8">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              className="font-sans text-[10px] tracking-widest uppercase text-neutral-500 hover:text-primary underline underline-offset-4"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

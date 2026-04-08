export function Hero() {
  return (
    <section className="mb-16 md:mb-32 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-16 items-end">
      <div className="md:col-span-3">
        <h1 className="font-sans font-extrabold text-[clamp(1.75rem,5vw,6rem)] tracking-tight leading-[1.1] mb-6 md:mb-10">
          <span className="block whitespace-nowrap text-primary">Engineering Leader,</span>
          <span className="block whitespace-nowrap text-primary">Builder/Tinkerer,</span>
          <span className="block whitespace-nowrap text-primary">A.I. Nerd.</span>
        </h1>
        <p className="font-serif text-lg sm:text-xl md:text-xl leading-relaxed text-on-surface-variant">
          I enjoy building full stack software in many different languages, weird AI shit,{" "}
          <a
            className="text-primary underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
            href="https://yogan.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            consulting
          </a>
          , and being a hockey dad.
        </p>
      </div>

      <div className="hidden md:flex flex-col items-end">
        <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 mb-6">
          Elsewhere
        </span>
        <div className="flex flex-col space-y-4">
          <SocialLink
            href="https://github.com/ryanyogan"
            label="GitHub"
            handle="ryanyogan"
          />
          <SocialLink
            href="https://linkedin.com/in/ryanyogan"
            label="LinkedIn"
            handle="in/ryanyogan"
          />
          <SocialLink
            href="https://twitter.com/ryanyogan"
            label="Twitter"
            handle="@ryanyogan"
          />
        </div>
      </div>
    </section>
  );
}

function SocialLink({
  href,
  label,
  handle,
}: {
  href: string;
  label: string;
  handle: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-baseline gap-3 md:flex-row-reverse"
    >
      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-on-surface-variant/40 group-hover:text-on-surface-variant/60 transition-colors">
        {label}
      </span>
      <span className="font-sans text-sm sm:text-base font-semibold text-primary group-hover:text-on-surface-variant transition-colors">
        {handle}
      </span>
    </a>
  );
}

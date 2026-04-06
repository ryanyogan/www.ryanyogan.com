import { createFileRoute } from "@tanstack/react-router";
import { workBio, workSections } from "@repo/shared";
import type { WorkRole, WorkSection } from "@repo/shared";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Work — Ryan Yogan" },
      {
        name: "description",
        content:
          "20 years building teams, shipping products, and scaling organizations from startup to IPO.",
      },
      { property: "og:title", content: "Work — Ryan Yogan" },
      {
        property: "og:description",
        content:
          "20 years building teams, shipping products, and scaling organizations from startup to IPO.",
      },
      { property: "og:url", content: "https://ryanyogan.com/work" },
    ],
  }),
  component: WorkPage,
});

function WorkPage() {
  return (
    <main className="pt-28 md:pt-40 pb-16 md:pb-24 px-5 sm:px-6 md:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-0">
      <aside className="hidden md:block md:col-span-3">
        <div className="sticky top-40 space-y-8">
          <div className="space-y-1">
            <span className="block font-sans text-[10px] tracking-[0.2em] uppercase text-on-surface-variant opacity-60">
              Archive
            </span>
            <span className="block font-sans text-sm font-bold uppercase tracking-tight">Work</span>
          </div>
          <p className="font-sans text-xs leading-relaxed text-on-surface-variant pr-12">
            20 years building teams, shipping products, and scaling organizations from startup to
            IPO.
          </p>
        </div>
      </aside>

      <section className="md:col-span-9">
        <header className="mb-12 md:mb-24">
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold tracking-tighter text-primary leading-[0.9] mb-8">
            The Career.
          </h1>
          <div className="h-px w-full bg-outline-variant opacity-20" />
        </header>

        <div className="mb-16 md:mb-32">
          <p className="text-lg text-on-surface-variant leading-relaxed max-w-2xl opacity-80">
            {workBio}
          </p>
        </div>

        {workSections.map((section) => (
          <SectionGroup key={section.label} {...section} />
        ))}

        <div className="pt-12 flex justify-between items-center border-t border-outline-variant/10">
          <span className="font-sans text-[10px] tracking-widest uppercase text-neutral-400">
            20 years of building
          </span>
          <a
            className="font-sans text-xs font-bold tracking-widest uppercase text-primary underline underline-offset-8 hover:decoration-2 transition-all"
            href="https://yogan.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hire Me
          </a>
        </div>
      </section>
    </main>
  );
}

function SectionGroup({ label, roles }: WorkSection) {
  return (
    <div className="mb-16 md:mb-32">
      <div className="flex items-baseline gap-4 mb-8 md:mb-12">
        <h2 className="font-sans text-xs font-bold tracking-[0.3em] uppercase text-on-surface-variant">
          {label}
        </h2>
        <div className="h-px flex-grow bg-outline-variant opacity-10" />
      </div>

      <div className="space-y-10 md:space-y-16">
        {roles.map((role) => (
          <RoleEntry key={`${role.company}-${role.title}`} {...role} />
        ))}
      </div>
    </div>
  );
}

function RoleEntry({ company, title, dates, location, description, highlights, tags }: WorkRole) {
  return (
    <article className="grid grid-cols-1 md:grid-cols-4 gap-4 group">
      <div className="pt-1.5 space-y-1">
        <span className="block font-sans text-xs tracking-widest uppercase text-neutral-400">
          {dates}
        </span>
        <span className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400/60">
          {location}
        </span>
      </div>
      <div className="md:col-span-3">
        <span className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400 mb-2">
          {company}
        </span>
        <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4">
          {title}
        </h3>
        <p className="text-lg text-on-surface-variant leading-relaxed max-w-2xl opacity-80 mb-6">
          {description}
        </p>
        {highlights.length > 0 && (
          <ul className="space-y-2 mb-6 max-w-2xl">
            {highlights.map((h) => (
              <li
                key={h}
                className="font-sans text-sm text-on-surface-variant/70 leading-relaxed pl-4 border-l border-outline-variant/20"
              >
                {h}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="font-sans text-[10px] tracking-widest uppercase text-neutral-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

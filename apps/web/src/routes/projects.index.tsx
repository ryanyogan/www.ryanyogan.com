import { createFileRoute, Link } from "@tanstack/react-router";
import { projectDetails } from "~/lib/content";
import type { ProjectDetail } from "~/lib/content";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Ryan Yogan" },
      {
        name: "description",
        content:
          "Open source work, side projects, and experiments in TypeScript, Elixir, Rust, and AI.",
      },
      { property: "og:title", content: "Projects — Ryan Yogan" },
      {
        property: "og:description",
        content:
          "Open source work, side projects, and experiments in TypeScript, Elixir, Rust, and AI.",
      },
      { property: "og:url", content: "https://ryanyogan.com/projects" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const grouped = projectDetails.reduce<Record<string, ProjectDetail[]>>((acc, project) => {
    if (!acc[project.year]) acc[project.year] = [];
    acc[project.year].push(project);
    return acc;
  }, {});

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <main className="pt-28 md:pt-40 pb-16 md:pb-24 px-5 sm:px-6 md:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-0">
      <aside className="hidden md:block md:col-span-3">
        <div className="sticky top-40 space-y-8">
          <div className="space-y-1">
            <span className="block font-sans text-[10px] tracking-[0.2em] uppercase text-on-surface-variant opacity-60">
              Archive
            </span>
            <span className="block font-sans text-sm font-bold uppercase tracking-tight">
              Projects
            </span>
          </div>
          <p className="font-sans text-xs leading-relaxed text-on-surface-variant pr-12">
            Selected engineering works, open-source contributions, and technical experiments.
          </p>
        </div>
      </aside>

      <section className="md:col-span-9">
        <header className="mb-12 md:mb-24">
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold tracking-tighter text-primary leading-[0.9] mb-8">
            The Workshop.
          </h1>
          <div className="h-px w-full bg-outline-variant opacity-20" />
        </header>

        {years.map((year) => (
          <YearCollection key={year} year={year} projects={grouped[year]} />
        ))}
      </section>
    </main>
  );
}

function YearCollection({ year, projects }: { year: string; projects: ProjectDetail[] }) {
  return (
    <div className="mb-16 md:mb-32">
      <div className="flex items-baseline gap-4 mb-8 md:mb-12">
        <h2 className="font-sans text-xs font-bold tracking-[0.3em] uppercase text-on-surface-variant">
          {year}
        </h2>
        <div className="h-px flex-grow bg-outline-variant opacity-10" />
      </div>

      <div className="space-y-10 md:space-y-16">
        {projects.map((project) => (
          <article key={project.slug} className="grid grid-cols-1 md:grid-cols-4 gap-4 group">
            <div className="flex flex-wrap gap-2 pt-1.5">
              {project.tech.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="font-sans text-[10px] tracking-widest uppercase text-neutral-400"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="md:col-span-3">
              <div className="flex justify-between items-baseline mb-4">
                <Link
                  to="/projects/$slug"
                  params={{ slug: project.slug }}
                  className="block font-sans text-xl sm:text-2xl md:text-3xl font-bold tracking-tight hover:text-neutral-500 transition-colors duration-300"
                >
                  {project.title}
                </Link>
                <Link
                  to="/projects/$slug"
                  params={{ slug: project.slug }}
                  className="flex items-center gap-1 font-sans text-[10px] tracking-widest uppercase text-neutral-400 hover:text-primary transition-colors"
                >
                  View <span className="text-sm">&#8599;</span>
                </Link>
              </div>
              <p className="text-lg text-on-surface-variant leading-relaxed max-w-2xl opacity-80">
                {project.tagline}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

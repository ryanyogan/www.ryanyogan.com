import { Link } from "@tanstack/react-router";
import { projectDetails } from "~/lib/content";

export function ProjectsSection() {
  const featured = projectDetails.filter((p) => p.featured).slice(0, 4);

  return (
    <section className="mb-16 md:mb-32" id="projects">
      <header className="mb-8 md:mb-12 flex items-baseline justify-between border-b border-outline-variant/10 pb-4">
        <h2 className="font-sans font-extrabold text-lg sm:text-xl md:text-2xl uppercase tracking-tight">
          Key Projects
        </h2>
        <Link
          to="/projects"
          className="font-sans text-[10px] tracking-widest uppercase text-on-surface-variant/40 hover:text-primary transition-colors"
        >
          View All
        </Link>
      </header>

      <div className="space-y-10 md:space-y-16">
        {featured.map((project) => (
          <article
            key={project.slug}
            className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 group"
          >
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5">
              {project.tech.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="font-sans text-[10px] tracking-widest uppercase text-on-surface-variant/40"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="md:col-span-3">
              <Link
                to="/projects/$slug"
                params={{ slug: project.slug }}
                className="block"
              >
                <h3 className="font-sans font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight group-hover:text-on-surface-variant/60 transition-colors mb-3">
                  {project.title}
                </h3>
                <p className="font-serif text-base md:text-lg text-on-surface-variant leading-relaxed">
                  {project.tagline}
                </p>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

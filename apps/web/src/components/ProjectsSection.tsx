import { Link } from "@tanstack/react-router";
import { projectDetails } from "@repo/shared";

export function ProjectsSection() {
  const featured = projectDetails.filter((p) => p.featured).slice(0, 4);

  return (
    <section className="mb-32" id="projects">
      <header className="mb-12 flex items-baseline justify-between border-b border-outline-variant/10 pb-4">
        <h2 className="font-sans font-bold text-2xl uppercase tracking-tighter">Key Projects</h2>
        <Link
          to="/projects"
          className="font-sans text-[10px] tracking-widest uppercase text-neutral-500 hover:text-primary"
        >
          View All
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {featured.map((project) => (
          <Link
            key={project.slug}
            to="/projects/$slug"
            params={{ slug: project.slug }}
            className="group flex flex-col"
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tech.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="font-sans text-[10px] tracking-widest uppercase text-neutral-400"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="font-sans font-bold text-xl mb-3 group-hover:text-neutral-600 transition-colors">
              {project.title}
            </h3>
            <p className="font-serif text-on-surface-variant leading-relaxed mb-6">
              {project.tagline}
            </p>
            <span className="mt-auto font-sans text-[10px] tracking-widest uppercase font-bold border-b border-primary inline-block w-fit">
              View Project
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

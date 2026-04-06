import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { projectDetails } from "@repo/shared";
import { Prose } from "~/components/Prose";

export const Route = createFileRoute("/projects/$slug")({
  component: ProjectDetailPage,
  loader: ({ params }) => {
    const project = projectDetails.find((p) => p.slug === params.slug);
    if (!project) throw notFound();
    return project;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.title} — Ryan Yogan` },
      { name: "description", content: loaderData.tagline },
      { property: "og:title", content: loaderData.title },
      { property: "og:description", content: loaderData.tagline },
      { property: "og:url", content: `https://ryanyogan.com/projects/${loaderData.slug}` },
    ],
  }),
});

function ProjectDetailPage() {
  const project = Route.useLoaderData();

  return (
    <main className="pt-40 pb-24 px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-0">
      <aside className="hidden md:block md:col-span-3">
        <div className="sticky top-40 space-y-8">
          <Link
            to="/projects"
            className="font-sans text-[10px] tracking-widest uppercase text-neutral-400 hover:text-primary transition-colors"
          >
            &larr; Projects
          </Link>
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="block font-sans text-[10px] tracking-[0.2em] uppercase text-on-surface-variant opacity-60">
                Stack
              </span>
              {project.tech.map((t) => (
                <span key={t} className="block font-sans text-xs text-on-surface-variant">
                  {t}
                </span>
              ))}
            </div>
            {project.github && (
              <a
                href={project.github}
                className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub &#8599;
              </a>
            )}
            {project.live && (
              <a
                href={project.live}
                className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Live Site &#8599;
              </a>
            )}
          </div>
        </div>
      </aside>
      <article className="md:col-span-9">
        <header className="mb-16">
          <Link
            to="/projects"
            className="md:hidden font-sans text-[10px] tracking-widest uppercase text-neutral-400 hover:text-primary mb-8 block"
          >
            &larr; Projects
          </Link>
          <h1 className="font-sans text-4xl md:text-6xl font-extrabold tracking-tighter text-primary leading-[0.95] mb-4">
            {project.title}
          </h1>
          <p className="font-serif text-xl text-on-surface-variant italic mb-4">
            {project.tagline}
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tech.map((t) => (
              <span
                key={t}
                className="bg-surface-container-highest px-3 py-1 font-sans text-[10px] tracking-widest uppercase font-bold text-on-surface-variant"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="flex gap-6 mb-8">
            {project.github && (
              <a
                href={project.github}
                className="font-sans text-xs tracking-widest uppercase text-neutral-400 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub &#8599;
              </a>
            )}
            {project.live && (
              <a
                href={project.live}
                className="font-sans text-xs tracking-widest uppercase text-neutral-400 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Live Site &#8599;
              </a>
            )}
          </div>
          <div className="h-px w-full bg-outline-variant opacity-20" />
        </header>
        <Prose content={project.content} />
      </article>
    </main>
  );
}

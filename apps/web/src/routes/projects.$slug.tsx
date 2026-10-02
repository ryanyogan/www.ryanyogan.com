import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { projectGroups } from "@repo/shared";
import { ProjectLinks } from "~/components/ProjectLinks";
import { Prose } from "~/components/Prose";
import { StatusPill } from "~/components/StatusPill";
import { PROJECT_PAGE_CACHE, fetchProject } from "~/lib/projects.functions";
import { absoluteUrl, canonical, pageTitle } from "~/lib/seo";

export const Route = createFileRoute("/projects/$slug")({
  component: ProjectDetailPage,
  loader: async ({ params }) => {
    // Null for an unknown slug and for a draft: both are a plain 404.
    const found = await fetchProject({ data: params.slug });
    if (!found) throw notFound();
    return found;
  },
  headers: ({ loaderData }) => ({
    "Cache-Control": loaderData ? PROJECT_PAGE_CACHE : "no-store",
  }),
  head: ({ loaderData }) => {
    // The loader throws notFound() for an unknown slug, and head still runs.
    if (!loaderData) return {};
    const { project } = loaderData;
    return {
      meta: [
        { title: pageTitle(project.title) },
        { name: "description", content: project.tagline },
        { property: "og:title", content: pageTitle(project.title) },
        { property: "og:description", content: project.tagline },
        { property: "og:url", content: absoluteUrl(`/projects/${project.slug}`) },
      ],
      links: canonical(`/projects/${project.slug}`),
    };
  },
});

function ProjectDetailPage() {
  const { project, siblings } = Route.useLoaderData();
  const group = projectGroups.find((g) => g.id === project.group);
  const at = siblings.findIndex((p) => p.slug === project.slug);
  const previous = at > 0 ? siblings[at - 1] : undefined;
  const next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined;

  return (
    <main id="main" className="pb-[clamp(48px,8vw,96px)]">
      <article className="wrap">
        <header className="border-b-2 border-build pt-[clamp(32px,6vw,72px)] pb-[clamp(22px,3vw,32px)]">
          <p className="label flex flex-wrap gap-x-2 gap-y-1">
            <Link to="/projects" className="link">
              Projects
            </Link>
            {group && (
              <>
                <span aria-hidden="true">/</span>
                <Link to="/projects" hash={group.id} className="link">
                  {group.title}
                </Link>
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="display text-[clamp(2.2rem,6vw,3.6rem)]">{project.title}</h1>
            <StatusPill status={project.status} label={project.statusLabel} />
          </div>
          <p className="mt-4 max-w-[62ch] text-[1.125rem] text-ink-soft">{project.tagline}</p>
          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              <dt className="label">Stack</dt>
              <dd className="mt-1 font-mono text-[0.82rem] tracking-[0.03em] text-ink-soft">
                {project.tech.join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="label">Links</dt>
              <dd className="mt-1">
                <ProjectLinks project={project} />
              </dd>
            </div>
          </dl>
        </header>

        <div className="max-w-[68ch] pt-[clamp(24px,4vw,40px)]">
          <Prose content={project.content} />
        </div>
      </article>

      <nav aria-label="More projects" className="wrap mt-[clamp(36px,6vw,64px)]">
        <div className="grid grid-cols-1 gap-4 border-t border-rule-strong pt-6 sm:grid-cols-2">
          {previous ? (
            <Link
              to="/projects/$slug"
              params={{ slug: previous.slug }}
              className="group rounded-card border border-rule bg-surface p-4 hover:border-build"
            >
              <span className="label block">&larr; Previous in {group?.title}</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                {previous.title}
              </span>
            </Link>
          ) : (
            <Link
              to="/projects"
              className="group rounded-card border border-rule bg-surface p-4 hover:border-build"
            >
              <span className="label block">&larr; Back</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                All projects
              </span>
            </Link>
          )}
          {next ? (
            <Link
              to="/projects/$slug"
              params={{ slug: next.slug }}
              className="group rounded-card border border-rule bg-surface p-4 hover:border-build sm:text-right"
            >
              <span className="label block">Next in {group?.title} &rarr;</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                {next.title}
              </span>
            </Link>
          ) : previous ? (
            <Link
              to="/projects"
              className="group rounded-card border border-rule bg-surface p-4 hover:border-build sm:text-right"
            >
              <span className="label block">Back &rarr;</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                All projects
              </span>
            </Link>
          ) : null}
        </div>
      </nav>
    </main>
  );
}

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { projectGroups } from "@repo/shared";
import { ProjectLinks } from "~/components/ProjectLinks";
import { Prose } from "~/components/Prose";
import { StatusPill } from "~/components/StatusPill";
import { PROJECT_PAGE_CACHE, fetchProject } from "~/lib/projects.functions";
import { breadcrumbNode, pageTitle, projectNode, seo } from "~/lib/seo";

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
    const path = `/projects/${project.slug}`;
    return seo({
      title: pageTitle(project.title),
      description: project.tagline,
      path,
      graph: [
        projectNode(project),
        breadcrumbNode([
          { name: "Projects", path: "/projects" },
          { name: project.title, path },
        ]),
      ],
    });
  },
});

function ProjectDetailPage() {
  const { project, siblings } = Route.useLoaderData();
  const group = projectGroups.find((g) => g.id === project.group);
  const at = siblings.findIndex((p) => p.slug === project.slug);
  const previous = at > 0 ? siblings[at - 1] : undefined;
  const next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined;

  return (
    <main id="main" className="wrap">
      <article>
        <header className="row pd-head">
          <div className="col push">
            <p className="crumbs">
              <Link to="/projects">Projects</Link>
              {group && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link to="/projects" hash={group.id}>
                    {group.title}
                  </Link>
                </>
              )}
            </p>
            <div className="pd-title">
              <h1>{project.title}</h1>
              <StatusPill status={project.status} label={project.statusLabel} />
            </div>
            <p className="lede">{project.tagline}</p>
            <dl className="pd-meta">
              <div>
                <dt>Stack</dt>
                <dd className="tech">{project.tech.join(" · ")}</dd>
              </div>
              <div>
                <dt>Links</dt>
                <dd>
                  <ProjectLinks project={project} />
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="row pd-body">
          <Prose className="col push read" html={project.html} />
        </div>
      </article>

      <nav aria-label="More projects" className="row">
        <div className="col push pd-nav">
          {previous ? (
            <Link to="/projects/$slug" params={{ slug: previous.slug }}>
              <span>&larr; Previous in {group?.title}</span>
              {previous.title}
            </Link>
          ) : (
            <Link to="/projects">
              <span>&larr; Back</span>
              All projects
            </Link>
          )}
          {next ? (
            <Link to="/projects/$slug" params={{ slug: next.slug }}>
              <span>Next in {group?.title} &rarr;</span>
              {next.title}
            </Link>
          ) : previous ? (
            <Link to="/projects">
              <span>Back &rarr;</span>
              All projects
            </Link>
          ) : null}
        </div>
      </nav>
    </main>
  );
}

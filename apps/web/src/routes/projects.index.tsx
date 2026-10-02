import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { contactEmail, projectGroups } from "@repo/shared";
import type { Project, ProjectStatus } from "@repo/shared";
import { StatusMarks } from "~/components/PageArt";
import { ProjectLinks } from "~/components/ProjectLinks";
import { StatusPill } from "~/components/StatusPill";
import { PROJECT_PAGE_CACHE, fetchProjects } from "~/lib/projects.functions";
import { collectionNode, pageTitle, seo } from "~/lib/seo";
import { staticOgImage } from "~/lib/og-images";

const description =
  "Agent memory, MCP servers, durable AI workflows and desktop tools. Everything I've built, with its real status.";

export const Route = createFileRoute("/projects/")({
  // loaderData is missing when the loader failed (a 500): the page then has no item list.
  head: ({ loaderData }) =>
    seo({
      title: pageTitle("Projects"),
      description,
      path: "/projects",
      image: staticOgImage("/projects"),
      graph: [
        collectionNode({
          name: pageTitle("Projects"),
          description,
          path: "/projects",
          items: (loaderData ?? []).map((project) => ({
            name: project.title,
            path: `/projects/${project.slug}`,
          })),
        }),
      ],
    }),
  loader: () => fetchProjects(),
  headers: () => ({ "Cache-Control": PROJECT_PAGE_CACHE }),
  component: ProjectsPage,
});

type Filter = "all" | "running" | "prototype";

const filters: { id: Filter; label: string; statuses: ProjectStatus[] | null }[] = [
  { id: "all", label: "All", statuses: null },
  { id: "running", label: "Running or live", statuses: ["running", "live"] },
  { id: "prototype", label: "Prototype", statuses: ["prototype"] },
];

function ProjectsPage() {
  const all = Route.useLoaderData();
  const total = all.length;
  const [filter, setFilter] = useState<Filter>("all");
  const statuses = filters.find((f) => f.id === filter)?.statuses ?? null;

  const groups = projectGroups
    .map((info) => ({
      info,
      projects: all.filter(
        (p) => p.group === info.id && (!statuses || statuses.includes(p.status)),
      ),
    }))
    .filter((g) => g.projects.length > 0);
  const shown = groups.reduce((n, g) => n + g.projects.length, 0);

  return (
    <main id="main" className="wrap">
      <section className="row first" aria-labelledby="proj-h">
        <div className="gut">
          <p className="who">
            <b>Projects</b>The build side, in full.
          </p>
        </div>
        <div className="col hero">
          <div>
            <h1 id="proj-h">Everything I&rsquo;ve built, with its real status.</h1>
            <p className="lede">
              Live means you can open it. Prototype means prototype. Private means I will describe
              it and not link it. Nothing here is rounded up.
            </p>
            <div role="group" aria-label="Filter projects by status" className="pick">
              <span>Show</span>
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
              <span role="status">
                Showing {shown} of {total}
              </span>
            </div>
          </div>
          <StatusMarks projects={all} />
        </div>
      </section>

      {groups.map(({ info, projects }) => (
        <section
          key={info.id}
          id={info.id}
          aria-labelledby={`${info.id}-h`}
          className="row scroll-mt-24"
        >
          <div className="gut">
            <h2 id={`${info.id}-h`} className="lab">
              {info.title}
            </h2>
            <p className="gnote">{info.blurb}</p>
          </div>
          <div className="col">
            {projects.map((project) => (
              <ProjectRow key={project.slug} project={project} />
            ))}
          </div>
        </section>
      ))}

      <section className="row" aria-labelledby="proj-open-h">
        <div className="gut">
          <p className="lab">If one of these is close to what you need</p>
        </div>
        <div className="col">
          <h2 id="proj-open-h" className="h-xl">
            I take on a small number of builds.
          </h2>
          <p className="after mt-3!">
            MCP servers, agent memory, and Cloudflare-native AI products.{" "}
            <Link to="/work" hash="work-open" className="tlink">
              The full list of what I&rsquo;m open to &rarr;
            </Link>
          </p>
          <p>
            <a className="mail" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <article className="proj">
      <header>
        <h3>
          <Link to="/projects/$slug" params={{ slug: project.slug }} data-kb-item>
            {project.title}
          </Link>
        </h3>
        <StatusPill status={project.status} label={project.statusLabel} />
      </header>
      <p>{project.tagline}</p>
      <div className="meta">
        <span className="tech">{project.tech.join(" · ")}</span>
        <ProjectLinks project={project} />
      </div>
    </article>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { projectGroups } from "@repo/shared";
import type { Project, ProjectStatus } from "@repo/shared";
import { ProjectLinks } from "~/components/ProjectLinks";
import { StatusPill } from "~/components/StatusPill";
import { PROJECT_PAGE_CACHE, fetchProjects } from "~/lib/projects.functions";
import { collectionNode, pageTitle, seo } from "~/lib/seo";

const description =
  "Agent memory, MCP servers, durable AI workflows and desktop tools. Everything I've built, with its real status.";

export const Route = createFileRoute("/projects/")({
  // loaderData is missing when the loader failed (a 500): the page then has no item list.
  head: ({ loaderData }) =>
    seo({
      title: pageTitle("Projects"),
      description,
      path: "/projects",
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

const statusKey: { status: ProjectStatus; label?: string }[] = [
  { status: "live" },
  { status: "running", label: "Running locally" },
  { status: "prototype" },
  { status: "private" },
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
    <main id="main" className="pb-[clamp(48px,8vw,96px)]">
      <div className="wrap">
        <section aria-labelledby="proj-h" className="pt-[clamp(40px,7vw,84px)]">
          <span className="label">Projects &middot; the build side, in full</span>
          <h1 id="proj-h" className="display mt-3 max-w-[18ch] text-[clamp(2.2rem,6vw,4rem)]">
            Everything I&rsquo;ve built, with its real status.
          </h1>
          <p className="mt-5 max-w-[62ch] text-[1.125rem] text-ink-soft">
            Live means you can open it. Prototype means prototype. Private means I will describe it
            and not link it. Nothing here is rounded up.
          </p>

          <nav aria-label="Project groups" className="mt-7 flex flex-wrap gap-2">
            {projectGroups.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="rounded-full border border-rule-strong px-3.5 py-1 text-[0.95rem] font-semibold text-ink-soft hover:bg-surface hover:text-ink"
              >
                {g.title}
              </a>
            ))}
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span className="label mr-1">Status key</span>
            {statusKey.map((s) => (
              <StatusPill key={s.status} status={s.status} label={s.label} />
            ))}
          </div>

          <div
            role="group"
            aria-label="Filter projects by status"
            className="mt-5 flex flex-wrap items-center gap-2"
          >
            <span className="label mr-1">Show</span>
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`min-h-9 cursor-pointer rounded-full border px-3.5 py-1 text-[0.95rem] font-semibold ${
                  filter === f.id
                    ? "border-ink bg-ink text-paper"
                    : "border-rule-strong text-ink-soft hover:bg-surface hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span role="status" className="label ml-1">
              Showing {shown} of {total}
            </span>
          </div>
        </section>

        {groups.map(({ info, projects }) => (
          <section
            key={info.id}
            id={info.id}
            aria-labelledby={`${info.id}-h`}
            className="scroll-mt-24 pt-[clamp(40px,6vw,68px)]"
          >
            <div className="grid grid-cols-1 items-baseline gap-x-8 gap-y-1.5 border-b-2 border-build pb-3.5 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
              <h2 id={`${info.id}-h`} className="display text-[clamp(1.5rem,3vw,2rem)]">
                {info.title}
              </h2>
              <p className="text-muted">{info.blurb}</p>
            </div>
            <ul className="mt-[18px] grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
              {projects.map((project) => (
                <li key={project.slug} className="flex min-w-0 md:last:odd:col-span-2">
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section
          aria-labelledby="proj-open-h"
          className="mt-[clamp(48px,7vw,84px)] border-t border-rule-strong pt-[clamp(28px,4vw,44px)]"
        >
          <span className="label">If one of these is close to what you need</span>
          <h2 id="proj-open-h" className="display mt-2 text-[clamp(1.5rem,3vw,2rem)]">
            I take on a small number of builds.
          </h2>
          <p className="mt-3 max-w-[62ch] text-ink-soft">
            MCP servers, agent memory, and Cloudflare-native AI products.{" "}
            <Link to="/work" hash="work-open" className="link">
              The full list of what I&rsquo;m open to &rarr;
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="flex w-full min-w-0 flex-col gap-2.5 rounded-card border border-rule bg-surface p-[clamp(18px,2.4vw,26px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
        <h3 className="display text-[1.5rem]">
          <Link
            to="/projects/$slug"
            params={{ slug: project.slug }}
            data-kb-item
            className="underline decoration-rule-strong decoration-1 underline-offset-[0.18em] hover:decoration-build hover:decoration-2"
          >
            {project.title}
          </Link>
        </h3>
        <StatusPill status={project.status} label={project.statusLabel} />
      </div>
      <p className="font-mono text-[0.76rem] tracking-[0.03em] text-muted">
        {project.tech.join(" · ")}
      </p>
      <p className="text-ink-soft">{project.tagline}</p>
      <div className="mt-auto pt-1.5">
        <ProjectLinks project={project} />
      </div>
    </article>
  );
}

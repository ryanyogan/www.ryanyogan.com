import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { projectGroups } from "@repo/shared";
import { StatusPill } from "~/components/StatusPill";
import { adminListProjects, adminMoveProject } from "~/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/")({
  loader: () => adminListProjects(),
  component: AdminProjects,
});

function AdminProjects() {
  const projects = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const drafts = projects.filter((p) => !p.published).length;

  async function move(slug: string, title: string, direction: "up" | "down") {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminMoveProject({ data: { slug, direction } });
      await router.invalidate();
      setMessage(result.ok ? `Moved ${title} ${direction}.` : `${title} could not be moved.`);
    } catch {
      setMessage("The move failed. Reload the page and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(1.8rem,4vw,2.6rem)]">Projects</h1>
          <p className="mt-2 text-ink-soft">
            {projects.length} in total, {drafts} unpublished.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/import" className="adm-btn">
            Import from GitHub
          </Link>
          <Link to="/admin/projects/new" className="adm-btn adm-btn-primary">
            New project
          </Link>
        </div>
      </div>
      <p role="status" className="mt-3 min-h-6 font-semibold text-build">
        {message}
      </p>

      {projectGroups.map((group) => {
        const rows = projects.filter((p) => p.group === group.id);
        return (
          <section key={group.id} aria-labelledby={`adm-${group.id}`} className="mt-8">
            <h2
              id={`adm-${group.id}`}
              className="display border-b border-rule-strong pb-2 text-[1.35rem]"
            >
              {group.title} <span className="label ml-1">{rows.length}</span>
            </h2>
            {rows.length === 0 ? (
              <p className="mt-3 text-muted">No projects in this group.</p>
            ) : (
              <ol className="m-0 list-none p-0">
                {rows.map((project, index) => (
                  <li
                    key={project.slug}
                    data-slug={project.slug}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule py-3"
                  >
                    <div className="min-w-0 flex-1 basis-[260px]">
                      <Link
                        to="/admin/projects/$slug"
                        params={{ slug: project.slug }}
                        className="link text-[1.1rem] font-semibold"
                      >
                        {project.title}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <StatusPill status={project.status} label={project.statusLabel} />
                        <span
                          className={`label ${project.published ? "!text-build" : "!text-lead"}`}
                        >
                          {project.published ? "Published" : "Draft"}
                        </span>
                        <span className="label">Source: {project.source}</span>
                        <span className="label">
                          Updated{" "}
                          <time dateTime={project.updatedAt}>{project.updatedAt.slice(0, 10)}</time>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={busy || index === 0}
                        aria-label={`Move ${project.title} up`}
                        onClick={() => move(project.slug, project.title, "up")}
                      >
                        <span aria-hidden="true">&uarr;</span>
                      </button>
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={busy || index === rows.length - 1}
                        aria-label={`Move ${project.title} down`}
                        onClick={() => move(project.slug, project.title, "down")}
                      >
                        <span aria-hidden="true">&darr;</span>
                      </button>
                      <Link
                        to="/admin/projects/$slug"
                        params={{ slug: project.slug }}
                        className="adm-btn"
                        aria-label={`Edit ${project.title}`}
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </>
  );
}

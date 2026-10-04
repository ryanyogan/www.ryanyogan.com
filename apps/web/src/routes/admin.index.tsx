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
      <div className="adm-head flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1>Projects</h1>
          <p className="mt-2 text-ink-soft">
            {projects.length} in total, {drafts} unpublished.
          </p>
        </div>
        <div className="adm-actions">
          <Link to="/admin/import" className="adm-btn">
            Import from GitHub
          </Link>
          <Link to="/admin/projects/new" className="adm-btn adm-btn-primary">
            New project
          </Link>
        </div>
      </div>
      <p role="status" className="adm-ok min-h-6">
        {message}
      </p>

      {projectGroups.map((group) => {
        const rows = projects.filter((p) => p.group === group.id);
        return (
          <section
            key={group.id}
            aria-labelledby={`adm-${group.id}`}
            className="row adm-group mt-6"
          >
            <h2 id={`adm-${group.id}`} className="lab gut">
              {group.title} <span className="ml-1 font-normal">{rows.length}</span>
            </h2>
            {rows.length === 0 ? (
              <p className="col text-muted">No projects in this group.</p>
            ) : (
              <ol className="col adm-rows">
                {rows.map((project, index) => (
                  <li key={project.slug} data-slug={project.slug}>
                    <div className="min-w-0 flex-1 basis-[260px]">
                      <Link
                        to="/admin/projects/$slug"
                        params={{ slug: project.slug }}
                        className="link adm-title"
                      >
                        {project.title}
                      </Link>
                      <div className="adm-meta">
                        <span className={project.published ? undefined : "font-medium text-ink"}>
                          {project.published ? "Published" : "Draft"}
                        </span>
                        <StatusPill status={project.status} label={project.statusLabel} />
                        <span>Source: {project.source}</span>
                        <span>
                          Updated{" "}
                          <time dateTime={project.updatedAt}>{project.updatedAt.slice(0, 10)}</time>
                        </span>
                      </div>
                    </div>
                    <div className="adm-actions">
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

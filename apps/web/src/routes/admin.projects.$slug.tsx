import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProjectForm, toFormValues } from "~/components/admin/ProjectForm";
import { adminGetProject, adminRefreshFromGithub } from "~/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/projects/$slug")({
  loader: async ({ params }) => {
    const project = await adminGetProject({ data: params.slug });
    if (!project) throw notFound();
    return project;
  },
  component: EditProject,
});

function EditProject() {
  const project = Route.useLoaderData();
  return (
    <>
      <h1 className="mt-10">Edit {project.title}</h1>
      <p className="small mt-2">
        {project.published ? "Published" : "Draft"} &middot; source: {project.source} &middot;
        updated <time dateTime={project.updatedAt}>{project.updatedAt.slice(0, 10)}</time>
        {project.aiGeneratedAt && (
          <span data-testid="ai-generated-at">
            {" "}
            &middot; AI draft text accepted {project.aiGeneratedAt.slice(0, 10)}
          </span>
        )}
      </p>
      {project.repoFullName && (
        <GithubStats
          key={`gh-${project.slug}`}
          slug={project.slug}
          repoFullName={project.repoFullName}
          stars={project.stars}
          pushedAt={project.repoPushedAt}
        />
      )}
      {/* Keyed so that going to another project resets the form state. */}
      <ProjectForm
        key={project.slug}
        mode="edit"
        initial={toFormValues(project)}
        repoFullName={project.repoFullName}
      />
    </>
  );
}

/**
 * The GitHub bookkeeping of an imported project, with "Refresh from GitHub": that updates
 * the star count and last-push date only, never the text in the form below. Its message is
 * not a `role="status"` so the form keeps the page's only one.
 */
function GithubStats(props: {
  slug: string;
  repoFullName: string;
  stars: number | null;
  pushedAt: string | null;
}) {
  const [stars, setStars] = useState(props.stars);
  const [pushedAt, setPushedAt] = useState(props.pushedAt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRefreshFromGithub({ data: props.slug });
      if (result.ok) {
        setStars(result.stars);
        setPushedAt(result.pushedAt);
        setMessage("Stars and last push updated.");
      } else setMessage(result.error);
    } catch {
      setMessage("The refresh failed. Reload the page and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="github-stats"
      className="small mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-rule py-1"
    >
      <span className="break-all">GitHub: {props.repoFullName}</span>
      <span>Stars: {stars ?? "unknown"}</span>
      <span>Last push: {pushedAt ? pushedAt.slice(0, 10) : "unknown"}</span>
      <button type="button" className="adm-btn" disabled={busy} onClick={refresh}>
        {busy ? "Refreshing..." : "Refresh from GitHub"}
      </button>
      <span aria-live="polite" data-testid="github-refresh-message" className="adm-ok">
        {message}
      </span>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ProjectForm, emptyProjectForm } from "~/components/admin/ProjectForm";

export const Route = createFileRoute("/admin/projects/new")({
  component: NewProject,
});

function NewProject() {
  return (
    <>
      <h1 className="display mt-8 text-[clamp(1.8rem,4vw,2.6rem)]">New project</h1>
      <p className="mt-2 max-w-[62ch] text-ink-soft">
        Starts as a draft unless you tick Published. The slug becomes the URL and cannot be changed
        later.
      </p>
      <ProjectForm mode="create" initial={emptyProjectForm} />
    </>
  );
}

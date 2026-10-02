import type { Project } from "@repo/shared";

function host(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Outbound links for a project. Says so in text when there is nothing to link. */
export function ProjectLinks({ project }: { project: Project }) {
  if (!project.github && !project.live) {
    return (
      <p className="text-[0.93rem] text-muted">
        {project.status === "private" ? "Private. No link." : "No public link."}
      </p>
    );
  }

  return (
    <ul className="flex list-none flex-wrap gap-x-[18px] gap-y-1 p-0 text-[0.97rem] font-semibold">
      {project.live && (
        <li>
          <a href={project.live} target="_blank" rel="noopener noreferrer" className="link">
            {host(project.live)} &#8599;
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      )}
      {project.github && (
        <li>
          <a href={project.github} target="_blank" rel="noopener noreferrer" className="link">
            Source on GitHub &#8599;
            <span className="sr-only"> for {project.title} (opens in a new tab)</span>
          </a>
        </li>
      )}
    </ul>
  );
}

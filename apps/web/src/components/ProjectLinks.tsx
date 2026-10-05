import type { Project } from "@repo/shared";

function host(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Outbound links for a project. Says so in text when there is nothing to link. */
export function ProjectLinks({ project }: { project: Project }) {
  if (!project.github && !project.live) {
    return (
      <p className="ext none">
        {project.status === "private"
          ? "Private, so there is no link."
          : "There is no public link for this one."}
      </p>
    );
  }

  return (
    <ul className="ext">
      {project.live && (
        <li>
          <a href={project.live} target="_blank" rel="noopener noreferrer">
            {host(project.live)} &#8599;
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      )}
      {project.github && (
        <li>
          <a href={project.github} target="_blank" rel="noopener noreferrer">
            Source on GitHub &#8599;
            <span className="sr-only"> for {project.title} (opens in a new tab)</span>
          </a>
        </li>
      )}
    </ul>
  );
}

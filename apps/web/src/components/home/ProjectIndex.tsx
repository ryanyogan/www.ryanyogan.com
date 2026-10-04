import { Link } from "@tanstack/react-router";
import { projectGroups } from "@repo/shared";
import type { Project } from "@repo/shared";
import { StatusPill } from "~/components/StatusPill";
import { ProjectGraph } from "./HomeArt";

const words = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
].concat([
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
]);

/**
 * The first project of each group, in group order, up to `limit`: the owner picks them with
 * each project's `order` in /admin. The whole list is on /projects.
 */
export function ProjectIndex({ projects: all, limit }: { projects: Project[]; limit: number }) {
  const groups = projectGroups
    .map((group) => all.filter((p) => p.group === group.id))
    .filter((projects) => projects.length > 0);
  const shown = groups.map((projects) => projects[0]!).slice(0, limit);

  return (
    <section aria-labelledby="idx-h" className="row">
      <div className="gut">
        <h2 id="idx-h" className="lab">
          What I&rsquo;ve built
        </h2>
        <p className="gnote">
          {words[all.length] ?? all.length} entries in {(words[groups.length] ?? "").toLowerCase()}{" "}
          groups, each with its real status.
        </p>
      </div>
      <div className="col idx">
        <div>
          <ul className="plist">
            {shown.map((project) => (
              <li key={project.slug}>
                <Link to="/projects/$slug" params={{ slug: project.slug }} data-kb-item>
                  {project.title}
                </Link>
                <StatusPill status={project.status} label={project.statusLabel} />
                <span className="sum">{project.summary}</span>
              </li>
            ))}
          </ul>
          <p className="more">
            <Link to="/projects">All projects</Link>
          </p>
        </div>
        <ProjectGraph projects={all} />
      </div>
    </section>
  );
}

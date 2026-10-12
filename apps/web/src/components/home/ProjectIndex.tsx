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
    <section aria-labelledby="idx-h">
      <h2 id="idx-h" className="sec-h">
        What I&rsquo;ve built
      </h2>
      <p className="stand">
        {words[all.length] ?? all.length} entries in {(words[groups.length] ?? "").toLowerCase()}{" "}
        groups, each with its real status.
      </p>
      <ProjectGraph projects={all} />
      <ul className="plist">
        {shown.map((project) => (
          <li key={project.slug}>
            <Link to="/projects/$slug" params={{ slug: project.slug }} data-kb-item>
              <b>{project.title}</b>
              <StatusPill status={project.status} label={project.statusLabel} />
              <span className="sum">{project.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/projects" className="cta">
        <span>All projects &rarr;</span>
      </Link>
    </section>
  );
}

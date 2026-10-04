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
].concat(["Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen"]);

export function ProjectIndex({ projects: all }: { projects: Project[] }) {
  const groups = projectGroups
    .map((group) => ({ group, projects: all.filter((p) => p.group === group.id) }))
    .filter((g) => g.projects.length > 0);
  const count = groups.reduce((n, g) => n + g.projects.length, 0);

  return (
    <section aria-labelledby="idx-h" className="row">
      <div className="gut">
        <h2 id="idx-h" className="lab">
          What I&rsquo;ve built
        </h2>
        <p className="gnote">
          {words[count] ?? count} entries in {(words[groups.length] ?? "").toLowerCase()} groups,
          each with its real status.
        </p>
      </div>
      <div className="col idx">
        {groups.map(({ group, projects }) => (
          <div key={group.id}>
            <div className="grp">
              <h3 className="h-m">{group.title}</h3>
              <p className="small">{group.blurb}</p>
            </div>
            <ul className="plist">
              {projects.map((project) => (
                <li key={project.slug}>
                  <Link to="/projects/$slug" params={{ slug: project.slug }} data-kb-item>
                    {project.title}
                  </Link>
                  <StatusPill status={project.status} label={project.statusLabel} />
                  <span className="sum">{project.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="end">
          <ProjectGraph projects={all} />
          <p className="more">
            <Link to="/projects">Full project notes &rarr;</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

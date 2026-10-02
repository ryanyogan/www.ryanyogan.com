import { Link } from "@tanstack/react-router";
import { projectGroups } from "@repo/shared";
import type { Project } from "@repo/shared";
import { StatusPill } from "~/components/StatusPill";
import { BlockHead } from "./BlockHead";

export function ProjectIndex({ projects: all }: { projects: Project[] }) {
  return (
    <section aria-labelledby="idx-h" className="pt-[clamp(52px,7vw,88px)]">
      <BlockHead id="idx-h" title="What I've built">
        <Link to="/projects" className="link font-semibold whitespace-nowrap">
          Full project notes &rarr;
        </Link>
      </BlockHead>

      <div>
        {projectGroups.map((group) => {
          const projects = all.filter((p) => p.group === group.id);
          return (
            <div
              key={group.id}
              className="grid grid-cols-1 gap-x-8 gap-y-2 border-b border-rule py-[22px] first:pt-0 md:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]"
            >
              <div>
                <h3 className="display text-[1.22rem] leading-[1.2] tracking-[-0.005em]">
                  {group.title}
                </h3>
                <p className="mt-1 text-[0.95rem] text-muted">{group.blurb}</p>
              </div>
              <ul>
                {projects.map((project) => (
                  <li
                    key={project.slug}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[18px] gap-y-0.5 border-rule-strong py-[7px] not-first:border-t not-first:border-dotted lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]"
                  >
                    <Link
                      to="/projects/$slug"
                      params={{ slug: project.slug }}
                      data-kb-item
                      className="link justify-self-start font-bold decoration-rule-strong"
                    >
                      {project.title}
                    </Link>
                    <span className="col-span-full row-start-2 text-[0.98rem] text-ink-soft lg:col-span-1 lg:row-start-auto">
                      {project.summary}
                    </span>
                    <StatusPill status={project.status} label={project.statusLabel} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

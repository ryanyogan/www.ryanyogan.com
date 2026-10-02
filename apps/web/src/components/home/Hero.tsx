import { Link } from "@tanstack/react-router";
import type { Project } from "@repo/shared";
import type { ReactNode } from "react";
import { StatusPill } from "~/components/StatusPill";

const scaleNumbers: { from?: string; value: string; label: string }[] = [
  { from: "8", value: "65+", label: "engineers, across 11 squads, at Procore" },
  { from: "150", value: "2,300", label: "employees while I was there, then an IPO" },
  { value: "700+", label: "interviews conducted" },
  { value: "50+", label: "hires made" },
];

/** The five systems named on the build side, with the line each gets there. */
const buildSystems: { slug: string; line: string }[] = [
  {
    slug: "lincoln-project",
    line: "A cognitive substrate in Elixir/OTP that keeps thinking whether or not anyone is chatting.",
  },
  {
    slug: "nexus-mcp",
    line: "Shared memory and documentation search for agents, over MCP, on Cloudflare Workers.",
  },
  {
    slug: "level-up",
    line: "Job and resume analysis on six durable workflows with multi-model routing.",
  },
  { slug: "fizzy-do-mcp", line: "67 MCP tools across 12 categories for the Fizzy kanban." },
  {
    slug: "pneuma",
    line: "A terminal coding agent built from first principles. Second attempt.",
  },
];

export function Hero({ projects }: { projects: Project[] }) {
  return (
    <section aria-labelledby="home-h" className="pt-[clamp(40px,7vw,84px)]">
      <span className="label mb-[18px] block">
        Chicago &middot; engineering leader &middot; agent builder
      </span>
      <h1
        id="home-h"
        className="display text-[clamp(2.3rem,6.2vw,4.6rem)] [font-variation-settings:'opsz'_144]"
      >
        I lead engineering teams{" "}
        <span aria-hidden="true" className="font-normal text-gold italic">
          &amp;
        </span>
        <span className="sr-only">and</span> I build agent systems myself.
      </h1>
      <p className="mt-[22px] max-w-[40em] text-[clamp(1.1rem,1.6vw,1.3rem)] text-ink-soft">
        Twenty years of scaling engineering orgs. The last two spent deep in agent memory, MCP, and
        durable AI workflows. I do both for real, and this site is laid out so you can check.
      </p>
      <p className="mt-3 text-[0.98rem] text-muted">
        By day I lead AI engineering. That work stays off this site.
      </p>

      <div className="relative mt-[clamp(30px,4.5vw,52px)] grid grid-cols-1 overflow-hidden rounded-card border border-rule-strong md:grid-cols-2">
        <div
          aria-hidden="true"
          className="absolute top-[clamp(22px,3.4vw,44px)] left-1/2 hidden size-[54px] -translate-x-1/2 place-items-center rounded-full border border-rule-strong bg-paper font-serif text-[1.7rem] leading-none text-gold italic md:grid"
        >
          &amp;
        </div>
        <LeadSide />
        <BuildSide projects={projects} />
      </div>
    </section>
  );
}

function SideTitle({ id, word, tone }: { id: string; word: string; tone: string }) {
  return (
    <h2
      id={id}
      className="font-serif text-[clamp(2rem,4.4vw,3.3rem)] leading-none font-medium tracking-[-0.02em]"
    >
      I <span className={`italic ${tone}`}>{word}</span>
    </h2>
  );
}

function PullQuote({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <blockquote
      className={`border-l-[3px] border-current pl-4 font-serif text-[clamp(1.12rem,1.7vw,1.32rem)] leading-[1.35] italic ${tone}`}
    >
      <p className="text-ink">{children}</p>
    </blockquote>
  );
}

function LeadSide() {
  return (
    <section
      aria-labelledby="lead-h"
      className="flex flex-col gap-[26px] bg-lead-bg p-[clamp(22px,3.4vw,44px)]"
    >
      <div>
        <SideTitle id="lead-h" word="lead" tone="text-lead" />
        <p className="mt-2.5 max-w-[30em] text-ink-soft">
          I grew a UI engineering org through hypergrowth and an IPO, and I have sat on the hiring
          side of the table several hundred times.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-3.5 gap-y-3.5 min-[421px]:gap-x-[22px] min-[421px]:gap-y-[18px]">
        {scaleNumbers.map((item) => (
          <div key={item.label} className="border-t border-lead-rule pt-2.5">
            <dt className="font-serif text-[1.55rem] leading-[1.05] font-medium tracking-[-0.02em] whitespace-nowrap text-lead min-[421px]:text-[clamp(1.7rem,3.1vw,2.5rem)]">
              {item.from && (
                <>
                  {item.from}
                  <span
                    aria-hidden="true"
                    className="px-[0.12em] align-[0.12em] text-[0.6em] text-ink-soft"
                  >
                    &rarr;
                  </span>
                  <span className="sr-only"> to </span>
                </>
              )}
              {item.value}
            </dt>
            <dd className="mt-1 text-[0.95rem] leading-[1.4] text-ink-soft">{item.label}</dd>
          </div>
        ))}
      </dl>

      <ul className="text-[0.97rem] leading-[1.45] text-ink-soft [&>li]:border-t [&>li]:border-lead-rule [&>li]:py-2.5 [&>li:last-child]:border-b [&_b]:text-ink">
        <li>
          <b>Co-founder and CTO</b> of an AI startup in construction procurement. Built and led a
          team of 8.
        </li>
        <li>
          <b>VP of R&amp;D at Sonian.</b> Moved 900+ instances to serverless and cut costs 40%+.
        </li>
        <li>
          <b>Coined &ldquo;Empathy Driven Development.&rdquo;</b>
        </li>
      </ul>

      <PullQuote tone="text-lead">
        &ldquo;The team you build is more important than the product you build.&rdquo;
      </PullQuote>

      <p className="mt-auto font-semibold">
        <Link to="/work" className="link">
          Read the manual for working with me &rarr;
        </Link>
      </p>
    </section>
  );
}

function BuildSide({ projects }: { projects: Project[] }) {
  const systems = buildSystems.flatMap(({ slug, line }) => {
    const project = projects.find((p) => p.slug === slug);
    return project ? [{ project, line }] : [];
  });

  return (
    <section
      aria-labelledby="build-h"
      className="flex flex-col gap-[26px] border-t border-rule-strong bg-build-bg p-[clamp(22px,3.4vw,44px)] md:border-t-0 md:border-l"
    >
      <div>
        <SideTitle id="build-h" word="build" tone="text-build" />
        <p className="mt-2.5 max-w-[30em] text-ink-soft">
          Not prototypes handed to someone else. Systems I designed, wrote and keep running, with
          the status stated plainly.
        </p>
      </div>

      <ul>
        {systems.map(({ project, line }) => (
          <li
            key={project.slug}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3.5 gap-y-0.5 border-t border-build-rule py-[11px] last:border-b"
          >
            <Link
              to="/projects/$slug"
              params={{ slug: project.slug }}
              className="link justify-self-start font-serif text-[1.2rem] font-semibold decoration-build-rule"
            >
              {project.title}
            </Link>
            <StatusPill status={project.status} label={project.statusLabel} />
            <span className="col-span-full text-[0.95rem] leading-[1.45] text-ink-soft">
              {line}
            </span>
          </li>
        ))}
      </ul>

      <PullQuote tone="text-build">
        &ldquo;I would rather publish a negative result than another feature.&rdquo;
      </PullQuote>

      <p className="mt-auto font-semibold">
        <Link to="/projects" className="link">
          See every project and its status &rarr;
        </Link>
      </p>
    </section>
  );
}

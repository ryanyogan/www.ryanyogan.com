import { Link, createFileRoute } from "@tanstack/react-router";
import { contactEmail, workSections } from "@repo/shared";
import type { ReactNode } from "react";
import { pageTitle, seo } from "~/lib/seo";

export const Route = createFileRoute("/work")({
  head: () =>
    seo({
      title: pageTitle("Work"),
      description:
        "How to work with Ryan Yogan: how he leads, what he has scaled, what he is building now, what he is open to, and a compact timeline.",
      path: "/work",
    }),
  component: WorkPage,
});

const chapters = [
  { id: "work-lead", no: "01", title: "How I lead" },
  { id: "work-scale", no: "02", title: "What I've scaled" },
  { id: "work-now", no: "03", title: "What I'm building now" },
  { id: "work-open", no: "04", title: "What I'm open to" },
  { id: "work-timeline", no: "05", title: "Timeline" },
] as const;

/** Each quote is the owner's own, from the brief. Headings are plain labels for them. */
const principles: { heading: string; quote: string }[] = [
  {
    heading: "I say so when I'm wrong",
    quote: "The most important thing I ever did as a manager was publicly admit when I was wrong.",
  },
  {
    heading: "The team owns its process",
    quote: "Teams that own their process outperform teams that inherit it.",
  },
  {
    heading: "The team comes before the product",
    quote: "The team you build is more important than the product you build.",
  },
  {
    heading: "I hire for how people think with others",
    quote:
      "The best engineers I've ever worked with weren't the ones who could solve the hardest algorithm problems. They were the ones who could explain their thinking, listen to feedback, and make everyone around them better.",
  },
];

const scale: { from?: string; value: string; label: string }[] = [
  { from: "8", value: "65+", label: "UI engineers at Procore, across 11 squads" },
  { from: "150", value: "2,300", label: "employees at Procore over that stretch, through an IPO" },
  { value: "700+", label: "interviews conducted" },
  { value: "50+", label: "hires made" },
  { value: "900+", label: "instances moved to serverless at Sonian, cutting costs 40%+" },
  { value: "8", label: "people on the team I built and led as co-founder and CTO" },
];

const arc: { when: string; title: string; body: string; quote?: string }[] = [
  {
    when: "2025",
    title: "Study.",
    body: "Sandboxed coding agents, Cloudflare Workflows, structured output, and an LLM-from-scratch course.",
  },
  {
    when: "Feb to Apr 2026",
    title: "Original work begins.",
    body: "An autonomous memory agent on Durable Objects, then a shared memory layer over MCP, then a deployed workflow product, then a published MCP server, then Lincoln: 140 commits in April alone.",
  },
  {
    when: "May to Jul 2026",
    title: "A coding agent, twice.",
    body: "I built my own terminal coding agent from first principles, twice.",
  },
  {
    when: "Sep 2026",
    title: "The audit.",
    body: "I went back to Lincoln and published an audit of my own claims.",
    quote: "I would rather publish a negative result than another feature.",
  },
];

const themes = [
  "Agent memory and persistence",
  "MCP",
  "Durable background execution",
  "Cost-aware model routing",
];

const offers: { label: string; title: string; detail?: string; basis: string }[] = [
  {
    label: "Advising",
    title: "Teams building agent systems",
    basis: "Lincoln, Nexus, Pneuma",
  },
  {
    label: "Fractional",
    title: "Engineering leadership",
    basis: "8 to 65+ engineers, 700+ interviews, 50+ hires, a team of 8 as CTO",
  },
  {
    label: "Builds",
    title: "A small number of builds",
    detail: "MCP servers, agent memory, Cloudflare-native AI products.",
    basis: "Fizzy Do MCP, Nexus, Level Up",
  },
];

function WorkPage() {
  return (
    <main id="main" className="wrap pb-[72px]">
      <header className="pt-[clamp(40px,7vw,84px)]">
        <span className="label mb-[18px] block">Work &middot; a manual, not a resume</span>
        <h1 className="display text-[clamp(2.3rem,6.2vw,4.6rem)] [font-variation-settings:'opsz'_144]">
          How to work with me.
        </h1>
        <p className="mt-[22px] max-w-[40em] text-[clamp(1.1rem,1.6vw,1.3rem)] text-ink-soft">
          How I lead, what I have scaled, what I am building now, and what I am open to. The
          timeline comes last.
        </p>
      </header>

      <div className="mt-[clamp(28px,4vw,48px)] grid grid-cols-1 gap-x-[clamp(24px,5vw,72px)] gap-y-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Contents" className="self-start lg:sticky lg:top-[84px]">
          <span className="label">Contents</span>
          <ol className="mt-3 grid gap-0.5 border-l border-rule-strong">
            {chapters.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="-ml-px grid grid-cols-[2em_1fr] border-l-2 border-transparent px-3 py-1.5 text-[0.98rem] leading-[1.3] text-ink-soft hover:border-gold hover:text-ink"
                >
                  <span className="pt-[0.15em] font-mono text-[0.75rem] text-muted">{c.no}</span>
                  {c.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          <Chapter index={0}>
            <p className={intro}>
              I call the approach Empathy Driven Development, a term I coined.
            </p>
            <div className="mt-[26px]">
              {principles.map((p, i) => (
                <article
                  key={p.heading}
                  className="grid grid-cols-1 gap-x-9 gap-y-3 border-t border-rule py-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                >
                  <h3 className="display text-[1.45rem]">
                    <span aria-hidden="true" className="mr-[0.4em] text-lead italic">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {p.heading}
                  </h3>
                  <blockquote
                    className={`self-start border-l-[3px] border-lead py-0.5 pl-[18px] font-serif leading-[1.38] ${
                      p.quote.length > 120 ? "text-[1.1rem]" : "text-[1.25rem]"
                    }`}
                  >
                    <p>&ldquo;{p.quote}&rdquo;</p>
                  </blockquote>
                </article>
              ))}
            </div>
          </Chapter>

          <Chapter index={1}>
            <dl className="mt-[26px] grid grid-cols-1 gap-px overflow-hidden rounded-card border border-lead-rule bg-lead-rule sm:grid-cols-2 xl:grid-cols-3">
              {scale.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col-reverse justify-end bg-lead-bg px-[22px] py-5"
                >
                  <dt className="mt-1.5 text-[0.96rem] leading-[1.4] text-ink-soft">{s.label}</dt>
                  <dd className="font-serif text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.05] font-medium tracking-[-0.02em] text-lead">
                    {s.from && (
                      <>
                        {s.from}
                        <span aria-hidden="true" className="px-[0.12em] text-[0.6em] text-ink-soft">
                          &rarr;
                        </span>
                        <span className="sr-only"> to </span>
                      </>
                    )}
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Chapter>

          <Chapter index={2}>
            <p className={intro}>
              Twenty years of scaling orgs; the last two spent deep in agent memory, MCP, and
              durable AI workflows.
            </p>
            <ol className="mt-[26px] grid gap-5 border-l-2 border-build">
              {arc.map((a) => (
                <li
                  key={a.when}
                  className="relative pl-[22px] before:absolute before:top-[0.5em] before:-left-[7px] before:size-3 before:rounded-full before:border-2 before:border-build before:bg-paper"
                >
                  <span className="block font-mono text-[0.78rem] tracking-[0.06em] text-build uppercase">
                    {a.when}
                  </span>
                  <p className="max-w-[44em] text-ink-soft">
                    <b className="text-ink">{a.title}</b> {a.body}
                  </p>
                  {a.quote && (
                    <blockquote className="mt-2 max-w-[44em] border-l-[3px] border-build pl-3.5 font-serif text-[1.1rem] leading-[1.38]">
                      <p>&ldquo;{a.quote}&rdquo;</p>
                    </blockquote>
                  )}
                </li>
              ))}
            </ol>
            <ul aria-label="Recurring themes" className="mt-[26px] flex flex-wrap gap-2">
              {themes.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-build-rule bg-build-bg px-3.5 py-[5px] text-[0.95rem] font-semibold"
                >
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-[22px] max-w-[44em] text-[0.98rem] text-muted">
              GitHub contributions doubled year over year: 812, then 1,656. By day I lead AI
              engineering. That work stays off this site.{" "}
              <Link to="/projects" className="link text-ink-soft">
                The rest is on the Projects page &rarr;
              </Link>
            </p>
          </Chapter>

          <Chapter index={3}>
            <p className={intro}>Three kinds of work, each based on something I have done.</p>
            <div className="mt-[26px] grid grid-cols-1 gap-4 md:grid-cols-3">
              {offers.map((o) => (
                <article
                  key={o.label}
                  className="flex flex-col gap-2.5 rounded-card border border-rule-strong bg-surface p-[22px]"
                >
                  <span className="label">{o.label}</span>
                  <h3 className="display text-[1.28rem]">{o.title}</h3>
                  {o.detail && <p className="text-[0.99rem] text-ink-soft">{o.detail}</p>}
                  <p className="mt-auto border-t border-dotted border-rule-strong pt-3 text-[0.92rem] text-muted">
                    <b className="font-semibold text-ink-soft">Based on:</b> {o.basis}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-[22px] text-ink-soft">
              One way in. Tell me what you are building and where it is stuck.
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-2 inline-block font-serif text-[clamp(1.25rem,2.4vw,1.7rem)] font-medium underline decoration-gold decoration-2 underline-offset-[0.18em] hover:decoration-4"
            >
              {contactEmail}
            </a>
          </Chapter>

          <Chapter index={4}>
            {workSections.map((section) => (
              <div key={section.label} className="mt-[22px]">
                <h3 className="label">{section.label}</h3>
                <ol className="mt-2 border-b border-rule">
                  {section.roles.map((role) => (
                    <li
                      key={`${role.company}-${role.dates}`}
                      className="grid grid-cols-1 gap-x-7 gap-y-0.5 border-t border-rule py-[13px] md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
                    >
                      <div>
                        <span className="block font-serif text-[1.12rem] leading-[1.3] font-semibold">
                          {role.company}
                        </span>
                        <span className="block text-[0.93rem] text-muted">{role.title}</span>
                      </div>
                      <div>
                        <span className="block font-mono text-[0.78rem] tracking-[0.04em] text-muted">
                          {role.dates}
                        </span>
                        <p className="text-ink-soft">{role.summary}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </Chapter>
        </div>
      </div>
    </main>
  );
}

const intro = "mt-3 max-w-[42em] text-[1.1rem] text-ink-soft";

function Chapter({ index, children }: { index: number; children: ReactNode }) {
  const c = chapters[index];
  if (!c) return null;
  const headingId = `${c.id}-h`;
  return (
    <section
      id={c.id}
      aria-labelledby={headingId}
      className={`scroll-mt-[84px] pb-[clamp(40px,6vw,68px)] ${
        index > 0 ? "border-t border-rule-strong pt-[clamp(34px,5vw,56px)]" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="mb-2 block font-mono text-[0.8rem] tracking-[0.08em] text-muted"
      >
        {c.no}
      </span>
      <h2 id={headingId} className="display text-[clamp(1.7rem,3.4vw,2.5rem)]">
        {c.title}
      </h2>
      {children}
    </section>
  );
}

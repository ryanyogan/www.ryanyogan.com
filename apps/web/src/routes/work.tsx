import { Link, createFileRoute } from "@tanstack/react-router";
import { contactEmail, workSections } from "@repo/shared";
import type { ReactNode } from "react";
import { AgentLoop } from "~/components/PageArt";
import { WEBSITE_ID, absoluteUrl, pageTitle, personNode, seo } from "~/lib/seo";

export const Route = createFileRoute("/work")({
  head: () =>
    seo({
      title: pageTitle("Work"),
      description:
        "How to work with Ryan Yogan: how he leads, what he has scaled, what he is building now, what he is open to, and a compact timeline.",
      path: "/work",
      type: "profile",
      meta: [
        { property: "profile:first_name", content: "Ryan" },
        { property: "profile:last_name", content: "Yogan" },
      ],
      graph: [
        {
          "@type": "ProfilePage",
          "@id": absoluteUrl("/work"),
          url: absoluteUrl("/work"),
          name: pageTitle("Work"),
          isPartOf: { "@id": WEBSITE_ID },
          mainEntity: personNode(),
        },
      ],
    }),
  component: WorkPage,
});

const chapters = [
  { id: "work-lead", title: "How I lead" },
  { id: "work-scale", title: "What I've scaled" },
  { id: "work-now", title: "What I'm building now" },
  { id: "work-open", title: "What I'm open to" },
  { id: "work-timeline", title: "Timeline" },
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
  "agent memory and persistence",
  "MCP",
  "durable background execution",
  "cost-aware model routing",
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
    <main id="main" className="wrap">
      <section className="row first" aria-labelledby="work-h">
        <div className="gut">
          <p className="who">
            <b>Work</b>A manual, not a resume.
          </p>
        </div>
        <div className="col">
          <h1 id="work-h">How to work with me.</h1>
          <p className="lede">
            How I lead, what I have scaled, what I am building now, and what I am open to. The
            timeline comes last.
          </p>
        </div>
      </section>

      <Chapter index={0} note="I call the approach Empathy Driven Development, a term I coined.">
        <ol className="prin">
          {principles.map((p) => (
            <li key={p.heading}>
              <h3 className="h-m">{p.heading}</h3>
              <blockquote>
                <p>&ldquo;{p.quote}&rdquo;</p>
              </blockquote>
            </li>
          ))}
        </ol>
      </Chapter>

      <Chapter index={1}>
        <dl className="figs">
          {scale.map((s) => (
            <div key={s.label}>
              <dt>
                {s.from && (
                  <>
                    {s.from}
                    <i aria-hidden="true">&rarr;</i>
                    <span className="sr-only"> to </span>
                  </>
                )}
                {s.value}
              </dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </Chapter>

      <Chapter
        index={2}
        note="Twenty years of scaling orgs; the last two spent deep in agent memory, MCP, and durable AI workflows."
      >
        <div className="now">
          <ol className="arc">
            {arc.map((a) => (
              <li key={a.when}>
                <span className="when">{a.when}</span>
                <p>
                  <b>{a.title}</b> {a.body}
                  {a.quote && <> &ldquo;{a.quote}&rdquo;</>}
                </p>
              </li>
            ))}
          </ol>
          <AgentLoop />
        </div>
        <p className="after">
          Recurring themes: {themes.slice(0, -1).join(", ")}, and {themes.at(-1)}.
        </p>
        <p className="small mt-2 max-w-[36rem]">
          GitHub contributions doubled year over year: 812, then 1,656. By day I lead AI
          engineering. That work stays off this site.{" "}
          <Link to="/projects" className="tlink">
            The rest is on the Projects page &rarr;
          </Link>
        </p>
      </Chapter>

      <Chapter index={3} note="Three kinds of work, each based on something I have done.">
        <ul className="offers">
          {offers.map((o) => (
            <li key={o.label}>
              <span className="k">{o.label}</span>
              <span className="t">
                {o.title}
                {o.detail && <>: {o.detail}</>}
              </span>
              <span className="b">Based on: {o.basis}</span>
            </li>
          ))}
        </ul>
        <p className="after">One way in. Tell me what you are building and where it is stuck.</p>
        <p>
          <a className="mail" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
        </p>
      </Chapter>

      <Chapter index={4} note="Company, title, years, one line each.">
        {workSections.map((section) => (
          <div key={section.label} className="tl">
            <h3>{section.label}</h3>
            <ol>
              {section.roles.map((role) => (
                <li key={`${role.company}-${role.dates}`}>
                  <span className="d">{role.dates}</span>
                  <span className="c">
                    {role.company}
                    <span>{role.title}</span>
                  </span>
                  <span className="s">{role.summary}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </Chapter>
    </main>
  );
}

function Chapter({ index, note, children }: { index: number; note?: string; children: ReactNode }) {
  const c = chapters[index];
  if (!c) return null;
  const headingId = `${c.id}-h`;
  return (
    <section id={c.id} aria-labelledby={headingId} className="row scroll-mt-[84px]">
      <div className="gut">
        <h2 id={headingId} className="lab">
          {c.title}
        </h2>
        {note && <p className="gnote">{note}</p>}
      </div>
      <div className="col">{children}</div>
    </section>
  );
}

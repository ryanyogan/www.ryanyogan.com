import { Link, createFileRoute } from "@tanstack/react-router";
import { contactEmail, workSections } from "@repo/shared";
import type { ReactNode } from "react";
import { AgentLoop, OrgTree } from "~/components/PageArt";
import { PERSON_BIO, WEBSITE_ID, absoluteUrl, pageTitle, personNode, seo } from "~/lib/seo";
import { staticOgImage } from "~/lib/og-images";

export const Route = createFileRoute("/work")({
  head: () =>
    seo({
      title: pageTitle("Work"),
      description:
        "Work with Ryan Yogan. Here is how he likes to work: how he leads, what he has scaled, what he is building now, what he is open to, and a compact timeline.",
      path: "/work",
      image: staticOgImage("/work"),
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
    when: "2025 to Apr 2026",
    title: "Study, then original work.",
    body: "Sandboxed coding agents, Cloudflare Workflows and an LLM-from-scratch course. Then a memory agent, a shared memory layer over MCP, a published MCP server, and Lincoln: 140 commits in April alone.",
  },
  {
    when: "May to Jul 2026",
    title: "A coding agent, twice.",
    body: "I built my own terminal coding agent from first principles, twice.",
  },
  {
    when: "Jun 2026",
    title: "Joined Chromatic.",
    body: "I lead AI engineering and still write code: MCP servers that let coding agents work with a product, evaluation of whether an agent finishes a workflow, core services, and observability.",
  },
  {
    when: "Aug 2026",
    title: "The Linux desktop.",
    body: "Five plugins for the bar in Omarchy, the Linux setup I run. Since then two performance patches have landed upstream with credit, and a gallery of themes is live at omarchythemes.dev.",
  },
  {
    when: "Sep 2026",
    title: "The audit.",
    body: "I went back to Lincoln and published an audit of my own claims.",
    quote: "I would rather publish a negative result than another feature.",
  },
  {
    when: "Sep to Oct 2026",
    title: "Building with agents.",
    body: "Two household apps and this site. I write the tickets and the decision records, and agents do the building.",
  },
  {
    when: "Oct 2026",
    title: "Cook.",
    body: "A warm end-to-end test runner for Phoenix apps, and an early prototype. It keeps a browser and the app running so a run skips the slow start, then returns one verdict a person or an agent can act on.",
  },
];

const themes = [
  "agent memory and persistence",
  "MCP",
  "durable background execution",
  "cost-aware model routing",
  "agent-driven development",
  "test tooling built for agents",
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
            <b>Work</b>More a manual than a resume.
          </p>
        </div>
        <div className="col head">
          <div>
            <h1 id="work-h">Work with me.</h1>
            <p className="lede">
              Here&rsquo;s how I like to work. How I lead, what I have scaled, what I am building
              now, and what I am open to. The timeline comes last.
            </p>
          </div>
          <OrgTree />
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
          Lincoln is paused for now, with its next experiment designed and ready to run. GitHub
          contributions more than doubled year over year.{" "}
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
        <p className="after">Say hello. Tell me what you are building and where it is stuck.</p>
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
                  {role.summary && <span className="s">{role.summary}</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
        {/* In the third person on purpose: a sentence a search engine can quote as it stands. */}
        <p className="after" data-testid="bio">
          {PERSON_BIO}
        </p>
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

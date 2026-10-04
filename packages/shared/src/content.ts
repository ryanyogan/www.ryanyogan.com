import type { NavLink, ProjectGroupInfo, ProjectStatus, WorkSection } from "./types";

/** Bio from the owner's live Work page. Not rendered by the current /work route. */
export const workBio =
  "Principal-level engineer with 20+ years building distributed systems, leading high-performing teams, and shipping production software at scale. Scaled Procore's UI engineering org from 8 to 65+ through hypergrowth and IPO; spent the last four years independently building production systems across AI, developer tooling, and edge infrastructure. I write code I'm proud of, hire people who get better than me, and champion empathy and curiosity.";

/**
 * Roles as the owner's LinkedIn lists them (checked 2026-10-04): same company,
 * title and dates, newest first by end date. Overlapping dates are his own.
 * `summary` is the one line the timeline shows; `description`, `highlights`
 * and `tags` are kept as data.
 */
export const workSections: WorkSection[] = [
  {
    label: "Experience",
    roles: [
      {
        company: "Chromatic",
        title: "Senior Staff Engineer",
        type: "Full-time",
        dates: "Jun 2026 — Present",
        location: "Remote",
        // LinkedIn gives this role no description. The summary is the owner's own words
        // (2026-10-04), and the site says no more than this.
        description: "",
        summary: "Lead AI engineering and build too: AI, MCP and core services.",
        highlights: [],
        tags: [],
      },
      {
        company: "Yogan Dot Dev",
        title: "Founder & Lead Engineer",
        type: "Freelance",
        dates: "Mar 2022 — Jun 2026",
        location: "Austin, TX",
        // Client names are omitted on purpose: these engagements are under NDA.
        description:
          "Enterprise consulting, startup engineering, and independent R&D across AI, real-time systems, and embedded hardware. Enterprise engagements remain under NDA.",
        summary:
          "Enterprise consulting, startup engineering, and independent R&D. Clients under NDA.",
        highlights: [
          "Built high-throughput Elixir/Phoenix data pipelines for an enterprise client — fault-tolerant event processing, OTP supervision trees",
          "Full-stack engineering for multiple startups: Next.js, TypeScript, authentication, Stripe billing, AI-powered features",
          "AI integration engagements: RAG pipelines, agentic workflows, MCP servers shipped into production systems",
          "Edge infrastructure migrations to Cloudflare Workers, D1, R2, and Durable Objects",
        ],
        tags: ["Elixir", "Phoenix", "TypeScript", "Next.js", "AI/LLM", "Cloudflare"],
      },
      {
        company: "Avant",
        title: "Engineering Lead",
        type: "Full-time",
        dates: "Jun 2025 — Jan 2026",
        location: "Chicago, IL",
        description:
          "Principal Architect and Engineering Lead. Re-architected front-end strategy across the organization, including 200K+ line TypeScript refactors that shipped without freezing feature work.",
        summary: "Re-architected front-end strategy across the organization.",
        highlights: [
          "Built internal AI-powered UI generation tooling tuned to Avant's design system and constraints",
          "Led the architecture review board and established engineering standards adopted org-wide",
          "Drove WCAG accessibility compliance and modernized animation/interaction layer using Three.js",
          "Partnered with Product and Design leadership on quarterly roadmap planning",
        ],
        tags: ["Architecture", "AI Tooling", "A11y", "Three.js", "Design Systems"],
      },
      {
        company: "Stealth AI Startup",
        title: "Co-Founder / CTO",
        type: "Full-time",
        dates: "Jan 2024 — Jun 2025",
        location: "New York, NY",
        description:
          "Co-founded an AI-powered procurement automation platform for the construction industry. Owned all technical decisions, built and led an engineering team of 8.",
        summary: "Owned all technical decisions; built and led an engineering team of 8.",
        highlights: [
          "Architected full platform: TypeScript e-commerce backend, Next.js frontend, Elixir services, custom vector stores",
          "Fine-tuned LLMs and built agentic AI workflows for purchase order automation",
          "Built VC pitch decks, ran burn analysis, established vendor relationships and incident response",
          "Established career frameworks and hiring processes from scratch",
        ],
        tags: ["Executive Leadership", "LLM/AI", "Agentic AI", "Team Building"],
      },
      {
        company: "HG Insights",
        title: "Senior Software Engineering Manager",
        type: "Full-time",
        dates: "Aug 2021 — Sep 2022",
        location: "Santa Barbara, CA",
        description:
          "Inherited a team of 7 engineers without prior management; built career frameworks, established OKRs cascading to individual KPIs.",
        summary: "Inherited a team of 7 engineers and built its career frameworks.",
        highlights: [
          "Led migration from Scala/Airflow batch system to streaming architecture, eliminating 24+ hours/week of manual intervention",
          "Collaborated with SRE on incident management and runbooks",
          "Secured raises and promotions; transformed retention from a problem to a non-issue",
        ],
        tags: ["People Development", "Data Pipelines", "Team Restructuring", "SRE Partnership"],
      },
      {
        company: "Procore Technologies",
        title: "Senior Engineering Manager",
        type: "Full-time",
        dates: "Oct 2016 — Jul 2021",
        location: "Carpinteria, CA",
        description:
          "Led UI engineering through hypergrowth (150 to 2,300 employees) and successful IPO. Scaled the UI engineering org from 8 to 65+ engineers across 11 squads.",
        summary: "Scaled the UI engineering org from 8 to 65+ engineers across 11 squads.",
        highlights: [
          "Managed 8-14 direct reports including engineering managers, with $2M+ annual budget",
          "Partnered with CFO on IPO metrics and investor reporting; participated in board-level technical discussions",
          "Interviewed 700+ candidates, hired 50+; established Technical Lead Manager role",
          "Coined 'Empathy Driven Development' — reduced enterprise feedback loops from weeks to hours",
          "Led performance initiative: critical page loads from 11s to 2s",
        ],
        tags: [
          "Organizational Scaling",
          "IPO Preparation",
          "Budget Management",
          "People Development",
        ],
      },
      {
        company: "Sonian (acquired by Barracuda)",
        title: "VP of Research and Development",
        type: "Full-time",
        dates: "Apr 2014 — Aug 2016",
        location: "Remote",
        description:
          "Promoted from Operations Engineer to VP in 4 months; managed R&D budget, resource allocation, and presented research findings to the executive team.",
        summary: "Moved 900+ EC2 instances to a Lambda architecture, reducing costs by 40%+.",
        highlights: [
          "Built direct partnership with AWS as Lambda early-access participant",
          "Transitioned 900+ EC2 instances to stream-based Lambda architecture, reducing costs by 40%+",
          "Worked alongside IBM during SoftLayer acquisition, integrating Object Store into IBM's IAM service",
          "Modernized front-end stack from Angular 1.x to ClojureScript/React",
        ],
        tags: ["R&D Leadership", "AWS Partnership", "Clojure", "Cost Optimization"],
      },
      {
        company: "Sonian (acquired by Barracuda)",
        title: "Operations Engineer",
        type: "",
        dates: "Dec 2013 — May 2014",
        location: "Boston, MA",
        description: "",
        summary: "Promoted to VP of Research and Development in four months.",
        highlights: [],
        tags: [],
      },
      // LinkedIn gives the next role no description, so it has no summary line.
      {
        company: "BradsDeals.com",
        title: "Sr. Software Engineer",
        type: "",
        dates: "Feb 2012 — Mar 2013",
        location: "",
        description: "",
        summary: "",
        highlights: [],
        tags: [],
      },
      {
        company: "PEAK6 Investments LP",
        title: "Sr. Software Engineer",
        type: "Full-time",
        dates: "Nov 2009 — Sep 2011",
        location: "Chicago, IL",
        description:
          "Led UI engineering for a high-frequency trading platform; built real-time charting in vanilla JavaScript (canvas/SVG) running on IE6 due to consumer constraints.",
        summary: "Led UI engineering for a high-frequency trading platform.",
        highlights: [
          "Built abstractions over C++/JVM platform layer exposing public methods to the UI team",
          "Designed real-time delta anomaly detection using three-node token-ring consensus pattern",
        ],
        tags: ["JavaScript", "C++", "High-Frequency Trading", "Real-time Systems"],
      },
      // No description on LinkedIn here either.
      {
        company: "linkedFA",
        title: "Software Engineer",
        type: "",
        dates: "2008 — 2010",
        location: "",
        description: "",
        summary: "",
        highlights: [],
        tags: [],
      },
      {
        company: "Broward Center for the Performing Arts",
        title: "Sr. Systems Analyst",
        type: "Full-time",
        dates: "May 2006 — Oct 2009",
        location: "Fort Lauderdale, FL",
        description:
          "Managed 200+ machines, data centers, and networks for South Florida's premier performing arts venue. First box office in the region to implement thin clients.",
        summary: "Managed 200+ machines, data centers, and networks for a performing arts venue.",
        highlights: [
          "Supported technology operations for major Broadway productions including The Lion King, Wicked, and Phantom of the Opera",
        ],
        tags: ["Infrastructure", "Data Centers", "Networking"],
      },
    ],
  },
];

export const navLinks: NavLink[] = [
  { label: "Work", href: "/work" },
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/writing" },
  { label: "Now", href: "/now" },
];

export const footerLinks: NavLink[] = [
  { label: "GitHub", href: "https://github.com/ryanyogan" },
  { label: "LinkedIn", href: "https://linkedin.com/in/ryanyogan" },
];

export const contactEmail = "ryan.yogan@hey.com";

export const projectGroups: ProjectGroupInfo[] = [
  {
    id: "agents-memory",
    title: "Agents and memory",
    blurb: "Systems that persist, remember, and keep working.",
  },
  {
    id: "tools-for-agents",
    title: "Tools for agents",
    blurb: "The parts agents call, and a harness of my own.",
  },
  {
    id: "shipped",
    title: "Shipped products",
    blurb: "Things with users in mind, not just an idea.",
  },
  {
    id: "desktop-tools",
    title: "Desktop tools people use",
    blurb: "For Linux, with vim keys, obviously.",
  },
  {
    id: "for-people-i-know",
    title: "Built for people I know",
    blurb: "My brother, my kids, my household.",
  },
];

export const projectStatusLabels: Record<ProjectStatus, string> = {
  running: "Running",
  live: "Live",
  prototype: "Prototype",
  retired: "Retired",
  private: "Private",
};

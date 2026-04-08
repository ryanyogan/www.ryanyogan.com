import type { ArchiveYear, Article, NavLink, Project, ProjectCategory, WorkSection } from "./types";

export const articles: Article[] = [
  {
    date: "March 14, 2024",
    title: "The Fallacy of Premature Abstraction in Distributed Systems",
    excerpt:
      "Exploring why early standardization of interfaces often leads to rigid systems that fail to scale under real-world pressure.",
    href: "#",
  },
  {
    date: "February 28, 2024",
    title: "Memory Safety is a People Problem",
    excerpt:
      "A deep dive into the sociological aspects of language adoption and why engineering culture dictates safety more than compilers.",
    href: "#",
  },
  {
    date: "January 12, 2024",
    title: "Rust at the Edge: Real-time Data Processing",
    excerpt:
      "Lessons learned from deploying high-throughput Rust services in geographically distributed environments.",
    href: "#",
  },
];

export const writingArchive: ArchiveYear[] = [
  {
    year: "2024",
    articles: [
      {
        month: "Oct",
        day: "12",
        title: "Engineering for Longevity: The 50-Year Tech Stack",
        excerpt:
          "Reflections on building systems that outlast their creators and the trap of modern web churn.",
        href: "#",
      },
      {
        month: "Aug",
        day: "29",
        title: "The Brutalist UI: Function as Ornament",
        excerpt: "Why we are moving away from shadows and towards a more honest, structural web.",
        href: "#",
      },
      {
        month: "Jun",
        day: "04",
        title: "Minimum Viable Beauty",
        excerpt: "A study on the intersection of technical performance and aesthetic refinement.",
        href: "#",
      },
    ],
  },
  {
    year: "2023",
    articles: [
      {
        month: "Dec",
        day: "21",
        title: "Distributed Teams and the Loss of Serendipity",
        excerpt:
          'Designing rituals to capture the "water cooler" moments in an asynchronous world.',
        href: "#",
      },
      {
        month: "Nov",
        day: "15",
        title: "On Writing Better Commit Messages",
        excerpt: "The art of documenting the 'Why' instead of the 'What' for future maintainers.",
        href: "#",
      },
      {
        month: "Sep",
        day: "02",
        title: "The Lead Engineer's Guide to Saying No",
        excerpt: "Strategic refusal as a tool for maintaining system integrity and team focus.",
        href: "#",
      },
    ],
  },
];

export const projects: Project[] = [
  {
    category: "Open Source / Tooling",
    title: "Vanguard Proxy",
    description:
      "A lightweight, Layer-7 load balancer designed for high-concurrency environments with built-in observability for WASM plugins.",
    linkLabel: "View Source",
    href: "#",
  },
  {
    category: "Infrastructure / Cloud",
    title: "Atlas Cloud SDK",
    description:
      "Type-safe cloud resource provisioning for TypeScript, focusing on local development parity and rapid iteration loops.",
    linkLabel: "View Documentation",
    href: "#",
  },
  {
    category: "Database / Storage",
    title: "LumenDB",
    description:
      "An experimental persistent key-value store optimized for NVMe drives, achieving sub-millisecond tail latencies.",
    linkLabel: "Case Study",
    href: "#",
  },
  {
    category: "CLI / Productivity",
    title: "Forge CLI",
    description:
      "Extensible workspace manager for monorepos that handles orchestration, testing, and deployment pipeline generation.",
    linkLabel: "View Project",
    href: "#",
  },
];

export const projectCategories: ProjectCategory[] = [
  {
    label: "Primary Work",
    dateRange: "2023 — Present",
    featured: [
      {
        title: "Titanium Cloud SDK",
        description:
          "A high-performance TypeScript client for managing distributed cloud infrastructure. Implemented a custom retry logic engine and zero-dependency HTTP client that reduced bundle sizes by 40% compared to legacy competitors.",
        linkLabel: "View Repository",
        href: "#",
        tags: ["TypeScript", "Rust", "gRPC"],
      },
      {
        title: "Vector.ui",
        description:
          "An accessibility-first design system for fintech applications. Built using a strict geometric grid system and CSS variables for extreme theme-ability. Integrated automated WCAG 2.1 auditing into the CI pipeline.",
        linkLabel: "Documentation",
        href: "#",
        tags: ["React", "Tailwind", "Playwright"],
      },
    ],
  },
  {
    label: "Experiments",
    dateRange: "2021 — 2022",
    experiments: [
      {
        title: "Lumina Raytracer",
        description:
          "A simple path-tracing engine written in C++ to explore light transport algorithms and spatial partitioning.",
        tech: "C++ / SIMD",
      },
      {
        title: "Kafka-Viz",
        description:
          "Real-time visualization tool for Kafka topic throughput and consumer group lag using WebSockets.",
        tech: "Go / D3.js",
      },
      {
        title: "Flux Router",
        description:
          "A minimal, type-safe router for server-side Swift applications with focus on zero-allocation path matching.",
        tech: "Swift / NIO",
      },
      {
        title: "Onyx Query",
        description:
          "An experimental DSL for querying unstructured JSON data with SQL-like syntax and WASM execution.",
        tech: "Zig / WASM",
      },
    ],
  },
];

export const workBio =
  "Engineering executive with 20 years of experience building and scaling high-performing teams. Led organizations through hypergrowth and IPO at Procore, scaling the UI engineering org from 8 to 65 engineers. Co-founded an AI startup, built the engineering org from scratch, and presented to investors. I hire well, develop people intentionally, and believe the best engineering cultures are built on trust, psychological safety, and continuous learning.";

export const workSections: WorkSection[] = [
  {
    label: "Executive & Leadership",
    roles: [
      {
        company: "Stealth AI Startup",
        title: "Co-Founder & CTO",
        type: "Full-time",
        dates: "Jan 2024 — Jun 2025",
        location: "New York",
        description:
          "Co-founded and led engineering for an AI-powered procurement automation platform for the construction industry. Built the engineering organization from the ground up.",
        highlights: [
          "Built and led engineering team of 8, establishing hiring plans and org structure",
          "Architected full platform: e-commerce backend (TypeScript), front-end (Next.js), internal services (Elixir)",
          "Developed internal LLM models and custom vector stores for procurement automation",
          "Built agentic AI systems for document parsing and supplier matching",
          "Created VC pitch decks, analyzed runway, and presented technical strategy to investors",
        ],
        tags: ["Executive Leadership", "LLM/AI", "Agentic AI", "Team Building"],
      },
      {
        company: "Avant",
        title: "Principal Architect & Engineering Lead",
        type: "Full-time",
        dates: "Jun 2025 — Jan 2026",
        location: "Chicago, Illinois",
        description:
          "Led front-end architecture transformation at this fintech company, mentoring engineers daily while driving technical excellence across the organization.",
        highlights: [
          "Re-architected front-end strategy across the organization with 200k+ line refactors",
          "Built internal AI-powered UI generation tools (similar to v0.dev/bolt.new)",
          "Drove accessibility compliance initiatives across the platform",
          "Initiated automated design system generating components from Figma designs",
          "Built animations and interactive experiences using Three.js and modern CSS",
        ],
        tags: ["Architecture", "A11y", "Design Systems", "Three.js", "Mentorship"],
      },
      {
        company: "Procore Technologies",
        title: "Senior Engineering Manager",
        type: "Full-time",
        dates: "Oct 2016 — Jul 2021",
        location: "Carpinteria, California",
        description:
          "Led engineering through hypergrowth and successful IPO. Scaled the UI organization from 8 to 65 engineers while building the frameworks, culture, and people development systems that enabled sustainable growth.",
        highlights: [
          "Managed 8-14 direct reports including engineering managers (skip-level leadership)",
          "Managed $2M+ annual engineering budget with headcount planning",
          "Scaled UI engineering org from 8 to 65 engineers across 5-8 teams",
          "Partnered with CFO/Finance on IPO engineering metrics and investor reporting",
          "Coined 'Empathy Driven Development', reducing enterprise feedback loops from weeks to hours",
          "Led org-wide performance initiative reducing page load times from 11s to 2s",
          "Interviewed 700+ candidates and personally hired 50+ engineers",
        ],
        tags: [
          "Organizational Scaling",
          "IPO Preparation",
          "Budget Management",
          "People Development",
        ],
      },
      {
        company: "HG Insights",
        title: "Senior Engineering Manager",
        type: "Full-time",
        dates: "Aug 2021 — Sep 2022",
        location: "Santa Barbara, California",
        description:
          "Led the data pipeline team through a major architectural transformation while rebuilding team culture and establishing career development frameworks.",
        highlights: [
          "Managed team of 7 engineers across UI and backend services",
          "Migrated Scala/Airflow batch system to streaming architecture, eliminating 24+ hours of manual intervention",
          "Built career ladders and development plans for each individual",
          "Restructured one large team into smaller, more effective units",
        ],
        tags: ["People Development", "Team Restructuring", "Data Pipelines", "SRE Partnership"],
      },
      {
        company: "Montway Auto Transport",
        title: "Director of Engineering",
        type: "Full-time",
        dates: "Nov 2015 — May 2016",
        location: "Chicago, Illinois",
        description:
          "Led digital transformation of auto transport logistics, managing 11 engineers to modernize an industry reliant on manual processes.",
        highlights: [
          "Built mobile applications replacing manual Bills of Lading",
          "Implemented driver and shipment tracking with computer vision for 360-degree vehicle imaging",
          "Created first-of-its-kind smart pricing system accurate within dollars",
        ],
        tags: ["Digital Transformation", "Mobile", "Computer Vision"],
      },
    ],
  },
  {
    label: "Technical & IC",
    roles: [
      {
        company: "Sonian",
        title: "VP of Research and Development",
        type: "Full-time",
        dates: "Dec 2013 — Nov 2015",
        location: "Boston, Massachusetts",
        description:
          "Promoted from Operations Engineer to VP in 4 months. Pioneered early AWS Lambda adoption and led dual-track research and product teams.",
        highlights: [
          "Built direct partnership with AWS as Lambda early access program participant",
          "Pioneered early AWS Lambda adoption, reducing infrastructure costs by 40%+",
          "Modernized stack from Angular 1.x to ClojureScript/React (Om)",
          "Led team of 4 engineers owning Clojure backend and insights dashboards",
        ],
        tags: ["R&D Leadership", "AWS Partnership", "Clojure", "Cost Optimization"],
      },
      {
        company: "Yogan Dot Dev",
        title: "Founder & Principal Consultant",
        type: "Consulting",
        dates: "Oct 2019 — Present",
        location: "Austin, Texas — Remote",
        description:
          "Independent consulting practice working with enterprise clients on complex technical challenges: Elixir/Erlang systems, advanced React patterns, legacy code modernization, and performance optimization.",
        highlights: [],
        tags: ["Elixir", "React", "Legacy Modernization", "Performance"],
      },
      {
        company: "PEAK6 Investments",
        title: "Sr. Software Engineer",
        type: "Full-time",
        dates: "Nov 2009 — Sep 2011",
        location: "Chicago, Illinois",
        description:
          "Built reactive interfaces for high-frequency trading platforms where milliseconds matter. Introduced Backbone.js (later Ember.js) to the organization.",
        highlights: [],
        tags: ["Ruby on Rails", "JavaScript", "C++", "High-Frequency Trading"],
      },
      {
        company: "BradsDeals.com",
        title: "Sr. Software Engineer",
        type: "Full-time",
        dates: "Feb 2012 — Mar 2013",
        location: "Chicago, Illinois",
        description:
          "Led migration from Cold Fusion to Ruby on Rails. Built Black Friday game experiences and prepared systems for traffic surges at scale.",
        highlights: [],
        tags: ["Ruby on Rails", "JavaScript", "Legacy Migration"],
      },
      {
        company: "Broward Center for the Performing Arts",
        title: "Sr. Systems Analyst",
        type: "Full-time",
        dates: "May 2006 — Oct 2009",
        location: "Fort Lauderdale, Florida",
        description:
          "Managed infrastructure for South Florida's premier performing arts venue: 200+ machines, data centers, networks, and VoIP. First box office to implement thin clients.",
        highlights: [],
        tags: ["Infrastructure", "Data Centers", "Networking"],
      },
    ],
  },
];

export const navLinks: NavLink[] = [
  { label: "Writing", href: "/writing" },
  { label: "Projects", href: "/projects" },
  { label: "Work", href: "/work" },
];

export const sidebarNav: NavLink[] = [
  { label: "Writing", href: "#writing" },
  { label: "Projects", href: "#projects" },

];

export const socialLinks: NavLink[] = [
  { label: "Twitter", href: "https://twitter.com/ryanyogan" },
  { label: "GitHub", href: "https://github.com/ryanyogan" },
];

export const footerLinks: NavLink[] = [
  { label: "GitHub", href: "https://github.com/ryanyogan" },
  { label: "LinkedIn", href: "https://linkedin.com/in/ryanyogan" },
  { label: "Twitter", href: "https://twitter.com/ryanyogan" },
  { label: "Hire Me", href: "https://yogan.dev" },
];

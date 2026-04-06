export interface Article {
  date: string;
  title: string;
  excerpt: string;
  href: string;
}

export interface Project {
  category: string;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
}

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

export interface ArchiveArticle {
  month: string;
  day: string;
  title: string;
  excerpt: string;
  href: string;
}

export interface ArchiveYear {
  year: string;
  articles: ArchiveArticle[];
}

export interface FeaturedProject {
  title: string;
  description: string;
  linkLabel: string;
  href: string;
  tags: string[];
}

export interface ExperimentProject {
  title: string;
  description: string;
  tech: string;
}

export interface ProjectCategory {
  label: string;
  dateRange: string;
  featured?: FeaturedProject[];
  experiments?: ExperimentProject[];
}

export interface WritingPost {
  slug: string;
  title: string;
  date: string;
  year: string;
  author: string;
  excerpt: string;
  content: string;
}

export interface ProjectDetail {
  slug: string;
  title: string;
  tagline: string;
  tech: string[];
  github?: string;
  live?: string;
  year: string;
  featured?: boolean;
  content: string;
}

export interface WorkRole {
  company: string;
  title: string;
  type: string;
  dates: string;
  location: string;
  description: string;
  highlights: string[];
  tags: string[];
}

export interface WorkSection {
  label: string;
  roles: WorkRole[];
}

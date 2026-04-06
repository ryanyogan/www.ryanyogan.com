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

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw.trim() };

  const yaml = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  let currentKey = "";
  let collectingArray = false;
  const arrayValues: string[] = [];

  for (const line of yaml.split("\n")) {
    if (collectingArray) {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        arrayValues.push(stripQuotes(itemMatch[1].trim()));
        continue;
      }
      data[currentKey] = [...arrayValues];
      arrayValues.length = 0;
      collectingArray = false;
    }

    const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1];
    const value = kvMatch[2].trim();

    if (value === "") {
      currentKey = key;
      collectingArray = true;
      continue;
    }

    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = stripQuotes(value);
  }

  if (collectingArray) {
    data[currentKey] = [...arrayValues];
  }

  return { data, content: content.trim() };
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

const writingFiles = import.meta.glob("../../content/writing/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const projectFiles = import.meta.glob("../../content/projects/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(".md", "");
}

export const writingPosts: WritingPost[] = Object.entries(writingFiles)
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    return {
      slug: slugFromPath(path),
      title: data.title as string,
      date: data.date as string,
      year: data.year as string,
      author: data.author as string,
      excerpt: data.excerpt as string,
      content,
    };
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const projectDetails: ProjectDetail[] = Object.entries(projectFiles)
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    return {
      slug: slugFromPath(path),
      title: data.title as string,
      tagline: data.tagline as string,
      tech: (data.tech as string[]) ?? [],
      github: data.github as string | undefined,
      live: data.live as string | undefined,
      year: data.year as string,
      featured: data.featured as boolean | undefined,
      content,
    };
  })
  .sort((a, b) => Number(b.year) - Number(a.year));

import { createFileRoute, Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import type { WritingPost } from "~/lib/content";

export const Route = createFileRoute("/writing/")({
  head: () => ({
    meta: [
      { title: "Writing — Ryan Yogan" },
      {
        name: "description",
        content:
          "Thoughts on engineering, leadership, distributed systems, Elixir, AI, and building things.",
      },
      { property: "og:title", content: "Writing — Ryan Yogan" },
      {
        property: "og:description",
        content:
          "Thoughts on engineering, leadership, distributed systems, Elixir, AI, and building things.",
      },
      { property: "og:url", content: "https://ryanyogan.com/writing" },
    ],
  }),
  component: WritingPage,
});

function WritingPage() {
  const grouped = writingPosts.reduce<Record<string, WritingPost[]>>((acc, post) => {
    if (!acc[post.year]) acc[post.year] = [];
    acc[post.year].push(post);
    return acc;
  }, {});

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));
  const totalArticles = writingPosts.length;

  return (
    <main className="pt-28 md:pt-40 pb-16 md:pb-24 px-5 sm:px-6 md:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-0">
      <aside className="hidden md:block md:col-span-3">
        <div className="sticky top-40 space-y-8">
          <div className="space-y-1">
            <span className="block font-sans text-[10px] tracking-[0.2em] uppercase text-on-surface-variant opacity-60">
              Archive
            </span>
            <span className="block font-sans text-sm font-bold uppercase tracking-tight">
              Writing
            </span>
          </div>
          <p className="font-sans text-xs leading-relaxed text-on-surface-variant pr-12">
            A chronological record of thoughts on engineering, leadership, and digital craft.
          </p>
        </div>
      </aside>

      <section className="md:col-span-9">
        <header className="mb-12 md:mb-24">
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold tracking-tighter text-primary leading-[0.9] mb-8">
            The Archive.
          </h1>
          <div className="h-px w-full bg-outline-variant opacity-20" />
        </header>

        {years.map((year) => (
          <YearCollection key={year} year={year} posts={grouped[year]} />
        ))}

        <div className="pt-12 flex justify-between items-center border-t border-outline-variant/10">
          <span className="font-sans text-[10px] tracking-widest uppercase text-neutral-400">
            {totalArticles} articles
          </span>
        </div>
      </section>
    </main>
  );
}

function YearCollection({ year, posts }: { year: string; posts: WritingPost[] }) {
  return (
    <div className="mb-16 md:mb-32">
      <div className="flex items-baseline gap-4 mb-8 md:mb-12">
        <h2 className="font-sans text-xs font-bold tracking-[0.3em] uppercase text-on-surface-variant">
          {year}
        </h2>
        <div className="h-px flex-grow bg-outline-variant opacity-10" />
      </div>

      <div className="space-y-10 md:space-y-16">
        {posts.map((post) => (
          <article key={post.slug} className="grid grid-cols-1 md:grid-cols-4 gap-4 group">
            <div className="font-sans text-xs tracking-widest uppercase text-neutral-400 pt-1.5">
              {post.date}
            </div>
            <div className="md:col-span-3">
              <Link
                to="/writing/$slug"
                params={{ slug: post.slug }}
                className="block font-sans text-xl sm:text-2xl md:text-3xl font-bold tracking-tight hover:text-neutral-500 transition-colors duration-300"
              >
                {post.title}
              </Link>
              <p className="mt-4 text-lg text-on-surface-variant leading-relaxed max-w-2xl opacity-80">
                {post.excerpt}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

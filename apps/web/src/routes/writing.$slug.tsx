import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { writingPosts } from "@repo/shared";
import { Prose } from "~/components/Prose";

export const Route = createFileRoute("/writing/$slug")({
  component: WritingDetail,
  loader: ({ params }) => {
    const post = writingPosts.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return post;
  },
});

function WritingDetail() {
  const post = Route.useLoaderData();

  return (
    <main className="pt-40 pb-24 px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-0">
      <aside className="hidden md:block md:col-span-3">
        <div className="sticky top-40 space-y-8">
          <Link
            to="/writing"
            className="font-sans text-[10px] tracking-widest uppercase text-neutral-400 hover:text-primary transition-colors"
          >
            &larr; Back to Writing
          </Link>
          <div className="space-y-1">
            <span className="block font-sans text-[10px] tracking-[0.2em] uppercase text-on-surface-variant opacity-60">
              {post.date}
            </span>
            <span className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400">
              {post.author}
            </span>
          </div>
        </div>
      </aside>
      <article className="md:col-span-9">
        <header className="mb-16">
          <Link
            to="/writing"
            className="md:hidden font-sans text-[10px] tracking-widest uppercase text-neutral-400 hover:text-primary mb-8 block"
          >
            &larr; Back to Writing
          </Link>
          <h1 className="font-sans text-4xl md:text-6xl font-extrabold tracking-tighter text-primary leading-[0.95] mb-4">
            {post.title}
          </h1>
          <span className="font-sans text-sm text-on-surface-variant">
            {post.date} &middot; {post.author}
          </span>
          <div className="h-px w-full bg-outline-variant opacity-20 mt-8" />
        </header>
        <Prose content={post.content} />
      </article>
    </main>
  );
}

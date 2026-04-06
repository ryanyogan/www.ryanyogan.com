import { Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";

export function WritingSection() {
  const recent = writingPosts.slice(0, 3);

  return (
    <section className="mb-16 md:mb-32" id="writing">
      <header className="mb-8 md:mb-12 flex items-baseline justify-between border-b border-outline-variant/10 pb-4">
        <h2 className="font-sans font-bold text-2xl uppercase tracking-tighter">Recent Writing</h2>
        <Link
          to="/writing"
          className="font-sans text-[10px] tracking-widest uppercase text-neutral-500 hover:text-primary"
        >
          View All
        </Link>
      </header>

      <div className="space-y-10 md:space-y-16">
        {recent.map((post) => (
          <article key={post.slug} className="group">
            <Link to="/writing/$slug" params={{ slug: post.slug }} className="block">
              <span className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400 mb-2">
                {post.date}
              </span>
              <h3 className="font-sans font-bold text-2xl md:text-3xl group-hover:text-neutral-600 transition-colors mb-4">
                {post.title}
              </h3>
              <p className="font-serif text-base md:text-lg text-on-surface-variant leading-relaxed">
                {post.excerpt}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

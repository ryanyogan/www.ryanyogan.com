import { Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";

export function WritingSection() {
  const recent = writingPosts.slice(0, 3);

  return (
    <section className="mb-16 md:mb-32" id="writing">
      <header className="mb-8 md:mb-12 flex items-baseline justify-between border-b border-outline-variant/10 pb-4">
        <h2 className="font-sans font-extrabold text-lg sm:text-xl md:text-2xl uppercase tracking-tight">
          Recent Writing
        </h2>
        <Link
          to="/writing"
          className="font-sans text-[10px] tracking-widest uppercase text-on-surface-variant/40 hover:text-primary transition-colors"
        >
          View All
        </Link>
      </header>

      <div className="space-y-10 md:space-y-16">
        {recent.map((post) => (
          <article
            key={post.slug}
            className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 group"
          >
            <div className="font-sans text-[10px] tracking-widest uppercase text-on-surface-variant/40 pt-1.5">
              {post.date}
            </div>
            <div className="md:col-span-3">
              <Link
                to="/writing/$slug"
                params={{ slug: post.slug }}
                className="block"
              >
                <h3 className="font-sans font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight group-hover:text-on-surface-variant/60 transition-colors mb-3">
                  {post.title}
                </h3>
                <p className="font-serif text-base md:text-lg text-on-surface-variant leading-relaxed">
                  {post.excerpt}
                </p>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

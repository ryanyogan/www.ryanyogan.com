import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import { Prose } from "~/components/Prose";
import { absoluteUrl, canonical, pageTitle } from "~/lib/seo";

export const Route = createFileRoute("/writing/$slug")({
  component: WritingDetail,
  loader: ({ params }) => {
    const post = writingPosts.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) => {
    // The loader throws notFound() for an unknown slug, and head still runs.
    if (!post) return {};
    return {
      meta: [
        { title: pageTitle(post.title) },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:url", content: absoluteUrl(`/writing/${post.slug}`) },
        { property: "og:type", content: "article" },
        { property: "article:author", content: post.author },
        { property: "article:published_time", content: post.isoDate },
      ],
      links: canonical(`/writing/${post.slug}`),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            author: { "@type": "Person", name: post.author, url: absoluteUrl("") },
            publisher: { "@type": "Person", name: post.author },
            datePublished: post.isoDate,
          }),
        },
      ],
    };
  },
});

const cardClass = "group rounded-card border border-rule bg-surface p-4 hover:border-build";

function WritingDetail() {
  const post = Route.useLoaderData();
  // writingPosts is newest first.
  const at = writingPosts.findIndex((p) => p.slug === post.slug);
  const newer = at > 0 ? writingPosts[at - 1] : undefined;
  const older = at >= 0 && at < writingPosts.length - 1 ? writingPosts[at + 1] : undefined;

  return (
    <main id="main" className="pb-[clamp(48px,8vw,96px)]">
      <article className="wrap">
        <header className="border-b-2 border-rule-strong pt-[clamp(32px,6vw,72px)] pb-[clamp(22px,3vw,32px)]">
          <p className="label">
            <Link to="/writing" className="link">
              Writing
            </Link>
          </p>
          <h1 className="display mt-3 max-w-[24ch] text-[clamp(2.2rem,6vw,3.6rem)]">
            {post.title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[1.125rem] text-ink-soft">{post.excerpt}</p>
          <p className="mt-5 font-mono text-[0.82rem] tracking-[0.03em] text-ink-soft">
            <time dateTime={post.isoDate}>{post.date}</time> &middot; {post.author}
          </p>
        </header>

        <div className="max-w-[68ch] pt-[clamp(24px,4vw,40px)]">
          <Prose content={post.content} />
        </div>
      </article>

      <nav aria-label="More writing" className="wrap mt-[clamp(36px,6vw,64px)]">
        <div className="grid grid-cols-1 gap-4 border-t border-rule-strong pt-6 sm:grid-cols-2">
          {newer ? (
            <Link to="/writing/$slug" params={{ slug: newer.slug }} className={cardClass}>
              <span className="label block">&larr; Newer</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                {newer.title}
              </span>
            </Link>
          ) : (
            <Link to="/writing" className={cardClass}>
              <span className="label block">&larr; Back</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                All writing
              </span>
            </Link>
          )}
          {older ? (
            <Link
              to="/writing/$slug"
              params={{ slug: older.slug }}
              className={`${cardClass} sm:text-right`}
            >
              <span className="label block">Older &rarr;</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                {older.title}
              </span>
            </Link>
          ) : (
            <Link to="/writing" className={`${cardClass} sm:text-right`}>
              <span className="label block">Back &rarr;</span>
              <span className="display mt-1 block text-[1.3rem] group-hover:underline">
                All writing
              </span>
            </Link>
          )}
        </div>
      </nav>
    </main>
  );
}

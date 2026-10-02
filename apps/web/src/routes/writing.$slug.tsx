import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { loadPostHtml, writingPosts } from "~/lib/content";
import { Prose } from "~/components/Prose";
import {
  WEBSITE_ID,
  absoluteUrl,
  breadcrumbNode,
  isoDateTime,
  pageTitle,
  personRef,
  seo,
} from "~/lib/seo";

export const Route = createFileRoute("/writing/$slug")({
  component: WritingDetail,
  // Only the slug-specific part: the post's metadata is already in the bundle.
  loader: async ({ params }) => {
    const html = await loadPostHtml(params.slug);
    if (html === undefined) throw notFound();
    return { html };
  },
  head: ({ params }) => {
    // The loader throws notFound() for an unknown slug, and head still runs.
    const post = writingPosts.find((p) => p.slug === params.slug);
    if (!post) return {};
    const path = `/writing/${post.slug}`;
    const published = isoDateTime(post.isoDate);
    return seo({
      title: pageTitle(post.title),
      ogTitle: post.title,
      description: post.excerpt,
      path,
      type: "article",
      meta: [
        // ogp.me: article:author is a profile URL, not a name.
        { property: "article:author", content: absoluteUrl("/work") },
        { property: "article:published_time", content: published },
      ],
      graph: [
        {
          "@type": "BlogPosting",
          "@id": `${absoluteUrl(path)}#post`,
          headline: post.title,
          description: post.excerpt,
          url: absoluteUrl(path),
          // Posts record one date; there is no modification date to state.
          datePublished: published,
          author: personRef(),
          mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
        },
        breadcrumbNode([
          { name: "Writing", path: "/writing" },
          { name: post.title, path },
        ]),
      ],
    });
  },
});

const cardClass = "group rounded-card border border-rule bg-surface p-4 hover:border-build";

function WritingDetail() {
  const { html } = Route.useLoaderData();
  const { slug } = Route.useParams();
  // writingPosts is newest first. The loader has already answered 404 for an unknown slug.
  const at = writingPosts.findIndex((p) => p.slug === slug);
  const post = writingPosts[at];
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

        <Prose className="max-w-[68ch] pt-[clamp(24px,4vw,40px)]" html={html} />
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

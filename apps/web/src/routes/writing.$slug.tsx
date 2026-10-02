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

/** Whole minutes to read the rendered body at 230 words a minute. */
function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

function WritingDetail() {
  const { html } = Route.useLoaderData();
  const { slug } = Route.useParams();
  // writingPosts is newest first. The loader has already answered 404 for an unknown slug.
  const at = writingPosts.findIndex((p) => p.slug === slug);
  const post = writingPosts[at];
  const newer = at > 0 ? writingPosts[at - 1] : undefined;
  const older = at >= 0 && at < writingPosts.length - 1 ? writingPosts[at + 1] : undefined;

  return (
    <main id="main" className="wrap">
      <article>
        <header className="row post-head">
          <div className="col push">
            <p className="crumbs">
              <Link to="/writing">Writing</Link>
            </p>
            <h1>{post.title}</h1>
            <p className="lede">{post.excerpt}</p>
            <p className="small post-meta">
              <time dateTime={post.isoDate}>{post.date}</time> &middot; {readingMinutes(html)} min
              read &middot; {post.author}
            </p>
          </div>
        </header>

        <div className="row post-body">
          <Prose className="col push post" html={html} />
        </div>
      </article>

      <nav aria-label="More writing" className="row post-end">
        <div className="col push">
          <div className="post-nav">
            {newer && (
              <Link to="/writing/$slug" params={{ slug: newer.slug }}>
                <span>Newer</span>
                {newer.title}
              </Link>
            )}
            {older && (
              <Link to="/writing/$slug" params={{ slug: older.slug }} className="older">
                <span>Older</span>
                {older.title}
              </Link>
            )}
          </div>
          <p className="post-all">
            <Link to="/writing">All writing</Link>
          </p>
        </div>
      </nav>
    </main>
  );
}

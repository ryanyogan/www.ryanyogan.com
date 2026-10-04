import { createFileRoute, Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import type { WritingPost } from "~/lib/content";
import { collectionNode, pageTitle, seo } from "~/lib/seo";
import { staticOgImage } from "~/lib/og-images";

const description = "Build logs, one retraction, and what I learned running teams.";

export const Route = createFileRoute("/writing/")({
  head: () =>
    seo({
      title: pageTitle("Writing"),
      description,
      path: "/writing",
      image: staticOgImage("/writing"),
      graph: [
        collectionNode({
          name: pageTitle("Writing"),
          description,
          path: "/writing",
          items: writingPosts.map((post) => ({ name: post.title, path: `/writing/${post.slug}` })),
        }),
      ],
    }),
  component: WritingPage,
});

/** Posts bucketed by year, newest year first; posts keep their newest-first order. */
const years = [...new Set(writingPosts.map((post) => post.year))]
  .sort((a, b) => Number(b) - Number(a))
  .map((year) => ({ year, posts: writingPosts.filter((post) => post.year === year) }));

function monthDay(post: WritingPost): string {
  return new Date(`${post.isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function WritingPage() {
  return (
    <main id="main" className="wrap">
      <header className="row wr-head">
        <p className="gut lab">Writing</p>
        <div className="col">
          <h1 id="wr-h">Build logs, one retraction, and what I learned running teams.</h1>
          <p className="lede">
            Newest first, grouped by year. The 2026 posts are build logs for projects on this site.
            The 2024 posts cover teams, startups and embedded work.
          </p>
          <p className="small wr-count">
            {writingPosts.length} posts &middot; <a href="/rss.xml">RSS</a>
          </p>
        </div>
      </header>

      {years.map(({ year, posts }) => (
        <section key={year} aria-labelledby={`y-${year}`} className="row wr-year">
          <div className="gut">
            <h2 id={`y-${year}`} className="lab">
              {year}
            </h2>
          </div>
          <ol className="col wlist">
            {posts.map((post) => (
              <li key={post.slug}>
                <time dateTime={post.isoDate}>{monthDay(post)}</time>
                <h3>
                  <Link to="/writing/$slug" params={{ slug: post.slug }} data-kb-item>
                    {post.title}
                  </Link>
                </h3>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import type { WritingPost } from "~/lib/content";
import { pageTitle, seo } from "~/lib/seo";

const description = "Build logs, one retraction, and what I learned running teams.";

export const Route = createFileRoute("/writing/")({
  head: () => seo({ title: pageTitle("Writing"), description, path: "/writing" }),
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
    <main id="main" className="pb-[clamp(48px,8vw,96px)]">
      <div className="wrap">
        <section aria-labelledby="wr-h" className="pt-[clamp(40px,7vw,84px)]">
          <span className="label">
            Writing &middot; {writingPosts.length} posts &middot;{" "}
            <a href="/rss.xml" className="link">
              RSS
            </a>
          </span>
          <h1 id="wr-h" className="display mt-3 max-w-[18ch] text-[clamp(2.2rem,6vw,4rem)]">
            Build logs, one retraction, and what I learned running teams.
          </h1>
          <p className="mt-5 max-w-[62ch] text-[1.125rem] text-ink-soft">
            Newest first, grouped by year. The 2026 posts are build logs for projects on this site.
            The 2024 posts cover teams, startups and embedded work.
          </p>
        </section>

        {years.map(({ year, posts }) => (
          <section
            key={year}
            aria-labelledby={`y-${year}`}
            className="mt-[clamp(36px,6vw,64px)] grid grid-cols-1 gap-x-8 border-t-2 border-rule-strong pt-5 md:grid-cols-[7rem_minmax(0,1fr)]"
          >
            <h2 id={`y-${year}`} className="display text-[1.6rem] text-ink-soft">
              {year}
            </h2>
            <ol className="mt-2 md:mt-0">
              {posts.map((post) => (
                <li key={post.slug} className="border-b border-rule py-5 first:pt-1">
                  <article>
                    <time dateTime={post.isoDate} className="label block">
                      {monthDay(post)}
                    </time>
                    <h3 className="mt-1">
                      <Link
                        to="/writing/$slug"
                        params={{ slug: post.slug }}
                        data-kb-item
                        className="link font-serif text-[clamp(1.25rem,2.6vw,1.5rem)] leading-[1.25] decoration-rule-strong"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-2 max-w-[62ch] text-ink-soft">{post.excerpt}</p>
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}

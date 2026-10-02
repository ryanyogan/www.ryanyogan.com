import { Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";

/** The posts shown on Home, newest first. Everything else is on /writing. */
const homeSlugs = new Set([
  "lincoln-six-months-later",
  "building-agent-memory-from-research-to-reality",
  "project-yogan-hockey",
  "project-puck-pro",
  "building-teams",
  "startup-lessons",
]);

function monthYear(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function WritingList() {
  const posts = writingPosts.filter((post) => homeSlugs.has(post.slug));

  return (
    <section aria-labelledby="wr-h" className="row">
      <div className="gut">
        <h2 id="wr-h" className="lab">
          Writing
        </h2>
        <p className="gnote">
          Build logs and what I learned running teams. <Link to="/writing">All writing</Link>
        </p>
      </div>
      <div className="col">
        <ol className="wlist">
          {posts.map((post) => (
            <li key={post.slug}>
              <time dateTime={post.isoDate}>{monthYear(post.isoDate)}</time>
              <Link to="/writing/$slug" params={{ slug: post.slug }} data-kb-item>
                {post.title}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

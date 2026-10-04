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

/** The two newest posts sit under the hero; the list further down leaves them out. */
const latest = writingPosts.slice(0, 2);

function fullDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function LatestWriting() {
  return (
    <section aria-labelledby="new-h" className="row latest">
      <div className="gut">
        <h2 id="new-h" className="lab">
          Latest writing
        </h2>
      </div>
      <ol className="col fresh">
        {latest.map((post) => (
          <li key={post.slug}>
            <time dateTime={post.isoDate}>{fullDate(post.isoDate)}</time>
            <Link to="/writing/$slug" params={{ slug: post.slug }} data-kb-item>
              {post.title}
            </Link>
            <p>{post.excerpt}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WritingList() {
  const posts = writingPosts.filter((post) => homeSlugs.has(post.slug) && !latest.includes(post));

  return (
    <section aria-labelledby="wr-h" className="row">
      <div className="gut">
        <h2 id="wr-h" className="lab">
          Earlier writing
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

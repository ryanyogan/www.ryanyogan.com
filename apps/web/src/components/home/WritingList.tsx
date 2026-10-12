import { Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";

function monthYear(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The newest posts, the first column under the lead. Everything else is on /writing. */
export function LatestWriting({ limit }: { limit: number }) {
  return (
    <section aria-labelledby="new-h">
      <h2 id="new-h" className="sec-h">
        Latest writing
      </h2>
      <p className="stand">Build logs and what I learned running teams.</p>
      <ol className="wlist">
        {writingPosts.slice(0, limit).map((post) => (
          <li key={post.slug}>
            <time dateTime={post.isoDate}>{monthYear(post.isoDate)}</time>
            <h3>
              <Link to="/writing/$slug" params={{ slug: post.slug }} data-kb-item>
                {post.title}
              </Link>
            </h3>
          </li>
        ))}
      </ol>
      <Link to="/writing" className="cta">
        <span>All writing &rarr;</span>
      </Link>
    </section>
  );
}

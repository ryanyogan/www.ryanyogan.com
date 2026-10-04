import { Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";

function monthYear(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The newest posts, under the hero. Everything else is on /writing. */
export function LatestWriting({ limit }: { limit: number }) {
  return (
    <section aria-labelledby="new-h" className="row">
      <div className="gut">
        <h2 id="new-h" className="lab">
          Latest writing
        </h2>
        <p className="gnote">Build logs and what I learned running teams.</p>
      </div>
      <div className="col">
        <ol className="wlist">
          {writingPosts.slice(0, limit).map((post) => (
            <li key={post.slug}>
              <time dateTime={post.isoDate}>{monthYear(post.isoDate)}</time>
              <Link to="/writing/$slug" params={{ slug: post.slug }} data-kb-item>
                {post.title}
              </Link>
            </li>
          ))}
        </ol>
        <p className="more">
          <Link to="/writing">All writing</Link>
        </p>
      </div>
    </section>
  );
}

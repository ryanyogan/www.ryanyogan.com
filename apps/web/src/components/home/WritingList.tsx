import { Link } from "@tanstack/react-router";
import { writingPosts } from "~/lib/content";
import { BlockHead } from "./BlockHead";

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
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function WritingList() {
  const posts = writingPosts.filter((post) => homeSlugs.has(post.slug));

  return (
    <section aria-labelledby="wr-h" className="pt-[clamp(52px,7vw,88px)]">
      <BlockHead id="wr-h" title="Writing">
        <p className="max-w-[34em] text-muted">
          Build logs, one retraction, and what I learned running teams.{" "}
          <Link to="/writing" className="link font-semibold whitespace-nowrap text-ink">
            All writing &rarr;
          </Link>
        </p>
      </BlockHead>

      <ol>
        {posts.map((post) => (
          <li
            key={post.slug}
            className="grid grid-cols-1 items-baseline gap-x-5 border-b border-rule py-[13px] md:grid-cols-[7rem_minmax(0,1fr)] md:gap-y-1"
          >
            <span className="font-mono text-[0.78rem] tracking-[0.06em] text-muted uppercase">
              {monthYear(post.date)}
            </span>
            <Link
              to="/writing/$slug"
              params={{ slug: post.slug }}
              data-kb-item
              className="link justify-self-start font-serif text-[1.22rem] leading-[1.25] decoration-rule-strong"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

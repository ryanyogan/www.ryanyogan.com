import { useEffect, useState } from "react";
import { TrendIcon } from "~/components/Icons";
import { VIEWS_API, formatViews, readViewCounts, readViews } from "~/lib/post-views";

/**
 * A view count: the rising-trend icon and the number, read out as "1,204 views". With no
 * number (not loaded yet, or the request failed) it is an empty box of the same size
 * (`.views` in app.css), so nothing on the page moves when the number arrives, and it fades in.
 *
 * In a list of posts, pair it with `useViewCounts`, which counts nothing:
 *   const counts = useViewCounts();
 *   <ViewCount views={counts[post.slug]} />
 */
export function ViewCount({ views }: { views: number | undefined }) {
  return (
    <span className="views">
      {views !== undefined && (
        <>
          <TrendIcon size={14} />
          <span>
            {formatViews(views)}
            <span className="sr-only"> views</span>
          </span>
        </>
      )}
    </span>
  );
}

/** A post's own count on its page: counts this view (see `useCountedView`) and shows the total. */
export function PostViews({ slug }: { slug: string }) {
  return <ViewCount views={useCountedView(slug)} />;
}

async function fetchJson(url: string, method: "GET" | "POST"): Promise<unknown> {
  try {
    const response = await fetch(url, { method });
    // Read before the status is looked at: Chromium keeps a request open until its body
    // has been read, an error's too.
    const body: unknown = await response.json();
    return response.ok ? body : undefined;
  } catch {
    // Offline, blocked or not JSON: the count is decoration, the page goes without it.
    return undefined;
  }
}

/** The requests in flight, by slug. */
const counting = new Map<string, Promise<number | undefined>>();

/**
 * Counts one view of a post. A second call for the same slug while the first is still in
 * flight shares its request: React's strict mode runs a mount effect twice in development,
 * and that must stay one view.
 */
function countView(slug: string): Promise<number | undefined> {
  let request = counting.get(slug);
  if (!request) {
    request = fetchJson(`${VIEWS_API}/${encodeURIComponent(slug)}`, "POST")
      .then(readViews)
      .finally(() => counting.delete(slug));
    counting.set(slug, request);
  }
  return request;
}

/**
 * Counts a view of `slug` and returns the new total, or undefined until it arrives and
 * when it never does. Once per mount and per slug: a reload counts again, and so does
 * arriving from another post by a link (the page stays mounted and only the slug changes).
 */
export function useCountedView(slug: string): number | undefined {
  const [counted, setCounted] = useState<{ slug: string; views: number }>();
  useEffect(() => {
    let current = true;
    void countView(slug).then((views) => {
      if (current && views !== undefined) setCounted({ slug, views });
    });
    return () => {
      current = false;
    };
  }, [slug]);
  // The previous post's number is not this post's.
  return counted?.slug === slug ? counted.views : undefined;
}

/**
 * Every post's count by slug, read once on mount and without counting anything: for lists
 * of posts. Empty until the answer arrives and when it fails; a post with no views yet has
 * no entry, so `counts[slug]` is undefined and `ViewCount` stays empty for it.
 */
export function useViewCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let current = true;
    void fetchJson(VIEWS_API, "GET").then((body) => {
      if (current) setCounts(readViewCounts(body));
    });
    return () => {
      current = false;
    };
  }, []);
  return counts;
}

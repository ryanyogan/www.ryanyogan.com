import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "~/components/Prose";
import { loadNowHtml, nowPage } from "~/lib/content";
import { staticOgImage } from "~/lib/og-images";
import { WEBSITE_ID, absoluteUrl, isoDateTime, pageTitle, personRef, seo } from "~/lib/seo";

const description =
  "What Ryan Yogan is working on and thinking about right now: household apps, Lincoln, and Linux on Omarchy.";

// The page is content/now.md (frontmatter: `updated`, `place`). It is prerendered, so an
// update is a commit; the same `updated` day is the <time> here and the sitemap's lastmod.
export const Route = createFileRoute("/now")({
  loader: async () => ({ html: await loadNowHtml() }),
  head: () =>
    seo({
      title: pageTitle("Now"),
      description,
      path: "/now",
      image: staticOgImage("/now"),
      graph: [
        {
          "@type": "WebPage",
          "@id": absoluteUrl("/now"),
          url: absoluteUrl("/now"),
          name: pageTitle("Now"),
          description,
          dateModified: isoDateTime(nowPage.isoDate),
          author: personRef(),
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
        },
      ],
    }),
  component: NowPage,
});

function NowPage() {
  const { html } = Route.useLoaderData();
  return (
    <main id="main" className="wrap">
      <article>
        <header className="row post-head">
          <p className="gut lab">Now</p>
          <div className="col">
            <h1>What I am doing now.</h1>
            <p className="small mt-[18px]">
              Updated <time dateTime={nowPage.isoDate}>{nowPage.updated}</time> &middot;{" "}
              {nowPage.place}
            </p>
          </div>
        </header>

        <div className="row post-body">
          <Prose className="col push post" html={html} />
        </div>
      </article>
    </main>
  );
}

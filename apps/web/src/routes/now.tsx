import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Camper, DrumKit } from "~/components/PageArt";
import { Prose } from "~/components/Prose";
import { loadNowHtml, nowPage, nowSections } from "~/lib/content";
import { staticOgImage } from "~/lib/og-images";
import { WEBSITE_ID, absoluteUrl, isoDateTime, pageTitle, personRef, seo } from "~/lib/seo";

const description =
  "What Ryan Yogan is doing now: work at Chromatic, building with agents, learning the drums, what he is listening to and reading, and a hockey family.";

// What a section gets besides its words, by the id of its heading (the heading's text in
// lower case with hyphens). A section whose heading is renamed keeps its words and loses
// its extra, so rename the pattern with it.
const extras: { match: RegExp; art?: () => ReactNode; list?: string }[] = [
  { match: /drum/, art: DrumKit },
  { match: /hockey|family/, art: Camper },
  // A list of short names sets in two columns where there is room.
  { match: /listening|music/, list: "cols" },
];

// The page is content/now.md (frontmatter: `updated`, `place`; then a paragraph for under the
// title; then one `## ` heading per section). It is prerendered, so an update is a commit; the
// same `updated` day is the <time> here and the sitemap's lastmod.
export const Route = createFileRoute("/now")({
  // Returns nothing: what a loader returns is written into the document a second time.
  loader: () => loadNowHtml(),
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
  const { lede, sections } = nowSections();
  return (
    <main id="main" className="wrap now">
      <article>
        <header className="row post-head">
          <p className="gut lab">Now</p>
          <div className="col">
            <h1>What I am doing now.</h1>
            {lede && <Prose className="now-lede" html={lede} />}
            <p className="small mt-4.5">
              Updated <time dateTime={nowPage.isoDate}>{nowPage.updated}</time> &middot;{" "}
              {nowPage.place}
            </p>
          </div>
        </header>

        {sections.map((section) => {
          const extra = extras.find(({ match }) => match.test(section.id));
          const Art = extra?.art;
          return (
            <section key={section.id} className="row" aria-labelledby={section.id}>
              <div className="gut">
                <h2
                  id={section.id}
                  className="lab"
                  dangerouslySetInnerHTML={{ __html: section.title }}
                />
              </div>
              <div className={Art ? "col now-sec has-art" : "col now-sec"}>
                <Prose
                  className={extra?.list ? `post ${extra.list}` : "post"}
                  html={section.html}
                />
                {Art && <Art />}
              </div>
            </section>
          );
        })}
      </article>
    </main>
  );
}

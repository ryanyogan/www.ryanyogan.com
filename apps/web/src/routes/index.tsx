import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "~/components/home/Hero";
import { LeadAndBuild } from "~/components/home/LeadAndBuild";
import { OffTheClock } from "~/components/home/OffTheClock";
import { OpenTo } from "~/components/home/OpenTo";
import { ProjectIndex } from "~/components/home/ProjectIndex";
import { WritingList } from "~/components/home/WritingList";
import { PROJECT_PAGE_CACHE, fetchProjects } from "~/lib/projects.functions";
import { SITE_DESCRIPTION, SITE_TITLE, personNode, seo, websiteNode } from "~/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      path: "/",
      graph: [websiteNode(), personNode()],
    }),
  loader: () => fetchProjects(),
  headers: () => ({ "Cache-Control": PROJECT_PAGE_CACHE }),
  component: HomePage,
});

function HomePage() {
  const projects = Route.useLoaderData();
  return (
    <main id="main" className="wrap home">
      <Hero />
      <ProjectIndex projects={projects} />
      <LeadAndBuild />
      <WritingList />
      <OffTheClock />
      <OpenTo />
    </main>
  );
}

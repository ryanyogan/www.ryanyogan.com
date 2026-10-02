import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "~/components/home/Hero";
import { OffTheClock } from "~/components/home/OffTheClock";
import { OpenTo } from "~/components/home/OpenTo";
import { ProjectIndex } from "~/components/home/ProjectIndex";
import { WhereTheTwoMeet } from "~/components/home/WhereTheTwoMeet";
import { WritingList } from "~/components/home/WritingList";
import { PROJECT_PAGE_CACHE, fetchProjects } from "~/lib/projects.functions";
import { SITE_DESCRIPTION, SITE_TITLE, seo } from "~/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" }),
  loader: () => fetchProjects(),
  headers: () => ({ "Cache-Control": PROJECT_PAGE_CACHE }),
  component: HomePage,
});

function HomePage() {
  const projects = Route.useLoaderData();
  return (
    <main id="main" className="wrap pb-[72px]">
      <Hero projects={projects} />
      <WhereTheTwoMeet />
      <ProjectIndex projects={projects} />
      <WritingList />
      <OffTheClock />
      <OpenTo />
    </main>
  );
}

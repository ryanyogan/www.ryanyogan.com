import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "~/components/Hero";
import { WritingSection } from "~/components/WritingSection";
import { ProjectsSection } from "~/components/ProjectsSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ryan Yogan — AI Systems, Dev Ex, Teams" },
      {
        name: "description",
        content:
          "Building AI systems that run autonomously, developer tools that get out of the way, and engineering teams that ship.",
      },
      { property: "og:title", content: "Ryan Yogan — AI Systems, Dev Ex, Teams" },
      {
        property: "og:description",
        content:
          "Building AI systems that run autonomously, developer tools that get out of the way, and engineering teams that ship.",
      },
      { property: "og:url", content: "https://ryanyogan.com" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="pt-24 md:pt-32 pb-16 md:pb-24 max-w-7xl mx-auto px-5 sm:px-6 md:px-8">
      <Hero />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        <div className="hidden md:block md:col-span-3" />
        <div className="md:col-span-9">
          <WritingSection />
          <ProjectsSection />
        </div>
      </div>
    </main>
  );
}

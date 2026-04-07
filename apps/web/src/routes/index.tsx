import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "~/components/Hero";
import { WritingSection } from "~/components/WritingSection";
import { ProjectsSection } from "~/components/ProjectsSection";
import { ConsultingCTA } from "~/components/ConsultingCTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ryan Yogan — Engineering Leader & Builder" },
      {
        name: "description",
        content:
          "Engineering leader with 20 years of experience. Building teams, shipping products, and writing about the craft.",
      },
      { property: "og:title", content: "Ryan Yogan — Engineering Leader & Builder" },
      {
        property: "og:description",
        content:
          "Engineering leader with 20 years of experience. Building teams, shipping products, and writing about the craft.",
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
          <ConsultingCTA />
        </div>
      </div>
    </main>
  );
}

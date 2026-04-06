import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "~/components/Hero";
import { MetadataGutter } from "~/components/MetadataGutter";
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
    <main className="pt-32 pb-24 max-w-7xl mx-auto px-8">
      <Hero />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-24">
        <MetadataGutter />

        <div className="md:col-span-10 lg:col-span-8">
          <WritingSection />
          <ProjectsSection />
          <ConsultingCTA />
        </div>
      </div>
    </main>
  );
}

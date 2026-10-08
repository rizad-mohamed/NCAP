import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/public/home/HomePage";
import { homeHeroImage } from "@/features/public/home/home-hero-image";
import { RouteShell } from "@/components/layout/RouteShell";

// The home route inherits shared title, description, Open Graph, and Twitter
// metadata from __root.tsx.
export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      {
        rel: "preload",
        as: "image",
        href: homeHeroImage.src,
        imageSrcSet: homeHeroImage.srcSet,
        imageSizes: homeHeroImage.sizes,
        fetchPriority: "high",
      },
    ],
    meta: [
      { title: "NCAP — Learn safer digital habits" },
      {
        name: "description",
        content: "Practical cybersecurity awareness, learning modules, and quizzes for Sri Lanka.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <RouteShell>
      <HomePage />
    </RouteShell>
  );
}

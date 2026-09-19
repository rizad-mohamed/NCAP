import { createFileRoute } from "@tanstack/react-router";

const publicPaths = [
  "/",
  "/awareness",
  "/awareness/articles",
  "/awareness/tips",
  "/awareness/news",
  "/awareness/best-practices",
  "/awareness/posters",
  "/awareness/infographics",
  "/awareness/videos",
  "/learn",
  "/learn/search",
  "/quizzes",
  "/accessibility",
  "/privacy",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls = publicPaths.map((path) => `<url><loc>${origin}${path}</loc></url>`).join("");
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          {
            headers: {
              "content-type": "application/xml; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});

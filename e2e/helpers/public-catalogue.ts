import { expect, type Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fromJSON } from "seroval";
import { quizzes } from "../../src/data/quizzes";
import type { QuizDefinition } from "../../src/domain/quiz";
import * as awareness from "../../src/data/awareness";
import { modules, lessons } from "../../src/data/learning";

// These UI checks need published content, not a live or seeded database. Mock
// only four public GET functions. Auth, authorization and all mutations retain
// their real transport; backend/error tests never install this fixture.
export async function installPublicCatalogueFixtures(page: Page) {
  const directory = ".output/server/_ssr";
  const ids = new Map<string, string>();
  for (const file of readdirSync(directory).filter((name) =>
    /^(awareness|learning|quiz)\.functions-.*\.mjs$/.test(name),
  )) {
    const source = readFileSync(join(directory, file), "utf8");
    for (const match of source.matchAll(
      /id:\s*"([^"]+)",\s*name:\s*"(listAwareness|awarenessSummary|listLearning|getQuizCatalogue)"/g,
    ))
      ids.set(match[1], match[2]);
  }
  expect([...ids.values()].sort()).toEqual([
    "awarenessSummary",
    "getQuizCatalogue",
    "listAwareness",
    "listLearning",
  ]);
  const publicQuizzes: QuizDefinition[] = quizzes.map((quiz) => ({
    ...quiz,
    slug: quiz.id,
    instructions: "Choose the best answer.",
    durationSeconds: 600,
    passingPercent: 70,
    eligibilityPercent: 0,
    maxAttempts: null,
    cooldownSeconds: 0,
    questionCount: 10,
    availableQuestions: 10,
    status: "Published",
  }));
  const collections = {
    articles: awareness.articles,
    cyberTips: awareness.tips,
    newsUpdates: awareness.news,
    bestPractices: awareness.bestPractices,
    posters: awareness.posters,
    infographics: awareness.infographics,
    videos: awareness.videos,
    modules,
    lessons,
    topics: [],
  };
  await page.route("**/_serverFn/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const name = ids.get(url.pathname.split("/").at(-1) ?? "");
    if (request.method() !== "GET" || !name) return route.fallback();
    const raw = url.searchParams.get("payload");
    const payload = raw
      ? (fromJSON(JSON.parse(raw)) as {
          data?:
            | boolean
            | {
                admin?: boolean;
                kind?: keyof typeof collections;
                offset?: number;
                limit?: number;
              };
        })
      : {};
    if (name === "getQuizCatalogue" && payload.data === true) return route.fallback();
    if (typeof payload.data === "object" && payload.data?.admin) return route.fallback();
    let data: unknown;
    if (name === "getQuizCatalogue") {
      data = publicQuizzes;
    } else if (name === "awarenessSummary") {
      data = {
        kinds: Object.fromEntries(
          Object.entries(collections)
            .filter(([kind]) => !["modules", "lessons", "topics"].includes(kind))
            .map(([kind, items]) => [kind, { count: items.length, topics: [] }]),
        ),
        featured: awareness.articles[0],
      };
    } else {
      const input = typeof payload.data === "object" ? payload.data : undefined;
      const kind = input?.kind;
      expect(
        kind && kind in collections,
        "Fixture request must select a known public collection",
      ).toBeTruthy();
      const records = collections[kind!].filter(
        (record) => (record.status ?? "Published") === "Published",
      );
      const offset = input?.offset ?? 0;
      data = {
        items: records.slice(offset, offset + (input?.limit ?? 100)),
        total: records.length,
      };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { ok: true, data }, context: {} }),
    });
  });
}

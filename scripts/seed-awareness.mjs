// Operator-only. Never import this script into the application bundle.
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const source = await readFile(new URL("../src/data/awareness.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const seeds = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const collections = {
  articles: seeds.articles,
  cyberTips: seeds.tips,
  newsUpdates: seeds.news,
  bestPractices: seeds.bestPractices,
  posters: seeds.posters,
  infographics: seeds.infographics,
  videos: seeds.videos,
};
const uuid = (value) => {
  const hex = createHash("sha256").update(`ncap-awareness:${value}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
export function seedRow(kind, r, index) {
  const content = {};
  for (const key of [
    "body",
    "steps",
    "points",
    "durationLabel",
    "chapters",
    "transcript",
    "sourceUrl",
    "posterUrl",
    "imageUrl",
    "format",
  ])
    if (r[key] !== undefined) content[key] = r[key];
  return {
    id: uuid(r.id),
    kind,
    slug:
      r.slug ??
      r.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    title: r.title,
    summary: r.summary ?? r.text ?? r.description ?? r.alt ?? "",
    topic: r.category ?? r.topic ?? r.tag,
    language: "en",
    status: r.status ?? "Published",
    display_order:
      r.order ??
      (["cyberTips", "newsUpdates", "bestPractices", "videos"].includes(kind) ? index : index + 1),
    featured: kind === "articles" && index === 0,
    published_at: r.publishedAt ?? r.date ?? null,
    author: r.author ?? "",
    tags: r.tags ?? [],
    reading_minutes: r.readingMinutes ?? null,
    content,
  };
}
const counts = Object.fromEntries(
  Object.entries(collections).map(([kind, rows]) => [kind, rows.length]),
);
if (process.argv.includes("--dry-run")) {
  console.log(
    JSON.stringify(
      {
        counts,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        managedImages: collections.posters.length + collections.infographics.length,
      },
      null,
      2,
    ),
  );
} else {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Set operator-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const check = (result) => {
    if (result.error)
      throw new Error(
        "Awareness seed operation failed; check migrations and operator access. No credentials or database details are logged.",
      );
    return result.data;
  };
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [kind, rows] of Object.entries(collections))
      for (const [index, r] of rows.entries()) {
        const row = seedRow(kind, r, index);
        const existing = check(
          await client
            .from("awareness_resources")
            .select("id,legacy_id")
            .eq("id", row.id)
            .maybeSingle(),
        );
        if (existing?.legacy_id) continue; // Never overwrite operator edits on subsequent imports.
        if (!existing)
          check(await client.from("awareness_resources").insert({ ...row, status: "Draft" }));
        let imageId = null;
        if (r.file) {
          // Only tracked bundled SVG files are rasterized. User SVG uploads remain forbidden.
          if (!/^\/posters\/[a-z0-9-]+\.svg$/.test(r.file))
            throw new Error("Unexpected bundled asset path.");
          const svg = await readFile(resolve("public", r.file.slice(1)), "utf8");
          if (
            /<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|javascript:)/i.test(
              svg,
            )
          )
            throw new Error("Unsafe bundled SVG.");
          const page = await browser.newPage({
            viewport: { width: 1200, height: 1600 },
            deviceScaleFactor: 1,
          });
          await page.route("**/*", (route) => route.abort());
          await page.setContent(
            `<style>body{margin:0}svg{display:block;width:1200px;height:auto}</style>${svg}`,
          );
          const element = page.locator("svg");
          const box = await element.boundingBox();
          const png = await element.screenshot({ type: "png" });
          await page.close();
          if (!box || box.width > 4096 || box.height > 4096 || png.length > 5242880)
            throw new Error("Bundled image exceeds media limits.");
          const pending = check(
            await client
              .from("awareness_media_assets")
              .select("*")
              .eq("resource_id", row.id)
              .in("state", ["pending", "ready", "active"])
              .limit(1),
          );
          const asset = pending[0] ?? {
            id: randomUUID(),
            resource_id: row.id,
            role: "image",
            path: `${row.id}/${randomUUID()}.png`,
            file_name: r.file
              .split("/")
              .pop()
              .replace(/\.svg$/, ".png"),
            mime_type: "image/png",
            size_bytes: png.length,
            width: Math.round(box.width),
            height: Math.round(box.height),
            alt_text: (r.alt ?? r.description ?? r.title).slice(0, 240),
            state: "pending",
          };
          if (!pending.length) check(await client.from("awareness_media_assets").insert(asset));
          const info = await client.storage.from("awareness-media").info(asset.path);
          if (info.error)
            check(
              await client.storage
                .from("awareness-media")
                .upload(asset.path, png, {
                  contentType: "image/png",
                  upsert: false,
                  cacheControl: "60",
                }),
            );
          check(
            await client
              .from("awareness_media_assets")
              .update({ state: "active" })
              .eq("id", asset.id),
          );
          imageId = asset.id;
          if (kind === "posters") row.content.format = "PNG";
        }
        check(
          await client
            .from("awareness_resources")
            .update({ ...row, image_id: imageId, legacy_id: r.id })
            .eq("id", row.id),
        );
        console.log(`Seeded ${kind}: ${r.id}`);
      }
    console.log("Awareness import complete.", counts);
  } finally {
    await browser.close();
  }
}

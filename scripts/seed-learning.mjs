// Seed only the bundled Learning catalogue; never import browser-local learner data.
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/data/learning.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { modules, lessons } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const names = [...new Set([...modules, ...lessons].map((r) => r.topic))];
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const quote = (value) => "'" + JSON.stringify(value).replace(/'/g, "''") + "'::jsonb";
const rows = [
  ...names.map((name) => [
    "topics",
    { id: `topic-${slug(name)}`, name, slug: slug(name), status: "Active" },
  ]),
  ...modules.map((m, i) => ["modules", { ...m, topicId: `topic-${slug(m.topic)}`, order: i + 1 }]),
  ...lessons.map((l) => ["lessons", { ...l, topicId: `topic-${slug(l.topic)}` }]),
];
// The caller must set the UUID of an existing Super Admin in the SQL session.
const sql =
  `-- Run as an operator after setting request.jwt.claim.sub to a Super Admin UUID.\nbegin;\n` +
  rows
    .map(
      ([kind, record]) =>
        `select public.save_learning_record('${kind}', ${quote(record)}) where not exists (select 1 from public.learning_${kind} where id='${record.id.replace(/'/g, "''")}');`,
    )
    .join("\n") +
  "\ncommit;\n";
if (process.argv.includes("--write"))
  await writeFile(new URL("../supabase/learning-seed.sql", import.meta.url), sql);
console.log(
  JSON.stringify({
    topics: names.length,
    modules: modules.length,
    lessons: lessons.length,
    mode: process.argv.includes("--write") ? "wrote supabase/learning-seed.sql" : "dry-run",
  }),
);

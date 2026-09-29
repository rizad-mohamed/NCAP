// Generate an idempotent SQL import for the bundled quiz catalogue and question bank.
// Import learning first. This script never touches learner attempts or existing edits.
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

async function loadSource(file) {
  const source = await readFile(new URL(`../src/data/${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { quizzes } = await loadSource("quizzes.ts");
const { questions } = await loadSource("quiz-seed.ts");
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const records = [];
for (const quiz of quizzes) {
  const bank = questions.filter((question) => question.moduleId === quiz.moduleId);
  if (!bank.length) throw new Error(`No questions for ${quiz.id}`);
  records.push(`insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,duration_seconds,passing_percent,eligibility_percent,question_count,status)
    values(${quote(quiz.id)},${quote(quiz.moduleId)},${quote(quiz.title)},${quote(quiz.id.slice(2))},${quote(quiz.description)},${quote(quiz.topic)},${quote(quiz.difficulty)},600,70,80,${Math.min(10, bank.length)},'Published')
    on conflict(id) do nothing;`);
  for (const [index, question] of bank.entries()) {
    records.push(`insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values(${quote(question.id)},${quote(quiz.id)},${quote(question.prompt)},${quote(question.topic)},${quote(question.difficulty)},${index + 1},${quote(question.explanation)},${quote(question.status)})
      on conflict(id) do nothing;`);
    question.options.forEach((option, position) => {
      records.push(`insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select ${quote(question.id)},${position},${quote(option)},${position === question.correctIndex}
        where not exists(select 1 from public.quiz_options where question_id=${quote(question.id)} and position=${position});`);
    });
  }
}
const sql =
  "-- Apply after the Learning seed and Quiz migration. Existing rows are preserved.\nbegin;\n" +
  records.join("\n") +
  "\ncommit;\n";
if (process.argv.includes("--write"))
  await writeFile(new URL("../supabase/quiz-seed.sql", import.meta.url), sql);
console.log(
  JSON.stringify({
    quizzes: quizzes.length,
    questions: questions.length,
    mode: process.argv.includes("--write") ? "wrote supabase/quiz-seed.sql" : "dry-run",
  }),
);

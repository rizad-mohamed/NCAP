# Quiz deployment

## Live deployment verification — 2026-09-29

The Quiz migration `202609290001_quiz.sql` and `quiz-seed.sql` were applied to the linked Supabase project `zsaefnfgauqvstptetdw` using the access token in `.env.local`. The migration and its `supabase_migrations.schema_migrations` entry were committed in one database transaction. The project already contained all five published Learning modules required by the seed.

The live database contains five published quizzes, 48 questions, and 192 options, with every quiz's actual question count matching its configured count. All six Quiz tables have row level security enabled. The migration has exactly one history row. The seed was run twice; quiz, question, and option row counts and content fingerprints remained unchanged on the second run. No quiz attempts existed at verification time.

The anonymous catalogue RPC returned HTTP 200 with five quizzes. Database privilege checks confirmed that anonymous and authenticated roles cannot directly select `quiz_options` or `quiz_attempt_items`; anonymous callers cannot execute `quiz_start`, and authenticated callers cannot execute the private scoring helper. Authenticated roles have access to the guarded learner and administrator RPCs, where the functions perform their own identity and role checks.

Three authenticated Chromium browser tests passed against the live project using disposable learner and Super Admin accounts. They covered catalogue display, attempt start, answer feedback, cross-session resume, final submission, persisted score after reload, administrator management visibility, and question create, edit, publish, and delete through the admin screen. Direct live API checks rejected anonymous attempt creation, learner access to administrator RPCs, direct answer-option reads, and another user's attempt UUID. A separate live transaction verified administrator quiz and question draft creation, question and quiz publishing, quiz editing, and deletion; it rolled back its temporary Learning module and Quiz content. Disposable accounts, questions, and attempts were removed afterward. The admin browser test does not create a new quiz because the five seeded Learning modules already have their one associated quiz.

`npm run check` passed after this verification: 171 tests passed, two optional hosted tests were skipped, and typecheck, lint, secret scan, and production build passed. The three authenticated Quiz Playwright tests passed separately against the live project. The final live database check matched the original seed counts and content fingerprints, with no remaining attempts.

Apply migrations through `202609290001_quiz.sql` in order. Import the Learning catalogue first, because each quiz references an existing learning module. Run `npm run quiz:seed -- --write` to generate `supabase/quiz-seed.sql`, then apply that SQL in the Supabase SQL Editor or with your migration runner. The import uses stable IDs and `ON CONFLICT DO NOTHING`; reruns preserve administrator edits and existing attempts.

The application uses the existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `APP_URL` settings. No service role key is needed in the application. A Super Admin can manage quizzes at `/admin/questions`. Learners use `/quizzes`.

Quiz tables deny direct access to question answers, attempt snapshots and results. The guarded RPCs authenticate the caller and enforce administrator rights, user ownership, server deadlines, attempt limits, cooldown, one active attempt, one answer per question and server scoring. Published quiz metadata is readable through the catalogue RPC; correct answers appear only after the learner submits the corresponding answer or completes the attempt. Eligibility is calculated with quiz attempts and Learning completions in the database.

After deployment, verify a learner can start, resume and submit an attempt, cannot call administrator RPCs or read `quiz_options` and `quiz_attempt_items` directly, and cannot read another learner's attempt UUID. Verify an administrator can create and publish a quiz and question. Run `npm run check` and the authenticated Playwright suite with disposable learner and administrator accounts.

Quiz data migration does not import browser-local demo attempts. Those records were never associated with authenticated users and must not be treated as verified results.

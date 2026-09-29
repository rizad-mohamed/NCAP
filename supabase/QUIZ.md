# Quiz deployment

Apply migrations through `202609290001_quiz.sql` in order. Import the Learning catalogue first, because each quiz references an existing learning module. Run `npm run quiz:seed -- --write` to generate `supabase/quiz-seed.sql`, then apply that SQL in the Supabase SQL Editor or with your migration runner. The import uses stable IDs and `ON CONFLICT DO NOTHING`; reruns preserve administrator edits and existing attempts.

The application uses the existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `APP_URL` settings. No service role key is needed in the application. A Super Admin can manage quizzes at `/admin/questions`. Learners use `/quizzes`.

Quiz tables deny direct access to question answers, attempt snapshots and results. The guarded RPCs authenticate the caller and enforce administrator rights, user ownership, server deadlines, attempt limits, cooldown, one active attempt, one answer per question and server scoring. Published quiz metadata is readable through the catalogue RPC; correct answers appear only after the learner submits the corresponding answer or completes the attempt. Eligibility is calculated with quiz attempts and Learning completions in the database.

After deployment, verify a learner can start, resume and submit an attempt, cannot call administrator RPCs or read `quiz_options` and `quiz_attempt_items` directly, and cannot read another learner's attempt UUID. Verify an administrator can create and publish a quiz and question. Run `npm run check` and the authenticated Playwright suite with disposable learner and administrator accounts.

Quiz data migration does not import browser-local demo attempts. Those records were never associated with authenticated users and must not be treated as verified results.

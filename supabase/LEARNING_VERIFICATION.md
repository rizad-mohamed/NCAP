# Learning deployment verification — 2026-09-28

## Deployment status

Learning's backend is deployed on the configured Supabase project `zsaefnfgauqvstptetdw` (`NCAP_V1.0`, ap-south-1). Management credentials and the publishable-key public API connected successfully. The project reported `ACTIVE_HEALTHY`.

The owner confirmed this project is staging and authorized disposable authenticated verification. Three temporary accounts (one Super Admin and two learners) were used against the real backend. Public production release still depends on the hosting, authentication-origin and recovery gates below.

| Component                                | Verified live result                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `202609260002_learning.sql`              | Applied through Supabase CLI; recorded in migration history                                        |
| `202609270001_learning_maintenance.sql`  | Applied; worker privileges explicit                                                                |
| `202609270002_learning_upload_limit.sql` | Applied; Learning limited to the existing project ceiling of 50 MiB                                |
| Migration dry run                        | Up to date, no pending migrations                                                                  |
| Catalogue seed                           | 11 topics, 5 modules, 18 lessons; original IDs retained                                            |
| Idempotency                              | Second seed run left content, versions, timestamps and audit count unchanged                       |
| Public catalogue RPC                     | HTTP 200; five published modules                                                                   |
| Storage                                  | Private `learning-media`; image/video MIME allowlist; 50 MiB bucket ceiling                        |
| Edge Function                            | `learning-cleanup` deployed using the API bundler                                                  |
| Scheduler                                | Active `learning-media-cleanup`, `37 * * * *` UTC; subsequent cron dispatches succeeded            |
| Maintenance security                     | Dedicated secret stored in Edge configuration and Vault; unauthenticated HTTP request returned 401 |
| Maintenance dispatch                     | Actual `pg_net` request 26 returned HTTP 200: zero processed, zero failures, not deferred          |

Live security fixtures exercised replacement, protected references, expired uploads and retired media. Actual Edge/pg_net request 36 processed three fixtures with zero failures and no deferral; Storage objects and expired metadata were removed.

## Database and security

All 12 tables exist with RLS enabled: `learning_topics`, `learning_modules`, `learning_lessons`, `learning_module_objectives`, `learning_lesson_objectives`, `learning_lesson_blocks`, `learning_completions`, `learning_bookmarks`, `learning_video_resume`, `learning_activity`, `learning_media_assets`, and `learning_audit`.

Verified 31 indexes, 77 constraints after the upload-limit migration, 13 public-table policies and three Storage policies. No invalid indexes or unvalidated constraints remained. Learning uses transactional RPCs for versioning, timestamps and audit insertion; it does not require separate Learning triggers. Existing authentication triggers were not changed.

Verified functions include `learning_list`, `save_learning_record`, `delete_learning_record`, `reorder_learning_records`, `learning_statistics`, `learning_state`, `mutate_learning_state`, `retire_learning_media`, private visibility/validation/mapping helpers, and `private.run_learning_cleanup`. Security-definer functions use a fixed empty search path.

Live privilege checks confirmed that authenticated application roles cannot directly insert/update/delete audit records, anonymous callers cannot execute learner mutation RPCs, and authenticated application roles cannot invoke the private cleanup dispatcher. Seed operations generated 34 audit records. Live checks additionally passed draft/public visibility, learner denial of administrator RPCs and direct writes, role-escalation denial, two-user isolation, forged learner identity protection, idempotent activity, persisted resume, dashboard statistics, stale-version rejection and parent-child integrity.

No Learning progress is authoritative in localStorage: content/state come from the backend adapter, Learning fields are excluded from persisted demo state, and React Query keys include account and administrator/public scope. Account-switch, queued-mutation and error behavior passed local tests.

## Deployment fixes

- Removed a UTF-8 byte-order marker from Learning's scheduler SQL and made its setup script strip a leading marker before embedding SQL. This resolved the hosted SQL syntax failure.
- Corrected the setup message to report minute 37 UTC, matching the actual Learning schedule.
- Aligned Learning's upload UI, client/server validation, database constraint and bucket with the project's existing 50 MiB limit. No plan/billing or Awareness configuration changed.
- Added upload-limit coverage and live public/authenticated browser scenarios.
- Fixed Learning mutations returning before their catalogue cache refreshed: reopened editors now receive the saved record/version and await refresh. The change is restricted to Learning collections; two regression tests cover save timing and account-scoped deletion.
- Corrected browser selectors and mutation waits. Media deletion checks use authenticated Storage listing because live CDN responses remained cached after origin deletion; positive object-existence checks precede removal assertions.

## Verification commands and results

Operator commands used the existing ignored credential loader. Credentials were never included in command arguments or committed.

```text
supabase db push --dry-run
supabase db push --yes
npm run learning:seed -- --write
supabase functions deploy learning-cleanup --use-api
node scripts/setup-learning-cleanup.mjs
npm run check
npx vitest run src/server/learning src/domain/learning.test.ts src/services/learning-hooks.test.tsx src/services/learning-repository.test.ts src/services/query-hooks.learning.test.tsx
npx playwright test e2e/learning-backend.spec.ts e2e/modules-topics-management.spec.ts e2e/lesson-authoring.spec.ts e2e/learning-accounts.spec.ts e2e/learning-media.spec.ts --project=chromium
npx playwright test e2e/learning-media.spec.ts --project=chromium --grep "module images"
```

The generated seed SQL was executed twice through the operator API with the existing verified Super Admin actor. No existing records were overwritten.

- `npm run check`: passed with `VITEST_MAX_WORKERS=2`; 163 tests passed, two existing hosted Awareness tests skipped because their opt-in live configuration was not enabled. Typecheck, lint, secret scan and production build passed.
- Initial unrestricted-worker run: one editor test exceeded its five-second timeout under machine load. The two-worker rerun passed without changing that test or weakening assertions.
- Focused Learning suite: 50 tests passed across seven files (the required suite plus two cache regression tests), using the same two-worker setting.
- Live Chromium: all nine scenarios passed across the final full run (eight passed; image assertion failed on CDN caching) and corrected image-only rerun (one passed). No authenticated Learning scenarios were skipped. The original required three browser files all passed.
- Public build credential inspection: 80 generated files checked; no configured service-role, management, database or Cloudflare credentials found.
- Awareness integrity: content hashes/counts, policies and function definitions matched the private pre-deployment snapshot. Awareness files, data, bucket and cleanup schedule were not changed by this deployment.

Authenticated browser verification covered sign-in, progress/bookmarks across separate browser sessions, account switching, dashboard statistics, administrator topic/module/lesson authoring and publication, structured blocks, uploaded video/transcript/playback/resume, and image validation/upload/replacement/deletion. Corrupted image bytes passed browser decoding but were rejected by server finalization. Direct live API checks additionally verified RLS, protected audit records, private media access, unauthorized upload/delete denial and scheduled expiry cleanup.

## Test cleanup

All three disposable Auth accounts and their profiles, completion/bookmark/resume/activity rows were removed. Their local credential file was deleted. No owned Storage objects remain. Final cleanup request 75 returned HTTP 200 with zero failures. 15 retired metadata tombstones remain intentionally until upload-token expiry; the active hourly worker removes them safely.

The original 11 topic, five module and 18 lesson IDs remain. The tested seeded lesson was restored through versioned RPCs. Independently authored title/order changes on two other lessons were confirmed by audit actor and preserved. Test audit records and version history remain; cleanup did not bypass or erase auditing.

## Recovery and release gates

The migrations are additive and transactional. A failed migration rolls back that migration's work; successfully applied migrations remain recorded. Do not rerun the initial schema SQL against an already migrated project or drop Learning tables as an automatic rollback. Prefer a forward correction; an application rollback can retain the new schema and catalogue. Before any destructive schema reversal, export all Learning data and Storage objects and verify a restore in staging.

A private pre-deployment schema/history and Awareness-integrity snapshot was saved under the ignored `.deployment-tools.local` directory. It is **not a full database backup**. Supabase reported no listed database backups and point-in-time recovery disabled. No backup plan, billing change or external backup destination was configured by this deployment.

The configured application origin remains `http://localhost:8080`; Supabase's Auth site URL is `http://localhost:3000`. Frontend verification used the production build locally at port 4173 with the real backend. No public HTTPS frontend was deployed and no shared authentication redirect settings were altered. Public hosting had previously been deferred; production auth redirects must be aligned with the chosen HTTPS origin before public release.

Owner decisions required to close the remaining gates:

1. Supply/confirm the public HTTPS application origin if public release is required now.
2. Select a backup/recovery arrangement and operations owner for restore verification and cleanup-failure alerting before production release.

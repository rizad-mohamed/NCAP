# Learning deployment and operations

Learning uses the existing authenticated Supabase server client and TanStack Start server functions. The application needs only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `APP_URL`. Service credentials belong exclusively to maintenance tooling.

The configured backend has been deployed. See [live deployment verification](LEARNING_VERIFICATION.md) for applied migrations, test evidence and outstanding release gates.

## Deploy

1. Apply migrations in filename order: `202609260002_learning.sql`, `202609270001_learning_maintenance.sql`, and `202609270002_learning_upload_limit.sql`, to a staging project first. The Learning migrations are transactional and depend on the authentication profile migration and Supabase's Storage schema. The maintenance migration explicitly grants the worker access to its cleanup queue, independently of project default privileges. The upload-limit migration aligns Learning with the configured project's 50 MiB ceiling without changing other buckets or billing.
2. Provision a Super Admin as described in [README.md](README.md). An empty installation supports authoring immediately. To import the bundled catalogue, run `npm run learning:seed -- --write`, then execute `learning-seed.sql` in the SQL Editor after setting the authenticated actor in that session:

   ```sql
   select set_config('request.jwt.claim.sub', 'EXISTING-SUPER-ADMIN-UUID', false);
   ```

   The seed imports 11 topics, 5 modules and 18 lessons, preserving existing route and assessment IDs. It skips existing IDs and does not overwrite edits or import browser-local learner data.

3. Deploy the application after the migration. Verify public catalogue, signed-in learner persistence and administrator authoring in staging. Missing migrations cause an explicit service error; there is no demo fallback.
4. Deploy `learning-cleanup` with the Supabase CLI. Run `node scripts/setup-learning-cleanup.mjs` with operator-only `SUPABASE_URL` and `SUPABASE_ACCESS_TOKEN` to generate a maintenance secret, store it in Edge Function secrets and Vault, and schedule hourly cleanup. Alternatively, schedule `npm run learning:cleanup` with operator-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in an external job runner.
5. Inspect cleanup results and alert on `failures > 0`, HTTP failures, or a persistently growing retired queue. Run the job more frequently or increase its batch limit for a larger catalogue. Do not ship without an active cleanup schedule.

## Schema and behavior

- `learning_topics`, `learning_modules`, `learning_lessons`: stable IDs, topic/module foreign keys, publication metadata, timestamps and optimistic versions.
- `learning_module_objectives`, `learning_lesson_objectives`, `learning_lesson_blocks`: ordered child records. Blocks retain the existing validated structured JSON shape.
- `learning_completions`, `learning_bookmarks`, `learning_video_resume`, `learning_activity`: authenticated ownership and server timestamps. Repeated completion/bookmark saves are idempotent; activity is recorded in the same transaction. Activity queries return the latest 100 entries; earlier history remains in the database.
- `learning_media_assets`: immutable upload paths, verified metadata and durable retirement queue.
- `learning_audit`: administrator actor, operation, before/after content and server timestamp. Application roles cannot edit audit history.

Topics and modules with children cannot be deleted. Deactivate/unpublish them or explicitly delete linked lessons first. Lesson deletion cascades blocks, objectives, completion, bookmarks and resume positions; activity retains its label with a null lesson reference. Learner account deletion cascades that learner's records. Ordering RPCs validate versions and commit the entire reorder atomically. Lesson order is unique within a module.

Topics belong to Learning. Renaming a topic preserves relationships by ID and does not rewrite Awareness or assessment demo data. Existing assessment links remain compatible; assessment execution, certificates, administrator user/report demos and announcements remain outside this implementation.

## API and security

`src/learning/learning.functions.ts` exposes list, save, delete, reorder, learner state, and media operations. Zod validates server inputs. Server functions verify identity with `auth.getUser()` and read the administrator role from `profiles`. Existing CSRF middleware protects POST server functions. Responses are private/no-store and errors omit internal database details.

The repository adapter routes Learning collections to these functions. SQL independently enforces role/ownership even for direct RPC requests. Content tables have SELECT-only application grants; all content/learner mutations go through restricted RPCs. Public queries require a published module, published lesson and active topics. Nested blocks, objectives and media follow the same visibility rules. A caller cannot supply another learner's identity to progress mutations. `learning_statistics()` calculates visible lesson/module totals and completed learning time from database records.

React Query isolates caches by account and administrator/public context. Content refreshes every 30 seconds and learner state every 15 seconds while mounted, as well as on focus/reconnect and after mutations. This provides cross-device synchronization without a Realtime subscription. Bookmark and completion success messages appear after persistence. The server rejects queued frontend mutations when the signed-in account has changed. Video resume saves every five seconds and on pause/navigation; abrupt process termination may lose the last unsaved interval. Guest browsing does not create learner state.

## Storage

`learning-media` is private. JPEG/PNG/WebP images are limited to 5 MiB and 4096×4096; MP4/WebM videos to 50 MiB and four hours. The configured project's upload ceiling is 50 MiB; Learning's UI, client validation, server validation, database constraint and bucket agree with that limit. Admin-only preparation creates an immutable path and signed upload token. Finalization checks actual object size/type, inspects file signatures/dimensions/duration, and rejects mismatched metadata. Published video lessons require transcripts. Replacement attaches the new asset transactionally and retires unreferenced old assets; lesson copies can share a video safely.

Abandoned pending/ready uploads expire after 24 hours. Retired rows remain a retry queue until Storage deletion succeeds. Tombstones remain beyond the two-hour upload-token lifetime to catch cancellation/replay races. Referenced assets cannot be retired by cleanup. Images use 60-second signed URLs; video URLs last for the validated duration plus five minutes (maximum four hours five minutes) to permit range requests during playback. Previously issued signed URLs remain usable until expiry after unpublishing; deleting an object revokes its availability earlier.

## Verification

```text
npm run check
npx vitest run src/server/learning src/domain/learning.test.ts src/services/learning-hooks.test.tsx src/services/learning-repository.test.ts
```

The PostgreSQL integration tests use PGlite (real PostgreSQL in-process), apply the authentication and Learning migrations unmodified, and execute SQL as anonymous, administrator and two distinct learner roles. Supabase-owned auth/storage tables and JWT accessors are represented by a local test harness. Tests cover RLS, direct mutation denial, publication hierarchy, searches, versions, transactional ordering, foreign keys, seed idempotency, learner isolation, activity and Storage object policies. Hook/adapter tests cover loading/errors, persisted completion/bookmarks across separate caches, account changes and administration requests.

Hosted Supabase Auth, HTTP Storage uploads, Edge scheduling and browser behavior require staging verification; the local database harness does not emulate those hosted services. Set `LEARNING_E2E=1`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_LEARNER_EMAIL`, `E2E_LEARNER_PASSWORD` and staging Supabase configuration, then run:

```text
npm run build
npx playwright test e2e/learning-backend.spec.ts e2e/modules-topics-management.spec.ts e2e/lesson-authoring.spec.ts --project=chromium
```

Use a confirmed staging/test project with disposable accounts and catalogue data for browser authoring tests. The existing authoring scenarios edit seeded lessons, so they must not run against production content. Apply migrations, run these checks, and verify cleanup before promoting the feature to production.

For read-only outage checks, set `SUPABASE_URL=http://127.0.0.1:54321` (with no backend running there), `SUPABASE_PUBLISHABLE_KEY=playwright-local-placeholder-key`, and `LEARNING_UNAVAILABLE_E2E=1`, remove test login credentials, then run `npx playwright test e2e/learning-unavailable.spec.ts --project=chromium`. The upload fixture check records and decodes a video entirely in memory. Video uploads require finalized container duration metadata; raw streaming recordings may need re-exporting before upload.

Latest deployment validation: `npm run check` passed with `VITEST_MAX_WORKERS=2`: 161 tests passed and two existing hosted Awareness tests skipped. The focused Learning command passed all 48 tests. Typecheck, lint, secret scan and the production build passed. A read-only Chromium scenario verified catalogue, module, search and guest lesson access against the deployed backend. Earlier localhost verification passed five Chromium checks covering outages, sign-in guards and video fixture decoding. Authenticated browser authoring/upload verification awaits confirmation that the configured project is staging/test, in accordance with the deployment request's prohibition on destructive production testing. See the deployment report for the remaining gates.

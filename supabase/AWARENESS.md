# Awareness deployment and operations

Awareness uses the existing cookie session and `profiles.role = 'super_admin'`. Learning,
quizzes, reports and certificates retain their existing demo adapters. Runtime credentials
remain `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `APP_URL`; no runtime service key is used.

## Deploy

Run commands from `ncap_v1.0`. Install project dependencies with `npm ci` first if needed.

1. Apply the existing auth migration first. Apply `migrations/202609200001_awareness.sql`
   and `migrations/202609260001_awareness_conflicts.sql`
   in the Supabase SQL Editor, **or**, with an installed Supabase CLI and a linked project:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   The checked-in `config.toml` initializes this checkout for CLI deployments.
   The migration creates the two tables, private bucket, policies, indexes, and functions.
   It does not publish seed data. Apply it before deploying the frontend; there is deliberately
   no fallback to browser demo data when the database is unavailable.

2. In Supabase Storage settings ensure the project-wide upload size limit allows **100 MiB**
   (or the maximum supported by your plan). The migration sets `awareness-media` private with
   a 100 MiB bucket limit and JPEG, PNG, WebP, MP4 and WebM MIME allowlist. Do not make it public.

   **Current deployment:** the owner chose to retain the free plan, whose project-wide limit is
   **50 MiB per upload**. Images remain limited to 5 MiB by the application. Video uploads must
   stay below 50 MiB on this project even though the product/bucket validation ceiling is 100 MiB.
   Supabase rejects larger files. Raising the project limit requires an owner-managed plan upgrade;
   no billing changes were made during deployment.

3. Install the operator script's browser if missing:

   ```sh
   npx playwright install chromium
   npm run awareness:seed -- --dry-run
   ```

4. Inject **operator-only** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` through your shell's
   secret manager, then run:

   ```sh
   npm run awareness:seed
   ```

   Do not add the service key to Vite variables, source control, application runtime bindings,
   or command history. The script reads process environment only, never `.env.local` implicitly.
   It imports 60 resources (16 articles, 12 tips, 6 updates, 8 best practices, 6 posters,
   6 infographics, 6 videos). Stable UUIDs and `legacy_id` preserve seed identity; existing
   completed imports are skipped, including any later administrator edits. Interrupted
   imports resume from their draft rows. Concurrent seed runs are not supported.

   Twelve bundled poster/infographic SVG references are rasterized into PNGs using Chromium
   with external requests disabled, then stored privately. Text, dates, ordering, chapter
   timestamps, transcripts and article slugs remain intact. PNG replaces the old SVG download
   format; SVG uploads remain prohibited. Original checked-in SVGs are retained as import
   sources, but runtime Awareness records no longer point to them. Seed videos have no licensed
   binary media; their existing transcript previews remain available. Upload MP4/WebM in Admin
   when licensed video files are available.

5. Build/deploy using the existing application workflow:

   ```sh
   npm run check
   ```

   CSP permits images and upload/download connections to the configured Supabase origin only.
   No new browser environment variables are needed. The existing Super Admin provisioning
   instructions in `README.md` still apply.

## Cleanup job (required)

The Supabase-hosted `awareness-cleanup` maintenance function runs **hourly at minute 17 UTC**
through `pg_cron` and `pg_net`. It uses the same cleanup implementation as the operator script.
The function accepts only POST requests authenticated by a dedicated random maintenance token;
that token is stored in Edge secrets and Vault, never in the browser or checked-in configuration.
The function's gateway JWT check is disabled because the handler authenticates this maintenance
token; unauthenticated invocations return 401. The scheduling SQL function is private and its
execution is revoked from public, anonymous and authenticated application roles.

To provision another project (or rotate the maintenance token), deploy and then configure:

```sh
supabase functions deploy awareness-cleanup --use-api
node scripts/setup-awareness-cleanup.mjs
```

The setup script requires operator-only `SUPABASE_URL` and `SUPABASE_ACCESS_TOKEN`, and installs
`supabase/operations/awareness-cleanup.sql`. It never prints the generated token. The hosted
function uses Supabase's server-only built-in credentials, processes at most 100 objects / 90 seconds
per invocation, and leaves any remaining queue for a later run. Inspect Edge function logs and
`net._http_response` for HTTP 500 responses; the next hourly invocation retries retained entries.
`cron.job_run_details` confirms dispatch but does not by itself prove the HTTP request succeeded.

For an immediate manual retry, run `npm run awareness:cleanup` with the operator-only URL and
service-role variables. Retry failures and alert on its nonzero exit code. Cleanup expires unattached
pending/ready uploads after 24 hours and retries retired-object deletion. Successful resource
replacement/deletion also attempts immediate cleanup. Database records are never removed
before Storage removal succeeds. Recently retired upload metadata is retained for 125 minutes:
Supabase signed upload tokens are valid for two hours, so late uploads remain discoverable.
See [Supabase signed upload documentation](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl).

An interrupted seed import retains draft records and associated media for resuming. Re-run the
import to finish it; these are not anonymous public resources. Deleting an abandoned seed draft
through Admin retires its assets normally.

## Validation and access behavior

- Server functions validate every operation with Zod; mutations also validate the authenticated
  user with `auth.getUser()` and read the authoritative profile role. Database RPCs independently
  require Super Admin and retain caller RLS. The route guard is not the mutation boundary.
- Public queries explicitly request Published records even during a Super Admin session.
  Public/admin/user query cache scopes are separate. There is no public draft lookup by ID or slug.
- Public lists are paginated at 24, with database search and indexed literal substring matching.
  Article search matches title/summary; other resource search includes structured content,
  topics, authors and tags. Admin tabs use shared repository lists and existing client filters.
- Save/publish/unpublish and delete compare the version originally viewed. Stale operations
  return HTTP 409 (`PT409`) and require reloading. The follow-up migration avoids PostgREST's
  serialization retry behavior for `40001`. Republishing preserves the selected publication date.
- Assets upload directly to randomized immutable Storage paths. Finalization verifies stored
  byte size/MIME, extension, dimensions and video duration from bounded container inspection.
  Images: JPEG/PNG/WebP, 5 MiB, 4096 × 4096, alternative text required. Videos: MP4/WebM,
  100 MiB, four hours. MP4 metadata must fit within the first/last 1 MiB; WebM must include
  readable duration and track metadata in its first 1 MiB. Re-export files rejected by inspection.
- New media is attached and the old media retired in one database transaction. Failed saves
  discard unattached new assets; re-upload after a failed attachment. Cleanup failures leave
  retryable metadata and emit safe operational warnings without undoing a successful save.
- Display/download URLs expire after 60 seconds. Image URLs refresh while mounted; downloads
  request a fresh URL with the stored safe filename. A previously issued URL remains usable
  until expiry after unpublishing. Already downloaded files cannot be revoked.
- Content remains typed text/arrays rendered by React, not arbitrary HTML. There is no malware
  scanner. External malware scanning and transcoding remain deployment follow-ups if required.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run security:scan
npm run build
npx playwright test e2e/awareness-management.spec.ts e2e/awareness-backend.spec.ts e2e/content-consistency.spec.ts --project=chromium
```

Live tests use a **disposable, migrated** project and existing confirmed test users. Supply
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`,
`E2E_LEARNER_EMAIL`, and `E2E_LEARNER_PASSWORD` through the environment. Set
`AWARENESS_INTEGRATION=1` for `npm test -- src/server/awareness/rls.integration.test.ts`.
Set `AWARENESS_E2E=1` for browser seed/media scenarios after the import. Without the flags and
credentials, those tests are **SKIPPED**, not evidence of live database or Storage correctness.
Set `AWARENESS_VIDEO_FIXTURE` to a local licensed MP4/WebM file to include actual upload/playback
verification; without it, only that additional scenario is skipped. The deployment audit used
MDN's CC0 `flower.mp4` fixture in ignored local files, never as permanent seed content.
The schema security tests are static contract checks; service tests use injected Supabase mocks.

After deployment, run the live tests and manually verify media playback and cleanup-job logs
against your Storage deployment. No migration, seed upload, or hosted database changes are
performed by a build or by the default unit suite.

See [the deployment verification report](AWARENESS_VERIFICATION.md) for the latest live results.
The [final readiness review](AWARENESS_READINESS.md) records closure checks and remaining
public-release gates. The [reference architecture](AWARENESS_REFERENCE_ARCHITECTURE.md) describes
the implementation pattern for future modules.

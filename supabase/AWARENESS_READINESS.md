# Awareness final readiness review

Reviewed 2026-09-26 against implementation commit `5d86811`. This closure changes documentation
only. Detailed live mutation evidence is in [the deployment report](AWARENESS_VERIFICATION.md);
commands and recovery procedures are in [the operations guide](AWARENESS.md).

## Decision

**NOT READY FOR PRODUCTION public launch.** Awareness implementation and Supabase deployment
are complete within the verified scope. Public frontend hosting was explicitly deferred by the
owner; no hosted HTTPS application has been deployed or tested. This is a release gate, not a
request to redesign the module or complete unrelated authentication work.

Before public release:

1. Choose/deploy the application hosting target; configure its runtime variables below with an
   HTTPS `APP_URL`, and align Supabase site URL/allowed authentication redirects with that origin.
2. Repeat public, learner and Super Admin smoke tests on that hosted origin, including secure
   session cookies, draft isolation, upload/playback/download and publish/unpublish across sessions.
3. Assign an operations owner and verify alert delivery and a database-plus-media restore drill.
   Backup scheduling, recovery targets and external alerts have not been configured or verified
   by this review; these require operational sign-off before treating this as a production service.

Awareness feature development can close and the next backend module can proceed using the
reference pattern. Keep public-release tracking open until these gates have evidence.

## Implementation review

| Area | Verified implementation |
| --- | --- |
| Hub | Published-only database counts and featured resource; no seed fallback |
| Articles | Backend pagination/search/topic filters/order; published detail by ID or slug |
| Cyber Tips, Demo Updates, Best Practices | Backend collections and existing structured content |
| Posters and Infographics | Managed images, refreshed signed display URLs, authorized filename-preserving downloads |
| Videos | Database transcript/chapters, managed video playback when attached, transcript-only seed previews |
| Admin Awareness | Seven resource tabs; list/preview/create/edit/delete/publish/unpublish/order and media replacement/removal |
| UI state | Existing components/design retained; query loading, empty/error/retry states, validation and toasts |
| Local persistence | Seven Awareness collections excluded from demo persistence/hydration; no runtime seed authority; Awareness media uses Storage |

`src/services/awareness-repository.ts` overrides only Awareness in the existing repository.
`awareness-hooks.ts` and shared query hooks scope caches by public/admin/user and invalidate
collections and summary after mutations. Public pages use these queries; Admin uses the same
repository with protected server calls. Unrelated modules retain their local adapters. Existing
IndexedDB utilities are still present for those modules, not authoritative for Awareness.

Public search/filter/order/pagination execute in SQL; article substring search uses title/summary,
other kinds include structured content. GIN trigram indexes support the existing literal search
semantics. Admin fetches repository pages before applying its existing client filters; revisit
admin pagination if content volume grows. This review did not add load testing or a full
cross-browser visual regression certification. No layout or branding changes were made.

## Database and deployment

| Table | Purpose and important fields |
| --- | --- |
| `public.awareness_resources` | UUID, stable import `legacy_id`, seven constrained kinds, slug, title, summary, topic, language, `Draft`/`Published`, display order, featured, publication date, author/tags/read time, structured JSON content, image/video references, audit actors/timestamps, version |
| `public.awareness_media_assets` | UUID, resource/role, bucket/random path, original filename, MIME/bytes/dimensions/duration/alt text, pending/ready/active/retired lifecycle, uploader/timestamps |
| `public.profiles` / `auth.users` | Existing identity and authoritative role foundation; not a new Awareness identity system |

Resource audit actors and asset uploader reference profiles with `ON DELETE SET NULL`;
profiles reference auth users. Asset parent uses `SET NULL` so cleanup metadata survives resource
deletion. Resource image/video foreign keys restrict deletion of referenced media. Transactional
save/delete RPCs handle attachment, retirement and optimistic version checks; stale requests use
`PT409` (HTTP 409). Republishing retains the chosen publication date.

Constraints include required/bounded text, kind/status/language checks, nonnegative order,
positive versions, unique legacy IDs and `(kind, slug)`, bounded JSON objects, structured-content
and publication checks, safe unique storage paths, media role/state/MIME/size/dimension checks.
Eighteen table indexes cover primary/unique keys, foreign keys, list/topic/newest/featured queries,
trigram search and cleanup. Both Awareness tables have RLS enabled.

Important functions: `awareness_search_document`, `awareness_summary`,
`save_awareness_resource`, `delete_awareness_resource`; existing `private.is_super_admin`
supplies hardened role checks. Maintenance uses `private.run_awareness_cleanup`.

| Migration | Live state |
| --- | --- |
| `202609190001_auth_profiles.sql` | Existing foundation verified; missing history entry repaired without rerunning auth changes |
| `202609200001_awareness.sql` | Applied using Supabase CLI `db push --yes` |
| `202609260001_awareness_conflicts.sql` | Applied; fixes PostgREST conflict retry behavior |

CLI `db push --dry-run` reported no pending migrations at deployment. Closure read-only audit
confirmed all three history entries, both RLS-enabled tables, eight Awareness table/storage
policies, eighteen indexes and 60 published resources. Counts: articles 16, tips 12, updates 6,
best practices 8, posters 6, infographics 6, videos 6. There are 12 active image assets.
Idempotent seed re-execution previously left every resource, version and timestamp unchanged.

## Authorization and security

| Actor | Published reads/media | Draft reads/media | Resource/media mutations |
| --- | --- | --- | --- |
| Anonymous | Allowed | Denied | Denied |
| Learner | Allowed | Denied | Denied |
| Super Admin | Allowed | Allowed through admin operations | Allowed after server authorization |

TanStack Start functions parse inputs with Zod, use the existing cookie-session client and check
`auth.getUser()` plus the database profile role for every privileged operation. Runtime uses
the publishable key with caller RLS, never the operator service-role key. Public queries explicitly
filter Published even in an administrator session. Database RPCs independently check the role.
RLS and Storage policies enforce these boundaries beyond route protection.

Responses are private/no-store with session-aware cache variation. Structured text is rendered
through React, not executable HTML. Errors normalize validation, authorization, not-found,
conflict and storage/database failures without exposing SQL, tokens or stack traces. Server checks
inspect uploaded bytes/headers and bounded media metadata as well as filename/MIME/size.
These are format checks, not malware scanning. Direct administrator SQL edits bypass application
validation/version workflows; use Admin/server operations for ordinary content management.

## Configuration inventory

Use ignored local environment files for operator/test work and hosting secret configuration for
deployed runtime. Scripts consume process environment; they do not implicitly load local files.
Never prefix privileged credentials with `VITE_` or put them in browser/runtime bindings.

| Variable | Required where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | App runtime, operator scripts, live tests | Project API origin |
| `SUPABASE_PUBLISHABLE_KEY` | App runtime and live tests | Caller-session Supabase client; not privileged |
| `APP_URL` | App runtime | Application origin; production must be HTTPS, local development may use localhost |
| `SUPABASE_SERVICE_ROLE_KEY` | Operator seed/manual cleanup only; built-in Edge environment | Privileged import and maintenance, never application/browser runtime |
| `SUPABASE_ACCESS_TOKEN` | CLI/maintenance setup operator environment | Management API and deployment authorization |
| `SUPABASE_DB_PASSWORD` | CLI operator environment when required for database connection | Database migration access; never app runtime |
| `AWARENESS_CLEANUP_TOKEN` | Edge secrets and matching Vault entry, generated by setup | Authenticate scheduled maintenance |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | Authenticated live test runner | Disposable confirmed Super Admin account |
| `E2E_LEARNER_EMAIL`, `E2E_LEARNER_PASSWORD` | Authenticated live test runner | Disposable confirmed learner account |
| `AWARENESS_INTEGRATION` | Optional test runner flag `1` | Enable live RLS tests |
| `AWARENESS_E2E` | Optional test runner flag `1` | Enable seeded live browser scenarios |
| `AWARENESS_VIDEO_FIXTURE` | Optional test runner path | Licensed local video for upload/playback test |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Hosting deploy environment if Cloudflare is selected | Deferred hosting deployment; not required for completed Supabase verification |

The cleanup setup generates its token; operators should not manually copy it into tracked files.
Production hosting variables are not currently configured. The local `APP_URL` is not evidence of
a production origin. Temporary live-test accounts were deleted and their local credentials cleared.

## Storage and lifecycle

`awareness-media` is private. JPEG/PNG/WebP images: application maximum 5 MiB and 4096 square
dimensions. MP4/WebM videos: product ceiling 100 MiB/four hours, subject to supported container
inspection. SVG/HTML uploads are not accepted. The bucket allows the five corresponding MIME types.

**Effective deployment upload maximum: 50 MiB (52,428,800 bytes).** The bucket/product ceiling
is 100 MiB, but the current project limit is lower and rejects larger uploads. The owner accepted
this restriction without a billing change. Prepare smaller videos; the UI's product limit does not
override the project limit. See [Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits).

Storage SELECT requires active media attached to a published parent, or Super Admin access.
INSERT requires an administrator-owned pending asset at its randomized path; object UPDATE is
not allowed. DELETE requires an administrator and a pending/ready/retired asset. Direct signed
uploads avoid proxying large bodies through the app Worker. Server finalization inspects metadata
before attachment. Replacement atomically attaches the new asset and retires the old before
deleting old bytes. Failed cleanup retains retryable metadata; deletion follows the same workflow.

Display/download URLs last 60 seconds, with refresh for mounted media and fresh download signing.
Already issued links remain usable until expiry after unpublishing; downloaded copies cannot be
revoked. Signed upload replay is handled by retaining recent retired metadata for 125 minutes.
Unattached pending/ready assets expire after 24 hours. Hourly cleanup runs at `17 * * * *` UTC,
bounded to 100 objects/90 seconds per invocation. Its endpoint independently verifies its dedicated
token; public requests return 401 and application roles cannot execute the private SQL dispatcher.

Closure audit: **0 untracked objects, 0 missing active objects, 0 retired stored objects and
0 retired tombstones**. The earlier report's eleven retained tombstones have now drained.
All twelve published PNG downloads passed again. Recent hourly cron dispatches succeeded;
dispatch status alone does not establish the HTTP cleanup result.

## Operational procedures

- Deploy: configure operator environment, link the project, run `supabase db push`, then
  `npm run awareness:seed -- --dry-run` and `npm run awareness:seed`. Import is idempotent;
  do not run concurrent imports. Apply migrations before the application release.
- Maintenance provisioning: `supabase functions deploy awareness-cleanup --use-api`, then
  `node scripts/setup-awareness-cleanup.mjs`. This also rotates the maintenance token.
- Manage content: select the appropriate Admin Awareness tab; create a Draft, enter required
  structured fields, upload media, wait for upload completion, then save. Preview and publish
  after review. Editing/publishing/unpublishing preserves the viewed version; reload on conflict.
  Replace/remove media through the editor, save the change, and confirm deletion when removing
  a resource. Unpublishing removes it from new public queries.
- Failure recovery: retry a failed upload; re-upload after failed attachment. Do not delete active
  object paths manually. Retry retained cleanup entries with `npm run awareness:cleanup` using
  operator credentials; investigate a nonzero exit and verify both metadata and Storage afterward.
- Review cron dispatch, Edge logs and `net._http_response`; monitor queue age as well as size.
  Resume interrupted seed drafts by rerunning the import; delete unwanted drafts through Admin.
- Review database/storage growth and slow queries before changing indexes or capacity. Do not
  rewrite applied migrations; add narrowly scoped migrations and rerun security tests.

## Test evidence and scope

| Check | Closure evidence | Failed / skipped |
| --- | --- | --- |
| `npm run check` | Fresh aggregate run passed: typecheck, lint, Vitest, secret scan, production build | 0 failures |
| `npm test` within that run | 113 passed; 13 test files passed | 2 live tests / 1 file skipped: live flag/accounts absent |
| `npm run security:scan` | 221 text files passed in aggregate; final documentation scan passed for 223 files | 0 failures |
| Live RLS integration command in deployment report | 2 passed on current implementation | 0 failed, 0 skipped; retained deployment evidence, not rerun during documentation closure |
| Full live Chromium command in deployment report | 8 passed, including actual MP4 and authenticated lifecycle | 0 failed, 0 skipped; retained evidence, temporary accounts since deleted |
| Closure public Chromium subset | 3 passed: bundled import rendering, backend failure state, seeded public navigation/search/details/downloads/transcripts | 0 failed, 0 skipped; no new authenticated fixture accounts created |
| Live read-only closure audit | Counts, migration history, RLS/index/policy presence, all 12 image downloads, cron/storage reconciliation passed | 0 failures |
| Hosted production-origin smoke / load / cross-browser visual certification | Not run | Hosting deferred; no load or complete visual certification claimed |

Full authenticated evidence covers draft lookup denial by guessed ID/slug, learner write/storage
denial, Super Admin CRUD, publication, stale HTTP 409, replacement/deletion and cross-browser
persistence. Static security tests are not substitutes for that live evidence. Mock service tests
exercise failure paths; this review does not claim every possible network failure was injected live.

Closure browser command (with `AWARENESS_E2E=1` and runtime URL/publishable key):

```sh
npx playwright test e2e/awareness-management.spec.ts e2e/awareness-backend.spec.ts e2e/content-consistency.spec.ts --project=chromium --grep "bundled Awareness|backend failure|seeded public"
```

Tests ran against the fresh production build served by a local Worker and the live Supabase
backend. The three-test subset does not repeat the earlier authenticated eight-test suite.

## Monitoring, backup and maintenance recommendations

Assign an operator for application/server-function failures, authorization anomalies, database
errors/latency, failed uploads/downloads, storage quota/egress and cleanup retries. Log safe operation
codes and correlation identifiers, never credentials or signed URLs. Configure alert delivery;
a suggested initial cleanup alarm is no successful HTTP invocation for two hours or eligible
objects remaining beyond two cleanup cycles. Tune latency/error thresholds to observed traffic.
The job exists; external alerts and an on-call response have not been verified.

Define acceptable recovery point/time targets with the owner. Schedule encrypted off-site database
exports and separate object-file backups with manifests/checksums and retention. Supabase database
backups contain Storage metadata, not file bytes; free-plan projects should export regularly.
See [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups).
Back up configuration/migrations/function source and recover secrets through the secret manager.
Restore into an isolated project, restore matching objects/paths, validate references and RLS,
and replay public/admin/media tests before accepting a recovery. Do not assume seed imports can
restore administrator-created content. A restore drill is still outstanding.

Review dependency/security updates routinely, RLS after schema changes, cleanup logs/queue daily,
and storage/backup retention periodically. Future options include a higher storage plan, licensed
external video hosting or a reviewed CDN/media service, transcoding and malware scanning where
required. None was provisioned here. Seed videos retain transcripts/chapters without licensed
production binaries; real managed playback was verified using a temporary test fixture.

## Reference and closure

Use [the reference architecture](AWARENESS_REFERENCE_ARCHITECTURE.md) for future modules.
The verified Supabase implementation is a suitable development reference; its deferred hosting,
operational sign-offs and stated media limits must not be copied as claims of completed production
operations. No unrelated module or authentication backlog was changed during this closure.

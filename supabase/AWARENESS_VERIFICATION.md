# Awareness deployment verification — 2026-09-26

## Result and scope

The Awareness backend is deployed and verified on the configured Supabase project
`zsaefnfgauqvstptetdw` (ap-south-1). The built application was tested locally against that live
backend. Cloudflare/public frontend deployment was explicitly deferred by the owner.
The owner also chose to retain the current plan's **50 MiB project-wide upload limit**.
This report does not certify a publicly hosted frontend or uploads above that limit.

## Database and import

- Verified existing auth function bodies, RLS, policies and triggers against the auth migration;
  recorded its previously missing migration-history entry without rerunning the auth migration.
- Applied `202609200001_awareness.sql` with `supabase db push --yes`.
- Live stale-edit testing exposed PostgREST retrying the original `40001` exception. Applied
  `202609260001_awareness_conflicts.sql` to return `PT409` / HTTP 409 instead, retaining role
  checks, row locking and version protection. The client normalizes that conflict safely.
- Final `supabase db push --dry-run` reported up to date, with no pending migrations.
- Imported all 60 existing resources and 12 managed PNG image references. A second real import
  left all 60 rows identical, including versions and timestamps.

| Published collection | Final count |
| --- | ---: |
| Articles | 16 |
| Cyber Tips | 12 |
| Demo Updates | 6 |
| Best Practices | 8 |
| Posters | 6 |
| Infographics | 6 |
| Videos | 6 |

## Live security, storage and frontend results

- Live RLS tests passed: anonymous/learner draft exclusion by ID and slug; learner write denial;
  Super Admin draft access and CRUD; publication/unpublication; stale edits returning HTTP 409;
  private draft storage, published-parent signing, and learner upload/delete denial.
- Both Awareness tables have RLS enabled; eight Awareness policies and eighteen table indexes
  were verified. The private bucket has the existing JPEG/PNG/WebP/MP4/WebM allowlist.
- All 12 imported images downloaded successfully through anonymous signed URLs as valid PNGs.
- Eight Chromium scenarios passed against the production build and live backend: asset import
  rendering, backend-error state, real MP4 upload/playback with chapters/transcript, seeded public
  navigation/search/details/downloads, draft isolation and image replacement, tip publication
  lifecycle, cross-browser article edits, and uploaded poster preview/download consistency.
- Test-only fixes aligned selectors with existing accessible controls, waited for SSR hydration,
  and waited for uploads to finish before saving. No authentication features were redesigned.

## Operational verification

- Deployed the `awareness-cleanup` maintenance function, sharing the existing operator cleanup
  implementation. Its dedicated random token is held in Supabase Edge secrets and Vault.
- Installed an active `awareness-media-cleanup` cron job: `17 * * * *` (UTC).
- Anonymous direct invocation returned 401. Application database roles cannot execute the
  private dispatch function. Invocation through the actual `pg_net` dispatch returned HTTP 200
  and removed two isolated expired object/metadata fixtures with zero failures.
- Actual hourly cron dispatches reported success. Inspect `net._http_response` and Edge logs
  for the HTTP outcome; a successful cron dispatch alone is not a cleanup success guarantee.
- Final audit: **0 untracked bucket objects, 0 missing active objects, 0 retired objects still
  in Storage**. Twelve seed assets remain active. Eleven recent retired metadata tombstones were
  intentionally retained until their two-hour upload-token replay window expires; the hourly
  job removes them after 125 minutes. These rows do not represent retained binary objects.
- Removed three leftover verification records, all temporary uploaded binaries, and both
  temporary auth accounts. Seed records and existing application users were preserved.

Temporary accounts used (both deleted after successful verification):

| Role | User ID |
| --- | --- |
| Super Admin | `fe332f8a-818b-40f0-9931-c7e96b80b57d` |
| Learner | `96cbd774-03b7-4d09-b3d3-af3b39877379` |

Passwords were generated at runtime and held only in ignored local environment configuration;
that test credential file was cleared after account deletion. The MP4 playback fixture was
MDN's CC0 flower video, used only for temporary verification and removed from Supabase afterward.

## Checks executed

| Command / check | Final outcome |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 113 passed; 2 live tests skipped in the ordinary environment |
| `vitest run src/server/awareness/rls.integration.test.ts` with live flag/credentials | 2 passed, 0 skipped |
| `playwright test e2e/awareness-management.spec.ts e2e/awareness-backend.spec.ts e2e/content-consistency.spec.ts --project=chromium --max-failures=1` with live flag/credentials/video fixture | 8 passed, 0 skipped |
| `npm run security:scan` | Passed |
| Operator-key scan of 216 built output files | No supplied operator credentials found |
| `npm run build` | Passed |
| Real seed rerun and published-image download audit | Passed |
| Hosted cleanup authorization, dispatch and expired-fixture removal | Passed |

The live commands were launched through ignored local wrappers that loaded credentials without
printing them or passing operator keys to the browser-test runtime. Early failed live runs were
investigated and rerun after fixes; the table reports final outcomes. A corrupt local dependency
file was restored from the exact lockfile-integrity-verified package; dependency versions did not
change. No hosted frontend deployment was attempted.

## Remaining boundaries

- Current project plan: uploads over 50 MiB are rejected by Supabase, despite the product/bucket's
  100 MiB maximum. No billing changes were made. The documented deployment limit is 50 MiB.
- Seed videos still contain their original transcripts/chapters without licensed production media.
  Managed video delivery itself was verified with the temporary MP4 fixture.
- Existing documented media-container inspection limits and 60-second signed-URL expiry apply.
  Malware scanning/transcoding and external alert delivery are not implemented.
- Frontend hosting, production HTTPS origin and production auth redirects remain deferred by
  the owner. See [Awareness operations](AWARENESS.md) before enabling that hosting stage.

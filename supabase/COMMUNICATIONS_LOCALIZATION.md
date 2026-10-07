# Announcements, notifications, localization and media

Application feature work dated 4 October 2026; this is not production-release approval.

## Announcements and notifications

Existing `dashboard_announcements`, CRUD RPCs, dashboard aggregation and date/audience controls are reused. Preview/search/active filtering use the existing visual components. PostgreSQL `current_date` determines inclusive dates; New Learners means an account created within 30 days. Learner table reads require active learner status. Administrators notices deliver only to Super Admins.

`announcement_audit` captures create/edit/activate/deactivate/delete, actor/resource UUID, before/after snapshots and time in the mutation transaction. Retained UUIDs survive deletion. Super Admins can read; clients cannot write. Combined state/content changes use an activate/deactivate action with full snapshots.

`in_app_notifications` stores owner, category, immutable content/link, creation/read time, nullable announcement FK and unique `(user_id,event_key)`. The stable `announcement:<uuid>` key prevents repeated/concurrent deliveries. Historical snapshots remain stored for traceability. Current audience/schedule/account eligibility is enforced on reads: withdrawn, expired, rescheduled, retargeted or deleted notices expose only an unavailable history entry with no title/body/link. Direct table reads cannot bypass this redaction. Read state and the delivery key are retained.

- `notifications_sync()` delivers eligible announcements only to the active caller, checking audience, account age, dates and `profiles.notifications`. Disabled preferences prevent new delivery while preserving history. It runs on initial bell loading and explicit refresh/opening. Scheduled notices become eligible on the next visit during their valid schedule. There is no global fan-out job or periodic polling; a user who never visits during the schedule receives no retrospective delivery.
- `notifications_list()` uses descending `(created_at,id)` cursors, page size 20, maximum 50. Indexes cover owner/history and unread counts.
- `notifications_set_read()` and `notifications_read_all()` update only the active owner's timestamps. Clients, including admins, have no notification content/ownership mutation grants.
- Protected generation produces an aggregate `notification_generation_audit` entry only when new deliveries occur. Database/rendering allow only dashboard/admin-announcement links.

The bell has account-scoped TanStack Query keys, persistent counts/history/read controls and localized empty/loading/error states. Pagination resets on identity changes. SMS/push/email providers are future delivery boundaries.

## Interface localization and profile authority

The existing dictionaries/fonts/provider remain authoritative. The initial static interface audit added 941 lookups covering 758 distinct strings across public/auth/learner/admin screens. `docs/localization/interface-catalogue.en.json` records the English inventory; `node scripts/localization-audit.mjs` audits remaining static literals. `--apply` is a development helper, never a translation publisher.

Literal English strings resolve existing approved dictionaries alongside keyed lookups. Missing Sinhala/Tamil entries explicitly retain English. The catalogue does **not** claim 758 approved Sinhala/Tamil translations: substantial fallback remains pending approved dictionary expansion. Authored educational/security prose is not generated to fill this gap.

Authenticated language selection writes only existing `profiles.language` through an authenticated server mutation, refreshes account/cache state and persists across devices. Account preferences do not overwrite guest localStorage language. Account switching/sign-out resolves the new profile or independent guest preference.

## Authored-content governance

`content_translations` references exactly one existing module, lesson or Awareness resource with cascading FKs and unique parent/language pairs. It preserves source/media identity and carries source language/version, Draft/Published status, optimistic editor version, editor UUID and timestamps. Super Admin remains sole author/publisher; no role is added.

Existing Awareness language fields/non-English originals are preserved. Learning originals remain English. Missing/draft/stale translations retain the source (English for English originals); absent translated fields retain original values. Existing non-English Awareness originals remain in their original language if no English variant exists. No English translation is fabricated.

Admin editors expose untranslated/draft/published/stale state, reuse the lesson-block editor and require explicit review confirmation for publication. Source version changes invalidate published variants until reviewed again. Withdrawing a parent/module/topic hides translations.

`content_translation_save()` locks source/editor rows, validates optimistic versions, bounds text/lists/existing lesson blocks and audits before/after snapshots. Translation JSON cannot inject ownership, source status, media or links. `content_translation_list()` accepts at most 100 source IDs; public output includes only current published variants and omits editor metadata. Reads add one batch query per content page, avoiding N+1 queries; caches include language. Original search/order are retained: translated prose currently uses original-source search indexing.

## Media/security boundaries

Existing private buckets, signed upload/read URLs, UUID paths, limits, metadata validation, replacement/audit and scheduled abandoned/retired cleanup are retained. PNG inspection now validates the complete signature/IHDR shape; JPEG segments are bounded before dimension reads; unsupported video MIME is rejected. Shared immutable PUT transport adds progress (up to 99% until finalization), HTTP/network/abort/5-minute timeout handling. An uncertain PUT is not automatically replayed; explicit retries prepare a fresh path and failures use existing retirement/cleanup.

Limits remain unchanged: Awareness video 100 MiB, Learning video 50 MiB, four hours and existing image bounds. Signed URLs may remain usable until expiry after publication/access changes. Header/container validation is **not** malware scanning or full decoding/transcoding. No external scanner exists or is claimed. Existing media quotas/cleanup remain authoritative.

New RPCs use protected search paths, parameterized calls, least-privilege grants, active identity checks and safe errors. React renders text without executing HTML. Existing authentication throttles/request guards are reused. Audits retain useful UUIDs without tokens/passwords. This is defensive evidence, not SOC/SOC 2 certification.

## Database and verification

Applied transactionally and recorded on confirmed NCAP staging:

- `202610040004_announcements_notifications.sql`: audit/notification/generation tables, indexes, protected sync/list/read functions, announcement RLS.
- `202610040005_content_translations.sql`: stable translation FKs/uniqueness, private table grants, bounded batch/save functions, source/editor concurrency and audit.
- `202610040006_notification_visibility.sql`: current-eligibility RLS and redacted notification history after announcement access changes.

`node scripts/communications-deploy.mjs inspect` verifies project/history/RLS; `apply` applies only these migrations and refuses other projects. No database reset or out-of-history schema edits occur.

Run `npm run check`, `npm audit --audit-level=moderate`, `node scripts/security-review.mjs` and the configured Playwright matrix. Hosted checks: `node scripts/communications-live.mjs --staging-project=<confirmed-ref> --project=<browser>`. It creates disposable accounts/resources, verifies hosted RLS/browser persistence/audit, cleans exact owned fixtures in `finally` and compares 13 full-row table digests. Artifacts remain ignored. A digest mismatch blocks acceptance.

The runner writes `.qa.local/communications-<suffix>.json` with identifiers and baseline digests, never credentials. An interrupted process may require recovery: `scripts/communications-recovery.mjs` lists only specifically named QA candidates. Cleanup requires the explicit suffix and three account UUIDs (`--cleanup=<suffix> --accounts=<admin>,<learner>,<other>`), confirms source-audit ownership, and verifies all 13 non-fixture digests remain unchanged. Inspect the manifest and ownership before invoking cleanup; it is not a general staging-data deletion tool.

Production HTTPS/Cloudflare deployment, SMTP/CAPTCHA, backups/PITR, monitoring/alerts and disaster recovery remain deferred.

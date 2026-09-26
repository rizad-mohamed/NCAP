# NCAP backend reference: Awareness

This guide describes the verified implementation at `5d86811`. Read
[readiness boundaries](AWARENESS_READINESS.md) before using it as a production checklist.
It guides Learning, Quiz, Certificates, Reports and Announcements; it does not implement them.

## Database pattern

- Add versioned SQL migrations; keep operational seed/import separate and idempotent. Never
  edit already deployed migration behavior without a follow-up migration.
- Model common queried fields relationally. Use bounded JSON only for validated structured
  content. Derive each future module's aggregates from its own domain, not Awareness's seven kinds.
- Use UUID identity, deliberate foreign-key deletion behavior, audit actors/timestamps and
  versions. Add checks/unique constraints for invariants and indexes for actual queries/FKs.
- Enable RLS on every exposed table. Reuse the hardened `private.is_super_admin` and authoritative
  profile role. Define learner/owner/public rules per module; Awareness published-read rules
  are not suitable for private quiz attempts, certificates or reports without adaptation.
- Put multi-row atomic changes in narrow caller-RLS RPCs with role checks, row locks and expected
  version comparison. Use intentional HTTP conflict codes (`PT409`); database serialization
  exceptions can trigger PostgREST retries rather than the desired user conflict response.

Examples: `migrations/202609200001_awareness.sql`,
`migrations/202609260001_awareness_conflicts.sql`.

## Backend pattern

1. Define bounded Zod domain/operation schemas (`src/domain/awareness.ts`). Browser validation
   supports UX; the server validates again. Keep text structured instead of accepting raw HTML.
2. Expose TanStack Start functions (`src/awareness/awareness.functions.ts`). The callable entry
   sits outside `src/server` for the existing import-protection convention; implementation stays
   in isolated server modules. No parallel REST/GraphQL application backend is needed.
3. Reuse the cookie-session Supabase client with publishable key. Check `auth.getUser()` and
   database profile role on every privileged entry; never trust a role or admin flag from input.
4. Separate authorization, queries, mapping, services, media and errors under `src/server/awareness`.
   Pass intent to services, not arbitrary client SQL/table names. Public reads explicitly constrain
   visibility even during admin sessions. Scope response caching to session-sensitive data.
5. Normalize errors into typed, user-safe results. Preserve validation, not-found, forbidden,
   conflict and retryable failure distinctions without leaking internal responses.

Operator-only service keys belong to import/maintenance processes, not the application client.
Hosted cleanup is a separately authenticated operational function, not a replacement CRUD API.

## Media pattern

Use a private module bucket and metadata table. Allocate randomized immutable paths on the server,
record pending metadata, issue a signed direct upload, inspect actual stored metadata/headers,
then mark ready. Attach new media and retire old media atomically with resource changes. Delete
retired bytes afterward; retain durable retry metadata on failure. Preserve tombstones through
the signed-upload replay window. Periodically expire abandoned uploads and retry cleanup.

Authorize display/download signing from current parent visibility and use short expiries. Keep
filename/MIME/size/metadata rules consistent and document effective infrastructure limits.
Format validation is not malware scanning. Use a separately authenticated, bounded scheduled
worker and inspect its actual HTTP result, not just cron dispatch success.

## Frontend pattern

- Extend the existing `NcapRepository` and replace only the target module adapter. Awareness's
  example is `src/services/awareness-repository.ts`; unrelated demo modules remain isolated.
- Use TanStack Query hooks with public/admin/user-scoped keys. Invalidate lists, details and
  derived counts when relevant mutations succeed; keep expected version from the viewed record.
- Preserve components, accessible controls, styling and existing semantics. Add loading, empty,
  retry/error states and mutation feedback without inventing a second frontend state authority.
- Remove the migrated module from local persistence/hydration. Do not silently fall back to demo
  records when backend calls fail. Paginate/filter/search in the database for growing public lists.
- Keep image/download URL refresh and video expiry recovery separate from resource persistence.

## Testing and release pattern

Test domain boundaries for each resource shape and format; service tests should inject storage/DB
failures and check cleanup and user-safe errors. Statically verify migration/RLS contracts, then
run real anonymous/learner/admin tests against a disposable migrated environment. Include guessed
draft IDs/slugs, raw unauthorized writes, storage signing/upload/delete denial and stale versions.

Run built-application browser scenarios against that backend: create draft, confirm isolation,
upload/replace, publish, edit across sessions, download/playback, unpublish and delete. Remove test
accounts/content afterward. Explicitly report gated tests as skipped when credentials are absent.
Keep operator credentials out of browser runners and redact secrets from logs/artifacts.

Run `npm run check`, relevant live tests and browser tests; retain commands, counts, commit and
environment scope in the verification report. Confirm migration history, idempotent imports,
storage reconciliation and cleanup operation. A local built Worker plus live Supabase does not
certify the hosted production origin. Record hosting, monitoring and recovery release gates.

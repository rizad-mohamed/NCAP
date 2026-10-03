# Administrator content, reports and certificates

## Inspection and dependency map

The starting branch is `main`, with a clean tree and origin `rizad-mohamed/NCAP`. Authentication and active-account enforcement remain authoritative.

| Workspace/control                                                                 | Existing dependency                                                                                | Required work                                                                                                                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lessons: search/status, create/edit/blocks/video, order, publish, preview, delete | Learning repository → Learning server functions → versioned transactional Learning RPCs            | Reuse; verify progress preservation, stale edits, deletion and media                                                                              |
| Modules/topics                                                                    | AdminModulesTopicsPage → same Learning repository                                                  | Reuse                                                                                                                                             |
| Questions: quiz selection, CRUD/options/answers, order, publication               | AdminQuizPage → Quiz RPCs and private answer bank                                                  | Reuse; no second question system                                                                                                                  |
| Articles/posters/infographics and Awareness workspace                             | Legacy routes redirect into AdminAwarenessPage → Awareness services/RPCs/private storage           | Reuse                                                                                                                                             |
| Reports: range/module/quiz, generate, charts/table, pagination, CSV, print        | DashboardSections → dashboard_report → Learning completions/sessions and Quiz attempts/definitions | Make all summary metrics filter-aware; full filtered bounded CSV                                                                                  |
| Admin certificates: registry, issue/revoke, preview, template/logo/theme/print    | Browser-local users/template/records and synthetic eligibility                                     | Replace with persistent registry, authoritative eligibility, template versioning, audited issuance/revocation, public verification and server PDF |
| Learner certificates                                                              | Browser-local self-issuance                                                                        | Replace with own registry/eligibility; remove self-issuance                                                                                       |

Learning, Quiz and Awareness already enforce optimistic versions. Learning and Quiz retain before/after audit snapshots; the new Awareness audit trigger fills the missing mutation history. Learning deletion uses a transaction and defined cascading learner-state cleanup; the UI explicitly confirms that behavior. Existing media has private buckets, signed upload/read URLs, validation and scheduled cleanup. No content review/approval, scheduling or rollback control exists in these workspaces, so no additional hierarchy is introduced. Audit snapshots provide revision evidence; no competing content revision model is introduced.

Certificates retain a snapshot of the module, published lesson IDs/versions, completion evidence, submitted quiz attempt and the documented 100% completion + best score >=80% rule. Templates are also snapshotted. Live tests use disposable staging accounts/content only; demo certificates and fabricated activity are not imported into existing accounts.

The public verification endpoint also requires anonymous execution of the configured `private.check_active_account_request` pre-request hook. Migration `202610030003` grants only that execution permission; the hook continues to inspect and reject authenticated inactive accounts and does not return application data.

## Deployment and verification

Use the configured staging `.env.local` with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ACCESS_TOKEN`. The service-role and management tokens are used only by local deployment/verification scripts; the application uses the publishable key and the signed-in user's session. The deployment script requires an explicit staging project reference and refuses to apply without the already deployed Learning, Quiz, Dashboard and Users dependencies.

```powershell
node scripts/admin-modules-deploy.mjs apply --staging-project=<project-ref>
node scripts/admin-modules-deploy.mjs verify
npm run check
npm audit --audit-level=moderate
node scripts/admin-modules-live.mjs --staging-project=<project-ref>
```

The live script creates disposable staging admin and learner accounts, a topic/module/lesson/quiz, completion and attempt evidence, then checks permissions, filtered reporting, issuance, duplicate prevention, ownership, revocation and anonymous verification. It runs the Chromium administrator/learner UI workflows against the built Cloudflare Worker and removes the disposable accounts, content, activity and certificates in `finally`. Do not run it against production. Existing content is preserved; no demo activity or certificates are imported. No seed command or manual Storage bucket setup is needed.

The five migrations add `certificate_templates`, `certificates`, `certificate_audit` and `awareness_audit`; nine public certificate/report RPCs; supporting report, certificate and audit indexes; and the narrow pre-request guard grant. The registry uses stable Learning module, Quiz attempt and profile foreign keys, a unique random UUID reference, a unique active issuance per learner/module, an immutable evidence/template snapshot, versioned template updates, and separate issue/revoke audit entries. RLS allows each active learner to read only their own certificate rows; only an active Super Admin can read the administrator registry, templates or audit data. The new tables have no client-side write grants. The public verification RPC returns status and module/issuer/issue date, without learner identity. Revoked references remain historically recorded and verify as invalid.

The PDF endpoint renders server-side from `certificate_document`, using the stored evidence and template snapshot. It reuses the private `learning-media` bucket for the optional PNG/JPEG logo and applies owner read policy for certificate logos. No PDF files are stored, so there is no PDF bucket or orphaned PDF lifecycle. The PDF embeds Atkinson Hyperlegible for Latin text and Noto Sans Sinhala/Tamil fallback fonts. Fontkit shaping, grapheme boundaries and positioned vector outlines preserve Indic text, with embedded selectable text. Unsupported scripts return a typed validation error; HTML preview/print remains available.

## Applied staging migrations

The original five migrations were applied and verified on 2026-10-03:

- `202610030001_certificates.sql`
- `202610030002_admin_reports.sql`
- `202610030003_public_request_guard.sql`
- `202610030004_admin_content_audit.sql`
- `202610030005_publication_eligibility.sql`

Full-stack validation subsequently applied `202610030006_certificate_lock_order.sql` to prevent lock inversion during concurrent certificate issuance and content editing, and `202610030007_maintenance_request_permissions.sql` to restore the server maintenance role's access to the existing Data API request guard. All seven migration history entries were verified. See [the full-stack verification report](FULL_STACK_VERIFICATION.md) for the current browser matrix, Lighthouse results, fixes and release gates; the results below describe the earlier administrator-module validation.

Verification confirmed all five history entries, four RLS-enabled tables, nine secured public RPCs, four read-only authenticated table grants, sixteen indexes and twenty-five constraints. The Awareness audit trigger function has protected execution permissions. Anonymous administrator RPC requests are denied; public invalid-reference verification succeeds safely. The publication eligibility migration makes the existing published-content rule explicit; it does not change the existing visibility helper's behavior.

## Verification results

The authenticated live runner passed all API security assertions, both live Awareness RLS/Storage tests and all four Chromium workflows: content/question CRUD and lesson preview; filtered reports/CSV/print; Awareness publication/edit/delete; certificate issue/owner visibility/PDF/public verification/revocation. The downloaded server PDF was rasterized and visually checked for Latin, Sinhala and Tamil rendering. All disposable staging accounts, rows, uploaded files and audit fixtures were removed successfully.

The final dependency audit reported zero vulnerabilities. The ordinary Vitest run skips the two opt-in live Awareness tests because it has no disposable-account credentials; the live runner executes those same tests successfully with staging credentials.

| Check                                        | Result                                                              |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Typecheck                                    | Passed                                                              |
| ESLint                                       | Passed                                                              |
| Vitest unit/integration suites               | 193 passed, 2 opt-in live tests skipped; 28 files passed, 1 skipped |
| New database/RLS integration suite           | 7 passed, included in the 193                                       |
| PDF unit tests                               | 5 passed, included in the 193                                       |
| CSV unit test                                | 1 passed, included in the 193                                       |
| Live Awareness RLS/Storage                   | 2 passed                                                            |
| Live administrator/certificate API security  | Passed all assertions                                               |
| Authenticated Chromium E2E                   | 4 passed                                                            |
| Secret scan                                  | Passed, 316 text files                                              |
| npm dependency audit                         | Passed, 0 vulnerabilities                                           |
| Production build                             | Passed                                                              |
| Live migration/schema/RLS/grant verification | Passed                                                              |

Firefox, WebKit and the mobile browser matrix were not run for this change. The application Worker was built and exercised locally against live staging Supabase; no remote Cloudflare application deployment was performed. PDF font coverage is Latin, Sinhala and Tamil; other scripts receive a validation error. CSV export is limited to 10,000 filtered rows and reports a limit error rather than silently truncating.

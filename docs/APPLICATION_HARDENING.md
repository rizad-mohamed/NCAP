# Application hardening and optimization

This record covers the application audit begun on 8 October 2026 from clean, synchronized `main` at `16d03b4395c51272ec7d2ea4199e2daf975e3d58`, on `feat/application-hardening`. It does not authorize or certify production deployment. The approved design and application workflows remain authoritative.

## Changes and evidence

- Removed 36 unused UI scaffold components, their exclusive mobile hook, an unused latency helper/configuration value and an unused chart import. Checked consumers, dynamic imports, framework conventions, tests and tooling before removal. Active primitives, operational tools, assets and historical migrations remain.
- Removed 29 unused direct dependencies: runtime dependencies fell from 59 to 30 and locked package entries from 645 to 608. No retained package version changed and no package was added. This is dependency cleanup, not a framework upgrade.
- Extracted unchanged homepage image metadata so route head construction no longer imports the homepage implementation. Extracted the unchanged lesson block renderer for administrator previews and learner pages.
- Start the Awareness summary RPC and its existing bounded published-feature query together. Filters, ordering, limit, mapping and normal error precedence remain. Three regressions exercise real thenable consumption and both error paths. The featured read also starts when the summary RPC subsequently fails; no query count reduction or measured database latency improvement is claimed.
- Reuse four decoded Sinhala/Tamil font buffers within each certificate PDF request. Font decoding falls from 12 to 8 operations; there is no cross-request cache. Latin, Sinhala, Tamil, mixed text and unsupported-script checks cover rendering behavior.
- Corrected the existing administrator user-detail response, which omitted `completedModules` and `progressPercent` required by the UI. Forward migration `202610080001_admin_user_detail_summary.sql` uses the existing user-list definitions. Existing detail fields, authorization, function attributes, owner and grants remain intact. PGlite covers draft exclusion, completed/empty progress and an empty published catalogue. Applied and recorded only on confirmed staging; the deployed function and preserved attributes were checked.
- Moved the certificate registry loading placeholder into its table body. The heading, filters and resolved rows retain their design and behavior. Rows wait for both registry and template settings. Lighthouse traced the former table movement to removal of the placeholder above the filters; certificate issuance, download, verification and revocation passed after the change.
- Corrected proven browser-harness failures: navigation now waits for visible controls and interactive menu state rather than unrelated network silence; staging deletions/revocation use the application's existing confirmation dialog; user details use the actual modal semantics. Original workflow and persistence assertions remain. Windows single-frame axe scans retain violations and rules while omitting passed-node metadata; frame-aware scans remain elsewhere. A broken-image positive control verifies detection and restoration. Added 360px and 430px to the existing responsive matrix without removing widths.

## Build measurements

Both measurements use the production build and the same byte/gzip collection procedure. Aggregate gzip sums compress each JavaScript file separately; it is not a particular page's transferred payload.

| Metric                           |  Baseline | Final application build | Change |
| -------------------------------- | --------: | ----------------------: | -----: |
| Main JavaScript entry, bytes     |   316,506 |                 291,432 |  -7.9% |
| Main entry gzip, bytes           |    96,950 |                  90,158 |  -7.0% |
| CSS, bytes                       |   126,167 |                  89,847 | -28.8% |
| All public build files, bytes    | 4,915,503 |               4,883,389 |  -0.7% |
| All JavaScript, bytes            | 1,405,716 |               1,409,922 |  +0.3% |
| Aggregate JavaScript gzip, bytes |   420,060 |                 424,377 |  +1.0% |

Splitting reduced the main entry and CSS while slightly increasing aggregate JavaScript. The chart chunk remains 381,397 bytes; it is lazy-loaded. This record does not claim that every route or every aggregate metric improved.

## Lighthouse lab evidence

Local mobile lab runs against the built Worker are sensitive to machine load, fixture timing and network latency. These are single-run observations, not production SLAs or controlled statistical results. All eight final routes scored accessibility **100**, best practices **100** and CLS **0**. Authenticated routes deliberately remain excluded from indexing.

| Route                 | Baseline performance / LCP ms | First optimized performance / LCP ms | Final performance / LCP ms |
| --------------------- | ----------------------------- | ------------------------------------ | -------------------------- |
| `/`                   | 77 / 4,045                    | 81 / 3,700                           | 77 / 3,850                 |
| `/awareness`          | 79 / 2,026                    | 80 / 1,966                           | 75 / 2,142                 |
| `/awareness/articles` | 75 / 935                      | 78 / 1,061                           | 74 / 1,030                 |
| `/learn`              | 79 / 1,916                    | 78 / 1,953                           | 77 / 2,076                 |
| `/dashboard`          | Not measured                  | Not measured                         | 70 / 2,349                 |
| `/admin/users`        | Not measured                  | Not measured                         | 79 / 2,259                 |
| `/admin/reports`      | Not measured                  | Not measured                         | 71 / 2,237                 |
| `/admin/certificates` | Not measured                  | Before loading fix: 57 / 2,563       | 74 / 2,745                 |

An additional intermediate public run returned performance 74/75/75 on Home/Awareness/Articles; this variability prevents a general performance-score improvement claim. Certificate CLS was **0.38249 before the loading fix and 0 afterward**. Homepage LCP still warrants further measured work. Historical 8.83s homepage LCP belongs to older release evidence and is not this task's baseline.

## Audit scope and security limits

Source review covered public/learner/admin boundaries, server validation and errors, account-scoped queries and cleanup, authentication/cookies/CSRF/redirects, database migrations/RLS/guarded RPCs, private media, transactional quiz/certificate evidence, translations/notifications/audits, dependencies, builds and CI. Independent reviewers examined frontend changes, backend contracts and authentication/isolation. No confirmed privilege-boundary vulnerability emerged from this review; that does not prove the absence of vulnerabilities.

Cloudflare's [security-audit skill](https://github.com/cloudflare/security-audit-skill) was installed and used for source-first review and evidence classification alongside independent analysis. Its complete workflow requires execution “only inside an OS-enforced sandbox,” with network isolation, sanitized environment, read-only target, resource limits and race-safe artifact promotion. Those controls are unavailable in this Windows environment; its findings validator also refuses unavailable no-follow/nonblocking protections. The strict skill run remains **incomplete**, and its validator did not pass. Ordinary authorized application and staging regressions are separate evidence, not substitutes for that sandbox. Partial local skill artifacts were kept outside the repository, with no confirmed severity findings.

One account-cache timing hypothesis remains `needs_validation`: delayed requests can derive the cookie principal while a query key reflects a different account identity. Existing account-switch regression and RLS are evidence for current controls, not proof that every timing race is impossible. Reproduce with two dummy identities in a suitable isolated harness before claiming a disclosure or changing authentication architecture.

No authentication limits, RLS policies, private Storage rules, CSRF checks, production settings or CI requirements were weakened. The application registration policy remains five attempts per five minutes; provider email quotas remain separate. No speculative indexes or caching were added. Learning catalogue JSON aggregation/filtering needs representative `EXPLAIN` and load data before a rewrite. Sequential media cleanup preserves existing lifecycle ordering. Notification polling and shared throttling were retained. Public privacy/accessibility text still includes historical demo descriptions and needs owner-approved policy wording rather than invented policy changes.

## Validation and release gates

The final local full unit/integration run passed **319 tests**, with **2 opt-in hosted tests skipped**, **0 failures**, and **46 passing / 1 skipped test files**. This includes **59 PGlite cases across seven database suites** and the new user-detail regression; the two hosted Awareness tests passed separately on staging. Typecheck, lint, repository secret scan, production build and extended history/build secret review passed. The unchanged complete suite ran with a single thread worker (`node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1`). A preceding default-pool local check was cancelled before reporting completion; it is not a passing `npm run check`. The unchanged GitHub Linux workflow passed `npm run check`, dependency audit and extended secret review for the application commits.

The complete unchanged Linux CI workflow passed for application commit `953e2a9ed54c5ff12df7c05d92001f4cf9e0b330`: [application validation run](https://github.com/rizad-mohamed/NCAP/actions/runs/37814266554). It confirmed the same 319 passing unit/integration tests and ran all **465 configured browser cases: 105 passed, 0 failed, 360 skipped, 0 retries**. Existing opt-in and profile exclusions remain visible; no new skips were added to hide failures.

| Browser profile | Passed | Failed | Skipped | Retries |
| --------------- | -----: | -----: | ------: | ------: |
| Chromium        |     29 |      0 |      64 |       0 |
| Firefox         |     19 |      0 |      74 |       0 |
| WebKit          |     19 |      0 |      74 |       0 |
| Mobile Chrome   |     19 |      0 |      74 |       0 |
| Mobile Safari   |     19 |      0 |      74 |       0 |

Documentation and merge commits are subject to fresh runs of the same workflow. GitHub PR checks and the workflow history are the authoritative final-commit status; this recorded run is evidence for the application changes, not a substitute for that merge gate.

Skips are environment/opt-in exclusions and do not count as live coverage. Earlier failed runs remain part of the evidence: the baseline browser matrix had three harness failures; the first optimized matrix had one navigation failure; focused navigation passed all ten applicable cases after correction. A concurrent unit run encountered a worker startup timeout before six unchanged component cases executed and is not accepted as a complete passing run. The complete thread-worker rerun above closes that local test-coverage gap without changing assertions or timeouts.

Disposable staging regressions use only `zsaefnfgauqvstptetdw`. The initial privileged browser run passed 42 cases and failed five: obsolete confirmation/modal selectors, preserved login throttling after repeated same-account logins, and one browser locator transport error. Corrected core runs passed 14 cases with all six expected account audit actions checked; a fresh focused run passed certificate lifecycle, media lifecycle and learner 1366px. Across those runs the content/report/certificate workflows and all ten public, ten learner and ten admin widths, plus authenticated axe and text-reflow checks, passed. All 17 content/progress table digests matched their baseline after cleanup. These are matched reruns, not a claim that the initial 47-case invocation passed uninterrupted.

Production release remains **BLOCKED** pending deployed HTTPS/runtime/origin verification, delivered verification/recovery email and production SMTP, CAPTCHA, monitoring/alerting, database plus Storage recovery drills, native Safari/physical-device media, manual assistive-technology checks, representative load testing, approved localization/content and completion or explicit owner disposition of the strict security-audit gaps. No public deployment, DNS or production infrastructure change is part of this task. Automated checks cannot certify a bug-free or unhackable system.

Additional completed staging checks:

- Communications: **3 passed, 0 failed, 0 skipped**, Chromium, no retries; announcement CRUD/audience/audit, notification read state across devices, translation authoring, profile language, account switching and original-content fallback. Hosted RLS/idempotency/ownership checks passed and all 13 table digests matched after fixture removal.
- Authentication lifecycle: first five-profile invocation **4 passed, 1 failed, 0 skipped**, no retries. Firefox timed out at the initial password-toggle hydration check before credential submission. Its fresh isolated rerun **passed** with unchanged code, assertions and timeouts. Chromium, Firefox, WebKit, Mobile Chrome and Mobile Safari each completed profile persistence, account switching, session-cookie flags, suspended access and administrator avatar assertions. Disposable account deletion was asserted. This is coverage across two invocations, not an uninterrupted green five-case run.
- Live authentication API checks passed role-metadata distrust, cross-user denial, guarded role/status changes, stale suspended access, durable audit and atomic shared rate-counter bounds. Disposable accounts were removed; durable account-security audit evidence intentionally remains.
- Staging structure review: **35 tables with RLS, 0 security-definer functions missing a search path, 2 private buckets and 0 orphans** in the three inspected relationships. These counts describe the review scope, not every possible integrity condition.
- Dependency audit: **0 reported vulnerabilities**. Extended secret review passed tracked files, reachable history and generated builds, comparing two local privileged values without printing them. Ignored environment files and generated browser/Lighthouse artifacts are excluded from commits.

Live registration-provider reproduction and real inbox recovery/verification delivery were not executed during this pass; provider configuration and email quotas are not changed to make tests pass. Those opt-in omissions remain visible release limitations.

# Approved NCAP frontend promotion

The October 8, 2026 release operation promotes the manually approved frontend
from `feat/ui-ux-redesign` through a normal pull-request merge. Production
deployment and the README's existing production-readiness gates are separate.

## Protected references and scope

- Pre-redesign main: `c3491f8702f7c324d2c8260de6ad8a25a3b4667c`.
- Approved UI implementation: `79bc0d16e8897efbd58afcbda69af5b36d621953`, retaining
  the three preceding redesign commits.
- Release corrections are confined to documentation, the browser test harness
  and one registration accessibility attribute. A labelled password-strength
  group now has a valid role; its existing generic-role violation was also
  present on pre-redesign main. No additional design pass or product feature
  is included.
- Domain, authentication, server, service, state and Supabase files, and dependency
  manifests, have no redesign changes relative to the pre-redesign main.

The [catalogue/workspace refinement](./CATALOGUE_UI_REFINEMENT.md),
[design-system guide](../design-system/ncap-sri-lanka/MASTER.md) and historical
[design verification](./UI_UX_REDESIGN_VERIFICATION.md) describe the shipped UI.
The PR and Git history record the final feature/merge SHAs without rewriting
published commits. The original main SHA remains available for an ordinary
reviewed revert; no database rollback is required for this frontend promotion.

## Verification boundaries

The repository's normal CI runs typecheck, lint, the full unit/integration suite,
secret scan, production build, moderate-level dependency audit, extended
history/build review and the five-profile Playwright matrix. Authenticated and
mutating staging cases retain their explicit opt-ins; skipped tests are excluded
from passing coverage. Synthetic role fixtures verify actual rendered components,
not authenticated database writes. Physical-device and manual assistive-technology
review remain separate from automated browser emulation. No formal WCAG
certification or production deployment is claimed.

### Windows WebKit accessibility runner correction

The initial complete local matrix reproduced four JSON parsing failures while
axe transferred large reports on the two Windows WebKit profiles. The in-page
scanner with full report metadata reproduced the transport failure as well.
`axeForPage` therefore uses axe's in-page scan with its `no-passes` reporter only
on single-frame Windows WebKit pages. Every selected rule still runs and every
violation is returned; unused passed-check node metadata is omitted. Pages with
child frames, other engines and Linux CI retain the full frame-aware runner.

No test assertion, WCAG tag, timeout or staging guard is removed. A permanent
positive-control test performs three scans of a stable, sizeable HTML fixture:
the baseline is clean, removing a loaded image's alt text must produce
`image-alt` for that exact image, and restoring the alt text must restore the
clean result. Auth form tests also prove hydration through the existing password
visibility control before testing local validation. The complete matrix and
affected readiness suites are rerun after these corrections. This is
the [upstream-supported scan fallback](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/error-handling.md)
with its frame restriction explicitly enforced.

## Release evidence

The full local `npm run check` passed: 315 unit/integration tests passed and two
were skipped (guarded live Awareness RLS integration), across 46 passing test
files and one skipped file. TypeScript,
ESLint, the secret scan and the production build passed. The moderate-level
npm audit reported zero vulnerabilities; the extended security review checked
422 tracked files, reachable history and 262 build files without finding secrets.
Final verification is repeated after release-only corrections.

The 435-case normal Windows browser matrix initially completed with 100 passed,
332 skipped and three failed. Its Windows WebKit protocol error, pre-hydration
form interaction and unstable scanner positive control were investigated. After
the corrections, every case in all three affected suites was rerun across all
five profiles: 30 passed, 15 skipped, zero failed. Previous failures are matched
by browser, file and test title to their successful reruns. The original failed
reports are retained locally; this is verification across runs, not a claim that
the initial matrix was uninterrupted green.

| Browser profile | Applicable cases verified across runs | Skipped staging/role cases |
| --- | ---: | ---: |
| Chromium | 27 | 60 |
| Firefox | 19 | 68 |
| WebKit | 19 | 68 |
| Mobile Chrome | 19 | 68 |
| Mobile Safari | 19 | 68 |

No authenticated test credentials or disposable-staging opt-ins are configured.
Live learner/admin database workflows and private-route Lighthouse measurements
therefore remain unmeasured, rather than being represented by skipped tests or
login-page performance scores. The unchanged business code and existing
unit/integration checks provide regression evidence within that boundary.

The role-layout review verified 96 actual-component fixture cases at 320, 360,
390, 430, 768, 1024, 1440 and 1920px. There were no WCAG-tagged axe violations
or horizontal overflow. Quiz action targets are at least 44px, action columns
align, and catalogue/question lists scroll independently. Users filters align
within each responsive row, account actions align, and table View actions remain
visible. The first laptop measurement incorrectly required search and filters to
share a row; the corrected measurement validates the intentional two-row layout.
A later Chromium axe script-injection error interrupted the large quiz fixture;
all unfinished cases passed in a fresh process, with earlier reports retained.

The public runtime sweep identified a pre-existing registration
`aria-prohibited-attr` violation: an `aria-label` was attached to a generic div.
Adding `role="group"` preserves the named password-strength group without
changing visuals, validation or authentication behavior. The auth form regression
now includes a complete WCAG-tagged registration scan.

### Deterministic public UI data in CI

A preflight with CI's unconfigured local Supabase endpoint proved that the new
catalogue and resource-drawer UI tests depended on published backend records.
Their public-read fixture now identifies four GET functions from the actual
built server metadata (`listAwareness`, `awarenessSummary`, `listLearning`,
`getQuizCatalogue`) and returns the repository's existing sample content only within those specific
browser tests. Administrative requests, auth, unrelated calls and every mutation
retain the real transport. No production demo fallback or server behavior is
added. The existing backend-failure tests do not install this fixture.

The fixture setup's initial export-name/status mapping errors were corrected;
the catalogue and drawer preflight cases passed against the same offline backend.
The broader preflight also identified the quiz-filter test's live catalogue
dependency. It now uses public quiz-definition fixtures without answers or
attempts, and verifies visible quizzes before testing search and clearing.
That intermediate run was stopped after recording the failure; all changed
suites are rerun from a single stable revision across all five profiles.

### Final local gates

- Final application `npm run check`: 315 passed, two guarded live-RLS tests
  skipped; 46 passing files and one skipped file. Typecheck, lint, secret scan
  and production build passed, with existing bundler/route-test warnings only.
- Subsequent fixture-helper changes passed targeted ESLint and a separate
  TypeScript check. No application source changed after that full check.
- Final changed browser suites in the CI-equivalent backend environment:
  **50 passed, 15 skipped, zero failed/flaky** across all five profiles.
  Together with the full matrix and unchanged readiness-suite reruns, all
  435 identities are accounted for: 103 applicable cases verified and 332
  guarded cases skipped. Skips are not passing coverage.
- Live public/auth runtime sweep: **30 checks passed**, 15 routes at both 360
  and 430px, with no console errors/warnings, page errors, failed assets,
  WCAG-tagged violations or document overflow. Same-path request counts
  remained bounded. A reset route without recovery credentials safely returned
  to login; no reset email or privileged write was attempted.
- Role fixtures: **96 verified checks** across all eight requested widths.
- Moderate-level dependency audit: **zero vulnerabilities**.
- Final staged secret scan and reachable-history/build review passed. No env
  files or generated test outputs are included in the release commit.

### Fresh mobile Lighthouse lab review

The existing runner now includes the Awareness hub in addition to its three
original public routes. These are single local production-build lab runs, not
production field measurements or WCAG certification.

| Route | Performance | Accessibility | Best Practices | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 69 | 100 | 100 | 4.134s | 0 |
| `/awareness` | 75 | 100 | 100 | 2.246s | 0 |
| `/awareness/articles` | 76 | 100 | 100 | 1.032s | 0 |
| `/learn` | 76 | 100 | 100 | 2.002s | 0 |

Recorded pre-redesign Performance/LCP were 34/8.39s for Home, 37/6.79s for
Articles and 33/14.95s for Learn. Articles' recorded CLS was 0.081; the current
run is zero. No comparable hub baseline exists. Compared with the earlier
redesign review, public performance scores vary by only a few points; no
unacceptable redesign regression was identified. Existing JavaScript/main-thread
work remains a performance opportunity, outside this release's scope.
Authenticated Dashboard and Users Lighthouse audits could not run without test
accounts and are explicitly unmeasured.
The [Frontend checks workflow](https://github.com/rizad-mohamed/NCAP/actions/workflows/ci.yml)
records the feature, pull-request and final-main CI gates. A green CI run covers
the normal configured suite, not privileged staging scenarios or production hosting.

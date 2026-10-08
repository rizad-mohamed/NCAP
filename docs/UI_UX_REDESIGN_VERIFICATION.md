# NCAP redesign completion and verification

This records the initial redesign. The subsequent
[consistency and motion refinement](./UI_CONSISTENCY_AND_MOTION.md) extends
dialog coverage, controls, skeletons and motion, with its own verification.
The October 8 [catalogue and workspace refinement](./CATALOGUE_UI_REFINEMENT.md)
unifies public catalogues and fixes dashboard loading, user details and quiz layouts.

## Initial review handoff

At the initial review handoff, the redesign was isolated on `feat/ui-ux-redesign`
in a separate worktree. The original checkout remained clean on main at
`c3491f8702f7c324d2c8260de6ad8a25a3b4667c`. That commit remains the pre-redesign
reference for review or a subsequent ordinary revert; no database rollback is
required for these frontend changes.

At that handoff, remote publishing, a PR, feature-branch GitHub Actions, and
disposable authenticated staging verification awaited external-destination
authorization. Automatic approval review rejected both the GitHub push and the
guarded staging test command before they executed. No source was pushed, no
draft PR was created, and no staging fixture was written during this review.
No merge or production deployment was performed during the design review.
The approved branch's subsequent promotion is tracked in
[UI/UX release verification](./UI_UX_RELEASE.md).

The design is substantially refined, but an award or a monetary value cannot
be objectively certified. Human design acceptance remains necessary.

## Audit and implemented result

The critical analysis, observed friction, design decisions, semantic tokens,
reusable primitives and regression boundaries are in
[UI_UX_REDESIGN.md](./UI_UX_REDESIGN.md). The maintained implementation guide is
[MASTER.md](../design-system/ncap-sri-lanka/MASTER.md).

- Public: editorial navy hero, a single photographic focal point, responsive
  image sources, quieter learning cards, topic rows and a split family banner.
- Global: coherent navy/blue/neutral tokens, readable Atkinson typography,
  accessible controls, realistic loading skeletons and restrained motion.
- Navigation: keyboard-operated awareness menu and responsive public/workspace
  sheets, retaining the existing links and role boundaries.
- Learner: resume lesson panel before the statistics, compact mobile metrics,
  clear progress and differentiated announcement rows.
- Administration: readable white rail, clearer active navigation and common
  page, metric, table, toolbar and pagination treatment.
- Announcements: searchable/filterable list, explicit pending/error/empty
  states, local pagination, accessible contextual editor, focus restoration,
  unsaved-draft protection and preserved mutation payloads.
- Notifications: differentiated unread rows, clearer actions and timestamps;
  existing cursor pagination and read-state behavior remain authoritative.

## Local automated checks

| Check | Result |
| --- | --- |
| Baseline full check | 287 tests passed, 2 skipped; 41 files passed, 1 skipped |
| Redesigned unit/integration suite | 293 tests passed, 2 skipped; 42 files passed, 1 skipped |
| TypeScript | Passed |
| ESLint | Passed |
| Production build | Passed |
| Repository security scan | Passed |
| Extended tracked/history/build secret review | Passed; privileged values checked without disclosure |
| Dependency audit, moderate threshold | 0 vulnerabilities |
| Git whitespace check | Passed |

Six meaningful announcement tests were added: focus/Escape/restoration,
declined draft discard, unchanged save payload, clear-filter recovery,
loading/error distinctions and pagination reset. Existing authentication,
content, learning, quiz and communications tests continue to pass.

The final browser command targeted critical flows, navigation consistency,
the responsive matrix and the new redesign review suite, using the production
worker and the existing five browser projects:

```text
npx playwright test e2e/critical-flows.spec.ts e2e/navigation-consistency.spec.ts e2e/responsive-matrix.spec.ts e2e/redesign-review.spec.ts --workers=1
```

| Browser project | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Chromium | 13 | 23 | 0 |
| Firefox | 5 | 31 | 0 |
| WebKit | 5 | 31 | 0 |
| Mobile Chrome | 5 | 31 | 0 |
| Mobile Safari | 5 | 31 | 0 |
| Total | 33 | 147 | 0 |

Skips are explicit opt-in/authenticated tests without disposable login
credentials, and intentionally Chromium-only viewport/screenshot suites on
the other projects. They are not passes. Mobile browser projects use emulation,
not physical devices.

The preceding complete 405-test browser run had 70 passes, 332 skips and three
timeouts in the newly added nine-scan language review. Firefox, WebKit and
Mobile Safari exceeded its original 60-second budget. Increasing only that
extended review's timeout to 180 seconds resolved the failures; assertions
were retained and all five language-review profiles passed in the final run.

## Responsive, localization and accessibility evidence

Public/auth routes were checked at 320, 375, 390, 768, 1024, 1366, 1440 and
1920 pixels with no document overflow. The homepage was checked in English,
Sinhala and Tamil at 320, 768 and 1440 pixels across all five browser profiles.
The local script fonts load on demand. Existing approved translations and
English fallback behavior remain unchanged; the redesign does not claim every
existing content record has a published Sinhala/Tamil translation.

The visual review of `/`, `/login`, `/awareness`, `/learn` and `/quizzes` at
390 and 1440 pixels found no axe violations, page errors or overflow. Final
local fixture reviews of the actual learner dashboard, admin announcements
and announcement editor at 320, 390, 768 and 1440 pixels also found no axe
violations or overflow. These fixtures mock data/auth and render the real
components; they are presentation evidence, not live authorization or database
workflow tests.

Public language checks assert no serious/critical findings under axe's WCAG
2 A/AA, 2.1 AA and 2.2 AA tags. Keyboard menu dismissal and focus restoration,
reduced motion, semantic landmarks and 44px shared controls were checked.
Automated results do not constitute full WCAG certification. Screen-reader,
200-percent text with authenticated data, and physical-device review remain
manual release checks.

Local screenshots and detailed JSON are in the ignored `.qa.local/redesign/`
directory. Useful comparisons are `before-1440-home.png`,
`final-desktop-1440-home.png`, `final-390-home.png`, and the final screenshots in
`fixtures/` for learner, administration and editor layouts. Fixtures are
explicitly labeled and contain synthetic preview data.

## Performance

Mobile Lighthouse ran against a locally built production worker using the
same existing audit procedure. Measurements are individual lab runs, not
field Core Web Vitals or a statistical benchmark.

| Route | Baseline performance | Redesigned performance | Baseline LCP | Redesigned LCP | Baseline CLS | Redesigned CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 34 | 73 | 8.39s | 3.88s | 0 | 0 |
| `/awareness/articles` | 37 | 72 | 6.79s | 1.58s | 0.081 | 0.000019 |
| `/learn` | 33 | 77 | 14.95s | 2.20s | 0 | 0 |

All three audited routes scored 100 for accessibility, best practices and SEO.
The final homepage was measured after responsive preload/sizing refinements;
the other routes use the preceding stable redesigned-build measurements.
Lighthouse's additional experimental agentic-browsing score was 50 and was
not a redesign acceptance target.

The main photograph is now 85,282 bytes rather than 370,579, with 560px and
720px variants of 33,856 and 50,722 bytes. Existing course photographs now use
WebP variants of approximately 10-36 KB. Original photography remains available.
No runtime dependency was added, and script fonts are off the English critical
path. Shared skeletons reduce loading-state shifts.

The homepage still falls short of a 90+ performance score and the 2.5-second
LCP budget. Its last lab run reported 4.4 seconds of main-thread work,
1.4 seconds of JavaScript execution and an estimated 78 KiB of unused JS.
Production caching/network behavior and deeper shared-bundle optimization
need measurement before a release-level performance claim.

Reports: `.qa.local/redesign/lighthouse-before-*.json`,
`.qa.local/lighthouse/lighthouse-*.json`, and
`.qa.local/lighthouse/lighthouse-final-home.json`. Summaries and logs are
local ignored artifacts; no environment values are included in this report.

## Regression safety and remaining verification

| Area | Preservation evidence and limits |
| --- | --- |
| Authentication | Existing auth functions, guards and server contracts unchanged; local tests pass. Live signup/reset/session flows remain staging checks. |
| Awareness | Content hooks, queries and publication rules unchanged; local tests and public navigation pass. |
| Learning | Progress calculations, lesson selection and mutations unchanged; local tests pass and actual dashboard components reviewed with fixtures. |
| Quiz | Scoring, timing, submission and eligibility unchanged; local tests pass. |
| Dashboard | Existing data calculations and hooks retained; presentation hierarchy refined. |
| Administration | Existing user/content/module/quiz actions retained; common layouts refined. Live CRUD requires staging verification. |
| Reports | Queries, export behavior and server code unchanged; shared presentation only. |
| Certificates | Eligibility, issuance and PDF generation unchanged; local tests retained. |
| Announcements/notifications | Audience values, dates, active state, targeting, unread/read state and cursor contracts preserved. New editor regression tests pass. |
| Backend/database/RLS | No migrations, database types, server functions, service hooks or RLS rules changed. No external staging writes were authorized/executed. |

GitHub main's pre-existing baseline CI run was successful:
https://github.com/rizad-mohamed/NCAP/actions/runs/37629984518.
That result does not verify this feature branch. A feature-branch CI run and
draft PR can be created after publishing is authorized.

Remaining review is human design acceptance, physical devices, manual
assistive technology, guarded disposable authenticated staging workflows,
feature-branch CI and production performance measurement. No production merge
or deployment is requested as part of this review handoff.

## October 8 catalogue and workspace refinement

Scope: Awareness and its seven content categories, Learn, learner Quizzes,
News & Updates, dashboard skeletons, Users and admin quiz management. The
shared design-system record was updated with the resulting catalogue, loading,
filter and independent-scroll patterns. Backend and database contracts are unchanged.

| Check | Result |
| --- | --- |
| Full unit suite, `npm run test -- --maxWorkers=1` | 315 passed, 2 skipped; 46 test files passed, 1 skipped. |
| User and quiz regressions after final focus/scroll polish | 7 passed. Checks include heading focus, restriction reasons, pending details and preserving the catalogue scroll position when another quiz is selected. |
| Final TypeScript and ESLint | Passed. |
| Final production build | Passed. The pre-existing route-test-file warning remains. |
| Public catalogue browser matrix | All 15 cases verified across Chromium, Firefox, WebKit, mobile Chrome and mobile Safari emulation. Initial run: 14 passed; the remaining case passed unchanged in isolation against the final build. Ten routes at both 390 and 1440px include axe, control height/alignment, overflow and page-error assertions; quiz filters are also exercised. |
| Role fixture browser review | 48 checks passed across 320, 390, 768 and 1440px. Actual components rendered with synthetic learner/admin data. No WCAG-tagged axe violations or page overflow; desktop filters aligned within 1px; quiz actions measured 44px high in consistent columns; native catalogue and question scrolling remained independent. |
| Secret scan | Passed, 393 text files checked. |

The fixture review includes loading dashboards, Users and its details/actions
panel, 16 quizzes with 40 mixed-length questions, side-panel editors and
confirmation controls. These checks verify presentation and interaction layout;
they do not exercise authenticated backend writes. The final user-viewer focus
adjustment was separately verified by the permanent regression test.

The full unit run passed with its normal five-second test timeout after build and
browser work stopped. An earlier overlapping run hit four timing limits. No
assertions were removed to obtain the clean run. Browser and build work must use
a stable `.output` directory; rebuilding a running worker invalidates asset hashes.
The initial mobile-Safari/1440px browser case exceeded its five-second heading
assertion while Learn still displayed its loading skeleton during overlapping
typecheck/lint work. The same test passed in isolation after the final build,
with the original timeout and every assertion intact. This is recorded as a
timing failure and a successful rerun, not an uninterrupted green matrix.

Earlier Lighthouse figures in this document are historical measurements of an
earlier build. No fresh Lighthouse or production performance claim is made for
this iteration. Human design acceptance, physical-device and manual assistive-
technology review, authenticated staging workflows and feature-branch CI remain
outside this local verification.

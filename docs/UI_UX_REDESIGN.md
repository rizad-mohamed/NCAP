# NCAP frontend redesign

The redesign is developed on `feat/ui-ux-redesign`, based on main commit
`c3491f8702f7c324d2c8260de6ad8a25a3b4667c`. The original checkout remains on main.
The feature branch is for review; it must not be merged or deployed without a
subsequent release decision.

## Critical interpretation of the brief

The two briefs agree on preserving business behavior, using a coherent design
system and separating learner and administrator needs. Their broad quality
claims need concrete evidence. “Award winning” and a monetary design value are
subjective; they are design aspirations, not test results. The implementation
uses rendered comparisons, regression tests, axe, responsive checks and
production Lighthouse measurements to assess the outcome.

No optional design package is installed. The existing React, Tailwind, Radix,
Lucide and testing tools already provide the required capabilities. Large
visual rewrites, replacing every dialog and new animation dependencies would
add risk without addressing the observed friction.

## Audit and design decisions

| Finding | Decision |
| --- | --- |
| Established accessible navy/blue identity and Atkinson typography | Retain them; add a restrained pale green highlight only on dark public and learner focus surfaces. |
| Homepage has many small boxed sections and competing collage elements | Create an editorial dark hero, one clear photographic focal point, quieter learning cards and topic rows. |
| Multi-image hero and full-resolution course photography | Use responsive, locally generated WebP assets from existing photography. |
| Public navigation uses a hover/focus-only dropdown | Use Radix keyboard and Escape behavior while retaining the existing top-level routes. |
| Dark workspace rail competes with page content | Use a quiet white rail, clear current-route state, restrained borders and role-specific navigation. |
| Colored statistic cards compete with the learner's next task | Use white statistic surfaces with small semantic accents; emphasize the resume lesson panel. |
| Announcement filter expands unnecessarily to a separate line | Use the shared filter toolbar and compact status control. |
| Announcement editor is a custom fixed modal without complete focus behavior | Use the existing Radix sheet, return focus to the invoking control and protect unsaved drafts. |
| Empty announcement results are not explained after filtering | Provide filter recovery; separate loading, errors and genuinely empty results. |
| Notification list has weak unread and action hierarchy | Use differentiated rows, readable timestamps, visible read actions and accessible touch targets. |
| Some loading pages collapse to a line of text | Introduce a reusable page skeleton with a realistic footprint. |
| Sinhala/Tamil dependencies exist but their font faces are unused | Load local script fonts only when the selected language needs them; preserve approved dictionaries and English fallback. |

## Design system

`src/styles.css` is the implementation source of truth. Use the existing
semantic Tailwind colors rather than introducing literal colors on new pages.

- Primary navy: `#112e45`; blue interaction accent: `#08699b`.
- White cards on `#f6f8fa`; neutral borders: `#dfe6ec`.
- Signal highlight: `#d7ecac` with dark `#203920` text. Reserve it for clear
  actions and emphasis on dark surfaces. It does not indicate success.
- Preserve success, warning and destructive semantic colors independently.
- Atkinson Hyperlegible is the UI typeface. Locally bundled Noto Sans Sinhala
  and Noto Sans Tamil support their respective scripts and load on demand.
- Continue using the established spacing scale and 8/10/12/16/20px radii.
- Use panel shadows sparingly; overlay shadows communicate layering.
- Interactions use 160–220ms timing. The global reduced-motion rule disables
  nonessential animation and smooth scrolling.

Use `PageHeader`, `SectionHeading`, `StatCard`, `EmptyState`, `PageSkeleton`,
`FilterToolbar`, `DashboardSearchInput`, `DashboardPagination`,
`ResponsiveTableContainer`, `dashboardButton` and the existing UI primitives.
Buttons and overlay close controls provide 44px minimum targets. Tables retain
native table structure inside a labeled keyboard-focusable scroll region.

Public content uses a generous editorial rhythm. Workspaces use a tighter
content rhythm and a 248px desktop rail. Public navigation switches to a sheet
below 1280px, where the full navigation plus language and account controls no
longer fit comfortably. Workspace navigation switches below 1024px. Sheet
editors use the full width on phones and a constrained side panel on desktops.

Contextual dialogs and confirmations follow the common right-side panel
pattern, extended in the [consistency refinement](./UI_CONSISTENCY_AND_MOTION.md).
Dedicated lesson, quiz and authoring routes retain their URLs and history behavior.

## Regression boundaries

The redesign does not modify server code, Supabase migrations, database types,
authentication functions, service hooks or domain rules. Existing progress,
scoring, certification, role guards, targeting, unread counts, cursor pagination,
read-state persistence, withdrawn-content handling and translation publication
contracts remain authoritative.

Announcement pagination and filtering are presentation-only operations over the
existing result set. Explicit English option values preserve the API audience
contract even when visible labels use approved translations. Preview renders
plain React text. The editor keeps its draft on failed saves and when discard
confirmation is declined. Closing is blocked during a pending save.

## Validation

Baseline `npm run check`: 287 passed, two skipped; 41 test files passed and one
skipped. The first redesigned full check: 293 passed, two skipped; 42 test files
passed and one skipped. Typecheck, lint, security scan and production build pass.
`npm audit --audit-level=moderate` reports zero vulnerabilities.

Six new announcement regression tests cover focus and Escape, unsaved draft
protection, preserved mutation payloads, filter recovery, correct loading/error
presentation and pagination. The new Playwright suite covers language changes,
reduced motion, keyboard menu behavior and authenticated visual/a11y review.

Before-build mobile Lighthouse baseline on the local production worker:

| Route | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 34 | 100 | 100 | 100 | 8.39s | 0 |
| `/awareness/articles` | 37 | 100 | 100 | 100 | 6.79s | 0.081 |
| `/learn` | 33 | 100 | 100 | 100 | 14.95s | 0 |

Lighthouse reports are local lab measurements, not field Core Web Vitals. The
Windows machine and concurrent work affect absolute timings. Script fonts load
on demand; no new runtime dependency is introduced. The main hero image changes
from 370,579 to 85,282 bytes, with a separate 560px variant; course images now
range from 9,576 to 36,192 bytes. Original photography remains available.

Final browser, staging, Lighthouse and CI evidence is recorded in the
[completion report](./UI_UX_REDESIGN_VERIFICATION.md). The guarded staging
runner uses disposable accounts and exact fixture IDs, then verifies cleanup;
it was blocked before execution by automatic approval review. Opt-in skips
must never be reported as passes.

The first stable redesigned production measurement produced:

| Route | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 53 | 100 | 100 | 100 | 4.45s | 0 |
| `/awareness/articles` | 72 | 100 | 100 | 100 | 1.58s | 0.000019 |
| `/learn` | 77 | 100 | 100 | 100 | 2.20s | 0 |

The remaining homepage bottleneck is the hero's load/render timing. The final
optimization adds a 720px source, accurate responsive sizing and a matching
head preload. The route already imports the homepage directly; that separation
is retained. Tablet photography is constrained to a sensible reading width.
The final homepage run improved performance to 73 and LCP to 3.88s, with CLS
remaining zero. Accessibility, best practices and SEO remained 100. This still
misses the 90+ performance and 2.5s LCP goals; main-thread work and shared
JavaScript are recorded as remaining limitations in the completion report.

The screenshot audit of `/`, `/login`, `/awareness`, `/learn` and `/quizzes`
at 390px and 1440px found no axe violations, runtime errors or document
overflow. It also observed the awareness/quiz loading-state shifts disappear.
These local, unthrottled measurements must not be confused with Lighthouse's
simulated mobile timings.

A verification build initially used different source snapshots for client and
server because source updates overlapped the build. Its stylesheet references
did not match. A stable rebuild resolved the issue, and immediate-render
responsive checks passed at all eight widths. Do not edit sources during a
release build; verify client/server stylesheet references as part of review.

## Review and rollback

Run `npm ci`, configure the existing runtime variables using `.env.example`,
then run `npm run dev` to review the feature branch. Run `npm run check`,
`npm audit --audit-level=moderate`, `node scripts/security-review.mjs` and
`npm run test:e2e` for the standard checks. Authenticated tests need the existing
disposable staging setup; do not use personal accounts for mutating tests.

To abandon the redesign, return to the original main checkout. No main branch
reset, cherry-pick or database rollback is required. No production deployment
is part of this task. Human visual review, physical-device checks and manual
screen-reader review remain release considerations.

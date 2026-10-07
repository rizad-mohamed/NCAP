# Interface consistency and motion refinement

This follow-up is implemented only in the isolated `feat/ui-ux-redesign`
worktree. Main, server/authentication functions, database migrations, repository
contracts and scoring/eligibility rules remain unchanged.

## Contextual panels across the application

Shared `DialogContent` and `AlertDialogContent` now use right-side panels with
the announcements design language: navy overlay, white surface, consistent
spacing and close controls, smooth entry and exit, full phone width, and wider
desktop variants for substantial previews. Controlled state, validation,
mutations and accessible dialog semantics are retained.

Coverage includes user/topic/module/lesson editors, awareness/learning previews,
certificates, translations and confirmations. Custom quiz/question modal
containers now use Radix. User details open in a contextual panel. Headers,
close controls and action footers remain available while long forms scroll.

Shared focus handling captures the invoking control, contains focus, supports
Escape where appropriate and restores focus on close. Pointer tracking accounts
for Safari button behavior; existing custom focus handlers remain authoritative.

Browser confirm and certificate-revocation prompt calls now use the branded
confirmation/reason panel. Mutations await explicit approval, cancellation
does not mutate, required reason text remains required, and one approval cannot
authorize multiple requests. Pending requests cancel on host unmount, account
change and browser history navigation. The browser-owned unsaved page-leave
warning remains; browsers do not permit styling that warning.

## Consistent controls and sections

`buttonVariants` is the common source for component/dashboard/public/auth
buttons. `fieldStyles` supplies native fields and Input/Textarea/Select. Legacy
native controls receive the same colors, corners and focus treatment.
`menuSurfaceStyles` supplies menu geometry and consistent item targets.

Public resource and admin user filters now use `FilterToolbar` and
`DashboardSearchInput`. Tabs and awareness section navigation share spacing,
surfaces and selected states. Success, warning and destructive treatments retain
their distinct meanings; content-specific density can vary within the system.

## Skeletons and motion

`PageSkeleton` reserves a realistic full-page footprint. `ContentSkeleton`
keeps page context visible while replacing pending content with structured rows.
It covers users/details, modules/topics, awareness administration, reports,
admin metrics, certificates/previews, quiz management and translations.
Learner dashboards and quiz preparation/results use page skeletons. Error and
empty states remain distinct from loading.

Shared controls have restrained hover/focus/press feedback. Panels enter over
300ms and exit over 200ms using the common easing curve. Navigation sheets use
the same timing. Existing page entrance/card interactions remain restrained.

Homepage photography has a bounded 18px parallax offset, a passive scroll
listener and requestAnimationFrame updates. No runtime dependency or scroll
interception was introduced. Parallax is disabled for coarse/touch pointers,
viewports below 1024px and reduced-motion preferences. Interactive controls,
forms and tables remain steady. All motion respects the reduced-motion override.

## Verification and limits

Earlier Lighthouse scores in the
initial completion report refer to that build; they are not fresh measurements
of this follow-up. Local role fixtures use actual components and synthetic
data, and do not replace live staging CRUD/authorization checks.

No staging writes, GitHub publishing, merge or deployment occurred in this
follow-up. The previous external authorization blocks remain unresolved.

The full unit/integration suite passed: **298 tests passed, two skipped**;
43 test files passed and one skipped. Five new regression tests cover explicit
approval/cancellation, required reason payloads, host cleanup, history
cancellation and focus return for controlled previews without Radix triggers.
The existing announcement draft-protection test now exercises the styled
confirmation rather than mocking the native browser prompt.

The critical-flow/navigation/responsive/redesign browser matrix passed:

| Project | Passed | Explicit skips | Failures |
| --- | ---: | ---: | ---: |
| Chromium | 15 | 23 | 0 |
| Firefox | 7 | 31 | 0 |
| WebKit | 7 | 31 | 0 |
| Mobile Chrome | 7 | 31 | 0 |
| Mobile Safari | 7 | 31 | 0 |
| Total | 43 | 147 | 0 |

Skips remain opt-in authenticated cases without authorized disposable staging
accounts, and intentionally single-project viewport/role screenshot cases.
They are not passes. Public/auth routes cover eight widths from 320 to 1920px;
language switching covers English/Sinhala/Tamil at 320, 768 and 1440px in all
five profiles. New preview checks assert right alignment, 900px viewport height,
full phone width, focus containment, Escape and focus return. Parallax checks
assert scroll response for fine pointers and no transform under reduced motion.

Initial local fixture review covered ten actual layouts at 320, 390, 768 and
1440px: learner dashboard, announcements/editor, quizzes/quiz editor/question
editor, users/user details, and modules/module editor. All 40 combinations had
zero document overflow and no axe violations. Final form refinements are
reviewed again against the last frozen production build. These previews do
not log in or call live mutation APIs.

The first browser preview check exposed missing focus restoration in controlled
legacy dialogs. Shared focus handling fixed it; the matrix above passed with
that correction. A local fixture helper exceeded its default five-second budget
while rendering ten layouts under load; its helper-only timeout was increased
to 90 seconds and the render completed successfully. No product assertion was
removed.

Typecheck, lint and production build passed. The repository security scan
passed. Final focused regressions and built-panel review are recorded in the
local `consistency-*.local.log` files and `.qa.local/redesign/fixtures/` artifacts.
Review the final built site at `http://127.0.0.1:8081`. Physical-device testing,
manual assistive-technology review and live authenticated staging remain release
checks; automated axe results are not a full WCAG certification.

The final frozen build passed a focused browser rerun: **10 passed, no skips
or failures**, covering the preview and parallax checks in all five projects.
The last focused component regressions passed **16 tests across four files**,
including existing lesson-content authoring behavior. Typecheck, ESLint and the
production build passed on the final source; the secret scan checked 385 text
files successfully.

Final layout evidence comprises 20 mobile combinations in
`fixtures/review-mobile-final.json`, 20 desktop/tablet combinations in
`fixtures/review-desktop-final.json`, and four confirmation combinations in
`fixtures/confirmation-review.json`. All **44** have zero overflow and no axe
violations. A fixture-only axe injection error interrupted the first final
desktop pass before its first result; the unfinished desktop cases passed in
a fresh browser process. Product assertions were unchanged.

The final public visual review checked `/`, `/login`, `/awareness`, `/learn`
and `/quizzes` at 390 and 1440px: no runtime errors, document overflow or axe
violations. Screenshot evidence is in `.qa.local/redesign/` and its `fixtures/`
subdirectory. Rechecking a controlled panel's viewport confirmed readable
header and close-control placement; full-page captures of fixed overlays can
distort sticky positioning and should not be mistaken for viewport behavior.

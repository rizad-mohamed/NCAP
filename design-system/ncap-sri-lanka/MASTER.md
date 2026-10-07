# NCAP design system

NCAP is a public-service cybersecurity learning platform. Public pages introduce
learning; learners need focus and a clear next action; administrators need
readable density and efficient management controls.

Implementation tokens live in `src/styles.css`. See the
[redesign guide](../../docs/UI_UX_REDESIGN.md) for component and verification
details. This file supersedes the original generated design suggestions.

## Color and surfaces

| Purpose | Token | Value |
| --- | --- | --- |
| Page canvas | `background` | `#f6f8fa` |
| Main text | `foreground` | `#142c40` |
| Panels and overlays | `card`, `popover` | white |
| Brand navy | `primary` | `#112e45` |
| Interactive blue | `violet` | `#08699b` |
| Subtle interactive surface | `primary-soft` | `#eaf3f9` |
| Secondary text | `muted-foreground` | `#475569` |
| Hairline separation | `border` | `#dfe6ec` |
| Strong separation | `border-strong` | `#cbd5e1` |
| Dark-surface highlight | `signal` | `#d7ecac` |
| Text on highlight | `signal-foreground` | `#203920` |
| Success | `success`, `success-soft` | `#047857`, `#ecfdf5` |
| Warning | `warning`, `warning-soft` | `#a16207`, `#fefce8` |
| Destructive | `destructive`, `destructive-soft` | `#dc2626`, `#fef2f2` |

The `violet` token name is retained for compatibility; its color is blue. Use
semantic utilities instead of literals. Signal is a brand highlight, not a
status color. White rails and statistic cards keep attention on content. Dark
emphasis belongs on a public hero or resume action, not every panel.

## Typography and spacing

Keep Atkinson Hyperlegible for Latin text. Local Noto Sans Sinhala and Noto Sans
Tamil fonts load on demand. Preserve approved interface dictionaries,
authored-content fallback and publication governance. Do not invent translations
or use fixed widths based on English labels.

Use the established 4, 8, 16, 24, 32, 48 and 64px spacing tokens. Public content
has an editorial rhythm; workspaces use a tighter operational rhythm. Keep
metadata quiet and body text readable. Use numeric alignment in statistics and
tables. Distinguish page, section and item heading hierarchy.

Radii are 8, 10, 12, 16 and 20px. Prefer alignment, spacing and borders over
separate cards around every element. Use `shadow-panel`, `shadow-raised` and
`shadow-overlay` when elevation communicates purpose.

## Components and navigation

Reuse the existing common and Radix UI components:

- `PageHeader`, `SectionHeading`, `StatCard`, `EmptyState`, `ProgressMeter`.
- `PageSkeleton` and `CardListSkeleton` for stable loading feedback.
- `FilterToolbar`, `DashboardSearchInput`, `ResultCount`, `DashboardPagination`.
- `ResponsiveTableContainer` for native tables with contained horizontal scroll.
- `dashboardButton`, `dashboardField`, `dashboardSelect` and `Button`.
- Radix dialogs, sheets, dropdowns and popovers for focus and keyboard behavior.

Buttons and overlay close controls have a 44px minimum target. Keep focus
visible, primary actions clear, secondary actions quiet and destructive actions
explicit. Loading, errors, no records and no filtered matches are distinct
states and need distinct explanations.

Public navigation switches to a sheet below 1280px; workspaces below 1024px.
The desktop workspace rail is 248px. Bound page widths on large monitors and
wrap content safely at 320px, including non-Latin scripts and long authored text.

Use dialogs for confirmations and short tasks, sheets for contextual editing,
and existing deep-linkable routes for complex learning, quiz and authoring
work. Handle Escape, focus containment, return focus, failed saves and unsaved
changes. Do not mechanically convert every dialog into a sheet.

## Motion and assets

Use CSS transitions with shared 160–220ms motion tokens. Respect reduced motion,
including programmatic scrolling. Avoid expensive blur, parallax, bouncing
management cards and new animation dependencies.

Reuse NCAP photography, branding and Lucide icons. Optimize photos to sized WebP
with explicit dimensions, responsive hero sources, high priority for its main
image and lazy loading below the fold. Avoid decorative images on data-heavy
management screens.

## Verification

Run typecheck, lint, existing tests, security checks and the production build.
Run the browser matrix and distinguish opt-in skips from passes. Check keyboard
navigation, 320–1920px layouts, 200% text reflow, supported languages and reduced
motion. Use axe as evidence; retain manual screen-reader and physical-device
review as release checks.

Measure production Lighthouse before/after and preserve provenance. Verify
first-render stylesheet references as well as hydrated layout. Never weaken
authorization, security or content integrity for visual polish.

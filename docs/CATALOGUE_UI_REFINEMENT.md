# Catalogue and workspace refinement

This iteration addresses the October 8 review of Awareness, its seven content
areas, Learn, Quizzes, News & Updates, dashboard loading, Users and quiz management.
It lives in the isolated `feat/ui-ux-redesign` worktree. Main remains at
`c3491f8702f7c324d2c8260de6ad8a25a3b4667c`.

## Findings and changes

The original catalogue screens had different search heights, filter arrangements,
card media treatments and action placement. `CatalogueHero`, `CatalogueCover`,
`catalogueCard`, `catalogueGrid`, `FilterField` and the shared search component now
give them one compact editorial identity: navy, blue, pale green, white surfaces,
consistent typography and 44px controls. Real uploaded media retains precedence;
learning cards reuse the optimized existing photography. Posters and infographics
use contained previews so their information remains visible. Card footer actions
fill the available width and align across a row.

The banners use small CSS/Lucide artwork and bounded decorative motion. The
existing photographic parallax remains on the homepage. Reduced-motion rules
disable decorative motion. No Three.js or other runtime dependency was added:
the graphical treatment does not require a canvas to communicate the content.

Users filters now have matching visible labels and align along the control edge.
Responsive layouts wrap complete groups. The side panel uses an account definition
table, learning metrics, module-progress table and recent activity list. Role and
status updates have distinct, aligned field/action rows. Existing self-account
protection, restriction reasons and mutation payloads remain intact. Mutation
controls do not appear until account details load. The table's View column stays
visible while the wide data table scrolls.
Opening the viewer focuses its heading without scrolling to account controls;
keyboard users start at the account information and retain the dialog focus trap.

Quiz management has two named, keyboard-reachable, independent scroll regions.
Desktop panels use the available viewport height; phones stack the panels and
bound both lists. Section headers remain outside the scrolling content. A
container query determines when question text and the shared three-button action
grid fit beside each other. Long prompts no longer push individual button groups
into inconsistent positions. Choosing another quiz returns its question list to
the top while preserving the catalogue position.

Dashboard loading previously added skeletons above zero-valued metrics and empty
charts. Initial requests now replace that content with a metric/chart skeleton.
The admin dashboard waits for its dependent summaries; the learner dashboard also
waits for module data and active attempt-history requests. Reports and user lists
do not announce empty results or zero-record pagination before data arrives.
Catalogue skeletons remain inside the existing title/filter layout.

Header spacing, workspace padding, catalogue gaps and the public footer gap are
tighter. Touch targets, readable text and authored content are preserved.

## Verification scope

Permanent tests cover delayed dashboard sources, pending reports and users,
details-before-actions, user mutation reasons, module progress/bookmarks, quiz
filters and availability, independent quiz regions and pending awareness results.
Browser tests cover the ten public catalogue routes at phone and desktop widths
with alignment, target-size, overflow and axe assertions.

Local role fixtures render the actual components with synthetic data, including
16 quizzes and 40 mixed-length prompts. Their browser review measures action
columns and native independent scrolling at 320, 390, 768 and 1440px. These are
presentation checks, not authenticated database mutation tests.

Final check results are recorded in `UI_UX_REDESIGN_VERIFICATION.md`. Earlier
Lighthouse measurements in that document belong to the earlier build and are not
fresh performance claims for this iteration. No main merge, remote publication,
database migration, deployment or privileged staging write is included.

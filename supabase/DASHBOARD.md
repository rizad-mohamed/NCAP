# Dashboard deployment and verification

Apply `migrations/202609300001_dashboard.sql` after the Auth, Learning, and Quiz migrations. The migration seeds only the badge rule catalogue. It does not seed learner history or announcements. The migration backfills earned badges from existing completions and submitted quiz attempts.

The application requires the existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `APP_URL` settings. No Dashboard service key is needed. The migration adds:

- `dashboard_announcements`: scheduled notices managed by Super Admins.
- `dashboard_badges` and `dashboard_user_badges`: rule catalogue and immutable earned history.
- `dashboard_learning_sessions`: server measured, bounded lesson time.
- Guarded learner and admin RPCs with private, uncached server functions.

Learner progress and bookmarks remain in Learning tables. Quiz results remain in Quiz tables. The activity feed combines Learning activity, Quiz attempts, and badge awards. A lesson route begins a time session and sends heartbeats only while the tab is visible and focused; the server uses its own clock, rejects missing sessions, and caps both heartbeat credit and session duration. Time recorded before this migration cannot be reconstructed and is intentionally shown as zero.

After applying the migration, verify as a learner and a Super Admin:

1. Open a lesson, stay active for more than 30 seconds, complete it, then reload the Dashboard in another browser session. Progress, activity, earned badge, and learning time should persist.
2. Complete a quiz. Its score and start/completion events should appear on the learner Dashboard; the admin overview and report should update.
3. Create and activate an announcement in `/admin/announcements`. It should appear for the intended learners within its scheduled dates.
4. Confirm direct writes to `dashboard_user_badges`, `dashboard_learning_sessions`, Learning completions, and Quiz attempts are denied for learners. Confirm learner B sees none of learner A's Dashboard history. Confirm admin RPCs reject learner tokens.

Run `npm run check` and `npx vitest run src/server/dashboard/database.integration.test.ts src/features/admin/DashboardSections.test.tsx` before release. The integration test applies the production migrations to PGlite and tests the actual PostgreSQL RLS and RPC behaviour.

Admin reports show accurate totals and charts for the selected range. Attempt rows are paginated at 100 per page; CSV export downloads the visible page. The user overview is paginated at 20 learners per page. Learner activity is paginated at 20 events per page.

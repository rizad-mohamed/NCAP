# Administrator Users deployment and operations

The Users route uses the existing Supabase Auth identities and `public.profiles` roles. Apply
`202609300003_admin_users.sql` and then `202609300004_admin_users_request_guard.sql` after the
Auth, Learning, Quiz, and Dashboard migrations. The linked staging project has both migrations
recorded. `node scripts/users-deploy.mjs verify` checks RLS, the PostgREST request guard, and
anonymous RPC denial. `node scripts/users-deploy.mjs live-check` runs admin and learner access,
status, Auth ban, and audit assertions inside a rolled-back database transaction.
`node scripts/users-live-auth.mjs` creates one disposable staging learner, verifies learner RPC
denial and immediate denial of an existing token after suspension, then removes the Auth user and
profile. It does not print credentials or tokens.

The list and details APIs return bounded Learning and Quiz aggregates from their existing tables.
They expose no private quiz answers or full activity history. List search covers email, name,
role, and status; server-side role and status filters, sorting, and pagination are supported.
The user detail response contains module progress and up to ten recent learning activity entries.

Only an active Super Admin can call the Users RPCs. The server functions verify the Auth user and
authoritative profile, validate inputs, return private uncached responses, and omit database error
details. The database functions independently check active Super Admin status. Changes to roles or
status are transactional and audited with actor, target, old/new values, reason, and time. A profile
trigger prevents removal, suspension, disabling, or deletion of the final active Super Admin.
Admins cannot change their own role or status through the Users API. Restricting an account requires
a reason. Status changes also set or clear `auth.users.banned_until`, so Auth rejects new sign-ins
and token refreshes. The PostgREST pre-request guard denies inactive profiles even when an older
access token remains valid. The guard uses the signed JWT role and applies to all Data API requests.

`public.admin_user_audit` has RLS enabled and is readable only by an active Super Admin. The
profiles table keeps its restricted column update grant, so learners cannot write role or status.
Trigram indexes support name and email substring searches. A role/status/date index supports
filters, and the existing Learning and Quiz history indexes support per-page aggregation.

The configured Supabase project is a staging backend. The repository currently has no public HTTPS
frontend deployment, and Auth origin configuration remains a release gate. PostgREST's pre-request
hook does not cover Storage or Realtime; existing Auth bans stop new tokens, while an already-issued
token can remain usable against those products until expiry. [Supabase's API security guide](https://supabase.com/docs/guides/api/securing-your-api)
describes this Data API boundary. Any future private Storage or Realtime policy for account-specific
data must include the same active-account check.

Verification: `npm run check`, the Users PGlite integration test, and the Users page test.
No test accounts or learner history are seeded by these migrations.

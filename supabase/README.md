# Supabase authentication setup

See [Announcements, notifications, localization and media](COMMUNICATIONS_LOCALIZATION.md) for the
application feature migrations, permissions, translation governance and staging test operations.

See [Authentication verification and release gates](AUTHENTICATION_VERIFICATION.md) for the
current staging configuration, finalization migrations, security results, and production requirements.

For persistent Learning content, progress, bookmarks and media, follow [Learning deployment and operations](LEARNING.md).
For the persistent Quiz module, follow [Quiz deployment](QUIZ.md) after applying Learning.

For the persistent Awareness module, follow [Awareness deployment and operations](AWARENESS.md)
after applying the authentication migration below.

See the [final Awareness readiness decision](AWARENESS_READINESS.md) for release gates and
verification evidence, and the [backend reference architecture](AWARENESS_REFERENCE_ARCHITECTURE.md)
for future NCAP modules.

## Apply the migration

Apply `migrations/202609190001_auth_profiles.sql` with the Supabase CLI or paste it into the
project SQL Editor. It creates the profile table, secure learner default, Super Admin role lookup,
triggers, grants, and Row Level Security policies.

Confirm installation in the SQL Editor before testing registration:

```sql
select to_regclass('public.profiles') as profiles_table;
```

The result must be `public.profiles`.

User/session/profile operations use the publishable key and user RLS. Shared authentication
throttling additionally requires a server-only `SUPABASE_SERVICE_ROLE_KEY` host secret. Never
expose it in frontend configuration. Configure trusted ingress as described in the verification report.

## Provision the first Super Admin

1. Register the administrator through the normal application registration flow.
2. Copy that user's UUID from **Authentication > Users** in the Supabase dashboard.
3. Run the following once in the SQL Editor, replacing the placeholder UUID:

```sql
update public.profiles
set role = 'super_admin'
where id = '00000000-0000-0000-0000-000000000000';
```

Never add an administrator role to registration metadata or expose role assignment through a
browser-accessible database grant. New users always receive the `learner` role.

## Auth URL configuration

Set the Supabase Auth **Site URL** to the deployed `APP_URL`. Allow only these exact callbacks:

- `<APP_URL>/auth/callback`
- `<APP_URL>/auth/callback?next=%2Freset-password`

Production deployments must use HTTPS.
The confirmed staging worker currently uses `http://127.0.0.1:4173`. Its local URLs must be
replaced with the actual HTTPS deployment origin before release. SMTP/email delivery and
CAPTCHA remain explicit release gates.

## End-to-end test accounts

Authenticated Playwright scenarios use real, disposable Supabase accounts. Set these only in the
test runner environment; do not commit them:

```text
E2E_LEARNER_EMAIL
E2E_LEARNER_PASSWORD
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
```

The administrator account must have `profiles.role = 'super_admin'`. Without these variables,
authenticated scenarios are skipped; public authentication validation and route-guard tests still
run. Never use production user accounts for browser automation.

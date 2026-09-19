# Supabase authentication setup

## Apply the migration

Apply `migrations/202609190001_auth_profiles.sql` with the Supabase CLI or paste it into the
project SQL Editor. It creates the profile table, secure learner default, Super Admin role lookup,
triggers, grants, and Row Level Security policies.

The application intentionally does not use or require a service-role key.

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

Set the Supabase Auth **Site URL** to the deployed `APP_URL`. Add these redirect URLs:

- `http://localhost:8080/auth/callback`
- `http://localhost:8080/reset-password`
- The equivalent `/auth/callback` and `/reset-password` URLs for each deployed environment

Production deployments must use HTTPS.

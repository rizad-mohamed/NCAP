-- NCAP identity profile and role model.
-- Roles are authoritative database data; registration metadata is never trusted for authorization.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  create type public.app_role as enum ('learner', 'super_admin');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null check (char_length(display_name) between 2 and 100),
  role public.app_role not null default 'learner',
  language text not null default 'en' check (language in ('en', 'si', 'ta')),
  phone text not null default '' check (char_length(phone) <= 24),
  notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, language, phone, notifications) on table public.profiles to authenticated;
grant usage on type public.app_role to authenticated;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'::public.app_role
  );
$$;

revoke all on function private.is_super_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_super_admin() to authenticated;

drop policy if exists "profiles_select_own_or_super_admin" on public.profiles;
create policy "profiles_select_own_or_super_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_super_admin())
);

drop policy if exists "profiles_update_own_safe_fields" on public.profiles;
create policy "profiles_update_own_safe_fields"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  requested_language text;
begin
  requested_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Learner'
    ),
    100
  );
  if char_length(requested_name) < 2 then
    requested_name := 'Learner';
  end if;
  requested_language := new.raw_user_meta_data ->> 'language';

  insert into public.profiles (id, email, display_name, language)
  values (
    new.id,
    coalesce(new.email, ''),
    requested_name,
    case when requested_language in ('en', 'si', 'ta') then requested_language else 'en' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = coalesce(new.email, ''), updated_at = now()
  where id = new.id;
  return new;
end;
$$;

revoke all on function private.sync_auth_user_email() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function private.sync_auth_user_email();

create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_profile_updated_at() from public, anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function private.set_profile_updated_at();

-- Backfill users that existed before this migration. Role remains the secure learner default.
insert into public.profiles (id, email, display_name, language)
select
  users.id,
  coalesce(users.email, ''),
  case
    when char_length(names.candidate) >= 2 then left(names.candidate, 100)
    else 'Learner'
  end,
  case
    when users.raw_user_meta_data ->> 'language' in ('en', 'si', 'ta')
      then users.raw_user_meta_data ->> 'language'
    else 'en'
  end
from auth.users as users
cross join lateral (
  select coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Learner'
  ) as candidate
) as names
on conflict (id) do nothing;

comment on table public.profiles is 'Authoritative NCAP identity profiles and application roles.';
comment on column public.profiles.role is 'Server/database-controlled role. Never sourced from user metadata.';

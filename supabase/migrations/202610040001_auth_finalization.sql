begin;
alter table public.profiles add column interests text[] not null default '{}';
alter table public.profiles add column avatar jsonb;
create function private.valid_profile_interests(items text[]) returns boolean
language sql immutable set search_path='' as $$
  select cardinality(items)<=30 and not exists(select 1 from unnest(items) item
    where item is null or char_length(btrim(item)) not between 1 and 100)
    and cardinality(items)=(select count(distinct item) from unnest(items) item);
$$;
revoke all on function private.valid_profile_interests(text[]) from public,anon;
grant execute on function private.valid_profile_interests(text[]) to authenticated;
alter table public.profiles add constraint profile_interests_valid check(private.valid_profile_interests(interests));
alter table public.profiles add constraint profile_avatar_valid check(avatar is null or (
  jsonb_typeof(avatar)='object' and octet_length(avatar::text)<=352000
  and coalesce(avatar->>'storageKey','') ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
  and coalesce(avatar->>'status','')='ready'));
grant update(interests,avatar) on public.profiles to authenticated;
drop policy profiles_update_own_safe_fields on public.profiles;
create policy profiles_update_own_safe_fields on public.profiles for update to authenticated
using(id=(select auth.uid()) and status='active')
with check(id=(select auth.uid()) and status='active');

-- Preserve stable UUIDs after ON DELETE SET NULL removes the live references.
alter table public.admin_user_audit add column actor_identity uuid;
alter table public.admin_user_audit add column target_identity uuid;
update public.admin_user_audit set actor_identity=actor_id,target_identity=target_id;
create function private.snapshot_account_audit() returns trigger language plpgsql
security definer set search_path='' as $$
begin
  new.actor_identity:=new.actor_id;
  new.target_identity:=new.target_id;
  return new;
end $$;
revoke all on function private.snapshot_account_audit() from public,anon,authenticated;
create trigger snapshot_account_audit before insert on public.admin_user_audit
for each row execute function private.snapshot_account_audit();

-- Shared, atomic counters; only server credentials may consume a bucket.
create table private.auth_attempt_limits (
  bucket text primary key check(char_length(bucket)=64),
  started_at timestamptz not null, attempts integer not null
);
revoke all on private.auth_attempt_limits from public,anon,authenticated;
alter table private.auth_attempt_limits enable row level security;
create function public.auth_consume_attempt(bucket_key text, max_attempts integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if char_length(bucket_key)<>64 or max_attempts not between 1 and 1000 or window_seconds not between 1 and 3600 then
    raise exception 'Invalid throttle' using errcode='22023';
  end if;
  delete from private.auth_attempt_limits where started_at<now()-interval '2 hours';
  insert into private.auth_attempt_limits as limits values(bucket_key,clock_timestamp(),1)
  on conflict(bucket) do update set
    attempts=case when limits.started_at<=clock_timestamp()-make_interval(secs=>window_seconds) then 1 else limits.attempts+1 end,
    started_at=case when limits.started_at<=clock_timestamp()-make_interval(secs=>window_seconds) then clock_timestamp() else limits.started_at end
  returning attempts into n;
  return n<=max_attempts;
end $$;
revoke all on function public.auth_consume_attempt(text,integer,integer) from public,anon,authenticated;
grant execute on function public.auth_consume_attempt(text,integer,integer) to service_role;
commit;

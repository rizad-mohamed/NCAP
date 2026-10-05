begin;

-- Immutable snapshots retain the actor and resource UUID even after deletion.
create table public.announcement_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_uuid uuid,
  announcement_id uuid not null,
  action text not null check(action in ('create','edit','delete','activate','deactivate')),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now(),
  check(before_state is not null or after_state is not null)
);
create index announcement_audit_resource on public.announcement_audit(announcement_id,created_at desc);
alter table public.announcement_audit enable row level security;
revoke all on public.announcement_audit from public,anon,authenticated;
grant select on public.announcement_audit to authenticated;
create policy announcement_audit_admin on public.announcement_audit for select to authenticated
  using((select private.is_super_admin()));

create function private.audit_announcement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.announcement_audit(actor_id,actor_uuid,announcement_id,action,before_state,after_state)
  values(auth.uid(),auth.uid(),coalesce(new.id,old.id),
    case when tg_op='INSERT' then 'create' when tg_op='DELETE' then 'delete'
      when old.active is distinct from new.active then case when new.active then 'activate' else 'deactivate' end
      else 'edit' end,
    case when tg_op<>'INSERT' then to_jsonb(old) end,
    case when tg_op<>'DELETE' then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
revoke all on function private.audit_announcement() from public,anon,authenticated;
create trigger announcement_audit after insert or update or delete on public.dashboard_announcements
  for each row execute function private.audit_announcement();

create table public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  announcement_id uuid references public.dashboard_announcements(id) on delete set null,
  event_key text not null check(length(event_key) between 1 and 200),
  category text not null check(category in ('announcement','administrative')),
  title text not null check(length(btrim(title)) between 1 and 160),
  body text not null check(length(btrim(body)) between 1 and 2000),
  href text not null check(href in ('/dashboard','/admin/announcements')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(user_id,event_key)
);
create index notifications_history on public.in_app_notifications(user_id,created_at desc,id desc);
create index notifications_unread on public.in_app_notifications(user_id) where read_at is null;
alter table public.in_app_notifications enable row level security;
revoke all on public.in_app_notifications from public,anon,authenticated;
grant select on public.in_app_notifications to authenticated;
create policy notifications_own on public.in_app_notifications for select to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active'));

create table public.notification_generation_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_uuid uuid not null,
  generated_count integer not null check(generated_count>0),
  source text not null default 'announcement_sync' check(source='announcement_sync'),
  created_at timestamptz not null default now()
);
create index notification_generation_recent on public.notification_generation_audit(created_at desc);
alter table public.notification_generation_audit enable row level security;
revoke all on public.notification_generation_audit from public,anon,authenticated;
grant select on public.notification_generation_audit to authenticated;
create policy notification_generation_admin on public.notification_generation_audit for select to authenticated
  using((select private.is_super_admin()));

-- Delivery is materialized for the signed-in user on refresh, avoiding a global
-- fan-out job. Future schedules become eligible on the next visit. No polling.
create function public.notifications_sync() returns integer
language plpgsql security definer set search_path='' as $$
declare p public.profiles; generated integer;
begin
  select * into p from public.profiles where id=auth.uid() and status='active';
  if p.id is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not p.notifications then return 0; end if;
  insert into public.in_app_notifications(user_id,announcement_id,event_key,category,title,body,href)
  select p.id,a.id,'announcement:'||a.id,'announcement',a.title,a.body,
    case when p.role='super_admin' then '/admin/announcements' else '/dashboard' end
  from public.dashboard_announcements a where a.active and current_date between a.starts_at and a.ends_at
    and ((p.role='learner' and (a.audience='All Learners' or
      (a.audience='New Learners' and p.created_at>=now()-interval '30 days')))
      or (p.role='super_admin' and a.audience='Administrators'))
  on conflict(user_id,event_key) do nothing;
  get diagnostics generated=row_count;
  if generated>0 then
    insert into public.notification_generation_audit(user_id,user_uuid,generated_count) values(p.id,p.id,generated);
  end if;
  return generated;
end $$;

create function public.notifications_list(page_before timestamptz default null, before_id uuid default null,
  page_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if not exists(select 1 from public.profiles where id=u and status='active') then
    raise exception 'Sign in required' using errcode='42501'; end if;
  if page_limit is null or page_limit<1 or page_limit>50 or (page_before is null)<>(before_id is null) then
    raise exception 'Invalid pagination' using errcode='22023'; end if;
  select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc,n.id desc),'[]'::jsonb),
    'unreadCount',(select count(*) from public.in_app_notifications where user_id=u and read_at is null)) into result
  from (select id,title,body,category,href,created_at,read_at from public.in_app_notifications
    where user_id=u and (page_before is null or (created_at,id)<(page_before,before_id))
    order by created_at desc,id desc limit page_limit) n;
  return result;
end $$;

create function public.notifications_set_read(target uuid, is_read boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if is_read is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then
    raise exception 'Access denied' using errcode='42501'; end if;
  update public.in_app_notifications set read_at=case when is_read then coalesce(read_at,now()) else null end
    where id=target and user_id=auth.uid();
  if not found then raise exception 'Notification unavailable' using errcode='P0002'; end if;
end $$;
create function public.notifications_read_all() returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then
    raise exception 'Access denied' using errcode='42501'; end if;
  update public.in_app_notifications set read_at=now() where user_id=auth.uid() and read_at is null;
end $$;
revoke all on function public.notifications_sync(),public.notifications_list(timestamptz,uuid,integer),
  public.notifications_set_read(uuid,boolean),public.notifications_read_all() from public,anon,authenticated;
grant execute on function public.notifications_sync(),public.notifications_list(timestamptz,uuid,integer),
  public.notifications_set_read(uuid,boolean),public.notifications_read_all() to authenticated;

-- Direct table reads also enforce active learner role, not only audience/date.
drop policy dashboard_announcements_read on public.dashboard_announcements;
create policy dashboard_announcements_read on public.dashboard_announcements for select to authenticated
using((select private.is_super_admin()) or (active and current_date between starts_at and ends_at
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active' and p.role='learner'
    and (audience='All Learners' or (audience='New Learners' and p.created_at>=now()-interval '30 days')))));

commit;

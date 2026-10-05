begin;
-- Preserve delivery evidence while enforcing current announcement authorization.
create function private.notification_announcement_visible(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.dashboard_announcements a join public.profiles p on p.id=auth.uid()
    where a.id=target and p.status='active' and a.active and current_date between a.starts_at and a.ends_at
      and ((p.role='learner' and (a.audience='All Learners' or
        (a.audience='New Learners' and p.created_at>=now()-interval '30 days')))
        or (p.role='super_admin' and a.audience='Administrators')));
$$;
revoke all on function private.notification_announcement_visible(uuid) from public,anon,authenticated;
grant execute on function private.notification_announcement_visible(uuid) to authenticated;
drop policy notifications_own on public.in_app_notifications;
create policy notifications_own on public.in_app_notifications for select to authenticated
using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active')
  and (category<>'announcement' or private.notification_announcement_visible(announcement_id)));

create or replace function public.notifications_list(page_before timestamptz default null, before_id uuid default null,
  page_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if not exists(select 1 from public.profiles where id=u and status='active') then
    raise exception 'Sign in required' using errcode='42501'; end if;
  if page_limit is null or page_limit<1 or page_limit>50 or (page_before is null)<>(before_id is null) then
    raise exception 'Invalid pagination' using errcode='22023'; end if;
  select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('id',n.id,
    'title',case when n.available then n.title else '' end,
    'body',case when n.available then n.body else '' end,
    'href',case when n.available then n.href else null end,
    'category',n.category,'created_at',n.created_at,'read_at',n.read_at,'available',n.available)
    order by n.created_at desc,n.id desc),'[]'::jsonb),
    'unreadCount',(select count(*) from public.in_app_notifications where user_id=u and read_at is null)) into result
  from (select id,title,body,category,href,created_at,read_at,
    category<>'announcement' or private.notification_announcement_visible(announcement_id) available
    from public.in_app_notifications where user_id=u
    and (page_before is null or (created_at,id)<(page_before,before_id))
    order by created_at desc,id desc limit page_limit) n;
  return result;
end $$;
revoke all on function public.notifications_list(timestamptz,uuid,integer) from public,anon,authenticated;
grant execute on function public.notifications_list(timestamptz,uuid,integer) to authenticated;
commit;

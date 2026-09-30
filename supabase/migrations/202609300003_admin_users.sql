-- Administrator Users: authoritative status, guarded mutations and bounded read APIs.
begin;
alter table public.profiles add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended', 'disabled'));
update public.profiles p set status='suspended'
from auth.users u where p.id=u.id and u.banned_until>now() and p.status='active';

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create index if not exists profiles_email_search on public.profiles using gin (email extensions.gin_trgm_ops);
create index if not exists profiles_name_search on public.profiles using gin (display_name extensions.gin_trgm_ops);
create index if not exists profiles_role_status_created on public.profiles (role,status,created_at desc,id);
create index if not exists quiz_attempts_user_submitted on public.quiz_attempts (user_id,completed_at desc)
  where status='submitted';

create table public.admin_user_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  target_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('role_changed','activated','suspended','disabled','restored')),
  old_value text not null,
  new_value text not null,
  reason text not null default '' check (char_length(reason)<=500),
  created_at timestamptz not null default now()
);
create index admin_user_audit_target on public.admin_user_audit (target_id,created_at desc);
alter table public.admin_user_audit enable row level security;
revoke all on public.admin_user_audit from anon, authenticated;
grant select on public.admin_user_audit to authenticated;
create policy admin_user_audit_read on public.admin_user_audit for select to authenticated
  using ((select private.is_super_admin()));

-- Replace the shared admin predicate so suspended accounts lose privileges immediately.
create or replace function private.is_super_admin() returns boolean language sql stable security definer
set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid())
    and role='super_admin' and status='active');
$$;

-- This trigger also covers direct privileged SQL updates and Auth-user deletion cascades.
create function private.protect_last_super_admin() returns trigger language plpgsql
security definer set search_path='' as $$
begin
  if old.role='super_admin' and old.status='active' and
     (tg_op='DELETE' or new.role<>'super_admin' or new.status<>'active') then
    perform pg_advisory_xact_lock(20363, 1);
    if not exists(select 1 from public.profiles p where p.id<>old.id
      and p.role='super_admin' and p.status='active') then
      raise exception 'The final active Super Admin cannot be removed' using errcode='23514';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.protect_last_super_admin() from public,anon,authenticated;
create trigger protect_last_super_admin before update of role,status or delete on public.profiles
for each row execute function private.protect_last_super_admin();

create function public.admin_users_list(page_offset integer default 0,page_limit integer default 20,
  search_text text default '',role_filter text default '',status_filter text default '',
  sort_field text default 'created',sort_direction text default 'desc') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if page_offset<0 or page_offset>1000000 or page_limit<1 or page_limit>100 or
     char_length(search_text)>100 or role_filter not in ('','learner','super_admin') or
     status_filter not in ('','active','suspended','disabled') or
     sort_field not in ('created','name','email','activity') or sort_direction not in ('asc','desc') then
    raise exception 'Invalid user filters' using errcode='22023';
  end if;
  with matched as (
    select p.id,p.email,p.display_name,p.role,p.status,p.language,p.created_at
    from public.profiles p where (role_filter='' or p.role::text=role_filter)
      and (status_filter='' or p.status=status_filter)
      and (search_text='' or p.email ilike '%'||search_text||'%' or p.display_name ilike '%'||search_text||'%'
        or p.role::text ilike '%'||search_text||'%' or p.status ilike '%'||search_text||'%')
  ), numbered as (
    select m.* from matched m order by
      case when sort_field='created' and sort_direction='asc' then m.created_at end asc,
      case when sort_field='created' and sort_direction='desc' then m.created_at end desc,
      case when sort_field='name' and sort_direction='asc' then m.display_name end asc,
      case when sort_field='name' and sort_direction='desc' then m.display_name end desc,
      case when sort_field='email' and sort_direction='asc' then m.email end asc,
      case when sort_field='email' and sort_direction='desc' then m.email end desc,
      m.id
    limit page_limit offset page_offset
  ), enriched as (
    select n.*,
      (select count(*) from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
        where c.user_id=n.id and l.status='Published') completed,
      (select count(*) from public.learning_modules m where m.status='Published' and exists
        (select 1 from public.learning_lessons l where l.module_id=m.id and l.status='Published')
        and not exists(select 1 from public.learning_lessons l where l.module_id=m.id
          and l.status='Published' and not exists(select 1 from public.learning_completions c
            where c.user_id=n.id and c.lesson_id=l.id))) modules_completed,
      (select coalesce(round(avg(a.score_percent)),0) from public.quiz_attempts a
        where a.user_id=n.id and a.status='submitted') quiz_average,
      (select count(*) from public.quiz_attempts a where a.user_id=n.id and a.status='submitted') attempts,
      greatest(coalesce((select max(a.created_at) from public.learning_activity a where a.user_id=n.id),n.created_at),
        coalesce((select max(a.completed_at) from public.quiz_attempts a where a.user_id=n.id and a.status='submitted'),n.created_at)) last_activity
    from numbered n
  )
  select jsonb_build_object('total',(select count(*) from matched),
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.display_name,
      'email',e.email,'role',e.role,'status',e.status,'language',e.language,'joinedAt',e.created_at,
      'completedLessons',e.completed,'completedModules',e.modules_completed,
      'progressPercent',case when (select count(*) from public.learning_lessons l where l.status='Published')=0
        then 0 else round(100.0*e.completed/(select count(*) from public.learning_lessons l where l.status='Published')) end,
      'quizAverage',e.quiz_average,'attempts',e.attempts,'lastActivity',e.last_activity)
      order by
        case when sort_field='created' and sort_direction='asc' then e.created_at end asc,
        case when sort_field='created' and sort_direction='desc' then e.created_at end desc,
        case when sort_field='name' and sort_direction='asc' then e.display_name end asc,
        case when sort_field='name' and sort_direction='desc' then e.display_name end desc,
        case when sort_field='email' and sort_direction='asc' then e.email end asc,
        case when sort_field='email' and sort_direction='desc' then e.email end desc,
        e.id) from enriched e),'[]'::jsonb)) into result;
  return result;
end $$;

create function public.admin_user_details(target uuid) returns jsonb language plpgsql stable
security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  select jsonb_build_object('id',p.id,'name',p.display_name,'email',p.email,'role',p.role,
    'status',p.status,'language',p.language,'joinedAt',p.created_at,
    'completedLessons',(select count(*) from public.learning_completions c where c.user_id=p.id),
    'modules',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,
      'completed',(select count(*) from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
        where c.user_id=p.id and l.module_id=m.id),
      'total',(select count(*) from public.learning_lessons l where l.module_id=m.id and l.status='Published')))
      from public.learning_modules m where m.status='Published'),'[]'::jsonb),
    'attempts',(select count(*) from public.quiz_attempts a where a.user_id=p.id and a.status='submitted'),
    'quizAverage',(select coalesce(round(avg(a.score_percent)),0) from public.quiz_attempts a where a.user_id=p.id and a.status='submitted'),
    'lastActivity',greatest(coalesce((select max(a.created_at) from public.learning_activity a where a.user_id=p.id),p.created_at),
      coalesce((select max(a.completed_at) from public.quiz_attempts a where a.user_id=p.id and a.status='submitted'),p.created_at)),
    'recentActivity',coalesce((select jsonb_agg(jsonb_build_object('kind',x.kind,'at',x.at) order by x.at desc)
      from (select kind,created_at at from public.learning_activity where user_id=p.id order by created_at desc limit 10) x),'[]'::jsonb))
    into result from public.profiles p where p.id=target;
  if result is null then raise exception 'User unavailable' using errcode='P0002'; end if;
  return result;
end $$;

create function public.admin_user_change(target uuid,new_role public.app_role default null,
  new_status text default null,reason text default '') returns void language plpgsql
security definer set search_path='' as $$
declare previous public.profiles; action_name text;
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if (new_role is null)=(new_status is null) or target=auth.uid() or
     char_length(reason)>500 or (new_status is not null and new_status not in ('active','suspended','disabled')) or
     (new_status in ('suspended','disabled') and char_length(btrim(reason))<3) then
    raise exception 'Invalid user change' using errcode='22023';
  end if;
  select * into previous from public.profiles where id=target for update;
  if not found then raise exception 'User unavailable' using errcode='P0002'; end if;
  if new_role is not null then
    if previous.role=new_role then return; end if;
    update public.profiles set role=new_role where id=target;
    action_name:='role_changed';
  else
    if previous.status=new_status then return; end if;
    update public.profiles set status=new_status where id=target;
    -- Auth rejects new sign-ins and token refreshes while the account is banned.
    update auth.users set banned_until=case when new_status='active' then null
      else now()+interval '100 years' end where id=target;
    action_name:=case when new_status='suspended' then 'suspended'
      when new_status='disabled' then 'disabled'
      when previous.status='suspended' then 'restored' else 'activated' end;
  end if;
  insert into public.admin_user_audit(actor_id,target_id,action,old_value,new_value,reason)
    values(auth.uid(),target,action_name,
      case when new_role is not null then previous.role::text else previous.status end,
      coalesce(new_role::text,new_status),btrim(reason));
end $$;

revoke all on function public.admin_users_list(integer,integer,text,text,text,text,text),
  public.admin_user_details(uuid),public.admin_user_change(uuid,public.app_role,text,text) from public,anon,authenticated;
grant execute on function public.admin_users_list(integer,integer,text,text,text,text,text),
  public.admin_user_details(uuid),public.admin_user_change(uuid,public.app_role,text,text) to authenticated;
commit;

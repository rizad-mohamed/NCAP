begin;

alter table public.dashboard_learning_sessions add column ended_at timestamptz;
with ranked as (
  select id,row_number() over(partition by user_id order by started_at desc,id desc) rank
  from public.dashboard_learning_sessions
)
update public.dashboard_learning_sessions s set ended_at=now()
from ranked r where r.id=s.id and r.rank>1;
create unique index dashboard_one_open_session on public.dashboard_learning_sessions(user_id) where ended_at is null;

create or replace function public.dashboard_begin_lesson(target text) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid; u uuid:=auth.uid(); title text;
begin
  if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.learning_lesson_visible(target) then raise exception 'Lesson unavailable' using errcode='P0002'; end if;
  -- Lock the owner row so two tabs cannot both create an open session.
  perform 1 from public.profiles where id=u for update;
  update public.dashboard_learning_sessions set ended_at=now() where user_id=u and ended_at is null;
  select l.title into title from public.learning_lessons l where l.id=target;
  insert into public.dashboard_learning_sessions(user_id,lesson_id) values(u,target) returning id into sid;
  if not exists(select 1 from public.learning_activity a where a.user_id=u and a.lesson_id=target
    and a.kind='opened' and a.created_at>now()-interval '5 minutes') then
    insert into public.learning_activity(user_id,lesson_id,kind,label)
      values(u,target,'opened','Opened "' || title || '"');
  end if;
  return sid;
end $$;

create or replace function public.dashboard_heartbeat(target uuid) returns integer language plpgsql security definer set search_path='' as $$
declare s public.dashboard_learning_sessions; elapsed integer;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into s from public.dashboard_learning_sessions where id=target and user_id=auth.uid() for update;
  if s.id is null then raise exception 'Session unavailable' using errcode='P0002'; end if;
  if s.ended_at is not null or s.started_at<now()-interval '4 hours' then return s.active_seconds; end if;
  elapsed:=greatest(0,floor(extract(epoch from now()-s.last_heartbeat_at))::int);
  if elapsed between 5 and 75 then
    update public.dashboard_learning_sessions set active_seconds=least(14400,active_seconds+elapsed),last_heartbeat_at=now()
      where id=target returning active_seconds into elapsed;
  else
    update public.dashboard_learning_sessions set last_heartbeat_at=now() where id=target;
    elapsed:=s.active_seconds;
  end if;
  return elapsed;
end $$;
commit;

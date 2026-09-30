begin;

create table public.dashboard_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  body text not null check (length(btrim(body)) between 1 and 2000),
  audience text not null check (audience in ('All Learners','New Learners','Administrators')),
  active boolean not null default false,
  starts_at date not null,
  ends_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index dashboard_announcements_visible on public.dashboard_announcements(active,starts_at,ends_at);

create table public.dashboard_badges (
  id text primary key,
  name text not null,
  description text not null,
  rule text not null unique
);
insert into public.dashboard_badges(id,name,description,rule) values
  ('b-first-lesson','First Lesson','Completed your first NCAP lesson.','first_lesson'),
  ('b-phishing','Phishing Spotter','Scored 80% or higher on the phishing quiz.','phishing_quiz'),
  ('b-mfa','MFA Champion','Completed the Passwords & MFA module.','passwords_module'),
  ('b-explorer','Security Explorer','Completed lessons in three different modules.','three_modules'),
  ('b-streak','Learning Streak','Completed lessons on three separate days.','three_days');
create table public.dashboard_user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.dashboard_badges(id),
  earned_at timestamptz not null default now(),
  primary key(user_id,badge_id)
);
create index dashboard_user_badges_recent on public.dashboard_user_badges(user_id,earned_at desc);

create table public.dashboard_learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null references public.learning_lessons(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  active_seconds integer not null default 0 check (active_seconds between 0 and 14400)
);
create index dashboard_sessions_user on public.dashboard_learning_sessions(user_id,started_at desc);
create index dashboard_sessions_lesson on public.dashboard_learning_sessions(lesson_id);
create index dashboard_quiz_recent on public.quiz_attempts(user_id,completed_at desc) where status='submitted';
create index dashboard_quiz_report on public.quiz_attempts(completed_at desc) where status='submitted';
create index dashboard_completion_recent on public.learning_completions(user_id,completed_at desc);

do $$ declare t text; begin
  foreach t in array array['dashboard_announcements','dashboard_badges','dashboard_user_badges','dashboard_learning_sessions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
  end loop;
end $$;
grant select on public.dashboard_badges,public.dashboard_user_badges,public.dashboard_learning_sessions,public.dashboard_announcements to authenticated;
create policy dashboard_badges_read on public.dashboard_badges for select to authenticated using(true);
create policy dashboard_earned_own on public.dashboard_user_badges for select to authenticated using(user_id=(select auth.uid()));
create policy dashboard_sessions_own on public.dashboard_learning_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy dashboard_announcements_read on public.dashboard_announcements for select to authenticated
  using ((active and current_date between starts_at and ends_at and
    (audience='All Learners' or (audience='New Learners' and exists
      (select 1 from public.profiles p where p.id=auth.uid() and p.created_at>=now()-interval '30 days'))))
    or (select private.is_super_admin()));

create function private.dashboard_award_badges(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.dashboard_user_badges(user_id,badge_id)
  select target,b.id from public.dashboard_badges b where
    (b.rule='first_lesson' and exists(select 1 from public.learning_completions c where c.user_id=target)) or
    (b.rule='phishing_quiz' and exists(select 1 from public.quiz_attempts a join public.quiz_definitions q on q.id=a.quiz_id
      where a.user_id=target and a.status='submitted' and a.score_percent>=80 and (q.id='q-phishing' or q.slug like '%phish%'))) or
    (b.rule='passwords_module' and exists(select 1 from public.learning_modules m where m.id='m-passwords' and
      exists(select 1 from public.learning_lessons l where l.module_id=m.id and l.status='Published') and
      not exists(select 1 from public.learning_lessons l where l.module_id=m.id and l.status='Published' and
        not exists(select 1 from public.learning_completions c where c.user_id=target and c.lesson_id=l.id)))) or
    (b.rule='three_modules' and (select count(distinct l.module_id) from public.learning_completions c
      join public.learning_lessons l on l.id=c.lesson_id where c.user_id=target)>=3) or
    (b.rule='three_days' and exists(select 1 from public.learning_completions c1
      where c1.user_id=target and exists(select 1 from public.learning_completions c2
        where c2.user_id=target and (c2.completed_at at time zone 'Asia/Colombo')::date =
          (c1.completed_at at time zone 'Asia/Colombo')::date + 1)
      and exists(select 1 from public.learning_completions c3
        where c3.user_id=target and (c3.completed_at at time zone 'Asia/Colombo')::date =
          (c1.completed_at at time zone 'Asia/Colombo')::date + 2)))
  on conflict do nothing;
end $$;
create function private.dashboard_after_lesson() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.dashboard_award_badges(new.user_id); return new; end $$;
create trigger dashboard_lesson_badges after insert on public.learning_completions
  for each row execute function private.dashboard_after_lesson();
create function private.dashboard_after_quiz() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='submitted' and old.status is distinct from new.status then
    perform private.dashboard_award_badges(new.user_id);
  end if;
  return new;
end $$;
create trigger dashboard_quiz_badges after update of status on public.quiz_attempts
  for each row execute function private.dashboard_after_quiz();
do $$ declare u uuid; begin
  for u in select distinct user_id from public.learning_completions union select distinct user_id from public.quiz_attempts loop
    perform private.dashboard_award_badges(u);
  end loop;
end $$;

create function public.dashboard_begin_lesson(target text) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid; u uuid:=auth.uid(); title text;
begin
  if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.learning_lesson_visible(target) then raise exception 'Lesson unavailable' using errcode='P0002'; end if;
  select l.title into title from public.learning_lessons l where l.id=target;
  insert into public.dashboard_learning_sessions(user_id,lesson_id) values(u,target) returning id into sid;
  if not exists(select 1 from public.learning_activity a where a.user_id=u and a.lesson_id=target
    and a.kind='opened' and a.created_at>now()-interval '5 minutes') then
    insert into public.learning_activity(user_id,lesson_id,kind,label)
      values(u,target,'opened','Opened "' || title || '"');
  end if;
  return sid;
end $$;
alter table public.learning_activity drop constraint if exists learning_activity_kind_check;
alter table public.learning_activity add constraint learning_activity_kind_check check (kind in ('lesson','bookmark','opened'));

create function public.dashboard_heartbeat(target uuid) returns integer language plpgsql security definer set search_path='' as $$
declare s public.dashboard_learning_sessions; elapsed integer;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into s from public.dashboard_learning_sessions where id=target and user_id=auth.uid() for update;
  if s.id is null then raise exception 'Session unavailable' using errcode='P0002'; end if;
  if s.started_at<now()-interval '4 hours' then return s.active_seconds; end if;
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

create function public.dashboard_learner(activity_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if activity_offset<0 or activity_offset>100000 then raise exception 'Invalid offset' using errcode='22023'; end if;
  select jsonb_build_object(
    'statistics',public.learning_statistics(),
    'learningSeconds',(select coalesce(sum(active_seconds),0) from public.dashboard_learning_sessions where user_id=u),
    'badges',(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'description',b.description,
      'earned',e.earned_at is not null,'earnedAt',e.earned_at) order by b.id),'[]'::jsonb)
      from public.dashboard_badges b left join public.dashboard_user_badges e on e.badge_id=b.id and e.user_id=u),
    'announcements',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body) order by starts_at desc),'[]'::jsonb)
      from public.dashboard_announcements where active and current_date between starts_at and ends_at
      and (audience='All Learners' or (audience='New Learners' and exists(select 1 from public.profiles p
        where p.id=u and p.created_at>=now()-interval '30 days')))),
    'activities',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'label',label,'at',at) order by at desc),'[]'::jsonb)
      from (select id::text,kind,label,created_at at from public.learning_activity where user_id=u
        union all select a.id::text,'quiz','Completed quiz: ' || q.title || ' (' || a.score_percent || '%)',a.completed_at
          from public.quiz_attempts a join public.quiz_definitions q on q.id=a.quiz_id where a.user_id=u and a.status='submitted'
        union all select a.id::text || ':start','quiz','Started quiz: ' || q.title,a.started_at
          from public.quiz_attempts a join public.quiz_definitions q on q.id=a.quiz_id where a.user_id=u
        union all select badge_id,'badge','Earned badge: ' || b.name,e.earned_at
          from public.dashboard_user_badges e join public.dashboard_badges b on b.id=e.badge_id where e.user_id=u
        order by at desc limit 20 offset activity_offset) feed)
  ) into result;
  return result;
end $$;

create function public.dashboard_admin() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return jsonb_build_object(
    'users',(select count(*) from public.profiles where role='learner'),
    'activeLearners',(select count(distinct user_id) from (
      select user_id from public.dashboard_learning_sessions where started_at>=now()-interval '30 days'
      union all select user_id from public.learning_activity where created_at>=now()-interval '30 days'
      union all select user_id from public.quiz_attempts where started_at>=now()-interval '30 days') active),
    'publishedLessons',(select count(*) from public.learning_lessons where status='Published'),
    'draftLessons',(select count(*) from public.learning_lessons where status='Draft'),
    'completedLessons',(select count(*) from public.learning_completions),
    'learningSeconds',(select coalesce(sum(active_seconds),0) from public.dashboard_learning_sessions),
    'completionRate',(select coalesce(round(avg(progress)),0) from (select
      100.0*(select count(*) from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
        where c.user_id=p.id and l.status='Published') /
      nullif((select count(*) from public.learning_lessons where status='Published'),0) progress
      from public.profiles p where p.role='learner') x),
    'topicEngagement',(select coalesce(jsonb_agg(jsonb_build_object('topic',topic,'learners',learners) order by learners desc),'[]'::jsonb)
      from (select t.name topic,count(distinct a.user_id) learners from public.learning_activity a
        join public.learning_lessons l on l.id=a.lesson_id join public.learning_topics t on t.id=l.topic_id
        where a.kind='opened' group by t.name order by learners desc limit 8) x),
    'recentActivity',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'at',at) order by at desc),'[]'::jsonb)
      from (select a.id::text id,p.display_name || ': ' || a.label label,a.created_at at
        from public.learning_activity a join public.profiles p on p.id=a.user_id
        union all select a.id::text,p.display_name || ': completed ' || q.title,a.completed_at
        from public.quiz_attempts a join public.profiles p on p.id=a.user_id join public.quiz_definitions q on q.id=a.quiz_id
        where a.status='submitted' order by at desc limit 7) x),
    'completionRows',(select coalesce(jsonb_agg(jsonb_build_object('period',period,'completions',completions) order by bucket),'[]'::jsonb)
      from (select date_trunc('month',completed_at) bucket,to_char(completed_at,'Mon YYYY') period,count(*) completions
        from public.learning_completions group by 1,2) x),
    'announcements',(select count(*) from public.dashboard_announcements where active and current_date between starts_at and ends_at)
  );
end $$;

create function public.dashboard_report(days integer default 183, module_filter text default null, quiz_filter text default null,
  attempt_offset integer default 0, attempt_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if days<1 or days>3660 or attempt_offset<0 or attempt_offset>100000 or attempt_limit<1 or attempt_limit>100 then
    raise exception 'Invalid report pagination' using errcode='22023'; end if;
  return jsonb_build_object(
    'attemptCount',(select count(*) from public.quiz_attempts a join public.quiz_definitions q on q.id=a.quiz_id
      where a.status='submitted' and a.completed_at>=now()-make_interval(days=>days)
      and (module_filter is null or q.module_id=module_filter) and (quiz_filter is null or q.id=quiz_filter)),
    'averageScore',(select coalesce(round(avg(a.score_percent)),0) from public.quiz_attempts a
      join public.quiz_definitions q on q.id=a.quiz_id where a.status='submitted'
      and a.completed_at>=now()-make_interval(days=>days)
      and (module_filter is null or q.module_id=module_filter) and (quiz_filter is null or q.id=quiz_filter)),
    'quizRows',(select coalesce(jsonb_agg(jsonb_build_object('period',period,'attempts',attempts,'average',average) order by bucket),'[]'::jsonb)
      from (select date_trunc('month',a.completed_at) bucket,to_char(a.completed_at,'Mon YYYY') period,
        count(*) attempts,round(avg(a.score_percent)) average from public.quiz_attempts a
        join public.quiz_definitions q on q.id=a.quiz_id where a.status='submitted'
        and a.completed_at>=now()-make_interval(days=>days)
        and (module_filter is null or q.module_id=module_filter) and (quiz_filter is null or q.id=quiz_filter)
        group by 1,2) x),
    'attempts',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'completedAt',a.completed_at,'quizId',q.id,
      'quizTitle',q.title,'moduleId',m.id,'moduleTitle',m.title,'scorePercent',a.score_percent,'passed',a.passed) order by a.completed_at desc),'[]'::jsonb)
      from (select a.* from public.quiz_attempts a join public.quiz_definitions qf on qf.id=a.quiz_id
        where a.status='submitted' and a.completed_at>=now()-make_interval(days=>days)
        and (module_filter is null or qf.module_id=module_filter) and (quiz_filter is null or qf.id=quiz_filter)
        order by a.completed_at desc limit attempt_limit offset attempt_offset) a
      join public.quiz_definitions q on q.id=a.quiz_id join public.learning_modules m on m.id=q.module_id
      ),
    'completedLessons',(select count(*) from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
      where c.completed_at>=now()-make_interval(days=>days) and (module_filter is null or l.module_id=module_filter)),
    'learningSeconds',(select coalesce(sum(s.active_seconds),0) from public.dashboard_learning_sessions s
      join public.learning_lessons l on l.id=s.lesson_id where s.started_at>=now()-make_interval(days=>days)
      and (module_filter is null or l.module_id=module_filter)),
    'completionRows',(select coalesce(jsonb_agg(jsonb_build_object('period',period,'completions',completions) order by bucket),'[]'::jsonb)
      from (select date_trunc('month',c.completed_at) bucket,to_char(c.completed_at,'Mon YYYY') period,count(*) completions
        from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
        where c.completed_at>=now()-make_interval(days=>days) and (module_filter is null or l.module_id=module_filter)
        group by 1,2) x)
  );
end $$;

create function public.dashboard_announcements_admin() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'audience',audience,
    'active',active,'startsAt',starts_at,'endsAt',ends_at) order by created_at desc)
    from public.dashboard_announcements),'[]'::jsonb);
end $$;
create function public.dashboard_users(page_offset integer default 0, page_limit integer default 20, search_text text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if page_offset<0 or page_offset>100000 or page_limit<1 or page_limit>100 or length(search_text)>100 then
    raise exception 'Invalid pagination' using errcode='22023';
  end if;
  return jsonb_build_object(
    'total',(select count(*) from public.profiles p where p.role='learner' and
      (search_text='' or p.display_name ilike '%' || search_text || '%' or p.email ilike '%' || search_text || '%')),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',display_name,'email',email,'language',language,
      'joinedAt',created_at,'completedLessons',completed,'progressPercent',progress,'quizAverage',quiz_average,
      'attempts',attempts,'lastActivity',last_activity) order by created_at desc),'[]'::jsonb)
      from (select p.id,p.display_name,p.email,p.language,p.created_at,
        (select count(*) from public.learning_completions c where c.user_id=p.id) completed,
        (select case when count(*)=0 then 0 else round(100.0*count(*) filter(where c.lesson_id is not null)/count(*)) end
          from public.learning_lessons l left join public.learning_completions c on c.lesson_id=l.id and c.user_id=p.id
          where l.status='Published') progress,
        (select coalesce(round(avg(score_percent)),0) from public.quiz_attempts a where a.user_id=p.id and a.status='submitted') quiz_average,
        (select count(*) from public.quiz_attempts a where a.user_id=p.id and a.status='submitted') attempts,
        greatest(coalesce((select max(created_at) from public.learning_activity a where a.user_id=p.id),p.created_at),
          coalesce((select max(completed_at) from public.quiz_attempts a where a.user_id=p.id and a.status='submitted'),p.created_at)) last_activity
        from public.profiles p where p.role='learner' and
        (search_text='' or p.display_name ilike '%' || search_text || '%' or p.email ilike '%' || search_text || '%')
        order by p.created_at desc limit page_limit offset page_offset) x)
  );
end $$;
create function public.dashboard_save_announcement(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if payload ? 'id' and nullif(payload->>'id','') is not null then
    update public.dashboard_announcements set title=payload->>'title',body=payload->>'body',audience=payload->>'audience',
      active=(payload->>'active')::boolean,starts_at=(payload->>'startsAt')::date,ends_at=(payload->>'endsAt')::date,updated_at=now()
      where id=(payload->>'id')::uuid;
    if not found then raise exception 'Announcement unavailable' using errcode='P0002'; end if;
  else
    insert into public.dashboard_announcements(title,body,audience,active,starts_at,ends_at)
      values(payload->>'title',payload->>'body',payload->>'audience',(payload->>'active')::boolean,
        (payload->>'startsAt')::date,(payload->>'endsAt')::date);
  end if;
end $$;
create function public.dashboard_delete_announcement(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  delete from public.dashboard_announcements where id=target;
end $$;

revoke all on function private.dashboard_award_badges(uuid),private.dashboard_after_lesson(),private.dashboard_after_quiz() from public,anon,authenticated;
revoke all on function public.dashboard_begin_lesson(text),public.dashboard_heartbeat(uuid),public.dashboard_learner(integer),
  public.dashboard_admin(),public.dashboard_report(integer,text,text,integer,integer),public.dashboard_users(integer,integer,text),public.dashboard_announcements_admin(),
  public.dashboard_save_announcement(jsonb),public.dashboard_delete_announcement(uuid) from public,anon,authenticated;
grant execute on function public.dashboard_begin_lesson(text),public.dashboard_heartbeat(uuid),public.dashboard_learner(integer),
  public.dashboard_admin(),public.dashboard_report(integer,text,text,integer,integer),public.dashboard_users(integer,integer,text),public.dashboard_announcements_admin(),
  public.dashboard_save_announcement(jsonb),public.dashboard_delete_announcement(uuid) to authenticated;
commit;

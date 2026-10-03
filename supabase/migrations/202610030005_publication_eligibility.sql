-- Eligibility and report capacity use published learner content even for admins.
begin;
create or replace function private.certificate_eligibility(learner uuid,module_target text) returns jsonb
language sql stable security definer set search_path='' as $$
  with lessons as (
    select l.id,l.version,c.completed_at from public.learning_lessons l
    join public.learning_topics t on t.id=l.topic_id and t.status='Active'
    left join public.learning_completions c on c.lesson_id=l.id and c.user_id=learner
    where l.module_id=module_target and l.status='Published'
  ), result as (
    select a.id,a.score_percent,a.completed_at,q.id quiz_id from public.quiz_attempts a
    join public.quiz_definitions q on q.id=a.quiz_id where a.user_id=learner and q.module_id=module_target
      and a.status='submitted' order by a.score_percent desc,a.completed_at desc,a.id limit 1
  ) select jsonb_build_object(
    'eligible',exists(select 1 from public.learning_modules m join public.learning_topics t on t.id=m.topic_id
      where m.id=module_target and m.status='Published' and t.status='Active') and
      exists(select 1 from public.profiles where id=learner and role='learner' and status='active') and
      (select count(*)>0 and count(*)=count(completed_at) from lessons) and coalesce((select score_percent>=80 from result),false),
    'completionPercent',(select case when count(*)=0 then 0 else floor(100.0*count(completed_at)/count(*)) end from lessons),
    'bestScore',coalesce((select score_percent from result),0),
    'threshold',80,'attemptId',(select id from result),'quizId',(select quiz_id from result),
    'learnerName',(select display_name from public.profiles where id=learner),
    'moduleTitle',(select title from public.learning_modules where id=module_target),
    'moduleVersion',(select version from public.learning_modules where id=module_target),
    'lessons',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'completedAt',completed_at) order by id),'[]'::jsonb) from lessons)
  );
$$;
revoke all on function private.certificate_eligibility(uuid,text) from public,anon,authenticated;

create or replace function public.admin_content_report(days integer default 183,module_filter text default null,quiz_filter text default null,page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare effective_module text:=module_filter; base jsonb; lesson_count bigint; learner_count bigint; completed_count bigint;
begin
  if not private.certificate_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if days is null or page_offset is null or days not between 1 and 3660 or page_offset not between 0 and 100000 then
    raise exception 'Invalid filters' using errcode='22023'; end if;
  if quiz_filter is not null then
    select module_id into effective_module from public.quiz_definitions where id=quiz_filter;
    if not found or (module_filter is not null and module_filter<>effective_module) then raise exception 'Invalid quiz filter' using errcode='22023'; end if;
  end if;
  base:=public.dashboard_report(days,effective_module,quiz_filter,page_offset,100);
  select count(*) into lesson_count from public.learning_lessons l
    join public.learning_modules m on m.id=l.module_id and m.status='Published'
    join public.learning_topics mt on mt.id=m.topic_id and mt.status='Active'
    join public.learning_topics lt on lt.id=l.topic_id and lt.status='Active'
    where l.status='Published' and (effective_module is null or l.module_id=effective_module);
  select count(*) into learner_count from public.profiles where role='learner' and status='active';
  select count(*) into completed_count from public.learning_completions c
    join public.learning_lessons l on l.id=c.lesson_id and l.status='Published'
    join public.learning_modules m on m.id=l.module_id and m.status='Published'
    join public.learning_topics mt on mt.id=m.topic_id and mt.status='Active'
    join public.learning_topics lt on lt.id=l.topic_id and lt.status='Active'
    join public.profiles p on p.id=c.user_id where p.role='learner' and p.status='active'
      and c.completed_at>=now()-make_interval(days=>days) and (effective_module is null or l.module_id=effective_module);
  return base||jsonb_build_object('completionRate',coalesce(round(100.0*completed_count/nullif(lesson_count*learner_count,0)),0),
    'publishedQuizzes',(select count(*) from public.quiz_definitions q where q.status='Published' and
      (effective_module is null or q.module_id=effective_module) and (quiz_filter is null or q.id=quiz_filter)));
end $$;
revoke all on function public.admin_content_report(integer,text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_content_report(integer,text,text,integer) to authenticated;
commit;

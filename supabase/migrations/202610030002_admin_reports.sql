begin;
-- Reuse Dashboard aggregation, applying quiz's module consistently to Learning metrics.
create function public.admin_content_report(days integer default 183,module_filter text default null,quiz_filter text default null,page_offset integer default 0)
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
  select count(*) into lesson_count from public.learning_lessons l where private.learning_lesson_visible(l.id) and (effective_module is null or l.module_id=effective_module);
  select count(*) into learner_count from public.profiles where role='learner' and status='active';
  select count(*) into completed_count from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
    join public.profiles p on p.id=c.user_id where p.role='learner' and p.status='active' and private.learning_lesson_visible(l.id)
      and c.completed_at>=now()-make_interval(days=>days) and (effective_module is null or l.module_id=effective_module);
  return base||jsonb_build_object('completionRate',coalesce(round(100.0*completed_count/nullif(lesson_count*learner_count,0)),0),
    'publishedQuizzes',(select count(*) from public.quiz_definitions q where q.status='Published' and
      (effective_module is null or q.module_id=effective_module) and (quiz_filter is null or q.id=quiz_filter)));
end $$;

create function public.admin_content_report_export(days integer default 183,module_filter text default null,quiz_filter text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare summary jsonb; rows jsonb;
begin
  summary:=public.admin_content_report(days,module_filter,quiz_filter,0);
  if (summary->>'attemptCount')::bigint>10000 then raise exception 'Narrow export filters' using errcode='54000'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'completedAt',a.completed_at,'quizTitle',q.title,'moduleTitle',m.title,
    'scorePercent',a.score_percent,'passed',a.passed) order by a.completed_at desc,a.id),'[]'::jsonb) into rows
    from public.quiz_attempts a join public.quiz_definitions q on q.id=a.quiz_id join public.learning_modules m on m.id=q.module_id
    where a.status='submitted' and a.completed_at>=now()-make_interval(days=>days)
      and (module_filter is null or q.module_id=module_filter) and (quiz_filter is null or q.id=quiz_filter);
  return rows;
end $$;
create index if not exists quiz_attempts_report on public.quiz_attempts(completed_at desc,id) where status='submitted';
create index if not exists learning_completions_report on public.learning_completions(completed_at,lesson_id);
create index if not exists dashboard_sessions_report on public.dashboard_learning_sessions(started_at,lesson_id);
revoke all on function public.admin_content_report(integer,text,text,integer),public.admin_content_report_export(integer,text,text) from public,anon,authenticated;
grant execute on function public.admin_content_report(integer,text,text,integer),public.admin_content_report_export(integer,text,text) to authenticated;
commit;

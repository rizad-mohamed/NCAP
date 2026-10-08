-- Complete the existing user-detail contract using the user-list definitions.
begin;

create or replace function public.admin_user_details(target uuid) returns jsonb language plpgsql stable
security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_super_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  select jsonb_build_object('id',p.id,'name',p.display_name,'email',p.email,'role',p.role,
    'status',p.status,'language',p.language,'joinedAt',p.created_at,
    'completedLessons',(select count(*) from public.learning_completions c where c.user_id=p.id),
    'completedModules',(select count(*) from public.learning_modules m where m.status='Published' and exists
      (select 1 from public.learning_lessons l where l.module_id=m.id and l.status='Published')
      and not exists(select 1 from public.learning_lessons l where l.module_id=m.id
        and l.status='Published' and not exists(select 1 from public.learning_completions c
          where c.user_id=p.id and c.lesson_id=l.id))),
    'progressPercent',case when (select count(*) from public.learning_lessons l where l.status='Published')=0
      then 0 else round(100.0*(select count(*) from public.learning_completions c
        join public.learning_lessons l on l.id=c.lesson_id where c.user_id=p.id and l.status='Published')
        /(select count(*) from public.learning_lessons l where l.status='Published')) end,
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

commit;

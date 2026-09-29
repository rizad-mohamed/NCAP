begin;

create table public.quiz_definitions (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,99}$'),
  module_id text not null unique references public.learning_modules(id) on delete restrict,
  title text not null check (length(btrim(title)) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (length(btrim(description)) between 1 and 2000),
  instructions text not null default '',
  topic text not null check (length(btrim(topic)) between 1 and 120),
  difficulty text not null check (difficulty in ('Beginner','Intermediate','Advanced')),
  duration_seconds integer not null default 600 check (duration_seconds between 60 and 7200),
  passing_percent integer not null default 70 check (passing_percent between 0 and 100),
  eligibility_percent integer not null default 80 check (eligibility_percent between 0 and 100),
  max_attempts integer check (max_attempts is null or max_attempts between 1 and 100),
  cooldown_seconds integer not null default 0 check (cooldown_seconds between 0 and 604800),
  question_count integer not null default 10 check (question_count between 1 and 100),
  status text not null default 'Draft' check (status in ('Draft','Published')),
  version integer not null default 1 check (version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quiz_definitions_catalogue on public.quiz_definitions(status,module_id);

create table public.quiz_questions (
  id text primary key check (length(id) between 2 and 120),
  quiz_id text not null references public.quiz_definitions(id) on delete cascade,
  prompt text not null check (length(btrim(prompt)) between 5 and 2000),
  topic text not null check (length(btrim(topic)) between 1 and 120),
  difficulty text not null check (difficulty in ('Beginner','Intermediate','Advanced')),
  display_order integer not null default 1 check (display_order between 1 and 10000),
  explanation text not null check (length(btrim(explanation)) between 1 and 2000),
  status text not null default 'Draft' check (status in ('Draft','Published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quiz_questions_pool on public.quiz_questions(quiz_id,status,display_order);
create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.quiz_questions(id) on delete cascade,
  position integer not null check (position between 0 and 9),
  answer_text text not null check (length(btrim(answer_text)) between 1 and 500),
  is_correct boolean not null default false,
  unique(question_id,position)
);
create unique index quiz_options_one_correct on public.quiz_options(question_id) where is_correct;

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id text not null references public.quiz_definitions(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  correct_count integer,
  total_count integer,
  score_percent integer,
  passed boolean,
  integrity jsonb not null default '{}'::jsonb,
  unique(user_id,quiz_id,attempt_number),
  check ((status='in_progress' and completed_at is null and score_percent is null) or
    (status<>'in_progress' and completed_at is not null and score_percent between 0 and 100))
);
create unique index quiz_one_active_attempt on public.quiz_attempts(user_id,quiz_id) where status='in_progress';
create index quiz_attempts_user_history on public.quiz_attempts(user_id,quiz_id,started_at desc);
create table public.quiz_attempt_items (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  question_id text not null,
  prompt text not null,
  topic text not null,
  difficulty text not null,
  explanation text not null,
  options jsonb not null check (jsonb_typeof(options)='array'),
  correct_option_id uuid not null,
  selected_option_id uuid,
  answered_at timestamptz,
  primary key(attempt_id,position),
  unique(attempt_id,question_id)
);
create table public.quiz_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  record_type text not null,
  record_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index quiz_audit_record on public.quiz_audit(record_type,record_id,created_at desc);

create function private.quiz_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='super_admin');
$$;
create function private.quiz_visible(target text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.quiz_definitions q where q.id=target and q.status='Published' and private.learning_module_visible(q.module_id));
$$;
grant usage on schema private to anon,authenticated;
revoke all on function private.quiz_admin(),private.quiz_visible(text) from public;
grant execute on function private.quiz_admin(),private.quiz_visible(text) to anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['quiz_definitions','quiz_questions','quiz_options','quiz_attempts','quiz_attempt_items','quiz_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
  end loop;
end $$;
grant select on public.quiz_definitions to anon,authenticated;
create policy quiz_catalogue_read on public.quiz_definitions for select using(private.quiz_visible(id) or private.quiz_admin());
-- Questions, correct answers, snapshots, scores and audit rows are accessible only via guarded RPCs.

create function private.quiz_catalogue_row(q public.quiz_definitions) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',q.id,'moduleId',q.module_id,'title',q.title,'slug',q.slug,
    'description',q.description,'instructions',q.instructions,'topic',q.topic,'difficulty',q.difficulty,
    'durationSeconds',q.duration_seconds,'passingPercent',q.passing_percent,
    'eligibilityPercent',q.eligibility_percent,'maxAttempts',q.max_attempts,
    'cooldownSeconds',q.cooldown_seconds,'questionCount',q.question_count,'status',q.status,
    'version',q.version,'createdAt',q.created_at,'updatedAt',q.updated_at,
    'availableQuestions',(select count(*) from public.quiz_questions x where x.quiz_id=q.id and x.status='Published' and (select count(*) from public.quiz_options o where o.question_id=x.id)=
      (select count(*) from public.quiz_options o where o.question_id=x.id and o.is_correct=false)+1 and
      (select count(*) from public.quiz_options o where o.question_id=x.id) between 2 and 10));
$$;
create function public.quiz_catalogue(admin boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if admin and not private.quiz_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(private.quiz_catalogue_row(q) order by q.title) from public.quiz_definitions q
    where (admin and private.quiz_admin()) or private.quiz_visible(q.id)),'[]'::jsonb);
end $$;

create function public.quiz_admin_questions(target text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.quiz_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'quizId',x.quiz_id,'prompt',x.prompt,
    'topic',x.topic,'difficulty',x.difficulty,'order',x.display_order,'explanation',x.explanation,
    'status',x.status,'version',x.version,'options',coalesce((select jsonb_agg(o.answer_text order by o.position)
      from public.quiz_options o where o.question_id=x.id),'[]'::jsonb),
    'correctIndex',(select o.position from public.quiz_options o where o.question_id=x.id and o.is_correct))
    order by x.display_order,x.id) from public.quiz_questions x where target is null or x.quiz_id=target),'[]'::jsonb);
end $$;

create function public.quiz_save_definition(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare target text:=payload->>'id'; prior public.quiz_definitions; saved public.quiz_definitions; begin
  if not private.quiz_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(726030);
  select * into prior from public.quiz_definitions where id=target for update;
  if found and prior.version is distinct from (payload->>'version')::int then raise exception 'Stale version' using errcode='PT409'; end if;
  if prior.id is null and payload ? 'version' then raise exception 'Stale version' using errcode='PT409'; end if;
  if not exists(select 1 from public.learning_modules where id=payload->>'moduleId') then raise exception 'Missing module' using errcode='23503'; end if;
  if prior.id is not null and prior.module_id<>payload->>'moduleId' and exists(select 1 from public.quiz_attempts where quiz_id=target) then
    raise exception 'Quiz module cannot change after attempts' using errcode='23514';
  end if;
  if payload->>'status'='Published' and not private.learning_module_visible(payload->>'moduleId') then raise exception 'Publish the module first' using errcode='23514'; end if;
  insert into public.quiz_definitions(id,module_id,title,slug,description,instructions,topic,difficulty,duration_seconds,passing_percent,eligibility_percent,max_attempts,cooldown_seconds,question_count,status,created_by,updated_by)
  values(target,payload->>'moduleId',btrim(payload->>'title'),payload->>'slug',btrim(payload->>'description'),coalesce(payload->>'instructions',''),payload->>'topic',
    payload->>'difficulty',(payload->>'durationSeconds')::int,(payload->>'passingPercent')::int,(payload->>'eligibilityPercent')::int,
    (payload->>'maxAttempts')::int,coalesce((payload->>'cooldownSeconds')::int,0),(payload->>'questionCount')::int,payload->>'status',auth.uid(),auth.uid())
  on conflict(id) do update set module_id=excluded.module_id,title=excluded.title,slug=excluded.slug,description=excluded.description,
    instructions=excluded.instructions,topic=excluded.topic,difficulty=excluded.difficulty,duration_seconds=excluded.duration_seconds,
    passing_percent=excluded.passing_percent,eligibility_percent=excluded.eligibility_percent,max_attempts=excluded.max_attempts,
    cooldown_seconds=excluded.cooldown_seconds,question_count=excluded.question_count,status=excluded.status,version=quiz_definitions.version+1,
    updated_by=auth.uid(),updated_at=now() returning * into saved;
  insert into public.quiz_audit(actor_id,record_type,record_id,action,before_data,after_data)
    values(auth.uid(),'quiz',target,case when prior.id is null then 'create' else 'update' end,to_jsonb(prior),to_jsonb(saved));
  return private.quiz_catalogue_row(saved);
end $$;
create function public.quiz_delete_definition(target text,expected_version int) returns void language plpgsql security definer set search_path='' as $$
declare prior public.quiz_definitions; begin
  if not private.quiz_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into prior from public.quiz_definitions where id=target for update;
  if prior.id is null then raise exception 'Missing quiz' using errcode='P0002'; end if;
  if prior.version<>expected_version then raise exception 'Stale version' using errcode='PT409'; end if;
  if exists(select 1 from public.quiz_attempts where quiz_id=target) then raise exception 'Unpublish quizzes with attempts' using errcode='23514'; end if;
  delete from public.quiz_definitions where id=target;
  insert into public.quiz_audit(actor_id,record_type,record_id,action,before_data) values(auth.uid(),'quiz',target,'delete',to_jsonb(prior));
end $$;
create function public.quiz_save_question(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare target text:=payload->>'id'; prior public.quiz_questions; saved public.quiz_questions;
  opts jsonb:=payload->'options'; i int; correct int:=(payload->>'correctIndex')::int; begin
  if not private.quiz_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if jsonb_typeof(opts)<>'array' or jsonb_array_length(opts) not between 2 and 10 or correct not between 0 and jsonb_array_length(opts)-1 then raise exception 'Invalid options' using errcode='23514'; end if;
  for i in 0..jsonb_array_length(opts)-1 loop
    if jsonb_typeof(opts->i)<>'string' or length(btrim(opts->>i)) not between 1 and 500 then raise exception 'Invalid answer' using errcode='23514'; end if;
  end loop;
  perform pg_advisory_xact_lock(726030);
  select * into prior from public.quiz_questions where id=target for update;
  if prior.id is not null and prior.version is distinct from (payload->>'version')::int then raise exception 'Stale version' using errcode='PT409'; end if;
  if prior.id is null and payload ? 'version' then raise exception 'Stale version' using errcode='PT409'; end if;
  if not exists(select 1 from public.quiz_definitions where id=payload->>'quizId') then raise exception 'Missing quiz' using errcode='23503'; end if;
  insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
  values(target,payload->>'quizId',btrim(payload->>'prompt'),payload->>'topic',payload->>'difficulty',(payload->>'order')::int,btrim(payload->>'explanation'),payload->>'status')
  on conflict(id) do update set quiz_id=excluded.quiz_id,prompt=excluded.prompt,topic=excluded.topic,difficulty=excluded.difficulty,
    display_order=excluded.display_order,explanation=excluded.explanation,status=excluded.status,version=quiz_questions.version+1,
    updated_at=now() returning * into saved;
  delete from public.quiz_options where question_id=target;
  for i in 0..jsonb_array_length(opts)-1 loop
    insert into public.quiz_options(question_id,position,answer_text,is_correct) values(target,i,btrim(opts->>i),i=correct);
  end loop;
  insert into public.quiz_audit(actor_id,record_type,record_id,action,before_data,after_data)
    values(auth.uid(),'question',target,case when prior.id is null then 'create' else 'update' end,to_jsonb(prior),to_jsonb(saved));
  return (select value from jsonb_array_elements(public.quiz_admin_questions(saved.quiz_id)) value where value->>'id'=target);
end $$;
create function public.quiz_delete_question(target text,expected_version int) returns void language plpgsql security definer set search_path='' as $$
declare prior public.quiz_questions; begin
  if not private.quiz_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into prior from public.quiz_questions where id=target for update;
  if prior.id is null then raise exception 'Missing question' using errcode='P0002'; end if;
  if prior.version<>expected_version then raise exception 'Stale version' using errcode='PT409'; end if;
  delete from public.quiz_questions where id=target;
  insert into public.quiz_audit(actor_id,record_type,record_id,action,before_data) values(auth.uid(),'question',target,'delete',to_jsonb(prior));
end $$;

create function private.quiz_finish_locked(target uuid, expired boolean) returns void language plpgsql security definer set search_path='' as $$
declare total int; correct int; started timestamptz; deadline timestamptz; threshold int; begin
  select a.started_at,a.deadline_at,q.passing_percent into started,deadline,threshold
    from public.quiz_attempts a join public.quiz_definitions q on q.id=a.quiz_id where a.id=target and a.status='in_progress';
  if not found then return; end if;
  select count(*),count(*) filter(where selected_option_id=correct_option_id) into total,correct
    from public.quiz_attempt_items where attempt_id=target;
  update public.quiz_attempts set completed_at=now(),status=case when expired then 'expired' else 'submitted' end,
    correct_count=correct,total_count=total,score_percent=case when total=0 then 0 else round(correct*100.0/total)::int end,
    passed=case when total=0 then false else round(correct*100.0/total)::int>=threshold end,
    integrity=jsonb_build_object('serverScored',true,'deadline',deadline,'started',started)
    where id=target and status='in_progress';
end $$;

create function private.quiz_attempt_view(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.quiz_attempts; begin
  select * into a from public.quiz_attempts where id=target and user_id=auth.uid();
  if a.id is null then raise exception 'Attempt unavailable' using errcode='P0002'; end if;
  return jsonb_build_object('id',a.id,'quizId',a.quiz_id,'attemptNumber',a.attempt_number,'startedAt',a.started_at,
    'deadlineAt',a.deadline_at,'serverNow',now(),'completedAt',a.completed_at,'status',a.status,
    'correct',a.correct_count,'total',a.total_count,'scorePercent',a.score_percent,'passed',a.passed,
    'questions',coalesce((select jsonb_agg(jsonb_build_object('id',i.question_id,'prompt',i.prompt,'topic',i.topic,
      'difficulty',i.difficulty,'options',i.options,'position',i.position,'selectedOptionId',i.selected_option_id,
      'correctOptionId',case when i.answered_at is not null or a.status<>'in_progress' then i.correct_option_id end,
      'explanation',case when i.answered_at is not null or a.status<>'in_progress' then i.explanation end)
      order by i.position) from public.quiz_attempt_items i where i.attempt_id=target),'[]'::jsonb),
    'byTopic',case when a.status='in_progress' then null else
      coalesce((select jsonb_agg(jsonb_build_object('topic',topic,'correct',correct,'total',total) order by topic)
      from (select topic,count(*) filter(where selected_option_id=correct_option_id) correct,count(*) total
        from public.quiz_attempt_items where attempt_id=target group by topic) s),'[]'::jsonb) end);
end $$;
create function public.quiz_start(target text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); q public.quiz_definitions; active uuid; n int; last_at timestamptz; a uuid; picked int; begin
  if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text || ':' || target,0));
  if not private.quiz_visible(target) then raise exception 'Quiz unavailable' using errcode='P0002'; end if;
  select * into q from public.quiz_definitions where id=target;
  select id into active from public.quiz_attempts where user_id=u and quiz_id=target and status='in_progress' for update;
  if active is not null then
    if exists(select 1 from public.quiz_attempts where id=active and deadline_at<=now()) then
      perform private.quiz_finish_locked(active,true);
    else return private.quiz_attempt_view(active); end if;
  end if;
  select count(*),max(completed_at) into n,last_at from public.quiz_attempts where user_id=u and quiz_id=target;
  if q.max_attempts is not null and n>=q.max_attempts then raise exception 'Attempt limit reached' using errcode='PT409'; end if;
  if last_at is not null and last_at+make_interval(secs=>q.cooldown_seconds)>now() then raise exception 'Retake cooldown active' using errcode='PT409'; end if;
  select count(*) into picked from public.quiz_questions x where x.quiz_id=target and x.status='Published'
    and (select count(*) from public.quiz_options o where o.question_id=x.id) between 2 and 10
    and (select count(*) from public.quiz_options o where o.question_id=x.id and o.is_correct)=1;
  if picked<q.question_count then raise exception 'Quiz has too few questions' using errcode='23514'; end if;
  insert into public.quiz_attempts(user_id,quiz_id,attempt_number,deadline_at) values(u,target,n+1,now()+make_interval(secs=>q.duration_seconds)) returning id into a;
  insert into public.quiz_attempt_items(attempt_id,position,question_id,prompt,topic,difficulty,explanation,options,correct_option_id)
  select a,row_number() over(),x.id,x.prompt,x.topic,x.difficulty,x.explanation,
    (select jsonb_agg(jsonb_build_object('id',o.id,'text',o.answer_text) order by o.position) from public.quiz_options o where o.question_id=x.id),
    (select o.id from public.quiz_options o where o.question_id=x.id and o.is_correct)
    from (select * from public.quiz_questions p where p.quiz_id=target and p.status='Published'
      and (select count(*) from public.quiz_options o where o.question_id=p.id) between 2 and 10
      and (select count(*) from public.quiz_options o where o.question_id=p.id and o.is_correct)=1
      order by random() limit q.question_count) x;
  return private.quiz_attempt_view(a);
end $$;
create function public.quiz_attempt(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts; begin
  select * into a from public.quiz_attempts where id=target and user_id=auth.uid() for update;
  if a.id is null then raise exception 'Attempt unavailable' using errcode='P0002'; end if;
  if a.status='in_progress' and a.deadline_at<=now() then perform private.quiz_finish_locked(target,true); end if;
  return private.quiz_attempt_view(target);
end $$;
create function public.quiz_answer(target uuid,question text,option_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts; item public.quiz_attempt_items; begin
  select * into a from public.quiz_attempts where id=target and user_id=auth.uid() for update;
  if a.id is null then raise exception 'Attempt unavailable' using errcode='P0002'; end if;
  if a.status='in_progress' and a.deadline_at<=now() then perform private.quiz_finish_locked(target,true); return private.quiz_attempt_view(target); end if;
  if a.status<>'in_progress' then return private.quiz_attempt_view(target); end if;
  select * into item from public.quiz_attempt_items where attempt_id=target and question_id=question for update;
  if item.question_id is null or not exists(select 1 from jsonb_array_elements(item.options) o where o->>'id'=option_id::text) then raise exception 'Invalid answer' using errcode='23514'; end if;
  if item.selected_option_id is not null then
    if item.selected_option_id<>option_id then raise exception 'Answer already submitted' using errcode='PT409'; end if;
    return private.quiz_attempt_view(target);
  end if;
  update public.quiz_attempt_items set selected_option_id=option_id,answered_at=now() where attempt_id=target and question_id=question;
  return private.quiz_attempt_view(target);
end $$;
create function public.quiz_submit(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.quiz_attempts; begin
  select * into a from public.quiz_attempts where id=target and user_id=auth.uid() for update;
  if a.id is null then raise exception 'Attempt unavailable' using errcode='P0002'; end if;
  if a.status='in_progress' then perform private.quiz_finish_locked(target,a.deadline_at<=now()); end if;
  return private.quiz_attempt_view(target);
end $$;
create function public.quiz_history(target text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'quizId',a.quiz_id,'attemptNumber',a.attempt_number,
    'status',a.status,'startedAt',a.started_at,'deadlineAt',a.deadline_at,'completedAt',a.completed_at,
    'scorePercent',a.score_percent,'correct',a.correct_count,'total',a.total_count,'passed',a.passed) order by a.started_at desc)
    from public.quiz_attempts a where a.user_id=auth.uid() and (target is null or a.quiz_id=target)),'[]'::jsonb);
end $$;
create function public.quiz_eligibility(target text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.quiz_definitions; total int; completed int; best int; begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into q from public.quiz_definitions where id=target and private.quiz_visible(id);
  if q.id is null then raise exception 'Quiz unavailable' using errcode='P0002'; end if;
  select count(*),count(*) filter(where exists(select 1 from public.learning_completions c where c.user_id=auth.uid() and c.lesson_id=l.id))
    into total,completed from public.learning_lessons l where l.module_id=q.module_id and private.learning_lesson_visible(l.id);
  select coalesce(max(score_percent),0) into best from public.quiz_attempts where user_id=auth.uid() and quiz_id=target and status<>'in_progress';
  return jsonb_build_object('quizId',target,'moduleId',q.module_id,'bestScore',best,
    'completionPercent',case when total=0 then 0 else round(completed*100.0/total)::int end,
    'eligible',total>0 and completed=total and best>=q.eligibility_percent,
    'threshold',q.eligibility_percent);
end $$;
create function public.quiz_admin_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.quiz_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return jsonb_build_object(
    'attempts',(select count(*) from public.quiz_attempts where status<>'in_progress'),
    'averageScore',(select coalesce(round(avg(score_percent)),0) from public.quiz_attempts where status<>'in_progress'),
    'publishedQuizzes',(select count(*) from public.quiz_definitions where status='Published'),
    'publishedQuestions',(select count(*) from public.quiz_questions where status='Published'),
    'trend',coalesce((select jsonb_agg(jsonb_build_object('period',period,'average',average,'attempts',attempts) order by bucket)
      from (select date_trunc('month',completed_at) bucket,to_char(completed_at,'Mon YYYY') period,
        round(avg(score_percent))::int average,count(*) attempts
        from public.quiz_attempts where status<>'in_progress' group by date_trunc('month',completed_at),to_char(completed_at,'Mon YYYY')) s),'[]'::jsonb)
  );
end $$;
revoke all on function private.quiz_catalogue_row(public.quiz_definitions),private.quiz_finish_locked(uuid,boolean),private.quiz_attempt_view(uuid) from public,anon,authenticated;
revoke all on function public.quiz_catalogue(boolean),public.quiz_admin_questions(text),public.quiz_save_definition(jsonb),
  public.quiz_delete_definition(text,int),public.quiz_save_question(jsonb),public.quiz_delete_question(text,int),
  public.quiz_start(text),public.quiz_attempt(uuid),public.quiz_answer(uuid,text,uuid),public.quiz_submit(uuid),public.quiz_history(text),public.quiz_eligibility(text),public.quiz_admin_summary()
  from public,anon,authenticated;
grant execute on function public.quiz_catalogue(boolean) to anon,authenticated;
grant execute on function public.quiz_admin_summary() to authenticated;
grant execute on function public.quiz_admin_questions(text),public.quiz_save_definition(jsonb),public.quiz_delete_definition(text,int),
  public.quiz_save_question(jsonb),public.quiz_delete_question(text,int),public.quiz_start(text),public.quiz_attempt(uuid),
  public.quiz_answer(uuid,text,uuid),public.quiz_submit(uuid),public.quiz_history(text),public.quiz_eligibility(text) to authenticated;
commit;

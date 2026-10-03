begin;

create table public.certificate_templates (
  id boolean primary key default true check(id),
  content jsonb not null check(jsonb_typeof(content)='object'),
  logo_id uuid references public.learning_media_assets(id) on delete restrict,
  version integer not null default 1 check(version>0),
  updated_at timestamptz not null default now()
);
insert into public.certificate_templates(content) values ('{"title":"Certificate of Completion","subtitle":"National Cybersecurity Awareness Platform · Foundation Release","issuer":"NCAP Sri Lanka","body":"This recognises the successful completion of the learning module and its assessment.","signatoryName":"Programme Director","signatoryTitle":"National Cybersecurity Awareness Platform","theme":"navy"}');

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  reference uuid not null unique default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  module_id text not null references public.learning_modules(id) on delete restrict,
  attempt_id uuid not null references public.quiz_attempts(id) on delete restrict,
  evidence jsonb not null check(jsonb_typeof(evidence)='object'),
  template jsonb not null check(jsonb_typeof(template)='object'),
  logo_id uuid references public.learning_media_assets(id) on delete restrict,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  status text not null default 'Issued' check(status in ('Issued','Revoked')),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revocation_reason text,
  check((status='Issued' and revoked_at is null and revoked_by is null and revocation_reason is null) or
    (status='Revoked' and revoked_at is not null and length(btrim(revocation_reason)) between 1 and 1000))
);
create unique index certificates_one_issued on public.certificates(user_id,module_id) where status='Issued';
create index certificates_registry on public.certificates(user_id,module_id,issued_at desc,id);
create index certificates_module on public.certificates(module_id);
create index certificates_attempt on public.certificates(attempt_id);
create index certificates_logo on public.certificates(logo_id) where logo_id is not null;
create table public.certificate_audit (
  id bigint generated always as identity primary key,
  certificate_id uuid references public.certificates(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check(action in ('issued','revoked','template_updated')),
  details jsonb not null,
  created_at timestamptz not null default now()
);
create index certificate_audit_history on public.certificate_audit(certificate_id,created_at,id);

create function private.certificate_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='super_admin' and status='active');
$$;
create function private.certificate_account() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='active');
$$;
revoke all on function private.certificate_admin(),private.certificate_account() from public,anon;
grant execute on function private.certificate_admin(),private.certificate_account() to authenticated;

alter table public.certificates enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.certificate_audit enable row level security;
revoke all on public.certificates,public.certificate_templates,public.certificate_audit from anon,authenticated;
grant select on public.certificates,public.certificate_templates,public.certificate_audit to authenticated;
create policy certificate_read on public.certificates for select to authenticated using
  (private.certificate_account() and (user_id=auth.uid() or private.certificate_admin()));
create policy certificate_template_read on public.certificate_templates for select to authenticated using(private.certificate_admin());
create policy certificate_audit_read on public.certificate_audit for select to authenticated using(private.certificate_admin());
create policy certificate_logo_asset_read on public.learning_media_assets for select to authenticated using
  (private.certificate_account() and exists(select 1 from public.certificates c where c.logo_id=learning_media_assets.id and c.user_id=auth.uid()));
create policy certificate_logo_storage_read on storage.objects for select to authenticated using
  (bucket_id='learning-media' and private.certificate_account() and exists(select 1 from public.learning_media_assets a
    join public.certificates c on c.logo_id=a.id where a.path=name and c.user_id=auth.uid()));

create function private.certificate_eligibility(learner uuid, module_target text) returns jsonb
language sql stable security definer set search_path='' as $$
  with lessons as (
    select l.id,l.version,c.completed_at from public.learning_lessons l
    left join public.learning_completions c on c.lesson_id=l.id and c.user_id=learner
    where l.module_id=module_target and private.learning_lesson_visible(l.id)
  ), result as (
    select a.id,a.score_percent,a.completed_at,q.id quiz_id from public.quiz_attempts a
    join public.quiz_definitions q on q.id=a.quiz_id where a.user_id=learner and q.module_id=module_target
      and a.status='submitted' order by a.score_percent desc,a.completed_at desc,a.id limit 1
  ) select jsonb_build_object(
    'eligible',private.learning_module_visible(module_target) and
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

create function public.certificate_registry(page_offset integer default 0, page_limit integer default 20,
  module_filter text default null, search_text text default '') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.certificate_account() then raise exception 'Forbidden' using errcode='42501'; end if;
  if page_offset is null or page_limit is null or search_text is null or page_offset<0 or page_offset>100000 or page_limit<1 or page_limit>100 or length(search_text)>100 then
    raise exception 'Invalid filters' using errcode='22023'; end if;
  with candidates as (
    select p.id user_id,p.display_name,m.id module_id,m.title from public.profiles p cross join public.learning_modules m
    where p.role='learner' and (private.certificate_admin() or p.id=auth.uid())
      and (module_filter is null or m.id=module_filter)
      and (search_text='' or p.display_name ilike '%'||search_text||'%' or m.title ilike '%'||search_text||'%')
      and (private.learning_module_visible(m.id) or exists(select 1 from public.certificates c where c.user_id=p.id and c.module_id=m.id))
  ), page as (select * from candidates order by display_name,user_id,module_id limit page_limit offset page_offset)
  select jsonb_build_object(
    'total',(select count(*) from candidates),
    'issuedCount',(select count(*) from public.certificates c where c.status='Issued' and (private.certificate_admin() or c.user_id=auth.uid())),
    'items',coalesce((
    select jsonb_agg(jsonb_build_object('userId',p.user_id,'learnerName',p.display_name,'moduleId',p.module_id,'moduleTitle',p.title,
      'eligibility',private.certificate_eligibility(p.user_id,p.module_id),
      'record',(select to_jsonb(c) from public.certificates c where c.user_id=p.user_id and c.module_id=p.module_id
        order by (c.status='Issued') desc,c.issued_at desc,c.id desc limit 1)) order by p.display_name,p.user_id,p.module_id) from page p),'[]'::jsonb)) into result;
  return result;
end $$;

create function public.certificate_issue(learner uuid,module_target text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; settings public.certificate_templates; record public.certificates;
begin
  if not private.certificate_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if learner is null or module_target is null then raise exception 'Invalid target' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(learner::text||':'||module_target,0));
  select * into record from public.certificates where user_id=learner and module_id=module_target and status='Issued';
  if found then return to_jsonb(record); end if;
  -- Prevent simultaneous catalogue/progress edits while capturing issuance evidence.
  perform 1 from public.profiles where id=learner for share;
  perform 1 from public.learning_modules where id=module_target for share;
  perform 1 from public.learning_topics where id in (select topic_id from public.learning_modules where id=module_target
    union select topic_id from public.learning_lessons where module_id=module_target) for share;
  perform 1 from public.learning_lessons where module_id=module_target for share;
  perform 1 from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
    where c.user_id=learner and l.module_id=module_target for share of c;
  snapshot:=private.certificate_eligibility(learner,module_target);
  if not (snapshot->>'eligible')::boolean then raise exception 'Not eligible' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(726021);
  select * into settings from public.certificate_templates where id for share;
  insert into public.certificates(user_id,module_id,attempt_id,evidence,template,logo_id,issued_by)
    values(learner,module_target,(snapshot->>'attemptId')::uuid,snapshot,settings.content||jsonb_build_object('version',settings.version),settings.logo_id,auth.uid()) returning * into record;
  insert into public.certificate_audit(certificate_id,actor_id,action,details) values(record.id,auth.uid(),'issued',to_jsonb(record));
  return to_jsonb(record);
end $$;

create function public.certificate_revoke(target uuid,reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare record public.certificates;
begin
  if not private.certificate_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if reason is null or length(btrim(reason)) not between 1 and 1000 then raise exception 'Reason required' using errcode='22023'; end if;
  select * into record from public.certificates where id=target for update;
  if not found then raise exception 'Not found' using errcode='P0002'; end if;
  if record.status='Revoked' then return to_jsonb(record); end if;
  update public.certificates set status='Revoked',revoked_at=now(),revoked_by=auth.uid(),revocation_reason=btrim(reason) where id=target returning * into record;
  insert into public.certificate_audit(certificate_id,actor_id,action,details) values(target,auth.uid(),'revoked',jsonb_build_object('reason',record.revocation_reason));
  return to_jsonb(record);
end $$;

create function public.certificate_document(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare record public.certificates;
begin
  if not private.certificate_account() then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into record from public.certificates where id=target and (user_id=auth.uid() or private.certificate_admin());
  if not found then raise exception 'Not found' using errcode='P0002'; end if;
  return to_jsonb(record)||jsonb_build_object('audit',coalesce((select jsonb_agg(jsonb_build_object('action',a.action,'at',a.created_at,'details',
      case when a.action='revoked' then jsonb_build_object('reason',a.details->>'reason') else '{}'::jsonb end) order by a.created_at,a.id)
    from public.certificate_audit a where a.certificate_id=target),'[]'::jsonb));
end $$;

create function public.certificate_verify(certificate_reference uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce((select jsonb_build_object('valid',status='Issued','status',status,'reference',reference,
    'moduleTitle',evidence->>'moduleTitle','issuer',template->>'issuer','issuedAt',issued_at)
    from public.certificates where reference=certificate_reference),jsonb_build_object('valid',false,'status','Unverified'));
$$;

create function public.certificate_template_get() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.certificate_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  return (select content||jsonb_build_object('version',version) from public.certificate_templates where id);
end $$;
create function public.certificate_template_save(payload jsonb,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare settings public.certificate_templates; previous_content jsonb; key text; logo uuid;
begin
  if not private.certificate_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid template' using errcode='22023'; end if;
  foreach key in array array['title','issuer','body'] loop
    if jsonb_typeof(payload->key) is distinct from 'string' or length(btrim(payload->>key)) not between 1 and
      (case when key='body' then 320 else 100 end) then raise exception 'Invalid template' using errcode='22023'; end if;
  end loop;
  foreach key in array array['subtitle','signatoryName','signatoryTitle'] loop
    if jsonb_typeof(payload->key) is distinct from 'string' or length(payload->>key)>160 then raise exception 'Invalid template' using errcode='22023'; end if;
  end loop;
  if payload->>'theme' is null or payload->>'theme' not in ('navy','blue','teal') then raise exception 'Invalid theme' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(726021);
  select * into settings from public.certificate_templates where id for update;
  if expected_version is distinct from settings.version then raise exception 'Stale template' using errcode='PT409'; end if;
  previous_content:=settings.content;
  if payload->'logo' is not null and payload->'logo'<>'null'::jsonb then
    logo:=(payload->'logo'->>'id')::uuid;
    if not exists(select 1 from public.learning_media_assets where id=logo and role='image' and state in ('ready','active') and mime_type in ('image/png','image/jpeg')) then
      raise exception 'Invalid logo' using errcode='22023'; end if;
    -- Resolve trusted metadata; callers cannot substitute external URLs or paths.
    payload:=jsonb_set(payload,'{logo}',(select jsonb_build_object('id',a.id,'storageKey','learning-media/'||a.path,'fileName',a.file_name,
      'mimeType',a.mime_type,'sizeBytes',a.size_bytes,'width',a.width,'height',a.height,'altText',a.alt_text,'status','ready') from public.learning_media_assets a where a.id=logo));
  end if;
  payload:=payload-'version';
  update public.certificate_templates set content=payload,logo_id=logo,version=version+1,updated_at=now() where id returning * into settings;
  insert into public.certificate_audit(actor_id,action,details) values(auth.uid(),'template_updated',
    jsonb_build_object('before',previous_content,'after',settings.content,'version',settings.version));
  return settings.content||jsonb_build_object('version',settings.version);
end $$;

-- Certificate logo snapshots must survive existing Learning media cleanup.
create function private.protect_certificate_logo() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.certificate_templates where logo_id=old.id) or exists(select 1 from public.certificates where logo_id=old.id) then
    if tg_op='DELETE' or new.state in ('retired','pending') then raise exception 'Referenced certificate logo' using errcode='23503'; end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.protect_certificate_logo() from public,anon,authenticated;
create trigger protect_certificate_logo before delete or update of state on public.learning_media_assets
  for each row execute function private.protect_certificate_logo();

create or replace function public.retire_learning_media(target uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.learning_admin() and coalesce(auth.role(),'')<>'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(726021);
  update public.learning_media_assets a set state='retired',updated_at=now()
    where (a.id=target or (target is null and created_at<now()-interval '24 hours')) and state in ('pending','ready')
    and not exists(select 1 from public.learning_modules where image_id=a.id)
    and not exists(select 1 from public.learning_lessons where video_id=a.id)
    and not exists(select 1 from public.certificate_templates where logo_id=a.id)
    and not exists(select 1 from public.certificates where logo_id=a.id);
end $$;

revoke all on function public.certificate_registry(integer,integer,text,text),public.certificate_issue(uuid,text),public.certificate_revoke(uuid,text),
  public.certificate_document(uuid),public.certificate_template_get(),public.certificate_template_save(jsonb,integer),public.certificate_verify(uuid) from public,anon,authenticated;
grant execute on function public.certificate_registry(integer,integer,text,text),public.certificate_issue(uuid,text),public.certificate_revoke(uuid,text),
  public.certificate_document(uuid),public.certificate_template_get(),public.certificate_template_save(jsonb,integer) to authenticated;
grant execute on function public.certificate_verify(uuid) to anon,authenticated;
commit;

begin;
create table public.content_translations (
  id uuid primary key default gen_random_uuid(),
  module_id text references public.learning_modules(id) on delete cascade,
  lesson_id text references public.learning_lessons(id) on delete cascade,
  awareness_id uuid references public.awareness_resources(id) on delete cascade,
  language text not null check(language in ('en','si','ta')),
  source_language text not null check(source_language in ('en','si','ta')),
  source_version integer not null check(source_version>0),
  status text not null default 'Draft' check(status in ('Draft','Published')),
  content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=1000000),
  version integer not null default 1 check(version>0),
  updated_by uuid references public.profiles(id) on delete set null,
  editor_uuid uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(num_nonnulls(module_id,lesson_id,awareness_id)=1),
  check(language<>source_language),
  unique(module_id,language), unique(lesson_id,language), unique(awareness_id,language)
);
alter table public.content_translations enable row level security;
revoke all on public.content_translations from public,anon,authenticated;
-- All clients use bounded RPCs. No direct table privileges or write policy.
create table public.content_translation_audit (
  id uuid primary key default gen_random_uuid(),
  translation_uuid uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_uuid uuid,
  action text not null check(action in ('INSERT','UPDATE','DELETE')),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index translation_audit_resource on public.content_translation_audit(translation_uuid,created_at desc);
alter table public.content_translation_audit enable row level security;
revoke all on public.content_translation_audit from public,anon,authenticated;
grant select on public.content_translation_audit to authenticated;
create policy translation_audit_admin on public.content_translation_audit for select to authenticated
  using((select private.is_super_admin()));
create function private.audit_content_translation() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.content_translation_audit(translation_uuid,actor_id,actor_uuid,action,before_state,after_state)
  values(coalesce(new.id,old.id),auth.uid(),auth.uid(),tg_op,
    case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
revoke all on function private.audit_content_translation() from public,anon,authenticated;
create trigger content_translation_audit after insert or update or delete on public.content_translations
  for each row execute function private.audit_content_translation();

create function public.content_translation_list(target_kind text,target_ids text[],target_language text,admin_mode boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if target_kind not in ('modules','lessons','awareness') or target_language not in ('en','si','ta')
    or target_kind is null or target_language is null or target_ids is null or cardinality(target_ids)>100
    or admin_mode is null then raise exception 'Invalid translation query' using errcode='22023'; end if;
  if admin_mode and not private.is_super_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('source_id',coalesce(t.module_id,t.lesson_id,t.awareness_id::text),
    'stale',t.source_version<>s.version)),'[]'::jsonb) into result
  from public.content_translations t join (
    select id,version,private.learning_module_visible(id) visible from public.learning_modules where target_kind='modules'
    union all select id,version,private.learning_lesson_visible(id) from public.learning_lessons where target_kind='lessons'
    union all select id::text,version,status='Published' from public.awareness_resources where target_kind='awareness'
  ) s on s.id=coalesce(t.module_id,t.lesson_id,t.awareness_id::text)
  where s.id=any(target_ids) and t.language=target_language
    and ((target_kind='modules' and t.module_id is not null) or (target_kind='lessons' and t.lesson_id is not null)
      or (target_kind='awareness' and t.awareness_id is not null))
    and (admin_mode or (s.visible and t.status='Published' and t.source_version=s.version));
  -- Public data contains content and stable source IDs, never editor identity.
  if not admin_mode then
    select coalesce(jsonb_agg(jsonb_build_object('source_id',r->>'source_id','language',r->>'language','content',r->'content')),'[]'::jsonb)
      into result from jsonb_array_elements(result) r;
  end if;
  return result;
end $$;

create function public.content_translation_save(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare k text:=payload->>'kind'; target text:=payload->>'sourceId'; lang text:=payload->>'language';
  src_version integer; src_language text; translated_content jsonb:=payload->'content'; result public.content_translations;
  previous public.content_translations; field text; value jsonb;
begin
  if not private.is_super_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if k is null or k not in ('modules','lessons','awareness') or lang is null or lang not in ('en','si','ta')
    or payload->>'status' is null or payload->>'status' not in ('Draft','Published')
    or jsonb_typeof(translated_content) is distinct from 'object' or octet_length(translated_content::text)>1000000 then
    raise exception 'Invalid translation' using errcode='22023'; end if;
  -- Source lock serializes edits/publication with source revisions.
  if k='modules' then select version,'en' into src_version,src_language from public.learning_modules where id=target for update;
  elsif k='lessons' then select version,'en' into src_version,src_language from public.learning_lessons where id=target for update;
  else select version,language into src_version,src_language from public.awareness_resources where id::text=target for update; end if;
  if src_version is null then raise exception 'Source unavailable' using errcode='P0002'; end if;
  if src_version is distinct from (payload->>'sourceVersion')::integer or lang=src_language then
    raise exception 'Source changed' using errcode='40001'; end if;
  if jsonb_typeof(translated_content->'title') is distinct from 'string' or length(btrim(translated_content->>'title')) not between 1 and 200 then
    raise exception 'Title required' using errcode='22023'; end if;
  for field,value in select * from jsonb_each(translated_content) loop
    if field not in ('title','summary','description','text','alt','body','steps','points','objectives','blocks','transcript') then
      raise exception 'Unsupported translation field' using errcode='22023'; end if;
    if field in ('title','summary','description','text','alt','transcript') and
      (jsonb_typeof(value)<>'string' or length(value#>>'{}')>50000) then
      raise exception 'Invalid text' using errcode='22023'; end if;
    if field in ('body','steps','points','objectives') then
      if jsonb_typeof(value)<>'array' then raise exception 'Invalid list' using errcode='22023'; end if;
      if jsonb_array_length(value)>100 or exists(select 1 from jsonb_array_elements(value) e where jsonb_typeof(e)<>'string' or length(e#>>'{}')>10000) then
        raise exception 'Invalid list' using errcode='22023'; end if;
    end if;
    if field='blocks' then perform private.learning_validate_blocks(value); end if;
  end loop;
  if k='modules' and (not translated_content ? 'description' or not translated_content ? 'objectives') then raise exception 'Incomplete module' using errcode='22023'; end if;
  if k='lessons' and (not translated_content ? 'summary' or not translated_content ? 'objectives' or not translated_content ? 'blocks') then raise exception 'Incomplete lesson' using errcode='22023'; end if;
  select * into previous from public.content_translations where language=lang and
    ((k='modules' and module_id=target) or (k='lessons' and lesson_id=target) or (k='awareness' and awareness_id::text=target)) for update;
  if coalesce(previous.version,0) is distinct from (payload->>'expectedVersion')::integer then
    raise exception 'Translation changed' using errcode='40001'; end if;
  if previous.id is null then
    insert into public.content_translations(module_id,lesson_id,awareness_id,language,source_language,source_version,status,content,updated_by,editor_uuid)
    values(case when k='modules' then target end,case when k='lessons' then target end,
      case when k='awareness' then target::uuid end,lang,src_language,src_version,payload->>'status',translated_content,auth.uid(),auth.uid()) returning * into result;
  else
    update public.content_translations set content=translated_content,status=payload->>'status',source_version=src_version,
      version=version+1,updated_at=now(),updated_by=auth.uid(),editor_uuid=auth.uid() where id=previous.id returning * into result;
  end if;
  return to_jsonb(result);
end $$;
revoke all on function public.content_translation_list(text,text[],text,boolean),public.content_translation_save(jsonb) from public,anon,authenticated;
grant execute on function public.content_translation_list(text,text[],text,boolean) to anon,authenticated;
grant execute on function public.content_translation_save(jsonb) to authenticated;
commit;

-- Learning owns its taxonomy, content, media and learner state. Existing route IDs remain stable.
begin;
create table public.learning_topics (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  name text not null check (length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  status text not null check (status in ('Active','Inactive')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index learning_topic_name on public.learning_topics(lower(name));
create table public.learning_media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'learning-media' check (bucket = 'learning-media'),
  path text not null unique, file_name text not null check (length(file_name) between 1 and 140),
  role text not null check (role in ('image','video')),
  mime_type text not null, size_bytes bigint not null,
  width integer not null check (width between 1 and 8192), height integer not null check (height between 1 and 8192),
  duration_seconds double precision, alt_text text not null default '' check (length(alt_text) <= 240),
  state text not null default 'pending' check (state in ('pending','ready','active','retired')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((role = 'image' and mime_type in ('image/jpeg','image/png','image/webp') and size_bytes between 1 and 5242880 and width <= 4096 and height <= 4096 and length(btrim(alt_text)) > 0 and duration_seconds is null)
    or (role = 'video' and mime_type in ('video/mp4','video/webm') and size_bytes between 1 and 104857600 and duration_seconds > 0 and duration_seconds <= 14400))
);
create index learning_media_cleanup on public.learning_media_assets(state, created_at);
create table public.learning_modules (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  topic_id text not null references public.learning_topics(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null check (length(btrim(description)) between 1 and 1200),
  difficulty text not null check (difficulty in ('Beginner','Intermediate','Advanced')),
  minutes integer not null check (minutes between 1 and 10000),
  display_order integer not null check (display_order between 1 and 9999),
  status text not null check (status in ('Draft','Published')),
  quiz_id text not null default '' check (length(quiz_id) <= 100),
  image_id uuid references public.learning_media_assets(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.learning_lessons (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  module_id text not null references public.learning_modules(id) on delete restrict,
  topic_id text not null references public.learning_topics(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 160),
  summary text not null check (length(btrim(summary)) between 1 and 1200),
  difficulty text not null check (difficulty in ('Beginner','Intermediate','Advanced')),
  minutes integer not null check (minutes between 1 and 10000),
  display_order integer not null check (display_order between 1 and 9999),
  status text not null check (status in ('Draft','Published')),
  video_id uuid references public.learning_media_assets(id) on delete restrict,
  video_url text check (video_url is null or (video_url ~ '^https://' and length(video_url) <= 2048)),
  transcript text not null default '' check (length(transcript) <= 50000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (video_id is null or video_url is null),
  check (status <> 'Published' or (video_id is null and video_url is null) or length(btrim(transcript)) > 0),
  unique (module_id, display_order) deferrable initially deferred
);
create index learning_modules_topic on public.learning_modules(topic_id);
create index learning_modules_image on public.learning_modules(image_id) where image_id is not null;
create index learning_lessons_video on public.learning_lessons(video_id) where video_id is not null;
create index learning_modules_catalogue on public.learning_modules(status, display_order, id);
create index learning_lessons_topic on public.learning_lessons(topic_id);
create index learning_lessons_catalogue on public.learning_lessons(status, module_id, display_order);
create index learning_modules_search on public.learning_modules using gin(to_tsvector('simple',title || ' ' || description));
create index learning_lessons_search on public.learning_lessons using gin(to_tsvector('simple',title || ' ' || summary));
create table public.learning_module_objectives (
  module_id text not null references public.learning_modules(id) on delete cascade,
  position integer not null check (position between 1 and 30), text text not null check (length(btrim(text)) between 1 and 500), primary key(module_id,position)
);
create table public.learning_lesson_objectives (
  lesson_id text not null references public.learning_lessons(id) on delete cascade,
  position integer not null check (position between 1 and 30), text text not null check (length(btrim(text)) between 1 and 500), primary key(lesson_id,position)
);
create table public.learning_lesson_blocks (
  lesson_id text not null references public.learning_lessons(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  content jsonb not null check (jsonb_typeof(content) = 'object' and content->>'kind' in ('paragraph','heading','list','callout','example','check')),
  primary key(lesson_id,position)
);
create table public.learning_completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null references public.learning_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table public.learning_bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null references public.learning_lessons(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table public.learning_video_resume (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null references public.learning_lessons(id) on delete cascade,
  source text not null check (length(source) <= 2048), seconds double precision not null check (seconds >= 0 and seconds <= 14400),
  updated_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table public.learning_activity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text references public.learning_lessons(id) on delete set null,
  kind text not null check (kind in ('lesson','bookmark')), label text not null,
  created_at timestamptz not null default now()
);
create index learning_activity_user on public.learning_activity(user_id,created_at desc);
create index learning_activity_lesson on public.learning_activity(lesson_id);
create index learning_completions_lesson on public.learning_completions(lesson_id);
create index learning_bookmarks_lesson on public.learning_bookmarks(lesson_id);
create index learning_resume_lesson on public.learning_video_resume(lesson_id);
create table public.learning_audit (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
  kind text not null, record_id text not null, action text not null,
  before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create index learning_audit_record on public.learning_audit(kind, record_id,created_at desc);

create function private.learning_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;
create function private.learning_module_visible(target text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.learning_modules m join public.learning_topics t on t.id=m.topic_id where m.id=target and m.status='Published' and t.status='Active');
$$;
create function private.learning_lesson_visible(target text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.learning_lessons l join public.learning_topics t on t.id=l.topic_id where l.id=target and l.status='Published' and t.status='Active' and private.learning_module_visible(l.module_id));
$$;
create function private.learning_media_visible(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.learning_admin() or exists(select 1 from public.learning_modules where image_id=target and private.learning_module_visible(id)) or exists(select 1 from public.learning_lessons where video_id=target and private.learning_lesson_visible(id));
$$;
grant usage on schema private to anon, authenticated;
revoke all on function private.learning_admin(), private.learning_module_visible(text), private.learning_lesson_visible(text), private.learning_media_visible(uuid) from public;
grant execute on function private.learning_admin(), private.learning_module_visible(text), private.learning_lesson_visible(text), private.learning_media_visible(uuid) to anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['learning_topics','learning_modules','learning_lessons','learning_module_objectives','learning_lesson_objectives','learning_lesson_blocks','learning_media_assets','learning_completions','learning_bookmarks','learning_video_resume','learning_activity','learning_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;
grant select on public.learning_topics, public.learning_modules, public.learning_lessons, public.learning_module_objectives, public.learning_lesson_objectives, public.learning_lesson_blocks, public.learning_media_assets to anon;
create policy learning_topics_read on public.learning_topics for select using(status='Active' or private.learning_admin());
create policy learning_modules_read on public.learning_modules for select using(private.learning_module_visible(id) or private.learning_admin());
create policy learning_lessons_read on public.learning_lessons for select using(private.learning_lesson_visible(id) or private.learning_admin());
create policy learning_module_objectives_read on public.learning_module_objectives for select using(private.learning_module_visible(module_id) or private.learning_admin());
create policy learning_lesson_objectives_read on public.learning_lesson_objectives for select using(private.learning_lesson_visible(lesson_id) or private.learning_admin());
create policy learning_blocks_read on public.learning_lesson_blocks for select using(private.learning_lesson_visible(lesson_id) or private.learning_admin());
create policy learning_media_read on public.learning_media_assets for select using(private.learning_admin() or (state='active' and private.learning_media_visible(id)));
create policy learning_completions_own on public.learning_completions for select to authenticated using(user_id=auth.uid());
create policy learning_bookmarks_own on public.learning_bookmarks for select to authenticated using(user_id=auth.uid());
create policy learning_resume_own on public.learning_video_resume for select to authenticated using(user_id=auth.uid());
create policy learning_activity_own on public.learning_activity for select to authenticated using(user_id=auth.uid());
create policy learning_audit_admin on public.learning_audit for select to authenticated using(private.learning_admin());
grant insert, update, delete on public.learning_media_assets to authenticated;
create policy learning_media_admin on public.learning_media_assets for all to authenticated using(private.learning_admin()) with check(private.learning_admin());

create function private.learning_asset(target uuid) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('id',id,'fileName',file_name,'mimeType',mime_type,'sizeBytes',size_bytes,'width',width,'height',height,'durationSeconds',duration_seconds,'altText',alt_text,'storageKey','learning-media/' || path,'status','ready')) from public.learning_media_assets where id=target and state in ('ready','active');
$$;
create function private.learning_record(kind text, target text) returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb; begin
  if kind='topics' then
    select jsonb_build_object('id',id,'name',name,'slug',slug,'status',status,'version',version,'createdAt',created_at,'updatedAt',updated_at) into result from public.learning_topics where id=target;
  elsif kind='modules' then
    select jsonb_strip_nulls(jsonb_build_object('id',m.id,'topicId',m.topic_id,'topic',t.name,'title',m.title,'description',m.description,'difficulty',m.difficulty,'minutes',m.minutes,'order',m.display_order,'status',m.status,'quizId',m.quiz_id,'version',m.version,'image',private.learning_asset(m.image_id),'objectives',coalesce((select jsonb_agg(o.text order by o.position) from public.learning_module_objectives o where o.module_id=m.id),'[]'))) into result from public.learning_modules m join public.learning_topics t on t.id=m.topic_id where m.id=target;
  elsif kind='lessons' then
    select jsonb_strip_nulls(jsonb_build_object('id',l.id,'moduleId',l.module_id,'topicId',l.topic_id,'topic',t.name,'title',l.title,'summary',l.summary,'difficulty',l.difficulty,'minutes',l.minutes,'order',l.display_order,'status',l.status,'updatedAt',l.updated_at,'version',l.version,'objectives',coalesce((select jsonb_agg(o.text order by o.position) from public.learning_lesson_objectives o where o.lesson_id=l.id),'[]'),'blocks',coalesce((select jsonb_agg(b.content order by b.position) from public.learning_lesson_blocks b where b.lesson_id=l.id),'[]'),'video',case when l.video_id is not null then jsonb_build_object('kind','upload','asset',private.learning_asset(l.video_id),'transcript',l.transcript) when l.video_url is not null then jsonb_build_object('kind','external','url',l.video_url,'transcript',l.transcript) end)) into result from public.learning_lessons l join public.learning_topics t on t.id=l.topic_id where l.id=target;
  end if;
  return result;
end $$;
revoke all on function private.learning_asset(uuid),private.learning_record(text,text) from public;
grant execute on function private.learning_asset(uuid),private.learning_record(text,text) to anon,authenticated;

create function public.learning_list(filters jsonb) returns jsonb language plpgsql stable set search_path = '' as $$
declare k text:=filters->>'kind'; result jsonb; begin
  if k not in ('topics','modules','lessons') or coalesce((filters->>'limit')::int,100) not between 1 and 100 or coalesce((filters->>'offset')::int,0)<0 then raise exception 'Invalid query' using errcode='22023'; end if;
  if coalesce((filters->>'admin')::boolean,false) and not private.learning_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  with records as (
    select private.learning_record(k,id) as record from public.learning_topics where k='topics'
    union all select private.learning_record(k,id) from public.learning_modules where k='modules'
    union all select private.learning_record(k,id) from public.learning_lessons where k='lessons'
  ), filtered as (
    select record from records where record is not null
    and (coalesce((filters->>'admin')::boolean,false) or case k when 'topics' then record->>'status'='Active' when 'modules' then private.learning_module_visible(record->>'id') else private.learning_lesson_visible(record->>'id') end)
    and (not filters ? 'id' or record->>'id'=filters->>'id')
    and (not filters ? 'topicId' or record->>'topicId'=filters->>'topicId')
    and (not filters ? 'moduleId' or record->>'moduleId'=filters->>'moduleId')
    and (not filters ? 'status' or record->>'status'=filters->>'status')
    and (not filters ? 'difficulty' or record->>'difficulty'=filters->>'difficulty')
    and (coalesce(filters->>'search','')='' or strpos(lower(concat_ws(' ',record->>'title',record->>'name',record->>'topic',record->>'description',record->>'summary',record->>'blocks')),lower(filters->>'search'))>0)
  ), page as (select record from filtered order by coalesce((record->>'order')::int,0),record->>'id' limit coalesce((filters->>'limit')::int,100) offset coalesce((filters->>'offset')::int,0))
  select jsonb_build_object('items',coalesce((select jsonb_agg(record) from page),'[]'),'total',(select count(*) from filtered)) into result;
  return result;
end $$;

-- Validate blocks even for direct RPC callers; the server additionally uses the shared Zod schema.
create function private.learning_validate_blocks(blocks jsonb) returns void language plpgsql set search_path = '' as $$
declare b jsonb; item jsonb; k text; begin
  if jsonb_typeof(blocks) is distinct from 'array' or jsonb_array_length(blocks) not between 1 and 100 then raise exception 'Invalid blocks' using errcode='23514'; end if;
  for b in select value from jsonb_array_elements(blocks) loop
    k:=b->>'kind';
    if k is null or k not in ('paragraph','heading','list','callout','example','check') then raise exception 'Invalid block' using errcode='23514'; end if;
    if k in ('paragraph','heading','callout','example') and (jsonb_typeof(b->'text') is distinct from 'string' or length(btrim(b->>'text')) not between 1 and case k when 'paragraph' then 4000 when 'heading' then 160 else 1500 end) then raise exception 'Invalid text' using errcode='23514'; end if;
    if k in ('callout','example') and (jsonb_typeof(b->'title') is distinct from 'string' or length(btrim(b->>'title')) not between 1 and 120) then raise exception 'Invalid title' using errcode='23514'; end if;
    if k='callout' and coalesce(b->>'tone','') not in ('tip','warning','note') then raise exception 'Invalid tone' using errcode='23514'; end if;
    if k='list' then
      if jsonb_typeof(b->'items') is distinct from 'array' or jsonb_array_length(b->'items') not between 1 and 20 then raise exception 'Invalid list' using errcode='23514'; end if;
      for item in select value from jsonb_array_elements(b->'items') loop
        if jsonb_typeof(item)<>'string' or length(btrim(item#>>'{}')) not between 1 and 300 then raise exception 'Invalid list text' using errcode='23514'; end if;
      end loop;
    end if;
    if k='check' then
      if jsonb_typeof(b->'question') is distinct from 'string' or length(btrim(b->>'question')) not between 1 and 300 or jsonb_typeof(b->'explanation') is distinct from 'string' or length(btrim(b->>'explanation')) not between 1 and 1200 or jsonb_typeof(b->'options') is distinct from 'array' or jsonb_array_length(b->'options') not between 2 and 6 or coalesce(b->>'correctIndex','') !~ '^[0-9]+$' or (b->>'correctIndex')::int >= jsonb_array_length(b->'options') then raise exception 'Invalid knowledge check' using errcode='23514'; end if;
      for item in select value from jsonb_array_elements(b->'options') loop
        if jsonb_typeof(item)<>'string' or length(btrim(item#>>'{}')) not between 1 and 240 then raise exception 'Invalid answer' using errcode='23514'; end if;
      end loop;
    end if;
    if octet_length(b::text)>25000 then raise exception 'Block too large' using errcode='23514'; end if;
  end loop;
end $$;

create function public.save_learning_record(kind text, payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare target text:=payload->>'id'; old_record jsonb; result jsonb; old_version int; asset uuid; old_asset uuid; topic text:=payload->>'topicId'; begin
  if not private.learning_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if kind not in ('topics','modules','lessons') or target is null then raise exception 'Invalid kind' using errcode='22023'; end if;
  -- Consistent transaction locking covers inserts, order changes, media attachment and cleanup.
  perform pg_advisory_xact_lock(726021);
  old_record:=private.learning_record(kind,target); old_version:=(old_record->>'version')::int;
  if (old_record is not null and (payload->>'version')::int is distinct from old_version) or (old_record is null and payload ? 'version') then raise exception 'Stale version' using errcode='PT409'; end if;
  if kind='topics' then
    insert into public.learning_topics(id,name,slug,status) values(target,btrim(payload->>'name'),payload->>'slug',payload->>'status')
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,status=excluded.status,version=learning_topics.version+1,updated_at=now();
  else
    if jsonb_typeof(payload->'objectives') is distinct from 'array' or jsonb_array_length(payload->'objectives') not between 1 and 30 then raise exception 'Invalid objectives' using errcode='23514'; end if;
    if not exists(select 1 from public.learning_topics where id=topic) then raise exception 'Missing topic' using errcode='23503'; end if;
    if payload->>'status'='Published' and not exists(select 1 from public.learning_topics where id=topic and status='Active') then raise exception 'Inactive topic' using errcode='23514'; end if;
    if kind='modules' then
      asset:=(payload#>>'{image,id}')::uuid; old_asset:=(old_record#>>'{image,id}')::uuid;
      if asset is not null and not exists(select 1 from public.learning_media_assets where id=asset and role='image' and state in ('ready','active')) then raise exception 'Invalid image' using errcode='23514'; end if;
      insert into public.learning_modules(id,topic_id,title,description,difficulty,minutes,display_order,status,quiz_id,image_id) values(target,topic,btrim(payload->>'title'),btrim(payload->>'description'),payload->>'difficulty',(payload->>'minutes')::int,coalesce((payload->>'order')::int,1),payload->>'status',coalesce(payload->>'quizId',''),asset)
      on conflict(id) do update set topic_id=excluded.topic_id,title=excluded.title,description=excluded.description,difficulty=excluded.difficulty,minutes=excluded.minutes,display_order=excluded.display_order,status=excluded.status,quiz_id=excluded.quiz_id,image_id=excluded.image_id,version=learning_modules.version+1,updated_at=now();
      delete from public.learning_module_objectives where module_id=target;
      insert into public.learning_module_objectives select target,ordinality,value from jsonb_array_elements_text(payload->'objectives') with ordinality;
    else
      perform private.learning_validate_blocks(payload->'blocks');
      asset:=case when payload#>>'{video,kind}'='upload' then (payload#>>'{video,asset,id}')::uuid end; old_asset:=(old_record#>>'{video,asset,id}')::uuid;
      if asset is not null and not exists(select 1 from public.learning_media_assets where id=asset and role='video' and state in ('ready','active')) then raise exception 'Invalid video' using errcode='23514'; end if;
      if payload ? 'video' and coalesce(payload#>>'{video,kind}','') not in ('external','upload') then raise exception 'Invalid video kind' using errcode='23514'; end if;
      if payload#>>'{video,kind}'='upload' and asset is null then raise exception 'Missing video' using errcode='23514'; end if;
      if payload#>>'{video,kind}'='external' and coalesce(payload#>>'{video,url}','') !~ '^https://[^[:space:]]+$' then raise exception 'Invalid video URL' using errcode='23514'; end if;
      insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status,video_id,video_url,transcript) values(target,payload->>'moduleId',topic,btrim(payload->>'title'),btrim(payload->>'summary'),payload->>'difficulty',(payload->>'minutes')::int,(payload->>'order')::int,payload->>'status',asset,case when payload#>>'{video,kind}'='external' then payload#>>'{video,url}' end,coalesce(payload#>>'{video,transcript}',''))
      on conflict(id) do update set module_id=excluded.module_id,topic_id=excluded.topic_id,title=excluded.title,summary=excluded.summary,difficulty=excluded.difficulty,minutes=excluded.minutes,display_order=excluded.display_order,status=excluded.status,video_id=excluded.video_id,video_url=excluded.video_url,transcript=excluded.transcript,version=learning_lessons.version+1,updated_at=now();
      delete from public.learning_lesson_objectives where lesson_id=target;
      insert into public.learning_lesson_objectives select target,ordinality,value from jsonb_array_elements_text(payload->'objectives') with ordinality;
      delete from public.learning_lesson_blocks where lesson_id=target;
      insert into public.learning_lesson_blocks select target,ordinality,value from jsonb_array_elements(payload->'blocks') with ordinality;
    end if;
    update public.learning_media_assets set state='active',updated_at=now() where id=asset;
    update public.learning_media_assets a set state='retired',updated_at=now() where id=old_asset and id is distinct from asset and not exists(select 1 from public.learning_modules where image_id=a.id) and not exists(select 1 from public.learning_lessons where video_id=a.id);
  end if;
  result:=private.learning_record(kind,target);
  insert into public.learning_audit(actor_id,kind,record_id,action,before_data,after_data) values(auth.uid(),kind,target,case when old_record is null then 'create' else 'update' end,old_record,result);
  return result;
end $$;

create function public.delete_learning_record(kind text,target text,expected_version int) returns void language plpgsql security definer set search_path = '' as $$
declare old_record jsonb; asset uuid; begin
  if not private.learning_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(726021);
  old_record:=private.learning_record(kind,target);
  if old_record is null then raise exception 'Missing record' using errcode='P0002'; end if;
  if (old_record->>'version')::int is distinct from expected_version then raise exception 'Stale version' using errcode='PT409'; end if;
  if kind='topics' then delete from public.learning_topics where id=target;
  elsif kind='modules' then asset:=(old_record#>>'{image,id}')::uuid; delete from public.learning_modules where id=target;
  elsif kind='lessons' then asset:=(old_record#>>'{video,asset,id}')::uuid; delete from public.learning_lessons where id=target;
  else raise exception 'Invalid kind' using errcode='22023'; end if;
  update public.learning_media_assets a set state='retired',updated_at=now() where id=asset and not exists(select 1 from public.learning_modules where image_id=a.id) and not exists(select 1 from public.learning_lessons where video_id=a.id);
  insert into public.learning_audit(actor_id,kind,record_id,action,before_data) values(auth.uid(),kind,target,'delete',old_record);
end $$;
create function public.reorder_learning_records(kind text, records jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare r jsonb; begin
  if not private.learning_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if kind not in ('modules','lessons') or jsonb_typeof(records) is distinct from 'array' or jsonb_array_length(records)>1000 then raise exception 'Invalid order' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(726021);
  for r in select value from jsonb_array_elements(records) loop
    perform public.save_learning_record(kind,private.learning_record(kind,r->>'id') || jsonb_build_object('version',r->'version','order',r->'order'));
  end loop;
end $$;

create function public.learning_statistics() returns jsonb language sql stable set search_path = '' as $$
  with visible as (
    select l.id,l.module_id,l.minutes,exists(select 1 from public.learning_completions c where c.user_id=auth.uid() and c.lesson_id=l.id) done
    from public.learning_lessons l where private.learning_lesson_visible(l.id)
  ), totals as (select count(*) total,count(*) filter(where done) completed,coalesce(sum(minutes) filter(where done),0) minutes from visible)
  select jsonb_build_object('totalLessons',total,'completedCount',completed,'minutes',minutes,'overall',case when total>0 then round(100.0*completed/total) else 0 end,
    'moduleProgress',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'total',(select count(*) from visible where module_id=m.id),'completed',(select count(*) from visible where module_id=m.id and done))) from public.learning_modules m where private.learning_module_visible(m.id)),'[]')) from totals;
$$;
create function public.learning_state() returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'statistics',public.learning_statistics(),
    'completedLessons',coalesce((select jsonb_agg(lesson_id order by completed_at) from public.learning_completions where user_id=auth.uid()),'[]'),
    'bookmarks',coalesce((select jsonb_agg(lesson_id order by created_at) from public.learning_bookmarks where user_id=auth.uid()),'[]'),
    'resume',coalesce((select jsonb_object_agg(lesson_id,jsonb_build_object('source',source,'seconds',seconds)) from public.learning_video_resume where user_id=auth.uid()),'{}'),
    'activities',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'label',label,'at',created_at) order by created_at desc) from (select * from public.learning_activity where user_id=auth.uid() order by created_at desc limit 100) a),'[]'));
$$;
create function public.mutate_learning_state(payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); target text:=payload->>'lessonId'; action text:=payload->>'action'; lesson_title text; changed int; begin
  if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.learning_lesson_visible(target) then raise exception 'Lesson unavailable' using errcode='P0002'; end if;
  select title into lesson_title from public.learning_lessons where id=target;
  if action='complete' then
    insert into public.learning_completions(user_id,lesson_id) values(u,target) on conflict do nothing;
    get diagnostics changed = row_count;
    if changed=1 then insert into public.learning_activity(user_id,lesson_id,kind,label) values(u,target,'lesson','Completed “' || lesson_title || '”'); end if;
  elsif action='bookmark' then
    if jsonb_typeof(payload->'saved') is distinct from 'boolean' then raise exception 'Invalid bookmark' using errcode='23514'; end if;
    if (payload->>'saved')::boolean then
      insert into public.learning_bookmarks(user_id,lesson_id) values(u,target) on conflict do nothing;
      get diagnostics changed = row_count;
      if changed=1 then insert into public.learning_activity(user_id,lesson_id,kind,label) values(u,target,'bookmark','Bookmarked “' || lesson_title || '”'); end if;
    else delete from public.learning_bookmarks where user_id=u and lesson_id=target; end if;
  elsif action='resume' then
    insert into public.learning_video_resume(user_id,lesson_id,source,seconds) values(u,target,payload->>'source',(payload->>'seconds')::double precision)
    on conflict(user_id,lesson_id) do update set source=excluded.source,seconds=excluded.seconds,updated_at=now();
  else raise exception 'Invalid action' using errcode='22023'; end if;
  return public.learning_state();
end $$;

-- Durable cleanup queue. The same lock as attachment prevents retirement during a save.
create function public.retire_learning_media(target uuid default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.learning_admin() and coalesce(auth.role(),'') <> 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(726021);
  update public.learning_media_assets a set state='retired',updated_at=now()
  where (a.id=target or (target is null and created_at<now()-interval '24 hours')) and state in ('pending','ready')
  and not exists(select 1 from public.learning_modules where image_id=a.id) and not exists(select 1 from public.learning_lessons where video_id=a.id);
end $$;
revoke all on function private.learning_validate_blocks(jsonb) from public,anon,authenticated;
revoke all on function public.learning_list(jsonb),public.save_learning_record(text,jsonb),public.delete_learning_record(text,text,int),public.reorder_learning_records(text,jsonb),public.learning_state(),public.mutate_learning_state(jsonb),public.retire_learning_media(uuid) from public,anon,authenticated;
grant execute on function public.learning_list(jsonb) to anon,authenticated;
grant execute on function public.save_learning_record(text,jsonb),public.delete_learning_record(text,text,int),public.reorder_learning_records(text,jsonb),public.learning_state(),public.mutate_learning_state(jsonb),public.retire_learning_media(uuid) to authenticated;
grant execute on function public.retire_learning_media(uuid) to service_role;
revoke all on function public.learning_statistics() from public,anon;
grant execute on function public.learning_statistics() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('learning-media','learning-media',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
create policy learning_storage_read on storage.objects for select to anon,authenticated using(bucket_id='learning-media' and exists(select 1 from public.learning_media_assets a where a.path=name and (private.learning_admin() or (a.state='active' and private.learning_media_visible(a.id)))));
create policy learning_storage_upload on storage.objects for insert to authenticated with check(bucket_id='learning-media' and private.learning_admin() and exists(select 1 from public.learning_media_assets a where a.path=name and a.state='pending' and a.uploaded_by=auth.uid()));
-- No overwrite policy: a validated object is immutable.
create policy learning_storage_delete on storage.objects for delete to authenticated using(bucket_id='learning-media' and private.learning_admin() and exists(select 1 from public.learning_media_assets a where a.path=name and a.state='retired'));
commit;

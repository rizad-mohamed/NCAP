-- Awareness only. All runtime operations use the caller's session and RLS.
create extension if not exists pg_trgm with schema extensions;
create function public.awareness_search_document(title text, summary text, topic text, author text, tags text[], content jsonb)
returns text language sql immutable parallel safe set search_path = '' as $$
  select title || ' ' || summary || ' ' || topic || ' ' || author || ' ' || pg_catalog.array_to_string(tags, ' ') || ' ' || content::text;
$$;
create table public.awareness_resources (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  kind text not null check (kind in ('articles','cyberTips','newsUpdates','bestPractices','posters','infographics','videos')),
  slug text not null check (length(slug) <= 180 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  summary text not null check (length(summary) <= 4000),
  search_text text generated always as (title || ' ' || summary) stored,
  topic text not null check (length(btrim(topic)) between 1 and 100),
  language text not null default 'en' check (language in ('en','si','ta')),
  status text not null default 'Draft' check (status in ('Draft','Published')),
  display_order integer not null default 0 check (display_order between 0 and 1000000),
  featured boolean not null default false,
  published_at date,
  author text not null default '' check (length(author) <= 160),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  reading_minutes integer check (reading_minutes between 1 and 240),
  content jsonb not null default '{}' check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 1000000),
  search_document text generated always as (public.awareness_search_document(title,summary,topic,author,tags,content)) stored,
  image_id uuid, video_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique(kind, slug),
  check (status <> 'Published' or kind not in ('posters','infographics') or image_id is not null),
  check (kind <> 'articles' or (reading_minutes is not null and coalesce(jsonb_typeof(content->'body') = 'array', false))),
  check (kind <> 'bestPractices' or coalesce(jsonb_typeof(content->'steps') = 'array', false)),
  check (kind <> 'infographics' or coalesce(jsonb_typeof(content->'points') = 'array', false)),
  check (kind <> 'videos' or (coalesce(jsonb_typeof(content->'chapters') = 'array', false) and coalesce(jsonb_typeof(content->'transcript') = 'array', false))),
  check (status <> 'Published' or case kind
    when 'articles' then jsonb_array_length(content->'body') > 0
    when 'bestPractices' then jsonb_array_length(content->'steps') > 0
    when 'videos' then jsonb_array_length(content->'transcript') > 0
    when 'infographics' then jsonb_array_length(content->'points') > 0 else true end)
);
create table public.awareness_media_assets (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references public.awareness_resources(id) on delete set null,
  role text not null check (role in ('image','video')),
  bucket text not null default 'awareness-media' check (bucket = 'awareness-media'),
  path text not null unique check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$'),
  file_name text not null check (length(file_name) between 1 and 140 and file_name !~ '[/\\]'),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')),
  size_bytes bigint not null check (size_bytes between 1 and 104857600),
  width integer not null check (width between 1 and 16384), height integer not null check (height between 1 and 16384),
  duration_seconds double precision check (duration_seconds > 0 and duration_seconds <= 14400),
  alt_text text not null default '' check (length(alt_text) <= 240),
  state text not null default 'pending' check (state in ('pending','ready','active','retired')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((role = 'image' and mime_type like 'image/%' and size_bytes <= 5242880 and width <= 4096 and height <= 4096 and length(btrim(alt_text)) > 0)
    or (role = 'video' and mime_type like 'video/%' and duration_seconds is not null)),
  check (state <> 'active' or resource_id is not null)
);
alter table public.awareness_resources add constraint awareness_image_fk foreign key(image_id) references public.awareness_media_assets(id) on delete restrict;
alter table public.awareness_resources add constraint awareness_video_fk foreign key(video_id) references public.awareness_media_assets(id) on delete restrict;
create index awareness_list_idx on public.awareness_resources(kind,status,display_order,id);
create index awareness_topic_idx on public.awareness_resources(kind,status,topic);
create index awareness_newest_idx on public.awareness_resources(kind,status,published_at desc,id);
create index awareness_featured_idx on public.awareness_resources(featured,display_order) where status = 'Published';
create index awareness_search_idx on public.awareness_resources using gin (search_text extensions.gin_trgm_ops);
create index awareness_document_idx on public.awareness_resources using gin (search_document extensions.gin_trgm_ops);
create index awareness_created_by_idx on public.awareness_resources(created_by);
create index awareness_updated_by_idx on public.awareness_resources(updated_by);
create index awareness_image_idx on public.awareness_resources(image_id);
create index awareness_video_idx on public.awareness_resources(video_id);
create index awareness_asset_resource_idx on public.awareness_media_assets(resource_id);
create index awareness_asset_uploader_idx on public.awareness_media_assets(uploaded_by);
create index awareness_cleanup_idx on public.awareness_media_assets(state,created_at);

alter table public.awareness_resources enable row level security;
alter table public.awareness_media_assets enable row level security;
revoke all on public.awareness_resources, public.awareness_media_assets from anon, authenticated;
grant select on public.awareness_resources, public.awareness_media_assets to anon, authenticated;
grant insert, update, delete on public.awareness_resources, public.awareness_media_assets to authenticated;
create policy awareness_public_read on public.awareness_resources for select to anon,authenticated using (status = 'Published');
create policy awareness_admin on public.awareness_resources for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy awareness_media_public_read on public.awareness_media_assets for select to anon,authenticated using (
  state = 'active' and exists(select 1 from public.awareness_resources r where r.id = resource_id and r.status = 'Published' and (r.image_id = awareness_media_assets.id or r.video_id = awareness_media_assets.id))
);
create policy awareness_media_admin on public.awareness_media_assets for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- Invoker functions retain RLS, authenticate independently and serialize edits and attachments.
create function public.save_awareness_resource(payload jsonb, expected_version integer default null)
returns public.awareness_resources language plpgsql security invoker set search_path = '' as $$
declare next_row public.awareness_resources; old_row public.awareness_resources; asset public.awareness_media_assets; asset_id uuid;
begin
  if not private.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  next_row := jsonb_populate_record(null::public.awareness_resources, payload);
  select * into old_row from public.awareness_resources where id = next_row.id for update;
  if found then
    if expected_version is null or old_row.version <> expected_version then raise exception 'stale edit' using errcode = '40001'; end if;
    if old_row.kind <> next_row.kind then raise exception 'invalid kind' using errcode = '23514'; end if;
  elsif expected_version is not null then raise exception 'missing record' using errcode = 'P0002'; end if;
  foreach asset_id in array array[next_row.image_id,next_row.video_id] loop
    if asset_id is not null then
      select * into asset from public.awareness_media_assets where id = asset_id for update;
      if not found or asset.state not in ('ready','active') or (asset.resource_id is not null and asset.resource_id <> next_row.id)
        or (asset_id = next_row.image_id and asset.role <> 'image') or (asset_id = next_row.video_id and asset.role <> 'video') then
        raise exception 'invalid asset' using errcode = '23514';
      end if;
    end if;
  end loop;
  insert into public.awareness_resources(id,kind,slug,title,summary,topic,language,status,display_order,featured,published_at,author,tags,reading_minutes,content,image_id,video_id,created_by,updated_by)
  values(next_row.id,next_row.kind,next_row.slug,next_row.title,next_row.summary,next_row.topic,next_row.language,next_row.status,next_row.display_order,next_row.featured,next_row.published_at,next_row.author,next_row.tags,next_row.reading_minutes,next_row.content,next_row.image_id,next_row.video_id,auth.uid(),auth.uid())
  on conflict(id) do update set slug=excluded.slug,title=excluded.title,summary=excluded.summary,topic=excluded.topic,language=excluded.language,status=excluded.status,display_order=excluded.display_order,featured=excluded.featured,published_at=excluded.published_at,author=excluded.author,tags=excluded.tags,reading_minutes=excluded.reading_minutes,content=excluded.content,image_id=excluded.image_id,video_id=excluded.video_id,updated_by=auth.uid(),updated_at=now(),version=old_row.version+1
  where public.awareness_resources.version = expected_version
  returning * into next_row;
  if not found then raise exception 'stale edit' using errcode = '40001'; end if;
  update public.awareness_media_assets set state='retired',updated_at=now() where resource_id=next_row.id and id is distinct from next_row.image_id and id is distinct from next_row.video_id;
  update public.awareness_media_assets set state='active',resource_id=next_row.id,updated_at=now() where id in(next_row.image_id,next_row.video_id);
  return next_row;
end $$;
revoke all on function public.save_awareness_resource(jsonb,integer) from public,anon;
grant execute on function public.save_awareness_resource(jsonb,integer) to authenticated;

create function public.delete_awareness_resource(resource uuid, expected_version integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_version integer;
begin
  if not private.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select version into current_version from public.awareness_resources where id=resource for update;
  if not found then raise exception 'missing record' using errcode='P0002'; end if;
  if expected_version is null or current_version <> expected_version then raise exception 'stale edit' using errcode='40001'; end if;
  update public.awareness_media_assets set state='retired',updated_at=now() where resource_id=resource;
  delete from public.awareness_resources where id=resource;
end $$;
revoke all on function public.delete_awareness_resource(uuid,integer) from public,anon;
grant execute on function public.delete_awareness_resource(uuid,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('awareness-media','awareness-media',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy awareness_storage_read on storage.objects for select to anon,authenticated using (
  bucket_id='awareness-media' and exists(select 1 from public.awareness_media_assets a where a.path=name and a.state='active')
);
create policy awareness_storage_admin_read on storage.objects for select to authenticated using (bucket_id='awareness-media' and (select private.is_super_admin()));
create policy awareness_storage_upload on storage.objects for insert to authenticated with check (
  bucket_id='awareness-media' and (select private.is_super_admin()) and exists(select 1 from public.awareness_media_assets a where a.path=name and a.state='pending' and a.uploaded_by=(select auth.uid()))
);
-- No UPDATE policy: signed uploads cannot overwrite already validated objects.
create policy awareness_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='awareness-media' and (select private.is_super_admin()) and exists(select 1 from public.awareness_media_assets a where a.path=name and a.state in ('pending','ready','retired'))
);

create function public.awareness_summary() returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(kind, data), '{}'::jsonb) from (
    select kind, jsonb_build_object('count', count(*), 'topics', array_agg(distinct topic order by topic)) data
    from public.awareness_resources where status='Published' group by kind
  ) summaries;
$$;
revoke all on function public.awareness_summary() from public;
grant execute on function public.awareness_summary() to anon, authenticated;

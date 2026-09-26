-- Application version conflicts are HTTP 409, not retryable serialization failures.
-- Preserve the existing caller authorization, locking and media lifecycle transaction.
create or replace function public.save_awareness_resource(payload jsonb, expected_version integer default null)
returns public.awareness_resources language plpgsql security invoker set search_path = '' as $$
declare next_row public.awareness_resources; old_row public.awareness_resources; asset public.awareness_media_assets; asset_id uuid;
begin
  if not private.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  next_row := jsonb_populate_record(null::public.awareness_resources, payload);
  select * into old_row from public.awareness_resources where id = next_row.id for update;
  if found then
    if expected_version is null or old_row.version <> expected_version then raise exception 'stale edit' using errcode = 'PT409'; end if;
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
  if not found then raise exception 'stale edit' using errcode = 'PT409'; end if;
  update public.awareness_media_assets set state='retired',updated_at=now() where resource_id=next_row.id and id is distinct from next_row.image_id and id is distinct from next_row.video_id;
  update public.awareness_media_assets set state='active',resource_id=next_row.id,updated_at=now() where id in(next_row.image_id,next_row.video_id);
  return next_row;
end $$;

create or replace function public.delete_awareness_resource(resource uuid, expected_version integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_version integer;
begin
  if not private.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select version into current_version from public.awareness_resources where id=resource for update;
  if not found then raise exception 'missing record' using errcode='P0002'; end if;
  if expected_version is null or current_version <> expected_version then raise exception 'stale edit' using errcode='PT409'; end if;
  update public.awareness_media_assets set state='retired',updated_at=now() where resource_id=resource;
  delete from public.awareness_resources where id=resource;
end $$;

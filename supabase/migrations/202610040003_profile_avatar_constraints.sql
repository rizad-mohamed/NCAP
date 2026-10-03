begin;
-- Direct Data API writes must satisfy the same safe shape as the profile server action.
create function private.valid_profile_avatar(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare bytes bytea; mime text;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>352000 then return false; end if;
  if not value ?& array['id','fileName','mimeType','sizeBytes','width','height','altText','storageKey','status']
    or value-array['id','fileName','mimeType','sizeBytes','width','height','altText','storageKey','status']<>'{}'::jsonb
    then return false; end if;
  if jsonb_typeof(value->'id') is distinct from 'string' or (value->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(value->'fileName') is distinct from 'string' or char_length(value->>'fileName')>140
    or jsonb_typeof(value->'altText') is distinct from 'string' or char_length(value->>'altText')>200
    or jsonb_typeof(value->'status') is distinct from 'string' or value->>'status'<>'ready' then return false; end if;
  if jsonb_typeof(value->'sizeBytes') is distinct from 'number' or (value->>'sizeBytes') !~ '^[0-9]+$'
    or jsonb_typeof(value->'width') is distinct from 'number' or (value->>'width') !~ '^[0-9]+$'
    or jsonb_typeof(value->'height') is distinct from 'number' or (value->>'height') !~ '^[0-9]+$' then return false; end if;
  if (value->>'sizeBytes')::integer not between 1 and 262144
    or (value->>'width')::integer not between 1 and 1024
    or (value->>'height')::integer not between 1 and 1024 then return false; end if;
  mime:=value->>'mimeType';
  if mime not in ('image/png','image/jpeg','image/webp') or jsonb_typeof(value->'storageKey') is distinct from 'string'
    or char_length(value->>'storageKey')>350000
    or (value->>'storageKey') !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
    or split_part(value->>'storageKey',',',1)<>'data:'||mime||';base64' then return false; end if;
  bytes:=decode(split_part(value->>'storageKey',',',2),'base64');
  if octet_length(bytes)<>(value->>'sizeBytes')::integer then return false; end if;
  return case mime
    when 'image/png' then octet_length(bytes)>=24 and substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex')
    when 'image/jpeg' then octet_length(bytes)>=4 and substring(bytes from 1 for 2)=decode('ffd8','hex')
    when 'image/webp' then octet_length(bytes)>=30 and substring(bytes from 1 for 4)=decode('52494646','hex')
      and substring(bytes from 9 for 4)=decode('57454250','hex')
    else false end;
exception when others then return false;
end $$;
revoke all on function private.valid_profile_avatar(jsonb) from public,anon;
grant execute on function private.valid_profile_avatar(jsonb) to authenticated,service_role;
alter table public.profiles drop constraint profile_avatar_valid;
alter table public.profiles add constraint profile_avatar_valid check(private.valid_profile_avatar(avatar));
commit;

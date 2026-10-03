-- Retain administrator Awareness mutation history without replacing its backend.
begin;
create table public.awareness_audit (
  id bigint generated always as identity primary key,
  resource_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('create','update','delete')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  check ((action='create' and before_data is null and after_data is not null) or
    (action='update' and before_data is not null and after_data is not null) or
    (action='delete' and before_data is not null and after_data is null))
);
create index awareness_audit_history on public.awareness_audit(resource_id,created_at,id);
create index awareness_audit_actor on public.awareness_audit(actor_id) where actor_id is not null;
alter table public.awareness_audit enable row level security;
revoke all on public.awareness_audit from public,anon,authenticated;
grant select on public.awareness_audit to authenticated;
create policy awareness_audit_admin on public.awareness_audit for select to authenticated
  using ((select private.is_super_admin()));

create function private.audit_awareness_resource() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.awareness_audit(resource_id,actor_id,action,before_data,after_data)
    values(case when tg_op='DELETE' then old.id else new.id end,auth.uid(),
      case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
      case when tg_op<>'INSERT' then to_jsonb(old) end,
      case when tg_op<>'DELETE' then to_jsonb(new) end);
  return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.audit_awareness_resource() from public,anon,authenticated;
create trigger awareness_resource_audit after insert or update or delete on public.awareness_resources
  for each row execute function private.audit_awareness_resource();
commit;

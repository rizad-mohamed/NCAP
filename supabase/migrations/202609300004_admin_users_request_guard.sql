-- Enforce account suspension against existing access tokens on every Data API request.
begin;
create function private.check_active_account_request() returns void language plpgsql
security definer set search_path='' as $$
begin
  if auth.role()='authenticated' and auth.uid() is not null and not exists (
    select 1 from public.profiles p where p.id=auth.uid() and p.status='active'
  ) then
    raise exception 'Account unavailable' using errcode='42501';
  end if;
end $$;
revoke all on function private.check_active_account_request() from public,anon,authenticated;
grant execute on function private.check_active_account_request() to authenticated;
alter role authenticator set pgrst.db_pre_request = 'private.check_active_account_request';
notify pgrst, 'reload config';
commit;

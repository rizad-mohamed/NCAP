begin;
-- PostgREST invokes the configured pre-request function as the request role.
-- Anonymous requests must be able to execute the guard; the guard itself only
-- evaluates and rejects authenticated accounts that are no longer active.
grant execute on function private.check_active_account_request() to anon;
notify pgrst, 'reload schema';
commit;

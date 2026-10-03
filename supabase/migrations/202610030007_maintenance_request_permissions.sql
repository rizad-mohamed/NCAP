begin;
-- The Data API invokes its pre-request guard even for operator-only cleanup.
-- Restore only the existing guard's prerequisite permissions for the server
-- maintenance role; leave account checks and client-role privileges unchanged.
grant usage on schema private to service_role;
grant execute on function private.check_active_account_request() to service_role;
notify pgrst, 'reload schema';
commit;

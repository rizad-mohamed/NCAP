begin;
-- Service-role writes also evaluate CHECK constraints; bypassrls does not grant EXECUTE.
grant execute on function private.valid_profile_interests(text[]) to service_role;
create index auth_attempt_limits_expiry on private.auth_attempt_limits(started_at);
commit;

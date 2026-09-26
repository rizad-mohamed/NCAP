-- Run through scripts/setup-awareness-cleanup.mjs after deploying the maintenance function.
-- Secrets are stored in Vault by that operator script, never in this SQL file.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function private.run_awareness_cleanup()
returns bigint language plpgsql security definer set search_path = '' as $$
declare endpoint text; token text; request_id bigint;
begin
  select decrypted_secret into endpoint from vault.decrypted_secrets where name='awareness_cleanup_url';
  select decrypted_secret into token from vault.decrypted_secrets where name='awareness_cleanup_token';
  if endpoint is null or token is null then raise exception 'Awareness cleanup is not configured'; end if;
  select net.http_post(
    url := endpoint,
    headers := jsonb_build_object('Content-Type','application/json','x-awareness-cleanup-token',token),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into request_id;
  return request_id;
end $$;
revoke all on function private.run_awareness_cleanup() from public,anon,authenticated;

select cron.schedule('awareness-media-cleanup','17 * * * *','select private.run_awareness_cleanup()');

-- Make worker access independent of a project's default table privileges.
-- Runtime app clients still use only the user's publishable-key session.
begin;
grant usage on schema public to service_role;
grant select, delete on public.learning_media_assets to service_role;
-- Retirement remains a locked RPC, so maintenance cannot detach an active asset.
grant execute on function public.retire_learning_media(uuid) to service_role;
commit;

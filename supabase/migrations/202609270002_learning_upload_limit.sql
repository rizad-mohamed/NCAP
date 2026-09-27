-- Match Learning's bucket to the configured project's 50 MiB upload ceiling.
-- Other module buckets and project-wide configuration remain unchanged.
begin;
update storage.buckets set file_size_limit = 52428800 where id = 'learning-media';
alter table public.learning_media_assets
  add constraint learning_media_project_size_limit check (size_bytes <= 52428800) not valid;
alter table public.learning_media_assets validate constraint learning_media_project_size_limit;
commit;

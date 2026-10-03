begin;
-- Content writes acquire 726021 before row locks. Use the same order during
-- issuance so a concurrent module edit cannot deadlock with its evidence snapshot.
create or replace function public.certificate_issue(learner uuid,module_target text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; settings public.certificate_templates; record public.certificates;
begin
  if not private.certificate_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if learner is null or module_target is null then raise exception 'Invalid target' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(learner::text||':'||module_target,0));
  select * into record from public.certificates where user_id=learner and module_id=module_target and status='Issued';
  if found then return to_jsonb(record); end if;
  perform pg_advisory_xact_lock(726021);
  perform 1 from public.profiles where id=learner for share;
  perform 1 from public.learning_modules where id=module_target for share;
  perform 1 from public.learning_topics where id in (select topic_id from public.learning_modules where id=module_target
    union select topic_id from public.learning_lessons where module_id=module_target) for share;
  perform 1 from public.learning_lessons where module_id=module_target for share;
  perform 1 from public.learning_completions c join public.learning_lessons l on l.id=c.lesson_id
    where c.user_id=learner and l.module_id=module_target for share of c;
  snapshot:=private.certificate_eligibility(learner,module_target);
  if not (snapshot->>'eligible')::boolean then raise exception 'Not eligible' using errcode='22023'; end if;
  select * into settings from public.certificate_templates where id for share;
  insert into public.certificates(user_id,module_id,attempt_id,evidence,template,logo_id,issued_by)
    values(learner,module_target,(snapshot->>'attemptId')::uuid,snapshot,settings.content||jsonb_build_object('version',settings.version),settings.logo_id,auth.uid()) returning * into record;
  insert into public.certificate_audit(certificate_id,actor_id,action,details) values(record.id,auth.uid(),'issued',to_jsonb(record));
  return to_jsonb(record);
end $$;
commit;

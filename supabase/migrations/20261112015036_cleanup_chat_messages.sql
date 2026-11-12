-- Keep the existing three-hour schedule and include messages older than one hour.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'hugioi-cleanup-expired-data'),
  command := $cleanup$
    delete from game.admin_audit_log
      where created_at < now() - interval '1 hour';
    delete from game.world_chat_messages
      where created_at < floor(extract(epoch from (now() - interval '1 hour')) * 1000)::bigint;
    delete from game.player_receipts
      where expires_at <= floor(extract(epoch from now()) * 1000)::bigint;
    delete from game.creation_tickets
      where expires_at <= floor(extract(epoch from (now() - interval '7 days')) * 1000)::bigint;
    delete from cron.job_run_details
      where jobid = (select jobid from cron.job where jobname = 'hugioi-cleanup-expired-data')
        and end_time < now() - interval '1 hour';
  $cleanup$
);

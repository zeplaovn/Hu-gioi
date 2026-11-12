-- Idempotent maintenance setup; does not delete player progress or Auth data.
-- Run after pg_cron and the game schema have been installed.
DO $setup$
DECLARE
  existing_job bigint;
  cleanup_sql text := $cleanup$
    DELETE FROM game.admin_audit_log WHERE created_at < now() - interval '1 hour';
    DELETE FROM game.world_chat_messages
      WHERE created_at < floor(extract(epoch FROM (now() - interval '1 hour')) * 1000)::bigint;
    DELETE FROM game.player_receipts
      WHERE expires_at <= floor(extract(epoch FROM now()) * 1000)::bigint;
    -- Keep one-use receipts for seven days, matching player_receipts' retry window.
    DELETE FROM game.pavilion_receipts
      WHERE created_at < floor(extract(epoch FROM (now() - interval '7 days')) * 1000)::bigint;
    -- A roll counts for 24 hours; do not delete a still-valid creation ticket.
    DELETE FROM game.creation_tickets
      WHERE created_at <= floor(extract(epoch FROM (now() - interval '24 hours')) * 1000)::bigint
        AND expires_at <= floor(extract(epoch FROM now()) * 1000)::bigint;
    DELETE FROM cron.job_run_details
      WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'hugioi-cleanup-expired-data')
        AND end_time < now() - interval '1 hour';
  $cleanup$;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname = 'hugioi-cleanup-expired-data';
  IF existing_job IS NULL THEN
    PERFORM cron.schedule('hugioi-cleanup-expired-data', '*/5 * * * *', cleanup_sql);
  ELSE
    PERFORM cron.alter_job(existing_job, schedule := '*/5 * * * *', command := cleanup_sql);
  END IF;
END
$setup$;

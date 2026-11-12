'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('cấu hình dọn lặp an toàn, giữ phiếu còn hạn và các giao dịch gần đây', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA cron; CREATE SCHEMA game;
      CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, jobname text, schedule text, command text);
      CREATE TABLE cron.job_run_details(jobid bigint, end_time timestamptz);
      CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(jobname,schedule,command) VALUES (job_name,schedule,command) RETURNING jobid $$;
      CREATE FUNCTION cron.alter_job(job_id bigint, schedule text, command text) RETURNS void LANGUAGE sql AS $$ UPDATE cron.job SET schedule=alter_job.schedule, command=alter_job.command WHERE jobid=job_id $$;
      CREATE TABLE game.admin_audit_log(created_at timestamptz);
      CREATE TABLE game.world_chat_messages(created_at bigint);
      CREATE TABLE game.player_receipts(expires_at bigint);
      CREATE TABLE game.pavilion_receipts(created_at bigint);
      CREATE TABLE game.creation_tickets(created_at bigint, expires_at bigint);
      INSERT INTO game.admin_audit_log VALUES (now()-interval '2 hours'),(now()-interval '30 minutes');
      INSERT INTO game.world_chat_messages SELECT (extract(epoch from now()-t)*1000)::bigint FROM (VALUES (interval '2 hours'), (interval '30 minutes')) x(t);
      INSERT INTO game.player_receipts SELECT (extract(epoch from now()+t)*1000)::bigint FROM (VALUES (interval '-1 hour'), (interval '1 hour')) x(t);
      INSERT INTO game.pavilion_receipts SELECT (extract(epoch from now()-t)*1000)::bigint FROM (VALUES (interval '8 days'), (interval '1 day')) x(t);
      INSERT INTO game.creation_tickets SELECT (extract(epoch from now()-c)*1000)::bigint,(extract(epoch from now()+e)*1000)::bigint FROM (VALUES (interval '25 hours',interval '-1 hour'),(interval '2 hours',interval '-1 hour'),(interval '25 hours',interval '1 hour')) x(c,e);`);
    const sql=fs.readFileSync(path.join(__dirname,'../supabase/sql/configure-maintenance.sql'),'utf8');
    await db.exec(sql); await db.exec(sql);
    const jobs=(await db.query("SELECT schedule,command FROM cron.job WHERE jobname='hugioi-cleanup-expired-data'")).rows;
    assert.equal(jobs.length,1); assert.equal(jobs[0].schedule,'*/5 * * * *');
    await db.exec(jobs[0].command);
    for (const [table,count] of [['admin_audit_log',1],['world_chat_messages',1],['player_receipts',1],['pavilion_receipts',1],['creation_tickets',2]]) {
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM game.${table}`)).rows[0].n,count,table);
    }
  } finally { await db.close(); }
});

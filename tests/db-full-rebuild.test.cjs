/* Full clean-room migration replay, separate from the destructive internal reset script.
 * PGlite is in-memory: no CI requests to any Supabase project. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'supabase/migrations');
test('toàn bộ migration dựng được database trắng từ đầu và không tái hiện đạo thân tử vong', async () => {
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
  assert.equal(files.filter(name => name.endsWith('_unified_baseline.sql')).length, 1, 'phải có đúng một baseline');
  assert.match(files[0], /_unified_baseline\.sql$/);
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid primary key);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');
      -- PGlite không có pg_cron; giả lập API lập lịch để vẫn replay và kiểm tra migration.
      CREATE SCHEMA cron;
      CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, jobname text, schedule text, command text);
      CREATE TABLE cron.job_run_details(jobid bigint, end_time timestamptz);
      CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint LANGUAGE sql AS $$
        INSERT INTO cron.job(jobname,schedule,command) VALUES (job_name,schedule,command) RETURNING jobid $$;
      CREATE FUNCTION cron.alter_job(job_id bigint, command text) RETURNS void LANGUAGE sql AS $$
        UPDATE cron.job SET command = alter_job.command WHERE jobid = job_id $$;`);
    for (const filename of files) {
      const sql = fs.readFileSync(path.join(dir, filename), 'utf8').replace(/create extension if not exists pg_cron\s*;/i, '-- pg_cron được giả lập trong PGlite');
      await db.exec(sql);
    }
    const jobs = (await db.query("select schedule,command from cron.job where jobname='hugioi-cleanup-expired-data'")).rows;
    if (files.some(name => name.endsWith('_cleanup_chat_messages.sql'))) {
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].schedule, '0 */3 * * *');
      assert.match(jobs[0].command, /delete from game\.world_chat_messages/i);
      await db.exec('BEGIN; ' + jobs[0].command + ' ROLLBACK;');
    }
    if (files.some(name => name.endsWith('_daily_mail_checkin.sql'))) {
      const accountJob = (await db.query(
        "select schedule,command from cron.job where jobname='hugioi-cleanup-account-receipts'")).rows;
      assert.equal(accountJob.length, 1);
      assert.equal(accountJob[0].schedule, '15 */3 * * *');
      assert.match(accountJob[0].command, /delete from game\.account_receipts/i);
      await db.exec('BEGIN; ' + accountJob[0].command + ' ROLLBACK;');
    }
    const tables = (await db.query(`select n.nspname || '.' || c.relname as tbl,c.relrowsecurity as rls
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where c.relkind='r' and (n.nspname='game' or n.nspname='public' and c.relname='policy_acceptances')
      order by tbl`)).rows;
    assert.equal(tables.length, 14, '12 bảng game/Auth hiện hành + 2 bảng admin riêng tư');
    assert.ok(tables.some(row => row.tbl === 'game.admin_users'));
    assert.ok(tables.some(row => row.tbl === 'game.admin_audit_log'));
    for (const tbl of ['game.account_state', 'game.account_receipts', 'game.account_mail'])
      assert.ok(tables.some(row => row.tbl === tbl), 'thiếu bảng ' + tbl);
    assert.ok(tables.every(row => row.rls), 'mọi bảng nghiệp vụ đều phải bật RLS');
    const scopes = (await db.query(`select schemaname,tablename,policyname from pg_policies
      where schemaname in ('game','public') order by schemaname,tablename`)).rows;
    assert.equal(scopes.length, 2, 'chỉ ledger consent được mở qua policy theo uid');
    assert.ok(scopes.every(row => row.schemaname === 'public' && row.tablename === 'policy_acceptances'));
    await db.exec(`INSERT INTO game.players
      (id,owner_id,name,name_key,revision,schema_version,content_version,state,rng_seed,
       rng_counter,last_seen_at,created_at,updated_at,combat_power)
      VALUES ('22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111',
        'Đạo Thử','dao-thu',0,9,'test',
        '{"created":true,"realm":1,"stage":3,"sect":{"joined":true,"id":"sect-1"}}'::jsonb,
        repeat('a',64),0,1,1,1,123)`);
    let rank=(await db.query('SELECT realm,stage,combat_power,sect_id FROM game.player_leaderboard')).rows;
    assert.equal(rank.length, 1);
    assert.equal(rank[0].realm, 1); assert.equal(rank[0].stage, 3);
    assert.equal(rank[0].combat_power, 123); assert.equal(rank[0].sect_id, 'sect-1');
    await db.exec(`UPDATE game.players SET state=jsonb_set(state,'{death}',
      '{"cause":"combat"}'::jsonb) WHERE name_key='dao-thu';`);
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM game.player_leaderboard')).rows[0].count,0);
    await db.exec(`UPDATE game.players SET combat_power=999 WHERE name_key='dao-thu';`);
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM game.player_leaderboard')).rows[0].count,0);
  } finally { await db.close(); }
});

test('reset nội bộ có điều kiện bảo vệ, không nằm trong migrations tự động và giữ Auth/consent', () => {
  const script = fs.readFileSync(path.join(root,'supabase/sql/rebuild-internal-test.sql'),'utf8');
  assert.match(script, /BEGIN;/);
  assert.match(script, /COMMIT;/);
  assert.match(script, /RAISE EXCEPTION 'REFUSED:/);
  assert.match(script, /CREATE TEMP TABLE hu_policy_acceptances_snapshot/);
  assert.match(script, /INSERT INTO public\.policy_acceptances\(user_id,policy_kind,policy_version,accepted_at\)/);
  assert.doesNotMatch(script, /DROP SCHEMA (?:auth|storage)/i);
  const marker = fs.readFileSync(path.join(root,'supabase/sql/archive/pre-baseline/20261111073203_internal_test_full_schema_rebuild.sql'),'utf8');
  assert.doesNotMatch(marker, /\bDROP\s+(?:SCHEMA|TABLE)\b/i);
});

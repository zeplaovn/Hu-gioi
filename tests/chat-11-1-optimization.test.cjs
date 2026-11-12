/* §11.1 chat: bảng tạm UNLOGGED, TTL 1 giờ, dọn 5 phút, rate limit bằng presence.
 * Chỉ chạy PGlite trong CI, không kết nối Supabase production. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'supabase/migrations');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const migrationName = '20261112030000_chat_unlogged_ttl_5m.sql';

test('migration chat là additive, có UNLOGGED + last_chat_at + rollback', () => {
  const sql = read('supabase/migrations/' + migrationName);
  assert.match(sql, /CREATE UNLOGGED TABLE game\.world_chat_messages_next/);
  assert.match(sql, /CREATE UNLOGGED TABLE game\.world_chat_presence_next/);
  assert.match(sql, /last_chat_at bigint NOT NULL DEFAULT 0/);
  assert.match(sql, /OVERRIDING SYSTEM VALUE/);
  assert.match(sql, /ALTER TABLE game\.world_chat_messages RENAME TO world_chat_messages_logged_old/);
  assert.match(sql, /DROP TABLE game\.world_chat_messages_logged_old/);
  assert.match(sql, /ALTER TABLE game\.world_chat_messages SET LOGGED/);
  assert.match(sql, /cron\.schedule\(\s*'hugioi-cleanup-chat',\s*'\*\/5 \* \* \* \*'/);
  assert.match(sql, /interval '1 hour'/);
  assert.match(sql, /interval '10 minutes'/);
  assert.doesNotMatch(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /ON CONFLICT\(owner_id\) DO UPDATE/);
  assert.match(sql, /last_chat_at <= EXCLUDED\.last_chat_at - 15000/);
});

test('replay migration: hai bảng chat UNLOGGED, cột last_chat_at, index cũ đã bỏ, cron 5 phút', async () => {
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
  assert.ok(files.includes(migrationName));
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid primary key);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');
      CREATE SCHEMA cron;
      CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, jobname text, schedule text, command text);
      CREATE TABLE cron.job_run_details(jobid bigint, end_time timestamptz);
      CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint LANGUAGE sql AS $$
        INSERT INTO cron.job(jobname,schedule,command) VALUES (job_name,schedule,command) RETURNING jobid $$;
      CREATE FUNCTION cron.alter_job(job_id bigint, command text) RETURNS void LANGUAGE sql AS $$
        UPDATE cron.job SET command = alter_job.command WHERE jobid = job_id $$;
      CREATE FUNCTION cron.unschedule(job_name text) RETURNS boolean LANGUAGE plpgsql AS $$
        BEGIN DELETE FROM cron.job WHERE jobname = job_name; RETURN true; END $$;`);
    for (const filename of files) {
      const sql = fs.readFileSync(path.join(dir, filename), 'utf8')
        .replace(/create extension if not exists pg_cron\s*;/i, '-- pg_cron được giả lập trong PGlite');
      await db.exec(sql);
    }
    const tables = (await db.query(`SELECT c.relname, c.relpersistence
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'game' AND c.relname IN ('world_chat_messages','world_chat_presence')
      ORDER BY c.relname`)).rows;
    assert.deepEqual(tables, [
      { relname: 'world_chat_messages', relpersistence: 'u' },
      { relname: 'world_chat_presence', relpersistence: 'u' }
    ]);
    const cols = (await db.query(`SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_schema='game' AND table_name='world_chat_presence' AND column_name='last_chat_at'`)).rows;
    assert.equal(cols.length, 1);
    assert.match(String(cols[0].column_default), /^0/);
    const indexes = (await db.query(`SELECT indexname FROM pg_indexes
      WHERE schemaname='game' AND tablename IN ('world_chat_messages','world_chat_presence')
      ORDER BY indexname`)).rows.map(row => row.indexname);
    assert.ok(indexes.includes('game_world_chat_channel_id'));
    assert.ok(indexes.includes('game_world_chat_presence_seen'));
    assert.ok(!indexes.includes('game_world_chat_sender_time'), 'index max(created_at) phải bị bỏ');
    const jobs = (await db.query(
      "SELECT schedule, command FROM cron.job WHERE jobname='hugioi-cleanup-chat'")).rows;
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].schedule, '*/5 * * * *');
    assert.match(jobs[0].command, /delete from game\.world_chat_messages/i);
    assert.match(jobs[0].command, /interval '1 hour'/i);
    assert.match(jobs[0].command, /delete from game\.world_chat_presence/i);
    const admin = (await db.query(
      "SELECT prosrc FROM pg_proc WHERE proname='hu_admin_send_chat'")).rows;
    assert.equal(admin.length, 1);
    assert.doesNotMatch(admin[0].prosrc, /pg_advisory_xact_lock/);
    assert.match(admin[0].prosrc, /last_chat_at/);
    assert.match(admin[0].prosrc, /created_at > v_now - 3600000/);

    // Rollback thủ công phải chạy được: LOGGED lại, bỏ job, khôi phục admin cũ.
    await db.exec(read('supabase/sql/rollback/20261112030000_chat_unlogged_ttl_5m_rollback.sql'));
    const rolled = (await db.query(`SELECT c.relname, c.relpersistence
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'game' AND c.relname IN ('world_chat_messages','world_chat_presence')
      ORDER BY c.relname`)).rows;
    assert.equal(rolled.length, 2);
    assert.ok(rolled.every(row => row.relpersistence !== 'u'), 'rollback phải bỏ UNLOGGED');
    assert.equal((await db.query(
      "SELECT count(*)::int AS n FROM cron.job WHERE jobname='hugioi-cleanup-chat'")).rows[0].n, 0);
    const restored = (await db.query(
      "SELECT prosrc FROM pg_proc WHERE proname='hu_admin_send_chat'")).rows[0].prosrc;
    assert.match(restored, /pg_advisory_xact_lock/);
  } finally { await db.close(); }
});

test('Edge và client dùng TTL 1 giờ, cache/singleflight, optimistic send và poll 10 giây', () => {
  const edge = read('supabase/functions/api/social.ts');
  const client = read('client/session/chat-session.js');
  const ui = read('client/ui/screens/chat.js');
  assert.match(edge, /const MESSAGE_TTL_MS = 60 \* 60 \* 1000/);
  assert.match(edge, /const READ_CACHE_MS = 4000/);
  assert.match(edge, /const ONLINE_CACHE_MS = 45000/);
  assert.match(edge, /const HEARTBEAT_MS = 60000/);
  assert.match(edge, /const SEND_INTERVAL_MS = 15000/);
  assert.match(edge, /readInFlight/);
  assert.match(edge, /onlineInFlight/);
  assert.match(edge, /async function touchPresence/);
  assert.match(edge, /await touchPresence\(c, ownerId, now\)/);
  // Rời kênh chỉ offline, không xóa last_chat_at (tránh reset cooldown 15 giây).
  assert.match(edge, /UPDATE game\.world_chat_presence SET seen_at = 0 WHERE owner_id = \$1/);
  assert.doesNotMatch(edge, /pg_advisory_xact_lock/);
  assert.doesNotMatch(edge, /now - asSafe\(last\.created_at\) < 15000/);
  assert.match(client, /id: 'pending:' \+ requestId/);
  assert.match(client, /pending: true/);
  assert.match(client, /cooldownUntil\(\)/);
  assert.match(client, /this\.schedule\(gen, 10000\)/);
  assert.match(client, /if \(root\.document\?\.hidden \|\| root\.navigator\?\.onLine === false\) return;/);
  assert.match(ui, /message\.pending/);
  assert.match(ui, /Đang gửi/);
  assert.match(ui, /session\.cooldownUntil\(\)/);
  const css = read('css/chat.css');
  assert.match(css, /\.chat-message\.pending\{/);
});

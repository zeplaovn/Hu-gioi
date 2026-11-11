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
const deployed = [
  '20261109095404_add_hu_gioi_policy_acceptances.sql',
  '20261109120945_allow_online_only_policy_consent_v2.sql',
  '20261109125831_allow_v3_permadeath_policy_consent.sql',
  '20261109145450_allow_v4_email_ip_auth_consent.sql',
  '20261110051049_allow_v5_policy_consent.sql',
  '20261110075419_game_schema.sql',
  '20261111015058_online_social_and_indexed_leaderboard.sql',
  '20261111020645_allow_v6_policy_consent_online_social.sql',
  '20261111022001_desktop_chat_channels_and_power_ranks.sql',
  '20261111023603_v7_consent_and_deceased_leaderboard.sql',
  '20261111030718_exclude_dead_from_live_leaderboards.sql',
  '20261111073203_internal_test_full_schema_rebuild.sql'
];

test('toàn bộ migration dựng được database trắng từ đầu và không tái hiện đạo thân tử vong', async () => {
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
  assert.ok(deployed.every(name => files.includes(name)), 'Git phải chứa đủ lịch sử Supabase thực tế');
  assert.ok(!files.some(name => /^202611110(?:32200|40200)_/.test(name)), 'không chạy lại bản migration sai timestamp');
  assert.ok(files.includes('20261110095400_game_cleanup_indexes.sql'), 'cleanup index phải có thể replay');
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid primary key);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');`);
    for (const filename of files) {
      const sql = fs.readFileSync(path.join(dir, filename), 'utf8');
      await db.exec(sql);
    }
    const tables = (await db.query(`select n.nspname || '.' || c.relname as tbl,c.relrowsecurity as rls
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where c.relkind='r' and (n.nspname='game' or n.nspname='public' and c.relname='policy_acceptances')
      order by tbl`)).rows;
    assert.equal(tables.length, 11, '9 bảng game/Auth hiện hành + 2 bảng admin riêng tư');
    assert.ok(tables.some(row => row.tbl === 'game.admin_users'));
    assert.ok(tables.some(row => row.tbl === 'game.admin_audit_log'));
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
  const marker = fs.readFileSync(path.join(dir,'20261111073203_internal_test_full_schema_rebuild.sql'),'utf8');
  assert.doesNotMatch(marker, /\bDROP\s+(?:SCHEMA|TABLE)\b/i);
});

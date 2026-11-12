/* Số round-trip Postgres mỗi giao dịch gameplay: chống hồi quy hiệu năng trên PGlite (CI, không production). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { PostgresPlayers } = require('../server/repositories/postgres-players.js');
const { PlayerService } = require('../server/services/player-service.js');

const OWNER = '11111111-1111-4111-8111-111111111111';
const CLOCK = 1800000000000;
const migration = fs.readFileSync(path.join(__dirname, '../supabase/sql/archive/pre-baseline/20261110075419_game_schema.sql'), 'utf8');
const socialMigration = fs.readFileSync(path.join(__dirname, '../supabase/sql/archive/pre-baseline/20261111015058_online_social_and_indexed_leaderboard.sql'), 'utf8');
const rankMigration = fs.readFileSync(path.join(__dirname, '../supabase/sql/archive/pre-baseline/20261111022001_desktop_chat_channels_and_power_ranks.sql'), 'utf8');

async function makePg(t, { statementTimeoutMs, lockTimeoutMs } = {}) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key);
    INSERT INTO auth.users VALUES ('${OWNER}');`);
  await db.exec(migration);
  await db.exec(socialMigration);
  await db.exec(rankMigration);
  const log = [];
  const settingsAtLock = [];
  const pool = {
    async connect() {
      return {
        queryObject: async ({ text, args = [] }) => {
          log.push(text.replace(/\s+/g, ' ').trim());
          const result = await db.query(text, args);
          // Deno Postgres queryObject rejects duplicate column names; PGlite
          // normally overwrites them silently, so enforce the real contract.
          const names = result.fields.map(field => field.name);
          if (result.rows.length && new Set(names).size !== names.length)
            throw new Error('Duplicate result column names');
          if (/FROM game\.players WHERE id = \$1 FOR UPDATE/.test(text)) {
            const s = await db.query("SELECT current_setting('statement_timeout') AS st, current_setting('lock_timeout') AS lt");
            settingsAtLock.push(s.rows[0]);
          }
          return { rows: result.rows };
        },
        release() {}
      };
    },
    async end() { await db.close(); }
  };
  const repo = new PostgresPlayers({ pool, statementTimeoutMs, lockTimeoutMs });
  const clock = { now: CLOCK };
  const svc = new PlayerService({
    repository: repo, clock: () => clock.now, contentVersion: 'test', onError: () => {},
    config: { onlineGraceMs: 60000, nextSyncInMs: 20000 }
  });
  t.after(async () => { await repo.close(); });
  return { svc, clock, log, settingsAtLock };
}

async function spawn(svc) {
  const ticket = await svc.previewCreation(OWNER);
  return svc.createPlayer(OWNER, {
    ticketId: ticket.ticketId, name: 'Lâm Tiên', gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
  });
}

test('giao dịch gameplay đặt statement_timeout và lock_timeout trong MỘT câu lệnh', async t => {
  const { svc, clock, log, settingsAtLock } = await makePg(t, { statementTimeoutMs: 1234, lockTimeoutMs: 567 });
  const made = await spawn(svc);
  log.length = 0;
  settingsAtLock.length = 0;
  clock.now += 20000;
  await svc.sync(OWNER, made.playerId);

  const setups = log.filter(q => q.includes('set_config'));
  assert.equal(setups.length, 1, 'phải gộp thành một câu set_config: ' + JSON.stringify(setups));
  assert.match(setups[0], /statement_timeout/);
  assert.match(setups[0], /lock_timeout/);
  assert.deepEqual(settingsAtLock, [{ st: '1234ms', lt: '567ms' }],
    'timeout phải đang có hiệu lực khi khóa hàng người chơi');
});

test('timeout là cục bộ giao dịch: không rò sang giao dịch sau', async t => {
  const { svc, clock, settingsAtLock } = await makePg(t, { statementTimeoutMs: 1500, lockTimeoutMs: 900 });
  const made = await spawn(svc);
  settingsAtLock.length = 0;
  for (let i = 0; i < 3; i++) { clock.now += 20000; await svc.sync(OWNER, made.playerId); }
  assert.equal(settingsAtLock.length, 3);
  for (const s of settingsAtLock) assert.deepEqual(s, { st: '1500ms', lt: '900ms' });
});

test('sync: tổng số câu lệnh SQL cho một heartbeat không vượt ngân sách', async t => {
  const { svc, clock, log } = await makePg(t);
  const made = await spawn(svc);
  clock.now += 20000;
  log.length = 0;
  await svc.sync(OWNER, made.playerId);
  // BEGIN, set_config, SELECT … FOR UPDATE, UPDATE, COMMIT + 1 truy vấn pavilion ngoài giao dịch.
  // sweep() có thể thêm SAVEPOINT/DELETE/RELEASE nhưng chỉ mỗi 10 phút/người chơi.
  assert.ok(log.length <= 6, 'Heartbeat dùng ' + log.length + ' câu lệnh: ' + JSON.stringify(log));
  assert.equal(log[0], 'BEGIN');
  assert.equal(log.at(-2), 'COMMIT');
});

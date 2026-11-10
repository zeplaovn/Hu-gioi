/* Hợp đồng Postgres trên PGlite chỉ dùng trong CI, không có kết nối production. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { PostgresPlayers } = require('../server/repositories/postgres-players.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PlayerService } = require('../server/services/player-service.js');
const H = require('../engine/game.js');

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const CLOCK = 1800000000000;
const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261110075419_game_schema.sql'), 'utf8');

async function makePg(t) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key);
    INSERT INTO auth.users VALUES ('${A}'), ('${B}');`);
  await db.exec(migration);
  let queued = Promise.resolve();
  const pool = {
    async connect() {
      let release;
      const wait = queued;
      queued = new Promise(resolve => { release = resolve; });
      await wait;
      return {
        queryObject: async ({ text, args = [] }) => {
          const result = await db.query(text, args);
          return { rows: result.rows };
        },
        release
      };
    },
    async end() { await queued; await db.close(); }
  };
  const repo = new PostgresPlayers({ pool });
  const clock = { now: CLOCK };
  const svc = new PlayerService({
    repository: repo, clock: () => clock.now, contentVersion: 'test', onError: () => {},
    config: { onlineGraceMs: 60000, nextSyncInMs: 20000 }
  });
  t.after(async () => { await repo.close(); });
  return { db, repo, svc, clock };
}
async function spawn(svc, owner, name) {
  const ticket = await svc.previewCreation(owner);
  return svc.createPlayer(owner, {
    ticketId: ticket.ticketId, name, gender: 'nu', talent: { ngoTinh: 8 }, destiny: 'exp'
  });
}
const envelope = async (svc, owner, type, payload, requestId) => ({
  protocolVersion: 2, type, payload, requestId, expectedRevision: (await svc.bootstrap(owner)).player.revision
});
const command = async (svc, owner, id, requestId, type = 'buy', payload = { code: 'HERB-001' }) =>
  svc.command(owner, id, await envelope(svc, owner, type, payload, requestId));

test('Postgres migration: private RLS, bảng Thiên Mệnh Các, quyền anon/authenticated', async t => {
  const { db } = await makePg(t);
  const result = await db.query(`SELECT n.nspname, c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='game' AND c.relkind='r' ORDER BY c.relname`);
  assert.deepEqual(result.rows.map(x => x.relname), [
    'creation_tickets', 'pavilion_accounts', 'pavilion_receipts', 'player_receipts', 'players'
  ]);
  assert.ok(result.rows.every(x => x.relrowsecurity === true));
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='game'`)).rows[0].n, 0);
  for (const role of ['anon', 'authenticated']) {
    assert.equal((await db.query('SELECT has_schema_privilege($1, $2, $3) AS allowed', [role, 'game', 'USAGE'])).rows[0].allowed, false);
    assert.equal((await db.query('SELECT has_table_privilege($1, $2, $3) AS allowed', [role, 'game.players', 'SELECT'])).rows[0].allowed, false);
  }
  await db.exec(migration); // idempotent
});

test('Postgres contract: ticket, owner 404, name unique, receipt, optimistic revision, export', async t => {
  const { svc, repo } = await makePg(t);
  const first = await spawn(svc, A, 'Lâm Tiên');
  const id = first.playerId;
  const other = await spawn(svc, B, 'Hạ Chi');
  assert.notEqual(id, other.playerId);
  assert.equal((await svc.bootstrap(A)).player.id, id);
  await assert.rejects(svc.state(B, id), { code: 'PLAYER_NOT_FOUND' });
  await assert.rejects(svc.command(B, id, await envelope(svc, B, 'buy', { code: 'HERB-001' }, 'hijack')), { code: 'PLAYER_NOT_FOUND' });
  const firstCmd = await command(svc, A, id, 'receipt-1');
  assert.equal(firstCmd.revision, 1);
  const replay = await svc.command(A, id, { ...await envelope(svc, A, 'buy', { code: 'HERB-001' }, 'receipt-1'), expectedRevision: 0 });
  assert.equal(replay.replayed, true);
  assert.equal(replay.state.stone, firstCmd.state.stone);
  await assert.rejects(svc.command(A, id, {
    ...await envelope(svc, A, 'sell', { code: 'HERB-001' }, 'receipt-1'), expectedRevision: 0
  }), { code: 'REQUEST_ID_REUSED' });
  await assert.rejects(svc.command(A, id, {
    ...await envelope(svc, A, 'buy', { code: 'HERB-001' }, 'receipt-2'), expectedRevision: 0
  }), { code: 'REVISION_CONFLICT' });
  const exported = await svc.exportData(A);
  assert.equal(exported.player.id, id);
  assert.ok(exported.player.state);
  assert.ok(!JSON.stringify(exported).includes((await repo.get(id)).rngSeed));
  assert.equal('rngSeed' in exported.player, false);
});

test('Postgres contract: offline rejected command freezes 20m, partial spend rolls back', async t => {
  const { svc, repo, clock } = await makePg(t);
  const { playerId } = await spawn(svc, A, 'Phong Ảnh');
  const original = await svc.state(A, playerId);
  clock.now += 20 * 60000;
  await assert.rejects(command(svc, A, playerId, 'bad-break', 'breakthrough', {}), { code: 'GAME_RULE_VIOLATION' });
  const synced = await svc.sync(A, playerId);
  assert.equal(synced.report.seconds, 0);
  assert.equal(synced.state.age, original.state.age);
  assert.equal(synced.state.qi, original.state.qi);
  const before = await repo.get(playerId);
  const old = H.Game.prototype.buy;
  H.Game.prototype.buy = function () { this.s.stone -= 12; throw Error('Cấm mua thử.'); };
  try {
    await assert.rejects(command(svc, A, playerId, 'partial-spend'), { code: 'GAME_RULE_VIOLATION' });
  } finally { H.Game.prototype.buy = old; }
  const after = await repo.get(playerId);
  assert.equal(after.state.stone, before.state.stone);
  assert.equal(after.state.qi, before.state.qi);
  assert.equal(after.lastSeenAt, after.state.lastUpdate);
});

test('Postgres contract: two concurrent commands on same revision serialize into success/conflict', async t => {
  const { svc } = await makePg(t);
  const { playerId } = await spawn(svc, A, 'Phục Minh');
  const cmd = await envelope(svc, A, 'buy', { code: 'HERB-001' }, 'parallel-1');
  const [x, y] = await Promise.allSettled([
    svc.command(A, playerId, cmd),
    svc.command(A, playerId, { ...cmd, requestId: 'parallel-2' })
  ]);
  assert.equal([x, y].filter(v => v.status === 'fulfilled').length, 1);
  const rejected = [x, y].find(v => v.status === 'rejected');
  assert.equal(rejected.reason.code, 'REVISION_CONFLICT');
  assert.equal((await svc.bootstrap(A)).player.revision, 1);
});

test('Postgres contract: account erase and cascade, pavilion persists across reincarnation', async t => {
  const { svc, repo, db } = await makePg(t);
  const first = await spawn(svc, A, 'Tịnh Thiên');
  const id = first.playerId;
  await repo.transact(id, async tx => ({ pavilionAward: 8, value: null }));
  assert.equal((await svc.bootstrap(A)).pavilion.balance, 8);
  const purchased = await svc.pavilionPurchase(A, {
    requestId: 'pavilion-up1', expectedVersion: 1, kind: 'upgrade', key: 'ngoTinh'
  });
  assert.equal(purchased.pavilion.upgrades.ngoTinh, 1);
  await repo.transact(id, async tx => ({ save: {
    state: { ...tx.record.state, death: { cause: 'combat', at: CLOCK } },
    revision: tx.record.revision + 1, rngCounter: tx.record.rngCounter,
    lastSeenAt: CLOCK, schemaVersion: H.VERSION, contentVersion: 'test'
  }}));
  const deleted = await svc.resetAfterDeath(A, id);
  assert.equal(deleted.deleted, true);
  assert.equal((await svc.bootstrap(A)).pavilion.upgrades.ngoTinh, 1);
  const next = await spawn(svc, A, 'Tịnh Đạo');
  assert.equal(next.state.pavilion.ngoTinh, 1);
  const erased = await svc.eraseData(A, { confirm: 'delete-my-game-data' });
  assert.equal(erased.players, 1);
  assert.equal((await svc.bootstrap(A)).player, null);
  assert.equal((await svc.bootstrap(A)).pavilion.balance, 0);
  await spawn(svc, B, 'Ngân Vũ');
  await db.query('DELETE FROM auth.users WHERE id=$1', [B]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM game.players WHERE owner_id=$1', [B])).rows[0].n, 0);
});

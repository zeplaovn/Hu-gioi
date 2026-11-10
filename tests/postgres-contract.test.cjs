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

test('bootstrap reads both owner records with one DB checkout and one query', async t => {
  const { repo, svc } = await makePg(t);
  const originalConnect = repo.pool.connect.bind(repo.pool);
  let checkouts = 0, statements = [];
  repo.pool.connect = async () => {
    checkouts++;
    const c = await originalConnect();
    return { ...c, queryObject: async q => {
      statements.push(q.text);
      return c.queryObject(q);
    } };
  };
  const empty = await svc.bootstrap(A);
  assert.equal(empty.player, null);
  assert.equal(empty.pavilion.balance, 0);
  assert.equal(checkouts, 1);
  assert.equal(statements.length, 1, 'bootstrap without player performs one SELECT');

  const { playerId } = await spawn(svc, A, 'Thiên Sách');
  await repo.transact(playerId, () => ({ pavilionAward: 8 }));
  checkouts = 0;
  statements = [];
  const snapshot = await svc.bootstrap(A);
  assert.equal(snapshot.player.id, playerId);
  assert.equal(snapshot.pavilion.balance, 8);
  assert.equal(snapshot.snapshot.pavilion.balance, 8);
  assert.equal(checkouts, 1, 'one pool checkout');
  assert.equal(statements.length, 1, 'one SQL statement');
  assert.match(statements[0], /row_to_json/);
});

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

test('B1: expired receipts remain bounded after 240 minutes at five commands/minute', async t => {
  const { db, repo, svc, clock } = await makePg(t);
  const { playerId } = await spawn(svc, A, 'Dọn Biên Nhận');
  const minutes = 240, minuteMs = 60000;
  const hourlyExpired = [];
  for (let minute = 0; minute < minutes; minute++) {
    clock.now = CLOCK + minute * minuteMs;
    await db.query(`INSERT INTO game.player_receipts
      (player_id, request_id, fingerprint, revision, response, created_at, expires_at)
      SELECT $1::uuid, ($2::text || g::text), 'command-test', 0, '{}'::jsonb,
        $3::bigint, $4::bigint FROM generate_series(1, 5) AS g`,
    [playerId, 'burst-' + minute + '-', String(clock.now), String(clock.now + 2 * minuteMs)]);
    await repo.transaction(c => repo.sweep(c, A, clock.now, playerId));
    if ((minute + 1) % 60 === 0) {
      const expired = await db.query(
        'SELECT count(*)::int AS n FROM game.player_receipts WHERE player_id=$1 AND expires_at <= $2',
        [playerId, String(clock.now)]);
      hourlyExpired.push(expired.rows[0].n);
    }
  }
  console.log('B1 expired receipts after hours 1-4:', JSON.stringify(hourlyExpired));
  assert.ok(hourlyExpired.every(n => n <= 55),
    'Expired receipts must remain within one 10-minute cleanup interval: ' + hourlyExpired.join(', '));
  const replayed = await repo.transact(playerId, async tx => ({
    value: await tx.receipt('burst-239-1', clock.now)
  }));
  assert.equal(replayed.requestId, 'burst-239-1', 'Unexpired receipt remains replayable');
});

test('B1: one cleanup removes all stale creation tickets rather than only 16', async t => {
  const { db, repo } = await makePg(t);
  const old = CLOCK - 8 * 86400000;
  await db.query(`INSERT INTO game.creation_tickets (id, owner_id, preview, created_at, expires_at)
    SELECT ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
      $1::uuid, '{}'::jsonb, $2::bigint, $3::bigint
    FROM generate_series(1, 80) g`, [A, String(old), String(old + 60000)]);
  await repo.transaction(c => repo.sweep(c, A, CLOCK));
  const { rows } = await db.query('SELECT count(*)::int AS n FROM game.creation_tickets WHERE owner_id=$1', [A]);
  console.log('B1 stale creation tickets left:', rows[0].n);
  assert.equal(rows[0].n, 0);
});

test('B1: cleanup index migration can be applied twice without changing schema', async t => {
  const { db } = await makePg(t);
  const cleanupSql = fs.readFileSync(path.join(__dirname,
    '../supabase/migrations/20261110095400_game_cleanup_indexes.sql'), 'utf8');
  await db.exec(cleanupSql);
  await db.exec(cleanupSql);
  const result = await db.query(`SELECT indexname FROM pg_indexes WHERE schemaname='game'
    AND indexname IN ('game_player_receipts_player_expires',
                      'game_creation_tickets_owner_expires') ORDER BY indexname`);
  assert.deepEqual(result.rows.map(x => x.indexname), [
    'game_creation_tickets_owner_expires', 'game_player_receipts_player_expires'
  ]);
});

test('B1: cleanup error rolls back savepoint and enforces a 60s retry cooldown', async t => {
  const { db, repo, svc, clock } = await makePg(t);
  const { playerId } = await spawn(svc, A, 'Dọn Dẹp An Toàn');
  // Đồng bộ thời gian giả lập ở repository; mặc định repo dùng Date.now thật.
  repo.clock = () => clock.now;
  await db.query(`INSERT INTO game.player_receipts
    (player_id, request_id, fingerprint, revision, response, created_at, expires_at)
    VALUES ($1, 'stale-test', 'old', 0, '{}'::jsonb, $2, $3)`,
    [playerId, String(CLOCK - 120000), String(CLOCK - 60000)]);
  repo.cleanedAt.delete(A);
  const originalConnect = repo.pool.connect.bind(repo.pool);
  let injected = 0;
  let cleanupDeletes = 0;
  repo.pool.connect = async () => {
    const c = await originalConnect();
    return { ...c, queryObject: async query => {
      if (query.text.startsWith('DELETE FROM game.player_receipts')) cleanupDeletes++;
      if (!injected && query.text.startsWith('DELETE FROM game.player_receipts')) {
        injected++;
        // Real PostgreSQL error from PGlite aborts the subtransaction until rollback-to-savepoint.
        return c.queryObject({ text: 'SELECT * FROM game.no_such_cleanup_table', args: [] });
      }
      return c.queryObject(query);
    }};
  };
  const accepted = await command(svc, A, playerId, 'receipt-after-cleanup-error');
  assert.equal(injected, 1, 'cleanup DELETE must have been attempted');
  assert.equal(accepted.revision, 1, 'gameplay command must commit despite cleanup error');
  const before = await db.query(
    'SELECT request_id FROM game.player_receipts WHERE player_id=$1 ORDER BY request_id', [playerId]);
  assert.deepEqual(before.rows.map(r => r.request_id), ['receipt-after-cleanup-error', 'stale-test']);
  const replay = await svc.command(A, playerId,
    { ...await envelope(svc, A, 'buy', { code: 'HERB-001' }, 'receipt-after-cleanup-error'), expectedRevision: 0 });
  assert.equal(replay.replayed, true, 'unexpired receipt must replay correctly');
  assert.equal(cleanupDeletes, 1, 'the immediate replay must not retry the failed cleanup');
  clock.now += 59999;
  await repo.transaction(c => repo.sweep(c, A, clock.now, playerId));
  assert.equal(cleanupDeletes, 1, 'no cleanup retry before 60 seconds');
  clock.now += 1;
  await repo.transaction(c => repo.sweep(c, A, clock.now, playerId));
  assert.equal(cleanupDeletes, 2, 'one cleanup retry at the 60-second boundary');
  const after = await db.query('SELECT count(*)::int AS n FROM game.player_receipts WHERE request_id=$1',
    ['stale-test']);
  assert.equal(after.rows[0].n, 0, 'expired receipts are removed after cooldown');
});

test('Final audit: rejected revision attempts consume durable Postgres command quota', async t => {
  const { svc, repo } = await makePg(t);
  svc.cfg.repositoryRates = true;
  const { playerId } = await spawn(svc, A, 'Cấm Lặp Revision');
  for (let i = 0; i < 30; i++) {
    await assert.rejects(svc.command(A, playerId, {
      protocolVersion: 2, type: 'buy', payload: { code: 'HERB-001' },
      requestId: 'stale-revision-' + i, expectedRevision: 999
    }), { code: 'REVISION_CONFLICT' });
  }
  await assert.rejects(svc.command(A, playerId, {
    protocolVersion: 2, type: 'buy', payload: { code: 'HERB-001' },
    requestId: 'stale-blocked', expectedRevision: 999
  }), { code: 'RATE_LIMITED' });
  const after = await repo.get(playerId);
  assert.equal(after.revision, 0, 'bad requests must not mutate gameplay');
  assert.ok(after.rateTokens.command.tokens < 1, 'quota was persisted on each rejection');
});

test('Final audit: Postgres Pavilion replay returns original cost without double spend', async t => {
  const { svc, repo } = await makePg(t);
  const { playerId } = await spawn(svc, A, 'Thiên Tinh Ghi Sổ');
  await repo.transact(playerId, async () => ({ pavilionAward: 20, value: null }));
  const intent = {
    requestId: 'pavilion-replay-cost', expectedVersion: 1, kind: 'upgrade', key: 'ngoTinh'
  };
  const first = await svc.pavilionPurchase(A, intent);
  assert.equal(first.result.cost, 2);
  const again = await svc.pavilionPurchase(A, { ...intent, expectedVersion: 0 });
  assert.equal(again.replayed, true);
  assert.equal(again.result.cost, first.result.cost);
  assert.deepEqual(again.pavilion, first.pavilion);
});

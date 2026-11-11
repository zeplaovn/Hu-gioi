/* Thiên Mệnh Các · Shop Khởi Nguyên, cùng hợp đồng cho SQLite và PostgreSQL.
 * Chỉ server cấp thêm điểm và vật phẩm. Không dùng client-local currency. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const H = require('../engine/game.js');
const { SqlitePlayers } = require('../server/repositories/sqlite-players.js');
const { PostgresPlayers } = require('../server/repositories/postgres-players.js');
const { PlayerService } = require('../server/services/player-service.js');

const T0 = 1800000000000;
const OWNER = '11111111-1111-4111-8111-111111111111';

async function fixture(adapter) {
  if (adapter === 'sqlite') {
    const repo = new SqlitePlayers(':memory:');
    return { service: new PlayerService({ repository: repo, contentVersion: 'test', clock: () => T0 }),
      close: () => repo.close() };
  }
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid primary key); INSERT INTO auth.users VALUES ('${OWNER}');`);
  for (const file of [
    '20261110075419_game_schema.sql',
    '20261111015058_online_social_and_indexed_leaderboard.sql',
    '20261111022001_desktop_chat_channels_and_power_ranks.sql'
  ]) await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/', file), 'utf8'));
  const pool = { async connect() {
    return { queryObject: async ({ text, args = [] }) => ({ rows: (await db.query(text, args)).rows }), release() {} };
  }, async end() { await db.close(); } };
  const repo = new PostgresPlayers({ pool });
  return { service: new PlayerService({ repository: repo, contentVersion: 'test', clock: () => T0 }),
    close: () => repo.close() };
}
const purchase = (svc, kind, key, requestId, expectedVersion) =>
  svc.pavilionPurchase(OWNER, { kind, key, requestId, expectedVersion });

for (const adapter of ['sqlite','postgres']) {
  test(`Thiên Mệnh Các trước khi nhập thế [${adapter}]: tặng ngân sách một lần, đổi điểm và đan rồi cấp đúng một lần`, async t => {
    const { service: svc, close } = await fixture(adapter);
    t.after(close);
    const ticket = await svc.previewCreation(OWNER);
    assert.equal((await svc.bootstrap(OWNER)).pavilion.balance, 0, 'Chưa mua thì không phát sinh điểm thưởng');
    const first = await purchase(svc, 'starter', 'talentPoint', 'starter-talent-0001', 0);
    assert.equal(first.pavilion.balance, H.PAVILION.starterGrant - 4);
    assert.equal(first.pavilion.totalEarned, H.PAVILION.starterGrant);
    assert.equal(first.pavilion.relics.talentPoint, 1);
    const replay = await purchase(svc, 'starter', 'talentPoint', 'starter-talent-0001', 0);
    assert.equal(replay.replayed, true);
    assert.equal(replay.pavilion.balance, first.pavilion.balance);
    await assert.rejects(purchase(svc, 'starter', 'talentPoint', 'starter-invalid-revision', 0),
      { code:'PAVILION_CONFLICT' });
    const second = await purchase(svc, 'starter', 'tuKhiDan', 'starter-pill-0002', first.pavilion.version);
    assert.equal(second.pavilion.balance, 3);
    await assert.rejects(purchase(svc, 'starter', 'unknown', 'starter-invalid-item', second.pavilion.version),
      { code:'INVALID_REQUEST' });
    await assert.rejects(svc.createPlayer(OWNER, {
      ticketId: ticket.ticketId, name: 'Tân Học Đạo', gender: 'nam', talent: { canCot: 8 }, destiny: 'exp'
    }), { code:'INVALID_PROFILE' }, 'Mua thêm điểm bắt buộc phân bổ đủ');
    const made = await svc.createPlayer(OWNER, {
      ticketId: ticket.ticketId, name:'Tân Học Đạo', gender:'nam',
      talent:{ canCot:8, ngoTinh:1 }, destiny:'exp'
    });
    assert.equal(made.state.starterTalentPoints, 1);
    assert.equal(made.state.talent.canCot, 8);
    assert.equal(made.state.talent.ngoTinh, 1);
    assert.equal(H.normalize(made.state,T0).talent.ngoTinh, 1);
    assert.ok(made.state.bag['PILL-002'] >= 2, 'Tụ Khí Đan đã được gửi vào hành trang');
    const account = (await svc.bootstrap(OWNER)).pavilion;
    assert.equal(account.balance, 3, 'Thiên Tinh chưa tiêu không bị mất');
    assert.deepEqual(account.relics, {}, 'Các món Khởi Nguyên đã được nhận, không lặp lại');
    await assert.rejects(purchase(svc, 'starter', 'boiNguyenDan', 'starter-too-late', account.version),
      { code: 'GAME_RULE_VIOLATION' });
    const after = await purchase(svc, 'starter', 'tuKhiDan', 'starter-pill-0002', first.pavilion.version);
    assert.equal(after.replayed, true);
    assert.deepEqual((await svc.bootstrap(OWNER)).pavilion.relics, {});
  });
}

test('quầy Khởi Nguyên là storefront thật ở màn tạo và server không tin dữ liệu giá/điểm client', () => {
  const read = pathName => fs.readFileSync(path.join(__dirname, '..',pathName),'utf8');
  const html=read('index.html'), boot=read('client/ui/boot.js'), service=read('server/services/player-service.js');
  assert.match(html, /id="creationShop"/);
  assert.match(html, /THIÊN MỆNH CÁC · QUẦY KHỞI NGUYÊN/);
  assert.match(boot, /UI\.session\.pavilionPurchase\('starter', key\)/);
  assert.match(boot, /H\.PAVILION\.starterTalentMax/);
  assert.match(service, /extraTalentPoints: pavilion\.consumed\?\.talentPoint \|\| 0/);
  assert.match(service, /onlyKeys\(body, \['ticketId', 'name', 'gender', 'talent', 'destiny'\]\)/);
  assert.match(read('css/creation.css'), /creation-shop-item button\{min-height:44px/);
});

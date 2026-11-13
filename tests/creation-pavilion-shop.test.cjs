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
  ]) await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/sql/archive/pre-baseline/', file), 'utf8'));
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

for (const adapter of ['sqlite','postgres']) {
  test(`Thiên Mệnh Các trước khi nhập thế [${adapter}]: Dấu ấn Thiên Mệnh phải mua và chỉ chọn một`, async t => {
    const { service: svc, close } = await fixture(adapter);
    t.after(close);
    const ticket = await svc.previewCreation(OWNER);
    const first = await purchase(svc, 'starter', 'destinyLuck', 'starter-destiny-0001', 0);
    assert.equal(first.pavilion.relics.destinyLuck, 1);
    assert.equal(first.pavilion.balance, H.PAVILION.starterGrant - H.PAVILION.starter.destinyLuck.cost);
    await assert.rejects(purchase(svc, 'starter', 'destinyExp', 'starter-destiny-0002', first.pavilion.version),
      { code: 'GAME_RULE_VIOLATION' }, 'Không được mua hai Dấu ấn Thiên Mệnh');
    const made = await svc.createPlayer(OWNER, {
      ticketId: ticket.ticketId, name: 'Thiên Vận Tử', gender: 'nu',
      talent: { vanKhi: 8 }, destiny: 'exp'
    });
    assert.equal(made.state.destiny, 'luck', 'Dấu ấn đã mua quyết định buff, không nhận destiny client gửi');
    assert.equal(made.state.meta.upgrades.luck, 1);
    assert.equal(made.state.meta.upgrades.exp, 0);
    assert.deepEqual((await svc.bootstrap(OWNER)).pavilion.relics, {}, 'Dấu ấn được cấp đúng một lần');
  });
}

for (const adapter of ['sqlite','postgres']) {
  test(`Thiên Mệnh Các trước khi nhập thế [${adapter}]: không mua Dấu ấn thì không có buff khởi đầu`, async t => {
    const { service: svc, close } = await fixture(adapter);
    t.after(close);
    const ticket = await svc.previewCreation(OWNER);
    assert.equal((await svc.bootstrap(OWNER)).pavilion.balance, 0);
    const made = await svc.createPlayer(OWNER, {
      ticketId: ticket.ticketId, name: 'Vô Dấu Ấn', gender: 'nam',
      talent: { canCot: 8 }, destiny: 'exp'
    });
    assert.equal(made.state.destiny, 'none');
    assert.equal(made.state.meta.upgrades.exp, 0);
  });
}

test('quầy Khởi Nguyên thu gọn ở màn tạo, mở bằng hộp thoại và server không tin dữ liệu giá/điểm client', () => {
  const read = pathName => fs.readFileSync(path.join(__dirname, '..',pathName),'utf8');
  const html=read('index.html'), boot=read('client/ui/boot.js'), css=read('css/creation.css'),
    data=read('data/character.js'), remote=read('client/session/remote-session.js'),
    service=read('server/services/player-service.js');
  assert.match(html, /id="creationShop"/);
  assert.match(html, /THIÊN MỆNH CÁC · QUẦY KHỞI NGUYÊN/);
  assert.doesNotMatch(html, /id="destinySelect"/, 'Dấu ấn Thiên Mệnh không còn chọn miễn phí ở màn tạo');
  assert.doesNotMatch(html, /Dấu ấn Thiên Mệnh miễn phí/);
  assert.doesNotMatch(boot, /destinySelect/);
  assert.match(html, /<button[^>]*id="creationShopOpen"[^>]*aria-haspopup="dialog"[^>]*aria-controls="creationShopDialog"/);
  assert.match(html, /id="creationShopSummary"/);
  assert.match(html, /<dialog[^>]*id="creationShopDialog"[^>]*aria-labelledby="creationShopTitle"/);
  assert.match(html, /id="creationShopClose"/);
  const dialogAt = html.indexOf('<dialog id="creationShopDialog"');
  const shopAt = html.indexOf('id="creationShop"');
  const dialogEnd = html.indexOf('</dialog>', dialogAt);
  assert.ok(dialogAt >= 0 && shopAt > dialogAt && shopAt < dialogEnd,
    '#creationShop phải nằm trong hộp thoại Thiên Mệnh Các');
  assert.match(boot, /\$\('creationShopOpen'\)\?\.addEventListener\('click'/);
  assert.match(boot, /if \(!shopDialog\.open\) shopDialog\.showModal\(\)/);
  assert.match(boot, /function closeCreationShop\(\)/);
  assert.match(boot, /function start\(\) \{\s*closeCreationShop\(\)/);
  assert.match(boot, /summary\.textContent = num\(balance\) \+ ' ✧'/);
  assert.match(boot, /item\.destiny/);
  assert.match(data, /const starterDestinyProduct = \(key, cost\)/);
  assert.match(data, /destinyExp:starterDestinyProduct\('exp',4\)/);
  assert.match(data, /const starterConflict=\(relics,key\)/);
  assert.match(service, /H\.PAVILION\.starterDestiny\(pavilion\.consumed\)/);
  assert.match(remote, /ticketId: this\.ticket\.ticketId, name: profile\.name, gender: profile\.gender, talent: profile\.talent/);
  assert.ok(css.includes('.creation-shop-trigger{') && /\.creation-shop-trigger\{[^}]*min-height:46px/.test(css),
    'Nút thu gọn phải đủ 46px để chạm');
  assert.match(css, /\.creation-shop-dialog \.creation-info-header>button\{width:44px;height:44px\}/);
  assert.match(boot, /UI\.session\.pavilionPurchase\('starter', key\)/);
  assert.match(boot, /H\.PAVILION\.starterTalentMax/);
  assert.match(service, /extraTalentPoints: pavilion\.consumed\?\.talentPoint \|\| 0/);
  assert.match(service, /onlyKeys\(body, \['ticketId', 'name', 'gender', 'talent', 'destiny'\]\)/);
  assert.match(css, /creation-shop-item button\{min-height:44px/);
});

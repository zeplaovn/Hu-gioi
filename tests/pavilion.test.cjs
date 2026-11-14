/* Thiên Mệnh Các: Thiên Tinh và nâng cấp thuộc về tài khoản, giữ qua mọi đạo thân. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');
const H = require('../engine/game.js');

const starter = Object.keys(H.PAVILION.starter)[0], stat = Object.keys(H.PAVILION.stats)[0];
let n = 0;
const buy = (t, kind, key, expectedVersion) => t.service.pavilionPurchase(t.owner, { kind, key, requestId: 'pav-' + String(++n).padStart(8, '0'), expectedVersion });

test('đổi Thiên Tinh lấy hành trang khởi nguyên khi chưa có nhân vật', async () => {
  const t = await setup();
  const out = await buy(t, 'starter', starter, 0);
  assert.ok(out.pavilion.relics[starter] >= 1);
});

test('sáu thuộc tính nâng tối đa cấp 20', () => {
  assert.equal(Object.keys(H.PAVILION.stats).length, 6);
  assert.equal(H.PAVILION.upgradeCost(20), null);
});

test('nâng cấp thuộc tính áp dụng cho nhân vật mới tạo', async () => {
  const t = await setup();
  const first = await buy(t, 'starter', starter, 0);
  const up = await buy(t, 'upgrade', stat, first.pavilion.version);
  assert.equal(up.pavilion.upgrades[stat], 1);
  await t.create();
  assert.equal((await t.state()).pavilion[stat], 1);
});

test('nhân vật chết hoặc bị xóa vẫn giữ Thiên Tinh và nâng cấp', async () => {
  const t = await setup();
  const first = await buy(t, 'starter', starter, 0);
  await buy(t, 'upgrade', stat, first.pavilion.version);
  const before = await t.repo.getPavilion(t.owner);
  await t.create();
  await t.patch(s => { s.death = { cause: 'lifespan', at: t.clock.now }; });
  const reset = await t.service.resetAfterDeath(t.owner, t.id);
  assert.equal(reset.pavilion.balance, before.balance);
  assert.equal(reset.pavilion.upgrades[stat], 1);
  await t.create('Lam Hai');
  assert.equal((await t.state()).pavilion[stat], 1, 'nhân vật kế tiếp nhận nâng cấp');
  await t.service.deleteCharacter(t.owner, t.id, { confirm: 'delete-character' });
  assert.equal((await t.repo.getPavilion(t.owner)).upgrades[stat], 1);
});

test('xóa dữ liệu tài khoản thì mất Thiên Tinh', async () => {
  const t = await setup();
  const first = await buy(t, 'starter', starter, 0);
  await buy(t, 'upgrade', stat, first.pavilion.version);
  await t.create();
  await t.service.eraseData(t.owner, { confirm: 'delete-my-game-data' });
  const after = await t.repo.getPavilion(t.owner);
  assert.ok(!after || !after.upgrades?.[stat]);
});

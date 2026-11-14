/* Vòng đời: tạo → chơi → chết/xóa → tạo lại → xóa dữ liệu → xóa tài khoản. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup, C } = require('./helpers/play.js');

test('tài khoản mới chưa có nhân vật', async () => {
  const t = await setup();
  assert.equal((await t.service.bootstrap(t.owner)).player, null);
});

test('chết thì mọi lệnh bị từ chối, chỉ bắt đầu lại được', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.service.resetAfterDeath(t.owner, t.id), { code: 'GAME_RULE_VIOLATION' }, 'còn sống thì không reset');
  await t.patch(s => { s.death = { cause: 'lifespan', at: t.clock.now }; });
  await assert.rejects(t.cmd('strike'), { code: 'PLAYER_DEAD' });
  await t.service.resetAfterDeath(t.owner, t.id);
  assert.equal((await t.service.bootstrap(t.owner)).player, null);
});

test('xóa nhân vật rồi tạo lại ra nhân vật hoàn toàn mới', async () => {
  const t = await setup(); await t.create();
  const oldId = t.id;
  await assert.rejects(t.service.deleteCharacter(t.owner, oldId, { confirm: 'sai' }));
  await t.service.deleteCharacter(t.owner, oldId, { confirm: 'delete-character' });
  await assert.rejects(t.service.sync(t.owner, oldId), { code: 'PLAYER_NOT_FOUND' });
  await t.create('Lam Hai');
  assert.notEqual(t.id, oldId);
  assert.equal((await t.state()).name, 'Lam Hai');
  assert.equal((await t.state()).realm, 0);
});

test('xuất dữ liệu cá nhân rồi xóa dữ liệu game', async () => {
  const t = await setup(); await t.create();
  const data = await t.service.exportData(t.owner);
  assert.ok(data.player);
  assert.ok(!JSON.stringify(data).includes('rngSeed'), 'không lộ hạt giống ngẫu nhiên');
  await assert.rejects(t.service.eraseData(t.owner, { confirm: 'sai' }));
  await t.service.eraseData(t.owner, { confirm: 'delete-my-game-data' });
  assert.equal((await t.service.bootstrap(t.owner)).player, null);
});

test('xóa tài khoản xóa dữ liệu game rồi gọi xóa người dùng đăng nhập đúng một lần', async () => {
  const t = await setup(); await t.create();
  let deleted = 0;
  await assert.rejects(t.service.deleteAccount(t.owner, { confirm: 'sai' }, { deleteUser: async () => { deleted++; } }));
  await t.service.deleteAccount(t.owner, { confirm: 'delete-my-account' }, { deleteUser: async () => { deleted++; } });
  assert.equal(deleted, 1);
  assert.equal((await t.service.bootstrap(t.owner)).player, null);
  await t.create('Từ Đầu'); // tạo lại từ đầu vẫn được
  assert.equal((await t.state()).name, 'Từ Đầu');
});

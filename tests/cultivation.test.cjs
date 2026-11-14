/* Tu luyện: hấp thu, tu vi theo thời gian online, đột phá, bế quan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');

test('online thì tu vi tăng theo thời gian', async () => {
  const t = await setup(); await t.create();
  await t.tick(30);
  assert.ok((await t.state()).qi > 0);
});

test('offline không tích lũy tu vi', async () => {
  const t = await setup(); await t.create();
  await t.tick(20); const before = (await t.state()).qi;
  await t.tick(3 * 3600); // vắng 3 giờ rồi quay lại
  assert.ok((await t.state()).qi - before < 5, 'không cộng ba giờ offline');
});

test('hấp thu linh thạch tăng tu vi và trừ linh thạch', async () => {
  const t = await setup(); await t.create();
  const before = await t.state();
  await t.cmd('absorb', { index: 0 });
  const after = await t.state();
  assert.ok(after.qi > before.qi);
  assert.ok(after.stone < before.stone);
});

test('chưa đủ tu vi thì không đột phá được', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('breakthrough'), { code: 'GAME_RULE_VIOLATION' });
});

test('bế quan bắt đầu rồi dừng được', async () => {
  const t = await setup(); await t.create();
  await t.patch(s => { s.progress.meditate = 60; });
  await t.cmd('startRetreat', { duration: 1800 });
  assert.ok((await t.state()).retreat);
  await t.cmd('stopRetreat');
});

test('bật tự động và đổi cài đặt hiệu ứng', async () => {
  const t = await setup(); await t.create();
  await t.cmd('setAuto', { enabled: true });
  await t.cmd('setPreference', { key: 'cultivationEffects', value: false });
  const s = await t.state();
  assert.equal(s.auto, true);
  assert.equal(s.settings.cultivationEffects, false);
});

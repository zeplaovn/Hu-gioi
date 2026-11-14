/* Hành trang: mua, bán, trang bị, lĩnh ngộ công pháp, dùng đan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');

test('mua vật phẩm trừ linh thạch và thêm vào túi', async () => {
  const t = await setup(); await t.create();
  const before = await t.state();
  await t.cmd('buy', { code: 'EQ-001' });
  const after = await t.state();
  assert.ok(after.stone < before.stone);
  assert.equal(after.bag['EQ-001'], (before.bag['EQ-001'] || 0) + 1);
});

test('bán vật phẩm được linh thạch, hết hàng thì không bán được', async () => {
  const t = await setup(); await t.create();
  const before = await t.state();
  await t.cmd('sell', { code: 'HERB-001' });
  assert.ok((await t.state()).stone > before.stone);
  await assert.rejects(t.cmd('sell', { code: 'EQ-099' }));
});

test('trang bị rồi tháo pháp bảo (cùng một lệnh)', async () => {
  const t = await setup(); await t.create();
  await t.cmd('equip', { code: 'EQ-001' });
  assert.deepEqual((await t.state()).equipment, ['EQ-001']);
  await t.cmd('equip', { code: 'EQ-001' });
  assert.deepEqual((await t.state()).equipment, []);
});

test('lĩnh ngộ bí tịch thành công pháp đã học và đang vận', async () => {
  const t = await setup(); await t.create();
  await t.cmd('learn', { code: 'BT-001' });
  const s = await t.state();
  assert.ok('BT-001' in s.learned);
  assert.ok(s.activeManuals.includes('BT-001'));
  await t.cmd('activate', { code: 'BT-001' }); // bấm lần nữa để dừng vận hành
  assert.ok(!(await t.state()).activeManuals.includes('BT-001'));
});

test('dùng đan dược tiêu hao một viên', async () => {
  const t = await setup(); await t.create();
  const before = (await t.state()).bag['PILL-001'];
  await t.cmd('use', { code: 'PILL-001' });
  assert.equal((await t.state()).bag['PILL-001'], before - 1);
});

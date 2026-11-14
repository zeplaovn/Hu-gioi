/* Bảo mật lệnh: chủ sở hữu, revision, requestId, dữ liệu do client gửi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup, C } = require('./helpers/play.js');

const envelope = (t, o) => ({ protocolVersion: C.VERSION, requestId: 'req-sec-0001', expectedRevision: t.rev, type: 'setAuto', payload: { enabled: true }, ...o });

test('người khác không điều khiển được nhân vật của bạn', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.service.command('owner-2', t.id, envelope(t)), { code: 'PLAYER_NOT_FOUND' });
});

test('sai revision bị từ chối để buộc đồng bộ lại', async () => {
  const t = await setup(); await t.create(); await t.tick(5);
  await assert.rejects(t.service.command(t.owner, t.id, envelope(t, { expectedRevision: t.rev - 1 })), { code: 'REVISION_CONFLICT' });
});

test('gửi lại cùng requestId trả kết quả cũ, không áp dụng hai lần', async () => {
  const t = await setup(); await t.create();
  const body = envelope(t);
  const first = await t.service.command(t.owner, t.id, body);
  const again = await t.service.command(t.owner, t.id, body);
  assert.equal(again.replayed, true);
  assert.equal(again.revision, first.revision);
});

test('requestId đã dùng cho lệnh khác bị từ chối', async () => {
  const t = await setup(); await t.create();
  await t.service.command(t.owner, t.id, envelope(t));
  await assert.rejects(t.service.command(t.owner, t.id, envelope(t, { payload: { enabled: false }, expectedRevision: t.rev + 1 })));
});

test('payload thừa trường (giá, thưởng do client tự gửi) bị từ chối', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('buy', { code: 'EQ-001', price: 0 }));
  await assert.rejects(t.cmd('absorb', { index: 0, bonus: 9999 }));
});

test('phiên bản giao thức sai bị từ chối', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.service.command(t.owner, t.id, envelope(t, { protocolVersion: 0 })));
});

/* Chế tạo: luyện đan cần sách nghề, rèn pháp bảo cần Kết Đan, linh điền cần hạt giống. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');

test('luyện đan chưa mượn sách nghề thì bị từ chối', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('craft', { code: 'PILL-001' }), /sách nghề/);
});

test('rèn pháp bảo chưa tới Kết Đan thì bị từ chối', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('forge', { code: 'EQ-001' }), /Kết Đan/);
});

test('linh điền trống thì không tưới được', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('garden', { slot: 0, action: 'water' }), /trống/);
});

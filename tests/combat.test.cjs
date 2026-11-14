/* Chiến đấu và bản đồ: đánh quái, đổi vùng, bí cảnh. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');
const H = require('../engine/game.js');

test('ra đòn đánh quái được', async () => {
  const t = await setup(); await t.create();
  await t.cmd('strike');
  assert.ok((await t.state()).enemyHp >= 0);
});

test('đổi sang vùng cao hơn khi chưa đủ cảnh giới bị từ chối', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('travel', { zone: 1 }), /Cảnh giới chưa đủ/);
});

test('bí cảnh chưa mở thì không vào được', async () => {
  const t = await setup(); await t.create();
  const high = H.DUNGEONS.find(d => d.realm > 0);
  await assert.rejects(t.cmd('startDungeon', { id: high.id }), /chưa mở/);
});

test('lệnh không có trong danh sách bị từ chối', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('hackGold', { amount: 999 }));
});

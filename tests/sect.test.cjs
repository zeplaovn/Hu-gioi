/* Tông môn: gia nhập, ủy thác, rời tông. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');
const H = require('../engine/game.js');

test('gia nhập tông môn rồi rời tông', async () => {
  const t = await setup(); await t.create();
  const id = H.SECTS[0].id;
  await t.cmd('joinSect', { id });
  assert.equal((await t.state()).sect.joined, true);
  assert.equal((await t.state()).sect.id, id);
  await t.cmd('leaveSect');
  assert.equal((await t.state()).sect.joined, false);
});

test('tông môn không tồn tại bị từ chối', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('joinSect', { id: 'khong-co' }), /không hợp lệ/);
});

test('chưa vào tông thì không nhận ủy thác', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('startSectMission', { id: H.SECT_MISSIONS[0].id }));
});

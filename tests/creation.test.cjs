/* Tạo nhân vật: phiếu khởi nguyên, tên, thiên phú. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');

test('tạo nhân vật hợp lệ: bắt đầu ở Luyện Khí tầng 1 với hành trang khởi đầu', async () => {
  const t = await setup(), made = await t.create('Vân Lam');
  assert.equal(made.state.name, 'Vân Lam');
  assert.equal(made.state.realm, 0);
  assert.equal(made.state.stage, 1);
  assert.ok(made.state.stone > 0 && Object.keys(made.state.bag).length > 0);
});

test('mở lại màn tạo dùng lại phiếu cũ, không tốn thêm lượt gieo', async () => {
  const t = await setup(), a = await t.service.previewCreation(t.owner), b = await t.service.previewCreation(t.owner);
  assert.equal(a.ticketId, b.ticketId);
  assert.equal(b.reused, true);
});

test('từ chối phiếu giả, tên rỗng, thiếu điểm thiên phú và phiếu đã dùng', async () => {
  const t = await setup(), ticket = await t.service.previewCreation(t.owner);
  const create = body => t.service.createPlayer(t.owner, { gender: 'nam', talent: { ngoTinh: 8 }, ...body });
  await assert.rejects(create({ ticketId: 'fake', name: 'Vân Lam' }));
  await assert.rejects(create({ ticketId: ticket.ticketId, name: '' }));
  await assert.rejects(create({ ticketId: ticket.ticketId, name: 'Vân Lam', talent: { ngoTinh: 3 } }), /8 điểm/);
  await create({ ticketId: ticket.ticketId, name: 'Lam Một' });
  await assert.rejects(create({ ticketId: ticket.ticketId, name: 'Lam Hai' }));
});

test('đã có nhân vật thì không xin phiếu mới', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.service.previewCreation(t.owner), { code: 'PLAYER_EXISTS' });
});

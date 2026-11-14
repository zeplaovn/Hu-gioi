/* Nhiệm vụ: hằng ngày, hành trình, điểm danh, hộp thư. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/play.js');

test('mỗi ngày có danh sách nhiệm vụ do máy chủ chọn', async () => {
  const t = await setup(); await t.create();
  const out = await t.daily.daily(t.owner);
  assert.ok(out.daily.quests.length > 0);
  assert.ok(out.daily.quests.every(q => q.name && q.target > 0 && !q.claimed));
});

test('nhiệm vụ chưa đủ tiến độ thì không nhận thưởng được', async () => {
  const t = await setup(); await t.create();
  const quest = (await t.daily.daily(t.owner)).daily.quests[0];
  await assert.rejects(t.daily.claimQuest(t.owner, { requestId: 'daily-claim-01', questId: quest.id }));
});

test('làm đủ tiến độ rồi nhận thưởng đúng một lần', async () => {
  const t = await setup(); await t.create();
  const quest = (await t.daily.daily(t.owner)).daily.quests[0];
  await t.patch(s => { for (const k of Object.keys(s.progress)) s.progress[k] += 9999; });
  const before = (await t.state()).stone;
  await t.daily.claimQuest(t.owner, { requestId: 'daily-claim-02', questId: quest.id });
  assert.ok((await t.state()).stone >= before);
  const view = (await t.daily.daily(t.owner)).daily.quests.find(q => q.id === quest.id);
  assert.equal(view.claimed, true);
  await assert.rejects(t.daily.claimQuest(t.owner, { requestId: 'daily-claim-03', questId: quest.id }));
});

test('nhiệm vụ hành trình: chưa đủ tiến độ thì không nhận', async () => {
  const t = await setup(); await t.create();
  await assert.rejects(t.cmd('claimQuest', { id: 'kill' }));
});

test('điểm danh được một lần mỗi ngày', async () => {
  const t = await setup(); await t.create();
  const first = await t.daily.checkIn(t.owner, { requestId: 'checkin-0001' });
  assert.equal(first.daily.checkin.checkedToday, true);
  assert.equal(first.daily.checkin.streak, 1);
  const again = await t.daily.checkIn(t.owner, { requestId: 'checkin-0002' }).catch(() => null);
  assert.ok(!again || again.daily.checkin.streak === 1, 'điểm danh lần hai không tăng chuỗi');
});

test('hộp thư có thư chào mừng', async () => {
  const t = await setup(); await t.create();
  const mail = await t.daily.mail(t.owner);
  assert.ok(mail.mail.items.length > 0);
  assert.ok(mail.mail.items[0].title);
});

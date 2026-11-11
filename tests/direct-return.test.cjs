'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../client/ui/boot.js'), 'utf8');

const start = source.indexOf('  async function showForAccount(account) {');
const end = source.indexOf('  async function leaveAccount()', start);
const snippet = source.slice(start, end);
if (start < 0 || end <= start) throw Error('Không tìm thấy luồng khởi động tài khoản');

function harness(saved) {
  const events = [];
  const elements = Object.fromEntries(['accountLabel', 'accountExit', 'continueGame', 'welcomeRebirth', 'welcome', 'game']
    .map(id => [id, { hidden: true, textContent: '', title: '' }]));
  const account = { id: 'verified', email: 'dao@example.invalid' };
  const UI = {
    session: { ticket: { preview: { gender: 'nu' } }, pavilion: { rebirths: 3 } }
  };
  const store = {
    async setAccount(id, verified) { events.push('verified:' + (id === verified.id)); },
    load() { events.push('load'); return saved; }
  };
  const script = '(() => { let creation = null; ' + snippet +
    'return { enter: showForAccount, creation: () => creation }; })()';
  const run = vm.runInNewContext(script, {
    store, UI, F: { REALMS: ['Luyện Khí'] }, $: id => elements[id],
    freshCreation: () => ({ name: 'Khởi nguyên' }),
    start: () => { events.push('start'); elements.game.hidden = false; elements.welcome.hidden = true; },
    renderCreation: () => events.push('renderCreation')
  });
  return { ...run, events, elements, account };
}

test('nhân vật cũ đã xác minh vào thẳng game, không xuất hiện màn tạo nhân vật', async () => {
  const h = harness({ created: true, id: 'existing', name: 'Đạo Hữu', realm: 0 });
  await h.enter(h.account);
  assert.deepEqual(h.events, ['verified:true', 'load', 'start']);
  assert.equal(h.elements.game.hidden, false);
  assert.equal(h.elements.welcome.hidden, true);
});

test('chỉ tài khoản chưa có nhân vật mới mở màn tạo nhân vật', async () => {
  const h = harness(null);
  await h.enter(h.account);
  assert.deepEqual(h.events, ['verified:true', 'load', 'renderCreation']);
  assert.equal(h.elements.welcome.hidden, false);
  assert.equal(h.elements.continueGame.hidden, true);
  assert.match(h.elements.welcomeRebirth.textContent, /Khai mở|Khởi đầu mới|chọn Thiên mệnh/);
});

test('không khôi phục game nếu chưa xác minh tài khoản', async () => {
  const h = harness({ created: true });
  await assert.rejects(h.enter(null), /đăng nhập/);
  assert.equal(h.events.length, 0);
});

test('luồng đăng nhập chỉ vào game sau kiểm tra đồng ý, focus sân khấu với nhân vật cũ', () => {
  const auth = fs.readFileSync(path.join(__dirname, '../client/auth/auth.js'), 'utf8');
  assert.ok(auth.indexOf('const consent = await SB.accepted()') < auth.indexOf('if (consent.has('));
  assert.match(auth, /if \(!\$\('welcome'\)\.hidden\) \$\('nameInput'\)\?\.focus/);
  assert.match(auth, /else if \(!\$\('game'\)\.hidden\) \$\('stage'\)\?\.focus/);
});

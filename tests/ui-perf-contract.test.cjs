'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const read = file => readFileSync(join(__dirname, '..', file), 'utf8');

test('bơm nhật ký chỉ hẹn giờ khi có dữ liệu và hoạt động lại sau khi tab hiện', () => {
  const shell = read('client/ui/shell.js');
  assert.doesNotMatch(shell, /setInterval\(pumpLog\s*,\s*24\)/);
  assert.match(shell, /addEventListener\('visibilitychange', scheduleLogPump\)/);
  const from = shell.indexOf('  function scheduleLogPump()');
  const to = shell.indexOf('  function queueLog(', from);
  assert.ok(from > 0 && to > from, 'Không tìm thấy bộ lập lịch nhật ký.');
  const callbacks = [];
  const state = { live: true, timer: 0, current: null, queue: [] };
  const doc = { hidden: false };
  let pumped = 0;
  const schedule = runInNewContext(shell.slice(from, to) + '\nscheduleLogPump', {
    logState: state, document: doc,
    root: { setTimeout(fn, ms) { assert.equal(ms, 24); callbacks.push(fn); return callbacks.length; } },
    pumpLog() { pumped++; state.queue.shift(); }
  });
  schedule();
  assert.equal(callbacks.length, 0, 'Không được đặt timer khi hàng đợi rỗng.');
  state.queue.push('tin mới');
  doc.hidden = true;
  schedule();
  assert.equal(callbacks.length, 0, 'Không đặt timer ở tab ẩn.');
  doc.hidden = false;
  schedule();
  schedule();
  assert.equal(callbacks.length, 1, 'Chỉ một timer cho hàng đợi đang chạy.');
  callbacks.shift()();
  assert.equal(pumped, 1);
  assert.equal(callbacks.length, 0, 'Không tái lập timer khi đã hết log.');
});

test('HUD dùng MediaQueryList đơn, cache nút thông báo và không đổi game state', () => {
  const source = read('client/ui/idle-hud.js');
  assert.match(source, /const motionQuery = typeof root\.matchMedia/);
  assert.match(source, /const dotButtons = new Map\(\)/);
  assert.match(source, /textIfChanged\(/);
  assert.doesNotMatch(source, /state\.s\s*=|UI\.s\(\)\s*=/);
});

test('index.html vẫn khai báo style nguồn, bản build CSS xác thực SHA-256', () => {
  const source = read('index.html');
  const links = [...source.matchAll(/<link rel="stylesheet" href="css\/[^"]+\.css">/g)];
  assert.equal(links.length, 17);
  const build = read('tools/build-dist.cjs');
  const verify = read('tools/check-css-bundle.cjs');
  assert.match(build, /createHash\('sha256'\)/);
  assert.match(build, /esbuild\.transformSync\(source/);
  assert.match(verify, /createHash\('sha256'\)/);
  assert.match(read('_headers'), /\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});

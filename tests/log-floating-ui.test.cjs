'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('nhật ký có nút nổi, ghim và thu gọn hỗ trợ bàn phím', () => {
  const html = read('index.html'), shell = read('client/ui/shell.js');
  assert.match(html, /id="logFloatToggle"[^>]*aria-pressed="false"/);
  assert.match(html, /id="logToggle"[^>]*aria-expanded="true"/);
  assert.match(shell, /function setLogFloating\(/);
  assert.match(shell, /function bindFloatingLog\(/);
  assert.match(shell, /positionFloatingLog\(/);
  assert.match(shell, /setLogCollapsed\(!logState\.collapsed\)/);
  assert.match(shell, /logFloatState\.floating/);
});

test('khung nổi và icon chat không phụ thuộc atlas hoặc script ngoài', () => {
  const css = read('css/tienhiep.css');
  const svg = read('media/assets/ui/icon/chat/truyen-am.svg');
  assert.match(css, /#game #logPanel\.log-floating\{/);
  assert.match(css, /#game #logPanel\.log-floating\.collapsed\{/);
  assert.match(css, /#game\.page-open #logPanel\.log-floating\{visibility:visible\}/);
  assert.match(css, /body\.in-game\.log-floating\{--log-panel-h:0px\}/);
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.equal((svg.match(/<circle /g) || []).length, 3);
});

test('icon chat và chuông thông báo nhỏ gọn vẫn có vùng nhấn đủ lớn', () => {
  const css = read('css/tienhiep.css');
  const bell = read('media/assets/ui/icon/notifications/bell.svg');
  assert.match(css, /\.chat-bubble-btn\{width:44px;height:44px/);
  assert.match(css, /\.chat-bubble-icon\{width:22px;height:22px\}/);
  assert.match(css, /\.log-toggle::after\{[\s\S]*?bell\.svg/);
  assert.match(css, /logPanel\.log-floating\.collapsed\{\s*width:44px;height:44px/);
  assert.match(bell, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(bell, /viewBox="0 0 24 24"/);
  assert.match(bell, /<path/);
});

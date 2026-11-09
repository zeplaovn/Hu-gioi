'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('icon chat không bị mất khi đang mở cửa sổ', () => {
  const css=read('css/tienhiep.css');
  const chat=read('client/ui/screens/chat.js');
  assert.match(css,/\\.chat-bubble\\.open \\.chat-bubble-btn,[\\s\\S]*?visibility:hidden!important;opacity:0!important/);
  assert.match(css,/\.chat-bubble\{z-index:170\}/);
  assert.match(css,/\.chat-bubble-panel\{z-index:1/);
  assert.match(chat,/bubble\.btn\.setAttribute\('aria-expanded', String\(bubble\.open\)\)/);
  assert.match(chat,/bubble\\.btn\\.setAttribute\\('aria-hidden', 'true'\\)/);
});

test('gỡ lối vào menu Cài đặt nhưng giữ hệ thống cài đặt và lưu game', () => {
  const html=read('index.html'), shell=read('client/ui/shell.js');
  assert.doesNotMatch(html,/class="status-settings"/);
  assert.doesNotMatch(shell,/const WINDOW_ORDER = \[[^\]]*'settings'/);
  assert.doesNotMatch(shell, /s: 'settings'/);
  assert.match(html,/client\/ui\/screens\/settings\.js/);
  assert.match(shell,/const LOG_MAX = 60/);
});

test('màu dịu, giữ tương phản chữ và không phủ bộ lọc lên sprite', () => {
  const css=read('css/tienhiep.css');
  assert.match(css,/--bg:#191816;--panel:#24221f/);
  assert.match(css,/--text:#e5dfd5;--muted:#bdb2a2/);
  assert.match(css,/--paper-grain:linear-gradient/);
  assert.doesNotMatch(css,/filter:\s*grayscale\(/);
});

test('chỉ hiện icon khi cửa sổ tương ứng được thu gọn', () => {
  const css = read('css/tienhiep.css'), chat = read('client/ui/screens/chat.js');
  assert.match(css,/chat-bubble\.open \.chat-bubble-btn/);
  assert.match(css,/logPanel\.log-floating:not\(\.collapsed\) \.log-toggle::after/);
  assert.match(chat,/bubble\.btn\.tabIndex = bubble\.open \? -1 : 0/);
  assert.match(chat,/bubble\.btn\.removeAttribute\('aria-hidden'\)/);
});

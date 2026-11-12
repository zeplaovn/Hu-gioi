'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('launcher chat mở trang riêng và không nhân bản form', () => {
  const chat=read('client/ui/screens/chat.js');
  const shell=read('client/ui/shell.js');
  const css=read('css/shell.css');
  assert.match(chat, /UI\.windows/);
  assert.match(chat, /UI\.go\('chat'\)/);
  assert.match(shell, /el\.className = 'win page desktop-window'/);
  assert.match(chat, /chat-channels/);
  assert.match(shell, /'chat', 'ranking'/);
  assert.match(css, /\.win-controls/);
  assert.match(css, /\.window-taskbar/);
});

test('Cài đặt chỉ vào qua nút ⚙ ở thanh trạng thái (không có mục menu, không phím tắt S); giữ hệ thống lưu game', () => {
  const html=read('index.html'), shell=read('client/ui/shell.js');
  assert.match(html,/class="status-settings" data-window="settings"/);
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

test('thu nhỏ giữ nội dung cửa sổ trên thanh tác vụ và có thể khôi phục', () => {
  const shell=read('client/ui/shell.js'), css=read('css/shell.css');
  assert.match(shell,/minimize\(id\)/);
  assert.match(shell,/restore\(id\)/);
  assert.match(shell,/maximize\(id\)/);
  assert.match(shell,/data-task-window/);
  assert.match(css,/window-task\.minimized/);
});

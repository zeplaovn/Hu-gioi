'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('đạo thân và vòng tụ linh cùng dịch xuống trùng tâm bát quái', () => {
  const css = read('css/player-pack.css');
  assert.match(css, /--cultivation-altar-x:\s*50%/);
  assert.match(css, /--cultivation-altar-y:\s*72%/);
  assert.match(css, /#game\[data-stage="idle"\] #stage #heroActor\s*\{[^}]*top:\s*var\(--cultivation-altar-y\)/);
  assert.match(css, /#game\[data-stage="idle"\] #stage \.idle-aura\s*\{[^}]*top:\s*calc\(var\(--cultivation-altar-y\) \+ 2%\)/);
  assert.match(css, /@media \(orientation: portrait\), \(orientation: landscape\)/);
});

test('nút chat nổi sử dụng biểu tượng SVG vector mới', () => {
  const icon = read('media/assets/ui/icon/chat/truyen-am.svg');
  const chat = read('client/ui/screens/chat.js');
  const css = read('css/chat.css');
  assert.match(icon, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(icon, /viewBox="0 0 64 64"/);
  assert.match(chat, /class="chat-bubble-icon" src="media\/assets\/ui\/icon\/chat\/truyen-am\.svg"/);
  assert.doesNotMatch(chat, /<span aria-hidden="true">✉<\/span>/);
  assert.match(css, /\.chat-bubble-icon\{/);
  assert.match(css, /\.chat-bubble-btn:focus-visible\{/);
});

test('menu Thêm không còn Chat, các chức năng giao du vẫn còn', () => {
  const html = read('index.html');
  const shell = read('client/ui/shell.js');
  assert.doesNotMatch(html, /data-more-go="chat"/);
  for (const go of ['more:friends', 'more:dao', 'world:sect', 'more:pvp', 'more:ranking']) {
    assert.ok(html.includes('data-more-go="' + go + '"'), go);
  }
  assert.match(shell, /const on = wins\.has\('more'\);/);
});

test('chat nổi giữ mở/đóng, báo tin và tự hiển thị khi vào game', () => {
  const chat = read('client/ui/screens/chat.js');
  assert.match(chat, /aria-controls="chatBubblePanel"/);
  assert.match(chat, /chat-bubble-badge/);
  assert.match(chat, /bubble\.btn\.addEventListener\('click',/);
  assert.match(chat, /bubble\.unread = Math\.max\(0, n - bubble\.seen\)/);
  assert.match(chat, /UI\.chatBubble = \{ open:/);
  assert.match(chat, /if \(show\) bubbleBuild\(\)/);
});

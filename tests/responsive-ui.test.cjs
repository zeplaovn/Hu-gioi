'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const read = file => readFileSync(join(__dirname, '..', file), 'utf8');
const shell = read('client/ui/shell.js');

function extract(start, end) {
  const from = shell.indexOf(start), to = shell.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Không tìm thấy mã giao diện cần kiểm thử.');
  return shell.slice(from, to);
}

test('chọn bố cục theo chiều màn hình, kể cả tablet ngang và điện thoại xoay ngang', () => {
  const root = { innerWidth: 0, innerHeight: 0 };
  const pick = runInNewContext(extract('  function pickLayout()', '  /* Chỉ cuộn thanh điều hướng') + '\npickLayout', {
    root, document: { documentElement: {} }
  });
  for (const [width, height, expected] of [
    [320, 568, 'portrait'], [390, 844, 'portrait'], [768, 1024, 'portrait'],
    [844, 390, 'wide'], [1024, 768, 'wide'], [1366, 768, 'wide'],
    [800, 700, 'landscape'], [1024, 1000, 'landscape']
  ]) {
    root.innerWidth = width;
    root.innerHeight = height;
    assert.equal(pick(), expected, `${width}×${height}`);
  }
});

test('đưa mục đang chọn vào vùng nhìn thấy mà không cuộn trang nội dung', () => {
  const reveal = runInNewContext(extract('  function revealHorizontalItem(', '\n  function applyLayout()') + '\nrevealHorizontalItem');
  const bar = { scrollLeft: 0, clientWidth: 200, getBoundingClientRect: () => ({ left: 0, right: 200 }) };
  reveal(bar, { getBoundingClientRect: () => ({ left: 280, right: 360, width: 80 }) });
  assert.equal(bar.scrollLeft, 220);
  reveal(bar, { getBoundingClientRect: () => ({ left: 20, right: 100, width: 80 }) });
  assert.equal(bar.scrollLeft, 220, 'không cuộn lại khi mục đã nằm trong thanh');
  assert.match(shell, /if \(oldTab === tab\) tabbar\.scrollLeft = oldTabScroll/);
  assert.match(shell, /revealHorizontalItem\(el\.querySelector\('\.page-nav'\)/);
});

test('bàn phím ảo chỉ thu tạm khung chat và khôi phục vị trí đã lưu', () => {
  const method = extract('    fitChatToVisualViewport() {', '\n    relayout() {').trim().replace(/,\s*$/, '');
  const input = { matches: selector => selector === 'input, textarea' };
  const classes = new Set();
  const el = {
    contains: target => target === input,
    classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } }
  };
  const original = { x: 30, y: 400, w: 350, h: 500 };
  const win = { el, rect: { ...original } };
  const root = { innerHeight: 844, visualViewport: { width: 390, height: 300, offsetLeft: 0, offsetTop: 100, scale: 1 } };
  const document = { activeElement: input };
  const manager = runInNewContext('({' + method + '})', { root, document });
  manager.map = new Map([['chat', win]]);
  const applied = [];
  manager.setRect = (_, rect) => applied.push({ ...rect });

  manager.fitChatToVisualViewport();
  assert.deepEqual(applied.at(-1), { x: 30, y: 108, w: 350, h: 284 });
  assert.deepEqual(win.rect, original, 'không thay đổi vị trí và kích thước đã lưu');
  assert.ok(classes.has('keyboard-open'));

  document.activeElement = null;
  manager.fitChatToVisualViewport();
  assert.deepEqual(applied.at(-1), original);
  assert.equal(win.visualRect, false);
  assert.ok(!classes.has('keyboard-open'));

  document.activeElement = input;
  root.visualViewport.scale = 2;
  const count = applied.length;
  manager.fitChatToVisualViewport();
  assert.equal(applied.length, count, 'không coi thao tác phóng to là bàn phím ảo');
});

test('bố cục dùng vùng chạm, vùng an toàn và kích thước thực của cửa sổ chat', () => {
  const css = read('css/tienhiep.css');
  assert.match(css, /\.page-nav button span\[aria-hidden="true"\]\{display:inline\}/);
  assert.match(css, /\.page-nav button span\{display:inline\}/);
  assert.match(css, /\.page-nav button,\.win\.page \.page-back\{min-height:44px\}/);
  assert.match(css, /#menu \.menu-toggle\{position:sticky/);
  assert.match(css, /env\(safe-area-inset-bottom,0px\)/);
  assert.match(css, /container:chat-window \/ size/);
  assert.match(css, /@container chat-window \(max-width:420px\)/);
  assert.match(css, /@container chat-window \(max-height:420px\)/);
  assert.match(css, /@media\(max-height:520px\) and \(orientation:landscape\)/);
  assert.match(css, /\.page-nav button span:not\(\[aria-hidden="true"\]\)\{display:none\}/);
  assert.match(css, /\.auth-gate\{padding:max\(clamp\(14px,4vw,40px\),env\(safe-area-inset-top,0px\)\)/);
  assert.match(shell, /visualViewport\.addEventListener\('resize'/);
  assert.match(shell, /id === 'chat' && layout === 'portrait' && W < 600/);
});

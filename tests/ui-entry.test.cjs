/* Bản xem trước không được mở phiên hay cho bắt đầu khi engine chưa sẵn sàng. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, '../client/main.js'), 'utf8');

function runEntry({ ready, preview = true }) {
  const elements = {
    loading: { hidden: false },
    engineNotice: { hidden: true, textContent: '' },
    welcomeRebirth: { textContent: 'Kiếp thứ 1' },
    startNew: { disabled: false },
    footnote: { hidden: false }
  };
  const controls = [{ disabled: false }, { disabled: false }];
  const calls = { boot: 0, preview: 0 };
  const ui = { boot: () => calls.boot++ };
  if (preview) ui.bootPreview = () => calls.preview++;
  const document = {
    getElementById: id => elements[id] || null,
    querySelector: selector => selector === '#createForm .foot-note' ? elements.footnote : null,
    querySelectorAll: () => controls
  };
  runInNewContext(source, {
    window: { HU_UI: ui, HU_GAME: { READY: ready, MISSING: ready ? [] : ['state'] } },
    document,
    console: { warn() {}, error() {} }
  });
  return { elements, controls, calls };
}

test('engine chưa sẵn sàng: chỉ khởi tạo bản xem trước', () => {
  const { elements, calls } = runEntry({ ready: false });
  assert.deepEqual(calls, { boot: 0, preview: 1 });
  assert.equal(elements.loading.hidden, true);
  assert.equal(elements.engineNotice.hidden, false);
  assert.equal(elements.startNew.disabled, true);
  assert.equal(elements.footnote.hidden, true);
  assert.match(elements.welcomeRebirth.textContent, /chưa lưu/);
});

test('thiếu lớp xem trước: vô hiệu hóa các điều khiển tạo nhân vật', () => {
  const { elements, controls, calls } = runEntry({ ready: false, preview: false });
  assert.deepEqual(calls, { boot: 0, preview: 0 });
  assert.ok(controls.every(control => control.disabled));
  assert.match(elements.engineNotice.textContent, /chưa sẵn sàng/);
});

test('engine sẵn sàng: khởi động game bình thường', () => {
  const { elements, calls } = runEntry({ ready: true });
  assert.deepEqual(calls, { boot: 1, preview: 0 });
  assert.equal(elements.engineNotice.hidden, true);
  assert.equal(elements.startNew.disabled, false);
  assert.equal(elements.footnote.hidden, false);
});

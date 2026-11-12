'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const source = readFileSync(join(__dirname, '../client/ui/onboarding.js'), 'utf8');

function setup(reduced = false) {
  let now = 0, nextTimer = 0;
  const timers = new Map(), nodes = new Map(), listeners = new Map();
  const setTimer = (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; };
  function advance(ms) {
    const end = now + ms;
    while (true) {
      let next = null;
      for (const [id, timer] of timers) if (timer.at <= end && (!next || timer.at < next.timer.at)) next = { id, timer };
      if (!next) break;
      now = next.timer.at; timers.delete(next.id); next.timer.fn();
    }
    now = end;
  }
  const classes = () => ({ add() {}, remove() {}, toggle() {} });
  function element(id = '') {
    return {
      id, textContent: '', dataset: {}, classList: classes(), animations: [], events: {},
      setAttribute() {}, focus() {}, remove() { nodes.delete(this.id); },
      addEventListener(type, fn) { this.events[type] = fn; },
      getAnimations() { return this.animations.filter(animation => !animation.cancelled); },
      animate(frames, options) {
        const animation = { frames, options, cancelled: false, paused: false,
          cancel() { this.cancelled = true; }, pause() { this.paused = true; }, play() { this.paused = false; } };
        this.animations.push(animation); return animation;
      },
      querySelectorAll(selector) { return selector === '.intro-image' ? this.images : []; },
      set innerHTML(html) {
        for (const match of html.matchAll(/id="([^"]+)"/g)) nodes.set(match[1], element(match[1]));
        if (this.id === 'storyIntro') this.images = [element(), element()];
      }
    };
  }
  nodes.set('welcome', { inert: false });
  const document = {
    hidden: false,
    body: { classList: classes(), append(node) { nodes.set(node.id, node); } },
    createElement: () => element(),
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); }
  };
  const ui = { kit: { $: id => nodes.get(id) }, action() {}, isReduced: () => reduced };
  const env = { HU_UI: ui, HU_ASSETS: { INTRO: [1, 2, 3, 4, 5] }, document,
    performance: { now: () => now }, setTimeout: setTimer, clearTimeout: id => timers.delete(id) };
  env.window = env;
  vm.runInNewContext(source, env);
  return { ui, document, nodes, listeners, advance, timers };
}

test('intro hiện chữ lần lượt, tự chuyển cảnh sau khi chữ đi lên, không nhận lệnh bỏ qua', async () => {
  const { ui, nodes, advance } = setup();
  let finished = false;
  const done = ui.intro.play().then(() => { finished = true; });
  const intro = nodes.get('storyIntro'), visible = nodes.get('introVisible'), pending = nodes.get('introPending');
  const text = pending.textContent, narration = nodes.get('introNarration').textContent;
  assert.equal(visible.textContent, '');
  assert.ok(text.length > 0);
  advance(350);
  assert.ok(visible.textContent.length > 0 && pending.textContent.length > 0);
  assert.equal(visible.textContent + pending.textContent, text);
  assert.equal(nodes.get('introNarration').textContent, narration, 'trình đọc màn hình không đọc lại từng chữ');
  for (const type of ['click', 'keydown']) intro.events[type]?.({ key: 'Escape', code: 'Space', preventDefault() {}, stopPropagation() {} });
  assert.equal(nodes.get('introTitle').textContent, 'Nhân gian');
  assert.equal(finished, false);

  const graphemes = [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(text)].length;
  const reading = Math.max(1800, text.split(/\s+/).length * 60);
  advance(graphemes * 35 - 350 + reading);
  assert.equal(visible.textContent, text);
  const scroll = nodes.get('introCaption').getAnimations()[0];
  assert.equal(scroll.frames[1].transform, 'translateY(-24vh)');
  advance(2399);
  assert.equal(nodes.get('introTitle').textContent, 'Nhân gian');
  advance(1);
  assert.equal(nodes.get('introTitle').textContent, 'Thiên biến');
  advance(200000);
  await done;
  assert.equal(finished, true);
  assert.equal(nodes.get('introVisible').textContent, 'Đang bước vào Hư Giới…');
});

test('ẩn tab dừng tiến trình và mở lại tiếp tục đúng chữ đang hiển thị', () => {
  const { ui, document, nodes, listeners, advance } = setup();
  ui.intro.play();
  advance(350);
  const text = nodes.get('introVisible').textContent;
  document.hidden = true; listeners.get('visibilitychange')();
  advance(30000);
  assert.equal(nodes.get('introVisible').textContent, text);
  assert.equal(nodes.get('introTitle').textContent, 'Nhân gian');
  document.hidden = false; listeners.get('visibilitychange')();
  advance(35);
  assert.ok(nodes.get('introVisible').textContent.length > text.length);
});

test('chế độ giảm chuyển động vẫn tự chạy và đóng intro dọn sạch hẹn giờ', async () => {
  const { ui, nodes, listeners, advance, timers } = setup(true);
  ui.intro.play();
  assert.ok(nodes.get('introVisible').textContent.length > 0);
  assert.equal(nodes.get('introPending').textContent, '');
  assert.equal(nodes.get('introCaption').getAnimations().length, 0);
  advance(7999);
  assert.equal(nodes.get('introTitle').textContent, 'Nhân gian');
  advance(1);
  assert.equal(nodes.get('introTitle').textContent, 'Thiên biến');
  const closed = ui.intro.close();
  advance(0);
  await closed;
  assert.equal(ui.intro.active, false);
  assert.equal(listeners.has('visibilitychange'), false);
  assert.equal(timers.size, 0);
});

/* Kiểm tra tương tác, kéo cửa sổ và lời nhắn theo đồng hồ giả; không gọi máy chủ. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor(tag) {
    this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.nodes = new Map();
    this.dataset = {}; this.style = {}; this.hidden = false; this.value = ''; this.textContent = ''; this.markup = '';
    const classes = new Set();
    this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) };
  }
  set innerHTML(html) { this.markup = html; }
  querySelector(selector) {
    if (this.nodes.has(selector)) return this.nodes.get(selector);
    const matches = selector.split(/\s+/).every(token => token[0] === '.'
      ? [...this.markup.matchAll(/class="([^"]+)"/g)].some(match => match[1].split(/\s+/).includes(token.slice(1)))
      : new RegExp('<' + token + '(?:\\s|>)').test(this.markup));
    if (!matches) return null;
    const token = selector.split(/\s+/).at(-1);
    const tag = token[0] === '.' ? [...this.markup.matchAll(/<(\w+)[^>]*class="([^"]+)"/g)]
      .find(match => match[2].split(/\s+/).includes(token.slice(1)))?.[1] : token;
    const child = new Element(tag);
    child.markup = this.markup; this.nodes.set(selector, child); return child;
  }
  append(node) { node.parentElement = this; this.children.push(node); }
  replaceChildren() { this.children = []; }
  get firstChild() { return this.children[0]; }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  fire(name, event = {}) {
    const e = { target: this, button: 0, isPrimary: true, pointerId: 1, clientX: 0, clientY: 0,
      preventDefault() {}, stopPropagation() {}, ...event };
    for (const fn of this.listeners[name] || []) fn(e);
  }
  closest(tag) { return this.tag === tag ? this : null; }
  focus() { this.focused = true; }
  setPointerCapture(id) { this.pointer = id; }
  releasePointerCapture(id) { if (this.pointer === id) this.pointer = null; }
  getBoundingClientRect() {
    return { x: parseFloat(this.style.left) || 0, y: parseFloat(this.style.top) || 0,
      width: parseFloat(this.style.width) || 360, height: Math.min(this.height || 430, parseFloat(this.style.maxHeight) || Infinity) };
  }
}

function fixture(store = new Map()) {
  const game = new Element('game'), actor = new Element('actor'), tribulation = new Element('section');
  tribulation.hidden = true;
  const state = { created: true, name: 'Đạo hữu', createdAt: 123, hp: 100, qi: 0, progress: { kill: 2, meditate: 0, breaks: 0, alchemy: 0 }, garden: [], craftQueue: [] };
  let tick, resizePanel, clock = 100000;
  const document = Object.assign(new Element('document'), {
    hidden: false, body: new Element('body'),
    getElementById: id => ({ game, heroActor: actor, tribulationFx: tribulation })[id], createElement: tag => new Element(tag)
  });
  const window = Object.assign(new Element('window'), {
    innerWidth: 1000, innerHeight: 800,
    HU_UI: { s: () => state, g: () => ({ stats: () => ({ HP: 100 }), need: () => 100 }), session: { serverNow: () => clock } },
    ResizeObserver: class { constructor(callback) { resizePanel = callback; } observe() {} }
  });
  const localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
  const math = Object.create(Math); math.random = () => 0;
  const source = fs.readFileSync(path.join(__dirname, '../client/ui/companion.js'), 'utf8');
  vm.runInNewContext(source, { window, document, localStorage, Math: math, Date: { now: () => clock },
    setInterval: fn => { tick = fn; }, console: { warn: (...args) => { throw Error(args.join(' ')); } } });
  return { game, actor, tribulation, state, document, window, tick: () => tick(), advance: ms => { clock += ms; tick(); },
    resizePanel: () => resizePanel(), store,
    panel: () => game.children[0], companion: () => actor.children[0],
    open() { actor.children[0].querySelector('.fox-launch').fire('click'); }
  };
}
const pos = panel => [parseFloat(panel.style.left), parseFloat(panel.style.top)];

test('Linh Hồ neo theo nhân vật, mở/đóng hội thoại, ẩn khi không có nhân vật', () => {
  const f = fixture(); f.tick();
  assert.equal(f.actor.children.length, 1);
  const companion = f.companion(), button = companion.querySelector('.fox-launch'), panel = f.panel();
  assert.match(companion.markup, /src="media\/assets\/companion\/linh-ho\.gif"/);
  assert.equal(panel.hidden, true);
  f.open();
  assert.equal(panel.hidden, false);
  assert.equal(button.attributes['aria-expanded'], 'true');
  assert.equal(panel.querySelector('.fox-form input').focused, true);
  panel.fire('keydown', { key: 'Escape' });
  assert.equal(panel.hidden, true);
  assert.equal(button.focused, true);
  f.open(); f.state.created = false; f.tick();
  assert.equal(companion.hidden, true);
  assert.equal(panel.hidden, true);
  assert.equal(button.attributes['aria-expanded'], 'false');
  f.state.created = true; f.tick();
  assert.equal(companion.hidden, false);
  assert.equal(panel.hidden, true);
});

test('Nhiệm vụ theo dõi tiến độ mới và không tự sửa tiến độ nhân vật', () => {
  const f = fixture(); f.tick();
  const panel = f.panel();
  panel.fire('click', { target: { dataset: { fox: 'mission' } } });
  assert.match(panel.querySelector('.fox-mission').textContent, /0\/5/);
  assert.equal(f.state.progress.kill, 2);
  f.state.progress.kill += 5; f.tick();
  assert.match(panel.querySelector('.fox-mission').textContent, /5\/5 · Hoàn thành/);
  assert.equal(f.state.progress.kill, 7);
  assert.equal(JSON.parse(f.store.get('hu-linh-ho:Đạo hữu:123')).done, true);
});

test('Ô trò chuyện vẫn gửi tin đúng sau khi thêm lựa chọn lời nhắn', () => {
  const f = fixture(); f.tick(); f.open();
  const panel = f.panel(), input = panel.querySelector('.fox-form input');
  input.value = 'xin chào'; panel.querySelector('form').fire('submit');
  assert.equal(input.value, '');
  assert.equal(panel.querySelector('.fox-chatter-toggle').checked, true);
  const chat = panel.querySelector('.fox-messages').children;
  assert.equal(chat.at(-2).textContent, 'xin chào');
  assert.match(chat.at(-1).textContent, /bổn hệ thống có mặt/);
});

test('Kéo bằng chuột/cảm ứng, giữ cửa sổ trong màn hình và nhớ vị trí qua lần mở lại', () => {
  const f = fixture(); f.tick(); f.open();
  const panel = f.panel(), handle = panel.querySelector('header');
  assert.deepEqual(pos(panel), [320, 185]);
  handle.fire('pointerdown', { clientX: 400, clientY: 200, pointerType: 'touch' });
  handle.fire('pointermove', { pointerId: 2, clientX: 1, clientY: 1 });
  assert.deepEqual(pos(panel), [320, 185]);
  handle.fire('pointermove', { clientX: 500, clientY: 250 });
  assert.deepEqual(pos(panel), [420, 235]);
  handle.fire('pointerup');
  assert.equal(panel.classList.contains('dragging'), false);
  panel.querySelector('.fox-close').fire('click'); f.open();
  assert.deepEqual(pos(panel), [420, 235]);
  const restored = fixture(f.store); restored.tick(); restored.open();
  assert.deepEqual(pos(restored.panel()), [420, 235]);

  handle.fire('pointerdown', { clientX: 500, clientY: 250 });
  handle.fire('pointermove', { clientX: -1000, clientY: -1000 });
  assert.deepEqual(pos(panel), [8, 8]);
  handle.fire('pointermove', { clientX: 3000, clientY: 3000 });
  assert.deepEqual(pos(panel), [632, 362]);
  handle.fire('pointercancel');
  handle.fire('pointermove', { clientX: 0, clientY: 0 });
  assert.deepEqual(pos(panel), [632, 362]);
});

test('Nút đóng không kéo cửa sổ; bàn phím và thay đổi khung nhìn giữ cửa sổ trong tầm với', () => {
  const f = fixture(); f.tick(); f.open();
  const panel = f.panel(), handle = panel.querySelector('header');
  handle.fire('pointerdown', { target: panel.querySelector('.fox-close') });
  handle.fire('pointermove', { clientX: 900, clientY: 700 });
  assert.deepEqual(pos(panel), [320, 185]);
  handle.fire('keydown', { key: 'ArrowRight' });
  handle.fire('keydown', { key: 'ArrowDown', shiftKey: true });
  assert.deepEqual(pos(panel), [336, 225]);
  handle.fire('keydown', { key: 'Home' });
  assert.deepEqual(pos(panel), [320, 185]);
  panel.height = 700; f.resizePanel();
  assert.deepEqual(pos(panel), [320, 92]);
  f.window.visualViewport = { width: 320, height: 300, offsetLeft: 12, offsetTop: 50 };
  f.window.fire('resize');
  assert.deepEqual(pos(panel), [20, 58]);
  assert.equal(panel.style.width, '304px');
  assert.equal(panel.style.maxHeight, '284px');
});

test('Lời thoại ngẫu nhiên không cướp focus, tự ẩn, không lặp liền và chạm được để trả lời', () => {
  const f = fixture(); f.tick();
  const companion = f.companion(), panel = f.panel(), bubble = companion.querySelector('.fox-bubble');
  f.advance(44999); assert.equal(bubble.hidden, true);
  f.advance(1); assert.equal(bubble.hidden, false);
  const first = bubble.querySelector('.fox-bubble-text').textContent;
  assert.ok(first);
  assert.equal(panel.hidden, true);
  assert.equal(panel.querySelector('.fox-form input').focused, undefined);
  f.advance(10000); assert.equal(bubble.hidden, true);
  f.advance(35000); assert.equal(bubble.hidden, false);
  assert.notEqual(bubble.querySelector('.fox-bubble-text').textContent, first);
  assert.doesNotMatch(companion.markup, /fox-bubble-(open|close)|<button[^>]*>[^<]*<\/button>[^<]*<small/, 'Chữ nổi là chữ trần, không có khung/nút');
  f.advance(10000); assert.equal(bubble.hidden, true);
  f.advance(35000); assert.equal(bubble.hidden, false);
  companion.querySelector('.fox-launch').fire('click');
  assert.equal(panel.hidden, false);
  assert.equal(bubble.hidden, true);
  assert.equal(panel.querySelector('.fox-form input').focused, true);
});

test('Dừng lời nhắn khi ẩn tab, mở trang khác hoặc đang trò chuyện; không dồn tin khi trở lại', () => {
  const f = fixture(); f.tick();
  const bubble = f.companion().querySelector('.fox-bubble');
  f.document.hidden = true; f.document.fire('visibilitychange');
  f.advance(600000); assert.equal(bubble.hidden, true);
  f.document.hidden = false; f.tick(); assert.equal(bubble.hidden, true);
  f.advance(45000); assert.equal(bubble.hidden, false);
  for (const [pause, resume] of [
    [() => f.game.classList.add('page-open'), () => f.game.classList.remove('page-open')],
    [() => { f.game.hidden = true; }, () => { f.game.hidden = false; }],
    [() => { f.state.presencePaused = true; }, () => { f.state.presencePaused = false; }],
    [() => { f.tribulation.hidden = false; }, () => { f.tribulation.hidden = true; }],
    [() => f.document.body.classList.add('hu-dialogue-open'), () => f.document.body.classList.remove('hu-dialogue-open')]
  ]) {
    pause(); f.advance(600000); assert.equal(bubble.hidden, true);
    resume(); f.tick(); assert.equal(bubble.hidden, true);
    f.advance(45000); assert.equal(bubble.hidden, false);
  }
  f.open(); const before = f.panel().querySelector('.fox-messages').children.length;
  f.advance(600000);
  assert.equal(f.panel().querySelector('.fox-messages').children.length, before);
});

test('Tắt lời nhắn ngẫu nhiên được lưu, nhưng vẫn hiện cảnh báo và tin hoàn thành nhiệm vụ', () => {
  const f = fixture(); f.tick(); f.open();
  const toggle = f.panel().querySelector('.fox-chatter-toggle');
  toggle.checked = false; toggle.fire('change');
  f.panel().querySelector('.fox-close').fire('click');
  f.advance(600000);
  const bubble = f.companion().querySelector('.fox-bubble');
  assert.equal(bubble.hidden, true);
  const restored = fixture(f.store); restored.tick();
  assert.equal(restored.panel().querySelector('.fox-chatter-toggle').checked, false);
  f.state.hp = 10; f.tick();
  assert.equal(bubble.hidden, false);
  assert.match(bubble.querySelector('.fox-bubble-text').textContent, /Cảnh báo/);
  assert.equal(bubble.dataset.kind, 'warn');
  f.advance(10000); assert.equal(bubble.hidden, true);
});

test('Vị trí lưu bị hỏng không làm mất tùy chọn tắt lời nhắn', () => {
  const f = fixture(new Map([['hu-linh-ho-window-v1', '{broken'], ['hu-linh-ho-chatter-v1', 'off']]));
  f.tick(); f.open();
  assert.deepEqual(pos(f.panel()), [320, 185]);
  assert.equal(f.panel().querySelector('.fox-chatter-toggle').checked, false);
});

const textOf = f => f.companion().querySelector('.fox-bubble').querySelector('.fox-bubble-text').textContent;
const kindOf = f => f.companion().querySelector('.fox-bubble').dataset.kind;

test('Chưa có nhiệm vụ thì Linh Hồ giục nhận nhiệm vụ bằng giọng bổn hệ thống', () => {
  const f = fixture(); f.tick(); f.advance(45000);
  assert.equal(kindOf(f), 'nag');
  assert.match(textOf(f), /Nhiệm vụ|nhiệm vụ/);
  assert.match(textOf(f), /bổn hệ thống|ngươi|ta /i);
});

test('Có nhiệm vụ dang dở thì giục theo tên và phần còn thiếu, càng nhắc càng gắt', () => {
  const f = fixture(); f.tick();
  f.panel().fire('click', { target: { dataset: { fox: 'mission' } } });
  const seen = [];
  for (let i = 0; i < 4; i++) {
    f.advance(45000); assert.equal(kindOf(f), 'nag'); seen.push(textOf(f));
    f.advance(10000);
  }
  for (const text of seen) assert.match(text, /Trừ yêu hộ đạo|Tĩnh tâm|Tiến thêm|Đan hương/);
  assert.match(seen[0], /còn thiếu 5 yêu thú|Còn thiếu 5 yêu thú/i);
  assert.match(seen[1], /bao nhiêu lần rồi/);
  assert.match(seen[2], /Lần thứ 3 rồi/);
  assert.match(seen[3], /chọc giận/);
  f.state.progress.kill += 3;
  f.advance(45000);
  assert.match(textOf(f), /thiếu 2 yêu thú/);
});

test('Xong nhiệm vụ thì Linh Hồ khoe công, nhưng đã xong thì thôi giục', () => {
  const f = fixture(); f.tick();
  f.panel().fire('click', { target: { dataset: { fox: 'mission' } } });
  f.state.progress.kill += 5; f.tick();
  assert.equal(kindOf(f), 'praise');
  assert.match(textOf(f), /biết ơn bổn hệ thống/);
  f.advance(10000);
  for (let i = 0; i < 6; i++) { f.advance(45000); if (kindOf(f) === 'nag') assert.doesNotMatch(textOf(f), /Trừ yêu hộ đạo.*thiếu/); f.advance(10000); }
});

test('Cảnh báo và nhắc việc dùng đúng loại lời; tắt tự lên tiếng thì không giục nhưng vẫn cảnh báo', () => {
  const f = fixture(); f.tick(); f.open();
  const toggle = f.panel().querySelector('.fox-chatter-toggle');
  toggle.checked = false; toggle.fire('change'); f.panel().querySelector('.fox-close').fire('click');
  f.panel().fire('click', { target: { dataset: { fox: 'mission' } } });
  f.advance(600000);
  assert.equal(f.companion().querySelector('.fox-bubble').hidden, true);
  f.state.garden = [{ wilt: false, end: 1 }]; f.tick();
  assert.equal(kindOf(f), 'hint'); assert.match(textOf(f), /Linh điền/);
  f.advance(10000); f.advance(60000);
  f.state.hp = 5; f.tick();
  assert.equal(kindOf(f), 'warn'); assert.match(textOf(f), /^Cảnh báo/);
});

test('Trả lời trong ô chat cũng đúng giọng: cảm ơn, hỏi danh tính', () => {
  const f = fixture(); f.tick(); f.open();
  const panel = f.panel(), input = panel.querySelector('.fox-form input'), chat = () => panel.querySelector('.fox-messages').children;
  input.value = 'cảm ơn'; panel.querySelector('form').fire('submit');
  assert.match(chat().at(-1).textContent, /Ngươi nên biết ơn ta đấy, hahaha/);
  input.value = 'bạn là ai'; panel.querySelector('form').fire('submit');
  assert.match(chat().at(-1).textContent, /Bổn hệ thống chính là Linh Hồ/);
});

test('Chữ nổi được dịch vào trong màn hình khi Linh Hồ đứng sát mép', () => {
  const f = fixture(); f.tick();
  const bubble = f.companion().querySelector('.fox-bubble');
  bubble.getBoundingClientRect = () => {
    const m = parseFloat(bubble.style.marginLeft) || 0;
    return { left: 900 + m, right: 1120 + m, width: 220, height: 40, x: 900 + m, y: 100 };
  };
  f.advance(45000);
  assert.equal(bubble.hidden, false);
  assert.equal(bubble.style.marginLeft, '-128px');
  bubble.getBoundingClientRect = () => {
    const m = parseFloat(bubble.style.marginLeft) || 0;
    return { left: -60 + m, right: 160 + m, width: 220, height: 40, x: -60 + m, y: 100 };
  };
  f.advance(10000); f.advance(35000);
  assert.equal(bubble.style.marginLeft, '68px');
});

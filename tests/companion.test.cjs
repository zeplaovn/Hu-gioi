/* Kiểm tra luồng tương tác và vị trí neo của Linh Hồ mà không cần kết nối máy chủ. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.nodes = new Map(); this.dataset = {}; this.hidden = false; this.value = ''; this.textContent = ''; }
  set innerHTML(html) { this.markup = html; }
  querySelector(selector) {
    if (this.nodes.has(selector)) return this.nodes.get(selector);
    const exists = selector[0] === '.'
      ? [...this.markup.matchAll(/class="([^"]+)"/g)].some(match => match[1].split(/\s+/).includes(selector.slice(1)))
      : new RegExp('<' + selector + '(?:\\s|>)').test(this.markup);
    if (!exists) return null;
    const child = new Element(selector); this.nodes.set(selector, child); return child;
  }
  append(node) { node.parentElement = this; this.children.push(node); }
  replaceChildren() { this.children = []; }
  get firstChild() { return this.children[0]; }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  fire(name, event = {}) { for (const fn of this.listeners[name] || []) fn({ target: this, preventDefault() {}, ...event }); }
  focus() { this.focused = true; }
}

function fixture() {
  const game = new Element('game'), actor = new Element('actor'), store = new Map();
  const state = { created: true, name: 'Đạo hữu', createdAt: 123, hp: 100, qi: 0, progress: { kill: 2, meditate: 0, breaks: 0, alchemy: 0 }, garden: [], craftQueue: [] };
  let tick;
  const document = { hidden: false, getElementById: id => ({ game, heroActor: actor })[id], createElement: tag => new Element(tag) };
  const window = { HU_UI: { s: () => state, g: () => ({ stats: () => ({ HP: 100 }), need: () => 100 }), session: { serverNow: () => 0 } } };
  const localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
  const math = Object.create(Math); math.random = () => 0;
  const source = fs.readFileSync(path.join(__dirname, '../client/ui/companion.js'), 'utf8');
  vm.runInNewContext(source, { window, document, localStorage, Math: math, setInterval: fn => { tick = fn; }, console });
  return { game, actor, state, tick: () => tick(), store };
}

test('Linh Hồ neo theo nhân vật, mở và đóng hội thoại, ẩn khi không có nhân vật', () => {
  const f = fixture(); f.tick();
  assert.equal(f.actor.children.length, 1);
  const companion = f.actor.children[0], button = companion.querySelector('.fox-launch'), panel = f.game.children[0];
  assert.match(companion.markup, /src="media\/assets\/companion\/linh-ho\.gif"/);
  assert.equal(panel.hidden, true);
  button.fire('click');
  assert.equal(panel.hidden, false);
  assert.equal(button.attributes['aria-expanded'], 'true');
  assert.equal(panel.querySelector('input').focused, true);
  panel.fire('keydown', { key: 'Escape' });
  assert.equal(panel.hidden, true);
  assert.equal(button.focused, true);
  button.fire('click'); f.state.created = false; f.tick();
  assert.equal(companion.hidden, true);
  assert.equal(panel.hidden, true);
  assert.equal(button.attributes['aria-expanded'], 'false');
  f.state.created = true; f.tick();
  assert.equal(companion.hidden, false);
  assert.equal(panel.hidden, true);
});

test('Nhiệm vụ Linh Hồ theo dõi tiến độ mới và không tự sửa tiến độ nhân vật', () => {
  const f = fixture(); f.tick();
  const panel = f.game.children[0];
  panel.fire('click', { target: { dataset: { fox: 'mission' } } });
  assert.match(panel.querySelector('.fox-mission').textContent, /0\/5/);
  assert.equal(f.state.progress.kill, 2);
  f.state.progress.kill += 5; f.tick();
  assert.match(panel.querySelector('.fox-mission').textContent, /5\/5 · Hoàn thành/);
  assert.equal(f.state.progress.kill, 7);
  assert.equal(JSON.parse([...f.store.values()][0]).done, true);
});

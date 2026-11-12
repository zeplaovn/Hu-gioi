'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../client/ui/onboarding.js'), 'utf8');
const UI = { kit: { $: () => null }, action() {}, g: () => ({ need: () => 100 }) };
const root = { HU_UI: UI, HU_ASSETS: {}, HU_GAME: { SECT_BOOKS: [{id:'dan_ha',kind:'PILL'}] }, setTimeout, clearTimeout };
root.window = root;
vm.runInNewContext(source, root);
const state = () => ({ progress: { meditate: 20 }, sect: { mission: null }, exploration: { active: null }, craftQueue: [], qi: 0 });
const info = (id, ready = false) => ({ quest: { id, go: 'idle', desc: 'mục tiêu' }, ready });

test('hướng dẫn chỉ nút phù hợp theo mục tiêu và trạng thái, không tự thực hiện lệnh', () => {
  const p = UI.tutorial.plan, s = state();
  assert.match(p(s, info('novice_meditate'), 0).text, /20\/60/);
  assert.equal(p(s, info('novice_sect'), 0).target, '[data-act="joinSect"]:not(:disabled)');
  assert.match(p(s, info('novice_mission'), 0).target, /sectMissionStart/);
  s.sect.mission = { end: 100 };
  assert.match(p(s, info('novice_mission'), 99).text, /chờ hết giờ/);
  assert.match(p(s, info('novice_mission'), 101).target, /sectMissionClaim/);
  assert.match(p(s, info('novice_explore'), 0).target, /exploreStart/);
  s.exploration.active = { kind: 'monster', choice: -1 };
  assert.match(p(s, info('novice_explore'), 0).target, /exploreChoice/);
  s.exploration.active.choice = 1;
  assert.equal(p(s, info('novice_explore'), 0).target, '#explorationCountdown');
  s.sect.joined = true; s.adventurePoints = 40;
  assert.match(p(s, info('novice_alchemy'), 0).target, /borrowSectBook/);
  s.borrowedBook = 'dan_ha';
  assert.match(p(s, info('novice_alchemy'), 0).target, /craft/);
  s.craftQueue.push({});
  assert.match(p(s, info('novice_alchemy'), 0).text, /đang luyện/);
  assert.equal(p(s, info('novice_foundation'), 0).page, 'idle');
  s.qi = 100;
  assert.equal(p(s, info('novice_foundation'), 0).target, '#tribStart');
  assert.match(p(s, info('novice_foundation'), 0).text, /tử vong/);
  assert.equal(p(s, info('novice_foundation', true), 0).page, 'quests');
});

test('ẩn hướng dẫn theo nhân vật và có thể mở lại, không khóa giao diện', () => {
  const nodes = new Map(), saved = new Map();
  function element(id) {
    return { id, hidden: false, textContent: '', listeners: {}, classList: { toggle() {}, remove() {} },
      setAttribute() {}, addEventListener(type, fn) { this.listeners[type] = fn; },
      remove() { nodes.delete(this.id); },
      set innerHTML(html) { for (const m of html.matchAll(/id="([^"]+)"/g)) nodes.set(m[1], element(m[1])); }
    };
  }
  nodes.set('modalLayer', { hidden: true });
  const gameState = { ...state(), created: true };
  const ui = { kit: { $: id => nodes.get(id) }, action() {}, store: { ready: true },
    session: { playerId: 'hero-1' }, s: () => gameState, intro: { active: false }, tribulation: { active: false },
    g: () => ({ noviceQuestInfo: () => ({ quest: { id: 'novice_meditate' }, index: 0, ready: false }) }) };
  const env = { HU_UI: ui, HU_ASSETS: {}, HU_GAME: { NOVICE_QUESTS: Array(8) },
    localStorage: { getItem: k => saved.get(k), setItem: (k,v) => saved.set(k,v) },
    document: { createElement: () => element('noviceGuide'), body: { append: e => nodes.set(e.id,e) } }, setTimeout, clearTimeout };
  env.window = env;
  vm.runInNewContext(source, env);
  ui.tutorial.resume();
  assert.equal(ui.tutorial.active, true);
  nodes.get('noviceGuideHide').listeners.click();
  assert.equal(ui.tutorial.active, false);
  ui.tutorial.resume();
  assert.equal(ui.tutorial.active, false);
  ui.tutorial.start();
  assert.equal(ui.tutorial.active, true);
  ui.tutorial.close();
  ui.session.playerId = 'hero-2';
  ui.tutorial.resume();
  assert.equal(ui.tutorial.active, true);
});

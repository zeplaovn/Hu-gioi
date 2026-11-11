'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const http = require('node:http');
const { createRouter } = require('../server/http/router.js');
const ROOT = join(__dirname, '..');
const read = path => readFileSync(join(ROOT, path), 'utf8');

function releaseHarness() {
  const items = [];
  const moreMenu = {
    querySelector(selector) {
      if (selector !== '[data-more-go="more:ranking"]') return null;
      return items.find(el => el.dataset.moreGo === 'more:ranking') || null;
    },
    appendChild(element) { items.push(element); }
  };
  const bodyChildren = [];
  let bubble = null;
  let chatTick = null;
  const noop = () => {};
  function element() {
    return {
      dataset: {},
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      style: { setProperty: noop },
      addEventListener: noop,
      setAttribute: noop,
      removeAttribute: noop,
      focus: noop,
      remove() { const n = items.indexOf(this); if (n >= 0) items.splice(n, 1); },
      querySelector: noop
    };
  }
  const document = {
    body: { appendChild(el) { bodyChildren.push(el); } },
    addEventListener: noop,
    getElementById(id) {
      if (id === 'moreMenu') return moreMenu;
      if (id === 'game') return { hidden: false };
      if (['chatInput', 'chatForm'].includes(id)) return { addEventListener: noop };
      return null;
    },
    createElement() {
      const el = element();
      const btn = element(), panel = element(), badge = element(), close = element(), panelBody = element();
      panel.querySelector = selector => selector === '.chat-bubble-body' ? panelBody : selector === '.chat-bubble-close' ? close : null;
      el.querySelector = selector => ({
        '.chat-bubble-btn': btn,
        '.chat-bubble-panel': panel,
        '.chat-bubble-badge': badge,
        '.chat-bubble-close': close
      })[selector] || null;
      bubble = el;
      return el;
    }
  };
  const state = {
    created: true, name: 'Kiểm thử', realm: 5,
    social: { friends: {}, pvp: { rating: 1100, wins: 0, losses: 0, streak: 0, best: 1100, lastAt: 0 } },
    auction: { cycle: 0, offers: {} }
  };
  let socialOpen = true;
  const game = {
    featureOpen: () => socialOpen,
    stats: () => ({ CP: 100 }),
    realmLabel: () => 'Luyện Hư',
    discussGain: () => 10,
    lots: () => []
  };
  const context = {
    document, URL, Date, Math,
    addEventListener: noop,
    setInterval(fn) { chatTick = fn; return 1; },
    HU_GAME: {
      F: { fmt: String, format_linh_thach: String, COINS: [], REALMS: Array.from({ length: 14 }, (_, n) => 'Cảnh giới ' + n) },
      QUESTS: [], PVP_CD: 25000, DISCUSS_CD: 120000,
      FRIENDS: [], DAO: [], RIVALS: [], giftCost: () => 1,
      FEATURES: { social: { realm: 3, label: 'Giao du: kết bạn, luận kiếm, bảng xếp hạng' } }
    },
    HU_ASSETS: { BG: {}, heroPortrait: () => '' },
    HU_REMOTE_SESSION: { RemoteSession: class { subscribe() {} } },
    HU_REMOTE_STORE: { createStore: () => ({ dispatch: noop, preference: noop }) },
    HU_CHAT_SESSION: {
      ChatSession: class {
        constructor() { this.state = { messages: [] }; this.available = false; }
        subscribe() {}
        disconnect() {}
      }
    }
  };
  runInNewContext(read('client/ui/core.js'), context);
  const UI = context.HU_UI;
  UI.s = () => state;
  UI.g = () => game;
  UI.adventure = { sect: () => '<p>Tông môn</p>', dungeons: () => '' };
  for (const path of ['client/ui/screens/more.js', 'client/ui/screens/world.js', 'client/ui/screens/chat.js']) {
    runInNewContext(read(path), context);
  }
  return { UI, items, bodyChildren, bubble: () => bubble, tick: () => chatTick(), setSocialOpen: value => { socialOpen = value; } };
}

test('cờ tắt: menu Thêm không Chat/ranking; giao du và thế giới có nhãn mô phỏng', () => {
  const { UI, items, bodyChildren, tick } = releaseHarness();
  // Feature flag có thể tắt cho các bản không dùng Edge API thật.
  UI.release.chat = false; UI.release.ranking = false;
  assert.equal(UI.release.chat, false);
  assert.equal(UI.release.ranking, false);
  assert.equal(UI.release.allowed('chat'), false);
  assert.equal(UI.release.allowed('more:ranking'), false);
  UI.release.syncMoreMenu();
  assert.equal(items.length, 0);
  tick();
  assert.equal(bodyChildren.length, 0, 'Không tạo nút/bong bóng chat nổi khi cờ tắt');
  for (const tab of ['friends', 'dao', 'pvp']) {
    const rendered = UI.screens.more.render(tab);
    assert.match(rendered, /NPC · mô phỏng/);
    assert.doesNotMatch(rendered, /data-tab="ranking"/);
  }
  for (const [tab, label] of [
    ['sect', 'Tông môn cá nhân · chưa có thành viên khác'],
    ['auction', 'Phiên mô phỏng · không có người mua/bán khác']
  ]) {
    assert.ok(UI.screens.world.render(tab).includes(label), label);
  }
  const html = read('index.html');
  assert.doesNotMatch(html, /data-more-go="chat"/);
  assert.doesNotMatch(html, /data-more-go="more:ranking"/);
});

test('thông báo khóa Giao du không còn quảng bá bảng xếp hạng đang ẩn', () => {
  const { UI, setSocialOpen } = releaseHarness();
  UI.release.ranking = false;
  setSocialOpen(false);
  const locked = UI.screens.more.render('friends');
  assert.match(locked, /Giao du NPC/);
  assert.doesNotMatch(locked, /Bảng xếp hạng|bảng xếp hạng/);
});

test('bật lại cờ: menu ranking và nút chat nổi xuất hiện; tắt lại sẽ ẩn', () => {
  const { UI, items, bodyChildren, bubble, tick } = releaseHarness();
  assert.equal(UI.release.chat, true);
  assert.equal(UI.release.ranking, true);
  UI.release.ranking = true;
  UI.release.syncMoreMenu();
  assert.equal(items.length, 1);
  assert.equal(items[0].dataset.moreGo, 'more:ranking');
  assert.equal(UI.release.allowed('more:ranking'), true);
  assert.match(UI.screens.more.render('ranking'), /data-tab="ranking"/);
  assert.match(UI.screens.more.render('ranking'), /Bảng xếp hạng người chơi thật/);
  UI.release.chat = true;
  tick();
  assert.equal(bodyChildren.length, 1);
  assert.equal(bubble().id, 'chatBubble');
  assert.equal(bubble().hidden, false);
  UI.release.chat = false;
  UI.release.ranking = false;
  tick();
  UI.release.syncMoreMenu();
  assert.equal(bubble().hidden, true);
  assert.equal(items.length, 0);
});

test('Node router không phục vụ bất kỳ API /api/chat/* nào', async t => {
  const server = http.createServer(createRouter());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  for (const [method, path] of [
    ['GET', '/api/chat/messages'],
    ['POST', '/api/chat/send'],
    ['GET', '/api/chat/events?after=1']
  ]) {
    const answer = await new Promise((resolve, reject) => {
      const req = http.request({ method, hostname: '127.0.0.1', port: server.address().port, path }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(answer.status, 404, method + ' ' + path);
    assert.equal(answer.body.error, 'Chưa có API này.');
  }
});

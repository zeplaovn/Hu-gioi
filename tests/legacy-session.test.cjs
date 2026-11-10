/* LEGACY ONLY: browser classic-script offline adapter regression; không thuộc đường chơi production. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const NOW = 1_700_000_000_000;
const PROFILE = { name: 'Hư Không', gender: 'nam', age: 18, race: 'nhan',
  roots: [72,61,45,44,33], rootType: 'Song',
  talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 } };

test('[legacy] LocalSession chạy trong VM độc lập và không xuất hiện trong index.html', () => {
  const files = [
    'data/balance.js', 'data/items.js', 'data/design-raw.js', 'data/design.js',
    'data/formulas.js', 'data/catalog.js', 'data/roots.js', 'data/character.js',
    'data/social.js', 'data/adventures.js', 'data/story.js', 'engine/state/player.js',
    'engine/rules/progression.js', 'engine/rules/inventory.js', 'engine/rules/crafting.js',
    'engine/rules/combat.js', 'engine/rules/world.js', 'engine/rules/adventures.js',
    'engine/rules/social.js', 'engine/rules/time.js', 'engine/rules/creation.js',
    'engine/protocol/commands.js', 'engine/game.js', 'legacy/local-session.js'
  ];
  const root = { console }; root.window = root; root.globalThis = root;
  runInNewContext('var window = this; var globalThis = this;', root);
  for (const file of files) runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), root, { filename: file });
  assert.equal(root.HU_GAME.READY, true);
  assert.deepEqual(Array.from(root.HU_GAME.MISSING), []);
  let now = NOW, seed = 9;
  const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const session = new root.HU_LOCAL_SESSION.LocalSession({ clock: () => now, rng });
  assert.equal(session.ready, true);
  assert.equal(session.game.s.created, false);
  const events = []; session.subscribe(event => events.push(event));
  session.create(PROFILE);
  now += 1000;
  const result = session.dispatch('strike');
  assert.equal(typeof result.won, 'boolean');
  session.dispatch('setAuto', runInNewContext('({ enabled: false })', root));
  session.dispatch('joinSect', runInNewContext("({ id: 'thanhvan' })", root));
  now += 5000;
  assert.ok(session.advance().seconds >= 5);
  assert.ok(events.some(event => event.type === 'log'));
  session.game.s.age = session.game.maxLife();
  now += 1000; session.advance();
  assert.ok(events.some(event => event.type === 'death'));
  assert.throws(() => session.dispatch('reincarnate'), { code: 'INVALID_COMMAND' });
  const html = readFileSync(join(__dirname, '..', 'index.html'),'utf8');
  assert.doesNotMatch(html,/local-(?:session|store)\.js/);
});

test('[legacy] LocalStore chỉ được nạp trong kiểm thử, không được phát hành', () => {
  const src = readFileSync(join(__dirname, '..', 'legacy/local-store.js'), 'utf8');
  const ctx = { HU_GAME: { create: () => ({}) } }; ctx.window = ctx;
  runInNewContext(src, ctx);
  assert.equal(typeof ctx.HU_LOCAL_STORE.createStore,'function');
  const dist = join(__dirname, '..', 'dist');
  const { existsSync } = require('node:fs');
  for(const file of ['client/session/local-session.js','client/persistence/local-store.js',
                     'legacy/local-session.js','legacy/local-store.js'])
    assert.equal(existsSync(join(dist,file)),false,'Không xuất bản ' + file);
});

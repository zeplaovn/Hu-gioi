import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacter, emptyState, normalizeSave } from '../apps/web/src/game/state.js';
import { gameReducer } from '../apps/web/src/game/reducer.js';

test('creates a playable v2 character', () => {
  const s = createCharacter({ name:'Test', race:'Nhân', stats:{'Tướng Mạo':5,'Phúc Duyên':5,'Căn Cốt':5,'Ngộ Tính':5,'Vận Khí':5} });
  assert.equal(s.version, 2); assert.equal(s.created, true); assert.equal(s.profile.name, 'Test'); assert.ok(s.profile.hp > 0);
});

test('training increases cultivation', () => {
  const base = createCharacter({ name:'Test', race:'Nhân', stats:{} });
  const next = gameReducer(base, { type:'TRAIN' });
  assert.ok(next.profile.exp > base.profile.exp); assert.ok(next.profile.qi >= base.profile.qi);
});

test('legacy-shaped saves are accepted by migration adapter', () => {
  const migrated = normalizeSave({ player:{ name:'Legacy', race:'Nhân', realm:2, exp:123 } });
  assert.equal(migrated.profile.name, 'Legacy'); assert.equal(migrated.profile.realm, 2); assert.equal(migrated.profile.exp, 123);
});

test('empty state is not playable before character creation', () => {
  const s = emptyState(); assert.equal(s.created, false); assert.equal(s.profile, null);
});

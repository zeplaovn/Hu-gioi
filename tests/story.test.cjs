/* Thiên Thư: tính toàn vẹn, lời thoại, lệnh engine và nâng bản lưu. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const H = require('../engine/game.js');
const C = require('../engine/protocol/commands.js');
const STORY = require('../data/story.js');
const D = require('../data/design.js');
const A = require('../data/adventures.js');
const Z = require('../data/catalog.js');

const NOW = 1_700_000_000_000;
const PROFILE = {
  name: 'Hư Không', gender: 'nam', age: 18, race: 'nhan',
  roots: [72, 61, 45, 44, 33], rootType: 'Song',
  talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 }
};
const make = () => new H.Game(H.createCharacter(PROFILE, NOW, () => .5), () => .5);
const run = (g, id, option) => C.execute(g, { type: 'storyMark', payload: {
  id, ...(option === undefined ? {} : { option })
} }, NOW);
const chapters = STORY.ACTS.flatMap(a => a.chapters);
const topics = Object.values(STORY.NPCS).flatMap(x => Object.values(x));

test('tài liệu hợp đồng liệt kê đúng mọi lệnh protocol', () => {
  const doc = readFileSync(join(__dirname, '../docs/engine-contract.md'), 'utf8');
  const listed = [...doc.matchAll(/^\| `(\w+)` \| (?:progression|inventory|crafting|combat|world|adventures|social|time) \|/gm)]
    .map(match => match[1]);
  assert.deepEqual([...new Set(listed)].sort(), [...C.types].sort());
  assert.equal(listed.length, C.types.length, 'bảng tài liệu không được lặp lệnh');
});

test('Vạn Kiếp Tàng Thư: ba hồi, 14 chương, mở đúng cảnh giới', () => {
  assert.deepEqual(STORY.ACTS.map(a => a.chapters.length), [5, 4, 5]);
  assert.equal(chapters.length, 14);
  chapters.forEach((ch, i) => {
    assert.equal(ch.unlock.realm, i, ch.id);
    assert.ok(Z.ZONES.some(zone => zone.id === ch.zone && zone.realm === ch.unlock.realm), ch.id);
    assert.ok(ch.text.trim().split(/\s+/).length >= 60 && ch.text.trim().split(/\s+/).length <= 140, ch.id);
    assert.ok(!ch.choices || ch.choices.length <= 2, ch.id);
  });
});

test('Vạn Kiếp Tàng Thư: NPC, bí cảnh, kỳ ngộ và tất cả ID phải tồn tại', () => {
  assert.deepEqual(Object.keys(STORY.NPCS).sort(), Object.keys(D.npc).sort());
  const ids = [...chapters, ...topics].flatMap(x => [x.id, ...(x.choices || []).map(choice => choice.id)]);
  assert.equal(ids.length, new Set(ids).size, 'ID chương, hội thoại hoặc lựa chọn bị trùng');
  for (const [npcId, tiers] of Object.entries(STORY.NPCS)) {
    assert.ok(D.npc[npcId], npcId);
    assert.deepEqual(Object.keys(tiers).sort(), ['confidant', 'familiar', 'stranger']);
    for (const scene of Object.values(tiers)) {
      assert.ok(scene.lines.length >= 4 && scene.lines.length <= 8, scene.id);
      assert.ok(scene.lines.filter(line => line.who === 'npc').length >= 2, scene.id);
      assert.ok(scene.lines.every(line => ['npc', 'player', 'narrator'].includes(line.who)), scene.id);
      assert.ok(!scene.choices || scene.choices.length <= 2);
    }
  }
  assert.deepEqual(Object.keys(STORY.DUNGEONS).sort(), A.DUNGEONS.map(d => d.id).sort());
  assert.deepEqual(Object.keys(STORY.ENCOUNTERS).sort(), A.ENCOUNTERS.map(e => e.id).sort());
  for (const d of A.DUNGEONS) {
    assert.ok(STORY.DUNGEONS[d.id].intro.length > 30, d.id);
    assert.ok(STORY.DUNGEONS[d.id].boss.length > 20, d.id);
  }
  assert.deepEqual(Object.keys(STORY.TRIBULATION).sort(), ['ha', 'linh', 'tien']);
});

test('Vạn Kiếp Tàng Thư: nội dung không lộ chỉ số kỹ thuật và không mất giọng tiên hiệp', () => {
  const content = [
    ...chapters.map(c => c.text), ...topics.flatMap(t => t.lines.map(l => l.text)),
    ...Object.values(STORY.ENCOUNTERS),
    ...Object.values(STORY.DUNGEONS).flatMap(d => [d.intro, d.boss])
  ].join(' ');
  assert.doesNotMatch(content, /\b(?:HP|MP|ATK|DEF|Tốc tu)\b/i);
  assert.match(content, /đạo hữu/i);
});

test('protocol: lệnh storyMark đúng một miền, kiểm tra cảnh giới, thiện cảm và lựa chọn', () => {
  const g = make();
  assert.equal(H.OWNERS.storyMark, 'world');
  assert.equal(C.types.length, 49);
  assert.deepEqual(g.s.story, { read: {}, flags: {} });
  assert.equal(run(g, 'ha-01').id, 'ha-01');
  assert.equal(g.s.story.read['ha-01'], true);
  assert.throws(() => run(g, 'linh-01'), /Cảnh giới/);
  assert.throws(() => run(g, 'khong-co'), /Không tìm thấy/);
  assert.throws(() => C.validate({ type: 'storyMark', payload: { id: 'ha-01', bogus: true } }), { code: 'INVALID_COMMAND' });
  g.s.realm = 4; // chuẩn bị tình huống đạt cảnh giới, không sửa cơ chế đột phá
  const before = { stone: g.s.stone, qi: g.s.qi, affinities: JSON.stringify(g.s.npcAffinities) };
  assert.throws(() => run(g, 'ha-05', 'sai'), /không hợp lệ/);
  const selected = STORY.ACTS[0].chapters[4].choices[0].id;
  assert.equal(run(g, 'ha-05', selected).option, selected);
  assert.equal(g.s.story.flags['ha-05'], selected);
  assert.throws(() => run(g, 'ha-05', STORY.ACTS[0].chapters[4].choices[1].id), /không thể đổi/);
  assert.deepEqual({ stone: g.s.stone, qi: g.s.qi, affinities: JSON.stringify(g.s.npcAffinities) }, before);
  const npc = STORY.NPCS.NPC005;
  assert.throws(() => run(g, npc.confidant.id), /Thiện cảm/);
  g.s.npcAffinities.NPC005 = 55;
  const choice = npc.confidant.choices[0].id;
  assert.equal(run(g, npc.confidant.id, choice).option, choice);
  assert.equal(g.s.story.flags[npc.confidant.id], choice);
});

test('bản lưu V7 nâng lên V9, làm sạch cờ sai, không có trọng sinh', () => {
  const g = make();
  run(g, 'ha-01');
  const saved = JSON.parse(JSON.stringify(g.s));
  const clean = H.normalize(saved, NOW + 1000);
  assert.equal(clean.version, 9);
  assert.equal(clean.story.read['ha-01'], true);
  const legacy = { ...saved, version: 7 };
  delete legacy.story;
  const upgraded = H.normalize(legacy, NOW + 1000);
  assert.equal(upgraded.version, 9);
  assert.deepEqual(upgraded.story, { read: {}, flags: {} });
  const dirty = H.normalize({ ...saved, story: {
    read: { 'ha-01': true, evil: true },
    flags: { 'ha-01': 'unknown', 'npc-NPC005-tri-ky': 'unknown', evil: 'unsafe' }
  } }, NOW + 1000);
  assert.deepEqual(dirty.story, { read: { 'ha-01': true }, flags: {} });
  assert.throws(() => C.validate({ type: 'prestige', payload: {} }), { code: 'INVALID_COMMAND' });
});

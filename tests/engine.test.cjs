/* Hợp đồng engine: lệnh, trạng thái, chuyển bản lưu và hành vi từng miền luật.
   Mọi thời điểm và nguồn ngẫu nhiên đều cố định để test không phụ thuộc máy. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const H = require('../engine/game.js');
const C = require('../engine/protocol/commands.js');
const F = H.F;
const DESIGN = require('../data/design.js');
const NOW = 1_700_000_000_000;

const PROFILE = Object.freeze({
  name: 'Hư Không', gender: 'nam', age: 18, race: 'nhan',
  roots: [72, 61, 55, 44, 33], rootType: 'Song',
  talent: { tuongMao: 2, phucDuyen: 2, canCot: 2, ngoTinh: 1, vanKhi: 1 }
});

function seeded(seed = 42) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function character(seed = 42, profile = PROFILE) {
  const rng = seeded(seed);
  const state = H.createCharacter({ ...profile, talent: { ...profile.talent }, roots: [...profile.roots] }, NOW, rng);
  return { state, rng };
}

function game(seed = 42, prepare = null) {
  const { state, rng } = character(seed);
  const g = new H.Game(state, rng);
  if (prepare) prepare(g);
  return g;
}

function rich(seed = 42) {
  return game(seed, g => {
    g.s.stone = 1e9;
    g.s.daoVan = 100;
    g.s.meta.points = 100;
    g.s.extraLife = 1e6;
    g.add('BT-002');
  });
}

function run(g, type, payload = {}, now = NOW) {
  return C.execute(g, { type, payload }, now);
}

test('hợp đồng: engine READY, đủ 46 lệnh và phân miền rõ ràng', () => {
  assert.equal(H.READY, true);
  assert.deepEqual(H.MISSING, []);
  assert.equal(H.VERSION, 7);
  assert.deepEqual(H.SUPPORTED_VERSIONS, [4, 5, 6, 7]);
  assert.equal(C.types.length, 46);
  assert.equal(typeof H.createCharacter, 'function');
  assert.equal(typeof H.normalize, 'function');
  assert.equal(typeof H.create, 'function');
  assert.equal(C.types.length, Object.keys(H.OWNERS).length);
  for (const type of C.types) assert.equal(typeof H.Game.prototype[type], 'function', type);
  for (const name of ['advance', 'isDead', 'checkMeta']) assert.equal(typeof H.Game.prototype[name], 'function', name);

  const expected = {
    progression: ['absorb', 'upgrade', 'upgradeOffline', 'buyMeta', 'breakthrough', 'prestige', 'reincarnate', 'setAuto'],
    inventory: ['buy', 'sell', 'equip', 'learn', 'activate', 'use', 'sellYao', 'bid'],
    crafting: ['craft', 'forge', 'garden'],
    combat: ['strike', 'skill', 'castManual', 'activateArtifact', 'setEnemyKind', 'travel'],
    world: ['claimQuest', 'claimFragments', 'manualEncounter', 'joinSect', 'leaveSect', 'donateSect', 'setBlessing', 'setSectRepeat', 'startSectMission', 'claimSectMission', 'abortSectMission', 'buySect', 'temperRoot'],
    adventures: ['startDungeon', 'abortDungeon'],
    social: ['meetFriend', 'giftFriend', 'discuss', 'npcGift', 'npcOffer', 'duel'],
    time: [],
    creation: []
  };
  assert.deepEqual([...new Set(Object.values(H.OWNERS))].sort(), Object.entries(expected).filter(([, commands]) => commands.length).map(([domain]) => domain).sort());
  for (const [domain, commands] of Object.entries(expected)) for (const type of commands) assert.equal(H.OWNERS[type], domain, type);
});

test('hợp đồng: mọi phương thức truy vấn UI đang gọi đều tồn tại và chạy được', () => {
  const g = rich();
  const queries = ['stats', 'need', 'rate', 'price', 'count', 'ingredientCount', 'maxMp', 'realmLabel', 'enemy', 'chance', 'chaosChance', 'craftChance', 'missionChance', 'encounterChance', 'discussGain', 'attackInterval', 'lifeInfo', 'upgradeBase', 'tribulation', 'temperCost', 'recipe', 'forgeRecipe', 'activeElements', 'manualEffects', 'affinity', 'rivalPower', 'lots', 'estimateDungeon', 'featuredMission', 'sectDefinition', 'sectRank', 'sectMissions', 'sectShopOffer', 'sectIncome'];
  for (const name of queries) assert.equal(typeof g[name], 'function', name);
  assert.ok(g.stats().HP > 0);
  assert.ok(g.need() > 0);
  assert.ok(g.rate() > 0);
  assert.ok(g.price('PILL-001') > 0);
  assert.equal(g.count('PILL-001'), g.s.bag['PILL-001']);
  assert.ok(g.ingredientCount('HERB-001') >= 0);
  assert.ok(g.maxMp() > 0);
  assert.match(g.realmLabel(), /Luyện Khí/);
  assert.ok(g.enemy().HP > 0);
  assert.ok(g.chance() > 0 && g.chance() <= 0.98);
  assert.ok(g.chaosChance() > 0);
  assert.ok(g.craftChance(0) > 0);
  assert.ok(g.missionChance({ tier: 1, stat: 'canCot' }) > 0);
  assert.ok(g.encounterChance() > 0);
  assert.ok(g.discussGain() > 0);
  assert.ok(g.attackInterval() > 0);
  assert.ok(g.lifeInfo().max > g.s.age);
  assert.ok(g.upgradeBase(0) > 0);
  assert.ok(Array.isArray(g.tribulation()));
  assert.ok(g.temperCost(0) > 0);
  assert.ok(g.recipe('PILL-001').herbs);
  assert.ok(g.forgeRecipe('EQ-001').herb);
  assert.deepEqual(g.activeElements(), [0, 1, 2]);
  assert.equal(typeof g.manualEffects().rate, 'number');
  assert.equal(g.affinity(-1), 0);
  assert.ok(g.rivalPower('hanh-chu') > 0);
  assert.ok(g.lots().length > 0);
  assert.ok(g.estimateDungeon('moc') >= 0);
  assert.equal(g.featuredMission().id.length > 0, true);
  assert.equal(g.sectDefinition(), null);
  assert.equal(g.sectRank().index, 0);
  assert.ok(Array.isArray(g.sectMissions()));
  assert.equal(g.sectShopOffer('qi').id, 'qi');
  assert.equal(g.sectShopOffer('qi').locked, true);
  assert.ok(g.sectIncome() > 0);
});

test('state: tạo state trống, tạo nhân vật và giữ đúng hình dạng V7', () => {
  const empty = H.create(NOW);
  assert.equal(empty.created, false);
  assert.equal(empty.version, 7);
  assert.equal(typeof empty.bag, 'object');

  const g = game();
  const s = g.s;
  assert.equal(s.created, true);
  assert.equal(s.name, PROFILE.name);
  assert.equal(s.gender, PROFILE.gender);
  assert.equal(s.age, PROFILE.age);
  assert.equal(s.race, PROFILE.race);
  assert.deepEqual(s.roots, PROFILE.roots);
  assert.equal(s.rootType, PROFILE.rootType);
  assert.equal(s.stone, H.startStone(PROFILE.talent));
  assert.ok(s.bag['MAT-001'] >= 8);
  assert.ok(s.bag['INK-HG'] >= 2);
  assert.equal(s.hp, g.stats().HP);
  assert.equal(s.mp, g.maxMp());
  assert.ok(s.logs.length >= 2);
  assert.equal(g.isDead(), false);
});

test('state: createCharacter từ chối hồ sơ sai', () => {
  const rng = seeded(1);
  const bad = [
    [{ ...PROFILE, name: '' }, /Đạo hiệu/],
    [{ ...PROFILE, gender: 'khac' }, /Hồ sơ/],
    [{ ...PROFILE, age: 13 }, /Tuổi/],
    [{ ...PROFILE, roots: [70, 60, 50, 40] }, /Linh căn/],
    [{ ...PROFILE, roots: [101, 60, 50, 40, 30] }, /Linh căn/],
    [{ ...PROFILE, rootType: 'Hỗn Độn' }, /Hỗn Độn/],
    [{ ...PROFILE, rootType: 'Âm Dương' }, /Âm Dương/],
    [{ ...PROFILE, rootType: 'Dị', rootSub: 'sai' }, /Dị linh căn/],
    [{ ...PROFILE, talent: { tuongMao: 9 } }, /Thiên phú/]
  ];
  for (const [profile, message] of bad) assert.throws(() => H.createCharacter(profile, NOW, rng), message);
  assert.throws(() => H.createCharacter(PROFILE, NOW, null), /ngẫu nhiên/);
  assert.throws(() => H.createCharacter(PROFILE, NaN, rng), /thời gian/);
});

test('state: normalize nâng cấp V4–V7 và loại bản lưu hỏng', () => {
  const g = rich();
  const saved = JSON.parse(JSON.stringify(g.s));

  for (const version of [5, 6, 7]) {
    const raw = { ...JSON.parse(JSON.stringify(saved)), version };
    const next = H.normalize(raw, NOW + 1000);
    assert.ok(next, 'v' + version);
    assert.equal(next.version, 7);
    assert.equal(next.created, true);
    assert.equal(next.name, saved.name);
    assert.equal(next.realm, saved.realm);
  }

  const v4 = H.normalize({
    version: 4,
    player: { realmName: 'Kim Đan', realmLevel: 2, tuvi: 100, lingThach: 2000, tienNgoc: 9 },
    creation: { daoHieu: 'Cổ Nhân', gender: 'nam', race: 'nhan', elements: ['Kim', 'Hỏa'] },
    resources: { jade: 5000, gold: 12 }
  }, NOW);
  assert.ok(v4);
  assert.equal(v4.version, 7);
  assert.equal(v4.realm, 2);
  assert.equal(v4.name, 'Cổ Nhân');
  assert.equal(v4.stone, 5000);
  assert.deepEqual(v4.roots, [72, 30, 30, 72, 30]);

  assert.equal(H.normalize(null, NOW), null);
  assert.equal(H.normalize({ version: 3, created: true }, NOW), null);
  assert.equal(H.normalize({ version: 7, created: false }, NOW), null);
  assert.equal(H.normalize({ version: 7 }, NOW), null);

  const dirty = {
    ...JSON.parse(JSON.stringify(saved)),
    bag: { __proto__: { polluted: 1 }, 'KHÔNG-CÓ': 99, 'PILL-001': -5, 'HERB-001': 2.9 },
    roots: [999, -5, 70, 60, 50],
    talent: { tuongMao: 999, phucDuyen: -2 },
    settings: { musicVolume: 999, motionMode: 'sai' }
  };
  const clean = H.normalize(dirty, NOW + 1000);
  assert.ok(clean);
  assert.equal(Object.hasOwn(clean.bag, '__proto__'), false);
  assert.equal(Object.hasOwn(clean.bag, 'KHÔNG-CÓ'), false);
  assert.equal(clean.bag['PILL-001'], undefined);
  assert.equal(clean.bag['HERB-001'], 2);
  assert.deepEqual(clean.roots, [100, 0, 70, 60, 50]);
  assert.ok(clean.talent.tuongMao <= H.TALENT_MAX);
  assert.ok(clean.talent.phucDuyen >= 0);
  assert.equal(clean.settings.musicVolume, 100);
  assert.equal(clean.settings.motionMode, 'auto');
  assert.equal(clean.version, 7);

  const backwards = H.normalize({ ...JSON.parse(JSON.stringify(saved)), lastUpdate: NOW + 60_000, lastSaved: NOW + 60_000 }, NOW);
  assert.equal(backwards.lastUpdate, NOW);
  assert.match(backwards.logs[0], /Giờ máy lùi/);
});

test('creation + time: tu vi, tuổi và offline có trần theo phiên', () => {
  const g = rich();
  g.s.auto = false;
  const before = g.s.qi;
  const report = g.advance(NOW + 1000);
  assert.equal(report.seconds, 1);
  assert.ok(report.exp > 0);
  assert.ok(g.s.qi >= before);
  assert.equal(g.s.lastUpdate, NOW + 1000);
  assert.ok(g.s.tick >= 1);

  g.s.extraLife = 1e6;
  g.s.auto = false;
  const offline = g.advance(NOW + 10 * 86400000, true);
  assert.equal(offline.seconds, F.offline_cap(g.s.offlineCap));
  assert.equal(offline.died, false);
  assert.equal(g.s.lastUpdate, NOW + 10 * 86400000);
});

test('time: chết vì thọ nguyên, chặn lệnh thường và cho chuyển thế', () => {
  const g = game();
  g.s.age = g.maxLife();
  assert.equal(g.isDead(), true);
  assert.throws(() => run(g, 'strike'), /Thọ nguyên đã cạn/);
  const reward = run(g, 'reincarnate');
  assert.equal(typeof reward, 'number');
  assert.equal(g.s.created, true);
  assert.equal(g.s.rebirths, 1);
  assert.equal(g.isDead(), false);
  assert.match(g.s.logs[0], /Trọng sinh/);

  const h = game();
  h.s.extraLife = 0;
  h.s.age = h.maxLife() - 0.001;
  h.s.auto = false;
  const report = h.advance(NOW + 86400000);
  assert.equal(report.died, true);
  assert.equal(h.isDead(), true);
  assert.equal(h.s.age, h.maxLife());
});

test('progression: hấp thụ, nâng cấp, đột phá thất bại/thành công và thành tựu', () => {
  const g = rich();
  const stone = g.s.stone;
  const got = run(g, 'absorb', { index: 0 });
  assert.ok(got > 0);
  assert.ok(g.s.stone < stone);
  assert.ok(g.s.qi > 0);

  const tech = g.s.tech[0];
  assert.equal(run(g, 'upgrade', { index: 0, count: 1 }), 1);
  assert.equal(g.s.tech[0], tech + 1);
  assert.throws(() => run(g, 'upgrade', { index: 9 }), { code: 'INVALID_COMMAND' });

  g.s.qi = g.need();
  g.rng = () => 0.999999;
  const failed = run(g, 'breakthrough');
  assert.equal(failed.success, false);
  assert.ok(g.s.qi < g.need());
  assert.equal(g.s.pity, 1);

  g.s.qi = g.need();
  g.rng = () => 0;
  const success = run(g, 'breakthrough');
  assert.equal(success.success, true);
  assert.equal(g.s.stage, 2);
  assert.equal(g.s.qi, 0);
  assert.equal(g.s.pity, 0);

  const achievements = g.checkMeta();
  assert.ok(achievements.some(a => a.id === 'first_break'));
  assert.ok(g.s.meta.points >= 1);
  assert.deepEqual(g.checkMeta(), []);

  g.s.progress.kill = 100;
  assert.ok(g.checkMeta().some(a => a.id === 'kills_100'));
});

test('progression: Thiên mệnh, trọng sinh giữ meta và đổi vận may', () => {
  const g = rich();
  const points = g.s.meta.points;
  const bought = run(g, 'buyMeta', { key: 'exp' });
  assert.equal(bought.level, 1);
  assert.equal(g.s.meta.upgrades.exp, 1);
  assert.equal(g.s.meta.points, points - 2);
  g.s.meta.upgrades.exp = H.META_UPGRADES.exp.max;
  assert.throws(() => run(g, 'buyMeta', { key: 'exp' }), /tối đa/);
  assert.throws(() => run(g, 'buyMeta', { key: 'khong-co' }), { code: 'INVALID_COMMAND' });

  g.s.totalRunExp = 1e12;
  g.s.realm = 3;
  const oldName = g.s.name;
  const oldDaoVan = g.s.daoVan;
  const reward = run(g, 'prestige');
  assert.ok(reward >= 10);
  assert.equal(g.s.rebirths, 1);
  assert.equal(g.s.name, oldName);
  assert.equal(g.s.daoVan, oldDaoVan + reward);
  assert.ok(g.s.meta.history.length >= 1);
  assert.ok(g.s.meta.points > 0);
  assert.equal(g.s.qi <= g.need(), true);

  const cap = g.s.offlineCap;
  run(g, 'upgradeOffline', { type: 'cap' });
  assert.equal(g.s.offlineCap, cap + 1);
  assert.ok(g.s.daoVan < oldDaoVan + reward);
  assert.equal(run(g, 'setAuto', { enabled: true }), true);
  assert.equal(g.s.auto, true);
});

test('inventory: mua bán, trang bị, học công pháp và đấu giá', () => {
  const g = rich();
  const stone = g.s.stone;
  run(g, 'buy', { code: 'PILL-001' });
  assert.ok(g.s.stone < stone);
  assert.ok(g.count('PILL-001') >= 1);

  const beforeSell = g.s.stone;
  const gained = run(g, 'sell', { code: 'PILL-001' });
  assert.ok(gained > 0);
  assert.equal(g.s.stone, beforeSell + gained);

  assert.equal(run(g, 'equip', { code: 'EQ-001' }), true);
  assert.ok(g.s.equipment.includes('EQ-001'));
  assert.equal(run(g, 'equip', { code: 'EQ-001' }), false);
  assert.equal(g.s.equipment.includes('EQ-001'), false);

  run(g, 'learn', { code: 'BT-002' });
  assert.ok(g.s.learned['BT-002'] > 0);
  assert.ok(g.s.activeManuals.includes('BT-002'));
  assert.equal(run(g, 'activate', { code: 'BT-002' }), false);
  assert.equal(run(g, 'activate', { code: 'BT-002' }), true);

  const qi = g.s.qi;
  const message = run(g, 'use', { code: 'PILL-002' });
  assert.match(message, /Tu vi/);
  assert.ok(g.s.qi > qi);

  g.s.yaoValue = 50;
  assert.ok(run(g, 'sellYao') > 0);
  assert.equal(g.s.yaoValue, 0);

  const lot = g.lots()[0].code;
  const bidStone = g.s.stone;
  run(g, 'bid', { code: lot });
  assert.ok(g.s.stone < bidStone);
  assert.equal(g.s.auction.offers[lot] > 0, true);
  const report = g.advance(NOW + 3600000);
  assert.equal(report.died, false);
  assert.deepEqual(g.s.auction.offers, {});
  assert.ok(g.count(lot) >= 1);
});

test('inventory: dùng hạt giống, thuốc hồi phục và vật phẩm không hợp lệ', () => {
  const g = rich();
  run(g, 'use', { code: 'SEED-HERB-001' });
  assert.equal(g.s.garden.length, 1);
  assert.equal(g.s.garden[0].herb, 'HERB-001');
  assert.throws(() => run(g, 'use', { code: 'KHONG-CO' }), { code: 'INVALID_COMMAND' });
  assert.throws(() => run(g, 'buy', { code: 'QITEM-HD-01' }), /chưa mở khóa|hợp lệ/);
  assert.throws(() => run(g, 'learn', { code: 'PILL-001' }), /bí tịch/);
  assert.throws(() => run(g, 'equip', { code: 'PILL-001' }), /pháp bảo/);
});

test('crafting: luyện đan theo hàng đợi, linh điền và rèn pháp bảo', () => {
  const g = rich();
  const pillBefore = g.ingredientCount('PILL-001');
  g.craft({ code: 'PILL-001' }, NOW);
  assert.equal(g.s.craftQueue.length, 1);
  const end = g.s.craftQueue[0].end;
  g.rng = () => 0;
  const report = g.advance(end);
  assert.ok(report.batches >= 1);
  assert.equal(g.s.craftQueue.length, 0);
  assert.ok(g.ingredientCount('PILL-001') > pillBefore);

  g.s.garden = [];
  g.s.gardenSoils = ['đất thường', 'linh điền', 'hỏa địa', 'hàn đàm'];
  g.s.craftBoost = 0;
  run(g, 'use', { code: 'SEED-HERB-001' });
  assert.equal(g.s.garden.length, 1);
  g.advance(NOW + 700000, true);
  const info = g.gardenInfo(g.s.garden[0], NOW + 700000);
  assert.equal(info.ripe, true);
  const harvest = run(g, 'garden', { slot: 0, action: 'harvest' }, NOW + 700000);
  assert.ok(harvest.count >= 3);
  assert.equal(g.s.garden.length, 0);

  run(g, 'garden', { slot: 0, action: 'terrain', terrain: 'hỏa địa' });
  assert.equal(g.s.gardenSoils[0], 'hỏa địa');
  assert.throws(() => run(g, 'garden', { slot: 0, action: 'water' }), /trống/);

  g.s.learned['BT-900'] = 1;
  g.add('HERB-001', 4);
  const eqBefore = g.count('EQ-001');
  run(g, 'forge', { code: 'EQ-001' });
  assert.equal(g.count('EQ-001'), eqBefore + 1);
  assert.throws(() => run(g, 'forge', { code: 'PILL-001' }), /Chỉ rèn|Chế tạo|công thức/);
});

test('combat: đánh thường, kỹ năng, công pháp, pháp bảo và di chuyển', () => {
  const g = rich();
  const hit = run(g, 'strike');
  assert.ok(hit.damage >= 0);
  assert.equal(typeof hit.won, 'boolean');
  assert.throws(() => run(g, 'strike'), /Chưa đến lượt/);

  const mp = g.s.mp;
  run(g, 'skill', { index: 0 }, NOW + 60000);
  assert.ok(g.s.mp < mp);

  run(g, 'learn', { code: 'BT-002' });
  g.s.mp = g.maxMp();
  const cast = run(g, 'castManual', { code: 'BT-002' }, NOW + 120000);
  assert.ok(cast);
  assert.throws(() => run(g, 'castManual', { code: 'BT-002' }, NOW + 120000), /hồi chiêu/);

  run(g, 'equip', { code: 'EQ-001' });
  g.s.mp = g.maxMp();
  const shield = run(g, 'activateArtifact', { code: 'EQ-001' }, NOW + 180000);
  assert.equal(shield, 'giáp ảo');
  assert.ok(g.s.designCombat.shield > 0);

  assert.equal(run(g, 'setEnemyKind', { kind: 'tinh anh' }), 'tinh anh');
  assert.equal(run(g, 'travel', { zone: 0 }), 0);
  assert.throws(() => run(g, 'travel', { zone: 2 }), /chưa đủ/);
  assert.throws(() => run(g, 'setEnemyKind', { kind: 'sai' }), { code: 'INVALID_COMMAND' });
  assert.ok(g.s.locations.includes(0));
});

test('combat: bí cảnh bắt đầu, hủy và hoàn tất theo thời gian', () => {
  const g = rich();
  g.s.realm = 2;
  g.s.stage = 1;
  g.s.zone = 2;
  g.s.hp = g.stats().HP;
  const active = run(g, 'startDungeon', { id: 'moc' });
  assert.equal(active.id, 'moc');
  assert.ok(g.s.dungeon.active);
  assert.throws(() => run(g, 'startDungeon', { id: 'moc' }), /bí cảnh|nhiệm vụ/);
  run(g, 'abortDungeon');
  assert.equal(g.s.dungeon.active, null);

  run(g, 'startDungeon', { id: 'moc' });
  const end = g.s.dungeon.active.end;
  const report = g.advance(end);
  assert.ok(report.dungeon);
  assert.equal(report.dungeon.id, 'moc');
  assert.ok(report.dungeon.floors >= 0 && report.dungeon.floors <= 5);
  assert.equal(g.s.dungeon.active, null);
  assert.equal(g.s.dungeon.records.moc.runs, 1);
});

test('adventures: kỳ ngộ thủ công và kỳ ngộ tự động trong advance', () => {
  const g = rich();
  const got = run(g, 'manualEncounter', { index: 0 });
  assert.ok(got.item || got.part);
  assert.throws(() => run(g, 'manualEncounter', { index: 0 }), /hồi phục/);

  const before = g.s.encounter.total;
  g.rng = () => 0;
  g.s.auto = false;
  const report = g.advance(NOW + 3600000);
  assert.ok(report.encounters.length > 0);
  assert.ok(g.s.encounter.total > before);
  assert.ok(g.s.encounter.recent.length > 0);
});

test('world: nhiệm vụ, mảnh bí cảnh và tôi luyện linh căn', () => {
  const g = rich();
  g.s.progress.kill = 5;
  const q = run(g, 'claimQuest', { id: 'kill' });
  assert.equal(q[0], 'kill');
  assert.ok(g.s.claimed.includes('kill'));
  assert.throws(() => run(g, 'claimQuest', { id: 'kill' }), /nhận thưởng/);

  for (const x of H.ITEMS.filter(x => x.kind === 'QITEM')) g.add(x.code);
  assert.equal(run(g, 'claimFragments'), 10);
  assert.ok(g.s.claimed.includes('fragments'));

  g.s.rootCraft.essence[0] = 10;
  const level = run(g, 'temperRoot', { index: 0 });
  assert.equal(level, 1);
  assert.equal(g.s.rootCraft.essence[0], 8);
  assert.throws(() => run(g, 'temperRoot', { index: 4 }), /Tinh hoa|linh căn/);
});

test('world: tông môn, ủy thác và kho tông môn', () => {
  const g = rich();
  const sect = run(g, 'joinSect', { id: 'thanhvan' });
  assert.equal(sect.id, 'thanhvan');
  assert.equal(g.s.sect.joined, true);
  assert.equal(g.sectDefinition().name, 'Thanh Vân Tông');
  assert.throws(() => run(g, 'joinSect', { id: 'thanhvan' }), /Đã là/);
  assert.equal(run(g, 'setBlessing', { enabled: true }), true);
  assert.equal(g.s.sect.blessing, true);
  assert.equal(run(g, 'setSectRepeat', { enabled: false }), false);
  run(g, 'donateSect');
  assert.ok(g.s.sect.contribution >= 100);

  g.s.sect.earned = 1000;
  g.s.hp = g.stats().HP;
  const mission = run(g, 'startSectMission', { id: 'patrol' });
  assert.equal(mission.id, 'patrol');
  g.s.sect.mission.chance = 1;
  g.rng = () => 0;
  g.advance(mission.end);
  const claimed = run(g, 'claimSectMission', {}, mission.end);
  assert.equal(claimed.success, true);
  assert.ok(claimed.contribution > 0);
  assert.equal(g.s.sect.mission, null);

  g.s.sect.contribution = 1e6;
  const offer = g.sectShopOffer('qi');
  assert.equal(offer.locked, false);
  const bought = run(g, 'buySect', { id: 'qi' });
  assert.ok(bought.item);
  assert.ok(g.count(bought.item.code) >= 2);
  assert.ok(g.s.sect.contribution < 1e6);

  run(g, 'abortSectMission');
  run(g, 'leaveSect');
  assert.equal(g.s.sect.joined, false);
  assert.equal(g.sectDefinition(), null);
});

test('social: kết giao, tặng lễ, luận đạo, NPC và luận kiếm', () => {
  const g = rich();
  const friend = run(g, 'meetFriend', { id: 'trieu-nguyet' });
  assert.ok(friend.affinity >= 12);
  assert.throws(() => run(g, 'meetFriend', { id: 'trieu-nguyet' }), /Đã kết giao/);
  const affinity = friend.affinity;
  run(g, 'giftFriend', { id: 'trieu-nguyet' });
  assert.ok(g.s.social.friends['trieu-nguyet'].affinity > affinity);

  const qi = g.s.qi;
  const discuss = run(g, 'discuss', { id: 'ly-van-du' });
  assert.ok(discuss.gain > 0);
  assert.ok(g.s.qi >= qi);
  assert.throws(() => run(g, 'discuss', { id: 'ly-van-du' }), /bế quan/);

  const change = run(g, 'npcGift', { id: 'NPC002', code: 'HERB-002' });
  assert.ok(change.change > 0);
  assert.ok(g.s.npcAffinities.NPC002 > 0);
  const taught = run(g, 'npcOffer', { id: 'NPC002' });
  assert.equal(taught.role, 'dạy công pháp');
  assert.ok(g.s.learned['BT-003'] > 0);

  const duel = run(g, 'duel', { id: 'hanh-chu' });
  assert.equal(typeof duel.win, 'boolean');
  assert.ok(g.s.social.pvp.wins + g.s.social.pvp.losses === 1);
  assert.throws(() => run(g, 'duel', { id: 'hanh-chu' }), /chờ thêm/);
  assert.throws(() => run(g, 'meetFriend', { id: 'khong-co' }), /không hợp lệ/);
});

test('protocol: kiểm tra payload, chưa tạo nhân vật và lệnh không tồn tại', () => {
  assert.deepEqual(C.validate({ type: 'strike' }), { type: 'strike', payload: {} });
  for (const command of [
    { type: 'khong-co' },
    { type: 'strike', payload: { x: 1 } },
    { type: 'strike', extra: true },
    { type: 'skill', payload: { index: 4 } },
    { type: 'buy', payload: { code: 'KHONG-CO' } },
    { type: 'garden', payload: { slot: 0, action: 'water', terrain: 'sai' } },
    { type: 'travel', payload: { zone: 14 } }
  ]) assert.throws(() => C.validate(command), { code: 'INVALID_COMMAND' });

  const empty = H.create(NOW);
  const g = new H.Game(empty, () => 0.5);
  assert.throws(() => run(g, 'strike'), /Chưa tạo nhân vật/);
  assert.throws(() => C.execute(g, { type: 'strike', payload: {} }, NaN), { code: 'INVALID_COMMAND' });
  assert.throws(() => C.execute(g, { type: 'strike', payload: {} }, -1), { code: 'INVALID_COMMAND' });
});

test('browser: nạp classic script đúng thứ tự index.html và chạy LocalSession', () => {
  const files = [
    'data/balance.js', 'data/items.js', 'data/design-raw.js', 'data/design.js',
    'data/formulas.js', 'data/catalog.js', 'data/roots.js', 'data/character.js',
    'data/social.js', 'data/adventures.js',
    'engine/state/player.js',
    'engine/rules/progression.js', 'engine/rules/inventory.js', 'engine/rules/crafting.js',
    'engine/rules/combat.js', 'engine/rules/world.js', 'engine/rules/adventures.js',
    'engine/rules/social.js', 'engine/rules/time.js', 'engine/rules/creation.js',
    'engine/protocol/commands.js', 'engine/game.js',
    'client/session/local-session.js'
  ];
  const root = { console };
  root.window = root;
  root.globalThis = root;
  runInNewContext('var window = this; var globalThis = this;', root);
  for (const file of files) runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), root, { filename: file });

  assert.equal(root.HU_GAME.READY, true);
  assert.equal(root.HU_GAME.MISSING.length, 0);
  let now = NOW;
  let seed = 9;
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const session = new root.HU_LOCAL_SESSION.LocalSession({ clock: () => now, rng });
  assert.equal(session.ready, true);
  assert.equal(session.game.s.created, false);
  const events = [];
  session.subscribe(event => events.push(event));
  session.create(PROFILE);
  assert.equal(session.game.s.created, true);
  now += 1000;
  const result = session.dispatch('strike');
  assert.equal(typeof result.won, 'boolean');
  session.dispatch('setAuto', runInNewContext('({ enabled: false })', root));
  session.dispatch('joinSect', runInNewContext("({ id: 'thanhvan' })", root));
  now += 5000;
  assert.ok(session.advance().seconds >= 5);
  assert.ok(events.some(event => event.type === 'log'));

  session.game.s.age = session.game.maxLife();
  now += 1000;
  session.advance();
  assert.ok(events.some(event => event.type === 'death'));
  session.dispatch('reincarnate');
  assert.equal(session.game.s.rebirths, 1);
  assert.equal(session.game.isDead(), false);
});

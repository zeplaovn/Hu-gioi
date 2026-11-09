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
  roots: [72, 61, 45, 44, 33], rootType: 'Song',
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

test('hợp đồng: engine READY, đủ 48 lệnh và phân miền rõ ràng', () => {
  assert.equal(H.READY, true);
  assert.deepEqual(H.MISSING, []);
  assert.equal(H.VERSION, 9);
  assert.deepEqual(H.SUPPORTED_VERSIONS, [4, 5, 6, 7, 8, 9]);
  assert.equal(C.types.length, 48);
  assert.equal(typeof H.createCharacter, 'function');
  assert.equal(typeof H.normalize, 'function');
  assert.equal(typeof H.create, 'function');
  assert.equal(C.types.length, Object.keys(H.OWNERS).length);
  for (const type of C.types) assert.equal(typeof H.Game.prototype[type], 'function', type);
  for (const name of ['advance', 'isDead', 'checkMeta']) assert.equal(typeof H.Game.prototype[name], 'function', name);

  const expected = {
    progression: ['absorb', 'upgrade', 'breakthrough', 'setAuto'],
    inventory: ['buy', 'sell', 'equip', 'learn', 'activate', 'use', 'sellYao', 'bid'],
    crafting: ['craft', 'forge', 'garden'],
    combat: ['strike', 'skill', 'castManual', 'activateArtifact', 'setEnemyKind', 'travel', 'startExploration'],
    world: ['claimQuest', 'claimFragments', 'manualEncounter', 'joinSect', 'leaveSect', 'donateSect', 'setBlessing', 'setSectRepeat', 'startSectMission', 'claimSectMission', 'abortSectMission', 'buySect', 'temperRoot', 'storyMark'],
    adventures: ['startDungeon', 'abortDungeon', 'enterDungeon', 'dungeonAct'],
    social: ['meetFriend', 'giftFriend', 'discuss', 'npcGift', 'npcOffer', 'npcQuest', 'duel'],
    time: ['setPreference'],
    creation: []
  };
  assert.deepEqual([...new Set(Object.values(H.OWNERS))].sort(), Object.entries(expected).filter(([, commands]) => commands.length).map(([domain]) => domain).sort());
  for (const [domain, commands] of Object.entries(expected)) for (const type of commands) assert.equal(H.OWNERS[type], domain, type);
});

test('hợp đồng: mọi phương thức truy vấn UI đang gọi đều tồn tại và chạy được', () => {
  const g = rich();
  const queries = ['npcQuestInfo', 'npcPrice', 'npcDiscount', 'runEnemy', 'stats', 'need', 'rate', 'price', 'count', 'ingredientCount', 'maxMp', 'realmLabel', 'enemy', 'chance', 'chaosChance', 'craftChance', 'missionChance', 'encounterChance', 'discussGain', 'attackInterval', 'lifeInfo', 'upgradeBase', 'tribulation', 'breakthroughOdds', 'temperCost', 'recipe', 'forgeRecipe', 'activeElements', 'manualEffects', 'affinity', 'rivalPower', 'lots', 'estimateDungeon', 'featuredMission', 'sectDefinition', 'sectRank', 'sectMissions', 'sectShopOffer', 'sectIncome'];
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
  assert.deepEqual(g.activeElements(), [0, 1]);
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

test('state: tạo state trống, tạo nhân vật và giữ đúng hình dạng V9', () => {
  const empty = H.create(NOW);
  assert.equal(empty.created, false);
  assert.equal(empty.version, 9);
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

test('state: normalize nâng cấp V4–V9 và loại bản lưu hỏng', () => {
  const g = rich();
  const saved = JSON.parse(JSON.stringify(g.s));

  for (const version of [5, 6, 7, 8]) {
    const raw = { ...JSON.parse(JSON.stringify(saved)), version };
    const next = H.normalize(raw, NOW + 1000);
    assert.ok(next, 'v' + version);
    assert.equal(next.version, 9);
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
  assert.equal(v4.version, 9);
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
  assert.equal(clean.version, 9);

  const backwards = H.normalize({ ...JSON.parse(JSON.stringify(saved)), lastUpdate: NOW + 60_000, lastSaved: NOW + 60_000 }, NOW);
  assert.equal(backwards.lastUpdate, NOW);
  assert.match(backwards.logs[0], /Đồng hồ thiết bị bị chỉnh lùi/);
});

test('creation + time: tu vi, tuổi chỉ tăng online; offline đóng băng', () => {
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
  assert.equal(offline.seconds, 0);
  assert.equal(offline.paused, true);
  assert.equal(offline.died, false);
  assert.equal(g.s.lastUpdate, NOW + 10 * 86400000);
});

test('time: hết thọ nguyên cấm mọi lệnh, không có chuyển thế', () => {
  const g = game();
  g.s.age = g.maxLife();
  assert.equal(g.isDead(), true);
  assert.throws(() => run(g, 'strike'), /tọa hóa/);
  assert.throws(() => run(g, 'reincarnate'), { code: 'INVALID_COMMAND' });
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

  // Tiểu cảnh giới tự động đột phá khi tu vi đầy, không cần bấm nút.
  g.s.stage = 1;
  g.s.qi = 0;
  g.gainExp(g.need());
  assert.equal(g.s.stage, 2);
  assert.equal(g.s.qi, 0);

  // Đại cảnh giới: dừng ở tầng cuối, chỉ đột phá khi bấm tay (có thể thất bại).
  g.s.stage = F.STAGES[g.s.realm];
  g.s.qi = g.need();
  g.rng = () => 0.999999;
  const failed = run(g, 'breakthrough');
  assert.equal(failed.success, false);
  assert.equal(g.s.death.cause, 'tribulation');
  assert.equal(g.isDead(), true);
  assert.equal(g.s.pity, 0);
  assert.throws(() => run(g, 'buy', { code: 'HERB-001' }), /tọa hóa/);

  const victor = rich();
  victor.s.stage = F.STAGES[victor.s.realm];
  victor.s.qi = victor.need();
  victor.rng = () => 0;
  const realm = victor.s.realm;
  const success = run(victor, 'breakthrough');
  assert.equal(success.success, true);
  assert.equal(victor.s.realm, realm + 1);
  assert.equal(victor.s.stage, 1);
  assert.equal(victor.s.qi, 0);
  assert.equal(victor.s.pity, 0);
  assert.equal(victor.s.death, null);

  const achievements = victor.checkMeta();
  assert.ok(achievements.some(a => a.id === 'first_break'));
  assert.equal(victor.s.meta.points, 100, 'điểm cũ không tăng thêm');
  assert.deepEqual(victor.checkMeta(), []);

  victor.s.progress.kill = 100;
  assert.ok(victor.checkMeta().some(a => a.id === 'kills_100'));
});

test('Thiên mệnh chọn lúc tạo, không được trọng sinh hoặc nâng bế quan', () => {
  for (const key of Object.keys(H.META_UPGRADES)) {
    const s = H.createCharacter({ ...PROFILE, destiny: key }, NOW, seeded(5));
    assert.equal(s.destiny, key);
    assert.equal(s.meta.upgrades[key], 1);
    assert.equal(Object.values(s.meta.upgrades).filter(Boolean).length, 1);
    assert.equal(s.meta.points, 0);
  }
  assert.throws(() => H.createCharacter({ ...PROFILE, destiny: 'hacked' }, NOW, seeded(5)), /Thiên mệnh/);
  const g = rich();
  for (const type of ['buyMeta', 'prestige', 'reincarnate', 'upgradeOffline'])
    assert.throws(() => run(g, type), { code: 'INVALID_COMMAND' });
  assert.equal(run(g, 'setAuto', { enabled: true }), true);
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
  const beforePause = g.s.garden[0].end;
  g.advance(NOW + 700000, true);
  assert.equal(g.s.garden[0].end, beforePause + Math.max(0, NOW + 700000 - end));
  assert.equal(g.gardenInfo(g.s.garden[0], NOW + 700000).ripe, false);
  g.advance(g.s.garden[0].end);
  const info = g.gardenInfo(g.s.garden[0], g.s.lastUpdate);
  assert.ok(info.ripe || g.s.garden[0].wilt, 'cây online có thể héo nếu không chăm');
  const harvest = run(g, 'garden', { slot: 0, action: 'harvest' }, g.s.lastUpdate);
  assert.equal(typeof harvest.message, 'string');
  assert.equal(g.s.garden.length, 0);

  run(g, 'garden', { slot: 0, action: 'terrain', terrain: 'hỏa địa' });
  assert.equal(g.s.gardenSoils[0], 'hỏa địa');
  assert.throws(() => run(g, 'garden', { slot: 0, action: 'water' }), /trống/);

  g.s.learned['BT-900'] = 1;
  g.add('HERB-001', 4);
  const eqBefore = g.count('EQ-001');
  assert.throws(() => run(g, 'forge', { code: 'EQ-001' }), /mở ở cảnh giới Kết Đan/);
  g.s.realm = Math.max(g.s.realm, 2);
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

test('adventures: kỳ ngộ thủ công cũ vẫn hợp lệ; kỳ ngộ thụ động chuyển sang lịch luyện', () => {
  const g = rich();
  const got = run(g, 'manualEncounter', { index: 0 });
  assert.ok(got.item || got.part);
  assert.throws(() => run(g, 'manualEncounter', { index: 0 }), /hồi phục/);

  const before = g.s.encounter.total;
  g.rng = () => .99;
  const report = g.advance(NOW + 3600000);
  assert.equal(report.encounters.length, 0);
  assert.equal(g.s.encounter.total, before);
  const expedition = run(g, 'startExploration', {}, NOW + 3600000);
  assert.equal(expedition.kind, 'encounter');
  g.advance(expedition.end);
  assert.equal(g.s.encounter.total, before + 1);
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
  g.s.realm = Math.max(g.s.realm, 3);
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
    'data/social.js', 'data/adventures.js', 'data/story.js',
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
  assert.throws(() => session.dispatch('reincarnate'), { code: 'INVALID_COMMAND' });
  assert.equal(session.game.isDead(), true);
});

test('progression: tự đột phá nhiều tầng liên tiếp và dừng ở tầng cuối đại cảnh giới', () => {
  const g = rich();
  g.s.realm = 0;
  g.s.stage = 1;
  g.s.qi = 0;
  const peak = F.STAGES[0];
  let total = 0;
  for (let st = 0; st < peak; st++) total += F.exp_need(0, st);
  const gained = g.gainExp(total * 3);
  assert.equal(g.s.realm, 0);
  assert.equal(g.s.stage, peak);
  assert.equal(g.s.qi, g.need());
  assert.ok(gained > 0 && gained <= total * 3);
  assert.equal(g.isPeakStage(), true);
  assert.equal(g.autoStage(), false);
  // tu vi đầy ở tầng cuối: không tự lên đại cảnh giới.
  g.gainExp(1e9);
  assert.equal(g.s.realm, 0);
});

/* ---------- Bí cảnh tương tác (đánh từng lượt, thể lực) ---------- */
function inRealm(realm = 2) {
  const g = rich();
  g.s.realm = realm; g.s.stage = 1; g.s.zone = realm;
  g.s.hp = g.stats().HP; g.s.mp = g.maxMp();
  return g;
}
/* Người chơi biết chơi: thủ thế khi địch tung đòn nặng, hồi phục khi yếu, trọng kích khi đủ thể lực. */
function smartAction(g) {
  const r = g.s.dungeon.run, st = g.stats();
  if (g.s.hp < st.HP * .4 && r.healCd === 0 && g.s.mp >= g.maxMp() * .18) return 'heal';
  if (r.intent === 'heavy') return 'guard';
  if (r.sta >= 24) return 'power';
  return r.sta >= 8 ? 'attack' : 'guard';
}
function playOut(g, policy = smartAction, limit = 400) {
  for (let i = 0; i < limit && g.s.dungeon.run; i++) {
    const out = run(g, 'dungeonAct', { action: policy(g) });
    if (out.ended) return out.ended;
  }
  return null;
}

test('bí cảnh tương tác: vào, loại trừ với chuyến tự động và nhiệm vụ tông môn', () => {
  const g = inRealm();
  const r = run(g, 'enterDungeon', { id: 'kim' });
  assert.equal(r.floor, 1);
  assert.equal(r.sta, r.staMax);
  assert.equal(r.staMax, Math.round(g.stats().STA));
  assert.ok(['light', 'heavy'].includes(r.intent));
  assert.equal(g.s.auto, false);
  assert.throws(() => run(g, 'enterDungeon', { id: 'kim' }), /bí cảnh|nhiệm vụ/);
  assert.throws(() => run(g, 'startDungeon', { id: 'kim' }), /bí cảnh|nhiệm vụ/);
  run(g, 'joinSect', { id: 'thanhvan' });
  assert.throws(() => run(g, 'startSectMission', { id: g.sectMissions()[0].id }), /bí cảnh|nhiệm vụ/);
  assert.throws(() => run(game(), 'dungeonAct', { action: 'attack' }), /Chưa vào bí cảnh/);
  const weak = inRealm();
  weak.s.hp = weak.stats().HP * .3;
  assert.throws(() => run(weak, 'enterDungeon', { id: 'kim' }), /50% sinh lực/);
  const early = game();
  assert.throws(() => run(early, 'enterDungeon', { id: 'kim' }), /chưa mở/);
});

test('bí cảnh tương tác: thể lực giới hạn đòn mạnh, thủ thế hồi thể lực và giảm sát thương', () => {
  const g = inRealm();
  run(g, 'enterDungeon', { id: 'kim' });
  const r = g.s.dungeon.run;
  r.sta = 5;
  assert.throws(() => run(g, 'dungeonAct', { action: 'attack' }), /thể lực/);
  assert.throws(() => run(g, 'dungeonAct', { action: 'power' }), /thể lực/);
  const before = g.s.hp;
  r.intent = 'heavy';
  run(g, 'dungeonAct', { action: 'guard' });
  assert.ok(g.s.dungeon.run.sta > 5, 'thủ thế phải hồi thể lực');
  const guarded = before - g.s.hp;
  const h = inRealm();
  run(h, 'enterDungeon', { id: 'kim' });
  h.s.dungeon.run.intent = 'heavy';
  h.s.dungeon.run.enemyHp = h.s.dungeon.run.enemyMax = 1e15; // không bị hạ trong lượt thử
  const start = h.s.hp;
  run(h, 'dungeonAct', { action: 'attack' });
  const open = start - h.s.hp;
  assert.ok(guarded < open || open === 0, 'đỡ đòn nặng phải nhẹ hơn nhận trọn');
  const cost = g.stats().STA >= 24 ? 24 : 0;
  g.s.dungeon.run.sta = 30;
  run(g, 'dungeonAct', { action: 'power' });
  assert.ok(g.s.dungeon.run.sta <= 30 - cost + 4 + 1e-9);
});

test('bí cảnh tương tác: hồi phục tốn linh khí và có hồi chiêu theo lượt', () => {
  const g = inRealm();
  run(g, 'enterDungeon', { id: 'kim' });
  g.s.hp = g.stats().HP * .5;
  const mp = g.s.mp;
  run(g, 'dungeonAct', { action: 'heal' });
  assert.ok(g.s.mp < mp);
  assert.throws(() => run(g, 'dungeonAct', { action: 'heal' }), /lượt/);
  g.s.mp = 0;
  g.s.dungeon.run.healCd = 0;
  assert.throws(() => run(g, 'dungeonAct', { action: 'heal' }), /linh khí/);
});

test('bí cảnh tương tác: thông quan, rút lui và thất bại đều chốt thưởng đúng', () => {
  const win = inRealm(0);
  win.s.hp = win.stats().HP;
  run(win, 'enterDungeon', { id: 'moc' });
  const stone = win.s.stone;
  const done = playOut(win);
  assert.ok(done && done.success, 'người chơi biết thủ thế phải thông quan bí cảnh đầu');
  assert.equal(done.floors, 5);
  assert.equal(done.why, 'clear');
  assert.equal(win.s.dungeon.run, null);
  assert.ok(win.s.stone > stone);
  assert.equal(win.s.dungeon.records.moc.clears, 1);
  assert.equal(win.s.dungeon.last.floors, 5);
  assert.ok(done.essence.some(n => n > 0));
  // thưởng chủ động cao hơn thưởng tự động cùng điều kiện (thông quan đầu ×2 cả hai, cộng thêm hệ số tay + 1 tinh hoa)
  const auto = inRealm(0);
  run(auto, 'startDungeon', { id: 'moc' });
  const report = auto.advance(auto.s.dungeon.active.end);
  if (report.dungeon.success) {
    assert.ok(done.stone > report.dungeon.stone);
    assert.ok(done.essence.reduce((a, b) => a + b) > report.dungeon.essence.reduce((a, b) => a + b) - 3);
  }

  const out = inRealm();
  run(out, 'enterDungeon', { id: 'kim' });
  const retreat = run(out, 'dungeonAct', { action: 'retreat' }).ended;
  assert.equal(retreat.floors, 0);
  assert.equal(retreat.stone, 0);
  assert.equal(retreat.why, 'retreat');
  assert.equal(out.s.dungeon.run, null);
  assert.equal(out.s.dungeon.records.kim.best, 0);

  const lose = inRealm(0);
  run(lose, 'enterDungeon', { id: 'moc' });
  lose.s.hp = 1; // sinh lực cạn giữa chừng: bị đánh trúng một lần là thất bại
  const lost = playOut(lose, g => g.s.dungeon.run.sta >= 8 ? 'attack' : 'guard');
  assert.ok(lost && lost.died && lost.why === 'combat');
  assert.equal(lose.s.hp, 0);
  assert.equal(lose.s.death.cause, 'combat');
  assert.equal(lose.s.dungeon.run, null);
});

test('bí cảnh tương tác: đang đánh thì không tự hồi, không lịch luyện và không tự chiến offline', () => {
  const g = inRealm();
  run(g, 'enterDungeon', { id: 'kim' });
  g.s.hp = g.stats().HP * .6;
  g.s.mp = g.maxMp() * .3;
  const hp = g.s.hp, mp = g.s.mp;
  g.advance(NOW + 20_000);
  assert.equal(g.s.hp, hp);
  assert.equal(g.s.mp, mp);
  assert.ok(g.s.dungeon.run, 'chuyến tương tác không hết hạn theo thời gian');
  assert.throws(() => run(g, 'strike'), /bí cảnh/);
  assert.throws(() => run(g, 'skill', { index: 0 }), /bí cảnh/);
  run(g, 'setAuto', { enabled: true });
  g.advance(NOW + 40_000, true);
  assert.equal(g.s.hp, hp);
});

test('bí cảnh tương tác: lưu/tải giữ nguyên chuyến, dữ liệu hỏng bị loại', () => {
  const g = inRealm();
  run(g, 'enterDungeon', { id: 'kim' });
  run(g, 'dungeonAct', { action: 'guard' });
  const saved = JSON.parse(JSON.stringify(g.s));
  const back = H.normalize(saved, NOW + 1000);
  assert.deepEqual(back.dungeon.run, g.s.dungeon.run);
  const bad = JSON.parse(JSON.stringify(g.s));
  bad.dungeon.run.id = 'khong-co';
  assert.equal(H.normalize(bad, NOW).dungeon.run, null);
  const low = JSON.parse(JSON.stringify(g.s));
  low.realm = 0;
  assert.equal(H.normalize(low, NOW).dungeon.run, null);
  const wild = JSON.parse(JSON.stringify(g.s));
  Object.assign(wild.dungeon.run, { floor: 99, sta: -5, healCd: 1e9, enemyHp: 'x', intent: 'hack', log: [1, 2, 3, 4, 5, 6, 7, 8] });
  const fixed = H.normalize(wild, NOW).dungeon.run;
  assert.ok(fixed.floor <= 6 && fixed.sta >= 0 && fixed.healCd <= 10 && fixed.log.length <= 6);
  assert.equal(fixed.intent, 'light');
  assert.ok(fixed.enemyHp > 0 && fixed.enemyHp <= fixed.enemyMax);
  const v6 = JSON.parse(JSON.stringify(g.s));
  delete v6.dungeon.run;
  assert.equal(H.normalize(v6, NOW).dungeon.run, null);
});

/* ---------- NPC: nhiệm vụ riêng và ưu đãi theo thiện cảm ---------- */
test('NPC: chuỗi nhiệm vụ săn yêu thú cần nhận việc rồi hạ đủ số lượng, mở dần theo thiện cảm', () => {
  const g = rich();
  const first = g.npcQuestInfo('NPC001');
  assert.deepEqual([first.step, first.total, first.accepted, first.locked], [0, 3, false, false]);
  assert.equal(first.def.need.type, 'kill');

  assert.equal(run(g, 'npcQuest', { id: 'NPC001' }).accepted, true);
  assert.equal(g.npcQuestInfo('NPC001').accepted, true);
  assert.throws(() => run(g, 'npcQuest', { id: 'NPC001' }), /Chưa đủ điều kiện/);
  g.s.progress.kill += 24;
  assert.equal(g.npcQuestInfo('NPC001').progress, 24);
  assert.throws(() => run(g, 'npcQuest', { id: 'NPC001' }), /Chưa đủ điều kiện/);
  g.s.progress.kill += 1;
  const stone = g.s.stone;
  const done1 = run(g, 'npcQuest', { id: 'NPC001' });
  assert.equal(done1.completed, true);
  assert.equal(g.s.npcAffinities.NPC001, 10);
  assert.ok(g.s.stone > stone);
  assert.equal(g.s.npcQuests.NPC001.step, 1);

  // bước 2 cần thiện cảm 20 và nộp 3 món NPC thích (HERB-001), tiêu hao thật
  assert.equal(g.npcQuestInfo('NPC001').locked, true);
  assert.throws(() => run(g, 'npcQuest', { id: 'NPC001' }), /thiện cảm 20/);
  g.s.npcAffinities.NPC001 = 20;
  const herb = g.count('HERB-001');
  g.take('HERB-001', herb - 2);
  assert.throws(() => run(g, 'npcQuest', { id: 'NPC001' }), /Chưa đủ điều kiện/);
  g.add('HERB-001', 1);
  assert.equal(g.npcQuestInfo('NPC001').ready, true);
  run(g, 'npcQuest', { id: 'NPC001' });
  assert.equal(g.count('HERB-001'), 0);
  assert.equal(g.s.npcAffinities.NPC001, 35);

  // bước 3: thiện cảm 55, hạ 120 yêu thú, nhận 3 đan; sau đó hết chuỗi
  g.s.npcAffinities.NPC001 = 55;
  run(g, 'npcQuest', { id: 'NPC001' });
  g.s.progress.kill += 120;
  const pills = g.count(H.pill(2));
  const last = run(g, 'npcQuest', { id: 'NPC001' });
  assert.equal(last.finished, true);
  assert.equal(g.count(H.pill(2)), pills + 3);
  assert.equal(g.npcQuestInfo('NPC001').done, true);
  assert.throws(() => run(g, 'npcQuest', { id: 'NPC001' }), /hoàn tất/);
});

test('NPC: nhiệm vụ nộp linh thạch, truyền thụ và tiến độ săn không âm sau khi đặt lại kiếp', () => {
  const g = rich();
  g.s.npcAffinities.NPC002 = 60;
  g.s.npcQuests.NPC002 = { step: 2, base: null };
  const info = g.npcQuestInfo('NPC002');
  assert.equal(info.def.need.type, 'stone');
  assert.equal(info.cost, F.income_rate(g.s.realm) * 900);
  const stone = g.s.stone;
  run(g, 'npcQuest', { id: 'NPC002' });
  assert.ok(g.s.stone < stone - info.cost + 1); // trả học phí rồi nhận lại tối đa phần thưởng nhỏ, không tăng
  assert.ok(g.count('BT-003') >= 1 || g.s.learned['BT-003'] > 0);

  g.s.npcAffinities.NPC002 = 60;
  g.s.npcQuests.NPC002 = { step: 2, base: null };
  run(g, 'npcOffer', { id: 'NPC002' });
  const mastery = g.s.learned['BT-003'];
  run(g, 'npcQuest', { id: 'NPC002' });
  assert.ok(g.s.learned['BT-003'] > mastery, 'đã học thì thưởng cộng độ lĩnh ngộ');

  const poor = rich();
  poor.s.npcAffinities.NPC002 = 60;
  poor.s.npcQuests.NPC002 = { step: 2, base: null };
  poor.s.stone = 0;
  assert.throws(() => run(poor, 'npcQuest', { id: 'NPC002' }), /Chưa đủ điều kiện/);

  const reset = rich();
  reset.s.npcQuests.NPC001 = { step: 0, base: 500 };
  reset.s.progress.kill = 10; // bộ đếm đã đặt lại sau trọng sinh: mốc cũ không còn hiệu lực
  assert.equal(reset.npcQuestInfo('NPC001').accepted, false);
  assert.equal(reset.npcQuestInfo('NPC001').progress, 0);
  assert.equal(run(reset, 'npcQuest', { id: 'NPC001' }).accepted, true);
  reset.s.progress.kill = 40;
  assert.equal(reset.npcQuestInfo('NPC001').progress, 25); // tiến độ chốt ở mục tiêu, không vượt
  assert.throws(() => reset.npcQuestInfo('NPC999'), /Không tìm thấy vị đạo hữu/);
  assert.throws(() => C.execute(reset, { type: 'npcQuest', payload: { id: 'NPC001', extra: 1 } }, NOW), /không hợp lệ/);
});

test('NPC: thiện cảm giảm giá khi mua/học, kể cả thợ luyện đan thuê', () => {
  const g = rich();
  g.s.realm = 6; g.s.stage = 1; g.s.stone = 1e6; // đủ nhỏ để sai số số thực không che phép so sánh giá
  const base = F.shop_buy_price(g.price('SEED-HERB-007'));
  assert.equal(g.npcDiscount('NPC011'), 0);
  assert.equal(g.npcPrice('NPC011'), base);
  g.s.npcAffinities.NPC011 = 100;
  assert.equal(g.npcDiscount('NPC011'), H.NPC_DISCOUNT_MAX);
  assert.ok(Math.abs(g.npcPrice('NPC011') - base * (1 - H.NPC_DISCOUNT_MAX)) / base < 1e-9);
  const stone = g.s.stone, seeds = g.count('SEED-HERB-007');
  run(g, 'npcOffer', { id: 'NPC011' });
  assert.ok(Math.abs((stone - g.s.stone) - base * .7) / base < 1e-6);
  assert.equal(g.count('SEED-HERB-007'), seeds + 1);

  // luyện đan thuê (NPC004) nay bán đan riêng của mình
  g.s.stone = 1e11;
  g.s.npcAffinities.NPC004 = 50;
  const pill = g.count('PILL-004');
  const out = run(g, 'npcOffer', { id: 'NPC004' });
  assert.equal(out.role, 'luyện đan thuê');
  assert.equal(g.count('PILL-004'), pill + 1);
  assert.throws(() => run(g, 'npcOffer', { id: 'NPC001' }), /không có vật phẩm/);
  const broke = rich();
  broke.s.stone = 0;
  assert.throws(() => run(broke, 'npcOffer', { id: 'NPC011' }), /linh thạch/);
});

test('NPC: tiến độ nhiệm vụ chỉ tồn tại trong kiếp hiện tại và được làm sạch khi tải', () => {
  const g = rich();
  g.s.npcQuests.NPC001 = { step: 2, base: 7 };
  g.s.npcAffinities.NPC001 = 40;
  assert.throws(() => run(g, 'prestige'), { code: 'INVALID_COMMAND' });

  const saved = JSON.parse(JSON.stringify(g.s));
  saved.progress.kill = 50;
  saved.npcQuests = { NPC001: { step: 99, base: 'x' }, NPC002: { step: 1, base: 12 }, FAKE: { step: 1, base: 0 }, NPC003: 'hỏng' };
  const back = H.normalize(saved, NOW);
  assert.deepEqual(back.npcQuests.NPC001, { step: 3, base: null });
  assert.deepEqual(back.npcQuests.NPC002, { step: 1, base: 12 });
  assert.equal(back.npcQuests.FAKE, undefined);
  assert.equal(back.npcQuests.NPC003, undefined);
  delete saved.npcQuests;
  assert.deepEqual(H.normalize(saved, NOW).npcQuests, {});
});

test('mở khóa tính năng theo cảnh giới: rèn/vẽ phù ở Kết Đan, giao du ở Nguyên Anh', () => {
  const g = rich();
  g.s.realm = 1;
  assert.equal(g.featureOpen('forge'), false);
  assert.equal(g.featureOpen('social'), false);
  assert.throws(() => run(g, 'forge', { code: 'EQ-001' }), /Kết Đan/);
  for (const [type, payload] of [['meetFriend', { id: 'trieu-nguyet' }], ['giftFriend', { id: 'trieu-nguyet' }],
    ['discuss', { id: 'ly-van-du' }], ['duel', { id: 'hanh-chu' }]])
    assert.throws(() => run(g, type, payload), /Nguyên Anh/, type);
  g.s.realm = 2;
  assert.equal(g.featureOpen('forge'), true);
  assert.equal(g.featureOpen('social'), false);
  g.s.realm = 3;
  assert.equal(g.featureOpen('social'), true);
  assert.ok(run(g, 'meetFriend', { id: 'trieu-nguyet' }).affinity >= 12);
  assert.throws(() => g.requireFeature('khong-co'), /không tồn tại/);
});

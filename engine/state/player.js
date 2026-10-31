/* Trạng thái người chơi (schema V7), khởi tạo và chuyển bản lưu V4–V7.
   Chỉ phụ thuộc data/; game.js truyền lớp Game vào normalize để tránh import vòng. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const F = node ? require('../../data/formulas.js') : root.HU_FORMULAS;
  const C = node ? require('../../data/character.js') : root.HU_CHARACTER;
  const D = node ? require('../../data/catalog.js') : root.HU_CATALOG;
  const A = node ? require('../../data/adventures.js') : root.HU_ADVENTURE_DATA;
  const DESIGN = node ? require('../../data/design.js') : root.HU_DESIGN;
  const { RACES, LEGACY_RACES, TALENT_INFO, TALENT_MAX, META_UPGRADES, META_ACHIEVEMENTS, rootType } = C;
  const { item, pill } = D;
  const { ELEMENT_NAMES, DUNGEONS, SECTS, SECT_MISSIONS, ENCOUNTERS } = A;
  const VERSION = 7, SUPPORTED_VERSIONS = Object.freeze([4, 5, 6, 7]), MAX = 1e100;
  const finite = (v, fallback = 0, max = MAX) => Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Number(v))) : fallback;
  const integer = (v, fallback = 0, max = 1e9) => Math.floor(finite(v, fallback, max));
  const uniq = xs => [...new Set(xs)];
  const object = v => !!v && typeof v === 'object' && !Array.isArray(v);

  const initialBag = () => ({
    [pill(2)]: 4, [pill(1)]: 3, [pill(7)]: 1,
    'HERB-001': 8, 'HERB-002': 8, 'HERB-003': 4, 'TAL-001': 2,
    'EQ-001': 1, 'EQ-005': 1, 'BT-001': 1, 'SEED-HERB-001': 2, 'MAT-002': 4
  });
  const designCombatDefault = () => ({
    shield: 0, shieldEnd: 0, heal: null, bleed: null,
    buffs: [], enemyEffects: [], itemCooldowns: {}, manualCooldowns: {}
  });
  const metaDefault = () => ({ points: 0, totalPoints: 0, upgrades: { exp: 0, stone: 0, life: 0, luck: 0 }, achievements: {}, history: [] });
  const normalizeMeta = (raw, now = 0) => {
    const m = metaDefault();
    if (!object(raw)) return m;
    m.points = integer(raw.points, 0, 1e9);
    m.totalPoints = Math.max(m.points, integer(raw.totalPoints, 0, 1e9));
    for (const key of Object.keys(META_UPGRADES)) m.upgrades[key] = Math.min(META_UPGRADES[key].max, integer(raw.upgrades?.[key], 0, META_UPGRADES[key].max));
    const ids = new Set(META_ACHIEVEMENTS.map(a => a.id));
    if (object(raw.achievements)) for (const [id, at] of Object.entries(raw.achievements).slice(0, 64)) {
      if (ids.has(id)) m.achievements[id] = finite(at, now, now) || now;
    }
    if (Array.isArray(raw.history)) m.history = raw.history.filter(h => object(h) && typeof h.name === 'string').slice(0, 20).map(h => ({
      name: h.name.slice(0, 24), realm: integer(h.realm, 0, 13), stage: integer(h.stage, 1, 9),
      rebirths: integer(h.rebirths, 0, 1e6), daoVan: finite(h.daoVan), at: finite(h.at, 0, now),
      cause: String(h.cause || 'Trọng sinh').slice(0, 40)
    }));
    return m;
  };

  const sectDefault = () => ({
    joined: false, id: '', contribution: 0, earned: 0, blessing: false,
    claimedDay: '', mission: null, missionsDone: 0, repeat: false, last: null
  });
  const adventureDefaults = () => ({
    sect: sectDefault(),
    rootCraft: { essence: [0, 0, 0, 0, 0], levels: [0, 0, 0, 0, 0] },
    dungeon: { active: null, records: {}, last: null },
    encounter: { index: 0, usedAt: 0, clock: 0, total: 0, journal: {}, recent: [] }
  });

  function createBase(now) {
    return {
      version: VERSION, created: false, name: 'Hàn Thiên Sơn', gender: 'nam', race: 'nhan',
      roots: [72, 41, 38, 55, 47], rootType: 'Song', rootSub: '', chaosTries: 0,
      talent: { tuongMao: 0, phucDuyen: 0, canCot: 0, ngoTinh: 0, vanKhi: 0 },
      realm: 0, stage: 1, qi: 0, hp: 100, mp: 100, stone: 380, jade: 6, zone: 0,
      auto: false, enemyHp: 0, enemyNum: 0, combatClock: 0, manualAt: 0, enemyKind: 'thường',
      bag: initialBag(), equipment: [], tech: [1, 1, 1, 1], cooldowns: [0, 0, 0, 0],
      learned: {}, activeManuals: [], pity: 0, breakBonus: 0, shield: 0, reduction: 0,
      pillUses: 0, pillRealmExp: 0, permanent: 0, buffs: [], debuffs: [],
      totalRunExp: 0, daoVan: 0, rebirths: 0, rebirthKeep: 0, completed: false,
      offlineCap: 0, offlineEff: 0, age: 18, extraLife: 0, alchemySkill: 0, craftBoost: 0,
      craftQueue: [], garden: [], gardenSoils: ['đất thường', 'linh điền', 'hỏa địa', 'hàn đàm'],
      offlineKills: 0, yaoValue: 0, progress: { kill: 0, meditate: 0, travel: 1, breaks: 0, alchemy: 0 },
      claimed: [], locations: [0], npcAffinities: {},
      auction: { offers: {}, cycle: Math.floor(now / 3600000) },
      social: { friends: {}, pvp: { rating: 1000, wins: 0, losses: 0, streak: 0, best: 1000, lastAt: 0 }, lastDiscuss: 0 },
      meta: metaDefault(), designCombat: designCombatDefault(),
      settings: {
        reducedMotion: false, motionMode: 'auto', season: 'auto', seasonEffects: true,
        cultivationEffects: true, combatEffects: true, music: true, musicVolume: 40, musicTrack: 'auto'
      },
      logs: ['Một đạo cơ duyên mở ra nơi Thanh Vân Sơn.'],
      createdAt: now, lastSaved: now, lastUpdate: now, tick: 0
    };
  }

  function create(now = 0) {
    return { ...createBase(now), ...adventureDefaults() };
  }

  /* Nhiệm vụ/bí cảnh/kỳ ngộ/tôi luyện nằm trong state nhưng dữ liệu định nghĩa ở data/adventures.js. */
  function normalizeAdventures(x, raw, now, Game) {
    x.rootCraft = {
      essence: ELEMENT_NAMES.map((_, i) => integer(raw.rootCraft?.essence?.[i])),
      levels: ELEMENT_NAMES.map((_, i) => x.roots[i] >= 50 ? integer(raw.rootCraft?.levels?.[i], 0, A.TEMPER_MAX) : 0)
    };

    const old = object(raw.sect) ? raw.sect : {}, joined = !!old.joined;
    const id = joined ? (SECTS.some(s => s.id === old.id) ? old.id : 'thanhvan') : '';
    x.sect = {
      ...sectDefault(), joined, id,
      contribution: finite(old.contribution),
      earned: Math.max(finite(old.earned), finite(old.contribution), raw.version < 7 ? integer(old.missionsDone) * 35 : 0),
      blessing: joined && !!old.blessing,
      claimedDay: String(old.claimedDay || '').slice(0, 10),
      missionsDone: integer(old.missionsDone),
      repeat: joined && !!old.repeat
    };
    const g = new Game(x);
    const m = old.mission, def = SECT_MISSIONS.find(s => s.id === m?.id);
    if (joined && object(m) && def && g.sectMissions().includes(def) && Number.isFinite(Number(m.end))) {
      const end = finite(m.end, now, now + def.seconds * 1000);
      x.sect.mission = {
        id: def.id,
        start: Math.min(end, finite(m.start, Math.max(0, end - def.seconds * 1000), now)),
        end,
        realm: integer(m.realm, x.realm, x.realm),
        stage: Math.max(1, integer(m.stage, x.stage, F.STAGES[x.realm])),
        featured: !!m.featured,
        chance: def.legacy ? 1 : Math.max(.1, finite(m.chance, .8, .98))
      };
    }

    const cleanResult = (v, defs) => {
      if (!object(v) || !defs.some(d => d.id === v.id)) return null;
      return {
        id: v.id, at: finite(v.at, 0, now), text: String(v.text || '').slice(0, 500),
        stone: finite(v.stone), exp: finite(v.exp), contribution: integer(v.contribution),
        success: !!v.success, floors: integer(v.floors, 0, 10), first: !!v.first,
        essence: ELEMENT_NAMES.map((_, i) => integer(v.essence?.[i]))
      };
    };
    x.sect.last = cleanResult(old.last, SECT_MISSIONS);

    x.dungeon = { active: null, records: {}, last: cleanResult(raw.dungeon?.last, DUNGEONS) };
    for (const d of DUNGEONS) {
      const r = raw.dungeon?.records?.[d.id];
      if (!object(r)) continue;
      x.dungeon.records[d.id] = {
        best: integer(r.best, 0, d.floors), runs: integer(r.runs), clears: integer(r.clears),
        firstAt: finite(r.firstAt, 0, now)
      };
    }
    const a = raw.dungeon?.active, dungeon = DUNGEONS.find(d => d.id === a?.id);
    if (object(a) && dungeon && x.realm >= dungeon.realm && object(a.stats) && !x.sect.mission && Number.isFinite(Number(a.end))) {
      const end = finite(a.end, now, now + dungeon.seconds * 1000), stats = {};
      for (const k of ['HP', 'ATK', 'DEF', 'CRIT', 'DODGE']) stats[k] = finite(a.stats[k], 0, k === 'CRIT' ? .75 : k === 'DODGE' ? .6 : 1e50);
      if (stats.HP > 0 && stats.ATK > 0) x.dungeon.active = {
        id: dungeon.id,
        start: Math.min(end, finite(a.start, end - dungeon.seconds * 1000, now)),
        end, seed: integer(a.seed, 1, 4294967295), stats,
        hp: finite(a.hp, stats.HP, stats.HP),
        affinity: Math.max(-.35, Math.min(.6, Number(a.affinity) || 0))
      };
    }

    const e = object(raw.encounter) ? raw.encounter : {};
    x.encounter = {
      index: integer(e.index), usedAt: finite(e.usedAt, 0, now),
      clock: finite(e.clock, 0, A.ENCOUNTER_INTERVAL - .001),
      total: 0, journal: {}, recent: []
    };
    for (const d of ENCOUNTERS) {
      const r = e.journal?.[d.id];
      if (!object(r) || !integer(r.count)) continue;
      x.encounter.journal[d.id] = { count: integer(r.count), firstAt: finite(r.firstAt, 0, now), lastAt: finite(r.lastAt, 0, now) };
      x.encounter.total += integer(r.count);
    }
    if (Array.isArray(e.recent)) x.encounter.recent = e.recent
      .filter(v => object(v) && ENCOUNTERS.some(d => d.id === v.id)).slice(0, 12)
      .map(v => ({ id: v.id, at: finite(v.at, 0, now), text: String(v.text || '').slice(0, 500) }));
  }

  function normalize(raw, now, Game) {
    /* Bản lưu Tiên Vân 8.0 (V4) bọc dữ liệu trong player/creation. */
    if (object(raw) && object(raw.player) && (raw.version === undefined || raw.version === 4)) {
      const p = raw.player, c = raw.creation || {};
      const oldNames = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 'Hợp Thể', 'Đại Thừa', 'Chân Tiên', 'Tiên Vương', 'Tiên Đế'];
      const elements = { Kim: 'kim', Mộc: 'moc', Thủy: 'thuy', Hỏa: 'hoa', Thổ: 'tho' };
      raw = {
        ...create(now), version: 5, created: true,
        name: c.daoHieu || 'Vô Danh', gender: c.gender, race: c.race,
        realm: Math.max(0, oldNames.indexOf(p.realmName)), stage: p.realmLevel || 1, qi: p.tuvi || 0,
        stone: raw.resources?.jade ?? p.lingThach ?? 380, jade: raw.resources?.gold ?? p.tienNgoc ?? 6,
        roots: Array.isArray(c.elements) ? Object.entries(elements).map(([name, e]) => (c.elements.includes(name) || c.elements.includes(e)) ? 72 : 30) : [72, 41, 38, 55, 47],
        rootType: undefined, lastSaved: now, lastUpdate: now
      };
    }
    if (!object(raw) || !SUPPORTED_VERSIONS.includes(raw.version) || !raw.created) return null;

    const x = create(now), old = raw.version < 6;
    x.created = true;
    x.name = String(raw.name || x.name).slice(0, 24);
    x.gender = raw.gender === 'nu' ? 'nu' : 'nam';
    x.race = RACES.some(r => r[0] === raw.race) ? raw.race : LEGACY_RACES[raw.race] || 'nhan';
    x.roots = Array.isArray(raw.roots) && raw.roots.length === 5 ? raw.roots.map(v => integer(v, 40, 100)) : x.roots;
    x.rootType = F.LINH_CAN_RATE[raw.rootType] ? raw.rootType : rootType(x.roots);
    x.rootSub = x.rootType === 'Dị' ? (C.DI_LINH_CAN[raw.rootSub] ? raw.rootSub : C.diFromRoots(x.roots)) : '';
    x.realm = integer(raw.realm, 0, 13);
    if (old) x.realm = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 12][Math.min(x.realm, 10)];
    x.stage = old
      ? Math.min(F.STAGES[x.realm], 1 + Math.floor((integer(raw.stage, 1, 9) - 1) * F.STAGES[x.realm] / 9))
      : Math.max(1, integer(raw.stage, 1, F.STAGES[x.realm]));

    const floats = ['qi', 'hp', 'mp', 'stone', 'jade', 'totalRunExp', 'daoVan', 'age', 'extraLife', 'alchemySkill', 'combatClock', 'offlineKills', 'yaoValue', 'tick'];
    for (const k of floats) x[k] = finite(raw[k], x[k]);
    if (old) {
      const oldNeed = 310 * 1.43 ** integer(raw.realm) * 1.25 ** (integer(raw.stage, 1) - 1);
      x.qi = Math.min(1, finite(raw.qi) / oldNeed) * F.exp_need(x.realm, x.stage - 1);
      x.totalRunExp = 0;
      for (let r = 0; r < x.realm; r++) x.totalRunExp += F.realm_exp_total(r);
      for (let s = 0; s < x.stage - 1; s++) x.totalRunExp += F.exp_need(x.realm, s);
      x.totalRunExp += x.qi;
    }

    for (const k of ['pity', 'rebirths', 'offlineCap', 'offlineEff', 'pillUses', 'enemyNum', 'chaosTries'])
      x[k] = integer(raw[k], 0, k === 'pity' ? 15 : k.startsWith('offline') ? 8 : 1e9);

    x.talent = {};
    let talentTotal = 0;
    for (const t of TALENT_INFO) {
      const v = Math.max(0, Math.min(TALENT_MAX - talentTotal, integer(raw.talent?.[t.key], 0, TALENT_MAX)));
      x.talent[t.key] = v;
      talentTotal += v;
    }
    for (const [k, max] of Object.entries({ breakBonus: 10, shield: 8, reduction: .4, pillRealmExp: MAX, permanent: .15, rebirthKeep: .8, craftBoost: 2 }))
      x[k] = finite(raw[k], 0, max);
    if (old && raw.breakBuff) x.breakBonus = .3;

    x.completed = !!raw.completed;
    x.auto = !!raw.auto;
    x.zone = old ? Math.min(x.realm, [0, 0, 1, 2, 3, 5, 9][integer(raw.zone, 0, 6)]) : integer(raw.zone, 0, x.realm);
    x.enemyKind = ['thường', 'tinh anh', 'boss', 'boss kiếp'].includes(raw.enemyKind) ? raw.enemyKind : 'thường';

    x.bag = {};
    if (object(raw.bag)) for (const [key, value] of Object.entries(raw.bag)) {
      if (!item(key)) continue;
      const q = integer(value, 0, 1e9);
      if (q) x.bag[key] = q;
    }
    const validKeys = (values, kind) => Array.isArray(values)
      ? uniq(values.filter(k => item(k)?.kind === kind && x.bag[k] > 0 && item(k).tier <= x.realm + 1))
      : [];
    x.equipment = validKeys(raw.equipment, 'EQ').slice(0, 4);
    x.tech = Array.from({ length: 4 }, (_, i) => Math.max(1, integer(raw.tech?.[i], 1, 21)));
    x.cooldowns = Array.from({ length: 4 }, (_, i) => finite(raw.cooldowns?.[i], 0, now + 86400000));

    const dc = object(raw.designCombat) ? raw.designCombat : {};
    x.designCombat.shield = finite(dc.shield);
    x.designCombat.shieldEnd = finite(dc.shieldEnd, 0, now + 86400000);
    if (x.designCombat.shieldEnd <= now) { x.designCombat.shield = 0; x.designCombat.shieldEnd = 0; }
    if (object(dc.heal) && Number.isFinite(Number(dc.heal.end)) && dc.heal.end > now)
      x.designCombat.heal = { amount: finite(dc.heal.amount), last: finite(dc.heal.last, now, now), end: finite(dc.heal.end, now, now + 86400000) };
    if (object(dc.bleed) && Number.isFinite(Number(dc.bleed.end)) && dc.bleed.end > now)
      x.designCombat.bleed = { pct: finite(dc.bleed.pct, 0, 1), last: finite(dc.bleed.last, now, now), end: finite(dc.bleed.end, now, now + 86400000) };
    if (Array.isArray(dc.buffs)) x.designCombat.buffs = dc.buffs
      .filter(b => object(b) && ['def', 'dodge'].includes(b.type) && Number.isFinite(Number(b.end)) && b.end > now)
      .slice(0, 32)
      .map(b => ({ type: b.type, value: finite(b.value, 0, b.type === 'dodge' ? 1 : MAX), end: finite(b.end, now, now + 86400000) }));
    if (Array.isArray(dc.enemyEffects)) x.designCombat.enemyEffects = dc.enemyEffects
      .filter(e => object(e) && ['freeze', 'stun', 'poison', 'bleed'].includes(e.type) &&
        (e.source === 'root' || item(e.source)?.kind === 'EQ') && Number.isFinite(Number(e.end)) && e.end > now)
      .slice(0, 32)
      .map(e => ({
        type: e.type, source: e.source, end: finite(e.end, now, now + 86400000),
        last: finite(e.last, now, now), stacks: Math.max(1, integer(e.stacks, 1, 3)),
        damage: finite(e.damage), pct: finite(e.pct, 0, 1)
      }));
    for (const name of ['itemCooldowns', 'manualCooldowns']) {
      if (!object(dc[name])) continue;
      for (const [key, value] of Object.entries(dc[name]).slice(0, 128))
        if (item(key)) x.designCombat[name][key] = finite(value, 0, now + 86400000);
    }

    x.learned = {};
    if (object(raw.learned)) for (const [k, v] of Object.entries(raw.learned))
      if (item(k)?.kind === 'BT') x.learned[k] = finite(v, 0, 1);
    x.activeManuals = Array.isArray(raw.activeManuals)
      ? uniq(raw.activeManuals.filter(k => k in x.learned && item(k).tier <= x.realm + 1)).slice(0, 3)
      : [];
    x.buffs = Array.isArray(raw.buffs) ? raw.buffs
      .filter(b => object(b) && ['rate', 'attack'].includes(b.type) && Number.isFinite(b.end) && b.end > 0)
      .slice(0, 64)
      .map(b => ({ type: b.type, points: finite(b.points, 0, 10), end: finite(b.end, 0, now + 86400000) })) : [];
    x.debuffs = Array.isArray(raw.debuffs) ? raw.debuffs.filter(v => typeof v === 'string').slice(0, 8) : [];
    for (const k of Object.keys(x.progress)) x.progress[k] = finite(raw.progress?.[k]);
    x.claimed = Array.isArray(raw.claimed)
      ? uniq(raw.claimed.filter(k => ['kill', 'meditate', 'travel', 'breaks', 'alchemy', 'fragments'].includes(k)))
      : [];
    x.locations = Array.isArray(raw.locations)
      ? uniq([0, ...raw.locations.filter(n => Number.isInteger(n) && n >= 0 && n <= x.realm)])
      : [0];

    x.social = { friends: {}, pvp: { rating: 1000, wins: 0, losses: 0, streak: 0, best: 1000, lastAt: 0 }, lastDiscuss: 0 };
    const rawFriends = raw.social?.friends;
    if (object(rawFriends)) for (const [id, v] of Object.entries(rawFriends).slice(0, 64)) {
      if (!/^[a-z0-9_-]{1,24}$/i.test(id) || !object(v)) continue;
      x.social.friends[id] = {
        affinity: finite(v.affinity, 0, 100), metAt: finite(v.metAt, 0, now),
        giftAt: finite(v.giftAt, 0, now), discussAt: finite(v.discussAt, 0, now + 7 * 864e5)
      };
    }
    const rawPvp = object(raw.social?.pvp) ? raw.social.pvp : {};
    x.social.pvp = {
      rating: finite(rawPvp.rating, 1000, 5000), wins: integer(rawPvp.wins, 0, 1e9),
      losses: integer(rawPvp.losses, 0, 1e9), streak: integer(rawPvp.streak, 0, 1e9),
      best: finite(rawPvp.best, 1000, 5000), lastAt: finite(rawPvp.lastAt, 0, now)
    };
    x.social.lastDiscuss = finite(raw.social?.lastDiscuss, 0, now);
    if (object(raw.npcAffinities)) for (const [id, value] of Object.entries(raw.npcAffinities))
      if (Object.hasOwn(DESIGN.npc, id)) x.npcAffinities[id] = finite(value, 0, 100);

    x.meta = normalizeMeta(raw.meta, now);
    x.auction.cycle = integer(raw.auction?.cycle, x.auction.cycle, x.auction.cycle);
    x.auction.offers = {};
    if (object(raw.auction?.offers)) for (const [k, v] of Object.entries(raw.auction.offers)) {
      if (old && ['0', '1', '2'].includes(k) && finite(v) > 0) x.auction.offers[['EQ-006', 'EQ-002', 'EQ-004'][Number(k)]] = finite(v);
      else if (item(k) && finite(v) > 0) x.auction.offers[k] = finite(v);
    }

    const motionMode = ['auto', 'full', 'reduced'].includes(raw.settings?.motionMode)
      ? raw.settings.motionMode : raw.settings?.reducedMotion ? 'reduced' : 'auto';
    x.settings = {
      reducedMotion: motionMode === 'reduced', motionMode,
      season: ['auto', 'spring', 'summer', 'autumn', 'winter'].includes(raw.settings?.season) ? raw.settings.season : 'auto',
      seasonEffects: raw.settings?.seasonEffects !== false,
      cultivationEffects: raw.settings?.cultivationEffects !== false,
      combatEffects: raw.settings?.combatEffects !== false,
      music: raw.settings?.music !== false,
      musicVolume: Number.isFinite(Number(raw.settings?.musicVolume)) ? Math.max(0, Math.min(100, Math.round(Number(raw.settings.musicVolume)))) : 40,
      musicTrack: ['hu_gioi', 'ngoc_hoa_tram', 'thien_thu'].includes(raw.settings?.musicTrack) ? raw.settings.musicTrack : 'auto'
    };
    x.logs = Array.isArray(raw.logs) ? raw.logs.slice(0, 38).map(v => String(v).slice(0, 240)) : x.logs;
    x.createdAt = finite(raw.createdAt, now, now);
    x.lastSaved = finite(raw.lastSaved, now);
    x.lastUpdate = finite(raw.lastUpdate, raw.lastSaved || now);
    if (x.lastUpdate > now) {
      x.lastUpdate = now;
      x.lastSaved = now;
      x.logs.unshift('Giờ máy lùi: không cộng tiến trình offline.');
    }
    x.enemyHp = finite(raw.enemyHp);
    x.manualAt = finite(raw.manualAt, 0, now);

    x.craftQueue = Array.isArray(raw.craftQueue) ? raw.craftQueue
      .filter(j => object(j) && item(j.code)?.kind === 'PILL' && Number.isFinite(j.end) && Number.isFinite(j.success))
      .slice(0, 3)
      .map(j => ({
        code: j.code, end: finite(j.end, now, now + F.craft_time(13) * 1000),
        success: Math.max(.05, finite(j.success, .9, .95)), quality: integer(j.quality, 0, 3)
      })) : [];

    const terrains = ['đất thường', 'linh điền', 'hỏa địa', 'hàn đàm', 'linh điền có trận pháp'];
    x.gardenSoils = x.gardenSoils.slice();
    if (Array.isArray(raw.gardenSoils)) for (let i = 0; i < 4; i++)
      if (terrains.includes(raw.gardenSoils[i])) x.gardenSoils[i] = raw.gardenSoils[i];
    const slots = new Set();
    x.garden = Array.isArray(raw.garden) ? raw.garden
      .filter(g => object(g) && item(g.herb)?.kind === 'HERB' && Number.isFinite(g.end))
      .slice(0, 4)
      .map(g => {
        const defined = DESIGN.seedsByHerb[item(g.herb).code];
        const total = Math.max(60, F.craft_time(item(g.herb).tier) * 2, (defined?.['thời gian trồng (phút)'] || 0) * 60) * 1000;
        const end = finite(g.end, now, now + total);
        const plantedAt = Math.min(end - 1, finite(g.plantedAt, Math.max(0, end - total), now));
        const slot = Number.isInteger(g.slot) && g.slot >= 0 && g.slot < 4 && !slots.has(g.slot)
          ? g.slot : [0, 1, 2, 3].find(i => !slots.has(i));
        slots.add(slot);
        const steps = integer(g.steps, 0, 6);
        return {
          slot, herb: g.herb, end, plantedAt,
          water: finite(g.water, 1, 1), soil: finite(g.soil, .6, 1), pest: !!g.pest,
          steps, good: finite(g.good, 0, steps * 1.25), dry: integer(g.dry, 0, 3), wilt: !!g.wilt
        };
      }) : [];

    if (old) x.logs.unshift('Đã chuyển bản lưu V5 sang V6: giữ vật phẩm, đổi cảnh giới và tỷ lệ tu vi.');

    normalizeAdventures(x, raw, now, Game);

    const g = new Game(x);
    x.qi = Math.min(x.qi, g.need());
    x.hp = Math.min(x.hp, g.stats().HP);
    x.mp = Math.min(x.mp, g.maxMp());
    x.enemyHp = Math.min(x.enemyHp, g.enemy().HP);
    x.pillRealmExp = Math.min(x.pillRealmExp, F.realm_exp_total(x.realm) * F.P.DAN_REALM_CAP);
    return x;
  }

  const API = { VERSION, SUPPORTED_VERSIONS, implemented: true, create, normalize, metaDefault, normalizeMeta, sectDefault };
  root.HU_PLAYER_STATE = API;
  if (node) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

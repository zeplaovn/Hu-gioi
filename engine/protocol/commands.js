/* Hợp đồng lệnh v1: client chỉ gửi ý định + ID. Không gửi trạng thái, phần thưởng, giá hay đồng hồ.
   File này chỉ kiểm tra payload (schema) và chuyển lệnh tới phương thức cùng tên của Game.
   Quy ước phương thức: game[type](payload, now) — now do bên sở hữu phiên cung cấp. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const F = node ? require('../../data/formulas.js') : root.HU_FORMULAS;
  const C = node ? require('../../data/character.js') : root.HU_CHARACTER;
  const D = node ? require('../../data/catalog.js') : root.HU_CATALOG;

  const VERSION = 1;
  const isObject = v => v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
  const string = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
  const integer = (min, max) => v => Number.isSafeInteger(v) && v >= min && v <= max;
  const boolean = v => typeof v === 'boolean';
  const oneOf = xs => v => xs.includes(v);
  const optional = check => v => v === undefined || check(v);
  const code = v => string(v) && !!D.item(v);
  const TERRAINS = ['đất thường', 'linh điền', 'hỏa địa', 'hàn đàm', 'linh điền có trận pháp'];

  /* Tên lệnh → schema các trường payload. Thêm lệnh mới: khai báo ở đây và gán cho đúng một module trong engine/rules/. */
  const SCHEMAS = Object.freeze({
    // progression
    absorb: { index: integer(0, F.COINS.length - 1) },
    upgrade: { index: integer(0, 3), count: v => v === 'max' || integer(1, 20)(v) },
    upgradeOffline: { type: oneOf(['cap', 'eff']) },
    buyMeta: { key: oneOf(Object.keys(C.META_UPGRADES)) },
    breakthrough: {},
    prestige: {},
    reincarnate: {},
    setAuto: { enabled: boolean },
    // inventory
    buy: { code }, sell: { code }, equip: { code }, learn: { code }, activate: { code }, use: { code },
    sellYao: {},
    bid: { code },
    // crafting
    craft: { code },
    forge: { code },
    garden: { slot: integer(0, 3), action: oneOf(['water', 'soil', 'pest', 'harvest', 'terrain']), terrain: optional(oneOf(TERRAINS)) },
    // combat
    strike: {},
    skill: { index: integer(0, 3) },
    castManual: { code },
    activateArtifact: { code },
    setEnemyKind: { kind: oneOf(Object.keys(F.MONSTER_MULT)) },
    travel: { zone: integer(0, D.ZONES.length - 1) },
    // world
    claimQuest: { id: string },
    claimFragments: {},
    manualEncounter: { index: integer(0, 2) },
    joinSect: { id: string },
    leaveSect: {},
    donateSect: {},
    setBlessing: { enabled: boolean },
    setSectRepeat: { enabled: boolean },
    startSectMission: { id: string },
    claimSectMission: {},
    abortSectMission: {},
    buySect: { id: string, element: optional(integer(0, 4)) },
    temperRoot: { index: integer(0, 4) },
    // adventures
    startDungeon: { id: string },
    abortDungeon: {},
    // social
    meetFriend: { id: string },
    giftFriend: { id: string },
    discuss: { id: string },
    npcGift: { id: string, code },
    npcOffer: { id: string },
    duel: { id: string }
  });

  const types = Object.freeze(Object.keys(SCHEMAS));

  function invalid() {
    const e = Error('Lệnh game không hợp lệ.');
    e.code = 'INVALID_COMMAND';
    throw e;
  }

  /* Trả về { type, payload } đã làm sạch hoặc ném INVALID_COMMAND. Không chấp nhận trường thừa. */
  function validate(command) {
    if (!isObject(command) || Object.keys(command).some(k => !['type', 'payload'].includes(k)) ||
      typeof command.type !== 'string' || !Object.hasOwn(SCHEMAS, command.type)) invalid();
    const fields = SCHEMAS[command.type], payload = command.payload ?? {};
    if (!isObject(payload) || Object.keys(payload).some(k => !Object.hasOwn(fields, k))) invalid();
    for (const [key, check] of Object.entries(fields)) if (!check(payload[key])) invalid();
    return { type: command.type, payload: { ...payload } };
  }

  function execute(game, command, now) {
    const c = validate(command);
    if (!Number.isFinite(now) || now < 0) invalid();
    if (!game.s.created) throw Error('Chưa tạo nhân vật.');
    if (game.isDead() && c.type !== 'reincarnate') throw Error('Thọ nguyên đã cạn. Hãy chuyển thế.');
    return game[c.type](c.payload, now);
  }

  const API = { VERSION, types, validate, execute };
  root.HU_COMMANDS = API;
  if (node) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

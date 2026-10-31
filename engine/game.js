/* Điểm vào engine: ghép dữ liệu thiết kế + trạng thái + các module luật.
   Chạy trong Node (require) và trình duyệt (classic scripts / file://), không đụng DOM, localStorage, mạng hay timer.
   HU_GAME.READY chỉ là true khi mọi lệnh và hàm bắt buộc đã được cài đặt; HU_GAME.MISSING liệt kê phần còn thiếu. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const F = node ? require('../data/formulas.js') : root.HU_FORMULAS;
  const C = node ? require('../data/character.js') : root.HU_CHARACTER;
  const D = node ? require('../data/catalog.js') : root.HU_CATALOG;
  const social = node ? require('../data/social.js') : root.HU_SOCIAL_DATA;
  const adventures = node ? require('../data/adventures.js') : root.HU_ADVENTURE_DATA;
  const S = node ? require('./state/player.js') : root.HU_PLAYER_STATE;
  const P = node ? require('./protocol/commands.js') : root.HU_COMMANDS;
  const RULE_FILES = ['progression', 'inventory', 'crafting', 'combat', 'world', 'adventures', 'social', 'time', 'creation'];
  const RULES = node ? RULE_FILES.map(name => require('./rules/' + name + '.js')) : RULE_FILES.map(name => root.HU_RULES[name]);

  /* Phương thức bắt buộc ngoài các lệnh: do rules/time.js và rules/progression.js cung cấp. */
  const REQUIRED_METHODS = Object.freeze(['advance', 'isDead', 'checkMeta']);

  function notImplemented(name) {
    const fn = function () { const e = Error('Chưa cài đặt: ' + name); e.code = 'NOT_IMPLEMENTED'; throw e; };
    fn.notImplemented = true;
    return fn;
  }

  class Game {
    constructor(state, rng, onLog = null) {
      this.s = state;
      this.rng = typeof rng === 'function' ? rng : () => { throw Error('Thiếu nguồn ngẫu nhiên cho phiên chơi.'); };
      this.onLog = onLog;
    }
    log(message) {
      this.s.logs.unshift(message);
      this.s.logs.length = Math.min(38, this.s.logs.length);
      this.onLog?.(message);
    }
    count(key) { return this.s.bag[key] || 0; }
    add(key, count = 1) {
      if (!D.item(key)) throw Error('Mã vật phẩm không hợp lệ.');
      this.s.bag[key] = Math.min(1e9, this.count(key) + Math.max(0, Math.floor(count)));
    }
    take(key, count = 1) {
      if (this.count(key) < count) throw Error('Không đủ ' + (D.item(key)?.name || 'vật phẩm'));
      this.s.bag[key] -= count;
      if (!this.s.bag[key]) delete this.s.bag[key];
    }
    spend(value) {
      if (!Number.isFinite(value) || value < 0 || this.s.stone < value) throw Error('Không đủ linh thạch.');
      this.s.stone -= value;
    }
  }
  [...P.types, ...REQUIRED_METHODS].forEach(name => { Game.prototype[name] = notImplemented(name); });

  const API = {
    F, ...C, ...D, ...social, ...adventures,
    VERSION: S.VERSION,
    SUPPORTED_VERSIONS: S.SUPPORTED_VERSIONS,
    Game,
    metaDefault: S.metaDefault,
    normalizeMeta: S.normalizeMeta,
    sectDefault: S.sectDefault,
    createCharacter: notImplemented('createCharacter'),
    create: (now = 0) => S.create(now),
    normalize: (raw, now = 0) => S.normalize(raw, now, Game)
  };

  /* Mỗi lệnh phải thuộc đúng một miền luật. */
  const owner = new Map();
  for (const rule of RULES) {
    for (const type of rule.commands) {
      if (!P.types.includes(type)) throw Error(`Miền "${rule.domain}" khai báo lệnh không có trong protocol: ${type}`);
      if (owner.has(type)) throw Error(`Lệnh "${type}" bị khai báo ở cả "${owner.get(type)}" và "${rule.domain}".`);
      owner.set(type, rule.domain);
    }
    rule.install(API);
  }
  const unowned = P.types.filter(type => !owner.has(type));
  if (unowned.length) throw Error('Lệnh chưa thuộc miền luật nào: ' + unowned.join(', '));

  const MISSING = [
    ...(S.implemented === true ? [] : ['state']),
    ...(API.createCharacter.notImplemented ? ['createCharacter'] : []),
    ...[...P.types, ...REQUIRED_METHODS].filter(name => Game.prototype[name].notImplemented)
  ];
  API.MISSING = Object.freeze(MISSING);
  API.READY = MISSING.length === 0;
  API.OWNERS = Object.freeze(Object.fromEntries(owner));

  root.HU_GAME = API;
  if (node) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

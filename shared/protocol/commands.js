/* Hợp đồng lệnh v1: gửi ý định + ID, không gửi trạng thái/phần thưởng/đồng hồ. */
(function(root){
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const H = node ? require('../game.js') : root.HU_GAME;
  const VERSION = 1;
  const object = v => v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
  const string = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
  const integer = (min, max) => v => Number.isSafeInteger(v) && v >= min && v <= max;
  const boolean = v => typeof v === 'boolean';
  const oneOf = xs => v => xs.includes(v);
  const code = v => string(v) && !!H.item(v);
  const optional = check => v => v === undefined || check(v);
  const entry = (fields, run) => ({ fields, run });
  const commands = Object.freeze({
    buy: entry({ code }, (g,p) => g.buy(p.code)),
    sell: entry({ code }, (g,p) => g.sell(p.code)),
    equip: entry({ code }, (g,p) => g.equip(p.code)),
    learn: entry({ code }, (g,p) => g.learn(p.code)),
    activate: entry({ code }, (g,p) => g.activate(p.code)),
    use: entry({ code }, (g,p,now) => g.use(p.code,now)),
    craft: entry({ code }, (g,p,now) => g.craft(p.code,now)),
    forge: entry({ code }, (g,p) => g.forge(p.code)),
    garden: entry({ slot: integer(0,3), action: oneOf(['water','soil','pest','harvest']) }, (g,p,now) => g.gardenAct(p.slot,p.action,now)),
    bid: entry({ code }, (g,p,now) => g.bid(p.code,now)),
    absorb: entry({ index: integer(0,H.F.COINS.length-1) }, (g,p) => g.absorb(p.index)),
    sellYao: entry({}, g => g.sellYao()),
    upgrade: entry({ index: integer(0,3), count: v => v === 'max' || integer(1,20)(v) }, (g,p) => g.upgrade(p.index,p.count)),
    upgradeOffline: entry({ type: oneOf(['cap','eff']) }, (g,p) => g.upgradeOffline(p.type)),
    buyMeta: entry({ key: oneOf(Object.keys(H.META_UPGRADES)) }, (g,p) => g.buyMeta(p.key)),
    breakthrough: entry({}, g => g.breakthrough()),
    prestige: entry({}, g => g.prestige()),
    reincarnate: entry({}, g => g.reincarnate()),
    setAuto: entry({ enabled: boolean }, (g,p) => g.setAuto(p.enabled)),
    strike: entry({}, (g,p,now) => g.strike(1,now)),
    skill: entry({ index: integer(0,3) }, (g,p,now) => g.skill(p.index,now)),
    setEnemyKind: entry({ kind: oneOf(Object.keys(H.F.MONSTER_MULT)) }, (g,p) => g.setEnemyKind(p.kind)),
    travel: entry({ zone: integer(0,H.ZONES.length-1) }, (g,p) => g.travel(p.zone)),
    claimQuest: entry({ id: string }, (g,p) => g.claimQuest(p.id)),
    claimFragments: entry({}, g => g.claimFragments()),
    manualEncounter: entry({ index: integer(0,2) }, (g,p,now) => g.manualEncounter(p.index,now)),
    joinSect: entry({ id: string }, (g,p) => g.joinSect(p.id)),
    leaveSect: entry({}, g => g.leaveSect()),
    donateSect: entry({}, g => g.donateSect()),
    setBlessing: entry({ enabled: boolean }, (g,p) => g.setBlessing(p.enabled)),
    setSectRepeat: entry({ enabled: boolean }, (g,p) => g.setSectRepeat(p.enabled)),
    startSectMission: entry({ id: string }, (g,p,now) => g.startSectMission(p.id,now)),
    claimSectMission: entry({}, (g,p,now) => g.claimSectMission(now)),
    abortSectMission: entry({}, g => g.abortSectMission()),
    buySect: entry({ id: string, element: optional(integer(0,4)) }, (g,p) => g.buySect(p.id,p.element)),
    startDungeon: entry({ id: string }, (g,p,now) => g.startDungeon(p.id,now)),
    abortDungeon: entry({}, g => g.abortDungeon()),
    temperRoot: entry({ index: integer(0,4) }, (g,p) => g.temperRoot(p.index)),
    meetFriend: entry({ id: string }, (g,p,now) => g.meetFriend(p.id,now)),
    giftFriend: entry({ id: string }, (g,p,now) => g.giftFriend(p.id,now)),
    discuss: entry({ id: string }, (g,p,now) => g.discuss(p.id,now)),
    duel: entry({ id: string }, (g,p,now) => g.duel(p.id,now))
  });
  function invalid() { const e = Error('Lệnh game không hợp lệ.'); e.code = 'INVALID_COMMAND'; throw e; }
  function validate(command) {
    if (!object(command) || Object.keys(command).some(k => !['type','payload'].includes(k)) ||
      typeof command.type !== 'string' || !Object.hasOwn(commands, command.type)) invalid();
    const def = commands[command.type], p = command.payload ?? {};
    if (!object(p) || Object.keys(p).some(k => !Object.hasOwn(def.fields,k))) invalid();
    for (const [key,check] of Object.entries(def.fields)) if (!check(p[key])) invalid();
    return { type: command.type, payload: { ...p } };
  }
  function execute(game, command, now) {
    const c = validate(command);
    if (!Number.isFinite(now) || now < 0) invalid();
    if (!game.s.created) throw Error('Chưa tạo nhân vật.');
    if (game.isDead() && c.type !== 'reincarnate') throw Error('Thọ nguyên đã cạn. Hãy chuyển thế.');
    return commands[c.type].run(game,c.payload,now);
  }
  const API = { VERSION, types: Object.freeze(Object.keys(commands)), validate, execute };
  root.HU_COMMANDS = API;
  if (node) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

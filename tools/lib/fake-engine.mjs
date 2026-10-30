/* Engine giả tối thiểu để test backend độc lập với luật chơi thật. Có tiền, thời gian trôi và lỗi luật tiếng Việt. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { AppError } = require('../../server/http/errors.js');

export function makeFakeEngine({ ready = true } = {}) {
  class Game {
    constructor(state, rng, onLog) { this.s = state; this.rng = rng; this.onLog = onLog; this.pending = []; }
    advance(now) { const dt = Math.max(0, now - this.s.lastUpdate); this.s.qi += Math.floor(dt / 1000); this.s.lastUpdate = now; }
    isDead() { return this.s.hp <= 0; }
    checkMeta() { return this.s.qi >= 1000 && !this.s.meta.big ? ((this.s.meta.big = true), ['big']) : []; }
    earn({ amount }) { this.s.stone += amount; this.onLog?.('nhận ' + amount); return { stone: this.s.stone }; }
    buy() { if (this.s.stone < 10) throw Error('Không đủ linh thạch.'); this.s.stone -= 10; return { stone: this.s.stone }; }
    crash() { return null.boom; }
    bug() { throw Object.assign(Error('hỏng nội bộ'), { code: 'EBROKEN' }); }
  }
  const SCHEMAS = { earn: v => Number.isSafeInteger(v.amount) && v.amount > 0 && v.amount <= 100, buy: () => true, crash: () => true, bug: () => true };
  const protocol = {
    types: Object.keys(SCHEMAS),
    validate(command) {
      const ok = command && Object.hasOwn(SCHEMAS, command.type) && SCHEMAS[command.type](command.payload ?? {});
      if (!ok) throw Object.assign(Error('Lệnh game không hợp lệ.'), { code: 'INVALID_COMMAND' });
      return { type: command.type, payload: { ...(command.payload ?? {}) } };
    },
    execute(game, command) { return game[command.type](command.payload); }
  };
  const engine = {
    READY: ready, MISSING: ready ? [] : ['a', 'b'], Game,
    createCharacter(profile, now) {
      if (!profile.name) throw Error('Cần đạo hiệu.');
      return { created: true, name: profile.name, stone: 0, qi: 0, hp: 10, lastUpdate: now, meta: {}, logs: [], seed: 123456 };
    }
  };
  return { engine, protocol, AppError };
}

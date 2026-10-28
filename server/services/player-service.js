'use strict';
const { randomInt } = require('node:crypto');
const H = require('../../shared/game.js');
const C = require('../../shared/protocol/commands.js');

const fail = (code, message) => { const e = Error(message); e.code = code; throw e; };
const object = v => v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const exact = (v, keys) => object(v) && Object.keys(v).every(k => keys.includes(k));
const token = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v);
const snapshot = state => {
  const copy = structuredClone(state);
  if (copy.dungeon.active) delete copy.dungeon.active.seed;
  return copy;
};

class PlayerService {
  constructor({ repository, clock = Date.now, rng = () => randomInt(0, 4294967296) / 4294967296 } = {}) {
    if (!repository || typeof repository.transact !== 'function') throw Error('Thiếu player repository.');
    this.repository = repository; this.clock = clock; this.rng = rng;
  }

  // principal là kết quả xác thực do server truyền vào, KHÔNG lấy từ JSON của client.
  playerId(principal) {
    if (!principal || !token(principal.playerId)) fail('UNAUTHENTICATED', 'Chưa có phiên người chơi.');
    return principal.playerId;
  }

  now(last = 0) {
    const value = this.clock();
    if (!Number.isFinite(value) || value <= 0) throw Error('Đồng hồ máy chủ không hợp lệ.');
    return Math.max(last, value);
  }

  createPlayer(principal, profile) {
    const id = this.playerId(principal);
    if (!exact(profile, ['name','gender','talent']) || !H.cleanName(profile.name) || !['nam','nu'].includes(profile.gender) ||
      profile.talent !== undefined && !exact(profile.talent, H.TALENT_INFO.map(t => t.key))) fail('INVALID_PROFILE', 'Hồ sơ khởi tạo không hợp lệ.');
    // Chụp dữ liệu trước khi xếp hàng để bên gọi không thể thay nội dung đang chờ.
    const input = structuredClone(profile);
    return this.repository.transact(id, current => {
      if (current) fail('PLAYER_EXISTS', 'Người chơi đã có nhân vật.');
      const now = this.now();
      const state = H.createCharacter({ ...input, age: 14 + Math.floor(this.rng() * 17), race: H.rollRace(this.rng), ...H.rollRoots(this.rng) }, now, this.rng);
      const record = { revision: 0, state, receipts: [] };
      return { record, value: { protocolVersion: C.VERSION, revision: 0, serverTime: now, state: snapshot(state) } };
    });
  }

  execute(principal, request) {
    const id = this.playerId(principal);
    if (!exact(request, ['protocolVersion','requestId','expectedRevision','type','payload']) ||
      request.protocolVersion !== C.VERSION || !token(request.requestId) || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) fail('INVALID_REQUEST', 'Gói lệnh không hợp lệ.');
    const command = C.validate({ type: request.type, payload: request.payload });
    const requestId = request.requestId, expectedRevision = request.expectedRevision;
    const fingerprint = JSON.stringify([command.type, Object.entries(command.payload).sort(([a],[b]) => a.localeCompare(b))]);
    return this.repository.transact(id, current => {
      if (!current) fail('PLAYER_NOT_FOUND', 'Chưa có nhân vật.');
      const receipt = current.receipts.find(r => r.id === requestId);
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) fail('REQUEST_ID_REUSED', 'Mã lệnh đã dùng cho hành động khác.');
        return { record: current, value: { ...receipt.response, revision: current.revision, state: snapshot(current.state), replayed: true } };
      }
      if (current.revision !== expectedRevision) fail('REVISION_CONFLICT', 'Tiến trình đã thay đổi. Hãy đồng bộ lại.');
      const now = this.now(current.state.lastUpdate), logs = [];
      const game = new H.Game(current.state, this.rng, message => logs.push(message));
      const report = game.advance(now, now - game.s.lastUpdate > 15000);
      const result = C.execute(game, command, now) ?? null;
      const achievements = game.checkMeta(now).map(({ id, name, points }) => ({ id, name, points }));
      const revision = current.revision + 1;
      const response = { protocolVersion: C.VERSION, revision, serverTime: now, result, report, logs, achievements, died: game.isDead(), replayed: false };
      const record = { revision, state: game.s, receipts: [...current.receipts, { id: requestId, fingerprint, response }].slice(-32) };
      return { record, value: { ...response, state: snapshot(game.s) } };
    });
  }

  sync(principal) {
    const id = this.playerId(principal);
    return this.repository.transact(id, current => {
      if (!current) fail('PLAYER_NOT_FOUND', 'Chưa có nhân vật.');
      const now = this.now(current.state.lastUpdate), logs = [];
      const game = new H.Game(current.state, this.rng, message => logs.push(message));
      const report = game.advance(now, now - game.s.lastUpdate > 15000);
      const achievements = game.checkMeta(now).map(({ id, name, points }) => ({ id, name, points }));
      const revision = current.revision + 1, record = { ...current, state: game.s, revision };
      return { record, value: { protocolVersion: C.VERSION, revision, serverTime: now, state: snapshot(game.s), report, logs, achievements, died: game.isDead() } };
    });
  }
}

module.exports = { PlayerService };

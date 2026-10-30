/* Kho người chơi trong bộ nhớ: dùng cho dev và test. Mất dữ liệu khi tiến trình dừng; chỉ khóa trong một tiến trình. */
'use strict';
const { PlayerRepository } = require('./player-repository.js');
const { AppError } = require('../http/errors.js');

class MemoryPlayerRepository extends PlayerRepository {
  constructor({ now = Date.now, clone = structuredClone } = {}) {
    super();
    Object.assign(this, { now, clone });
    this.records = new Map();
    this.tails = new Map(); // playerId → promise cuối hàng đợi
    this.outbox = [];
    this.sequence = 0;
  }

  async create(playerId, record) {
    if (this.records.has(playerId)) throw new AppError(409, 'PLAYER_EXISTS', 'Người chơi đã tồn tại.');
    const t = this.now();
    this.records.set(playerId, this.clone({ revision: 0, receipts: {}, createdAt: t, updatedAt: t, ...record }));
  }

  async get(playerId) {
    const record = this.records.get(playerId);
    return record ? this.clone(record) : null;
  }

  async transact(playerId, fn) {
    const previous = this.tails.get(playerId) || Promise.resolve();
    let release;
    const tail = previous.then(() => new Promise(resolve => { release = resolve; }));
    this.tails.set(playerId, tail);
    await previous;
    try {
      const current = this.records.get(playerId);
      if (!current) throw new AppError(404, 'PLAYER_NOT_FOUND', 'Chưa có nhân vật.');
      const draft = this.clone(current);
      draft.events = [];
      const result = await fn(draft);
      const { events, ...next } = draft;
      next.updatedAt = this.now();
      // Commit: state và outbox cùng thành công (một bước đồng bộ, không có điểm dừng ở giữa).
      this.records.set(playerId, next);
      for (const event of events) {
        this.outbox.push({ id: String(++this.sequence), playerId, type: event.type, payload: event.payload ?? null, createdAt: next.updatedAt });
      }
      return result;
    } finally {
      release();
      if (this.tails.get(playerId) === tail) this.tails.delete(playerId);
    }
  }

  async drainOutbox(limit = 50) {
    return this.outbox.slice(0, limit).map(e => this.clone(e));
  }

  async ackOutbox(ids) {
    const done = new Set(ids);
    this.outbox = this.outbox.filter(e => !done.has(e.id));
  }
}

module.exports = { MemoryPlayerRepository };

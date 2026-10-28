'use strict';

/* Adapter thử nghiệm: giao dịch theo playerId trong MỘT tiến trình Node.
 * Adapter database sau này phải có cùng tính nguyên tử giữa các máy chủ. */
class MemoryPlayers {
  #records = new Map();
  #queues = new Map();

  async read(playerId) {
    await this.#queues.get(playerId);
    return structuredClone(this.#records.get(playerId) || null);
  }

  transact(playerId, update) {
    const previous = this.#queues.get(playerId) || Promise.resolve();
    const work = previous.then(async () => {
      const current = structuredClone(this.#records.get(playerId) || null);
      const { record, value } = await update(current);
      // Clone cả hai trước khi commit: callback/bên gọi không giữ tham chiếu vào kho.
      const saved = structuredClone(record), response = structuredClone(value);
      this.#records.set(playerId, saved);
      return response;
    });
    const tail = work.then(() => undefined, () => undefined);
    this.#queues.set(playerId, tail);
    tail.then(() => { if (this.#queues.get(playerId) === tail) this.#queues.delete(playerId); });
    return work;
  }
}

module.exports = { MemoryPlayers };
